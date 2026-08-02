const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const EMBED_DIR = path.join(__dirname, '..', 'python-embed');
const SITE_PACKAGES = path.join(EMBED_DIR, 'Lib', 'site-packages');

console.log('[PYTHON-EMBED] Setting up embedded portable Python environment for NeuroSync...');

async function setupWindowsPython() {
  const pythonExe = path.join(EMBED_DIR, 'python.exe');
  
  if (!fs.existsSync(pythonExe)) {
    fs.mkdirSync(EMBED_DIR, { recursive: true });
    const zipPath = path.join(__dirname, 'python-embed-win.zip');
    const url = 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip';

    console.log(`[PYTHON-EMBED] Downloading Windows Portable Python from ${url}...`);

    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(zipPath);
      https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        reject(err);
      });
    });

    console.log('[PYTHON-EMBED] Extracting portable Python...');
    try {
      execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${EMBED_DIR}' -Force"`);
    } catch (e) {
      execSync(`tar -xf "${zipPath}" -C "${EMBED_DIR}"`);
    }
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  }

  // Ensure Lib/site-packages exists
  fs.mkdirSync(SITE_PACKAGES, { recursive: true });

  // Enable site-packages & path resolution in python311._pth
  const pthPath = path.join(EMBED_DIR, 'python311._pth');
  if (fs.existsSync(pthPath)) {
    const pthLines = [
      'python311.zip',
      '.',
      'Lib/site-packages',
      'import site'
    ];
    fs.writeFileSync(pthPath, pthLines.join('\n') + '\n');
  }

  console.log('[PYTHON-EMBED] Pre-installing required Python packages into site-packages...');
  const deps = ['python-dotenv', 'psutil', 'websockets', 'pyautogui', 'pyperclip', 'requests', 'pyscreeze', 'pymsgbox', 'pyrect', 'mouseinfo', 'pytweening', 'pygetwindow', 'urllib3', 'idna', 'charset-normalizer', 'certifi'];

  try {
    const sysPython = process.platform === 'win32' ? 'python' : 'python3';
    execSync(`${sysPython} -m pip install --target "${SITE_PACKAGES}" --no-deps ${deps.join(' ')}`, { stdio: 'inherit' });
    console.log('[PYTHON-EMBED] Packages successfully pre-installed into embedded Python!');
  } catch (e) {
    console.warn('[PYTHON-EMBED] Pre-install warning:', e.message);
  }

  console.log('[PYTHON-EMBED] Portable Windows Python setup complete!');
}

async function main() {
  await setupWindowsPython();
}

main().catch(err => {
  console.error('[PYTHON-EMBED] Setup error:', err);
});
