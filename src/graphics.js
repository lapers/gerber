const {GLine, GArc, GFlash} = require('./gobject.js');

function draw(ctx, gerber) {
    ctx.strokeStyle = '#000000';
    
    for (var i = 0; i < gerber.objects_count; i++) {
        const object = gerber.objects[i];
        
        //if (object.a.t == 'C') console.log(object.a.m);
        if (object.a === undefined) ctx.strokeStyle = '#FF00FF';
        else ctx.strokeStyle = "#" + ((1<<24)*Math.random() | 0).toString(16);
        
        if (object instanceof GLine) {
            const p1 = formatPoint(object.S);
            const p2 = formatPoint(object.E);
            
            ctx.beginPath();
            ctx.moveTo(p1.X, p1.Y);
            ctx.lineTo(p2.X, p2.Y);
            ctx.stroke();
        } else if (object instanceof GFlash) {
            ctx.fillStyle = '#FF0000';
            
            const p = formatPoint(object.P);
            
            ctx.beginPath();
            ctx.arc(p.X, p.Y, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
}

const ppmm = 3;
const translation = { X: 10, Y: 10 };
const scale = { X: 1, Y: 1 };

function formatPoint(point) {
    return {
        X:   (point.X * ppmm) + translation.X * ppmm,
        Y: - (point.Y * ppmm) + translation.Y * ppmm
    };
}

module.exports = {
    draw: draw
};
