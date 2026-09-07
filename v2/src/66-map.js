/* 班級地下城：一片被打通的岩層。

   本來是五根平行的柱子，深度一根一根往下——那是有美術的長條圖。
   現在是一片方格：每一組封存一趟就打通一格，往哪裡打通是他們自己選的。
   一個學期下來全班刻出一座真的洞窟，每個班長得都不一樣。

   這張圖上沒有名次、沒有計數、沒有排序。看得到的是形狀，
   而形狀是每一組自己挑出來的。

   版面留邊，這件事第一版做壞了：組名放在 top:-18px，整排被切掉看不見；
   層的名字壓在最左邊那一組的格子上。所以左邊留一條給層名、
   上面留一條給組名與地表線，格子從那兩條之後才開始。 */

var MAP_L = 88;   /* 左邊那一條：層的名字 */
var MAP_T = 72;   /* 上面那一條：地表。天、林子、組名、每一組的井口 */

/* 岩層裡長什麼東西，直接用廊道那一套。同一層在兩個地方長的是同一種
   東西，不然那兩個畫面就不是同一座地下城。 */
var MAP_PX = {
  rubble: RUBBLE, crystal: CRYSTAL, shroom: SHROOM, bolt: BOLT, ember: EMBER
};

function mapSurface(classId, teams, hue, meId) {
  var W = DIG.W * DIG.CELL;
  var H = ['<div class="dig-sky" style="left:0;width:' + (MAP_L + W) + 'px;height:' +
    MAP_T + 'px"></div>'];

  /* 林子。位置與高矮用班級算，所以每個班的地表長得不一樣，
     而且同一個班每次打開都一樣。 */
  for (var i = -2; i < DIG.W; i++) {
    var h = hash(classId + 'tree' + i);
    if (h % 100 < 38) continue;
    var th = 16 + (h >>> 3) % 14;
    var tx = MAP_L + i * DIG.CELL + ((h >>> 7) % (DIG.CELL - 14));
    H.push('<div class="dig-tree" style="left:' + tx + 'px;top:' +
      (MAP_T - 8 - th) + 'px;height:' + th + 'px"></div>');
  }

  /* 地面那一條。硬邊，沒有漸層——泥土在上，岩層從這裡開始。 */
  H.push('<div class="dig-scrystal" style="left:0;top:' + (MAP_T - 8) +
    'px;width:' + (MAP_L + W) + 'px"></div>');

  return H.join('');
}

/* 岩層交界。每一欄的高度用座標算：0、3、6 px 三種，所以那一條是犬牙
   交錯的。一條直線會讓整張圖讀起來像表格，而它應該讀起來像地質。 */
function zoneSeam(classId, y, cy, above) {
  var H = [];
  for (var x = 0; x < DIG.W; x++) {
    var h = hash(classId + 'seam' + y + ',' + x) % 3;
    if (!h) continue;
    H.push('<div class="dig-seam ' + above.key + '" style="left:' +
      (MAP_L + x * DIG.CELL) + 'px;top:' + cy + 'px;height:' + (h * 3) + 'px"></div>');
  }
  return H.join('');
}

/* 這一格的岩層裡有什麼。用班級與座標算，不擲骰子——
   每次重畫水晶都跳一次的話，那就不是一個地方。 */
function mapProp(classId, x, y, z) {
  var p = propFor(classId + 'map', y * DIG.W + x, z.key);
  var g = MAP_PX[p];
  if (!g) return '';
  var h = hash(classId + 'p' + x + ',' + y);
  return '<img class="px mp" src="' + pxSvg(g.px, z.pal) + '" alt="" style="left:' +
    (3 + h % 18) + 'px;bottom:' + (2 + (h >>> 5) % 12) + 'px">';
}

/* 「第一組 · 甲」在格子上方只放得下兩三個字。 */
function shortName(n) {
  var m = String(n).split('·');
  return (m[1] || m[0]).trim().slice(0, 4);
}

/* 點一組：看他們走到哪一層、封存過哪幾根。 */
ACTS.digteam = function (id) { DRAFT.dt = id; render(); };

