/* 瀏覽器的上一頁 ＋ 填到一半的草稿（2026-10-05）

   起因：使用者問「有填到一半想回上一頁改的狀況嗎」。讀程式發現兩個缺口：

     一 · 這個系統是單頁的，換頁只是換 innerHTML，從來沒有碰瀏覽器的歷史紀錄。
         所以手機的返回、滑回、瀏覽器的上一頁，按下去是「離開網站」，
         不是「回到系統裡的上一頁」。
     二 · 填到一半的東西只放在記憶體（DRAFT），換頁、重新整理、手機切去別的
         App 再回來被系統回收、新版部署蓋頁後重開，全部清掉。交作業第一題
         「老師要去哪裡看？」就要學生去 Notion 複製連結，最容易碰到。

   這一支只處理「去哪一頁」與「填到一半的字」，不碰判定、不碰任何會算數的
   資料，也不碰雲端：草稿只存在這一台的 localStorage，不上雲、不進匯出。 */

/* ---------- 一 · 瀏覽器的上一頁 ----------

   做法：每次換到一個「值得回來的頁」就在歷史紀錄裡記一格；按返回的時候接住，
   把畫面換回那一頁。

   · 記在 history.state 裡的是 { page, p, who, n }：n 是這一格在這個分頁裡的
     序號，讓接住返回的時候知道自己走到哪一格。
   · 登入、登出只「取代」目前那一格，不新增：登入後按返回不會看到登入頁，
     登出後按返回也看不到上一個人的頁（render 本來就依 S.who 畫）。
   · 兩步驟流程裡面的返回就是「上一步」：交作業的第 2 題起、承諾的第 2 步起。
     接住之後再補一格，所以一路按返回是一題一題退，不是整個流程直接跳出去。
   · 回到一個已經失效的格（例如已經交出去的交作業頁）：跳過它，再往回一格，
     不會重演交件的畫面。
   · 第一格（首頁）按返回還是離開網站——這是瀏覽器本來的行為，不把人困在裡面。 */
var NAV = { on: 0, n: 0, who: '', page: null, pj: '', pop: 0, hold: 0 };

/* 值得記一格的頁。判定（stamp）、委託人（ask）、一次性的救援碼（rgcode）這種
   「過場」不記：返回直接跳過它們。門口那幾頁也不記：還沒登入的人沒有「上一頁」
   的需求，維持原狀。 */
var NAV_KEEP = {
  home: 1, pack: 1, eco: 1, codex: 1, story: 1, who: 1, me: 1, pw: 1, sign: 1,
  crew: 1, patron: 1, person: 1, battle: 1, commit: 1, exit: 1,
  radar: 1, review: 1, askest: 1, ms: 1, mslist: 1, msdetail: 1, runview: 1,
  classeco: 1, tclose: 1, acctrecov: 1, acctmerge: 1,
  rs: 1, events: 1, rsacc: 1, rspw: 1
};

function navOk() {
  return typeof history !== 'undefined' && history && typeof history.pushState === 'function' &&
    typeof window !== 'undefined' && typeof window.addEventListener === 'function';
}
function navPJ() { try { return JSON.stringify(S.p || {}); } catch (e) { return '{}'; } }
function navState(n) {
  var p;
  try { p = JSON.parse(JSON.stringify(S.p || {})); } catch (e) { p = {}; }
  return { page: S.page, p: p, who: S.who || '', n: n };
}

/* 這一格現在還回得去嗎。回不去就換成首頁。 */
function navRestorable(u, pg, p) {
  if (!NAV_KEEP[pg] || !PAGES[pg] || !allowed(u, pg)) return false;
  p = p || {};
  if (pg === 'battle') {
    var r = find('Runs', function (x) { return x.runId === p.id; });
    return !!(r && r.teamId === u.teamId && (r.state === 'running' || r.state === 'back'));
  }
  if (pg === 'commit') {
    var m = msOf(p.id);
    return !!(m && !m.withdrawnAt && !m.notice && !runOf(u.teamId, p.id));
  }
  return true;
}

