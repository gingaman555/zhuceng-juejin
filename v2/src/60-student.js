/* 學生端。

   一頁只給一個動作。首頁就是坑道本身——招牌、角色、迷霧走廊、魔物，
   底下一顆巨大的推進鍵。其餘都是資訊，不是選項。

   零輸入框：天數用滑桿，風險與卡關用圖示標籤。要打字的東西沒有人會寫，
   而且打字會把防衛心叫起來。 */

/* ---------- 坑道（首頁） ---------- */
PAGES.home = function () {
  var t = myTeam();
  var next = nextThing(t.teamId);
  var st = stallOf(t.teamId);
  var sign = signOf(t.teamId);
  var depth = depthOf(t.teamId);
  var acc = accuracyOf(t.teamId);
  var light = WORLD.light[st.level];

  var H = [];

  /* ── 坑道口：招牌 ── */
  H.push('<div class="tunnel ' + light.key + '">');
  H.push('<div class="tunnel-top">');
  H.push(pxTag(sign.px, sign.pal, 'sign'));
  H.push('<div class="sign-txt"><b>' + esc(t.project || '（還沒定）') + '</b>' +
         '<span>' + esc(sign.name) + '　·　' + esc(sign.note) + '</span></div>');
  H.push('<div class="depth"><span>深度</span><b>' + (depth * WORLD.depthPerMilestone) + ' m</b>' +
         '<span>走完 ' + depth + ' 個里程碑</span></div>');
  H.push('</div>');

  /* ── 走廊 ── */
  H.push(corridor(t, next, st));
  H.push('</div>');

  /* ── 唯一的動作 ── */
  H.push(actionCard(t, next, st));

  /* ── 我的預估體感 ── */
  if (acc.total) {
    H.push('<div class="card">');
    H.push('<div class="eyebrow">你對自己的預估</div>');
    H.push('<div class="acc">');
    ['exact', 'early', 'late'].forEach(function (k) {
      var s = RULES.STAMPS[k];
      H.push('<div class="acc-c"><b>' + s.mark + '</b><i>' + acc[k] + '</i><span>' + s.name + '</span></div>');
    });
    H.push('</div>');
    H.push('<p class="dim">' + esc(accSay(acc)) + '</p>');
    H.push('</div>');
  }

  /* ── 裝備架 ── */
  var gs = gearsOf(t.teamId);
  if (gs.length) {
    H.push('<div class="card"><div class="eyebrow">老師給過的</div><div class="gear-row">');
    gs.forEach(function (g) {
      var d = RULES.gearOf(g.key);
      if (d) H.push('<span class="gear" title="' + esc(d.why) + '">' + d.icon + '<i>' + esc(d.name) + '</i></span>');
    });
    H.push('</div></div>');
  }

  return H.join('');
};

/* 準度的一句話。從數字組出來，不是寫死的。 */
function accSay(a) {
  if (!a.total) return '';
  if (a.late === 0 && a.total >= 2) return '你到目前為止沒有失準過。這比做得快更難。';
  if (a.late > a.exact) return '多數時候你把事情想得比實際簡單。下一次試著往上加幾天。';
  if (a.early > a.exact) return '你常常比自己承諾的早完成——可能是把事情想得太難了。';
  return '準的次數最多。你的時間體感正在成形。';
}

/* ---------- 迷霧走廊 ----------
   長度＝承諾的天數。推進一次前進一格。走過的格子霧散了，沒走的還蓋著。 */
function corridor(t, next, st) {
  var row = next.row;
  if (!row || !row.run.runId) {
    return '<div class="corr empty">霧還沒散開。老師派了新的里程碑，' +
           '先決定你要花幾天。</div>';
  }
  var run = row.run, est = run.est || 1;
  var at = run.pushes;
  var H = ['<div class="corr">'];

  /* 角色 */
  var pose = st.level >= 2 ? HERO.sleep : (next.kind === 'push' ? HERO.idle : HERO.idle);
  H.push('<div class="hero">' + pxTag(pose, HERO.pal, 'ch') +
         (st.level === 1 ? pxTag(VINE.px, VINE.pal, 'vine') : '') + '</div>');

  /* 格子 */
  H.push('<div class="cells">');
  for (var i = 0; i < est; i++) {
    var on = i < at;
    H.push('<span class="cell' + (on ? ' on' : '') + (i === at ? ' here' : '') + '"></span>');
  }
  H.push('</div>');

  /* 魔物 */
  var mob = mobFor(row.ms.msId, t.teamId);
  var pal = DEPTH_PAL[Math.min(3, depthOf(t.teamId))];
  H.push('<div class="mob">' + pxTag(mob.px, pal, 'ch') +
         '<span>' + esc(mob.n) + '</span></div>');
  H.push('</div>');

  H.push('<div class="corr-note">' +
    esc(row.ms.title) + '　·　你承諾 ' + est + ' 天，已推進 ' + at + ' 天' +
    '</div>');
  return H.join('');
}

