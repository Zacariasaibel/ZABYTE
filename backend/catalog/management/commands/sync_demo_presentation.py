from django.core.management.base import BaseCommand
from django.db import transaction

from catalog.demo_presentation import DEMO_PRESENTATION
from catalog.models import Product


class Command(BaseCommand):
    help = "Update existing demo names and descriptions without resetting products or stock."

    @transaction.atomic
    def handle(self, *args, **options):
        updated = 0
        for product in Product.objects.filter(slug__in=DEMO_PRESENTATION):
            copy = DEMO_PRESENTATION[product.slug]
            if product.name == copy["name"] and product.description == copy["description"]:
                continue
            product.name = copy["name"]
            product.description = copy["description"]
            product.save(update_fields=["name", "description"])
            updated += 1
        self.stdout.write(self.style.SUCCESS(f"{updated} Produkttexte aktualisiert. Preise und Bestände bleiben erhalten."))
