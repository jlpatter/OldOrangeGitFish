const remote = require('@electron/remote');
const dialog = remote.dialog;
const app = remote.app;

class Main {
    constructor() {
        this.gitManager = new GitManager();
    }
    run() {
        let self = this;
        window.addEventListener('DOMContentLoaded', () => {
            $('#openBtn').click(function() {
                dialog.showOpenDialog({ properties: ['openDirectory'] }).then(function(result) {
                    self.gitManager.gitLog(result.filePaths[0]);
                });
            });

            $('#exitBtn').click(function() {
                app.quit();
            });
        });
    }
}

new Main().run();
