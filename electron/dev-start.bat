@echo off
title PriceCheck AI - Development Mode
echo.
echo =============================================
echo    PriceCheck AI Control Panel - Dev Mode
echo =============================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version

echo.
echo Installing/updating dependencies...
call npm install

if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Starting PriceCheck AI Control Panel in development mode...
echo.
echo Developer Tips:
echo - Press Ctrl+Shift+I to open Chrome DevTools
echo - Press Ctrl+R to reload the application
echo - Check console for detailed logging
echo.
echo Starting in 3 seconds...
timeout /t 3 /nobreak >nul

call npm run dev

echo.
echo Application closed.
pause 