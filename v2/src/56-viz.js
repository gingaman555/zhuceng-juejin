/* 把數字畫出來。

   這個系統只有一件事要傳達：你說幾天、實際幾天、差多少。
   本來那件事是用一句話講的——

     「你承諾 5 天，實際花了 7 天。誤差 1 天以內算準（預估的 20％）。」

   那句話要讀完才知道發生什麼事，而且它把「範圍」這個概念用文字描述，
   讀的人得自己在腦袋裡把尺畫出來。那就畫出來給他看。

   兩條尺上下對齊：上面那條是你自己說的，範圍框出來；
   下面那條是實際走的。超出去的那幾格自己會是另一個顏色。
   看一眼就結束了，不用讀。 */

/* 一格一天的尺。

     est     承諾幾天
     actual  實際幾天（還沒交就傳 pushes，那條會邊走邊長）
     live    true 代表還在走，下面那條不畫判定色 */
function estBar(est, actual, live, sayLabel) {
  var e = Math.max(1, Number(est) || 1);
  var a = Math.max(0, Number(actual) || 0);
  var b = RULES.band(e);
  var lo = Math.max(0, e - b), hi = e + b;
  /* 尺畫到哪：準的範圍跟實際走的，誰遠畫到誰，再留一點餘地。 */
  var n = Math.max(hi, a) + Math.max(1, Math.round(e * 0.15));

  function at(d) { return Math.max(0, Math.min(100, d / n * 100)) + '%'; }

  var over = !live && a > hi;
  var H = ['<div class="ebar' + (over ? ' over' : '') + '">'];

  H.push('<div class="eb-track">');
  /* 準的範圍。淺色的一塊，實際那一段停在裡面就是準。 */
  H.push('<div class="eb-band" style="left:' + at(lo) +
    ';width:' + (Math.min(100, hi / n * 100) - Math.max(0, lo / n * 100)) + '%"></div>');
  /* 實際走了幾天。 */
  H.push('<div class="eb-go" style="width:' + at(a) + '"></div>');
  /* 你說的那一天。 */
  H.push('<div class="eb-say" style="left:' + at(e) + '"></div>');
  H.push('</div>');

  /* 兩個數字。它們是同一條尺上的兩個位置，所以並排寫。 */
  H.push('<div class="eb-n">');
  /* 尺畫的是天（見上面 e＝Math.max(1,…)，小時／週已經換算過又被夾到
     最少 1），可是「說」那個數字要印他原始講的——尺可以簡化成
     最少 1 天寬，文字不行，不然 8 小時會被印成一個看起來像「1 天」
     的謊。sayLabel 沒給的地方（沒有 r 可用）退回印 e，跟以前一樣。 */
  H.push('<span class="eb-say-n">說 <b>' + esc(sayLabel != null ? sayLabel : e + ' 天') + '</b></span>');
  H.push('<span class="eb-go-n">' + (live ? '走到' : '實際') + ' <b>' + a + ' 天</b></span>');
  H.push('</div>');

  H.push('</div>');
  return H.join('');
}

/* ---------- 每一件一個顏色 ----------

   老師分的那幾段，名字長度不一定，塞不進廊道上一格 44px 的位置。
   所以廊道上畫的是顏色，顏色對到第幾段，在清單上讀一次就記得了。

   顏色照段的順序給，不照內容——系統不知道「打樣」該是什麼顏色，
   也不該假裝知道。 */
var ACT_HUE = [
  '#E9B341', '#5FA8C7', '#7FA866', '#C77BA8', '#D9843F',
  '#8C7BC7', '#5AA88F', '#C7645F', '#9AA6B0', '#B8A05A'
];
function stepHue(i) {
  return i < 0 ? '#4A4038' : ACT_HUE[i % ACT_HUE.length];
}

/* 段的清單就是圖例。同一個元件當三種用：圖例、推進鍵、標記鍵。 */
function stepLegend(runId, sel, act) {
  var a = stepNames(runId);
  if (!a.length) return '';
  var H = ['<div class="alist">'];
  a.forEach(function (x, i) {
    var on = sel && sel.indexOf(i) >= 0;
    var tag = act ? 'button' : 'span';
    H.push('<' + tag + ' class="ac' + (on ? ' on' : '') + '"' +
      (act ? ' data-act="run" data-p=\'' +
        esc(JSON.stringify({ a: act + ':' + i })) + '\'' : '') + '>' +
      '<b style="background:' + stepHue(i) + '"></b>' +
      esc(x) + '</' + tag + '>');
  });
  H.push('</div>');
  return H.join('');
}

