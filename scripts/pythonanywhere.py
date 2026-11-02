"""Management and backups using the same private environment as WSGI."""
from pathlib import Path
import runpy
import sys

root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / "backend"))
from config.pythonanywhere_environment import load_environment

if len(sys.argv) < 2 or sys.argv[1] not in ["manage", "backup"]:
    raise SystemExit("Usage: python scripts/pythonanywhere.py manage <command> | backup")
load_environment()
if sys.argv[1] == "backup":
    runpy.run_path(str(root / "scripts/backup-database.py"), run_name="__main__")
else:
    from django.core.management import execute_from_command_line
    execute_from_command_line(["manage.py", *sys.argv[2:]])
