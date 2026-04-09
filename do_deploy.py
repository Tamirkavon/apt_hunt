import subprocess
import sys
import os

frontend_dir = r"C:\Users\USER\Desktop\Claude Code\apt_hunt\frontend"
log_path = r"C:\Users\USER\Desktop\Claude Code\apt_hunt\deploy_log.txt"

def run(cmd, cwd=None):
    result = subprocess.run(
        cmd, cwd=cwd, capture_output=True, text=True, shell=True
    )
    out = result.stdout + result.stderr
    print(out)
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"\n=== {cmd} ===\n{out}\n")
    return result.returncode, out

with open(log_path, "w", encoding="utf-8") as f:
    f.write("Starting build + deploy\n")

print("=== Building frontend ===")
code, out = run("npm run build", cwd=frontend_dir)
print(f"Build exit: {code}")

dist_index = os.path.join(frontend_dir, "dist", "index.html")
if not os.path.exists(dist_index):
    print("ERROR: dist/index.html not found!")
    with open(log_path, "a") as f:
        f.write("BUILD FAILED - dist missing\n")
    sys.exit(1)

print("\n=== dist/index.html OK ===")
print("\n=== Deploying to Netlify ===")
code, out = run("netlify deploy --prod --dir=dist", cwd=frontend_dir)
print(f"Netlify exit: {code}")