/* 這一趟每一天動的是哪一件，排成一條。
   沒有清單的組就是一排腳印——那也是資訊：你來了幾天。 */
function dayStrip(teamId, runId) {
  var ids = stepIdxOfRun(runId);
  if (!ids.length) return '';
  var H = ['<div class="dstrip">'];
  ids.forEach(function (id, i) {
    var lab = stepName(runId, id);
    H.push('<span class="ds" style="background:' + stepHue(id) + '" title="' +
      esc('第 ' + (i + 1) + ' 天' + (lab ? '　' + lab : '')) + '"></span>');
  });
  H.push('</div>');
  return H.join('');
}

/* 走過的每一趟，準度分布。三個數字，不加一句解讀。 */
function accBar(acc) {
  var H = ['<div class="acc">'];
  ['exact', 'early', 'late'].forEach(function (k) {
    var s = RULES.STAMPS[k];
    H.push('<div class="acc-c ' + k + '"><b>' + stampPx(s.key) + '</b><i>' + acc[k] +
      '</i><span>' + esc(s.name) + '</span></div>');
  });
  H.push('</div>');
  return H.join('');
}

/* 兩條尺的圖例。三個色塊就說完了，不用一句話解釋。 */
function barKey() {
  return '<div class="bkey">' +
    '<span><b class="k1"></b>你說的範圍</span>' +
    '<span><b class="k2"></b>實際走的</span>' +
    '<span><b class="k3"></b>超出去的</span>' +
    '</div>';
}

/* 這一趟的形狀。全部是數字，一句判斷都沒有——
   要怎麼讀是他自己的事，不是系統的。 */
function shapeLine(runId) {
  var s = runShape(runId);
  if (!s) return '';
  var run = find('Runs', function (x) { return x.runId === runId; });
  var H = ['<div class="shape">'];
  /* 小時／週承諾的話，s.est 是換算過的小數天——這裡跟其他量一樣是
     「數字＋一句描述」的格式，用 estSay 印回他原始講的樣子。 */
  if (run && run.estU && run.estU !== 'd' && run.estN != null) {
    H.push('<span><b>' + esc(estSay(run)) + '</b>你說的</span>');
  } else {
    H.push('<span><b>' + s.est + '</b>你說的天數</span>');
  }
  H.push('<span><b>' + s.elapsed + '</b>過了幾天</span>');
  H.push('<span><b>' + s.moved + '</b>你來過</span>');
  if (s.rested) H.push('<span><b>' + s.rested + '</b>你說沒動</span>');
  if (s.blank) H.push('<span class="blank"><b>' + s.blank + '</b>沒有紀錄</span>');
  if (s.stepsAll) H.push('<span><b>' + s.steps + '/' + s.stepsAll + '</b>勾掉的段</span>');
  H.push('</div>');
  return H.join('');
}

/* ---------- 這幾天你動過哪幾天 ----------

   每天要按的那一版拿掉之後，這一份資料本來就會不見。改成在交出去那一頁
   一次補齊：一格一天，點一下切換「動過／沒動」。

   它不進判定，所以標不標、標得準不準，都不會改變任何結果——
   也因此沒有說謊的理由。它唯一影響的是那一趟長成什麼樣子的岩心。 */
function dayGrid(runId) {
  var log = dayLog(runId);
  var H = ['<div class="dgrid">'];
  log.forEach(function (d, i) {
    var on = d && d.kind === 'move';
    H.push('<button class="dg' + (on ? ' on' : '') + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'mark:' + runId + '|' + i })) + '\'>' +
      '<b>' + (i + 1) + '</b></button>');
  });
  H.push('</div>');
  return H.join('');
}

/* 全班怎麼看這一個任務。匿名——只有天數，沒有誰是誰。
   要的是「我是不是低估了」，不是「誰比較快」。 */
function spreadBar(sp, mine) {
  var hi = Math.max(sp.hi, Number(mine) || 0, RULES.EST_MIN);
  var H = ['<div class="spread">'];
  for (var i = 1; i <= hi; i++) {
    var n = 0;
    sp.all.forEach(function (d) { if (d === i) n++; });
    H.push('<span class="sp-c' + (i === Number(mine) ? ' me' : '') + '">' +
      '<b style="height:' + (n ? 11 + n * 11 : 3) + 'px"></b>' +
      '<i>' + i + '</i></span>');
  }
  H.push('</div>');
  return H.join('');
}


