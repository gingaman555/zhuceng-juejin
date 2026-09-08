/* ---------- 排行榜 ----------

   這一支是刻意加進來、而且準備好隨時拿掉的。

   作品原本的立場是不排名（見 check.js 的禁用詞）。使用者以 RtD
   （research through design）為方法決定要做：東西做出來、放進去用、
   看實際發生什麼；評價不好就拿掉，而「拿掉」本身也是一個發現。

   要拿掉的話：刪掉這個檔案、68c-crystalrank.js 與 58-rank.css，再把
   62-eco.js 裡那一行 bothCard(...) 與 segs 裡的 both 拿掉。
   沒有別的地方依賴它。

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
    /* 只算老師收下的。排行榜是這一套裡唯一還留著的「獎賞」，
       而獎賞不該由系統自己發——交出去就上榜的話，老師是可選的。 */
    return r.teamId === teamId && r.stamp && r.est > 0 && r.actual > 0 &&
      (r.state === 'done' || r.state === 'approved');
  }).sort(function (a, b) { return (a.submittedAt || 0) - (b.submittedAt || 0); });
  if (!rs.length) return null;
  var use = rs.slice(-RANK_N);
  var sum = 0, hit = 0, marks = [];
  use.forEach(function (r) {
    /* ── 用他自己說的那個數字，不是談完的那個 ──

       老師回一句「我覺得會是 8 天」，學生按下去，真的做了 8 天。
       判定算他做到了，那是對的——他答應 8 天，做到 8 天。

       可是這張榜排的是「他估得準不準」。用談完的數字算，那一趟會變成
       滿分，而那個滿分是老師估的。每次都說「好」的那一組會排在最上面，
       榜就不再是它自己說的那件事了。

       改讀 estOwn（見 40-db.js）：他一個人的時候按下去的那一個。
       所以接受那一句話對榜完全沒有影響——不加分，也不扣分。
       判定那一邊一個字都沒動。 */
    var own = estOwn(r);
    if (!(own > 0)) return;
    sum += Math.abs(r.actual - own) / own;
    /* 只有「跟承諾的一樣」算準。早跟晚都是不準——
       說 5 天做了 1 天是差了 80%，跟做了 9 天一樣。

       這裡不能讀 r.stamp：那是拿談完的數字判的。同一列上面排的是
       他自己的數字、下面印的是談完的判定，那一列會自己打架。 */
    var mk = RULES.judge(own, r.actual).key;
    if (mk === 'exact') hit++;
    /* 每一趟往哪一邊偏。三顆空心的點看不出「他每次都比說的久」，
       而那是這張榜上最值得看到的一件事。 */
    marks.push(mk);
  });
  if (!marks.length) return null;
  /* hit 是寫出來給人看的：準了幾次。加法的講法——
     「你拿到了什麼」，不是「你錯了多少」。
     dev 只留著當平手時分先後，不寫出來。 */
  /* 除的是真的算進去的那幾趟，不是 use.length——上面會跳過沒有
     自己數字的那一趟，兩個數對不上的話平均會被稀釋。 */
  return { hit: hit, dev: sum / marks.length, n: marks.length, marks: marks };
}

/* 一個班的榜。沒有資料的排在最後，選擇不上榜的整個不出現。 */
function rankRows(classId) {
  var out = [];
  where('Teams', function (t) { return t.classId === classId; }).forEach(function (t) {
    if (t.noRank) return;
    var d = rankDev(t.teamId);
    out.push({ teamId: t.teamId, name: t.name, dev: d ? d.dev : null,
      hit: d ? d.hit : 0, n: d ? d.n : 0, marks: d ? d.marks : [] });
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

