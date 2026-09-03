/* 地層。六層。

   四層是上一個作品留下來的（微光荒原、水晶迴廊、迴聲迷宮、熔火深淵），
   配色與名字照搬——但意思整個換掉了。

   在那邊，它們是四個關卡：第一層專案定義、第二層調查分析……走完一層
   才准進下一層，每一層有一隻守關生物擋著。那是課綱，不是地質。

   在這裡，它們是岩層。整座地下城本來就長這樣，全班共用同一片地質，
   誰在哪一層都看得到，也沒有哪一層需要「開」。深度變了，岩石就變了——
   就這樣，沒有別的意思。

   另外兩層是這一版新的：根脈層（上面那片林子的根穿下來）
   與銹層（有人來過，鐵件鏽在岩層裡）。放在這兩個位置是因為
   它們各自回答一件事——上面還有東西活著、你不是第一個下來的。

   每一層綁四樣東西，而且四樣都要一起換，不然那一層只是換個顏色：
     pal    生物與物件的配色
     bg     牆的底色
     tex    牆的紋理（廊道與剖面圖共用同一份，見 53/54 的 z- 與 .xs-band）
     fauna  住在這一層的東西（見 14-fauna.js 與 PACK.creatures 的 r 欄位）

   六層沒有先後。哪一層先給到是隨機的（見 routeOf），所以底下那一句寫的是
   「這裡的石頭長什麼樣」，不是「你在這一層要學會什麼」。
   一旦寫成後者，那張剖面圖就變回一條進度條。 */

var STRATA = [
  {
    key: 'wild', name: '微光荒原',
    note: '表土。碎石多，光還下得來一點。',
    pal: { '#': '#C9A227', o: '#9A7E22', '*': '#F2E6C8' },
    bg: '#171208', line: '#3A2E12',
    spal: {k:'#0A0705',a:'#171208',b:'#241B0C',c:'#3A2E12',d:'#120E06',e:'#2A2010',f:'#3F3116',g:'#6B5518',h:'#9A7E22',i:'#C9A227',j:'#F2E6C8'}
  },
  {
    key: 'root', name: '根脈層',
    note: '上面那片林子的根穿下來。牆是活的，摸起來是濕的。',
    pal: { '#': '#7FA866', o: '#3E5533', '*': '#D8F0C0' },
    bg: '#0F1A0C', line: '#26381D',
    spal: {k:'#060B05',a:'#0F1A0C',b:'#172817',c:'#26381D',d:'#0A1208',e:'#1B2A14',f:'#2A3E1E',g:'#3E5533',h:'#5C7D45',i:'#7FA866',j:'#D8F0C0'}
  },
  {
    key: 'crys', name: '水晶迴廊',
    note: '地下水穿過晶體。走通的斷面會折光。',
    pal: { '#': '#5FA8C7', o: '#3E7E96', '*': '#D8F2FA' },
    bg: '#0C1720', line: '#173445',
    spal: {k:'#050B10',a:'#0C1720',b:'#122430',c:'#173445',d:'#08121A',e:'#142833',f:'#1E3B4A',g:'#2C5C70',h:'#3E7E96',i:'#5FA8C7',j:'#D8F2FA'}
  },
  {
    key: 'echo', name: '迴聲迷宮',
    note: '方塊狀的硬岩。聲音在裡面會繞，你會聽到自己剛剛講的話。',
    pal: { '#': '#8C7BC7', o: '#625397', '*': '#E4DCFA' },
    bg: '#131024', line: '#2E2750',
    spal: {k:'#080612',a:'#131024',b:'#1E1936',c:'#2E2750',d:'#0C0A1A',e:'#1A1630',f:'#272049',g:'#4A3E78',h:'#625397',i:'#8C7BC7',j:'#E4DCFA'}
  },
  {
    key: 'rust', name: '銹層',
    note: '有人來過。鐵件鏽在岩層裡，接縫還看得出來。',
    pal: { '#': '#B07A4A', o: '#6B4526', '*': '#E8C79A' },
    bg: '#1A1310', line: '#3E2A1C',
    spal: {k:'#0B0806',a:'#1A1310',b:'#271C15',c:'#3E2A1C',d:'#130D0A',e:'#2C1F17',f:'#402D1F',g:'#6B4526',h:'#8C5D35',i:'#B07A4A',j:'#E8C79A'}
  },
  {
    key: 'fire', name: '熔火深淵',
    note: '底下有熱源。再往下，你會回到微光荒原。',
    pal: { '#': '#D9603F', o: '#9E4026', '*': '#FAD9CC' },
    bg: '#1C0E09', line: '#4A2013',
    spal: {k:'#0C0503',a:'#1C0E09',b:'#2A1510',c:'#4A2013',d:'#150805',e:'#2E1710',f:'#452115',g:'#7E3320',h:'#9E4026',i:'#D9603F',j:'#FAD9CC'}
  }
];

