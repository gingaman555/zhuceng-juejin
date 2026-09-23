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

/* ── 怎麼樣才像一個人，不像一塊水晶 ──

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
  ccrystal: { at: 'left', sink: 1, px: [
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

/* ---------- 放大之後的樣子 ----------

   廊道上他是 24×16，那個尺寸讀得出剪影、讀不出樣貌。點進去放大那一頁
   （PAGES.patron）畫的是這一組：36×24，格子多 3.4 倍。

   多出來的格子拿去畫小的那張畫不下的東西：

     眼睛有瞳孔跟一點反光，不再是一格白的
     手有指節
     布有褶、殼有裂、節與節之間有縫
     臉上有表情——眉、嘴、下巴的暗面

   每一種的姿態跟小的那張一樣（低頭的還是低頭、蹲著的還是蹲著），
   不然放大之後會像換了一個人。

   顏色跟小的那張同一套：k 輪廓 · c 凹處 · f 最暗 · g 暗面 · h 身體
   · i 受光 · j 一點光 · nN 金屬 · wW 骨與白 · yY 光。 */

var PAT_BIG_W = 36, PAT_BIG_H = 24;

var PAT_BIG = {
  /* 很高很瘦。低著頭看你，右手長到膝蓋，指節看得出來。 */
  tall: [
    '.....kkkkk......',
    '....kiiihhgk....',
    '...kiihhhhggk...',
    '...kihhhhhhgk...',
    '...kckWkckWhk...',
    '...kihhhhhhgk...',
    '....kihccchk....',
    '.....kkkkkk.....',
    '......kiik......',
    '......kihk......',
    '....kkiihkk.....',
    '..kkiihhhggkk...',
    '.kiihhhhhhggk...',
    'kiihhhhhhhggkkk.',
    'kihhhhhhhhggkhk.',
    'kihhhhhhhggkkhk.',
    '.kihhhhhhggkkhk.',
    '.kihhhhhggk.khk.',
    '.kihhhhggfk.kWk.',
    '.kihhhggffk.kkk.',
    '..kihgkkgfk.....',
    '..kihk.kgfk.....',
    '..kkk...kkk.....'
  ],

  /* 很矮很寬。眼睛分很開，嘴咧著，右手插在腰上。 */
  squat: [
    '....kkkkkkkkk.....',
    '..kkiiiihhhhggkk..',
    '.kiiihhhhhhhhhggk.',
    'kiihhhhhhhhhhhhggk',
    'kihhhhhhhhhhhhhhgk',
    'kickWkhhhhhhckWhgk',
    'kihhhhhhhhhhhhhhgk',
    'kihhhcccccccchhggk',
    'kihhhckkkkkkchhggk',
    'kihhhhcccccchhhggk',
    'kihhhhhhhhhhhhggkk',
    'kihhhhhhhhhhhggkhk',
    'kihhhhhhhhhhggkkhk',
    'kihhhhhhhhhggffkkk',
    'kihhhhhhhhggfffk..',
    '.kihhhhhhggfffk...',
    '..kihhhhggfffk....',
    '...kkkk..kkkk.....',
    '...khhk..khhk.....',
    '...kkkk..kkkk.....'
  ],

  /* 一堆布。頭從布裡歪出來，左邊一隻手伸出布縫，布上有褶。 */
  drape: [
    '.........kkkkk....',
    '........kiiihgk...',
    '.......kiihhhhgk..',
    '.......kihhhhhgk..',
    '.......kckWkhhgk..',
    '.......kihhhhhgk..',
    '.......kihcchhgk..',
    '........kkkkkkk...',
    '.....kkiihhhggkk..',
    '...kkiihhhhhhgggk.',
    '..kiihhhhfhhhhgggk',
    '.kiihhhhhfhhhhgggk',
    'kkihhhhhhfhhhhgggk',
    'khkihhhhhfhhhhgggk',
    'kWkihhhhhfhhhhgggk',
    'kkihhhhhhfhhhhgggk',
    '.kihhhhhhfhhhhggfk',
    '.kihhhhhhfhhhhggfk',
    '.kihhhhhhfhhhggffk',
    '.kihhhhhhfhhggfffk',
    '.kihhhhhhfhggffffk',
    '.kihhhhhhfggfffffk',
    '.kkkkkkkkkkkkkkkkk'
  ],

  /* 兩個頭。左邊那顆看著你，右邊那顆轉開了。 */
  twin: [
    '..kkkkk.....kkkkk.',
    '.kiiihgk...kiiihgk',
    'kiihhhhgk.kiihhhhg',
    'kihhhhhhk.kihhhhhg',
    'kckWkchgk.kihcckWg',
    'kihhhhhgk.kihhhhhg',
    'kihccchgk.kihhhchg',
    '.kkkkkkk...kkkkkkk',
    '..kiihk......kiihk',
    '..kiihkkkkkkkkiihk',
    '..kiihhhhhhhhhhihk',
    '.kkiihhhhhhhhhhhgk',
    'kiihhhhhhhhhhhhhgk',
    'kihhhhhhhhhhhhhhgk',
    'kihhhhhhhhhhhhhggk',
    'kihhhhhhhhhhhhggfk',
    'kihhhhhhhhhhhggffk',
    '.kihhhhhhhhhggfffk',
    '.kihhhhhhhhggffffk',
    '..kihhhhhhggfffk..',
    '..kihgk..kkgffk...',
    '..kihk....kgfk....',
    '..kkk......kkk....'
  ],

  /* 浮著。眼睛很大，底下那一截往左飄，越下面越散。 */
  float: [
    '....kkkkkkkkk.....',
    '..kkiiihhhhhggkk..',
    '.kiiihhhhhhhhhggk.',
    'kiihhhhhhhhhhhhggk',
    'kihhhhhhhhhhhhhhgk',
    'kicckWWkhhkWWkchgk',
    'kickWjWkhhkWjWchgk',
    'kihhkWWkhhkWWhhhgk',
    'kihhhhhhhhhhhhhhgk',
    'kihhhhcccccchhhhgk',
    'kihhhhhhhhhhhhhggk',
    '.kihhhhhhhhhhhhgk.',
    '.kihhhhhhhhhhhggk.',
    '..kihhhhhhhhhggk..',
    '..kihhhhhhhhggk...',
    '...kihhhhhhggk....',
    '...kihhhhhggk.....',
    '..kfihhhhggk......',
    '..kf.kihggk.......',
    '.kf...kigk........',
    '.f.....kk.........',
    'f........f........',
    '....f.............'
  ],

  /* 背著比自己還大的東西。被壓得往前傾，右手撐著膝蓋。 */
  haul: [
    '.......kkkkkkkkkk.',
    '......kiiihhhhggk.',
    '.....kkiihhhhhggk.',
    '...kkkkihhhhhhggk.',
    '..kiiihkihhhhhggk.',
    '.kiihhhkihhhhhggk.',
    '.kckWkhkihhhhhggk.',
    '.kihhhhkihhhhhggk.',
    '.kihcchkihhhhhggk.',
    '..kkkkkkihhhhhggk.',
    '.kkiihhkihhhhhggk.',
    'kiihhhhkihhhhhggk.',
    'kihhhhhkihhhhhggk.',
    'kihhhhhkihhhhggfk.',
    'kihhhhhkiggfffffk.',
    'kihhhhhkkkkkkkkkk.',
    'kihhhhggkk........',
    'kihhhggkhk........',
    '.kihhggkhk........',
    '.kihgffkWk........',
    '.kihk.kkkk........',
    '.kkk..kgfk........',
    '......kkkk........'
  ],

  /* 一團兜帽。帽簷壓得很低，裡面兩點光；右手從袍子裡伸出來指著你。 */
  hood: [
    '......kkkkkkk.....',
    '....kkiiihhhggkk..',
    '..kkiihhhhhhhhggk.',
    '.kiihhhhhhhhhhhggk',
    'kiihhhhhhhhhhhhhgk',
    'kiccccccccccccccgk',
    'kicccYYcccccYYccgk',
    'kicccYYcccccYYccgk',
    'kiccccccccccccccgk',
    'kihccccccccccccggk',
    'kihhhcccccccchhggk',
    'kihhhhhhhhhhhhhggk',
    'kihhhhfhhhhfhhhggk',
    'kihhhhfhhhhfhhggkk',
    'kihhhhfhhhhfhhggkh',
    'kihhhhfhhhhfhggkkh',
    'kihhhhfhhhhfhggkWh',
    'kihhhhfhhhhfggfkkk',
    'kihhhhfhhhfggfffk.',
    'kihhhhfhhfggffffk.',
    'kihhhhfhfggfffffk.',
    'kihhhhffggffffffk.',
    'kkkkkkkkkkkkkkkkk.'
  ],

  /* 有殼。殼上有裂，縫裡一雙眼睛看出來，左下角一隻小腳。 */
  shell: [
    '..kkkkkkkkkkkkkk..',
    '.kiiihhhhhhhhggk..',
    'kiihhhhfhhhhhhggk.',
    'kihhhhhfhhhhhhhggk',
    'kikkkkkkkkkkkkkkgk',
    'kikcccccccccccckgk',
    'kikccWWccccWWcckgk',
    'kikccWjccccWjcckgk',
    'kikccWWccccWWcckgk',
    'kikcccccccccccckgk',
    'kikccccccccccckkgk',
    'kikkkkkkkkkkkkkkgk',
    'kihhhhfhhhhhhhhggk',
    'kihhhhfhhhhhhhggkk',
    'kihhhhfhhhhhhggkhk',
    'kihhhhfhhhhhggkkhk',
    'kihhhhffhhhggffkkk',
    '.kihhhhffhggfffk..',
    '..kkkkkkkkkkkkk...',
    '..kk...kk...kk....',
    '..kh...kh...kh....',
    '..kk...kk...kk....'
  ],

  /* 一節一節疊起來的。最上面那節歪向左，每一道縫裡有光。 */
  stack: [
    '..kkkkkkkk........',
    '.kiiihhhggk.......',
    'kiihhhhhhggk......',
    'kihhhhhhhhgk......',
    'kckWkchhhhgk......',
    'kihhhhhhhhgk......',
    'kihccchhhhgk......',
    'kkkkkkkkkkkk......',
    '..kkiiihhhhhggkk..',
    '.kiihhhhhhhhhhggk.',
    '.kijjjjjjjjjjjjgk.',
    '.kkkkkkkkkkkkkkkk.',
    'kiiihhhhhhhhhhhggk',
    'kihhhhhhhhhhhhhggk',
    'kijjjjjjjjjjjjjjgk',
    'kkkkkkkkkkkkkkkkkk',
    'kiiihhhhhhhhhhhggk',
    'kihhhhhhhhhhhhhggk',
    'kihhhhhhhhhhhhggfk',
    'kihhhhhhhhhhhggffk',
    'kihhhhhhhhhggfffdk'.replace('d', 'f'),
    'kkkkkkkkkkkkkkkkkk'
  ],

  /* 頭比身體大很多。眼睛一大一小，兩隻小手在胸前搓著。 */
  bighead: [
    '...kkkkkkkkkkkk...',
    '.kkiiiihhhhhhggkk.',
    'kiiihhhhhhhhhhhggk',
    'kiihhhhhhhhhhhhhgk',
    'kihhhhhhhhhhhhhhgk',
    'kiccccchhhhhcccchk',
    'kicWWWchhhhhcWWchk',
    'kicWjWchhhhhcWjchk',
    'kicWWWchhhhhcWWchk',
    'kiccccchhhhhcccchk',
    'kihhhhhhhhhhhhhhgk',
    'kihhhhccccccchhggk',
    'kihhhhhhhhhhhhggfk',
    '.kihhhhhhhhhhggfk.',
    '..kkkkkkkkkkkkkk..',
    '....kkkihhgkkk....',
    '..kkhkiihhggkhkk..',
    '..khWkihhhhgkWhk..',
    '..kkkkihhhhggkkk..',
    '....kihhhhhggk....',
    '....kihhhggffk....',
    '....kkkk..kkkk....'
  ],

  /* 很長，貼著地拖過來。頭抬起來看你，身上一節一節。 */
  long: [
    '.............kkkkk',
    '............kiiihk',
    '...........kiihhgk',
    '..........kihhhhgk',
    '..........kckWkhgk',
    '..........kihhhhgk',
    '..kkkkkkkkkihcchgk',
    '.kiihhhhhhhhhhhhgk',
    'kiihhhhhhhhhhhhhgk',
    'kihhfhhhfhhhfhhhgk',
    'kihhfhhhfhhhfhhggk',
    'kihhfhhhfhhhfhhggk',
    'kihhfhhhfhhhfhggfk',
    'kihhfhhhfhhhfggffk',
    'kihhfhhhfhhfggfffk',
    'kkkkkkkkkkkkkkkkkk'
  ],

  /* 分成好幾小塊。每一塊一隻眼睛，看的方向都不一樣。 */
  swarm: [
    '.kkkkkk......kkkkkk',
    'kiihhhgk....kiihhhg',
    'kickWchgk..kihcckWg',
    'kihhhhhgk..kihhhhhg',
    'kihcchhgk..kihhcchg',
    '.kkkkkkk....kkkkkkk',
    '...................',
    '.....kkkkkk..kkkkk.',
    '....kiihhhgkkiihhgk',
    '....kickWchkickWchk',
    '....kihhhhhkihhhhhk',
    '....kihcchgkihcchgk',
    '.....kkkkkk..kkkkk.',
    '...................',
    '.kkkkkk............',
    'kiihhhgk...........',
    'kihcckWgk..........',
    'kihhhhhgk..........',
    'kihhcchgk..........',
    '.kkkkkkk...........'
  ],

  /* 蹲著，抬頭看你，左手撐在地上，背弓起來。 */
  kneel: [
    '.........kkkkkkk..',
    '.......kkiiihhggk.',
    '......kiihhhhhhggk',
    '.....kihhhhhhhhhgk',
    '.....kckWkchhhhhgk',
    '.....kihhhhhhhhhgk',
    '.....kihcccchhhhgk',
    '....kkkkkkkkkkkkgk',
    '..kkiiihhhhhhhhggk',
    '.kiihhhhhhhhhhhggk',
    'kiihhhhhhhhhhhhggk',
    'kihhhhhhhhhhhhhggk',
    'kihhhhhhhhhhhhggfk',
    'kkhhhhhhhhhhhggffk',
    'khhhhhhhhhhhggfffk',
    'khhhhhhhhhhggffffk',
    'kkhhhhhhhhggfffffk',
    '.khhhhhhhggffffffk',
    '.kkhhhhhggfffffffk',
    '..kkkkkkkkkkkkkkkk'
  ],

  /* 一個環立在那裡，中間是空的。眼睛長在環上偏左的地方。 */
  ring: [
    '.....kkkkkkkk.....',
    '...kkiiihhhhggkk..',
    '..kiihhhhhhhhhggk.',
    '.kiihhhkkkkhhhhggk',
    'kiihhhkkccckkhhhgk',
    'kihWhkkccccckkhhgk',
    'kickWkcccccccckhgk',
    'kihWhkcccccccckhgk',
    'kihhhkcccccccckhgk',
    'kihhhkcccccccckhgk',
    'kihhhkcccccccckhgk',
    'kihhhkkcccccckkhgk',
    'kihhhhkkccckkhhhgk',
    'kiihhhhkkkkkhhhggk',
    '.kihhhhhhhhhhhggk.',
    '..kihhhhhhhhhggk..',
    '...kkiihhhhhggkk..',
    '.....kkkkkkkk.....',
    '.....kk....kk.....',
    '....kkh....khk....',
    '....kkk....kkk....'
  ],

  /* 很多節從中間伸出去，長短不一。中間一顆大眼睛。 */
  many: [
    'k.....k......k....',
    '.k....k.....k.....',
    '..k...k....k....k.',
    '...kkkkkkkkkk...k.',
    '..kiiihhhhhggk..k.',
    '.kiihhhhhhhhhggk..',
    'kiihhcccccchhhggk.',
    'kihhccYYYYcchhhggk',
    'kihhcYYjjYYchhhggk',
    'kihhccYYYYcchhhggk',
    'kiihhcccccchhhhggk',
    '.kihhhhhhhhhhhggk.',
    '..kkkkkkkkkkkkkk..',
    '..k...k....k...k..',
    '.k....k....k....k.',
    'k.....k....k.....k',
    '......k....k......',
    '.....k......k.....'
  ],

  /* 一條很細的東西。頂端一顆歪著的頭，左邊伸出一隻小手。 */
  thread: [
    '..kkkkkk..',
    '.kiiihhgk.',
    'kiihhhhggk',
    'kickWkchgk',
    'kihhhhhhgk',
    'kihhcchhgk',
    '.kkkkkkkk.',
    '...kiihk..',
    '...kihhk..',
    'kkkkiihk..',
    'kWkkihhk..',
    'kkkkiihk..',
    '...kihhk..',
    '...kiihk..',
    '...kihhk..',
    '...kiihk..',
    '...kihhk..',
    '...kiihk..',
    '...kihhk..',
    '..kkkkkk..'
  ],

  /* 上半身裂成兩半往兩邊開。裂縫裡一排眼睛看著你。 */
  split: [
    'kkkkk........kkkkk',
    'kiihk........kiihk',
    'kihhk........kihhk',
    'kihhkk......kkhhgk',
    'kihhhk......khhhgk',
    'kihhhhk....khhhhgk',
    'kiihhhhkkkkhhhhhgk',
    '.kihhhhhhhhhhhhgk.',
    '.kihhWWhhhhWWhhgk.',
    '.kihhWjhhhhWjhhgk.',
    '.kihhhhhhhhhhhhgk.',
    'kiihhhccccccchhggk',
    'kihhhhhWWWWhhhhggk',
    'kihhhhhhhhhhhhhggk',
    'kihhhhhhhhhhhhggfk',
    'kihhhhhhhhhhhggffk',
    'kihhhhhhhhhhggfffk',
    'kihhhhhhhhhggffffk',
    '.kihhhhhhhggfffk..',
    '.kkkkk....kkkkk...',
    '.khhhk....khhhk...',
    '.kkkkk....kkkkk...'
  ],

  /* 一個罩子，裡面亮著。罩下面露出一雙眼睛跟一隻手，光從下緣漏出來。 */
  bell: [
    '.......kkkk.......',
    '......kiiihk......',
    '.....kkiihhkk.....',
    '..kkkkkkkkkkkkkk..',
    '.kiiihhhhhhhhggkk.',
    'kiihhhhhhhhhhhhggk',
    'kihhhYYYYYYhhhhhgk',
    'kihhYYYYYYYYhhhhgk',
    'kihhYYYjjYYYhhhhgk',
    'kihhYYYjjYYYhhhhgk',
    'kihhYYYYYYYYhhhhgk',
    'kihhhYYYYYYhhhhhgk',
    'kihhhhhhhhhhhhhggk',
    'kihhhhhhhhhhhhggfk',
    'kihhhhhhhhhhhggffk',
    'kyyyyyyyyyyyyyyyyk',
    'kkkkkkkkkkkkkkkkkk',
    '.kkk..kkk...kkkk..',
    '.kWk..kWk...khhk..',
    '.kkk..kkk...kkkk..',
    '..y....y......y...'
  ]
};