/* 按一下之後只改這幾塊：大數字、兩顆鍵的明暗、尺上「你現在說的」
   那一列、底下走廊的格數、承諾那一顆上的天數。

   位置的算法要跟 estAxis 裡的 at() 完全一樣，不然按到一半會偏。
   不整頁重畫，是因為重畫會把焦點從那一顆鍵上拿走——連按第二下
   就得再瞄準一次。 */
/* ---------- 說幾天：兩顆鍵 ----------

   一按一天。到頭了那一顆就暗下去——不擋，只是讓他知道到頭了。
   數字在中間，是這一頁最大的一個字，因為它是這一頁唯一的內容。 */
/* ---------- 加減那兩顆 ----------

   ── 送出去的是「按完會變成幾」，不是「加幾」 ──

   本來送的是差值（estep:+1／estep:−1），而 ACTS.estep 拿差值去加在
   draft('est', RULES.EST_DEFAULT) 上面。問題是這一組鍵有三個地方在用，
   而那三個地方的起點都不是 EST_DEFAULT：

     承諾（有拆件）  起點是要徑算出來的
     學生回協商　　  起點是 r.est
     老師回一句　　  起點是 r.est

   那三頁畫出來的數字都對，可是 DRAFT.est 還是空的時候按下去，
   estep 會從 5 開始算——畫面上寫 8，按一下 ＋ 變成 6。

   改成送絕對值：按鍵自己知道「我按下去會變成幾」，因為它是從畫面上
   正在顯示的那個數字算出來的。這樣就沒有「起點是多少」這個問題了，
   三個地方都不必再各自記得要傳什麼。 */
function estStep(est) {
  function k(d, s, cls, off) {
    return '<button class="es-b ' + cls + (off ? ' off' : '') +
      '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'estep:' + estGo(est, d) })) + '\'>' + s + '</button>';
  }
  return '<div class="estep">' +
    k(-1, '−', 'es-m', est <= RULES.EST_MIN) +
    '<div class="es-n"><b>' + est + '</b><span>天</span></div>' +
    k(1, '＋', 'es-p', est >= RULES.EST_MAX) +
    '</div>';
}

/* 從 est 按一下 d 之後會停在幾。到頭就停在頭。 */
function estGo(est, d) {
  return clamp(RULES.EST_MIN, RULES.EST_MAX, (Number(est) || 0) + Number(d));
}

/* 單位切換 ＋ 承諾要按的那顆數字。老師排期限可以選小時／天／週
   （見 40-db.js 的 DUE_UNITS），學生承諾卻只有天——那個不對稱
   是 2026-09-23 的問題：老師派一件「8 小時」的事，學生卻只能說
   「1 天」，數字對不起來。EST_UNITS 是同一個概念放到學生這一邊。

   單位是「天」的時候，畫面跟按鍵完全沒變（estStep 原封不動）——
   這一支只在選了小時／週的時候換成一格數字輸入，避免動到
   estStep／estGo／estLive 那一整套已經被讀 200 輪、六組並行測過
   的邏輯。 */
function estStepU(est) {
  var u = DRAFT.estU || 'd';
  /* .tags／.tag 是全站在用的那組籤，跟老師排期限選單位同一套
     （見 70-teacher.js 的 DUE_UNITS 那一段）——不用另外開一組樣式。 */
  var H = ['<div class="tags">'];
  EST_UNITS.forEach(function (x) {
    H.push('<button class="tag' + (u === x.k ? ' on' : '') +
      '" data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'estunit:' + x.k })) +
      '\'>' + esc(x.name) + '</button>');
  });
  H.push('</div>');
  if (u === 'd') {
    H.push(estStep(est));
  } else {
    var uu = estUnit(u);
    var n = draft('estN', uu.def);
    H.push('<div class="estep"><input type="number" min="' + uu.min +
      '" max="' + uu.max + '" value="' + esc(n) +
      '" oninput="DRAFT.estN=this.value"><span class="es-raw-u">' + esc(uu.name) + '</span></div>');
  }
  return H.join('');
}

