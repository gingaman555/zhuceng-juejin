/* 把 src/ 依檔名順序併成一份 index.html。

   這不是上一版那種「原型不能動 ＋ 執行期覆寫」的產出鏈——沒有補丁、
   沒有覆寫層，併起來的每一段都是可以直接改的原始碼。純粹是為了讓
   index.html 是一個檔案，點兩下就開得起來。 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const files = fs.readdirSync(SRC).filter(f => /\.(js|css)$/.test(f)).sort();

const css = files.filter(f => f.endsWith('.css'))
  .map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
const js = files.filter(f => f.endsWith('.js'))
  .map(f => '/* ===== ' + f + ' ===== */\n' + fs.readFileSync(path.join(SRC, f), 'utf8'))
  .join('\n\n');

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

fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('v2/index.html', (html.length / 1024).toFixed(0) + 'KB', '·', files.length, '個原始檔');
