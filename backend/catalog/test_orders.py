from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from io import StringIO
from threading import Barrier
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import close_old_connections, connection
from django.test import TestCase, TransactionTestCase
from rest_framework.test import APIClient

from .models import Product, SimulatedOrder, SimulatedOrderLine
from .order_service import OrderBusy, create_simulated_order


class SimulatedOrderTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo", stdout=StringIO())

    def setUp(self):
        self.client = APIClient()
        self.product = Product.objects.get(slug="polar-mouse")
        self.other = Product.objects.get(slug="strom-usb-c")

    def payload(self, **changes):
        return {"idempotency_key": str(uuid4()), "items": [{"product_id": self.product.id, "quantity": 2}], **changes}

    def test_prices_and_totals_come_from_database_and_stock_does_not_change(self):
        before = list(Product.objects.order_by("id").values())
        response = self.client.post("/api/simulated-orders/", self.payload())
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["is_simulated"])
        self.assertEqual(response.data["currency"], "EUR")
        self.assertEqual(response.data["total"], "59.80")
        self.assertEqual(response.data["lines"][0]["unit_price"], "29.90")
        self.assertEqual(response.data["lines"][0]["line_total"], "59.80")
        self.assertEqual(list(Product.objects.order_by("id").values()), before)
        self.assertEqual(SimulatedOrder.objects.count(), 1)
        self.assertEqual(SimulatedOrderLine.objects.count(), 1)

    def test_exact_decimal_calculation(self):
        self.product.price = Decimal("0.10")
        self.product.save()
        payload = self.payload(items=[{"product_id": self.product.id, "quantity": 3}, {"product_id": self.other.id, "quantity": 1}])
        response = self.client.post("/api/simulated-orders/", payload)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["total"], "13.20")

    def test_manipulated_prices_are_rejected(self):
        for change in [{"price": "0.01"}, {"total": "0.01"}, {"is_simulated": False}, {"email": "unnecessary@example.org"}]:
            with self.subTest(change=change):
                self.assertEqual(self.client.post("/api/simulated-orders/", self.payload(**change)).status_code, 400)
        items = [{"product_id": self.product.id, "quantity": 1, "price": "0.01"}]
        self.assertEqual(self.client.post("/api/simulated-orders/", self.payload(items=items)).status_code, 400)
        self.assertEqual(SimulatedOrder.objects.count(), 0)

    def test_invalid_quantities_and_ids(self):
        for value in [0, -1, 1.0, 1.5, "1", True, None, 10001]:
            with self.subTest(value=value):
                payload = self.payload(items=[{"product_id": self.product.id, "quantity": value}])
                self.assertEqual(self.client.post("/api/simulated-orders/", payload).status_code, 400)
        for value in [True, "1", -1, 1.0]:
            with self.subTest(id=value):
                payload = self.payload(items=[{"product_id": value, "quantity": 1}])
                self.assertEqual(self.client.post("/api/simulated-orders/", payload).status_code, 400)
        self.assertEqual(SimulatedOrder.objects.count(), 0)

    def test_empty_duplicate_and_excessive_lines(self):
        item = {"product_id": self.product.id, "quantity": 1}
        for items in [[], [item, item], [item] * 101]:
            self.assertEqual(self.client.post("/api/simulated-orders/", self.payload(items=items)).status_code, 400)
        self.assertEqual(SimulatedOrder.objects.count(), 0)

    def test_missing_key_and_malformed_key(self):
        payload = self.payload()
        payload.pop("idempotency_key")
        self.assertEqual(self.client.post("/api/simulated-orders/", payload).status_code, 400)
        self.assertEqual(self.client.post("/api/simulated-orders/", self.payload(idempotency_key="bad-key")).status_code, 400)

    def test_missing_inactive_sold_out_and_excess_stock(self):
        sold_out = Product.objects.get(slug="klang-headset")
        cases = [
            [{"product_id": 9999999, "quantity": 1}],
            [{"product_id": sold_out.id, "quantity": 1}],
            [{"product_id": self.product.id, "quantity": self.product.stock + 1}],
        ]
        self.other.is_active = False
        self.other.save()
        cases.append([{"product_id": self.other.id, "quantity": 1}])
        for items in cases:
            with self.subTest(items=items):
                response = self.client.post("/api/simulated-orders/", self.payload(items=items))
                self.assertEqual(response.status_code, 409)
                self.assertEqual(str(response.data["code"]), "stock_conflict")
        self.assertEqual(SimulatedOrder.objects.count(), 0)
        self.assertEqual(SimulatedOrderLine.objects.count(), 0)

    def test_retry_returns_same_snapshot_even_if_catalog_changes(self):
        payload = self.payload()
        first = self.client.post("/api/simulated-orders/", payload)
        self.product.price = Decimal("99.99")
        self.product.stock = 0
        self.product.is_active = False
        self.product.name = "Changed name"
        self.product.save()
        second = self.client.post("/api/simulated-orders/", payload)
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.data, second.data)
        self.assertEqual(SimulatedOrder.objects.count(), 1)

    def test_key_conflict_and_reordered_equivalent_items(self):
        payload = self.payload(items=[{"product_id": self.product.id, "quantity": 1}, {"product_id": self.other.id, "quantity": 1}])
        first = self.client.post("/api/simulated-orders/", payload)
        payload["items"].reverse()
        self.assertEqual(first.data, self.client.post("/api/simulated-orders/", payload).data)
        payload["items"][0]["quantity"] = 2
        response = self.client.post("/api/simulated-orders/", payload)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(str(response.data["code"]), "idempotency_conflict")
        self.assertEqual(SimulatedOrder.objects.count(), 1)

    def test_partial_failure_rolls_back_order_and_lines(self):
        items = [{"product_id": self.product.id, "quantity": 1}, {"product_id": 9999999, "quantity": 1}]
        self.assertEqual(self.client.post("/api/simulated-orders/", self.payload(items=items)).status_code, 409)
        self.assertEqual(SimulatedOrder.objects.count(), 0)
        with patch("catalog.order_service.SimulatedOrderLine.objects.create", side_effect=RuntimeError("injected failure")):
            with self.assertRaises(RuntimeError):
                self.client.post("/api/simulated-orders/", self.payload())
        self.assertEqual(SimulatedOrder.objects.count(), 0)
        self.assertEqual(SimulatedOrderLine.objects.count(), 0)

    def test_csrf_protection_also_applies_to_anonymous_orders(self):
        client = APIClient(enforce_csrf_checks=True)
        self.assertEqual(client.post("/api/simulated-orders/", self.payload()).status_code, 403)
        token = client.get("/api/csrf/")
        self.assertEqual(token.status_code, 200)
        self.assertIn("no-cache", token["Cache-Control"])
        response = client.post("/api/simulated-orders/", self.payload(), HTTP_X_CSRFTOKEN=token.json()["csrfToken"])
        self.assertEqual(response.status_code, 201)

    def test_public_orders_cannot_be_listed_modified_or_deleted(self):
        self.assertEqual(self.client.get("/api/simulated-orders/").status_code, 405)
        self.assertEqual(self.client.delete("/api/simulated-orders/").status_code, 405)
        order = self.client.post("/api/simulated-orders/", self.payload()).data
        self.assertEqual(self.client.get(f"/api/simulated-orders/{order['id']}/").status_code, 404)

    def test_admin_is_protected_and_can_review_simulated_order(self):
        self.client.post("/api/simulated-orders/", self.payload())
        self.assertEqual(self.client.get("/admin/catalog/simulatedorder/").status_code, 302)
        user = get_user_model().objects.create_superuser(username="orders-admin", email="")
        self.client.force_login(user)
        self.assertEqual(self.client.get("/admin/catalog/simulatedorder/").status_code, 200)
        order = SimulatedOrder.objects.get()
        response = self.client.get(f"/admin/catalog/simulatedorder/{order.id}/change/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.product.name)
        self.assertContains(response, "59,80")


class ConcurrentOrderTests(TransactionTestCase):
    def test_simultaneous_requests_do_not_duplicate_orders(self):
        call_command("seed_demo", stdout=StringIO())
        product = Product.objects.get(slug="polar-mouse")
        key = uuid4()
        items = [{"product_id": product.id, "quantity": 1}]
        barrier = Barrier(2)

        def send():
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                try:
                    order, _ = create_simulated_order(key, items)
                    return str(order.id)
                except OrderBusy:
                    return "busy"
            finally:
                connection.close()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: send(), range(2)))
        order, _ = create_simulated_order(key, items)
        self.assertTrue(all(result in ["busy", str(order.id)] for result in results))
        self.assertEqual(SimulatedOrder.objects.count(), 1)
        self.assertEqual(SimulatedOrderLine.objects.count(), 1)
        product.refresh_from_db()
        self.assertEqual(product.stock, 26)
