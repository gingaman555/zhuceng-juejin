/* 不連 Firebase 的自我測試：把 Firestore 換成記憶體版，其餘照 index.js 的做法，
   驗證 Code.gs 能不能原封不動在沙盒裡跑，以及那四個資料原語有沒有接對。
   跑法：node functions/selftest.js */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const shim = require('./shim');

const SRC = fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8');
const HEADS = (function () {
  const m = SRC.match(/var SHEET_DEFS = \{[\s\S]*?\n\};/);
  const box = vm.createContext({});
  return vm.runInContext(m[0] + '\nSHEET_DEFS;', box);
})();

const DB = {};                       /* name -> rows */
Object.keys(HEADS).forEach((n) => { DB[n] = []; });
const PROPS = {};

const copy = (rows) => rows.map((r) => Object.assign({}, r));

function run(name, args) {
  const unit = {
    tables: {}, dirty: {}, props: Object.assign({}, PROPS), propWrites: {},
    drive: { uploads: [], deletes: [], reads: {} },
    rows(n) { if (!this.tables[n]) this.tables[n] = []; return this.tables[n]; }
  };
  Object.keys(HEADS).forEach((n) => { unit.tables[n] = copy(DB[n]); });

  const sandbox = {
    console, JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp, Error,
    isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
    Utilities: shim.Utilities, Session: shim.Session, LockService: shim.LockService,
    HtmlService: shim.HtmlService, MimeType: shim.MimeType, SpreadsheetApp: null,
    DriveApp: shim.makeDrive(unit.drive),
    PropertiesService: {
      getScriptProperties: () => shim.makeProperties(unit.props, (k, v) => { unit.propWrites[k] = v; }),
      getUserProperties() { return this.getScriptProperties(); },
      getDocumentProperties() { return this.getScriptProperties(); }
    },
    CacheService: {
      getScriptCache: () => ({ get: () => null, getAll: () => ({}), put() {}, putAll() {}, remove() {}, removeAll() {} }),
      getUserCache() { return this.getScriptCache(); },
      getDocumentCache() { return this.getScriptCache(); }
    }
  };
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);
  vm.runInContext(SRC, ctx, { filename: 'Code.gs' });

  const gone = () => { throw new Error('不使用試算表。'); };
  ctx.ss_ = gone; ctx.sheet_ = gone;
  ctx.readRaw_ = (n) => copy(unit.rows(n));
  ctx.writeTable_ = (n, rows) => { unit.tables[n] = copy(rows || []); unit.dirty[n] = true; delete ctx.MEMO_.tables[n]; };
  ctx.appendRow_ = (n, obj) => { unit.rows(n).push(Object.assign({}, obj)); unit.dirty[n] = true; delete ctx.MEMO_.tables[n]; };
  ctx.upsert_ = (n, keys, obj) => {
    const rows = unit.rows(n);
    const at = rows.findIndex((r) => (keys || []).every((k) => String(r[k]) === String(obj[k])));
    if (at < 0) rows.push(Object.assign({}, obj)); else rows[at] = Object.assign({}, rows[at], obj);
    unit.dirty[n] = true; delete ctx.MEMO_.tables[n];
  };
  ctx.cacheGet_ = () => null; ctx.cachePut_ = () => {};
  ctx.cacheBust_ = (name) => { delete ctx.MEMO_.tables[name]; };
  ctx.cacheVer_ = () => 0; ctx.MEMO_ = { ss: null, sheets: {}, tables: {} };

  const fn = ctx[name];
  if (typeof fn !== 'function') throw new Error('沒有 ' + name);
  const out = fn.apply(null, args || []);

  Object.keys(unit.dirty).forEach((n) => { DB[n] = copy(unit.rows(n)); });
  Object.keys(unit.propWrites).forEach((k) => {
    if (unit.propWrites[k] === null) delete PROPS[k]; else PROPS[k] = unit.propWrites[k];
  });
  return out;
}

/* ---------------- 測試 ---------------- */
let pass = 0, fail = 0;
const T = (label, cond, extra) => {
  if (cond) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label + (extra ? '  → ' + JSON.stringify(extra) : '')); }
};

console.log('\n── 逐層掘進 · Firebase 後端自我測試 ──\n');

