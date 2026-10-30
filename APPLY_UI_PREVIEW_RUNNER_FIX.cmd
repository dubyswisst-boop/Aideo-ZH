@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "PATCH=%~dp0tools\ui-preview\fix-runner.ps1"
if not exist "%PATCH%" (echo [STOP] Missing patch script.& pause & exit /b 1)
echo [STEP 1] Read-only preflight...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PATCH%" -Check
if errorlevel 1 (echo [STOP] Preflight failed.& pause & exit /b 1)
choice /C YN /M "Apply one-line Ubuntu runner fix with verified backup"
if errorlevel 2 (echo [SAFE] Cancelled.& pause & exit /b 0)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PATCH%"
if errorlevel 1 (echo [STOP] Apply failed.& pause & exit /b 1)
echo [NEXT] Review workflow change in GitHub Desktop, then commit and push.
pause
