/* 假後端。整套跑在瀏覽器裡，存在 localStorage。

   資料表照規格書 08，已經砍掉的那幾張（Plans、Files）跟那幾個欄位
   （toolLevels、enteredWeek、semesterWeeks、mineral、vow）不在這裡。

   所有會算數的地方都呼叫 RULES——這一支不自己算分數、不自己算抽數。 */

var DB = null;
var STORE = 'jlz.v2';

/* 時間。假後端可以被快轉，所以不直接讀 Date.now()。 */
var CLOCK = 0;
function now() { return Date.now() + CLOCK; }

function blank() {
  return {
    Users: [], Classes: [], Roster: [], Teams: [], Tasks: [], TeamTasks: [],
    Submissions: [], Reviews: [], Redigs: [], Checks: [], Passes: [], Picks: [], Finales: [],
    Config: { seq: 1 }
  };
}

function nid(p) { return p + (DB.Config.seq++); }
function save() { try { localStorage.setItem(STORE, JSON.stringify(DB)); } catch (e) {} }
function load() {
  try { var s = localStorage.getItem(STORE); if (s) { DB = JSON.parse(s); return true; } } catch (e) {}
  return false;
}
function find(tbl, fn) { for (var i = 0; i < DB[tbl].length; i++) if (fn(DB[tbl][i])) return DB[tbl][i]; return null; }
function where(tbl, fn) { return DB[tbl].filter(fn); }

/* ================= 查 ================= */

function teamOf(id) { return find('Teams', function (t) { return t.teamId === id; }); }
function taskOf(id) { return find('Tasks', function (t) { return t.taskId === id; }); }
function userOf(id) { return find('Users', function (u) { return u.userId === id; }); }
function ttOf(teamId, taskId) {
  return find('TeamTasks', function (x) { return x.teamId === teamId && x.taskId === taskId; });
}

/* 一組在某一層被指派到的所有任務 */
function tasksFor(teamId, layer) {
  return where('Tasks', function (t) {
    return (layer == null || t.layer === layer) && t.teams.indexOf(teamId) >= 0;
  }).sort(function (a, b) { return a.ts - b.ts; });
}
function rowsFor(teamId, layer) {
  return tasksFor(teamId, layer).map(function (t) {
    return { task: t, tt: ttOf(teamId, t.taskId) };
  }).filter(function (r) { return r.tt; });
}

/* 一組現在的分數。明細與總分同一支函式，不會兜不起來。 */
function scoreOf(teamId) {
  var tts = where('TeamTasks', function (x) { return x.teamId === teamId; });
  var passed = tts.filter(function (x) { return x.status === 'done'; }).length;
  var drops = tts.reduce(function (s, x) { return s + (x.finds || []).length; }, 0);
  var released = where('Passes', function (p) { return p.teamId === teamId; }).length;
  return RULES.score({ passed: passed, drops: drops, released: released });
}

/* 有沒有在動：來回幾次、其中幾次是被退回之後改的。不計分，只說明這一組在動。 */
function motionOf(teamId) {
  var subs = where('Submissions', function (s) { return s.teamId === teamId; });
  return { rounds: subs.length, changed: subs.filter(function (s) { return s.attempt > 1; }).length };
}

function classTeams(classId) {
  return where('Teams', function (t) { return t.classId === classId; });
}

/* 排行榜：分數高的在前，同分的照停留天數少的在前 */
function board(classId) {
  return classTeams(classId).map(function (t) {
    return {
      team: t, score: scoreOf(t.teamId), motion: motionOf(t.teamId),
      stay: RULES.stayDays(t.enteredAt, now())
    };
  }).sort(function (a, b) { return b.score.total - a.score.total || a.stay - b.stay; })
    .map(function (r, i) { r.rank = i + 1; return r; });
}

/* ================= 學生端 ================= */

/* 一組在這一層有沒有交齊：老師的佇列吃這個條件。
   老師隨時可以再開一項，所以交齊之後可能又變成沒交齊——那不是退步，
   是這一層本來就沒有「做完」這個狀態。 */
function allIn(teamId, layer) {
  var rows = rowsFor(teamId, layer);
  if (!rows.length) return false;
  var waiting = 0;
  for (var i = 0; i < rows.length; i++) {
    var st = rows[i].tt.status;
    if (st === 'open' || st === 'back') return false;
    if (st === 'sent') waiting++;
  }
  return waiting > 0;
}

