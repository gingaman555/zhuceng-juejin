/* 把 src/ 依檔名順序併成一份 index.html。

   這不是上一版那種「原型不能動 ＋ 執行期覆寫」的產出鏈——沒有補丁、
   沒有覆寫層，併起來的每一段都是可以直接改的原始碼。純粹是為了讓
   index.html 是一個檔案，點兩下就開得起來。 */

const fs = require('fs');
const path = require('path');

/* ---------- 一份原始碼，好幾個站 ----------

   要跑第二個班、或要跑一個對照組的時候，需要的是同一份作品配上
   **另一份資料**。同一個 Firebase 專案底下可以開好幾個 Hosting 站
   （每一個有自己的網址），可是它們共用同一個 Firestore——所以資料
   要靠 SYNC_ROOT 分開（見 41-sync.js：那是雲端每一筆掛在哪一個
   文件底下）。

   兩個站的資料因此完全看不到對方：不同的班、不同的組、不同的紀錄，
   而且匯出來是兩個獨立的檔案。

   ── 順便：研究條件 ──

   rules 那一欄是「這個站上，哪幾條規則跟主站不一樣」。要跑一個
   沒有協商的對照組，寫 { NEGOTIATE: 0 } 就好——原始碼一份，
   差別只在這張表上，而那張表本身就是「這次研究改了什麼」的紀錄。

   跑法：
     node build.js            主站　　v2/index.html
     node build.js b          第二站　v2/b/index.html
*/
const SITES = {
  main: {
    title: '專案地下城',
    root: 'world/v1/', out: '.', rules: {}
  },
  b: {
    title: '專案地下城 B',
    root: 'world/v2/', out: 'b',
    /* 這一站不分組：一個人就是一組（見 20-rules.js 的 RULES.SOLO）。

       **除了這一條，其餘一律跟主站一模一樣**——協商、水晶的刻度、
       圖鑑的價錢，一個字都沒有動。兩站只差一個變項，那份資料才比得
       出東西；動第二個變項的那一刻，兩邊的差別就再也說不清是哪一個
       造成的。 */
    rules: { SOLO: 1 }
  }
};
const 站 = SITES[process.argv[2] || 'main'];
if (!站) {
  console.error('沒有這個站。有的是：' + Object.keys(SITES).join('、'));
  process.exit(1);
}

const SRC = path.join(__dirname, 'src');
const files = fs.readdirSync(SRC).filter(f => /\.(js|css)$/.test(f)).sort();

const css = files.filter(f => f.endsWith('.css'))
  .map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
let js = files.filter(f => f.endsWith('.js'))
  .map(f => '/* ===== ' + f + ' ===== */\n' + fs.readFileSync(path.join(SRC, f), 'utf8'))
  .join('\n\n');

/* 這一次 build 的時間戳，接在最前面。

   2026-09-23：一台分頁開很久（一整堂課、甚至好幾天）之後，即使
   之後又 deploy 過新的一版、修過同步的 bug，那台分頁還是跑著它
   一開始載進來的那份舊程式碼——伺服器端怎麼改都救不了它，
   只有它自己重新整理過才會拿到新的。BUILD_AT 就是讓它自己發現
   「我手上這份是舊的」的那個號碼牌（見 55-newver.js 怎麼用它）。 */
js = 'var BUILD_AT = ' + Date.now() + ';\n\n' + js;

/* 這一個站的資料掛在哪。改的是那一行字面量本身，不是在後面再賦值一次
   ——後面再賦值一次的話，原始碼裡就有兩個 SYNC_ROOT，而下一個讀的人
   看不出哪一個算數。 */
if (站.root !== 'world/v1/') {
  const 舊 = "var SYNC_ROOT = 'world/v1/';";
  if (js.split(舊).length - 1 !== 1) {
    console.error('找不到 SYNC_ROOT，第二個站的資料不會分開。停。');
    process.exit(1);
  }
  js = js.replace(舊, "var SYNC_ROOT = '" + 站.root + "';　/* 這一個站自己的資料 */");
}

