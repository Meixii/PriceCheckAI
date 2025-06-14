# PriceCheck AI - Philippines Medicine Price Checker

## 🎯 Goal
The goal of this project is to create a centralized desktop application that allows users to intelligently compare medicine prices across major pharmaceutical companies in the Philippines. It also helps local pharmacies competitively price their products and extract valuable market data.

## 🏗️ Project Structure
This project is built with:
- **Backend**: Express.js with TypeScript for web scraping and API services
- **Frontend**: React with Vite for the user interface
- **Desktop App**: Electron for cross-platform desktop application
- **Control Panel**: Built-in management interface for service control

The application doesn't store data in a database as it performs real-time price checking when users search for medicines.

## 🚀 Quick Installation (Windows)

### Method 1: Automated Installation
1. **Download** or clone this repository
2. **Right-click** on `install.ps1` and select "Run with PowerShell" (as Administrator)
3. **Wait** for the installation to complete
4. **Launch** the app using the desktop shortcut created

### Method 2: Manual Installation
1. **Install Node.js** from [nodejs.org](https://nodejs.org/) (if not already installed)
2. **Open PowerShell** in the project directory
3. **Run the following commands**:
   ```powershell
   npm install
   cd frontend && npm install && cd ..
   cd backend && npm install && cd ..
   ```
4. **Start the application**:
   ```powershell
   npm run electron
   ```

## 🎮 How to Use

### Control Panel Features
The Electron app opens with a **Control Panel** that provides:

#### 🚀 Service Controls
- **Start All**: Launch both backend and frontend services
- **Restart All**: Restart all services
- **Stop All**: Stop all running services
- **Individual Controls**: Manage backend and frontend separately

#### 🏥 Pharmacy Status Checker
Monitor the availability of supported pharmacy websites:
- TGP (The Generics Pharmacy)
- Southstar Drug
- Watsons Philippines
- Rose Pharmacy
- GetMeds

#### 📋 Console Logs
- **Real-time logging** of all application activities
- **Export logs** to file for troubleshooting
- **Copy logs** to clipboard
- **Clear display** for better readability

#### 📚 Built-in Tutorial
- **Step-by-step guide** for first-time users
- **"Don't show again"** option for experienced users
- **Keyboard shortcuts** for quick access

### Using the Application
1. **Start Services**: Click "Start All" in the Control Panel
2. **Check Status**: Verify pharmacy websites are accessible
3. **Open App**: Click "Open App" to launch the price checker interface
4. **Search Medicines**: Use the web interface to compare prices
5. **Monitor Logs**: Watch the Control Panel for real-time status updates

## 🔧 Development

### Running in Development Mode
```powershell
npm run electron-dev
```

### Building for Production
```powershell
# Build all components
npm run build

# Create Windows installer
npm run dist:win

# Create installers for all platforms
npm run dist
```

### Project Structure
```
PriceCheckAI/
├── electron/           # Electron main process and UI
│   ├── main.js        # Main Electron process
│   ├── preload.js     # Secure IPC bridge
│   ├── splash.html    # Splash screen
│   ├── control-panel.html  # Control panel UI
│   └── control-panel.js    # Control panel logic
├── frontend/          # React frontend application
├── backend/           # Express.js backend server
├── install.ps1       # Windows installation script
└── package.json       # Electron app configuration
```

## 🎨 Features

### ✨ Modern UI/UX
- **Beautiful splash screen** with loading animation
- **Responsive control panel** with 720p optimization and modern dark mode theme
- **Real-time status indicators** for all services
- **Dark mode interface** with vibrant accent colors and smooth animations

### 🛠️ Advanced Controls
- **Process management** for backend/frontend services
- **Automatic service monitoring** and restart capabilities
- **Comprehensive logging** system with export functionality
- **Pharmacy website health checking**

### 🔒 Security
- **Context isolation** for secure IPC communication
- **No node integration** in renderer processes
- **Secure preload scripts** for API exposure

### ⌨️ Keyboard Shortcuts
- `Ctrl+Shift+T`: Show tutorial
- `Ctrl+Shift+C`: Clear logs
- `Ctrl+Shift+S`: Start all services

## 👨‍💻 Developer Information
- **Application**: PriceCheck AI
- **Developer**: J5Apps
- **Version**: 1.0.0
- **License**: MIT
- **Platform**: Cross-platform (Windows, macOS, Linux)

## 🤝 Contributing
Contributions are welcome! Please fork this repository and create a pull request with your improvements.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
