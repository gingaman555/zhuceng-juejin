/* 資料與動作。

   所有會改到資料的事都叫 act*，而且只有這裡改得到 DB。畫面只讀不寫。
   存在 localStorage，因為這一版是給人打開就能走一遍的原型。

   跟上一版最大的差別：沒有分數、沒有層、沒有收集。
   一個里程碑的一生是：派發 → 承諾天數 → 每日推進 → 上傳 → 判定 →
   （失準就復盤）→ 老師發裝備 → 大躍進。 */

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
    /* 老師發的裝備 */
    Gears: []
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
            est: 0, risks: [], pushes: 0, snags: [], gear: null };
    }
    return { ms: m, run: r };
  }).sort(function (a, b) { return a.ms.at - b.ms.at; });
}

/* ---------- 這一組現在該做什麼 ----------
   一次只回答一件事。首頁只給一個動作，其餘都是資訊。 */
function nextThing(teamId) {
  var rows = runsFor(teamId);
  /* 1. 判定失準、還沒復盤 */
  var camp = rows.filter(function (x) {
    return x.run.state === 'judged' && x.run.stamp === 'late' && !x.run.snags.length;
  })[0];
  if (camp) return { kind: 'camp', row: camp };
  /* 2. 老師發了裝備、還沒領 */
  var gear = rows.filter(function (x) { return x.run.state === 'geared'; })[0];
  if (gear) return { kind: 'gear', row: gear };
  /* 3. 睡著了或長藤蔓——叫醒牠比接新任務重要。
     這是整個設計的招牌互動：推一下，藤蔓碎掉，角色重新揮劍。
     如果讓「接新任務」排在前面，那一下就永遠不會發生。 */
  var st = stallOf(teamId);
  if (st.level > 0) {
    var stuck = rows.filter(function (x) { return x.run.state === 'running'; })[0];
    if (stuck) return { kind: 'wake', row: stuck, stall: st };
  }

  /* 4. 派了但還沒承諾 */
  var fresh = rows.filter(function (x) { return x.run.state === 'fresh'; })[0];
  if (fresh) return { kind: 'commit', row: fresh };
  /* 5. 進行中、今天還沒推進 */
  var run = rows.filter(function (x) {
    return x.run.state === 'running' && !pushedToday(teamId, x.run.runId);
  })[0];
  if (run) return { kind: 'push', row: run };
  /* 6. 走完了、還沒上傳 */
  var done = rows.filter(function (x) {
    return x.run.state === 'running' && RULES.progress(x.run.pushes, x.run.est) >= 1;
  })[0];
  if (done) return { kind: 'submit', row: done };
  /* 7. 都推過了，在等 */
  var wait = rows.filter(function (x) { return x.run.state === 'running'; })[0];
  if (wait) return { kind: 'waiting', row: wait };
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

/* 最後一次推進是什麼時候——停滯判斷用 */
function lastPush(teamId) {
  var ps = where('Pushes', function (p) { return p.teamId === teamId; });
  if (!ps.length) return 0;
  return ps[ps.length - 1].at;
}

/* 這一組的停滯狀態 */
function stallOf(teamId) {
  var t = teamOf(teamId);
  var has = runsFor(teamId).some(function (x) { return x.run.state === 'running'; });
  if (!has) return { level: 0, days: 0 };
  return RULES.stallOf(lastPush(teamId) || (t && t.joinedAt) || now(), now());
}

/* 深度＝完成過幾個里程碑。沒有終點。 */
function depthOf(teamId) {
  return where('Runs', function (r) {
    return r.teamId === teamId && r.state === 'done';
  }).length;
}

/* 招牌的階：老師改寫過幾次專案名稱 */
function signOf(teamId) {
  var t = teamOf(teamId);
  var n = Math.min(RULES.SIGN_TIERS.length - 1, (t && t.signTier) || 0);
  return SIGNS[RULES.SIGN_TIERS[n]];
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
   沒有名次。只有「誰在哪一條坑道、挖到多深、現在是什麼狀態」。 */
function ecology(classId) {
  return where('Teams', function (t) { return t.classId === classId; }).map(function (t) {
    var st = stallOf(t.teamId);
    var cur = runsFor(t.teamId).filter(function (x) { return x.run.state === 'running'; })[0];
    return {
      teamId: t.teamId, name: t.name,
      depth: depthOf(t.teamId),
      stall: st.level,
      /* 正在打的那一隻，跟走到哪 */
      onMs: cur ? cur.ms.title : '',
      at: cur ? RULES.progress(cur.run.pushes, cur.run.est) : 0,
      sign: signOf(t.teamId).key
    };
  });
}

/* ================= 學生的動作 ================= */

/* 承諾：拉滑桿決定幾天，順便標風險 */
function actCommit(teamId, msId, est, risks) {
  var r = runOf(teamId, msId);
  if (r) return r;
  r = {
    runId: nid('R'), teamId: teamId, msId: msId,
    state: 'running',
    est: clamp(RULES.EST_MIN, RULES.EST_MAX, Number(est) || RULES.EST_DEFAULT),
    risks: risks || [],
    committedAt: now(),
    pushes: 0, snags: [], gear: null, stamp: null
  };
  DB.Runs.push(r);
  save();
  return r;
}

/* 推進：一天一次。回傳有沒有真的推到。 */
function actPush(teamId, runId) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || r.state !== 'running') return false;
  if (pushedToday(teamId, runId)) return false;
  DB.Pushes.push({ pushId: nid('P'), teamId: teamId, runId: runId, day: dayOf(now()), at: now() });
  r.pushes++;
  save();
  return true;
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
  return r;
}

/* 復盤：點圖示標籤說明卡在哪。只有失準的時候會走到。 */
function actReflect(teamId, runId, snags) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r) return null;
  r.snags = snags || [];
  r.state = 'submitted';        /* 復盤完才排進老師的雷達 */
  save();
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

/* 領裝備 → 大躍進 */
function actTakeGear(runId) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || r.state !== 'geared') return null;
  r.state = 'done';
  r.doneAt = now();
  save();
  return r;
}

/* ================= 老師的動作 ================= */

/* 派一個里程碑。teams 空陣列＝全班。 */
function actPublish(classId, o) {
  var m = {
    msId: nid('M'), classId: classId,
    title: o.title, note: o.note || '',
    teams: o.teams || [],
    at: now()
  };
  DB.Milestones.push(m);
  save();
  return m;
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

/* 發裝備。gearKey 是資訊性回饋——選哪一件等於選一句話。 */
function actGear(runId, gearKey, word) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r) return null;
  r.gear = gearKey;
  r.word = word || '';
  r.state = 'geared';
  r.gearedAt = now();
  DB.Gears.push({ gearId: nid('G'), teamId: r.teamId, runId: runId, key: gearKey, at: now() });
  save();
  return r;
}

/* 改寫專案名稱 → 招牌升一階。收斂本身就是成果。 */
function actRename(teamId, name) {
  var t = teamOf(teamId);
  if (!t) return null;
  if (t.project !== name) {
    t.project = name;
    t.signTier = Math.min(RULES.SIGN_TIERS.length - 1, (t.signTier || 0) + 1);
  }
  save();
  return t;
}

/* 這一組拿過的裝備 */
function gearsOf(teamId) {
  return where('Gears', function (g) { return g.teamId === teamId; });
}
