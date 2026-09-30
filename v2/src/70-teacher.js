/* 老師端。

   他只做三件事，側欄就只有三格：

     發派任務   要他們交什麼、分幾段、排到哪一天、發給哪幾組
     審核       他們交了，你看完勾一個「可以」（或退回去改）
     各組進度   誰在哪、誰慢下來了

   他對專案制定有自主權：派什麼、分幾段、排在什麼時候、發給自己
   哪幾組，都是全班的。

   但他排的那一天**不進判定**。判定只讀兩個數字：學生說幾天、
   實際幾天（RULES.judge，check.js 第三條擋著）。那條軌是整個
   作品的地基——一旦系統拿老師的日期去評分，被評價的對象就
   換回作業了。他也不打分、不挑裝備。 */

/* 老師走到哪一步了。有人等你看就是第三步，其餘看班上有沒有人在走。
   本來那個 running 沒有篩班也沒有篩老師——全系統只要有人在走就算，
   在一個課程三位老師的設定下那是別人的組。 */

/* 他們自己標的、他們自己說的。用的是老師分段時寫的詞，不是我列的選項。 */
function overTags(teamId, run) {
  var fl = (run.flags || []).map(function (i) { return stepName(run.runId, i); }).filter(Boolean);
  var ov = (run.overs || []).map(function (i) { return stepName(run.runId, i); }).filter(Boolean);
  if (!fl.length && !ov.length) return '';
  var H = ['<div class="tags small">'];
  if (fl.length) {
    H.push('<span class="k">承諾時標的</span>');
    fl.forEach(function (l) { H.push('<span class="tag static">' + esc(l) + '</span>'); });
  }
  if (ov.length) {
    H.push('<span class="k">後來說比想的久</span>');
    ov.forEach(function (l) { H.push('<span class="tag static hit">' + esc(l) + '</span>'); });
  }
  H.push('</div>');
  return H.join('');
}

/* stepTags 拿掉了：它只長在審核清單那一列上，而那一列現在只回答
   「先看哪一件」。它畫的是「他們勾了哪幾段」，而勾段那個機制在回報
   改成一件一件報實際天數的時候就退休了（見 67-battle.js）。 */

/* 三步驟那一條拿掉了：側欄本來就寫著這三件事，同一件事說兩遍。
   而且第二格寫的是「他們承諾天數／這一段你不用管」——一條永遠掛在
   最上面、專門告訴他「這裡沒有你的事」的橫幅，那是純粹的負擔。

   teacherStep 一起退休：它唯一的用途是決定那一條上哪一格亮著。 */

