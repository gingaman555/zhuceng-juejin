/* 岩心架。

   走完一趟會長出一根岩心（見 43-core.js）。這一頁是它們排在一起的地方。

   這一頁前後改過三次，方向差很多：老師發裝備 → 隨機三件挑一件 →
   三張事實挑一張 → 現在。前三次都失敗在同一件事上——那個「東西」是我
   發的，跟他那一週沒有關係，所以挑不挑、留哪一件，對他都沒有差別。

   為什麼收集這件事現在站得住——它不是徽章，是樣本：

     · 每一根指向一個具體、不會再發生的那一週
     · 形狀由那一趟自己決定，沒有兩根一樣，而且那個不同是他造成的
     · 不可能再拿到同一根
     · 二十根排在一起會變成一根說不出來的東西：一個學期的形狀

   刻意沒有的東西：總數、進度、缺哪幾根。
   一趟長一根，本來就不會有缺的——沒有東西需要被填滿，
   所以也沒有人會為了填滿它多做一件事。

   遊戲化在這裡的位置是「吸引他打開」，不是「換到好處」。
   一根岩心不加速、不擋失準、不換任何東西。 */

PAGES.pack = function () {
  var t = myTeam();
  /* 老師派過的每一件事，各自走到哪。包含還沒承諾的，
     所以它是「清單」不只是「紀錄」。 */
  var rows = runsFor(t.teamId).slice().reverse();
  /* 重新想過的那幾趟也是紀錄——它們確實發生過，只是沒有判定。 */
  where('Runs', function (r) { return r.teamId === t.teamId && r.state === 'rethought'; })
    .forEach(function (r) { rows.push({ ms: msOf(r.msId), run: r }); });

  var H = [head('任務清單', '老師派過的每一件事', '')];

  if (!rows.length) {
    H.push('<div class="card dim">老師還沒派過任何一件事。</div>');
    H.push(btn('回廊道', 'go:home', 'ghost'));
    return H.join('');
  }

  /* 準度總表。本來在「紀錄」那一頁上——那一頁跟這一頁幾乎是同一份資料，
     併過來之後這裡是唯一一個看得到自己走過幾趟、準了幾次的地方。 */
  var acc = accuracyOf(t.teamId);
  if (acc.total) {
    H.push('<div class="card quiet"><div class="eyebrow">走過 ' + acc.total + ' 趟</div>');
    H.push(accBar(acc));
    H.push('</div>');
  }

  H.push(coreCard());

  H.push('<div class="card"><div class="rec-list">');
  rows.forEach(function (x) { H.push(logRow(x.ms, x.run, t)); });
  H.push('</div></div>');

  H.push(btn('回廊道', 'go:home', 'ghost'));
  return H.join('');
};

/* 一列＝一件事。狀態、你說幾天、實際幾天、那一趟叫什麼。

   數字靠右對齊，因為「說幾天」跟「實際幾天」是要被互相比較的——
   這一頁順便就是他們自己的估算史。 */
function taskRow(m, r, t) {
  if (!m) return '';
  var st = TASK_STATE[r.state] || TASK_STATE.fresh;
  var H = ['<div class="tk ' + (r.stamp || '') + '">'];

  H.push('<div class="tk-h">');
  H.push('<i class="tk-s ' + st.k + '">' + esc(st.n) + '</i>');
  H.push('<b>' + esc(m.title) + '</b>');
  H.push('</div>');

  /* 說幾天 → 實際幾天。還沒交的那幾趟只有左邊那個數字。 */
  if (r.est) {
    H.push('<div class="tk-n">');
    H.push('<span>你說</span><b>' + r.est + '</b>');
    if (r.actual) { H.push('<span>實際</span><b class="' + (r.stamp || '') + '">' +
      r.actual + '</b>'); }
    else if (r.went) { H.push('<span>走了</span><b>' + r.went + '</b>'); }
    else if (r.state === 'running') {
      var gone = daysBetween(r.committedAt, now());
      H.push('<span>過了</span><b>' + gone + '</b>');
    }
    H.push('<span class="tk-u">天</span>');
    H.push('</div>');
  }

  /* 封存過的那一趟：名字跟那一根岩心。
     岩心終於有出處了——它掛在它自己那一趟旁邊。 */
  var kp = null;
  keepsOf(t.teamId).forEach(function (k) { if (k.runId === r.runId) kp = k; });
  if (kp) {
    var z = STRATA[0];
    STRATA.forEach(function (x) { if (x.key === kp.zone) z = x; });
    /* 點得開：那一根怎麼讀（一天兩格、實心＝來過、空心＝說沒動、
       破的＝沒有紀錄）在 coreCard 裡面。 */
    H.push('<button class="tk-k" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'core:' + kp.keepId })) + '\'>');
    H.push(pxTag(kp.px || coreOf(kp.runId), z.pal, 'core'));
    H.push('<span>' + esc(kp.name || '（沒取名）') + '</span>');
    H.push('</button>');
  }

  H.push('</div>');
  return H.join('');
}

/* 每一種狀態一句人話。沒有一句在講「你做得好不好」。 */
var TASK_STATE = {
  fresh:     { k: 'wait', n: '還沒說幾天' },
  running:   { k: 'go',   n: '正在做' },
  judged:    { k: 'go',   n: '交出去了' },
  submitted: { k: 'go',   n: '在老師那邊' },
  approved:  { k: 'ok',   n: '老師勾了' },
  done:      { k: 'ok',   n: '走完了' },
  rethought: { k: 'wait', n: '重新想過' }
};

