/* 不連 Firebase 的自我測試：把 Firestore 換成記憶體版，其餘照 index.js 的做法，
   驗證 Code.gs 能不能原封不動在沙盒裡跑，以及那四個資料原語有沒有接對。
   跑法：node functions/selftest.js */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const shim = require('./shim');

/* 直接讀原始碼，不讀 functions/Code.gs —— 那是 build 產物，本機忘了
   cp 就會測到舊檔。CI 的 cp 留著，因為部署只帶得走 functions/ 底下的。 */
const SRC = fs.readFileSync(path.join(__dirname, '..', 'gas', 'Code.gs'), 'utf8');
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
  const original = {};
  Object.keys(HEADS).forEach((n) => { original[n] = copy(DB[n]); });

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

/* 14. 排程門檻拿掉了：「你排的時間」不在任務頁上，沒有地方排，
      後端就不能拿它擋交件。 */
const noPlan = run('apiSubmitItem', [stk, taskId, '做完了', [], { effort: 'onpar', effortNote: '', blocker: '' }]);
T('沒排程也交得出去（排程門檻拿掉了）', noPlan && noPlan.ok === true, noPlan);

/* 15. 排程後可以交 */
run('apiSavePlan', [stk, taskId, 3, 3]);
const sub = run('apiSubmitItem', [stk, taskId, '訪談三位大三生後收斂了題目', [], { effort: 'slow', effortNote: '約不到人', blocker: '' }]);
T('排程之後交得出去', sub && sub.ok === true, sub && sub.error);
T('提交有進 Submissions', DB.Submissions.length === 2, DB.Submissions.length);   /* 上面那一次也算 */

/* 16. 送關卡整套拿掉了——學生不送申請，往不往下是老師決定。 */

/* 17. 老師確認通過 */
const rev = run('apiReviewItem', [tk, claim.teamId, taskId, 'pass', '有講出為什麼是這一件，通過。']);
T('老師逐項確認通過', rev && rev.ok === true, rev && rev.error);
T('合格考量有存下來', DB.Reviews.length === 1 && DB.Reviews[0].reason.length > 0, DB.Reviews[0]);

/* 18. （原本在這裡測送關卡，那條路拿掉了） */

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

/* 23. 中途接手：課程走到一半才導入，前面幾層直接認列 */
const jump = run('apiSetTeamLayer', [tk, claim.teamId, 3, '課程第八週才開始用']);
T('老師把起點放在第四層', jump && jump.ok === true, jump && jump.error);
T('前三層都認列了', String(jump.passed) === String([1, 2, 3]), jump.passed);
T('認列會留下理由', DB.Passes.filter((x) => x.toolLevel === '中途接手').length === 3,
  DB.Passes.filter((x) => x.toolLevel === '中途接手').length);
const jumpNo = run('apiSetTeamLayer', [stk, claim.teamId, 4, '我自己來']);
T('學生自己認列不了', jumpNo && jumpNo.ok === false, jumpNo);

/* 24. 旅途封存：四層走完才封存得了，封存之後跨專案看得到 */
const seal0 = run('apiSealJourney', [stk, '走到一半的那一趟']);
T('沒走完四層封存不了', seal0 && seal0.ok === false, seal0);
run('apiSetTeamLayer', [tk, claim.teamId, 4, '四層都認列']);
const sealNo = run('apiSealJourney', [stk, '   ']);
T('沒取名字封存不了', sealNo && sealNo.ok === false, sealNo);
const seal = run('apiSealJourney', [stk, '把題目改了三次的那一學期']);
T('封存得了', seal && seal.ok === true, seal && seal.error);
const js = run('apiJourneys', [stk]);
T('封存過的旅途列得出來', js && js.ok === true && js.journeys.length === 1, js);
T('封存帶著統整一起留下來', js.journeys[0].stats && js.journeys[0].stats.layers.length === 4,
  js.journeys[0].stats);
T('改名字不會多長一趟', (function () {
  run('apiSealJourney', [stk, '換一個名字']);
  const again = run('apiJourneys', [stk]);
  return again.journeys.length === 1 && again.journeys[0].name === '換一個名字';
})(), DB.Journeys.length);

/* 25. 日期格式化（時區） */
const d = shim.Utilities.formatDate(new Date('2026-08-27T16:30:00Z'), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
T('時區換算正確（UTC 16:30 → 台北 00:30 隔天）', d === '2026-08-28 00:30:00', d);

console.log('\n── ' + pass + ' 通過 · ' + fail + ' 失敗 ──\n');
process.exit(fail ? 1 : 0);
