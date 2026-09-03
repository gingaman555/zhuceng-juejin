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
    Users: [], Classes: [], Roster: [], Teams: [],
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

function nid(p) { return p + (DB.Config.seq++); }
function save() { try { localStorage.setItem(STORE, JSON.stringify(DB)); } catch (e) {} }
function load() {
  try { DB = JSON.parse(localStorage.getItem(STORE)); } catch (e) { DB = null; }
  return !!(DB && DB.Users && DB.Users.length);
}
function find(tbl, fn) { for (var i = 0; i < DB[tbl].length; i++) if (fn(DB[tbl][i])) return DB[tbl][i]; return null; }
function where(tbl, fn) { return DB[tbl].filter(fn); }

function teamOf(id) { return find('Teams', function (t) { return t.teamId === id; }); }
function userOf(id) { return find('Users', function (u) { return u.userId === id; }); }
function msOf(id) { return find('Milestones', function (m) { return m.msId === id; }); }
/* 這一組在這個任務上的那一趟。

   「重新想過」的那幾趟要跳過：它們留在資料庫裡當紀錄，但那個任務
   對這一組來說是重新開始的，所以要讓畫面回到「還沒承諾」。 */
function runOf(teamId, msId) {
  return find('Runs', function (r) {
    return r.teamId === teamId && r.msId === msId && r.state !== 'rethought';
  });
}

/* ---------- 一組看得到哪些任務 ---------- */
/* 這一組收得到哪幾個任務。

   三層篩：同一個課程 → 派的人帶不帶這一組 → 有沒有指名哪幾組。
   中間那一層是新的：老師對任務規劃有自己的自主性，所以他派的
   東西不會落到別位老師帶的組上。

   兩邊都可以是空的，空的就不篩——舊資料（沒有 mentorId 的任務、
   還沒指定老師的組）行為跟以前一模一樣。 */
