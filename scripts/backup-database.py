"""Create a consistent local SQLite backup, including while the development server is running."""
from datetime import datetime, timezone
from pathlib import Path
import sqlite3
import os
from uuid import uuid4

root = Path(__file__).resolve().parent.parent
source = Path(os.environ.get("DJANGO_DB_PATH", root / "backend" / "db.sqlite3"))
if not source.is_file():
    raise SystemExit("Keine SQLite-Datenbank gefunden.")
destination_directory = Path(os.environ.get("DJANGO_BACKUP_DIR", root / ".local" / "backups"))
destination_directory.mkdir(parents=True, exist_ok=True)
stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
target = destination_directory / f"zabyte-{stamp}-{uuid4().hex[:8]}.sqlite3"
assert target.resolve().is_relative_to(destination_directory.resolve())
with sqlite3.connect(source) as connection, sqlite3.connect(target) as backup:
    connection.backup(backup)
print(f"Sicherung erstellt: {target}")
