/* 班級地下城：一張地質剖面。

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

/* ---------- 版面 ----------

   橫的，由左至右——跟首頁那一條廊道同一套文法。每一組一條，上下排開，
   全部從同一條左邊界起算，所以長度直接比得出來，不用讀任何數字。

   本來是直的剖面：每一組往下挖一口井，格子畫的是「挖空的洞」。
   橫過來之後格子的意思也跟著換：

     一塊 ＝ 老師收下的一趟。實心的，疊上去的。
     虛的一塊 ＝ 交出去了，還在老師那邊。
     右邊的暗岩 ＝ 還沒挖到的地方，每一條都留著。

   為什麼是「老師收下的」而不是「走完的」——走是他自己的事，
   留下來是要有人看過的事（見 40-db.js 的 sealedDepth）。
   走完但還沒被收下的那一趟看得到，但它是虛的：那一塊還沒站住。

   石頭的顏色只跟「第幾塊」有關，跟哪一組無關（strataAt 吃 classId）。
   一旦讓某一組有自己的顏色，這張圖就開始比誰的比較漂亮。
   六層沒有先後、順序一個班洗一次，所以顏色不帶任何「你該到哪」。 */
var XL = {
  NAME: 176,   /* 左邊：這是哪一組 */
  BLK: 55,     /* 一塊的寬 */
  BH: 66,      /* 一塊的高 */
  HEAD: 44,    /* 條的上面留給角色站的那一條 */
  LANE: 121,   /* 一條佔的高：44 站的 ＋ 66 條 ＋ 11 間隔 */
  AHEAD: 4,    /* 每一條右邊都要留著的、還沒挖到的那幾格 */
  TOP: 55      /* 最上面那條尺 */
};

function xlX(n) { return XL.NAME + n * XL.BLK; }
function xlY(i) { return XL.TOP + i * XL.LANE; }

/* 這一組疊到第幾塊。實心幾塊、後面掛不掛一塊虛的。 */
function xlCount(r) { return r.sealed + (r.pending ? 1 : 0); }

/* ---------- 整張圖 ---------- */
function xsScene(rows, meId, classId) {
  /* 畫多長：最長的那一條再往右幾格。右邊永遠還有沒挖過的岩石——
     切齊最長的那一組，那條邊就變成終點線了。 */
  var most = rows.reduce(function (a, r) { return Math.max(a, xlCount(r)); }, 0);
  var cols = Math.max(6, most + XL.AHEAD);
  var W = xlX(cols) + 22;
  var H = xlY(rows.length) + 22;

  var out = ['<div class="xsec-wrap"><div class="xsec" style="width:' + W +
    'px;height:' + H + 'px">'];

  /* ── 每一直行的石頭 ──
     整張圖的底。同一行不管哪一組，石頭都一樣，因為那是同一片地質。 */
  for (var n = 0; n < cols; n++) {
    var zn = strataAt(n, classId);
    out.push('<div class="xl-col ' + zn.key + '" style="left:' + xlX(n) +
      'px;width:' + XL.BLK + 'px;height:' + H + 'px"></div>');
  }

  /* ── 最上面那條尺 ──
     只寫多深，不寫「應該到哪」。兩塊一個刻度，一塊一個會太密。 */
  out.push('<div class="xl-rule" style="width:' + W + 'px"></div>');
  for (var d = 2; d <= cols; d += 2) {
    out.push('<div class="xl-tick" style="left:' + xlX(d) + 'px;height:' + H + 'px">' +
      '<span>' + (d * WORLD.depthPerMilestone) + ' m</span></div>');
  }

  /* ── 沒挖到的岩石裡住著東西 ── */
  out.push(xlFauna(rows, cols, classId));

  /* ── 每一組一條 ── */
  /* meId 可以是一個組（學生）或一串組（老師帶的那幾組）。 */
  var mineSet = {};
  if (typeof meId === 'string' && meId) mineSet[meId] = 1;
  else if (meId && meId.length) meId.forEach(function (x) { mineSet[x] = 1; });
  rows.forEach(function (r, i) {
    out.push(xlLane(r, i, cols, classId, !!mineSet[r.teamId]));
  });

  out.push('</div></div>');
  return out.join('');
}

/* ---------- 還沒挖到的地方住著什麼 ----------

   位置用行與列算，不擲骰子——每次打開同一隻都在同一個地方。
   會亂跳的東西不是生態，是特效。

   只長在沒有人挖到的那一段：牠們跟任何一組的進度無關，
   就只是住在那裡，而且前面還有。 */
