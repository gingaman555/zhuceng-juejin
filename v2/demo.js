/* 示範資料跟真的資料，在同一台機器上分不分得開。

   ── 為什麼會問這個 ──

   每一台機器打開網頁都會先看到一份示範資料（六組、九趟、走到一半的
   任務）。它是拿來看的：沒有它，第一個打開的人看到一片空白，不知道
   這東西長什麼樣。

   可是明天真的上課的時候，同一台機器上會**同時**有兩份資料：那一份
   示範的，跟這個班真的跑出來的。問題就是那一句：它們會不會混在一起。

   ── 分開的方式 ──

   示範那一批身上帶 _d（seed 打的）。而「掛在示範班上的東西」也算示範
   ——因為承諾、推進、任務之證是執行時生出來的，身上沒有 _d，可是它們
   長在示範班上（見 41-sync.js 的 onDemoSide）。

   這一條是踩過才有的：2026-09-05 量到示範班的動態上出現四筆別人留下的
   「跟老師談過」，來源是有人在示範班上測協商。那幾筆上了雲，再散到每
   一台打開網頁的機器上，而且看不出是誰弄的。

   ── 這一支驗什麼 ──

   在同一台機器上，先吃示範資料，再開一個真的班、跑一趟真的，然後問：

     一 · 推上雲的那一份，有沒有夾帶任何示範的東西
     二 · 真班的匯出，有沒有夾帶示範的趟
     三 · 示範班的匯出，有沒有夾帶真的趟
     四 · 排行榜、班級地下城、圖鑑，會不會把兩邊算在一起
     五 · 反過來：示範資料還在，畫面照樣畫得出來

   跑法：node demo.js
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
console.log('  同一台機器上，示範跟真的分不分得開');
console.log('════════════════════════════════════════════════════');

/* ── 一台剛打開網頁的機器：先吃示範資料 ── */
DB = blank(); seed();
const 示範班 = where('Classes', c => c._d)[0];
const 示範趟 = where('Runs', r => r._d).length;
console.log('\n   這台機器先有一份示範資料：' +
  where('Classes', c => c._d).length + ' 班　' +
  where('Teams', t => t._d).length + ' 隊　' +
  where('Users', u => u._d).length + ' 人　' + 示範趟 + ' 趟');

節('1', '然後老師在同一台開了一個真的班');

const 孟 = actRegister({ account: 'real_tea', password: 'aaaa', name: '孟老師', role: 'teacher' }).user;
const 真班 = actNewClass('114-1 真的班', 孟.userId).klass;
ok(!真班._d, '真的班沒有 _d 記號');
ok(真班.classId !== 示範班.classId, '真班跟示範班是兩個班');

const 美 = actRegister({ account: 'real_s1', password: 'aaaa', name: '宜庭', role: 'student', code: 真班.joinCode }).user;
as(美);
const 真隊 = actNewTeam('第一組', 美.userId).team;
const 哲 = actRegister({ account: 'real_s2', password: 'aaaa', name: '阿哲', role: 'student', code: 真班.joinCode }).user;
as(哲); actJoinTeam(真隊.joinCode, 哲.userId);
as(孟);
const 真件 = actPublish(真班.classId, { title: '真的任務', mentorId: 孟.userId, teams: [真隊.teamId] });
as(美);
const 真趟 = actCommit(真隊.teamId, 真件.msId, 0, [], [
  { n: '一起討論', d: 1, who: WHO_ALL },
  { n: '查資料', d: 2, who: 美.userId, byOwn: 1 },
  { n: '訪談', d: 3, who: 哲.userId, byOwn: 1 }], '', 2);
actMyPart(真隊.teamId, 真趟.runId, { spent: { 1: 2 }, said1: '宜庭做的' });
as(哲); actMyPart(真隊.teamId, 真趟.runId, { spent: { 2: 3 }, said1: '阿哲做的' });
as(美); actSubmit(真隊.teamId, 真趟.runId, 'https://drive.google.com/real');
as(孟); actApprove(真趟.runId, '可以。', RULES.CRYSTAL.bonusMax);
ok(!!find('Runs', r => r.runId === 真趟.runId), '真的跑完一趟（' + 真趟.est + ' 天）');

節('2', '推上雲的那一份：一筆示範的都不能有');

const 上去的 = syncFlat();
const 路徑 = Object.keys(上去的);
console.log('   要推上去 ' + 路徑.length + ' 筆');
let 夾帶 = [];
路徑.forEach(function (p) {
  const o = JSON.parse(上去的[p]);
  if (o._d) 夾帶.push(p + '（帶 _d）');
  /* 掛在示範班／示範隊上的也算 */
  if (o.classId && where('Classes', c => c._d && c.classId === o.classId).length) 夾帶.push(p + '（掛在示範班）');
  if (o.teamId && where('Teams', t => t._d && t.teamId === o.teamId).length) 夾帶.push(p + '（掛在示範隊）');
});
夾帶.slice(0, 5).forEach(x => console.log('     ' + x));
ok(!夾帶.length, '推上去的那一份完全沒有示範的東西（' + 夾帶.length + ' 筆夾帶）');

const 真的筆數 = 路徑.length;
ok(真的筆數 > 0, '而真的那一批推得上去（' + 真的筆數 + ' 筆）');

