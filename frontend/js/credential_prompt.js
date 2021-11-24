const ipcRenderer = require('electron').ipcRenderer;
const dialog = require('@electron/remote').dialog;

/**
 * Credential prompt.
 */
class CredentialPrompt {
  /**
   * Sets up the user-password and ssh prompts.
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

      $('#sshPrivateKeyBtn').click(function() {
        dialog.showOpenDialog({properties: ['openFile', 'showHiddenFiles']}).then(function(result) {
          $('#sshPrivateKey').val(result.filePaths[0]);
        });
      });
      $('#sshPublicKeyBtn').click(function() {
        dialog.showOpenDialog({properties: ['openFile', 'showHiddenFiles']}).then(function(result) {
          $('#sshPublicKey').val(result.filePaths[0]);
        });
      });

      $('#sshConnectBtn').click(function() {
        ipcRenderer.send('ssh-connect-message', [$('#sshPublicKey').val(), $('#sshPrivateKey').val(), $('#sshPassphrase').val()]);
        window.close();
      });

      $('#sshCancelBtn').click(function() {
        window.close();
      });
    });
  }
}

new CredentialPrompt().run();
