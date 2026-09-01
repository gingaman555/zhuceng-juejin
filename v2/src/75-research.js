/* 研究者端。

   這一端不是給老師用的，也不進地下城。它做三件事：

     帳號   建班、開老師的帳號、重設密碼、解除認領、刪帳號
     名冊   把班上的名單貼進來，學生才點得到自己
     紀錄   每一個動作的流水帳，可以匯出

   紀錄那一頁是這個研究真正的資料。它記的是行為的形狀——承諾幾天、
   哪一天推進、判定結果、卡在哪——不記作業內容，因為系統本來就不收作業。
   看得到誰做了什麼，看不到他做得好不好。 */

function rsClassId() {
  var c = DRAFT.rsClass ? find('Classes', function (x) { return x.classId === DRAFT.rsClass; }) : null;
  if (c) return c.classId;
  return DB.Classes.length ? DB.Classes[0].classId : '';
}

/* 換班的那一排。只有一個班就不畫——一個選項的選單是雜訊。 */
function classPicker() {
  if (DB.Classes.length < 2) return '';
  var cur = rsClassId();
  var H = ['<div class="tags">'];
  DB.Classes.forEach(function (c) {
    H.push('<button class="tag' + (c.classId === cur ? ' on' : '') + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'rscls:' + c.classId })) + '\'>' + esc(c.name) + '</button>');
  });
  H.push('</div>');
  return H.join('');
}

var ROLE_SAY = { student: '學生', teacher: '老師', researcher: '研究者' };

