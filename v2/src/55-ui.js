/* 畫面的底：字串拼 HTML、一個路由、一次重畫。

   沒有覆寫層，也沒有模板補丁——每一個畫面就是一支函式，
   改一句話只要改一個地方。 */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function nl(s) { return esc(s).replace(/\n/g, '<br>'); }

/* 一開始沒有人登入。S.who 是 null 的時候只走得到門口那幾頁。 */
var S = { who: null, page: 'gate', p: {}, flash: null };

/* 沒按送出的東西不會進資料表，但重畫的時候要留著。 */
var DRAFT = {};
function draft(id, fallback) { return DRAFT[id] != null ? DRAFT[id] : (fallback || ''); }

/* 動了拆件，第 2 步那個數字要重新算一次。

   DRAFT.est 是他在第 2 步自己按出來的（見 60-student.js 的 est）。
   拆件一改，要徑就變了——這裡不清掉的話，他回上一步改了件、再往下走，
   看到的還是改件**之前**那個數字，而底下那一句會說「那幾件加起來是
   N 天」，N 已經是新的了，畫面上兩個數字當場對不上。

   清掉就是回到「算出來的那一個」。他要再調一次就再調一次——
   調整是他的，不是一個要幫他記住的設定。 */
function planEstReset() { DRAFT.est = null; }



function go(page, p) {
  if (typeof stopAnim === 'function') stopAnim();
  if (typeof stopOS === 'function') stopOS();
  /* 換場。render 是直接換掉 innerHTML，所以本來換頁是瞬間的——
     瞬間切換是網頁的手感，遊戲換場一定有東西掃過去。

     旗子放在 S 上，畫完就收；一次事件，不是一個狀態。
     只有 go 才掃，render 不掃——不然打一個字就掃一次。 */
  S.wipe = 1;
  /* 上一頁是誰。放大看一位委託人之後要回得去原本那一頁——
     從廊道點進去的回廊道，從圖鑑點進去的回圖鑑。 */
  if (page !== S.page) S.prev = S.page;
  S.page = page; S.p = p || {}; S.flash = null; DRAFT = {};
  /* 「一次開好幾件」的隊伍（見 ACTS.commitall）只在承諾頁之間接力，
     離開承諾頁就散了。 */
  if (page !== 'commit') { S.queue = null; S.queueN = 0; }
  setTimeout(function () {
    S.wipe = 0;
    var w = document.querySelector('.wrap');
    if (w) w.classList.remove('wipe');
  }, 200);
  /* 登入那一頁旁邊走過去的那一位，換頁就忘掉——下次進來重挑一個。
     不清的話它會跟著整個工作階段，「每次」就變成「開一次網頁一次」。 */
  S.gw = null;
  window.scrollTo(0, 0);
  render();
}
function me() { return S.who ? userOf(S.who) : null; }
function isTeacher() { var u = me(); return !!u && u.role === 'teacher'; }

/* 一顆鍵上放得下的名字。負責人那一顆只有一格寬，
   所以取最後兩個字——同一組裡通常就分得出來了。 */
function shortWho(id) {
  /* 全組一起做的那一件（見 40-db.js 的 WHO_ALL）。 */
  if (typeof isAll === 'function' && isAll(id)) return '全體';
  var u = id ? userOf(id) : null;
  if (!u) return '？';
  var n = String(u.name || u.account || '').trim();
  return n.length > 3 ? n.slice(-2) : (n || '？');
}
function myTeam() { var u = me(); return u ? teamOf(u.teamId) : null; }

/* 首頁那一條「你不在的這幾天」看過就記下來，不然每次進來都再喊一次。
   記在畫完之後，所以這一次還看得到。

   蓋掉之前先接住上一次的時間，整個連線都留著（SEEN_CUT）。
   班級地下城拿它來標「你不在的時候別人留下的」——不接住的話，
   走過首頁再切過去，圖上就一個新的都沒有了。 */
var SEEN_CUT = null;
/* 這一趟翻開圖鑑要亮哪幾個。

   算一次就存著，離開圖鑑才放掉。不存的話換一個分頁就沒了——
   markCodex 在第一次畫完就把名單記起來，第二次畫就算不出新的了，
   而分頁上那顆點正好是在叫他換分頁。 */
var FRESH = null;

/* 老師勾了那一張，按掉的記在這裡。

   跟 SEEN_CUT 一樣是一次使用的範圍，不寫進資料庫——它要回答的是
   「這一次進來看過了沒」，而不是「這件事發生過沒」。 */
var OKGOT = {};

function seen() {
  /* 翻開圖鑑就把「上次有幾隻」記下來。記在畫完之後，所以這一次
     翻開還看得到那幾隻新的標記。 */
  if (S.page === 'codex' && S.who) markCodex(me());
  else FRESH = null;
  if (S.page !== 'home' || !S.who) return;
  if (SEEN_CUT === null) {
    var u = userOf(S.who);
    SEEN_CUT = (u && u.seenAt) || 0;
  }
  markSeen(S.who);
}

/* 哪一種身分走得到哪一頁。

   這不是裝飾。研究者看得到全班的紀錄、老師看得到別組的進度——
   路由如果不擋，改一下網址就變成別人。 */
/* fresh 也算門口那一種：那一顆是「登出之後發現這台不對」才會按的，
   而登出就落在門口。放在這裡同時擋掉一件事——登入著的時候走不到它，
   所以它不可能在做到一半的時候被誤觸（見 58-gate.js 的 PAGES.fresh）。 */
var GATE_PAGES = { gate: 1, login: 1, reg: 1, fresh: 1, forgotpw: 1 };
/* 分頁標題。開好幾個分頁同時用（老師審核、學生自己那台）的時候，
   瀏覽器的分頁列上原本全部長一樣，選不出哪一個是哪一個。
   短名字就好——這裡不是在講故事，是在講「這是哪一頁」。 */
var PAGE_TITLE = {
  gate: '登入', login: '登入', reg: '建立帳號', fresh: '資料不對', forgotpw: '忘記密碼',
  rgcode: '救援碼', acctrecov: '補發救援碼', acctmerge: '接回帳號', rspw: '換密碼',
  mkclass: '開班', myteam: '建隊', me: '你的資料', pw: '換密碼',
  home: '廊道', sign: '認領', commit: '接委託', ask: '委託人',
  stamp: '判定', exit: '結案', eco: '班級地下城', classeco: '班級地下城',
  pack: '故事', codex: '圖鑑', crew: '隊伍', patron: '委託人',
  person: '角色', who: '挑角色', battle: '交作業', story: '故事',
  radar: '老師端', review: '審核', askest: '回天數', ms: '派任務', mslist: '已派任務', tclose: '結案', rsacc: '刪帳號',
  rs: '名單', events: '紀錄'
};
function pageTitle(page) {
  var n = PAGE_TITLE[page];
  return (n ? n + '｜' : '') + '專案地下城' + (RULES.SOLO ? ' B' : '');
}
/* 這兩頁不在側欄上，是路由自己插進來的（見 render）。 */
var PAGE_ROLE = {
  home: 'student', commit: 'student', stamp: 'student',
  eco: 'student', pack: 'student',
  battle: 'student',
  exit: 'student', codex: 'student', sign: 'student', who: 'student',
  patron: 'student',
  radar: 'teacher', review: 'teacher', ms: 'teacher', mslist: 'teacher', tclose: 'teacher', classeco: 'teacher', acctrecov: 'teacher', acctmerge: 'teacher',
  rs: 'researcher', events: 'researcher', rspw: 'researcher', rsacc: 'researcher'
};
function allowed(u, page) {
  var need = PAGE_ROLE[page];
  return !need || need === u.role;
}

function head(eyebrow, title, lead) {
  return '<div class="eyebrow">' + esc(eyebrow) + '</div>' +
    '<h1>' + esc(title) + '</h1>' +
    (lead ? '<p class="lead">' + nl(lead) + '</p>' : '');
}

/* 一條「你在第幾步」。

   加這個是因為第一次打開會不知道要做什麼：畫面很乾淨，但乾淨到看不出
   自己站在哪。它不是教學，是位置——亮著的那一格就是現在輪到你的。

     steps  [[標題, 副標], …]
     at     現在在第幾格（0 起算；-1 代表都不在） */
function stepBar(steps, at) {
  var H = ['<div class="steps">'];
  steps.forEach(function (s, i) {
    H.push('<div class="step' + (i === at ? ' on' : (i < at ? ' past' : '')) + '">' +
      '<b>' + (i + 1) + '</b>' +
      '<div><i>' + esc(s[0]) + '</i>' + (s[1] ? '<em>' + esc(s[1]) + '</em>' : '') + '</div>' +
      '</div>');
  });
  H.push('</div>');
  return H.join('');
}

/* 像素圖標籤。所有的圖都走這一支——沒有第二種畫圖的方式。 */
function pxTag(px, pal, cls) {
  return '<img class="px ' + (cls || '') + '" src="' + pxSvg(px, pal, false) + '" alt="">';
}

/* ── 一趟是這樣走的 ──

   四個字說完一圈。門口那一頁跟故事第二頁用的是同一個——

   同一件事講兩次要長一樣。學生在門口看過一次「接下委託 → 規劃天數
   → 交件回報 → 拿到水晶」，進來之後在故事裡看到的如果是另外五句話，
   那是兩份要各自記的東西；看到同一條，那是同一份看第二次。

   認知負荷最省的一段，是他已經記過的那一段。 */
