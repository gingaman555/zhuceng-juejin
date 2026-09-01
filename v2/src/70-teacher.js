/* 老師端。

   三頁：雷達（誰交了）、里程碑（派什麼）、全班地下城（誰在哪）。
   他做的事只有兩件：派一個里程碑、看完之後遞一件裝備過去。

   系統不替他決定任何事，也不用分數轉譯他的判斷——
   他選哪一件裝備，就等於他說了哪一句話。 */

/* ---------- 雷達 ---------- */
PAGES.radar = function () {
  var u = me();
  var rows = radar(u.classId);
  var eco = ecology(u.classId);
  var H = [head('雷達', '誰交了',
    '照等最久的排。綠光是完工——拉近看檔案與他們說的卡關原因。')];

  if (!rows.length) {
    H.push('<div class="card dim">目前沒有人在等你。學生交出去之後會亮在這裡。</div>');
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
    H.push(btn('看完了，發裝備', 'go:grant:' + x.run.runId, ''));
    H.push('</div>');
  });

  /* 底下：全班一眼 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">全班現在</div>');
  H.push('<div class="mini">');
  eco.forEach(function (e) {
    H.push('<div class="mini-row"><b>' + esc(e.name) + '</b>' +
      '<span class="' + (e.stall >= 2 ? 'warnx' : e.stall === 1 ? 'dim' : 'ok') + '">' +
      (e.stall >= 2 ? '休息中' : e.stall === 1 ? '慢下來了' : e.onMs ? '挖掘中' : '等派任務') +
      '</span><span class="dim">深度 ' + e.depth + '</span></div>');
  });
  H.push('</div></div>');
  return H.join('');
};

/* ---------- 發裝備 ---------- */
PAGES.grant = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var m = msOf(r.msId), t = teamOf(r.teamId);
  var s = RULES.STAMPS[r.stamp];
  var acc = accuracyOf(r.teamId);

  var H = [head('發裝備', t.name + '　·　' + m.title,
    '選哪一件等於說哪一句話。每一件都綁一個理由——你選的是那句話。')];

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

  H.push('<div class="card"><div class="eyebrow">選一件</div><div class="gear-pick">');
  RULES.GEARS.forEach(function (g) {
    var on = DRAFT.gear === g.key;
    H.push('<button class="gcard' + (on ? ' on' : '') + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'pickgear:' + g.key })) + '\'>' +
      '<b>' + g.icon + '</b><i>' + esc(g.name) + '</i><em>' + esc(g.why) + '</em></button>');
  });
  H.push('</div></div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">再加一句　選填</div>');
  H.push('<textarea id="gr-word" rows="3" placeholder="' +
    esc('例：訪談這種事最容易低估，你們沒有。') + '">' + esc(draft('gr-word')) + '</textarea>');
  H.push('</div>');

  H.push('<div class="row">');
  H.push(btn('發出去', 'grant:' + r.runId, 'big'));
  H.push(btn('回雷達', 'go:radar', 'ghost'));
  H.push('</div>');
  return H.join('');
};

/* ---------- 里程碑 ---------- */
PAGES.ms = function () {
  var u = me();
  var list = where('Milestones', function (m) { return m.classId === u.classId; })
    .sort(function (a, b) { return b.at - a.at; });
  var teams = where('Teams', function (t) { return t.classId === u.classId; });
  var to = DRAFT.to || [];

  var H = [head('里程碑', '你要他們交什麼',
    '一次派一個。派出去之後，學生那邊會先被問「你打算花幾天」——' +
    '期限是他們自己訂的，不是你。')];

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

/* 全班地下城（老師版）也搬到 62-eco.js——跟學生看的是同一張圖。 */
