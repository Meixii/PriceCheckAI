const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const log = require('electron-log');
const Store = require('electron-store');

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

// Session logs for current session only
let sessionLogs = [];

// Initialize store for settings
const store = new Store();

let mainWindow;
let splashWindow;
let backendProcess;
let frontendProcess;

// Check if we're in development
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Helper function to add session log
function addSessionLog(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] ${message}`;
  sessionLogs.push(logEntry);
  log[level](message); // Still log to electron-log for debugging
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 400,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  
  // Show splash for 5 seconds then show main window
  setTimeout(() => {
    splashWindow.close();
    createMainWindow();
  }, 5000);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    icon: path.join(__dirname, '..', 'logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the control panel
  mainWindow.loadFile(path.join(__dirname, 'control-panel.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Initialize session logging
    addSessionLog('PriceCheck AI Control Panel started');
    addSessionLog('Session logging initialized');
    
    // Show tutorial unless user checked "Don't show again"
    if (!store.get('tutorialDontShowAgain', false)) {
      mainWindow.webContents.send('show-tutorial');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Clean up processes
    if (backendProcess) backendProcess.kill();
    if (frontendProcess) frontendProcess.kill();
  });
}

// App event handlers
app.whenReady().then(() => {
  createSplashWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createSplashWindow();
  }
});

// IPC handlers
ipcMain.handle('start-backend', async () => {
  try {
    addSessionLog('Starting backend server...');
    
    if (isDev) {
      // Development mode: use npm start with ts-node
      const backendPath = path.join(__dirname, '..', 'backend');
      backendProcess = spawn('npm', ['start'], {
        cwd: backendPath,
        shell: true
      });
    } else {
      // Production mode: run compiled server.js directly with node
      const backendPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend');
      const serverPath = path.join(backendPath, 'server.js');
      
      // Check if server.js exists
      if (!fs.existsSync(serverPath)) {
        throw new Error(`Backend server file not found at: ${serverPath}`);
      }
      
      backendProcess = spawn('node', [serverPath], {
        cwd: backendPath,
        shell: false,
        env: { ...process.env, NODE_ENV: 'production' }
      });
    }

    backendProcess.stdout.on('data', (data) => {
      const message = `Backend: ${data}`;
      addSessionLog(message);
      mainWindow?.webContents.send('backend-log', data.toString());
    });

    backendProcess.stderr.on('data', (data) => {
      const message = `Backend Error: ${data}`;
      addSessionLog(message, 'error');
      mainWindow?.webContents.send('backend-log', `Error: ${data.toString()}`);
    });

    backendProcess.on('error', (error) => {
      const message = `Backend Process Error: ${error.message}`;
      addSessionLog(message, 'error');
      mainWindow?.webContents.send('backend-log', `Process Error: ${error.message}`);
    });

    return { success: true, message: 'Backend started successfully' };
  } catch (error) {
    addSessionLog(`Failed to start backend: ${error.message}`, 'error');
    return { success: false, message: error.message };
  }
});

ipcMain.handle('start-frontend', async () => {
  try {
    addSessionLog('Starting frontend server...');
    
    if (isDev) {
      // Development mode: use npm run dev
      const frontendPath = path.join(__dirname, '..', 'frontend');
      frontendProcess = spawn('npm', ['run', 'dev'], {
        cwd: frontendPath,
        shell: true
      });

      frontendProcess.stdout.on('data', (data) => {
        const message = `Frontend: ${data}`;
        addSessionLog(message);
        mainWindow?.webContents.send('frontend-log', data.toString());
      });

      frontendProcess.stderr.on('data', (data) => {
        const message = `Frontend Error: ${data}`;
        addSessionLog(message, 'error');
        mainWindow?.webContents.send('frontend-log', `Error: ${data.toString()}`);
      });
    } else {
      // Production mode: serve static files using a simple HTTP server
      const express = require('express');
      const frontendApp = express();
      const frontendPort = 5173;
      const frontendDistPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'frontend', 'dist');
      
      // Check if dist folder exists
      if (!fs.existsSync(frontendDistPath)) {
        throw new Error(`Frontend dist folder not found at: ${frontendDistPath}`);
      }
      
      // Serve static files
      frontendApp.use(express.static(frontendDistPath));
      
      // Handle SPA routing - serve index.html for all routes
      frontendApp.get('*', (req, res) => {
        res.sendFile(path.join(frontendDistPath, 'index.html'));
      });
      
      const server = frontendApp.listen(frontendPort, () => {
        const message = `Frontend server started on http://localhost:${frontendPort}`;
        addSessionLog(message);
        mainWindow?.webContents.send('frontend-log', message);
      });
      
      // Store server reference for cleanup
      frontendProcess = { kill: () => server.close() };
    }

    return { success: true, message: 'Frontend started successfully' };
  } catch (error) {
    addSessionLog(`Failed to start frontend: ${error.message}`, 'error');
    return { success: false, message: error.message };
  }
});

