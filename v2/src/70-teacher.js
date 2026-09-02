/* 老師端。

   他只做三件事，側欄就只有三格：

     發里程碑   要他們交什麼
     審核       他們交了，你看完勾一個「可以」
     各組進度   誰在哪、誰慢下來了

   他不決定期限（那是學生拉滑桿承諾的），不打分，也不挑裝備——
   勾完可以之後，學生自己從三件裡挑一件。少一件他要煩惱的事，
   就少一次「老師替我決定」的機會。 */

/* 老師走到哪一步了。有人等你看就是第三步，其餘看班上有沒有人在走。 */
function teacherStep(classId) {
  if (radar(classId).length) return 2;
  var running = where('Runs', function (r) { return r.state === 'running'; }).length;
  if (running) return 1;
  return 0;
}

/* 他們自己標的、他們自己說的。用的是老師分段時寫的詞，不是我列的選項。 */
function overTags(teamId, run) {
  var fl = (run.flags || []).map(function (i) { return stepName(run.runId, i); }).filter(Boolean);
  var ov = (run.overs || []).map(function (i) { return stepName(run.runId, i); }).filter(Boolean);
  if (!fl.length && !ov.length) return '';
  var H = ['<div class="tags small">'];
  if (fl.length) {
    H.push('<span class="k">承諾時標的</span>');
    fl.forEach(function (l) { H.push('<span class="tag static">' + esc(l) + '</span>'); });
  }
  if (ov.length) {
    H.push('<span class="k">後來說比想的久</span>');
    ov.forEach(function (l) { H.push('<span class="tag static hit">' + esc(l) + '</span>'); });
  }
  H.push('</div>');
  return H.join('');
}

/* 他們勾了哪幾段。老師自己分的，所以他讀得懂。 */
function stepTags(run) {
  var s = stepsOf(run.runId);
  if (!s) return '';
  var H = ['<div class="tags small"><span class="k">分段</span>'];
  s.all.forEach(function (x, i) {
    H.push('<span class="tag static' + (s.on.indexOf(i) >= 0 ? ' hit' : '') + '">' +
      esc(x) + '</span>');
  });
  H.push('</div>');
  return H.join('');
}

var TEACHER_STEPS = [
  ['發任務', '寫要交什麼'],
  ['他們承諾天數', '這一段你不用管'],
  ['審核', '看完勾一個可以']
];

