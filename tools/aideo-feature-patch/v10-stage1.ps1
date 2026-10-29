#requires -version 5.1
[CmdletBinding()]
param([switch]$Check)
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$cssPath = Join-Path $repo 'src\App.css'
$patchPath = Join-Path $PSScriptRoot 'v10-rail.css'
$marker = '/* Aideo-ZH V10 Stage 1: compact icon rail and floating expansion.'
$utf8 = New-Object System.Text.UTF8Encoding($false, $true)
$backup = $null
$changed = $false
try {
  if (-not [IO.File]::Exists($cssPath)) { throw 'Missing src/App.css' }
  if (-not [IO.File]::Exists($patchPath)) { throw 'Missing V10 CSS patch resource' }
  $original = [IO.File]::ReadAllBytes($cssPath)
  $source = $utf8.GetString($original)
  $fragment = [IO.File]::ReadAllText($patchPath, $utf8)
  if ($source.Contains($marker)) {
    if (-not $source.Contains('z-index: 2401;')) { throw 'Partial V10 CSS found. Refusing to proceed.' }
    Write-Host '[PASS] V10 Stage 1 already present. No changes.' -ForegroundColor Green
    exit 0
  }
  if (-not $source.Contains('.app.sidebar-auto-hidden .app-sidebar')) { throw 'Unexpected App.css; refusing to patch.' }
  if (-not $source.Contains('.sidebar-hover-zone')) { throw 'Sidebar hover anchor missing.' }
  $eol = if ($source.Contains("`r`n")) { "`r`n" } else { "`n" }
  $output = $source.TrimEnd("`r","`n") + $eol + $eol + $fragment.Replace("`r`n", "`n").Replace("`n",$eol)
  if ($Check) {
    Write-Host '[PASS] V10 Stage 1 read-only preflight.' -ForegroundColor Green
    Write-Host '[SAFE] No repository files or backups written.'
    exit 0
  }
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
  $backup = Join-Path (Split-Path $repo -Parent) ('Aideo-ZH-V10-S1-PREPATCH-' + $stamp)
  $copy = Join-Path $backup 'src\App.css'
  if ([IO.Directory]::Exists($backup)) { throw 'Backup name collision.' }
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($copy)) | Out-Null
  [IO.File]::WriteAllBytes($copy,$original)
  $hashOriginal = (Get-FileHash -LiteralPath $cssPath -Algorithm SHA256).Hash
  $hashBackup = (Get-FileHash -LiteralPath $copy -Algorithm SHA256).Hash
  if ($hashOriginal -cne $hashBackup) { throw 'Backup verification failed.' }
  $changed = $true
  [IO.File]::WriteAllText($cssPath,$output,$utf8)
  if ([IO.File]::ReadAllText($cssPath,$utf8) -cne $output) { throw 'Write verification failed.' }
  Write-Host '[PASS] V10 Stage 1 compact rail CSS applied.' -ForegroundColor Green
  Write-Host "[PASS] Verified backup: $backup"
  Write-Host '[INFO] Stage 1 only: lyrics, maximizing, drag regions and bottom player bar are NOT changed.'
  exit 0
} catch {
  Write-Host "[STOP] $($_.Exception.Message)" -ForegroundColor Red
  if ($changed -and $backup) {
    try {
      $copy = Join-Path $backup 'src\App.css'
      [IO.File]::Copy($copy,$cssPath,$true)
      if ((Get-FileHash $copy -Algorithm SHA256).Hash -cne (Get-FileHash $cssPath -Algorithm SHA256).Hash) { throw 'Rollback hash mismatch.' }
      Write-Host '[SAFE] Restored original CSS and verified SHA256.'
    } catch { Write-Host "[CRITICAL] Rollback failed: $_" -ForegroundColor Red }
  }
  exit 1
}
