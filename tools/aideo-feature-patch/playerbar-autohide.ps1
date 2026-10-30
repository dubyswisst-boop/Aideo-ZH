param([switch]$Check)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$appPath = Join-Path $root 'src\App.tsx'
$cssPath = Join-Path $root 'src\App.css'
$utf8 = New-Object System.Text.UTF8Encoding($false)
function ReadUtf8([string]$path) { return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8) }
function ReplaceOnce([string]$value, [string]$old, [string]$new, [string]$file) {
  $count = ([regex]::Matches($value, [regex]::Escape($old))).Count
  if ($count -ne 1) { throw "$file expected exactly one anchor, found $count" }
  return $value.Replace($old,$new)
}
$app=ReadUtf8 $appPath; $css=ReadUtf8 $cssPath
$old1='  const [sidebarAutoVisible, setSidebarAutoVisible] = useState(false);'
$new1=@'
  const [playerBarRevealed, setPlayerBarRevealed] = useState(false);
  // The main view already uses a full-height overlay; the player bar floats over it.
  const playerBarHeight = playerBarDesign === 'minimal' ? 54 : playerBarDesign === 'waveform' ? 104 : playerBarDesign === 'floating' ? 90 : playerBarDesign === 'vinyl' ? 96 : 96;
  const handlePlayerBarPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (view !== 'nowplaying') return;
    const distanceFromBottom = event.currentTarget.getBoundingClientRect().bottom - event.clientY;
    if (distanceFromBottom <= 12) setPlayerBarRevealed(true);
    else if (distanceFromBottom > playerBarHeight + 12) setPlayerBarRevealed(false);
  };
  const [sidebarAutoVisible, setSidebarAutoVisible] = useState(false);
'@
$old2='${view === "fullscreen" ? "theater-active" : ""}'
$new2='${view === "fullscreen" ? "theater-active" : ""} ${view === "nowplaying" ? "nowplaying-playerbar-autohide" : ""} ${playerBarRevealed ? "playerbar-revealed" : ""}'
$old3='<div className={`${lowSpecMode ? "app low-spec" : "app"}'
$new3='<div onPointerMove={handlePlayerBarPointerMove} onPointerLeave={() => setPlayerBarRevealed(false)} className={`${lowSpecMode ? "app low-spec" : "app"}'
$appNew=ReplaceOnce $app $old1 $new1 'App.tsx state'
$appNew=ReplaceOnce $appNew $old2 $new2 'App.tsx classes'
$appNew=ReplaceOnce $appNew $old3 $new3 'App.tsx pointer handler'
$marker='/* V10 NOWPLAYING PLAYERBAR AUTOHIDE - managed by playerbar-autohide.ps1 */'
if ($css.Contains($marker)) { throw 'App.css already contains playerbar autohide patch' }
$cssAppend=@'

/* V10 NOWPLAYING PLAYERBAR AUTOHIDE - managed by playerbar-autohide.ps1 */
/* Only Now Playing: main content stays full height and the player bar is an overlay. */
.app.nowplaying-playerbar-autohide .player-bar {
  position: absolute !important;
  left: 0;
  right: 0;
  bottom: 0;
  grid-column: 1 / -1;
  grid-row: auto;
  width: 100%;
  transform: translateY(calc(100% - 6px));
  opacity: 1;
  transition: transform 200ms ease;
  z-index: 2000;
}
.app.nowplaying-playerbar-autohide.playerbar-revealed .player-bar,
.app.nowplaying-playerbar-autohide .player-bar:focus-within {
  transform: translateY(0);
}
/* Prevent clipped content from changing height between hidden and shown states. */
.app.nowplaying-playerbar-autohide .nowplaying {
  padding-bottom: 0;
}
@media (prefers-reduced-motion: reduce) {
  .app.nowplaying-playerbar-autohide .player-bar { transition: none; }
}
'@
$cssNew=$css + $cssAppend
Write-Host '[PASS] Read-only preflight: App.tsx 3 unique anchors, App.css patch absent.' -ForegroundColor Green
if ($Check) { Write-Host '[SAFE] No files written.'; exit 0 }
$answer=Read-Host 'Apply two-file playerbar patch with SHA256 verified backup? [Y/N]'
if ($answer -notmatch '^[yY]$') { Write-Host '[SAFE] Cancelled'; exit 0 }
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$backup=Join-Path (Split-Path $root -Parent) "Aideo-ZH-PLAYERBAR-PREPATCH-$stamp"
New-Item -ItemType Directory -Path $backup | Out-Null
try {
  foreach ($relative in @('src\App.tsx','src\App.css')) {
    $source=Join-Path $root $relative
    $dest=Join-Path $backup ($relative -replace '[\\/]','__')
    Copy-Item -LiteralPath $source -Destination $dest
    if ((Get-FileHash $source -Algorithm SHA256).Hash -ne (Get-FileHash $dest -Algorithm SHA256).Hash) { throw "Backup mismatch: $relative" }
  }
  [System.IO.File]::WriteAllText($appPath,$appNew,$utf8)
  [System.IO.File]::WriteAllText($cssPath,$cssNew,$utf8)
  if ((ReadUtf8 $appPath) -ne $appNew -or (ReadUtf8 $cssPath) -ne $cssNew) { throw 'Write-back verification failed' }
  Write-Host '[PASS] Playerbar patch applied and verified.' -ForegroundColor Green
  Write-Host "[PASS] Original SHA256 backups: $backup"
  Write-Host '[HOLD] Source patch only; CI and native runtime not yet validated.'
} catch {
  foreach ($relative in @('src\App.tsx','src\App.css')) {
    $source=Join-Path $root $relative
    $dest=Join-Path $backup ($relative -replace '[\\/]','__')
    if (Test-Path -LiteralPath $dest) { Copy-Item -LiteralPath $dest -Destination $source -Force }
  }
  throw
}
