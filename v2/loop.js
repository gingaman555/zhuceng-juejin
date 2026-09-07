/* 迴圈測試：這台機器能不能一直轉。

   畫面畫得出來，跟系統能跑無限次循環，是兩件事。這一支不碰畫面，
   直接把 act* 串起來跑 N 輪完整循環，每一輪之後檢查不變量：

     · 狀態機有沒有回到乾淨的狀態
     · 推進「一天一格」有沒有真的守住
     · 停滯判斷會不會誤判剛承諾的人
     · 資料有沒有隨輪數長出不該長的東西

   跑：node v2/loop.js [輪數]
*/

const fs = require('fs');
const path = require('path');

/* 假的瀏覽器環境。只需要 localStorage。 */
let MEM = {};
global.localStorage = {
  getItem: function (k) { return MEM[k] == null ? null : MEM[k]; },
  setItem: function (k, v) { MEM[k] = String(v); },
  removeItem: function (k) { delete MEM[k]; }
};

/* 只載規則與資料層，不載畫面 */
const SRC = path.join(__dirname, 'src');
/* 一次 eval 全部——分開 eval 的話 var 會落在各自的作用域裡，彼此看不到 */
eval(['10-pack.js', '11-world.js', '12-props.js', '13-strata.js', '14-fauna.js',
      '15-auth.js', '20-rules.js', '30-art.js', '40-db.js', '43-core.js', '44-dig.js', '45-seed.js']
  .map(function (f) { return fs.readFileSync(path.join(SRC, f), 'utf8'); })
  .join(String.fromCharCode(10)));

const ROUNDS = Number(process.argv[2]) || 10;
let bad = 0;
function fail(msg) { bad++; console.error('  ✗ ' + msg); }
function ok(msg) { console.log('  ✓ ' + msg); }

/* 快轉一天 */
function tick(n) { CLOCK += (n || 1) * DAY; }

seed();
const CID = 'C1';
const TEAM = 'G1';

console.log('迴圈測試　' + ROUNDS + ' 輪\n');

/* ---------- 先把種子留下的每一件都收乾淨 ----------

   本來只收 state === 'running' 那一件。而老師端不再分「我帶的組」之後
   （見 40-db.js 的 msFor），G1 收得到的委託變多了——剩下那幾件會讓
   每一輪結束時停在 commit，於是「一輪跑完回到 idle」整片失敗。

   改成照 nextThing 一路收到 idle 為止：一件都不剩，
   後面那一句斷言才是在測這一輪，不是在測種子剩下什麼。 */
(function () {
  var guard = 0;
  while (nextThing(TEAM).kind !== 'idle' && guard++ < 60) {
    var nx = nextThing(TEAM);
    var rid = nx.row && nx.row.run ? nx.row.run.runId : null;
    if (nx.kind === 'commit') {
      actCommit(TEAM, nx.row.ms.msId, 3, [], [], '', 'mid');
    } else if (nx.kind === 'doing') {
      var g2 = 0;
      while (daysBetween(nx.row.run.committedAt, now()) < (nx.row.run.est || 1) && g2++ < 40) tick();
      actReflect(TEAM, rid, [0]);
      actSubmit(TEAM, rid);
    } else if (nx.kind === 'stamped') {
      actSawStamp(rid);
    } else if (nx.kind === 'review') {
      actApprove(rid, '');
    } else if (nx.kind === 'back') {
      actResend(TEAM, rid);
    } else {
      break;
    }
  }
  if (nextThing(TEAM).kind !== 'idle') {
    console.error('  ✗ 起手就收不乾淨：停在 ' + nextThing(TEAM).kind);
  }
})();

const before = { runs: DB.Runs.length, pushes: DB.Pushes.length, ms: DB.Milestones.length };
let stamps = { early: 0, exact: 0, late: 0 };

