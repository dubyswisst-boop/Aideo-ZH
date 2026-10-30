param([switch]$Check)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$target = Join-Path $root 'tools\ui-preview\test-sidebar.mjs'
if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { throw "Missing $target" }
$src = [IO.File]::ReadAllText($target, [Text.Encoding]::UTF8)
$old = @'
  await page.locator('.sidebar-toggle-btn').click();await page.waitForTimeout(400);
  const collapsed=await get();
  check('Arrow collapses to icon rail',collapsed.sidebar.w>=44&&collapsed.sidebar.w<=58,collapsed.sidebar);
  await page.evaluate(()=>document.querySelector('.app-sidebar').dispatchEvent(new MouseEvent('mouseleave')));await page.waitForTimeout(400);
  const hidden=await get();
  check('Mouse leave hides sidebar',hidden.sidebar.visibility==='hidden'||Number(hidden.sidebar.opacity)<0.1,hidden.sidebar);
'@
$new = @'
  // Clicking the real arrow must keep state 1 (rail) visible until the pointer leaves.
  await page.locator('.sidebar-toggle-btn').click();await page.waitForTimeout(400);
  const collapsed=await get();
  const collapsedClasses=await page.locator('#app').getAttribute('class');
  check('Arrow collapses to visible icon rail',
    collapsed.sidebar.w>=44&&collapsed.sidebar.w<=58&&
    collapsed.sidebar.x>=-1&&collapsed.sidebar.visibility==='visible'&&
    Number(collapsed.sidebar.opacity)>0.9&&
    collapsedClasses.includes('sidebar-auto-visible')&&
    !collapsedClasses.includes('sidebar-auto-expanded'),
    {sidebar:collapsed.sidebar,classes:collapsedClasses});
  await page.screenshot({path:resolve(out,'04-after-arrow-collapse.png'),fullPage:true});
  // Use a real pointer exit after moving onto the rail; no synthetic event.
  await page.mouse.move(25,180);
  await page.waitForTimeout(100);
  await page.mouse.move(400,180);
  await page.waitForTimeout(400);
  const hidden=await get();
  const hiddenClasses=await page.locator('#app').getAttribute('class');
  check('Real mouse leave hides sidebar',
    (hidden.sidebar.visibility==='hidden'||Number(hidden.sidebar.opacity)<0.1)&&
    !hiddenClasses.includes('sidebar-auto-visible'),
    {sidebar:hidden.sidebar,classes:hiddenClasses});
  await page.screenshot({path:resolve(out,'05-after-mouse-leave.png'),fullPage:true});
'@
$matches = [regex]::Matches($src, [regex]::Escape($old)).Count
if ($matches -ne 1) { throw "Preflight failed: expected exactly one test block, found $matches. No writes." }
Write-Host '[PASS] Exact expected test block found; one-file scoped change.' -ForegroundColor Green
if ($Check) { Write-Host '[SAFE] Read-only preflight: no disk writes.'; exit 0 }
$backupDir = Join-Path (Split-Path $root -Parent) ('Aideo-ZH-UI-StateTest-PREPATCH-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $backupDir -ErrorAction Stop | Out-Null
$backupFile = Join-Path $backupDir 'test-sidebar.mjs'
Copy-Item -LiteralPath $target -Destination $backupFile -ErrorAction Stop
$h1 = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
$h2 = (Get-FileHash -LiteralPath $backupFile -Algorithm SHA256).Hash
if ($h1 -ne $h2) { throw '[STOP] Backup hash mismatch; original unchanged.' }
try {
  $updated = $src.Replace($old,$new)
  [IO.File]::WriteAllText($target,$updated,(New-Object Text.UTF8Encoding($false)))
  if ([IO.File]::ReadAllText($target,[Text.Encoding]::UTF8) -ne $updated) { throw 'Post-write verify failed' }
  Write-Host '[PASS] Stronger sidebar state checks applied.' -ForegroundColor Green
  Write-Host "[PASS] SHA-256 verified backup: $backupFile"
  Write-Host '[INFO] Cloud test may now FAIL if actual pointer collapse hides the rail. That is a useful detected bug.'
} catch {
  Copy-Item -LiteralPath $backupFile -Destination $target -Force
  throw
}
