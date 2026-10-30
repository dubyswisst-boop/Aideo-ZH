param([switch]$Check)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$file = Join-Path $repo 'src\store\metadataSlice.ts'
if (-not (Test-Path -LiteralPath $file)) { throw "Missing $file" }
$utf8 = New-Object System.Text.UTF8Encoding($false)
$raw = [System.IO.File]::ReadAllText($file, $utf8)
$old = @'
      const currentTrack = get().currentTrack;
      const playbackCurrent = get().playback.current_track;
      // Dual-key caching: also cache under playback.current_track if distinct so DesktopLyricBar matches immediately
      if (playbackCurrent && !pathsEqual(playbackCurrent, path)) {
        await invoke('save_lyrics_file', { path: playbackCurrent, content: lrc }).catch(() => {});
      }
      if (currentTrack?.path && !pathsEqual(currentTrack.path, path)) {
        await invoke('save_lyrics_file', { path: currentTrack.path, content: lrc }).catch(() => {});
      }
      const lines: any = await invoke('get_lyrics', { path });
      const trackUrl = (currentTrack as any)?.url;
'@
$new = @'
      // Save only to the explicitly requested track. Never copy a delayed result
      // into whichever song happens to be playing when this await resumes.
      const lines: any = await invoke('get_lyrics', { path });
      const currentTrack = get().currentTrack;
      const playbackCurrent = get().playback.current_track;
      const trackUrl = (currentTrack as any)?.url;
'@
$normalized = $raw.Replace("`r`n", "`n")
$count = ([regex]::Matches($normalized, [regex]::Escape($old))).Count
if ($count -ne 1) { throw "[STOP] Expected exactly one source block, found $count. No changes made." }
Write-Host '[PASS] Exact source block found once.' -ForegroundColor Green
if ($Check) { Write-Host '[SAFE] Read-only preflight. No writes.'; exit 0 }
$answer = Read-Host 'Apply one-file lyrics save-scope fix with verified backup? [Y/N]'
if ($answer -notin @('Y','y')) { Write-Host '[SAFE] Cancelled.'; exit 0 }
$backupDir = Join-Path (Split-Path $repo -Parent) ('Aideo-ZH-LYRICS-P0-PREPATCH-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $backupDir -ErrorAction Stop | Out-Null
$backup = Join-Path $backupDir 'metadataSlice.ts'
Copy-Item -LiteralPath $file -Destination $backup -ErrorAction Stop
$beforeHash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
$backupHash = (Get-FileHash -LiteralPath $backup -Algorithm SHA256).Hash
if ($beforeHash -ne $backupHash) { throw '[STOP] Backup SHA256 mismatch; source unchanged.' }
$updated = $normalized.Replace($old, $new)
if ($raw.Contains("`r`n")) { $updated = $updated.Replace("`n", "`r`n") }
try {
  [System.IO.File]::WriteAllText($file, $updated, $utf8)
  $verify = [System.IO.File]::ReadAllText($file, $utf8)
  if (-not $verify.Contains('Never copy a delayed result')) { throw 'Post-write verification failed' }
  Write-Host '[PASS] Lyrics save-scope fix applied.' -ForegroundColor Green
  Write-Host "[PASS] Verified backup: $backup"
  Write-Host '[NEXT] Review src/store/metadataSlice.ts in GitHub Desktop; CI/runtime validation pending.'
} catch {
  Copy-Item -LiteralPath $backup -Destination $file -Force
  throw
}
