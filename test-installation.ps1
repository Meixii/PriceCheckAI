# Test Installation Script for PriceCheck AI
Write-Host "🧪 Testing PriceCheck AI Installation" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Test 1: Check if all required files exist
Write-Host "Test 1: Checking required files..." -ForegroundColor Yellow

$requiredFiles = @(
    "package.json",
    "electron/main.js",
    "electron/preload.js", 
    "electron/splash.html",
    "electron/control-panel.html",
    "electron/control-panel.js",
    "frontend/package.json",
    "backend/package.json",
    "logo.png"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file (MISSING)" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if ($allFilesExist) {
    Write-Host "✅ All required files present" -ForegroundColor Green
} else {
    Write-Host "❌ Some files are missing" -ForegroundColor Red
}

# Test 2: Check if node_modules exist
Write-Host "`nTest 2: Checking dependencies..." -ForegroundColor Yellow

$nodeModulesPaths = @(
    "node_modules",
    "frontend/node_modules", 
    "backend/node_modules"
)

$allDepsInstalled = $true
foreach ($path in $nodeModulesPaths) {
    if (Test-Path $path) {
        Write-Host "  ✅ $path" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $path (MISSING)" -ForegroundColor Red
        $allDepsInstalled = $false
    }
}

if ($allDepsInstalled) {
    Write-Host "✅ All dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Some dependencies are missing" -ForegroundColor Red
}

# Test 3: Check package.json scripts
Write-Host "`nTest 3: Checking package.json scripts..." -ForegroundColor Yellow

try {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $requiredScripts = @("electron", "electron-dev", "dist", "dist:win")
    
    $allScriptsExist = $true
    foreach ($script in $requiredScripts) {
        if ($packageJson.scripts.$script) {
            Write-Host "  ✅ $script script" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $script script (MISSING)" -ForegroundColor Red
            $allScriptsExist = $false
        }
    }
    
    if ($allScriptsExist) {
        Write-Host "✅ All required scripts present" -ForegroundColor Green
    } else {
        Write-Host "❌ Some scripts are missing" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error reading package.json" -ForegroundColor Red
}

# Summary
Write-Host "`n📊 Test Summary" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan

if ($allFilesExist -and $allDepsInstalled -and $allScriptsExist) {
    Write-Host "🎉 Installation test PASSED!" -ForegroundColor Green
    Write-Host "You can now run: npm run electron" -ForegroundColor White
} else {
    Write-Host "❌ Installation test FAILED!" -ForegroundColor Red
    Write-Host "Please run the install.ps1 script again" -ForegroundColor Yellow
}

Write-Host "Test completed!"