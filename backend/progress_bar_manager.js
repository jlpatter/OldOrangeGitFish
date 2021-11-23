/**
 * A class to manage the progress bar
 */
module.exports = class ProgressBarManager {
  /**
   * Constructs a new progress bar manager
   * @param {Electron.CrossProcessExports.BrowserWindow} win
   * @param {number} percentage
   */
  constructor(win, percentage) {
    this.win = win;
    this.percentage = percentage;
  }

  /**
   * Sets the current percentage of the progress bar.
   * @param {number} value
   */
  setPercentage(value) {
    this.percentage = value;
    this.win.webContents.send('progress-bar-value', Math.floor(this.percentage));
  }

  /**
   * Increases the percentage of the progress bar.
   * @param {number} value
   */
  increasePercentage(value) {
    this.percentage += value;
    if (this.percentage > 100) {
      this.percentage = 100;
    }
    this.win.webContents.send('progress-bar-value', Math.floor(this.percentage));
  }
};
