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
  /* 開學日相對今天算，讓試用班永遠停在第 3 週。
     本來寫死 2026-05-04，時間一過就變成「學期已經走完 94%、而且有東西逾期」，
     第一次打開的人看到的是一個來不及的學期。 */
  var __start = (function () {
    var d = new Date();
    d.setDate(d.getDate() - 14);                 /* 往回兩週 → 現在是第 3 週 */
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));   /* 對齊到那一週的週一 */
    var p2 = function (n) { return (n < 10 ? String.fromCharCode(48) : String.fromCharCode()) + n; };
    return d.getFullYear() + String.fromCharCode(45) + p2(d.getMonth() + 1) + String.fromCharCode(45) + p2(d.getDate());
  })();
  await api('apiAdminCreateClass', rt, '設計專題', '114-1', __start, 18);
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
  /* roster 回傳的是「組」，成員在 members 裡 */
  var first = ((mr.roster || [])[0] || {}).members || [];
  if (first.length) await api('apiClaimIdentity', stk, first[0].rosterId);
  /* 老師開第一層的第一項 */
  await api('apiPublishList', tk, cid, 1, [{
    layer: 1, type: 'required', title: '寫下你們要做什麼',
    cond: '一句話講得完，而且講得出為什麼是這一件。', note: '不要寫題目，寫問題。',
    due: 3, dueDow: 5, spec: 'PDF 一份，A4 直式，2 頁以內。'
  }]);
  return { cid: cid, code: code, tk: tk, stk: stk };
};
