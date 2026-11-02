"""PythonAnywhere hosts HTTPS at its edge; no local proxy or Node server is used."""
from pathlib import Path
import os

from django.core.exceptions import ImproperlyConfigured

from .production import *  # noqa: F403

if ALLOWED_HOSTS != ["zaibel.pythonanywhere.com"]:  # noqa: F405
    raise ImproperlyConfigured("PythonAnywhere requires the exact Zaibel host.")
if CSRF_TRUSTED_ORIGINS != ["https://zaibel.pythonanywhere.com"]:  # noqa: F405
    raise ImproperlyConfigured("PythonAnywhere requires its exact HTTPS CSRF origin.")
ROOT_URLCONF = "config.pythonanywhere_urls"
FRONTEND_ROOT = Path(os.environ["ZABYTE_FRONTEND_ROOT"])
# Enable Force HTTPS in the platform Web tab, including its static file responses.
# Use the platform WSGI scheme, not unverified forwarded headers from another proxy.
SECURE_SSL_REDIRECT = False
SECURE_PROXY_SSL_HEADER = None
