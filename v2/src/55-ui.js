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

function go(page, p) {
  if (typeof stopAnim === 'function') stopAnim();
  S.page = page; S.p = p || {}; S.flash = null; DRAFT = {};
  window.scrollTo(0, 0);
  render();
}
function me() { return S.who ? userOf(S.who) : null; }
function isTeacher() { var u = me(); return !!u && u.role === 'teacher'; }
function myTeam() { var u = me(); return u ? teamOf(u.teamId) : null; }

/* 哪一種身分走得到哪一頁。

   這不是裝飾。研究者看得到全班的紀錄、老師看得到別組的進度——
   路由如果不擋，改一下網址就變成別人。 */
var GATE_PAGES = { gate: 1, login: 1, reg: 1 };
var PAGE_ROLE = {
  home: 'student', commit: 'student', submit: 'student', stamp: 'student',
  camp: 'student', pick: 'student', dash: 'student', eco: 'student', pack: 'student',
  exit: 'student', codex: 'student', sign: 'student',
  log: 'student', claim: 'student',
  radar: 'teacher', review: 'teacher', ms: 'teacher', classeco: 'teacher',
  rs: 'researcher', roster: 'researcher', events: 'researcher'
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

/* 按鈕。act 是「動作:參數」的字串，全部收在 ACTS 裡。 */
function btn(label, act, kind) {
  return '<button class="btn ' + (kind || '') + '" data-act="run" data-p="' +
    esc(JSON.stringify({ a: act })) + '">' + esc(label) + '</button>';
}

/* ---------- 路由 ---------- */

var PAGES = {};

function render() {
  var u = me();

  /* 沒登入：只有門口那幾頁，而且沒有側欄也沒有頂條——
     還不知道你是誰的時候，畫面上不該有任何「你的」東西。 */
  if (!u) {
    if (!GATE_PAGES[S.page]) S.page = 'gate';
    document.getElementById('app').innerHTML =
      '<div class="main"><div class="wrap">' +
      (S.flash ? flashBar() : '') + PAGES[S.page]() + '</div></div>';
    return;
  }

  /* 學生還沒對上名冊：先認領，別的哪裡都去不了。
     沒有組別的話，不知道要畫哪一條廊道——側欄跟頂條也一樣，
     它們每一格都在講「你的組」，這時候還沒有那個東西。 */
  if (u.role === 'student' && !u.teamId) {
    document.getElementById('app').innerHTML =
      '<div class="main"><div class="wrap">' +
      (S.flash ? flashBar() : '') + PAGES.claim() + '</div></div>';
    S.page = 'claim';
    return;
  }
  if (S.page === 'claim' || GATE_PAGES[S.page]) S.page = homeFor(u);

  if (!PAGES[S.page] || !allowed(u, S.page)) S.page = homeFor(u);

  var body = PAGES[S.page]();
  document.getElementById('app').innerHTML =
    sideBar() + '<div class="main">' + topBar() + demoBar() +
    '<div class="wrap">' + (S.flash ? flashBar() : '') + body + '</div></div>';

  /* 走廊比視窗長的時候，重畫預設回到最左邊——那樣按完推進會看到
     走廊變了卻看不到自己動。鏡頭跟著人走。 */
  if (typeof scrollScene === 'function') scrollScene();
}

function flashBar() {
  return '<div class="flash">' + esc(S.flash) + '</div>';
}
/* say() 自己重畫。本來要記得先 say 再 render——順序寫反訊息就永遠不出現，
   而且那是一種只有測試才抓得到的錯。讓它自己負責。 */
function say(m) { S.flash = m; render(); }

/* 頂條右邊那一段。三種角色共用——登出在哪裡不該因為身分而不同，
   而且側欄在手機會變成底下那一列，放在那裡會被擠掉。 */
function topEnd() {
  return '<a class="plain" data-act="run" data-p=\'' +
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
      '<span>' + DB.Users.length + ' 個帳號　·　' + DB.Classes.length + ' 個班　·　' +
        DB.Events.length + ' 筆紀錄</span>' + topEnd() +
      '</div>';
  }
  if (u.role === 'teacher') {
    var r = radar(u.classId);
    return '<div class="top">' +
      '<span class="badge t">老師端</span>' +
      '<span class="who">' + esc(u.name) + '</span>' +
      '<span class="sp"></span>' +
      '<span>' + esc(classOf(u).name) + '　·　' +
        where('Teams', function (t) { return t.classId === u.classId; }).length + ' 組</span>' +
      '<span>' + (r.length ? r.length + ' 件等你看' : '沒有等你的') + '</span>' + topEnd() +
      '</div>';
  }
  /* 學生的頂條做成 HUD：招牌、隊伍、所在的層、深度。
     一排文字讀起來是網站的狀態列；掛上招牌那張圖之後，
     它讀起來是角色身上的東西。 */
  var t = myTeam();
  var st = stallOf(t.teamId);
  var z = strataAt(depthOf(t.teamId), t.teamId);
  return '<div class="top hud z-' + z.key + '">' +
    pxTag(signOf(t.teamId).px, signOf(t.teamId).pal, 'hud-sign') +
    '<span class="who">' + esc(t.name) + '</span>' +
    '<span class="hud-pj">' + esc(t.project || '（還沒定）') + '</span>' +
    '<span class="sp"></span>' +
    '<span class="hud-z">' + esc(z.name) + '</span>' +
    '<span class="hud-d' + (st.level ? ' warnx' : '') + '">' +
      (depthOf(t.teamId) * WORLD.depthPerMilestone) + ' m</span>' + topEnd() +
    '</div>';
}

