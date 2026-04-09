$ErrorActionPreference = "Continue"
Set-Location "C:\Users\USER\Desktop\Claude Code\apt_hunt\frontend"

Write-Host "=== Building frontend ==="
$buildOut = npm run build 2>&1
$buildOut | Out-File "C:\Users\USER\Desktop\Claude Code\apt_hunt\build_log.txt" -Encoding UTF8
Write-Host $buildOut

Write-Host "=== Checking dist ==="
if (Test-Path "dist\index.html") {
    Write-Host "dist/index.html EXISTS"
} else {
    Write-Host "dist/index.html MISSING - build failed"
    exit 1
}

Write-Host "=== Deploying to Netlify ==="
$netlifyOut = netlify deploy --prod --dir=dist 2>&1
$netlifyOut | Out-File "C:\Users\USER\Desktop\Claude Code\apt_hunt\netlify_log.txt" -Encoding UTF8
Write-Host $netlifyOut
