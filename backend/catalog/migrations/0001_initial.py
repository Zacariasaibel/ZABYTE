import django.core.validators
import django.db.models.deletion
from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="Category",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=80, unique=True, verbose_name="Name")),
                ("slug", models.SlugField(max_length=80, unique=True, verbose_name="URL-Name")),
            ],
            options={"ordering": ["name"], "verbose_name": "Kategorie", "verbose_name_plural": "Kategorien"},
        ),
        migrations.CreateModel(
            name="Product",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120, verbose_name="Name")),
                ("slug", models.SlugField(max_length=140, unique=True, verbose_name="URL-Name")),
                ("description", models.TextField(max_length=3000, verbose_name="Beschreibung")),
                ("price", models.DecimalField(max_digits=8, decimal_places=2, validators=[django.core.validators.MinValueValidator(Decimal("0.01"))], verbose_name="Preis in EUR")),
                ("image", models.CharField(max_length=160, validators=[django.core.validators.RegexValidator("\\A/assets/products/[a-z0-9-]+\\.svg\\Z", "Bitte einen lokalen SVG-Pfad unter /assets/products/ angeben.")], help_text="Zum Beispiel /assets/products/keyboard.svg", verbose_name="Lokale Illustration")),
                ("stock", models.PositiveIntegerField(default=0, verbose_name="Bestand")),
                ("is_active", models.BooleanField(default=True, verbose_name="Aktiv")),
                ("category", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="products", to="catalog.category", verbose_name="Kategorie")),
            ],
            options={"ordering": ["name", "id"], "verbose_name": "Produkt", "verbose_name_plural": "Produkte", "constraints": [
                models.CheckConstraint(condition=models.Q(price__gte=Decimal("0.01")), name="product_positive_price"),
                models.CheckConstraint(condition=models.Q(stock__gte=0), name="product_nonnegative_stock"),
            ]},
        ),
    ]