/* 試用列。真的上線沒有這一條——它在這裡只是為了讓你兩邊都走得完。 */
function demoBar() {
  var opts = DB.Users.map(function (u) {
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

function sideBar() {
  var u = me();
  var nav, headBlock;
  if (u.role === 'researcher') {
    headBlock = '<div class="side-head"><div class="k">LAB</div>' +
      '<div class="n">' + esc(u.name) + '</div>' +
      '<div class="s">帳號與紀錄</div></div>';
    nav = [['rs', '帳號'], ['roster', '名冊'], ['events', '紀錄']];
  } else if (u.role === 'teacher') {
    var kl = classOf(u);
    headBlock = '<div class="side-head"><div class="k">TEACHER</div>' +
      '<div class="n">' + esc(u.name) + '</div>' +
      '<div class="s">' + esc(kl.name) + ' · 加入碼 ' +
      esc(kl.joinCode) + '</div></div>';
    /* 老師只有三件事，側欄就只有三格——多一格就是多一件他要煩惱的事。 */
    var wait = radar(u.classId).length;
    nav = [
      ['radar', '審核' + (wait ? '（' + wait + '）' : '')],
      ['ms', '發里程碑'],
      ['classeco', '各組進度']
    ];
  } else {
    var t = myTeam();
    headBlock = '<div class="side-head"><div class="k">TUNNEL</div>' +
      '<div class="n">' + esc(t.name) + '</div>' +
      '<div class="s">' + esc(t.project || '（還沒定）') + '</div></div>';
    nav = [
      ['home', '廊道'], ['pack', '岩心架'], ['codex', '圖鑑'],
      ['eco', '全班地下城'], ['log', '紀錄']
    ];
  }
  /* 一個小方點換成像素圖。同一份結構，讀起來從「網站的幾個分頁」
     變成「背包裡的幾樣東西」。 */
  var items = nav.map(function (n) {
    var on = S.page === n[0];
    var ic = ICONS[n[0]];
    return '<a class="' + (on ? 'on' : '') + '" data-go="' + n[0] + '">' +
      (ic ? pxTag(ic, on ? ICON_ON : ICON_PAL, 'nic') : '<span class="dot"></span>') +
      esc(n[1]) + '</a>';
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
  if (act !== 'run') return;
  var p = JSON.parse(a.getAttribute('data-p') || '{}');
  runAct(p.a);
});

document.addEventListener('change', function (ev) {
  var a = ev.target.closest('[data-act="who"]');
  if (!a) return;
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
function runAct(str) {
  var i = String(str || '').indexOf(':');
  var name = i < 0 ? str : str.slice(0, i);
  var arg = i < 0 ? '' : str.slice(i + 1);
  var f = ACTS[name];
  if (f) f(arg);
}

var ACTS = {
  forward: function () { CLOCK += DAY; render(); },
  reset: function () { seed(); S.who = 'U1'; go('home'); },

  go: function (arg) {
    var i = arg.indexOf(':');
    if (i < 0) return go(arg);
    go(arg.slice(0, i), { id: arg.slice(i + 1) });
  },

  /* 滑桿：只改草稿，不進資料表 */
  est: function (v) { DRAFT.est = v; render(); },

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
      return say('營火。比你自己說的天數久的時候，會在這裡坐下來說一句哪一段比想的久。這不扣任何東西。');
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
     說實話不用付代價，也買不到東西，所以沒有說謊的理由。 */
  rest: function (runId) {
    var t = myTeam();
    var back = Number(DRAFT.back || 0);
    if (!actRest(t.teamId, runId, back)) return say('那一天已經記過了。');
    DRAFT.back = 0;
    go('home');
    say('記下來了。沒動也是這一趟的一部分。');
  },

  /* 勾掉／取消勾掉老師分的一段 */
  tick: function (arg) {
    var i = arg.indexOf('|');
    actTickStep(myTeam().teamId, arg.slice(0, i), Number(arg.slice(i + 1)));
    render();
  },

  /* ---- 出口 ---- */
  noop: function () {},

  askexit: function () {
    actAskExit(myTeam().teamId);
    go('exit');
    say('說出去了。老師確認之後你就出去了。');
  },

  cancelexit: function () {
    actCancelExit(myTeam().teamId);
    go('home');
    say('收回來了。');
  },

  letgo: function (teamId) {
    var word = (document.getElementById('gr-word') || {}).value || '';
    if (!actLetGo(teamId, word.trim())) return say('這一組沒有在等出口。');
    go('radar');
    say('他們出去了。');
  },

  commit: function (msId) {
    var t = myTeam();
    actCommit(t.teamId, msId, Number(DRAFT.est || RULES.EST_DEFAULT), DRAFT.flags || []);
    go('home');
    say('承諾了。從今天開始，每天推一格。');
  },

  /* 補登哪一天。0 是今天。 */
  back: function (v) { DRAFT.back = Number(v) || 0; render(); },

  /* 推進。參數是「runId|今天動的是哪一塊」。 */
  push: function (arg) {
    /* 圖例那一排送過來的字是「push:R12|:a123」，中間那一段是 runId。
       沒有 | 就是「我今天來過了」——那一組還沒寫自己的清單。 */
    arg = arg.replace('|:', '|');
    var i = arg.indexOf('|');
    var runId = i < 0 ? arg : arg.slice(0, i);
    var step = i < 0 ? -1 : Number(arg.slice(i + 1));
    var t = myTeam();
    var back = Number(DRAFT.back || 0);
    /* 有沒有藤蔓要碎——推之前先問，推完狀態就變了 */
    var wasStuck = stallOf(t.teamId).level;
    if (!actPush(t.teamId, runId, step, back)) {
      return say(back ? '那一天已經點過了。' : '今天那一盞已經點好了。一天一盞——多按沒有用。');
    }
    DRAFT.back = 0;
    var r = find('Runs', function (x) { return x.runId === runId; });
    var lab = stepName(runId, step);
    var msg;
    if (RULES.progress(r.pushes, r.est) >= 1) {
      msg = '走到走廊底了。交出去之後，系統會比對你當初承諾的天數。';
    } else if (back) {
      msg = '補回來了。那一盞亮了。';
    } else {
      /* 有人跟你一起在下面。這不是名次——它不排序，也不說誰比較多。 */
      var others = todayMovers(t.classId, t.teamId);
      msg = (lab ? '「' + lab + '」記下了。' : '記下了。') +
        (others ? '今天班上還有 ' + others + ' 條廊道今天也有人在走。'
                : '今天你是第一個下來的。');
    }
    /* 先播完動畫再重畫——重畫會把 <img> 換掉，動畫就沒了。
       藤蔓先碎，再揮劍：那個順序就是「你把它弄斷了，然後繼續走」。 */
    var swing = function () { shakeScene(); animPush(function () { say(msg); }); };
    if (wasStuck === 1) animVineBreak(swing); else swing();
  },

  submit: function (runId) {
    var t = myTeam();
    var r = actSubmit(t.teamId, runId, '');
    if (r) go('stamp', { id: runId });
  },

  skipcamp: function (runId) { actSkipCamp(runId); go('home'); },

  reflect: function (runId) {
    var t = myTeam();
    actReflect(t.teamId, runId, DRAFT.overs || []);
    go('home');
    say('說出來了。老師看得到，而且這不會扣任何東西。');
  },

  /* 老師勾可以了 → 去挑裝備 */
  gear: function (runId) { go('pick', { id: runId }); },

  /* 往哪裡挖 */
  /* 點一塊地，它變成你的。PaGamO 最直覺的那一下——
     地圖是動手的地方，不是一個看的頁面。 */
  dig: function (v) {
    var t = myTeam();
    var p = v.split(',');
    if (!actClaimCell(t.classId, t.teamId, Number(p[0]), Number(p[1]))) {
      return say('那一格點不動。');
    }
    var left = claimsOf(t.teamId);
    say(left ? '打通了。還有 ' + left + ' 格。' : '打通了。');
  },

  /* 封存這一趟。名字與方向都選填。 */
  seal: function (runId) {
    var name = (document.getElementById('cname') || {}).value || '';
    if (!actSeal(runId, name)) return say('這一趟已經封存了。');
    go('dash', { id: runId });
    animDash();   /* 畫面畫好之後才播——go() 已經重畫過了 */
  },

  /* 學生改自己的招牌 */
  rename: function () {
    var t = myTeam();
    var v = (document.getElementById('pj-name') || {}).value || '';
    if (!v.trim()) return say('招牌上總要寫點什麼。');
    if (!actRename(t.teamId, v.trim())) return say('跟原本一樣，沒有改到。');
    go('home');
    say('招牌換字了。材質是走出來的，那個急不得。');
  },

  /* ---- 老師 ---- */
  publish: function () {
    var title = (document.getElementById('ms-title') || {}).value || '';
    var note = (document.getElementById('ms-note') || {}).value || '';
    if (!title.trim()) return say('先寫這一個里程碑要交什麼。');
    var steps = ((document.getElementById('ms-steps') || {}).value || '')
      .split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
    actPublish(me().classId, { title: title.trim(), note: note.trim(),
      steps: steps, teams: DRAFT.to || [] });
    go('ms');
    say('派出去了。學生那邊會先被問「你打算花幾天」。');
  },

  to: function (teamId) {
    DRAFT.to = DRAFT.to || [];
    var i = DRAFT.to.indexOf(teamId);
    if (i < 0) DRAFT.to.push(teamId); else DRAFT.to.splice(i, 1);
    render();
  },

  /* 老師只勾一個「可以」。挑哪一件是學生的事。 */
  approve: function (runId) {
    var word = (document.getElementById('gr-word') || {}).value || '';
    if (!actApprove(runId, word.trim())) return say('這一件已經看過了。');
    go('radar');
    say('回過去了。他們那邊會攤開三件裝備，自己挑一件帶走。');
  }
};
