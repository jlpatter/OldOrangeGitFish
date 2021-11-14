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
            self.canvasManager = new CanvasManager();

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

            $('#pushBtn').click(function() {
                if (self.filePath !== '') {
                    ipcRenderer.send('git-push-message', []);
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
                let commitColumnHeight = window.innerHeight - 150;
                let $commitColumn = $('#commitColumn');
                $commitColumn.css('height', commitColumnHeight + 'px');
                $('#mainCanvas').attr('width', parseInt($commitColumn.css('width').slice(0, -2), 10));
                self.canvasManager.refreshCommitTable();
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
            let branches = [];
            let entryList = [];
            results.forEach(function(result) {
                if (result[0].length > 0) {
                    let stringToBuild = '';
                    result[0].forEach(function(branch) {
                        branches.push(branch);
                        stringToBuild += '(' + branch + ') ';
                    });
                    stringToBuild += result[1];
                    entryList.push(stringToBuild);
                } else {
                    entryList.push(result[1]);
                }
            });
            self.canvasManager.updateCommitTable(entryList);

            $('#localTableBody tr').remove();
            $('#remoteTableBody tr').remove();
            $('#localTableBody').append('<tr><th><h4>Local Branches</h4></th></tr>');
            $('#remoteTableBody').append('<tr><td><h4>Remote Branches</h4></td></tr>');

            branches.forEach(function(branchResult) {
                let shortResult = branchResult.startsWith('* ') ? branchResult.slice(2) : branchResult;
                let $button = $('<button />', {
                    id: 'btn_' + shortResult,
                    class: 'btn btn-primary btn-sm right',
                    type: 'button',
                    text: 'Ch',
                    value: shortResult
                });

                if (branchResult.startsWith('origin/')) {
                    $button.click(function() {
                        ipcRenderer.send('git-checkout-remote-message', $(this).attr('value'));
                    });
                    $('#remoteTableBody').append('<tr><td>' + branchResult + '</td></tr>');
                    $('#remoteTableBody > tr > td:contains("' + branchResult + '")').append($button);
                } else {
                    $button.click(function() {
                        ipcRenderer.send('git-checkout-message', $(this).attr('value'));
                    });
                    $('#localTableBody').append('<tr><td>' + branchResult + '</td></tr>');
                    $('#localTableBody > tr > td:contains("' + branchResult + '")').append($button);
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
