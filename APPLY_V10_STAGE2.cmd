@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "SCRIPT=%~dp0tools\aideo-feature-patch\v10-stage2.ps1"
if not exist "%SCRIPT%" (echo [STOP] Script missing. & pause & exit /b 1)
echo [STEP 1] Read-only preflight...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -Check
if errorlevel 1 (echo [STOP] Preflight failed. & pause & exit /b 1)
choice /C YN /M "Apply V10 Stage 2 with verified backup"
if errorlevel 2 (echo [SAFE] Cancelled. & exit /b 0)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
if errorlevel 1 (echo [STOP] Apply failed. & pause & exit /b 1)
echo [NEXT] Inspect three source changes in GitHub Desktop; do not push before review.
pause
