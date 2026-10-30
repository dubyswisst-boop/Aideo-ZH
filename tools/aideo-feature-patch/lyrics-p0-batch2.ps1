param([switch]$Check)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$manifest=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'lyrics-p0-batch2.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$changes=@()
foreach($prop in $manifest.PSObject.Properties) {
  $relative=$prop.Name
  $target=Join-Path $root ($relative.Replace('/','\'))
  if(!(Test-Path -LiteralPath $target)){throw "Missing $relative"}
  $oldText=[IO.File]::ReadAllText($target)
  $newText=$oldText
  foreach($pair in @($prop.Value)) {
    $before=[string]$pair.old; $after=[string]$pair.new
    if([string]::IsNullOrEmpty($before)){throw "Empty anchor in $relative"}
    $count=([regex]::Matches($newText,[regex]::Escape($before))).Count
    if($count -ne 1){throw "Preflight expected 1 match in $relative, got $count"}
    $newText=$newText.Replace($before,$after)
  }
  if($newText -eq $oldText){throw "No change in $relative"}
  $changes+= [pscustomobject]@{Path=$target; Relative=$relative; Original=$oldText; New=$newText}
}
Write-Host '[PASS] Read-only preflight: three source files, unique anchors, no changes written.' -ForegroundColor Green
if($Check){exit 0}
$answer=Read-Host 'Apply lyrics P0 batch2 with backup? [Y/N]'
if($answer -ne 'Y'){Write-Host '[SAFE] Cancelled';exit 0}
$backup=Join-Path (Split-Path $root -Parent) ('Aideo-ZH-LYRICS-P0-B2-BACKUP-'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $backup | Out-Null
$written=@()
try {
  foreach($c in $changes){
    $dest=Join-Path $backup ($c.Relative.Replace('/','\'))
    New-Item -ItemType Directory -Path (Split-Path $dest -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $c.Path -Destination $dest
    if((Get-FileHash -LiteralPath $c.Path -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash){throw "Backup hash mismatch $($c.Relative)"}
  }
  foreach($c in $changes){
    # Maintain original encoding and newline bytes (UTF-8 source tree).
    [IO.File]::WriteAllText($c.Path,$c.New,(New-Object System.Text.UTF8Encoding($false)))
    $written+= $c
  }
  Write-Host '[PASS] Lyrics P0 batch2 applied; originals SHA256 verified.' -ForegroundColor Green
  Write-Host "[BACKUP] $backup"
  Write-Host '[NEXT] Review the three source diffs in GitHub Desktop, then run CI.'
}catch{
  foreach($c in $written){$src=Join-Path $backup ($c.Relative.Replace('/','\'));if(Test-Path -LiteralPath $src){Copy-Item -LiteralPath $src -Destination $c.Path -Force}}
  throw
}
