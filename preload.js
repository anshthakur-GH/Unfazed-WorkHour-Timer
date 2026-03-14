const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  saveHistory: (data) => ipcRenderer.invoke('save-history', data),
  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  resizeWindow: (width, height) => ipcRenderer.send('resize-window', { width, height }),
  moveWindow: (x, y) => ipcRenderer.send('move-window', { x, y }),
  closeApp: () => ipcRenderer.send('close-app')
});
