@echo off
setlocal
cd /d "%~dp0"
set "PATCH_SCRIPT=%~dp0tools\ui-preview\apply-state-test.ps1"
if not exist "%PATCH_SCRIPT%" (echo [STOP] Missing patch script& pause& exit /b 1)
echo [STEP 1] Read-only preflight...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PATCH_SCRIPT%" -Check
if errorlevel 1 (echo [STOP] Preflight failed.& pause& exit /b 1)
choice /C YN /M "Apply stronger sidebar state tests with verified backup"
if errorlevel 2 (echo [SAFE] Cancelled.& pause& exit /b 0)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PATCH_SCRIPT%"
if errorlevel 1 (echo [STOP] Patch failed.& pause& exit /b 1)
echo [NEXT] Review tools/ui-preview/test-sidebar.mjs in GitHub Desktop.
pause