ipcMain.handle('stop-backend', async () => {
  try {
    if (backendProcess) {
      backendProcess.kill();
      backendProcess = null;
      addSessionLog('Backend stopped');
      return { success: true, message: 'Backend stopped successfully' };
    }
    return { success: false, message: 'Backend is not running' };
  } catch (error) {
    addSessionLog(`Failed to stop backend: ${error.message}`, 'error');
    return { success: false, message: error.message };
  }
});

ipcMain.handle('stop-frontend', async () => {
  try {
    if (frontendProcess) {
      frontendProcess.kill();
      frontendProcess = null;
      addSessionLog('Frontend stopped');
      return { success: true, message: 'Frontend stopped successfully' };
    }
    return { success: false, message: 'Frontend is not running' };
  } catch (error) {
    addSessionLog(`Failed to stop frontend: ${error.message}`, 'error');
    return { success: false, message: error.message };
  }
});

ipcMain.handle('restart-backend', async () => {
  try {
    // Stop backend first
    if (backendProcess) {
      backendProcess.kill();
      backendProcess = null;
      addSessionLog('Backend stopped for restart');
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start backend
    addSessionLog('Starting backend server...');
    
    if (isDev) {
      // Development mode: use npm start with ts-node
      const backendPath = path.join(__dirname, '..', 'backend');
      backendProcess = spawn('npm', ['start'], {
        cwd: backendPath,
        shell: true
      });
    } else {
      // Production mode: run compiled server.js directly with node
      const backendPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend');
      const serverPath = path.join(backendPath, 'server.js');
      
      // Check if server.js exists
      if (!fs.existsSync(serverPath)) {
        throw new Error(`Backend server file not found at: ${serverPath}`);
      }
      
      backendProcess = spawn('node', [serverPath], {
        cwd: backendPath,
        shell: false,
        env: { ...process.env, NODE_ENV: 'production' }
      });
    }

    backendProcess.stdout.on('data', (data) => {
      const message = `Backend: ${data}`;
      addSessionLog(message);
      mainWindow?.webContents.send('backend-log', data.toString());
    });

    backendProcess.stderr.on('data', (data) => {
      const message = `Backend Error: ${data}`;
      addSessionLog(message, 'error');
      mainWindow?.webContents.send('backend-log', `Error: ${data.toString()}`);
    });

    backendProcess.on('error', (error) => {
      const message = `Backend Process Error: ${error.message}`;
      addSessionLog(message, 'error');
      mainWindow?.webContents.send('backend-log', `Process Error: ${error.message}`);
    });

    return { success: true, message: 'Backend restarted successfully' };
  } catch (error) {
    addSessionLog(`Failed to restart backend: ${error.message}`, 'error');
    return { success: false, message: error.message };
  }
});

ipcMain.handle('restart-frontend', async () => {
  try {
    // Stop frontend first
    if (frontendProcess) {
      frontendProcess.kill();
      frontendProcess = null;
      addSessionLog('Frontend stopped for restart');
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start frontend
    addSessionLog('Starting frontend server...');
    
    if (isDev) {
      // Development mode: use npm run dev
      const frontendPath = path.join(__dirname, '..', 'frontend');
      frontendProcess = spawn('npm', ['run', 'dev'], {
        cwd: frontendPath,
        shell: true
      });

      frontendProcess.stdout.on('data', (data) => {
        const message = `Frontend: ${data}`;
        addSessionLog(message);
        mainWindow?.webContents.send('frontend-log', data.toString());
      });

      frontendProcess.stderr.on('data', (data) => {
        const message = `Frontend Error: ${data}`;
        addSessionLog(message, 'error');
        mainWindow?.webContents.send('frontend-log', `Error: ${data.toString()}`);
      });
    } else {
      // Production mode: serve static files using a simple HTTP server
      const express = require('express');
      const frontendApp = express();
      const frontendPort = 5173;
      const frontendDistPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'frontend', 'dist');
      
      // Check if dist folder exists
      if (!fs.existsSync(frontendDistPath)) {
        throw new Error(`Frontend dist folder not found at: ${frontendDistPath}`);
      }
      
      // Serve static files
      frontendApp.use(express.static(frontendDistPath));
      
      // Handle SPA routing - serve index.html for all routes
      frontendApp.get('*', (req, res) => {
        res.sendFile(path.join(frontendDistPath, 'index.html'));
      });
      
      const server = frontendApp.listen(frontendPort, () => {
        const message = `Frontend server started on http://localhost:${frontendPort}`;
        addSessionLog(message);
        mainWindow?.webContents.send('frontend-log', message);
      });
      
      // Store server reference for cleanup
      frontendProcess = { kill: () => server.close() };
    }

    return { success: true, message: 'Frontend restarted successfully' };
  } catch (error) {
    addSessionLog(`Failed to restart frontend: ${error.message}`, 'error');
    return { success: false, message: error.message };
  }
});

ipcMain.handle('check-pharmacy-status', async () => {
  const pharmacies = [
    { name: 'TGP', url: 'https://tgp.com.ph' },
    { name: 'Southstar Drug', url: 'https://southstardrug.com.ph/' },
    { name: 'Watsons', url: 'https://www.watsons.com.ph/' },
    { name: 'Rose Pharmacy', url: 'https://www.rosepharmacy.com/' },
    { name: 'GetMeds', url: 'https://getmeds.ph/' }
  ];

  const results = [];
  
  for (const pharmacy of pharmacies) {
    let success = false;
    let lastError = null;
    let attempts = 0;
    const maxAttempts = 3;
    
    // Try up to 3 times
    while (!success && attempts < maxAttempts) {
      attempts++;
      try {
        addSessionLog(`Checking ${pharmacy.name} (attempt ${attempts}/${maxAttempts})...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        const response = await fetch(pharmacy.url, { 
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          results.push({
            name: pharmacy.name,
            url: pharmacy.url,
            status: 'Online',
            attempts: attempts,
            responseTime: response.status
          });
          success = true;
          addSessionLog(`${pharmacy.name}: Online (${response.status})`);
        } else {
          lastError = `HTTP ${response.status}`;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
      } catch (error) {
        lastError = error.name === 'AbortError' ? 'Timeout' : error.message;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
    }
    
    if (!success) {
      results.push({
        name: pharmacy.name,
        url: pharmacy.url,
        status: 'Failed',
        attempts: attempts,
        error: lastError
      });
      addSessionLog(`${pharmacy.name}: Failed after ${attempts} attempts - ${lastError}`, 'error');
    }
  }
  
  return results;
});

ipcMain.handle('export-logs', async () => {
  try {
    // Create timestamped filename
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const defaultName = `pricecheck-logs-${timestamp}.txt`;
    
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName,
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (filePath) {
      const logContent = sessionLogs.join('\n');
      fs.writeFileSync(filePath, logContent);
      addSessionLog('Session logs exported successfully');
      return { success: true, message: 'Session logs exported successfully' };
    }
    
    return { success: false, message: 'Export cancelled' };
  } catch (error) {
    addSessionLog(`Failed to export logs: ${error.message}`, 'error');
    return { success: false, message: error.message };
  }
});

ipcMain.handle('copy-logs', async () => {
  try {
    const logContent = sessionLogs.join('\n');
    
    const { clipboard } = require('electron');
    clipboard.writeText(logContent);
    
    addSessionLog('Session logs copied to clipboard');
    return { success: true, message: 'Session logs copied to clipboard' };
  } catch (error) {
    addSessionLog(`Failed to copy logs: ${error.message}`, 'error');
    return { success: false, message: error.message };
  }
});

ipcMain.handle('open-frontend', async () => {
  shell.openExternal('http://localhost:5173');
});

ipcMain.handle('tutorial-completed', async (event, dontShowAgain = false) => {
  if (dontShowAgain) {
    store.set('tutorialDontShowAgain', true);
    addSessionLog('Tutorial completed - Don\'t show again selected');
  } else {
    addSessionLog('Tutorial completed');
  }
});

ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

ipcMain.handle('get-session-logs', async () => {
  return sessionLogs;
}); 