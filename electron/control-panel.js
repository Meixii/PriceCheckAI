class ControlPanel {
    constructor() {
        this.logs = [];
        this.serviceStatus = {
            backend: 'stopped',
            frontend: 'stopped'
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateServiceStatus();
        this.startStatusPolling();
        this.setupLogListener();
        this.checkFirstTimeVisit();
    }

    setupEventListeners() {
        // Service control buttons
        document.getElementById('start-all-btn').addEventListener('click', () => this.startServices());
        document.getElementById('stop-all-btn').addEventListener('click', () => this.stopServices());
        document.getElementById('restart-all-btn').addEventListener('click', () => this.restartServices());
        
        // Backend controls
        document.getElementById('start-backend-btn').addEventListener('click', () => this.startBackend());
        document.getElementById('stop-backend-btn').addEventListener('click', () => this.stopBackend());
        document.getElementById('restart-backend-btn').addEventListener('click', () => this.restartBackend());
        
        // Frontend controls
        document.getElementById('start-frontend-btn').addEventListener('click', () => this.startFrontend());
        document.getElementById('stop-frontend-btn').addEventListener('click', () => this.stopFrontend());
        document.getElementById('restart-frontend-btn').addEventListener('click', () => this.restartFrontend());
        
        // Emergency controls
        document.getElementById('force-cleanup-btn').addEventListener('click', () => this.forceCleanup());
        document.getElementById('emergency-shutdown-btn').addEventListener('click', () => this.emergencyShutdown());
        document.getElementById('repair-deps-btn').addEventListener('click', () => this.repairDependencies());
        
        // Utility buttons
        document.getElementById('open-frontend-btn').addEventListener('click', () => this.openFrontend());
        document.getElementById('check-status-btn').addEventListener('click', () => this.checkPharmacyStatus());
        
        // Log buttons
        const exportBtn = document.querySelector('[onclick="exportLogs()"]');
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportLogs());
        
        const copyBtn = document.querySelector('[onclick="copyLogs()"]');
        if (copyBtn) copyBtn.addEventListener('click', () => this.copyLogs());
        
        const clearBtn = document.querySelector('[onclick="clearLogs()"]');
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearLogs());
        
        const tutorialBtn = document.querySelector('[onclick="showTutorial()"]');
        if (tutorialBtn) tutorialBtn.addEventListener('click', () => this.showTutorial());
    }

    setupLogListener() {
        if (window.electronAPI) {
            window.electronAPI.onLogMessage((data) => {
                this.addLog(data.type, data.message, data.timestamp);
            });
        }
    }

    addLog(type, message, timestamp) {
        const logEntry = {
            type,
            message: message.trim(),
            timestamp: timestamp || new Date().toISOString()
        };
        
        this.logs.push(logEntry);
        this.displayLog(logEntry);
        this.scrollLogsToBottom();
    }

    displayLog(logEntry) {
        const logsOutput = document.getElementById('logs-output');
        const time = new Date(logEntry.timestamp).toLocaleTimeString();
        const typeColor = this.getLogTypeColor(logEntry.type);
        
        const logLine = `[${time}] [${logEntry.type.toUpperCase()}] ${logEntry.message}\n`;
        logsOutput.textContent += logLine;
    }

    getLogTypeColor(type) {
        const colors = {
            'backend': '#4caf50',
            'frontend': '#2196f3',
            'backend-error': '#f44336',
            'frontend-error': '#f44336',
            'system': '#ff9800',
            'install': '#9c27b0',
            'error': '#f44336'
        };
        return colors[type] || '#e0e6ed';
    }

    scrollLogsToBottom() {
        const logsOutput = document.getElementById('logs-output');
        logsOutput.scrollTop = logsOutput.scrollHeight;
    }

    async startServices() {
        this.setButtonLoading('start-all-btn', 'start-spinner', true);
        try {
            const result = await window.electronAPI.startServices();
            this.addLog('system', result.message);
            if (result.success) {
                this.addLog('system', 'Services starting... Please wait for initialization.');
            }
        } catch (error) {
            this.addLog('error', `Failed to start services: ${error.message}`);
        } finally {
            this.setButtonLoading('start-all-btn', 'start-spinner', false);
        }
    }

    async stopServices() {
        this.setButtonLoading('stop-all-btn', 'stop-spinner', true);
        try {
            const result = await window.electronAPI.stopServices();
            this.addLog('system', result.message);
        } catch (error) {
            this.addLog('error', `Failed to stop services: ${error.message}`);
        } finally {
            this.setButtonLoading('stop-all-btn', 'stop-spinner', false);
        }
    }

    async restartServices() {
        this.setButtonLoading('restart-all-btn', 'restart-spinner', true);
        try {
            const result = await window.electronAPI.restartServices();
            this.addLog('system', result.message);
        } catch (error) {
            this.addLog('error', `Failed to restart services: ${error.message}`);
        } finally {
            this.setButtonLoading('restart-all-btn', 'restart-spinner', false);
        }
    }

    async startBackend() {
        this.setButtonLoading('start-backend-btn', null, true);
        try {
            const result = await window.electronAPI.startBackend();
            this.addLog('backend', result.message);
        } catch (error) {
            this.addLog('error', `Failed to start backend: ${error.message}`);
        } finally {
            this.setButtonLoading('start-backend-btn', null, false);
        }
    }

    async stopBackend() {
        this.setButtonLoading('stop-backend-btn', null, true);
        try {
            const result = await window.electronAPI.stopBackend();
            this.addLog('backend', result.message);
        } catch (error) {
            this.addLog('error', `Failed to stop backend: ${error.message}`);
        } finally {
            this.setButtonLoading('stop-backend-btn', null, false);
        }
    }

    async restartBackend() {
        this.setButtonLoading('restart-backend-btn', null, true);
        try {
            const result = await window.electronAPI.restartBackend();
            this.addLog('backend', result.message);
        } catch (error) {
            this.addLog('error', `Failed to restart backend: ${error.message}`);
        } finally {
            this.setButtonLoading('restart-backend-btn', null, false);
        }
    }

    async startFrontend() {
        this.setButtonLoading('start-frontend-btn', null, true);
        try {
            const result = await window.electronAPI.startFrontend();
            this.addLog('frontend', result.message);
        } catch (error) {
            this.addLog('error', `Failed to start frontend: ${error.message}`);
        } finally {
            this.setButtonLoading('start-frontend-btn', null, false);
        }
    }

    async stopFrontend() {
        this.setButtonLoading('stop-frontend-btn', null, true);
        try {
            const result = await window.electronAPI.stopFrontend();
            this.addLog('frontend', result.message);
        } catch (error) {
            this.addLog('error', `Failed to stop frontend: ${error.message}`);
        } finally {
            this.setButtonLoading('stop-frontend-btn', null, false);
        }
    }

    async restartFrontend() {
        this.setButtonLoading('restart-frontend-btn', null, true);
        try {
            const result = await window.electronAPI.restartFrontend();
            this.addLog('frontend', result.message);
        } catch (error) {
            this.addLog('error', `Failed to restart frontend: ${error.message}`);
        } finally {
            this.setButtonLoading('restart-frontend-btn', null, false);
        }
    }

    async openFrontend() {
        try {
            await window.electronAPI.openFrontend();
            this.addLog('system', 'Opening Price Checker in browser...');
        } catch (error) {
            this.addLog('error', `Failed to open frontend: ${error.message}`);
        }
    }

    async checkPharmacyStatus() {
        this.setButtonLoading('check-status-btn', 'status-spinner', true);
        this.addLog('system', 'Checking pharmacy website connectivity...');
        
        try {
            const results = await window.electronAPI.checkPharmacyStatus();
            this.displayPharmacyStatus(results);
            this.addLog('system', 'Pharmacy status check completed');
        } catch (error) {
            this.addLog('error', `Failed to check pharmacy status: ${error.message}`);
        } finally {
            this.setButtonLoading('check-status-btn', 'status-spinner', false);
        }
    }

    displayPharmacyStatus(results) {
        const statusContainer = document.getElementById('pharmacy-status');
        statusContainer.innerHTML = '';
        
        results.forEach(pharmacy => {
            const statusItem = document.createElement('div');
            statusItem.className = `status-item ${pharmacy.status === 'online' ? 'status-online' : 'status-offline'}`;
            
            statusItem.innerHTML = `
                <span>${pharmacy.name}</span>
                <span class="status-badge ${pharmacy.status === 'online' ? 'badge-online' : 'badge-offline'}">
                    ${pharmacy.status.toUpperCase()}
                </span>
            `;
            
            statusContainer.appendChild(statusItem);
        });
    }

    async updateServiceStatus() {
        try {
            const status = await window.electronAPI.getServiceStatus();
            this.serviceStatus = status;
            this.updateStatusDisplay();
        } catch (error) {
            console.error('Failed to get service status:', error);
        }
    }

    updateStatusDisplay() {
        // Update backend status
        const backendStatus = document.getElementById('backend-status');
        const backendDot = document.getElementById('backend-dot');
        const backendText = document.getElementById('backend-status-text');
        
        if (backendStatus && backendDot && backendText) {
            const isRunning = this.serviceStatus.backend === 'running';
            backendStatus.className = `service-status-badge ${isRunning ? 'status-running' : 'status-stopped'}`;
            backendText.textContent = isRunning ? 'Running' : 'Stopped';
        }
        
        // Update frontend status
        const frontendStatus = document.getElementById('frontend-status');
        const frontendDot = document.getElementById('frontend-dot');
        const frontendText = document.getElementById('frontend-status-text');
        
        if (frontendStatus && frontendDot && frontendText) {
            const isRunning = this.serviceStatus.frontend === 'running';
            frontendStatus.className = `service-status-badge ${isRunning ? 'status-running' : 'status-stopped'}`;
            frontendText.textContent = isRunning ? 'Running' : 'Stopped';
        }
    }

    startStatusPolling() {
        // Update status every 3 seconds
        setInterval(() => {
            this.updateServiceStatus();
        }, 3000);
    }

    setButtonLoading(buttonId, spinnerId, loading) {
        const button = document.getElementById(buttonId);
        const spinner = spinnerId ? document.getElementById(spinnerId) : button.querySelector('.spinner');
        
        if (button) {
            if (loading) {
                button.disabled = true;
                button.classList.add('loading');
                if (spinner) spinner.style.display = 'inline-block';
            } else {
                button.disabled = false;
                button.classList.remove('loading');
                if (spinner) spinner.style.display = 'none';
            }
        }
    }

    async exportLogs() {
        try {
            const logText = this.logs.map(log => 
                `[${new Date(log.timestamp).toLocaleString()}] [${log.type.toUpperCase()}] ${log.message}`
            ).join('\n');
            
            const result = await window.electronAPI.exportLogs(logText);
            if (result.success) {
                this.addLog('system', 'Logs exported successfully');
            } else {
                this.addLog('error', result.message);
            }
        } catch (error) {
            this.addLog('error', `Failed to export logs: ${error.message}`);
        }
    }

    copyLogs() {
        const logText = this.logs.map(log => 
            `[${new Date(log.timestamp).toLocaleString()}] [${log.type.toUpperCase()}] ${log.message}`
        ).join('\n');
        
        navigator.clipboard.writeText(logText).then(() => {
            this.addLog('system', 'Logs copied to clipboard');
        }).catch(error => {
            this.addLog('error', `Failed to copy logs: ${error.message}`);
        });
    }

    clearLogs() {
        const logsOutput = document.getElementById('logs-output');
        logsOutput.textContent = 'Logs cleared.\n';
        this.addLog('system', 'Log display cleared');
    }

    showTutorial() {
        const modal = document.getElementById('tutorial-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closeTutorial() {
        const modal = document.getElementById('tutorial-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    checkFirstTimeVisit() {
        const hasVisited = localStorage.getItem('pricecheck-visited');
        if (!hasVisited) {
            setTimeout(() => {
                this.showTutorial();
                localStorage.setItem('pricecheck-visited', 'true');
            }, 2000);
        }
    }

    async forceCleanup() {
        // Show confirmation dialog
        const confirmed = confirm(
            '⚠️ WARNING: Force Stop All\n\n' +
            'This will immediately kill all running processes without graceful shutdown.\n' +
            'Only use this if normal stop controls are not working.\n\n' +
            'Are you sure you want to continue?'
        );

        if (!confirmed) {
            this.addLog('system', 'Force cleanup cancelled by user');
            return;
        }

        this.setButtonLoading('force-cleanup-btn', null, true);
        this.addLog('system', '🔴 EMERGENCY: Force stopping all processes...');
        
        try {
            await window.electronAPI.forceCleanup();
            this.addLog('system', 'Force cleanup completed');
        } catch (error) {
            this.addLog('error', `Force cleanup error: ${error.message}`);
        } finally {
            this.setButtonLoading('force-cleanup-btn', null, false);
            // Update status after cleanup
            setTimeout(() => this.updateServiceStatus(), 1000);
        }
    }

    async emergencyShutdown() {
        // Show confirmation dialog
        const confirmed = confirm(
            '🔴 EMERGENCY SHUTDOWN\n\n' +
            'This will immediately close the entire application and stop all services.\n' +
            'Any unsaved work may be lost.\n\n' +
            'Are you sure you want to exit the application?'
        );

        if (!confirmed) {
            this.addLog('system', 'Emergency shutdown cancelled by user');
            return;
        }

        this.setButtonLoading('emergency-shutdown-btn', null, true);
        this.addLog('system', '🔴 EMERGENCY SHUTDOWN: Closing application...');
        
        try {
            // Give a brief moment for the log to display
            setTimeout(async () => {
                await window.electronAPI.emergencyShutdown();
            }, 500);
        } catch (error) {
            this.addLog('error', `Emergency shutdown error: ${error.message}`);
            this.setButtonLoading('emergency-shutdown-btn', null, false);
        }
    }

    async repairDependencies() {
        // Show confirmation dialog
        const confirmed = confirm(
            '🔧 REPAIR BACKEND DEPENDENCIES\n\n' +
            'This will:\n' +
            '• Stop the backend service\n' +
            '• Clean all existing dependencies\n' +
            '• Reinstall everything from scratch\n\n' +
            'This may take several minutes. Continue?'
        );

        if (!confirmed) {
            this.addLog('system', 'Dependency repair cancelled by user');
            return;
        }

        this.setButtonLoading('repair-deps-btn', null, true);
        this.addLog('system', '🔧 REPAIR: Starting backend dependency repair...');
        
        try {
            const result = await window.electronAPI.repairDependencies();
            if (result.success) {
                this.addLog('system', '✅ Repair completed successfully');
                this.addLog('system', 'You can now try starting the backend again');
            } else {
                this.addLog('error', `Repair failed: ${result.message}`);
            }
        } catch (error) {
            this.addLog('error', `Repair error: ${error.message}`);
        } finally {
            this.setButtonLoading('repair-deps-btn', null, false);
            // Update status after repair
            setTimeout(() => this.updateServiceStatus(), 1000);
        }
    }
}

// Initialize the control panel when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.controlPanel = new ControlPanel();
});

