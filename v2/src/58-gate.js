/* 門口：還沒登入之前看得到的每一頁。

   四頁，一頁只問一件事：

     gate   這是什麼、你要登入還是建帳號
     login  帳號密碼
     reg    加入碼 → 帳號密碼（學生自己開；老師與研究者的帳號由研究者開）

   為什麼認領要獨立一頁：如果讓學生自己打組名，五個人會打出五種寫法，
   資料就對不起來了。老師先貼名冊，學生從裡面點自己——一次點擊，
   不用打字，而且組別一定對得上。

   密碼在這一版只是雜湊過的字串，擋得住肉眼、擋不住真的攻擊。
   AUTH_NOTE 那句話會印在建立帳號那一頁上，不藏起來。 */

/* ---------- 啟動 ---------- */
PAGES.gate = function () {
  var H = ['<div class="gate">'];
  H.push('<div class="gate-box">');
  H.push(pxTag(SIGNS.glow.px, SIGNS.glow.pal, 'sign'));
  H.push('<h1>專案地下城</h1>');
  /* 一句話說完這是什麼。不是說明，是招牌上那一行。 */
  /* 招牌上那一行。本來是「化身勇者」——勇者是一個身分，
     而這個世界裡你的身分是「接委託的人」，三拍剛好就是那一圈：
     接下來、說幾天、走完它。 */
  H.push('<p class="tagline">接下委託，規劃天數，走完專案地下城！！</p>');

  /* 進去那兩顆放在第一屏，不要捲。 */
  H.push('<div class="row">');
  H.push(btn('登入', 'go:login', 'big'));
  H.push(btn('我是新的', 'go:reg', 'ghost'));
  H.push('</div>');

  /* 一趟就這四件事。四個圖示一排，不寫成一段話。
     故事第二頁用的是同一個（見 55-ui.js 的 loopStrip）。 */
  H.push(loopStrip());

  /* 六層。進去之前就知道下面有什麼，那是世界，不是說明。
     刻意不寫「地下幾公尺起」——層沒有先後，順序是每一個班隨機洗出來的。 */
  H.push('<div class="eyebrow" style="margin-top:44px">你會走過的地方</div>');
  H.push('<div class="zones">');
  STRATA.forEach(function (s) {
    var c = faunaOf(s.key)[0];
    H.push('<div class="zn ' + s.key + '">');
    if (c) H.push(pxTag(c.px, s.pal, 'zn-px'));
    H.push('<b>' + esc(s.name) + '</b>');
    H.push('<span>' + esc(s.note) + '</span>');
    H.push('</div>');
  });
  H.push('</div>');
  H.push('</div></div>');
  return H.join('');
};

/* ---------- 登入 ---------- */
/* ---------- 這一台的資料不對，重新拿一份 ----------

   為什麼要有這一顆：

   種子只在「還是示範資料、而且版本舊了」的時候才重種（見 40-db.js
   的 load）。而 demo 那個旗子在**有人在這台機器上建過帳號的那一刻**
   就關掉了——關掉之後，那份資料永遠不會再被洗，版本號加幾次都一樣。

   那一條是對的：學生真的資料不可以被一次更新洗掉。可是它的副作用是
   ——測過的人會永遠卡在測試那天的那一份。三位老師這幾天都在試，
   星期三每一台上都混著殘留，而他們不會開開發者工具打指令。

   ── 為什麼這一顆不會弄壞全班 ──

   它只做兩件事：把這台機器上那一個 key 刪掉、重新載入。

   關鍵是**中間不呼叫 save()**。推上雲端只發生在 save() 裡
   （見 41-sync.js 的 syncPush），所以刪掉再重載，走的就是一台
   全新機器第一次打開的那條路——而那條路星期三每一個學生都會走。
   雲端一筆都不會少。

   SYNC.last 本來就只活在記憶體裡，重載自己就沒了，不用另外處理。 */
