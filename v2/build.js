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
  main: { root: 'world/v1/', out: '.',  rules: {} },
  b:    { root: 'world/v2/', out: 'b',  rules: {} }
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

/* 這一個站跟主站不一樣的那幾條規則。接在最後面，所以它蓋得過
   20-rules.js 裡的預設值，而且看得出來是「這一個站改的」。 */
const 改 = Object.keys(站.rules || {});
if (改.length) {
  js += '\n\n/* ===== 這一個站的研究條件 ===== */\n' +
    改.map(function (k) {
      return 'RULES.' + k + ' = ' + JSON.stringify(站.rules[k]) + ';';
    }).join('\n') + '\n';
}

const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>專案地下城</title>
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

const 出 = path.join(__dirname, 站.out);
if (!fs.existsSync(出)) fs.mkdirSync(出, { recursive: true });
fs.writeFileSync(path.join(出, 'index.html'), html);
console.log(path.join('v2', 站.out, 'index.html').replace(/\\/g, '/'),
  (html.length / 1024).toFixed(0) + 'KB', '·', files.length, '個原始檔',
  '·', '資料掛在 ' + 站.root +
  (改.length ? '　·　改了 ' + 改.join('、') : ''));
