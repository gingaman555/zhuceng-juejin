/* 老師端。

   他做的事跟系統出現之前一樣：讀學生交的東西，寫下判斷。
   系統只做兩件事——把該看的排出來，把他寫的字留下來。 */

/* ================= 待你驗收 ================= */

PAGES.queue = function () {
  var q = queue('C1'), st = teacherStats();

  var cards = q.map(function (r) {
    var hand = r.blockers.map(function (b) {
      return '<div class="card sunk" style="margin:11px 0 0;border-color:var(--gold-d)">' +
        '<div class="eyebrow">✋ 他們說卡住了 · ' + esc(b.task.title) + '</div>' +
        '<p style="margin:0">' + nl(b.tt.blocker) + '</p></div>';
    }).join('');
    return '<div class="card' + (r.blockers.length ? ' hot' : '') + '">' +
      '<div style="display:flex;gap:11px;align-items:baseline;flex-wrap:wrap">' +
        '<span style="font-size:22px">' + esc(r.team.name) + '</span>' +
        '<span class="pill">' + esc(LAYERS[r.team.layer - 1].code) + ' ' +
          esc(LAYERS[r.team.layer - 1].name) + '</span>' +
        '<span class="pill' + (r.stay >= 7 ? ' gold' : '') + '">停留 ' + r.stay + ' 天</span>' +
        (r.blockers.length ? '<span class="pill hand">✋ 卡住</span>' : '') +
        '<span class="sp" style="flex:1"></span>' +
        '<span class="btn flat sm" data-go="tcurve" data-p=\'{"id":"' + r.team.teamId + '"}\'>看剖面</span>' +
        '<span class="btn sm" data-go="team" data-p=\'{"id":"' + r.team.teamId + '"}\'>逐項確認</span>' +
      '</div>' +
      '<div class="fine" style="margin-top:11px">' +
        (r.ready ? '交齊了 ' + r.sent.length + ' 項——這一層目前開的都在你這裡。'
                 : '還沒交齊，但他們舉手了。') +
        (r.redigs.length ? '　·　回頭補強 ' + r.redigs.length + ' 件' : '') +
      '</div>' + hand +
    '</div>';
  }).join('');

  var idle = classTeams('C1').filter(function (t) {
    return !q.some(function (r) { return r.team.teamId === t.teamId; });
  }).map(function (t) {
    var rows = rowsFor(t.teamId, t.layer);
    var doneN = rows.filter(function (r) { return r.tt.status === 'done'; }).length;
    var motion = motionOf(t.teamId);
    return '<div class="item flat"><div class="body">' +
      '<div class="t">' + esc(t.name) + '</div>' +
      '<div class="m">' + esc(LAYERS[t.layer - 1].name) + ' · 停留 ' +
        RULES.stayDays(t.enteredAt, now()) + ' 天　·　這一層開了 ' + rows.length +
        ' 項，判過 ' + doneN + ' 項' +
        (motion.rounds ? '　·　來回 ' + motion.rounds + ' 次（改過 ' + motion.changed + ' 次）'
                       : '　·　還沒送過任何一次') +
      '</div></div>' +
      '<div class="art"><span class="q">' + (rows.length - doneN) + '</span></div></div>';
  }).join('');

  return head('REVIEW QUEUE', '待你驗收',
    '依停留天數排序，待最久的排最前面。舉手的組排最前面。') +
    '<p class="fine">一組要把這一層目前開的全部交出來，才會排進這裡——' +
    '同一組一起看，跨項的問題才看得出來。你隨時可以再開新的一項，' +
    '開了之後那一組就會退出佇列，直到再交齊。</p>' +

    (cards || '<div class="card"><p class="lead">現在沒有人在等你。</p></div>') +

    '<h2>還沒排進來的</h2>' +
    '<p class="fine">卡到一半的組跟完全沒來的組，在這裡長得不一樣——' +
    '「來回幾次」不進成績，它只說明這一組有沒有在動。</p>' +
    (idle || '<p class="fine">全班都在佇列裡。</p>') +

    '<h2>你寫的</h2>' +
    '<div class="row">' +
      sumCard('合格考量', st.n + ' 件', '你寫下的判斷就是教材。學生在結算頁讀到的就是這一段。') +
      sumCard('平均長度', st.avgChars + ' 字', '不是越長越好。夠具體，讓他們知道下一次改什麼就好。') +
      sumCard('他們平均等你', st.avgWait.toFixed(1) + ' 天',
        '系統不對學生承諾任何回覆時間，這個數字只給你自己看。') +
    '</div>';
};