PAGES.fresh = function () {
  var 連得上 = (typeof syncReady === 'function') && syncReady() && SYNC.on;
  var H = [head('這一台', '重新拿一份', '')];

  H.push('<div class="card">');
  H.push('<div class="eyebrow">會發生什麼</div>');
  H.push('<p>清掉這台機器上存的那一份，然後重新載入。</p>');
  H.push('<p class="dim">別人的機器不受影響。這一顆不會刪掉雲端上的任何東西。</p>');
  H.push('</div>');

  H.push('<div class="card">');
  if (連得上) {
    H.push('<div class="eyebrow lit">雲端連得上</div>');
    H.push('<p>班上的東西在雲端，重新載入之後會再拉回來——' +
      '就跟一台新的機器第一次打開一樣。</p>');
  } else {
    H.push('<div class="eyebrow warnx">現在連不上雲端</div>');
    H.push('<p>只存在這一台、還沒上傳的東西會不見。' +
      '等連得上再按，比較安全。</p>');
  }
  H.push('</div>');

  H.push('<div class="row">');
  /* 兩段：先按一次才長出真的那一顆。這一頁上唯一會弄丟東西的動作，
     不該一下就按得到。 */
  if (DRAFT.sure2) {
    H.push(btn('確定，清掉重來', 'freshgo', 'big'));
    H.push(btn('算了', 'go:gate', 'ghost'));
  } else {
    H.push(btn('我要重新拿一份', 'freshask', 'big'));
    H.push(btn('回去', 'go:gate', 'ghost'));
  }
  H.push('</div>');
  return H.join('');
};

ACTS.freshask = function () { DRAFT.sure2 = 1; render(); };

/* 刪掉、重載。中間**不能**呼叫 save()——那會把清空推上雲端。 */
ACTS.freshgo = function () {
  try { localStorage.removeItem(STORE); } catch (e) {}
  location.reload();
};

PAGES.login = function () {
  var H = ['<div class="gate"><div class="gate-box">'];
  /* 隨機一位在旁邊走。挑好的那一個記在 S 上——打字會重畫，
     每敲一個字換一個職業會像壞掉。 */
  if (!S.gw) S.gw = HERO_LIST[Math.floor(Math.random() * HERO_LIST.length)].k;
  var gw = HEROES[S.gw] || HERO;
  H.push('<div class="gate-hd">');
  H.push(head('登入', '你是誰', ''));
  H.push('<span class="gate-walk">' +
    pxTag(gw.walkA, gw.pal, 'wf wa') + pxTag(gw.walkB, gw.pal, 'wf wb') + '</span>');
  H.push('</div>');
  H.push('<div class="card">');
  H.push('<div class="eyebrow">帳號</div>');
  H.push('<input id="lg-acc" value="' + esc(draft('lg-acc')) + '" placeholder="' +
         esc('註冊時取的帳號') + '">');
  H.push('<div class="eyebrow">密碼</div>');
  H.push('<input id="lg-pw" type="password" placeholder="' + esc('密碼') + '">');
  H.push('</div>');
  H.push('<div class="row">');
  H.push(btn('進去', 'login', 'big'));
  H.push(btn('還沒有帳號', 'go:reg', 'ghost'));
  /* 這一台的資料不對的時候的那條路（見 PAGES.fresh）。放在登入頁
     是因為「看到不對的東西」之後最自然的下一步就是登出——而登出
     就會落在這一頁。它不能太顯眼：一整個學期只有極少數人會用到，
     可是用到的那一次沒有它就只能開開發者工具。 */
  H.push(btn('這一台的資料不對', 'go:fresh', 'ghost'));
  H.push('</div>');
  /* ── 試用的資料 ──

     本來這裡是一行字：「學生 stu01 到 stu06」。那一行有兩個問題。

     一 · 它漏掉一半的人。同組的隊友是 stu101 起跳，沒有寫出來，
          所以照著這一行登入的人永遠只會看到自己那一格，
          看不到「一組有幾個人」——而這個系統講的就是那件事。

     二 · 它在真的上課的時候還在。學生第一次打開就看到一串試用帳號，
          那不是招牌，是沒收乾淨的東西。

     改成：照組排，點名字直接進去那個人；有人真的建過帳號就整塊消失。 */
  if ((DB.Config || {}).demo) {
    H.push('<div class="card demo">');
    H.push('<div class="eyebrow">試用的資料</div>');
    H.push('<p class="dim">點一個人就直接用他的身分進去。' +
      '同一組的人看到的是同一條廊道。</p>');
    DB.Teams.forEach(function (t) {
      var mem = where('Users', function (u) {
        return inTeam(u, t.teamId) && u.account;
      });
      if (!mem.length) return;
      H.push('<div class="dm-t"><b>' + esc(t.name) + '</b><div class="dm-r">');
      mem.forEach(function (u) {
        /* 名字後面帶帳號：最後那一句說「帳號就是名字旁邊那一串」，
           不寫出來的話那句話是假的。 */
        H.push(btn(u.name + ' ' + u.account, 'asdemo:' + u.account, 'dm'));
      });
      H.push('</div></div>');
    });
    /* 沒有組的那幾個：老師、研究者，還有那位刻意留白的學生。 */
    var loose = where('Users', function (u) { return u.account && !u.teamId; });
    if (loose.length) {
      H.push('<div class="dm-t"><b>沒有組的</b><div class="dm-r">');
      loose.forEach(function (u) {
        H.push(btn(u.name + ' ' + u.account, 'asdemo:' + u.account, 'dm'));
      });
      H.push('</div></div>');
    }
    H.push('<p class="dim">帳號就是名字旁邊那一串，密碼都是 ' + DEMO_PW + '。</p>');
    H.push('</div>');
  }
  H.push('</div></div>');
  return H.join('');
};

