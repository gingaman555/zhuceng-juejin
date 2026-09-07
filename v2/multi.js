/* 一個班、三位老師、六組、每組兩個人，一路跑到六組都走出出口。
   跑：node v2/multi.js（cwd 在 v2）　　組員人數可以換：node v2/multi.js 3

   e2e.js 走的是一組一條路走到底；這一支看的是**很多組同時在裡面**的時候
   會怎樣：組跟組之間碰不碰得到、老師的清單排不排得動、三位老師分著看
   會不會打架、深度與水晶是不是各算各的、班級地下城與榜畫不畫得出來，
   最後六組全部走完專案、出口關上之後畫面還在不在。 */
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

const 每組 = Math.max(1, Number(process.argv[2]) || 2);
const 組數 = 6;

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
function word(id, v) { FIELDS[id] = Object.create(stubEl); FIELDS[id].value = v; }

/* ══ 一 · 開班：三位老師、六組、每組兩人 ══ */
H('一個班 · 三位老師 · ' + 組數 + ' 組 · 每組 ' + 每組 + ' 人');
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
be('三位老師在同一個班', teas.filter(t => t.classId === kl.classId).length, 3);
be('班只有一個', DB.Classes.length, 1);

const 姓 = '陳林黃張李王吳劉蔡楊許鄭謝郭洪曾廖賴周葉孫馬朱胡'.split('');
const PROJ = ['共享單車', '校園導覽', '食堂動線', '選課介面', '宿舍回收', '社團招生'];
const teams = [];
let 序 = 0;
for (let gi = 0; gi < 組數; gi++) {
  const mems = [];
  for (let j = 0; j < 每組; j++) {
    S.who = null; DB.Session = null;
    go('reg'); DRAFT.rgRole = 'student';
    F('rg-code', kl.joinCode); F('rg-name', 姓[序] + '同學');
    F('rg-acc', 'b11' + String(1000 + 序)); F('rg-pw', 'aaaa');
    ACTS.reg(); mems.push(me()); 序++;
  }
  as(mems[0]);
  const t = actNewTeam('第' + (gi + 1) + '組', mems[0].userId).team;
  mems.slice(1).forEach(u => { as(u); actJoinTeam(t.joinCode, u.userId); });
  actRename(t.teamId, PROJ[gi]);
  teams.push({ t: t, mems: mems });
}
be('組數', DB.Teams.length, 組數);
be('學生人數', DB.Users.filter(u => u.role === 'student').length, 組數 * 每組);
be('每一組都是 ' + 每組 + ' 人', teams.every(g => g.mems.length === 每組), true);
be('每一組的代碼都不一樣', new Set(DB.Teams.map(t => t.joinCode)).size, 組數);
be('每一組都取了專案名', teams.every(g => teamOf(g.t.teamId).project), true);

/* ══ 走一整趟的工具 ══ */
function 派(標題) {
  as(teas[0]);
  return actPublish(kl.classId, { title: 標題, note: '寫清楚你要解決什麼。',
    steps: ['查', '做', '收'], due: 7, teams: [] });
}
function 接(g, m, 天) {
  as(g.mems[0]);
  DRAFT = { plan: g.mems.map((u, i) => ({ n: '第' + (i + 1) + '件', d: 天, who: u.userId, byOwn: 1 })), sure: 'mid' };
  ACTS.commit(m.msId);
  return runOf(g.t.teamId, m.msId);
}
function 各填各的(g, r, 天) {
  g.mems.forEach(function (u, i) {
    as(u); DRAFT = {}; S.page = 'battle'; S.p = { id: r.runId, ph: 'q', q: 1 };
    PAGES.battle();
    myItems(r, u.userId).forEach(k => { for (let n = 0; n < 天; n++) ACTS.spent(k + ',1'); });
    DRAFT.said1 = u.name + '這一趟做的';
    S.p = { id: r.runId, ph: 'q', q: 2 };
    ACTS.btsave(r.runId);
  });
}
function 交(g, r, gi) {
  as(g.mems[0]);
  DRAFT = {}; S.page = 'battle'; S.p = { id: r.runId, ph: 'q', q: 1 };
  PAGES.battle();
  DRAFT.where = teamOf(g.t.teamId).project + ' 交在 TronClass';
  DRAFT.feel = ['good', 'ok', 'bad'][gi % 3];
  DRAFT.scope = ['same', 'less', 'more'][gi % 3];
  DRAFT.next = '下一步';
  S.p = { id: r.runId, ph: 'q', q: btAsks(r).length - 1 };
  ACTS.btnext(r.runId);
}

