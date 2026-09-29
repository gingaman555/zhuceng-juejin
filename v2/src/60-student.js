/* 學生端。

   一頁只給一個動作。首頁就是廊道本身——招牌、角色、迷霧、魔物，
   底下一排他們自己寫的東西。其餘都是資訊，不是選項。

   兩條原則，這一版收得比之前緊：

   一 · 系統不定義他們在做什麼。
        每天點的那幾段、承諾時標的那幾段、營火說的那幾段，全部來自
        同一個地方：老師分段時寫的那幾行。系統一個字都沒有列。
        老師沒分段也走得完：推進那一顆鍵退回「我今天來過了」。

   二 · 介面不解釋自己。
        本來每一張卡底下都有一段我寫的說明（「這一下就是推進，不用再
        按第二顆」）。那是系統在替使用者讀畫面。能畫出來的就畫出來——
        承諾與實際畫成兩條尺（見 56-viz.js），停滯畫成畫面暗下來，
        走過的日子畫成廊道上的火把。剩下的字只有兩種：他們自己的詞，
        跟系統記到的數字。 */

/* ---------- 廊道（首頁） ---------- */
/* ---------- 首頁 ----------

   YouTube 的首頁放的是別人的影片，但它的主流程是把影片放上去。
   打開它的理由是別人，留下來的理由才是自己。

   本來反過來：首頁是自己的廊道，別人在另一個分頁裡當背景。
   一個人的東西看兩次就沒了，所以沒有理由在不必要的時候打開它。

   現在：上面一條是你手上這一趟（狀態、幾段、兩條尺、那一顆鍵），
   底下是全班最近發生的事，一則一則往下。

   廊道那一整片場景搬到班級地下城了——世界該是全班共用的，
   不是他一個人的背景。 */
/* ---------- 首頁 ----------

   層級：
     主功能  廊道 ＋ 那一顆鍵。大、在最上面、是遊戲的樣子。
     副功能  廊道底下那三個小圖示（營火、出口、招牌）。
     別人    全班最近。打開這個系統的理由，但不是主功能，所以在底下。

   YouTube 的首頁放的是別人的影片，主流程卻是把影片放上去——
   那句話講的是層級，不是「拿掉自己的東西」。 */
/* 哪幾件的委託人已經走進來過了。只活在這一次使用裡——
   演出只有第一次是演出，第二次是雜訊。 */
var PAT_IN = {};

PAGES.home = function () {
  var t = myTeam();
  var next = nextThing(t.teamId);
  var st = stallOf(t.teamId);
  var row = next.row;
  var r = row && row.run && row.run.runId ? row.run : null;

  var H = [];

  /* ── 主功能：廊道。這不是裝飾，是「說幾天 → 交出去」被畫出來的樣子。 ── */
  /* 回來的時候先說一句不在的這幾天發生了什麼。
     只在真的隔了一天以上出現，而且只報真的發生過的事。 */
  var aw = awayOf(S.who);
  if (aw) {
    H.push('<div class="away">');
    H.push('<b>' + aw.days + '</b><span>天過去了</span>');
    if (aw.left !== null) {
      H.push(aw.left > 0 ? '<b>' + aw.left + '</b><span>天到期</span>'
        : '<em>已經超過你說的天數</em>');
    }
    if (aw.cells) H.push('<b>' + aw.cells + '</b><span>全班新留的</span>');
    if (aw.okd) H.push('<em class="ok">老師勾了 ' + aw.okd + ' 件</em>');
    H.push('</div>');
  }

  /* 老師勾了。

     這是一件剛剛發生的事，不是首頁的一塊內容——所以它蓋住畫面閃一下，
     點一下回廊道。本來它排在廊道上面，而且這一整次使用每回到首頁都會
     再看到一次（SEEN_CUT 是進站時抓的，不會在同一次使用中往前走）。

     按掉不會弄丟東西：老師那一句話在出口那一頁完整留著、任務之證在圖鑑裡、
     疊上去的那一塊在班級地下城上。

     這裡只把他那一句話擺在面前，因為那是整條流程裡唯一
     「別人為你做了一件事」的時刻。 */
  var okPend = okSince(t.teamId, SEEN_CUT).filter(function (r) { return !OKGOT[r.runId]; });
  if (okPend.length) {
    /* 整片都點得掉：內容比畫面高的時候，底下那顆鍵要捲下去才按得到，
       而這是一則通知不是一張表單——碰哪裡都該讓它走。 */
    H.push('<div class="okwrap" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'okgot' })) + '\'>');
    /* 那三行只印一次。

       本來一件一張卡，每一張都重印「老師勾了／確認已完成任務，你的
       專案又在前進了一頁／完成進度已疊加至班級地下城內」。放幾天沒開，
       回來五件一起勾，那三行就一字不差地出現五次——而三位老師寫的
       三句話全都不一樣、而且都是這一整條流程裡最值得讀的東西，
       就夾在那面牆中間。

       樣板抽出來放上面，底下每一張只留真的不一樣的：拿到幾顆、
       哪一件、還有他那一句。 */
    H.push('<div class="eyebrow lit">老師勾了' +
      (okPend.length > 1 ? '　' + okPend.length + ' 件' : '') + '</div>');
    H.push('<b class="ok-big">確認已完成任務，你的專案又在前進了一頁</b>');
    H.push('<em class="ok-sub">完成進度已疊加至班級地下城內</em>');
  }
  okPend.forEach(function (r) {
    var m = msOf(r.msId);
    H.push('<div class="okcard">');
    /* 拿到的那一張。它就是這一刻本身變成的東西——老師審核過了的證明，
       名字是那一件任務，圖鑑裡收著。

       本來這裡只有一行字。換成跟打贏那一下同一張卡（見 55-ui.js 的
       regCard）：多一個魔物跟多一張證是同一件事的兩種，
       所以「你多了一個東西」的長相也該是同一個。

       任務名不另外寫一行——卡上那一行就是它，同一個名字在同一張卡上
       出現兩次，其中一次就是雜訊。 */
    var kz = null;
    var kk = keepsOf(t.teamId).filter(function (x) { return x.runId === r.runId; })[0];
    STRATA.forEach(function (x) { if (kk && x.key === kk.zone) kz = x; });
    /* 拿到幾顆。基本的做完就有，後面那幾顆是老師多說的。 */
    var cb = Math.max(RULES.CRYSTAL.bonusMin, Number(r.bonus) || RULES.CRYSTAL.bonusMin);
    /* 老師沒有多給的時候不印分解那一行。

       「0 是他多給的」會把一個正常的答案（收下、沒有要多說的）講成
       一句負評，而這個系統不評價任何人。 */
    H.push('<div class="crygot">＋' + (RULES.CRYSTAL.base + cb) + ' 顆水晶' +
      (cb ? '<span>' + RULES.CRYSTAL.base + ' 是完成的，' + cb +
        ' 是他多給的</span>' : '') + '</div>');
    H.push(regCard('新拿到', (m ? m.title : '那一趟'), '任務之證已收錄在圖鑑',
      pxTag((kk && kk.px) || coreOf(r.runId), (kz || zoneNow(t.teamId)).pal, 'reg-px core'),
      false));
    /* 這一位第一次進圖鑑的話，同一張卡上再加一張。

       本來這一句是在交出去那一刻喊的（戰鬥演完跳一張卡）。那時候
       老師還沒看，而圖鑑要收下才解鎖——卡片說收好了，翻開來是
       黑影。搬到這裡：說「他被收進去了」的那一刻，他真的被收進去了。 */
    if (mobNewInCodex(t.teamId, r.runId)) {
      var pm = mobOfRun(r);
      if (pm && pm.n) {
        H.push(regCard('新登場', pm.n, '已收錄在圖鑑',
          pxTag(pm.px, (kz || zoneNow(t.teamId)).pal, 'reg-px'), false));
      }
    }
    /* 他那一句話擺在最下面，而且是這一整張上唯一的人話。 */
    if (r.word) H.push(wordBlock(r, 'big'));
    H.push('</div>');
  });
  if (okPend.length) {
    H.push(btn('回廊道', 'okgot', 'big'));
    H.push('</div>');
  }

  /* 老師回了一句。

     不搶 nextThing：他手上正在走的那一趟沒有變，這只是有人說了一句話。
     擋著他不讓他做別的事，那句話就變成一道關卡——而它是一個提議。 */
  var asking = askPending(t.teamId);
  if (asking) {
    var am = msOf(asking.run.msId);
    var au = asking.run.askBy ? userOf(asking.run.askBy) : null;
    H.push('<div class="card">');
    H.push('<div class="eyebrow lit">' + esc(au ? au.name + ' 回了一句' : '老師回了一句') +
      '</div>');
    H.push('<b class="ok-big">' + esc(am ? am.title : '那一趟') + '</b>');
    H.push(btn('去看看', 'go:ask:' + asking.run.runId, 'big'));
    H.push('</div>');
  }

  /* 交出去了，但這個人還沒說他做了什麼。

     每個人是獨立帳號，交出去的那一下只有一個人在場——其他人本來
     就再也沒有地方寫。老師收下之前補得上，補上去仍然在他讀到之前。 */
  var gap = saidGap(t.teamId, S.who);
  if (gap) {
    var gm = msOf(gap.msId);
    H.push('<div class="card"><div class="eyebrow lit">你還沒說你做了什麼</div>');
    H.push('<p class="dim">' + esc(gm ? gm.title : '那一趟') +
      '　·　老師收下之前都寫得進去。</p>');
    H.push('<input id="sd-now" placeholder="' + esc('這幾天你做的是什麼') + '">');
    H.push(btn('記下來', 'saidnow:' + gap.runId, 'big'));
    H.push('</div>');
  }

  /* ── 自己那條廊道 ──

     打開來第一眼要是不用學就懂的東西。廊道不用學：一條走廊、
     一個人走在上面、水從後面漫過來。地圖要讀得懂得先知道三條規則
     （一格＝一趟、顏色＝哪一組、亮的可以點），而這個系統一學期
     只在那張圖上動八次，它沒有機會被學會。所以圖回到全班那一頁。

     ── 它排在第一，因為這一段註解本來就是這樣寫的 ──

     組別卡、三扇門、那條節奏尺曾經插在它前面，於是「打開來第一眼」
     變成三張卡片、廊道被壓到 y=675。那三塊每一塊都有自己的理由，
     但沒有一塊的理由是「要比環境先看到」。

     這一頁的重點是上面那片環境。所以廊道在最前面，要做的那一件事
     接在它下面，其餘的排在後面。 ── */
  H.push(scene(t, next.row, st, next.kind));
  if (r) H.push(stepRow(r.runId));

  /* ── 那一排門，接在廊道正下方 ──

     本來排在節奏尺後面，量到手機上是 y=1475——**要滑 1.8 屏**才看得到。
     而圖鑑、故事、角色是這整件作品裡「你會想再打開一次」的那一層：
     水晶、任務之證、委託人、開場那兩頁，全部從這三扇門進去。
     滑一屏半才看得到的誘因等於沒有誘因。

     為什麼是廊道正下方而不是最上面：它們跟廊道是同一種東西——
     「這個世界裡有什麼」。廊道是你走的那一條，這三扇是你走完之後
     會想回去翻的。放在一起，那一整塊就是這個世界；接在底下的
     才是「你現在要做的事」。

     代價講清楚：要做的那一件因此往下 121px（手機上本來就在第一屏
     外，現在更遠一點）。那是使用者的取捨——他要的是誘因先被看到。 */
  H.push(deskRow(t, next));

  /* ── 要做的那一件事，就接在廊道下面。 ──

     本來走過的那一條帶子插在這中間，所以「收到一個新任務」要越過
     一排過去的紀錄才看得到。過去是這一頁上最不重要的東西——
     它是拿來回頭看的，不是拿來做的。

     順便把 sticky 拿掉了。它本來釘在畫面底部，是為了解決「動作在
     摺線以下」；接到廊道下面之後那個問題本來就不存在，而一個
     釘在底部的東西擺在別的內容上面，只會蓋住它們。 ── */
  H.push('<div class="dock">');
  H.push('<div class="tline">');
  H.push('<span class="eyebrow">' + esc(taskTag(next)) + '</span>');
  H.push('<b>' + esc(next.kind === 'name' ? '還沒取名字'
    : (row && row.ms ? row.ms.title : '還沒有任務')) + '</b>');
  if (st.level) H.push('<i class="warnx">' + esc(RULES.stallSay(st.level, st.days)) + '</i>');
  H.push('</div>');
  H.push(actionCard(t, next, st));
  H.push('</div>');

  /* 這一圈走到哪。死線勇者一直讓你知道現在是專注還是休息，
     那個迴圈才會上癮。接在動作下面：它講的是你剛剛按的那一顆
     在整圈裡的哪個位置。 */
  H.push(beatBar(next, t));

  /* 「還有 N 個在等」拿掉了：正在做的那一張卡裡已經寫著
     「老師又派了 N 個。做完這一趟才輪到。」——同一件事，前後兩行。
     留下的是說得比較清楚的那一句。 */

  /* ── 你們這一組 ──

     它本來排在最上面，理由是「打開來第一件事是我在誰旁邊」。

     手機上量出來的代價是這樣：667px 高的機器（iPhone SE、一般 6.1 吋
     捲之前），第一屏只放得下組別卡（222px）跟廊道（319px）。收到一個
     新任務的時候，那張「有人在等這一件 · 去見他」整張在摺線以下，
     而第一屏上沒有任何東西說下面有事情。

     組名、代碼、水晶、誰在隊上——那四樣是**查得到就好**的資訊，
     不是每次打開都要看的。真正每次都要看的是「這一趟走到哪、
     現在該做什麼」。

     所以它排到動作後面。第一屏變成：環境 → 三扇門 → 要做的那一件，
     動作往上提 222px。組別卡還在，滑一下就看得到，而它本來也不是
     拿來讀的——是拿來查代碼的。

     桌機也一起換，不做兩套：一致比各自最佳化重要（手機跟桌機看到的
     是同一個排法，講給人聽的時候只有一種說法）。 */
  H.push(teamCard(t));

  /* 走過的每一趟。往左滑就是往回看——它在這一頁上最不重要，
     所以排在動作後面。 */
  H.push(runStrip(t));

  /* 「新的一層／留一個記號」那張卡拿掉了。

     收起一趟的時候就順手插進那一層了（見 actSeal），所以它指的東西
     已經不是一個獨立的步驟。而它自己也講不清楚是什麼——
     連寫這個系統的人看到都要問「那是什麼」。 */



  return H.join('');
};

