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
  /* 只剩一種材質。三階那個「越深牌子越好」的漸層拿掉了——
     深度已經不是進度，留著它跟其他每一條規則都打架。 */
  SIGN_TIERS: ['iron'],

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
   系統唯一會說的一句話，而且它只比對兩個數字：你說幾天、實際幾天。

   底下那一句刻意只講發生了什麼，不講為什麼。原本寫的是
   「你把它想得比實際難」——那是我在猜。提早也可能是題目本來就小、
   也可能是他們砍了範圍，系統一個都不知道。 */
RULES.STAMPS = {
  early: { key: 'early', mark: '🚀', name: '比承諾的早',
           why: '比你自己說的天數早。' },
  exact: { key: 'exact', mark: '🎯', name: '跟承諾的一樣',
           why: '你說幾天，就是幾天。' },
  late:  { key: 'late',  mark: '❌', name: '比承諾的久',
           why: '比你自己說的天數久。這不會拿走任何權利。' }
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

/* ---------- 他們自己那一份清單 ----------

   本來這裡有兩份我寫死的詞表：八種卡關原因、六種「今天動的是哪一塊」。
   兩份都拿掉了，因為那等於我先替他們定義了「一個專案會做的事」與
   「一個專案會出的錯」。設計系的一天可能是打樣、拍照、找廠商，
   那三個字我一個都想不到——想得到也不該由我想。

   換成一份，而且是那一組自己寫的（存在 Teams.acts，見 40-db.js）。
   同一份清單問三個不同的問題：

     每天      今天動的是哪一件？
     承諾時    哪幾件你覺得會比想的久？
     營火      哪一件真的比你想的久？

   零輸入框那條原則沒有破：清單只寫一次，之後每天都是一下點擊。
   沒寫的組也走得完——那一顆鍵就退回「我今天來過了」。 */
RULES.STEPS_MAX = 12;     /* 一個里程碑最多分幾段 */

/* ---------- 這一趟留下哪一件 ----------

   本來這裡是六句我寫的格言（「下一次一開始就動」）。三選一等於在我的
   六句裡選，那不算自主；而且六句用完就重複，通用到誰都適用，
   也就等於誰都不適用。

   改成：老師勾完可以之後，攤開的三張是這一趟真的發生的三件事，
   用他們自己的詞寫的。學生挑一張當作這一趟的重點。

   三張分別是三個角度，永遠是這三個，不隨機——隨機會讓它跟剛剛
   那幾天斷開，那正是舊版最大的問題：

     days   這幾天你在做什麼      （從每天點的那一下算出來）
     est    你估得怎麼樣          （只比兩個數字）
     over   哪一件比你想的久      （他們自己在營火說的）

   每一張只陳述，不解釋。沒有「所以下一次應該……」——
   那一句一旦寫出來，這個系統就變回一個替他們想結論的東西。 */
RULES.KEEPS = [
  { key: 'days', name: '日誌', tro: 15, eyebrow: '這幾天你在做什麼' },
  { key: 'est',  name: '沙漏', tro: 19, eyebrow: '你估得怎麼樣' },
  { key: 'over', name: '量尺', tro: 2,  eyebrow: '哪一件比你想的久' }
];
RULES.keepOf = function (key) {
  for (var i = 0; i < RULES.KEEPS.length; i++) {
    if (RULES.KEEPS[i].key === key) return RULES.KEEPS[i];
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

/* 停滯的說法。不講「你逾期了」，講畫面上發生了什麼。
   而且講的是他自己說的那個數字，不是我規定的期限。 */
RULES.stallSay = function (level, days) {
  if (level === 2) return '水淹過頭了。比你自己說的多 ' + days + ' 天。';
  if (level === 1) return '水漫過來了。比你自己說的多 ' + days + ' 天。';
  return '';
};

/* ---------- 走到哪了 ----------
   迷霧走廊的長度＝承諾的天數。推進一次前進一格。
   走完不等於完成——完成是上傳作業那一刻。 */
RULES.progress = function (pushes, est) {
  var e = Math.max(1, Number(est) || 1);
  return clamp(0, 1, (Number(pushes) || 0) / e);
};
