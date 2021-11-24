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
      const mainLine = await self.getAllCommitLines(progressBarManager, branchCommits);
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
   * @return {Promise<*[]>}
   */
  async getAllCommitLines(progressBarManager, branchCommits) {
    const self = this;
    let mainLine = [];
    if (branchCommits.length > 0) {
      const mergeCommits = [];

      // Build the mainline
      let counter = 0;
      let isTmpMainLineFinished = false;
      let tmpMainLineChild = branchCommits[0];
      while (!isTmpMainLineFinished) {
        if (counter < 2000) {
          await tmpMainLineChild.getParents(10).then(function(parents) {
            if (parents.length > 2) {
              throw new RangeError('I honestly didn\'t know a commit could have more than 2 parents...');
            } else if (parents.length === 0) {
              isTmpMainLineFinished = true;
            } else {
              if (parents.length === 2) {
                mergeCommits.push([tmpMainLineChild, parents[1]]);
              }
              mainLine.push(new CommitWrapper(0, tmpMainLineChild, parents));
              tmpMainLineChild = parents[0];
            }
          });
        } else {
          isTmpMainLineFinished = true;
        }
        counter++;
      }
      mainLine.push(new CommitWrapper(0, tmpMainLineChild, []));

      progressBarManager.increasePercentage(5);

      // Only show the first 2000 commits.
      const lastCommit = mainLine[mainLine.length - 1].commit;

      progressBarManager.increasePercentage(5);

      for (let i = 1; i < branchCommits.length; i++) {
        if (!self.containsCommit(branchCommits[i], mainLine) && branchCommits[i].date() > lastCommit.date()) {
          // Build shortlines from branchCommits
          const shortLine = [new CommitWrapper(-1, branchCommits[i], [])];
          let child = branchCommits[i];
          let isFinished = false;
          let mainLineCommit = null;
          while (!isFinished) {
            await child.getParents(10).then(function(parents) {
              if (parents.length === 2) {
                mergeCommits.push([child, parents[1]]);
              }
              if (parents.length > 2) {
                throw new RangeError('I honestly didn\'t know a commit could have more than 2 parents...');
              } else if (parents.length === 0 || parents[0].date() < lastCommit.date()) {
                isFinished = true;
              } else if (self.containsCommit(parents[0], mainLine)) {
                isFinished = true;
                mainLineCommit = parents[0];
              } else {
                shortLine.push(new CommitWrapper(-1, parents[0], []));
                child = parents[0];
              }
            });
          }

          // Set indents and parent commits of shortLine commits.
          for (let i = 0; i < shortLine.length; i++) {
            if (mainLineCommit !== null) {
              shortLine[i].indent = mainLine[self.lineIndexOf(mainLineCommit, mainLine)].indent + 1;
            } else {
              shortLine[i].indent = 1;
            }
            await shortLine[i].commit.getParents(10).then(function(parents) {
              if (parents.length > 2) {
                throw new RangeError('I honestly didn\'t know a commit could have more than 2 parents...');
              } else if (parents.length === 1 || parents.length === 2) {
                shortLine[i].parentCommits = parents;
              }
            });
          }

          if (mainLineCommit !== null) {
            // Inserts shortLine into mainLine at self.lineIndexOf(mainLineCommit, mainLine)
            mainLine.splice(self.lineIndexOf(mainLineCommit, mainLine), 0, ...shortLine);
          } else {
            mainLine = mainLine.concat(shortLine);
          }
        }
        progressBarManager.increasePercentage((1 / branchCommits.length) * (0.5 - 0.15) * 100);
      }

      // Add mergeLines to the mainLine
      for (let i = 0; i < mergeCommits.length; i++) {
        await self.getMergeCommitLine(mergeCommits[i][0], mergeCommits[i][1], mainLine, lastCommit);
        progressBarManager.increasePercentage((1 / mergeCommits.length) * (0.99 - 0.5) * 100);
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
    for (let i = 0; i < line.length; i++) {
      if (line[i].commit.id().toString() === commit.id().toString()) {
        return i;
      }
    }
    return -1;
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
