/* 研究者端。

   這一端不是給老師用的，也不進地下城。它做的事：

     名單   誰在這個系統裡。看得到，改不動
     紀錄   每一個動作的流水帳，可以匯出
     密碼   2026-09-23 起，研究者可以直接幫學生／老師換一組新密碼

   ── 為什麼原本一顆會改東西的鍵都沒有 ──

   本來這一頁可以建班、開老師的帳號、重設密碼、刪帳號。全部拿掉了。

   研究者是這個研究的觀察者。一個觀察者如果同時改得動被觀察對象的
   帳號與狀態，那份資料就沒辦法說「這些是他們自己做的」——而那正是
   這個研究唯一在主張的事。

   拿掉之後沒有人少掉能力：老師自己註冊、自己開班或用同事給的碼加進
   同一個班（見 58-gate.js），學生自己註冊、自己建隊。整條路上不需要
   一個管理員。

   ── 密碼是唯一的例外，不是解禁 ──

   使用者本人明確要求開放：研究者可以直接改任何學生／老師的密碼
   （actResearcherSetPw，見 15-auth.js 與 CLAUDE.md 同一天那一段）。
   除了這一個名字，這一頁不准出現任何其他 act 開頭的動作——
   check.js 只放行 actResearcherSetPw 這一個，其餘照樣擋著。

   紀錄那一頁是這個研究真正的資料。它記的是行為的形狀——承諾幾天、
   哪一天推進、判定結果、卡在哪——不記作業內容，因為系統本來就不收作業。
   看得到誰做了什麼，看不到他做得好不好。 */

/* ---------- 研究者這一邊只看真的 ----------

   這一台機器上同時有兩份資料：示範那一份（帶 _d，seed 打的）跟這個班
   真的跑出來的。同步早就分得開（見 41-sync.js 的 onDemoSide），匯出
   那三份也是照班分的，所以都乾淨。

   可是研究者這一邊本來直接數 DB.Classes 與 DB.Users——它把示範那一班
   跟十七個示範帳號一起算進去。使用者：「我研究者端他會記錄模擬紀錄」。

   實際看到的是「班級 2 個、帳號 19 個」，而真的只有 1 個班、2 個人。
   那一頁存在的理由是「匯出的資料裡是一堆代號，要有一個地方查那是誰」
   ——混進十七個不存在的人，那個理由就不成立了。

   這三支是這一頁所有列舉的入口，收在這裡一次擋掉。 */
function rsClasses() { return where('Classes', function (c) { return !c._d && !c._removed; }); }
function rsUsers() { return where('Users', function (u) { return !u._d && !u._removed; }); }
function rsTeams(cid) {
  return where('Teams', function (t) { return !t._d && !t._removed && t.classId === cid; });
}

function rsClassId() {
  var c = DRAFT.rsClass ? find('Classes', function (x) { return x.classId === DRAFT.rsClass; }) : null;
  if (c && !c._d) return c.classId;
  var a = rsClasses();
  return a.length ? a[0].classId : '';
}

/* 換班的那一排。只有一個班就不畫——一個選項的選單是雜訊。 */
function classPicker() {
  if (rsClasses().length < 2) return '';
  var cur = rsClassId();
  var H = ['<div class="tags">'];
  rsClasses().forEach(function (c) {
    H.push('<button class="tag' + (c.classId === cur ? ' on' : '') + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'rscls:' + c.classId })) + '\'>' + esc(c.name) + '</button>');
  });
  H.push('</div>');
  return H.join('');
}

var ROLE_SAY = { student: '學生', teacher: '老師', researcher: '研究者' };

/* ---------- 名單（唯讀） ----------

   這一頁存在的理由只有一個：匯出的資料裡是一堆代號，要有一個地方
   對得回「這是誰、哪一班、哪一組」。所以它印得出來，但一顆改得動
   東西的鍵都沒有。 */