/* 大圖用的記號。

   不能拿小的那一組來用：它們是照 24×16 的身體畫的，掛在 36×24 上
   只有一半大，看起來像別人的東西黏上去。而記號不能省——
   同一種體型有兩三位，放大之後分得出誰是誰全靠這一層。

   所以重畫一遍，順便把小的畫不下的東西補上：燈有提把跟火苗、
   鎖有鎖孔、板子上刻著東西、角有紋路。 */
var PAT_BIG_MARK = {
  none: null,

  /* 頭上兩隻角，骨，上面有一圈一圈的紋。 */
  horn: { at: 'top', sink: 2, px: [
    '.kk......kk.',
    'kWWk....kWWk',
    'kWwk....kwWk',
    'kWWk....kWWk',
    'kwWk....kWwk',
    '.kWWk..kWWk.',
    '.kwwk..kwwk.'
  ] },

  /* 一頂金屬的冠。三個尖，尖端各一點光。 */
  crown: { at: 'top', sink: 2, px: [
    '..Y....Y....Y..',
    '.kYk..kYk..kYk.',
    '.kNk..kNk..kNk.',
    'kkNkkkkNkkkkNkk',
    'kNNNNNNNNNNNnnk',
    'kNNnnnnnnnnnnnk',
    'kkkkkkkkkkkkkkk'
  ] },

  /* 一點光跟在旁邊，外面一圈暈。 */
  eye: { at: 'left', sink: -1, px: [
    '..kk..',
    '.kYYk.',
    'kYjjYk',
    'kYjjYk',
    '.kYYk.',
    '..kk..'
  ] },

  /* 一盞掛著的燈。鐵的殼，裡面一朵火。 */
  lamp: { at: 'left', sink: 0, px: [
    '...k...',
    '...n...',
    '..knk..',
    '.knnnk.',
    'kkNNNkk',
    'kNYjYNk',
    'kNYjYNk',
    'kNYYYNk',
    'kNyyyNk',
    'kknnnkk',
    '..kkk..'
  ] },

  /* 一根杖。木身有節，頂端一顆亮的。 */
  staff: { at: 'right', sink: 0, px: [
    '.kYYk.',
    'kYjjYk',
    'kYjjYk',
    '.kYYk.',
    '..kk..',
    '..Nn..',
    '..Nn..',
    '..kk..',
    '..Nn..',
    '..Nn..',
    '..Nn..',
    '..kk..',
    '..Nn..',
    '..kk..'
  ] },

  /* 一把鎖。鎖孔看得見。

     他要的東西鎖著，而你交出去的那一份是鑰匙——整個作品的那一句話
     （見 10-pack.js）。鐵灰，在哪一層都一樣：那把鎖不屬於任何一層。 */
  lock: { at: 'right', sink: 2, px: [
    '..kkkk..',
    '.kNNNNk.',
    'kNnkkNNk',
    'kNk..kNk',
    'kNk..kNk',
    'kkkkkkkk',
    'kNNNNNnk',
    'kNNkkNnk',
    'kNkYYknk',
    'kNkYYknk',
    'kNNkkNnk',
    'kNnnnnnk',
    'kkkkkkkk'
  ] },

  /* 一個袋子，繩子扎著，鼓鼓的。 */
  bag: { at: 'right', sink: 2, px: [
    '..nn..',
    '.knnk.',
    'kknnkk',
    'kiihgk',
    'kihhgk',
    'kihhgk',
    'kihggk',
    'kihggk',
    '.kkkk.'
  ] },

  /* 一圈一圈捲起來的東西。 */
  ccrystal: { at: 'left', sink: 2, px: [
    'kkkkkk..',
    'kWWWwwk.',
    '.kkkkWk.',
    'kkkkkkk.',
    'kWWWwwk.',
    '.kkkkWk.',
    'kkkkkkk.',
    'kWWWwwk.',
    '.kkkkkk.'
  ] },

  /* 一塊板子，平平地端在前面。上面刻著東西。 */
  plate: { at: 'right', sink: 0, px: [
    'kkkkkkkkk',
    'kWWWWWWwk',
    'kWnnnnWwk',
    'kWnWWnWwk',
    'kWnnnnWwk',
    'kWWWWWWwk',
    'kwwwwwwwk',
    'kkkkkkkkk'
  ] },

  /* 有東西一直在滴。 */
  drip: { at: 'left', sink: 0, px: [
    '.kk.',
    'kYYk',
    'kyyk',
    '.kk.',
    '....',
    '.kk.',
    'kYYk',
    'kyyk',
    '.kk.',
    '....',
    '.kk.',
    'kyyk',
    '.kk.'
  ] }
};


