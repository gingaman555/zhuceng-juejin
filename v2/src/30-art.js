/* 像素圖與「哪一隻／哪一件」的算法。

   這裡的函式全都是純函式：同樣的輸入永遠得到同一隻、同一件。
   沒有任何一個地方會在 render 的時候擲骰子——抽掉落物是後端抽完存起來的，
   畫面只負責把存好的那幾件畫出來。 */

/* 字串雜湊。同一個字串永遠得到同一個數字，兩端都用它。 */
function hash(s) {
  var h = 2166136261;
  s = String(s);
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return h >>> 0;
}

var REGION_L = { '微光荒原': 1, '水晶迴廊': 2, '迴聲迷宮': 3, '熔火深淵': 4 };

/* 依領域分好組，索引就是那一區的第幾個 */
var MOB = [[], [], [], []], DEB = [[], [], [], []], TRO = [[], [], [], []];
PACK.creatures.forEach(function (c) { var L = REGION_L[c.r]; if (L) MOB[L - 1].push(c); });
PACK.trophies.forEach(function (t) { var L = REGION_L[t.r]; if (L) TRO[L - 1].push(t); });
/* 掉落物照「領域 → 稀有度」排，所以整條 1..108 的編號就是「第幾區的第幾件」 */
var FINDS = [];
[0, 1, 2, 3].forEach(function (li) {
  ['常見', '少見', '罕見'].forEach(function (q) {
    PACK.debris.forEach(function (d) {
      if (REGION_L[d.r] !== li + 1 || d.q !== q) return;
      var item = { id: FINDS.length + 1, name: d.n, look: d.l, tier: q, L: li + 1, px: d.px };
      FINDS.push(item); DEB[li].push(item);
    });
  });
});

/* ---------- 畫 ---------- */

var ART_CACHE = {};

/* 像素字元：. 透明 · # 身體 · + 陰影 · * 反光 */
function pxSvg(px, pal, dim) {
  if (!px || !px.length) return '';
  var key = px.join('') + '|' + pal['#'] + '|' + (dim ? 1 : 0);
  if (ART_CACHE[key]) return ART_CACHE[key];
  var W = px[0].length, out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
    W + ' ' + px.length + '" shape-rendering="crispEdges">'];
  px.forEach(function (row, y) {
    for (var x = 0; x < row.length; x++) {
      var ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      var fill = ch === '*' ? pal['*'] : (ch === '+' || ch === 'o') ? pal.o : ch === '~' ? (pal['~'] || pal.o) : pal['#'];
      out.push('<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + fill + '"' +
        (dim ? ' opacity=".26"' : '') + '/>');
    }
  });
  out.push('</svg>');
  ART_CACHE[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(out.join(''));
  return ART_CACHE[key];
}

function layerPal(L) { return (LAYERS[clamp(1, 4, Number(L) || 1) - 1]).pal; }

function mobArt(c, dim) { return pxSvg(c.px, layerPal(c.L || REGION_L[c.r] || 1), dim); }
function bossArt(b, dim) { return pxSvg(b.px, b.hue, dim); }

/* ---------- 誰擋在這一項前面 ---------- */
/* 同一項任務，不同組遇到的不是同一隻——由任務 id ＋ 組 id 算出來。
   所以「你打贏的那一隻」是你們這一組的事，別組講的是另一隻。 */
function mobFor(taskId, teamId, layer) {
  var list = MOB[clamp(1, 4, layer) - 1];
  var c = list[hash(taskId + '/' + teamId) % list.length];
  return { name: c.n, trait: c.t, px: c.px, L: layer, region: c.r };
}

/* ---------- 抽掉落物 ---------- */
/* 走到第 L 層時，第 1..L 層的都抽得到。稀有度只影響出現機率——
   每一件都一樣重，所以運氣不會決定名次。 */
var TIER_W = { '常見': 60, '少見': 32, '罕見': 8 };

