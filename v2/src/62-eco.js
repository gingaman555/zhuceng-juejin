/* 全班地下城：一張地質剖面。

   這是「關聯性」那根柱子的全部，而且它只做一件事：
   讓你看得到別人也在下面——不比較、不排名、不知道誰比較好。

   為什麼是剖面而不是列表：列表只要有兩列就會被讀成名次，剖面讀起來
   是一個地方。每一組往下走自己的一條廊道，廊道之間沒有共同的終點線，
   因為每一組的專案本來就不一樣。

   岩層（見 13-strata.js）是全班共用的地質，不是關卡。誰都看得到全部
   四層，沒有哪一層需要「開」。深度變了岩石就變了，就這樣。

   岩壁裡住著東西。牠們跟任何一組的進度都無關，就只是住在那裡——
   擋在你走廊盡頭的那一隻，只是其中一隻。牠們不是鈕：要查一隻
   去圖鑑，那裡有全部二十四隻。

   記號系統拿掉之後，這張圖上可以點的只剩一種：欄頭，那一組是誰。
   一種東西一句話。

   立體感來自每一塊右邊的側面（見 54-eco.css），不是把整條廊道斜著推——
   正交的長條看起來像進度表，有側面的廊道看起來像地下城。 */

var XS = {
  RULER: 154,    /* 左邊：深度尺與層的名字 */
  W: 176,        /* 一條廊道的寬。要放得下 22px 的專案名，一行六個字 */
  GAP: 44,       /* 廊道之間的牆 */
  SEG: 55,       /* 一個里程碑的深度 */
  SURF: 132,     /* 地表那一段。欄頭有三行，最上面是 22px 的專案名 */
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
    /* 帶名那一層拿掉了：一層一趟之後，帶名跟深度尺講的是同一條線
       （40 公尺那一條就是迴聲迷宮的開始），而它們都貼在左邊 6px，
       所以每一條尺上都壓著一個帶名。併進尺裡（見下面）。 */
  }

  /* ── 岩壁裡的東西 ── */
  out.push(xsFauna(rows.length, maxD, classId));

  /* ── 地表 ── */
  out.push('<div class="xs-sky" style="width:' + W + 'px"></div>');
  out.push('<div class="xs-surf" style="width:' + W + 'px"></div>');

  /* ── 深度尺。只標數字，不標「應該到哪」 ── */
  /* 深度尺。一條線上寫兩件事：多深、以及從這裡開始是哪一層。
     本來那兩個是分開的兩層，而且都貼在左邊——每一條尺上都壓著一個帶名。 */
  /* 從 0 標起。本來從 1 開始，所以最上面那一層——新來的人所在的
     那一層——整張圖上沒有名字。地表那一條不寫 0 m，寫層名就好。 */
  out.push('<div class="xs-rule surf" style="top:' + xsTop(0) + 'px;width:' + W + 'px">' +
    '<i class="' + strataAt(0, classId).key + '">' +
    esc(strataAt(0, classId).name) + '</i></div>');
  for (var d = 1; d <= maxD; d++) {
    var rz = strataAt(d, classId);
    out.push('<div class="xs-rule" style="top:' + xsTop(d) + 'px;width:' + W + 'px">' +
      '<span>' + (d * WORLD.depthPerMilestone) + ' m</span>' +
      '<i class="' + rz.key + '">' + esc(rz.name) + '</i></div>');
  }

  /* ── 每一組一條廊道 ── */
  /* meId 可以是一個組（學生）或一串組（老師帶的那幾組）。 */
  var mineSet = {};
  if (typeof meId === 'string' && meId) mineSet[meId] = 1;
  else if (meId && meId.length) meId.forEach(function (x) { mineSet[x] = 1; });
  rows.forEach(function (r, i) {
    out.push(xsShaft(r, i, maxD, !!mineSet[r.teamId]));
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
    /* 不是鈕。牠是牆上的東西——要查牠去圖鑑。
       本來是鈕，於是這張圖上有二十四個看起來像壁紙的目標。 */
    out.push('<div class="xs-fauna" style="left:' + x + 'px;top:' + y + 'px" ' +
      'title="' + esc(c.n) + '">' + pxTag(c.px, s.pal, '') + '</div>');
  });
}

/* ---------- 一條廊道 ---------- */
/* mine 是「這一條要不要標成自己的」。學生只有一條（自己那一組），
   老師有好幾條（他帶的那幾組）——所以判斷放在呼叫端，這裡只收
   一個布林。 */
