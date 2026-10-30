param([switch]$Check)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$target = Join-Path $root 'src\store\metadataSlice.ts'
$manifestPath = Join-Path $PSScriptRoot 'lyrics-p0-b21.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not (Test-Path -LiteralPath $target)) { throw 'Missing metadataSlice.ts' }
$old = [IO.File]::ReadAllText($target)
$new = $old
foreach ($pair in @($manifest.'src/store/metadataSlice.ts')) {
  $before = [string]$pair.old
  $after = [string]$pair.new
  if ([string]::IsNullOrWhiteSpace($before)) { throw 'Empty match anchor' }
  $count = ([regex]::Matches($new, [regex]::Escape($before))).Count
  if ($count -ne 1) { throw "[STOP] Expected one unique match, got $count. No source changes made." }
  $new = $new.Replace($before, $after)
}
if ($new -eq $old) { throw 'No changes planned' }
if ($new -notmatch 'lyricSaveQueues' -or $new -match 'lyricManualVersion|manualLyricPaths') { throw 'Postcondition failed' }
Write-Host '[PASS] Batch 2.1 read-only preflight: unique anchors, queue and per-song epochs verified.' -ForegroundColor Green
Write-Host '[SAFE] No files or backups written during preflight.'
if ($Check) { exit 0 }
$answer = Read-Host 'Apply Batch 2.1 to metadataSlice.ts with verified backup? [Y/N]'
if ($answer -ne 'Y') { Write-Host '[SAFE] Cancelled'; exit 0 }
$backupDir = Join-Path (Split-Path $root -Parent) ('Aideo-ZH-LYRICS-P0-B21-PREPATCH-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $backupDir | Out-Null
$backup = Join-Path $backupDir 'metadataSlice.ts'
Copy-Item -LiteralPath $target -Destination $backup
if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $backup -Algorithm SHA256).Hash) { throw 'Backup SHA-256 mismatch. Source unchanged.' }
try {
  [IO.File]::WriteAllText($target, $new, (New-Object System.Text.UTF8Encoding($false)))
  if ([IO.File]::ReadAllText($target) -cne $new) { throw 'Write verification mismatch' }
  Write-Host '[PASS] Batch 2.1 applied; backup SHA-256 verified.' -ForegroundColor Green
  Write-Host "[BACKUP] $backupDir"
  Write-Host '[HOLD] Do not commit or push until TypeScript and race regression tests pass.' -ForegroundColor Yellow
} catch {
  Copy-Item -LiteralPath $backup -Destination $target -Force
  throw
}