/* ══ 二 · 第一趟：六組同時走 ══ */
H('第一趟：六組同時走');
const m1 = 派('把問題收斂成一句話');
be('六組都收得到', teams.filter(g => { as(g.mems[0]); return msFor(g.t.teamId).length; }).length, 組數);
const 天1 = [1, 2, 1, 4, 1, 3];
teams.forEach(function (g, gi) {
  g.run = 接(g, m1, 1);
  各填各的(g, g.run, 天1[gi]);
});
be('六組都還 running', DB.Runs.filter(r => r.state === 'running').length, 組數);
be('每一組的實際天數各自獨立',
  teams.map(g => find('Runs', x => x.runId === g.run.runId).spent.join('')).join('/'),
  天1.map(d => String(d).repeat(每組)).join('/'));
be('每一組的話都是自己人寫的',
  teams.every(g => Object.keys(find('Runs', x => x.runId === g.run.runId).said).length === 每組), true);

/* ══ 三 · 別組的東西碰不到 ══ */
H('別組的東西碰不到');
const 甲 = teams[0], 乙 = teams[1];
as(甲.mems[0]);
be('寫不進別組', actMyPart(乙.t.teamId, 乙.run.runId, { said1: '偷寫' }), null);
be('交不掉別組', actSubmit(乙.t.teamId, 乙.run.runId, 'x'), null);
be('退不掉別組', actRethink(乙.t.teamId, 乙.run.runId), false);
be('也開不了別組的新一趟', actCommit(乙.t.teamId, m1.msId, 3, [], [], '', 'mid'), null);
be('別組的話沒有多一句', Object.keys(find('Runs', x => x.runId === 乙.run.runId).said).length, 每組);
be('別組還是 running', find('Runs', x => x.runId === 乙.run.runId).state, 'running');

/* ══ 四 · 六組交出去，三位老師分著看 ══ */
H('六組交出去，三位老師分著看');
teams.forEach((g, gi) => 交(g, g.run, gi));
be('六組都交了', DB.Runs.filter(r => r.state === 'submitted').length, 組數);
teas.forEach((t, i) => { as(t); be('第' + (i + 1) + '位老師看到的件數', radar(kl.classId).length, 組數); });
as(teas[0]);
radar(kl.classId).slice().forEach(function (x, i) {
  as(teas[i % 3]);
  if (i === 5) { word('gr-word', '這一件我找不到東西。'); ACTS.reject(x.run.runId); }
  else actApprove(x.run.runId, teas[i % 3].name + '看過了。', 10 * (1 + (i % 5)));
});
be('收下的', DB.Runs.filter(r => r.state === 'done').length, 組數 - 1);
be('退回的', DB.Runs.filter(r => r.state === 'back').length, 1);
be('退回那一句署名到三位其中一位',
  DB.Runs.filter(r => r.state === 'back').every(r => TEA.indexOf((userOf(r.wordBy) || {}).name) >= 0), true);

/* 被退的那一組改好再交，換一位老師收 */
const 被退 = teams.filter(g => find('Runs', x => x.runId === g.run.runId).state === 'back')[0];
as(被退.mems[0]);
S.page = 'battle'; S.p = { id: 被退.run.runId }; DRAFT = {};
be('退回頁停在選單頁', btPhase(find('Runs', x => x.runId === 被退.run.runId)), 'menu');
ACTS.btgo(被退.run.runId);
DRAFT.where = '改成印出來放桌上';
S.p = { id: 被退.run.runId, ph: 'q', q: btAsks(被退.run).length - 1 };
ACTS.btnext(被退.run.runId);
as(teas[1]);
actApprove(被退.run.runId, '這次找得到了。', 20);
be('六組第一趟都收下了', DB.Runs.filter(r => r.state === 'done').length, 組數);

