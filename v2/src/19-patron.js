/* ---------- 委託人的樣子 ----------

   名字、住哪一區、那一句描述全部留著（見 10-pack.js 與 14-fauna.js）——
   只換圖。

   為什麼要換：那 34 張是上一個作品的生物，剪影是「趴著、埋著、
   張開的」——看起來像擋在路上的東西。委託人不擋路，他站在那裡等你，
   而且他有事要託付。

   ── 讀得出來的是剪影，不是細節 ──

   24×16 放在廊道上只有 66px。那個尺寸看不到臉、看不到手上拿什麼，
   只看得到一個輪廓。所以這 12 種體型差的是**形狀本身**：
   很高、很矮、浮著、沒有腿、兩個頭、背著比自己大的東西——
   不是同一個人換帽子。

   ── 可以很奇怪 ──

   他們是地下城裡的人，不是路人。奇怪是重點：走到那一天的時候，
   要的是「這次的委託人竟然長這樣」。

   ── 怎麼畫 ──

   每一種畫在一個窄框裡（寬度隨意），程式自動置中、貼到地面那一列。
   所以下面每一列不用數到 24——這樣才不會有人浮在半空或站歪。 */

var PAT_W = 24, PAT_H = 16;

/* ── 顏色分區 ──

   跟角色同一套規矩（見 12-heroes.js）：光從左上來，輪廓一律 k，
   受光面在左上、陰影在右下。字母是這一層的色階，換一層就換一種顏色：

     k  輪廓，最暗的那一階
     c  凹處：兜帽裡面、眼窩、縫
     f  最暗的暗面（右下角）
     g  暗面
     h  身體
     i  受光面（左上）
     j  一點光：眼睛、晶體、火

   本來只有三個：# 身體、+ 陰影、* 反光。三階畫不出一個角色——
   委託人因此只是一團有邊的色塊。 */