/* ================= 任務清單 ================= */

PAGES.tasks = function () {
  var blocks = LAYERS.map(function (l) {
    /* 要連班一起比對——同一個人上一個專案的任務也在 Tasks 裡 */
    var ts = where('Tasks', function (t) { return t.classId === 'C1' && t.layer === l.n; });
    var rows = ts.map(function (t) {
      var stat = t.teams.map(function (tid) { return ttOf(tid, t.taskId); }).filter(Boolean);
      var done = stat.filter(function (x) { return x.status === 'done'; }).length;
      var sent = stat.filter(function (x) { return x.status === 'sent'; }).length;
      return '<div class="item flat"><div class="body">' +
        '<div class="t">' + esc(t.title) + '</div>' +
        '<div class="m">通過條件　' + esc(t.cond) + '</div>' +
        '<div style="margin-top:11px;display:flex;gap:5px;flex-wrap:wrap">' +
          dueTag(t.due) +
          '<span class="pill">發給 ' + t.teams.length + ' 組</span>' +
          '<span class="pill">清單 ' + (t.checks || []).length + ' 條</span>' +
          (sent ? '<span class="pill gold">' + sent + ' 組在等你</span>' : '') +
          (done ? '<span class="pill ok">' + done + ' 組判過了</span>' : '') +
        '</div></div></div>';
    }).join('');
    return '<h2>' + l.code + '　' + esc(l.name) + '　<span class="pill">' + esc(l.stage) + '</span></h2>' +
      '<p class="fine">' + esc(l.hard) + '</p>' +
      (rows || '<p class="fine">這一層還沒開任何一項。</p>') +
      '<p><span class="btn flat sm" data-go="newtask" data-p=\'{"L":' + l.n + '}\'>在這一層新增一項</span></p>';
  }).join('');

  return head('TASKS', '任務清單',
    '四個階段各一塊。開幾項沒有上限——依進度決定開什麼、什麼時候開。') +
    '<p class="fine">數量不是門檻，' + esc(RULES.GATE) + '</p>' + blocks;
};

/* ================= 新增一項 ================= */

PAGES.newtask = function () {
  var L = S.p.L || 1;
  var teams = classTeams('C1').map(function (t) {
    return '<label class="check" style="border:1px solid var(--line)">' +
      '<input type="checkbox" class="pick" value="' + t.teamId + '"' +
      (t.layer === L ? ' checked' : '') + ' ' +
      'style="width:22px;height:22px;accent-color:var(--gold)">' +
      '<span>' + esc(t.name) + '　<span class="fine">' +
        esc(LAYERS[t.layer - 1].name) + '</span></span></label>';
  }).join('');

  return '<p><a class="plain" data-go="tasks">← 回任務清單</a></p>' +
    head(LAYERS[L - 1].code + ' · ' + LAYERS[L - 1].stage, '新增一項',
      '兩分鐘就開得完。系統不收檔案——作業照你原本的方式收。') +

    '<p class="fine">預設只勾現在人在這一層的組。發給還沒下來的組也可以——' +
    '他們走到這一層的時候就會看到。</p>' +

    '<label>名稱</label><input type="text" id="t-title" placeholder="這一項叫什麼">' +
    '<label>通過條件<span class="fine">　學生會照這一句判斷自己做完了沒有，' +
      '回頭補強也是照它判</span></label>' +
    '<input type="text" id="t-cond" placeholder="做到什麼程度算完成">' +
    '<label>要注意的<span class="fine">　選填</span></label>' +
    '<input type="text" id="t-note" placeholder="最容易做錯的地方">' +
    '<label>勾選項<span class="fine">　一行一條。' + esc(RULES.say.check()) +
      '——它是學生自己的紀錄，不是成績，也不是送出的門檻</span></label>' +
    '<textarea id="t-checks" placeholder="一行一條"></textarea>' +
    '<label>期限<span class="fine">　留白 ＝ 不設限。逾期只標示，不阻擋</span></label>' +
    '<input type="date" id="t-due">' +
    '<label>發給誰</label>' +
    '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(242px,1fr))">' +
      teams + '</div>' +

    (S.flash ? '<p class="pill over" style="margin-top:11px">' + esc(S.flash) + '</p>' : '') +
    '<p style="margin-top:22px"><span class="btn" data-act="publish" data-p=\'{"L":' + L + '}\'>發出去</span></p>';
};