/* ---------- 無盡輪迴 ----------

   六層走完會回到第一層，順序是隨機給的，而且一直循環。

   隨機有兩個理由，第二個才是真正的：

   一 · 被困在裡面。往下走不出去，深度因此徹底不是進度，也不是出口。
   二 · 這個系統要在專案進行到一半的時候也能開始用。固定的路線等於
        「你從第一層開始」，那預設了使用者的專案剛起步。隨機給就沒有
        這個預設——你在哪一層醒來只是你在哪一層醒來。

   隨機但不是每次重畫都不一樣：用組別算，同一組同一個深度永遠同一層。
   會亂跳的東西不是地下城，是特效。

   代價是全班那張剖面圖不再有共通的地層帶。那是對的——同樣 160 公尺，
   兩組看到的東西不一樣，就沒得比。 */
/* 一層待幾個任務。本來是 2——六層一圈就要 12 趟，而一學期大約 8 趟，
   所以「走完六層回到第一層」那件事沒有人遇得到。改成 1：六趟一圈，
   第 7 趟回到第一層，那時候他會走進自己第 1 趟留下的記號旁邊。 */
var ZONE_SPAN = 1;
var CYCLE = ZONE_SPAN * STRATA.length;

/* 順序是一個班洗一次，班內共用。

   本來是一組洗一次。那樣殺得掉比較（同樣 160 公尺，兩組看到的不一樣），
   但也殺掉了關聯性：同班的人不再站在同一片地質上，
   「我們在同一個地方」就沒了。

   改成一個班一份：你們班的地下城長什麼樣是你們班的，跟隔壁班不一樣；
   班內同一個深度看到的是同一種石頭。而順序本身是隨機的，
   所以它不代表任何進度——第三層不比第一層「後面」。 */
function routeOf(classId) {
  var idx = [], i;
  for (i = 0; i < STRATA.length; i++) idx.push(i);
  var h = hash('route|' + (classId || ''));
  for (i = idx.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    var j = h % (i + 1), t = idx[i];
    idx[i] = idx[j]; idx[j] = t;
  }
  return idx;
}

/* 這個深度是哪一層。第二個參數收組別或班級都可以——
   收到組別就換成它的班，這樣呼叫端不用每一處都改。 */
function strataAt(depth, who) {
  var t = who ? teamOf(who) : null;
  var cid = t ? t.classId : (who || '');
  var r = routeOf(cid);
  var n = Math.floor((Number(depth) || 0) / ZONE_SPAN);
  return STRATA[r[((n % r.length) + r.length) % r.length]];
}

/* 第幾圈。走完六層算一圈。 */
function cycleAt(depth) {
  return Math.floor((Number(depth) || 0) / CYCLE);
}

/* untilNextZone 拿掉了：一層一趟之後它永遠回 1，而且沒有人用它。 */

/* 一層裡住著哪些東西。

   PACK.creatures 的 r 欄位就是原本那四層的名字，新的兩層在 14-fauna.js。
   兩邊一起找——生態系不用另外編，牠們本來就分在各層裡。
   擋在你廊道盡頭的那一隻，就是從這裡挑出來的（見 mobFor）。 */
function allFauna() {
  return PACK.creatures.concat(typeof EXTRA_FAUNA === 'undefined' ? [] : EXTRA_FAUNA);
}

function faunaOf(key) {
  var s = null;
  for (var i = 0; i < STRATA.length; i++) if (STRATA[i].key === key) s = STRATA[i];
  if (!s) return [];
  return allFauna().filter(function (c) { return c.r === s.name; });
}

/* 這一層的第 n 隻。用層與序號算，不擲骰子——
   每次打開，同一隻都在同一個地方，那張剖面圖才是一個地方。 */
function faunaAt(key, n) {
  var f = faunaOf(key);
  if (!f.length) return null;
  return f[hash(key + '~' + n) % f.length];
}

/* 名字找生物。點開剖面圖上那一隻的時候用。 */
function faunaByName(n) {
  var all = allFauna();
  for (var i = 0; i < all.length; i++) if (all[i].n === n) return all[i];
  return null;
}

/* 擋在廊道盡頭的那一隻。

   這裡本來是從全部四十隻裡挑，跟你在多深的地方無關——那條線是斷的。
   現在牠來自你所在那一層的住民：走到 160 公尺，擋你的就是住在水晶
   迴廊的東西。生物跟系統的連接就是這一條，而且是雙向的——
   你在剖面圖的岩壁上看到的那幾隻，就是你下一趟可能遇到的那幾隻。

   哪一隻仍然是任務 ＋ 組算出來的，所以全班同一個任務不是同一隻。 */
/* 第三個參數是「那一趟在哪一層」。不給就是現在這一層（還在走的那一趟）。

   本來沒有這個參數，於是每一趟都在**現在**這一層裡挑：一條帶子上
   八格全部從同四隻裡挑，撞在一起是常態；而且一趟走完之後牠還會
   跟著你變深而改變——那一趟盡頭擋路的那一隻不該在事後被換掉。 */
/* 擋在盡頭的那一隻。從那一趟的地方來——他選了地方，
   就等於選了這一趟要遇到誰，而圖鑑記的就是遇過誰。 */
function mobFor(msId, teamId, depth, zone) {
  var zk = zone;
  if (!zk) {
    var d = depth == null ? depthOf(teamId) : depth;
    zk = strataAt(d, teamId).key;
  }
  var f = faunaOf(zk);
  if (!f.length) f = allFauna();
  return f[hash(msId + '|' + teamId) % f.length];
}
