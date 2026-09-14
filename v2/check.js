/* 殘留檢查。build 之後跑：node v2/check.js

   這一支守的是「這個作品明確不要的東西」。拿掉一個概念之後，字常常還留著，
   靠人一頁一頁讀不會有終點。

   只掃 index.html 裡畫得出來的字（字串常數與 HTML 文字），不掃註解：
   註解裡本來就會提到「分數拿掉了」這種話。 */

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let src = fs.readFileSync(file, 'utf8');

/* 註解整段拿掉——那裡本來就在講「什麼被拿掉了」 */
const scan = src.replace(/\/\*[\s\S]*?\*\//g, ' ');

/* ---------- 一 · 不該出現的字 ----------
   《專案地下城》不用分數評斷、不排名、不通知逾期。
   這些詞一旦出現在畫面上，SDT 那三根柱子就有一根塌了。 */
const BANNED = [
  /* 勝任感：判定的是預估準度，不是作業好壞 */
  ['分數', '這個系統不給分。判定的是預估準度，不是作業好壞'],
  ['得分', '同上'],
  ['總分', '同上'],
  ['等第', '同上'],
  ['評分', '老師發的是裝備，不是評分'],
  ['扣分', '失準不扣任何東西——那是除罪化拖延的前提'],
  /* 關聯性：平行陪伴，不是競爭

     2026-09-02：「排行榜」與「名次」解禁。使用者以 RtD 為方法決定
     要做一個排行榜——東西做出來、放進去用、看實際發生什麼；
     評價不好就拿掉，而「拿掉」本身也是一個發現（見 68-rank.js）。

     解禁的只有那兩個詞。底下這四個還是擋著，因為它們不是「有沒有
     排名」的問題，是「怎麼描述別人」的問題——一旦畫面上出現
     『你領先兩組』，那張榜就從一面鏡子變成一根棒子。 */
  ['第 1 名', '不要把位置說成頭銜'],
  ['領先', '同上'],
  ['落後', '同上——別人走到哪不是你的參照點'],
  ['贏過', '同上'],
  /* 自主性：期限是自己承諾的，不是被規定的 */
  ['死線', '期限由學生自己拉滑桿決定，那是承諾不是死線'],
  ['逾期', '系統不發逾期通知。停滯用畫面暗下來表示'],
  ['遲交', '同上'],
  ['催繳', '同上'],
  ['已過期', '同上'],
  /* 上一版留下的概念 */
  ['礦石', '上一個作品的東西'],
  /* 「圖鑑」2026-09-01 解禁。當初擋它是因為上一個作品的圖鑑是一條收集
     進度條（收集了 12／40），那會把「做更多任務」變成「填更多格子」。
     2026-09-05 又加了鎖：老師收下那一件之後，那一位才進圖鑑，
     沒解鎖的畫成黑影（見 64-codex.js）。鎖跟收集進度是兩件事——
     鎖住的是「他還沒收下」，那是一件真的還沒發生的事；收集進度是
     「你還差 28 個」，那是一條要填滿的條。守住的還是下面那一條。 */
  ['收集了', '圖鑑不可以有收集進度——那會變回一條要填滿的條'],
  ['收集進度', '同上'],
  ['掉落物', '同上'],
  ['守關生物', '這裡的魔物是里程碑，不是關卡'],
  ['放行', '老師只勾一個「可以」，裝備是學生自己挑的'],
  ['學期第', '預設了一個學生沒有的行事曆'],
  ['甘特', '沒有排程表'],
  ['怎麼用這一頁', '要看說明才會用，就表示那一頁沒寫好']
];

/* 畫面代號不可以露在標題上 */
const CODE = /(^|[^A-Za-z])[STC]-\d{2}([^A-Za-z]|$)/;

/* 同名的函式：後面載入的會把前面那一份靜靜地蓋掉。
   已經咬過三次（ACTS.claim、cycleAt、還有 CSS 的 .tide），
   而且每一次看起來都只是某一頁壞了，很難找。 */
function dupNames(files) {
  const seen = {}, dup = [];
  files.forEach((f) => {
    const src = fs.readFileSync(f, 'utf8');
    const re = /^function ([A-Za-z_$][\w$]*)/gm;
    let m;
    while ((m = re.exec(src))) {
      if (seen[m[1]] && seen[m[1]] !== f) dup.push(m[1] + '　' + seen[m[1]] + ' 與 ' + f);
      else seen[m[1]] = f;
    }
  });
  return dup;
}

const SRC_PRE = fs.readdirSync(path.join(__dirname, 'src'))
  .filter((f) => f.slice(-3) === '.js').sort()
  .map((f) => path.join(__dirname, 'src', f));

let bad = 0;

BANNED.forEach(([w, why]) => {
  const i = scan.indexOf(w);
  if (i < 0) return;
  bad++;
  console.error('禁用詞　' + w + '　——' + why);
  console.error('　　' + scan.slice(Math.max(0, i - 40), i + 40).replace(/\s+/g, ' '));
});

/* hash 回傳無號數，但 >> 是有號位移：超過 2^31 就變負的。
   咬過一次——地圖上有格子跑到 y = -2，而畫面上看起來只是位置怪怪的。 */
SRC_PRE.forEach((f) => {
  const src = fs.readFileSync(f, 'utf8').replace(/\/\*[^]*?\*\//g, ' ');
  const m = src.match(/[a-z]\s*>>\s*[0-9]/g);
  if (m) {
    bad++;
    console.error('有號位移　' + path.basename(f) + '　' + m.join(' ') +
      '　——hash 是無號的，要用 >>>，不然超過 2^31 會變負的');
  }
});

/* 撞名這件事這一場咬了四次：ACTS.claim、cycleAt、CSS 的 .tide、CSS 的 .lg。
   每一次都是後面那一份靜靜地蓋掉前面那一份，而畫面上看起來只是某一頁
   排版怪怪的——最後那一次（.lg 已經是剖面圖圖例的 class）花了很久才找到。

   函式那一邊擋得住（見下面），CSS 那一邊擋不住：這份 CSS 本來就是
   一層疊一層的（50 底、52 材質、57 通用、59 手機），跨檔重新宣告是
   正常的做法，自動檢查只會一直亂叫。試過一版，拆掉了。

   所以取新的 class 名字之前先 grep 一次。 */

/* 同名的函式：兩支同名，後面載入的那一支會靜靜地蓋掉前面那一支。 */
const SRC = SRC_PRE;
const dups = dupNames(SRC);
dups.forEach((d) => {
  bad++;
  console.error('同名的函式　' + d + '　——後面載入的會蓋掉前面那一支');
});

if (CODE.test(scan)) {
  bad++;
  console.error('畫面代號　S-01／T-02 這種不可以露在標題上');
}

/* ---------- 二 · 講規則的句子要從 RULES 組出來 ----------
   規則改了，句子要跟著變，不能只是變成謊話。 */
const HARDCODED = [
  ['誤差 1 天以內算準', 'RULES.judgeWhy()'],
  ['容許誤差 20', 'RULES.band()'],
  ['一天一格', '（這句可以寫死，它是設計本身）']
];
HARDCODED.slice(0, 2).forEach(([w, use]) => {
  if (scan.indexOf("'" + w) >= 0 || scan.indexOf('"' + w) >= 0) {
    bad++;
    console.error('寫死的規則句　' + w + '　——改用 ' + use);
  }
});

/* ---------- 三 · 判定不可以看作業好壞 ----------
   judge 只准拿到兩個數字：承諾幾天、實際幾天。
   一旦它讀到品質相關的欄位，「勝任感」那根柱子就倒了。 */
const judgeFn = src.match(/RULES\.judge\s*=\s*function[\s\S]*?\n\};/);
if (!judgeFn) {
  bad++;
  console.error('找不到 RULES.judge——判定邏輯不見了');
} else {
  /* due 是老師排的日期。老師對專案制定有自主權，但那條日期一旦
     進得了判定，被評價的對象就從「他自己的預估」換回「他有沒有
     照老師的表走」——整個作品的軸就沒了。 */
  ['quality', 'score', 'grade', 'rank', 'gear', 'word', 'snag', 'due']
    .forEach(function (w) {
      if (new RegExp('\\b' + w + '\\b').test(judgeFn[0])) {
        bad++;
        console.error('RULES.judge 讀到了「' + w + '」　——判定只能看承諾天數與實際天數');
      }
    });
}

/* ---------- 三之一 · 老師改不動那個數字 ----------

   老師現在可以回一句「我覺得會是幾天」（actAskEst）。那是一個提議，
   不是一個決定：他寫的是 askEst，而判定讀的是 est，est 只有學生
   按得動（actAnswerAsk）。

   這條界線是整個協商機制唯一撐得住的理由。它一旦破掉，「最後幾天
   你說了算」就變成一句假話，而那比根本不做這個機制更糟。 */
const askFn = src.match(/function actAskEst\([\s\S]*?\n\}/);
if (!askFn) {
  bad++;
  console.error('找不到 actAskEst——老師回一句那一支不見了');
} else if (/\br\.est\s*=[^=]/.test(askFn[0])) {
  bad++;
  console.error('actAskEst 改了 r.est　——老師給的是提議，不是決定');
}
/* 反過來也要守：學生那一支不准去改老師說過的那個數字。 */
const ansFn = src.match(/function actAnswerAsk\([\s\S]*?\n\}/);
if (ansFn && /\br\.askEst\s*=[^=]/.test(ansFn[0])) {
  bad++;
  console.error('actAnswerAsk 改了 r.askEst　——老師說過的話不能被改寫');
}

/* ---------- 三之四 · 每一位委託人都要有自己的話 ----------

   三十四位的樣子全都不一樣，那就不該共用同一組句子。加了第 35 位
   而忘了寫他的話，畫面不會壞——他只會退回那句通用的，然後
   那一位就是全場唯一一個沒有個性的。那種漏掉最不容易被看到。 */
const patSrc = fs.readFileSync(path.join(__dirname, 'src', '19-patron.js'), 'utf8');
const patNames = (patSrc.match(/^\s*\['[^']+',\s*'([^']+)'/gm) || [])
  .map(function (x) { return x.match(/'[^']+',\s*'([^']+)'/)[1]; });
const sayBlock = patSrc.match(/var PAT_SAY = \{[\s\S]*?\n\};/);
if (!sayBlock) {
  bad++;
  console.error('找不到 PAT_SAY——委託人的話不見了');
} else {
  patNames.forEach(function (n) {
    var one = sayBlock[0].match(new RegExp("'" + n + "':\\s*\\{[^}]*\\}"));
    if (!one) {
      bad++;
      console.error('委託人「' + n + '」沒有自己的話　——他會講跟別人一樣的句子');
      return;
    }
    ['ask', 'back', 'wait', 'again', 'take', 'redo'].forEach(function (k) {
      if (one[0].indexOf(k + ':') < 0) {
        bad++;
        console.error('委託人「' + n + '」少了 ' + k + ' 那一句');
      }
    });
  });
}

/* ---------- 三之一又四分之三 · 試用列不能出現在真的班上 ----------

   切換身分、把時間往前推、整班重來。三個都是只有在示範資料上才
   說得通的東西，而第三個會呼叫 seed()——那一支第一行是 DB = blank()，
   接上雲端之後等於一個學生就能清掉全班。

   demoBar 的第一行必須是那道門。

   ── 2026-09-09：那道門本來太鬆 ──

   這一條本來要求的是 isDemo()。可是 isDemo() 讀的 DB.Config.demo 是
   **每一台機器自己的**旗標，全站只有 actRegister 關得掉它，而且不跟著
   雲端同步——所以「在電腦上註冊、在手機上登入」的人，手機那一台照畫。
   使用者就是在自己的手機上看到它的。

   現在要求 isPureDemo()：這台機器上只要有任何一筆真的資料（自己註冊的，
   或雲端拉下來的）就整條不畫。那本來就是底下 forward／reset 在用的判準，
   所以「看得到」跟「按得動」現在是同一道門——不會再有一顆按下去只會回
   「這裡有真的資料」的鍵擺在畫面上。

   改回 isDemo() 會被這一條擋下來。 */
const demoFn = src.match(/function demoBar\([\s\S]*?\n\}/);
if (!demoFn) {
  bad++;
  console.error('找不到 demoBar——試用列那一段不見了');
} else if (!/if\s*\(!isPureDemo\(\)\)\s*return\s*''/.test(demoFn[0])) {
  bad++;
  console.error('試用列沒有擋在純示範資料裡　——在別台註冊、這台只登入的人照樣看得到');
}
/* 這兩顆會動到資料與時間，要的是嚴格那道門（isPureDemo）：
   本機還是示範資料，但雲端的真帳號已經拉下來了，也不准。 */
['forward', 'reset'].forEach(function (k) {
  var fn = src.match(new RegExp('\\b' + k + ':\\s*function[\\s\\S]*?\\n  \\}'));
  if (fn && !/isPureDemo\(\)/.test(fn[0])) {
    bad++;
    console.error('ACTS.' + k + ' 沒有用 isPureDemo 擋　——混著真資料的時候它會清掉全班');
  }
});
/* 切換身分的選單不准列出真帳號。 */
if (demoFn && !/filter\(function \(u\) \{ return u\._d; \}\)/.test(demoFn[0])) {
  bad++;
  console.error('切換身分那一格列出了真帳號　——學生點一下就變成老師');
}

/* ---------- 三之二 · 研究者只能看 ----------

   研究者是這個研究的觀察者。一個觀察者如果同時改得動被觀察對象的
   帳號與狀態，那份資料就沒辦法說「這些是他們自己做的」。

   所以他那一頁不准出現任何一個 act 開頭的動作。讀（where／find／
   exportCsv）隨便讀，寫一個都不行。 */
const rsSrc = fs.readFileSync(path.join(__dirname, 'src', '75-research.js'), 'utf8');
const rsAct = rsSrc.match(/\bact[A-Z][A-Za-z]*\s*\(/g);
if (rsAct) {
  bad++;
  console.error('研究者那一頁動得了東西　' + rsAct.join('、') +
    '　——他只能看，帳號由他們自己在門口開');
}

/* ---------- 三之一半 · 一個作品只能有一個比喻 ----------
   上一個作品是往地心挖礦，所以講坑道、講挖、講豎坑。
   這一個是地下城：你走的是廊道，你不是在挖，你是往下探。
   兩個比喻混著用的時候，使用者兩個都進不去。 */
const METAPHOR = [['坑道', '廊道'], ['豎坑', '廊道'], ['坑口', '入口'], ['挖掘', '前進'], ['挖', '走／打通']];

/* ---------- 三之一又八分之一 · 樣式表裡不能有打擊 ----------

   2026-09-07 補的。禁用詞那一張表只掃畫面上會出現的字，掃不到
   註解與樣式——而動畫本身就是一種語氣。

   實際發生的：交件那一場，每答完一題就播一次「整個畫面震一下、
   牠往右退、閃三下」，而那一段的註解自己寫著「答完一問**打牠一下**」。
   同一個檔案裡 67-battle.js 的註解寫的是「不是被打——是有人回話了」。
   兩邊矛盾了很久，因為沒有任何東西在看樣式表。

   這個作品已經沒有回合制對決（使用者：「我現在已經沒有回合制對決」）。
   動畫的名字如果還在講打擊，下一個讀的人就會照著那個框架往下加。 */
(function () {
  var CSSHIT = ['打牠', '打他', '受傷', '攻擊', '傷害', '打擊', '血量'];
  var 樣式 = fs.readdirSync(path.join(__dirname, 'src'))
    .filter(function (f) { return /\.css$/.test(f); });
  樣式.forEach(function (f) {
    var t = fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
    CSSHIT.forEach(function (w) {
      if (t.indexOf(w) < 0) return;
      bad++;
      console.error('樣式表裡出現打擊的說法　' + f + '　「' + w + '」');
      console.error('　　這個作品沒有對決。動畫的名字要講它真的在演什麼');
    });
  });
})();
METAPHOR.forEach(function (pair) {
  var i = scan.indexOf(pair[0]);
  if (i < 0) return;
  bad++;
  console.error('上一個作品的比喻　' + pair[0] + '　——這裡是地下城，用「' + pair[1] + '」');
  console.error('　　' + scan.slice(Math.max(0, i - 40), i + 40).replace(/s+/g, ' '));
});

/* ---------- 三之二 · 系統不定義他們在做什麼 ----------

   本來有三份我寫死的詞表：RULES.DOING（今天動的是哪一塊）、
   RULES.SNAGS（八種卡關原因）、RULES.GEARS（六句「下一次應該……」）。
   三份都等於系統先替他們定義了「一個專案會做的事」跟「會出的錯」。
   全部換成那一組自己寫的清單（Teams.acts）。這幾個名字不可以回來。 */
const OWN = ['RULES.DOING', 'RULES.SNAGS', 'RULES.RISKS', 'RULES.GEARS', 'snagOf', 'doingOf'];
OWN.forEach(function (w) {
  if (src.indexOf(w) < 0) return;
  bad++;
  console.error('系統又自己定義了一份詞表　' + w + '　——那份清單要由那一組自己寫');
});

/* ---------- 三之二半 · 留下的那一句不可以是老師寫的 ----------
   三張攤開的是這一趟的事實，用他們自己的詞。一旦 keepOffers 讀到 word，
   學生留下的就變成老師的評語，不是他自己的觀察。 */
const keepFn = src.match(/function keepOffers[\s\S]*?\n\}/);
if (!keepFn) {
  bad++;
  console.error('找不到 keepOffers——攤開三張的邏輯不見了');
} else if (/word/.test(keepFn[0])) {
  bad++;
  console.error('keepOffers 讀到了老師寫的 word　——那三張只能是他們自己的事實');
}

/* ---------- 三之二又半 · 介面不解釋自己 ----------
   能畫出來的就畫出來。系統陳述它記到的東西，不說那代表什麼、
   也不說下一次該怎麼做——那是使用者自己的事。 */
const PREACH = ['下一次應該', '你應該', '建議你', '難怪', '這表示你', '這代表你', '你可以試著'];
PREACH.forEach(function (w) {
  var k = scan.indexOf(w);
  if (k < 0) return;
  bad++;
  console.error('介面在替使用者下結論　' + w + '　——只陳述記到的東西');
  console.error('　　' + scan.slice(Math.max(0, k - 40), k + 40).replace(/\s+/g, ' '));
});

/* ---------- 三之三 · 老師只做三件事 ----------
   發里程碑、審核、看各組進度。他不改學生的招牌，也不挑裝備。 */
if (/['"]rename:/.test(src)) {
  bad++;
  console.error('有人把改招牌接回老師端　——招牌上寫什麼是學生自己的事');
}
if (/DRAFT\.gear/.test(src)) {
  bad++;
  console.error('老師端還在挑裝備　——他只勾可以，三選一是學生做的');
}

/* ---------- 三之四 · 密碼那件事要說出來 ----------
   這一版的雜湊只擋肉眼。那句警語必須留在畫面上——一旦有人把它拿掉，
   下一個人就會以為它已經安全了。 */
if (scan.indexOf('不是真的加密') < 0) {
  bad++;
  console.error('建立帳號那一頁沒有說密碼還不是真的加密　——那句話不可以拿掉');
}
if (/passwords*:/.test(src) && !/o.password/.test(src)) {
  bad++;
  console.error('好像有地方把密碼原封不動存起來了　——只存 salt 與 hash');
}

/* ---------- 四 · 生態圖不可以排序 ----------
   ecology() 回傳的順序就是畫出來的順序。一旦它 sort，那就是排行榜。 */
const ecoFn = src.match(/function ecology[\s\S]*?\n\}/);
if (ecoFn && /\.sort\(/.test(ecoFn[0])) {
  bad++;
  console.error('ecology 在排序　——生態圖不排名，順序照名冊就好');
}

/* ---------- 五 · 推進一天只能一次 ---------- */
if (!/function pushedToday/.test(src)) {
  bad++;
  console.error('找不到 pushedToday——「一天一格」的守門不見了');
}

/* ---------- 六 · 按得到的東西底下要真的有那一支 ----------

   砍一段死碼的時候順手把 bld: 砍掉了，而三個測試全部通過——
   畫面照樣畫得出那三張卡，只是按下去什麼都不會發生。
   把每一個 a: 'xxx' 對回 ACTS，對不上就擋。 */
const acts = {};
/* 兩種寫法：ACTS 那個物件裡的 xxx: function，跟後面補掛的 ACTS.xxx = */
let am;
const reLit = /([a-z][a-zA-Z]*):\s*function/g;
while ((am = reLit.exec(src))) acts[am[1]] = 1;
const reSet = /ACTS\.([a-z][a-zA-Z]*)\s*=/g;
while ((am = reSet.exec(src))) acts[am[1]] = 1;

const miss = {};
const reUse = /a: '([a-z][a-zA-Z]*)/g;
while ((am = reUse.exec(src))) { if (!acts[am[1]]) miss[am[1]] = 1; }
Object.keys(miss).forEach(function (k) {
  bad++;
  console.error('畫面按得到 ' + k + '，但是 ACTS 裡沒有這一支');
});

/* ---------- 七 · 每一張點陣圖都要有寬度 ----------

   pxTag 畫出來的 <img> 沒有內建尺寸。少一條 width，它就會被 flex 撐開
   ——招牌那一張在「點進一組」那張卡上長成 565px 見方，蓋住整張卡。
   只看第一個 class（那是訂大小的那一個），後面的是修飾用的。 */
const pxc = {};
let pm;
const rePx = /pxTag\([^,]+,[^,]+,\s*['"]([a-z][a-z0-9-]*)/g;
while ((pm = rePx.exec(scan))) pxc[pm[1]] = 1;
/* 要的是「不被祖先限定」的那一條規則。.xs-head .px.sign-s{width:33px}
   只在剖面圖的欄頭裡有效——招牌畫在別的地方就沒有寬度，
   而那正是它長成 565px 的原因。所以選擇器裡不可以有空格。 */
Object.keys(pxc).forEach(function (c) {
  var re = new RegExp('(^|[,}])\\s*[^,{}\\s]*\\.' + c + '[^,{}\\s]*\\s*\\{[^}]*width', 'i');
  if (!re.test(scan)) {
    bad++;
    console.error('點陣圖 .' + c + ' 沒有一條不限定祖先的寬度——換個地方畫就會被撐開');
  }
});

/* ---------- 八 · 沒有小字 ----------

   字級只有 22 / 33 / 44 / 55 / 66 / 88。11px 是這套點陣字的原生尺寸，
   畫得清楚，但讀不清楚——而且它一直是一個出口：句子太長就縮成 11px
   塞進去。出口關掉之後，句子太長只有一條路，就是把句子砍短。

   ── 2026-09-09：這一條從加上去到今天沒有擋過任何東西 ──

   本來寫的是 /font-size:(d+)px/——d 少了反斜線，所以它找的是字面上的
   「font-size:dpx」。index.html 裡 332 條字級宣告，它一條都沒有掃到。

   當時實際上沒有小於 22px 的字級，所以它沒有藏住任何違規——守住這條
   線的一直是紀律，不是這支檢查。而那是最難發現的狀態：畫面是對的、
   檢查是綠的，可是兩者之間沒有關係。gate.js 管的是「有沒有離開碼」，
   這一次壞在更前面：那條規則本身抓不到東西。

   改讀 scan 不讀 src：註解裡寫「本來是 11px」不該讓上線停下來。 */
const small = (scan.match(/font-size:\s*(\d+)px/g) || [])
  .map(function (x) { return Number(x.match(/\d+/)[0]); })
  .filter(function (n) { return n < 22; });
if (small.length) {
  bad++;
  console.error('還有 ' + small.length + ' 條小於 22px 的字級　——沒有小字了，太長就砍短');
}

/* ---------- 十 · 同一個規則的名字不能被指定兩次 ----------

   2026-09-07 補的，因為我自己剛踩到：

     RULES.ASK = { flags: 2, hard: 0 }   ← 本來的，RULES.asks 讀它決定
                                            「走過幾趟才開始問這一題」
     RULES.ASK = 1                        ← 我後來加的開關

   第二行把第一行整個蓋掉。然後 RULES.ASK['flags'] 是 undefined，
   RULES.asks 一律回 'on'，於是「哪幾段會比你想的久」從第一趟就開始問
   ——而那一題對沒走過一趟的人不成立（20-rules.js 自己寫著）。

   **十一支檢查沒有一支抓到。** 因為 'on' 是合法的回傳值：畫面照畫、
   每一頁都畫得出來、流程從頭到尾走得完、資料不變量也守著。
   壞掉的只有「什麼時候問」，而那件事沒有任何斷言在看。

   這一條擋的是整類：規則檔是一份「這個系統的立場」的清單，同一個名字
   出現兩次代表其中一個立場被靜靜地取消了，而取消的那一刻不會有任何
   東西報錯。 */
(function () {
  var 見 = {};
  var 行 = fs.readFileSync(path.join(__dirname, 'src', '20-rules.js'), 'utf8').split('\n');
  行.forEach(function (line, i) {
    var m = line.match(/^\s*RULES\.([A-Za-z_$][\w$]*)\s*=[^=]/);
    if (!m) return;
    var k = m[1];
    if (見[k]) {
      bad++;
      console.error('同一個規則被指定兩次　RULES.' + k +
        '　第 ' + 見[k] + ' 行與第 ' + (i + 1) + ' 行');
      console.error('　　後面那一次會把前面那一次整個蓋掉，而且不會報錯');
    } else 見[k] = i + 1;
  });
})();

/* 收尾搬到檔案最後面了（見底下）。

   本來它在這裡，而新的規則一律往檔尾加——所以 2026-09-09 加的那三條
   （金邊、對決、紀錄的說法）全部跑在 process.exit 之後：它們印得出
   錯誤，可是 bad 已經沒有人看了，離開碼永遠是 0。

   deploy 的關卡讀的正是離開碼，所以那三條等於不存在。而且成功訊息
   也印在它們前面——畫面上會先說「都守住了」，再印三行錯誤。

   一支專門用來擋錯的東西自己安靜地不擋，是這裡最不該出現的那種錯。 */

/* ---------- 九 · 這不是一個交作業的平台 ----------

   「老師要去哪裡看」那一行是自由文字，而且它對系統來說跟一段亂碼
   沒有差別：只被印出來給老師看，沒有任何一支函式讀它的內容做決定。

   界線寫成測試，不是寫成承諾——不然它會在某一次「順手加個功能」
   的時候悄悄破掉。 */
const NOFILE = ['FileReader', 'new File(', 'new FormData(', 'type="file"'];
NOFILE.forEach(function (w) {
  if (src.indexOf(w) < 0) return;
  bad++;
  console.error('系統開始收檔案了　' + w + '　——作業交在老師原本收的地方，這裡只記一行字');
});
/* r.link 只能被寫進去、被畫出來。出現在判斷式裡就是它開始有意義了
   ——那一刻系統就從「不解讀」變成「會讀你寫了什麼」。

   （這一條一度也守著 r.look。那個欄位拿掉了，規則留成單數。） */
src.split('\n').forEach(function (line, i) {
  if (line.indexOf('.link') < 0) return;
  if (/\.link\s*(===|!==|\.indexOf|\.match|\.test)/.test(line) &&
      line.indexOf('whereLine') < 0) {
    bad++;
    console.error('學生寫的自由文字被拿去做判斷了　第 ' + (i + 1) + ' 行');
    console.error('　　' + line.trim());
  }
});

/* ---------- 金色只代表一件事 ----------

   .dk.lit 的樣式表旁邊寫著「有新東西的那一扇：金邊」，可是那一顆
   圖鑑的 class 是寫死的 'dk lit'——所以第一天打開就是金的，而那時候
   圖鑑裡一位委託人都沒遇過、一張任務之證都沒有。金邊指著空房間，
   而真正該先讀的那一扇（故事）反而沒有記號。

   一個永遠亮著的記號等於沒有記號：真的多了一位委託人的時候，
   它跟昨天長得一模一樣。

   所以那四扇門的 lit 一定要接在某個條件上，不能寫死。 */
(function () {
  var m = src.match(/class="dk lit"/g);
  if (m) {
    bad++;
    console.error('門上的金邊寫死了　' + m.length + ' 處　——' +
      '金色的意思是「裡面有你還沒看過的東西」（見 57-viz.css 的 .dk.lit）。' +
      '寫死就變成裝飾，而永遠亮著的記號等於沒有記號');
  }
})();

/* ---------- 畫面上的字裡不能有對決 ----------

   2026-09-09 補的。禁用詞那一張表擋的是「分數／死線」那一類，
   樣式表那一條（三之一又八分之一）擋的是動畫的名字與註解——
   兩邊都沒有在看 JS 裡會被印出來的中文字串。

   漏掉的那一顆：老師退回之後，學生廊道上那一顆鍵寫著「再打一次」。
   它是回合制對決那一版的最後一個字，而這個作品已經沒有對決了
   （交件那一場的動畫早就從「打牠一下」換成「他接過去」）。

   它偏偏長在最需要講清楚的那一刻：老師剛退回、學生讀完那一句話、
   接下來要按的那一顆。那一顆說「再打一次」，等於告訴他被退回是一場架。

   一個字都沒有壞掉，所以十七支檢查沒有一支叫得出來。 */
(function () {
  var 對決 = ['再打一次', '打牠', '打他', '攻擊', '傷害', '血量', '受傷',
    '對決', '戰鬥', '打倒', '擊敗', '打贏', '回合'];
  var 中招 = [];
  SRC_PRE.forEach(function (f) {
    if (!/\.js$/.test(f)) return;
    var s = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
    (s.match(/'[^'\n]*'/g) || []).forEach(function (q) {
      var x = q.slice(1, -1);
      if (!/[一-鿿]/.test(x)) return;
      對決.forEach(function (w) {
        if (x.indexOf(w) >= 0) 中招.push(path.basename(f) + '　' + w + '　「' + x.slice(0, 40) + '」');
      });
    });
  });
  中招.forEach(function (m) {
    bad++;
    console.error('畫面上的字還在講對決　' + m +
      '　——這個作品沒有回合制對決了，交出去是把東西遞過去，不是打一場');
  });
})();

/* ---------- 每一種紀錄都要有中文說法 ----------

   流水帳那一份（exportCsv）的「說明」欄走 evSay，而 evSay 查不到的
   種類會直接印英文的 kind——研究者匯出來看到的就是 exitopen,exitopen。

   踩過兩次：
     mypart／sit        沒有人寫過說法
     exitopen／exitshut logEvent(on ? 'exitopen' : 'exitshut', …)
                        寫成三元式，所以連「有哪些種類」都掃不到

   第二次那個尤其安靜：清單自己說「全部都有說法」，因為它根本沒看見
   那兩個。所以這一條抓的是 logEvent( 之後**整個第一個參數**裡的每一個
   字串，不管它是不是三元式。 */
(function () {
  var say = src.match(/EV_SAY[\s\S]*?\n\};/);
  if (!say) { bad++; return console.error('找不到 EV_SAY'); }
  var 有 = {};
  (say[0].match(/^\s{2}([a-zA-Z_]+):/gm) || [])
    .forEach(function (m) { 有[m.trim().replace(':', '')] = 1; });
  var 缺 = {};
  var re = /logEvent\(([^,]*),/g, m;
  while ((m = re.exec(src))) {
    /* 三元式的**條件**不算：
         logEvent(kind === 'move' ? 'push' : 'rest', …)
       裡面的 'move' 是拿來比對的值，不是一種紀錄。有 ? 就只看它後面，
       不然這一條會一直叫一個不存在的種類，然後被當成雜訊關掉。 */
    var 參 = m[1].indexOf('?') >= 0 ? m[1].slice(m[1].indexOf('?')) : m[1];
    (參.match(/'[a-zA-Z_]+'/g) || []).forEach(function (q) {
      var k = q.slice(1, -1);
      if (!有[k]) 缺[k] = 1;
    });
  }
  Object.keys(缺).forEach(function (k) {
    bad++;
    console.error('這一種紀錄沒有中文說法　' + k +
      '　——流水帳的「說明」欄會直接印英文的 kind（見 15-auth.js 的 EV_SAY）');
  });
})();

/* ---------- 這一支自己有沒有接上 ----------

   新的規則一律往檔尾加，而收尾（if (bad) process.exit）本來卡在中間
   ——所以加在它後面的每一條都只是印字：bad 加了沒有人看，離開碼永遠 0，
   而 deploy 的關卡讀的正是離開碼。

   查 git 才知道不是今天才這樣：「系統開始收檔案了」跟「學生寫的自由
   文字被拿去做判斷了」這兩條在收尾後面躺了至少十個 commit——而它們
   守的是這個作品最根本的兩條界線（不收檔案、不解讀學生寫的字）。
   那段期間包含 RULES.ASK 那一次，也就是使用者被「十一支檢查全過」
   騙到的那一次。

   所以這一條看的是這一支自己：收尾之後不准再有人加 bad。
   它讀的是檔案的字，不是執行順序，所以擺在收尾前面就攔得到後面。 */
(function () {
  var 我 = fs.readFileSync(__filename, 'utf8');
  var i = 我.lastIndexOf('process.exit(1)');
  if (i < 0) { bad++; return console.error('check.js 自己沒有離開碼'); }
  var 後 = 我.slice(i).replace(/\/\*[\s\S]*?\*\//g, ' ');
  var n = (後.match(/\bbad\s*\+\+/g) || []).length;
  if (n) {
    bad++;
    console.error('check.js 的收尾不在最後面　——收尾之後還有 ' + n +
      ' 條規則在加 bad，那幾條印得出錯誤但擋不下任何東西（離開碼永遠 0）');
  }
})();

/* ---------- 收尾 ----------
   一定要在檔案的最後面：上面每一條都在加 bad，任何一條跑在這之後
   就等於沒有接上（見上面那一段）。 */
if (bad) {
  console.error('\n' + bad + ' 項殘留。');
  process.exit(1);
}
console.log('殘留檢查通過：' + BANNED.length + ' 個禁用詞、畫面代號、寫死的規則句、' +
  '判定的純度、老師改不動那個數字、委託人各有各的話、試用列不上真的班、研究者只能看、' +
  '生態圖不排序、一天一格、按得到的都接得上、每張點陣圖都有寬度、沒有小字、' +
  '門上的金邊、畫面上不講對決、每一種紀錄都有中文說法，都守住了。');
