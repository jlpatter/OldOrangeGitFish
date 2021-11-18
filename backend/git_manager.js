const {ipcMain} = require('electron');
const Git = require('nodegit');

module.exports = class GitManager {
  /**
   * Constructs a new git manager.
   * @constructor
   */
  constructor() {
    this.repo = null;
    this.emptyTree = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
  }

  /**
   * Opens a repository in the given filepath.
   * @param {string} filePath The directory containing the .git folder
   * @return {Promise<void>}
   */
  async gitOpen(filePath) {
    const self = this;
    if (filePath !== undefined) {
      await Git.Repository.open(filePath).then(function(repo) {
        self.repo = repo;
      });
    }
  }

  /**
   * Gets the unstaged and staged files.
   * @return {Promise}
   */
  async gitDiff() {
    const self = this;
    const unstagedFiles = [];
    let stagedFiles = [];
    if (self.repo !== null) {
      const diff = await Git.Diff.indexToWorkdir(self.repo, null, {
        flags: Git.Diff.OPTION.SHOW_UNTRACKED_CONTENT | Git.Diff.OPTION.RECURSE_UNTRACKED_DIRS,
      });
      await diff.patches().then(function(patches) {
        patches.forEach(function(patch) {
          unstagedFiles.push(patch.newFile().path());
          // TODO: Use this to implement diffs someday.
          // patch.hunks().then(function(hunks) {
          //     hunks.forEach(function(hunk) {
          //         hunk.lines().then(function(lines) {
          //             console.log(hunk.header().trim());
          //             lines.forEach((line) => {
          //                 console.log(String.fromCharCode(line.origin()) + line.content().trim());
          //             });
          //         });
          //     });
          // });
        });
      });

      stagedFiles = await self.getStagedChanges();
    }
    return [unstagedFiles, stagedFiles];
  }

  /**
   * Gets the staged files.
   * @return {Promise<*[]>}
   */
  async getStagedChanges() {
    const self = this;
    const head = await self.repo.getHeadCommit();
    const tree = await (head ? head.getTree() : Git.Tree.lookup(self.repo, self.emptyTree));

    const diff = await Git.Diff.treeToIndex(self.repo, tree, null);
    const patches = await diff.patches();
    const stagedFiles = [];
    patches.forEach(function(patch) {
      stagedFiles.push(patch.newFile().path());
    });
    return stagedFiles;
  }

  /**
   * Stages all changes that are unstaged
   * @return {Promise<void>}
   */
  async gitStageAll() {
    const self = this;
    const diff = await Git.Diff.indexToWorkdir(self.repo, null, {
      flags: Git.Diff.OPTION.SHOW_UNTRACKED_CONTENT | Git.Diff.OPTION.RECURSE_UNTRACKED_DIRS,
    });
    const index = await self.repo.refreshIndex();

    await diff.patches().then(async function(patches) {
      for (const patch of patches) {
        if (patch.status() !== 2) {
          await index.addByPath(patch.newFile().path());
        } else {
          await index.removeByPath(patch.newFile().path());
        }
      }
    });

    await index.write();
  }

  /**
   * Commmits staged changes to the branch.
   * @param {string} message The message to use for the commit.
   * @return {Promise<void>}
   */
  async gitCommit(message) {
    const self = this;
    const author = Git.Signature.now('Joshua Patterson', 'jleegippies@gmail.com');
    const index = await self.repo.refreshIndex();
    const changes = await index.writeTree();
    const head = await Git.Reference.nameToId(self.repo, 'HEAD');
    const parent = await self.repo.getCommit(head);
    await self.repo.createCommit('HEAD', author, author, message, changes, [parent]);
  }

  /**
   * Gets the log of commits to send to the main commit table.
   * @return {Promise<*[]>}
   */
  async gitLog() {
    const self = this;
    if (self.repo !== null) {
      let commitBranchDict = {};
      const branchCommits = [];
      await self.repo.getReferences().then(async function(stdVectorGitReference) {
        const gitReferences = {};
        for (const ref of stdVectorGitReference) {
          if (!(ref.toString() in gitReferences)) {
            gitReferences[ref.toString()] = ref;
          }
        }
        commitBranchDict = await self.buildBranchCommitsAndCommitBranchDict(gitReferences, branchCommits);
      });
      const mainLine = await self.getAllCommitLines(branchCommits);
      return self.getPrintableResults(mainLine, commitBranchDict);
    }
  }

  /**
   * Gets the commits from branches and adds them to the branchCommits variable.
   * @param {Array<string>} gitReferences Branches and tags
   * @param {Array<Commit>} branchCommits The variable used to store branch commits
   * @return {Promise<{}>}
   */
  async buildBranchCommitsAndCommitBranchDict(gitReferences, branchCommits) {
    const self = this;
    const commitBranchDict = {};
    const values = Object.keys(gitReferences).map(function(key) {
      return gitReferences[key];
    });
    for (const ref of values) {
      if (!ref.toString().startsWith('refs/tags')) {
        const commitId = await self.repo.getBranchCommit(ref).then(function(commit) {
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
    }
    return commitBranchDict;
  }

  /**
   * Uses the branchCommits to get the commit 'lines', which are lines of commits.
   * @param {Array<Commit>} branchCommits
   * @return {Promise<*[]>}
   */
  async getAllCommitLines(branchCommits) {
    const self = this;
    const history = branchCommits[0].history();
    let mainLine;
    await new Promise(function(resolve, reject) {
      history.on('end', function(commits) {
        mainLine = commits;
        resolve();
      });

      history.start();
    });

    for (let i = 1; i < branchCommits.length; i++) {
      if (!self.containsCommit(branchCommits[i], mainLine)) {
        const shortLine = [branchCommits[i]];
        let child = branchCommits[i];
        let isFinished = false;
        while (!isFinished) {
          await child.getParents(10).then(function(parents) {
            if (parents.length > 2) {
              throw new RangeError('I honestly didn\'t know a commit could have more than 2 parents...');
            } else if (parents.length === 0 || self.containsCommit(parents[0], mainLine)) {
              isFinished = true;
            } else {
              shortLine.push(parents[0]);
              child = parents[0];
            }
            // TODO: Implement merge commits by using parents[1]
          });
        }
        mainLine = shortLine.concat(mainLine);
      }
    }
    return mainLine;
  }

  /**
   * Checks if the commit is contained in the commit line.
   * @param {Commit} commit
   * @param {Array<Commit>} line
   * @return {boolean}
   */
  containsCommit(commit, line) {
    return line.filter((e) => e.id().toString() === commit.id().toString()).length > 0;
  }

  /**
   * Pairs a branchList to a particular commit and returns the string values.
   * @param {Array} masterLine
   * @param {Object} commitBranchDict
   * @return {*[]}
   */
  getPrintableResults(masterLine, commitBranchDict) {
    const results = [];
    for (const commit of masterLine) {
      let branchList = [];
      if (commit.id().toString() in commitBranchDict) {
        branchList = branchList.concat(commitBranchDict[commit.id().toString()]);
      }
      results.push([branchList, commit.message()]);
    }
    return results;
  }

  /**
   * Checks out a branch.
   * @param {string | Reference} branch
   * @return {Promise<void>}
   */
  async gitCheckout(branch) {
    await this.repo.checkoutBranch(branch, {});
  }

  /**
   * Checks out a remote branch by creating a local branch and checking
   * that out instead.
   * @param {string} branch
   * @return {Promise<void>}
   */
  async gitCheckoutRemote(branch) {
    const self = this;
    const localName = branch.slice(branch.indexOf('/') + 1);
    let localBranchAlreadyCheckedOut = false;

    // First, figure out if the local branch is already created
    await self.repo.getReferenceNames(Git.Reference.TYPE.ALL).then(function(nameArray) {
      for (const branchName of nameArray) {
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
      await self.repo.getBranchCommit(branch).then(async function(commit) {
        await self.repo.createBranch(localName, commit, false).then(async function(localBranch) {
          await self.gitCheckout(localBranch);
        });
      });
    }
  }

  /**
   * Fetches from the remote.
   * @param {BrowserWindow} win The main window
   * @return {Promise<void>}
   */
  async gitFetch(win) {
    const self = this;
    await self.repo.fetchAll({
      downloadTags: Git.Remote.AUTOTAG_OPTION.DOWNLOAD_TAGS_ALL,
      callbacks: {
        credentials: async function() {
          return await self.getCred(win);
        },
      },
    });
  }

  /**
   * Pulls down from the remote.
   * @param {BrowserWindow} win
   * @return {Promise<void>}
   */
  async gitPull(win) {
    const self = this;
    await self.repo.fetchAll({
      callbacks: {
        credentials: async function() {
          return await self.getCred(win);
        },
      },
    }).then(async function() {
      await self.repo.getCurrentBranch().then(async function(currentRef) {
        await self.repo.mergeBranches(currentRef.shorthand(), 'origin/' + currentRef.shorthand());
      });
    });
  }

  /**
   * Pushes the local branch to the remote.
   * @param {BrowserWindow} win
   * @return {Promise<void>}
   */
  async gitPush(win) {
    const self = this;
    await self.repo.getRemote('origin').then(async function(remote) {
      await self.repo.getCurrentBranch().then(async function(currentRef) {
        await remote.push([currentRef.toString()], {
          callbacks: {
            credentials: async function() {
              return await self.getCred(win);
            },
          },
        });
      });
    });
  }

  /**
   * Gets the credentials for remote operations.
   * @param {BrowserWindow} win
   * @return {Promise<*>}
   */
  async getCred(win) {
    let username = '';
    let password = '';

    await new Promise(function(resolve, reject) {
      win.webContents.send('git-fetch-creds', []);
      ipcMain.on('git-fetch-creds', (event, arg) => {
        username = arg[0];
        password = arg[1];
        resolve();
      });
    });

    return Git.Cred.userpassPlaintextNew(username, password);
  }
};
