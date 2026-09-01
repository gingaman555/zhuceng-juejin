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

  H.push(stepBar([
    ['接任務', '你決定花幾天'],
    ['每天推進', '動過就按一下'],
    ['交出去', '比對你承諾的天數'],
    ['留一件', '這一趟留下哪一件']
  ], STEP_AT[next.kind] == null ? -1 : STEP_AT[next.kind]));

  /* ── 廊道本身。招牌、深度、魔物全在裡面（見 61-scene.js） ── */
  H.push(scene(t, next.row, st));

  /* ── 承諾與走到哪，畫成兩條尺 ── */
  if (next.row && next.row.run && next.row.run.runId) {
    var run = next.row.run;
    H.push('<div class="card">');
    H.push('<div class="eyebrow">' + esc(next.row.ms.title) + '</div>');
    H.push(estBar(run.est, run.pushes, run.state === 'running'));
    H.push('</div>');
  }

  /* ── 這一趟的分段（老師有分才有） ── */
  if (next.row && next.row.run && next.row.run.runId) {
    H.push(stepCard(next.row.run.runId));
  }

  /* ── 唯一的動作 ── */
  H.push(actionCard(t, next, st));

  /* ── 走過的每一趟 ── */
  if (acc.total) {
    H.push('<div class="card">');
    H.push('<div class="eyebrow">走過 ' + acc.total + ' 趟</div>');
    H.push(accBar(acc));
    H.push('</div>');
  }

  /* ── 上一趟自己留下的那一句 ── */
  var keep = lastKeep(t.teamId);
  if (keep) {
    H.push('<div class="card carry">');
    H.push('<div class="eyebrow">上一趟你留下的</div>');
    H.push('<p class="quote">' + esc(keep.line) + '</p>');
    H.push(btn('看留下的', 'go:pack', 'ghost'));
    H.push('</div>');
  }


  /* ── 出口 ──
     放在最底下，而且不是那顆大的：宣告結案是想清楚才做的事，
     不是順手點到的。 */
  if (!t.leftAt) H.push(exitCard(t));

  /* ── 招牌 ──
     它只有一個用途：廊道口掛的是誰。本來還有三階材質（走得越深牌子
     越好），拿掉了——深度已經不是進度了，留著一個「越多越好」的漸層
     跟其他每一條規則都打架。名字是他們自己寫的，這才是招牌的意義。 */
  H.push('<div class="card">');
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
  push: 1, waiting: 1, wake: 1,
  submit: 2, camp: 2, review: 2,
  gear: 3
};

/* 擋在廊道盡頭的那一隻。

   這裡本來是從全部四十隻裡挑，跟你在多深的地方無關——那條線是斷的。
   現在牠來自你所在那一層的住民：走到 160 公尺，擋你的就是住在水晶
   迴廊的東西。生物跟系統的連接就是這一條，而且是雙向的——
   你在剖面圖的岩壁上看到的那幾隻，就是你下一趟可能遇到的那幾隻。

   哪一隻仍然是任務 ＋ 組算出來的，所以全班同一個里程碑不是同一隻。 */
