param([switch]$Check)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$workflow = Join-Path $repo '.github\workflows\aideo-zh-ui-preview.yml'
$packageSource = Join-Path $repo 'tools\ui-preview\package.json'
$oldInstall = 'run: npm install --no-save --package-lock=false --ignore-scripts playwright@1.56.1'
$newInstall = 'run: npm install --prefix tools/ui-preview --no-save --package-lock=false --ignore-scripts --legacy-peer-deps playwright@1.56.1'
$oldBrowser = 'run: npx playwright install --with-deps chromium'
$newBrowser = 'run: ./tools/ui-preview/node_modules/.bin/playwright install --with-deps chromium'
if (-not (Test-Path -LiteralPath $workflow -PathType Leaf)) { throw 'Workflow not found' }
if (-not (Test-Path -LiteralPath $packageSource -PathType Leaf)) { throw 'Preview package.json not found' }
$src=[System.IO.File]::ReadAllText($workflow)
if (($src.Split(@($oldInstall),[StringSplitOptions]::None).Length -ne 2) -or ($src.Split(@($oldBrowser),[StringSplitOptions]::None).Length -ne 2)) { throw 'Expected original workflow lines missing or duplicated; no change made' }
$expected=$src.Replace($oldInstall,$newInstall).Replace($oldBrowser,$newBrowser)
if ($Check) { Write-Host '[PASS] Read-only check: exactly two expected YAML commands found.' -ForegroundColor Green; exit 0 }
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$backup=Join-Path (Split-Path $repo -Parent) ('Aideo-ZH-UI-PREVIEW-WORKFLOW-BACKUP-' + $stamp + '.yml')
Copy-Item -LiteralPath $workflow -Destination $backup -ErrorAction Stop
try {
    [System.IO.File]::WriteAllText($workflow,$expected,(New-Object System.Text.UTF8Encoding($false)))
    $verify=[System.IO.File]::ReadAllText($workflow)
    if ($verify -cne $expected) { throw 'Write-back mismatch' }
    Write-Host '[PASS] Workflow corrected: isolated npm install and local Chromium CLI.' -ForegroundColor Green
    Write-Host ('[BACKUP] ' + $backup)
    Write-Host '[NEXT] Review exact two-line YAML difference and tools/ui-preview/package.json; commit and push.'
} catch {
    Copy-Item -LiteralPath $backup -Destination $workflow -Force
    throw
}
