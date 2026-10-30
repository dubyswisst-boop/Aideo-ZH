param([switch]$Check)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$manifestPath = Join-Path $PSScriptRoot 'lyrics-p0-b22.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$pending = @()
foreach ($relative in @('src/store/metadataSlice.ts','src/store/types.ts')) {
  $target = Join-Path $root ($relative.Replace('/','\'))
  if (-not (Test-Path -LiteralPath $target)) { throw "Missing target: $relative" }
  $old = [IO.File]::ReadAllText($target)
  $newline = if ($old.Contains("`r`n")) { "`r`n" } else { "`n" }
  $new = $old.Replace("`r`n", "`n")
  foreach ($pair in @($manifest.$relative)) {
    $before = [string]$pair.old
    $after = [string]$pair.new
    if ([string]::IsNullOrEmpty($before)) { throw 'Empty match anchor' }
    $count = ([regex]::Matches($new,[regex]::Escape($before))).Count
    if ($count -ne 1) { throw "[STOP] $relative expected exactly one match, got $count. No source writes." }
    $new = $new.Replace($before,$after)
  }
  if ($new -eq $old.Replace("`r`n", "`n")) { throw "No change in $relative" }
  $new = $new.Replace("`n",$newline)
  $pending += [pscustomobject]@{ Relative=$relative; Target=$target; Old=$old; New=$new }
}
Write-Host '[PASS] Batch 2.2 read-only preflight: unique anchors in two files.' -ForegroundColor Green
Write-Host '[SAFE] No source files or backups written during preflight.'
if ($Check) { exit 0 }
$answer = Read-Host 'Apply Batch 2.2 with verified backup? [Y/N]'
if ($answer -ne 'Y') { Write-Host '[SAFE] Cancelled'; exit 0 }
$backupDir = Join-Path (Split-Path $root -Parent) ('Aideo-ZH-LYRICS-P0-B22-PREPATCH-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $backupDir | Out-Null
foreach ($item in $pending) {
  $backup = Join-Path $backupDir ([IO.Path]::GetFileName($item.Target))
  Copy-Item -LiteralPath $item.Target -Destination $backup
  if ((Get-FileHash $item.Target -Algorithm SHA256).Hash -ne (Get-FileHash $backup -Algorithm SHA256).Hash) { throw 'Backup hash mismatch. Sources unchanged.' }
}
try {
  foreach ($item in $pending) {
    [IO.File]::WriteAllText($item.Target,$item.New,(New-Object System.Text.UTF8Encoding($false)))
    if ([IO.File]::ReadAllText($item.Target) -cne $item.New) { throw "Write verification failed: $($item.Relative)" }
  }
  Write-Host '[PASS] Batch 2.2 applied and verified.' -ForegroundColor Green
  Write-Host "[BACKUP] $backupDir"
  Write-Host '[HOLD] Do not commit/push. Tests and compile pending.' -ForegroundColor Yellow
} catch {
  foreach ($item in $pending) { Copy-Item -LiteralPath (Join-Path $backupDir ([IO.Path]::GetFileName($item.Target))) -Destination $item.Target -Force }
  throw
}
