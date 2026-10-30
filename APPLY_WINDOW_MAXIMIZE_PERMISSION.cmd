@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "PATCH_SCRIPT=%~dp0tools\aideo-feature-patch\window-maximize-permission.ps1"
if not exist "%PATCH_SCRIPT%" (echo [STOP] Missing patch script. & pause & exit /b 1)
echo [STEP 1] Read-only preflight...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PATCH_SCRIPT%" -Check
if errorlevel 1 (echo [STOP] Preflight failed. & pause & exit /b 1)
choice /C YN /M "Apply one-line Tauri window permission fix with backup"
if errorlevel 2 (echo [SAFE] Cancelled. & pause & exit /b 0)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PATCH_SCRIPT%"
if errorlevel 1 (echo [STOP] Apply failed. & pause & exit /b 1)
echo [NEXT] Review src-tauri/capabilities/default.json in GitHub Desktop.
pause
