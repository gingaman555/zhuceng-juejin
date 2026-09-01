/* 學生端。

   一頁只給一個動作。首頁就是廊道本身——招牌、角色、迷霧、魔物，
   底下一排他們自己寫的東西。其餘都是資訊，不是選項。

   兩條原則，這一版收得比之前緊：

   一 · 系統不定義他們在做什麼。
        每天點的那幾件、承諾時標的那幾件、營火說的那幾件，全部來自
        同一份清單，而那份清單是那一組自己寫的（見 40-db.js 的 actSetActs）。
        沒寫的組也走得完：推進那一顆鍵退回「我今天來過了」。

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

  /* ── 他們自己那一份清單 ── */
  H.push(actsCard(t));

  /* ── 招牌 ── */
  var ns = nextSignIn(t.teamId);
  H.push('<div class="card">');
  H.push('<div class="eyebrow">招牌</div>');
  H.push('<div class="rn-row">');
  H.push('<input id="pj-name" value="' + esc(t.project || '') +
         '" placeholder="' + esc('這個專案叫什麼') + '">');
  H.push(btn('換字', 'rename', 'ghost'));
  H.push('</div>');
  H.push('<div class="sgline">');
  RULES.SIGN_TIERS.forEach(function (k, i) {
    var on = i <= RULES.signTierOf(depthOf(t.teamId));
    H.push('<span class="sg' + (on ? ' on' : '') + '">' +
      pxTag(SIGNS[k].px, SIGNS[k].pal, 'sign-s') +
      '<i>' + esc(SIGNS[k].name) + '</i></span>');
  });
  H.push('</div>');
  if (ns.need) {
    H.push('<div class="log-num">再 <b>' + ns.need + '</b> 趟換成「' + esc(ns.name) + '」</div>');
  }
  H.push('</div>');

  return H.join('');
};

/* nextThing 回的那個字，對到步驟條的第幾格。 */
var STEP_AT = {
  commit: 0,
  push: 1, waiting: 1, wake: 1,
  submit: 2, camp: 2, review: 2,
  gear: 3
};

/* 哪一組遇到哪一隻：任務 ＋ 組算出來，全班同一個里程碑不是同一隻 */
function mobFor(msId, teamId) {
  return MOBS[hash(msId + '|' + teamId) % MOBS.length];
}

/* 上一次自己留下的那一句 */
function lastKeep(teamId) {
  var ks = keepsOf(teamId);
  return ks.length ? ks[ks.length - 1] : null;
}

/* ---------- 他們自己那一份清單 ----------
   系統不替他們定義一個專案會做哪些事。這一張卡是整個系統裡
   唯一要打字的地方，而且只打一次。 */
function actsCard(t) {
  var acts = actsOf(t.teamId);
  var editing = DRAFT.acts != null || !acts.length;
  var H = ['<div class="card"' + (acts.length ? '' : ' id="setup"') + '>'];
  H.push('<div class="eyebrow">我們會做的事</div>');

  if (!editing) {
    H.push(actLegend(t.teamId, null, null));
    H.push(btn('改', 'editacts', 'ghost'));
    H.push('</div>');
    return H.join('');
  }

  H.push('<textarea id="acts" rows="6" placeholder="' +
    esc('一行一件\n訪談\n找案例\n畫草圖\n打樣\n剪片') + '">' +
    esc(DRAFT.acts != null ? DRAFT.acts
      : acts.map(function (a) { return a.label; }).join('\n')) + '</textarea>');
  H.push('<div class="log-num">最多 <b>' + RULES.ACTS_MAX + '</b> 件</div>');
  H.push(btn('記下來', 'setacts', ''));
  H.push('</div>');
  return H.join('');
}

/* ---------- 唯一的那一顆動作 ---------- */
function actionCard(t, next, st) {
  var H = ['<div class="act-card">'];
  var row = next.row;

  if (next.kind === 'wake') {
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

/* ---------- 今天動的是哪一件 ----------
   這一排就是推進鍵本身。點任何一件都算今天來過了，還是一下點擊。
   點的是他們自己寫的清單——系統不列選項。 */
function actRow(t, runId) {
  var acts = actsOf(t.teamId);
  if (!acts.length) {
    return '<div class="row">' + btn('我今天來過了', 'push:' + runId, 'big') +
      btn('先寫我們會做的事', 'editacts', 'ghost') + '</div>';
  }
  return actLegend(t.teamId, null, 'push:' + runId + '|');
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
  H.push('<h2>' + esc(word) + '動的是哪一件？</h2>');
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
  var acts = actsOf(t.teamId);

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

  if (acts.length) {
    H.push('<div class="card">');
    H.push('<div class="eyebrow">哪幾件會比你想的久　選填</div>');
    H.push(actLegend(t.teamId, flags, 'flag'));
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
  var zone = strataAt(depthOf(t.teamId));
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

  var H = ['<div class="stamp-card ' + r.stamp + '">'];
  H.push('<div class="stamp-mark">' + s.mark + '</div>');
  H.push('<h1>' + esc(s.name) + '</h1>');
  H.push(estBar(r.est, r.actual, false));
  H.push('</div>');

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
  var acts = actsOf(t.teamId);
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

  if (!acts.length) {
    H.push('<div class="card">');
    H.push('<div class="eyebrow">還沒有清單</div>');
    H.push(btn('先寫我們會做的事', 'go:home', 'ghost'));
    H.push('</div>');
  } else {
    H.push('<div class="card">');
    if (flags.length) {
      H.push('<div class="eyebrow">承諾時你標的</div>');
      H.push(actLegend(t.teamId, flags, null));
    }
    H.push(actLegend(t.teamId, picked, 'over'));
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
      pxTag(GEAR_PX[k.tro].px, strataAt(depthOf(t.teamId)).pal, 'kp-px') +
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
  var now2 = strataAt(d), was = strataAt(d - 1);
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
    var ov = (r.overs || []).map(function (id) { return actLabel(t.teamId, id); })
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
