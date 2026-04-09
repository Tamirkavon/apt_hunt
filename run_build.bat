@echo off
cd /d "C:\Users\USER\Desktop\Claude Code\apt_hunt\frontend"
echo Building frontend... > "C:\Users\USER\Desktop\Claude Code\apt_hunt\build_log.txt"
call npm run build >> "C:\Users\USER\Desktop\Claude Code\apt_hunt\build_log.txt" 2>&1
echo Build exit code: %ERRORLEVEL% >> "C:\Users\USER\Desktop\Claude Code\apt_hunt\build_log.txt"
if exist "dist\index.html" (
    echo dist OK >> "C:\Users\USER\Desktop\Claude Code\apt_hunt\build_log.txt"
    netlify deploy --prod --dir=dist >> "C:\Users\USER\Desktop\Claude Code\apt_hunt\build_log.txt" 2>&1
    echo Netlify exit code: %ERRORLEVEL% >> "C:\Users\USER\Desktop\Claude Code\apt_hunt\build_log.txt"
) else (
    echo dist MISSING >> "C:\Users\USER\Desktop\Claude Code\apt_hunt\build_log.txt"
)
