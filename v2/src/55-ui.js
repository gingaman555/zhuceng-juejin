/* 畫面的底：字串拼 HTML、一個路由、一次重畫。

   沒有覆寫層，也沒有模板補丁——每一個畫面就是一支函式，
   改一句話只要改一個地方。 */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function nl(s) { return esc(s).replace(/\n/g, '<br>'); }

var S = { who: 'U1', page: 'home', p: {}, flash: null };

/* 沒按送出的東西不會進資料表，但重畫的時候要留著。 */
var DRAFT = {};
function draft(id, fallback) { return DRAFT[id] != null ? DRAFT[id] : (fallback || ''); }

function go(page, p) {
  if (typeof stopAnim === 'function') stopAnim();
  S.page = page; S.p = p || {}; S.flash = null; DRAFT = {};
  window.scrollTo(0, 0);
  render();
}
function me() { return userOf(S.who); }
function isTeacher() { return me().role === 'teacher'; }
function myTeam() { return teamOf(me().teamId); }

function head(eyebrow, title, lead) {
  return '<div class="eyebrow">' + esc(eyebrow) + '</div>' +
    '<h1>' + esc(title) + '</h1>' +
    (lead ? '<p class="lead">' + nl(lead) + '</p>' : '');
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
  var f = PAGES[S.page];
  if (!f) { S.page = isTeacher() ? 'radar' : 'home'; f = PAGES[S.page]; }
  var body = f();
  document.getElementById('app').innerHTML =
    sideBar() + '<div class="main">' + topBar() + demoBar() +
    '<div class="wrap">' + (S.flash ? flashBar() : '') + body + '</div></div>';
}

function flashBar() {
  return '<div class="flash">' + esc(S.flash) + '</div>';
}
/* say() 自己重畫。本來要記得先 say 再 render——順序寫反訊息就永遠不出現，
   而且那是一種只有測試才抓得到的錯。讓它自己負責。 */
function say(m) { S.flash = m; render(); }

function topBar() {
  var u = me();
  if (u.role === 'teacher') {
    var r = radar(u.classId);
    return '<div class="top">' +
      '<span class="badge t">老師端</span>' +
      '<span class="who">' + esc(u.name) + '</span>' +
      '<span class="sp"></span>' +
      '<span>' + esc(DB.Classes[0].name) + '　·　' +
        where('Teams', function (t) { return t.classId === u.classId; }).length + ' 組</span>' +
      '<span>' + (r.length ? r.length + ' 件等你看' : '沒有等你的') + '</span>' +
      '</div>';
  }
  var t = myTeam();
  var st = stallOf(t.teamId);
  return '<div class="top">' +
    '<span class="badge">學生端</span>' +
    '<span class="who">' + esc(t.name) + '</span>' +
    '<span class="sp"></span>' +
    '<span>' + esc(t.project || '（還沒定）') + '</span>' +
    '<span class="' + (st.level ? 'warnx' : '') + '">深度 ' +
      (depthOf(t.teamId) * WORLD.depthPerMilestone) + ' m</span>' +
    '</div>';
}

