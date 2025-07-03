const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Service control methods
    startServices: () => ipcRenderer.invoke('start-services'),
    stopServices: () => ipcRenderer.invoke('stop-services'),
    restartServices: () => ipcRenderer.invoke('restart-services'),
    startBackend: () => ipcRenderer.invoke('start-backend'),
    stopBackend: () => ipcRenderer.invoke('stop-backend'),
    restartBackend: () => ipcRenderer.invoke('restart-backend'),
    startFrontend: () => ipcRenderer.invoke('start-frontend'),
    stopFrontend: () => ipcRenderer.invoke('stop-frontend'),
    restartFrontend: () => ipcRenderer.invoke('restart-frontend'),
    
    // Status methods
    getServiceStatus: () => ipcRenderer.invoke('get-service-status'),
    checkPharmacyStatus: () => ipcRenderer.invoke('check-pharmacy-status'),
    
    // Utility methods
    openFrontend: () => ipcRenderer.invoke('open-frontend'),
    exportLogs: (logs) => ipcRenderer.invoke('export-logs', logs),
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),
    
    // Emergency methods
    emergencyShutdown: () => ipcRenderer.invoke('emergency-shutdown'),
    forceCleanup: () => ipcRenderer.invoke('force-cleanup'),
    repairDependencies: () => ipcRenderer.invoke('repair-dependencies'),
    
    // Log listener
    onLogMessage: (callback) => {
        ipcRenderer.on('log-message', (event, data) => callback(data));
    },
    
    // Remove log listener
    removeLogListener: () => {
        ipcRenderer.removeAllListeners('log-message');
    }
});

// Expose version info
contextBridge.exposeInMainWorld('appInfo', {
    version: '1.0.0',
    name: 'PriceCheck AI Control Panel'
}); 