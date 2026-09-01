/* ---------- 排行榜 ----------

   這一支是刻意加進來、而且準備好隨時拿掉的。

   作品原本的立場是不排名（見 check.js 的禁用詞）。使用者以 RtD
   （research through design）為方法決定要做：東西做出來、放進去用、
   看實際發生什麼；評價不好就拿掉，而「拿掉」本身也是一個發現。

   要拿掉的話：刪掉這個檔案與 58-rank.css，再把 62-eco.js 裡那一行
   rankCard(...) 拿掉就好。沒有別的地方依賴它。

   ── 排什麼 ──

   排產出量會直接壞掉：做得多的組永遠在上面，而做得多跟做得好、跟
   專案管理學得如何都沒有關係，那只會獎勵灌水與過勞。

   這裡排的是「估得準不準」，因為它是這個系統裡唯一非零和的量：
     · 估準跟做多做少無關
     · 每一組可以同時很準——它不是有人上去就有人下來
     · 而且它正是這個系統在教的東西

   ── 為什麼是偏差率不是天數 ──

   用「準的範圍」判定會有一個漏洞：容差是 承諾 × 比例，所以把承諾灌大
   就自動變準。用偏差率（|實際 − 承諾| ÷ 承諾）就沒有這個問題——
   說 21 天做 3 天，偏差率是 86%，很難看。

   ── 三個護欄 ──

   一 · 只算最近三趟。名次要會流動，落後的追得上；算整學期的話
        前面幾趟失手的組就再也翻不了身，那正是排行榜最傷人的地方。
   二 · 可以自己選擇不上榜。自主性優先於排名。
   三 · 沒有分數、沒有獎勵、不影響任何判定。它純粹是一面鏡子。 */

var RANK_N = 3;   /* 只算最近三趟 */

/* 一組的平均偏差率。沒有判定過的趟就回 null。 */
function rankDev(teamId) {
  var rs = where('Runs', function (r) {
    return r.teamId === teamId && r.stamp && r.est > 0 && r.actual > 0;
  }).sort(function (a, b) { return (a.submittedAt || 0) - (b.submittedAt || 0); });
  if (!rs.length) return null;
  var use = rs.slice(-RANK_N);
  var sum = 0, hit = 0;
  use.forEach(function (r) {
    sum += Math.abs(r.actual - r.est) / r.est;
    if (r.stamp !== 'late') hit++;
  });
  /* hit 是寫出來給人看的：準了幾次。加法的講法——
     「你拿到了什麼」，不是「你錯了多少」。
     dev 只留著當平手時分先後，不寫出來。 */
  return { hit: hit, dev: sum / use.length, n: use.length };
}

/* 一個班的榜。沒有資料的排在最後，選擇不上榜的整個不出現。 */
function rankRows(classId) {
  var out = [];
  where('Teams', function (t) { return t.classId === classId; }).forEach(function (t) {
    if (t.noRank) return;
    var d = rankDev(t.teamId);
    out.push({ teamId: t.teamId, name: t.name, dev: d ? d.dev : null,
      hit: d ? d.hit : 0, n: d ? d.n : 0 });
  });
  /* 先比準了幾次（多的在上面），平手才用偏差率分先後。
     平手會很多，那是好事——它讓這張榜比較不像一條隊伍。 */
  out.sort(function (a, b) {
    if (a.dev === null && b.dev === null) return 0;
    if (a.dev === null) return 1;
    if (b.dev === null) return -1;
    if (a.hit !== b.hit) return b.hit - a.hit;
    return a.dev - b.dev;
  });
  return out;
}

/* 上不上榜自己決定。 */
ACTS.norank = function () {
  var t = myTeam();
  t.noRank = t.noRank ? 0 : 1;
  save();
  say(t.noRank ? '不上榜了。' : '上榜了。');
};

function rankCard(classId, meId) {
  var rows = rankRows(classId);
  var me = meId ? teamOf(meId) : null;
  var has = rows.some(function (r) { return r.dev !== null; });

  var H = ['<div class="card rank">'];
  H.push('<div class="eyebrow">估得準　·　最近 ' + RANK_N + ' 趟</div>');
  /* 單位只在這裡說一次。
     本來每一列寫的是偏差率（13%、100%），沒有人那樣想事情——
     而且 100% 看起來像世界末日，其實只是「說 5 天走了 10 天」。 */
  H.push('<p class="rk-u">最近三趟，準了幾次</p>');

  if (!has) {
    H.push('<p class="dim">還沒有人交過。</p>');
    H.push('</div>');
    return H.join('');
  }

  H.push('<div class="rk-list">');
  rows.forEach(function (r, i) {
    var mine = r.teamId === meId;
    H.push('<div class="rk-r' + (mine ? ' mine' : '') + (r.dev === null ? ' none' : '') + '">');
    H.push('<i class="rk-i">' + (r.dev === null ? '·' : (i + 1)) + '</i>');
    H.push('<b>' + esc(shortName(r.name)) + '</b>');
    if (r.dev === null) {
      H.push('<span class="rk-d">還沒交過</span>');
    } else {
      /* 三顆點：準了幾次。實心是準的，空心是還沒。
         畫成點不畫成長條，因為長條會讀成「量」，而這裡是次數。 */
      H.push('<div class="rk-dots">');
      for (var k = 0; k < RANK_N; k++) {
        H.push('<b class="' + (k < r.hit ? 'on' : '') + '"></b>');
      }
      H.push('</div>');
      H.push('<span class="rk-d">' + (r.hit ? '準 ' + r.hit + ' 次' : '還沒準過') + '</span>');
    }
    H.push('</div>');
  });
  H.push('</div>');

  /* 上不上榜自己決定。這一條是這張榜唯一的出口，所以它一直在。 */
  if (me) {
    H.push('<button class="rk-out" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'norank' })) + '\'>' +
      (me.noRank ? '回到榜上' : '不要上榜') + '</button>');
  }
  H.push('</div>');
  return H.join('');
}
