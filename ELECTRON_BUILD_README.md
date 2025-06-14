# PriceCheck AI - Electron Installer Build Guide

## 📦 Overview
This guide covers building and distributing the **PriceCheck AI** desktop application using Electron Builder. The application is packaged as a cross-platform desktop app with installers for Windows, macOS, and Linux.

## 🏗️ Build Architecture

### Application Structure
```
J5PriceChecker/
├── electron/                 # Electron main process
│   ├── main.js              # Main process entry point
│   ├── preload.js           # Secure IPC bridge
│   ├── control-panel.html   # Control panel interface
│   ├── control-panel.js     # Control panel logic
│   └── splash.html          # Splash screen
├── frontend/dist/           # Built React frontend
├── backend/dist/            # Built Express.js backend
├── backend/node_modules/    # Backend dependencies
├── package.json             # Electron app configuration
├── electron-builder.yml     # Build configuration
└── logo.png                 # Application icon
```

### Build Configuration
- **App ID**: `com.j5apps.pricecheckai`
- **Product Name**: `J5 PriceCheck`
- **Version**: `1.0.0`
- **Main Process**: `electron/main.js`
- **Icon**: `logo.png`

## 🚀 Build Commands

### Prerequisites
```bash
# Install dependencies
npm install

# Build frontend and backend
npm run build
```

### Development Build
```bash
# Run in development mode (with hot reload)
npm run electron-dev

# Run production build locally
npm run electron
```

### Distribution Builds

#### Windows
```bash
# Windows NSIS installer (recommended)
npm run dist:win

# Windows portable executable
npm run dist:portable

# Windows directory (unpacked)
npm run dist:dir
```

#### macOS
```bash
# macOS DMG installer
npm run dist:mac
```

#### Linux
```bash
# Linux AppImage
npm run dist:linux
```

#### All Platforms
```bash
# Build for all configured platforms
npm run dist
```

## 🎯 Windows Build Configuration

### NSIS Installer Features
- **Two-click installation** (not one-click for user control)
- **Custom installation directory** selection
- **Desktop shortcut** creation
- **Start Menu shortcut** creation
- **No elevation required** (runs as current user)
- **Uninstaller** included

### Windows Targets
1. **NSIS Installer** (`.exe`)
   - Full installation package
   - Registry entries
   - Uninstall support
   - File associations

2. **Portable Executable** (`.exe`)
   - No installation required
   - Self-contained
   - Run from any location
   - No registry changes

### Windows Build Output
```
dist/
├── J5 PriceCheck Setup 1.0.0.exe     # NSIS installer
├── J5 PriceCheck 1.0.0.exe           # Portable executable
└── win-unpacked/                      # Unpacked directory
    ├── J5 PriceCheck.exe
    ├── resources/
    └── ...
```

## 🍎 macOS Build Configuration

### DMG Features
- **Drag-and-drop installation**
- **Application bundle** (`.app`)
- **Code signing ready** (requires developer certificate)
- **Notarization ready** (requires Apple Developer account)

### macOS Build Output
```
dist/
├── J5 PriceCheck-1.0.0.dmg          # DMG installer
└── mac/
    └── J5 PriceCheck.app             # Application bundle
```

## 🐧 Linux Build Configuration

### AppImage Features
- **Self-contained executable**
- **No installation required**
- **Portable across distributions**
- **Desktop integration**

### Linux Build Output
```
dist/
├── J5 PriceCheck-1.0.0.AppImage      # AppImage executable
└── linux-unpacked/                   # Unpacked directory
    ├── j5-pricecheck
    ├── resources/
    └── ...
```

## ⚙️ Build Configuration Files

### package.json Build Section
```json
{
  "build": {
    "appId": "com.j5apps.pricecheckai",
    "productName": "J5 PriceCheck",
    "directories": {
      "output": "dist"
    },
    "files": [
      "electron/**/*",
      "frontend/dist/**/*",
      "backend/dist/**/*",
      "backend/node_modules/**/*",
      "package.json"
    ],
    "compression": "normal",
    "nodeGypRebuild": false,
    "buildDependenciesFromSource": false
  }
}
```

### electron-builder.yml
```yaml
appId: com.j5apps.pricecheckai
productName: J5 PriceCheck
directories:
  output: dist
files:
  - electron/**/*
  - frontend/dist/**/*
  - backend/dist/**/*
  - backend/node_modules/**/*
  - package.json
compression: normal
nodeGypRebuild: false
buildDependenciesFromSource: false
```

## 🔧 Build Process Steps

### 1. Pre-build Preparation
```bash
# Clean previous builds
npm run clean:cache

# Install all dependencies
npm install

# Build frontend
npm run build:frontend

# Build backend
npm run build:backend
```

### 2. Electron Build Process
1. **File Collection**: Gathers specified files and directories
2. **Dependency Resolution**: Includes necessary Node.js modules
3. **Asset Processing**: Optimizes and packages assets
4. **Platform Packaging**: Creates platform-specific packages
5. **Installer Creation**: Generates installers for each platform