/* ══ 五 · 第二趟：加上協商與退出 ══ */
H('第二趟：一組被回一句、一組退出');
const m2 = 派('做一版可以測的');
teams.forEach(function (g, gi) { g.run = 接(g, m2, 2); });
/* 老師對第一組回一句 */
as(teas[2]);
be('沒帶理由回不了', actAskEst(teams[0].run.runId, 9, ''), null);
actAskEst(teams[0].run.runId, 9, '這一件去年那一組花了九天。');
be('學生承諾沒被改掉', find('Runs', x => x.runId === teams[0].run.runId).est, 2 * 每組);
as(teams[0].mems[0]);
actAnswerAsk(teams[0].t.teamId, teams[0].run.runId, 2 * 每組 + 2);
be('最後那一下是學生按的', find('Runs', x => x.runId === teams[0].run.runId).est, 2 * 每組 + 2);
as(teas[2]);
be('老師回不了第二次', actAskEst(teams[0].run.runId, 12, '再一次'), null);
/* 第六組退出這一趟 */
as(teams[5].mems[0]);
actRethink(teams[5].t.teamId, teams[5].run.runId);
be('退出的那一趟', find('Runs', x => x.runId === teams[5].run.runId).state, 'rethought');
be('退出沒有判定', !!find('Runs', x => x.runId === teams[5].run.runId).stamp, false);
/* 其他五組走完 */
teams.slice(0, 5).forEach(function (g, gi) {
  各填各的(g, g.run, 2);
  交(g, g.run, gi);
});
as(teas[0]);
radar(kl.classId).slice().forEach(function (x, i) {
  as(teas[i % 3]);
  actApprove(x.run.runId, '可以。', 10 * (1 + (i % 5)));
});
be('第二趟收下', DB.Runs.filter(r => r.state === 'done').length, 組數 + 5);

/* ══ 六 · 第三趟：六組都走完 ══ */
H('第三趟：六組都走完');
const m3 = 派('收尾');
teams.forEach(function (g, gi) {
  g.run = 接(g, m3, 1);
  各填各的(g, g.run, 1);
  交(g, g.run, gi);
});
as(teas[0]);
radar(kl.classId).slice().forEach(function (x, i) {
  as(teas[i % 3]); actApprove(x.run.runId, '收下。', 10 * (1 + (i % 5)));
});
be('三趟總共收下', DB.Runs.filter(r => r.state === 'done').length, 組數 * 3 - 1);
be('老師的清單清空了', (as(teas[0]), radar(kl.classId).length), 0);

/* ══ 七 · 深度、水晶、圖鑑、校準各算各的 ══ */
H('深度 · 水晶 · 圖鑑 · 校準');
const 錢 = teams.map(g => crystalOf(g.t.teamId).all);
const 深 = teams.map(g => depthOf(g.t.teamId));
const 鑑 = teams.map(g => Object.keys(metMobs(g.t.teamId)).length);
console.log('   水晶：' + 錢.join(' / '));
console.log('   深度：' + 深.join(' / '));
console.log('   圖鑑：' + 鑑.join(' / '));
be('每一組都有水晶', 錢.every(x => x > 0), true);
be('水晶不是全部一樣（各算各的）', new Set(錢).size > 1, true);
be('每一組都有深度', 深.every(x => x > 0), true);
be('圖鑑每一組都收到東西', 鑑.every(x => x > 0), true);
teams.forEach(function (g) {
  const s = sureOf(g.t.teamId);
  const n = Object.keys(s).reduce((a, k) => a + s[k].n, 0);
  if (!n) fail(teamOf(g.t.teamId).project + ' 沒有校準資料');
});
ok('六組都有校準資料（說了幾次很確定、準了幾次）');

