/* 帳號、登入、身分認領，以及研究紀錄的事件流。

   三種角色：
     student    學生。用加入碼註冊，然後從名冊裡認領自己是誰。
     teacher    老師。研究者建的。
     researcher 研究者。管帳號、看紀錄、匯出。

   密碼：這一版存在瀏覽器裡，所以雜湊只是「不要用明碼躺在 localStorage」，
   不是真的安全措施。真的上線要換成後端 ＋ bcrypt——這件事寫在這裡，
   免得有人以為它已經安全了。 */

var AUTH_NOTE = '這一版的密碼雜湊只擋肉眼，不是真的加密。上線前要換成後端驗證。';

/* 加鹽的字串雜湊。同一組帳密永遠得到同一個值。 */
function pwHash(pw, salt) {
  var s = String(salt) + '|' + String(pw);
  var h1 = 2166136261, h2 = 5381;
  for (var i = 0; i < s.length; i++) {
    h1 ^= s.charCodeAt(i); h1 = (h1 * 16777619) >>> 0;
    h2 = ((h2 * 33) ^ s.charCodeAt(i)) >>> 0;
  }
  return h1.toString(36) + h2.toString(36);
}

function newSalt() {
  return Math.floor(Math.random() * 2176782336).toString(36) + now().toString(36);
}

/* ---------- 事件流（研究紀錄） ----------
   每一個會改到資料的動作都記一筆。這就是研究資料本身：
   誰、在哪一個任務上、做了什麼、什麼時候。

   刻意不記「內容」——系統本來就不收作業。記的是行為的形狀：
   承諾幾天、推進的節奏、判定結果、卡在哪。 */
function logEvent(kind, o) {
  if (!DB || !DB.Events) return;
  /* 登入與註冊那兩筆是在還沒有 S.who 的時候記的，所以要讓呼叫端
     自己帶 by 進來——不然研究資料裡最重要的兩個動作會沒有角色。 */
  var u = (typeof S !== 'undefined' && S.who) ? userOf(S.who) : null;
  if (!u && o && o.by) u = userOf(o.by);
  DB.Events.push(Object.assign({
    evId: nid('E'),
    at: now(),
    by: u ? u.userId : (o && o.by) || '',
    role: u ? u.role : '',
    kind: kind
  }, o || {}));
  /* 事件只增不刪。原型跑久了會長，但它就是資料本身。 */
}

function eventsOf(classId, filter) {
  var teamIds = {};
  where('Teams', function (t) { return t.classId === classId; })
    .forEach(function (t) { teamIds[t.teamId] = t.name; });
  return DB.Events.filter(function (e) {
    if (e.teamId && !teamIds[e.teamId]) return false;
    if (filter && filter.kind && e.kind !== filter.kind) return false;
    if (filter && filter.teamId && e.teamId !== filter.teamId) return false;
    return true;
  }).slice().reverse();
}

/* 事件的中文說法。同一份資料，人看得懂的那一面。 */
var EV_SAY = {
  register: function (e) { return '註冊了帳號 ' + e.account; },
  claim:    function (e) { return '認領身分：' + e.who + '（' + e.team + '）'; },
  login:    function () { return '登入'; },
  publish:  function (e) { return '派了任務「' + e.title + '」'; },
  commit:   function (e) { return '承諾 ' + e.est + ' 天' + (e.flags ? '，標了「' + e.flags + '」' : ''); },
  push:     function (e) { return '第 ' + e.n + ' 天' + (e.seg ? '：' + e.seg : '') + (e.back ? '（補登）' : ''); },
  submit:   function (e) { return '交出去：承諾 ' + e.est + ' 天，實際 ' + e.actual + ' 天 → ' + e.stamp; },
  reflect:  function (e) { return '說「' + (e.overs || '（沒有）') + '」比想的久'; },
  approve:  function () { return '勾了可以'; },
  keep:     function (e) { return '留下了「' + e.keep + '」那一張'; },
  tick:     function (e) { return (e.on ? '勾掉' : '取消勾掉') + '「' + e.step + '」'; },
  askexit:  function () { return '說專案做完了'; },
  left:     function () { return '走出去了'; },
  rename:   function (e) { return '把招牌改成「' + e.name + '」'; }
};
function evSay(e) {
  var f = EV_SAY[e.kind];
  return f ? f(e) : e.kind;
}

