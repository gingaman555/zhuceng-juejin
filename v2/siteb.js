/* 第二站：專案地下城 B，不分組。

   ── 它跟主站差在哪 ──

   **只差一個變項**：RULES.SOLO。協商、水晶的刻度、圖鑑的價錢、判定、
   每一句話，其餘一個字都沒有動（見 build.js 的 SITES）。

   兩站只差一個變項，那份資料才比得出東西；動第二個變項的那一刻，
   兩邊的差別就再也說不清是哪一個造成的。

   ── 不分組是怎麼做的 ──

   不是把「組」拿掉——Runs、Pushes、Keeps、圖鑑、深度、水晶全部掛在
   teamId 上（全站 239 處），拿掉它是重寫資料層。

   做的是：註冊完當場給他一支只有他自己的隊，隊名就是他的名字，
   然後把畫面上那幾句對一個人不成立的話藏起來。

   這一支驗兩件事：
     一 · 學生從頭到尾看不到任何組隊的東西
     二 · 而資料層完全沒變——判定、水晶、圖鑑、匯出跟主站一模一樣

   跑法：node siteb.js
*/
const fs = require('fs');
const path = require('path');
let MEM = {};
global.localStorage = { getItem: k => MEM[k] == null ? null : MEM[k], setItem: (k, v) => { MEM[k] = String(v); }, removeItem: k => { delete MEM[k]; } };
const st = { value: '', innerHTML: '', textContent: '', className: '', style: {}, getAttribute: () => null, setAttribute: () => { }, addEventListener: () => { }, appendChild: () => { }, insertAdjacentHTML: () => { }, querySelector: () => null, querySelectorAll: () => [], getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }), classList: { add: () => { }, remove: () => { }, toggle: () => { } }, scrollIntoView: () => { } };
global.document = { getElementById: () => Object.create(st), querySelector: () => null, querySelectorAll: () => [], createElement: () => Object.create(st), addEventListener: () => { }, body: Object.create(st), documentElement: Object.create(st), activeElement: null };
global.window = global; global.innerWidth = 390; global.scrollTo = () => { };
global.requestAnimationFrame = () => 0; global.setTimeout = () => 0; global.clearTimeout = () => { };
global.getComputedStyle = () => ({ fontSize: '11px' });
global.matchMedia = () => ({ matches: false, addListener: () => { } });
const D = path.join(__dirname, 'src');
eval(fs.readdirSync(D).filter(f => f.endsWith('.js')).sort()
  .map(f => fs.readFileSync(path.join(D, f), 'utf8')).join('\n'));

/* 這一站的設定：build.js 會把這一行接在最後面（SITES.b.rules）。 */
RULES.SOLO = 1;

const as = u => { S.who = u.userId; S.role = userOf(u.userId).role; DB.Session = { userId: u.userId, at: Date.now() }; };
let 錯 = [];
const ok = (c, m) => { console.log((c ? '   ✓ ' : '   ✗ ') + m); if (!c) 錯.push(m); };
const 節 = (n, t) => console.log('\n' + n + ' · ' + t + '\n' +
  '────────────────────────────────────────────────────');

console.log('\n════════════════════════════════════════════════════');
console.log('  專案地下城 B：不分組');
console.log('════════════════════════════════════════════════════');

節('1', '站台表：只差一個變項');

