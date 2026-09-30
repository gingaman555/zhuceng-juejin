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
form('rg-name', '孟老師'); form('rg-acc', 'meng'); form('rg-pw', 'aaaa'); form('rg-pw2', 'aaaa');
ACTS.reg();
const tea = me();
be('老師的顯示名', tea && tea.name, '孟老師');

go('mkclass'); form('mk-name', '設計專題'); ACTS.mkclass();
const kl = DB.Classes[0];
ok('開班了，加入碼 ' + kl.joinCode);

/* 改班名（2026-09-23）：走正常的 save() 路徑，不是直接動資料庫。 */
go('mkclass'); form('cls-name', '設計專題（改）'); ACTS.renameclass();
be('班名改好了', DB.Classes[0].name, '設計專題（改）');

/* 兩個人。真的要上的那個班是六組每組兩人（見 45-seed.js 與 class.js），
   而組員人數會改變好幾件事的形狀：拆件掛在誰名下、「還有幾個人沒填」、
   剖面圖上一條廊道站幾個人。用四個人跑等於在測一個不存在的班。 */
const NAMES = ['王小美', '陳阿哲'];
const stu = [];
NAMES.forEach(function (n, i) {
  S.who = null; DB.Session = null;
  go('reg'); DRAFT.rgRole = 'student';
  form('rg-code', kl.joinCode); form('rg-name', n);
  form('rg-acc', 'b1100000' + i); form('rg-pw', 'aaaa'); form('rg-pw2', 'aaaa');
  ACTS.reg();
  stu.push(me());
});
be('兩個學生註冊完，名字是', stu.map(u => u.name).join('、'), NAMES.join('、'));

as(stu[0]);
be('學生改不動班名', actRenameClass(kl.classId, stu[0].userId, '亂改').err, '只有老師改得動班名。');
const tm = actNewTeam('第一組', stu[0].userId).team;
stu.slice(1).forEach(u => { as(u); actJoinTeam(tm.joinCode, u.userId); });
be('組員人數', DB.Users.filter(u => u.teamId === tm.teamId).length, NAMES.length);

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
/* 拆件的天數是 1、2、3…，一人一件。

   這裡不是加總——分工的人同一天各做各的，加起來會被人數灌水
   （見 40-db.js 的 planDays）。要徑：每個人自己那幾件相加，
   再取最慢的那一位，也就是這裡的最大值。 */
be('承諾天數（要徑：最慢的那一位）', run.est,
  NAMES.reduce((a, _, i) => Math.max(a, i + 1), 0));
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
    /* 那一句。本來只認「還有…」開頭的——而填完的人現在讀到的是
       「你那一份填好了…」，沒有一句以「還有」開頭。改成抓那張卡上
       第一句 .dim / .waiting，不預設它長什麼樣。 */
    話: (function () {
      var i = h.indexOf('act-card');
      var seg = i < 0 ? h : h.slice(i);
      var m = seg.match(/class="(?:waiting|dim)">([^<]*)</);
      return m ? m[1] : '';
    })()
  };
}
let c = 廊道鍵(stu[0]);
/* 2026-09-23：鍵不再分三種字——不管填了幾個人，都是「交出去給老師」，
   因為資料層從來不擋單一個人交（見 60-student.js 的 doingCard）。
   量到的問題是畫面上只講「還在等 N 個人」，沒有一顆鍵明講「你現在
   就可以交」，很多組卡在「進行中」，其實是每個人都以為要等別人。 */
be('一個人都還沒填 · 鍵', c.鍵, '交出去給老師');
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
/* 填完的人跟沒填的人看到的要不一樣（見 60-student.js）。
   兩邊都驗——只驗一邊的話，把兩句話寫成一樣也會過。 */
const 已 = 廊道鍵(stu[0]), 未 = 廊道鍵(stu[1]);
be('填完的那一位 · 話', /你那一份填好了/.test(已.話), true);
be('填完的那一位 · 鍵', 已.鍵, '交出去給老師');
be('還沒填的那一位 · 話', /你還沒填自己那一份/.test(未.話), true);
be('還沒填的那一位 · 鍵', 未.鍵, '交出去給老師');
be('兩個人看到的不一樣', 已.話 !== 未.話, true);
c = 未;
be('填了一個 · 狀態沒動', find('Runs', x => x.runId === run.runId).state, 'running');

填自己那一份(stu[1], 1, 4);
c = 廊道鍵(stu[0]);
be('全填完 · 鍵', c.鍵, '交出去給老師');
be('全填完 · 話', /還沒有人交出去/.test(c.話), true);

const mid = find('Runs', x => x.runId === run.runId);
be('兩個人的實際天數', JSON.stringify(mid.spent), JSON.stringify([1, 4]));
be('兩句「我做了什麼」', Object.keys(mid.said).length, 2);
as(tea);
be('老師還看不到（還沒交）', radar(kl.classId).some(x => x.run.runId === run.runId), false);

/* ══ 五 · 交出去 ══ */
H('交出去');
as(stu[1]);
S.page = 'battle'; S.p = { id: run.runId }; DRAFT = {};
be('第一次遇到他，先停在選單頁', btPhase(find('Runs', x => x.runId === run.runId)), 'menu');
ACTS.btgo(run.runId);
DRAFT = {}; S.p = { id: run.runId, ph: 'q', q: 1 }; PAGES.battle();
be('存過的數字帶回畫面', JSON.stringify(DRAFT.spent), JSON.stringify([1, 4]));
DRAFT.where = 'TronClass 第三次作業';
DRAFT.feel = 'bad'; DRAFT.why = '第二個受訪者臨時改期';
DRAFT.scope = 'less';
S.p = { id: run.runId, ph: 'q', q: btAsks(run).length - 1 };
ACTS.btnext(run.runId);
const sub = find('Runs', x => x.runId === run.runId);
be('狀態', sub.state, 'submitted');
be('判定', !!sub.stamp, true);
be('組的三題都寫進去了', [sub.link, sub.feel, sub.scope].join('|'),
  'TronClass 第三次作業|bad|less');
be('個人那兩樣沒被洗掉', JSON.stringify(sub.spent), JSON.stringify([1, 4]));
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
be('每一個人的名字都印出來', NAMES.filter(n => rv.indexOf(n) >= 0).length, NAMES.length);
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
/* 加成用規則裡的最大值，不寫死——刻度改了測試不用跟著改。 */
const 加 = RULES.CRYSTAL.bonusMax;
actApprove(run.runId, '這一次找得到了。', 加);
const done = find('Runs', x => x.runId === run.runId);
be('狀態', done.state, 'done');
be('收下之後圖鑑裡有他了', !!metMobs(tm.teamId)[mobName], true);
/* 進場那 200 也算在裡面（見 20-rules.js 的 start）。 */
be('水晶', crystalOf(tm.teamId).all, RULES.CRYSTAL.start + RULES.CRYSTAL.base + 加);
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
  DRAFT.where = '放你桌上'; DRAFT.feel = 'ok';
  S.p = { id: r.runId, ph: 'q', q: btAsks(r).length - 1 };
  ACTS.btnext(r.runId);
  as(tea);
  actApprove(r.runId, '可以。', RULES.CRYSTAL.bonusMin);
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
be('水晶', crystalOf(tm.teamId).all, RULES.CRYSTAL.start + 3 * RULES.CRYSTAL.base + 加 + 2 * RULES.CRYSTAL.bonusMin);
be('圖鑑收了幾位', Object.keys(metMobs(tm.teamId)).length >= 1, true);

