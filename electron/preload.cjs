const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: { node: process.versions.node, chrome: process.versions.chrome, electron: process.versions.electron },
  toggleFullscreen: (options) => ipcRenderer.invoke('toggle-fullscreen', options),
  setFullscreen: (enabled) => ipcRenderer.invoke('set-fullscreen', Boolean(enabled)),
  getFullscreen: () => ipcRenderer.invoke('get-fullscreen'),
  onFullscreenChange: (callback) => { const handler = (_event, value) => callback(value); ipcRenderer.on('fullscreen-changed', handler); return () => ipcRenderer.removeListener('fullscreen-changed', handler); },
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  quitAndInstall: () => ipcRenderer.invoke('update:quit-and-install'),
  onAppUpdate: (callback) => { const handler = (_event, payload) => callback(payload); ipcRenderer.on('app-update', handler); return () => ipcRenderer.removeListener('app-update', handler); }
});