/* 組出一張大圖。跟小的那張同一套規矩：置中、貼地、記號貼著身體掛。 */
function patBigPx(body, mark) {
  var b = PAT_BIG[body];
  if (!b) return null;
  var w = patWide(b);
  var bx = Math.max(0, Math.round((PAT_BIG_W - w) / 2));
  var by = Math.max(0, PAT_BIG_H - b.length);
  var g = [], y, x;
  for (y = 0; y < PAT_BIG_H; y++) {
    var r = [];
    for (x = 0; x < PAT_BIG_W; x++) r.push('.');
    g.push(r);
  }
  function put(art, x0, y0) {
    art.forEach(function (row, dy) {
      for (var dx = 0; dx < row.length; dx++) {
        var c = row[dx];
        if (c === '.') continue;
        var px = x0 + dx, py = y0 + dy;
        if (px >= 0 && px < PAT_BIG_W && py >= 0 && py < PAT_BIG_H) g[py][px] = c;
      }
    });
  }
  put(b, bx, by);
  var m = PAT_BIG_MARK[mark || 'none'];
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
    mx = Math.max(0, Math.min(PAT_BIG_W - mw, mx));
    my = Math.max(0, Math.min(PAT_BIG_H - m.px.length, my));
    put(m.px, mx, my);
  }
  return g.map(function (r) { return r.join(''); });
}

