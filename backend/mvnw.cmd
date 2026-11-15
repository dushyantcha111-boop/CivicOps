@echo off
REM Maven Wrapper startup script for Windows
setlocal

echo [CivicOps] Checking Maven execution...
mvn -version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Maven (mvn) is not found in your system PATH.
    echo Please install Maven or add it to your PATH environment variable.
    exit /b 1
)

mvn %*
endlocal
