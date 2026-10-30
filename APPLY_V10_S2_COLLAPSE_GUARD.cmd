@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "PATCH=tools\aideo-feature-patch\v10-s2-collapse-guard.ps1"
if not exist "%PATCH%" (echo [STOP] Missing patch script.& pause & exit /b 1)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PATCH%" -Check
if errorlevel 1 (echo [STOP] Preflight failed.& pause & exit /b 1)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PATCH%"
if errorlevel 1 (echo [STOP] Patch failed.& pause & exit /b 1)
pause
