param([switch]$Check)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$target = Join-Path $repo 'src\components\Sidebar.tsx'
$before = 'export function Sidebar({ expanded, onToggleExpansion, onMouseLeave }: { expanded: boolean; onToggleExpansion: () => void; onMouseLeave?: () => void }) {'
$after = 'export function Sidebar({ expanded = true, onToggleExpansion = () => {}, onMouseLeave }: { expanded?: boolean; onToggleExpansion?: () => void; onMouseLeave?: () => void } = {}) {'
function Sha([string]$p) { (Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLowerInvariant() }
try {
  if (!(Test-Path -LiteralPath $target -PathType Leaf)) { throw "Missing source file: $target" }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  $raw = [IO.File]::ReadAllBytes($target)
  $content = [Text.Encoding]::UTF8.GetString($raw)
  $nOld = ([regex]::Matches($content,[regex]::Escape($before))).Count
  $nNew = ([regex]::Matches($content,[regex]::Escape($after))).Count
  if ($nOld -eq 0 -and $nNew -eq 1) { Write-Host '[PASS] Already applied; no source changes.'; exit 0 }
  if ($nOld -ne 1 -or $nNew -ne 0) { throw "Unexpected Sidebar signature. Old=$nOld New=$nNew. Aborting without changes." }
  if ($Check) { Write-Host '[PASS] Read-only preflight: exactly one Sidebar signature will change.'; Write-Host '[SAFE] No files or backup directories written.'; exit 0 }
  $newContent = $content.Replace($before,$after)
  if ($newContent -ceq $content) { throw 'No change produced.' }
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
  $backupDir = Join-Path (Split-Path $repo -Parent) ('Aideo-ZH-V10-S2-TS2739-PREPATCH-' + $stamp)
  New-Item -ItemType Directory -Path $backupDir -ErrorAction Stop | Out-Null
  $backup = Join-Path $backupDir 'Sidebar.tsx'
  [IO.File]::WriteAllBytes($backup,$raw)
  $originalSha = Sha $target
  if ((Sha $backup) -cne $originalSha) { throw 'Backup SHA256 mismatch, source NOT modified.' }
  try {
    # Maintain the original UTF-8 BOM and line endings by editing only an ASCII signature.
    $modified = [Text.Encoding]::UTF8.GetBytes($newContent)
    [IO.File]::WriteAllBytes($target,$modified)
    $verify = [IO.File]::ReadAllText($target)
    if ($verify.IndexOf($after,[StringComparison]::Ordinal) -lt 0 -or $verify.IndexOf($before,[StringComparison]::Ordinal) -ge 0) { throw 'Post-write signature check failed.' }
    Write-Host '[PASS] Sidebar TypeScript compatibility hotfix applied.'
    Write-Host "[PASS] Verified pre-patch backup: $backupDir"
    Write-Host '[INFO] No commit or push. GitHub Actions testing pending.'
  } catch {
    [IO.File]::WriteAllBytes($target,[IO.File]::ReadAllBytes($backup))
    if ((Sha $target) -cne $originalSha) { throw "Rollback verification FAILED; inspect $backup manually. Original error: $_" }
    throw "Patch failed, original restored and hash verified: $_"
  }
} catch {
  Write-Host "[STOP] $_" -ForegroundColor Red
  exit 1
}
