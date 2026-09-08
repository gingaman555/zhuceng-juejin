/* 資料與動作。

   所有會改到資料的事都叫 act*，而且只有這裡改得到 DB。畫面只讀不寫。
   存在 localStorage，因為這一版是給人打開就能走一遍的原型。

   跟上一版最大的差別：沒有分數、沒有層、沒有收集。
   一個里程碑的一生是：派發 → 承諾天數 → 每日推進 → 上傳 → 判定 →
   （失準就復盤）→ 老師勾可以 → 學生三選一 → 大躍進。

   老師在這整條線上只碰兩個地方：派發、勾可以。其他每一步都是學生的。 */

var DB = null;
var STORE = 'dungeon.v1';

/* 試用時可以快轉。所有時間都走 now()，不直接用 Date.now()。 */
var CLOCK = 0;
function now() { return Date.now() + CLOCK; }
var DAY = 86400000;

/* 只比日期，不比時分——「今天推過了沒」問的是日子，不是 24 小時。 */
function dayOf(ts) {
  var d = new Date(ts);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
function daysBetween(a, b) {
  var A = new Date(a), B = new Date(b);
  A = new Date(A.getFullYear(), A.getMonth(), A.getDate());
  B = new Date(B.getFullYear(), B.getMonth(), B.getDate());
  return Math.round((B - A) / DAY);
}

function blank() {
  return {
    Config: { seq: 1 },
    Users: [], Classes: [], Teams: [],
    /* 任務：老師派的。同一個任務可以只發給某幾組。 */
    Milestones: [],
    /* 一組在一個任務上的狀態。這張表是整個系統的心臟。 */
    Runs: [],
    /* 每一次推進打卡。一天一筆。 */
    Pushes: [],
    /* 每一趟留下的那一句。存的是當下算出來的字，不是規則的 key——
       規則以後改了，他當時留的那句話不會跟著變成別的意思。 */
    Keeps: [],
    /* 研究紀錄：誰、什麼時候、做了什麼。只增不刪。 */
    Events: [],
    /* 登入狀態 */
    Session: null
  };
}

/* 這台機器的記號。

   nid 本來只是一個全域計數器（Config.seq），一台機器用完全沒問題。
   三台機器同時用的時候，三邊各自數到 42，於是三個不同的東西都叫
   R42——推到雲端之後後寫的把先寫的蓋掉，而且畫面上看不出來。

   加一段這台機器自己的記號就不會撞。記在 localStorage 裡，
   關掉分頁再開不會變成另一台機器。 */
var DEV_TAG = '';
function devTag() {
  if (DEV_TAG) return DEV_TAG;
  try { DEV_TAG = localStorage.getItem('dungeon.dev') || ''; } catch (e) {}
  if (!DEV_TAG) {
    DEV_TAG = Math.random().toString(36).slice(2, 6);
    try { localStorage.setItem('dungeon.dev', DEV_TAG); } catch (e) {}
  }
  return DEV_TAG;
}
/* 號碼牌不見的話要當場補一張。

   本來直接寫 DB.Config.seq++。那個數字由 blank() 給、由 seed() 設，
   正常路徑一定有——可是 load() 從 localStorage 讀回來的那一份完全
   沒有人檢查它。少了那個數字，undefined++ 是 NaN，而 NaN++ 還是 NaN：
   那台機器從此產出的每一個 ID 都叫 U NaN、R NaN、G NaN。

   然後 userOf() 會回傳第一個撞到的人。實際跑出來的樣子是這個：

     老師三 註冊完 classId = ""
     actJoinClass → 「你已經在一個班裡了。」
     老師三 classId 之後 = "CNaNacqc"

   ——他被當成老師一了。一整堂課的人互相蓋掉，而畫面上完全看不出來。

   我目前找不到會讓它真的發生的路徑（Config 不進雲端同步，見
   41-sync.js）。可是代價不對稱：補一張是一行，沒補的那一天是
   整班的資料混在一起，而且是在教室現場。

   接在最大的那個號碼後面，不從 1 開始——從 1 開始會跟已經存在的
   東西撞。 */
function nid(p) {
  var c = DB.Config || (DB.Config = {});
  if (!(c.seq > 0)) {
    var top = 0;
    ['Users', 'Classes', 'Teams', 'Milestones', 'Runs', 'Pushes', 'Keeps']
      .forEach(function (t) {
        (DB[t] || []).forEach(function (x) {
          var id = String(x.userId || x.classId || x.teamId ||
            x.msId || x.runId || x.id || '');
          var m = id.match(/^[A-Z](\d+)/);
          if (m && +m[1] > top) top = +m[1];
        });
      });
    c.seq = top + 1;
  }
  return p + (c.seq++) + devTag();
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(DB)); } catch (e) {}
  /* 接得上雲端就把變過的那幾筆推上去（見 41-sync.js）。node 裡跑
     檢查、或用 file:// 點開的時候接不上，這一行安靜地什麼都不做。 */
  if (typeof syncPush === 'function') syncPush();
}
/* 示範資料的版本。改了種子就把這個數字加一——
   已經開過的瀏覽器會自己換成新的那一份。

   只影響示範資料。有人自己建過帳號的那一份永遠不動（見 load）。 */
var SEED_V = 16;   /* 16：R10 撤掉（進場給 200 之後不需要那個繞路） */

function load() {
  try { DB = JSON.parse(localStorage.getItem(STORE)); } catch (e) { DB = null; }
  if (!(DB && DB.Users && DB.Users.length)) return false;
  /* 還是示範資料、而且版本舊了 → 重種一次。

     demo 這個旗子由 seed() 開著、由 actRegister 關掉：有人真的
     建過帳號的那一刻，這份資料就不再是示範資料，之後永遠不會被洗掉。 */
  var cfg = DB.Config || {};
  if (cfg.demo && cfg.seedV !== SEED_V) return false;
  /* 更舊的那一批：demo 這個旗子還沒發明的時候存下來的示範資料。
     它沒有 demo、也沒有 seedV，所以上面那一行永遠不會成立——
     那份存檔會永遠留在瀏覽器裡，而它是「一組只有一個人」的年代。

     認法是找種子自己開的那三個固定帳號。三個同時在，才算數：
     真的班級不會剛好有 tea01、stu01、lab01 這三個帳號，
     所以這一條不會洗掉任何一個人真的建出來的東西。 */
  if (cfg.seedV === undefined && !cfg.demo) {
    var seedAcc = 0;
    DB.Users.forEach(function (u) {
      if (u.account === 'tea01' || u.account === 'stu01' || u.account === 'lab01') seedAcc++;
    });
    if (seedAcc === 3) return false;
  }
  return true;
}
/* ---------- 座位 ----------

   一個人可以同時在好幾個班（學生修兩門課、老師帶兩班）。

   ── 為什麼不是把 classId 換成陣列 ──

   全站有 71 個地方讀 .classId、239 個地方讀 .teamId。換成陣列的話
   每一個都要跟著改，而其中絕大多數問的是同一件事：「他現在在看的
   那一班／那一組」。

   所以留著 classId 與 teamId，讓它們**指著現在坐的那一個座位**。
   既有的每一個讀取一行都不用動，語意也沒變。

   真正要改的只有一種：「誰在這一班／這一組」——那種問題不能問
   「你現在在看哪一班」，要問「你有沒有那一班的座位」。那種地方
   只有十幾處，全部換成下面這兩支。

     u.seats   [{ classId, teamId }, …]　他有哪幾個座位
     u.classId 現在坐的那一個（永遠等於某一個 seat 的 classId）
     u.teamId  同上

   ── 舊資料 ──

   沒有 seats 的那些人（這一版之前建的帳號）由 seatsOf 當場推出來：
   一個班一個組，就是一個座位。所以不需要遷移步驟，也不會有
   「升級到一半」的中間狀態。 */
function seatsOf(u) {
  if (!u) return [];
  if (Array.isArray(u.seats) && u.seats.length) return u.seats;
  if (u.classId) return [{ classId: u.classId, teamId: u.teamId || '' }];
  return [];
}

/* 他有沒有這一班的座位。點名冊要問的是這個，不是「他現在在看哪一班」。 */
function inClass(u, classId) {
  if (!u || !classId) return false;
  var ss = seatsOf(u);
  for (var i = 0; i < ss.length; i++) if (ss[i].classId === classId) return true;
  return false;
}
/* 他有沒有在這一組。 */
function inTeam(u, teamId) {
  if (!u || !teamId) return false;
  var ss = seatsOf(u);
  for (var i = 0; i < ss.length; i++) if (ss[i].teamId === teamId) return true;
  return false;
}
/* 他在這一班裡的那一組（沒有就是空字串）。 */
function teamIn(u, classId) {
  var ss = seatsOf(u);
  for (var i = 0; i < ss.length; i++) if (ss[i].classId === classId) return ss[i].teamId || '';
  return '';
}

/* 加一個座位。已經有那一班就不重複加，只把組補上去。 */
function addSeat(u, classId, teamId) {
  if (!u || !classId) return;
  u.seats = seatsOf(u).slice();
  var hit = null;
  u.seats.forEach(function (s) { if (s.classId === classId) hit = s; });
  if (hit) { if (teamId) hit.teamId = teamId; }
  else u.seats.push({ classId: classId, teamId: teamId || '' });
  /* 新加的那一個就是現在坐的——他剛加進來，要看的就是它。 */
  u.classId = classId;
  u.teamId = teamId || (hit ? hit.teamId : '') || '';
}

/* 換去坐另一個座位。 */
function actSit(userId, classId) {
  var u = userOf(userId);
  if (!u) return { err: '找不到這個人。' };
  var ss = seatsOf(u), hit = null;
  ss.forEach(function (s) { if (s.classId === classId) hit = s; });
  if (!hit) return { err: '你不在這一個班裡。' };
  u.seats = ss;
  u.classId = hit.classId;
  u.teamId = hit.teamId || '';
  save();
  logEvent('sit', { by: u.userId, klass: (classOf2(classId) || {}).name || classId });
  return { klass: classOf2(classId) };
}
function classOf2(id) { return find('Classes', function (c) { return c.classId === id; }); }

function find(tbl, fn) { for (var i = 0; i < DB[tbl].length; i++) if (fn(DB[tbl][i])) return DB[tbl][i]; return null; }
function where(tbl, fn) { return DB[tbl].filter(fn); }

function teamOf(id) { return find('Teams', function (t) { return t.teamId === id; }); }
function userOf(id) { return find('Users', function (u) { return u.userId === id; }); }
function msOf(id) { return find('Milestones', function (m) { return m.msId === id; }); }
/* 這一組在這個任務上的那一趟。

   「重新想過」的那幾趟要跳過：它們留在資料庫裡當紀錄，但那個任務
   對這一組來說是重新開始的，所以要讓畫面回到「還沒承諾」。 */
/* ---------- 這一趟是不是你自己組的 ----------

   六組一起跑的時候量出來的：actSubmit 收了 teamId 卻**完全沒有用它**，
   而 actMyPart 比的是呼叫端自己給的 teamId——兩支都等於沒有守門。
   結果是任何一個登入的學生都交得掉別組的那一趟、也寫得進別組的
   「我做了什麼」。

   介面上走不到那裡（廊道只給自己那一趟），但走不到不是守門，那是運氣。
   而且這一版的資料庫規則是完全開放的（見 41-sync.js），所以「介面沒有
   那條路」在雲端那一層完全不成立。

   沒有人登入的時候放行：loop.js 是直接呼叫資料層在跑模擬，它沒有 S.who。
   老師那幾支（收下、退回、回一句）不走這一條——他本來就不在那一組裡。 */
