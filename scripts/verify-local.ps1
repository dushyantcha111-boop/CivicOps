$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "    CivicOps Full-Stack Verification Script       " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host ""
Write-Host "[1/5] Frontend TypeScript lint check (npm run lint)..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "[2/5] Frontend unit tests (npm test)..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "[3/5] Frontend production build (npm run build)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "[4/5] Backend Maven unit & security tests (mvn test)..." -ForegroundColor Yellow
if (Get-Command mvn -ErrorAction SilentlyContinue) {
    Push-Location "$RepoRoot\backend"
    mvn test
    $MvnExit = $LASTEXITCODE
    Pop-Location
    if ($MvnExit -ne 0) { exit 1 }
} else {
    Write-Host "[ERROR] Maven (mvn) not found in PATH." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[5/5] Live endpoint probe (if servers are running)..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/actuator/health" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "[PASS] Backend health UP: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Backend not currently reachable on http://localhost:8080/api/v1/actuator/health" -ForegroundColor Yellow
}

try {
    $fe = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "[PASS] Frontend HTTP $($fe.StatusCode) at http://localhost:3000" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Frontend not currently reachable on http://localhost:3000" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[SUCCESS] Verification checks completed." -ForegroundColor Green
