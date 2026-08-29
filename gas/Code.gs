/*  逐層掘進 ZHU CENG JUE JIN — Google Apps Script 後端（實際使用版）
 *  ---------------------------------------------------------------
 *  · 自建帳號密碼註冊／登入（Users + Sessions，密碼加鹽雜湊）
 *  · 真正多組同時運作：任務定義（Tasks）與各組狀態（TeamTasks）分離
 *  · 學期週次依真實日期自動計算，老師可手動覆寫
 *  · 延遲揭露在後端做：未解鎖區間的資料不會離開伺服器
 *  · 匯出後端強制匿名
 *  --------------------------------------------------------------- */

var APP_TITLE   = '逐層掘進';
var SHEET_PROP  = 'JLZ_SPREADSHEET_ID';
var FOLDER_PROP = 'JLZ_FOLDER_ID';
var MAX_UPLOAD  = 10 * 1024 * 1024;   // 單檔上限 10 MB

/* ================= 網頁進入點 ================= */

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle(APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(n) {
  return HtmlService.createHtmlOutputFromFile(n).getContent();
}

/* ================= 工作表定義 ================= */

var SHEET_DEFS = {
  Config:      ['key', 'value'],
  Users:       ['userId', 'account', 'salt', 'hash', 'role', 'name', 'classId', 'teamId', 'coder', 'createdAt', 'lastLogin'],
  Sessions:    ['token', 'userId', 'createdAt', 'expiresAt'],
  Classes:     ['classId', 'name', 'term', 'started', 'courseStart', 'weekOverride', 'semesterWeeks', 'joinCode', 'teacherId', 'sandbox'],
  Teams:       ['teamId', 'classId', 'name', 'members', 'layer', 'enteredWeek', 'passed', 'toolLevels',
                'gateText', 'gateSubmitted', 'gateVerdict', 'specNames', 'createdAt', 'gateTs'],
  Tasks:       ['taskId', 'classId', 'layer', 'type', 'title', 'cond', 'note', 'spec', 'due', 'mineral', 'mDesc', 'published', 'teams', 'checks', 'createdAt'],
  TeamTasks:   ['teamId', 'taskId', 'status', 'vow', 'text', 'files', 'fb', 'fbType', 'passedWeek',
                'effort', 'effortNote', 'blocker', 'checked', 'updatedAt'],
  Submissions: ['subId', 'taskId', 'teamId', 'week', 'dueWeek', 'overdue', 'len', 'files', 'attempt', 'text',
                'effort', 'effortNote', 'blocker', 'fileList', 'ts'],
  Files:       ['fileId', 'teamId', 'taskId', 'name', 'mimeType', 'size', 'kind', 'uploadedBy', 'ts'],
  Roster:      ['rosterId', 'classId', 'teamId', 'teamName', 'memberName', 'claimedBy', 'claimedAt'],
  Finales:     ['teamId', 'q1', 'q2', 'q3', 'lightName', 'submitted', 'ts',
                'opened', 'openWords', 'openedBy', 'openedAt'],
  Reviews:     ['revId', 'subId', 'teamId', 'taskId', 'title', 'layer', 'result', 'reason', 'len', 'hasReason', 'week', 'latency', 'ts'],
  Plans:       ['teamId', 'taskId', 'week', 'fromWeek', 'toWeek'],
  Passes:      ['passId', 'teamId', 'layer', 'week', 'toolLevel', 'gateCell1', 'gateCell2', 'gateCell3', 'verdict', 'reason', 'ts'],
  Reads:       ['readId', 'readerTeam', 'targetTeam', 'layer', 'week', 'readerLayer', 'readerStay', 'recentlyRejected', 'ts'],
  Codes:       ['revId', 'coder', 'code', 'ts'],
  Checks:      ['ckId', 'teamId', 'taskId', 'idx', 'act', 'by', 'ts'],
  Digs:        ['digId', 'teamId', 'classId', 'layer', 'text', 'estDays', 'bet',
                'result', 'page', 'find', 'openedAt', 'closedAt'],
  /* 老師照自己的規劃改這一層的拆分名稱。一班一份，礦石本身不動。 */
  MinNames:    ['teamId', 'mineral', 'label', 'note']
};

function ss_() {
  if (MEMO_.ss) return MEMO_.ss;
  var bound = null;
  try { bound = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { bound = null; }
  if (bound) return (MEMO_.ss = bound);
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(SHEET_PROP);
  if (id) { try { return (MEMO_.ss = SpreadsheetApp.openById(id)); } catch (e) {} }
  var created = SpreadsheetApp.create(APP_TITLE + ' · 資料庫');
  props.setProperty(SHEET_PROP, created.getId());
  return (MEMO_.ss = created);
}

function sheet_(name) {
  if (MEMO_.sheets[name]) return MEMO_.sheets[name];
  var s = ss_(), sh = s.getSheetByName(name);
  if (!sh) {
    sh = s.insertSheet(name);
    var head = SHEET_DEFS[name];
    if (head) {
      sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
    /* 帳號與登入權杖不該在試算表裡被隨手看到；只有一張表時不能隱藏 */
    if ((name === 'Users' || name === 'Sessions') && s.getSheets().length > 1) {
      try { sh.hideSheet(); } catch (e) {}
    }
  }
  return (MEMO_.sheets[name] = sh);
}

/* ================= 讀取快取 =================
   一次 apiBootstrap 要讀十幾張表，每一次 getValues() 都是一趟往返。
   一個班二十幾個人每 30 秒輪詢一次，光是讀表就會把執行時間吃光——
   上課上到一半會開始出現「同時執行數過多」。
   這裡加兩層：同一次執行的記憶體快取，以及跨呼叫的 CacheService。
   任何寫入都會把那張表作廢，所以讀到的資料一定不比最後一次寫入舊。
   注意：upsert_ 依賴 __row，一律讀原始表格，不吃快取。 */

var MEMO_ = { ss: null, sheets: {}, tables: {} };
var CACHE_TTL_ = 300;        /* 秒。寫入時就作廢了，這只是保險 */
var CACHE_CHUNK_ = 90000;    /* CacheService 單值上限 100KB，留餘裕 */
var CACHE_MAX_CHUNK_ = 40;   /* 超過就不快取，避免把 8MB 總額吃掉 */

function cache_() {
  try { return CacheService.getScriptCache(); } catch (e) { return null; }
}

function cacheGet_(name) {
  var c = cache_();
  if (!c) return null;
  var n = Number(c.get('t:' + name + ':n'));
  if (!(n > 0)) return null;
  var keys = [];
  for (var i = 0; i < n; i++) keys.push('t:' + name + ':' + i);
  var got = c.getAll(keys), buf = '';
  for (var j = 0; j < n; j++) {
    var part = got['t:' + name + ':' + j];
    if (part == null) return null;     /* 少一塊就當作沒有 */
    buf += part;
  }
  try { return JSON.parse(buf); } catch (e) { return null; }
}

function cachePut_(name, rows) {
  var c = cache_();
  if (!c) return;
  var s = JSON.stringify(rows);
  var n = Math.ceil(s.length / CACHE_CHUNK_) || 1;
  if (n > CACHE_MAX_CHUNK_) return;
  var obj = {};
  for (var i = 0; i < n; i++) obj['t:' + name + ':' + i] = s.substr(i * CACHE_CHUNK_, CACHE_CHUNK_);
  obj['t:' + name + ':n'] = String(n);
  try { c.putAll(obj, CACHE_TTL_); } catch (e) {}
}

function cacheVer_(name) {
  var c = cache_();
  return c ? String(c.get('v:' + name) || '') : '';
}

function cacheBust_(name) {
  delete MEMO_.tables[name];
  var c = cache_();
  if (!c) return;
  /* 版本戳一換，慢一步的讀取就不會把舊資料塞回來 */
  try { c.put('v:' + name, String(Date.now()) + ':' + Math.random(), 21600); } catch (e) {}
  /* 資料動了就換總戳——輪詢先問這個，沒變就不用整包重抓 */
  if (name !== 'Sessions') { try { c.put('rev', String(Date.now()) + ':' + Math.random(), 21600); } catch (e) {} }
  var n = Number(c.get('t:' + name + ':n')) || 0;
  var keys = ['t:' + name + ':n'];
  for (var i = 0; i < n; i++) keys.push('t:' + name + ':' + i);
  try { c.removeAll(keys); } catch (e) {}
}

/** 整批作廢：資料表結構或大量資料變動之後用。 */
function resetTableCache_() {
  MEMO_.tables = {};
  Object.keys(SHEET_DEFS).forEach(function (n) { cacheBust_(n); });
}

function readTable_(name) {
  if (MEMO_.tables[name]) return MEMO_.tables[name];
  var hit = cacheGet_(name);
  if (hit) return (MEMO_.tables[name] = hit);
  var ver = cacheVer_(name);
  var rows = readRaw_(name);
  /* __row 是暫時的實作細節，不進快取。
     Date 先轉成本地時間字串——JSON 會把 Date 變成 UTC，台北時間的日期會差一天。 */
  var tz = Session.getScriptTimeZone() || 'Asia/Taipei';
  var clean = rows.map(function (r) {
    var o = {};
    for (var k in r) {
      if (k === '__row') continue;
      o[k] = (r[k] instanceof Date) ? Utilities.formatDate(r[k], tz, 'yyyy-MM-dd HH:mm:ss') : r[k];
    }
    return o;
  });
  if (cacheVer_(name) === ver) cachePut_(name, clean);   /* 讀的期間有人寫過就不要放 */
  return (MEMO_.tables[name] = clean);
}

function readRaw_(name) {
  var sh = sheet_(name), head = SHEET_DEFS[name], last = sh.getLastRow();
  if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, head.length).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) === '') continue;
    var o = {};
    for (var j = 0; j < head.length; j++) o[head[j]] = vals[i][j];
    o.__row = i + 2;
    out.push(o);
  }
  return out;
}

function writeTable_(name, rows) {
  cacheBust_(name);
  var sh = sheet_(name), head = SHEET_DEFS[name], last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, head.length).clearContent();
  if (!rows || !rows.length) return;
  var out = rows.map(function (r) {
    return head.map(function (k) {
      var v = r[k];
      if (v === undefined || v === null) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return v;
    });
  });
  sh.getRange(2, 1, out.length, head.length).setValues(out);
}

function appendRow_(name, obj) {
  cacheBust_(name);
  var sh = sheet_(name), head = SHEET_DEFS[name];
  sh.appendRow(head.map(function (k) {
    var v = obj[k];
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  }));
}

function upsert_(name, keys, obj) {
  cacheBust_(name);
  var rows = readRaw_(name), hit = -1;
  for (var i = 0; i < rows.length; i++) {
    var ok = true;
    for (var k = 0; k < keys.length; k++) {
      if (String(rows[i][keys[k]]) !== String(obj[keys[k]])) { ok = false; break; }
    }
    if (ok) { hit = i; break; }
  }
  if (hit < 0) { appendRow_(name, obj); return; }
  var sh = sheet_(name), head = SHEET_DEFS[name];
  var merged = Object.assign({}, rows[hit], obj);
  sh.getRange(rows[hit].__row, 1, 1, head.length).setValues([head.map(function (k) {
    var v = merged[k];
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  })]);
}

function jparse_(v, dflt) {
  if (v === '' || v === null || v === undefined) return dflt;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch (e) { return dflt; }
}

/* ================= 繳交檔案（Google Drive） ================= */

function rootFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(FOLDER_PROP);
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder(APP_TITLE + ' · 繳交檔案');
  props.setProperty(FOLDER_PROP, f.getId());
  return f;
}

function subFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function teamFolder_(classId, teamId) {
  var kl = classById_(classId), t = teamById_(teamId);
  var kName = (kl && kl.name) ? String(kl.name) : classId;
  var tName = (t && t.name) ? String(t.name) : teamId;
  return subFolder_(subFolder_(rootFolder_(), kName), tName);
}

function fileRow_(fileId) {
  var rows = readTable_('Files');
  for (var i = 0; i < rows.length; i++) if (String(rows[i].fileId) === String(fileId)) return rows[i];
  return null;
}

/** 這個人能不能看這個檔：只有自己組的人、以及帶這個班的老師。研究者看不到內容。 */
function canReadFile_(u, row) {
  if (!row) return false;
  if (u.role === 'student') return String(u.teamId) === String(row.teamId);
  if (u.role === 'teacher') {
    var t = teamById_(row.teamId);
    if (!t) return false;
    var kl = classById_(t.classId);
    return !!kl && (String(kl.teacherId) === String(u.userId) || String(u.classId) === String(t.classId));
  }
  return false;
}

/**
 * 學生上傳一個檔案。前端把檔案讀成 base64 再送過來。
 * 回傳的物件會直接放進提交的證據清單。
 */
function apiUploadFile(token, taskId, fileName, mimeType, base64) {
  try {
    var u = auth_(token);
    if (u.role !== 'student' || !u.teamId) return err_('只有學生可以上傳證據。');
    var raw = String(base64 || '');
    var approx = Math.floor(raw.length * 3 / 4);
    if (!raw) return err_('檔案是空的。');
    if (approx > MAX_UPLOAD) return err_('單檔上限 10 MB。影片建議上傳到雲端硬碟或 YouTube，再用「連結」附上來。');

    var blob = Utilities.newBlob(Utilities.base64Decode(raw), mimeType || 'application/octet-stream', fileName || '未命名檔案');
    var file = teamFolder_(u.classId, u.teamId).createFile(blob);
    file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);

    var kind = /^image\//.test(mimeType) ? 'image'
             : /^video\//.test(mimeType) ? 'video'
             : /pdf|word|document|sheet|presentation|text/.test(String(mimeType)) ? 'doc' : 'file';

    appendRow_('Files', {
      fileId: file.getId(), teamId: u.teamId, taskId: taskId || '', name: file.getName(),
      mimeType: file.getMimeType(), size: file.getSize(), kind: kind,
      uploadedBy: u.userId, ts: new Date()
    });
    return ok_({ file: { id: file.getId(), name: file.getName(), mimeType: file.getMimeType(),
                         size: file.getSize(), kind: kind } });
  } catch (e) { return err_(e); }
}

/** 讀回一個檔案（權限在後端擋）。回傳 data URL，前端直接開。 */
function apiGetFile(token, fileId) {
  try {
    var u = auth_(token);
    var row = fileRow_(fileId);
    if (!canReadFile_(u, row)) return err_('你沒有權限看這個檔案。');
    var file = DriveApp.getFileById(fileId);
    if (file.getSize() > MAX_UPLOAD) return err_('這個檔案太大，無法在畫面上開啟。');
    var blob = file.getBlob();
    return ok_({
      name: file.getName(), mimeType: blob.getContentType(),
      dataUrl: 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes())
    });
  } catch (e) { return err_(e); }
}

/** 學生刪掉還沒被確認通過的證據。 */
function apiDeleteFile(token, fileId) {
  try {
    var u = auth_(token);
    var row = fileRow_(fileId);
    if (!row || u.role !== 'student' || String(u.teamId) !== String(row.teamId)) return err_('沒有權限。');
    try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) {}
    writeTable_('Files', readTable_('Files').filter(function (f) { return String(f.fileId) !== String(fileId); }));
    return ok_();
  } catch (e) { return err_(e); }
}

/* ================= 設定與週次 ================= */

function cfg_(key, dflt) {
  var rows = readTable_('Config');
  for (var i = 0; i < rows.length; i++) if (String(rows[i].key) === key) return rows[i].value;
  return dflt;
}
function setCfg_(key, value) { upsert_('Config', ['key'], { key: key, value: value }); }

function toDate_(v) {
  if (v instanceof Date) return v;
  var s = String(v || '');
  var m = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/.exec(s);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return new Date(2026, 8, 14);
}

