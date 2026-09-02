/* 門口：還沒登入之前看得到的每一頁。

   四頁，一頁只問一件事：

     gate   這是什麼、你要登入還是建帳號
     login  帳號密碼
     reg    加入碼 → 帳號密碼（學生自己開；老師與研究者的帳號由研究者開）
     claim  你是名冊上的誰

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
    [ICONS.home, '說幾天'], [ICONS.pack, '去做事'],
    [ICONS.radar, '交出去看結果'], [ICONS.eco, '看全班在哪']
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
  H.push('<p class="dim">順序每一個班隨機洗一次。走完六層回到第一層。</p>');
  H.push('</div></div>');
  return H.join('');
};

/* ---------- 登入 ---------- */
PAGES.login = function () {
  var H = ['<div class="gate"><div class="gate-box">'];
  H.push(head('登入', '你是誰', ''));
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
  H.push('<p class="dim">試用的帳號：學生 stu01 到 stu05、老師 tea01、研究者 lab01，' +
         '密碼都是 ' + DEMO_PW + '。</p>');
  H.push('</div></div>');
  return H.join('');
};

/* ---------- 建立帳號 ----------
   只有學生走這一頁。老師跟研究者的帳號由研究者開，因為那兩種身分
   看得到別人的資料——能自己註冊的話，任何人貼一個加入碼就變成老師了。 */
PAGES.reg = function () {
  var H = ['<div class="gate"><div class="gate-box">'];
  H.push(head('建立帳號', '先報上你在哪一班',
    '加入碼跟老師拿。老師與研究者的帳號不從這裡開——請研究者幫你建。'));
  H.push('<div class="card">');
  H.push('<div class="eyebrow">班級加入碼</div>');
  H.push('<input id="rg-code" value="' + esc(draft('rg-code')) + '" placeholder="' +
         esc('六個英數字，跟老師拿') + '">');
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

/* ---------- 認領身分 ----------
   登入了但還沒對上名冊。這一頁不能跳過——沒有組別，就不知道要畫哪一條廊道。 */
PAGES.claim = function () {
  var u = me();
  var free = freeRoster(u.classId);
  var H = ['<div class="gate"><div class="gate-box">'];
  H.push(head('你是誰', '從名冊上點自己',
    '點一下就好，不用打字。點錯了找研究者解開，再點一次。'));

  if (!free.length) {
    H.push('<div class="card dim">這個班的名冊還沒貼，或是名字都被認領完了。' +
           '找老師或研究者確認一次。</div>');
    H.push(btn('登出', 'logout', 'ghost'));
    H.push('</div></div>');
    return H.join('');
  }

  /* 照組別分堆。同一組的名字排在一起，找自己比較快。 */
  var byTeam = {};
  free.forEach(function (r) {
    (byTeam[r.teamName] = byTeam[r.teamName] || []).push(r);
  });
  Object.keys(byTeam).forEach(function (name) {
    H.push('<div class="card">');
    H.push('<div class="eyebrow">' + esc(name) + '</div>');
    H.push('<div class="tags">');
    byTeam[name].forEach(function (r) {
      H.push('<button class="tag" data-act="run" data-p=\'' +
        esc(JSON.stringify({ a: 'claim:' + r.rosterId })) + '\'>' +
        esc(r.memberName) + '</button>');
    });
    H.push('</div></div>');
  });
  H.push(btn('登出', 'logout', 'ghost'));
  H.push('</div></div>');
  return H.join('');
};

/* ---------- 門口的動作 ---------- */

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
    role: 'student'
  };
  var r = actRegister(o);
  if (r.err) {
    DRAFT['rg-code'] = o.code; DRAFT['rg-acc'] = o.account;
    return say(r.err);
  }
  signIn(r.user);
  say('帳號好了。接下來從名冊上點自己是誰。');
};

ACTS.claim = function (rosterId) {
  var r = actClaim(S.who, rosterId);
  if (r.err) return say(r.err);
  go('home');
  say('對上了。這一條廊道從現在起是你們的。');
};

ACTS.logout = function () {
  DB.Session = null;
  save();
  S.who = null;
  go('gate');
};

/* 登入成功之後要去哪。學生還沒認領就先去認領——這件事沒做完，
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
  if (!u.teamId) return 'claim';
  return 'home';
}
