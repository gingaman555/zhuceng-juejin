/* 開機。 */

(function () {
  if (!load()) seed();
  /* 種子換過（欄位加減）就重種一次，不要拿舊的資料撐新的畫面 */
  if (!DB.Teams.length || !DB.Teams[0].tro) seed();
  S.who = 'U1';
  S.page = 'home';
  render();
})();
