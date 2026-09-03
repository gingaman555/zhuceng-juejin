/* ---------- 圖鑑收集榜 ----------

   跟 68-rank.js 一樣：刻意加進來、而且準備好隨時拿掉的。

   要拿掉的話：刪掉這個檔案，再把 62-eco.js 裡那一行 dexCard(...) 與
   segs 裡的 'dex' 拿掉就好。沒有別的地方依賴它。

   ── 這一張跟作品的立場正面衝突，而且是明知故犯 ──

   圖鑑的檔頭自己寫著：「全部看得到。沒有鎖、沒有問號、沒有『收集了
   幾件』。」理由是上一個作品的圖鑑是一條收集進度條，而那種進度條把
   「做更多任務」變成「填更多格子」——外在誘因就是這樣裝回來的。

   完成度排行榜正好是它拒絕的那兩樣：一個總數，加一個名次。

   所以做，但用最不傷的方式做，四條：

   一 · 總數不進圖鑑那一頁。圖鑑還是他自己的回憶，翻開來沒有分母、
        沒有百分比。分母只活在班級地下城底下這一張榜上——
        比較的事情留在比較的地方。

   二 · 排的是「去過幾種地方」，不是「做了幾件事」。

        擋路的那一隻由（任務 × 那一組 × 那一趟去的地方）決定，
        所以同一個地方走十趟，遇到的種類不會比走三趟多多少。
        要收得多，只有一個辦法：往沒去過的地方走。

        而去哪裡不影響任何判定、不花任何東西——這一榜因此獎勵的是
        「你敢不敢換一個地方」，不是「你做得多不多」。

   三 · 沒有分數、沒有獎勵、不影響任何判定，而且可以不上榜——
        跟估得準那一張共用同一個開關（Team.noRank）。

   四 · 名次會平手，而且平手很多。那是好事：它讓這張榜比較不像
        一條隊伍，比較像一張地圖上誰去過哪裡。 */

/* 這一組遇過幾種，跟牠們散在哪幾個地方。 */
function dexOf(teamId) {
  var met = metMobs(teamId);
  var names = Object.keys(met);
  /* 去過的地方：從遇過的那幾隻反推。牠們住在哪一層寫在生物表上。 */
  var zs = {};
  names.forEach(function (n) {
    var c = faunaByName(n);
    if (!c) return;
    STRATA.forEach(function (z) { if (z.name === c.r) zs[z.key] = 1; });
  });
  return { n: names.length, zones: Object.keys(zs) };
}

/* 全部有幾種。分母算出來，不寫死——生物表加一隻，這裡跟著變。 */
function dexAll() { return allFauna().length; }

function dexRows(classId) {
  var out = [];
  where('Teams', function (t) { return t.classId === classId; }).forEach(function (t) {
    if (t.noRank) return;
    var d = dexOf(t.teamId);
    out.push({ teamId: t.teamId, name: t.name, n: d.n, zones: d.zones });
  });
  /* 先比遇過幾種，平手再比去過幾個地方。兩個都平手就並列——
     不再往下分，因為再往下分就只剩「誰做得多」了。 */
  out.sort(function (a, b) {
    if (a.n !== b.n) return b.n - a.n;
    return b.zones.length - a.zones.length;
  });
  return out;
}

function dexCard(classId, meId) {
  var rows = dexRows(classId);
  var all = dexAll();
  var me = meId ? teamOf(meId) : null;
  var has = rows.some(function (r) { return r.n > 0; });

  var H = ['<div class="card rank">'];
  H.push('<h2 class="rk-h">遇過幾種，共 ' + all + ' 種</h2>');
  /* 一句話說清楚這一榜在獎勵什麼。沒有這一句，它會被讀成
     「誰做得多」——而那正是它最不該變成的東西。 */
  H.push('<p class="dim">同一個地方走幾趟都是同一隻。要收得多，' +
    '就往沒去過的地方走——而去哪裡不影響判定。</p>');

  if (!has) {
    H.push('<p class="dim">還沒有人遇過任何一隻。</p>');
    H.push('</div>');
    return H.join('');
  }

  H.push('<div class="rk-list">');
  var last = null, place = 0;
  rows.forEach(function (r, i) {
    /* 並列同名次。平手很多是這一榜的特色，不是要修的東西。 */
    if (last === null || r.n !== last) { place = i + 1; last = r.n; }
    var mine = r.teamId === meId;
    H.push('<div class="rk-r' + (mine ? ' mine' : '') + (r.n ? '' : ' none') + '">');
    H.push('<i class="rk-i">' + (r.n ? place : '·') + '</i>');
    H.push('<b>' + esc(shortName(r.name)) + '</b>');
    /* 去過哪幾個地方，一個地方一顆。那一排就是他們的路線，
       而它同時解釋了名次——去得散，收得多。 */
    H.push('<div class="dx-z">');
    STRATA.forEach(function (z) {
      H.push('<span class="dx-p ' + z.key +
        (r.zones.indexOf(z.key) >= 0 ? ' on' : '') + '" title="' +
        esc(z.name) + '"></span>');
    });
    H.push('</div>');
    H.push('<span class="rk-d">' + (r.n ? r.n + ' 種' : '還沒遇過') + '</span>');
    H.push('</div>');
  });
  H.push('</div>');

  /* 跟估得準那一張共用同一個開關：不上榜就是兩張都不上。
     兩個開關會讓「我不想被比較」變成一件要做兩次的事。 */
  if (me) {
    H.push('<button class="rk-out" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'norank' })) + '\'>' +
      (me.noRank ? '回到榜上' : '不要上榜') + '</button>');
  }
  H.push('</div>');
  return H.join('');
}
