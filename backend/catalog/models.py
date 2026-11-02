from decimal import Decimal
import uuid

from django.core.validators import MinValueValidator, RegexValidator
from django.db import models


class ValidatedModel(models.Model):
    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class Category(ValidatedModel):
    name = models.CharField("Name", max_length=80, unique=True)
    slug = models.SlugField("URL-Name", max_length=80, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Kategorie"
        verbose_name_plural = "Kategorien"

    def __str__(self):
        return self.name


class Product(ValidatedModel):
    name = models.CharField("Name", max_length=120)
    slug = models.SlugField("URL-Name", max_length=140, unique=True)
    description = models.TextField("Beschreibung", max_length=3000)
    price = models.DecimalField("Preis in EUR", max_digits=8, decimal_places=2,
                                validators=[MinValueValidator(Decimal("0.01"))])
    category = models.ForeignKey(Category, on_delete=models.PROTECT,
                                 related_name="products", verbose_name="Kategorie")
    image = models.CharField("Lokale Illustration", max_length=160, validators=[
        RegexValidator(r"\A/assets/products/[a-z0-9-]+\.svg\Z",
                       "Bitte einen lokalen SVG-Pfad unter /assets/products/ angeben.")
    ], help_text="Zum Beispiel /assets/products/keyboard.svg")
    stock = models.PositiveIntegerField("Bestand", default=0)
    is_active = models.BooleanField("Aktiv", default=True)

    class Meta:
        ordering = ["name", "id"]
        verbose_name = "Produkt"
        verbose_name_plural = "Produkte"
        constraints = [
            models.CheckConstraint(condition=models.Q(price__gte=Decimal("0.01")), name="product_positive_price"),
            models.CheckConstraint(condition=models.Q(stock__gte=0), name="product_nonnegative_stock"),
        ]

    def __str__(self):
        return self.name


class SimulatedOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idempotency_key = models.UUIDField(unique=True, editable=False)
    request_digest = models.CharField(max_length=64, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    is_simulated = models.BooleanField(default=True, editable=False)
    total = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Simulierte Bestellung"
        verbose_name_plural = "Simulierte Bestellungen"
        constraints = [
            models.CheckConstraint(condition=models.Q(is_simulated=True), name="order_simulated_only"),
            models.CheckConstraint(condition=models.Q(total__gte=0), name="order_nonnegative_total"),
        ]

    def __str__(self):
        return str(self.id)


class SimulatedOrderLine(models.Model):
    order = models.ForeignKey(SimulatedOrder, related_name="lines", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    product_name = models.CharField(max_length=120)
    product_slug = models.SlugField(max_length=140)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    line_total = models.DecimalField(max_digits=18, decimal_places=2)

    class Meta:
        ordering = ["id"]
        verbose_name = "Bestellposition"
        verbose_name_plural = "Bestellpositionen"
        constraints = [
            models.UniqueConstraint(fields=["order", "product"], name="unique_order_product"),
            models.CheckConstraint(condition=models.Q(quantity__gte=1, quantity__lte=10000), name="order_line_quantity_range"),
            models.CheckConstraint(condition=models.Q(unit_price__gt=0), name="order_line_positive_price"),
            models.CheckConstraint(condition=models.Q(line_total__gt=0), name="order_line_positive_total"),
        ]
