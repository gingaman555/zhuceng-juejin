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
  var lo = Math.max(1, e - b), hi = e + b;
  var n = Math.min(30, Math.max(hi, a) + 1);

  var H = ['<div class="ebar">'];

  /* 上面：你自己說的 */
  H.push('<div class="eb-r"><b>承諾</b><div class="eb-c">');
  for (var i = 1; i <= n; i++) {
    H.push('<span class="eb' + (i >= lo && i <= hi ? ' band' : '') +
      (i === e ? ' pin' : '') + '"></span>');
  }
  H.push('</div><i>' + e + '</i></div>');

  /* 下面：實際走的。超出上面那個框的格子換色——那就是判定，不用寫字。 */
  H.push('<div class="eb-r"><b>' + (live ? '走到' : '實際') + '</b><div class="eb-c">');
  for (var j = 1; j <= n; j++) {
    var on = j <= a;
    var out = on && !live && (j > hi);
    H.push('<span class="eb' + (on ? ' on' : '') + (out ? ' out' : '') +
      (j >= lo && j <= hi ? ' band' : '') + '"></span>');
  }
  H.push('</div><i>' + a + '</i></div>');

  H.push('</div>');
  return H.join('');
}

/* ---------- 每一件一個顏色 ----------

   他們寫的那幾件事，名字可能是「訪談」也可能是「找工廠報價」——
   長度不一定，塞不進廊道上一格 44px 的位置。所以廊道上畫的是顏色，
   顏色對到哪一件在清單上讀一次就記得了。

   顏色照清單的順序給，不照內容——系統不知道「打樣」該是什麼顏色，
   也不該假裝知道。 */
var ACT_HUE = [
  '#E9B341', '#5FA8C7', '#7FA866', '#C77BA8', '#D9843F',
  '#8C7BC7', '#5AA88F', '#C7645F', '#9AA6B0', '#B8A05A'
];
function actHue(teamId, id) {
  var a = actsOf(teamId);
  for (var i = 0; i < a.length; i++) if (a[i].id === id) return ACT_HUE[i % ACT_HUE.length];
  return '#4A4038';
}

/* 清單本身就是圖例。看過一次就對得起來。 */
function actLegend(teamId, sel, act) {
  var a = actsOf(teamId);
  if (!a.length) return '';
  var H = ['<div class="alist">'];
  a.forEach(function (x, i) {
    var on = sel && sel.indexOf(x.id) >= 0;
    var tag = act ? 'button' : 'span';
    H.push('<' + tag + ' class="ac' + (on ? ' on' : '') + '"' +
      (act ? ' data-act="run" data-p=\'' +
        esc(JSON.stringify({ a: act + ':' + x.id })) + '\'' : '') + '>' +
      '<b style="background:' + ACT_HUE[i % ACT_HUE.length] + '"></b>' +
      esc(x.label) + '</' + tag + '>');
  });
  H.push('</div>');
  return H.join('');
}

/* 這一趟每一天動的是哪一件，排成一條。
   沒有清單的組就是一排腳印——那也是資訊：你來了幾天。 */
function dayStrip(teamId, runId) {
  var ids = actIdsOfRun(runId);
  if (!ids.length) return '';
  var H = ['<div class="dstrip">'];
  ids.forEach(function (id, i) {
    var lab = id ? actLabel(teamId, id) : '';
    H.push('<span class="ds" style="background:' +
      (lab ? actHue(teamId, id) : '#3A342C') + '" title="' +
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
    H.push('<div class="acc-c ' + k + '"><b>' + s.mark + '</b><i>' + acc[k] +
      '</i><span>' + esc(s.name) + '</span></div>');
  });
  H.push('</div>');
  return H.join('');
}
