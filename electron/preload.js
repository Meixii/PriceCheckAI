const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Backend controls
  startBackend: () => ipcRenderer.invoke('start-backend'),
  stopBackend: () => ipcRenderer.invoke('stop-backend'),
  restartBackend: () => ipcRenderer.invoke('restart-backend'),
  
  // Frontend controls
  startFrontend: () => ipcRenderer.invoke('start-frontend'),
  stopFrontend: () => ipcRenderer.invoke('stop-frontend'),
  restartFrontend: () => ipcRenderer.invoke('restart-frontend'),
  
  // Pharmacy status
  checkPharmacyStatus: () => ipcRenderer.invoke('check-pharmacy-status'),
  
  // Logs
  exportLogs: () => ipcRenderer.invoke('export-logs'),
  copyLogs: () => ipcRenderer.invoke('copy-logs'),
  getSessionLogs: () => ipcRenderer.invoke('get-session-logs'),
  
  // App controls
  openFrontend: () => ipcRenderer.invoke('open-frontend'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Tutorial
  tutorialCompleted: (dontShowAgain) => ipcRenderer.invoke('tutorial-completed', dontShowAgain),
  
  // Event listeners
  onBackendLog: (callback) => ipcRenderer.on('backend-log', callback),
  onFrontendLog: (callback) => ipcRenderer.on('frontend-log', callback),
  onShowTutorial: (callback) => ipcRenderer.on('show-tutorial', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
}); 