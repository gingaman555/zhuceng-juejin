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
  /* 回來的時候先說一句不在的這幾天發生了什麼。
     只在真的隔了一天以上出現，而且只報真的發生過的事。 */
  var aw = awayOf(S.who);
  if (aw) {
    H.push('<div class="away">');
    H.push('<b>' + aw.days + '</b><span>天過去了</span>');
    if (aw.left !== null) {
      H.push(aw.left > 0 ? '<b>' + aw.left + '</b><span>天到期</span>'
        : '<em>已經超過你說的天數</em>');
    }
    if (aw.cells) H.push('<b>' + aw.cells + '</b><span>全班新留的</span>');
    if (aw.okd) H.push('<em class="ok">老師勾了 ' + aw.okd + ' 件</em>');
    H.push('</div>');
  }

  /* 這一圈走到哪。死線勇者一直讓你知道現在是專注還是休息，
     那個迴圈才會上癮。 */
  H.push(beatBar(next, t));

  /* ── 自己那條廊道 ──

     打開來第一眼要是不用學就懂的東西。廊道不用學：一條走廊、
     一個人走在上面、水從後面漫過來。地圖要讀得懂得先知道三條規則
     （一格＝一趟、顏色＝哪一組、亮的可以點），而這個系統一學期
     只在那張圖上動八次，它沒有機會被學會。所以圖回到全班那一頁。 ── */
  H.push(scene(t, next.row, st, next.kind));
  if (r) H.push(stepRow(r.runId));

  /* ── 要做的那一件事，釘在畫面下面。 ── */
  H.push('<div class="dock">');
  H.push('<div class="tline">');
  H.push('<span class="eyebrow">' + esc(taskTag(next)) + '</span>');
  H.push('<b>' + esc(next.kind === 'name' ? '還沒取名字'
    : (row && row.ms ? row.ms.title : '還沒有任務')) + '</b>');
  if (st.level) H.push('<i class="warnx">' + esc(RULES.stallSay(st.level, st.days)) + '</i>');
  H.push('</div>');
  H.push(actionCard(t, next, st));
  H.push('</div>');
  if (next.more) {
    H.push('<p class="dim">老師又派了 ' + next.more + ' 個。做完這一趟才輪到。</p>');
  }

  /* 手上有格子可以打通的時候，指去地圖那一頁——
     動手的地方跟看的地方要是同一個。 */
  /* 走完一趟就多一層，那一層還沒蓋東西的時候指過去。
     往下一層不是一個動作——走完就下去了，要選的只有蓋什麼。 */
  if (unbuiltDepth(t.teamId) >= 0) {
    H.push('<div class="card">');
    H.push('<div class="eyebrow lit">新的一層</div>');
    H.push(btn('留一個記號', 'go:eco', 'big'));
    H.push('</div>');
  }


  /* ── 副功能：小圖示 ── */
  H.push(deskRow(t, next));

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
    name: '第一件事', commit: '新的', doing: '正在做',
    stamped: '判定', review: '在老師那邊', gear: '老師勾了',
    waitexit: '出口', left: '地面', idle: '等老師派'
  })[next.kind] || '';
}

/* 廊道底下那一排門。都是偶爾才用的，但都不能藏起來——
   沒觸發過的東西等於不存在。

   本來這裡是營火、出口、招牌。營火拿掉了：它問的「哪一段比你想的久」
   已經是戰鬥的第二題，而且它的 lit 條件永遠是 false，從來沒亮過。
   招牌也拿掉了：專案名在頂條上，而且點得進去改。
   換上來的是任務清單與圖鑑——它們本來各佔一個分頁，但它們不是步驟。 */