/** 學期第幾週：依真實日期自動計算；老師若設了覆寫值就用覆寫值。 */
function courseWeekOf_(klass) {
  if (klass && String(klass.weekOverride) !== '') {
    var w = Number(klass.weekOverride);
    if (w >= 1) return Math.floor(w);
  }
  var start = toDate_(klass ? klass.courseStart : cfg_('courseStart', '2026-09-14'));
  var today = new Date();
  var days = Math.floor((today - new Date(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000);
  return Math.max(1, Math.floor(days / 7) + 1);
}

/* ================= 帳號 ================= */

function hash_(salt, pw) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + pw, Utilities.Charset.UTF_8);
  return raw.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function findUser_(account) {
  var rows = readTable_('Users');
  var a = String(account || '').trim().toLowerCase();
  for (var i = 0; i < rows.length; i++) if (String(rows[i].account).trim().toLowerCase() === a) return rows[i];
  return null;
}
function userById_(id) {
  var rows = readTable_('Users');
  for (var i = 0; i < rows.length; i++) if (String(rows[i].userId) === String(id)) return rows[i];
  return null;
}

function newToken_(userId, remember) {
  var t = Utilities.getUuid();
  var now = new Date();
  var exp = new Date(now.getTime() + (remember ? 30 : 1) * 24 * 3600 * 1000);
  /* 順手清掉過期的權杖，這張表才不會無限長 */
  var rows = readTable_('Sessions').filter(function (s) { return new Date(s.expiresAt) > now; });
  if (rows.length !== readTable_('Sessions').length) writeTable_('Sessions', rows);
  appendRow_('Sessions', { token: t, userId: userId, createdAt: now, expiresAt: exp });
  return t;
}

function auth_(token) {
  if (!token) throw new Error('未登入');
  var rows = readTable_('Sessions'), now = new Date();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].token) !== String(token)) continue;
    if (new Date(rows[i].expiresAt) < now) throw new Error('登入已逾期，請重新登入。');
    var u = userById_(rows[i].userId);
    if (!u) throw new Error('帳號不存在');
    return u;
  }
  throw new Error('登入已失效，請重新登入。');
}

function pubUser_(u) {
  return {
    userId: u.userId, account: u.account, role: u.role, name: u.name,
    classId: u.classId, teamId: u.teamId, coder: u.coder || ''
  };
}

function ok_(o) { return Object.assign({ ok: true }, o || {}); }
function err_(m) { return { ok: false, error: String(m && m.message ? m.message : m) }; }

/* --------- 註冊 --------- */

/** 只有研究者能自行註冊。老師與學生的帳號由研究者在 R-ADM 建立後發放。 */
function apiRegister(p) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return err_('系統忙碌，請再試一次。'); }
  try {
    p = p || {};
    var account = String(p.account || '').trim();
    var pw = String(p.password || '');
    var name = String(p.name || '').trim();

    var role = String(p.role || '');
    if (role !== 'researcher' && role !== 'student') {
      return err_('老師的帳號由研究者建立，拿到帳號密碼直接登入即可。');
    }
    if (account.length < 3) return err_('帳號至少 3 個字。');
    if (pw.length < 4) return err_('密碼至少 4 個字。');
    if (findUser_(account)) return err_('這個帳號已經有人用了。');

    var classId = '';
    if (role === 'student') {
      var kl = findClassByCode_(String(p.joinCode || '').trim().toUpperCase());
      if (!kl) return err_('找不到這個班級邀請碼，跟老師或研究者確認一次。');
      classId = kl.classId;
      /* 名字之後從名單挑，這裡先留空 */
      name = '';
    } else if (!name) {
      return err_('請填姓名。');
    }

    var salt = Utilities.getUuid();
    var userId = 'u' + Utilities.getUuid().slice(0, 8);
    appendRow_('Users', {
      userId: userId, account: account, salt: salt, hash: hash_(salt, pw),
      role: role, name: name, classId: classId, teamId: '',
      coder: role === 'researcher' ? (String(p.coder || 'C1').trim() || 'C1') : '',
      createdAt: new Date(), lastLogin: new Date()
    });

    var token = newToken_(userId, !!p.remember);
    return ok_({ token: token, user: pubUser_(userById_(userId)) });
  } catch (e) {
    return err_(e);
  } finally { lock.releaseLock(); }
}

/* --------- 帳號管理（研究者專用） --------- */

function assertResearcher_(token) {
  var u = auth_(token);
  if (u.role !== 'researcher') throw new Error('這個動作只有研究者可以做。');
  return u;
}

function adminOverview_() {
  var classes = readTable_('Classes');
  var className = {};
  classes.forEach(function (k) { className[k.classId] = k.name; });
  return {
    unlockEvery: Math.max(1, Math.floor(Number(cfg_('unlockEvery', 1)) || 1)),
    classes: classes.map(function (k) {
      return { id: k.classId, name: k.name, term: k.term,
               courseStart: Utilities.formatDate(toDate_(k.courseStart), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
               courseWeek: courseWeekOf_(k), semesterWeeks: semWeeksOf_(k), joinCode: k.joinCode,
               sandbox: String(k.sandbox) === 'Y' };
    }),
    users: readTable_('Users').map(function (u) {
      return { userId: u.userId, account: u.account, role: u.role, name: u.name,
               classId: u.classId, className: className[u.classId] || '',
               teamId: u.teamId || '',
               lastLogin: u.lastLogin ? Utilities.formatDate(new Date(u.lastLogin), Session.getScriptTimeZone(), 'MM/dd HH:mm') : '' };
    })
  };
}

function apiAdminOverview(token) {
  try { assertResearcher_(token); return ok_(adminOverview_()); }
  catch (e) { return err_(e); }
}

function apiAdminCreateClass(token, name, term, courseStart, weeks, sandbox) {
  try {
    assertResearcher_(token);
    if (!String(name || '').trim()) return err_('請填班級名稱。');
    createClass_(String(name).trim(), String(term || ''), String(courseStart || ''), '', weeks, sandbox);
    return ok_(adminOverview_());
  } catch (e) { return err_(e); }
}


/** 研究者改班級：名稱、學期、開課日、學期週數、邀請碼都可以改。 */
function apiAdminUpdateClass(token, classId, patch) {
  try {
    assertResearcher_(token);
    var kl = classById_(classId);
    if (!kl) return err_("找不到這個班級。");
    patch = patch || {};
    var row = { classId: classId };
    if (patch.name !== undefined) {
      if (!String(patch.name).trim()) return err_("班級名稱不能是空的。");
      row.name = String(patch.name).trim();
    }
    if (patch.term !== undefined) row.term = String(patch.term).trim();
    if (patch.courseStart !== undefined) {
      var d = String(patch.courseStart).trim();
      if (d && !/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/.test(d)) return err_("開課日期要寫成 2026-09-14 這種格式。");
      row.courseStart = d;
    }
    if (patch.semesterWeeks !== undefined) {
      var w = Math.floor(Number(patch.semesterWeeks) || 0);
      if (w < 2 || w > 156) return err_("學期週數要在 2 到 156 之間。");
      row.semesterWeeks = w;
    }
    if (patch.weekOverride !== undefined) {
      var o = String(patch.weekOverride).trim();
      row.weekOverride = o === "" ? "" : Math.max(1, Math.floor(Number(o) || 1));
    }
    if (patch.sandbox !== undefined) row.sandbox = patch.sandbox ? 'Y' : '';
    if (patch.joinCode !== undefined) {
      var code = String(patch.joinCode).trim().toUpperCase();
      if (!/^[A-Z0-9]{4,10}$/.test(code)) return err_("邀請碼只能用 4 到 10 個英數字。");
      var clash = readTable_("Classes").filter(function (k) {
        return String(k.joinCode).toUpperCase() === code && String(k.classId) !== String(classId);
      })[0];
      if (clash) return err_("這組邀請碼已經被「" + clash.name + "」用了。");
      row.joinCode = code;
    }
    upsert_("Classes", ["classId"], row);
    return ok_(adminOverview_());
  } catch (e) { return err_(e); }
}

/** 研究者刪班級。有人在裡面就先擋下來，講清楚要先處理什麼。 */
function apiAdminDeleteClass(token, classId, confirmName) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return err_("系統忙碌，請再試一次。"); }
  try {
    assertResearcher_(token);
    var kl = classById_(classId);
    if (!kl) return err_("找不到這個班級。");
    /* 打錯字就整班消失太危險，要把名稱重打一次 */
    if (String(confirmName || "").trim() !== String(kl.name).trim()) {
      return err_("要刪掉「" + kl.name + "」的話，請把班級名稱一字不差地再打一次。");
    }
    var users = readTable_("Users").filter(function (u) {
      return String(u.classId) === String(classId);
    });
    if (users.length) {
      return err_("這個班還有 " + users.length + " 個帳號（" +
        users.slice(0, 3).map(function (u) { return u.account; }).join("、") +
        (users.length > 3 ? " 等" : "") + "）。先把帳號刪掉或移到別班，才能刪這個班。");
    }
    var teams = readTable_("Teams").filter(function (t) { return String(t.classId) === String(classId); });
    var teamIds = {};
    teams.forEach(function (t) { teamIds[String(t.teamId)] = 1; });
    var taskIds = {};
    readTable_("Tasks").forEach(function (t) {
      if (String(t.classId) === String(classId)) taskIds[String(t.taskId)] = 1;
    });

    var byTeam = function (name, field) {
      writeTable_(name, readTable_(name).filter(function (r) { return !teamIds[String(r[field])]; }));
    };
    byTeam("Teams", "teamId");
    byTeam("TeamTasks", "teamId");
    byTeam("Submissions", "teamId");
    byTeam("Reviews", "teamId");
    byTeam("Plans", "teamId");
    byTeam("Passes", "teamId");
    byTeam("Finales", "teamId");
    byTeam("Files", "teamId");
    writeTable_("Reads", readTable_("Reads").filter(function (r) {
      return !teamIds[String(r.readerTeam)] && !teamIds[String(r.targetTeam)];
    }));
    writeTable_("Roster", readTable_("Roster").filter(function (r) {
      return String(r.classId) !== String(classId);
    }));
    writeTable_("Tasks", readTable_("Tasks").filter(function (t) {
      return String(t.classId) !== String(classId);
    }));
    writeTable_("Classes", readTable_("Classes").filter(function (k) {
      return String(k.classId) !== String(classId);
    }));
    return ok_(Object.assign(adminOverview_(), {
      removed: { teams: teams.length, tasks: Object.keys(taskIds).length }
    }));
  } catch (e) { return err_(e); } finally { lock.releaseLock(); }
}
/** 研究者建立老師或學生帳號：名字由研究者定，對方登入就能用。 */
function apiAdminCreateUser(token, p) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return err_('系統忙碌，請再試一次。'); }
  try {
    assertResearcher_(token);
    p = p || {};
    var role = String(p.role || '');
    var name = String(p.name || '').trim();
    var account = String(p.account || '').trim();
    var pw = String(p.password || '');
    var classId = String(p.classId || '');

    if (['teacher', 'student'].indexOf(role) < 0) return err_('身分要選老師或學生。');
    if (!name) return err_('請填姓名。');
    if (account.length < 3) return err_('帳號至少 3 個字。');
    if (pw.length < 4) return err_('初始密碼至少 4 個字。');
    if (findUser_(account)) return err_('這個帳號已經有人用了。');
    if (!classById_(classId)) return err_('先選一個班級（沒有的話先開一個班）。');

    var salt = Utilities.getUuid();
    var userId = 'u' + Utilities.getUuid().slice(0, 8);
    appendRow_('Users', {
      userId: userId, account: account, salt: salt, hash: hash_(salt, pw),
      role: role, name: name, classId: classId, teamId: '', coder: '',
      createdAt: new Date(), lastLogin: ''
    });
    if (role === 'teacher') {
      var kl = classById_(classId);
      if (kl && !String(kl.teacherId)) upsert_('Classes', ['classId'], { classId: classId, teacherId: userId });
    }
    return ok_(adminOverview_());
  } catch (e) { return err_(e); } finally { lock.releaseLock(); }
}

function apiAdminUpdateUser(token, userId, patch) {
  try {
    assertResearcher_(token);
    var u = userById_(userId);
    if (!u) return err_('找不到這個帳號。');
    patch = patch || {};
    var row = { userId: userId };
    if (patch.name !== undefined && String(patch.name).trim()) row.name = String(patch.name).trim();
    if (patch.classId !== undefined) row.classId = patch.classId;
    upsert_('Users', ['userId'], row);
    /* 改名要同步到已加入的小隊名單 */
    if (row.name && u.teamId) {
      var t = teamById_(u.teamId);
      if (t) {
        var mem = jparse_(t.members, []);
        var i = mem.indexOf(u.name);
        if (i >= 0) { mem[i] = row.name; upsert_('Teams', ['teamId'], { teamId: u.teamId, members: JSON.stringify(mem) }); }
      }
    }
    return ok_(adminOverview_());
  } catch (e) { return err_(e); }
}

function apiAdminResetPassword(token, userId, newPassword) {
  try {
    assertResearcher_(token);
    if (String(newPassword || '').length < 4) return err_('新密碼至少 4 個字。');
    var u = userById_(userId);
    if (!u) return err_('找不到這個帳號。');
    var salt = Utilities.getUuid();
    upsert_('Users', ['userId'], { userId: userId, salt: salt, hash: hash_(salt, String(newPassword)) });
    /* 舊的登入全部登出 */
    writeTable_('Sessions', readTable_('Sessions').filter(function (s) { return String(s.userId) !== String(userId); }));
    return ok_(adminOverview_());
  } catch (e) { return err_(e); }
}

/* --------- 名單與分組（研究者先把拿到的名單建進來） --------- */

function rosterOf_(classId) {
  return readTable_('Roster').filter(function (r) { return String(r.classId) === String(classId); });
}

function rosterView_(classId) {
  var claimedName = {};
  readTable_('Users').forEach(function (u) { claimedName[u.userId] = u.name + '（' + u.account + '）'; });
  var byTeam = {}, order = [];
  rosterOf_(classId).forEach(function (r) {
    if (!byTeam[r.teamId]) { byTeam[r.teamId] = { teamId: r.teamId, teamName: r.teamName, members: [] }; order.push(r.teamId); }
    byTeam[r.teamId].members.push({
      rosterId: r.rosterId, name: r.memberName,
      claimed: !!String(r.claimedBy),
      claimedBy: String(r.claimedBy) ? (claimedName[r.claimedBy] || r.claimedBy) : ''
    });
  });
  return order.map(function (id) { return byTeam[id]; });
}

/** 一次貼上整份名單。每一行： 組名：成員, 成員, 成員 */
function apiAdminSaveRoster(token, classId, text) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return err_('系統忙碌，請再試一次。'); }
  try {
    assertResearcher_(token);
    if (!classById_(classId)) return err_('先選一個班級。');
    var lines = String(text || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!lines.length) return err_('名單是空的。每一行寫「組名：成員, 成員」。');

    var existing = rosterOf_(classId);
    var seen = {};
    existing.forEach(function (r) { seen[r.teamName + '||' + r.memberName] = r; });

    var teams = readTable_('Teams').filter(function (t) { return String(t.classId) === String(classId); });
    var teamByName = {};
    teams.forEach(function (t) { teamByName[t.name] = t; });

    var added = 0, groups = 0;
    var courseWeek = courseWeekOf_(classById_(classId));

    lines.forEach(function (line) {
      var m = /^(.+?)\s*[：:]\s*(.+)$/.exec(line);
      if (!m) return;
      var gname = m[1].trim();
      var members = m[2].split(/[,，、\s]+/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (!gname || !members.length) return;
      groups++;

      var full = /^第.+組/.test(gname) ? gname : '第' + numCn_(Object.keys(teamByName).length + 1) + '組 · ' + gname;
      var t = teamByName[full];
      if (!t) {
        var id = 't' + Utilities.getUuid().slice(0, 6);
        appendRow_('Teams', {
          teamId: id, classId: classId, name: full, members: JSON.stringify(members),
          layer: 1, enteredWeek: courseWeek, passed: '[]', toolLevels: '{}',
          gateText: '["","",""]', gateSubmitted: 'N', gateVerdict: '', specNames: '{}', createdAt: new Date()
        });
        t = teamById_(id);
        teamByName[full] = t;
      } else {
        var mem = jparse_(t.members, []);
        members.forEach(function (n) { if (mem.indexOf(n) < 0) mem.push(n); });
        upsert_('Teams', ['teamId'], { teamId: t.teamId, members: JSON.stringify(mem) });
      }

      members.forEach(function (n) {
        if (seen[full + '||' + n]) return;
        appendRow_('Roster', {
          rosterId: 'r' + Utilities.getUuid().slice(0, 8), classId: classId,
          teamId: t.teamId, teamName: full, memberName: n, claimedBy: '', claimedAt: ''
        });
        added++;
      });
    });

    if (!groups) return err_('看不懂這份名單。每一行要寫成「組名：成員, 成員」。');
    return ok_(Object.assign(adminOverview_(), { roster: rosterView_(classId), added: added, groups: groups }));
  } catch (e) { return err_(e); } finally { lock.releaseLock(); }
}