function ownRun(r) {
  if (!r) return false;
  var who = (typeof S !== 'undefined' && S.who) ? S.who : '';
  if (!who) return true;
  var u = userOf(who);
  return !!u && !!u.teamId && u.teamId === r.teamId;
}

function runOf(teamId, msId) {
  return find('Runs', function (r) {
    return r.teamId === teamId && r.msId === msId && r.state !== 'rethought';
  });
}

/* ---------- 一組看得到哪些任務 ---------- */
/* 這一組收得到哪幾個任務。

   三層篩：同一個課程 → 派的人帶不帶這一組 → 有沒有指名哪幾組。
   本來中間還有一層：派的老師跟帶那一組的老師對不上就擋掉。
   拿掉了——一個課程就是一個地方，「這一組是誰帶的」不該決定
   一件委託到不到得了他們手上。要發給誰，老師在派的時候自己點
   （m.teams），那才是他真的做過的決定。 */
function msFor(teamId) {
  var t = teamOf(teamId);
  if (!t) return [];
  return where('Milestones', function (m) {
    if (m.classId !== t.classId) return false;
    return !m.teams.length || m.teams.indexOf(teamId) >= 0;
  });
}

/* 這一組的所有 run，照派發時間排 */
function runsFor(teamId) {
  return msFor(teamId).map(function (m) {
    var r = runOf(teamId, m.msId);
    if (!r) {
      /* 派了但還沒承諾——先給一個空的，畫面才知道要問滑桿 */
      r = { runId: null, teamId: teamId, msId: m.msId, state: 'fresh',
            est: 0, flags: [], pushes: 0, overs: [], steps: [], keep: null };
    }
    return { ms: m, run: r };
  }).sort(function (a, b) { return a.ms.at - b.ms.at; });
}

/* ---------- 這一組現在該做什麼 ----------
   一次只回答一件事。首頁只給一個動作，其餘都是資訊。 */
function nextThing(teamId) {
  /* 已經走出去的組不再有下一件事。這不是鎖住畫面——
     他們還看得到留下的、班級地下城、紀錄，只是不再被派任務。 */
  var tm = teamOf(teamId);
  if (tm && tm.leftAt) return { kind: 'left' };
  /* 第一件事：先給這個專案取個名字。

     本來第一次進來看到的是一條空廊道，寫著「等老師派下一個」——
     那是最糟的第一印象：第一個動作是「等」。取名字三十秒做得完，
     而且它完全屬於他們自己（那塊牌子掛在洞口上，別組也看得到）。 */
  if (tm && !tm.project) return { kind: 'name' };
  /* 門開了——那是這個系統裡最後一件事。 */
  if (tm && tm.exitOk) return { kind: 'exitopen' };
  if (tm && tm.exitAsk) return { kind: 'waitexit' };

  var rows = runsFor(teamId);
  /* 1. 交了、判定出來了、還沒按「好」。
     省思那一題搬到交出去之前了，所以這裡不再分岔——
     每一個人都想過一次，不是只有失準的人。 */
  /* 交了、還沒看過那兩個數字。

     本來這一條看的是 state === 'judged'，而那個狀態同時代表「還沒送到
     老師手上」——所以「他有沒有看過結算」跟「老師有沒有收到」被綁成
     同一件事。現在分開：送到是 actSubmit 的事，看過是 sawStamp。 */
  var judged = rows.filter(function (x) {
    return x.run.state === 'submitted' && !x.run.sawStamp;
  })[0];
  if (judged) return { kind: 'stamped', row: judged };
  /* 2. 老師退回來了。
     排在這裡不是排在後面：它跟「老師勾了」同一類——有人為你做了一件事，
     而且在等你回應。放到 fresh 後面的話，手上同時有新任務的時候，
     退回會被一個還沒開始的任務蓋掉。

     判定沒變、深度沒動，只是那份成果還沒被收下。 */
  var back = rows.filter(function (x) { return x.run.state === 'back'; })[0];
  if (back) return { kind: 'back', row: back };

  /* 3. 老師勾可以了，還沒挑裝備 */
  /* approved 這個狀態不再出現：老師勾下去就直接 done（見 actApprove）。 */
  /* 3. 正在做的那一趟。

     這一條排在「還沒承諾的」前面，順序很要緊：反過來的話，老師派了
     三個任務，學生會被連問三次要花幾天，而且從頭到尾看不到自己
     正在走的那一趟。手上有事的時候，系統不該再遞一件事過來。

     這裡本來還有三個狀態：叫醒、今天還沒按、今天按過了。那三個都在
     催他每天開一次，拿掉了——他開始之前來說幾天，做完回來交。
     過了自己說的天數畫面會暗、水會漫過來（見 stallOf），
     但那不是一件「要他去處理」的事，它只是狀態。 */
  var wait = rows.filter(function (x) { return x.run.state === 'running'; })[0];
  if (wait) {
    var more = rows.filter(function (x) { return x.run.state === 'fresh'; }).length;
    return { kind: 'doing', row: wait, more: more };
  }

  /* 4. 派了但還沒承諾 */
  var fresh = rows.filter(function (x) { return x.run.state === 'fresh'; })[0];
  if (fresh) return { kind: 'commit', row: fresh };
  var sent = rows.filter(function (x) { return x.run.state === 'submitted'; })[0];
  if (sent) return { kind: 'review', row: sent };
  return { kind: 'idle', row: null };
}

function pushedToday(teamId, runId) {
  if (!runId) return false;
  var d = dayOf(now());
  return !!find('Pushes', function (p) {
    return p.teamId === teamId && p.runId === runId && p.day === d;
  });
}

/* 這一個 run 最後一次推進是什麼時候 */
/* 這一趟動過的最後一天。標日子的時候會用到。 */
function lastPush(runId) {
  var ps = where('Pushes', function (p) {
    return p.runId === runId && (p.kind || 'move') === 'move';
  });
  return ps.length ? ps[ps.length - 1].at : 0;
}

/* 這一組現在的光。

   本來看「幾天沒有按推進」。學生不必每天開了之後，那個數字算不出來，
   而且它本來就把「有沒有開 app」跟「有沒有在做事」混為一談。

   改成看行事曆：過了自己說的天數，畫面就開始暗。
   那個數字是他自己說的，不是我規定的期限；而且系統不用問任何人
   就知道今天是幾號。他不開，它也在走。 */
function stallOf(teamId) {
  var cur = runsFor(teamId).filter(function (x) { return x.run.state === 'running'; })[0];
  if (!cur) return { level: 0, days: 0 };
  var est = cur.run.est || 1;
  var gone = daysBetween(cur.run.committedAt, now());
  var over = gone - est;
  if (over >= RULES.band(est) + 1) return { level: 2, days: over };
  if (over > 0) return { level: 1, days: over };
  return { level: 0, days: 0 };
}

/* 深度＝完成過幾個任務。沒有終點。 */
/* 走到第幾層。判定出來就算走完——那一趟的兩個數字已經定了，
   不需要誰批准。所以廊道往前、深度 +1、地層換，都在判定當下發生。

   本來這裡算的是 state==="done"，而 done 要等老師勾完、學生再封存。
   老師三天不看，整條廊道就凍在原地——系統判的是預估準度，
   卻擋在作業品質的閘門後面。 */
function depthOf(teamId) {
  return where('Runs', function (r) {
    return r.teamId === teamId && !!r.stamp;
  }).length;
}

/* 留得下記號的層數。這一支才要等老師——有人看過，那一趟才成立。
   走是他自己的事，留下來是要有人看過的事。 */
function sealedDepth(teamId) {
  return where('Runs', function (r) {
    return r.teamId === teamId && (r.state === 'approved' || r.state === 'done');
  }).length;
}

/* 走到多深，跟站得住多深。

   前面那個數字是系統給的（判定出來就變深），後面那個要老師收下。
   兩個並排就是這一套的兩種回饋，而且一個評價的字都不用寫。 */
function depthSay(teamId) {
  return { walked: depthOf(teamId), sealed: sealedDepth(teamId) };
}

/* 廊道口掛的那塊牌子。

   本來它有三階材質，走得越深牌子越好。拿掉了——深度已經不是進度
   （路是隨機給的，而且一直循環），留著一個「越多越好」的漸層
   跟其他每一條規則都打架。

   它現在只有一個用途，而且那個用途一直都在：廊道口掛的是誰。
   上面寫什麼是他們自己決定的。 */
function signOf(teamId) {
  return SIGNS.iron;
}

/* 這一組的預估準度紀錄——復盤與老師審閱都要看 */
function accuracyOf(teamId) {
  var done = where('Runs', function (r) {
    return r.teamId === teamId && r.stamp;
  });
  var n = { early: 0, exact: 0, late: 0 };
  done.forEach(function (r) { n[r.stamp] = (n[r.stamp] || 0) + 1; });
  return { total: done.length, early: n.early, exact: n.exact, late: n.late, rows: done };
}

/* ---------- 這個課程有哪幾位老師 ----------

   三位老師共同帶整個班，不是一人分走幾組。所以「誰」這件事不掛在
   組上，掛在每一件上：這一件是誰派的（Milestone.mentorId）、
   那一句話是誰說的（Run.wordBy）。同一組這一週可能收到甲老師派的，
   下一週收到乙老師派的，兩件都是真的。

   Team.mentorId 還在，但已經沒有任何畫面在設它——留著只是為了讀得懂
   舊資料，新開的班不會有值。 */
function teachersOf(classId) {
  /* 問的是「他有沒有這一班的座位」，不是「他現在在看哪一班」——
     一位老師帶兩班的時候，他在看 B 班不代表他不是 A 班的老師。 */
  return where('Users', function (u) {
    return u.role === 'teacher' && inClass(u, classId);
  });
}

/* 這個課程的每一組。

   本來吃 mentorId：一位老師只看自己帶的那幾組。拿掉了——
   一個課程就是一個地方，切成三個互相看不到的小班只是多出來的複雜度，
   而且每一位老師本來就會被問到任何一組的事。

   參數留著沒有拿掉：十幾個呼叫端都在傳它，改簽名的風險比留著大。 */
function teamsUnder(classId, mentorId) {
  return where('Teams', function (t) { return t.classId === classId; });
}

/* ---------- 全班生態 ----------
   沒有名次。只有「誰在哪一條廊道、走到多深、現在是什麼狀態」。 */
function ecology(classId, mentorId) {
  return teamsUnder(classId, mentorId).map(function (t) {
    var st = stallOf(t.teamId);
    var cur = runsFor(t.teamId).filter(function (x) { return x.run.state === 'running'; })[0];
    return {
      teamId: t.teamId, name: t.name,
      depth: depthOf(t.teamId),
      /* 疊起來的那幾塊。sealed 是老師收下的，pending 是交出去了還在他那邊。
         走完但沒被收下的那一趟看得到，但它是虛的——那一塊還沒站住。 */
      sealed: sealedDepth(t.teamId),
      /* 他們走過的路線：一趟一個地方，照被收下的順序。
         班級地下城上每一塊的顏色讀這一份——那是他們的決定留下的痕跡。 */
      route: where('Runs', function (r) {
        return r.teamId === t.teamId && (r.state === 'approved' || r.state === 'done');
      }).map(function (r) { return zoneOfRun(r, t.teamId).key; }),
      pending: where('Runs', function (r) {
        return r.teamId === t.teamId &&
          (r.state === 'submitted' || r.state === 'back' || r.state === 'judged');
      }).length,
      stall: st.level,
      status: statusOf(t.teamId),
      /* 正在打的那一隻，跟走到哪 */
      onMs: cur ? cur.ms.title : '',
      at: cur ? RULES.progress(cur.run.pushes, cur.run.est) : 0,
      sign: signOf(t.teamId).key
    };
  });
}

/* ================= 學生的動作 ================= */