/* 首頁那一顆唯一的 CTA。首頁只給一件事，所以這裡只回傳一件。 */
function nextThing(teamId) {
  var team = teamOf(teamId);
  /* 上一層留下的那一件還沒挑。這不是工作，是十秒鐘的一個決定——
     所以它插在最前面，挑完馬上回到原本該做的事。 */
  var pk = pendingPick(teamId);
  if (pk) return { kind: 'pick', pick: pk };
  if (team.finished) return { kind: 'finale' };
  var rows = rowsFor(teamId, team.layer);
  var back = rows.filter(function (r) { return r.tt.status === 'back'; });
  if (back.length) return { kind: 'back', task: back[0].task, cta: '去看他寫了什麼' };
  var open = rows.filter(function (r) { return r.tt.status === 'open'; });
  if (open.length) {
    open.sort(function (a, b) {
      return (a.task.due || Infinity) - (b.task.due || Infinity);
    });
    return { kind: 'open', task: open[0].task, cta: '去做這一項' };
  }
  var sent = rows.filter(function (r) { return r.tt.status === 'sent'; });
  if (sent.length) return { kind: 'wait', n: sent.length };
  /* 手上沒有非做不可的事。系統在這裡主動邀請回頭補強：
     老師給 0 的那一項 ＝ 你交了，但他覺得你沒有多做。 */
  var zero = where('TeamTasks', function (x) {
    return x.teamId === teamId && x.status === 'done' && (x.gave || 0) === 0;
  });
  if (zero.length && redigLeft(teamId) === 0) {
    return { kind: 'redig', task: taskOf(zero[0].taskId), cta: '回頭補強這一項' };
  }
  return { kind: 'idle' };
}

/* 回頭補強：滾動 7 天一次。回傳還要等幾天，0 ＝ 現在就可以送。 */
function redigLeft(teamId) {
  var rs = where('Redigs', function (r) { return r.teamId === teamId; });
  if (!rs.length) return 0;
  var last = rs.reduce(function (m, r) { return Math.max(m, r.ts); }, 0);
  return RULES.redigWaitDays(last, now());
}

/* ---------- 學生的動作 ---------- */

/* 勾選 0 分。它只剩「我走到哪了」，那是它唯一能誠實的條件。 */
function actCheck(teamId, taskId, idx) {
  var tt = ttOf(teamId, taskId);
  if (tt.status === 'done' || tt.status === 'sent') return;
  var on = tt.checked.indexOf(idx) >= 0;
  tt.checked = on ? tt.checked.filter(function (i) { return i !== idx; }) : tt.checked.concat([idx]);
  DB.Checks.push({ teamId: teamId, taskId: taskId, idx: idx, act: on ? 'off' : 'on', ts: now() });
  save();
}
function actEffort(teamId, taskId, v) { ttOf(teamId, taskId).effort = v; save(); }
function actExtra(teamId, taskId, v) { ttOf(teamId, taskId).text = v; save(); }

/* 卡住可以現在就說，不用等送出。隨時可以放下。 */
function actBlocker(teamId, taskId, v) { ttOf(teamId, taskId).blocker = v || ''; save(); }

function actSubmit(teamId, taskId) {
  var tt = ttOf(teamId, taskId);
  if (!tt.effort) return { err: '先回答「這一組現在的狀態」。' };
  tt.attempt = (tt.attempt || 0) + 1;
  tt.status = 'sent';
  tt.sentAt = now();
  DB.Submissions.push({ teamId: teamId, taskId: taskId, attempt: tt.attempt,
    text: tt.text || '', effort: tt.effort, ts: now() });
  save();
  return { ok: true };
}

function actRedig(teamId, taskId, note) {
  var left = redigLeft(teamId);
  if (left > 0) return { err: '還要等 ' + left + ' 天。' };
  DB.Redigs.push({ redigId: nid('R'), teamId: teamId, taskId: taskId, note: note,
    status: 'sent', reason: '', ts: now() });
  save();
  return { ok: true };
}

/* ================= 老師端 ================= */

