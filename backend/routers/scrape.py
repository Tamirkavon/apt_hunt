import subprocess
import sys
import threading
from pathlib import Path
from fastapi import APIRouter
from database import get_connection, get_setting

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


def _run_geocode():
    """Geocode listings with addresses but no distance_km."""
    try:
        import sys
        sys.path.insert(0, str(BACKEND_DIR))
        from scrapers.runner import geocode_missing
        conn = get_connection()
        home_lat = float(get_setting(conn, "home_lat") or "32.1389")
        home_lon = float(get_setting(conn, "home_lon") or "34.8913")
        geocode_missing(conn, home_lat, home_lon)
        conn.close()
    except Exception as e:
        print(f"[Geocode] Error: {e}")


@router.post("/listings/geocode")
def trigger_geocode():
    """Geocode listings that have a street address but no distance_km."""
    thread = threading.Thread(target=_run_geocode, daemon=True)
    thread.start()
    return {"status": "started"}


