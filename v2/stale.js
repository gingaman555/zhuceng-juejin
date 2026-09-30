/* 同一筆被兩台機器碰：誰也不能把對方那一格蓋掉。

   2026-09-29 量到的事故：事件紀錄有三十次「交出去」，雲端 Runs 卻
   幾乎全是進行中。學生 A 交出去（state = submitted）；同組的 B 手機
   鎖過屏、醒來時本機那份還是進行中，補寫一句「我做了什麼」，整筆
   （state = running）推上去，A 交的東西就沒了。

   class.js 的「雲端」是自己寫的一個字典，不走 syncPush／syncBatch，
   所以量不到這件事。這一支接一個記憶體裡的假 Firestore
   （有 batch、有 runTransaction），跑的是**真的** syncPush／syncBatch／syncTake。

   跑法：node stale.js */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const D = path.join(__dirname, 'src');
const 原始碼 = fs.readdirSync(D).filter(f => f.endsWith('.js')).sort()
  .map(f => fs.readFileSync(path.join(D, f), 'utf8')).join('\n');

const 雲 = {};                 /* 路徑 → JSON 字串（跟 Firestore 裡 { j } 一樣） */
let 斷線 = false, 交易次數 = 0, 批次次數 = 0, 交易佇列 = Promise.resolve();

/* 模擬 firestore.strict.rules：新增與更新只收 { j, v: 2 }。 */
let 被擋次數 = 0;
function 規則(d) {
  const k = Object.keys(d || {}).sort().join(',');
  if (k !== 'j,v' || d.v !== 2 || typeof d.j !== 'string') { 被擋次數++; throw new Error('permission-denied'); }
}

const 假庫 = {
  doc: p => ({ p: p.replace('world/v1/', '') }),
  batch() {
    const ops = [];
    return {
      set: (r, d) => { 規則(d); ops.push(['s', r.p, d.j]); },
      delete: r => ops.push(['d', r.p]),
      commit() {
        if (斷線) return Promise.reject(new Error('offline'));
        批次次數++;
        ops.forEach(o => { if (o[0] === 's') 雲[o[1]] = o[2]; else delete 雲[o[1]]; });
        return Promise.resolve();
      }
    };
  },
  /* 真的 Firestore 的交易遇到同一筆有人先寫，會自己重跑；這裡直接排隊一個一個跑，效果一樣。 */
  runTransaction(fn) {
    const 跑 = () => {
      if (斷線) return Promise.reject(new Error('offline'));
      交易次數++;
      const 寫 = [];
      const tx = {
        get: r => Promise.resolve({ exists: r.p in 雲, data: () => ({ j: 雲[r.p] }) }),
        set: (r, d) => { 規則(d); 寫.push([r.p, d.j]); }
      };
      return Promise.resolve(fn(tx)).then(() => { 寫.forEach(w => { 雲[w[0]] = w[1]; }); });
    };
    const p = 交易佇列.then(跑);
    交易佇列 = p.catch(() => { });
    return p;
  }
};

function 開一台() {
  const g = {
    console, JSON, Math, Date, Object, Array, String, Number, Boolean, Promise,
    isNaN, parseInt, parseFloat, RegExp, Error, encodeURIComponent, decodeURIComponent
  };
  const MEM = {};
  g.localStorage = {
    getItem: k => MEM[k] == null ? null : MEM[k],
    setItem: (k, v) => { MEM[k] = String(v); },
    removeItem: k => { delete MEM[k]; }
  };
  const 空 = {
    value: '', innerHTML: '', textContent: '', className: '', style: {},
    getAttribute: () => null, setAttribute: () => { }, addEventListener: () => { },
    appendChild: () => { }, insertAdjacentHTML: () => { },
    querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
    classList: { add: () => { }, remove: () => { }, toggle: () => { } },
    scrollIntoView: () => { }
  };
  g.document = {
    getElementById: () => Object.create(空), querySelector: () => null,
    querySelectorAll: () => [], createElement: () => Object.create(空),
    addEventListener: () => { }, body: Object.create(空),
    documentElement: Object.create(空), activeElement: null
  };
  g.window = g; g.innerWidth = 390; g.innerHeight = 844;
  g.scrollTo = () => { }; g.requestAnimationFrame = () => 0;
  g.cancelAnimationFrame = () => { };
  g.setTimeout = () => 0; g.clearTimeout = () => { };
  g.getComputedStyle = () => ({ fontSize: '11px' });
  g.matchMedia = () => ({ matches: false, addListener: () => { } });
  vm.createContext(g);
  vm.runInContext(原始碼, g);
  g.seed();
  g.SYNC.db = 假庫;
  g.SYNC.on = 1;
  g.SYNC.last = {};
  return g;
}

