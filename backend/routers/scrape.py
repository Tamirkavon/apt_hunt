import subprocess
import sys
import threading
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks

router = APIRouter(prefix="/api")

_scrape_running = False
BACKEND_DIR = Path(__file__).parent.parent


def _run_scrape_subprocess():
    """Run the scraper in a separate process to avoid Playwright/asyncio conflicts."""
    global _scrape_running
    _scrape_running = True
    try:
        subprocess.run(
            [sys.executable, "-m", "scrapers.runner"],
            cwd=str(BACKEND_DIR),
            timeout=300,
        )
    except Exception as e:
        print(f"[Scrape] Subprocess error: {e}")
    finally:
        _scrape_running = False


@router.post("/scrape")
def trigger_scrape():
    global _scrape_running
    if _scrape_running:
        return {"status": "already_running"}
    thread = threading.Thread(target=_run_scrape_subprocess, daemon=True)
    thread.start()
    return {"status": "started"}


@router.get("/scrape/running")
def scrape_status():
    return {"running": _scrape_running}


