/* 全班共用的一片岩層，一格一格被打通。

   PaGamO 真正在運作的不是問答，是「共用地圖上你的顏色會擴散」。
   把問答拿掉、換成專案之後，剩下的那個機制是：

     · 一片全班共用、不會重置的地
     · 你做的事會在上面留下永久看得見的痕跡
     · 地圖本身就是介面，不是一張儀表板
     · 你會看到旁邊的人在長大
     · 兩塊地會靠在一起

   本來的全班地下城是五根平行的柱子——那是有美術的長條圖，不是領土。
   改成方格：每封存一趟，選一個方向打通一格。一個學期下來全班刻出一座
   真的洞窟，每個班長得都不一樣，而且兩組走著走著會打通。

   要小心的一條：面積 ＝ 走完幾趟，所以面積還是看得出多寡。
   跟深度一樣，我們已經接受它看得見，靠的是別的地方擋住比較——
   每一格一樣大、沒有計數、沒有排序、路線隨機所以顏色的分布沒有優劣。
   兩組同樣五格可以長得完全不一樣，因為往哪裡打通是他們自己選的。

   選方向不影響任何判定。它給的是「這是我們打通的」——那才是重點。 */

var DIG = {
  W: 15,      /* 幾欄。一個班五組，每組中間留得下彼此 */
  CELL: 40    /* 一格幾 px */
};

/* 這一組打通的每一格 */
function cellsOf(teamId) {
  var t = teamOf(teamId);
  return (t && t.cells) || [];
}

/* 誰佔了這一格。沒有人就回空字串。 */
function ownerAt(classId, x, y) {
  var who = '';
  where('Teams', function (t) { return t.classId === classId; }).forEach(function (t) {
    (t.cells || []).forEach(function (c) { if (c[0] === x && c[1] === y) who = t.teamId; });
  });
  return who;
}

/* 一組的起點：照名冊順序在最上面一排分開站，中間留得下彼此。 */
function startCell(classId, teamId) {
  var list = where('Teams', function (t) { return t.classId === classId; });
  var i = 0;
  list.forEach(function (t, n) { if (t.teamId === teamId) i = n; });
  var step = Math.max(2, Math.floor(DIG.W / Math.max(1, list.length)));
  return [Math.min(DIG.W - 1, Math.floor(step / 2) + i * step), 0];
}

/* 下一格可以打通哪裡：已經打通的那幾格的上下左右，而且還沒有人佔。
   往上不能通到地表（y < 0）。 */
function openCells(classId, teamId) {
  var mine = cellsOf(teamId);
  if (!mine.length) return [startCell(classId, teamId)];
  var seen = {}, out = [];
  mine.forEach(function (c) {
    [[0, 1], [1, 0], [-1, 0], [0, -1]].forEach(function (d) {
      var x = c[0] + d[0], y = c[1] + d[1];
      if (x < 0 || x >= DIG.W || y < 0) return;
      var k = x + ',' + y;
      if (seen[k]) return;
      if (ownerAt(classId, x, y)) return;
      seen[k] = 1;
      out.push([x, y]);
    });
  });
  /* 往下的排前面——那是最直覺的方向，不用想也點得下去。 */
  out.sort(function (a, b) { return (b[1] - a[1]) || (a[0] - b[0]); });
  return out;
}

/* 打通一格。cell 沒給就往下——不選也走得完。 */
function digCell(classId, teamId, cell) {
  var t = teamOf(teamId);
  if (!t) return null;
  var open = openCells(classId, teamId);
  var pick = null;
  if (cell) {
    open.forEach(function (c) { if (c[0] === cell[0] && c[1] === cell[1]) pick = c; });
  }
  if (!pick) pick = open[0];
  if (!pick) return null;
  t.cells = (t.cells || []).concat([pick]);
  save();
  return pick;
}

/* 還有幾格可以打通 */
function claimsOf(teamId) {
  var t = teamOf(teamId);
  return (t && t.claims) || 0;
}

/* 點下去，那一格變成你的。
   有權利才點得動；點的那一格必須跟自己已經打通的那幾格相鄰。 */
function actClaimCell(classId, teamId, x, y) {
  var t = teamOf(teamId);
  if (!t || !(t.claims > 0)) return null;
  var ok = false;
  openCells(classId, teamId).forEach(function (c) {
    if (c[0] === x && c[1] === y) ok = true;
  });
  if (!ok) return null;
  t.cells = (t.cells || []).concat([[x, y]]);
  t.claims--;
  save();
  logEvent('claim', { teamId: teamId, cell: x + ',' + y });
  return [x, y];
}

/* 這一組的顏色。照名冊順序給，不照表現。 */
function teamHue(classId, teamId) {
  var list = where('Teams', function (t) { return t.classId === classId; });
  var i = 0;
  list.forEach(function (t, n) { if (t.teamId === teamId) i = n; });
  return ACT_HUE[i % ACT_HUE.length];
}

/* ---------- 兩組都構得到的那幾格 ----------

   最軟的一種競爭：那一格兩組都打得通，誰先點誰拿走。

   軟在哪裡——沒有名次、沒有分數、也不會失去任何已經有的東西。
   輸掉的代價只是「往別的方向長」，而方向本來就是自己選的。
   它給的是一個理由：早一點去看那張圖。

   這是 PaGamO 的競爭元素裡唯一能留的那一半：它搶的是還沒有人要的地，
   不是別人已經有的地。搶別人的地會讓人為了「不要失去」而上線，
   那是受控動機，而這個作品要證的正好是自發。 */
function contestedCells(classId) {
  var n = {};
  where('Teams', function (t) { return t.classId === classId; }).forEach(function (t) {
    if (!(t.cells || []).length) return;
    openCells(classId, t.teamId).forEach(function (c) {
      var k = c[0] + ',' + c[1];
      n[k] = (n[k] || 0) + 1;
    });
  });
  var out = {};
  Object.keys(n).forEach(function (k) { if (n[k] > 1) out[k] = n[k]; });
  return out;
}

/* 打通到旁邊碰在一起的兩組。這是這張圖上最好的一件事：
   「甲組跟丙組打通了」是一個會真的發生的教室事件，而且它不是比較。 */
function neighbours(classId) {
  var pairs = {};
  var list = where('Teams', function (t) { return t.classId === classId; });
  list.forEach(function (t) {
    (t.cells || []).forEach(function (c) {
      [[0, 1], [1, 0], [-1, 0], [0, -1]].forEach(function (d) {
        var o = ownerAt(classId, c[0] + d[0], c[1] + d[1]);
        if (!o || o === t.teamId) return;
        var k = [t.teamId, o].sort().join('|');
        pairs[k] = 1;
      });
    });
  });
  return Object.keys(pairs).map(function (k) {
    var ab = k.split('|');
    return [teamOf(ab[0]), teamOf(ab[1])];
  });
}
