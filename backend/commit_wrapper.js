/**
 * A wrapper for a commit to include the indent.
 */
module.exports = class CommitWrapper {
  /**
   * Constructs an object with an indent and a commit.
   * @param {number} indent
   * @param {Commit} commit
   * @param {Array<string>} parentCommitIds Should only be of length 1 or 2.
   */
  constructor(indent, commit, parentCommitIds) {
    this.indent = indent;
    this.commit = commit;
    this.parentCommitIds = parentCommitIds;
  }

  /**
   * Constructs and returns an array that can be sent via ipcMain
   * @return {Array}
   */
  getParseableFormat() {
    if (this.parentCommitIds.length > 0) {
      return [this.indent, this.commit.summary(), this.commit.id().toString(), this.parentCommitIds];
    } else {
      return [this.indent, this.commit.summary(), this.commit.id().toString(), []];
    }
  }
};
