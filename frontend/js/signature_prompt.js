const ipcRenderer = require('electron').ipcRenderer;

/**
 * The main script for the Signature Prompt.
 */
class SignaturePrompt {
  /**
   * Sets up the confirm button.
   */
  run() {
    window.addEventListener('DOMContentLoaded', () => {
      $('#confirmBtn').click(function() {
        ipcRenderer.send('signature-message', [$('#fullNameTxt').val(), $('#emailTxt').val()]);
        window.close();
      });
    });
  }
}

new SignaturePrompt().run();