/* 承諾：拉滑桿決定幾天，順便標「哪幾段我覺得會比想的久」。
   標的是老師分的段，不是我列的八種卡關原因。 */
/* 他自己拆的那幾件，跟每一件估幾天。

   [{ n: '找到人', d: 2 }, ...]。空陣列＝沒拆，那時候 est 是他
   直接按出來的數字。 */
/* ---------- 這一趟要走幾天 ----------

   ── 本來是相加，而相加是錯的 ──

   一趟上有兩個天數，而它們本來是兩種單位：

     每一件的天數    那個人做那一件要花的工時　　人天
     run.actual      承諾到交出去中間隔了幾天　　日曆天

   相加只有在「同一時間只有一個人在做」的時候才等於日曆天。可是學生
   會分工，而分工的人是同一天各做各的——四個人各說 2 天，相加是 8 天，
   他們一個下午就交了。系統寫著承諾 8 天、實際 1 天，判定「太早」，
   偏差率 88%。

   而榜上只有 exact 算準，所以分工的組永遠排不上去；主站每一組都分工，
   那張榜整個變成雜訊。

   更糟的是 B 站不會有這個問題——一個人一隊，相加就是他的日曆天。
   兩個站因此不只差 RULES.SOLO，還差了「估算會不會被人數灌水」，
   而那正好會汙染這兩個站要比的東西。

   ── 要徑 ──

   每個人把自己那幾件相加，再取最慢的那一位。

     甲　查資料 2 天 ＋ 做出來 2 天 ＝ 4
     乙　訪談   3 天　　　　　　　　＝ 3
                                這一趟 ＝ 4 天

   這是排程裡的要徑（critical path），而它同時就是這件事本身要教的：
   分工之後，決定這一趟幾天的是最慢的那一個人，不是所有人的總和。

   一個人的時候「最慢的那一位」就是他自己，所以等於相加——B 站與
   單人的隊一格都不會動。

   沒有掛名字的件全部算成同一個人（也就是相加），那是安全的退路：
   不知道誰做的時候，只能假設是同一個人一件一件做。 */
function planDays(plan) {
  var 每人 = {};
  (plan || []).forEach(function (x) {
    var w = String((x && x.who) || '');
    每人[w] = (每人[w] || 0) + (Number(x.d) || 0);
  });
  var n = 0;
  Object.keys(每人).forEach(function (w) { if (每人[w] > n) n = 每人[w]; });
  return n;
}

/* 誰是要徑上的那一位。畫面上要講得出「最慢的是誰」——
   不然那個數字看起來就只是一個變小了的總和。 */
function planWho(plan) {
  var 每人 = {}, 誰 = '', n = 0;
  (plan || []).forEach(function (x) {
    var w = String((x && x.who) || '');
    每人[w] = (每人[w] || 0) + (Number(x.d) || 0);
  });
  Object.keys(每人).forEach(function (w) { if (每人[w] > n) { n = 每人[w]; 誰 = w; } });
  return 誰;
}

function actCommit(teamId, msId, est, flags, plan, zone, sure) {
  /* 只開得了自己那一組的。跟 ownRun 同一條理由，只是這一刻還沒有
     run 可以比，所以直接比人身上的 teamId。 */
  var who0 = (typeof S !== 'undefined' && S.who) ? userOf(S.who) : null;
  if (who0 && who0.teamId !== teamId) return null;
  var r = runOf(teamId, msId);
  if (r) return r;
  var pl = (plan || []).filter(function (x) { return x && x.n; })
    .slice(0, RULES.STEPS_MAX)
    .map(function (x) {
      return { n: String(x.n).slice(0, 24),
        d: clamp(1, RULES.EST_MAX, Number(x.d) || 1),
        /* 誰做這一件。回報的時候只有他填得了自己那幾件，
           而他的預估因此終於是「對自己的」預估。 */
        who: String(x.who || ''),
        /* 那個天數是不是本人自己按的。擋不住代填（他們常常是一起
           坐著、一台電腦規劃的），所以老實記下來——事後分得出
           「他自己說的」跟「別人幫他填的」，而那個比例本身就是一個
           值得看的東西。 */
        byOwn: x.byOwn ? 1 : 0 };
    });
  /* ── 要徑算的是起點，他們定的才是承諾 ──

     拆了件就用要徑算一個數字出來（planDays），可是那個計算不知道
     相依、不知道他們這禮拜還有三科要交、不知道他們一週只碰得到一次面。
     所以第 2 步那一格是按得動的（見 60-student.js），他們可以再調一次。

     這裡只在「沒有給數字」的時候才自己算——畫面永遠會給（見 55-ui.js
     的 ACTS.commit），沒給的是直接呼叫這一支的地方（測試、示範資料），
     那些地方要的正是「照著拆件算」。

     estCalc 兩種情況都留著：有它才分得出「他們照著算的走」跟「他們
     自己定了一個」，而那兩件事在研究上不是同一件事——後者是這一組
     真的在做預估，前者只是接受了系統的算術。 */
  var 算的 = pl.length ? planDays(pl) : 0;
  if (pl.length && !(Number(est) > 0)) est = 算的;
  r = {
    runId: nid('R'), teamId: teamId, msId: msId,
    /* 要徑算出來是幾天。跟 est 一樣的時候代表他們沒有改。 */
    estCalc: 算的,
    state: 'running',
    est: clamp(RULES.EST_MIN, RULES.EST_MAX, Number(est) || RULES.EST_DEFAULT),
    plan: pl,
    flags: flags || [],
    /* 這一趟他選的地方。不進判定——判定只讀承諾幾天與實際幾天。
       它決定的是：廊道長什麼樣、擋路的是誰、班級地下城上那一塊什麼顏色。 */
    zone: (STRATA.filter(function (z) { return z.key === zone; })[0] || {}).key || '',
    /* 他對這個天數有多少把握。不進判定——它決定的是廊道上看得到多遠，
       以及之後那句「你說『很確定』的 N 次裡準了 M 次」。 */
    sure: (RULES.sureOf(sure) || RULES.SURE[1]).key,
    committedAt: now(),
    pushes: 0, overs: [], steps: [], keep: null, stamp: null,
    /* 擋在廊道盡頭的是哪一隻，承諾那一刻就決定並存下來。
       本來是每次要用再算一次，而算的時候看的是「現在」的深度——
       所以走深了之後回頭看，過去每一趟遇到的那一隻會跟著變。
       那是假的紀錄。 */
    mob: mobFor(msId, teamId).n
  };
  DB.Runs.push(r);
  save();
  logEvent('commit', { teamId: teamId, runId: r.runId, msId: msId, est: r.est,
    zone: r.zone, sure: r.sure,
    flags: (r.flags || []).map(function (i) { return stepName(r.runId, i); }).join('、') });
  return r;
}

/* 推進：一天一次。回傳有沒有真的推到。 */
/* 推進。

     step  今天動的是老師分的第幾段（沒分段就是 -1）
     back  補登幾天前。0 是今天，1 是昨天，最多到 2。

   補登這件事看起來像作弊，其實相反：實際天數是從承諾那天到交出去
   那天算的，補登一格不會讓誰早一天完成，也不會改判定。它唯一改變的
   是走廊上少不少一盞燈——而「忘了按一天就再也補不回來」正是
   讓人整條放棄的那個崖。 */
function actPush(teamId, runId, step, back) {
  return logDay(teamId, runId, 'move', step, back);
}

/* 今天沒有動。

   跟推進一樣是一下點擊，一樣一天一次。差別在它不會讓畫面變亮，
   也不會讓停滯計時歸零——說實話不用付代價，但也買不到任何東西。
   剛好是這樣，才沒有說謊的理由。

   它唯一給的是：之後回頭看，那一天是「我說我沒動」，不是一個空格。 */
function actRest(teamId, runId, back) {
  return logDay(teamId, runId, 'rest', -1, back);
}

function logDay(teamId, runId, kind, step, back) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || r.state !== 'running') return false;
  var b = Math.max(0, Math.min(RULES.BACKFILL_MAX, Number(back) || 0));
  var when = now() - b * DAY;
  if (when < r.committedAt) return false;      /* 承諾之前的日子不算 */
  if (pushedOn(teamId, runId, dayOf(when))) return false;
  DB.Pushes.push({
    pushId: nid('P'), teamId: teamId, runId: runId, kind: kind,
    day: dayOf(when), at: when, step: (step == null ? -1 : step), back: b
  });
  /* pushes 只算真的動過的天數。判定不看它，但畫面看得到。 */
  if (kind === 'move') r.pushes++;
  save();
  logEvent(kind === 'move' ? 'push' : 'rest', {
    teamId: teamId, runId: runId, n: r.pushes,
    seg: kind === 'move' ? stepName(runId, step) : '', back: b
  });
  return true;
}

/* 勾掉／取消勾掉一段。隨時可以改——勾錯了不該是一件要去求人的事。 */
function actTickStep(teamId, runId, i) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r) return null;
  r.steps = r.steps || [];
  var k = r.steps.indexOf(i);
  if (k < 0) r.steps.push(i); else r.steps.splice(k, 1);
  /* 勾起來的那一下，同時記成「今天來過，動的是這一段」。

     這是那根岩心唯一的資料來源（見 43-core.js）。沒有這一行，
     每一趟的日誌都是空的，每一張任務之證都長成同一根斷柱。

     取消勾選不收回那一天——那天他確實來過，勾錯不改變這件事。
     logDay 一天只收一筆，所以一天勾五段還是一格。 */
  if (k < 0) logDay(teamId, runId, 'move', i, 0);
  save();
  var m = msOf(r.msId);
  logEvent('tick', {
    teamId: teamId, runId: runId,
    step: (m && m.steps && m.steps[i]) || '',
    on: k < 0 ? 1 : 0
  });
  return r;
}

/* 這一趟勾了幾段。沒有分段的任務回 null——
   沒有的東西不要畫成 0/0，那看起來像什麼都沒做。 */
/* 這一趟分成哪幾段。

   先看他自己拆的（承諾的時候列的那幾件），沒有才退回老師寫的分段。
   兩份清單合成一份：畫面上永遠只有一排段，不會有「老師的」跟
   「我的」兩排。 */
function stepsOf(runId) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r) return null;
  if (r.plan && r.plan.length) {
    /* from：這幾段是誰分的。畫面上要寫得出來——記錄那一頁本來寫死
       「老師分的段」，可是這一支先拿的是學生自己拆的那幾件，
       所以只要他們拆過件，那個標籤就是假的。 */
    return { from: 'mine',
      all: r.plan.map(function (x) { return x.n; }),
      days: r.plan.map(function (x) { return x.d; }),
      who: r.plan.map(function (x) { return x.who || ''; }),
      on: r.steps || [] };
  }
  var m = msOf(r.msId);
  if (!m || !m.steps || !m.steps.length) return null;
  return { from: 'ms', all: m.steps, on: r.steps || [] };
}

/* 這一個 run 在某一天推過了沒 */
function pushedOn(teamId, runId, day) {
  return !!find('Pushes', function (p) { return p.runId === runId && p.day === day; });
}

/* 最近幾天裡，哪幾天還沒按。回傳 [{back, label}]，只看承諾之後的日子。 */
function openDays(teamId, runId) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r) return [];
  var out = [];
  for (var b = 1; b <= RULES.BACKFILL_MAX; b++) {
    var when = now() - b * DAY;
    if (when < r.committedAt) break;
    if (!pushedOn(teamId, runId, dayOf(when))) {
      out.push({ back: b, label: b === 1 ? '昨天' : '前天' });
    }
  }
  return out;
}

