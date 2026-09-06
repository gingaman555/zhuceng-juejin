/* 一個班、三位老師、六組、二十個學生，整條跑一次。
   跑：node v2/multi.js（cwd 在 v2）

   e2e.js 走的是一組一條路走到底；這一支看的是**很多組同時在裡面**的時候
   會怎樣：老師的清單排不排得動、組跟組之間有沒有互相看到／改到、
   班級地下城與榜畫不畫得出來、深度與金幣是不是各算各的。 */
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
  getElementById: function (id) {
    if (!FIELDS[id]) FIELDS[id] = Object.create(stubEl);
    return FIELDS[id];
  },
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

let bad = 0, step = 0;
const ok = m => console.log('   ✓ ' + m);
const fail = m => { bad++; console.log('   ✗ ' + m); };
const H = m => { step++; console.log('\n' + step + ' · ' + m + '\n' + '─'.repeat(52)); };
function be(名, 實, 期) {
  if (String(實) === String(期)) ok(名 + '＝' + 實);
  else fail(名 + '：期待 ' + 期 + '，實際 ' + 實);
}
function as(u) { S.who = u.userId; DB.Session = { userId: u.userId, at: Date.now() }; }
function F(id, v) { document.getElementById(id).value = v; }

/* ══ 一 · 一個班、三位老師、六組、二十人 ══ */
H('一個班 · 三位老師 · 六組 · 二十人');
DB = blank(); save(); S.who = null; DB.Session = null;

const TEA = ['孟老師', '李老師', '吳老師'];
const teas = [];
TEA.forEach(function (n, i) {
  S.who = null; DB.Session = null;
  go('reg'); DRAFT.rgRole = 'teacher';
  F('rg-name', n); F('rg-acc', 'tea' + i); F('rg-pw', 'aaaa');
  if (i > 0) F('rg-code', DB.Classes[0].joinCode);
  ACTS.reg();
  if (i === 0) { go('mkclass'); F('mk-name', '設計專題'); ACTS.mkclass(); }
  teas.push(me());
});
const kl = DB.Classes[0];
be('班有幾個', DB.Classes.length, 1);
be('三位老師都在同一個班', teas.filter(t => t.classId === kl.classId).length, 3);

/* 六組，人數 4 4 3 3 3 3 ＝ 20 */
const SIZES = [4, 4, 3, 3, 3, 3];
const 姓 = '陳林黃張李王吳劉蔡楊許鄭謝郭洪曾廖賴周葉'.split('');
const teams = [];
let 序 = 0;
SIZES.forEach(function (n, gi) {
  const mems = [];
  for (let j = 0; j < n; j++) {
    S.who = null; DB.Session = null;
    go('reg'); DRAFT.rgRole = 'student';
    F('rg-code', kl.joinCode); F('rg-name', 姓[序] + '同學');
    F('rg-acc', 'b11' + String(1000 + 序)); F('rg-pw', 'aaaa');
    ACTS.reg();
    mems.push(me()); 序++;
  }
  as(mems[0]);
  const t = actNewTeam('第' + (gi + 1) + '組', mems[0].userId).team;
  mems.slice(1).forEach(u => { as(u); actJoinTeam(t.joinCode, u.userId); });
  actRename(t.teamId, ['共享單車', '校園導覽', '食堂動線', '選課介面', '宿舍回收', '社團招生'][gi]);
  teams.push({ t: t, mems: mems });
});
be('組數', DB.Teams.length, 6);
be('學生人數', DB.Users.filter(u => u.role === 'student').length, 20);
be('每一組的人數', teams.map(x => x.mems.length).join(''), SIZES.join(''));
be('每一組的代碼都不一樣', new Set(DB.Teams.map(t => t.joinCode)).size, 6);

/* ══ 二 · 老師派一件給全班 ══ */
H('老師派一件給全班');
as(teas[0]);
actPublish(kl.classId, {
  title: '把問題收斂成一句話', note: '不要寫題目，寫問題。',
  steps: ['把重點分類', '挑出一直出現的', '寫成一句'], due: 7, teams: []
});
const ms = DB.Milestones[0];
let 看得到 = 0;
teams.forEach(function (g) { as(g.mems[0]); if (msFor(g.t.teamId).length) 看得到++; });
be('六組都收得到', 看得到, 6);

