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

節('6.5', '研究者那一邊只看得到真的');

/* 匯出早就照班分了，可是研究者那一頁本來直接數 DB.Classes 與 DB.Users
   ——示範那一班跟十七個示範帳號一起算進去，而那一頁存在的理由就是
   「匯出的代號要對得回是誰」。

   紀錄那一份漏的是另一種：在示範班上做的動作會寫事件（登入、回報），
   身上沒有 _d，而 login 沒有 teamId，所以照班篩的那個篩子攔不到。 */
const 示範者 = where('Users', u => u._d && u.role === 'student' && u.teamId)[0];
S.who = 示範者.userId; S.role = 'student';
logEvent('login', { by: 示範者.userId });
const 示趟 = where('Runs', x => x.teamId === 示範者.teamId && x.state === 'running')[0];
if (示趟) actMyPart(示範者.teamId, 示趟.runId, { spent: { 0: 1 }, said1: '示範的' });

const lab = where('Users', u => u.role === 'researcher')[0];
if (lab) { S.who = lab.userId; S.role = 'researcher'; DB.Session = { userId: lab.userId, at: Date.now() }; }
ok(rsClasses().every(c => !c._d),
  '名單上的班只有真的（' + rsClasses().length + ' 個，機器上共 ' +
  where('Classes', c => 1).length + ' 個）');
ok(rsUsers().every(u => !u._d),
  '名單上的人只有真的（' + rsUsers().length + ' 個，機器上共 ' +
  where('Users', u => 1).length + ' 個）');
ok(rsTeams(真班.classId).every(x => !x._d), '數組數也只數真的');

const 紀 = eventsOf(真班.classId);
const 髒 = 紀.filter(function (e) {
  const u = e.by ? userOf(e.by) : null;
  if (u && u._d) return true;
  return !!(e.teamId && where('Teams', t => t._d && t.teamId === e.teamId).length);
});
console.log('   機器上 ' + DB.Events.length + ' 筆事件，研究者看到 ' + 紀.length + ' 筆');
ok(!髒.length, '紀錄裡沒有示範帳號做的事（' + 髒.length + ' 筆髒的）');

/* ── 而且是根本沒記，不是記了再藏 ──

   上面那幾筆（示範學生登入、在示範班上回報）是真的做過的動作。
   本來每一個 act* 都會寫一筆，所以那些會變成研究資料而且**被推上雲**
   ——Events 是 SYNC_UP_ONLY，上去了就下不來也刪不掉。

   所以這一條驗的不是「篩子有沒有作用」，是「那幾筆從來沒有被寫下來」。
   數字要對得上：機器上的總數 == 研究者看到的數。 */
const 髒的有幾筆 = DB.Events.filter(function (e) {
  const u = e.by ? userOf(e.by) : null;
  if (u && u._d) return true;
  return !!(e.teamId && where('Teams', t => t._d && t.teamId === e.teamId).length);
}).length;
ok(髒的有幾筆 === 0,
  '示範那一邊的動作**根本沒有被記下來**（機器上 ' + 髒的有幾筆 + ' 筆髒的）');
ok(紀.length === DB.Events.length,
  '所以下游不用擋任何東西：機器上 ' + DB.Events.length +
  ' 筆＝研究者看到 ' + 紀.length + ' 筆');
ok(DB.Events.length > 0, '而真的那一邊照樣記（' + DB.Events.length + ' 筆）');

節('7', '登入頁預設不給示範帳號');

/* 星期三每一台機器的第一眼都是「還沒有人註冊」，所以「有人建過帳號
   就消失」擋不住那一刻——二十個學生打開登入頁，第一個看到的會是
   十七組帳號跟一行「密碼都是 1234」。

   改成要開口才給（網址帶 ?demo）。這兩條驗的是兩個分支都對。 */
/* 這一節要的是「一台還沒有人註冊的機器」，所以先把現在這一份收起來，
   驗完再放回去——下一節還要用到上面跑出來的真資料。 */
