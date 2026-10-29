Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Find-SignTool {
    if ($env:WINDOWS_SIGNTOOL_PATH) {
        return (Resolve-Path -LiteralPath $env:WINDOWS_SIGNTOOL_PATH -ErrorAction Stop).Path
    }
    $command = Get-Command signtool.exe -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    $kits = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits/10/bin'
    $tool = Get-ChildItem -LiteralPath $kits -Filter signtool.exe -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.Directory.Name -eq 'x64' } | Sort-Object FullName -Descending | Select-Object -First 1
    if (!$tool) { throw 'Windows SDK x64 SignTool is required.' }
    return $tool.FullName
}

function Test-PeFile([string]$Path) {
    $stream = [IO.File]::OpenRead($Path)
    try {
        if ($stream.Length -lt 64) { return $false }
        $reader = [IO.BinaryReader]::new($stream)
        if ($reader.ReadUInt16() -ne 0x5a4d) { return $false }
        $stream.Position = 60
        $offset = $reader.ReadUInt32()
        if ($offset -gt $stream.Length - 24) { return $false }
        $stream.Position = $offset
        return $reader.ReadUInt32() -eq 0x4550
    } finally { $stream.Dispose() }
}

function Get-PeDigestAlgorithms([string]$Path) {
    # Inspect embedded PKCS#7, without depending on localized SignTool output.
    Add-Type -AssemblyName System.Security.Cryptography.Pkcs
    $stream = [IO.File]::OpenRead($Path)
    try {
        $reader = [IO.BinaryReader]::new($stream)
        $stream.Position = 60
        $pe = $reader.ReadUInt32()
        $stream.Position = $pe + 24
        $magic = $reader.ReadUInt16()
        $directory = if ($magic -eq 0x20b) { 112 } elseif ($magic -eq 0x10b) { 96 } else { throw 'Unsupported PE header.' }
        $stream.Position = $pe + 24 + $directory + 32
        $offset = $reader.ReadUInt32()
        $size = $reader.ReadUInt32()
        if (!$offset -or $size -lt 8) { return @() }
        if ($offset + $size -gt $stream.Length) { throw 'Invalid PE certificate table.' }
        $stream.Position = $offset
        $length = $reader.ReadUInt32()
        if ($length -lt 8 -or $length -gt $size) { throw 'Invalid WIN_CERTIFICATE.' }
        $stream.Position = $offset + 8
        $cms = [Security.Cryptography.Pkcs.SignedCms]::new()
        $cms.Decode($reader.ReadBytes($length - 8))
        return @($cms.SignerInfos | ForEach-Object { $_.DigestAlgorithm.Value })
    } finally { $stream.Dispose() }
}

function Get-PeSignatureRecord([string]$Path, [string]$SignTool, [string]$ExpectedPublisher = '') {
    $file = Get-Item -LiteralPath $Path
    $signature = Get-AuthenticodeSignature -LiteralPath $file.FullName
    $issues = [Collections.Generic.List[string]]::new()
    $publisher = if ($signature.SignerCertificate) { $signature.SignerCertificate.Subject } else { $null }
    $timestamp = if ($signature.TimeStamperCertificate) { $signature.TimeStamperCertificate.Subject } else { $null }
    $digests = @()
    if ($signature.Status -ne 'Valid') { $issues.Add("Authenticode: $($signature.Status)") }
    if ($ExpectedPublisher -and $publisher -cne $ExpectedPublisher) { $issues.Add('Unexpected publisher.') }
    if (!$timestamp) { $issues.Add('No trusted timestamp.') }
    try {
        $digests = @(Get-PeDigestAlgorithms $file.FullName)
        if (!$digests.Count -or @($digests | Where-Object { $_ -ne '2.16.840.1.101.3.4.2.1' }).Count) {
            $issues.Add('Embedded signer digest must be SHA-256.')
        }
    } catch { $issues.Add($_.Exception.Message) }
    $verification = @(& $SignTool verify /pa /all /v /tw $file.FullName 2>&1 | ForEach-Object { "$_" })
    $verifyExit = $LASTEXITCODE
    if ($verifyExit -ne 0) { $issues.Add("SignTool verification exit $verifyExit.") }
    [pscustomobject]@{
        path = $file.FullName; sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        status = $signature.Status.ToString(); publisher = $publisher; timestampPublisher = $timestamp
        signerNotBefore = $(if ($signature.SignerCertificate) { $signature.SignerCertificate.NotBefore.ToUniversalTime().ToString('o') })
        signerNotAfter = $(if ($signature.SignerCertificate) { $signature.SignerCertificate.NotAfter.ToUniversalTime().ToString('o') })
        signerThumbprint = $(if ($signature.SignerCertificate) { $signature.SignerCertificate.Thumbprint })
        digestOids = $digests; signToolExit = $verifyExit; verification = $verification
        issues = @($issues.ToArray()); passed = $issues.Count -eq 0
    }
}