/* ══ 十二 · 出口：專案做完了 ══ */
H('出口：說 → 老師開 → 走出去');
as(stu[0]);
S.page = 'pack'; S.p = {}; DRAFT = {};
be('任務清單畫得出來', PAGES.pack().length > 0, true);
/* 老師還沒開放結案之前，「我們做完了」那顆鍵連畫都不畫——
   不是畫出來按不下去，是整段不存在（見 63-pack.js）。 */
be('老師還沒開放結案，那顆鍵不存在', PAGES.pack().indexOf('我們做完了') >= 0, false);
as(tea);
be('學生用不了這個開關', actSetExitOpen(kl.classId, stu[0].userId, true), null);
actSetExitOpen(kl.classId, tea.userId, true);
be('老師開放結案', classOf(tea).exitOpen, true);
as(stu[0]);
S.page = 'pack'; S.p = {}; DRAFT = {};
be('開放之後那顆鍵才出現', PAGES.pack().indexOf('我們做完了') >= 0, true);
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

/* ══ 承諾可以用小時／週，不用天（2026-09-23）══ */
H('承諾用小時');
as(tea);
const msH = actPublish(kl.classId, { title: '半天內回', due: 8, dueU: 'h', teams: [] });
as(stu[0]);
S.page = 'commit'; S.p = { id: msH.msId, st: 2 }; DRAFT = {};
DRAFT.plan = []; DRAFT.sure = 'mid';
ACTS.estunit('h');
be('切成小時之後，畫面記得這個單位', DRAFT.estU, 'h');
DRAFT.estN = 8;
ACTS.commit(msH.msId);
const runH = runOf(tm.teamId, msH.msId);
be('存的還是天，8 小時大約 0.33 天', Math.abs(runH.est - 8 / 24) < 0.001, true);
be('原始講的單位跟數字有記著', runH.estU + ' ' + runH.estN, 'h 8');
be('畫面印得出「8 小時」不是「0.33 天」', estSay(runH), '8 小時');
/* 當天交，判定不該被「actual 最少算 1 天」拖累到不公平。 */
be('容差有吃住短任務（BAND_MIN）', RULES.band(runH.est), 1);
be('當天交＝準', RULES.judge(runH.est, 1).key, 'exact');
be('拖三天才交＝晚了', RULES.judge(runH.est, 3).key, 'late');

/* ══ 拆件明細也能用小時／週（2026-09-23）══ */
H('拆件明細用小時');
const msH2 = actPublish(kl.classId, { title: '拆件用小時', teams: [] });
S.page = 'commit'; S.p = { id: msH2.msId, st: 2 }; DRAFT = {};
DRAFT.plan = [{ n: '打樣', d: 1, who: stu[0].userId }];
DRAFT.sure = 'mid';
ACTS.plandu('0');
ACTS.plandu('0');
be('這一件的單位輪到了小時', DRAFT.plan[0].dU, 'h');
be('切單位會重設成那個單位的預設值', DRAFT.plan[0].dN, 8);
ACTS.pland('0,1');
be('加減鍵動的是原始數字，不是天', DRAFT.plan[0].dN, 9);
be('存的 d 是換算過的天', Math.abs(DRAFT.plan[0].d - 9 / 24) < 0.001, true);
be('planDays 直接讀 d，混單位一樣加得對', planDays(DRAFT.plan), DRAFT.plan[0].d);
ACTS.commit(msH2.msId);
const runH2 = runOf(tm.teamId, msH2.msId);
be('承諾存好了', !!runH2, true);
be('那一件的單位有跟著存進 run.plan', runH2.plan[0].dU + ' ' + runH2.plan[0].dN, 'h 9');

/* ══ 手上有一趟在做，老師又派的另一件也開得了（2026-09-29）══ */
H('兩件並行：手上有事，另一件從任務清單開得了');
const msP = actPublish(kl.classId, { title: '並行的另一件', note: '', steps: [], due: 7, teams: [] });
/* 前面的段落把這一組送出去結案了，這裡要一組還在走的。 */
tm.leftAt = 0; tm.exitAsk = 0; tm.exitNo = 0; tm.exitOk = 0;
as(stu[0]); S.page = 'pack'; S.p = null; DRAFT = {};
const nxP = nextThing(tm.teamId);
be('首頁還是只推手上那一件', nxP.kind, 'doing');
const htmlP = PAGES.pack();
be('任務清單有「說幾天」開新的那一件', htmlP.indexOf('go:commit:' + msP.msId) >= 0, true);
const firstRun = nxP.row.run;
const other = runsFor(tm.teamId).filter(x => x.run.state === 'running' && x.run.runId !== firstRun.runId)[0];
be('手上另一件在做的，清單也有「交出去」', !other || htmlP.indexOf('go:battle:' + other.run.runId) >= 0, true);
const rP = actCommit(tm.teamId, msP.msId, 2, [], [], 'wild', 'mid');
be('第二件承諾得了（資料層不擋）', !!rP && rP.state === 'running', true);
be('第一件沒被動到', runOf(tm.teamId, firstRun.msId).state, 'running');
const subP = actSubmit(tm.teamId, rP.runId, '');
be('第二件先交得出去', !!subP && subP.state === 'submitted', true);
be('第一件還在進行中', runOf(tm.teamId, firstRun.msId).state, 'running');
be('第二件的判定只讀它自己的兩個數字', RULES.judge(rP.est, subP.actual).key, subP.stamp);

/* ══ 同一組同一件任務有兩筆 Run（2026-09-29）══

   同組兩位隊友在不同裝置上同時按「承諾」，各建了一筆。本來系統只顯示
   陣列裡第一筆，已經交出去的那筆排在後面，審核清單就是空的。 */
H('同組同任務兩筆 Run：交出去的那筆不能被擋在後面');
const msD = actPublish(kl.classId, { title: '兩筆的那一件', note: '', steps: [], due: 7, teams: [] });
DB.Runs.push({ runId: 'RD1', teamId: tm.teamId, msId: msD.msId, state: 'running', est: 3, committedAt: 1000, said: {}, flags: [], plan: [], steps: [], stamp: null });
DB.Runs.push({ runId: 'RD2', teamId: tm.teamId, msId: msD.msId, state: 'submitted', est: 1, committedAt: 2000, submittedAt: 3000, actual: 1, stamp: 'exact', said: {}, flags: [], plan: [], steps: [] });
be('同一件任務，認進度最前面的那筆（已交出），不是陣列裡第一筆', runOf(tm.teamId, msD.msId).runId, 'RD2');
be('審核清單看得到那一筆', radar(kl.classId).some(x => x.run.runId === 'RD2'), true);
DB.Runs.reverse();
be('陣列順序反過來，答案不變（每一台機器看到同一筆）', runOf(tm.teamId, msD.msId).runId, 'RD2');
DB.Runs.push({ runId: 'RD3', teamId: tm.teamId, msId: msD.msId, state: 'done', est: 1, committedAt: 2500, submittedAt: 3100, actual: 1, stamp: 'exact', said: {}, flags: [], plan: [], steps: [] });
be('老師收下的那筆比已交出的優先', runOf(tm.teamId, msD.msId).runId, 'RD3');
be('已交出但排在後面的那筆，審核清單一樣列出來（不會悄悄不見）', radar(kl.classId).some(x => x.run.runId === 'RD2'), true);

