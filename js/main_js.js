const ipcRenderer = require('electron').ipcRenderer;
const remote = require('@electron/remote');
const remoteMain = require("@electron/remote/main");
const dialog = remote.dialog;
const app = remote.app;
const BrowserWindow = remote.BrowserWindow;

class Main {
    constructor() {
        this.filePath = '';
        this.username = '';
        this.password = '';
    }
    run() {
        let self = this;
        window.addEventListener('DOMContentLoaded', () => {
            $('#fetchBtn').click(function() {
                if (self.filePath !== '') {
                    ipcRenderer.send('git-fetch-message', []);
                }
            });

            $('#pullBtn').click(function() {
                if (self.filePath !== '') {
                    ipcRenderer.send('git-pull-message', []);
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

    async openLoginWindow() {
        const win = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        remoteMain.enable(win.webContents);

        await new Promise(function (resolve, reject) {
            win.loadFile('./views/username_password_prompt.html');

            win.on('close', function() {
                resolve();
            });
        });
    }

    refreshAll() {
        let $mainTable = $('#mainTable');
        if ($mainTable.hasClass('invisible')) {
            $mainTable.removeClass('invisible');
        }
        ipcRenderer.send('git-log-message', []);
    }

    refreshCommitTable(results) {
        let self = this;
        if (self.filePath !== '') {
            $('#commitTableBody tr').remove();
            $('#commitTableBody').append('<tr><th><h4>Commits</h4></th></tr>');

            let branches = [];
            results.forEach(function(result) {
                if (result[0].length > 0) {
                    let stringToBuild = '<tr><td>';
                    result[0].forEach(function(branch) {
                        branches.push(branch);
                        stringToBuild += '(' + branch + ') ';
                    });
                    stringToBuild += result[1] + '</td></tr>';
                    $('#commitTableBody').append(stringToBuild);
                } else {
                    $('#commitTableBody').append('<tr><td>' + result[1] + '</td></tr>');
                }
            });

            $('#localTableBody tr').remove();
            $('#remoteTableBody tr').remove();
            $('#localTableBody').append('<tr><th><h4>Local Branches</h4></th></tr>');
            $('#remoteTableBody').append('<tr><td><h4>Remote Branches</h4></td></tr>');

            branches.forEach(function(branchResult) {
                if (branchResult.startsWith('refs/heads') || branchResult.startsWith('* refs/heads')) {
                    $('#localTableBody').append('<tr><td>' + branchResult + '</td></tr>');
                } else {
                    $('#remoteTableBody').append('<tr><td>' + branchResult + '</td></tr>');
                }
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

ipcRenderer.on('git-fetch-creds',(event, arg) => {
    main.openLoginWindow().then(function(results) {
        ipcRenderer.send('git-fetch-creds', [main.username, main.password]);
    });
});

main.run();