/* ══ 八 · 班級地下城與榜 ══ */
H('班級地下城 · 榜');
as(teas[0]); S.page = 'classeco'; S.p = {}; DRAFT = {};
const ce = PAGES.classeco();
be('老師看的那一頁六組都在', teams.filter(g => ce.indexOf(teamOf(g.t.teamId).name) >= 0).length, 組數);
as(teams[0].mems[0]); S.page = 'eco'; S.p = {}; DRAFT = {};
const eco = PAGES.eco();
be('學生看的那一頁六組都在', teams.filter(g => eco.indexOf(teamOf(g.t.teamId).name) >= 0).length, 組數);
const rows = rankRows(kl.classId);
be('榜上六組都在', rows.length, 組數);
be('榜的順序：先比準了幾次，平手才比偏差率',
  rows.every(function (x, i) {
    if (i === 0) return true;
    const p = rows[i - 1];
    if (p.dev === null) return x.dev === null;
    if (x.dev === null) return true;
    return p.hit > x.hit || (p.hit === x.hit && p.dev <= x.dev);
  }), true);
/* 有一組選擇不上榜 */
as(teams[2].mems[0]); ACTS.norank();
be('選擇不上榜之後榜上剩', rankRows(kl.classId).length, 組數 - 1);
as(teams[2].mems[0]); ACTS.norank();
be('再按一次又回來了', rankRows(kl.classId).length, 組數);

/* ══ 九 · 六組全部走出出口 ══ */
H('六組全部走出出口');
teams.forEach(function (g) { as(g.mems[0]); be(teamOf(g.t.teamId).project + ' 鎖著走不出去', actLetGo(g.t.teamId, 'x'), null); });
teams.forEach(function (g) { as(g.mems[0]); actAskExit(g.t.teamId); });
as(teas[0]);
be('老師的出口佇列', exitQueue(kl.classId).length, 組數);
/* 老師先擋一組 */
actDenyExit(teams[3].t.teamId);
be('擋掉一組之後佇列剩', exitQueue(kl.classId).length, 組數 - 1);
as(teams[3].mems[0]); actAskExit(teams[3].t.teamId);
as(teas[0]);
be('那一組再說一次又回到佇列', exitQueue(kl.classId).length, 組數);
teams.forEach(function (g, gi) { as(teas[gi % 3]); actOpenExit(g.t.teamId, 1); });
teams.forEach(function (g) { as(g.mems[0]); actLetGo(g.t.teamId, '謝謝這一學期。'); });
be('六組都走出去了', DB.Teams.filter(t => t.leftAt).length, 組數);
be('每一組都留了一句話', DB.Teams.every(t => t.exitWord), true);
as(teas[0]);
be('老師的出口佇列清空', exitQueue(kl.classId).length, 0);

/* ══ 十 · 專案結束之後，畫面還在 ══ */
H('專案結束之後，每一頁 × 每一個角色');
const ra = DB.Users.filter(u => u.role === 'researcher')[0] || (function () {
  S.who = null; DB.Session = null;
  go('reg'); DRAFT.rgRole = 'researcher';
  F('rg-name', '研究者'); F('rg-acc', 'lab'); F('rg-pw', 'aaaa'); ACTS.reg();
  return me();
})();
let drew = 0, errs = [];
[['student', teams[0].mems[0]], ['teacher', teas[0]], ['researcher', ra]].forEach(function (p) {
  as(p[1]);
  Object.keys(PAGES).forEach(function (pg) {
    if (!allowed(p[1], pg)) return;
    S.page = pg; DRAFT = {};
    S.p = ['stamp', 'pick', 'camp', 'battle', 'radar', 'review'].indexOf(pg) >= 0
      ? { id: DB.Runs[0].runId } : (pg === 'commit' ? { id: m1.msId } : {});
    try {
      const o = PAGES[pg]();
      if (!o || !o.trim()) errs.push(p[0] + '/' + pg + ' 空的'); else drew++;
    } catch (e) { errs.push(p[0] + '/' + pg + '：' + e.message); }
  });
});
if (errs.length) fail('畫不出來：' + errs.join(' · '));
else ok('三個角色 × 每一頁都畫得出來（' + drew + ' 次）');
be('研究者匯出得出來', (function () { as(ra); try { return exportCsv().length > 50; } catch (e) { return 'x:' + e.message; } })(), true);

console.log('\n' + '═'.repeat(52));
console.log('  ' + 組數 + ' 組 × ' + 每組 + ' 人 · 3 位老師 · 3 趟委託 · 全部走出出口');
console.log(bad ? '  有 ' + bad + ' 個地方不對' : '  全部對得上');
