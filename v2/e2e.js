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
let htmlMs = PAGES.ms();
be('老師的任務頁，「刪掉的」那一區有它', htmlMs.indexOf('刪掉的（學生看不到）') >= 0 && htmlMs.indexOf('msrestore:' + msW.msId) >= 0, true);
const rst = actRestoreMs(msW.msId, tea.userId);
be('放得回去', !!rst.ms && !rst.ms.withdrawnAt, true);
be('放回去之後學生那邊又有了', runsFor(tm.teamId).some(x => x.ms.msId === msW.msId), true);
be('放回去之後又算進深度', depthOf(tm.teamId), 深前 + 1);
DRAFT = {}; htmlMs = PAGES.ms();
be('列上有「刪掉這一件」', htmlMs.indexOf('msdel:' + msW.msId) >= 0, true);
DRAFT.msDel = msW.msId; htmlMs = PAGES.ms();
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

console.log('\n' + '═'.repeat(52));
console.log(bad ? '有 ' + bad + ' 個地方不對' : '整條流程走完，全部對得上');

/* ---------- 離開碼 ----------

   這一行本來沒有，所以上面那 83 條斷言全部只是印字：不管錯幾條，
   離開碼都是 0，而 deploy 的關卡讀的正是離開碼（execSync 只有非零
   才會丟例外）。也就是說這一支從來沒有擋下過任何東西。

   跟 check.js 那次同一種：印得出錯，但沒有接到任何人身上。 */
process.exit(bad ? 1 : 0);