/* ---------- 審核（首頁） ---------- */
PAGES.radar = function () {
  var u = me();
  /* 全班。三位老師共用一個課程，而每一位本來就會被問到任何一組的事——
     切成三個互相看不到的小班只是多出來的複雜度（見 40-db.js 的
     teamsUnder）。 */
  var rows = radar(u.classId, u.userId);
  var H = [];


  /* 出口跟審核並排，一次只看一個。

     它們是兩種完全不同的決定：審核是「這一件收不收」，一週好幾次，
     看的是一份成果；出口是「這一組整個專案結束了沒」，一學期一次，
     看的是一整條路。本來出口那幾張卡疊在審核佇列最上面，
     所以他每次進來看幾件要審的東西，都要先跨過一個「要不要放他們走」。

     切換一直在，不是有人排隊才出現：他要知道這個系統裡有出口這件事，
     而不是等到有人按了才第一次看到。 */
  var out = exitQueue(u.classId, u.userId);
  /* 剛說了幾天、還沒有人回一句的那幾趟（見 40-db.js 的 askQueue）。 */
  var asks = askQueue(u.classId);
  /* 分頁只有兩格。「剛承諾」不在這裡——它是一件有的時候才發生的事，
     從審核那一頁上的一行進去（見下面）。

     RULES.NEGOTIATE 關著的話連那一行都不出現，而且不管 DRAFT 記著什麼
     都退回「審核」——不然關掉之前停在那一格的人會落在一個空白頁。 */
  var tq = (DRAFT.tq === 'ask' && RULES.NEGOTIATE) ? 'ask' : 'rev';

  if (tq === 'ask') {
    /* 他們剛說要花幾天。

       這一格是這個系統裡唯一「老師可以在事情發生之前說話」的地方。
       其餘每一個接觸點都是事後的：收下、退回，都是對著已經做完的東西。

       回一句是選項不是義務——沒有話要說就按過去，學生那邊什麼都不會
       收到（「我看過但沒意見」對他沒有資訊，只會多一則通知）。 */
    H.push(head('剛承諾', asks.length ? asks.length + ' 組剛說了天數' : '沒有剛承諾的',
      ''));
    /* 這一頁不在分頁上，所以要自己給一條回去的路。 */
    H.push('<div class="row"><button class="btn ghost" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'tq:rev' })) + '\'>回審核</button></div>');
    if (!asks.length) {
      H.push('<div class="card"><p class="dim">' +
        '他們一說要花幾天，這裡就會出現。你可以回一句，也可以不回。' +
        '</p></div>');
    }
    asks.forEach(function (x) {
      H.push('<button class="rq" data-act="run" data-p=\'' +
        esc(JSON.stringify({ a: 'go:askest:' + x.run.runId })) + '\'>');
      H.push('<span class="rq-t"><b>' + esc(x.ms.title) + '</b>');
      H.push('<em>' + esc(x.team.name) + '　·　他們說 ' + esc(estSay(x.run)) + '</em></span>');
      H.push('<span class="rq-d">' + (x.days ? '第 ' + (x.days + 1) + ' 天' : '今天') +
        '</span>');
      H.push('</button>');
    });
    return H.join('');
  }


  /* 說明句拿掉：清單本來就照等最久排。 */
  H.push(head('審核', rows.length ? rows.length + ' 件等你看' : '沒有等你的', ''));

  /* ── 有人剛說了天數 ──

     只在真的有的時候出現，沒有就完全不存在。所以它不佔常態的複雜度
     ——老師平常打開這一頁看到的還是只有一件事。

     語氣是邀請不是待辦：回一句是選項，沒有話要說就不用進去
     （見 40-db.js 的 actAskSkip：「我看過但沒意見」對學生沒有資訊）。
     所以這裡不寫成「N 件待處理」，也不放在清單裡佔一列——放在清單裡
     它就變成一件擋在真正工作前面的事。 */
  if (RULES.NEGOTIATE && asks.length) {
    H.push('<button class="asknote pressable" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'tq:ask' })) + '\'>' +
      '<b>' + asks.length + ' 組剛說了要花幾天</b>' +
      '<i>你可以回一句，也可以不回</i></button>');
  }

  if (!rows.length) {
    H.push('<div class="card">');
    /* 「沒有人在等你」講的是審核這一格，可是它印出來的時候旁邊那一格
       可能正掛著號碼——結案那一格裡的每一組都按過「我們做完了」，
       那就是有人在等（exitQueue 只收 exitAsk 的，見 40-db.js）。

       實際看到的畫面：分頁寫著「結案（1）」，底下同一張卡寫
       「沒有人在等你」。兩句話在同一個畫面上互相打臉。

       協商那一排不算——那一格寫著「你可以回一句，也可以不回」，
       沒有人在那裡等他。 */
    H.push(out.length
      ? '<p class="dim">這裡沒有要看的。有 ' + out.length +
        ' 組說他們做完了，在左邊最下面的「結案」。</p>'
      : '<p class="dim">沒有人在等你。去發一個任務——寫要交什麼就好。</p>');
    H.push('<div class="row">');
    H.push(btn('去發一個任務', 'go:ms', 'big'));
    H.push(btn(RULES.SOLO ? '看每一位的進度' : '看各組進度', 'go:classeco', 'ghost'));
    H.push('</div></div>');
  }

  /* 一列只回答一個問題：先看哪一件。

     那個問題只需要三件事——哪一組、哪一件、等了幾天。
     整列是一顆鈕，點進去才是他真的在讀成果的地方。

     這裡本來還有五樣：判定、說幾天實際幾天、他們承諾時標的、
     老師自己分的段、一顆另外的鍵。全部搬到審核那一頁。

     判定尤其不留：「跟承諾的一樣」是系統對他們預估的判定，
     擺在他打開成果之前，等於先給他一個印象。
     系統判預估、老師判成果，兩個判斷要分開。 */
  rows.forEach(function (x) {
    H.push('<button class="rq" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'go:review:' + x.run.runId })) + '\'>');
    H.push('<span class="rq-t"><b>' + esc(x.ms.title) + '</b>');
    /* 這一件是誰派的，接在組名後面——不另外開一格，那一列要回答的
       還是同一個問題（先看哪一件）。自己派的不寫。

       三位老師共用一個佇列，所以「這一件本來是誰的事」要看得到：
       看得到才有得商量，看不到就會兩個人都以為對方會看。 */
    var rby = x.ms.mentorId && x.ms.mentorId !== u.userId ? userOf(x.ms.mentorId) : null;
    H.push('<em>' + esc(x.team.name) +
      (rby ? '　·　' + esc(rby.name) + ' 派的' : '') + '</em></span>');
    H.push('<span class="rq-d">等 ' + x.waited + ' 天</span>');
    H.push('</button>');
  });

  /* 底下本來還有一塊「全班現在」，是各組進度的縮小版——
     而各組進度就在側欄第三格。同一件事說兩遍，先出現的是雜訊。 */
  return H.join('');
};

/* ---------- 結案 ----------

   2026-09-30：本來這一格是審核頁最上面的分頁（審核｜結案），兩顆並排在
   老師每次進來第一眼看到的位置，老師們也會按錯。搬到左邊側欄最下面，
   跟上面三格（等你的、發派任務、各組進度）隔開——結案是一學期一次的事，
   不該跟一週好幾次的審核擺在同一排。 */
