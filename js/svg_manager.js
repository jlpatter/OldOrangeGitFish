
class SVGManager {
    constructor() {
        this.$commitTableSVG = $('#commitTableSVG');
        this.entryResults = [];
    }

    updateCommitTable(entryResults) {
        this.entryResults = entryResults;
        this.refreshCommitTable();
    }

    refreshCommitTable() {
        let self = this;

        self.$commitTableSVG.empty();
        self.$commitTableSVG.attr('height', self.entryResults.length * 30);

        let y = 20;
        let prevSVGRow = null;
        for (let entry of self.entryResults) {
            let svgRow = new SVGRow(20, y, entry);
            svgRow.draw(self.$commitTableSVG, prevSVGRow);
            prevSVGRow = svgRow;

            y += 30;
        }
    }
}