/* ---------- 走過的每一趟 ----------

   營地上那一排是「堆積」，但它擠在洞口那一小塊裡，滿了就放不下。
   走過八趟的人真正想做的事是往回看：那一趟叫什麼、說幾天、實際幾天。

   舊的在左、新的在右——跟廊道同一個方向（往右走就是往深處走），
   所以「往左滑」＝「往回看」不用學。打開的時候停在最右邊，也就是現在。 */
function runStrip(t, bare) {
  var rows = runsFor(t.teamId).filter(function (x) { return x.run.stamp; });
  if (!rows.length) return '';
  /* 名字。系統從頭到尾沒在學生面前說過「估算」兩個字——
     概念沒有被命名，他就不知道自己在練的是什麼。
     結算那一頁上面那張卡已經講過一次，所以那裡傳 bare。 */
  var H = [];
  if (!bare) H.push('<div class="rs-h">你的估算　' + rows.length + ' 趟</div>');
  H.push('<div class="rstrip"><div class="rs-in">');
  rows.forEach(function (x) {
    var r = x.run;
    /* 牠的顏色是那一趟當時那一層的顏色。本來去 builds 裡翻，
       翻不到就當第 0 層——還沒收起來的那一趟就被畫成最上層的顏色。 */
    var z = strataAt(runDepth(r), t.teamId);
    var mob = mobOfRun(r);
    /* 一格一隻牠。牠是那一趟盡頭擋路的那一隻，也是圖鑑裡會標成
       「遇過」的那一隻——所以牠是那一趟最好的名字：不用讀，
       看一眼就想得起來是哪一趟。其餘的點進去看。 */
    H.push('<button class="rs ' + r.stamp + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'rec:' + r.runId })) + '\' title="' +
      esc((x.ms ? x.ms.title : '') + '　' + (mob ? mob.n : '') +
        '　說 ' + estSay(r) + '　實際 ' + (r.actual || 0) + ' 天') + '">');
    H.push(pxTag(mob ? mob.px : [], z.pal, 'rs-px'));
    H.push(runTiles(r.runId));
    /* 這格太小放不下單位字，印他原始講的數字就好（8 小時印「8」，
       不是換算過的 0.33）——跟 tooltip 裡完整的「8 小時」是同一件事，
       只是這裡沒有空間寫單位。 */
    H.push('<span class="rs-s">' + stampPx(r.stamp) +
      '<i>' + (r.estU && r.estU !== 'd' && r.estN != null ? r.estN : r.est) +
      '<u>→</u>' + (r.actual || 0) + '</i></span>');
    H.push('</button>');
  });
  H.push('</div></div>');
  return H.join('');
}

/* ---------- 那一趟長什麼形狀 ----------

   叫 runTiles 不叫 runShape：40-db.js 已經有一支 runShape，
   回的是那一趟的統計（幾天、動了幾天、休了幾天）。同名的兩支後面
   會蓋掉前面，而畫面上只會看起來怪怪的——check.js 擋下來了。

   廊道每一格本來就記著那天動的是哪一件（見 61-scene.js 的 byTile），
   而**七格同一個顏色跟七格五顏六色是完全不同的一趟**：一個是一件事
   做了一個禮拜，一個是每天換一件。

   那個形狀一直存在，但從來沒有被拿出來看過——它只活在那一趟正在跑
   的時候，交出去就沒了。

   現在把它畫進「走過的每一趟」那幾格裡。不是新的一塊、不是新的一行字，
   是那幾格裡面本來就空著的一條。他不用讀任何東西：五顏六色跟一整條
   同色，看一眼就是兩種不同的禮拜。

   為什麼要給他自己看：這一套唯一在教的是校準，而校準的材料現在
   只有兩個數字（說幾天、實際幾天）。形狀是第三樣，而且它是唯一
   說得出「那幾天你是怎麼過的」的東西。 */
function runTiles(runId) {
  var log = dayLog(runId);
  var cells = [];
  log.forEach(function (d) {
    if (d && d.kind === 'move') cells.push(d.step);
  });
  if (cells.length < 2) return '';
  /* 太長就收在一條裡：一格最小 3px，超過就不再加寬。 */
  var H = ['<span class="rs-sh">'];
  cells.slice(0, 14).forEach(function (i) {
    H.push('<i style="background:' + stepHue(i == null ? -1 : i) + '"></i>');
  });
  H.push('</span>');
  return H.join('');
}

/* 老師分的段，排成一列小方塊。勾得掉。
   它接在任務那一行下面，不是一張卡——段是任務的一部分，不是另一件事。 */
function stepRow(runId) {
  var sp = stepsOf(runId);
  if (!sp) return '';
  var H = ['<div class="srow">'];
  sp.all.forEach(function (x, i) {
    var on = sp.on.indexOf(i) >= 0;
    H.push('<button class="sq' + (on ? ' on' : '') + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'tick:' + runId + '|' + i })) + '\'>' +
      '<b></b>' + esc(x) + '</button>');
  });
  H.push('</div>');
  return H.join('');
}

/* 你們這一組。組名、專案、幾個人、隊伍代碼、水晶。

   隊伍代碼一直在：新的人要加進來就是靠那一串，而它會被唸出來。 */
function teamCard(t) {
  var mem = where('Users', function (u) { return inTeam(u, t.teamId); });
  var c = crystalOf(t.teamId);
  /* 三行。本來五段（眉標、隊名、專案、人、代碼）疊成 281px，
     而它排在最上面，於是廊道被推到畫面外。

     哪些合併得起來：
       眉標「你們這一組」拿掉——底下就是四個人的臉，那一行在說
       已經看得出來的事。
       隊名跟專案接成一行（中點分隔），跟水晶同一列。
       代碼那一句從「隊伍代碼 X　要加進來的人用這一串。」縮成
       「代碼 X」——那一句解釋只有第一天有用，而代碼本身就是動作。 */
  var H = ['<div class="card tmc">'];
  H.push('<div class="tmc-h">');
  H.push('<b class="tmc-n">' + esc(t.name) +
    (t.project ? '<i>' + esc(t.project) + '</i>' : '') + '</b>');
  /* 隊伍代碼是唸給隊友的。不分組那一站沒有隊友。

     ── 一顆複製鍵 ──

     2026-09-09 加的。這一串的用途從頭到尾只有一個：交到隊友手上。
     在那之前唯一的路是看著螢幕把六個字念出來或打出來，而開學第一節
     課全班同時在做這件事——六組的六串同時在空氣裡。抄錯一個字的
     代價不是重打，是加進別人那一組，而那個是退不掉的
     （見 15-auth.js 的 actJoinTeam：組好了就不能換）。

     用 data-copy 這條路，跟「老師要去哪裡看」那一行同一顆
     （見 56-viz.js 的 whereLine，以及 55-ui.js 裡收 copy 的那一行）。 */
  if (t.joinCode && !RULES.SOLO) {
    H.push('<span class="tmc-c">代碼 <b>' + esc(t.joinCode) + '</b>' +
      '<button class="btn ghost cp" data-act="copy" data-copy="' +
      esc(t.joinCode) + '">複製</button></span>');
  }
  /* 這一格印的是**手上剩下的**，不是拿過的總數。

     兩個數字是兩種用途：榜上那個是「你們做了多少」（拿過的，花掉不扣，
     見 68c-cryrank.js），這一格是「你們現在能做什麼」——他要決定
     點不點得亮圖鑑上那一位的時候，看的是這個。

     花過才寫括號那一半。沒花過的時候兩個數字一樣，寫出來是雜訊。 */
  H.push('<span class="tmc-cry">' + c.left + ' 顆' +
    (c.used ? '<em>拿過 ' + c.all + '</em>' : '') + '</span></div>');
  H.push('<div class="tmc-l">');
  mem.forEach(function (u) {
    var g = heroOf(u);
    /* 不是按鈕。學生之間不用互相點進去看。

       而且本來那一條是壞的：它傳的是使用者 id，而 PAGES.person 收的是
       組別 id（班級地下城那一條傳組別，那個才是對的），所以從這裡
       點進去只會看到「找不到」。

       自己那一格還是有金框——那是資訊，不是「可以按」。 */
    H.push('<span class="tmc-m' + (u.userId === S.who ? ' me' : '') + '">');
    H.push(pxTag(g.idleA, g.pal, 'tmc-px'));
    H.push('<span>' + esc(u.name || '') + '</span>');
    H.push('</span>');
  });
  H.push('</div>');
  H.push('</div>');
  return H.join('');
}

/* 這一趟現在是什麼狀態。一個短標籤，不是一句解釋。 */
function taskTag(next) {
  return ({
    name: '第一件事', commit: '新的任務', doing: '正在做',
    stamped: '結果出來了', review: '在老師那邊', back: '退回來了',
    waitexit: '出口', left: '地面', idle: '等老師派'
  })[next.kind] || '';
}

