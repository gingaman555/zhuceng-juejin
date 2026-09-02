/* ---------- 地底下本來就埋著東西 ----------

   兩個洞，同一個修法。

   洞一 · 「打通哪一格」是空的。
          44-dig.js 的註解自己寫著「選方向不影響任何判定」——
          這個系統裡最像遊戲的那個選擇，裡面沒有東西。
          PaGamO 的每一格是一題，這裡的每一格打通就只是變色。
          低頻的系統不可能靠次數贏（一學期八趟），只能靠每一次都很重。

   洞二 · 準跟失準拿到的東西一模一樣。
          一個判定、一根岩心、一格地、一座建築，兩邊都拿到。
          所以唯一有阻力的選擇（估幾天）沒有後果，判定是化妝品。
          這是勝任感那一根最大的洞：做得準沒有任何事情不一樣。

   修法：地底下埋著東西，而且你遇到什麼跟你到得早不早有關。

   要非常小心的一條線——差別只能在「遇到什麼」，不能在「拿到多少」。
   失準的人一樣拿到那一格、那座建築、那根岩心、那一筆圖鑑。
   差的是：準的時候你到得夠早，牠還在；失準的時候牠已經走了，
   你看到的是牠留下的痕跡。兩邊都是一則紀錄，沒有人被扣任何東西。

   一旦變成「準的拿比較多」，這個作品就從自發變成受控，
   而且「失準不扣任何東西」那條前提會當場垮掉。

   埋的東西是用班級與座標算出來的，不是擲骰子——同一個班的同一格
   永遠是同一樣東西。會亂跳的話那就不是一片地，是特效。 */

/* 留下記號的時候敲開岩壁，五次裡大概兩次會敲到東西。

   本來是 14%，因為那時候是一格一擲、一張地圖上上百格，太密就不值錢。
   現在一趟才擲一次，一學期八趟——14% 等於整學期遇到一次，
   那個機制等於不存在。 */
var BURIED_ODDS = 40;

var BURIED = [
  { k: 'mob',    n: '還在睡的東西',
    here: '牠還在這裡，被你走到這裡的動靜吵醒。',
    late: '牠已經走了。留下一層蛻下來的殼。' },
  /* 「上一輪的遺跡」與「牆上刻的字」拿掉了。
     那兩樣挖出來的是別組某一趟的名字與天數，而每一組的專案不一樣
     ——別人「六天」對你不構成任何參考，它只是看起來像內容。

     「空腔：什麼都沒有」也拿掉了。一學期大概敲到三次的東西，
     不能有一次是空的。 */
  { k: 'spring', n: '地下水',
    here: '一道還在流的水。',
    late: '一道乾掉的水痕。' }
];

function buriedDef(k) {
  var out = null;
  BURIED.forEach(function (b) { if (b.k === k) out = b; });
  return out;
}

/* 這一層的岩壁裡有什麼。用班級、組別與深度算，
   同一組走到同一層永遠遇到同一樣東西。

   為什麼要帶組別：每一組走的是自己那一條廊道，
   同一層的岩壁不是同一面牆。 */
function buriedAt(classId, teamId, depth) {
  var h = hash('buried|' + classId + '|' + teamId + '|' + depth);
  if (h % 100 >= BURIED_ODDS) return null;
  return BURIED[(h >>> 9) % BURIED.length];
}

/* 走到那一層的時候，把岩壁裡的東西記下來。

   early 是「你到得夠早」：那一趟的判定是準的。
   它只改變你遇到的是牠本人還是牠留下的痕跡——
   那一層、那座建築、那根岩心、那一筆圖鑑，兩邊都拿到。 */
function actUncover(teamId, depth) {
  var t = teamOf(teamId);
  if (!t) return null;
  var b = buriedAt(t.classId, teamId, depth);
  if (!b) return null;
  var k = 'd' + depth;
  t.found = t.found || {};
  if (t.found[k]) return t.found[k];

  var last = null;
  runsFor(teamId).forEach(function (r) { if (r.run.stamp) last = r.run; });
  var early = !last || last.stamp !== 'late';

  var rec = { k: b.k, early: early ? 1 : 0 };

  /* 蟄伏的東西：那一層住的那幾隻裡的一隻。進圖鑑，標「你遇過」。 */
  if (b.k === 'mob') {
    var f = faunaOf(strataAt(depth, teamId).key);
    if (!f.length) f = allFauna();
    if (f.length) rec.mob = f[hash('bmob|' + teamId + '|' + k) % f.length].n;
  }


  t.found[k] = rec;
  save();
  return rec;
}

/* 這一組在岩壁裡遇過的那幾隻。圖鑑那邊要用。 */
function foundMobs(teamId) {
  var t = teamOf(teamId);
  var out = {};
  Object.keys((t && t.found) || {}).forEach(function (k) {
    var r = t.found[k];
    if (r.mob) out[r.mob] = r.early ? '牠還在' : '只剩痕跡';
  });
  return out;
}