function digTeamCard(classId) {
  if (!DRAFT.dt) return '';
  var t = teamOf(DRAFT.dt);
  if (!t) return '';
  var z = zoneNow(t.teamId);
  var H = ['<div class="card dtcard fa ' + z.key + '">'];
  H.push('<div class="radar-head">');
  H.push(pxTag(signOf(t.teamId).px, signOf(t.teamId).pal, 'sign-s'));
  /* 大的是專案名，不是組名——跟剖面圖上的欄頭同一個層級。 */
  H.push('<b>' + esc(t.project || '（還沒定）') + '</b>');
  H.push('<span class="dim">' + esc(t.name) + '</span>');
  H.push('<span class="sp"></span>');
  H.push('<span class="dim">' + esc(z.name) + '</span>');
  H.push('</div>');

  /* 這裡本來還有一排記號架，每一格寫「名字＋幾天」——沒取名的時候
     名字就是「4 天」，所以那一格變成「4 天 4 天」。而且整排跟底下的
     紀錄講的是同一批東西，只是少了任務名跟兩個數字。
     兩個一樣的東西並排，先出現的那個就是雜訊。 */
  /* ── 他們的紀錄 ──

     點進一組，該看到的是這個。本來這裡只有招牌跟他們留下的東西——
     那是他們的裝飾，不是他們的紀錄。

     一列＝一趟：任務、說幾天、實際幾天、準不準。
     不放老師回的話，也不放他們寫的困境——那兩樣是他們跟老師之間的事。
     放的是兩個數字跟一個他們自己取的名字，跟你自己那一頁一樣的東西。 */
  var mine = runsFor(t.teamId).filter(function (x) { return x.run.stamp; }).reverse();
  if (mine.length) {
    H.push('<div class="eyebrow" style="margin-top:14px">走過 ' + mine.length + ' 趟</div>');
    H.push('<div class="orec">');
    mine.forEach(function (x) {
      var r = x.run;
      var s = RULES.STAMPS[r.stamp];
      var kp = null;
      keepsOf(t.teamId).forEach(function (k) { if (k.runId === r.runId) kp = k; });
      H.push('<div class="or ' + r.stamp + '">');
      H.push('<span class="or-s">' + (s ? stampPx(s.key) : '') + '</span>');
      H.push('<b>' + esc(x.ms ? x.ms.title : '') + '</b>');
      H.push('<span class="or-n">說 <b>' + r.est + '</b>　實際 <b>' +
        (r.actual || 0) + '</b></span>');
      if (kp && kp.name) H.push('<span class="or-w">「' + esc(kp.name) + '」</span>');
      H.push('</div>');
    });
    H.push('</div>');
  } else {
    H.push('<p class="dim">還沒走完過一趟。</p>');
  }

  H.push('</div>');
  return H.join('');
}

/* buildPick 拿掉了。封存的時候已經自動把那一趟插進那一層（見 actSeal），
   所以它只剩一條回頭路：舊存檔裡有哪一層沒有記號的時候才冒出來。
   而它冒出來的時候講的是「這一趟長成這樣」加一句解釋圖的話加
   「插進水晶迴廊」——沒有一件說得清楚它要你做什麼。
   一條只在資料出錯時出現、出現了又講不清楚的路，不值得留。 */


/* ---------- 這一格裡有什麼 ----------

   打通之後、挑要蓋什麼之前，先看到裡面的東西。
   這是這個系統唯一「你不知道會遇到什麼」的地方——
   本來每一格都是空的，打通就只是變色。

   準跟失準看到的不一樣，但拿到的一樣多：那一格、那座建築、那根岩心、
   那一筆圖鑑，兩邊都有。差的是你到得早不早——早，牠還在；
   晚，你看到的是牠留下的痕跡。沒有人被扣任何東西。 */
function uncoverCard(t) {
  var r = DRAFT.uncover;
  if (!r) return '';
  var d = buriedDef(r.k);
  if (!d) return '';
  /* DRAFT.build 是那一層的深度。本來是格子地圖的 [x, y]。 */
  var z = strataAt(Number(DRAFT.build) || 0, t.teamId);

  var H = ['<div class="card unc ' + z.key + (r.early ? '' : ' late') + '">'];
  H.push('<div class="unc-in">');

  /* 圖：遇到什麼就畫什麼。沒有圖的就畫那一層的紋理。 */
  if (r.mob) {
    var mo = null;
    allFauna().forEach(function (f) { if (f.n === r.mob) mo = f; });
    if (mo) H.push('<span class="pxwrap">' + pxTag(mo.px, z.pal, 'unc-px' + (r.early ? '' : ' gone')) +
      pxFlash(mo.px) + '</span>');
  } else {
    H.push('<div class="unc-px ' + z.key + ' blank"></div>');
  }

  H.push('<div>');
  H.push('<div class="eyebrow">' + esc(z.name) + '　·　這一格裡</div>');
  H.push('<h2>' + esc(r.mob || d.n) + '</h2>');
  H.push('<p class="lead">' + esc(r.early ? d.here : d.late) + '</p>');

  H.push('</div></div></div>');
  return H.join('');
}