/* 廊道底下那一排門。都是偶爾才用的，但都不能藏起來——
   沒觸發過的東西等於不存在。

   本來這裡是營火、出口、招牌。營火拿掉了：它問的「哪一段比你想的久」
   已經是戰鬥的第二題，而且它的 lit 條件永遠是 false，從來沒亮過。
   招牌也拿掉了：專案名在頂條上，而且點得進去改。
   換上來的是任務清單與圖鑑——它們本來各佔一個分頁，但它們不是步驟。 */
function deskRow(t, next) {
  var H = ['<div class="desk">'];
  /* 任務清單在側欄，這裡不再放一次——兩個地方都放就是重複。

     圖鑑留著。它不在四件事的哪一步上，但它在終點上：
     它記著「你在哪一趟遇過哪一隻」，而那是一學期走完之後
     才看得出形狀的東西。 */
  /* 上次翻開之後多遇到幾隻，就在門上掛幾。翻開就消掉。 */
  var cnM = codexNew(me());
  var cnK = keepNew(me(), t.teamId);
  var cn = cnM + cnK;
  /* 門上一個數字，但講清楚是哪一種——這一頁裝著兩種東西，
     「多了 1」不說是哪一種的話，翻開還是要自己找。 */
  var cnSay = cn
    ? '圖鑑：多了 ' + [cnM ? cnM + ' 位委託人' : '', cnK ? cnK + ' 張任務之證' : '']
        .filter(function (x) { return x; }).join('、')
    : '圖鑑：遇過的委託人，跟拿到的任務之證';
  /* ── 金邊是「裡面有你還沒看過的東西」 ──

     這一顆本來寫死 lit，所以第一天打開就是金的——而那時候圖鑑裡
     一位委託人都沒遇過、一張任務之證都沒有。金邊在說「這裡面有東西」，
     學生點進去看到一整片黑影。

     金色在這整套裡只代表一件事（見 50-style.css）：可以按、你在這裡、
     有新東西。寫死就是把它變成裝飾，而一個永遠亮著的記號等於沒有記號
     ——真的多了一位委託人的時候，它跟昨天長得一模一樣。

     改成跟門上那個數字同一個來源：有 cn 才亮。 */
  H.push('<button class="dk' + (cn ? ' lit' : '') + '" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'go:codex' })) + '\' title="' +
    esc(cnSay) + '">' +
    pxTag(ICONS.codex, ICON_ON, '') + '<i>圖鑑</i>' +
    (cn ? '<em class="nb">' + cn + '</em>' : '') + '</button>');
  /* 故事。第一次進來看過一次，之後從這裡回來看。

     放在圖鑑旁邊是因為它們是同一種東西：都不是「要你做的事」，
     都是「這個世界是什麼」。而它一直在——沒觸發過的東西等於不存在，
     一個看過就消失的開場，等於他忘了之後再也找不回來。

     ── 還沒讀過就亮 ──

     金邊的意思是「裡面有你還沒看過的東西」，而第一天最符合那句話的
     就是這一扇：圖鑑是空的，故事是滿的。本來剛好相反——圖鑑寫死亮著、
     故事不亮，於是那個記號指著空房間，而真正該先讀的那一扇沒有記號。

     sawStory 本來就有（見 55-ui.js：第一次進來會先擋去讀一次），
     所以這裡不用多存任何東西。讀過就不亮了，跟圖鑑同一條規則。 */
  var 沒讀過故事 = !(me() || {}).sawStory;
  H.push('<button class="dk' + (沒讀過故事 ? ' lit' : '') + '" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'story:0' })) + '\' title="' +
    esc('故事：這是什麼地方，這裡怎麼走') + '">' +
    pxTag(ICONS.pack, ICON_PAL, '') + '<i>故事</i></button>');
  /* 換角色。挑過一次之後隨時換得掉——它不進任何判定，也不影響
     任何數字，所以換來換去不會有任何代價。門上畫的就是他現在那一個。 */
  H.push('<button class="dk" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'go:who' })) + '\' title="' +
    esc('角色：換一個') + '">' +
    pxTag(HERO.walkA, HERO.pal, '') + '<i>角色</i></button>');
  /* 出口。老師開了才點得動——沒開的時候它是一扇鎖著的門，不是一顆
     按下去會跳「還不行」的鍵。點得動卻沒有反應是最糟的那一種。

     「我們做完了」那一句話搬到任務清單去說：看完那一頁才知道自己是不是
     真的做完了，說出口的地方就該在那裡。 */
  /* 這一顆的 lit 是真的有條件的（只有老師開了才畫得出來），可是條件
     寫在外面的 if 上、class 寫死在字串裡——從字串上看不出差別。

     寫成跟另外兩扇同一種形狀：條件放進 class 裡。這樣「金邊有沒有接
     在條件上」就變成看一眼字串就知道的事，check.js 才擋得準。 */
  if (t.exitOk) {
    H.push('<button class="dk' + (t.exitOk ? ' lit' : '') + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'go:exit' })) + '\' title="' +
      esc('出口：老師開了，從這裡上去') + '">' +
      pxTag(ICONS.log, ICON_ON, '') + '<i>出口</i></button>');
  } else {
    /* 三種鎖著的狀態要分得出來。本來 exitNo（老師說還不行）跟
       「還沒說」共用同一句 title——老師回了話，學生在任何裝置上
       都看不到。 */
    H.push('<div class="dk shut" title="' +
      esc(t.exitNo ? '出口：老師說還不行'
        : t.exitAsk ? '出口：說了，在等老師開'
        : '出口：要老師開才走得出去') + '">' +
      pxTag(ICONS.log, ICON_PAL, '') + '<i>出口</i></div>');
  }
  H.push('</div>');

  /* ── 出口的狀態要看得到 ──

     那四種狀態本來只寫在 title 裡，而 title 在手機上不存在——
     一整個班用手機的時候，「說了沒」「老師答了沒」四種長得一模一樣。

     任務清單那一頁其實把三種都寫清楚了，但那是**去翻的人**才看得到。
     按下「我們做完了」的是一個人，另外三個隊友沒有任何線索；
     老師回「還不行」的時候更嚴重——那句回答等於沒有送到。

     所以在門底下說一句。只有在有話可說的時候才出現（沒說過就不說，
     不然那是雜訊），而且指得出去哪裡看細節。 */
  if (!t.leftAt && !t.exitOk) {
    if (t.exitNo) {
      H.push('<p class="dim">出口：老師說還不行。要再說一次，去任務清單。</p>');
    } else if (t.exitAsk) {
      H.push('<p class="dim">出口：說了「我們做完了」，在等老師開門。</p>');
    }
  }
  return H.join('');
}

/* ---------- 老師分的段 ----------
   他有分才畫。勾一段是「這一段做完了」，隨時可以改——
   勾錯了不該是一件要去求人的事。它不影響判定。 */
function stepCard(runId) {
  var sp = stepsOf(runId);
  if (!sp) return '';
  var H = ['<div class="card">'];
  H.push('<div class="eyebrow">段　' + sp.on.length + ' / ' + sp.all.length + '</div>');
  H.push('<div class="steps-list">');
  sp.all.forEach(function (x, i) {
    var on = sp.on.indexOf(i) >= 0;
    H.push('<button class="stp' + (on ? ' on' : '') + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'tick:' + runId + '|' + i })) + '\'>' +
      '<b></b><i>' + esc(x) + '</i></button>');
  });
  H.push('</div></div>');
  return H.join('');
}

/* 哪一組遇到哪一隻的 mobFor 在 13-strata.js——那是世界的規則，不是畫面的。 */

/* nextThing 回的那個字，對到步驟條的第幾格。 */
var STEP_AT = {
  commit: 0,
  doing: 1, stamped: 1, review: 1
};

/* 上一次自己留下的那一句 */
function lastKeep(teamId) {
  var ks = keepsOf(teamId);
  return ks.length ? ks[ks.length - 1] : null;
}


/* ---------- 唯一的那一顆動作 ---------- */
/* ---------- 唯一可以按的那一個 ----------

   一個標籤（現在是什麼）＋ 一顆鍵（要做什麼）。沒有解釋句。
   狀態由廊道底下那排數字說，不由這裡用一句話說一次。 */
/* 只放「要按的那一顆」。

   上面那一行（.tline）已經印了現在是什麼狀態、哪一件任務——本來這裡
   每一個分支又把同一件事印一次，八個分支八次：tline 說「新的 · 訪三個人」，
   卡片再說一次「新的 · 訪三個人」；tline 說「在老師那邊」，
   卡片再說一次「在老師那邊」。

   留下來的只有兩種東西：別人說的話（老師退回那一句、走出去那一句），
   跟看不出來的數字（在他那邊排第幾）。狀態誰在說，上面那一行已經負責了。 */
function actionCard(t, next, st) {
  var H = ['<div class="act-card">'];
  var row = next.row;

  if (next.kind === 'name') {
    /* 第一個動作不可以是「等」。 */
    H.push(btn('這個專案叫什麼', 'go:sign', 'big'));

  } else if (next.kind === 'left') {
    if (t.exitWord) H.push('<p class="quote">' + nl(t.exitWord) + '</p>');
    H.push(btn('看你帶出來的', 'go:exit', 'big'));

  } else if (next.kind === 'waitexit') {
    /* 「出口」上面那一行說過了，這裡只留新的那一半。 */
    H.push('<div class="eyebrow">等老師確認</div>');
    H.push(btn('還沒，收回', 'cancelexit', 'ghost'));

  } else if (next.kind === 'commit') {
    /* 有任務發來了——但這裡不給臉。

       委託人走進來那一下留在 commit 頁上：先知道有任務，再看到是誰
       派來的，那一下才有東西可以演。臉先在首頁出現的話，進去就只剩
       一張已經看過的圖。

       這一句講「任務」，按鈕跟著改成「去看看」——不能寫「去見他」：
       上面那句話沒有先提到一個人，「他」會找不到指的是誰
       （2026-09-23 踩過，原本這句是「有人在等這一件」才配得上「他」）。 */
    H.push('<p class="waiting">有任務發來了。</p>');
    H.push(btn('去看看', 'go:commit:' + row.ms.msId, 'big'));

  } else if (next.kind === 'doing') {
    H.push(doingCard(t, row, st));
    /* 老師又派了幾個。原本是一句灰字，量出來的樣子是「完全看不到，
       連知道都不知道」——手上這一趟做完才輪到它們沒變，但學生要
       查得到那幾件叫什麼名字，不是只知道一個數字。借老師端「剛承諾」
       那顆通知banner同一種樣式（見 70-teacher.js 的 asknote），
       點下去帶去任務清單，那幾件已經在裡面（狀態「還沒說幾天」）。 */
    if (next.more) {
      H.push('<button class="asknote pressable" data-act="run" data-p=\'' +
        esc(JSON.stringify({ a: 'go:pack' })) + '\'>' +
        '<b>老師又派了 ' + next.more + ' 個</b>' +
        '<i>可以先開始，不用等手上這一趟做完</i></button>');
    }

  } else if (next.kind === 'stamped') {
    H.push(btn('看準不準', 'go:stamp:' + row.run.runId, 'big'));

  } else if (next.kind === 'back') {
    /* 老師退回來了——委託人又站回路上了。那不是懲罰：那一趟的兩個
       數字在他交出去的當下就定了，退回不動判定也不動深度。
       他站回去講的只有一件事：那份東西還沒真的送到。 */
    /* 老師退回來了。他的話放大——那是這一刻唯一要讀的東西，
       而且退回一定帶著話（沒寫理由的退回擋在資料層）。 */
    /* 眉標拿掉了：上面那一行已經寫著「退回來了」。
       這裡剩下的是他的那一句話——那才是這一刻唯一要讀的東西。 */
    if (row.run.word) H.push(wordBlock(row.run, 'big'));
    /* 本來這裡直接再交一次，不用重答。但牠在廊道上站起來了，
       而「牠站著」跟「按一顆鍵就過去」是兩件互相矛盾的事。
       改成走同一條路：重新走一次那幾題，答完再交。

       鍵上本來寫「再打一次」——那是回合制對決那一版留下來的最後一個字，
       而這個作品已經沒有對決了（使用者：「我現在已經沒有回合制對決」，
       交件那一場的動畫也早就從「打牠一下」換成「他接過去」）。

       它偏偏長在最需要講清楚的那一刻：老師剛退回，學生讀完那一句話，
       接下來要按的那一顆。那一顆說「再打一次」，等於告訴他被退回是
       一場架。他要做的是把東西改好再交一次。 */
    H.push(btn('再交一次', 'go:battle:' + row.run.runId, 'big'));

  } else if (next.kind === 'review') {
    /* 等待本來是一片空白：只寫「等他看」，不知道幾天、
       不知道有沒有被看見。三個數字全部都在，給他就好。 */
    var wa = row && row.run ? waitAt(row.run.runId) : null;
    if (wa) {
      H.push('<div class="waitq">');
      H.push('<span>交出去</span><b>' + wa.days + '</b><span>天</span>');
      if (wa.of > 1) H.push('<em>他手上 ' + wa.of + ' 件，你第 ' + wa.at + '</em>');
      H.push('</div>');
    }

  } else {
    /* 沒事做也只說一次。本來這裡是「廊道很安靜」加「等老師派下一個。」，
       而上面那一行已經寫著「等老師派 · 還沒有任務」——同一件事三遍。 */
    H.push('<h2>等老師派下一個。</h2>');
  }

  H.push('</div>');
  return H.join('');
}

