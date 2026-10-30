@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "FIX_LYRICS_ZH_CI.ps1" -Check
if errorlevel 1 (echo [STOP] Preflight failed. & pause & exit /b 1)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "FIX_LYRICS_ZH_CI.ps1"
if errorlevel 1 (echo [STOP] Apply failed. & pause & exit /b 1)
pause
