@echo off
setlocal
cd /d "%~dp0"
echo [STEP 1] Read-only preflight...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "tools\aideo-feature-patch\lyrics-p0-b21.ps1" -Check
if errorlevel 1 (echo [STOP] Preflight failed.& pause & exit /b 1)
echo [STEP 2] Verified backup and explicit confirmation...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "tools\aideo-feature-patch\lyrics-p0-b21.ps1"
if errorlevel 1 (echo [STOP] Apply failed.& pause & exit /b 1)
pause