function estLive(n) {
  var lo = RULES.EST_MIN, hi = RULES.EST_MAX, span = hi - lo;
  function at(d) {
    return ((Math.max(lo, Math.min(hi, d)) - lo) / span * 100) + '%';
  }
  var b = RULES.band(n);
  function set(sel, fn) {
    var e = document.querySelector(sel);
    if (e) fn(e);
  }
  set('.es-n b', function (e) { e.textContent = n; });
  /* 這一支不重畫，是直接改 DOM——所以那兩顆鍵身上的「按下去會變成幾」
     也要跟著改，不然按第二下會再跑回同一個數字。 */
  function 鍵(e, cls, d, off) {
    e.className = 'es-b ' + cls + (off ? ' off' : '');
    e.setAttribute('data-p', JSON.stringify({ a: 'estep:' + estGo(n, d) }));
  }
  set('.es-m', function (e) { 鍵(e, 'es-m', -1, n <= RULES.EST_MIN); });
  set('.es-p', function (e) { 鍵(e, 'es-p', 1, n >= RULES.EST_MAX); });
  set('.ax-now .ax-ok', function (e) {
    e.style.left = at(n - b);
    e.style.right = (100 - parseFloat(at(n + b))) + '%';
  });
  set('.ax-now .ax-me', function (e) { e.style.left = at(n); });
  /* 「，出發」不能掉。這一支是直接改 textContent，而畫出來的是
     「我承諾 N 天，出發」——少寫那三個字的話，調過一次天數之後
     那顆鍵就從「出發」變成一句沒有動作的話。 */
  set('.cm-go', function (e) { e.textContent = '我承諾 ' + n + ' 天，出發'; });

  /* 「這個數字怎麼來的」那一句。他一改，那一句就要跟著改——
     不改的話畫面上寫 4 天、底下說這一趟是 2 天（見 60-student.js
     的 estWhy，兩邊讀同一支）。 */
  set('.es-why', function (e) {
    if (typeof estWhy === 'function' && DRAFT.plan && DRAFT.plan.length) {
      e.innerHTML = estWhy(DRAFT.plan, n);
    }
  });

  /* 底下那條走廊。整塊換掉沒關係——滑桿不在裡面。 */
  var ew = document.querySelector('.ew');
  if (ew && typeof myTeam === 'function') {
    var t = myTeam();
    var m = S.p && S.p.id ? msOf(S.p.id) : null;
    if (t && m) ew.innerHTML = estWalkIn(t, m, n);
  }
}

/* ---------- 承諾那一根尺 ----------

   「你前幾趟」跟「你要說幾天」量的是同一個單位。
   本來畫在兩張卡上，使用者得自己在腦袋裡疊起來——
   那正是資訊圖像化應該替他做掉的事。畫在同一根尺上。

   這裡本來還有第三條：別組在同一個任務上說了幾天。拿掉了。
   兩個理由，第二個比較重要：

     一 · 每一組的專案不一樣。「訪三個人」對兩組可能差三倍，
          別人的天數不構成參考。

     二 · 它會污染這個系統唯一在量的東西。那條帶子出現在按下承諾
          之前、就在滑桿正下方——看到「別組落在 4 到 8」再去拉自己
          那一根，拉出來的已經不是你的預估，是被錨定過的預估。
          整個作品的軸是「把被評價的對象換成自己的預估」；
          如果那個預估是抄來的，軸就空了。

   看得出來的東西沒有一句話在解釋：
     你前幾趟的空心點是說的、實心點是實際的，線往右＝低估
     亮的那一條是你現在拉到的地方，淺色那一塊是準的範圍 */
