
class CanvasRow {
    constructor(x, y, text) {
        this.x = x;
        this.y = y;
        this.text = text;
    }

    draw(ctx) {
        let self = this;
        self.drawCircle(self.x, self.y, ctx);
        self.drawText(self.x + 10, self.y + 6, self.text, ctx);
    }

    drawText(x, y, text, ctx) {
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.font = "16px Arial";
        ctx.fillText(text, x, y);
    }

    drawCircle(x, y, ctx) {
        let self = this;
        ctx.fillStyle = 'rgb(0, 0, 255)';
        ctx.beginPath();
        ctx.arc(x, y, 8, self.degToRad(0), self.degToRad(360), false);
        ctx.fill();
    }

    degToRad(degrees) {
        return degrees * Math.PI / 180;
    }
}