/* 標／取消標「那一天我動過」。

   每天要按的那一版拿掉之後，這一份資料改成在交出去那一頁一次補齊。
   i 是從承諾那天算起的第幾天（0 起算）。

   它不進判定——判定只看承諾幾天與行事曆過了幾天——所以標不標、
   標得準不準都不會改變任何結果，也因此沒有說謊的理由。 */
function actMarkDay(teamId, runId, i) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r) return false;
  var when = r.committedAt + i * DAY;
  if (when > now() + DAY) return false;
  var day = dayOf(when);
  var has = find('Pushes', function (p) { return p.runId === runId && p.day === day; });
  if (has) {
    DB.Pushes = DB.Pushes.filter(function (p) {
      return !(p.runId === runId && p.day === day);
    });
  } else {
    DB.Pushes.push({
      pushId: nid('P'), teamId: teamId, runId: runId, kind: 'move',
      day: day, at: when, step: -1, back: 0
    });
  }
  r.pushes = where('Pushes', function (p) {
    return p.runId === runId && (p.kind || 'move') === 'move';
  }).length;
  save();
  logEvent('mark', { teamId: teamId, runId: runId, n: r.pushes });
  return true;
}

/* 這一趟的日誌。一格一天，從承諾那一天算起。

   本來這裡回的是「按過的那幾次」，所以沒按的日子根本不存在——
   看起來就像這一趟還沒開始。改成照日曆排之後，缺席看得見了。
   那不是指控，是把形狀畫出來。

   每一格三種：
     {kind:'move', step}  來過，動的是第幾段
     {kind:'rest'}        他自己說那一天沒動
     null                 沒有紀錄 */
function dayLog(runId) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r) return [];
  var end = r.submittedAt || now();
  var span = Math.max(r.est || 1, daysBetween(r.committedAt, end) + 1);
  span = Math.min(span, 60);
  var byDay = {};
  where('Pushes', function (p) { return p.runId === runId; }).forEach(function (p) {
    byDay[p.day] = { kind: p.kind || 'move', step: p.step == null ? -1 : p.step };
  });
  var out = [];
  for (var i = 0; i < span; i++) {
    out.push(byDay[dayOf(r.committedAt + i * DAY)] || null);
  }
  return out;
}

/* 這一趟動過的那幾天分別是第幾段。keepOffers 用。 */
function stepIdxOfRun(runId) {
  return where('Pushes', function (p) {
    return p.runId === runId && (p.kind || 'move') === 'move';
  }).sort(function (a, b) { return a.day - b.day; })
    .map(function (p) { return p.step == null ? -1 : p.step; });
}

/* ---------- 這一組現在是什麼狀態 ----------

   本來只有四種，而且全部從「幾天沒推進」推出來：
     ≥4 天 休息中／≥2 天 慢下來了／否則 前進中／沒任務 等派任務

   有兩個問題。

   一 · 「休息中」現在是錯的字。系統有了「今天沒有動」那顆鍵之後，
        休息變成他真的會宣告的狀態；而這個標籤講的是「四天沒推進」，
        兩件事撞在同一個字上。

   二 · 更要緊的：老師分不出「他說他沒動」跟「他完全沒有消息」。
        那是兩種完全不同的處境——一個誠實地卡住，要找他談；
        一個可能整個不見了，要找的是別的東西。系統其實知道差別
        （rest 那幾筆），只是畫面沒有用上。

   所以狀態改成看兩件事：多久沒推進、那幾天他有沒有回報。
   系統只陳述，不評價——「沒有消息」講的是紀錄，不是那一組的人。 */
function statusOf(teamId) {
  var cur = runsFor(teamId).filter(function (x) { return x.run.state === 'running'; })[0];
  if (!cur) return { key: 'idle', label: '等派任務', days: 0 };

  var st = stallOf(teamId);
  if (st.level === 0) return { key: 'move', label: '前進中', days: st.days };

  /* 沒推進的那幾天裡，他有沒有說過「今天沒有動」 */
  var log = dayLog(cur.run.runId);
  var tail = log.slice(Math.max(0, log.length - st.days));
  var told = false;
  tail.forEach(function (d) { if (d && d.kind === 'rest') told = true; });

  if (!told) return { key: 'quiet', label: '沒有消息', days: st.days };
  return st.level >= 2
    ? { key: 'stop', label: '他說在停', days: st.days }
    : { key: 'slow', label: '慢下來了', days: st.days };
}

/* 這一趟擋路的是哪一隻。戰鬥的時候存下來了就用存的——
   那才是他真的打過的那一隻。舊資料沒存就當場算一次。 */
/* 這一趟在哪一個地方。

   他自己選的那一個；舊資料沒有選過，就退回原本的算法（第幾趟＝第幾層）。
   全站只有這一支決定「這一趟是什麼顏色」，所以廊道、班級地下城、
   圖鑑三個地方永遠說同一件事。 */
function zoneOfRun(r, teamId) {
  if (r && r.zone) {
    var z = STRATA.filter(function (x) { return x.key === r.zone; })[0];
    if (z) return z;
  }
  return strataAt(r ? runDepth(r) : depthOf(teamId), teamId || (r && r.teamId));
}

/* 現在在哪一個地方。

   有正在跑的那一趟，就是他為那一趟選的地方；沒有的話（還沒承諾、
   剛交完、在等老師）用現在的深度算，那是「還沒出發」的畫面。

   全站問「現在在哪」都走這一支，不然廊道說熔火深淵、右上角說水晶迴廊。 */
function zoneNow(teamId) {
  var r = where('Runs', function (x) {
    return x.teamId === teamId && x.state === 'running';
  })[0];
  return r ? zoneOfRun(r, teamId) : strataAt(depthOf(teamId), teamId);
}

function mobOfRun(run) {
  if (!run) return null;
  if (run.mob) {
    var c = faunaByName(run.mob);
    if (c) return c;
  }
  return mobFor(run.msId, run.teamId);
}

/* 這一趟當時站在第幾層。

   depthOf 數的是「有判定的趟數」，所以在第 k 趟被判定之前，
   深度就是 k——也就是第 k 趟（從 0 起算）當時站的那一層。
   照判定的時間排，沒判定的就是現在這一層。 */
function runDepth(run) {
  if (!run || !run.stamp) return depthOf(run ? run.teamId : null);
  var mine = where('Runs', function (x) {
    return x.teamId === run.teamId && !!x.stamp;
  }).sort(function (a, b) {
    return (a.submittedAt || a.committedAt || 0) - (b.submittedAt || b.committedAt || 0);
  });
  for (var i = 0; i < mine.length; i++) {
    if (mine[i].runId === run.runId) return i;
  }
  return 0;
}

/* 圖鑑上次翻開之後，多遇到了幾隻。

   存的是「上次翻的時候有幾隻」而不是時間戳：遇到的順序不重要，
   重要的是他上次看完之後又多了幾個。0 就不掛通知。 */
function codexNew(u) {
  if (!u || !u.teamId) return 0;
  var now = Object.keys(metMobs(u.teamId)).length;
  return Math.max(0, now - (u.codexN || 0));
}
function markCodex(u) {
  if (!u || !u.teamId) return;
  var names = Object.keys(metMobs(u.teamId));
  var keeps = keepsOf(u.teamId).map(function (k) { return k.keepId; });
  if (u.codexN === names.length &&
      (u.codexSeen || []).join('|') === names.join('|') &&
      (u.keepSeen || []).join('|') === keeps.join('|')) return;
  u.codexN = names.length;
  /* 名字也記下來。數量只夠在門上掛一個「多了 N 隻」，
     要在頁面上標出「是哪幾隻」就得知道名字。 */
  u.codexSeen = names;
  /* 任務之證同一套。它跟魔物是這一頁的兩種東西，
     所以「新的」也要有兩份名單，不然翻開只有一半會亮。 */
  u.keepSeen = keeps;
  save();
}

/* 上次翻開之後新拿到的那幾張。回一個 {keepId: 1}。 */
function keepFresh(u, teamId) {
  if (!u || !teamId) return {};
  /* 跟 codexFresh 同一條退路：翻過圖鑑、但還沒記過名單的舊帳號，
     把現在有的全部當成看過的。 */
  if (!u.keepSeen && u.codexN) return {};
  var seen = {};
  (u.keepSeen || []).forEach(function (k) { seen[k] = 1; });
  var out = {};
  keepsOf(teamId).forEach(function (k) { if (!seen[k.keepId]) out[k.keepId] = 1; });
  return out;
}
function keepNew(u, teamId) { return Object.keys(keepFresh(u, teamId)).length; }

/* 上次翻開之後新遇到的那幾隻。回一個 {名字: 1}。

   這一支跟 codexNew 是同一件事的兩種粒度：門上要數量，頁面上要名字。
   兩邊都從 metMobs 減掉 codexSeen 算出來，所以不會各自算出不同的答案。 */
function codexFresh(u, teamId) {
  if (!u || !teamId) return {};
  /* 翻過圖鑑、但還沒記過名字的舊帳號：把現在遇過的全部當成看過的，
     不然改版之後第一次翻開會整頁一起亮。從來沒翻過的則全部都是新的。 */
  if (!u.codexSeen && u.codexN) return {};
  var seen = {};
  (u.codexSeen || []).forEach(function (n) { seen[n] = 1; });
  var out = {};
  Object.keys(metMobs(teamId)).forEach(function (n) { if (!seen[n]) out[n] = 1; });
  return out;
}

/* 上一趟他們說東西交在哪裡。

   不是拿來預填的——預填等於幫他決定，而「上一趟交在 TronClass、
   這一趟印出來放老師桌上」是兩件不同的事。它只是變成一顆可以點的：
   一樣是他自己選，但大部分的時候少打一次字。 */
function lastLink(teamId, runId) {
  var rs = runsFor(teamId).filter(function (x) {
    return x.run.runId !== runId && x.run.link;
  }).sort(function (a, b) {
    return (b.run.submittedAt || 0) - (a.run.submittedAt || 0);
  });
  return rs.length ? rs[0].run.link : '';
}

/* 這一組以前跟這一位打過交道嗎。

   用的是 run.mob——承諾那一刻存下來的名字，所以之後改了名字也不會
   讓一段已經發生過的相遇消失。

   跟圖鑑那一套（metMobs）刻意不同：這裡不要求老師收下。他上一次
   確實站在那條路的盡頭，所以他再來的時候應該認得你——那跟老師
   有沒有勾完全沒有關係。 */
function patSeen(teamId, name) {
  if (!name) return false;
  return runsFor(teamId).some(function (x) {
    /* 用 mobOfRun 不直接讀 run.mob：mob 是 actCommit 存的，
       示範資料那幾趟是直接組出來的，身上沒有這一欄。 */
    var m = mobOfRun(x.run);
    return !!m && m.n === name;
  });
}

/* 這一組遇過的那幾隻。全部看得到，這裡只是標出「你遇過」。 */
/* 這一趟遇到牠了沒有。

   遇到就算，不用打敗——走到自己說的那一天，牠就站在那裡了。
   交出去之後一定遇過（那一趟已經結束）。

   這一支同時是廊道上「要不要畫出牠」的判斷（見 61-scene.js），
   一個定義兩個地方用：畫面上看得到牠的那一刻，就是圖鑑記下的那一刻。

   本來 metMobs 只要 est 有值就算——那是「承諾了」，那時候他還在
   洞口，根本還沒走到。 */
/* 走到你說的那一天了沒有。

   看日曆，不看他按了幾次。這個系統不要求每天登入——本來這裡數的是
   「按過幾次往前一天」，所以不每天開的人永遠走不到盡頭、永遠遇不到
   那一隻，圖鑑因此也永遠收不到。那等於用收集品獎勵每天登入。

   停滯那一支（stallOf）本來就是看日曆的：「他不開，它也在走。」
   這裡跟它對齊。 */
