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

/* ── 怎麼樣才像一個人，不像一塊石頭 ──

   上一版每一位都有明暗了，但還是一團對稱的東西。角色不是這樣有魅力的：
   冒險者提著一盞燈、法師戴一頂歪的尖帽、忍者拖一條圍巾、騎士左手一面盾——
   四個都不對稱，而且四個都有眼睛。

   所以這一版每一位都守三條：

   一 · 有眼睛。眼睛是最快讓一個形狀變成一個人的東西。
        白的那一格（W）擺在凹處（c）裡，六層都一樣白——眼睛不該
        跟著地層變色。會發光的那幾位用 Y。

   二 · 不對稱。左右一樣的東西看起來是物件。一隻手伸出來、頭歪一邊、
        東西掛在同一側——哪一種都行，但一定要有一個。

   三 · 有一個動作。他是來託付事情的人，不是站在路上的東西。
        伸手、前傾、抬頭、搓手——姿勢要說得出他在做什麼。

   ── 顏色分區 ──

   跟角色同一套規矩（見 12-heroes.js）：光從左上來，輪廓一律 k，
   受光面在左上、陰影在右下。

     k 輪廓 · c 凹處 · f 最暗 · g 暗面 · h 身體 · i 受光 · j 一點光
     nN 金屬 · wW 骨與白 · yY 光　（這三組不隨地層改變，見 13-strata.js）

   ── 怎麼畫 ──

   每一種畫在一個窄框裡（寬度隨意），程式自動置中、貼到地面那一列。 */