function estAxis(est, past) {
  var lo = RULES.EST_MIN, hi = RULES.EST_MAX, span = hi - lo;
  function at(d) {
    return ((Math.max(lo, Math.min(hi, d)) - lo) / span * 100) + '%';
  }
  var b = RULES.band(est);
  var H = ['<div class="axis">'];

  /* 滑桿拿掉了，換成上面那兩顆加減鍵（見 estStep）。
     這裡只剩看的部分：你前幾趟、你現在說的、準的範圍。 */
  H.push('<div class="ax-in">');


  /* 你前幾趟：空心＝說的，實心＝實際的。線往右就是低估。 */
  (past || []).forEach(function (x) {
    var e = x.run.est, a = x.run.actual || e;
    var l = Math.min(e, a), r = Math.max(e, a);
    H.push('<div class="ax-row ax-past">');
    H.push('<div class="ax-link" style="left:' + at(l) + ';right:' +
      (100 - parseFloat(at(r))) + '%"></div>');
    H.push('<b class="ax-said" style="left:' + at(e) + '"></b>');
    H.push('<b class="ax-was' + (a > e ? ' over' : '') + '" style="left:' +
      at(a) + '"></b>');
    H.push('</div>');
  });

  /* 你現在拉到的地方，跟準的範圍。 */
  H.push('<div class="ax-row ax-now">');
  H.push('<div class="ax-ok" style="left:' + at(est - b) + ';right:' +
    (100 - parseFloat(at(est + b))) + '%"></div>');
  H.push('<b class="ax-me" style="left:' + at(est) + '"></b>');
  H.push('</div>');

  /* 尺。只標三個數字，多了就變成一張表。 */
  H.push('<div class="ax-ruler">');
  [lo, Math.round((lo + hi) / 2), hi].forEach(function (d) {
    H.push('<i style="left:' + at(d) + '">' + d + '</i>');
  });
  H.push('</div>');

  H.push('</div></div>');
  return H.join('');
}

/* 「老師要去哪裡看」那一行怎麼畫。

   看起來像網址就畫成可以點的，其餘就是一行字。

   這是畫法，不是判斷——系統沒有因為它是不是網址而做任何不同的事，
   只是省老師一次複製貼上。這一行的內容對系統來說跟一段亂碼沒有差別
   （check.js 第九道守著這件事）。 */
/* ── 網址不一定是整串 ──

   本來的條件是「整串都是網址」才變成連結。可是學生寫的多半是
   「TronClass 第三次作業 https://…」或「雲端硬碟 / 第三組 https://…」
   ——有網址，可是整串不是網址，於是那一行完全不能點。

   改成在字裡面找。找到幾個就把哪幾個變成連結，其餘的字原樣留著。

   ── 為什麼還要一顆複製 ──

   老師那一邊真正要做的事是「把東西打開來看」。可點的連結解決一半，
   另一半是：他可能要貼到別的地方（貼進評語、貼給同事、貼到自己
   開著的那個分頁），而且有些瀏覽器把 target=_blank 擋掉。

   複製的是**第一個網址**（如果有的話），不是整串——他要貼的是位址，
   不是那一句話。整串沒有網址的時候才複製整句。 */
var WH_URL = /https?:[/][/][^\s，。、）)】」』]+/g;

function whereLine(v, copy) {
  var t = String(v || '').trim();
  if (!t) return '';
  var urls = t.match(WH_URL) || [];
  var H = [];
  if (urls.length === 1 && urls[0] === t) {
    H.push('<a class="wh-link" href="' + esc(t) + '" target="_blank" rel="noopener">' +
      esc(t) + '</a>');
  } else {
    /* 從頭走一遍，走到哪裡接到哪裡。

       本來是「先整段跳脫，再一個一個 split／join 換掉」，那個做法會壞在
       兩種學生真的會寫出來的東西上：

         同一個網址寫兩次　　urls 裡就有兩筆一樣的，第二輪會把第一輪
                             already 做好的 <a> 內容再包一次 → 標籤爛掉
         一個是另一個的開頭　「…/abc」跟「…/abc/x」，換短的那一次會
                             連長的那一個的前半段一起吃掉 → 老師點下去
                             會去到資料夾，不是他要看的那一份

       走一遍就沒有這兩件事：每一段字只被處理一次，換過的地方不再回頭看。 */
    var html = '';
    var last = 0, m;
    WH_URL.lastIndex = 0;
    while ((m = WH_URL.exec(t))) {
      html += esc(t.slice(last, m.index)) +
        '<a class="wh-link" href="' + esc(m[0]) + '" target="_blank" rel="noopener">' +
        esc(m[0]) + '</a>';
      last = m.index + m[0].length;
    }
    html += esc(t.slice(last));
    H.push('<p class="wh-txt">' + html + '</p>');
  }
  if (copy) {
    /* 要複製的字放在屬性裡，不走 data-p。

       data-p 是單引號包住的 JSON，而 esc() 不跳脫單引號——學生在
       那一格打一個 ' 就會把按鈕拆掉。雙引號的屬性沒有這個問題
       （esc 有跳脫 "）。 */
    H.push('<button class="btn ghost wh-copy" data-act="copy" data-copy="' +
      esc(urls[0] || t) + '">' + (urls[0] ? '複製連結' : '複製這一句') + '</button>');
  }
  return H.join('');
}
