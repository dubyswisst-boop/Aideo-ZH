@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "PATCH_SCRIPT=%~dp0tools\aideo-feature-patch\v10-s2-layout.ps1"
if not exist "%PATCH_SCRIPT%" (echo [STOP] Missing script.& pause & exit /b 1)
echo [STEP 1] Read-only preflight...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PATCH_SCRIPT%" -Check
if errorlevel 1 (echo [STOP] Preflight failed.& pause & exit /b 1)
choice /C YN /M "Apply V10 S2 expanded sidebar layout fix with verified backup"
if errorlevel 2 (echo [SAFE] Cancelled.& pause & exit /b 0)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PATCH_SCRIPT%"
if errorlevel 1 (echo [STOP] Apply failed.& pause & exit /b 1)
echo [NEXT] Review src/App.css in GitHub Desktop; CI and runtime checks pending.
pause
