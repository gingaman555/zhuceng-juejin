/* 全班地下城：一張地質剖面。

   這是「關聯性」那根柱子的全部，而且它只做一件事：
   讓你看得到別人也在下面——不比較、不排名、不知道誰比較好。

   為什麼是剖面而不是列表：列表只要有兩列就會被讀成名次，剖面讀起來
   是一個地方。每一組往下走自己的一條廊道，廊道之間沒有共同的終點線，
   因為每一組的專案本來就不一樣。

   岩層（見 13-strata.js）是全班共用的地質，不是關卡。誰都看得到全部
   四層，沒有哪一層需要「開」。深度變了岩石就變了，就這樣。

   岩壁裡住著東西。牠們跟任何一組的進度都無關，就只是住在那裡——
   擋在你走廊盡頭的那一隻，只是其中一隻。點一下看牠是什麼。

   立體感來自每一塊右邊的側面（見 54-eco.css），不是把整條廊道斜著推——
   正交的長條看起來像進度表，有側面的廊道看起來像地下城。 */

var XS = {
  RULER: 154,    /* 左邊：深度尺與層的名字 */
  W: 110,        /* 一條廊道的寬 */
  GAP: 66,       /* 廊道之間的牆 */
  SEG: 55,       /* 一個里程碑的深度 */
  SURF: 88,      /* 地表那一段 */
  ROCK: 264      /* 最右邊留一大塊沒有人走過的岩壁，給生態用 */
};

function xsTop(d) { return XS.SURF + d * XS.SEG; }
function xsX(i) { return XS.RULER + i * (XS.W + XS.GAP); }

/* ---------- 整張圖 ---------- */
function xsScene(rows, meId) {
  /* 畫多深：最深的那一組再往下兩格，讓底下永遠還有沒有人走過的岩石。
     這很重要——底部如果切齊最深的人，那條線就變成終點線了。 */
  var deep = rows.reduce(function (a, r) {
    return Math.max(a, r.depth + (r.at > 0 ? 1 : 0));
  }, 0);
  var maxD = Math.max(5, deep + 2);
  var W = xsX(rows.length) + XS.ROCK;
  var H = xsTop(maxD) + 44;

  var out = ['<div class="xsec-wrap"><div class="xsec" style="width:' + W +
    'px;height:' + H + 'px">'];

  /* ── 地層 ── */
  STRATA.forEach(function (s) {
    if (s.from > maxD) return;
    var top = xsTop(s.from);
    var bot = xsTop(Math.min(s.to + 1, maxD));
    out.push('<div class="xs-band ' + s.key + '" style="top:' + top +
      'px;height:' + (bot - top) + 'px;width:' + W + 'px"></div>');
    out.push('<div class="xs-bandn ' + s.key + '" style="top:' + (top + 6) + 'px">' +
      '<b>' + esc(s.name) + '</b><span>' + esc(s.note) + '</span></div>');
  });

  /* ── 岩壁裡的東西 ── */
  out.push(xsFauna(rows.length, maxD));

  /* ── 地表 ── */
  out.push('<div class="xs-sky" style="width:' + W + 'px"></div>');
  out.push('<div class="xs-surf" style="width:' + W + 'px"></div>');

  /* ── 深度尺。只標數字，不標「應該到哪」 ── */
  for (var d = 1; d <= maxD; d++) {
    out.push('<div class="xs-rule" style="top:' + xsTop(d) + 'px;width:' + W + 'px">' +
      '<span>' + (d * WORLD.depthPerMilestone) + ' m</span></div>');
  }

  /* ── 每一組一條廊道 ── */
  rows.forEach(function (r, i) {
    out.push(xsShaft(r, i, maxD, r.teamId === meId));
  });

  out.push('</div></div>');
  return out.join('');
}

/* ---------- 岩壁裡的生態 ----------
   位置用層與槽算，不擲骰子。每次打開，同一隻都在同一個地方——
   會亂跳的東西不是生態，是特效。 */
