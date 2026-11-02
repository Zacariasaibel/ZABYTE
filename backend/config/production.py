"""HTTPS settings for the private Waitress service behind Caddy."""
import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

from .settings import *  # noqa: F403

DEBUG = False
if len(SECRET_KEY) < 50 or len(set(SECRET_KEY)) < 5:  # noqa: F405
    raise ImproperlyConfigured("Production requires a strong DJANGO_SECRET_KEY of at least 50 characters.")
ALLOWED_HOSTS = [value.strip() for value in os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",") if value.strip()]
CSRF_TRUSTED_ORIGINS = [value.strip() for value in os.environ.get("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",") if value.strip()]
if not ALLOWED_HOSTS or any("*" in value for value in ALLOWED_HOSTS):
    raise ImproperlyConfigured("Production requires explicit DJANGO_ALLOWED_HOSTS.")
if not CSRF_TRUSTED_ORIGINS or any(not value.startswith("https://") or "*" in value for value in CSRF_TRUSTED_ORIGINS):
    raise ImproperlyConfigured("Production requires explicit HTTPS DJANGO_CSRF_TRUSTED_ORIGINS.")
database_path = Path(os.environ.get("DJANGO_DB_PATH", ""))
if not database_path.is_absolute():
    raise ImproperlyConfigured("Production requires an absolute DJANGO_DB_PATH on persistent storage.")
DATABASES["default"]["NAME"] = database_path  # noqa: F405
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
# Enable these only after checking HTTPS on every subdomain and accepting preload.
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.environ.get("DJANGO_HSTS_INCLUDE_SUBDOMAINS", "0") == "1"
SECURE_HSTS_PRELOAD = os.environ.get("DJANGO_HSTS_PRELOAD", "0") == "1"
