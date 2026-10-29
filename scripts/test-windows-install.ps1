[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Installer,
    [Parameter(Mandatory)][string]$ExpectedPublisher,
    [Parameter(Mandatory)][string]$ReportDirectory
)
$ErrorActionPreference = 'Stop'
# Installation and first launch change registry/app data; only run on the disposable CI worker.
if ($env:GITHUB_ACTIONS -ne 'true' -or !$env:RUNNER_TEMP) { throw 'Installation smoke test requires a disposable GitHub Actions runner.' }
$destination = Join-Path $env:RUNNER_TEMP 'aideo-zh-install-smoke'
if (Test-Path -LiteralPath $destination) { throw 'Smoke installation directory already exists.' }
$installerPath = (Resolve-Path -LiteralPath $Installer).Path
$install = Start-Process -FilePath $installerPath -ArgumentList @('/S', "/D=$destination") -WindowStyle Hidden -PassThru
if (!$install.WaitForExit(120000)) { $install.Kill(); throw 'Silent installation timed out.' }
if ($install.ExitCode -ne 0) { throw "Silent installation exit $($install.ExitCode)." }
New-Item -ItemType Directory -Force -Path $ReportDirectory | Out-Null
& (Join-Path $PSScriptRoot 'verify-windows-release.ps1') -Installer $installerPath -PayloadDirectory $destination -ExpectedPublisher $ExpectedPublisher -ReportPath (Join-Path $ReportDirectory 'installed-signatures.json')
if ($LASTEXITCODE -ne 0) { throw 'Installed PE verification failed.' }
$process = Start-Process -FilePath (Join-Path $destination 'aideo.exe') -WindowStyle Hidden -PassThru
try {
    if ($process.WaitForExit(15000)) { throw "Application exited during startup, exit $($process.ExitCode)." }
    [ordered]@{
        installExit = $install.ExitCode; startupObservationSeconds = 15; processAlive = $true
        os = [Environment]::OSVersion.VersionString
        scope = 'Process startup only; no interactive playback test and no Windows 11 SAC or SmartScreen verdict'
    } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $ReportDirectory 'installation-smoke.json')
} finally {
    if (!$process.HasExited) { $process.Kill() }
}