function Get-WindowsSigningConfiguration {
    if ($env:WINDOWS_SIGNING_PROVIDER -notin @('certificate-store', 'artifact-signing')) {
        throw 'WINDOWS_SIGNING_PROVIDER must be certificate-store or artifact-signing; no unsigned fallback.'
    }
    if (!$env:WINDOWS_SIGNING_PUBLISHER) { throw 'WINDOWS_SIGNING_PUBLISHER must be the approved certificate subject.' }
    $timestamp = $env:WINDOWS_TIMESTAMP_URL
    if (!$timestamp -or ![Uri]::IsWellFormedUriString($timestamp, [UriKind]::Absolute) -or ([Uri]$timestamp).Scheme -notin @('http','https')) {
        throw 'WINDOWS_TIMESTAMP_URL must be the signing provider-approved RFC3161 endpoint.'
    }
    $tool = Find-SignTool
    if ($env:WINDOWS_SIGNING_PROVIDER -eq 'certificate-store') {
        if ($env:WINDOWS_SIGNING_THUMBPRINT -notmatch '^[A-Fa-f0-9]{40}$') { throw 'WINDOWS_SIGNING_THUMBPRINT is required.' }
        $cert = Get-Item -LiteralPath "Cert:/CurrentUser/My/$env:WINDOWS_SIGNING_THUMBPRINT" -ErrorAction Stop
        if (!$cert.HasPrivateKey -or $cert.Subject -cne $env:WINDOWS_SIGNING_PUBLISHER -or $cert.NotAfter -le (Get-Date) -or $cert.NotBefore -gt (Get-Date)) {
            throw 'Signing certificate is unavailable, expired, or does not match the approved publisher.'
        }
        if ('1.3.6.1.5.5.7.3.3' -notin @($cert.EnhancedKeyUsageList | ForEach-Object { $_.ObjectId })) { throw 'Code signing EKU is required.' }
        $chain = [Security.Cryptography.X509Certificates.X509Chain]::new()
        try {
            $chain.ChainPolicy.RevocationMode = 'Online'
            if (!$chain.Build($cert)) { throw 'Signing certificate chain is not trusted or revocation status is unavailable.' }
        } finally { $chain.Dispose() }
    } else {
        if (!$env:ARTIFACT_SIGNING_DLIB -or !$env:ARTIFACT_SIGNING_METADATA) { throw 'Artifact Signing dlib and metadata paths are required.' }
        foreach ($path in @($env:ARTIFACT_SIGNING_DLIB, $env:ARTIFACT_SIGNING_METADATA)) {
            if (!(Test-Path -LiteralPath $path -PathType Leaf)) { throw 'Artifact Signing client configuration is missing.' }
        }
        $metadata = Get-Content -LiteralPath $env:ARTIFACT_SIGNING_METADATA -Raw | ConvertFrom-Json
        foreach ($name in @('Endpoint','CodeSigningAccountName','CertificateProfileName')) {
            if (!$metadata.PSObject.Properties[$name] -or !$metadata.$name) { throw "Missing Artifact Signing metadata: $name" }
        }
    }
    return $tool
}

Export-ModuleMember -Function Find-SignTool, Test-PeFile, Get-PeSignatureRecord, Get-WindowsSigningConfiguration
