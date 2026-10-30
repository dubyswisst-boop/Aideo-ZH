param([switch]$Check)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$targets = @('src/test/localModeOnly.test.tsx','locales/zh-CN.json')
$utf8 = New-Object System.Text.UTF8Encoding($false)
$testPath = Join-Path $root $targets[0]
$localePath = Join-Path $root $targets[1]
if (!(Test-Path -LiteralPath $testPath) -or !(Test-Path -LiteralPath $localePath)) { throw 'Required file missing.' }
$test = [System.IO.File]::ReadAllText($testPath)
$locale = [System.IO.File]::ReadAllText($localePath)
$oldLocal = "useStore.setState({ appMode: 'local', lyrics: [] });"
$oldHybrid = "useStore.setState({ appMode: 'hybrid', lyrics: [] });"
foreach ($s in @($oldLocal,$oldHybrid)) { if ($test.Split(@($s),[StringSplitOptions]::None).Length -ne 2) { throw "Expected exactly one test anchor: $s" } }
# Use the .NET JSON parser: unlike PS 5.1 ConvertFrom-Json, it accepts case-distinct keys.
Add-Type -AssemblyName System.Web.Extensions
$serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$serializer.MaxJsonLength = 2097152
$objects = $serializer.DeserializeObject($locale)
$keys = @('卡拉 OK（逐字）','显示模式：{value} — 点击切换','请在下方粘贴 LRC 或同步歌词文本。')
foreach($k in $keys) { if ($objects.ContainsKey($k)) { throw "Key already exists: $k" } }
if (-not $locale.TrimEnd().EndsWith('}')) { throw 'Locale is not a JSON object.' }
Write-Host '[PASS] Preflight: two unique test anchors and three missing locale keys.' -ForegroundColor Green
if($Check) { Write-Host '[SAFE] No source writes.'; exit 0 }
$answer = Read-Host 'Apply two-file CI regression repair with verified backup? [Y/N]'
if($answer -ne 'Y') { Write-Host '[SAFE] Cancelled.'; exit 0 }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$backup = Join-Path (Split-Path $root -Parent) ('Aideo-ZH-LYRICS-ZH-CI-PREPATCH-' + $stamp)
New-Item -ItemType Directory -Path $backup -Force | Out-Null
foreach($rel in $targets) {
  $from = Join-Path $root $rel
  $dest = Join-Path $backup ($rel -replace '[/\\]','__')
  Copy-Item -LiteralPath $from -Destination $dest
  if((Get-FileHash -LiteralPath $from -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash) { throw 'Backup hash mismatch' }
}
$newLocal = "useStore.setState({ appMode: 'local', currentTrack: localTrack, playback: { ...useStore.getState().playback, current_track: localTrack.path }, lyrics: [] });"
$newHybrid = "useStore.setState({ appMode: 'hybrid', currentTrack: localTrack, playback: { ...useStore.getState().playback, current_track: localTrack.path }, lyrics: [] });"
$test2 = $test.Replace($oldLocal,$newLocal).Replace($oldHybrid,$newHybrid)
$trim = $locale.TrimEnd()
$index = $trim.LastIndexOf('}')
$before = $trim.Substring(0,$index).TrimEnd()
$endsWithComma = $before.EndsWith(',')
if(!$endsWithComma) { $before += ',' }
$lines = @(
  '  "卡拉 OK（逐字）": "卡拉 OK（逐字）",',
  '  "显示模式：{value} — 点击切换": "显示模式：{value} — 点击切换",',
  '  "请在下方粘贴 LRC 或同步歌词文本。": "请在下方粘贴 LRC 或同步歌词文本。"'
)
$locale2 = $before + "`n" + ($lines -join "`n") + "`n}" + "`n"
# Validate complete edited JSON, preserving existing case-distinct keys.
$validated = $serializer.DeserializeObject($locale2)
foreach($k in $keys) { if (-not $validated.ContainsKey($k)) { throw "Expected locale key missing after patch: $k" } }
try {
  [System.IO.File]::WriteAllText($testPath,$test2,$utf8)
  [System.IO.File]::WriteAllText($localePath,$locale2,$utf8)
  if([System.IO.File]::ReadAllText($testPath) -ne $test2 -or [System.IO.File]::ReadAllText($localePath) -ne $locale2) { throw 'Postwrite readback mismatch' }
  Write-Host '[PASS] CI regression repair applied and read back.' -ForegroundColor Green
  Write-Host "[PASS] Original backups: $backup"
  Write-Host '[HOLD] Run full CI on isolated branch before merge.'
} catch {
  foreach($rel in $targets) {
    $src = Join-Path $backup ($rel -replace '[/\\]','__')
    if(Test-Path -LiteralPath $src) { Copy-Item -LiteralPath $src -Destination (Join-Path $root $rel) -Force }
  }
  throw
}