/* ---------- 註冊 ---------- */

function accountTaken(account) {
  return !!find('Users', function (u) {
    return String(u.account).toLowerCase() === String(account).toLowerCase();
  });
}

function classByCode(code) {
  return find('Classes', function (c) {
    return String(c.joinCode).toUpperCase() === String(code || '').toUpperCase();
  });
}

/* 學生註冊：加入碼 → 帳號密碼。註冊完還沒有身分，要再認領。 */
function actRegister(o) {
  var acc = String(o.account || '').trim();
  var pw = String(o.password || '');
  if (acc.length < 3) return { err: '帳號至少三個字。' };
  if (pw.length < 4) return { err: '密碼至少四個字。' };
  if (accountTaken(acc)) return { err: '這個帳號有人用了。' };

  var kl = null;
  if (o.role !== 'researcher') {
    kl = classByCode(o.code);
    if (!kl) return { err: '找不到這個加入碼。跟老師確認一次。' };
  }

  var salt = newSalt();
  var u = {
    userId: nid('U'), account: acc, salt: salt, hash: pwHash(pw, salt),
    role: o.role || 'student',
    name: String(o.name || acc).trim(),
    classId: kl ? kl.classId : '',
    teamId: '',
    createdAt: now()
  };
  DB.Users.push(u);
  save();
  logEvent('register', { by: u.userId, account: acc, role: u.role });
  return { user: u };
}

/* ---------- 登入 ---------- */
function actLogin(account, pw) {
  var u = find('Users', function (x) {
    return String(x.account).toLowerCase() === String(account || '').trim().toLowerCase();
  });
  if (!u) return { err: '找不到這個帳號。' };
  if (!u.salt) return { err: '這個帳號還沒設定密碼，請研究者重設一次。' };
  if (pwHash(pw, u.salt) !== u.hash) return { err: '密碼不對。' };
  u.lastLogin = now();
  save();
  logEvent('login', { by: u.userId });
  return { user: u };
}

/* ---------- 名冊與身分認領 ----------
   老師先把名冊貼進來（一行一組），學生註冊之後從裡面挑自己是誰。
   這樣系統知道「這個帳號是哪一組的誰」，而且不用學生自己打組名。 */

/* 「甲：小明, 小華」一行一組 */
function parseRoster(text) {
  var out = [];
  String(text || '').split('\n').forEach(function (line) {
    line = line.trim();
    if (!line) return;
    var i = line.search(/[:：]/);
    if (i < 0) return;
    var team = line.slice(0, i).trim();
    var members = line.slice(i + 1).split(/[,，、]/)
      .map(function (x) { return x.trim(); }).filter(Boolean);
    if (team && members.length) out.push({ team: team, members: members });
  });
  return out;
}

/* 存名冊。已經存在的組不重建，才不會把認領過的身分洗掉。 */
function actSaveRoster(classId, text) {
  var rows = parseRoster(text);
  if (!rows.length) return { err: '看不懂這份名冊。一行一組，像「甲：小明, 小華」。' };
  var added = 0;
  rows.forEach(function (r) {
    var name = '第' + (where('Teams', function (t) {
      return t.classId === classId;
    }).length + 1) + '組 · ' + r.team;
    var exist = find('Teams', function (t) {
      return t.classId === classId && t.name.indexOf('· ' + r.team) >= 0;
    });
    var team = exist;
    if (!team) {
      team = {
        teamId: nid('G'), classId: classId, name: name,
        project: '（還沒定）', signTier: 0, joinedAt: now()
      };
      DB.Teams.push(team);
    }
    r.members.forEach(function (m) {
      if (find('Roster', function (x) {
        return x.classId === classId && x.teamId === team.teamId && x.memberName === m;
      })) return;
      DB.Roster.push({
        rosterId: nid('R'), classId: classId, teamId: team.teamId,
        teamName: team.name, memberName: m, claimedBy: ''
      });
      added++;
    });
  });
  save();
  return { added: added };
}

