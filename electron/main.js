const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const os = require('os');

class PriceCheckAIApp {
    constructor() {
        this.mainWindow = null;
        this.splashWindow = null;
        this.backendProcess = null;
        this.frontendProcess = null;
        this.isQuitting = false;
        
        this.init();
    }

    init() {
        // Handle app ready
        app.whenReady().then(() => {
            this.createSplashWindow();
            this.setupIPC();
            
            // Show main window after splash
            setTimeout(() => {
                this.createMainWindow();
                this.closeSplashWindow();
            }, 3000);
        });

        // Handle window closed
        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                this.cleanup();
                app.quit();
            }
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createMainWindow();
            }
        });

        // Handle app quit
        app.on('before-quit', (event) => {
            if (!this.isQuitting) {
                event.preventDefault();
                this.handleAppQuit();
            }
        });
    }

    createSplashWindow() {
        this.splashWindow = new BrowserWindow({
            width: 500,
            height: 650,
            frame: false,
            alwaysOnTop: true,
            transparent: true,
            resizable: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        this.splashWindow.loadFile('splash.html');
        this.splashWindow.center();
    }

    closeSplashWindow() {
        if (this.splashWindow) {
            this.splashWindow.close();
            this.splashWindow = null;
        }
    }

    createMainWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 900,
            minHeight: 600,
            icon: path.join(__dirname, 'assets', 'logo.ico'),
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            },
            show: false
        });

        this.mainWindow.loadFile('control-panel.html');
        
        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            this.mainWindow.focus();
        });

        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        // Setup menu
        this.setupMenu();
    }

    setupMenu() {
        const { Menu } = require('electron');
        
        const template = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'Exit',
                        accelerator: 'CmdOrCtrl+Q',
                        click: () => {
                            this.handleAppQuit();
                        }
                    }
                ]
            },
            {
                label: 'Services',
                submenu: [
                    {
                        label: 'Start All Services',
                        accelerator: 'CmdOrCtrl+S',
                        click: () => {
                            this.startServices();
                        }
                    },
                    {
                        label: 'Stop All Services',
                        accelerator: 'CmdOrCtrl+T',
                        click: () => {
                            this.stopServices();
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Open Price Checker',
                        accelerator: 'CmdOrCtrl+O',
                        click: () => {
                            shell.openExternal('http://localhost:5173');
                        }
                    }
                ]
            },
            {
                label: 'Help',
                submenu: [
                    {
                        label: 'About',
                        click: () => {
                            dialog.showMessageBox(this.mainWindow, {
                                type: 'info',
                                title: 'About PriceCheck AI',
                                message: 'PriceCheck AI Control Panel',
                                detail: 'Version 1.0.0\nDeveloped by J5Apps\n\nPhilippines Medicine Price Checker'
                            });
                        }
                    }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    setupIPC() {
        // Service control handlers
        ipcMain.handle('start-services', () => this.startServices());
        ipcMain.handle('stop-services', () => this.stopServices());
        ipcMain.handle('restart-services', () => this.restartServices());
        ipcMain.handle('start-backend', () => this.startBackend());
        ipcMain.handle('stop-backend', () => this.stopBackend());
        ipcMain.handle('restart-backend', () => this.restartBackend());
        ipcMain.handle('start-frontend', () => this.startFrontend());
        ipcMain.handle('stop-frontend', () => this.stopFrontend());
        ipcMain.handle('restart-frontend', () => this.restartFrontend());
        
        // Status handlers
        ipcMain.handle('get-service-status', () => this.getServiceStatus());
        ipcMain.handle('check-pharmacy-status', () => this.checkPharmacyStatus());
        
        // Utility handlers
        ipcMain.handle('open-frontend', () => {
            shell.openExternal('http://localhost:5173');
        });
        ipcMain.handle('export-logs', (event, logs) => this.exportLogs(logs));
        ipcMain.handle('get-app-info', () => this.getAppInfo());
    }

    async startServices() {
        try {
            await this.startBackend();
            await this.startFrontend();
            return { success: true, message: 'All services started successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async stopServices() {
        try {
            await this.stopBackend();
            await this.stopFrontend();
            return { success: true, message: 'All services stopped successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async restartServices() {
        try {
            await this.stopServices();
            await new Promise(resolve => setTimeout(resolve, 2000));
            await this.startServices();
            return { success: true, message: 'All services restarted successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async startBackend() {
        return new Promise((resolve, reject) => {
            if (this.backendProcess) {
                resolve({ success: true, message: 'Backend already running' });
                return;
            }

            try {
                // Always use the original backend location relative to the electron folder
                const backendPath = path.join(__dirname, '..', 'backend');
                
                this.sendLogToRenderer('system', `Backend path: ${backendPath}`);
                
                // Install dependencies if needed
                this.installDependencies(backendPath, () => {
                    // Start the backend server
                    const isWindows = process.platform === 'win32';
                    const npmCmd = isWindows ? 'npm.cmd' : 'npm';
                    
                    this.backendProcess = spawn(npmCmd, ['run', 'dev'], {
                        cwd: backendPath,
                        stdio: 'pipe',
                        shell: true
                    });

                    this.backendProcess.stdout.on('data', (data) => {
                        this.sendLogToRenderer('backend', data.toString());
                    });

                    this.backendProcess.stderr.on('data', (data) => {
                        this.sendLogToRenderer('backend-error', data.toString());
                    });

                    this.backendProcess.on('close', (code) => {
                        this.backendProcess = null;
                        this.sendLogToRenderer('backend', `Backend process exited with code ${code}`);
                    });

                    // Wait a bit to ensure it started
                    setTimeout(() => {
                        resolve({ success: true, message: 'Backend started successfully' });
                    }, 3000);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    async stopBackend() {
        return new Promise((resolve) => {
            if (this.backendProcess) {
                this.backendProcess.kill();
                this.backendProcess = null;
                this.sendLogToRenderer('backend', 'Backend stopped');
            }
            resolve({ success: true, message: 'Backend stopped' });
        });
    }

    async restartBackend() {
        await this.stopBackend();
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await this.startBackend();
    }

    async startFrontend() {
        return new Promise((resolve, reject) => {
            if (this.frontendProcess) {
                resolve({ success: true, message: 'Frontend already running' });
                return;
            }

            try {
                // Always use the original frontend location relative to the electron folder
                const frontendPath = path.join(__dirname, '..', 'frontend');
                
                this.sendLogToRenderer('system', `Frontend path: ${frontendPath}`);
                
                // Install dependencies if needed
                this.installDependencies(frontendPath, () => {
                    // Start the frontend server
                    const isWindows = process.platform === 'win32';
                    const npmCmd = isWindows ? 'npm.cmd' : 'npm';
                    
                    this.frontendProcess = spawn(npmCmd, ['run', 'dev'], {
                        cwd: frontendPath,
                        stdio: 'pipe',
                        shell: true
                    });

                    this.frontendProcess.stdout.on('data', (data) => {
                        this.sendLogToRenderer('frontend', data.toString());
                    });

                    this.frontendProcess.stderr.on('data', (data) => {
                        this.sendLogToRenderer('frontend-error', data.toString());
                    });

                    this.frontendProcess.on('close', (code) => {
                        this.frontendProcess = null;
                        this.sendLogToRenderer('frontend', `Frontend process exited with code ${code}`);
                    });

                    // Wait a bit to ensure it started
                    setTimeout(() => {
                        resolve({ success: true, message: 'Frontend started successfully' });
                    }, 3000);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    async stopFrontend() {
        return new Promise((resolve) => {
            if (this.frontendProcess) {
                this.frontendProcess.kill();
                this.frontendProcess = null;
                this.sendLogToRenderer('frontend', 'Frontend stopped');
            }
            resolve({ success: true, message: 'Frontend stopped' });
        });
    }

    async restartFrontend() {
        await this.stopFrontend();
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await this.startFrontend();
    }

    installDependencies(projectPath, callback) {
        const packageJsonPath = path.join(projectPath, 'package.json');
        const nodeModulesPath = path.join(projectPath, 'node_modules');
        
        this.sendLogToRenderer('system', `Checking dependencies for: ${projectPath}`);
        
        // Check if project directory exists
        if (!fs.existsSync(projectPath)) {
            this.sendLogToRenderer('error', `Project directory does not exist: ${projectPath}`);
            callback();
            return;
        }
        
        // Check if package.json exists
        if (!fs.existsSync(packageJsonPath)) {
            this.sendLogToRenderer('error', `package.json not found in: ${projectPath}`);
            callback();
            return;
        }
        
        // Check if node_modules exists
        if (!fs.existsSync(nodeModulesPath)) {
            this.sendLogToRenderer('system', `Installing dependencies for ${path.basename(projectPath)}...`);
            this.sendLogToRenderer('system', `Working directory: ${projectPath}`);
            
            const isWindows = process.platform === 'win32';
            const npmCmd = isWindows ? 'npm.cmd' : 'npm';
            
            const installProcess = spawn(npmCmd, ['install'], {
                cwd: projectPath,
                stdio: 'pipe',
                shell: true
            });

            installProcess.stdout.on('data', (data) => {
                this.sendLogToRenderer('install', data.toString());
            });

            installProcess.stderr.on('data', (data) => {
                this.sendLogToRenderer('install-error', data.toString());
            });

            installProcess.on('close', (code) => {
                if (code === 0) {
                    this.sendLogToRenderer('system', `Dependencies installed successfully for ${path.basename(projectPath)}`);
                    callback();
                } else {
                    this.sendLogToRenderer('error', `Failed to install dependencies for ${path.basename(projectPath)} (exit code: ${code})`);
                    callback(); // Continue anyway
                }
            });

            installProcess.on('error', (error) => {
                this.sendLogToRenderer('error', `Error spawning npm install: ${error.message}`);
                callback(); // Continue anyway
            });
        } else {
            this.sendLogToRenderer('system', `Dependencies already installed for ${path.basename(projectPath)}`);
            callback();
        }
    }

    getServiceStatus() {
        return {
            backend: this.backendProcess ? 'running' : 'stopped',
            frontend: this.frontendProcess ? 'running' : 'stopped'
        };
    }

    async checkPharmacyStatus() {
        // This would typically make HTTP requests to check pharmacy websites
        // For now, return mock data
        const pharmacies = [
            { name: 'Watsons', url: 'https://www.watsons.com.ph', status: 'checking' },
            { name: 'Mercury Drug', url: 'https://www.mercurydrug.com', status: 'checking' },
            { name: 'Rose Pharmacy', url: 'https://www.rosepharmacy.com', status: 'checking' },
            { name: 'SouthStar Drug', url: 'https://www.southstardrug.com.ph', status: 'checking' },
            { name: 'The Generics Pharmacy', url: 'https://www.tgp.com.ph', status: 'checking' }
        ];

        // Simulate status checking
        return new Promise((resolve) => {
            setTimeout(() => {
                const results = pharmacies.map(pharmacy => ({
                    ...pharmacy,
                    status: Math.random() > 0.2 ? 'online' : 'offline'
                }));
                resolve(results);
            }, 2000);
        });
    }

    async exportLogs(logs) {
        try {
            const result = await dialog.showSaveDialog(this.mainWindow, {
                title: 'Export Logs',
                defaultPath: `pricecheck-logs-${new Date().toISOString().slice(0, 10)}.txt`,
                filters: [
                    { name: 'Text Files', extensions: ['txt'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!result.canceled) {
                fs.writeFileSync(result.filePath, logs);
                return { success: true, message: 'Logs exported successfully' };
            }
            return { success: false, message: 'Export cancelled' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    getAppInfo() {
        return {
            version: '1.0.0',
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            electronVersion: process.versions.electron,
            isPackaged: app.isPackaged,
            appPath: app.getAppPath(),
            resourcesPath: process.resourcesPath,
            userDataPath: app.getPath('userData'),
            currentWorkingDir: process.cwd(),
            electronDir: __dirname
        };
    }

    sendLogToRenderer(type, message) {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('log-message', {
                type,
                message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async handleAppQuit() {
        this.isQuitting = true;
        
        // Stop all services
        try {
            await this.stopServices();
        } catch (error) {
            console.error('Error stopping services:', error);
        }
        
        // Close all windows
        BrowserWindow.getAllWindows().forEach(window => {
            window.close();
        });
        
        app.quit();
    }

    cleanup() {
        if (this.backendProcess) {
            this.backendProcess.kill();
        }
        if (this.frontendProcess) {
            this.frontendProcess.kill();
        }
    }
}

// Create the app instance
new PriceCheckAIApp(); 