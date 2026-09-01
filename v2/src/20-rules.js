/* 全部的計算都在這裡，而且只在這裡。

   規格書 00 的第二條原則：一個概念一個來源。分數、抽數、期限這種規則
   各只有一份定義。第三條：文案跟規則綁在一起——所以講規則的句子不是寫死的
   字串，是從下面的數字組出來的。改 PASS 的值，畫面上那句話會跟著變，
   不會變成一句謊話。 */

var RULES = {

  /* ---------- 分數 ---------- */
  PASS: 100,        /* 通過一項 */
  DROP: 30,         /* 掉落物一件 */
  TOOL: 500,        /* 放行一層給的道具 */
  TROPHY: 500,      /* 放行一層給的守關戰利品 */
  CHECK: 0,         /* 勾選一條 */
  ROUND: 0,         /* 來回一次 */

  /* ---------- 抽數 ---------- */
  DRAW_MIN: 1,
  DRAW_MAX: 8,

  /* ---------- 其他 ---------- */
  GAVE_MIN: 0,
  GAVE_MAX: 5,
  REDIG_DAYS: 7,    /* 回頭補強：滾動 7 天一次，不是日曆週 */
  OFFER: 3,         /* 放行一層時攤開幾件戰利品讓他們挑 */
  LAYERS: 4,
  START_MIN: 0,     /* 中途接手：起點可設 0–4 層 */
  START_MAX: 4
};

RULES.RELEASE = RULES.TOOL + RULES.TROPHY;   /* 老師放行一層 */

/* 老師給分的六個錨點。分數就是索引，所以順序不能動。 */
RULES.GAVE = [
  { n: 0, anchor: '完全沒有', effect: '抽數 ＝ 層數（無加成）' },
  { n: 1, anchor: '幾乎沒有', effect: '＋1 次' },
  { n: 2, anchor: '有一點', effect: '＋2 次' },
  { n: 3, anchor: '中等', effect: '＋3 次' },
  { n: 4, anchor: '明顯多做', effect: '＋4 次' },
  { n: 5, anchor: '遠超出要求', effect: '＋5 次' }
];

/* 老師那一格的題目。它是一個陳述句，不是問句——老師是在判斷這句話成不成立。
   這是整個系統唯一能獎勵「不只把作業交出來」的地方。 */
RULES.GAVE_STATEMENT =
  '這一組在這一項裡，不只是把作業交出來——多研究了、多畫了別的草圖、' +
  '給了不同的做法，或是有額外的產出。';

function clamp(lo, hi, n) { return Math.max(lo, Math.min(hi, n)); }

/* 抽幾次 ＝ clamp(1, 8, 層數 ＋ 老師給的 0–5)
   L1 給 0 ＝ 抽 1 次；L4 給 5 ＝ 抽 8 次（上限）。 */
RULES.draws = function (layer, gave) {
  return clamp(RULES.DRAW_MIN, RULES.DRAW_MAX,
    (Number(layer) || 1) + (Number(gave) || 0));
};

RULES.gaveAnchor = function (g) {
  var row = RULES.GAVE[clamp(RULES.GAVE_MIN, RULES.GAVE_MAX, Number(g) || 0)];
  return row ? row.anchor : RULES.GAVE[0].anchor;
};

/* ---------- 天 ---------- */
/* 週整套拿掉了。這裡沒有任何東西會問「今天禮拜幾」——所以學期中間
   任何一天開始用都一樣。 */

var DAY = 86400000;

function dayStart(ts) { var d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }

/* 停留天數：從進到這一層那一刻起算 */
RULES.stayDays = function (enteredAt, now) {
  if (!enteredAt) return 0;
  return Math.max(0, Math.floor(((now || Date.now()) - enteredAt) / DAY));
};

/* 回頭補強：滾動 7 天一次。回傳還要等幾天，0 ＝ 現在就可以送。 */
RULES.redigWaitDays = function (lastAt, now) {
  if (!lastAt) return 0;
  var passed = ((now || Date.now()) - lastAt) / DAY;
  return Math.max(0, Math.ceil(RULES.REDIG_DAYS - passed));
};

/* ---------- 期限 ---------- */
/* 幾天後／指定日期／不設限。逾期只標示，不阻擋。 */

var WEEK_CH = ['日', '一', '二', '三', '四', '五', '六'];

