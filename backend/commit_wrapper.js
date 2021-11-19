/**
 * A wrapper for a commit to include the indent.
 */
module.exports = class CommitWrapper {
  /**
   * Constructs an object with an indent and a commit.
   * @param {number} indent
   * @param {Commit} commit
   * @param {Commit} parentCommit
   */
  constructor(indent, commit, parentCommit) {
    this.indent = indent;
    this.commit = commit;
    this.parentCommit = parentCommit;
  }

  /**
   * Constructs and returns an array that can be sent via ipcMain
   * @return {Array}
   */
  getParseableFormat() {
    if (this.parentCommit !== null) {
      return [this.indent, this.commit.message(), this.commit.id().toString(), this.parentCommit.id().toString()];
    } else {
      return [this.indent, this.commit.message(), this.commit.id().toString(), ''];
    }
  }
};