/* ---------- 建立帳號 ----------
   只有學生走這一頁。老師跟研究者的帳號由研究者開，因為那兩種身分
   看得到別人的資料——能自己註冊的話，任何人貼一個加入碼就變成老師了。 */
PAGES.reg = function () {
  var H = ['<div class="gate"><div class="gate-box">'];
  var role = DRAFT.rgRole || 'student';
  H.push(head('建立帳號',
    role === 'teacher' ? '開一個班，或加進同事開好的那一班'
      : role === 'researcher' ? '看得到每一個動作，不進地下城'
        : '先報上你在哪一班', ''));
  /* 身分自己選。本來只開得了學生帳號，老師要找研究者——
     那等於課還沒開始就卡在一個不在現場的人身上。 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">你是</div>');
  H.push('<div class="row sure-row">');
  /* 研究者也在這一排。他要的東西跟老師一樣是一個進得去的帳號——
     使用紀錄那一頁本來就在（見 75-research.js），只是開不出第一個
     研究者帳號來，於是真的開一個班之後那一整端等於不存在。

     代價講清楚：學生也看得到這一顆。點錯了會拿到一個沒有班的帳號，
     一眼就看得出不對，重開一個就好。 */
  [['student', '學生'], ['teacher', '老師'], ['researcher', '研究者']].forEach(function (r) {
    H.push(btn(r[1], 'rgrole:' + r[0], 'sure' + (role === r[0] ? ' on' : '')));
  });
  H.push('</div></div>');
  H.push('<div class="card">');
  if (role === 'student') {
    H.push('<div class="eyebrow">班級加入碼</div>');
    H.push('<input id="rg-code" value="' + esc(draft('rg-code')) + '" placeholder="' +
           esc('六個英數字，跟老師拿') + '">');
  } else if (role === 'researcher') {
    /* 研究者不屬於哪一個班——他那一端是跨班看的，班在頁面上自己挑。 */
  } else {
    /* 老師這一格本來不畫——「他是發碼的人，不該先跟人要碼」。

       那句話對第一位老師是對的，對第二、第三位是錯的：一個班三位
       老師共同帶，後面兩位要進的是同一個班。這一格不畫的話他們會
       各自開一個空班，而且不會知道自己走錯了。

       資料層本來就收（見 15-auth.js 的 actRegister）——只有這一格
       沒畫出來。留空就是開一個新的班，第一位老師的路沒有變。 */
    H.push('<div class="eyebrow">班級加入碼　選填</div>');
    H.push('<input id="rg-code" value="' + esc(draft('rg-code')) + '" placeholder="' +
           esc('跟同事拿') + '">');
    /* 這一句不塞進 placeholder：320 寬的框裡只放得下九個字，
       塞進去會被截掉，而被截掉的正好是「留空會怎樣」。 */
    H.push('<p class="dim">留空就開一個新的班。</p>');
  }
  /* ── 名字 ──

     這一格本來沒有，而 actRegister 沒收到名字就拿帳號頂替
     （name: o.name || acc）。學生用學號註冊，老師的清單上就是
     一整排 b11234567——他分不出誰是誰，而這整套系統立在
     「系統給資訊，人給承認」上，承認要有一個名字。

     排在帳號前面：先問你是誰，再問你怎麼登入。 */
  H.push('<div class="eyebrow">你的名字</div>');
  H.push('<input id="rg-name" value="' + esc(draft('rg-name')) + '" placeholder="' +
         esc('同學跟老師看到的就是這個') + '">');
  H.push('<div class="eyebrow">帳號</div>');
  H.push('<input id="rg-acc" value="' + esc(draft('rg-acc')) + '" placeholder="' +
         esc('至少三個字，登入用') + '">');
  H.push('<div class="eyebrow">密碼</div>');
  H.push('<input id="rg-pw" type="password" placeholder="' + esc('至少四個字') + '">');
  H.push('</div>');
  H.push('<div class="row">');
  H.push(btn('建立', 'reg', 'big'));
  H.push(btn('我有帳號了', 'go:login', 'ghost'));
  H.push('</div>');
  H.push('<p class="dim">' + esc(AUTH_NOTE) + '</p>');
  H.push('</div></div>');
  return H.join('');
};

