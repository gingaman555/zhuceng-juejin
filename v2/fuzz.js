/* 隨機壓力：交出去的東西，有沒有任何一種順序會掉。

   stale.js 是我想得到的那幾種情形（手機醒來蓋寫、反向、斷線……）。
   想得到的總是有限的——9/23 掉的那三十次，沒有一次是我事先想到的。
   這一支不靠想：五台機器、三筆任務、隨機的動作與順序，
   每一輪隨機混入「舊版分頁整筆蓋寫」（還沒切規則的最壞情形），
   跑幾百個種子，每一輪結束後檢查：

     一 · 有人交出去過的任務，雲端最後一定還是「已交出」，交出時間還在
     二 · 每個人寫過的「我做了什麼」，雲端最後一句都還在
     三 · 大家都上線收完之後，每一台跟雲端一模一樣（沒有留下分歧）

   種子是固定的，所以失敗可以重現：node fuzz.js <種子>

   跑法：node fuzz.js　（預設 300 個種子，FUZZ_N=2000 可以加大）　　node fuzz.js 17　（只跑第 17 個） */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const D = path.join(__dirname, 'src');
const 原始碼 = fs.readdirSync(D).filter(f => f.endsWith('.js')).sort()
  .map(f => fs.readFileSync(path.join(D, f), 'utf8')).join('\n');

