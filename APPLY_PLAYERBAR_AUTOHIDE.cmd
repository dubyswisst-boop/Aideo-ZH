@echo off
setlocal
cd /d "%~dp0"
echo [STEP 1] Read-only preflight...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "tools\aideo-feature-patch\playerbar-autohide.ps1" -Check
if errorlevel 1 (echo [STOP] Preflight failed.& pause & exit /b 1)
echo [STEP 2] Apply with explicit confirmation and backup...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "tools\aideo-feature-patch\playerbar-autohide.ps1"
if errorlevel 1 (echo [STOP] Apply failed.& pause & exit /b 1)
pause