function msFor(teamId) {
  var t = teamOf(teamId);
  if (!t) return [];
  return where('Milestones', function (m) {
    if (m.classId !== t.classId) return false;
    if (m.mentorId && t.mentorId && m.mentorId !== t.mentorId) return false;
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
  var judged = rows.filter(function (x) { return x.run.state === 'judged'; })[0];
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

/* ---------- 誰帶哪幾組 ----------

   一個課程三位老師，每位帶不同的組。mentorId 空的組還沒指定，
   那時候每位老師都看得到它——不然剛貼完名冊的組會沒有人管。 */
function teachersOf(classId) {
  return where('Users', function (u) {
    return u.role === 'teacher' && u.classId === classId;
  });
}

/* 這位老師要處理的那幾組。mentorId 沒給就是整個課程。 */
function teamsUnder(classId, mentorId) {
  return where('Teams', function (t) {
    if (t.classId !== classId) return false;
    if (!mentorId) return true;
    return !t.mentorId || t.mentorId === mentorId;
  });
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
function planDays(plan) {
  var n = 0;
  (plan || []).forEach(function (x) { n += Number(x.d) || 0; });
  return n;
}

function actCommit(teamId, msId, est, flags, plan, zone) {
  var r = runOf(teamId, msId);
  if (r) return r;
  var pl = (plan || []).filter(function (x) { return x && x.n; })
    .slice(0, RULES.STEPS_MAX)
    .map(function (x) {
      return { n: String(x.n).slice(0, 24),
        d: clamp(1, RULES.EST_MAX, Number(x.d) || 1) };
    });
  /* 列了就是加起來。永遠只有一個地方在輸入。 */
  if (pl.length) est = planDays(pl);
  r = {
    runId: nid('R'), teamId: teamId, msId: msId,
    state: 'running',
    est: clamp(RULES.EST_MIN, RULES.EST_MAX, Number(est) || RULES.EST_DEFAULT),
    plan: pl,
    flags: flags || [],
    /* 這一趟他選的地方。不進判定——判定只讀承諾幾天與實際幾天。
       它決定的是：廊道長什麼樣、擋路的是誰、班級地下城上那一塊什麼顏色。 */
    zone: (STRATA.filter(function (z) { return z.key === zone; })[0] || {}).key || '',
    committedAt: now(),
    pushes: 0, overs: [], steps: [], keep: null, stamp: null,
    /* 擋在廊道盡頭的是哪一隻，承諾那一刻就決定並存下來。
       本來是每次要用再算一次，而算的時候看的是「現在」的深度——
       所以走深了之後回頭看，過去每一趟遇到的那一隻會跟著變。
       那是假的紀錄。 */
    mob: mobFor(msId, teamId, null, zone).n
  };
  DB.Runs.push(r);
  save();
  logEvent('commit', { teamId: teamId, runId: r.runId, msId: msId, est: r.est,
    zone: r.zone,
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
    return { all: r.plan.map(function (x) { return x.n; }),
      days: r.plan.map(function (x) { return x.d; }),
      on: r.steps || [] };
  }
  var m = msOf(r.msId);
  if (!m || !m.steps || !m.steps.length) return null;
  return { all: m.steps, on: r.steps || [] };
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
  return mobFor(run.msId, run.teamId, runDepth(run));
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
  if (u.codexN === names.length &&
      (u.codexSeen || []).join('|') === names.join('|')) return;
  u.codexN = names.length;
  /* 名字也記下來。數量只夠在門上掛一個「多了 N 隻」，
     要在頁面上標出「是哪幾隻」就得知道名字。 */
  u.codexSeen = names;
  save();
}

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

/* 遇過的那幾隻。 */
function metMobs(teamId) {
  var seen = {};
  runsFor(teamId).forEach(function (x) {
    if (!metRun(x.run)) return;
    var m = mobOfRun(x.run);
    if (m) seen[m.n] = x.ms.title;
  });
  return seen;
}

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
  r.state = 'rethought';
  r.went = Math.max(1, daysBetween(r.committedAt, now()));
  r.rethoughtAt = now();
  save();
  logEvent('rethink', { teamId: teamId, runId: runId, est: r.est, went: r.went });
  return true;
}

function actSubmit(teamId, runId, link) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || r.state !== 'running') return null;
  r.actual = Math.max(1, daysBetween(r.committedAt, now()));
  r.stamp = RULES.judge(r.est, r.actual).key;
  r.link = link || '';
  r.submittedAt = now();
  r.state = 'judged';
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
  if (!r) return null;
  o = o || {};
  var pl = r.plan || [];
  if (o.spent) {
    r.spent = pl.map(function (x, i) {
      return clamp(0, RULES.EST_MAX, Number(o.spent[i]) || 0);
    });
  }
  if (o.feel) r.feel = ({ good: 1, ok: 1, bad: 1 })[o.feel] ? o.feel : '';
  if (o.why != null) r.why = String(o.why).slice(0, 300);
  r.overs = overs || [];
  /* 他們自己寫的兩段。系統沒有給選項，也不解讀——
     這是全系統唯一的自由書寫，而那正好是「不替他們定義」的極致。 */
  r.hard = (hard || '').slice(0, 300);
  r.pace = (pace || '').slice(0, 300);
  save();
  logEvent('reflect', { teamId: teamId, runId: runId,
    overs: (overs || []).map(function (i) { return stepName(runId, i); }).join('、') });
  return r;
}

/* 準時的直接排進老師的雷達，不用復盤 */
function actSkipCamp(runId) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r) return null;
  r.state = 'submitted';
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
    /* 誰派的。他派的東西只到他帶的組（見 msFor）——
       任務規劃與步調是每位老師自己的事。 */
    mentorId: o.mentorId || '',
    title: o.title, note: o.note || '',
    steps: (o.steps || []).slice(0, 12),
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
  var q = radar(t.classId, t.mentorId);
  for (var i = 0; i < q.length; i++) {
    if (q[i].run.runId === runId) {
      return { at: i + 1, of: q.length,
        days: daysBetween(r.submittedAt, now()) };
    }
  }
  return null;
}

/* 這一組給哪一位老師帶。空字串＝收回來，變成大家都看得到。 */
function actMentor(teamId, mentorId) {
  var t = teamOf(teamId);
  if (!t) return false;
  t.mentorId = mentorId || '';
  save();
  return true;
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
/* 等你看的那幾件。只有自己帶的組——三位老師共用一個課程，
   同一個佇列會讓 A 老師勾到 B 老師的組。 */
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
  return out.sort(function (a, b) { return b.waited - a.waited; });
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
  r.state = 'back';
  r.backAt = now();
  r.backs = (r.backs || 0) + 1;
  save();
  logEvent('reject', { teamId: r.teamId, runId: runId, len: String(word).length });
  return r;
}

/* 改好了再交一次。回到老師那一排，判定還是原來那一個。 */
function actResend(teamId, runId) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || r.teamId !== teamId || r.state !== 'back') return false;
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
function actApprove(runId, word) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || (r.state !== 'submitted' && r.state !== 'back')) return null;
  var s = runShape(runId);
  r.word = word || '';
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

/* 等著老師確認出口的那幾組。跟 radar 一樣只看自己帶的。 */
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
