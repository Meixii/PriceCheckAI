@echo off
echo ========================================
echo  J5 PriceCheck AI - Quick Start
echo ========================================
echo.

echo Starting Electron application...
echo.
call npm run electron

if %errorlevel% neq 0 (
    echo ERROR: Failed to start Electron application
    echo Make sure dependencies are installed by running install-and-run.bat first
    pause
    exit /b 1
)

echo.
echo Application closed successfully. 