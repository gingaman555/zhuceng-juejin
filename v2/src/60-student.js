/* 學生端。

   一頁只給一個動作。首頁就是廊道本身——招牌、角色、迷霧、魔物，
   底下一排他們自己寫的東西。其餘都是資訊，不是選項。

   兩條原則，這一版收得比之前緊：

   一 · 系統不定義他們在做什麼。
        每天點的那幾段、承諾時標的那幾段、營火說的那幾段，全部來自
        同一個地方：老師分段時寫的那幾行。系統一個字都沒有列。
        老師沒分段也走得完：推進那一顆鍵退回「我今天來過了」。

   二 · 介面不解釋自己。
        本來每一張卡底下都有一段我寫的說明（「這一下就是推進，不用再
        按第二顆」）。那是系統在替使用者讀畫面。能畫出來的就畫出來——
        承諾與實際畫成兩條尺（見 56-viz.js），停滯畫成畫面暗下來，
        走過的日子畫成廊道上的火把。剩下的字只有兩種：他們自己的詞，
        跟系統記到的數字。 */

/* ---------- 廊道（首頁） ---------- */
/* ---------- 首頁 ----------

   YouTube 的首頁放的是別人的影片，但它的主流程是把影片放上去。
   打開它的理由是別人，留下來的理由才是自己。

   本來反過來：首頁是自己的廊道，別人在另一個分頁裡當背景。
   一個人的東西看兩次就沒了，所以沒有理由在不必要的時候打開它。

   現在：上面一條是你手上這一趟（狀態、幾段、兩條尺、那一顆鍵），
   底下是全班最近發生的事，一則一則往下。

   廊道那一整片場景搬到全班地下城了——世界該是全班共用的，
   不是他一個人的背景。 */
/* ---------- 首頁 ----------

   層級：
     主功能  廊道 ＋ 那一顆鍵。大、在最上面、是遊戲的樣子。
     副功能  廊道底下那三個小圖示（營火、出口、招牌）。
     別人    全班最近。打開這個系統的理由，但不是主功能，所以在底下。

   YouTube 的首頁放的是別人的影片，主流程卻是把影片放上去——
   那句話講的是層級，不是「拿掉自己的東西」。 */
PAGES.home = function () {
  var t = myTeam();
  var next = nextThing(t.teamId);
  var st = stallOf(t.teamId);
  var row = next.row;
  var r = row && row.run && row.run.runId ? row.run : null;

  var H = [];

  /* ── 主功能：廊道。這不是裝飾，是「說幾天 → 交出去」被畫出來的樣子。 ── */
  H.push(scene(t, next.row, st, next.kind));

  /* ── 任務的內容。接在廊道正下面當說明行，不另外開一張卡——
        那是同一件事的兩個部分，中間不該有一條卡片的邊。 ── */
  H.push('<div class="tline">');
  H.push('<span class="eyebrow">' + esc(taskTag(next)) + '</span>');
  H.push('<b>' + esc(row && row.ms ? row.ms.title : '還沒有任務') + '</b>');
  if (st.level) H.push('<i class="warnx">' + esc(RULES.stallSay(st.level, st.days)) + '</i>');
  H.push('</div>');
  if (r) H.push(stepRow(r.runId));

  /* ── 主功能：那一顆鍵 ── */
  H.push(actionCard(t, next, st));
  if (next.more) {
    H.push('<p class="dim">老師又派了 ' + next.more + ' 個。做完這一趟才輪到。</p>');
  }

  /* ── 副功能：小圖示 ── */
  H.push(deskRow(t, next));

  /* ── 別人 ── */
  var fd = feedOf(t.classId, 20);
  H.push('<div class="eyebrow feed-h">全班最近</div>');
  if (!fd.length) {
    H.push('<div class="card dim">還沒有事情發生。</div>');
  } else {
    H.push('<div class="feed">');
    fd.forEach(function (f) { H.push(feedRow(f, t.teamId)); });
    H.push('</div>');
  }
  H.push(coreCard());
  return H.join('');
};

/* 老師分的段，排成一列小方塊。勾得掉。
   它接在任務那一行下面，不是一張卡——段是任務的一部分，不是另一件事。 */
