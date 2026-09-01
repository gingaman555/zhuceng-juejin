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

/* 大約七分之一的格子裡有東西。

   一開始放四分之一，畫出來滿地都是痕跡，反而看不出「這裡有東西」——
   太密就不值錢，太疏就不會有人想去找。 */
var BURIED_ODDS = 14;

var BURIED = [
  { k: 'mob',    n: '蟄伏的東西',
    here: '牠還在這裡，被你打通的那一下驚醒。',
    late: '牠已經走了。留下一層蛻下來的殼。' },
  { k: 'relic',  n: '上一輪的遺跡',
    here: '有人在這裡蓋過東西，還立著。',
    late: '有人在這裡蓋過東西，只剩地基。' },
  { k: 'mark',   n: '牆上刻的字',
    here: '有人在這面牆上刻了一句話。',
    late: '有人在這面牆上刻過字，水沖掉一半。' },
  { k: 'spring', n: '地下水',
    here: '一道還在流的水。',
    late: '一道乾掉的水痕。' },
  { k: 'hollow', n: '空腔',
    here: '一個空的腔室，什麼都沒有。',
    late: '一個空的腔室，什麼都沒有。' }
];

function buriedDef(k) {
  var out = null;
  BURIED.forEach(function (b) { if (b.k === k) out = b; });
  return out;
}

/* 這一格裡有什麼。用班級與座標算，同一個班的同一格永遠一樣。 */
function buriedAt(classId, x, y) {
  var h = hash('buried|' + classId + '|' + x + ',' + y);
  if (h % 100 >= BURIED_ODDS) return null;
  return BURIED[(h >>> 9) % BURIED.length];
}

/* 岩層表面看不看得出來這一格有東西。

   看得出來，「往哪裡打通」才會變成一個真的選擇——
   而「先到處看看」也才有報酬。看得出「有東西」但看不出「是什麼」，
   那一格才值得去。 */
function buriedHint(classId, x, y) {
  return !!buriedAt(classId, x, y);
}

/* 打通那一格的時候，把裡面的東西記下來。

   early 是「你到得夠早」：上一趟的判定是準的。
   它只改變你遇到的是牠本人還是牠留下的痕跡——
   那一格、那座建築、那根岩心、那一筆圖鑑，兩邊都拿到。 */
function actUncover(teamId, x, y) {
  var t = teamOf(teamId);
  if (!t) return null;
  var b = buriedAt(t.classId, x, y);
  if (!b) return null;
  var k = x + ',' + y;
  t.found = t.found || {};
  if (t.found[k]) return t.found[k];

  var last = null;
  runsFor(teamId).forEach(function (r) { if (r.run.stamp) last = r.run; });
  var early = !last || last.stamp === 'ok';

  var rec = { k: b.k, early: early ? 1 : 0 };

  /* 牆上刻的字：刻的是真的東西——別的組封存過的某一趟叫什麼名字。
     系統不編故事，它只是把別人留下來的東西放在你會走到的地方。 */
  if (b.k === 'mark') {
    var pool = [];
    where('Teams', function (o) {
      return o.classId === t.classId && o.teamId !== teamId;
    }).forEach(function (o) {
      keepsOf(o.teamId).forEach(function (kp) { if (kp.name) pool.push(kp.name); });
    });
    if (pool.length) rec.say = pool[hash('mark|' + t.classId + '|' + k) % pool.length];
  }

  /* 蟄伏的東西：那一層住的那幾隻裡的一隻。進圖鑑，標「你遇過」。 */
  if (b.k === 'mob') {
    var f = faunaOf(strataAt(y, t.classId).key);
    if (!f.length) f = allFauna();
    if (f.length) rec.mob = f[hash('bmob|' + t.classId + '|' + k) % f.length].n;
  }

  /* 上一輪的遺跡：這一層蓋得出來的東西裡的一種。 */
  if (b.k === 'relic') {
    var bs = buildsIn(strataAt(y, t.classId).key);
    if (bs.length) rec.build = bs[hash('brel|' + t.classId + '|' + k) % bs.length].key;
  }

  t.found[k] = rec;
  save();
  return rec;
}

/* 這一組在地底下遇過的那幾隻。圖鑑那邊要用。 */
function foundMobs(teamId) {
  var t = teamOf(teamId);
  var out = {};
  Object.keys((t && t.found) || {}).forEach(function (k) {
    var r = t.found[k];
    if (r.mob) out[r.mob] = r.early ? '牠還在' : '只剩痕跡';
  });
  return out;
}
