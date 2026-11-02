"""Check production settings in isolated interpreters without opening a database."""
import os
from pathlib import Path
import secrets
import subprocess
import sys

backend = Path(__file__).resolve().parent.parent / "backend"
environment = {
    **os.environ,
    "DJANGO_SETTINGS_MODULE": "config.production",
    "DJANGO_SECRET_KEY": secrets.token_urlsafe(64),
    "DJANGO_ALLOWED_HOSTS": "shop.example.invalid",
    "DJANGO_CSRF_TRUSTED_ORIGINS": "https://shop.example.invalid",
    "DJANGO_DB_PATH": str(backend.parent / ".local" / "production-test.sqlite3"),
    "DJANGO_DEBUG": "1",
}
code = """from django.conf import settings as s
assert s.DEBUG is False
assert s.SESSION_COOKIE_SECURE and s.CSRF_COOKIE_SECURE
assert s.CSRF_COOKIE_HTTPONLY and s.SECURE_SSL_REDIRECT
assert s.SECURE_PROXY_SSL_HEADER == ('HTTP_X_FORWARDED_PROTO', 'https')
assert s.STATIC_URL == '/static/'
"""
result = subprocess.run([sys.executable, "-c", code], cwd=backend, env=environment, capture_output=True, text=True)
assert result.returncode == 0, result.stderr
for key, value in [
    ("DJANGO_SECRET_KEY", "short"), ("DJANGO_ALLOWED_HOSTS", "*"),
    ("DJANGO_ALLOWED_HOSTS", ""), ("DJANGO_CSRF_TRUSTED_ORIGINS", "http://shop.example.invalid"),
    ("DJANGO_CSRF_TRUSTED_ORIGINS", "https://*.example.invalid"), ("DJANGO_DB_PATH", "relative.sqlite3"),
]:
    result = subprocess.run([sys.executable, "-c", "from django.conf import settings; print(settings.DEBUG)"],
                            cwd=backend, env={**environment, key: value}, capture_output=True, text=True)
    assert result.returncode != 0 and "ImproperlyConfigured" in result.stderr, (key, result.stderr)
print("PASS production: DEBUG off, secure cookies, HTTPS proxy and fail-closed environment validation (6 cases).")
