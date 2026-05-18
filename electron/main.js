const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const http = require('http');

let nextServerProcess = null;

function getBaseDir() {
  const programData = process.env.PROGRAMDATA || (process.platform === 'win32' ? 'C:\\ProgramData' : app.getPath('userData'));
  return path.join(programData, 'local-llm-chat');
}

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {}
}

ipcMain.handle('read-json', async (_ev, relativePath) => {
  const base = getBaseDir();
  const full = path.join(base, relativePath);
  try {
    const txt = await fs.readFile(full, 'utf8');
    return JSON.parse(txt);
  } catch (err) {
    return null;
  }
});

ipcMain.handle('write-json', async (_ev, relativePath, data) => {
  const base = getBaseDir();
  const full = path.join(base, relativePath);
  await ensureDir(path.dirname(full));
  await fs.writeFile(full, JSON.stringify(data, null, 2), 'utf8');
  return true;
});

ipcMain.handle('ensure-dir', async (_ev, relativePath) => {
  const base = getBaseDir();
  const full = path.join(base, relativePath);
  await ensureDir(full);
  return true;
});

ipcMain.handle('save-file', async (_ev, relativePath, buffer) => {
  const base = getBaseDir();
  const full = path.join(base, relativePath);
  await ensureDir(path.dirname(full));
  await fs.writeFile(full, Buffer.from(buffer));
  return { path: full };
});

function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(check, 400);
      });
    };
    check();
  });
}

async function getStartUrl() {
  if (process.env.ELECTRON_START_URL) {
    return process.env.ELECTRON_START_URL;
  }

  const appRoot = path.join(__dirname, '..');
  const nextBin = path.join(appRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  const port = process.env.PORT || '3010';
  const startUrl = `http://127.0.0.1:${port}`;

  nextServerProcess = spawn(process.execPath, [nextBin, 'start', '-p', port], {
    cwd: appRoot,
    stdio: 'ignore',
    windowsHide: true,
  });

  await waitForServer(startUrl);
  return startUrl;
}

async function createWindow() {
  const startUrl = await getStartUrl();

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(startUrl);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (nextServerProcess) {
    try {
      nextServerProcess.kill();
    } catch (e) {}
    nextServerProcess = null;
  }
  if (process.platform !== 'darwin') app.quit();
});
