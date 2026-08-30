/* 本機預覽用的假後端：把 Code.gs 的 API 用記憶體資料表重刻一份。
   只給開發驗證流程用，不會進 GAS 部署。 */
(function () {
  'use strict';

  var DB = { Users: [], Sessions: [], Classes: [], Teams: [], Tasks: [], TeamTasks: [],
             Submissions: [], Reviews: [], Plans: [], Passes: [], Reads: [], Codes: [],
             Files: [], Roster: [], MinNames: [], Checks: [], Journeys: [],
             Config: { unlockEvery: 1 } };
  try {
    var saved = localStorage.getItem('jlz.mockdb');
    if (saved) DB = JSON.parse(saved);
  } catch (e) {}
  function persist() { DB._rev = (DB._rev || 0) + 1; try { localStorage.setItem('jlz.mockdb', JSON.stringify(DB)); } catch (e) {} }

  var uid = function () { return Math.random().toString(36).slice(2, 10); };
  var NOW = function () { return new Date().toISOString(); };
  window.MOCK_TODAY = window.MOCK_TODAY || null; /* 可在 console 設 '2026-10-20' 模擬日期 */
  function today() { return window.MOCK_TODAY ? new Date(window.MOCK_TODAY) : new Date(); }

  function courseWeekOf(k) {
    if (k && k.weekOverride !== '' && k.weekOverride != null) return Math.max(1, Math.floor(+k.weekOverride));
    var m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(k && k.courseStart || '2026-09-14'));
    var start = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(2026, 8, 14);
    var days = Math.floor((today() - start) / 86400000);
    return Math.max(1, Math.floor(days / 7) + 1);
  }
  function dueWeekOf(due) {
    if (typeof due === 'number') return due > 0 ? Math.max(1, Math.min(156, Math.floor(due))) : null;
    var s = String(due || '').trim();
    if (s === '' || s === '不設限') return null;
    if (/^\d+$/.test(s)) { var n = +s; return n > 0 ? Math.max(1, Math.min(156, n)) : null; }
    var m = /第\s*(\d+)\s*週/.exec(s);
    if (m) return Math.max(1, Math.min(156, +m[1]));
    return null;
  }
  function findUser(a) {
    a = String(a || '').trim().toLowerCase();
    return DB.Users.filter(function (u) { return u.account.toLowerCase() === a; })[0] || null;
  }
  function auth(t) {
    var s = DB.Sessions.filter(function (x) { return x.token === t; })[0];
    if (!s) throw new Error('登入已失效，請重新登入。');
    return DB.Users.filter(function (u) { return u.userId === s.userId; })[0];
  }
  function classById(id) { return DB.Classes.filter(function (k) { return k.classId === id; })[0] || null; }
  function teamById(id) { return DB.Teams.filter(function (t) { return t.teamId === id; })[0] || null; }
  function ok(o) { return Object.assign({ ok: true }, o || {}); }
  function err(m) { return { ok: false, error: String(m.message || m) }; }
  function pub(u) { return { userId: u.userId, account: u.account, role: u.role, name: u.name, classId: u.classId, teamId: u.teamId, coder: u.coder || '' }; }
  function numCn(n) { return ['零','一','二','三','四','五','六','七','八','九','十'][n] || String(n); }

  function classesOf(u) {
    var mine = u.role === 'teacher'
      ? DB.Classes.filter(function (k) { return k.teacherId === u.userId; })
      : DB.Classes.filter(function (k) { return k.classId === u.classId; });
    if (!mine.length) mine = DB.Classes;
    return mine.map(function (k) {
      return { id: k.classId, name: k.name, term: k.term, started: true, courseStart: k.courseStart,
               weekOverride: k.weekOverride == null || k.weekOverride === '' ? null : +k.weekOverride,
               joinCode: k.joinCode, courseWeek: courseWeekOf(k), semesterWeeks: Math.max(2, Math.min(156, +(k.semesterWeeks||18))),
               sandbox: String(k.sandbox) === 'Y' };
    });
  }
  /* 一趟的統整。跟 gas 端的 journeyStats_ 同一套算法。 */
  function journeyStats(teamId, classId) {
    var defs = {};
    tasksOfClass(classId, teamId).forEach(function (d) { defs[d.id] = d; });
    var pass = [0,0,0,0], open = [0,0,0,0], ext = [0,0,0,0], rej = [0,0,0,0], drop = [0,0,0,0];
    var kinds = {};
    DB.TeamTasks.forEach(function (r) {
      if (r.teamId !== teamId) return;
      var d = defs[r.taskId];
      if (!d) return;
      var i = Math.max(0, Math.min(3, (Number(d.layer) || 1) - 1));
      open[i]++;
      if (r.status === 'passed') { pass[i]++; if (d.type === 'extended') ext[i]++; }
      var arr = (r.finds || []);
      if (!arr.length) arr = [r.find, r.find2];
      arr.forEach(function (x) {
        var n = Number(x);
        if (!(n >= 1 && n <= FINDS_N)) return;
        drop[i]++; kinds[n] = 1;
      });
    });
    (DB.Reviews || []).forEach(function (r) {
      if (r.teamId !== teamId || r.result !== 'needfix') return;
      var i = Math.max(0, Math.min(3, (Number(r.layer) || 1) - 1));
      rej[i]++;
    });
    var tm = teamById(teamId) || {}, passedArr = tm.passed || [];
    var layers = [];
    for (var i = 0; i < 4; i++) {
      layers.push({ n: i + 1, open: open[i], pass: pass[i], ext: ext[i],
                    rej: rej[i], drop: drop[i], cleared: passedArr.indexOf(i + 1) >= 0 });
    }
    var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
    var kl = classById(classId) || {};
    return { layers: layers, mobs: sum(pass), opened: sum(open), extended: sum(ext),
             rejected: sum(rej), drops: sum(drop), dropKinds: Object.keys(kinds).length,
             trophies: passedArr.length, score: scoreOf(teamId, classId).total,
             className: kl.name || '', term: kl.term || '' };
  }

  function teamPub(t, w) {
    return { id: t.teamId, classId: t.classId, name: t.name, members: t.members || [],
             layer: t.layer, enteredWeek: t.enteredWeek,
             weeks: Math.max(1, w - t.enteredWeek + 1),
             passed: t.passed || [], toolLevels: t.toolLevels || {},
             gateText: t.gateText || ['', '', ''], gateSubmitted: !!t.gateSubmitted,
             gateVerdict: t.gateVerdict || '', specNames: t.specNames || {} };
  }
  /* 給 teamId 就只回那一組看得到的——關卡判定一定要用這個版本 */
  /* 老師寫的清單：一行一條，去空白、丟空行、最多 12 條 */
  function checkList(raw) {
    var a = raw;
    if (typeof a === 'string') { try { a = JSON.parse(a); } catch (e) { a = []; } }
    if (!a || !a.length) return [];
    return a.map(function (x) { return String(x || '').trim(); })
            .filter(function (x) { return x; }).slice(0, 12);
  }
  function tasksOfClass(cid, teamId) {
    var all = DB.Tasks.filter(function (t) { return t.classId === cid; }).map(function (t) {
      return { id: t.taskId, klass: t.classId, layer: t.layer, type: t.type, title: t.title,
               cond: t.cond, note: t.note, spec: t.spec || '', due: t.due, mineral: t.mineral, mDesc: t.mDesc, published: true,
               teams: API.taskTeams(t), checks: checkList(t.checks) };
    });
    if (!teamId) return all;
    return all.filter(function (d) { return !d.teams.length || d.teams.indexOf(String(teamId)) >= 0; });
  }
  function ttmap(teamId) {
    var m = {};
    DB.TeamTasks.forEach(function (r) { if (r.teamId === teamId) m[r.taskId] = r; });
    return m;
  }
  function mergeTasks(defs, m, w, teamId, kl) {
    return defs.map(function (d) {
      var s = m[d.id] || { status: 'todo', text: '', files: [], fb: '', fbType: '', effort: '', effortNote: '', blocker: '', checked: [] };
      var dw = dueWeekOf(d.due);
      return Object.assign({}, d, { status: s.status, text: s.text, files: s.files || [], effort: s.effort||'', effortNote: s.effortNote||'', blocker: s.blocker||'',
        fb: s.fb || '', fbType: s.fbType || '', checked: checkList2(s.checked),
        star: teamId ? starOf(teamId, d.id) : false,
        vow: s.vow || '', find: Number(s.find) || 0,
        vowWon: (teamId && s.vow && s.status === 'passed') ? vowWon(teamId, d.id, d, kl, s.vow) : false,
        over: dw !== null && dw < w && s.status !== 'passed' });
    });
  }

  /* 勾到哪幾條：存成陣列，但舊資料可能是字串 */
  function checkList2(raw) {
    var a = raw;
    if (typeof a === 'string') { try { a = JSON.parse(a); } catch (e) { a = []; } }
    return Array.isArray(a) ? a.map(Number) : [];
  }

  var VOWS = ['early', 'back', 'all', 'peer'];
  function taskSpan(def, kl) {
    var dw = dueWeekOf(def && def.due);
    if (dw === null) return null;
    var start = new Date(kl ? kl.courseStart : '2026-09-14');
    var s0 = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    var b = s0 + dw * 7 * 86400000;
    var a = def && def.createdAt ? new Date(def.createdAt).getTime() : 0;
    if (!a || a >= b) a = b - 14 * 86400000;
    return { a: a, b: b };
  }
  function spanAt(span, d) {
    if (!span || span.b <= span.a) return 1;
    return Math.max(0, Math.min(1, (new Date(d).getTime() - span.a) / (span.b - span.a)));
  }
  function tickEvents(teamId, taskId) {
    return DB.Checks
      .filter(function (c) { return c.teamId === teamId && c.taskId === taskId && c.act === 'on'; })
      .sort(function (a, b) { return new Date(a.ts) - new Date(b.ts); });
  }
  function vowWon(teamId, taskId, def, kl, vow) {
    if (VOWS.indexOf(String(vow)) < 0) return false;
    if (vow === 'back') return starOf(teamId, taskId);
    var ticks = tickEvents(teamId, taskId);
    if (!ticks.length) return false;

    if (vow === 'early') {
      var sp = taskSpan(def, kl);
      if (!sp) return false;
      return spanAt(sp, ticks[0].ts) < 0.5;
    }
    if (vow === 'peer') {
      var t0p = new Date(ticks[0].ts).getTime();
      var subsP = DB.Submissions.filter(function (x) { return x.teamId === teamId && x.taskId === taskId; });
      if (!subsP.length) return false;
      var sentP = Math.min.apply(null, subsP.map(function (x) { return new Date(x.ts).getTime(); }));
      return DB.Reads.some(function (r) {
        if (r.readerTeam !== teamId) return false;
        var ts = new Date(r.ts).getTime();
        return ts >= t0p && ts <= sentP;
      });
    }
    if (vow === 'all') {
      var members = DB.Roster.filter(function (r) { return r.teamId === teamId && r.claimedBy; });
      if (members.length < 2) return false;
      var who = {};
      ticks.forEach(function (c) { if (c.by) who[String(c.by)] = true; });
      return members.every(function (m) { return who[String(m.claimedBy)]; });
    }
    return false;
  }

  function recordOf(teamId, classId) {
    var kl = classById(classId);
    var m = ttmap(teamId);
    return tasksOfClass(classId, teamId).map(function (d) {
      var st = m[d.id] || {};
      var myRevs = DB.Reviews.filter(function (r) { return r.teamId === teamId && r.taskId === d.id; });
      var last = myRevs[myRevs.length - 1] || null;
      var vow = String(st.vow || '');
      var nRounds = DB.Submissions.filter(function (x) { return x.teamId === teamId && x.taskId === d.id; }).length;
      return { id: d.id, layer: Number(d.layer) || 1, title: d.title,
        status: st.status || 'todo', vow: vow,
        settled: !!(vow && nRounds),
        won: (vow && nRounds) ? vowWon(teamId, d.id, d, kl, vow) : false,
        rounds: nRounds,
        sentBack: myRevs.filter(function (r) { return r.result === 'needfix'; }).length,
        say: last ? String(last.reason || '') : '',
        mineral: d.mineral || '', find: Number(st.find) || 0, find2: Number(st.find2) || 0,
        finds: Array.isArray(st.finds) ? st.finds : [], gave: Number(st.gave) || 1 };
    });
  }

  var STAR_GAP_MS = 6 * 60 * 60 * 1000;
  function starOf(teamId, taskId) {
    var ev = DB.Checks
      .filter(function (c) { return c.teamId === teamId && c.taskId === taskId; })
      .sort(function (a, b) { return new Date(a.ts) - new Date(b.ts); });
    var lastOn = {}, opened = {};
    for (var i = 0; i < ev.length; i++) {
      var k = String(ev[i].idx), t = new Date(ev[i].ts).getTime();
      if (ev[i].act === 'on') {
        if (opened[k]) return true;
        lastOn[k] = t;
      } else {
        if (lastOn[k] && (t - lastOn[k]) >= STAR_GAP_MS) opened[k] = true;
        delete lastOn[k];
      }
    }
    return false;
  }
  function scoreOf(teamId, classId) {
    var kl = classById(classId);
    var byId = {};
    if (classId) tasksOfClass(classId, teamId).forEach(function (d) { byId[String(d.id)] = d; });
    var ticks = 0, pages = 0, vows = 0, finds = 0;
    DB.TeamTasks.forEach(function (r) {
      if (r.teamId !== teamId) return;
      ticks += checkList2(r.checked).length;
      /* 掉落物：每一件都一樣重，掉到哪一件不影響名次，只有件數影響。
         要數整串——一項最多掉 8 件，只數 find / find2 會少算六件。 */
      var fArr = Array.isArray(r.finds) && r.finds.length ? r.finds : [r.find, r.find2];
      fArr.forEach(function (x) { if (Number(x) > 0) finds++; });
      if (r.status !== 'passed') return;
      var def = byId[String(r.taskId)];
      /* 宣告破法拿掉了——通過就是通過，沒有 300 那一階 */
      pages++;
    });
    /* 老師放行一層 → 道具一件 ＋ 戰利品一件，各 50。
       那是一整個階段的門檻，在榜上就是一個台階。 */
    var tm = DB.Teams.filter(function (x) { return String(x.teamId) === String(teamId); })[0];
    var layers = tm ? (tm.passed || []).filter(function (n) {
      return Number(n) >= 1 && Number(n) <= 4;
    }).length : 0;
    /* 全部是十的倍數 —— 比例跟原本一樣，只是不讓畫面上出現個位數。 */
    return { ticks: ticks, pages: pages, vows: vows, finds: finds, layers: layers,
             base: ticks * 10 + pages * 100 + finds * 30,
             bonus: layers * 1000,
             total: ticks * 10 + pages * 100 + finds * 30 + layers * 1000 };
  }
  function firstsOf(classId) {
    var teams = {};
    DB.Teams.forEach(function (t) { if (t.classId === classId) teams[String(t.teamId)] = t.name || t.teamId; });
    var out = {};
    DB.Reviews.filter(function (r) { return r.result === 'pass' && teams[String(r.teamId)]; })
      .sort(function (a, b) { return new Date(a.ts) - new Date(b.ts); })
      .forEach(function (r) {
        var k = String(r.taskId);
        if (!out[k]) out[k] = { teamId: String(r.teamId), name: teams[String(r.teamId)], ts: String(r.ts) };
      });
    return out;
  }

  var FINDS_N = 108;

  /* 第幾層撿得到這一件。常見 12（一層 3）、少見 8（一層 2）、罕見 4（一層 1）。
     跟 gas/Code.gs 的 findLayer_ 與前端的 findLayer 是同一個公式。 */
  /* 掉落物 108 種，順序「領域 → 稀有度」，一區 27 件，界線 27/54/81。
     跟 gas/Code.gs 與前端用同一份規則。 */
  function findLayer(n) {
    n = Number(n);
    return n <= 27 ? 1 : n <= 54 ? 2 : n <= 81 ? 3 : 4;
  }
  function findSlot(n) { return ((Number(n) - 1) % 27) + 1; }
  /* 走到第 L 層時抽得到的池子：第 1..L 層都算。常見 : 少見 : 罕見 = 5 : 3 : 1。 */
  function findPool(maxLayer) {
    var out = [], mx = Math.max(1, Math.min(4, Number(maxLayer) || 1));
    for (var n = 1; n <= FINDS_N; n++) {
      if (findLayer(n) > mx) continue;
      var slot = findSlot(n);
      var w = slot <= 15 ? 5 : slot <= 24 ? 3 : 1;
      for (var i = 0; i < w; i++) out.push(n);
    }
    return out;
  }
  /* 抽 n 次。刻意取後放回——重複是這套收集的一部分：不重複的話幾輪就收滿了，
     收集撐不了一整個學期。疊加的是機會，不是數量。 */
  function rollFindsIn(maxLayer, n) {
    var pool = findPool(maxLayer), out = [];
    for (var i = 0; i < n && pool.length; i++) {
      out.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    return out;
  }
  /* 掉幾件：層數 ＋（老師給的 1–5 − 1）。最少 1、最多 8。 */
  function findCount(layer, gave) {
    var L = Math.max(1, Math.min(4, Number(layer) || 1));
    var g = Math.max(1, Math.min(5, Number(gave) || 1));
    return Math.max(1, Math.min(8, L + g - 1));
  }
  /* 收藏是個人的：跨班、跨組、跨專案累積。Roster.claimedBy 把使用者
     連到他待過的每一組。 */
  /* 這個人每一區走完過幾次，跨專案累加 */
  function clearsOfUser(userId) {
    var mine = teamsOfUser(userId), out = [0, 0, 0, 0];
    if (!mine.length) return out;
    DB.Teams.forEach(function (t) {
      if (mine.indexOf(String(t.teamId)) < 0) return;
      (Array.isArray(t.passed) ? t.passed : []).forEach(function (x) {
        var n = Number(x);
        if (n >= 1 && n <= 4) out[n - 1]++;
      });
    });
    return out;
  }

  function teamsOfUser(userId) {
    var out = [];
    DB.Roster.forEach(function (r) {
      if (String(r.claimedBy||'') !== String(userId)) return;
      if (out.indexOf(String(r.teamId)) < 0) out.push(String(r.teamId));
    });
    return out;
  }
  function codexOfUser(userId) {
    var mine = teamsOfUser(userId);
    if (!mine.length) return [];
    var defs = {};
    DB.Tasks.forEach(function (d) { defs[String(d.taskId)] = d; });
    var out = [];
    DB.TeamTasks.forEach(function (r) {
      if (mine.indexOf(String(r.teamId)) < 0 || r.status !== 'passed') return;
      var d = defs[String(r.taskId)];
      if (!d) return;
      /* teamId：生物按（任務 × 組別）決定，歷史條目要記得當時是哪一組 */
      out.push({ id: String(r.taskId), teamId: String(r.teamId),
                 layer: Math.max(1, Math.min(4, Number(d.layer)||1)),
                 title: d.title || '', classId: String(d.classId||''),
                 find: Number(r.find)||0, find2: Number(r.find2)||0 });
    });
    return out;
  }
  function findsOf(userId) {
    var mine = teamsOfUser(userId);
    var out = {};
    DB.TeamTasks.forEach(function (r) {
      if (mine.indexOf(String(r.teamId)) < 0) return;
      var arr = Array.isArray(r.finds) && r.finds.length ? r.finds : [r.find, r.find2];
      arr.forEach(function (x) {
        var n = Number(x);
        if (n >= 1 && n <= FINDS_N) out[n] = (out[n] || 0) + 1;
      });
    });
    return out;
  }

  function ymd(d) {
    var x = new Date(d);
    return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2);
  }
  function rosterView(classId) {
    var claimedName = {};
    DB.Users.forEach(function (u) { claimedName[u.userId] = u.name + '（' + u.account + '）'; });
    var byTeam = {}, order = [];
    (DB.Roster || []).filter(function (r) { return r.classId === classId; }).forEach(function (r) {
      if (!byTeam[r.teamId]) { byTeam[r.teamId] = { teamId: r.teamId, teamName: r.teamName, members: [] }; order.push(r.teamId); }
      byTeam[r.teamId].members.push({ rosterId: r.rosterId, name: r.memberName,
        claimed: !!r.claimedBy, claimedBy: r.claimedBy ? (claimedName[r.claimedBy] || r.claimedBy) : '' });
    });
    return order.map(function (id) { return byTeam[id]; });
  }

  function adminOverview() {
    var nameOf = {};
    DB.Classes.forEach(function (k) { nameOf[k.classId] = k.name; });
    return {
      unlockEvery: (DB.Config || {}).unlockEvery || 1,
      classes: DB.Classes.map(function (k) {
        return { id: k.classId, name: k.name, term: k.term, courseStart: k.courseStart,
                 courseWeek: courseWeekOf(k), semesterWeeks: Math.max(2, Math.min(156, +(k.semesterWeeks||18))), joinCode: k.joinCode,
                 sandbox: String(k.sandbox) === 'Y' };
      }),
      users: DB.Users.map(function (u) {
        return { userId: u.userId, account: u.account, role: u.role, name: u.name,
                 classId: u.classId, className: nameOf[u.classId] || '', teamId: u.teamId || '',
                 lastLogin: u.lastLogin || '' };
      })
    };
  }

  var MIN_BY_LAYER = {
    1: ['定名石', '裂晶', '初痕礦', '預兆砂'],
    2: ['聽紋晶', '篩光石', '徑錄礦', '顯影砂'],
    3: ['初型岩', '因由石', '反響礦', '二階水晶'],
    4: ['再凝岩', '前後水晶', '磨心礦', '厚能量石'],
    4: ['冷玉印']
  };

  var API = {
    apiRegister: function (p) {
      p = p || {};
      var account = String(p.account || '').trim();
      var role = String(p.role || '');
      if (role !== 'researcher' && role !== 'student') return err('老師的帳號由研究者建立。');
      if (account.length < 3) return err('帳號至少 3 個字。');
      if (String(p.password || '').length < 4) return err('密碼至少 4 個字。');
      if (findUser(account)) return err('這個帳號已經有人用了。');
      var classId = '', name = String(p.name || '').trim();
      if (role === 'student') {
        var code = String(p.joinCode || '').trim().toUpperCase();
        var kl = DB.Classes.filter(function (k) { return k.joinCode === code; })[0];
        if (!kl) return err('找不到這個班級邀請碼。');
        classId = kl.classId; name = '';
      } else if (!name) return err('請填姓名。');
      var u = { userId: 'u' + uid(), account: account, pw: p.password, role: role,
                name: name, classId: classId, teamId: '', coder: p.coder || 'C1' };
      DB.Users.push(u);
      var t = 'tk' + uid();
      DB.Sessions.push({ token: t, userId: u.userId });
      persist();
      return ok({ token: t, user: pub(u) });
    },
    apiAdminSetUnlock: function (t, every) {
      auth(t);
      DB.Config = DB.Config || {};
      DB.Config.unlockEvery = Math.max(1, Math.floor(Number(every) || 1));
      persist();
      return ok(adminOverview());
    },
    apiAdminSaveRoster: function (t, classId, text) {
      if (auth(t).role !== 'researcher') return err('這個動作只有研究者可以做。');
      auth(t);
      var lines = String(text || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
      var teamByName = {};
      DB.Teams.filter(function (x) { return x.classId === classId; }).forEach(function (x) { teamByName[x.name] = x; });
      var seen = {};
      (DB.Roster || []).forEach(function (r) { seen[r.teamName + '||' + r.memberName] = 1; });
      var added = 0, groups = 0;
      lines.forEach(function (line) {
        var m = /^(.+?)\s*[：:]\s*(.+)$/.exec(line);
        if (!m) return;
        var gname = m[1].trim();
        var members = m[2].split(/[,，、\s]+/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (!gname || !members.length) return;
        groups++;
        var full = /^第.+組/.test(gname) ? gname : '第' + numCn(Object.keys(teamByName).length + 1) + '組 · ' + gname;
        var tm = teamByName[full];
        if (!tm) {
          tm = { teamId: 'tm' + uid(), classId: classId, name: full, members: members.slice(), layer: 1,
                 enteredWeek: courseWeekOf(classById(classId)), passed: [], toolLevels: {},
                 gateText: ['', '', ''], gateSubmitted: false, gateVerdict: '', specNames: {} };
          DB.Teams.push(tm); teamByName[full] = tm;
        } else {
          members.forEach(function (n) { if (tm.members.indexOf(n) < 0) tm.members.push(n); });
        }
        members.forEach(function (n) {
          if (seen[full + '||' + n]) return;
          DB.Roster.push({ rosterId: 'rs' + uid(), classId: classId, teamId: tm.teamId,
                           teamName: full, memberName: n, claimedBy: '', claimedAt: '' });
          added++;
        });
      });
      if (!groups) return err('看不懂這份名單。每一行要寫成「組名：成員, 成員」。');
      persist();
      return ok(Object.assign(adminOverview(), { roster: rosterView(classId), added: added, groups: groups }));
    },
    apiAdminRoster: function (t, classId) {
      if (auth(t).role !== 'researcher') return err('這個動作只有研究者可以做。'); auth(t); return ok({ roster: rosterView(classId) }); },
    apiAdminUnclaim: function (t, rosterId) {
      if (auth(t).role !== 'researcher') return err('這個動作只有研究者可以做。');
      auth(t);
      var r = DB.Roster.filter(function (x) { return x.rosterId === rosterId; })[0];
      if (!r) return err('找不到這一筆。');
      if (r.claimedBy) { var u = DB.Users.filter(function (x) { return x.userId === r.claimedBy; })[0]; if (u) u.teamId = ''; }
      r.claimedBy = ''; r.claimedAt = '';
      persist();
      return ok(Object.assign(adminOverview(), { roster: rosterView(r.classId) }));
    },
    apiAdminDeleteRosterTeam: function (t, teamId) {
      if (auth(t).role !== 'researcher') return err('這個動作只有研究者可以做。');
      auth(t);
      var tm = teamById(teamId);
      if (!tm) return err('找不到這一組。');
      var claimed = DB.Roster.filter(function (r) { return r.teamId === teamId && r.claimedBy; });
      if (claimed.length) return err('這一組已經有 ' + claimed.length + ' 個人認領了。');
      DB.Roster = DB.Roster.filter(function (r) { return r.teamId !== teamId; });
      DB.Teams = DB.Teams.filter(function (x) { return x.teamId !== teamId; });
      persist();
      return ok(Object.assign(adminOverview(), { roster: rosterView(tm.classId) }));
    },
    apiMyRoster: function (t) {
      if (auth(t).role !== 'student') return err('這個動作只有學生可以做。');
      var u = auth(t);
      var view = rosterView(u.classId);
      return ok({ roster: view, hasRoster: view.length > 0 });
    },
    apiClaimIdentity: function (t, rosterId) {
      if (auth(t).role !== 'student') return err('這個動作只有學生可以做。');
      var u = auth(t);
      var r = DB.Roster.filter(function (x) { return x.rosterId === rosterId; })[0];
      if (!r) return err('找不到這個名字。');
      if (r.claimedBy && r.claimedBy !== u.userId) return err('「' + r.memberName + '」已經有人用了。');
      DB.Roster.forEach(function (x) { if (x.claimedBy === u.userId && x.rosterId !== rosterId) { x.claimedBy = ''; } });
      r.claimedBy = u.userId; r.claimedAt = new Date().toISOString();
      u.name = r.memberName; u.teamId = r.teamId;
      persist();
      return ok({ name: r.memberName, teamId: r.teamId });
    },
    apiAdminOverview: function (t) {
      if (auth(t).role !== 'researcher') return err('這個動作只有研究者可以做。'); auth(t); return ok(adminOverview()); },
    apiAdminCreateClass: function (t, name, term, start, weeks, sandbox) {
      if (auth(t).role !== 'researcher') return err('這個動作只有研究者可以做。');
      auth(t);
      if (!String(name || '').trim()) return err('請填班級名稱。');
      DB.Classes.push({ classId: 'k' + uid(), name: name, term: term || '', started: true,
        courseStart: start || '2026-09-14', weekOverride: '', semesterWeeks: Math.max(2, Math.min(156, Math.floor(+weeks||18))), joinCode: 'J' + uid().slice(0, 5).toUpperCase(), teacherId: '', sandbox: sandbox ? 'Y' : '' });
      persist();
      return ok(adminOverview());
    },
    apiAdminUpdateClass: function (t, classId, patch) {
      if (auth(t).role !== 'researcher') return err('這個動作只有研究者可以做。');
      auth(t);
      var kl = classById(classId);
      if (!kl) return err('找不到這個班級。');
      patch = patch || {};
      if (patch.name !== undefined) {
        if (!String(patch.name).trim()) return err('班級名稱不能是空的。');
        kl.name = String(patch.name).trim();
      }
      if (patch.term !== undefined) kl.term = String(patch.term).trim();
      if (patch.courseStart !== undefined) {
        var d = String(patch.courseStart).trim();
        if (d && !/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/.test(d)) return err('開課日期要寫成 2026-09-14 這種格式。');
        kl.courseStart = d;
      }
      if (patch.semesterWeeks !== undefined) {
        var w = Math.floor(Number(patch.semesterWeeks) || 0);
        if (w < 2 || w > 156) return err('學期週數要在 2 到 156 之間。');
        kl.semesterWeeks = w;
      }
      if (patch.weekOverride !== undefined) {
        var o = String(patch.weekOverride).trim();
        kl.weekOverride = o === '' ? '' : Math.max(1, Math.floor(Number(o) || 1));
      }
      if (patch.sandbox !== undefined) kl.sandbox = patch.sandbox ? 'Y' : '';
      if (patch.joinCode !== undefined) {
        var code = String(patch.joinCode).trim().toUpperCase();
        if (!/^[A-Z0-9]{4,10}$/.test(code)) return err('邀請碼只能用 4 到 10 個英數字。');
        var clash = DB.Classes.filter(function (k) {
          return String(k.joinCode).toUpperCase() === code && String(k.classId) !== String(classId);
        })[0];
        if (clash) return err('這組邀請碼已經被「' + clash.name + '」用了。');
        kl.joinCode = code;
      }
      persist();
      return ok(adminOverview());
    },
    apiAdminDeleteClass: function (t, classId, confirmName) {
      if (auth(t).role !== 'researcher') return err('這個動作只有研究者可以做。');
      auth(t);
      var kl = classById(classId);
      if (!kl) return err('找不到這個班級。');
      if (String(confirmName || '').trim() !== String(kl.name).trim()) {
        return err('要刪掉「' + kl.name + '」的話，請把班級名稱一字不差地再打一次。');
      }
      var users = DB.Users.filter(function (u) { return String(u.classId) === String(classId); });
      if (users.length) {
        return err('這個班還有 ' + users.length + ' 個帳號（' +
          users.slice(0, 3).map(function (u) { return u.account; }).join('、') +
          (users.length > 3 ? ' 等' : '') + '）。先把帳號刪掉或移到別班，才能刪這個班。');
      }
      var teams = DB.Teams.filter(function (x) { return String(x.classId) === String(classId); });
      var ids = {};
      teams.forEach(function (x) { ids[String(x.teamId)] = 1; });
      var tasks = DB.Tasks.filter(function (x) { return String(x.classId) === String(classId); });
      var byTeam = function (name, field) {
        DB[name] = DB[name].filter(function (r) { return !ids[String(r[field])]; });
      };
      ['Teams|teamId', 'TeamTasks|teamId', 'Submissions|teamId', 'Reviews|teamId',
       'Plans|teamId', 'Passes|teamId', 'Finales|teamId', 'Files|teamId'].forEach(function (pair) {
        var a = pair.split('|'); byTeam(a[0], a[1]);
      });
      DB.Reads = DB.Reads.filter(function (r) {
        return !ids[String(r.readerTeam)] && !ids[String(r.targetTeam)];
      });
      DB.Roster = DB.Roster.filter(function (r) { return String(r.classId) !== String(classId); });
      DB.Tasks = DB.Tasks.filter(function (x) { return String(x.classId) !== String(classId); });
      DB.Classes = DB.Classes.filter(function (k) { return String(k.classId) !== String(classId); });
      persist();
      return ok(Object.assign(adminOverview(), { removed: { teams: teams.length, tasks: tasks.length } }));
    },
    apiAdminCreateUser: function (t, p) {
      if (auth(t).role !== 'researcher') return err('這個動作只有研究者可以做。');
      auth(t);
      p = p || {};
      if (['teacher', 'student'].indexOf(p.role) < 0) return err('身分要選老師或學生。');
      if (!String(p.name || '').trim()) return err('請填姓名。');
      if (String(p.account || '').trim().length < 3) return err('帳號至少 3 個字。');
      if (String(p.password || '').length < 4) return err('初始密碼至少 4 個字。');
      if (findUser(p.account)) return err('這個帳號已經有人用了。');
      if (!classById(p.classId)) return err('先選一個班級（沒有的話先開一個班）。');
      var u = { userId: 'u' + uid(), account: p.account.trim(), pw: p.password, role: p.role,
                name: p.name.trim(), classId: p.classId, teamId: '', coder: '' };
      DB.Users.push(u);
      if (p.role === 'teacher' && !classById(p.classId).teacherId) classById(p.classId).teacherId = u.userId;
      persist();
      return ok(adminOverview());
    },
    apiAdminUpdateUser: function (t, userId, patch) {
      if (auth(t).role !== 'researcher') return err('這個動作只有研究者可以做。');
      auth(t);
      var u = DB.Users.filter(function (x) { return x.userId === userId; })[0];
      if (!u) return err('找不到這個帳號。');
      if (patch && patch.name && String(patch.name).trim()) {
        var old = u.name;
        u.name = String(patch.name).trim();
        if (u.teamId) {
          var tm = teamById(u.teamId);
          if (tm) { var i = tm.members.indexOf(old); if (i >= 0) tm.members[i] = u.name; }
        }
      }
      persist();
      return ok(adminOverview());
    },
    apiAdminResetPassword: function (t, userId, pw) {
      if (auth(t).role !== 'researcher') return err('這個動作只有研究者可以做。');
      auth(t);
      if (String(pw || '').length < 4) return err('新密碼至少 4 個字。');
      var u = DB.Users.filter(function (x) { return x.userId === userId; })[0];
      if (!u) return err('找不到這個帳號。');
      u.pw = pw;
      DB.Sessions = DB.Sessions.filter(function (s) { return s.userId !== userId; });
      persist();
      return ok(adminOverview());
    },
    apiAdminDeleteUser: function (t, userId) {
      if (auth(t).role !== 'researcher') return err('這個動作只有研究者可以做。');
      var me = auth(t);
      if (me.userId === userId) return err('不能刪除自己。');
      DB.Users = DB.Users.filter(function (x) { return x.userId !== userId; });
      DB.Sessions = DB.Sessions.filter(function (s) { return s.userId !== userId; });
      persist();
      return ok(adminOverview());
    },
    apiLogin: function (p) {
      var u = findUser(p.account);
      if (!u || u.pw !== p.password) return err('帳號或密碼不對。');
      var t = 'tk' + uid();
      DB.Sessions.push({ token: t, userId: u.userId });
      persist();
      return ok({ token: t, user: pub(u) });
    },
    apiPing: function (t) { auth(t); return ok({ rev: String(DB._rev || 0) }); },
    apiResume: function (t) { try { return ok({ user: pub(auth(t)) }); } catch (e) { return err(e); } },
    apiLogout: function (t) { DB.Sessions = DB.Sessions.filter(function (s) { return s.token !== t; }); persist(); return ok(); },

    apiCreateTeam: function (t, name) {
      var u = auth(t);
      if (!String(name || '').trim()) return err('請填小隊名稱。');
      var n = DB.Teams.filter(function (x) { return x.classId === u.classId; }).length;
      var id = 'tm' + uid();
      DB.Teams.push({ teamId: id, classId: u.classId, name: '第' + numCn(n + 1) + '組 · ' + name,
        members: [u.name], layer: 1,
        enteredWeek: courseWeekOf(classById(u.classId)), passed: [], toolLevels: {},
        gateText: ['', '', ''], gateSubmitted: false, gateVerdict: '', specNames: {} });
      u.teamId = id;
      persist();
      return ok({ teamId: id });
    },
    apiJoinTeam: function (t, teamId) {
      if (auth(t).role !== 'student') return err('這個動作只有學生可以做。');
      var u = auth(t), tm = teamById(teamId);
      if (!tm) return err('找不到這個小隊。');
      if (tm.members.indexOf(u.name) < 0) tm.members.push(u.name);
      u.teamId = teamId;
      persist();
      return ok({ teamId: teamId });
    },
    apiClassTeams: function (t) {
      var u = auth(t);
      return ok({ teams: DB.Teams.filter(function (x) { return x.classId === u.classId; })
        .map(function (x) { return { teamId: x.teamId, name: x.name, members: x.members }; }) });
    },

    apiBootstrap: function (t) {
      var u = auth(t);
      var classes = classesOf(u);
      var classId = u.classId || (classes[0] && classes[0].id) || '';
      var kl = classById(classId);
      var w = kl ? courseWeekOf(kl) : 1;
      var allTeams = DB.Teams.filter(function (x) { return x.classId === classId; })
        .map(function (x) { return teamPub(x, w); });
      var defs = tasksOfClass(classId);
      var out = { user: pub(u), classes: classes, classId: classId, courseWeek: w,
                  joinCode: kl ? kl.joinCode : '', teams: allTeams, taskDefs: defs,
                  minNames: API.minNamesOf(u.teamId || ''),
                  minNamesByTeam: u.role !== 'student' ? API.minNamesByTeam(classId) : undefined };
      if (u.role !== 'student') {
        /* 每一組在每一層採到幾塊——老師的地圖照真的位置擺人 */
        var layerOf = {};
        DB.Tasks.forEach(function (t) {
          if (String(t.classId) !== String(classId)) return;
          layerOf[String(t.taskId)] = Number(t.layer) || 1;
        });
        var gots = {};
        DB.TeamTasks.forEach(function (r) {
          if (String(r.status) !== 'passed') return;
          var ly = layerOf[String(r.taskId)];
          if (!ly) return;
          var k = String(r.teamId);
          if (!gots[k]) gots[k] = {};
          gots[k][ly] = (gots[k][ly] || 0) + 1;
        });
        allTeams.forEach(function (t) { t.got = gots[t.id] || {}; });
      }
      if (u.role === 'student') {
        out.myTeamId = u.teamId || '';
        out.layerSaid = {};
        DB.Passes.forEach(function (p) {
          if (p.teamId !== u.teamId || p.verdict !== 'pass') return;
          var into = (Number(p.layer) || 1) + 1;
          if (p.reason) out.layerSaid[into] = String(p.reason);
        });
        out.record = recordOf(u.teamId, u.classId);
        out.finds = findsOf(u.userId);
        out.codex = codexOfUser(u.userId);
        out.findsTotal = FINDS_N;
        out.clears = clearsOfUser(u.userId);
        var me = teamById(u.teamId);
        if (me) {
          out.myTeam = teamPub(me, w);
          var fM = (DB.Finales||[]).filter(function (x) { return x.teamId === me.teamId; })[0];
          out.myTeam.finaleOpened = !!(fM && fM.opened);
          out.tasks = mergeTasks(tasksOfClass(classId, me.teamId), ttmap(me.teamId), w, me.teamId, kl);
          out.plan = {};
          DB.Plans.forEach(function (p) { if (p.teamId !== me.teamId) return; var b = p.toWeek||p.week||1, a = p.fromWeek||b; out.plan[p.taskId] = { a: Math.min(a,b), b: b }; });
          out.passedWeek = {};
          DB.TeamTasks.forEach(function (r) { if (r.teamId === me.teamId && r.passedWeek) out.passedWeek[r.taskId] = r.passedWeek; });
          var ids = {}; allTeams.forEach(function (x) { ids[x.id] = 1; });
          out.publicPasses = DB.Passes.filter(function (p) { return p.verdict === 'pass' && ids[p.teamId]; })
            .map(function (p) { return { teamId: p.teamId, layer: p.layer, week: p.week, cells: p.cells, reason: p.reason }; });
        }
      }
      if (u.role === 'teacher') {
        var myT = {}; DB.Teams.filter(function (x) { return x.classId === u.classId; }).forEach(function (x) { myT[x.teamId] = 1; });
        var mineR = (DB.Reviews||[]).filter(function (r) { return myT[r.teamId] && String(r.reason||'').trim(); });
        var heads = {};
        mineR.forEach(function (r) { var h = String(r.reason).trim().split(/[。，、；\n]/)[0].trim();
          if (h.length >= 4 && h.length <= 18) heads[h] = (heads[h]||0) + 1; });
        out.myPhrases = Object.keys(heads).filter(function (h) { return heads[h] >= 3; })
          .sort(function (a,b) { return heads[b]-heads[a]; }).slice(0,5).map(function (h) { return { text: h, n: heads[h] }; });
        var byL = {};
        mineR.forEach(function (r) { var n = +r.layer || 1; if (!byL[n]) byL[n] = {n:0,len:0};
          byL[n].n++; byL[n].len += String(r.reason).trim().length; });
        out.myWriting = [1,2,3,4,5].map(function (n) { var b = byL[n];
          return { layer: n, count: b?b.n:0, avg: b?Math.round(b.len/b.n):0 }; });
        out.teamTasks = {}; out.queue = []; out.gates = [];
        allTeams.forEach(function (tm) {
          var list = mergeTasks(tasksOfClass(classId, tm.id), ttmap(tm.id), w, tm.id, kl);
          out.teamTasks[tm.id] = list;
          list.forEach(function (task) {
            if (task.status === 'submitted') out.queue.push({
              id: tm.id + '::' + task.id, teamId: tm.id, teamName: tm.name, taskId: task.id,
              title: task.title, layer: task.layer, type: task.type, text: task.text, spec: task.spec || '', effort: task.effort, effortNote: task.effortNote, blocker: task.blocker,
              files: task.files, over: task.over, due: task.due, weeks: tm.weeks, cond: task.cond, mineral: task.mineral });
          });
          /* 每一組都列出來，不管有沒有送過申請——放行完全由老師決定 */
          if (Number(tm.layer) <= 4) out.gates.push({
            teamId: tm.id, teamName: tm.name, layer: tm.layer, cells: tm.gateText,
            weeks: tm.weeks, applied: !!tm.gateSubmitted });
        });
      }
      return ok(out);
    },

    apiSubmitItem: function (t, taskId, text, files, reflect) {
      if (auth(t).role !== 'student') return err('這個動作只有學生可以做。');
      var u = auth(t);
      reflect = reflect || {};
      if (['fast', 'onpar', 'slow'].indexOf(reflect.effort) < 0) return err('先說一次實際花的力氣跟原本估的差多少。');
      /* 排程門檻拿掉了：任務頁上沒有地方排，就不能拿它擋交件。 */
      var kl = classById(u.classId), w = courseWeekOf(kl);
      var attempt = DB.Submissions.filter(function (s) { return s.taskId === taskId && s.teamId === u.teamId; }).length + 1;
      var def = DB.Tasks.filter(function (x) { return x.taskId === taskId; })[0] || {};
      var dw = dueWeekOf(def.due);
      DB.Submissions.push({ subId: 's' + uid(), taskId: taskId, teamId: u.teamId, week: w,
        dueWeek: dw || '', overdue: dw !== null && dw < w, len: String(text || '').trim().length,
        files: (files || []).length, attempt: attempt, text: text,
        effort: reflect.effort, effortNote: reflect.effortNote || '', blocker: reflect.blocker || '', ts: NOW() });
      var m = ttmap(u.teamId)[taskId];
      var patch = { status: 'submitted', text: text, files: files,
                    effort: reflect.effort, effortNote: reflect.effortNote || '', blocker: reflect.blocker || '' };
      if (m) Object.assign(m, patch);
      else DB.TeamTasks.push(Object.assign({ teamId: u.teamId, taskId: taskId, fb: '', fbType: '', passedWeek: null }, patch));
      persist();
      return ok({ attempt: attempt });
    },
    apiUploadFile: function (t, taskId, name, mime, b64) {
      if (auth(t).role !== 'student') return err('這個動作只有學生可以做。');
      var u = auth(t);
      var size = Math.floor(String(b64 || '').length * 3 / 4);
      if (size > 10 * 1024 * 1024) return err('單檔上限 10 MB。');
      var kind = /^image\//.test(mime) ? 'image' : /^video\//.test(mime) ? 'video'
               : /pdf|word|document|sheet|presentation|text/.test(String(mime)) ? 'doc' : 'file';
      var id = 'f' + uid();
      DB.Files = DB.Files || [];
      DB.Files.push({ fileId: id, teamId: u.teamId, taskId: taskId, name: name, mimeType: mime,
                      size: size, kind: kind, uploadedBy: u.userId, body: b64.slice(0, 400000) });
      persist();
      return ok({ file: { id: id, name: name, mimeType: mime, size: size, kind: kind } });
    },
    apiGetFile: function (t, fileId) {
      var u = auth(t);
      var f = (DB.Files || []).filter(function (x) { return x.fileId === fileId; })[0];
      if (!f) return err('找不到檔案。');
      var okRead = (u.role === 'student' && u.teamId === f.teamId) || u.role === 'teacher';
      if (!okRead) return err('你沒有權限看這個檔案。');
      return ok({ name: f.name, mimeType: f.mimeType, dataUrl: 'data:' + f.mimeType + ';base64,' + f.body });
    },
    apiDeleteFile: function (t, fileId) {
      if (auth(t).role !== 'student') return err('這個動作只有學生可以做。');
      auth(t);
      DB.Files = (DB.Files || []).filter(function (x) { return x.fileId !== fileId; });
      persist();
      return ok();
    },
    apiTaskHistory: function (t, teamId, taskId) {
      var u = auth(t);
      var tid = (u.role === "student") ? u.teamId : (teamId || u.teamId);
      var subs = DB.Submissions.filter(function (s) { return s.taskId === taskId && s.teamId === tid; })
        .sort(function (a, b) { return (a.attempt || 0) - (b.attempt || 0); });
      var revs = DB.Reviews.filter(function (r) { return r.taskId === taskId && r.teamId === tid; });
      var rounds = subs.map(function (s, i) {
        var r = revs[i] || null;
        return { n: s.attempt || (i + 1), week: s.week, text: s.text || "", len: s.len || 0,
                 files: s.files || [], effort: s.effort || "", effortNote: s.effortNote || "", blocker: s.blocker || "",
                 result: r ? r.result : "", reason: r ? (r.reason || "") : "",
                 reviewWeek: r ? r.week : 0, hasReason: r ? !!r.hasReason : false };
      });
      return ok({ rounds: rounds, attempts: rounds.length,
                  rejected: rounds.filter(function (x) { return x.result === "needfix"; }).length });
    },
    apiFinale: function (t, teamId) {
      if (auth(t).role === 'researcher') return err('沒有權限。');
      var u = auth(t);
      var tid = (u.role === "student") ? u.teamId : (teamId || "");
      var tm = teamById(tid); if (!tm) return err("找不到這一組。");
      var defs = tasksOfClass(tm.classId, tid), m = ttmap(tid);
      var plans = {}; DB.Plans.forEach(function (p) { if (p.teamId === tid) plans[p.taskId] = { a: p.fromWeek || p.toWeek || p.week, b: p.toWeek || p.week }; });
      var subs = DB.Submissions.filter(function (s) { return s.teamId === tid; });
      var revs = DB.Reviews.filter(function (r) { return r.teamId === tid; });
      var rows = defs.map(function (d) {
        var st = m[d.id] || {};
        var ms = subs.filter(function (s) { return s.taskId === d.id; });
        var mr = revs.filter(function (r) { return r.taskId === d.id; });
        var pl = plans[d.id] || null;
        return { id: d.id, layer: d.layer, type: d.type, title: d.title, mineral: d.mineral,
                 status: st.status || "todo", planFrom: pl ? pl.a : 0, planTo: pl ? pl.b : 0,
                 realWeek: st.passedWeek || 0, attempts: ms.length,
                 rejected: mr.filter(function (r) { return r.result === "needfix"; }).length,
                 effort: ms[0] ? (ms[0].effort || "") : "",
                 lastEffort: ms.length ? (ms[ms.length-1].effort || "") : "",
                 lastResult: mr.length ? mr[mr.length-1].result : "" };
      });
      var seen = {}, cross = { agree: 0, optimistic: 0, conservative: 0, total: 0 };
      revs.forEach(function (r) {
        var i = seen[r.taskId] = (seen[r.taskId] || 0) + 1;
        var ms = subs.filter(function (s) { return s.taskId === r.taskId; }).sort(function (a, b) { return (a.attempt||0)-(b.attempt||0); });
        var s = ms[i - 1]; if (!s || !s.effort) return;
        cross.total++;
        if (s.effort === "slow" && r.result === "needfix") cross.agree++;
        else if (s.effort !== "slow" && r.result === "pass") cross.agree++;
        else if (s.effort !== "slow" && r.result === "needfix") cross.optimistic++;
        else cross.conservative++;
      });
      DB.Finales = DB.Finales || [];
      var f = DB.Finales.filter(function (x) { return x.teamId === tid; })[0] || null;
      return ok({ team: tm.name, layer: tm.layer, passed: tm.passed || [], toolLevels: tm.toolLevels || {},
                  specNames: tm.specNames || {}, rows: rows, cross: cross,
                  stats: journeyStats(tid, tm.classId),   /* 統整與封存讀同一份 */
                  totalRejected: revs.filter(function (r) { return r.result === "needfix"; }).length,
                  totalSubs: subs.length, finale: f });
    },
    apiSaveFinale: function (t, a, submit) {
      if (auth(t).role !== 'student') return err('這個動作只有學生可以做。');
      var u = auth(t);
      DB.Finales = DB.Finales || [];
      var f = DB.Finales.filter(function (x) { return x.teamId === u.teamId; })[0];
      if (!f || !f.opened) return err("結局還沒開。老師放行之後才寫得了。");
      var row = { teamId: u.teamId, q1: a.q1||"", q2: a.q2||"", q3: a.q3||"", lightName: a.lightName||"", submitted: !!submit,
                  opened: f.opened, openWords: f.openWords||"", openedBy: f.openedBy||"", openedAt: f.openedAt||"" };
      if (f) Object.assign(f, row); else DB.Finales.push(row);
      persist();
      return ok();
    },
    apiOpenFinale: function (t, teamId, words) {
      if (auth(t).role !== 'teacher') return err('這個動作只有老師可以做。');
      var u = auth(t);
      if (u.role !== "teacher") return err("只有老師能放行。");
      var tm = teamById(teamId);
      if (!tm) return err("找不到這一組。");
      if ((tm.passed||[]).indexOf(4) < 0) return err("這一組還沒走完第四區，結局開不了。");
      if (!String(words||"").trim()) return err("先寫下你要說的話。這是他們在結局最上面讀到的第一句。");
      DB.Finales = DB.Finales || [];
      var f = DB.Finales.filter(function (x) { return x.teamId === teamId; })[0];
      if (!f) { f = { teamId: teamId, q1:"", q2:"", q3:"", lightName:"", submitted:false }; DB.Finales.push(f); }
      f.opened = true; f.openWords = String(words);
      f.openedBy = u.name || u.account || ""; f.openedAt = new Date().toISOString();
      persist();
      return ok({ opened: true });
    },
    apiFinaleQueue: function (t) {
      if (auth(t).role !== 'teacher') return err('這個動作只有老師可以做。');
      var u = auth(t);
      if (u.role !== "teacher") return err("只有老師看得到這一份。");
      DB.Finales = DB.Finales || [];
      var kl = classById(u.classId), w = kl ? courseWeekOf(kl) : 1;
      var list = DB.Teams.filter(function (x) { return x.classId === u.classId; }).map(function (tm) {
        var f = DB.Finales.filter(function (x) { return x.teamId === tm.teamId; })[0] || {};
        return { teamId: tm.teamId, name: tm.name, layer: tm.layer,
                 weeks: Math.max(1, w - (tm.enteredWeek||1) + 1),
                 done5: (tm.passed||[]).indexOf(4) >= 0,
                 applied: !!f.submitted, opened: !!f.opened, openWords: f.openWords||"",
                 submittedAt: f.ts ? String(f.ts) : "" };
      });
      return ok({ list: list, courseWeek: w });
    },
    apiSavePlan: function (t, taskId, from, to) {
      if (auth(t).role !== 'student') return err('這個動作只有學生可以做。');
      var u = auth(t);
      var a = Math.max(1, Math.floor(+from||1)), b = Math.max(a, Math.floor(+to||a));
      var p = DB.Plans.filter(function (x) { return x.teamId === u.teamId && x.taskId === taskId; })[0];
      if (p) { p.week = b; p.fromWeek = a; p.toWeek = b; }
      else DB.Plans.push({ teamId: u.teamId, taskId: taskId, week: b, fromWeek: a, toWeek: b });
      persist();
      return ok();
    },
    apiSetSemesterWeeks: function (t, classId, weeks) {
      if (auth(t).role !== 'teacher') return err('這個動作只有老師可以做。');
      auth(t);
      var k = classById(classId); if (k) k.semesterWeeks = Math.max(2, Math.min(156, Math.floor(+weeks||18)));
      persist();
      return ok({ semesterWeeks: k ? k.semesterWeeks : 18 });
    },
    _vein: function (classId, layer, teamId) {
      var all = MIN_BY_LAYER[layer] || [];
      var used = {};
      tasksOfClass(classId, teamId).forEach(function (d) { if (d.layer === layer && d.mineral) used[d.mineral] = 1; });
      return { total: all.length, left: all.filter(function (n) { return !used[n]; }) };
    },
    _veinStatus: function (classId) {
      var out = {};
      for (var n = 1; n <= 5; n++) { var v = API._vein(classId, n); out[n] = { total: v.total, open: v.total - v.left.length, left: v.left }; }
      return out;
    },
    _missReq: function (tid) {
      var tm = teamById(tid); if (!tm) return null;
      var m = ttmap(tid);
      return tasksOfClass(tm.classId, tid).filter(function (d) {
        if (d.layer !== tm.layer) return false;
        var s = m[d.id]; return !s || s.status !== "passed";
      });
    },
    apiLogRead: function (t, target) {
      if (auth(t).role !== 'student') return err('這個動作只有學生可以做。');
      var u = auth(t), kl = classById(u.classId), w = courseWeekOf(kl);
      var me = teamById(u.teamId), tg = teamById(target);
      if (!me || !tg) return ok();
      var rejected = DB.TeamTasks.some(function (r) { return r.teamId === u.teamId && r.status === 'needs_more'; });
      DB.Reads.push({ readId: 'r' + uid(), readerTeam: u.teamId, targetTeam: target, layer: tg.layer,
        week: w, readerLayer: me.layer, readerStay: Math.max(1, w - me.enteredWeek + 1), recentlyRejected: rejected });
      persist();
      return ok();
    },
    taskTeams: function (t) {
      var raw = t && t.teams;
      if (raw === undefined || raw === null || String(raw).trim() === '') return [];
      var a = typeof raw === 'object' ? raw : (function () { try { return JSON.parse(raw); } catch (e) { return null; } })();
      if (!a || !a.length) return [];
      return a.map(function (x) { return String(x); });
    },
    forTeam: function (t, teamId) {
      var only = API.taskTeams(t);
      return !only.length || only.indexOf(String(teamId)) >= 0;
    },
    cleanTeams: function (classId, list) {
      if (!list || !list.length) return [];
      var ok = {};
      DB.Teams.forEach(function (t) { if (String(t.classId) === String(classId)) ok[String(t.teamId)] = 1; });
      var out = [];
      list.forEach(function (x) { var id = String(x); if (ok[id] && out.indexOf(id) < 0) out.push(id); });
      return out.length >= Object.keys(ok).length ? [] : out;
    },
    minNamesOf: function (teamId) {
      var out = {};
      if (!teamId) return out;
      (DB.MinNames || []).forEach(function (r) {
        if (String(r.teamId) !== String(teamId)) return;
        out[String(r.mineral)] = { label: String(r.label || ''), note: String(r.note || '') };
      });
      return out;
    },
    minNamesByTeam: function (classId) {
      var mine = {};
      DB.Teams.forEach(function (t) { if (String(t.classId) === String(classId)) mine[String(t.teamId)] = {}; });
      (DB.MinNames || []).forEach(function (r) {
        var tid = String(r.teamId);
        if (!mine[tid]) return;
        mine[tid][String(r.mineral)] = { label: String(r.label || ''), note: String(r.note || '') };
      });
      return mine;
    },
    apiSetMineralName: function (t, teamId, mineral, label, note) {
      var u = auth(t);
      if (u.role !== 'teacher' && u.role !== 'researcher') return err('只有老師可以改拆分名稱。');
      var tm = teamById(teamId);
      if (!tm) return err('找不到這一組。');
      var name = String(mineral || '').trim();
      if (!name) return err('要改哪一塊？');
      var lb = String(label || '').trim(), nt = String(note || '').trim();
      if (lb.length > 40) return err('工作名稱請控制在 40 個字以內。');
      if (nt.length > 200) return err('說法請控制在 200 個字以內。');
      DB.MinNames = (DB.MinNames || []).filter(function (r) {
        return !(String(r.teamId) === String(teamId) && String(r.mineral) === name);
      });
      if (lb || nt) DB.MinNames.push({ teamId: teamId, mineral: name, label: lb, note: nt });
      persist();
      return ok({ teamId: teamId, minNames: API.minNamesOf(teamId),
                  minNamesByTeam: API.minNamesByTeam(tm.classId) });
    },
    apiSaveSpecName: function (t, key, name) {
      if (auth(t).role !== 'student') return err('這個動作只有學生可以做。');
      var u = auth(t), tm = teamById(u.teamId);
      if (tm) { tm.specNames[key] = name; persist(); }
      return ok();
    },

    /* 礦脈是每一組各自的四格：只給某幾組的任務，只佔用那幾組的格子 */
    freeMin: function (classId, layer, selfId, forTeams) {
      var all = DB.Teams.filter(function (t) { return String(t.classId) === String(classId); })
                        .map(function (t) { return String(t.teamId); });
      var targets = (forTeams && forTeams.length) ? forTeams.map(String) : all;
      var used = {};
      DB.Tasks.forEach(function (x) {
        if (String(x.classId) !== String(classId) || !x.mineral) return;
        if (x.taskId === selfId) return;
        if (Number(x.layer) !== Number(layer)) return;
        var clash = !targets.length || targets.some(function (tid) { return API.forTeam(x, tid); });
        if (clash) used[x.mineral] = 1;
      });
      return (MIN_BY_LAYER[layer] || []).filter(function (n) { return !used[n]; });
    },
    apiSaveTask: function (t, classId, task) {
      if (auth(t).role !== 'teacher') return err('這個動作只有老師可以做。');
      auth(t);
      var id = task.id || ('tk' + uid());
      if (!String(task.mineral || '').trim()) task.mineral = (API.freeMin(classId, task.layer, id, API.cleanTeams(classId, task.teams)) || [])[0] || '';
      var ex = DB.Tasks.filter(function (x) { return x.taskId === id; })[0];
      var row = { taskId: id, classId: classId, layer: task.layer, type: task.type, title: task.title,
                  cond: task.cond, note: task.note, spec: task.spec || '', due: task.due, mineral: task.mineral, mDesc: task.mDesc,
                  teams: JSON.stringify(API.cleanTeams(classId, task.teams)),
                  checks: JSON.stringify(checkList(task.checks)) };
      if (ex) Object.assign(ex, row); else DB.Tasks.push(row);
      persist();
      return ok({ taskId: id });
    },
    /* 學生勾／取消勾清單上的一條 */
    apiSetVow: function (t, taskId, vow) {
      var u = auth(t);
      if (u.role !== 'student' || !u.teamId) return err('只有學生可以宣告。');
      var k = String(vow || '');
      if (VOWS.indexOf(k) < 0 && k !== '') return err('沒有這一種破法。');
      var row = ttmap(u.teamId)[taskId];
      if (row && row.status === 'submitted') return err('已經送出去了，宣告不能改。');
      if (row && row.status === 'passed') return err('這一項已經過了。');
      if (row) row.vow = k;
      else DB.TeamTasks.push({ teamId: u.teamId, taskId: taskId, status: 'todo',
        text: '', files: [], fb: '', fbType: '', passedWeek: null, checked: [], vow: k });
      persist();
      return ok({ vow: k });
    },
    apiSetCheck: function (t, taskId, idx, on) {
      var u = auth(t);
      if (u.role !== 'student' || !u.teamId) return err('只有學生可以勾。');
      var def = tasksOfClass(u.classId, u.teamId).filter(function (d) { return d.id === taskId; })[0];
      if (!def) return err('找不到這一項任務。');
      var n = Number(idx);
      if (!(n >= 0 && n < def.checks.length)) return err('沒有這一條。');
      var row = ttmap(u.teamId)[taskId];
      if (row && row.status === 'passed') return err('這一項已經通過了，不用再改。');
      var set = {};
      checkList2(row && row.checked).forEach(function (x) { set[x] = true; });
      if (on) set[n] = true; else delete set[n];
      var next = Object.keys(set).map(Number)
        .filter(function (x) { return x >= 0 && x < def.checks.length; })
        .sort(function (a, b) { return a - b; });
      if (row) row.checked = next;
      else DB.TeamTasks.push({ teamId: u.teamId, taskId: taskId, status: 'todo',
        text: '', files: [], fb: '', fbType: '', passedWeek: null, checked: next });
      DB.Checks.push({ ckId: 'ck' + uid(), teamId: u.teamId, taskId: taskId,
        idx: n, act: on ? 'on' : 'off', by: u.userId || u.account || '', ts: NOW() });
      persist();
      return ok({ checked: next, total: def.checks.length, star: starOf(u.teamId, taskId) });
    },
    /* 排行榜點進某一組看他們的紀錄。同一班才看得到。 */
    apiTeamRecord: function (t, teamId) {
      var u = auth(t);
      var tm = DB.Teams.filter(function (x) { return String(x.teamId) === String(teamId); })[0];
      if (!tm) return err('找不到這一組。');
      if (String(tm.classId) !== String(u.classId)) return err('不同班，看不到。');
      return ok({
        teamId: String(teamId),
        name: tm.name || String(teamId),
        me: String(teamId) === String(u.teamId || ''),
        record: recordOf(teamId, u.classId)
      });
    },

    apiRoster: function (t) {
      var u = auth(t);
      var firsts = firstsOf(u.classId);
      var mine = {};
      Object.keys(firsts).forEach(function (k) {
        mine[firsts[k].teamId] = (mine[firsts[k].teamId] || 0) + 1;
      });
      var out = DB.Teams.filter(function (x) { return x.classId === u.classId; })
        .map(function (x) {
          var sc = scoreOf(x.teamId, u.classId);
          return { teamId: x.teamId, name: x.name || x.teamId,
                   me: x.teamId === (u.teamId || ''),
                   ticks: sc.ticks, pages: sc.pages, vows: sc.vows,
                   finds: sc.finds, layers: sc.layers,
                   base: sc.base, bonus: sc.bonus, total: sc.total,
                   firsts: mine[String(x.teamId)] || 0 };
        });
      out.sort(function (a, b) { return b.total - a.total; });
      var racing = {};
      DB.TeamTasks.forEach(function (r) {
        if (r.status !== 'submitted') return;
        racing[String(r.taskId)] = (racing[String(r.taskId)] || 0) + 1;
      });
      var claims = tasksOfClass(u.classId, '').map(function (d) {
        var f = firsts[String(d.id)];
        return { taskId: d.id, layer: Number(d.layer) || 1,
                 mineral: d.mineral || d.title, title: d.title,
                 by: f ? f.name : '', mine: !!(f && String(f.teamId) === String(u.teamId || '')),
                 racing: f ? 0 : (racing[String(d.id)] || 0) };
      });
      return ok({ roster: out, claims: claims });
    },
    apiDeleteTask: function (t, taskId) {
      if (auth(t).role !== 'teacher') return err('這個動作只有老師可以做。');
      auth(t);
      DB.Tasks = DB.Tasks.filter(function (x) { return x.taskId !== taskId; });
      DB.TeamTasks = DB.TeamTasks.filter(function (x) { return x.taskId !== taskId; });
      persist();
      return ok();
    },
    apiPublishList: function (t, classId, layer, items) {
      if (auth(t).role !== 'teacher') return err('這個動作只有老師可以做。');
      auth(t);
      (items || []).forEach(function (it) {
        var min = String(it.mineral || '').trim() || (API.freeMin(classId, layer, null, API.cleanTeams(classId, it.teams)) || [])[0] || '';
        var row = { taskId: it.id || ('tk' + uid()), classId: classId, layer: layer, type: it.type,
          title: it.title, cond: it.cond, note: it.note, spec: it.spec || '', due: it.due, mineral: min, mDesc: it.mDesc,
          teams: JSON.stringify(API.cleanTeams(classId, it.teams)),
          checks: JSON.stringify(checkList(it.checks)) };
        /* 帶了 id 就是改寫既有那一項，不然重發整層會長出一模一樣的第二份 */
        var at = -1;
        for (var i = 0; i < DB.Tasks.length; i++) {
          if (String(DB.Tasks[i].taskId) === String(row.taskId)) { at = i; break; }
        }
        if (at >= 0) DB.Tasks[at] = Object.assign({}, DB.Tasks[at], row);
        else DB.Tasks.push(row);
      });
      persist();
      return ok();
    },
    apiReviewItem: function (t, teamId, taskId, result, reason, gave) {
      if (auth(t).role !== 'teacher') return err('這個動作只有老師可以做。');
      auth(t);
      var tm = teamById(teamId), kl = classById(tm.classId), w = courseWeekOf(kl);
      var pass = result === 'pass';
      var txt = String(reason || '');
      /* 審的是最後那一次提交——subId 要記下來，之後才追得出「退回後怎麼了」 */
      var lastSub = DB.Submissions.filter(function (x) {
        return x.taskId === taskId && x.teamId === teamId;
      }).slice(-1)[0] || null;
      DB.Reviews.push({ revId: 'rv' + uid(), subId: lastSub ? lastSub.subId : '', teamId: teamId, taskId: taskId,
        title: (DB.Tasks.filter(function (x) { return x.taskId === taskId; })[0] || {}).title || '',
        layer: (DB.Tasks.filter(function (x) { return x.taskId === taskId; })[0] || {}).layer || 1,
        result: pass ? 'pass' : 'needfix', reason: txt, len: txt.length, hasReason: !!txt.trim(),
        week: w, latency: 12, ts: NOW() });
      var m = ttmap(teamId)[taskId];
      /* 真後端用 upsert_，學生沒送過也會建立那一列。假後端原本什麼都
         不做，兩邊行為不一致 —— 而在新設計裡老師本來就可以直接判過。 */
      if (!m) {
        m = { teamId: teamId, taskId: taskId, status: 'todo', text: '', files: [],
              fb: '', fbType: '', passedWeek: null, checked: [], vow: '' };
        DB.TeamTasks.push(m);
      }
      var find = 0, findsArr = [];
      var gaveN = Math.max(1, Math.min(5, Number(gave) || 1));
      if (m) {
        m.status = pass ? 'passed' : 'needs_more';
        m.fb = txt || (pass ? '（未附理由）' : '');
        m.fbType = pass ? 'pass' : 'more';
        if (pass) m.passedWeek = w;
        /* 過關掉一件掉落物。已經掉過的不重掉（重審不會多給）。 */
        var defNow = tasksOfClass(tm.classId, teamId).filter(function (d) { return d.id === taskId; })[0];
        /* 掉幾件＝層數 ＋（老師給的 1–5 − 1）。已經掉過的不重掉。 */
        var prevFinds = Array.isArray(m.finds) ? m.finds : [];
        findsArr = prevFinds;
        if (pass && !prevFinds.length) {
          var layerNow = defNow ? (Number(defNow.layer) || 1) : 1;
          findsArr = rollFindsIn(layerNow, findCount(layerNow, gaveN));
        }
        if (pass) {
          m.finds = findsArr;
          m.gave = gaveN;
          m.find = findsArr[0] || '';
          m.find2 = findsArr[1] || '';
          find = Number(m.find) || 0;
        }
      }
      persist();
      return ok({ find: find, find2: (m && Number(m.find2)) || 0,
                  finds: pass ? findsArr : [], gave: gaveN });
    },
    apiReviewGate: function (t, teamId, pass, toolLevel, reason) {
      if (auth(t).role !== 'teacher') return err('這個動作只有老師可以做。');
      auth(t);
      var tm = teamById(teamId), kl = classById(tm.classId), w = courseWeekOf(kl);
      /* 不再檢查收集——做到什麼程度算「可以往下」是老師自己看。 */
      DB.Passes.push({ passId: 'p' + uid(), teamId: teamId, layer: tm.layer, week: w,
        toolLevel: toolLevel, cells: tm.gateText.slice(), verdict: pass ? 'pass' : 'needfix', reason: reason || '' });
      if (!pass) { tm.gateSubmitted = false; tm.gateVerdict = 'needfix'; persist(); return ok({ passed: false }); }
      if (tm.passed.indexOf(tm.layer) < 0) tm.passed.push(tm.layer);
      tm.toolLevels[tm.layer] = '已交出';
      tm.layer = Math.min(4, tm.layer + 1);
      tm.enteredWeek = w;
      tm.gateText = ['', '', '']; tm.gateSubmitted = false; tm.gateVerdict = 'pass';
      persist();
      return ok({ passed: true, layer: tm.layer });
    },
    /* 中途接手：直接把一組的起點放在第 N 層。cleared = 已經算過了幾層（0～4）。 */
    apiSetTeamLayer: function (t, teamId, cleared, reason) {
      var u = auth(t);
      if (u.role !== 'teacher') return err('這個動作只有老師可以做。');
      var tm = teamById(teamId);
      if (!tm) return err('找不到這一組。');
      var n = Math.max(0, Math.min(4, Number(cleared) || 0));
      var kl = classById(tm.classId), w = courseWeekOf(kl);
      var why = String(reason || '').trim() || '課程中途接手，這幾層在系統外完成。';
      var added = [];
      for (var i = 1; i <= n; i++) {
        if (tm.passed.indexOf(i) >= 0) continue;
        tm.passed.push(i);
        tm.toolLevels[i] = '已交出';
        added.push(i);
        DB.Passes.push({ passId: 'p' + uid(), teamId: teamId, layer: i, week: w,
          toolLevel: '中途接手', cells: ['', '', ''], verdict: 'pass', reason: why });
      }
      tm.passed.sort(function (a, b) { return a - b; });
      tm.layer = Math.min(4, n + 1);
      tm.enteredWeek = w;
      tm.gateText = ['', '', '']; tm.gateSubmitted = false; tm.gateVerdict = '';
      persist();
      return ok({ layer: tm.layer, passed: tm.passed.slice(), added: added });
    },
    /* 一趟的統整。封存與回看都用這一支算。 */
    apiSealJourney: function (t, name) {
      var u = auth(t);
      if (u.role !== 'student') return err('只有學生封存得了自己的旅途。');
      var tm = teamById(u.teamId);
      if (!tm) return err('找不到這一組。');
      if ((tm.passed || []).indexOf(4) < 0) return err('四層都走完才封存得了。');
      var nm = String(name || '').trim().slice(0, 40);
      if (!nm) return err('先給這一趟一個名字。');
      DB.Journeys = DB.Journeys || [];
      var row = DB.Journeys.filter(function (x) { return x.teamId === u.teamId; })[0];
      if (!row) {
        row = { journeyId: 'j' + uid(), teamId: u.teamId, classId: tm.classId,
                sealedAt: new Date().toISOString() };
        DB.Journeys.push(row);
      }
      row.name = nm;
      row.sealedBy = u.name || u.account || '';
      row.stats = journeyStats(u.teamId, tm.classId);
      persist();
      return ok({ sealed: true, name: nm });
    },

    /* 這個人封存過的每一趟，新的在前面。換班換組都接得上。 */
    apiJourneys: function (t) {
      var u = auth(t);
      var mine = teamsOfUser(u.userId);
      if (u.teamId && mine.indexOf(u.teamId) < 0) mine.push(u.teamId);
      var out = (DB.Journeys || []).filter(function (x) { return mine.indexOf(x.teamId) >= 0; })
        .map(function (x) {
          var tm = teamById(x.teamId) || {};
          return { journeyId: x.journeyId, teamId: x.teamId, name: x.name,
                   teamName: tm.name || '', sealedBy: x.sealedBy, sealedAt: x.sealedAt || '',
                   now: x.teamId === u.teamId, stats: x.stats || {} };
        })
        .sort(function (a, b) { return (b.sealedAt || '') < (a.sealedAt || '') ? -1 : 1; });
      return ok({ journeys: out });
    },

    apiSetWeek: function (t, classId, week) {
      auth(t);
      var k = classById(classId);
      k.weekOverride = week;
      persist();
      return ok({ courseWeek: courseWeekOf(k), weekOverride: week });
    },
    apiSwitchClass: function (t, classId) {
      var u = auth(t);
      u.classId = classId;
      persist();
      return API.apiBootstrap(t);
    },

    /* 老師的鏡子：他寫的合格考量在學生那邊發生了什麼 */
    apiTeacherMirror: function (t) {
      var u = auth(t);
      if (u.role !== 'teacher') return err('只有老師看得到這一頁。');
      var mine = {}, teamN = 0;
      DB.Teams.forEach(function (x) {
        if (String(x.classId) !== String(u.classId)) return;
        mine[String(x.teamId)] = x.name || '（未命名）';
        teamN++;
      });
      var subs = DB.Submissions.filter(function (x) { return mine[String(x.teamId)]; });
      var revs = (DB.Reviews || []).filter(function (r) {
        return mine[String(r.teamId)] && String(r.result) !== 'auto';
      });
      var subById = {}, subByTry = {}, maxTry = {};
      subs.forEach(function (x) {
        var k = String(x.teamId) + '|' + String(x.taskId);
        var a = Number(x.attempt) || 1;
        subById[String(x.subId)] = x;
        subByTry[k + '|' + a] = x;
        if (!maxTry[k] || a > maxTry[k]) maxTry[k] = a;
      });
      var revBySub = {};
      revs.forEach(function (r) { if (r.subId) revBySub[String(r.subId)] = r; });
      var blank = function () { return { n:0, needfix:0, len:0, lat:0, landed:0, again:0, waiting:0 }; };
      var byLayer = {}, all = blank(), cases = [];
      [1,2,3,4,5].forEach(function (n) { byLayer[n] = blank(); });
      revs.forEach(function (r) {
        var n = Number(r.layer) || 1;
        var b = byLayer[n] || (byLayer[n] = blank());
        var len = Number(r.len) || String(r.reason || '').trim().length;
        var lat = Number(r.latency) || 0;
        b.n++; b.len += len; b.lat += lat;
        all.n++; all.len += len; all.lat += lat;
        if (String(r.result) !== 'needfix') return;
        b.needfix++; all.needfix++;
        var sb = subById[String(r.subId)];
        var nx = sb && subByTry[String(r.teamId) + '|' + String(r.taskId) + '|' + ((Number(sb.attempt) || 1) + 1)];
        var nr = nx && revBySub[String(nx.subId)];
        if (!nx || !nr) { b.waiting++; all.waiting++; return; }
        if (String(nr.result) === 'needfix') { b.again++; all.again++; return; }
        b.landed++; all.landed++;
        cases.push({ team: mine[String(r.teamId)], title: r.title || '', layer: n,
                     reason: String(r.reason || ''), before: Number(sb.len) || 0,
                     after: Number(nx.len) || 0, week: Number(r.week) || 0 });
      });
      var passedN = 0, totalTry = 0;
      DB.TeamTasks.forEach(function (x) {
        if (!mine[String(x.teamId)] || String(x.status) !== 'passed') return;
        var m = maxTry[String(x.teamId) + '|' + String(x.taskId)];
        if (m) { passedN++; totalTry += m; }
      });
      var avg1 = function (a, n) { return n ? Math.round(a / n * 10) / 10 : 0; };
      var avgI = function (a, n) { return n ? Math.round(a / n) : 0; };
      cases.sort(function (a, b) { return (b.after - b.before) - (a.after - a.before); });
      return ok({
        total: { n: all.n, needfix: all.needfix, pass: all.n - all.needfix, words: all.len,
                 avgLen: avgI(all.len, all.n), avgLat: avgI(all.lat, all.n),
                 avgRounds: avg1(totalTry, passedN), passedN: passedN, teams: teamN },
        landed: { n: all.landed, again: all.again, waiting: all.waiting },
        layers: [1,2,3,4,5].map(function (n) {
          var b = byLayer[n];
          return { layer: n, n: b.n, needfix: b.needfix, landed: b.landed, again: b.again,
                   waiting: b.waiting, avgLen: avgI(b.len, b.n), avgLat: avgI(b.lat, b.n) };
        }),
        cases: cases.slice(0, 3)
      });
    },

    apiResearchSlice: function (t) {
      if (auth(t).role !== 'researcher') return err('這個動作只有研究者可以做。');
      var u = auth(t);
      var w = 1;
      DB.Classes.forEach(function (k) { w = Math.max(w, courseWeekOf(k)); });
      var every = Math.max(1, (DB.Config||{}).unlockEvery || 1); var unlocked = every<=1 ? w : Math.floor(w / every) * every;
      var vis = function (x) { return x.week <= unlocked; };
      /* 試用班的資料不進研究紀錄 */
      var sandboxClass = {};
      DB.Classes.forEach(function (k) { if (String(k.sandbox) === 'Y') sandboxClass[String(k.classId)] = 1; });
      var skipTeam = {};
      DB.Teams.forEach(function (x) { if (sandboxClass[String(x.classId)]) skipTeam[String(x.teamId)] = 1; });
      var realTeam = function (id) { return !skipTeam[String(id)]; };
      var nameOf = {};
      DB.Teams.forEach(function (x) { if (!skipTeam[x.teamId]) nameOf[x.teamId] = x.name; });
      if (!unlocked) return ok({ unlockedThrough: 0, nextUnlock: every, week: w, locked: true, unlockEvery: every, subLog: [], revLog: [], readLog: [], teams: [], codes: {} });
      var codes = {};
      DB.Codes.forEach(function (c) { if (c.coder === (u.coder || 'C1')) codes[c.revId] = c.code; });
      return ok({
        unlockedThrough: unlocked, nextUnlock: unlocked + every, week: w, locked: false, unlockEvery: every,
        subLog: DB.Submissions.filter(function(x){return vis(x)&&realTeam(x.teamId);}).map(function (s) {
          return { taskId: s.taskId, group: nameOf[s.teamId] || s.teamId, title: '', layer: 1, week: s.week,
                   dueWeek: s.dueWeek || 6, overdue: !!s.overdue, len: s.len, files: s.files, attempt: s.attempt, effort: s.effort||'', effortNote: s.effortNote||'', blocker: s.blocker||'', hasBlocker: !!(s.blocker||'').trim() }; }),
        revLog: (function(){ var seen={}; return DB.Reviews.filter(function(x){return vis(x)&&realTeam(x.teamId);}).map(function (r) {
          var k=r.teamId+'::'+r.taskId; var i=seen[k]=(seen[k]||0)+1;
          var ms=DB.Submissions.filter(function(x){return x.teamId===r.teamId&&x.taskId===r.taskId;}).sort(function(a,b){return (a.attempt||0)-(b.attempt||0);});
          var s2=ms[i-1]||null;
          return { id: r.revId, reviewId: r.taskId, teacher: 'T1', group: nameOf[r.teamId] || r.teamId,
                   title: r.title, layer: r.layer, result: r.result, reason: r.reason, len: r.len,
                   hasReason: r.hasReason, week: r.week, latency: r.latency,
                   attempt: s2 ? (s2.attempt||i) : i, subText: s2 ? (s2.text||'') : '', subLen: s2 ? (s2.len||0) : 0,
                   subFiles: s2 ? (s2.files||0) : 0, effort: s2 ? (s2.effort||'') : '',
                   effortNote: s2 ? (s2.effortNote||'') : '', blocker: s2 ? (s2.blocker||'') : '', subWeek: s2 ? s2.week : 0 }; }); })(),
        readLog: DB.Reads.filter(function(x){return vis(x)&&realTeam(x.readerTeam)&&realTeam(x.targetTeam);}).map(function (r) {
          return { reader: nameOf[r.readerTeam], target: nameOf[r.targetTeam], layer: r.layer, week: r.week,
                   readerLayer: r.readerLayer, readerStay: r.readerStay, recentlyRejected: r.recentlyRejected }; }),
        teams: DB.Teams.filter(function (x) { return realTeam(x.teamId); }).map(function (x) {
          return { id: x.teamId, name: x.name, layer: x.layer, weeks: Math.max(1, unlocked - x.enteredWeek + 1), passed: x.passed }; }),
        assigned: DB.Tasks.length, codes: codes
      });
    },
    apiSaveCode: function (t, revId, code) {
      if (auth(t).role !== 'researcher') return err('這個動作只有研究者可以做。');
      var u = auth(t);
      var c = DB.Codes.filter(function (x) { return x.revId === revId && x.coder === (u.coder || 'C1'); })[0];
      if (c) c.code = code; else DB.Codes.push({ revId: revId, coder: u.coder || 'C1', code: code });
      persist();
      return ok();
    },
    apiExportToDrive: function (t, kinds, fullText) {
      auth(t);
      return ok({ name: '（本機預覽）逐層掘進_事件記錄' + (fullText ? '_含原文' : '') + '.csv', url: '#', kinds: kinds });
    }
  };

  /* 用閉包而不是 this：真正的 google.script.run 呼叫時 this 可能是 null */
  function makeRunner(succ, failCb) {
    var s = succ || function () {}, f = failCb || function () {};
    var o = {
      withSuccessHandler: function (s2) { return makeRunner(s2, f); },
      withFailureHandler: function (f2) { return makeRunner(s, f2); }
    };
    Object.keys(API).forEach(function (fn) {
      o[fn] = function () {
        var args = arguments;
        setTimeout(function () {
          var out;
          /* 真後端每一支都包 try/catch 回 { ok:false }，這裡照做，
             不然假 token 之類的會變成 reject，前端的處理路徑就不一樣了 */
          try { out = API[fn].apply(null, args); }
          catch (e) { out = { ok: false, error: String((e && e.message) || e) }; }
          s(out);
        }, 60);
      };
    });
    return o;
  }
  window.google = { script: { run: makeRunner() } };
  window.MOCK_RESET = function () { localStorage.removeItem('jlz.mockdb'); localStorage.removeItem('jlz.token'); location.reload(); };
})();
