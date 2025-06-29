@echo off
title PriceCheck AI - Build Installer
echo.
echo =============================================
echo    PriceCheck AI Control Panel Builder
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
echo Installing dependencies...
call npm install

if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Building Windows installer...
echo This may take several minutes...
echo.

call npm run dist

if errorlevel 1 (
    echo.
    echo ERROR: Build failed!
    echo Check the error messages above for details.
    pause
    exit /b 1
) else (
    echo.
    echo =============================================
    echo    BUILD SUCCESSFUL!
    echo =============================================
    echo.
    echo The installer has been created in the 'dist' folder:
    echo - PriceCheck-AI-Control-Panel-Setup-1.0.0.exe
    echo - PriceCheck-AI-Control-Panel-Portable-1.0.0.exe
    echo.
    echo You can now distribute these files to install
    echo PriceCheck AI on other computers.
    echo.
    pause
    
    echo.
    echo Would you like to open the dist folder?
    choice /c YN /m "Open dist folder? (Y/N)"
    if errorlevel 2 goto end
    if errorlevel 1 explorer dist
)

:end
echo.
echo Build process completed.
pause 