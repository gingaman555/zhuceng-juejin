/* 全班共用的一片岩層，一格一格被打通。

   PaGamO 真正在運作的不是問答，是「共用地圖上你的顏色會擴散」。
   把問答拿掉、換成專案之後，剩下的那個機制是：

     · 一片全班共用、不會重置的地
     · 你做的事會在上面留下永久看得見的痕跡
     · 地圖本身就是介面，不是一張儀表板
     · 你會看到旁邊的人在長大
     · 兩塊地會靠在一起

   本來的班級地下城是五根平行的柱子——那是有美術的長條圖，不是領土。
   改成方格：每封存一趟，選一個方向打通一格。一個學期下來全班刻出一座
   真的洞窟，每個班長得都不一樣，而且兩組走著走著會打通。

   要小心的一條：面積 ＝ 走完幾趟，所以面積還是看得出多寡。
   跟深度一樣，我們已經接受它看得見，靠的是別的地方擋住比較——
   每一格一樣大、沒有計數、沒有排序、路線隨機所以顏色的分布沒有優劣。
   兩組同樣五格可以長得完全不一樣，因為往哪裡打通是他們自己選的。

   選方向不影響任何判定。它給的是「這是我們打通的」——那才是重點。 */

var DIG = {
  W: 15,      /* 幾欄 */
  H: 11,      /* 幾列。有界是重點：無限深的話每一組都有自己的車道，
                 永遠不會碰到誰，那張圖就會長回五根平行的柱子。
                 一個學期五組大概用掉七十幾格，15×11 會讓大家真的碰到。 */
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
/* 一組從哪裡開始。

   本來是照名冊在第 0 列平均分開——那等於發給每一組一條車道，
   而車道就是長條圖。改成散在二維：用班級與名次算，彼此隔開，
   但不排隊、也不都在最上面。

   誰在上面誰在下面沒有意義：地層的順序是隨機給的，深度不是進度。 */
function startCell(classId, teamId) {
  var list = where('Teams', function (t) { return t.classId === classId; });
  var i = 0;
  list.forEach(function (t, n) { if (t.teamId === teamId) i = n; });
  return scatterStart(classId, i);
}

/* 第 i 組的起點。前面幾組先算出來，隔太近就換一個——
   全部用算的，所以同一個班每次打開都一樣。 */
function scatterStart(classId, i) {
  var used = [];
  for (var n = 0; n <= i; n++) {
    var pick = null;
    for (var k = 0; k < 60 && !pick; k++) {
      var h = hash('start|' + classId + '|' + n + '|' + k);
      var x = h % DIG.W, y = (h >>> 8) % DIG.H;
      var ok = true;
      used.forEach(function (u) {
        if (Math.abs(u[0] - x) + Math.abs(u[1] - y) < 4) ok = false;
      });
      if (ok) pick = [x, y];
    }
    used.push(pick || [n % DIG.W, (n * 3) % DIG.H]);
  }
  return used[i];
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
      if (x < 0 || x >= DIG.W || y < 0 || y >= DIG.H) return;
      var k = x + ',' + y;
      if (seen[k]) return;
      if (ownerAt(classId, x, y)) return;
      seen[k] = 1;
      out.push([x, y]);
    });
  });
  /* 照閱讀順序排，不偏任何方向。
     本來把「往下」排第一，而 digCell 又永遠取第一個——
     兩件事加起來，自動打通永遠是一條往下的直線。 */
  out.sort(function (a, b) { return (a[1] - b[1]) || (a[0] - b[0]); });

  /* 被別人包住了：在別的地方另外開一個口。
     這座地下城本來就寫著「你在哪一層醒來只是你在哪一層醒來」，
     所以換一個地方下去不需要另外解釋。 */
  if (!out.length) {
    for (var y2 = 0; y2 < DIG.H; y2++) {
      for (var x2 = 0; x2 < DIG.W; x2++) {
        if (!ownerAt(classId, x2, y2)) out.push([x2, y2]);
      }
    }
  }
  return out;
}

/* 打通一格。

   沒指定的時候用座標算一個，不要永遠取第一個——永遠取第一個的話
   長出來是一條直線，那就是長條圖。算出來的方向會轉，
   長出來才是一塊地。 */
function digCell(classId, teamId, cell) {
  var t = teamOf(teamId);
  if (!t) return null;
  var open = openCells(classId, teamId);
  var pick = null;
  if (cell) {
    open.forEach(function (c) { if (c[0] === cell[0] && c[1] === cell[1]) pick = c; });
  }
  if (!pick && open.length) {
    pick = open[hash('grow|' + teamId + '|' + (t.cells || []).length) % open.length];
  }
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
