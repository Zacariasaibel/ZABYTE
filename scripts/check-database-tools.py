"""Exercise import/backup on disposable SQLite files, never the project database."""
import os
from contextlib import closing
from pathlib import Path
import sqlite3
import subprocess
import sys
from uuid import uuid4

root = Path(__file__).resolve().parent.parent
directory = root / ".local" / f"database-test-{uuid4().hex}"
assert directory.resolve().is_relative_to((root / ".local").resolve())
directory.mkdir(parents=True)
source = directory / "source.sqlite3"
target = directory / "target.sqlite3"
environment = {**os.environ, "DJANGO_DB_PATH": str(target), "DJANGO_BACKUP_DIR": str(directory)}
try:
    with closing(sqlite3.connect(source)) as connection, connection:
        connection.execute("CREATE TABLE preserved (id INTEGER PRIMARY KEY, slug TEXT, price TEXT, stock INTEGER)")
        connection.execute("INSERT INTO preserved VALUES (17, 'unchanged', '69.90', 18)")
    command = [sys.executable, str(root / "scripts" / "import-database.py"), str(source)]
    result = subprocess.run(command, env=environment, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    result = subprocess.run(command, env=environment, capture_output=True, text=True)
    assert result.returncode != 0 and "absent destination" in result.stderr
    result = subprocess.run([sys.executable, str(root / "scripts" / "backup-database.py")],
                            env=environment, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    backup = next(directory.glob("zabyte-*.sqlite3"))
    for database in [source, target, backup]:
        with closing(sqlite3.connect(database)) as connection:
            assert connection.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
            assert connection.execute("SELECT * FROM preserved").fetchall() == [(17, "unchanged", "69.90", 18)]
    print("PASS database tools: import preserves values, refuses overwrite, backup is consistent and environment paths work.")
finally:
    for file in directory.iterdir():
        file.unlink()
    directory.rmdir()