function loopStrip() {
  var H = ['<div class="four">'];
  [
    [ICONS.home, '接下委託'], [ICONS.pack, '規劃天數'],
    [ICONS.radar, '交件回報'], [ICONS.eco, '拿到水晶']
  ].forEach(function (x, i) {
    if (i) H.push('<i class="fr-a"></i>');
    H.push('<div class="fr">' + pxTag(x[0], ICON_ON, 'fr-px') +
      '<b>' + esc(x[1]) + '</b></div>');
  });
  H.push('</div>');
  return H.join('');
}

/* 一位委託人。兩張幀疊起來輪流亮——跟角色同一套（見 57-viz.css 的
   wkA／wkB）。他站在那裡等你，不是一張貼在牆上的圖。

   換幀比角色慢很多：角色 .44s 是腳步，委託人 1.5～2.3 秒是呼吸。
   快慢由名字決定，所以同一位每次都是同一種呼吸法，而一整層的人
   不會同時起伏。 */
/* 還沒解鎖的那一張：同一張圖，全部塗成同一個暗色。

   形狀留著，其餘都不給。形狀本身就是那一格要說的話——
   「這裡有一位，你還沒遇到他」。名字跟那一句形容留到解鎖那一天，
   不然圖鑑第一天就被讀完了，之後只剩把格子點亮。 */
var SHADE = '#2A323D';
function shadePal(pal) {
  var out = {};
  Object.keys(pal || {}).forEach(function (k) { out[k] = SHADE; });
  return out;
}

function patTag(c, pal, cls, big) {
  if (!c) return '';
  /* big 是放大那一頁用的那一張：36×24，格子多 2.3 倍。
     兩張都跑同一套呼吸，所以放大之後還是同一個人在呼吸。 */
  var a = big && c.big ? c.big : c.px;
  var b = big && c.big ? c.big2 : c.px2;
  if (!a) return '';
  if (!b) return pxTag(a, pal, cls);
  var ms = [1500, 1900, 2300][hash(String(c.n) + 'p') % 3];
  return '<span class="pat" style="--pt:' + ms + 'ms">' +
    pxTag(a, pal, (cls || '') + ' wf wa') +
    pxTag(b, pal, (cls || '') + ' wf wb') + '</span>';
}

/* 按鈕。act 是「動作:參數」的字串，全部收在 ACTS 裡。 */
function btn(label, act, kind) {
  return '<button class="btn ' + (kind || '') + '" data-act="run" data-p="' +
    esc(JSON.stringify({ a: act })) + '">' + esc(label) + '</button>';
}

/* 那一句話是誰說的。查不到就回空字串——舊的紀錄沒有 wordBy，
   那時候照舊只印那一句話，不要印一個空的署名。 */
function saidBy(id) {
  var u = id ? userOf(id) : null;
  return u ? u.name : '';
}

/* 老師那一句話加上署名。收下、退回、往下捲的紀錄三個地方共用一個。

   一個班三位老師共同帶，沒有署名的話學生讀到的是「系統說的」，
   而這整個作品立在「系統給資訊，人給承認」上——承認要有一個人。 */
function wordBlock(run, cls) {
  var who = saidBy(run.wordBy);
  return '<p class="quote ' + cls + '">' +
    (who ? '<b>' + esc(who) + '</b>' : '') + nl(run.word) + '</p>';
}

/* 那一趟談過什麼。

   兩邊的數字都留著：他一個人的時候說幾天、老師說幾天、最後訂幾天。
   這是「雙方都有妥協」唯一看得到的地方，也是判定那兩個數字的來歷——
   少了它，談過跟沒談過的兩趟在畫面上長得一模一樣。

   沒談過就回空字串。 */
function negoLine(r, you) {
  if (!r || !r.askAt) return '';
  var u = r.askBy ? userOf(r.askBy) : null;
  /* 「一開始說的」不管談完有沒有改，都是承諾那一刻的那個數字——
     r.estU／r.estN 記的正是那一刻的原始單位，協商只改 r.est，
     不會覆蓋這兩欄（見 40-db.js 的 actCommit／actAnswerAsk）。
     談完最後定的數字一律是天，不用管單位。 */
  var firstDays = r.estFirst == null ? r.est : r.estFirst;
  var first = esc(r.estU && r.estU !== 'd' && r.estN != null
    ? r.estN + ' ' + estUnit(r.estU).name
    : firstDays + ' 天');
  return '<p class="dim nego">' + (you ? '你說 ' : '他們說 ') + first +
    '　·　' + esc(u ? u.name : '老師') + ' 說 ' + r.askEst + ' 天' +
    (r.askAns ? '　·　最後 ' + r.est + ' 天' + (r.estFirst == null ? '（維持）' : '')
      : '　·　還沒回') + '</p>';
}

/* ---------- 路由 ---------- */

var PAGES = {};

function render() {
  var u = me();

  /* 資料庫不收這一頁寫的東西（見 41-sync.js 的 blockedHtml）：整頁換掉，
     不管在哪一頁、有沒有登入。 */
  if (typeof SYNC !== 'undefined' && (SYNC.blocked || SYNC.cover)) {
    document.title = '請重新打開｜專案地下城';
    document.getElementById('app').innerHTML = blockedHtml();
    return;
  }

  /* 畫之前先把 HERO 指到這個人挑的那一套。二十幾個地方在讀 HERO，
     而它們讀的時機都在畫面要畫的時候——所以一個地方指，全部跟著換。
     （剖面圖是例外：那一頁一次畫五組，見 xsShaft。） */
  HERO = heroOf(u);

  /* 沒登入：只有門口那幾頁，而且沒有側欄也沒有頂條——
     還不知道你是誰的時候，畫面上不該有任何「你的」東西。 */
  if (!u) {
    if (!GATE_PAGES[S.page]) S.page = 'gate';
    document.title = pageTitle(S.page);
    document.getElementById('app').innerHTML =
      '<div class="main"><div class="wrap' + (S.wipe ? ' wipe' : '') + '">' +
      (S.flash ? flashBar() : '') + PAGES[S.page]() + '</div></div>';
    return;
  }

  /* 救援碼：註冊或用救援碼換完密碼，一定會先經過這一頁，不論這個人
     有沒有班、有沒有隊——跟 mkclass 那一格一樣要放在兩道門前面，
     不然剛註冊、還沒有隊的學生會被 myteam 攔住，永遠看不到這一頁。 */
  if (S.page === 'rgcode') {
    document.title = pageTitle('rgcode');
    document.getElementById('app').innerHTML =
      '<div class="main"><div class="wrap' + (S.wipe ? ' wipe' : '') + '">' +
      (S.flash ? flashBar() : '') + PAGES.rgcode() + '</div></div>';
    return;
  }

  /* 學生還沒對上名冊：先認領，別的哪裡都去不了。
     沒有組別的話，不知道要畫哪一條廊道——側欄跟頂條也一樣，
     它們每一格都在講「你的組」，這時候還沒有那個東西。 */
  /* 老師還沒有班：先開一個。他是發碼的人，不該卡在別人身上。 */
  /* ── 「你的班」永遠走得進去 ──

     底下那兩道門是「還沒有班／還沒有隊就哪裡都不能去」，那對第一次
     進來的人是對的。可是加了第二個班之後會踩到這個坑：

       小美在 A 班有一組 → 加進 B 班 → B 班還沒有組
       → render 把她強制送到「建一隊」
       → 那一頁只有建立／加入／登出　**再也回不去 A 班**

     她被自己加的那個班困住了。所以這一頁要在兩道門前面放行——
     她是特地按進來換班的，不是走錯路。 */
  if (S.page === 'mkclass') {
    document.title = pageTitle('mkclass');
    document.getElementById('app').innerHTML =
      '<div class="main"><div class="wrap' + (S.wipe ? ' wipe' : '') + '">' +
      (S.flash ? flashBar() : '') + PAGES.mkclass() + '</div></div>';
    return;
  }
  if (u.role === 'teacher' && !u.classId) {
    document.title = pageTitle('mkclass');
    document.getElementById('app').innerHTML =
      '<div class="main"><div class="wrap' + (S.wipe ? ' wipe' : '') + '">' +
      (S.flash ? flashBar() : '') + PAGES.mkclass() + '</div></div>';
    S.page = 'mkclass';
    return;
  }
  /* 學生還沒有隊：建一隊，或用代碼加入。只有這一條路。

     名冊那一條拿掉了——兩條路並存的時候舊的優先，所以只要有人
     貼了名冊，新的建隊頁就再也不會出現。 */
  if (u.role === 'student' && !u.teamId) {
    document.title = pageTitle('myteam');
    document.getElementById('app').innerHTML =
      '<div class="main"><div class="wrap' + (S.wipe ? ' wipe' : '') + '">' +
      (S.flash ? flashBar() : '') + PAGES.myteam() + '</div></div>';
    S.page = 'myteam';
    return;
  }
  if (GATE_PAGES[S.page]) S.page = homeFor(u);

  if (!PAGES[S.page] || !allowed(u, S.page)) S.page = homeFor(u);

  document.title = pageTitle(S.page);
  var body = PAGES[S.page]();
  /* 畫完才記，所以這一次還看得到那一條。 */
  seen();
  document.getElementById('app').innerHTML =
    sideBar() + '<div class="main">' + topBar() + demoBar() +
    '<div class="wrap' + (S.wipe ? ' wipe' : '') + '">' + (S.flash ? flashBar() : '') + body + '</div></div>';

  /* 走廊比視窗長的時候，重畫預設回到最左邊——那樣按完推進會看到
     走廊變了卻看不到自己動。鏡頭跟著人走。 */
  if (typeof scrollScene === 'function') scrollScene();
  /* 那一場要花幾秒鐘發生。結果是算好的，這裡只負責演。 */
  if (typeof battleRun === 'function') battleRun();
  /* 那一閃收尾。用 JS 不用動畫——動畫的時鐘會被凍住
     （背景分頁、省電），那時候白色會一直蓋在圖上。 */
  setTimeout(function () {
    var f = document.querySelectorAll('.pxflash');
    for (var i = 0; i < f.length; i++) {
      if (f[i].parentNode) f[i].parentNode.removeChild(f[i]);
    }
  }, 520);
}

