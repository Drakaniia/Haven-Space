@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Haven Space - New device setup
cd /d "%~dp0"

rem ============================================================
rem  Haven Space - one-time setup for a fresh clone on Windows.
rem
rem  What it does:
rem   1. Checks for git, Node.js (npm) and Bun.
rem   2. Installs anything missing (winget -> Chocolatey -> direct
rem      download; Bun via its official installer).
rem   3. Re-reads PATH from the registry so freshly installed tools
rem      (e.g. Bun) work in THIS session - no restart needed.
rem   4. Runs "bun install" at the root, workers/api and apps/web.
rem   5. Checks env files and creates workers/api/.dev.vars from the
rem      example when a fresh clone doesn't have one yet.
rem
rem  Run as Administrator for full privileges.
rem ============================================================

set "TOOLS_OK=1"
set "INSTALL_FAILED=0"

set "ADMIN=no"
net session >nul 2>&1
if not errorlevel 1 set "ADMIN=yes"

echo.
echo  ==================================================
echo    Haven Space - New device setup
echo  ==================================================
echo.
if not "%ADMIN%"=="yes" (
    echo  [!] Not running as Administrator.
    echo      Some installers may fail or install per-user only.
    echo      Recommended: right-click -^> "Run as administrator".
    echo.
)

rem ------------------------------------------------------------
rem  1. git
rem ------------------------------------------------------------
call :EnsureGit

rem ------------------------------------------------------------
rem  2. Node.js / npm
rem ------------------------------------------------------------
call :EnsureNode

rem ------------------------------------------------------------
rem  3. Bun
rem ------------------------------------------------------------
call :EnsureBun

rem ------------------------------------------------------------
rem  4. Refresh PATH from the registry so tools installed during
rem     this run are visible without opening a new terminal.
rem ------------------------------------------------------------
call :RefreshPath

rem ------------------------------------------------------------
rem  5. Verify every required tool works.
rem ------------------------------------------------------------
echo.
echo  === Verifying tools ===
call :Verify "git"  "git --version"
call :Verify "node" "node --version"
call :Verify "npm"  "npm --version"
call :Verify "bun"  "bun --version"

rem ------------------------------------------------------------
rem  6. Install dependencies (root + each subproject).
rem ------------------------------------------------------------
echo.
echo  === Installing dependencies with Bun ===
call :BunInstall "bun install"                   "root"
call :BunInstall "bun install --cwd workers/api" "workers/api"
call :BunInstall "bun install --cwd apps/web"    "apps/web"

rem ------------------------------------------------------------
rem  7. Environment files.
rem ------------------------------------------------------------
echo.
echo  === Environment files ===

if exist ".env" (
    echo  [OK] root .env found.
) else (
    echo  [WARN] No root .env found.
    echo        .env is git-ignored, so a fresh clone never has one.
    echo        Create it if the app needs root-level env vars.
)

if exist "workers\api\.dev.vars" (
    echo  [OK] workers/api/.dev.vars found.
) else (
    echo  [..] workers/api/.dev.vars missing - creating from example...
    copy /y "workers\api\.dev.vars.example" "workers\api\.dev.vars" >nul
    if errorlevel 1 (
        echo  [FAIL] Could not create workers/api/.dev.vars. Create it manually.
    ) else (
        echo  [OK] Created workers/api/.dev.vars.
        echo       Edit it and replace the placeholder values with real secrets.
    )
)

rem ------------------------------------------------------------
rem  Summary
rem ------------------------------------------------------------
echo.
echo  ==================================================
echo    Setup finished
echo  ==================================================
echo.
if not "%TOOLS_OK%"=="1" (
    echo  [!] Some tools could not be verified.
    echo      Close this window, open a NEW terminal, and run setup.bat again.
    echo.
)
if not "%INSTALL_FAILED%"=="0" (
    echo  [!] Some dependency installs failed. Fix the errors above, then re-run.
    echo.
)
echo  Next steps:
echo    bun run cf:api:dev    API dev server  -^> http://localhost:8000
echo    bun run web:dev       frontend dev    -^> http://localhost:3000
echo    bun run db:setup      apply local D1 migrations
echo.
echo  If anything was installed in this session, open a new terminal
echo  afterwards so the PATH changes stick for future sessions.
echo.
pause
exit /b 0

rem ============================================================
rem  Subroutines
rem ============================================================

:EnsureGit
where git >nul 2>&1
if not errorlevel 1 (
    echo  [OK] git found.
    exit /b 0
)
echo  [..] git not found - installing...
call :InstallGit
exit /b %errorlevel%

