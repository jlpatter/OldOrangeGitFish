const ipcRenderer = require('electron').ipcRenderer;

/**
 * User and Password prompt.
 */
class UPPrompt {
  /**
   * Sets up the login and cancel buttons.
   */
  run() {
    window.addEventListener('DOMContentLoaded', () => {
      $('#loginBtn').click(function() {
        ipcRenderer.send('login-message', [$('#usernameTxt').val(), $('#passwordTxt').val()]);
        window.close();
      });

      $('#cancelBtn').click(function() {
        window.close();
      });
    });
  }
}

new UPPrompt().run();
