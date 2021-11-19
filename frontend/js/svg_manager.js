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
    const svgRows = [];
    for (const entry of self.entryResults) {
      svgRows.push(new SVGRow(entry[1][2], entry[1][3], entry[1][0], 20 + (entry[1][0] * 20), y, entry));
      y += 30;
    }

    for (const svgRow of svgRows) {
      svgRow.draw(self.$commitTableSVG, svgRow.getParentSVGRow(svgRows));
    }
  }
};
