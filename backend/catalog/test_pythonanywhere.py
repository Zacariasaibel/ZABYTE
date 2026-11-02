"""Platform URL policy without a public server or the user's SQLite database."""
from pathlib import Path
import tempfile
import shutil
from uuid import uuid4

from django.test import SimpleTestCase, override_settings
from django.urls import resolve

from config.pythonanywhere_urls import frontend_index


@override_settings(ROOT_URLCONF="config.pythonanywhere_urls", ALLOWED_HOSTS=["zaibel.pythonanywhere.com"],
                   SECURE_SSL_REDIRECT=False, SECURE_PROXY_SSL_HEADER=None)
class PythonAnywhereRoutesTests(SimpleTestCase):
    def setUp(self):
        parent = Path(tempfile.gettempdir()).resolve()
        self.root = parent / ("zabyte-routes-" + uuid4().hex)
        self.root.mkdir()
        assert self.root.resolve().is_relative_to(parent) and self.root.name.startswith("zabyte-routes-")
        self.addCleanup(shutil.rmtree, self.root)
        (self.root / "index.html").write_text("<!doctype html><title>ZABYTE test build</title>", encoding="utf-8")
        self.settings_override = override_settings(FRONTEND_ROOT=self.root)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)

    def test_known_pages_reload_without_https_redirect_loops(self):
        for path in ["/", "/produkte/fjord-keys", "/produkte/fjord-keys-mini/", "/warenkorb", "/kasse/", "/bestaetigung"]:
            with self.subTest(path=path):
                response = self.client.get(path, secure=True, HTTP_HOST="zaibel.pythonanywhere.com")
                self.assertEqual(response.status_code, 200)
                self.assertIn(b"ZABYTE test build", b"".join(response.streaming_content))
                response.close()
                self.assertIn("no-store", response["Cache-Control"])

    def test_unknown_api_assets_admin_and_private_paths_never_receive_index(self):
        for path in ["/api/missing/", "/assets/missing.svg", "/shop-static/missing.js",
                     "/static/missing.css", "/missing.js", "/unknown-page", "/.config/zabyte/environment.json", "/backend/db.sqlite3"]:
            with self.subTest(path=path):
                response = self.client.get(path, secure=True, HTTP_HOST="zaibel.pythonanywhere.com")
                self.assertEqual(response.status_code, 404)
                self.assertNotIn(b"ZABYTE test build", response.content)
        admin = self.client.get("/admin/missing/", secure=True, HTTP_HOST="zaibel.pythonanywhere.com")
        self.assertEqual(admin.status_code, 302)
        self.assertIn("/admin/login/", admin.url)
        for path in ["/api/products/", "/api/simulated-orders/", "/admin/login/"]:
            self.assertIsNot(resolve(path).func, frontend_index)

    def test_no_public_build_returns_503_and_post_does_not_receive_spa(self):
        (self.root / "index.html").unlink()
        self.assertEqual(self.client.get("/", secure=True, HTTP_HOST="zaibel.pythonanywhere.com").status_code, 503)
        self.assertEqual(self.client.post("/kasse", secure=True, HTTP_HOST="zaibel.pythonanywhere.com").status_code, 405)
