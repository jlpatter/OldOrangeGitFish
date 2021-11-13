const { ipcMain } = require('electron');
const Git = require('nodegit');

module.exports = class GitManager {

    constructor() {
        this.repo = null;
    }

    async gitOpen(filePath) {
        let self = this;
        await Git.Repository.open(filePath).then(function (repo) {
            self.repo = repo;
        });
    }

    gitLog(win) {
        let self = this;
        if (self.repo !== null) {
            self.repo.getHeadCommit().then(function (headCommit) {
                let history = headCommit.history();

                // TODO: Wrap this in a promise and return results
                history.on('end', function (commits) {
                    let results = [];
                    for (let commit of commits) {
                        results.push(commit.message());
                    }
                    win.webContents.send('git-log-message', results);
                });

                history.start();
            });
        }
    }

    async gitBranches() {
        let self = this;
        let results = [];
        await self.repo.getReferences().then(function(stdVectorGitReference) {
            for (let ref of stdVectorGitReference) {
                if (ref.isHead()) {
                    results.push('* ' + ref.toString());
                }
                else {
                    results.push(ref.toString());
                }
            }
        });
        return results;
    }

    gitFetch(win) {
        let self = this;
        self.repo.fetchAll({
            downloadTags: true,
            callbacks: {
                credentials: async function () {
                    let username = '';
                    let password = '';

                    await new Promise(function (resolve, reject) {
                        win.webContents.send('git-fetch-creds', []);
                        ipcMain.on('git-fetch-creds', (event, arg) => {
                            username = arg[0];
                            password = arg[1];
                            resolve();
                        });
                    });

                    return Git.Cred.userpassPlaintextNew(username, password);
                }
            }
        }).then(function() {
            console.log('Fetch Success!');
        });
    }
}
