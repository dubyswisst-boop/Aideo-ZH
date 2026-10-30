param([switch]$Check)
$ErrorActionPreference='Stop'
$root=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$target=Join-Path $root 'src\components\LyricsPanel.tsx'
$manifestPath=Join-Path $PSScriptRoot 'lyrics-zh-copy.json'
if (!(Test-Path -LiteralPath $target) -or !(Test-Path -LiteralPath $manifestPath)) {throw 'Missing source or patch manifest.'}
$manifest=Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$utf8=New-Object System.Text.UTF8Encoding($false)
$before=[System.IO.File]::ReadAllText($target,[System.Text.Encoding]::UTF8)
$normalized=$before.Replace("`r`n","`n")
$bytes=$utf8.GetBytes($normalized)
$sha=[System.Security.Cryptography.SHA256]::Create()
try { $currentHash=([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
if ($currentHash -ne $manifest.base_sha256) {throw ('Baseline SHA256 mismatch. Expected '+$manifest.base_sha256+' actual '+$currentHash+'. No changes made.')}
$after=$normalized
foreach($entry in $manifest.replacements) {
    $found=([regex]::Matches($after,[regex]::Escape([string]$entry.old))).Count
    if($found -ne [int]$entry.count) {throw ('Unexpected occurrence count ('+$found+' vs '+$entry.count+') for: '+$entry.old)}
    $after=$after.Replace([string]$entry.old,[string]$entry.new)
}
if ($after -eq $before) {throw 'No replacement performed.'}
Write-Host '[PASS] Read-only preflight: baseline SHA256 and all UI-copy anchors match.' -ForegroundColor Green
if ($Check) {Write-Host '[SAFE] No writes performed.';exit 0}
$choice=Read-Host 'Apply one-file Chinese UI-copy patch with backup? [Y/N]'
if ($choice -ne 'Y' -and $choice -ne 'y') {Write-Host '[SAFE] Cancelled.';exit 0}
$backupDir=Join-Path (Split-Path $root -Parent) ('Aideo-ZH-LYRICS-ZH-PREPATCH-'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$backupFile=Join-Path $backupDir 'LyricsPanel.tsx'
Copy-Item -LiteralPath $target -Destination $backupFile -ErrorAction Stop
if((Get-FileHash $backupFile -Algorithm SHA256).Hash -ne (Get-FileHash $target -Algorithm SHA256).Hash){throw 'Backup SHA256 mismatch; source unchanged.'}
try {
    [System.IO.File]::WriteAllText($target,$after,$utf8)
    $readback=[System.IO.File]::ReadAllText($target,[System.Text.Encoding]::UTF8)
    if($readback -cne $after){throw 'Write verification mismatch'}
    Write-Host '[PASS] LyricsPanel Chinese UI copy applied; verified readback.' -ForegroundColor Green
    Write-Host ('[PASS] Verified original backup: '+$backupDir)
    Write-Host '[HOLD] Review Git diff and run CI before committing.'
} catch {
    Copy-Item -LiteralPath $backupFile -Destination $target -Force
    throw
}
