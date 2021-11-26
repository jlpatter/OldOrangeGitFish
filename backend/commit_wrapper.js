/**
 * A wrapper for a commit to include the indent.
 */
module.exports = class CommitWrapper {
  /**
   * Constructs an object with an indent and a commit.
   * @param {number} x
   * @param {number} y
   * @param {Commit} commit
   * @param {Array<string>} parentCommitIds Should only be of length 1 or 2.
   */
  constructor(x, y, commit, parentCommitIds) {
    this.x = x;
    this.y = y;
    this.commit = commit;
    this.parentCommitIds = parentCommitIds;
    this.childCommitIds = [];
  }

  /**
   * Constructs and returns an array that can be sent via ipcMain
   * @return {Array}
   */
  getParseableFormat() {
    return [[this.x, this.y], this.commit.summary(), this.commit.id().toString(), this.parentCommitIds, this.childCommitIds];
  }
};
