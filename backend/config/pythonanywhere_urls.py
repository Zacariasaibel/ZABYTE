"""Only known Angular pages receive the public build index."""
from django.conf import settings
from django.http import FileResponse, HttpResponse
from django.urls import re_path
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_safe

from .urls import urlpatterns as backend_urls


@never_cache
@require_safe
def frontend_index(request, **kwargs):
    try:
        return FileResponse((settings.FRONTEND_ROOT / "index.html").open("rb"), content_type="text/html; charset=utf-8")
    except FileNotFoundError:
        return HttpResponse("Der Shop ist vorübergehend nicht verfügbar.", status=503)


urlpatterns = [*backend_urls, re_path(
    r"^(?:|produkte/[A-Za-z0-9_-]+/?|warenkorb/?|kasse/?|bestaetigung/?)$", frontend_index,
)]
