/* 本機驗證用：把假後端灌成一個能走的班級。只在 preview 用。 */
window.$w = function (m) { return new Promise(function (r) { setTimeout(r, m || 200); }); };
window.api = function (fn) {
  var a = [].slice.call(arguments, 1);
  return new Promise(function (res, rej) {
    google.script.run.withSuccessHandler(res).withFailureHandler(rej)[fn].apply(null, a);
  });
};
window.SEED = async function () {
  localStorage.removeItem('jlz.mockdb');
  var r = await api('apiRegister', { account: 'res01', password: 'pw1234', role: 'researcher', name: '研究者' });
  var rt = r.token;
  await api('apiAdminCreateClass', rt, '設計專題', '114-1', '2026-05-04', 18);
  var ov = await api('apiAdminOverview', rt);
  var cid = ov.classes[0].id;
  await api('apiAdminCreateUser', rt, { account: 'tea01', password: 'pw1234', role: 'teacher', name: '陳老師', classId: cid });
  await api('apiAdminSaveRoster', rt, cid,
    '甲：小明, 小華' + String.fromCharCode(10) + '乙：小美, 小強');
  var tk = (await api('apiLogin', { account: 'tea01', password: 'pw1234' })).token;
  var tb = await api('apiBootstrap', tk);
  var code = tb.joinCode;
  var sr = await api('apiRegister', { account: 'stu01', password: 'pw1234', role: 'student', joinCode: code });
  var stk = sr.token;
  var mr = await api('apiMyRoster', stk);
  await api('apiClaimIdentity', stk, mr.roster[0].rosterId);
  /* 老師開第一層的第一項 */
  await api('apiPublishList', tk, cid, 1, [{
    layer: 1, type: 'required', title: '寫下你們要做什麼',
    cond: '一句話講得完，而且講得出為什麼是這一件。', note: '不要寫題目，寫問題。',
    due: 3, dueDow: 5, spec: 'PDF 一份，A4 直式，2 頁以內。'
  }]);
  return { cid: cid, code: code, tk: tk, stk: stk };
};
