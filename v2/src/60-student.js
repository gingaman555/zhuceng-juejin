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
  }
  okPend.forEach(function (r) {
    var m = msOf(r.msId);
    H.push('<div class="okcard">');
    H.push('<div class="eyebrow lit">老師勾了</div>');
    H.push('<b class="ok-big">確認已完成任務，你的專案又在前進了一頁</b>');
    H.push('<em class="ok-sub">完成進度已疊加至班級地下城內</em>');
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
    /* 拿到幾枚。基本的做完就有，後面那幾枚是老師多說的。 */
    var cb = Math.max(RULES.COIN.bonusMin, Number(r.bonus) || RULES.COIN.bonusMin);
    H.push('<div class="coingot">＋' + (RULES.COIN.base + cb) + ' 枚金幣' +
      '<span>' + RULES.COIN.base + ' 是完成的，' + cb + ' 是他多給的</span></div>');
    H.push(regCard('新拿到', (m ? m.title : '那一趟'), '任務之證已收錄在圖鑑',
      pxTag((kk && kk.px) || coreOf(r.runId), (kz || zoneNow(t.teamId)).pal, 'reg-px core'),
      false));
    /* 他那一句話擺在最下面，而且是這一整張上唯一的人話。 */
    if (r.word) H.push('<p class="quote big">' + nl(r.word) + '</p>');
    H.push('</div>');
  });
  if (okPend.length) {
    H.push(btn('回廊道', 'okgot', 'big'));
    H.push('</div>');
  }

  /* 三扇門。本來在整頁最底下、在走過的那一條帶子後面——它們是
     「這個世界裡有什麼」，不是「我剛剛做了什麼」，放在最後等於
     要滑到底才看得到。 */
  H.push(deskRow(t, next));

  /* 這一圈走到哪。死線勇者一直讓你知道現在是專注還是休息，
     那個迴圈才會上癮。 */
  H.push(beatBar(next, t));

  /* ── 自己那條廊道 ──

     打開來第一眼要是不用學就懂的東西。廊道不用學：一條走廊、
     一個人走在上面、水從後面漫過來。地圖要讀得懂得先知道三條規則
     （一格＝一趟、顏色＝哪一組、亮的可以點），而這個系統一學期
     只在那張圖上動八次，它沒有機會被學會。所以圖回到全班那一頁。 ── */
  H.push(scene(t, next.row, st, next.kind));
  if (r) H.push(stepRow(r.runId));

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
  /* 「還有 N 個在等」拿掉了：正在做的那一張卡裡已經寫著
     「老師又派了 N 個。做完這一趟才輪到。」——同一件事，前後兩行。
     留下的是說得比較清楚的那一句。 */

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
        '　說 ' + r.est + '　實際 ' + (r.actual || 0) + ' 天') + '">');
    H.push(pxTag(mob ? mob.px : [], z.pal, 'rs-px'));
    H.push('<span class="rs-s">' + stampPx(r.stamp) +
      '<i>' + r.est + '<u>→</u>' + (r.actual || 0) + '</i></span>');
    H.push('</button>');
  });
  H.push('</div></div>');
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
  H.push('<button class="dk lit" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'go:codex' })) + '\' title="' +
    esc(cnSay) + '">' +
    pxTag(ICONS.codex, ICON_ON, '') + '<i>圖鑑</i>' +
    (cn ? '<em class="nb">' + cn + '</em>' : '') + '</button>');
  /* 故事。第一次進來看過一次，之後從這裡回來看。

     放在圖鑑旁邊是因為它們是同一種東西：都不是「要你做的事」，
     都是「這個世界是什麼」。而它一直在——沒觸發過的東西等於不存在，
     一個看過就消失的開場，等於他忘了之後再也找不回來。 */
  H.push('<button class="dk" data-act="run" data-p=\'' +
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
  if (t.exitOk) {
    H.push('<button class="dk lit" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'go:exit' })) + '\' title="' +
      esc('出口：老師開了，從這裡上去') + '">' +
      pxTag(ICONS.log, ICON_ON, '') + '<i>出口</i></button>');
  } else {
    H.push('<div class="dk shut" title="' +
      esc(t.exitAsk ? '出口：說了，在等老師開' : '出口：鎖著') + '">' +
      pxTag(ICONS.log, ICON_PAL, '') + '<i>出口</i></div>');
  }
  H.push('</div>');
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
    H.push(btn('要花幾天', 'go:commit:' + row.ms.msId, 'big'));

  } else if (next.kind === 'doing') {
    H.push(doingCard(t, row, st));
    /* 老師又派了幾個。小小地說一聲就好——手上這一趟做完才輪到它們。 */
    if (next.more) {
      H.push('<p class="dim">老師又派了 ' + next.more + ' 個。做完這一趟才輪到。</p>');
    }

  } else if (next.kind === 'stamped') {
    H.push(btn('看準不準', 'go:stamp:' + row.run.runId, 'big'));

  } else if (next.kind === 'back') {
    /* 老師退回來了——牠站起來了。那不是懲罰：那一趟的兩個數字在他
       交出去的當下就定了，退回不動判定也不動深度。站起來講的只有
       一件事：那份成果還沒被收下。 */
    /* 老師退回來了。他的話放大——那是這一刻唯一要讀的東西，
       而且退回一定帶著話（沒寫理由的退回擋在資料層）。 */
    /* 眉標拿掉了：上面那一行已經寫著「退回來了」。
       這裡剩下的是他的那一句話——那才是這一刻唯一要讀的東西。 */
    if (row.run.word) H.push('<p class="quote big">' + nl(row.run.word) + '</p>');
    /* 本來這裡直接再交一次，不用重答。但牠在廊道上站起來了，
       而「牠站著」跟「按一顆鍵就過去」是兩件互相矛盾的事。
       改成走同一條路：再打一次，答完再交。 */
    H.push(btn('再打一次', 'go:battle:' + row.run.runId, 'big'));

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
  H.push(btn('做完了', 'go:battle:' + r.runId, 'big'));
  /* 做到一半發現自己說少了，可以改。

     這條路本來只從戰鬥裡進得去，而且語氣是逃跑——一個學生在第三天
     發現說少了，得先按「做完了」進戰鬥再逃出來，那不是他會想做的動作。

     代價不用另外設計：走過的那幾天留在紀錄上（說 5、走了 3、重新想過），
     看得見，但不扣任何東西。改承諾不是失準，那是兩件事。 */
  H.push(btn('改一次承諾', 'redo:' + r.runId, 'ghost'));
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
  var H = [head('專案名', '這個專案叫什麼', '')];
  H.push('<div class="card"><div class="fa-in">');
  H.push(pxTag(sg.px, sg.pal, 'fa-px'));
  H.push('<div>');
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
function previewSteps(m) { return (m && m.steps) || []; }

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
    DRAFT.plan = previewSteps(m).map(function (x) { return { n: x, d: 1 }; });
  }
  var plan = DRAFT.plan;
  /* 列了就是加起來，沒列就直接說一個數字。永遠只有一個地方在輸入。 */
  var est = plan.length ? planDays(plan)
    : Number(draft('est', RULES.EST_DEFAULT));
  var flags = DRAFT.flags || [];

  /* 兩個階段共用這一頁：先說幾天，再選去哪裡。
     分岔放在這裡，前面那幾行（plan／est）兩邊都要用。 */
  if (DRAFT.at === 'where') return wherePanel(t, m, est);

  var H = [head('這一件的委託人', m.title, m.note)];

  /* ── 委託人 ──

     他在這裡就出現，不是走到那一天才看到——他是要這件事的人，
     任務出現的那一刻他就存在了。

     「這次的委託人竟然長這樣」是這一頁最該發生的事。 */
  var pat = mobFor(m.msId, t.teamId);
  if (pat) {
    var pz = mobZone(pat);
    H.push('<div class="card patron ' + pz.key + '">');
    H.push(pxTag(pat.px, pz.pal, 'pat-px'));
    H.push('<div class="pat-t"><b>' + esc(pat.n) + '</b>');
    H.push('<em>' + esc(pat.t) + '</em>');
    H.push('<u>' + RULES.COIN.base + ' 枚金幣</u></div>');
    H.push('</div>');
  }

  /* 兩顆鍵先，底下那根尺跟走廊都跟著它動。 */
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
  /* 列了就顯示加起來的，沒列才給那兩顆鍵。 */
  if (plan.length) {
    H.push('<div class="estep"><div class="es-n sum"><b>' + est +
      '</b><span>天</span></div></div>');
  } else {
    H.push(estStep(est));
  }

  /* 決定的時候要看的東西全部畫在同一根尺上：你前幾趟說了幾天、
     實際幾天，別組這一件事說的範圍，還有準的範圍。

     本來是三張卡——三張卡量的是同一個單位，等於叫使用者自己
     在腦袋裡把它們疊起來。 */
  var past = runsFor(t.teamId).filter(function (x) { return x.run.stamp; }).slice(-3);
  H.push(estAxis(est, past.reverse()));
  /* 拉到幾就亮幾格，擋路的那一隻站在盡頭。
     承諾是這裡唯一有阻力的選擇，它不該長得像填表。 */
  H.push(estWalk(t, m, est));
  H.push('</div>');

  /* ── 你要做哪幾件，每一件幾天 ──

     老師可以只丟一個大任務，拆的人是要做的那一個。他寫過分段的話
     那幾行就是起點；沒寫就是一張白紙。

     每一件預設一天，所以加一件一定會動到上面那個數字——
     加了東西畫面沒反應是最容易讓人以為壞掉的事。 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">你要做哪幾件</div>');
  if (plan.length) {
    H.push('<div class="plist">');
    plan.forEach(function (x, i) {
      H.push('<div class="pl">');
      H.push('<b style="background:' + stepHue(i) + '"></b>');
      H.push('<i>' + esc(x.n) + '</i>');
      H.push('<button class="pd" data-act="run" data-p=\'' +
        esc(JSON.stringify({ a: 'pland:' + i + ',-1' })) + '\'>−</button>');
      H.push('<u>' + x.d + '</u>');
      H.push('<button class="pd" data-act="run" data-p=\'' +
        esc(JSON.stringify({ a: 'pland:' + i + ',1' })) + '\'>＋</button>');
      H.push('<button class="px-del" data-act="run" data-p=\'' +
        esc(JSON.stringify({ a: 'plandel:' + i })) + '\' title="' +
        esc('拿掉這一件') + '">×</button>');
      H.push('</div>');
    });
    H.push('</div>');
  }
  H.push('<input id="pl-add" placeholder="' +
    esc(plan.length ? '再一件，按 Enter' : '例：找到人　→ 按 Enter') +
    '" onkeydown="if(event.key===\'Enter\'){event.preventDefault();ACTS.planadd(this.value);}">');
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

  /* 你有多確定。

     不是選填——這一格是這套系統唯一在教的東西：不是估得準，
     是知不知道自己什麼時候估不準（見 20-rules.js 的 RULES.SURE）。

     它不進判定。它決定的是廊道上你看得到多遠，以及之後那一句
     「你說『很確定』的 N 次裡，準了 M 次」。 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow' + (DRAFT.sure ? '' : ' lit') + '">對這個天數，你有多確定</div>');
  H.push('<div class="row sure-row">');
  RULES.SURE.forEach(function (s) {
    H.push(btn(s.name, 'sure:' + s.key, 'sure' + (DRAFT.sure === s.key ? ' on' : '')));
  });
  H.push('</div>');
  H.push('<p class="dim">它不影響判定。它決定這一趟你看得到多遠。</p>');
  H.push('</div>');

  H.push('<div class="row">');
  H.push(btn('我承諾 ' + est + ' 天', 'towhere', 'big cm-go'));
  H.push(btn('回廊道', 'go:home', 'ghost'));
  H.push('</div>');
  return H.join('');
};

/* ---------- 這一趟要去哪裡 ----------

   承諾完天數，出發之前。同一頁的第二個階段，不是另一頁——go() 會清掉
   DRAFT，而他剛拆完的細項與天數都在上面。

   六個地方一直都在，誰都去得了，去過的也可以再去。選哪裡不影響任何
   數字（判定只讀承諾幾天與實際幾天），所以這一步沒有好壞——
   它是這個流程裡第二個純粹屬於他的決定。

   每個地方住著不同的東西，所以他其實同時在選這一趟要遇到誰。 */
