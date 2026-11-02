"""Read-only HTTP checks against an explicitly supplied HTTPS deployment."""
import argparse
import json
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import urlopen

parser = argparse.ArgumentParser()
parser.add_argument("base_url", help="The actual HTTPS origin; no placeholder is supplied.")
args = parser.parse_args()
base = args.base_url.rstrip("/")
origin = urlsplit(base)
if origin.scheme != "https" or not origin.netloc or origin.path or origin.query or origin.fragment:
    parser.error("Use a bare HTTPS origin.")


def fetch(path, expected=200):
    try:
        response = urlopen(base + path, timeout=20)
    except HTTPError as error:
        response = error
    with response:
        body = response.read()
        assert response.status == expected, (path, response.status, expected)
        assert response.headers.get("X-Content-Type-Options") == "nosniff", path
        return body, response.headers


index, headers = fetch("/")
assert b"<app-root" in index and "text/html" in headers.get("Content-Type", "")
products, _ = fetch("/api/products/")
products = json.loads(products)
assert products
for route in [f"/produkte/{products[0]['slug']}", "/warenkorb", "/kasse", "/bestaetigung"]:
    body, _ = fetch(route)
    assert body == index, route
for path in ["/assets/missing-v1.webp", "/missing-v1.js", "/unknown-v1-route", "/api/missing-v1/", "/static/missing-v1.css"]:
    body, _ = fetch(path, 404)
    assert body != index, f"SPA fallback must not mask a 404: {path}"
body, _ = fetch("/api/products/no-such-product-v1/", 404)
assert isinstance(json.loads(body), dict)
_, headers = fetch("/api/csrf/")
cookie = headers.get("Set-Cookie", "")
assert "csrftoken=" in cookie and "Secure" in cookie and "HttpOnly" in cookie
body, _ = fetch("/admin/login/")
assert b"csrfmiddlewaretoken" in body
body, headers = fetch("/static/admin/css/base.css")
assert body and "text/css" in headers.get("Content-Type", "")
manifest = Path(__file__).resolve().parent.parent / "docs" / "studio-assets.json"
for asset in json.loads(manifest.read_text(encoding="utf-8"))["assets"]:
    body, headers = fetch(asset["public_url"])
    assert body.startswith(b"RIFF") and "image/webp" in headers.get("Content-Type", "")
print("PASS deployed HTTPS: known SPA reloads, API, precise 404s, CSRF cookie, Admin CSS and ten studio assets.")
print("Read-only check: no order submitted. Browser, keyboard, actual retry flow and TLS operations still need review.")
