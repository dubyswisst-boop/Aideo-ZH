param([switch]$Check)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$target = Join-Path $root 'src-tauri\capabilities\default.json'
if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { throw "Missing capability file: $target" }
$original = [IO.File]::ReadAllText($target)
# Check with JSON parser, but modify only a precisely targeted literal entry.
$json = $original | ConvertFrom-Json
$permissions = @($json.permissions)
$required = 'core:window:allow-toggle-maximize'
if ($permissions -contains $required) { Write-Host '[STOP] Permission already present; no change needed.'; exit 1 }
$anchor = '"core:window:allow-unmaximize",'
$count = ([regex]::Matches($original, [regex]::Escape($anchor))).Count
if ($count -ne 1) { throw "Expected exactly one anchor, got $count" }
if ($permissions -notcontains 'core:window:allow-maximize' -or $permissions -notcontains 'core:window:allow-unmaximize') { throw 'Baseline window permissions mismatch' }
$updated = $original.Replace($anchor, ($anchor + "`n    `"core:window:allow-toggle-maximize`","))
$parsed = $updated | ConvertFrom-Json
if (@($parsed.permissions) -notcontains $required) { throw 'JSON permission validation failed' }
$normalizedCurrent = $original.Replace("`r`n", "`n")
$normalizedNew = $updated.Replace("`r`n", "`n")
if ($normalizedCurrent -eq $normalizedNew) { throw 'No diff' }
if ($Check) { Write-Host '[PASS] Read-only preflight: one capability entry will be added.'; Write-Host '[SAFE] No files written.'; exit 0 }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$backupDir = Join-Path (Split-Path -Parent $root) ('Aideo-ZH-WINDOW-PERMISSION-PREPATCH-' + $stamp)
New-Item -ItemType Directory -Path $backupDir -ErrorAction Stop | Out-Null
$backup = Join-Path $backupDir 'default.json'
Copy-Item -LiteralPath $target -Destination $backup -ErrorAction Stop
$srcHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
$bakHash = (Get-FileHash -LiteralPath $backup -Algorithm SHA256).Hash
if ($srcHash -ne $bakHash) { throw 'Backup SHA256 mismatch' }
try {
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [IO.File]::WriteAllText($target, $updated, $encoding)
  $verified = Get-Content -LiteralPath $target -Raw -Encoding UTF8 | ConvertFrom-Json
  if (@($verified.permissions) -notcontains $required) { throw 'Post-write JSON validation failed' }
  Write-Host '[PASS] Tauri allow-toggle-maximize permission added.'
  Write-Host "[PASS] Backup SHA256 verified: $backup"
} catch {
  Copy-Item -LiteralPath $backup -Destination $target -Force
  throw
}
