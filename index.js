const { app, BrowserWindow, ipcMain } = require('electron');
const remoteMain = require('@electron/remote/main');
const path = require('path');
const GitManager = require('./backend/git_manager');

const gitManager = new GitManager();

remoteMain.initialize();

function createWindow () {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    remoteMain.enable(win.webContents);

    win.loadFile('views/index.html');

    ipcMain.on('login-message',(event, arg) => {
        win.webContents.send('login-message', arg);
    });

    ipcMain.on('git-open-message', (event, arg) => {
        gitManager.gitOpen(arg).then(function() {
            win.webContents.send('refresh-message', []);
        });
    });

    ipcMain.on('git-log-message', (event, arg) => {
        gitManager.gitLog().then(function(results) {
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

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
});
