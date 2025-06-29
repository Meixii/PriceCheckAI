# PriceCheck AI Control Panel

A desktop application for managing the PriceCheck AI medicine price checker system in the Philippines.

## Features

- **Service Management**: Start, stop, and restart backend and frontend services
- **Real-time Monitoring**: Monitor service status and logs in real-time
- **Pharmacy Status Checking**: Test connectivity to pharmacy websites
- **Modern UI**: Beautiful, responsive interface with dark theme
- **Windows Integration**: Desktop shortcuts, start menu integration, auto-start options

## Installation

### Option 1: Use Pre-built Installer
1. Download the latest `PriceCheck-AI-Control-Panel-Setup-1.0.0.exe` from releases
2. Run the installer as administrator
3. Follow the installation wizard
4. Launch from desktop shortcut or start menu

### Option 2: Build from Source
1. Ensure Node.js (v16+) is installed
2. Navigate to the electron directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run in development mode:
   ```bash
   npm run dev
   ```
5. Build installer:
   ```bash
   npm run dist
   ```

## Usage

### First Launch
- The app shows a splash screen while initializing
- A tutorial modal appears on first use
- The control panel opens with service status displays

### Service Management
- **Start All**: Launches both backend API and frontend interface
- **Stop All**: Stops all running services
- **Restart All**: Restarts all services (useful for applying changes)
- Individual service controls for fine-grained management

### Monitoring
- Real-time service status indicators (Running/Stopped)
- Console logs with color-coded message types
- Export logs to file or copy to clipboard
- Pharmacy connectivity testing

### Opening the Price Checker
- Click "Open Price Checker" to launch the web interface
- Automatically opens in your default browser
- Requires services to be running

## System Requirements

- Windows 7 or later
- Node.js 16.0.0 or later
- 4GB RAM minimum
- 500MB free disk space

## Firewall Configuration

The installer automatically configures Windows Firewall to allow:
- Port 3000 (Backend API)
- Port 5173 (Frontend Development Server)

## Auto-start Option

During installation, you can choose to auto-start PriceCheck AI with Windows.

## File Structure

```
electron/
├── main.js              # Main Electron process
├── preload.js           # Preload script for security
├── control-panel.js     # Control panel logic
├── control-panel.html   # Control panel interface
├── splash.html          # Splash screen
├── assets/              # Icons and images
├── package.json         # App configuration
├── installer.nsh       # Custom installer script
└── LICENSE.txt         # License file
```

## Development

### Running in Development
```bash
npm run dev
```

### Building for Distribution
```bash
# Build installer
npm run dist

# Build portable version
npm run build:win-portable

# Build directory (unpacked)
npm run pack
```

### Debugging
- Use Chrome DevTools: Ctrl+Shift+I
- Console logs appear in both DevTools and the app's log panel
- Service output is captured and displayed in real-time

## Troubleshooting

### Services Won't Start
1. Ensure Node.js is installed
2. Check if ports 3000/5173 are available
3. Run as administrator if needed
4. Check firewall settings

### Missing Dependencies
- The app automatically installs npm dependencies for backend/frontend
- If installation fails, manually run `npm install` in backend/frontend directories

### Installer Issues
- Run installer as administrator
- Temporarily disable antivirus during installation
- Ensure sufficient disk space

## Support

For support and bug reports:
- Email: support@j5apps.com
- Website: https://j5apps.com

## License

MIT License - see LICENSE.txt for details

## About

PriceCheck AI Control Panel v1.0.0
Developed by J5Apps
Copyright © 2024 All Rights Reserved 