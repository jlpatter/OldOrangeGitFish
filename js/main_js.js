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
                    self.gitManager.gitFetch(self.filePath, self.username, self.password).then(function(result) {
                        self.refreshAll();
                    });
                }
            });

            $('#openBtn').click(function() {
                dialog.showOpenDialog({ properties: ['openDirectory'] }).then(function(result) {
                    self.filePath = result.filePaths[0];
                    self.refreshAll();
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
        this.refreshBranchTables();
        this.refreshCommitTable();
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
                            $('#localTableBody').append('<tr><th>* ' + branchResult + '</th></tr>');
                        } else {
                            $('#localTableBody').append('<tr><th>' + branchResult + '</th></tr>');
                        }
                    });

                    $('#remoteTableBody tr').remove();
                    $('#remoteTableBody').append('<tr><th><h4>Remote Branches</h4></th></tr>');
                    branchResults[0].forEach(function(branchResult) {
                        $('#remoteTableBody').append('<tr><th>' + branchResult + '</th></tr>');
                    });
                });
            });
        }
    }

    refreshCommitTable() {
        let self = this;
        if (self.filePath !== '') {
            self.gitManager.gitLog(self.filePath).then(function(logResults) {
                $('#commitTableBody tr').remove();
                $('#commitTableBody').append('<tr><th><h4>Commits</h4></th></tr>');
                logResults.forEach(function(logResult) {
                    $('#commitTableBody').append('<tr><th>' + logResult.commit.message + '</th></tr>');
                });
            });
        }
    }
}

let main = new Main()

ipcRenderer.on('synchronous-message',(event,arg)=>{
    main.username = arg[0];
    main.password = arg[1];
});

main.run();
