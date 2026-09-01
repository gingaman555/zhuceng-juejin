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
    /* 學生自己挑走的裝備 */
    Gears: [],
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
  /* 2. 老師勾可以了，還沒挑裝備 */
  var gear = rows.filter(function (x) { return x.run.state === 'approved'; })[0];
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
  /* 6. 走完承諾的長度了——該交了 */
  var done = rows.filter(function (x) {
    return x.run.state === 'running' && RULES.progress(x.run.pushes, x.run.est) >= 1;
  })[0];
  if (done) return { kind: 'submit', row: done };
  /* 7. 今天推過了。走廊還沒走完，但隨時交得出去——
     走廊是「你承諾的長度」的視覺化，不是交件的門檻。
     提早做完就該交，那才判得成「超乎預期」。 */
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

/* 這一個 run 最後一次推進是什麼時候 */
function lastPush(runId) {
  var ps = where('Pushes', function (p) { return p.runId === runId; });
  if (!ps.length) return 0;
  return ps[ps.length - 1].at;
}

/* 這一組的停滯狀態。
   從「這一輪」開始算，不是從上一輪的最後一次推進——
   一組跑完一輪、隔了九天老師才派新的，他一承諾就被判成睡著是錯的。
   所以基準點取「這一輪的最後一次推進」與「這一輪承諾的時間」之中比較晚的那一個。 */
function stallOf(teamId) {
  var cur = runsFor(teamId).filter(function (x) { return x.run.state === 'running'; })[0];
  if (!cur) return { level: 0, days: 0 };
  var from = Math.max(lastPush(cur.run.runId) || 0, cur.run.committedAt || 0);
  if (!from) return { level: 0, days: 0 };
  return RULES.stallOf(from, now());
}

/* 深度＝完成過幾個里程碑。沒有終點。 */
function depthOf(teamId) {
  return where('Runs', function (r) {
    return r.teamId === teamId && r.state === 'done';
  }).length;
}

/* 招牌的階＝走到多深。

   招牌上的字是學生自己寫的（專案名稱），材質不是——材質是走完幾個
   里程碑自己長出來的。這樣改名字改不出一塊發光的牌子，
   而牌子發光的時候，那是他們自己走出來的。 */
function signOf(teamId) {
  var n = Math.min(RULES.SIGN_TIERS.length - 1, RULES.signTierOf(depthOf(teamId)));
  return SIGNS[RULES.SIGN_TIERS[n]];
}

/* 再走幾個里程碑招牌會換材質。沒有下一階就回 0。 */
function nextSignIn(teamId) {
  var d = depthOf(teamId);
  for (var i = 0; i < RULES.SIGN_AT.length; i++) {
    if (RULES.SIGN_AT[i] > d) return { need: RULES.SIGN_AT[i] - d, name: SIGNS[RULES.SIGN_TIERS[i]].name };
  }
  return { need: 0, name: '' };
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
  logEvent('commit', { teamId: teamId, runId: r.runId, msId: msId, est: r.est, risks: (r.risks || []).length });
  return r;
}

/* 推進：一天一次。回傳有沒有真的推到。 */
/* 推進。

     kind  今天動的是哪一塊（RULES.DOING 的 key）
     back  補登幾天前。0 是今天，1 是昨天，最多到 2。

   補登這件事看起來像作弊，其實相反：實際天數是從承諾那天到交出去
   那天算的，補登一格不會讓誰早一天完成，也不會改判定。它唯一改變的
   是走廊上少不少一盞燈——而「忘了按一天就再也補不回來」正是
   讓人整條放棄的那個崖。 */
function actPush(teamId, runId, kind, back) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || r.state !== 'running') return false;
  var b = Math.max(0, Math.min(RULES.BACKFILL_MAX, Number(back) || 0));
  var when = now() - b * DAY;
  if (when < r.committedAt) return false;      /* 承諾之前的日子不算 */
  if (pushedOn(teamId, runId, dayOf(when))) return false;
  DB.Pushes.push({
    pushId: nid('P'), teamId: teamId, runId: runId,
    day: dayOf(when), at: when, kind: kind || 'any', back: b
  });
  r.pushes++;
  save();
  logEvent('push', { teamId: teamId, runId: runId, n: r.pushes, kind: kind || 'any', back: b });
  return true;
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

/* 這一趟每一天動的是哪一塊，照時間排 */
function doingOfRun(runId) {
  return where('Pushes', function (p) { return p.runId === runId; })
    .sort(function (a, b) { return a.day - b.day; })
    .map(function (p) { return p.kind || 'any'; });
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
function actReflect(teamId, runId, snags) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r) return null;
  r.snags = snags || [];
  r.state = 'submitted';        /* 復盤完才排進老師的雷達 */
  save();
  logEvent('reflect', { teamId: teamId, runId: runId, snags: (snags || []).join('/') });
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
function actPublish(classId, o) {
  var m = {
    msId: nid('M'), classId: classId,
    title: o.title, note: o.note || '',
    teams: o.teams || [],
    at: now()
  };
  DB.Milestones.push(m);
  save();
  logEvent('publish', { title: m.title, teams: (m.teams || []).length });
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

/* 學生從攤開的三件裡挑一件 */
function actPickGear(runId, gearKey) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r || r.state !== 'approved') return null;
  var offer = offerGears(runId);
  if (!offer.some(function (g) { return g.key === gearKey; })) return null;
  r.gear = gearKey;
  r.state = 'done';
  r.doneAt = now();
  DB.Gears.push({ gearId: nid('G'), teamId: r.teamId, runId: runId, key: gearKey, at: now() });
  save();
  logEvent('pick', { teamId: r.teamId, runId: runId, gear: gearKey });
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

/* 這一組拿過的裝備 */
function gearsOf(teamId) {
  return where('Gears', function (g) { return g.teamId === teamId; });
}

/* 攤開哪三件讓學生挑。

   純函式：用 runId 算，同一個 run 每次算出來都一樣——畫面不擲骰子。
   而且刻意不看任何表現資料（估得準不準、推進幾次、被退幾次）——
   一旦攤開的內容跟表現有關，它那一秒就從「你想記住什麼」變成
   「系統覺得你值得什麼」，也就是評價。 */
function offerGears(runId) {
  var pool = RULES.GEARS.slice();
  var h = hash(String(runId));
  var out = [];
  for (var i = 0; i < 3 && pool.length; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    out.push(pool.splice(h % pool.length, 1)[0]);
  }
  return out;
}
