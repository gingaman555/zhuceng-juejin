/* 個人制成不成立。

   這一套從頭到尾是用「組」寫的：Runs 掛在 teamId 上、拆件掛在人名下、
   「還有 N 個人沒填」、班級地下城一條廊道一組。所以要問清楚一件事——
   **一個人一組的時候，這一套會不會變成一堆對不上的話。**

   一人一組就是個人制：他自己是自己那一組。

   量到的（下面每一條都跑過）：

     流程　　二十位學生各自一組，承諾、推進、交出去、老師收下、
             匯出，全部走得通（node multi.js 1 也跑得過）
     措辭　　「大家都填好自己那一份了」對一個人是錯的 → 換成
             「你填好了，還沒交出去」
             「順便幫大家交出去」　　　　　　　　→ 換成「接著交出去」
             「還有 0 個人沒填」　　　　　　　　→ 不出現
     混合班　一人組跟兩人組在同一個班裡並存，四種人的每一頁都畫得出來
     資料　　匯出一樣是一件一列，掛在那個人名下

   跑法：node solo.js
*/
const fs = require('fs');
let MEM = {};
global.localStorage = { getItem: k => MEM[k] == null ? null : MEM[k], setItem: (k, v) => { MEM[k] = String(v); }, removeItem: k => { delete MEM[k]; } };
const st = { value: '', innerHTML: '', textContent: '', className: '', style: {}, getAttribute: () => null, setAttribute: () => { }, addEventListener: () => { }, appendChild: () => { }, insertAdjacentHTML: () => { }, querySelector: () => null, querySelectorAll: () => [], getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }), classList: { add: () => { }, remove: () => { }, toggle: () => { } }, scrollIntoView: () => { } };
global.document = { getElementById: () => Object.create(st), querySelector: () => null, querySelectorAll: () => [], createElement: () => Object.create(st), addEventListener: () => { }, body: Object.create(st), documentElement: Object.create(st), activeElement: null };
global.window = global; global.innerWidth = 390; global.scrollTo = () => { };
global.requestAnimationFrame = () => 0; global.setTimeout = () => 0; global.clearTimeout = () => { };
global.getComputedStyle = () => ({ fontSize: '11px' });
global.matchMedia = () => ({ matches: false, addListener: () => { } });
eval(fs.readdirSync('src').filter(f => f.endsWith('.js')).sort()
  .map(f => fs.readFileSync('src/' + f, 'utf8')).join('\n'));

const as = u => { S.who = u.userId; S.role = u.role; DB.Session = { userId: u.userId, at: Date.now() }; };
let 錯 = [];
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) 錯.push(m); };
function 讀(h) {
  const i = h.indexOf('act-card');
  return h.slice(i < 0 ? 0 : i).replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, '\n').split('\n').map(x => x.trim())
    .filter(x => x && x.length < 60).slice(0, 4);
}

DB = blank();
const t = actRegister({ account: 'tea_x', password: 'aaaa', name: '孟老師', role: 'teacher' }).user;
const kl = actNewClass('114-1 個人制的班', t.userId).klass;
/* 二十位學生，一人一組 */
const 人 = [];
for (let i = 0; i < 20; i++) {
  const u = actRegister({ account: 'b1081' + (300 + i), password: 'aaaa',
    name: '學生' + (i + 1), role: 'student', code: kl.joinCode }).user;
  as(u);
  const g = actNewTeam(u.name, u.userId).team;
  actRename(g.teamId, u.name + '的專題');
  人.push({ u: u, g: g });
}
ok(人.length === 20, '二十位學生各自一組');
ok(where('Teams', x => x.classId === kl.classId).length === 20, '老師看到 20 組');
ok(人.every(x => where('Users', u => u.teamId === x.g.teamId).length === 1), '每一組都是一個人');

as(t);
const ms = actPublish(kl.classId, { title: '第一個任務', mentorId: t.userId,
  teams: 人.map(x => x.g.teamId) });
ok(!!ms.msId, '任務發給二十組');

const A = 人[0];
as(A.u);
const run = actCommit(A.g.teamId, ms.msId, 4, [], [
  { n: '查資料', d: 2, who: A.u.userId, byOwn: 1 },
  { n: '做出來', d: 2, who: A.u.userId, byOwn: 1 }], '', 2);
