const graphics = require('./graphics.js');
const { createCanvas, loadImage } = require('canvas');

function base64(gerber) {
    const canvas = createCanvas(640, 480);
    const ctx = canvas.getContext('2d', { quality: 'best', antialias: 'none' });

    graphics.draw(ctx, gerber);
    
    const buffer = canvas.toBuffer('image/png', { compressionLevel: 9, filters: canvas.PNG_FILTER_NONE });
    return buffer.toString('base64');
}

module.exports = {
    base64: base64
};
