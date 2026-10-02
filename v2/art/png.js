/* 純 node 的 PNG 輸出：不靠任何套件。把一堆 16×16 的像素姿勢排成一張圖。 */
const zlib = require('zlib');
const fs = require('fs');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function writePng(file, w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
  ]));
}
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/* items: [{ px, pal }]，cols 欄，scale 倍；背景用 bg。 */
function sheet(file, items, cols, scale, bg) {
  const cell = 16 * scale + 8;
  const rows = Math.ceil(items.length / cols);
  const W = cols * cell, H = rows * cell;
  const buf = Buffer.alloc(W * H * 4);
  const b = hex(bg || '#1b1712');
  for (let i = 0; i < W * H; i++) { buf[i * 4] = b[0]; buf[i * 4 + 1] = b[1]; buf[i * 4 + 2] = b[2]; buf[i * 4 + 3] = 255; }
  items.forEach((it, idx) => {
    const ox = (idx % cols) * cell + 4, oy = Math.floor(idx / cols) * cell + 4;
    const bgc = it.bg ? hex(it.bg) : null;
    if (bgc) for (let y = 0; y < 16 * scale; y++) for (let x = 0; x < 16 * scale; x++) {
      const o = ((oy + y) * W + ox + x) * 4; buf[o] = bgc[0]; buf[o + 1] = bgc[1]; buf[o + 2] = bgc[2];
    }
    it.px.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return;
      const f = it.pal[ch] !== undefined ? it.pal[ch] : (ch === '*' ? it.pal['*'] : (ch === '+' || ch === 'o') ? it.pal.o : it.pal['#']);
      const c = hex(f);
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const o = ((oy + y * scale + dy) * W + ox + x * scale + dx) * 4;
        buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; buf[o + 3] = 255;
      }
    }));
  });
  writePng(file, W, H, buf);
  return { W, H };
}
module.exports = { sheet };
