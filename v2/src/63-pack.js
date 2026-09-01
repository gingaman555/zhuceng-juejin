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
  var ks = keepsOf(t.teamId).slice().reverse();

  var H = [head('岩心架', ks.length + ' 根', '')];

  if (!ks.length) {
    H.push('<div class="card dim">走完一趟、老師勾了可以之後，' +
      '那一趟會長成一根岩心。形狀由那一趟自己決定。</div>');
    H.push(btn('回廊道', 'go:home', 'ghost'));
    return H.join('');
  }

  /* 圖例。看得懂才讀得出自己的歷史。 */
  H.push('<div class="card quiet">');
  H.push('<div class="eyebrow">怎麼讀</div>');
  H.push('<div class="corekey">');
  H.push('<span><b class="c1"></b>那一天你來過</span>');
  H.push('<span><b class="c2"></b>你說那天沒動</span>');
  H.push('<span><b class="c3"></b>那一天沒有紀錄</span>');
  H.push('</div>');
  H.push('<p class="dim">長度就是那一趟過了幾天。顏色是你當時在哪一層。</p>');
  H.push('</div>');

  H.push('<div class="card">');
  H.push('<div class="rack">');
  ks.forEach(function (k) {
    var z = STRATA[0];
    STRATA.forEach(function (x) { if (x.key === k.zone) z = x; });
    var r = find('Runs', function (x) { return x.runId === k.runId; });
    var m = r ? msOf(r.msId) : null;
    H.push('<div class="rk">');
    H.push(pxTag(k.px || coreOf(k.runId), z.pal, 'core'));
    H.push('<b>' + esc(k.name || (m ? m.title : '')) + '</b>');
    H.push('<span>' + (k.elapsed || 0) + ' 天　·　來過 ' + (k.moved || 0) + '</span>');
    H.push('<em>' + esc(z.name) + '</em>');
    H.push('</div>');
  });
  H.push('</div></div>');

  H.push(btn('回廊道', 'go:home', 'ghost'));
  return H.join('');
};