/* ================= 逐項確認 ================= */
/* 先選一組，同一組一起看——跨項的問題才看得出來。 */

PAGES.team = function () {
  var id = S.p.id, t = teamOf(id);
  if (!t) {
    var list = classTeams('C1').map(function (x) {
      var rows = rowsFor(x.teamId, x.layer);
      var sent = rows.filter(function (r) { return r.tt.status === 'sent'; }).length;
      return '<div class="item" data-go="team" data-p=\'{"id":"' + x.teamId + '"}\'>' +
        '<div class="body"><div class="t">' + esc(x.name) + '</div>' +
        '<div class="m">' + esc(LAYERS[x.layer - 1].name) + ' · 停留 ' +
          RULES.stayDays(x.enteredAt, now()) + ' 天　·　' + sent + ' 項在等你</div></div>' +
        '<div class="art"><span class="q">' + sent + '</span></div></div>';
    }).join('');
    return head('TEAM', '逐項確認', '先選一組。') + list;
  }

  var rows = rowsFor(id, t.layer);
  var sent = rows.filter(function (r) { return r.tt.status === 'sent'; });
  var redigs = where('Redigs', function (r) { return r.teamId === id && r.status === 'sent'; });

  var pend = sent.map(function (r) {
    return '<div class="item" data-go="review" data-p=\'{"team":"' + id + '","task":"' +
      r.task.taskId + '"}\'>' +
      '<div class="body"><div class="t">' + esc(r.task.title) + '</div>' +
      '<div class="m">通過條件　' + esc(r.task.cond) + '</div>' +
      '<div style="margin-top:11px;display:flex;gap:5px;flex-wrap:wrap">' +
        '<span class="pill">第 ' + r.tt.attempt + ' 次送出</span>' +
        '<span class="pill">他們說「' + esc(EFFORT[r.tt.effort] || '—') + '」</span>' +
        (r.tt.text ? '<span class="pill gold">寫了多做的</span>' : '<span class="pill">多做的留白</span>') +
        (r.tt.blocker ? '<span class="pill hand">✋ 卡住</span>' : '') +
      '</div></div><div class="art"><span class="q">→</span></div></div>';
  }).join('');

  var red = redigs.map(function (r) {
    var task = taskOf(r.taskId);
    return '<div class="item" data-go="redig" data-p=\'{"id":"' + r.redigId + '"}\'>' +
      '<div class="body"><div class="t">回頭補強　' + esc(task.title) + '</div>' +
      '<div class="m">' + esc(String(r.note).slice(0, 70)) + '⋯</div></div>' +
      '<div class="art"><span class="q">→</span></div></div>';
  }).join('');

  var allDone = rows.length && rows.every(function (r) { return r.tt.status === 'done'; });

  var s = timelineOf(id).stats;
  var d1 = function (x) { return x == null ? '—' : (Math.round(x * 10) / 10); };

  return '<p><a class="plain" data-go="queue">← 回待你驗收</a>　' +
      '<a class="plain" data-go="tcurve" data-p=\'{"id":"' + id + '"}\'>看他們的剖面 →</a></p>' +
    head('TEAM', t.name,
      esc(LAYERS[t.layer - 1].name) + ' · ' + esc(LAYERS[t.layer - 1].stage) +
      ' · 停留 ' + RULES.stayDays(t.enteredAt, now()) + ' 天') +
    '<p class="fine">跨任務看得到的：開啟到交平均 ' + d1(s.toFirst) + ' 天　·　' +
      '一項平均 ' + d1(s.rounds) + ' 輪' +
      (s.tight ? '　·　' + s.n + ' 項裡有 ' + s.tight + ' 項是期限前不到一天交的' : '') +
      (s.late ? '　·　逾期交過 ' + s.late + ' 次' : '') +
      '。這幾個是描述，不是評價——判過不過還是照通過條件。</p>' +
    (pend ? '<h2>待審 ' + sent.length + ' 項</h2>' + pend : '') +
    (red ? '<h2>回頭補強 ' + redigs.length + ' 件</h2>' +
      '<p class="fine">照那一項本來的通過條件判。接受 ＝ 那一項多抽一次。</p>' + red : '') +
    (allDone ? '<div class="card hot"><h3 class="mt0">他們這一層交出去的你都判過了。</h3>' +
      '<p class="lead">要不要放他們往下一層？' + esc(RULES.GATE) + '</p>' +
      '<p><span class="btn" data-go="gate" data-p=\'{"id":"' + id + '"}\'>去關卡審核</span>' +
      '　<span class="btn flat" data-go="newtask" data-p=\'{"L":' + t.layer + '}\'>' +
      '還是先再開一項</span></p></div>' : '') +
    (!pend && !red && !allDone ? '<div class="card"><p class="lead">這一組現在沒有在等你的東西。</p></div>' : '');
};