/* ══ 老師刪掉派出去的任務（2026-09-30）══

   不是真的刪：學生看不到、審核清單看不到、不再擋住下一件、不算進深度與準度。
   紀錄一筆都不動，可以放回去。 */
H('老師刪掉派出去的任務');
const msW = actPublish(kl.classId, { title: '要被刪掉的那一件', note: '', steps: [], due: 7, teams: [], mentorId: tea.userId });
const rW = actCommit(tm.teamId, msW.msId, 2, [], [], 'wild', 'mid');
const 深前 = depthOf(tm.teamId);
actSubmit(tm.teamId, rW.runId, '');
be('交出去之後審核清單看得到', radar(kl.classId).some(x => x.run.runId === rW.runId), true);
be('交出去之後深度加一', depthOf(tm.teamId), 深前 + 1);
be('學生不能刪', actWithdrawMs(msW.msId, stu[0].userId).err ? 1 : 0, 1);
const wr = actWithdrawMs(msW.msId, tea.userId);
be('老師刪得掉', !!wr.ms && !!wr.ms.withdrawnAt, true);
be('學生那邊的任務清單沒有它', runsFor(tm.teamId).some(x => x.ms.msId === msW.msId), false);
be('審核清單沒有它', radar(kl.classId).some(x => x.run.runId === rW.runId), false);
be('不再算進深度', depthOf(tm.teamId), 深前);
be('紀錄還在（一筆都沒動）', !!find('Runs', r => r.runId === rW.runId) && find('Runs', r => r.runId === rW.runId).state === 'submitted', true);
be('再刪一次會回說已經刪掉', actWithdrawMs(msW.msId, tea.userId).err ? 1 : 0, 1);
as(stu[0]); S.page = 'commit'; S.p = { id: msW.msId }; DRAFT = {};
be('學生打開被刪掉的任務，找不到', PAGES.commit().indexOf('找不到這一個任務') >= 0, true);
as(tea); S.page = 'ms'; S.p = null; DRAFT = {};
S.page = 'mslist'; let htmlMs = PAGES.mslist();
be('老師的任務頁，「刪掉的」那一區有它', htmlMs.indexOf('刪掉的（學生看不到）') >= 0 && htmlMs.indexOf('msrestore:' + msW.msId) >= 0, true);
const rst = actRestoreMs(msW.msId, tea.userId);
be('放得回去', !!rst.ms && !rst.ms.withdrawnAt, true);
be('放回去之後學生那邊又有了', runsFor(tm.teamId).some(x => x.ms.msId === msW.msId), true);
be('放回去之後又算進深度', depthOf(tm.teamId), 深前 + 1);
DRAFT = {}; htmlMs = PAGES.mslist();
be('列上有「刪掉這一件」', htmlMs.indexOf('msdel:' + msW.msId) >= 0, true);
DRAFT.msDel = msW.msId; htmlMs = PAGES.mslist();
be('按一下先問，不直接刪', htmlMs.indexOf('msdelyes:' + msW.msId) >= 0 && !find('Milestones', m => m.msId === msW.msId).withdrawnAt, true);

H('結案搬到側欄最下面');
as(tea); S.page = 'radar'; DRAFT = {};
be('審核頁上方不再有「結案」分頁', PAGES.radar().indexOf('tq:exit') >= 0, false);
const sb = sideBar();
be('側欄有結案這一格', sb.indexOf('data-go="tclose"') >= 0, true);
be('結案那一格標成 low（放在最下面、跟上面隔開）', /class="[^"]*low[^"]*" data-go="tclose"/.test(sb), true);
be('結案是側欄的最後一格', sb.lastIndexOf('data-go="') === sb.indexOf('data-go="tclose"'), true);
S.page = 'tclose'; DRAFT = {};
const htmlC = PAGES.tclose();
be('結案頁畫得出來，有「確認整個專案已完成」', htmlC.indexOf('確認整個專案已完成') >= 0, true);
be('確認鍵不直接開門，要先問', htmlC.indexOf('closeconf:') >= 0 && htmlC.indexOf('openexit:' + tm.teamId + ',1') < 0, true);
DRAFT.closeConf = tm.teamId;
be('問了之後才有「對，整個專案完成了」', PAGES.tclose().indexOf('對，整個專案完成了') >= 0, true);
be('結案頁開頭講清楚：確認的是整個專案，不是收作業', htmlC.indexOf('整個專案已經完成') >= 0 && htmlC.indexOf('不是收下一件作業') >= 0, true);
be('學生進不了老師的結案頁', allowed(stu[0], 'tclose'), false);
/* 老師認的是「這一組是哪幾位」：等你的清單與審核頁也寫組員名字 */
as(tea); S.page = 'radar'; S.p = {}; DRAFT = {};
const 名 = stu.filter(u => u.teamId === tm.teamId).map(u => u.name);
be('等你的清單每一列寫著組員名字', radar(kl.classId).filter(x => x.team.teamId === tm.teamId).length > 0 && 名.every(n => PAGES.radar().indexOf(n) >= 0), true);
const rvR = radar(kl.classId).filter(x => x.team.teamId === tm.teamId)[0];
S.page = 'review'; S.p = { id: rvR.run.runId };
be('審核頁標題下面寫著組員名字', 名.every(n => PAGES.review().indexOf(n) >= 0), true);
be('結案頁把組別名放正常字級（不是淡色小字）', htmlC.indexOf('<p><b>') >= 0, true);
be('結案頁每一組旁邊寫著組員的名字', tm && stu.filter(u => u.teamId === tm.teamId).every(u => htmlC.indexOf(u.name) >= 0), true);
DRAFT.closeConf = tm.teamId;
be('確認的那一句也寫著是哪幾位', stu.filter(u => u.teamId === tm.teamId).every(u => PAGES.tclose().indexOf(u.name) >= 0), true);
DRAFT.closeConf = null;

/* ══ 系統通知：只給還開著舊版分頁的人看，新版當它不存在 ══ */
H('系統通知（notice）新版看不到');
DB.Milestones.push({ msId: 'MN1', classId: kl.classId, mentorId: '', title: '你的網頁是舊版', note: '請關掉重開', steps: [], teams: [], due: 0, dueU: '', at: 1, notice: true });
as(stu[0]); S.page = 'pack'; S.p = null; DRAFT = {};
be('學生的任務清單沒有它', runsFor(tm.teamId).some(x => x.ms.msId === 'MN1'), false);
be('學生的 msFor 沒有它', msFor(tm.teamId).some(m => m.msId === 'MN1'), false);
S.page = 'commit'; S.p = { id: 'MN1' };
be('硬要打開也找不到', PAGES.commit().indexOf('找不到這一個任務') >= 0, true);
as(tea); S.page = 'ms'; S.p = null; DRAFT = {};
be('老師的發派任務頁沒有列它', PAGES.ms().indexOf('你的網頁是舊版') >= 0, false);
be('已派任務頁也沒有列它', PAGES.mslist().indexOf('你的網頁是舊版') >= 0, false);
be('動態沒有它', feedOf(kl.classId, 50).some(f => f.ms && f.ms.msId === 'MN1'), false);
be('不進審核清單', radar(kl.classId).some(x => x.ms && x.ms.msId === 'MN1'), false);
DB.Milestones = DB.Milestones.filter(m => m.msId !== 'MN1');

