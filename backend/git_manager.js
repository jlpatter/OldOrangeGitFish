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

    async gitLog() {
        let self = this;
        if (self.repo !== null) {
            let commitBranchDict = {};
            let branchCommits = [];
            await self.repo.getReferences().then(async function (stdVectorGitReference) {
                let gitReferences = {};
                for (let ref of stdVectorGitReference) {
                    if (!(ref.toString() in gitReferences)) {
                        gitReferences[ref.toString()] = ref;
                    }
                }
                commitBranchDict = await self.buildBranchCommitsAndCommitBranchDict(gitReferences, branchCommits)
            });
            let allCommitLines = await self.getAllCommitLines(branchCommits);
            let masterLine = self.getMasterLine(allCommitLines);
            return self.getPrintableResults(masterLine, commitBranchDict);
        }
    }

    async buildBranchCommitsAndCommitBranchDict(gitReferences, branchCommits) {
        let self = this;
        let commitBranchDict = {};
        let values = Object.keys(gitReferences).map(function (key) {
            return gitReferences[key];
        });
        for (let ref of values) {
            let commitId = await self.repo.getBranchCommit(ref).then(function (commit) {
                branchCommits.push(commit);
                return commit.id().toString();
            });
            if (ref.isHead()) {
                if (commitId in commitBranchDict) {
                    commitBranchDict[commitId].push('* ' + ref.toString());
                } else {
                    commitBranchDict[commitId] = ['* ' + ref.toString()];
                }
            } else {
                if (commitId in commitBranchDict) {
                    commitBranchDict[commitId].push(ref.toString());
                } else {
                    commitBranchDict[commitId] = [ref.toString()];
                }
            }
        }
        return commitBranchDict;
    }

    async getAllCommitLines(branchCommits) {
        let allCommitLines = [];
        let index = 0;
        for (let branchCommit of branchCommits) {
            let history = branchCommit.history();

            allCommitLines[index] = [];
            await new Promise(function (resolve, reject) {
                history.on('end', function (commits) {
                    allCommitLines[index] = allCommitLines[index].concat(commits)
                    resolve();
                });

                history.start();
            });
            index++;
        }
        return allCommitLines;
    }

    getMasterLine(allCommitLines) {
        let self = this;
        let masterLine = [];
        for (let commitLine of allCommitLines) {
            for (let commit of commitLine) {
                if (!self.containsCommit(commit, masterLine)) {
                    masterLine.push(commit);
                }
            }
        }
        return masterLine;
    }

    containsCommit(commit, line) {
        for (let i = 0; i < line.length; i++) {
            if (line[i].id().toString() === commit.id().toString()) {
                return true;
            }
        }
        return false;
    }

    getPrintableResults(masterLine, commitBranchDict) {
        let results = [];
        for (let commit of masterLine) {
            let branchList = []
            if (commit.id().toString() in commitBranchDict) {
                branchList = branchList.concat(commitBranchDict[commit.id().toString()]);
            }
            results.push([branchList, commit.message()]);
        }
        return results;
    }

    gitFetch(win) {
        let self = this;
        self.repo.fetchAll({
            downloadTags: true,
            callbacks: {
                credentials: async function () {
                    return await self.getCred(win);
                }
            }
        }).then(function() {
            console.log('Fetch Success!');
        });
    }

    async getCred(win) {
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
