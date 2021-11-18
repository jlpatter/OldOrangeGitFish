const SVGRow = require('../js/svg_row');

/**
 * A class to manage the svg element.
 */
module.exports = class SVGManager {
  /**
   * Constructs the svg manager.
   */
  constructor() {
    this.$commitTableSVG = $('#commitTableSVG');
    this.entryResults = [];
  }

  /**
   * Refreshes the commit table with new entry results.
   * @param {Array} entryResults
   */
  updateCommitTable(entryResults) {
    this.entryResults = entryResults;
    this.refreshCommitTable();
  }

  /**
   * Refreshes the commit table. Can be called on its own for a passive refresh.
   */
  refreshCommitTable() {
    const self = this;

    self.$commitTableSVG.empty();
    self.$commitTableSVG.attr('height', self.entryResults.length * 30);

    let y = 20;
    let prevSVGRow = null;
    for (const entry of self.entryResults) {
      const svgRow = new SVGRow(20, y, entry);
      svgRow.draw(self.$commitTableSVG, prevSVGRow);
      prevSVGRow = svgRow;

      y += 30;
    }
  }
};