/* 十八種體型。差的是形狀，不是配件。 */
var PAT_BODY = {

  /* 很高很瘦。頭小、脖子長，站著的時候比別人高出一截。 */
  tall: [
    '..kkk..',
    '.kiihk.',
    '.kihgk.',
    '.kihgk.',
    '..kkk..',
    '..kik..',
    '..kik..',
    '.kiihk.',
    'kiihhgk',
    'kihhhgk',
    'kihhggk',
    'kihhggk',
    '.kihgk.',
    '.kh.gk.',
    '.kk.kk.'
  ],

  /* 很矮很寬。沒有脖子，整個人像一塊。 */
  squat: [
    '..kkkkkk..',
    '.kiiihhgk.',
    'kiihhhhggk',
    'kiihcchggk',
    'kihhhhhggk',
    'kihhhhhggk',
    'kihhhggffk',
    '.kihhggfk.',
    '..kk..kk..'
  ],

  /* 一堆布。看不到腿，只有頂上一顆小頭。 */
  drape: [
    '...kkkk...',
    '..kiihgk..',
    '..kihhgk..',
    '...kkkk...',
    '..kiihgk..',
    '.kiihhggk.',
    '.kihhhggk.',
    'kiihhhgggk',
    'kihhhhgggk',
    'kihhchgggk',
    'kihhhhgggk',
    'kihhhggffk',
    'kihhggfffk',
    'kkkkkkkkkk'
  ],

  /* 兩個頭。同一個身體上面兩顆，一顆看著你、一顆看別的地方。 */
  twin: [
    '.kkk..kkk..',
    'kiihkkiihk.',
    'kihgkkihgk.',
    '.kkk..kkk..',
    '..kikkik...',
    '.kiihhhgk..',
    'kiihhhhggk.',
    'kihhhhhggk.',
    'kihhhhhggk.',
    'kihhhggffk.',
    '.kihhggfk..',
    '.kh....gk..',
    '.kk....kk..'
  ],

  /* 浮著。底下什麼都沒有，只有一截漸漸散掉的東西。 */
  float: [
    '..kkkkk..',
    '.kiihhgk.',
    'kiihhhggk',
    'kihhcchgk',
    'kihhhhhgk',
    'kiihhhggk',
    '.kihhggk.',
    '.kihhggk.',
    '..kihgk..',
    '..kf.gk..',
    '...k.k...',
    '...f.f...',
    '....f....'
  ],

  /* 背著比自己還大的東西。人被壓得往前傾。 */
  haul: [
    '.....kkkkkk.',
    '....kiihhggk',
    '...kkiihhggk',
    '..kihkihhggk',
    '.kiihkihhggk',
    '.kihgkihhggk',
    '..kkkkihhggk',
    '.kiihkihhggk',
    'kiihhkihhggk',
    'kihhhkiggffk',
    'kihhggkkkkkk',
    'kihhggk.....',
    '.kh.gk......',
    '.kk.kk......'
  ],

  /* 一團兜帽，只有兩點光。 */
  hood: [
    '...kkkk...',
    '..kiihgk..',
    '.kiicchgk.',
    '.kihcjchgk',
    'kiihcccjgk',
    'kihhhcchgk',
    'kihhhhhhgk',
    'kihhhhhggk',
    'kihhhhhggk',
    'kihhhggffk',
    'kihhggfffk',
    '.kihggffk.',
    '.kkkkkkkk.'
  ],

  /* 有殼。一個硬的外框，裡面一小個。 */
  shell: [
    '.kkkkkkkk.',
    'kiiihhhggk',
    'kikkkkkkgk',
    'kikccccjgk',
    'kikchhckgk',
    'kikchhckgk',
    'kikcccckgk',
    'kikkkkkkgk',
    'kihhhhhggk',
    'kihhhggffk',
    '.kkkkkkkk.',
    '..k....k..',
    '..k....k..'
  ],

  /* 一節一節疊起來的，像一疊東西長了一顆頭。 */
  stack: [
    '..kkkk..',
    '.kiihgk.',
    '.kihhgk.',
    '.kkkkkk.',
    'kiihhhgk',
    'kihhhggk',
    'kkkkkkkk',
    'kiihhhgk',
    'kihhhggk',
    'kkkkkkkk',
    'kiihhhgk',
    'kihhhggk',
    'kihhggfk',
    'kkkkkkkk'
  ],

  /* 頭比身體大很多。 */
  bighead: [
    '..kkkkkkk..',
    '.kiiihhhgk.',
    'kiihhhhhggk',
    'kiihcchcggk',
    'kihhhhhhhgk',
    'kihhhhhhggk',
    'kihhhggfffk',
    '.kkkkkkkkk.',
    '...kihgk...',
    '..kiihggk..',
    '..kihhggk..',
    '..kihggfk..',
    '..kk...kk..'
  ],

  /* 很長，貼著地拖過來的。 */
  long: [
    '.......kkkk',
    '......kiihk',
    '.....kiihgk',
    '.kkkkkihhgk',
    'kiihhhhhhgk',
    'kihhhhhhggk',
    'kihcchhhggk',
    'kihhhhhggfk',
    'kihhhggfffk',
    'kkkkkkkkkkk'
  ],

  /* 分成好幾小塊，一起動的那種。 */
  swarm: [
    '.kkk....kkk.',
    'kiihk..kiihk',
    'kihgk..kihgk',
    '.kkk....kkk.',
    '............',
    '...kkk.kkk..',
    '..kiihkiihk.',
    '..kihgkihgk.',
    '...kkk.kkk..',
    '............',
    '.kkk........',
    'kiihk.......',
    'kihgk.......',
    '.kkk........'
  ],

  /* 蹲著，背弓起來。矮，但看得出是一個人的姿勢。 */
  kneel: [
    '....kkkk...',
    '...kiihgk..',
    '...kihcgk..',
    '..kkkkkkk..',
    '.kiihhhggk.',
    'kiihhhhhggk',
    'kihhhhhhggk',
    'kihhhhhgffk',
    'kihhhggfffk',
    'kkhhggffffk',
    '.kkkkkkkkkk'
  ],

  /* 一個環立在那裡，中間是空的。看得穿。 */
  ring: [
    '...kkkkk...',
    '..kiihhgk..',
    '.kiihkkhgk.',
    'kiihkcckhgk',
    'kihhkcckhgk',
    'kihhkcckhgk',
    'kihhkcckhgk',
    'kihgkcckhgk',
    '.kihkkkhgk.',
    '..kihhggk..',
    '...kkkkk...',
    '....k.k....',
    '....k.k....'
  ],

  /* 很多節從中間伸出去。放射狀，不是左右對稱的人形。 */
  many: [
    'k....k....k',
    '.k...k...k.',
    '..kkkkkkk..',
    '.kiihhhggk.',
    'kiihhjhhggk',
    'kihhhjhhggk',
    'kiihhhhhggk',
    '.kihhhhggk.',
    '..kkkkkkk..',
    '.k..k.k..k.',
    'k...k.k...k',
    '....k.k....'
  ],

  /* 一條很細的東西，頂端一個結。幾乎只有一根線。 */
  thread: [
    '.kkk.',
    'kijhk',
    'kihgk',
    '.kkk.',
    '.kik.',
    '.khk.',
    '.kik.',
    '.khk.',
    '.kik.',
    '.khk.',
    '.kik.',
    '.khk.',
    'kkkkk'
  ],

  /* 上半身裂成兩半，往兩邊開。下面還是連著的。 */
  split: [
    'kkk....kkk',
    'kihk..kihk',
    'kihk..kihk',
    'kihhkkhhgk',
    'kiihhhhhgk',
    '.kihhhhgk.',
    '.kihcchgk.',
    'kiihhhhggk',
    'kihhhhhggk',
    'kihhhggffk',
    'kihhggfffk',
    '.kk....kk.'
  ],

  /* 一個罩子，裡面亮著。腳看不見，光從下緣漏出來。 */
  bell: [
    '....kk....',
    '...kiik...',
    '..kkkkkk..',
    '.kiihhhgk.',
    'kiihjjhggk',
    'kihhjjhhgk',
    'kihhjjhhgk',
    'kiihjjhggk',
    'kihhhhhggk',
    'kihhhggffk',
    'kjjjjjjjjk',
    'kkkkkkkkkk',
    '.j.j..j.j.'
  ]
};

