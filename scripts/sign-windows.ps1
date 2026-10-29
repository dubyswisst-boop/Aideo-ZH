[CmdletBinding()]
param([string]$Path, [switch]$CheckConfiguration)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'WindowsSigning.psm1') -Force
$tool = Get-WindowsSigningConfiguration
if ($CheckConfiguration) { Write-Output 'Signing configuration validated; remote authorization is tested when signing.'; exit 0 }
if (!$Path -or !(Test-PeFile $Path)) { throw 'Signing input must be a PE file.' }
$file = Get-Item -LiteralPath $Path
$before = Get-AuthenticodeSignature -LiteralPath $file.FullName
# Never overwrite an existing signature, including an invalid third-party signature.
if ($before.Status -eq 'Valid') {
    $record = Get-PeSignatureRecord $file.FullName $tool
    if (!$record.passed) { throw 'Existing signature does not meet release policy; do not overwrite it.' }
    Write-Output "Preserved valid signature: $($file.Name)"
    exit 0
}
if ($before.Status -ne 'NotSigned') { throw 'Refusing to overwrite an invalid or untrusted signature.' }
$ownBinary = $file.Name -match '^(aideo|uninst|uninstall)\.exe$|^Aideo.*-setup\.exe$'
if (!$ownBinary) {
    $policy = Get-Content (Join-Path $PSScriptRoot 'windows-signing-policy.json') -Raw | ConvertFrom-Json
    $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    $approved = @($policy.thirdParty | Where-Object { $_.name -ieq $file.Name -and $_.sha256 -eq $hash })
    if ($approved.Count -ne 1) { throw 'Unreviewed third-party PE: signing requires an exact source hash in windows-signing-policy.json.' }
}
$arguments = @('sign', '/fd', 'SHA256', '/tr', $env:WINDOWS_TIMESTAMP_URL, '/td', 'SHA256')
if ($env:WINDOWS_SIGNING_PROVIDER -eq 'certificate-store') {
    $arguments += @('/sha1', $env:WINDOWS_SIGNING_THUMBPRINT)
} else {
    $arguments += @('/dlib', $env:ARTIFACT_SIGNING_DLIB, '/dmdf', $env:ARTIFACT_SIGNING_METADATA)
}
& $tool @arguments $file.FullName
if ($LASTEXITCODE -ne 0) { throw 'Signing or RFC3161 timestamping failed.' }
$record = Get-PeSignatureRecord $file.FullName $tool $env:WINDOWS_SIGNING_PUBLISHER
if (!$record.passed) { throw 'Signature verification failed immediately after signing.' }
Write-Output "Signed and verified: $($file.Name) SHA256=$($record.sha256)"
