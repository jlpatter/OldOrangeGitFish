const { app, BrowserWindow, ipcMain } = require('electron');
const remoteMain = require('@electron/remote/main');
const path = require('path');
const gitManager = require('./js/git_manager');

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

    ipcMain.on('git-log-message', (event, arg) => {
        gitManager.gitLog(arg, win);
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
