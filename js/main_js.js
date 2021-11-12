const remote = require('@electron/remote');
const dialog = remote.dialog;
const app = remote.app;

class Main {
    constructor() {
        this.gitManager = new GitManager();
        this.filePath = '';
    }
    run() {
        let self = this;
        window.addEventListener('DOMContentLoaded', () => {
            $('#openBtn').click(function() {
                dialog.showOpenDialog({ properties: ['openDirectory'] }).then(function(result) {
                    self.filePath = result.filePaths[0];
                    self.refreshCommitTable();
                });
            });

            $('#exitBtn').click(function() {
                app.quit();
            });

            window.addEventListener('resize', function(event){
                let commitTableHeight = window.innerHeight - 100;
                $('#commitTable').css('height', commitTableHeight + 'px');
            });
        });
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

new Main().run();
