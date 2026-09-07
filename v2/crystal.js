/* 水晶：收集得到，也交換得出去。

   ── 它是什麼 ──

   委託人收下你那一件的時候給的一顆會發光的水晶。它有兩個身分：

     收集　　你手上有幾顆，看得見、數得出來（一件三顆，所以三顆就是
             三件事——一百顆不是水晶，是錢）
     交換　　放一顆到圖鑑上，那個黑影就亮起來

   ── 為什麼要有第二個身分 ──

   一個班六組、一學期八趟，而委託人有 34 位分在六層。**有些人他這輩子
   走不到**——那幾層他沒去過，那幾位就永遠是黑影。收集這一層因此對
   一部分學生是關著的，而且關的理由跟他做得好不好無關。

   ── 為什麼不會變成花錢跳過老師 ──

   圖鑑的解鎖本來綁在「老師收下一件」上，那是刻意的。照亮不取代它：

     遇過　　老師收下了你為他做的那一件。他跟你說過六句話
     照亮　　你只是知道有這麼一個人。那六句話一句都沒有

   圖鑑上兩種標得不一樣（.cxi.met ／ .cxi.lit），這一支驗那條線沒有糊掉。

   跑法：node crystal.js
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
console.log('  水晶：收集得到，也交換得出去');
console.log('════════════════════════════════════════════════════');

節('1', '刻度');

console.log('   一件收下 ' + RULES.CRYSTAL.base + ' 顆　老師多給 ' +
  RULES.CRYSTAL.bonusMin + '–' + RULES.CRYSTAL.bonusMax + ' 顆　點亮一位 ' +
  RULES.CRYSTAL.light + ' 顆');

/* 這裡不驗「數字要小」——刻度是使用者定的（100／10–50／300），而數字
   大小本身沒有對錯。要守的是**比例**，因為比例才決定行為：

     老師多給的那幾份要看得出來，不然他那一下「我想多說一點」在畫面上
     等於沒有發生；可是也不能大到蓋過基本額，不然它就從一句話變成
     一條路（見 20-rules.js）。

     點亮的價錢要讓一學期只點得亮兩三位，不然圖鑑就變成用水晶換的，
     而「老師收下一件，你就多認識一位」那句話會垮掉。 */
const 佔比 = Math.round(RULES.CRYSTAL.bonusMax / RULES.CRYSTAL.base * 100);
ok(佔比 >= 10 && 佔比 <= 50,
  '老師多給的最多佔基本額 ' + 佔比 + '%——看得出差別，可是拿不到也不覺得少了什麼');
ok(RULES.CRYSTAL.bonusMin > 0,
  '收下就一定有（最少 ' + RULES.CRYSTAL.bonusMin + '——0 會被讀成負評）');
const 一學期 = 8 * (RULES.CRYSTAL.base + Math.round((RULES.CRYSTAL.bonusMin + RULES.CRYSTAL.bonusMax) / 2));
const 點得亮 = Math.floor(一學期 / RULES.CRYSTAL.light);
console.log('   一學期八趟大約 ' + 一學期 + ' 顆 → 點得亮 ' + 點得亮 + ' 位');
ok(點得亮 >= 2 && 點得亮 <= 4,
  '全部拿去點亮是 ' + 點得亮 + ' 位，而遇過的會有七八位——它是補洞不是另一條路');

節('2', '一趟走完，水晶進來');

DB = blank();
const t = actRegister({ account: 'tea_x', password: 'aaaa', name: '孟老師', role: 'teacher' }).user;
const kl = actNewClass('班', t.userId).klass;
const A = actRegister({ account: 'stu_a', password: 'aaaa', name: '小美', role: 'student', code: kl.joinCode }).user;
as(A); const g = actNewTeam('第一組', A.userId).team; actRename(g.teamId, '專題');
ok(crystalOf(g.teamId).all === RULES.CRYSTAL.start,
  '還沒走過任何一趟 → ' + RULES.CRYSTAL.start + ' 顆（進場給的）');

