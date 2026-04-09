@echo off
title apt_hunt Scraper
cd /d "%~dp0backend"
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
    call .venv\Scripts\activate
    pip install -r requirements.txt -q
    playwright install chromium
) else (
    call .venv\Scripts\activate
)
echo.
echo === Running apartment scraper ===
echo.
python -m scrapers.runner
echo.
echo === Done! Open http://localhost:5173 to see results ===
pause