### 3. Post-build Verification
```bash
# Test the built application
cd dist/win-unpacked
./J5\ PriceCheck.exe

# Or test the installer
./dist/J5\ PriceCheck\ Setup\ 1.0.0.exe
```

## 📋 Build Optimization

### File Inclusion Strategy
- **Include**: Essential runtime files only
- **Exclude**: Development dependencies, source files, tests
- **Optimize**: Compress assets and remove unused code

### Size Optimization
- **Frontend**: Pre-built and minified React app
- **Backend**: Only production dependencies included
- **Electron**: Uses system Chromium when possible
- **Compression**: Normal compression for balance of size/speed

### Performance Considerations
- **Startup Time**: Optimized with splash screen
- **Memory Usage**: Efficient process management
- **Disk Space**: Minimal footprint with shared dependencies

## 🚀 Distribution Strategy

### Release Channels
1. **Stable**: Production-ready releases
2. **Beta**: Pre-release testing versions
3. **Alpha**: Development snapshots

### Distribution Methods
1. **Direct Download**: From GitHub releases
2. **Auto-updater**: Built-in update mechanism (future)
3. **Package Managers**: Chocolatey, Homebrew, Snap (future)

### Version Management
```json
{
  "version": "1.0.0",
  "build": {
    "artifactName": "${productName}-${version}-${arch}.${ext}"
  }
}
```

## 🔒 Security Considerations

### Code Signing
- **Windows**: Authenticode signing (requires certificate)
- **macOS**: Apple Developer ID signing (requires certificate)
- **Linux**: GPG signing (optional)

### Security Features
- **Context Isolation**: Enabled for renderer processes
- **Node Integration**: Disabled in renderer
- **Preload Scripts**: Secure IPC communication
- **CSP Headers**: Content Security Policy enforcement

## 🐛 Troubleshooting

### Common Build Issues

#### 1. Missing Dependencies
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### 2. Build Failures
```bash
# Solution: Clean cache and rebuild
npm run clean:cache
npm run build
npm run dist
```

#### 3. Platform-Specific Issues
```bash
# Windows: Ensure Windows Build Tools are installed
npm install --global windows-build-tools

# macOS: Ensure Xcode Command Line Tools
xcode-select --install

# Linux: Ensure build essentials
sudo apt-get install build-essential
```

#### 4. Windows Symbolic Link Permission Error
**Error**: `ERROR: Cannot create symbolic link : A required privilege is not held by the client`

**Solutions** (try in order):

**Option A: Run as Administrator**
```powershell
# Open PowerShell as Administrator and run:
npm run dist:win
```

**Option B: Enable Developer Mode (Windows 10/11)**
1. Open **Settings** → **Update & Security** → **For developers**
2. Enable **Developer Mode**
3. Restart your terminal and try again

**Option C: Disable Code Signing (Recommended for development)**
Add this to your `package.json` build configuration:
```json
{
  "build": {
    "win": {
      "sign": false,
      "verifyUpdateCodeSignature": false,
      "forceCodeSigning": false
    }
  }
}
```

**Option D: Clear Electron Builder Cache**
```powershell
# Clear the cache and try again
npm run clean:cache
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache"
npm run dist:win
```

**Option E: Use Directory Build Instead**
```powershell
# Build unpacked directory instead of installer
npm run dist:dir
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=electron-builder npm run dist
```

## 📊 Build Metrics

### Typical Build Sizes
- **Windows NSIS**: ~150-200 MB
- **Windows Portable**: ~150-200 MB
- **macOS DMG**: ~150-200 MB
- **Linux AppImage**: ~150-200 MB

### Build Times (approximate)
- **Development Build**: 30-60 seconds
- **Production Build**: 2-5 minutes
- **Full Distribution**: 5-10 minutes

## 🎯 Deployment Checklist

### Pre-deployment
- [ ] Update version number in `package.json`
- [ ] Test application functionality
- [ ] Verify all dependencies are included
- [ ] Check icon and branding assets
- [ ] Review build configuration

### Build Process
- [ ] Clean previous builds
- [ ] Build frontend and backend
- [ ] Run distribution build
- [ ] Test generated installers
- [ ] Verify file sizes and contents

### Post-deployment
- [ ] Upload to release platform
- [ ] Update documentation
- [ ] Notify users of new version
- [ ] Monitor for issues
- [ ] Prepare hotfixes if needed

## 📞 Support

### Build Issues
- Check the [Electron Builder documentation](https://www.electron.build/)
- Review build logs for specific errors
- Ensure all prerequisites are installed
- Verify file paths and configurations

### Application Issues
- Test in development mode first
- Check console logs in the Control Panel
- Verify backend and frontend services
- Review network connectivity

## 📄 License
This build configuration is part of the PriceCheck AI project, licensed under the MIT License.

---

**Developer**: J5Apps  
**Version**: 1.0.0  
**Last Updated**: 2024  
**Build System**: Electron Builder 24.9.1 