/* ---------- 誰是誰 ----------

   ── 名字 ──

   本來的名字是組出來的：詞素 ＋ 動作 ＋ 類別（霧＋潛＋母、稜＋潛＋者、
   熔＋潛＋母）。34 位裡因此有三位「潛」、三位「擬」、三位「眠」、
   三位「漲」——名字不同，骨子裡是同一個，換一個詞素而已。

   組出來的名字念起來也是一個節奏：三個字、三段、每一段都是一個詞素。
   一整頁排下來像一張表。

   所以 34 個名字一個一個取。長度不一樣（仿影、埋岩獸、空骨架），
   結尾也不一樣（獸、蟲、群、者，或者什麼都不加）。它們還是生物的名字
   ——這是圖鑑，收集得起來的東西要有名字——只是每一個都是自己的。

   ── 描述 ──

   更嚴重的是這個：34 位只有 14 句描述。「有一半埋在岩壁裡。」寫給了
   三位，「他會學你剛才的動作。」也寫給了三位。你走到那一天，翻開來，
   讀到的是上個月讀過的同一句——「這次的委託人竟然長這樣啊」就沒了。

   所以 34 個名字、34 句話，一句都不重複。

   ── 名字跟樣子是一起決定的 ──

   本來體型是照名字最後一個字猜的（群→一堆、母→大的），現在直接指定：
   「空架子」配那個高瘦、該掛東西的地方全空著的體型，而且他身上不掛
   任何記號——名字說的就是這件事。

     [ 原本的名字, 現在的名字, 那一句話, 體型, 隨身的東西 ] */