/* ================= 一組的剖面 ================= */
/* 學生看得到自己的，你看得到每一組的。同一份資料、同一張圖——
   它是描述，不是評價，所以兩邊看到的東西一樣。 */

PAGES.tcurve = function () {
  var id = S.p.id, t = teamOf(id);
  if (!t) {
    return head('SECTION', '剖面', '先選一組。') +
      classTeams('C1').map(function (x) {
        var s = timelineOf(x.teamId).stats;
        return '<div class="item" data-go="tcurve" data-p=\'{"id":"' + x.teamId + '"}\'>' +
          '<div class="body"><div class="t">' + esc(x.name) + '</div>' +
          '<div class="m">' + esc(LAYERS[x.layer - 1].name) + '　·　' + s.n + ' 項　·　' +
          (s.rounds ? '平均 ' + (Math.round(s.rounds * 10) / 10) + ' 輪' : '還沒送過') +
          '</div></div><div class="art"><span class="q">→</span></div></div>';
      }).join('');
  }
  return '<p><a class="plain" data-go="tcurve" data-p=\'{}\'>← 換一組</a>　' +
      '<a class="plain" data-go="team" data-p=\'{"id":"' + id + '"}\'>去逐項確認 →</a></p>' +
    head('SECTION', t.name + ' · 剖面',
      '他們走過的時間。這一頁沒有一個數字是評價，也沒有一個進成績。') +
    curveReport(id, '他們');
};

/* ================= 審一項 ================= */