/* 一個班還沒被認領的名字 */
function freeRoster(classId) {
  return where('Roster', function (r) { return r.classId === classId && !r.claimedBy; });
}

/* 認領：把帳號綁到名冊上的某一個人 */
function actClaim(userId, rosterId) {
  var u = userOf(userId);
  var r = find('Roster', function (x) { return x.rosterId === rosterId; });
  if (!u || !r) return { err: '找不到。' };
  if (r.claimedBy) return { err: '這個名字已經有人認領了。' };
  r.claimedBy = u.userId;
  r.claimedAt = now();
  u.teamId = r.teamId;
  u.name = r.memberName;
  save();
  logEvent('claim', { by: u.userId, teamId: r.teamId, who: r.memberName, team: r.teamName });
  return { user: u };
}

/* 認錯人了：研究者解開，學生可以重認 */
function actUnclaim(rosterId) {
  var r = find('Roster', function (x) { return x.rosterId === rosterId; });
  if (!r || !r.claimedBy) return { err: '這個名字沒有人認領。' };
  var u = userOf(r.claimedBy);
  if (u) { u.teamId = ''; }
  r.claimedBy = ''; r.claimedAt = 0;
  save();
  return { ok: true };
}

/* ---------- 研究者的帳號處理 ---------- */

function actResetPw(userId, pw) {
  var u = userOf(userId);
  if (!u) return { err: '找不到這個帳號。' };
  if (String(pw).length < 4) return { err: '密碼至少四個字。' };
  u.salt = newSalt();
  u.hash = pwHash(pw, u.salt);
  save();
  return { ok: true };
}

function actDeleteUser(userId) {
  var u = userOf(userId);
  if (!u) return { err: '找不到這個帳號。' };
  if (u.role === 'researcher' &&
      where('Users', function (x) { return x.role === 'researcher'; }).length <= 1) {
    return { err: '這是最後一個研究者帳號，刪掉就沒有人管得了系統。' };
  }
  /* 認領過的名字要放回去，不然那個位子永遠卡著 */
  where('Roster', function (r) { return r.claimedBy === userId; })
    .forEach(function (r) { r.claimedBy = ''; r.claimedAt = 0; });
  DB.Users = DB.Users.filter(function (x) { return x.userId !== userId; });
  save();
  return { ok: true };
}

function actCreateClass(name, teacherId) {
  var code = '';
  var CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   /* 去掉會看錯的 I O 0 1 */
  for (var i = 0; i < 6; i++) code += CH[Math.floor(Math.random() * CH.length)];
  var c = {
    classId: nid('C'), name: String(name || '未命名的班').trim(),
    joinCode: code, teacherId: teacherId || '', startedAt: now()
  };
  DB.Classes.push(c);
  save();
  return { klass: c };
}

/* ---------- 匯出 ----------
   研究資料。CSV，因為那是最容易進統計軟體的東西。 */
function exportCsv(classId) {
  var teamName = {}, teamTea = {};
  where('Teams', function (t) { return t.classId === classId; })
    .forEach(function (t) {
      teamName[t.teamId] = t.name;
      /* 哪一位老師帶的。實驗是一個課程三位老師，那三位就是變項——
         沒有這一欄，匯出的資料沒辦法照老師分組。 */
      var te = t.mentorId ? userOf(t.mentorId) : null;
      teamTea[t.teamId] = te ? te.name : '';
    });
  var head = ['時間', '角色', '組別', '指導老師', '事件', '說明'];
  var rows = eventsOf(classId).map(function (e) {
    return [
      new Date(e.at).toISOString(),
      e.role || '',
      teamName[e.teamId] || '',
      teamTea[e.teamId] || '',
      e.kind,
      evSay(e)
    ];
  });
  return [head].concat(rows).map(function (r) {
    return r.map(function (c) {
      var s = String(c == null ? '' : c);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',');
  }).join('\n');
}
