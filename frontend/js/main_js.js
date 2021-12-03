const ipcRenderer = require('electron').ipcRenderer;
const remote = require('@electron/remote');
const remoteMain = remote.require('@electron/remote/main');
const dialog = remote.dialog;
const app = remote.app;
const BrowserWindow = remote.BrowserWindow;
const SVGManager = require('../js/svg_manager.js');

/**
 * The Main js class used in the main window.
 */
class Main {
  /**
   * Runs the primary functions of the application.
   */
  run() {
    const self = this;
    window.addEventListener('DOMContentLoaded', () => {
      self.svgManager = new SVGManager();

      $('#contextMenu').hide();
      $('#mergeControls').hide();

      $(window).click(function() {
        $('#contextMenu').hide();
      });

      $('#fetchBtn').click(function() {
        ipcRenderer.send('git-fetch-message', []);
      });

      $('#pullBtn').click(function() {
        ipcRenderer.send('git-pull-message', []);
      });

      $('#pushBtn').click(function() {
        ipcRenderer.send('git-push-message', []);
      });

      $('#forcePushBtn').click(function() {
        ipcRenderer.send('git-force-push-message', []);
      });

      $('#branchBtn').click(async function() {
        await self.openCreateBranchWindow();
      });

      $('#stageAllBtn').click(function() {
        ipcRenderer.send('git-stage-all-message', []);
      });

      $('#commitBtn').click(function() {
        const $messageTxt = $('#messageTxt');
        ipcRenderer.send('git-commit-message', $messageTxt.val());
        $messageTxt.val('');
      });

      $('#abortMergeBtn').click(function() {
        ipcRenderer.send('git-abort-merge', []);
        $('#commitControls').show();
        $('#mergeControls').hide();
      });

      $('#continueMergeBtn').click(function() {
        ipcRenderer.send('git-continue-merge', []);
        $('#commitControls').show();
        $('#mergeControls').hide();
      });

      $('#initBtn').click(function() {
        dialog.showOpenDialog({properties: ['openDirectory']}).then(function(result) {
          ipcRenderer.send('git-init-message', result.filePaths[0]);
        });
      });

      $('#openBtn').click(function() {
        dialog.showOpenDialog({properties: ['openDirectory']}).then(function(result) {
          ipcRenderer.send('git-open-message', result.filePaths[0]);
        });
      });

      $('#cloneBtn').click(async function() {
        await self.openCloneWindow();
      });

      $('#refreshBtn').click(function() {
        self.refreshAll();
      });

      $('#exitBtn').click(function() {
        app.quit();
      });
    });
  }

