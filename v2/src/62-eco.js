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
function xsScene(rows, meId, classId) {
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

  /* ── 地層 ──
     層沒有固定深度：順序是一個班洗一次，六層走完回到第一層。
     所以帶子從班級的路線算，每 ZONE_SPAN 格一帶，一直排到底。
     同一個班的每一組看到的是同一片地質——那是「我們在同一個地方」。 */
  for (var bd = 0; bd * ZONE_SPAN < maxD; bd++) {
    var zs = strataAt(bd * ZONE_SPAN, classId);
    var top = xsTop(bd * ZONE_SPAN);
    var bot = xsTop(Math.min((bd + 1) * ZONE_SPAN, maxD));
    out.push('<div class="xs-band ' + zs.key + '" style="top:' + top +
      'px;height:' + (bot - top) + 'px;width:' + W + 'px"></div>');
    out.push('<div class="xs-bandn ' + zs.key + '" style="top:' + (top + 6) + 'px">' +
      '<b>' + esc(zs.name) + '</b></div>');
  }

  /* ── 岩壁裡的東西 ── */
  out.push(xsFauna(rows.length, maxD, classId));

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
function xsFauna(nTeams, maxD, classId) {
  var out = [];
  /* 放得下的地方：每一條廊道右邊那道牆，加上最右邊那一大塊 */
  var slots = [];
  for (var i = 0; i < nTeams; i++) slots.push(xsX(i) + XS.W + 14);
  slots.push(xsX(nTeams) + 33);
  slots.push(xsX(nTeams) + 154);
  slots.push(xsX(nTeams) + 88);

  for (var bd = 0; bd * ZONE_SPAN < maxD; bd++) {
    var s = strataAt(bd * ZONE_SPAN, classId);
    var lo = xsTop(bd * ZONE_SPAN);
    var hi = xsTop(Math.min((bd + 1) * ZONE_SPAN, maxD));
    if (hi - lo < 55) continue;
    /* 用「第幾帶」而不是層的 key 當種子——同一層在不同深度再出現一次的
       時候，住在裡面的不該是同一隻站在同一個位置。 */
    xsPlace(out, slots, s, bd, lo, hi);
  }
  return out.join('');
}

function xsPlace(out, slots, s, bd, lo, hi) {
  slots.forEach(function (x, n) {
    var h = hash(s.key + '/' + bd + '/' + n);
    if (h % 100 < 42) return;
    var c = faunaAt(s.key, bd * 7 + n);
    if (!c) return;
    var y = lo + 11 + ((h >>> 5) % Math.max(1, hi - lo - 55));
    out.push('<button class="xs-fauna" style="left:' + x + 'px;top:' + y + 'px" ' +
      'data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'fauna:' + c.n })) + '\' ' +
      'title="' + esc(c.n) + '">' + pxTag(c.px, s.pal, '') + '</button>');
  });
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
  H.push('<i class="s-' + r.status.key + '">' + esc(r.status.label) +
    (r.status.days ? ' ' + r.status.days + ' 天' : '') + '</i>');
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

  /* 封存過的岩心掛在它們被封存的那個深度。

     這是這張圖上唯一會一直長出新東西的地方，而且長出新東西的是別人。
     內容一定會用完（六層走完一圈就沒有新的石頭了），同學不會。
     點得開——好奇「他們那一週長什麼樣」比任何名次都有用。 */
  keepsOf(r.teamId).forEach(function (k, n) {
    if (n >= maxD) return;
    var kz = STRATA[0];
    STRATA.forEach(function (z) { if (z.key === k.zone) kz = z; });
    H.push('<button class="xs-core" style="top:' + (xsTop(n) + 6) + 'px" ' +
      'data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'core:' + k.keepId })) +
      '\' title="' + esc(k.name || '（沒取名）') + '">' +
      pxTag(k.px || coreOf(k.runId), kz.pal, 'mcore') + '</button>');
  });

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
    return '';
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

ACTS.fauna = function (name) { DRAFT.fa = name; DRAFT.ck = null; render(); };
ACTS.core = function (id) { DRAFT.ck = id; DRAFT.fa = null; render(); };

/* 點開的那一根岩心。別組的也點得開——那是這張圖上唯一會一直
   長出新東西的地方，而且長出新東西的是別人。 */
function coreCard() {
  if (!DRAFT.ck) return '';
  var k = null;
  DB.Keeps.forEach(function (x) { if (x.keepId === DRAFT.ck) k = x; });
  if (!k) return '';
  var z = STRATA[0];
  STRATA.forEach(function (x) { if (x.key === k.zone) z = x; });
  var tm = teamOf(k.teamId);
  var r = find('Runs', function (x) { return x.runId === k.runId; });
  var m = r ? msOf(r.msId) : null;

  var H = ['<div class="card fa ' + z.key + '"><div class="fa-in">'];
  H.push(pxTag(k.px || coreOf(k.runId), z.pal, 'core big'));
  H.push('<div>');
  H.push('<div class="eyebrow">' + esc(tm ? tm.name : '') + '　·　' + esc(z.name) + '</div>');
  H.push('<h2>' + esc(k.name || '（沒取名）') + '</h2>');
  if (m) H.push('<p class="lead">' + esc(m.title) + '</p>');
  H.push('<div class="corekey">');
  H.push('<span><b class="c1"></b>來過 ' + (k.moved || 0) + ' 天</span>');
  if (k.rested) H.push('<span><b class="c2"></b>說沒動 ' + k.rested + ' 天</span>');
  if (k.blank) H.push('<span><b class="c3"></b>沒有紀錄 ' + k.blank + ' 天</span>');
  H.push('</div>');
  H.push('<div class="log-num">說 <b>' + (k.est || 0) + '</b> 天　·　過了 <b>' +
    (k.elapsed || 0) + '</b> 天</div>');
  H.push('</div></div></div>');
  return H.join('');
}

/* 圖例拿掉了。一張要配對照表才看得懂的圖，是那張圖沒畫好——
   顏色對到地層、實心對到走過、小人對到人在哪，這幾件事看一次就會了。
   點得開的那幾樣（生物、別組的岩心）自己會說明自己。 */

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
  /* 地圖只在首頁一個地方。同一張圖畫兩次，使用者得自己想
     「這兩張是同一張嗎」——那是最貴的複雜度。
     這一頁改成只做它獨有的事：別人最近做了什麼。 */
  var H = [head('全班最近', '別人在幹嘛', '')];
  var fd = feedOf(t.classId, 20);
  if (fd.length) {
    H.push('<div class="eyebrow feed-h">全班最近</div>');
    H.push('<div class="feed">');
    fd.forEach(function (f) { H.push(feedRow(f, t.teamId)); });
    H.push('</div>');
  }
  H.push(btn('回自己的廊道', 'go:home', 'ghost'));
  return H.join('');
};

/* ---------- 老師看到的：同一張圖，底下多一段細節 ---------- */
PAGES.classeco = function () {
  var u = me();
  var rows = ecoRows(u.classId);
  var H = [head('各組進度', '每一組走到哪', '')];
  H.push(digMap(u.classId, null));
  H.push(digTeamCard(u.classId));
  H.push(coreCard());

  rows.forEach(function (r) {
    var t = teamOf(r.teamId);
    var sg = signOf(r.teamId);
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
      (r.depth * WORLD.depthPerMilestone) + ' m　·　走完 ' + r.depth + ' 趟</span>');
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
      /* 量，不是好壞：這一趟有多大、走到哪、每天動的是哪一段。
         準度與判定不放在這一頁——這裡是「誰在哪」，
         「跑得如何」屬於審核，那時候他看的是一組人交的一件東西。 */
      H.push('<div class="log-num">這一趟 <b>' + run.est + '</b> 天　·　' +
        '來過 <b>' + run.pushes + '</b> 天</div>');
      H.push(dayStrip(r.teamId, run.runId));
    } else {
      H.push('<p class="dim">手上沒有里程碑。派一個給他們就會開始。</p>');
    }
    H.push('</div>');
  });
  return H.join('');
};
