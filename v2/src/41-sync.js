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

var SYNC = { on: 0, db: null, last: null, first: {}, hold: 0, err: '', stale: 0, fly: {} };

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

/* 每一次寫入都帶的版本記號。

   2026-09-29：還開著舊版分頁的機器沒辦法遠端更新，而它推的是整筆
   （見 SYNC_MERGE 上面那一大段），會把別人交出去的狀態蓋掉。程式碼
   碰不到那一台，但資料庫碰得到：規則只收帶著 v = 2 的寫入
   （見 firestore.strict.rules），舊版不帶，所以寫不進去，不會再蓋掉任何人。
   哪一天寫入的格式又要換，這個數字加一，舊的就被擋在門外。

   所有寫入都在這個檔案的 syncBatch，只有兩個地方。加新的寫入路徑
   一定要帶 v，不然規則切下去那一刻，那條路全班寫不進去。 */
var SYNC_V = 2;

/* 全部掛在同一個文件底下，之後要換版本的時候換這一段就好。 */
var SYNC_ROOT = 'world/v1/';

function syncReady() {
  if (SYNC.db) return 1;
  if (typeof firebase === 'undefined') return 0;
  if (!firebase.apps || !firebase.apps.length) return 0;
  try { SYNC.db = firebase.firestore(); } catch (e) { return 0; }
  return 1;
}

/* ---------- 分頁開太久，程式碼是舊的 ----------

   2026-09-23：伺服器端修好的 bug，對一台已經開很久的分頁沒有用——
   它記憶體裡跑的還是打開那一刻拿到的那份 JS，deploy 再多次也不會
   自己變成新的，只有它自己重新整理過才會拿到新的（見 build.js 的
   BUILD_AT）。這裡每隔一段時間去掉快取問一次伺服器「現在是哪一版」，
   跟自己手上這一份比，新的話就在頂條露出「重新整理」（見 55-ui.js
   的 topEnd）。只問首頁那個 HTML，不碰任何 API，負擔跟同步比起來
   可以忽略。 */
var SYNC_FRESH_MS = 600000; /* 十分鐘問一次，不用更勤——這不是急事 */
/* ---------- 閒著的舊分頁，自己換成新的 ----------

   2026-09-30：學生的分頁會一直開著（手機尤其是，鎖屏、切 app 都不會關）。
   頂條那句「這一頁是舊版」要有人看到、點下去才有用。閒著的時候直接換，
   不用等人。

   什麼時候不換（換了就會丟東西）：
     · 不在「休息的頁」：承諾、交作業、審核、派任務都有寫到一半的東西
     · 正在打字（游標在輸入框）
     · 有還沒送到雲端的改動（SYNC.fly）或上一批推送失敗（SYNC.err）——
       換掉會讓這些改動消失

   十分鐘內最多換一次（sessionStorage 記著），以免哪天伺服器回的版本記號
   一直比頁面新，變成一頁一直重新整理。sessionStorage 用不了就不換。 */
var SYNC_REST_PAGES = ['home', 'pack', 'eco', 'classeco', 'radar', 'codex'];
function freshSafeToReload() {
  if (typeof S === 'undefined' || SYNC_REST_PAGES.indexOf(S.page) < 0) return false;
  if (SYNC.err) return false;
  for (var k in SYNC.fly) if (Object.prototype.hasOwnProperty.call(SYNC.fly, k)) return false;
  if (typeof document !== 'undefined') {
    var a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT')) return false;
  }
  return true;
}
function freshAutoReload() {
  if (typeof location === 'undefined' || typeof sessionStorage === 'undefined') return;
  try {
    var last = Number(sessionStorage.getItem('dungeon_autoreload') || 0);
    if (Date.now() - last < 600000) return;
    sessionStorage.setItem('dungeon_autoreload', String(Date.now()));
  } catch (e) { return; }
  location.reload();
}

/* 分頁開太久也換，不管有沒有新版。

   checkFresh 只在「伺服器有更新的版本」時才換。可是舊分頁的問題不只是
   程式碼舊——放了幾天的分頁，本機那份資料也是幾天前的，一被叫醒就拿著
   舊資料動作。所以開超過四小時、又閒著、又在休息的頁，就換一次
   （見 freshSafeToReload 的條件）。手機從鎖屏醒來的那一刻也檢查一次，
   那正是「醒來的第一下動作拿著舊資料」發生的時候。 */
