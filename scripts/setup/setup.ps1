<#
.SYNOPSIS
  Haven Space - one-time setup for a fresh clone on Windows (PowerShell).

.DESCRIPTION
  PowerShell twin of setup.bat - pick whichever you prefer; both do the
  same thing and both drive winget / Chocolatey natively.

  What it does:
    1. Checks for git, Node.js (npm) and Bun.
    2. Installs anything missing (winget -> Chocolatey -> direct
       download; Bun via its official installer).
    3. Re-reads PATH from the registry so freshly installed tools
       (e.g. Bun) work in THIS session - no restart needed.
    4. Runs "bun install" at the root, workers/api and apps/web.
    5. Checks env files and creates workers/api/.dev.vars from the
       example when a fresh clone doesn't have one yet.

  Run as Administrator for full privileges.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\setup.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'

$script:ToolsOk = $true
$script:InstallFailed = $false

# Work from the folder this script lives in.
Set-Location $PSScriptRoot

# ============================================================
#  Helpers
# ============================================================

function Test-Tool {
    param([string]$Name)
    return [bool](Get-Command -Name $Name -ErrorAction SilentlyContinue)
}

function Update-PathFromRegistry {
    # Pull the latest machine + user PATH out of the registry so tools
    # installed in this session (e.g. Bun) are found without a restart.
    # This replaces the inherited PATH with the registry values (the same
    # thing a normal login gets) instead of merging.
    $sysPath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if ($sysPath -and $userPath) { $env:Path = "$sysPath;$userPath" }
    elseif ($sysPath) { $env:Path = $sysPath }
    elseif ($userPath) { $env:Path = $userPath }

    # Belt-and-braces: Bun installs to %USERPROFILE%\.bun\bin.
    if (-not (Test-Tool 'bun')) {
        $candidates = @(
            (Join-Path $env:USERPROFILE '.bun\bin'),
            (Join-Path $env:LOCALAPPDATA '.bun\bin')
        )
        foreach ($dir in $candidates) {
            if (Test-Path (Join-Path $dir 'bun.exe')) {
                $env:Path = "$dir;$env:Path"
            }
        }
    }
}

function Verify-Tool {
    param([string]$Name)
    if (-not (Test-Tool $Name)) {
        $script:ToolsOk = $false
        Write-Host "  [FAIL] $Name could not be found."
        Write-Host "         It may have just been installed, but this session's PATH is stale."
        Write-Host '         Close this window, open a NEW terminal, and re-run setup.ps1.'
        return
    }
    Write-Host "  [OK] ${Name}:"
    & $Name --version
}

function Invoke-BunInstall {
    param([string[]]$Arguments, [string]$Label)
    Write-Host "  [..] Installing $Label dependencies..."
    try {
        & bun @Arguments
        if ($LASTEXITCODE -ne 0) { throw "bun install exited with code $LASTEXITCODE" }
        Write-Host "  [OK] $Label dependencies installed."
    }
    catch {
        $script:InstallFailed = $true
        Write-Host "  [FAIL] $Label install failed."
        Write-Host '         Check the error above. Common causes:'
        Write-Host '           - no network access'
        Write-Host '           - stale Bun: run "bun upgrade" then re-run this script'
    }
}

# ============================================================
#  Installers (winget -> Chocolatey -> direct download)
# ============================================================

function Install-Git {
    if (Test-Tool 'winget') {
        Write-Host '       Trying winget...'
        winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements --silent --disable-interactivity
        if ($LASTEXITCODE -eq 0) { return $true }
    }
    if (Test-Tool 'choco') {
        Write-Host '       Trying Chocolatey...'
        choco install git -y
        if ($LASTEXITCODE -eq 0) { return $true }
    }
    Write-Host '       Trying direct download (Git for Windows)...'
    try {
        $ErrorActionPreference = 'Stop'
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $rel = Invoke-RestMethod 'https://api.github.com/repos/git-for-windows/git/releases/latest'
        $asset = $rel.assets | Where-Object { $_.name -match '^Git-[\d.]+-64-bit\.exe$' } | Select-Object -First 1
        if (-not $asset) { throw 'no 64-bit Git installer asset found' }
        $tmp = Join-Path $env:TEMP $asset.name
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tmp
        $p = Start-Process -FilePath $tmp -ArgumentList '/VERYSILENT','/NORESTART','/NOCANCEL','/SP-','/CLOSEAPPLICATIONS' -Wait -PassThru
        Remove-Item $tmp -Force
        if ($p.ExitCode -ne 0) { throw "installer failed with code $($p.ExitCode)" }
        return $true
    }
    catch {
        Write-Host "       Direct download failed: $($_.Exception.Message)"
        return $false
    }
    finally {
        $ErrorActionPreference = 'Continue'
    }
}

