/* ---------- 水晶榜 ----------

   跟另外兩張榜一樣：刻意加進來、而且準備好隨時拿掉的。

   水晶跟估得準現在合成同一張（bothCard，就在底下）。要拿掉整套的話
   見 68-rank.js 的檔頭。

   ── 這一張排的是什麼 ──

   一件收下的委託 100 顆，老師收下時另外給 10–50 顆。所以總額幾乎完全
   由「他們完成了幾件」決定——加成佔一趟的 9–33%，會拉開一點但拉不開
   一條路。

   這是刻意的。排「完成幾件」是安全的：加法、人人可增、不涉及品質判斷。
   而那個區間讓老師的回應在榜上留得下痕跡。

   （原本寫的是「1–5，最多佔 5%」。使用者把加成放大到 10–50，理由是
   1–5 在一個 100 起跳的數字旁邊看不出來——老師那一下「我想多說一點」
   在畫面上等於沒有發生。）

   ── 這個數字是拿過的，不是手上剩的 ──

   水晶花得掉：300 顆可以照亮一位圖鑑上遇不到的委託人（見 40-db.js 的
   actLight）。而榜上如果印手上剩的，那張榜就會變成「不要用它」的壓力
   ——一個沒有人敢用的用途等於沒有用途。

   所以花掉的不扣，而且畫面上寫「拿過 N 顆」，不是只丟一個數字讓人
   自己猜規則。

   ── 這一張跟原本的立場相反，而且是明知故犯 ──

   這個作品拿掉過分數、等級、經驗值，理由都是同一個：一個會漲的數值
   會把「做這件事」換成「拿到那個數字」。水晶是一個會漲的數值。

   加它是因為老師需要一個比「可以／退回」更有層次的回應方式，而二選一
   確實太粗。壓在 5%、而且基本額不看品質，是為了讓它一直是一句話。

   要是觀察到學生開始為那幾顆做事，就拿掉——而拿掉本身也是一個發現。 */

/* ---------- 各組：兩個數字放在一起 ----------

   本來是兩張分開的榜，一次只看得到一個：水晶一張、估得準一張。
   使用者要的是把大家的進度放在一起，所以合成一張。

   ── 排序照估得準，不照水晶 ──

   68-rank.js 的檔頭把理由寫得很清楚：排產出量會直接壞掉——做得多的
   組永遠在上面，而做得多跟做得好、跟專案管理學得如何都沒有關係，
   那只會獎勵灌水與過勞。估得準是這裡唯一非零和的量：每一組可以
   同時很準，不是有人上去就有人下來，而且它正是這個系統在教的東西。

   收下幾件與水晶留在最右邊，看得到，但不決定順序。 */
function bothCard(classId, meId) {
  var rows = rankRows(classId);
  var me = meId ? teamOf(meId) : null;
  var crystal = {};
  crystalRows(classId).forEach(function (c) { crystal[c.teamId] = c; });

  var H = ['<div class="card rank">'];
  H.push('<h2 class="rk-h">各組</h2>');
  H.push('<p class="dim">照最近 ' + RANK_N +
    ' 趟準了幾次排。收下幾件不決定順序——排做得多的，永遠是同幾組在上面。</p>');

  if (!rows.length) {
    H.push('<p class="dim">還沒有人上榜。</p></div>');
    return H.join('');
  }

  H.push('<div class="rk-list">');
  rows.forEach(function (r, i) {
    var mine = r.teamId === meId;
    var c = crystal[r.teamId];
    H.push('<div class="rk-r' + (mine ? ' mine' : '') +
      (r.dev === null ? ' none' : '') + '">');
    H.push('<i class="rk-i">' + (r.dev === null ? '·' : (i + 1)) + '</i>');
    H.push('<b>' + esc(shortName(r.name)) + '</b>');
    if (r.dev === null) {
      H.push('<span class="rk-d">還沒交過</span>');
    } else {
      /* 三個記號，一趟一個，照時間排。全部朝右的那一列，
         是「他每一趟都比自己說的久」（見 68-rank.js）。 */
      H.push('<div class="rk-dots">');
      for (var k = 0; k < RANK_N; k++) {
        var mk = r.marks[k];
        H.push('<span class="rk-m ' + (mk || 'none') + '">' +
          (mk ? stampPx(mk) : '') + '</span>');
      }
      H.push('</div>');
      H.push('<span class="rk-d">' + (r.hit ? '準 ' + r.hit + ' 次' : '還沒準過') + '</span>');
    }
    if (c && c.crystals.all) {
      /* 榜上這個數字是**拿過的總數**，不是手上剩下的（見 40-db.js 的
         crystalOf）。

         這一條不是實作細節，它是設計：水晶花得掉（照亮圖鑑上遇不到的
         那幾位），而如果榜上印的是手上剩的，那張榜就會變成「不要用它」
         的壓力——一個沒有人敢用的用途等於沒有用途。

         所以花掉的不扣。畫面上也要說，不然學生只會看到數字沒動然後
         自己猜規則。 */
      H.push('<span class="ck-c">收下 ' + c.done + ' 件　拿過 ' +
        c.crystals.all + ' 顆</span>');
    }
    H.push('</div>');
  });
  H.push('</div>');

  /* 出口一直在。自主性優先於排名。 */
  if (me) {
    H.push('<button class="rk-out" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'norank' })) + '\'>' +
      (me.noRank ? '回到榜上' : '不要上榜') + '</button>');
  }
  H.push('</div>');
  return H.join('');
}

function crystalRows(classId) {
  var out = [];
  where('Teams', function (t) { return t.classId === classId; }).forEach(function (t) {
    if (t.noRank) return;
    var c = crystalOf(t.teamId);
    out.push({ teamId: t.teamId, name: t.name, crystals: c, done: c.base / RULES.CRYSTAL.base });
  });
  /* 先比總額。總額幾乎就是完成件數，所以這一榜排的其實是
     「你們做完幾件」——那是加法，人人可增。 */
  out.sort(function (a, b) { return b.crystals.all - a.crystals.all; });
  return out;
}