:InstallGit
where winget >nul 2>&1
if not errorlevel 1 (
    echo       Trying winget...
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements --silent --disable-interactivity
    if not errorlevel 1 exit /b 0
)
where choco >nul 2>&1
if not errorlevel 1 (
    echo       Trying Chocolatey...
    choco install git -y
    if not errorlevel 1 exit /b 0
)
echo       Trying direct download (Git for Windows)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $rel=Invoke-RestMethod 'https://api.github.com/repos/git-for-windows/git/releases/latest'; $exe=$rel.assets | Where-Object { $_.name -match '^Git-[\d.]+-64-bit\.exe$' } | Select-Object -First 1; if (-not $exe) { throw 'no 64-bit Git installer asset found' }; $tmp=Join-Path $env:TEMP $exe.name; Invoke-WebRequest -Uri $exe.browser_download_url -OutFile $tmp; $p=Start-Process -FilePath $tmp -ArgumentList '/VERYSILENT','/NORESTART','/NOCANCEL','/SP-','/CLOSEAPPLICATIONS' -Wait -PassThru; Remove-Item $tmp -Force; if ($p.ExitCode -ne 0) { throw ('installer failed with code ' + $p.ExitCode) }"
exit /b %errorlevel%

:EnsureNode
where node >nul 2>&1
if not errorlevel 1 (
    echo  [OK] node found.
    exit /b 0
)
where npm >nul 2>&1
if not errorlevel 1 (
    echo  [OK] npm found.
    exit /b 0
)
echo  [..] Node.js/npm not found - installing...
call :InstallNode
exit /b %errorlevel%

:InstallNode
where winget >nul 2>&1
if not errorlevel 1 (
    echo       Trying winget...
    winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements --silent --disable-interactivity
    if not errorlevel 1 exit /b 0
)
where choco >nul 2>&1
if not errorlevel 1 (
    echo       Trying Chocolatey...
    choco install nodejs-lts -y
    if not errorlevel 1 exit /b 0
)
echo       Trying direct download (Node.js LTS MSI)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $idx=Invoke-RestMethod 'https://nodejs.org/dist/index.json'; $lts=$idx | Where-Object { $_.lts } | Select-Object -First 1; $ver=$lts.version; $msi=Join-Path $env:TEMP ('node-'+$ver+'-x64.msi'); Invoke-WebRequest -Uri ('https://nodejs.org/dist/'+$ver+'/node-'+$ver+'-x64.msi') -OutFile $msi; $p=Start-Process msiexec -ArgumentList @('/i','"'+$msi+'"','/qn','/norestart') -Wait -PassThru; Remove-Item $msi -Force; if ($p.ExitCode -ne 0) { throw ('msiexec failed with code ' + $p.ExitCode) }"
exit /b %errorlevel%

:EnsureBun
where bun >nul 2>&1
if not errorlevel 1 (
    echo  [OK] bun found.
    exit /b 0
)
echo  [..] Bun not found - installing via the official installer...
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm bun.sh/install.ps1 | iex"
exit /b %errorlevel%

:RefreshPath
rem Pull the latest machine + user PATH out of the registry so tools
rem installed in this session (e.g. Bun) are found without a restart.
rem Note: this replaces the inherited PATH with the registry values (the
rem same thing a normal login gets) instead of merging, so it stays under
rem cmd's 8191-char line limit even on machines with very long PATHs.
set "SYS_PATH="
set "USER_PATH="
for /f "skip=2 tokens=1,2,*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYS_PATH=%%C"
for /f "skip=2 tokens=1,2,*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USER_PATH=%%C"
if defined SYS_PATH if defined USER_PATH call set "PATH=%%SYS_PATH%%;%%USER_PATH%%"
if defined SYS_PATH if not defined USER_PATH call set "PATH=%%SYS_PATH%%"
if not defined SYS_PATH if defined USER_PATH set "PATH=%USER_PATH%"
rem Belt-and-braces: Bun installs to %USERPROFILE%\.bun\bin.
where bun >nul 2>&1
if errorlevel 1 (
    if exist "%USERPROFILE%\.bun\bin\bun.exe" set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
    if exist "%LOCALAPPDATA%\.bun\bin\bun.exe" set "PATH=%LOCALAPPDATA%\.bun\bin;%PATH%"
)
exit /b 0

:Verify
rem %1 = tool name, %2 = command that prints its version
where "%~1" >nul 2>&1
if errorlevel 1 (
    set "TOOLS_OK=0"
    echo  [FAIL] %~1 could not be found.
    echo         It may have just been installed, but this session's PATH is stale.
    echo         Close this window, open a NEW terminal, and re-run setup.bat.
    exit /b 1
)
echo  [OK] %~1:
call %~2
exit /b 0

:BunInstall
rem %1 = full command, %2 = friendly label
echo  [..] Installing %~2 dependencies...
call %~1
if errorlevel 1 (
    set "INSTALL_FAILED=1"
    echo  [FAIL] %~2 install failed.
    echo         Check the error above. Common causes:
    echo           - no network access
    echo           - stale Bun: run "bun upgrade" then re-run this script
) else (
    echo  [OK] %~2 dependencies installed.
)
exit /b 0