function metRun(r) {
  if (!r || !r.runId) return false;
  if (r.state !== 'running') return true;
  return daysBetween(r.committedAt, now()) >= (r.est || 1);
}

/* 這一趟盡頭那一隻，是不是第一次進這一組的圖鑑。

   判斷的是「這一趟是不是這一組最早遇到牠的那一趟」，不是「圖鑑翻過了沒」——
   翻不翻圖鑑是他自己的事，而「第一次遇到」是一件已經發生的事實。
   同一隻再遇到不會再喊一次。 */
function mobDebut(teamId, runId) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r) return false;
  var m = mobOfRun(r);
  if (!m || !m.n) return false;
  var first = null;
  where('Runs', function (x) { return x.teamId === teamId; }).forEach(function (x) {
    /* 問的就是這一趟的話，它一定算——他人就站在那裡。

       本來這裡只寫 !metRun(x) 就跳過，而 metRun 對「還在走、天數還沒到」
       的那一趟回 false。結果：準時或提早交的人，第一次見到那一位
       卻被講「你又走這條」——而「初見跟再見要不一樣」正是這一段的重點。 */
    if (x.runId !== runId && !metRun(x)) return;
    var mm = mobOfRun(x);
    if (!mm || mm.n !== m.n) return;
    if (!first || (x.committedAt || 0) < (first.committedAt || 0)) first = x;
  });
  return !!first && first.runId === runId;
}

/* 這一趟是不是「這一位進圖鑑」的那一趟。

   跟 mobDebut 不一樣的地方是它跟 metMobs 用同一條線：收下才算。
   圖鑑那一頁的解鎖條件是老師收下（見下面的 metMobs），所以
   「他被收進去了」這句話也只能在那一刻說。

   本來這一句是在交出去的當下說的（戰鬥演完那一張「新登場 ·
   已收錄在圖鑑」）。那時候老師還沒看，圖鑑裡還是一個黑影——
   卡片說收好了，翻開來沒有。而且被退回再交一次，那張卡會再跳
   一次，因為它算的是「第一次遇到」，遇到了兩次。 */
function mobNewInCodex(teamId, runId) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r) return false;
  var m = mobOfRun(r);
  if (!m || !m.n) return false;
  var first = null;
  where('Runs', function (x) { return x.teamId === teamId; }).forEach(function (x) {
    if (x.state !== 'done' && x.state !== 'approved') return;
    var mm = mobOfRun(x);
    if (!mm || mm.n !== m.n) return;
    if (!first || (x.committedAt || 0) < (first.committedAt || 0)) first = x;
  });
  return !!first && first.runId === runId;
}

/* 遇過的那幾隻。 */
/* 圖鑑上收進來的那幾位。**老師收下那一件之後**才算。

   本來是走到就算（metRun）：你走到路的盡頭看到他，圖鑑就記下來。
   那一版的說法是「圖鑑是他自己的回憶，不需要另一個人確認」。

   改了。收進圖鑑的東西要有代價，不然一個學期下來每一位都會自己
   跑進來，那一頁就從「我做到的」變成「時間到了就有的」。水晶、
   任務之證、班級地下城上那一塊本來就是收下才有的——圖鑑跟它們
   站在同一邊比較說得通。

   metRun 沒有跟著改：那一支是廊道上「畫不畫得出他」的判斷
   （見 61-scene.js），他站在那裡是一件已經發生的事。 */
function metMobs(teamId) {
  var seen = {};
  runsFor(teamId).forEach(function (x) {
    if (x.run.state !== 'done' && x.run.state !== 'approved') return;
    var m = mobOfRun(x.run);
    if (m) seen[m.n] = x.ms.title;
  });
  return seen;
}

/* ---------- 一個人自己那幾件 ----------

   這一支把 plan[].who / d / spent[i] / byOwn 攤開來，只算掛在他名下的。

   ── 為什麼要有它 ──

   這整套系統在教的是「一個人學會預估自己要幾天」。可是承諾的數字是
   全組一個、判定也是全組一個——四個人共用一個準不準。那量到的是誰的
   校準？

   個人版的資料一直都在收（拆件掛在誰名下、他說幾天、他實際幾天），
   只是從來沒有一個地方算給他看。收了三個月的東西，當事人一次都
   沒看過。

   ── 它不進判定 ──

   回的是三個數字，沒有名次、沒有印章、不影響水晶、不上榜、
   RULES.judge 一個字都沒碰。它是一面鏡子，不是第二個判定。

   在團隊裡判個人是製造推卸的最快方法：一旦自己的準度有後果，
   最理性的做法就是少報一點讓別人吸收。所以這裡只印，不判。

   只算老師收下的那幾趟——跟圖鑑、跟排行榜同一條線。 */
function myItems2(userId, teamId) {
  var out = { n: 0, said: 0, got: 0, own: 0, runs: 0, rows: [] };
  if (!userId || !teamId) return out;
  where('Runs', function (r) {
    return r.teamId === teamId && (r.state === 'done' || r.state === 'approved');
  }).sort(function (a, b) {
    return (a.committedAt || 0) - (b.committedAt || 0);
  }).forEach(function (r) {
    var pl = r.plan || [], sp = r.spent || [];
    var 這趟 = 0;
    pl.forEach(function (x, i) {
      if (x.who !== userId) return;
      var d = Number(x.d) || 0, g = Number(sp[i]);
      if (!d || !(g > 0)) return;
      out.n++; out.said += d; out.got += g; 這趟++;
      if (x.byOwn) out.own++;
      out.rows.push({ n: x.n, said: d, got: g, ms: (msOf(r.msId) || {}).title || '' });
    });
    if (這趟) out.runs++;
  });
  return out;
}

/* 校準：他說「很確定」的那幾次，實際準了幾次。

   這是這套系統唯一一句他自己不知道的話。它不評價任何東西——
   只是把他當初說的把握，跟後來發生的事擺在一起。

   只算老師收下的那幾趟（跟排行榜同一條規矩）。 */
function sureOf(teamId) {
  var out = {};
  RULES.SURE.forEach(function (s) { out[s.key] = { n: 0, hit: 0 }; });
  where('Runs', function (r) {
    return r.teamId === teamId && r.stamp &&
      (r.state === 'done' || r.state === 'approved');
  }).forEach(function (r) {
    var k = r.sure || 'mid';
    if (!out[k]) return;
    out[k].n++;
    if (r.stamp === 'exact') out[k].hit++;
  });
  return out;
}

/* 已經交出去、老師還沒收下，而這個人還沒說他做了什麼的那一趟。

   回一筆就好——同時有兩趟在等老師是很少見的，而一次問一件。 */
function saidGap(teamId, userId) {
  var rs = where('Runs', function (r) {
    if (r.teamId !== teamId) return false;
    if (r.state !== 'judged' && r.state !== 'submitted' && r.state !== 'back') return false;
    return !((r.said || {})[userId]);
  });
  return rs.length ? rs[0] : null;
}

/* 這一趟裡掛在某個人名下的那幾件（回的是索引）。
   沒有指定負責人的舊資料算成大家的，才不會有人填不了。 */
function myItems(run, userId) {
  var pl = (run && run.plan) || [];
  var out = [];
  pl.forEach(function (x, i) { if (!x.who || x.who === userId) out.push(i); });
  return out;
}

/* lastWhere 拿掉了。

   它回的是上一次寫的「老師要去哪裡看」，用來預先填進下一趟——
   當初的理由是「摩擦一低，這一格才不會變成隨便打兩個字過關」。

   而它產生的是相反的東西：一路按過去，老師收到一個看起來填過、
   其實沒有人想過的位置。上一趟交在 TronClass，這一趟可能印出來
   放在他桌上，那不是同一件事。

   要人寫的地方就不要先幫他寫。 */

/* 這一趟的形狀：承諾幾天、過了幾天、來過幾天、說沒動幾天、勾了幾段。
   老師看得到這個。系統不說任何一句判斷——它只把數字擺出來。 */
function runShape(runId) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r) return null;
  var lg = dayLog(runId);
  var sp = stepsOf(runId);
  return {
    est: r.est,
    elapsed: lg.length,
    moved: lg.filter(function (d) { return d && d.kind === 'move'; }).length,
    rested: lg.filter(function (d) { return d && d.kind === 'rest'; }).length,
    blank: lg.filter(function (d) { return !d; }).length,
    steps: sp ? sp.on.length : null,
    stepsAll: sp ? sp.all.length : null
  };
}

/* estSpread（別組在同一個任務上說了幾天）與 todayMovers（今天班上
   還有幾條廊道在走）都拿掉了。前者會在按下承諾之前錨定他的預估，
   後者沒有任何人呼叫。跨組的數字只留在剖面圖與排行榜上——
   那兩處是位置與次數，不是「你應該幾天」。 */

/* 上傳：走到終點之後交出去。判定就在這一刻。 */
/* 還沒好，退出來重新想。

   原本那一趟留著當紀錄（確實承諾了幾天、確實走了幾天），但它沒有
   判定也沒有印章，所以不會進那根尺——退出去不是失準，是兩件事。
   新的一趟從今天重新算。

   如果退出去可以擦掉紀錄，每個人都會在快超時的時候退一次，
   這個系統就再也量不到任何東西。 */
function actRethink(teamId, runId) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || r.teamId !== teamId || r.state !== 'running') return false;
  if (!ownRun(r)) return false;
  r.state = 'rethought';
  r.went = Math.max(1, daysBetween(r.committedAt, now()));
  r.rethoughtAt = now();
  save();
  logEvent('rethink', { teamId: teamId, runId: runId, est: r.est, went: r.went });
  return true;
}

/* ---------- 協商：老師回一句「我覺得會是幾天」 ----------

   本來兩邊各握著一樣對方碰不到的東西：學生握承諾的天數，老師握排程
   （而排程明文不進判定，等於沒有牙齒）。那不是自主支持，是互相迴避。

   承諾走廊上其實已經把分歧畫出來了——老師排的那一天跟他按出來的格數
   並排在同一把尺上（見 60-student.js 的 estWalkIn）——然後兩邊都沒有
   動作。呈現不等於協商。

   自主不是「不受干涉」，是「出於自己的意願」。一個人可以完全自主地
   接受一個他沒訂的數字，條件是他聽得到理由、而且最後那一下是他按的。
   有審查就代表雙方都要讓一點，而讓了什麼要看得見。所以：

     · 老師可以回一次，一次而已，而且**一定要帶一句話**——
       跟退回同一條原則：沒有理由的數字就是命令
     · 學生看到之後自己決定最後幾天。維持原本那個數字也是一個答案
     · 判定一行都沒有改：判的還是最後那個數字，而那個數字是他的
     · 兩邊的數字都留在紀錄上（estFirst／askEst／est），那是
       「雙方都有妥協」的證據——這個研究本來完全沒有這一種資料

   老師讓掉的是決定權，學生讓掉的是不被質疑。
   不擋人：老師沒回，那一趟照走。 */

/* 等著老師回一句的那幾趟。全班的，跟審核同一個佇列邏輯。 */
function askQueue(classId) {
  var out = [];
  teamsUnder(classId).forEach(function (t) {
    runsFor(t.teamId).forEach(function (x) {
      if (x.run.state !== 'running') return;
      if (x.run.askAt || x.run.askSkip) return;
      out.push({ team: t, run: x.run, ms: x.ms,
        days: daysBetween(x.run.committedAt, now()) });
    });
  });
  /* 剛說的排前面。這一句話越早回越有用——走完了才說等於沒說。 */
  return out.sort(function (a, b) { return a.days - b.days; });
}

