const { app, BrowserWindow, ipcMain, Menu, MenuItem } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

app.on('web-contents-created', (event, contents) => {
  contents.on('context-menu', (e, params) => {
    if (params.selectionText && params.selectionText.trim().length > 0) {
      const menu = new Menu();
      menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
      menu.popup({ window: BrowserWindow.fromWebContents(contents) });
    }
  });
});

let mainWindow;
let agentProcess;
let statsProcess;
let authToken = null;

function getPythonExecutable() {
  if (app.isPackaged) {
    const bundledWin = path.join(process.resourcesPath, 'python', 'python.exe');
    const bundledMac = path.join(process.resourcesPath, 'python', 'bin', 'python3');
    const bundledLinux = path.join(process.resourcesPath, 'python', 'bin', 'python3');

    if (process.platform === 'win32' && fs.existsSync(bundledWin)) return bundledWin;
    if (process.platform === 'darwin' && fs.existsSync(bundledMac)) return bundledMac;
    if (process.platform === 'linux' && fs.existsSync(bundledLinux)) return bundledLinux;
  }

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    const candidates = [
      path.join(localAppData, 'Programs', 'Python', 'Python312', 'python.exe'),
      path.join(localAppData, 'Programs', 'Python', 'Python311', 'python.exe'),
      path.join(localAppData, 'Programs', 'Python', 'Python310', 'python.exe'),
      path.join(programFiles, 'Python312', 'python.exe'),
      path.join(programFiles, 'Python311', 'python.exe'),
      'C:\\Python312\\python.exe',
      'C:\\Python311\\python.exe',
      'python',
      'python3',
      'py',
    ];

    for (const cand of candidates) {
      if (!cand.includes('\\') && !cand.includes('/')) return cand;
      if (fs.existsSync(cand)) return cand;
    }
    return 'python';
  } else {
    const customPython = '/Library/Frameworks/Python.framework/Versions/3.12/bin/python3';
    return fs.existsSync(customPython) ? customPython : 'python3';
  }
}

const pythonExe = getPythonExecutable();

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

function makeLoginReq(hostname, port, secure, email, password) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ email, password });
    const transport = secure ? https : http;
    const req = transport.request({
      hostname,
      port,
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

async function loginToBackend(email, password) {
  try {
    return await makeLoginReq(BACKEND_HOST, BACKEND_PORT, BACKEND_SECURE, email, password);
  } catch (err) {
    if (BACKEND_HOST !== '127.0.0.1' && BACKEND_HOST !== 'localhost') {
      try {
        return await makeLoginReq('127.0.0.1', 8000, false, email, password);
      } catch {}
    }
    throw err;
  }
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

function ensureDependenciesAndStartAgent(token) {
  if (mainWindow) mainWindow.webContents.send('agent-log', 'Checking Python dependencies...');
  
  const checkCmd = 'import dotenv, psutil, websockets, pyautogui, pyperclip, requests; print("DEPS_OK")';
  const checkProc = spawn(pythonExe, ['-c', checkCmd]);
  
  let checkOutput = '';
  checkProc.stdout.on('data', (d) => { checkOutput += d.toString(); });
  
  checkProc.on('close', (code) => {
    if (code === 0 && checkOutput.includes('DEPS_OK')) {
      if (mainWindow) mainWindow.webContents.send('agent-log', 'All dependencies already satisfied. Starting NeuroSync Agent...');
      startAgentProcess(token);
      startStats();
    } else {
      if (mainWindow) mainWindow.webContents.send('agent-log', 'Missing dependencies detected. Installing required packages via pip...');
      runPipInstall(token);
    }
  });

  checkProc.on('error', (err) => {
    if (err.code === 'ENOENT') {
      const missingMsg = '[ERROR] Python 3 is not installed or not found on system PATH. Please install Python 3.10+ from python.org';
      if (mainWindow) {
        mainWindow.webContents.send('agent-log', missingMsg);
        mainWindow.webContents.send('agent-status', 'error');
      }
    } else {
      runPipInstall(token);
    }
  });
}

function runPipInstall(token) {
  try {
    const installProc = spawn(pythonExe, ['-m', 'pip', 'install', 'python-dotenv', 'psutil', 'websockets', 'pyautogui', 'pyperclip', 'requests']);

    installProc.stdout.on('data', (d) => {
      if (mainWindow) mainWindow.webContents.send('agent-log', `[SETUP] ${d.toString().trim()}`);
    });
    installProc.stderr.on('data', (d) => {
      if (mainWindow) mainWindow.webContents.send('agent-log', `[SETUP] ${d.toString().trim()}`);
    });

    installProc.on('close', (code) => {
      if (code === 0) {
        if (mainWindow) mainWindow.webContents.send('agent-log', 'Dependencies ready. Starting NeuroSync Agent...');
        startAgentProcess(token);
        startStats();
      } else {
        if (mainWindow) mainWindow.webContents.send('agent-log', '[WARNING] Pip install exited with non-zero code. Attempting to start agent...');
        startAgentProcess(token);
        startStats();
      }
    });
  } catch (err) {
    if (mainWindow) mainWindow.webContents.send('agent-log', `[ERROR] Unable to spawn Python: ${err.message}`);
  }
}

function startAgentProcess(token) {
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
    setTimeout(() => startAgentProcess(authToken), 5000);
  });
}

function startAgent(token) {
  ensureDependenciesAndStartAgent(token);
}

function startStats() {
  const candidatePaths = app.isPackaged
    ? [
        path.join(process.resourcesPath, 'app.asar.unpacked', 'renderer', 'stats.py'),
        path.join(process.resourcesPath, 'app', 'renderer', 'stats.py'),
        path.join(__dirname, 'renderer', 'stats.py')
      ]
    : [
        path.join(__dirname, 'renderer', 'stats.py'),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'renderer', 'stats.py')
      ];

  const scriptToRun = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];
  statsProcess = spawn(pythonExe, [scriptToRun]);

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
      } catch (e) {
        console.error('Stats JSON parse error:', e);
      }
    }
  });

  statsProcess.stderr.on('data', (data) => {
    console.error('statsProcess error:', data.toString());
  });

  statsProcess.on('close', () => setTimeout(startStats, 3000));
}

async function launchApp(email, token) {
  authToken = token;
  saveCredentials(email, token);
  if (mainWindow) mainWindow.close();
  createDashboardWindow();
  startAgent(token);
}

app.whenReady().then(async () => {
  const saved = loadCredentials();
  if (saved?.token) {
    authToken = saved.token;
    createDashboardWindow();
    startAgent(saved.token);
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