function stepRow(runId) {
  var sp = stepsOf(runId);
  if (!sp) return '';
  var H = ['<div class="srow">'];
  sp.all.forEach(function (x, i) {
    var on = sp.on.indexOf(i) >= 0;
    H.push('<button class="sq' + (on ? ' on' : '') + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'tick:' + runId + '|' + i })) + '\'>' +
      '<b></b>' + esc(x) + '</button>');
  });
  H.push('</div>');
  return H.join('');
}

/* 這一趟現在是什麼狀態。一個短標籤，不是一句解釋。 */
function taskTag(next) {
  return ({
    commit: '新的', doing: '正在做', submit: '走到底了',
    camp: '營火', review: '在老師那邊', gear: '老師看完了',
    waitexit: '出口', left: '地面', idle: '等老師派'
  })[next.kind] || '';
}

/* 底下那三樣：營火、出口、招牌。都是偶爾才用的，但都不能藏起來——
   沒觸發過的東西等於不存在。 */
function deskRow(t, next) {
  var lit = next.kind === 'camp';
  var H = ['<div class="desk">'];
  H.push('<button class="dk' + (lit ? ' lit' : '') + '" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'peek:camp' })) + '\' title="' +
    esc(lit ? '營火：說一下哪一段比想的久' : '營火（還沒點著）') + '">' +
    pxTag(CAMPFIRE.px, lit ? CAMPFIRE.pal : COLD_PAL, '') + '<i>營火</i></button>');
  H.push('<button class="dk' + (t.exitAsk ? ' lit' : '') + '" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'go:exit' })) + '\' title="' +
    esc(t.exitAsk ? '出口：在等老師確認' : '出口：專案做完的時候從這裡上去') + '">' +
    pxTag(ICONS.codex, t.exitAsk ? ICON_ON : ICON_PAL, '') + '<i>出口</i></button>');
  var sg = signOf(t.teamId);
  H.push('<button class="dk lit" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'go:sign' })) + '\' title="' +
    esc('招牌：' + (t.project || '（還沒定）')) + '">' +
    pxTag(sg.px, sg.pal, '') + '<i>' + esc(t.project || '（還沒定）') + '</i></button>');
  H.push('</div>');
  return H.join('');
}

/* ---------- 老師分的段 ----------
   他有分才畫。勾一段是「這一段做完了」，隨時可以改——
   勾錯了不該是一件要去求人的事。它不影響判定。 */
function stepCard(runId) {
  var sp = stepsOf(runId);
  if (!sp) return '';
  var H = ['<div class="card">'];
  H.push('<div class="eyebrow">段　' + sp.on.length + ' / ' + sp.all.length + '</div>');
  H.push('<div class="steps-list">');
  sp.all.forEach(function (x, i) {
    var on = sp.on.indexOf(i) >= 0;
    H.push('<button class="stp' + (on ? ' on' : '') + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'tick:' + runId + '|' + i })) + '\'>' +
      '<b></b><i>' + esc(x) + '</i></button>');
  });
  H.push('</div></div>');
  return H.join('');
}

/* 哪一組遇到哪一隻的 mobFor 在 13-strata.js——那是世界的規則，不是畫面的。 */

/* nextThing 回的那個字，對到步驟條的第幾格。 */
var STEP_AT = {
  commit: 0,
  doing: 1, submit: 1, camp: 1, review: 1,
  gear: 2
};

/* 上一次自己留下的那一句 */
function lastKeep(teamId) {
  var ks = keepsOf(teamId);
  return ks.length ? ks[ks.length - 1] : null;
}


/* ---------- 唯一的那一顆動作 ---------- */
/* ---------- 唯一可以按的那一個 ----------

   一個標籤（現在是什麼）＋ 一顆鍵（要做什麼）。沒有解釋句。
   狀態由廊道底下那排數字說，不由這裡用一句話說一次。 */
