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

/* 首頁那一條「你不在的這幾天」看過就記下來，不然每次進來都再喊一次。
   記在畫完之後，所以這一次還看得到。

   蓋掉之前先接住上一次的時間，整個連線都留著（SEEN_CUT）。
   全班地下城拿它來標「你不在的時候別人留下的」——不接住的話，
   走過首頁再切過去，圖上就一個新的都沒有了。 */
var SEEN_CUT = null;
function seen() {
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
var GATE_PAGES = { gate: 1, login: 1, reg: 1 };
var PAGE_ROLE = {
  home: 'student', commit: 'student', stamp: 'student',
  eco: 'student', pack: 'student',
  battle: 'student',
  exit: 'student', codex: 'student', sign: 'student',
  claim: 'student',
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
  /* 畫完才記，所以這一次還看得到那一條。 */
  seen();
  document.getElementById('app').innerHTML =
    sideBar() + '<div class="main">' + topBar() + demoBar() +
    '<div class="wrap">' + (S.flash ? flashBar() : '') + body + '</div></div>';

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
    var r = radar(u.classId, u.userId);
    return '<div class="top">' +
      '<span class="badge t">老師端</span>' +
      '<span class="who">' + esc(u.name) + '</span>' +
      '<span class="sp"></span>' +
      /* 我帶幾組。本來是整個課程的組數——三位老師共用一個課程
         之後，那個數字不是他負責的東西。 */
      '<span>' + esc(classOf(u).name) + '　·　我帶 ' +
        teamsUnder(u.classId, u.userId).length + ' 組</span>' +
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
    /* 專案名點得進招牌。名字最大的地方就是改名字的入口——
   本來只有廊道最底下那個小圖示能進去。 */
'<a class="hud-pj" data-act="run" data-p=\'' +
  esc(JSON.stringify({ a: 'go:sign' })) + '\'>' +
  esc(t.project || '（還沒定）') + '</a>' +
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
      ['ms', '發派任務'],
      ['classeco', '各組進度']
    ];
  } else {
    var t = myTeam();
    headBlock = '<div class="side-head">' +
      '<div class="n">' + esc(t.name) + '</div>' +
      '<div class="s">' + esc(t.project || '（還沒定）') + '</div></div>';
    /* 三個。四件事是流程，不是分頁——說幾天、去做事、看判定都在廊道，
       第四件是看全班在哪。任務清單不是步驟，但它是「老師派過的每一件事
       各自走到哪」，那是隨時會想確認的東西，所以它在側欄。
       圖鑑是想逛才逛的，在廊道底下那一排門。 */
    nav = [
      ['home', '廊道'], ['pack', '任務清單'], ['eco', '全班地下城']
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

/* 2026-09-02：push／rest／back／submit 四個刪掉了。它們是「每天按一下
   推進」那一版的殘留——程式還在，但畫面上沒有任何地方按得到。
   留著只會讓下一個讀的人以為那個機制還在。 */
var ACTS = {
  forward: function () { CLOCK += DAY; say('往前一天了。'); },
  reset: function () { seed(); S.who = 'U1'; go('home'); },

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
    p.push({ n: x.slice(0, 24), d: 1 });
    DRAFT.plan = p;
    render();
    var el = document.getElementById('pl-add');
    if (el) { el.value = ''; el.focus(); }
  },
  plandel: function (i) {
    var p = (DRAFT.plan || []).slice();
    p.splice(Number(i), 1);
    DRAFT.plan = p;
    render();
  },
  /* 某一件加減一天。到頭停在那裡。 */
  pland: function (v) {
    var q = String(v).split(',');
    var p = (DRAFT.plan || []).slice();
    var i = Number(q[0]);
    if (!p[i]) return;
    p[i] = { n: p[i].n, d: clamp(1, RULES.EST_MAX, p[i].d + Number(q[1])) };
    DRAFT.plan = p;
    render();
  },

  /* 說幾天：一按一天。到頭就停在那裡，不會繞回去——
     繞回去會讓「按到底」變成一件要小心的事。 */
  estep: function (d) {
    var n = clamp(RULES.EST_MIN, RULES.EST_MAX,
      Number(draft('est', RULES.EST_DEFAULT)) + Number(d));
    DRAFT.est = n;
    estLive(n);
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

  askexit: function () {
    actAskExit(myTeam().teamId);
    go('exit');
    say('說出去了。');
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
    actCommit(t.teamId, msId, Number(DRAFT.est || RULES.EST_DEFAULT),
      DRAFT.flags || [], DRAFT.plan || []);
    go('home');
    /* 出發那一下：白光掃過廊道，角色從坐著變成走。
       旗子放在 S 上（go 會清掉 DRAFT），畫完就收——
       它是一次事件，不是一個狀態。 */
    S.launch = 1;
    render();
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

  /* 「都差不多」也是一個答案，所以要記下來——
     它跟「沒有回答」不一樣。 */
  oversame: function () { DRAFT.overs = []; DRAFT.said = 1; render(); },

  skipcamp: function (runId) { actSkipCamp(runId); go('home'); },

  reflect: function (runId) {
    var t = myTeam();
    actReflect(t.teamId, runId, DRAFT.overs || []);
    go('home');
    say('說出來了。');
  },

  /* 老師勾可以了 → 去挑裝備 */

  /* 在這一層留下一個記號。

     插下去那一下會敲開那一層的石頭：有沒有東西是算出來的，
     而遇到的是牠本人還是牠留下的痕跡，看這一趟準不準。
     兩邊拿到的東西一樣多——差的只是遇到什麼。 */
  bld: function (v) {
    var t = myTeam();
    var p = v.split(',');
    var d = Number(p[1]);
    if (!actBuild(t.teamId, d, p[0], lastSealed(t.teamId))) {
      return say('那一層留不了。');
    }
    /* 插記號那一下敲開這一層的石頭。碰到的那幾隻會標進圖鑑的
       「遇過」——那一條線是它接回終點的方式。 */
    DRAFT.build = d;
    DRAFT.uncover = actUncover(t.teamId, d);
    say('留下了。');
  },

  /* 點誰蓋的東西：看那是哪一趟。 */
  /* 點一組的欄頭：打開他們那張卡，並且捲到它。
     沒有這一支，還沒留下東西的那幾組整條廊道點不動。 */
  team: function (id) {
    DRAFT.dt = id; DRAFT.sb = null; DRAFT.tab = 'team'; render();
    var c = document.querySelector('.segs');
    if (c) c.scrollIntoView({ block: 'start' });
  },

  /* 剖面圖底下那三顆。 */
  tab: function (k) { DRAFT.tab = k; render(); },

  /* 圖上某一個記號：那是別組某一趟的紀念碑。

     本來還順手設 DRAFT.dt（把那一整組的面板也打開）。拿掉了——
     一個可以點的東西回答一個問題：記號回答「這一趟是什麼」，
     欄頭回答「那一組是誰」。兩顆鈕做同一件事，就沒有人分得清
     哪一顆是做什麼的。 */
  /* 這一組給哪一位老師帶。再點一次同一位就是收回來。 */
  mentor: function (v) {
    var p = String(v).split(',');
    actMentor(p[0], p[1] || '');
    render();
  },

  seeb: function (v) {
    DRAFT.sb = v.split(',');
    render();
    var c = document.querySelector('.bstory');
    if (c) c.scrollIntoView({ block: 'center' });
  },

  /* 學生改自己的招牌 */
  rename: function () {
    var t = myTeam();
    var v = (document.getElementById('pj-name') || {}).value || '';
    if (!v.trim()) return say('招牌上總要寫點什麼。');
    if (!actRename(t.teamId, v.trim())) return say('跟原本一樣，沒有改到。');
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
    go('ms');
    say('派出去了。');
  },

  /* 退回去改。一定要寫一句話——不寫理由的退回等於
     「再做一次，但我不告訴你為什麼」。 */
  reject: function (runId) {
    var w = (document.getElementById('gr-word') || {}).value || '';
    if (!w.trim()) return say('退回去改要寫一句話。');
    if (!actReject(runId, w.trim())) return say('這一件退不回去。');
    go('radar');
    say('退回去了。');
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
    if (!r || !actRethink(t.teamId, runId)) return say('這一趟改不了。');
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
  approve: function (runId) {
    var word = (document.getElementById('gr-word') || {}).value || '';
    if (!actApprove(runId, word.trim())) return say('這一件已經看過了。');
    go('radar');
    say('勾了。');
  }
};