/* ══ 老師派的任務可以同時做（2026-09-30）══

   首頁上主要的動作只有一個，其他老師派的任務直接列在下面，每一件一顆鍵；
   兩件以上還沒開始的，可以一次開（一件一件接著說幾天）。 */
H('同時做：首頁直接列出其他任務，可以一次開好幾件');
as(stu[0]);
const rowsBefore = runsFor(tm.teamId);
S.page = 'home'; S.p = {}; DRAFT = {};
const nxH = nextThing(tm.teamId);
const otherFresh = runsFor(tm.teamId).filter(x => x.run.state === 'fresh');
const homeHtml = PAGES.home();
if (nxH.kind === 'doing' && otherFresh.length) {
  be('手上有事，首頁直接有「也可以同時做」', homeHtml.indexOf('也可以同時做') >= 0, true);
  be('每一件還沒開始的，首頁各有一顆「開始」鍵', otherFresh.every(x => homeHtml.indexOf('go:commit:' + x.ms.msId) >= 0), true);
} else {
  ok('（這一組目前沒有「手上有事又有新任務」的狀況，略過首頁斷言）');
}
be('舊的「老師又派了 N 個」橫幅沒有了', homeHtml.indexOf('老師又派了') >= 0, false);

/* 一組乾淨的隊：沒有在做的事，老師派過好幾件 → 首頁大鍵一件、其餘列在下面、可以一次開 */
DB.Teams.push({ teamId: 'GP1', classId: kl.classId, name: '並行測試組', project: '並行', joinCode: 'PPPPPP' });
DB.Users.push({ userId: 'UP1', account: 'par1', name: '並行', role: 'student', classId: kl.classId, teamId: 'GP1', hero: 'adv' });
const upar = find('Users', u => u.userId === 'UP1');
as(upar); S.page = 'home'; S.p = {}; DRAFT = {};
const nxP2 = nextThing('GP1');
be('沒有在做的事：首頁推「有任務發來了」', nxP2.kind, 'commit');
const freshIds = runsFor('GP1').filter(x => x.run.state === 'fresh').map(x => x.ms.msId);
const htmlP2 = PAGES.home();
be('老師派了不只一件', freshIds.length >= 2, true);
be('大鍵是第一件', htmlP2.indexOf('go:commit:' + nxP2.row.ms.msId) >= 0, true);
be('其餘每一件各有一顆鍵', freshIds.filter(id => id !== nxP2.row.ms.msId).every(id => htmlP2.indexOf('go:commit:' + id) >= 0), true);
be('有「一次開 N 件」', htmlP2.indexOf('commitall') >= 0 && htmlP2.indexOf('一次開這 ' + freshIds.length + ' 件') >= 0, true);

ACTS.commitall();
be('一次開：先進第一件的承諾頁', S.page === 'commit' && S.p.id === freshIds[0], true);
be('記著要接力的隊伍', S.queue.length === freshIds.length && S.queueN === freshIds.length, true);
be('承諾頁告訴他這是第幾件', PAGES.commit().indexOf('一次開 ' + freshIds.length + ' 件：這是第 1 件') >= 0, true);
let 步 = 0;
while (S.page === 'commit' && 步++ < freshIds.length + 3) {
  DRAFT.sure = 'mid'; DRAFT.est = 2; DRAFT.plan = DRAFT.plan || [];
  ACTS.commit(S.p.id);
}
be('每一件都各自承諾了', runsFor('GP1').filter(x => x.run.state === 'running').length, freshIds.length);
be('每一件的 Run 各自一筆', freshIds.every(id => where('Runs', r => r.teamId === 'GP1' && r.msId === id).length === 1), true);
be('全部說完之後回到首頁', S.page, 'home');
be('接力的隊伍散掉了', !S.queue, true);
const 各 = where('Runs', r => r.teamId === 'GP1' && r.state === 'running');
be('每一件的編號是固定的（組、任務、第幾次）', 各.every(r => r.runId === 'R_GP1_' + r.msId + '_1'), true);

/* 同時有好幾件在做：燈看最晚的那一件，不是只看第一件 */
各.forEach(r => { r.committedAt = Date.now(); });
be('都沒逾時：不暗', stallOf('GP1').level, 0);
各[各.length - 1].committedAt = Date.now() - 10 * 86400000;
be('最後一件逾時很久：整個廊道暗（不是只看第一件）', stallOf('GP1').level, 2);
const nxDo = nextThing('GP1');
const htmlDo = PAGES.home();
be('同時有好幾件在做：首頁大鍵一件、其餘的「交出去」各一顆', 各.filter(r => r.runId !== nxDo.row.run.runId).every(r => htmlDo.indexOf('go:battle:' + r.runId) >= 0), true);
S.page = 'pack'; S.p = {};
be('任務清單那一頁也有同一張卡', PAGES.pack().indexOf('也可以同時做') >= 0, true);

/* 手上已經有一件在做，老師還有別件沒開：首頁大鍵是手上那件，別件各一顆「開始」 */
DB.Teams.push({ teamId: 'GP2', classId: kl.classId, name: '並行測試組二', project: '並行二', joinCode: 'QQQQQQ' });
DB.Users.push({ userId: 'UP2', account: 'par2', name: '並行二', role: 'student', classId: kl.classId, teamId: 'GP2', hero: 'adv' });
as(find('Users', u => u.userId === 'UP2')); S.page = 'home'; S.p = {}; DRAFT = {};
const ids2 = runsFor('GP2').filter(x => x.run.state === 'fresh').map(x => x.ms.msId);
actCommit('GP2', ids2[0], 2, [], [], 'wild', 'mid');
const nx2 = nextThing('GP2'), html2 = PAGES.home();
be('手上有一件在做', nx2.kind, 'doing');
be('其餘每一件各有一顆「開始」', ids2.slice(1).every(id => html2.indexOf('go:commit:' + id) >= 0), true);
be('沒有把手上那一件再列一次', html2.indexOf('go:commit:' + ids2[0]) >= 0, false);
be('剩下兩件以上，還是可以一次開', html2.indexOf('一次開這 ' + (ids2.length - 1) + ' 件') >= 0, true);
ACTS.commitall();
be('一次開只包含還沒開始的', S.queue.length, ids2.length - 1);

/* ══ 沒取專案名稱不能擋在做事的前面（2026-09-30）══

   9/30 用真實資料量到：42 組裡 26 組沒取名字，13 組已經有任務在做，
   首頁被「先取名字」蓋住，看不到自己的任務。 */
H('沒有專案名稱：老師派了任務就不擋，還沒派才問名字');
DB.Teams.push({ teamId: 'GP3', classId: kl.classId, name: '沒取名字的組', project: '', joinCode: 'RRRRRR' });
DB.Users.push({ userId: 'UP3', account: 'par3', name: '沒取名', role: 'student', classId: kl.classId, teamId: 'GP3', hero: 'adv' });
as(find('Users', u => u.userId === 'UP3')); S.page = 'home'; S.p = {}; DRAFT = {};
be('老師已經派了任務：首頁推任務，不是取名字', nextThing('GP3').kind, 'commit');
const htmlN = PAGES.home();
be('大鍵是去看任務', htmlN.indexOf('go:commit:') >= 0, true);
be('取名字是一顆不擋路的小按鈕', htmlN.indexOf('幫專案取個名字') >= 0 && htmlN.indexOf('go:sign') >= 0, true);
DB.Classes.push({ classId: 'CZ', name: '空班', joinCode: 'ZZZZZZ' });
DB.Teams.push({ teamId: 'GP4', classId: 'CZ', name: '空班的組', project: '', joinCode: 'SSSSSS' });
DB.Users.push({ userId: 'UP4', account: 'par4', name: '空班學生', role: 'student', classId: 'CZ', teamId: 'GP4', hero: 'adv' });
as(find('Users', u => u.userId === 'UP4')); DRAFT = {};
be('老師還沒派任何一件：才推取名字（第一個動作不可以是等）', nextThing('GP4').kind, 'name');
DB.Teams.forEach(t => { if (t.teamId === 'GP3') t.project = '有名字了'; });
as(find('Users', u => u.userId === 'UP3')); DRAFT = {};
be('取了名字之後，小按鈕不再出現', PAGES.home().indexOf('幫專案取個名字') >= 0, false);

