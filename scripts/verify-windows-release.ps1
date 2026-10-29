[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Installer,
    [Parameter(Mandatory)][string]$PayloadDirectory,
    [Parameter(Mandatory)][string]$ReportPath,
    [Parameter(Mandatory)][string]$ExpectedPublisher
)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'WindowsSigning.psm1') -Force
if (!(Test-PeFile $Installer)) { throw 'Installer must be a PE file.' }
$tool = Find-SignTool
$payload = (Resolve-Path -LiteralPath $PayloadDirectory).Path
$files = @(Get-ChildItem -LiteralPath $payload -Recurse -File | Where-Object { Test-PeFile $_.FullName })
foreach ($required in @('aideo.exe','uninstall.exe')) {
    if (@($files | Where-Object { $_.Name -ieq $required }).Count -ne 1) { throw "Missing or ambiguous required PE: $required" }
}
$main = @($files | Where-Object Name -eq 'aideo.exe')[0]
$stream = [IO.File]::OpenRead($main.FullName)
try {
    $reader = [IO.BinaryReader]::new($stream); $stream.Position = 60; $pe = $reader.ReadUInt32()
    $stream.Position = $pe + 4
    if ($reader.ReadUInt16() -ne 0x8664) { throw 'Main executable is not Windows x64.' }
} finally { $stream.Dispose() }
$records = @(Get-PeSignatureRecord $Installer $tool $ExpectedPublisher)
foreach ($file in $files) {
    $publisher = if ($file.Name -in @('aideo.exe','uninstall.exe')) { $ExpectedPublisher } else { '' }
    $records += Get-PeSignatureRecord $file.FullName $tool $publisher
}
$passed = @($records | Where-Object { !$_.passed }).Count -eq 0
$report = [ordered]@{
    passed = $passed; checkedAt = [DateTime]::UtcNow.ToString('o'); files = $records
    smartScreenReputation = 'Unknown'; smartAppControlExecution = 'Not tested'
    defenderScan = 'Separate scan required; this report checks signatures only'
}
$fullReport = [IO.Path]::GetFullPath($ReportPath)
New-Item -ItemType Directory -Force -Path (Split-Path $fullReport) | Out-Null
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $fullReport -Encoding utf8
if (!$passed) { throw "Release blocked: invalid, unsigned, wrong-publisher or untimestamped PE. See $ReportPath" }
Write-Output "Verified $($records.Count) PE files; SmartScreen reputation and SAC execution remain untested."
