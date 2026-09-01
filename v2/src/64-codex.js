/* 圖鑑。

   這個字曾經被 check.js 擋著，因為上一個作品（地心圖鑑）的圖鑑是一條
   收集進度條：收集了 12／40，收滿有東西。那種圖鑑會把「做更多任務」
   變成「填更多格子」，也就是把外在誘因裝回來。

   這一份不是那種。差別只有一條，但那一條就是全部：

     全部看得到。沒有鎖、沒有問號、沒有「收集了幾件」。

   它記的是「你遇過牠」——那是一段回憶，不是一個分數。

   版面：一次只看一層。

   本來六層一路往下攤開，五十幾隻排成一條看不完的捲軸——那不是圖鑑，
   那是一份清單。改成切頁：上面一排是層，點一層看一層，一屏剛好一層。
   預設停在他現在所在的那一層。 */

PAGES.codex = function () {
  var t = myTeam();
  var here = strataAt(depthOf(t.teamId), t.teamId);
  var tab = DRAFT.cx || here.key;
  var met = metMobs(t.teamId);
  /* 在地底下掀開遇到的那幾隻也算遇過。foundMobs 寫好了但一直沒接上，
     所以掀開遇到的生物從來沒進過圖鑑。 */
  var found = foundMobs(t.teamId);
  Object.keys(found).forEach(function (n) { if (!met[n]) met[n] = found[n]; });

  var H = [head('圖鑑', '這座地下城裡有什麼', '')];

  /* 上面那一排：六層 ＋ 東西。一次只看一頁。 */
  H.push('<div class="cxtabs">');
  STRATA.forEach(function (z) {
    H.push('<button class="cxt ' + z.key + (tab === z.key ? ' on' : '') +
      '" data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'cx:' + z.key })) + '\'>' +
      esc(z.name) + (z.key === here.key ? '<i>你在這</i>' : '') + '</button>');
  });
  H.push('<button class="cxt gear' + (tab === 'gear' ? ' on' : '') +
    '" data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'cx:gear' })) + '\'>物件</button>');
  H.push('</div>');

  if (tab === 'gear') {
    H.push(codexThings(t, here));
  } else {
    var z = here;
    STRATA.forEach(function (x) { if (x.key === tab) z = x; });
    H.push('<div class="card fa ' + z.key + '">');
    H.push('<div class="eyebrow">' + (z.key === here.key ? '你現在在這一層' : '地層') + '</div>');
    H.push('<p class="lead">' + esc(z.note) + '</p>');
    H.push('<div class="cx">');
    faunaOf(z.key).forEach(function (c) {
      H.push('<div class="cxi' + (met[c.n] ? ' met' : '') + '">');
      H.push(pxTag(c.px, z.pal, 'cx-px'));
      H.push('<div><b>' + esc(c.n) + '</b>');
      H.push('<em>' + esc(c.t) + '</em>');
      if (met[c.n]) H.push('<span class="cx-met">你在「' + esc(met[c.n]) + '」那一趟遇過</span>');
      H.push('</div></div>');
    });
    H.push('</div></div>');
  }

  return H.join('');
};

/* 東西那一頁：帶得走的一種，與地上撿得到的幾種。 */
function codexThings(t, here) {
  var mine = keepsOf(t.teamId);
  var H = ['<div class="card">'];
  H.push('<div class="eyebrow">帶得走的</div>');
  H.push('<div class="cx">');
  H.push('<div class="cxi' + (mine.length ? ' met' : '') + '">');
  H.push(pxTag(mine.length ? (mine[mine.length - 1].px || coreOf(mine[mine.length - 1].runId))
    : ['..++++++++++..', '.+##########+.', '.+#*######*#+.', '.+##########+.',
       '.+#+......+#+.', '.+#+......+#+.', '.+#..+..+..#+.', '.+..+..+..+..',
       '.+##########+.', '..++++++++++..'],
    here.pal, 'cx-px core'));
  H.push('<div><b>岩心</b>');
  H.push('<em>走完一趟、老師勾了可以之後，那一趟自己長成的一根樣本。' +
         '一天兩列：來過是實心、你說沒動是空心、沒有紀錄是斷的。' +
         '長度就是那一趟過了幾天，顏色是你當時在哪一層。</em>');
  if (mine.length) H.push('<span class="cx-met">你已經封存了 ' + mine.length + ' 根</span>');
  H.push('</div></div>');
  H.push('</div></div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">地上的物件</div>');
  H.push('<p class="dim">每一層長的不一樣——那是你怎麼知道自己換了地方。</p>');
  H.push('<div class="cx">');
  [['碎石', RUBBLE.px, '打通的時候崩下來的。'],
   ['水晶', CRYSTAL.px, '自己會微微發亮，所以最暗的時候還看得到一點輪廓。'],
   ['蕈菇', SHROOM.px, '走通的地方才長得出來。'],
   ['鐵件', BOLT.px, '有人來過。鏽住了，轉不動。'],
   ['餘燼', EMBER.px, '地上還有餘燼在燒。'],
   ['火把', TORCH.frames[0], '你來過的每一天，牆上多一盞。']
  ].forEach(function (p) {
    H.push('<div class="cxi met">');
    H.push(pxTag(p[1], here.pal, 'cx-px'));
    H.push('<div><b>' + esc(p[0]) + '</b><em>' + esc(p[2]) + '</em></div>');
    H.push('</div>');
  });
  H.push('</div></div>');
  return H.join('');
}

ACTS.cx = function (k) { DRAFT.cx = k; render(); };
