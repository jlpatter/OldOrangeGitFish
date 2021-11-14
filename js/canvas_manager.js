
class CanvasManager {
    constructor() {
        let $mainCanvas = $('#mainCanvas');
        this.canvas = $mainCanvas.get(0);
        this.canvas.width = $mainCanvas.parent().width();
        this.canvas.height = $('#commitColumn').height();
        this.ctx = this.canvas.getContext('2d');

        this.entryList = [];
    }

    updateCommitTable(entryList) {
        this.entryList = entryList;
        this.refreshCommitTable();
    }

    refreshCommitTable() {
        let self = this;

        self.canvas.height = self.entryList.length * 30;
        self.ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);

        let y = 20;
        let prevEntry = null;
        for (let entry of self.entryList) {
            let canvasRow = new CanvasRow(20, y, entry);
            canvasRow.draw(self.ctx, prevEntry);
            prevEntry = canvasRow;

            y += 30;
        }
    }
}