/* ---------- 老師開班 ----------

   兩條路，跟學生那一頁（PAGES.myteam）同一個形狀：開一個，
   或用別人給的碼加進去。

   本來只有前面那一條，理由是「他是發碼的人，不該跟任何人要碼」。
   那對第一位老師是對的。可是一個班三位老師共同帶，後面兩位
   要進的是同一個班——只有一條路的時候，他們會各自開一個空班。 */
/* ---------- 你的班 ----------

   兩種時候會走到這裡：

     還沒有班　　老師剛註冊完（render 把他丟過來，見 55-ui.js）
     已經有班了　他要換去另一個班，或再加一個

   一個人可以同時在好幾個班（見 40-db.js 的座位那一段）：學生修兩門
   都用這套、老師帶兩班。所以這一頁先列出他已經有的那幾個，
   底下才是加新的。 */
PAGES.mkclass = function () {
  /* 沒登入的時候走不到這一頁（render 會先把人擋在門口），可是
     pages.js 會把每一頁都畫一次來檢查——那時候 me() 是 null。 */
  var u = me();
  if (!u) return PAGES.gate();
  var ss = seatsOf(u);
  var H = ['<div class="gate"><div class="gate-box">'];
  H.push(head('你的班', ss.length ? '現在在哪一個，還有哪幾個' : '開一個，或用別人給的碼加進去', ''));

  /* ── 已經有的那幾個 ── */
  if (ss.length) {
    H.push('<div class="card">');
    H.push('<div class="eyebrow">你在這幾個班裡</div>');
    H.push('<div class="seats">');
    ss.forEach(function (s) {
      var c = find('Classes', function (x) { return x.classId === s.classId; });
      var t = s.teamId ? teamOf(s.teamId) : null;
      var on = s.classId === u.classId;
      H.push('<button class="seat' + (on ? ' on' : '') + '" data-act="run" data-p=\'' +
        esc(JSON.stringify({ a: 'sit:' + s.classId })) + '\'>' +
        '<b>' + esc(c ? c.name : '（找不到這個班）') + '</b>' +
        '<i>' + esc(t ? t.name : (u.role === 'teacher' ? '加入碼 ' + ((c || {}).joinCode || '') : '還沒有組')) + '</i>' +
        (on ? '<u>現在在這裡</u>' : '') + '</button>');
    });
    H.push('</div></div>');
  }

  /* ── 開一個（只有老師）── */
  if (u.role === 'teacher') {
    H.push('<div class="card">');
    H.push('<div class="eyebrow">' + (ss.length ? '再開一個班' : '開一個班') + '</div>');
    H.push('<input id="mk-name" value="" placeholder="' +
      esc('例：114-1 畢業專題') + '">');
    H.push('<p class="dim">開好會給你一組六碼。學生跟另外幾位老師都用那組碼建帳號。</p>');
    H.push(btn('開班', 'mkclass', 'big'));
    H.push('</div>');
  }

  H.push('<div class="card">');
  H.push('<div class="eyebrow">' + (ss.length ? '再加一個班' : '加進已經開好的班') + '</div>');
  H.push('<input id="jc-code" value="' + esc(draft('jc-code')) + '" placeholder="' +
    esc('六個英數字，跟開班的人拿') + '">');
  H.push(btn('加入', 'joinclass', 'big'));
  H.push('</div>');

  H.push('<div class="row">');
  /* 這一班還沒有組的時候，homeFor 回的是「建一隊」——那一頁現在有
     回來的路（見 PAGES.myteam），所以指過去是安全的。 */
  if (ss.length && u.classId) {
    H.push(btn(homeFor(u) === 'myteam' ? '去建這一班的隊' : '回去',
      'go:' + homeFor(u), 'ghost'));
  }
  H.push(btn('登出', 'logout', 'ghost'));
  H.push('</div>');
  H.push('</div></div>');
  return H.join('');
};

