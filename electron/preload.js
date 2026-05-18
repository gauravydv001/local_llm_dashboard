const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readJson: (relativePath) => ipcRenderer.invoke('read-json', relativePath),
  writeJson: (relativePath, data) => ipcRenderer.invoke('write-json', relativePath, data),
  ensureDir: (relativePath) => ipcRenderer.invoke('ensure-dir', relativePath),
  saveFile: (relativePath, buffer) => ipcRenderer.invoke('save-file', relativePath, buffer),
});