/* ---------- 正在做 ----------

   這一張本來是「今天動的是哪一段？」加一排每天要按的鍵。
   拿掉了：兩個接觸點就夠——開始之前說幾天，做完回來交。

   所以這一頁上只有一個動作，而且它一直都在：交出去。
   底下那一句講的是狀態，不是催促——水在哪裡是行事曆決定的，
   他開不開這一頁都一樣。 */
function doingCard(t, row, st) {
  var r = row.run;
  var H = [];
  /* 任務名上面那一行（.tline）已經印了。這裡只留停很久那一句——
     它是新的，而且它只在真的停很久的時候才出現。 */
  if (st && st.level) {
    H.push('<div class="eyebrow warnx">' + esc(RULES.stallSay(st.level, st.days)) + '</div>');
  }
  /* ── 大家都填好了，可是沒有人交 ──

     每個人現在可以按「我這一份好了」先走（見 67-battle.js）。
     四個人都按完之後那一趟還是 running——東西沒有到老師手上，
     而畫面上一句話都沒說。量出來的樣子：四個人都覺得自己做完了，
     老師的清單是空的，沒有人知道少了最後那一下。

     所以這一顆會換字：還有人沒填就是「做完了」（跟以前一樣），
     全部填完就變成「交出去給老師」，而且上面說一句。

     開頭那幾天不說「還有 4 個人沒填」——那時候一個人都還沒填，
     那句話是雜訊不是提醒。要等到有人開始填了才算一件事。 */
  /* ── 填完的人跟沒填的人，看到的不一樣 ──

     本來這一段對兩個人說同一句話。實際跑出來是這樣（小美填完、
     阿哲還沒）：

       小美看到　還有 1 個人沒填自己那一份。　[做完了]
       阿哲看到　還有 1 個人沒填自己那一份。　[做完了]

     一模一樣。於是：

       小美讀到那句，不知道那個「1 個人」是不是自己——她只好再進去
       走一次同樣的六題，確認一下
       阿哲讀到那句，也不知道那個人就是他自己——他以為在等別人

     兩個人都在等對方。而這一格是這套系統收個人層資料的入口。

     所以每一個人先讀到的是自己那一半。

     ── 為什麼是「改」不是「不能按」 ──

     填完之後把鍵鎖起來是一條死路：她寫 3 天、隔天發現其實是 4 天，
     那就再也改不了。而資料層本來就允許改（actMyPart 只要 running
     就收），鎖的是畫面不是規則——那種擋法只會讓人以為系統壞了。

     所以鍵換字不換路：「改我那一份」。進去看得到自己存過的數字，
     改完再存一次。交出去之後才真的不能改（那時候老師在看了）。 */
  var pl0 = (r.plan || []).length;
  var wrote = Object.keys(r.said || {}).length;
  var left = pl0 || wrote ? partsLeft(r) : 0;
  var 我填了 = !!((r.said || {})[S.who]);
  /* 一個人一組（個人制）。那時候「大家」只有他自己，
     「還有 N 個人沒填」也永遠是 0——那幾句話要換一套。 */
  var 獨 = where('Users', function (u) {
    return inTeam(u, t.teamId) && u.role === 'student';
  }).length <= 1;
  /* 2026-09-23：這裡本來只在「大家都填完了」才給「交出去給老師」，
     其餘兩種情況只給「做完了」／「改我那一份」——資料層從來沒有真的
     擋著等全組（見 67-battle.js 的 spent／said 那兩題：「只看你名下
     那幾件，拿別人沒填來擋你是連坐」），可是畫面上只有這一句「還在等
     N 個人」，沒有一顆鍵明講「你現在就可以交」，量到的樣子是很多組
     卡在「進行中」——不是東西不見了，是每個人都以為要等別人先填完。
     三種情況現在都給同一顆「交出去給老師」，講法照實：任何一個人都
     交得出去，不用等其他人。 */
  if (wrote && !left) {
    H.push('<p class="waiting">' +
      (獨 ? '你填好了，還沒交出去。' : '大家都填好自己那一份了，還沒有人交出去。') +
      '</p>');
  } else if (我填了) {
    H.push('<p class="dim">你那一份填好了。' +
      (left ? '還有 ' + left + ' 個人沒填，你也可以先交出去，不用等他們。' : '') + '</p>');
  } else {
    if (wrote) {
      H.push('<p class="dim">' + wrote + ' 個人填好了，你還沒填自己那一份——' +
        '不過不用等所有人都填，任何一個人都交得出去。</p>');
    }
  }
  H.push(btn('交出去給老師', 'go:battle:' + r.runId, 'big'));
  /* 做到一半發現自己說少了，可以改。

     這條路本來只從戰鬥裡進得去，而且語氣是逃跑——一個學生在第三天
     發現說少了，得先按「做完了」進戰鬥再逃出來，那不是他會想做的動作。

     代價不用另外設計：走過的那幾天留在紀錄上（說 5、走了 3、重新想過），
     看得見，但不扣任何東西。改承諾不是失準，那是兩件事。 */
  /* 還能改幾次，寫在鍵上。額度用完就不畫這一顆——
     一顆按下去只會被拒絕的鍵，比沒有那一顆更吵。 */
  var left = redoLeft(r);
  if (left > 0) {
    H.push(btn(left > 1 ? '改承諾（還能改 ' + left + ' 次）' : '改承諾（最後一次）',
      'redo:' + r.runId, 'ghost'));
  }
  return H.join('');
}

/* ---------- 場景底下那一行 ---------- */
function sceneCap(t, next, st) { return ''; }

/* ---------- 招牌 ----------
   廊道口掛的是誰。名字是他們自己寫的，這是招牌唯一的意義——
   本來還有三階材質（走越深牌子越好），拿掉了：深度已經不是進度。 */
PAGES.sign = function () {
  var t = myTeam();
  var sg = signOf(t.teamId);
  var H = [head('招牌', '組名跟專案名', '')];
  H.push('<div class="card"><div class="fa-in">');
  /* 同廊道口那一塊：套當層的顏色（見 61-scene.js 的 sceneMouth）。
     這一頁就是點招牌進來的，兩邊要是同一塊牌子。 */
  H.push(pxTag(sg.px, zoneNow(t.teamId).pal, 'fa-px'));
  H.push('<div>');
  H.push('<div class="eyebrow">組名</div>');
  H.push('<input id="tm-name" value="' + esc(t.name || '') +
         '" placeholder="' + esc('你們這一組叫什麼') + '">');
  H.push(btn('改組名', 'teamrename', ''));
  H.push('<div class="eyebrow" style="margin-top:14px">專案名</div>');
  H.push('<input id="pj-name" value="' + esc(t.project || '') +
         '" placeholder="' + esc('這個專案叫什麼') + '">');
  H.push('<div class="row">');
  H.push(btn('換字', 'rename', ''));
  H.push(btn('回廊道', 'go:home', 'ghost'));
  H.push('</div>');
  H.push('</div></div></div>');
  return H.join('');
};

/* 「哪一段比你想的久」那一排。
   「都差不多」跟其他選項一樣大——它不是逃生口，它是一個真的答案。 */
function overRow(r) {
  var picked = DRAFT.overs || [];
  var none = DRAFT.overs && !DRAFT.overs.length && DRAFT.said;
  var H = [];
  if (stepNames(r.runId).length) {
    H.push(stepLegend(r.runId, picked, 'over'));
  }
  H.push('<div class="alist">');
  H.push('<button class="ac' + (none ? ' on' : '') + '" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'oversame' })) + '\'><b></b>都差不多</button>');
  H.push('</div>');
  return H.join('');
}

/* 承諾那一頁還沒有 run，所以直接從任務上讀老師分的那幾段。
   那一排同時是兩件事：這一趟有哪幾段（範圍），
   以及點起來標「這一段會比想的久」。 */
/* 老師寫的那幾段。

   一定要回陣列：呼叫的地方直接 .map / .length，而 m.steps 是從雲端
   拿回來的（Firestore 的規則是完全開放的，見 41-sync.js）。一筆形狀
   壞掉的任務會讓接委託那一頁整個畫不出來，而那是學生走的第一頁。 */
function previewSteps(m) {
  var a = m && m.steps;
  return Array.isArray(a) ? a : [];
}

function msStepLegend(m, sel, act) {
  var a = previewSteps(m);
  if (!a.length) return '';
  var H = ['<div class="alist">'];
  a.forEach(function (x, i) {
    var on = sel && sel.indexOf(i) >= 0;
    H.push('<button class="ac' + (on ? ' on' : '') + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: act + ':' + i })) + '\'>' +
      '<b style="background:' + stepHue(i) + '"></b>' + esc(x) + '</button>');
  });
  H.push('</div>');
  return H.join('');
}

