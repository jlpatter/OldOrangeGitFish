let Git = require('nodegit');

module.exports = {
    async gitLog(filePath) {
        let result;
        await Git.Repository.open(filePath).then(async function (repo) {
            await repo.getMasterCommit().then(function (masterCommit) {
                result = masterCommit.id().toString();
            });
        });
        return result;
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
