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
  H.push('<h1>專案地下城' + (RULES.SOLO ? ' B' : '') + '</h1>');
  /* 一句話說完這是什麼。不是說明，是招牌上那一行。 */
  /* 招牌上那一行。本來是「化身勇者」——勇者是一個身分，
     而這個世界裡你的身分是「接委託的人」，三拍剛好就是那一圈：
     接下來、說幾天、走完它。 */
  H.push('<p class="tagline">接下委託，規劃天數，走完專案地下城' + (RULES.SOLO ? ' B' : '') + '！！</p>');

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
/* 有沒有開口要看示範帳號。

   網址帶 ?demo 或 #demo 才給（見登入頁那一段）。學生拿到的是乾淨的
   網址，所以他們看不到那一串帳號；要展示的人自己加得上去。

   讀不到 location 的時候回 false——寧可少畫，不要在測試或別的環境裡
   自己冒出來。 */
function demoAsked() {
  try {
    var s = String(location.search || '') + String(location.hash || '');
    return /(^|[?&#])demo\b/.test(s);
  } catch (e) { return false; }
}

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
  /* 兩格都接 Enter：打完帳號按 Enter 習慣上是換到下一格，
     這裡的下一格只有密碼，所以兩格都直接送出——不用特別去點那顆鍵。 */
  H.push('<div class="eyebrow">帳號</div>');
  H.push('<input id="lg-acc" value="' + esc(draft('lg-acc')) + '" placeholder="' +
         esc('註冊時取的帳號') +
         '" onkeydown="if(event.key===\'Enter\'){event.preventDefault();ACTS.login();}">');
  H.push('<div class="eyebrow">密碼</div>');
  H.push('<input id="lg-pw" type="password" placeholder="' + esc('密碼') +
         '" onkeydown="if(event.key===\'Enter\'){event.preventDefault();ACTS.login();}">');
  H.push('</div>');
  H.push('<div class="row">');
  H.push(btn('進去', 'login', 'big'));
  H.push(btn('還沒有帳號', 'go:reg', 'ghost'));
  H.push(btn('忘記密碼', 'go:forgotpw', 'ghost'));
  /* 這一台的資料不對的時候的那條路（見 PAGES.fresh）。

     ── 它不再印給學生看 ──

     本來的理由是「用到的那一次沒有它就只能開開發者工具」，而它擺在
     登入頁上，因為看到不對的東西之後最自然的下一步就是登出。

     可是那一顆做的事是**把這台機器上的東西清掉再重載**。學生不會需要
     它——他的機器上本來就沒有舊資料；而看得到的時候，它是這一頁上
     唯一一個看起來像「出事了才會用到」的東西，等於在登入頁上放一句
     「這東西有時候會壞」。

     收進 ?demo（跟示範帳號同一個開關，見底下）：要展示、要重置的人
     自己加得上去，學生拿到的網址是乾淨的。功能一點都沒動。 */
  if (demoAsked()) H.push(btn('這一台的資料不對', 'go:fresh', 'ghost'));
  H.push('</div>');
  /* ── 試用的資料 ──

     本來這裡是一行字：「學生 stu01 到 stu06」。那一行有兩個問題。

     一 · 它漏掉一半的人。同組的隊友是 stu101 起跳，沒有寫出來，
          所以照著這一行登入的人永遠只會看到自己那一格，
          看不到「一組有幾個人」——而這個系統講的就是那件事。

     二 · 它在真的上課的時候還在。學生第一次打開就看到一串試用帳號，
          那不是招牌，是沒收乾淨的東西。

     改成：照組排，點名字直接進去那個人；有人真的建過帳號就整塊消失。

     ── 而它預設不畫了 ──

     「有人建過帳號就消失」擋不住真的上課那一天：每一台機器的第一眼
     都是還沒有人註冊的狀態，所以二十個學生打開登入頁，第一個看到的
     東西就是十七組帳號跟一行「密碼都是 1234」。

     那不是招牌，是沒收乾淨的東西——而且它會蓋掉真正該被看到的那兩顆
     （登入、我是新的）。

     所以改成要開口才給：網址後面帶 ?demo（或 #demo）才畫。
     示範資料本身一點都沒動，它還在、還是分開的（見 demo.js），
     只是不再自己跳出來說「這裡有帳號可以用」。

     要展示的時候（口試、給人看）就開 ?demo；學生拿到的是乾淨的網址。 */
  if ((DB.Config || {}).demo && demoAsked()) {
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

/* ---------- 忘記密碼 ----------

   沒有信箱、沒有後端，「打對現在那一個密碼」以外唯一驗得出「是本人」
   的東西，是註冊那一刻給的救援碼（見 15-auth.js 的 actRecoverPw）。
   有這組碼就救得回來；沒有——帳號是這個功能上線前註冊的，或碼真的
   弄丟了——那就真的救不回來，只能重新註冊。

   兩條路都要講清楚，不能讓人以為這一頁一定救得回來。 */
PAGES.forgotpw = function () {
  var H = ['<div class="gate"><div class="gate-box">'];
  H.push(head('忘記密碼', '有救援碼就救得回來', ''));

  H.push('<div class="card">');
  H.push('<div class="eyebrow">用救援碼換新密碼</div>');
  H.push('<p class="dim">註冊那一刻給過你一組碼，抄下來或截圖收著的那一組。</p>');
  H.push('<input id="fp-acc" value="' + esc(draft('fp-acc')) + '" placeholder="帳號">');
  H.push('<input id="fp-code" value="' + esc(draft('fp-code')) + '" placeholder="救援碼，例：KX7M-3PQR-9WZT">');
  H.push('<input id="fp-pw" type="password" placeholder="新密碼，' + esc(RULES.pwRule()) + '">');
  H.push('<input id="fp-pw2" type="password" placeholder="新密碼，再輸入一次">');
  H.push(btn('換新密碼', 'recoverpw', 'big'));
  H.push('</div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">沒有救援碼</div>');
  H.push('<p>先問老師能不能幫你補發一組——老師看得到你的帳號、' +
    '補得出救援碼，但看不到、也不會碰到你的密碼本身。' +
    '真的找不到老師，或這個帳號真的已經救不回來，' +
    '才重新註冊一個新帳號，再回去找老師說一聲你是哪一位。</p>');
  H.push('</div>');

  H.push('<div class="row">');
  H.push(btn('重新註冊', 'go:reg', 'ghost'));
  H.push(btn('回登入', 'go:login', 'ghost'));
  H.push('</div>');
  H.push('</div></div>');
  return H.join('');
};

ACTS.recoverpw = function () {
  var acc = (document.getElementById('fp-acc') || {}).value || '';
  var code = (document.getElementById('fp-code') || {}).value || '';
  var pw = (document.getElementById('fp-pw') || {}).value || '';
  var pw2 = (document.getElementById('fp-pw2') || {}).value || '';
  if (pw !== pw2) {
    DRAFT['fp-acc'] = acc; DRAFT['fp-code'] = code;
    return say('兩次密碼不一樣。再輸入一次。');
  }
  var r = actRecoverPw(acc, code, pw);
  if (r.err) {
    DRAFT['fp-acc'] = acc; DRAFT['fp-code'] = code;
    return say(r.err);
  }
  /* 跟註冊一樣：直接登進去，但先看新的救援碼再往下走。 */
  S.who = r.user.userId;
  DB.Session = r.user.userId;
  save();
  go('rgcode', { recov: r.recov });
};

/* ---------- 救援碼：註冊完只畫這一次 ----------

   密碼救不回來，但救援碼可以——前提是他這一刻把它收好。系統自己
   只存雜湊，這一頁是它唯一被印成明碼的地方，離開這一頁之後系統
   自己也讀不到它了。所以這裡不接受「先跳過」：按下去才算看過。 */
PAGES.rgcode = function () {
  /* 老師幫學生補發的那一組，畫面上要講清楚這串碼是給誰的、
     不是老師自己的——不然老師會以為這是他自己帳號的救援碼。 */
  var forAcc = S.p.forAccount;
  var H = ['<div class="gate"><div class="gate-box">'];
  H.push(head('救援碼', forAcc ? '抄給本人，不要自己留著' : '收好它，這是密碼救不回來時唯一的路', ''));
  H.push('<div class="card">');
  if (forAcc) {
    H.push('<div class="eyebrow">給「' + esc(forAcc) + '」的救援碼</div>');
    H.push('<p class="quote big recov-code">' + esc(S.p.recov || '') + '</p>');
    H.push('<p class="warn-block">把這組碼交給本人，讓他自己去「忘記密碼」換新密碼——' +
      '你不會看到他換成什麼。這一頁離開之後，系統自己也讀不到這串碼了。</p>');
  } else {
    H.push('<div class="eyebrow">忘記密碼的時候，用這一組碼自己換新密碼</div>');
    H.push('<p class="quote big recov-code">' + esc(S.p.recov || '') + '</p>');
    H.push('<p class="warn-block">拍下來或抄下來，收在密碼以外的地方。' +
      '弄丟它，跟忘記密碼一樣，這個帳號就救不回來了。</p>');
  }
  H.push('</div>');
  H.push('<div class="row">');
  H.push(btn('我收好了，繼續', 'rgcodeok', 'big'));
  H.push('</div>');
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
     那等於課還沒開始就卡在一個不在現場的人身上。

     ── 但這一排本來三顆等重 ──

     全班同時註冊那一天，二十幾個學生看到的第一排選項是「學生／老師／
     研究者」三顆一樣大——手滑點錯一顆，拿到的是一個沒有班的帳號，
     自己看不出哪裡不對，還得回頭重開一次。

     改成預設收起來，只留學生要走的欄位；老師跟研究者（一堂課三個人）
     改用一條不搶眼的連結展開，跟「忘記密碼」那種例外路徑同一個份量。 */
  var showRole = DRAFT.rgShowRole || role !== 'student';
  H.push('<div class="card">');
  if (showRole) {
    H.push('<div class="eyebrow">你是</div>');
    H.push('<div class="row sure-row">');
    [['student', '學生'], ['teacher', '老師'], ['researcher', '研究者']].forEach(function (r) {
      H.push(btn(r[1], 'rgrole:' + r[0], 'sure' + (role === r[0] ? ' on' : '')));
    });
    H.push('</div>');
  } else {
    H.push('<a class="plain" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'rgshowrole' })) + '\'>' + esc('我是老師或研究者') + '</a>');
  }
  H.push('</div>');
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
         esc('至少 ' + RULES.ACC_MIN + ' 個字，登入用') + '">');
  /* ── 密碼要打兩次 ──

     這一頁沒有「忘記密碼」那條路：帳號存在瀏覽器裡，密碼是雜湊過的，
     沒有任何地方救得回來（見 15-auth.js）。所以打錯一個字的代價不是
     「再登入一次」，是那個帳號**再也進不去**——而他打的時候看到的
     全是圓點。

     兩格是為了那件事，不是為了嚴謹。兩格不一樣就擋在這裡，
     擋在他按下建立之前。

     ── 警語搬到密碼欄位上面 ──

     本來印在送出鍵下面、跟「密碼」眉標一樣的灰階字——後果最重的
     那句話反而讀起來最不起眼。搬到打密碼之前先看到，顏色借用
     判定裡「要注意」那一階（--over），跟其他警語同一套語言。 */
  H.push('<p class="warn-block">' + esc(AUTH_NOTE) + '</p>');
  H.push('<div class="eyebrow">密碼</div>');
  H.push('<input id="rg-pw" type="password" placeholder="' + esc(RULES.pwRule()) + '">');
  /* 眉標不寫「再打一次」：那四個字剛從這個作品裡拿掉（老師退回之後
     學生那一顆鍵），check.js 也擋著。同一個字串在同一套介面裡指兩件
     不同的事，下一個讀的人要猜。 */
  H.push('<div class="eyebrow">再一次</div>');
  H.push('<input id="rg-pw2" type="password" placeholder="' + esc('跟上面那一格一樣') +
         '" onkeydown="if(event.key===\'Enter\'){event.preventDefault();ACTS.reg();}">');
  H.push('</div>');
  H.push('<div class="row">');
  H.push(btn('建立', 'reg', 'big'));
  H.push(btn('我有帳號了', 'go:login', 'ghost'));
  H.push('</div>');
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
    H.push('<input id="mk-name" value="' + esc(draft('mk-name')) + '" oninput="DRAFT[\'mk-name\']=this.value" placeholder="' +
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
  H.push('<input id="mk-team" value="' + esc(draft('mk-team')) + '" oninput="DRAFT[\'mk-team\']=this.value" placeholder="' + esc('隊名，例：第三組') + '">');
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
  /* 兩格不一樣就停在這裡。

     擋在 actRegister 前面，不是在資料層——資料層不該知道畫面上有
     幾個密碼欄。它收到的永遠是一個已經確認過的密碼。

     那三格（碼、名字、帳號）留著，密碼兩格清掉：他要重打的就是密碼，
     而留著半個打錯的密碼只會讓他看著兩排一樣長的圓點猜哪一格錯了。 */
  var pw2 = (document.getElementById('rg-pw2') || {}).value || '';
  if (o.password !== pw2) {
    DRAFT['rg-code'] = o.code; DRAFT['rg-acc'] = o.account;
    DRAFT['rg-name'] = o.name;
    render();
    /* 不寫「再打一次」：那四個字被 check.js 擋著（見上面眉標那一段）。 */
    return say('兩次密碼不一樣。再輸入一次。');
  }
  var r = actRegister(o);
  if (r.err) {
    DRAFT['rg-code'] = o.code; DRAFT['rg-acc'] = o.account;
    DRAFT['rg-name'] = o.name;
    return say(r.err);
  }
  /* 跟 signIn 做一樣的事（登進去、記這台機器不再是示範狀態），
     但不像 signIn 直接送去首頁——先送去救援碼那一頁，逼他看過
     那組碼再往下走。 */
  S.who = r.user.userId;
  DB.Session = r.user.userId;
  save();
  go('rgcode', { recov: r.recov });
};

ACTS.rgcodeok = function () {
  var u = me();
  if (!u) return go('gate');
  go(homeFor(u));
  say('帳號好了。');
};

ACTS.rgrole = function (r) { DRAFT.rgRole = r; render(); };
ACTS.rgshowrole = function () { DRAFT.rgShowRole = true; render(); };
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
  if (r.err) { DRAFT['mk-name'] = n; return say(r.err); }
  DRAFT['mk-name'] = '';
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
  if (r.err) {
    if (!ACTS.joinclass._retried) {
      ACTS.joinclass._retried = 1;
      say('正在找⋯⋯');
      setTimeout(function () {
        ACTS.joinclass._retried = 0;
        var r2 = actJoinClass(S.who, c);
        if (r2.err) { DRAFT['jc-code'] = c; say(r2.err); }
        else { go(homeFor(userOf(S.who))); say('加進「' + r2.klass.name + '」了。'); }
      }, 2000);
      return;
    }
    ACTS.joinclass._retried = 0;
    DRAFT['jc-code'] = c;
    return say(r.err);
  }
  go(homeFor(userOf(S.who)));
  say('加進「' + r.klass.name + '」了。');
};

/* 學生建一隊。 */
ACTS.mkteam = function () {
  var n = (document.getElementById('mk-team') || {}).value || '';
  var r = actNewTeam(n, S.who);
  if (r.err) { DRAFT['mk-team'] = n; return say(r.err); }
  DRAFT['mk-team'] = '';
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

/* 學生用代碼加入。
   找不到的時候等兩秒再試一次：教室裡二十幾台同時上線，建隊那一筆
   可能還在路上。只重試一次——真的打錯了就不要讓他一直等。 */
ACTS.jointeam = function () {
  var c = (document.getElementById('jn-code') || {}).value || '';
  var r = actJoinTeam(c, S.who);
  if (r.err) {
    if (!ACTS.jointeam._retried) {
      ACTS.jointeam._retried = 1;
      say('正在找⋯⋯');
      setTimeout(function () {
        ACTS.jointeam._retried = 0;
        var r2 = actJoinTeam(c, S.who);
        if (r2.err) { DRAFT['jn-code'] = c; say(r2.err); }
        else { go('who'); say('進來了。'); }
      }, 2000);
      return;
    }
    ACTS.jointeam._retried = 0;
    DRAFT['jn-code'] = c;
    return say(r.err);
  }
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

/* ---------- 你的資料 ----------

   2026-09-09：在此之前這個系統沒有這一頁——帳號建好之後，名字跟密碼
   都是定死的（見 15-auth.js 的 actSetName 那一段）。

   為什麼是一頁不是兩頁：名字跟密碼是同一件事的兩半（「這個帳號是誰、
   他怎麼進來」），拆成兩格側欄會讓兩件小事各佔一個位置。可是**主要
   動作只能有一個**（read.js 在量），所以這一頁的大鍵是換名字，
   換密碼是一顆指過去的小鍵，到它自己那一頁去做。

   三種角色共用。跟登出同一個理由：改自己的名字這件事不該因為身分
   而長在不同的地方。 */
PAGES.me = function () {
  /* pages.js 會把每一頁都畫一次來檢查，那時候 me() 是 null
     （同 PAGES.mkclass 的理由）。 */
  var u = me();
  if (!u) return PAGES.gate();
  var H = ['<div class="gate"><div class="gate-box">'];
  H.push(head('你的資料', '改名字，或換密碼', ''));

  H.push('<div class="card">');
  H.push('<div class="eyebrow">你的名字</div>');
  H.push('<input id="me-name" value="' + esc(u.name || '') + '" placeholder="' +
    esc('同學跟老師看到的就是這個') + '">');
  H.push(btn('換名字', 'setname', 'big'));
  H.push('</div>');

  /* 帳號印出來但改不動。印它是因為忘記帳號跟忘記密碼一樣常見，
     而這一頁是他唯一會來找的地方。 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">你的帳號</div>');
  H.push('<p class="lead">' + esc(u.account || '') + '</p>');
  H.push('<p class="dim">帳號改不了——你登入時打的就是這一串。</p>');
  H.push('</div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">密碼</div>');
  H.push('<p class="dim">' + esc(AUTH_NOTE) + '</p>');
  H.push(btn('換密碼', 'go:pw', ''));
  H.push('</div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">救援碼</div>');
  if (u.recovHash) {
    H.push('<p class="dim">你已經有一組救援碼。忘記密碼的時候，' +
      '用它就能自己換一個新密碼，不用重新註冊、不會弄丟組別跟紀錄。</p>');
    H.push(btn('換一組新的', 'genrecov', ''));
  } else {
    /* 這個帳號是救援碼上線之前註冊的，沒有這組碼——這一格要比
       換密碼那一格顯眼，因為少了它，忘記密碼就真的救不回來了。 */
    H.push('<p class="warn-block">你的帳號還沒有救援碼。' +
      '一旦忘記密碼，現在唯一的路是重新註冊——組別跟之前的紀錄接不回來。</p>');
    H.push(btn('產生救援碼', 'genrecov', ''));
  }
  H.push('</div>');

  /* 只有老師看得到——幫現場認出來的學生補發救援碼（見 15-auth.js
     的 actTeacherRecov 跟 CLAUDE.md 2026-09-23 那一段）。 */
  if (u.role === 'teacher') {
    H.push('<div class="card">');
    H.push('<div class="eyebrow">幫學生補發救援碼</div>');
    H.push('<p class="dim">學生忘記密碼、又沒有救援碼的時候，' +
      '你能幫他補發一組——你只會看到這組碼，不會看到他換成什麼密碼。</p>');
    H.push(btn('幫學生補發', 'go:acctrecov', ''));
    H.push('</div>');

    H.push('<div class="card">');
    H.push('<div class="eyebrow">接回重複註冊的帳號</div>');
    H.push('<p class="dim">學生忘記密碼、以前只能重新註冊，' +
      '現在手上有兩個帳號的話，這裡幫他把舊帳號的隊伍接回現在在用的帳號。</p>');
    H.push(btn('接回', 'go:acctmerge', ''));
    H.push('</div>');
  }

  H.push('<div class="row">');
  H.push(btn('回去', 'go:' + homeFor(u), 'ghost'));
  H.push('</div>');
  H.push('</div></div>');
  return H.join('');
};

/* 換密碼自己一頁。

   「先打現在的」不是形式：這一版沒有後端也沒有信箱，帳號就在這台
   瀏覽器裡，打得出現在那一個是唯一驗得出「是不是本人」的方法。 */
PAGES.pw = function () {
  var u = me();
  if (!u) return PAGES.gate();
  var H = ['<div class="gate"><div class="gate-box">'];
  H.push(head('換密碼', '先打現在的，再打新的', ''));
  H.push('<div class="card">');
  H.push('<div class="eyebrow">現在的密碼</div>');
  H.push('<input id="pw-old" type="password" placeholder="' +
    esc('你現在在用的那一個') + '">');
  /* 換完記不記得住，關係到救不救得回來。這句話要在他按下去之前就
     看到——搬到新密碼欄位前面、換上跟建立帳號那一頁一樣的警語樣式，
     這句的後果一樣重，不該因為在哪一頁而看起來比較不起眼。 */
  H.push('<p class="warn-block">換完要記得。忘記的話，有救援碼才救得回來——' +
    '沒有救援碼就只能重新註冊，組別跟紀錄接不回來（見「你的資料」）。</p>');
  H.push('<div class="eyebrow">新的密碼</div>');
  H.push('<input id="pw-new" type="password" placeholder="' +
    esc(RULES.pwRule()) + '">');
  /* 眉標寫「再一次」，跟建立帳號那一頁同一個字（見 PAGES.reg
     那一段：同一個字串在同一套介面裡不該指兩件事）。 */
  H.push('<div class="eyebrow">再一次</div>');
  H.push('<input id="pw-new2" type="password" placeholder="' +
    esc('跟上面那一格一樣') +
    '" onkeydown="if(event.key===\'Enter\'){event.preventDefault();ACTS.setpw();}">');
  H.push('</div>');
  H.push('<div class="row">');
  H.push(btn('換密碼', 'setpw', 'big'));
  H.push(btn('回去', 'go:me', 'ghost'));
  H.push('</div>');
  H.push('</div></div>');
  return H.join('');
};

/* 老師這一班的學生，一人一顆——跟派任務「發給誰」同一種選法
   （見 70-teacher.js 的 teams.forEach 那一段）。名字寫大字，
   帳號跟在底下當小字：點的時候認的是名字，帳號只是拿去比對。 */
function studentTags(classId, act, picked) {
  /* 合併過的舊帳號不列進來——它跟被接回去的新帳號通常同名（本來就是
     同一個人重複註冊），留著只會讓老師選錯，選到一個誰都登不進去、
     接了隊伍也沒有意義的死帳號（見 15-auth.js 的 actMergeAccount）。 */
  var stu = where('Users', function (x) {
    return x.role === 'student' && x.classId === classId && !x.mergedInto;
  }).sort(function (a, b) { return a.name === b.name ? 0 : (a.name < b.name ? -1 : 1); });
  if (!stu.length) return '<p class="dim">這一班還沒有學生。</p>';
  var H = ['<div class="tags">'];
  stu.forEach(function (x) {
    H.push('<button class="tag' + (picked === x.account ? ' on' : '') +
      '" data-act="run" data-p=\'' + esc(JSON.stringify({ a: act + ':' + x.account })) +
      '\'>' + esc(x.name) +
      '<small style="display:block;opacity:.6;font-size:22px">' + esc(x.account) + '</small>' +
      '</button>');
  });
  H.push('</div>');
  return H.join('');
}

/* ---------- 老師幫學生補發救援碼 ----------

   選完人不是直接發：補發會把這個帳號原本那組救援碼直接作廢
   （見 15-auth.js 的 actTeacherRecov），如果他其實已經有一組能用的，
   等於白白燒掉一把還有效的鑰匙。跟接回帳號一樣先問一次再做。 */
PAGES.acctrecov = function () {
  var u = me();
  if (!u || u.role !== 'teacher') return PAGES.gate();
  var H = ['<div class="gate"><div class="gate-box">'];
  H.push(head('幫學生補發救援碼', '點一位學生', ''));

  if (DRAFT.arConfirm && DRAFT.arAcc) {
    var picked = find('Users', function (x) { return x.account === DRAFT.arAcc; });
    H.push('<div class="card">');
    H.push('<div class="eyebrow warnx">確定嗎</div>');
    if (picked && picked.recovHash) {
      H.push('<p class="dim">「' + esc(picked ? picked.name : DRAFT.arAcc) + '」（' + esc(DRAFT.arAcc) +
        '）已經有一組救援碼——補發會讓那一組直接失效，換成新的這一組。</p>');
    } else {
      H.push('<p class="dim">幫「' + esc(picked ? picked.name : DRAFT.arAcc) + '」（' + esc(DRAFT.arAcc) +
        '）發一組新的救援碼。</p>');
    }
    H.push(btn('對，發給他', 'acctrecov', 'big'));
    H.push(btn('還沒，再檢查一次', 'arundo', 'ghost'));
    H.push('</div>');
  } else {
    H.push('<div class="card">');
    H.push('<p class="dim">發完把碼交給他本人，讓他自己去「忘記密碼」換新密碼。</p>');
    H.push(studentTags(u.classId, 'arpick', DRAFT.arAcc));
    H.push('</div>');
    if (DRAFT.arAcc) {
      H.push('<div class="row">');
      H.push(btn('幫「' + DRAFT.arAcc + '」發救援碼', 'archeck', 'big'));
      H.push('</div>');
    }
  }
  H.push('<div class="row">');
  H.push(btn('回去', 'go:me', 'ghost'));
  H.push('</div>');
  H.push('</div></div>');
  return H.join('');
};

ACTS.arpick = function (acc) { DRAFT.arAcc = acc; render(); };
ACTS.archeck = function () { DRAFT.arConfirm = true; render(); };
ACTS.arundo = function () { DRAFT.arConfirm = false; render(); };

ACTS.acctrecov = function () {
  var r = actTeacherRecov(S.who, DRAFT.arAcc);
  if (r.err) return say(r.err);
  go('rgcode', { recov: r.recov, forAccount: r.user.account });
};

/* ---------- 老師把重複註冊的兩個帳號接回同一個人 ----------

   跟補發救援碼一樣點名字選，不用打帳號——選錯人的防線不是靠打字
   這一關，是靠底下那張「確定嗎」：兩個名字都攤開來，按下去之前
   還有一次看清楚的機會（見 ACTS.acctmergecheck 下面那一段）。 */
PAGES.acctmerge = function () {
  var u = me();
  if (!u || u.role !== 'teacher') return PAGES.gate();
  var H = ['<div class="gate"><div class="gate-box">'];
  H.push(head('接回重複註冊的帳號', '把舊帳號的隊伍接到現在在用的帳號', ''));

  /* 二次確認：這是這次會話新加的功能裡風險最高的一個動作——
     一按下去就換掉一個帳號的隊伍歸屬，還可能連帶收掉一支隊，
     而且沒有回頭路（跟救援碼不一樣，救援碼按錯了最多是白發一組
     沒有人用的碼；這裡按錯是真的把人接錯隊）。跟「我們做完了」
     同一個道理，只是這裡風險更高，用同一套先問後做的樣式。 */
  if (DRAFT.mergeConfirm) {
    var oldU = find('Users', function (x) { return x.account === DRAFT.amOld; });
    var newU = find('Users', function (x) { return x.account === DRAFT.amNew; });
    H.push('<div class="card">');
    H.push('<div class="eyebrow warnx">確定嗎</div>');
    H.push('<p class="dim">「' + esc(newU ? newU.name : DRAFT.amNew) + '」（' + esc(DRAFT.amNew) +
      '）現在坐的那一組，會換成「' + esc(oldU ? oldU.name : DRAFT.amOld) + '」（' + esc(DRAFT.amOld) +
      '）原本那一組跟那些紀錄。如果「' + esc(DRAFT.amNew) + '」原本那一組沒有別人，' +
      '那一組會被收掉。按下去之前，再確認一次這兩個是不是同一個人。</p>');
    H.push(btn('對，接回去', 'acctmerge', 'big'));
    H.push(btn('還沒，再檢查一次', 'acctmergeundo', 'ghost'));
    H.push('</div>');
  } else {
    H.push('<div class="card">');
    H.push('<p class="dim">兩邊都要跟本人當面對過，不是憑印象選。</p>');
    H.push('<div class="eyebrow">舊帳號　有隊伍跟紀錄的那一個</div>');
    H.push(studentTags(u.classId, 'ampickold', DRAFT.amOld));
    H.push('<div class="eyebrow" style="margin-top:14px">新帳號　他現在登入用的那一個</div>');
    H.push(studentTags(u.classId, 'ampicknew', DRAFT.amNew));
    if (DRAFT.amOld && DRAFT.amNew) H.push(btn('接回', 'acctmergecheck', 'big'));
    H.push('</div>');
  }
  H.push('<div class="row">');
  H.push(btn('回去', 'go:me', 'ghost'));
  H.push('</div>');
  H.push('</div></div>');
  return H.join('');
};

ACTS.ampickold = function (acc) { DRAFT.amOld = acc; render(); };
ACTS.ampicknew = function (acc) { DRAFT.amNew = acc; render(); };

ACTS.acctmergecheck = function () {
  var oldAcc = DRAFT.amOld, newAcc = DRAFT.amNew;
  if (!oldAcc || !newAcc) return say('兩個帳號都要選。');
  if (oldAcc === newAcc) return say('這是同一個帳號，選別的。');
  DRAFT.mergeConfirm = true;
  render();
};
ACTS.acctmergeundo = function () { DRAFT.mergeConfirm = false; render(); };

ACTS.acctmerge = function () {
  var r = actMergeAccount(S.who, DRAFT.amOld, DRAFT.amNew);
  if (r.err) { DRAFT.mergeConfirm = false; return say(r.err); }
  go('me');
  say('接回去了。「' + r.newUser.account + '」現在坐著「' + r.oldUser.account + '」原本那一組。');
};

ACTS.genrecov = function () {
  var r = actGenRecov(S.who);
  if (r.err) return say(r.err);
  /* 跟註冊一樣：先看過再往下走，不是用 say() 一閃而過——
     這串碼只有這一次看得到，flash 訊息留不住它。 */
  go('rgcode', { recov: r.recov });
};

ACTS.setname = function () {
  var v = (document.getElementById('me-name') || {}).value || '';
  var r = actSetName(S.who, v);
  if (r.err) return say(r.err);
  render();
  say('改好了。');
};

ACTS.setpw = function () {
  var o = (document.getElementById('pw-old') || {}).value || '';
  var a = (document.getElementById('pw-new') || {}).value || '';
  var b = (document.getElementById('pw-new2') || {}).value || '';
  /* 兩格不一樣就擋在這裡，不進資料層——同建立帳號那一頁的理由：
     資料層不該知道畫面上有幾個密碼欄，它收到的永遠是一個
     已經確認過的密碼。 */
  if (a !== b) return say('兩次新密碼不一樣。再輸入一次。');
  var r = actSetPw(S.who, o, a);
  if (r.err) return say(r.err);
  go('me');
  say('密碼換好了。下次用新的登入。');
};