/* 兩步驟流程裡面的返回：退一步，不離開這一頁。 */
function navInner() {
  if (S.page === 'battle' && S.p && S.p.ph === 'q' && (Number(S.p.q) || 0) > 0 && typeof ACTS.btprev === 'function') {
    ACTS.btprev(S.p.id);
    return true;
  }
  if (S.page === 'commit' && S.p && (Number(S.p.st) || 0) > 0 && typeof ACTS.cmstep === 'function') {
    ACTS.cmstep((Number(S.p.st) || 0) - 1);
    return true;
  }
  return false;
}

/* 每次畫完對一次：該記一格就記，該取代就取代。 */
function navSync() {
  if (!NAV.on || NAV.hold || !navOk()) return;
  var who = S.who || '', pj = navPJ();
  try {
    if (who !== NAV.who) {
      /* 登入或登出：取代，不新增。 */
      history.replaceState(navState(NAV.n), '');
    } else if (S.page !== NAV.page) {
      if (NAV.pop) history.replaceState(navState(NAV.n), '');
      else if (NAV_KEEP[S.page]) { NAV.n++; history.pushState(navState(NAV.n), ''); }
    } else if (pj !== NAV.pj && NAV_KEEP[S.page]) {
      /* 同一頁換了參數（例如交作業換了一題）：更新這一格，不新增。 */
      history.replaceState(navState(NAV.n), '');
    }
  } catch (e) {}
  NAV.who = who; NAV.page = S.page; NAV.pj = pj;
}

function navPop(ev) {
  if (!NAV.on) return;
  var st = ev && ev.state;
  var u = me();
  if (!u) {
    /* 沒登入：畫門口。上一個人的頁不會因為按返回回來。 */
    if (st && typeof st.n === 'number') NAV.n = st.n;
    render();
    return;
  }
  /* 不是這個人的紀錄（登入之前、或換過帳號的格）：不動。 */
  if (!st || typeof st.n !== 'number' || st.who !== (S.who || '')) return;

  /* 退一步的時候先暫停 navSync：不然畫面重畫那一下會把「上一格」（瀏覽器已經走回去的那一格）
     改寫成現在這一頁，歷史就壞了。 */
  var did = false;
  NAV.hold = 1;
  try { did = navInner(); } finally { NAV.hold = 0; }
  if (did) {
    /* 退了一步。瀏覽器已經往回走了一格，補一格回來，這樣下一次返回還是退一步。 */
    NAV.n = st.n + 1;
    try { history.pushState(navState(NAV.n), ''); } catch (e) {}
    NAV.who = S.who || ''; NAV.page = S.page; NAV.pj = navPJ();
    return;
  }

  NAV.n = st.n;
  var pg = st.page, p = st.p || {};
  var can = navRestorable(u, pg, p);
  var same = pg === S.page && JSON.stringify(p) === navPJ();
  if (!can || same) {
    /* 失效的格、或跟現在畫面一樣的格：跳過，再往回一格。
       已經是第一格了就停在那裡（失效的換成首頁）；一樣的離開網站，跟首頁按返回同一個行為。 */
    if (st.n > 0) { history.back(); return; }
    if (same) { history.back(); return; }
    pg = homeFor(u); p = {};
  }
  NAV.pop = 1;
  try { go(pg, p); } finally { NAV.pop = 0; }
}

function navStart() {
  if (!navOk() || NAV.on) return;
  var cur = null;
  try { cur = history.state; } catch (e) {}
  NAV.n = (cur && typeof cur.n === 'number') ? cur.n : 0;
  NAV.on = 1; NAV.who = S.who || ''; NAV.page = S.page; NAV.pj = navPJ();
  try { history.replaceState(navState(NAV.n), ''); } catch (e) {}
  window.addEventListener('popstate', navPop);
}