var PATRONS = [
  /* ── 微光荒原 ── */
  ['霧潛母', '埋岩獸', '下半身在岩壁裡。他說那裡比較安靜。', 'kneel', 'none'],
  ['砂裂群', '裂肩', '身上一直有新的縫開起來，他會用手按住。', 'split', 'none'],
  ['灰擬者', '仿影', '你做什麼他慢半拍做一次，做完還看你一眼。', 'twin', 'none'],
  ['塵銜獸', '咬石獸', '嘴裡永遠咬著一樣東西，問他他不鬆口。', 'haul', 'bag'],

  /* ── 根脈層 ── */
  ['苔眠獸', '睏頭', '大半時間是睡的。醒著的時候話特別多。', 'bighead', 'none'],
  ['根織母', '縫身蟲', '一直在補自己身上的洞，補完又開一個。', 'thread', 'ccrystal'],
  ['藤漲群', '蔓群', '你往他那邊走一步，他就漲一圈。', 'swarm', 'none'],
  ['濕蝕者', '蝕壁獸', '他待過的岩壁會變薄。他說不是他。', 'squat', 'none'],
  ['垂根者', '縮根獸', '你一走近他就縮一下，然後假裝沒事。', 'hood', 'none'],
  ['纏行蟲', '濕痕蟲', '走過的地方留一條濕的線，很好跟。', 'long', 'drip'],
  ['苔面', '無邊苔', '要走到很近，才看得出他到哪裡為止。', 'float', 'none'],
  ['吸水囊', '盈囊', '滿的時候會微微發亮。他很在意這件事。', 'bell', 'none'],
  ['斷根獸', '斷肢獸', '斷面很舊了，他還在往前爬。', 'many', 'none'],

  /* ── 水晶迴廊 ── */
  ['晶面獸', '凝面獸', '你一看他他就不動，你一轉頭他又動了。', 'shell', 'none'],
  ['稜潛者', '嵌晶環', '有一半在晶體裡，拔不出來，他也不急。', 'ring', 'ccrystal'],
  ['光裂群', '稜裂', '每一道新開的裂縫都在折光，他覺得很好看。', 'split', 'drip'],
  ['脈擬母', '摹晶', '他會照你的動作做一次，做完問你對不對。', 'twin', 'plate'],

  /* ── 迴聲迷宮 ── */
  ['影漲母', '鳴脹', '你講話越大聲，他就長得越大。', 'bell', 'horn'],
  ['空面者', '屏息者', '你看著他的時候，他連呼吸都停。', 'hood', 'eye'],
  ['迴眠獸', '沉眠布', '叫不太醒。醒了會先問現在幾點。', 'drape', 'none'],
  ['聲織群', '綴聲蟲', '一直在把散掉的聲音收回來接好。', 'thread', 'none'],

  /* ── 銹層 ── */
  ['銹蝕者', '噬鐵獸', '他靠著的鐵件會變薄。他說那是自然的。', 'squat', 'plate'],
  ['鐵銜獸', '啣釘蟲', '嘴裡咬著一顆螺絲，很久了。', 'long', 'bag'],
  ['釘裂群', '哨縫', '身上的縫會發出很細的聲音，他自己聽不到。', 'stack', 'none'],
  ['銅面母', '定殼獸', '你看他的時候他不動。看久了會不好意思。', 'shell', 'crown'],
  ['鏽甲', '銹鎧蟲', '接縫鏽住了，轉不太動，但他很想轉。', 'ring', 'lock'],
  ['齒輪蟲', '齒節蟲', '爬起來聲音很規律，遠遠就聽得到。', 'stack', 'ccrystal'],
  ['殘架', '空骨架', '該掛東西的位置全都空著。他還在找。', 'tall', 'none'],
  ['磁滯者', '引鐵', '他經過，你手上的鐵件會被拉一下。', 'float', 'lock'],
  ['螺紋母', '螺深淵', '中間是一條螺紋，往下看不到底。', 'ring', 'staff'],

  /* ── 熔火深淵 ── */
  ['燼眠獸', '炙眠獸', '大半時間是睡的，睡在最燙的那一塊上。', 'kneel', 'lamp'],
  ['熔潛母', '浸熔', '下半身泡在熔漿裡。他說剛剛好。', 'squat', 'lamp'],
  ['焰擬者', '焰摹', '他會照你的動作做一次，但做得比你大。', 'twin', 'crown'],
  ['炭漲群', '炭群', '你往他那邊走一步，他就燒得更旺。', 'many', 'lamp'],

  /* ── 六位新的，各自照世界各地的傳說生物畫（見 14-fauna.js 檔頭） ──

     體型／記號沒有一組跟前面 34 位重複，不然放大也分不出誰是誰。 */
  ['林踏獸', '林踏', '腳印比誰都大，他自己也不太確定怎麼躲起來的。', 'haul', 'none'],
  ['沙鳴蟲', '沙鳴', '地面震一下，他就從別的地方冒出來。', 'long', 'none'],
  ['湖頸母', '沉頸', '水面只看得到他的頭，剩下的都在底下。', 'float', 'drip'],
  ['赤瞳蛾', '警蛾', '他出現的那幾天，附近總有點不對勁。', 'split', 'eye'],
  ['林角魔', '雜肢獸', '身上的部件好像來自不同的動物，接得不太整齊。', 'many', 'horn'],
  ['飲脊獸', '夜飲者', '牲畜棚附近常有他經過的痕跡，沒人真的看清楚過。', 'kneel', 'drip'],
  ['尖首影', '尖首', '他浮在半空，頭頂那個形狀，沒有人說得準是什麼。', 'float', 'crown'],

  /* ── 再六位，一樣的畫法（見上面那一段） ── */
  ['雪隱獸', '雪隱', '腳印很大，走沒幾步就被新的雪蓋掉。', 'squat', 'horn'],
  ['潮糾獸', '潮糾', '他一伸展，水面上會裂出好幾道紋路。', 'swarm', 'eye'],
  ['橙膚仔', '橙皮仔', '個子很小，眼睛比頭還大一圈。', 'bighead', 'lamp'],
  ['夜鴞魅', '夜鴞', '翅膀張開的時候，兩顆眼睛才看得清楚。', 'bell', 'eye'],
  ['夜行褲', '夜行者', '只看得到兩條腿在走，其他部分都不清楚。', 'thread', 'drip'],
  ['澤鱗獸', '澤鱗', '皮膚濕濕的，蹲在那裡幾乎看不出輪廓。', 'squat', 'eye'],

  /* ── 再五位，補齊每一層四種動法都有（見 19-patron.js 檔頭的 PAT_IDLE） ──

     sway 只有 thread 一種體型會走這條路，所以三位補 sway 的都是
     thread，靠記號分開；lit／hover 各挑一種沒撞過的體型＋記號。 */
  ['蛙燈魅', '蛙燈', '他蹲在那裡，肚子那圈會微微亮起來。', 'bell', 'lamp'],
  ['河潛蟲', '河眠者', '他貼著水面滑過去，只留下一條細細的痕。', 'thread', 'eye'],
  ['蝠肢獸', '蝠影', '他張開的時候，數不清有幾片翼。', 'many', 'eye'],
  ['隧鱗蟲', '隧蟲', '他從舊廊道裡鑽出來，鱗片還沾著鐵鏽。', 'thread', 'staff'],
  ['迷光影', '迷光', '你跟著他走，他就跟著你退開，距離一直不變。', 'thread', 'lamp']
];


/* ---------- 每一位自己的話 ----------

   本來三十四位共用同一組句子：上門是「◯◯ 在等這一件。」，
   走到他面前是「你走到了。◯◯ 在這裡。」，第二次是「又是你。這次
   帶了什麼來？」，接過去是「他伸手接過去。」——只有名字換。

   而那三十四位有三十四種樣子。埋岩獸的下半身在岩壁裡，他伸不出手；
   蔓群沒有手，他是往你這邊漲過來；咬石獸嘴裡永遠咬著東西。
   同一句「他伸手接過去」放在這三個身上，等於把他們畫得那麼不一樣
   之後，讓他們講一模一樣的話。

   四個時機，因為那正好是他會出現的四次：

     ask    他第一次上門要東西
     back   他又來了，帶著新的一件      ← 一個學期下來，這一句在累積
     wait   你第一次走到他面前
     again  第二次以後又遇到他        ← 一個學期下來，這一句在累積
     take   他接過去的那一下
     redo   你帶著同一件回來（老師退回之後）

   三條規矩，寫的時候一直守著：

     一 · 他不評價。他要、他等、他收。做得好不好是老師的事，
          而這一位是這個世界裡的一隻生物，不是評審。
     二 · 他不知道任務內容。他只知道有一件事要有人去做。
     三 · 「」裡面的是他真的說出口的話。沒有引號的是描述——
          有幾位沒有嘴、有幾位不說話，那也是他的個性。 */
