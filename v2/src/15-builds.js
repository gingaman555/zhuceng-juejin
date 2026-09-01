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

/* 六種形狀。形狀本身就是接口：
     橋 · 門    兩端都有口
     塔 · 柱    只有向上的口
     堆 · 穴    只有向下的口

   本來是十八個各自的剪影，12×12 畫在 44px 上根本分不出來——
   分不出拱門跟根門，也分不出石堆跟苔丘。要學十八個形狀沒有人會學。
   現在只要學六個，而且學會之後不用再看接口的記號。 */
var FORMS = {
  bridge: ['................', '..*##########+..', '..*##########+..', '..+##########+..', 
    '..+#+......+#+..', '..+#+......+#+..', '..+#+......+#+..', '..+#+......+#+..', 
    '..+#+......+#+..', '..+#+......+#+..', '.+###+....+###+.', '.+###+....+###+.'],
  arch: ['................', '....*######+....', '...*##****##+...', '..*##+....+##+..', 
    '..*#+......+#+..', '..*#+......+#+..', '..*#+......+#+..', '..*#+......+#+..', 
    '..*#+......+#+..', '..*#+......+#+..', '.+###+....+###+.', '.+###+....+###+.'],
  tower: ['......**........', '.....*##+.......', '.....*##+.......', '....*####+......', 
    '....*####+......', '...*######+.....', '...*######+.....', '..*########+....', 
    '..*########+....', '.*##########+...', '+############+..', '+############+..'],
  mast: ['....*####+......', '....*###+.......', '....*##+........', '....*#+.........', 
    '....*#+.........', '....*#+.........', '....*#+.........', '....*#+.........', 
    '....*#+.........', '....*#+.........', '...+###+........', '..+#####+.......'],
  mound: ['................', '................', '................', '.......**.......', 
    '......*##+......', '.....*####+.....', '....*######+....', '...*########+...', 
    '..*##########+..', '.*############+.', '+##############+', '+##############+'],
  well: ['................', '..*+........+*..', '..*#+......+#*..', '..*##########*..', 
    '.....+####+.....', '................', '..*##########+..', '..*##########+..', 
    '..*#+......+#*..', '..*#+......+#*..', '..*##########+..', '.+############+.']
};

/* 名字給的是「這是哪一層的」，形狀給的是「它接得上什麼」。
   兩件事分開，各自都好懂。 */
var BUILDS = [
  { key: 'wildbr', zone: 'wild', name: '石橋', form: 'bridge', port: 'ud', px: FORMS.bridge },
  { key: 'wildto', zone: 'wild', name: '石塔', form: 'tower', port: 'u', px: FORMS.tower },
  { key: 'wildmo', zone: 'wild', name: '石堆', form: 'mound', port: 'd', px: FORMS.mound },
  { key: 'rootar', zone: 'root', name: '根門', form: 'arch', port: 'ud', px: FORMS.arch },
  { key: 'rootma', zone: 'root', name: '根柱', form: 'mast', port: 'u', px: FORMS.mast },
  { key: 'rootwe', zone: 'root', name: '根穴', form: 'well', port: 'd', px: FORMS.well },
  { key: 'crysbr', zone: 'crys', name: '晶橋', form: 'bridge', port: 'ud', px: FORMS.bridge },
  { key: 'crysto', zone: 'crys', name: '晶塔', form: 'tower', port: 'u', px: FORMS.tower },
  { key: 'crysmo', zone: 'crys', name: '晶堆', form: 'mound', port: 'd', px: FORMS.mound },
  { key: 'echoar', zone: 'echo', name: '岩門', form: 'arch', port: 'ud', px: FORMS.arch },
  { key: 'echoma', zone: 'echo', name: '岩柱', form: 'mast', port: 'u', px: FORMS.mast },
  { key: 'echowe', zone: 'echo', name: '岩穴', form: 'well', port: 'd', px: FORMS.well },
  { key: 'rustbr', zone: 'rust', name: '鐵橋', form: 'bridge', port: 'ud', px: FORMS.bridge },
  { key: 'rustto', zone: 'rust', name: '鐵塔', form: 'tower', port: 'u', px: FORMS.tower },
  { key: 'rustmo', zone: 'rust', name: '鐵堆', form: 'mound', port: 'd', px: FORMS.mound },
  { key: 'firear', zone: 'fire', name: '火門', form: 'arch', port: 'ud', px: FORMS.arch },
  { key: 'firema', zone: 'fire', name: '火柱', form: 'mast', port: 'u', px: FORMS.mast },
  { key: 'firewe', zone: 'fire', name: '火穴', form: 'well', port: 'd', px: FORMS.well }
];

/* 這一層蓋得出來的三種。三種就是那一層的全部——
   選單再長就會變成城市模擬，而且會有人開始挑「哪一個看起來比較厲害」。 */
function buildsIn(zoneKey) {
  return BUILDS.filter(function (b) { return b.zone === zoneKey; });
}

function buildDef(key) {
  var out = null;
  BUILDS.forEach(function (b) { if (b.key === key) out = b; });
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
