const path = require('path');
const fs = require('fs');

console.log('=== PriceCheck AI Setup Test ===\n');

// Test path resolution
const electronDir = __dirname;
const backendPath = path.join(electronDir, '..', 'backend');
const frontendPath = path.join(electronDir, '..', 'frontend');

console.log('Paths:');
console.log(`- Electron dir: ${electronDir}`);
console.log(`- Backend path: ${backendPath}`);
console.log(`- Frontend path: ${frontendPath}`);
console.log();

// Test if directories exist
console.log('Directory checks:');
console.log(`- Backend exists: ${fs.existsSync(backendPath)}`);
console.log(`- Frontend exists: ${fs.existsSync(frontendPath)}`);
console.log();

// Test if package.json files exist
const backendPackageJson = path.join(backendPath, 'package.json');
const frontendPackageJson = path.join(frontendPath, 'package.json');

console.log('Package.json checks:');
console.log(`- Backend package.json exists: ${fs.existsSync(backendPackageJson)}`);
console.log(`- Frontend package.json exists: ${fs.existsSync(frontendPackageJson)}`);
console.log();

// Test if node_modules exist
const backendNodeModules = path.join(backendPath, 'node_modules');
const frontendNodeModules = path.join(frontendPath, 'node_modules');

console.log('Node modules checks:');
console.log(`- Backend node_modules exists: ${fs.existsSync(backendNodeModules)}`);
console.log(`- Frontend node_modules exists: ${fs.existsSync(frontendNodeModules)}`);
console.log();

// Read package.json info
if (fs.existsSync(backendPackageJson)) {
    try {
        const backendPkg = JSON.parse(fs.readFileSync(backendPackageJson, 'utf8'));
        console.log('Backend package info:');
        console.log(`- Name: ${backendPkg.name}`);
        console.log(`- Version: ${backendPkg.version}`);
        console.log(`- Scripts: ${Object.keys(backendPkg.scripts || {}).join(', ')}`);
        console.log();
    } catch (error) {
        console.log('Error reading backend package.json:', error.message);
    }
}

if (fs.existsSync(frontendPackageJson)) {
    try {
        const frontendPkg = JSON.parse(fs.readFileSync(frontendPackageJson, 'utf8'));
        console.log('Frontend package info:');
        console.log(`- Name: ${frontendPkg.name}`);
        console.log(`- Version: ${frontendPkg.version}`);
        console.log(`- Scripts: ${Object.keys(frontendPkg.scripts || {}).join(', ')}`);
        console.log();
    } catch (error) {
        console.log('Error reading frontend package.json:', error.message);
    }
}

console.log('=== Test Complete ==='); 