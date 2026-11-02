"""Serve only on the private container network; Caddy owns public TLS."""
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.production")

from config.wsgi import application
from waitress import serve

serve(application, host="0.0.0.0", port=8000, threads=4,
      trusted_proxy="*", trusted_proxy_headers={"x-forwarded-proto"},
      clear_untrusted_proxy_headers=True)
