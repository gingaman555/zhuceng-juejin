/* 地層。

   這四個世界是上一個作品留下來的，配色與名字照搬——但意思整個換掉了。

   在那邊，它們是四個關卡：第一層專案定義、第二層調查分析……走完一層
   才准進下一層，每一層有一隻守關生物擋著。那是課綱，不是地質。

   在這裡，它們是岩層。整座地下城本來就長這樣，全班共用同一片地質，
   誰在哪一層都看得到，也沒有哪一層需要「開」。深度變了，岩石就變了——
   就這樣，沒有別的意思。

   所以每一層底下寫的是「這裡的岩石長什麼樣」，不是「你在這一層要學會
   什麼」。一旦寫成後者，那張剖面圖就變回一條進度條，而且是全班一起看的
   那一種。 */

var STRATA = [
  {
    key: 'wild', name: '微光荒原', from: 0, to: 2,
    note: '表土。碎石多，光還下得來一點。',
    pal: { '#': '#C9A227', o: '#9A7E22', '*': '#F2E6C8' },
    bg: '#171208', line: '#3A2E12', glow: 'rgba(201,162,39,.07)'
  },
  {
    key: 'crys', name: '水晶迴廊', from: 3, to: 5,
    note: '地下水穿過晶體。走通的斷面會折光。',
    pal: { '#': '#5FA8C7', o: '#3E7E96', '*': '#D8F2FA' },
    bg: '#0C1720', line: '#173445', glow: 'rgba(95,168,199,.07)'
  },
  {
    key: 'echo', name: '迴聲迷宮', from: 6, to: 8,
    note: '方塊狀的硬岩。聲音在裡面會繞。',
    pal: { '#': '#8C7BC7', o: '#625397', '*': '#E4DCFA' },
    bg: '#131024', line: '#2E2750', glow: 'rgba(140,123,199,.07)'
  },
  {
    key: 'fire', name: '熔火深淵', from: 9, to: 9999,
    note: '底下有熱源。往下沒有盡頭，只是越來越燙。',
    pal: { '#': '#D9603F', o: '#9E4026', '*': '#FAD9CC' },
    bg: '#1C0E09', line: '#4A2013', glow: 'rgba(217,96,63,.08)'
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

   creatures 的 r 欄位就是這四個名字，所以生態系不用另外編——
   牠們本來就分在這四層裡。擋在你走廊盡頭的那一隻，只是其中一隻。 */
function faunaOf(key) {
  var s = null;
  for (var i = 0; i < STRATA.length; i++) if (STRATA[i].key === key) s = STRATA[i];
  if (!s) return [];
  return PACK.creatures.filter(function (c) { return c.r === s.name; });
}

/* 這一層的第 n 隻。用層與序號算，不擲骰子——
   每次打開，同一隻都在同一個地方，那張剖面圖才是一個地方。 */
function faunaAt(key, n) {
  var f = faunaOf(key);
  if (!f.length) return null;
  return f[hash(key + '~' + n) % f.length];
}