/* ---------- 承諾：滑桿 ＋ 自己標哪幾件會比想的久 ---------- */
PAGES.commit = function () {
  var t = myTeam();
  var m = msOf(S.p.id);
  if (!m) return '<div class="card">找不到這一個任務。</div>';
  /* 他自己拆的那幾件。第一次進來用老師寫的分段當起點——
     老師沒寫就是一張白紙，那時候拆的人是他。 */
  if (!DRAFT.plan) {
    /* 預設掛在自己名下。沒有人負責的細項在回報的時候沒有人填得了，
       所以預設要是一個真的人，不是空的。 */
    DRAFT.plan = previewSteps(m).map(function (x) {
      return { n: x, d: 1, who: S.who };
    });
  }
  var plan = DRAFT.plan;
  /* ── 一步一步，不要一路往下 ──

     這一頁本來是一路捲下去的：委託人、老師排到哪天、天數、走廊、
     拆件、標記、把握、承諾。390 寬量到 2029px——**兩屏半**，而且
     委託人在第一屏底就不見了。

     交出去那一場早就不是這樣了（見 67-battle.js）：他釘在畫面上，
     一次問一件事。這一頁跟那一頁是同一個人的兩次見面，做法要一樣。

     三步：
       0　他說的那一句　　　接下來要做什麼，先聽他講
       1　你要做哪幾件　　　拆件與「哪幾段會比想的久」，可以整步跳過
       2　幾天 ＋ 有多確定　這兩樣互相決定，所以一定要在同一步上

     為什麼 2 不能再拆：拆件會改天數（列了就加總）、把握是「對這個
     天數」的把握、老師排的那一天畫在同一把尺上讓他當場比得出來。
     那三樣拆開就要來回翻，而來回翻正是這一次要修掉的東西。 */
  var st = Math.max(0, Math.min(2, Number(S.p.st) || 0));
  /* ── 算出來的那個數字是起點，不是結論 ──

     拆了件，要徑會算出一個數字（見 40-db.js 的 planDays）。可是那個
     計算只知道「誰做哪幾件、各幾天」，它不知道的事情多得是：

       乙要等甲做完才能開始（要徑假設兩個人可以同時動）
       這禮拜還有三科要交
       他們一個禮拜只碰得到一次面

     算出來 2 天、他們心裡知道是 4 天——如果那一格不能動，他們就得
     承諾一個自己不相信的數字，而判定讀的正是那個數字。那等於系統
     幫他們估，然後拿它自己估的去評他們。

     所以算出來的數字當**預設值**，那兩顆加減鍵照樣給。他改了就是他的。
     沒改就是算出來的那一個——兩種都留在紀錄上（見 actCommit 的 estCalc）。

     draft() 的第二個參數就是預設值，所以這一行同時做了兩件事：
     沒動過的時候給要徑算的，動過之後給他按出來的。 */
  var 算的 = plan.length ? planDays(plan) : 0;
  var est = plan.length ? Number(draft('est', 算的))
    : Number(draft('est', RULES.EST_DEFAULT));
  var flags = DRAFT.flags || [];

  /* 兩個階段共用這一頁：先說幾天，再選去哪裡。
     分岔放在這裡，前面那幾行（plan／est）兩邊都要用。 */


  /* 眉標是這一頁在做的事，不是這一頁上最大的那張圖。

     本來寫「這一件的委託人」——那把整頁框成一段介紹，而他打開這一頁
     是來決定要花幾天的。標題是任務名、副標是老師寫的注意事項，
     那兩行才是他要讀的東西。 */
  var H = [head('接下委託', m.title, m.note)];

  /* ── 委託人 ──

     他在這裡就出現，不是走到那一天才看到——他是要這件事的人，
     任務出現的那一刻他就存在了。

     「這次的委託人竟然長這樣」是這一頁最該發生的事。 */
  var pat = mobFor(m.msId, t.teamId);
  /* 第一次打開這一件的時候他才走進來。

     只記在這一次使用裡（跟圖鑑那道光同一種做法，見 markCodex）——
     每次重畫都演一次會變成雜訊，而演出只有第一次是演出。 */
  var firstLook = pat && !PAT_IN[m.msId];
  if (pat) PAT_IN[m.msId] = 1;
  /* 第 2 步不畫他的大圖了。

     他不是消失——走廊那一條的盡頭站的就是他（見 estWalk）。這一步
     他在決定一個數字，而那張大圖在這裡佔掉 450px，把尺跟走廊推到
     第二屏去。同一個人在同一頁上出現兩次，其中一次就是雜訊。 */
  if (pat && st < 2) {
    var pz = mobZone(pat);
    /* ── 一場戲，不是一張卡 ──

       一趟有兩次見到他：接下委託的時候，跟走到底交東西的時候。
       第二次早就是一場戲了（見 67-battle.js：閃一次進場、名牌、
       字幕框、他在對面呼吸）。第一次本來只是一張卡片，圖已經
       貼在上面——他沒有登場，他只是在那裡。

       所以這裡用同一套零件：.bt-wipe 閃場、.bt-plate 名牌、
       .bt-say 字幕框，全部是照面那一場的（那三個 class 沒有綁在
       .bt 底下）。兩端長得一樣，因為那是同一個人的兩次見面。

       畫的是大隻的那一張（36×24）——那張本來就是為了這種近的
       場面畫的，眼睛有瞳孔、手有指節，而且他在呼吸。 */
    /* 點不進去了。

       本來整塊是一顆鍵，點下去跳到那一位的放大頁。可是他打開這一頁
       是來決定要花幾天的——中間跳出去看一隻生物的介紹，回來還要
       重新進入狀況。要看他，圖鑑那一頁一直都在。 */
    H.push('<div class="pmt ' + pz.key + (firstLook && st === 0 ? ' enter' : '') + '">');
    if (firstLook) H.push('<div class="bt-wipe"></div>');
    H.push('<div class="pmt-ch">' + patTag(pat, pz.pal, 'bt-px', 1) + '</div>');
    H.push('</div>');
    /* 對話框。名牌長在框的左上角，跟交出去那一場同一個做法——
       兩端是同一個人的兩次見面，長相要一樣。 */
    H.push('<div class="bt-say pmt-say' + (firstLook ? ' enter' : '') + '">');
    H.push('<span class="bt-name">' + esc(pat.n) + '</span>');
    H.push('<i class="bt-arrow"></i>');
    /* 他自己的那一句（見 19-patron.js 的 PAT_SAY）。查不到才退回
       本來那一句——三十四位都寫了，這一段是給以後多加人用的。

       底下那一行還是他的形容：上面是他說的，下面是他長什麼樣。
       兩行分工，所以不用擠成一句。 */
    /* 第一次上門，跟他又來了，是兩句不一樣的話。

       他上一次站在那條路的盡頭等過你——如果他再來的時候講的是
       跟第一次一模一樣的話，那前面那一趟就等於沒有發生過。 */
    /* 他說的那一句留著——那一句在講這一件委託。

       他的形容（「他靠著的鐵件會變薄。他說那是自然的。」）拿掉了：
       那是一段關於這隻生物的介紹，跟這一件任務沒有關係，而這一頁
       要他做的判斷是「這件事要花我幾天」。那一句在圖鑑裡，
       他想知道的時候點進去看。 */
    H.push('<b>' + esc(patSay(pat, patSeen(t.teamId, pat.n) ? 'back' : 'ask') ||
      patSay(pat, 'ask') || (pat.n + ' 在等這一件。')) + '</b>');
    H.push('</div>');
    /* 「100 顆水晶」拿掉了。

       每一件委託都是同一個 100，所以那一行在每一頁上都一模一樣——
       一個永遠不變的數字不帶任何資訊，它只是佔著這一頁最上面的位置。

       真的會不一樣的是老師收下時多給的那 1–5 顆，而那個在判定頁上
       他自己看得到。 */
  }

  /* 走到第幾步。跟交出去那一場同一排點（見 58-battle.css 的 .bt-dots）
     ——同一件事在兩邊要長一樣。 */
  H.push('<div class="bt-dots">');
  for (var sd = 0; sd < 3; sd++) {
    H.push('<i' + (sd === st ? ' class="on"' : (sd < st ? ' class="done"' : '')) + '></i>');
  }
  H.push('</div>');

  /* ── 第 0 步：先聽他講 ── */
  if (st === 0) {
    H.push('<div class="row">');
    H.push(btn('這一件我接了', 'cmstep:1', 'big'));
    H.push(btn('回廊道', 'go:home', 'ghost'));
    H.push('</div>');
    return H.join('');
  }

  /* ── 第 2 步：幾天 ＋ 有多確定 ── */
  if (st === 2) {

  /* 兩顆鍵先，底下那根尺跟走廊都跟著它動。 */
  var cmU = DRAFT.estU || 'd';
  H.push('<div class="card">');
  /* 老師排到哪一天。他排的是課程的排程，不是判定——所以這裡只寫
     事實，不寫「你來不及了」那種話。走廊上那條線畫的是同一件事。 */
  var di = dueIn(m);
  if (di) {
    /* 剩不到一天要報小時，不然「還有 1 天」是假的——那句話是
       dueLeftSay 在算的，這裡本來自己又算了一次，而且算錯。 */
    H.push('<div class="dueline' + (di.past ? ' past' : '') + '">' +
      '<span>老師排到</span><b>' + esc(dueSay(m)) + '</b>' +
      '<em>' + esc(dueLeftSay(m)) + '</em></div>');
  }
  /* 兩種都給那兩顆鍵。拆了件只是先幫他算一個起點——
     那個數字是他要承諾的，所以最後一定要按得動（見上面 est 那一段）。 */
  if (plan.length) {
    H.push(estStepU(est));
    /* 這個數字是誰說的，取決於上一步有沒有拆件。

       拆了　　它是每一件加起來的，而每一件的天數只有本人按得動
               （見 55-ui.js 的 pland）——所以它是全組每一個人各自
               說的話的總和
       沒拆　　它是一個數字，誰在承諾就是誰按的——那一趟的個人層
               完全沒有資料（exportItems 是照 r.plan 一件一列的，
               沒有 plan 就沒有列）

       兩種都成立，可是它們不是同一種東西，而畫面上長得一模一樣。
       所以在這裡說出來。 */
    /* 這裡不掛標記。

       ── 為什麼 ──

       這一頁上學生真正**碰得到**的只有一格：把握。上面那個天數在
       有拆件的時候是第 2 步的加總，唯讀——它不是一個「誰來寫」的
       問題，它是一個已經發生的結果。

       本來這裡掛了一個【個人】、底下把握又掛一個【組】，於是同一頁
       上兩個標記；而沒拆件的時候兩個都是「全組一份」，變成同一句話
       講兩次（使用者回報的就是這個）。

       標記是用來回答「這一格是誰寫的」。一格一個，沒有那一格就不要
       有標記——多一個就開始要人去分辨兩個標記在講哪一格。

       那個數字從哪裡來還是要說，只是那是一句事實不是一個標記。 */
    /* ── 這個數字怎麼來的，要講對 ──

       本來寫「上面那幾件加起來的」，而相加是錯的（見 40-db.js 的
       planDays）：分工的人是同一天各做各的，四個人各說 2 天不是 8 天。

       現在是要徑——每個人自己那幾件相加，最慢的那一位決定這一趟。
       所以這一句要講得出「最慢的是誰」，不然那個數字看起來只是一個
       莫名其妙變小了的總和。

       一個人的隊（含 B 站）沒有「最慢的那一位」可言，那一句對他不成立，
       所以就照實說是他自己那幾件加起來的。 */
    /* 而且他改過之後，那一句要跟著換。

       本來那一句是用斷定的語氣講的（「所以這一趟是 2 天」）。數字變成
       按得動之後，同一句話在他按了 ＋ 之後就變成假的——畫面上寫 4 天，
       底下說「所以這一趟是 2 天」。

       所以分兩句：沒動過的時候講要徑怎麼算的；動過了就講算出來是多少、
       現在是他定的。兩句都只講事實，不評價他改得對不對。 */
    /* 這一句放在 estWhy 裡，因為按加減鍵的時候不重畫（estLive 是直接
       改 DOM）——兩邊要讀同一支，不然按完數字變了、這一句還停在舊的。 */
    H.push('<p class="dim es-why">' + estWhy(plan, est) + '</p>');
  } else {
    H.push(estStepU(est));
    /* 沒拆件：這個數字就是這一頁上唯一寫得了的東西之一，而它是組的。
       所以標記掛在這裡，底下把握那一格就不再掛（見下面）。 */
    H.push(whoTag('team', '拆件的話，天數會變成每個人各自說的', '這個數字'));
  }

  /* 決定的時候要看的東西全部畫在同一根尺上：你前幾趟說了幾天、
     實際幾天，別組這一件事說的範圍，還有準的範圍。

     本來是三張卡——三張卡量的是同一個單位，等於叫使用者自己
     在腦袋裡把它們疊起來。 */
  /* 這兩塊是天的尺——過去幾趟、準的範圍、走廊格數，全部照著
     1–21 天畫。選了小時／週的時候 est 是換算過的小數天（例如
     8 小時＝0.33 天），畫在同一根尺上只會變成一格幾乎貼底的線，
     看起來像壞掉。選了「天」以外的單位就不畫這兩塊，等他選回
     「天」再出現，不要硬畫一個誤導的版本。 */
  if (cmU === 'd') {
    var past = runsFor(t.teamId).filter(function (x) { return x.run.stamp; }).slice(-3);
    H.push(estAxis(est, past.reverse()));
    /* 拉到幾就亮幾格，擋路的那一隻站在盡頭。
       承諾是這裡唯一有阻力的選擇，它不該長得像填表。 */
    H.push(estWalk(t, m, est));
  }
  H.push('</div>');

  } else {

  /* ── 第 1 步：你要做哪幾件，每一件幾天 ──

     老師可以只丟一個大任務，拆的人是要做的那一個。他寫過分段的話
     那幾行就是起點；沒寫就是一張白紙。

     每一件預設一天，所以加一件一定會動到下一步那個數字——
     加了東西畫面沒反應是最容易讓人以為壞掉的事。 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">你要做哪幾件</div>');
  /* 這一張卡是混的：拆幾件、誰做哪一件，大家都改得動；**天數**只有
     本人按得動（見 55-ui.js 的 pland）。

     所以兩行並排，不寫成「全組一份，但天數例外」——那樣會把這一頁
     上真正重要的那一半塞進「例外」兩個字裡。天數是這整套系統唯一
     在收的個人層資料，它該自己站一行。 */
  H.push(whoTag('team', '', '拆幾件、誰做哪一件'));
  H.push(whoTag('one', '', '每一件幾天'));
  if (plan.length) {
    H.push('<div class="plist">');
    var waiting = 0;
    plan.forEach(function (x, i) {
      /* 同一張紙，各寫各的行（見 55-ui.js 的 pland）。
         別人那幾件看得到、按不動——跟交出去那一頁一模一樣。 */
      /* 全組一起做的那一件誰都按得動（見 55-ui.js 的 pland）。 */
      var own = !x.who || isAll(x.who) || x.who === S.who;
      /* 「還有幾件沒有本人說幾天」不算全體那幾件——那一件沒有本人，
         算進去的話那一句永遠消不掉，而它會變成一個假的待辦。 */
      if (!x.byOwn && !isAll(x.who)) waiting++;
      H.push('<div class="pl' + (own ? '' : ' theirs') + '">');
      H.push('<b style="background:' + stepHue(i) + '"></b>');
      H.push('<i>' + esc(x.n) + '</i>');
      /* 誰做這一件。點一下換下一個人。分工是一起喬的，所以這一顆
         不擋——擋的是天數，因為天數是那個人自己要說的話。

         不分組那一站不畫：每一件都是他的，那一顆按下去也只會換回
         他自己。 */
      if (!RULES.SOLO) {
        H.push('<button class="pw" data-act="run" data-p=\'' +
          esc(JSON.stringify({ a: 'planwho:' + i })) + '\' title="' +
          esc('點一下換人') + '">' + esc(shortWho(x.who)) + '</button>');
      }
      /* 這一件的原始數字：選過單位的印那個單位的數字，沒選過的
         （舊資料、或本來就用天填的）印 x.d，一個字都不用變。 */
      var xn = (x.dU && x.dU !== 'd' && x.dN != null) ? x.dN : x.d;
      if (own) {
        H.push('<button class="pd" data-act="run" data-p=\'' +
          esc(JSON.stringify({ a: 'pland:' + i + ',-1' })) + '\'>−</button>');
        H.push('<u' + (x.byOwn ? '' : ' class="wait"') + '>' + xn + '</u>');
        H.push('<button class="pd" data-act="run" data-p=\'' +
          esc(JSON.stringify({ a: 'pland:' + i + ',1' })) + '\'>＋</button>');
        /* 單位：跟總天數那一格同一套（小時／天／週），這裡空間窄，
           用一顆會輪著換的小鍵，不是三顆並排的籤（見 55-ui.js 的
           plandu）。 */
        H.push('<button class="pu" data-act="run" data-p=\'' +
          esc(JSON.stringify({ a: 'plandu:' + i })) + '\' title="換單位">' +
          esc(estUnit(x.dU || 'd').name) + '</button>');
      } else {
        H.push('<u class="got' + (x.byOwn ? '' : ' wait') + '">' + xn + '</u>');
        H.push('<span class="pu-fix">' + esc(estUnit(x.dU || 'd').name) + '</span>');
      }
      H.push('<button class="px-del" data-act="run" data-p=\'' +
        esc(JSON.stringify({ a: 'plandel:' + i })) + '\' title="' +
        esc('拿掉這一件') + '">×</button>');
      H.push('</div>');
    });
    H.push('</div>');
    /* 還有幾件沒有本人自己說過天數。不擋出發——擋了的話，一個人
       不在，整組就走不了。只是說出來，讓他們自己決定要不要等。 */
    if (waiting) {
      H.push('<p class="dim">還有 ' + waiting +
        ' 件沒有本人說幾天。出發前讓他們自己按一次，那個數字才是他的。' +
        (waiting > 1 ? '一個人填完再換下一個。' : '') + '</p>');
    }
  }
  /* ── 加一件要有一顆看得到的鍵 ──

     本來只有 Enter，而「按 Enter」寫在 placeholder 裡——他一打字那行
     字就不見了。抬起頭要找「新增」的時候，畫面上沒有任何東西可以按。
     手機鍵盤的 return 是有效的，但那要他先想到。

     ＋ 就在旁邊，跟底下那幾件的「＋」是同一顆（.pd），所以它不用學：
     那一顆在下面是加一天，在這裡是加一件。Enter 照樣留著。

     鍵出現以後 placeholder 就不用再教了——圖說得出來的事不再用字說。 */
  H.push('<div class="pl-new">');
  H.push('<input id="pl-add" placeholder="' +
    esc(plan.length ? '再一件' : '例：找到人') +
    '" onkeydown="if(event.key===\'Enter\'){event.preventDefault();ACTS.planadd(this.value);}">');
  H.push('<button class="pd" title="' + esc('加一件') +
    '" onclick="ACTS.planadd((document.getElementById(\'pl-add\')||{}).value)">＋</button>');
  H.push('</div>');
  H.push('</div>');

  /* 老師分的段。點起來標「這一段會比想的久」——
     那一排同時就是這一趟的範圍，所以下面不用再列一次清單。 */
  /* 預測哪一段會拖，走完兩趟才開始問——手上有兩趟的紀錄，
     這個問題才答得出來，而且下一頁的「標對的段」會驗證它。 */
  var askFlag = RULES.asks('flags', depthOf(t.teamId));
  if (previewSteps(m).length && askFlag !== 'off') {
    H.push('<div class="card">');
    /* 第一次出現的時候眉標是金色的（.lit）。那就是標記——
       在視覺標記上面再加一句「新的一題」是同一件事說兩次。 */
    H.push('<div class="eyebrow' + (askFlag === 'new' ? ' lit' : '') +
      '">哪幾段會比你想的久　選填</div>');
    H.push(msStepLegend(m, flags, 'flag'));
    H.push('</div>');
  }

  /* 拆完了往下一步。沒拆也走得過去——拆件本來就是選填的。 */
  H.push('<div class="row">');
  H.push(btn(plan.length ? '就這幾件' : '不用拆，直接說天數', 'cmstep:2', 'big'));
  H.push(btn('回上一步', 'cmstep:0', 'ghost'));
  H.push('</div>');
  return H.join('');

  }

  /* 你有多確定。

     不是選填——這一格是這套系統唯一在教的東西：不是估得準，
     是知不知道自己什麼時候估不準（見 20-rules.js 的 RULES.SURE）。

     它不進判定。它決定的是廊道上你看得到多遠，以及之後那一句
     「你說『很確定』的 N 次裡，準了 M 次」。 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow' + (DRAFT.sure ? '' : ' lit') + '">對這個天數，你有多確定</div>');
  /* 只有拆過件的時候才掛：那時候上面那個天數是每個人各自說的，
     所以要說清楚這一格不是——它是全組一個。

     沒拆件的話上面已經掛了一個「這個數字：全組一份」，這裡再掛一個
     就是同一句話講兩次。 */
  if (plan.length) H.push(whoTag('team', '', '這一格'));
  H.push('<div class="row sure-row">');
  RULES.SURE.forEach(function (s) {
    H.push(btn(s.name, 'sure:' + s.key, 'sure' + (DRAFT.sure === s.key ? ' on' : '')));
  });
  H.push('</div>');
  /* 這一句是換掉的，不是加上去的——原本那一句只講「看得多遠」，
     而看得多遠不是一個他會拿來做決定的東西。現在同一行講的是
     他按下去會失去什麼：說得越死，退路越少。

     不多一行字，多的是那一行字的重量。 */
  H.push('<p class="dim">說得越有把握，之後越不能改。它不影響判定。</p>');
  H.push('</div>');

  H.push('<div class="row">');
  /* 承諾完就出發，中間不再問「去哪裡」——地方是委託人帶來的，
     不是他挑的（見底下 wherePanel 那一段拿掉的理由）。 */
  H.push('<p class="dim cm-note">按下去這個數字就定了。交出來之後，比這天早或晚就是判定。</p>');
  /* 按鍵上要印他選的那個單位，不是永遠印「天」——不然選了小時，
     按鍵上還寫著「我承諾 8 天」，數字跟他剛剛按的完全對不上。 */
  var cmLabel = cmU === 'd' ? est + ' 天' : draft('estN', estUnit(cmU).def) + ' ' + estUnit(cmU).name;
  H.push(btn('我承諾 ' + cmLabel + '，出發', 'commit:' + m.msId, 'big cm-go'));
  H.push(btn('回上一步', 'cmstep:1', 'ghost'));
  H.push('</div>');
  return H.join('');
};