ok(!!run && run.state === 'running', '一個人承諾得了');

console.log('\n  ── 還沒填的時候 ──');
as(A.u); S.page = 'home'; S.p = {}; DRAFT = {};
讀(PAGES.home()).forEach(x => console.log('     ' + x));

console.log('\n  ── 填完自己那一份之後 ──');
as(A.u);
actMyPart(A.g.teamId, run.runId, { spent: { 0: 3, 1: 2 }, said1: '我做完了' });
const h = PAGES.home();
讀(h).forEach(x => console.log('     ' + x));
ok(!/大家都填好/.test(h), '沒有出現「大家都填好自己那一份了」（一個人沒有大家）');
ok(/你填好了，還沒交出去/.test(h), '說的是「你填好了，還沒交出去」');
ok(!/還有 0 個人/.test(h), '沒有出現「還有 0 個人沒填」');

console.log('\n  ── 交件頁上那兩顆鍵 ──');
S.page = 'battle'; S.p = { id: run.runId, ph: 'q', q: 2 }; DRAFT = {};
const b = PAGES.battle();
const 鍵 = (b.match(/class="bm[^"]*"[^>]*>([^<]*)</g) || []).map(x => x.replace(/.*>/, '').replace('<', ''));
console.log('     ' + 鍵.join('　·　'));
ok(!/幫大家/.test(b), '沒有「順便幫大家交出去」（一個人沒有大家）');
ok(/接著交出去/.test(b), '換成「接著交出去」');
ok(/改好了/.test(b), '存過之後那一顆是「改好了」');

console.log('\n  ── 交出去、老師收下 ──');
as(A.u);
ok(!!actSubmit(A.g.teamId, run.runId, 'https://drive.google.com/d/abc'), '交得出去');
as(t);
ok(radar(kl.classId).some(x => x.run.runId === run.runId), '老師收得到');
S.page = 'review'; S.p = { id: run.runId }; DRAFT = {};
const rv = PAGES.review();
ok(/wh-copy/.test(rv), '審核頁上有複製鍵');
ok(/drive\.google\.com/.test(rv), '連結印出來了');
as(t); ok(!!actApprove(run.runId, '很好。', 30), '收得下');

console.log('\n  ── 匯出 ──');
const csv = exportItems(kl.classId).trim().split('\n');
ok(csv.length - 1 === 2, '一件一列：' + (csv.length - 1) + ' 列');
ok(csv[1].indexOf('學生1') >= 0, '掛在那個人名下');

console.log('\n  ── 混合班：一半兩人、一半一人 ──');
as(人[1].u);
const B2 = actRegister({ account: 'b1081999', password: 'aaaa', name: '搭檔', role: 'student', code: kl.joinCode }).user;
as(B2);
ok(!actJoinTeam(人[1].g.joinCode, B2.userId).err, '有人中途加進第 2 組');
ok(where('Users', u => u.teamId === 人[1].g.teamId).length === 2, '那一組變成兩個人');
ok(where('Users', u => u.teamId === 人[0].g.teamId).length === 1, '第 1 組還是一個人');
/* 每一種身分只畫他走得到的頁（見 55-ui.js 的 PAGE_ROLE）。 */
let 炸 = [], 畫 = 0;
[[t, 'teacher'], [人[0].u, 'student'], [人[1].u, 'student'], [B2, 'student']]
  .forEach(function (x) {
    as(x[0]);
    Object.keys(PAGES).forEach(function (p) {
      if (!allowed(userOf(x[0].userId), p)) return;
      S.page = p; S.p = {}; DRAFT = {};
      try { PAGES[p](); 畫++; } catch (e) { 炸.push(x[0].name + '/' + p + '：' + e.message); }
    });
  });
ok(!炸.length, '一人組跟兩人組混在同一班，四個人的每一頁都畫得出來（' + 畫 + ' 次）' +
  (炸.length ? '　→ ' + 炸.slice(0,3).join('　') : ''));

console.log('\n' + (錯.length ? '  ✗ ' + 錯.length + ' 條沒過' : '  全部通過'));
process.exit(錯.length ? 1 : 0);
