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
  H.push('<p class="tagline">化身勇者，進行規劃，突破專案地下城！！</p>');

  /* 進去那兩顆放在第一屏，不要捲。 */
  H.push('<div class="row">');
  H.push(btn('登入', 'go:login', 'big'));
  H.push(btn('我是新的', 'go:reg', 'ghost'));
  H.push('</div>');

  /* 一趟就這四件事。四個圖示一排，不寫成一段話。 */
  H.push('<div class="four">');
  [
    [ICONS.home, '規劃天數'], [ICONS.pack, '進行任務'],
    [ICONS.radar, '回報進度'], [ICONS.eco, '查看全班']
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
  H.push('<p class="dim">試用的帳號：學生 stu01 到 stu06、老師 tea01、研究者 lab01，' +
         '密碼都是 ' + DEMO_PW + '。</p>');
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
