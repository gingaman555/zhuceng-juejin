/* 地層。六層。

   四層是上一個作品留下來的（微光荒原、水晶迴廊、迴聲迷宮、熔火深淵），
   配色與名字照搬——但意思整個換掉了。

   在那邊，它們是四個關卡：第一層專案定義、第二層調查分析……走完一層
   才准進下一層，每一層有一隻守關生物擋著。那是課綱，不是地質。

   在這裡，它們是岩層。整座地下城本來就長這樣，全班共用同一片地質，
   誰在哪一層都看得到，也沒有哪一層需要「開」。深度變了，岩石就變了——
   就這樣，沒有別的意思。

   另外兩層是這一版新的：根脈層（表土下面，上面那片林子的根穿下來）
   與銹層（有人來過，鐵件鏽在岩層裡）。放在這兩個位置是因為
   它們各自回答一件事——上面還有東西活著、你不是第一個下來的。

   每一層綁四樣東西，而且四樣都要一起換，不然那一層只是換個顏色：
     pal    生物與物件的配色
     bg     牆的底色
     tex    牆的紋理（廊道與剖面圖共用同一份，見 53/54 的 z- 與 .xs-band）
     fauna  住在這一層的東西（見 14-fauna.js 與 PACK.creatures 的 r 欄位）

   底下那一句寫的是「這裡的石頭長什麼樣」，不是「你在這一層要學會什麼」。
   一旦寫成後者，那張剖面圖就變回一條進度條。 */

var STRATA = [
  {
    key: 'wild', name: '微光荒原', from: 0, to: 1,
    note: '表土。碎石多，光還下得來一點。',
    pal: { '#': '#C9A227', o: '#9A7E22', '*': '#F2E6C8' },
    bg: '#171208', line: '#3A2E12'
  },
  {
    key: 'root', name: '根脈層', from: 2, to: 3,
    note: '上面那片林子的根穿下來。牆是活的，摸起來是濕的。',
    pal: { '#': '#7FA866', o: '#3E5533', '*': '#D8F0C0' },
    bg: '#0F1A0C', line: '#26381D'
  },
  {
    key: 'crys', name: '水晶迴廊', from: 4, to: 5,
    note: '地下水穿過晶體。走通的斷面會折光。',
    pal: { '#': '#5FA8C7', o: '#3E7E96', '*': '#D8F2FA' },
    bg: '#0C1720', line: '#173445'
  },
  {
    key: 'echo', name: '迴聲迷宮', from: 6, to: 7,
    note: '方塊狀的硬岩。聲音在裡面會繞，你會聽到自己剛剛講的話。',
    pal: { '#': '#8C7BC7', o: '#625397', '*': '#E4DCFA' },
    bg: '#131024', line: '#2E2750'
  },
  {
    key: 'rust', name: '銹層', from: 8, to: 9,
    note: '有人來過。鐵件鏽在岩層裡，接縫還看得出來。',
    pal: { '#': '#B07A4A', o: '#6B4526', '*': '#E8C79A' },
    bg: '#1A1310', line: '#3E2A1C'
  },
  {
    key: 'fire', name: '熔火深淵', from: 10, to: 9999,
    note: '底下有熱源。往下沒有盡頭，只是越來越燙。',
    pal: { '#': '#D9603F', o: '#9E4026', '*': '#FAD9CC' },
    bg: '#1C0E09', line: '#4A2013'
  }
];

/* 這個深度是哪一層的岩石 */
function strataAt(depth) {
  var d = Number(depth) || 0;
  for (var i = 0; i < STRATA.length; i++) {
    if (d >= STRATA[i].from && d <= STRATA[i].to) return STRATA[i];
  }
  return STRATA[STRATA.length - 1];
}

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
