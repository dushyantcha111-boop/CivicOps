$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "    CivicOps Local Full-Stack Launcher (Win11)    " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Test-PortInUse {
    param([int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $conn
}

function Require-Tool {
    param([string]$Name, [string]$Hint)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Host "[ERROR] Missing required tool '$Name'. $Hint" -ForegroundColor Red
        exit 1
    }
}

Require-Tool "node" "Install Node.js LTS (v20+): https://nodejs.org/"
Require-Tool "npm" "Install Node.js LTS (includes npm): https://nodejs.org/"
Require-Tool "java" "Install Java 17 (Temurin JDK 17): https://adoptium.net/"
Require-Tool "mvn" "Install Apache Maven 3.8+: https://maven.apache.org/"

# Ensure .env files exist from templates without overwriting existing config
if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Write-Host "[INFO] Created root .env from .env.example" -ForegroundColor Gray
}
if (-not (Test-Path "backend\.env") -and (Test-Path "backend\.env.example")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "[INFO] Created backend\.env from backend\.env.example" -ForegroundColor Gray
}

# Install frontend dependencies if missing
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Installing frontend dependencies via npm ci..." -ForegroundColor Cyan
    npm ci
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

# 1. Start PostgreSQL on port 5432 if not already listening
if (Test-PortInUse 5432) {
    Write-Host "[OK] PostgreSQL already listening on port 5432 (preserving existing data)." -ForegroundColor Green
} elseif (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "[INFO] Starting PostgreSQL container via Docker Compose (volume preserved)..." -ForegroundColor Cyan
    Push-Location "$RepoRoot\backend"
    docker compose up -d postgres
    Pop-Location
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to start Docker PostgreSQL container. Is Docker Desktop running?" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[ERROR] Port 5432 is not listening and Docker is unavailable. Start PostgreSQL on port 5432 first." -ForegroundColor Red
    exit 1
}

# 2. Launch Spring Boot Backend on port 8080 (avoid duplicate process)
if (Test-PortInUse 8080) {
    Write-Host "[OK] Backend already listening on port 8080. Skipping duplicate launch." -ForegroundColor Green
} else {
    Write-Host "[INFO] Launching Spring Boot backend on port 8080..." -ForegroundColor Cyan
    $BackendCmd = "Set-Location '$RepoRoot\backend'; mvn spring-boot:run"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendCmd -WindowStyle Normal
}

# Wait up to 60s for backend health endpoint
Write-Host "[INFO] Waiting for backend health check at http://localhost:8080/api/v1/actuator/health ..." -ForegroundColor Cyan
$BackendReady = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/actuator/health" -TimeoutSec 2 -ErrorAction Stop
        if ($resp.status -eq "UP") {
            $BackendReady = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}

if ($BackendReady) {
    Write-Host "[OK] Backend API is UP!" -ForegroundColor Green
} else {
    Write-Host "[WARN] Backend is still starting in its PowerShell window. Check that window for Maven/Flyway logs." -ForegroundColor Yellow
}

# 3. Launch Vite Frontend on port 3000 (avoid duplicate process)
if (Test-PortInUse 3000) {
    Write-Host "[OK] Frontend dev server already listening on port 3000. Skipping duplicate launch." -ForegroundColor Green
} else {
    Write-Host "[INFO] Launching Vite React dev server on port 3000..." -ForegroundColor Cyan
    $FrontendCmd = "Set-Location '$RepoRoot'; npm run dev"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $FrontendCmd -WindowStyle Normal
}

Write-Host ""
Write-Host "CivicOps Local URLs:" -ForegroundColor Cyan
Write-Host " - Frontend UI:     http://localhost:3000" -ForegroundColor White
Write-Host " - Backend API:     http://localhost:8080/api/v1" -ForegroundColor White
Write-Host " - Actuator Health: http://localhost:8080/api/v1/actuator/health" -ForegroundColor White
Write-Host " - PostgreSQL:      localhost:5432 (db: civicops_db)" -ForegroundColor White
Write-Host ""
Write-Host "To stop services cleanly without deleting DB volumes, run: .\scripts\stop-local.ps1" -ForegroundColor Gray