/* 老師回一句。那一句話是必要的，不是選填。 */
function actAskEst(runId, est, word) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || r.state !== 'running' || r.askAt) return null;
  if (!String(word || '').trim()) return null;
  r.askEst = clamp(RULES.EST_MIN, RULES.EST_MAX, Number(est) || r.est);
  r.askWord = String(word).trim();
  r.askBy = (typeof S !== 'undefined' && S.who) || '';
  r.askAt = now();
  save();
  logEvent('askest', { teamId: r.teamId, runId: runId, est: r.est, ask: r.askEst });
  return r;
}

/* 看過了，沒有話要說。不留下任何東西給學生看——
   「我看過但沒意見」對他沒有資訊，只會多一則通知。 */
function actAskSkip(runId) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || r.state !== 'running' || r.askAt || r.askSkip) return false;
  r.askSkip = 1;
  save();
  return true;
}

/* 學生回答：最後幾天。

   改了不算「重新想過」：那一趟還是同一趟，committedAt 不動——他已經
   走了那幾天。重新想過是打掉重來，這是同一趟上換一個數字。
   也因此不吃 redo 的額度：那個額度是給他自己反悔用的，
   不是拿來罰他聽了一句話。 */
function actAnswerAsk(teamId, runId, est) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!ownRun(r)) return null;
  if (!r || r.teamId !== teamId || r.state !== 'running') return null;
  if (!r.askAt || r.askAns) return null;
  var n = clamp(RULES.EST_MIN, RULES.EST_MAX, Number(est) || r.est);
  var was = r.est;
  if (n !== r.est) {
    /* 他一個人的時候說的那個數字。有這一欄就代表這一趟談過而且動了。 */
    r.estFirst = r.est;
    r.est = n;
  }
  r.askAns = now();
  save();
  logEvent('askans', { teamId: teamId, runId: runId,
    was: was, ask: r.askEst, now: r.est });
  return r;
}

/* ---------- 他一個人的時候說的那個數字 ----------

   一趟上有兩個天數，而它們回答的是兩個不同的問題：

     run.est        最後承諾的。判定讀這一個——他答應的是這個數字，
                    協商完就定了，之後照著它算準不準。
     estOwn(run)    他還沒聽到任何人講話之前自己說的。談過而且動了
                    才會跟上面不一樣（estFirst）。

   分開的理由：老師比學生會估。老師回一句「我覺得會是 8 天」、學生
   按下去、真的做了 8 天——判定當然算他做到了（他答應 8 天，做到 8 天），
   可是那不代表**他自己**估得準，而排行榜排的正是那一件事。

   兩邊用不同的數字，「聽得進去」跟「估得準」才不會被混成同一個分數：
   接受那一句對榜完全沒有影響，他榜上的數字永遠是他自己按下去的那一個。

   判定那一邊一個字都沒動（見 20-rules.js 的 judge）。 */
function estOwn(r) {
  return (r && r.estFirst != null) ? r.estFirst : (r ? r.est : 0);
}

/* 有沒有一句話在等他回。 */
function askPending(teamId) {
  return runsFor(teamId).filter(function (x) {
    return x.run.state === 'running' && x.run.askAt && !x.run.askAns;
  })[0] || null;
}

function actSubmit(teamId, runId, link) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || r.state !== 'running') return null;
  /* 別組的交不掉（見 ownRun）。本來這一支收了 teamId 卻沒用它。 */
  if (!ownRun(r) || r.teamId !== teamId) return null;
  r.actual = Math.max(1, daysBetween(r.committedAt, now()));
  r.stamp = RULES.judge(r.est, r.actual).key;
  r.link = link || '';
  r.submittedAt = now();
  /* 直接進老師的清單。

     本來這裡設的是 'judged'，而老師的清單只收 'submitted'（見 radar）——
     中間卡著結算那一頁：學生要再打開「看準不準」、再按一顆叫「好」的鍵，
     東西才真的送到。那顆鍵的函式叫 actSkipCamp，是舊營火流程的殘留。

     量出來的樣子：學生按完「交出去」，老師的清單還是空的。他關掉、
     以為交了；老師打開什麼都沒有。

     交出去就是交出去。看不看結算是他自己的事，不該由它決定
     東西有沒有送到。 */
  r.state = 'submitted';
  save();
  logEvent('submit', { teamId: teamId, runId: runId, est: r.est, actual: r.actual, stamp: r.stamp });
  return r;
}

/* 復盤：點圖示標籤說明卡在哪。只有失準的時候會走到。 */
/* 上之前想的那一句。

   這裡本來還有一行 r.state = 'submitted'——那是舊營火流程的殘留：
   那時候省思排在判定之後，說完才進老師的清單。省思搬到「上」之前
   以後，那一行等於跳過整個判定：actSubmit 永遠拿不到 running。

   自己當學生走一次才發現的。loop.js 抓不到，因為它直接呼叫 DB 的
   函式，不走介面——所以下面補了一條斷言。 */
/* 回報。三樣東西，都不進判定——判定只讀承諾幾天與實際幾天。

     spent  每一件實際花幾天。他承諾的時候一件一件估過，
            現在一件一件回報實際；兩欄擺在一起就是他的估算練習。
     feel   順／普通／不順。
     why    為什麼。全系統唯一的自由書寫。 */
function actReflect(teamId, runId, overs, hard, pace, o) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || !ownRun(r)) return null;
  o = o || {};
  var pl = r.plan || [];
  if (o.spent) {
    /* ── 只寫得了自己名下那幾件 ──

       本來這裡整條蓋掉。那在「只有一個人填」的年代沒問題，可是
       現在每個人都先填自己那一份（見 actMyPart），第二個人存進來
       就會把第一個人的數字洗成 0。

       同一張紙，各寫各的行——這一條在畫面上早就有了（別人那幾格
       按不動），資料層現在跟上。 */
    var prev = r.spent || pl.map(function () { return 0; });
    var mine = (typeof S !== 'undefined' && S.who) ? myItems(r, S.who) : null;
    r.spent = pl.map(function (x, i) {
      var v = clamp(0, RULES.EST_MAX, Number(o.spent[i]) || 0);
      if (mine && mine.indexOf(i) < 0) return clamp(0, RULES.EST_MAX, Number(prev[i]) || 0);
      return v;
    });
  }
  if (o.feel) r.feel = ({ good: 1, ok: 1, bad: 1 })[o.feel] ? o.feel : '';
  if (o.why != null) r.why = String(o.why).slice(0, 300);
  r.overs = overs || [];
  /* 他們自己寫的兩段。系統沒有給選項，也不解讀——
     這是全系統唯一的自由書寫，而那正好是「不替他們定義」的極致。 */
  r.hard = (hard || '').slice(0, 300);
  r.pace = (pace || '').slice(0, 300);
  /* 範圍有沒有變。不進判定——砍範圍是一個合法的專案決定，
     它該被記下來，不該被懲罰。但它必須被記下來，不然那兩個天數
     會在說謊：三天做完可能是因為砍了一半。 */
  if (o.scope) r.scope = ({ more: 1, same: 1, less: 1 })[o.scope] ? o.scope : '';
  /* 再給兩天會做什麼。老師覺得「可以」的關鍵不是他們做得多好，
     是他們知道自己做到哪裡。 */
  if (o.next != null) r.next = String(o.next).slice(0, 200);
  /* 這裡一度有一個 look（他指的那一處）。拿掉了——那一題每一趟都要
     再想一次，而交出去這一段是每一趟都要走的。 */
  /* 我做了什麼。一個人一行，記在自己名下——每個人各自寫，
     沒寫的人在畫面上是「還沒說」，但不擋交出去。 */
  if (o.said1 != null && (typeof S !== 'undefined') && S.who) {
    r.said = r.said || {};
    var one = String(o.said1).slice(0, 200).trim();
    if (one) r.said[S.who] = one;
  }
  save();
  logEvent('reflect', { teamId: teamId, runId: runId,
    overs: (overs || []).map(function (i) { return stepName(runId, i); }).join('、') });
  return r;
}

/* ---------- 我這一份先存起來 ----------

   交出去之前，每個人各自把自己那兩樣填進去：**他名下那幾件的實際
   天數**，跟**他做了什麼**。狀態不動，老師還看不到。

   為什麼要有這一支：

   本來只有 actReflect，而它是在按下「交出去」的同一下被呼叫的。
   所以整組四個人裡，只有按那一下的人填得到東西——其他三個人的
   廊道上那顆「做完了」已經不見了（那一趟變成 submitted），
   硬進交作業頁也是 play 狀態。

   量出來的樣子：四個人各認一件，一個人交出去之後，老師收到的是
   「乙 說 2 天／實際 0 天、丙 說 1 天／實際 0 天、丁 說 3 天／實際 0 天」，
   而「我做了什麼」只有一個人的。老師會以為那三個人什麼都沒做，
   而那是假的。

   「同一張紙各寫各的行」跟「先寫完自己的才看得到別人的」這兩條，
   在那個流程下從來沒有真的發生過——因為永遠只有一個寫的人。

   這一支只碰兩樣，而那兩樣剛好就是這個系統裡唯二屬於個人的東西。
   順不順、範圍、再兩天、東西在哪裡都是整組一個答案，由交出去的
   那個人寫。 */
function actMyPart(teamId, runId, o) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || r.teamId !== teamId) return null;
  /* 比 teamId 不是守門——那是呼叫端自己給的。看的是登入的那個人。 */
  if (!ownRun(r)) return null;
  /* 交出去之後就不能再改了——老師看的東西不可以在他眼前變。 */
  if (r.state !== 'running') return null;
  o = o || {};
  var pl = r.plan || [];
  var me0 = (typeof S !== 'undefined' && S.who) ? S.who : '';
  if (o.spent && pl.length) {
    var prev = r.spent || pl.map(function () { return 0; });
    var mine = myItems(r, me0);
    r.spent = pl.map(function (x, i) {
      if (mine.indexOf(i) < 0) return clamp(0, RULES.EST_MAX, Number(prev[i]) || 0);
      return clamp(0, RULES.EST_MAX, Number(o.spent[i]) || 0);
    });
  }
  if (o.said1 != null && me0) {
    r.said = r.said || {};
    var one = String(o.said1).slice(0, 200).trim();
    if (one) r.said[me0] = one;
  }
  save();
  logEvent('mypart', { teamId: teamId, runId: runId,
    said: Object.keys(r.said || {}).length });
  return r;
}

/* 這一趟還有幾個人沒填自己那一份。 */
function partsLeft(run) {
  if (!run) return 0;
  var mem = where('Users', function (u) { return inTeam(u, run.teamId); });
  var said = run.said || {};
  var n = 0;
  mem.forEach(function (u) { if (!said[u.userId]) n++; });
  return n;
}

/* 看過那兩個數字了。

   本來這一支叫 actSkipCamp，做的事是把 state 從 judged 推成 submitted——
   也就是「按了這一顆，老師才收得到」。那是舊營火流程的殘留，
   而它變成整條主流程唯一真正的送出鍵，卻長得像「我知道了」。

   現在送出在 actSubmit 就做完了，這一支只記「他看過了」。 */
function actSawStamp(runId) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r) return null;
  r.sawStamp = now();
  save();
  return r;
}

/* 「領裝備」那一步併進 actPickGear 了：挑完就是領完，不用再按一次。 */

/* ================= 老師的動作 ================= */

/* 派一個任務。teams 空陣列＝全班。 */
/* 老師派一個任務。steps 是他自己分的段，選填。

   分段是老師寫的，不是系統列的——這跟「系統不定義他們在做什麼」
   不衝突：老師是人，而且那是他出的題目。系統只負責記住哪幾段被勾了。

   勾一段跟每天推進是兩件事，不要混：推進是「今天我來過」（一天一次），
   勾是「這一段做完了」（隨時，幾段都可以）。兩件事都不影響判定——
   判定從頭到尾只看承諾幾天與實際幾天。 */
