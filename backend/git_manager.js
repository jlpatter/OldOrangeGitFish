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
                    commitBranchDict[commitId].push('* ' + ref.shorthand());
                } else {
                    commitBranchDict[commitId] = ['* ' + ref.shorthand()];
                }
            } else {
                if (commitId in commitBranchDict) {
                    commitBranchDict[commitId].push(ref.shorthand());
                } else {
                    commitBranchDict[commitId] = [ref.shorthand()];
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
            let shortLine = [];
            for (let commit of commitLine) {
                if (!self.containsCommit(commit, masterLine)) {
                    shortLine.push(commit);
                }
            }
            masterLine = shortLine.concat(masterLine);
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

    async gitCheckout(branch) {
        await this.repo.checkoutBranch(branch, {});
    }

    async gitCheckoutRemote(branch) {
        let self = this;
        let localName = branch.slice(branch.indexOf('/') + 1);
        let localBranchAlreadyCheckedOut = false;

        // First, figure out if the local branch is already created
        await self.repo.getReferenceNames(Git.Reference.TYPE.ALL).then(function(nameArray) {
            for (let branchName of nameArray) {
                if (branchName.indexOf('refs/remotes') === -1 && branchName.indexOf(localName) >= 0) {
                    localBranchAlreadyCheckedOut = true;
                    break;
                }
            }
        });

        // If the local branch already exists, check it out. Otherwise, create a new branch
        if (localBranchAlreadyCheckedOut) {
            await self.gitCheckout(localName);
        } else {
            await self.repo.getBranchCommit(branch).then(async function (commit) {
                await self.repo.createBranch(localName, commit, false).then(async function (localBranch) {
                    await self.gitCheckout(localBranch);
                });
            });
        }
    }

    async gitFetch(win) {
        let self = this;
        await self.repo.fetchAll({
            downloadTags: true,
            callbacks: {
                credentials: async function () {
                    return await self.getCred(win);
                }
            }
        });
    }

    async gitPull(win) {
        let self = this;
        await self.repo.fetchAll({
            callbacks: {
                credentials: async function () {
                    return await self.getCred(win);
                }
            }
        }).then(async function () {
            await self.repo.getCurrentBranch().then(async function (currentRef) {
                await self.repo.mergeBranches(currentRef.shorthand(), 'origin/' + currentRef.shorthand());
            });
        });
    }

    async gitPush(win) {
        let self = this;
        await self.repo.getRemote('origin').then(async function (remote) {
            await self.repo.getCurrentBranch().then(async function (currentRef) {
                await remote.push([currentRef.toString()], {
                    callbacks: {
                        credentials: async function () {
                            return await self.getCred(win);
                        }
                    }
                });
            });
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
