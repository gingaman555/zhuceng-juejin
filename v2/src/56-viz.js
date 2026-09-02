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
function estBar(est, actual, live) {
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
  H.push('<span class="eb-say-n">說 <b>' + e + '</b></span>');
  H.push('<span class="eb-go-n">' + (live ? '走到' : '實際') + ' <b>' + a + '</b></span>');
  H.push('<span class="eb-u">天</span>');
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
  var H = ['<div class="shape">'];
  H.push('<span><b>' + s.est + '</b>你說的天數</span>');
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

/* 全班怎麼看這一個里程碑。匿名——只有天數，沒有誰是誰。
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


/* ---------- 承諾那一根尺 ----------

   「你前三趟」「別組怎麼看」「你要說幾天」量的都是天數。
   本來畫在三張卡上，使用者得自己在腦袋裡疊起來——
   那正是資訊圖像化應該替他做掉的事。全部畫在同一根尺上。

   看得出來的東西沒有一句話在解釋：
     你前幾趟的空心點是說的、實心點是實際的，線往右＝低估
     別組那一條帶子是他們說的範圍
     亮的那一條是你現在拉到的地方，淺色那一塊是準的範圍 */
function estAxis(est, past, sp) {
  var lo = RULES.EST_MIN, hi = RULES.EST_MAX, span = hi - lo;
  function at(d) {
    return ((Math.max(lo, Math.min(hi, d)) - lo) / span * 100) + '%';
  }
  var b = RULES.band(est);
  var H = ['<div class="axis">'];

  /* 滑桿。它跟下面每一列同寬、同起點——range 的滑塊圓心是從
     半個滑塊寬開始走的，所以下面那幾列一起往內縮同樣的距離。 */
  H.push('<input type="range" class="slider ax-slider" id="est" min="' +
    RULES.EST_MIN + '" max="' + RULES.EST_MAX + '" value="' + est +
    '" oninput="ACTS.est(this.value)">');
  H.push('<div class="ax-in">');

  /* 別組說的範圍。匿名，只有天數。 */
  if (sp) {
    H.push('<div class="ax-row ax-sp">');
    H.push('<div class="ax-band" style="left:' + at(sp.lo) + ';right:' +
      (100 - parseFloat(at(sp.hi))) + '%"></div>');
    H.push('<i class="ax-tag" style="left:' + at(sp.lo) + '">別組 ' +
      sp.n + ' 組</i>');
    H.push('</div>');
  }

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
