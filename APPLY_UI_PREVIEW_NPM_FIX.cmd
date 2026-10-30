@echo off
setlocal
cd /d "%~dp0"
set "PATCH_SCRIPT=%~dp0tools\aideo-feature-patch\v10-ui-npm-fix.ps1"
if not exist "%PATCH_SCRIPT%" (echo [STOP] Patch script missing.& pause & exit /b 1)
echo [STEP 1] Read-only preflight...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PATCH_SCRIPT%" -Check
if errorlevel 1 (echo [STOP] Preflight failed.& pause & exit /b 1)
choice /C YN /M "Apply cloud preview npm-install fix with backup"
if errorlevel 2 (echo [SAFE] Cancelled.& pause & exit /b 0)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PATCH_SCRIPT%"
if errorlevel 1 (echo [STOP] Apply failed.& pause & exit /b 1)
pause
