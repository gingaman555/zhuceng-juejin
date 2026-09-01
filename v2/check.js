/* 殘留檢查。build 之後跑：node v2/check.js

   這一支守的是「這個作品明確不要的東西」。拿掉一個概念之後，字常常還留著，
   靠人一頁一頁讀不會有終點。

   只掃 index.html 裡畫得出來的字（字串常數與 HTML 文字），不掃註解：
   註解裡本來就會提到「分數拿掉了」這種話。 */

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let src = fs.readFileSync(file, 'utf8');

/* 註解整段拿掉——那裡本來就在講「什麼被拿掉了」 */
const scan = src.replace(/\/\*[\s\S]*?\*\//g, ' ');

/* ---------- 一 · 不該出現的字 ----------
   《專案地下城》不用分數評斷、不排名、不通知逾期。
   這些詞一旦出現在畫面上，SDT 那三根柱子就有一根塌了。 */
const BANNED = [
  /* 勝任感：判定的是預估準度，不是作業好壞 */
  ['分數', '這個系統不給分。判定的是預估準度，不是作業好壞'],
  ['得分', '同上'],
  ['總分', '同上'],
  ['等第', '同上'],
  ['評分', '老師發的是裝備，不是評分'],
  ['扣分', '失準不扣任何東西——那是除罪化拖延的前提'],
  /* 關聯性：平行陪伴，不是競爭 */
  ['排行榜', '捨棄排名，改成全班地下城生態圖'],
  ['名次', '同上'],
  ['第 1 名', '同上'],
  ['領先', '同上'],
  ['落後', '同上——別人挖到哪不是你的參照點'],
  ['贏過', '同上'],
  /* 自主性：期限是自己承諾的，不是被規定的 */
  ['死線', '期限由學生自己拉滑桿決定，那是承諾不是死線'],
  ['逾期', '系統不發逾期通知。停滯用畫面暗下來表示'],
  ['遲交', '同上'],
  ['催繳', '同上'],
  ['已過期', '同上'],
  /* 上一版留下的概念 */
  ['礦石', '上一個作品的東西'],
  ['圖鑑', '這個作品沒有收集系統'],
  ['掉落物', '同上'],
  ['守關生物', '這裡的魔物是里程碑，不是關卡'],
  ['放行', '老師不放行，他發裝備'],
  ['學期第', '預設了一個學生沒有的行事曆'],
  ['甘特', '沒有排程表'],
  ['怎麼用這一頁', '要看說明才會用，就表示那一頁沒寫好']
];

/* 畫面代號不可以露在標題上 */
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
  console.error('畫面代號　S-01／T-02 這種不可以露在標題上');
}

/* ---------- 二 · 講規則的句子要從 RULES 組出來 ----------
   規則改了，句子要跟著變，不能只是變成謊話。 */
const HARDCODED = [
  ['誤差 1 天以內算準', 'RULES.judgeWhy()'],
  ['容許誤差 20', 'RULES.band()'],
  ['一天一格', '（這句可以寫死，它是設計本身）']
];
HARDCODED.slice(0, 2).forEach(([w, use]) => {
  if (scan.indexOf("'" + w) >= 0 || scan.indexOf('"' + w) >= 0) {
    bad++;
    console.error('寫死的規則句　' + w + '　——改用 ' + use);
  }
});

/* ---------- 三 · 判定不可以看作業好壞 ----------
   judge 只准拿到兩個數字：承諾幾天、實際幾天。
   一旦它讀到品質相關的欄位，「勝任感」那根柱子就倒了。 */
const judgeFn = src.match(/RULES\.judge\s*=\s*function[\s\S]*?\n\};/);
if (!judgeFn) {
  bad++;
  console.error('找不到 RULES.judge——判定邏輯不見了');
} else {
  ['quality', 'score', 'grade', 'rank', 'gear', 'word', 'snag']
    .forEach(function (w) {
      if (new RegExp('\\b' + w + '\\b').test(judgeFn[0])) {
        bad++;
        console.error('RULES.judge 讀到了「' + w + '」　——判定只能看承諾天數與實際天數');
      }
    });
}

/* ---------- 四 · 生態圖不可以排序 ----------
   ecology() 回傳的順序就是畫出來的順序。一旦它 sort，那就是排行榜。 */
const ecoFn = src.match(/function ecology[\s\S]*?\n\}/);
if (ecoFn && /\.sort\(/.test(ecoFn[0])) {
  bad++;
  console.error('ecology 在排序　——生態圖不排名，順序照名冊就好');
}

/* ---------- 五 · 推進一天只能一次 ---------- */
if (!/function pushedToday/.test(src)) {
  bad++;
  console.error('找不到 pushedToday——「一天一格」的守門不見了');
}

if (bad) {
  console.error('\n' + bad + ' 項殘留。');
  process.exit(1);
}
console.log('殘留檢查通過：' + BANNED.length + ' 個禁用詞、畫面代號、寫死的規則句、' +
  '判定的純度、生態圖不排序、一天一格，都守住了。');
