const {app, BrowserWindow, ipcMain} = require('electron');
const remoteMain = require('@electron/remote/main');
const path = require('path');
const Git = require('nodegit');
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

  ipcMain.on('git-clone-message', (event, arg) => {
    gitManager.gitClone(win, arg).then(function() {
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

  ipcMain.on('git-stage-message', (event, arg) => {
    gitManager.gitStage(arg).then(function() {
      gitManager.gitDiff().then(function(results) {
        win.webContents.send('git-diff-message', results);
      });
    });
  });

  ipcMain.on('git-unstage-message', (event, arg) => {
    gitManager.gitUnstage(arg).then(function() {
      gitManager.gitDiff().then(function(results) {
        win.webContents.send('git-diff-message', results);
      });
    });
  });

  ipcMain.on('git-stage-all-message', (event, arg) => {
    gitManager.gitStageAll().then(function() {
      gitManager.gitDiff().then(function(results) {
        win.webContents.send('git-diff-message', results);
      });
    });
  });

  ipcMain.on('git-commit-message', (event, arg) => {
    gitManager.gitCommit(win, arg).then(function() {
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

  ipcMain.on('git-force-push-message', (event, arg) => {
    gitManager.gitForcePush(win).then(function() {
      win.webContents.send('refresh-message', []);
    });
  });

  ipcMain.on('git-branch-message', (event, arg) => {
    gitManager.gitBranch(arg).then(function() {
      win.webContents.send('refresh-message', []);
    });
  });

  ipcMain.on('git-delete-branch', (event, arg) => {
    gitManager.gitDeleteBranch(win, arg).then(function() {
      win.webContents.send('refresh-message', []);
    });
  });

  ipcMain.on('git-merge-message', (event, arg) => {
    gitManager.gitMerge(win, arg).then(function() {
      win.webContents.send('refresh-message', []);
    });
  });

  ipcMain.on('git-abort-merge', (event, arg) => {
    gitManager.gitAbortMerge().then(function() {
      win.webContents.send('refresh-message', []);
    });
  });

  ipcMain.on('git-continue-merge', (event, arg) => {
    gitManager.gitContinueMerge(win).then(function() {
      win.webContents.send('refresh-message', []);
    });
  });

  ipcMain.on('git-reset-soft-message', (event, arg) => {
    gitManager.gitReset(arg, Git.Reset.TYPE.SOFT).then(function() {
      win.webContents.send('refresh-message', []);
    });
  });

  ipcMain.on('git-reset-mixed-message', (event, arg) => {
    gitManager.gitReset(arg, Git.Reset.TYPE.MIXED).then(function() {
      win.webContents.send('refresh-message', []);
    });
  });

  ipcMain.on('git-reset-hard-message', (event, arg) => {
    gitManager.gitReset(arg, Git.Reset.TYPE.HARD).then(function() {
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
