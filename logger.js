export function addLog(message, type = 'info') {
  const consoleLogs = document.getElementById('console-logs');
  if (!consoleLogs) return;
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry log-${type}`;
  const typeIcon = {
    'info': 'ℹ️',
    'success': '✅',
    'error': '❌',
    'warning': '⚠️',
    'debug': '🔍'
  }[type] || 'ℹ️';
  logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-icon">${typeIcon}</span> <span class="log-message">${message}</span>`;
  consoleLogs.appendChild(logEntry);
  consoleLogs.scrollTop = consoleLogs.scrollHeight;
  const logs = consoleLogs.querySelectorAll('.log-entry');
  if (logs.length > 100) {
    consoleLogs.removeChild(logs[0]);
  }
}

// Настраиваем обработчики кнопок
const clearLogsButton = document.getElementById('clear-logs');  
if (clearLogsButton) {
clearLogsButton.addEventListener('click', clearLogs);
}
export function clearLogs() {
  const consoleLogs = document.getElementById('console-logs');
  if (consoleLogs) consoleLogs.innerHTML = '';
}


export function showApiStatus(message, type = 'info') {
  const statusDiv = document.getElementById('api-status');
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.className = `api-status ${type}`;
  }
}