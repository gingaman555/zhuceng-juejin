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
  Milecrystals: 'msId', Runs: 'runId', Pushes: 'pushId',
  Keeps: 'keepId', Events: 'evId'
};
/* 推上去但不訂閱的那幾張（見檔頭）。 */
var SYNC_UP_ONLY = { Events: 1 };

/* ---------- 這幾欄不上雲 ----------

   seenAt 是「你上次看首頁是什麼時候」，markSeen 每畫一次首頁就寫一次
   now()（見 65-feed.js）。它寫在 Users 那一筆裡，所以會跟著上雲——
   然後：

     A 畫首頁 → seenAt 變了 → 推上去
     B 的訂閱響 → syncTake 看到 A 那一筆變了 → syncDraw() → render()
     B 也在首頁 → markSeen → seenAt 變了 → 推上去
     A 的訂閱響 → render() → markSeen → 推上去
     → 永遠不停

   十五台機器一起跑的時候量到的：轉八趟還在變，而且每一趟每一台
   都寫一次。速率被 Firestore 的來回延遲擋著（100–300ms），
   換算下來一分鐘幾千次寫入——Firestore 免費額度是一天兩萬次。
   全班同時開著，幾分鐘就把一整天的額度燒光，然後那一天剩下的
   時間所有人都同步不了。

   這件事只有十五台機器一起跑才看得到（見 class.js）。一台機器跑的
   e2e、multi 永遠不會碰到它——沒有第二台可以打回來。

   ── 為什麼可以直接不同步 ──

   seenAt 回答的是「這個人上次看是什麼時候」，用來算「你不在的時候
   發生了什麼」（awayOf）跟標「上次之後才有的」。它是那一台機器上的
   閱讀狀態，不是那個班的資料。留在本機，換一台裝置最多就是同一件事
   再看到一次「新的」——那不痛。

   syncTake 會把本機的值蓋回收到的那一筆上（見下面）。 */
var SYNC_SKIP = { Users: ['seenAt'] };

/* 這一筆要上雲的樣子（把不上雲的那幾欄拿掉）。 */
function syncCut(col, r) {
  var skip = SYNC_SKIP[col];
  if (!skip) return r;
  var o = {};
  for (var k in r) if (Object.prototype.hasOwnProperty.call(r, k) && skip.indexOf(k) < 0) o[k] = r[k];
  return o;
}

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

/* 哪些班、哪些隊是示範用的。

   示範資料本身帶 _d（seed 打上去的），那一批不會上雲。可是**在示範班
   裡跑出來的東西**——承諾、推進、任務之證、跟老師談過——是執行時才
   生出來的，身上沒有 _d。

   2026-09-05 量到：示範班的動態上出現四筆別人留下的「跟老師談過」，
   來源是我自己在示範班上測協商。那幾筆被推上去，再散到每一台打開
   網頁的機器上，而且看不出是誰弄的。拿去給人看的那一份會越來越髒，
   一次比一次髒，沒有人清得掉。

   我當初判斷「示範班的 run 上去了也無害」，那是錯的。 */
function demoSide() {
  var team = {}, cls = {};
  (DB.Teams || []).forEach(function (t) {
    if (t && t._d) { team[t.teamId] = 1; if (t.classId) cls[t.classId] = 1; }
  });
  (DB.Classes || []).forEach(function (c) { if (c && c._d) cls[c.classId] = 1; });
  return { team: team, cls: cls };
}

/* 這一筆掛在示範班上嗎。 */
function onDemoSide(r, d) {
  if (!r) return true;
  if (r._d) return true;
  if (r.teamId && d.team[r.teamId]) return true;
  if (r.classId && d.cls[r.classId]) return true;
  return false;
}

