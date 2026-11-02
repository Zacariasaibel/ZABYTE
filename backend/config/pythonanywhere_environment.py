"""Load the same private configuration for platform WSGI and management commands."""
import json
import os
from pathlib import Path

VARIABLES = {
    "DJANGO_SECRET_KEY", "DJANGO_ALLOWED_HOSTS", "DJANGO_CSRF_TRUSTED_ORIGINS",
    "DJANGO_DB_PATH", "DJANGO_STATIC_ROOT", "DJANGO_BACKUP_DIR", "ZABYTE_FRONTEND_ROOT",
}


def load_environment(config_path=None):
    path = Path(config_path or Path.home() / ".config/zabyte/environment.json")
    if os.name == "posix" and path.stat().st_mode & 0o077:
        raise ValueError("Private configuration must not be accessible to group or others (chmod 600).")
    values = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(values, dict) or set(values) != VARIABLES:
        raise ValueError("Private configuration contains missing or unsupported variable names.")
    if not all(isinstance(value, str) and value for value in values.values()):
        raise ValueError("Private configuration values must be non-empty strings.")
    for key in ["DJANGO_DB_PATH", "DJANGO_STATIC_ROOT", "DJANGO_BACKUP_DIR", "ZABYTE_FRONTEND_ROOT"]:
        if not Path(values[key]).is_absolute():
            raise ValueError("Deployment paths must be absolute.")
    code = Path(__file__).resolve().parents[2]
    public = [Path(values[key]).resolve() for key in ["DJANGO_STATIC_ROOT", "ZABYTE_FRONTEND_ROOT"]]
    private = [path.resolve(), Path(values["DJANGO_DB_PATH"]).resolve(), Path(values["DJANGO_BACKUP_DIR"]).resolve()]
    if any(item.is_relative_to(code) or any(item.is_relative_to(folder) for folder in public) for item in private):
        raise ValueError("Private files must stay outside code and all public directories.")
    if any(code.is_relative_to(folder) or folder.is_relative_to(code) for folder in public):
        raise ValueError("Public directories must be separate from the repository.")
    os.environ.update(values)
    os.environ["DJANGO_SETTINGS_MODULE"] = "config.pythonanywhere"
