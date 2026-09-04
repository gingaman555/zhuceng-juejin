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

  /* 一趟就這四件事。四個圖示一排，不寫成一段話。 */
  H.push('<div class="four">');
  [
    /* 四個字說完一圈：接下來、說幾天、交出去、拿到錢。
       本來是「規劃天數／進行任務／回報進度／查看全班」——
       四個功能名，四件不連起來的事。 */
    [ICONS.home, '接下委託'], [ICONS.pack, '規劃天數'],
    [ICONS.radar, '交件回報'], [ICONS.eco, '拿到金幣']
  ].forEach(function (x, i) {
    if (i) H.push('<i class="fr-a"></i>');
    H.push('<div class="fr">' + pxTag(x[0], ICON_ON, 'fr-px') +
      '<b>' + esc(x[1]) + '</b></div>');
  });
  H.push('</div>');

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
        return u.teamId === t.teamId && u.account;
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
  H.push(head('建立帳號', role === 'teacher' ? '開一個班，把碼唸給學生' : '先報上你在哪一班', ''));
  /* 身分自己選。本來只開得了學生帳號，老師要找研究者——
     那等於課還沒開始就卡在一個不在現場的人身上。 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">你是</div>');
  H.push('<div class="row sure-row">');
  [['student', '學生'], ['teacher', '老師']].forEach(function (r) {
    H.push(btn(r[1], 'rgrole:' + r[0], 'sure' + (role === r[0] ? ' on' : '')));
  });
  H.push('</div></div>');
  H.push('<div class="card">');
  if (role === 'student') {
    H.push('<div class="eyebrow">班級加入碼</div>');
    H.push('<input id="rg-code" value="' + esc(draft('rg-code')) + '" placeholder="' +
           esc('六個英數字，跟老師拿') + '">');
  }
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
   他是那個發碼的人，所以他不跟任何人要碼——他自己開一個，然後唸出去。 */
PAGES.mkclass = function () {
  var H = ['<div class="gate"><div class="gate-box">'];
  H.push(head('開一個班', '取個名字就好', ''));
  H.push('<div class="card">');
  H.push('<div class="eyebrow">班名</div>');
  H.push('<input id="mk-name" value="" placeholder="' + esc('例：114-1 專題') + '">');
  H.push('</div>');
  H.push('<p class="dim">開好之後會給你一組六碼。學生用那組碼建自己的帳號。</p>');
  H.push('<div class="row">');
  H.push(btn('開班', 'mkclass', 'big'));
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
  H.push(btn('登出', 'logout', 'ghost'));
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
    account: (document.getElementById('rg-acc') || {}).value || '',
    password: (document.getElementById('rg-pw') || {}).value || '',
    role: DRAFT.rgRole === 'teacher' ? 'teacher' : 'student'
  };
  var r = actRegister(o);
  if (r.err) {
    DRAFT['rg-code'] = o.code; DRAFT['rg-acc'] = o.account;
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
  say('開好了。把加入碼唸給學生。');
};

/* 學生建一隊。 */
ACTS.mkteam = function () {
  var n = (document.getElementById('mk-team') || {}).value || '';
  var r = actNewTeam(n, S.who);
  if (r.err) return say(r.err);
  go('who');
  say('隊伍建好了。把代碼唸給隊友。');
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
