@echo off
echo ========================================
echo  J5 PriceCheck AI - Development Script
echo ========================================
echo.

echo [1/3] Installing root dependencies (including Electron)...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install root dependencies
    pause
    exit /b 1
)

echo.
echo [2/3] Dependencies installed successfully!
echo Note: Backend and frontend dependencies are installed automatically via postinstall script.

echo.
echo [3/3] Starting Electron application in development mode...
echo This will start both frontend (Vite) and backend (Express) servers, then launch Electron.
echo.
call npm run electron-dev

if %errorlevel% neq 0 (
    echo ERROR: Failed to start Electron application in development mode
    pause
    exit /b 1
)

echo.
echo Application closed successfully. 