/* 殘留檢查。build 之後跑：node v2/check.js

   規格書 06「明確不要的」那一節列的東西，都是做過又拿掉的。
   拿掉之後字常常還留著，靠人一頁一頁讀不會有終點——這一支負責擋。

   只掃 index.html 裡畫得出來的字（字串常數與 HTML 文字），不掃註解：
   註解裡本來就會提到「礦石拿掉了」這種話。 */

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let src = fs.readFileSync(file, 'utf8');

/* 註解整段拿掉——那裡本來就在講「什麼被拿掉了」 */
const scan = src.replace(/\/\*[\s\S]*?\*\//g, ' ');

const BANNED = [
  ['礦石', '寫死的 16 塊清單，是任務數上限的來源'],
  ['礦脈', '同上；羅盤已經改叫辨向羅盤'],
  ['物證', '同一族的東西'],
  ['學期總週數', '預設了一個學生沒有的行事曆'],
  ['學期第', '同上'],
  ['第 1-2 週', '課程階段不再標週'],
  ['工具校準', '道具現在只有兩件事：通過一層的證明、500 分'],
  ['採齊', '唯一的門是老師放行'],
  ['全數通過', '同上'],
  ['關卡申請', '學生沒有這個動作'],
  ['送出申請', '同上'],
  ['甘特', '排程從任務頁拿掉了'],
  ['宣告破法', '把做紮實講成投機'],
  ['破法', '同上'],
  ['怎麼用這一頁', '要看說明才會用，就表示那一頁沒寫好'],
  ['第五層', '只有四層'],
  ['星核聖殿', '同上'],
  ['空冠', '同上'],
  ['做幾項不影響', '學生讀到的是「你做多少都無所謂」'],
  ['過幾項不決定', '同上'],
  ['開幾項都不影響', '同上'],
  ['這一層做完了', '這一層沒有「做完」這個狀態'],
  ['這一層的任務都過了', '同上']
];

/* 畫面代號不可以露在標題上（S-01／T-02／C-03） */
const CODE = /(^|[^A-Za-z])[STC]-\d{2}([^A-Za-z]|$)/;

let bad = 0;

BANNED.forEach(([w, why]) => {
  const i = scan.indexOf(w);
  if (i < 0) return;
  bad++;
  console.error('禁用詞　' + w + '　——' + why);
  console.error('　　' + scan.slice(Math.max(0, i - 40), i + 40).replace(/\s+/g, ' '));
});

if (CODE.test(scan)) {
  bad++;
  console.error('畫面代號　S-01／T-02 這種只留在研究頁，不可以露在標題上');
}

/* 講規則的句子必須是從 RULES 組出來的。這裡擋的是有人回頭把數字寫死。 */
const HARDCODED = [
  ['通過一項 ＋100 分', 'RULES.say.pass()'],
  ['掉落物一件 ＋30 分', 'RULES.say.drop()'],
  ['＋1000 分（道具 500', 'RULES.say.release()']
];
HARDCODED.forEach(([w, use]) => {
  /* 出現在字串常數裡（前後緊貼引號）才算寫死；由數字組出來的不會長這樣 */
  if (scan.indexOf("'" + w) >= 0 || scan.indexOf('"' + w) >= 0) {
    bad++;
    console.error('寫死的規則句　' + w + '　——改用 ' + use);
  }
});

/* 戰利品是「挑」的，不是「發」的。
   反過來做（因為重交了三次所以發給你斷柄鑿）那一秒，它就從一句話變成一個評價——
   所以這裡擋兩件事：舊的發放函式不可以回來，攤牌的那一支不可以看到任何表現資料。 */
if (/\brollTrophy\b/.test(src)) {
  bad++;
  console.error('rollTrophy 回來了　——戰利品改成 offerTrophies：攤開 3 件讓學生自己挑');
}
var fn = src.match(/function offerTrophies\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
if (!fn) {
  bad++;
  console.error('找不到 offerTrophies——戰利品的攤牌邏輯不見了');
} else {
  ['gave', 'score', 'rounds', 'attempt', 'finds', 'sentBack', 'latency', 'effort']
    .forEach(function (w) {
      if (new RegExp('\\b' + w + '\\b').test(fn[0])) {
        bad++;
        console.error('offerTrophies 讀到了「' + w + '」　——攤開哪幾件不可以跟表現有關，' +
          '那一秒它就變成評價');
      }
    });
}

/* 四層以外的層數 */
if (/L5|第 5 層|五層/.test(scan)) { bad++; console.error('出現了第五層'); }

if (bad) {
  console.error('\n' + bad + ' 項殘留。');
  process.exit(1);
}
console.log('殘留檢查通過：' + BANNED.length + ' 個禁用詞、畫面代號、寫死的規則句都沒有出現。');