/* 哪一組遇到哪一隻：任務 ＋ 組算出來，全班同一個里程碑不是同一隻 */
function mobFor(msId, teamId) {
  return MOBS[hash(msId + '|' + teamId) % MOBS.length];
}

/* ---------- 唯一的那一顆動作 ---------- */
function actionCard(t, next, st) {
  var H = ['<div class="act-card">'];
  var row = next.row;

  if (next.kind === 'wake') {
    H.push('<div class="eyebrow">' + esc(WORLD.light[st.level].label) + '</div>');
    H.push('<h2>' + esc(RULES.stallSay(st.level, st.days)) + '</h2>');
    H.push('<p class="dim">這裡只是把「停下來了」畫出來，沒有別的後果。' +
           '推一下就回來了。</p>');
    H.push(btn('推進', 'push:' + row.run.runId, 'big'));

  } else if (next.kind === 'commit') {
    H.push('<div class="eyebrow">新的里程碑</div>');
    H.push('<h2>' + esc(row.ms.title) + '</h2>');
    if (row.ms.note) H.push('<p class="dim">' + nl(row.ms.note) + '</p>');
    H.push('<p class="lead">你打算花幾天？這是你對自己的承諾，老師不會替你決定。</p>');
    H.push(btn('決定天數', 'go:commit:' + row.ms.msId, 'big'));

  } else if (next.kind === 'push') {
    H.push('<div class="eyebrow">今天</div>');
    H.push('<h2>推進一格。</h2>');
    H.push('<p class="dim">不用交東西，也不用寫字。按下去就算今天動過了——' +
           '重點是不要停，不是一次做完。</p>');
    H.push('<div class="row">');
    H.push(btn('推進', 'push:' + row.run.runId, 'big'));
    H.push(btn('提早做完了', 'go:submit:' + row.run.runId, 'ghost'));
    H.push('</div>');

  } else if (next.kind === 'submit') {
    H.push('<div class="eyebrow">走到終點了</div>');
    H.push('<h2>' + esc(row.ms.title) + '</h2>');
    H.push('<p class="dim">把作業交到老師原本收的地方，然後在這裡按一下。' +
           '系統會比對你當初承諾的天數。</p>');
    H.push(btn('我交出去了', 'go:submit:' + row.run.runId, 'big'));

  } else if (next.kind === 'camp') {
    H.push('<div class="eyebrow">營火</div>');
    H.push('<h2>比你承諾的久。</h2>');
    H.push('<p class="dim">先坐下來。說出卡在哪不會扣任何東西——' +
           '講得清楚的困難，老師才幫得上忙。</p>');
    H.push(btn('去營火旁', 'go:camp:' + row.run.runId, 'big'));

  } else if (next.kind === 'gear') {
    var g = RULES.gearOf(row.run.gear);
    H.push('<div class="eyebrow">老師給了你一件東西</div>');
    H.push('<h2>' + (g ? g.icon + ' ' + esc(g.name) : '裝備') + '</h2>');
    if (row.run.word) H.push('<p class="quote">' + nl(row.run.word) + '</p>');
    H.push(btn('接下', 'gear:' + row.run.runId, 'big'));

  } else if (next.kind === 'waiting') {
    H.push('<div class="eyebrow">今天推過了</div>');
    H.push('<h2>明天再來一次。</h2>');
    H.push('<p class="dim">一天一格。推進是每天的打卡，不是工作的單位——' +
           '真的做完了是你說了算，隨時交得出去。</p>');
    H.push(btn('提早做完了，現在就交', 'go:submit:' + row.run.runId, 'ghost'));

  } else if (next.kind === 'review') {
    H.push('<div class="eyebrow">在老師那邊</div>');
    H.push('<h2>他還沒看。</h2>');
    H.push('<p class="dim">他看的順序是照等最久的排，不是先交先看。</p>');

  } else {
    H.push('<div class="eyebrow">坑道很安靜</div>');
    H.push('<h2>目前沒有等你做的。</h2>');
    H.push('<p class="dim">老師隨時可能派新的里程碑。</p>');
  }

  H.push('</div>');
  return H.join('');
}

