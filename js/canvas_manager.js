
class CanvasManager {
    constructor() {
        let $mainCanvas = $('#mainCanvas');
        this.canvas = $mainCanvas.get(0);
        this.canvas.width = $mainCanvas.parent().width();
        this.canvas.height = $('#commitColumn').height();
        this.ctx = this.canvas.getContext('2d');

        this.entryResults = [];
    }

    updateCommitTable(entryResults) {
        this.entryResults = entryResults;
        this.refreshCommitTable();
    }

    refreshCommitTable() {
        let self = this;

        self.canvas.height = self.entryResults.length * 30;
        self.ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);

        let y = 20;
        let prevCanvasRow = null;
        for (let entry of self.entryResults) {
            let canvasRow = new CanvasRow(20, y, entry);
            canvasRow.draw(self.ctx, prevCanvasRow);
            prevCanvasRow = canvasRow;

            y += 30;
        }
    }
}
