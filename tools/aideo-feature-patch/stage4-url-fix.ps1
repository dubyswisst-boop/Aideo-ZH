param([switch]$Check)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$target = Join-Path $root 'src\test\sidebarAppWiring.test.ts'
if (!(Test-Path -LiteralPath $target)) { throw "[STOP] Missing target: $target" }
$old = [System.IO.File]::ReadAllText($target)
$replacements = @(
  @{Old="import { readFileSync } from 'node:fs';"; New="import { readFileSync } from 'node:fs';`nimport { resolve } from 'node:path';"},
  @{Old="readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')"; New="readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')"},
  @{Old="readFileSync(new URL('../App.css', import.meta.url), 'utf8')"; New="readFileSync(resolve(process.cwd(), 'src/App.css'), 'utf8')"}
)
foreach ($pair in $replacements) {
 $count = ([regex]::Matches($old, [regex]::Escape($pair.Old))).Count
 if ($count -ne 1) { throw "[STOP] Expected one exact match for $($pair.Old), found $count" }
}
Write-Host '[PASS] Read-only preflight: 3 exact substitutions, 1 target file.' -ForegroundColor Green
if ($Check) { Write-Host '[SAFE] Check mode: no changes made.'; exit 0 }
$answer = Read-Host 'Apply Stage 4 one-file fix with verified backup? [Y/N]'
if ($answer -ne 'Y') { Write-Host '[SAFE] Cancelled'; exit 0 }
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$backup=Join-Path $root ("STAGE4-URL-PREPATCH-"+$stamp)
New-Item -ItemType Directory -Path $backup -Force | Out-Null
$backupFile=Join-Path $backup 'sidebarAppWiring.test.ts'
Copy-Item -LiteralPath $target -Destination $backupFile
$h1=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
$h2=(Get-FileHash -LiteralPath $backupFile -Algorithm SHA256).Hash
if($h1 -ne $h2){throw '[STOP] Backup hash mismatch'}
$newText=$old
foreach($pair in $replacements){$newText=$newText.Replace($pair.Old,$pair.New)}
try {
 [System.IO.File]::WriteAllText($target,$newText,[System.Text.UTF8Encoding]::new($false))
 $verify=[System.IO.File]::ReadAllText($target)
 foreach($pair in $replacements){if(!$verify.Contains($pair.New)){throw "Verification failed: $($pair.New)"}}
 Write-Host '[PASS] Stage 4 file URL fix applied and verified.' -ForegroundColor Green
 Write-Host "[PASS] Original SHA256 verified backup: $backupFile"
 Write-Host '[INFO] GitHub Actions tests still pending.'
} catch {Copy-Item -LiteralPath $backupFile -Destination $target -Force; throw}
