/* 全部的計算都在這裡，而且只在這裡。

   一個概念一個來源。文案跟規則綁在一起——講規則的句子不是寫死的字串，
   是從下面的數字組出來的。改 BAND 的值，畫面上那句話會跟著變，
   不會變成一句謊話。

   這個系統跟成績無關。它不判斷作業好不好，只判斷「你對自己的預估準不準」。
   那是刻意的：拖延的根不是懶，是對「這件事要花多久」沒有體感。 */

var RULES = {

  /* ---------- 自我承諾 ---------- */
  EST_MIN: 1,          /* 滑桿最少 1 天 */
  EST_MAX: 21,         /* 最多三週。再長就不是一個里程碑了 */
  EST_DEFAULT: 5,

  /* ---------- 判定 ---------- */
  /* 容許誤差＝預估天數的兩成，最少 1 天。
     estimate 5 天 → ±1 天算準；estimate 14 天 → ±3 天算準。
     用比例而不是固定值，因為估 3 天差 2 天跟估 20 天差 2 天不是同一回事。 */
  BAND_RATIO: 0.2,
  BAND_MIN: 1,

  /* ---------- 推進 ---------- */
  PUSH_PER_DAY: 1,     /* 一天一次。多按沒有用，這不是點擊遊戲 */
  STALL_DAYS: 2,       /* 幾天沒推進就開始長藤蔓 */
  SLEEP_DAYS: 4,       /* 幾天沒推進角色會睡著 */
  /* 補登補得回幾天前。兩天：忘一次補得回來，忘一週補不回來——
     再往上加就變成「最後一天一次補完」，那條走廊就不再是紀錄了。
     補登不會改判定：實際天數是承諾那天到交出去那天算的。 */
  BACKFILL_MAX: 2,

  /* ---------- 招牌 ---------- */
  /* 專案名稱看板的三階。老師每改寫一次名稱就往上升一階——
     視覺材質的升級就是對邏輯收斂最直接的肯定，不用多說一句話。 */
  SIGN_TIERS: ['wood', 'iron', 'glow'],

  /* 這個系統沒有的東西寫在 check.js 的 BANNED 裡，不寫在這裡——
     寫在這裡等於把那些詞放進畫面，檢查器會抓（而且抓得對）。 */
  _: null
};

function clamp(lo, hi, n) { return Math.max(lo, Math.min(hi, n)); }

/* 容許誤差：估幾天，準的範圍就有多寬 */
RULES.band = function (est) {
  return Math.max(RULES.BAND_MIN, Math.round((Number(est) || 0) * RULES.BAND_RATIO));
};

/* ---------- 三種印章 ----------
   這是整個系統唯一的「評價」，而且評的是預估能力，不是作品好壞。
   遲到不是失敗，是一次判斷失準——那本身就是可以拿來練的資料。 */
RULES.STAMPS = {
  early: { key: 'early', mark: '🚀', name: '超乎預期',
           why: '比你自己承諾的還早。你把它想得比實際難。' },
  exact: { key: 'exact', mark: '🎯', name: '精準預測',
           why: '你說幾天就是幾天。這是專案管理裡最難練的一件事。' },
  late:  { key: 'late',  mark: '❌', name: '判斷失準',
           why: '比你承諾的久。承認並說出卡在哪，比準時更有價值。' }
};

/* 判定：拿實際花的天數比對當初承諾的 */
RULES.judge = function (est, actual) {
  var e = Number(est) || 0, a = Number(actual) || 0, b = RULES.band(e);
  if (a < e - b) return RULES.STAMPS.early;
  if (a > e + b) return RULES.STAMPS.late;
  return RULES.STAMPS.exact;
};

/* 判定的說明句。從數字組出來，所以改 BAND_RATIO 這句話會跟著變。 */
RULES.judgeWhy = function (est, actual) {
  var b = RULES.band(est);
  return '你承諾 ' + est + ' 天，實際花了 ' + actual + ' 天。' +
         '誤差 ' + b + ' 天以內算準（預估的 ' + Math.round(RULES.BAND_RATIO * 100) + '％）。';
};

/* ---------- 卡關的原因 ----------
   全部做成圖示快選，不要輸入框。要打字的反思沒有人會寫，
   而且打字會把防衛心叫起來——點一個標籤不會。 */
RULES.SNAGS = [
  { key: 'scope',  icon: '🌀', label: '範圍變大了',   hint: '做著做著發現要做的比想的多' },
  { key: 'wait',   icon: '⏳', label: '在等別人',     hint: '等回覆、等資料、等隊友' },
  { key: 'skill',  icon: '🔧', label: '不會做',       hint: '需要先學一個沒學過的東西' },
  { key: 'start',  icon: '🪨', label: '開不了頭',     hint: '知道要做什麼，但一直沒動' },
  { key: 'split',  icon: '✂️', label: '拆得太粗',     hint: '一件事其實是三件事' },
  { key: 'life',   icon: '🌧️', label: '別的事插進來', hint: '其他課、打工、身體' },
  { key: 'redo',   icon: '🔁', label: '做了又重做',   hint: '方向改過' },
  { key: 'guess',  icon: '🎲', label: '純粹估錯',     hint: '沒有特別的原因，就是想得太快' }
];

RULES.snagOf = function (key) {
  for (var i = 0; i < RULES.SNAGS.length; i++) {
    if (RULES.SNAGS[i].key === key) return RULES.SNAGS[i];
  }
  return null;
};