/* ---------- 審核（首頁） ---------- */
PAGES.radar = function () {
  var u = me();
  var rows = radar(u.classId);
  var eco = ecology(u.classId);
  var H = [];

  H.push(stepBar(TEACHER_STEPS, teacherStep(u.classId)));

  /* 想出去的那幾組排在最前面。往下走不出去，出口只有這一個，
     而且要他確認——那是這個系統裡他做的最後一件事。 */
  exitQueue(u.classId).forEach(function (t) {
    var acc = accuracyOf(t.teamId);
    H.push('<div class="card exitq">');
    H.push('<div class="eyebrow">出口</div>');
    H.push('<h2>' + esc(t.name) + ' 說專案做完了。</h2>');
    H.push('<p class="dim">' + esc(t.project || '（還沒定）') + '　·　走完 ' +
      depthOf(t.teamId) + ' 個任務</p>');
    if (acc.total) H.push(accBar(acc));
    H.push('<div class="eyebrow" style="margin-top:14px">你的想法　選填</div>');
    H.push('<textarea id="gr-word" rows="2"></textarea>');
    H.push(btn('讓他們出去', 'letgo:' + t.teamId, 'big'));
    H.push('</div>');
  });

  H.push(head('審核', rows.length ? rows.length + ' 件等你看' : '目前沒有等你看的',
    rows.length
      ? '照等最久的排。看完成果，回來勾「可以」。'
      : '學生交出去之後排在這裡。'));

  if (!rows.length) {
    H.push('<div class="card">');
    H.push('<p class="dim">沒有人在等你。去發一個任務——寫要交什麼就好。</p>');
    H.push('<div class="row">');
    H.push(btn('去發一個任務', 'go:ms', 'big'));
    H.push(btn('看各組進度', 'go:classeco', 'ghost'));
    H.push('</div></div>');
  }

  rows.forEach(function (x) {
    var s = RULES.STAMPS[x.run.stamp];
    H.push('<div class="card radar-row">');
    H.push('<div class="radar-head">');
    H.push('<span class="green"></span>');
    H.push('<b>' + esc(x.team.name) + '</b>');
    H.push('<span class="st ' + x.run.stamp + '">' + esc(s.name) + '</span>');
    H.push('<span class="sp"></span><span class="dim">等 ' + x.waited + ' 天</span>');
    H.push('</div>');
    H.push('<div class="radar-ms">' + esc(x.ms.title) + '</div>');
      H.push(estBar(x.run.est, x.run.actual, false));
    H.push(overTags(x.team.teamId, x.run));
    H.push(stepTags(x.run));
    H.push(btn('看完了，去勾', 'go:review:' + x.run.runId, ''));
    H.push('</div>');
  });

  /* 底下：全班一眼。詳細的在「各組進度」。 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">全班現在</div>');
  H.push('<div class="mini">');
  eco.forEach(function (e) {
    H.push('<div class="mini-row"><b>' + esc(e.name) + '</b>' +
      '<span class="s-' + e.status.key + '">' + esc(e.status.label) +
      (e.status.days ? ' ' + e.status.days + ' 天' : '') + '</span>' +
      '<span class="dim">深度 ' + e.depth + '</span></div>');
  });
  H.push('</div>');
  H.push(btn('看各組進度', 'go:classeco', 'ghost'));
  H.push('</div>');
  return H.join('');
};

/* ---------- 勾一個可以 ---------- */
PAGES.review = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var m = msOf(r.msId), t = teamOf(r.teamId);
  var s = RULES.STAMPS[r.stamp];

  var H = [head('審核', t.name + '　·　' + m.title,
    '成果交在你原本收的地方。這裡只要勾一個「可以」。' +
    '想說什麼再說，不想說就直接勾。')];

  H.push('<div class="card">');
  H.push('<div class="radar-head"><span class="st ' + r.stamp + '">' + 
         esc(s.name) + '</span></div>');
  /* 他們自己寫的兩段放最上面。他在這一頁要做的事是寫一句話，
     而最有用的輸入就是這兩段——本來排在整張卡的最後面。
     系統不解讀、不歸類，原話放上去就好。 */
  if (r.hard) H.push('<p class="quote"><b>他們說卡在哪裡</b>' + nl(r.hard) + '</p>');
  if (r.pace) H.push('<p class="quote"><b>他們覺得的進度</b>' + nl(r.pace) + '</p>');
  H.push(estBar(r.est, r.actual, false));
  H.push(dayStrip(r.teamId, r.runId));
  H.push(overTags(r.teamId, r));
  /* 歷史準度分布拿掉了：那是「他們這學期怎麼樣」，屬於各組進度，
     不屬於這一筆審核。這一頁只看眼前這一趟。 */
  H.push('</div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">你的想法　選填</div>');
  H.push('<p class="dim">覺得不行就說清楚，要讓他們聽得懂。</p>');
  H.push('<textarea id="gr-word" rows="3" placeholder="' +
    esc('例：訪綱太長，受訪者撐不到後面那幾題。') + '">' + esc(draft('gr-word')) + '</textarea>');
  H.push('</div>');

  H.push('<div class="card dim">勾完之後，他們會在那一層留一個記號。</div>');

  H.push('<div class="row">');
  H.push(btn('可以', 'approve:' + r.runId, 'big'));
  H.push(btn('回審核清單', 'go:radar', 'ghost'));
  H.push('</div>');
  return H.join('');
};

