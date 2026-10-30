@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "tools\aideo-feature-patch\lyrics-p0-b22.ps1" -Check
if errorlevel 1 (echo [STOP] Preflight failed. & pause & exit /b 1)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "tools\aideo-feature-patch\lyrics-p0-b22.ps1"
if errorlevel 1 (echo [STOP] Apply failed. & pause & exit /b 1)
pause
