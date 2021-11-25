const {ipcMain} = require('electron');
const Git = require('nodegit');
const CommitWrapper = require('./commit_wrapper');

/**
 * A wrapper for nodegit that performs various git operations.
 */
module.exports = class GitManager {
  /**
   * Constructs a new git manager.
   * @constructor
   */
  constructor() {
    this.repo = null;
    this.filePath = '';
    this.username = '';
    this.password = '';
    this.privateKeyPath = '';
    this.publicKeyPath = '';
    this.passphrase = '';
    this.emptyTree = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
  }

  /**
   * Initializes a new repository at the given filePath.
   * @param {string} filePath
   */
  async gitInit(filePath) {
    const self = this;
    if (filePath !== undefined) {
      self.filePath = filePath;
      await Git.Repository.init(filePath, 0).then(function(repo) {
        self.repo = repo;
      });
    }
  }

  /**
   * Opens a repository in the given filepath.
   * @param {string} filePath The directory containing the .git folder
   * @return {Promise<void>}
   */
  async gitOpen(filePath) {
    const self = this;
    if (filePath !== undefined) {
      self.filePath = filePath;
      await Git.Repository.open(filePath).then(function(repo) {
        self.repo = repo;
      });
    }
  }

  /**
   * Clones a repository in the given filepath.
   * @param {Electron.CrossProcessExports.BrowserWindow} win
   * @param {Array<string>} urlAndPath
   * @return {Promise<void>}
   */
  async gitClone(win, urlAndPath) {
    const self = this;
    const cloneOptions = {};
    cloneOptions.fetchOpts = {
      callbacks: {
        certificateCheck: function() {
          return 0;
        },
        credentials: async function() {
          return await self.getCredential(win);
        },
      },
    };
    self.filePath = urlAndPath[1];
    await Git.Clone.clone(urlAndPath[0], urlAndPath[1], cloneOptions).then(function(repo) {
      self.repo = repo;
    });
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
          unstagedFiles.push([patch.status(), patch.newFile().path()]);
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
      stagedFiles.push([patch.status(), patch.newFile().path()]);
    });
    return stagedFiles;
  }

  /**
   * Stages the change of a single file
   * @param {Array} statusAndFilePath
   * @return {Promise<void>}
   */
  async gitStage(statusAndFilePath) {
    const self = this;
    const index = await self.repo.refreshIndex();
    if (statusAndFilePath[0] !== 2) {
      await index.addByPath(statusAndFilePath[1]);
    } else {
      await index.removeByPath(statusAndFilePath[1]);
    }
    await index.write();
  }

  /**
   * Stages the change of a single file
   * @param {Array} statusAndFilePath
   * @return {Promise<void>}
   */
  async gitUnstage(statusAndFilePath) {
    const self = this;
    const index = await self.repo.refreshIndex();
    if (statusAndFilePath[0] === 2 || statusAndFilePath[0] === 3) {
      const headCommit = await self.repo.getHeadCommit();
      await Git.Reset.default(self.repo, headCommit, [statusAndFilePath[1]]);
    } else {
      await index.removeByPath(statusAndFilePath[1]);
    }
    await index.write();
  }

  /**
   * Stages all changes that are unstaged
   * @return {Promise<void>}
   */
  async gitStageAll() {
    const index = await this.repo.refreshIndex();
    await index.addAll();
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
   * @param {ProgressBarManager} progressBarManager The main browser window to send progress bar stuff to.
   * @return {Promise<*[]>}
   */
  async gitLog(progressBarManager) {
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
        progressBarManager.increasePercentage(5);
      });
      const mainLine = await self.getAllCommitLines(progressBarManager, branchCommits, commitBranchDict);
      progressBarManager.setPercentage(99);
      const printableResults = self.getPrintableResults(mainLine, commitBranchDict);
      progressBarManager.increasePercentage(1);
      return printableResults;
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
    const gitRefValues = Object.keys(gitReferences).map(function(key) {
      return gitReferences[key];
    });
    for (const ref of gitRefValues) {
      let remoteMasterCommit = null;
      // TODO: Un-hardcode the use of origin here (and master and main)
      if (ref.toString().indexOf('origin/master') >= 0 || ref.toString().indexOf('origin/main') >= 0) {
        await self.repo.getBranchCommit(ref).then(function(commit) {
          remoteMasterCommit = commit;
        });
      }
      if (!ref.toString().startsWith('refs/tags')) {
        const commitId = await self.repo.getBranchCommit(ref).then(function(commit) {
          if (remoteMasterCommit !== null && remoteMasterCommit.id().toString() === commit.id().toString()) {
            branchCommits.unshift(commit);
          } else {
            branchCommits.push(commit);
          }
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
   * @param {ProgressBarManager} progressBarManager
   * @param {Array<Commit>} branchCommits
   * @param {Object} commitBranchDict
   * @return {Promise<*[]>}
   */
  async getAllCommitLines(progressBarManager, branchCommits, commitBranchDict) {
    const self = this;
    let mainLine = [];
    if (branchCommits.length > 0) {
      const mergeCommitParents = [];

      // Build the mainline
      const revwalk = Git.Revwalk.create(self.repo);
      revwalk.sorting(Git.Revwalk.SORT.TOPOLOGICAL);
      revwalk.push(branchCommits[0].id());
      await revwalk.commitWalk(2000).then(async function(vectorGitCommit) {
        for (let i = 0; i < vectorGitCommit.length; i++) {
          if (vectorGitCommit[i].parentcount() === 2) {
            // This is a workaround for a bug in nodegit.
            vectorGitCommit[i].repo = self.repo;
            await vectorGitCommit[i].getParents(10).then(function(parentCommits) {
              mergeCommitParents.push(parentCommits[1]);
              mainLine.push(new CommitWrapper(0, vectorGitCommit[i], parentCommits));
            });
          } else if (i + 1 < vectorGitCommit.length) {
            mainLine.push(new CommitWrapper(0, vectorGitCommit[i], [vectorGitCommit[i + 1]]));
          } else {
            mainLine.push(new CommitWrapper(0, vectorGitCommit[i], []));
          }

          progressBarManager.increasePercentage((1 / vectorGitCommit.length) * (0.5 - 0.05) * 100);
        }
      });
      const lastMainLineCommit = mainLine[mainLine.length - 1].commit;

      // build the branchlines
      for (let i = 1; i < branchCommits.length; i++) {
        const branchRevWalk = Git.Revwalk.create(self.repo);
        branchRevWalk.sorting(Git.Revwalk.SORT.TOPOLOGICAL);
        branchRevWalk.push(branchCommits[i].id());
        const shortLine = [];
        let mainLineCommit = null;
        await branchRevWalk.commitWalk(2000).then(async function(vectorGitCommit) {
          for (let j = 0; j < vectorGitCommit.length; j++) {
            if (self.containsCommit(vectorGitCommit[j], mainLine)) {
              mainLineCommit = vectorGitCommit[j];
              break;
            } else if (vectorGitCommit[i].date() < lastMainLineCommit.date()) {
              break;
            }
            if (vectorGitCommit[j].parentcount() === 2) {
              // This is a workaround for a bug in nodegit.
              vectorGitCommit[j].repo = self.repo;
              await vectorGitCommit[j].getParents(10).then(function(parentCommits) {
                mergeCommitParents.push(parentCommits[1]);
                shortLine.push(new CommitWrapper(-1, vectorGitCommit[j], parentCommits));
              });
            } else if (j + 1 < vectorGitCommit.length) {
              shortLine.push(new CommitWrapper(-1, vectorGitCommit[j], [vectorGitCommit[j + 1]]));
            } else {
              shortLine.push(new CommitWrapper(-1, vectorGitCommit[j], []));
            }
          }
        });

        // Set the indent of the branch line.
        for (let j = 0; j < shortLine.length; j++) {
          if (mainLineCommit !== null) {
            shortLine[j].indent = mainLine[self.lineIndexOf(mainLineCommit, mainLine)].indent + 1;
          } else {
            shortLine[j].indent = -1;
          }
        }

        if (mainLineCommit !== null) {
          mainLine.splice(self.lineIndexOf(mainLineCommit, mainLine), 0, ...shortLine);
        } else {
          mainLine = mainLine.concat(shortLine);
        }
        progressBarManager.increasePercentage((1 / branchCommits.length) * (0.99 - 0.5) * 100);
      }
    }
    return mainLine;
  }

  /**
   * Gets the mergecommitline.
   * @param {Commit} mergeCommit
   * @param {Commit} mergeCommitParent
   * @param {Array<CommitWrapper>} parentLine
   * @param {Commit} lastCommit
   * @return {Promise<Array<CommitWrapper>>}
   */
  async getMergeCommitLine(mergeCommit, mergeCommitParent, parentLine, lastCommit) {
    const self = this;
    const indent = parentLine[self.lineIndexOf(mergeCommit, parentLine)].indent + 1;
    const mergeCommitParents = [];
    const mergeLine = [];
    let isFinished = false;
    let child = mergeCommitParent;

    mergeLine.push(new CommitWrapper(indent, child, []));
    while (!isFinished) {
      await child.getParents(10).then(async function(parents) {
        if (parents.length === 2) {
          mergeCommitParents.push([child, parents[1]]);
        }
        if (parents.length > 2) {
          throw new RangeError('I honestly didn\'t know a commit could have more than 2 parents...');
        } else if (parents.length === 0 || self.containsCommit(parents[0], parentLine) || parents[0].date() < lastCommit.date()) {
          isFinished = true;
        } else {
          mergeLine.push(new CommitWrapper(indent, parents[0], []));
          child = parents[0];
        }
      });
    }
    for (let i = 0; i < mergeLine.length; i++) {
      await mergeLine[i].commit.getParents(10).then(function(parents) {
        if (parents.length > 2) {
          throw new RangeError('I honestly didn\'t know a commit could have more than 2 parents...');
        } else if (parents.length === 1 || parents.length === 2) {
          mergeLine[i].parentCommits = parents;
        }
      });
    }

    parentLine.splice(self.lineIndexOf(mergeCommit, parentLine) + 1, 0, ...mergeLine);

    for (let i = 0; i < mergeCommitParents; i++) {
      await self.getMergeCommitLine(mergeCommitParents[i][0], mergeCommitParents[i][1], parentLine, lastCommit);
    }
    return mergeLine;
  }

  /**
   * Checks if the commit is contained in the commit line.
   * @param {Commit} commit
   * @param {Array<CommitWrapper>} line
   * @return {boolean}
   */
  containsCommit(commit, line) {
    return line.filter((e) => e.commit.id().toString() === commit.id().toString()).length > 0;
  }

  /**
   * Gets the index of the commit from the commit line.
   * @param {Commit} commit
   * @param {Array<CommitWrapper>} line
   * @return {number}
   */
  lineIndexOf(commit, line) {
    return line.findIndex((e) => e.commit.id().toString() === commit.id().toString());
  }

  /**
   * Pairs a branchList to a particular commit and returns the string values.
   * @param {Array<CommitWrapper>} masterLine
   * @param {Object} commitBranchDict
   * @return {*[]}
   */
  getPrintableResults(masterLine, commitBranchDict) {
    const results = [];
    for (const wrappedCommit of masterLine) {
      let branchList = [];
      if (wrappedCommit.commit.id().toString() in commitBranchDict) {
        branchList = branchList.concat(commitBranchDict[wrappedCommit.commit.id().toString()]);
      }
      results.push([branchList, wrappedCommit.getParseableFormat()]);
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
   * @param {Electron.CrossProcessExports.BrowserWindow} win The main window
   * @return {Promise<void>}
   */
  async gitFetch(win) {
    const self = this;
    await self.repo.fetchAll({
      downloadTags: Git.Remote.AUTOTAG_OPTION.DOWNLOAD_TAGS_ALL,
      callbacks: {
        credentials: async function() {
          return await self.getCredential(win);
        },
      },
    });
  }

  /**
   * Pulls down from the remote.
   * @param {Electron.CrossProcessExports.BrowserWindow} win
   * @return {Promise<void>}
   */
  async gitPull(win) {
    const self = this;
    await self.repo.fetchAll({
      callbacks: {
        credentials: async function() {
          return await self.getCredential(win);
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
   * @param {Electron.CrossProcessExports.BrowserWindow} win
   * @return {Promise<void>}
   */
  async gitPush(win) {
    const self = this;
    await self.repo.getRemote('origin').then(async function(remote) {
      await self.repo.getCurrentBranch().then(async function(currentRef) {
        await remote.push([currentRef.toString()], {
          callbacks: {
            credentials: async function() {
              return await self.getCredential(win);
            },
          },
        });
      });
    });
  }

  /**
   * Creates a new branch
   * @param {string} branchName
   */
  async gitBranch(branchName) {
    const self = this;
    await self.repo.getHeadCommit().then(async function(headCommit) {
      await Git.Branch.create(self.repo, branchName, headCommit, 0).then(async function(ref) {
        await self.gitCheckout(ref);
      });
    });
  }

  /**
   * Gets the credentials for remote operations.
   * @param {Electron.CrossProcessExports.BrowserWindow} win
   * @return {Promise<*>}
   */
  async getCredential(win) {
    const self = this;

    if ((self.username === '' || self.password === '') && (self.publicKeyPath === '' || self.privateKeyPath === '')) {
      await new Promise(function(resolve, reject) {
        win.webContents.send('git-fetch-creds', []);
        ipcMain.on('login-message', (event, arg) => {
          self.username = arg[0];
          self.password = arg[1];
          self.publicKeyPath = '';
          self.privateKeyPath = '';
          self.passphrase = '';
          resolve();
        });

        ipcMain.on('ssh-connect-message', (event, arg) => {
          self.username = '';
          self.password = '';
          self.publicKeyPath = arg[0];
          self.privateKeyPath = arg[1];
          self.passphrase = arg[2];
          resolve();
        });
      });
    }

    if (self.username !== '' && self.password !== '') {
      return Git.Credential.userpassPlaintextNew(self.username, self.password);
    } else if (self.publicKeyPath !== '' && self.privateKeyPath !== '') {
      return Git.Credential.sshKeyNew('git', self.publicKeyPath, self.privateKeyPath, self.passphrase);
    } else {
      throw new Error('No Git credentials were entered!');
    }
  }
};
