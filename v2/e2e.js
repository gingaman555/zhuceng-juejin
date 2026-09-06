/* 從開班到收下，整條走一次。跑：node scratchpad/e2e.js（cwd 在 v2） */
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
function form(id, v) { document.getElementById(id).value = v; }
function as(u) { S.who = u.userId; DB.Session = { userId: u.userId, at: Date.now() }; }

/* ══ 一 · 開班、註冊、組隊 ══ */
H('開班 · 註冊 · 組隊');
DB = blank(); save(); S.who = null; DB.Session = null;

go('reg'); DRAFT.rgRole = 'teacher';
form('rg-name', '孟老師'); form('rg-acc', 'meng'); form('rg-pw', 'aaaa');
ACTS.reg();
const tea = me();
be('老師的顯示名', tea && tea.name, '孟老師');

go('mkclass'); form('mk-name', '設計專題'); ACTS.mkclass();
const kl = DB.Classes[0];
ok('開班了，加入碼 ' + kl.joinCode);

const NAMES = ['王小美', '陳阿哲', '林子涵', '黃柏宇'];
const stu = [];
NAMES.forEach(function (n, i) {
  S.who = null; DB.Session = null;
  go('reg'); DRAFT.rgRole = 'student';
  form('rg-code', kl.joinCode); form('rg-name', n);
  form('rg-acc', 'b1100000' + i); form('rg-pw', 'aaaa');
  ACTS.reg();
  stu.push(me());
});
be('四個學生註冊完，名字是', stu.map(u => u.name).join('、'), NAMES.join('、'));

as(stu[0]);
const tm = actNewTeam('第一組', stu[0].userId).team;
stu.slice(1).forEach(u => { as(u); actJoinTeam(tm.joinCode, u.userId); });
be('組員人數', DB.Users.filter(u => u.teamId === tm.teamId).length, 4);

/* 新的一組要先取專案名——廊道在取名之前不給「做完了」那一顆，
   那是第一天真的會走到的一步。 */
as(stu[0]);
S.page = 'home'; S.p = {}; DRAFT = {};
actRename(tm.teamId, '校內共享單車調度');
be('取好了', teamOf(tm.teamId).project, '校內共享單車調度');

/* ══ 二 · 老師派一件 ══ */
H('老師派一件');
as(tea);
const ms = actPublish(kl.classId, {
  title: '把問題收斂成一句話', note: '不要寫題目，寫問題。',
  steps: ['把重點分類','挑出一直出現的','寫成一句'], due: 7, teams: []
});
be('任務出來了', ms && (ms.ms || ms).title, '把問題收斂成一句話');

/* ══ 三 · 學生接委託（三步） ══ */
H('接委託：三步');
as(stu[0]);
const msId = DB.Milestones[0].msId;
[0, 1, 2].forEach(function (st) {
  S.page = 'commit'; S.p = { id: msId, st: st }; DRAFT.plan = null;
  const h = PAGES.commit();
  if (!h || !h.trim()) fail('第 ' + (st + 1) + ' 步畫不出來');
});
ok('三步都畫得出來');

DRAFT = {};
DRAFT.plan = stu.map((u, i) => ({ n: '第' + (i + 1) + '件', d: i + 1, who: u.userId, byOwn: 1 }));
DRAFT.sure = 'mid';
ACTS.commit(msId);
const run = runOf(tm.teamId, msId);
be('承諾天數（拆件加總）', run.est, 1 + 2 + 3 + 4);
be('狀態', run.state, 'running');

/* ══ 四 · 廊道那一顆的三種狀態 ══ */
H('廊道：還沒填 → 填一半 → 全填完');
function 廊道鍵(u) {
  as(u); S.page = 'home'; S.p = {}; DRAFT = {};
  const h = PAGES.home();
  return {
    鍵: (function () {
      var re = /<button[^>]*data-p=(?:'([^']*)'|"([^"]*)")[^>]*>([\s\S]*?)<\/button>/g, m;
      while ((m = re.exec(h))) {
        var p = (m[1] !== undefined ? m[1] : m[2]) || '';
        if (p.indexOf('go:battle') >= 0) return m[3].replace(/<[^>]*>/g, '').trim();
      }
      return '(沒有)';
    })(),
    話: (h.match(/class="waiting">([^<]*)</) || [])[1] ||
        (h.match(/class="dim">(還有[^<]*)</) || [])[1] || ''
  };
}
let c = 廊道鍵(stu[0]);
be('一個人都還沒填 · 鍵', c.鍵, '做完了');
be('一個人都還沒填 · 話', c.話 || '(沒有)', '(沒有)');

