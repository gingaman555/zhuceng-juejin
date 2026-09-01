/* 老師端。

   他只做三件事，側欄就只有三格：

     發里程碑   要他們交什麼
     審核       他們交了，你看完勾一個「可以」
     各組進度   誰在哪、誰慢下來了

   他不決定期限（那是學生拉滑桿承諾的），不打分，也不挑裝備——
   勾完可以之後，學生自己從三件裡挑一件。少一件他要煩惱的事，
   就少一次「老師替我決定」的機會。 */

/* 老師走到哪一步了。有人等你看就是第三步，其餘看班上有沒有人在挖。 */
function teacherStep(classId) {
  if (radar(classId).length) return 2;
  var running = where('Runs', function (r) { return r.state === 'running'; }).length;
  if (running) return 1;
  return 0;
}

var TEACHER_STEPS = [
  ['發里程碑', '寫要交什麼'],
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

  H.push(head('審核', rows.length ? rows.length + ' 件等你看' : '目前沒有等你看的',
    rows.length
      ? '照等最久的排。看完他們交的東西，回來勾一個「可以」——挑哪一件裝備是他們的事。'
      : '學生交出去之後會排在這裡。在那之前，你可以去發下一個里程碑。'));

  if (!rows.length) {
    H.push('<div class="card">');
    H.push('<p class="dim">現在沒有人在等你。要開始的話，去發一個里程碑——' +
           '只要寫他們要交什麼，期限他們自己會決定。</p>');
    H.push('<div class="row">');
    H.push(btn('去發一個里程碑', 'go:ms', 'big'));
    H.push(btn('看各組進度', 'go:classeco', 'ghost'));
    H.push('</div></div>');
  }

  rows.forEach(function (x) {
    var s = RULES.STAMPS[x.run.stamp];
    H.push('<div class="card radar-row">');
    H.push('<div class="radar-head">');
    H.push('<span class="green"></span>');
    H.push('<b>' + esc(x.team.name) + '</b>');
    H.push('<span class="st ' + x.run.stamp + '">' + s.mark + ' ' + esc(s.name) + '</span>');
    H.push('<span class="sp"></span><span class="dim">等 ' + x.waited + ' 天</span>');
    H.push('</div>');
    H.push('<div class="radar-ms">' + esc(x.ms.title) + '</div>');
    H.push('<div class="log-num">承諾 <b>' + x.run.est + '</b> 天　·　實際 <b>' +
           x.run.actual + '</b> 天</div>');
    if (x.run.risks && x.run.risks.length) {
      H.push('<div class="tags small"><span class="k">他們事先標的風險</span>');
      x.run.risks.forEach(function (k) {
        var d = RULES.snagOf(k);
        if (d) H.push('<span class="tag static">' + d.icon + ' ' + esc(d.label) + '</span>');
      });
      H.push('</div>');
    }
    if (x.run.snags && x.run.snags.length) {
      H.push('<div class="tags small"><span class="k">他們說卡在哪</span>');
      x.run.snags.forEach(function (k) {
        var d = RULES.snagOf(k);
        if (d) H.push('<span class="tag static hit">' + d.icon + ' ' + esc(d.label) + '</span>');
      });
      H.push('</div>');
    }
    H.push(btn('看完了，去勾', 'go:review:' + x.run.runId, ''));
    H.push('</div>');
  });

  /* 底下：全班一眼。詳細的在「各組進度」。 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">全班現在</div>');
  H.push('<div class="mini">');
  eco.forEach(function (e) {
    H.push('<div class="mini-row"><b>' + esc(e.name) + '</b>' +
      '<span class="' + (e.stall >= 2 ? 'warnx' : e.stall === 1 ? 'dim' : 'ok') + '">' +
      (e.stall >= 2 ? '休息中' : e.stall === 1 ? '慢下來了' : e.onMs ? '挖掘中' : '等派任務') +
      '</span><span class="dim">深度 ' + e.depth + '</span></div>');
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
  var acc = accuracyOf(r.teamId);

  var H = [head('審核', t.name + '　·　' + m.title,
    '東西他們交在你原本收的地方。這裡要你做的只有一件事：勾一個「可以」。' +
    '想說一句話再說，不想說就直接勾。')];

  H.push('<div class="card">');
  H.push('<div class="radar-head"><span class="st ' + r.stamp + '">' + s.mark + ' ' +
         esc(s.name) + '</span></div>');
  H.push('<div class="log-num">承諾 <b>' + r.est + '</b> 天　·　實際 <b>' + r.actual + '</b> 天</div>');
  H.push('<p class="dim">' + esc(RULES.judgeWhy(r.est, r.actual)) + '</p>');
  H.push('<p class="dim">這一組到目前：準 ' + acc.exact + ' 次、早 ' + acc.early +
         ' 次、失準 ' + acc.late + ' 次。</p>');
  if (r.snags && r.snags.length) {
    H.push('<div class="tags small"><span class="k">他們說卡在哪</span>');
    r.snags.forEach(function (k) {
      var d = RULES.snagOf(k);
      if (d) H.push('<span class="tag static hit">' + d.icon + ' ' + esc(d.label) +
                    '<em>' + esc(d.hint) + '</em></span>');
    });
    H.push('</div>');
  }
  H.push('</div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">說一句話　選填</div>');
  H.push('<p class="dim">這句話會出現在他們挑裝備的那一頁。' +
         '講你看到什麼就好，不用講他們該怎麼改。</p>');
  H.push('<textarea id="gr-word" rows="3" placeholder="' +
    esc('例：訪談這種事最容易低估，你們沒有。') + '">' + esc(draft('gr-word')) + '</textarea>');
  H.push('</div>');

  H.push('<div class="card dim">勾完之後，他們那邊會攤開三件裝備自己挑一件。' +
         '攤開哪三件是隨機的，跟他們做得如何無關——那是給他們自己留的一句話，不是你的評語。</div>');

  H.push('<div class="row">');
  H.push(btn('可以', 'approve:' + r.runId, 'big'));
  H.push(btn('回審核清單', 'go:radar', 'ghost'));
  H.push('</div>');
  return H.join('');
};

/* ---------- 發里程碑 ---------- */
PAGES.ms = function () {
  var u = me();
  var list = where('Milestones', function (m) { return m.classId === u.classId; })
    .sort(function (a, b) { return b.at - a.at; });
  var teams = where('Teams', function (t) { return t.classId === u.classId; });
  var to = DRAFT.to || [];

  var H = [];
  H.push(stepBar(TEACHER_STEPS, 0));
  H.push(head('發里程碑', '你要他們交什麼',
    '一次派一個。寫要交什麼就好——派出去之後，學生那邊會先被問「你打算花幾天」，' +
    '期限是他們自己訂的，不是你。'));

  H.push('<div class="card">');
  H.push('<div class="eyebrow">派一個新的</div>');
  H.push('<input id="ms-title" placeholder="' + esc('例：訪三個人，記下他們怎麼講') + '">');
  H.push('<textarea id="ms-note" rows="2" placeholder="' +
    esc('要注意的地方。寫提醒，不要寫步驟。') + '"></textarea>');
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
    H.push('<div class="card dim">還沒派過。派出去之後，這裡會列出各組各自承諾了幾天。</div>');
  }

  list.forEach(function (m) {
    var got = where('Runs', function (r) { return r.msId === m.msId; });
    var done = got.filter(function (r) { return r.state === 'done'; }).length;
    H.push('<div class="card">');
    H.push('<div class="radar-head"><b>' + esc(m.title) + '</b><span class="sp"></span>' +
      '<span class="dim">' + (m.teams.length ? m.teams.length + ' 組' : '全班') + '</span></div>');
    if (m.note) H.push('<p class="dim">' + nl(m.note) + '</p>');
    H.push('<div class="log-num">承諾了 <b>' + got.length + '</b> 組　·　走完 <b>' +
           done + '</b> 組</div>');
    /* 各組承諾了幾天——這是老師唯一看得到的「他們怎麼想這件事」 */
    if (got.length) {
      H.push('<div class="tags small"><span class="k">他們各自承諾</span>');
      got.forEach(function (r) {
        var t = teamOf(r.teamId);
        H.push('<span class="tag static">' + esc(t ? t.name.slice(0, 4) : '') +
               ' ' + r.est + ' 天' + (r.actual ? ' → ' + r.actual : '') + '</span>');
      });
      H.push('</div>');
    }
    H.push('</div>');
  });
  return H.join('');
};

/* 各組進度那一頁在 62-eco.js——跟學生看的是同一張剖面圖。 */