function xlFauna(rows, cols, classId) {
  var out = [];
  rows.forEach(function (r, i) {
    var from = xlCount(r) + 1;
    for (var n = from; n < cols; n++) {
      var h = hash('f/' + classId + '/' + i + '/' + n);
      if (h % 100 < 68) continue;
      var z = strataAt(n, classId);
      var c = faunaAt(z.key, i * 7 + n);
      if (!c) continue;
      /* 不是鈕。牠是岩石裡的東西——要查牠去圖鑑，那裡有全部二十四隻。 */
      out.push('<div class="xl-fauna" style="left:' + (xlX(n) + 6) + 'px;top:' +
        (xlY(i) + 11 + (h >>> 5) % 22) + 'px" title="' + esc(c.n) + '">' +
        pxTag(c.px, z.pal, '') + '</div>');
    }
  });
  return out.join('');
}

/* ---------- 一組一條 ---------- */
/* mine 是「這一條要不要標成自己的」。學生只有一條，老師有好幾條，
   所以判斷放在呼叫端，這裡只收一個布林。 */
function xlLane(r, i, cols, classId, mine) {
  var y = xlY(i);
  var tm = teamOf(r.teamId);
  var left = !!(tm && tm.leftAt);
  var n = xlCount(r);
  var H = ['<div class="xl-lane' + (mine ? ' mine' : '') + (left ? ' out' : '') +
    '" style="top:' + y + 'px;height:' + XL.LANE + 'px">'];

  /* 左邊那一格：他們在做什麼，跟他們是誰。

     大的是專案名不是組名——「第一組 · 甲」是座號，
     「畢製分工失衡」才是他們在做的事。

     整格是一顆鈕，點進去是「他們是誰」；中間那一疊是另一顆，
     點進去是「他們做了什麼」。一條上兩個問題，各自一顆鈕。 */
  H.push('<button class="xl-name" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'crew:' + r.teamId })) + '\' title="' +
    esc(r.name) + '" style="top:' + XL.HEAD + 'px;width:' + XL.NAME +
    'px;height:' + XL.BH + 'px">');
  H.push('<b>' + esc(r.project || '（還沒定）') + '</b>');
  H.push('<em>' + esc(shortName(r.name)) + '</em>');
  H.push('</button>');

  /* 疊起來的那幾塊。整排是一顆鈕：點下去看他們被派過哪些任務。

     空的那幾組也點得到——鈕蓋滿整條，不然還沒被收下任何一趟的組
     整條是死的，而那正是最需要被點開看一眼的那一組。 */
  H.push('<button class="xl-stack" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'team:' + r.teamId })) + '\' ' +
    'style="left:' + xlX(0) + 'px;top:' + XL.HEAD + 'px;width:' +
    (cols * XL.BLK) + 'px;height:' + XL.BH + 'px">');
  for (var k = 0; k < n; k++) {
    var z = strataAt(k, classId);
    var wait = (k === n - 1) && r.pending;
    H.push('<i class="xl-b ' + z.key + (wait ? ' wait' : ' on') +
      '" style="left:' + (k * XL.BLK) + 'px;width:' + XL.BLK + 'px"></i>');
  }
  H.push('</button>');

  /* 角色站在自己那一條的最後一塊上面，腳踩在條的上緣。點他看那一個人。

     本來人站在最深的那一格裡。搬到條上面來，是因為一整排人的左右
     就是一整排的長短——誰疊得多，不用讀任何數字。
     還沒疊到任何一塊的那一組站在起點上，不是站在空中。 */
  var hr = r.hero || HERO;
  var pose = left ? hr.win : (r.stall >= 2 ? hr.sleep : hr.idle);
  H.push('<button class="xl-hero' + (r.stall >= 2 && !left ? ' sleep' : '') +
    '" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'person:' + r.teamId })) + '\' title="' +
    esc(shortName(r.name)) + '" style="left:' + (xlX(Math.max(0, n - 1)) + 6) + 'px">');
  H.push(pxTag(pose, hr.pal, 'ch-s'));
  if (r.stall === 1) H.push(pxTag(VINE.px, VINE.pal, 'vine-s'));
  H.push('</button>');

  /* 走出去的那一組，那一條的盡頭是一道光。
     別人看得到「他們走出去了」——而那跟估得準不準無關。 */
  if (left) H.push('<span class="xl-exit" style="top:' + XL.HEAD +
    'px;left:' + xlX(n) + 'px"></span>');

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
  var H = [head('班級地下城', '大家都在下面', '')];
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