function 填自己那一份(u, i, 天) {
  as(u); DRAFT = {}; S.p = { id: run.runId, ph: 'q', q: 1 };
  PAGES.battle();
  myItems(run, u.userId).forEach(k => { for (let n = 0; n < 天; n++) ACTS.spent(k + ',1'); });
  DRAFT.said1 = u.name + '做了第' + (i + 1) + '件';
  S.p = { id: run.runId, ph: 'q', q: 2 };
  ACTS.btsave(run.runId);
}
填自己那一份(stu[0], 0, 1);
填自己那一份(stu[1], 1, 4);
c = 廊道鍵(stu[2]);
be('填了兩個 · 話', /還有 2 個人/.test(c.話), true);
be('填了兩個 · 狀態沒動', find('Runs', x => x.runId === run.runId).state, 'running');

填自己那一份(stu[2], 2, 1);
填自己那一份(stu[3], 3, 3);
c = 廊道鍵(stu[0]);
be('全填完 · 鍵', c.鍵, '交出去給老師');
be('全填完 · 話', /還沒有人交出去/.test(c.話), true);

const mid = find('Runs', x => x.runId === run.runId);
be('四個人的實際天數', JSON.stringify(mid.spent), JSON.stringify([1, 4, 1, 3]));
be('四句「我做了什麼」', Object.keys(mid.said).length, 4);
as(tea);
be('老師還看不到（還沒交）', radar(kl.classId).some(x => x.run.runId === run.runId), false);

/* ══ 五 · 交出去 ══ */
H('交出去');
as(stu[3]);
S.page = 'battle'; S.p = { id: run.runId }; DRAFT = {};
be('第一次遇到他，先停在選單頁', btPhase(find('Runs', x => x.runId === run.runId)), 'menu');
ACTS.btgo(run.runId);
DRAFT = {}; S.p = { id: run.runId, ph: 'q', q: 1 }; PAGES.battle();
be('存過的數字帶回畫面', JSON.stringify(DRAFT.spent), JSON.stringify([1, 4, 1, 3]));
DRAFT.where = 'TronClass 第三次作業';
DRAFT.feel = 'bad'; DRAFT.why = '第二個受訪者臨時改期';
DRAFT.scope = 'less'; DRAFT.next = '再訪一個人';
S.p = { id: run.runId, ph: 'q', q: btAsks(run).length - 1 };
ACTS.btnext(run.runId);
const sub = find('Runs', x => x.runId === run.runId);
be('狀態', sub.state, 'submitted');
be('判定', !!sub.stamp, true);
be('組的四題都寫進去了', [sub.link, sub.feel, sub.scope, sub.next].join('|'),
  'TronClass 第三次作業|bad|less|再訪一個人');
be('個人那兩樣沒被洗掉', JSON.stringify(sub.spent), JSON.stringify([1, 4, 1, 3]));
as(stu[0]);
be('交出去之後個人改不動了', actMyPart(tm.teamId, run.runId, { said1: '偷改' }), null);
as(tea);
be('老師的清單裡有了', radar(kl.classId).some(x => x.run.runId === run.runId), true);

/* ══ 六 · 老師審核：退回 ══ */
H('老師審核：退回一定要寫一句話');
as(tea);
S.page = 'review'; S.p = { id: run.runId }; DRAFT = {};
const rv = PAGES.review();
be('釘在底部那一條在', rv.indexOf('rvw-pin') >= 0, true);
be('四個人的名字都印出來', NAMES.filter(n => rv.indexOf(n) >= 0).length, 4);
FIELDS['gr-word'] = Object.create(stubEl); FIELDS['gr-word'].value = '';
ACTS.reject(run.runId);
be('沒寫字退不掉', find('Runs', x => x.runId === run.runId).state, 'submitted');
FIELDS['gr-word'].value = '第二件的位置我找不到，換個地方放。';
ACTS.reject(run.runId);
const back = find('Runs', x => x.runId === run.runId);
be('退回了', back.state, 'back');
be('那句話有署名', userOf(back.wordBy).name, '孟老師');