PAGES.rs = function () {
  var H = [head('名單', '誰在這個系統裡',
    '這一頁只能看。帳號由他們自己在門口開。')];

  H.push(classPicker());

  /* 班級 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">班級　' + rsClasses().length + ' 個</div>');
  if (!rsClasses().length) H.push('<p class="dim">還沒有人開班。</p>');
  rsClasses().forEach(function (c) {
    var tea = where('Users', function (u) {
      return u.role === 'teacher' && inClass(u, c.classId);
    });
    H.push('<div class="rn-row"><b>' + esc(c.name) + '</b>' +
      '<span class="dim">加入碼 ' + esc(c.joinCode) + '　·　' +
      rsTeams(c.classId).length + ' 組　·　' +
      /* 一個班三位老師共同帶，所以這裡數的是人數不是「那一位」。 */
      '老師 ' + (tea.length ? tea.map(function (u) { return esc(u.name); }).join('、')
        : '（還沒有人）') + '</span></div>');
  });
  H.push('</div>');

  /* 帳號清單 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">帳號　' + rsUsers().length + ' 個</div>');
  rsUsers().forEach(function (u) {
    var t = u.teamId ? teamOf(u.teamId) : null;
    var kl = u.classId ? find('Classes', function (c) { return c.classId === u.classId; }) : null;
    H.push('<div class="rn-row">');
    H.push('<b>' + esc(u.name) + '</b>');
    H.push('<span class="dim">' + esc(u.account) + '　·　' + esc(ROLE_SAY[u.role] || u.role) +
      (kl ? '　·　' + esc(kl.name) : '') +
      (t ? '　·　' + esc(t.name) : '') +
      (u.lastLogin ? '　·　上次登入 ' + daysBetween(u.lastLogin, now()) + ' 天前'
        : '　·　還沒登入過') +
      '</span>');
    H.push('</div>');
  });
  H.push('</div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">幫學生／老師換密碼</div>');
  H.push('<p class="dim">2026-09-23 起開放的唯一例外——其餘資料這一頁一樣只能看。</p>');
  H.push(btn('換密碼', 'go:rspw', ''));
  H.push('</div>');
  return H.join('');
};

/* ---------- 研究者直接改密碼 ----------

   跟老師補發救援碼、接回帳號同一種選法：點名字，不打帳號——
   逼研究者看著名字選，不是憑印象點一個帳號字串。兩步驟確認，
   跟接回帳號同一個道理：這是研究者頁面唯一一個真的會動到別人
   帳號的動作，按錯的代價是別人的密碼被換掉，值得再看一次。 */
PAGES.rspw = function () {
  var u = me();
  if (!u || u.role !== 'researcher') return PAGES.gate();
  var H = [head('幫學生／老師換密碼', '點一個人', '')];

  if (DRAFT.rspwConfirm && DRAFT.rspwAcc) {
    var picked = find('Users', function (x) { return x.account === DRAFT.rspwAcc; });
    H.push('<div class="card">');
    H.push('<div class="eyebrow warnx">確定嗎</div>');
    H.push('<p class="dim">要把「' + esc(picked ? picked.name : DRAFT.rspwAcc) + '」（' +
      esc(DRAFT.rspwAcc) + '）的密碼換成你剛剛打的那一組。他現在用的密碼會立刻失效。</p>');
    H.push(btn('對，換掉', 'rspw', 'big'));
    H.push(btn('還沒，再檢查一次', 'rspwundo', 'ghost'));
    H.push('</div>');
  } else {
    var rows = where('Users', function (x) { return !x._d && !x._removed && x.role !== 'researcher'; })
      .sort(function (a, b) { return a.name === b.name ? 0 : (a.name < b.name ? -1 : 1); });
    H.push('<div class="card">');
    H.push('<div class="tags">');
    rows.forEach(function (x) {
      H.push('<button class="tag' + (DRAFT.rspwAcc === x.account ? ' on' : '') +
        '" data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'rspwpick:' + x.account })) +
        '\'>' + esc(x.name) + '（' + esc(ROLE_SAY[x.role] || x.role) + '）' +
        '<small style="display:block;opacity:.6;font-size:22px">' + esc(x.account) + '</small>' +
        '</button>');
    });
    H.push('</div>');
    if (DRAFT.rspwAcc) {
      H.push('<div class="eyebrow" style="margin-top:14px">新密碼</div>');
      H.push('<input id="rspw-new" type="password" placeholder="' + esc(RULES.pwRule()) + '">');
      H.push(btn('換密碼', 'rspwcheck', 'big'));
    }
    H.push('</div>');
  }
  H.push('<div class="row">');
  H.push(btn('回去', 'go:rs', 'ghost'));
  H.push('</div>');
  return H.join('');
};

ACTS.rspwpick = function (acc) { DRAFT.rspwAcc = acc; render(); };

ACTS.rspwcheck = function () {
  var np = (document.getElementById('rspw-new') || {}).value || '';
  if (np.length < RULES.PW_MIN) return say(RULES.pwRule());
  DRAFT.rspwNew = np;
  DRAFT.rspwConfirm = true;
  render();
};
ACTS.rspwundo = function () { DRAFT.rspwConfirm = false; render(); };

ACTS.rspw = function () {
  var r = actResearcherSetPw(S.who, DRAFT.rspwAcc, DRAFT.rspwNew);
  if (r.err) { DRAFT.rspwConfirm = false; return say(r.err); }
  go('rs');
  say('「' + r.user.account + '」的密碼換好了。');
};