/* 十八種體型。差的是形狀跟姿態，不是配件。 */
var PAT_BODY = {

  /* 很高很瘦。低著頭看你，右手長到膝蓋。 */
  tall: [
    '..kkkk....',
    '.kiihgk...',
    '.kcWcgk...',
    '.kihhgk...',
    '..kkkk....',
    '...kk.....',
    '..kiik....',
    '.kiihgkkk.',
    'kiihhggkhk',
    'kihhhhggkk',
    'kihhhggfk.',
    'kihhggfk..',
    '.kihgfk...',
    '.kh.gk....',
    '.kk.kk....'
  ],

  /* 很矮很寬。眼睛分很開，右手插在腰上。 */
  squat: [
    '..kkkkkk....',
    '.kiiihhgk...',
    'kicWchWcggk.',
    'kihhhhhhggk.',
    'kihhcccchgkk',
    'kihhhhhhggkh',
    'kihhhggfffkk',
    '.kihhggffk..',
    '..kk..kk....'
  ],

  /* 一堆布。頭從布裡歪出來，左邊一隻手伸出布縫。 */
  drape: [
    '.....kkkk..',
    '....kiihgk.',
    '....kcWhgk.',
    '....kihhgk.',
    '.....kkkk..',
    '...kiihggk.',
    '..kiihhhggk',
    '.kiihhhhggk',
    'kkihhhhhggk',
    'khkihhhhggk',
    'kkihhhhhggk',
    '.kihhhhggfk',
    '.kihhhggffk',
    '.kihhggfffk',
    '.kkkkkkkkkk'
  ],

  /* 兩個頭。左邊那顆看著你，右邊那顆轉開了。 */
  twin: [
    '.kkk...kkk.',
    'kiihk.kiihk',
    'kcWck.kihck',
    'kihgk.kihWk',
    '.kkk...kkk.',
    '..kik.kik..',
    '.kiihhhhgk.',
    'kiihhhhhggk',
    'kihhhhhhggk',
    'kihhhhhggfk',
    'kihhhggfffk',
    '.kihhggffk.',
    '.kh.....gk.',
    '.kk.....kk.'
  ],

  /* 浮著。眼睛很大，底下那一截往左飄。 */
  float: [
    '..kkkkkk..',
    '.kiihhhgk.',
    'kiihhhhggk',
    'kicWchWcgk',
    'kihhhhhhgk',
    'kiihcchggk',
    '.kihhhhgk.',
    '.kihhhggk.',
    '..kihhgk..',
    '..kihgk...',
    '.kfk.gk...',
    '.f...k....',
    'f....f....'
  ],

  /* 背著比自己還大的東西。被壓得往前傾，右手撐著膝蓋。 */
  haul: [
    '.....kkkkkk.',
    '....kiihhggk',
    '...kkiihhggk',
    '..kihkihhggk',
    '.kcWckihhggk',
    '.kihgkihhggk',
    '..kkkkihhggk',
    '.kiihkihhggk',
    'kiihhkihhggk',
    'kihhhkiggffk',
    'kihhggkkkkkk',
    'kihhggkk....',
    '.kh.gkhk....',
    '.kk.kkk.....'
  ],

  /* 一團兜帽。帽簷壓得很低，只有兩點光；右手從袍子裡伸出來指著你。 */
  hood: [
    '...kkkk....',
    '..kiihgk...',
    '.kiihhhgk..',
    '.kccccccgk.',
    'kicYccYcggk',
    'kihcccchggk',
    'kihhhhhhhgk',
    'kihhhhhhggk',
    'kihhhhhggkk',
    'kihhhggffkh',
    'kihhggfffkk',
    '.kihggffk..',
    '.kkkkkkkk..'
  ],

  /* 有殼。殼縫裡一雙眼睛看出來，左下角伸出一隻小腳。 */
  shell: [
    '.kkkkkkkk..',
    'kiiihhhggk.',
    'kikkkkkkgk.',
    'kikcccckgk.',
    'kikWccWkgk.',
    'kikcccckgk.',
    'kikkkkkkgkk',
    'kihhhhhhggh',
    'kihhhhhggkk',
    'kihhhggffk.',
    '.kkkkkkkk..',
    '.k.k...k...',
    '.k.k...k...'
  ],

  /* 一節一節疊起來的。最上面那一節歪向左邊，每一道縫裡有一點光。 */
  stack: [
    '.kkkk.....',
    'kiihgk....',
    'kcWhgk....',
    'kihhgk....',
    'kkkkkk....',
    '.kiihhhgk.',
    '.kihjjhggk',
    '.kkkkkkkkk',
    'kiihhhhggk',
    'kihjjhhggk',
    'kkkkkkkkkk',
    'kiihhhhggk',
    'kihhhggffk',
    'kkkkkkkkkk'
  ],

  /* 頭比身體大很多。眼睛一大一小，兩隻小手在胸前搓著。 */
  bighead: [
    '..kkkkkkk..',
    '.kiiihhhgk.',
    'kiihhhhhggk',
    'kicWWchWcgk',
    'kihhhhhhhgk',
    'kihhcccchgk',
    'kihhhggfffk',
    '.kkkkkkkkk.',
    '..kkihgkk..',
    '.khkiihgkhk',
    '.kkkihhgkkk',
    '..kihhggk..',
    '..kk...kk..'
  ],

  /* 很長，貼著地拖過來。頭抬起來看你。 */
  long: [
    '.......kkkk',
    '......kiihk',
    '.....kicWck',
    '.kkkkkihhgk',
    'kiihhhhhhgk',
    'kihhhhhhggk',
    'kihhhhhhggk',
    'kihhhhhggfk',
    'kihhhggfffk',
    'kkkkkkkkkkk'
  ],

  /* 分成好幾小塊。每一塊一隻眼睛，看的方向都不一樣。 */
  swarm: [
    '.kkk....kkk.',
    'kcWhk..kihWk',
    'kihgk..kihgk',
    '.kkk....kkk.',
    '............',
    '...kkk.kkk..',
    '..kiWhkcWhk.',
    '..kihgkihgk.',
    '...kkk.kkk..',
    '............',
    '.kkk........',
    'kihWk.......',
    'kihgk.......',
    '.kkk........'
  ],

  /* 蹲著，抬頭看你，左手撐在地上。 */
  kneel: [
    '....kkkk...',
    '...kiihgk..',
    '...kcWcgk..',
    '..kkkkkkk..',
    '.kiihhhggk.',
    'kiihhhhhggk',
    'kihhhhhhggk',
    'kkhhhhhgffk',
    'khhhhggfffk',
    'kkhhggffffk',
    '.kkkkkkkkkk'
  ],

  /* 一個環立在那裡，中間是空的。眼睛長在環上偏左的地方。 */
  ring: [
    '...kkkkk...',
    '..kiihhgk..',
    '.kcWhkkhgk.',
    'kihhkcckhgk',
    'kihhkcckhgk',
    'kiWhkcckhgk',
    'kihhkcckhgk',
    'kihgkcckhgk',
    '.kihkkkhgk.',
    '..kihhggk..',
    '...kkkkk...',
    '....k.k....',
    '...kk.k....'
  ],

  /* 很多節從中間伸出去，長短不一。中間一顆大眼睛。 */
  many: [
    'k....k.....',
    '.k...k...k.',
    '..kkkkkkk..',
    '.kiihhhggk.',
    'kiihcYchggk',
    'kihhcccchgk',
    'kiihhhhhggk',
    '.kihhhhggk.',
    '..kkkkkkk..',
    '.k..k.k....',
    'k...k.k..k.',
    '....k.k..k.'
  ],

  /* 一條很細的東西。頂端一顆歪著的頭，左邊伸出一隻小手。 */
  thread: [
    '.kkk..',
    'kcWhk.',
    'kihgk.',
    '.kkk..',
    '.kik..',
    'kkhk..',
    'khik..',
    'kkhk..',
    '.kik..',
    '.khk..',
    '.kik..',
    '.khk..',
    'kkkk..'
  ],

  /* 上半身裂成兩半往兩邊開。裂縫裡一排眼睛看著你。 */
  split: [
    'kkk....kkk',
    'kihk..kihk',
    'kihk..kihk',
    'kihhkkhhgk',
    'kiihhhhhgk',
    '.kiWhhWgk.',
    '.kihcchgk.',
    'kiihWhhggk',
    'kihhhhhggk',
    'kihhhggffk',
    'kihhggfffk',
    '.kk....kk.'
  ],

  /* 一個罩子，裡面亮著。罩下面露出一雙眼睛跟一隻手。 */
  bell: [
    '....kk....',
    '...kiik...',
    '..kkkkkk..',
    '.kiihhhgk.',
    'kiihYYhggk',
    'kihhYYhhgk',
    'kihhYYhhgk',
    'kiihYYhggk',
    'kihhhhhggk',
    'kihhhggffk',
    'kyyyyyyyyk',
    'kkkkkkkkkk',
    '.kWk..kWk.',
    '..k....hk.'
  ]
};