var PAT_SAY = {
  '埋岩獸': { ask: '「我不太出來。你拿過來就好。」', wait: '「你來了。這裡比較安靜吧。」',
    again: '「你又走這條。我沒換過位置。」', take: '他從岩壁裡伸出一隻手，接過去。',
    back: '「又有一件。我還是不出來。」',
    redo: '「你又回來了。我沒有走。」' },
  '裂肩': { ask: '「趁我還按得住，你去。」', wait: '「等一下——」他把肩上的縫按回去。',
    again: '「又是你。這邊又開了一道。」', take: '他鬆開一隻手來接，縫立刻開了一點。',
    back: '「還有一件。趁我還按得住。」',
    redo: '「再一次。我還按著。」' },
  '仿影': { ask: '他做了一個要東西的動作，慢半拍。', wait: '你停下來，他也停下來，然後看你。',
    again: '「又是你。」他慢半拍也說了一次。', take: '他伸手。你收手，他才收。',
    back: '他又做了一次要東西的動作，這次快一點。',
    redo: '他把你上次交出去的動作又做了一次。' },
  '咬石獸': { ask: '他咬著東西，用鼻子頂了頂你要走的方向。', wait: '他嘴裡還咬著上次那個。',
    again: '他看你一眼，沒有鬆口。', take: '他用另外一邊的牙接過去。',
    back: '他咬著東西，又頂了頂同一個方向。',
    redo: '他還咬著。看你一眼，等你。' },
  '睏頭': { ask: '「醒了醒了。要說的有點多，我盡量短。」', wait: '「你來了你來了。我剛在想事情——欸，你先說。」',
    again: '「又是你！我記得你。上次那個我還在想。」', take: '「好、好，我收著。」他一邊說一邊又睡了。',
    back: '「欸你！我剛好又想到一件——」',
    redo: '「欸？剛剛不是才……喔，好，你說。」' },
  '縫身蟲': { ask: '「我這邊還在補。那一件你去。」', wait: '他剛補完一個洞，旁邊又開一個。',
    again: '「你又來了。我也還在補。」', take: '他把線咬斷，空出手來接。',
    back: '「還有一件。我這邊還沒補完。」',
    redo: '「補一補再拿來，我懂。」' },
  '蔓群': { ask: '你往前一步，他漲了一圈。', wait: '你一走近，他就漲滿了整條路。',
    again: '他認得你的腳步，先漲了一圈。', take: '他從中間讓出一個縫，東西進去就不見了。',
    back: '他認得你了，先漲一圈才開口。',
    redo: '他讓出同一個縫，等著。' },
  '蝕壁獸': { ask: '「這邊的牆越來越薄。不是我。」', wait: '他挪開一點，露出後面薄掉的那一塊。',
    again: '「又是你。這面牆本來就這麼薄。」', take: '他接過去，順手把牆上的粉拍掉。',
    back: '「又有一件。這邊的牆又薄了。」',
    redo: '「牆還在。你也還在。」' },
  '縮根獸': { ask: '他縮了一下，然後把東西推過來。', wait: '他縮了一下，然後假裝在看別的地方。',
    again: '這次縮得比較小下。', take: '他很快接過去，好像沒有發生過。',
    back: '這次沒有縮，只把東西推過來。',
    redo: '他沒有縮，只是等著。' },
  '濕痕蟲': { ask: '「順著我留的線走就好。」', wait: '那條濕的線一路連到他腳下。',
    again: '「線還在吧。我沒有換路。」', take: '他接過去，東西上留下一個濕的手印。',
    back: '「還是那條線。再走一次。」',
    redo: '「那條線我沒有擦掉。」' },
  '無邊苔': { ask: '你走近才發現他一直在那裡。', wait: '走到很近，才看得出他到哪裡為止。',
    again: '你這次比較快找到他的邊。', take: '你把東西放上去，它慢慢沉進去了。',
    back: '你這次一走近就找到他了。',
    redo: '你這次直接走到他面前。' },
  '盈囊': { ask: '「我現在有點空。」他很在意這件事。', wait: '他還沒亮。',
    again: '「上次之後亮了一陣子。」', take: '他收下去，微微亮了一下。',
    back: '「又空了。你再幫我一次。」',
    redo: '「我還沒亮。再來一次。」' },
  '斷肢獸': { ask: '他往前爬了一段，回頭等你。', wait: '他比上次又往前了一點。',
    again: '「你走得比我快。」', take: '他用還在的那幾隻接過去。',
    back: '他又往前爬了一段，這次等得比較久。',
    redo: '「我沒有往前。等你。」' },
  '凝面獸': { ask: '你一看他他就不動了。東西擺在他前面。', wait: '他不動。你確定他剛剛在動。',
    again: '這次他慢了半拍才停下來。', take: '你一轉頭，東西就不見了。',
    back: '他已經不動了。東西早就擺好。',
    redo: '他還是不動。位置一樣。' },
  '嵌晶環': { ask: '「我出不去。你替我走一趟。」', wait: '「你到了。我還在這裡，一直都在。」',
    again: '「又是你。我還是拔不出來。」', take: '他轉了轉能轉的那一半，把東西收進晶體裡。',
    back: '「還有一件。我還是出不去。」',
    redo: '「我還在這裡。給我吧。」' },
  '稜裂': { ask: '「你看這一道。」他先給你看裂縫。', wait: '他側過身，讓光從新開的那道穿過來。',
    again: '「又開了兩道。好看吧。」', take: '他接過去，順手舉到光裡看。',
    back: '「先看這一道。然後我有一件事。」',
    redo: '「同一道光，換個角度看。」' },
  '摹晶': { ask: '他做了一次你的動作，然後問：「這樣對嗎？」', wait: '他把你走過來的樣子做了一遍。',
    again: '「上次那樣，對嗎？」', take: '他接過去，然後把你放手的樣子也做了一次。',
    back: '他先做了一次你上次的動作，才開口。',
    redo: '他把你上次的動作再做一次，然後等。' },
  '鳴脹': { ask: '「你講話小聲一點。」他已經大了一圈。', wait: '你還沒開口，他就先脹了一點。',
    again: '「又是你。上次之後我縮回去了。」', take: '他張開來接，聲音很大。',
    back: '「這次你先別出聲。我有一件事。」',
    redo: '「這次小聲一點。來吧。」' },
  '屏息者': { ask: '你看著他的時候，他一句話都沒有說。', wait: '他停住了。他在等你先移開眼睛。',
    again: '他還是停住。但這次停得比較短。', take: '你移開視線的那一下，他接走了。',
    back: '他停住了，但先把東西推了過來。',
    redo: '他又停住了，比上次久。' },
  '沉眠布': { ask: '「……現在幾點？」他問完才想起來要說什麼。', wait: '你叫了兩次他才動。',
    again: '「……幾點了。喔，是你。」', take: '他把東西收進布底下，又躺回去。',
    back: '「……又是你。幾點了。還有一件。」',
    redo: '「……你怎麼又來了。幾點了。」' },
  '綴聲蟲': { ask: '他把散掉的一段聲音接回去，才轉過來。', wait: '你的腳步聲他都收好了。',
    again: '「你這次的聲音跟上次不一樣。」', take: '他接過去，東西落下那一聲也被收起來了。',
    back: '「你上次的聲音我還留著。還有一件。」',
    redo: '「上次那一段我還接著。」' },
  '噬鐵獸': { ask: '「我靠一下而已。你先去。」', wait: '他靠著的那塊鐵板已經薄得會晃。',
    again: '「又是你。這塊本來就這麼薄。」', take: '他接過去，鐵的部分放得離自己遠一點。',
    back: '「又有一件。我沒有靠很久。」',
    redo: '「我沒有動。放上來。」' },
  '啣釘蟲': { ask: '他咬著那顆螺絲講話，含糊，但你聽懂了。', wait: '那顆螺絲還在。',
    again: '「還是那一顆。」他咬著說。', take: '他接過去，螺絲始終沒有掉。',
    back: '「還是那一顆。」他咬著說，「還有一件。」',
    redo: '「那顆還在。」他等著。' },
  '哨縫': { ask: '他身上發出一個很細的聲音。他自己沒發現。', wait: '你走近的時候那個聲音變高了。',
    again: '「你為什麼每次都看我這裡？」', take: '他接過去，聲音停了一下，又響起來。',
    back: '那個很細的聲音又響起來，這次比較急。',
    redo: '那個聲音沒有停過。' },
  '定殼獸': { ask: '他不動。你看久了，他把頭轉開。', wait: '他不動。你也不動。有點僵。',
    again: '「……你可以不要一直看。」', take: '他趁你眨眼那一下接走了。',
    back: '「……又要麻煩你。不要看我。」',
    redo: '「……我沒有看你。放著就好。」' },
  '銹鎧蟲': { ask: '他想轉過來，只轉了一點點。', wait: '「等我一下，我在轉。」',
    again: '「又是你。我還是這個角度。」', take: '他沒有轉，只是把手伸到最遠。',
    back: '「還有一件。我這次轉得比較快。」',
    redo: '「我還是這個角度。給我。」' },
  '齒節蟲': { ask: '那個規律的聲音從遠處來，停在你面前。', wait: '你聽了很久，他才到。',
    again: '「你這次比較早到。」', take: '他接過去，節拍沒有亂。',
    back: '那個規律的聲音又來了，節拍一樣。',
    redo: '節拍沒有變，他在原地。' },
  '空骨架': { ask: '他身上該掛東西的地方全都空著。', wait: '還是空的。',
    again: '「你上次拿走的那個，我掛過了。」', take: '他掛上去。還是有很多空位。',
    back: '「還有位置空著。」',
    redo: '「那個位置我留著。」' },
  '引鐵': { ask: '他經過，你口袋裡的東西動了一下。', wait: '你身上的金屬都朝著他。',
    again: '「你這次帶的東西比較少。」', take: '他沒有伸手，東西自己過去了。',
    back: '你口袋裡的東西又動了一下。',
    redo: '你手上的東西又被拉了一下。' },
  '螺深淵': { ask: '「往下放就好。會到的。」', wait: '中間那條螺紋還是看不到底。',
    again: '「上次那個到底了。」', take: '你放下去，聽不到落地的聲音。',
    back: '「再往下放一次。」',
    redo: '「再放一次。這次會到。」' },
  '炙眠獸': { ask: '他在最燙的那一塊上翻了個身，說了一句。', wait: '他睡在最燙的地方。你不太敢靠近。',
    again: '「……你來了。這裡很暖。」', take: '他沒有起來，只把爪子伸出來一點。',
    back: '「……又是你。還有一件。我翻個身。」',
    redo: '「……嗯。我沒有睡死。」' },
  '浸熔': { ask: '「剛剛好。你那邊呢？」', wait: '「水溫剛好。你要不要下來？」',
    again: '「又是你。還是剛剛好。」', take: '他抬起手，熔漿順著滴回去。',
    back: '「又有一件。這裡還是剛剛好。」',
    redo: '「還是剛剛好。再來。」' },
  '焰摹': { ask: '他把你的動作做了一次，比你大。', wait: '你抬手，他抬得更高。',
    again: '「又是你。」他喊得比你大聲。', take: '他接過去的動作大得像在慶祝。',
    back: '他把你上次的動作做了一次，更大。',
    redo: '他做了一次你回來的動作，更大。' },
  '炭群': { ask: '你往前一步，他燒得更旺。', wait: '你一走近，整條路都亮起來。',
    again: '他認得你，先旺了一下。', take: '東西進去，火苗跳了一下就平了。',
    back: '他先旺了一下，然後才要東西。',
    redo: '他沒有滅，還旺著。' },

  '林踏': { ask: '他把揹著的那堆放下一點，看了你一眼，又揹回去。',
    wait: '你走近，他往後退了半步，還是站著。',
    again: '他這次沒有退，只是把揹著的東西挪了挪。',
    take: '他伸手接過去，動作很輕，跟他的體型不太相稱。',
    back: '他又揹著新的一堆過來，把東西放到你腳邊。',
    redo: '他看了一眼，沒有退，等你重新放上去。' },
  '沙鳴': { ask: '地面震了一下，他就在你腳邊冒出頭。',
    wait: '你站定，地面又震了一下，這次比較近。',
    again: '他這次沒有震，直接從你腳邊冒出來。',
    take: '他用頭頂了一下東西，把它捲進土裡。',
    back: '地面又震了一下，這次帶著新的一件事。',
    redo: '他已經在原地等，土都沒有蓋回去。' },
  '沉頸': { ask: '水面只浮出他的頭，看著你，沒有再往上。',
    wait: '你到的時候，水面剛好只有一圈波紋。',
    again: '他這次浮得比較高，看得到肩膀那一段。',
    take: '他低下頭，用嘴接過去，水順著滴下來。',
    back: '水面又浮起他的頭，這次帶著新的事。',
    redo: '他還浮在原地，水紋都還沒散。' },
  '警蛾': { ask: '他張開那道裂縫，裡面一排眼睛看著你。',
    wait: '你走近，裂縫裡的眼睛一個一個轉向你。',
    again: '這次他沒有全部轉過來，只有幾隻眼睛在看。',
    take: '裂縫合起來一半，接過去之後又慢慢張開。',
    back: '裂縫又張開了，這次帶著新的一件事。',
    redo: '裂縫還開著，眼睛都在等你。' },
  '雜肢獸': { ask: '他伸出其中一節，比劃了一下要你去做的方向。',
    wait: '他的好幾節同時轉向你，長短不一。',
    again: '這次只有一節轉過來，其他的還在忙別的。',
    take: '離你最近的那一節接了過去。',
    back: '又有一節伸出來，比劃了新的方向。',
    redo: '同一節還伸著，等你重新交回去。' },
  '夜飲者': { ask: '他蹲在原地，滴下來的東西在地上積了一小灘。',
    wait: '你靠近的時候，他抬起頭，沒有動。',
    again: '他這次蹲得比較低，滴得比較慢。',
    take: '他伸手接過去，指尖還是濕的。',
    back: '他又蹲回原位，地上那一小灘又多了一點。',
    redo: '他還蹲著，那一灘沒有乾。' },
  '尖首': { ask: '他浮起來一點，頭頂那東西轉向你要走的方向。',
    wait: '你走近，他浮得比剛才更高，沒有出聲。',
    again: '這次他沒有升高，只是浮在原地看你。',
    take: '他伸手接過去，指尖沒有碰到地面。',
    back: '他又浮起來，頭頂那東西轉向新的方向。',
    redo: '他還浮在原地，沒有再升高。' },

  '雪隱': { ask: '他往雪地那邊看了一眼，腳印已經開始被蓋掉。',
    wait: '你到的時候，他的腳印還剩最後幾個。',
    again: '這次你比雪還快找到他。',
    take: '他伸手接過去，手上還沾著雪。',
    back: '他又留下一串腳印，這次比較深。',
    redo: '腳印還在，沒有被蓋掉。' },
  '潮糾': { ask: '他伸展了一下，水面裂出好幾道紋路。',
    wait: '水面的紋路指向他的方向。',
    again: '這次紋路比較淺，他沒有伸展那麼大。',
    take: '他收回一截，把東西捲進水裡。',
    back: '水面又裂開，這次帶著新的一件事。',
    redo: '紋路還在，他沒有收回去。' },
  '橙皮仔': { ask: '他那雙比頭還大的眼睛盯著你，沒有說話。',
    wait: '你蹲下來，他才看得到你的臉。',
    again: '他這次沒有躲，站得比較前面。',
    take: '他伸出小小的手，接過去就退了一步。',
    back: '他又站到你面前，眼睛比上次更亮。',
    redo: '他站在原地，眼睛還是盯著。' },
  '夜鴞': { ask: '他張開翅膀，兩顆眼睛這時候才看得清楚。',
    wait: '你到的時候，他的翅膀還收著。',
    again: '這次他沒有全部張開，只轉頭看你。',
    take: '他闔上一半翅膀，用另一邊接過去。',
    back: '翅膀又張開了，這次帶著新的一件事。',
    redo: '翅膀還開著，眼睛都在等你。' },
  '夜行者': { ask: '你只看得到兩條腿，其他都在暗處。',
    wait: '那兩條腿停在你面前，沒有再往前。',
    again: '這次它們沒有停，你追上才停下來。',
    take: '其中一條腿頂了一下東西，收下去了。',
    back: '兩條腿又出現，這次走得比較快。',
    redo: '腿還在原地，沒有再走。' },
  '澤鱗': { ask: '他蹲在濕地裡，皮膚的顏色跟泥差不多。',
    wait: '你走近才看出他蹲在哪裡。',
    again: '這次你比較快找到他的輪廓。',
    take: '他伸手接過去，指縫還是濕的。',
    back: '他又蹲回原位，這次蹲得更低。',
    redo: '他還蹲著，位置沒有換。' },

  '蛙燈': { ask: '他肚子那圈亮了一下，像是在催促。',
    wait: '你到的時候，那圈光剛好暗下去。',
    again: '這次你一到，光就亮了起來。',
    take: '他接過去，那圈光跳了一下。',
    back: '光又亮起來，這次帶著新的一件事。',
    redo: '光還亮著，沒有暗下去。' },
  '河眠者': { ask: '水面留下一條細細的痕，指向你要走的方向。',
    wait: '你到的時候，那條痕跡剛好消失。',
    again: '這次痕跡還在，比較深。',
    take: '他滑過來，接過去又貼著水面退開。',
    back: '水面又留下一條痕，這次比較長。',
    redo: '痕跡還在，沒有散開。' },
  '蝠影': { ask: '他張開的時候，你數不清幾片翼在動。',
    wait: '你到的時候，他收著翼，看不出形狀。',
    again: '這次他張開得比較快。',
    take: '其中一片翼接過去，其他還在動。',
    back: '他又張開，這次翼比較多片在動。',
    redo: '翼還開著，沒有收回去。' },
  '隧蟲': { ask: '他從舊廊道鑽出來，鱗片上還沾著鏽。',
    wait: '你到的時候，廊道口只剩一點鏽屑。',
    again: '這次他沒有整隻鑽出來，只探出頭。',
    take: '他用鱗片蹭了一下，把東西捲進廊道。',
    back: '他又從廊道鑽出來，這次帶著新的鏽屑。',
    redo: '他還探著頭，沒有縮回去。' },
  '迷光': { ask: '你往前一步，他退開一步，距離沒有變。',
    wait: '你停下來，他也停在原來的距離。',
    again: '這次他退得比較快，但距離還是一樣。',
    take: '你伸手，他湊近一點點，接過去又退開。',
    back: '他又出現在同樣的距離，帶著新的一件事。',
    redo: '距離沒有變，他還在原地等。' }
};

