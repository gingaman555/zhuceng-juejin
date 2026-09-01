/* 全班地下城：一片被打通的岩層。

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

/* 一塊地的輪廓：只有對外的那幾邊要描。內部的接縫不描，
   五格連在一起才會讀成一塊地而不是五個方塊。
   光還是從左上來，但現在照的是整塊地。 */
function edgeShadow(own, x, y, who) {
  var s = [];
  var up = own[x + ',' + (y - 1)] === who;
  var dn = own[x + ',' + (y + 1)] === who;
  var lf = own[(x - 1) + ',' + y] === who;
  var rt = own[(x + 1) + ',' + y] === who;
  if (!up) s.push('inset 0 3px 0 rgba(255,255,255,.38)');
  if (!lf) s.push('inset 3px 0 0 rgba(255,255,255,.20)');
  if (!dn) s.push('inset 0 -3px 0 rgba(0,0,0,.55)');
  if (!rt) s.push('inset -3px 0 0 rgba(0,0,0,.42)');
  return s.join(',');
}

function digMap(classId, meId) {
  var teams = where('Teams', function (t) { return t.classId === classId; });
  var deep = 0;
  teams.forEach(function (t) {
    (t.cells || []).forEach(function (c) { if (c[1] > deep) deep = c[1]; });
  });
  var rows = Math.max(6, deep + 3);
  var W = MAP_L + DIG.W * DIG.CELL;
  var H = MAP_T + rows * DIG.CELL;

  /* 自己有幾格可以打通。有的話，能打通的那幾格會亮起來、點得動。 */
  var canClaim = meId ? claimsOf(meId) : 0;
  var open = {};
  if (canClaim) {
    openCells(classId, meId).forEach(function (c) { open[c[0] + ',' + c[1]] = 1; });
  }
  /* 兩組都構得到的那幾格。誰先點誰拿走——最軟的一種競爭：
     沒有名次，也不會失去任何已經有的東西。 */
  var hot = contestedCells(classId);

  /* 誰在哪一格，先攤成一張表，不然每一格都要掃一次全班。 */
  var own = {}, hue = {};
  teams.forEach(function (t) {
    hue[t.teamId] = teamHue(classId, t.teamId);
    (t.cells || []).forEach(function (c) { own[c[0] + ',' + c[1]] = t.teamId; });
  });

  var out = ['<div class="dig-wrap"><div class="dig" style="width:' + W +
    'px;height:' + H + 'px">'];

  out.push(mapSurface(classId, teams, hue, meId));

  for (var y = 0; y < rows; y++) {
    var z = strataAt(y, classId);
    var cy = MAP_T + y * DIG.CELL;
    for (var x = 0; x < DIG.W; x++) {
      var o = own[x + ',' + y];
      var st = 'left:' + (MAP_L + x * DIG.CELL) + 'px;top:' + cy + 'px';
      if (o) {
        /* 打通了的地。只描對外的那幾邊。 */
        /* 上面站著那一趟蓋的東西。地是空的沒有意義，
           上面站著東西才是「這是我們的」。 */
        var bd = buildAt(o, x, y);
        var bg = bd && buildDef(bd.k);
        out.push('<button class="dg-c dug' + (o === meId ? ' mine' : '') +
          '" style="' + st + ';background:' + hue[o] + ';box-shadow:' +
          edgeShadow(own, x, y, o) + '" ' +
          'data-act="run" data-p=\'' +
          esc(JSON.stringify({ a: bd ? 'seeb:' + o + ',' + x + ',' + y : 'digteam:' + o })) +
          '\' title="' + esc(teamOf(o).name + (bg ? '　' + bg.name : '')) + '">' +
          (bg ? pxTag(bg.px, BUILD_PAL, 'bld') : '') + '</button>');
      } else if (open[x + ',' + y]) {
        var h = hot[x + ',' + y];
        out.push('<button class="dg-c rock can' + (h ? ' hot' : '') + ' ' + z.key +
          '" style="' + st + '" data-act="run" data-p=\'' +
          esc(JSON.stringify({ a: 'dig:' + x + ',' + y })) + '\' title="' +
          esc(h ? '這一格另一組也構得到——誰先點誰拿走' : '打通這一格') + '"></button>');
      } else {
        /* 還沒打通的岩層。裡面有東西——同一層長的跟廊道裡一樣。 */
        out.push('<div class="dg-c rock v' + (hash(classId + '~' + x + ',' + y) % 3) +
          (hot[x + ',' + y] ? ' hot2' : '') + ' ' + z.key + '" style="' + st + '">' +
          mapProp(classId, x, y, z) + '</div>');
      }
    }
    /* 岩層交界不是一條直線。每一欄的高度用座標算，所以它犬牙交錯，
       看起來像地質不像表格。 */
    if (y > 0 && y % ZONE_SPAN === 0) {
      out.push(zoneSeam(classId, y, cy, strataAt(y - 1, classId)));
    }
    /* 層的名字放在左邊那一條裡，一層只標一次。 */
    if (y % ZONE_SPAN === 0) {
      out.push('<div class="dig-z ' + z.key + '" style="top:' + (cy + 6) + 'px">' +
        esc(z.name) + '</div>');
    }
  }

  /* 角色站在自己最前緣那一格上——下一步會從那裡打通出去。
     有一趟在走的時候他就在那裡走。 */
  if (meId) {
    var mine = cellsOf(meId);
    if (mine.length) {
      var f = mine[mine.length - 1];
      var run = where('Runs', function (r) {
        return r.teamId === meId && r.state === 'running';
      })[0];
      out.push('<div class="dig-hero' + (run ? ' walking' : '') + '" style="left:' +
        (MAP_L + f[0] * DIG.CELL + 4) + 'px;top:' + (MAP_T + f[1] * DIG.CELL - 16) + 'px">');
      if (run) {
        out.push(pxTag(HERO.walkA, HERO.pal, 'ch wf wa'));
        out.push(pxTag(HERO.walkB, HERO.pal, 'ch wf wb'));
      } else {
        out.push(pxTag(HERO.idle, HERO.pal, 'ch'));
      }
      out.push('</div>');
    }
  }

  /* 兩組的地貼在一起的地方長出一條路。別人在旁邊是好事，不是威脅——
     這是這張圖上唯一會因為別人靠近而多出來的東西。 */
  Object.keys(own).forEach(function (k) {
    var p = k.split(','), x = Number(p[0]), y = Number(p[1]);
    if (own[(x + 1) + ',' + y] && own[(x + 1) + ',' + y] !== own[k]) {
      out.push('<div class="dig-link v" style="left:' +
        (MAP_L + (x + 1) * DIG.CELL - 3) + 'px;top:' +
        (MAP_T + y * DIG.CELL + 11) + 'px"></div>');
    }
    if (own[x + ',' + (y + 1)] && own[x + ',' + (y + 1)] !== own[k]) {
      out.push('<div class="dig-link h" style="left:' +
        (MAP_L + x * DIG.CELL + 11) + 'px;top:' +
        (MAP_T + (y + 1) * DIG.CELL - 3) + 'px"></div>');
    }
  });

  out.push('</div></div>');

  /* 有權利的時候說一聲。會亮的那幾格就在畫面上，所以一句就夠。 */
  if (canClaim) {
    out.push('<div class="dig-can">你有 ' + canClaim + ' 格可以打通。點亮起來的那幾格。</div>');
  }

  /* 打通到碰在一起的那幾對。這是這張圖上最好的一件事：
     「甲組跟丙組打通了」是一個會真的發生的教室事件，而且它不是比較。 */
  var nb = neighbours(classId);
  if (nb.length) {
    out.push('<div class="dig-nb">');
    nb.forEach(function (p) {
      if (!p[0] || !p[1]) return;
      out.push('<span>' + esc(p[0].name) + ' ✕ ' + esc(p[1].name) + ' 打通了</span>');
    });
    out.push('</div>');
  }
  return out.join('');
}

