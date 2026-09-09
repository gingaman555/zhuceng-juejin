/* 一個學生打開這一頁，看不看得出來要幹嘛。
   跑：node v2/read.js（cwd 在 v2）

   check / loop / pages / e2e / multi 看的都是「會不會壞」。
   這一支看的是別的東西：**把每一頁按閱讀順序印出來**——
   眉標、標題、第一句話、可以動的地方、最大的那一顆鍵——
   然後用四條可以量的規矩掃過去：

     一　這一頁有沒有一個主要動作（0 或 1，不能 2 個以上）
     二　最大那一顆鍵的字有沒有講出「按下去會發生什麼」
     三　有沒有一句話說現在要做什麼（標題或第一句）
     四　沒有東西可做的時候，有沒有說接下來會怎樣

   規矩三、四判不了的，印出來讓人自己看——這一支的重點是那份印出來的
   東西，不是那幾個勾。 */
const fs = require('fs');
const path = require('path');
let MEM = {};
global.localStorage = {
  getItem: k => (MEM[k] == null ? null : MEM[k]),
  setItem: (k, v) => { MEM[k] = String(v); },
  removeItem: k => { delete MEM[k]; }
};
const stubEl = {
  value: '', innerHTML: '', textContent: '', className: '', style: {},
  scrollLeft: 0, scrollTop: 0, scrollWidth: 0, clientWidth: 0,
  offsetWidth: 0, offsetHeight: 0,
  getAttribute: () => null, setAttribute: () => {},
  addEventListener: () => {}, removeEventListener: () => {},
  appendChild: () => {}, insertAdjacentHTML: () => {},
  querySelector: () => null, querySelectorAll: () => [],
  getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
  classList: { add: () => {}, remove: () => {}, toggle: () => {} },
  scrollIntoView: () => {}, focus: () => {}
};
const FIELDS = {};
global.document = {
  getElementById: id => { if (!FIELDS[id]) FIELDS[id] = Object.create(stubEl); return FIELDS[id]; },
  querySelector: () => null, querySelectorAll: () => [],
  createElement: () => Object.create(stubEl),
  addEventListener: () => {},
  body: Object.create(stubEl), documentElement: Object.create(stubEl)
};
global.window = global;
global.innerWidth = 375; global.innerHeight = 812;
global.scrollTo = () => {};
global.requestAnimationFrame = () => 0; global.cancelAnimationFrame = () => {};
global.setTimeout = () => 0; global.clearTimeout = () => {};
global.getComputedStyle = () => ({ fontSize: '11px' });
global.matchMedia = () => ({ matches: false, addListener: () => {} });
const SRC = path.join(process.cwd(), 'src');
eval(fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort()
  .map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n'));

let 提醒 = [];
function un(s) {
  return String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
function txt(h) { return un(String(h).replace(/<[^>]*>/g, '\n')).split('\n').map(x => x.trim()).filter(x => x); }
function grab(h, cls) {
  const out = []; let m;
  const re = new RegExp('class="[^"]*\\b' + cls + '\\b[^"]*"[^>]*>([\\s\\S]*?)<', 'g');
  while ((m = re.exec(h))) { const t = un(m[1]).replace(/<[^>]*>/g, '').trim(); if (t) out.push(t); }
  return out;
}
function 鍵(h) {
  const out = []; let m;
  const re = /<button([^>]*)>([\s\S]*?)<\/button>/g;
  while ((m = re.exec(h))) {
    const t = un(m[2]).replace(/<[^>]*>/g, '').trim();
    if (!t) continue;
    out.push({ t: t, 大: /\bbig\b|\bbm go\b/.test(m[1]) });
  }
  return out;
}
function 可寫(h) {
  const a = (h.match(/<input[^>]*placeholder="([^"]*)"/g) || [])
    .map(x => un((x.match(/placeholder="([^"]*)"/) || [])[1] || ''));
  const b = (h.match(/<textarea[^>]*placeholder="([^"]*)"/g) || [])
    .map(x => un((x.match(/placeholder="([^"]*)"/) || [])[1] || ''));
  return a.concat(b).filter(x => x);
}

/* 含糊的鍵：按下去不知道會發生什麼 */
const 含糊 = ['確定', '確認', '送出', '提交', '下一步', '完成', '好', 'OK', '返回', '取消'];

function 看(名, h) {
  const eb = grab(h, 'eyebrow'), h1 = (h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1];
  const bs = 鍵(h), big = bs.filter(b => b.大);
  const 全文 = txt(h);
  console.log('\n┌ ' + 名);
  if (eb.length) console.log('│ 眉標　' + eb.slice(0, 2).join(' · '));
  if (h1) console.log('│ 標題　' + un(h1).replace(/<[^>]*>/g, '').trim());
  const 頭幾句 = 全文.filter(x => x.length > 4 && eb.indexOf(x) < 0).slice(0, 3);
  頭幾句.forEach(x => console.log('│ 　　　' + x.slice(0, 46)));
  可寫(h).forEach(p => console.log('│ ✎ 　　「' + p.slice(0, 40) + '」'));
  bs.forEach(b => console.log('│ ' + (b.大 ? '【大】' : '　小　') + b.t));

  /* 規矩一 */
  if (big.length > 1) { 提醒.push(名 + '：有 ' + big.length + ' 個主要動作（' + big.map(b => b.t).join('／') + '）'); }
  /* 規矩二 */
  big.forEach(function (b) {
    if (含糊.indexOf(b.t) >= 0) 提醒.push(名 + '：主要動作叫「' + b.t + '」，沒講按下去會發生什麼');
  });
  /* 規矩四 */
  if (!bs.length && 全文.length < 3) 提醒.push(名 + '：沒有動作也幾乎沒有字');
  return h;
}

/* ── 造一個真的班 ── */
function F(id, v) { document.getElementById(id).value = v; }
function as(u) { S.who = u.userId; DB.Session = { userId: u.userId, at: Date.now() }; }
DB = blank(); save(); S.who = null; DB.Session = null;
go('reg'); DRAFT.rgRole = 'teacher';
F('rg-name', '孟老師'); F('rg-acc', 'meng'); F('rg-pw', 'aaaa'); F('rg-pw2', 'aaaa'); ACTS.reg();
const tea = me();
go('mkclass'); F('mk-name', '設計專題'); ACTS.mkclass();
const kl = DB.Classes[0];
const stu = [];
['王小美', '陳阿哲'].forEach(function (n, i) {
  S.who = null; DB.Session = null;
  go('reg'); DRAFT.rgRole = 'student';
  F('rg-code', kl.joinCode); F('rg-name', n);
  F('rg-acc', 'b11000' + i); F('rg-pw', 'aaaa'); F('rg-pw2', 'aaaa'); ACTS.reg(); stu.push(me());
});
as(stu[0]);
const tm = actNewTeam('第一組', stu[0].userId).team;
as(stu[1]); actJoinTeam(tm.joinCode, stu[1].userId);

console.log('═'.repeat(56));
console.log('  一個學生打開每一頁，看到的是什麼');
console.log('═'.repeat(56));

/* ── 門口 ── */
S.who = null; DB.Session = null;
['gate', 'login', 'reg'].forEach(function (p) {
  S.page = p; S.p = {}; DRAFT = {};
  看('門口 · ' + p, PAGES[p]());
});

/* ── 還沒取專案名 ── */
as(stu[0]); S.page = 'home'; S.p = {}; DRAFT = {};
看('首頁 · 剛加入，還沒取專案名', PAGES.home());
actRename(tm.teamId, '校內共享單車調度');

/* ── 沒有任務 ── */
S.page = 'home'; S.p = {}; DRAFT = {};
看('首頁 · 老師還沒派任何東西', PAGES.home());

/* ── 有人在等 ── */
as(tea);
const ms = actPublish(kl.classId, { title: '把問題收斂成一句話',
  note: '不要寫題目，寫問題。', steps: ['把重點分類', '挑出一直出現的', '寫成一句'], due: 7, teams: [] });
as(stu[0]); S.page = 'home'; S.p = {}; DRAFT = {};
看('首頁 · 老師派了一件', PAGES.home());

/* ── 接委託三步 ── */
[0, 1, 2].forEach(function (st) {
  S.page = 'commit'; S.p = { id: ms.msId, st: st }; DRAFT = {};
  看('接委託 · 第 ' + (st + 1) + ' 步', PAGES.commit());
});

/* ── 出發之後 ── */
DRAFT = { plan: stu.map((u, i) => ({ n: '第' + (i + 1) + '件', d: 2, who: u.userId, byOwn: 1 })), sure: 'mid' };
ACTS.commit(ms.msId);
const run = runOf(tm.teamId, ms.msId);
S.page = 'home'; S.p = {}; DRAFT = {};
看('首頁 · 正在做', PAGES.home());

/* ── 交作業六題 ── */
S.page = 'battle'; S.p = { id: run.runId }; DRAFT = {};
看('交作業 · 第一次遇到他（選單頁）', PAGES.battle());
const qs = btAsks(run);
qs.forEach(function (q, i) {
  S.page = 'battle'; S.p = { id: run.runId, ph: 'q', q: i }; DRAFT = {};
  看('交作業 · 第 ' + (i + 1) + ' 題　' + q.ask, PAGES.battle());
});

/* ── 一個人填完了，另一個還沒 ── */
as(stu[0]); DRAFT = {}; S.page = 'battle'; S.p = { id: run.runId, ph: 'q', q: 1 };
PAGES.battle();
myItems(run, stu[0].userId).forEach(k => ACTS.spent(k + ',1'));
DRAFT.said1 = '我做了第一件'; S.p = { id: run.runId, ph: 'q', q: 2 };
ACTS.btsave(run.runId);
S.page = 'home'; S.p = {}; DRAFT = {};
看('首頁 · 我填完了，隊友還沒', PAGES.home());
as(stu[1]); DRAFT = {}; S.page = 'battle'; S.p = { id: run.runId, ph: 'q', q: 1 };
PAGES.battle();
myItems(run, stu[1].userId).forEach(k => ACTS.spent(k + ',1'));
DRAFT.said1 = '我做了第二件'; S.p = { id: run.runId, ph: 'q', q: 2 };
ACTS.btsave(run.runId);
S.page = 'home'; S.p = {}; DRAFT = {};
看('首頁 · 全組都填完了，還沒有人交', PAGES.home());

/* ── 交出去 ── */
DRAFT = {}; S.page = 'battle'; S.p = { id: run.runId, ph: 'q', q: 1 }; PAGES.battle();
DRAFT.where = 'TronClass'; DRAFT.feel = 'ok'; DRAFT.next = '下一步';
S.p = { id: run.runId, ph: 'q', q: qs.length - 1 };
ACTS.btnext(run.runId);
S.page = 'stamp'; S.p = { id: run.runId }; DRAFT = {};
看('判定 · 看準不準', PAGES.stamp());
S.page = 'home'; S.p = {}; DRAFT = {};
看('首頁 · 交出去了，等老師看', PAGES.home());

/* ── 被退回 ── */
as(tea); FIELDS['gr-word'] = Object.create(stubEl);
FIELDS['gr-word'].value = '第二件的位置我找不到，換個地方放。';
ACTS.reject(run.runId);
as(stu[0]); S.page = 'home'; S.p = {}; DRAFT = {};
看('首頁 · 被退回了', PAGES.home());
S.page = 'battle'; S.p = { id: run.runId }; DRAFT = {};
看('交作業 · 被退回之後進來', PAGES.battle());

/* ── 收下 ── */
ACTS.btgo(run.runId); DRAFT.where = '印出來放你桌上';
S.p = { id: run.runId, ph: 'q', q: qs.length - 1 };
ACTS.btnext(run.runId);
as(tea); actApprove(run.runId, '這一次找得到了。', 30);
as(stu[0]); SEEN_CUT = 1; OKGOT = {};
S.page = 'home'; S.p = {}; DRAFT = {};
看('首頁 · 老師收下了', PAGES.home());

/* ── 其餘那幾扇門 ── */
ACTS.okgot();
[['codex', '圖鑑'], ['pack', '任務清單'], ['eco', '班級地下城'],
 ['who', '換角色'], ['exit', '出口（還鎖著）'], ['story', '故事']].forEach(function (p) {
  S.page = p[0]; S.p = {}; DRAFT = {};
  看(p[1], PAGES[p[0]]());
});
actAskExit(tm.teamId);
S.page = 'exit'; S.p = {}; DRAFT = {};
看('出口（說了，等老師開）', PAGES.exit());
as(tea); actOpenExit(tm.teamId, 1);
as(stu[0]); S.page = 'exit'; S.p = {}; DRAFT = {};
看('出口（老師開了）', PAGES.exit());

console.log('\n' + '═'.repeat(56));
if (!提醒.length) console.log('  四條規矩都守住了。上面那份要用眼睛讀。');
else { console.log('  要看一下的 ' + 提醒.length + ' 個：'); 提醒.forEach(x => console.log('   · ' + x)); }

/* 離開碼。

   這一支的重點是那份印出來的東西（見檔頭），可是「提醒」那幾條不是
   感想——它們是量得出來的：一頁有兩個主要動作、主要動作沒講按下去會
   發生什麼、一頁既沒有動作也幾乎沒有字。那三件都違反「一頁只給一個
   動作」，該擋。

   規矩三、四判不了的東西還是只印不擋，那部分要用眼睛讀。 */
process.exit(提醒.length ? 1 : 0);