/* ══ 研究者清掉測試資料（2026-09-30，「研究者只能看」的第三個例外）══

   形狀開得很窄：只刪名字有「測試」「演練」的班、只刪沒有班的帳號；
   真的班、學生太多的班、非研究者都刪不了。 */
H('研究者清掉測試資料');
DB.Users.push({ userId: 'URS', account: 'rs_t', name: '研究者', role: 'researcher' });
const rsU = find('Users', u => u.userId === 'URS');
/* 一個測試班：老師一位、學生兩位、一組、一個任務、一趟、一張 */
DB.Classes.push({ classId: 'CT1', name: '測試｜上線前演練', joinCode: 'TTTTT1' });
DB.Users.push({ userId: 'UT1', account: 'dr_t', name: '測試老師', role: 'teacher', classId: 'CT1' });
DB.Users.push({ userId: 'UT2', account: 'dr_s1', name: '測試學生1', role: 'student', classId: 'CT1', teamId: 'GT1' });
DB.Users.push({ userId: 'UT3', account: 'dr_s2', name: '測試學生2', role: 'student', classId: 'CT1', teamId: 'GT1' });
DB.Teams.push({ teamId: 'GT1', classId: 'CT1', name: '測試隊', project: '測試', joinCode: 'TTTTT2' });
DB.Milestones.push({ msId: 'MT1', classId: 'CT1', mentorId: 'UT1', title: '演練任務', note: '', steps: [], teams: [], due: 0, dueU: '', at: 1 });
DB.Runs.push({ runId: 'RT1', teamId: 'GT1', msId: 'MT1', state: 'done', est: 1, actual: 1, stamp: 'exact', committedAt: 1, said: {}, flags: [], plan: [], steps: [] });
DB.Keeps.push({ keepId: 'KT1', teamId: 'GT1', runId: 'RT1', name: '演練', at: 1 });
/* 兩個掛在已不存在的班上的帳號 */
DB.Users.push({ userId: 'UO1', account: 'wed_t', name: '孤兒一', role: 'student', classId: 'CGONE1' });
DB.Users.push({ userId: 'UO2', account: 'ra_t', name: '孤兒二', role: 'student', classId: 'CGONE2' });
const 真班人數 = DB.Users.filter(u => u.classId === kl.classId).length, 真班Run = DB.Runs.filter(r => (teamOf(r.teamId) || {}).classId === kl.classId).length;

as(rsU); S.page = 'rs'; S.p = {}; DRAFT = {};
let htmlR = PAGES.rs();
be('研究者頁面看得到「清掉測試資料」', htmlR.indexOf('清掉測試資料') >= 0, true);
be('列出測試班，還有沒有班的帳號', htmlR.indexOf('測試｜上線前演練') >= 0 && htmlR.indexOf('wed_t') >= 0, true);
be('真的班沒有被列成可刪的', htmlR.indexOf('rsdel:' + kl.classId) >= 0, false);
be('學生刪不了', actResearcherDeleteTestClass(stu[0].userId, 'CT1').err ? 1 : 0, 1);
be('老師刪不了', actResearcherDeleteTestClass(tea.userId, 'CT1').err ? 1 : 0, 1);
be('真的班就算研究者也刪不了', actResearcherDeleteTestClass(rsU.userId, kl.classId).err ? 1 : 0, 1);
be('真的班沒有被動到', DB.Users.filter(u => u.classId === kl.classId).length, 真班人數);
DRAFT.rsDel = 'CT1'; htmlR = PAGES.rs();
be('按一下先問，不直接刪', htmlR.indexOf('rsdelyes:CT1') >= 0 && !!find('Classes', c => c.classId === 'CT1'), true);
const evN = DB.Events.length;
const del = actResearcherDeleteTestClass(rsU.userId, 'CT1');
be('研究者刪得掉測試班', del.users + '個帳號 ' + del.teams + '組 ' + del.runs + '趟', '3個帳號 1組 1趟');
be('班、帳號、組、任務、Run、Keep 都不見了', ['Classes', 'Users', 'Teams', 'Milestones', 'Runs', 'Keeps'].every(t => !DB[t].some(x => x.classId === 'CT1' || x.teamId === 'GT1' || x.msId === 'MT1' || x.keepId === 'KT1' || x.runId === 'RT1')), true);
be('真的班一筆都沒少', DB.Users.filter(u => u.classId === kl.classId).length, 真班人數);
be('真的班的 Run 一筆都沒少', DB.Runs.filter(r => (teamOf(r.teamId) || {}).classId === kl.classId).length, 真班Run);
be('留下一筆事件說做了什麼', DB.Events.length > evN && DB.Events[DB.Events.length - 1].kind === 'deletetest', true);
be('孤兒帳號沒被測試班那一刪牽連', DB.Users.filter(u => /^(wed_t|ra_t)$/.test(u.account)).length, 2);
be('非研究者刪不了孤兒帳號', actResearcherDeleteOrphans(tea.userId).err ? 1 : 0, 1);
const dO = actResearcherDeleteOrphans(rsU.userId);
be('研究者刪得掉沒有班的帳號', dO.users, 2);
be('真的班還是一筆都沒少', DB.Users.filter(u => u.classId === kl.classId).length, 真班人數);
be('再刪一次會回說沒有', actResearcherDeleteOrphans(rsU.userId).err ? 1 : 0, 1);
htmlR = PAGES.rs();
be('清光之後，這一區不再出現', htmlR.indexOf('清掉測試資料') >= 0, false);
/* 名字不像測試班、學生又多的，也不能刪 */
DB.Classes.push({ classId: 'CT2', name: '測試班但人很多', joinCode: 'TTTTT3' });
for (let i = 0; i < 21; i++) DB.Users.push({ userId: 'UM' + i, account: 'mm' + i, name: '多' + i, role: 'student', classId: 'CT2' });
be('學生超過二十位的「測試班」不刪', actResearcherDeleteTestClass(rsU.userId, 'CT2').err ? 1 : 0, 1);
DB.Users = DB.Users.filter(u => !/^UM\d+$/.test(u.userId)); DB.Classes = DB.Classes.filter(c => c.classId !== 'CT2');

/* ══ 研究者刪掉多的學生帳號（2026-09-30）══

   只有「沒有任何個人痕跡」的學生帳號刪得掉；有做過事的、老師、研究者都不行。 */
