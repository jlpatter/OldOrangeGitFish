const ipcRenderer = require('electron').ipcRenderer;
const remote = require('@electron/remote');
const remoteMain = require("@electron/remote/main");
const dialog = remote.dialog;
const app = remote.app;
const BrowserWindow = remote.BrowserWindow;

class Main {
    constructor() {
        this.gitManager = new GitManager();
        this.filePath = '';
    }
    run() {
        let self = this;
        window.addEventListener('DOMContentLoaded', () => {
            $('#loginBtn').click(function() {
                self.openLoginWindow();
            });

            $('#fetchBtn').click(function() {
                if (self.filePath !== '') {
                    self.gitManager.gitFetch(self.filePath).then(function(result) {
                        self.refreshCommitTable();
                    });
                }
            });

            $('#openBtn').click(function() {
                dialog.showOpenDialog({ properties: ['openDirectory'] }).then(function(result) {
                    self.filePath = result.filePaths[0];
                    self.refreshCommitTable();
                });
            });

            $('#refreshBtn').click(function() {
                self.refreshCommitTable();
            });

            $('#exitBtn').click(function() {
                app.quit();
            });

            window.addEventListener('resize', function(event){
                let commitTableHeight = window.innerHeight - 150;
                $('#commitTable').css('height', commitTableHeight + 'px');
            });
        });
    }

    openLoginWindow() {
        const win = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        remoteMain.enable(win.webContents);

        win.loadFile('./views/username_password_prompt.html');
    }

    refreshCommitTable() {
        let self = this;
        if (self.filePath !== '') {
            self.gitManager.gitLog(self.filePath).then(function(logResults) {
                $('#commitTableBody tr').remove();
                $('#commitTableBody').append('<tr><th><h4>Commits</h4></th></tr>');
                logResults.forEach(function(logResult) {
                    $('#commitTableBody').append('<tr><th>' + logResult.commit.message + '</th></tr>')
                });
            });
        }
    }
}

ipcRenderer.on('synchronous-message',(event,arg)=>{
    console.log(arg);
});

new Main().run();
