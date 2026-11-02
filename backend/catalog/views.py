from rest_framework import generics, permissions, serializers
from django.db.models.functions import Lower
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer


class CatalogQuerySerializer(serializers.Serializer):
    search = serializers.CharField(required=False, allow_blank=True, max_length=120)
    category = serializers.SlugField(required=False, allow_blank=True, max_length=80)
    sort = serializers.ChoiceField(choices=["price_asc", "price_desc", "name"], default="name")
    available = serializers.ChoiceField(choices=["0", "1"], default="0")


class PublicReadOnlyMixin:
    permission_classes = [permissions.AllowAny]
    http_method_names = ["get", "head", "options"]


class CategoryList(PublicReadOnlyMixin, generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class ProductList(PublicReadOnlyMixin, generics.ListAPIView):
    serializer_class = ProductSerializer

    def get_queryset(self):
        query = CatalogQuerySerializer(data=self.request.query_params)
        query.is_valid(raise_exception=True)
        products = Product.objects.filter(is_active=True).select_related("category")
        if search := query.validated_data.get("search"):
            products = products.filter(name__icontains=search)
        if category := query.validated_data.get("category"):
            products = products.filter(category__slug=category)
        if query.validated_data["available"] == "1":
            products = products.filter(stock__gt=0)
        ordering = query.validated_data["sort"]
        if ordering == "price_asc":
            return products.order_by("price", "id")
        if ordering == "price_desc":
            return products.order_by("-price", "id")
        return products.order_by(Lower("name"), "id")


class ProductDetail(PublicReadOnlyMixin, generics.RetrieveAPIView):
    queryset = Product.objects.filter(is_active=True).select_related("category")
    serializer_class = ProductSerializer
    lookup_field = "slug"
