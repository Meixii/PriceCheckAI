const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn, exec, fork } = require('child_process');
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

        // Handle process signals
        process.on('SIGINT', () => {
            this.sendLogToRenderer('system', 'Received SIGINT, shutting down...');
            this.handleAppQuit();
        });

        process.on('SIGTERM', () => {
            this.sendLogToRenderer('system', 'Received SIGTERM, shutting down...');
            this.handleAppQuit();
        });

        // Handle Windows specific close events
        if (process.platform === 'win32') {
            process.on('SIGBREAK', () => {
                this.sendLogToRenderer('system', 'Received SIGBREAK, shutting down...');
                this.handleAppQuit();
            });
        }
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

        // Handle window close request
        this.mainWindow.on('close', (event) => {
            if (!this.isQuitting) {
                event.preventDefault();
                this.handleAppQuit();
            }
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
        ipcMain.handle('emergency-shutdown', () => this.handleAppQuit());
        ipcMain.handle('force-cleanup', () => this.forceCleanup());
        ipcMain.handle('repair-dependencies', () => this.repairDependencies());
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
                const backendPath = path.join(__dirname, 'backend');
                
                this.sendLogToRenderer('system', 'Starting backend server...');
                this.sendLogToRenderer('system', `Backend path: ${backendPath}`);
                
                // Install dependencies first, then start the server
                this.installDependencies(backendPath, () => {
                    // Always use npm run dev - simple and reliable
                    const isWindows = process.platform === 'win32';
                    const backendCmd = isWindows ? 'npm.cmd' : 'npm';
                    const backendArgs = ['run', 'dev'];
                    
                    this.backendProcess = spawn(backendCmd, backendArgs, {
                        cwd: backendPath,
                        stdio: 'pipe',
                        shell: true,
                        env: { ...process.env }
                    });

                    this.backendProcess.stdout.on('data', (data) => {
                        this.sendLogToRenderer('backend', data.toString());
                    });

                    this.backendProcess.stderr.on('data', (data) => {
                        this.sendLogToRenderer('backend-error', data.toString());
                    });

                    this.backendProcess.on('close', (code) => {
                        this.sendLogToRenderer('backend', `Backend process exited with code ${code}`);
                        this.backendProcess = null;
                    });

                    this.backendProcess.on('error', (error) => {
                        this.sendLogToRenderer('backend-error', `Backend process error: ${error.message}`);
                        this.backendProcess = null;
                        reject(error);
                    });

                    // Wait a bit to ensure it started
                    setTimeout(() => {
                        if (this.backendProcess) {
                            resolve({ success: true, message: 'Backend started successfully' });
                        } else {
                            reject(new Error('Backend failed to start'));
                        }
                    }, 3000);
                });

            } catch (error) {
                this.sendLogToRenderer('backend-error', `Error starting backend: ${error.message}`);
                this.backendProcess = null;
                reject(error);
            }
        });
    }

    async stopBackend() {
        return new Promise((resolve) => {
            if (this.backendProcess) {
                this.sendLogToRenderer('backend', 'Stopping backend process...');
                
                // Handle process exit
                const onClose = (code) => {
                    this.sendLogToRenderer('backend', `Backend process stopped (exit code: ${code})`);
                    this.backendProcess = null;
                    resolve({ success: true, message: 'Backend stopped' });
                };

                this.backendProcess.once('close', onClose);
                this.backendProcess.once('exit', onClose);

                // Try graceful shutdown first
                try {
                    if (process.platform === 'win32') {
                        // On Windows, send SIGTERM equivalent
                        this.backendProcess.kill('SIGTERM');
                    } else {
                        this.backendProcess.kill('SIGTERM');
                    }

                    // If not closed within 5 seconds, force kill
                    setTimeout(() => {
                        if (this.backendProcess && !this.backendProcess.killed) {
                            this.sendLogToRenderer('backend', 'Force killing backend process...');
                            this.backendProcess.kill('SIGKILL');
                        }
                    }, 5000);

                } catch (error) {
                    this.sendLogToRenderer('backend-error', `Error stopping backend: ${error.message}`);
                    this.backendProcess = null;
                    resolve({ success: true, message: 'Backend stopped with error' });
                }
            } else {
                this.sendLogToRenderer('backend', 'Backend was not running');
                resolve({ success: true, message: 'Backend stopped' });
            }
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
                // Start a simple HTTP server for the bundled frontend
                const express = require('express');
                const frontendPath = path.join(__dirname, 'www');
                
                this.sendLogToRenderer('system', `Frontend path: ${frontendPath}`);
                
                // Check if frontend files exist
                if (!fs.existsSync(frontendPath)) {
                    this.sendLogToRenderer('error', `Frontend directory does not exist: ${frontendPath}`);
                    reject(new Error('Frontend directory not found'));
                    return;
                }

                // Create Express server for static files
                const app = express();
                
                // Serve static files first
                app.use(express.static(frontendPath, {
                    index: false, // Don't serve index.html automatically
                    fallthrough: true
                }));
                
                // Handle SPA routing - serve index.html for all non-asset routes
                app.use((req, res, next) => {
                    // Skip if it's an asset request (has file extension)
                    if (path.extname(req.path)) {
                        return next();
                    }
                    // Serve index.html for SPA routes
                    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
                        if (err) {
                            this.sendLogToRenderer('frontend-error', `Error serving index.html: ${err.message}`);
                            res.status(500).send('Error loading application');
                        }
                    });
                });

                const server = app.listen(5173, () => {
                    this.sendLogToRenderer('frontend', 'Frontend server started on http://localhost:5173');
                    this.frontendProcess = server; // Store server instance
                    resolve({ success: true, message: 'Frontend started successfully' });
                });

                server.on('error', (error) => {
                    this.sendLogToRenderer('frontend-error', `Frontend server error: ${error.message}`);
                    reject(error);
                });
                
            } catch (error) {
                this.sendLogToRenderer('frontend-error', `Error starting frontend: ${error.message}`);
                reject(error);
            }
        });
    }

    async stopFrontend() {
        return new Promise((resolve) => {
            if (this.frontendProcess) {
                if (typeof this.frontendProcess.close === 'function') {
                    // Express server
                    this.frontendProcess.close(() => {
                        this.frontendProcess = null;
                        this.sendLogToRenderer('frontend', 'Frontend server stopped');
                        resolve({ success: true, message: 'Frontend stopped' });
                    });
                } else {
                    // Process
                    this.frontendProcess.kill();
                    this.frontendProcess = null;
                    this.sendLogToRenderer('frontend', 'Frontend stopped');
                    resolve({ success: true, message: 'Frontend stopped' });
                }
            } else {
                resolve({ success: true, message: 'Frontend stopped' });
            }
        });
    }

    async restartFrontend() {
        await this.stopFrontend();
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await this.startFrontend();
    }

    installDependencies(projectPath, callback, retryCount = 0) {
        const packageJsonPath = path.join(projectPath, 'package.json');
        const nodeModulesPath = path.join(projectPath, 'node_modules');
        const packageLockPath = path.join(projectPath, 'package-lock.json');
        const maxRetries = 2;
        
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
        
        // Check if node_modules exists and is valid
        const needsInstall = !fs.existsSync(nodeModulesPath) || this.isNodeModulesCorrupted(nodeModulesPath);
        
        if (needsInstall) {
            if (retryCount > 0) {
                this.sendLogToRenderer('system', `Retry attempt ${retryCount}/${maxRetries} for ${path.basename(projectPath)}...`);
            } else {
                this.sendLogToRenderer('system', `Installing dependencies for ${path.basename(projectPath)}...`);
            }
            
            // Clean up corrupted installation
            if (fs.existsSync(nodeModulesPath)) {
                this.sendLogToRenderer('system', 'Cleaning corrupted node_modules...');
                try {
                    fs.rmSync(nodeModulesPath, { recursive: true, force: true });
                } catch (error) {
                    this.sendLogToRenderer('error', `Failed to clean node_modules: ${error.message}`);
                }
            }
            
            // Remove package-lock.json to force fresh install
            if (fs.existsSync(packageLockPath)) {
                try {
                    fs.unlinkSync(packageLockPath);
                    this.sendLogToRenderer('system', 'Removed package-lock.json for fresh install');
                } catch (error) {
                    this.sendLogToRenderer('error', `Failed to remove package-lock.json: ${error.message}`);
                }
            }
            
            this.sendLogToRenderer('system', `Working directory: ${projectPath}`);
            
            const isWindows = process.platform === 'win32';
            const npmCmd = isWindows ? 'npm.cmd' : 'npm';
            
            // Use npm ci for more reliable installs, fallback to npm install
            const useCI = false; // Disabled since we removed package-lock.json
            const installArgs = useCI ? ['ci'] : ['install', '--no-package-lock', '--prefer-offline'];
            
            const installProcess = spawn(npmCmd, installArgs, {
                cwd: projectPath,
                stdio: 'pipe',
                shell: true,
                env: {
                    ...process.env,
                    NPM_CONFIG_LOGLEVEL: 'error' // Reduce npm verbosity
                }
            });

            let hasErrors = false;
            let errorOutput = '';

            installProcess.stdout.on('data', (data) => {
                this.sendLogToRenderer('install', data.toString());
            });

            installProcess.stderr.on('data', (data) => {
                const errorMsg = data.toString();
                errorOutput += errorMsg;
                
                // Check for critical errors vs warnings
                if (errorMsg.includes('EACCES') || errorMsg.includes('EPERM') || errorMsg.includes('MODULE_NOT_FOUND')) {
                    hasErrors = true;
                }
                
                this.sendLogToRenderer('install-error', errorMsg);
            });

            installProcess.on('close', (code) => {
                if (code === 0 && !hasErrors) {
                    // Verify installation is actually working
                    if (this.verifyInstallation(projectPath)) {
                        this.sendLogToRenderer('system', `Dependencies installed successfully for ${path.basename(projectPath)}`);
                        callback();
                    } else {
                        this.sendLogToRenderer('error', 'Installation verification failed');
                        this.handleInstallFailure(projectPath, callback, retryCount, maxRetries, 'Verification failed');
                    }
                } else {
                    this.sendLogToRenderer('error', `Install failed for ${path.basename(projectPath)} (exit code: ${code})`);
                    this.handleInstallFailure(projectPath, callback, retryCount, maxRetries, errorOutput);
                }
            });

            installProcess.on('error', (error) => {
                this.sendLogToRenderer('error', `Error spawning npm install: ${error.message}`);
                this.handleInstallFailure(projectPath, callback, retryCount, maxRetries, error.message);
            });
        } else {
            this.sendLogToRenderer('system', `Dependencies already installed for ${path.basename(projectPath)}`);
            callback();
        }
    }

    isNodeModulesCorrupted(nodeModulesPath) {
        try {
            // Check if essential packages exist
            const essentialPackages = ['express', 'typescript', 'ts-node'];
            for (const pkg of essentialPackages) {
                const pkgPath = path.join(nodeModulesPath, pkg);
                if (!fs.existsSync(pkgPath)) {
                    this.sendLogToRenderer('system', `Missing essential package: ${pkg}`);
                    return true;
                }
            }
            return false;
        } catch (error) {
            this.sendLogToRenderer('error', `Error checking node_modules: ${error.message}`);
            return true;
        }
    }

    verifyInstallation(projectPath) {
        try {
            const nodeModulesPath = path.join(projectPath, 'node_modules');
            
            // Check if node_modules exists and has content
            if (!fs.existsSync(nodeModulesPath)) {
                return false;
            }
            
            // Check for some essential packages
            const essentialPackages = ['express', 'typescript', 'ts-node'];
            for (const pkg of essentialPackages) {
                const pkgPath = path.join(nodeModulesPath, pkg, 'package.json');
                if (!fs.existsSync(pkgPath)) {
                    this.sendLogToRenderer('system', `Verification failed: missing ${pkg}`);
                    return false;
                }
            }
            
            this.sendLogToRenderer('system', 'Installation verification passed');
            return true;
        } catch (error) {
            this.sendLogToRenderer('error', `Verification error: ${error.message}`);
            return false;
        }
    }

    handleInstallFailure(projectPath, callback, retryCount, maxRetries, errorMsg) {
        if (retryCount < maxRetries) {
            this.sendLogToRenderer('system', `Installation failed, retrying in 3 seconds...`);
            setTimeout(() => {
                this.installDependencies(projectPath, callback, retryCount + 1);
            }, 3000);
        } else {
            this.sendLogToRenderer('error', `Failed to install dependencies after ${maxRetries} attempts`);
            this.sendLogToRenderer('error', `Last error: ${errorMsg.slice(0, 200)}...`);
            this.sendLogToRenderer('system', 'Continuing without dependencies - backend may not work properly');
            callback(); // Continue anyway
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
        this.sendLogToRenderer('system', 'Application closing, stopping all services...');
        
        // Graceful shutdown with timeout
        const shutdownPromise = this.gracefulShutdown();
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                this.sendLogToRenderer('system', 'Shutdown timeout reached, forcing close...');
                resolve();
            }, 10000); // 10 second timeout
        });
        
        try {
            await Promise.race([shutdownPromise, timeoutPromise]);
        } catch (error) {
            console.error('Error during shutdown:', error);
            this.sendLogToRenderer('error', `Shutdown error: ${error.message}`);
        }
        
        // Force cleanup if processes are still running
        this.forceCleanup();
        
        // Close all windows
        BrowserWindow.getAllWindows().forEach(window => {
            if (!window.isDestroyed()) {
                window.destroy();
            }
        });
        
        // Final quit
        setTimeout(() => {
            app.quit();
        }, 500);
    }

    async gracefulShutdown() {
        try {
            this.sendLogToRenderer('system', 'Stopping services gracefully...');
            await this.stopServices();
            this.sendLogToRenderer('system', 'All services stopped successfully');
        } catch (error) {
            this.sendLogToRenderer('error', `Error stopping services: ${error.message}`);
            throw error;
        }
    }

    forceCleanup() {
        this.sendLogToRenderer('system', 'Performing force cleanup...');
        
        // Kill backend process
        if (this.backendProcess) {
            try {
                if (process.platform === 'win32') {
                    // On Windows, try to kill the process tree
                    const { spawn } = require('child_process');
                    spawn('taskkill', ['/pid', this.backendProcess.pid, '/T', '/F'], { 
                        stdio: 'ignore' 
                    });
                } else {
                    this.backendProcess.kill('SIGTERM');
                    setTimeout(() => {
                        if (this.backendProcess && !this.backendProcess.killed) {
                            this.backendProcess.kill('SIGKILL');
                        }
                    }, 3000);
                }
                this.backendProcess = null;
                this.sendLogToRenderer('system', 'Backend process terminated');
            } catch (error) {
                this.sendLogToRenderer('error', `Error killing backend process: ${error.message}`);
            }
        }
        
        // Stop frontend server
        if (this.frontendProcess) {
            try {
                if (typeof this.frontendProcess.close === 'function') {
                    // Express server
                    this.frontendProcess.close();
                } else {
                    // Process
                    this.frontendProcess.kill();
                }
                this.frontendProcess = null;
                this.sendLogToRenderer('system', 'Frontend server stopped');
            } catch (error) {
                this.sendLogToRenderer('error', `Error stopping frontend: ${error.message}`);
            }
        }
    }

    async repairDependencies() {
        return new Promise((resolve) => {
            this.sendLogToRenderer('system', '🔧 REPAIR: Starting backend dependency repair...');
            
            // Stop backend first if running
            if (this.backendProcess) {
                this.sendLogToRenderer('system', 'Stopping backend for repair...');
                this.stopBackend().then(() => {
                    this.performRepair(resolve);
                });
            } else {
                this.performRepair(resolve);
            }
        });
    }

    performRepair(resolve) {
        const backendPath = path.join(__dirname, 'backend');
        const nodeModulesPath = path.join(backendPath, 'node_modules');
        const packageLockPath = path.join(backendPath, 'package-lock.json');
        
        this.sendLogToRenderer('system', 'Cleaning corrupted dependencies...');
        
        try {
            // Remove node_modules
            if (fs.existsSync(nodeModulesPath)) {
                fs.rmSync(nodeModulesPath, { recursive: true, force: true });
                this.sendLogToRenderer('system', 'Removed corrupted node_modules');
            }
            
            // Remove package-lock.json
            if (fs.existsSync(packageLockPath)) {
                fs.unlinkSync(packageLockPath);
                this.sendLogToRenderer('system', 'Removed package-lock.json');
            }
            
            // Force reinstall dependencies
            this.sendLogToRenderer('system', 'Force reinstalling dependencies...');
            this.installDependencies(backendPath, () => {
                this.sendLogToRenderer('system', '✅ Backend repair completed');
                resolve({ success: true, message: 'Backend dependencies repaired successfully' });
            });
            
        } catch (error) {
            this.sendLogToRenderer('error', `Repair failed: ${error.message}`);
            resolve({ success: false, message: error.message });
        }
    }

    cleanup() {
        // Legacy cleanup method - now calls forceCleanup for compatibility
        this.forceCleanup();
    }
}

// Create the app instance
new PriceCheckAIApp(); 