/* ---------- 學生組隊 ----------
   建一隊拿代碼，或用代碼進別人建好的那一隊。

   組好了就不能換：任務派給組、紀錄掛在組上，中途換組會讓歷史說謊。
   這一頁因此把話講在前面。 */
PAGES.myteam = function () {
  var H = ['<div class="gate"><div class="gate-box">'];
  H.push(head('你的隊伍', '建一隊，或用代碼加入', ''));

  H.push('<div class="card">');
  H.push('<div class="eyebrow">建一隊</div>');
  H.push('<input id="mk-team" value="" placeholder="' + esc('隊名，例：第三組') + '">');
  H.push('<p class="dim">建好會給你一組六碼，唸給隊友。</p>');
  H.push(btn('建立', 'mkteam', 'big'));
  H.push('</div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">用代碼加入</div>');
  H.push('<input id="jn-code" value="' + esc(draft('jn-code')) + '" placeholder="' +
    esc('六個英數字，跟隊友拿') + '">');
  H.push(btn('加入', 'jointeam', 'big'));
  H.push('</div>');

  H.push('<p class="dim">組好了就不能換——之後每一趟的紀錄都掛在這一隊上。</p>');
  H.push('<div class="row">');
  /* 在好幾個班裡的人，這一頁不是死路：他可能是剛加進這一個班、
     現在想先回去原本那一班。 */
  if (seatsOf(me()).length > 1) H.push(btn('回到你的班', 'go:mkclass', 'ghost'));
  H.push(btn('登出', 'logout', 'ghost'));
  H.push('</div>');
  H.push('</div></div>');
  return H.join('');
};

/* ---------- 門口那幾顆按鈕 ----------

   2026-09-04：這六個曾經整組不見。拿掉名冊那一條路的時候，
   ACTS.claim 跟它旁邊的鄰居一起被刪掉了——而它旁邊坐的是
   登入、建立帳號、開班、建隊、加入。

   結果是前門五顆按鈕全部按下去沒反應：沒有人登得進示範帳號，
   也沒有人開得了班。畫面完全正常，每一頁都畫得出來，
   每一顆按鈕都長得像按鈕——只是後面沒有東西。

   pages.js 當時說「按得到的都接得上」，因為它沒有走門口那三頁
   （那三頁在登入之前，不在它的清單裡）。沒被看的地方就是會出事的地方。 */

ACTS.login = function () {
  var acc = (document.getElementById('lg-acc') || {}).value || '';
  var pw = (document.getElementById('lg-pw') || {}).value || '';
  var r = actLogin(acc, pw);
  if (r.err) { DRAFT['lg-acc'] = acc; return say(r.err); }
  signIn(r.user);
};

