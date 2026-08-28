/* 產生 public/：丟上 Firebase Hosting 的兩份頁面。

   public/index.html       正式版——後端走 /api（Hosting 轉給 Cloud Function），
                           資料庫是 Firestore，檔案在 Cloud Storage。
   public/demo/index.html  展示版——假後端跑在瀏覽器裡，每個訪客自己一份沙盒，
                           點連結就能走完整套流程，不會碰到正式資料。

   兩份都是同一支程式，差別只在 window.JLZ_API 有沒有被設起來。 */

const fs = require('fs');
const path = require('path');

const OUT = 'public';
const DEMO = path.join(OUT, 'demo');
[OUT, DEMO].forEach((d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const src = fs.readFileSync('preview/index.html', 'utf8');
const seed = fs.readFileSync('preview/dev/seed.js', 'utf8');

const SEED_TAG = '<script src="/preview/dev/seed.js"></script>';
const MOCK_MARK = '/* 本機預覽用的假後端';
if (src.indexOf(SEED_TAG) < 0) {
  console.error('MISS：preview/index.html 裡找不到 seed 標籤，先跑 node build-gas.js');
  process.exit(1);
}

const tag = (body) => '<' + 'script>\n' + body + '\n</' + 'script>';

/* ---------- 正式版：拔掉假後端，接上 /api ---------- */

let live = src;

/* 假後端整段拿掉——正式版不該把它帶上線 */
const a = live.indexOf(MOCK_MARK);
if (a < 0) { console.error('MISS：找不到假後端區塊'); process.exit(1); }
const open = live.lastIndexOf('<' + 'script>', a);
const close = live.indexOf('</' + 'script>', a);
if (open < 0 || close < 0) { console.error('MISS：假後端區塊邊界抓不到'); process.exit(1); }
live = live.slice(0, open) + live.slice(close + ('</' + 'script>').length);

live = live.replace(SEED_TAG, tag([
  '/* Hosting 會把 /api 轉給 asia-east1 的 Cloud Function，所以同源、不用處理 CORS */',
  'window.JLZ_API = "/api";'
].join('\n')));

fs.writeFileSync(path.join(OUT, 'index.html'), live);

/* ---------- 展示版：留著假後端，第一次進來自動灌一班 ---------- */

const demo = src.replace(SEED_TAG, tag([
  seed,
  '/* 展示版：資料庫是空的就先灌一班，然後直接用學生身分進去。 */',
  '/* 試用不用登入——登入頁跟開頭故事都跳過，一進來就是主流程。 */',
  '(function () {',
  '  var DB_KEY = "jlz.mockdb", TOK = "jlz.token", ONCE = "jlz.demo.autologin";',
  '  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }',
  '  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }',
  '  function seeded() {',
  '    var raw = get(DB_KEY);',
  '    if (!raw) return false;',
  '    try { return !!(JSON.parse(raw).Users || []).length; } catch (e) { return false; }',
  '  }',
  '  /* 已經有身分了就讓 app 自己接手（它會走 apiResume，直接落在首頁） */',
  '  if (get(TOK)) return;',
  '  /* 只自動登入一次。萬一 token 一直失效，不要變成無限重載。 */',
  '  try { if (sessionStorage.getItem(ONCE)) return; } catch (e) {}',
  '  var tries = 0;',
  '  (function go() {',
  '    if (typeof SEED !== "function" || !window.google || !window.google.script) {',
  '      if (++tries < 80) setTimeout(go, 100);',
  '      return;',
  '    }',
  '    var enter = function () {',
  '      google.script.run',
  '        .withSuccessHandler(function (r) {',
  '          if (!r || !r.ok || !r.token) return;',
  '          set(TOK, r.token);',
  '          try { sessionStorage.setItem(ONCE, "1"); } catch (e) {}',
  '          location.reload();',
  '        })',
  '        .withFailureHandler(function () {})',
  '        .apiLogin({ account: "stu01", password: "pw1234" });',
  '    };',
  '    if (seeded()) enter();',
  '    else SEED().then(enter).catch(function () {});',
  '  })();',
  '})();'
].join('\n')));

fs.writeFileSync(path.join(DEMO, 'index.html'), demo);

fs.writeFileSync(path.join(OUT, '404.html'),
  '<title>逐層掘進</title>\n<meta http-equiv="refresh" content="0; url=/">\n');

const kb = (p) => Math.round(fs.statSync(p).size / 1024) + ' KB';
console.log('built:');
console.log('  ' + OUT + '/index.html      ' + kb(path.join(OUT, 'index.html')) + '   正式版（/api → Firestore）');
console.log('  ' + DEMO + '/index.html  ' + kb(path.join(DEMO, 'index.html')) + '   展示版（瀏覽器內假後端）');
