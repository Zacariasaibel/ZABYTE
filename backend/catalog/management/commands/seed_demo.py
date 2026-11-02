from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from catalog.models import Category, Product
from catalog.demo_presentation import DEMO_PRESENTATION


class Command(BaseCommand):
    help = "Create or reset the ten fictional demo products without deleting other data."

    @transaction.atomic
    def handle(self, *args, **options):
        categories = {}
        for slug, name in [("eingabe", "Tastatur & Maus"), ("audio", "Audio"),
                           ("verbindungen", "Kabel & Hubs"), ("arbeitsplatz", "Arbeitsplatz")]:
            categories[slug], _ = Category.objects.update_or_create(slug=slug, defaults={"name": name})
        products = [
            ('fjord-keys', '69.90', 'eingabe', 'keyboard', 18),
            ('fjord-keys-mini', '54.90', 'eingabe', 'keyboard', 7),
            ('polar-mouse', '29.90', 'eingabe', 'mouse', 26),
            ('klang-headset', '59.00', 'audio', 'headphones', 0),
            ('klang-speaker', '39.90', 'audio', 'speaker', 9),
            ('hafen-hub', '34.90', 'verbindungen', 'hub', 14),
            ('strom-usb-c', '12.90', 'verbindungen', 'cable', 40),
            ('weitsicht-stand', '44.90', 'arbeitsplatz', 'stand', 11),
            ('wolke-deskmat', '24.90', 'arbeitsplatz', 'deskmat', 0),
            ('nordlicht-lamp', '49.90', 'arbeitsplatz', 'lamp', 6),
        ]
        for slug, price, category, image, stock in products:
            Product.objects.update_or_create(slug=slug, defaults={
                **DEMO_PRESENTATION[slug], "price": Decimal(price),
                "category": categories[category], "image": f"/assets/products/{image}.svg",
                "stock": stock, "is_active": True,
            })
        self.stdout.write(self.style.SUCCESS("10 Demoprodukte angelegt oder zurückgesetzt."))