function deskRow(t, next) {
  var H = ['<div class="desk">'];
  /* 任務清單在側欄，這裡不再放一次——兩個地方都放就是重複。 */
  H.push('<button class="dk lit" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'go:codex' })) + '\' title="' +
    esc('圖鑑：這座地下城裡有什麼') + '">' +
    pxTag(ICONS.codex, ICON_ON, '') + '<i>圖鑑</i></button>');
  H.push('<button class="dk' + (t.exitAsk ? ' lit' : '') + '" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'go:exit' })) + '\' title="' +
    esc(t.exitAsk ? '出口：在等老師確認' : '出口：專案做完的時候從這裡上去') + '">' +
    pxTag(ICONS.log, t.exitAsk ? ICON_ON : ICON_PAL, '') +
    '<i>出口</i></button>');
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
  doing: 1, stamped: 1, review: 1,
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

  if (next.kind === 'name') {
    /* 第一個動作不可以是「等」。 */
    H.push('<div class="eyebrow lit">先取個名字</div>');
    H.push(btn('這個專案叫什麼', 'go:sign', 'big'));

  } else if (next.kind === 'left') {
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

  } else if (next.kind === 'stamped') {
    H.push('<div class="eyebrow">交出去了</div>');
    H.push(btn('看判定', 'go:stamp:' + row.run.runId, 'big'));

  } else if (next.kind === 'gear') {
    /* 這是整條流程裡唯一「別人為你做了一件事」的時刻，
       而它本來長得跟其他狀態一模一樣。給它一個到達的樣子。 */
    H.push('<div class="eyebrow lit">老師勾了</div>');
    if (row.run.word) H.push('<p class="quote big">' + nl(row.run.word) + '</p>');
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
  H.push(btn('做完了', 'go:battle:' + r.runId, 'big'));
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

/* 「哪一段比你想的久」那一排。
   「都差不多」跟其他選項一樣大——它不是逃生口，它是一個真的答案。 */
function overRow(r) {
  var picked = DRAFT.overs || [];
  var none = DRAFT.overs && !DRAFT.overs.length && DRAFT.said;
  var H = [];
  if (stepNames(r.runId).length) {
    H.push(stepLegend(r.runId, picked, 'over'));
  }
  H.push('<div class="alist">');
  H.push('<button class="ac' + (none ? ' on' : '') + '" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'oversame' })) + '\'><b></b>都差不多</button>');
  H.push('</div>');
  return H.join('');
}

/* 承諾那一頁還沒有 run，所以直接從里程碑上讀老師分的那幾段。
   那一排同時是兩件事：這一趟有哪幾段（範圍），
   以及點起來標「這一段會比想的久」。 */
function previewSteps(m) { return (m && m.steps) || []; }

function msStepLegend(m, sel, act) {
  var a = previewSteps(m);
  if (!a.length) return '';
  var H = ['<div class="alist">'];
  a.forEach(function (x, i) {
    var on = sel && sel.indexOf(i) >= 0;
    H.push('<button class="ac' + (on ? ' on' : '') + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: act + ':' + i })) + '\'>' +
      '<b style="background:' + stepHue(i) + '"></b>' + esc(x) + '</button>');
  });
  H.push('</div>');
  return H.join('');
}

/* ---------- 承諾：滑桿 ＋ 自己標哪幾件會比想的久 ---------- */
PAGES.commit = function () {
  var t = myTeam();
  var m = msOf(S.p.id);
  if (!m) return '<div class="card">找不到這一個里程碑。</div>';
  var est = Number(draft('est', RULES.EST_DEFAULT));
  var flags = DRAFT.flags || [];

  var H = [head('自我承諾', m.title, m.note)];

  /* 滑桿先，而且它跟下面那根尺是同一根——同寬、同起點。
     不同寬的話「拉到哪裡就看到自己落在別人哪裡」就不成立。 */
  H.push('<div class="card">');
  H.push('<div class="ax-head"><b>' + est + '</b><span>天</span></div>');

  /* 決定的時候要看的東西全部畫在同一根尺上：你前幾趟說了幾天、
     實際幾天，別組這一件事說的範圍，還有準的範圍。

     本來是三張卡——三張卡量的是同一個單位，等於叫使用者自己
     在腦袋裡把它們疊起來。 */
  var past = runsFor(t.teamId).filter(function (x) { return x.run.stamp; }).slice(-3);
  H.push(estAxis(est, past.reverse(), estSpread(m.msId, t.teamId)));
  H.push('</div>');

  /* 老師分的段。點起來標「這一段會比想的久」——
     那一排同時就是這一趟的範圍，所以下面不用再列一次清單。 */
  if (previewSteps(m).length) {
    H.push('<div class="card">');
    H.push('<div class="eyebrow">哪幾段會比你想的久　選填</div>');
    H.push(msStepLegend(m, flags, 'flag'));
    H.push('</div>');
  }

  H.push('<div class="row">');
  H.push(btn('我承諾 ' + est + ' 天', 'commit:' + m.msId, 'big'));
  H.push(btn('回廊道', 'go:home', 'ghost'));
  H.push('</div>');
  return H.join('');
};

