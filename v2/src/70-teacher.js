/* 老師端。

   他只做三件事，側欄就只有三格：

     發派任務   要他們交什麼、分幾段、排到哪一天、發給哪幾組
     審核       他們交了，你看完勾一個「可以」（或退回去改）
     各組進度   誰在哪、誰慢下來了

   他對專案制定有自主權：派什麼、分幾段、排在什麼時候、發給自己
   帶的哪幾組，都是他的。

   但他排的那一天**不進判定**。判定只讀兩個數字：學生說幾天、
   實際幾天（RULES.judge，check.js 第三條擋著）。那條軌是整個
   作品的地基——一旦系統拿老師的日期去評分，被評價的對象就
   換回作業了。他也不打分、不挑裝備。 */

/* 老師走到哪一步了。有人等你看就是第三步，其餘看自己帶的組有沒有人在走。
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
  /* 只有自己帶的組。三位老師共用一個課程，同一個佇列會讓
     A 老師勾到 B 老師的組。 */
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
  var tq = DRAFT.tq === 'exit' ? 'exit' : 'rev';
  H.push('<div class="segs">');
  [['rev', '審核', rows.length], ['exit', '出口', out.length]].forEach(function (g) {
    H.push('<button class="seg' + (tq === g[0] ? ' on' : '') +
      '" data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'tq:' + g[0] })) +
      '\'>' + esc(g[1]) + (g[2] ? '（' + g[2] + '）' : '') + '</button>');
  });
  H.push('</div>');

  if (tq === 'exit') {
    H.push(head('出口', out.length ? out.length + ' 組說做完了' : '沒有人說做完了', ''));
    if (!out.length) {
      H.push('<div class="card"><p class="dim">' +
        '他們自己在任務清單上說「我們做完了」，這裡才會出現。</p></div>');
    }
    out.forEach(function (t) {
      var acc = accuracyOf(t.teamId);
      H.push('<div class="card exitq">');
      H.push('<h2>' + esc(t.name) + ' 說專案做完了。</h2>');
      H.push('<p class="dim">' + esc(t.project || '（還沒定）') + '　·　走完 ' +
        depthOf(t.teamId) + ' 個任務</p>');
      if (acc.total) H.push(accBar(acc));
      /* 開門，不是替他們走出去。門開了之後那一下是他們自己按的——
         走出去該是他們的動作，不是老師代勞的。

         旁邊那一顆是「還不到」。本來只有開門一顆，所以他覺得還不到的時候
         唯一能做的事是不按——那個請求就一直掛在他的清單上，
         而學生那邊永遠停在「在等老師開門」。兩邊都卡住。 */
      H.push('<div class="row">');
      H.push(btn('開門讓他們上去', 'openexit:' + t.teamId + ',1', 'big'));
      H.push(btn('現在還不是時候', 'denyexit:' + t.teamId, 'ghost'));
      H.push('</div>');
      H.push('</div>');
    });
    return H.join('');
  }

  /* 說明句拿掉：清單本來就照等最久排。 */
  H.push(head('審核', rows.length ? rows.length + ' 件等你看' : '沒有等你的', ''));

  if (!rows.length) {
    H.push('<div class="card">');
    H.push('<p class="dim">沒有人在等你。去發一個任務——寫要交什麼就好。</p>');
    H.push('<div class="row">');
    H.push(btn('去發一個任務', 'go:ms', 'big'));
    H.push(btn('看各組進度', 'go:classeco', 'ghost'));
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
    H.push('<em>' + esc(x.team.name) + '</em></span>');
    H.push('<span class="rq-d">等 ' + x.waited + ' 天</span>');
    H.push('</button>');
  });

  /* 底下本來還有一塊「全班現在」，是各組進度的縮小版——
     而各組進度就在側欄第三格。同一件事說兩遍，先出現的是雜訊。 */
  return H.join('');
};

