/* 教室等級的實測。

   前面那幾支（e2e、multi）都是**一台機器**在跑：同一份 DB、同一個
   S.who 換來換去。那證明得了流程對，證明不了教室裡的事——教室裡是
   十五台不同的機器，各自有自己的 localStorage、自己的機器記號，
   透過雲端看同一份資料，而且會在同一分鐘內按下去。

   這一支把那件事真的做出來：

     · 15 個獨立的執行環境（3 位老師 + 12 位學生），彼此看不到對方的
       變數，跟兩台筆電、十二支手機一樣
     · 一份共用的「雲端」，走的是真的 syncFlat / syncTake
     · 併發的地方不先收再推，而是照教室裡的樣子交錯著推
       （老師說「大家現在填」，全班在同一分鐘內按下去）

   跑法：node class.js
*/

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const D = path.join(__dirname, 'src');
const 原始碼 = fs.readdirSync(D).filter(f => f.endsWith('.js')).sort()
  .map(f => fs.readFileSync(path.join(D, f), 'utf8')).join('\n');

/* ---------- 一台機器 ---------- */
function 開一台(名) {
  const g = {
    console, JSON, Math, Date, Object, Array, String, Number, Boolean,
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
  g.機器 = 名;
  vm.createContext(g);
  vm.runInContext(原始碼, g);
  /* 真的機器開起來會先種示範資料。留著——順便驗它不會漏到雲上。 */
  g.seed();
  g.SYNC.last = g.syncFlat();
  return g;
}

/* ---------- 雲端 ---------- */
const 雲 = {};
let 寫次 = 0;

function 推(m) {
  const now = m.syncFlat();
  let n = 0;
  Object.keys(now).forEach(p => {
    if (m.SYNC.last[p] !== now[p]) { 雲[p] = now[p]; n++; }
  });
  Object.keys(m.SYNC.last).forEach(p => {
    if (!(p in now)) { delete 雲[p]; n++; }
  });
  m.SYNC.last = now;
  寫次 += n;
  return n;
}

function 收(m) {
  const 表 = {};
  Object.keys(雲).forEach(p => {
    const i = p.indexOf('/');
    const col = p.slice(0, i), id = p.slice(i + 1);
    (表[col] = 表[col] || {})[id] = JSON.parse(雲[p]);
  });
  Object.keys(m.SYNC_KEY).forEach(col => {
    if (m.SYNC_UP_ONLY[col]) return;
    m.syncTake(col, 表[col] || {});
  });
  /* syncTake 併過的話會叫 syncPush，而這裡沒有真的 firebase，
     所以手動補那一下——它做的事跟 syncPush 一模一樣。 */
  推(m);
}

/* 收到大家都不再變為止。

   一趟不夠：A 併好之後推上去，那一份要下一趟才會到 B 手上。
   真的跑的時候 Firestore 的訂閱是推播的，那一下是自動發生的
   （而且很快）；這裡是輪詢，所以要自己轉到收斂。

   轉幾趟本身是一個數字——它就是「全班的畫面要多久才一致」。 */
let 最多趟 = 0;
function 全收(機) {
  for (var 趟 = 1; 趟 <= 8; 趟++) {
    var 前 = JSON.stringify(雲);
    機.forEach(收);
    if (JSON.stringify(雲) === 前) { if (趟 > 最多趟) 最多趟 = 趟; return 趟; }
  }
  最多趟 = 9;
  return 9;
}

/* ---------- 記分 ---------- */
let 錯 = [];
const ok = (c, m) => { console.log((c ? '   ✓ ' : '   ✗ ') + m); if (!c) 錯.push(m); };
const 節 = (n, t) => console.log('\n' + n + ' · ' + t + '\n' +
  '────────────────────────────────────────────────────');

/* ════════════════════════════════════════════════════ */
console.log('\n════════════════════════════════════════════════════');
console.log('  教室等級：3 位老師 + 12 位學生，15 台機器，一份雲端');
console.log('════════════════════════════════════════════════════');

節('1', '開學第一天：老師開班，唸一組碼');

const 師 = ['林老師', '陳老師', '王老師'].map((n, i) => {
  const m = 開一台('師' + i);
  m.名字 = n;
  return m;
});
const 生名 = ['小美', '阿哲', '冠廷', '宜庭', '承翰', '雅琪',
  '玟君', '伯凱', '柏翰', '沛慈', '思妤', '尚恩'];
const 生 = 生名.map((n, i) => { const m = 開一台('生' + i); m.名字 = n; return m; });
const 全 = 師.concat(生);
ok(全.length === 15, '開了 ' + 全.length + ' 台機器');

/* 機器記號不能撞，不然兩台生出來的 ID 會一樣 */
const 記號 = 全.map(m => m.devTag());
ok(new Set(記號).size === 記號.length, '十五台的機器記號各不相同');

/* 老師一開班 */
const t0 = 師[0].actRegister({ account: 'tea_lin', password: 'lin1234', name: '林老師', role: 'teacher' }).user;
const 班 = 師[0].actNewClass('114-1 畢業專題', t0.userId).klass;
const 碼 = 班.joinCode;
推(師[0]);
console.log('   唸出去的碼：' + 碼);
ok(/^[A-HJ-NP-Z2-9]{6}$/.test(碼), '六個英數字，沒有會看錯的 I O 0 1');

/* 老師二三 —— 一位註冊時填碼，一位事後補 */
收(師[1]);
const t1 = 師[1].actRegister({ account: 'tea_chen', password: 'chen1234', name: '陳老師', role: 'teacher', code: 碼 }).user;
ok(t1 && t1.classId === 班.classId, '陳老師 註冊時填碼 → 同一個班');
推(師[1]);

收(師[2]);
const t2 = 師[2].actRegister({ account: 'tea_wang', password: 'wang1234', name: '王老師', role: 'teacher' }).user;
ok(t2 && !t2.classId, '王老師 沒填碼 → 先沒有班（不會被丟進一個空班）');
const 補 = 師[2].actJoinClass(t2.userId, 碼);
ok(!補.err && 師[2].userOf(t2.userId).classId === 班.classId, '王老師 事後補碼 → 同一個班');
推(師[2]);

節('2', '十二位學生用同一組碼註冊');

全收(全);
生.forEach((m, i) => {
  const r = m.actRegister({
    account: 'b1081' + String(201 + i), /* 真的學號，不跟示範帳號撞 */
    password: 'pw' + (1000 + i), name: 生名[i], role: 'student', code: 碼
  });
  if (r.err) ok(false, 生名[i] + ' 卡住：' + r.err);
  m.我 = r.user;
  推(m);            /* 各自推，中間不收——十二個人同時按 */
});
全收(全);
const 名冊 = 師[0].where('Users', u => u.classId === 班.classId && u.role === 'student');
ok(名冊.length === 12, '老師看到 ' + 名冊.length + ' 位學生');
const uid = 名冊.map(u => u.userId);
ok(new Set(uid).size === 12, '十二個 ID 沒有一個撞');
ok(名冊.every(u => u.name && u.name !== u.account), '每一位都有名字，不是拿學號頂替');

節('3', '分組：六個人建隊，另外六個用隊的碼進來');

const 組名 = ['甲', '乙', '丙', '丁', '戊', '己'];
const 隊碼 = [];
for (let i = 0; i < 6; i++) {
  const m = 生[i * 2];
  m.S.who = m.我.userId; m.S.role = 'student';
  const r = m.actNewTeam('第' + (i + 1) + '組 · ' + 組名[i], m.我.userId);
  if (r.err) { ok(false, 組名[i] + ' 建隊失敗：' + r.err); continue; }
  隊碼.push(r.team.joinCode);
  推(m);
}
ok(隊碼.length === 6, '六隊都建起來了');
ok(new Set(隊碼).size === 6, '六組的隊碼各不相同');
ok(!隊碼.includes(碼), '隊的碼跟班的碼是兩回事');

全收(全);
for (let i = 0; i < 6; i++) {
  const m = 生[i * 2 + 1];
  m.S.who = m.我.userId; m.S.role = 'student';
  const r = m.actJoinTeam(隊碼[i], m.我.userId);
  if (r.err) ok(false, 生名[i * 2 + 1] + ' 進不了組：' + r.err);
  推(m);
}
全收(全);
const 隊 = 師[0].where('Teams', t => t.classId === 班.classId);
ok(隊.length === 6, '六組都在老師那邊看得到');
ok(隊.every(t => 師[0].where('Users', u => u.teamId === t.teamId).length === 2),
  '每一組都是兩個人');
/* 拿班的碼想進組要進不去 */
生[0].S.who = 生[0].我.userId;
ok(!!生[0].actJoinTeam(碼, 生[0].我.userId).err, '已經有隊的人不能再換組');

節('4', '示範資料有沒有漏到雲上');

const 雲上的班 = Object.keys(雲).filter(p => p.indexOf('Classes/') === 0);
const 雲上的組 = Object.keys(雲).filter(p => p.indexOf('Teams/') === 0);
ok(雲上的班.length === 1, '雲端只有一個班（示範班沒上去）：' + 雲上的班.length);
ok(雲上的組.length === 6, '雲端只有六組（示範組沒上去）：' + 雲上的組.length);
const 示範還在 = 生[0].where('Teams', t => t._d).length;
ok(示範還在 > 0, '示範班還留在每一台機器上（' + 示範還在 + ' 組），兩邊並存');

節('5', '三個任務，一路跑到專案結束');

const 任務 = [
  { t: '校園導覽 App 提案', d: 7 },
  { t: '使用者訪談與人物誌', d: 10 },
  { t: '高擬真原型與測試', d: 14 }
];
const 記 = [];

任務.forEach((ms, 回) => {
  console.log('\n   ── 第 ' + (回 + 1) + ' 個任務：' + ms.t + ' ──');

  /* 老師派任務。三位老師輪流派，掛在派的那一位身上。 */
  const 派 = 師[回 % 3];
  收(派);
  const 師我 = 派.find('Users', u => u.role === 'teacher' && u.classId === 班.classId
    && u.name === 派.名字);
  派.S.who = 師我.userId; 派.S.role = 'teacher';
  const 全隊 = 派.where('Teams', t => t.classId === 班.classId).map(t => t.teamId);
  const mr = 派.actPublish(班.classId, {
    title: ms.t, mentorId: 師我.userId, teams: 全隊,
    due: 派.now() + ms.d * 86400000, steps: []
  });
  const msId = mr && mr.msId;
  ok(!!msId, ms.t + '　' + 派.名字 + ' 派下去了');
  推(派);
  全收(全);

  /* 六組同時承諾 —— 中間不收 */
  const 承諾 = [];
  for (let i = 0; i < 6; i++) {
    const m = 生[i * 2];
    m.S.who = m.我.userId;
    const t = m.userOf(m.我.userId).teamId;
    const 拆 = [
      { n: '查資料跟找參考', d: 2 + (i % 3), who: 生[i * 2].我.userId, byOwn: 1 },
      { n: '做出來', d: 3 + (i % 4), who: 生[i * 2 + 1].我.userId, byOwn: i % 3 !== 0 }
    ];
    const r = m.actCommit(t, msId, 拆[0].d + 拆[1].d, [], 拆, '', (i % 3) + 1);
    if (r && r.err) ok(false, 組名[i] + ' 承諾失敗：' + r.err);
    承諾.push(r);
    推(m);           /* 六組同一分鐘按下去 */
  }
  全收(全);
  const 跑中 = 師[0].where('Runs', r => r.msId === msId && r.state === 'running');
  ok(跑中.length === 6, '六組都承諾了（' + 跑中.length + ' 筆），沒有一筆被蓋掉');

  /* 推進：每個人各推幾天 */
  生.forEach((m, i) => {
    收(m);
    m.S.who = m.我.userId;
    const t = m.userOf(m.我.userId).teamId;
    const run = m.where('Runs', r => r.teamId === t && r.msId === msId)[0];
    if (!run) return;
    for (let d = 0; d < 2 + (i % 3); d++) {
      m.actPush(t, run.runId, -1, 0);
    }
    推(m);
  });
  全收(全);

  /* 十二個人同時存自己那一份 —— 這是最容易掉東西的一刻 */
  生.forEach((m, i) => {
    m.S.who = m.我.userId;
    const t = m.userOf(m.我.userId).teamId;
    const run = m.where('Runs', r => r.teamId === t && r.msId === msId)[0];
    if (!run) return;
    const 我的 = (run.plan || []).map((p, k) => p.who === m.我.userId ? k : -1).filter(k => k >= 0);
    const sp = {};
    我的.forEach(k => { sp[k] = (run.plan[k].d || 1) + (i % 3) - 1; });
    m.actMyPart(t, run.runId, { spent: sp, said1: m.名字 + '：我這幾件做完了' });
    推(m);          /* 全班同一分鐘按下去，中間沒有人先收 */
  });
  全收(全);

  /* 十二份都在嗎 */
  let 缺 = [];
  隊.forEach((t, i) => {
    const run = 師[0].where('Runs', r => r.teamId === t.teamId && r.msId === msId)[0];
    if (!run) { 缺.push(組名[i] + ' 沒有這一趟'); return; }
    const said = Object.keys(run.said || {}).length;
    const sp = (run.spent || []).filter(x => Number(x) > 0).length;
    if (said !== 2) 缺.push(組名[i] + ' 只有 ' + said + ' 個人留了話');
    if (sp !== 2) 缺.push(組名[i] + ' 只有 ' + sp + ' 件有天數');
  });
  ok(!缺.length, '十二個人的那一份都在（同時按下去也沒掉）' +
    (缺.length ? '　缺：' + 缺.join('、') : ''));

  /* 六組同時交出去 */
  for (let i = 0; i < 6; i++) {
    const m = 生[i * 2];
    收(m);
    m.S.who = m.我.userId;
    const t = m.userOf(m.我.userId).teamId;
    const run = m.where('Runs', r => r.teamId === t && r.msId === msId)[0];
    m.actSubmit(t, run.runId, { link: '雲端硬碟 / 第' + (i + 1) + '組' });
    推(m);
  }
  全收(全);
  const 待審 = 師[1].where('Runs', r => r.msId === msId && r.state === 'submitted');
  ok(待審.length === 6, '老師收到六件（' + 待審.length + '）');

  /* 三位老師同時審，各審兩組 —— 併發 */
  const 判 = [];
  for (let i = 0; i < 6; i++) {
    const 審 = 師[i % 3];
    收(審);
    const 師我2 = 審.find('Users', u => u.role === 'teacher' && u.classId === 班.classId
      && u.name === 審.名字);
    審.S.who = 師我2.userId; 審.S.role = 'teacher';
    const run = 審.where('Runs', r => r.msId === msId && r.teamId === 隊[i].teamId)[0];
    /* 第二回退回一組，看退回之後能不能再交 */
    const 退 = (回 === 1 && i === 2);
    if (退) {
      審.actReject(run.runId, '看不到你們的東西，位置再確認一次。');
      判.push({ i, 退: 1 });
    } else {
      審.actApprove(run.runId, i % 2 ? '訪談紀錄很完整，繼續。' : '');
      判.push({ i, 退: 0 });
    }
    推(審);          /* 三位老師同一分鐘按，中間不收 */
  }
  全收(全);
  const 收下 = 師[0].where('Runs', r => r.msId === msId &&
    (r.state === 'done' || r.state === 'approved')).length;
  const 退回 = 師[0].where('Runs', r => r.msId === msId && r.state === 'back').length;
  ok(收下 + 退回 === 6, '六件都判完了（收下 ' + 收下 + '、退回 ' + 退回 + '），三位老師同時按也沒互相蓋掉');

  /* 退回那一組改完再交 */
  const 被退 = 判.filter(x => x.退);
  被退.forEach(x => {
    const m = 生[x.i * 2];
    收(m);
    m.S.who = m.我.userId;
    const t = m.userOf(m.我.userId).teamId;
    const run = m.where('Runs', r => r.teamId === t && r.msId === msId)[0];
    ok(run && run.state === 'back', 組名[x.i] + ' 這一台看得到被退回');
    m.actResend(t, run.runId, '雲端硬碟 / 第' + (x.i + 1) + '組 / 已改好');
    推(m);
    收(師[0]);
    const 再 = 師[0].where('Runs', r => r.runId === run.runId)[0];
    ok(再 && 再.state === 'submitted', 組名[x.i] + ' 改完再交，老師又看得到（而且位置有存下來：' +
      String(再.link || 再.where || '').slice(-6) + '）');
    師[0].S.who = 師[0].find('Users', u => u.role === 'teacher' && u.name === 師[0].名字).userId;
    師[0].S.role = 'teacher';
    師[0].actApprove(再.runId, '這次找得到了。');
    推(師[0]);
  });
  全收(全);
  記.push({ msId, t: ms.t });
});

節('6', '每一台看到的是不是同一份');

const 樣 = ['Users', 'Classes', 'Teams', 'Milecrystals', 'Runs'].map(col => {
  const 數 = 全.map(m => m.where(col, r => !r._d).length);
  const 齊 = new Set(數).size === 1;
  ok(齊, col + ' 十五台看到的筆數一樣（' + 數[0] + '）' + (齊 ? '' : '　→ ' + 數.join('/')));
  return 齊;
});

/* 一筆一筆比內容，不只比筆數 */
const 基 = {};
師[0].where('Runs', r => !r._d).forEach(r => { 基[r.runId] = JSON.stringify(r); });
let 不同 = [];
全.forEach(m => {
  m.where('Runs', r => !r._d).forEach(r => {
    if (基[r.runId] !== JSON.stringify(r)) 不同.push(m.機器 + ' 的 ' + r.runId);
  });
});
ok(!不同.length, '每一趟的內容十五台完全一樣' + (不同.length ? '　→ ' + 不同.slice(0, 4).join('、') : ''));

節('7', '論文要的資料匯得出來嗎');

收(師[0]);
const 師A = 師[0].find('Users', u => u.role === 'teacher' && u.name === 師[0].名字);
師[0].S.who = 師A.userId; 師[0].S.role = 'teacher';
const csv1 = 師[0].exportRuns(班.classId);
const csv2 = 師[0].exportItems(班.classId);
const 列1 = csv1.trim().split('\n'), 列2 = csv2.trim().split('\n');
ok(列1.length - 1 === 18, '一趟一列：' + (列1.length - 1) + ' 列（6 組 × 3 個任務）');
ok(列2.length - 1 === 36, '一件一列：' + (列2.length - 1) + ' 列（每趟 2 件）');
/* CSV 有跳脫（見 csvOf），不能用逗號硬切。 */
function 切(l) {
  var out = [], cur = '', q = 0;
  for (var i = 0; i < l.length; i++) {
    var c = l[i];
    if (q) { if (c === '\"') { if (l[i + 1] === '\"') { cur += '\"'; i++; } else q = 0; } else cur += c; }
    else if (c === '\"') q = 1;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur); return out;
}
const 欄1 = 切(列1[0]), 欄2 = 切(列2[0]);
ok(欄1.indexOf('承諾天數') >= 0 && 欄1.indexOf('實際天數') >= 0 && 欄1.indexOf('偏差率') >= 0,
  '偏差率算得出來（承諾天數、實際天數、偏差率都是獨立的一欄）');
const i實 = 欄2.indexOf('實際幾天'), i誰 = 欄2.indexOf('掛在誰名下'), i說 = 欄2.indexOf('他說幾天');
const 空天數 = 列2.slice(1).filter(l => !(Number(切(l)[i實]) > 0)).length;
ok(空天數 === 0, '三十六件全部有實際天數，沒有一件是 0（個人層的資料收得齊）' +
  (空天數 ? '　→ 缺 ' + 空天數 + ' 件' : ''));
const 人頭 = new Set(列2.slice(1).map(l => 切(l)[i誰]).filter(Boolean));
ok(人頭.size === 12, '十二位學生每一位都有自己的資料（' + 人頭.size + ' 位）');
const 有說 = 列2.slice(1).filter(l => Number(切(l)[i說]) > 0).length;
ok(有說 === 36, '三十六件都有「他說幾天」，偏差率才算得出來（' + 有說 + ' 件）');
const i本 = 欄2.indexOf('天數是不是本人按的');
const 本人 = 列2.slice(1).filter(l => 切(l)[i本] === 'Y').length;
console.log('   （其中 ' + 本人 + ' / 36 件的天數是本人自己按的——這一欄本身就是一個變項）');
const i寫 = 欄2.indexOf('他寫了什麼');
const 有寫 = 列2.slice(1).filter(l => 切(l)[i寫]).length;
ok(有寫 === 36, '三十六件都留下了那個人自己寫的一句（' + 有寫 + ' 件）');

節('8', '每一台的每一頁都畫得出來');

let 畫 = 0, 炸 = [];
[[師[0], 'teacher'], [生[0], 'student'], [生[5], 'student']].forEach(([m, role]) => {
  const u = m.find('Users', x => x.name === m.名字);
  m.S.who = u.userId; m.S.role = role;
  Object.keys(m.PAGES).forEach(p => {
    if (!m.allowed(u, p)) return;
    m.S.page = p;
    try { m.PAGES[p](); 畫++; } catch (e) { 炸.push(m.機器 + '/' + p + '：' + e.message); }
  });
});
ok(!炸.length, '畫了 ' + 畫 + ' 次，沒有一頁炸掉' + (炸.length ? '　→ ' + 炸.slice(0, 3).join('　') : ''));

節('9', '雲端被寫了幾次');

console.log('   一學期（3 個任務）共寫 ' + 寫次 + ' 次');
console.log('   全班的畫面要 ' + 最多趟 + ' 趟才一致（併回去的那一份要多一趟才到別人手上）');
console.log('   雲端現在有 ' + Object.keys(雲).length + ' 筆');
const 每表 = {};
Object.keys(雲).forEach(p => { const c = p.slice(0, p.indexOf('/')); 每表[c] = (每表[c] || 0) + 1; });
console.log('   ' + Object.keys(每表).map(k => k + ' ' + 每表[k]).join('　'));
ok(寫次 < 50000, 'Firestore 免費額度是一天兩萬次寫入——這學期用了 ' + 寫次 + ' 次');

console.log('\n════════════════════════════════════════════════════');
console.log(錯.length ? '  ✗ ' + 錯.length + ' 條沒過\n  ' + 錯.join('\n  ')
  : '  15 台機器 · 3 位老師 · 12 位學生 · 3 個任務\n  併發的每一刻都沒有掉東西');
console.log('════════════════════════════════════════════════════\n');
process.exit(錯.length ? 1 : 0);
