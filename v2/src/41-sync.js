/* 跨機器：同一個班在三台電腦上是同一份資料。

   本來整份資料只在 localStorage 裡，所以「班級加入碼」只在同一台
   瀏覽器裡有效——三位老師各自開自己的電腦，誰也進不了誰的班。
   那不是體驗問題，那是這套東西根本進不了教室。

   ── 為什麼是一筆一筆推，不是整包覆寫 ──

   整包覆寫在一個人用的時候沒問題，兩個人同時用就會掉東西：老師按
   「收下」的同一秒學生按「承諾」，後寫的那一包把先寫的那一包蓋掉，
   而且畫面上完全看不出來。所以每次 save() 都跟「上次同步過的樣子」
   比對，只把變過的那幾筆寫上去。兩個人改的是不同紀錄，就永遠不會
   互相蓋掉；改的是同一筆，才輪到後寫的贏——那本來就是對的。

   ── 每一筆存成一個字串 ──

   雲端那一邊存的是 { j: JSON字串 }，不是攤開的欄位。這樣資料庫完全
   不用管我們的欄位長什麼樣（undefined、巢狀陣列那些限制全部繞開），
   而我們本來也沒有要在雲端查詢——所有的 where/find 都是在瀏覽器裡
   對著 DB 這個陣列做的。

   ── 示範資料不上去 ──

   種子那一批帶著 _d 記號（見 45-seed.js），永遠留在這台機器上。
   不然第一個打開網頁的人會把示範班推上去給所有人看。
   反過來也成立：雲端有真的班了，這台機器的示範班還是在，兩邊並存。

   ── 紀錄只上不下 ──

   Events 一學期會長到幾千筆，而每一台機器連上來都要把整張表讀一遍
   （Firestore 是按讀取的筆數算的）。它只有研究者那一頁在讀，所以
   推上去、不訂閱，要匯出的時候再拉一次（syncPullEvents）。

   ── 沒有接上的時候 ──

   node 裡跑 check/loop/pages、或是用 file:// 點開 index.html 的時候
   都沒有 firebase 這個東西。那時候這一整層安靜地什麼都不做，
   localStorage 還是照舊——單機那條路一步都沒有變。 */

var SYNC = { on: 0, db: null, last: null, first: {}, hold: 0, err: '' };

/* 每一張表的主鍵。

   Session 不在裡面：那是這台機器登入了誰，不是這個班的事。
   Config 也不在：seq 是這台機器的號碼牌，demo／seedV 是這台機器
   手上那份示範資料的版本，三個都不該跟別人共用。 */
var SYNC_KEY = {
  Users: 'userId', Classes: 'classId', Teams: 'teamId',
  Milestones: 'msId', Runs: 'runId', Pushes: 'pushId',
  Keeps: 'keepId', Events: 'evId'
};
/* 推上去但不訂閱的那幾張（見檔頭）。 */
var SYNC_UP_ONLY = { Events: 1 };

/* 全部掛在同一個文件底下，之後要換版本的時候換這一段就好。 */
var SYNC_ROOT = 'world/v1/';

function syncReady() {
  if (SYNC.db) return 1;
  if (typeof firebase === 'undefined') return 0;
  if (!firebase.apps || !firebase.apps.length) return 0;
  try { SYNC.db = firebase.firestore(); } catch (e) { return 0; }
  return 1;
}

function syncTrouble(e) {
  SYNC.err = (e && e.message) || String(e);
  if (typeof console !== 'undefined' && console.warn) console.warn('同步：' + SYNC.err);
}

/* 現在手上這一份，攤平成「路徑 → JSON 字串」。示範資料不算。 */
function syncFlat() {
  var out = {};
  Object.keys(SYNC_KEY).forEach(function (col) {
    var idf = SYNC_KEY[col];
    (DB[col] || []).forEach(function (r) {
      if (!r || r._d || !r[idf]) return;
      out[col + '/' + r[idf]] = JSON.stringify(r);
    });
  });
  return out;
}

/* 把變過的那幾筆寫上去。save() 每一次都會叫它一次。 */
function syncPush() {
  if (SYNC.hold || !SYNC.last || !syncReady()) return;
  var now = syncFlat(), jobs = [];
  Object.keys(now).forEach(function (p) {
    if (SYNC.last[p] !== now[p]) jobs.push([p, now[p]]);
  });
  Object.keys(SYNC.last).forEach(function (p) {
    if (!(p in now)) jobs.push([p, null]);
  });
  if (!jobs.length) return;
  SYNC.last = now;
  /* 一批最多 500 筆是 Firestore 的上限，第一次連上去會超過。 */
  for (var i = 0; i < jobs.length; i += 400) syncBatch(jobs.slice(i, i + 400));
}