/* ══ 七 · 改好再交一次 ══ */
H('改好再交一次');
as(stu[0]);
S.page = 'battle'; S.p = { id: run.runId }; DRAFT = {};
be('退回的那一趟停在選單頁', btPhase(back), 'menu');
const hb = PAGES.battle();
be('老師那句話印出來了', hb.indexOf('第二件的位置我找不到') >= 0, true);
be('沒有「還沒準備好」那顆假鍵', hb.indexOf('還沒準備好') < 0, true);
ACTS.btgo(run.runId);
DRAFT.where = '印出來放你桌上';
S.p = { id: run.runId, ph: 'q', q: btAsks(back).length - 1 };
ACTS.btnext(run.runId);
const re = find('Runs', x => x.runId === run.runId);
be('再交出去', re.state, 'submitted');
be('改過的位置存進去了', re.link, '印出來放你桌上');
be('判定沒被重算', re.stamp, sub.stamp);

/* ══ 八 · 收下 ══ */
H('老師收下');
as(tea);
const mobName = mobOfRun(re).n;
be('收下之前圖鑑裡沒有他', !!metMobs(tm.teamId)[mobName], false);
actApprove(run.runId, '這一次找得到了。', 30);
const done = find('Runs', x => x.runId === run.runId);
be('狀態', done.state, 'done');
be('收下之後圖鑑裡有他了', !!metMobs(tm.teamId)[mobName], true);
be('金幣', coinsOf(tm.teamId).all, RULES.COIN.base + 30);
as(stu[0]); SEEN_CUT = 1; OKGOT = {};
S.page = 'home'; S.p = {}; DRAFT = {};
const home = PAGES.home();
be('首頁跳出「新登場 · ' + mobName + '」', home.indexOf('新登場') >= 0 && home.indexOf(mobName) >= 0, true);

/* ══ 九 · 退出（還沒準備好） ══ */
H('退出：紀錄留著，沒有判定');
as(stu[0]);
const ms2 = actPublish(kl.classId, { title: '第二件', note: '', steps: [], due: 7, teams: [] });
as(stu[0]);
DRAFT = { plan: [{ n: '甲', d: 3, who: stu[0].userId, byOwn: 1 }], sure: 'low' };
ACTS.commit(DB.Milestones[1].msId);
const r2 = runOf(tm.teamId, DB.Milestones[1].msId);
be('第二趟出發', r2.state, 'running');
be('第二次遇到委託人就不停選單頁了',
  btPhase(Object.assign({}, r2)) === 'q' || mobDebut(tm.teamId, r2.runId), true);
actRethink(tm.teamId, r2.runId);
const r2b = find('Runs', x => x.runId === r2.runId);
be('退出之後', r2b.state, 'rethought');
be('沒有判定', !!r2b.stamp, false);
be('走過的天數留著', r2b.went >= 1, true);

/* ══ 十 · 協商：老師回一句「我覺得會是幾天」 ══ */
H('協商：老師回一次，最後那一下還是學生按的');
as(stu[0]);
const ms3 = DB.Milestones[1];
DRAFT = { plan: [{ n: '甲', d: 3, who: stu[0].userId, byOwn: 1 }], sure: 'low' };
ACTS.commit(ms3.msId);
const r3 = runOf(tm.teamId, ms3.msId);
be('學生承諾', r3.est, 3);
as(tea);
be('沒帶理由回不了', actAskEst(r3.runId, 6, ''), null);
actAskEst(r3.runId, 6, '這一件去年那一組花了六天。');
const asked = find('Runs', x => x.runId === r3.runId);
be('老師回的數字', asked.askEst, 6);
be('學生承諾沒被改掉', asked.est, 3);
be('那一句有署名', userOf(asked.askBy).name, '孟老師');
as(stu[0]);
actAnswerAsk(tm.teamId, r3.runId, 5);
const answered = find('Runs', x => x.runId === r3.runId);
be('最後那一下是學生按的', answered.est, 5);
be('老師回不了第二次', actAskEst(r3.runId, 9, '再一次'), null);

