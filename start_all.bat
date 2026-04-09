@echo off
title apt_hunt - Backend + ngrok
cd /d "%~dp0backend"
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)
call .venv\Scripts\activate
pip install -r requirements.txt -q

echo.
echo === Starting apt_hunt backend on http://localhost:8000 ===
echo.
start "apt_hunt Backend" cmd /k "cd /d "%~dp0backend" && call .venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8000"

echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo.
echo === Starting ngrok tunnel ===
echo === Public URL: https://unpesterous-mikel-individualistically.ngrok-free.dev ===
echo.
start "ngrok" cmd /k "\"C:\Users\USER\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe\" http 8000 --url=unpesterous-mikel-individualistically.ngrok-free.dev"

echo.
echo Both services started!
echo Backend: http://localhost:8000
echo Public:  https://unpesterous-mikel-individualistically.ngrok-free.dev
echo Frontend: https://apt-hunt-hod-hasharon.netlify.app
echo.
pause