/* ---------- 帳號 ---------- */
PAGES.rs = function () {
  var cid = rsClassId();
  var H = [head('帳號', '誰在這個系統裡',
    '學生自己用加入碼註冊。老師與研究者的帳號從這裡開——那兩種身分看得到別人的資料，' +
    '所以不開放自己註冊。')];

  H.push(classPicker());

  /* 班級 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">班級</div>');
  DB.Classes.forEach(function (c) {
    var t = userOf(c.teacherId);
    H.push('<div class="rn-row"><b>' + esc(c.name) + '</b>' +
      '<span class="dim">加入碼 ' + esc(c.joinCode) + '　·　' +
      where('Teams', function (x) { return x.classId === c.classId; }).length + ' 組　·　' +
      '老師 ' + esc(t ? t.name : '（還沒指定）') + '</span></div>');
  });
  H.push('<div class="eyebrow" style="margin-top:14px">開一個新的班</div>');
  H.push('<div class="rn-row">');
  H.push('<input id="ncls" placeholder="' + esc('班級名稱，例：設計專題') + '">');
  H.push(btn('建立', 'newclass', 'ghost'));
  H.push('</div>');
  H.push('</div>');

  /* 開一個老師或研究者 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">開一個老師或研究者的帳號</div>');
  H.push('<div class="rn-row">');
  H.push('<input id="nu-acc" placeholder="' + esc('帳號') + '">');
  H.push('<input id="nu-name" placeholder="' + esc('顯示名稱') + '">');
  H.push('<input id="nu-pw" placeholder="' + esc('先給一個密碼，之後請他自己換') + '">');
  H.push('</div>');
  H.push('<div class="row" style="margin:11px 0 0">');
  H.push(btn('建老師', 'newuser:teacher', 'ghost'));
  H.push(btn('建研究者', 'newuser:researcher', 'ghost'));
  H.push('</div>');
  H.push('</div>');

  /* 帳號清單 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">帳號　' + DB.Users.length + ' 個</div>');
  DB.Users.forEach(function (u) {
    var t = u.teamId ? teamOf(u.teamId) : null;
    H.push('<div class="rn-row">');
    H.push('<b>' + esc(u.name) + '</b>');
    H.push('<span class="dim">' + esc(u.account) + '　·　' + esc(ROLE_SAY[u.role] || u.role) +
      (t ? '　·　' + esc(t.name) : '') +
      (u.lastLogin ? '　·　上次登入 ' + daysBetween(u.lastLogin, now()) + ' 天前' : '　·　還沒登入過') +
      '</span>');
    H.push('<span class="sp" style="flex:1"></span>');
    H.push(btn('重設密碼', 'respw:' + u.userId, 'ghost'));
    H.push(btn('刪除', 'deluser:' + u.userId, 'ghost'));
    H.push('</div>');
  });
  H.push('</div>');
  return H.join('');
};

/* ---------- 名冊 ---------- */
PAGES.roster = function () {
  var cid = rsClassId();
  var rows = where('Roster', function (r) { return r.classId === cid; });
  var H = [head('名冊', '誰在這個班',
    '一行一組，像「甲：小明, 小華」。貼上去之後，學生註冊完就從裡面點自己是誰——' +
    '不用他們自己打組名，資料才對得起來。')];

  H.push(classPicker());

  H.push('<div class="card">');
  H.push('<div class="eyebrow">貼上名冊</div>');
  H.push('<textarea id="rt" rows="6" placeholder="' +
    esc('甲：小明, 小華, 阿哲\n乙：怡君, 小柏\n丙：家豪, 品彤, 宥廷') + '">' +
    esc(draft('rt')) + '</textarea>');
  H.push('<p class="dim">同一組再貼一次不會重建，只會補上新的名字。' +
         '已經被認領的名字不會被洗掉。</p>');
  H.push(btn('存進去', 'saveroster', ''));
  H.push('</div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">現在的名冊　' + rows.length + ' 人</div>');
  if (!rows.length) H.push('<p class="dim">還沒有人。貼一份上去。</p>');
  rows.forEach(function (r) {
    var u = r.claimedBy ? userOf(r.claimedBy) : null;
    H.push('<div class="rn-row">');
    H.push('<b>' + esc(r.teamName) + '</b>');
    H.push('<span>' + esc(r.memberName) + '</span>');
    H.push('<span class="sp" style="flex:1"></span>');
    if (u) {
      H.push('<span class="dim">' + esc(u.account) + ' 認領了</span>');
      H.push(btn('解除', 'unclaim:' + r.rosterId, 'ghost'));
    } else {
      H.push('<span class="dim">還沒有人認領</span>');
    }
    H.push('</div>');
  });
  H.push('</div>');
  return H.join('');
};

/* ---------- 紀錄 ---------- */
PAGES.events = function () {
  var cid = rsClassId();
  var only = DRAFT.evTeam || '';
  var all = eventsOf(cid, only ? { teamId: only } : null);
  var show = all.slice(0, 200);

  var H = [head('紀錄', all.length + ' 筆',
    '每一個會改到資料的動作都留一筆。記的是行為的形狀——承諾幾天、哪一天推進、' +
    '判定結果、卡在哪。系統不收作業，所以這裡看不到任何作業內容。')];

  H.push(classPicker());

  /* 篩組別 */
  H.push('<div class="tags">');
  H.push('<button class="tag' + (only ? '' : ' on') + '" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'evteam:' })) + '\'>全班</button>');
  where('Teams', function (t) { return t.classId === cid; }).forEach(function (t) {
    H.push('<button class="tag' + (only === t.teamId ? ' on' : '') + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'evteam:' + t.teamId })) + '\'>' + esc(t.name) + '</button>');
  });
  H.push('</div>');

  /* 匯出 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">匯出　CSV</div>');
  H.push('<p class="dim">貼進試算表就能算。欄位：時間、角色、組別、事件、說明。</p>');
  H.push('<textarea id="csv" rows="4" readonly>' + esc(exportCsv(cid)) + '</textarea>');
  H.push(btn('存成檔案', 'csv', 'ghost'));
  H.push('</div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">流水帳' +
    (all.length > show.length ? '　只列最近 ' + show.length + ' 筆' : '') + '</div>');
  if (!show.length) H.push('<p class="dim">還沒有動作。</p>');
  show.forEach(function (e) {
    var t = e.teamId ? teamOf(e.teamId) : null;
    H.push('<div class="rn-row">');
    H.push('<b>' + esc(t ? t.name : (ROLE_SAY[e.role] || '')) + '</b>');
    H.push('<span>' + esc(evSay(e)) + '</span>');
    H.push('<span class="sp" style="flex:1"></span>');
    H.push('<span class="dim">' + daysBetween(e.at, now()) + ' 天前</span>');
    H.push('</div>');
  });
  H.push('</div>');
  return H.join('');
};

/* ---------- 研究者的動作 ---------- */