PAGES.review = function () {
  var tid = S.p.team, kid = S.p.task;
  var t = teamOf(tid), task = taskOf(kid), tt = ttOf(tid, kid);
  var subs = where('Submissions', function (s) { return s.teamId === tid && s.taskId === kid; });
  var revs = where('Reviews', function (s) { return s.teamId === tid && s.taskId === kid; });
  var last = subs[subs.length - 1];
  var st = starters();

  var gave = S.p.gave == null ? 0 : S.p.gave;
  var gaveBtns = RULES.GAVE.map(function (g) {
    return '<button class="' + (gave === g.n ? 'on' : '') + '" data-act="gave" data-p=\'{"g":' +
      g.n + '}\'>' + g.n + '</button>';
  }).join('');

  var checkList = (task.checks || []).map(function (c, i) {
    var on = (tt.checked || []).indexOf(i) >= 0;
    return '<div class="check lock ' + (on ? 'on' : '') + '"><span class="box">' +
      (on ? '✓' : '') + '</span><span>' + esc(c) + '</span></div>';
  }).join('');

  return '<p><a class="plain" data-go="team" data-p=\'{"id":"' + tid + '"}\'>← 回 ' +
      esc(t.name) + '</a></p>' +
    head('REVIEW', task.title,
      esc(t.name) + ' · 第 ' + tt.attempt + ' 次送出') +

    '<div class="row">' +
      '<div class="card" style="flex:1;margin:0"><div class="eyebrow">通過條件</div>' +
        '<p style="margin:0">' + esc(task.cond) + '</p>' +
        (task.note ? '<div class="eyebrow" style="margin-top:11px">要注意的</div>' +
          '<p class="fine" style="margin:0">' + esc(task.note) + '</p>' : '') + '</div>' +
      '<div class="card" style="flex:1;margin:0"><div class="eyebrow">他們對自己的判斷</div>' +
        '<p style="margin:0;font-size:22px">' + esc(EFFORT[tt.effort] || '—') + '</p>' +
        '<div class="fine">跟他們自己原本估的比。</div>' +
        (tt.blocker ? '<div class="eyebrow" style="margin-top:11px">✋ 他們說卡住了</div>' +
          '<p class="fine" style="margin:0">' + nl(tt.blocker) + '</p>' : '') + '</div>' +
    '</div>' +

    '<h2>他們交了什麼</h2>' +
    '<p class="fine">系統不收檔案、看不到內容——作業在你原本收作業的地方。' +
    '下面這一段是他們自己寫的「這一項多做了什麼」。</p>' +
    '<div class="card sunk"><p style="margin:0">' +
      (last && last.text ? nl(last.text) : '<span class="fine">（留白）</span>') + '</p></div>' +

    (task.checks && task.checks.length ?
      '<h3>他們的清單（' + (tt.checked || []).length + '/' + task.checks.length + '）</h3>' +
      '<p class="fine">' + esc(RULES.say.check()) + '——這是他們自己的紀錄，不是成績。</p>' +
      '<div class="card" style="padding:11px">' + checkList + '</div>' : '') +

    (revs.length ? roundLog(subs, revs, task) : '') +

    '<h2>合格考量</h2>' +
    '<p class="fine">你寫的這一段就是教材。學生會在結算頁一字不改讀到它。</p>' +
    (st.length ? '<div class="fine">你常用的起頭：' + st.map(function (s) {
      return '<a class="plain" data-act="starter" data-p=\'{"s":"' + esc(s) + '"}\'>' +
        esc(s) + '⋯</a>';
    }).join('　') + '</div>' : '') +
    '<textarea id="reason" style="min-height:154px" placeholder="他們做到了什麼、還差什麼、下一次改什麼">' +
      esc(draft('reason')) + '</textarea>' +

    '<h2>' + RULES.GAVE_MIN + '–' + RULES.GAVE_MAX + '</h2>' +
    '<p class="lead">' + esc(RULES.GAVE_STATEMENT) + '</p>' +
    '<div class="seg">' + gaveBtns + '</div>' +
    '<p class="fine" style="margin-top:11px">' +
      '<b>' + gave + '　' + esc(RULES.GAVE[gave].anchor) + '</b>　' + esc(RULES.GAVE[gave].effect) +
      '　→　' + esc(RULES.say.drawsFor(task.layer, gave)) + '。<br>' +
      '這一格只決定抽幾次，<b>不決定過不過</b>。它是這個系統裡唯一能獎勵' +
      '「不只把作業交出來」的地方。</p>' +

    (S.flash ? '<p class="pill over">' + esc(S.flash) + '</p>' : '') +
    '<div class="sep"></div>' +
    '<p><span class="btn" data-act="judge" data-p=\'{"r":"ok"}\'>通過</span>' +
    '　<span class="btn flat" data-act="judge" data-p=\'{"r":"back"}\'>需補充</span></p>' +
    '<p class="fine">需補充不扣任何分數，重交次數不限。每一次的內容與理由都留著，' +
    '兩份草稿會並排放在他們的往返紀錄裡。</p>';
};

/* 回頭補強：接受／不接受 */
PAGES.redig = function () {
  var r = find('Redigs', function (x) { return x.redigId === S.p.id; });
  var task = taskOf(r.taskId), t = teamOf(r.teamId);
  return '<p><a class="plain" data-go="team" data-p=\'{"id":"' + r.teamId + '"}\'>← 回 ' +
      esc(t.name) + '</a></p>' +
    head('REDIG', '回頭補強　' + task.title, esc(t.name)) +
    '<div class="card"><div class="eyebrow">這一項本來的通過條件</div>' +
      '<p style="margin:0">' + esc(task.cond) + '</p>' +
      '<div class="fine" style="margin-top:11px">照它判，不是照現在的標準判。</div></div>' +
    '<h2>他們回頭補了什麼</h2>' +
    '<div class="card sunk"><p style="margin:0">' + nl(r.note) + '</p></div>' +
    '<h2>你的理由</h2>' +
    '<p class="fine">不接受也要寫——學生讀得到，而且可以再送。</p>' +
    '<textarea id="rreason"></textarea>' +
    '<p><span class="btn" data-act="rjudge" data-p=\'{"id":"' + r.redigId + '","ok":1}\'>接受（那一項多抽一次）</span>' +
    '　<span class="btn flat" data-act="rjudge" data-p=\'{"id":"' + r.redigId + '","ok":0}\'>不接受</span></p>';
};

