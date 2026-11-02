"""Check the explicit V1 source manifest without requiring a Git repository."""
import ast
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
manifest = (root / "docs" / "commit-v1.md").read_text(encoding="utf-8")
files = manifest.split("```text\n", 1)[1].split("```", 1)[0].splitlines()
for name in files:
    path = root / name
    assert path.resolve().is_relative_to(root), name
    raw = path.read_bytes()
    assert not raw.startswith(b"\xef\xbb\xbf"), f"UTF-8 BOM: {name}"
    text = raw.decode("utf-8", errors="strict")
    assert "\ufffd" not in text and "\x00" not in text, name
    assert not text or text.endswith("\n"), f"Missing final newline: {name}"
    assert all(line == line.rstrip() for line in text.splitlines()), f"Trailing whitespace: {name}"
    if path.suffix == ".py":
        ast.parse(text, filename=name)
    if path.suffix == ".json":
        json.loads(text)
# Empty package markers are valid and must not trigger the historical assertion.
ast.parse((root / "backend/catalog/__init__.py").read_text(encoding="utf-8"))
ignore = (root / ".gitignore").read_text(encoding="utf-8").splitlines()
for required in [".env", ".env.*", "!.env.example", "*.sqlite3", "*.sqlite3-*", "*.db", "backups/", ".local/", ".venv/", "node_modules/", "dist/", "out-tsc/", ".angular/", "staticfiles/"]:
    assert required in ignore, required
print(f"PASS {len(files)} V1 files: UTF-8, final newline, whitespace, Python/JSON syntax and ignore rules.")
print("Empty catalog/__init__.py is valid. This text manifest also checks files before staging; run git diff --check separately.")
