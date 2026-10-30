param([switch]$Check)
$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$files=@('src\App.tsx','src\components\Sidebar.tsx','src\App.css')
function ReadUtf8($path) { [IO.File]::ReadAllText($path,[Text.Encoding]::UTF8) }
function ReplaceOnce([string]$inputText,[string]$old,[string]$new,[string]$description) {
  $count=[regex]::Matches($inputText,[regex]::Escape($old)).Count
  if($count -ne 1){ throw "Expected exactly one '$description' anchor, found $count" }
  return $inputText.Replace($old,$new)
}
$original=@{}; $modified=@{}
foreach($rel in $files){$path=Join-Path $repo $rel;if(!(Test-Path -LiteralPath $path)){throw "Missing $rel"};$original[$rel]=ReadUtf8 $path;$modified[$rel]=$original[$rel]}
$a='src\App.tsx';$s=$modified[$a]
$s=ReplaceOnce $s 'const [sidebarAutoVisible, setSidebarAutoVisible] = useState(false);' 'const [sidebarAutoVisible, setSidebarAutoVisible] = useState(false);`n  const [sidebarExpanded, setSidebarExpanded] = useState(false);'.Replace('`n',"`n") 'app sidebar state'
$s=ReplaceOnce $s '${sidebarAutoVisible ? "sidebar-auto-visible" : ""} ${view === "fullscreen"' '${sidebarAutoVisible ? "sidebar-auto-visible" : ""} ${sidebarExpanded ? "sidebar-auto-expanded" : ""} ${view === "fullscreen"' 'app classes'
$s=ReplaceOnce $s '<Sidebar onMouseLeave={() => setSidebarAutoVisible(false)} />' '<Sidebar expanded={sidebarExpanded} onToggleExpansion={() => setSidebarExpanded(value => !value)} onMouseLeave={() => { setSidebarAutoVisible(false); setSidebarExpanded(false); }} />' 'sidebar props'
$modified[$a]=$s
$a='src\components\Sidebar.tsx';$s=$modified[$a]
$s=ReplaceOnce $s 'export function Sidebar({ onMouseLeave }: { onMouseLeave?: () => void } = {}) {' 'export function Sidebar({ expanded, onToggleExpansion, onMouseLeave }: { expanded: boolean; onToggleExpansion: () => void; onMouseLeave?: () => void }) {' 'sidebar signature'
$s=ReplaceOnce $s '  const { t } = useTranslation();' '  const { t } = useTranslation();`n  const sidebarCollapsed = !expanded;'.Replace('`n',"`n") 'sidebar collapsed local'
$s=ReplaceOnce $s '    sidebarCollapsed,`n    toggleSidebarCollapsed,`n'.Replace('`n',"`n") '' 'sidebar destructure'
$s=ReplaceOnce $s '    sidebarCollapsed: s.sidebarCollapsed,`n    toggleSidebarCollapsed: s.toggleSidebarCollapsed,`n'.Replace('`n',"`n") '' 'sidebar selector'
$s=ReplaceOnce $s 'onClick={toggleSidebarCollapsed}' 'onClick={onToggleExpansion}' 'sidebar toggle'
$modified[$a]=$s
$a='src\App.css';$s=$modified[$a]
$marker='/* Aideo-ZH V10 Stage 2: three-state sidebar, hidden -> icon rail -> full overlay. */'
if($s.Contains($marker)){throw 'V10 Stage 2 CSS already exists; abort to avoid duplication'}
$css= @'

