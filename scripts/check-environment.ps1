Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "      CivicOps Local Environment Health Check     " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$allPassed = $true

# Check Git
if (Get-Command git -ErrorAction SilentlyContinue) {
    $gitVer = (git --version)
    Write-Host "[PASS] Git found: $gitVer" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Git is not installed or not in PATH." -ForegroundColor Red
    $allPassed = $false
}

# Check Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = (node -v)
    Write-Host "[PASS] Node.js found: $nodeVer" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Node.js is not installed or not in PATH." -ForegroundColor Red
    $allPassed = $false
}

# Check npm
if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmVer = (npm -v)
    Write-Host "[PASS] npm found: v$npmVer" -ForegroundColor Green
} else {
    Write-Host "[FAIL] npm is not installed or not in PATH." -ForegroundColor Red
    $allPassed = $false
}

# Check Java
if (Get-Command java -ErrorAction SilentlyContinue) {
    $javaVer = (java -version 2>&1 | Select-Object -First 1)
    Write-Host "[PASS] Java found: $javaVer" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Java JDK 17 is not installed or not in PATH." -ForegroundColor Red
    $allPassed = $false
}

# Check Maven
if (Get-Command mvn -ErrorAction SilentlyContinue) {
    $mvnVer = (mvn -version 2>&1 | Select-Object -First 1)
    Write-Host "[PASS] Maven found: $mvnVer" -ForegroundColor Green
} else {
    Write-Host "[WARN] Maven (mvn) not found in system PATH. Ensure backend/mvnw.cmd is available." -ForegroundColor Yellow
}

# Check Docker
if (Get-Command docker -ErrorAction SilentlyContinue) {
    $dockerVer = (docker --version)
    Write-Host "[PASS] Docker found: $dockerVer" -ForegroundColor Green
} else {
    Write-Host "[WARN] Docker Desktop not found. PostgreSQL will need to be installed locally." -ForegroundColor Yellow
}

Write-Host "==================================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "Environment check completed!" -ForegroundColor Green
} else {
    Write-Host "Some prerequisites are missing. Please review items above." -ForegroundColor Yellow
}