function flashBar() {
  return '<div class="flash">' + esc(S.flash) + '</div>';
}
/* say() 自己重畫。本來要記得先 say 再 render——順序寫反訊息就永遠不出現，
   而且那是一種只有測試才抓得到的錯。讓它自己負責。 */
function say(m) { S.flash = m; render(); }

/* ---------- 複製到剪貼簿 ----------

   兩條路：新的 navigator.clipboard（需要 https，本站是），
   舊的 execCommand（給不給的瀏覽器都有可能）。兩條都不行的時候
   要說出來——按了沒反應比沒有那一顆更糟。

   成功的那一句用 say()，跟全站其他回饋同一個地方出現。 */
function copyText(t) {
  t = String(t == null ? '' : t);
  if (!t) return;
  function 好() { say('複製了。'); }
  function 舊() {
    try {
      var ta = document.createElement('textarea');
      ta.value = t;
      ta.style.position = 'fixed';
      ta.style.top = '-999px';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      var okd = document.execCommand('copy');
      document.body.removeChild(ta);
      if (okd) 好(); else 不行();
    } catch (e) { 不行(); }
  }
  function 不行() { say('這台瀏覽器不讓網頁複製。那一行可以自己選起來。'); }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(好, 舊);
      return;
    }
  } catch (e) { }
  舊();
}

/* ---------- 收進圖鑑的那一下 ----------

   打贏了、或老師勾了，圖鑑就多一個。但那件事本來只在圖鑑那一頁才看得到，
   而他不一定會去翻——一個要自己去找的獎勵，在拿到的那一刻等於沒有發生。

   所以在拿到的當下先喊一次。一張卡，三行：哪一種、叫什麼名字、收到哪去了。
   兩個地方共用同一張（打完的戰鬥、老師勾完的首頁），因為它們是同一件事。

   砸下來的手法跟出發那一下一樣（見 53-scene.css 的 goslam）：
   steps()、由大縮到定位、不做淡入。 */
function regCard(eye, name, note, art, over) {
  return '<div class="reg' + (over ? ' over' : '') + '"><div class="reg-in">' +
    '<i class="reg-eye">' + esc(eye) + '</i>' +
    (art || '') +
    '<b class="reg-n">' + esc(name) + '</b>' +
    '<em class="reg-s">' + esc(note) + '</em>' +
    '</div></div>';
}

/* 頂條右邊那一段。三種角色共用——登出在哪裡不該因為身分而不同，
   而且側欄在手機會變成底下那一列，放在那裡會被擠掉。

   ── 「你的資料」也在這裡 ──

   2026-09-09 加的，同一個理由：改自己的名字跟換密碼不該因為身分而
   長在不同的地方。側欄放不下——兩邊的側欄都刻意只有三格，而且那兩段
   註解寫著理由（多一格就是多一件他要煩惱的事）。

   排在登出前面：兩顆都是「離開現在在做的事」，可是按錯的代價不一樣
   ——按到你的資料只是換一頁，按到登出要重打一次密碼。 */
function topEnd() {
  /* 同步失敗的時候，三種角色都要看得到——學生自己交的東西、
     老師剛勾的可以、研究者要匯出的資料，任何一種悄悄留在本機
     沒上雲都不該被畫面遮住（見 41-sync.js 的 syncTrouble）。
     平常（ok／off）不顯示：這一條只在「要注意」的時候才出現。 */
  var ss = (typeof syncStatus === 'function') ? syncStatus() : 'ok';
  var warn = ss === 'err'
    ? '<span class="sync-warn">還沒傳到雲端，會自動再試一次</span>' : '';
  /* 這台分頁開很久、程式碼是舊版的時候（見 41-sync.js 的
     checkFresh）——按下去就整頁重新載入，不用另外做動作。
     這一條比同步失敗更該搶眼一點：舊程式碼不只是這一筆資料的事，
     是這台分頁接下來每一個動作都可能踩到已經修過的 bug。 */
  /* 兩種提醒（見 41-sync.js 的 syncNotice）：剛部署（有期限）、太久沒更新（沒那麼急）。 */
  var nt = (typeof syncNotice === 'function') ? syncNotice() : null;
  var stale = nt
    ? '<a class="plain sync-warn' + (nt.kind === 'old' ? ' sync-old' : '') + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'reloadpage' })) + '\'>' + esc(nt.text) + '</a>' : '';
  return warn + stale + '<a class="plain" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'go:me' })) + '\'>你的資料</a>' +
    '<a class="plain" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'logout' })) + '\'>登出</a>';
}

function classOf(u) {
  return find('Classes', function (c) { return c.classId === u.classId; }) || DB.Classes[0] || { name: '' };
}

function topBar() {
  var u = me();
  if (u.role === 'researcher') {
    return '<div class="top">' +
      '<span class="badge r">研究者</span>' +
      '<span class="who">' + esc(u.name) + '</span>' +
      '<span class="sp"></span>' +
      /* 這三個數字要跟名單那一頁對得上——都不算示範資料。

         本來直接數 DB，所以示範那一班跟十七個示範帳號一起算進去，
         而這一條在研究者的**每一頁**上都印著（名單那一頁修好了，
         這一條沒有，於是同一個畫面上兩個數字互相打臉：頁首寫 19 個
         帳號，內容列出 2 個）。

         紀錄數用 eventsOf(現在這一班)，跟紀錄那一頁看到的是同一份。 */
      '<span>' + rsUsers().length + ' 個帳號　·　' + rsClasses().length + ' 個班　·　' +
        eventsOf(rsClassId()).length + ' 筆紀錄</span>' + topEnd() +
      '</div>';
  }
  if (u.role === 'teacher') {
    var r = radar(u.classId, u.userId);
    return '<div class="top">' +
      '<span class="badge t">老師端</span>' +
      '<span class="who">' + esc(u.name) + '</span>' +
      '<span class="sp"></span>' +
      /* 全班幾組。三位老師共同帶一個班，沒有「我帶的那幾組」這回事，
         寫「我帶」會讓他以為別的組不歸他管。 */
      '<span>' + esc(classOf(u).name) + '　·　全班 ' +
        teamsUnder(u.classId, u.userId).length + ' 組</span>' +
      '<span>' + (r.length ? r.length + ' 件等你看' : '沒有等你的') + '</span>' + topEnd() +
      '</div>';
  }
  /* 學生的頂條做成 HUD：招牌、隊伍、所在的層、深度。
     一排文字讀起來是網站的狀態列；掛上招牌那張圖之後，
     它讀起來是角色身上的東西。 */
  var t = myTeam();
  var st = stallOf(t.teamId);
  var z = zoneNow(t.teamId);
  return '<div class="top hud z-' + z.key + '">' +
    pxTag(signOf(t.teamId).px, signOf(t.teamId).pal, 'hud-sign') +
    '<span class="who">' + esc(t.name) + '</span>' +
    /* 專案名點得進招牌。名字最大的地方就是改名字的入口——
   本來只有廊道最底下那個小圖示能進去。 */
'<a class="hud-pj pressable" data-act="run" data-p=\'' +
  esc(JSON.stringify({ a: 'go:sign' })) + '\'>' +
  esc(t.project || '（還沒定）') + '</a>' +
    '<span class="sp"></span>' +
    '<span class="hud-z">' + esc(z.name) + '</span>' +
    '<span class="hud-d' + (st.level ? ' warnx' : '') + '">' +
      (depthOf(t.teamId) * WORLD.depthPerMilestone) + ' m</span>' + topEnd() +
    '</div>';
}

/* 這一台機器上還是不是示範資料。

   seed() 開著這個旗子，actRegister 關掉它——有人真的在這台機器上
   建過一次帳號，這份資料就不再是示範資料了（見 40-db.js 的 load）。 */
function isDemo() { return !!(DB && DB.Config && DB.Config.demo); }

/* 而且整份資料裡沒有任何一筆是真的。

   兩道門不一樣，是因為有第三種狀態：這台機器自己還是示範資料
   （沒有人在這裡註冊過），但雲端已經有真的班了，而同步會把那些
   真帳號拉下來跟示範資料混在一起。

   那時候 isDemo() 還是 true，可是「整班重來」會呼叫 seed()，
   而 seed() 第一行是 DB = blank()——連那些真的紀錄一起清掉，
   然後同步把清空推上去。全班的資料在每一台機器上一起消失。

   所以會動到資料與時間的那兩顆，用的是這一道嚴格的門。 */
function isPureDemo() {
  if (!isDemo()) return false;
  var cols = ['Users', 'Classes', 'Teams', 'Milestones', 'Runs', 'Pushes', 'Keeps'];
  for (var i = 0; i < cols.length; i++) {
    var a = DB[cols[i]] || [];
    for (var j = 0; j < a.length; j++) if (a[j] && !a[j]._d) return false;
  }
  return true;
}

