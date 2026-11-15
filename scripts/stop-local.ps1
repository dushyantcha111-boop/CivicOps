$ErrorActionPreference = "Continue"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "    Stopping CivicOps Local Development Stack     " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Stop-PortListener {
    param([int]$Port, [string]$ServiceName)
    $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if (-not $listeners) {
        Write-Host "[INFO] No active $ServiceName listener found on port $Port." -ForegroundColor Gray
        return
    }
    foreach ($procId in $listeners) {
        try {
            $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
            Write-Host "[INFO] Stopping $ServiceName (PID $procId - $($proc.ProcessName)) on port $Port..." -ForegroundColor Yellow
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Host "[WARN] Could not terminate PID ${procId}: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

Stop-PortListener -Port 3000 -ServiceName "Vite Frontend"
Stop-PortListener -Port 8080 -ServiceName "Spring Boot Backend"

if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "[INFO] Stopping PostgreSQL container (volumes preserved)..." -ForegroundColor Cyan
    Push-Location "$RepoRoot\backend"
    docker compose stop postgres
    Pop-Location
    Write-Host "[SUCCESS] PostgreSQL stopped safely without deleting persistent data." -ForegroundColor Green
} else {
    Write-Host "[INFO] Docker CLI not detected. Local PostgreSQL service (if any) left untouched." -ForegroundColor Yellow
}
