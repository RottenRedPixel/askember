@echo off
echo Testing AskEmber API Connections...
echo ====================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: Please run this script from the AskEmber project root directory
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

REM Run the test script
echo.
echo Running API connection tests...
node api-connection-test.js

echo.
echo Test completed. Press any key to close...
pause >nul
