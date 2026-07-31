const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow;
let agentProcess;
let statsProcess;
let authToken = null;

const customPython = '/Library/Frameworks/Python.framework/Versions/3.12/bin/python3';
const pythonExe = process.platform === 'win32'
  ? 'python'
  : (fs.existsSync(customPython) ? customPython : 'python3');

const https = require('https');

const BACKEND_HOST = process.env.BACKEND_HOST || 'neurosync-4giu.onrender.com';
const BACKEND_PORT = process.env.BACKEND_PORT || 443;
const BACKEND_SECURE = process.env.BACKEND_SECURE !== 'false';

const CREDENTIALS_FILE = path.join(app.getPath('userData'), 'credentials.json');

function saveCredentials(email, token) {
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify({ email, token }));
}

function loadCredentials() {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
    }
  } catch {}
  return null;
}

function clearCredentials() {
  try { fs.unlinkSync(CREDENTIALS_FILE); } catch {}
}

function loginToBackend(email, password) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ email, password });
    const transport = BACKEND_SECURE ? https : http;
    const req = transport.request({
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: '/api/v1/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) resolve(parsed);
          else reject(new Error(parsed.detail || 'Login failed'));
        } catch { reject(new Error('Invalid response')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function createLoginWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 420,
    resizable: false,
    frame: false,
    backgroundColor: '#0a0e14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile('renderer/login.html');
}

function createDashboardWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0a0e14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile('renderer/index.html');
  mainWindow.on('closed', () => { mainWindow = null; });
}

function startAgent(token) {
  const agentScript = app.isPackaged
  ? path.join(process.resourcesPath, 'desktop-agent', 'agent', 'main.py')
  : path.join(__dirname, '..', 'desktop-agent', 'agent', 'main.py');
  const wsProto = BACKEND_SECURE ? 'wss' : 'ws';
  const portStr = (BACKEND_PORT == 443 || BACKEND_PORT == 80) ? '' : `:${BACKEND_PORT}`;
  const wsUrl = `${wsProto}://${BACKEND_HOST}${portStr}/ws`;
  const env = { ...process.env, NEUROSYNC_TOKEN: token || '' };

  agentProcess = spawn(pythonExe, [agentScript, '--url', wsUrl], { env });

  agentProcess.stdout.on('data', (data) => {
    const line = data.toString().trim();
    if (mainWindow) mainWindow.webContents.send('agent-log', line);
  });
  agentProcess.stderr.on('data', (data) => {
    const line = data.toString().trim();
    if (mainWindow) mainWindow.webContents.send('agent-log', line);
  });
  agentProcess.on('close', () => {
    if (mainWindow) mainWindow.webContents.send('agent-status', 'disconnected');
    setTimeout(() => startAgent(authToken), 5000);
  });
}

function startStats() {
  const statsScript = path.join(__dirname, 'renderer', 'stats.py');
  statsProcess = spawn(pythonExe, [statsScript]);

  let buffer = '';
  statsProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const stats = JSON.parse(line.trim());
        if (mainWindow) mainWindow.webContents.send('stats-update', stats);
      } catch {}
    }
  });
  statsProcess.on('close', () => setTimeout(startStats, 3000));
}

async function launchApp(email, token) {
  authToken = token;
  saveCredentials(email, token);
  if (mainWindow) mainWindow.close();
  createDashboardWindow();
  startAgent(token);
  startStats();
}

app.whenReady().then(async () => {
  const saved = loadCredentials();
  if (saved?.token) {
    authToken = saved.token;
    createDashboardWindow();
    startAgent(saved.token);
    startStats();
  } else {
    createLoginWindow();
  }
});

app.on('window-all-closed', () => {
  if (agentProcess) agentProcess.kill();
  if (statsProcess) statsProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('window-close', () => app.quit());
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});

ipcMain.handle('login', async (_, email, password) => {
  try {
    const data = await loginToBackend(email, password);
    const token = data.token || data.access_token;
    if (!token) return { success: false, error: 'No token received' };
    await launchApp(email, token);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-saved-email', async () => {
  const saved = loadCredentials();
  return saved?.email || null;
});

ipcMain.handle('logout', async () => {
  clearCredentials();
  authToken = null;
  if (agentProcess) { agentProcess.kill(); agentProcess = null; }
  if (statsProcess) { statsProcess.kill(); statsProcess = null; }
  if (mainWindow) mainWindow.close();
  createLoginWindow();
});