/* ── 隨身的那一樣東西 ──

   體型已經把人拉開了，這一層讓同一種體型的幾個人不一樣。

   ── 材質 ──

   帶著的東西不用身體的色階，用固定的材質色（見 13-strata.js 的 PAT_MAT）：
   nN 金屬、wW 骨與白、yY 光。所以一把鎖在六層都是同一種鐵灰，
   一盞燈在六層都是暖的——它們看起來不是這個洞長出來的，
   是他從別的地方帶來的。這也是角色的做法：法師的杖是木頭色、
   杖頂那一顆是寶石色，都不跟著袍子走。

   ── 位置 ──

   不寫死座標。體型從 5 格寬到 13 格寬都有，同一個 x 對細的那幾位
   落在身體外面、對寬的那幾位埋在身體裡。改成貼著身體放：

     top    壓在頭頂，跟身體同一個中線
     left   掛在左邊，身體的中間高度
     right  掛在右邊

   sink 是往身體裡壓幾格：角在頭上要壓進去一格才長在頭上。 */
var PAT_MARK = {
  none: null,

  /* 頭上兩隻角。骨。 */
  horn: { at: 'top', sink: 1, px: [
    '.k..k.',
    'kW..Wk',
    'kw..wk'
  ] },

  /* 一頂小的。金屬，三個尖，尖端亮著。 */
  crown: { at: 'top', sink: 1, px: [
    '.Y.Y.Y.',
    'kYkYkYk',
    'kNNNnnk',
    'kkkkkkk'
  ] },

  /* 一點光跟在旁邊。不是他的眼睛——是另外一個東西。 */
  eye: { at: 'left', sink: -1, px: [
    '.kk.',
    'kYYk',
    'kYyk',
    '.kk.'
  ] },

  /* 一盞掛著的燈。鐵的殼，裡面燒著。 */
  lamp: { at: 'left', sink: 0, px: [
    '..k..',
    '..n..',
    '.knk.',
    'kNYYk',
    'kNYyk',
    'kNyyk',
    '.kkk.'
  ] },

  /* 一根杖。木身，頂端一顆亮的。 */
  staff: { at: 'right', sink: 0, px: [
    '.kYk.',
    'kYYYk',
    '.kYk.',
    '..n..',
    '..N..',
    '..n..',
    '..N..',
    '..n..',
    '..k..'
  ] },

  /* 一把鎖掛在身上。

     他要的東西鎖著，而你交出去的那一份是鑰匙——整個作品的那一句話
     （見 10-pack.js）。所以這個記號不是裝飾，它是這件事的樣子。
     鐵灰，在哪一層都一樣：那把鎖不屬於任何一層。 */
  lock: { at: 'right', sink: 1, px: [
    '.kkk.',
    'kN.Nk',
    'kn.nk',
    'kkkkk',
    'kNNnk',
    'kNYnk',
    'kNnnk',
    'kkkkk'
  ] },

  /* 一個袋子。布，繩子扎著。 */
  bag: { at: 'right', sink: 1, px: [
    '..n..',
    '.knk.',
    'kiihk',
    'kihgk',
    'kihgk',
    'kkkkk'
  ] },

  /* 一圈一圈捲起來的東西。 */
  coil: { at: 'left', sink: 1, px: [
    'kkkk.',
    'kWWwk',
    '.kkkk',
    'kkkk.',
    'kWWwk',
    '.kkkk'
  ] },

  /* 一塊板子，平平地端在前面。上面刻著東西。 */
  plate: { at: 'right', sink: 0, px: [
    'kkkkkk',
    'kWWWwk',
    'kWnnwk',
    'kWnnwk',
    'kkkkkk'
  ] },

  /* 有東西一直在滴。 */
  drip: { at: 'left', sink: 0, px: [
    '.k.',
    'kYk',
    '.k.',
    '...',
    '.k.',
    'kyk',
    '.k.',
    '...',
    '.k.'
  ] }
};

