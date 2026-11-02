from decimal import Decimal
from io import StringIO
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Category, Product
from .demo_presentation import DEMO_PRESENTATION


class CatalogTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo", stdout=StringIO())
        cls.category = Category.objects.get(slug="eingabe")
        cls.product = Product.objects.get(slug="fjord-keys")

    def setUp(self):
        self.client = APIClient()

    def test_list_serializes_decimal_category_and_stock(self):
        response = self.client.get("/api/products/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 10)
        product = next(item for item in response.data if item["slug"] == "fjord-keys")
        self.assertEqual(product["price"], "69.90")
        self.assertEqual(product["category"]["slug"], "eingabe")
        self.assertEqual(product["stock"], 18)
        self.assertNotIn("is_active", product)

    def test_search_and_category_combine(self):
        for query, expected in [
            ({"search": "tAsTaTuR"}, 2),
            ({"category": "eingabe"}, 3),
            ({"search": "Tastatur", "category": "eingabe"}, 2),
            ({"search": "Tastatur", "category": "audio"}, 0),
            ({"search": "no-such-product"}, 0),
            ({"category": "unknown"}, 0),
        ]:
            with self.subTest(query=query):
                response = self.client.get("/api/products/", query)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(len(response.data), expected)

    def test_query_validation(self):
        for query in [{"search": "x" * 121}, {"category": "invalid/path"}, {"category": "x" * 81},
                      {"sort": "random"}, {"available": "true"}, {"sort": "-stock"}]:
            with self.subTest(query=query):
                self.assertEqual(self.client.get("/api/products/", query).status_code, 400)

    def test_sorting_is_numeric_stable_and_read_only(self):
        before = list(Product.objects.order_by("id").values())
        for sort, reverse in [("price_asc", False), ("price_desc", True)]:
            with self.subTest(sort=sort):
                items = self.client.get("/api/products/", {"sort": sort}).data
                prices = [Decimal(item["price"]) for item in items]
                self.assertEqual(prices, sorted(prices, reverse=reverse))
        items = self.client.get("/api/products/", {"sort": "name"}).data
        self.assertEqual([item["name"].lower() for item in items], sorted(item["name"].lower() for item in items))
        self.assertEqual(before, list(Product.objects.order_by("id").values()))
        second = Product.objects.get(slug="fjord-keys-mini")
        second.price = self.product.price
        second.save()
        for sort in ["price_asc", "price_desc"]:
            items = self.client.get("/api/products/", {"search": "Tastatur", "sort": sort}).data
            self.assertEqual([item["id"] for item in items], sorted([self.product.id, second.id]))

    def test_all_filters_combine_and_exclude_inactive_and_sold_out(self):
        self.product.stock = 0
        self.product.save()
        second = Product.objects.get(slug="fjord-keys-mini")
        query = {"search": "Tastatur", "category": "eingabe", "sort": "price_desc", "available": "1"}
        self.assertEqual([item["id"] for item in self.client.get("/api/products/", query).data], [second.id])
        query["available"] = "0"
        self.assertEqual(len(self.client.get("/api/products/", query).data), 2)
        query["available"] = "1"
        second.is_active = False
        second.save()
        self.assertEqual(self.client.get("/api/products/", query).data, [])
        query.pop("search")
        query.pop("category")
        self.assertTrue(all(item["stock"] > 0 for item in self.client.get("/api/products/", query).data))

    def test_detail_missing_and_inactive_products(self):
        self.assertEqual(self.client.get("/api/products/fjord-keys/").status_code, 200)
        self.assertEqual(self.client.get("/api/products/missing/").status_code, 404)
        self.product.is_active = False
        self.product.save()
        self.assertEqual(self.client.get("/api/products/fjord-keys/").status_code, 404)
        response = self.client.get("/api/products/", {"search": "Tastatur"})
        self.assertEqual(len(response.data), 1)

    def test_out_of_stock_products_remain_visible(self):
        response = self.client.get("/api/products/klang-headset/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["stock"], 0)

    def test_categories_are_public(self):
        response = self.client.get("/api/categories/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 4)

    def test_api_rejects_writes_even_for_staff(self):
        for authenticated in [False, True]:
            if authenticated:
                user = get_user_model().objects.create_user(username="test-staff", is_staff=True)
                self.client.force_authenticate(user=user)
            for url in ["/api/products/", "/api/products/fjord-keys/", "/api/categories/"]:
                for method in ["post", "put", "patch", "delete"]:
                    with self.subTest(authenticated=authenticated, url=url, method=method):
                        self.assertEqual(getattr(self.client, method)(url, {}).status_code, 405)

    def test_admin_requires_staff_login(self):
        response = self.client.get("/admin/catalog/product/")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin/login/", response.url)
        user = get_user_model().objects.create_user(username="viewer")
        self.client.force_login(user)
        self.assertEqual(self.client.get("/admin/catalog/product/").status_code, 302)

    def test_superuser_can_open_admin(self):
        user = get_user_model().objects.create_superuser(username="admin-test", email="")
        self.client.force_login(user)
        self.assertEqual(self.client.get("/admin/catalog/product/").status_code, 200)

    def test_admin_login_enforces_csrf(self):
        client = APIClient(enforce_csrf_checks=True)
        self.assertEqual(client.post("/admin/login/", {"username": "example"}).status_code, 403)

    def test_product_validation(self):
        for field, value in [
            ("price", Decimal("-1.00")), ("price", Decimal("0.00")),
            ("price", Decimal("1.001")), ("stock", -1),
            ("name", ""), ("description", ""),
            ("image", "https://example.org/image.svg"),
            ("image", "/assets/products/../secret.svg"),
        ]:
            with self.subTest(field=field, value=value):
                product = Product.objects.get(pk=self.product.pk)
                setattr(product, field, value)
                with self.assertRaises(ValidationError):
                    product.save()

    def test_database_constraints(self):
        for values in [{"price": Decimal("-1.00")}, {"stock": -1}]:
            with self.subTest(values=values), self.assertRaises(IntegrityError), transaction.atomic():
                Product.objects.filter(pk=self.product.pk).update(**values)

    def test_category_cannot_delete_products(self):
        with self.assertRaises(ProtectedError):
            self.category.delete()

    def test_seed_is_repeatable_and_preserves_other_products(self):
        Product.objects.create(name="Custom", slug="custom", description="Custom demo product",
                               price=Decimal("1.00"), category=self.category,
                               image="/assets/products/mouse.svg", stock=1)
        self.product.stock = 3
        self.product.save()
        for _ in range(2):
            call_command("seed_demo", stdout=StringIO())
        self.assertEqual(Product.objects.count(), 11)
        self.assertEqual(Category.objects.count(), 4)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 18)

    def test_seed_images_exist_and_are_small(self):
        public = Path(__file__).resolve().parents[2] / "frontend" / "public"
        for product in Product.objects.all():
            image = public / product.image.lstrip("/")
            self.assertTrue(image.is_file(), image)
            self.assertLess(image.stat().st_size, 15000)

    def test_presentation_sync_preserves_existing_catalog_state(self):
        self.product.name = "Old name"
        self.product.description = "Old description"
        self.product.price = Decimal("91.25")
        self.product.stock = 2
        self.product.is_active = False
        self.product.save()
        Product.objects.create(name="Custom", slug="custom", description="Keep this product",
                               price=Decimal("2.50"), category=self.category,
                               image="/assets/products/mouse.svg", stock=3)
        preserved = [field.name for field in Product._meta.fields
                     if field.name not in ["name", "description"]]
        before = list(Product.objects.order_by("id").values(*preserved))
        for _ in range(2):
            call_command("sync_demo_presentation", stdout=StringIO())
        self.assertEqual(before, list(Product.objects.order_by("id").values(*preserved)))
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, DEMO_PRESENTATION[self.product.slug]["name"])
        self.assertEqual(self.product.description, DEMO_PRESENTATION[self.product.slug]["description"])
        self.assertEqual(Product.objects.get(slug="custom").description, "Keep this product")
        self.assertEqual(Product.objects.get(slug="custom").name, "Custom")

    def test_seed_uses_shared_presentation(self):
        for product in Product.objects.all():
            self.assertEqual(product.name, DEMO_PRESENTATION[product.slug]["name"])
            self.assertEqual(product.description, DEMO_PRESENTATION[product.slug]["description"])

    def test_presentation_sync_does_not_recreate_missing_products(self):
        Product.objects.get(slug="fjord-keys-mini").delete()
        call_command("sync_demo_presentation", stdout=StringIO())
        self.assertEqual(Product.objects.count(), 9)
        self.assertFalse(Product.objects.filter(slug="fjord-keys-mini").exists())
