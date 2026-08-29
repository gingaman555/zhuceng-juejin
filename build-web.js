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
  '/* ================= 試用模式 =================',
  '   免登入、可切身分、可快轉、可重來。只有展示版有這一段。 */',
  '(function () {',
  '  var DB_KEY = \'jlz.mockdb\', TOK = \'jlz.token\', ONCE = \'jlz.demo.autologin\';',
  '  var WHO = \'jlz.demo.who\';',
  '  var PEOPLE = [',
  '    { id: \'stu01\', label: \'學生 · 甲\', hue: \'#E58BA8\' },',
  '    { id: \'tea01\', label: \'老師\', hue: \'#7CC98F\' }',
  '  ];',
  '',
  '  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }',
  '  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }',
  '  function del(k) { try { localStorage.removeItem(k); } catch (e) {} }',
  '  function seeded() {',
  '    var raw = get(DB_KEY);',
  '    if (!raw) return false;',
  '    try { return !!(JSON.parse(raw).Users || []).length; } catch (e) { return false; }',
  '  }',
  '  function run(fn) {',
  '    var a = [].slice.call(arguments, 1);',
  '    return new Promise(function (res, rej) {',
  '      google.script.run.withSuccessHandler(res).withFailureHandler(rej)[fn].apply(null, a);',
  '    });',
  '  }',
  '',
  '  /* ---- 幫第一項任務補一張清單 ----',
  '     新流程整個掛在清單上：勾滿才會出現「送出之前」那一問。',
  '     種子本身不動（preview 的稽核靠它），所以補在這裡。 */',
  '  function dressUp(tk) {',
  '    return run(\'apiBootstrap\', tk).then(function (tb) {',
  '      var cid = tb.classId, defs = tb.taskDefs || [], t0 = null;',
  '      for (var i = 0; i < defs.length; i++) {',
  '        if (Number(defs[i].layer) === 1) { t0 = defs[i]; break; }',
  '      }',
  '      if (!cid || !t0) return null;',
  '      if ((t0.checks || []).length) return null;   /* 已經有清單就不要再開一張 */',
  '      /* 帶原本的 id 回去才是改寫，不帶就會多長出一項一模一樣的 */',
  '      return run(\'apiPublishList\', tk, cid, 1, [{',
  '        id: t0.id, layer: 1, type: t0.type, title: t0.title,',
  '        cond: t0.cond, note: t0.note, due: t0.due, spec: t0.spec,',
  '        mineral: t0.mineral, teams: t0.teams,',
  '        checks: [\'訪談三位使用者，留下逐字稿\',',
  '                 \'把講到的痛點整理成一頁\',',
  '                 \'寫出一句話的問題定義\']',
  '      }]);',
  '    }).catch(function () { return null; });',
  '  }',
  '',
  '  /* ---- 快轉：把所有時間戳往前挪，等於「過了 N 天」 ----',
  '     相對順序不變，所以 6 小時門檻、一天一片這些規則都會照常生效。 */',
  '  function shift(hours) {',
  '    var raw = get(DB_KEY);',
  '    if (!raw) return;',
  '    var ms = hours * 3600000;',
  '    var ISO = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}/;',
  '    var walk = function (o) {',
  '      if (!o || typeof o !== \'object\') return;',
  '      Object.keys(o).forEach(function (k) {',
  '        var v = o[k];',
  '        if (typeof v === \'string\' && ISO.test(v)) {',
  '          var d = new Date(v);',
  '          if (!isNaN(d)) o[k] = new Date(d.getTime() - ms).toISOString();',
  '        } else if (v && typeof v === \'object\') walk(v);',
  '      });',
  '    };',
  '    try { var db = JSON.parse(raw); walk(db); set(DB_KEY, JSON.stringify(db)); } catch (e) {}',
  '  }',
  '',
  '  function enter(account, then) {',
  '    run(\'apiLogin\', { account: account, password: \'pw1234\' })',
  '      .then(function (r) {',
  '        if (!r || !r.ok || !r.token) return;',
  '        set(TOK, r.token); set(WHO, account);',
  '        try { sessionStorage.setItem(ONCE, \'1\'); } catch (e) {}',
  '        if (then) { then(r.token); return; }',
  '        location.reload();',
  '      })',
  '      .catch(function () {});',
  '  }',
  '',
  '  /* ---- 工具列 ---- */',
  '  function bar() {',
  '    if (document.getElementById(\'jlz-trial\')) return;',
  '    var who = get(WHO) || \'stu01\';',
  '    var box = document.createElement(\'div\');',
  '    box.id = \'jlz-trial\';',
  '    box.style.cssText = \'position:fixed;left:10px;bottom:10px;z-index:99999;display:flex;\' +',
  '      \'align-items:center;gap:6px;flex-wrap:wrap;max-width:calc(100vw - 20px);\' +',
  '      \'padding:7px 9px;background:rgba(11,10,9,.94);border:1px solid #3A3026;\' +',
  '      "font:400 11px/1 ui-monospace,\'Cascadia Mono\',Menlo,monospace;color:#8A8073;" +',
  '      \'box-shadow:0 6px 24px rgba(0,0,0,.5)\';',
  '',
  '    var tag = document.createElement(\'span\');',
  '    tag.textContent = \'試用\';',
  '    tag.style.cssText = \'letter-spacing:.18em;color:#5F574C;padding-right:3px\';',
  '    box.appendChild(tag);',
  '',
  '    var mk = function (label, hue, on, title) {',
  '      var b = document.createElement(\'button\');',
  '      b.textContent = label;',
  '      if (title) b.title = title;',
  '      b.style.cssText = \'padding:5px 9px;background:transparent;border:1px solid \' + hue + \';\' +',
  '        \'color:\' + hue + \';font:inherit;cursor:pointer\';',
  '      b.onclick = on;',
  '      box.appendChild(b);',
  '      return b;',
  '    };',
  '',
  '    PEOPLE.forEach(function (pp) {',
  '      var here = pp.id === who;',
  '      var b = mk(pp.label, here ? pp.hue : \'#4A4238\', function () {',
  '        if (here) return;',
  '        enter(pp.id);',
  '      }, here ? \'現在就是這個身分\' : \'換成這個身分\');',
  '      if (here) b.style.background = \'rgba(255,255,255,.05)\';',
  '    });',
  '',
  '    mk(\'快轉一天\', \'#8A8073\', function () { shift(24); location.reload(); },',
  '       \'把所有紀錄往前挪一天。★ 回掘要隔 6 小時、日誌一天一片，靠這個才試得到。\');',
  '',
  '    mk(\'重來\', \'#D9603F\', function () {',
  '      if (!window.confirm(\'把這份試用紀錄整個清掉，重新開始？\')) return;',
  '      del(DB_KEY); del(TOK); del(WHO);',
  '      try { sessionStorage.removeItem(ONCE); } catch (e) {}',
  '      location.reload();',
  '    }, \'清掉所有紀錄，回到剛進來的樣子。\');',
  '',
  '    document.body.appendChild(box);',
  '  }',
  '',
  '  /* ---- 開機 ---- */',
  '  var tries = 0;',
  '  (function go() {',
  '    if (typeof SEED !== \'function\' || !window.google || !window.google.script || !document.body) {',
  '      if (++tries < 120) setTimeout(go, 100);',
  '      return;',
  '    }',
  '    bar();',
  '    if (get(TOK)) return;                       /* 有身分了就讓 app 自己續登 */',
  '    try { if (sessionStorage.getItem(ONCE)) return; } catch (e) {}',
  '    var first = function () {',
  '      /* 先用老師身分把清單補上，再換成學生進去 */',
  '      run(\'apiLogin\', { account: \'tea01\', password: \'pw1234\' })',
  '        .then(function (r) { return (r && r.token) ? dressUp(r.token) : null; })',
  '        .then(function () { enter(\'stu01\'); })',
  '        .catch(function () { enter(\'stu01\'); });',
  '    };',
  '    if (seeded()) first();',
  '    else SEED().then(first).catch(function () {});',
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