/* ================= 關卡審核 ================= */

PAGES.gate = function () {
  var id = S.p.id;
  if (!id) {
    var list = classTeams('C1').map(function (x) {
      var rows = rowsFor(x.teamId, x.layer);
      var done = rows.filter(function (r) { return r.tt.status === 'done'; }).length;
      return '<div class="item" data-go="gate" data-p=\'{"id":"' + x.teamId + '"}\'>' +
        '<div class="body"><div class="t">' + esc(x.name) + '</div>' +
        '<div class="m">' + esc(LAYERS[x.layer - 1].name) + ' · 停留 ' +
          RULES.stayDays(x.enteredAt, now()) + ' 天　·　這一層判過 ' + done + ' / ' + rows.length +
          ' 項</div></div><div class="art"><span class="q">→</span></div></div>';
    }).join('');
    return head('GATE', '關卡審核', RULES.GATE + '\n沒有任何數量條件、時間條件或分數條件替你決定。') +
      '<p class="fine">學生不送申請——你覺得可以就放行。</p>' + list;
  }

  var t = teamOf(id), rows = rowsFor(id, t.layer);
  var table = rows.map(function (r) {
    var rev = where('Reviews', function (v) {
      return v.teamId === id && v.taskId === r.task.taskId && v.result === 'ok';
    }).pop();
    return '<div class="item flat"><div class="body">' +
      '<div class="t">' + esc(r.task.title) + '</div>' +
      '<div class="m">' + (r.tt.status === 'done'
        ? '判過了　·　你給「' + esc(RULES.gaveAnchor(rev ? rev.gave : 0)) + '」'
        : r.tt.status === 'sent' ? '還在你這裡'
        : r.tt.status === 'back' ? '你要他們補' : '他們還沒交') + '</div></div>' +
      '<div class="art"><span class="q">' + (r.tt.status === 'done' ? '✓' : '·') + '</span></div></div>';
  }).join('');

  return '<p><a class="plain" data-go="gate" data-p=\'{}\'>← 換一組</a></p>' +
    head('GATE', t.name + ' · ' + LAYERS[t.layer - 1].name,
      '這是整個系統唯一的門。所有畫面都不該暗示還有第二道。') +

    '<h2>這一層的項目對照</h2>' +
    '<p class="fine">數量不是條件——你隨時可以再開一項，也可以現在就放他們往下。</p>' +
    (table || '<p class="fine">這一層還沒開任何一項。</p>') +

    '<h2>中途接手</h2>' +
    '<p class="fine">課程走到一半才導入時，前面在系統外做完的直接認列。設定之後這一組從下一層開始。</p>' +
    '<div class="seg">' + [0, 1, 2, 3, 4].map(function (n) {
      return '<button class="' + ((t.startedAt || 0) === n ? 'on' : '') +
        '" data-act="startat" data-p=\'{"id":"' + id + '","n":' + n + '}\'>認列 ' + n + ' 層</button>';
    }).join('') + '</div>' +

    '<h2>判斷理由</h2>' +
    '<p class="fine">學生在紀錄裡讀得到這一段，而且它會留在他們手上那一疊裡。' +
      '放行 ＋' + RULES.RELEASE + ' 分（道具 ' + RULES.TOOL + ' ＋ 守關戰利品 ' +
      RULES.TROPHY + '），並且擊退' + esc(LAYERS[t.layer - 1].boss.name) + '。<br>' +
      '戰利品你不用選——牠會留下 ' + RULES.OFFER + ' 件，' +
      '<b>由他們自己挑一件帶走</b>。攤開哪 ' + RULES.OFFER + ' 件跟他們做得好不好無關，' +
      '你也沒有辦法用它獎勵或懲罰任何人。</p>' +
    '<textarea id="verdict" placeholder="為什麼現在可以往下">' + esc(draft('verdict')) + '</textarea>' +
    (S.flash ? '<p class="pill over">' + esc(S.flash) + '</p>' : '') +
    '<p><span class="btn" data-act="release" data-p=\'{"id":"' + id + '"}\'>' +
      (t.layer < RULES.LAYERS ? '放他們往下一層' : '放行到結局') + '</span></p>';
};

/* ================= 全班位置 ================= */