/* ── 隨身的那一樣東西 ──

   體型已經把人拉開了，這一層讓同一種體型的幾個人不一樣。

   位置不寫死座標。本來每個記號有一組 x／y，而體型從 5 格寬到 13 格寬
   都有——同一個 x 對細的那幾位落在身體外面，對寬的那幾位埋在身體裡。
   改成貼著身體放：

     top    壓在頭頂，跟身體同一個中線
     left   掛在左邊，身體的中間高度
     right  掛在右邊

   sink 是往身體裡壓幾格：角在頭上要壓進去一格才長在頭上，
   提著的東西壓 0 格才是提著。 */
var PAT_MARK = {
  none: null,

  /* 頭上兩隻角。 */
  horn: { at: 'top', sink: 1, px: [
    '.k..k.',
    'ki..ik',
    'kh..hk'
  ] },

  /* 一頂小的。三個尖，中間那個亮。 */
  crown: { at: 'top', sink: 1, px: [
    '.j.j.j.',
    'kjkjkjk',
    'kiihhgk',
    'kkkkkkk'
  ] },

  /* 一點光跟在旁邊。不是他的眼睛——是另外一個東西。 */
  eye: { at: 'left', sink: -1, px: [
    '.kk.',
    'kjjk',
    'kjhk',
    '.kk.'
  ] },

  /* 一盞掛著的燈。 */
  lamp: { at: 'left', sink: 0, px: [
    '..k..',
    '..k..',
    '.kkk.',
    'kjjjk',
    'kjhjk',
    'kjjjk',
    '.kkk.'
  ] },

  /* 一根杖，頂端亮著。 */
  staff: { at: 'right', sink: 0, px: [
    '.kjk.',
    'kjjjk',
    '.kjk.',
    '..k..',
    '..k..',
    '..k..',
    '..k..',
    '..k..',
    '..k..'
  ] },

  /* 一把鎖掛在身上。

     他要的東西鎖著，而你交出去的那一份是鑰匙——整個作品的那一句話
     （見 10-pack.js）。所以這個記號不是裝飾，它是這件事的樣子。 */
  lock: { at: 'right', sink: 1, px: [
    '.kkk.',
    'kh.hk',
    'kh.hk',
    'kkkkk',
    'kiihk',
    'kicik',
    'kihgk',
    'kkkkk'
  ] },

  /* 一個袋子。 */
  bag: { at: 'right', sink: 1, px: [
    '..k..',
    '.kkk.',
    'kiihk',
    'kihgk',
    'kihgk',
    'kkkkk'
  ] },

  /* 一圈一圈捲起來的東西。 */
  coil: { at: 'left', sink: 1, px: [
    'kkkk.',
    'kiihk',
    '.kkkk',
    'kkkk.',
    'kiihk',
    '.kkkk'
  ] },

  /* 一塊板子，平平地端在前面。 */
  plate: { at: 'right', sink: 0, px: [
    'kkkkkk',
    'kiiihk',
    'kihhgk',
    'kihhgk',
    'kkkkkk'
  ] },

  /* 有東西一直在滴。 */
  drip: { at: 'left', sink: 0, px: [
    '.k.',
    'kjk',
    '.k.',
    '...',
    '.k.',
    'kjk',
    '.k.',
    '...',
    '.k.'
  ] }
};

