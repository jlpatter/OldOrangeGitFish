const {app, BrowserWindow, ipcMain} = require('electron');
const remoteMain = require('@electron/remote/main');
const path = require('path');
const GitManager = require('./git_manager');
const ProgressBarManager = require('./progress_bar_manager');

const gitManager = new GitManager();

remoteMain.initialize();

/**
 * Creates the main window for the application.
 */
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: path.join(__dirname, '../fish.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  remoteMain.enable(win.webContents);

  win.loadFile('./frontend/views/index.html');

  ipcMain.on('login-message', (event, arg) => {
    win.webContents.send('login-message', arg);
  });

  ipcMain.on('git-init-message', (event, arg) => {
    gitManager.gitInit(arg).then(function() {
      win.webContents.send('refresh-message', []);
    });
  });

  ipcMain.on('git-open-message', (event, arg) => {
    gitManager.gitOpen(arg).then(function() {
      win.webContents.send('refresh-message', []);
    });
  });

  ipcMain.on('git-log-message', (event, arg) => {
    const progressBarManager = new ProgressBarManager(win, 0);
    gitManager.gitLog(progressBarManager).then(function(results) {
      win.webContents.send('git-log-message', results);
    });
  });

  ipcMain.on('git-diff-message', (event, arg) => {
    gitManager.gitDiff().then(function(results) {
      win.webContents.send('git-diff-message', results);
    });
  });

  ipcMain.on('git-stage-all-message', (event, arg) => {
    gitManager.gitStageAll().then(function() {
      win.webContents.send('refresh-message', []);
    });
  });

  ipcMain.on('git-commit-message', (event, arg) => {
    gitManager.gitCommit(arg).then(function() {
      win.webContents.send('refresh-message', []);
    });
  });

  ipcMain.on('git-checkout-message', (event, arg) => {
    gitManager.gitCheckout(arg).then(function() {
      win.webContents.send('refresh-message', []);
    });
  });

  ipcMain.on('git-checkout-remote-message', (event, arg) => {
    gitManager.gitCheckoutRemote(arg).then(function() {
      win.webContents.send('refresh-message', []);
    });
  });

  ipcMain.on('git-fetch-message', (event, arg) => {
    gitManager.gitFetch(win).then(function() {
      win.webContents.send('refresh-message', []);
    });
  });

  ipcMain.on('git-pull-message', (event, arg) => {
    gitManager.gitPull(win).then(function() {
      win.webContents.send('refresh-message', []);
    });
  });

  ipcMain.on('git-push-message', (event, arg) => {
    gitManager.gitPush(win).then(function() {
      win.webContents.send('refresh-message', []);
    });
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function() {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') app.quit();
});
