const git = require('isomorphic-git');
const fs = require('fs');

class GitManager {
    async gitLog(filePath) {
        return await git.log({
            fs,
            dir: filePath
        });
    }
}