PAGES.tclose = function () {
  var u = me();
  var H = [];
    /* 全班每一組都在，不是只有「說了做完了」的那幾組——門是他開的，
       所以他要能主動開，不是只能回應。

       有說的排在前面：那是一個訊號，不是一道關卡。 */
    var mine = teamsUnder(u.classId, u.userId).slice().sort(function (a, b) {
      return (b.exitAsk || 0) - (a.exitAsk || 0);
    });
    H.push(head('結案', '整個專案完成了，才在這裡確認', ''));
    /* 2026-09-30：老師們會按錯，因為這一頁沒有講清楚它確認的是什麼。
       它確認的是「這一組整個專案結束了」，不是「收下一件作業」——
       收作業在左邊「等你的」。這一張卡放在最上面，先講這一件事。 */
    H.push('<div class="card">');
    H.push('<div class="eyebrow">先看這個</div>');
    H.push('<p>這裡確認的是<b>整個專案已經完成</b>，不是收下一件作業。</p>');
    H.push('<p class="dim">要收作業，請到左邊「等你的」。只有這一組的整個專案真的做完了，才按下面的「確認整個專案已完成」。按了之後，他們那邊廊道盡頭的出口就會打開，他們就可以結束專案。</p>');
    H.push('</div>');

    /* 開放／關掉學生那邊「我們做完了」的入口。
       2026-09-23：不少學生把那顆鍵當成一般的「交作業」按下去——
       它整學期都在，可是一學期裡大半時間根本還沒到結案的時候。
       開學就先關著，真的要進入結案階段再開，學生那邊那張卡才會
       出現（見 63-pack.js）。已經說過、或已經回過「現在還不是時候」
       的不受這個開關影響，那是已經在走的流程。 */
    var kl0 = classOf(u);
    H.push('<div class="card">');
    H.push('<div class="eyebrow">學生那邊看不看得到「我們做完了」</div>');
    H.push('<p class="dim">' + (kl0.exitOpen
      ? '開著。學生任務清單最下面看得到那顆鍵。'
      : '關著。學生那邊還沒有這個選項，不會誤按到。') + '</p>');
    H.push(btn(kl0.exitOpen ? '關掉' : '開放結案', 'exitopenset:' + (kl0.exitOpen ? 0 : 1),
      kl0.exitOpen ? 'ghost' : ''));
    H.push('</div>');

    mine.forEach(function (t) {
      var acc = accuracyOf(t.teamId);
      H.push('<div class="card exitq' + (t.exitAsk ? ' said' : '') + '">');
      if (t.exitAsk) H.push('<div class="eyebrow lit">他們說整個專案做完了</div>');
      H.push('<h2>' + esc(t.project || '（還沒定）') + '</h2>');
      H.push('<p class="dim">' + esc(t.name) + '　·　走完 ' +
        depthOf(t.teamId) + ' 個任務</p>');
      if (acc.total) H.push(accBar(acc));

      if (t.leftAt) {
        H.push('<p class="dim">他們走出去了。</p>');
      } else if (t.exitOk) {
        /* 確認了但還沒走。走出去那一下是他們自己按的——
           走出去該是他們的動作，不是老師代勞的。 */
        H.push('<p class="dim">確認過了。門開著，等他們自己走上去。</p>');
        H.push(btn('取消確認', 'openexit:' + t.teamId + ',0', 'ghost'));
      } else {
        H.push('<div class="row">');
        /* 鍵上寫的是這個決定叫什麼，說明那一行才講它在學生那邊長什麼樣
           ——鍵要短到一眼讀完，而「門」不是老師要做的事。 */
        /* 確認要問一次：這一顆按下去，學生那邊廊道盡頭的門就開了。 */
        if (DRAFT.closeConf === t.teamId) {
          H.push('<p class="dim">確定「' + esc(t.name) + '」的<b>整個專案</b>已經完成了嗎？按下去，他們那邊的出口就會打開。</p>');
          H.push(btn('對，整個專案完成了', 'openexit:' + t.teamId + ',1', 'big'));
          H.push(btn('先不要', 'closeno', 'ghost'));
        } else {
          H.push(btn('確認整個專案已完成', 'closeconf:' + t.teamId, 'big'));
        }
        /* 「現在還不是時候」只對有說過的那幾組出現——沒說過的組
           沒有東西要回。 */
        if (t.exitAsk) H.push(btn('現在還不是時候', 'denyexit:' + t.teamId, 'ghost'));
        H.push('</div>');
      }
      H.push('</div>');
    });
  return H.join('');
};