function actionCard(t, next, st) {
  var H = ['<div class="act-card">'];
  var row = next.row;

  if (next.kind === 'left') {
    H.push('<div class="eyebrow">地面</div>');
    if (t.exitWord) H.push('<p class="quote">' + nl(t.exitWord) + '</p>');
    H.push(btn('看你帶出來的', 'go:exit', 'big'));

  } else if (next.kind === 'waitexit') {
    H.push('<div class="eyebrow">出口　·　等老師確認</div>');
    H.push(btn('還沒，收回', 'cancelexit', 'ghost'));

  } else if (next.kind === 'commit') {
    H.push('<div class="eyebrow">新的　·　' + esc(row.ms.title) + '</div>');
    H.push(btn('要花幾天', 'go:commit:' + row.ms.msId, 'big'));

  } else if (next.kind === 'doing') {
    H.push(doingCard(t, row, st));
    /* 老師又派了幾個。小小地說一聲就好——手上這一趟做完才輪到它們。 */
    if (next.more) {
      H.push('<p class="dim">老師又派了 ' + next.more + ' 個。做完這一趟才輪到。</p>');
    }
    /* 老師又派了幾個。小小地說一聲就好——手上這一趟做完才輪到它們。 */
    if (next.more) {
      H.push('<p class="dim">老師又派了 ' + next.more + ' 個。做完這一趟才輪到。</p>');
    }

  } else if (next.kind === 'camp') {
    H.push('<div class="eyebrow">營火　·　' + row.run.actual + ' 天，你說 ' +
      row.run.est + ' 天</div>');
    H.push(btn('去營火旁', 'go:camp:' + row.run.runId, 'big'));

  } else if (next.kind === 'gear') {
    H.push('<div class="eyebrow">老師看完了</div>');
    if (row.run.word) H.push('<p class="quote">' + nl(row.run.word) + '</p>');
    H.push(btn('封存這一趟', 'gear:' + row.run.runId, 'big'));

  } else if (next.kind === 'review') {
    H.push('<div class="eyebrow">在老師那邊</div>');
    H.push('<h2>等他看。</h2>');

  } else {
    H.push('<div class="eyebrow">廊道很安靜</div>');
    H.push('<h2>等老師派下一個。</h2>');
  }

  H.push('</div>');
  return H.join('');
}

/* ---------- 正在做 ----------

   這一張本來是「今天動的是哪一段？」加一排每天要按的鍵。
   拿掉了：兩個接觸點就夠——開始之前說幾天，做完回來交。

   所以這一頁上只有一個動作，而且它一直都在：交出去。
   底下那一句講的是狀態，不是催促——水在哪裡是行事曆決定的，
   他開不開這一頁都一樣。 */
function doingCard(t, row, st) {
  var r = row.run;
  var H = [];
  H.push('<div class="eyebrow">' + esc(row.ms.title) +
    (st && st.level ? '　·　' + esc(RULES.stallSay(st.level, st.days)) : '') + '</div>');
  H.push(btn('做完了', 'go:submit:' + r.runId, 'big'));
  return H.join('');
}

/* ---------- 場景底下那一行 ---------- */
function sceneCap(t, next, st) { return ''; }

/* ---------- 招牌 ----------
   廊道口掛的是誰。名字是他們自己寫的，這是招牌唯一的意義——
   本來還有三階材質（走越深牌子越好），拿掉了：深度已經不是進度。 */
PAGES.sign = function () {
  var t = myTeam();
  var sg = signOf(t.teamId);
  var H = [head('招牌', '廊道口掛的是誰', '')];
  H.push('<div class="card"><div class="fa-in">');
  H.push(pxTag(sg.px, sg.pal, 'fa-px'));
  H.push('<div>');
  H.push('<input id="pj-name" value="' + esc(t.project || '') +
         '" placeholder="' + esc('這個專案叫什麼') + '">');
  H.push('<div class="row">');
  H.push(btn('換字', 'rename', ''));
  H.push(btn('回廊道', 'go:home', 'ghost'));
  H.push('</div>');
  H.push('</div></div></div>');
  return H.join('');
};