function Install-Node {
    if (Test-Tool 'winget') {
        Write-Host '       Trying winget...'
        winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements --silent --disable-interactivity
        if ($LASTEXITCODE -eq 0) { return $true }
    }
    if (Test-Tool 'choco') {
        Write-Host '       Trying Chocolatey...'
        choco install nodejs-lts -y
        if ($LASTEXITCODE -eq 0) { return $true }
    }
    Write-Host '       Trying direct download (Node.js LTS MSI)...'
    try {
        $ErrorActionPreference = 'Stop'
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $idx = Invoke-RestMethod 'https://nodejs.org/dist/index.json'
        $lts = $idx | Where-Object { $_.lts } | Select-Object -First 1
        if (-not $lts) { throw 'could not resolve the latest Node.js LTS version' }
        $ver = $lts.version
        $msi = Join-Path $env:TEMP "node-$ver-x64.msi"
        Invoke-WebRequest -Uri "https://nodejs.org/dist/$ver/node-$ver-x64.msi" -OutFile $msi
        $p = Start-Process msiexec -ArgumentList @('/i', ('"' + $msi + '"'), '/qn', '/norestart') -Wait -PassThru
        Remove-Item $msi -Force
        if ($p.ExitCode -ne 0) { throw "msiexec failed with code $($p.ExitCode)" }
        return $true
    }
    catch {
        Write-Host "       Direct download failed: $($_.Exception.Message)"
        return $false
    }
    finally {
        $ErrorActionPreference = 'Continue'
    }
}

function Install-Bun {
    Write-Host '  [..] Bun not found - installing via the official installer...'
    try {
        $ErrorActionPreference = 'Stop'
        Invoke-RestMethod 'https://bun.sh/install.ps1' | Invoke-Expression
        return $true
    }
    catch {
        Write-Host "       Bun install failed: $($_.Exception.Message)"
        return $false
    }
    finally {
        $ErrorActionPreference = 'Continue'
    }
}

# ============================================================
#  Ensure steps
# ============================================================

function Ensure-Git {
    if (Test-Tool 'git') {
        Write-Host '  [OK] git found.'
        return
    }
    Write-Host '  [..] git not found - installing...'
    Install-Git | Out-Null
}

function Ensure-Node {
    if ((Test-Tool 'node') -or (Test-Tool 'npm')) {
        Write-Host '  [OK] node found.'
        return
    }
    Write-Host '  [..] Node.js/npm not found - installing...'
    Install-Node | Out-Null
}

function Ensure-Bun {
    if (Test-Tool 'bun') {
        Write-Host '  [OK] bun found.'
        return
    }
    Install-Bun | Out-Null
}

# ============================================================
#  Main
# ============================================================

try {
    $Host.UI.RawUI.WindowTitle = 'Haven Space - New device setup'
}
catch {
    # Not a console host (e.g. ISE) - no problem.
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

Write-Host ''
Write-Host '  =================================================='
Write-Host '    Haven Space - New device setup'
Write-Host '  =================================================='
Write-Host ''
if (-not $isAdmin) {
    Write-Host '  [!] Not running as Administrator.'
    Write-Host '      Some installers may fail or install per-user only.'
    Write-Host '      Recommended: right-click -> "Run as administrator".'
    Write-Host ''
}

Write-Host '  === 1/5 Checking tools ==='
Ensure-Git
Ensure-Node
Ensure-Bun

Write-Host ''
Write-Host '  === 2/5 Refreshing PATH from registry ==='
Update-PathFromRegistry

Write-Host ''
Write-Host '  === 3/5 Verifying tools ==='
Verify-Tool 'git'
Verify-Tool 'node'
Verify-Tool 'npm'
Verify-Tool 'bun'

Write-Host ''
Write-Host '  === 4/5 Installing dependencies with Bun ==='
Invoke-BunInstall -Arguments @('install') -Label 'root'
Invoke-BunInstall -Arguments @('install', '--cwd', 'workers/api') -Label 'workers/api'
Invoke-BunInstall -Arguments @('install', '--cwd', 'apps/web') -Label 'apps/web'

Write-Host ''
Write-Host '  === 5/5 Environment files ==='

if (Test-Path '.env') {
    Write-Host '  [OK] root .env found.'
}
else {
    Write-Host '  [WARN] No root .env found.'
    Write-Host '        .env is git-ignored, so a fresh clone never has one.'
    Write-Host '        Create it if the app needs root-level env vars.'
}

if (Test-Path 'workers\api\.dev.vars') {
    Write-Host '  [OK] workers/api/.dev.vars found.'
}
else {
    Write-Host '  [..] workers/api/.dev.vars missing - creating from example...'
    try {
        Copy-Item 'workers\api\.dev.vars.example' 'workers\api\.dev.vars'
        Write-Host '  [OK] Created workers/api/.dev.vars.'
        Write-Host '       Edit it and replace the placeholder values with real secrets.'
    }
    catch {
        Write-Host '  [FAIL] Could not create workers/api/.dev.vars. Create it manually.'
    }
}

Write-Host ''
Write-Host '  =================================================='
Write-Host '    Setup finished'
Write-Host '  =================================================='
Write-Host ''
if (-not $script:ToolsOk) {
    Write-Host '  [!] Some tools could not be verified.'
    Write-Host '      Close this window, open a NEW terminal, and run setup.ps1 again.'
    Write-Host ''
}
if ($script:InstallFailed) {
    Write-Host '  [!] Some dependency installs failed. Fix the errors above, then re-run.'
    Write-Host ''
}
Write-Host '  Next steps:'
Write-Host '    bun run cf:api:dev    API dev server  -> http://localhost:8000'
Write-Host '    bun run web:dev       frontend dev    -> http://localhost:3000'
Write-Host '    bun run db:setup      apply local D1 migrations'
Write-Host ''
Write-Host '  If anything was installed in this session, open a new terminal'
Write-Host '  afterwards so the PATH changes stick for future sessions.'
Write-Host ''
Read-Host 'Press Enter to exit...'
exit 0