/* 試用列。真的上線沒有這一條——它在這裡只是為了讓你兩邊都走得完。 */
function demoBar() {
  var opts = DB.Users.map(function (u) {
    return '<option value="' + u.userId + '"' + (u.userId === S.who ? ' selected' : '') + '>' +
      (u.role === 'teacher' ? '老師' : teamOf(u.teamId).name) + '</option>';
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
  if (u.role === 'teacher') {
    headBlock = '<div class="side-head"><div class="k">TEACHER</div>' +
      '<div class="n">' + esc(u.name) + '</div>' +
      '<div class="s">' + esc(DB.Classes[0].name) + ' · 加入碼 ' +
      esc(DB.Classes[0].joinCode) + '</div></div>';
    nav = [
      ['radar', '雷達'], ['ms', '里程碑'], ['classeco', '全班地下城']
    ];
  } else {
    var t = myTeam();
    headBlock = '<div class="side-head"><div class="k">TUNNEL</div>' +
      '<div class="n">' + esc(t.name) + '</div>' +
      '<div class="s">' + esc(t.project || '（還沒定）') + '</div></div>';
    nav = [
      ['home', '坑道'], ['eco', '全班地下城'], ['log', '紀錄']
    ];
  }
  var items = nav.map(function (n) {
    return '<a class="' + (S.page === n[0] ? 'on' : '') + '" data-go="' + n[0] + '">' +
      '<span class="dot"></span>' + esc(n[1]) + '</a>';
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
  S.page = userOf(S.who).role === 'teacher' ? 'radar' : 'home';
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

  risk: function (k) {
    DRAFT.risks = DRAFT.risks || [];
    var i = DRAFT.risks.indexOf(k);
    if (i < 0) DRAFT.risks.push(k); else DRAFT.risks.splice(i, 1);
    render();
  },

  snag: function (k) {
    DRAFT.snags = DRAFT.snags || [];
    var i = DRAFT.snags.indexOf(k);
    if (i < 0) DRAFT.snags.push(k); else DRAFT.snags.splice(i, 1);
    render();
  },

  commit: function (msId) {
    var t = myTeam();
    actCommit(t.teamId, msId, Number(DRAFT.est || RULES.EST_DEFAULT), DRAFT.risks || []);
    go('home');
    say('承諾了。從今天開始，每天推一格。');
  },

  push: function (runId) {
    var t = myTeam();
    /* 有沒有藤蔓要碎——推之前先問，推完狀態就變了 */
    var wasStuck = stallOf(t.teamId).level;
    if (!actPush(t.teamId, runId)) {
      return say('今天已經推過了。一天一格——多按沒有用。');
    }
    var r = find('Runs', function (x) { return x.runId === runId; });
    var msg = RULES.progress(r.pushes, r.est) >= 1
      ? '走到終點了。交出去之後系統會比對你當初承諾的天數。'
      : '推進了一格。明天再來。';
    /* 先播完動畫再重畫——重畫會把 <img> 換掉，動畫就沒了。
       藤蔓先碎，再揮劍：那個順序就是「你把它弄斷了，然後繼續走」。 */
    var swing = function () { animPush(function () { say(msg); }); };
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
    if (!(DRAFT.snags || []).length) return say('點一個就好——哪一個最像。');
    actReflect(t.teamId, runId, DRAFT.snags);
    go('home');
    say('說出來了。老師看得到，而且這不會扣任何東西。');
  },

  gear: function (runId) {
    actTakeGear(runId);
    go('dash', { id: runId });
    animDash();   /* 畫面畫好之後才播——go() 已經重畫過了 */
  },

  /* ---- 老師 ---- */
  publish: function () {
    var title = (document.getElementById('ms-title') || {}).value || '';
    var note = (document.getElementById('ms-note') || {}).value || '';
    if (!title.trim()) return say('先寫這一個里程碑要交什麼。');
    actPublish(me().classId, { title: title.trim(), note: note.trim(), teams: DRAFT.to || [] });
    go('ms');
    say('派出去了。學生那邊會先被問「你打算花幾天」。');
  },

  to: function (teamId) {
    DRAFT.to = DRAFT.to || [];
    var i = DRAFT.to.indexOf(teamId);
    if (i < 0) DRAFT.to.push(teamId); else DRAFT.to.splice(i, 1);
    render();
  },

  pickgear: function (k) { DRAFT.gear = k; render(); },

  grant: function (runId) {
    if (!DRAFT.gear) return say('先選一件。選哪一件等於選一句話。');
    var word = (document.getElementById('gr-word') || {}).value || '';
    actGear(runId, DRAFT.gear, word.trim());
    go('radar');
    say('發出去了。學生那邊會空投落下，然後衝刺。');
  },

  rename: function (teamId) {
    var v = (document.getElementById('rn-' + teamId) || {}).value || '';
    if (!v.trim()) return say('要寫一個新的名字。');
    var t2 = actRename(teamId, v.trim());
    if (!t2) return say('名字沒有變。升一階代表又收斂了一次。');
    say('招牌升成「' + SIGNS[RULES.SIGN_TIERS[t2.signTier]].name + '」了。收斂本身就是成果。');
  }
};
