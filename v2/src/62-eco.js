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

   一塊的顏色是「那一趟他們去了哪裡」。

   本來一整行同一個顏色，因為那時候第幾層是算出來的——同一個深度
   全班一定在同一層，所以顏色屬於欄位不屬於哪一組。地方改成他們
   自己選之後那條規則不成立了：一條看下來是那一組走過的路線。

   顏色因此變成他們的了，但它還是不能比較誰漂亮——六個地方沒有先後、
   沒有難易，去哪裡不影響任何判定。它是決定的痕跡，不是成績。 */
var XL = {
  NAME: 176,   /* 左邊：這是哪一組 */
  MIN: 55,     /* 一塊最窄。窄到這裡就不再收，改成橫著捲 */
  MAX: 88,     /* 一塊最寬。再寬就變成一片色塊，邊角那道斜切也看不出來 */
  BH: 66,      /* 一塊的高 */
  HEAD: 44,    /* 條的上面留給角色站的那一條 */
  LANE: 121,   /* 一條佔的高：44 站的 ＋ 66 條 ＋ 11 間隔 */
  AHEAD: 4,    /* 每一條右邊都要留著的、還沒挖到的那幾格 */
  TOP: 55      /* 最上面那條尺 */
};

function xlY(i) { return XL.TOP + i * XL.LANE; }

/* 這一組疊到第幾塊。實心幾塊、後面掛不掛一塊虛的。 */
function xlCount(r) { return r.sealed + (r.pending ? 1 : 0); }

