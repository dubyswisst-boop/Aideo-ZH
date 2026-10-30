@echo off
setlocal
cd /d "%~dp0"
echo [STEP 1] Read-only preflight...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "tools\aideo-feature-patch\lyrics-save-scope.ps1" -Check
if errorlevel 1 (echo [STOP] Preflight failed.& pause & exit /b 1)
echo [STEP 2] Explicit confirmation and verified backup...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "tools\aideo-feature-patch\lyrics-save-scope.ps1"
if errorlevel 1 (echo [STOP] Apply failed.& pause & exit /b 1)
pause
