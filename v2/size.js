/* 一個班最多裝得下幾組幾個人。跑：node v2/size.js（cwd 在 v2）

   不是猜的：把班撐大，每一種尺寸都跑一個學期（三趟委託、全部收下），
   然後量四件會先壞掉的東西——

     一　存得下嗎　　localStorage 一個網域大約 5 MB，整個資料庫是
     　　　　　　　　一個字串塞進去的（見 40-db.js 的 save）
     二　畫得動嗎　　全班那幾頁（班級地下城、剖面圖、榜、老師的清單）
     　　　　　　　　每一組都要畫一次
     三　id 會不會撞
     四　老師一次要看幾件

   跑完會說在哪一個尺寸上第一個東西先壞。 */
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
global.innerWidth = 390; global.innerHeight = 844;
global.scrollTo = () => {};
global.requestAnimationFrame = () => 0; global.cancelAnimationFrame = () => {};
global.setTimeout = () => 0; global.clearTimeout = () => {};
global.getComputedStyle = () => ({ fontSize: '11px' });
global.matchMedia = () => ({ matches: false, addListener: () => {} });
const SRC = path.join(process.cwd(), 'src');
eval(fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort()
  .map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n'));

const pad = (s, w) => { let L = 0; for (const c of String(s)) L += c.charCodeAt(0) > 255 ? 2 : 1; return String(s) + ' '.repeat(Math.max(1, w - L)); };
function as(u) { S.who = u.userId; DB.Session = { userId: u.userId, at: Date.now() }; }

/* localStorage 一個網域的上限，各家瀏覽器大約 5 MB。
   整個資料庫是一個 JSON 字串，所以是它一個人在用。 */
const 上限 = 5 * 1024 * 1024;
/* 一頁畫超過這個時間，手機上就感覺得到了。 */
const 慢 = 120;

function 造班(組數, 每組, 趟數) {
  DB = blank();
  const cid = 'C1';
  DB.Classes.push({ classId: cid, name: '設計專題', joinCode: 'AAAAAA',
    teacherId: 'T0', startedAt: now() - 30 * DAY });
  const teas = [];
  for (let i = 0; i < 3; i++) {
    const u = { userId: 'T' + i, account: 'tea' + i, name: '老師' + i,
      role: 'teacher', classId: cid, createdAt: now() };
    DB.Users.push(u); teas.push(u);
  }
  const teams = [];
  for (let g = 0; g < 組數; g++) {
    const t = { teamId: 'G' + g, classId: cid, name: '第' + (g + 1) + '組',
      project: '專案' + g, joinCode: 'C' + g, joinedAt: now() - 30 * DAY };
    DB.Teams.push(t);
    const mems = [];
    for (let k = 0; k < 每組; k++) {
      const u = { userId: 'S' + g + '_' + k, account: 's' + g + '_' + k,
        name: '學生' + g + '' + k, role: 'student', classId: cid,
        teamId: t.teamId, hero: 'adv', createdAt: now() };
      DB.Users.push(u); mems.push(u);
    }
    teams.push({ t: t, mems: mems });
  }
  /* 一學期的委託 */
  for (let r = 0; r < 趟數; r++) {
    const m = { msId: 'M' + r, classId: cid, mentorId: teas[r % 3].userId,
      title: '第' + (r + 1) + '件任務', note: '寫清楚你要解決什麼。',
      steps: ['查', '做', '收'], teams: [], due: now() + 7 * DAY, at: now() };
    DB.Milecrystals.push(m);
    teams.forEach(function (g, gi) {
      const run = {
        runId: 'R' + gi + '_' + r, teamId: g.t.teamId, msId: m.msId,
        state: 'done', est: 4, actual: 3 + (gi % 3),
        stamp: ['early', 'exact', 'late'][(gi + r) % 3],
        plan: g.mems.map((u, i) => ({ n: '第' + (i + 1) + '件', d: 2, who: u.userId, byOwn: 1 })),
        spent: g.mems.map(() => 2),
        said: g.mems.reduce((a, u) => { a[u.userId] = u.name + '這一趟做的事情寫在這裡'; return a; }, {}),
        sure: 'mid', feel: 'ok', why: '第二個受訪者臨時改期，所以往後挪了兩天',
        scope: 'same', next: '把第三件收尾，那一件只做了一半',
        link: 'TronClass 第' + (r + 1) + '次作業',
        word: '看過了，第二段的範圍你們自己也發現變大了。', wordBy: teas[gi % 3].userId,
        bonus: 20, flags: [], overs: [], pushes: 0,
        committedAt: now() - (10 - r) * DAY, submittedAt: now() - (9 - r) * DAY,
        doneAt: now() - (8 - r) * DAY
      };
      DB.Runs.push(run);
    });
  }
  return { cid: cid, teas: teas, teams: teams };
}

function 量(組數, 每組, 趟數) {
  const w = 造班(組數, 每組, 趟數);
  const 出 = { 組: 組數, 人: 組數 * 每組, 趟: DB.Runs.length };

  /* 一 · 存得下嗎 */
  const json = JSON.stringify(DB);
  出.位元組 = json.length;

  /* 二 · 畫得動嗎（各畫三次取最快的一次，避開暖機） */
  function 計(名, fn) {
    let best = Infinity, err = '';
    for (let i = 0; i < 3; i++) {
      const t0 = Date.now();
      try { fn(); } catch (e) { err = e.message; break; }
      best = Math.min(best, Date.now() - t0);
    }
    if (err) { 出.壞 = (出.壞 || '') + 名 + '：' + err + ' '; return 0; }
    return best;
  }
  as(w.teas[0]);
  出.老師的清單 = 計('radar', function () { S.page = 'radar'; S.p = {}; DRAFT = {}; PAGES.radar(); });
  出.全班進度 = 計('classeco', function () { S.page = 'classeco'; S.p = {}; DRAFT = {}; PAGES.classeco(); });
  as(w.teams[0].mems[0]);
  出.班級地下城 = 計('eco', function () { S.page = 'eco'; S.p = {}; DRAFT = {}; PAGES.eco(); });
  出.廊道 = 計('home', function () { S.page = 'home'; S.p = {}; DRAFT = {}; PAGES.home(); });
  出.榜 = 計('rank', function () { rankRows(w.cid); });

  /* 三 · id 會不會撞 */
  出.撞id = DB.Users.map(u => u.userId).filter((x, i, a) => a.indexOf(x) !== i).length;

  /* 四 · 老師一次要看幾件 */
  DB.Runs.forEach(r => { r.state = 'submitted'; });
  as(w.teas[0]);
  出.待審 = radar(w.cid).length;
  return 出;
}

console.log('\n一個班撐到多大　（每一種都跑一學期三趟委託、全部收下）');
console.log('─'.repeat(76));
console.log('  ' + pad('組×人', 12) + pad('人數', 7) + pad('趟數', 7) +
  pad('資料庫', 11) + pad('佔上限', 8) + pad('全班進度', 10) + pad('剖面圖', 9) + '待審');
const 表 = [];
/* 全部兩人一組——那是真的要上的組態（六組每組兩人）。

   本來這個階梯混著 ×4、×5，量出來的「一個班撐到多大」因此是別的班的
   數字。組員人數直接決定每一趟有幾件、每一件掛在誰名下、剖面圖上
   一條廊道要畫幾個人，所以它不是一個可以隨便換的參數。 */
[[6, 2], [10, 2], [15, 2], [20, 2], [30, 2], [40, 2], [60, 2], [100, 2], [150, 2]].forEach(function (x) {
  const r = 量(x[0], x[1], 3);
  表.push(r);
  const kb = (r.位元組 / 1024);
  console.log('  ' + pad(x[0] + '×' + x[1], 12) + pad(r.人, 7) + pad(r.趟, 7) +
    pad(kb < 1024 ? Math.round(kb) + ' KB' : (kb / 1024).toFixed(1) + ' MB', 11) +
    pad(Math.round(r.位元組 / 上限 * 100) + '%', 8) +
    pad(r.全班進度 + ' ms', 10) + pad(r.班級地下城 + ' ms', 9) +
    r.待審 + ' 件' + (r.壞 ? '　✗ ' + r.壞 : ''));
});

console.log('\n' + '─'.repeat(76));
const 壞了 = 表.filter(r => r.壞);
const 爆了 = 表.filter(r => r.位元組 > 上限);
const 卡了 = 表.filter(r => Math.max(r.全班進度, r.班級地下城, r.老師的清單) > 慢);
console.log('  畫不出來的尺寸：' + (壞了.length ? 壞了.map(r => r.組 + ' 組').join('、') : '沒有'));
console.log('  存不下的尺寸　：' + (爆了.length ? 爆了.map(r => r.組 + ' 組').join('、') : '沒有（都在 5 MB 以內）'));
console.log('  畫超過 ' + 慢 + 'ms：' + (卡了.length ? 卡了.map(r => r.組 + ' 組').join('、') : '沒有'));
console.log('  id 撞號　　　　：' + (表.some(r => r.撞id) ? '有' : '沒有'));