/* ---------- 勾一個可以 ---------- */
PAGES.review = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var m = msOf(r.msId), t = teamOf(r.teamId);
  var s = RULES.STAMPS[r.stamp];

  /* 只留一句，而且是他猜不到的那一句：成果不在系統裡。 */
  var H = [head('審核', t.name + '　·　' + m.title,
    '成果交在你原本收的地方。')];

  H.push('<div class="card">');
  H.push('<div class="radar-head"><span class="st ' + r.stamp + '">' + 
         esc(s.name) + '</span>');
  /* 我排到哪一天。判定跟它無關（判定只看他說幾天、實際幾天），
     但他有沒有走進我排的那一段，是我要寫那一句話時真的需要知道的。 */
  if (m.due) {
    H.push('<span class="sp"></span><span class="dim">我排到 ' +
      esc(dueSay(m)) + '</span>');
  }
  H.push('</div>');
  /* 他們自己寫的兩段放最上面。他在這一頁要做的事是寫一句話，
     而最有用的輸入就是這兩段——本來排在整張卡的最後面。
     系統不解讀、不歸類，原話放上去就好。 */
  /* ── 他們回報了什麼 ──

     這一頁是「在系統確認學生時間與回報狀況」的地方，所以那三樣要
     擺在最上面：每一件說幾天／實際幾天、順不順、為什麼。

     兩欄並排是重點——這個作品在練的就是那兩個數字之間的距離，
     而老師要寫那一句話的時候，看的就是這張表。 */
  var pl = r.plan || [], sp = r.spent || [];
  if (pl.length) {
    H.push('<div class="eyebrow">他們拆的那幾件　說／實際</div>');
    H.push('<div class="splist">');
    pl.forEach(function (x, i) {
      var got = sp[i] == null ? null : sp[i];
      H.push('<div class="sp2">');
      H.push('<b style="background:' + stepHue(i) + '"></b>');
      H.push('<i>' + esc(x.n) + '</i>');
      H.push('<u class="said">說 ' + x.d + '</u>');
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
  if (r.why) H.push('<p class="quote"><b>為什麼</b>' + nl(r.why) + '</p>');
  if (r.hard) H.push('<p class="quote"><b>他們說卡在哪裡</b>' + nl(r.hard) + '</p>');
  if (r.pace) H.push('<p class="quote"><b>他們覺得的進度</b>' + nl(r.pace) + '</p>');
  H.push(estBar(r.est, r.actual, false));
  H.push(dayStrip(r.teamId, r.runId));
  H.push(overTags(r.teamId, r));
  /* 歷史準度分布拿掉了：那是「他們這學期怎麼樣」，屬於各組進度，
     不屬於這一筆審核。這一頁只看眼前這一趟。 */
  H.push('</div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">你的想法　選填</div>');
  H.push('<p class="dim">退回去改一定要寫。</p>');
  H.push('<textarea id="gr-word" rows="3" placeholder="' +
    esc('例：訪綱太長，受訪者撐不到後面那幾題。') + '">' + esc(draft('gr-word')) + '</textarea>');
  H.push('</div>');


  H.push('<div class="row">');
  H.push(btn('可以', 'approve:' + r.runId, 'big'));
  /* 退回。它不動判定也不動深度——那一趟的兩個數字在他交出去的
     當下就定了，重做不會讓他當初說的話變成別的話。
     退回講的只有一件事：那份成果還沒被收下。 */
  H.push(btn('退回去改', 'reject:' + r.runId, 'ghost'));
  H.push(btn('回審核清單', 'go:radar', 'ghost'));
  H.push('</div>');
  return H.join('');
};

/* ---------- 發派任務 ---------- */
PAGES.ms = function () {
  var u = me();
  /* 我派過的。別位老師派的不在這裡——他規劃他的，我規劃我的。 */
  var list = where('Milestones', function (m) {
    return m.classId === u.classId && (!m.mentorId || m.mentorId === u.userId);
  })
    .sort(function (a, b) { return b.at - a.at; });
  var teams = teamsUnder(u.classId, u.userId);
  var to = DRAFT.to || [];

  var H = [];
  H.push(head('發派任務', '你要他們交什麼', ''));

  H.push('<div class="card">');
  H.push('<div class="eyebrow">派一個新的</div>');
  H.push('<input id="ms-title" value="' + esc(draft('msTitle', '')) + '" oninput="DRAFT[\'msTitle\']=this.value" placeholder="' + esc('例：訪三個人，記下他們怎麼講') + '">');
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
    esc(sp.length ? '再切一段，按 Enter' : '例：訪三個人　→ 按 Enter') +
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
           : '我帶的 ' + teams.length + ' 組') + '</span>');
  teams.forEach(function (t) {
    var on = to.indexOf(t.teamId) >= 0;
    H.push('<button class="tag' + (on ? ' on' : '') + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'to:' + t.teamId })) + '\'>' + esc(t.name) + '</button>');
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
    /* 三種發法。「課程共用」不只是舊資料——一位老師可以刻意派一個
       不掛自己的任務（期中發表那一種），那時候全課程都收得到。 */
    H.push('<span class="msr-w">' + (m.teams.length ? m.teams.length + ' 組'
      : (m.mentorId ? '我帶的' : '課程共用')) + '</span>');
    /* 我排到哪一天。過了就寫過了——不是警告，是事實。 */
    var di = dueIn(m);
    if (di) {
      H.push('<span class="msr-d' + (di.past ? ' past' : '') + '">' +
        esc(dueSay(m)) + (di.past ? '　過了' : '') + '</span>');
    }
    H.push('<span class="msr-n">' + got.length + ' 承諾　' + done + ' 走完</span>');
    /* 這裡本來還有一行「甲 6→6　乙 3→9　丙 7→7　丁 5→5」——每一組
       承諾幾天、實際幾天。拿掉了，兩個理由：

       一 · 這一頁在做的事是「寫下一個任務」。把每一組的預估攤在
            那個動作旁邊，等於邀請他照著他們的數字去訂下一件事的大小，
            而任務該有多大是題目本身的事，不是他們上一次估得準不準。

       二 · 它印的是整個課程的組，包含別位老師帶的。那不是他的事。

       那幾個數字沒有消失：審核那一頁上每一趟都有，各組進度上一整排。 */
    H.push('</div>');
  });
  H.push('</div></div>');
  return H.join('');
};

/* 各組進度那一頁在 62-eco.js——跟學生看的是同一張剖面圖。 */