/* 這一個站跟主站不一樣的那幾條規則。

   ── 接在哪裡很重要 ──

   本來接在整包 JS 的**最後面**。那是錯的：80-app.js 在那之前就把系統
   開起來了（load() 不成就 seed()），所以種示範資料的時候 RULES.SOLO
   還是 0——B 站的示範資料因此一直是六組每組兩人，而使用者第一眼看到
   的就是那個。

   這種錯很難自己發現：檢查工具是直接 eval 整包再自己設 RULES.SOLO，
   所以它們永遠測到對的那一邊。是使用者開網頁才看到的。

   所以插在 20-rules.js **後面**、其餘所有檔案之前——那時候 RULES 這個
   物件剛定義好，而還沒有任何一支程式跑起來。 */
const 改 = Object.keys(站.rules || {});
if (改.length) {
  const 那一段 = '\n\n/* ===== 這一個站的研究條件（見 build.js 的 SITES） ===== */\n' +
    改.map(function (k) {
      return 'RULES.' + k + ' = ' + JSON.stringify(站.rules[k]) + ';';
    }).join('\n') + '\n';
  /* 20-rules.js 那一段結束的地方＝下一個檔案的標頭。 */
  const 後 = files.filter(function (f) { return f.endsWith('.js'); })
    .filter(function (f) { return f > '20-rules.js'; })[0];
  const 位 = 後 ? js.indexOf('/* ===== ' + 後 + ' ===== */') : -1;
  if (位 < 0) {
    console.error('找不到 20-rules.js 後面那個接點。停——' +
      '接錯地方等於這個站的設定沒生效，而那不會報錯。');
    process.exit(1);
  }
  js = js.slice(0, 位) + 那一段 + '\n' + js.slice(位);
}

const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${站.title || '專案地下城'}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="preload" as="font" type="font/woff2" crossorigin href="https://cdn.jsdelivr.net/gh/ACh-K/Cubic-11@v1.500/fonts/web/Cubic_11.woff2">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500&display=swap" rel="stylesheet">
<style>
@font-face{font-family:'C11';src:url('https://cdn.jsdelivr.net/gh/ACh-K/Cubic-11@v1.500/fonts/web/Cubic_11.woff2') format('woff2');font-weight:100 900;font-display:block}
${css}
</style>
</head>
<body>
<div id="app"></div>
<!-- Firebase。這三支是 Hosting 自己就會發的路徑（/__/firebase/…），
     所以原始碼裡不用貼任何金鑰，init.js 會自己帶這個專案的設定。
     用 file:// 點開的時候這三支會 404，那時候 41-sync.js 整層
     自動關掉，單機那條路一步都沒有變。 -->
<script src="/__/firebase/10.14.1/firebase-app-compat.js"></script>
<script src="/__/firebase/10.14.1/firebase-firestore-compat.js"></script>
<script src="/__/firebase/init.js"></script>
<script>
${js}
</` + `script>
</body>
</html>
`;

/* ── 這個站的設定真的在開機之前嗎 ──

   設定要是接在開機之後，這個站就會安靜地跑成主站的樣子——不會報錯、
   每一頁都畫得出來、檢查工具也全過（它們是直接 eval 整包再自己設
   RULES，永遠測到對的那一邊）。只有真的開網頁才看得到。

   所以在這裡驗一次：那幾行的位置一定要在 80-app.js 那一句開機之前。 */
if (改.length) {
  const 設 = js.indexOf('RULES.' + 改[0] + ' =');
  const 開 = js.indexOf('if (!load()');
  if (設 < 0 || 開 < 0 || 設 > 開) {
    console.error('這個站的設定接在開機之後（設 ' + 設 + '、開機 ' + 開 + '）。停。');
    console.error('接在那裡等於沒生效，而且不會有任何東西報錯。');
    process.exit(1);
  }
}

const 出 = path.join(__dirname, 站.out);
if (!fs.existsSync(出)) fs.mkdirSync(出, { recursive: true });
fs.writeFileSync(path.join(出, 'index.html'), html);
console.log(path.join('v2', 站.out, 'index.html').replace(/\\/g, '/'),
  (html.length / 1024).toFixed(0) + 'KB', '·', files.length, '個原始檔',
  '·', '資料掛在 ' + 站.root +
  (改.length ? '　·　改了 ' + 改.join('、') : ''));