/* ---------- 承諾：滑桿 ＋ 自己標哪幾件會比想的久 ---------- */
PAGES.commit = function () {
  var t = myTeam();
  var m = msOf(S.p.id);
  if (!m) return '<div class="card">找不到這一個里程碑。</div>';
  var est = Number(draft('est', RULES.EST_DEFAULT));
  var flags = DRAFT.flags || [];

  var H = [head('自我承諾', m.title, m.note)];

  /* 你自己的估算歷史。

     這是拉滑桿那一刻真正用得上的東西，而它本來不在這一頁上——
     本來站在這個位置的是一句留下的話，它站不住。
     上三趟說了幾天、實際走了幾天，疊在一起就看得出自己的偏差。 */
  var past = runsFor(t.teamId).filter(function (x) { return x.run.stamp; }).slice(-3);
  if (past.length) {
    H.push('<div class="card">');
    H.push('<div class="eyebrow">你前 ' + past.length + ' 趟</div>');
    past.reverse().forEach(function (x) {
      H.push('<div class="outrun"><span>' + esc(x.ms.title) + '</span>');
      H.push(estBar(x.run.est, x.run.actual, false));
      H.push('</div>');
    });
    H.push('</div>');
  }

  /* 全班怎麼看這一件事。匿名，只有天數。
     它出現在拉滑桿之前——那一刻才是它有用的時候。 */
  var sp = estSpread(m.msId, t.teamId);
  if (sp) {
    H.push('<div class="card">');
    H.push('<div class="eyebrow">別組怎麼看這一件事</div>');
    H.push(spreadBar(sp, est));
    H.push('<div class="log-num">' + sp.n + ' 組已經說了　·　最少 <b>' +
      sp.lo + '</b> 天　·　最多 <b>' + sp.hi + '</b> 天</div>');
    H.push('</div>');
  }

  H.push('<div class="card">');
  H.push('<div class="eyebrow">幾天</div>');
  H.push('<div class="slider-wrap">');
  H.push('<input type="range" class="slider" id="est" min="' + RULES.EST_MIN +
         '" max="' + RULES.EST_MAX + '" value="' + est +
         '" oninput="ACTS.est(this.value)">');
  H.push('<div class="slider-read"><b>' + est + '</b><span>天</span></div>');
  H.push('</div>');
  /* 準的範圍直接畫出來，不用一句話描述它 */
  H.push(estBar(est, 0, true));
  H.push('</div>');

  /* 老師分了段才問。標的是他分的那幾段，不是我列的選項。 */
  var run0 = runOf(t.teamId, m.msId);
  var pv = previewSteps(m);
  if (pv.length) {
    H.push('<div class="card">');
    H.push('<div class="eyebrow">哪幾段會比你想的久　選填</div>');
    H.push(msStepLegend(m, flags, 'flag'));
    H.push('</div>');
  }

  /* 老師分的段。承諾之前先看到範圍，那是決定幾天的依據。 */
  if (pv.length) {
    H.push('<div class="card quiet">');
    H.push('<div class="eyebrow">這一趟要做的幾段</div>');
    H.push('<div class="steps-list">');
    pv.forEach(function (x) {
      H.push('<div class="stp static"><b></b><i>' + esc(x) + '</i></div>');
    });
    H.push('</div></div>');
  }

  H.push('<div class="row">');
  H.push(btn('我承諾 ' + est + ' 天', 'commit:' + m.msId, 'big'));
  H.push(btn('回廊道', 'go:home', 'ghost'));
  H.push('</div>');
  return H.join('');
};

