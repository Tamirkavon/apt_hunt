@echo off
title apt_hunt Dashboard
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo Installing npm packages...
    npm install
)
echo.
echo === Opening dashboard at http://localhost:5173 ===
echo.
npm run dev
pause