var SYNC_LOADED = Date.now();
var SYNC_MAX_AGE = 4 * 3600000;
function tabTooOld() { return Date.now() - SYNC_LOADED > SYNC_MAX_AGE; }
function tabAgeCheck() { if (tabTooOld() && freshSafeToReload()) freshAutoReload(); }

function checkFresh() {
  if (typeof fetch !== 'function' || typeof BUILD_AT === 'undefined') return;
  if (typeof location === 'undefined') return;
  fetch(location.pathname + '?_v=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.text(); })
    .then(function (t) {
      var m = t.match(/BUILD_AT = (\d+);/);
      if (m && Number(m[1]) > BUILD_AT) {
        if (!SYNC.stale) {
          SYNC.stale = 1;
          if (typeof render === 'function') render();
        }
        if (freshSafeToReload()) freshAutoReload();
      }
    })
    .catch(function () {});
}
function checkFreshStart() {
  if (typeof setInterval !== 'function') return;
  checkFresh();
  setInterval(function () { checkFresh(); tabAgeCheck(); }, SYNC_FRESH_MS);
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { checkFresh(); tabAgeCheck(); }
    });
  }
}

function syncTrouble(e) {
  SYNC.err = (e && e.message) || String(e);
  if (typeof console !== 'undefined' && console.warn) console.warn('同步：' + SYNC.err);
  /* 2026-09-23：本來只印主控台，沒有人看——學生按了「交出去」，
     本機立刻顯示成功（save() 一定先寫得進 localStorage），可是那一批
     推上雲的請求在背景默默失敗，畫面上一個字都沒變。老師隔天打開
     審核只看到一件，其餘幾十組以為自己交了，其實東西沒離開過那台
     瀏覽器。topEnd() 讀 syncStatus() 畫那一條，這裡補一次 render()
     是讓「剛好失敗的那一刻」不用等使用者剛好做了下一個動作才看得到。 */
  if (typeof render === 'function') render();
}

/* 頂條那一條的三種狀態：off（沒接上雲，本機單機模式）、
   err（上一批推送失敗，本機資料還沒真的到雲端）、ok（其餘）。
   ok 不特別顯示——正常狀態不該佔畫面，只有「要注意」才出現
   （見 50-style.css 的顏色規則）。 */