/* 現在手上這一份，攤平成「路徑 → JSON 字串」。示範那一邊的不算。 */
function syncFlat() {
  var out = {}, d = demoSide();
  Object.keys(SYNC_KEY).forEach(function (col) {
    var idf = SYNC_KEY[col];
    (DB[col] || []).forEach(function (r) {
      if (!r || !r[idf] || onDemoSide(r, d)) return;
      out[col + '/' + r[idf]] = JSON.stringify(syncCut(col, r));
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

/* ---------- 同一筆上，兩個人各寫各的那一格 ----------

   雲端一筆 = 一整份 JSON 字串，所以同一筆被兩台機器同時寫的時候是
   **整筆**後蓋前。跑出來的樣子（六組每組兩人的模擬）：

     小美 存自己那一件　A 這台 spent = [3,0]
     阿哲 存自己那一件　B 這台 spent = [0,5]
     A 推、B 推（同一秒，B 還沒收到 A 的）
     雲端 spent = [0,5]
     A 收到之後　　　　A 這台 spent = [0,5]　← 小美的那一件不見了

   而且畫面上沒有任何跡象。這條在教室裡最容易發生——老師說「大家
   現在填自己那一份」，全班在同一分鐘內按下去。掉的正好是這套系統
   要收的個人層資料。

   ── 為什麼可以直接併 ──

   看 40-db.js 的 actMyPart：一個人只寫得到掛在自己名下的那幾格
   （spent[i]），還有以自己 userId 為鍵的那一句（said[me]）。
   兩個人寫的永遠是不同的格子，所以「對方那一份是空的、我這一份有」
   就一定是被蓋掉的，不是被清掉的：

     · said 只加不刪——actMyPart 裡是 if (one) r.said[me] = one，
       空字串不寫。所以缺鍵就是缺，不是「他刪掉了」。
     · spent 的 0 就是「還沒填」，介面上沒有把自己那一格改回 0 的
       意義（0 跟沒填長一樣）。

   併完之後那一筆跟雲端不一樣了，所以要推回去（見 syncTake 結尾）。
   兩邊都會做同一件事，最後收斂到兩份都在。

   這是補救不是預防：真正乾淨的做法是一個人的那一份存成獨立的一筆
   （Parts/runId_userId），兩台機器永遠不會寫到同一個文件。那是
   資料結構的改動，等這學期跑完再說。 */
var SYNC_MERGE = {
  Runs: function (我的, 他的) {
    var 補 = 0, 出 = 他的;
    function 攤() { if (出 === 他的) 出 = JSON.parse(JSON.stringify(他的)); return 出; }

    var a = 我的.spent;
    if (a && a.length) {
      var b = (他的.spent || []).slice();
      for (var i = 0; i < a.length; i++) {
        if ((Number(a[i]) || 0) > 0 && !(Number(b[i]) || 0)) { b[i] = a[i]; 補 = 1; }
      }
      if (補) 攤().spent = b;
    }

    var m = 我的.said;
    if (m) Object.keys(m).forEach(function (k) {
      if (!m[k]) return;
      if (他的.said && 他的.said[k]) return;
      var o = 攤(); o.said = o.said || {}; o.said[k] = m[k]; 補 = 1;
    });

    return 補 ? 出 : null;
  }
};

/* 別人動了：把那一張表併進來。

   併，不是換掉：本機原本的順序留著（陣列順序在幾個地方是有意義的，
   例如「正在走的那一趟」是 filter 之後取第一個），別人新增的接在
   後面，等於就是這台機器看到的先後。 */
function syncTake(col, inc) {
  var idf = SYNC_KEY[col], arr = DB[col] || (DB[col] = []);
  var seen = {}, hit = 0, firstTime = !SYNC.first[col], pre = col + '/';
  SYNC.first[col] = 1;
  /* 雲端本來的樣子，先留一份。下面可能會把 inc[id] 換成併過的版本，
     而 SYNC.last 要記的是**雲端**那一份——不然併出來的東西跟
     SYNC.last 一樣，syncPush 會以為沒變，就推不回去了。 */
  var 雲 = {}, 併了 = 0;
  Object.keys(inc).forEach(function (id) { 雲[pre + id] = JSON.stringify(inc[id]); });
  for (var i = arr.length - 1; i >= 0; i--) {
    var r = arr[i], id = r && r[idf];
    if (!r || r._d) continue;                /* 示範資料只在這台機器上 */
    if (inc[id]) {
      seen[id] = 1;
      /* 我這一台上有、對方那一份沒有的格子，補回去（見 SYNC_MERGE）。 */
      var mg = SYNC_MERGE[col];
      if (mg) { var 併 = mg(r, inc[id]); if (併) { inc[id] = 併; 併了 = 1; } }
      /* 不上雲的那幾欄留本機的（見 SYNC_SKIP）。雲端那一份根本沒有
         這幾欄，不補回去的話收一次就被清掉一次。 */
      var sk = SYNC_SKIP[col];
      if (sk) sk.forEach(function (k) { if (r[k] !== undefined) inc[id][k] = r[k]; });
      /* 比的是「上雲的那個樣子」。連本機欄一起比的話，那幾欄一變
         就會判定成「別人動了」，然後推回去——那正是要修的迴圈。 */
      if (JSON.stringify(syncCut(col, r)) !== JSON.stringify(syncCut(col, inc[id]))) {
        arr[i] = inc[id]; hit = 1;
      }
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
    /* 記的是雲端本來那一份，不是併過的。 */
    SYNC.last[pre + id] = 雲[pre + id];
  });
  if (!hit) return;
  SYNC.hold = 1;
  try { localStorage.setItem(STORE, JSON.stringify(DB)); } catch (e) {}
  SYNC.hold = 0;
  /* 併過的話，把補回去的那一份推上去。放開 hold 之後才推。 */
  if (併了) syncPush();
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
      var inc = {}, ds = demoSide();
      snap.forEach(function (d) {
        var v = d.data();
        try {
          var rec = JSON.parse(v.j);
          /* 雲端上已經有的那幾筆髒資料就當作沒看到——不刪它（刪東西
             不該是自己偷偷做的），但它不會再進到任何人的畫面上。 */
          if (!onDemoSide(rec, ds)) inc[d.id] = rec;
        } catch (e) {}
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