function mobFor(msId, teamId) {
  var f = faunaOf(strataAt(depthOf(teamId), teamId).key);
  if (!f.length) f = allFauna();
  return f[hash(msId + '|' + teamId) % f.length];
}

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

  } else if (next.kind === 'wake') {
    H.push('<div class="eyebrow">' + esc(WORLD.light[st.level].label) + '　·　' +
      st.days + ' 天</div>');
    H.push('<h2>' + (st.level === 2 ? '牠睡著了。' : '藤蔓爬上來了。') + '</h2>');
    H.push(actRow(t, row.run.runId));

  } else if (next.kind === 'commit') {
    H.push('<div class="eyebrow">新的里程碑</div>');
    H.push('<h2>' + esc(row.ms.title) + '</h2>');
    if (row.ms.note) H.push('<p class="lead">' + nl(row.ms.note) + '</p>');
    H.push(btn('決定天數', 'go:commit:' + row.ms.msId, 'big'));

  } else if (next.kind === 'push') {
    H.push(doingCard(t, row, '今天'));

  } else if (next.kind === 'submit') {
    H.push('<div class="eyebrow">走到底了</div>');
    H.push('<h2>' + esc(row.ms.title) + '</h2>');
    H.push(btn('我交出去了', 'go:submit:' + row.run.runId, 'big'));

  } else if (next.kind === 'camp') {
    H.push('<div class="eyebrow">營火</div>');
    H.push('<h2>' + row.run.actual + ' 天，比你說的 ' + row.run.est + ' 天久。</h2>');
    H.push(btn('去營火旁', 'go:camp:' + row.run.runId, 'big'));

  } else if (next.kind === 'gear') {
    H.push('<div class="eyebrow">老師看完了</div>');
    H.push('<h2>這一趟留下哪一件。</h2>');
    if (row.run.word) H.push('<p class="quote">' + nl(row.run.word) + '</p>');
    H.push(btn('去看', 'gear:' + row.run.runId, 'big'));

  } else if (next.kind === 'waiting') {
    var open2 = openDays(t.teamId, row.run.runId);
    H.push('<div class="eyebrow">今天那一盞點好了</div>');
    H.push('<h2>' + (open2.length ? '還有沒點的那幾盞。' : '明天再來一次。') + '</h2>');
    if (open2.length) H.push(backRow(open2));
    if (DRAFT.back) H.push(actRow(t, row.run.runId));
    H.push(btn('提早做完了，現在就交', 'go:submit:' + row.run.runId, 'ghost'));

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

/* ---------- 今天動的是哪一段 ----------
   這一排就是推進鍵本身。點任何一段都算今天來過了，還是一下點擊。
   點的是老師分的段——系統不列選項，也不用任何人先做設定。
   老師沒分段就退回一顆鍵，一樣走得完。 */
function actRow(t, runId) {
  if (!stepNames(runId).length) {
    return btn('我今天來過了', 'push:' + runId, 'big');
  }
  return stepLegend(runId, null, 'push:' + runId + '|');
}

/* 補登。忘一天就再也補不回來的話，人會把整條廊道一起放掉。 */
function backRow(open) {
  var H = ['<div class="tags"><span class="k">忘了按</span>'];
  open.forEach(function (o) {
    H.push('<button class="tag' + (Number(DRAFT.back) === o.back ? ' on' : '') +
      '" data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'back:' + o.back })) +
      '\'>' + esc(o.label) + '</button>');
  });
  if (DRAFT.back) {
    H.push('<button class="tag" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'back:0' })) + '\'>算了</button>');
  }
  H.push('</div>');
  return H.join('');
}

function doingCard(t, row, whenWord) {
  var open = openDays(t.teamId, row.run.runId);
  var b = Number(DRAFT.back || 0);
  var word = b ? (b === 1 ? '昨天' : '前天') : whenWord;
  var H = [];
  H.push('<div class="eyebrow">' + esc(word) + '　·　' + esc(row.ms.title) + '</div>');
  H.push('<h2>' + esc(word) + '動的是哪一段？</h2>');
  H.push(actRow(t, row.run.runId));
  if (open.length) H.push(backRow(open));
  H.push(btn('提早做完了，現在就交', 'go:submit:' + row.run.runId, 'ghost'));
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

  /* 上一趟自己留下的那一句。這是他寫給這一刻的自己看的。 */
  var keep = lastKeep(t.teamId);
  if (keep) {
    H.push('<div class="card carry"><div class="eyebrow">上一趟你留下的</div>' +
      '<p class="quote">' + esc(keep.line) + '</p></div>');
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
  var mob = mobFor(r.msId, t.teamId);
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
  var mob = mobFor(r.msId, t.teamId);

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

/* ---------- 這一趟留下哪一件 ----------
   三張是這一趟真的發生的三件事，用他們自己的詞。
   每一張只陳述，沒有一張說「所以下一次應該……」。 */
PAGES.pick = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var t = myTeam();
  var m = msOf(r.msId);

  var H = [head('留一件', m.title, '')];

  if (r.word) {
    H.push('<div class="card"><div class="eyebrow">老師說</div>' +
           '<p class="quote">' + nl(r.word) + '</p></div>');
  }

  H.push('<div class="card"><div class="gear-pick">');
  keepOffers(r.runId).forEach(function (o) {
    var k = RULES.keepOf(o.key);
    H.push('<button class="gcard" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'take:' + r.runId + '|' + o.key })) + '\'>' +
      pxTag(GEAR_PX[k.tro].px, strataAt(depthOf(t.teamId), t.teamId).pal, 'kp-px') +
      '<span class="ke">' + esc(k.eyebrow) + '</span>' +
      '<i>' + esc(o.line) + '</i></button>');
  });
  H.push('</div></div>');
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
  if (keep) H.push('<p class="quote">' + esc(keep.line) + '</p>');
  if (r.word) H.push('<p class="lead">' + nl(r.word) + '</p>');
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
  H.push('<div><b>' + e.keeps.length + '</b><span>留下的話</span></div>');
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

  /* 留下的那幾句 */
  if (e.keeps.length) {
    H.push('<div class="card"><div class="eyebrow">你留下的</div>');
    e.keeps.slice().reverse().forEach(function (k) {
      H.push('<p class="quote">' + esc(k.line) + '</p>');
    });
    H.push('</div>');
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
    if (kp) H.push('<p class="quote">' + esc(kp.line) + '</p>');
    if (r.word) H.push('<p class="quote tw">' + nl(r.word) + '</p>');
    H.push('</div>');
  });
  return H.join('');
};
