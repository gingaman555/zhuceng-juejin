/* ---------- 六個地方各自長什麼樣 ----------

   在這之前，六個地方在畫面上是六個換了顏色的方塊：故事那一頁的地圖是
   六個色塊，出發前選地方也是六張色卡。名字說「水晶迴廊」，圖上一樣
   水晶都沒有——那張圖沒有在講任何名字沒講過的事。

   所以每個地方真的畫一張。44 × 22，一格一像素，用的是這個作品本來就
   在用的那一套（見 30-art.js 的 pxSvg）。

   六張共用同一套字母（見 13-strata.js 的 spal），所以它們是同一座地下城的
   六個地方，不是六張各畫各的插圖：一樣的天花板、一樣的後牆、一樣的地板，
   換的是那一層自己的東西——天光、根、晶體、方塊、鐵件、火。

   為什麼是 44 × 22：兩倍寬，而且都是 11 的倍數（整份的格子）。
   放大只有整體縮放，沒有拉扁。 */

var PW = 44, PH = 22;

function pxNew(ch) {
  var g = [], x, y;
  for (y = 0; y < PH; y++) { var r = []; for (x = 0; x < PW; x++) r.push(ch); g.push(r); }
  return g;
}
function pxPut(g, x, y, ch) {
  if (x >= 0 && x < PW && y >= 0 && y < PH) g[y][x] = ch;
}
function pxBox(g, x0, y0, x1, y1, ch) {
  for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) pxPut(g, x, y, ch);
}
/* 一張小圖蓋上去。'.' 是不畫——所以水晶、根、晶體都可以手畫，
   底下那片牆是算出來的。 */
function pxArt(g, art, x0, y0) {
  art.forEach(function (row, dy) {
    for (var dx = 0; dx < row.length; dx++) {
      if (row[dx] === '.') continue;
      pxPut(g, x0 + dx, y0 + dy, row[dx]);
    }
  });
}
function pxRows(g) { return g.map(function (r) { return r.join(''); }); }

/* 岩緣的高低。一組 11 格的起伏重複四次——固定的，不是亂數。
   同一個地方每次長得一樣，那是地質，不是特效。 */
var ROOF = [0, 1, 2, 1, 1, 0, 1, 2, 2, 1, 0];
var GRIT = [0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0];

/* 每一張都從同一個洞開始：天花板、後牆、地板。
   差別留給各自那一段。 */
function pxCave(g, off) {
  off = off || 0;
  pxBox(g, 0, 0, PW - 1, 15, 'b');
  var x;
  for (x = 0; x < PW; x++) {
    var up = 2 + ROOF[(x + off) % 11];
    pxBox(g, x, 0, up - 1, 'a');
    pxPut(g, x, up, 'k');
    var dn = 16 - GRIT[(x + 5 + off) % 11];
    pxBox(g, x, dn, dn, 'f');
    pxBox(g, x, dn + 1, PH - 1, 'e');
    pxBox(g, x, dn + 4, PH - 1, 'd');
  }
}

/* ---------- 手畫的小東西 ---------- */

var P_STONE = [
  '..gggg..',
  '.gffffd.',
  'gfffffdd',
  'ffffdddd'
];
var P_PEBBLE = [
  '.ggg.',
  'gfffd',
  'ffddd'
];
var P_ROOT = [
  'hh..', 'hg..', 'hg..', '.hg.', '.hg.', '.hh.', '..hg',
  '..hg', '.hg.', '.hg.', 'hg..', 'hg..', '.g..'
];
var P_ROOT2 = [
  '.hh', '.hg', 'hg.', 'hg.', '.hg', '.hg', 'hg.', 'hg.', '.g.'
];
var P_MUSH = [
  '.jii.',
  'iiiig',
  '..h..'
];
var P_CRY = [
  '..i..', '..i..', '.jii.', '.jii.', 'jiiih', 'jiiih', 'iiihh', 'iihhg'
];
var P_CRYD = [
  'iihhg', 'iiihh', 'jiiih', 'jiiih', '.jii.', '..ih.', '..i..'
];
var P_CRYS = [
  '.i.', 'ji.', 'jih', 'iih'
];
var P_LADDER = [
  'h.....h', 'h.....h', 'hhhhhhh', 'h.....h', 'h.....h', 'hhhhhhh',
  'h.....h', 'h.....h', 'hhhhhhh', 'h.....h', 'g.....g', 'g......'
];
var P_STAL = [
  'ccc', 'ccc', '.cc', '.c.', '.c.'
];

