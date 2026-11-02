from django.urls import path
from .views import CategoryList, ProductDetail, ProductList
from .order_views import SimulatedOrderCreate, csrf_token

urlpatterns = [
    path("csrf/", csrf_token, name="csrf-token"),
    path("simulated-orders/", SimulatedOrderCreate.as_view(), name="simulated-order-create"),
    path("categories/", CategoryList.as_view(), name="category-list"),
    path("products/", ProductList.as_view(), name="product-list"),
    path("products/<slug:slug>/", ProductDetail.as_view(), name="product-detail"),
]