function wherePanel(t, m, est) {
  var H = [head('這一趟去哪裡', m.title, '')];

  H.push('<div class="card">');
  H.push('<div class="eyebrow">你說了 ' + est + ' 天</div>');
  H.push('<p class="dim">六個地方都去得了，去過的也可以再去。選哪裡不會影響判定——' +
    '判定只看你說幾天、實際幾天。</p>');
  H.push('</div>');

  H.push('<div class="wsix">');
  STRATA.forEach(function (z) {
    var f = faunaOf(z.key);
    H.push('<button class="wz ' + z.key + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'commit:' + m.msId + '|' + z.key })) + '\'>');
    /* 先看到那個地方，才看到它叫什麼。選地方是這個流程裡第二個純粹
       屬於他的決定，而本來六張卡只差一個顏色——那樣他其實是在選名字。 */
    H.push('<span class="wz-p">' + placeArt(z, '') + '</span>');
    H.push('<span class="wz-b">');
    H.push('<span class="wz-t"><b>' + esc(z.name) + '</b>');
    H.push('<em>' + esc(z.note) + '</em></span>');
    /* 住在這裡的那幾隻。他在選地方，也是在選這一趟要遇到誰。 */
    if (f.length) {
      H.push('<span class="wz-f">');
      f.slice(0, 4).forEach(function (c) { H.push(pxTag(c.px, z.pal, '')); });
      H.push('</span>');
    }
    H.push('</span>');
    H.push('</button>');
  });
  H.push('</div>');

  H.push(btn('回去改天數', 'toplan', 'ghost'));
  return H.join('');
}

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

