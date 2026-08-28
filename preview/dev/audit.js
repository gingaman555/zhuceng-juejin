/* 全流程稽核：貼進瀏覽器 console 跑（展示版）。
   走完五層、順便驗每一個新功能。 */
window.__AUDIT = function () {
  var L = App.logic;
  var api = function (fn) {
    var a = [].slice.call(arguments, 1);
    return new Promise(function (res, rej) {
      google.script.run.withSuccessHandler(res).withFailureHandler(rej)[fn].apply(null, a);
    });
  };
  var pass = 0, fail = 0, notes = [];
  var T = function (label, cond, extra) {
    if (cond) { pass++; }
    else { fail++; notes.push('✗ ' + label + (extra !== undefined ? '  → ' + JSON.stringify(extra).slice(0, 120) : '')); }
  };

  var RT, TK, STK, CID, TEAM_A, TEAM_B;

  return api('apiLogin', { account: 'res01', password: 'pw1234' }).then(function (r) {
    T('研究者登入', r.ok, r); RT = r.token;
    return api('apiAdminOverview', RT);
  }).then(function (ov) {
    CID = ov.classes[0].id;
    T('研究者讀得到班級', !!CID, ov.classes.length);
    return api('apiLogin', { account: 'tea01', password: 'pw1234' });
  }).then(function (r) {
    T('老師登入', r.ok, r); TK = r.token;
    return api('apiBootstrap', TK);
  }).then(function (b) {
    TEAM_A = b.teams[0]; TEAM_B = b.teams[1];
    T('老師看到兩組', b.teams.length === 2, b.teams.length);
    T('老師拿到每一組的拆分名稱表', !!b.minNamesByTeam, Object.keys(b.minNamesByTeam || {}).length);

    /* ---- 指定組別：只給甲組 ---- */
    return api('apiPublishList', TK, CID, 1, [
      { layer: 1, type: 'required', title: '甲組專屬', cond: 'x', note: '', due: 4, dueDow: 5, spec: '', teams: [TEAM_A.id] },
      { layer: 1, type: 'required', title: '乙組專屬', cond: 'x', note: '', due: 4, dueDow: 5, spec: '', teams: [TEAM_B.id] },
      { layer: 1, type: 'required', title: '全班一', cond: 'x', note: '', due: 4, dueDow: 5, spec: '', teams: [] },
      { layer: 1, type: 'required', title: '全班二', cond: 'x', note: '', due: 4, dueDow: 5, spec: '', teams: [] }
    ]);
  }).then(function (r) {
    T('發派清單（含指定組別）', r.ok, r);
    return api('apiBootstrap', TK);
  }).then(function (b) {
    var a = (b.teamTasks[TEAM_A.id] || []).map(function (t) { return t.title; });
    var bb = (b.teamTasks[TEAM_B.id] || []).map(function (t) { return t.title; });
    T('甲組看不到乙組專屬', a.indexOf('乙組專屬') < 0, a);
    T('乙組看不到甲組專屬', bb.indexOf('甲組專屬') < 0, bb);
    T('兩組都拿到 4 項（含第一層原有的）', a.length >= 4 && bb.length >= 4, [a.length, bb.length]);

    var minA = {}, minB = {};
    (b.teamTasks[TEAM_A.id] || []).forEach(function (t) { if (t.mineral) minA[t.mineral] = 1; });
    (b.teamTasks[TEAM_B.id] || []).forEach(function (t) { if (t.mineral) minB[t.mineral] = 1; });
    T('甲組礦脈開滿 4 格', Object.keys(minA).length === 4, Object.keys(minA));
    T('乙組礦脈開滿 4 格', Object.keys(minB).length === 4, Object.keys(minB));

    /* ---- 一組一份的拆分改名 ---- */
    return api('apiSetMineralName', TK, TEAM_A.id, '定名石', '題目確立', '甲組的說法');
  }).then(function (r) {
    T('替甲組改拆分名稱', r.ok, r);
    var byT = r.minNamesByTeam || {};
    T('只有甲組被改到', Object.keys(byT[TEAM_A.id] || {}).length === 1 &&
      Object.keys(byT[TEAM_B.id] || {}).length === 0,
      { A: Object.keys(byT[TEAM_A.id] || {}), B: Object.keys(byT[TEAM_B.id] || {}) });

    return api('apiLogin', { account: 'stu01', password: 'pw1234' });
  }).then(function (r) {
    T('學生登入', r.ok, r); STK = r.token;
    return api('apiBootstrap', STK);
  }).then(function (sb) {
    T('學生只拿到自己那一組的任務', (sb.tasks || []).every(function (t) { return t.title !== '乙組專屬'; }),
      (sb.tasks || []).map(function (t) { return t.title; }));
    T('學生拿到自己那一組的拆分名稱', (sb.minNames || {})['定名石'] &&
      sb.minNames['定名石'].label === '題目確立', sb.minNames);

    /* ---- 全收集：走完第一層 ---- */
    var tasks = sb.tasks || [];
    var chain = Promise.resolve();
    tasks.forEach(function (t) {
      chain = chain.then(function () { return api('apiSavePlan', STK, t.id, 3, 3); })
        .then(function () {
          return api('apiSubmitItem', STK, t.id, '交件內容 ' + t.title, [],
            { effort: 'onpar', effortNote: '', blocker: '' });
        })
        .then(function (r) { T('交出「' + t.title + '」', r.ok, r); });
    });
    return chain.then(function () { return api('apiSubmitGate', STK, ['a', 'b', 'c']); });
  }).then(function (r) {
    T('全部交出但還沒被確認 → 關卡擋下', !r.ok, r);
    return api('apiBootstrap', TK);
  }).then(function (b) {
    var list = b.teamTasks[TEAM_A.id] || [];
    var chain = Promise.resolve();
    list.forEach(function (t) {
      if (t.status !== 'submitted') return;
      chain = chain.then(function () {
        return api('apiReviewItem', TK, TEAM_A.id, t.id, 'pass', '這一項的合格考量：' + t.title);
      }).then(function (r) { T('老師確認「' + t.title + '」', r.ok, r); });
    });
    return chain;
  }).then(function () {
    return api('apiSubmitGate', STK, ['走過的路', '我們的變化', '接下來要做的']);
  }).then(function (r) {
    T('採齊之後送得出關卡', r.ok, r);
    return api('apiReviewGate', TK, TEAM_A.id, true, '', '放你們過去的理由');
  }).then(function (r) {
    T('老師放行關卡', r.ok, r);
    return api('apiBootstrap', STK);
  }).then(function (sb) {
    T('學生進到第二層', sb.myTeam && sb.myTeam.layer === 2, sb.myTeam && sb.myTeam.layer);
    T('第一層記進 passed', (sb.myTeam.passed || []).indexOf(1) >= 0, sb.myTeam.passed);

    /* ---- 試用班排除 ---- */
    return api('apiResearchSlice', RT);
  }).then(function (before) {
    var n0 = (before.subLog || []).length;
    T('研究紀錄有資料', n0 > 0, n0);
    return api('apiAdminUpdateClass', RT, CID, { sandbox: true }).then(function () {
      return api('apiResearchSlice', RT).then(function (after) {
        T('設成試用班後研究紀錄清空', (after.subLog || []).length === 0 && (after.teams || []).length === 0,
          { sub: (after.subLog || []).length, teams: (after.teams || []).length });
        return api('apiAdminUpdateClass', RT, CID, { sandbox: false });
      });
    });
  }).then(function () {
    return api('apiResearchSlice', RT);
  }).then(function (back) {
    T('改回正式班後資料回來', (back.subLog || []).length > 0, (back.subLog || []).length);

    /* ---- 權限 ---- */
    return api('apiReviewItem', STK, TEAM_A.id, 'x', 'pass', '我自己過');
  }).then(function (r) {
    T('學生不能自審', !r.ok, r);
    return api('apiBootstrap', 'tk-假的');
  }).then(function (r) {
    T('假 token 被擋', !r.ok, r);
    return api('apiSetMineralName', STK, TEAM_A.id, '裂晶', '亂改', '');
  }).then(function (r) {
    T('學生不能改拆分名稱', !r.ok, r);
    return api('apiAdminCreateClass', TK, '老師偷開班', '', '2026-09-01', 18);
  }).then(function (r) {
    T('老師不能開班', !r.ok, r);
    return api('apiTeacherMirror', STK);
  }).then(function (r) {
    T('學生看不到老師的鏡子', !r.ok, r);
    return api('apiTeacherMirror', TK);
  }).then(function (r) {
    T('老師的鏡子算得出東西', r.ok && r.total && r.total.n > 0, r.total);
    T('鏡子的退回追得到下場', r.ok && r.landed &&
      (r.landed.n + r.landed.again + r.landed.waiting) === r.total.needfix,
      r.landed);
    return { pass: pass, fail: fail, notes: notes };
  }).catch(function (e) {
    return { pass: pass, fail: fail + 1, notes: notes.concat(['✗ 例外：' + (e && e.message || e)]) };
  });
};
'ready';
