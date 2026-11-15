Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "        CivicOps Local Environment Setup          " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Setup Environment Files
if (!(Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "[INFO] Created root .env file from .env.example" -ForegroundColor Green
    }
}

# 2. Install Frontend Dependencies
Write-Host "[INFO] Installing frontend dependencies (npm ci)..." -ForegroundColor Cyan
npm ci

# 3. Build Backend
Write-Host "[INFO] Resolving backend Maven dependencies..." -ForegroundColor Cyan
Set-Location backend
if (Test-Path "mvnw.cmd") {
    .\mvnw.cmd clean compile -DskipTests
} else {
    mvn clean compile -DskipTests
}
Set-Location ..

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Setup completed successfully! Run scripts/start.ps1 to launch." -ForegroundColor Green
