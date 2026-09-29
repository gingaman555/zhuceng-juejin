/* 開機。 */

(function () {
  /* 資料結構換過就重種一次，不要拿舊的撐新的畫面。
     Events 是後來才加的表——舊的存檔沒有它，畫面一讀就會炸。 */
  if (!load() || !DB.Milestones || !DB.Runs || !DB.Events || !DB.Keeps) seed();

  /* 上次登入的人還記得。關掉分頁再打開不用重登。 */
  var u = DB.Session ? userOf(DB.Session) : null;
  if (u) { S.who = u.userId; S.page = homeFor(u); }
  else { S.who = null; S.page = 'gate'; }
  /* 接上雲端。在 render 之前叫：它自己是非同步的，第一批資料回來
     的時候會再畫一次，所以這裡先拿本機這一份把畫面立起來，
     不要讓人對著白畫面等網路。 */
  if (typeof syncStart === 'function') syncStart();
  /* 這台分頁的程式碼會不會過期，跟有沒有接上雲端是兩回事——
     用 file:// 單機跑的人也可能開很久（見 41-sync.js 的 checkFresh）。 */
  if (typeof checkFreshStart === 'function') checkFreshStart();
  render();
})();