/* 他這一刻說什麼。查不到就回空字串——呼叫端自己有原本那一句
   （見 67-battle.js 的 btLine），所以少一位不會讓畫面破掉。 */
function patSay(c, k) {
  var s = c && c.n ? PAT_SAY[c.n] : null;
  return (s && s[k]) || '';
}

function dressPatrons() {
  var by = {};
  PATRONS.forEach(function (p) { by[p[0]] = p; });

  allFauna().forEach(function (c) {
    var p = by[c.n];
    if (!p) return;
    /* 名字跟那一句話一起換掉。住哪一層不動——那是這個世界的骨架。 */
    c.n = p[1];
    c.t = p[2];
    c.px = patPx(p[3], p[4]);
    /* 第二幀。怎麼動由體型決定（見 PAT_IDLE）——站著的呼吸、
       浮著的整個沉、細的搖、硬的只有光在閃。 */
    c.px2 = patMove(c.px, PAT_IDLE[p[3]] || 'bob');
    /* 放大那一頁用的那一張。同一個人、同一個姿態，格子多 2.3 倍——
       眼睛有瞳孔、手有指節、布有褶。 */
    c.big = patBigPx(p[3], p[4]);
    if (c.big) c.big2 = patMove(c.big, PAT_IDLE[p[3]] || 'bob');
    /* 他自己的四句話。 */
    c.say = PAT_SAY[p[1]] || null;
  });
}

/* 一載入就換掉。住哪一層不動——名字、那一句話、圖都換。 */
dressPatrons();