PAGES.classmap = function () {
  var teams = classTeams('C1');
  var body = LAYERS.map(function (l) {
    var on = teams.filter(function (x) { return x.layer === l.n; });
    var b = PACK.bosses[l.n - 1];
    var guys = on.map(function (x, i) {
      return '<div class="guy" style="left:' + (8 + i * 100 / Math.max(1, on.length)) + '%">' +
        '<div class="p">☖</div><div class="g">' + esc(x.name.split(' · ')[0]) + '</div>' +
        '<div class="g" style="color:var(--mute)">' + RULES.stayDays(x.enteredAt, now()) + ' 天</div></div>';
    }).join('');
    return '<div class="band" ' + layerVars(l.n) + '>' +
      '<div class="lab"><div class="code">' + l.code + '</div><div class="nm">' + esc(l.name) + '</div>' +
      '<div class="code" style="letter-spacing:0">' + esc(l.stage) + '　' + on.length + ' 組</div></div>' +
      '<div class="field">' + guys +
      '<div class="boss"><img src="' + pxSvg(b.px, b.hue) + '" alt=""></div></div></div>';
  }).join('');
  return head('CLASS', '全班位置', '整班在同一張剖面上，沒有迷霧。') +
    '<div class="map">' + body + '</div>' +
    '<p class="fine">學生看到的是同一張圖，但下面還沒開的那幾層是霧。</p>';
};

/* ================= 學生端的世界 ================= */

PAGES.world = function () {
  var blocks = LAYERS.map(function (l) {
    var b = PACK.bosses[l.n - 1];
    return '<div class="card layer" ' + layerVars(l.n) + '>' +
      '<div style="display:flex;gap:22px;flex-wrap:wrap">' +
        '<img src="' + pxSvg(b.px, b.hue) + '" style="width:110px;height:110px;object-fit:contain">' +
        '<div style="flex:1;min-width:330px">' +
          '<div class="eyebrow">' + l.code + '　' + esc(l.stage) + '</div>' +
          '<h3 class="mt0">' + esc(l.name) + '　·　' + esc(l.boss.name) + '</h3>' +
          '<p style="margin:0 0 11px">' + esc(l.hard) + '</p>' +
          '<p class="fine">' + esc(l.boss.trait) + '<br>' +
          '「' + esc(l.boss.line) + '」<br>' +
          '道具　' + esc(l.tool.name) + '——' + esc(l.tool.why) + '</p>' +
        '</div></div></div>';
  }).join('');

  return head('WORLD', '學生端的世界',
    '學生看到的是一趟往地心的挖掘。你做的事沒有變：開任務、讀他們交的東西、寫下判斷。') +
    '<div class="card"><div class="eyebrow">你在故事裡</div>' +
      '<h3 class="mt0">斗篷人　·　' + esc(CLOAK.who) + '</h3>' +
      '<p style="margin:0">' + esc(CLOAK.say) + '</p>' +
      '<p class="fine" style="margin-top:11px">' + esc(CLOAK.road) + '</p></div>' +
    blocks +
    '<h2>全部的計算</h2>' +
    '<div class="card sunk"><div class="fine" style="line-height:2.2">' +
      esc(RULES.say.pass()) + '<br>' + esc(RULES.say.drop()) + '<br>' +
      esc(RULES.say.release()) + '<br>' + esc(RULES.say.check()) + '<br>' +
      esc(RULES.say.round()) + '<br>' + esc(RULES.say.draws()) + '<br>' +
      '回頭補強　' + esc(RULES.say.redig()) + '<br>' +
      '期限　幾天後／指定日期／不設限。逾期只標示，不阻擋<br>' +
      '停留天數　從進到那一層那一刻起算<br>' +
      '每層任務數　沒有上限<br>' +
      esc(RULES.GATE) +
    '</div></div>';
};

/* ================= 期末回顧 ================= */

