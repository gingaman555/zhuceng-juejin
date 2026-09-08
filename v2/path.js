/* 這一趟幾天，不能跟人數走。

   ── 為什麼要有這一支 ──

   一趟上有兩種單位，而它們長得一模一樣（都是「幾天」）：

     每一件的天數    那個人做那一件要花的工時　　人天
     run.actual      承諾到交出去中間隔了幾天　　日曆天

   把每一件相加會得到人天，拿去跟日曆天比只有在「同一時間只有一個人
   在做」的時候才成立。而學生會分工，分工的人是同一天各做各的。

   本來就是相加。四個人各說 2 天 → 系統寫承諾 8 天，他們一個下午交了，
   判定「太早」、偏差率 88%。而榜上只有 exact 算準，所以主站每一組
   都排不上去。

   最壞的一層：B 站一個人一隊，相加就等於他的日曆天——那一站是對的。
   兩個站因此不只差 RULES.SOLO，還差了「估算會不會被人數灌水」，
   剛好汙染這兩個站要比的東西。

   ── 這種錯叫不出來 ──

   8 是合法的天數，88% 是合法的偏差率，什麼都不會爆。它只會安靜地
   把每一組都判成太早。這個專案這種錯出過兩次（RULES.ASK 被覆寫、
   榜讀談完的數字），所以這一支存在。

   ── 驗什麼 ──

     一 · 同樣的分工，兩個人跟四個人算出來要一樣
     二 · 一個人的時候等於相加（B 站與單人的隊完全不受影響）
     三 · 混合的時候取最慢的那一位，不是取最大的那一件
     四 · 沒掛名字的件退回相加（安全的退路）

   跑法：node path.js
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
console.log('  這一趟幾天，不跟人數走');
console.log('════════════════════════════════════════════════════');

節('1', '同樣的分工，人數不該改變答案');

const 人 = n => { const a = []; for (var i = 0; i < n; i++) a.push('u' + i); return a; };
const 一人一件 = (n, d) => 人(n).map((w, i) => ({ n: '第' + i, d: d, who: w }));

const 二 = planDays(一人一件(2, 2));
const 三 = planDays(一人一件(3, 2));
const 四 = planDays(一人一件(4, 2));
console.log('   一人一件、每件 2 天：2 人 ' + 二 + ' 天　3 人 ' + 三 + ' 天　4 人 ' + 四 + ' 天');
ok(二 === 三 && 三 === 四 && 四 === 2,
  '兩人、三人、四人算出來都是 2 天');

節('2', '一個人的時候等於相加');

const 獨 = [{ n: 'a', d: 2, who: 'solo' }, { n: 'b', d: 3, who: 'solo' },
  { n: 'c', d: 1, who: 'solo' }];
ok(planDays(獨) === 6, '一個人做三件（2＋3＋1）＝ 6 天，跟以前一樣');

節('3', '混合：取最慢的那一位，不是最大的那一件');

const 混 = [
  { n: '查資料', d: 2, who: '甲' }, { n: '做出來', d: 2, who: '甲' },
  { n: '訪談', d: 3, who: '乙' }
];
console.log('   甲 2＋2＝4　乙 3');
ok(planDays(混) === 4, '這一趟 4 天（甲是要徑），不是 3（最大的那一件）也不是 7（全部相加）');
ok(planWho(混) === '甲', '最慢的那一位是甲');

節('4', '沒掛名字的退回相加');

const 沒名 = [{ n: 'a', d: 2 }, { n: 'b', d: 3 }];
ok(planDays(沒名) === 5, '不知道誰做的時候只能假設是同一個人一件一件做（5 天）');

節('5', '真的走一趟：分工同一天做完，判定要對');

DB = blank();
const T = actRegister({ account: 'tea_pa', password: 'aaaa', name: '孟老師', role: 'teacher' }).user;
const K = actNewClass('114-1', T.userId).klass;
const us = [];
for (var i = 0; i < 4; i++) {
  us.push(actRegister({ account: 'stu_pa' + i, password: 'aaaa', name: '學生' + i,
    role: 'student', code: K.joinCode }).user);
}
as(us[0]);
const g = actNewTeam('第一組', us[0].userId).team;
for (var j = 1; j < 4; j++) { as(us[j]); actJoinTeam(g.joinCode, us[j].userId); }
as(T);
const m = actPublish(K.classId, { title: '分工', mentorId: T.userId, teams: [g.teamId] });
as(us[0]);
const r = actCommit(g.teamId, m.msId, 0, [],
  us.map((u, i) => ({ n: '第' + i + '件', d: 2, who: u.userId, byOwn: 1 })), '', 2);
ok(r.est === 2, '四個人各說 2 天 → 承諾 2 天（不是 8）');
us.forEach(function (u, i) {
  as(u); const o = { spent: {}, said1: '做完' }; o.spent[i] = 1; actMyPart(g.teamId, r.runId, o);
});
find('Runs', x => x.runId === r.runId).committedAt = now() - 1 * DAY;
as(us[0]); actSubmit(g.teamId, r.runId, 'https://x.com');
const rr = find('Runs', x => x.runId === r.runId);
console.log('   承諾 ' + rr.est + ' 天　實際 ' + rr.actual + ' 天　判定 ' + rr.stamp);
ok(rr.stamp !== 'early',
  '同一天做完不再被判成「太早」' + (rr.stamp === 'early' ? '　→ 還是 early' : ''));

節('6', '個人層的資料沒有被要徑吃掉');

const it = exportItems(K.classId).trim().split('\n');
ok(it.length - 1 === 4, '四件還是四列（要徑只影響這一趟幾天，不動每一件）');
const 欄 = it[0].split(',');
const i說 = 欄.indexOf('他說幾天');
ok(it.slice(1).every(l => l.split(',')[i說] === '2'),
  '每一個人說的還是 2 天——他自己的預估沒有被改掉');

節('7', '算出來的是起點，他們還可以再調一次');

as(us[0]);
const m2 = actPublish(K.classId, { title: '再一件', mentorId: T.userId, teams: [g.teamId] });
as(T); actPublish(K.classId, { title: '佔位', mentorId: T.userId, teams: [] });
as(us[0]);
const pl2 = us.map((u, i) => ({ n: '第' + i + '件', d: 2, who: u.userId, byOwn: 1 }));
/* 要徑算 2 天，他們自己定 5 天（他們知道乙要等甲、這禮拜還有三科要交） */
const r2 = actCommit(g.teamId, m2.msId, 5, [], pl2, '', 2);
ok(r2.est === 5, '他們定 5 天就是 5 天，沒有被要徑蓋掉（' + r2.est + '）');
ok(r2.estCalc === 2, '而要徑算的 2 天也留著（estCalc ' + r2.estCalc + '）');
ok(RULES.judge(r2.est, 5).key === 'exact',
  '判定讀的是他們定的那一個——走 5 天算準');

