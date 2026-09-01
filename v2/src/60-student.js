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
PAGES.home = function () {
  var t = myTeam();
  var next = nextThing(t.teamId);
  var st = stallOf(t.teamId);
  var acc = accuracyOf(t.teamId);

  var H = [];

  /* 三步，不是四步：中間那一段不用他開。 */
  H.push(stepBar([
    ['開始前', '你說要花幾天'],
    ['做完回來', '交出去，比對天數'],
    ['封存', '那一趟長成一根岩心']
  ], STEP_AT[next.kind] == null ? -1 : STEP_AT[next.kind]));

  /* ── 廊道本身。招牌、深度、魔物全在裡面（見 61-scene.js） ── */
  H.push(scene(t, next.row, st, next.kind));

  /* ── 今天要做的那一件。放在廊道正下面，而且是整頁最大聲的一張——
        本來它排在兩條尺跟分段清單後面，每一張卡看起來又都一樣重，
        所以打開之後第一眼看不出該按哪裡。 ── */
  H.push(actionCard(t, next, st));

  /* ── 這一趟的分段（老師有分才有） ── */
  if (next.row && next.row.run && next.row.run.runId) {
    H.push(stepCard(next.row.run.runId));
  }

  /* ── 這一趟的形狀。說幾天、過了幾天、來過幾天。 ── */
  if (next.row && next.row.run && next.row.run.runId) {
    var run = next.row.run;
    H.push('<div class="card quiet">');
    H.push('<div class="eyebrow">' + esc(next.row.ms.title) + '</div>');
    H.push(estBar(run.est, run.actual || run.pushes, run.state === 'running'));
    H.push(barKey());
    H.push(shapeLine(run.runId));
    H.push('</div>');
  }

  /* ── 走過的每一趟 ── */
  if (acc.total) {
    H.push('<div class="card quiet">');
    H.push('<div class="eyebrow">走過 ' + acc.total + ' 趟</div>');
    H.push(accBar(acc));
    H.push('</div>');
  }

  /* ── 上一趟長成什麼樣子 ──
     掛在他自己看得到的地方，不是躺在一個道具欄裡。 */
  var keep = lastKeep(t.teamId);
  if (keep) {
    var kz = STRATA[0];
    STRATA.forEach(function (x) { if (x.key === keep.zone) kz = x; });
    H.push('<div class="card quiet">');
    H.push('<div class="eyebrow">上一趟</div>');
    H.push('<div class="rk row-rk">');
    H.push(pxTag(keep.px || coreOf(keep.runId), kz.pal, 'core'));
    H.push('<div><b>' + esc(keep.name || '（沒取名）') + '</b>');
    H.push('<span>' + (keep.elapsed || 0) + ' 天　·　來過 ' + (keep.moved || 0) + '</span></div>');
    H.push('</div>');
    H.push(btn('看岩心架', 'go:pack', 'ghost'));
    H.push('</div>');
  }


  /* ── 底下那一張：招牌與出口 ──
     兩件都是偶爾才動的事，放同一張安靜的卡，不要跟今天要做的事搶。 */
  if (!t.leftAt) H.push(exitCard(t));

  /* ── 招牌 ──
     它只有一個用途：廊道口掛的是誰。本來還有三階材質（走得越深牌子
     越好），拿掉了——深度已經不是進度了，留著一個「越多越好」的漸層
     跟其他每一條規則都打架。名字是他們自己寫的，這才是招牌的意義。 */
  H.push('<div class="card quiet">');
  H.push('<div class="eyebrow">廊道口掛的</div>');
  H.push('<div class="rn-row">');
  H.push('<input id="pj-name" value="' + esc(t.project || '') +
         '" placeholder="' + esc('這個專案叫什麼') + '">');
  H.push(btn('換字', 'rename', 'ghost'));
  H.push('</div>');
  H.push('</div>');

  return H.join('');
};

/* 承諾那一頁還沒有 run，所以直接從里程碑上讀那幾段。 */
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

/* ---------- 老師分的段 ----------
   他有分才畫。勾一段跟每天推進是兩件事：推進是「今天我來過」，
   勾是「這一段做完了」。兩件事都不影響判定。 */