/* Aideo-ZH V10 Stage 2: three-state sidebar, hidden -> icon rail -> full overlay. */
.app.sidebar-auto-hidden { grid-template-columns: 0 minmax(0, 1fr) !important; }
.app.sidebar-auto-hidden .app-sidebar {
  left: 0; top: 34px; bottom: var(--player-h, 96px); height: auto;
  width: 50px; max-width: none; transform: translateX(-110%);
  opacity: 0; visibility: hidden; pointer-events: none;
  z-index: 2601; overflow: hidden; box-sizing: border-box;
  transition: width 180ms ease, transform 180ms ease, opacity 180ms ease, visibility 180ms ease;
}
.app.sidebar-auto-hidden.sidebar-auto-visible .app-sidebar {
  width: 50px; transform: translateX(0); opacity: 1; visibility: visible;
  pointer-events: auto; overflow: hidden;
}
.app.sidebar-auto-hidden.sidebar-auto-visible.sidebar-auto-expanded .app-sidebar {
  width: min(270px, 85vw); max-width: 85vw;
  overflow-x: hidden; overflow-y: auto;
  box-shadow: 14px 0 40px rgba(0,0,0,.55);
}
.app.sidebar-auto-hidden:not(.sidebar-auto-expanded) .app-sidebar .sidebar-logo-name,
.app.sidebar-auto-hidden:not(.sidebar-auto-expanded) .app-sidebar .sidebar-section,
.app.sidebar-auto-hidden:not(.sidebar-auto-expanded) .app-sidebar .nav-item span { display: none !important; }
.app.sidebar-auto-hidden.sidebar-auto-visible:not(.sidebar-auto-expanded) .app-sidebar .nav-item {
  width: 44px; min-width: 44px; max-width: 44px;
  margin-left: auto; margin-right: auto; padding-left: 0 !important; padding-right: 0 !important;
  display: flex; justify-content: center; align-items: center;
}
.app.sidebar-auto-hidden.sidebar-auto-visible:not(.sidebar-auto-expanded) .app-sidebar .sidebar-logo {
  justify-content: center !important; padding: 0 !important;
}
.app.sidebar-auto-hidden .sidebar-hover-zone {
  width: 7px; left: 0; top: 34px; bottom: var(--player-h, 96px);
  z-index: 2600; pointer-events: auto;
}
.app.sidebar-auto-hidden.sidebar-auto-visible .sidebar-hover-zone { pointer-events: none; }
.app.sidebar-auto-hidden.theater-active .app-sidebar,
.app.sidebar-auto-hidden.theater-active .sidebar-hover-zone { display: none !important; }
'@
$modified[$a]=$s+$css
$changed=@($files|Where-Object {$original[$_] -cne $modified[$_]})
if($changed.Count -ne 3){throw "Expected 3 changes; found $($changed.Count)"}
if($Check){Write-Host '[PASS] V10 Stage 2 preflight: exactly 3 files, no disk writes.' -ForegroundColor Green; exit 0}
$backupRoot=Join-Path (Split-Path $repo -Parent) ('Aideo-ZH-V10-S2-PREPATCH-'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
$written=@()
try {
  foreach($rel in $changed){$src=Join-Path $repo $rel;$dest=Join-Path $backupRoot $rel;New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent)|Out-Null;Copy-Item -LiteralPath $src -Destination $dest -ErrorAction Stop;if((Get-FileHash $src -Algorithm SHA256).Hash -cne (Get-FileHash $dest -Algorithm SHA256).Hash){throw "Backup checksum failure: $rel"}}
  $utf8=New-Object Text.UTF8Encoding($false)
  foreach($rel in $changed){$dest=Join-Path $repo $rel;[IO.File]::WriteAllText($dest,$modified[$rel],$utf8);$written+= $rel}
  foreach($rel in $changed){$dest=Join-Path $repo $rel;if((ReadUtf8 $dest) -cne $modified[$rel]){throw "Write verification failed: $rel"}}
  Write-Host '[PASS] V10 Stage 2 applied: hidden / rail / expanded sidebar.' -ForegroundColor Green
  Write-Host "[PASS] Verified original backup: $backupRoot" -ForegroundColor Green
  Write-Host '[INFO] CI, build and runtime validation pending.'
} catch {
  Write-Host "[STOP] $($_.Exception.Message)" -ForegroundColor Red
  foreach($rel in $written){$src=Join-Path $backupRoot $rel;$dest=Join-Path $repo $rel;if(Test-Path $src){Copy-Item -LiteralPath $src -Destination $dest -Force;if((Get-FileHash $src -Algorithm SHA256).Hash -cne (Get-FileHash $dest -Algorithm SHA256).Hash){Write-Host "[CRITICAL] Restore failed for $rel" -ForegroundColor Red}}}
  exit 1
}
