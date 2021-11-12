const remote = require('@electron/remote');
const app = remote.app;

window.addEventListener('DOMContentLoaded', () => {
    $('#exitBtn').click(function() {
        app.quit();
    });
});