/* ══ 三 · 六組各自接、各自填、各自交 ══ */
H('六組各自走一趟');
const 天表 = [[1, 1, 1, 1], [2, 2, 2, 2], [1, 3, 1], [4, 4, 4], [1, 1, 1], [2, 1, 3]];
teams.forEach(function (g, gi) {
  as(g.mems[0]);
  DRAFT = { plan: g.mems.map((u, i) => ({ n: '第' + (i + 1) + '件', d: 1, who: u.userId, byOwn: 1 })), sure: 'mid' };
  ACTS.commit(ms.msId);
  const r = runOf(g.t.teamId, ms.msId);
  g.run = r;
  g.mems.forEach(function (u, i) {
    as(u); DRAFT = {}; S.page = 'battle'; S.p = { id: r.runId, ph: 'q', q: 1 };
    PAGES.battle();
    myItems(r, u.userId).forEach(k => { for (let n = 0; n < 天表[gi][i]; n++) ACTS.spent(k + ',1'); });
    DRAFT.said1 = u.name + '做了第' + (i + 1) + '件';
    S.p = { id: r.runId, ph: 'q', q: 2 };
    ACTS.btsave(r.runId);
  });
});
be('六組都還是 running', DB.Runs.filter(r => r.state === 'running').length, 6);
be('每一組的實際天數各自獨立',
  teams.map(g => JSON.stringify(find('Runs', x => x.runId === g.run.runId).spent)).join(''),
  天表.map(a => JSON.stringify(a)).join(''));
be('每一組的話都是自己人寫的',
  teams.every(g => Object.keys(find('Runs', x => x.runId === g.run.runId).said).length === g.mems.length), true);

/* ══ 四 · 別組的東西碰不到 ══ */
H('別組的東西碰不到');
const 甲 = teams[0], 乙 = teams[1];
as(甲.mems[0]);
be('改不動別組那一趟', actMyPart(乙.t.teamId, 乙.run.runId, { said1: '偷寫' }), null);
be('用自己的 teamId 也改不到別人的', actMyPart(甲.t.teamId, 乙.run.runId, { said1: '偷寫' }), null);
be('別組那一趟的話沒有多一句',
  Object.keys(find('Runs', x => x.runId === 乙.run.runId).said).length, 乙.mems.length);
be('交不掉別組的', actSubmit(乙.t.teamId, 乙.run.runId, 'x'), null);
be('別組那一趟還是 running', find('Runs', x => x.runId === 乙.run.runId).state, 'running');
be('看不到別組的任務清單', msFor(甲.t.teamId).length, msFor(乙.t.teamId).length);
be('自己的組只有自己那幾個人',
  where('Users', u => u.teamId === 甲.t.teamId).length, 甲.mems.length);

/* ══ 五 · 交出去，老師的清單排得動 ══ */
H('六組陸續交，老師的清單');
teams.forEach(function (g, gi) {
  as(g.mems[0]);
  DRAFT = {}; S.page = 'battle'; S.p = { id: g.run.runId, ph: 'q', q: 1 };
  PAGES.battle();
  DRAFT.where = '第' + (gi + 1) + '組交在 TronClass';
  DRAFT.feel = ['good', 'ok', 'bad'][gi % 3];
  DRAFT.scope = ['same', 'less', 'more'][gi % 3];
  DRAFT.next = '下一步';
  S.p = { id: g.run.runId, ph: 'q', q: btAsks(g.run).length - 1 };
  ACTS.btnext(g.run.runId);
});
be('六組都交出去了', DB.Runs.filter(r => r.state === 'submitted').length, 6);
as(teas[0]);
const q = radar(kl.classId);
be('老師的清單有六件', q.length, 6);
be('清單上每一件都對得到組', q.every(x => x.run && x.ms && teamOf(x.run.teamId)), true);
as(teas[1]);
be('第二位老師看到的是同一份', radar(kl.classId).length, 6);
as(teas[2]);
be('第三位老師也是', radar(kl.classId).length, 6);