/* ---------- 交出去 ---------- */
/* 交出去那一頁退休了：兩問搬進戰鬥（見 67-battle.js），
   那張選填的日子表搬到封存——它決定的是石片長什麼樣子。 */

/* ---------- 判定結果 ---------- */
PAGES.stamp = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var s = RULES.STAMPS[r.stamp];

  var t = myTeam();
  /* 剛走完的那一層。判定當下深度就 +1 了，所以要退一格。 */
  var zone = strataAt(Math.max(0, depthOf(t.teamId) - 1), t.teamId);
  var mob = mobOfRun(r);

  /* 戲在戰鬥那一頁演完了，這裡只留報告。
     再演一次是重複，而且那一層閃光在動畫被凍住的時候會蓋成一片白。 */
  var H = [];
  H.push('<div class="stamp-card ' + r.stamp + '">');
  H.push('<div class="stamp-mark">' + stampPx(s.key) + '</div>');
  H.push('<h1>' + esc(s.name) + '</h1>');
  H.push('<dl class="rep">');
  H.push('<dt>你說</dt><dd>' + r.est + '</dd>');
  H.push('<dt>實際</dt><dd>' + r.actual + '</dd>');
  H.push('<dt>差</dt><dd>' + (r.actual - r.est > 0 ? '+' : '') +
    (r.actual - r.est) + '</dd>');

  /* 承諾的時候標的那幾段，跟實際比較久的那幾段，對到幾個。
     兩份資料本來就都在（flags 與 overs），只是從來沒有比對過。
     沒標過就整行不出現。 */
  var fl = r.flags || [];
  if (fl.length) {
    var hit = 0;
    fl.forEach(function (i) { if ((r.overs || []).indexOf(i) >= 0) hit++; });
    H.push('<dt>標對的段</dt><dd>' + hit + '/ ' + fl.length + '</dd>');
  }
  var ov = (r.overs || []).map(function (i) { return stepName(r.runId, i); })
    .filter(Boolean);
  H.push('<dt>上之前你說</dt><dd class="s">' +
    (ov.length ? esc(ov.join('、')) + ' 比想的久' : '都差不多') + '</dd>');
  if (r.hard) H.push('<dt>卡在哪裡</dt><dd class="s">' + esc(r.hard) + '</dd>');
  if (r.pace) H.push('<dt>你覺得的進度</dt><dd class="s">' + esc(r.pace) + '</dd>');
  H.push('</dl>');
  H.push(estBar(r.est, r.actual, false));
  H.push('</div>');

  H.push('<p class="duel-t">' + esc(mob.n) + '讓開了。</p>');

  /* 圖鑑接回主流程。它是全系統內容量最大的一塊，而主流程從來沒提過它——
     打敗一隻之後這裡說一句，是唯一一個「剛好會想去看」的時刻。 */
  H.push('<p class="dim">' + esc(mob.n) + ' 在圖鑑裡。' +
    '<a class="plain" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'go:codex' })) + '\'>去看看</a></p>');
  H.push(btn('好', 'skipcamp:' + r.runId, 'big'));
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

   走完一趟，那一趟的紀錄長成一根石片。形狀完全由那一趟決定：
   一天兩列，來過是實心、說了沒動是空心、沒有紀錄是斷的，
   長度就是這一趟過了幾天。

   這一頁真正給他的東西是「他沒見過的那個形狀」——同一份數字，
   換成一個看得到的樣子。取名選填，他不取一樣封存得下來。 */