/* 反過來數一次：全部的紀錄裡有多少沒上去 */
let 全 = 0;
Object.keys(SYNC_KEY).forEach(c => { 全 += (DB[c] || []).length; });
console.log('   這台機器總共 ' + 全 + ' 筆，其中 ' + 真的筆數 + ' 筆上雲、' +
  (全 - 真的筆數) + ' 筆留在本機（示範那一批）');

節('3', '匯出：真班那一份只有真的');

const rc = exportRuns(真班.classId).trim().split('\n');
const ic = exportItems(真班.classId).trim().split('\n');
const ec = exportCsv(真班.classId).trim().split('\n');
console.log('   真班　一趟一列 ' + (rc.length - 1) + ' 列　一件一列 ' + (ic.length - 1) +
  ' 列　流水帳 ' + (ec.length - 1) + ' 列');
ok(rc.length - 1 === 1, '一趟一列剛好 1 列（真的只跑了一趟，示範那 ' + 示範趟 + ' 趟沒混進來）');
ok(ic.length - 1 === 3, '一件一列剛好 3 件');
const 示範隊名 = where('Teams', t => t._d).map(t => t.name);
const 有示範名 = rc.concat(ic).filter(l => 示範隊名.some(n => l.indexOf(n) >= 0));
ok(!有示範名.length, '匯出裡找不到任何示範組的名字');
ok(ic.some(l => l.indexOf('全體') >= 0), '而真的那一趟的「全體」有印出來');

節('4', '匯出：示範班那一份也只有示範的');

const dc = exportRuns(示範班.classId).trim().split('\n');
console.log('   示範班　一趟一列 ' + (dc.length - 1) + ' 列');
ok(dc.length - 1 === 示範趟, '示範班匯出 ' + (dc.length - 1) + ' 列＝它自己那 ' + 示範趟 + ' 趟');
ok(!dc.some(l => l.indexOf('真的任務') >= 0), '沒有夾帶真的那一趟');

節('5', '榜、班級地下城、圖鑑都不會把兩邊算在一起');

const 真榜 = rankRows(真班.classId);
const 示榜 = rankRows(示範班.classId);
console.log('   真班榜 ' + 真榜.length + ' 組　示範班榜 ' + 示榜.length + ' 組');
ok(真榜.length === 1, '真班榜上只有真的那 1 組');
ok(真榜.every(x => x.name === '第一組'), '而且是它（' + 真榜.map(x => x.name).join('、') + '）');
ok(示榜.length === where('Teams', t => t._d && t.classId === 示範班.classId).length,
  '示範班榜上只有示範的那幾組');

const 真隊們 = where('Teams', t => t.classId === 真班.classId);
ok(真隊們.length === 1 && !真隊們[0]._d, '真班底下只有一支真的隊');
ok(where('Users', u => inClass(u, 真班.classId)).length === 3,
  '真班裡三個人（孟老師、宜庭、阿哲），沒有示範的人');

/* 圖鑑跟水晶各自算 */
const 真晶 = crystalOf(真隊.teamId);
console.log('   真的那一組：水晶 ' + 真晶.all + '　圖鑑 ' +
  Object.keys(metMobs(真隊.teamId)).length + ' 位　深度 ' + depthOf(真隊.teamId));
ok(真晶.all === RULES.CRYSTAL.start + RULES.CRYSTAL.base + RULES.CRYSTAL.bonusMax,
  '水晶就是它自己那一趟算出來的');
ok(depthOf(真隊.teamId) === 1, '深度是 1（不是把示範的九趟加進去）');

節('6', '示範資料還在，畫面照樣畫得出來');

const 示生 = where('Users', u => u._d && u.role === 'student' && u.teamId)[0];
as(示生);
let 破 = [];
Object.keys(PAGES).forEach(function (p) {
  try { S.page = p; S.p = {}; DRAFT = {}; if (PAGES[p]() == null) 破.push(p); }
  catch (e) { 破.push(p + '：' + e.message.slice(0, 40)); }
});
ok(!破.length, '用示範帳號看，' + Object.keys(PAGES).length + ' 頁都不炸');
as(美);
破 = [];
Object.keys(PAGES).forEach(function (p) {
  try { S.page = p; S.p = {}; DRAFT = {}; if (PAGES[p]() == null) 破.push(p); }
  catch (e) { 破.push(p + '：' + e.message.slice(0, 40)); }
});
ok(!破.length, '用真的帳號看，也都不炸');

節('7', '真的學生看不到示範班的東西');

as(美);
const 我的班 = userOf(美.userId).classId;
ok(我的班 === 真班.classId, '宜庭的班是真班');
ok(myTeam().teamId === 真隊.teamId, 'myTeam() 回的是真的那一隊');
const 我看到的趟 = runsFor(myTeam().teamId).length;
ok(我看到的趟 === 1, '她看得到的趟數是 1（不是 ' + (1 + 示範趟) + '）');

console.log('\n════════════════════════════════════════════════════');
console.log(錯.length ? '  ✗ ' + 錯.length + ' 條沒過\n  ' + 錯.join('\n  ')
  : '  兩份資料在同一台機器上，一筆都沒有混到——示範的不上雲、不進匯出、不進榜');
console.log('════════════════════════════════════════════════════\n');
process.exit(錯.length ? 1 : 0);