/* ---------- 發任務 ---------- */
PAGES.ms = function () {
  var u = me();
  var list = where('Milestones', function (m) { return m.classId === u.classId; })
    .sort(function (a, b) { return b.at - a.at; });
  var teams = where('Teams', function (t) { return t.classId === u.classId; });
  var to = DRAFT.to || [];

  var H = [];
  H.push(stepBar(TEACHER_STEPS, 0));
  H.push(head('發任務', '你要他們交什麼',
    '一次派一個。寫要交什麼就好。' +
    '期限是他們自己訂的，不是你。'));

  H.push('<div class="card">');
  H.push('<div class="eyebrow">派一個新的</div>');
  H.push('<input id="ms-title" value="' + esc(draft('msTitle', '')) + '" oninput="DRAFT[\'msTitle\']=this.value" placeholder="' + esc('例：訪三個人，記下他們怎麼講') + '">');
  H.push('<textarea id="ms-note" oninput="DRAFT[\'msNote\']=this.value" rows="2" placeholder="' +
    esc('要注意的地方。選填。') + '">' + esc(draft('msNote', '')) + '</textarea>');
  H.push('<div class="eyebrow" style="margin-top:14px">分段　選填　一行一段</div>');
  H.push('<textarea id="ms-steps" oninput="DRAFT[\'msSteps\']=this.value" rows="4" placeholder="' +
    esc('訪三個人\n整理逐字稿\n收斂成一句話') + '">' + esc(draft('msSteps', '')) + '</textarea>');
  /* 這一句本來寫「學生每天可以點今天動的是哪一段」——那個機制早就拿掉了。
     現在分段真正會發生的是：交出去的時候被問哪幾段做完了、哪一段比想的久。 */
  H.push('<p class="dim">不分段一樣走得完。</p>');
  H.push('<div class="eyebrow" style="margin-top:14px">發給誰</div>');
  H.push('<div class="tags">');
  H.push('<span class="tag static' + (to.length ? '' : ' hit') + '">' +
         (to.length ? '只發給 ' + to.length + ' 組' : '全班') + '</span>');
  teams.forEach(function (t) {
    var on = to.indexOf(t.teamId) >= 0;
    H.push('<button class="tag' + (on ? ' on' : '') + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'to:' + t.teamId })) + '\'>' + esc(t.name) + '</button>');
  });
  H.push('</div>');
  H.push(btn('派出去', 'publish', 'big'));
  H.push('</div>');

  if (!list.length) {
    H.push('<div class="card dim">還沒派過。</div>');
  }

  /* 派過的每一個壓成一行：標題、幾組承諾了、幾組走完了。
     本來一個一張卡，還帶著注意事項與每一組承諾幾天的標籤——
     派了十個就是十張卡，而老師在這一頁要做的只有「再派一個」。 */
  H.push('<div class="card"><div class="rec-list">');
  list.forEach(function (m) {
    var got = where('Runs', function (r) { return r.msId === m.msId; });
    var done = got.filter(function (r) { return r.state === 'done'; }).length;
    H.push('<div class="msr">');
    H.push('<b>' + esc(m.title) + '</b>');
    H.push('<span class="msr-w">' + (m.teams.length ? m.teams.length + ' 組' : '全班') +
      '</span>');
    H.push('<span class="msr-n">' + got.length + ' 承諾　' + done + ' 走完</span>');
    /* 各組承諾了幾天。這是老師唯一看得到的「他們怎麼想這件事」，
       所以留著——但不用標籤的樣子，壓成一行小字。 */
    if (got.length) {
      H.push('<div class="msr-e">');
      got.forEach(function (r) {
        var tm = teamOf(r.teamId);
        H.push('<i>' + esc(tm ? shortName(tm.name) : '') + ' <b>' + r.est + '</b>' +
          (r.actual ? '→<b>' + r.actual + '</b>' : '') + '</i>');
      });
      H.push('</div>');
    }
    H.push('</div>');
  });
  H.push('</div></div>');
  return H.join('');
};

/* 各組進度那一頁在 62-eco.js——跟學生看的是同一張剖面圖。 */