/* 試用列：切換身分、把時間往前推、整班重來。

   2026-09-05：它本來每一頁都畫，不分是不是示範資料。真的開一個班
   之後那三顆還在，而那是三個都會出事的東西：

     切換身分   學生點一下就變成老師，收下自己的作業
     往前推一天 CLOCK 是算「實際花幾天」的來源，推了就等於改判定
     整班重來   reset 直接呼叫 seed()，而 seed() 第一行是 DB = blank()。
                加上雲端同步之後，那個清空會被推上去——一個學生按一下，
                全班的資料在每一個人的機器上一起消失。

   所以：有人真的註冊過就整條不畫。示範資料那一份完全沒變，
   要展示、要走完兩邊，照舊。 */
function demoBar() {
  /* ── 2026-09-09：使用者在自己的手機上看到這一條 ──

     本來這裡用的是 isDemo()，而 isDemo() 讀的是 DB.Config.demo——那支
     旗標**存在每一台機器自己的 localStorage 裡**，而且全站只有一個地方
     關得掉它：actRegister（在這台機器上註冊）。

     所以在電腦上註冊、在手機上登入的人，手機那一台的旗標還是 1，
     整條試用列照畫。學生登入之後第一眼看到的是一個寫著「試用」的列，
     裡面是十七個身分的下拉選單，包含「老師·孟」跟「研究者」。

     那跟 ?demo 也無關：?demo（demoAsked）管的是登入頁的示範帳號清單
     與重置鍵，這一條走的是另一道門，乾淨網址上照樣畫。

     改用 isPureDemo()：這台機器上只要有任何一筆真的資料——自己註冊的，
     或雲端同步下來的——整條就不畫。那本來就是底下那兩顆按鈕在用的
     判準（見 forward / reset），現在「看得到」跟「按得動」一致了：
     不會再有一顆按下去只會回你「這裡有真的資料」的鍵擺在畫面上。 */
  if (!isPureDemo()) return '';
  /* 只列示範帳號。雲端拉下來的真帳號不進這個選單——
     不然這一格就是「學生點一下變成老師」。 */
  var opts = DB.Users.filter(function (u) { return u._d; }).map(function (u) {
    var t = u.teamId ? teamOf(u.teamId) : null;
    return '<option value="' + u.userId + '"' + (u.userId === S.who ? ' selected' : '') + '>' +
      esc(t ? t.name : u.name) + '</option>';
  }).join('');
  return '<div class="demo">' +
    '<b>試用</b><span>切換身分</span>' +
    '<select data-act="who">' + opts + '</select>' +
    '<span class="sp" style="flex:1"></span>' +
    '<a class="plain" data-act="run" data-p=\'{"a":"forward"}\'>把時間往前推一天</a>' +
    '<a class="plain" data-act="run" data-p=\'{"a":"reset"}\'>整班重來</a>' +
    '</div>';
}

/* 導覽格子的字。

   手機底部四格各 75px 寬，「發派任務」「各組進度」被切成「發派任／務」
   「各組進／度」（2026-09-30 截圖）。四、五個字的在中間放一個零寬空格，
   配合 CSS 的 word-break:keep-all（見 59-mobile.css），寬度夠就一行，
   不夠就從中間折成兩個字＋兩個字。有括號的（等你的（1））不動。 */
function navLabel(s) {
  s = String(s);
  if (s.indexOf('（') >= 0 || s.length < 4) return s;
  return s.slice(0, 2) + '\u200b' + s.slice(2);
}

function sideBar() {
  var u = me();
  var nav, headBlock;
  if (u.role === 'researcher') {
    headBlock = '<div class="side-head"><div class="k">LAB</div>' +
      '<div class="n">' + esc(u.name) + '</div>' +
      '<div class="s">帳號與紀錄</div></div>';
    nav = [['rs', '名單'], ['events', '紀錄']];
  } else if (u.role === 'teacher') {
    var kl = classOf(u);
    /* 點得進去換班。多一個班的時候才寫幾個——只有一個的時候
       那個數字是雜訊。 */
    var ns = seatsOf(u).length;
    headBlock = '<button class="side-head pressable" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'go:mkclass' })) + '\'><div class="k">TEACHER</div>' +
      '<div class="n">' + esc(u.name) + '</div>' +
      '<div class="s">' + esc(kl.name) + ' · 加入碼 ' +
      esc(kl.joinCode) + (ns > 1 ? '　·　' + ns + ' 個班' : '') + '</div></button>';
    /* 老師只有三件事，側欄就只有三格——多一格就是多一件他要煩惱的事。

       出口不另外開一格：它跟審核在那一頁上切換，數字併進來。
       那一格因此不叫「審核」——審核是頁面裡兩個切換的其中一個，
       同一個詞當兩種範圍會讓「審核（5）」點進去變成「審核（4）」。
       叫它頁面真正在講的事：有幾件在等你。 */
    var wait = radar(u.classId).length;
    var waitExit = exitQueue(u.classId).length;
    /* 結案獨立一格，放在最下面（第三個元素 'low'）：一學期一次的事，
       不跟一週好幾次的審核擺在一起（2026-09-30，老師們會按錯）。 */
    nav = [
      ['radar', '等你的' + (wait ? '（' + wait + '）' : '')],
      ['ms', '發派任務'],
      ['mslist', '已派任務'],
      ['classeco', RULES.SOLO ? '每一位' : '各組進度'],
      ['tclose', '結案' + (waitExit ? '（' + waitExit + '）' : ''), 'low']
    ];
  } else {
    var t = myTeam();
    /* 同上。學生這一格印的是組名，所以多一個班的時候要把班名也寫出來
       ——不然兩個班的兩支隊伍長得一樣，他分不出自己在看哪一個。 */
    var ns2 = seatsOf(u).length;
    var kl2 = classOf(u);
    headBlock = '<button class="side-head pressable" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'go:mkclass' })) + '\'>' +
      '<div class="n">' + esc(t.name) + '</div>' +
      '<div class="s">' + esc(ns2 > 1 ? (kl2 ? kl2.name : '') + '　·　' + ns2 + ' 個班'
        : (t.project || '（還沒定）')) + '</div></button>';
    /* 三個。四件事是流程，不是分頁——說幾天、去做事、看判定都在廊道，
       第四件是看全班在哪。任務清單不是步驟，但它是「老師派過的每一件事
       各自走到哪」，那是隨時會想確認的東西，所以它在側欄。
       圖鑑是想逛才逛的，在廊道底下那一排門。 */
    nav = [
      ['home', '廊道'], ['pack', '任務清單'], ['eco', '班級地下城']
    ];
  }
  /* 一個小方點換成像素圖。同一份結構，讀起來從「網站的幾個分頁」
     變成「背包裡的幾樣東西」。 */
  var items = nav.map(function (n) {
    var on = S.page === n[0];
    var ic = ICONS[n[0]];
    return '<a class="' + (on ? 'on' : '') + (n[2] === 'low' ? ' low' : '') + '" data-go="' + n[0] + '">' +
      (ic ? pxTag(ic, on ? ICON_ON : ICON_PAL, 'nic') : '<span class="dot"></span>') +
      esc(navLabel(n[1])) + '</a>';
  }).join('');
  return '<div class="side">' + headBlock + '<div class="nav">' + items + '</div></div>';
}

/* ---------- 事件 ---------- */

document.addEventListener('click', function (ev) {
  var g = ev.target.closest('[data-go]');
  if (g) { go(g.getAttribute('data-go'), JSON.parse(g.getAttribute('data-p') || '{}')); return; }
  var a = ev.target.closest('[data-act]');
  if (!a) return;
  var act = a.getAttribute('data-act');
  /* 複製那一顆。要複製的字在屬性上，不在 data-p（見 56-viz.js 的
     whereLine：那一格是學生打的字，裡面可能有單引號）。 */
  if (act === 'copy') { copyText(a.getAttribute('data-copy')); return; }
  if (act !== 'run') return;
  var p = JSON.parse(a.getAttribute('data-p') || '{}');
  runAct(p.a);
});

document.addEventListener('change', function (ev) {
  var a = ev.target.closest('[data-act="who"]');
  if (!a) return;
  /* 只換得到示範帳號。真的帳號不在選單裡（見 demoBar），
     這裡再擋一次——選單是畫面，畫面是可以被改的。 */
  if (!isDemo()) return;
  var target = userOf(a.value);
  if (!target || !target._d) return;
  S.who = a.value;
  DB.Session = S.who;
  save();
  S.page = homeFor(userOf(S.who));
  /* 上一個人的訊息不要跟著換身分過去——那句話不是講給這個人聽的 */
  S.flash = null;
  DRAFT = {};
  render();
});

/* 動作字串：「名稱」或「名稱:參數」 */
/* 連點擋一下。

   9/30 事件紀錄：一分鐘內同一個人連續做同一個動作 3 次以上，有 28 組
   （改名 9、挑角色 8、結案 5……）——按了不確定有沒有反應，又按一次。
   會存資料的這幾個動作，同一個動作（連參數）在 0.8 秒內的第二下不再執行。
   導覽、加減鍵這類本來就要連按的不在名單上。 */
var ACT_ONCE = { hero: 1, rename: 1, teamrename: 1, askexit: 1, commit: 1, publish: 1,
  approve: 1, reject: 1, mkteam: 1, jointeam: 1, leaveyes: 1, sololeave: 1, solono: 1, reg: 1, login: 1, renameclass: 1,
  msdelyes: 1, rsdelyes: 1, rsaccyes: 1, rspw: 1 };
