const git = require('isomorphic-git');
const fs = require('fs');
const http = require('isomorphic-git/http/node');

class GitManager {
    async gitLog(filePath) {
        return await git.log({
            fs,
            dir: filePath
        });
    }

    async gitBranches(filePath) {
        let branches = await git.listBranches({ fs, dir: filePath });
        let remoteBranches = await git.listBranches({ fs, dir: filePath, remote: 'origin' })
        return [branches, remoteBranches];
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