/** 揭露節奏：1＝每週都看得到（預設），4＝原設計的每四週一次。 */
function apiAdminSetUnlock(token, every) {
  try {
    assertResearcher_(token);
    var n = Math.max(1, Math.floor(Number(every) || 1));
    setCfg_('unlockEvery', n);
    return ok_(adminOverview_());
  } catch (e) { return err_(e); }
}

function apiAdminRoster(token, classId) {
  try { assertResearcher_(token); return ok_({ roster: rosterView_(classId) }); }
  catch (e) { return err_(e); }
}

/** 放掉一個已被認領的名字（改綁或學生選錯時用）。 */
function apiAdminUnclaim(token, rosterId) {
  try {
    assertResearcher_(token);
    var rows = readTable_('Roster'), hit = null;
    rows.forEach(function (r) { if (String(r.rosterId) === String(rosterId)) hit = r; });
    if (!hit) return err_('找不到這一筆。');
    /* 認領的人可能已經被刪帳號了；upsert 一個不存在的 userId 會生出空白幽靈列 */
    if (hit.claimedBy && userById_(hit.claimedBy)) {
      upsert_('Users', ['userId'], { userId: hit.claimedBy, teamId: '' });
    }
    upsert_('Roster', ['rosterId'], { rosterId: rosterId, claimedBy: '', claimedAt: '' });
    return ok_(Object.assign(adminOverview_(), { roster: rosterView_(hit.classId) }));
  } catch (e) { return err_(e); }
}

/** 刪掉名單裡的一整組（連同還沒有人用的小隊）。 */
function apiAdminDeleteRosterTeam(token, teamId) {
  try {
    assertResearcher_(token);
    var t = teamById_(teamId);
    if (!t) return err_('找不到這一組。');
    var claimed = rosterOf_(t.classId).filter(function (r) {
      return String(r.teamId) === String(teamId) && String(r.claimedBy);
    });
    if (claimed.length) return err_('這一組已經有 ' + claimed.length + ' 個人登入認領了，不能直接刪。要改的話先逐一「放掉」。');
    writeTable_('Roster', readTable_('Roster').filter(function (r) { return String(r.teamId) !== String(teamId); }));
    writeTable_('Teams', readTable_('Teams').filter(function (x) { return String(x.teamId) !== String(teamId); }));
    return ok_(Object.assign(adminOverview_(), { roster: rosterView_(t.classId) }));
  } catch (e) { return err_(e); }
}

/* --------- 學生認領自己的身分 --------- */

/** 學生註冊完之後，看自己班上還沒被認領的名字。 */
function apiMyRoster(token) {
  try {
    var u = auth_(token);
    if (u.role !== 'student') return err_('只有學生要選身分。');
    var view = rosterView_(u.classId).map(function (g) {
      return {
        teamId: g.teamId, teamName: g.teamName,
        members: g.members.map(function (m) {
          return { rosterId: m.rosterId, name: m.name, claimed: m.claimed };
        })
      };
    });
    return ok_({ roster: view, hasRoster: view.length > 0 });
  } catch (e) { return err_(e); }
}

/** 學生點自己的名字：綁定姓名與小隊。 */
function apiClaimIdentity(token, rosterId) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return err_('系統忙碌，請再試一次。'); }
  try {
    var u = auth_(token);
    if (u.role !== 'student') return err_('只有學生要選身分。');
    var rows = readTable_('Roster'), hit = null;
    rows.forEach(function (r) { if (String(r.rosterId) === String(rosterId)) hit = r; });
    if (!hit) return err_('找不到這個名字。');
    if (String(hit.classId) !== String(u.classId)) return err_('這個名字不在你的班上。');
    if (String(hit.claimedBy) && String(hit.claimedBy) !== String(u.userId)) {
      return err_('「' + hit.memberName + '」已經有人用了。如果那是你，請找研究者處理。');
    }
    /* 一個帳號只能佔一個名字 */
    rows.forEach(function (r) {
      if (String(r.claimedBy) === String(u.userId) && String(r.rosterId) !== String(rosterId)) {
        upsert_('Roster', ['rosterId'], { rosterId: r.rosterId, claimedBy: '', claimedAt: '' });
      }
    });
    upsert_('Roster', ['rosterId'], { rosterId: rosterId, claimedBy: u.userId, claimedAt: new Date() });
    upsert_('Users', ['userId'], { userId: u.userId, name: hit.memberName, teamId: hit.teamId });
    return ok_({ name: hit.memberName, teamId: hit.teamId });
  } catch (e) { return err_(e); } finally { lock.releaseLock(); }
}

function apiAdminDeleteUser(token, userId) {
  try {
    var me = assertResearcher_(token);
    if (String(me.userId) === String(userId)) return err_('不能刪除自己。');
    var u = userById_(userId);
    if (!u) return err_('找不到這個帳號。');
    writeTable_('Users', readTable_('Users').filter(function (x) { return String(x.userId) !== String(userId); }));
    writeTable_('Sessions', readTable_('Sessions').filter(function (s) { return String(s.userId) !== String(userId); }));
    /* 他認領過的名字要放回去，不然名單上會卡著一個指向不存在帳號的認領 */
    readTable_('Roster').forEach(function (r) {
      if (String(r.claimedBy) === String(userId)) {
        upsert_('Roster', ['rosterId'], { rosterId: r.rosterId, claimedBy: '', claimedAt: '' });
      }
    });
    return ok_(adminOverview_());
  } catch (e) { return err_(e); }
}

function apiLogin(p) {
  try {
    p = p || {};
    var u = findUser_(p.account);
    if (!u) return err_('帳號或密碼不對。');
    if (hash_(u.salt, String(p.password || '')) !== String(u.hash)) return err_('帳號或密碼不對。');
    upsert_('Users', ['userId'], { userId: u.userId, lastLogin: new Date() });
    return ok_({ token: newToken_(u.userId, !!p.remember), user: pubUser_(u) });
  } catch (e) { return err_(e); }
}

function apiResume(token) {
  try { return ok_({ user: pubUser_(auth_(token)) }); }
  catch (e) { return err_(e); }
}

function apiLogout(token) {
  try {
    var rows = readTable_('Sessions').filter(function (r) { return String(r.token) !== String(token); });
    writeTable_('Sessions', rows);
    return ok_();
  } catch (e) { return err_(e); }
}

/* ================= 班級與小隊 ================= */

function findClassByCode_(code) {
  if (!code) return null;
  var rows = readTable_('Classes');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].joinCode).trim().toUpperCase() === code) return rows[i];
  }
  return null;
}

function makeCode_() {
  var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
  for (var i = 0; i < 6; i++) s += abc.charAt(Math.floor(Math.random() * abc.length));
  return s;
}

function createClass_(name, term, courseStart, teacherId, semesterWeeks, sandbox) {
  var id = 'k' + Utilities.getUuid().slice(0, 6);
  var code = makeCode_();
  while (findClassByCode_(code)) code = makeCode_();
  appendRow_('Classes', {
    classId: id, name: name, term: term || '', started: 'Y',
    courseStart: courseStart || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    weekOverride: '', semesterWeeks: Math.max(2, Math.min(156, Math.floor(Number(semesterWeeks) || 18))),
    joinCode: code, teacherId: teacherId || '', sandbox: sandbox ? 'Y' : ''
  });
  return id;
}

function semWeeksOf_(kl) {
  var n = Math.floor(Number(kl && kl.semesterWeeks) || 0);
  return n >= 2 ? Math.min(156, n) : 18;
}

/** 老師調整這一班的學期總週數（甘特圖的欄位數就是它）。 */
function apiSetSemesterWeeks(token, classId, weeks) {
  try {
    var u = auth_(token);
    if (u.role !== 'teacher' && u.role !== 'researcher') return err_('沒有權限。');
    var n = Math.max(2, Math.min(156, Math.floor(Number(weeks) || 18)));
    upsert_('Classes', ['classId'], { classId: classId, semesterWeeks: n });
    return ok_({ semesterWeeks: n });
  } catch (e) { return err_(e); }
}

/** 老師新增一個班級。 */
function apiCreateClass(token, name, term, courseStart) {
  try {
    var u = auth_(token);
    if (u.role !== 'teacher') return err_('只有老師可以開班。');
    var id = createClass_(String(name || '').trim() || '未命名班級', term, courseStart, u.userId);
    return ok_({ classId: id, classes: classesOf_(u) });
  } catch (e) { return err_(e); }
}

/** 學生建立小隊。組員名單不開放自由輸入——建立者的名字（研究者定的）自動掛上。 */
function apiCreateTeam(token, teamName) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return err_('系統忙碌，請再試一次。'); }
  try {
    var u = auth_(token);
    if (u.role !== 'student') return err_('只有學生可以建立小隊。');
    if (!u.classId) return err_('你的帳號還沒被分到班級，請找研究者。');
    var name = String(teamName || '').trim();
    if (!name) return err_('請填小隊名稱。');

    var teams = readTable_('Teams').filter(function (t) { return String(t.classId) === String(u.classId); });
    var id = 't' + Utilities.getUuid().slice(0, 6);
    appendRow_('Teams', {
      teamId: id, classId: u.classId, name: '第' + numCn_(teams.length + 1) + '組 · ' + name,
      members: JSON.stringify([u.name]),
      layer: 1, enteredWeek: courseWeekOf_(classById_(u.classId)), passed: '[]', toolLevels: '{}',
      gateText: '["","",""]', gateSubmitted: 'N', gateVerdict: '', specNames: '{}', createdAt: new Date()
    });
    upsert_('Users', ['userId'], { userId: u.userId, teamId: id });
    return ok_({ teamId: id });
  } catch (e) { return err_(e); } finally { lock.releaseLock(); }
}

/** 學生加入已存在的小隊。掛上的名字一律用帳號上的姓名。 */
function apiJoinTeam(token, teamId) {
  try {
    var u = auth_(token);
    if (u.role !== 'student') return err_('只有學生可以加入小隊。');
    var t = teamById_(teamId);
    if (!t || String(t.classId) !== String(u.classId)) return err_('找不到這個小隊。');
    var mem = jparse_(t.members, []);
    if (mem.indexOf(u.name) < 0) mem.push(u.name);
    upsert_('Teams', ['teamId'], { teamId: teamId, members: JSON.stringify(mem) });
    upsert_('Users', ['userId'], { userId: u.userId, teamId: teamId });
    return ok_({ teamId: teamId });
  } catch (e) { return err_(e); }
}

/** 尚未建隊的學生，用來看班上有哪些隊可以加入。 */
function apiClassTeams(token) {
  try {
    var u = auth_(token);
    var teams = readTable_('Teams').filter(function (t) { return String(t.classId) === String(u.classId); });
    return ok_({ teams: teams.map(function (t) {
      return { teamId: t.teamId, name: t.name, members: jparse_(t.members, []) };
    }) });
  } catch (e) { return err_(e); }
}