function xsShaft(r, i, maxD, mine) {
  var x = xsX(i);
  var tm = teamOf(r.teamId);
  var left = !!(tm && tm.leftAt);
  var H = [];
  H.push('<div class="xs-shaft' + (mine ? ' mine' : '') + (left ? ' left' : '') +
    '" style="left:' + x + 'px;width:' + XS.W + 'px">');

  /* 走出去的那一組，廊道整條亮著一道光通到地表。
     別人看得到「他們走出去了」——這是這張圖上關聯性最強的一件事，
     而且它不是名次：走不走得出去跟估得準不準無關。 */
  if (left) {
    H.push('<div class="xs-out" style="height:' + (xsTop(maxD) + 44) + 'px"></div>');
  }

  /* 入口。招牌立在地表上，不是埋在土裡。

     本來這裡疊四行，而且亮的那一行是組名。「第一組 · 甲」是座號，
     「畢製分工失衡」才是他們在做的事——大的要是後者。
     組名縮成一個字，跟狀態併成一行。

     整塊是一顆鈕：本來這裡沒有任何 data-act，所以還沒留下東西的
     那幾組整條廊道是死的，點不動。 */
  var sg = SIGNS[r.sign] || SIGNS.wood;
  H.push('<button class="xs-head" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'team:' + r.teamId })) + '\' title="' +
    esc(r.name) + '">');
  H.push(pxTag(sg.px, sg.pal, 'sign-s'));
  H.push('<b>' + esc(r.project || '（還沒定）') + '</b>');
  /* 誰＋現在怎麼樣，一行，釘在欄頭底部——名字一行跟兩行的組要齊。 */
  H.push('<em class="xs-st"><span>' + esc(shortName(r.name)) + '</span>' +
    '<i class="s-' + r.status.key + '">' + esc(r.status.label) +
    (r.status.days ? ' ' + r.status.days + ' 天' : '') + '</i></em>');
  H.push('</button>');

  /* 打通的每一格 */
  for (var d = 0; d < maxD; d++) {
    var dug = d < r.depth;
    var here = d === r.depth && r.at > 0;
    var band = strataAt(d, r.teamId);
    H.push('<div class="xs-seg ' + band.key + (dug ? ' dug' : '') + (here ? ' here' : '') +
      '" style="top:' + xsTop(d) + 'px">');
    if (here) H.push('<i style="height:' + Math.round(r.at * 100) + '%"></i>');
    /* 記號系統整個拿掉了，所以這一格裡不再放東西。這張圖上剩下的是
       每一組打通到哪、正在走哪一格、還有誰在裡面——那三件事本來
       就是這一頁在回答的。 */
    H.push('</div>');
  }

  /* 小人站在最深的那一格 */
  /* 走出去的那一組，人站在地表上——他不在下面了。 */
  var at = r.depth + (r.at > 0 ? 1 : 0);
  var hr = r.hero || HERO;
  var pose = left ? hr.idle : (r.stall >= 2 ? hr.sleep : hr.idle);
  var top = left ? (XS.SURF - 44) : (xsTop(Math.max(0, at - 1)) + 11);
  H.push('<div class="xs-hero' + (r.stall >= 2 && !left ? ' sleep' : '') +
    (left ? ' out' : '') + '" style="top:' + top + 'px">');
  H.push(pxTag(pose, hr.pal, 'ch-s'));
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
  H.push('</div></div></div>');
  return H.join('');
}

ACTS.fauna = function (name) { DRAFT.fa = name; render(); };


/* 點開的那一根石片。別組的也點得開——那是這張圖上唯一會一直
   長出新東西的地方，而且長出新東西的是別人。 */


/* 圖例拿掉了。一張要配對照表才看得懂的圖，是那張圖沒畫好——
   顏色對到地層、實心對到走過、小人對到人在哪，這幾件事看一次就會了。
   點得開的那幾樣（生物、別組留下的記號）自己會說明自己。 */

function ecoRows(classId) {
  return ecology(classId).map(function (r) {
    var tm = teamOf(r.teamId);
    r.project = tm && tm.project;
    /* 那一條廊道裡站的是那一組自己的人。這一頁一次畫五組，
       不能吃全域那一個 HERO——那樣五條裡站的都是看的人自己。 */
    var mem = where('Users', function (x) {
      return x.teamId === r.teamId && x.role === 'student';
    })[0];
    r.hero = heroOf(mem);
    return r;
  });
}