/* ---------- 二 · 填到一半的草稿 ----------

   只存這幾種頁、這幾個欄位（見 DRAFT_PAGES）：交作業、承諾、老師派任務、
   老師回一句建議、老師審核。**門口那幾頁一律不存**——那裡有密碼。

   存的時機：打字（隔一下才存）、換頁之前、分頁被藏起來或關掉（手機切去別的
   App 就是這一種）。還原的時機：再走進同一頁、或重新打開網頁的時候（交作業與
   承諾，且要有寫了東西、不超過十二小時）。

   會失效：交作業要那一趟還在進行或被退回、承諾要還沒承諾過、審核要還在等、
   回一句要還沒回過。交出去、派出去之後草稿一律被清掉（那幾個成功的動作本來
   就會把 DRAFT 清空，空的草稿存的時候會刪掉那一格）。 */
var DRAFT_STORE = 'dungeon.drafts';
var DRAFT_LIFE = 24 * 3600 * 1000;
var DRAFT_RESUME = 12 * 3600 * 1000;
var DRAFT_PAGES = {
  battle: ['said1', 'spent', 'where', 'why', 'feel', 'scope', 'hard', 'pace', 'overs', 'said'],
  commit: ['plan', 'est', 'estU', 'estN', 'sure', 'flags', 'overs'],
  ms: ['msTitle', 'msNote', 'steps', 'to', 'dueU', 'dueN'],
  askest: ['askw', 'est'],
  review: ['gr-word', 'bonus']
};