function stepCard(runId) {
  var s = stepsOf(runId);
  if (!s) return '';
  var H = ['<div class="card">'];
  H.push('<div class="eyebrow">老師分的段　' + s.on.length + ' / ' + s.all.length + '</div>');
  H.push('<div class="steps-list">');
  s.all.forEach(function (x, i) {
    var on = s.on.indexOf(i) >= 0;
    H.push('<button class="stp' + (on ? ' on' : '') + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'tick:' + runId + '|' + i })) + '\'>' +
      '<b></b><i>' + esc(x) + '</i></button>');
  });
  H.push('</div></div>');
  return H.join('');
}

/* ---------- 出口 ----------
   往下走不出去，六層一直循環。唯一的出口是把手上這個專案做完，
   而那件事只有他們自己知道——所以是他們宣告，老師確認。 */
function exitCard(t) {
  var H = ['<div class="card exitc">'];
  H.push('<div class="eyebrow">出口</div>');
  if (t.exitAsk) {
    H.push('<h2>你說這個專案做完了。</h2>');
    H.push('<p class="lead">在等老師確認。</p>');
    H.push(btn('還沒，收回', 'cancelexit', 'ghost'));
  } else {
    H.push('<h2>這個專案做完了。</h2>');
    H.push(btn('去出口', 'go:exit', 'ghost'));
  }
  H.push('</div>');
  return H.join('');
}

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
function actionCard(t, next, st) {
  var H = ['<div class="act-card">'];
  var row = next.row;

  if (next.kind === 'left') {
    H.push('<div class="eyebrow">你出去了</div>');
    H.push('<h2>' + (t.exitWord ? '' : '地面。') + '</h2>');
    if (t.exitWord) H.push('<p class="quote">' + nl(t.exitWord) + '</p>');
    H.push(btn('看你帶出來的', 'go:exit', 'big'));

  } else if (next.kind === 'waitexit') {
    H.push('<div class="eyebrow">出口</div>');
    H.push('<h2>在等老師確認。</h2>');
    H.push(btn('還沒，收回', 'cancelexit', 'ghost'));

  } else if (next.kind === 'commit') {
    H.push('<div class="eyebrow">新的里程碑</div>');
    H.push('<h2>' + esc(row.ms.title) + '</h2>');
    if (row.ms.note) H.push('<p class="lead">' + nl(row.ms.note) + '</p>');
    H.push(btn('決定天數', 'go:commit:' + row.ms.msId, 'big'));

  } else if (next.kind === 'doing') {
    H.push(doingCard(t, row, st));

  } else if (next.kind === 'camp') {
    H.push('<div class="eyebrow">營火</div>');
    H.push('<h2>' + row.run.actual + ' 天，比你說的 ' + row.run.est + ' 天久。</h2>');
    H.push(btn('去營火旁', 'go:camp:' + row.run.runId, 'big'));

  } else if (next.kind === 'gear') {
    H.push('<div class="eyebrow">老師看完了</div>');
    H.push('<h2>這一趟長成什麼樣子。</h2>');
    if (row.run.word) H.push('<p class="quote">' + nl(row.run.word) + '</p>');
    H.push(btn('去看', 'gear:' + row.run.runId, 'big'));

  } else if (next.kind === 'review') {
    H.push('<div class="eyebrow">在老師那邊</div>');
    H.push('<h2>他還沒看。</h2>');

  } else {
    H.push('<div class="eyebrow">廊道很安靜</div>');
    H.push('<h2>目前沒有等你做的。</h2>');
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
  var gone = daysBetween(r.committedAt, now()) + 1;
  var H = [];
  H.push('<div class="eyebrow">正在做　·　' + esc(row.ms.title) + '</div>');
  if (st && st.level) {
    H.push('<h2>' + esc(RULES.stallSay(st.level, st.days)) + '</h2>');
  } else {
    H.push('<h2>你說 ' + r.est + ' 天。今天是第 ' + gone + ' 天。</h2>');
  }
  H.push(btn('做完了，交出去', 'go:submit:' + r.runId, 'big'));
  H.push('<p class="dim">中間不用來。做完再回來就好。</p>');
  return H.join('');
}

/* ---------- 場景底下那一行 ---------- */
function sceneCap(t, next, st) { return ''; }

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

  H.push(btn('回廊道', 'go:home', 'big'));
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
  var H = [head('紀錄', '走過的每一趟', '')];
  if (!rows.length) return H.join('') + '<div class="card dim">還沒有走完的里程碑。</div>';

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
