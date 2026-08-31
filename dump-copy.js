/* 把所有會畫到畫面上的中文字句倒出來，一次讀完。
 *
 * sweep-live.js 找的是「不該再出現的詞」；這一支不預設任何清單，
 * 純粹把文案攤開，讓人自己讀有沒有講錯、講反、或講得沒人看得懂。
 *
 *   node dump-copy.js            全部
 *   node dump-copy.js 老師        只看含「老師」的
 */
const fs = require('fs');
const SLASH = String.fromCharCode(92);

function strip(src) {
  let out = '', i = 0;
  const n = src.length;
  let inStr = 0, esc = false;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (inStr) {
      out += c;
      if (esc) esc = false;
      else if (c === SLASH) esc = true;
      else if ((inStr === 1 && c === "'") || (inStr === 2 && c === '"')) inStr = 0;
      i++; continue;
    }
    if (c === "'" || c === '"') { inStr = c === "'" ? 1 : 2; out += c; i++; continue; }
    if (c === '/' && d === '*') {
      const e = src.indexOf('*/', i + 2), stop = e < 0 ? n : e + 2;
      for (let j = i; j < stop; j++) out += src[j] === '\n' ? '\n' : ' ';
      i = stop; continue;
    }
    if (c === '/' && d === '/') {
      const e = src.indexOf('\n', i), stop = e < 0 ? n : e;
      for (let j = i; j < stop; j++) out += ' ';
      i = stop; continue;
    }
    out += c; i++;
  }
  return out;
}

const CJK = /[一-鿿]/;
const filt = process.argv[2] || '';

const live = strip(fs.readFileSync(__dirname + '/gas/Live.html', 'utf8')).split('\n');

/* 抓引號裡的中文句子。只留長度 ≥ 6 的——短的多半是標籤與狀態字。 */
const out = [];
live.forEach(function (ln, i) {
  const m = ln.match(/'[^']{6,}'|"[^"]{6,}"/g);
  if (!m) return;
  m.forEach(function (raw) {
    const txt = raw.slice(1, -1);
    if (!CJK.test(txt)) return;
    if (/^[a-z-]+:/.test(txt)) return;          /* CSS */
    if (txt.indexOf('font:') >= 0) return;
    if (txt.indexOf('px') >= 0 && txt.indexOf('，') < 0) return;
    if (filt && txt.indexOf(filt) < 0) return;
    out.push({ line: i + 1, txt: txt });
  });
});

/* 同一句只列一次 */
const seen = {};
const uniq = out.filter(function (x) {
  if (seen[x.txt]) return false;
  seen[x.txt] = 1;
  return true;
});

uniq.forEach(function (x) {
  console.log(String(x.line).padStart(5) + '  ' + x.txt);
});
console.log('\n── ' + uniq.length + ' 句 ──');