/* ---------- 判定結果 ---------- */
PAGES.stamp = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var s = RULES.STAMPS[r.stamp];

  var t = myTeam();
  /* 剛走完的那一層。判定當下深度就 +1 了，所以要退一格。 */
  var zone = strataAt(Math.max(0, depthOf(t.teamId) - 1), t.teamId);
  var mob = mobOfRun(r);

  /* 戲在戰鬥那一頁演完了，這裡只留報告。
     再演一次是重複，而且那一層閃光在動畫被凍住的時候會蓋成一片白。 */
  var H = [];
  H.push('<div class="stamp-card ' + r.stamp + '">');
  /* 他怎麼樣了。準的時候舉起手，比說的久的時候撐著膝蓋喘——
     那不是懲罰的表情，他只是走得比自己想的遠。 */
  H.push('<div class="stamp-who">' +
    pxTag(r.stamp === 'late' ? HERO.pant : HERO.win, HERO.pal, 'sw-px') + '</div>');
  H.push('<div class="stamp-mark">' + stampPx(s.key) + '</div>');
  H.push('<h1>' + esc(s.name) + '</h1>');
  H.push('<dl class="rep">');
  H.push('<dt>你的規劃</dt><dd>' + r.est + '</dd>');
  H.push('<dt>實際</dt><dd>' + r.actual + '</dd>');
  H.push('<dt>相差</dt><dd>' + (r.actual - r.est > 0 ? '+' : '') +
    (r.actual - r.est) + '</dd>');

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
    H.push('<dt>上一趟相差</dt><dd class="dim">' +
      (prev.actual - prev.est > 0 ? '+' : '') + (prev.actual - prev.est) + '</dd>');
  }

  /* 承諾的時候標的那幾段，跟實際比較久的那幾段，對到幾個。
     兩份資料本來就都在（flags 與 overs），只是從來沒有比對過。
     沒標過就整行不出現。 */
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
  H.push(estBar(r.est, r.actual, false));
  H.push('</div>');

  H.push('<p class="duel-t">' + esc(mob.n) + '讓開了。</p>');

  /* 「去圖鑑看看」那一句拿掉了——圖鑑那一頁不在主流程上，整個拿掉了。 */
  H.push(btn('好', 'skipcamp:' + r.runId, 'big'));
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
/* 大躍進那一頁退休了：「石頭變了」搬到班級地下城（那才是新的一層
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
  var H = ['<div role="button" tabindex="0" class="rec' + (open ? ' open' : '') + '" data-act="run" data-p=\'' +
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

  H.push('<span class="rec-s' + (r.stamp ? ' ' + r.stamp : ' none') + '">' +
    (s ? stampPx(s.key) : '') + '</span>');
  H.push('</div>');

  /* 點開才出現的細節。收起來的時候整列兩秒看得完。 */
  if (open) {
    H.push('<div class="rec-more">');
    if (r.stamp) {
      H.push(estBar(r.est, r.actual, false));
      H.push(dayStrip(t.teamId, r.runId));
    } else {
      H.push('<p class="dim">這一趟重新想過。說 ' + r.est + ' 天，走了 ' +
        (r.went || 0) + ' 天之後退回去重新說。</p>');
    }
    var sp = stepsOf(r.runId);
    if (sp) {
      H.push('<div class="tags small"><span class="k">老師分的段</span>');
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
    if (r.hard) H.push('<p class="quote"><b>卡在哪裡</b>' + nl(r.hard) + '</p>');
    if (r.pace) H.push('<p class="quote"><b>你覺得的進度</b>' + nl(r.pace) + '</p>');
    if (r.word) H.push('<p class="quote tw">' + nl(r.word) + '</p>');
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