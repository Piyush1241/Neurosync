const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Auth
  login:         (email, password) => ipcRenderer.invoke('login', email, password),
  getSavedEmail: ()                => ipcRenderer.invoke('get-saved-email'),
  logout:        ()                => ipcRenderer.invoke('logout'),

  // Window controls
  closeWindow:    () => ipcRenderer.send('window-close'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),

  // Data streams
  onAgentLog:    (cb) => ipcRenderer.on('agent-log',    (_, d) => cb(d)),
  onAgentStatus: (cb) => ipcRenderer.on('agent-status', (_, d) => cb(d)),
  onStatsUpdate: (cb) => ipcRenderer.on('stats-update', (_, d) => cb(d)),
});