function numCn_(n) {
  var s = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  return n <= 10 ? s[n] : String(n);
}
function classById_(id) {
  var rows = readTable_('Classes');
  for (var i = 0; i < rows.length; i++) if (String(rows[i].classId) === String(id)) return rows[i];
  return null;
}
function teamById_(id) {
  var rows = readTable_('Teams');
  for (var i = 0; i < rows.length; i++) if (String(rows[i].teamId) === String(id)) return rows[i];
  return null;
}
function classesOf_(u) {
  var all = readTable_('Classes');
  var mine = u.role === 'teacher'
    ? all.filter(function (k) { return String(k.teacherId) === String(u.userId) || String(k.classId) === String(u.classId); })
    : all.filter(function (k) { return String(k.classId) === String(u.classId); });
  if (!mine.length) mine = all;
  return mine.map(function (k) {
    return {
      id: k.classId, name: k.name, term: k.term, started: String(k.started) !== 'N',
      courseStart: Utilities.formatDate(toDate_(k.courseStart), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      weekOverride: k.weekOverride === '' ? null : Number(k.weekOverride),
      semesterWeeks: semWeeksOf_(k),
      joinCode: k.joinCode, courseWeek: courseWeekOf_(k), sandbox: String(k.sandbox) === 'Y'
    };
  });
}

/* ================= 開機資料 ================= */

/** 每一組在每一層採到幾塊。老師的地圖要照真的位置擺人，
    學生端不給——別組走到第幾塊不是給同學看的。 */
function gotByLayer_(classId) {
  var layerOf = {};
  readTable_('Tasks').forEach(function (t) {
    if (String(t.classId) !== String(classId)) return;
    layerOf[String(t.taskId)] = Number(t.layer) || 1;
  });
  var out = {};
  readTable_('TeamTasks').forEach(function (r) {
    if (String(r.status) !== 'passed') return;
    var n = layerOf[String(r.taskId)];
    if (!n) return;
    var k = String(r.teamId);
    if (!out[k]) out[k] = {};
    out[k][n] = (out[k][n] || 0) + 1;
  });
  return out;
}

function teamPub_(t, courseWeek) {
  return {
    id: t.teamId, classId: t.classId, name: t.name, members: jparse_(t.members, []),
    layer: Number(t.layer) || 1,
    enteredWeek: Number(t.enteredWeek) || 1,
    weeks: Math.max(1, courseWeek - (Number(t.enteredWeek) || 1) + 1),
    passed: jparse_(t.passed, []),
    toolLevels: jparse_(t.toolLevels, {}),
    gateText: jparse_(t.gateText, ['', '', '']),
    gateSubmitted: String(t.gateSubmitted) === 'Y',
    gateVerdict: t.gateVerdict || '',
    specNames: jparse_(t.specNames, {})
  };
}

/** 一項任務發給誰：空陣列＝全班。 */
function taskTeams_(t) {
  var raw = t && t.teams;
  if (raw === undefined || raw === null || String(raw).trim() === '') return [];
  var a = jparse_(raw, null);
  if (!a || !a.length) return [];
  return a.map(function (x) { return String(x); });
}

/** 這一組看不看得到這一項。沒指定組別的就是全班都看得到。 */
function taskForTeam_(def, teamId) {
  var only = def.teams || [];
  return !only.length || only.indexOf(String(teamId)) >= 0;
}

/**
 * 這一班的任務定義。
 * 給 teamId 就只回那一組看得到的——關卡判定一定要用這個版本，
 * 不然只發給甲組的任務會把乙組也卡住。
 */
function tasksOfClass_(classId, teamId) {
  var all = readTable_('Tasks')
    .filter(function (t) { return String(t.classId) === String(classId); })
    .map(function (t) {
      return {
        id: t.taskId, klass: t.classId, layer: Number(t.layer) || 1, type: t.type || 'required',
        title: t.title, cond: t.cond, note: t.note, spec: t.spec || '', due: t.due,
        mineral: t.mineral || '', mDesc: t.mDesc || '', published: String(t.published) !== 'N',
        teams: taskTeams_(t), checks: jparse_(t.checks, [])
      };
    });
  if (!teamId) return all;
  return all.filter(function (d) { return taskForTeam_(d, teamId); });
}

function teamTaskMap_(teamId) {
  var m = {};
  readTable_('TeamTasks').forEach(function (r) {
    if (String(r.teamId) !== String(teamId)) return;
    m[String(r.taskId)] = {
      status: r.status || 'todo', text: r.text || '', files: jparse_(r.files, []),
      fb: r.fb || '', fbType: r.fbType || '', passedWeek: r.passedWeek === '' ? null : Number(r.passedWeek),
      effort: r.effort || '', effortNote: r.effortNote || '', blocker: r.blocker || '',
      checked: jparse_(r.checked, [])
    };
  });
  return m;
}

function mergeTasks_(defs, tmap, courseWeek, dueWeekFn, teamId, klass) {
  return defs.map(function (d) {
    var s = tmap[d.id] || { status: 'todo', text: '', files: [], fb: '', fbType: '', passedWeek: null,
                            effort: '', effortNote: '', blocker: '', checked: [] };
    var dw = dueWeekOf_(d.due);
    return Object.assign({}, d, {
      status: s.status, text: s.text, files: s.files, fb: s.fb, fbType: s.fbType,
      effort: s.effort, effortNote: s.effortNote, blocker: s.blocker,
      checked: s.checked || [],
      star: teamId ? starOf_(teamId, d.id) : false,
      vow: s.vow || '',
      /* 過了才結算。還沒過的時候顯示「還沒結算」，不要先給答案—— */
      /* 先給答案的話學生會照著答案倒推，那就不是宣告了。 */
      vowWon: (teamId && s.vow && String(s.status) === 'passed')
        ? vowWon_(teamId, d.id, d, klass, s.vow) : false,
      over: dw !== null && dw < courseWeek && s.status !== 'passed'
    });
  });
}

function dueWeekOf_(due) {
  if (typeof due === 'number') return due > 0 ? Math.max(1, Math.min(156, Math.floor(due))) : null;
  var s = String(due || '').trim();
  if (s === '' || s === '不設限') return null;
  if (/^\d+$/.test(s)) { var n = +s; return n > 0 ? Math.max(1, Math.min(156, n)) : null; }
  var m = /第\s*(\d+)\s*週/.exec(s);
  if (m) return Math.max(1, Math.min(156, +m[1]));
  return null;
}

/**
 * 一次回傳該端需要的整包狀態。
 * 學生：自己組的任務與排程、全班各組位置（超前的層由前端遮蔽）
 * 老師：全班所有組的任務狀態與待確認佇列
 * 研究者：不在這裡給資料，走 apiResearchSlice
 */
/** 每一層的礦脈開了幾塊，前端拿來標示與擋。 */
function veinStatus_(classId) {
  var out = {};
  for (var n = 1; n <= 5; n++) {
    var vein = MINERALS_BY_LAYER[n] || [];
    var left = unopenedMinerals_(classId, n);
    out[n] = { total: vein.length, open: vein.length - left.length, left: left };
  }
  return out;
}

/* ================= 逾時自動暫准 =================
   介面從一開始就承諾「老師缺席時，成本不由學生承擔」——
   交出去超過 N 天沒人驗，系統先放行，老師回來再補看。
   GAS 免費方案不能掛穩定的排程，所以走「有人開頁面就順手檢查」：
   apiBootstrap 先掃一次，有逾時的才拿鎖寫入。
   兩個時間都留下來：該被暫准的時間（研究資料）與實際補寫的時間（實作紀錄）。 */

function autoDays_() {
  var v = Number(getCfg_('autoDays', 7));
  return v >= 1 ? Math.floor(v) : 7;
}

function sweepOverdue_() {
  var days = autoDays_(), ms = days * 86400000, now = new Date();

  /* 便宜的預檢：全部走快取，一筆逾時都沒有就直接離開 */
  var subs = readTable_('Submissions');
  var lastSub = {};
  subs.forEach(function (s) {
    var k = s.teamId + '|' + s.taskId;
    if (!lastSub[k] || new Date(s.ts) > new Date(lastSub[k].ts)) lastSub[k] = s;
  });
  var overItems = readTable_('TeamTasks').filter(function (r) {
    if (r.status !== 'submitted') return false;
    var s = lastSub[r.teamId + '|' + r.taskId];
    return s && (now - new Date(s.ts)) > ms;
  });
  var overGates = readTable_('Teams').filter(function (t) {
    return String(t.gateSubmitted) === 'Y' && t.gateTs && (now - new Date(t.gateTs)) > ms;
  });
  if (!overItems.length && !overGates.length) return;

  var lock = LockService.getScriptLock();
  try { if (!lock.tryLock(5000)) return; } catch (e) { return; }
  try {
    /* 拿到鎖之後重讀原始資料再判斷一次，避免跟老師的驗收撞在一起 */
    overItems.forEach(function (r) {
      var cur = readRaw_('TeamTasks').filter(function (x) {
        return String(x.teamId) === String(r.teamId) && String(x.taskId) === String(r.taskId);
      })[0];
      if (!cur || cur.status !== 'submitted') return;
      var s = lastSub[r.teamId + '|' + r.taskId];
      var team = teamById_(r.teamId);
      if (!team) return;
      var kl = classById_(team.classId), courseWeek = courseWeekOf_(kl);
      var def = tasksOfClass_(team.classId).filter(function (d) { return String(d.id) === String(r.taskId); })[0];
      var txt = '（逾時自動暫准）交出去超過 ' + days + ' 天還沒被驗收，系統先放行。他回來補看時，這一段會換成他寫的判斷。';
      appendRow_('Reviews', {
        revId: 'rv' + Utilities.getUuid().slice(0, 8), subId: s ? s.subId : '',
        teamId: r.teamId, taskId: r.taskId, title: def ? def.title : '', layer: def ? def.layer : '',
        result: 'auto', reason: txt, len: 0, hasReason: 'N', week: courseWeek,
        latency: s ? Math.max(0, Math.round((now - new Date(s.ts)) / 3600000)) : 0, ts: now
      });
      upsert_('TeamTasks', ['teamId', 'taskId'], {
        teamId: r.teamId, taskId: r.taskId,
        status: 'passed', fb: txt, fbType: 'pass', passedWeek: courseWeek
      });
    });

    overGates.forEach(function (t0) {
      var t = teamById_(t0.teamId);
      if (!t || String(t.gateSubmitted) !== 'Y') return;
      var layer = Number(t.layer) || 1;
      /* 全收集的兩道門檻照樣要過——沒過就留給老師，不自動放行 */
      if ((unopenedMinerals_(t.classId, layer, t.teamId) || []).length) return;
      if ((missingRequired_(t.teamId) || []).length) return;
      var kl = classById_(t.classId), courseWeek = courseWeekOf_(kl);
      var cells = jparse_(t.gateText, ['', '', '']);
      var txt = '（逾時自動暫准）關卡送出超過 ' + days + ' 天沒被審，系統先放行。';
      appendRow_('Passes', {
        passId: 'p' + Utilities.getUuid().slice(0, 8), teamId: t.teamId, layer: layer, week: courseWeek,
        toolLevel: '', gateCell1: cells[0] || '', gateCell2: cells[1] || '', gateCell3: cells[2] || '',
        verdict: 'auto', reason: txt, ts: now
      });
      var passedArr = jparse_(t.passed, []);
      if (passedArr.indexOf(layer) < 0) passedArr.push(layer);
      var levels = jparse_(t.toolLevels, {});
      levels[layer] = '已交出';
      upsert_('Teams', ['teamId'], {
        teamId: t.teamId, layer: Math.min(5, layer + 1), enteredWeek: courseWeek,
        passed: JSON.stringify(passedArr), toolLevels: JSON.stringify(levels),
        gateText: '["","",""]', gateSubmitted: 'N', gateVerdict: 'pass'
      });
    });
  } finally { lock.releaseLock(); }
}

function apiBootstrap(token) {
  try {
    var u = auth_(token);
    try { sweepOverdue_(); } catch (e) {}   /* 逾時自動暫准：有人開頁面就順手檢查 */
    var classes = classesOf_(u);
    var classId = u.classId || (classes[0] && classes[0].id) || '';
    var kl = classById_(classId);
    var courseWeek = kl ? courseWeekOf_(kl) : 1;

    var allTeams = readTable_('Teams')
      .filter(function (t) { return String(t.classId) === String(classId); })
      .map(function (t) { return teamPub_(t, courseWeek); });

    var defs = tasksOfClass_(classId);
    var out = {
      user: pubUser_(u), classes: classes, classId: classId,
      courseWeek: courseWeek, joinCode: kl ? kl.joinCode : '',
      teams: allTeams, taskDefs: defs, serverTime: new Date().toISOString(),
      minNames: minNamesOf_(u.teamId || '')   /* 這一組的拆分名稱 */
    };

    if (u.role !== 'student') {
      out.minNamesByTeam = minNamesByTeam_(classId);
      var gots = gotByLayer_(classId);
      allTeams.forEach(function (t) { t.got = gots[t.id] || {}; });
    }

    if (u.role === 'student') {
      var me = teamById_(u.teamId);
      out.myTeamId = u.teamId || '';
      out.record = recordOf_(u.teamId, u.classId);
      out.digs = digsOf_(u.teamId);
      out.finds = findsOf_(u.teamId);
      out.findsTotal = FINDS_N;
      out.digPages = digPages_(u.teamId);
      out.digTotal = DIG_PAGES;
      if (me) {
        var mp = teamPub_(me, courseWeek);
        var fMine = readTable_('Finales').filter(function (x) { return String(x.teamId) === String(me.teamId); })[0];
        mp.finaleOpened = !!(fMine && String(fMine.opened) === 'Y');

        /* 每一層的標籤＝老師放行這一組進來的時候寫的那句話。
           每個老師對每一組的規劃都不同，所以班級層級的標籤不可能
           是對的——只有他當時對這一組說的那句話是對的。 */
        out.layerSaid = {};
        readTable_('Passes').forEach(function (p) {
          if (String(p.teamId) !== String(me.teamId)) return;
          if (String(p.verdict) !== 'pass') return;
          var into = (Number(p.layer) || 1) + 1;   /* 過了第 N 層 = 進到第 N+1 層 */
          if (String(p.reason || '')) out.layerSaid[into] = String(p.reason);
        });
        out.myTeam = mp;
        out.tasks = mergeTasks_(tasksOfClass_(classId, me.teamId), teamTaskMap_(me.teamId), courseWeek, null, me.teamId, kl);
        out.plan = {};
        readTable_('Plans').forEach(function (p) {
          if (String(p.teamId) !== String(me.teamId)) return;
          var b = Number(p.toWeek) || Number(p.week) || 1;
          var a = Number(p.fromWeek) || b;
          out.plan[String(p.taskId)] = { a: Math.min(a, b), b: b };
        });
        out.passedWeek = {};
        var tm = teamTaskMap_(me.teamId);
        Object.keys(tm).forEach(function (k) { if (tm[k].passedWeek) out.passedWeek[k] = tm[k].passedWeek; });
        var classTeamIds = {};
        allTeams.forEach(function (t) { classTeamIds[t.id] = true; });
        out.publicPasses = readTable_('Passes')
          .filter(function (p) { return String(p.verdict) === 'pass' && classTeamIds[p.teamId]; })
          .map(function (p) {
            return { teamId: p.teamId, layer: Number(p.layer), week: Number(p.week),
                     cells: [p.gateCell1, p.gateCell2, p.gateCell3], reason: p.reason || '' };
          });
      }
    }

    if (u.role === 'teacher') {
      out.teamTasks = {};
      allTeams.forEach(function (t) {
        out.teamTasks[t.id] = mergeTasks_(tasksOfClass_(classId, t.id), teamTaskMap_(t.id), courseWeek, null, t.id, kl);
      });
      out.queue = [];
      allTeams.forEach(function (t) {
        out.teamTasks[t.id].forEach(function (task) {
          if (task.status === 'submitted') {
            out.queue.push({
              id: t.id + '::' + task.id, teamId: t.id, teamName: t.name,
              taskId: task.id, title: task.title, layer: task.layer, type: task.type,
              text: task.text, files: task.files, over: task.over, due: task.due, spec: task.spec || '',
              effort: task.effort, effortNote: task.effortNote, blocker: task.blocker,
              weeks: t.weeks, cond: task.cond, mineral: task.mineral
            });
          }
        });
      });
      /* 這一位老師自己寫過的合格考量：拿來做常用句與書寫量對照 */
      var myIds = {};
      allTeams.forEach(function (t) { myIds[String(t.id)] = 1; });
      var mine = readTable_('Reviews').filter(function (r) {
        return myIds[String(r.teamId)] && String(r.reason || '').trim();
      });
      var heads = {};
      mine.forEach(function (r) {
        var h = String(r.reason).trim().split(/[。，、；\n]/)[0].trim();
        if (h.length >= 4 && h.length <= 18) heads[h] = (heads[h] || 0) + 1;
      });
      out.myPhrases = Object.keys(heads).filter(function (h) { return heads[h] >= 3; })
        .sort(function (a, b) { return heads[b] - heads[a]; }).slice(0, 5)
        .map(function (h) { return { text: h, n: heads[h] }; });
      /* 每一層的平均字數：讓老師看得見自己的書寫量在變 */
      var byLayer = {};
      mine.forEach(function (r) {
        var n = Number(r.layer) || 1;
        if (!byLayer[n]) byLayer[n] = { n: 0, len: 0 };
        byLayer[n].n++; byLayer[n].len += String(r.reason).trim().length;
      });
      out.myWriting = [1, 2, 3, 4, 5].map(function (n) {
        var b = byLayer[n];
        return { layer: n, count: b ? b.n : 0, avg: b ? Math.round(b.len / b.n) : 0 };
      });
      out.gates = allTeams.filter(function (t) { return t.gateSubmitted && !t.gateVerdict; })
        .map(function (t) {
          return { teamId: t.id, teamName: t.name, layer: t.layer, cells: t.gateText, weeks: t.weeks };
        });
    }

    return ok_(out);
  } catch (e) { return err_(e); }
}

/* ================= 學生動作 ================= */

/**
 * 學生提交一項。reflect＝這一組對自己現在狀態的判斷：
 * { effort:'fast'|'onpar'|'slow', effortNote, blocker }
 * 老師在 T-06 會先看到這一段，再寫合格考量——這是這套系統的來回。
 */
function apiSubmitItem(token, taskId, text, files, reflect) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return err_('系統忙碌，請再試一次。'); }
  try {
    var u = auth_(token);
    if (u.role !== 'student' || !u.teamId) return err_('只有學生可以提交。');
    reflect = reflect || {};
    var effort = ['fast', 'onpar', 'slow'].indexOf(String(reflect.effort)) >= 0 ? String(reflect.effort) : '';
    if (!effort) return err_('先說一次這一項實際花的力氣跟你們原本估的差多少。');
    var kl = classById_(u.classId), courseWeek = courseWeekOf_(kl);
    var defs = tasksOfClass_(u.classId, u.teamId);
    var def = null;
    for (var i = 0; i < defs.length; i++) if (String(defs[i].id) === String(taskId)) def = defs[i];
    if (!def) return err_('找不到這一項任務。');

    /* 排程納入主流程：交之前一定要先說打算哪一週交，期末才對得出估得準不準 */
    var planned = readTable_('Plans').some(function (x) {
      return String(x.teamId) === String(u.teamId) && String(x.taskId) === String(taskId);
    });
    if (!planned) return err_('先在甘特圖或提交頁上說你打算哪一週交這一項。');

    files = files || [];
    var dw = dueWeekOf_(def.due);
    var attempt = readTable_('Submissions').filter(function (s) {
      return String(s.taskId) === String(taskId) && String(s.teamId) === String(u.teamId);
    }).length + 1;

    appendRow_('Submissions', {
      subId: 's' + Utilities.getUuid().slice(0, 8), taskId: taskId, teamId: u.teamId,
      week: courseWeek, dueWeek: dw === null ? '' : dw, overdue: (dw !== null && dw < courseWeek) ? 'Y' : 'N',
      len: String(text || '').trim().length, files: files.length, attempt: attempt,
      text: String(text || ''),
      effort: effort, effortNote: String(reflect.effortNote || ''), blocker: String(reflect.blocker || ''),
      fileList: JSON.stringify(files), ts: new Date()
    });
    upsert_('TeamTasks', ['teamId', 'taskId'], {
      teamId: u.teamId, taskId: taskId, status: 'submitted',
      text: String(text || ''), files: JSON.stringify(files),
      effort: effort, effortNote: String(reflect.effortNote || ''), blocker: String(reflect.blocker || ''),
      updatedAt: new Date()
    });
    return ok_({ attempt: attempt });
  } catch (e) { return err_(e); } finally { lock.releaseLock(); }
}

/** 學生排程：可以排一段區間（from 到 to）。to 是他們打算交出去的那一週。 */
/**
 * 一項任務的往返紀錄：第幾次交、交了什麼、當時對自己的判斷、老師退回的理由。
 * 學生只看得到自己組的；老師看得到自己班的任何一組。
 */
function apiTaskHistory(token, teamId, taskId) {
  try {
    var u = auth_(token);
    var tid = teamId || u.teamId;
    if (u.role === 'student') tid = u.teamId;
    else if (u.role === 'teacher') {
      var t = teamById_(tid);
      if (!t || String(t.classId) !== String(u.classId)) return err_('沒有權限。');
    } else return err_('沒有權限。');

    var subs = readTable_('Submissions').filter(function (s) {
      return String(s.taskId) === String(taskId) && String(s.teamId) === String(tid);
    }).sort(function (a, b) { return (Number(a.attempt) || 0) - (Number(b.attempt) || 0); });

    var revs = readTable_('Reviews').filter(function (r) {
      return String(r.taskId) === String(taskId) && String(r.teamId) === String(tid);
    }).sort(function (a, b) { return new Date(a.ts) - new Date(b.ts); });

    var rounds = subs.map(function (s, i) {
      var r = revs[i] || null;
      return {
        n: Number(s.attempt) || (i + 1),
        week: Number(s.week) || 1,
        text: s.text || '',
        len: Number(s.len) || 0,
        files: jparse_(s.fileList, []),
        effort: s.effort || '', effortNote: s.effortNote || '', blocker: s.blocker || '',
        result: r ? r.result : '', reason: r ? (r.reason || '') : '',
        reviewWeek: r ? Number(r.week) || 0 : 0,
        hasReason: r ? String(r.hasReason) === 'Y' : false
      };
    });
    var rejected = rounds.filter(function (x) { return x.result === 'needfix'; }).length;
    return ok_({ rounds: rounds, attempts: rounds.length, rejected: rejected });
  } catch (e) { return err_(e); }
}