PAGES.pick = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var t = myTeam();
  var m = msOf(r.msId);
  /* 剛走完的那一層。 */
  var z = strataAt(Math.max(0, depthOf(t.teamId) - 1), t.teamId);
  var s = runShape(r.runId);

  var H = [head('封存', m.title, '這一趟長成這個樣子。')];

  if (r.word) {
    H.push('<div class="card"><div class="eyebrow">老師說</div>' +
           '<p class="quote">' + nl(r.word) + '</p></div>');
  }

  /* 這一趟的數字。本來這裡還畫一根石片——石片跟記號一樣一趟一個，
     兩個都放就是重複，所以石片併進記號了：那個形狀現在是點開記號
     才看到的東西，不是另一個要學的名詞。 */
  H.push('<div class="card fa ' + z.key + ' coreview">');
  H.push('<div class="eyebrow">' + esc(z.name) + '</div>');
  H.push('<div class="log-num">說 <b>' + s.est + '</b> 天　·　過了 <b>' +
    s.elapsed + '</b> 天</div>');
  H.push('</div>');


  /* 這幾天你動過哪幾天。

     每天要按的那一版拿掉之後，這一份資料本來就會不見。改成在這裡一次
     補齊：一張那幾天的格子，點一下標起來。選填——不標一樣交得出去，
     而且它不進判定（判定只看承諾幾天與行事曆過了幾天）。

     它唯一影響的是那一趟長成什麼樣子的石片。 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">這幾天你動過哪幾天　選填</div>');
  H.push(dayGrid(r.runId));
  H.push('<p class="dim">不影響判定。它決定的是封存起來長什麼樣子。</p>');
  H.push('</div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">給這一趟取個名字　選填</div>');
  H.push('<div class="rn-row">');
  H.push('<input id="cname" value="' + esc(draft('cName', '')) + '" oninput="DRAFT[\'cName\']=this.value" maxlength="16" placeholder="' +
    esc('例：訪談那一週') + '">');
  H.push('</div>');
  H.push('</div>');

  /* 留記號本來在全班地下城那一頁，要切分頁才做得到——
     那是同一個時刻被切成兩半。收進來，這一頁就是一次完整的儀式。 */
  /* 插下去那一下敲開的東西就出現在下面。 */
  H.push(uncoverCard(t));
  H.push(buildPick(t));

  H.push(btn('封存', 'seal:' + r.runId, 'big'));
  return H.join('');
};
/* 選方向那張小地圖拿掉了：占地那一下改在全班那張圖上做。
   地圖是動手的地方，不是一個看的頁面。 */

/* ---------- 大躍進 ---------- */
/* 大躍進那一頁退休了：「石頭變了」搬到全班地下城（那才是新的一層
   實際發生的地方），其餘只是一句「去看看那一層」。 */

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

  /* 離場的演出。角色沿著那道光往上走出畫面。

     這是一學期的終點，比任何一次交出去都重——而交出去有一整場戰鬥，
     出去本來只是換一頁。

     動畫只加東西不當閘門：時鐘被凍住的時候人停在井底，還是看得見。 */
  if (out) H.push(exitScene(t));

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
  H.push('<div><b>' + e.keeps.length + '</b><span>留下的記號</span></div>');
  /* 走了幾圈。exitRecord 一直算著它，但那一頁從來沒畫出來——
     無盡輪迴的設定在終點最該被說一次。 */
  if (e.cycles) H.push('<div><b>' + e.cycles + '</b><span>走過的輪迴</span></div>');
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

  /* 帶出去的那一排石片。二十根排在一起，就是一個學期的形狀。 */
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
    H.push('<p class="dim">老師確認之後你就出去了。</p>');
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
/* 紀錄那一頁併進任務清單了：兩頁幾乎是同一份資料。
   下面那一支 logRow 留著——任務清單在用。 */