H('研究者刪多的學生帳號');
as(rsU);
/* 一個空組（沒人、沒任務）、一個只有一位空帳號的組、一個有做過事的帳號 */
DB.Teams.push({ teamId: 'GE1', classId: kl.classId, name: '空組一', project: '', joinCode: 'EEEEE1' });
DB.Teams.push({ teamId: 'GE2', classId: kl.classId, name: '只有一位的組', project: '', joinCode: 'EEEEE2' });
DB.Users.push({ userId: 'UE1', account: 'dup_a', name: '重複的人', role: 'student', classId: kl.classId, teamId: 'GE2', hero: 'adv' });
const 前人數 = DB.Users.length, 前組數 = DB.Teams.length;
const 真人 = stu[0];
be('空帳號刪得掉的原因是空的', whyNotDeletable(find('Users', u => u.userId === 'UE1')), '');
be('做過事的帳號刪不了（有寫過話或被指定過）', (() => {
  const tr = userTraces(真人); return (tr.said + tr.plan + tr.events) > 0 ? whyNotDeletable(真人) !== '' : true;
})(), true);
DB.Runs.push({ runId: 'RE1', teamId: 'GE2', msId: (DB.Milestones[0] || {}).msId, state: 'running', est: 1, said: { UE1: '我寫過' }, flags: [], plan: [], steps: [], committedAt: 1 });
be('寫過「我做了什麼」的帳號刪不了', whyNotDeletable(find('Users', u => u.userId === 'UE1')) !== '', true);
be('研究者也刪不了他', actResearcherDeleteAccount(rsU.userId, 'UE1').err ? 1 : 0, 1);
DB.Runs = DB.Runs.filter(r => r.runId !== 'RE1');
be('學生不能刪別人', actResearcherDeleteAccount(stu[0].userId, 'UE1').err ? 1 : 0, 1);
be('老師不能刪', actResearcherDeleteAccount(tea.userId, 'UE1').err ? 1 : 0, 1);
be('老師帳號不能從這裡刪', actResearcherDeleteAccount(rsU.userId, tea.userId).err ? 1 : 0, 1);
be('研究者帳號不能刪', actResearcherDeleteAccount(rsU.userId, rsU.userId).err ? 1 : 0, 1);
S.page = 'rsacc'; S.p = {}; DRAFT = {};
let htmlA = PAGES.rsacc();
be('頁面先說系統看過幾個、再分區', htmlA.indexOf('系統看過了') >= 0 && htmlA.indexOf('做過事，刪不了') >= 0, true);
be('空帳號有一顆可以按的鍵', htmlA.indexOf('rsaccpick:UE1') >= 0, true);
be('有做過事的沒有可以按的鍵', htmlA.indexOf('rsaccpick:' + stu[0].userId) >= 0 ? (whyNotDeletable(stu[0]) === '') : true, true);
DRAFT.rsAcc = 'UE1'; DRAFT.rsAccConfirm = true; htmlA = PAGES.rsacc();
be('按一下先問，不直接刪', htmlA.indexOf('rsaccyes') >= 0 && !!userOf('UE1'), true);
const dA = actResearcherDeleteAccount(rsU.userId, 'UE1');
be('刪掉了那個空帳號', !userOf('UE1'), true);
be('他那一組因此沒人、沒任務，一起刪', dA.team === true && !teamOf('GE2'), true);
be('其他帳號一個都沒少', DB.Users.length, 前人數 - 1);
be('沒相關的組一個都沒少（只少了他那一組）', DB.Teams.length, 前組數 - 1);
be('空組被列出來', emptyTeams().some(t => t.teamId === 'GE1'), true);
be('有人的組、有任務的組不算空組', emptyTeams().every(t => teamHasMembers(t.teamId) === false && teamHasWork(t.teamId) === false), true);
const dT = actResearcherDeleteEmptyTeams(rsU.userId);
be('空組刪得掉', dT.n >= 1 && !teamOf('GE1'), true);
be('真的班的帳號、組別一筆都沒少', DB.Users.filter(u => u.classId === kl.classId).length + '/' + tm.teamId, 真班人數 + '/' + tm.teamId);
be('留下事件', DB.Events.slice(-2).map(e => e.kind).join(','), 'deleteaccount,deleteteams');

/* ══ 連點與重複儲存（2026-09-30，事件紀錄：連續同一個動作 28 組、挑角色 87 次是同一個）══ */
H('連點擋一下、挑同一個角色不重複寫');
be('第一下放行', actGuard('hero:mage', 1000), true);
be('0.8 秒內的第二下擋掉', actGuard('hero:mage', 1500), false);
be('不同的動作不受影響', actGuard('hero:knight', 1500), true);
be('過了 0.8 秒又放行', actGuard('hero:mage', 2000), true);
be('會存資料的動作都在名單上', ['hero', 'rename', 'askexit', 'commit', 'jointeam', 'approve', 'reject'].every(n => ACT_ONCE[n]), true);
be('加減鍵與導覽不在名單上（本來就要連按）', !ACT_ONCE.go && !ACT_ONCE.pland && !ACT_ONCE.plandu, true);
as(stu[0]); ACTS.hero('mage');                     /* 先確定現在是 mage */
const heroN = () => DB.Events.filter(e => e.kind === 'hero' && e.teamId === stu[0].teamId).length;
const hero0 = stu[0].hero, ev0 = heroN();
ACTS.hero(hero0); ACTS.hero(hero0);
be('選跟現在一樣的角色（連按兩次）：不多記事件', heroN() - ev0, 0);
const evH = DB.Events.length;
ACTS.hero(hero0 === 'mage' ? 'knight' : 'mage');
be('換成別的角色：記一筆', DB.Events.length - evH, 1);
const evH2 = DB.Events.length, cur = stu[0].hero;
ACTS.hero(cur);
be('再選同一個：不再記', DB.Events.length - evH2, 0);

