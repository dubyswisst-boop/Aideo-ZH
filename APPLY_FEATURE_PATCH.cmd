@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo.
echo ===============================================
echo    Aideo-ZH V8 PowerShell Patch (NO NODE NEEDED)
echo ===============================================
echo.
if not exist "tools\aideo-feature-patch\apply.ps1" (
  echo [ERROR] Missing tools\aideo-feature-patch\apply.ps1
  echo Please extract the entire V8 ZIP to the repository root.
  pause
  exit /b 1
)
echo [STEP 1] Checking repository patches without modifying source files...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\aideo-feature-patch\apply.ps1" -Check
if errorlevel 1 (
  echo.
  echo [STOP] Preflight failed. No repository source files were modified.
  pause
  exit /b 1
)
echo.
echo [STEP 2] Apply changes and back up affected files?
choice /C YN /M "Apply Aideo feature patch"
if errorlevel 2 (
  echo [SAFE] Cancelled. No repository source files were modified.
  exit /b 0
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\aideo-feature-patch\apply.ps1"
if errorlevel 1 (
  echo [ERROR] Patch failed. See the message above.
  pause
  exit /b 1
)
echo.
echo [PASS] Review all changes in GitHub Desktop before committing.
pause