/* ---------- 這一趟要去哪裡：拿掉了 ----------

   本來承諾完天數之後有一頁「選一個地方」，六張地方卡，每張底下印著
   住在那裡的幾位。那一頁的說法是：「他在選地方，也是在選這一趟要
   遇到誰。」

   那句話已經不成立了。委託人由**任務**決定，不由地方決定
   （見 13-strata.js 的 mobFor）——任務一派下來他就定了，
   而選地方排在那之後。所以那一頁在請他做一個決定不了任何事的選擇：

     選之前   委託人已經定了
     選之後   委託人還是同一位

   而且因果反了。正確的鏈是：老師派委託 → 委託帶著委託人來 →
   委託人帶著他住的地方來。不是挑一個地方然後看看那裡有誰，
   是有人來找你，你去他那裡。

   ── 自主性少了一塊嗎 ──

   沒有。自主性住在拆成哪幾件、各要幾天、有多確定、誰做哪一件、
   什麼時候交——那幾個每一個都改變後面發生的事。選地方不改變任何事，
   那是裝飾性的自主，而 SDT 講的自主支持指的是有意義的選擇。
   拿掉它，真正重要的那幾個反而更清楚。

   附帶一個好處：會挑的人本來永遠挑同一個地方；由委託人決定之後，
   一學期六個地方會被走遍。 */

/* ---------- 交出去 ---------- */
/* 交出去那一頁退休了：兩問搬進戰鬥（見 67-battle.js），
   那張選填的日子表搬到封存——它決定的是那一張證長什麼樣子。 */

/* 你說要走多遠。

   一格一天，亮到你拉到的那一格，擋路的那一隻站在盡頭。
   它不是另一個資訊——它是同一個數字換成你等一下真的會看到的樣子。

   承諾是這個系統裡唯一有阻力的選擇，而它本來長得像填表：
   拉一個滑桿、按一個鍵。 */
