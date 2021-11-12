const git = require('isomorphic-git');
const fs = require('fs');

class GitManager {
    async gitLog(filePath) {
        let commits = await git.log({
            fs,
            dir: filePath,
            ref: 'main'
        })
        console.log(commits)
    }
}
