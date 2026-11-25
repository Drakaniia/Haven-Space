$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$DbDir = Join-Path $Root ".wrangler\demo-video"
$ApiDir = Join-Path $Root "workers\api"
$WebDir = Join-Path $Root "apps\web"
$SeedFile = Join-Path $Root "scripts\video\seed-demo.sql"
$OutDir = Join-Path $Root "output"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

Write-Host "==> 1. Resetting isolated demo D1 database..." -ForegroundColor Cyan
if (Test-Path $DbDir) {
    Remove-Item -Recurse -Force $DbDir
}

Push-Location $ApiDir
try {
    echo "y" | npx wrangler d1 migrations apply haven-space --local --persist-to $DbDir
    if ($LASTEXITCODE -ne 0) { throw "Migrations failed" }

    npx wrangler d1 execute haven-space --local --persist-to $DbDir --file="$SeedFile"
    if ($LASTEXITCODE -ne 0) { throw "Seed failed" }
}
finally {
    Pop-Location
}

Write-Host "==> 2. Starting local API (:8000) and Web (:3000)..." -ForegroundColor Cyan
$ApiProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d `"$ApiDir`" && npx wrangler dev --port 8000 --persist-to `"$DbDir`"" -RedirectStandardOutput "$OutDir\api.log" -RedirectStandardError "$OutDir\api.err.log" -PassThru -WindowStyle Hidden
$WebProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d `"$WebDir`" && npx vite dev --port 3000" -RedirectStandardOutput "$OutDir\web.log" -RedirectStandardError "$OutDir\web.err.log" -PassThru -WindowStyle Hidden

function Wait-Http($Url, $TimeoutSec = 90) {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
            if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
                return $true
            }
        } catch [System.Net.WebException] {
            if ($_.Exception.Response) {
                return $true
            }
        } catch {
            # retry
        }
        Start-Sleep -Milliseconds 700
    }
    throw "Timed out waiting for $Url"
}

try {
    Wait-Http "http://127.0.0.1:8000/health" 90 | Out-Null
    Write-Host "    API ready at http://127.0.0.1:8000" -ForegroundColor Green
    Wait-Http "http://localhost:3000/" 90 | Out-Null
    Write-Host "    Web ready at http://localhost:3000" -ForegroundColor Green

    $env:HAVEN_WEB_URL = "http://localhost:3000"
    $env:HAVEN_API_URL = "http://127.0.0.1:8000"

    Write-Host "==> 3. Recording walkthrough chapters with Playwright..." -ForegroundColor Cyan
    python (Join-Path $Root "scripts\video\record_walkthrough.py")
    if ($LASTEXITCODE -ne 0) { throw "Playwright recording failed" }

    Write-Host "==> 4. Assembling 1080p MP4s with FFmpeg..." -ForegroundColor Cyan
    python (Join-Path $Root "scripts\video\assemble_videos.py")
    if ($LASTEXITCODE -ne 0) { throw "FFmpeg assembly failed" }

    Write-Host "==> Done! Output videos in $Root\output\videos" -ForegroundColor Green
}
finally {
    Write-Host "==> Cleaning up dev servers..." -ForegroundColor Yellow
    if ($ApiProc -and !$ApiProc.HasExited) {
        cmd /c "taskkill /PID $($ApiProc.Id) /T /F" 2>$null | Out-Null
    }
    if ($WebProc -and !$WebProc.HasExited) {
        cmd /c "taskkill /PID $($WebProc.Id) /T /F" 2>$null | Out-Null
    }
}
