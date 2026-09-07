/* 每一頁都畫得出來嗎。跑：node v2/pages.js

   為什麼要有這一支：

   check.js 掃的是字（禁用詞、殘留的舊講法），loop.js 跑的是資料層
   （狀態機、不變量）。兩支都不碰畫面——所以我砍死碼的時候把
   PAGES.eco 整個帶走了，兩支照樣全綠，而使用者點「全班地下城」
   點不進去。同一週還發生過一次：bld: 被砍掉，那三張卡照樣畫得出來，
   只是按下去什麼都不會發生。

   這一支補的就是那個洞：把每一個角色的每一頁真的叫一次，
   而且把畫面上每一個「按了會換頁」的目標對回 PAGES。

   它不看畫面長得漂不漂亮——那要用眼睛。它只保證：
   點得到的地方，後面真的有東西。 */

const fs = require('fs');
const path = require('path');

/* ---------- 夠用的假瀏覽器 ---------- */
let MEM = {};
global.localStorage = {
  getItem: function (k) { return MEM[k] == null ? null : MEM[k]; },
  setItem: function (k, v) { MEM[k] = String(v); },
  removeItem: function (k) { delete MEM[k]; }
};
const stubEl = {
  value: '', innerHTML: '', textContent: '', className: '', style: {},
  scrollLeft: 0, scrollTop: 0, scrollWidth: 0, clientWidth: 0,
  offsetWidth: 0, offsetHeight: 0,
  getAttribute: function () { return null; },
  setAttribute: function () {},
  addEventListener: function () {},
  removeEventListener: function () {},
  appendChild: function () {},
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  getBoundingClientRect: function () {
    return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  },
  classList: { add: function () {}, remove: function () {}, toggle: function () {} },
  scrollIntoView: function () {}
};
global.document = {
  /* 回一個假元素而不是 null：載入的時候有程式碼直接寫 #app 的 innerHTML。
     querySelector 仍然回 null——那幾支的寫法都是「找得到才做」。 */
  getElementById: function () { return Object.create(stubEl); },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  createElement: function () { return Object.create(stubEl); },
  addEventListener: function () {},
  body: Object.create(stubEl),
  documentElement: Object.create(stubEl)
};
global.window = global;
global.innerWidth = 1440;
global.innerHeight = 900;
global.scrollTo = function () {};
global.requestAnimationFrame = function () { return 0; };
global.cancelAnimationFrame = function () {};
global.setTimeout = function () { return 0; };
global.clearTimeout = function () {};
global.getComputedStyle = function () { return { fontSize: '11px' }; };
global.matchMedia = function () { return { matches: false, addListener: function () {} }; };

/* ---------- 載入全部原始檔，順序照檔名（跟 build.js 一樣） ---------- */
const SRC = path.join(__dirname, 'src');
const files = fs.readdirSync(SRC).filter(function (f) { return f.endsWith('.js'); }).sort();
const code = files.map(function (f) {
  return fs.readFileSync(path.join(SRC, f), 'utf8');
}).join(String.fromCharCode(10));

let bad = 0;
function fail(msg) { bad++; console.error('  ✗ ' + msg); }
function ok(msg) { console.log('  ✓ ' + msg); }

try {
  eval(code);
} catch (e) {
  console.error('原始檔載不起來：' + e.message);
  process.exit(1);
}

/* ---------- 一 · 畫面上按得到的頁，PAGES 裡真的有 ---------- */
const built = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const wanted = {};
let m;
const reGo = /data-go="([a-z]+)"/g;
while ((m = reGo.exec(built))) wanted[m[1]] = 1;
const reAct = /'go:([a-z]+)/g;
while ((m = reAct.exec(built))) wanted[m[1]] = 1;
const missing = Object.keys(wanted).filter(function (k) { return !PAGES[k]; });
if (missing.length) {
  missing.forEach(function (k) { fail('按得到「' + k + '」，但是 PAGES 裡沒有這一頁'); });
} else {
  ok('按得到的每一頁都存在（' + Object.keys(wanted).length + ' 頁）');
}

/* ---------- 二 · 每一個角色的每一頁都畫得出來 ---------- */
seed();
const ROLE_USER = {};
DB.Users.forEach(function (u) { if (!ROLE_USER[u.role]) ROLE_USER[u.role] = u; });