/* ---------- 承諾：滑桿 ＋ 風險標籤 ---------- */
PAGES.commit = function () {
  var t = myTeam();
  var m = msOf(S.p.id);
  if (!m) return '<div class="card">找不到這一個里程碑。</div>';
  var est = Number(draft('est', RULES.EST_DEFAULT));
  var risks = DRAFT.risks || [];

  var H = [head('自我承諾', m.title, m.note)];

  H.push('<div class="card">');
  H.push('<div class="eyebrow">你打算花幾天</div>');
  H.push('<div class="slider-wrap">');
  H.push('<input type="range" class="slider" id="est" min="' + RULES.EST_MIN +
         '" max="' + RULES.EST_MAX + '" value="' + est +
         '" oninput="ACTS.est(this.value)">');
  H.push('<div class="slider-read"><b>' + est + '</b><span>天</span></div>');
  H.push('</div>');
  H.push('<p class="dim">這個數字是你自己說的。誤差 ' + RULES.band(est) +
         ' 天以內都算準——' + Math.round(RULES.BAND_RATIO * 100) + '％ 的容許範圍。</p>');
  H.push('</div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">你覺得會卡在哪　選填</div>');
  H.push('<p class="dim">先標起來。事後對照——標對了就是預見能力，那比準時更值錢。</p>');
  H.push('<div class="tags">');
  RULES.RISKS.forEach(function (r) {
    var on = risks.indexOf(r.key) >= 0;
    H.push('<button class="tag' + (on ? ' on' : '') + '" onclick="ACTS.risk(\'' + r.key + '\')">' +
           r.icon + ' ' + esc(r.label) + '</button>');
  });
  H.push('</div></div>');

  H.push('<div class="row">');
  H.push(btn('我承諾 ' + est + ' 天', 'commit:' + m.msId, 'big'));
  H.push(btn('回坑道', 'go:home', 'ghost'));
  H.push('</div>');
  return H.join('');
};

/* ---------- 上傳 ---------- */
PAGES.submit = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var m = msOf(r.msId);
  var used = Math.max(1, daysBetween(r.committedAt, now()));
  var s = RULES.judge(r.est, used);

  var H = [head('交出去', m.title, '')];
  H.push('<div class="card">');
  H.push('<div class="eyebrow">你當初承諾</div>');
  H.push('<div class="big-num">' + r.est + ' <span>天</span></div>');
  H.push('<div class="eyebrow" style="margin-top:22px">實際花了</div>');
  H.push('<div class="big-num">' + used + ' <span>天</span></div>');
  H.push('<p class="dim">' + esc(RULES.judgeWhy(r.est, used)) + '</p>');
  H.push('</div>');
  H.push('<p class="lead">作業交到老師原本收的地方。這裡不收檔案，也看不到內容。</p>');
  H.push('<div class="row">');
  H.push(btn('確認交出去了', 'submit:' + r.runId, 'big'));
  H.push(btn('還沒', 'go:home', 'ghost'));
  H.push('</div>');
  return H.join('');
};

/* ---------- 判定結果 ---------- */
PAGES.stamp = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var m = msOf(r.msId), s = RULES.STAMPS[r.stamp];

  var H = ['<div class="stamp-card ' + r.stamp + '">'];
  H.push('<div class="stamp-mark">' + s.mark + '</div>');
  H.push('<h1>' + esc(s.name) + '</h1>');
  H.push('<p class="lead">' + esc(s.why) + '</p>');
  H.push('<div class="stamp-num"><b>' + r.est + '</b><span>承諾</span>' +
         '<b>' + r.actual + '</b><span>實際</span></div>');
  H.push('<p class="dim">' + esc(RULES.judgeWhy(r.est, r.actual)) + '</p>');
  H.push('</div>');

  if (r.stamp === 'late') {
    H.push(btn('去營火旁說一下', 'go:camp:' + r.runId, 'big'));
  } else {
    H.push(btn('好', 'skipcamp:' + r.runId, 'big'));
  }
  return H.join('');
};