/* ── 會動的那一下 ──

   一張靜止的圖擺在那裡，跟一個站在那裡等你的人差很多。角色有十四個
   姿勢、走坐各兩幀；委託人本來只有一張。

   34 位不可能一張一張畫第二幀，所以第二幀是算出來的——而怎麼算
   由體型決定，不是全部套同一種：

     bob    上半身沉一格，底下兩列不動。站著的人在呼吸。
     hover  整個沉一格。浮著的、成群的——它們沒有腳，整個都會動。
     sway   上半身往右挪一格。細長的東西被風帶著。
     lit    形狀不動，只有亮的那幾格暗下來。硬的殼、亮著的罩子。

   兩幀之間差一格。差兩格會變成在跳，差零格等於沒動。 */
var PAT_IDLE = {
  tall: 'bob', squat: 'bob', drape: 'bob', twin: 'bob',
  float: 'hover', haul: 'bob', hood: 'bob', shell: 'lit',
  stack: 'bob', bighead: 'bob', long: 'bob', swarm: 'hover',
  kneel: 'bob', ring: 'lit', many: 'hover', thread: 'sway',
  split: 'bob', bell: 'lit'
};

/* 亮的那幾格暗下來的時候變成什麼。 */
var PAT_DIM = { j: 'i', Y: 'y', W: 'w', N: 'n' };

function patMove(px, kind) {
  var h = px.length, w = px[0].length, y, x;
  var out = [];
  for (y = 0; y < h; y++) out.push(px[y].split(''));

  if (kind === 'lit') {
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var c = out[y][x];
      if (PAT_DIM[c]) out[y][x] = PAT_DIM[c];
    }
    return out.map(function (r) { return r.join(''); });
  }

  if (kind === 'sway') {
    /* 上半身整段往右挪一格，下半身不動。 */
    var mid = Math.floor(h / 2);
    for (y = 0; y < mid; y++) {
      var row = px[y].split('');
      row.pop();
      row.unshift('.');
      out[y] = row;
    }
    return out.map(function (r) { return r.join(''); });
  }

  /* bob 與 hover：整段往下挪一格。
     bob 留住底下兩列（腳踩著地），hover 不留（它本來就沒有腳）。 */
  var keep = kind === 'hover' ? 0 : 2;
  var blank = new Array(w + 1).join('.');
  var moved = [];
  for (y = 0; y < h; y++) {
    if (y < h - keep) moved.push(y === 0 ? blank : px[y - 1]);
    else moved.push(px[y]);
  }
  /* 挪下來之後被蓋掉的那一列要補回去：不然身體會少一列。 */
  if (keep) moved[h - keep] = px[h - keep - 1];
  return moved;
}

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
    /* 第二幀。怎麼動由體型決定（見 PAT_IDLE）——站著的呼吸、
       浮著的整個沉、細的搖、硬的只有光在閃。 */
    c.px2 = patMove(c.px, PAT_IDLE[bd] || 'bob');
  });
}

/* 一載入就換掉。名字、住哪一區、描述都不動——只換圖。 */
dressPatrons();