function estWalk(t, m, est) {
  return '<div class="ew">' + estWalkIn(t, m, est) + '</div>';
}

/* 只有這一段會跟著滑桿變。拆出來是為了拖的時候只換這一塊，
   不要動到滑桿本身——動到它，拖曳就斷了。 */
function estWalkIn(t, m, est) {
  /* 這一條是承諾頁上的預覽，那時候還沒選地方——用現在的。
     選完之後真正的廊道會換成他挑的那一個。 */
  var z = zoneNow(t.teamId);
  var mob = mobFor(m.msId, t.teamId);
  /* 老師排的那一天，換算成還有幾天，落在第幾格。

     換成同一個單位是重點：他按出來的格數跟老師排的那條線用的是
     同一把尺，所以「我排的比老師的長」不用讀，看一眼就知道。

     它不擋、不警告、不進判定。走廊畫到兩者之中比較遠的那一個，
     超出他承諾的那幾格是暗的——那是還沒有人走的地方。 */
  var di = dueIn(m);
  var mark = di && di.days > 0 ? Math.min(di.days, RULES.EST_MAX) : 0;
  var span = Math.max(est, mark);
  var H = ['<div class="ew-in">'];
  for (var i = 0; i < span; i++) {
    H.push('<i class="ew-c' + (i >= est ? ' off' : '') + '"></i>');
    if (mark && i + 1 === mark) H.push('<i class="ew-due"></i>');
  }
  H.push('<span class="ew-m"' + (est < span ? ' style="order:' + est + '"' : '') +
    '>' + pxTag(mob.px, z.pal, 'ew-px') + '</span>');
  H.push('</div>');
  return H.join('');
}

/* ---------- 那個天數是怎麼來的 ----------

   拆了件才會走到這一支。三句，看兩件事：這一組是不是多人，
   以及他們有沒有把算出來的數字改掉。

   多人　沒改　要徑算的，講得出最慢的是誰
   多人　改了　算出來幾天、他們改成幾天
   一人　　　　就是他自己那幾件加起來（B 站與單人的隊）

   為什麼要分「改了」那一句：本來只有一句斷定的話（「所以這一趟是
   2 天」），而數字變成按得動之後，他按了 ＋ 那一句就變成假的——
   畫面上寫 4 天，底下說這一趟是 2 天。

   三句都只講事實，不評價他改得對不對（見 20-rules.js：系統只比對
   兩個數字，判斷是老師的事）。 */
function estWhy(plan, est) {
  var s = planSplit(plan);
  var 算的 = s.all + s.solo;
  var 慢名 = s.who ? (userOf(s.who) || {}).name : '';
  var 多人 = s.n > 1 && 慢名;

  if (est !== 算的) {
    return '算出來是 ' + 算的 + ' 天，你們改成 ' + est +
      ' 天。這一趟算 ' + est + ' 天。';
  }
  /* 有全組一起做的件：那幾天是**加上去**的，不是並行的——一起做的
     時候沒有人能同時做自己那一件。這一句要把加號講出來，不然
     「分工不會讓天數相加」那句話跟眼前的算術會互相打臉。 */
  if (s.all && s.solo) {
    return '一起做的 ' + s.all + ' 天，加上' +
      (多人 ? esc(慢名) + '那幾件' : '自己那幾件') + ' ' + s.solo +
      ' 天。一起做的要相加，各自做的取最久的。改得動。';
  }
  if (s.all) {
    return '這幾件全組一起做，加起來 ' + s.all + ' 天。改得動。';
  }
  if (多人) {
    return esc(慢名) + ' 手上那幾件加起來最久，所以先算 ' + est +
      ' 天。分工不會讓天數相加——最慢的那一位決定。改得動。';
  }
  return '上面那幾件加起來的。每一件的天數是各自按的。改得動。';
}

/* ---------- 老師回了一句：最後幾天 ----------

   這一頁只有一個動作，而那個動作是他的。

   兩個數字都攤在上面，因為這是一次協商不是一道通知：他要看得到
   自己說了什麼、對方說了什麼，然後自己按一次。維持原本那個數字
   也是一個答案——按下去那一下就是他的決定，不是他沒看到。 */
PAGES.ask = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r || !r.askAt) return '<div class="card">找不到。</div>';
  var m = msOf(r.msId);
  var u = r.askBy ? userOf(r.askBy) : null;
  var n = Number(draft('est', r.est));

  var H = [head('最後幾天', m ? m.title : '那一趟', '')];

  H.push('<div class="card">');
  H.push('<p class="quote big"><b>' + esc(u ? u.name : '老師') + '</b>' +
    nl(r.askWord || '') + '</p>');
  H.push('<p class="dim">他覺得會是 ' + r.askEst + ' 天。</p>');
  H.push('</div>');

  H.push('<div class="card">');
  /* 這裡往下協商，最後定的數字一律用「天」（估天數的單位選擇只在
     一開始承諾那一頁，見 60-student.js 的 PAGES.commit）——但這一句
     講的是「他之前說的」，那可能是用小時／週講的，要印他原始那句話，
     不然承諾 8 小時的人會在這裡看到「你說的是 0.33 天」。 */
  H.push('<div class="eyebrow">你說的是 ' + esc(estSay(r)) + '</div>');
  H.push(estStep(n));
  /* 這一句是這一頁最重要的一句。它不是客套：判定讀的是 run.est，
     而 run.est 只有這一顆鍵改得動（見 40-db.js 的 actAnswerAsk）。 */
  H.push('<p class="dim">最後幾天，你說了算。維持也是一個答案。</p>');
  H.push('</div>');

  H.push(btn('就這樣', 'asktake:' + r.runId, 'big'));
  return H.join('');
};

/* ---------- 判定結果 ---------- */
PAGES.stamp = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var s = RULES.STAMPS[r.stamp];
  /* 還沒有判定就沒有東西可報。

     本來這裡直接往下讀 s.key，而 s 在那一刻是 undefined——整頁炸掉，
     畫面全白。走得到的路：那一趟還在走的時候用上一頁回到這裡，
     或是分頁停在這裡放了幾天再回來。

     炸掉的頁比一句「還沒」糟得多：他不知道是自己按錯還是壞了。 */
  if (!s) {
    return '<div class="card"><div class="eyebrow">還沒有結果</div>' +
      '<p class="dim">這一趟還在走。交出去之後才有準不準。</p></div>' +
      '<div class="row">' + btn('回廊道', 'go:home', 'big') + '</div>';
  }

  var t = myTeam();
  /* 剛走完的那一層。判定當下深度就 +1 了，所以要退一格。 */
  var zone = strataAt(Math.max(0, depthOf(t.teamId) - 1), t.teamId);
  var mob = mobOfRun(r);

  /* 戲在照面那一頁演完了，這裡只留報告——再把那一下重演一次是重複，
     而且那一層閃光在動畫被凍住的時候會蓋成一片白。

     但這一頁有一樣東西是照面沒有的：**跟上一趟比**。那是整套系統裡
     唯一說得出「我在變好」的地方，而它本來只是清單上的又一行。

     所以演出不落在揭曉上，落在那一行上：三行一行一行進來，
     上一趟那一行最後到，而且慢一拍。他讀完自己這一趟，
     才看到上一次的自己站在旁邊。 */
  var H = [];
  H.push('<div class="stamp-card ' + r.stamp + '">');
  /* 他怎麼樣了。準的時候舉起手，比說的久的時候撐著膝蓋喘——
     那不是懲罰的表情，他只是走得比自己想的遠。 */
  H.push('<div class="stamp-who">' +
    pxTag(r.stamp === 'late' ? HERO.pant : HERO.win, HERO.pal, 'sw-px') + '</div>');
  H.push('<div class="stamp-mark">' + stampPx(s.key) + '</div>');
  H.push('<h1>' + esc(s.name) + '</h1>');
  H.push('<dl class="rep stage">');
  /* 承諾用小時／週說的話，r.est 存的是換算過的小數天（例如
     8 小時＝0.333…）——直接印會變成一串小數，看起來像壞了。
     estSay 印他原始講的數字跟單位（見 40-db.js）。「相差」只在
     兩邊同一個單位（天）的時候才有意義，小時/週承諾就不畫這格，
     不硬算一個「+0.667」出來誤導人。 */
  H.push('<dt style="--d:0ms">你的規劃</dt><dd style="--d:0ms">' + esc(estSay(r)) + '</dd>');
  H.push('<dt style="--d:260ms">實際</dt><dd style="--d:260ms">' + r.actual + ' 天</dd>');
  if (!r.estU || r.estU === 'd') {
    H.push('<dt style="--d:520ms">相差</dt><dd style="--d:520ms">' +
      (r.actual - r.est > 0 ? '+' : '') + (r.actual - r.est) + '</dd>');
  }

  /* 上一趟差幾天。「我在變好」這件事本來沒有任何地方說得出口，
     而它只需要兩個數字。不寫「比上一趟準」那種結論——
     兩個數字並排，結論他自己下。 */
  var prev = null;
  runsFor(t.teamId).forEach(function (x) {
    if (x.run.runId === r.runId) return;
    if (!x.run.stamp || !x.run.actual) return;
    if ((x.run.submittedAt || 0) >= (r.submittedAt || 0)) return;
    if (!prev || (x.run.submittedAt || 0) > (prev.submittedAt || 0)) prev = x.run;
  });
  if (prev) {
    /* 慢一拍。他讀完自己這一趟，才看到上一次的自己站在旁邊。 */
    H.push('<dt style="--d:900ms">上一趟相差</dt><dd class="dim" style="--d:900ms">' +
      (prev.actual - prev.est > 0 ? '+' : '') + (prev.actual - prev.est) + '</dd>');
  }

  /* 承諾的時候標的那幾段，跟實際比較久的那幾段，對到幾個。
     兩份資料本來就都在（flags 與 overs），只是從來沒有比對過。
     沒標過就整行不出現。

     ── 從這裡起是另一份清單 ──

     上面那四行是排過拍子進來的（見 .rep.stage）。底下這幾行沒有拍子，
     如果留在同一個 dl 裡，它們的 delay 是 0——會**比「上一趟相差」
     還早出現**，整個順序就亂了。

     所以在這裡收掉，另開一份。演出只給那四個數字，這幾行直接在。 */
  H.push('</dl>');
  H.push('<dl class="rep">');
  var fl = r.flags || [];
  if (fl.length) {
    var hit = 0;
    fl.forEach(function (i) { if ((r.overs || []).indexOf(i) >= 0) hit++; });
    H.push('<dt>標對的段</dt><dd>' + hit + '/ ' + fl.length + '</dd>');
  }
  var ov = (r.overs || []).map(function (i) { return stepName(r.runId, i); })
    .filter(Boolean);
  /* 本來是「上之前你說：訪談 比想的久」。「上之前」是舊的營火流程
     留下來的詞（上傳之前），沒用過的人看不懂；而「比想的久」擠在
     值後面，等於問題跟答案黏成一句。

     改成標籤問、值答：哪幾段比想的久 → 訪談、整理逐字稿。 */
  H.push('<dt>哪幾段比想的久</dt><dd class="s">' +
    (ov.length ? esc(ov.join('、')) : '都差不多') + '</dd>');
  if (r.hard) H.push('<dt>卡在哪裡</dt><dd class="s">' + esc(r.hard) + '</dd>');
  if (r.pace) H.push('<dt>你覺得的進度</dt><dd class="s">' + esc(r.pace) + '</dd>');
  H.push('</dl>');
  H.push(estBar(r.est, r.actual, false, estSay(r)));
  H.push('</div>');

  H.push('<p class="duel-t">' + esc(mob.n) + '讓開了。</p>');

  /* 「去圖鑑看看」那一句拿掉了——圖鑑那一頁不在主流程上，整個拿掉了。 */
  H.push(btn('回廊道', 'sawstamp:' + r.runId, 'big'));
  return H.join('');
};

