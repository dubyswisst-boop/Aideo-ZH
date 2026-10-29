@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo.
echo ====================================================
echo    Aideo-ZH V9.2 MINIMAL CI FIX (PowerShell 5.1)
echo ====================================================
echo.
set "PATCH_SCRIPT=%~dp0tools\aideo-feature-patch\v9-fix.ps1"
if not exist "%PATCH_SCRIPT%" (
  echo [STOP] V9 patch script missing. Extract the entire ZIP to repository root.
  echo Expected: "%PATCH_SCRIPT%"
  pause
  exit /b 1
)
echo [STEP 1] Read-only preflight...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PATCH_SCRIPT%" -Check
if errorlevel 1 (
  echo [STOP] Preflight failed. Apply step BLOCKED.
  pause
  exit /b 1
)
echo.
choice /C YN /M "Apply V9 one-file fix and create VERIFIED backup"
if errorlevel 2 (
  echo [SAFE] Cancelled. No source changes made.
  exit /b 0
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PATCH_SCRIPT%"
if errorlevel 1 (
  echo [STOP] Apply failed. See details above.
  pause
  exit /b 1
)
echo.
echo [NEXT] Review WindowChrome.tsx in GitHub Desktop before committing.
pause
exit /b 0
