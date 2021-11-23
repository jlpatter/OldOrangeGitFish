const ipcRenderer = require('electron').ipcRenderer;
const dialog = require('@electron/remote').dialog;

/**
 * The JavaScript for the Clone Prompt
 */
class ClonePrompt {
  /**
   * Sets up the buttons for the form.
   */
  run() {
    window.addEventListener('DOMContentLoaded', () => {
      $('#directoryBtn').click(function() {
        dialog.showOpenDialog({properties: ['openDirectory']}).then(function(result) {
          $('#pathTxt').val(result.filePaths[0]);
        });
      });

      $('#cloneBtn').click(function() {
        ipcRenderer.send('git-clone-message', [$('#urlTxt').val(), $('#pathTxt').val()]);
        window.close();
      });

      $('#cancelBtn').click(function() {
        window.close();
      });
    });
  }
}

new ClonePrompt().run();