/* ══ 新任務來了，剛打開就跳出通知（2026-09-30）══ */
H('新任務通知');
const uN = find('Users', u => u.userId === 'UP3');
as(uN); S.page = 'home'; S.p = {}; DRAFT = {};
if (DB.Config) delete DB.Config.ackMs;
const 待 = taskNoticeFor(uN);
be('還沒開始的任務都算新任務', 待.length, runsFor('GP3').filter(x => x.run.state === 'fresh').length);
be('新任務不是零個', 待.length > 0, true);
be('通知的畫面有標題、有兩顆鍵', 待.every(m => taskNoticeHtml(待).indexOf(m.title) >= 0 || 待.indexOf(m) >= 5) && taskNoticeHtml(待).indexOf('tngo') >= 0 && taskNoticeHtml(待).indexOf('tnok') >= 0, true);
be('超過五個只列五個、其餘寫「還有 N 個」', 待.length <= 5 || taskNoticeHtml(待).indexOf('還有 ' + (待.length - 5) + ' 個') >= 0, true);
S.page = 'commit'; be('寫到一半的頁面（承諾）不跳', taskNoticeReady(), false);
S.page = 'battle'; be('交作業那一頁不跳', taskNoticeReady(), false);
S.page = 'home'; be('回到首頁才跳', taskNoticeReady(), true);
ACTS.tnok();
be('按「知道了」之後，這些任務不再跳', taskNoticeFor(uN).length, 0);
be('記在這台機器（Config），不進雲端的資料表', !!(DB.Config.ackMs.UP3), true);
const msNew = actPublish(kl.classId, { title: '剛派下來的新任務', note: '', steps: [], teams: [], mentorId: tea.userId });
be('老師又派一件：只有這一件是新的', taskNoticeFor(uN).map(m => m.msId).join(','), msNew.msId);
S.page = 'home'; ACTS.tngo();
be('只有一個新任務：「去看看」直接進那一件的承諾頁', S.page === 'commit' && S.p.id === msNew.msId, true);
be('按過就記下了', taskNoticeFor(uN).length, 0);
/* 已經開始做的任務不算新 */
const msNew2 = actPublish(kl.classId, { title: '又一件', note: '', steps: [], teams: [], mentorId: tea.userId });
actCommit('GP3', msNew2.msId, 2, [], [], 'wild', 'mid');
be('這一組已經開始的任務不再跳', taskNoticeFor(uN).some(m => m.msId === msNew2.msId), false);
/* 兩個以上：回首頁 */
const msA = actPublish(kl.classId, { title: '甲任務', note: '', steps: [], teams: [], mentorId: tea.userId });
const msB = actPublish(kl.classId, { title: '乙任務', note: '', steps: [], teams: [], mentorId: tea.userId });
S.page = 'home'; ACTS.tngo();
be('兩個以上：回首頁（大鍵一件、其餘列在下面）', S.page, 'home');
/* 誰不跳 */
be('老師不跳', taskNoticeFor(tea).length, 0);
be('研究者不跳', taskNoticeFor(rsU).length, 0);
be('示範帳號不跳', taskNoticeFor({ userId: 'UD', role: 'student', _d: 1, teamId: 'GP3' }).length, 0);
be('沒有組別的學生不跳', taskNoticeFor({ userId: 'UX', role: 'student', teamId: '' }).length, 0);
SYNC.blocked = 1; be('這一頁已被停用：不跳', taskNoticeReady(), false); SYNC.blocked = 0;
SYNC.on = 1; SYNC.first = {}; S.page = 'home';
be('還沒跟雲端核對過第一次：不跳（本機可能是舊的）', taskNoticeReady(), false);
SYNC.first = { Milestones: 1, Runs: 1, Teams: 1 }; be('核對過了：可以跳', taskNoticeReady(), true);
SYNC.on = 0; SYNC.first = {};

/* ══ 發派任務與已派任務分開；誰派的寫清楚（2026-09-30，多位老師共同帶一個班）══ */
H('發派任務／已派任務分成兩頁，分清楚是誰派的');
DB.Users.push({ userId: 'UTB', account: 'tb_t', name: '另一位老師', role: 'teacher', classId: kl.classId });
const teaB = find('Users', x => x.userId === 'UTB');
const msMine = actPublish(kl.classId, { title: '我派的那一件', note: '', steps: [], teams: [], mentorId: tea.userId });
const msOther = actPublish(kl.classId, { title: '別的老師派的那一件', note: '', steps: [], teams: [], mentorId: teaB.userId });
as(tea); S.page = 'ms'; S.p = {}; DRAFT = {};
const fm = PAGES.ms();
be('發派任務那一頁有表單（題目、派出去）', fm.indexOf('ms-title') >= 0 && fm.indexOf('publish') >= 0, true);
be('發派任務那一頁不再列全班的清單', fm.indexOf('我派的那一件') >= 0 || fm.indexOf('別的老師派的那一件') >= 0, false);
be('發派任務那一頁有一顆去看已派任務的鍵', fm.indexOf('go:mslist') >= 0, true);
S.page = 'mslist'; DRAFT = {};
const ml = PAGES.mslist();
be('已派任務那一頁兩件都列', ml.indexOf('我派的那一件') >= 0 && ml.indexOf('別的老師派的那一件') >= 0, true);
be('有「你派的」那一張卡', ml.indexOf('你派的　') >= 0, true);
be('別的老師另外一張卡，寫著他的名字', ml.indexOf('另一位老師 派的　') >= 0, true);
const iMine = ml.indexOf('我派的那一件'), iOther = ml.indexOf('別的老師派的那一件'), iBy = ml.indexOf('另一位老師 派的　');
be('我派的在「你派的」那張卡裡、別人的在他自己那張卡裡', iMine >= 0 && iMine < iBy && iOther > iBy, true);
be('我派的那一列寫「你派的」', ml.slice(iMine - 20, iMine + 200).indexOf('你派的') >= 0, true);
be('別人派的那一列寫他的名字', ml.slice(iOther - 20, iOther + 200).indexOf('另一位老師 派的') >= 0, true);
DRAFT.msDel = msOther.msId;
be('刪別人派的，確認那一句講是誰派的', PAGES.mslist().indexOf('這是另一位老師派的') >= 0, true);
DRAFT = {};
as(teaB); S.page = 'mslist';
const mlB = PAGES.mslist(), jO = mlB.indexOf('別的老師派的那一件');
be('換成另一位老師看：他的那一件是「你派的」', mlB.slice(jO - 20, jO + 200).indexOf('你派的') >= 0, true);
be('原本那位變成別人，寫著他的名字', mlB.indexOf(tea.name + ' 派的　') >= 0, true);
as(tea);
const sbT = sideBar();
be('左邊導覽有「已派任務」、在「發派任務」後面', sbT.indexOf('data-go="mslist"') > sbT.indexOf('data-go="ms"') && sbT.indexOf('data-go="ms"') > 0, true);
be('發派任務與已派任務各有自己的圖示，不是同一張', !!ICONS.ms && !!ICONS.mslist && JSON.stringify(ICONS.ms) !== JSON.stringify(ICONS.mslist), true);
be('每一張圖示都是 12×12', ICONS.mslist.length === 12 && ICONS.mslist.every(r => r.length === 12), true);
{ const sb3 = sideBar(); const ic = k => { const i = sb3.indexOf('data-go="' + k + '"'); return sb3.slice(i, sb3.indexOf('</a>', i)); };
  be('左邊導覽上兩格畫出來的圖不一樣', ic('ms').replace(/data-go="ms"/, '') !== ic('mslist').replace(/data-go="mslist"/, ''), true); }
be('刪掉這一件的鍵是小的', PAGES.mslist().indexOf('btn ghost sm') >= 0, true);
be('學生進不了已派任務頁', allowed(stu[0], 'mslist'), false);
be('研究者也進不了', allowed(rsU, 'mslist'), false);
DB.Users.push({ userId: 'UTC', account: 'tc_t', name: '還沒派的老師', role: 'teacher', classId: kl.classId });
S.page = 'mslist';
const ml3 = PAGES.mslist();
be('班上還沒派過的老師也列出來', ml3.indexOf('還沒派過的老師') >= 0 && ml3.indexOf('還沒派的老師') >= 0, true);
/* 派完直接去看清單 */
S.page = 'ms'; DRAFT = { msTitle: '派完去看的那一件' };
const domT = document.getElementById; document.getElementById = (id) => id === 'ms-title' ? { value: '派完去看的那一件' } : (id === 'ms-note' ? { value: '' } : domT.call(document, id));
ACTS.publish(); document.getElementById = domT;
be('按「派出去」之後直接進已派任務頁', S.page, 'mslist');
be('剛派的那一件在「你派的」裡', PAGES.mslist().indexOf('派完去看的那一件') >= 0, true);

