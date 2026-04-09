@echo off
title apt_hunt Setup
echo ============================================
echo    apt_hunt — First Time Setup
echo ============================================
echo.

:: Backend setup
echo [1/3] Setting up Python backend...
cd /d "%~dp0backend"
python -m venv .venv
call .venv\Scripts\activate
pip install -r requirements.txt
echo.

:: Playwright chromium
echo [2/3] Installing Playwright Chromium browser...
playwright install chromium
echo.

:: Frontend setup
echo [3/3] Installing frontend packages...
cd /d "%~dp0frontend"
npm install
echo.

echo ============================================
echo    Setup complete!
echo.
echo    Next steps:
echo    1. Double-click start_backend.bat
echo    2. Double-click start_frontend.bat
echo    3. Double-click run_scraper.bat
echo ============================================
pause