/* ---------- 勾一個可以 ---------- */
PAGES.review = function () {
  var u = me();
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var m = msOf(r.msId), t = teamOf(r.teamId);
  var s = RULES.STAMPS[r.stamp];
  /* 還沒交出來的那一趟沒有判定，而底下整頁都在讀 s。

     正常的路走不到（清單只收交出來的），但兩位老師同時開著同一件、
     或是分頁放了很久再回來，就會落在這裡。炸掉的頁對老師更糟：
     他會以為是學生那一邊出事了。 */
  if (!s) {
    return '<div class="card"><div class="eyebrow">還沒交出來</div>' +
      '<p class="dim">' + esc(t ? t.name : '這一組') +
      ' 還在走這一趟。他們交出來之後才會出現在你的清單上。</p></div>' +
      '<div class="row">' + btn('回審核清單', 'go:radar', 'big') + '</div>';
  }
  if (r.state === 'done') {
    return '<div class="card"><div class="eyebrow">已經處理過了</div>' +
      '<p class="dim">這一趟' + (r.wordBy ? '由另一位老師' : '') +
      '已經收下了。</p></div>' +
      '<div class="row">' + btn('回審核清單', 'go:radar', 'big') + '</div>';
  }

  /* 只留一句，而且是他猜不到的那一句：成果不在系統裡。 */
  var H = [head('審核', t.name + '　·　' + m.title, '')];

  /* ── 要這件事的那一位 ──

     學生從頭到尾在跟一個人打交道：他來委託、他在路的另一端等、
     他收下東西。而老師這一頁上他完全不在——老師看到的是一份表單，
     學生看到的是一場戲。同一件事的兩端，長得像兩個不同的系統。

     放他一張臉跟一個名字。這一頁不加登場動畫——老師打開它是要做事，
     一段演出會擋在他跟他要判斷的東西中間。學生那一邊要動機，
     老師這一邊要看得清楚。 */
  var pat = mobOfRun(r);
  if (pat) {
    var pz = mobZone(pat);
    H.push('<div class="card rvw-pat ' + pz.key + '">');
    H.push(patTag(pat, pz.pal, 'rvw-px'));
    H.push('<div class="rvw-t"><b>' + esc(pat.n) + '</b>');
    H.push('<em>' + esc(pat.t) + '</em></div>');
    H.push('</div>');
  }

  /* ── 當初要的 ──

     這一段本來不在。老師在派的時候寫下「什麼算做完」，然後在**判斷
     做完了沒有的那一刻**，那句話不在畫面上——他要嘛憑記憶，要嘛切回
     發派任務那一頁去翻。

     三位老師共同帶一個班的時候更明顯：甲寫下的標準，乙在審的時候
     根本沒看過。而這個作品的主旨那一句就是「老師寫的合格考量就是
     教材」——那句話要成立，它至少得出現在他判斷的那一頁上。

     排在「東西在這裡」上面，因為讀的順序是：我當初要什麼 →
     去看他們交了什麼 → 回來判斷。標準要在他點出去之前就讀到。

     兩樣都沒寫就整段不畫。大部分的委託只有一句標題，這一段
     不該讓那些委託多出一塊空的東西。 */
  var note = (m.note || '').trim();
  var mst = m.steps || [];
  if (note || mst.length) {
    H.push('<div class="card"><div class="eyebrow">當初要的</div>');
    if (note) H.push('<p class="quote">' + nl(note) + '</p>');
    /* 分段排成一行一行的小塊，不是一項一列——它是「我要的形狀」，
       一眼掃過去就好。他們自己拆成什麼樣子在底下那一段，
       兩個並排才看得出有沒有走鐘。 */
    if (mst.length) {
      H.push('<div class="msspec">');
      mst.forEach(function (x, i) {
        H.push('<span class="mss"><i>' + (i + 1) + '</i>' + esc(x) + '</span>');
      });
      H.push('</div>');
    }
    H.push('</div>');
  }

  /* 他們說東西在哪。他打開這一頁、讀完當初要的，下一件事就是去看東西。

     本來這裡只有一句「成果交在你原本收的地方」，然後叫他自己去找。
     那三步（離開系統、翻、回來）會殺掉審核這件事，而審核不發生的話，
     後面每一個設計都沒有觸發點。 */
  if (r.link) {
    H.push('<div class="card"><div class="eyebrow">他們說東西在這裡</div>');
    H.push(whereLine(r.link, 1));
    H.push('</div>');
  }

  H.push('<div class="card">');
  H.push('<div class="radar-head"><span class="st ' + r.stamp + '">' + 
         esc(s.name) + '</span>');
  /* 排到哪一天。判定跟它無關（判定只看他說幾天、實際幾天），
     但他有沒有走進那一段，是要寫那一句話時真的需要知道的。

     三位老師共同帶一個班，這一件很可能不是我派的——那時候「我排到」
     是錯的，而且我會拿別人的排程去讀這一份成果卻不知道那是別人排的。
     不是我派的就寫出是誰。 */
  var rvBy = m.mentorId && m.mentorId !== u.userId ? userOf(m.mentorId) : null;
  if (m.due) {
    H.push('<span class="sp"></span><span class="dim">' +
      (rvBy ? esc(rvBy.name) + ' 派的，排到 ' : '我排到 ') +
      esc(dueSay(m)) + '</span>');
  } else if (rvBy) {
    H.push('<span class="sp"></span><span class="dim">' +
      esc(rvBy.name) + ' 派的</span>');
  }
  H.push('</div>');
  /* 這一趟談過的話。判定的那兩個數字有來歷，而來歷就在這裡。 */
  H.push(negoLine(r, false));
  /* ── 上一趟 ──

     沒有這一行，每一次審核都是沒有前情的。三位老師共同帶一個班的
     時候尤其：甲上次跟他們說了什麼，乙這一次完全不知道，於是同一件
     事會被講兩次，或者根本沒有人接續。

     不用任何人多做事——那一句話本來就在資料裡。 */
  var prev = runsFor(r.teamId).filter(function (x) {
    return x.run.runId !== r.runId && x.run.doneAt;
  }).sort(function (a, b) { return b.run.doneAt - a.run.doneAt; })[0];
  if (prev) {
    var pw = prev.run.wordBy ? userOf(prev.run.wordBy) : null;
    H.push('<p class="dim prev">上一趟「' + esc(prev.ms ? prev.ms.title : '') + '」　·　' +
      (pw ? esc(pw.name) + ' 收下了' : '收下了') +
      (prev.run.backs ? '（退回過 ' + prev.run.backs + ' 次）' : '') +
      (prev.run.word ? '　·　「' + esc(prev.run.word) + '」' : '') + '</p>');
  }
  /* 他們自己寫的兩段放最上面。他在這一頁要做的事是寫一句話，
     而最有用的輸入就是這兩段——本來排在整張卡的最後面。
     系統不解讀、不歸類，原話放上去就好。 */
  /* ── 他們回報了什麼 ──

     這一頁是「在系統確認學生時間與回報狀況」的地方，所以那三樣要
     擺在最上面：每一件說幾天／實際幾天、順不順、為什麼。

     兩欄並排是重點——這個作品在練的就是那兩個數字之間的距離，
     而老師要寫那一句話的時候，看的就是這張表。 */
  /* 誰做了什麼。沒寫的顯示「還沒說」——那是一個事實，不是一個指控，
     而且它是這一頁上唯一看得出「這一組是不是一起做的」的地方。 */
  var mem = where('Users', function (u) { return inTeam(u, r.teamId); });
  if (mem.length) {
    var sd = r.said || {};
    H.push('<div class="eyebrow">誰做了什麼</div>');
    H.push('<div class="saidlist">');
    mem.forEach(function (u) {
      H.push('<div class="sd">');
      H.push(pxTag(heroOf(u).idleA, heroOf(u).pal, 'sd-px'));
      H.push('<b>' + esc(u.name || '') + '</b>');
      H.push('<span' + (sd[u.userId] ? '' : ' class="dim"') + '>' +
        (sd[u.userId] ? esc(sd[u.userId]) : '還沒說') + '</span>');
      H.push('</div>');
    });
    H.push('</div>');
  }

  var pl = r.plan || [], sp = r.spent || [];
  if (pl.length) {
    H.push('<div class="eyebrow">他們拆的那幾件　說／實際</div>');
    H.push('<div class="splist">');
    pl.forEach(function (x, i) {
      var got = sp[i] == null ? null : sp[i];
      H.push('<div class="sp2">');
      H.push('<b style="background:' + stepHue(i) + '"></b>');
      H.push('<i>' + esc(x.n) + '</i>');
      H.push('<u class="who">' + esc(shortWho(x.who)) + '</u>');
      H.push('<u class="said">說 ' +
        ((x.dU && x.dU !== 'd' && x.dN != null) ? esc(x.dN + estUnit(x.dU).name) : x.d + ' 天') +
        '</u>');
      H.push('<u class="got' + (got != null && got > x.d ? ' over' : '') + '">' +
        (got == null ? '—' : got) + '</u>');
      H.push('</div>');
    });
    H.push('</div>');
  }
  if (r.feel) {
    var fn = ({ good: '順', ok: '普通', bad: '不順' })[r.feel] || '';
    H.push('<div class="eyebrow">他們覺得進展</div>');
    H.push('<div class="feels one"><span class="fl on">' + esc(fn) + '</span></div>');
  }
  /* 範圍有沒有變。跟順不順擺在一起——「順」但範圍砍了一半，
     跟「不順」但範圍沒動，是兩件很不一樣的事。 */
  if (r.scope) {
    var sn = ({ more: '比說的多', same: '差不多', less: '比說的少' })[r.scope] || '';
    H.push('<div class="eyebrow">做出來的跟當初說的</div>');
    H.push('<div class="feels one"><span class="fl on">' + esc(sn) + '</span></div>');
  }
  if (r.why) H.push('<p class="quote"><b>為什麼</b>' + nl(r.why) + '</p>');
  if (r.hard) H.push('<p class="quote"><b>他們說卡在哪裡</b>' + nl(r.hard) + '</p>');
  if (r.pace) H.push('<p class="quote"><b>他們覺得的進度</b>' + nl(r.pace) + '</p>');
  H.push(estBar(r.est, r.actual, false, estSay(r)));
  H.push(dayStrip(r.teamId, r.runId));
  H.push(overTags(r.teamId, r));
  /* 歷史準度分布拿掉了：那是「他們這學期怎麼樣」，屬於各組進度，
     不屬於這一筆審核。這一頁只看眼前這一趟。 */
  H.push('</div>');

  H.push('<div class="card">');
  /* 這裡一度有一塊「他們請你看這裡」——學生交出去的時候指的那一處，
     而他的評語接在那一處底下。學生那一題拿掉了（每一趟都要再想一次，
     太消耗），所以這一塊跟著回去。他的那一句話又是他自己起頭的。 */
  H.push('<div class="eyebrow">你的想法　選填</div>');
  H.push('<p class="dim">退回去改一定要寫。收下也值得說一句——他們會看到。</p>');
  H.push('<textarea id="gr-word" rows="3" oninput="DRAFT[\'gr-word\']=this.value" placeholder="' +
    esc('例：第二件比你們說的久兩天，那一段的範圍好像變大了。') +
    '">' + esc(draft('gr-word')) + '</textarea>');
  H.push('</div>');


  /* 「完成到什麼程度」。這是他比「可以／退回」更有層次的那一個回應。

     ── 2026-09-09：老師這一頭不再講水晶 ──

     本來這一格寫的是「收下的時候多給幾顆」，底下還解釋「這一件本來
     就有 100 顆」。那是把遊戲化那一層攤在老師面前——他要一邊想這一件
     做到哪裡，一邊換算成一個他不在乎的計數單位。

     現在他問的是「完成到什麼程度」。東西沒有換——它一樣是老師多給的
     那幾顆水晶，數字原封不動存進 r.bonus，換算成水晶是
     學生那一頭的事（見 60-student.js 的 crygot）。同一個數字兩種讀法：
     老師讀的是「做到哪裡」，學生讀的是「多拿到幾顆」。


     ── 下限是 0 ──

     舊註解寫著「最少 1，不是 0：0 會被讀成負評」。那個顧慮是對的，
     可是解法搬到學生那一頭了：0 的時候不印「0 是他多給的」那一行
     分解（見 60-student.js），所以畫面上不會出現一個被講成負評的
     正常答案。 */
  var bn = DRAFT.bonus || RULES.CRYSTAL.bonusMin;
  H.push('<div class="card">');
  H.push('<div class="eyebrow">完成到什麼程度　選填</div>');
  H.push('<div class="row sure-row">');
  /* 這一排是 0 1 2 3 4 5（值在 20-rules.js 的 bonusMin／Max／Step）。

     一格 10、排成 10…50 的那一版拿掉了：那個量級讓這幾顆變成一個
     值得追的數字，而這個機制要留在「老師的一句話」那一側。 */
  for (var bi = RULES.CRYSTAL.bonusMin; bi <= RULES.CRYSTAL.bonusMax;
       bi += (RULES.CRYSTAL.bonusStep || 1)) {
    H.push(btn(String(bi), 'bonus:' + bi, 'sure' + (bn === bi ? ' on' : '')));
  }
  H.push('</div>');
  H.push('<p class="dim">0 就是收下，沒有要多說的。</p>');
  H.push('</div>');

  /* 他按下去那一刻有多重。

     老師在這一套裡讓掉了不少：他排的日期不進判定、他不能無理由退回、
     他改不動學生承諾的天數。那幾件在畫面上一句話都沒說，所以他只
     感覺到自己被拿走了東西。

     這一句講的是反過來那一半——沒有他點頭，學生什麼都拿不到。
     一句，而且是事實，不是打氣。 */
  H.push('<p class="dim">你收下的那一刻，他們才拿得到水晶、圖鑑那一格，' +
    '跟疊上去的那一塊。</p>');
  /* 回審核清單留在正文裡——它不是決定，是離開。 */
  H.push('<div class="row">');
  H.push(btn('回審核清單', 'go:radar', 'ghost'));
  H.push('</div>');

  /* ── 決定那兩顆釘在底部 ──

     量出來的：這一頁在手機上 4.7 屏（3846px），而「收下」在 y=3583。
     老師要滑四屏才按得到，而這是全系統他最常打開的一頁，
     星期三三位老師會一直用它。

     不是砍內容——上面那 1592px 是十五小塊（上一趟、誰做了什麼、
     拆件說／實際、順不順、範圍、為什麼、再兩天、承諾時標的），
     每一塊都是「老師資訊夠不夠」那一輪加進去的，沒有一塊該砍。
     問題是決定被埋在最底下。

     首頁那個 sticky 當初拿掉是對的：那一頁兩屏，釘在底部只會蓋住
     東西。這一頁四點七屏、而且唯一的出口在最底下——同一個做法在
     這裡剛好是解法。

     底下留一塊等高的空白，所以它不會蓋住最後一行。 */
  H.push('<div class="rvw-pin"><div class="rvw-pin-in">');
  H.push(btn('收下', 'approve:' + r.runId, 'big'));
  /* 退回。它不動判定也不動深度——那一趟的兩個數字在他交出去的
     當下就定了，重做不會讓他當初說的話變成別的話。
     退回講的只有一件事：那份成果還沒被收下。 */
  H.push(btn('退回去改', 'reject:' + r.runId, 'ghost'));
  H.push('</div></div>');
  return H.join('');
};