/* ---------- 整張圖 ---------- */
function xsScene(rows, meId, classId) {
  /* 畫多長：最長的那一條再往右幾格。右邊永遠還有沒挖過的岩石——
     切齊最長的那一組，那條邊就變成終點線了。 */
  var most = rows.reduce(function (a, r) { return Math.max(a, xlCount(r)); }, 0);
  var cols = Math.max(6, most + XL.AHEAD);
  var H = xlY(rows.length) + 22;

  /* 橫向全部交給 CSS 算（見 54-eco.css）：--cols 是幾格、--nm 是名牌多寬，
     每一塊的左緣與寬度都是 (100% − 名牌) ÷ 格數。
     所以這張圖在電腦上撐滿、在手機上退到最窄再捲。 */
  /* 寬度上限拿掉了。

     本來是 XL.MAX（一塊最寬 88px）×格數：格數少的時候整張圖會縮在
     頁面中間，兩邊留白。可是這張圖是「全班在同一片地層裡」，它縮成
     一小塊的時候那句話就講不出來了。

     min-width 留著：窄到一塊 55px 就不再收，改成橫著捲。 */
  var out = ['<div class="xsec-wrap"><div class="xsec" style="--cols:' + cols +
    ';--nm:' + XL.NAME + 'px;min-width:' + (XL.NAME + cols * XL.MIN) +
    'px;height:' + H + 'px">'];

  /* ── 每一直行的石頭 ──

     整張圖的底，一片中性的岩壁。本來每一直行是一個地層——那是
     「第幾層由深度算出來」那一版留下的：同一個深度全班一定同一層。

     地方改成他們自己選之後，「第幾行＝哪一層」就不成立了。
     顏色全部留給疊上去的那幾塊——那才是有人做過決定的地方。 */
  for (var n = 0; n < cols; n++) {
    out.push('<div class="xl-col" style="--i:' + n + '"></div>');
  }

  /* ── 最上面那一條地表 ──

     那條帶子留著（它是地面），但上面的公尺刻度拿掉了。

     那把尺是「深度＝進度」那一版留下來的。這一版的地形跟走多少刻意
     脫鉤了，而那把尺又把「走到第幾公尺」放回來——而且它橫跨全班，
     所以就算這張圖不排序，一把共用的尺還是讓人一眼讀得出名次。

     它也沒有多說什麼：一塊就是一趟，數得出來。80 m 只是 2 塊乘以 40，
     把趟數包裝成一個假的單位。 */
  out.push('<div class="xl-rule"></div>');

  /* ── 還沒去過的地方住著東西 ── */
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
      /* 前面那幾隻用班級的路線挑——它不是「那裡是哪一層」，
         只是讓每一格住的東西固定不亂跳。 */
      var z = strataAt(n, classId);
      var c = faunaAt(z.key, i * 7 + n);
      if (!c) continue;
      /* 不是鈕。牠是岩石裡的東西——要查牠去圖鑑，那裡有全部二十四隻。 */
      /* 跟那一疊同一個高度：牠們住在岩石裡，不是浮在兩排之間。 */
      out.push('<div class="xl-fauna" style="--i:' + n + ';top:' +
        (xlY(i) + XL.HEAD + 11 + (h >>> 5) % 22) + 'px" title="' + esc(c.n) + '">' +
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
    esc(r.name) + '" style="top:' + XL.HEAD + 'px;height:' + XL.BH + 'px">');
  /* 這裡試過掛那一組的招牌，撤掉了：signOf 對每一組都回同一張
     （見 40-db.js，材質跟深度綁的那一版拿掉之後它就是個殘骸）。
     五個一模一樣的圖示不會讓一排更好認，只會教眼睛忽略那一欄。 */
  H.push('<b>' + esc(r.project || '（還沒定）') + '</b>');
  H.push('<em>' + esc(shortName(r.name)) + '</em>');
  H.push('</button>');

  /* 疊起來的那幾塊。整排是一顆鈕：點下去看他們被派過哪些任務。

     空的那幾組也點得到——鈕蓋滿整條，不然還沒被收下任何一趟的組
     整條是死的，而那正是最需要被點開看一眼的那一組。 */
  H.push('<button class="xl-stack" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'team:' + r.teamId })) + '\' ' +
    'style="top:' + XL.HEAD + 'px;height:' + XL.BH + 'px">');
  /* 顏色是「那一趟他們去了哪裡」，不是「第幾行」。

     本來一整行同一個顏色，因為那時候第幾層是算出來的——同一個深度
     全班一定在同一層。地方改成他們自己選之後那條規則就不成立了：
     一條看下來是那一組走過的路線。

     還在老師那邊的那一塊還沒有路線可讀（route 只收被收下的），
     所以它用最後一個去過的地方，沒有就用第一個地層。 */
  var route = r.route || [];
  for (var k = 0; k < n; k++) {
    var wait = (k === n - 1) && r.pending;
    var zk = route[k] || route[route.length - 1] || strataAt(0, classId).key;
    H.push('<i class="xl-b ' + zk + (wait ? ' wait' : ' on') +
      '" style="--k:' + k + '"></i>');
  }
  H.push('</button>');

  /* 角色站在自己那一條的最後一塊上面，腳踩在條的上緣。點他看那一個人。

     本來人站在最深的那一格裡。搬到條上面來，是因為一整排人的左右
     就是一整排的長短——誰疊得多，不用讀任何數字。
     還沒疊到任何一塊的那一組站在起點上，不是站在空中。 */
  var hr = r.hero || HERO;
  H.push('<button class="xl-hero' + (r.stall >= 2 && !left ? ' sleep' : '') +
    '" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'person:' + r.teamId })) + '\' title="' +
    esc(shortName(r.name)) + '" style="--k:' + Math.max(0, n - 1) + '">');
  /* 兩幀，會呼吸。本來這裡只畫一張 hr.idle——廊道裡的人在呼吸，
     這一頁上的六個人是凍住的，所以那一頁讀起來像圖表不像有人住在裡面。
     停很久的那一組睡著（睡著只有一張圖），走出去的那一組舉手。 */
  if (left) {
    H.push(pxTag(hr.win, hr.pal, 'ch-s'));
  } else if (r.stall >= 2) {
    H.push(pxTag(hr.sleep, hr.pal, 'ch-s'));
  } else {
    H.push(pxTag(hr.idleA, hr.pal, 'ch-s wf wa'));
    H.push(pxTag(hr.idleB, hr.pal, 'ch-s wf wb'));
  }
  if (r.stall === 1) H.push(pxTag(VINE.px, VINE.pal, 'vine-s'));
  H.push('</button>');

  /* 走出去的那一組，那一條的盡頭是一道光。
     別人看得到「他們走出去了」——而那跟估得準不準無關。 */
  if (left) H.push('<span class="xl-exit" style="top:' + XL.HEAD +
    'px;--k:' + n + '"></span>');

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
  H.push(patTag(c, (s || STRATA[0]).pal, 'fa-px'));
  H.push('<div>');
  H.push('<div class="eyebrow">' + esc(c.r) + '</div>');
  H.push('<h2>' + esc(c.n) + '</h2>');
  H.push('<p class="lead">' + esc(c.t) + '</p>');
  H.push('</div></div></div>');
  return H.join('');
}

ACTS.fauna = function (name) { DRAFT.fa = name; render(); };


