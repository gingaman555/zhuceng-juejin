/* 留下的。

   先講這一頁是什麼，因為它前後改過兩次，方向差很多。

   最早：老師看完之後發一件裝備，裝備綁一句話。
   第二版：老師只勾可以，學生從隨機三件裡挑一件。
   現在：三張攤開的是「這一趟真的發生的三件事」，用他們自己的詞寫的，
   學生挑一張留下。

   為什麼一路改到這裡——前兩版那些句子都是我寫的。六句格言在我的清單裡
   三選一，那不算自主；而且六句用完就重複，通用到誰都適用，
   等於誰都不適用。

   現在留下的那一句是他自己那一趟的事實，他自己挑的角度。
   下一次拉滑桿決定要花幾天的時候，它會出現在那一頁——
   那不是系統的建議，是他上一趟寫給這一刻的自己看的。

   這一頁沒有「六件收集了幾件」。寫了就變成一條要被填滿的進度條。 */

PAGES.pack = function () {
  var t = myTeam();
  var ks = keepsOf(t.teamId).slice().reverse();

  var H = [head('留下的', ks.length + ' 句', '')];

  if (!ks.length) {
    H.push('<div class="card dim">走完一趟、老師勾了可以之後，' +
      '會攤開三張讓你挑一張留下。</div>');
    H.push(btn('回廊道', 'go:home', 'ghost'));
    return H.join('');
  }

  /* 帶在身上的：最近留下的那一句。下一次承諾時會出現的就是它。 */
  var top = ks[0];
  var tk = RULES.keepOf(top.key);
  H.push('<div class="card carry ' + strataAt(depthOf(t.teamId)).key + '">');
  H.push('<div class="eyebrow">帶在身上的</div>');
  H.push('<div class="carry-in">');
  H.push(pxTag(GEAR_PX[tk.tro].px, strataAt(depthOf(t.teamId)).pal, 'kp-px'));
  H.push('<div><i>' + esc(tk.eyebrow) + '</i><em>' + esc(top.line) + '</em></div>');
  H.push('</div></div>');

  /* 全部。照時間倒著排，每一句掛著它是哪一趟、哪一個角度。 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">走過的每一趟</div>');
  H.push('<div class="keeps">');
  ks.forEach(function (k) {
    var kk = RULES.keepOf(k.key) || RULES.KEEPS[0];
    var r = find('Runs', function (x) { return x.runId === k.runId; });
    var m = r ? msOf(r.msId) : null;
    H.push('<div class="kp">');
    H.push(pxTag(GEAR_PX[kk.tro].px, STRATA[0].pal, 'kp-px sm'));
    H.push('<div>');
    H.push('<span class="ke">' + esc(kk.eyebrow) + '</span>');
    H.push('<i>' + esc(k.line) + '</i>');
    if (m) H.push('<span class="km">' + esc(m.title) + '</span>');
    H.push('</div></div>');
  });
  H.push('</div></div>');

  H.push(btn('回廊道', 'go:home', 'ghost'));
  return H.join('');
};
