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

      window.addEventListener('resize', function(event) {
        const commitColumnHeight = window.innerHeight - 150;
        const $commitColumn = $('#commitColumn');
        $commitColumn.css('height', commitColumnHeight + 'px');
        $('#commitTableSVG').attr('width', $commitColumn.width());
        self.svgManager.refreshCommitTable();
      });
    });
  }

  /**
   * Opens the login window and waits until it's closed
   * @return {Promise<void>}
   */
  async openLoginWindow() {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
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
   * Refreshes the branch tables, commit table, and staging tables.
   */
  refreshAll() {
    const $mainTable = $('#mainTable');
    if ($mainTable.hasClass('invisible')) {
      $mainTable.removeClass('invisible');
    }
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
        const $button = $('<button />', {
          id: 'btn_' + shortResult,
          class: 'btn btn-primary btn-sm right',
          type: 'button',
          text: 'Ch',
          value: shortResult,
        });

        if (branchResult.startsWith('origin/')) {
          $button.click(function() {
            ipcRenderer.send('git-checkout-remote-message', $button.attr('value'));
          });
          $('#remoteTableBody').append('<tr><td>' + branchResult + '</td></tr>');
          $('#remoteTableBody > tr > td:contains("' + branchResult + '")').append($button);
        } else {
          $button.click(function() {
            ipcRenderer.send('git-checkout-message', $button.attr('value'));
          });
          $('#localTableBody').append('<tr><td>' + branchResult + '</td></tr>');
          $('#localTableBody > tr > td:contains("' + branchResult + '")').append($button);
        }
      });
    }
  }

  /**
   * Refreshes the staging tables.
   * @param {Array} results
   */
  refreshStagingTables(results) {
    $('#unstagedTableBody tr').remove();
    $('#stagedTableBody tr').remove();
    $('#unstagedTableBody').append('<tr><th><h4>Unstaged Changes</h4></th></tr>');
    $('#stagedTableBody').append('<tr><th><h4>Staged Changes</h4></th></tr>');

    // Unstaged changes
    results[0].forEach(function(unstagedFile) {
      $('#unstagedTableBody').append('<tr><td>' + unstagedFile + '</td></tr>');
    });

    // Staged changes
    results[1].forEach(function(stagedFile) {
      $('#stagedTableBody').append('<tr><td>' + stagedFile + '</td></tr>');
    });
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

main.run();
