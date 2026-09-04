/* ---------- 金幣榜 ----------

   跟另外兩張榜一樣：刻意加進來、而且準備好隨時拿掉的。

   要拿掉的話：刪掉這個檔案，再把 62-eco.js 裡那一行 coinCard(...) 與
   segs 裡的 'coin' 拿掉就好。沒有別的地方依賴它。

   ── 這一張排的是什麼 ──

   一件收下的委託 100 枚，老師收下時另外給 1–5 枚。所以總額幾乎完全
   由「他們完成了幾件」決定——加成最多佔 5%，只在同分的時候拉開一點。

   這是刻意的。排「完成幾件」是安全的：加法、人人可增、不涉及品質判斷。
   而那 5% 讓老師的回應在榜上留得下一點痕跡，但留不下一條路。

   ── 這一張跟原本的立場相反，而且是明知故犯 ──

   這個作品拿掉過分數、等級、經驗值，理由都是同一個：一個會漲的數值
   會把「做這件事」換成「拿到那個數字」。金幣是一個會漲的數值。

   加它是因為老師需要一個比「可以／退回」更有層次的回應方式，而二選一
   確實太粗。壓在 5%、而且基本額不看品質，是為了讓它一直是一句話。

   要是觀察到學生開始為那幾枚做事，就拿掉——而拿掉本身也是一個發現。 */

function coinRows(classId) {
  var out = [];
  where('Teams', function (t) { return t.classId === classId; }).forEach(function (t) {
    if (t.noRank) return;
    var c = coinsOf(t.teamId);
    out.push({ teamId: t.teamId, name: t.name, coins: c, done: c.base / RULES.COIN.base });
  });
  /* 先比總額。總額幾乎就是完成件數，所以這一榜排的其實是
     「你們做完幾件」——那是加法，人人可增。 */
  out.sort(function (a, b) { return b.coins.all - a.coins.all; });
  return out;
}

function coinCard(classId, meId) {
  var rows = coinRows(classId);
  var me = meId ? teamOf(meId) : null;
  var has = rows.some(function (r) { return r.coins.all > 0; });

  var H = ['<div class="card rank">'];
  H.push('<h2 class="rk-h">金幣</h2>');
  H.push('<p class="dim">一件收下的委託 ' + RULES.COIN.base +
    ' 枚，做完就有。老師收下的時候另外給 ' + RULES.COIN.bonusMin + '–' +
    RULES.COIN.bonusMax + ' 枚——那幾枚是他想多說的部分。</p>');

  if (!has) {
    H.push('<p class="dim">還沒有人拿到金幣。老師收下之後才有。</p>');
    H.push('</div>');
    return H.join('');
  }

  H.push('<div class="rk-list">');
  var last = null, place = 0;
  rows.forEach(function (r, i) {
    if (last === null || r.coins.all !== last) { place = i + 1; last = r.coins.all; }
    var mine = r.teamId === meId;
    H.push('<div class="rk-r' + (mine ? ' mine' : '') + (r.coins.all ? '' : ' none') + '">');
    H.push('<i class="rk-i">' + (r.coins.all ? place : '·') + '</i>');
    H.push('<b>' + esc(shortName(r.name)) + '</b>');
    /* 完成幾件寫出來，因為那才是這個數字真正在說的事。 */
    H.push('<span class="rk-d">收下 ' + r.done + ' 件</span>');
    H.push('<span class="ck-c">' + r.coins.all + ' 枚</span>');
    H.push('</div>');
  });
  H.push('</div>');

  /* 跟另外兩張榜共用同一個開關：不上榜就是三張都不上。 */
  if (me) {
    H.push('<button class="rk-out" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'norank' })) + '\'>' +
      (me.noRank ? '回到榜上' : '不要上榜') + '</button>');
  }
  H.push('</div>');
  return H.join('');
}
