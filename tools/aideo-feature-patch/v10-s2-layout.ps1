param([switch]$Check)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$target = Join-Path $root 'src\App.css'
$payload = Join-Path $PSScriptRoot 'v10-s2-layout.css'
$mark = '/* V10 S2 layout hotfix: expanded labels and full-window overlay. */'
$enc = New-Object System.Text.UTF8Encoding($false)
try {
  if (!(Test-Path -LiteralPath $target) -or !(Test-Path -LiteralPath $payload)) { throw 'Missing App.css or payload.' }
  $original = [System.IO.File]::ReadAllText($target)
  $css = [System.IO.File]::ReadAllText($payload)
  if ($original.Contains($mark)) {
    Write-Host '[PASS] Already applied, no changes needed.' -ForegroundColor Green
    exit 0
  }
  if (!$original.Contains('/* Aideo-ZH V10 Stage 2: three-state sidebar, hidden -> icon rail -> full overlay. */')) { throw 'Expected V10 Stage 2 baseline marker missing.' }
  if (!$original.Contains('.app.sidebar-auto-hidden.sidebar-auto-visible.sidebar-auto-expanded .app-sidebar')) { throw 'Expanded sidebar selector missing.' }
  if ($Check) {
    Write-Host '[PASS] Read-only preflight: one CSS file, known V10 Stage 2 baseline.' -ForegroundColor Green
    Write-Host '[SAFE] Nothing written.'
    exit 0
  }
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
  $backupDir = Join-Path (Split-Path -Parent $root) ('Aideo-ZH-V10-S2-LAYOUT-PREPATCH-' + $stamp)
  New-Item -ItemType Directory -Path $backupDir -ErrorAction Stop | Out-Null
  $backup = Join-Path $backupDir 'App.css'
  Copy-Item -LiteralPath $target -Destination $backup -ErrorAction Stop
  $beforeHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
  if ((Get-FileHash -LiteralPath $backup -Algorithm SHA256).Hash -ne $beforeHash) { throw 'Backup verification failed; source unchanged.' }
  try {
    $next = $original.TrimEnd("`r", "`n") + "`n`n" + $css.TrimEnd("`r", "`n") + "`n"
    [System.IO.File]::WriteAllText($target, $next, $enc)
    $readBack = [System.IO.File]::ReadAllText($target)
    if (!$readBack.Contains($mark) -or !$readBack.Contains('width: 100%;')) { throw 'Post-write verification failed.' }
    Write-Host '[PASS] Layout CSS patch applied.' -ForegroundColor Green
    Write-Host ('[PASS] SHA256-verified prepatch backup: ' + $backupDir) -ForegroundColor Green
  } catch {
    Copy-Item -LiteralPath $backup -Destination $target -Force
    if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne $beforeHash) { throw 'ROLLBACK VERIFICATION FAILED: ' + $_.Exception.Message }
    throw ('Write failed. Original restored and verified. ' + $_.Exception.Message)
  }
} catch {
  Write-Host ('[STOP] ' + $_.Exception.Message) -ForegroundColor Red
  exit 1
}