/* 把全班的紀錄拉下來。拉完才匯得出全班的 CSV。 */
ACTS.pullev = function () {
  if (typeof syncPullEvents !== 'function') return say('沒有接上雲端。');
  say('拉下來中……');
  syncPullEvents(function (n) {
    DRAFT.evPull = n;
    render();
    say(n < 0 ? '拉不下來。' : (n ? '多了 ' + n + ' 筆。' : '已經是最新的了。'));
  });
};

PAGES.events = function () {
  var cid = rsClassId();
  var only = DRAFT.evTeam || '';
  var all = eventsOf(cid, only ? { teamId: only } : null);
  var show = all.slice(0, 200);

  var H = [head('紀錄', all.length + ' 筆',
    '承諾幾天、哪一天推進、準不準、卡在哪。不收作業。')];

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

  /* ── 先把全班的紀錄拉下來 ──

     紀錄跟別張表不一樣：它只往上推，不訂閱（見 41-sync.js 的檔頭——
     一學期幾千筆，每台機器每次開網頁都讀一遍會把免費額度吃光）。
     所以這一頁預設只看得到這台機器自己產生的那幾筆。

     要匯出的是全班的。按一下拉一次，一學期按幾次，不是每個人
     每次開網頁都拉一遍。 */
  if (typeof SYNC !== 'undefined' && SYNC.on) {
    H.push('<div class="card">');
    H.push('<div class="eyebrow">全班的紀錄</div>');
    H.push('<p class="dim">' + (DRAFT.evPull == null
      ? '這一頁現在只有這台電腦上發生的事。要匯出全班的，先拉一次。'
      : (DRAFT.evPull < 0 ? '拉不下來：' + esc(SYNC.err || '網路')
        : '拉下來了，多了 ' + DRAFT.evPull + ' 筆。')) + '</p>');
    H.push(btn('拉全班的紀錄', 'pullev', 'ghost'));
    H.push('</div>');
  }

  /* ── 匯出：三份 ──

     本來只有流水帳那一份。它的說明欄是一句中文（「交出去：承諾 4 天，
     實際 6 天 → early」），人讀很好，可是要算偏差率得先剖字。

     另外兩份是給試算表用的：一趟一列（組的單位）、一件一列（個人的
     單位）。每一個要算的東西自己一欄，一個字都不用剖。 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">匯出</div>');

  H.push('<p><b>一趟一列</b>　' + exportRuns(cid).split('\n').length + ' 列</p>');
  H.push('<p class="dim">承諾天數、實際天數、判定、偏差率、把握、拆幾件、' +
    '順不順、範圍、老師回的天數、被退幾次、水晶、三個時間戳。</p>');
  H.push(btn('存成檔案', 'csvruns', 'ghost'));

  H.push('<p style="margin-top:22px"><b>一件一列</b>　' +
    exportItems(cid).split('\n').length + ' 列</p>');
  H.push('<p class="dim">個人層：那一件掛在誰名下、他說幾天、實際幾天、' +
    '差幾天、那個天數是不是他本人按的。</p>');
  H.push(btn('存成檔案', 'csvitems', 'ghost'));

  H.push('<p style="margin-top:22px"><b>流水帳</b>　' +
    exportCsv(cid).split('\n').length + ' 列</p>');
  H.push('<p class="dim">時間、誰做的、角色、組別、事件、說明。' +
    '說明是一句中文，人讀的那一份。</p>');
  H.push('<textarea id="csv" rows="3" readonly>' + esc(exportCsv(cid)) + '</textarea>');
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

/* newclass／newuser／respw／deluser 四顆都拿掉了。
   研究者是觀察者，不是管理員——見檔頭。 */

/* 三顆下載鍵共用這一支。研究者只有讀跟存檔，一支寫入的函式都沒有
   （check.js 守著這一條）。 */
function rsSave(name, text) {
  try {
    /* BOM，不然 Excel 開起來中文是亂碼 */
    var blob = new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    say('存成 ' + name + ' 了。');
  } catch (e) {
    say('這個瀏覽器不給存檔。上面那格的字全選複製也一樣。');
  }
}

ACTS.csvruns = function () {
  rsSave('專案地下城' + (RULES.SOLO ? 'B' : '') + '-一趟一列.csv', exportRuns(rsClassId()));
};

ACTS.csvitems = function () {
  rsSave('專案地下城' + (RULES.SOLO ? 'B' : '') + '-一件一列.csv', exportItems(rsClassId()));
};

ACTS.csv = function () {
  var name = '專案地下城' + (RULES.SOLO ? 'B' : '') + '-紀錄.csv';
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