const 存起來 = DB, 存誰 = S.who, 存角 = S.role;
DB = blank(); seed();
S.who = null; S.role = null; DB.Session = null;

global.location = { search: '', hash: '', href: 'https://x/' };
const 乾淨 = PAGES.login();
ok(!demoAsked(), '沒帶 ?demo 的時候 demoAsked() 是 false');
ok(乾淨.indexOf('試用的資料') < 0, '學生看到的登入頁沒有那一塊');
ok(乾淨.indexOf(DEMO_PW) < 0, '也沒有印出密碼（' + DEMO_PW + '）');
ok(!/stu\d|tea\d|lab\d/.test(乾淨), '一個示範帳號都沒出現');
/* 「這一台的資料不對」那一顆做的是「清掉這台機器再重載」。學生不需要
   （他的機器上本來就沒有舊資料），而它看得到的時候是登入頁上唯一一個
   長得像「出事了才會用到」的東西。跟示範帳號同一個開關。 */
ok(乾淨.indexOf('這一台的資料不對') < 0, '「這一台的資料不對」那一顆也不印');

global.location = { search: '?demo', hash: '', href: 'https://x/?demo' };
const 開了 = PAGES.login();
ok(demoAsked(), '帶了 ?demo 就是 true');
ok(開了.indexOf('試用的資料') >= 0, '要展示的時候那一塊回得來');
ok(開了.indexOf(DEMO_PW) >= 0, '密碼那一行也回得來');
const 顆 = (開了.match(/asdemo:/g) || []).length;
ok(顆 === where('Users', u => u._d && u.account).length,
  '每一個示範帳號都點得進去（' + 顆 + ' 顆）');
ok(開了.indexOf('這一台的資料不對') >= 0, '重置那一顆也回得來——功能沒有被拿掉');

global.location = { search: '', hash: '#demo', href: 'https://x/#demo' };
ok(demoAsked(), '#demo 也算（有些地方會把 ? 吃掉）');
global.location = { search: '', hash: '', href: 'https://x/' };
DB = 存起來; S.who = 存誰; S.role = 存角;

節('7之二', '試用列：這台機器上有真的資料就整條不畫');

/* 2026-09-09：使用者在自己的手機上看到這一條。

   本來 demoBar 用的是 isDemo()，而它讀的 DB.Config.demo 只有 actRegister
   關得掉，而且不跟著雲端同步——所以「在電腦上註冊、在手機上登入」的人，
   手機那一台永遠是示範狀態，登入後第一眼看到的是一條寫著「試用」的列，
   裡面是十七個身分的下拉選單，包含老師跟研究者。

   兩邊都修了：畫不畫改用 isPureDemo()（見 55-ui.js），登入也會關掉那支
   旗標（見 15-auth.js 的 actLogin）。 */
(function () {
  const 存 = DB, 存誰2 = S.who, 存角2 = S.role;
  DB = blank(); seed();
  S.who = null; S.role = null; DB.Session = null;

  ok(isPureDemo(), '全新的機器是純示範狀態');
  ok(demoBar().length > 0, '純示範的時候試用列還是畫得出來（展示與口試要用）');

  /* 雲端同步下來一個真帳號，可是這台機器上沒有人註冊過 */
  DB.Users.push({ userId: 'Ureal', account: 'real1', name: '真的人', role: 'student', seats: [] });
  ok(isDemo(), 'Config.demo 還是 1——沒有人在這一台註冊過');
  ok(!isPureDemo(), '可是這台已經不是純示範了（雲端拉下了真帳號）');
  ok(demoBar().length === 0, '→ 試用列整條不畫（這就是手機上看到的那一條）');

  /* 這一條不歸 ?demo 管 */
  global.location = { search: '', hash: '', href: 'https://x/' };
  ok(!demoAsked(), '乾淨網址');
  ok(demoBar().length === 0, '乾淨網址下一樣不畫——試用列跟 ?demo 是兩道門');

  /* 真的人登入就關掉旗標，不必等雲端同步 */
  DB = blank(); seed();
  actRegister({ account: 'zz_tea', password: 'aaaa', name: '林老師', role: 'teacher' });
  DB.Config.demo = 1;   /* 裝成「在別台註冊、這台只是登入」 */
  ok(isDemo(), '裝回示範狀態');
  actLogin('zz_tea', 'aaaa');
  ok(DB.Config.demo === 0, '真的人登入就把旗標關掉了');

  /* 示範帳號登入不算——那正是要留著示範模式的那一種 */
  DB = blank(); seed();
  const 示帳 = where('Users', u => u._d && u.account)[0];
  ok(DB.Config.demo === 1, '示範資料是示範狀態');
  actLogin(示帳.account, DEMO_PW);
  ok(DB.Config.demo === 1, '示範帳號登入不會關掉——展示模式要留著');

  DB = 存; S.who = 存誰2; S.role = 存角2;
})();

