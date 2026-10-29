@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "SCRIPT=%~dp0tools\aideo-feature-patch\v10-stage1.ps1"
if not exist "%SCRIPT%" (echo [STOP] Missing V10 script.& pause & exit /b 1)
echo [STEP 1] Read-only preflight...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -Check
if errorlevel 1 (echo [STOP] Preflight failed. No apply.& pause & exit /b 1)
choice /C YN /M "Apply V10 Stage 1 CSS with verified backup"
if errorlevel 2 (echo [SAFE] Cancelled.& pause & exit /b 0)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
if errorlevel 1 (echo [STOP] Apply failed.& pause & exit /b 1)
echo [NEXT] Review src/App.css in GitHub Desktop; CI and runtime validation pending.
pause
