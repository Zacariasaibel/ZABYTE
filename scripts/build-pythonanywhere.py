"""Build first, then validate/package; never package after a failed build."""
from pathlib import Path
import os
import subprocess
import sys
import time

root = Path(__file__).resolve().parent.parent
command = ["npm.cmd" if os.name == "nt" else "npm", "run", "build", "--prefix", "frontend", "--", "--configuration", "production,pythonanywhere"]
if os.name == "nt":
    command = ["cmd.exe", "/d", "/c", *command]
started = time.time()
result = subprocess.run(command, cwd=root)
if result.returncode:
    raise SystemExit("PythonAnywhere build failed. No new package was generated.")
subprocess.run([sys.executable, str(root / "scripts/package-pythonanywhere.py"), "--build-start", str(started)], cwd=root, check=True)
