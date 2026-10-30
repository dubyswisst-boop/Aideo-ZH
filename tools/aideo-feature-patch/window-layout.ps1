param([switch]$Check)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$relative = 'src\components\NowPlayingView.tsx'
$target = Join-Path $repo $relative
if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { throw "Missing file: $target" }
$original = [IO.File]::ReadAllText($target, [Text.Encoding]::UTF8)
# Exact scoped strings; no global CSS or window configuration changes.
$changes = @(
  @{ old = '<div className="np-left" style={{ position: ''relative'' }}>'; new = '<div className="np-left" data-tauri-drag-region style={{ position: ''relative'' }}>' },
  @{ old = "          top: 24,`n          left: 24,`n          display: 'flex',`n          gap: 10,`n          zIndex: 100"; new = "          top: 48,`n          left: 24,`n          display: 'flex',`n          gap: 10,`n          zIndex: 100" }
)
# Normalize CRLF for preflight only, preserve original newline style on write.
$normalized = $original.Replace("`r`n", "`n")
$newText = $normalized
foreach ($change in $changes) {
  $needle = [string]$change.old
  $replacement = [string]$change.new
  $count = ([regex]::Matches($newText, [regex]::Escape($needle))).Count
  if ($count -ne 1) { throw "[STOP] Expected exactly one source match, got $count : $($needle.Substring(0,[Math]::Min(55,$needle.Length)))" }
  $newText = $newText.Replace($needle, $replacement)
}
Write-Host '[PASS] Scope: NowPlayingView.tsx, 2 exact edits.' -ForegroundColor Green
if ($Check) { Write-Host '[SAFE] Read-only preflight completed. No files written.'; exit 0 }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$backupFolder = Join-Path (Split-Path $repo -Parent) "Aideo-ZH-WINDOW-LAYOUT-PREPATCH-$stamp"
New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
$backupPath = Join-Path $backupFolder 'NowPlayingView.tsx'
[IO.File]::Copy($target, $backupPath)
if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash) { throw 'Backup hash mismatch; original unchanged' }
try {
  $newline = if ($original.Contains("`r`n")) { "`r`n" } else { "`n" }
  $output = $newText.Replace("`n", $newline)
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [IO.File]::WriteAllText($target, $output, $utf8)
  $verify = [IO.File]::ReadAllText($target,[Text.Encoding]::UTF8)
  foreach ($change in $changes) { if (-not $verify.Contains([string]$change.new)) { throw 'Post-write verification failed' } }
  Write-Host '[PASS] Window toolbar and safe drag background updated.' -ForegroundColor Green
  Write-Host "[BACKUP] $backupFolder"
  Write-Host '[PENDING] CI and Tauri runtime validation required.'
} catch {
  [IO.File]::Copy($backupPath, $target, $true)
  throw
}