function actPublish(classId, o) {
  var m = {
    msId: nid('M'), classId: classId,
    /* 誰派的。三位老師共同帶一個班，所以這一欄不是用來篩的——
       它是用來寫在畫面上的：這一件是誰派的（見 70-teacher.js），
       以及匯出的時候分得出是哪一位（見 15-auth.js 的 exportCsv）。
       要發給誰是他自己點的，在 teams 那一欄。 */
    mentorId: o.mentorId || '',
    title: o.title, note: o.note || '',
    steps: (Array.isArray(o.steps) ? o.steps : []).slice(0, 12),
    teams: o.teams || [],
    /* 老師排的那一刻。0＝沒排。dueU 是他當初用的單位
       （小時／天／週），只用來決定要不要寫出幾點。
       它不進判定——判定只讀學生說幾天與實際幾天（見 RULES.judge）。 */
    due: Number(o.due) || 0,
    dueU: o.dueU || '',
    at: now()
  };
  DB.Milestones.push(m);
  save();
  logEvent('publish', { title: m.title, teams: (m.teams || []).length,
    steps: (m.steps || []).length });
  return m;
}

/* 老師排的日期還有幾天。沒排回 null。

   回的是天數不是日期，因為學生那一邊整個系統都在用天數——
   換成同一個單位他才不用在腦袋裡做一次換算。 */
/* 三個單位。老師排任務的時候腦袋裡的話是「兩週後」，不是日期。 */
var DUE_UNITS = [
  { k: 'h', name: '小時', ms: 3600000, def: 8,  max: 72 },
  { k: 'd', name: '天',   ms: DAY,     def: 7,  max: 90 },
  { k: 'w', name: '週',   ms: DAY * 7, def: 2,  max: 26 }
];
function dueUnit(k) {
  for (var i = 0; i < DUE_UNITS.length; i++) {
    if (DUE_UNITS[i].k === k) return DUE_UNITS[i];
  }
  return null;
}

/* 幾小時／幾天／幾週後，算成一個時刻。

   天與週落在那一天的最後一刻——排到 9/5，9/5 那一天還算數。
   小時是準確的時刻，因為「今天下午五點」就是那個意思。 */
function dueFrom(n, k) {
  var u = dueUnit(k);
  var q = Number(n) || 0;
  if (!u || q <= 0) return 0;
  q = Math.min(q, u.max);
  if (k === 'h') return now() + q * u.ms;
  var d = new Date(now() + q * u.ms);
  d.setHours(23, 59, 59, 0);
  return d.getTime();
}

/* 還有多久。剩不到一天就改用小時報——那時候「還有 1 天」是假的。 */
function dueIn(m) {
  if (!m || !m.due) return null;
  var left = m.due - now();
  if (left < 0) {
    return { days: Math.ceil(left / DAY), past: true, hours: 0 };
  }
  if (left < DAY) {
    return { days: 1, hours: Math.max(1, Math.round(left / 3600000)),
      past: false };
  }
  return { days: Math.ceil(left / DAY), hours: 0, past: false };
}

/* 還有多久，寫成一句。 */
function dueLeftSay(m) {
  var d = dueIn(m);
  if (!d) return '';
  if (d.past) return '過了 ' + (-d.days) + ' 天';
  if (d.hours) return '還有 ' + d.hours + ' 小時';
  return '還有 ' + d.days + ' 天';
}

/* 排的那一刻，寫成人看的樣子。用小時排的才寫幾點——
   天與週落在那一天的最後一刻，寫 23:59 只會讓人以為那是個規定。 */
function dueSay(m) {
  if (!m || !m.due) return '';
  var d = new Date(m.due);
  var s = (d.getMonth() + 1) + '/' + d.getDate();
  if (m.dueU !== 'h') return s;
  var mm = d.getMinutes();
  return s + ' ' + d.getHours() + ':' + (mm < 10 ? '0' + mm : mm);
}

/* 交出去之後排在哪裡。

   老師那一頁照「等最久」排，所以他的位置是算得出來的。回 null
   代表這一趟不在等——沒有東西要說的時候就不要說。

   給學生看的是位置與天數，不是「老師很慢」。被催的應該是老師，
   而催老師這件事不該由學生端的畫面來做。 */
function waitAt(runId) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || r.state !== 'submitted') return null;
  var t = teamOf(r.teamId);
  if (!t) return null;
  /* 全班同一個佇列，所以他排第幾是算得出來的。 */
  var q = radar(t.classId);
  for (var i = 0; i < q.length; i++) {
    if (q[i].run.runId === runId) {
      return { at: i + 1, of: q.length,
        days: daysBetween(r.submittedAt, now()) };
    }
  }
  return null;
}

/* 這一個班有沒有開排行榜。預設關。 */
function rankOn(classId) {
  var c = find('Classes', function (x) { return x.classId === classId; });
  return !!(c && c.rank);
}

function actSetRank(classId, on) {
  var c = find('Classes', function (x) { return x.classId === classId; });
  if (!c) return null;
  c.rank = !!on;
  save();
  logEvent('rank', { on: c.rank ? 1 : 0 });
  return c;
}

/* 老師的雷達：誰交了、等多久了 */
/* 等你看的那幾件，全班的。三位老師共用一個佇列：誰有空誰看，
   有人請假的那一週學生不會卡在那裡。

   是誰派的那一件寫在列上（見 70-teacher.js），所以「這件本來是誰的事」
   看得到——要留給他就留給他。那是三個人之間可以商量的事，
   不是系統該替他們擋掉的事。 */
function radar(classId, mentorId) {
  var out = [];
  teamsUnder(classId, mentorId).forEach(function (t) {
    runsFor(t.teamId).forEach(function (x) {
      if (x.run.state !== 'submitted') return;
      out.push({
        team: t, run: x.run, ms: x.ms,
        waited: daysBetween(x.run.submittedAt, now())
      });
    });
  });
  out.sort(function (a, b) { return b.waited - a.waited; });
  /* 同一件委託的排在一起。

     真實的批改是「一次改同一份作業的三組」——標準在腦袋裡剛熱好，
     連著改最快。本來只照等最久排，同一件會被別件打散，他要在三份
     不同的標準之間來回切換。

     群跟群之間還是照等最久：那一群裡等最久的那一件決定它排第幾。
     所以「先看哪一件」這個答案沒有變，只是它後面跟著同一件的其他組。 */
  var byMs = {}, order = [];
  out.forEach(function (x) {
    var k = x.ms ? x.ms.msId : '-';
    if (!byMs[k]) { byMs[k] = []; order.push(k); }
    byMs[k].push(x);
  });
  var g = [];
  order.forEach(function (k) {
    byMs[k].forEach(function (x) { g.push(x); });
  });
  return g;
}

/* 老師勾「可以」。他不選裝備——選哪一件是學生的事。
   他能加一句話，那句話才是他的回饋。 */
/* 退回：還沒收下。

   判定完全不動——那一趟的兩個數字在他交出去的當下就定了，
   重做不會讓他當初說的話變成別的話。深度也不動，他確實走過那幾天。
   不動的東西這麼多，是因為退回講的只有一件事：那份成果還沒被收下。

   必須帶一句話。不寫理由的退回等於「再做一次，但我不告訴你為什麼」。 */
function actReject(runId, word) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || r.state !== 'submitted') return null;
  if (!String(word || '').trim()) return null;
  r.word = word;
  /* 退回那一句更要署名：學生要知道去找誰問。 */
  r.wordBy = (typeof S !== 'undefined' && S.who) || '';
  r.state = 'back';
  r.backAt = now();
  r.backs = (r.backs || 0) + 1;
  save();
  logEvent('reject', { teamId: r.teamId, runId: runId, len: String(word).length });
  return r;
}

/* 改好了再交一次。回到老師那一排，判定還是原來那一個。 */
function actResend(teamId, runId, link) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || r.teamId !== teamId || r.state !== 'back') return false;
  if (!ownRun(r)) return false;
  /* 改過的位置要跟著更新。

     本來這一支不收 link，而重交那一條路走的就是它——所以學生在
     畫面上把「東西在哪裡」改掉、按了交出去，老師收到的還是上一次
     那個位置。老師退回最常見的理由偏偏就是「我找不到你的東西」，
     那正好是這一格唯一會被改的時候。

     空的不覆蓋：那一題必填（見 67-battle.js），走到這裡一定有字，
     但別條路叫這一支的時候不該把它清掉。 */
  var wh = String(link == null ? '' : link).trim();
  if (wh) r.link = wh;
  r.state = 'submitted';
  r.submittedAt = r.submittedAt || now();
  save();
  logEvent('resend', { teamId: teamId, runId: runId, backs: r.backs || 1 });
  return true;
}

/* 老師勾一個「可以」。

   勾下去那一刻就是完成：任務之證當場發下去。

   本來中間還有一步——學生要再走到一頁去按「收起來」。那一步
   不產生任何東西，只是叫他確認一次自己已經做完、而且老師也已經
   勾過的事。approved 這個狀態因此也不再出現。 */
/* 這一組的水晶。不存起來，每次算——存起來就會有兩份真相。

     基本   一件收下的委託 100 份
     加成   老師收下時給的 1–5 份

   加成一趟 10–50 顆，佔一趟總額的 9–33%——所以這個數字**不再**
   幾乎等於「他們完成了幾件」，老師給多給少看得出來。
   （本來是 1–5 份、最多佔 5%，那時候它幾乎就是完成件數。） */
function crystalOf(teamId) {
  var base = 0, bonus = 0;
  where('Runs', function (r) {
    return r.teamId === teamId && (r.state === 'done' || r.state === 'approved');
  }).forEach(function (r) {
    base += RULES.CRYSTAL.base;
    bonus += Math.max(0, Math.min(RULES.CRYSTAL.bonusMax, Number(r.bonus) || 0));
  });
  /* 進場那 200 也算在裡面（見 20-rules.js 的 start）。
     它讓「走完一件就點得起一位」成立，而每一組拿到的一樣多，
     所以榜上的排序不受影響。 */
  var 拿過 = RULES.CRYSTAL.start + base + bonus;
  var 用掉 = litMobs(teamId).length * RULES.CRYSTAL.light;
  /* all 是**拿過的總數**，不是手上剩下的。

     榜上排的是 all，所以點亮不會讓一組在榜上退步——不然那張榜就會
     變成「不要用它」的壓力，而一個沒有人敢用的用途等於沒有用途。

     left 是手上剩下的，那是他要做決定的時候看的數字。 */
  return { base: base, bonus: bonus, all: 拿過, used: 用掉, left: 拿過 - 用掉 };
}

/* ---------- 用水晶照亮的那幾位 ----------

   存在隊伍那一筆上（t.lit）。一個欄位同時是「花了多少」跟「解鎖了誰」
   ——兩份紀錄會不同步，一份不會。 */
function litMobs(teamId) {
  var t = teamOf(teamId);
  return (t && Array.isArray(t.lit)) ? t.lit : [];
}
function isLit(teamId, name) {
  return litMobs(teamId).indexOf(name) >= 0;
}

/* 點亮一位。

   擋四件事：不是自己組的、沒有這一位、已經看得到了、水晶不夠。
   已經遇過的不用點——那是白花，而且畫面上不該給他一顆會浪費東西的鍵。 */
