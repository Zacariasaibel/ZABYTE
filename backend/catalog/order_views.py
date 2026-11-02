from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET
from rest_framework import permissions, serializers
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .order_serializers import OrderInput, OrderOutput
from .order_service import create_simulated_order


@never_cache
@require_GET
@ensure_csrf_cookie
def csrf_token(request):
    return JsonResponse({"csrfToken": get_token(request)})


@method_decorator(csrf_protect, name="dispatch")
class SimulatedOrderCreate(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    parser_classes = [JSONParser]
    http_method_names = ["post", "options"]

    def post(self, request):
        serializer = OrderInput(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return Response({"code": "invalid_order", "detail": "Bitte Produkte und Mengen im Warenkorb prüfen."}, status=400)
        order, created = create_simulated_order(
            serializer.validated_data["idempotency_key"], serializer.validated_data["items"]
        )
        response = Response(OrderOutput(order).data, status=201 if created else 200)
        response["Cache-Control"] = "no-store"
        return response
