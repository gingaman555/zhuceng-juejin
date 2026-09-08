/* 榜上排的到底是誰估的。

   ── 為什麼要有這一支 ──

   一趟上有兩個天數，而它們回答的是兩個不同的問題：

     run.est        最後承諾的。判定讀這一個。
     estOwn(run)    他一個人的時候自己說的（estFirst）。

   老師可以回一句「我覺得會是 8 天」。學生按下去、真的做了 8 天——
   判定當然算他做到了，他答應 8 天做到 8 天。可是那 8 天是老師估的，
   而排行榜印在上面的字是「估得準」。

   兩邊如果讀同一個數字，每次都說「好」的那一組會排在最上面，
   而榜就不再是它自己說的那件事了。

   這種錯不會有任何一支現有的檢查叫出來：兩個數字都是合法的天數，
   算出來的偏差率也是合法的數。只有「它算的是誰的判斷」這一題會錯，
   而那一題沒有型別、沒有例外、不會爆——它只會安靜地排錯。

   （同一種安靜的錯這個專案出過一次：RULES.ASK 被覆寫成別的東西，
     十一支檢查全過，因為 'on' 也是合法的值。）

   ── 驗什麼 ──

     一 · 判定沒有被動到（它讀承諾，而且應該一直讀承諾）
     二 · 榜讀的是他自己說的
     三 · 接受老師那一句，對榜不加分也不扣分
     四 · 沒談過的那一趟，兩個數字是同一個

   跑法：node rank.js
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
console.log('  榜上排的是誰估的');
console.log('════════════════════════════════════════════════════');

DB = blank();
const T = actRegister({ account: 'tea_rk', password: 'aaaa', name: '孟老師', role: 'teacher' }).user;
const K = actNewClass('114-1', T.userId).klass;

/* 一組走一趟。談不談由參數決定，其餘完全一樣。 */
function 走(帳, 名, 自己說, 老師說, 實際) {
  const u = actRegister({ account: 帳, password: 'aaaa', name: 名,
    role: 'student', code: K.joinCode }).user;
  as(u);
  const g = actNewTeam(名, u.userId).team;
  as(T);
  const m = actPublish(K.classId, { title: '任務 ' + 名, mentorId: T.userId, teams: [g.teamId] });
  as(u);
  const r = actCommit(g.teamId, m.msId, 自己說, [],
    [{ n: '做', d: 自己說, who: u.userId, byOwn: 1 }], '', 2);
  if (老師說) { as(T); actAskEst(r.runId, 老師說, T.userId); as(u); actAnswerAsk(g.teamId, r.runId, 老師說); }
  as(u);
  actMyPart(g.teamId, r.runId, { spent: { 0: 實際 }, said1: '做完' });
  find('Runs', x => x.runId === r.runId).committedAt = now() - 實際 * DAY;
  actSubmit(g.teamId, r.runId, 'https://x.com');
  as(T); actApprove(r.runId, '好', RULES.CRYSTAL.bonusMin);
  return { g: g, r: find('Runs', x => x.runId === r.runId), u: u };
}

節('1', '兩組的事實一模一樣，差別只有老師有沒有講話');

/* 都是「自己說 4 天，實際做了 8 天」。 */
const 甲 = 走('rk_a', '甲組', 4, 8, 8);    /* 老師說 8，他按了 8 */
const 乙 = 走('rk_b', '乙組', 4, 0, 8);    /* 沒人講話 */

const d甲 = rankDev(甲.g.teamId), d乙 = rankDev(乙.g.teamId);
console.log('   甲組　自己說 ' + estOwn(甲.r) + '　最後承諾 ' + 甲.r.est +
  '　實際 ' + 甲.r.actual + '　判定 ' + 甲.r.stamp);
console.log('   乙組　自己說 ' + estOwn(乙.r) + '　最後承諾 ' + 乙.r.est +
  '　實際 ' + 乙.r.actual + '　判定 ' + 乙.r.stamp);

ok(甲.r.stamp === 'exact',
  '判定沒有被動到：甲組答應 8 做到 8，算他做到了');
ok(乙.r.stamp !== 'exact',
  '判定沒有被動到：乙組答應 4 做了 8，算他沒做到');
ok(d甲.hit === d乙.hit && Math.abs(d甲.dev - d乙.dev) < 1e-9,
  '榜上兩組完全一樣——接受那一句不加分也不扣分（' +
  d甲.hit + ' 次／' + d甲.dev.toFixed(3) + '　對　' +
  d乙.hit + ' 次／' + d乙.dev.toFixed(3) + '）');
ok(d甲.hit === 0,
  '而且榜上不算甲組估準——那 8 天是老師估的');

節('2', '榜讀的是他自己說的那個數字');

ok(estOwn(甲.r) === 4, '甲組談過而且動了 → estOwn 回他原本的 4');
ok(estOwn(乙.r) === 乙.r.est, '乙組沒談過 → 兩個數字是同一個');

/* 談了、但他維持自己的數字：estFirst 不該被寫 */
as(T);
const m3 = actPublish(K.classId, { title: '沒動', mentorId: T.userId, teams: [乙.g.teamId] });
as(乙.u);
const r3 = actCommit(乙.g.teamId, m3.msId, 5, [],
  [{ n: '做', d: 5, who: 乙.u.userId, byOwn: 1 }], '', 2);
as(T); actAskEst(r3.runId, 9, T.userId);
as(乙.u); actAnswerAsk(乙.g.teamId, r3.runId, 5);
ok(estOwn(find('Runs', x => x.runId === r3.runId)) === 5,
  '談過但沒改數字 → 他自己說的還是 5');

節('3', '榜自己算，不吃現成的判定');

const src = fs.readFileSync(path.join(D, '68-rank.js'), 'utf8');
const body = src.slice(src.indexOf('function rankDev'), src.indexOf('function rankRows'));
const 去註解 = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
ok(/estOwn\(/.test(去註解),
  'rankDev 讀 estOwn（不是 r.est）');
ok(!/r\.stamp\s*===/.test(去註解),
  'rankDev 不吃 r.stamp——那是拿談完的數字判的，' +
  '同一列會上面排一個數字、下面印另一個判定');

節('4', '平均除的是真的算進去的那幾趟');

ok(d甲.n === d甲.marks.length,
  'n 跟 marks 對得上（' + d甲.n + '／' + d甲.marks.length + '）');

節('5', '匯出那一份分得出三個數字');

const csv = exportRuns(K.classId).split('\n');
const 欄 = csv[0].split(",");
const i本 = 欄.indexOf('學生本來說幾天');
const i老 = 欄.indexOf('老師回的天數');
const i談 = 欄.indexOf('談完之後的天數');
ok(i本 >= 0 && i老 >= 0 && i談 >= 0,
  '三欄都在：學生本來說的、老師回的、談完定的');
const 那列 = csv.find(l => l.indexOf(甲.r.runId) >= 0).split(',');
console.log('   甲組那一列　本來 ' + 那列[i本] + '　老師 ' + 那列[i老] + '　談完 ' + 那列[i談]);
ok(那列[i本] === '4' && 那列[i老] === '8' && 那列[i談] === '8',
  '「協商之後往哪邊靠」要的三個點都在（4 → 8 → 8）');

console.log('\n════════════════════════════════════════════════════');
console.log(錯.length ? '  ✗ ' + 錯.length + ' 條沒過\n  ' + 錯.join('\n  ')
  : '  判定讀承諾，榜讀他自己說的——聽得進去跟估得準沒有被算成同一件事');
console.log('════════════════════════════════════════════════════\n');
process.exit(錯.length ? 1 : 0);
