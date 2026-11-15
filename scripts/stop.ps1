Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "        Stopping CivicOps Local Services          " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "[INFO] Stopping PostgreSQL container (preserving persistent volume)..." -ForegroundColor Cyan
    Set-Location backend
    docker compose stop postgres
    Set-Location ..
    Write-Host "[SUCCESS] Database stopped safely." -ForegroundColor Green
} else {
    Write-Host "[INFO] Docker not found. Stop your local PostgreSQL service manually if needed." -ForegroundColor Yellow
}
