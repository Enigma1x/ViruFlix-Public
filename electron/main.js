import electronUpdaterPkg from 'electron-updater';
import { app, BrowserWindow, session, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { autoUpdater } = electronUpdaterPkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let mainWindow = null;

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function isTrustedSender(event) {
  const url = event?.senderFrame?.url || event?.sender?.getURL?.() || '';
  return url.startsWith('file://') || url.startsWith('http://localhost:5173');
}

function bindUpdater() {
  ipcMain.handle('update:check', async (event) => {
    if (!isTrustedSender(event) || !app.isPackaged) return { skipped: true };
    try { const result = await autoUpdater.checkForUpdates(); return { ok: true, updateInfo: result?.updateInfo || null }; } catch (error) { return { ok: false, message: error.message }; }
  });
  ipcMain.handle('update:quit-and-install', (event) => {
    if (isTrustedSender(event) && app.isPackaged) autoUpdater.quitAndInstall(false, true);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#08090d',
    show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  ipcMain.handle('toggle-fullscreen', (event) => { if (!isTrustedSender(event)) return false; mainWindow.setFullScreen(!mainWindow.isFullScreen()); return mainWindow.isFullScreen(); });
  ipcMain.handle('set-fullscreen', (event, enabled) => { if (!isTrustedSender(event)) return false; mainWindow.setFullScreen(Boolean(enabled)); return mainWindow.isFullScreen(); });
  ipcMain.handle('get-fullscreen', (event) => isTrustedSender(event) && mainWindow.isFullScreen());
  mainWindow.on('enter-full-screen', () => mainWindow.webContents.send('fullscreen-changed', true));
  mainWindow.on('leave-full-screen', () => mainWindow.webContents.send('fullscreen-changed', false));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (!details.url.startsWith('file://') && !details.url.startsWith('http://localhost:')) return callback({ responseHeaders: details.responseHeaders });
    const csp = ["default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data: https: blob:", "connect-src 'self' https: wss:", "frame-src 'self' https://player.videasy.net https://player.videasy.to", "media-src 'self' https: blob:"].join('; ');
    callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [csp] } });
  });

  if (!app.isPackaged && process.env.ELECTRON_USE_BUILD !== '1') mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => { bindUpdater(); createWindow(); if (app.isPackaged) autoUpdater.checkForUpdates().catch(() => {}); app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