function actLight(teamId, name) {
  var t = teamOf(teamId);
  if (!t) return { err: '找不到這一組。' };
  /* 只點得亮自己組的（跟 ownRun 同一條理由）。 */
  var who = (typeof S !== 'undefined' && S.who) ? userOf(S.who) : null;
  if (who && who.teamId !== teamId) return { err: '那不是你的圖鑑。' };
  var 有 = false;
  allFauna().forEach(function (c) { if (c.n === name) 有 = true; });
  if (!有) return { err: '沒有這一位。' };
  if (metMobs(teamId)[name]) return { err: '你們已經遇過他了。' };
  if (isLit(teamId, name)) return { err: '已經照亮過了。' };
  var o = crystalOf(teamId);
  if (o.left < RULES.CRYSTAL.light) {
    return { err: '水晶不夠。還差 ' + (RULES.CRYSTAL.light - o.left) + ' 顆。' };
  }
  t.lit = litMobs(teamId).concat([name]);
  save();
  logEvent('light', { teamId: teamId, who: name, cost: RULES.CRYSTAL.light });
  return { name: name };
}

function actApprove(runId, word, bonus) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || (r.state !== 'submitted' && r.state !== 'back')) return null;
  var s = runShape(runId);
  r.word = word || '';
  /* 誰說的。一個班三位老師共同帶，那一句話沒有署名的話，學生讀到的
     會是「系統說的」——而這整個作品立在「系統給資訊，人給承認」上，
     承認要有一個人，不然它就退回成一個自動回覆。 */
  r.wordBy = (typeof S !== 'undefined' && S.who) || '';
  /* 老師給的那幾顆。收下就一定有，最少 1——0 會被讀成負評，
     而「他沒有特別想說什麼」跟「他覺得這份差」是兩件事。 */
  r.bonus = Math.max(RULES.CRYSTAL.bonusMin,
    Math.min(RULES.CRYSTAL.bonusMax, Number(bonus) || RULES.CRYSTAL.bonusMin));
  r.approvedAt = now();
  r.state = 'done';
  r.doneAt = now();

  var tm = teamOf(r.teamId);
  if (tm) tm.claims = (tm.claims || 0) + 1;

  /* 任務之證。一趟一張，老師收下才有。

     名字在這一刻就定下來，不是每次顯示才去查任務名——老師之後改了
     任務名，他手上那一張不會跟著變成別的東西。 */
  var mz = msOf(r.msId);
  DB.Keeps.push({
    keepId: nid('K'), teamId: r.teamId, runId: runId,
    name: (mz && mz.title) || '', at: now(),
    /* 剛走完的那一層，不是接下來要走的那一層。 */
    zone: strataAt(Math.max(0, depthOf(r.teamId) - 1), r.teamId).key,
    px: coreOf(runId),
    est: s.est, elapsed: s.elapsed, moved: s.moved,
    rested: s.rested, blank: s.blank
  });
  save();
  logEvent('approve', { teamId: r.teamId, runId: runId, len: String(word || '').length });
  return r;
}

/* 你不在的時候老師勾了哪幾件。

   「收起來」那一步拿掉之後，老師那一句話就沒有一個落點了——而它是
   整條流程裡唯一「別人為你做了一件事」的時刻。改成回廊道時的一張
   通知：他不用做任何事，但那句話會在他面前。 */
function okSince(teamId, cut) {
  if (!cut) return [];
  return where('Runs', function (r) {
    return r.teamId === teamId && r.doneAt && r.doneAt > cut;
  }).sort(function (a, b) { return b.doneAt - a.doneAt; });
}

/* 封存一根岩心。

   本來這裡是「三張裡挑一張」，那三張全是他兩秒前才看過的數字——
   挑一張等於挑「等一下要再看到哪一個你已經知道的事」。
   沒有新資訊、沒有意外，而且挑錯沒代價、挑對沒好處。

   現在：那一趟的紀錄長成一根岩心（見 43-core.js），
   形狀完全由那一趟決定。那是同一份資料的一個他沒見過的形狀，
   所以真的有東西可看。名字選填——他不取，它一樣存得下來。

   存的是當下算出來的像素圖與數字，不是 runId 的一個指標：
   規則以後改了，他封存的那一根不會跟著變成別的樣子。 */

/* 改寫專案名稱。這是學生自己做的——招牌上寫什麼是他們的事，
   老師不替他們命名。改名字不會動到招牌的材質（那個吃深度）。 */
function actRename(teamId, name) {
  var t = teamOf(teamId);
  if (!t) return null;
  if (String(t.project || '') === String(name)) return null;
  var old = t.project;
  t.project = name;
  save();
  logEvent('rename', { teamId: teamId, name: name, from: old });
  return t;
}

/* 還沒寫過的那幾組先掛這一句。

   它不描述任何一組，所以系統沒有替誰下形容詞——它只是一句
   每一組都成立的話。要變成他們自己的，改掉就是。

   存在顯示那一層，不寫進資料：沒改過的組，Team.blurb 還是空的。
   先幫他們寫一筆再說那是他們寫的，那是假的。 */
var BLURB0 = '我要完成我的專案!';

/* 給自己的形容。這一組自己寫，別組看得到、改不動。

   跟專案名是兩件事：專案名是「我們在做什麼」，形容是「我們是什麼樣的組」。
   系統一個字都不寫——它不對任何一組下形容詞。 */
function actBlurb(teamId, text) {
  var t = teamOf(teamId);
  if (!t) return null;
  t.blurb = String(text || '').slice(0, 60);
  save();
  logEvent('blurb', { teamId: teamId, len: t.blurb.length });
  return t;
}

/* ---------- 這一趟的段 ----------

   本來這裡是那一組自己寫的一份清單。老師開始分段之後，那份清單就
   多餘了——分段是老師寫的，是這一次的題目本身，而且不用先做設定。
   這個系統要能在專案中途才開始用，多一道「先寫清單」等於多一道門。

   系統一樣沒有定義任何東西：那幾個字是老師打的。 */
function stepNames(runId) {
  var s = stepsOf(runId);
  return s ? s.all : [];
}

function stepName(runId, i) {
  var a = stepNames(runId);
  return a[i] == null ? '' : a[i];
}

/* 這一組留下過的那些話 */
function keepsOf(teamId) {
  return where('Keeps', function (g) { return g.teamId === teamId; });
}

/* ---------- 出口 ----------

   往下走不出去：六層是隨機給的，而且一直循環（見 13-strata.js）。
   唯一的出口是把手上這個專案做完。

   兩件事要說清楚，因為很容易做歪：

   一 · 「做完了」不是系統算出來的。系統不知道他們的專案有幾件事、
        也不知道走到哪——尤其這個系統本來就要能在專案進行到一半的時候
        才開始用。所以是他們自己宣告，老師確認。

   二 · 開門的條件只有「做完了」，不是「估得夠準」。一旦準度變成門檻，
        系統就在判定他規劃得夠不夠好，那是這個作品從頭到尾拒絕做的事。
        準度決定的是走出去的時候帶著什麼——同一道門，不同的故事。
        check.js 有一條在守這件事。 */
function actAskExit(teamId) {
  var t = teamOf(teamId);
  if (!t || t.leftAt) return null;
  t.exitAsk = now();
  /* 再說一次就把上次那個答案收起來——那句話是回上一次的，不是回這一次。 */
  t.exitNo = 0;
  save();
  logEvent('askexit', { teamId: teamId });
  return t;
}

function actCancelExit(teamId) {
  var t = teamOf(teamId);
  if (!t || t.leftAt) return null;
  t.exitAsk = 0;
  save();
  return t;
}

/* 老師說「現在還不是時候」。

   不動判定、不動深度、不動任何一張任務之證——它只說一件事：
   這個專案還沒結束。學生那邊看得到這個答案，而且隨時可以再說一次。 */
function actDenyExit(teamId) {
  var t = teamOf(teamId);
  if (!t || !t.exitAsk || t.leftAt) return null;
  t.exitAsk = 0;
  t.exitNo = now();
  save();
  logEvent('denyexit', { teamId: teamId });
  return t;
}

/* 老師確認。他寫的那一句會留在出口那一頁上。 */
function actLetGo(teamId, word) {
  var t = teamOf(teamId);
  /* 門開著才走得出去。本來只看他自己說過要走——
     那樣「老師允許」就不存在了。 */
  if (!t || !t.exitOk || t.leftAt) return null;
  t.leftAt = now();
  t.exitWord = word || '';
  t.exitAsk = 0;
  save();
  logEvent('left', { teamId: teamId });
  return t;
}

/* 走出去的時候帶著的東西。全部是他們自己的紀錄，沒有一項是評分。 */
function exitRecord(teamId) {
  var runs = runsFor(teamId).filter(function (x) { return x.run.stamp; });
  var acc = accuracyOf(teamId);
  var d = depthOf(teamId);
  var zones = {};
  for (var i = 0; i < d; i++) zones[strataAt(i, teamId).key] = 1;
  return {
    runs: runs, acc: acc, depth: d,
    cycles: cycleAt(d),
    zones: STRATA.filter(function (z) { return zones[z.key]; }),
    keeps: keepsOf(teamId),
    days: where('Pushes', function (p) { return p.teamId === teamId; }).length
  };
}

/* 老師開門。開了學生才點得動廊道上那扇出口。
   收回來也可以——他還沒走出去之前，那扇門一直是老師的。 */
function actOpenExit(teamId, on) {
  var t = teamOf(teamId);
  if (!t || t.leftAt) return null;
  t.exitOk = on ? now() : 0;
  save();
  logEvent(on ? 'exitopen' : 'exitshut', { teamId: teamId });
  return t;
}

/* 等著老師確認出口的那幾組。跟 radar 一樣，全班的。 */
function exitQueue(classId, mentorId) {
  return teamsUnder(classId, mentorId).filter(function (t) {
    return t.exitAsk && !t.leftAt;
  });
}

/* 這一趟的三個角度。本來是「攤開三張挑一張」，那個動作拿掉了
   （見 actSeal）；這三句話留著，因為它們是承諾那一頁要給他看的
   ——他自己上一趟的事實，在他要決定下一趟花幾天的那一刻。 */
function keepOffers(runId) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r) return [];
  var out = [];

  /* 一 · 這幾天你在做什麼 */
  var ids = stepIdxOfRun(runId).filter(function (i) { return i >= 0; });
  var n = {}, top = null;
  ids.forEach(function (i) { n[i] = (n[i] || 0) + 1; if (top === null || n[i] > n[top]) top = i; });
  var topName = top === null ? '' : stepName(runId, top);
  out.push({
    key: 'days',
    line: topName
      ? '這 ' + r.pushes + ' 天裡，有 ' + n[top] + ' 天你動的是「' + topName + '」。'
      : '這一趟你來了 ' + r.pushes + ' 天。'
  });

  /* 二 · 你估得怎麼樣。只有兩個數字跟一段算出來的範圍。 */
  var b = RULES.band(r.est);
  out.push({
    key: 'est',
    line: '你估 ' + r.est + ' 天，走了 ' + r.actual + ' 天。' +
          '你自己說的範圍是 ' + Math.max(1, r.est - b) + ' 到 ' + (r.est + b) + ' 天。'
  });

  /* 三 · 哪一件比你想的久。這是他們在營火自己說的。 */
  var ov = (r.overs || []).map(function (i) { return stepName(runId, i); })
    .filter(Boolean);
  var fl = r.flags || [];
  var hit = (r.overs || []).filter(function (id) { return fl.indexOf(id) >= 0; });
  out.push({
    key: 'over',
    line: ov.length
      ? '你說「' + ov.join('」「') + '」比你想的久。' +
        (hit.length ? '承諾的時候你就標了它。' : '承諾的時候你沒有標到它。')
      : '這一趟你沒有說哪一件比想的久。'
  });

  return out;
}

/* 日期寫成「9/2」。紀錄那一頁要的是「什麼時候走的」，
   不是完整的時間戳——年份對一個學期之內的紀錄沒有意義。 */
function dayText(ts) {
  if (!ts) return '';
  var d = new Date(ts);
  return (d.getMonth() + 1) + '/' + d.getDate();
}