/* ---------- 回一句：我覺得會是幾天 ----------

   一句話是必填的（actAskEst 擋在資料層）。理由跟退回一樣：一個沒有
   說法的數字就是一道命令，而命令不會被內化成他自己的判斷。

   這一頁上寫著「最後幾天，他說了算」——那不是客套，那是事實：
   這一支只寫 askEst，判定讀的永遠是 run.est，而 run.est 只有學生改得動。 */
PAGES.askest = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var m = msOf(r.msId), t = teamOf(r.teamId);
  var n = Number(draft('est', r.est));

  var H = [head('回一句', t.name + '　·　' + m.title, '')];

  H.push('<div class="card">');
  H.push('<div class="eyebrow">他們說</div>');
  H.push('<p class="quote big">' + esc(estSay(r)) + '</p>');
  /* 我自己排到哪一天。它不進判定，但它是我會有意見的原因。 */
  if (m.due) H.push('<p class="dim">排到 ' + esc(dueSay(m)) + '。</p>');
  H.push('</div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">你覺得會是幾天</div>');
  H.push(estStep(n));
  H.push('<div class="eyebrow" style="margin-top:14px">為什麼</div>');
  H.push('<textarea id="ask-w" rows="2" oninput="DRAFT[\'askw\']=this.value" placeholder="' +
    esc('例：同樣的東西我看過，通常卡在找人。') + '">' + esc(draft('askw', '')) + '</textarea>');
  H.push('<p class="dim">最後幾天他說了算。你給的是理由，不是期限。</p>');
  H.push('</div>');

  H.push('<div class="row">');
  H.push(btn('送出去', 'asksend:' + r.runId, 'big'));
  H.push(btn('沒有話要說', 'askskip:' + r.runId, 'ghost'));
  H.push(btn('回清單', 'go:radar', 'ghost'));
  H.push('</div>');
  return H.join('');
};