/* ---------- 風險標記 ----------
   派發任務時學生可以先標「我覺得這裡會卡」。事後對照——
   標對了就是預見能力，那比準時更值錢。 */
RULES.RISKS = RULES.SNAGS.slice(0, 6);

/* ---------- 裝備 ----------
   老師不發裝備。他只勾「可以」，然後學生從隨機攤開的三件裡挑一件。

   為什麼是學生挑：老師選哪一件＝老師替他決定「你這一次的優點是什麼」，
   那是評價。學生自己挑＝他自己說「這一次我想記住的是這句」，那是自主。
   每一件綁的那句話因此是給他自己讀的，不是老師的評語。 */
/* 每一件底下那句話，是「下一次帶著走的」，不是「這一次做得如何」。

   這件事很要緊：三件是隨機攤開的，所以句子如果在講剛剛那一輪，
   一個失準的人抽到「推進得乾脆」就變成謊話。寫成往前看的一句話，
   它才是學生自己選要記住的東西，而不是系統對他的評語。 */
RULES.GEARS = [
  { key: 'sword',   icon: '⚔️', name: '銳劍',   why: '下一次一開始就動。最難的從來不是做完，是開始。' },
  { key: 'compass', icon: '🧭', name: '指南針', why: '下一次先想清楚要走去哪，再決定要走幾天。' },
  { key: 'lamp',    icon: '🏮', name: '提燈',   why: '卡住的時候先講出來。看得見的困難才處理得掉。' },
  { key: 'shield',  icon: '🛡️', name: '盾',     why: '下一次先把會出事的地方標起來。預見比準時值錢。' },
  { key: 'boots',   icon: '👢', name: '快靴',   why: '一天一步也是往前。不要等到有一整天的空檔才開始。' },
  { key: 'map',     icon: '🗺️', name: '殘圖',   why: '太大的事先拆開。拆得動，才估得準。' }
];

/* 招牌的階由深度決定，不由任何人手動調。
   走完的里程碑越多，坑道口的招牌材質越好——木牌、鐵牌、會發光的銘牌。 */
RULES.SIGN_AT = [0, 2, 4];
RULES.signTierOf = function (depth) {
  var n = 0;
  for (var i = 0; i < RULES.SIGN_AT.length; i++) {
    if ((Number(depth) || 0) >= RULES.SIGN_AT[i]) n = i;
  }
  return n;
};

RULES.gearOf = function (key) {
  for (var i = 0; i < RULES.GEARS.length; i++) {
    if (RULES.GEARS[i].key === key) return RULES.GEARS[i];
  }
  return null;
};

/* ---------- 今天動的是哪一塊 ----------

   推進那一下要點的東西。它不是額外的一步——那一排圖示「就是」推進鍵，
   點任何一個都算今天動過了，所以點擊數跟原本的一顆鍵一樣。

   為什麼要分這幾類：一來每一天長得不一樣，走廊回頭看得出形狀；
   二來營火那一頁可以拿它對照——「你這一趟六天有四天在查，
   難怪做的時間不夠」，那句話沒有這份資料就講不出來。

   最後一個「說不上來」是必要的。逼人分類會讓他為了分類而分類，
   那一秒資料就開始說謊。 */
RULES.DOING = [
  { key: 'look', icon: '🔍', label: '查',   hint: '找資料、看別人怎麼做' },
  { key: 'plan', icon: '✏️', label: '想',   hint: '畫草圖、排順序、想清楚' },
  { key: 'make', icon: '🛠️', label: '做',   hint: '真的動手做出東西' },
  { key: 'talk', icon: '💬', label: '談',   hint: '討論、訪談、問人' },
  { key: 'redo', icon: '🔁', label: '改',   hint: '修上一版' },
  { key: 'any',  icon: '⛏️', label: '說不上來', hint: '就是動了' }
];
RULES.doingOf = function (key) {
  for (var i = 0; i < RULES.DOING.length; i++) {
    if (RULES.DOING[i].key === key) return RULES.DOING[i];
  }
  return null;
};

/* ---------- 停滯 ----------
   系統不發「已逾期」通知。狀態本身就是回饋：幾天沒推進，畫面自己會暗下來。
   這是勸導式設計的核心——不指責，只是讓停下來這件事看得見。 */
RULES.stallOf = function (lastPushAt, nowTs) {
  if (!lastPushAt) return { level: 0, days: 0 };
  var days = Math.floor((nowTs - lastPushAt) / 86400000);
  if (days >= RULES.SLEEP_DAYS) return { level: 2, days: days };   /* 睡著 */
  if (days >= RULES.STALL_DAYS) return { level: 1, days: days };   /* 長藤蔓 */
  return { level: 0, days: days };
};

/* 停滯的說法。不講「你逾期了」，講畫面上發生了什麼。 */
RULES.stallSay = function (level, days) {
  if (level === 2) return '牠睡著了。' + days + ' 天沒有推進——按一下就會醒。';
  if (level === 1) return '藤蔓爬上來了。' + days + ' 天沒有推進——推一次就會碎掉。';
  return '';
};

/* ---------- 走到哪了 ----------
   迷霧走廊的長度＝承諾的天數。推進一次前進一格。
   走完不等於完成——完成是上傳作業那一刻。 */
RULES.progress = function (pushes, est) {
  var e = Math.max(1, Number(est) || 1);
  return clamp(0, 1, (Number(pushes) || 0) / e);
};