PAGES.final = function () {
  var done = classTeams('C1').filter(function (t) { return t.finished; });
  if (!done.length) {
    return head('FINALE', '期末回顧', '四層走完的組會出現在這裡。') +
      '<div class="card"><p class="lead">還沒有組走完四層。</p></div>';
  }
  var body = done.map(function (t) {
    var f = finaleOf(t.teamId) || {};
    var passes = where('Passes', function (p) { return p.teamId === t.teamId; });
    var tts = where('TeamTasks', function (x) { return x.teamId === t.teamId && x.status === 'done'; });
    var sc = scoreOf(t.teamId), mo = motionOf(t.teamId);
    return '<div class="card">' +
      '<h3 class="mt0">' + esc(t.name) + '</h3>' +
      '<div class="fine">判過 ' + tts.length + ' 項　·　放行 ' + passes.length + ' 層　·　' +
        sc.total + ' 分　·　來回 ' + mo.rounds + ' 次（改過 ' + mo.changed + ' 次）</div>' +
      '<div class="log" style="margin-top:22px">' + passes.map(function (p) {
        return '<div class="n ok"><div class="h">' + LAYERS[p.layer - 1].code + ' ' +
          esc(LAYERS[p.layer - 1].name) + '</div><div class="b">' + nl(p.reason) + '</div></div>';
      }).join('') + '</div>' +
      (f.opened
        ? '<div class="card sunk"><div class="eyebrow">你寫的最後那段話</div>' +
          '<p style="margin:0">' + nl(f.teacherWord) + '</p>' +
          (f.submitted ? '<div class="eyebrow" style="margin-top:11px">他們取的名字</div>' +
            '<p style="margin:0;font-size:33px;color:var(--gold)">' + esc(f.lightName) + '</p>'
            : '<div class="fine" style="margin-top:11px">等他們命名封存。</div>') + '</div>'
        : '<label>讀完之後，寫最後那段話</label>' +
          '<textarea id="word-' + t.teamId + '" placeholder="這一趟他們做到了什麼"></textarea>' +
          '<p><span class="btn" data-act="openend" data-p=\'{"id":"' + t.teamId + '"}\'>' +
          '放行結局</span></p>') +
    '</div>';
  }).join('');
  return head('FINALE', '期末回顧', '四層走完的組，讀完寫話 → 放行結局。') + body;
};

/* ---------- 老師的動作 ---------- */

ACTS.publish = function (p) {
  var title = val('#t-title'), cond = val('#t-cond');
  if (!title.trim() || !cond.trim()) { S.flash = '名稱與通過條件要寫。'; render(); return; }
  var picks = [].slice.call(document.querySelectorAll('.pick'))
    .filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
  if (!picks.length) { S.flash = '至少發給一組。'; render(); return; }
  var due = val('#t-due');
  actPublish('C1', p.L, {
    title: title, cond: cond, note: val('#t-note'),
    checks: val('#t-checks').split('\n').map(function (s) { return s.trim(); })
      .filter(function (s) { return s; }),
    due: due ? new Date(due + 'T23:59:59').getTime() : null,
    teams: picks
  });
  go('tasks');
};

ACTS.gave = function (p) { keepDraft(); S.p.gave = p.g; render(); };
ACTS.starter = function (p) {
  var e = document.getElementById('reason');
  if (e) { e.value = p.s; DRAFT.reason = p.s; e.focus(); }
};
ACTS.judge = function (p) {
  var reason = val('#reason');
  if (!reason.trim()) { keepDraft(); S.flash = '寫下合格考量。學生讀的就是這一段。'; render(); return; }
  var gave = S.p.gave || 0;
  actReview(S.p.team, S.p.task, { result: p.r, reason: reason, gave: gave });
  go('team', { id: S.p.team });
};
ACTS.rjudge = function (p) {
  var reason = val('#rreason');
  if (!p.ok && !reason.trim()) { keepDraft(); S.flash = '不接受也要寫理由。'; render(); return; }
  var r = find('Redigs', function (x) { return x.redigId === p.id; });
  actRedigJudge(p.id, !!p.ok, reason);
  go('team', { id: r.teamId });
};
ACTS.startat = function (p) { keepDraft(); actStartAt(p.id, p.n); render(); };
ACTS.release = function (p) {
  var v = val('#verdict');
  if (!v.trim()) { keepDraft(); S.flash = '寫下你為什麼現在放他們往下。'; render(); return; }
  actRelease(p.id, 'ok', v);
  go('queue');
};
ACTS.openend = function (p) {
  var e = document.getElementById('word-' + p.id);
  if (!e || !e.value.trim()) { S.flash = '寫完最後那段話再放行結局。'; render(); return; }
  actFinale(p.id, { teacherWord: e.value, opened: true });
  render();
};