/* 這台機器現在跟雲端對過一次（等於剛收完第一次快照）。 */
function 收(m) {
  const 表 = {};
  Object.keys(雲).forEach(p => {
    const i = p.indexOf('/'), col = p.slice(0, i), id = p.slice(i + 1);
    (表[col] = 表[col] || {})[id] = JSON.parse(雲[p]);
  });
  Object.keys(m.SYNC_KEY).forEach(col => {
    if (m.SYNC_UP_ONLY[col]) { m.SYNC.first[col] = 1; return; }
    m.syncTake(col, 表[col] || {});
  });
  m.syncPush();
}
const 等 = async () => { for (let i = 0; i < 6; i++) await new Promise(r => setImmediate(r)); };
const 雲的 = (col, id) => JSON.parse(雲[col + '/' + id]);
const 本機 = (m, id) => m.DB.Runs.filter(r => r.runId === id)[0];

let 錯 = [];
const ok = (c, msg) => { console.log((c ? '   ✓ ' : '   ✗ ') + msg); if (!c) 錯.push(msg); };
const 節 = t => console.log('\n' + t + '\n' + '─'.repeat(50));

(async () => {
  console.log('\n══ 同一筆被兩台機器碰 ══');

  /* 起點：雲端有一筆進行中的 Run，兩台都收過。 */
  const 起 = { runId: 'RX1', teamId: 'GX1', msId: 'MX1', state: 'running', est: 3,
    said: {}, spent: [0, 0], steps: [], stamp: null };
  雲['Runs/RX1'] = JSON.stringify(起);
  const A = 開一台(), B = 開一台();
  收(A); 收(B);
  await 等();

  節('1 · 手機醒來的蓋寫：A 交出去，B（還是舊的）補寫一句話');
  const a = 本機(A, 'RX1');
  a.state = 'submitted'; a.actual = 3; a.stamp = 'exact'; a.submittedAt = 111;
  A.save(); await 等();
  ok(雲的('Runs', 'RX1').state === 'submitted', 'A 交出去，雲端 state = submitted');

  const b = 本機(B, 'RX1');
  ok(b.state === 'running', 'B 這一台還不知道（本機還是 running）');
  b.said.UB = '我寫了訪談稿';
  B.save(); await 等();
  const r1 = 雲的('Runs', 'RX1');
  ok(r1.state === 'submitted', 'B 補寫之後，雲端 state 還是 submitted（沒被蓋回去）');
  ok(r1.actual === 3 && r1.submittedAt === 111 && r1.stamp === 'exact', '交出去那幾格（實際天數、交出時間、判定）都還在');
  ok(r1.said.UB === '我寫了訪談稿', 'B 寫的那一句也在');

  節('2 · 反過來：B 先推、A（舊的）後推');
  const 起2 = { runId: 'RX2', teamId: 'GX1', msId: 'MX1', state: 'running', est: 3,
    said: {}, spent: [0, 0], steps: [], stamp: null };
  雲['Runs/RX2'] = JSON.stringify(起2);
  收(A); 收(B); await 等();
  本機(B, 'RX2').said.UB = '先寫';
  B.save(); await 等();
  const a2 = 本機(A, 'RX2');
  a2.state = 'submitted'; a2.actual = 2; a2.submittedAt = 222;
  A.save(); await 等();
  const r2 = 雲的('Runs', 'RX2');
  ok(r2.state === 'submitted' && r2.said.UB === '先寫', '兩邊都在：state = submitted、B 的話還在');

  節('3 · 各填自己那一格（spent 陣列逐格併）');
  const 起3 = { runId: 'RX3', teamId: 'GX1', msId: 'MX1', state: 'running', est: 3,
    said: {}, spent: [0, 0], steps: [], stamp: null };
  雲['Runs/RX3'] = JSON.stringify(起3);
  收(A); 收(B); await 等();
  本機(A, 'RX3').spent = [3, 0]; 本機(B, 'RX3').spent = [0, 5];
  A.save(); B.save(); await 等();
  ok(JSON.stringify(雲的('Runs', 'RX3').spent) === '[3,5]', '同一分鐘各填一格：雲端 [3,5]，沒有掉');

  節('4 · 同一格兩邊都改：後寫的贏（本來就該這樣）');
  const 起4 = { runId: 'RX4', teamId: 'GX1', msId: 'MX1', state: 'running', est: 3,
    said: {}, spent: [0, 0], steps: [], stamp: null, note: 'x' };
  雲['Runs/RX4'] = JSON.stringify(起4);
  收(A); 收(B); await 等();
  本機(A, 'RX4').note = 'A'; A.save(); await 等();
  本機(B, 'RX4').note = 'B'; B.save(); await 等();
  ok(雲的('Runs', 'RX4').note === 'B', '同一格：後寫的 B 贏');

  節('5 · 斷線：推不上去的改動，收到別人的快照之後不能不見');
  const 起5 = { runId: 'RX5', teamId: 'GX1', msId: 'MX1', state: 'running', est: 3,
    said: {}, spent: [0, 0], steps: [], stamp: null };
  雲['Runs/RX5'] = JSON.stringify(起5);
  收(A); 收(B); await 等();
  斷線 = true;
  本機(B, 'RX5').said.UB = '斷線時寫的';
  B.save(); await 等();
  ok(!!B.SYNC.err, '推失敗，頂條會亮（SYNC.err 有值）');
  斷線 = false;
  const a5 = 本機(A, 'RX5');
  a5.state = 'submitted'; a5.actual = 4; a5.submittedAt = 555;
  A.save(); await 等();
  收(B);                      /* 回線了，先收到 A 的快照 */
  const b5 = 本機(B, 'RX5');
  ok(b5.state === 'submitted' && b5.said.UB === '斷線時寫的', 'B 收到快照之後：A 的交出去 + 自己斷線時寫的，兩個都在本機');
  await 等();
  const r5 = 雲的('Runs', 'RX5');
  ok(r5.state === 'submitted' && r5.said.UB === '斷線時寫的', '重試之後雲端也兩個都在');

  節('6 · 沒有的東西照舊：新的一筆、刪除、Events');
  const n = { runId: 'RX6', teamId: 'GX1', msId: 'MX1', state: 'running', est: 1, said: {}, stamp: null };
  A.DB.Runs.push(n); A.save(); await 等();
  ok('Runs/RX6' in 雲, '新的一筆直接寫上去');
  A.DB.Runs.splice(A.DB.Runs.indexOf(n), 1); A.save(); await 等();
  ok(!('Runs/RX6' in 雲), '刪掉的那一筆從雲端消失');
  const ev0 = Object.keys(雲).filter(p => p.indexOf('Events/') === 0).length;
  A.logEvent('login', {}); await 等();
  ok(Object.keys(雲).filter(p => p.indexOf('Events/') === 0).length > ev0 || A.DB.Events.length > 0,
    'Events 照舊往上推');

  節('7 · 舊版分頁把交件蓋掉：留著正確那一份的機器自動補回去');
  const 起7 = { runId: 'RX8', teamId: 'GX1', msId: 'MX1', state: 'running', est: 3,
    said: {}, spent: [0, 0], steps: [], stamp: null };
  雲['Runs/RX8'] = JSON.stringify(起7);
  收(A); 收(B); await 等();
  const a7 = 本機(A, 'RX8');
  a7.state = 'submitted'; a7.actual = 3; a7.stamp = 'exact'; a7.submittedAt = 333;
  A.save(); await 等();
  /* 舊版分頁不走交易、不做三方併：整筆（進行中、沒有交出時間）直接寫上去。 */
  雲['Runs/RX8'] = JSON.stringify(Object.assign({}, 起7, { said: { UB: '舊分頁寫的' } }));
  收(A); await 等();
  const r7 = 雲的('Runs', 'RX8');
  ok(r7.state === 'submitted' && r7.submittedAt === 333 && r7.actual === 3, 'A 收到被蓋掉的快照，把交出去的那幾格補回雲端');
  ok(r7.said.UB === '舊分頁寫的', '舊分頁寫的那一句話沒有被丟掉');
  收(B); await 等();
  ok(本機(B, 'RX8').state === 'submitted', '沒動過的 B 也跟著看到交出去了');

  節('8 · 同組兩位隊友同時按「承諾」：只會有一筆（2026-09-29 有 7 組出現兩筆）');
  [A, B].forEach(m => {
    m.DB.Teams.push({ teamId: 'GC1', classId: 'CC1', name: '測試組', joinCode: 'ZZZZZZ' });
    ['MC1', 'MC2'].forEach((id, i) => m.DB.Milestones.push({ msId: id, classId: 'CC1', mentorId: 'U1', title: '任務' + id, steps: [], teams: [], at: 1 + i }));
  });
  A.save(); B.save(); await 等();
  收(A); 收(B); await 等();
  /* 兩台都還沒看到對方的：各按各的承諾（天數不同） */
  const rA = A.actCommit('GC1', 'MC1', 2, [], [], 'wild', 'mid');
  const rB = B.actCommit('GC1', 'MC1', 5, [], [], 'wild', 'mid');
  await 等();
  ok(rA.runId === rB.runId, '兩台算出同一個編號（' + rA.runId + '）');
  const 幾筆 = () => Object.keys(雲).filter(p => p.indexOf('Runs/R_GC1_MC1_') === 0).length;
  ok(幾筆() === 1, '雲端只有一筆，不是兩筆');
  收(A); 收(B); await 等();
  const 本幾 = m => m.DB.Runs.filter(r => r.teamId === 'GC1' && r.msId === 'MC1').length;
  ok(本幾(A) === 1 && 本幾(B) === 1, '兩台各自也只有一筆');
  ok(本機(A, rA.runId).est === 本機(B, rA.runId).est, '兩台看到同一個承諾天數（先寫進去的那一台的）');

  節('9 · 晚到的那一台不能把已經交出去的蓋成新的');
  const rQ = A.actCommit('GC1', 'MC2', 3, [], [], 'wild', 'mid');
  await 等();
  const aQ = 本機(A, rQ.runId);
  aQ.state = 'submitted'; aQ.actual = 3; aQ.stamp = 'exact'; aQ.submittedAt = 777;
  A.save(); await 等();
  ok(雲的('Runs', rQ.runId).state === 'submitted', 'A 承諾並交出去了');
  /* B 一直沒收到（手機鎖屏）：現在才按承諾 */
  const rQb = B.actCommit('GC1', 'MC2', 1, [], [], 'wild', 'mid');
  await 等();
  ok(rQb.runId === rQ.runId, 'B 算出的編號跟 A 的一樣');
  const cQ = 雲的('Runs', rQ.runId);
  ok(cQ.state === 'submitted' && cQ.submittedAt === 777 && cQ.est === 3, '雲端還是 A 交出去的那一筆，沒有被 B 的新承諾蓋掉');
  收(B); await 等();
  ok(本機(B, rQ.runId).state === 'submitted', 'B 收到快照之後，跟著看到已交出');

  節('10 · 規則：舊版（不帶 v）的寫入進不來，新版的每一次寫入都過得了');
  const 前 = 被擋次數;
  let 擋住 = false;
  try { 假庫.batch().set({ p: 'Runs/RX1' }, { j: '{"state":"running"}' }); } catch (e) { 擋住 = true; }
  ok(擋住 && 被擋次數 === 前 + 1, '舊版那種 { j } 的整筆寫入被擋下');
  ok(前 === 0, '上面每一節新版自己的寫入，一次都沒有被規則擋到（都帶 v）');

  節('10b · 閒著的舊分頁才會自己重新整理（換了會丟東西的時候不換）');
  A.S.page = 'home'; A.SYNC.err = ''; A.SYNC.fly = {};
  ok(A.freshSafeToReload() === true, '在休息的頁、沒有未送出的改動：可以換');
  A.S.page = 'commit';
  ok(A.freshSafeToReload() === false, '在承諾那一頁（可能寫到一半）：不換');
  A.S.page = 'battle';
  ok(A.freshSafeToReload() === false, '在交作業那一頁：不換');
  A.S.page = 'home'; A.SYNC.fly = { 'Runs/x': '{}' };
  ok(A.freshSafeToReload() === false, '有改動還沒送到雲端：不換');
  A.SYNC.fly = {}; A.SYNC.err = 'offline';
  ok(A.freshSafeToReload() === false, '上一批推送失敗：不換');
  A.SYNC.err = ''; A.document.activeElement = { tagName: 'TEXTAREA' };
  ok(A.freshSafeToReload() === false, '游標在輸入框裡：不換');
  A.document.activeElement = null;
  ok(A.freshSafeToReload() === true, '都放開之後又可以換');

  節('10c · 分頁開太久（四小時）就算舊，不管有沒有新版');
  ok(A.tabTooOld() === false, '剛開的分頁不算舊');
  A.SYNC_LOADED = Date.now() - 5 * 3600000;
  ok(A.tabTooOld() === true, '開了五小時算舊');
  A.S.page = 'commit';
  ok(A.freshSafeToReload() === false, '舊了也一樣：在寫到一半的頁不換');
  A.SYNC_LOADED = Date.now();

  節('11 · 用量');
  console.log('   交易 ' + 交易次數 + ' 次、批次 ' + 批次次數 + ' 次');
  ok(交易次數 > 0, '更新有走交易（讀雲端再寫）');

  console.log('');
  if (錯.length) { console.error(錯.length + ' 項沒過。'); process.exit(1); }
  console.log('── 同一筆被兩台碰，沒有掉東西 ──');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
