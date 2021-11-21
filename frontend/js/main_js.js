const ipcRenderer = require('electron').ipcRenderer;
const remote = require('@electron/remote');
const remoteMain = require('@electron/remote/main');
const dialog = remote.dialog;
const app = remote.app;
const BrowserWindow = remote.BrowserWindow;
const SVGManager = require('../js/svg_manager.js');

/**
 * The Main js class used in the main window.
 */
class Main {
  /**
   * Constructs a new main object.
   */
  constructor() {
    this.filePath = '';
    this.username = '';
    this.password = '';
  }

  /**
   * Runs the primary functions of the application.
   */
  run() {
    const self = this;
    window.addEventListener('DOMContentLoaded', () => {
      self.svgManager = new SVGManager();

      $('#fetchBtn').click(function() {
        if (self.filePath !== '') {
          ipcRenderer.send('git-fetch-message', []);
        }
      });

      $('#pullBtn').click(function() {
        if (self.filePath !== '') {
          ipcRenderer.send('git-pull-message', []);
        }
      });

      $('#pushBtn').click(function() {
        if (self.filePath !== '') {
          ipcRenderer.send('git-push-message', []);
        }
      });

      $('#branchBtn').click(async function() {
        if (self.filePath !== '') {
          await self.openCreateBranchWindow();
        }
      });

      $('#stageAllBtn').click(function() {
        if (self.filePath !== '') {
          ipcRenderer.send('git-stage-all-message', []);
        }
      });

      $('#commitBtn').click(function() {
        if (self.filePath !== '') {
          const $messageTxt = $('#messageTxt');
          ipcRenderer.send('git-commit-message', $messageTxt.val());
          $messageTxt.val('');
        }
      });

      $('#initBtn').click(function() {
        dialog.showOpenDialog({properties: ['openDirectory']}).then(function(result) {
          self.filePath = result.filePaths[0];
          ipcRenderer.send('git-init-message', result.filePaths[0]);
        });
      });

      $('#openBtn').click(function() {
        dialog.showOpenDialog({properties: ['openDirectory']}).then(function(result) {
          self.filePath = result.filePaths[0];
          ipcRenderer.send('git-open-message', self.filePath);
        });
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
      win.loadFile('./frontend/views/username_password_prompt.html');

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
      win.loadFile('./frontend/views/branch_name.html');
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
   * @param {Array} results
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
      $('#localTableBody').append('<tr><th><h4>Local Branches</h4></th></tr>');
      $('#remoteTableBody').append('<tr><td><h4>Remote Branches</h4></td></tr>');

      branches.forEach(function(branchResult) {
        const shortResult = branchResult.startsWith('* ') ? branchResult.slice(2) : branchResult;
        const $branchResult = $('<tr class="unselectable"><td>' + branchResult + '</td></tr>');

        if (branchResult.startsWith('origin/')) {
          $branchResult.on('dblclick', function() {
            ipcRenderer.send('git-checkout-remote-message', shortResult);
          });
          $('#remoteTableBody').append($branchResult);
        } else {
          $branchResult.on('dblclick', function() {
            ipcRenderer.send('git-checkout-message', shortResult);
          });
          $('#localTableBody').append($branchResult);
        }
      });
    }
  }

  /**
   * Refreshes the staging tables.
   * @param {Array} results
   */
  refreshStagingTables(results) {
    const self = this;
    $('#unstagedTableBody tr').remove();
    $('#stagedTableBody tr').remove();
    $('#unstagedTableBody').append('<tr><th><h4>Unstaged Changes</h4></th></tr>');
    $('#stagedTableBody').append('<tr><th><h4>Staged Changes</h4></th></tr>');

    // Unstaged changes
    results[0].forEach(function(unstagedFile) {
      const $button = $('<button type="button" class="btn btn-success btn-sm right"><i class="bi bi-plus-lg"></i></button>');
      $button.click(function() {
        if (self.filePath !== '') {
          ipcRenderer.send('git-stage-message', unstagedFile);
        }
      });
      const $row = $('<tr><td>' + ' ' + unstagedFile[1] + '</td></tr>');
      if (unstagedFile[0] === 2) {
        $row.find('td').prepend('<i class="bi bi-dash-lg"></i> ');
      } else if (unstagedFile[0] === 3) {
        $row.find('td').prepend('<i class="bi bi-pen"></i> ');
      } else if (unstagedFile[0] === 7) {
        $row.find('td').prepend('<i class="bi bi-plus-lg"></i> ');
      } else {
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
      if (stagedFile[0] === 2) {
        $row.find('td').prepend('<i class="bi bi-dash-lg"></i> ');
      } else if (stagedFile[0] === 3) {
        $row.find('td').prepend('<i class="bi bi-pen"></i> ');
      } else if (stagedFile[0] === 1) {
        $row.find('td').prepend('<i class="bi bi-plus-lg"></i> ');
      } else {
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

ipcRenderer.on('login-message', (event, arg) => {
  main.username = arg[0];
  main.password = arg[1];
});

ipcRenderer.on('refresh-message', (event, arg) => {
  main.refreshAll();
});

ipcRenderer.on('git-log-message', (event, arg) => {
  main.refreshBranchAndCommitTables(arg);
});

ipcRenderer.on('git-diff-message', (event, arg) => {
  main.refreshStagingTables(arg);
});

ipcRenderer.on('git-fetch-creds', (event, arg) => {
  main.openLoginWindow().then(function(results) {
    ipcRenderer.send('git-fetch-creds', [main.username, main.password]);
  });
});

ipcRenderer.on('progress-bar-value', (event, arg) => {
  main.setProgressBar(arg);
});

main.run();
