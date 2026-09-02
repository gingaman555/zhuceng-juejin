/* 畫圖。只有兩件事：一個雜湊、一個把像素字串變成 SVG 的函式。

   全都是純函式：同樣的輸入永遠得到同一張圖、同一隻魔物。
   沒有任何一個地方會在 render 的時候擲骰子。 */

/* 字串雜湊。同一個字串永遠得到同一個數字——
   「哪一組遇到哪一隻」就是靠它算的，所以不能換演算法。 */
function hash(s) {
  var h = 2166136261;
  s = String(s);
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return h >>> 0;
}

var ART_CACHE = {};

/* 像素字元：. 透明 · # 身體 · + 陰影 · * 反光 · ~ 拖影
   一張圖是一個字串陣列，每一格畫成一個 <rect>。
   換配色就是換同一張圖的意思——魔物越深越冷，招牌越好越亮。 */
function pxSvg(px, pal, dim) {
  if (!px || !px.length) return '';
  /* 整組調色盤都要進 key。本來只取 pal['#']——兩組 '#' 相同、
     其餘不同的調色盤會互相拿到對方的圖。 */
  var pk = '';
  Object.keys(pal).sort().forEach(function (c) { pk += c + pal[c]; });
  var key = px.join('') + '|' + pk + '|' + (dim ? 1 : 0);
  if (ART_CACHE[key]) return ART_CACHE[key];

  var W = px[0].length;
  var out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
    W + ' ' + px.length + '" shape-rendering="crispEdges">'];

  px.forEach(function (row, y) {
    for (var x = 0; x < row.length; x++) {
      var ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      /* 先查調色盤。查得到就用那一個顏色——一個角色因此可以有
         頭髮、皮膚、衣服、金屬各自的顏色，不是只有本體加陰影。
         查不到才走舊的別名（+ 與 o 是陰影、* 與 z 是反光）。 */
      var fill = pal[ch];
      if (fill === undefined) {
        fill =
          ch === '*' ? pal['*'] :
          (ch === '+' || ch === 'o') ? pal.o :
          ch === '~' ? (pal['~'] || pal.o) :
          ch === 'z' || ch === 'Z' ? (pal['*'] || pal['#']) :
          pal['#'];
      }
      out.push('<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + fill + '"' +
        (dim ? ' opacity=".26"' : '') + '/>');
    }
  });

  out.push('</svg>');
  var url = 'data:image/svg+xml;utf8,' + encodeURIComponent(out.join(''));
  ART_CACHE[key] = url;
  return url;
}

/* ---------- 那一閃 ----------

   登場、還有拿到什麼的時候，先看到一張純白的剪影，再落回本來的顏色。
   舊版寶可夢就是這樣做的：沒有粒子、沒有光暈，靠的是一瞬間的反白。

   做法是把同一張圖用全白的配色再畫一次疊在上面，然後淡出——
   用一塊白色的方塊蓋上去會變成一個方形的閃光，那不是剪影。

   收尾用 JS（見 55-ui.js 的 render），不是靠動畫跑完：
   動畫的時鐘會被凍住，那時候白色會一直蓋著。 */
var FLASH_PAL = { '#': '#FFF3D8', o: '#FFF3D8', '*': '#FFFFFF' };

function pxFlash(px) {
  if (!px || !px.length) return '';
  return '<img class="px pxflash" src="' + pxSvg(px, FLASH_PAL) + '" alt="">';
}