RULES.due = function (due, now) {
  if (!due) return { none: true, text: '不設限', tone: 'mute' };
  var d = new Date(due);
  var left = Math.round((dayStart(due) - dayStart(now || Date.now())) / DAY);
  var head = (d.getMonth() + 1) + '/' + d.getDate() + '（' + WEEK_CH[d.getDay()] + '）';
  if (left > 0) return { text: head + ' · 還有 ' + left + ' 天', left: left, tone: left <= 2 ? 'warn' : 'ok' };
  if (left === 0) return { text: head + ' · 就是今天', left: 0, tone: 'warn' };
  return { text: head + ' · 逾期 ' + (-left) + ' 天', left: left, over: true, tone: 'over' };
};

/* ---------- 分數怎麼來的 ---------- */
/* 排行榜每一列拆給你看的那一段，跟總分是同一支函式算的——
   不會有「明細加起來不等於總分」這種事。 */
RULES.score = function (t) {
  var parts = [];
  var passed = t.passed || 0, drops = t.drops || 0, released = t.released || 0;
  if (passed)   parts.push({ k: '通過 ' + passed + ' 項', v: passed * RULES.PASS });
  if (drops)    parts.push({ k: '掉落物 ' + drops + ' 件', v: drops * RULES.DROP });
  if (released) parts.push({ k: '放行 ' + released + ' 層', v: released * RULES.RELEASE });
  var total = parts.reduce(function (s, p) { return s + p.v; }, 0);
  return { parts: parts, total: total };
};

/* ---------- 講規則的句子 ---------- */
/* 這些不是文案常數，是從上面的數字組出來的。規則改了，句子跟著改。 */
RULES.say = {
  pass:    function () { return '通過一項 ＋' + RULES.PASS + ' 分'; },
  drop:    function () { return '掉落物一件 ＋' + RULES.DROP + ' 分'; },
  release: function () { return '老師放行一層 ＋' + RULES.RELEASE + ' 分（道具 ' +
                                RULES.TOOL + ' ＋ 守關戰利品 ' + RULES.TROPHY + '）'; },
  check:   function () { return '勾選一條 ' + RULES.CHECK + ' 分'; },
  round:   function () { return '來回一次 ' + RULES.ROUND + ' 分'; },
  draws:   function () { return '抽幾次 ＝ 層數 ＋ 老師給的 ' + RULES.GAVE_MIN + '–' + RULES.GAVE_MAX +
                                '，最少 ' + RULES.DRAW_MIN + ' 次、最多 ' + RULES.DRAW_MAX + ' 次'; },
  redig:   function () { return '滾動 ' + RULES.REDIG_DAYS + ' 天一次'; },
  drawsFor: function (layer, gave) {
    return '第 ' + layer + ' 層 ＋ 他給的 ' + gave + ' ＝ 抽 ' + RULES.draws(layer, gave) + ' 次';
  },
  /* 每一件掉落物一樣重。不寫明學生會腦補稀有的比較值錢。 */
  sameWeight: function () {
    return '每一件都是 ' + RULES.DROP + ' 分，一件不多一件不少。稀有度只影響出現機率，撿到哪一件不影響名次。';
  }
};

/* 戰利品是「挑」的，不是「發」的。

   攤開哪三件只跟「這一層還有哪幾件沒拿過」有關，跟這一組做得好不好
   完全無關——反過來做（重交三次所以發給你斷柄鑿）的那一秒，它就從
   一句話變成一個評價，而這個系統從頭到尾不評價任何人。

   三件一樣重、分數在放行那一刻就記上了，所以挑哪一件不影響任何數字。
   它只影響你帶走哪一句話——挑那一句本身就是省思。 */
RULES.PICK_SAY = '這 ' + RULES.OFFER + ' 件是這一層你們還沒拿過的裡面攤出來的，跟你們做得好不好無關。' +
  '三件一樣重，' + RULES.TROPHY + ' 分在他放行的那一刻就記上了——挑哪一件不影響任何數字，' +
  '只影響你們帶走哪一句話。';

/* 老師寫過的那些字會累積成一疊。他本來就要寫，所以這是零負擔的那一種累積。 */
RULES.STACK_SAY = '他每判一件就寫一段。那些字在這裡疊起來——交下一件之前可以先翻。' +
  '第十次交件的時候，你對「合格長什麼樣」的掌握不會跟第一次一樣。';

/* 剖面是描述，不是評價。 */
RULES.CURVE_SAY = '這一頁只有你們自己走過的時間：哪一天開的、哪一天交的、走了幾輪、等了幾天。' +
  '它不打分、不跟別組比，也沒有一條「應該長這樣」的線。看得到自己的節奏，才有得調。';
/* 唯一的門檻。所有畫面都不該暗示還有第二道。 */
RULES.GATE = '只有老師放行，一組才會往下一層。';
