[CmdletBinding()]
param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$ReportPath)
$ErrorActionPreference = 'Stop'
$target = (Resolve-Path -LiteralPath $Path).Path
$status = Get-CimInstance -Namespace root/Microsoft/Windows/Defender -ClassName MSFT_MpComputerStatus -ErrorAction Stop
if (!$status.AMServiceEnabled -or !$status.AntivirusEnabled) { throw 'Defender is unavailable; release scan cannot be claimed.' }
$scanner = Get-ChildItem 'C:/ProgramData/Microsoft/Windows Defender/Platform' -Filter MpCmdRun.exe -Recurse -ErrorAction Stop |
    Where-Object { $_.FullName -notmatch '\\X86\\' } | Sort-Object FullName -Descending | Select-Object -First 1
if (!$scanner) { $scanner = Get-Item 'C:/Program Files/Windows Defender/MpCmdRun.exe' -ErrorAction Stop }
# DisableRemediation prevents the audit from deleting/quarantining project files. It does not disable protection.
$output = @(& $scanner.FullName -Scan -ScanType 3 -File $target -DisableRemediation 2>&1 | ForEach-Object { "$_" })
$scanExit = $LASTEXITCODE
$fullReport = [IO.Path]::GetFullPath($ReportPath)
New-Item -ItemType Directory -Force -Path (Split-Path $fullReport) | Out-Null
[ordered]@{
    target = $target; exitCode = $scanExit; signatureVersion = $status.AntivirusSignatureVersion
    checkedAt = [DateTime]::UtcNow.ToString('o'); output = $output; passed = $scanExit -eq 0
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $fullReport -Encoding utf8
if ($scanExit -ne 0) { throw 'Defender scan failed or detected a threat. Release blocked; investigate the report.' }
Write-Output 'Defender custom scan completed without a reported threat. This is not a SmartScreen or SAC verdict.'
