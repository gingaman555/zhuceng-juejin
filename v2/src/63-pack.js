/* 任務清單。

   老師派過的每一件事，各自走到哪。走完並且被收下的那幾件，
   各自有一張任務之證（見 43-core.js 與圖鑑）。

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
   一張任務之證不加速、不擋失準、不換任何東西。 */

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

  /* ── 你自己那幾件 ──

     上面那幾張卡全部是**這一組**的：走過幾趟、準了幾次、說很確定的
     時候準不準。可是這一套在教的是「一個人學會預估自己要幾天」，
     而四個人共用一個準不準——量到的是誰的校準？

     個人版的資料一直都在收（拆件掛在誰名下、他說幾天、他實際幾天），
     只是從來沒有一個地方算給他看。這一張補那一個洞。

     ── 它只印，不判 ──

     兩個數字並排，沒有名次、沒有印章、不進判定、不影響水晶、不上榜
     （見 40-db.js 的 myItems2）。在團隊裡判個人是製造推卸的最快方法
     ——一旦自己的準度有後果，最理性的做法就是少報一點讓別人吸收。

     放在組的那幾張前面：這一頁上唯一屬於他一個人的東西，
     不該排在四張組的卡片後面。 */
  var 我 = myItems2(S.who, t.teamId);
  if (我.n) {
    var 差 = 我.got - 我.said;
    H.push('<div class="card mine2">');
    H.push('<div class="eyebrow lit">你自己那幾件</div>');
    H.push('<p class="m2-big"><b>' + 我.said + '</b> 天　你說的' +
      '<span class="m2-sep">→</span>' +
      '<b>' + 我.got + '</b> 天　實際走的</p>');
    H.push('<p class="dim">' + 我.n + ' 件，' + 我.runs + ' 趟。' +
      (差 === 0 ? '剛好。'
        : 差 > 0 ? '比你說的多了 ' + 差 + ' 天。'
        : '比你說的少了 ' + (-差) + ' 天。') + '</p>');
    /* 有幾件的天數是他本人按的。擋不住代填，所以老實記下來——
       那個比例本身就是一個值得他自己看到的東西。 */
    if (我.own < 我.n) {
      H.push('<p class="dim">其中 ' + 我.own + ' 件的天數是你自己按的。' +
        '別人幫你填的那幾件，那個數字不是你說的話。</p>');
    }
    H.push('</div>');
  }

  /* 準度總表。本來在「紀錄」那一頁上——那一頁跟這一頁幾乎是同一份資料，
     併過來之後這裡是唯一一個看得到自己走過幾趟、準了幾次的地方。 */
  var acc = accuracyOf(t.teamId);
  if (acc.total) {
    H.push('<div class="card quiet"><div class="eyebrow">走過 ' + acc.total + ' 趟</div>');
    H.push(accBar(acc));
    H.push('</div>');
  }

  /* 校準：他說「很確定」的那幾次，準了幾次。

     這是整套系統唯一一句他自己不知道的話。系統不解讀、不下結論——
     它只是把他當初說的把握，跟後來發生的事擺在一起（見 40-db.js 的 sureOf）。

     只算老師收下的那幾趟，所以沒有人收就不會出現。 */
  var sr = sureOf(t.teamId);
  var any = RULES.SURE.some(function (x) { return sr[x.key].n > 0; });
  if (any) {
    H.push('<div class="card quiet"><div class="eyebrow">你說的把握，跟後來</div>');
    H.push('<div class="sure-list">');
    RULES.SURE.forEach(function (x) {
      var d = sr[x.key];
      if (!d.n) return;
      H.push('<div class="sure-r"><b>' + esc(x.name) + '</b>' +
        '<span>' + d.n + ' 次</span>' +
        '<i>準了 ' + d.hit + ' 次</i></div>');
    });
    H.push('</div></div>');
  }


  H.push('<div class="card"><div class="rec-list">');
  rows.forEach(function (x) { H.push(logRow(x.ms, x.run, t)); });
  H.push('</div></div>');

  /* 「我們做完了」在這裡說——但只有老師開放結案之後才看得到這個
     入口。2026-09-23：這顆鍵掛在任務清單最下面，整學期大半時間
     都還沒到結案的時候，卻整學期都在，不少學生把它當成一般的
     「交作業」按下去。老師還沒開放的時候，連這張卡都不畫，
     不是畫出來但按不下去——不存在的東西不會被誤按。

     已經說過、或老師已經回過「現在還不是時候」的，不受這個開關
     影響：那是已經在走的流程，關掉開關不該讓學生連自己說過什麼、
     還在等什麼都看不到。 */
  var exitOpen = !!(find('Classes', function (c) { return c.classId === t.classId; }) || {}).exitOpen;
  /* DRAFT.exitConfirm 也要算：他已經按過「我們做完了」正在看
     「確定嗎」那一步，這時候老師剛好關掉開關，這張卡不該憑空消失
     ——他還沒送出任何東西，但畫面上正跟他確認一件事，半路把
     整段收掉會像壞了。 */
  if (!t.leftAt && !t.exitOk && (exitOpen || t.exitAsk || t.exitNo || DRAFT.exitConfirm)) {
    H.push('<div class="card">');
    if (t.exitAsk) {
      H.push('<div class="eyebrow lit">說了</div>');
      H.push('<p class="dim">在等老師開門。</p>');
      H.push(btn('先不要', 'unexit', 'ghost'));
    } else if (t.exitNo) {
      /* 老師回了。答案要看得到——不然那個請求只是悄悄消失，
         而「我按了但什麼都沒發生」是最糟的那一種。

         再說一次不需要任何條件：做完了沒有是他們自己判斷的，
         老師只是還沒收。 */
      H.push('<div class="eyebrow warnx">老師說</div>');
      H.push('<p class="quote big">現在還不是時候。</p>');
      H.push(btn('我們真的做完了', 'askexit', 'big'));
    } else if (DRAFT.exitConfirm) {
      /* 兩步，不是一步。這一格以前是任務清單最下面一顆跟「回廊道」
         擠在一起的大鍵——常來看清單的人往下滑到底，手滑按到的
         不是「回廊道」，是跟老師說「我們做完了」。
         二次確認擋的就是那一下手滑，不是真的要問兩次。 */
      H.push('<div class="eyebrow warnx">確定嗎</div>');
      H.push('<p class="dim">按下去，老師那邊就會看到你們說這個專案做完了。</p>');
      H.push(btn('對，做完了', 'askexit', 'big'));
      H.push(btn('還沒，再想想', 'exitundo', 'ghost'));
    } else {
      H.push('<div class="eyebrow">這個專案做完了嗎</div>');
      H.push(btn('我們做完了', 'exitcheck', ''));
    }
    H.push('</div>');
  }

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
    /* 承諾用小時／週說的話，「你說」那一格印他原始講的單位，
       「實際」那一格還是天——actual 沒有跟著改精度，兩邊單位
       本來就不一樣，不能共用一個 tk-u。 */
    if (r.estU && r.estU !== 'd' && r.estN != null) {
      H.push('<span>你說</span><b>' + esc(estSay(r)) + '</b>');
    } else {
      H.push('<span>你說</span><b>' + r.est + '</b><span class="tk-u">天</span>');
    }
    if (r.actual) { H.push('<span>實際</span><b class="' + (r.stamp || '') + '">' +
      r.actual + '</b><span class="tk-u">天</span>'); }
    else if (r.went) { H.push('<span>走了</span><b>' + r.went + '</b><span class="tk-u">天</span>'); }
    else if (r.state === 'running') {
      var gone = daysBetween(r.committedAt, now());
      H.push('<span>過了</span><b>' + gone + '</b><span class="tk-u">天</span>');
    }
    H.push('</div>');
  }

  /* 那一趟插在哪一層的記號拿掉了：記號系統整個收掉。
     這一列剩下的是任務、說幾天、實際幾天、準不準——那一趟本身。 */

  H.push('</div>');
  return H.join('');
}

/* 每一種狀態一句人話。沒有一句在講「你做得好不好」。 */
var TASK_STATE = {
  fresh:     { k: 'wait', n: '還沒說幾天' },
  running:   { k: 'go',   n: '正在做' },
  judged:    { k: 'go',   n: '交出去了' },
  submitted: { k: 'go',   n: '在老師那邊' },
  back:      { k: 'wait', n: '老師退回來了' },
  approved:  { k: 'ok',   n: '老師勾了' },
  done:      { k: 'ok',   n: '走完了' },
  rethought: { k: 'wait', n: '重新想過' }
};