/**
 * 期末回顧的整學期資料：一項一項的「你排的 vs 實際通過」、被退回幾次、
 * 每一次自評跟老師判斷合不合。學生用來看自己一學期估得準不準。
 */
function apiFinale(token, teamId) {
  try {
    var u = auth_(token);
    var tid = (u.role === 'student') ? u.teamId : (teamId || '');
    var t = teamById_(tid);
    if (!t) return err_('找不到這一組。');
    if (u.role === 'teacher' && String(t.classId) !== String(u.classId)) return err_('沒有權限。');
    if (u.role === 'researcher') return err_('沒有權限。');

    var defs = tasksOfClass_(t.classId, t.teamId);
    var tmap = teamTaskMap_(tid);
    var plans = {};
    readTable_('Plans').forEach(function (p) {
      if (String(p.teamId) !== String(tid)) return;
      var b = Number(p.toWeek) || Number(p.week) || 0;
      plans[String(p.taskId)] = { a: Number(p.fromWeek) || b, b: b };
    });
    var subs = readTable_('Submissions').filter(function (s) { return String(s.teamId) === String(tid); });
    var revs = readTable_('Reviews').filter(function (r) { return String(r.teamId) === String(tid); });

    var rows = defs.map(function (d) {
      var st = tmap[d.id] || {};
      var mySubs = subs.filter(function (s) { return String(s.taskId) === String(d.id); });
      var myRevs = revs.filter(function (r) { return String(r.taskId) === String(d.id); });
      var rejected = myRevs.filter(function (r) { return r.result === 'needfix'; }).length;
      var plan = plans[d.id] || null;
      var first = mySubs[0] || null;
      var lastRev = myRevs[myRevs.length - 1] || null;
      return {
        id: d.id, layer: d.layer, type: d.type, title: d.title, mineral: d.mineral,
        status: st.status || 'todo',
        planFrom: plan ? plan.a : 0, planTo: plan ? plan.b : 0,
        realWeek: st.passedWeek || 0,
        attempts: mySubs.length, rejected: rejected,
        effort: first ? (first.effort || '') : '',
        lastEffort: mySubs.length ? (mySubs[mySubs.length - 1].effort || '') : '',
        lastResult: lastRev ? lastRev.result : ''
      };
    });

    /* 自評 vs 老師判斷：每一輪配對 */
    var seen = {}, cross = { agree: 0, optimistic: 0, conservative: 0, total: 0 };
    revs.forEach(function (r) {
      var k = r.taskId;
      var i = seen[k] = (seen[k] || 0) + 1;
      var mine = subs.filter(function (s) { return String(s.taskId) === String(r.taskId); })
        .sort(function (a, b) { return (Number(a.attempt) || 0) - (Number(b.attempt) || 0); });
      var s = mine[i - 1];
      if (!s || !s.effort) return;
      cross.total++;
      if (s.effort === 'slow' && r.result === 'needfix') cross.agree++;
      else if (s.effort !== 'slow' && r.result === 'pass') cross.agree++;
      else if (s.effort !== 'slow' && r.result === 'needfix') cross.optimistic++;
      else cross.conservative++;
    });

    var f = readTable_('Finales').filter(function (x) { return String(x.teamId) === String(tid); })[0] || null;
    return ok_({
      team: t.name, layer: Number(t.layer) || 1,
      passed: jparse_(t.passed, []), toolLevels: jparse_(t.toolLevels, {}),
      specNames: jparse_(t.specNames, {}),
      rows: rows, cross: cross,
      totalRejected: revs.filter(function (r) { return r.result === 'needfix'; }).length,
      totalSubs: subs.length,
      finale: f ? { q1: f.q1 || '', q2: f.q2 || '', q3: f.q3 || '',
                    lightName: f.lightName || '', submitted: String(f.submitted) === 'Y',
                    opened: String(f.opened) === 'Y', openWords: f.openWords || '',
                    openedBy: f.openedBy || '',
                    openedAt: f.openedAt ? String(f.openedAt) : '' } : null
    });
  } catch (e) { return err_(e); }
}

/** 學生寫完期末回顧送出。送出之後老師看得到。 */
function apiSaveFinale(token, answers, submit) {
  try {
    var u = auth_(token);
    if (u.role !== 'student' || !u.teamId) return err_('只有學生寫這一份。');
    var fOpen = readTable_('Finales').filter(function (x) { return String(x.teamId) === String(u.teamId); })[0];
    if (!fOpen || String(fOpen.opened) !== 'Y') return err_('結局還沒開。老師放行之後才寫得了。');
    answers = answers || {};
    var prevF = readTable_('Finales').filter(function (x) { return String(x.teamId) === String(u.teamId); })[0] || {};
    upsert_('Finales', ['teamId'], {
      teamId: u.teamId, q1: String(answers.q1 || ''), q2: String(answers.q2 || ''),
      q3: String(answers.q3 || ''), lightName: String(answers.lightName || ''),
      submitted: submit ? 'Y' : 'N', ts: new Date(),
      opened: prevF.opened || '', openWords: prevF.openWords || '',
      openedBy: prevF.openedBy || '', openedAt: prevF.openedAt || ''
    });
    return ok_();
  } catch (e) { return err_(e); }
}

/** 老師端：走完第五層、送出最後檢討的小隊。純閱讀，沒有審核。 */
function apiFinaleQueue(token) {
  try {
    var u = auth_(token);
    if (u.role !== 'teacher') return err_('只有老師看得到這一份。');
    var teams = readTable_('Teams').filter(function (t) { return String(t.classId) === String(u.classId); });
    var fin = {};
    readTable_('Finales').forEach(function (f) { fin[String(f.teamId)] = f; });
    var w = courseWeekOf_(classById_(u.classId));
    var list = teams.map(function (t) {
      var f = fin[String(t.teamId)] || {};
      var done5 = jparse_(t.passed, []).indexOf(5) >= 0;
      return {
        teamId: t.teamId, name: t.name, layer: Number(t.layer) || 1,
        weeks: Math.max(1, w - (Number(t.enteredWeek) || 1) + 1),
        done5: done5,
        applied: String(f.submitted) === 'Y',
        opened: String(f.opened) === 'Y',
        openWords: f.openWords || '',
        submittedAt: f.ts ? String(f.ts) : ''
      };
    });
    return ok_({ list: list, courseWeek: w });
  } catch (e) { return err_(e); }
}

/**
 * 老師在系統裡的最後一個動作：准許這一組進入結局。
 * 走完第五層不會自動開結局——側欄那一項維持 ？？？，直到他放行。
 * 放行時寫的那一段話，是學生在結局最上面讀到的第一句。
 */
function apiOpenFinale(token, teamId, words) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var u = auth_(token);
    if (u.role !== 'teacher') return err_('只有老師能放行。');
    var t = teamById_(teamId);
    if (!t) return err_('找不到這一組。');
    if (String(t.classId) !== String(u.classId)) return err_('沒有權限。');
    if (jparse_(t.passed, []).indexOf(5) < 0) return err_('這一組還沒走完第五層，結局開不了。');
    if (!String(words || '').trim()) return err_('先寫下你要說的話。這是他們在結局最上面讀到的第一句。');
    var f = readTable_('Finales').filter(function (x) { return String(x.teamId) === String(teamId); })[0] || {};
    upsert_('Finales', ['teamId'], {
      teamId: teamId, q1: f.q1 || '', q2: f.q2 || '', q3: f.q3 || '',
      lightName: f.lightName || '', submitted: f.submitted || 'N', ts: f.ts || new Date(),
      opened: 'Y', openWords: String(words),
      openedBy: u.name || u.account || '', openedAt: new Date()
    });
    return ok_({ opened: true });
  } catch (e) { return err_(e); } finally { try { lock.releaseLock(); } catch (e2) {} }
}

function apiSavePlan(token, taskId, from, to) {
  try {
    var u = auth_(token);
    if (u.role !== 'student' || !u.teamId) return err_('只有學生有排程。');
    var a = Math.max(1, Math.floor(Number(from) || 1));
    var b = Math.max(a, Math.floor(Number(to) || a));
    upsert_('Plans', ['teamId', 'taskId'], { teamId: u.teamId, taskId: taskId, week: b, fromWeek: a, toWeek: b });
    return ok_();
  } catch (e) { return err_(e); }
}

/** 這一層的礦脈裡，老師還沒開出來的礦石。空陣列＝這一層開完了。 */
/** 這一層的礦脈裡，這一組還沒被開出來的礦石。 */
function unopenedMinerals_(classId, layer, teamId) {
  var vein = MINERALS_BY_LAYER[layer] || [];
  var used = {};
  tasksOfClass_(classId, teamId).forEach(function (d) {
    if (d.layer === layer && d.mineral) used[d.mineral] = 1;
  });
  return vein.filter(function (n) { return !used[n]; });
}

/** 這一層還沒採到的礦石。空陣列＝這一層全收集了，可以送關卡。
    全收集是這套系統的核心：那一層的礦脈要開完，也要採完。 */
function missingRequired_(teamId) {
  var t = teamById_(teamId);
  if (!t) return null;
  var layer = Number(t.layer) || 1;
  var tmap = teamTaskMap_(teamId);
  return tasksOfClass_(t.classId, teamId).filter(function (d) {
    if (d.layer !== layer) return false;
    var s = tmap[d.id];
    return !s || s.status !== 'passed';
  });
}

function apiSubmitGate(token, cells) {
  try {
    var u = auth_(token);
    if (u.role !== 'student' || !u.teamId) return err_('只有學生可以送關卡。');

    /* 關卡不再看收集。過不過是老師的判斷——他覺得這一組有沒有
       前進一個階段。礦石照樣採、照樣進收藏，只是不再是門檻。 */
    upsert_('Teams', ['teamId'], {
      teamId: u.teamId, gateText: JSON.stringify(cells || ['', '', '']),
      gateSubmitted: 'Y', gateVerdict: '', gateTs: new Date()
    });
    return ok_();
  } catch (e) { return err_(e); }
}

function apiLogRead(token, targetTeamId) {
  try {
    var u = auth_(token);
    if (u.role !== 'student' || !u.teamId) return ok_();
    var kl = classById_(u.classId), courseWeek = courseWeekOf_(kl);
    var me = teamPub_(teamById_(u.teamId), courseWeek);
    var target = teamById_(targetTeamId);
    if (!target) return ok_();
    var rejected = false;
    var tm = teamTaskMap_(u.teamId);
    Object.keys(tm).forEach(function (k) { if (tm[k].status === 'needs_more') rejected = true; });
    appendRow_('Reads', {
      readId: 'r' + Utilities.getUuid().slice(0, 8), readerTeam: u.teamId, targetTeam: targetTeamId,
      layer: Number(target.layer) || 1, week: courseWeek, readerLayer: me.layer,
      readerStay: me.weeks, recentlyRejected: rejected ? 'Y' : 'N', ts: new Date()
    });
    return ok_();
  } catch (e) { return err_(e); }
}

/** 第五層「完成之光」由學生自行命名。 */
function apiSaveSpecName(token, key, name) {
  try {
    var u = auth_(token);
    if (u.role !== 'student' || !u.teamId) return err_('只有學生可以命名。');
    var t = teamById_(u.teamId);
    var names = jparse_(t.specNames, {});
    names[key] = name;
    upsert_('Teams', ['teamId'], { teamId: u.teamId, specNames: JSON.stringify(names) });
    return ok_();
  } catch (e) { return err_(e); }
}

/** 這一班的拆分改名：mineral 是礦石名（固定），label 是老師自己的工作名稱。 */
/** 某一組的拆分名稱。老師可以照每一組的專案狀況分別命名。 */
function minNamesOf_(teamId) {
  var out = {};
  if (!teamId) return out;
  readTable_('MinNames').forEach(function (r) {
    if (String(r.teamId) !== String(teamId)) return;
    out[String(r.mineral)] = { label: String(r.label || ''), note: String(r.note || '') };
  });
  return out;
}

/** 這一班每一組各自的拆分名稱，老師端要一次拿到。 */
function minNamesByTeam_(classId) {
  var mine = {};
  readTable_('Teams').forEach(function (t) {
    if (String(t.classId) === String(classId)) mine[String(t.teamId)] = {};
  });
  readTable_('MinNames').forEach(function (r) {
    var tid = String(r.teamId);
    if (!mine[tid]) return;
    mine[tid][String(r.mineral)] = { label: String(r.label || ''), note: String(r.note || '') };
  });
  return mine;
}

/**
 * 老師改這一層某一塊礦石對應的工作名稱與說法。
 * label 留空＝改回系統預設。
 */
function apiSetMineralName(token, teamId, mineral, label, note) {
  try {
    var u = auth_(token);
    if (u.role !== 'teacher' && u.role !== 'researcher') return err_('只有老師可以改拆分名稱。');
    var tm = teamById_(teamId);
    if (!tm) return err_('找不到這一組。');
    var kl = classById_(tm.classId);
    if (!kl) return err_('找不到這個班級。');
    if (u.role === 'teacher' && String(kl.teacherId) !== String(u.userId) &&
        String(u.classId) !== String(tm.classId)) {
      return err_('這不是你帶的班。');
    }
    var name = String(mineral || '').trim();
    if (!name) return err_('要改哪一塊？');
    var lb = String(label || '').trim();
    var nt = String(note || '').trim();
    if (lb.length > 40) return err_('工作名稱請控制在 40 個字以內。');
    if (nt.length > 200) return err_('說法請控制在 200 個字以內。');

    if (!lb && !nt) {
      /* 兩個都空＝改回預設，那就把這一列刪掉 */
      writeTable_('MinNames', readTable_('MinNames').filter(function (r) {
        return !(String(r.teamId) === String(teamId) && String(r.mineral) === name);
      }));
    } else {
      upsert_('MinNames', ['teamId', 'mineral'],
        { teamId: teamId, mineral: name, label: lb, note: nt });
    }
    return ok_({ teamId: teamId, minNames: minNamesOf_(teamId),
                 minNamesByTeam: minNamesByTeam_(tm.classId) });
  } catch (e) { return err_(e); }
}

/* ================= 老師動作 ================= */

function assertTeacher_(token) {
  var u = auth_(token);
  if (u.role !== 'teacher') throw new Error('這個動作只有老師可以做。');
  return u;
}

/** 老師寫的那張清單：一行一條，去頭尾空白、丟掉空行，最多 12 條。 */
function checkList_(raw) {
  var a = raw;
  if (typeof a === 'string') a = jparse_(a, []);
  if (!a || !a.length) return [];
  return a.map(function (x) { return String(x || '').trim(); })
          .filter(function (x) { return x; })
          .slice(0, 12);
}

/**
 * 學生勾／取消勾清單上的一條。作業本身交在老師原本收的地方，
 * 這裡只記「他們說自己做到哪幾條」。
 */
/* ================= 回掘與計分 =================
   回掘（★）：送出之前，自己把一項已經勾好的打開、補完、再勾回去。

   這是整套設計裡唯一一個老師給不了的東西——只能學生自己走那條路
   產生。所以它值 30 分，而不是通過的 10 分；而且是取代不是相加。

   防刷：取消必須距離該項「上一次勾起來」至少 6 小時。十分鐘之內
   勾了又取消不算——那不是發現問題，那是在刷分。

   一項任務的 ★ 只計一次。它是「那一頁」的屬性，不是「那一條」的。 */

var STAR_GAP_MS = 6 * 60 * 60 * 1000;

function checksOf_(teamId, taskId) {
  return readTable_('Checks')
    .filter(function (c) {
      return String(c.teamId) === String(teamId) && String(c.taskId) === String(taskId);
    })
    .sort(function (a, b) { return new Date(a.ts) - new Date(b.ts); });
}

/** 這一組在這一項任務上，有沒有回掘過。 */
function starOf_(teamId, taskId) {
  var ev = checksOf_(teamId, taskId);
  var lastOn = {};   /* idx -> 上一次勾起來的時間 */
  var opened = {};   /* idx -> 有效地打開過（距上次勾 >= 6h） */
  for (var i = 0; i < ev.length; i++) {
    var k = String(ev[i].idx), t = new Date(ev[i].ts).getTime();
    if (String(ev[i].act) === 'on') {
      /* 打開過又勾回來 —— 成立 */
      if (opened[k]) return true;
      lastOn[k] = t;
    } else {
      if (lastOn[k] && (t - lastOn[k]) >= STAR_GAP_MS) opened[k] = true;
      delete lastOn[k];
    }
  }
  return false;
}