function rollFinds(layer, n, seed) {
  var pool = [];
  for (var i = 0; i < clamp(1, 4, layer); i++) pool = pool.concat(DEB[i]);
  var out = [], h = hash(seed);
  for (var k = 0; k < n; k++) {
    var total = 0, j;
    for (j = 0; j < pool.length; j++) total += TIER_W[pool[j].tier];
    h = (h * 1664525 + 1013904223) >>> 0;
    var pick = (h / 4294967296) * total, acc = 0, chosen = pool[0];
    for (j = 0; j < pool.length; j++) { acc += TIER_W[pool[j].tier]; if (pick < acc) { chosen = pool[j]; break; } }
    out.push(chosen.id);
  }
  return out;
}

/* 守關戰利品：一區六件。放行一層時攤開還沒拿過的裡面的三件，
   讓他們自己挑一件帶走。

   攤開哪三件由「組 ＋ 層」算出來，是純函式——同一組在同一層永遠看到
   同一組三件。它讀不到任何跟表現有關的東西（分數、輪數、天數都不在
   參數裡），所以它不可能變成一個評價。 */
function offerTrophies(layer, ownedIds, seed) {
  var list = TRO[clamp(1, 4, layer) - 1];
  var left = list.filter(function (t) { return ownedIds.indexOf(troId(t)) < 0; });
  if (left.length <= RULES.OFFER) return left.map(troId);
  var h = hash(seed), out = [], pool = left.slice();
  for (var k = 0; k < RULES.OFFER; k++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    out.push(troId(pool.splice(h % pool.length, 1)[0]));
  }
  return out;
}

function troOf(id) {
  for (var L = 0; L < 4; L++)
    for (var i = 0; i < TRO[L].length; i++)
      if (troId(TRO[L][i]) === id) return TRO[L][i];
  return null;
}
function troLayer(id) { return Math.floor(Number(String(id).slice(1)) / 100); }
function troId(t) { return 'T' + (REGION_L[t.r] * 100 + TRO[REGION_L[t.r] - 1].indexOf(t)); }

/* ---------- 你自己的那一隻 ＋ 那一件 ---------- */
/* 從帳號算出來，別人拿不到同一組。不算在 44／136 裡——
   它不是收集進度的一格，是「這一趟從第一天就有的東西」。 */
var MAT = ['霧', '砂', '苔', '灰', '晶', '稜', '光', '脈', '聲', '影', '空', '迴', '燼', '熔', '銹', '焰'];
var ACT = ['面', '擬', '漲', '蝕', '織', '眠', '潛', '裂', '銜'];
var SUF = ['者', '母', '群', '獸'];

function ownMob(account) {
  var h = hash('mob:' + account);
  var body = PACK.creatures[h % PACK.creatures.length];
  var hue = (hash('hue:' + account) % 360);
  var pal = {
    '#': 'hsl(' + hue + ',48%,58%)',
    o:   'hsl(' + hue + ',44%,34%)',
    '*': 'hsl(' + hue + ',60%,84%)'
  };
  var name = (h % 2)
    ? MAT[h % MAT.length] + ACT[(h >> 4) % ACT.length] + SUF[(h >> 8) % SUF.length]
    : ACT[(h >> 4) % ACT.length] + MAT[h % MAT.length] + SUF[(h >> 8) % SUF.length];
  return { name: name, trait: body.t, px: body.px, pal: pal, own: true };
}

function ownFind(account) {
  var h = hash('find:' + account);
  var body = FINDS[h % FINDS.length];
  var hue = (hash('fhue:' + account) % 360);
  return {
    name: MAT[h % MAT.length] + ['砂', '晶', '片', '核', '塊'][(h >> 6) % 5],
    look: body.look, px: body.px, own: true,
    pal: { '#': 'hsl(' + hue + ',44%,60%)', o: 'hsl(' + hue + ',40%,36%)', '*': 'hsl(' + hue + ',58%,86%)' }
  };
}

/* ---------- 圖鑑的總量 ---------- */
/* 生物 44 ＝ 一區 10 隻普通 ＋ 4 隻守關。
   物品 136 ＝ 108 掉落物 ＋ 24 戰利品 ＋ 4 道具。 */
var TOTAL_MOB = PACK.creatures.length + PACK.bosses.length;
var TOTAL_ITEM = FINDS.length + PACK.trophies.length + LAYERS.length;
