param([switch]$Check)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$target=Join-Path $root '.github\workflows\aideo-zh-ui-preview.yml'
if (!(Test-Path -LiteralPath $target -PathType Leaf)) {throw '[STOP] Workflow not found.'}
$raw=[System.IO.File]::ReadAllText($target)
$old='runs-on: ubuntu-latest'
$new='runs-on: ubuntu-24.04'
$count=[regex]::Matches($raw,[regex]::Escape($old)).Count
if ($count -ne 1) {throw "[STOP] Expected exactly one ubuntu-latest runner, found $count. No change."}
if ($Check) {Write-Host '[PASS] Read-only preflight: exactly one runner will change; no disk writes.';exit 0}
$backup=Join-Path (Split-Path -Parent $root) ('Aideo-ZH-UI-RUNNER-PREPATCH-'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
$bfile=Join-Path $backup 'aideo-zh-ui-preview.yml'
Copy-Item -LiteralPath $target -Destination $bfile
$before=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
$copied=(Get-FileHash -LiteralPath $bfile -Algorithm SHA256).Hash
if ($before -ne $copied) {throw '[STOP] Backup verification failed.'}
$updated=$raw.Replace($old,$new)
try {
  $encoding=New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($target,$updated,$encoding)
  $after=[System.IO.File]::ReadAllText($target)
  if (([regex]::Matches($after,[regex]::Escape($new)).Count -ne 1) -or $after.Contains($old)) {throw 'Post-write verification failed'}
  Write-Host '[PASS] Changed ubuntu-latest to ubuntu-24.04.'
  Write-Host "[PASS] Verified backup: $backup"
  Write-Host '[INFO] GitHub Actions execution still pending.'
} catch {Copy-Item -LiteralPath $bfile -Destination $target -Force;throw}