function syncStatus() {
  if (!SYNC.db) return 'off';
  if (SYNC.err) return 'err';
  return 'ok';
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

/* 現在手上這一份，攤平成「路徑 → JSON 字串」。示範那一邊的不算。

   2026-09-23 補的一道門：**這張表還沒收到第一次快照之前不推。**

   分頁剛連上雲端那一刻，SYNC.last 是空的，可是「雲端現在長怎樣」
   要等 Firestore 回應才知道——中間隔著一段網路來回。如果剛好在
   這個空檔裡，隨便一個動作觸發了一次 save()，本機端當下那一份
   （可能是很久沒開、還記著舊資料的那一份）會因為 SYNC.last 是空的、
   看起來每一筆都「跟上次同步的不一樣」，整批被當成新的推上去——
   蓋掉任何在這個空檔之前、由別的地方（另一台裝置，或像班名這種
   直接改資料庫）寫上去的東西。這正是「班名改完又被蓋回去」那次
   事故的根源，而且不只影響班名，任何欄位、任何時候都可能踩到。

   SYNC.first[col] 由 syncTake 在收到這張表的第一次快照時打開
   （見下面 syncStart）。打開之前，這張表在 syncFlat 裡直接跳過——
   本機再怎麼改，都要等真的跟雲端核對過一次，才輪到它被推上去。
   SYNC_UP_ONLY（目前只有 Events）不訂閱、不核對，維持原樣一路能推。 */
function syncFlat() {
  var out = {}, d = demoSide();
  Object.keys(SYNC_KEY).forEach(function (col) {
    if (!SYNC_UP_ONLY[col] && !SYNC.first[col]) return;
    var idf = SYNC_KEY[col];
    (DB[col] || []).forEach(function (r) {
      if (!r || !r[idf] || onDemoSide(r, d)) return;
      out[col + '/' + r[idf]] = JSON.stringify(syncCut(col, r));
    });
  });
  return out;
}

/* 這張表，這一台裝置現在推不推得動。

   2026-09-24：Classes 只有老師改得動（actRenameClass），可是每一台
   裝置——包含從來不會去改班名的學生——只要存一次檔，都會順手把
   手上那一份 Classes 重新推一次。裝置一多，「本機這一份到底新不新」
   就有一堆機會出岔子：任何一台學生裝置的本機資料只要有任何時間差
   （分頁開很久、剛好卡在還沒收到最新一次快照的那一刻），都可能把
   老師剛改的班名蓋掉——SYNC.first 那道門擋的是「開機那一刻」的
   賽跑，擋不住「開機很久之後，某台裝置手上那份還是舊的」這種情況。
   真正該推 Classes 的裝置只有一種：目前登入的是老師。範圍縮到這裡，
   會去蓋掉它的裝置就少了一整個數量級。

   這一支要跟 syncPush 底下判斷「刪掉了」那一段用同一個標準——
   不然學生的裝置會把「我推不動 Classes」誤判成「Classes 被我刪掉了」，
   對雲端發一筆刪除。 */
function syncPushable(col) {
  if (col !== 'Classes') return true;
  var u = (typeof me === 'function') ? me() : null;
  return !!(u && u.role === 'teacher');
}

/* ---------- 一筆之內，只寫「我改過的那幾格」 ----------

   2026-09-29 量到的事故：事件紀錄有三十次「交出去」，雲端的 Runs 卻
   幾乎全是進行中，沒有交出時間、沒有實際天數，只剩隊員寫的
   「我做了什麼」。

   雲端一筆 = 一整份 JSON 字串，上面那段「一筆一筆推」只擋得住
   「改的是不同筆」。同一組兩個人碰的是同一筆 Run：

     A 交出去　　　　　　雲端 state = submitted
     B 的手機鎖過屏、醒來，本機那份還是進行中，
       他補寫「我做了什麼」→ 整筆（state = running）推上去
     雲端 state = running　← A 交的東西沒了

   畫面上沒有任何跡象，老師那邊永遠看不到，學生再交一次又被蓋一次。

   修法：推之前讀雲端現在那一份，用「我上次看到的（base）」對「我現在的
   （mine）」找出**我改了哪幾格**，只把那幾格套到雲端那一份上。B 沒動過
   state，就不會去寫 state。同一格兩邊都改，才輪到後寫的贏。

   陣列只在長度沒變的時候逐格併（spent、steps 那一類），長度變了整個換。 */
function syncEq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function syncIsObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }

function syncApply(base, mine, theirs) {
  if (syncEq(base, mine)) return theirs;
  if (syncIsObj(base) && syncIsObj(mine) && syncIsObj(theirs)) {
    var out = {}, keys = {}, k;
    for (k in theirs) out[k] = theirs[k];
    for (k in base) keys[k] = 1;
    for (k in mine) keys[k] = 1;
    for (k in keys) {
      if (!(k in mine)) { delete out[k]; continue; }
      if (syncEq(base[k], mine[k])) continue;
      out[k] = syncApply(base[k], mine[k], theirs[k]);
    }
    return out;
  }
  if (Array.isArray(base) && Array.isArray(mine) && Array.isArray(theirs) &&
      base.length === mine.length && mine.length === theirs.length) {
    return mine.map(function (m, i) { return syncApply(base[i], m, theirs[i]); });
  }
  return mine;
}

/* 字串進、字串出。雲端沒有這一筆、或我沒有 base，就是整筆寫我的。 */
function syncMergeStr(baseStr, mineStr, theirStr) {
  if (theirStr == null || baseStr == null || mineStr == null) return mineStr;
  try {
    return JSON.stringify(syncApply(JSON.parse(baseStr), JSON.parse(mineStr), JSON.parse(theirStr)));
  } catch (e) { return mineStr; }
}