function xsFauna(nTeams, maxD) {
  var out = [];
  /* 放得下的地方：每一條廊道右邊那道牆，加上最右邊那一大塊 */
  var slots = [];
  for (var i = 0; i < nTeams; i++) slots.push(xsX(i) + XS.W + 14);
  slots.push(xsX(nTeams) + 33);
  slots.push(xsX(nTeams) + 154);
  slots.push(xsX(nTeams) + 88);

  STRATA.forEach(function (s) {
    if (s.from > maxD) return;
    var lo = xsTop(s.from), hi = xsTop(Math.min(s.to + 1, maxD));
    if (hi - lo < 55) return;
    slots.forEach(function (x, n) {
      var h = hash(s.key + '/' + n);
      if (h % 100 < 42) return;
      var c = faunaAt(s.key, n);
      if (!c) return;
      var y = lo + 11 + ((h >> 5) % Math.max(1, hi - lo - 55));
      out.push('<button class="xs-fauna" style="left:' + x + 'px;top:' + y + 'px" ' +
        'data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'fauna:' + c.n })) + '\' ' +
        'title="' + esc(c.n) + '">' + pxTag(c.px, s.pal, '') + '</button>');
    });
  });
  return out.join('');
}

/* ---------- 一條廊道 ---------- */
function xsShaft(r, i, maxD, mine) {
  var x = xsX(i);
  var H = [];
  H.push('<div class="xs-shaft' + (mine ? ' mine' : '') + '" style="left:' + x +
    'px;width:' + XS.W + 'px">');

  /* 入口。招牌立在地表上，不是埋在土裡。 */
  var sg = SIGNS[r.sign] || SIGNS.wood;
  H.push('<div class="xs-head">');
  H.push(pxTag(sg.px, sg.pal, 'sign-s'));
  H.push('<b>' + esc(r.name) + '</b>');
  H.push('<span>' + esc(r.project || '（還沒定）') + '</span>');
  H.push('<i class="' + (r.stall >= 2 ? 'z' : r.stall === 1 ? 'y' : r.onMs ? 'x' : '') + '">' +
    (r.stall >= 2 ? '休息中' : r.stall === 1 ? '慢下來了' : r.onMs ? '前進中' : '等派任務') +
    '</i>');
  H.push('</div>');

  /* 打通的每一格 */
  for (var d = 0; d < maxD; d++) {
    var dug = d < r.depth;
    var here = d === r.depth && r.at > 0;
    var band = strataAt(d, r.teamId);
    H.push('<div class="xs-seg ' + band.key + (dug ? ' dug' : '') + (here ? ' here' : '') +
      '" style="top:' + xsTop(d) + 'px">');
    if (here) H.push('<i style="height:' + Math.round(r.at * 100) + '%"></i>');
    H.push('</div>');
  }

  /* 小人站在最深的那一格 */
  var at = r.depth + (r.at > 0 ? 1 : 0);
  var pose = r.stall >= 2 ? HERO.sleep : HERO.idle;
  H.push('<div class="xs-hero' + (r.stall >= 2 ? ' sleep' : '') + '" style="top:' +
    (xsTop(Math.max(0, at - 1)) + 11) + 'px">');
  H.push(pxTag(pose, HERO.pal, 'ch-s'));
  if (r.stall === 1) H.push(pxTag(VINE.px, VINE.pal, 'vine-s'));
  H.push('</div>');

  H.push('</div>');
  return H.join('');
}

/* ---------- 點開的那一隻 ----------
   生態不是背景。點得開才叫生態——不然那些圖只是牆紙。 */
function faunaCard() {
  var pick = DRAFT.fa;
  if (!pick) {
    return '<div class="card dim">岩壁裡住著東西。點任何一隻，看牠是什麼。' +
      '牠們跟哪一組走到多深都沒有關係——牠們只是住在那裡。</div>';
  }
  var c = faunaByName(pick);
  if (!c) return '';
  var s = null;
  STRATA.forEach(function (x) { if (x.name === c.r) s = x; });
  var H = ['<div class="card fa ' + (s ? s.key : '') + '">'];
  H.push('<div class="fa-in">');
  H.push(pxTag(c.px, (s || STRATA[0]).pal, 'fa-px'));
  H.push('<div>');
  H.push('<div class="eyebrow">' + esc(c.r) + '</div>');
  H.push('<h2>' + esc(c.n) + '</h2>');
  H.push('<p class="lead">' + esc(c.t) + '</p>');
  H.push('<p class="dim">牠住在這一層。你走到這一層的時候，' +
         '擋在廊道盡頭的就是這一層的住民——同一個里程碑，每一組遇到的不是同一隻。</p>');
  H.push('</div></div></div>');
  return H.join('');
}