/* 待你驗收：依停留天數排序，待最久的排最前面。舉手的組排最前面。 */
function queue(classId) {
  return classTeams(classId).map(function (t) {
    var rows = rowsFor(t.teamId, t.layer);
    var sent = rows.filter(function (r) { return r.tt.status === 'sent'; });
    var blockers = rows.filter(function (r) { return r.tt.blocker; });
    var redigs = where('Redigs', function (r) { return r.teamId === t.teamId && r.status === 'sent'; });
    return {
      team: t, stay: RULES.stayDays(t.enteredAt, now()),
      sent: sent, redigs: redigs, blockers: blockers,
      ready: allIn(t.teamId, t.layer)
    };
  }).filter(function (r) { return r.ready || r.blockers.length || r.redigs.length; })
    .sort(function (a, b) {
      var ab = a.blockers.length ? 1 : 0, bb = b.blockers.length ? 1 : 0;
      return bb - ab || b.stay - a.stay;
    });
}

/* 老師寫了幾件合格考量、平均幾個字、學生平均等他多久 */
function teacherStats() {
  var rs = DB.Reviews;
  var chars = rs.reduce(function (s, r) { return s + String(r.reason || '').length; }, 0);
  var lat = rs.reduce(function (s, r) { return s + (r.latency || 0); }, 0);
  return {
    n: rs.length,
    avgChars: rs.length ? Math.round(chars / rs.length) : 0,
    avgWait: rs.length ? (lat / rs.length / 86400000) : 0
  };
}

/* 老師自己寫過三次以上的起頭句——是他的話，不是系統的罐頭。 */
function starters() {
  var seen = {};
  DB.Reviews.forEach(function (r) {
    var head = String(r.reason || '').slice(0, 6);
    if (head.length < 4) return;
    seen[head] = (seen[head] || 0) + 1;
  });
  return Object.keys(seen).filter(function (k) { return seen[k] >= 2; }).slice(0, 4);
}

function actPublish(classId, layer, o) {
  var t = {
    taskId: nid('K'), classId: classId, layer: layer, title: o.title,
    cond: o.cond, note: o.note || '', spec: o.spec || '',
    due: o.due || null, checks: o.checks || [], teams: o.teams || [], ts: now()
  };
  DB.Tasks.push(t);
  t.teams.forEach(function (tid) {
    DB.TeamTasks.push({ teamId: tid, taskId: t.taskId, status: 'open', checked: [],
      text: '', effort: '', blocker: '', gave: 0, finds: [], attempt: 0 });
  });
  save();
  return t;
}

/* 判一項。給的 0–5 只決定抽幾次，不決定過不過。 */
function actReview(teamId, taskId, o) {
  var tt = ttOf(teamId, taskId), task = taskOf(taskId);
  DB.Reviews.push({ teamId: teamId, taskId: taskId, result: o.result, reason: o.reason,
    gave: o.gave, attempt: tt.attempt, latency: tt.sentAt ? (now() - tt.sentAt) : 0, ts: now() });
  if (o.result === 'back') { tt.status = 'back'; save(); return { ok: true }; }
  tt.status = 'done';
  tt.gave = o.gave;
  tt.doneAt = now();
  tt.seen = false;
  var n = RULES.draws(task.layer, o.gave);
  tt.finds = rollFinds(task.layer, n, teamId + '/' + taskId + '/' + tt.attempt);
  save();
  return { ok: true, draws: n };
}

function actRedigJudge(redigId, accept, reason) {
  var r = find('Redigs', function (x) { return x.redigId === redigId; });
  r.status = accept ? 'ok' : 'no';
  r.reason = reason || '';
  r.judgedAt = now();
  if (accept) {
    var tt = ttOf(r.teamId, r.taskId), task = taskOf(r.taskId);
    /* 接受 ＝ 那一項多抽一次（多一件進圖鑑，分數跟著加） */
    tt.finds = (tt.finds || []).concat(rollFinds(task.layer, 1, r.redigId));
    tt.seen = false;
  }
  save();
}

/* 放行。這是整個系統唯一的門。 */
function actRelease(teamId, verdict, reason) {
  var team = teamOf(teamId);
  DB.Passes.push({ teamId: teamId, layer: team.layer, verdict: verdict, reason: reason, ts: now() });
  team.tools = (team.tools || []).concat([team.layer]);
  /* 戰利品不在這裡發。攤開三件，等他們自己挑一件帶走——
     系統不決定誰帶走哪一句話。 */
  DB.Picks.push({ pickId: nid('P'), teamId: teamId, layer: team.layer,
    offer: offerTrophies(team.layer, team.tro || [], teamId + '/' + team.layer),
    chosen: null, ts: now() });
  team.fresh = team.layer;
  if (team.layer < RULES.LAYERS) { team.layer++; team.enteredAt = now(); }
  else team.finished = true;
  save();
}