/* 沒給數字的時候（測試、示範資料）還是照要徑算 */
as(T);
const m3 = actPublish(K.classId, { title: '沒給數字', mentorId: T.userId, teams: [g.teamId] });
as(us[0]);
const r3 = actCommit(g.teamId, m3.msId, 0, [], pl2, '', 2);
ok(r3.est === 2 && r3.estCalc === 2, '沒給數字就照要徑算（' + r3.est + ' 天）');

節('8', '匯出分得出「照著算的走」跟「他們自己定了一個」');

const rc = exportRuns(K.classId).trim().split('\n');
const rh = rc[0].split(',');
const i算 = rh.indexOf('要徑算幾天'), i改 = rh.indexOf('有沒有改掉');
ok(i算 >= 0 && i改 >= 0, '兩欄都在');
const 列2 = rc.find(l => l.indexOf(r2.runId) >= 0).split(',');
const 列3 = rc.find(l => l.indexOf(r3.runId) >= 0).split(',');
console.log('   他們自己定的那一趟　要徑 ' + 列2[i算] + '　有沒有改掉 ' + 列2[i改]);
console.log('   照著算的那一趟　　　要徑 ' + 列3[i算] + '　有沒有改掉 ' + 列3[i改]);
ok(列2[i改] === 'Y' && 列3[i改] === 'N', '兩種分得開');

節('9', '兩個站算出來要一樣');

RULES.SOLO = 1;
const b = planDays(一人一件(1, 2));
RULES.SOLO = 0;
ok(b === 2 && planDays(一人一件(1, 2)) === 2,
  'B 站（一人一隊）跟主站用同一支，答案一樣——兩站只差 RULES.SOLO');

console.log('\n════════════════════════════════════════════════════');
console.log(錯.length ? '  ✗ ' + 錯.length + ' 條沒過\n  ' + 錯.join('\n  ')
  : '  分工不會讓天數相加——最慢的那一位決定這一趟');
console.log('════════════════════════════════════════════════════\n');
process.exit(錯.length ? 1 : 0);