ACTS.reg = function () {
  var o = {
    code: (document.getElementById('rg-code') || {}).value || '',
    name: (document.getElementById('rg-name') || {}).value || '',
    account: (document.getElementById('rg-acc') || {}).value || '',
    password: (document.getElementById('rg-pw') || {}).value || '',
    role: (DRAFT.rgRole === 'teacher' || DRAFT.rgRole === 'researcher')
      ? DRAFT.rgRole : 'student'
  };
  var r = actRegister(o);
  if (r.err) {
    DRAFT['rg-code'] = o.code; DRAFT['rg-acc'] = o.account;
    DRAFT['rg-name'] = o.name;
    return say(r.err);
  }
  signIn(r.user);
  say('帳號好了。');
};

ACTS.rgrole = function (r) { DRAFT.rgRole = r; render(); };
/* 點名字就用那個人的身分進去。只有試用資料在的時候，登入頁才畫得出
   這幾顆——有人真的建過帳號，那一整塊就不見了（見 PAGES.login）。 */
ACTS.asdemo = function (acc) {
  var r = actLogin(acc, DEMO_PW);
  if (r.err) return say(r.err);
  signIn(r.user);
};


/* 老師開班。開完就在這個班裡，碼唸給學生。
   本來寫 go('home')——那是學生的首頁，老師的是 radar。
   讓 homeFor 決定，不要在這裡再寫一次規則。 */
ACTS.mkclass = function () {
  var n = (document.getElementById('mk-name') || {}).value || '';
  var r = actNewClass(n, S.who);
  if (r.err) return say(r.err);
  go(homeFor(userOf(S.who)));
  say('開好了。把加入碼唸給學生跟另外幾位老師。');
};

/* 加進同事已經開好的那一班。 */
/* 換去另一個班。換完直接落在那一個班的首頁——留在這一頁的話，
   他會不確定到底換過去了沒有。 */
ACTS.sit = function (classId) {
  var r = actSit(S.who, classId);
  if (r.err) return say(r.err);
  DRAFT = {};
  S.p = {};
  go(homeFor(me()));
};

ACTS.joinclass = function () {
  var c = (document.getElementById('jc-code') || {}).value || '';
  var r = actJoinClass(S.who, c);
  if (r.err) { DRAFT['jc-code'] = c; return say(r.err); }
  go(homeFor(userOf(S.who)));
  say('加進「' + r.klass.name + '」了。');
};

/* 學生建一隊。 */
ACTS.mkteam = function () {
  var n = (document.getElementById('mk-team') || {}).value || '';
  var r = actNewTeam(n, S.who);
  if (r.err) return say(r.err);
  go('who');
  /* 代碼要寫在這一句裡面。

     本來只說「把代碼唸給隊友」，可是接下來那一頁是挑角色，上面
     沒有代碼——他被交代了一件事，而要做那件事的東西不在畫面上。
     代碼在組別卡上，而組別卡排在廊道的最後面（見 60-student.js）。

     這一句就是他建完隊的那一刻唯一會讀的東西，所以代碼放這裡：
     開學第一節課，一個人建隊、其他人拿代碼加入，那是全班同時在做
     的第一件事。 */
  say('隊伍建好了。代碼 ' + r.team.joinCode + '，唸給隊友。');
};

/* 學生用代碼加入。 */
ACTS.jointeam = function () {
  var c = (document.getElementById('jn-code') || {}).value || '';
  var r = actJoinTeam(c, S.who);
  if (r.err) { DRAFT['jn-code'] = c; return say(r.err); }
  go('who');
  say('進來了。');
};

ACTS.logout = function () {
  DB.Session = null;
  save();
  S.who = null;
  go('gate');
};

/* 登入成功之後要去哪。學生還沒有隊就先去建隊——這件事沒做完，
   後面每一頁都不知道要畫哪一組。 */
function signIn(u) {
  S.who = u.userId;
  DB.Session = u.userId;
  save();
  DRAFT = {};
  go(homeFor(u));
}

function homeFor(u) {
  if (u.role === 'researcher') return 'rs';
  if (u.role === 'teacher') return 'radar';
  if (!u.teamId) return 'myteam';
  return 'home';
}
