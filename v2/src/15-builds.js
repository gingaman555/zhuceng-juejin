/* ---------- 蓋在自己那塊地上的東西 ----------

   本來這一步是三選一的裝備。裝備的問題是它沒有地方去：拿到了放在背包裡，
   沒有人看得到，也不改變任何事——所以「道具的意義在哪裡」問了兩次都答不好。

   改成蓋東西，那個問題就消失了：它有一個地方（你打通的那一格），
   而且全班都看得到。

   三條規則，缺一條這件事就會反過來咬整個作品：

   一 · 建築是那一趟的紀念碑，不是獎品。
        一趟封存蓋一座，就蓋在那一趟打通的那一格上。點下去看到的是
        那一趟他們自己取的名、幾天、他們說幾天。所以整片領土就是
        他們的預估史被畫成一個地方——那才是這個系統要教的東西。

   二 · 三個選項完全沒有強弱。沒有產出、沒有加速、不擋任何事。
        只要有一個「比較好」，人就會為了那個蓋，而不是為了專案做事。
        那是受控動機，正好推翻這個作品要證的自發性。
        它們只差在長相。

   三 · 選項由岩層決定，而路線是隨機給的（見 13-strata.js 的 routeOf）。
        所以你的地長什麼樣，記錄的是「你剛好在哪一層」，
        不是「你做得多好」。兩組同樣五格可以完全不像——
        這是平行陪伴的保險：那張圖讀不出高下。

   還有一條是為了陪伴：兩組的建築貼在一起會長出一條連通的路
   （見 66-map.js 的 linkPath）。別人在旁邊是好事，不是威脅。

   畫法跟全作一致：'.' 透空、'#' 本體、'+' 陰影、'*' 高光，光從左上來。
   顏色不用組別的顏色——地是組別的顏色，建築一律深色剪影加高光，
   所以每一組的建築讀起來一樣重，差別只在形狀。 */

var BUILD_PAL = { '#': '#171310', o: '#0B0908', '*': '#FFF3D8' };

/* 六種留下來的記號。形狀本身就是接口：
     火堆 · 繩梯    上下都通
     刻痕 · 掛燈    只朝上（指回你來的方向）
     石堆 · 垂繩    只朝下（給更深的地方）

   本來這裡是「蓋建築」——那是把 PaGamO 的占地建設搬過來，
   跟這個作品的故事相反：建設講的是定居與擁有，而這裡的前提是
   你被困住、想離開。被困在輪迴裡的人會做的，是留記號給下一圈的
   自己——而六層走完會回到同一層，你一定會再走到這裡。 */
var FORMS = {
  fire: ['................', '.......*........', '......*#*.......', '.....*#*#*......', 
    '....*#*#*#*.....', '....#*###*#.....', '...*#*###*#*....', '...*#######*....', 
    '....*#####*.....', '..++*#####*++...', '.++++++#++++++..', '..++++++++++....'],
  ladder: ['...+#+....+#+...', '...+#+....+#+...', '...+#######+#+..', '...+#+....+#+...', 
    '...+#+....+#+...', '...+#######+#+..', '...+#+....+#+...', '...+#+....+#+...', 
    '...+#######+#+..', '...+#+....+#+...', '...+#+....+#+...', '...+#+....+#+...'],
  mark: ['.......*........', '......*#*.......', '.....*#*#*......', '....*#*.*#*.....', 
    '...*#*...*#*....', '......#.........', '......#.........', '......#.........', 
    '......#.........', '......#.........', '.....+#+........', '....++#++.......'],
  lamp: ['..*###+.........', '..*#+...........', '..*#+..*###+....', '..*#####*..*+...', 
    '..*#+..*#**#+...', '..*#+..*####+...', '..*#+..*####+...', '..*#+..+####+...', 
    '..*#+...+##+....', '..*#+...........', '..+#+...........', '..+++...........'],
  cairn: ['................', '................', '......*##+......', '......*##+......', 
    '.....*####+.....', '.....*####+.....', '....*######+....', '....*######+....', 
    '...*########+...', '..*##########+..', '.+############+.', '+##############+'],
  rope: ['..*######+......', '.......+#+......', '.......+#+......', '........+#+.....', 
    '........+#+.....', '.......+#+......', '.......+#+......', '......+#+.......', 
    '......+#+.......', '.......+#+......', '.......+#+......', '.......+#+......']
};

/* 六筆，不是十八筆。

   本來每一層各有三筆，所以 wild_fire 跟 crys_fire 是兩筆資料、同一個形狀、
   同一個名字，差別只有 zone 欄位——而 zone 從深度就算得出來（strataAt）。
   顏色是那一層的顏色，形狀是你挑的，兩件事本來就該分開存。 */
var BUILDS = [
  { key: 'fire',   name: '火堆', port: 'ud', px: FORMS.fire },
  { key: 'ladder', name: '繩梯', port: 'ud', px: FORMS.ladder },
  { key: 'mark',   name: '刻痕', port: 'u',  px: FORMS.mark },
  { key: 'lamp',   name: '掛燈', port: 'u',  px: FORMS.lamp },
  { key: 'cairn',  name: '石堆', port: 'd',  px: FORMS.cairn },
  { key: 'rope',   name: '垂繩', port: 'd',  px: FORMS.rope }
];

