/* 開機。 */

(function () {
  /* 資料結構換過就重種一次，不要拿舊的撐新的畫面。
     Events 是後來才加的表——舊的存檔沒有它，畫面一讀就會炸。 */
  if (!load() || !DB.Milestones || !DB.Runs || !DB.Events) seed();

  /* 上次登入的人還記得。關掉分頁再打開不用重登。 */
  var u = DB.Session ? userOf(DB.Session) : null;
  if (u) { S.who = u.userId; S.page = homeFor(u); }
  else { S.who = null; S.page = 'gate'; }
  render();
})();
