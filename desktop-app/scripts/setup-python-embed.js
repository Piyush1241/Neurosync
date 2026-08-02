const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const EMBED_DIR = path.join(__dirname, '..', 'python-embed');

console.log('[PYTHON-EMBED] Setting up embedded portable Python environment for NeuroSync...');

async function setupWindowsPython() {
  if (fs.existsSync(path.join(EMBED_DIR, 'python.exe'))) {
    console.log('[PYTHON-EMBED] Windows embedded Python already exists in python-embed.');
    return;
  }

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
      fs.unlinkSync(zipPath);
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

  // Enable site-packages in python311._pth
  const pthPath = path.join(EMBED_DIR, 'python311._pth');
  if (fs.existsSync(pthPath)) {
    let pthContent = fs.readFileSync(pthPath, 'utf8');
    pthContent = pthContent.replace('#import site', 'import site');
    fs.writeFileSync(pthPath, pthContent);
  }

  console.log('[PYTHON-EMBED] Portable Windows Python setup complete!');
}

async function main() {
  if (process.platform === 'win32') {
    await setupWindowsPython();
  } else {
    console.log(`[PYTHON-EMBED] Platform ${process.platform}: Ensure dependencies are satisfied during packaging.`);
  }
}

main().catch(err => {
  console.error('[PYTHON-EMBED] Setup error:', err);
});