as(t);
const ms = actPublish(kl.classId, { title: '第一件', mentorId: t.userId, teams: [g.teamId] });
as(A);
const run = actCommit(g.teamId, ms.msId, 3, [], [{ n: '做', d: 3, who: A.userId, byOwn: 1 }], '', 2);
actMyPart(g.teamId, run.runId, { spent: { 0: 3 }, said1: '做完了' });
actSubmit(g.teamId, run.runId, 'https://x');
as(t); actApprove(run.runId, '可以。', RULES.CRYSTAL.bonusMax);
const s1 = crystalOf(g.teamId);
ok(s1.all === RULES.CRYSTAL.start + RULES.CRYSTAL.base + RULES.CRYSTAL.bonusMax,
  '收下一件 → ' + s1.all + ' 顆（進場 ' + RULES.CRYSTAL.start +
  ' ＋ ' + RULES.CRYSTAL.base + ' ＋ 老師多給 ' + RULES.CRYSTAL.bonusMax + '）');
ok(s1.left === s1.all, '一顆都還沒放出去');
/* ── 這一條是這次改動要保證的事 ──

   進場給 200 的理由就是這個：光靠收下要三件才點得起一位，而那是學期
   後段的事——前幾週那個功能對學生等於不存在，他看到的永遠是
   「還差 N 顆」。一個要等三個星期才第一次出現的東西，在它出現之前
   不會被當成系統的一部分。

   所以「走完一件就點得起一位」不是巧合，是這個刻度存在的目的。
   哪一天有人調了 start 或 base 或 light，這一條會先攔下來。 */
ok(RULES.CRYSTAL.start + RULES.CRYSTAL.base >= RULES.CRYSTAL.light,
  '走完一件（進場 ' + RULES.CRYSTAL.start + ' ＋ ' + RULES.CRYSTAL.base +
  '）就點得起一位（要 ' + RULES.CRYSTAL.light + '）');
ok(RULES.CRYSTAL.start < RULES.CRYSTAL.light,
  '但一件都還沒收下的時候點不起——不然那個用途跟他做了什麼就沒有關係了');

節('3', '放一顆上去，黑影亮起來');

as(A);
const 全 = allFauna();
const 遇過 = metMobs(g.teamId);
const 沒遇過 = 全.filter(c => !遇過[c.n])[0];
ok(!!沒遇過, '找得到一位還沒遇過的：' + (沒遇過 ? 沒遇過.n : '—'));

/* ── 水晶不夠的時候要擋 ──

   一件都還沒收下的那一組來驗：他手上只有進場那 200，點不起。

   本來這裡是拿 A 組驗的，可是進場給 200 之後 A 組收下一件就有 350
   ——已經點得起了。要驗「不夠」就得找一個真的不夠的人，
   而那正是每一個學生第一天的狀態。 */
const 窮組 = actNewTeam('還沒開始的',
  actRegister({ account: 'stu_p', password: 'aaaa', name: '小窮', role: 'student',
    code: kl.joinCode }).user.userId).team;
ok(crystalOf(窮組.teamId).all === RULES.CRYSTAL.start,
  '一件都還沒收下 → 只有進場那 ' + RULES.CRYSTAL.start + ' 顆');
const 不夠 = actLight(窮組.teamId, 沒遇過.n);
ok(!!不夠.err, '點不起 → 擋下來：「' + 不夠.err + '」');

as(A);
console.log('   小美收下一件，手上 ' + crystalOf(g.teamId).left + ' 顆');

as(A);
const 前 = crystalOf(g.teamId);
/* 這幾趟可能又遇到那一位了，換一個還沒遇過的 */
const 遇過2 = metMobs(g.teamId);
const 目標 = 全.filter(c => !遇過2[c.n])[0];
const r = actLight(g.teamId, 目標.n);
ok(!r.err, '放一顆上去：' + (r.err || ('「' + r.name + '」亮了')));
const 後 = crystalOf(g.teamId);
ok(後.left === 前.left - RULES.CRYSTAL.light,
  '手上少了 ' + RULES.CRYSTAL.light + ' 顆（' + 前.left + ' → ' + 後.left + '）');
ok(後.all === 前.all,
  '**拿過的總數沒有變**（' + 後.all + '）——榜上排的是這個，所以放水晶不會讓一組退步');
