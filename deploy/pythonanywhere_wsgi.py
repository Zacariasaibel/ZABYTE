"""Paste this entire file into the WSGI file linked by PythonAnywhere Web."""
import os
import sys

backend_path = "/home/Zaibel/ZABYTE/backend"
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from config.pythonanywhere_environment import load_environment

load_environment("/home/Zaibel/.config/zabyte/environment.json")
os.environ["DJANGO_SETTINGS_MODULE"] = "config.pythonanywhere"

from django.core.wsgi import get_wsgi_application

application = get_wsgi_application()
