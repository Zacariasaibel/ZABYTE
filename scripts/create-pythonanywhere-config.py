"""Run once on the intended server; never rotate or print an existing secret."""
import json
import os
from pathlib import Path
import secrets

home = Path.home()
if home != Path("/home/Zaibel"):
    raise SystemExit("Home differs from /home/Zaibel. Review all planned paths before proceeding.")
root = Path(__file__).resolve().parent.parent
values = json.loads((root / "deploy/pythonanywhere-environment.example.json").read_text(encoding="utf-8"))
values["DJANGO_SECRET_KEY"] = secrets.token_urlsafe(64)
private = home / ".config/zabyte"
private.mkdir(mode=0o700, parents=True, exist_ok=True)
os.chmod(private, 0o700)
target = private / "environment.json"
with target.open("x", encoding="utf-8", opener=lambda path, flags: os.open(path, flags, 0o600)) as stream:
    json.dump(values, stream, indent=2)
    stream.write("\n")
for name, mode in [("zabyte-data", 0o700), ("zabyte-web", 0o755), ("zabyte-static", 0o755)]:
    (home / name).mkdir(mode=mode, exist_ok=True)
print("Private configuration created; no secret printed. Do not rerun on updates.")
