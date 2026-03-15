const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const AutoLaunch = require('auto-launch');

const store = new Store();

let mainWindow;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const windowWidth = 140;
  const windowHeight = 110;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: width - windowWidth - 20,
    y: height - windowHeight - 20,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Ensure it stays on top of fullscreen apps too
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  // IPC Hooks for History
  ipcMain.handle('save-history', (event, newSession) => {
    let history = store.get('history') || [];
    history.push({ ...newSession, date: new Date().toISOString() });
    store.set('history', history);
    return history;
  });

  ipcMain.handle('get-history', () => {
    return store.get('history') || [];
  });

  ipcMain.handle('clear-history', () => {
    store.delete('history');
    return [];
  });

  ipcMain.on('resize-window', (event, { width: newWidth, height: newHeight }) => {
    if (mainWindow) {
      const primaryDisplay = screen.getPrimaryDisplay();
      const bounds = mainWindow.getBounds();
      // Keep it anchored to the bottom-right relative to where it currently is, 
      // or just resize and let the dragging handle the rest.
      // Better to just resize from the top-left for simplicity in JS dragging.
      mainWindow.setBounds({ width: newWidth, height: newHeight }, true);
    }
  });

  ipcMain.on('move-window', (event, { x, y }) => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      mainWindow.setBounds({
        x: bounds.x + x,
        y: bounds.y + y,
        width: bounds.width,
        height: bounds.height
      });
    }
  });

  // IPC Hook to close app programmatically if needed
  ipcMain.on('close-app', () => {
    app.quit();
  });

  // Auto-launch configuration
  let autoLauncher = new AutoLaunch({
    name: 'Work Timer',
    path: app.getPath('exe'),
  });

  autoLauncher.isEnabled()
    .then(function(isEnabled){
      if(isEnabled) return;
      autoLauncher.enable();
    })
    .catch(function(err){
      console.error('Error enabling auto-launch:', err);
    });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