/* 一列一趟。牠在最左邊，資訊在右邊，點開才看細節。 */
function logRow(m, r, t) {
  if (!m) return '';
  var open = DRAFT.lg === r.runId;
  var z = STRATA[0];
  STRATA.forEach(function (q) { if (q.key === r.zone) z = q; });
  var mob = mobOfRun(r);
  var s = r.stamp ? RULES.STAMPS[r.stamp] : null;
  var kp = null;
  keepsOf(t.teamId).forEach(function (k) { if (k.runId === r.runId) kp = k; });

  /* 老師回的話優先；沒有的話放自己封存時取的名字。
     兩個都沒有就不放——不要用一句系統寫的話把位置填滿。 */
  var line = r.word ? r.word : (kp && kp.name ? '「' + kp.name + '」' : '');

  /* 用 div 不用 button：<button> 上的 grid／flex 在 Chromium 不完整生效
     ——內容會被包進一個匿名區塊，第一個子元素因此被收縮成內容寬，
     標題就變成一個字一行。role 與 tabindex 補回鍵盤與輔助工具。 */
  var H = ['<div role="button" tabindex="0" class="rec' + (open ? ' open' : '') + '" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'lgopen:' + r.runId })) + '\'>'];

  /* 直接排在格線上，不要再包一層。<button> 裡面包巢狀區塊的時候，
     第一個子元素會被收縮成內容寬（標題變成一個字一行）。 */
  H.push('<span class="rec-px">' + pxTag(mob.px, z.pal, '') + '</span>');
  H.push('<b class="rec-t">' + esc(m.title) + '</b>');
  H.push('<span class="rec-d">' + esc(dayText(r.committedAt)) +
    (r.submittedAt ? ' – ' + esc(dayText(r.submittedAt)) : '') + '</span>');
  H.push('<span class="rec-w">' + (line ? esc(line) : '') + '</span>');

  H.push('<span class="rec-s' + (r.stamp ? ' ' + r.stamp : ' none') + '">' +
    (s ? stampPx(s.key) : '') + '</span>');
  H.push('</div>');

  /* 點開才出現的細節。收起來的時候整列兩秒看得完。 */
  if (open) {
    H.push('<div class="rec-more">');
    if (r.stamp) {
      H.push(estBar(r.est, r.actual, false));
      H.push(dayStrip(t.teamId, r.runId));
    } else {
      H.push('<p class="dim">這一趟重新想過。說 ' + r.est + ' 天，走了 ' +
        (r.went || 0) + ' 天之後退回去重新說。</p>');
    }
    var sp = stepsOf(r.runId);
    if (sp) {
      H.push('<div class="tags small"><span class="k">老師分的段</span>');
      sp.all.forEach(function (q, i) {
        H.push('<span class="tag static' + (sp.on.indexOf(i) >= 0 ? ' hit' : '') +
          '">' + esc(q) + '</span>');
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
    if (r.hard) H.push('<p class="quote"><b>卡在哪裡</b>' + nl(r.hard) + '</p>');
    if (r.pace) H.push('<p class="quote"><b>你覺得的進度</b>' + nl(r.pace) + '</p>');
    if (r.word) H.push('<p class="quote tw">' + nl(r.word) + '</p>');
    H.push('</div>');
  }
  return H.join('');
}

/* 點開／收起來。一次只開一列。 */
ACTS.lgopen = function (id) {
  DRAFT.lg = DRAFT.lg === id ? null : id;
  render();
};

/* ---------- 這一圈走到哪 ----------

   死線勇者的迴圈是四拍，而且它一直讓你知道現在是哪一拍。
   這裡四拍是：準備（說幾天）→ 遠征（去做事，不用開）→ 戰報（交出去、
   看判定）→ 營地（封存、打通、蓋一座）。

   畫成環不是條：這座地下城是無盡輪迴的，四拍走完回到第一拍。
   所以它沒有百分比、沒有終點，也不可以有。 */
var BEATS = [
  { k: 'prep', n: '準備', s: '說幾天' },
  { k: 'away', n: '遠征', s: '去做事' },
  { k: 'rep',  n: '戰報', s: '交出去' },
  { k: 'camp', n: '營地', s: '封存·留記號' }
];

function beatAt(next, t) {
  var k = next.kind;
  if (k === 'doing') return 'away';
  if (k === 'submit' || k === 'stamped' || k === 'review') return 'rep';
  if (k === 'gear' || k === 'left' || k === 'waitexit') return 'camp';
  if (claimsOf(t.teamId) || DRAFT.build) return 'camp';
  return 'prep';
}

function beatBar(next, t) {
  var at = beatAt(next, t);
  var H = ['<div class="cyc">'];
  BEATS.forEach(function (s, i) {
    H.push('<span class="cy' + (s.k === at ? ' on' : '') + '">' +
      '<b>' + esc(s.n) + '</b><i>' + esc(s.s) + '</i></span>');
    if (i < BEATS.length - 1) H.push('<span class="cyd"></span>');
  });
  /* 最後接回第一拍。走完不是結束，是再一圈。 */
  H.push('<span class="cyd loop"></span>');
  H.push('</div>');
  return H.join('');
}