function 亂數(種子) {
  let s = (種子 * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

function 開一台(雲, 序) {
  const g = { console: { log() { }, warn() { }, error: console.error }, JSON, Math, Date, Object, Array, String, Number, Boolean, Promise,
    isNaN, parseInt, parseFloat, RegExp, Error, encodeURIComponent, decodeURIComponent };
  const MEM = {};
  g.localStorage = { getItem: k => MEM[k] == null ? null : MEM[k], setItem: (k, v) => { MEM[k] = String(v); }, removeItem: k => { delete MEM[k]; } };
  const 空 = { value: '', innerHTML: '', textContent: '', className: '', style: {}, getAttribute: () => null, setAttribute: () => { },
    addEventListener: () => { }, appendChild: () => { }, insertAdjacentHTML: () => { }, querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
    classList: { add: () => { }, remove: () => { }, toggle: () => { } }, scrollIntoView: () => { } };
  g.document = { getElementById: () => Object.create(空), querySelector: () => null, querySelectorAll: () => [],
    createElement: () => Object.create(空), addEventListener: () => { }, body: Object.create(空), documentElement: Object.create(空), activeElement: null };
  g.window = g; g.innerWidth = 390; g.innerHeight = 844;
  g.scrollTo = () => { }; g.requestAnimationFrame = () => 0; g.cancelAnimationFrame = () => { };
  g.setTimeout = () => 0; g.clearTimeout = () => { };
  g.getComputedStyle = () => ({ fontSize: '11px' }); g.matchMedia = () => ({ matches: false, addListener: () => { } });
  vm.createContext(g);
  vm.runInContext(原始碼, g);
  g.seed();
  g.序 = 序; g.斷線 = false; g.佇列 = Promise.resolve();
  const 規則 = d => {
    const k = Object.keys(d || {}).sort().join(',');
    if (k !== 'j,v' || d.v !== 2 || typeof d.j !== 'string') throw new Error('permission-denied');
  };
  g.SYNC.db = {
    doc: p => ({ p: p.replace('world/v1/', '') }),
    batch() {
      const ops = [];
      return {
        set: (r, d) => { 規則(d); ops.push(['s', r.p, d.j]); },
        delete: r => ops.push(['d', r.p]),
        commit() {
          if (g.斷線) return Promise.reject(new Error('offline'));
          ops.forEach(o => { if (o[0] === 's') 雲[o[1]] = o[2]; else delete 雲[o[1]]; });
          return Promise.resolve();
        }
      };
    },
    runTransaction(fn) {
      const 跑 = () => {
        if (g.斷線) return Promise.reject(new Error('offline'));
        const 寫 = [];
        const tx = { get: r => Promise.resolve({ exists: r.p in 雲, data: () => ({ j: 雲[r.p] }) }),
          set: (r, d) => { 規則(d); 寫.push([r.p, d.j]); } };
        return Promise.resolve(fn(tx)).then(() => { 寫.forEach(w => { 雲[w[0]] = w[1]; }); });
      };
      const p = g.佇列.then(跑); g.佇列 = p.catch(() => { }); return p;
    }
  };
  g.SYNC.on = 1; g.SYNC.last = {};
  return g;
}

const 收 = (m, 雲) => {
  if (m.斷線) return;
  const 表 = {};
  Object.keys(雲).forEach(p => { const i = p.indexOf('/'); (表[p.slice(0, i)] = 表[p.slice(0, i)] || {})[p.slice(i + 1)] = JSON.parse(雲[p]); });
  Object.keys(m.SYNC_KEY).forEach(col => { if (m.SYNC_UP_ONLY[col]) { m.SYNC.first[col] = 1; return; } m.syncTake(col, 表[col] || {}); });
  m.syncPush();
};
const 等 = async (n) => { for (let i = 0; i < (n || 4); i++) await new Promise(r => setImmediate(r)); };
const 本 = (m, id) => m.DB.Runs.filter(r => r.runId === id)[0];

async function 一輪(種子) {
  const 亂 = 亂數(種子), 選 = a => a[Math.floor(亂() * a.length)];
  const 雲 = {}, 人數 = 5, RUNS = ['RF1', 'RF2', 'RF3'];
  RUNS.forEach(id => { 雲['Runs/' + id] = JSON.stringify({ runId: id, teamId: 'GF1', msId: 'MF1', state: 'running', est: 3, said: {}, spent: [0, 0, 0, 0, 0], stamp: null }); });
  const 機 = [];
  for (let i = 0; i < 人數; i++) { const m = 開一台(雲, i); 機.push(m); 收(m, 雲); }
  await 等();
  const 交過 = {}, 說過 = {};
  const 步 = 30 + Math.floor(亂() * 40);
  for (let s = 0; s < 步; s++) {
    const m = 選(機), id = 選(RUNS), r = 本(m, id), 動 = 亂();
    if (process.env.TRACE) console.log('步' + s, '機' + m.序, id, '動作值' + 動.toFixed(2), '本機state=' + (r && r.state), '雲=' + (c=>c.state+'/'+c.submittedAt)(JSON.parse(雲['Runs/' + id])), m.斷線 ? '(斷線)' : '');
    if (動 < 0.22) {                                        /* 交出去（本機還是進行中才交得了） */
      if (r && r.state === 'running') { r.state = 'submitted'; r.actual = 2; r.stamp = 'exact'; r.submittedAt = 1000 + s; m.save(); 交過[id] = 1; }
    } else if (動 < 0.42) {                                 /* 補寫「我做了什麼」 */
      if (r) { r.said = r.said || {}; r.said['U' + m.序] = '話' + s; m.save(); 說過[id + '/' + m.序] = '話' + s; }
    } else if (動 < 0.52) {                                 /* 各填自己那一格 */
      if (r) { r.spent = (r.spent || [0, 0, 0, 0, 0]).slice(); r.spent[m.序] = 1 + (s % 5); m.save(); }
    } else if (動 < 0.72) { 收(m, 雲); }                    /* 收快照 */
    else if (動 < 0.82) { m.斷線 = !m.斷線; if (!m.斷線) 收(m, 雲); }   /* 斷線／回線 */
    else if (動 < 0.92) {                                   /* 舊版分頁：把它手上那一份整筆推上去（規則還沒切的最壞情形） */
      if (r) 雲['Runs/' + id] = JSON.stringify(r);
    }
    if (亂() < 0.6) await 等(1 + Math.floor(亂() * 3));      /* 有時候不等——這樣才會交錯 */
  }
  /* 全部回線，收到不再變 */
  機.forEach(m => { m.斷線 = false; });
  for (let 趟 = 0; 趟 < 12; 趟++) { const 前 = JSON.stringify(雲); 機.forEach(m => 收(m, 雲)); await 等(6); if (JSON.stringify(雲) === 前 && 趟 > 2) break; }

  if (process.env.TRACE) { const c = JSON.parse(雲['Runs/RF1']); console.log('最後雲', c.state, c.submittedAt, JSON.stringify(c.said)); 機.forEach(m => { const r = 本(m,'RF1'); console.log('機'+m.序, r.state, r.submittedAt, 'fly', Object.keys(m.SYNC.fly).length, 'last=cloud', m.SYNC.last['Runs/RF1']===雲['Runs/RF1']); }); }
  const 錯 = [];
  Object.keys(交過).forEach(id => {
    const c = JSON.parse(雲['Runs/' + id]);
    if (c.state !== 'submitted' || !c.submittedAt) 錯.push(id + ' 交出去過，最後雲端是 ' + c.state + '（submittedAt ' + c.submittedAt + '）');
  });
  Object.keys(說過).forEach(k => {
    const [id, who] = k.split('/'), c = JSON.parse(雲['Runs/' + id]);
    if (!c.said || !c.said['U' + who]) 錯.push(id + ' 的 U' + who + ' 那一句話不見了');
  });
  機.forEach(m => RUNS.forEach(id => {
    if (JSON.stringify(m.syncFlat()['Runs/' + id]) !== JSON.stringify(雲['Runs/' + id])) 錯.push('機器' + m.序 + ' 跟雲端不一樣：' + id);
  }));
  return 錯;
}

(async () => {
  const 指定 = process.argv[2] ? [Number(process.argv[2])] : Array.from({ length: Number(process.env.FUZZ_N) || 300 }, (_, i) => i + 1);
  let 壞 = 0, 首 = null;
  for (const 種 of 指定) {
    const 錯 = await 一輪(種);
    if (錯.length) { 壞++; if (!首) 首 = [種, 錯]; }
  }
  console.log('\n隨機壓力：' + 指定.length + ' 個種子，五台機器、三筆任務、隨機交出／寫話／斷線／舊版蓋寫');
  if (壞) {
    console.error('✗ ' + 壞 + ' 個種子出現掉資料。第一個：種子 ' + 首[0]);
    首[1].slice(0, 6).forEach(e => console.error('   ' + e));
    process.exit(1);
  }
  console.log('✓ 沒有任何一輪掉資料：交出去的都還在、說過的話都還在、每一台跟雲端一致');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