/* ---------- 營火 ----------
   問的是他們自己清單上的哪一件比想的久。系統不列「卡關的原因」。 */

/* ---------- 封存 ----------

   走完一趟，那一趟的紀錄長成一張任務之證。形狀完全由那一趟決定：
   一天兩列，來過是實心、說了沒動是空心、沒有紀錄是斷的，
   長度就是這一趟過了幾天。

   這一頁真正給他的東西是「他沒見過的那個形狀」——同一份數字，
   換成一個看得到的樣子。取名選填，他不取一樣封存得下來。 */

/* 選方向那張小地圖拿掉了：占地那一下改在全班那張圖上做。
   地圖是動手的地方，不是一個看的頁面。 */

/* ---------- 大躍進 ---------- */
/* 大躍進那一頁退休了：「水晶變了」搬到班級地下城（那才是新的一層
   實際發生的地方），其餘只是一句「去看看那一層」。 */

/* ---------- 出口 ----------

   這一頁是整個系統唯一的結尾。它不打分、不總評，只把他自己留下的
   紀錄攤開來：每一趟說幾天走幾天、走過哪幾層、留下哪幾句。

   「規劃妥善」不是開門的條件，是走出去的時候帶著的東西——
   同一道門，不同的故事。 */
PAGES.exit = function () {
  var t = myTeam();
  var e = exitRecord(t.teamId);
  var out = !!t.leftAt;
  /* 早不算準（跟排行榜同一條規矩，見 68-rank.js）。 */
  var hit = e.acc.exact || 0;

  var H = [head(out ? '地面' : '出口',
    out ? '你出去了' : '這個專案做完了？',
    out ? '' : '把專案做完，說一聲。')];

  /* 離場的演出。角色沿著那道光往上走出畫面。

     這是一學期的終點，比任何一次交出去都重——而交出去有一整場戰鬥，
     出去本來只是換一頁。

     動畫只加東西不當閘門：時鐘被凍住的時候人停在井底，還是看得見。 */
  if (out) H.push(exitScene(t));

  if (out && t.exitWord) {
    H.push('<div class="card"><div class="eyebrow">老師說</div>' +
      '<p class="quote">' + nl(t.exitWord) + '</p></div>');
  }

  /* ── 一 · 你的估算 ──

     這一頁的主角。本來「準了幾次」埋在第一張卡的中段，而它是
     這個系統一整個學期在量的唯一一件事。 */
  if (e.acc.total) {
    H.push('<div class="card exsum">');
    H.push('<div class="eyebrow">你的估算</div>');
    H.push('<p class="ex-big"><b>' + e.acc.total + '</b> 趟裡，準了 <b>' +
      hit + '</b> 次</p>');
    H.push(accBar(e.acc));
    H.push('</div>');
  }

  /* 一個學期的形狀。一趟一個，說幾天 → 實際幾天。
     本來這裡有兩張卡在做同一件事：一張逐條畫尺，一張排記號架。 */
  H.push(runStrip(t, 1));

  /* ── 二 · 你走過的地方 ── */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">你走過的地方</div>');
  H.push('<div class="outnum">');
  H.push('<div><b>' + e.days + '</b><span>來過的天數</span></div>');
  H.push('<div><b>' + e.depth + '</b><span>走到第幾層</span></div>');
  /* 走了幾圈。六層一圈，第七趟回到第一層——
     無盡輪迴的設定在終點最該被說一次。 */
  if (e.cycles) H.push('<div><b>' + e.cycles + '</b><span>走過的輪迴</span></div>');
  H.push('</div>');
  if (e.zones.length) {
    H.push('<div class="zones">');
    e.zones.forEach(function (z) {
      var c = faunaOf(z.key)[0];
      H.push('<div class="zn ' + z.key + '">');
      if (c) H.push(pxTag(c.px, z.pal, 'zn-px'));
      H.push('<b>' + esc(z.name) + '</b>');
      H.push('</div>');
    });
    H.push('</div>');
  }
  H.push('</div>');

  /* ── 三 · 說一聲 ── */
  if (!out) {
    H.push('<div class="card">');
    H.push('<div class="eyebrow">說一聲</div>');
    H.push('<div class="row">');
    /* 這一頁只有在門開了之後進得來（廊道上那一扇鎖著），
       所以這裡就是最後那一下：上去。按的人是他們自己——
       走出去該是他們的動作，不是老師代勞的。 */
    H.push(btn('上去', 'leave', 'big'));
    H.push(btn('回廊道', 'go:home', 'ghost'));
    H.push('</div></div>');
  } else {
    H.push(btn('回廊道', 'go:home', 'ghost'));
  }
  return H.join('');
};

/* ---------- 走過的每一趟 ---------- */
/* 紀錄那一頁併進任務清單了：兩頁幾乎是同一份資料。
   下面那一支 logRow 留著——任務清單在用。 */
/* 一列一趟。牠在最左邊，資訊在右邊，點開才看細節。 */
function logRow(m, r, t) {
  if (!m) return '';
  var open = DRAFT.lg === r.runId;
  var z = STRATA[0];
  STRATA.forEach(function (q) { if (q.key === r.zone) z = q; });
  var mob = mobOfRun(r);
  var s = r.stamp ? RULES.STAMPS[r.stamp] : null;
  var kp = null;
  keepsOf(t.teamId).forEach(function (k) { if (k.runId === r.runId) kp = k; });

  /* 收起來的那一列本來還有一行「老師回的話」。字放大之後那一行只剩
     八個字加刪節號，而完整的那一句點開就在下面——所以不放了。 */

  /* 用 div 不用 button：<button> 上的 grid／flex 在 Chromium 不完整生效
     ——內容會被包進一個匿名區塊，第一個子元素因此被收縮成內容寬，
     標題就變成一個字一行。role 與 tabindex 補回鍵盤與輔助工具。 */
  var H = ['<div role="button" tabindex="0" class="rec pressable' + (open ? ' open' : '') + '" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'lgopen:' + r.runId })) + '\'>'];

  /* 直接排在格線上，不要再包一層。<button> 裡面包巢狀區塊的時候，
     第一個子元素會被收縮成內容寬（標題變成一個字一行）。 */
  H.push('<span class="rec-px">' + pxTag(mob.px, z.pal, '') + '</span>');
  H.push('<b class="rec-t">' + esc(m.title) + '</b>');
  /* 走的那幾天，以及老師排到哪一天。清單是他確認「還有哪幾件、
     哪一件先做」的地方，而老師排的那一天正是他排順序時要用的事實。 */
  H.push('<span class="rec-d">' + esc(dayText(r.committedAt)) +
    (r.submittedAt ? ' – ' + esc(dayText(r.submittedAt)) : '') +
    (m.due ? '<i class="rec-due">老師排到 ' + esc(dueSay(m)) + '</i>' : '') +
    '</span>');

  /* 有印章的顯示印章；沒有的那幾種狀態各自寫一句短的，
     不然那一格空著，完成跟進行中一眼分不出來。 */
  H.push('<span class="rec-s' + (r.stamp ? ' ' + r.stamp : ' none') + '">');
  if (s) {
    H.push(stampPx(s.key));
  } else {
    var st2 = r.state === 'submitted' ? '等老師'
      : r.state === 'back' ? '退回'
      : r.state === 'rethought' ? '重想'
      : r.state === 'running' ? '進行中'
      : '';
    if (st2) H.push('<i class="rec-st">' + st2 + '</i>');
  }
  H.push('</span>');
  H.push('</div>');

  /* 點開才出現的細節。收起來的時候整列兩秒看得完。 */
  if (open) {
    H.push('<div class="rec-more">');
    if (r.stamp) {
      H.push(estBar(r.est, r.actual, false, estSay(r)));
      H.push(dayStrip(t.teamId, r.runId));
    } else {
      H.push('<p class="dim">這一趟重新想過。說 ' + esc(estSay(r)) + '，走了 ' +
        (r.went || 0) + ' 天之後退回去重新說。</p>');
    }
    var sp = stepsOf(r.runId);
    if (sp) {
      /* 寫死「老師分的段」是錯的：stepsOf 先拿的是他們自己拆的那幾件
         （見 40-db.js），只有沒拆的時候才退回老師分的。 */
      H.push('<div class="tags small"><span class="k">' +
        (sp.from === 'mine' ? '你們拆的那幾件' : '老師分的段') + '</span>');
      sp.all.forEach(function (q, i) {
        H.push('<span class="tag static' + (sp.on.indexOf(i) >= 0 ? ' hit' : '') +
          '">' + esc(q) + '</span>');
      });
      H.push('</div>');
    }
    var ov = (r.overs || []).map(function (i) { return stepName(r.runId, i); })
      .filter(Boolean);
    if (ov.length) {
      H.push('<div class="tags small"><span class="k">比想的久</span>');
      ov.forEach(function (l) { H.push('<span class="tag static hit">' + esc(l) + '</span>'); });
      H.push('</div>');
    }
    /* 那一趟談過的話。他自己回頭看的時候，「我一個人說幾天」跟
       「談過之後訂幾天」是兩個不同的數字——而那個差距就是他在學的東西。 */
    H.push(negoLine(r, true));
    if (r.hard) H.push('<p class="quote"><b>卡在哪裡</b>' + nl(r.hard) + '</p>');
    if (r.pace) H.push('<p class="quote"><b>你覺得的進度</b>' + nl(r.pace) + '</p>');
    if (r.word) H.push(wordBlock(r, 'tw'));
    H.push('</div>');
  }
  return H.join('');
}

/* 點開／收起來。一次只開一列。 */
ACTS.lgopen = function (id) {
  DRAFT.lg = DRAFT.lg === id ? null : id;
  render();
};

/* ---------- 這一圈走到哪 ----------

   死線勇者的迴圈是四拍，而且它一直讓你知道現在是哪一拍。
   這裡四拍就是那四件事：承諾天數 → 進行任務 → 回報進度 → 完成紀錄。

   本來每一拍上面還掛一個世界觀的詞（準備／遠征／戰報／營地），
   底下再寫一次白話。同一件事講兩次，而先講的那一次是聽不懂的那一次。

   畫成環不是條：這座地下城是無盡輪迴的，四拍走完回到第一拍。
   所以它沒有百分比、沒有終點，也不可以有。 */
var BEATS = [
  { k: 'prep', s: '承諾天數' },
  { k: 'away', s: '進行任務' },
  { k: 'rep',  s: '回報進度' },
  { k: 'camp', s: '完成紀錄' }
];

/* 這一圈走到哪。

   本來最後一行是「其他狀態就看 claimsOf」，而 claimsOf 是一個
   只增不減的計數器——所以第一次完成之後，「承諾天數」那一拍
   永遠被畫成「完成紀錄」。每一拍現在都由狀態直接決定。 */
function beatAt(next, t) {
  var k = next.kind;
  if (k === 'doing') return 'away';
  if (k === 'submit' || k === 'stamped' || k === 'review') return 'rep';
  if (k === 'left' || k === 'waitexit') return 'camp';
  return 'prep';
}

function beatBar(next, t) {
  var at = beatAt(next, t);
  var H = ['<div class="cyc">'];
  BEATS.forEach(function (s, i) {
    H.push('<span class="cy' + (s.k === at ? ' on' : '') + '">' +
      '<b>' + esc(s.s) + '</b></span>');
    if (i < BEATS.length - 1) H.push('<span class="cyd"></span>');
  });
  /* 最後接回第一拍。走完不是結束，是再一圈。 */
  H.push('<span class="cyd loop"></span>');
  H.push('</div>');
  return H.join('');
}