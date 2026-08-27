/* 本機預覽用的假後端：把 Code.gs 的 API 用記憶體資料表重刻一份。
   只給開發驗證流程用，不會進 GAS 部署。 */
(function () {
  'use strict';

  var DB = { Users: [], Sessions: [], Classes: [], Teams: [], Tasks: [], TeamTasks: [],
             Submissions: [], Reviews: [], Plans: [], Passes: [], Reads: [], Codes: [],
             Files: [], Roster: [], MinNames: [], Config: { unlockEvery: 1 } };
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
    var s = String(due || '');
    if (s === '不設限') return null;
    var m = /第\s*(\d+)\s*週/.exec(s);
    return m ? Math.max(1, Math.min(156, +m[1])) : null;
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
  function teamPub(t, w) {
    return { id: t.teamId, classId: t.classId, name: t.name, members: t.members || [],
             layer: t.layer, enteredWeek: t.enteredWeek,
             weeks: Math.max(1, w - t.enteredWeek + 1),
             passed: t.passed || [], toolLevels: t.toolLevels || {},
             gateText: t.gateText || ['', '', ''], gateSubmitted: !!t.gateSubmitted,
             gateVerdict: t.gateVerdict || '', specNames: t.specNames || {} };
  }
  function tasksOfClass(cid) {
    return DB.Tasks.filter(function (t) { return t.classId === cid; }).map(function (t) {
      return { id: t.taskId, klass: t.classId, layer: t.layer, type: t.type, title: t.title,
               cond: t.cond, note: t.note, spec: t.spec || '', due: t.due, mineral: t.mineral, mDesc: t.mDesc, published: true };
    });
  }
  function ttmap(teamId) {
    var m = {};
    DB.TeamTasks.forEach(function (r) { if (r.teamId === teamId) m[r.taskId] = r; });
    return m;
  }
  function mergeTasks(defs, m, w) {
    return defs.map(function (d) {
      var s = m[d.id] || { status: 'todo', text: '', files: [], fb: '', fbType: '', effort: '', effortNote: '', blocker: '' };
      var dw = dueWeekOf(d.due);
      return Object.assign({}, d, { status: s.status, text: s.text, files: s.files || [], effort: s.effort||'', effortNote: s.effortNote||'', blocker: s.blocker||'',
        fb: s.fb || '', fbType: s.fbType || '', over: dw !== null && dw < w && s.status !== 'passed' });
    });
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
                 courseWeek: courseWeekOf(k), semesterWeeks: Math.max(2, Math.min(156, +(k.semesterWeeks||18))), joinCode: k.joinCode };
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
    5: ['完成之光']
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
    apiAdminRoster: function (t, classId) { auth(t); return ok({ roster: rosterView(classId) }); },
    apiAdminUnclaim: function (t, rosterId) {
      auth(t);
      var r = DB.Roster.filter(function (x) { return x.rosterId === rosterId; })[0];
      if (!r) return err('找不到這一筆。');
      if (r.claimedBy) { var u = DB.Users.filter(function (x) { return x.userId === r.claimedBy; })[0]; if (u) u.teamId = ''; }
      r.claimedBy = ''; r.claimedAt = '';
      persist();
      return ok(Object.assign(adminOverview(), { roster: rosterView(r.classId) }));
    },
    apiAdminDeleteRosterTeam: function (t, teamId) {
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
      var u = auth(t);
      var view = rosterView(u.classId);
      return ok({ roster: view, hasRoster: view.length > 0 });
    },
    apiClaimIdentity: function (t, rosterId) {
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
    apiAdminOverview: function (t) { auth(t); return ok(adminOverview()); },
    apiAdminCreateClass: function (t, name, term, start, weeks, sandbox) {
      auth(t);
      if (!String(name || '').trim()) return err('請填班級名稱。');
      DB.Classes.push({ classId: 'k' + uid(), name: name, term: term || '', started: true,
        courseStart: start || '2026-09-14', weekOverride: '', semesterWeeks: Math.max(2, Math.min(156, Math.floor(+weeks||18))), joinCode: 'J' + uid().slice(0, 5).toUpperCase(), teacherId: '', sandbox: sandbox ? 'Y' : '' });
      persist();
      return ok(adminOverview());
    },
    apiAdminUpdateClass: function (t, classId, patch) {
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
      if (u.role === 'student') {
        out.myTeamId = u.teamId || '';
        var me = teamById(u.teamId);
        if (me) {
          out.myTeam = teamPub(me, w);
          var fM = (DB.Finales||[]).filter(function (x) { return x.teamId === me.teamId; })[0];
          out.myTeam.finaleOpened = !!(fM && fM.opened);
          out.tasks = mergeTasks(defs, ttmap(me.teamId), w);
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
          var list = mergeTasks(defs, ttmap(tm.id), w);
          out.teamTasks[tm.id] = list;
          list.forEach(function (task) {
            if (task.status === 'submitted') out.queue.push({
              id: tm.id + '::' + task.id, teamId: tm.id, teamName: tm.name, taskId: task.id,
              title: task.title, layer: task.layer, type: task.type, text: task.text, spec: task.spec || '', effort: task.effort, effortNote: task.effortNote, blocker: task.blocker,
              files: task.files, over: task.over, due: task.due, weeks: tm.weeks, cond: task.cond, mineral: task.mineral });
          });
          if (tm.gateSubmitted && !tm.gateVerdict) out.gates.push({
            teamId: tm.id, teamName: tm.name, layer: tm.layer, cells: tm.gateText, weeks: tm.weeks });
        });
      }
      return ok(out);
    },

    apiSubmitItem: function (t, taskId, text, files, reflect) {
      var u = auth(t);
      reflect = reflect || {};
      if (['fast', 'onpar', 'slow'].indexOf(reflect.effort) < 0) return err('先說一次實際花的力氣跟原本估的差多少。');
      if (!DB.Plans.some(function (x) { return x.teamId === u.teamId && x.taskId === taskId; }))
        return err("先在甘特圖或提交頁上說你打算哪一週交這一項。");
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
      var u = auth(t);
      var tid = (u.role === "student") ? u.teamId : (teamId || "");
      var tm = teamById(tid); if (!tm) return err("找不到這一組。");
      var defs = tasksOfClass(tm.classId), m = ttmap(tid);
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
                  totalRejected: revs.filter(function (r) { return r.result === "needfix"; }).length,
                  totalSubs: subs.length, finale: f });
    },
    apiSaveFinale: function (t, a, submit) {
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
      var u = auth(t);
      if (u.role !== "teacher") return err("只有老師能放行。");
      var tm = teamById(teamId);
      if (!tm) return err("找不到這一組。");
      if ((tm.passed||[]).indexOf(5) < 0) return err("這一組還沒走完第五層，結局開不了。");
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
      var u = auth(t);
      if (u.role !== "teacher") return err("只有老師看得到這一份。");
      DB.Finales = DB.Finales || [];
      var kl = classById(u.classId), w = kl ? courseWeekOf(kl) : 1;
      var list = DB.Teams.filter(function (x) { return x.classId === u.classId; }).map(function (tm) {
        var f = DB.Finales.filter(function (x) { return x.teamId === tm.teamId; })[0] || {};
        return { teamId: tm.teamId, name: tm.name, layer: tm.layer,
                 weeks: Math.max(1, w - (tm.enteredWeek||1) + 1),
                 done5: (tm.passed||[]).indexOf(5) >= 0,
                 applied: !!f.submitted, opened: !!f.opened, openWords: f.openWords||"",
                 submittedAt: f.ts ? String(f.ts) : "" };
      });
      return ok({ list: list, courseWeek: w });
    },
    apiSavePlan: function (t, taskId, from, to) {
      var u = auth(t);
      var a = Math.max(1, Math.floor(+from||1)), b = Math.max(a, Math.floor(+to||a));
      var p = DB.Plans.filter(function (x) { return x.teamId === u.teamId && x.taskId === taskId; })[0];
      if (p) { p.week = b; p.fromWeek = a; p.toWeek = b; }
      else DB.Plans.push({ teamId: u.teamId, taskId: taskId, week: b, fromWeek: a, toWeek: b });
      persist();
      return ok();
    },
    apiSetSemesterWeeks: function (t, classId, weeks) {
      auth(t);
      var k = classById(classId); if (k) k.semesterWeeks = Math.max(2, Math.min(156, Math.floor(+weeks||18)));
      persist();
      return ok({ semesterWeeks: k ? k.semesterWeeks : 18 });
    },
    _vein: function (classId, layer) {
      var all = MIN_BY_LAYER[layer] || [];
      var used = {};
      tasksOfClass(classId).forEach(function (d) { if (d.layer === layer && d.mineral) used[d.mineral] = 1; });
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
      return tasksOfClass(tm.classId).filter(function (d) {
        if (d.layer !== tm.layer) return false;
        var s = m[d.id]; return !s || s.status !== "passed";
      });
    },
    apiSubmitGate: function (t, cells) {
      var u = auth(t), tm = teamById(u.teamId);
      var miss = API._missReq(u.teamId) || [];
      var vn = API._vein(tm.classId, tm.layer);
      if (vn.left.length === vn.total) return err("這一層還沒有任務，老師還沒把清單開出來。");
      if (vn.left.length) return err("這一層的礦脈有 " + vn.total + " 塊，老師只開了 " + (vn.total - vn.left.length) + " 塊。要全部開出來、也全部採齊，才拿得到這一層的道具——去跟他說還缺 " + vn.left.length + " 塊。");
      if (miss.length) return err("這一層還差 " + miss.length + " 塊礦石：" + miss.map(function (d) { return d.title; }).join("、") + "。這一層要全部採齊才送得出關卡。");
      tm.gateText = cells; tm.gateSubmitted = true; tm.gateVerdict = ''; tm.gateTs = NOW();
      persist();
      return ok();
    },
    apiLogRead: function (t, target) {
      var u = auth(t), kl = classById(u.classId), w = courseWeekOf(kl);
      var me = teamById(u.teamId), tg = teamById(target);
      if (!me || !tg) return ok();
      var rejected = DB.TeamTasks.some(function (r) { return r.teamId === u.teamId && r.status === 'needs_more'; });
      DB.Reads.push({ readId: 'r' + uid(), readerTeam: u.teamId, targetTeam: target, layer: tg.layer,
        week: w, readerLayer: me.layer, readerStay: Math.max(1, w - me.enteredWeek + 1), recentlyRejected: rejected });
      persist();
      return ok();
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
      var u = auth(t), tm = teamById(u.teamId);
      if (tm) { tm.specNames[key] = name; persist(); }
      return ok();
    },

    freeMin: function (classId, layer, selfId) {
      var used = {};
      DB.Tasks.forEach(function (x) {
        if (String(x.classId) === String(classId) && x.mineral && x.taskId !== selfId) used[x.mineral] = 1;
      });
      return (MIN_BY_LAYER[layer] || []).filter(function (n) { return !used[n]; });
    },
    apiSaveTask: function (t, classId, task) {
      auth(t);
      var id = task.id || ('tk' + uid());
      if (!String(task.mineral || '').trim()) task.mineral = (API.freeMin(classId, task.layer, id) || [])[0] || '';
      var ex = DB.Tasks.filter(function (x) { return x.taskId === id; })[0];
      var row = { taskId: id, classId: classId, layer: task.layer, type: task.type, title: task.title,
                  cond: task.cond, note: task.note, spec: task.spec || '', due: task.due, mineral: task.mineral, mDesc: task.mDesc };
      if (ex) Object.assign(ex, row); else DB.Tasks.push(row);
      persist();
      return ok({ taskId: id });
    },
    apiDeleteTask: function (t, taskId) {
      auth(t);
      DB.Tasks = DB.Tasks.filter(function (x) { return x.taskId !== taskId; });
      DB.TeamTasks = DB.TeamTasks.filter(function (x) { return x.taskId !== taskId; });
      persist();
      return ok();
    },
    apiPublishList: function (t, classId, layer, items) {
      auth(t);
      (items || []).forEach(function (it) {
        var min = String(it.mineral || '').trim() || (API.freeMin(classId, layer) || [])[0] || '';
        DB.Tasks.push({ taskId: 'tk' + uid(), classId: classId, layer: layer, type: it.type,
          title: it.title, cond: it.cond, note: it.note, spec: it.spec || '', due: it.due, mineral: min, mDesc: it.mDesc });
      });
      persist();
      return ok();
    },
    apiReviewItem: function (t, teamId, taskId, result, reason) {
      auth(t);
      var tm = teamById(teamId), kl = classById(tm.classId), w = courseWeekOf(kl);
      var pass = result === 'pass';
      var txt = String(reason || '');
      DB.Reviews.push({ revId: 'rv' + uid(), teamId: teamId, taskId: taskId,
        title: (DB.Tasks.filter(function (x) { return x.taskId === taskId; })[0] || {}).title || '',
        layer: (DB.Tasks.filter(function (x) { return x.taskId === taskId; })[0] || {}).layer || 1,
        result: pass ? 'pass' : 'needfix', reason: txt, len: txt.length, hasReason: !!txt.trim(),
        week: w, latency: 12 });
      var m = ttmap(teamId)[taskId];
      if (m) {
        m.status = pass ? 'passed' : 'needs_more';
        m.fb = txt || (pass ? '（未附理由）' : '');
        m.fbType = pass ? 'pass' : 'more';
        if (pass) m.passedWeek = w;
      }
      persist();
      return ok();
    },
    apiReviewGate: function (t, teamId, pass, toolLevel, reason) {
      auth(t);
      var tm = teamById(teamId), kl = classById(tm.classId), w = courseWeekOf(kl);
      if (pass) {
        var vt = API._vein(tm.classId, tm.layer);
        if (vt.left.length) return err("這一層的礦脈有 " + vt.total + " 塊，你只開了 " + (vt.total - vt.left.length) + " 塊。先在 T-05 把剩下的 " + vt.left.length + " 塊開出來（" + vt.left.join("、") + "），或把這一次關卡退回。");
        var mr = API._missReq(teamId) || []; if (mr.length) return err("這一組這一層還差 " + mr.length + " 塊礦石。");
      }
      DB.Passes.push({ passId: 'p' + uid(), teamId: teamId, layer: tm.layer, week: w,
        toolLevel: toolLevel, cells: tm.gateText.slice(), verdict: pass ? 'pass' : 'needfix', reason: reason || '' });
      if (!pass) { tm.gateSubmitted = false; tm.gateVerdict = 'needfix'; persist(); return ok({ passed: false }); }
      if (tm.passed.indexOf(tm.layer) < 0) tm.passed.push(tm.layer);
      tm.toolLevels[tm.layer] = '已交出';
      tm.layer = Math.min(5, tm.layer + 1);
      tm.enteredWeek = w;
      tm.gateText = ['', '', '']; tm.gateSubmitted = false; tm.gateVerdict = 'pass';
      if (tm.layer === 5 && !DB.Tasks.some(function (x) { return x.classId === tm.classId && x.layer === 5; })) {
        DB.Tasks.push({ taskId: 'own5-' + tm.classId, classId: tm.classId, layer: 5, type: 'required',
          title: '由你決定要交什麼',
          cond: '這一層他沒有給清單。你自己寫下要交的東西，以及做到什麼程度算完成。',
          note: '寫完之後這一項就是你的驗收標準，老師只確認你有沒有做到自己說的。',
          due: '不設限', mineral: '完成之光', mDesc: '你自己命名的那一件。' });
      }
      persist();
      return ok({ passed: true, layer: tm.layer });
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

    apiResearchSlice: function (t) {
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
          try { out = API[fn].apply(null, args); }
          catch (e) { f(e); return; }
          s(out);
        }, 60);
      };
    });
    return o;
  }
  window.google = { script: { run: makeRunner() } };
  window.MOCK_RESET = function () { localStorage.removeItem('jlz.mockdb'); localStorage.removeItem('jlz.token'); location.reload(); };
})();