function patNew() {
  var g = [], y, x;
  for (y = 0; y < PAT_H; y++) { var r = []; for (x = 0; x < PAT_W; x++) r.push('.'); g.push(r); }
  return g;
}
function patPut(g, art, x0, y0) {
  art.forEach(function (row, dy) {
    for (var dx = 0; dx < row.length; dx++) {
      var c = row[dx];
      if (c === '.') continue;
      var x = x0 + dx, y = y0 + dy;
      if (x >= 0 && x < PAT_W && y >= 0 && y < PAT_H) g[y][x] = c;
    }
  });
}
function patWide(a) {
  var w = 0;
  a.forEach(function (r) { if (r.length > w) w = r.length; });
  return w;
}

/* 一個委託人。體型置中、貼著地面那一列，所以誰都不會浮著或站歪。
   記號再貼著體型放（見 PAT_MARK），所以細的粗的高的矮的都掛得對。 */
function patPx(body, mark) {
  var b = PAT_BODY[body] || PAT_BODY.tall;
  var w = patWide(b);
  var bx = Math.max(0, Math.round((PAT_W - w) / 2));
  var by = Math.max(0, PAT_H - b.length);
  var g = patNew();
  patPut(g, b, bx, by);

  var m = PAT_MARK[mark || 'none'];
  if (m) {
    var mw = patWide(m.px);
    var sink = m.sink || 0;
    var mx, my;
    if (m.at === 'top') {
      mx = bx + Math.round((w - mw) / 2);
      my = by - m.px.length + sink;
    } else if (m.at === 'left') {
      mx = bx - mw + sink;
      my = by + Math.round((b.length - m.px.length) / 2);
    } else {
      mx = bx + w - sink;
      my = by + Math.round((b.length - m.px.length) / 2);
    }
    /* 掛出框外就往回收。寧可貼著身體，也不要被切掉一半。 */
    mx = Math.max(0, Math.min(PAT_W - mw, mx));
    my = Math.max(0, Math.min(PAT_H - m.px.length, my));
    patPut(g, m.px, mx, my);
  }
  return g.map(function (r) { return r.join(''); });
}

/* ---------- 誰長什麼樣 ----------

   照名字對。名字、住哪一區、那一句描述都不動——那些寫得很好，
   而且它們本來就是觀察句，拿來寫一個奇怪的委託人剛剛好。

   同一種體型最多出現三次，而且配不同的小記號。 */
/* 幾位刻意指定的。其餘照名字的最後一個字配（見下面 PAT_TAIL）。 */
var PATRON_LOOK = {
  '霧潛母': ['drape', 'none'],
  '灰擬者': ['twin', 'eye'],
  '塵銜獸': ['haul', 'bag'],
  '晶面獸': ['shell', 'eye'],
  '影漲母': ['hood', 'none'],
  '垂根者': ['long', 'drip'],
  '苔面': ['squat', 'none'],
  '殘架': ['tall', 'none'],
  '磁滯者': ['float', 'eye'],
  '螺紋母': ['bighead', 'staff']
};

/* 名字的最後一個字決定體型。

   這些名字本來就有規律，照它配剪影就跟名字對得上——
   群是一堆、母是大的、者是人形的、獸是矮壯的、面是有殼的。
   一個字給兩三種，用雜湊在裡面挑，同一個字尾的幾位才不會長一樣。 */