/* ---------- 六個地方 ---------- */

var PLACE_ART = {

  /* 表土。上面破了一個口，天光從那裡直直下來——這一層還照得到，
     名字裡的「微光」就是那道光。地上碎石多。 */
  wild: function (g) {
    pxCave(g, 0);
    /* 往上的井。井壁暗、口緣的碎岩被照亮，天只從井底露出一小塊——
       亮的東西要有邊，不然它就是一根燈管。 */
    pxBox(g, 18, 0, 25, 4, 'k');
    pxBox(g, 20, 0, 23, 1, 'j');
    pxBox(g, 19, 2, 24, 2, 'i');
    pxBox(g, 19, 3, 24, 3, 'g');
    pxBox(g, 17, 2, 17, 4, 'c');
    pxBox(g, 26, 2, 26, 4, 'c');
    pxArt(g, ['.gg.', 'gffd'], 15, 3);
    pxArt(g, ['.gg.', 'dffg'], 27, 3);
    /* 光柱。硬邊、越往下越寬，跟整份一樣不做模糊。 */
    for (var y = 4; y <= 15; y++) {
      var w = 6 + (y - 4);
      var h = Math.floor(w / 2);
      pxBox(g, 22 - h, y, 22 + h, y, 'c');
    }
    /* 落在地上那一塊。 */
    pxBox(g, 11, 16, 33, 16, 'h');
    pxBox(g, 14, 17, 30, 17, 'g');
    pxArt(g, P_STONE, 3, 12);
    pxArt(g, P_PEBBLE, 13, 13);
    pxArt(g, P_STONE, 33, 12);
    pxArt(g, P_PEBBLE, 28, 13);
  },

  /* 上面那片林子的根穿下來。牆是活的，摸起來是濕的——
     所以牆上有纖維狀的直紋，根尖有水在滴，地上長香菇。 */
  root: function (g) {
    pxCave(g, 3);
    var x;
    for (x = 1; x < PW; x += 5) pxBox(g, x, 4, x, 14, 'c');
    pxArt(g, P_ROOT, 5, 3);
    pxArt(g, P_ROOT2, 13, 3);
    pxArt(g, P_ROOT, 20, 3);
    pxArt(g, P_ROOT2, 29, 3);
    pxArt(g, P_ROOT, 35, 3);
    /* 兩條根一路穿到地上。 */
    pxBox(g, 21, 16, 22, 16, 'g');
    pxBox(g, 36, 15, 37, 16, 'g');
    /* 水在滴。 */
    pxPut(g, 15, 14, 'j'); pxPut(g, 31, 13, 'j'); pxPut(g, 7, 17, 'j');
    pxArt(g, P_MUSH, 9, 14);
    pxArt(g, P_MUSH, 26, 14);
  },

  /* 地下水穿過晶體。晶體從地上長起來、也從天花板垂下來，
     地上積著一道水，走通的斷面會折光。 */
  crys: function (g) {
    pxCave(g, 6);
    pxArt(g, P_CRYD, 8, 3);
    pxArt(g, P_CRYD, 30, 3);
    pxArt(g, P_CRYS, 20, 3);
    pxArt(g, P_CRY, 4, 9);
    pxArt(g, P_CRY, 24, 8);
    pxArt(g, P_CRYS, 16, 13);
    pxArt(g, P_CRYS, 34, 13);
    /* 地上那道水，跟水面上的幾點反光。 */
    pxBox(g, 0, 17, PW - 1, 18, 'g');
    pxBox(g, 6, 17, 11, 17, 'h');
    pxBox(g, 25, 17, 31, 17, 'h');
    pxPut(g, 8, 17, 'j'); pxPut(g, 28, 17, 'j'); pxPut(g, 38, 17, 'j');
  },

  /* 方塊狀的硬岩。牆是砌起來的方塊，而通道一個套一個往裡面退——
     你會聽到自己剛剛講的話，就是這個形狀。 */
  echo: function (g) {
    pxCave(g, 2);
    var x, y;
    /* 砌石。橫縫每三格、直縫每五格，隔一排錯開。 */
    for (y = 4; y <= 15; y++) {
      for (x = 0; x < PW; x++) {
        if (y % 3 === 1) pxPut(g, x, y, 'a');
        else if ((x + (y % 6 < 3 ? 0 : 3)) % 6 === 0) pxPut(g, x, y, 'a');
      }
    }
    /* 一個套一個的走道。四層，每一層只有左右兩道壁跟一道頂——
       不封底，所以地是連著的，你走得進去。越裡面越暗，那就是深度。 */
    [[10, 4, 33, 'c', 'a'], [14, 6, 29, 'g', 'k'], [17, 8, 26, 'c', 'a'],
     [20, 10, 23, 'g', 'k']].forEach(function (o) {
      var x0 = o[0], yt = o[1], x1 = o[2];
      pxBox(g, x0 + 1, yt + 1, x1 - 1, 16, o[4]);
      pxBox(g, x0, yt, x1, yt, o[3]);
      pxBox(g, x0, yt, x0, 16, o[3]);
      pxBox(g, x1, yt, x1, 16, o[3]);
    });
    /* 最裡面那一格是全黑的：再往裡就看不到了。 */
    pxBox(g, 21, 11, 22, 16, 'k');
  },

  /* 有人來過。鐵件鏽在岩層裡：一根大梁橫在上面、一段斷掉的梯子、
     地上還留著軌道，接縫都還看得出來。 */
  rust: function (g) {
    pxCave(g, 8);
    var x;
    /* 橫梁與鉚釘。 */
    pxBox(g, 0, 5, PW - 1, 6, 'h');
    pxBox(g, 0, 7, PW - 1, 7, 'g');
    for (x = 2; x < PW; x += 6) pxPut(g, x, 5, 'j');
    /* 鏽從梁上流下來。 */
    [10, 17, 25, 33, 40].forEach(function (sx) {
      pxBox(g, sx, 8, sx + 1, 8 + (sx % 5) + 3, 'g');
      pxPut(g, sx, 8, 'h');
    });
    pxArt(g, P_LADDER, 3, 8);
    /* 地上的軌道。 */
    pxBox(g, 0, 18, PW - 1, 18, 'h');
    pxBox(g, 0, 20, PW - 1, 20, 'h');
    for (x = 1; x < PW; x += 4) pxBox(g, x, 19, x, 19, 'g');
  },

  /* 底下有熱源。裂縫從地板透出來、鐘乳石垂著、火星往上飄，
     最底下那一道就是熱源本身。再往下，你會回到微光荒原。 */
  fire: function (g) {
    pxCave(g, 5);
    var x;
    pxArt(g, P_STAL, 6, 2);
    pxArt(g, P_STAL, 17, 3);
    pxArt(g, P_STAL, 27, 2);
    pxArt(g, P_STAL, 37, 3);
    /* 牆的下半被底下的火烤亮。 */
    pxBox(g, 0, 13, PW - 1, 15, 'c');
    /* 地板上的裂縫。一條裂縫是歪的，不是一個點——所以走三格轉一次。 */
    [2, 13, 25, 36].forEach(function (sx) {
      var cx = sx;
      for (var yy = 16; yy <= 18; yy++) {
        pxPut(g, cx, yy, yy < 18 ? 'i' : 'h');
        pxPut(g, cx + 1, yy, 'h');
        cx += (yy % 2 ? 1 : -1);
      }
    });
    pxBox(g, 8, 16, 11, 16, 'i');
    pxBox(g, 30, 16, 34, 16, 'i');
    /* 火星。 */
    pxPut(g, 8, 11, 'i'); pxPut(g, 24, 9, 'i'); pxPut(g, 31, 12, 'j');
    pxPut(g, 15, 8, 'i'); pxPut(g, 40, 10, 'i');
    /* 最底下那一道熱源。只有一格，而且不是最亮的那一階——
       它是遠處的光，不是燈。 */
    pxBox(g, 6, 21, 15, 21, 'h');
    pxBox(g, 29, 21, 37, 21, 'h');
    pxBox(g, 8, 21, 13, 21, 'i');
    pxBox(g, 31, 21, 35, 21, 'i');
  }
};

/* 畫一次就記住。六張圖跟這一場都在同一個地下城裡，不會變。 */
var PLACE_CACHE = {};
function placePx(key) {
  if (PLACE_CACHE[key]) return PLACE_CACHE[key];
  var draw = PLACE_ART[key];
  var g = pxNew('b');
  if (draw) draw(g); else pxCave(g);
  PLACE_CACHE[key] = pxRows(g);
  return PLACE_CACHE[key];
}

/* 一個地方的樣子。放在故事那一頁的地圖上，也放在出發前選地方那幾張卡上——
   同一張圖，所以他選的時候看到的，跟故事裡看到的是同一個地方。 */
function placeArt(z, cls) {
  return '<img class="pl ' + (cls || '') + '" src="' +
    pxSvg(placePx(z.key), z.spal, false) + '" alt="">';
}
