/* 一個人同時在好幾個班。

   兩種都會真的發生：

     學生　修兩門都用這套（設計專題 ＋ 互動設計），兩個班各有一組隊友、
           各有各的任務、各有各的深度與圖鑑
     老師　同時帶兩班（大四專題 ＋ 大三專題），兩邊各有各的審核佇列

   做法是「座位」：一個人有幾個座位，一個座位是「哪一班 ＋ 哪一組」，
   而 u.classId / u.teamId 永遠指著現在坐的那一個（見 40-db.js）。
   所以全站 71 個 .classId 與 239 個 .teamId 一行都不用改——它們問的
   本來就是「他現在在看的那一個」。

   真正改掉的只有一種問題：「誰在這一班／這一組」。那種不能問
   「你現在在看哪一班」，要問「你有沒有那一班的座位」（inClass／inTeam）。

   這一支驗的就是那條線有沒有漏：兩個班的資料要完全分開，而且**在 A 班
   看的時候，B 班的老師還是要看得到他**。

   跑法：node twoclass.js
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

const as = u => { S.who = u.userId; S.role = userOf(u.userId).role; DB.Session = { userId: u.userId, at: Date.now() }; };
let 錯 = [];
const ok = (c, m) => { console.log((c ? '   ✓ ' : '   ✗ ') + m); if (!c) 錯.push(m); };
const 節 = (n, t) => console.log('\n' + n + ' · ' + t + '\n' +
  '────────────────────────────────────────────────────');

console.log('\n════════════════════════════════════════════════════');
console.log('  一個人同時在好幾個班');
console.log('════════════════════════════════════════════════════');

DB = blank();

節('1', '兩個班，一位老師兩邊都帶');

const 孟 = actRegister({ account: 'tea_meng', password: 'aaaa', name: '孟老師', role: 'teacher' }).user;
const A = actNewClass('114-1 大四畢業專題', 孟.userId).klass;
ok(seatsOf(userOf(孟.userId)).length === 1, '開第一個班 → 1 個座位');

const B = actNewClass('114-1 大三互動設計', 孟.userId).klass;
const 孟座 = seatsOf(userOf(孟.userId));
ok(孟座.length === 2, '再開一個班 → 2 個座位（不是換掉第一個）');
ok(孟座.map(s => s.classId).indexOf(A.classId) >= 0 &&
   孟座.map(s => s.classId).indexOf(B.classId) >= 0, '兩個班都在他的座位裡');
ok(userOf(孟.userId).classId === B.classId, '現在坐在剛開的那一個');

/* 另一位老師只帶 A 班 */
const 薛 = actRegister({ account: 'tea_hsueh', password: 'aaaa', name: '薛老師', role: 'teacher', code: A.joinCode }).user;
ok(seatsOf(userOf(薛.userId)).length === 1, '薛老師只有 A 班');

ok(teachersOf(A.classId).length === 2, 'A 班有 2 位老師（孟、薛）');
ok(teachersOf(B.classId).length === 1, 'B 班有 1 位老師（孟）');
ok(teachersOf(A.classId).some(u => u.userId === 孟.userId),
  '孟老師人在 B 班，A 班還是找得到他　← 這就是那條線');

節('2', '一位學生修兩門');

const 美 = actRegister({ account: 'b1081201', password: 'aaaa', name: '小美', role: 'student', code: A.joinCode }).user;
ok(userOf(美.userId).classId === A.classId, '小美用 A 班的碼註冊');
as(美);
const gA = actNewTeam('第一組 · 甲', 美.userId).team;
actRename(gA.teamId, '校內共享單車調度');
ok(teamIn(userOf(美.userId), A.classId) === gA.teamId, 'A 班的座位帶著 A 班的組');

/* 加第二個班 */
const r = actJoinClass(美.userId, B.joinCode);
ok(!r.err, '小美加進 B 班：' + (r.err || r.klass.name));
const 美座 = seatsOf(userOf(美.userId));
ok(美座.length === 2, '兩個座位');
ok(userOf(美.userId).classId === B.classId, '加完直接坐到新的那一個');
ok(!userOf(美.userId).teamId, 'B 班還沒有組（要另外建）');
ok(homeFor(userOf(美.userId)) === 'myteam', '所以 B 班會先叫她建一隊');

