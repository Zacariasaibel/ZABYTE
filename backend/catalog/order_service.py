from decimal import Decimal
import hashlib
import json

from django.db import IntegrityError, OperationalError, transaction
from rest_framework.exceptions import APIException

from .models import Product, SimulatedOrder, SimulatedOrderLine


class OrderConflict(APIException):
    status_code = 409

    def __init__(self, code, detail):
        super().__init__({"code": code, "detail": detail})


class OrderBusy(APIException):
    status_code = 503
    default_detail = "Die Bestätigung ist gerade nicht verfügbar. Bitte denselben Versuch erneut senden."


def request_digest(items):
    canonical = json.dumps(items, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


def replay(order, digest):
    if order.request_digest != digest:
        raise OrderConflict("idempotency_conflict", "Diese Anfragekennung gehört zu einer anderen Auswahl.")
    return order, False


def create_simulated_order(key, items):
    digest = request_digest(items)
    try:
        existing = SimulatedOrder.objects.filter(idempotency_key=key).first()
        if existing:
            return replay(existing, digest)
        with transaction.atomic():
            # Claim the unique key first. On SQLite this also serializes competing writers.
            order = SimulatedOrder.objects.create(idempotency_key=key, request_digest=digest)
            ids = [item["product_id"] for item in items]
            products = {p.id: p for p in Product.objects.select_for_update().filter(id__in=ids, is_active=True)}
            total = Decimal("0.00")
            for item in items:
                product = products.get(item["product_id"])
                if product is None:
                    raise OrderConflict("stock_conflict", "Ein Produkt ist nicht mehr verfügbar. Bitte den Warenkorb prüfen.")
                if item["quantity"] > product.stock:
                    raise OrderConflict("stock_conflict", f"Für {product.name} ist die gewünschte Menge nicht verfügbar.")
                line_total = product.price * item["quantity"]
                SimulatedOrderLine.objects.create(
                    order=order, product=product, product_name=product.name,
                    product_slug=product.slug, quantity=item["quantity"],
                    unit_price=product.price, line_total=line_total,
                )
                total += line_total
            order.total = total
            order.save(update_fields=["total"])
            return order, True
    except IntegrityError:
        # The winning request committed its whole order, including all lines.
        existing = SimulatedOrder.objects.filter(idempotency_key=key).first()
        if existing:
            return replay(existing, digest)
        raise
    except OperationalError as error:
        if "locked" in str(error).lower():
            raise OrderBusy() from error
        raise
