"""Small deployment checks; no server, migrations, seed or real bundle required."""
import importlib.util
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import time
import zipfile
from contextlib import contextmanager
import shutil
from uuid import uuid4

root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / "backend"))
from config.pythonanywhere_environment import load_environment

spec = importlib.util.spec_from_file_location("frontend_package", root / "scripts/package-pythonanywhere.py")
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)
@contextmanager
def disposable_directory():
    parent = Path(tempfile.gettempdir()).resolve()
    directory = parent / ("zabyte-pa-" + uuid4().hex)
    directory.mkdir()
    try:
        yield directory
    finally:
        assert directory.resolve().is_relative_to(parent) and directory.name.startswith("zabyte-pa-")
        shutil.rmtree(directory)


with disposable_directory() as temporary:
    directory = Path(temporary)
    config = directory / "environment.json"
    values = json.loads((root / "deploy/pythonanywhere-environment.example.json").read_text())
    values.update(DJANGO_SECRET_KEY=secrets.token_urlsafe(64), DJANGO_DB_PATH=str(directory / "private/db.sqlite3"),
                  DJANGO_BACKUP_DIR=str(directory / "private/backups"), DJANGO_STATIC_ROOT=str(directory / "static"),
                  ZABYTE_FRONTEND_ROOT=str(directory / "web"))
    config.write_text(json.dumps(values))
    config.chmod(0o600)
    load_environment(config)
    secret = os.environ["DJANGO_SECRET_KEY"]
    load_environment(config)
    assert os.environ["DJANGO_SECRET_KEY"] == secret
    result = subprocess.run([sys.executable, "-c", """from django.conf import settings as s
assert not s.DEBUG and s.SESSION_COOKIE_SECURE and s.CSRF_COOKIE_SECURE
assert s.SECURE_PROXY_SSL_HEADER is None and not s.SECURE_SSL_REDIRECT
assert s.ALLOWED_HOSTS == ['zaibel.pythonanywhere.com']
assert s.ROOT_URLCONF == 'config.pythonanywhere_urls'
import django
django.setup()
from django.test import Client
client = Client(enforce_csrf_checks=True)
request = {'secure': True, 'HTTP_HOST': 'zaibel.pythonanywhere.com', 'HTTP_ORIGIN': 'https://zaibel.pythonanywhere.com'}
token = client.get('/api/csrf/', **request)
assert token.status_code == 200 and token.cookies['csrftoken']['secure'] and token.cookies['csrftoken']['httponly']
assert client.post('/api/simulated-orders/', data='{}', content_type='application/json', **request).status_code == 403
assert client.post('/api/simulated-orders/', data='{}', content_type='application/json', HTTP_X_CSRFTOKEN=token.json()['csrfToken'], **request).status_code == 400
request['HTTP_ORIGIN'] = 'https://untrusted.invalid'
assert client.post('/api/simulated-orders/', data='{}', content_type='application/json', HTTP_X_CSRFTOKEN=token.json()['csrfToken'], **request).status_code == 403
"""], cwd=root / "backend", env=os.environ.copy(), capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    for invalid in [dict(values, DJANGO_DB_PATH=str(directory / "web/db.sqlite3")),
                    dict(values, DJANGO_STATIC_ROOT=str(root)), dict(values, DJANGO_DB_PATH="relative.sqlite3")]:
        config.write_text(json.dumps(invalid))
        try:
            load_environment(config)
        except ValueError:
            pass
        else:
            raise AssertionError("Unsafe private/public configuration accepted")
    web = directory / "bundle"
    (web / "assets").mkdir(parents=True)
    (web / "main-X.js").write_text("console.log('fixture')")
    (web / "styles-X.css").write_text("body { color: black; }")
    (web / "assets/favicon.svg").write_text("<svg/>")
    index = '<base href="/"><link rel="stylesheet" href="/shop-static/styles-X.css"><script src="/shop-static/main-X.js"></script><link rel="icon" href="/assets/favicon.svg">'
    (web / "index.html").write_text(index)
    count = package.package_build(web, directory / "fixture.zip", time.time() - 10)
    with zipfile.ZipFile(directory / "fixture.zip") as archive:
        assert count == 4 and "index.html" in archive.namelist()
    for filename in [".env", "environment.json", "package.json", "db.sqlite3", "main.js.map", "source.ts"]:
        bad = web / filename
        bad.write_text("must not publish")
        try:
            package.validate_build(web, time.time() - 10)
        except ValueError:
            pass
        else:
            raise AssertionError("Private/source file accepted")
        bad.unlink()
    for html in [index.replace('/shop-static/main-X.js', '/main-X.js'), index.replace('main-X.js', 'missing.js')]:
        (web / "index.html").write_text(html)
        try:
            package.validate_build(web, time.time() - 10)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid resource map accepted")
    (web / "index.html").write_text(index)
    try:
        package.validate_build(web, time.time() + 60)
    except ValueError:
        pass
    else:
        raise AssertionError("Stale bundle accepted")
print("PASS PythonAnywhere profile, shared private loader, path isolation and public ZIP/resource validation (synthetic bundle only).")
