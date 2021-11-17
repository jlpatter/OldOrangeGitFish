
class CanvasManager {
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
        let prevCanvasRow = null;
        for (let entry of self.entryResults) {
            let canvasRow = new CanvasRow(20, y, entry);
            canvasRow.draw(self.$commitTableSVG, prevCanvasRow);
            prevCanvasRow = canvasRow;

            y += 30;
        }
    }
}