/* 這一趟可以留下的三種。一個接口一個：上下通、只朝上、只朝下——
   所以上一層垂下來的口一定接得上，而三個之間沒有強弱。

   同一個接口下有兩種形狀，給你目前留得比較少的那一個。
   這是「循環的是環境不是內容」那條：走回同一個地層，顏色會一樣
   （地層真的循環了），但形狀不會——營地上不會出現重複的一段。
   計數是分層計的：只看你在「這個地層」留過什麼，不看別層。
   平手的時候用深度決定，同一組走到同一層永遠拿到同一組選項。 */
var PORTS = ['ud', 'u', 'd'];

function offerAt(teamId, depth) {
  var t = teamOf(teamId);
  var here = strataAt(depth, teamId).key;
  var have = {};
  Object.keys((t && t.builds) || {}).forEach(function (k) {
    var od = Number(k.slice(1));
    if (strataAt(od, teamId).key !== here) return;
    var d = buildDef(t.builds[k].k);
    if (d) have[d.key] = (have[d.key] || 0) + 1;
  });
  return PORTS.map(function (p) {
    var pair = BUILDS.filter(function (x) { return x.port === p; });
    var da = have[pair[0].key] || 0;
    var db = have[pair[1].key] || 0;
    if (da !== db) return da < db ? pair[0] : pair[1];
    return pair[hash('offer|' + p + '|' + teamId + '|' + depth) % 2];
  });
}

/* 舊的存檔裡是 wild_fire 這種寫法（層＿形狀）。底線後面那一段就是形狀，
   所以舊資料不用搬也讀得出來。 */
function buildDef(key) {
  var k = String(key || '');
  if (k.indexOf('_') >= 0) k = k.split('_')[1];
  var out = null;
  BUILDS.forEach(function (b) { if (b.key === k) out = b; });
  return out;
}

/* 這一層蓋了什麼。回傳 { k, runId } 或 null。

   本來是掛在格子的座標上。格子地圖退休之後改掛在深度上——
   一趟走完深度加一，那一層就是那一趟的位置。 */
function buildAt(teamId, depth) {
  var t = teamOf(teamId);
  return (t && t.builds && t.builds['d' + depth]) || null;
}

/* 蓋下去。一層只蓋一次——蓋錯了也留著，那也是那一趟的一部分。 */
function actBuild(teamId, depth, key, runId) {
  var t = teamOf(teamId);
  if (!t) return false;
  if (!buildDef(key)) return false;
  if (depth < 0 || depth >= depthOf(teamId)) return false;
  t.builds = t.builds || {};
  if (t.builds['d' + depth]) return false;
  t.builds['d' + depth] = { k: key, runId: runId || '' };
  save();
  return true;
}

/* 還沒蓋東西的那一層。沒有就回 -1。

   通常只會有一層——走完一趟才多一層。回最淺的那一層，
   萬一中間漏掉一層（改過資料、或是舊的存檔）也補得回來。 */
function unbuiltDepth(teamId) {
  var t = teamOf(teamId);
  if (!t) return -1;
  var bs = t.builds || {};
  var n = depthOf(teamId);
  for (var d = 0; d < n; d++) if (!bs['d' + d]) return d;
  return -1;
}

/* 最近封存的那一趟。蓋下去的東西要記得它是哪一趟的紀念碑——
   沒有這一條，建築就只是裝飾。 */
function lastSealed(teamId) {
  var ks = keepsOf(teamId);
  return ks.length ? ks[ks.length - 1].runId : '';
}

/* 這一層上站的是哪一趟。點下去看得到的就是這個。 */
function buildStory(teamId, depth) {
  var b = buildAt(teamId, depth);
  if (!b) return null;
  var k = null;
  keepsOf(teamId).forEach(function (x) { if (x.runId === b.runId) k = x; });
  var r = b.runId ? find('Runs', function (x) { return x.runId === b.runId; }) : null;
  return { def: buildDef(b.k), keep: k, run: r };
}

/* ---------- 接口 ----------

   每一座有「上接」與「下接」兩個口。往下走的時候，上一層留下的
   向下口就是這一層的題目：選一座有向上口的就接起來。

   接得上不會比較好，只是形狀不同——一旦它有好處，人就會為了接而蓋。 */
function hasPort(key, dir) {
  var d = buildDef(key);
  return !!(d && d.port && d.port.indexOf(dir) >= 0);
}

/* 這一層跟上一層接得起來嗎。 */
function linksUp(teamId, depth, key) {
  if (depth <= 0) return false;
  var up = buildAt(teamId, depth - 1);
  if (!up) return false;
  return hasPort(up.k, 'd') && hasPort(key, 'u');
}

/* 上一層留了向下的口嗎——那就是這一層的題目。 */
function portAbove(teamId, depth) {
  if (depth <= 0) return null;
  var up = buildAt(teamId, depth - 1);
  if (!up || !hasPort(up.k, 'd')) return null;
  return buildDef(up.k);
}

/* 已經接起來的那幾段。剖面圖要畫連接。 */
function linkedAt(teamId, depth) {
  var a = buildAt(teamId, depth), b = buildAt(teamId, depth + 1);
  if (!a || !b) return false;
  return hasPort(a.k, 'd') && hasPort(b.k, 'u');
}