function draftClone(x) { try { return JSON.parse(JSON.stringify(x)); } catch (e) { return null; } }
function draftKey(page, p) {
  if (!DRAFT_PAGES[page]) return null;
  if (page === 'ms') return 'ms';
  return p && p.id ? page + ':' + p.id : null;
}
function draftAll() {
  var o = null;
  try { o = JSON.parse(localStorage.getItem(DRAFT_STORE) || 'null'); } catch (e) {}
  if (!o || typeof o !== 'object' || !o.u) o = { u: {} };
  return o;
}
function draftWriteAll(o) {
  try { localStorage.setItem(DRAFT_STORE, JSON.stringify(o)); } catch (e) {}
}
function draftNonEmpty(v) {
  if (v == null) return false;
  if (typeof v === 'string') return !!v.trim();
  if (Array.isArray(v)) return v.length > 0;
  return !!v;
}
/* 這一頁的 DRAFT 裡有沒有「他自己寫的東西」。預設值不算——不然每一次路過都存一份。 */
function draftHas(page, p, d) {
  if (page === 'battle') {
    return draftNonEmpty(d.said1) || draftNonEmpty(d.where) || draftNonEmpty(d.why) || draftNonEmpty(d.hard) ||
      draftNonEmpty(d.pace) || draftNonEmpty(d.feel) || draftNonEmpty(d.scope) || draftNonEmpty(d.overs) ||
      (Array.isArray(d.spent) && d.spent.some(function (x) { return Number(x) > 0; }));
  }
  if (page === 'commit') {
    if (d.est != null || d.estN != null || draftNonEmpty(d.sure) || draftNonEmpty(d.flags)) return true;
    var m = msOf(p && p.id);
    var def = m ? previewSteps(m).map(function (x) { return { n: x, d: 1, who: S.who }; }) : [];
    return !!(d.plan && JSON.stringify(d.plan) !== JSON.stringify(def));
  }
  if (page === 'ms') return draftNonEmpty(d.msTitle) || draftNonEmpty(d.msNote) || draftNonEmpty(d.steps);
  if (page === 'askest') return draftNonEmpty(d.askw);
  if (page === 'review') return draftNonEmpty(d['gr-word']);
  return false;
}
function draftPick(page) {
  var d = {};
  DRAFT_PAGES[page].forEach(function (k) { if (DRAFT[k] !== undefined) d[k] = DRAFT[k]; });
  return draftClone(d) || {};
}
function draftValid(page, p, rec) {
  if (!rec || !rec.at || Date.now() - rec.at > DRAFT_LIFE) return false;
  var u = me();
  if (!u) return false;
  p = p || {};
  if (page === 'battle') {
    var r = find('Runs', function (x) { return x.runId === p.id; });
    return !!(r && r.teamId === u.teamId && (r.state === 'running' || r.state === 'back'));
  }
  if (page === 'commit') {
    var m = msOf(p.id);
    return !!(m && !m.withdrawnAt && !m.notice && !runOf(u.teamId, p.id));
  }
  if (page === 'askest') {
    var a = find('Runs', function (x) { return x.runId === p.id; });
    return !!(a && a.askEst == null && a.state === 'running');
  }
  if (page === 'review') {
    var v = find('Runs', function (x) { return x.runId === p.id; });
    return !!(v && v.state === 'submitted');
  }
  return true;
}
function draftSave() {
  if (!S.who) return;
  var k = draftKey(S.page, S.p);
  if (!k) return;
  var all = draftAll(), mine = all.u[S.who] || (all.u[S.who] = {});
  var d = draftPick(S.page);
  if (!draftHas(S.page, S.p, d)) {
    if (mine[k]) { delete mine[k]; draftWriteAll(all); }
    return;
  }
  mine[k] = { at: Date.now(), page: S.page, p: draftClone(S.p || {}) || {}, d: d };
  /* 舊的清掉，最多留十二份。 */
  var keys = Object.keys(mine).sort(function (a, b) { return mine[b].at - mine[a].at; });
  keys.forEach(function (x, i) { if (i >= 12 || Date.now() - mine[x].at > DRAFT_LIFE) delete mine[x]; });
  draftWriteAll(all);
}
/* 走進一頁（go 在畫之前叫）：有存著而且還有效的，帶回來。 */
function draftEnter() {
  if (!S.who) return;
  var k = draftKey(S.page, S.p);
  if (!k) return;
  var all = draftAll(), mine = all.u[S.who] || {};
  var rec = mine[k];
  if (!rec) return;
  if (!draftValid(S.page, S.p, rec)) { delete mine[k]; draftWriteAll(all); return; }
  var d = draftClone(rec.d) || {};
  Object.keys(d).forEach(function (x) { DRAFT[x] = d[x]; });
}
/* 重新打開網頁：交作業或承諾寫到一半的，回到那一頁。 */
function draftResume(u) {
  if (!u || u.role !== 'student') return;
  var mine = draftAll().u[u.userId] || {};
  var best = null;
  Object.keys(mine).forEach(function (k) {
    var r = mine[k];
    if ((r.page !== 'battle' && r.page !== 'commit') || Date.now() - r.at > DRAFT_RESUME) return;
    if (!draftValid(r.page, r.p, r)) return;
    if (!best || r.at > best.at) best = r;
  });
  if (!best) return;
  S.page = best.page;
  S.p = best.page === 'battle' ? { id: best.p.id, ph: 'q', q: Number(best.p.q) || 0 } : { id: best.p.id, st: Number(best.p.st) || 0 };
  DRAFT = draftClone(best.d) || {};
}

var _draftTimer = null;
function draftSoon() {
  if (typeof setTimeout !== 'function') return;
  if (_draftTimer) return;
  _draftTimer = setTimeout(function () { _draftTimer = null; draftSave(); }, 500);
}
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('input', draftSoon);
  document.addEventListener('change', draftSoon);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') draftSave();
  });
}
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('pagehide', draftSave);
}

/* 畫完順手對一次歷史紀錄（跟 60-student.js 的 taskNoticeTick 同一個接法）。 */
var _renderBeforeNav = render;
render = function () { _renderBeforeNav(); navSync(); };
