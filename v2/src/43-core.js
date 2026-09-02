/* 岩心。

   一趟走完會長出一根岩心——像地質學家從地底抽出來的那種柱狀樣本。
   它不是我發的東西，是那一趟自己長出來的：形狀完全由那一趟的紀錄決定。

   為什麼是這個形式，而不是一個徽章或一件裝備：

   空的收集是一格一格長得一樣，靠重複填滿，價值只有「我有」。
   有意義的收集要滿足幾件事，而這個系統裡剛好有一個東西全部滿足——
   每一趟的日誌：

     一 · 它指向一個具體、不會再發生的事件。這根岩心就是那一週。
     二 · 它的樣子因人而異，而且那個不同是他自己造成的。
     三 · 不可能再拿到同一根——不是機率低，是那一週只發生過一次。
     四 · 它掛在該在的地方（自己的廊道、全班剖面圖），不是躺在道具欄。
     五 · 二十根排在一起，會變成一根說不出來的東西：一個學期的形狀。

   怎麼長：一天兩列，由上往下。

     來過        實心，中間一道亮
     說了沒動    空心，兩邊的壁還在
     沒有紀錄    斷的，只剩碎屑

   長度＝這一趟過了幾天。三天是一小截，十五天是一長條——
   所以架子上一眼看得出哪一趟是硬仗。

   刻意不編進去的東西：判定。
   那是全班剖面圖上別人也看得到的地方，把「估不準」編進形狀等於讓它
   變成一個公開的記號。判定只出現在他自己那幾頁上。 */

var CORE_W = 14;

/* 一根岩心的像素圖。純函式——同一趟每次算出來都一樣。 */
function coreOf(runId) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  if (!r) return null;
  var log = dayLog(runId);
  if (!log.length) log = [null];
  var days = Math.min(log.length, 26);

  var px = [];
  px.push('..++++++++++..');          /* 上蓋 */
  px.push('.+##########+.');

  for (var i = 0; i < days; i++) {
    var d = log[i];
    if (d && d.kind === 'move') {
      px.push('.+#*######*#+.');
      px.push('.+##########+.');
    } else if (d && d.kind === 'rest') {
      px.push('.+#+......+#+.');
      px.push('.+#+......+#+.');
    } else {
      px.push('.+#..+..+..#+.');
      px.push('.+..+..+..+..');
    }
  }

  px.push('.+##########+.');
  px.push('..++++++++++..');
  return px;
}

/* 這一趟的岩心長什麼顏色：他當時在哪一層。 */
function corePal(run) {
  var z = null;
  STRATA.forEach(function (x) { if (x.key === run.zone) z = x; });
  return (z || strataAt(0, run.teamId)).pal;
}

/* 一根岩心的說明：長度、來過幾天、缺了幾天。
   全部是數字，一句判斷都沒有。 */
function coreFacts(runId) {
  var s = runShape(runId);
  if (!s) return null;
  return s;
}