/* ---------- 交出去 ---------- */
PAGES.submit = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var t = myTeam();
  var m = msOf(r.msId);
  var used = Math.max(1, daysBetween(r.committedAt, now()));

  var H = [head('交出去', m.title, '')];

  /* 走到底了才看得清楚牠。前面那些天牠都在霧裡。 */
  var mob = mobOfRun(r);
  var zone = strataAt(depthOf(t.teamId), t.teamId);
  H.push('<div class="card fa ' + zone.key + '"><div class="fa-in">');
  H.push(pxTag(mob.px, zone.pal, 'fa-px'));
  H.push('<div><div class="eyebrow">' + esc(zone.name) + '</div>');
  H.push('<h2>' + esc(mob.n) + '</h2>');
  H.push('<p class="lead">' + esc(mob.t) + '</p>');
  H.push('</div></div></div>');

  H.push('<div class="card">');
  H.push(estBar(r.est, used, false));
  H.push('</div>');

  /* 老師分的段：勾掉做完的。 */
  H.push(stepCard(r.runId));

  /* 這幾天你動過哪幾天。

     每天要按的那一版拿掉之後，這一份資料本來就會不見。改成在這裡一次
     補齊：一張那幾天的格子，點一下標起來。選填——不標一樣交得出去，
     而且它不進判定（判定只看承諾幾天與行事曆過了幾天）。

     它唯一影響的是那一趟長成什麼樣子的岩心。 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">這幾天你動過哪幾天　選填</div>');
  H.push(dayGrid(r.runId));
  H.push('<p class="dim">點一下標起來。這不會影響判定——它決定的是' +
         '這一趟封存起來長什麼樣子。</p>');
  H.push('</div>');

  H.push('<div class="row">');
  H.push(btn('確認交出去了', 'submit:' + r.runId, 'big'));
  H.push(btn('還沒', 'go:home', 'ghost'));
  H.push('</div>');
  H.push('<p class="dim">作業交到老師原本收的地方。這裡不收檔案。</p>');
  return H.join('');
};

/* ---------- 判定結果 ---------- */
PAGES.stamp = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var s = RULES.STAMPS[r.stamp];

  var t = myTeam();
  var zone = strataAt(depthOf(t.teamId), t.teamId);
  var mob = mobOfRun(r);

  var H = ['<div class="stamp-card ' + r.stamp + '">'];
  H.push('<div class="stamp-mark">' + s.mark + '</div>');
  H.push('<h1>' + esc(s.name) + '</h1>');
  H.push(estBar(r.est, r.actual, false));
  H.push('</div>');

  /* 擋路的那一隻讓開了。這一趟真的結束了的訊號——
     牠不是被打敗的，牠只是不再擋在那裡。 */
  H.push('<div class="card fa ' + zone.key + ' aside"><div class="fa-in">');
  H.push(pxTag(mob.px, zone.pal, 'fa-px gone'));
  H.push('<div><div class="eyebrow">' + esc(zone.name) + '</div>');
  H.push('<h2>' + esc(mob.n) + '讓開了。</h2>');
  H.push('</div></div></div>');

  if (r.stamp === 'late') {
    H.push(btn('去營火旁說一下', 'go:camp:' + r.runId, 'big'));
  } else {
    H.push(btn('好', 'skipcamp:' + r.runId, 'big'));
  }
  return H.join('');
};

/* ---------- 營火 ----------
   問的是他們自己清單上的哪一件比想的久。系統不列「卡關的原因」。 */
PAGES.camp = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var t = myTeam();
  var picked = DRAFT.overs || [];
  var flags = r.flags || [];

  var H = ['<div class="camp">'];
  H.push(pxTag(CAMPFIRE.px, CAMPFIRE.pal, 'fire'));
  H.push('<div>');
  H.push('<div class="eyebrow">營火</div>');
  H.push('<h2>哪一件比你想的久？</h2>');
  H.push('</div></div>');

  H.push('<div class="card">');
  H.push(estBar(r.est, r.actual, false));
  H.push('</div>');

  if (stepNames(r.runId).length) {
    H.push('<div class="card">');
    if (flags.length) {
      H.push('<div class="eyebrow">承諾時你標的</div>');
      H.push(stepLegend(r.runId, flags, null));
    }
    H.push('<div class="eyebrow">哪一段真的比想的久</div>');
    H.push(stepLegend(r.runId, picked, 'over'));
    H.push('</div>');
  }

  H.push(btn('說完了', 'reflect:' + r.runId, 'big'));
  return H.join('');
};

/* ---------- 封存 ----------

   走完一趟，那一趟的紀錄長成一根岩心。形狀完全由那一趟決定：
   一天兩列，來過是實心、說了沒動是空心、沒有紀錄是斷的，
   長度就是這一趟過了幾天。

   這一頁真正給他的東西是「他沒見過的那個形狀」——同一份數字，
   換成一個看得到的樣子。取名選填，他不取一樣封存得下來。 */
PAGES.pick = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var t = myTeam();
  var m = msOf(r.msId);
  var z = strataAt(depthOf(t.teamId), t.teamId);
  var s = runShape(r.runId);

  var H = [head('封存', m.title, '這一趟長成這個樣子。')];

  if (r.word) {
    H.push('<div class="card"><div class="eyebrow">老師說</div>' +
           '<p class="quote">' + nl(r.word) + '</p></div>');
  }

  H.push('<div class="card fa ' + z.key + ' coreview">');
  H.push('<div class="cv-in">');
  H.push(pxTag(coreOf(r.runId), z.pal, 'core big'));
  H.push('<div>');
  H.push('<div class="eyebrow">' + esc(z.name) + '</div>');
  H.push('<div class="corekey">');
  H.push('<span><b class="c1"></b>來過 ' + s.moved + ' 天</span>');
  if (s.rested) H.push('<span><b class="c2"></b>你說沒動 ' + s.rested + ' 天</span>');
  if (s.blank) H.push('<span><b class="c3"></b>沒有紀錄 ' + s.blank + ' 天</span>');
  H.push('</div>');
  H.push('<div class="log-num">說 <b>' + s.est + '</b> 天　·　過了 <b>' +
    s.elapsed + '</b> 天</div>');
  H.push('</div></div></div>');


  H.push('<div class="card">');
  H.push('<div class="eyebrow">給這一趟取個名字　選填</div>');
  H.push('<div class="rn-row">');
  H.push('<input id="cname" maxlength="16" placeholder="' +
    esc('例：訪談那一週') + '">');
  H.push('</div>');
  H.push(btn('封存', 'seal:' + r.runId, 'big'));
  H.push('</div>');
  return H.join('');
};
/* 選方向那張小地圖拿掉了：占地那一下改在全班那張圖上做。
   地圖是動手的地方，不是一個看的頁面。 */