  /**
   * Opens the login window and waits until it's closed
   * @return {Promise<void>}
   */
  async openLoginWindow() {
    const win = new BrowserWindow({
      width: 400,
      height: 300,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    remoteMain.enable(win.webContents);

    await new Promise(function(resolve, reject) {
      win.loadFile('./frontend/views/credential_prompt.html');

      win.on('close', function() {
        resolve();
      });
    });
  }

  /**
   * Opens the signature window and waits until it's closed
   * @return {Promise<void>}
   */
  async openSignatureWindow() {
    const win = new BrowserWindow({
      width: 400,
      height: 300,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    remoteMain.enable(win.webContents);

    await new Promise(function(resolve, reject) {
      win.loadFile('./frontend/views/signature_prompt.html');

      win.on('close', function() {
        resolve();
      });
    });
  }

  /**
   * Opens the create branch window asking for a branch name
   * then waits until it's closed
   * @return {Promise<void>}
   */
  async openCreateBranchWindow() {
    const win = new BrowserWindow({
      width: 400,
      height: 300,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    remoteMain.enable(win.webContents);

    await new Promise(function(resolve, reject) {
      win.loadFile('./frontend/views/branch_prompt.html');
      win.on('close', function() {
        resolve();
      });
    });
  }

  /**
   * Opens the window for entering clone information then waits for it to close.
   * @return {Promise<void>}
   */
  async openCloneWindow() {
    const win = new BrowserWindow({
      width: 400,
      height: 300,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    remoteMain.enable(win.webContents);

    await new Promise(function(resolve, reject) {
      win.loadFile('./frontend/views/clone_prompt.html');
      win.on('close', function() {
        resolve();
      });
    });
  }

  /**
   * Refreshes the branch tables, commit table, and staging tables.
   */
  refreshAll() {
    ipcRenderer.send('git-log-message', []);
    ipcRenderer.send('git-diff-message', []);
  }

  /**
   * Refreshes the branch tables and commit table.
   * @param {Array<Array<Array<string>|string>>} results
   */
  refreshBranchAndCommitTables(results) {
    const self = this;
    if (self.filePath !== '') {
      const branches = [];
      results.forEach(function(result) {
        result[0].forEach(function(branch) {
          branches.push(branch);
        });
      });
      self.svgManager.updateCommitTable(results);

      $('#localTableBody tr').remove();
      $('#remoteTableBody tr').remove();
      $('#localTableBody').append('<tr><th><h6>Local Branches</h6></th></tr>');
      $('#remoteTableBody').append('<tr><td><h6>Remote Branches</h6></td></tr>');

      branches.forEach(function(branchResult) {
        const shortResult = branchResult.startsWith('* ') ? branchResult.slice(2) : branchResult;
        const $branchResult = $('<tr class="unselectable"><td>' + branchResult + '</td></tr>');

        // TODO: un-hardcode the use of origin here!
        if (branchResult.startsWith('origin/')) {
          $branchResult.contextmenu(function() {
            self.showContextMenu(shortResult, 2); // 2 is remote
          });
          $branchResult.on('dblclick', function() {
            ipcRenderer.send('git-checkout-remote-message', shortResult);
          });
          $('#remoteTableBody').append($branchResult);
        } else {
          $branchResult.contextmenu(function() {
            self.showContextMenu(shortResult, 1); // 1 is local
          });
          $branchResult.on('dblclick', function() {
            ipcRenderer.send('git-checkout-message', shortResult);
          });
          $('#localTableBody').append($branchResult);
        }
      });
    }
  }

  /**
   * Shows the context menu.
   * @param {string} branchName
   * @param {number} branchType
   */
  showContextMenu(branchName, branchType) {
    const $contextMenu = $('#contextMenu');
    $contextMenu.empty();
    $contextMenu.css('left', event.pageX + 'px');
    $contextMenu.css('top', event.pageY + 'px');

    const $deleteBtn = $('<button type="button" class="btn btn-danger btn-sm square-border cm-item"><i class="bi bi-dash-circle"></i> Delete</button>');
    $deleteBtn.click(function() {
      ipcRenderer.send('git-delete-branch', [branchName, branchType]);
    });
    $contextMenu.append($deleteBtn);

    $contextMenu.show();
  }


  /**
   * Refreshes the staging tables.
   * @param {Array<Array<Array<number|string>>>} results
   */
  refreshStagingTables(results) {
    const self = this;
    $('#unstagedTableBody tr').remove();
    $('#stagedTableBody tr').remove();
    $('#unstagedTableBody').append('<tr><th><h6>Unstaged Changes</h6></th></tr>');
    $('#stagedTableBody').append('<tr><th><h6>Staged Changes</h6></th></tr>');

    // Unstaged changes
    results[0].forEach(function(unstagedFile) {
      const $button = $('<button type="button" class="btn btn-success btn-sm right"><i class="bi bi-plus-lg"></i></button>');
      $button.click(function() {
        if (self.filePath !== '') {
          ipcRenderer.send('git-stage-message', unstagedFile);
        }
      });
      // See this for different diff values: https://www.nodegit.org/api/diff/#DELTA
      const $row = $('<tr><td>' + ' ' + unstagedFile[1] + '</td></tr>');
      if (unstagedFile[0] === 2) { // Deleted
        $row.find('td').prepend('<i class="bi bi-dash-lg"></i> ');
      } else if (unstagedFile[0] === 3) { // Modified
        $row.find('td').prepend('<i class="bi bi-pen"></i> ');
      } else if (unstagedFile[0] === 7) { // Untracked
        $row.find('td').prepend('<i class="bi bi-plus-lg"></i> ');
      } else if (unstagedFile[0] === 10) { // Conflicted
        $row.find('td').prepend('<i class="bi bi-exclamation-diamond"></i> ');
      } else { // Everything else
        $row.find('td').prepend('<i class="bi bi-question-circle"></i> ');
      }
      $row.find('td').append($button);
      $('#unstagedTableBody').append($row);
    });

    // Staged changes
    results[1].forEach(function(stagedFile) {
      const $button = $('<button type="button" class="btn btn-danger btn-sm right"><i class="bi bi-dash-lg"></i></button>');
      $button.click(function() {
        if (self.filePath !== '') {
          ipcRenderer.send('git-unstage-message', stagedFile);
        }
      });
      const $row = $('<tr><td>' + ' ' + stagedFile[1] + '</td></tr>');
      if (stagedFile[0] === 2) { // Deleted
        $row.find('td').prepend('<i class="bi bi-dash-lg"></i> ');
      } else if (stagedFile[0] === 3) { // Modified
        $row.find('td').prepend('<i class="bi bi-pen"></i> ');
      } else if (stagedFile[0] === 1) { // Added
        $row.find('td').prepend('<i class="bi bi-plus-lg"></i> ');
      } else if (stagedFile[0] === 10) { // Conflicted
        $row.find('td').prepend('<i class="bi bi-exclamation-diamond"></i> ');
      } else { // Everything else
        $row.find('td').prepend('<i class="bi bi-question-circle"></i> ');
      }
      $row.find('td').append($button);
      $('#stagedTableBody').append($row);
    });
  }

  /**
   * Sets the progress bar to the specified amount.
   * @param {int} percentageInt
   */
  setProgressBar(percentageInt) {
    const $progressBar = $('.progress-bar');
    const $progress = $('.progress');
    $progress.fadeIn('fast');
    $progressBar.css('width', percentageInt + '%');
    $progressBar.attr('aria-valuenow', percentageInt);
    if (percentageInt === 100) {
      $progress.fadeOut('fast');
    }
  }
}

const main = new Main();

ipcRenderer.on('refresh-message', (event, arg) => {
  main.refreshAll();
});

ipcRenderer.on('git-log-message', (event, arg) => {
  main.refreshBranchAndCommitTables(arg);
});

ipcRenderer.on('git-diff-message', (event, arg) => {
  main.refreshStagingTables(arg);
});

ipcRenderer.on('git-merge-conflict-message', (event, arg) => {
  $('#commitControls').hide();
  $('#mergeControls').show();
});

ipcRenderer.on('git-fetch-creds', async (event, arg) => {
  await main.openLoginWindow();
});

ipcRenderer.on('git-fetch-signature', async (event, arg) => {
  await main.openSignatureWindow();
});

ipcRenderer.on('progress-bar-value', (event, arg) => {
  main.setProgressBar(arg);
});

main.run();