// Make functions available globally for HTML onclick handlers
window.startServices = () => window.controlPanel?.startServices();
window.stopServices = () => window.controlPanel?.stopServices();
window.restartServices = () => window.controlPanel?.restartServices();
window.startBackend = () => window.controlPanel?.startBackend();
window.stopBackend = () => window.controlPanel?.stopBackend();
window.restartBackend = () => window.controlPanel?.restartBackend();
window.startFrontend = () => window.controlPanel?.startFrontend();
window.stopFrontend = () => window.controlPanel?.stopFrontend();
window.restartFrontend = () => window.controlPanel?.restartFrontend();
window.openFrontend = () => window.controlPanel?.openFrontend();
window.checkPharmacyStatus = () => window.controlPanel?.checkPharmacyStatus();
window.exportLogs = () => window.controlPanel?.exportLogs();
window.copyLogs = () => window.controlPanel?.copyLogs();
window.clearLogs = () => window.controlPanel?.clearLogs();
window.showTutorial = () => window.controlPanel?.showTutorial();
window.closeTutorial = () => window.controlPanel?.closeTutorial();
window.refreshFailedPharmacies = () => window.controlPanel?.checkPharmacyStatus();
window.forceCleanup = () => window.controlPanel?.forceCleanup();
window.emergencyShutdown = () => window.controlPanel?.emergencyShutdown();
window.repairDependencies = () => window.controlPanel?.repairDependencies(); 