"""Start uvicorn from the correct directory."""
import subprocess, sys, os
from pathlib import Path

BACKEND = Path(r"C:\Users\USER\Desktop\Claude Code\apt_hunt\backend")
os.chdir(BACKEND)

subprocess.run([
    sys.executable, "-m", "uvicorn",
    "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"
], cwd=str(BACKEND))
