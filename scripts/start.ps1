Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "       Starting CivicOps Local Development        " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Start PostgreSQL via Docker Compose if available
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "[INFO] Starting PostgreSQL database via Docker Compose..." -ForegroundColor Cyan
    Set-Location backend
    docker compose up -d postgres
    Set-Location ..
} else {
    Write-Host "[WARN] Docker not found. Please ensure local PostgreSQL is running on port 5432." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "To run the full stack locally in development:" -ForegroundColor Green
Write-Host "1. Backend:  cd backend && mvn spring-boot:run" -ForegroundColor Yellow
Write-Host "2. Frontend: npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "Local URLs:" -ForegroundColor Cyan
Write-Host " - Frontend:    http://localhost:3000" -ForegroundColor White
Write-Host " - Backend API: http://localhost:8080/api/v1" -ForegroundColor White
Write-Host " - Health Check: http://localhost:8080/actuator/health" -ForegroundColor White
