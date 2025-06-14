# 📖 PriceCheck AI User Guide

Welcome to **PriceCheck AI**, your comprehensive desktop application for comparing medicine prices across major Philippine pharmacy chains!

## 🚀 Getting Started

### System Requirements
- **Operating System**: Windows 10/11, macOS 10.14+, or Linux
- **Node.js**: Version 16 or higher
- **RAM**: Minimum 4GB (8GB recommended)
- **Display**: 720p (1280x720) or higher resolution
- **Storage**: 500MB free space
- **Internet**: Active connection required for price checking

### Installation Options

#### Option 1: Quick Install (Windows)
1. Download the project files
2. Right-click `install.ps1` → "Run with PowerShell" (as Administrator)
3. Wait for installation to complete
4. Use the desktop shortcut to launch

#### Option 2: Manual Install
```powershell
# Install dependencies
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Launch application
npm run electron
```

## 🎮 Using the Control Panel

When you launch PriceCheck AI, you'll see a beautiful **Dark Mode Control Panel** with several key sections:

### 🚀 Service Controls

#### Start All Services
- **Purpose**: Launches both backend server and frontend interface
- **When to use**: First time starting the application
- **What happens**: 
  - Backend server starts on port 3000
  - Frontend development server starts on port 5173
  - Real-time logs appear in the console

#### Individual Service Management
- **Start Backend**: Launches the Express.js server for web scraping
- **Start Frontend**: Launches the React development server
- **Restart Services**: Stops and restarts services (useful for troubleshooting)
- **Stop Services**: Cleanly shuts down all running processes

#### Open App Button
- **Purpose**: Opens the main price checker interface in your default browser
- **URL**: http://localhost:5173
- **Note**: Services must be running first

### 🏥 Pharmacy Status Checker

Monitor the health of supported pharmacy websites:

#### Supported Pharmacies
- **TGP** (The Generics Pharmacy) - tgp.com.ph
- **Southstar Drug** - southstardrug.com.ph
- **Watsons Philippines** - watsons.com.ph
- **Rose Pharmacy** - rosepharmacy.com
- **GetMeds** - getmeds.ph

#### Status Indicators
- 🟢 **Online**: Website is accessible and responding
- 🔴 **Offline**: Website is down or not responding
- ⚠️ **Warning**: Slow response or partial issues

#### How to Check Status
1. Click the **"Check Status"** button
2. Wait for the system to ping all pharmacy websites
3. View results in the status grid below
4. Check console logs for detailed information

### 📋 Console Logs

The console provides real-time information about your application:

#### Log Types
- **[SYSTEM]**: Application status and user actions
- **[BACKEND]**: Server startup, API requests, scraping activities
- **[FRONTEND]**: React development server messages
- **[SUCCESS]**: Successful operations
- **[ERROR]**: Error messages and troubleshooting info
- **[WARNING]**: Non-critical issues and alerts

#### Log Management
- **Export Logs**: Save all logs to a text file for support or analysis
- **Copy Logs**: Copy current logs to clipboard for sharing
- **Clear Display**: Clear the visual log display (logs are still saved)

#### Reading Logs
```
[10:30:15] [SYSTEM] Starting all services...
[10:30:16] [BACKEND] Backend started successfully
[10:30:18] [FRONTEND] Frontend started successfully
[10:30:20] [SUCCESS] All services started successfully!
```

## 📚 Built-in Tutorial

### Accessing the Tutorial
- **Automatic**: Shows on first launch
- **Manual**: Click "Show Tutorial" button
- **Keyboard**: Press `Ctrl+Shift+T`

### Tutorial Features
- **Step-by-step guidance** for new users
- **Interactive examples** of each feature
- **"Don't show again"** checkbox for experienced users
- **Comprehensive coverage** of all control panel features

## ⌨️ Keyboard Shortcuts

Master these shortcuts for efficient operation:

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+T` | Show/Hide Tutorial |
| `Ctrl+Shift+C` | Clear Log Display |
| `Ctrl+Shift+S` | Start All Services |
| `Ctrl+R` | Refresh Control Panel |
| `F5` | Refresh Control Panel |
| `Esc` | Close Tutorial Modal |

## 🔧 Troubleshooting

### Common Issues

#### Services Won't Start
**Symptoms**: Error messages when clicking "Start All"
**Solutions**:
1. Check if ports 3000 and 5173 are available
2. Restart the application
3. Run `npm install` in each directory
4. Check the console logs for specific errors

#### Frontend Not Loading
**Symptoms**: "Open App" button doesn't work
**Solutions**:
1. Ensure frontend service is running (green status)
2. Wait 30 seconds after starting services
3. Manually navigate to http://localhost:5173
4. Check firewall settings

#### Pharmacy Status Shows All Offline
**Symptoms**: All pharmacies show red "Offline" status
**Solutions**:
1. Check your internet connection
2. Verify firewall isn't blocking the application
3. Try again in a few minutes (websites may be temporarily down)
4. Check if you're behind a corporate proxy

#### Application Won't Launch
**Symptoms**: Desktop shortcut or npm command fails
**Solutions**:
1. Run `test-installation.ps1` to verify setup
2. Reinstall using `install.ps1`
3. Check Node.js installation: `node --version`
4. Verify all dependencies: `npm list`

### Getting Help

#### Log Analysis
1. **Export logs** using the Control Panel
2. **Review error messages** for specific issues
3. **Check timestamps** to identify when problems started
4. **Look for patterns** in recurring errors

#### Support Information
- **Application Version**: Displayed in footer
- **Node.js Version**: Check with `node --version`
- **Platform**: Windows/macOS/Linux
- **Error Logs**: Export from Control Panel

## 🎯 Best Practices

### Daily Usage
1. **Start services** when beginning work
2. **Check pharmacy status** before price searches
3. **Monitor logs** for any issues
4. **Stop services** when finished (saves resources)

### Performance Tips
- **Close unused browser tabs** to free memory
- **Restart services** if they become slow
- **Clear log display** periodically for better performance
- **Keep the application updated** for best results

### Security Considerations
- **Run as standard user** (not Administrator) when possible
- **Keep Node.js updated** for security patches
- **Monitor logs** for unusual activity
- **Use official pharmacy websites** only

## 🔄 Updates and Maintenance

### Updating the Application
1. **Download new version** from the official source
2. **Stop all services** before updating
3. **Backup your settings** if needed
4. **Run the installer** for the new version
5. **Test functionality** after update

### Regular Maintenance
- **Weekly**: Check for application updates
- **Monthly**: Clear old log files
- **As needed**: Restart services for optimal performance

## 📞 Support and Contact

### Developer Information
- **Application**: PriceCheck AI
- **Developer**: J5Apps
- **Version**: 1.0.0
- **Platform**: Cross-platform Desktop Application

### Getting Support
1. **Check this user guide** for common solutions
2. **Review console logs** for error details
3. **Run diagnostic tests** using provided scripts
4. **Contact support** with specific error messages and logs

---

**Thank you for using PriceCheck AI!** 🎉

This application helps Filipino consumers make informed decisions about medicine purchases by providing real-time price comparisons across major pharmacy chains. Your health and savings matter to us! 