/* ---- 分數 ----
   照《冒險之書》第 05 章：
     勾一條條目                 1
     一項任務通過              10
     通過而且達成宣告的破法    30（取代 10，不是加上去）

   基本盤（勾＋通過）跑幾輪之後大家都差不多——那是老師排的課決定
   的。差距全部來自破法，而破法是學生自己宣告、自己做到的。

   試挖刻意不算分：給分就會有人為了分數去刷，而它的價值在於誠實
   記錄自己押錯了。 */
function scoreOf_(teamId, classId) {
  var kl = classById_(classId);
  var byId = {};
  if (classId) tasksOfClass_(classId, teamId).forEach(function (d) { byId[String(d.id)] = d; });

  var ticks = 0, pages = 0, vows = 0;
  readTable_('TeamTasks').forEach(function (r) {
    if (String(r.teamId) !== String(teamId)) return;
    ticks += (jparse_(r.checked, []) || []).length;
    if (String(r.status) !== 'passed') return;
    var def = byId[String(r.taskId)];
    var won = !!(def && r.vow && vowWon_(teamId, r.taskId, def, kl, String(r.vow)));
    if (won) vows++; else pages++;
  });

  return {
    ticks: ticks, pages: pages, vows: vows,
    base: ticks + (pages + vows) * 10,
    bonus: vows * 20,
    total: ticks + pages * 10 + vows * 30
  };
}

/**
 * 初採：每一塊礦第一個採到的是誰。
 * 以裁決時間為準——跟文件第 09 章「初討伐以裁決時間戳為準」一致。
 */
function firstsOf_(classId) {
  var teams = {};
  readTable_('Teams').forEach(function (t) {
    if (String(t.classId) === String(classId)) teams[String(t.teamId)] = t.name || t.teamId;
  });
  var out = {};
  readTable_('Reviews')
    .filter(function (r) { return String(r.result) === 'pass' && teams[String(r.teamId)]; })
    .sort(function (a, b) { return new Date(a.ts) - new Date(b.ts); })
    .forEach(function (r) {
      var k = String(r.taskId);
      if (!out[k]) out[k] = { teamId: String(r.teamId), name: teams[String(r.teamId)], ts: String(r.ts) };
    });
  return out;
}

/** 全班名冊。以隊伍為單位，不做個人排名。 */

/** 這一組每一項任務的紀錄：宣告了什麼、拿到沒、老師說了什麼。 */
function recordOf_(teamId, classId) {
  var kl = classById_(classId);
  var defs = tasksOfClass_(classId, teamId);
  var tmap = teamTaskMap_(teamId);
  var revs = readTable_('Reviews').filter(function (r) { return String(r.teamId) === String(teamId); });
  var subs = readTable_('Submissions').filter(function (s) { return String(s.teamId) === String(teamId); });

  return defs.map(function (d) {
    var st = tmap[d.id] || {};
    var myRevs = revs.filter(function (r) { return String(r.taskId) === String(d.id); });
    var last = myRevs[myRevs.length - 1] || null;
    var vow = String(st.vow || '');
    return {
      id: d.id, layer: Number(d.layer) || 1, title: d.title,
      status: st.status || 'todo',
      vow: vow,
      /* 送出當下就算得出來——五種破法沒有一種需要老師的判斷。
         格子那一套已經拿掉，這裡是唯一的即時回饋，不能再卡在裁決後面。 */
      settled: !!(vow && subs.filter(function (s) { return String(s.taskId) === String(d.id); }).length),
      won: (vow && subs.filter(function (s) { return String(s.taskId) === String(d.id); }).length)
        ? vowWon_(teamId, d.id, d, kl, vow) : false,
      rounds: subs.filter(function (s) { return String(s.taskId) === String(d.id); }).length,
      sentBack: myRevs.filter(function (r) { return String(r.result) === 'needfix'; }).length,
      say: last ? String(last.reason || '') : '',
      mineral: d.mineral || ''
    };
  });
}

function apiRoster(token) {
  try {
    var u = auth_(token);
    /* 榜就是分數。格子是個人的，不放進來比。 */
    var firsts = firstsOf_(u.classId);
    var mine = {};
    Object.keys(firsts).forEach(function (k) {
      mine[firsts[k].teamId] = (mine[firsts[k].teamId] || 0) + 1;
    });

    var out = readTable_('Teams')
      .filter(function (t) { return String(t.classId) === String(u.classId); })
      .map(function (t) {
        var s = scoreOf_(t.teamId, u.classId);
        return { teamId: t.teamId, name: t.name || t.teamId,
                 me: String(t.teamId) === String(u.teamId || ''),
                 ticks: s.ticks, pages: s.pages, vows: s.vows,
                 base: s.base, bonus: s.bonus, total: s.total,
                 firsts: mine[String(t.teamId)] || 0 };
      });
    out.sort(function (a, b) { return b.total - a.total; });

    /* 初採清單：哪一塊礦被誰先採走，哪幾塊還沒有人碰 */
    /* 誰正在爭奪：送出了、老師還沒判。只給組數不給名字——
       張力夠了，又不會變成公開處刑。 */
    var racing = {};
    readTable_('TeamTasks').forEach(function (r) {
      if (String(r.status) !== 'submitted') return;
      racing[String(r.taskId)] = (racing[String(r.taskId)] || 0) + 1;
    });

    var claims = tasksOfClass_(u.classId, '').map(function (d) {
      var f = firsts[String(d.id)];
      return { taskId: d.id, layer: Number(d.layer) || 1,
               mineral: d.mineral || d.title, title: d.title,
               by: f ? f.name : '', mine: !!(f && String(f.teamId) === String(u.teamId || '')),
               racing: f ? 0 : (racing[String(d.id)] || 0) };
    });
    return ok_({ roster: out, claims: claims });
  } catch (e) { return err_(e); }
}

/* ================= 破法 =================
   一項任務可以宣告一樣破法。過關的時候結算：做到了就掉那一樣。

   五樣的共同點：全部是學生自己能決定的。刻意不放「一次過」跟
   「被退幾次」——那兩件事是老師在決定的，拿來當收集目標就變成
   在收集老師的心情。

   也刻意不隨機。隨機的是遇到誰、掉什麼殘留，不是這一格。 */

var VOWS = ['early', 'keep', 'back', 'all', 'probe'];

/**
 * 一項任務的時間窗：發布 → 期限。回傳 {a, b} 兩個毫秒數。
 * 期限訂不出來就回 null——那兩樣跟時間有關的破法就拿不到。
 */
function taskSpan_(def, klass) {
  var dw = dueWeekOf_(def && def.due);
  if (dw === null) return null;
  var start = toDate_(klass ? klass.courseStart : cfg_('courseStart', '2026-09-14'));
  var s0 = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  var b = s0 + dw * 7 * 86400000;                    /* 期限那一週的週末 */
  var a = def && def.createdAt ? new Date(def.createdAt).getTime() : 0;
  if (!a || a >= b) a = b - 14 * 86400000;           /* 沒有發布時間就假定兩週的窗 */
  return { a: a, b: b };
}

/** 某個時間點走到這個窗的幾成（0..1）。窗外就夾到 0 或 1。 */
function spanAt_(span, d) {
  if (!span || span.b <= span.a) return 1;
  var t = new Date(d).getTime();
  return Math.max(0, Math.min(1, (t - span.a) / (span.b - span.a)));
}

/** 這一組在這一項的勾選事件，照時間排好 */
function tickEvents_(teamId, taskId) {
  return checksOf_(teamId, taskId).filter(function (c) { return String(c.act) === 'on'; });
}

/**
 * 宣告的那一樣做到了沒。
 * def 是任務定義，klass 是班級（要算週次）。
 */
function vowWon_(teamId, taskId, def, klass, vow) {
  if (VOWS.indexOf(String(vow)) < 0) return false;

  if (vow === 'back') return starOf_(teamId, taskId);

  var ticks = tickEvents_(teamId, taskId);
  if (!ticks.length) return false;

  if (vow === 'early') {
    /* 第一條勾的時候，這一項的時間窗還沒走到一半。 */
    var sp = taskSpan_(def, klass);
    if (!sp) return false;
    return spanAt_(sp, ticks[0].ts) < 0.5;
  }

  if (vow === 'keep') {
    /* 第一次送出的時候，窗還沒走到 90%——沒有壓在最後才交。 */
    var sp2 = taskSpan_(def, klass);
    if (!sp2) return false;
    var first = null;
    readTable_('Submissions').forEach(function (s) {
      if (String(s.teamId) !== String(teamId) || String(s.taskId) !== String(taskId)) return;
      if (!first || (Number(s.attempt) || 0) < (Number(first.attempt) || 0)) first = s;
    });
    if (!first) return false;
    return spanAt_(sp2, first.ts) < 0.9;
  }

  if (vow === 'all') {
    /* 每個認領過身分的組員都要勾過至少一條 */
    var members = readTable_('Roster').filter(function (r) {
      return String(r.teamId) === String(teamId) && String(r.claimedBy || '');
    });
    if (members.length < 2) return false;   /* 一個人的隊伍沒有這一項 */
    var who = {};
    ticks.forEach(function (c) { if (c.by) who[String(c.by)] = true; });
    for (var i = 0; i < members.length; i++) {
      if (!who[String(members[i].claimedBy)]) return false;
    }
    return true;
  }

  if (vow === 'probe') {
    /* 開在第一條勾之後、收在送出之前的試挖，至少一條 */
    var t0 = new Date(ticks[0].ts).getTime();
    var sent = 0;
    readTable_('Submissions').forEach(function (s) {
      if (String(s.teamId) !== String(teamId) || String(s.taskId) !== String(taskId)) return;
      var ts = new Date(s.ts).getTime();
      if (!sent || ts < sent) sent = ts;
    });
    if (!sent) return false;
    var hit = false;
    readTable_('Digs').forEach(function (d) {
      if (String(d.teamId) !== String(teamId) || !String(d.result || '')) return;
      var o = new Date(d.openedAt).getTime(), c = new Date(d.closedAt).getTime();
      if (o >= t0 && c <= sent) hit = true;
    });
    return hit;
  }

  return false;
}

/** 宣告。送出之後就不能改了——不然那不是宣告，是事後填答。 */
function apiSetVow(token, taskId, vow) {
  try {
    var u = auth_(token);
    if (u.role !== 'student' || !u.teamId) return err_('只有學生可以宣告。');
    var k = String(vow || '');
    if (VOWS.indexOf(k) < 0 && k !== '') return err_('沒有這一種破法。');

    var row = readTable_('TeamTasks').filter(function (r) {
      return String(r.teamId) === String(u.teamId) && String(r.taskId) === String(taskId);
    })[0] || null;
    var st = row ? String(row.status) : 'todo';
    if (st === 'submitted') return err_('已經送出去了，宣告不能改。');
    if (st === 'passed') return err_('這一項已經過了。');

    upsert_('TeamTasks', ['teamId', 'taskId'], {
      teamId: u.teamId, taskId: taskId,
      status: st, checked: row ? row.checked : '[]',
      vow: k, updatedAt: new Date()
    });
    return ok_({ vow: k });
  } catch (e) { return err_(e); }
}

function apiSetCheck(token, taskId, idx, on) {
  try {
    var u = auth_(token);
    if (u.role !== 'student' || !u.teamId) return err_('只有學生可以勾。');
    var defs = tasksOfClass_(u.classId, u.teamId), def = null;
    for (var i = 0; i < defs.length; i++) if (String(defs[i].id) === String(taskId)) def = defs[i];
    if (!def) return err_('找不到這一項任務。');
    var list = def.checks || [];
    var n = Number(idx);
    if (!(n >= 0 && n < list.length)) return err_('沒有這一條。');

    var row = readTable_('TeamTasks').filter(function (r) {
      return String(r.teamId) === String(u.teamId) && String(r.taskId) === String(taskId);
    })[0] || null;
    if (row && String(row.status) === 'passed') return err_('這一項已經通過了，不用再改。');

    var cur = jparse_(row && row.checked, []) || [];
    var set = {};
    cur.forEach(function (x) { set[Number(x)] = true; });
    if (on) set[n] = true; else delete set[n];
    var next = Object.keys(set).map(Number).filter(function (x) { return x >= 0 && x < list.length; })
                     .sort(function (a, b) { return a - b; });

    upsert_('TeamTasks', ['teamId', 'taskId'], {
      teamId: u.teamId, taskId: taskId,
      status: (row && row.status) || 'todo',
      checked: JSON.stringify(next), updatedAt: new Date()
    });

    /* 事件才是事實來源。狀態是它算出來的，不是反過來。 */
    appendRow_('Checks', {
      ckId: 'ck' + Utilities.getUuid().slice(0, 8),
      teamId: u.teamId, taskId: taskId, idx: n,
      act: on ? 'on' : 'off', by: u.userId || u.account || '', ts: new Date()
    });

    return ok_({ checked: next, total: list.length, star: starOf_(u.teamId, taskId) });
  } catch (e) { return err_(e); }
}

/* ================= 試挖 =================
   學生自己開一條岔路去試一個方向。不經過老師、不影響過關。
   收尾記三種結果：成立、塌了、沒結論——塌掉的也留著，那是他們試過的證據。

   當天第一次收尾會挖到一片斗篷人的日誌。一天一片、不重複、共 24 片，
   剛好是一個學期的長度。刷不完也刷不快，而且進度只會往前。 */

var DIG_PAGES = 24;

/** 只比日期，不比時間；照腳本時區算，不然台北的今天會差一天。 */
function ymd_(d) {
  var tz = Session.getScriptTimeZone() || 'Asia/Taipei';
  return Utilities.formatDate(d, tz, 'yyyy-MM-dd');
}

/** 這一組已經挖到哪幾片 */
function digPages_(teamId) {
  var out = [];
  readTable_('Digs').forEach(function (d) {
    if (String(d.teamId) !== String(teamId)) return;
    var n = Number(d.page);
    if (n >= 1 && n <= DIG_PAGES && out.indexOf(n) < 0) out.push(n);
  });
  return out.sort(function (a, b) { return a - b; });
}

function digsOf_(teamId) {
  return readTable_('Digs')
    .filter(function (d) { return String(d.teamId) === String(teamId); })
    .map(function (d) {
      return { id: d.digId, layer: Number(d.layer) || 1, text: d.text || '',
               estDays: Number(d.estDays) || 0, bet: d.bet || '',
               result: d.result || '', page: Number(d.page) || 0,
               openedAt: d.openedAt ? String(d.openedAt) : '',
               closedAt: d.closedAt ? String(d.closedAt) : '' };
    });
}

/** 開一條。方向要寫、估幾天要給、押不押隨意。 */
/* ---- 坑屑 ----
   24 種，12 常見／8 少見／4 罕見。全部零分，稀有度只影響機率。
   罕見那四件都是人造物 —— 跟寶物同一條線，指向斗篷人。 */
var FINDS_N = 24;
var FIND_WEIGHT = [];   /* 展開成加權池，抽的時候直接取一個 */
(function () {
  var i;
  for (i = 1; i <= 12; i++) { var k; for (k = 0; k < 6; k++) FIND_WEIGHT.push(i); }   /* 常見 */
  for (i = 13; i <= 20; i++) { var k2; for (k2 = 0; k2 < 3; k2++) FIND_WEIGHT.push(i); } /* 少見 */
  for (i = 21; i <= 24; i++) FIND_WEIGHT.push(i);                                     /* 罕見 */
})();

function rollFind_() {
  return FIND_WEIGHT[Math.floor(Math.random() * FIND_WEIGHT.length)];
}

/** 這一組撿到的坑屑：編號 -> 幾件 */
function findsOf_(teamId) {
  var out = {};
  readTable_('Digs').forEach(function (d) {
    if (String(d.teamId) !== String(teamId)) return;
    var n = Number(d.find);
    if (n >= 1 && n <= FINDS_N) out[n] = (out[n] || 0) + 1;
  });
  return out;
}

