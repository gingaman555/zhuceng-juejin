/* 裝備架。

   先講裝備到底是什麼，因為這件事很容易做歪。

   它不是道具。它不加速、不擋失準、不換任何東西——一旦裝備能換到好處，
   學生就會為了那個好處做事，而那正是這個作品要避免的事。

   它是一句話。老師勾了可以之後，系統攤開三件（隨機，跟表現無關），
   學生挑一件。挑的那一下他其實是在說：「這一次我想記住的是這句。」

   所以它的用途只有一個，而且是真的有用：

     下一次拉滑桿決定要花幾天的時候，他自己挑的那句話會出現在那一頁。

   那不是系統在給建議，是他自己寫給下一次的自己看的。這一頁就是那些
   句子放在一起的地方。

   還有一件事是刻意的：六件全部列出來，沒拿到的那幾件句子照樣讀得到，
   而且不寫「幾件收集完成」。寫了就變成收集進度，那一秒它又變回一個
   要被填滿的條。 */

/* 最近挑走的那一件。它就是「帶在身上的」。 */
function carriedGear(teamId) {
  var gs = gearsOf(teamId);
  if (!gs.length) return null;
  return RULES.gearOf(gs[gs.length - 1].key);
}

/* 這一組每一件各挑過幾次、分別是哪一趟 */
function gearTally(teamId) {
  var n = {};
  gearsOf(teamId).forEach(function (g) {
    var r = find('Runs', function (x) { return x.runId === g.runId; });
    var m = r ? msOf(r.msId) : null;
    (n[g.key] = n[g.key] || []).push(m ? m.title : '');
  });
  return n;
}

PAGES.pack = function () {
  var t = myTeam();
  var tally = gearTally(t.teamId);
  var carry = carriedGear(t.teamId);

  var H = [head('裝備架', '你挑走的那些話',
    '裝備不換任何東西——它不加速，也擋不了失準。它是一句你自己選要記住的話。' +
    '下一次決定要花幾天的時候，你帶在身上的那一句會出現在那一頁。')];

  /* 帶在身上的 */
  H.push('<div class="card carry">');
  H.push('<div class="eyebrow">帶在身上的</div>');
  if (carry) {
    H.push('<div class="carry-in">');
    H.push('<b>' + carry.icon + '</b>');
    H.push('<div><i>' + esc(carry.name) + '</i>' +
      '<em>' + esc(carry.why) + '</em></div>');
    H.push('</div>');
    H.push('<p class="dim">下一次拉滑桿決定天數的時候，這句話會出現在那一頁。' +
           '挑走新的一件就換成新的那一句。</p>');
  } else {
    H.push('<p class="dim">還沒有。走完一個里程碑、老師勾了可以之後，' +
           '會攤開三件讓你挑一件。</p>');
  }
  H.push('</div>');

  /* 架上全部 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">架上</div>');
  H.push('<p class="dim">六件都在這裡。攤開哪三件是隨機的，跟你做得如何無關——' +
         '所以沒拿到的那幾件不代表任何事，句子也照樣讀得到。</p>');
  H.push('<div class="shelf">');
  RULES.GEARS.forEach(function (g) {
    var got = tally[g.key];
    H.push('<div class="slot' + (got ? ' got' : '') +
      (carry && carry.key === g.key ? ' on' : '') + '">');
    H.push('<b>' + g.icon + '</b>');
    H.push('<i>' + esc(g.name) + (got && got.length > 1 ? ' × ' + got.length : '') + '</i>');
    H.push('<em>' + esc(g.why) + '</em>');
    if (got) {
      H.push('<span class="from">' + got.map(function (x) {
        return esc(x || '（那一趟）');
      }).join('　·　') + '</span>');
    } else {
      H.push('<span class="from dim">還沒挑到這一件</span>');
    }
    H.push('</div>');
  });
  H.push('</div></div>');

  H.push(btn('回坑道', 'go:home', 'ghost'));
  return H.join('');
};