/* 每一組給的選擇要比人多，不然一定有人撞在一起：
   者有 8 位、母 7 位、獸 7 位、群 6 位——本來每組只給兩三種，
   所以 bighead 出現七次、swarm 六次，而新畫的六種一次都沒用到。 */
var PAT_TAIL = {
  /* 一堆的 */
  '群': ['swarm', 'stack', 'many', 'ring'],
  /* 大的 */
  '母': ['drape', 'bighead', 'hood', 'bell', 'kneel'],
  /* 人形的 */
  '者': ['tall', 'hood', 'float', 'thread', 'split', 'ring'],
  /* 矮壯的 */
  '獸': ['squat', 'haul', 'bighead', 'kneel', 'many'],
  /* 有殼的 */
  '面': ['shell', 'bighead'],
  '蟲': ['stack', 'long', 'many'],
  '甲': ['shell', 'ring'],
  '架': ['tall', 'stack', 'split'],
  '囊': ['drape', 'squat', 'bell']
};
var PAT_KEYS = Object.keys(PAT_BODY);
var PAT_MKEYS = Object.keys(PAT_MARK);

function dressPatrons() {
  /* 先決定每一位的體型。

     指名的那幾位先佔，其餘的在自己那一組裡挑**目前用得最少**的那一種。

     本來是 tail[hash(名字) % 幾種]——雜湊撞在一起沒有人管，所以
     bighead 出現七次而 kneel 一次都沒有。同一個剪影連著看到七次，
     「這次的委託人竟然長這樣」就沒有了。

     一樣少的時候用雜湊決定誰先，所以同一個名字每次都長同一個樣子。 */
  var body = {};
  var used = {};
  PAT_KEYS.forEach(function (k) { used[k] = 0; });
  allFauna().forEach(function (c) {
    var look = PATRON_LOOK[c.n];
    if (look) { body[c.n] = look[0]; used[look[0]] = (used[look[0]] || 0) + 1; }
  });
  allFauna().forEach(function (c) {
    if (body[c.n]) return;
    var tail = PAT_TAIL[String(c.n).slice(-1)] || PAT_KEYS;
    var best = tail[0];
    tail.forEach(function (k) {
      var a = used[k] || 0, b = used[best] || 0;
      if (a < b || (a === b && hash(c.n + k) > hash(c.n + best))) best = k;
    });
    body[c.n] = best;
    used[best] = (used[best] || 0) + 1;
  });
  /* 再在同一種體型裡把記號輪流發下去。

     本來記號也是雜湊決定的，所以體型跟記號同時撞的時候，
     兩位就長得一模一樣（34 位裡發生了 8 次）。輪流發就不會——
     12 種體型 × 7 種記號有 84 種組合，34 位放得下。 */
  /* 指名的那幾位先佔位，其餘的再挑還沒被用掉的——
     不然生出來的會撞到指名的（發生過 5 次）。 */
  var taken = {};
  allFauna().forEach(function (c) {
    var f = PATRON_LOOK[c.n];
    if (f) taken[f[0] + '|' + f[1]] = 1;
  });
  allFauna().forEach(function (c) {
    var bd = body[c.n];
    var f = PATRON_LOOK[c.n];
    var mk;
    if (f) {
      mk = f[1];
    } else {
      /* 從他自己那個數字開始找，找到還沒被用掉的第一個。

         本來從 0 開始找，而 PAT_MKEYS 的第一個是 none——體型變成
         十八種之後大部分體型只有一兩位，於是幾乎每個人都拿到 none，
         那一層變化等於沒有。從自己的雜湊起跳就散得開。

         18 種體型 × 11 種記號 = 198 種，34 位一定放得下。 */
      var n = PAT_MKEYS.length;
      var s0 = hash(c.n + 'm') % n;
      for (var i = 0; i < n; i++) {
        var t = PAT_MKEYS[(s0 + i) % n];
        if (!taken[bd + '|' + t]) { mk = t; break; }
      }
      if (!mk) mk = PAT_MKEYS[hash(c.n) % PAT_MKEYS.length];
      taken[bd + '|' + mk] = 1;
    }
    c.px = patPx(bd, mk);
  });
}

/* 一載入就換掉。名字、住哪一區、描述都不動——只換圖。 */
dressPatrons();
