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

   2026-09-30 第三個例外：清掉測試資料（actResearcherDeleteTestClass、
   actResearcherDeleteOrphans，見 15-auth.js），形狀開得很窄。

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

  /* 誰用的是新版（課堂上叫大家重新整理時，有一個數字可以看）。
     u.build 是新版登入之後自己寫的（見 41-sync.js 的 reportBuild）；
     還開著舊版分頁的人寫不進去，所以永遠停在舊的或空的。 */
  var 學生們 = rsUsers().filter(function (u) { return u.role === 'student' && !u.mergedInto && (!rsClassId() || inClass(u, rsClassId())); });
  var 最新 = 0; 學生們.forEach(function (u) { if ((u.build || 0) > 最新) 最新 = u.build; });
  if (最新) {
    var 新 = 學生們.filter(function (u) { return u.build === 最新; });
    var 舊 = 學生們.filter(function (u) { return u.build !== 最新; })
      .sort(function (a, b) { return (b.lastLogin || 0) - (a.lastLogin || 0); });
    H.push('<div class="card">');
    H.push('<div class="eyebrow">用的是不是新版</div>');
    H.push('<p><b>' + 新.length + '</b> 人是最新版　·　<b>' + 舊.length + '</b> 人還沒回報最新版</p>');
    H.push('<p class="dim">還沒回報＝還開著舊分頁，或是新版部署之後還沒開過。上課時請他們把分頁關掉重開。</p>');
    if (舊.length) {
      H.push('<p class="dim">' + 舊.slice(0, 20).map(function (u) { return esc(u.name); }).join('、') +
        (舊.length > 20 ? '……' : '') + '</p>');
    }
    H.push('</div>');
  }

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

  /* 清掉測試資料（第三個例外，見 15-auth.js）：有東西可以清才出現。 */
  var 測試班 = where('Classes', isTestClass), 孤兒 = orphanUsers();
  if (測試班.length || 孤兒.length) {
    H.push('<div class="card">');
    H.push('<div class="eyebrow">清掉測試資料</div>');
    H.push('<p class="dim">只刪名字裡有「測試」或「演練」的班，和掛在已不存在的班上的帳號。真的班刪不了。事件紀錄不動。</p>');
    測試班.forEach(function (c) {
      var n = testClassCount(c.classId);
      H.push('<div class="rn-row"><b>' + esc(c.name) + '</b><span class="dim">' +
        n.users + ' 個帳號　·　' + n.teams + ' 組　·　' + n.runs + ' 趟</span></div>');
      if (DRAFT.rsDel === c.classId) {
        H.push('<p class="dim">確定嗎？這個班的帳號、組別、任務、紀錄都會從雲端刪掉，刪了就沒有了。</p>');
        H.push(btn('對，刪掉這個測試班', 'rsdelyes:' + c.classId, 'big'));
        H.push(btn('先不要', 'rsdelno', 'ghost'));
      } else {
        H.push(btn('刪掉這個測試班', 'rsdel:' + c.classId, 'ghost'));
      }
    });
    if (孤兒.length) {
      H.push('<div class="rn-row"><b>沒有班的帳號　' + 孤兒.length + ' 個</b><span class="dim">' +
        孤兒.map(function (u) { return esc(u.account); }).join('、') + '</span></div>');
      if (DRAFT.rsOrph) {
        H.push('<p class="dim">確定嗎？這些帳號會從雲端刪掉。</p>');
        H.push(btn('對，刪掉這些帳號', 'rsorphyes', 'big'));
        H.push(btn('先不要', 'rsdelno', 'ghost'));
      } else {
        H.push(btn('刪掉這些帳號', 'rsorph', 'ghost'));
      }
    }
    H.push('</div>');
  }

  H.push('<div class="card">');
  H.push('<div class="eyebrow">刪掉多的學生帳號</div>');
  H.push('<p class="dim">重複註冊留下的空帳號、沒人的組。有做過事的帳號刪不了。</p>');
  H.push(btn('刪多的帳號', 'go:rsacc', ''));
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