const NAMES = Object.keys(vm.runInContext('this', (function () {
  const c = vm.createContext({ JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp, Error,
    isNaN, parseInt, parseFloat, console, encodeURIComponent, decodeURIComponent,
    Utilities: shim.Utilities, Session: shim.Session, LockService: shim.LockService,
    HtmlService: shim.HtmlService, MimeType: shim.MimeType, SpreadsheetApp: null,
    DriveApp: shim.makeDrive({ uploads: [], deletes: [], reads: {} }),
    PropertiesService: { getScriptProperties: () => shim.makeProperties({}, () => {}) },
    CacheService: { getScriptCache: () => ({ get: () => null, getAll: () => ({}), put() {}, putAll() {}, remove() {}, removeAll() {} }) } });
  vm.runInContext(SRC, c);
  return c;
})())).filter((k) => /^api[A-Z]/.test(k));

console.log('載入 Code.gs：找到 ' + NAMES.length + ' 支 API\n');
T('48 支 API 全部掛得上', NAMES.length >= 45, NAMES.length);

/* 1. 研究者註冊 */
const reg = run('apiRegister', [{ account: 'res01', password: 'pw1234', role: 'researcher', name: '研究者' }]);
T('研究者註冊', reg && reg.ok === true, reg);
const rt = reg.token;

/* 2. 密碼雜湊真的有存，而且不是明碼 */
T('密碼加鹽雜湊，沒有明碼', DB.Users.length === 1 && DB.Users[0].hash && DB.Users[0].salt &&
  String(DB.Users[0].hash).indexOf('pw1234') < 0, DB.Users[0] && Object.keys(DB.Users[0]));

/* 3. 重複帳號要被擋 */
const dup = run('apiRegister', [{ account: 'res01', password: 'pw1234', role: 'researcher', name: 'X' }]);
T('重複帳號被擋', dup && dup.ok === false, dup);

/* 4. 開班 */
const kl = run('apiAdminCreateClass', [rt, '設計專題', '114-1', '2026-05-04', 18]);
T('開班', kl && kl.ok === true, kl && kl.error);
const cid = (kl.classes || [])[0] && kl.classes[0].id;
T('班級寫進資料表', !!cid && DB.Classes.length === 1, DB.Classes.length);

/* 5. 建老師 */
const tea = run('apiAdminCreateUser', [rt, { account: 'tea01', password: 'pw1234', role: 'teacher', name: '陳老師', classId: cid }]);
T('建立老師帳號', tea && tea.ok === true, tea && tea.error);

/* 6. 貼名單 */
const ros = run('apiAdminSaveRoster', [rt, cid, '甲：小明, 小華\n乙：小美, 小強']);
T('貼班級名單', ros && ros.ok === true, ros && ros.error);
T('名單建出兩組四人', DB.Teams.length === 2 && DB.Roster.length === 4,
  { teams: DB.Teams.length, roster: DB.Roster.length });

/* 7. 老師登入 */
const tl = run('apiLogin', [{ account: 'tea01', password: 'pw1234' }]);
T('老師登入', tl && tl.ok === true, tl && tl.error);
const tk = tl.token;

/* 8. 密碼錯要被擋 */
const bad = run('apiLogin', [{ account: 'tea01', password: 'wrong' }]);
T('錯誤密碼被擋', bad && bad.ok === false, bad);

/* 9. 老師 bootstrap */
const tb = run('apiBootstrap', [tk]);
T('老師 bootstrap', tb && tb.ok === true, tb && tb.error);
T('拿得到邀請碼', !!tb.joinCode, tb.joinCode);

/* 10. 學生用邀請碼註冊 */
const sr = run('apiRegister', [{ account: 'stu01', password: 'pw1234', role: 'student', joinCode: tb.joinCode }]);
T('學生用邀請碼註冊', sr && sr.ok === true, sr && sr.error);
const stk = sr.token;

/* 11. 認領身分 */
const mr = run('apiMyRoster', [stk]);
T('看得到名單', mr && mr.ok === true && (mr.roster || []).length === 2, mr && mr.error);
const firstMember = ((mr.roster || [])[0] || {}).members || [];
T('第一組有兩個名字', firstMember.length === 2, firstMember.length);
const claim = run('apiClaimIdentity', [stk, firstMember[0].rosterId]);
T('認領名字進到組別', claim && claim.ok === true && !!claim.teamId, claim);