/* ================= 跑 N 輪 ================= */
for (let n = 1; n <= ROUNDS; n++) {
  const label = '第 ' + n + ' 輪';

  /* 1. 老師派一個里程碑 */
  const m = actPublish(CID, { title: '里程碑 ' + n, note: '', teams: [TEAM] });

  /* 2. 學生應該被要求承諾 */
  let nt = nextThing(TEAM);
  if (nt.kind !== 'commit') fail(label + '：派了里程碑，下一件事應該是 commit，卻是 ' + nt.kind);

  /* 3. 承諾。天數輪流變，讓三種印章都跑到 */
  const est = 3 + (n % 5);
  actCommit(TEAM, m.msId, est, n % 2 ? ['scope'] : []);
  const run = runOf(TEAM, m.msId);
  if (!run || run.state !== 'running') fail(label + '：承諾之後應該是 running');

  /* 4. 剛承諾的人不該被判定成停滯 */
  const st0 = stallOf(TEAM);
  if (st0.level !== 0) {
    fail(label + '：剛承諾就被判定停滯 level=' + st0.level + '（' + st0.days + ' 天）');
  }

  /* 5. 一天一格：同一天推兩次，第二次要被擋 */
  if (!actPush(TEAM, run.runId)) fail(label + '：第一次推進被擋了');
  if (actPush(TEAM, run.runId)) fail(label + '：同一天推進了兩次——「一天一格」沒守住');

  /* 6. 推到終點。刻意讓實際天數 ≠ 承諾，三種印章都要出現 */
  /* 容許誤差是 est 的兩成（est 3–7 → ±1），所以要早 2 天以上才判得成「早」。
     本來寫 -1，十輪跑完一次 🚀 都沒有，斷言卻說「三種都出現」——假通過。 */
  const extra = [0, 3, -3, 1, -4][n % 5];
  const targetDays = Math.max(1, est + extra);
  /* 走 targetDays 天。提早做完的那幾輪不把走廊走滿就交——
     走廊是承諾長度的視覺化，不是交件門檻。 */
  let guard = 0;
  while (daysBetween(run.committedAt, now()) < targetDays && guard++ < 60) {
    tick();
    actPush(TEAM, run.runId);
  }

  /* 7. 上傳 → 判定 */
  /* 省思在「上」之前。 */
  actReflect(TEAM, run.runId, [0]);
  const r = actSubmit(TEAM, run.runId);
  if (!r || !r.stamp) { fail(label + '：上傳之後沒有判定'); break; }
  stamps[r.stamp]++;

  const expect = RULES.judge(r.est, r.actual).key;
  if (r.stamp !== expect) fail(label + '：判定不一致 ' + r.stamp + ' vs ' + expect);

  /* 8. 交完就該在老師的雷達上。

     這一條翻過來了。本來的不變式是「還沒看判定就不該在雷達上」——
     那守的是舊流程：交出去只是 judged，學生要再打開結算頁、再按一顆
     叫「好」的鍵，東西才真的送到。量出來的樣子是學生按完「交出去」、
     關掉、以為交了，而老師的清單是空的。

     現在：交出去就是交出去。看不看結算是他自己的事。 */
  if (!radar(CID).some(function (x) { return x.run.runId === r.runId; })) {
    fail(label + '：交出去了，老師的雷達上卻沒有');
  }

  /* 9. 而且首頁還是會叫他去看那兩個數字（看過就不叫了）。 */
  nt = nextThing(TEAM);
  if (nt.kind !== 'stamped') fail(label + '：交完之後應該叫他看判定，卻是 ' + nt.kind);
  actSawStamp(r.runId);
  nt = nextThing(TEAM);
  if (nt.kind === 'stamped') fail(label + '：看過判定了還在叫他看');
  if (!radar(CID).some(function (x) { return x.run.runId === r.runId; })) {
    fail(label + '：看完判定之後從老師的雷達上消失了');
  }

  /* 10. 老師勾一個可以——勾下去就是完成，學生那邊不用再按一次 */
  actApprove(r.runId, '第 ' + n + ' 輪的話');

  /* 11. 那一趟當場結束：記號插進那一層，石片長出來 */
  const core = coreOf(r.runId);
  if (!core || core.length < 6) fail(label + '：岩心沒長出來');
  if (actApprove('nope', '')) fail(label + '：勾了一個不存在的 run');
  if (r.state !== 'done') fail(label + '：勾完狀態應該是 done，卻是 ' + r.state);
  const kp = keepsOf(TEAM).filter(function (k) { return k.runId === r.runId; })[0];
  if (!kp || !kp.px) fail(label + '：那一根石片沒有存下形狀');
  /* 12. 回到乾淨狀態 */
  nt = nextThing(TEAM);
  if (nt.kind !== 'idle') fail(label + '：一輪跑完應該回到 idle，卻是 ' + nt.kind);
  if (radar(CID).some(function (x) { return x.run.runId === r.runId; })) {
    fail(label + '：勾完可以還留在審核清單上');
  }

  /* 13. 深度要跟著長 */
  if (depthOf(TEAM) !== n + before.runsDone) { /* 第一輪之前已完成的數量 */ }
}

/* ---------- 危險情境：停很久之後才接新任務 ----------
   上一輪的最後一次推進在很多天以前。這時候老師派新的里程碑，
   學生一承諾，畫面應該是「今天該推一格」，不是「你睡著了」。 */
console.log('');
tick(9);
var mX = actPublish(CID, { title: '停很久之後的里程碑', note: '', teams: [TEAM] });
var ntX = nextThing(TEAM);
if (ntX.kind !== 'commit') fail('停 9 天之後派任務，下一件事應該是 commit，卻是 ' + ntX.kind);
actCommit(TEAM, mX.msId, 5, []);
var stX = stallOf(TEAM);
if (stX.level !== 0) fail('剛承諾就被判成停滯 level=' + stX.level + '（' + stX.days + ' 天）' +
  '——停滯應該從這一輪開始算，不是從上一輪的最後一次推進');
else ok('停 9 天之後承諾新的一輪，沒有被誤判成停滯');
var ntY = nextThing(TEAM);
if (ntY.kind !== 'doing') fail('剛承諾，下一件事應該是 doing，卻是 ' + ntY.kind);
else ok('剛承諾 → 正在做');
var rX = runOf(TEAM, mX.msId);
var g2 = 0;
while (RULES.progress(rX.pushes, rX.est) < 1 && g2++ < 30) { actPush(TEAM, rX.runId, -1, 0); tick(); }
actReflect(TEAM, rX.runId, [0]);
actSubmit(TEAM, rX.runId);
actSawStamp(rX.runId);
actApprove(rX.runId, '');

