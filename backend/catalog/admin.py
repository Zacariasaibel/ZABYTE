from django.contrib import admin
from .models import Category, Product, SimulatedOrder, SimulatedOrderLine


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ["name"]}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "price", "stock", "is_active"]
    list_filter = ["category", "is_active"]
    search_fields = ["name", "description"]
    prepopulated_fields = {"slug": ["name"]}
    list_select_related = ["category"]


class SimulatedOrderLineInline(admin.TabularInline):
    model = SimulatedOrderLine
    extra = 0
    fields = ["product", "product_name", "product_slug", "quantity", "unit_price", "line_total"]
    readonly_fields = fields
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(SimulatedOrder)
class SimulatedOrderAdmin(admin.ModelAdmin):
    list_display = ["id", "created_at", "total", "is_simulated"]
    readonly_fields = ["id", "idempotency_key", "request_digest", "created_at", "total", "is_simulated"]
    inlines = [SimulatedOrderLineInline]
    ordering = ["-created_at"]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
