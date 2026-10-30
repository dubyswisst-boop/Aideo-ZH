@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "PATCH=%~dp0tools\aideo-feature-patch\stage4-url-fix.ps1"
if not exist "%PATCH%" (echo [STOP] Missing patch script. & pause & exit /b 1)
echo [STEP 1] Read-only preflight...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PATCH%" -Check
if errorlevel 1 (echo [STOP] Preflight failed. & pause & exit /b 1)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PATCH%"
if errorlevel 1 (echo [STOP] Apply failed. & pause & exit /b 1)
pause