var ACT_LAST = {};
function actGuard(key, t) {
  t = t || Date.now();
  if (ACT_LAST[key] && t - ACT_LAST[key] < 800) return false;
  ACT_LAST[key] = t;
  return true;
}
function runAct(str) {
  var i = String(str || '').indexOf(':');
  var name = i < 0 ? str : str.slice(0, i);
  var arg = i < 0 ? '' : str.slice(i + 1);
  var f = ACTS[name];
  if (f && ACT_ONCE[name] && !actGuard(name + ':' + arg)) return;
  if (f) f(arg);
}

/* 2026-09-02：push／rest／back／submit 四個刪掉了。它們是「每天按一下
   推進」那一版的殘留——程式還在，但畫面上沒有任何地方按得到。
   留著只會讓下一個讀的人以為那個機制還在。 */
var ACTS = {
  /* 純導覽。data-go 那條路只吃靜態屬性，而側欄那一格要在同一個
     data-act 裡跟別的動作並存，所以這裡補一支。 */
  go: function (p) { go(String(p || '')); },

  /* 這兩顆連同切換身分那一格，只有示範資料上才有（見 demoBar）。
     這裡再擋一次：畫面沒畫不代表沒有人叫得到它。 */
  forward: function () {
    /* CLOCK 是「實際花了幾天」的來源。手上只要有一筆真的紀錄，
       推一天就等於改掉那一筆的判定。 */
    if (!isPureDemo()) return say('這裡有真的資料，時間不能往前推。');
    CLOCK += DAY; say('往前一天了。');
  },
  reset: function () {
    if (!isPureDemo()) return say('這裡有真的資料，不能整班重來。');
    seed(); S.who = 'U1'; go('home');
  },

  go: function (arg) {
    var i = arg.indexOf(':');
    if (i < 0) return go(arg);
    go(arg.slice(0, i), { id: arg.slice(i + 1) });
  },

  /* 滑桿：只改草稿，不進資料表 */
  /* 拖滑桿。

     本來這裡是 render()，而 render() 會把整個 #app 換掉——包含
     你正在拖的那一根滑桿。節點被重建，瀏覽器的拖曳捕捉跟著沒了，
     把手就不再跟著手指走。那不是回饋不夠，是控制項在手裡被拆掉。

     改成只改跟著它動的那幾塊，滑桿本身完全不碰。 */
  /* 老師排到什麼時候。選一個單位就等於「有排」，再選一次同一個
     或按「不排」就收回來。 */
  dueu: function (k) {
    var u = dueUnit(k);
    if (!u || DRAFT.dueU === k) { DRAFT.dueU = ''; DRAFT.dueN = 0; }
    else { DRAFT.dueU = k; DRAFT.dueN = u.def; }
    render();
  },
  duen: function (d) {
    var u = dueUnit(DRAFT.dueU);
    if (!u) return;
    DRAFT.dueN = clamp(1, u.max, (Number(DRAFT.dueN) || 0) + Number(d));
    render();
  },

  /* 拆一件出來。打一句按 Enter 就多一項，預設一天——
     加一件一定會動到上面那個數字，不然會像沒反應。 */
  planadd: function (v) {
    var x = String(v || '').trim();
    if (!x) return;
    var p = (DRAFT.plan || []).slice();
    if (p.length >= RULES.STEPS_MAX) return say('最多 ' + RULES.STEPS_MAX + ' 件。');
    /* 掛在加的人名下。本來不掛，而 myPlan 把「沒有主人」當成
       「大家都可以報」——那樣回報的時候誰都填得了那一件。 */
    p.push({ n: x.slice(0, 24), d: 1, who: S.who });
    DRAFT.plan = p;
    planEstReset();
    render();
    var el = document.getElementById('pl-add');
    if (el) { el.value = ''; el.focus(); }
  },
  /* 點一下換下一個組員。組員只有自己的話就沒得換，那也對——
     一個人的隊，每一件都是他的。 */
  planwho: function (i) {
    var t = myTeam(); if (!t) return;
    var mem = where('Users', function (u) { return inTeam(u, t.teamId); })
      .map(function (u) { return u.userId; });
    if (!mem.length) return;
    var k = Number(i);
    var pl = DRAFT.plan || [];
    if (!pl[k]) return;
    /* 一圈是：每一位組員，最後再一個「全體」。

       全體不是第五個人，是「這一件我們一起做」——它在要徑上要相加
       而不是並行（見 40-db.js 的 planSplit）。放在圈的最後面，因為
       多數的件還是分給人的，一起做的是少數。 */
    var 圈 = mem.concat([WHO_ALL]);
    var at = 圈.indexOf(pl[k].who);
    pl[k].who = 圈[(at + 1) % 圈.length];
    /* 換了人，那個天數就不再是新主人說的。
       全體那一件沒有「本人」可言，所以也是 0。 */
    pl[k].byOwn = 0;
    planEstReset();
    render();
  },
  plandel: function (i) {
    var p = (DRAFT.plan || []).slice();
    p.splice(Number(i), 1);
    DRAFT.plan = p;
    planEstReset();
    render();
  },
  /* 某一件加減一天。到頭停在那裡。 */
  pland: function (v) {
    var q = String(v).split(',');
    var p = (DRAFT.plan || []).slice();
    var i = Number(q[0]);
    if (!p[i]) return;
    /* 只有掛在你名下的那一件按得動。跟交出去那一頁同一條規則
       （見 67-battle.js）：同一張紙上你只寫得了自己那一行。

       承諾那一邊本來沒有這一條——所以一個人可以替全組把每一件的
       天數都打完，而回報的時候卻是四個人各自報自己那幾件。
       前面一個人宣告，後面四個人回報，那兩個數字不是同一種東西。 */
    /* 全組一起做的那一件誰都按得動——它本來就不是誰的。 */
    if (p[i].who && !isAll(p[i].who) && p[i].who !== S.who) {
      return say('這一件是 ' + shortWho(p[i].who) + ' 的。');
    }
    /* 本來這裡寫 { n, d }——who 整個被丟掉。指派完再調一次天數，
       指派就不見了。 */
    /* 這一件用什麼單位承諾（見 56-viz.js 的 estStepU、40-db.js 的
       EST_UNITS）——沒選過就是天，跟以前一模一樣。加減鍵動的是
       「這個單位底下的原始數字」（dN），d 永遠是換算成天、給
       planDays 加總用的那一個。 */
    var pu = estUnit(p[i].dU || 'd');
    var pn = clamp(pu.min, pu.max, (p[i].dN != null ? p[i].dN : p[i].d) + Number(q[1]));
    p[i] = {
      n: p[i].n,
      d: estToDays(pn, p[i].dU || 'd'),
      dU: p[i].dU || 'd',
      dN: pn,
      who: p[i].who || S.who,
      /* 這一格是不是本人自己按的。他們常常是一起坐著、一台電腦
         規劃的，所以擋不住代填——那就老實記下來，事後分得出
         「他自己說的」跟「別人幫他填的」。

         全組一起做的那一件沒有「本人」，所以永遠是 0——不然它會混進
         「本人自己按的件數」那一欄，把個人層的比例灌水。 */
      byOwn: isAll(p[i].who) ? 0 : 1
    };
    DRAFT.plan = p;
    planEstReset();
    render();
  },

  /* 換這一件的單位：小時／天／週輪著換。跟 pland 同一條守門——
     只有掛在你名下的那一件換得動。換單位重設成那個單位的預設值，
     不是硬把舊數字塞進新單位（8 小時換成週的話變 8 週會很荒謬）。 */
  plandu: function (i) {
    var p = (DRAFT.plan || []).slice();
    var k = Number(i);
    if (!p[k]) return;
    if (p[k].who && !isAll(p[k].who) && p[k].who !== S.who) {
      return say('這一件是 ' + shortWho(p[k].who) + ' 的。');
    }
    var order = ['h', 'd', 'w'];
    var next = order[(order.indexOf(p[k].dU || 'd') + 1) % order.length];
    var def = estUnit(next).def;
    p[k] = {
      n: p[k].n,
      d: estToDays(def, next),
      dU: next,
      dN: def,
      who: p[k].who || S.who,
      byOwn: isAll(p[k].who) ? 0 : 1
    };
    DRAFT.plan = p;
    planEstReset();
    render();
  },

  /* ── 協商那三顆 ──
     老師回一句、老師跳過、學生按下最後那個數字。
     見 40-db.js「協商」那一段。 */

  asksend: function (runId) {
    var n = Number(draft('est', 0));
    var w = (document.getElementById('ask-w') || {}).value || '';
    if (!String(w).trim()) return say('要帶一句話。沒有說法的數字是命令。');
    if (!actAskEst(runId, n, w)) return say('這一趟已經回過了。');
    go('radar');
    say('說出去了。最後幾天還是他們決定。');
  },

  askskip: function (runId) {
    actAskSkip(runId);
    go('radar');
    say('跳過了。他們那邊不會收到通知。');
  },

  /* 學生按下最後那個數字。維持原本那個也走這一條——
     按下去那一下就是他的決定。 */
  asktake: function (runId) {
    var r0 = find('Runs', function (x) { return x.runId === runId; });
    if (!r0) return say('找不到。');
    var was = r0.est;
    var n = Number(draft('est', r0.est));
    if (!actAnswerAsk(myTeam().teamId, runId, n)) return say('這一件已經回過了。');
    var r1 = find('Runs', function (x) { return x.runId === runId; });
    go('home');
    say(r1.est === was ? '維持 ' + r1.est + ' 天。' : '改成 ' + r1.est + ' 天了。');
  },

  /* 上一趟交在哪裡，點一下拿來用。不是預填——他要自己按這一下。 */
  usewhere: function () {
    var r = find('Runs', function (x) { return x.runId === S.p.id; });
    if (!r) return;
    var lw = lastLink(r.teamId, r.runId);
    if (!lw) return;
    DRAFT.where = lw;
    render();
  },

  /* 接委託走到第幾步（見 60-student.js 的 PAGES.commit）。
     不用 go()：換頁會清掉 DRAFT，而那一頁上拆到一半的東西
     都在 DRAFT 裡。 */
  cmstep: function (n) {
    S.p = { id: S.p.id, st: Number(n) || 0 };
    window.scrollTo(0, 0);
    render();
  },

  /* 說幾天：一按一天。到頭就停在那裡，不會繞回去——
     繞回去會讓「按到底」變成一件要小心的事。 */
  /* 送過來的是「按完會變成幾」，不是「加幾」——那兩顆鍵是從畫面上
     正在顯示的數字算出來的（見 56-viz.js 的 estStep）。

     本來這裡是拿差值去加 draft('est', RULES.EST_DEFAULT)，而用到這一組
     鍵的三頁起點都不是 EST_DEFAULT（要徑算的、r.est、r.est），所以
     DRAFT.est 還空著的時候按第一下會跳到 5 附近。 */
  estep: function (v) {
    var n = clamp(RULES.EST_MIN, RULES.EST_MAX, Number(v));
    DRAFT.est = n;
    estLive(n);
  },

  /* 切換承諾要用的單位（見 56-viz.js 的 estStepU）。換單位要重畫
     ——「天」是按鍵，小時／週是輸入框，不是同一種元件改個數字。 */
  estunit: function (k) {
    DRAFT.estU = k;
    if (DRAFT.estN == null) DRAFT.estN = estUnit(k).def;
    render();
  },

  /* 承諾的時候標「這一件我覺得會比想的久」 */
  flag: function (k) {
    DRAFT.flags = DRAFT.flags || [];
    var i = DRAFT.flags.indexOf(k);
    if (i < 0) DRAFT.flags.push(k); else DRAFT.flags.splice(i, 1);
    render();
  },

  /* 營火：哪一件真的比你想的久 */
  over: function (k) {
    DRAFT.overs = DRAFT.overs || [];
    var i = DRAFT.overs.indexOf(k);
    if (i < 0) DRAFT.overs.push(k); else DRAFT.overs.splice(i, 1);
    render();
  },

  /* 點洞口那幾樣還沒點著的東西。它不做事，只說那是什麼——
     沒觸發過的東西如果連問都不能問，它等於不存在。 */
  peek: function (what) {
    if (what === 'camp') {
      var t = myTeam();
      var n = nextThing(t.teamId);
      if (n.kind === 'camp') return go('camp', { id: n.row.run.runId });
      return say('營火。');
    }
  },

  /* 交出去那一頁：標／取消標「那一天我動過」。 */
  mark: function (arg) {
    var i = arg.indexOf('|');
    actMarkDay(myTeam().teamId, arg.slice(0, i), Number(arg.slice(i + 1)));
    render();
  },

  /* 今天沒有動。
     跟推進一樣一下點擊，但不會讓畫面變亮，也不會讓停滯計時歸零——

  /* 勾掉／取消勾掉老師分的一段 */
  tick: function (arg) {
    var i = arg.indexOf('|');
    actTickStep(myTeam().teamId, arg.slice(0, i), Number(arg.slice(i + 1)));
    render();
  },

  /* ---- 出口 ---- */
  noop: function () {},

  cancelexit: function () {
    actCancelExit(myTeam().teamId);
    go('home');
    say('收回來了。');
  },

  /* 第一下只是問，不是說。常來看任務清單的人往下滑到底，
     這一下不該跟手滑一樣重——真的要說出去要再按一次（見 63-pack.js）。 */
  exitcheck: function () { DRAFT.exitConfirm = true; render(); },
  exitundo: function () { DRAFT.exitConfirm = false; render(); },

  /* 學生說「我們做完了」。它不開門——門是老師開的。 */
  askexit: function () {
    var t = myTeam();
    if (!actAskExit(t.teamId)) return;
    DRAFT.exitConfirm = false;
    render(); say('說出去了。');
  },
  unexit: function () {
    var t = myTeam();
    actCancelExit(t.teamId);
    render(); say('收回來了。');
  },

  /* 老師確認一組完成之前先問一次（見 70-teacher.js 的 PAGES.tclose）。 */
  closeconf: function (id) { DRAFT.closeConf = id; render(); },
  closeno: function () { DRAFT.closeConf = null; render(); },

  /* 老師刪掉派出去的任務（見 40-db.js 的 actWithdrawMs）：先問一次，再做。 */
  msdel: function (id) { DRAFT.msDel = id; render(); },
  msdelno: function () { DRAFT.msDel = null; render(); },
  msdelyes: function (id) {
    DRAFT.msDel = null;
    var r = actWithdrawMs(id, S.who);
    if (r.err) { render(); return say(r.err); }
    render(); say('刪掉了。學生那邊看不到了，紀錄還留著。');
  },
  msrestore: function (id) {
    var r = actRestoreMs(id, S.who);
    if (r.err) { render(); return say(r.err); }
    render(); say('放回去了。');
  },

  /* 老師開放／關掉學生那邊「我們做完了」的入口（見 63-pack.js）。 */
  exitopenask: function () { DRAFT.exitOpenConf = true; render(); },
  exitopenno: function () { DRAFT.exitOpenConf = false; render(); },
  exitopenset: function (v) {
    DRAFT.exitOpenConf = false;
    var u = me();
    var r = actSetExitOpen(u.classId, S.who, String(v) === '1');
    if (!r) return say('這個班不是你的。');
    render();
    say(r.exitOpen ? '開放了。學生任務清單最下面會出現那顆鍵。' : '關掉了。');
  },

  /* 老師開門／關門。開了學生才點得動廊道上那扇出口。 */
  openexit: function (v) {
    var p = String(v).split(',');
    actOpenExit(p[0], p[1] === '1');
    render();
    /* 這一句是老師按完看到的，所以講老師剛剛做的那件事（見 70-teacher.js
       的「結案」），後半句才講學生那邊會看到什麼。 */
    say(p[1] === '1' ? '確認了。他們那邊的門開了。' : '收回了。門關回來了。');
  },

  /* 走出去。老師開了門，這一下是他們自己按的。 */
  leave: function () {
    var t = myTeam();
    if (!actLetGo(t.teamId, '')) return say('門還沒開。');
    go('exit', {});
    say('上來了。');
  },

  sure: function (k) { DRAFT.sure = k; render(); },

  /* 出發。參數就是任務。

     本來還帶著一個「地方」，那是他在上一頁挑的。現在地方跟著
     委託人走——他住哪裡，這一趟就走到哪裡。 */
  commit: function (arg) {
    var t = myTeam();
    /* 沒說有多確定就過不去。這道守門本來在 towhere 上，那一步
       拿掉了就得搬過來——擋的是「你有沒有講」，不是「你講得對不對」。 */
    if (!DRAFT.sure) return say('先說你有多確定。');
    var msId = String(arg).split('|')[0];
    var pat = mobFor(msId, t.teamId);
    var zone = pat ? mobZone(pat).key : '';
    /* 送出去的是**畫面上那個數字**。

       本來寫 DRAFT.est || EST_DEFAULT，而拆了件的時候 DRAFT.est 是空的
       （那一格以前唯讀），靠 actCommit 自己去算。現在那一格按得動了，
       所以這裡要講清楚：他按過就用他按的，沒按過就用要徑算的。

       兩邊算的是同一支 planDays，所以「畫面上寫幾天」跟「承諾幾天」
       不會有機會分岔。 */
    var pl0 = DRAFT.plan || [];
    /* 選了小時／週的話，畫面上那個數字是那個單位的，要先換成天
       （見 40-db.js 的 estToDays）——actCommit 存的 est 一律是天。 */
    var estU0 = DRAFT.estU || 'd';
    var est0 = estU0 === 'd'
      ? (DRAFT.est != null ? Number(DRAFT.est) : (pl0.length ? planDays(pl0) : RULES.EST_DEFAULT))
      : estToDays(DRAFT.estN, estU0);
    actCommit(t.teamId, msId, est0, DRAFT.flags || [], pl0, zone, DRAFT.sure, estU0, DRAFT.estN);
    /* 一次開好幾件：這一件說完，直接接著說下一件，最後一件才回廊道出發。
       隊伍裡已經開了、或老師剛收回的，跳過。 */
    if (S.queue && S.queue.length) {
      var 剩 = S.queue.filter(function (id) {
        var mm = msOf(id);
        return id !== msId && mm && !mm.withdrawnAt && !mm.notice && !runOf(t.teamId, id);
      });
      if (剩.length) {
        var 總 = S.queueN, 已 = 總 - 剩.length;
        go('commit', { id: 剩[0] });
        S.queue = 剩; S.queueN = 總;
        render();
        return say('第 ' + 已 + ' 件說好了。接著說下一件（共 ' + 總 + ' 件）。');
      }
    }
    go('home');
    /* 出發那一下：白光掃過廊道，角色從坐著變成走。
       旗子放在 S 上（go 會清掉 DRAFT），畫完就收——
       它是一次事件，不是一個狀態。 */
    S.launch = 1;
    render();
    /* 捲到廊道。

       出發那一下的白光是演在廊道上的，而廊道在首頁的第二塊——
       手機上（320×700）量到它從 y=662 開始，整個在摺線下面。
       按下出發、畫面沒有任何事發生，那一場戲等於沒演。

       用 scrollIntoView 不寫死數字：組別卡的高度會隨組員人數變。 */
    var scn0 = document.querySelector('.scn');
    if (scn0 && scn0.scrollIntoView) {
      scn0.scrollIntoView({ block: 'center' });
    }
    setTimeout(function () {
      S.launch = 0;
      var e = document.querySelector('.scn');
      if (e) e.classList.remove('launch');
      ['.scn-launch', '.scn-go'].forEach(function (sel) {
        var x = document.querySelector(sel);
        if (x && x.parentNode) x.parentNode.removeChild(x);
      });
    }, 1320);
    say('出發。');
  },

  /* 「這一組只有你一個人」的提醒（見 60-student.js 的 soloAskFor）。 */
  soloyes: function () { SOLO_CONF = true; taskNoticeTick(); },
  soloback: function () { SOLO_CONF = false; taskNoticeTick(); },
  solono: function () {
    var u = me(); if (!u || !u.teamId) return;
    u.soloOk = u.teamId;
    save();
    logEvent('solonot', { teamId: u.teamId });
    SOLO_CONF = false;
    taskNoticeTick();
  },
  sololeave: function () {
    SOLO_CONF = false;
    var r = actLeaveTeam(S.who);
    taskNoticeTick();
    if (r.err) { render(); return say(r.err); }
    go('myteam');
    say('離開了。跟隊友拿加入碼，輸入就能加進他們那一組。');
  },

  /* 新任務通知（見 60-student.js 的 taskNoticeTick）。 */
  tnok: function () {
    var u = me(); if (!u) return;
    taskNoticeAck(u, taskNoticeFor(u));
    taskNoticeTick();
  },
  tngo: function () {
    var u = me(); if (!u) return;
    var list = taskNoticeFor(u);
    taskNoticeAck(u, list);
    taskNoticeTick();
    /* 只有一個：直接進去說幾天。好幾個：回首頁，大鍵是第一件、其餘列在下面。 */
    if (list.length === 1) go('commit', { id: list[0].msId }); else go('home');
  },

  /* 一次開好幾件老師派的：一件一件說幾天（見 60-student.js 的 parallelCard）。
     不是替他們一次填掉——每一件要說幾天，是那一件自己的事，
     所以每一件走完整的承諾頁，只是不必每一件都先回廊道再找下一顆鍵。 */
  commitall: function () {
    var t = myTeam(); if (!t) return;
    var ids = runsFor(t.teamId).filter(function (x) { return x.run.state === 'fresh'; })
      .map(function (x) { return x.ms.msId; });
    if (!ids.length) return say('沒有還沒開始的任務。');
    go('commit', { id: ids[0] });
    S.queue = ids; S.queueN = ids.length;
    render();
  },

  /* 老師勾了那一張，點掉。看過就是看過了，不用留在首頁上。 */
  okgot: function () {
    var t = myTeam();
    if (t) okSince(t.teamId, SEEN_CUT).forEach(function (r) { OKGOT[r.runId] = 1; });
    render();
  },

  /* 「都差不多」也是一個答案，所以要記下來——
     它跟「沒有回答」不一樣。 */
  oversame: function () { DRAFT.overs = []; DRAFT.said = 1; render(); },

  sawstamp: function (runId) { actSawStamp(runId); go('home'); },

  reflect: function (runId) {
    var t = myTeam();
    actReflect(t.teamId, runId, DRAFT.overs || []);
    go('home');
    say('說出來了。');
  },

  /* 老師勾可以了 → 去挑裝備 */

  /* 點一組：攤開他們被派過哪些任務。班級地下城上點名牌或點那一疊，
     都是這一支——那兩個地方問的是同一個問題。 */
  team: function (id) {
    DRAFT.dt = id; DRAFT.tab = 'team'; render();
    var c = document.querySelector('.segs');
    if (c) c.scrollIntoView({ block: 'start' });
  },

  /* 點一個角色：看那一個人。

     跟 team 分開是因為它們回答的是兩件事——那一疊是「他們做了什麼」，
     那個人是「他是誰」。而這個作品裡「他是誰」不含任何數字。 */
  person: function (id) { go('person', { id: id }); },

  /* 老師說「現在還不是時候」。不動判定、不動深度，
     只說「這個專案還沒結束」。 */
  denyexit: function (id) {
    if (!actDenyExit(id)) return;
    say('跟他們說了：現在還不是時候。');
    render();
  },

  /* 點一組的名牌：那一組是誰。 */
  crew: function (id) { go('crew', { id: id }); },

  /* 從一組的那一頁去看他們被派過哪些任務。

     不能直接叫 team：那一支只設 DRAFT 再重畫，而攤開任務的那張卡
     長在班級地下城上，不在組別頁——按了什麼都不會發生。

     所以要先換頁。而 go() 會清掉 DRAFT，順序不能顛倒。
     去哪一頁看有沒有自己的組，不看角色：研究者沒有組，
     用 isTeacher() 判斷會把他丟到一頁 myTeam() 是 null 的地方。 */
  tasks: function (id) {
    go(myTeam() ? 'eco' : 'classeco');
    DRAFT.dt = id; DRAFT.tab = 'team';
    render();
    var c = document.querySelector('.dtcard') || document.querySelector('.segs');
    if (c) c.scrollIntoView({ block: 'start' });
  },

  /* 那一組給自己的形容。只有自己改得動（擋在 PAGES.crew）。 */
  blurb: function () {
    var t = myTeam();
    var el = document.getElementById('cr-b');
    if (!t || !el) return;
    actBlurb(t.teamId, el.value);
    say('寫好了。');
    render();
  },

  /* 剖面圖底下那三顆。 */
  tab: function (k) { DRAFT.tab = k; render(); },

  /* 老師那一頁上的審核／出口。跟 tab 分開，不然兩邊會互相蓋掉。 */
  tq: function (k) { DRAFT.tq = k; render(); },



  /* 回報：某一件實際花幾天。到頭就停在那裡。 */
  spent: function (v) {
    var q = String(v).split(',');
    var i = Number(q[0]);
    var a = (DRAFT.spent || []).slice();
    if (a[i] == null) return;
    a[i] = clamp(0, RULES.EST_MAX, a[i] + Number(q[1]));
    DRAFT.spent = a;
    render();
  },

  /* 順／普通／不順。再點一次同一個就收回來——「我不想說」也是一個答案。 */
  feel: function (k) {
    DRAFT.feel = (DRAFT.feel === k) ? '' : k;
    render();
  },

  /* 挑一個角色。它不進任何判定、不影響任何數字——就是「這是我」。 */
  hero: function (k) {
    var u = me();
    if (!u || !HEROES[k]) return;
    /* 選的是同一個就不用再存、再記一筆。

       9/30 事件紀錄：挑角色 193 次，87 次是連續選同一個，最多一位選了 13 次
       同一個——每一次都寫一筆資料、都推一次雲端，而推的是他整個帳號
       （見 41-sync.js 的 SYNC_V 那一段：舊版整筆覆蓋的時候，這種無意義的
       寫入正是把別人剛改的欄位蓋掉的機會）。沒變就不寫。 */
    if (u.hero !== k) {
      u.hero = k;
      save();
      logEvent('hero', { teamId: u.teamId, hero: k });
    }
    /* 第一次挑完角色，先看兩頁故事再進廊道。

       量過的問題：全新的學生前三個動作（認領自己、挑角色、取專案名）
       跟專案管理完全無關，而第一個真正的動作要等老師派任務，
       可能是隔天。中間那一段空窗最危險——他登入過一次、什麼都沒發生，
       就不會有第二次。那兩頁把世界觀跟唯一的一條規則講完。

       只擋第一次：看過就記在他身上（sawStory），之後換角色直接回廊道。
       想再看的話，廊道上那扇門一直在。

       ── 記在這裡，不是記在「出發」那一顆上 ──

       本來 sawStory 是按下故事最後那顆「出發」才寫的。而那一頁上
       導覽一直在：他看完兩頁、直接點廊道回去，那個旗子就沒寫進去——
       下一次挑角色，故事又跑一次。他每換一次角色就被重播一次。

       旗子的意思是「已經給他看過了」，而看過的那一刻就是現在。 */
    if (!u.sawStory) {
      u.sawStory = now();
      save();
      /* 只有還沒開始走的人才自動播。

         旗子擋不住所有情況：示範資料裡的學生沒有這一欄、換一台機器、
         清過瀏覽器資料，旗子都會不在。而一個已經走了五趟的人按「換角色」
         被丟進開場動畫，只會覺得系統壞了——他要的是換一張臉，
         不是重看一次「這座地下城就是你們的專案」。

         所以再加一道：這一組如果已經走過任何一趟，就不播。
         故事那一頁一直在（首頁那一排上就有一格），想看隨時點得到。 */
      if (!runsFor(u.teamId).length) return go('story', { n: 0 });
    }
    go('home', {});
  },

  /* 學生改自己的招牌。

     2026-09-23：這兩支本來存完留在 sign 頁（go('sign')），是為了讓
     組名跟專案名可以一次改完、不用改一個就被彈回首頁再點進來一次。

     可是留在同一頁的代價是沒有畫面上的差異——存之前跟存之後看到的
     是同一個框、同一段文字，確認全靠一句會自己消失的 flash。
     真的在課堂上量到：學生看不出「改好了」跟「我根本還沒按到」
     有什麼不同，會以為專案名沒存到。

     改回 go('home')：存完跳一下，回到首頁再看得到剛剛那個字——
     「畫面換了」本身就是最直接的確認，比一句會消失的字更難錯過。
     代價是兩格都要改的人得回招牌頁兩次，但這比「存了卻以為沒存」
     安全。 */
  rename: function () {
    var t = myTeam();
    var v = (document.getElementById('pj-name') || {}).value || '';
    if (!v.trim()) return say('招牌上總要寫點什麼。');
    if (!actRename(t.teamId, v.trim())) return say('跟原本一樣，沒有改到。');
    go('home');
    say('改好了。');
  },

  teamrename: function () {
    var t = myTeam();
    var v = (document.getElementById('tm-name') || {}).value || '';
    if (!v.trim()) return say('組名不能空白。');
    if (!actTeamRename(t.teamId, v.trim())) return say('跟原本一樣，沒有改到。');
    go('home');
    say('改好了。');
  },

  /* ---- 老師 ---- */
  publish: function () {
    var title = (document.getElementById('ms-title') || {}).value || '';
    var note = (document.getElementById('ms-note') || {}).value || '';
    if (!title.trim()) return say('先寫這一個任務要交什麼。');
    /* 本來是把一整串字在這裡 split，所以「幾段」在按下派出去之前
       不存在。現在它從第一下 Enter 就是一個陣列。
       還沒按 Enter 的那一句也一起收——不然打完最後一段直接按
       派出去，那一段會不見。 */
    var steps = (DRAFT.steps || []).slice();
    var last = ((document.getElementById('ms-step') || {}).value || '').trim();
    if (last) steps.push(last.slice(0, 24));
    actPublish(me().classId, { title: title.trim(), note: note.trim(),
      steps: steps, teams: DRAFT.to || [], mentorId: me().userId,
      due: dueFrom(DRAFT.dueN, DRAFT.dueU), dueU: DRAFT.dueU || '' });
    /* 草稿清掉，不然下一個會帶著上一個的字。
       （那幾個框現在跟 DRAFT 綁在一起，才不會按一下班級就消失。） */
    DRAFT.msTitle = ''; DRAFT.msNote = ''; DRAFT.steps = []; DRAFT.to = [];
    DRAFT.dueU = ''; DRAFT.dueN = 0;
    /* 派完直接看「已派任務」——自己剛派的那一件在最上面「你派的」那一張。 */
    go('mslist');
    say('派出去了。');
  },

  /* 退回去改。一定要寫一句話——不寫理由的退回等於
     「再做一次，但我不告訴你為什麼」。 */
  reject: function (runId) {
    var box = document.getElementById('gr-word');
    var w = (box || {}).value || '';
    if (!w.trim()) {
      /* 那顆鍵現在釘在底部（見 70-teacher.js 的 rvw-pin），所以按下去的
         時候，要寫的那一格可能在三屏以外。只說「要寫一句話」等於叫他
         自己去找——捲過去，順便讓游標停在那裡。 */
      if (box && box.scrollIntoView) {
        box.scrollIntoView({ block: 'center' });
        if (box.focus) box.focus();
      }
      return say('退回去改要寫一句話。');
    }
    var r0 = find('Runs', function (x) { return x.runId === runId; });
    var ms0 = r0 ? r0.msId : null;
    if (!actReject(runId, w.trim())) return say('這一件退不回去。');
    /* 退回也接著看同一件的下一組（見 nextSame）。 */
    nextSame(ms0, '退回去了。');
  },

  /* 改好了再交一次。判定還是原來那一個——重做不會讓他當初
     說的話變成別的話。 */
  resend: function (runId) {
    var t = myTeam();
    if (!actResend(t.teamId, runId)) return say('這一趟交不出去。');
    go('home');
    say('再交出去了。');
  },

  /* 改一次承諾。

     那一趟留成紀錄（說幾天、走了幾天），沒有判定也沒有印章，
     所以不會進準度那根尺——改承諾不是失準，是兩件事。
     然後直接把他帶到「說幾天」，因為那就是他想做的事。 */
  redo: function (runId) {
    var t = myTeam();
    var r = find('Runs', function (x) { return x.runId === runId; });
    if (!r) return say('這一趟改不了。');
    /* 能改幾次是他自己在承諾那一刻決定的（見 20-rules.js 的 RULES.SURE）。
       說「很確定」的人把話說死了，那一趟就不能改。 */
    var q = redoLeft(r);
    if (q <= 0) {
      return say((RULES.sureOf(r.sure) || {}).name === '很確定'
        ? '你說了很確定，這一趟改不了。'
        : '這一趟改過了，不能再改。');
    }
    if (!actRethink(t.teamId, runId)) return say('這一趟改不了。');
    go('commit', { id: r.msId });
    say('走過的那幾天留著。');
  },

  /* 點帶子上的一格：打開那一趟的完整紀錄。
     go() 會清掉 DRAFT，所以要在它之後才設 lg。 */
  rec: function (runId) {
    go('pack', {});
    DRAFT.lg = runId;
    render();
    var e = document.querySelector('.rec.open');
    if (e) e.scrollIntoView({ block: 'center' });
  },

  /* 分段：打一句按 Enter 就多一項。

     重畫之後焦點會沒掉，所以自己補回去——不然切完第一段就得再點
     一次那個框才切得了第二段，那比原本的多行框還糟。 */
  stepadd: function (v) {
    var x = String(v || '').trim();
    if (!x) return;
    DRAFT.steps = (DRAFT.steps || []).concat([x.slice(0, 24)]);
    if (DRAFT.steps.length > RULES.STEPS_MAX) DRAFT.steps.length = RULES.STEPS_MAX;
    render();
    var el = document.getElementById('ms-step');
    if (el) { el.value = ''; el.focus(); }
  },

  stepdel: function (i) {
    var a = (DRAFT.steps || []).slice();
    a.splice(Number(i), 1);
    DRAFT.steps = a;
    render();
    var el = document.getElementById('ms-step');
    if (el) el.focus();
  },

  to: function (teamId) {
    DRAFT.to = DRAFT.to || [];
    var i = DRAFT.to.indexOf(teamId);
    if (i < 0) DRAFT.to.push(teamId); else DRAFT.to.splice(i, 1);
    render();
  },

  /* 老師只勾一個「可以」。挑哪一件是學生的事。 */
  /* 收下的時候順手給幾顆。沒選就是最少的那一份——
     「他沒有特別想說什麼」是一個正常的答案。 */
  scope: function (k) { DRAFT.scope = k; render(); },
  /* 交出去之後補寫「我做了什麼」。老師收下之前都寫得進去——
     他還沒讀，所以這仍然是他讀到之前的紀錄。 */
  saidnow: function (runId) {
    var v = String((document.getElementById('sd-now') || {}).value || '').trim();
    if (!v) return say('寫一行就好。');
    var r = find('Runs', function (x) { return x.runId === runId; });
    if (!r || r.state === 'done' || r.state === 'approved') return say('老師已經收下了。');
    r.said = r.said || {};
    r.said[S.who] = v.slice(0, 200);
    save();
    logEvent('said', { teamId: r.teamId, runId: runId });
    say('記下來了。');
  },
  bonus: function (n) { DRAFT.bonus = Number(n) || RULES.CRYSTAL.bonusMin; render(); },
  /* 放一顆水晶照亮圖鑑上的一個黑影（見 40-db.js 的 actLight）。 */
  light: function (n) {
    var t = myTeam(); if (!t) return;
    var r = actLight(t.teamId, String(n || ''));
    if (r.err) return say(r.err);
    say('照亮了「' + r.name + '」。他還在那底下，你只是先知道有這個人。');
  },
  approve: function (runId) {
    var word = (document.getElementById('gr-word') || {}).value || '';
    var b = DRAFT.bonus || RULES.CRYSTAL.bonusMin;
    var r0 = find('Runs', function (x) { return x.runId === runId; });
    var pat0 = r0 ? mobOfRun(r0) : null;
    var ms0 = r0 ? r0.msId : null;
    if (!actApprove(runId, word.trim(), b)) return say('這一件已經看過了。');
    /* 誰收下的。本來只說「收下了」——而收下這件事在學生那一邊是
       一場戲（委託人伸手接過去），在老師這一邊只有兩個字。
       把那一位的名字放進去，兩端講的才是同一件事。 */
    var line = (pat0 ? pat0.n + ' 收下了。' : '收下了。') + '你多給了 ' + b + ' 顆。';
    nextSame(ms0, line);
  }
};

/* 同一件委託還有沒有下一組在等。

   有就直接翻過去，沒有才回清單。他手上剛讀完那一份標準，連著看
   同一件最快——回一次清單再點一次，等於每一件都要重新進入狀況。 */
function nextSame(msId, line) {
  var u = me();
  var nx = msId ? radar(u.classId).filter(function (x) {
    return x.run.msId === msId;
  })[0] : null;
  if (nx) {
    go('review', { id: nx.run.runId });
    say(line + '　接著看同一件的下一組。');
  } else {
    go('radar');
    say(line);
  }
}