const B = JSON.parse(JSON.stringify(
  (function () {
    const s = fs.readFileSync(path.join(__dirname, 'build.js'), 'utf8');
    const m = s.match(/const SITES = \{[\s\S]*?\n\};/)[0];
    /* 註解拿掉再吃 */
    return eval('(' + m.replace('const SITES = ', '').replace(/;$/, '')
      .replace(/\/\*[\s\S]*?\*\//g, '') + ')');
  })()
));
console.log('   主站　' + B.main.title + '　rules ' + JSON.stringify(B.main.rules));
console.log('   B 站　' + B.b.title + '　rules ' + JSON.stringify(B.b.rules));
ok(B.b.title === '專案地下城 B', '站名是「專案地下城 B」');
ok(Object.keys(B.b.rules).length === 1 && B.b.rules.SOLO === 1,
  '跟主站只差一個變項（SOLO），其餘一個字都沒動');
ok(B.b.root !== B.main.root, '資料庫路徑也不一樣（' + B.b.root + '）');

/* 真的 build 出來的那一份 */
const bfile = path.join(__dirname, 'b', 'index.html');
if (fs.existsSync(bfile)) {
  const h = fs.readFileSync(bfile, 'utf8');
  ok(h.indexOf('<title>專案地下城 B</title>') >= 0, 'build 出來的那一份標題對');
  ok(/RULES\.SOLO = 1;/.test(h), 'build 出來的那一份 SOLO = 1');
} else {
  console.log('   （還沒 build b：node build.js b）');
}

節('2', '註冊完就有一支自己的隊，中間沒有組隊那一步');

DB = blank();
const t = actRegister({ account: 'tea_x', password: 'aaaa', name: '孟老師', role: 'teacher' }).user;
const kl = actNewClass('114-1 個人制', t.userId).klass;
const A = actRegister({ account: 'b1081201', password: 'aaaa', name: '小美', role: 'student', code: kl.joinCode }).user;
const u = userOf(A.userId);
ok(!!u.teamId, '註冊完當場就有隊（不用建、不用代碼）');
const g = teamOf(u.teamId);
ok(g.name === '小美', '隊名就是他的名字：' + g.name);
ok(where('Users', x => inTeam(x, g.teamId)).length === 1, '那一支隊只有他一個人');
ok(homeFor(u) === 'home', '直接落在廊道，不是「建一隊」那一頁');

/* 再兩位，各自一支 */
const C = actRegister({ account: 'b1081202', password: 'aaaa', name: '阿哲', role: 'student', code: kl.joinCode }).user;
const E = actRegister({ account: 'b1081203', password: 'aaaa', name: '雅琪', role: 'student', code: kl.joinCode }).user;
ok(where('Teams', x => x.classId === kl.classId).length === 3, '三位學生 → 三支隊');
ok(new Set(where('Teams', x => x.classId === kl.classId).map(x => x.teamId)).size === 3,
  '三支各自獨立');

節('3', '整條流程走完，資料跟主站一模一樣');

as(A); actRename(g.teamId, '校內共享單車調度');
as(t);
const ms = actPublish(kl.classId, { title: '把問題收斂成一句話', mentorId: t.userId,
  teams: where('Teams', x => x.classId === kl.classId).map(x => x.teamId) });
as(A);
const run = actCommit(g.teamId, ms.msId, 4, [], [
  { n: '查資料', d: 2, who: A.userId, byOwn: 1 },
  { n: '做出來', d: 2, who: A.userId, byOwn: 1 }], '', 2);
ok(!!run && run.state === 'running', '一個人承諾得了');
actMyPart(g.teamId, run.runId, { spent: { 0: 3, 1: 2 }, said1: '我做完了' });
ok(partsLeft(find('Runs', x => x.runId === run.runId)) === 0, '填完就是填完，沒有人要等');
as(A); actSubmit(g.teamId, run.runId, 'https://drive.google.com/abc');
as(t); ok(!!actApprove(run.runId, '很好。', RULES.CRYSTAL.bonusMax), '老師收得下');
ok(crystalOf(g.teamId).all === RULES.CRYSTAL.base + RULES.CRYSTAL.bonusMax,
  '水晶跟主站同一個刻度（' + crystalOf(g.teamId).all + ' 顆）');
ok(Object.keys(metMobs(g.teamId)).length === 1, '圖鑑收了一位');
ok(depthOf(g.teamId) === 1, '深度算得出來');
const csv = exportItems(kl.classId).trim().split('\n');
ok(csv.length - 1 === 2, '匯出一件一列（' + (csv.length - 1) + ' 列），掛在他名下');
ok(csv[1].indexOf('小美') >= 0, '而且真的是他的名字');

節('4', '學生從頭到尾看不到任何組隊的東西');

/* 「大家」不在這一張表上：一班二十個人，「大家都在下面」是對的
   ——那個「大家」指的是全班，不是一組。 */
const 詞 = ['組', '隊', '隊友', '全員', '成員', '誰做', '你們'];
/* 這幾個不算：專案名或人名裡剛好有那個字、還有「一組六碼」那種量詞 */
const 放過 = ['校內共享單車調度'];

function 掃(名, html) {
  const 中 = [];
  html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '\n')
    .split('\n').map(x => x.trim()).filter(Boolean).forEach(function (l) {
      if (l.length > 44) return;
      if (放過.some(function (w) { return l.indexOf(w) >= 0; })) return;
      詞.forEach(function (w) { if (l.indexOf(w) >= 0 && 中.indexOf(l) < 0) 中.push(l); });
    });
  if (中.length) { console.log('     ' + 名); 中.forEach(x => console.log('       ✗ ' + x)); }
  return 中;
}

as(A);
/* 深度做滿，讓每一題都開 */
for (let i = 0; i < 4; i++) {
  DB.Runs.push({ runId: 'Rz' + i, teamId: g.teamId, msId: 'Mz' + i, state: 'approved',
    stamp: 'exact', est: 3, actual: 3, plan: [], committedAt: now() - 9e8, bonus: 20 });
}
const ms2 = actPublish(kl.classId, { title: '第二件', mentorId: t.userId, teams: [g.teamId] });
as(A);
const run2 = actCommit(g.teamId, ms2.msId, 4, [], [
  { n: '訪談', d: 4, who: A.userId, byOwn: 1 }], '', 2);

let 全部 = [];
['home', 'pack', 'eco', 'codex'].forEach(function (p) {
  if (!PAGES[p] || !allowed(userOf(A.userId), p)) return;
  S.page = p; S.p = {}; DRAFT = {};
  全部 = 全部.concat(掃(p, PAGES[p]()));
});
const ms3 = actPublish(kl.classId, { title: '第三件', mentorId: t.userId, teams: [g.teamId] });
[0, 1, 2].forEach(function (s) {
  S.page = 'commit'; S.p = { id: ms3.msId, st: s };
  DRAFT = { plan: [{ n: '查資料', d: 2, who: A.userId, byOwn: 1 }] };
  全部 = 全部.concat(掃('接下委託 第 ' + (s + 1) + ' 步', PAGES.commit()));
});
btAsks(run2).forEach(function (q, i) {
  S.page = 'battle'; S.p = { id: run2.runId, ph: 'q', q: i }; DRAFT = {};
  全部 = 全部.concat(掃('交出去 ' + (i + 1) + '. ' + q.ask, PAGES.battle()));
});
ok(!全部.length, '學生走得到的每一頁，沒有一句提到組／隊／你們（掃了 13 頁）');

節('5', '那幾樣真的不見了');

S.page = 'commit'; S.p = { id: ms3.msId, st: 1 };
DRAFT = { plan: [{ n: '查資料', d: 2, who: A.userId, byOwn: 1 }] };
const c1 = PAGES.commit();
ok(c1.indexOf('planwho') < 0, '「誰做哪一件」那一顆不畫');
ok(c1.indexOf('wtag') < 0, '「全組一份／每個人各寫各的」那一行不畫');
S.page = 'home'; S.p = {}; DRAFT = {};
const h1 = PAGES.home();
ok(h1.indexOf('tmc-c">代碼') < 0, '隊伍代碼不畫');
S.page = 'battle'; S.p = { id: run2.runId, ph: 'q', q: 1 }; DRAFT = {};
ok(PAGES.battle().indexOf('class="who"') < 0, '交件頁上「這一件是誰的」那一欄不畫');

節('6', '主站那一邊沒有被弄壞');

RULES.SOLO = 0;
DB = blank();
const t2 = actRegister({ account: 'tea_y', password: 'aaaa', name: '薛老師', role: 'teacher' }).user;
const kl2 = actNewClass('主站的班', t2.userId).klass;
const F = actRegister({ account: 'b2081201', password: 'aaaa', name: '冠廷', role: 'student', code: kl2.joinCode }).user;
ok(!userOf(F.userId).teamId, '主站上註冊完**沒有**隊（要自己建）');
ok(homeFor(userOf(F.userId)) === 'myteam', '主站上會被送去「建一隊」');
as(F); const g3 = actNewTeam('第一組 · 甲', F.userId).team;
const G = actRegister({ account: 'b2081202', password: 'aaaa', name: '宜庭', role: 'student', code: kl2.joinCode }).user;
as(G); ok(!actJoinTeam(g3.joinCode, G.userId).err, '主站上用代碼加得進來');
ok(where('Users', x => inTeam(x, g3.teamId)).length === 2, '主站上一組兩個人');
as(F); S.page = 'home'; S.p = {}; DRAFT = {};
ok(PAGES.home().indexOf('代碼') >= 0, '主站上隊伍代碼還在');

console.log('\n════════════════════════════════════════════════════');
console.log(錯.length ? '  ✗ ' + 錯.length + ' 條沒過\n  ' + 錯.join('\n  ')
  : '  B 站不分組，而且只差那一個變項——其餘跟主站一模一樣');
console.log('════════════════════════════════════════════════════\n');
process.exit(錯.length ? 1 : 0);
