// Control Panel JavaScript
let logs = [];

// Service status tracking
let serviceStatus = {
    backend: 'stopped',  // stopped, starting, running, error
    frontend: 'stopped'  // stopped, starting, running, error
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    // Load app version
    try {
        const version = await window.electronAPI.getAppVersion();
        document.getElementById('app-version').textContent = version;
    } catch (error) {
        console.error('Failed to get app version:', error);
    }

    // Set up log listeners
    window.electronAPI.onBackendLog((event, data) => {
        addLog(`[BACKEND] ${data}`, 'backend');
        
        // Check if backend is running based on log content
        if (data.includes('Server listening on port 3000')) {
            updateServiceStatus('backend', 'running');
        }
    });

    window.electronAPI.onFrontendLog((event, data) => {
        addLog(`[FRONTEND] ${data}`, 'frontend');
        
        // Check if frontend is running based on log content
        // Strip ANSI codes and check for the local server message
        const cleanData = data.replace(/\x1b\[[0-9;]*m/g, '');
        if (cleanData.includes('Local:') && cleanData.includes('http://localhost:')) {
            updateServiceStatus('frontend', 'running');
        }
    });

    window.electronAPI.onShowTutorial(() => {
        showTutorial();
    });

    // Load session logs
    await loadSessionLogs();
    
    // Check current service status from logs
    checkServiceStatusFromLogs();
    
    addLog('Control Panel initialized successfully!', 'system');
    
    updateButtonStates();
});

// Logging functions
async function loadSessionLogs() {
    try {
        const sessionLogs = await window.electronAPI.getSessionLogs();
        const logsOutput = document.getElementById('logs-output');
        
        // Clear current display
        logsOutput.textContent = '';
        logs = [];
        
        // Load session logs
        sessionLogs.forEach(logEntry => {
            logsOutput.textContent += logEntry + '\n';
            logs.push(logEntry);
        });
        
        logsOutput.scrollTop = logsOutput.scrollHeight;
    } catch (error) {
        console.error('Failed to load session logs:', error);
    }
}

function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    logs.push(logEntry);
    
    const logsOutput = document.getElementById('logs-output');
    logsOutput.textContent += logEntry + '\n';
    logsOutput.scrollTop = logsOutput.scrollHeight;
}

function clearLogs() {
    document.getElementById('logs-output').textContent = 'Logs cleared.\n';
    logs = [];
    addLog('Display cleared', 'system');
}

