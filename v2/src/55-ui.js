/* 畫面的底：字串拼 HTML、一個路由、一次重畫。

   沒有覆寫層，也沒有模板補丁——每一個畫面就是下面那幾支函式，
   改一句話只要改一個地方。 */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function nl(s) { return esc(s).replace(/\n/g, '<br>'); }

var S = { who: 'U1', page: 'home', p: {}, flash: null };

/* 打到一半的字。畫面每次動作都整頁重畫，沒有這一層的話
   「這一項多做了什麼」打到一半去勾一條清單，字就沒了。
   它只活在記憶體裡——沒按送出的東西不會進資料表。 */
var DRAFT = {};
function keepDraft() {
  ['extra', 'blocker', 'reason', 'redig', 'verdict'].forEach(function (id) {
    var e = document.getElementById(id);
    if (e) DRAFT[id] = e.value;
  });
}
function draft(id, fallback) { return DRAFT[id] != null ? DRAFT[id] : (fallback || ''); }

function go(page, p) {
  S.page = page; S.p = p || {}; S.flash = null; DRAFT = {};
  window.scrollTo(0, 0);
  render();
}
function me() { return userOf(S.who); }
function isTeacher() { return me().role === 'teacher'; }
function myTeam() { return teamOf(me().teamId); }

/* 一段固定的頁首 */
function head(eyebrow, title, lead) {
  return '<div class="eyebrow">' + esc(eyebrow) + '</div>' +
    '<h1>' + esc(title) + '</h1>' +
    (lead ? '<p class="lead">' + nl(lead) + '</p>' : '');
}

function layerVars(L) {
  var p = layerPal(L);
  return 'style="--L:' + p['#'] + ';--Ld:' + p.o + ';--Ll:' + p['*'] +
    ';--Lbg:' + p.bg + ';--Lline:' + p.line + '"';
}

/* 期限一律走 RULES.due，畫面不自己算日期 */
function dueTag(due) {
  var d = RULES.due(due, now());
  if (d.none) return '<span class="pill">期限　不設限</span>';
  return '<span class="pill ' + (d.over ? 'over' : d.tone === 'warn' ? 'gold' : '') + '">期限　' +
    esc(d.text) + '</span>';
}

var EFFORT = { fast: '比預估快', same: '差不多', slow: '比預估慢' };

function mobImg(m, dim, cls) {
  var pal = m.pal || layerPal(m.L || 1);
  return '<img class="' + (cls || '') + '" src="' + pxSvg(m.px, pal, dim) + '" alt="">';
}

/* ---------- 路由 ---------- */

var PAGES = {};

function render() {
  var f = PAGES[S.page];
  if (!f) { S.page = isTeacher() ? 'queue' : 'home'; f = PAGES[S.page]; }
  var body = f();
  document.getElementById('app').innerHTML =
    sideBar() + '<div class="main">' + topBar() + demoBar() +
    '<div class="wrap">' + body + '</div></div>';
}

function topBar() {
  var u = me();
  if (u.role === 'teacher') {
    var st = teacherStats();
    return '<div class="top">' +
      '<span class="badge t">老師端</span>' +
      '<span class="who">' + esc(u.name) + '</span>' +
      '<span class="sp"></span>' +
      '<span>設計專題　·　' + classTeams('C1').length + ' 組</span>' +
      '<span>合格考量 ' + st.n + ' 件</span>' +
      '</div>';
  }
  var t = myTeam();
  var L = LAYERS[t.layer - 1];
  var sc = scoreOf(t.teamId), b = board('C1');
  var rank = 0;
  b.forEach(function (r) { if (r.team.teamId === t.teamId) rank = r.rank; });
  return '<div class="top">' +
    '<span class="badge">學生端</span>' +
    '<span class="who">' + esc(t.name) + '</span>' +
    '<span class="sp"></span>' +
    '<span>' + esc(L.name) + '　·　停留 ' + RULES.stayDays(t.enteredAt, now()) + ' 天</span>' +
    '<a class="plain" data-go="board">' + sc.total + ' 分　·　第 ' + rank + ' 名 / ' +
      b.length + ' 組</a>' +
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
    '<select data-act="who" style="width:auto;padding:2px 8px;font-size:11px">' + opts + '</select>' +
    '<span class="sp" style="flex:1"></span>' +
    '<a class="plain" style="font-size:11px" data-act="forward">把時間往前推一天</a>' +
    '<a class="plain" style="font-size:11px" data-act="reset">整班重來</a>' +
    '</div>';
}

function sideBar() {
  var u = me();
  var nav, headBlock;
  if (u.role === 'teacher') {
    headBlock = '<div class="side-head"><div class="k">TEACHER</div>' +
      '<div class="n">' + esc(u.name) + '</div>' +
      '<div class="s">設計專題 · 加入碼 ' + esc(DB.Classes[0].joinCode) + '</div></div>';
    nav = [
      ['queue', '待你驗收'], ['tasks', '任務清單'], ['gate', '關卡審核'],
      ['tcurve', '各組的剖面'], ['classmap', '全班位置'],
      ['world', '學生端的世界'], ['final', '期末回顧']
    ];
  } else {
    var t = myTeam();
    headBlock = '<div class="side-head"><div class="k">TEAM</div>' +
      '<div class="n">' + esc(t.name) + '</div>' +
      '<div class="s">' + esc(LAYERS[t.layer - 1].name) + ' · 停留 ' +
        RULES.stayDays(t.enteredAt, now()) + ' 天</div></div>';
    nav = [
      ['home', '首頁'], ['list', '任務清單'], ['stack', '他寫過的'],
      ['dex', '圖鑑'], ['curve', '剖面'], ['board', '排行榜'],
      ['log', '紀錄'], ['map', '迷霧地圖'],
      ['end', t.finished ? '結局' : '？？？']
    ];
  }
  var items = nav.map(function (n) {
    return '<a class="' + (S.page === n[0] ? 'on' : '') + '" data-go="' + n[0] + '">' +
      '<span class="dot"></span>' + esc(n[1]) + '</a>';
  }).join('');
  return '<div class="side">' + headBlock + '<div class="nav">' + items + '</div></div>';
}

/* ---------- 事件 ---------- */

function val(sel) { var e = document.querySelector(sel); return e ? e.value : ''; }

document.addEventListener('click', function (ev) {
  var g = ev.target.closest('[data-go]');
  if (g) { go(g.getAttribute('data-go'), JSON.parse(g.getAttribute('data-p') || '{}')); return; }
  var a = ev.target.closest('[data-act]');
  if (!a) return;
  var act = a.getAttribute('data-act');
  var p = JSON.parse(a.getAttribute('data-p') || '{}');
  if (ACTS[act]) { ACTS[act](p, a); }
});

document.addEventListener('change', function (ev) {
  var a = ev.target.closest('[data-act]');
  if (!a) return;
  var act = a.getAttribute('data-act');
  if (act === 'who') { S.who = a.value; S.page = userOf(S.who).role === 'teacher' ? 'queue' : 'home'; render(); }
});

var ACTS = {
  forward: function () { CLOCK += 86400000; render(); },
  reset: function () { seed(); S.who = 'U1'; go('home'); }
};