/* ---------- 大躍進 ---------- */
PAGES.dash = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var t = myTeam();
  var keep = lastKeep(t.teamId);

  var H = ['<div class="dash">'];
  H.push(pxTag(HERO.dash, HERO.pal, 'ch big'));
  H.push('<h1>' + (depthOf(r.teamId) * WORLD.depthPerMilestone) + ' m</h1>');
  if (keep && keep.name) H.push('<p class="lead">「' + esc(keep.name) + '」封存了。</p>');
  if (r.word) H.push('<p class="quote">' + nl(r.word) + '</p>');
  H.push('</div>');

  /* 跨進新的一區。世界自己變了，不是給的獎勵。 */
  var d = depthOf(r.teamId);
  var now2 = strataAt(d, r.teamId), was = strataAt(d - 1, r.teamId);
  if (d > 0 && now2.key !== was.key) {
    H.push('<div class="card fa ' + now2.key + ' zone-in">');
    H.push('<div class="eyebrow">石頭變了</div>');
    H.push('<h2>' + esc(now2.name) + '</h2>');
    H.push('<p class="lead">' + esc(now2.note) + '</p>');
    H.push('</div>');
  }

  /* 封存完手上多一格可以打通。那一下要在地圖上做——
     地圖是動手的地方，不是一個看的頁面。 */
  if (claimsOf(t.teamId)) {
    H.push('<div class="card">');
    H.push('<div class="eyebrow">你有 ' + claimsOf(t.teamId) + ' 格可以打通</div>');
    H.push(btn('去地圖上打通', 'go:eco', 'big'));
    H.push('</div>');
  } else {
    H.push(btn('回廊道', 'go:home', 'big'));
  }
  return H.join('');
};

/* ---------- 出口 ----------

   這一頁是整個系統唯一的結尾。它不打分、不總評，只把他自己留下的
   紀錄攤開來：每一趟說幾天走幾天、走過哪幾層、留下哪幾句。

   「規劃妥善」不是開門的條件，是走出去的時候帶著的東西——
   同一道門，不同的故事。 */