/* 點開的那一張任務之證。別組的也點得開——那是這張圖上唯一會一直
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
  /* 岩壁裡那幾隻不再是鈕（見 xsPlace），所以這裡也不再有那張卡。
     要查一隻去圖鑑。 */
  /* 排行榜搬到底下「估得準」那一段。刻意加進來、準備好隨時拿掉的
     ——見 68-rank.js。要拿掉就刪掉那一段跟那兩個檔案。 */
  /* 「石頭變了」那張卡拿掉了。

     它寫的是「你走到新的一層了」，而這一版的地形跟走多少刻意脫鉤：
     六層沒有先後、順序一個班洗一次、顏色只看第幾塊。一張說
     「你到了新的一層」的卡，跟整張圖在講的事情剛好相反。

     那六層是什麼，圖鑑那一頁有全部六張。 */

  /* 留記號是一件在等你做的事，不是一段可以切走的內容，
     所以它跟圖一起留在上面。 */

  /* ── 底下分成三段，一次只看一段 ──
     本來是直的疊在一起，一路捲到兩千像素。捲到底的東西等於沒有。 */
  var dt = DRAFT.dt && teamOf(DRAFT.dt);
  /* 預設是「各組」：大家的進度放在一起的那一張（見 68c-coinrank.js
     的 bothCard）。本來是金幣那一張——一打開班級頁面先看到錢的排名，
     跟這個作品在講的事情調性不合。

     藏起來的東西不會發生任何事，所以它還是預設打開的，只是換成
     兩個數字並排的那一張。 */
  var tab = DRAFT.tab || (dt ? 'team' : 'map');
  if (tab === 'team' && !dt) tab = 'map';

  /* 剖面圖也是一格。本來它一直釘在最上面，底下再切三格——所以那張圖
     永遠佔掉一整個螢幕的高度，底下那幾格每次都要先捲過它。

     四格，一次只看一個。點圖上的某一組會直接跳到那一組那一格
     （見 55-ui.js 的 digteam），所以圖跟細節之間還是一下就到。 */
  var segs = [['map', '剖面圖'], ['both', '各組'], ['feed', '最近']];
  if (dt) segs.push(['team', shortName(dt.name)]);
  H.push('<div class="segs">');
  segs.forEach(function (sg) {
    H.push('<button class="seg' + (tab === sg[0] ? ' on' : '') +
      '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'tab:' + sg[0] })) + '\'>' + esc(sg[1]) + '</button>');
  });
  H.push('</div>');

  if (tab === 'map') {
    H.push(xsScene(rows, t.teamId, t.classId));
  } else if (tab === 'both') {
    /* 這一張是刻意加進來、而且準備好隨時拿掉的（見 68-rank.js 檔頭）。
       要拿掉：刪掉 68-rank.js、68c-coinrank.js、58-rank.css，
       再把這一段跟 segs 裡的 'both' 拿走。沒有別的地方依賴它。 */
    H.push(bothCard(t.classId, t.teamId));
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
  /* 班級加入碼要一直看得到——學生用那一串建帳號，而老師是唸它的人。
     不放在這裡的話，他得去一個不存在的地方找。 */
  var kls = classOf(u);
  /* 每一條都是他的，所以沒有一條要鑲金邊。

     三位老師共同帶一個班：金邊本來標的是「我帶的那幾組」，而那個
     關係已經沒有了——照舊傳下去的話每一條都會鑲上金邊，副標還會
     寫「金邊的是你帶的 6 組」，等於用一個標記講「全部」。
     一個標到每一個東西上的標記，不標任何東西。

     學生那一邊沒變：他傳自己那一組進去，金邊還是「你在這裡」。 */
  var mine = [];
  var H = [head('各組進度', '整個課程　·　' +
    ecoRows(u.classId).length + ' 組', '')];

  /* 那一串是唸出去的：學生用它建帳號。放在最上面，因為開學前兩週
     他每次進來都要唸一次。 */
  if (kls && kls.joinCode) {
    H.push('<div class="card quiet"><div class="eyebrow">班級加入碼</div>' +
      '<b class="joincode">' + esc(kls.joinCode) + '</b>' +
      '<p class="dim">學生跟另外幾位老師都用這組碼建帳號。</p></div>');
  }

  /* 剖面圖已經畫出每一組走到哪、正在走哪一趟、誰在等你看。
     這一頁本來在底下又用文字卡把同樣的事一組一張再列一遍——
     五組五張，整頁 3424px，是全系統最高的一頁。刪掉了。

     要細節就點那一組（digTeamCard 會攤開他們走過的每一趟）；
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