ACTS.fauna = function (name) { DRAFT.fa = name; render(); };

/* 圖例。看得懂才叫呈現。 */
function xsLegend() {
  var H = ['<div class="card"><div class="eyebrow">這張圖在說什麼</div><div class="lg">'];
  H.push('<div><b class="lg-dug"></b><span>打通的廊道＝走完的里程碑</span></div>');
  H.push('<div><b class="lg-here"></b><span>正在走的那一格＝這一趟走到哪</span></div>');
  H.push('<div><b class="lg-hero"></b><span>小人＝那一組現在在多深的地方</span></div>');
  H.push('<div><b class="lg-fa"></b><span>岩壁裡的東西＝住在那一層的生物</span></div>');
  H.push('</div>');
  H.push('<p class="dim">深度是走完幾個里程碑。每一組的專案不一樣，' +
         '廊道長度本來就不同——這裡沒有共同的終點線，也沒有排名。' +
         '最底下永遠留著沒有人走過的岩石，因為這座地下城沒有最底層。</p>');
  H.push('</div>');
  return H.join('');
}

function ecoRows(classId) {
  return ecology(classId).map(function (r) {
    var tm = teamOf(r.teamId);
    r.project = tm && tm.project;
    return r;
  });
}

/* ---------- 學生看到的 ---------- */
PAGES.eco = function () {
  var t = myTeam();
  var rows = ecoRows(t.classId);
  var H = [head('全班地下城', '大家都在下面',
    '同一片石頭，每一組往下走自己的一條。看得到別人也在裡面，就夠了。')];
  H.push(xsScene(rows, t.teamId));
  H.push(faunaCard());
  H.push(xsLegend());
  H.push(btn('回自己的廊道', 'go:home', 'ghost'));
  return H.join('');
};

/* ---------- 老師看到的：同一張圖，底下多一段細節 ---------- */
PAGES.classeco = function () {
  var u = me();
  var rows = ecoRows(u.classId);
  var H = [head('各組進度', '每一組走到哪',
    '同一片石頭，每一組往下走自己的一條。深度是走完幾個里程碑——' +
    '每一組的專案不一樣，廊道長度本來就不同。')];
  H.push(xsScene(rows, null));
  H.push(faunaCard());

  rows.forEach(function (r) {
    var t = teamOf(r.teamId);
    var sg = signOf(r.teamId);
    var acc = accuracyOf(r.teamId);
    var all = runsFor(r.teamId);
    var cur = all.filter(function (x) { return x.run.state === 'running'; })[0];
    var wait = all.filter(function (x) { return x.run.state === 'submitted'; })[0];
    var camp = all.filter(function (x) { return x.run.state === 'judged'; })[0];
    var offer = all.filter(function (x) { return x.run.state === 'approved'; })[0];

    H.push('<div class="card tm">');
    H.push('<div class="radar-head">');
    H.push(pxTag(sg.px, sg.pal, 'sign-s'));
    H.push('<b>' + esc(t.name) + '</b>');
    H.push('<span class="dim">' + esc(t.project || '（還沒定）') + '</span>');
    H.push('<span class="sp"></span>');
    H.push('<span class="dim">' + esc(strataAt(r.depth, r.teamId).name) + '　·　深度 ' +
      (r.depth * WORLD.depthPerMilestone) + ' m</span>');
    H.push('</div>');

    if (wait) {
      H.push('<p class="lead">在等你看：' + esc(wait.ms.title) + '</p>');
      H.push(btn('去勾', 'go:review:' + wait.run.runId, ''));
    } else if (offer) {
      H.push('<p class="dim">你勾過了，他們還沒挑裝備：' + esc(offer.ms.title) + '</p>');
    } else if (camp) {
      H.push('<p class="dim">交了，正在營火旁說卡在哪：' + esc(camp.ms.title) + '</p>');
    } else if (cur) {
      var run = cur.run;
      H.push('<p class="lead">正在走：' + esc(cur.ms.title) + '</p>');
      H.push(estBar(run.est, run.pushes, true));
      H.push(dayStrip(r.teamId, run.runId));
    } else {
      H.push('<p class="dim">手上沒有里程碑。派一個給他們就會開始。</p>');
    }

    if (acc.total) H.push(accBar(acc));
    H.push('</div>');
  });
  return H.join('');
};
