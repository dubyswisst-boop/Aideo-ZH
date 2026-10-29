#requires -version 5.1
[CmdletBinding()]
param([switch]$Check)
$ErrorActionPreference = 'Stop'
$repo = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$relative = 'src/components/WindowChrome.tsx'
$target = Join-Path $repo 'src\components\WindowChrome.tsx'
$utf8 = New-Object System.Text.UTF8Encoding($false, $true)
$backup = $null
$changed = $false
try {
    if (-not [System.IO.File]::Exists($target)) { throw "Missing source: $relative" }
    $bytes = [System.IO.File]::ReadAllBytes($target)
    $raw = $utf8.GetString($bytes)
    $lineEnding = if ($raw.Contains("`r`n")) { "`r`n" } else { "`n" }
    $text = $raw.Replace("`r`n", "`n")
    $old = '  const appWindow = getCurrentWindow();'
    $new = @{
        'void appWindow.minimize();' = 'void getCurrentWindow().minimize();'
        'void appWindow.toggleMaximize();' = 'void getCurrentWindow().toggleMaximize();'
        'void appWindow.close();' = 'void getCurrentWindow().close();'
    }
    $complete = ($text.IndexOf($old, [System.StringComparison]::Ordinal) -lt 0)
    foreach ($k in $new.Keys) { if ($text.IndexOf($new[$k], [System.StringComparison]::Ordinal) -lt 0) { $complete = $false } }
    if ($complete) {
        if ($text.Contains('void appWindow.')) { throw 'Mixed old and new WindowChrome handlers; refusing to proceed.' }
        Write-Host '[PASS] V9 is already applied. No files written; no backup created.' -ForegroundColor Green
        exit 0
    }
    if (([regex]::Matches($text,[regex]::Escape($old))).Count -ne 1) { throw 'Expected exactly one eager getCurrentWindow declaration. Source has changed.' }
    foreach ($k in $new.Keys) {
        if (([regex]::Matches($text,[regex]::Escape($k))).Count -ne 1) { throw "Expected exactly one handler: $k" }
        if ($text.Contains($new[$k])) { throw 'Mixed patch state detected.' }
    }
    $patched = $text.Replace($old+"`n", '')
    if ($patched -ceq $text) { throw 'Could not remove eager getCurrentWindow declaration.' }
    foreach ($k in $new.Keys) { $patched = $patched.Replace($k,$new[$k]) }
    if ($patched.Contains('void appWindow.') -or $patched.Contains($old)) { throw 'Patch postcondition failed.' }
    if ($lineEnding -eq "`r`n") { $patched = $patched.Replace("`n", "`r`n") }
    # A true check never creates directories, changes files, or touches the repository.
    if ($Check) {
        Write-Host '[PASS] V9 preflight: exactly one source file needs patching.' -ForegroundColor Green
        Write-Host '[SAFE] No repository source files or backup directories written.' -ForegroundColor Cyan
        exit 0
    }
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    $backup = Join-Path (Split-Path $repo -Parent) ('Aideo-ZH-V9-PREPATCH-' + $stamp)
    if ([System.IO.Directory]::Exists($backup)) { throw 'Backup folder collision.' }
    $backupFile = Join-Path $backup 'src\components\WindowChrome.tsx'
    [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($backupFile)) | Out-Null
    [System.IO.File]::WriteAllBytes($backupFile, $bytes)
    $originalHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
    $backupHash = (Get-FileHash -LiteralPath $backupFile -Algorithm SHA256).Hash
    if ($originalHash -cne $backupHash) { throw 'Backup SHA256 mismatch. No source change attempted.' }
    $changed = $true
    [System.IO.File]::WriteAllText($target, $patched, $utf8)
    $writtenText = [System.IO.File]::ReadAllText($target, $utf8)
    if ($writtenText -cne $patched) { throw 'On-disk verification failed.' }
    Write-Host '[PASS] V9 applied: deferred Tauri window lookup to button handlers.' -ForegroundColor Green
    Write-Host "[PASS] Verified pre-patch backup: $backup" -ForegroundColor Green
    Write-Host '[INFO] No Git commit, push, workflow changes, or updater-test edits.'
    exit 0
} catch {
    Write-Host "[STOP] $($_.Exception.Message)" -ForegroundColor Red
    if ($changed -and $backup -and [System.IO.File]::Exists((Join-Path $backup 'src\components\WindowChrome.tsx'))) {
        try {
            [System.IO.File]::Copy((Join-Path $backup 'src\components\WindowChrome.tsx'),$target,$true)
            $restoredHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
            $backupHashAfterRestore = (Get-FileHash -LiteralPath (Join-Path $backup 'src\components\WindowChrome.tsx') -Algorithm SHA256).Hash
            if ($restoredHash -cne $backupHashAfterRestore) { throw 'Restore SHA256 mismatch.' }
            Write-Host '[SAFE] Restored original file; SHA256 matches backup.' -ForegroundColor Yellow
        } catch { Write-Host '[CRITICAL] Automatic restore failed. Restore manually from backup.' -ForegroundColor Red }
    }
    exit 1
}
