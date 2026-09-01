/* 開機。 */

(function () {
  /* 資料結構換過就重種一次，不要拿舊的撐新的畫面 */
  if (!load() || !DB.Milestones || !DB.Runs) seed();
  S.who = 'U1';
  S.page = 'home';
  render();
})();
