/* 窮盡掃描：把所有「會畫到畫面上的字」抓出來，對著現在的概念檢查。
 *
 * 跟 check-stale.js 的差別：那一支比對的是固定的禁用詞清單；這一支反過來，
 * 把 Live.html 裡每一個中文字串常數列出來，讓漏網的舊說法無所遁形。
 *
 *   node sweep-live.js            只列有問題的
 *   node sweep-live.js --all      連通過的也列
 */
const fs = require('fs');
const R = __dirname + '/';
const SLASH = String.fromCharCode(92);

/* 現在已經不成立的概念。左邊是字，右邊是為什麼不該再出現。 */
const DEAD = [
  ['礦石', '礦石整套拿掉了'],
  ['礦脈', '同上'],
  ['礦物', '同上'],
  ['採齊', '同上'],
  ['採到', '同上'],
  ['幾塊', '同上——計數改看任務'],
  ['塊礦', '同上'],
  ['物證', '同上'],
  ['環節 · ', '同上'],
  ['第幾週', '週的概念拿掉了'],
  ['學期第', '同上'],
  ['總週數', '同上'],
  ['學期走了', '同上'],
  ['停留週數', '改成停留天數'],
  ['停留 ≥ 3 週', '同上'],
  ['過不過得完', '採齊那一版的說法'],
  ['全數通過', '同上'],
  ['送關卡', '學生不送申請'],
  ['送交關卡', '同上'],
  ['工具校準', '整套拿掉了'],
  ['校準', '同上'],
  ['第五層', '只有四層'],
  ['五個週期', '四個階段'],
  ['甘特', '那一頁拿掉了'],
  ['怎麼用這一頁', '說明頁全部拿掉了'],
  ['逐層掘進', '改名地心圖鑑'],
  ['勾回來', '送出前的回掘拿掉了'],
  ['打開一條', '同上'],
  ['做紮實', '同上'],
  ['宣告', '宣告破法拿掉了'],
  ['破法', '同上'],
  ['試挖', '拿掉了'],
  ['空冠', '第五層沒了'],
  ['1–5', '評分改成 0–5'],
  ['1-5', '同上'],
  /* 把努力講成沒差的說法。想講的是「數量不是門檻」，
     但學生讀到的是「你做多少都無所謂」。 */
  ['做幾項不', '把努力講成沒差'],
  ['過幾項不', '同上'],
  ['開幾項都不影響', '同上'],
  ['拿幾塊都不影響', '同上'],
];

const MARK = '舊詞OK';

/* 把註解塗白，行號留著 */
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

/* 標了舊詞OK 的行整行跳過。曾經試著只放行「比對用的舊字」那一半，
   但語法有太多種（.split()、陣列對照、=== 比較、SPRITE[鍵]），每加一種
   就多一個漏洞。真正的風險是「新字那一半自己過期了」——那個用眼睛抓，
   所以下面會把所有標過的行列出來，定期看一遍。 */

const liveRaw = fs.readFileSync(R + 'gas/Live.html', 'utf8');
const tplRaw = fs.readFileSync(R + 'build_tpl_live.txt', 'utf8');
const live = strip(liveRaw).split('\n');
const liveOrig = liveRaw.split('\n');
const tpl = tplRaw.split('<!--').map(function (x, i) {
  return i ? x.slice(x.indexOf('-->') + 3) : x;
}).join(' ').split('\n');

const all = process.argv.indexOf('--all') >= 0;
let bad = 0;

console.log('窮盡掃描 · 會畫到畫面上的字\n');
DEAD.forEach(function (pair) {
  const word = pair[0], why = pair[1];
  const hits = [];
  live.forEach(function (ln, i) {
    if (ln.indexOf(word) < 0) return;
    if ((liveOrig[i] || '').indexOf(MARK) >= 0) return;
    hits.push('  Live:' + (i + 1) + '  ' + ln.trim().slice(0, 92));
  });
  tpl.forEach(function (ln, i) {
    if (ln.indexOf(word) < 0) return;
    hits.push('  模板:' + (i + 1) + '  ' + ln.trim().slice(0, 92));
  });
  if (!hits.length) { if (all) console.log('  ✓ 「' + word + '」乾淨'); return; }
  bad += hits.length;
  console.log('✗ 「' + word + '」×' + hits.length + '　—— ' + why);
  hits.slice(0, 10).forEach(function (x) { console.log(x); });
  if (hits.length > 10) console.log('  …還有 ' + (hits.length - 10) + ' 處');
  console.log('');
});

if (process.argv.indexOf('--marked') >= 0) {
  console.log('\n標了「舊詞OK」的行（比對用的舊字必須留著，但要定期確認新字那一半沒過期）：\n');
  liveOrig.forEach(function (ln, i) {
    if (ln.indexOf(MARK) < 0) return;
    console.log('  Live:' + (i + 1) + '  ' + ln.trim().slice(0, 120));
  });
}

console.log(bad ? '\n── ' + bad + ' 處要處理 ──' : '\n── 乾淨 ──');
process.exit(bad ? 1 : 0);
