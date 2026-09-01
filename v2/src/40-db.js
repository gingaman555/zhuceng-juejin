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
    /* 里程碑：老師派的。同一個里程碑可以只發給某幾組。 */
    Milestones: [],
    /* 一組在一個里程碑上的狀態。這張表是整個系統的心臟。 */
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
function runOf(teamId, msId) {
  return find('Runs', function (r) { return r.teamId === teamId && r.msId === msId; });
}

/* ---------- 一組看得到哪些里程碑 ---------- */
function msFor(teamId) {
  var t = teamOf(teamId);
  if (!t) return [];
  return where('Milestones', function (m) {
    return m.classId === t.classId && (!m.teams.length || m.teams.indexOf(teamId) >= 0);
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
     他們還看得到留下的、全班地下城、紀錄，只是不再被派任務。 */
  var tm = teamOf(teamId);
  if (tm && tm.leftAt) return { kind: 'left' };
  if (tm && tm.exitAsk) return { kind: 'waitexit' };

  var rows = runsFor(teamId);
  /* 1. 交了、判定出來了、還沒按「好」。
     省思那一題搬到交出去之前了，所以這裡不再分岔——
     每一個人都想過一次，不是只有失準的人。 */
  var judged = rows.filter(function (x) { return x.run.state === 'judged'; })[0];
  if (judged) return { kind: 'stamped', row: judged };
  /* 2. 老師勾可以了，還沒挑裝備 */
  var gear = rows.filter(function (x) { return x.run.state === 'approved'; })[0];
  if (gear) return { kind: 'gear', row: gear };
  /* 3. 正在做的那一趟。

     這一條排在「還沒承諾的」前面，順序很要緊：反過來的話，老師派了
     三個里程碑，學生會被連問三次要花幾天，而且從頭到尾看不到自己
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

/* 深度＝完成過幾個里程碑。沒有終點。 */
function depthOf(teamId) {
  return where('Runs', function (r) {
    return r.teamId === teamId && r.state === 'done';
  }).length;
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

/* ---------- 全班生態 ----------
   沒有名次。只有「誰在哪一條廊道、走到多深、現在是什麼狀態」。 */
function ecology(classId) {
  return where('Teams', function (t) { return t.classId === classId; }).map(function (t) {
    var st = stallOf(t.teamId);
    var cur = runsFor(t.teamId).filter(function (x) { return x.run.state === 'running'; })[0];
    return {
      teamId: t.teamId, name: t.name,
      depth: depthOf(t.teamId),
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
function actCommit(teamId, msId, est, flags) {
  var r = runOf(teamId, msId);
  if (r) return r;
  r = {
    runId: nid('R'), teamId: teamId, msId: msId,
    state: 'running',
    est: clamp(RULES.EST_MIN, RULES.EST_MAX, Number(est) || RULES.EST_DEFAULT),
    flags: flags || [],
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

/* 這一趟勾了幾段。沒有分段的里程碑回 null——
   沒有的東西不要畫成 0/0，那看起來像什麼都沒做。 */
function stepsOf(runId) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r) return null;
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

/* 這一趟擋路的是哪一隻。舊資料沒存就當場算一次。 */
function mobOfRun(run) {
  if (run && run.mob) {
    var c = faunaByName(run.mob);
    if (c) return c;
  }
  return mobFor(run.msId, run.teamId);
}

/* 這一組遇過的那幾隻。全部看得到，這裡只是標出「你遇過」。 */
function metMobs(teamId) {
  var seen = {};
  runsFor(teamId).forEach(function (x) {
    if (!x.run.est) return;
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

/* 今天班上有幾條廊道今天也有人在走。
   這不是名次——它不排序、不比大小，只回答「今天只有我一個人在下面嗎」。 */
function todayMovers(classId, exceptTeam) {
  var day = dayOf(now());
  var seen = {};
  where('Teams', function (t) { return t.classId === classId; }).forEach(function (t) {
    if (t.teamId === exceptTeam) return;
    if (find('Pushes', function (p) { return p.teamId === t.teamId && p.day === day; })) {
      seen[t.teamId] = 1;
    }
  });
  return Object.keys(seen).length;
}

/* 上傳：走到終點之後交出去。判定就在這一刻。 */
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
function actReflect(teamId, runId, overs) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r) return null;
  r.overs = overs || [];
  r.state = 'submitted';        /* 說完才排進老師的審核清單 */
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

/* 派一個里程碑。teams 空陣列＝全班。 */
/* 老師派一個里程碑。steps 是他自己分的段，選填。

   分段是老師寫的，不是系統列的——這跟「系統不定義他們在做什麼」
   不衝突：老師是人，而且那是他出的題目。系統只負責記住哪幾段被勾了。

   勾一段跟每天推進是兩件事，不要混：推進是「今天我來過」（一天一次），
   勾是「這一段做完了」（隨時，幾段都可以）。兩件事都不影響判定——
   判定從頭到尾只看承諾幾天與實際幾天。 */
function actPublish(classId, o) {
  var m = {
    msId: nid('M'), classId: classId,
    title: o.title, note: o.note || '',
    steps: (o.steps || []).slice(0, 12),
    teams: o.teams || [],
    at: now()
  };
  DB.Milestones.push(m);
  save();
  logEvent('publish', { title: m.title, teams: (m.teams || []).length,
    steps: (m.steps || []).length });
  return m;
}

/* ---------- 全班怎麼看這一個里程碑 ----------

   同一個里程碑，別人說要花幾天。匿名，只回天數，不回是誰——
   要的是「我是不是低估了」，不是「誰比較快」。

   兩組以下不給看：三組的時候剩下那兩個數字誰是誰，猜得出來。 */
function estSpread(msId, exceptTeam) {
  var days = where('Runs', function (r) {
    return r.msId === msId && r.est && r.teamId !== exceptTeam;
  }).map(function (r) { return r.est; });
  if (days.length < 2) return null;
  days.sort(function (a, b) { return a - b; });
  return {
    n: days.length,
    lo: days[0],
    hi: days[days.length - 1],
    mid: days[Math.floor(days.length / 2)],
    all: days
  };
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
function radar(classId) {
  var out = [];
  where('Teams', function (t) { return t.classId === classId; }).forEach(function (t) {
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
function actApprove(runId, word) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || r.state !== 'submitted') return null;
  r.word = word || '';
  r.state = 'approved';
  r.approvedAt = now();
  save();
  logEvent('approve', { teamId: r.teamId, runId: runId, len: String(word || '').length });
  return r;
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
function actSeal(runId, name) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || r.state !== 'approved') return null;
  var s = runShape(runId);
  /* 封存給的是「一格的權利」，不是直接占掉一格。

     權利要拿到全班那張圖上去用：能打通的那幾格會亮起來，點下去它才
     變成你的。那一下才是 PaGamO 真正直覺的動作——地圖本身就是介面，
     不是一個看的頁面。

     這一格不影響任何判定。它給的是「這是我們打通的」。 */
  var tm = teamOf(r.teamId);
  if (tm) { tm.claims = (tm.claims || 0) + 1; }
  r.state = 'done';
  r.doneAt = now();
  r.coreName = String(name || '').trim().slice(0, 16);
  DB.Keeps.push({
    keepId: nid('K'), teamId: r.teamId, runId: runId,
    name: r.coreName, at: now(),
    /* 當時在哪一層。架子上那一排的顏色就是他走過的地層。 */
    zone: strataAt(depthOf(r.teamId), r.teamId).key,
    px: coreOf(runId),
    est: s.est, elapsed: s.elapsed, moved: s.moved,
    rested: s.rested, blank: s.blank
  });
  save();
  logEvent('seal', { teamId: r.teamId, runId: runId, name: r.coreName });
  return r;
}

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

/* 老師確認。他寫的那一句會留在出口那一頁上。 */
function actLetGo(teamId, word) {
  var t = teamOf(teamId);
  if (!t || !t.exitAsk || t.leftAt) return null;
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

/* 等著老師確認出口的那幾組 */
function exitQueue(classId) {
  return where('Teams', function (t) {
    return t.classId === classId && t.exitAsk && !t.leftAt;
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