/* 把變過的那幾筆寫上去。save() 每一次都會叫它一次。 */
function syncPush() {
  if (SYNC.hold || !SYNC.last || !syncReady()) return;
  var now = syncFlat(), jobs = [];
  Object.keys(now).forEach(function (p) {
    if (!syncPushable(p.slice(0, p.indexOf('/')))) return;
    if (SYNC.last[p] !== now[p]) jobs.push([p, now[p], SYNC.last[p]]);
  });
  Object.keys(SYNC.last).forEach(function (p) {
    if (!syncPushable(p.slice(0, p.indexOf('/')))) return;
    if (!(p in now)) jobs.push([p, null, SYNC.last[p]]);
  });
  if (!jobs.length) return;
  /* 送出去、還沒回來的那幾筆，base 記著——這中間如果剛好收到別人的
     快照，syncTake 要靠它知道「本機這份哪幾格是我剛改的、不能被蓋掉」。 */
  /* fly[p] 記的是「最早那一份還沒確定到雲端的 base」。連續兩次存檔、
     第一次還沒回來（或斷線失敗了）的時候，第二次的 base 用它，不用
     第二次當下的 SYNC.last——那一份已經包含第一次的改動，第一次要是
     沒推成，就永遠沒有人知道它還沒推（2026-09-29 隨機測試量到：
     斷線期間先交出去、再寫一句話，交出去那一步就這樣掉了）。 */
  jobs.forEach(function (j) {
    if (j[1] === null || j[2] === undefined) return;
    if (j[0] in SYNC.fly) j[2] = SYNC.fly[j[0]]; else SYNC.fly[j[0]] = j[2];
  });
  /* 這台裝置這次推不動的那幾筆（例如學生手上的 Classes），SYNC.last
     還是要記著雲端現在真正的樣子，不能被 now 直接蓋掉——蓋掉的話
     它會以為自己的（可能是舊的）那份才是基準，下一次比對就亂了。 */
  Object.keys(now).forEach(function (p) {
    if (!syncPushable(p.slice(0, p.indexOf('/'))) && (p in SYNC.last)) {
      now[p] = SYNC.last[p];
    }
  });
  SYNC.last = now;
  /* 一批最多 500 筆是 Firestore 的上限，第一次連上去會超過。 */
  for (var i = 0; i < jobs.length; i += 400) syncBatch(jobs.slice(i, i + 400));
}

function syncDone() {
  /* 這一批真的到了。清掉上一次的錯誤——如果剛剛才失敗過，
     這一下成功了，頂條那條警告該跟著收掉，不然它會一直掛著，
     讓人以為現在還在出事。 */
  if (SYNC.err) { SYNC.err = ''; if (typeof render === 'function') render(); }
}

function syncFail(chunk, e) {
  /* 沒寫成功就當作沒同步過，下一次 save 會再試一次。
     退回原本的 base，不是刪掉——刪掉的話下一次會被當成「新的一筆」
     整筆蓋上去，正是上面要避免的那件事。 */
  chunk.forEach(function (j) {
    /* SYNC.last 已經被更新的快照或更新的一次存檔換掉了，就不是我的事
       （那一次自己會處理）。fly 留著：下一次存檔還要用最早的 base。 */
    if (SYNC.last[j[0]] !== j[1]) return;
    if (j[2] === undefined) delete SYNC.last[j[0]]; else SYNC.last[j[0]] = j[2];
  });
  syncTrouble(e);
}

/* chunk 裡每一筆是 [路徑, 我現在的（null＝刪）, 我上次看到的]。
   有 base 的更新走交易（讀雲端、只套我改的那幾格）；新的一筆、刪除、
   只上不下的 Events 沒有可以併的東西，照舊一批寫。 */