節('8', '真的學生看不到示範班的東西');

as(美);
const 我的班 = userOf(美.userId).classId;
ok(我的班 === 真班.classId, '宜庭的班是真班');
ok(myTeam().teamId === 真隊.teamId, 'myTeam() 回的是真的那一隊');
const 我看到的趟 = runsFor(myTeam().teamId).length;
ok(我看到的趟 === 1, '她看得到的趟數是 1（不是 ' + (1 + 示範趟) + '）');

節('9', '示範資料在每一台機器上都一樣');

/* 2026-09-10：使用者發現手機跟電腦的示範資料不一樣。

   原因是 45-seed.js 的 T0 本來是 Date.now()——底下每一個日期都是
   ago(n)，相對於**這台機器第一次長出示範資料的那一刻**。兩台在不同
   時間打開，錨點就不同；長出來之後還會一直漂，因為停滯、睡著、期限、
   進行中那一趟花了幾天，全部是拿 now() 現算的。一份放了一週的示範
   資料看起來會像這個班荒廢了。

   改成錨在當天 0 時，加上 seedDay（跨過一天就重長一次）。 */
(function () {
  const 存 = DB;

  DB = blank(); seed(); save();
  ok(load() === true, 'seedDay 是今天 → 沿用，不重長');

  DB = blank(); seed();
  DB.Config.seedDay = DB.Config.seedDay - 1;
  save();
  ok(load() === false, 'seedDay 不是今天 → 重長（80-app.js 那一行接手 seed()）');

  DB = blank(); seed();
  actRegister({ account: 'zz_tea', password: 'aaaa', name: '林老師', role: 'teacher' });
  ok(DB.Config.demo === 0, '有人在這台註冊之後 demo 旗子關掉了');
  DB.Config.seedDay = 19700101;
  save();
  ok(load() === true, '真的資料就算 seedDay 再舊也照樣沿用——一筆都不會被洗掉');

  DB = blank(); seed(); const 甲 = JSON.stringify(DB);
  DB = blank(); seed(); const 乙 = JSON.stringify(DB);
  ok(甲 === 乙, '連長兩次完全一樣：沒有亂數，也沒有時分秒');

  DB = blank(); seed();
  const 碼 = where('Teams', function (t) { return t._d; }).map(function (t) { return t.joinCode; });
  ok(碼.every(function (c) { return /^[A-Z2-9]{6}$/.test(c); }),
    '每一支示範隊的代碼都是六碼、而且沒有 I O 0 1（' + 碼.join(' ') + '）');
  ok(new Set(碼).size === 碼.length, '而且不重複');

  DB = 存;
})();

console.log('\n════════════════════════════════════════════════════');
console.log(錯.length ? '  ✗ ' + 錯.length + ' 條沒過\n  ' + 錯.join('\n  ')
  : '  兩份資料在同一台機器上，一筆都沒有混到——示範的不上雲、不進匯出、不進榜');
console.log('════════════════════════════════════════════════════\n');
process.exit(錯.length ? 1 : 0);