ok(isLit(g.teamId, 目標.n), '那一位進了「照亮過」的名單');
ok(!metMobs(g.teamId)[目標.n], '而且**沒有**被算成遇過');

節('3.5', '花掉之後，榜上不能掉');

/* 這一條是設計不是實作細節：水晶花得掉，而如果榜上印的是手上剩的，
   那張榜就變成「不要用它」的壓力——一個沒有人敢用的用途等於沒有用途。 */
as(A);
/* 那張榜是 bothCard 畫的（見 68c-cryrank.js），直接叫它——
   不用去猜 eco 那一頁要切到哪一格。 */
const 榜html = bothCard(kl.classId, g.teamId);
ok(榜html.indexOf('拿過 ' + 後.all) >= 0,
  '榜上印的是拿過的 ' + 後.all + ' 顆，不是手上剩的 ' + 後.left + ' 顆');
ok(榜html.indexOf('拿過') >= 0, '而且寫著「拿過」，不是只丟一個數字給人自己猜');

節('4', '照亮 ≠ 遇過');

ok(!!actLight(g.teamId, 目標.n).err, '同一位不能照兩次');
const 真遇過 = Object.keys(metMobs(g.teamId))[0];
ok(!!actLight(g.teamId, 真遇過).err, '已經遇過的不用照（白花）：「' +
  actLight(g.teamId, 真遇過).err + '」');
ok(!!actLight(g.teamId, '沒有這個人').err, '不存在的那一位擋下來');

/* 別組的圖鑑動不了 */
const B = actRegister({ account: 'stu_b', password: 'aaaa', name: '阿哲', role: 'student', code: kl.joinCode }).user;
as(B); const g2 = actNewTeam('第二組', B.userId).team;
as(B);
ok(!!actLight(g.teamId, 全[10].n).err, '別組的圖鑑照不亮');

節('5', '畫面上兩種要看得出不一樣');

as(A); S.page = 'codex'; S.p = {};
/* c.r 是層的**名字**（微光荒原），分頁吃的是 key（wild）。 */
const 層key = (STRATA.filter(function (z) { return z.name === 目標.r; })[0] || {}).key;
DRAFT = { cx: 層key };
const h = PAGES.codex();
ok(h.indexOf('cxi lit') >= 0 || /class="cxi[^"]*lit/.test(h), '照亮的那一格有自己的記號（.lit）');
ok(h.indexOf('水晶照亮的。還沒真的遇過他。') >= 0,
  '那一格上寫著它跟遇過不一樣');
ok(h.indexOf(目標.n) >= 0, '照亮之後名字看得到了');
ok(/手上 \d+ 顆水晶/.test(h), '這一頁最上面寫著手上有幾顆');

/* 還沒亮、也買不起的那幾格 */
const 窮 = teamOf(g.teamId);
窮.lit = [];
for (var i = 0; i < 99; i++) 窮.lit.push('假的' + i);   /* 把水晶花光 */
DRAFT = { cx: 層key };
const h2 = PAGES.codex();
ok(/還差 \d+ 顆/.test(h2), '水晶不夠的時候只說還差幾顆，不畫那一顆按不下去的鍵');
ok(h2.indexOf('cx-light') < 0, '而且真的不畫（一顆按下去只會被拒絕的鍵比沒有更吵）');
窮.lit = [目標.n];

節('6', '事件紀錄留得下來');

const ev = where('Events', function (e) { return e.kind === 'light'; });
ok(ev.length >= 1, '照亮這件事有進紀錄（' + ev.length + ' 筆）');
ok(evSay(ev[0]).indexOf('水晶') >= 0, '紀錄讀得懂：「' + evSay(ev[0]) + '」');

console.log('\n════════════════════════════════════════════════════');
console.log(錯.length ? '  ✗ ' + 錯.length + ' 條沒過\n  ' + 錯.join('\n  ')
  : '  收集得到、交換得出去，而且「遇過」沒有被買走');
console.log('════════════════════════════════════════════════════\n');
process.exit(錯.length ? 1 : 0);