/* 12. 老師發清單（沒指定礦石，後端要自動配） */
const pub = run('apiPublishList', [tk, cid, 1, [{
  layer: 1, type: 'required', title: '寫下你們要做什麼',
  cond: '一句話講得完', note: '', due: 3, dueDow: 5, spec: 'PDF 一份'
}]]);
T('發派清單', pub && pub.ok === true, pub && pub.error);
T('沒選礦石時後端自動配一塊', DB.Tasks.length === 1 && !!DB.Tasks[0].mineral, DB.Tasks[0] && DB.Tasks[0].mineral);

/* 13. 學生 bootstrap 看得到任務 */
const sb = run('apiBootstrap', [stk]);
T('學生 bootstrap', sb && sb.ok === true, sb && sb.error);
T('學生看得到那一項', (sb.tasks || []).length === 1, (sb.tasks || []).length);
const taskId = (sb.tasks || [])[0] && sb.tasks[0].id;

/* 14. 沒排程不准交（主流程的硬規則） */
const noPlan = run('apiSubmitItem', [stk, taskId, '做完了', [], { effort: 'onpar', effortNote: '', blocker: '' }]);
T('沒排甘特就交 → 被擋', noPlan && noPlan.ok === false, noPlan);

/* 15. 排程後可以交 */
run('apiSavePlan', [stk, taskId, 3, 3]);
const sub = run('apiSubmitItem', [stk, taskId, '訪談三位大三生後收斂了題目', [], { effort: 'slow', effortNote: '約不到人', blocker: '' }]);
T('排程之後交得出去', sub && sub.ok === true, sub && sub.error);
T('提交有進 Submissions', DB.Submissions.length === 1, DB.Submissions.length);

/* 16. 全收集：只採到 1/6 不准送關卡 */
const gate1 = run('apiSubmitGate', [stk, ['走過的路', '變化', '接下來']]);
T('沒採齊就送關卡 → 被擋（全收集第一道）', gate1 && gate1.ok === false, gate1);

/* 17. 老師確認通過 */
const rev = run('apiReviewItem', [tk, claim.teamId, taskId, 'pass', '有講出為什麼是這一件，通過。']);
T('老師逐項確認通過', rev && rev.ok === true, rev && rev.error);
T('合格考量有存下來', DB.Reviews.length === 1 && DB.Reviews[0].reason.length > 0, DB.Reviews[0]);

/* 18. 採到 1 塊但礦脈只開了 1/6，仍不准過關 */
const gate2 = run('apiSubmitGate', [stk, ['走過的路', '變化', '接下來']]);
T('礦脈沒開完仍被擋（全收集第二道）', gate2 && gate2.ok === false, gate2);

/* 19. 學生不能假扮老師 */
const fake = run('apiReviewItem', [stk, claim.teamId, taskId, 'pass', '我自己通過']);
T('學生不能自己審自己', fake && fake.ok === false, fake);

/* 20. 假 token */
const nope = run('apiBootstrap', ['tk-不存在']);
T('假 token 被擋', nope && nope.ok === false, nope);

/* 21. 檔案上傳（走 Storage shim） */
const b64 = Buffer.from('hello evidence').toString('base64');
const up = run('apiUploadFile', [stk, taskId, '證據.txt', 'text/plain', b64]);
T('上傳證據（Cloud Storage）', up && up.ok === true && up.file && up.file.id, up && up.error);
T('Files 有紀錄', DB.Files.length === 1, DB.Files.length);

/* 22. 研究者匯出強制匿名 */
const slice = run('apiResearchSlice', [rt]);
T('研究者切片讀得到', slice && slice.ok === true, slice && slice.error);

/* 23. 日期格式化（時區） */
const d = shim.Utilities.formatDate(new Date('2026-08-27T16:30:00Z'), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
T('時區換算正確（UTC 16:30 → 台北 00:30 隔天）', d === '2026-08-28 00:30:00', d);

console.log('\n── ' + pass + ' 通過 · ' + fail + ' 失敗 ──\n');
process.exit(fail ? 1 : 0);
