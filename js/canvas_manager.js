
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
        if (self.entryResults.length > 0) {
            let maxStringSize = 0;
            self.ctx.font = "16px Arial";
            self.entryResults.forEach(function(entryResult) {
                let stringToCapture = '';
                entryResult[0].forEach(function(branch) {
                    stringToCapture += '(' + branch + ') ';
                });
                stringToCapture += entryResult[1];
                maxStringSize = Math.max(maxStringSize, self.ctx.measureText(stringToCapture).width);
            });
            self.canvas.width = maxStringSize + 45;
        }
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