console.log('\n跑完 ' + ROUNDS + ' 輪。');
console.log('  印章分布　🎯 ' + stamps.exact + '　🚀 ' + stamps.early + '　❌ ' + stamps.late);
if (!stamps.exact || !stamps.late || !stamps.early) {
  fail('三種印章沒有都跑到——測試涵蓋不足，通過了也不算數');
} else ok('三種印章都出現過');

/* ---------- 不變量 ---------- */
console.log('\n不變量：');

const depth = depthOf(TEAM);
if (depth < ROUNDS) fail('深度只有 ' + depth + '，應該至少 ' + ROUNDS);
else ok('深度長到 ' + depth + '（每輪 +1）');

const stuck = DB.Runs.filter(function (r) {
  return r.teamId === TEAM && r.state !== 'done';
});
if (stuck.length) fail(stuck.length + ' 個 run 卡在半路：' +
  stuck.map(function (r) { return r.state; }).join('、'));
else ok('沒有 run 卡在半路');

const dup = {};
let dupN = 0;
DB.Pushes.forEach(function (p) {
  const k = p.runId + '|' + p.day;
  if (dup[k]) dupN++;
  dup[k] = 1;
});
if (dupN) fail('有 ' + dupN + ' 筆同一天推進了兩次');
else ok('每一天每一個 run 最多一次推進（共 ' + DB.Pushes.length + ' 筆）');

const orphan = DB.Runs.filter(function (r) { return !msOf(r.msId); });
if (orphan.length) fail(orphan.length + ' 個 run 找不到對應的里程碑');
else ok('每一個 run 都對得到里程碑');

const noEst = DB.Runs.filter(function (r) { return r.state !== 'fresh' && !r.est; });
if (noEst.length) fail(noEst.length + ' 個 run 沒有承諾天數');
else ok('每一個開始了的 run 都有承諾天數');

/* 生態圖不排序 */
const eco = ecology(CID);
const order = where('Teams', function (t) { return t.classId === CID; })
  .map(function (t) { return t.teamId; }).join(',');
if (eco.map(function (e) { return e.teamId; }).join(',') !== order) {
  fail('生態圖的順序跟名冊不一樣——那就是排名了');
} else ok('生態圖照名冊排，沒有排名');

/* 省思不可以動狀態。
   actReflect 曾經把 state 設成 submitted，等於跳過整個判定，
   而這一支測試直接呼叫 DB 函式，所以完全沒抓到。 */
(function () {
  var t = where('Teams', function () { return true; })[0];
  var m = actPublish(t.classId, { title: '省思不動狀態', teams: [] });
  var r = actCommit(t.teamId, m.msId, 5, []);
  actReflect(t.teamId, r.runId, [0]);
  if (r.state !== 'running') fail('省思之後狀態被改成 ' + r.state + '，判定會被跳過');
  else ok('省思不動狀態');
})();

/* ---------- 沒有兩筆資料共用一個 id ----------

   2026-09-04 補的。種子把隊友放在 U101–U110，而 Config.seq 寫死 100，
   所以第二個真的註冊的人拿到 U101——跟種子裡的冠廷同號。
   userOf() 回傳先找到的那一筆：那個人一登入就變成別人，
   名字、組、紀錄全部是冠廷的，而他自己那一筆再也找不到。

   畫面不會報錯，每一頁都畫得出來。所以要在這裡數。 */
(function () {
  seed();
  var cols = [['Users', 'userId'], ['Teams', 'teamId'], ['Classes', 'classId'],
              ['Milestones', 'msId'], ['Runs', 'runId']];
  var seen = {}, dup = [], top = 0;
  cols.forEach(function (p) {
    (DB[p[0]] || []).forEach(function (r) {
      var k = r[p[1]];
      if (seen[k]) dup.push(k);
      seen[k] = 1;
      var n = parseInt(String(k).replace(/^[A-Za-z]+/, ''), 10);
      if (n > top) top = n;
    });
  });
  if (dup.length) return fail('種子裡有兩筆共用一個 id：' + dup.join(' '));
  if (DB.Config.seq <= top) {
    return fail('下一個 id 是 ' + DB.Config.seq + '，但種子已經用到 ' +
      top + '——新註冊的人會變成種子裡的某個人');
  }
  /* 真的開幾個看看，不要只信那個數字。 */
  for (var i = 0; i < 20; i++) {
    var n = nid('U');
    if (seen[n]) return fail('新開的帳號 ' + n + ' 撞到種子裡的人');
    seen[n] = 1;
  }
  ok('沒有人會變成別人（' + Object.keys(seen).length + ' 個 id，連開 20 個新帳號都不撞）');
})();

console.log('\n' + (bad ? '── ' + bad + ' 項失敗 ──' : '── 全部通過：這台機器轉得動 ──'));
process.exit(bad ? 1 : 0);
