let Git = require('nodegit');

module.exports = {
    async gitLog(filePath, win) {
        await Git.Repository.open(filePath).then(async function (repo) {
            await repo.getMasterCommit().then(function (masterCommit) {
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
        });
    },

    async gitBranches(filePath) {
        let branches = await git.listBranches({ fs, dir: filePath });
        let remoteBranches = await git.listBranches({ fs, dir: filePath, remote: 'origin' })
        return [branches, remoteBranches];
    },

    async gitCurrentBranch(filePath) {
        return await git.currentBranch({
            fs,
            dir: filePath
        })
    },

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
