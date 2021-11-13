let Git = require('nodegit');

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
            self.repo.getMasterCommit().then(function (masterCommit) {
                let history = masterCommit.history();

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

    async gitCurrentBranch(filePath) {
        return await git.currentBranch({
            fs,
            dir: filePath
        })
    }

    async gitFetch(filePath, username, password) {
        return await git.fetch({
            fs,
            http: http,
            onAuth: url => {
                return {username: username, password: password};
            },
            dir: filePath,
            remote: 'origin',
            tags: true
        });
    }
}
