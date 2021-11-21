/**
 * A wrapper for a commit to include the indent.
 */
module.exports = class CommitWrapper {
  /**
   * Constructs an object with an indent and a commit.
   * @param {number} indent
   * @param {Commit} commit
   * @param {Array<Commit>} parentCommits Should only be of length 1 or 2.
   */
  constructor(indent, commit, parentCommits) {
    this.indent = indent;
    this.commit = commit;
    this.parentCommits = parentCommits;
  }

  /**
   * Constructs and returns an array that can be sent via ipcMain
   * @return {Array}
   */
  getParseableFormat() {
    if (this.parentCommits.length > 0) {
      const parseableParentCommits = [];
      for (let i = 0; i < this.parentCommits.length; i++) {
        parseableParentCommits.push(this.parentCommits[i].id().toString());
      }
      return [this.indent, this.commit.summary(), this.commit.id().toString(), parseableParentCommits];
    } else {
      return [this.indent, this.commit.summary(), this.commit.id().toString(), []];
    }
  }
};