/* ---------- 挑一件帶走 ---------- */
/* 一組同一時間最多只會有一件在等他們挑。 */

function pendingPick(teamId) {
  return find('Picks', function (p) { return p.teamId === teamId && !p.chosen; });
}

function actPick(pickId, id) {
  var p = find('Picks', function (x) { return x.pickId === pickId; });
  if (!p || p.chosen) return;
  if (p.offer.indexOf(id) < 0) return;      /* 只能挑攤出來的那幾件 */
  p.chosen = id;
  p.pickedAt = now();
  var team = teamOf(p.teamId);
  team.tro = (team.tro || []).concat([id]);
  save();
}

/* 中途接手：課程走到一半才導入時，前面在系統外做完的直接認列。 */
function actStartAt(teamId, doneLayers) {
  var team = teamOf(teamId);
  team.startedAt = doneLayers;
  team.layer = clamp(1, RULES.LAYERS, doneLayers + 1);
  team.enteredAt = now();
  save();
}

function actFinale(teamId, o) {
  var f = find('Finales', function (x) { return x.teamId === teamId; });
  if (!f) { f = { teamId: teamId }; DB.Finales.push(f); }
  Object.keys(o).forEach(function (k) { f[k] = o[k]; });
  save();
  return f;
}
function finaleOf(teamId) { return find('Finales', function (x) { return x.teamId === teamId; }); }

/* ================= 他寫過的那一疊 ================= */
/* 老師每判一件都要寫一段字——那件事他本來就在做，所以這一疊是零負擔的累積。
   一次性看過就過去的話，那些字只影響那一件；疊起來之後它影響下一件。

   跟圖鑑一樣是個人的：這個人走過的每一組都算進來。 */
function stackOf(userId) {
  var u = userOf(userId);
  var teams = (u.history || []).concat([u.teamId]);
  var out = [];
  teams.forEach(function (tid) {
    var team = teamOf(tid);
    if (!team) return;
    where('Reviews', function (r) { return r.teamId === tid; }).forEach(function (r) {
      var task = taskOf(r.taskId);
      if (!task) return;
      out.push({
        kind: r.result === 'ok' ? 'ok' : 'back',
        layer: task.layer, title: task.title, cond: task.cond,
        gave: r.gave, text: r.reason, ts: r.ts, taskId: r.taskId, teamId: tid,
        mine: tid === u.teamId
      });
    });
    where('Redigs', function (r) { return r.teamId === tid && r.status !== 'sent'; })
      .forEach(function (r) {
        var task = taskOf(r.taskId);
        if (!task || !r.reason) return;
        out.push({
          kind: r.status === 'ok' ? 'redig-ok' : 'redig-no',
          layer: task.layer, title: task.title, cond: task.cond,
          text: r.reason, ts: r.judgedAt || r.ts, taskId: r.taskId, teamId: tid,
          mine: tid === u.teamId
        });
      });
    where('Passes', function (p) { return p.teamId === tid; }).forEach(function (p) {
      out.push({
        kind: 'pass', layer: p.layer, title: LAYERS[p.layer - 1].name + ' · 放行',
        text: p.reason, ts: p.ts, teamId: tid, mine: tid === u.teamId
      });
    });
  });
  return out.sort(function (a, b) { return b.ts - a.ts; });
}

/* ================= 這一趟的剖面 ================= */
/* 深度對時間。系統手上本來就有這些時間戳，一個都不必碰作業內容。

   全部是描述，沒有一項是評價：哪一天開的、哪一天交的、走了幾輪、等了幾天。
   沒有「應該長這樣」的那一條線，也不跟別組比。 */