/* ---------- 發派任務 ---------- */
PAGES.ms = function () {
  var u = me();
  /* 這個班派出去的每一件，不只我派的。

     三位老師共同帶一個班，一定會出現「這一週我發給甲乙，你發給丙丁」。
     本來這裡只印自己派的——於是我完全不知道甲組這一週已經被派了兩件，
     照著看起來很空的清單再加一件，學生那邊就疊了三件。那不是他們
     估不準，是我們三個沒對過。

     誰派的印在那一列上。要不要跟人家的錯開，是他看得到之後
     自己會做的判斷——這一頁的工作是讓他做得成那個判斷。 */
  var all = where('Milestones', function (m) {
    return m.classId === u.classId;
  })
    .sort(function (a, b) { return b.at - a.at; });
  var list = all.filter(function (m) { return !m.withdrawnAt; });
  var gone = all.filter(function (m) { return !!m.withdrawnAt; });
  var teams = teamsUnder(u.classId, u.userId);
  var to = DRAFT.to || [];

  var H = [];
  H.push(head('發派任務', '你要他們交什麼', ''));

  /* 「派一個新的」拿掉了：這一頁的標題就是「發派任務／你要他們交什麼」，
     而底下第一個框就是題目——同一件事說三次。 */
  H.push('<div class="card">');
  H.push('<input id="ms-title" value="' + esc(draft('msTitle', '')) + '" oninput="DRAFT[\'msTitle\']=this.value" placeholder="' + esc('一句話說清楚要做完什麼') + '">');
  H.push('<textarea id="ms-note" oninput="DRAFT[\'msNote\']=this.value" rows="2" placeholder="' +
    esc('要注意的地方。選填。') + '">' + esc(draft('msNote', '')) + '</textarea>');
  /* ── 分段 ──

     本來是一個空白的多行框，標籤寫「一行一段」。那是資料格式，
     不是介面：老師看到的是一個空框，按 Enter 只是換行，
     要到學生那邊才知道自己切對了沒有。

     現在打一句按 Enter 就變成底下的一項，有編號、有叉。
     切的那一下就看得到結果。 */
  H.push('<div class="eyebrow" style="margin-top:14px">分段　選填</div>');
  var sp = DRAFT.steps || [];
  if (sp.length) {
    H.push('<div class="sped">');
    sp.forEach(function (x, i) {
      H.push('<div class="spr"><i>' + (i + 1) + '</i><b>' + esc(x) + '</b>' +
        '<button class="spx" data-act="run" data-p=\'' +
        esc(JSON.stringify({ a: 'stepdel:' + i })) + '\' title="' +
        esc('拿掉這一段') + '">×</button></div>');
    });
    H.push('</div>');
  }
  H.push('<input id="ms-step" placeholder="' +
    esc(sp.length ? '再切一段，按 Enter' : '切一段，按 Enter') +
    '" onkeydown="if(event.key===\'Enter\'){event.preventDefault();ACTS.stepadd(this.value);}">');
  H.push('<p class="dim">' + (sp.length ? '共 ' + sp.length + ' 段' :
    '不寫的話他們自己拆。') + '</p>');
  /* ── 排到哪一天 ──

     老師對專案制定要有自主權，而排程是那個自主權最具體的一半。
     它不進判定：判定只讀學生說幾天與實際幾天。學生那邊會看到
     這一天換算成的天數，畫在他按承諾的那條走廊上。 */
  H.push('<div class="eyebrow" style="margin-top:14px">排到什麼時候　選填</div>');
  /* 選了單位才等於「有排」，所以不用另外做一個開關。 */
  var du = DRAFT.dueU, dn = Number(DRAFT.dueN) || 0;
  H.push('<div class="tags">');
  DUE_UNITS.forEach(function (x) {
    H.push('<button class="tag' + (du === x.k ? ' on' : '') +
      '" data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'dueu:' + x.k })) +
      '\'>' + esc(x.name) + '後</button>');
  });
  if (du) {
    H.push('<button class="tag" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'dueu:' })) + '\'>不排</button>');
  }
  H.push('</div>');
  if (du) {
    var uu = dueUnit(du);
    /* 相對的輸入，絕對的顯示。「兩週後」是哪一天永遠看得到，
       兩邊都不用在腦袋裡換算。 */
    H.push('<div class="estep duestep">');
    H.push('<button class="es-b es-m' + (dn <= 1 ? ' off' : '') +
      '" data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'duen:-1' })) + '\'>−</button>');
    H.push('<div class="es-n"><b>' + dn + '</b><span>' + esc(uu.name) + '後</span></div>');
    H.push('<button class="es-b es-p' + (dn >= uu.max ? ' off' : '') +
      '" data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'duen:1' })) + '\'>＋</button>');
    H.push('</div>');
    H.push('<p class="duewhen">' + esc(dueSay({ due: dueFrom(dn, du), dueU: du })) + '</p>');
    /* 六個字。他要知道的只有「這不是系統會拿去罰他們的東西」。 */
    H.push('<p class="dim">排程，不是期限。</p>');
  }

  H.push('<div class="eyebrow" style="margin-top:14px">發給誰</div>');
  H.push('<div class="tags">');
  H.push('<span class="tag static' + (to.length ? '' : ' hit') + '">' +
         (to.length ? '只發給 ' + to.length + ' 組'
           : '全班 ' + teams.length + ' 組') + '</span>');
  teams.forEach(function (t) {
    var on = to.indexOf(t.teamId) >= 0;
    var mem = where('Users', function (u) { return inTeam(u, t.teamId); });
    var names = mem.map(function (u) { return u.name; }).join('、');
    H.push('<button class="tag' + (on ? ' on' : '') + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'to:' + t.teamId })) + '\'>' + esc(t.name) +
      (names ? '<small style="display:block;opacity:.6;font-size:22px">' + esc(names) + '</small>' : '') +
      '</button>');
  });
  H.push('</div>');
  H.push(btn('派出去', 'publish', 'big'));
  H.push('</div>');

  if (!list.length) {
    H.push('<div class="card dim">還沒派過。</div>');
  }

  /* 派過的每一個壓成一行：標題、幾組承諾了、幾組走完了。
     本來一個一張卡，還帶著注意事項與每一組承諾幾天的標籤——
     派了十個就是十張卡，而老師在這一頁要做的只有「再派一個」。 */
  H.push('<div class="card"><div class="rec-list">');
  list.forEach(function (m) {
    var got = where('Runs', function (r) { return r.msId === m.msId; });
    var done = got.filter(function (r) { return r.state === 'done'; }).length;
    H.push('<div class="msr">');
    H.push('<b>' + esc(m.title) + '</b>');
    /* 發給誰是老師派的時候自己點的：不點就是全班。 */
    H.push('<span class="msr-w">' + (m.teams.length ? m.teams.length + ' 組'
      : '全班') + '</span>');
    /* 我排到哪一天。過了就寫過了——不是警告，是事實。 */
    var di = dueIn(m);
    if (di) {
      H.push('<span class="msr-d' + (di.past ? ' past' : '') + '">' +
        esc(dueSay(m)) + (di.past ? '　過了' : '') + '</span>');
    }
    H.push('<span class="msr-n">' + got.length + ' 承諾　' + done + ' 走完</span>');
    /* 刪掉：兩步。按一下先問，因為學生那邊會馬上少一件。 */
    if (DRAFT.msDel === m.msId) {
      H.push('<p class="dim msr-ask">學生那邊會不見，他們已經承諾、交出去的紀錄還在，隨時可以放回來。確定嗎？</p>');
      H.push(btn('對，刪掉', 'msdelyes:' + m.msId, ''));
      H.push(btn('先不要', 'msdelno', 'ghost'));
    } else {
      H.push(btn('刪掉這一件', 'msdel:' + m.msId, 'ghost'));
    }
    /* 這裡本來還有一行「甲 6→6　乙 3→9　丙 7→7　丁 5→5」——每一組
       承諾幾天、實際幾天。拿掉了，兩個理由：

       一 · 這一頁在做的事是「寫下一個任務」。把每一組的預估攤在
            那個動作旁邊，等於邀請他照著他們的數字去訂下一件事的大小，
            而任務該有多大是題目本身的事，不是他們上一次估得準不準。

       二 · 它印的是全班每一組，而這一頁現在也印別人派的那幾件。
            兩件事疊起來就是一整片跟他要寫的這一個任務無關的數字。

       那幾個數字沒有消失：審核那一頁上每一趟都有，各組進度上一整排。 */
    /* 誰派的。

       2026-09-23：本來自己派的不寫（理由是「不然每一列都掛著一個
       「我」」）。可是這一頁列的是全班派出去的每一件，自己剛派的
       那一件跟別人派的、跟舊的混在一起，全靠這一行的「有沒有寫」
       分——一個很容易漏看的隱性訊號。真的在用的時候量到：老師發完
       作業，回到這一頁找不到自己剛剛派了什麼。

       改成兩種都寫：自己的寫「你派的」，跟別人那句同一個位置、
       同一個份量，掃過去看得到，不用靠「沒寫」去猜。 */
    if (m.mentorId) {
      var isMine = m.mentorId === u.userId;
      var mby = isMine ? u : userOf(m.mentorId);
      if (mby) {
        H.push('<span class="msr-by' + (isMine ? ' mine' : '') + '">' +
          (isMine ? '你派的' : esc(mby.name) + ' 派的') + '</span>');
      }
    }
    H.push('</div>');
  });
  H.push('</div></div>');

  /* 刪掉的：還在這裡，放得回去。學生那邊看不到它們。 */
  if (gone.length) {
    H.push('<div class="card"><div class="eyebrow">刪掉的（學生看不到）</div><div class="rec-list">');
    gone.forEach(function (m) {
      var got2 = where('Runs', function (r) { return r.msId === m.msId; }).length;
      H.push('<div class="msr">');
      H.push('<b>' + esc(m.title) + '</b>');
      H.push('<span class="msr-n">' + got2 + ' 筆紀錄還留著</span>');
      H.push(btn('放回去', 'msrestore:' + m.msId, 'ghost'));
      H.push('</div>');
    });
    H.push('</div></div>');
  }
  return H.join('');
};

/* 各組進度那一頁在 62-eco.js——跟學生看的是同一張剖面圖。 */