function syncBatch(chunk) {
  var b = SYNC.db.batch();
  chunk.forEach(function (j) {
    var ref = SYNC.db.doc(SYNC_ROOT + j[0]);
    if (j[1] === null) b.delete(ref); else b.set(ref, { j: j[1] });
  });
  b.commit().catch(function (e) {
    /* 沒寫成功就當作沒同步過，下一次 save 會再試一次。 */
    chunk.forEach(function (j) { delete SYNC.last[j[0]]; });
    syncTrouble(e);
  });
}

/* 別人動了：把那一張表併進來。

   併，不是換掉：本機原本的順序留著（陣列順序在幾個地方是有意義的，
   例如「正在走的那一趟」是 filter 之後取第一個），別人新增的接在
   後面，等於就是這台機器看到的先後。 */
function syncTake(col, inc) {
  var idf = SYNC_KEY[col], arr = DB[col] || (DB[col] = []);
  var seen = {}, hit = 0, firstTime = !SYNC.first[col], pre = col + '/';
  SYNC.first[col] = 1;
  for (var i = arr.length - 1; i >= 0; i--) {
    var r = arr[i], id = r && r[idf];
    if (!r || r._d) continue;                /* 示範資料只在這台機器上 */
    if (inc[id]) {
      seen[id] = 1;
      if (JSON.stringify(r) !== JSON.stringify(inc[id])) { arr[i] = inc[id]; hit = 1; }
    } else if (!firstTime && SYNC.last[pre + id] !== undefined) {
      /* 只刪「我知道雲端本來有」的那幾筆。本機有、雲端沒有、而且
         從來沒推上去過的，是還沒同步的東西，不是別人刪掉的——
         第一次連上去的時候整張表都是這種。 */
      arr.splice(i, 1); hit = 1;
    }
  }
  Object.keys(inc).forEach(function (id) {
    if (!seen[id]) { arr.push(inc[id]); hit = 1; }
  });
  /* 這一張表現在跟雲端一致了。別張不動——它們可能還有沒推上去的。 */
  Object.keys(SYNC.last).forEach(function (p) {
    if (p.indexOf(pre) === 0) delete SYNC.last[p];
  });
  Object.keys(inc).forEach(function (id) {
    SYNC.last[pre + id] = JSON.stringify(inc[id]);
  });
  if (!hit) return;
  SYNC.hold = 1;
  try { localStorage.setItem(STORE, JSON.stringify(DB)); } catch (e) {}
  SYNC.hold = 0;
  syncDraw();
}

/* 別人動了，畫面跟著動。

   他正在打字的時候不畫：render 是整片換掉 innerHTML，會把打到一半
   的字吃掉。下一個動作本來就會 render，那時候自然補上。 */
function syncDraw() {
  if (typeof document === 'undefined') return;
  var a = document.activeElement;
  if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return;
  if (typeof render === 'function' && typeof S !== 'undefined' && S.page) render();
}

/* 開機的時候接上去。 */
function syncStart() {
  if (!syncReady()) return;
  /* 教室的網路會斷。開著快取，斷線的時候寫得下去、回來自己補送，
     多開幾個分頁也不會打架。開不起來就算了，線上還是能用。 */
  try { SYNC.db.enablePersistence({ synchronizeTabs: true }); } catch (e) {}
  SYNC.on = 1;
  SYNC.last = {};
  Object.keys(SYNC_KEY).forEach(function (col) {
    if (SYNC_UP_ONLY[col]) { SYNC.first[col] = 1; return; }
    SYNC.db.collection(SYNC_ROOT + col).onSnapshot(function (snap) {
      var inc = {};
      snap.forEach(function (d) {
        var v = d.data();
        try { inc[d.id] = JSON.parse(v.j); } catch (e) {}
      });
      syncTake(col, inc);
      /* 收完再推一次：第一批快照回來之後，本機有而雲端沒有的
         那幾筆就是這一下推上去的。 */
      syncPush();
    }, syncTrouble);
  });
}

/* 全班的紀錄拉一次。

   Events 平常不訂閱（見檔頭）。研究者要匯出的時候才需要整張表——
   那一頁按一下才拉，一學期拉幾次，不是每個人每次開網頁都拉一遍。 */
function syncPullEvents(done) {
  if (!syncReady()) { if (done) done(0); return; }
  SYNC.db.collection(SYNC_ROOT + 'Events').get().then(function (snap) {
    var have = {};
    DB.Events.forEach(function (e) { have[e.evId] = 1; });
    var n = 0;
    snap.forEach(function (d) {
      SYNC.last['Events/' + d.id] = d.data().j;
      if (have[d.id]) return;
      try { DB.Events.push(JSON.parse(d.data().j)); n++; } catch (e) {}
    });
    if (n) {
      /* 紀錄那一頁是照時間倒著看的，所以陣列要照時間排好。 */
      DB.Events.sort(function (a, b) { return (a.at || 0) - (b.at || 0); });
      SYNC.hold = 1;
      try { localStorage.setItem(STORE, JSON.stringify(DB)); } catch (e) {}
      SYNC.hold = 0;
    }
    if (done) done(n);
  }).catch(function (e) { syncTrouble(e); if (done) done(-1); });
}