/* ---------- 刪多的學生帳號 ---------- */
PAGES.rsacc = function () {
  var u = me();
  if (!u || u.role !== 'researcher') return PAGES.gate();
  var H = [head('刪多的學生帳號', '只有沒做過任何事的刪得掉', '')];
  H.push('<div class="card"><p class="dim">有寫過話、被指定過分工、做過動作的帳號刪不了——刪了他的紀錄會找不到人。那種請用老師端的「接回帳號」把兩個帳號併起來。事件紀錄不會動。</p>' +
    '<p class="dim">系統先看過每一個學生帳號，把「像測試」「像重複註冊」「看不出是多的」分開，理由寫在每一個名字下面。分析只讀，不會刪任何東西，決定在你。</p></div>');

  if (DRAFT.rsAccConfirm && DRAFT.rsAcc) {
    var p = userOf(DRAFT.rsAcc);
    H.push('<div class="card">');
    H.push('<div class="eyebrow warnx">確定嗎</div>');
    var pa = p ? acctAnalysis(p) : null;
    H.push('<p>要刪掉「' + esc(p ? p.name : '') + '」（' + esc(p ? p.account : '') + '）。</p>');
    if (pa) {
      H.push('<p><b>系統的看法：' + ACCT_TIER_SAY[pa.tier] + '</b></p>');
      H.push('<p class="dim">' + (pa.bits.length ? pa.bits.map(esc).join('；') : '找不到他是測試或重複的證據。') + '</p>');
      if (pa.tier === 'unsure') {
        H.push('<p class="dim">' + (pa.real.length ? pa.real.map(esc).join('；') + '。' : '') +
          '這個帳號看不出是多的，很可能是還沒開始用的真學生。刪了他就要重新註冊，組別接不回來。</p>');
      }
    }
    H.push('<p class="dim">刪了就沒有了。他那一組如果因此沒有人、也沒有任何一趟，組別一起刪。</p>');
    H.push(btn(pa && pa.tier === 'unsure' ? '我確定他是多的，刪掉' : '對，刪掉這個帳號', 'rsaccyes', pa && pa.tier === 'unsure' ? '' : 'big'));
    H.push(btn('先不要', 'rsaccno', 'ghost'));
    H.push('</div>');
    return H.join('') + '<div class="row">' + btn('回去', 'go:rs', 'ghost') + '</div>';
  }

  var stu = where('Users', function (x) { return x.role === 'student' && !x._d && !x._removed; })
    .sort(function (x, y) { return x.name === y.name ? 0 : (x.name < y.name ? -1 : 1); });
  var G = { test: [], dup: [], unsure: [], busy: [], gone: [] };
  stu.forEach(function (x) { var an = acctAnalysis(x); G[an.tier].push([x, an]); });

  /* 先給一句總結：系統看過幾個、各是什麼。 */
  H.push('<div class="card"><div class="eyebrow">系統看過了　' + stu.length + ' 個學生帳號</div>');
  H.push('<p>幾乎確定是測試 <b>' + G.test.length + '</b>　·　很可能是重複註冊 <b>' + G.dup.length +
    '</b>　·　看不出是多的 <b>' + G.unsure.length + '</b>　·　做過事（刪不了）<b>' + G.busy.length + '</b>' +
    (G.gone.length ? '　·　測試班的帳號 <b>' + G.gone.length + '</b>' : '') + '</p>');
  H.push('<p class="dim">建議：前兩種先看理由再刪；「看不出是多的」多半是還沒開始用的真學生，不要刪。</p></div>');

  function pick(x, an) {
    var t = x.teamId ? teamOf(x.teamId) : null;
    return '<button class="tag" data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'rsaccpick:' + x.userId })) + '\'>' +
      esc(x.name) +
      '<small style="display:block;opacity:.6;font-size:22px">' + esc(x.account) + (t ? '　·　' + esc(t.name) : '　·　沒有組') +
      (x.lastLogin ? '　·　' + daysBetween(x.lastLogin, now()) + ' 天前登入' : '　·　沒登入過') + '</small>' +
      (an.bits.length ? '<small style="display:block;opacity:.85;font-size:22px">' + an.bits.map(esc).join('；') + '</small>' : '') +
      '</button>';
  }
  var 區 = [
    ['test', '幾乎確定是測試', '掛在已不存在的班、在測試班裡、或帳號名字有 test／demo 這類字，而且沒做過事。'],
    ['dup', '很可能是重複註冊', '同名或帳號很像，另一個帳號做的事比這個多，或兩個註冊只差幾分鐘。留下做過事的那一個。'],
    ['unsure', '看不出是多的', '沒有證據說他是測試或重複——多半是還沒開始用的真學生。不建議刪。']];
  區.forEach(function (z) {
    var rows = G[z[0]];
    H.push('<div class="card"><div class="eyebrow">' + z[1] + '　' + rows.length + ' 個</div>');
    H.push('<p class="dim">' + z[2] + '</p>');
    if (!rows.length) H.push('<p class="dim">沒有。</p>');
    else H.push('<div class="tags">' + rows.map(function (r) { return pick(r[0], r[1]); }).join('') + '</div>');
    H.push('</div>');
  });

  if (G.gone.length) {
    H.push('<div class="card"><div class="eyebrow">測試班的帳號　' + G.gone.length + ' 個</div>');
    H.push('<p class="dim">這些帳號掛在已不存在的班上。它們有紀錄，所以不從這裡刪；到研究者首頁的「清掉測試資料」一起清。</p>');
    G.gone.forEach(function (r) {
      H.push('<div class="rn-row"><b>' + esc(r[0].name) + '</b><span class="dim">' + esc(r[0].account) + '　·　' + esc(r[1].bits.join('；')) + '</span></div>');
    });
    H.push(btn('去清掉測試資料', 'go:rs', 'ghost'));
    H.push('</div>');
  }

  H.push('<div class="card"><div class="eyebrow">做過事，刪不了　' + G.busy.length + ' 個</div>');
  G.busy.forEach(function (r) {
    H.push('<div class="rn-row"><b>' + esc(r[0].name) + '</b><span class="dim">' + esc(r[0].account) + '　·　' + esc(r[1].why) +
      (r[1].testish ? '　·　名字或帳號像測試，但做過事所以不能刪' : '') + '</span></div>');
  });
  H.push('</div>');

  var et = emptyTeams();
  H.push('<div class="card"><div class="eyebrow">沒有人、也沒有任務的組　' + et.length + ' 個</div>');
  if (et.length) {
    H.push('<p class="dim">' + et.map(function (t) { return esc(t.name); }).join('、') + '</p>');
    if (DRAFT.rsTeams) {
      H.push('<p class="dim">確定嗎？這些組會從雲端刪掉。</p>');
      H.push(btn('對，刪掉這些組', 'rsteamsyes', 'big'));
      H.push(btn('先不要', 'rsaccno', 'ghost'));
    } else {
      H.push(btn('刪掉這些空組', 'rsteams', 'ghost'));
    }
  } else {
    H.push('<p class="dim">沒有。</p>');
  }
  H.push('</div>');
  H.push('<div class="row">' + btn('回去', 'go:rs', 'ghost') + '</div>');
  return H.join('');
};
ACTS.rsaccpick = function (id) { DRAFT.rsAcc = id; DRAFT.rsAccConfirm = true; DRAFT.rsTeams = false; render(); };
ACTS.rsaccno = function () { DRAFT.rsAcc = null; DRAFT.rsAccConfirm = false; DRAFT.rsTeams = false; render(); };
ACTS.rsaccyes = function () {
  var r = actResearcherDeleteAccount(S.who, DRAFT.rsAcc);
  DRAFT.rsAcc = null; DRAFT.rsAccConfirm = false;
  render();
  say(r.err ? r.err : '刪掉了「' + r.name + '」（' + r.account + '）' + (r.team ? '，連同沒人的組。' : '。'));
};
ACTS.rsteams = function () { DRAFT.rsTeams = true; DRAFT.rsAccConfirm = false; render(); };
ACTS.rsteamsyes = function () {
  DRAFT.rsTeams = false;
  var r = actResearcherDeleteEmptyTeams(S.who);
  render();
  say(r.err ? r.err : '清掉了 ' + r.n + ' 個空組。');
};

ACTS.rsdel = function (id) { DRAFT.rsDel = id; DRAFT.rsOrph = false; render(); };
ACTS.rsorph = function () { DRAFT.rsOrph = true; DRAFT.rsDel = null; render(); };
ACTS.rsdelno = function () { DRAFT.rsDel = null; DRAFT.rsOrph = false; render(); };
ACTS.rsdelyes = function (id) {
  DRAFT.rsDel = null;
  var r = actResearcherDeleteTestClass(S.who, id);
  render();
  say(r.err ? r.err : '清掉了「' + r.name + '」：' + r.users + ' 個帳號、' + r.teams + ' 組、' + r.runs + ' 趟。');
};
ACTS.rsorphyes = function () {
  DRAFT.rsOrph = false;
  var r = actResearcherDeleteOrphans(S.who);
  render();
  say(r.err ? r.err : '清掉了 ' + r.users + ' 個帳號。');
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
