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

    async gitFetch(filePath) {
        return await git.fetch({
            fs,
            http: http,
            onAuth: url => {
                // let auth = lookupSavedPassword(url)
                // if (auth) return auth

                if (confirm('This repo is password protected. Ready to enter a username & password?')) {
                    let auth = {
                        username: prompt('Enter username'),
                        password: prompt('Enter password'),
                    }
                    return auth
                } else {
                    return { cancel: true }
                }
            },
            dir: filePath,
            remote: 'origin',
            tags: true
        });
    }
}