/* ---------- 地表 ----------

   本來這裡只有一條 6px 的綠線。有了天空與林子之後，整張圖才有「上面」——
   而「上面」是這個作品唯一的方向感：往下沒有出口，出口在你來的地方。

   根脈層那一句寫「上面那片林子的根穿下來」，現在圖上看得到那片林子。

   每一組的井口畫在他們的起點那一欄：那是他們下來的地方。 */
function mapSurface(classId, teams, hue, meId) {
  var W = DIG.W * DIG.CELL;
  var H = ['<div class="dig-sky" style="left:0;width:' + (MAP_L + W) + 'px;height:' +
    MAP_T + 'px"></div>'];

  /* 林子。位置與高矮用班級算，所以每個班的地表長得不一樣，
     而且同一個班每次打開都一樣。 */
  for (var i = -2; i < DIG.W; i++) {
    var h = hash(classId + 'tree' + i);
    if (h % 100 < 38) continue;
    var th = 16 + (h >> 3) % 14;
    var tx = MAP_L + i * DIG.CELL + ((h >> 7) % (DIG.CELL - 14));
    H.push('<div class="dig-tree" style="left:' + tx + 'px;top:' +
      (MAP_T - 8 - th) + 'px;height:' + th + 'px"></div>');
  }

  /* 地面那一條。硬邊，沒有漸層——泥土在上，岩層從這裡開始。 */
  H.push('<div class="dig-soil" style="left:0;top:' + (MAP_T - 8) +
    'px;width:' + (MAP_L + W) + 'px"></div>');

  /* 每一組下來的井口，加一道光。 */
  teams.forEach(function (t) {
    var st = startCell(classId, t.teamId);
    var x = MAP_L + st[0] * DIG.CELL;
    H.push('<div class="dig-shaft' + (t.teamId === meId ? ' mine' : '') +
      '" style="left:' + x + 'px;top:' + (MAP_T - 8) + 'px"></div>');
    H.push('<div class="dig-n' + (t.teamId === meId ? ' mine' : '') +
      '" style="left:' + (x - 11) + 'px;top:' + (MAP_T - 30) + 'px;color:' +
      hue[t.teamId] + '">' + esc(shortName(t.name)) + '</div>');
  });
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
   每次重畫石頭都跳一次的話，那就不是一個地方。 */
function mapProp(classId, x, y, z) {
  var p = propFor(classId + 'map', y * DIG.W + x, z.key);
  var g = MAP_PX[p];
  if (!g) return '';
  var h = hash(classId + 'p' + x + ',' + y);
  return '<img class="px mp" src="' + pxSvg(g.px, z.pal) + '" alt="" style="left:' +
    (3 + h % 18) + 'px;bottom:' + (2 + (h >> 5) % 12) + 'px">';
}

/* 「第一組 · 甲」在格子上方只放得下兩三個字。 */
function shortName(n) {
  var m = String(n).split('·');
  return (m[1] || m[0]).trim().slice(0, 4);
}

/* 點一組：看他們走到哪一層、封存過哪幾根。 */
ACTS.digteam = function (id) { DRAFT.dt = id; DRAFT.ck = null; render(); };

function digTeamCard(classId) {
  if (!DRAFT.dt) return '';
  var t = teamOf(DRAFT.dt);
  if (!t) return '';
  var ks = keepsOf(t.teamId).slice().reverse();
  var z = strataAt(depthOf(t.teamId), t.teamId);
  var H = ['<div class="card fa ' + z.key + '">'];
  H.push('<div class="radar-head">');
  H.push(pxTag(signOf(t.teamId).px, signOf(t.teamId).pal, 'sign-s'));
  H.push('<b>' + esc(t.name) + '</b>');
  H.push('<span class="dim">' + esc(t.project || '（還沒定）') + '</span>');
  H.push('<span class="sp"></span>');
  H.push('<span class="dim">' + esc(z.name) + '</span>');
  H.push('</div>');
  if (ks.length) {
    H.push('<div class="rack">');
    ks.forEach(function (k) {
      var kz = STRATA[0];
      STRATA.forEach(function (x) { if (x.key === k.zone) kz = x; });
      H.push('<div class="rk">');
      H.push(pxTag(k.px || coreOf(k.runId), kz.pal, 'core'));
      H.push('<b>' + esc(k.name || '') + '</b>');
      H.push('<span>' + (k.elapsed || 0) + ' 天</span>');
      H.push('</div>');
    });
    H.push('</div>');
  } else {
    H.push('<p class="dim">還沒有封存過的岩心。</p>');
  }
  H.push('</div>');
  return H.join('');
}

/* ---------- 挑要蓋什麼 ----------

   打通完那一格之後跳出來的三選一。這是本來的「三選一裝備」搬過來的位置，
   但東西換了：裝備沒有地方去，蓋的東西有——它就站在你剛打通的那一格上，
   而且全班都看得到。

   三個選項是那一層的全部，沒有強弱，只差在長相。 */
function buildPick(t) {
  var c = DRAFT.build;
  if (!c) return '';
  var z = strataAt(c[1], t.classId);
  var set = buildsIn(z.key);
  if (!set.length) { DRAFT.build = null; return ''; }
  var H = ['<div class="card bpick">'];
  H.push('<div class="eyebrow">在這一格上蓋什麼</div>');
  H.push('<div class="bp-row">');
  set.forEach(function (b) {
    H.push('<button class="bp" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'bld:' + b.key + ',' + c[0] + ',' + c[1] })) + '\'>');
    H.push(pxTag(b.px, BUILD_PAL, 'bp-px'));
    H.push('<b>' + esc(b.name) + '</b>');
    H.push('</button>');
  });
  H.push('</div>');
  H.push('<p class="dim">三個都一樣——它們不改變任何事，只是長得不同。</p>');
  H.push('</div>');
  return H.join('');
}

/* 點地圖上一座建築：那是哪一趟。

   這是整件事的重點。建築不是獎品，是那一趟的紀念碑——
   點下去看到的是他們自己取的名、幾天、他們說幾天。
   所以整片領土就是他們的預估史被畫成一個地方。 */
function buildCard(t) {
  if (!DRAFT.sb) return '';
  var p = DRAFT.sb;
  var st = buildStory(p[0], Number(p[1]), Number(p[2]));
  if (!st || !st.def) return '';
  var tm = teamOf(p[0]);
  var z = strataAt(Number(p[2]), t.classId);
  var H = ['<div class="card bstory ' + z.key + '">'];
  H.push('<div class="bs-in">');
  H.push(pxTag(st.def.px, BUILD_PAL, 'bs-px'));
  H.push('<div>');
  H.push('<div class="eyebrow">' + esc(tm ? tm.name : '') + '　·　' + esc(st.def.name) + '</div>');
  if (st.keep && st.keep.name) {
    H.push('<h2>' + esc(st.keep.name) + '</h2>');
  }
  if (st.run) {
    H.push('<dl class="rep">');
    H.push('<dt>他們說</dt><dd>' + st.run.est + '</dd>');
    H.push('<dt>實際</dt><dd>' + (st.run.actual || st.keep && st.keep.elapsed || 0) + '</dd>');
    H.push('</dl>');
  }
  H.push('</div></div></div>');
  return H.join('');
}
