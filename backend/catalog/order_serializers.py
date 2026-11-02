from rest_framework import serializers

from .models import SimulatedOrder, SimulatedOrderLine


class StrictSerializer(serializers.Serializer):
    def to_internal_value(self, data):
        if not isinstance(data, dict):
            raise serializers.ValidationError({"non_field_errors": ["Ein JSON-Objekt ist erforderlich."]})
        unknown = set(data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError({"non_field_errors": ["Unbekannte Felder sind nicht erlaubt."]})
        return super().to_internal_value(data)


class PositiveInteger(serializers.IntegerField):
    def to_internal_value(self, data):
        if type(data) is not int:
            raise serializers.ValidationError("Eine positive ganze Zahl ist erforderlich.")
        return super().to_internal_value(data)


class OrderItemInput(StrictSerializer):
    product_id = PositiveInteger(min_value=1, max_value=9223372036854775807)
    quantity = PositiveInteger(min_value=1, max_value=10000)


class OrderInput(StrictSerializer):
    idempotency_key = serializers.UUIDField()
    items = OrderItemInput(many=True, allow_empty=False, max_length=100)

    def validate_items(self, items):
        ids = [item["product_id"] for item in items]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Jedes Produkt darf nur einmal vorkommen.")
        return sorted(items, key=lambda item: item["product_id"])


class OrderLineOutput(serializers.ModelSerializer):
    class Meta:
        model = SimulatedOrderLine
        fields = ["product_id", "product_name", "product_slug", "quantity", "unit_price", "line_total"]
        read_only_fields = fields


class OrderOutput(serializers.ModelSerializer):
    lines = OrderLineOutput(many=True, read_only=True)
    currency = serializers.SerializerMethodField()

    def get_currency(self, obj):
        return "EUR"

    class Meta:
        model = SimulatedOrder
        fields = ["id", "created_at", "is_simulated", "currency", "total", "lines"]
        read_only_fields = fields
