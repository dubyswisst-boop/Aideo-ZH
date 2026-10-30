param([switch]$Check)
$ErrorActionPreference = 'Stop'
$repo = (Get-Location).Path
$toolDir = Join-Path $repo 'tools\aideo-feature-patch'
$files = @('src\App.tsx','tools\ui-preview\fixture.html','tools\ui-preview\test-sidebar.mjs')
$utf8 = New-Object System.Text.UTF8Encoding($false)
function EditText([string]$relative, [string]$source) {
  $p = Join-Path $repo $relative
  if (!(Test-Path -LiteralPath $p -PathType Leaf)) { throw "Missing: $relative" }
  $original = [IO.File]::ReadAllText($p)
  $text = $original
  if ($relative -eq 'src\App.tsx') {
    $old1 = "import { useEffect, useState, lazy, Suspense } from 'react';"
    $new1 = "import { useEffect, useRef, useState, lazy, Suspense } from 'react';"
    $old2 = @'
  const [sidebarAutoVisible, setSidebarAutoVisible] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
'@
    $new2 = @'
  const [sidebarAutoVisible, setSidebarAutoVisible] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  // A collapse can emit mouseleave because the overlay shrinks under the pointer.
  // Do not treat that geometry change as an intentional exit.
  const sidebarCollapseGuard = useRef(false);
  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!sidebarCollapseGuard.current) return;
      const rail = document.querySelector<HTMLElement>('.app-sidebar');
      if (!rail) { sidebarCollapseGuard.current = false; return; }
      const bounds = rail.getBoundingClientRect();
      const inside = event.clientX >= bounds.left && event.clientX < bounds.right &&
        event.clientY >= bounds.top && event.clientY < bounds.bottom;
      sidebarCollapseGuard.current = false;
      if (!inside) { setSidebarAutoVisible(false); setSidebarExpanded(false); }
    };
    window.addEventListener('pointermove', onPointerMove);
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);
  const toggleSidebarExpansion = () => {
    if (sidebarExpanded) sidebarCollapseGuard.current = true;
    else sidebarCollapseGuard.current = false;
    setSidebarAutoVisible(true);
    setSidebarExpanded(value => !value);
  };
  const onSidebarMouseLeave = () => {
    if (sidebarCollapseGuard.current) return;
    setSidebarAutoVisible(false);
    setSidebarExpanded(false);
  };
'@
    $old3 = '<Sidebar expanded={sidebarExpanded} onToggleExpansion={() => setSidebarExpanded(value => !value)} onMouseLeave={() => { setSidebarAutoVisible(false); setSidebarExpanded(false); }} />'
    $new3 = '<Sidebar expanded={sidebarExpanded} onToggleExpansion={toggleSidebarExpansion} onMouseLeave={onSidebarMouseLeave} />'
    $changes = @([pscustomobject]@{Old=$old1; New=$new1}, [pscustomobject]@{Old=$old2; New=$new2}, [pscustomobject]@{Old=$old3; New=$new3})
  } elseif ($relative -eq 'tools\ui-preview\fixture.html') {
    $old1 = @'
function state(visible,expanded){app.classList.toggle('sidebar-auto-visible',visible);app.classList.toggle('sidebar-auto-expanded',expanded);app.classList.toggle('sidebar-collapsed',!expanded)}
edge.addEventListener('mouseenter',()=>state(true,false));
toggle.addEventListener('click',()=>state(true,!app.classList.contains('sidebar-auto-expanded')));
sidebar.addEventListener('mouseleave',()=>state(false,false));
window.fixtureSetState=state;
'@
    $new1 = @'
let collapseGuard=false;
function state(visible,expanded){app.classList.toggle('sidebar-auto-visible',visible);app.classList.toggle('sidebar-auto-expanded',expanded);app.classList.toggle('sidebar-collapsed',!expanded)}
edge.addEventListener('mouseenter',()=>state(true,false));
toggle.addEventListener('click',()=>{const wasExpanded=app.classList.contains('sidebar-auto-expanded');collapseGuard=wasExpanded;state(true,!wasExpanded)});
sidebar.addEventListener('mouseleave',()=>{if(collapseGuard)return;state(false,false)});
window.addEventListener('pointermove',(event)=>{if(!collapseGuard)return;const b=sidebar.getBoundingClientRect();const inside=event.clientX>=b.left&&event.clientX<b.right&&event.clientY>=b.top&&event.clientY<b.bottom;collapseGuard=false;if(!inside)state(false,false)});
window.fixtureSetState=state;
'@
    $changes = @([pscustomobject]@{Old=$old1; New=$new1})
  } else {
    $old1 = @'
  await page.screenshot({path:resolve(out,'04-after-arrow-collapse.png'),fullPage:true});
  // Use a real pointer exit after moving onto the rail; no synthetic event.
'@
    $new1 = @'
  await page.screenshot({path:resolve(out,'04-after-arrow-collapse.png'),fullPage:true});
  // An actual pointer move (not CSS-only width) is what should end the collapse guard.
  // Move into the rail first, then physically leave it.
'@
    $changes = @([pscustomobject]@{Old=$old1; New=$new1})
  }
  foreach($pair in $changes) {
    $old = [string]$pair.Old; $new = [string]$pair.New
    $count = ([regex]::Matches($text,[regex]::Escape($old))).Count
    if ($count -ne 1) { throw "Preflight expected 1 exact match in ${relative}, got ${count}" }
    $text = $text.Replace($old,$new)
  }
  return [pscustomobject]@{ Relative=$relative; Original=$original; Edited=$text; Path=$p }
}
Write-Host '[STEP 1] Read-only preflight...'
$edits = @()
foreach($f in $files) { $edits += EditText $f '' }
Write-Host '[PASS] Three files match expected baseline. No writes in preflight.' -ForegroundColor Green
if($Check){ Write-Host '[SAFE] Preflight only; no modifications or backups written.'; exit 0 }
$answer = Read-Host 'Apply guarded collapse fix with verified backups [Y/N]?'
if($answer -ne 'Y'){ Write-Host '[SAFE] Cancelled.'; exit 0 }
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$backup = Join-Path (Split-Path $repo -Parent) ('Aideo-ZH-V10-S2-COLLAPSE-PREPATCH-'+$stamp)
New-Item -Path $backup -ItemType Directory -Force | Out-Null
foreach($e in $edits) {
  $dest=Join-Path $backup $e.Relative
  New-Item -ItemType Directory -Path (Split-Path $dest -Parent) -Force | Out-Null
  Copy-Item -LiteralPath $e.Path -Destination $dest -Force
  if((Get-FileHash -LiteralPath $e.Path -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash){ throw "Backup verification failed: $($e.Relative)" }
}
try {
  foreach($e in $edits) { [IO.File]::WriteAllText($e.Path,$e.Edited,$utf8) }
  foreach($e in $edits) { if([IO.File]::ReadAllText($e.Path) -cne $e.Edited) { throw "Write verification failed: $($e.Relative)" } }
} catch {
  foreach($e in $edits) { $source=Join-Path $backup $e.Relative; if(Test-Path -LiteralPath $source){ Copy-Item -LiteralPath $source -Destination $e.Path -Force } }
  throw
}
Write-Host '[PASS] V10 S2 collapse guard applied to app and fixture. Strict assertions preserved.' -ForegroundColor Green
Write-Host "[PASS] Verified originals: $backup"
Write-Host '[INFO] CI and full native runtime validation remain pending.'
