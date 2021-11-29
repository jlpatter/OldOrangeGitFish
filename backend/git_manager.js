const {ipcMain} = require('electron');
const Git = require('nodegit');
const path = require('path');
const keytar = require('keytar');
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
    // Extract the project name from the url
    const projectName = urlAndPath[0].slice(urlAndPath[0].lastIndexOf('/') + 1, -4);
    // Use the project name as a name for the folder containing the project
    await Git.Clone.clone(urlAndPath[0], urlAndPath[1] + path.sep + projectName, cloneOptions).then(function(repo) {
      self.repo = repo;
    });
  }

  /**
   * Gets the unstaged and staged files.
   * @return {Promise<Array<Array<Array<number|string>>>>}
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
   * @return {Promise<Array<Array<number|string>>>}
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
   * @param {Array<number|string>} statusAndFilePath
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
   * @param {Array<number|string>} statusAndFilePath
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
   * @param {Electron.CrossProcessExports.BrowserWindow} win
   * @param {string} message The message to use for the commit.
   * @return {Promise<void>}
   */
  async gitCommit(win, message) {
    const self = this;
    let fullname = '';
    let email = '';
    await self.repo.config().then(async function(config) {
      await config.getStringBuf('user.name').then(function(buf) {
        fullname = buf.toString();
      }).catch(function(error) {
        fullname = '';
      });
      await config.getStringBuf('user.email').then(function(buf) {
        email = buf.toString();
      }).catch(function(error) {
        email = '';
      });
    });
    if (fullname === '' || email === '') {
      await new Promise(function(resolve, reject) {
        win.webContents.send('git-fetch-signature', []);
        ipcMain.on('signature-message', (event, arg) => {
          fullname = arg[0];
          email = arg[1];
          resolve();
        });
      });
      await self.repo.config().then(async function(config) {
        await config.setString('user.name', fullname);
        await config.setString('user.email', email);
      });
    }
    const author = Git.Signature.now(fullname, email);
    const index = await self.repo.refreshIndex();
    const changes = await index.writeTree();
    let head = null;
    await Git.Reference.nameToId(self.repo, 'HEAD').then(function(oid) {
      head = oid;
    }).catch(function(error) {
      head = null;
    });
    const parents = [];
    if (head !== null) {
      parents.push(await self.repo.getCommit(head));
    }
    await self.repo.createCommit('HEAD', author, author, message, changes, parents);
  }

  /**
   * Gets the log of commits to send to the main commit table.
   * @param {ProgressBarManager} progressBarManager The main browser window to send progress bar stuff to.
   * @return {Promise<Array<Array<Array<string>|string>>>}
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
   * @param {Object<string, Reference>} gitReferences Branches and tags
   * @param {Array<Commit>} branchCommits The variable used to store branch commits
   * @return {Promise<Object<string, string>>}
   */
  async buildBranchCommitsAndCommitBranchDict(gitReferences, branchCommits) {
    const self = this;
    const commitBranchDict = {};
    const gitRefValues = Object.values(gitReferences);
    for (const ref of gitRefValues) {
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
   * @param {ProgressBarManager} progressBarManager
   * @param {Array<Commit>} branchCommits
   * @return {Promise<Array<CommitWrapper>>}
   */
  async getAllCommitLines(progressBarManager, branchCommits) {
    const self = this;
    const mainLine = [];
    if (branchCommits.length > 0) {
      // Sort the branchCommits by date descending.
      branchCommits.sort(function(a, b) {
        return b.date() - a.date();
      });

      // Start a walk from the branchCommits.
      const revwalk = Git.Revwalk.create(self.repo);
      for (let i = 0; i < branchCommits.length; i++) {
        revwalk.push(branchCommits[i].id());
      }
      revwalk.sorting(Git.Revwalk.SORT.TOPOLOGICAL);
      const childrenIds = {};
      // Only walk 2000 commits.
      await revwalk.commitWalk(2000).then(function(vectorGitCommit) {
        for (let i = 0; i < vectorGitCommit.length; i++) {
          const parentIds = [];
          for (let j = 0; j < vectorGitCommit[i].parentcount(); j++) {
            // Get the parentIds of the current commit to be used by the frontend.
            parentIds.push(vectorGitCommit[i].parentId(j).toString());
            // Get the childrenIds of the parent commit to be used by the frontend.
            if (vectorGitCommit[i].parentId(j).toString() in childrenIds) {
              childrenIds[vectorGitCommit[i].parentId(j).toString()].push(vectorGitCommit[i].id().toString());
            } else {
              childrenIds[vectorGitCommit[i].parentId(j).toString()] = [vectorGitCommit[i].id().toString()];
            }
          }
          // Add the current commit to the mainLine.
          mainLine.push(new CommitWrapper(0, i, vectorGitCommit[i], parentIds));

          progressBarManager.increasePercentage((1 / vectorGitCommit.length) * (0.99 - 0.05) * 100);
        }
      });

      // Gather the child commits after running through the commit graph once in order
      // to actually have populated entries.
      for (let i = 0; i < mainLine.length; i++) {
        if (mainLine[i].commit.id().toString() in childrenIds) {
          mainLine[i].childCommitIds = childrenIds[mainLine[i].commit.id().toString()];
        }
      }
    }
    return mainLine;
  }

  /**
   * Pairs a branchList to a particular commit and returns the string values.
   * @param {Array<CommitWrapper>} masterLine
   * @param {Object} commitBranchDict
   * @return {Array<Array<Array<string>|string>>}
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
   * @param {string|Reference} branch
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
   * @return {Promise<void>}
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
   * Resets the current branch to thet commitSha by the specified type.
   * @param {string} commitSha
   * @param {number} resetType
   */
  async gitReset(commitSha, resetType) {
    const self = this;
    await Git.Commit.lookup(self.repo, commitSha).then(async function(commit) {
      await Git.Reset.reset(self.repo, commit, resetType);
    });
  }

  /**
   * Gets the credentials for remote operations.
   * @param {Electron.CrossProcessExports.BrowserWindow} win
   * @return {Promise<Git.Credential>}
   */
  async getCredential(win) {
    const self = this;

    const httpsCredentials = await keytar.findCredentials('egitgui');
    const sshCredentials = await keytar.findCredentials('egitguissh');

    let username = '';
    let password = '';
    let publicKeyPath = '';
    let privateKeyPath = '';
    let passphrase = '';

    if (httpsCredentials.length === 0 && sshCredentials.length === 0) {
      await new Promise(function(resolve, reject) {
        win.webContents.send('git-fetch-creds', []);
        ipcMain.on('login-message', async (event, arg) => {
          username = arg[0];
          password = arg[1];
          await keytar.setPassword('egitgui', username, password);
          resolve();
        });

        ipcMain.on('ssh-connect-message', async (event, arg) => {
          publicKeyPath = arg[0];
          privateKeyPath = arg[1];
          passphrase = arg[2];

          await keytar.setPassword('egitguissh', 'git', passphrase);
          await self.repo.config().then(async function(config) {
            await config.setString('egitgui.publickey', publicKeyPath);
            await config.setString('egitgui.privatekey', privateKeyPath);
          });

          resolve();
        });
      });
    } else if (httpsCredentials.length > 0) {
      username = httpsCredentials[0].account;
      password = httpsCredentials[0].password;
    } else if (sshCredentials.length > 0) {
      await self.repo.config().then(async function(config) {
        await config.getStringBuf('egitgui.publickey').then(function(buf) {
          publicKeyPath = buf.toString();
        }).catch(function(error) {
          publicKeyPath = '';
        });
        await config.getStringBuf('egitgui.privatekey').then(function(buf) {
          privateKeyPath = buf.toString();
        }).catch(function(error) {
          privateKeyPath = '';
        });
      });
      passphrase = sshCredentials[0].password;
    } else {
      throw new Error('It shouldn\'t be possible to see this message.');
    }

    if (username !== '' && password !== '') {
      return Git.Credential.userpassPlaintextNew(username, password);
    } else if (publicKeyPath !== '' && privateKeyPath !== '' && passphrase !== '') {
      return Git.Credential.sshKeyNew('git', publicKeyPath, privateKeyPath, passphrase);
    } else {
      throw new Error('No Git credentials were found or entered!');
    }
  }
};
