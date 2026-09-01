/* 圖鑑。

   這個字曾經被 check.js 擋著，因為上一個作品（地心圖鑑）的圖鑑是一條
   收集進度條：收集了 12／40，收滿有東西。那種圖鑑會把「做更多任務」
   變成「填更多格子」，也就是把外在誘因裝回來。

   這一份不是那種。差別只有一條，但那一條就是全部：

     全部看得到。沒有鎖、沒有問號、沒有「收集了幾件」。

   它記的是「你遇過牠」——那是一段回憶，不是一個分數。沒遇過的那幾隻
   一樣看得到長什麼樣、住在哪一層、是什麼東西。所以它不會讓任何人
   為了填滿它而多做一件事，它只是這座地下城的說明：下面住著這些。 */

PAGES.codex = function () {
  var t = myTeam();
  var met = metMobs(t.teamId);
  var here = strataAt(depthOf(t.teamId), t.teamId);

  var H = [head('圖鑑', '這座地下城裡有什麼',
    '這座地下城裡住的東西，全部在這裡。標「你遇過」的那幾隻是回憶。')];

  /* ---- 生物 ---- */
  STRATA.forEach(function (z) {
    var list = faunaOf(z.key);
    if (!list.length) return;
    H.push('<div class="card fa ' + z.key + '">');
    H.push('<div class="cx-head">');
    H.push('<div><div class="eyebrow">' + (z.key === here.key ? '你現在在這一層' : '地層') + '</div>');
    H.push('<h2>' + esc(z.name) + '</h2>');
    H.push('<p class="dim">' + esc(z.note) + '</p></div>');
    H.push('</div>');
    H.push('<div class="cx">');
    list.forEach(function (c) {
      H.push('<div class="cxi' + (met[c.n] ? ' met' : '') + '">');
      H.push(pxTag(c.px, z.pal, 'cx-px'));
      H.push('<div><b>' + esc(c.n) + '</b>');
      H.push('<em>' + esc(c.t) + '</em>');
      if (met[c.n]) H.push('<span class="cx-met">你在「' + esc(met[c.n]) + '」那一趟遇過</span>');
      H.push('</div></div>');
    });
    H.push('</div></div>');
  });

  /* ---- 物件 ----
     三件是留下來的那句話的把手（見 63-pack.js），
     其餘是地上撿得到的東西——每一層長的不一樣。 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">帶得走的</div>');
  H.push('<div class="cx">');
  RULES.KEEPS.forEach(function (k) {
    var mine = keepsOf(t.teamId).filter(function (x) { return x.key === k.key; });
    H.push('<div class="cxi' + (mine.length ? ' met' : '') + '">');
    H.push(pxTag(GEAR_PX[k.tro].px, here.pal, 'cx-px'));
    H.push('<div><b>' + esc(k.name) + '</b>');
    H.push('<em>' + esc(k.eyebrow) + '。走完一趟、老師勾了可以之後，' +
           '三張裡挑一張留下，這是其中一張的樣子。</em>');
    if (mine.length) {
      H.push('<span class="cx-met">' + esc(mine[mine.length - 1].line) + '</span>');
    }
    H.push('</div></div>');
  });
  H.push('</div></div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">地上的東西</div>');
  H.push('<p class="dim">每一層長的不一樣——' +
         '那是你怎麼知道自己換了地方。</p>');
  H.push('<div class="cx">');
  [['碎石', RUBBLE.px, '打通的時候崩下來的。'],
   ['水晶', CRYSTAL.px, '自己會微微發亮，所以最暗的時候還看得到一點東西。'],
   ['蕈菇', SHROOM.px, '走通的地方才長得出來。'],
   ['鐵件', BOLT.px, '有人來過。鏽住了，轉不動。'],
   ['餘燼', EMBER.px, '地上還有東西在燒。'],
   ['火把', TORCH.frames[0], '你來過的每一天，牆上多一盞。']
  ].forEach(function (p) {
    H.push('<div class="cxi met">');
    H.push(pxTag(p[1], here.pal, 'cx-px'));
    H.push('<div><b>' + esc(p[0]) + '</b><em>' + esc(p[2]) + '</em></div>');
    H.push('</div>');
  });
  H.push('</div></div>');

  H.push(btn('回廊道', 'go:home', 'ghost'));
  return H.join('');
};