function timelineOf(teamId) {
  var team = teamOf(teamId);
  var passes = where('Passes', function (p) { return p.teamId === teamId; })
    .sort(function (a, b) { return a.ts - b.ts; });
  var rows = [];
  LAYERS.forEach(function (l) { rowsFor(teamId, l.n).forEach(function (r) { rows.push(r); }); });

  /* 起點：這一組最早看到的那一項，或最早的一次放行 */
  var t0 = rows.reduce(function (m, r) { return Math.min(m, r.task.ts); },
    passes.length ? passes[0].ts : (team.enteredAt || now()));
  t0 = Math.min(t0, team.enteredAt || t0);
  var t1 = now();
  var span = Math.max(1, Math.round((t1 - t0) / 86400000));

  /* 每一層待了哪一段 */
  var bands = [], from = t0;
  passes.forEach(function (p) {
    bands.push({ layer: p.layer, from: from, to: p.ts });
    from = p.ts;
  });
  if (!team.finished) bands.push({ layer: team.layer, from: from, to: t1, now: true });

  /* 每一項的事件 */
  var items = rows.map(function (r) {
    var subs = where('Submissions', function (s) {
      return s.teamId === teamId && s.taskId === r.task.taskId;
    }).sort(function (a, b) { return a.ts - b.ts; });
    var revs = where('Reviews', function (v) {
      return v.teamId === teamId && v.taskId === r.task.taskId;
    }).sort(function (a, b) { return a.ts - b.ts; });
    var first = subs[0], last = revs[revs.length - 1];
    return {
      task: r.task, tt: r.tt, layer: r.task.layer,
      opened: r.task.ts,
      subs: subs, revs: revs,
      rounds: subs.length,
      /* 開啟到第一次交隔了幾天 */
      toFirst: first ? (first.ts - r.task.ts) / 86400000 : null,
      /* 等裁決等了幾天（每一輪加起來除以輪數） */
      wait: revs.length ? revs.reduce(function (s, v) { return s + (v.latency || 0); }, 0)
        / revs.length / 86400000 : null,
      /* 期限前幾天交（負的是逾期） */
      slack: (first && r.task.due) ? (r.task.due - first.ts) / 86400000 : null,
      done: r.tt.status === 'done', doneAt: r.tt.doneAt || (last ? last.ts : null)
    };
  }).sort(function (a, b) { return a.opened - b.opened; });

  var avg = function (list) {
    var v = list.filter(function (x) { return x != null; });
    return v.length ? v.reduce(function (s, x) { return s + x; }, 0) / v.length : null;
  };
  return {
    t0: t0, t1: t1, span: span, bands: bands, items: items,
    stats: {
      n: items.length,
      toFirst: avg(items.map(function (i) { return i.toFirst; })),
      rounds: avg(items.map(function (i) { return i.rounds || null; })),
      wait: avg(items.map(function (i) { return i.wait; })),
      slack: avg(items.map(function (i) { return i.slack; })),
      late: items.filter(function (i) { return i.slack != null && i.slack < 0; }).length,
      tight: items.filter(function (i) { return i.slack != null && i.slack >= 0 && i.slack < 1; }).length,
      multi: items.filter(function (i) { return i.rounds > 1; }).length
    }
  };
}

/* ================= 個人圖鑑 ================= */
/* 圖鑑是個人的。換組換班換專案都跟著人走，所以它從這個人走過的
   每一組累積，不是從現在這一組算。 */
function dexOf(userId) {
  var u = userOf(userId);
  var teams = (u.history || []).concat([u.teamId]);
  var mobs = {}, finds = {}, tros = {}, tools = {};
  teams.forEach(function (tid) {
    var t = teamOf(tid);
    if (!t) return;
    where('TeamTasks', function (x) { return x.teamId === tid && x.status === 'done'; })
      .forEach(function (x) {
        var task = taskOf(x.taskId);
        if (!task) return;
        mobs[mobFor(x.taskId, tid, task.layer).name] = task.layer;
        (x.finds || []).forEach(function (id) { finds[id] = 1; });
      });
    (t.tools || []).forEach(function (L) { tools[L] = 1; });
    (t.tro || []).forEach(function (id) { tros[id] = 1; });
    where('Passes', function (p) { return p.teamId === tid; })
      .forEach(function (p) { mobs['BOSS' + p.layer] = p.layer; });
  });
  return { mobs: mobs, finds: finds, tros: tros, tools: tools,
    nMob: Object.keys(mobs).length,
    nItem: Object.keys(finds).length + Object.keys(tros).length + Object.keys(tools).length };
}