/* ---------- 營火復盤 ---------- */
PAGES.camp = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var m = msOf(r.msId);
  var picked = DRAFT.snags || [];

  var H = ['<div class="camp">'];
  H.push(pxTag(CAMPFIRE.px, CAMPFIRE.pal, 'fire'));
  H.push('<div>');
  H.push('<div class="eyebrow">營火</div>');
  H.push('<h2>卡在哪？</h2>');
  H.push('<p class="dim">點就好，不用打字。這不會扣任何東西——' +
         '說得出卡在哪，本身就是一種專案能力。</p>');
  H.push('</div></div>');

  H.push('<div class="card"><div class="tags big">');
  RULES.SNAGS.forEach(function (g) {
    var on = picked.indexOf(g.key) >= 0;
    H.push('<button class="tag' + (on ? ' on' : '') + '" onclick="ACTS.snag(\'' + g.key + '\')">' +
           '<b>' + g.icon + '</b><i>' + esc(g.label) + '</i><em>' + esc(g.hint) + '</em></button>');
  });
  H.push('</div></div>');

  /* 當初標的風險有沒有中 */
  if (r.risks && r.risks.length) {
    var hit = r.risks.filter(function (k) { return picked.indexOf(k) >= 0; });
    H.push('<div class="card">');
    H.push('<div class="eyebrow">你當初標的風險</div>');
    H.push('<div class="tags">');
    r.risks.forEach(function (k) {
      var d = RULES.snagOf(k);
      if (d) H.push('<span class="tag static' + (picked.indexOf(k) >= 0 ? ' hit' : '') + '">' +
                    d.icon + ' ' + esc(d.label) + '</span>');
    });
    H.push('</div>');
    if (hit.length) H.push('<p class="ok">你預見到了。那比準時更值錢。</p>');
    H.push('</div>');
  }

  H.push(btn('說完了', 'reflect:' + r.runId, 'big'));
  return H.join('');
};

/* ---------- 大躍進 ---------- */
PAGES.dash = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var g = RULES.gearOf(r.gear);
  var H = ['<div class="dash">'];
  H.push(pxTag(HERO.dash, HERO.pal, 'ch big'));
  H.push('<h1>' + (g ? g.icon + ' ' + esc(g.name) : '裝備') + ' 到手</h1>');
  if (r.word) H.push('<p class="quote">' + nl(r.word) + '</p>');
  if (g) H.push('<p class="dim">' + esc(g.why) + '</p>');
  H.push('</div>');
  H.push(btn('回坑道', 'go:home', 'big'));
  return H.join('');
};

/* 全班地下城搬到 62-eco.js——那是一整張 2.5D 剖面，值得自己一個檔。 */

/* ---------- 走過的每一段 ---------- */
PAGES.log = function () {
  var t = myTeam();
  var rows = runsFor(t.teamId).filter(function (x) { return x.run.stamp; }).reverse();
  var H = [head('紀錄', '走過的每一段', '你當初怎麼估、實際花多久、他說了什麼。')];
  if (!rows.length) return H.join('') + '<div class="card dim">還沒有走完的里程碑。</div>';

  rows.forEach(function (x) {
    var r = x.run, s = RULES.STAMPS[r.stamp];
    H.push('<div class="card log-row">');
    H.push('<div class="log-head"><b>' + esc(x.ms.title) + '</b>' +
           '<span class="st ' + r.stamp + '">' + s.mark + ' ' + esc(s.name) + '</span></div>');
    H.push('<div class="log-num">承諾 <b>' + r.est + '</b> 天　·　實際 <b>' + r.actual + '</b> 天</div>');
    if (r.snags && r.snags.length) {
      H.push('<div class="tags small">');
      r.snags.forEach(function (k) {
        var d = RULES.snagOf(k);
        if (d) H.push('<span class="tag static">' + d.icon + ' ' + esc(d.label) + '</span>');
      });
      H.push('</div>');
    }
    if (r.word) H.push('<p class="quote">' + nl(r.word) + '</p>');
    H.push('</div>');
  });
  return H.join('');
};