/* ══ 十一 · 走完剩下的，看深度長出來 ══ */
H('走完幾趟，深度長出來');
function 走完一趟(r, 天) {
  stu.forEach(function (u, i) {
    as(u); DRAFT = {}; S.p = { id: r.runId, ph: 'q', q: 1 };
    PAGES.battle();
    myItems(r, u.userId).forEach(k => { for (let n = 0; n < 天; n++) ACTS.spent(k + ',1'); });
    DRAFT.said1 = u.name + '這一趟做的';
    S.p = { id: r.runId, ph: 'q', q: 2 };
    ACTS.btsave(r.runId);
  });
  as(stu[0]);
  /* 先走過那一題，DRAFT.spent 才會從已經存好的值帶回來——
     真的使用者是一題一題走過去的，所以這一步不能跳。 */
  DRAFT = {}; S.p = { id: r.runId, ph: 'q', q: 1 }; PAGES.battle();
  DRAFT.where = '放你桌上'; DRAFT.feel = 'ok'; DRAFT.next = '下一步';
  S.p = { id: r.runId, ph: 'q', q: btAsks(r).length - 1 };
  ACTS.btnext(r.runId);
  as(tea);
  actApprove(r.runId, '可以。', 20);
}
const d0 = depthOf(tm.teamId);
走完一趟(answered, 2);
as(tea);
const ms4 = actPublish(kl.classId, { title: '第三件', note: '', steps: [], due: 7, teams: [] });
as(stu[0]);
DRAFT = { plan: [{ n: '甲', d: 2, who: stu[0].userId, byOwn: 1 }], sure: 'mid' };
ACTS.commit(ms4.msId);
走完一趟(runOf(tm.teamId, ms4.msId), 2);
const d1 = depthOf(tm.teamId);
be('深度變深了', d1 > d0, true);
be('收下的件數', where('Runs', r => r.teamId === tm.teamId && r.state === 'done').length, 3);
be('金幣', coinsOf(tm.teamId).all, 3 * RULES.COIN.base + 30 + 20 + 20);
be('圖鑑收了幾位', Object.keys(metMobs(tm.teamId)).length >= 1, true);

/* ══ 十二 · 出口：專案做完了 ══ */
H('出口：說 → 老師開 → 走出去');
as(stu[0]);
S.page = 'pack'; S.p = {}; DRAFT = {};
be('任務清單畫得出來', PAGES.pack().length > 0, true);
be('門還鎖著', !!teamOf(tm.teamId).exitOk, false);
be('鎖著的時候走不出去', actLetGo(tm.teamId, '謝謝'), null);
actAskExit(tm.teamId);
be('說了「我們做完了」', !!teamOf(tm.teamId).exitAsk, true);
as(tea);
be('老師的出口佇列裡有他們', exitQueue(kl.classId).some(t => t.teamId === tm.teamId), true);
actDenyExit(tm.teamId);
be('老師先說還不行', !!teamOf(tm.teamId).exitAsk, false);
as(stu[0]);
actAskExit(tm.teamId);
as(tea);
actOpenExit(tm.teamId, 1);
be('門開了', !!teamOf(tm.teamId).exitOk, true);
as(stu[0]);
S.page = 'exit'; S.p = {}; DRAFT = {};
be('出口那一頁畫得出來', PAGES.exit().length > 0, true);
actLetGo(tm.teamId, '謝謝這一學期。');
const left = teamOf(tm.teamId);
be('走出去了', !!left.leftAt, true);
be('留下的那一句', left.exitWord, '謝謝這一學期。');
S.page = 'exit'; S.p = {}; DRAFT = {};
be('出去之後那一頁還畫得出來', PAGES.exit().length > 0, true);
S.page = 'home'; S.p = {}; DRAFT = {};
be('出去之後首頁還畫得出來', PAGES.home().length > 0, true);
as(tea);
be('老師那邊看得到他們出去了', !!teamOf(tm.teamId).leftAt, true);

/* ══ 十三 · 每一頁 × 每一個角色 ══ */

H('每一頁 × 每一個角色都畫得出來（專案已經結束）');
let drew = 0;
[['student', stu[0]], ['teacher', tea]].forEach(function (pair) {
  const u = pair[1];
  as(u);
  Object.keys(PAGES).forEach(function (p) {
    if (!allowed(u, p)) return;
    S.page = p; DRAFT = {};
    const anyRun = DB.Runs[0], anyMs = DB.Milestones[0];
    S.p = ['stamp', 'pick', 'camp', 'battle', 'radar', 'review'].indexOf(p) >= 0
      ? { id: anyRun.runId } : (p === 'commit' ? { id: anyMs.msId } : {});
    try {
      const out = PAGES[p]();
      if (typeof out !== 'string' || !out.trim()) fail(pair[0] + ' 的「' + p + '」是空的');
      else drew++;
    } catch (e) { fail(pair[0] + ' 的「' + p + '」炸了：' + e.message); }
  });
});
ok('畫了 ' + drew + ' 次，沒有一頁炸掉');

console.log('\n' + '═'.repeat(52));
console.log(bad ? '有 ' + bad + ' 個地方不對' : '整條流程走完，全部對得上');