/* ---------- 學生看到的 ---------- */
PAGES.eco = function () {
  var t = myTeam();
  var rows = ecoRows(t.classId);
  /* 地圖回到這一頁。首頁要的是「不用學就懂」，那是廊道；
     這張圖要學三條規則（一格＝一趟、顏色＝哪一組、亮的可以點），
     所以它屬於一個你特地過來看的地方。

     打通與蓋東西也在這裡——動手的地方跟看的地方要是同一個。 */
  var H = [head('全班地下城', '大家都在下面', '')];
  H.push(xsScene(rows, t.teamId, t.classId));
  /* 岩壁裡那幾隻不再是鈕（見 xsPlace），所以這裡也不再有那張卡。
     要查一隻去圖鑑。 */
  /* 排行榜搬到底下「估得準」那一段。刻意加進來、準備好隨時拿掉的
     ——見 68-rank.js。要拿掉就刪掉那一段跟那兩個檔案。 */
  /* 跨進新的一層的時候石頭會變。這一張本來在「大躍進」那一頁上，
     但那一頁只有這一張是內容，其餘是「去看看那一層」——
     而去看看到的就是這裡。所以它直接長在這裡。 */
  /* 本來是看「哪一層還沒插記號」。記號拿掉之後直接看走到多深。 */
  var nd = depthOf(t.teamId);
  if (nd > 0) {
    var zn = strataAt(nd, t.teamId), zw = strataAt(nd - 1, t.teamId);
    if (zn.key !== zw.key) {
      H.push('<div class="card fa ' + zn.key + ' zone-in">');
      H.push('<div class="eyebrow">石頭變了</div>');
      H.push('<h2>' + esc(zn.name) + '</h2>');
      H.push('<p class="lead">' + esc(zn.note) + '</p>');
      H.push('</div>');
    }
  }

  /* 留記號是一件在等你做的事，不是一段可以切走的內容，
     所以它跟圖一起留在上面。 */

  /* ── 底下分成三段，一次只看一段 ──
     本來是直的疊在一起，一路捲到兩千像素。捲到底的東西等於沒有。 */
  var dt = DRAFT.dt && teamOf(DRAFT.dt);
  /* 預設打開排行榜。藏起來的東西不會發生任何事——而這一版做它的方法
     是「放進去用，看實際發生什麼」。 */
  var tab = DRAFT.tab || (dt ? 'team' : 'rank');
  if (tab === 'team' && !dt) tab = 'feed';

  var segs = [['rank', '估得準'], ['feed', '最近']];
  if (dt) segs.push(['team', shortName(dt.name)]);
  H.push('<div class="segs">');
  segs.forEach(function (sg) {
    H.push('<button class="seg' + (tab === sg[0] ? ' on' : '') +
      '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'tab:' + sg[0] })) + '\'>' + esc(sg[1]) + '</button>');
  });
  H.push('</div>');

  if (tab === 'rank') {
    H.push(rankCard(t.classId, t.teamId));
  } else if (tab === 'team') {
    H.push(digTeamCard(t.classId));
  } else {
    var fd = feedOf(t.classId, 20);
    if (fd.length) {
      H.push('<div class="feed">');
      fd.forEach(function (f) { H.push(feedRow(f, t.teamId)); });
      H.push('</div>');
    } else {
      H.push('<p class="dim">還沒有人做過什麼。</p>');
    }
  }

  H.push(btn('回自己的廊道', 'go:home', 'ghost'));
  return H.join('');
};

/* ---------- 老師看到的：同一張圖，底下多一段細節 ---------- */

PAGES.classeco = function () {
  var u = me();
  var rows = ecoRows(u.classId);
  /* 整個課程都畫，自己帶的那幾條鑲金邊。

     不切成「只有我帶的」，是因為這張圖跟學生看到的是同一張——
     一個課程就是一個地方。切開它等於把一個課程拆成三個互相
     看不到的小班，而那正是這一版要拿掉的複雜度。 */
  var mine = teamsUnder(u.classId, u.userId).map(function (t) { return t.teamId; });
  var H = [head('各組進度', '整個課程　·　金邊的是你帶的 ' +
    mine.length + ' 組', '')];

  /* 剖面圖已經畫出每一組走到哪、正在走哪一趟、誰在等你看。
     這一頁本來在底下又用文字卡把同樣的事一組一張再列一遍——
     五組五張，整頁 3424px，是全系統最高的一頁。刪掉了。

     要細節就點那一組（digTeamCard 會攤開他們封存過的每一根石片）；
     要去勾就在審核那一頁，那才是它該在的地方。 */
  H.push(xsScene(rows, mine, u.classId));
  H.push(digTeamCard(u.classId));

  /* 只留一句：現在有幾組在等你。等你看的那幾件在審核那一頁。 */
  var waiting = radar(u.classId).length;
  if (waiting) {
    H.push('<div class="card">');
    H.push('<div class="eyebrow lit">' + waiting + ' 件等你看</div>');
    H.push(btn('去審核', 'go:radar', 'big'));
    H.push('</div>');
  }
  return H.join('');
};
