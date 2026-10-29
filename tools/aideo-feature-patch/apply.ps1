#requires -version 5.1
[CmdletBinding()]
param([switch]$Check)
$ErrorActionPreference = 'Stop'
$script:Root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$script:Pending = @{}
$script:Original = @{}
$script:Newlines = @{}
$script:Changed = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
$Utf8 = [System.Text.UTF8Encoding]::new($false)
$script:Utf8 = $Utf8

function Get-Source([string]$Relative) {
    if (-not $script:Pending.ContainsKey($Relative)) {
        $Path = Join-Path $script:Root ($Relative.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
        if (-not [System.IO.File]::Exists($Path)) { throw "Missing required repository file: $Relative" }
        $Raw = [System.IO.File]::ReadAllText($Path, $script:Utf8)
        $script:Newlines[$Relative] = if ($Raw.Contains("`r`n")) { "`r`n" } else { "`n" }
        $Normalized = $Raw.Replace("`r`n", "`n")
        $script:Pending[$Relative] = $Normalized
        $script:Original[$Relative] = $Normalized
    }
    return [string]$script:Pending[$Relative]
}
function Set-Source([string]$Relative, [string]$Content) {
    $Old = Get-Source $Relative
    if ($Old -cne $Content) {
        $script:Pending[$Relative] = $Content
        [void]$script:Changed.Add($Relative)
    }
}
function Count-Exact([string]$Text, [string]$Needle) {
    if ([string]::IsNullOrEmpty($Needle)) { throw 'Empty patch anchor is not allowed.' }
    return [regex]::Matches($Text, [regex]::Escape($Needle)).Count
}
function Execute-Operation($Item) {
    $A = @($Item.args)
    $File = [string]$A[0]
    $Text = Get-Source $File
    switch ([string]$Item.type) {
        'replaceOnce' {
            $Old = [string]$A[1]; $New = [string]$A[2]; $Label = [string]$A[3]
            $Marker = if ($A.Count -gt 4) { [string]$A[4] } else { $New }
            if ($Text.Contains($Marker)) { return }
            $Count = Count-Exact $Text $Old
            if ($Count -ne 1) { throw "[$Label] expected 1 anchor, found $Count ($File)." }
            Set-Source $File ($Text.Replace($Old, $New))
        }
        'replaceAllExact' {
            $Old = [string]$A[1]; $New = [string]$A[2]; $Label = [string]$A[3]
            $Marker = [string]$A[4]; $Expected = [int]$A[5]
            $Remaining = Count-Exact $Text $Old
            $AlreadyPatched = Count-Exact $Text $New
            # A repeat run must be fully patched, not a mixture of old and new calls.
            if ($Remaining -eq 0 -and $AlreadyPatched -eq $Expected) { return }
            if ($Remaining -ne $Expected -or $AlreadyPatched -ne 0) {
                throw "[$Label] expected $Expected unpatched call sites, found $Remaining unpatched and $AlreadyPatched patched ($File)."
            }
            Set-Source $File ($Text.Replace($Old, $New))
        }
        'insertAfterOnce' {
            $Anchor = [string]$A[1]; $Addition = [string]$A[2]; $Marker = [string]$A[3]
            $Label = [string]$A[4]
            if ($Text.Contains($Marker)) { return }
            $Count = Count-Exact $Text $Anchor
            if ($Count -ne 1) { throw "[$Label] expected 1 anchor, found $Count ($File)." }
            Set-Source $File ($Text.Replace($Anchor, $Anchor + $Addition))
        }
        'replaceInRegion' {
            $Start = [string]$A[1]; $End = [string]$A[2]
            $Old = [string]$A[3]; $New = [string]$A[4]; $Label = [string]$A[5]
            $Marker = if ($A.Count -gt 6) { [string]$A[6] } else { $New }
            $Begin = $Text.IndexOf($Start, [System.StringComparison]::Ordinal)
            if ($Begin -lt 0) { throw "[$Label] start anchor missing ($File)." }
            $Stop = $Text.IndexOf($End, $Begin + $Start.Length, [System.StringComparison]::Ordinal)
            if ($Stop -lt 0) { throw "[$Label] end anchor missing ($File)." }
            $Region = $Text.Substring($Begin, $Stop - $Begin)
            if ($Region.Contains($Marker)) { return }
            $Count = Count-Exact $Region $Old
            if ($Count -ne 1) { throw "[$Label] expected 1 anchor in region, found $Count ($File)." }
            $Patched = $Text.Substring(0, $Begin) + $Region.Replace($Old, $New) + $Text.Substring($Stop)
            Set-Source $File $Patched
        }
        'appendOnce' {
            $Marker = [string]$A[1]; $Addition = [string]$A[2]
            if ($Text.Contains($Marker)) { return }
            Set-Source $File ($Text.TrimEnd() + "`n`n" + $Addition.Trim() + "`n")
        }
        default { throw "Unknown patch operation type: $($Item.type)" }
    }
}
function Replace-All-IfPresent([string]$File, [string]$Old, [string]$New) {
    $Content = Get-Source $File
    if ($Content.Contains($Old)) { Set-Source $File ($Content.Replace($Old, $New)) }
}
function Extend-Lastfm {
    $File = 'src-tauri/src/lastfm.rs'
    Replace-All-IfPresent $File 'let client = Client::new();' 'let client = crate::get_http_client();'
    $Content = Get-Source $File
    if (-not $Content.Contains('let client = Client::new();')) {
        Replace-All-IfPresent $File "use reqwest::Client;`n" ''
    }
    Replace-All-IfPresent $File 'send().await.map_err(|e| e.to_string())?;' 'send().await.map_err(|e| format!("Last.fm 网络请求失败：{e}"))?.error_for_status().map_err(|e| format!("Last.fm HTTP 错误：{e}"))?;'
}
function Extend-LastfmApi {
    $File = 'src-tauri/src/lastfm_api.rs'
    $Content = Get-Source $File
    $Old = 'let api_key = get_api_key();'
    $New = "validate_api_key()?;`n    let api_key = get_api_key();"
    $OldCount = Count-Exact $Content $Old
    $PatchedCount = Count-Exact $Content $New
    if ($OldCount -eq 9 -and $PatchedCount -eq 9) { return }
    if ($OldCount -ne 9 -or $PatchedCount -ne 0) {
        throw "[Last.fm API 校验] expected 9 original sites or 9 fully patched sites, found $OldCount key declarations and $PatchedCount guards ($File)."
    }
    Set-Source $File ($Content.Replace($Old, $New))
}
function Set-JsonKeyWithoutReformat([string]$File, [string]$Key, [string]$Value) {
    # IMPORTANT: Windows PowerShell 5.1 ConvertFrom-Json treats key names case-insensitively.
    # The upstream locale intentionally contains BOTH Playlists and PLAYLISTS.
    # Therefore this operation must preserve and match exact, case-sensitive JSON keys
    # without deserializing the entire locale dictionary into a PSObject.
    $Text = Get-Source $File
    $QKey = ConvertTo-Json -InputObject $Key -Compress
    $QValue = ConvertTo-Json -InputObject $Value -Compress
    $Pattern = '(?m)^(?<prefix>[ \t]*' + [regex]::Escape($QKey) + '\s*:\s*)' +
               '(?<value>"(?:\\.|[^"\\])*")(?<suffix>[ \t]*,?[ \t]*)$'
    $Found = [regex]::Matches($Text, $Pattern)
    if ($Found.Count -gt 1) {
        throw "Repeated identical (case-sensitive) JSON key $Key ($File)."
    }
    if ($Found.Count -eq 1) {
        $Match = $Found[0]
        if ($Match.Groups['value'].Value -ceq $QValue) { return }
        $Replacement = $Match.Groups['prefix'].Value + $QValue + $Match.Groups['suffix'].Value
        $Text = $Text.Substring(0, $Match.Index) + $Replacement + $Text.Substring($Match.Index + $Match.Length)
    } else {
        $End = $Text.LastIndexOf('}')
        if ($End -lt 0 -or -not $Text.TrimStart().StartsWith('{')) {
            throw "Expected a JSON object for localization ($File)."
        }
        $Before = $Text.Substring(0, $End).TrimEnd()
        $Comma = if ($Before.EndsWith('{')) { '' } else { ',' }
        $Text = $Before + $Comma + "`n  " + $QKey + ': ' + $QValue + "`n" + $Text.Substring($End)
    }
    Set-Source $File $Text
}
function Update-Config {
    $File = 'src-tauri/tauri.zh.conf.json'
    $Text = Get-Source $File
    $Conf = $Text | ConvertFrom-Json
    $Window = [pscustomobject]@{label='main'; title='Aideo 中文版'; width=1000; height=700; decorations=$false; dragDropEnabled=$false}
    if ($Conf.PSObject.Properties.Match('app').Count -eq 0) {
        $Conf | Add-Member -MemberType NoteProperty -Name app -Value ([pscustomobject]@{})
    }
    if ($Conf.app.PSObject.Properties.Match('windows').Count -eq 0) {
        $Conf.app | Add-Member -MemberType NoteProperty -Name windows -Value @($Window)
    } else {
        $Conf.app.windows = @($Window)
    }
    if ($Text -notmatch '"decorations"\s*:\s*false') {
        Set-Source $File (($Conf | ConvertTo-Json -Depth 25) + "`n")
    }
}
function Update-Package {
    $File = 'package.json'
    $Text = Get-Source $File
    $Value = 'node --experimental-strip-types scripts/audit-localization.mjs && node scripts/audit-native-localization.mjs'
    if ($Text.Contains($Value)) { return }
    $Pattern = '("check:locales"\s*:\s*)"(?:\\.|[^"\\])*"'
    $Match = [regex]::Match($Text, $Pattern)
    if (-not $Match.Success -or [regex]::Matches($Text, $Pattern).Count -ne 1) {
        throw 'Cannot safely update check:locales in package.json.'
    }
    $Quoted = ConvertTo-Json -InputObject $Value -Compress
    Set-Source $File ($Text.Substring(0,$Match.Index) + $Match.Groups[1].Value + $Quoted + $Text.Substring($Match.Index + $Match.Length))
}
function Update-Locale {
    $Entries = [ordered]@{
      'Window controls'='窗口控制'; 'Minimize'='最小化'; 'Maximize'='最大化'; 'Restore'='还原';
      'Maximize or restore'='最大化/还原'; 'Close window'='关闭窗口';
      'Lock / Unlock Theater to Desktop'='锁定/解锁影院全屏'; 'Global shortcut'='全局快捷键';
      'Last.fm API key is not configured. Configure LASTFM_API_KEY in the build environment.'='Last.fm API 密钥未配置。请配置 LASTFM_API_KEY 后重新构建。';
      'Last.fm API secret is not configured. Configure LASTFM_API_SECRET in the build environment.'='Last.fm API Secret 未配置。请配置 LASTFM_API_SECRET 后重新构建。';
      'Theater locked to desktop bottom. Press the same shortcut to unlock.'='影院已锁定到底层。按相同快捷键即可解锁。';
      'Theater lock released.'='影院锁定已解除。';
      'Please enter Theater Fullscreen from Now Playing first.'='请先进入 Now Playing 的影院全屏界面。';
      'Theater lock failed: {error}'='影院锁定失败：{error}'
    }
    foreach ($Key in $Entries.Keys) { Set-JsonKeyWithoutReformat 'locales/zh-CN.json' $Key ([string]$Entries[$Key]) }
    # Do not use ConvertFrom-Json here: PowerShell 5.1 collapses differently-cased keys.
}
function Update-Workflow {
    $File = '.github/workflows/build-zh.yml'
    $Text = Get-Source $File
    if (-not $Text.Contains('npm run check:locales')) {
        $Match = [regex]::Match($Text, '(?m)^(?<indent>[ \t]*)(?:npx tsc --noEmit|npm run lint|npm test|npm run test)\b')
        if (-not $Match.Success) { throw 'Cannot locate workflow typecheck/test step for localization gate; no files changed.' }
        $Line = $Match.Groups['indent'].Value + 'npm run check:locales' + "`n"
        $Text = $Text.Insert($Match.Index, $Line)
    }
    if (-not $Text.Contains('LASTFM_API_KEY: ${{ secrets.LASTFM_API_KEY }}')) {
        $Chunks = [regex]::Split($Text,'(?m)(?=^      - name:)')
        $Matched = 0
        for ($i = 0; $i -lt $Chunks.Count; $i++) {
            $Chunk = $Chunks[$i]
            if ($Chunk -notmatch '(?i)tauri\s+--\s*build|cargo build') { continue }
            $Matched++
            if ($Chunk -match '(?m)^\s+LASTFM_API_KEY:') { continue }
            $SecretLines = '          LASTFM_API_KEY: ${{ secrets.LASTFM_API_KEY }}' + "`n" + '          LASTFM_API_SECRET: ${{ secrets.LASTFM_API_SECRET }}' + "`n"
            # Above uses a literal `$` to avoid PowerShell interpolation. Keep YAML expressions unchanged.
            if ($Chunk -match '(?m)^        env:[ \t]*$') {
                $Match = [regex]::Match($Chunk,'(?m)^        env:[ \t]*$')
                $Offset = $Match.Index + $Match.Length
                $Chunk = $Chunk.Insert($Offset, "`n" + $SecretLines.TrimEnd("`n"))
            } elseif ($Chunk -match '(?m)^        run:') {
                $Match = [regex]::Match($Chunk,'(?m)^        run:')
                $Chunk = $Chunk.Insert($Match.Index, "        env:`n" + $SecretLines)
            } else { throw 'Build step has no safely recognized run/env block; no files changed.' }
            $Chunks[$i] = $Chunk
        }
        if ($Matched -lt 1) { throw 'Could not identify a Tauri/Cargo build step. Review workflow manually; no files changed.' }
        $Text = [string]::Join('', $Chunks)
    }
    Set-Source $File $Text
}

try {
    $Required = @(
      'package.json', 'src/App.tsx', 'src/App.css', 'src/components/Sidebar.tsx',
      'src/components/LyricsPanel.tsx', 'src/components/FullscreenView.tsx',
      'src/components/SettingsView.tsx', 'src/utils/playerShortcuts.ts',
      'src/store/uiSlice.ts', 'src-tauri/src/lib.rs', 'src-tauri/src/lastfm.rs',
      'src-tauri/src/lastfm_api.rs', 'src-tauri/src/hotkeys.rs',
      'src-tauri/tauri.zh.conf.json', 'locales/zh-CN.json',
      '.github/workflows/build-zh.yml', 'src/components/WindowChrome.tsx',
      'src/test/featurePatchRegression.test.ts', 'scripts/audit-native-localization.mjs'
    )
    foreach ($File in $Required) { $null = Get-Source $File }
    $PlanPath = Join-Path $PSScriptRoot 'patch-ops.json'
    $Plan = [System.IO.File]::ReadAllText($PlanPath, $Utf8) | ConvertFrom-Json
    foreach ($Op in $Plan) {
        $Line = [double]$Op.line
        # The original JS performs these bulk transformations between the indicated anchored operations.
        if ($Line -gt 220 -and -not $script:RanLastfm) {
            Extend-Lastfm
            $script:RanLastfm = $true
        }
        if ($Line -gt 261 -and -not $script:RanLastfmApi) {
            Extend-LastfmApi
            $script:RanLastfmApi = $true
        }
        Execute-Operation $Op
    }
    Update-Config
    Update-Workflow
    Update-Package
    Update-Locale

    Write-Host ''
    Write-Host '[PASS] Native PowerShell patch preflight completed.' -ForegroundColor Green
    $Output = @($script:Changed) | Sort-Object
    Write-Host "[INFO] Pending source files: $($Output.Count)"
    foreach ($File in $Output) { Write-Host "  $File" }
    if ($Check) {
        Write-Host '[SAFE] Check mode: no repository source files were written.' -ForegroundColor Cyan
        exit 0
    }
    # Verify backups can be written before touching repository source files.
    $BackupRoot = Join-Path (Split-Path $script:Root -Parent) ('Aideo-ZH-source-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
    [System.IO.Directory]::CreateDirectory($BackupRoot) | Out-Null
    foreach ($File in $Output) {
        $Source = Join-Path $script:Root $File.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $Destination = Join-Path $BackupRoot $File.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($Destination)) | Out-Null
        [System.IO.File]::Copy($Source, $Destination, $true)
    }
    $script:WroteAny = $false
    foreach ($File in $Output) {
        $Target = Join-Path $script:Root $File.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $Content = [string]$script:Pending[$File]
        if ($script:Newlines[$File] -eq "`r`n") { $Content = $Content.Replace("`n", "`r`n") }
        [System.IO.File]::WriteAllText($Target, $Content, $Utf8)
        $script:WroteAny = $true
    }
    Write-Host "[PASS] Patch applied. Backup folder: $BackupRoot" -ForegroundColor Green
    Write-Host '[INFO] Nothing committed or pushed. Review changes in GitHub Desktop.'
    exit 0
} catch {
    Write-Host ''
    if ($script:WroteAny) {
        Write-Host '[ERROR] Patch stopped after at least one write. Review the source backup directory before retrying.' -ForegroundColor Red
    } else {
        Write-Host '[STOP] Patch preflight failed. No repository source files have been written.' -ForegroundColor Yellow
    }
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
