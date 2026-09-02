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
      if (met[c.n]) H.push('<span class="cx-met">遇過 · ' + esc(met[c.n]) + '</span>');
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
  H.push('<div><b>石片</b>');
  /* 三句砍成一句。那一根長什麼樣子看得到，不用讀。 */
  H.push('<em>一天兩列。來過實心，沒動空心。</em>');
  if (mine.length) H.push('<span class="cx-met">你已經封存了 ' + mine.length + ' 根</span>');
  H.push('</div></div>');
  H.push('</div></div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">地上的物件</div>');
  H.push('<p class="dim">每一層長的不一樣。</p>');
  H.push('<div class="cx">');
  [['碎石', RUBBLE.px, '往下走的時候崩下來的。'],
   ['水晶', CRYSTAL.px, '最暗的時候還看得到。'],
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

/* ---------- 挑一個角色 ----------

   使用者：學生可以依照自己的喜好跟習慣反映在角色上。

   四種的剪影就不一樣（見 12-heroes.js），所以這一頁不用寫一句話
   解釋差別——四個站在那裡，走路那兩幀輪流播，看就知道。

   它不進任何判定、不影響任何數字，也不會有人因為挑了哪一個而多拿
   或少拿什麼。挑完就回廊道，因為那才是他要待的地方。 */
PAGES.who = function () {
  var u = me();
  var now = heroKey(u);

  var H = [head('挑一個角色', '這是你', '')];
  H.push('<div class="pick4">');
  HERO_LIST.forEach(function (x) {
    var g = HEROES[x.k];
    H.push('<button class="p4' + (x.k === now ? ' on' : '') +
      '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'hero:' + x.k })) + '\'>');
    /* 兩幀輪流播，站著跟走路各一組——選的時候就看得到他會怎麼動。 */
    H.push('<span class="p4-px">' +
      pxTag(g.walkA, g.pal, 'wf wa') + pxTag(g.walkB, g.pal, 'wf wb') + '</span>');
    H.push('<span class="p4-t">');
    H.push('<b>' + esc(x.n) + '</b>');
    H.push('<i>' + esc(x.t) + '</i>');
    H.push('</span>');
    H.push('</button>');
  });
  H.push('</div>');
  return H.join('');
};
