@echo off
setlocal
cd /d "%~dp0"
echo [STEP 1] Read-only preflight...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "tools\aideo-feature-patch\window-layout.ps1" -Check
if errorlevel 1 (echo [STOP] Preflight failed.& pause & exit /b 1)
choice /C YN /M "Apply window toolbar/drag-region fix with verified backup"
if errorlevel 2 (echo [SAFE] Cancelled.& exit /b 0)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "tools\aideo-feature-patch\window-layout.ps1"
if errorlevel 1 (echo [STOP] Apply failed.& pause & exit /b 1)
echo [NEXT] Review src/components/NowPlayingView.tsx in GitHub Desktop.
pause
