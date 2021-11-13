const ipcRenderer = require('electron').ipcRenderer;
const remote = require('@electron/remote');
const remoteMain = require("@electron/remote/main");
const dialog = remote.dialog;
const app = remote.app;
const BrowserWindow = remote.BrowserWindow;

class Main {
    constructor() {
        this.filePath = '';
        this.currentBranch = '';
        this.username = '';
        this.password = '';
    }
    run() {
        let self = this;
        window.addEventListener('DOMContentLoaded', () => {
            $('#loginBtn').click(function() {
                self.openLoginWindow();
            });

            $('#fetchBtn').click(function() {
                if (self.filePath !== '') {
                    // send fetch message
                }
            });

            $('#openBtn').click(function() {
                dialog.showOpenDialog({ properties: ['openDirectory'] }).then(function(result) {
                    self.filePath = result.filePaths[0];
                    ipcRenderer.send('git-open-message', self.filePath);
                });
            });

            $('#refreshBtn').click(function() {
                self.refreshAll();
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

    refreshAll() {
        // this.refreshBranchTables();
        ipcRenderer.send('git-log-message', this.filePath);
    }

    refreshBranchTables() {
        let self = this;
        if (self.filePath !== '') {

            self.gitManager.gitCurrentBranch(self.filePath).then(function(currentBranchResult) {
                self.currentBranch = currentBranchResult;

                self.gitManager.gitBranches(self.filePath).then(function(branchResults) {
                    $('#localTableBody tr').remove();
                    $('#localTableBody').append('<tr><th><h4>Local Branches</h4></th></tr>');
                    console.log(self.currentBranch);
                    branchResults[0].forEach(function(branchResult) {
                        if (self.currentBranch === branchResult) {
                            $('#localTableBody').append('<tr><td>* ' + branchResult + '</td></tr>');
                        } else {
                            $('#localTableBody').append('<tr><td>' + branchResult + '</td></tr>');
                        }
                    });

                    $('#remoteTableBody tr').remove();
                    $('#remoteTableBody').append('<tr><td><h4>Remote Branches</h4></td></tr>');
                    branchResults[0].forEach(function(branchResult) {
                        $('#remoteTableBody').append('<tr><td>' + branchResult + '</td></tr>');
                    });
                });
            });
        }
    }

    refreshCommitTable(commits) {
        let self = this;
        if (self.filePath !== '') {
            $('#commitTableBody tr').remove();
            $('#commitTableBody').append('<tr><th><h4>Commits</h4></th></tr>');
            commits.forEach(function(commit) {
                $('#commitTableBody').append('<tr><td>' + commit + '</td></tr>');
            });
        }
    }
}

let main = new Main()

ipcRenderer.on('login-message',(event, arg) => {
    main.username = arg[0];
    main.password = arg[1];
});

ipcRenderer.on('refresh-message',(event, arg) => {
    main.refreshAll();
});

ipcRenderer.on('git-log-message',(event, arg) => {
    main.refreshCommitTable(arg);
});

main.run();
