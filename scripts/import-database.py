"""Import a consistent existing SQLite database once, without overwriting data."""
import os
from pathlib import Path
import sqlite3
import sys

source = Path(sys.argv[1]).resolve()
target = Path(os.environ["DJANGO_DB_PATH"]).resolve()
if not source.is_file() or target.exists():
    raise SystemExit("Import requires an existing source and an absent destination.")
target.parent.mkdir(parents=True, exist_ok=True)
with sqlite3.connect(source.as_uri() + "?mode=ro", uri=True) as connection:
    with sqlite3.connect(target) as destination:
        connection.backup(destination)
print(f"Imported existing data into {target}")