function syncBatch(chunk) {
  var plain = [], merge = [], create = [];
  chunk.forEach(function (j) {
    var col = j[0].slice(0, j[0].indexOf('/'));
    if (j[1] !== null && j[2] !== undefined && !SYNC_UP_ONLY[col]) merge.push(j);
    else if (j[1] !== null && j[2] === undefined && col === 'Runs') create.push(j);
    else plain.push(j);
  });
  if (plain.length) {
    var b = SYNC.db.batch();
    plain.forEach(function (j) {
      var ref = SYNC.db.doc(SYNC_ROOT + j[0]);
      if (j[1] === null) b.delete(ref); else b.set(ref, { j: j[1], v: SYNC_V });
    });
    b.commit().then(function () {
      plain.forEach(function (j) { if (SYNC.last[j[0]] === j[1]) delete SYNC.fly[j[0]]; });
      syncDone();
    }).catch(function (e) { syncFail(plain, e); });
  }
  /* 新的一筆 Run：雲端已經有同編號的就不寫（見 40-db.js 的 actCommit）。
     編號固定之後，兩台同時按承諾寫的是同一個文件；晚到的那一台
     （甚至是斷線很久才回來的）不能把已經交出去的那一筆蓋成新的。
     不寫的那一台，下一份快照會把它本機那一份換成雲端的。 */
  if (create.length) {
    SYNC.db.runTransaction(function (tx) {
      var refs = create.map(function (j) { return SYNC.db.doc(SYNC_ROOT + j[0]); });
      return Promise.all(refs.map(function (r) { return tx.get(r); })).then(function (snaps) {
        snaps.forEach(function (s, i) {
          if (!s.exists) tx.set(refs[i], { j: create[i][1], v: SYNC_V });
        });
      });
    }).then(function () {
      create.forEach(function (j) { if (SYNC.last[j[0]] === j[1]) delete SYNC.fly[j[0]]; });
      syncDone();
    }).catch(function (e) { syncFail(create, e); });
  }
  if (merge.length) {
    SYNC.db.runTransaction(function (tx) {
      var refs = merge.map(function (j) { return SYNC.db.doc(SYNC_ROOT + j[0]); });
      return Promise.all(refs.map(function (r) { return tx.get(r); })).then(function (snaps) {
        snaps.forEach(function (s, i) {
          var cloud = s.exists ? s.data().j : null;
          var out = syncMergeStr(merge[i][2], merge[i][1], cloud);
          if (out !== cloud) tx.set(refs[i], { j: out, v: SYNC_V });
        });
      });
    }).then(function () {
      merge.forEach(function (j) { if (SYNC.last[j[0]] === j[1]) delete SYNC.fly[j[0]]; });
      syncDone();
    }).catch(function (e) { syncFail(merge, e); });
  }
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

/* ---------- 被蓋掉的交件，有人手上還留著就補回去 ----------

   上面的三方併只管得到「新版」的機器。還開著 9/23 之前那份程式的
   分頁，推的還是整筆——它手機醒來補寫一句話，就把別人交出去的
   狀態蓋回進行中。那台舊分頁改不了，可是同一份資料在別的機器上
   還留著（交件的那台、老師的那台）。

   判斷靠一個不可能倒退的欄位：submittedAt 一旦寫進去，任何正常的
   流程都不會再拿掉它（見 40-db.js，只有 actSubmit 寫、沒有人清）。
   所以「我這份有 submittedAt、雲端這份沒有」只可能是被蓋掉，不會是
   別人正常改的。補的做法：以我這份為主，雲端有而我沒有的欄位留著，
   said 兩邊的話都留（見 SYNC_MERGE）。補完會被推回去，收到的舊分頁
   也就跟著好了。 */
var SYNC_HEAL = {
  Runs: function (我的, 他的) {
    /* 被蓋掉的兩種樣子：沒有交出時間，或是「進行中卻有交出時間」——
       後者是別台機器拿著舊的 base 去併，只寫了交出時間、沒寫狀態
       （2026-09-29 隨機測試量到），任何正常流程都不會出現。
       老師收下（done）之後也一樣不會回頭。 */
    var 交過 = 我的.submittedAt && (!他的.submittedAt || 他的.state === 'running');
    var 收下 = 我的.state === 'done' && 他的.state !== 'done';
    if (!交過 && !收下) return null;
    var out = {}, k;
    for (k in 他的) out[k] = 他的[k];
    for (k in 我的) if (k !== 'said') out[k] = 我的[k];
    var m = {};
    for (k in (我的.said || {})) m[k] = 我的.said[k];
    for (k in (他的.said || {})) m[k] = 他的.said[k];
    out.said = m;
    return out;
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
      /* 我這一台有還沒上去（或正在上去）的改動，不能被這一份快照蓋掉：
         把「我改的那幾格」套到雲端這一份上，再往下走。
         base 是我上次跟雲端對過的樣子；送出去還沒回來的那幾筆，
         用送出那一刻的 base（見 syncPush 的 SYNC.fly）。 */
      var bs = (pre + id in SYNC.fly) ? SYNC.fly[pre + id] : SYNC.last[pre + id];
      if (bs !== undefined) {
        var ms = JSON.stringify(syncCut(col, r));
        if (ms !== bs) {
          var cs = JSON.stringify(inc[id]), mm3 = syncMergeStr(bs, ms, cs);
          if (mm3 !== cs) { inc[id] = JSON.parse(mm3); 併了 = 1; }
        }
      }
      /* 交件被舊分頁蓋掉了：我這份留著的話補回去（見 SYNC_HEAL）。 */
      var hl = SYNC_HEAL[col];
      if (hl) { var 補好 = hl(r, inc[id]); if (補好) { inc[id] = 補好; 併了 = 1; } }
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
    /* 從這一刻起 SYNC.last 就是雲端真正的樣子，fly 記的舊 base 用完了。 */
    delete SYNC.fly[pre + id];
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