PAGES.exit = function () {
  var t = myTeam();
  var e = exitRecord(t.teamId);
  var out = !!t.leftAt;

  var H = [head(out ? '地面' : '出口',
    out ? '你出去了' : '這個專案做完了？',
    out ? '' : '往下走不出去——六層會一直重來。出去的方式只有一個：' +
          '把手上這個專案做完，然後說一聲。')];

  if (out && t.exitWord) {
    H.push('<div class="card"><div class="eyebrow">老師說</div>' +
      '<p class="quote">' + nl(t.exitWord) + '</p></div>');
  }

  /* 帶出來的東西。全部是他自己的紀錄。 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">你帶出來的</div>');
  H.push('<div class="outnum">');
  H.push('<div><b>' + e.runs.length + '</b><span>走完的里程碑</span></div>');
  H.push('<div><b>' + e.days + '</b><span>來過的天數</span></div>');
  H.push('<div><b>' + e.zones.length + '</b><span>走過的地層</span></div>');
  H.push('<div><b>' + e.keeps.length + '</b><span>封存的岩心</span></div>');
  H.push('</div>');
  if (e.acc.total) H.push(accBar(e.acc));
  H.push('</div>');

  /* 走過的地層 */
  if (e.zones.length) {
    H.push('<div class="card"><div class="eyebrow">你走過的</div><div class="zones">');
    e.zones.forEach(function (z) {
      var c = faunaOf(z.key)[0];
      H.push('<div class="zn ' + z.key + '">');
      if (c) H.push(pxTag(c.px, z.pal, 'zn-px'));
      H.push('<b>' + esc(z.name) + '</b>');
      H.push('</div>');
    });
    H.push('</div></div>');
  }

  /* 每一趟說幾天、走幾天 */
  if (e.runs.length) {
    H.push('<div class="card"><div class="eyebrow">每一趟</div>');
    e.runs.forEach(function (x) {
      H.push('<div class="outrun"><span>' + esc(x.ms.title) + '</span>');
      H.push(estBar(x.run.est, x.run.actual, false));
      H.push('</div>');
    });
    H.push('</div>');
  }

  /* 帶出去的那一排岩心。二十根排在一起，就是一個學期的形狀。 */
  if (e.keeps.length) {
    H.push('<div class="card"><div class="eyebrow">你帶出去的</div>');
    H.push('<div class="rack">');
    e.keeps.slice().reverse().forEach(function (k) {
      var kz = STRATA[0];
      STRATA.forEach(function (x) { if (x.key === k.zone) kz = x; });
      H.push('<div class="rk">');
      H.push(pxTag(k.px || coreOf(k.runId), kz.pal, 'core'));
      H.push('<b>' + esc(k.name || '') + '</b>');
      H.push('<span>' + (k.elapsed || 0) + ' 天</span>');
      H.push('</div>');
    });
    H.push('</div></div>');
  }

  if (!out) {
    H.push('<div class="card">');
    H.push('<div class="eyebrow">說一聲</div>');
    H.push('<p class="dim">老師確認之後你就出去了。之後不會再收到新的里程碑，' +
           '這幾頁還看得到。</p>');
    H.push('<div class="row">');
    H.push(btn(t.exitAsk ? '已經說了，在等他' : '這個專案做完了',
      t.exitAsk ? 'noop' : 'askexit', 'big'));
    H.push(btn('回廊道', 'go:home', 'ghost'));
    H.push('</div></div>');
  } else {
    H.push(btn('回廊道', 'go:home', 'ghost'));
  }
  return H.join('');
};

/* ---------- 走過的每一趟 ---------- */
PAGES.log = function () {
  var t = myTeam();
  var rows = runsFor(t.teamId).filter(function (x) { return x.run.stamp; }).reverse();
  var acc = accuracyOf(t.teamId);
  var H = [head('紀錄', '走過的每一趟', '')];
  if (!rows.length) return H.join('') + '<div class="card dim">還沒有走完的里程碑。</div>';
  H.push('<div class="card quiet"><div class="eyebrow">走過 ' + acc.total + ' 趟</div>');
  H.push(accBar(acc));
  H.push('</div>');

  rows.forEach(function (x) {
    var r = x.run, s = RULES.STAMPS[r.stamp];
    H.push('<div class="card log-row">');
    H.push('<div class="log-head"><b>' + esc(x.ms.title) + '</b>' +
           '<span class="st ' + r.stamp + '">' + s.mark + '</span></div>');
    H.push(estBar(r.est, r.actual, false));
    H.push(dayStrip(t.teamId, r.runId));
    var sp = stepsOf(r.runId);
    if (sp) {
      H.push('<div class="tags small"><span class="k">老師分的段</span>');
      sp.all.forEach(function (x, i) {
        H.push('<span class="tag static' + (sp.on.indexOf(i) >= 0 ? ' hit' : '') +
          '">' + esc(x) + '</span>');
      });
      H.push('</div>');
    }
    var ov = (r.overs || []).map(function (i) { return stepName(r.runId, i); })
      .filter(Boolean);
    if (ov.length) {
      H.push('<div class="tags small"><span class="k">比想的久</span>');
      ov.forEach(function (l) { H.push('<span class="tag static hit">' + esc(l) + '</span>'); });
      H.push('</div>');
    }
    var kp = keepsOf(t.teamId).filter(function (k) { return k.runId === r.runId; })[0];
    if (kp && kp.name) H.push('<p class="quote">' + esc(kp.name) + '</p>');
    if (r.word) H.push('<p class="quote tw">' + nl(r.word) + '</p>');
    H.push('</div>');
  });
  return H.join('');
};