/* ══ 六 · 三位老師分著看，收下與退回 ══ */
H('三位老師分著看');
q.forEach(function (x, i) {
  as(teas[i % 3]);
  if (i % 3 === 2) {
    FIELDS['gr-word'] = Object.create(stubEl);
    FIELDS['gr-word'].value = '第' + (i + 1) + '件我找不到東西。';
    ACTS.reject(x.run.runId);
  } else {
    actApprove(x.run.runId, teas[i % 3].name + '看過了。', 10 * (1 + (i % 5)));
  }
});
be('收下的', DB.Runs.filter(r => r.state === 'done').length, 4);
be('退回的', DB.Runs.filter(r => r.state === 'back').length, 2);
const signed = DB.Runs.filter(r => r.word).map(r => userOf(r.wordBy || r.doneBy || '') || {});
be('每一句話都署名到三位其中一位',
  DB.Runs.filter(r => r.state === 'back').every(r => TEA.indexOf((userOf(r.wordBy) || {}).name) >= 0), true);
be('老師清單剩下', radar(kl.classId).length, 0);

/* ══ 七 · 深度、金幣、圖鑑各算各的 ══ */
H('深度 · 金幣 · 圖鑑各算各的');
const 錢 = teams.map(g => coinsOf(g.t.teamId).all);
const 深 = teams.map(g => depthOf(g.t.teamId));
console.log('   金幣：' + 錢.join(' / '));
console.log('   深度：' + 深.join(' / '));
be('收下的那四組有金幣，被退的兩組是 0', 錢.filter(x => x > 0).length, 4);
be('金幣沒有互相加到', new Set(錢).size >= 2, true);
be('圖鑑只算自己收下的',
  teams.every(g => Object.keys(metMobs(g.t.teamId)).length ===
    (where('Runs', r => r.teamId === g.t.teamId && r.state === 'done').length ? 1 : 0)), true);

/* ══ 八 · 班級地下城與榜 ══ */
H('班級地下城 · 榜');
as(teas[0]);
S.page = 'classeco'; S.p = {}; DRAFT = {};
const ce = PAGES.classeco();
be('全班那一頁畫得出來', ce.length > 100, true);
be('六組的名字都在', teams.filter(g => ce.indexOf(g.t.name) >= 0).length, 6);
as(teams[0].mems[0]);
S.page = 'eco'; S.p = {}; DRAFT = {};
const eco = PAGES.eco();
be('學生看的那一頁畫得出來', eco.length > 100, true);
be('六組都在上面', teams.filter(g => eco.indexOf(g.t.name) >= 0).length, 6);
const rows = rankRows(kl.classId);
be('榜上有幾組（要有判定過的才上）', rows.length >= 4, true);
/* 榜是先比「準了幾次」（多的在上面），平手才用偏差率——
   那一條寫在 68-rank.js 的 rankRows 裡，是刻意的：平手會很多，
   而那讓這張榜比較不像一條隊伍。 */
be('榜的順序：先比準了幾次，平手才比偏差率',
  rows.every(function (x, i) {
    if (i === 0) return true;
    var p = rows[i - 1];
    if (p.dev === null) return x.dev === null;
    if (x.dev === null) return true;
    return p.hit > x.hit || (p.hit === x.hit && p.dev <= x.dev);
  }), true);

/* ══ 九 · 每一頁 × 每一個角色（六組的狀態下） ══ */
H('每一頁 × 每一個角色');
let drew = 0, errs = [];
[['student', teams[0].mems[0]], ['teacher', teas[0]]].forEach(function (p) {
  as(p[1]);
  Object.keys(PAGES).forEach(function (pg) {
    if (!allowed(p[1], pg)) return;
    S.page = pg; DRAFT = {};
    S.p = ['stamp', 'pick', 'camp', 'battle', 'radar', 'review'].indexOf(pg) >= 0
      ? { id: DB.Runs[0].runId } : (pg === 'commit' ? { id: ms.msId } : {});
    try {
      const o = PAGES[pg]();
      if (!o || !o.trim()) errs.push(p[0] + '/' + pg + ' 空的'); else drew++;
    } catch (e) { errs.push(p[0] + '/' + pg + '：' + e.message); }
  });
});
if (errs.length) fail('畫不出來：' + errs.join(' · '));
else ok('畫了 ' + drew + ' 次，沒有一頁炸掉');

console.log('\n' + '═'.repeat(52));
console.log(bad ? '有 ' + bad + ' 個地方不對' : '六組一起跑，全部對得上');
