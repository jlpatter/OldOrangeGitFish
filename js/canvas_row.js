
class CanvasRow {
    constructor(x, y, entry) {
        this.x = x;
        this.y = y;
        this.entry = entry;
    }

    draw(ctx, prev) {
        let self = this;
        self.drawCircle(self.x, self.y, ctx);
        if (prev !== null) {
            self.drawLine(prev.x, prev.y, self.x, self.y, ctx);
        }
        let currentX = self.x + 15;
        self.entry[0].forEach(function(branch) {
            let branchText = '(' + branch + ') ';
            self.drawText(currentX, self.y + 6, branchText, 'rgb(100, 100, 255)', ctx);
            currentX += ctx.measureText(branchText).width;
        });
        self.drawText(currentX, self.y + 6, self.entry[1], 'rgb(255, 255, 255)', ctx);
    }

    drawLine(x, y, x2, y2, ctx) {
        ctx.strokeStyle = 'rgb(0, 0, 255)';
        ctx.lineWidth = 3;
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    drawText(x, y, text, color, ctx) {
        ctx.fillStyle = color;
        ctx.font = "16px Arial";
        ctx.fillText(text, x, y);
    }

    drawCircle(x, y, ctx) {
        let self = this;
        ctx.fillStyle = 'rgb(0, 0, 255)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 8, self.degToRad(0), self.degToRad(360), false);
        ctx.fill();
    }

    degToRad(degrees) {
        return degrees * Math.PI / 180;
    }
}