function apiOpenDig(token, layer, text, estDays, bet) {
  try {
    var u = auth_(token);
    if (u.role !== 'student' || !u.teamId) return err_('只有學生可以開試挖。');
    var txt = String(text || '').trim();
    if (!txt) return err_('先寫一句你要試什麼方向。');
    if (txt.length > 120) txt = txt.slice(0, 120);
    var days = Math.max(1, Math.min(60, Math.round(Number(estDays) || 0)));
    if (!days) return err_('估一下這個方向要試幾天。');
    var b = ['yes', 'no', 'unsure'].indexOf(String(bet)) >= 0 ? String(bet) : 'unsure';

    var open = readTable_('Digs').filter(function (d) {
      return String(d.teamId) === String(u.teamId) && !String(d.result || '');
    });
    if (open.length >= 6) return err_('同時最多開六條。先收掉幾條再開。');

    var id = 'dg' + Utilities.getUuid().slice(0, 8);
    appendRow_('Digs', {
      digId: id, teamId: u.teamId, classId: u.classId,
      layer: Math.max(1, Math.min(5, Number(layer) || 1)),
      text: txt, estDays: days, bet: b, result: '', page: '',
      openedAt: new Date(), closedAt: ''
    });
    return ok_({ digId: id });
  } catch (e) { return err_(e); }
}

/** 收尾。當天第一次收尾就挖到一片還沒拿過的日誌。 */
function apiCloseDig(token, digId, result) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return err_('系統忙碌，請再試一次。'); }
  try {
    var u = auth_(token);
    if (u.role !== 'student' || !u.teamId) return err_('只有學生可以收試挖。');
    var res = ['ok', 'dead', 'none'].indexOf(String(result)) >= 0 ? String(result) : '';
    if (!res) return err_('先說這個方向的結果：成立、塌了，還是沒結論。');

    var rows = readTable_('Digs');
    var row = null;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].digId) === String(digId) && String(rows[i].teamId) === String(u.teamId)) row = rows[i];
    }
    if (!row) return err_('找不到這一條試挖。');
    if (String(row.result || '')) return err_('這一條已經收過了。');

    /* 今天收過了沒？一天一片，不然二十分鐘就刷完了 */
    var today = ymd_(new Date());
    var gotToday = rows.some(function (d) {
      return String(d.teamId) === String(u.teamId) && Number(d.page) > 0 &&
             d.closedAt && ymd_(new Date(d.closedAt)) === today;
    });

    var page = 0;
    if (!gotToday) {
      var have = digPages_(u.teamId), left = [];
      for (var n = 1; n <= DIG_PAGES; n++) if (have.indexOf(n) < 0) left.push(n);
      if (left.length) page = left[Math.floor(Math.random() * left.length)];
    }

    /* 坑屑每次都掉，不像日誌一天一片 —— 它是「動手當下的不確定」，
       所以必須每一次都有。零分，純收集。 */
    var find = rollFind_();
    upsert_('Digs', ['digId'], {
      digId: row.digId, teamId: row.teamId, classId: row.classId, layer: row.layer,
      text: row.text, estDays: row.estDays, bet: row.bet,
      result: res, page: page || '', find: find, openedAt: row.openedAt, closedAt: new Date()
    });
    return ok_({ result: res, page: page, pages: digPages_(u.teamId), total: DIG_PAGES,
                 find: find, finds: findsOf_(u.teamId) });
  } catch (e) { return err_(e); } finally { lock.releaseLock(); }
}

function apiSaveTask(token, classId, task) {
  try {
    assertTeacher_(token);
    var id = task.id || ('tk' + Utilities.getUuid().slice(0, 8));
    /* 一項一定要對到一塊礦石，不然這一層的「開了幾塊」跟「還沒開幾塊」會對不起來 */
    var min = String(task.mineral || '').trim();
    if (!min) {
      var mine = readTable_('Tasks').filter(function (x) { return String(x.taskId) === String(id); })[0];
      var free = freeMinerals_(classId, task.layer, cleanTeams_(classId, task.teams));
      if (mine && String(mine.mineral || '')) free = [String(mine.mineral)].concat(free);
      min = free.length ? free[0] : '';
    }
    upsert_('Tasks', ['taskId'], {
      taskId: id, classId: classId, layer: task.layer, type: task.type,
      title: task.title, cond: task.cond, note: task.note, spec: task.spec || '', due: task.due,
      mineral: min, mDesc: task.mDesc || '',
      teams: JSON.stringify(cleanTeams_(classId, task.teams)),
      checks: JSON.stringify(checkList_(task.checks)),
      published: 'Y', createdAt: new Date()
    });
    return ok_({ taskId: id });
  } catch (e) { return err_(e); }
}

function apiDeleteTask(token, taskId) {
  try {
    assertTeacher_(token);
    writeTable_('Tasks', readTable_('Tasks').filter(function (t) { return String(t.taskId) !== String(taskId); }));
    writeTable_('TeamTasks', readTable_('TeamTasks').filter(function (t) { return String(t.taskId) !== String(taskId); }));
    return ok_();
  } catch (e) { return err_(e); }
}

/** 一次發派一整層的清單。 */
/** 這一層還沒被別的任務佔走的礦物名稱。 */
/** 只留這一班真的存在的組別。空陣列＝全班。 */
function cleanTeams_(classId, list) {
  if (!list || !list.length) return [];
  var ok = {};
  readTable_('Teams').forEach(function (t) {
    if (String(t.classId) === String(classId)) ok[String(t.teamId)] = 1;
  });
  var out = [];
  list.forEach(function (x) {
    var id = String(x);
    if (ok[id] && out.indexOf(id) < 0) out.push(id);
  });
  /* 全班都選＝當成全班，不要存一份會過期的清單 */
  return out.length >= Object.keys(ok).length ? [] : out;
}

/** 這一班有哪些組。 */
function teamIdsOf_(classId) {
  return readTable_('Teams')
    .filter(function (t) { return String(t.classId) === String(classId); })
    .map(function (t) { return String(t.teamId); });
}

/**
 * 還沒被用掉的礦石。
 * 礦脈是「每一組各自要收集的四格」，不是全班共用一份——
 * 所以只給某幾組的任務，只佔用那幾組的格子，別組那一格還是空的。
 * forTeams 空＝這一項要發給全班。
 */
function freeMinerals_(classId, layer, forTeams) {
  var targets = (forTeams && forTeams.length) ? forTeams.map(String) : teamIdsOf_(classId);
  var used = {};
  tasksOfClass_(classId).forEach(function (d) {
    if (!d.mineral || d.layer !== Number(layer)) return;
    /* 只有跟這次的目標組別有交集的任務，才算佔走了格子 */
    var clash = !targets.length || targets.some(function (tid) { return taskForTeam_(d, tid); });
    if (clash) used[String(d.mineral)] = true;
  });
  return MINERALS_BY_LAYER[layer] ? MINERALS_BY_LAYER[layer].filter(function (n) { return !used[n]; }) : [];
}

/* 交付包裡每一層的礦物名稱（順序照 MINS） */
var MINERALS_BY_LAYER = {
  1: ['定名石', '裂晶', '初痕礦', '預兆砂'],
  2: ['聽紋晶', '篩光石', '徑錄礦', '顯影砂'],
  3: ['初型岩', '因由石', '反響礦', '二階水晶'],
  4: ['再凝岩', '前後水晶', '磨心礦', '厚能量石'],
  5: ['完成之光']
};

function apiPublishList(token, classId, layer, items) {
  try {
    assertTeacher_(token);
    (items || []).forEach(function (it) {
      /* 沒指定環節就自動配一塊還沒被用掉的礦——任務不該沒有物證 */
      var min = String(it.mineral || '').trim();
      if (!min) {
        var free = freeMinerals_(classId, layer, cleanTeams_(classId, it.teams));
        min = free.length ? free[0] : '';
      }
      upsert_('Tasks', ['taskId'], {
        taskId: it.id || ('tk' + Utilities.getUuid().slice(0, 8)), classId: classId,
        layer: layer, type: it.type, title: it.title, cond: it.cond, note: it.note,
        spec: it.spec || '', due: it.due, mineral: min, mDesc: it.mDesc || '', published: 'Y',
        teams: JSON.stringify(cleanTeams_(classId, it.teams)),
        checks: JSON.stringify(checkList_(it.checks)), createdAt: new Date()
      });
    });
    return ok_();
  } catch (e) { return err_(e); }
}

/** 逐項確認。合格考量（reason）學生會看到；沒寫也能送出。 */
function apiReviewItem(token, teamId, taskId, result, reason) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return err_('系統忙碌，請再試一次。'); }
  try {
    var u = assertTeacher_(token);
    var t = teamById_(teamId);
    if (!t) return err_('找不到這一組。');
    var kl = classById_(t.classId), courseWeek = courseWeekOf_(kl);
    var defs = tasksOfClass_(t.classId, t.teamId), def = null;
    for (var i = 0; i < defs.length; i++) if (String(defs[i].id) === String(taskId)) def = defs[i];

    var subs = readTable_('Submissions').filter(function (s) {
      return String(s.taskId) === String(taskId) && String(s.teamId) === String(teamId);
    });
    var lastSub = subs.length ? subs[subs.length - 1] : null;
    var latency = lastSub ? Math.max(0, Math.round((new Date() - new Date(lastSub.ts)) / 3600000)) : 0;
    var pass = (result === 'pass');
    var txt = String(reason || '');

    appendRow_('Reviews', {
      revId: 'rv' + Utilities.getUuid().slice(0, 8), subId: lastSub ? lastSub.subId : '',
      teamId: teamId, taskId: taskId, title: def ? def.title : '', layer: def ? def.layer : '',
      result: pass ? 'pass' : 'needfix', reason: txt, len: txt.length,
      hasReason: txt.trim() ? 'Y' : 'N', week: courseWeek, latency: latency, ts: new Date()
    });
    upsert_('TeamTasks', ['teamId', 'taskId'], {
      teamId: teamId, taskId: taskId,
      status: pass ? 'passed' : 'needs_more',
      fb: txt || (pass ? '（未附理由）' : ''), fbType: pass ? 'pass' : 'more',
      passedWeek: pass ? courseWeek : '', updatedAt: new Date()
    });
    return ok_();
  } catch (e) { return err_(e); } finally { lock.releaseLock(); }
}

/** 關卡審核：通過就發道具、定工具階級、換層。 */
function apiReviewGate(token, teamId, pass, toolLevel, reason) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return err_('系統忙碌，請再試一次。'); }
  try {
    assertTeacher_(token);
    var t = teamById_(teamId);
    if (!t) return err_('找不到這一組。');
    var kl = classById_(t.classId), courseWeek = courseWeekOf_(kl);
    var layer = Number(t.layer) || 1;
    var cells = jparse_(t.gateText, ['', '', '']);

    /* 通過關卡＝發道具換層。不再檢查收集——這一層做到什麼程度
       算「可以往下」，是老師自己看，不是系統算。 */

    appendRow_('Passes', {
      passId: 'p' + Utilities.getUuid().slice(0, 8), teamId: teamId, layer: layer, week: courseWeek,
      toolLevel: toolLevel || '', gateCell1: cells[0] || '', gateCell2: cells[1] || '', gateCell3: cells[2] || '',
      verdict: pass ? 'pass' : 'needfix', reason: String(reason || ''), ts: new Date()
    });

    if (!pass) {
      upsert_('Teams', ['teamId'], { teamId: teamId, gateSubmitted: 'N', gateVerdict: 'needfix' });
      return ok_({ passed: false });
    }

    var passedArr = jparse_(t.passed, []);
    if (passedArr.indexOf(layer) < 0) passedArr.push(layer);
    var levels = jparse_(t.toolLevels, {});
    levels[layer] = '已交出';   /* 只當作「這一層的道具已交給他們」的標記 */

    var nextLayer = Math.min(5, layer + 1);
    upsert_('Teams', ['teamId'], {
      teamId: teamId, layer: nextLayer, enteredWeek: courseWeek,
      passed: JSON.stringify(passedArr), toolLevels: JSON.stringify(levels),
      gateText: '["","",""]', gateSubmitted: 'N', gateVerdict: 'pass'
    });

    /* 第五層他不給清單：進到 L5 時自動放一項「由你決定要交什麼」 */
    if (nextLayer === 5) {
      var hasL5 = readTable_('Tasks').some(function (x) {
        return String(x.classId) === String(t.classId) && Number(x.layer) === 5;
      });
      if (!hasL5) {
        appendRow_('Tasks', {
          taskId: 'own5-' + t.classId, classId: t.classId, layer: 5, type: 'required',
          title: '由你決定要交什麼',
          cond: '這一層他沒有給清單。你自己寫下要交的東西，以及做到什麼程度算完成。',
          note: '寫完之後這一項就是你的驗收標準，老師只確認你有沒有做到自己說的。',
          due: '不設限', mineral: '完成之光', mDesc: '你自己命名的那一件。',
          published: 'Y', createdAt: new Date()
        });
      }
    }
    return ok_({ passed: true, layer: nextLayer, toolLevel: levels[layer] });
  } catch (e) { return err_(e); } finally { lock.releaseLock(); }
}

/** 老師手動覆寫目前週次（＋1 週／指定週次／回到自動）。 */
function apiSetWeek(token, classId, week) {
  try {
    assertTeacher_(token);
    upsert_('Classes', ['classId'], { classId: classId, weekOverride: (week === null || week === '') ? '' : week });
    var kl = classById_(classId);
    return ok_({ courseWeek: courseWeekOf_(kl), weekOverride: kl.weekOverride === '' ? null : Number(kl.weekOverride) });
  } catch (e) { return err_(e); }
}

function apiSetCourseStart(token, classId, dateStr) {
  try {
    assertTeacher_(token);
    upsert_('Classes', ['classId'], { classId: classId, courseStart: dateStr });
    return ok_({ courseWeek: courseWeekOf_(classById_(classId)) });
  } catch (e) { return err_(e); }
}

function apiSwitchClass(token, classId) {
  try {
    var u = assertTeacher_(token);
    upsert_('Users', ['userId'], { userId: u.userId, classId: classId });
    return apiBootstrap(token);
  } catch (e) { return err_(e); }
}

/* ================= 研究者端 ================= */

/**
 * 延遲揭露在這裡做：每四週解鎖一次，未解鎖區間的列根本不會送到前端。
 * 演練模式不呼叫這支（示範語料由前端合成）。
 */
/**
 * 老師自己的紀錄。T-09 讀的是學生走完之後寫的東西；這一支讀的是他自己：
 * 他寫了多少、學生等他多久、他退回的那些後來怎麼了。
 *
 * 「退回之後怎麼了」的算法：一筆 needfix 對到它審的那一次提交，
 * 找同一組同一項的下一次提交，看那一次的審核結果——
 *   下一次就過   → 這句話學生接住了
 *   又被退       → 還沒講到點上
 *   還沒重交     → 話還在路上
 */
