/* 把一個職業的 13 個姿勢排成一張 PNG，方便看圖。跑：node art/sheetpng.js ranger
   輸出 art/sheet_<名字>.png（不進 git，見 .gitignore）。 */
const path = require('path');
const { sheet } = require('./png.js');
const key = process.argv[2] || 'ranger';
const m = require('./' + key + '.js');
const POSES = ['idleA', 'idleB', 'walkA', 'walkB', 'sitA', 'sitB', 'sleep', 'back', 'swing', 'dash', 'win', 'pant', 'flee'];
const r = sheet(path.join(__dirname, 'sheet_' + key + '.png'), POSES.map(p => ({ px: m.frames[p], pal: m.PAL })), 5, 8);
console.log(key, r.W + 'x' + r.H, '（順序：' + POSES.join(' ') + '）');