as(美);
const gB = actNewTeam('第三組 · 丙', 美.userId).team;
actRename(gB.teamId, '選課介面重做');
ok(gB.classId === B.classId, 'B 班建的隊掛在 B 班');
ok(teamIn(userOf(美.userId), A.classId) === gA.teamId, 'A 班那一組沒有被蓋掉');
ok(teamIn(userOf(美.userId), B.classId) === gB.teamId, 'B 班那一組也在');

/* A 班的隊友 */
const 哲 = actRegister({ account: 'b1081202', password: 'aaaa', name: '阿哲', role: 'student', code: A.joinCode }).user;
as(哲); actJoinTeam(gA.joinCode, 哲.userId);
ok(where('Users', u => inTeam(u, gA.teamId)).length === 2, 'A 班那一組有 2 個人');
ok(where('Users', u => inTeam(u, gB.teamId)).length === 1, 'B 班那一組有 1 個人');
ok(where('Users', u => inTeam(u, gA.teamId)).some(u => u.userId === 美.userId),
  '小美人在 B 班，A 班那一組還是算她一個　← 這就是那條線');

節('3', '換來換去');

as(美);
ok(!actSit(美.userId, A.classId).err, '換回 A 班');
ok(userOf(美.userId).classId === A.classId && userOf(美.userId).teamId === gA.teamId,
  '班跟組一起換過去了');
ok(myTeam().name === '第一組 · 甲', 'myTeam() 回的是 A 班那一組');
ok(!actSit(美.userId, B.classId).err, '換去 B 班');
ok(myTeam().name === '第三組 · 丙', 'myTeam() 回的是 B 班那一組');
ok(!!actSit(美.userId, 'C_不存在').err, '換去一個沒有座位的班 → 擋下來');
actSit(美.userId, A.classId);

節('4', '兩個班各跑一趟，資料不會混在一起');

/* A 班的任務（薛老師派） */
as(薛);
const msA = actPublish(A.classId, { title: 'A 班 · 把問題收斂成一句話',
  mentorId: 薛.userId, teams: [gA.teamId] });
/* B 班的任務（孟老師派） */
as(孟); actSit(孟.userId, B.classId);
const msB = actPublish(B.classId, { title: 'B 班 · 使用者訪談',
  mentorId: 孟.userId, teams: [gB.teamId] });
ok(!!msA.msId && !!msB.msId, '兩個班各發一件');

/* A 班那一趟 */
as(美); actSit(美.userId, A.classId);
const runA = actCommit(gA.teamId, msA.msId, 5, [], [
  { n: '查資料', d: 2, who: 美.userId, byOwn: 1 },
  { n: '做出來', d: 3, who: 哲.userId, byOwn: 0 }], '', 2);
ok(!!runA, 'A 班承諾了');
actMyPart(gA.teamId, runA.runId, { spent: { 0: 3 }, said1: '小美在 A 班做的' });
as(哲); actMyPart(gA.teamId, runA.runId, { spent: { 1: 4 }, said1: '阿哲做的' });
as(美); actSubmit(gA.teamId, runA.runId, 'https://drive.google.com/A');

/* B 班那一趟 */
as(美); actSit(美.userId, B.classId);
const runB = actCommit(gB.teamId, msB.msId, 4, [], [
  { n: '訪談三個人', d: 4, who: 美.userId, byOwn: 1 }], '', 3);
ok(!!runB, 'B 班承諾了');
actMyPart(gB.teamId, runB.runId, { spent: { 0: 6 }, said1: '小美在 B 班做的' });
actSubmit(gB.teamId, runB.runId, 'https://drive.google.com/B');

ok(runA.runId !== runB.runId, '兩趟是兩筆');
ok(depthOf(gA.teamId) === 1 && depthOf(gB.teamId) === 1, '兩個班各自算深度');

節('5', '老師那一邊：兩個佇列不會互相看到');

as(薛);
const 薛佇 = radar(A.classId);
ok(薛佇.length === 1, '薛老師（只帶 A 班）看到 1 件');
ok(薛佇[0].run.runId === runA.runId, '而且是 A 班那一件');

as(孟); actSit(孟.userId, A.classId);
ok(radar(userOf(孟.userId).classId).length === 1, '孟老師坐在 A 班 → 看到 A 班那 1 件');
ok(radar(userOf(孟.userId).classId)[0].run.runId === runA.runId, '是 A 班那一件');
actSit(孟.userId, B.classId);
ok(radar(userOf(孟.userId).classId).length === 1, '換到 B 班 → 看到 B 班那 1 件');
ok(radar(userOf(孟.userId).classId)[0].run.runId === runB.runId, '是 B 班那一件');

