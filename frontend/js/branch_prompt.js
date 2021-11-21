const ipcRenderer = require('electron').ipcRenderer;

/**
 * The JavaScript class for the branch name prompt.
 */
class BranchPrompt {
  /**
   * Sets up the confirm and cancel buttons.
   */
  run() {
    window.addEventListener('DOMContentLoaded', () => {
      $('#confirmBtn').click(function() {
        ipcRenderer.send('git-branch-message', $('#branchTxt').val());
        window.close();
      });

      $('#cancelBtn').click(function() {
        window.close();
      });
    });
  }
}

new BranchPrompt().run();