function apiTeacherMirror(token) {
  try {
    var u = auth_(token);
    if (u.role !== 'teacher') return err_('只有老師看得到這一頁。');
    var classId = u.classId || '';

    var mine = {}, teamN = 0;
    readTable_('Teams').forEach(function (t) {
      if (String(t.classId) !== String(classId)) return;
      mine[String(t.teamId)] = t.name || '（未命名）';
      teamN++;
    });

    var subs = readTable_('Submissions').filter(function (s) { return mine[String(s.teamId)]; });
    /* result 是 auto 的是逾時自動暫准，不是他寫的，不算進來 */
    var revs = readTable_('Reviews').filter(function (r) {
      return mine[String(r.teamId)] && String(r.result) !== 'auto';
    });

    var subById = {}, subByTry = {}, maxTry = {};
    subs.forEach(function (s) {
      var k = String(s.teamId) + '|' + String(s.taskId);
      var a = Number(s.attempt) || 1;
      subById[String(s.subId)] = s;
      subByTry[k + '|' + a] = s;
      if (!maxTry[k] || a > maxTry[k]) maxTry[k] = a;
    });
    var revBySub = {};
    revs.forEach(function (r) { if (r.subId) revBySub[String(r.subId)] = r; });

    var blank = function () {
      return { n: 0, needfix: 0, len: 0, lat: 0, landed: 0, again: 0, waiting: 0 };
    };
    var byLayer = {}, all = blank(), cases = [];
    [1, 2, 3, 4, 5].forEach(function (n) { byLayer[n] = blank(); });

    revs.forEach(function (r) {
      var n = Number(r.layer) || 1;
      var b = byLayer[n] || (byLayer[n] = blank());
      var len = Number(r.len) || String(r.reason || '').trim().length;
      var lat = Number(r.latency) || 0;
      b.n++; b.len += len; b.lat += lat;
      all.n++; all.len += len; all.lat += lat;
      if (String(r.result) !== 'needfix') return;
      b.needfix++; all.needfix++;

      var s = subById[String(r.subId)];
      var next = s && subByTry[String(r.teamId) + '|' + String(r.taskId) + '|' + ((Number(s.attempt) || 1) + 1)];
      var nr = next && revBySub[String(next.subId)];
      if (!next || !nr) { b.waiting++; all.waiting++; return; }
      if (String(nr.result) === 'needfix') { b.again++; all.again++; return; }
      b.landed++; all.landed++;
      cases.push({
        team: mine[String(r.teamId)], title: r.title || '', layer: n,
        reason: String(r.reason || ''),
        before: Number(s.len) || 0, after: Number(next.len) || 0,
        week: Number(r.week) || 0
      });
    });

    /* 通過的項目平均來回幾次 */
    var passedN = 0, totalTry = 0;
    readTable_('TeamTasks').forEach(function (t) {
      if (!mine[String(t.teamId)] || String(t.status) !== 'passed') return;
      var m = maxTry[String(t.teamId) + '|' + String(t.taskId)];
      if (m) { passedN++; totalTry += m; }
    });

    var avg1 = function (sum, n) { return n ? Math.round(sum / n * 10) / 10 : 0; };
    var avgI = function (sum, n) { return n ? Math.round(sum / n) : 0; };

    cases.sort(function (a, b) { return (b.after - b.before) - (a.after - a.before); });

    return ok_({
      total: {
        n: all.n, needfix: all.needfix, pass: all.n - all.needfix,
        words: all.len, avgLen: avgI(all.len, all.n), avgLat: avgI(all.lat, all.n),
        avgRounds: avg1(totalTry, passedN), passedN: passedN, teams: teamN
      },
      landed: { n: all.landed, again: all.again, waiting: all.waiting },
      layers: [1, 2, 3, 4, 5].map(function (n) {
        var b = byLayer[n];
        return { layer: n, n: b.n, needfix: b.needfix, landed: b.landed, again: b.again,
                 waiting: b.waiting, avgLen: avgI(b.len, b.n), avgLat: avgI(b.lat, b.n) };
      }),
      cases: cases.slice(0, 3)
    });
  } catch (e) { return err_(e); }
}

function apiResearchSlice(token) {
  try {
    var u = auth_(token);
    if (u.role !== 'researcher') return err_('只有研究者可以讀這一份。');

    var classes = readTable_('Classes');
    var courseWeek = 1;
    classes.forEach(function (k) { courseWeek = Math.max(courseWeek, courseWeekOf_(k)); });
    /* 揭露節奏由研究者自己設。預設 1＝每週都看得到（研究要每週做）。
       設成 4 就是原設計的「每四週解鎖一次」。 */
    var every = Math.max(1, Math.floor(Number(cfg_('unlockEvery', 1)) || 1));
    var unlockedThrough = every <= 1 ? courseWeek : Math.floor(courseWeek / every) * every;
    var vis = function (w) { return Number(w) <= unlockedThrough; };

    /* 沙盒班級不進研究紀錄——研究者自己試流程用的，不能汙染收案資料 */
    var sandboxClass = {};
    classes.forEach(function (k) { if (String(k.sandbox) === 'Y') sandboxClass[String(k.classId)] = 1; });
    var skipTeam = {};
    readTable_('Teams').forEach(function (t) {
      if (sandboxClass[String(t.classId)]) skipTeam[String(t.teamId)] = 1;
    });
    var realTeam = function (id) { return !skipTeam[String(id)]; };

    var teamName = {}, teamLayer = {}, teamEntered = {};
    readTable_('Teams').forEach(function (t) {
      if (skipTeam[String(t.teamId)]) return;
      teamName[t.teamId] = t.name; teamLayer[t.teamId] = Number(t.layer) || 1;
      teamEntered[t.teamId] = Number(t.enteredWeek) || 1;
    });

    if (!unlockedThrough) {
      return ok_({ unlockedThrough: 0, nextUnlock: every, week: courseWeek, locked: true,
                   unlockEvery: every, subLog: [], revLog: [], readLog: [], teams: [] });
    }

    var subLog = readTable_('Submissions').filter(function (s) {
      return vis(s.week) && realTeam(s.teamId);
    }).map(function (s) {
      return { taskId: s.taskId, group: teamName[s.teamId] || s.teamId, title: '', layer: '',
               week: Number(s.week), dueWeek: Number(s.dueWeek) || 6, overdue: String(s.overdue) === 'Y',
               len: Number(s.len) || 0, files: Number(s.files) || 0, attempt: Number(s.attempt) || 1,
               effort: s.effort || '', effortNote: s.effortNote || '', blocker: s.blocker || '',
               text: s.text || '', hasBlocker: !!String(s.blocker || '').trim() };
    });
    /* 把每一次審核接回學生那一輪的提交：研究要看的是整個來回，不是單邊 */
    var allSubs = readTable_('Submissions');
    var seenRound = {};
    var revLog = readTable_('Reviews').filter(function (r) {
      return vis(r.week) && realTeam(r.teamId);
    }).map(function (r) {
      var key = r.teamId + '::' + r.taskId;
      var idx = seenRound[key] = (seenRound[key] || 0) + 1;
      var mine = allSubs.filter(function (s) {
        return String(s.teamId) === String(r.teamId) && String(s.taskId) === String(r.taskId);
      }).sort(function (a, b) { return (Number(a.attempt) || 0) - (Number(b.attempt) || 0); });
      var s = mine[idx - 1] || null;
      return { id: r.revId, reviewId: r.taskId, teacher: 'T1', group: teamName[r.teamId] || r.teamId,
               title: r.title, layer: Number(r.layer) || 1, result: r.result, reason: r.reason || '',
               len: Number(r.len) || 0, hasReason: String(r.hasReason) === 'Y',
               week: Number(r.week), latency: Number(r.latency) || 0,
               attempt: s ? (Number(s.attempt) || idx) : idx,
               subText: s ? (s.text || '') : '', subLen: s ? (Number(s.len) || 0) : 0,
               subFiles: s ? (Number(s.files) || 0) : 0,
               effort: s ? (s.effort || '') : '', effortNote: s ? (s.effortNote || '') : '',
               blocker: s ? (s.blocker || '') : '', subWeek: s ? Number(s.week) || 0 : 0 };
    });
    var readLog = readTable_('Reads').filter(function (r) {
      return vis(r.week) && realTeam(r.readerTeam) && realTeam(r.targetTeam);
    }).map(function (r) {
      return { reader: teamName[r.readerTeam] || r.readerTeam, target: teamName[r.targetTeam] || r.targetTeam,
               layer: Number(r.layer) || 1, week: Number(r.week), readerLayer: Number(r.readerLayer) || 1,
               readerStay: Number(r.readerStay) || 1, recentlyRejected: String(r.recentlyRejected) === 'Y' };
    });
    var teams = readTable_('Teams').filter(function (t) {
      return realTeam(t.teamId);
    }).map(function (t) {
      return { id: t.teamId, name: t.name, layer: Number(t.layer) || 1,
               weeks: Math.max(1, unlockedThrough - (Number(t.enteredWeek) || 1) + 1),
               passed: jparse_(t.passed, []) };
    });

    return ok_({
      unlockedThrough: unlockedThrough, nextUnlock: unlockedThrough + every, week: courseWeek,
      locked: false, unlockEvery: every, subLog: subLog, revLog: revLog, readLog: readLog, teams: teams,
      assigned: readTable_('Tasks').length,
      codes: codesOf_(u.coder || 'C1')
    });
  } catch (e) { return err_(e); }
}

function codesOf_(coder) {
  var m = {};
  readTable_('Codes').forEach(function (c) {
    if (String(c.coder) === String(coder)) m[String(c.revId)] = c.code;
  });
  return m;
}

function apiSaveCode(token, revId, code) {
  try {
    var u = auth_(token);
    if (u.role !== 'researcher') return err_('只有研究者可以編碼。');
    upsert_('Codes', ['revId', 'coder'], { revId: revId, coder: u.coder || 'C1', code: code, ts: new Date() });
    return ok_();
  } catch (e) { return err_(e); }
}

/**
 * 匯出。後端強制匿名：隊名換成 G1…Gn，永遠不輸出姓名、帳號、組員名單、隊名原文、附件檔名。
 * fullText＝是否連自由文本原文（學生的交付內容、關卡三格、期末回顧）一起帶出來。
 * 這是研究者自己的選擇，畫面上會標示選了哪一種。
 */
function apiExportCsv(token, kinds, fullText) {
  try {
    var slice = apiResearchSlice(token);
    if (!slice.ok) return slice;
    kinds = kinds || [];
    var FT = !!fullText;

    var alias = {}, seq = 0;
    var anon = function (g) { if (!g) return ''; if (!alias[g]) alias[g] = 'G' + (++seq); return alias[g]; };
    var body = function (s) { return FT ? String(s || '') : ''; };
    var esc = function (v) {
      var s = (v === undefined || v === null) ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    var block = function (title, head, rows) {
      return '# ' + title + '\n' + head.join(',') + '\n' +
        rows.map(function (r) { return head.map(function (k) { return esc(r[k]); }).join(','); }).join('\n') + '\n\n';
    };

    var out = '# 逐層掘進 · 事件記錄匯出\n';
    out += '# 已強制匿名：隊名以 G1…Gn 取代。永遠移除：學生姓名、帳號、組員名單、隊名原文、附件檔名、教師身分（一律記為 T1）\n';
    out += FT
      ? '# 自由文本：本次含原文（學生的交付內容、關卡三格、期末回顧）。內文可能出現人名，請依知情同意書處理。\n'
      : '# 自由文本：本次不含原文，只輸出字數與結構欄位。老師的合格考量一律輸出（那是研究對象本身）。\n';
    out += '# 延遲揭露：僅含第 1–' + slice.unlockedThrough + ' 週\n\n';

    if (kinds.indexOf('review') >= 0) {
      out += block('審核事件 reviews', ['revId', 'group', 'layer', 'week', 'result', 'hasReason', 'reasonLen', 'reasonText', 'latencyHours'],
        slice.revLog.map(function (r) {
          return { revId: r.id, group: anon(r.group), layer: r.layer, week: r.week, result: r.result,
                   hasReason: r.hasReason ? 1 : 0, reasonLen: r.len, reasonText: r.reason, latencyHours: r.latency };
        }));
    }
    if (kinds.indexOf('submit') >= 0) {
      out += block('提交事件 submissions',
        ['taskId', 'group', 'week', 'dueWeek', 'overdue', 'textLen', 'files', 'attempt',
         'selfEffort', 'selfEffortNote', 'hasBlocker', 'blockerText', 'submissionText'],
        slice.subLog.map(function (x) {
          return { taskId: x.taskId, group: anon(x.group), week: x.week, dueWeek: x.dueWeek,
                   overdue: x.overdue ? 1 : 0, textLen: x.len, files: x.files, attempt: x.attempt,
                   selfEffort: x.effort, selfEffortNote: x.effortNote,
                   hasBlocker: x.hasBlocker ? 1 : 0, blockerText: x.blocker,
                   submissionText: body(x.text) };
        }));
    }

    /* 老師開的任務內容：他寫給全班的那些字 */
    if (kinds.indexOf('tasks') >= 0) {
      out += block('任務內容 tasks（老師寫的）',
        ['taskId', 'layer', 'type', 'title', 'cond', 'note', 'spec', 'due', 'mineral'],
        readTable_('Tasks').map(function (t) {
          return { taskId: t.taskId, layer: t.layer, type: t.type, title: t.title,
                   cond: t.cond, note: t.note, spec: t.spec, due: t.due, mineral: t.mineral };
        }));
    }

    /* 關卡三格：學生一層寫一次的反思，加上老師的審核理由 */
    if (kinds.indexOf('gate') >= 0) {
      var vis2 = function (w) { return Number(w) <= slice.unlockedThrough; };
      var tn = {};
      readTable_('Teams').forEach(function (t) { tn[t.teamId] = t.name; });
      out += block('關卡送審與審核 gates',
        ['group', 'layer', 'week', 'verdict', 'teacherReason',
         'q1_做了什麼', 'q2_有什麼變化', 'q3_接下來要做什麼'],
        readTable_('Passes').filter(function (p) { return vis2(p.week); }).map(function (p) {
          return { group: anon(tn[p.teamId] || p.teamId), layer: p.layer, week: p.week,
                   verdict: p.verdict, teacherReason: p.reason,
                   'q1_做了什麼': body(p.gateCell1), 'q2_有什麼變化': body(p.gateCell2),
                   'q3_接下來要做什麼': body(p.gateCell3) };
        }));
    }

    /* 期末回顧：整學期的最後檢討 */
    if (kinds.indexOf('finale') >= 0) {
      var tn2 = {};
      readTable_('Teams').forEach(function (t) { tn2[t.teamId] = t.name; });
      out += block('期末回顧 finales',
        ['group', 'opened_by_teacher', 'teacher_words', 'submitted', 'lightName',
         'q1_最大的誤判', 'q2_會改變哪一層', 'q3_怎麼估時間'],
        readTable_('Finales').map(function (f) {
          return { group: anon(tn2[f.teamId] || f.teamId),
                   opened_by_teacher: String(f.opened) === 'Y' ? 1 : 0, teacher_words: f.openWords || '',
                   submitted: String(f.submitted) === 'Y' ? 1 : 0,
                   lightName: body(f.lightName), 'q1_最大的誤判': body(f.q1),
                   'q2_會改變哪一層': body(f.q2), 'q3_怎麼估時間': body(f.q3) };
        }));
    }
    if (kinds.indexOf('read') >= 0) {
      out += block('他組紀錄閱讀 reads', ['reader', 'target', 'layer', 'week', 'readerLayer', 'readerStay', 'recentlyRejected'],
        slice.readLog.map(function (r) {
          return { reader: anon(r.reader), target: anon(r.target), layer: r.layer, week: r.week,
                   readerLayer: r.readerLayer, readerStay: r.readerStay, recentlyRejected: r.recentlyRejected ? 1 : 0 };
        }));
    }
    if (kinds.indexOf('stay') >= 0) {
      out += block('停留狀態 stay', ['group', 'layer', 'stayWeeks', 'passedLayers'],
        slice.teams.map(function (t) {
          return { group: anon(t.name), layer: t.layer, stayWeeks: t.weeks, passedLayers: (t.passed || []).length };
        }));
    }
    return ok_({ csv: out });
  } catch (e) { return err_(e); }
}

function apiExportToDrive(token, kinds, fullText) {
  try {
    var r = apiExportCsv(token, kinds, fullText);
    if (!r.ok) return r;
    var name = '逐層掘進_事件記錄_' +
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '.csv';
    var file = DriveApp.createFile(name, '﻿' + r.csv, MimeType.CSV);
    return ok_({ name: name, url: file.getUrl() });
  } catch (e) { return err_(e); }
}

/* ================= 安裝 ================= */

/** 第一次部署前在編輯器裡執行一次：建立全部工作表與繳交檔案的資料夾。 */
function setup() {
  Object.keys(SHEET_DEFS).forEach(function (n) {
    var sh = sheet_(n), head = SHEET_DEFS[n];
    /* 舊版升級：欄位有變動時把表頭補齊 */
    var cur = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
    if (cur.join('') !== head.join('')) {
      sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    }
  });
  var s = ss_();
  var d = s.getSheetByName('工作表1') || s.getSheetByName('Sheet1');
  if (d && s.getSheets().length > 1) s.deleteSheet(d);
  if (!cfg_('courseStart', '')) setCfg_('courseStart', '2026-09-14');
  if (!cfg_('appName', '')) setCfg_('appName', APP_TITLE);
  return { sheet: s.getUrl(), folder: rootFolder_().getUrl() };
}

/** 清空全部課堂資料（保留帳號）。 */
/** 輪詢用：資料有沒有動過。比整包 bootstrap 便宜非常多。 */
function apiPing(token) {
  try {
    auth_(token);
    var c = cache_();
    if (!c) return ok_({ rev: String(Date.now()) });   /* 沒快取就永遠當作有變 */
    var r = c.get('rev');
    if (!r) { r = String(Date.now()) + ':' + Math.random(); try { c.put('rev', r, 21600); } catch (e) {} }
    return ok_({ rev: r });
  } catch (e) { return err_(e); }
}

function resetClassData() {
  ['Tasks', 'TeamTasks', 'Submissions', 'Reviews', 'Plans', 'Passes', 'Reads', 'Codes']
    .forEach(function (n) { writeTable_(n, []); });
  resetTableCache_();
  return { ok: true };
}
