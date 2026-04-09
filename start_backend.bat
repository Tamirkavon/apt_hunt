@echo off
title apt_hunt Backend
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
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