function checkServiceStatusFromLogs() {
    // Initialize as stopped
    let backendStatus = 'stopped';
    let frontendStatus = 'stopped';
    
    // Check logs for service status
    logs.forEach(logEntry => {
        if (logEntry.includes('Backend: 🚀 Server listening on port 3000')) {
            backendStatus = 'running';
        } else if (logEntry.includes('Backend stopped')) {
            backendStatus = 'stopped';
        }
        
        // Strip ANSI codes for frontend detection
        const cleanEntry = logEntry.replace(/\x1b\[[0-9;]*m/g, '');
        if (cleanEntry.includes('Frontend:') && cleanEntry.includes('Local:') && cleanEntry.includes('http://localhost:')) {
            frontendStatus = 'running';
        } else if (logEntry.includes('Frontend stopped')) {
            frontendStatus = 'stopped';
        }
    });
    
    updateServiceStatus('backend', backendStatus);
    updateServiceStatus('frontend', frontendStatus);
}

// Service status management
function updateServiceStatus(service, status) {
    serviceStatus[service] = status;
    
    const statusElement = document.getElementById(`${service}-status`);
    const statusText = document.getElementById(`${service}-status-text`);
    const statusDot = document.getElementById(`${service}-dot`);
    
    // Remove all status classes
    statusElement.className = 'service-status-badge';
    
    // Add appropriate status class and update text
    switch(status) {
        case 'stopped':
            statusElement.classList.add('status-stopped');
            statusText.textContent = 'Stopped';
            break;
        case 'starting':
            statusElement.classList.add('status-starting');
            statusText.textContent = 'Starting...';
            break;
        case 'running':
            statusElement.classList.add('status-running');
            statusText.textContent = 'Running';
            break;
        case 'error':
            statusElement.classList.add('status-error');
            statusText.textContent = 'Error';
            break;
    }
    
    updateButtonStates();
}

function updateButtonStates() {
    const backendRunning = serviceStatus.backend === 'running';
    const frontendRunning = serviceStatus.frontend === 'running';
    const anyRunning = backendRunning || frontendRunning;
    const allRunning = backendRunning && frontendRunning;
    const backendStopped = serviceStatus.backend === 'stopped';
    const frontendStopped = serviceStatus.frontend === 'stopped';
    
    // Start All button
    const startAllBtn = document.getElementById('start-all-btn');
    startAllBtn.disabled = allRunning;
    
    // Restart All button
    const restartAllBtn = document.getElementById('restart-all-btn');
    restartAllBtn.disabled = !anyRunning;
    
    // Stop All button
    const stopAllBtn = document.getElementById('stop-all-btn');
    stopAllBtn.disabled = !anyRunning;
    
    // Backend buttons
    const startBackendBtn = document.getElementById('start-backend-btn');
    const restartBackendBtn = document.getElementById('restart-backend-btn');
    const stopBackendBtn = document.getElementById('stop-backend-btn');
    
    startBackendBtn.disabled = backendRunning;
    restartBackendBtn.disabled = backendStopped;
    stopBackendBtn.disabled = backendStopped;
    
    // Frontend buttons
    const startFrontendBtn = document.getElementById('start-frontend-btn');
    const restartFrontendBtn = document.getElementById('restart-frontend-btn');
    const stopFrontendBtn = document.getElementById('stop-frontend-btn');
    const openFrontendBtn = document.getElementById('open-frontend-btn');
    
    startFrontendBtn.disabled = frontendRunning;
    restartFrontendBtn.disabled = frontendStopped;
    stopFrontendBtn.disabled = frontendStopped;
    openFrontendBtn.disabled = frontendStopped;
}

// Service control functions
async function startServices() {
    const spinner = document.getElementById('start-spinner');
    spinner.style.display = 'inline-block';
    
    try {
        addLog('Starting all services...', 'system');
        
        // Start backend
        updateServiceStatus('backend', 'starting');
        const backendResult = await window.electronAPI.startBackend();
        addLog(`Backend: ${backendResult.message}`, backendResult.success ? 'success' : 'error');
        if (!backendResult.success) {
            updateServiceStatus('backend', 'error');
        }
        // Note: Status will be updated to 'running' when we detect the server listening message
        
        // Wait a moment before starting frontend
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Start frontend
        updateServiceStatus('frontend', 'starting');
        const frontendResult = await window.electronAPI.startFrontend();
        addLog(`Frontend: ${frontendResult.message}`, frontendResult.success ? 'success' : 'error');
        if (!frontendResult.success) {
            updateServiceStatus('frontend', 'error');
        }
        // Note: Status will be updated to 'running' when we detect the local server message
        
        if (backendResult.success && frontendResult.success) {
            addLog('Services are starting... Status will update when ready.', 'success');
        } else {
            addLog('Some services failed to start. Check logs above.', 'warning');
        }
    } catch (error) {
        addLog(`Error starting services: ${error.message}`, 'error');
        updateServiceStatus('backend', 'error');
        updateServiceStatus('frontend', 'error');
    } finally {
        spinner.style.display = 'none';
    }
}

async function restartServices() {
    const spinner = document.getElementById('restart-spinner');
    spinner.style.display = 'inline-block';
    
    try {
        addLog('Restarting all services...', 'system');
        
        // Stop services first
        await window.electronAPI.stopBackend();
        await window.electronAPI.stopFrontend();
        updateServiceStatus('backend', 'stopped');
        updateServiceStatus('frontend', 'stopped');
        addLog('Services stopped, restarting...', 'system');
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Start backend
        updateServiceStatus('backend', 'starting');
        const backendResult = await window.electronAPI.startBackend();
        addLog(`Backend: ${backendResult.message}`, backendResult.success ? 'success' : 'error');
        updateServiceStatus('backend', backendResult.success ? 'running' : 'error');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Start frontend
        updateServiceStatus('frontend', 'starting');
        const frontendResult = await window.electronAPI.startFrontend();
        addLog(`Frontend: ${frontendResult.message}`, frontendResult.success ? 'success' : 'error');
        updateServiceStatus('frontend', frontendResult.success ? 'running' : 'error');
        
        addLog('Services restarted!', 'success');
    } catch (error) {
        addLog(`Error restarting services: ${error.message}`, 'error');
        updateServiceStatus('backend', 'error');
        updateServiceStatus('frontend', 'error');
    } finally {
        spinner.style.display = 'none';
    }
}

async function stopServices() {
    const spinner = document.getElementById('stop-spinner');
    spinner.style.display = 'inline-block';
    
    try {
        addLog('Stopping all services...', 'system');
        
        const backendResult = await window.electronAPI.stopBackend();
        const frontendResult = await window.electronAPI.stopFrontend();
        
        addLog(`Backend: ${backendResult.message}`, backendResult.success ? 'success' : 'error');
        addLog(`Frontend: ${frontendResult.message}`, frontendResult.success ? 'success' : 'error');
        
        updateServiceStatus('backend', 'stopped');
        updateServiceStatus('frontend', 'stopped');
        addLog('All services stopped!', 'success');
    } catch (error) {
        addLog(`Error stopping services: ${error.message}`, 'error');
    } finally {
        spinner.style.display = 'none';
    }
}

// Individual service controls
async function startBackend() {
    try {
        addLog('Starting backend server...', 'system');
        updateServiceStatus('backend', 'starting');
        const result = await window.electronAPI.startBackend();
        addLog(`Backend: ${result.message}`, result.success ? 'success' : 'error');
        updateServiceStatus('backend', result.success ? 'running' : 'error');
    } catch (error) {
        addLog(`Error starting backend: ${error.message}`, 'error');
        updateServiceStatus('backend', 'error');
    }
}

async function stopBackend() {
    try {
        addLog('Stopping backend server...', 'system');
        const result = await window.electronAPI.stopBackend();
        addLog(`Backend: ${result.message}`, result.success ? 'success' : 'error');
        updateServiceStatus('backend', 'stopped');
    } catch (error) {
        addLog(`Error stopping backend: ${error.message}`, 'error');
        updateServiceStatus('backend', 'error');
    }
}

async function restartBackend() {
    try {
        addLog('Restarting backend server...', 'system');
        updateServiceStatus('backend', 'starting');
        const result = await window.electronAPI.restartBackend();
        addLog(`Backend: ${result.message}`, result.success ? 'success' : 'error');
        updateServiceStatus('backend', result.success ? 'running' : 'error');
    } catch (error) {
        addLog(`Error restarting backend: ${error.message}`, 'error');
        updateServiceStatus('backend', 'error');
    }
}

async function startFrontend() {
    try {
        addLog('Starting frontend server...', 'system');
        updateServiceStatus('frontend', 'starting');
        const result = await window.electronAPI.startFrontend();
        addLog(`Frontend: ${result.message}`, result.success ? 'success' : 'error');
        updateServiceStatus('frontend', result.success ? 'running' : 'error');
    } catch (error) {
        addLog(`Error starting frontend: ${error.message}`, 'error');
        updateServiceStatus('frontend', 'error');
    }
}

async function stopFrontend() {
    try {
        addLog('Stopping frontend server...', 'system');
        const result = await window.electronAPI.stopFrontend();
        addLog(`Frontend: ${result.message}`, result.success ? 'success' : 'error');
        updateServiceStatus('frontend', 'stopped');
    } catch (error) {
        addLog(`Error stopping frontend: ${error.message}`, 'error');
        updateServiceStatus('frontend', 'error');
    }
}

async function restartFrontend() {
    try {
        addLog('Restarting frontend server...', 'system');
        updateServiceStatus('frontend', 'starting');
        const result = await window.electronAPI.restartFrontend();
        addLog(`Frontend: ${result.message}`, result.success ? 'success' : 'error');
        updateServiceStatus('frontend', result.success ? 'running' : 'error');
    } catch (error) {
        addLog(`Error restarting frontend: ${error.message}`, 'error');
        updateServiceStatus('frontend', 'error');
    }
}

async function openFrontend() {
    try {
        addLog('Opening frontend application...', 'system');
        await window.electronAPI.openFrontend();
        addLog('Frontend opened in default browser', 'success');
    } catch (error) {
        addLog(`Error opening frontend: ${error.message}`, 'error');
    }
}

// Pharmacy status checking
let lastPharmacyResults = [];

async function checkPharmacyStatus() {
    const spinner = document.getElementById('status-spinner');
    const statusContainer = document.getElementById('pharmacy-status');
    const checkBtn = document.getElementById('check-status-btn');
    
    spinner.style.display = 'inline-block';
    checkBtn.disabled = true;
    statusContainer.innerHTML = '<div class="status-item"><span>🔍 Checking pharmacy websites... (up to 3 retries each)</span></div>';
    
    try {
        addLog('Starting pharmacy connectivity check...', 'system');
        const results = await window.electronAPI.checkPharmacyStatus();
        lastPharmacyResults = results;
        
        displayPharmacyResults(results);
        
        const onlineCount = results.filter(r => r.status === 'Online').length;
        const failedCount = results.filter(r => r.status === 'Failed').length;
        
        addLog(`Pharmacy check completed: ${onlineCount} online, ${failedCount} failed`, 'success');
        
        // Show refresh button if there are failed pharmacies
        const refreshBtn = document.getElementById('refresh-failed-btn');
        if (failedCount > 0) {
            refreshBtn.style.display = 'block';
        } else {
            refreshBtn.style.display = 'none';
        }
        
    } catch (error) {
        addLog(`Error checking pharmacy status: ${error.message}`, 'error');
        statusContainer.innerHTML = '<div class="status-item"><span>❌ Error checking pharmacy status</span></div>';
    } finally {
        spinner.style.display = 'none';
        checkBtn.disabled = false;
    }
}

async function refreshFailedPharmacies() {
    const failedPharmacies = lastPharmacyResults.filter(r => r.status === 'Failed');
    if (failedPharmacies.length === 0) {
        addLog('No failed pharmacies to refresh', 'info');
        return;
    }
    
    addLog(`Refreshing ${failedPharmacies.length} failed pharmacies...`, 'system');
    
    // For now, just re-run the full check
    // In a more advanced implementation, we could add a separate API endpoint for specific pharmacies
    await checkPharmacyStatus();
}

function displayPharmacyResults(results) {
    const statusContainer = document.getElementById('pharmacy-status');
    statusContainer.innerHTML = '';
    
    results.forEach(result => {
        const statusItem = document.createElement('div');
        statusItem.className = `status-item ${result.status === 'Online' ? 'status-online' : 'status-offline'}`;
        
        const statusIcon = result.status === 'Online' ? '✅' : '❌';
        const attemptsText = result.attempts > 1 ? ` (${result.attempts} attempts)` : '';
        const errorText = result.error ? ` - ${result.error}` : '';
        
        statusItem.innerHTML = `
            <div>
                <strong>${result.name}</strong>
                <div style="font-size: 11px; color: #888; margin-top: 2px;">
                    ${result.url}${attemptsText}
                </div>
            </div>
            <span class="status-badge ${result.status === 'Online' ? 'badge-online' : 'badge-offline'}">
                ${statusIcon} ${result.status}${errorText}
            </span>
        `;
        
        statusContainer.appendChild(statusItem);
        
        addLog(`${result.name}: ${result.status}${attemptsText}${errorText}`, result.status === 'Online' ? 'success' : 'warning');
    });
}

// Log management
async function exportLogs() {
    try {
        addLog('Exporting logs...', 'system');
        const result = await window.electronAPI.exportLogs();
        addLog(`Export: ${result.message}`, result.success ? 'success' : 'error');
    } catch (error) {
        addLog(`Error exporting logs: ${error.message}`, 'error');
    }
}

async function copyLogs() {
    try {
        addLog('Copying logs to clipboard...', 'system');
        const result = await window.electronAPI.copyLogs();
        addLog(`Copy: ${result.message}`, result.success ? 'success' : 'error');
    } catch (error) {
        addLog(`Error copying logs: ${error.message}`, 'error');
    }
}

// Tutorial functions
function showTutorial() {
    document.getElementById('tutorial-modal').style.display = 'block';
}

function closeTutorial() {
    const modal = document.getElementById('tutorial-modal');
    const dontShowAgain = document.getElementById('dont-show-again');
    
    modal.style.display = 'none';
    
    // Always call tutorialCompleted, but pass the checkbox state
    window.electronAPI.tutorialCompleted(dontShowAgain.checked);
    
    if (dontShowAgain.checked) {
        addLog('Tutorial preference saved - won\'t show again', 'system');
    } else {
        addLog('Tutorial closed', 'system');
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('tutorial-modal');
    if (event.target === modal) {
        closeTutorial();
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
    // Ctrl+Shift+T for tutorial
    if (event.ctrlKey && event.shiftKey && event.key === 'T') {
        showTutorial();
    }
    
    // Ctrl+Shift+C for clear logs
    if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        clearLogs();
    }
    
    // Ctrl+Shift+S for start services
    if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        startServices();
    }
});

// Add some helpful startup messages
setTimeout(() => {
    addLog('💡 Tip: Use Ctrl+Shift+T to show tutorial', 'info');
    addLog('💡 Tip: Use Ctrl+Shift+C to clear logs', 'info');
    addLog('💡 Tip: Use Ctrl+Shift+S to start all services', 'info');
}, 1000); 