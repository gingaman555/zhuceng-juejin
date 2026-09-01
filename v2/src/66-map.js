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
var MAP_T = 30;   /* 上面那一條：組名與地表線 */

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

  /* 地表。從格子開始的地方畫起，不要壓到左邊那一條。 */
  out.push('<div class="dig-sky" style="left:' + MAP_L + 'px;top:' + (MAP_T - 4) +
    'px;width:' + (DIG.W * DIG.CELL) + 'px"></div>');

  for (var y = 0; y < rows; y++) {
    var z = strataAt(y, classId);
    var cy = MAP_T + y * DIG.CELL;
    for (var x = 0; x < DIG.W; x++) {
      var o = own[x + ',' + y];
      var st = 'left:' + (MAP_L + x * DIG.CELL) + 'px;top:' + cy + 'px';
      if (o) {
        out.push('<button class="dg-c dug' + (o === meId ? ' mine' : '') +
          '" style="' + st + ';background:' + hue[o] + '" ' +
          'data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'digteam:' + o })) + '\' ' +
          'title="' + esc(teamOf(o).name) + '"></button>');
      } else if (open[x + ',' + y]) {
        out.push('<button class="dg-c rock can' + (hot[x + ',' + y] ? ' hot' : '') + ' ' + z.key + '" style="' + st + '" ' +
          'data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'dig:' + x + ',' + y })) + '\' ' +
          'title="打通這一格"></button>');
      } else {
        out.push('<div class="dg-c rock' + (hot[x + ',' + y] ? ' hot2' : '') +
          ' ' + z.key + '" style="' + st + '"></div>');
      }
    }
    /* 層的名字放在左邊那一條裡，一層只標一次。 */
    if (y % ZONE_SPAN === 0) {
      out.push('<div class="dig-z ' + z.key + '" style="top:' + (cy + 6) + 'px">' +
        esc(z.name) + '</div>');
    }
  }

  /* 組名掛在上面那一條裡，對齊它最上面那一格。 */
  teams.forEach(function (t) {
    var cs = t.cells || [];
    if (!cs.length) return;
    var top = cs[0];
    cs.forEach(function (c) { if (c[1] < top[1]) top = c; });
    out.push('<div class="dig-n' + (t.teamId === meId ? ' mine' : '') +
      '" style="left:' + (MAP_L + top[0] * DIG.CELL - 11) + 'px;top:6px;color:' +
      hue[t.teamId] + '">' + esc(shortName(t.name)) + '</div>');
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