/* ══ 結案的誤按：手機上量出來的（2026-09-30）══ */
H('結案入口的誤按：開放結案要問一次、每組第一步是安靜的鍵');
as(tea); S.page = 'tclose'; DRAFT = {};
const klX = classOf(tea); const 原本開著 = !!klX.exitOpen; klX.exitOpen = false;
const t0 = PAGES.tclose();
be('關著的時候，一開始只有「開放結案」的第一步，沒有直接生效的鍵', t0.indexOf('exitopenask') >= 0 && t0.indexOf('exitopenset:1') < 0, true);
be('按了「開放結案」的第一步，還沒開', !klX.exitOpen, true);
ACTS.exitopenask();
const t1 = PAGES.tclose();
be('問了之後才出現「對，開放」', t1.indexOf('exitopenset:1') >= 0 && t1.indexOf('對，開放') >= 0, true);
be('問的那一句講清楚後果（學生會看到那顆鍵）', t1.indexOf('我們做完了') >= 0, true);
be('有「先不要」', t1.indexOf('exitopenno') >= 0, true);
ACTS.exitopenno();
be('先不要：回到第一步，還是沒開', !klX.exitOpen && PAGES.tclose().indexOf('exitopenset:1') < 0, true);
ACTS.exitopenask(); ACTS.exitopenset('1');
be('確認之後才開', !!klX.exitOpen, true);
be('開了之後，問的狀態清掉了（不會停在「確定嗎」）', !DRAFT.exitOpenConf, true);
const t2 = PAGES.tclose();
be('開著的時候「關掉」一下就行（收回是安全的）', t2.indexOf('exitopenset:0') >= 0, true);
klX.exitOpen = 原本開著;
/* 每一組的第一步是安靜的鍵，確認那一步才是大鍵 */
DRAFT = {};
const tc = PAGES.tclose();
const firstStep = tc.slice(tc.indexOf('closeconf:') - 80, tc.indexOf('closeconf:') + 20);
be('每組「確認整個專案已完成」的第一步是 ghost 鍵，不是金色大鍵', firstStep.indexOf('btn ghost') >= 0 && firstStep.indexOf('btn big') < 0, true);
DRAFT.closeConf = tm.teamId;
const tcc = PAGES.tclose();
be('確認那一步才是大鍵', tcc.slice(tcc.indexOf('openexit:' + tm.teamId + ',1') - 80, tcc.indexOf('openexit:' + tm.teamId + ',1')).indexOf('btn big') >= 0, true);
DRAFT = {};

/* ══ 帳號分析（2026-09-30）：刪之前先看系統怎麼分 ══

   量真實資料：十二個「可以刪」的帳號，十個是還沒開始用的真學生，兩個是三分鐘內
   註冊兩次的 PANZER／PANZER67。「可以刪」不等於「是多的」，所以先分四種、寫理由。
   分析只讀，不動任何資料。 */
H('帳號分析：只讀、分四種、寫理由');
as(rsU);
const mk = (id, account, name, extra) => DB.Users.push(Object.assign({ userId: id, account, name, role: 'student', classId: kl.classId, teamId: '', createdAt: 1000000 }, extra || {}));
mk('UA1', 'realone', '王小明');
mk('UA2', 'test_abc', '路人甲');
mk('UA3', 'tmp1', '路人乙');
mk('UA4', 'Yu.S', '謝宇婷');
mk('UA5', 'twin_a', '雙胞胎', { createdAt: 2000000 });
mk('UA6', 'twin_b', '雙胞胎', { createdAt: 2000000 + 3 * 60000 });
mk('UA7', 'a1', 'Bo');
mk('UA8', 'a2', 'Co');
mk('UA9', 'ghostacct', '掛在別班', { classId: 'C_GONE', teamId: '' });
DB.Runs.push({ runId: 'RA1', teamId: tm.teamId, msId: (DB.Milestones[0] || {}).msId, state: 'running', est: 1, said: { UA5: '我做了這個' }, flags: [], plan: [], steps: [], committedAt: 1 });
const 前 = JSON.stringify([DB.Users, DB.Teams, DB.Runs, DB.Classes]);
const an = id => acctAnalysis(find('Users', u => u.userId === id));
be('正常名字、沒證據他是多的 → 看不出是多的', an('UA1').tier, 'unsure');
be('帳號有 test → 幾乎確定是測試', an('UA2').tier, 'test');
be('帳號 tmp1 → 幾乎確定是測試', an('UA3').tier, 'test');
be('Yu.S 是真學生的帳號，不能被當測試（尾巴的 .S 不算）', an('UA4').tier, 'unsure');
be('同名、另一個做過事（雙胞胎 B）→ 很可能是重複註冊', an('UA6').tier, 'dup');
be('理由裡寫出另一個帳號做過幾個動作', an('UA6').bits.some(b => /做過 \d+ 個動作/.test(b) && b.indexOf('twin_a') >= 0), true);
be('理由裡寫出註冊只差幾分鐘', an('UA6').bits.some(b => /只差 3 分鐘/.test(b)), true);
be('做過事的（雙胞胎 A）是「做過事，刪不了」，不是重複', an('UA5').tier, 'busy');
be('帳號太短的不算雙胞胎（a1／a2）', an('UA7').tier + '/' + an('UA8').tier, 'unsure/unsure');
be('掛在已不存在的班上 → 走「清掉測試資料」', an('UA9').tier, 'gone');
be('分析是只讀的：帳號、組、趟、班一個字都沒變', JSON.stringify([DB.Users, DB.Teams, DB.Runs, DB.Classes]), 前);
S.page = 'rsacc'; S.p = {}; DRAFT = {};
const hA = PAGES.rsacc();
be('頁面有各區', ['幾乎確定是測試', '很可能是重複註冊', '看不出是多的', '測試班的帳號'].every(k => hA.indexOf(k) >= 0), true);
be('理由印在名字下面', hA.indexOf('帳號或名字有 test') >= 0 && hA.indexOf('只差 3 分鐘') >= 0, true);
be('測試班的帳號沒有單一刪除鍵', hA.indexOf('rsaccpick:UA9') < 0, true);
be('做過事的沒有單一刪除鍵', hA.indexOf('rsaccpick:UA5') < 0, true);
DRAFT.rsAcc = 'UA1'; DRAFT.rsAccConfirm = true;
const hU = PAGES.rsacc();
be('確認頁寫系統的看法', hU.indexOf('系統的看法') >= 0 && hU.indexOf('像還沒開始用的真學生') >= 0, true);
be('「看不出是多的」的確認鍵不是大鍵，字也不同', hU.indexOf('我確定他是多的，刪掉') >= 0 && hU.slice(hU.indexOf('rsaccyes') - 60, hU.indexOf('rsaccyes')).indexOf('btn big') < 0, true);
DRAFT.rsAcc = 'UA2'; const hT = PAGES.rsacc();
be('測試帳號的確認鍵是一般的', hT.indexOf('對，刪掉這個帳號') >= 0, true);
DRAFT = {};
DB.Users = DB.Users.filter(u => !/^UA\d$/.test(u.userId));
DB.Runs = DB.Runs.filter(r => r.runId !== 'RA1');

console.log('\n' + '═'.repeat(52));
console.log(bad ? '有 ' + bad + ' 個地方不對' : '整條流程走完，全部對得上');

/* ---------- 離開碼 ----------

   這一行本來沒有，所以上面那 83 條斷言全部只是印字：不管錯幾條，
   離開碼都是 0，而 deploy 的關卡讀的正是離開碼（execSync 只有非零
   才會丟例外）。也就是說這一支從來沒有擋下過任何東西。

   跟 check.js 那次同一種：印得出錯，但沒有接到任何人身上。 */
process.exit(bad ? 1 : 0);