let drawn = 0;
Object.keys(ROLE_USER).forEach(function (role) {
  const u = ROLE_USER[role];
  S.who = u.userId;
  DB.Session = { userId: u.userId, at: Date.now() };
  Object.keys(PAGES).forEach(function (p) {
    if (!allowed(u, p)) return;
    S.page = p;
    /* 有幾頁要一個 id 才畫得出來（判定、封存、審核…）。
       給它一筆這個角色真的碰得到的資料。 */
    S.p = pickParam(p, u);
    DRAFT = {};
    let out;
    try {
      out = PAGES[p]();
    } catch (e) {
      fail(role + ' 的「' + p + '」畫到一半炸了：' + e.message);
      return;
    }
    if (typeof out !== 'string') {
      fail(role + ' 的「' + p + '」沒有回傳字串');
      return;
    }
    if (!out.trim()) { fail(role + ' 的「' + p + '」畫出來是空的'); return; }
    drawn++;
  });
});
if (!bad) ok('每一個角色的每一頁都畫得出來（' + drawn + ' 次）');
/* ---------- 三 · 每一顆按鈕後面真的有一個動作 ----------

   2026-09-04 補的。前門五顆按鈕（登入、建立帳號、開班、建隊、加入）
   曾經整組是死的：ACTS 裡的那幾支被連坐刪掉，而畫面完全正常——
   按鈕畫得出來、長得像按鈕、點下去沒有任何事發生，也不報錯。

   上面第一項只看 go:X 那種「換頁」的按鈕，第二項只看頁畫不畫得出來。
   「按下去會做事」的那一種，兩項都沒有在看。

   門口那幾頁還得另外叫一次：它們在登入之前，不在角色迴圈裡。 */
const GATE = ['gate', 'login', 'reg', 'mkclass', 'myteam'];
const outs = [];

function grab(tag, p) {
  S.page = p; S.p = null; DRAFT = {};
  try { outs.push([tag, PAGES[p]()]); }
  catch (e) { fail(tag + '畫到一半炸了：' + e.message); }
}

/* 門口：還沒登入的時候 */
S.who = null; DB.Session = null;
GATE.forEach(function (p) { grab('沒登入看「' + p + '」', p); });

/* 門口：登進來了、但還沒有隊的那一種人 */
const solo = DB.Users.filter(function (u) {
  return u.role === 'student' && !u.teamId;
})[0];
if (solo) {
  S.who = solo.userId; DB.Session = { userId: solo.userId, at: Date.now() };
  GATE.forEach(function (p) { grab('還沒組隊的人看「' + p + '」', p); });
}

/* 每一個角色的每一頁再走一次——這次把 HTML 收起來 */
Object.keys(ROLE_USER).forEach(function (role) {
  const u = ROLE_USER[role];
  S.who = u.userId;
  DB.Session = { userId: u.userId, at: Date.now() };
  Object.keys(PAGES).forEach(function (p) {
    if (!allowed(u, p)) return;
    S.page = p; S.p = pickParam(p, u); DRAFT = {};
    try { outs.push([role + ' 的「' + p + '」', PAGES[p]()]); } catch (e) {}
  });
});

/* 收每一顆按鈕帶的動作名，去 ACTS 裡找那一支。 */
const deadBtn = {};
let btnSeen = 0;
outs.forEach(function (pair) {
  const at = pair[0], html = String(pair[1] || '');
  /* btn() 用雙引號，手寫的那幾顆用單引號。兩種都要收——
     只收單引號的話，前門那五顆（全部都是 btn()）剛好一顆都看不到，
     而這一項就是為了它們才寫的。 */
  const re = /data-p=(?:'([^']*)'|"([^"]*)")/g;
  let mm;
  while ((mm = re.exec(html))) {
    let pl;
    try {
      pl = JSON.parse((mm[1] !== undefined ? mm[1] : mm[2]).replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
    } catch (e) { continue; }
    if (!pl || typeof pl.a !== 'string') continue;
    btnSeen++;
    const nm = pl.a.split(':')[0];
    if (typeof ACTS[nm] !== 'function') deadBtn[nm] = deadBtn[nm] || at;
  }
});
Object.keys(deadBtn).forEach(function (nm) {
  fail('按得下去「' + nm + '」，但 ACTS 裡沒有這一支（在 ' + deadBtn[nm] + '）');
});
if (!Object.keys(deadBtn).length) {
  ok('每一顆按鈕後面都有動作（' + btnSeen + ' 顆，含門口那幾頁）');
}


/* 那幾頁要的 id */
function pickParam(p, u) {
  const t = u.teamId ? teamOf(u.teamId) : null;
  const anyRun = DB.Runs[0];
  const myRun = t ? where('Runs', function (r) { return r.teamId === t.teamId; })[0] : null;
  const anyMs = DB.Milestones[0];
  if (p === 'stamp' || p === 'pick' || p === 'camp' || p === 'battle') {
    return { id: (myRun || anyRun || {}).runId };
  }
  if (p === 'review') return { id: (anyRun || {}).runId };
  if (p === 'commit') return { id: (anyMs || {}).msId };
  if (p === 'radar') return { id: (anyRun || {}).runId };
  return {};
}

/* ---------- 收尾 ---------- */
if (bad) {
  console.error(String.fromCharCode(10) + bad + ' 頁有問題。');
  process.exit(1);
}
console.log(String.fromCharCode(10) +
  '── 每一頁都畫得出來，而且點得到的地方後面真的有東西 ──');