/* 收下 */
as(孟); ok(!!actApprove(runB.runId, 'B 班這一件很好。', 30), '孟老師在 B 班收下');
as(薛); ok(!!actApprove(runA.runId, 'A 班這一件也很好。', 20), '薛老師在 A 班收下');

節('6', '金幣、圖鑑、匯出都分開');

ok(coinsOf(gA.teamId).all !== 0 && coinsOf(gB.teamId).all !== 0, '兩個班各自有金幣');
ok(coinsOf(gA.teamId).all === 120 && coinsOf(gB.teamId).all === 130,
  'A 組 ' + coinsOf(gA.teamId).all + ' 枚、B 組 ' + coinsOf(gB.teamId).all + ' 枚，各算各的');
const cA = exportItems(A.classId).trim().split('\n');
const cB = exportItems(B.classId).trim().split('\n');
ok(cA.length - 1 === 2, 'A 班匯出 2 件');
ok(cB.length - 1 === 1, 'B 班匯出 1 件');
ok(cA.slice(1).every(l => l.indexOf('B 班') < 0), 'A 班的檔案裡沒有 B 班的東西');
ok(cB.slice(1).every(l => l.indexOf('A 班') < 0), 'B 班的檔案裡沒有 A 班的東西');
ok(cA.slice(1).some(l => l.indexOf('小美在 A 班做的') >= 0) &&
   cB.slice(1).some(l => l.indexOf('小美在 B 班做的') >= 0),
  '小美在兩個班寫的話各自進各自的檔案');

節('7', '每一頁都畫得出來');

let 炸 = [], 畫 = 0;
[[孟, A.classId], [孟, B.classId], [薛, A.classId],
 [美, A.classId], [美, B.classId], [哲, A.classId]].forEach(function (x) {
  as(x[0]); actSit(x[0].userId, x[1]);
  const u = userOf(x[0].userId);
  Object.keys(PAGES).forEach(function (p) {
    if (!allowed(u, p)) return;
    S.page = p; S.p = {}; DRAFT = {};
    try { PAGES[p](); 畫++; } catch (e) { 炸.push(u.name + '@' + x[1] + '/' + p + '：' + e.message); }
  });
});
ok(!炸.length, '六種「誰坐在哪一班」× 每一頁都畫得出來（' + 畫 + ' 次）' +
  (炸.length ? '　→ ' + 炸.slice(0, 3).join('　') : ''));

as(美); actSit(美.userId, A.classId);
S.page = 'mkclass'; S.p = {}; DRAFT = {};
const mk = PAGES.mkclass();
/* class="seat on" 跟 class="seat" 都算，可是 .seats 那個容器也含 'seat' */
const 座數 = (mk.match(/<button class="seat/g) || []).length;
ok(座數 === 2, '「你的班」那一頁列出 2 個座位（數到 ' + 座數 + '）');
ok(/現在在這裡/.test(mk), '標出現在坐在哪一個');
ok(mk.indexOf(A.name) >= 0 && mk.indexOf(B.name) >= 0, '兩個班的名字都在');

節('8', '舊資料（這一版之前建的帳號）', '');

const 舊 = { userId: 'Uold', account: 'old01', name: '舊帳號', role: 'student',
  classId: A.classId, teamId: gA.teamId, createdAt: now() };
DB.Users.push(舊);
ok(seatsOf(舊).length === 1, '沒有 seats 的帳號，seatsOf 當場推出 1 個座位');
ok(inClass(舊, A.classId), 'inClass 認得他');
ok(inTeam(舊, gA.teamId), 'inTeam 也認得他');
ok(where('Users', u => inTeam(u, gA.teamId)).length === 3, 'A 班那一組現在數得到他');

console.log('\n════════════════════════════════════════════════════');
console.log(錯.length ? '  ✗ ' + 錯.length + ' 條沒過\n  ' + 錯.join('\n  ')
  : '  老師帶兩班、學生修兩門，兩邊的資料完全分開\n  而且人在另一個班的時候，這一班還是找得到他');
console.log('════════════════════════════════════════════════════\n');
process.exit(錯.length ? 1 : 0);