ACTS.rscls = function (id) { DRAFT.rsClass = id; render(); };
ACTS.evteam = function (id) { DRAFT.evTeam = id; render(); };

ACTS.newclass = function () {
  var v = (document.getElementById('ncls') || {}).value || '';
  if (!v.trim()) return say('先給這個班一個名字。');
  var r = actCreateClass(v.trim(), '');
  DRAFT.rsClass = r.klass.classId;
  render();
  say('建好了。加入碼是 ' + r.klass.joinCode + '——把它給學生。');
};

ACTS.newuser = function (role) {
  var acc = (document.getElementById('nu-acc') || {}).value || '';
  var name = (document.getElementById('nu-name') || {}).value || '';
  var pw = (document.getElementById('nu-pw') || {}).value || '';
  var kl = find('Classes', function (c) { return c.classId === rsClassId(); });
  var r = actRegister({
    account: acc, password: pw, name: name, role: role,
    code: kl ? kl.joinCode : ''
  });
  if (r.err) return say(r.err);
  /* 老師要跟班綁在一起，不然他打開來看不到任何一組 */
  if (role === 'teacher' && kl && !kl.teacherId) { kl.teacherId = r.user.userId; save(); }
  say((role === 'teacher' ? '老師' : '研究者') + '帳號好了。請他用這個密碼登入之後自己換掉。');
};

ACTS.respw = function (userId) {
  var pw = (document.getElementById('nu-pw') || {}).value || '';
  if (!pw.trim()) return say('先在上面那格「先給一個密碼」寫一個新的，再按重設。');
  var r = actResetPw(userId, pw.trim());
  if (r.err) return say(r.err);
  say(userOf(userId).name + ' 的密碼換成你寫的那一個了。');
};

ACTS.deluser = function (userId) {
  if (DRAFT.del !== userId) {
    DRAFT.del = userId;
    return say('再按一次「刪除」就真的刪掉 ' + userOf(userId).name + ' 的帳號。');
  }
  var name = userOf(userId).name;
  var r = actDeleteUser(userId);
  DRAFT.del = null;
  if (r.err) return say(r.err);
  if (userId === S.who) return ACTS.logout();
  render();
  say(name + ' 的帳號刪掉了。他認領過的名字放回名冊上了。');
};

ACTS.saveroster = function () {
  var v = (document.getElementById('rt') || {}).value || '';
  var r = actSaveRoster(rsClassId(), v);
  if (r.err) { DRAFT.rt = v; return say(r.err); }
  DRAFT.rt = '';
  render();
  say('存好了，補上 ' + r.added + ' 個名字。');
};

ACTS.unclaim = function (rosterId) {
  var r = actUnclaim(rosterId);
  if (r.err) return say(r.err);
  render();
  say('解開了。那個人重新登入之後可以再點一次。');
};

ACTS.csv = function () {
  var name = '專案地下城-紀錄.csv';
  try {
    /* BOM，不然 Excel 開起來中文是亂碼 */
    var blob = new Blob(['﻿' + exportCsv(rsClassId())], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    say('存成 ' + name + ' 了。');
  } catch (e) {
    say('這個瀏覽器不給存檔。上面那格的字全選複製也一樣。');
  }
};
