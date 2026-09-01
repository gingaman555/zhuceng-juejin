/* 學生端。 */

/* ================= 首頁 ================= */
/* 首頁只給一件事：下一件要做的事。 */

PAGES.home = function () {
  var t = myTeam(), L = LAYERS[t.layer - 1], boss = L.boss;
  var bossPx = PACK.bosses[t.layer - 1];
  var stay = RULES.stayDays(t.enteredAt, now());
  var nx = nextThing(t.teamId);

  var cta;
  if (nx.kind === 'pick') {
    var pl = LAYERS[nx.pick.layer - 1];
    cta = '<div class="card hot"><div class="eyebrow">' + esc(pl.code) + ' 留下的</div>' +
      '<div style="display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap">' +
        '<div style="flex:1;min-width:330px">' +
          '<h1 style="margin-bottom:11px">' + esc(pl.boss.name) + '退開了，留下 ' +
            RULES.OFFER + ' 件。</h1>' +
          '<p class="lead">挑一件帶走。</p></div>' +
        '<span class="btn" data-go="pick">去挑一件</span>' +
      '</div></div>';
  } else if (nx.kind === 'back') {
    cta = ctaCard('他要你們補的那一項', nx.task.title,
      '他寫了為什麼還不到。讀完再改，比重寫一次快。', nx.cta, nx.task.taskId);
  } else if (nx.kind === 'open') {
    cta = ctaCard('下一件要做的事', nx.task.title,
      nx.task.cond, nx.cta, nx.task.taskId);
  } else if (nx.kind === 'redig') {
    cta = ctaCard('沒有非做不可的事了', nx.task.title,
      '這一項你們交了，他給的是「' + RULES.gaveAnchor(0) + '」。' +
      '專案走到現在，如果你們發現它不夠，可以回頭補完——' + RULES.say.redig() + '。',
      nx.cta, nx.task.taskId);
  } else if (nx.kind === 'wait') {
    cta = '<div class="card hot"><div class="eyebrow">現在</div>' +
      '<h1 style="margin-bottom:11px">等他看。</h1>' +
      '<p class="lead">你們交出去的 ' + nx.n + ' 項在他那裡。他看完會寫下判斷。</p>' +
      '<p class="fine">他的裁決時間不可預測，這裡不會給你一個「幾小時內」的承諾。' +
      '這一段沒有動作可做——所以這裡也沒有按鈕。</p></div>';
  } else if (nx.kind === 'finale') {
    cta = '<div class="card hot"><div class="eyebrow">最後</div>' +
      '<h1 style="margin-bottom:11px">四層都放行了。</h1>' +
      '<p class="lead">剩下一件事：幫這一趟取一個名字。</p>' +
      '<p><span class="btn" data-go="end">去命名封存</span></p></div>';
  } else {
    cta = '<div class="card hot"><div class="eyebrow">現在</div>' +
      '<h1 style="margin-bottom:11px">交出去的他都判過了。</h1>' +
      '<p class="lead">他隨時可能再開新的一項。</p>' +
      '<p class="fine">' + esc(RULES.GATE) + '</p></div>';
  }

  var steps = [
    ['1', '點開一項', '看擋著它的是哪一隻'],
    ['2', '作業照他原本的方式交', '回來把清單勾完、回答一題，送出'],
    ['3', '他寫下判斷', '打贏那一隻 → 抽掉落物 → 進圖鑑'],
    ['4', '他覺得可以', '放你們往下一層']
  ].map(function (s) {
    return '<div class="card sunk" style="margin:0"><div class="kv"><b style="color:var(--gold)">' +
      s[0] + '</b>' + esc(s[1]) + '</div><div style="font-size:11px;color:var(--dim);margin-top:5px">' +
      esc(s[2]) + '</div></div>';
  }).join('');

  var dex = dexOf(S.who);
  var redigN = where('Redigs', function (r) { return r.teamId === t.teamId && r.status === 'ok'; }).length;

  return '<div ' + layerVars(t.layer) + '>' +
    head('DEPTH ' + L.code + ' · 目前所在', L.name, L.hard) +

    '<div class="row" style="margin:22px 0">' +
      '<div class="mob" style="flex:2">' + mobImg({ px: bossPx.px, pal: bossPx.hue }) +
        '<div><div class="eyebrow">守關生物</div><div class="n">' + esc(boss.name) + '</div>' +
        '<div class="t">' + esc(boss.trait) + '</div>' +
        '<div class="t" style="margin-top:5px;color:var(--mute)">牠擋在這一層的盡頭。' +
        esc(RULES.GATE) + '</div></div></div>' +
      '<div class="card" style="flex:1;margin:0;text-align:right">' +
        '<div class="eyebrow">停留天數</div><div class="big">' + stay + '</div>' +
        '<div class="fine">從進到這一層那一刻起算。老師的佇列照這個排序，待最久的排最前面。</div>' +
      '</div>' +
    '</div>' +

    cta +

    '<h2>這四步一直重複</h2>' +
    '<div class="row">' + steps + '</div>' +

    '<h2>你在這裡</h2>' +
    mapBands(true) +
    '<p><a class="plain" data-go="map">看整張地圖與其他隊伍 →</a></p>' +

    '<h2>這一趟走完是什麼樣子</h2>' +
    '<div class="row">' +
      sumCard('四個領域', where('Passes', function (p) { return p.teamId === t.teamId; }).length +
        ' / ' + RULES.LAYERS + ' 層', RULES.GATE) +
      sumCard('生物', dex.nMob + ' / ' + TOTAL_MOB + ' 種',
        '每一項任務前面站一隻，每一層的盡頭再站一隻大的。同一項任務，別組遇到的不是同一隻。') +
      sumCard('物品', dex.nItem + ' / ' + TOTAL_ITEM + ' 種',
        RULES.say.sameWeight()) +
    '</div>' +
    '<div class="row">' +
      sumCard('他寫過的', stackOf(S.who).length + ' 件',
        '他每判一件就寫一段。那些字在這裡疊起來，交下一件之前可以先翻——' +
        '這一疊是唯一會改變下一輪的東西。') +
      sumCard('回頭補強', redigN + ' 項',
        '已經過了的任務，專案走下去之後你們可能發現它不夠——回頭補完，寫下補了什麼送去。' +
        '他接受就多抽一次。' + RULES.say.redig() + '，不做也不扣分。') +
      sumCard('最後', '命名封存',
        '四層走完，你們會幫這一趟取一個名字留下來。下一個專案打開紀錄還看得到。') +
    '</div>' +
    '</div>';
};

function ctaCard(eyebrow, title, lead, cta, taskId) {
  return '<div class="card hot">' +
    '<div class="eyebrow">' + esc(eyebrow) + '</div>' +
    '<div style="display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap">' +
      '<div style="flex:1;min-width:330px">' +
        '<h1 style="margin-bottom:11px">' + esc(title) + '</h1>' +
        '<p class="lead">' + esc(lead) + '</p></div>' +
      '<span class="btn" data-go="task" data-p=\'{"id":"' + taskId + '"}\'>' + esc(cta) + '</span>' +
    '</div></div>';
}

function sumCard(k, v, note) {
  return '<div class="card"><div class="eyebrow">' + esc(k) + '</div>' +
    '<div style="font-size:33px;color:var(--gold);line-height:1.3">' + esc(v) + '</div>' +
    '<div class="fine" style="margin-top:11px">' + esc(note) + '</div></div>';
}

/* ================= 任務清單 ================= */
/* 依狀態分區。做完的不在這裡，移到紀錄。 */

PAGES.list = function () {
  var t = myTeam(), L = LAYERS[t.layer - 1];
  var rows = rowsFor(t.teamId, t.layer);
  var back = rows.filter(function (r) { return r.tt.status === 'back'; });
  var open = rows.filter(function (r) { return r.tt.status === 'open'; });
  var sent = rows.filter(function (r) { return r.tt.status === 'sent'; });
  var done = rows.filter(function (r) { return r.tt.status === 'done'; });

  var sec = function (title, list, note) {
    if (!list.length) return '';
    return '<h2>' + esc(title) + '　<span class="pill">' + list.length + ' 項</span></h2>' +
      '<p class="fine">' + esc(note) + '</p>' +
      list.map(function (r) { return taskRow(r, t); }).join('');
  };

  return '<div ' + layerVars(t.layer) + '>' +
    head(L.code + ' · 任務清單', L.name + ' · 這一層開了什麼',
      '每一項前面都站著一隻——點進去才知道是哪一隻。打贏牠，就是他判過這一項。') +
    '<p class="fine">' + esc(RULES.GATE) + '　他隨時可以再開一項，所以這張清單沒有一個「全部做完」的狀態。</p>' +

    sec('要補的', back, '他寫了為什麼還不到。讀完他寫的那一段再改。') +
    sec('還沒交', open, '作業照他原本的方式交。交完點進來把清單勾完、回答一題，再送出。') +
    sec('等他看', sent, '這一區沒有動作可做。') +

    (done.length ? '<div class="sep"></div><p class="fine">這一層已經判過的 ' + done.length +
      ' 項移到了 <a class="plain" data-go="log">紀錄</a>——那裡並排放著你們寫的與他給的。</p>' : '') +

    (rows.length ? '' : '<div class="card"><p class="lead">他還沒在這一層開任何一項。</p>' +
      '<p class="fine">開幾項、什麼時候開，是他依進度決定的。</p></div>') +
    '</div>';
};

function taskRow(r, t) {
  var m = mobFor(r.task.taskId, t.teamId, r.task.layer);
  var seen = r.tt.status === 'done';
  var art = seen
    ? '<img src="' + pxSvg(m.px, layerPal(r.task.layer)) + '" alt="">'
    : '<span class="q">？</span>';
  var tag = r.tt.status === 'back' ? '<span class="pill over">要補的</span>'
    : r.tt.status === 'sent' ? '<span class="pill">等他看</span>'
    : r.tt.status === 'done' ? '<span class="pill ok">他判過了</span>'
    : '<span class="pill gold">還沒交</span>';
  var checkN = (r.tt.checked || []).length, checkT = (r.task.checks || []).length;
  return '<div class="item" data-go="task" data-p=\'{"id":"' + r.task.taskId + '"}\'>' +
    '<div class="body"><div class="t">' + esc(r.task.title) + '</div>' +
      '<div class="m">通過條件　' + esc(r.task.cond) + '</div>' +
      '<div style="margin-top:11px;display:flex;gap:5px;flex-wrap:wrap">' + tag +
        dueTag(r.task.due) +
        (checkT ? '<span class="pill">清單 ' + checkN + '/' + checkT + '</span>' : '') +
        (r.tt.blocker ? '<span class="pill hand">✋ 說了卡住</span>' : '') +
      '</div></div>' +
    '<div class="art">' + art + '</div></div>';
}

/* ================= 任務頁 ================= */

PAGES.task = function () {
  var t = myTeam(), id = S.p.id, task = taskOf(id), tt = ttOf(t.teamId, id);
  if (!task || !tt) return '<p>找不到這一項。</p>';
  if (tt.status === 'done') return taskDone(task, tt, t);

  var m = mobFor(id, t.teamId, task.layer);
  var subs = where('Submissions', function (s) { return s.teamId === t.teamId && s.taskId === id; });
  var revs = where('Reviews', function (s) { return s.teamId === t.teamId && s.taskId === id; });
  var locked = tt.status === 'sent';

  var checks = (task.checks || []).map(function (c, i) {
    var on = (tt.checked || []).indexOf(i) >= 0;
    return '<div class="check ' + (on ? 'on' : '') + (locked ? ' lock' : '') + '"' +
      (locked ? '' : ' data-act="check" data-p=\'{"i":' + i + '}\'') + '>' +
      '<span class="box">' + (on ? '✓' : '') + '</span><span>' + esc(c) + '</span></div>';
  }).join('');

  var seg = Object.keys(EFFORT).map(function (k) {
    return '<button data-act="effort" data-p=\'{"v":"' + k + '"}\'' +
      (tt.effort === k ? ' class="on"' : '') + (locked ? ' disabled' : '') + '>' +
      esc(EFFORT[k]) + '</button>';
  }).join('');

  return '<div ' + layerVars(task.layer) + '>' +
    '<p><a class="plain" data-go="list">← 回任務清單</a></p>' +
    head(LAYERS[task.layer - 1].code + ' · ' + LAYERS[task.layer - 1].stage, task.title, '') +
    '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:22px">' + dueTag(task.due) +
      (tt.status === 'back' ? '<span class="pill over">他要你們補</span>' : '') +
      (locked ? '<span class="pill">等他看</span>' : '') + '</div>' +

    '<div class="row">' +
      '<div class="card layer" style="flex:2;margin:0">' +
        '<div class="eyebrow">通過條件</div><p style="margin:0 0 11px">' + esc(task.cond) + '</p>' +
        (task.note ? '<div class="eyebrow">要注意的</div><p class="lead" style="margin:0">' +
          esc(task.note) + '</p>' : '') +
      '</div>' +
      '<div class="mob sm" style="flex:1">' + mobImg(m) +
        '<div><div class="eyebrow">擋在前面的</div><div class="n">' + esc(m.name) + '</div>' +
        '<div class="t">' + esc(m.trait) + '</div></div></div>' +
    '</div>' +

    (subs.length || revs.length ? roundLog(subs, revs, task) : '') +

    '<h2>作業交到他原本收作業的地方</h2>' +
    '<p class="fine">系統不收檔案、看不到內容，也不評品質。它只知道你們什麼時候按了送出，' +
    '跟他後來寫了什麼。</p>' +

    (task.checks && task.checks.length ?
      '<h2>清單</h2><p class="fine">勾選 ' + RULES.CHECK + ' 分。這是你們自己的紀錄，' +
      '不是成績，也不是送出的門檻。</p><div class="card" style="padding:11px">' + checks + '</div>' : '') +

    '<h2>這一組現在的狀態</h2>' +
    '<p class="fine">必填。比起「做完沒」，這一題問的是「跟你們自己原本估的比」。</p>' +
    '<div class="seg">' + seg + '</div>' +

    '<h2>這一項多做了什麼</h2>' +
    '<p class="fine">選填。' + esc(RULES.GAVE_STATEMENT) + '　他的 ' +
      RULES.GAVE_MIN + '–' + RULES.GAVE_MAX + ' 看的就是這一段。' +
      '留白不扣分——但他也只能照他看到的判。</p>' +
    '<textarea id="extra"' + (locked ? ' disabled' : '') + ' placeholder="多研究了什麼、多畫了什麼、給了不同的做法⋯⋯">' +
      esc(draft('extra', tt.text)) + '</textarea>' +

    '<h2>卡住了嗎</h2>' +
    '<p class="fine">不用等送出。寫下來他的佇列上會排最前面，你們隨時可以放下。</p>' +
    '<textarea id="blocker" style="min-height:66px" placeholder="卡在哪裡？">' + esc(draft('blocker', tt.blocker)) + '</textarea>' +
    '<p><span class="btn flat sm" data-act="blocker">' +
      (tt.blocker ? '更新／放下這一句' : '送出這一句') + '</span></p>' +

    (locked
      ? '<div class="sep"></div><div class="card"><h3 class="mt0">等。</h3>' +
        '<p class="lead">你們交出去了。他看完會寫下判斷。</p>' +
        '<p class="fine">這一段沒有動作可做，所以這裡沒有按鈕。</p></div>'
      : '<div class="sep"></div>' +
        /* 交出去之前先翻一下他寫過的——那一疊是唯一會改變下一輪的東西 */
        (stackOf(S.who).length
          ? '<div class="card sunk" style="display:flex;gap:22px;align-items:center;flex-wrap:wrap">' +
            '<div style="flex:1;min-width:264px"><div class="eyebrow">送出之前</div>' +
            '<div style="font-size:22px">他寫過 ' + stackOf(S.who).length + ' 件判斷。</div>' +
            '<div class="fine">翻一下他上一次是怎麼算合格的，比猜快。</div></div>' +
            '<span class="btn flat" data-go="stack">去翻那一疊</span></div>'
          : '') +
        (S.flash ? '<p class="pill over">' + esc(S.flash) + '</p>' : '') +
        '<p><span class="btn" data-act="submit">我做完了，請他確認</span></p>' +
        '<p class="fine">送出之後清單就鎖住了。退回不扣分，重交次數不限——' +
        '每一次的內容與他寫的理由都留著。</p>') +
    '</div>';
};

/* 往返紀錄。不是「你被退了 N 次」，是「你們來回了 N 次，中間改了這些」。 */
function roundLog(subs, revs, task) {
  var ev = subs.map(function (s) { return { ts: s.ts, kind: 'sub', d: s }; })
    .concat(revs.map(function (r) { return { ts: r.ts, kind: 'rev', d: r }; }))
    .sort(function (a, b) { return a.ts - b.ts; });
  var days = function (ts) { return Math.max(0, Math.round((now() - ts) / 86400000)); };
  var body = ev.map(function (e) {
    if (e.kind === 'sub') {
      return '<div class="n"><div class="h">第 ' + e.d.attempt + ' 次送出 · ' + days(e.ts) + ' 天前' +
        (e.d.effort ? '　·　你們說「' + esc(EFFORT[e.d.effort]) + '」' : '') + '</div>' +
        (e.d.text ? '<div class="b">' + nl(e.d.text) + '</div>' : '') + '</div>';
    }
    var ok = e.d.result === 'ok';
    return '<div class="n ' + (ok ? 'ok' : 'back') + '"><div class="h">他' +
      (ok ? '判過了' : '要你們補') + ' · ' + days(e.ts) + ' 天前' +
      (ok ? '　·　他給「' + esc(RULES.gaveAnchor(e.d.gave)) + '」' : '') + '</div>' +
      '<div class="b">' + nl(e.d.reason) + '</div></div>';
  }).join('');
  var n = subs.length;
  return '<h2>往返紀錄</h2>' +
    '<p class="fine">你們來回了 ' + n + ' 次。' + RULES.say.round() +
    '——它不進成績，但兩份草稿就並排在這裡，' +
    '中間改了什麼是這一趟唯一不需要任何人批准的進步。</p>' +
    '<div class="log">' + body + '</div>';
}

/* ---------- 通過之後：整頁變結算頁 ---------- */

function taskDone(task, tt, t) {
  var m = mobFor(task.taskId, t.teamId, task.layer);
  var rev = where('Reviews', function (r) {
    return r.teamId === t.teamId && r.taskId === task.taskId && r.result === 'ok';
  }).pop();
  var subs = where('Submissions', function (s) { return s.teamId === t.teamId && s.taskId === task.taskId; });
  var revs = where('Reviews', function (s) { return s.teamId === t.teamId && s.taskId === task.taskId; });
  var gave = rev ? rev.gave : 0;
  var finds = (tt.finds || []).map(function (id) { return FINDS[id - 1]; });

  var drops = finds.map(function (f) {
    return '<div class="one"><img src="' + pxSvg(f.px, layerPal(f.L)) + '" alt="">' +
      '<div class="n">' + esc(f.name) + '</div><div class="q">' + esc(f.tier) + '</div></div>';
  }).join('');

  var redigs = where('Redigs', function (r) {
    return r.teamId === t.teamId && r.taskId === task.taskId;
  });
  var wait = redigLeft(t.teamId);

  return '<div ' + layerVars(task.layer) + '>' +
    '<p><a class="plain" data-go="log">← 回紀錄</a></p>' +
    '<div class="eyebrow">' + LAYERS[task.layer - 1].code + ' · 結算</div>' +
    '<h1>' + esc(task.title) + '</h1>' +
    '<p><span class="stamp">他判過了</span></p>' +

    '<div class="row" style="margin-top:22px">' +
      '<div class="mob" style="flex:1">' + mobImg(m) +
        '<div><div class="eyebrow">你們打贏的</div><div class="n">' + esc(m.name) + '</div>' +
        '<div class="t">' + esc(m.trait) + '</div>' +
        '<div class="t" style="color:var(--mute);margin-top:5px">' +
        '同一項任務，別組遇到的不是這一隻。</div></div></div>' +
    '</div>' +

    '<h2>他寫的合格考量</h2>' +
    '<p class="fine">這一段是這個系統裡最重要的東西。他寫的判斷就是教材。</p>' +
    '<div class="card layer"><p style="margin:0;font-size:22px;line-height:1.9">' +
      nl(rev ? rev.reason : '') + '</p></div>' +
    '<p class="fine">這一段留在<a class="plain" data-go="stack">他寫過的那一疊</a>裡（' +
      stackOf(S.who).length + ' 件）——下一件交出去之前可以回來翻。</p>' +

    '<h2>他給的</h2>' +
    '<div class="card">' +
      '<div style="display:flex;gap:22px;align-items:center;flex-wrap:wrap">' +
        '<div><div class="eyebrow">' + RULES.GAVE_MIN + '–' + RULES.GAVE_MAX + '</div>' +
        '<div class="big">' + gave + '</div></div>' +
        '<div style="flex:1;min-width:242px"><div style="font-size:22px">' +
          esc(RULES.gaveAnchor(gave)) + '</div>' +
          '<div class="fine">' + esc(RULES.GAVE_STATEMENT) + '</div>' +
          '<div class="fine" style="margin-top:11px;color:var(--dim)">' +
            esc(RULES.say.drawsFor(task.layer, gave)) + '。它只決定抽幾次，不決定過不過。</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<h2>掉落物 ' + finds.length + ' 件</h2>' +
    '<p class="fine">' + esc(RULES.say.sameWeight()) + '</p>' +
    '<div class="drop">' + drops + '</div>' +
    '<p class="fine" style="margin-top:11px">通過這一項 ＋' + RULES.PASS + ' 分，' +
      '掉落物 ' + finds.length + ' 件 ＋' + (finds.length * RULES.DROP) + ' 分。' +
      '進圖鑑的那幾件跟著你走，換組換班換專案都在。</p>' +

    roundLog(subs, revs, task) +

    '<h2>回頭補強</h2>' +
    '<p class="fine">專案走下去之後你們發現這一項不夠，可以回頭補完。' +
      '他照這一項<b>本來的通過條件</b>判——' + esc(task.cond) + '　' +
      RULES.say.redig() + '，不做也不扣分。接受 ＝ 這一項多抽一次。</p>' +
    redigBlock(redigs, wait, task) +
    '</div>';
}

function redigBlock(redigs, wait, task) {
  var past = redigs.map(function (r) {
    var tag = r.status === 'sent' ? '<span class="pill">等他看</span>'
      : r.status === 'ok' ? '<span class="pill ok">他接受了</span>'
      : '<span class="pill over">他沒接受</span>';
    return '<div class="card sunk"><div style="margin-bottom:5px">' + tag + '</div>' +
      '<div class="pair"><div><div class="h">你們回頭補的</div>' + nl(r.note) + '</div>' +
      '<div><div class="h">他寫的</div>' + (r.reason ? nl(r.reason) : '<span class="fine">—</span>') +
      '</div></div></div>';
  }).join('');
  var open = redigs.some(function (r) { return r.status === 'sent'; });
  var form;
  if (open) form = '<p class="fine">已經送出一件，等他看。</p>';
  else if (wait > 0) form = '<p class="fine">還要等 ' + wait + ' 天。' + RULES.say.redig() +
    '——不是日曆週，所以今天禮拜幾不影響。</p>';
  else form = '<textarea id="redig" placeholder="我回頭補了什麼">' + esc(draft('redig')) + '</textarea>' +
    (S.flash ? '<p class="pill over">' + esc(S.flash) + '</p>' : '') +
    '<p><span class="btn" data-act="redig" data-p=\'{"id":"' + task.taskId + '"}\'>送去給他看</span></p>';
  return past + form;
}

/* ================= 圖鑑 ================= */

PAGES.dex = function () {
  var dex = dexOf(S.who), u = me();
  var pick = S.p.L || 0;
  var tabs = [[0, '四個領域']].concat(LAYERS.map(function (l) { return [l.n, l.code + ' ' + l.name]; }))
    .map(function (x) {
      return '<button class="' + (pick === x[0] ? 'on' : '') + '" data-go="dex" data-p=\'{"L":' +
        x[0] + '}\'>' + esc(x[1]) + '</button>';
    }).join('');

  var own = ownMob(u.account), ownIt = ownFind(u.account);

  /* 篩到哪一層，數字就講那一層——不然「L1 十一格」配「4 / 44」讀起來對不上 */
  var tally = { mob: [0, 0], item: [0, 0] };

  /* 生物：一區 10 隻 ＋ 4 隻守關 */
  var mobCells = [];
  LAYERS.forEach(function (l) {
    if (pick && pick !== l.n) return;
    MOB[l.n - 1].forEach(function (c) {
      var got = dex.mobs[c.n];
      mobCells.push(cellT(tally.mob, got, pxSvg(c.px, l.pal, !got), got ? c.n : '？？？',
        got ? c.t : l.name + ' · 還沒遇到'));
    });
  });
  LAYERS.forEach(function (l) {
    if (pick && pick !== l.n) return;
    var b = PACK.bosses[l.n - 1], got = dex.mobs['BOSS' + l.n];
    mobCells.push(cellT(tally.mob, got, pxSvg(b.px, b.hue, !got), got ? b.name : '？？？',
      got ? l.boss.trait : l.name + ' · 層底'));
  });

  /* 物品：108 掉落物 ＋ 24 戰利品 ＋ 4 道具 */
  var itemCells = [];
  LAYERS.forEach(function (l) {
    if (pick && pick !== l.n) return;
    var got = dex.tools[l.n];
    itemCells.push(cellT(tally.item, got, pxSvg(l.tool.px, l.pal, !got), got ? l.tool.name : '？？？',
      got ? l.tool.why : l.name + ' · 放行才有'));
  });
  LAYERS.forEach(function (l) {
    if (pick && pick !== l.n) return;
    TRO[l.n - 1].forEach(function (tr) {
      var got = dex.tros[troId(tr)];
      itemCells.push(cellT(tally.item, got, pxSvg(tr.px, l.pal, !got), got ? tr.n : '？？？',
        got ? tr.w : l.name + ' · 戰利品'));
    });
  });
  LAYERS.forEach(function (l) {
    if (pick && pick !== l.n) return;
    DEB[l.n - 1].forEach(function (f) {
      var got = dex.finds[f.id];
      itemCells.push(cellT(tally.item, got, pxSvg(f.px, l.pal, !got), got ? f.name : '？？？',
        got ? f.look : l.name + ' · ' + f.tier));
    });
  });

  return head('COLLECTION', '圖鑑',
    '一次攤開。沒拿到的只留位置與微光。\n圖鑑是個人的——換組、換班、換專案，這一頁都跟著你走。') +
    '<div class="seg" style="margin:22px 0">' + tabs + '</div>' +

    '<h2>只有你有的那一組</h2>' +
    '<p class="fine">從帳號算出來的，別人拿不到同一組。它不算在 ' + TOTAL_MOB + ' ／ ' +
      TOTAL_ITEM + ' 裡——它不是一格進度，是這一趟從第一天就有的東西。</p>' +
    '<div class="row">' +
      '<div class="mob" style="flex:1"><img src="' + pxSvg(own.px, own.pal) + '" alt="">' +
        '<div><div class="eyebrow">你的那一隻</div><div class="n">' + esc(own.name) + '</div>' +
        '<div class="t">' + esc(own.trait) + '</div></div></div>' +
      '<div class="mob sm" style="flex:1"><img src="' + pxSvg(ownIt.px, ownIt.pal) + '" alt="">' +
        '<div><div class="eyebrow">你的那一件</div><div class="n">' + esc(ownIt.name) + '</div>' +
        '<div class="t">' + esc(ownIt.look) + '</div></div></div>' +
    '</div>' +

    '<h2>生物　' + tally.mob[0] + ' / ' + tally.mob[1] + ' 種</h2>' +
    '<p class="fine">一區 ' + MOB[0].length + ' 隻，加上四隻守關。' +
      '每一項任務前面站一隻；同一項任務，不同組遇到的不是同一隻。</p>' +
    '<div class="dex">' + mobCells.join('') + '</div>' +

    '<h2>物品　' + tally.item[0] + ' / ' + tally.item[1] + ' 種</h2>' +
    '<p class="fine">' + FINDS.length + ' 掉落物 ＋ ' + PACK.trophies.length + ' 戰利品 ＋ ' +
      LAYERS.length + ' 道具。' + esc(RULES.say.sameWeight()) + '<br>' +
      '掉落物是打贏那一隻的時候抽的；<b>戰利品是你們自己挑的</b>——每放行一層，' +
      '層底那一隻留下 ' + RULES.OFFER + ' 件，你們帶走一件。' +
      '道具是放行的證明，一層一件。</p>' +
    '<div class="dex">' + itemCells.join('') + '</div>';
};

function cellT(t, got, src, name, tip) {
  t[1]++; if (got) t[0]++;
  return cell(got, src, name, tip);
}

function cell(got, src, name, tip) {
  return '<div><div class="slot ' + (got ? 'on' : 'off') + '" title="' + esc(tip) + '">' +
    (got ? '<img src="' + src + '" alt="">' : '<img src="' + src + '" alt="" style="opacity:.5">') +
    '</div><div class="dexname">' + esc(name) + '</div></div>';
}

/* ================= 排行榜 ================= */

PAGES.board = function () {
  var t = myTeam();
  var rows = board('C1').map(function (r) {
    var mine = r.team.teamId === t.teamId;
    var how = r.score.parts.map(function (p) { return esc(p.k) + ' ＝ ' + p.v + ' 分'; }).join('　·　');
    return '<div class="rank ' + (mine ? 'me' : '') + '">' +
      '<div class="top"><span class="no">' + r.rank + '</span>' +
      '<span class="nm">' + esc(r.team.name) + (mine ? '　（你們）' : '') + '</span>' +
      '<span class="sc">' + r.score.total + '</span></div>' +
      '<div class="how">' + (how || '還沒有分數') + '</div>' +
      '<div class="how">' + esc(LAYERS[r.team.layer - 1].name) + ' · 停留 ' + r.stay + ' 天' +
        '　·　' + (r.motion.rounds
          ? '來回 ' + r.motion.rounds + ' 次（改過 ' + r.motion.changed + ' 次）'
          : '還沒送過任何一次') +
      '</div></div>';
  }).join('');

  return head('LEADERBOARD', '排行榜',
    '每一列都拆給你看分數是怎麼來的。') +
    '<div class="card sunk"><div class="fine">' +
      esc(RULES.say.pass()) + '　·　' + esc(RULES.say.drop()) + '　·　' +
      esc(RULES.say.release()) + '<br>' +
      esc(RULES.say.check()) + '　·　' + esc(RULES.say.round()) +
      '——「來回 N 次」不算分，它只說明這一組有沒有在動。' +
      '兩次被退回而且真的在改的組，跟沒動過的組，不該在榜上長得一樣。<br>' +
      esc(RULES.GATE) + '名次不決定誰往下。' +
    '</div></div>' + rows;
};

/* ================= 紀錄 ================= */

PAGES.log = function () {
  var t = myTeam();
  var rows = [];
  LAYERS.forEach(function (l) {
    rowsFor(t.teamId, l.n).filter(function (r) { return r.tt.status === 'done'; })
      .forEach(function (r) { rows.push({ L: l, r: r }); });
  });
  var body = rows.map(function (x) {
    var rev = where('Reviews', function (v) {
      return v.teamId === t.teamId && v.taskId === x.r.task.taskId && v.result === 'ok';
    }).pop();
    var sub = where('Submissions', function (v) {
      return v.teamId === t.teamId && v.taskId === x.r.task.taskId;
    }).pop();
    var gave = rev ? rev.gave : 0;
    return '<div class="item" data-go="task" data-p=\'{"id":"' + x.r.task.taskId + '"}\'>' +
      '<div class="body">' +
        '<div class="t">' + esc(x.L.code) + '　' + esc(x.r.task.title) + '</div>' +
        '<div class="pair" style="margin-top:11px">' +
          '<div><div class="h">你們寫的</div>' +
            (sub && sub.text ? nl(sub.text) : '<span class="fine">（留白）</span>') + '</div>' +
          '<div><div class="h">他給的</div>「' + esc(RULES.gaveAnchor(gave)) + '」，抽了 ' +
            RULES.draws(x.L.n, gave) + ' 次</div>' +
        '</div>' +
        '<div class="m">' + esc(String(rev ? rev.reason : '').slice(0, 60)) + '⋯</div>' +
      '</div>' +
      '<div class="art"><img src="' +
        pxSvg(mobFor(x.r.task.taskId, t.teamId, x.L.n).px, x.L.pal) + '" alt=""></div>' +
      '</div>';
  }).join('');

  var passes = where('Passes', function (p) { return p.teamId === t.teamId; }).map(function (p) {
    return '<div class="card layer" ' + layerVars(p.layer) + '>' +
      '<div class="eyebrow">' + esc(LAYERS[p.layer - 1].code) + ' 放行</div>' +
      '<p style="margin:0">' + nl(p.reason) + '</p></div>';
  }).join('');

  return head('RECORD', '紀錄',
    '走過的每一項都在這裡，點得進去。\n' +
    '寫得認真的那幾次拿 3–4、留白的那幾次拿 0——那條線自己會講話。') +
    (rows.length ? body : '<div class="card"><p class="lead">還沒有判過的項目。</p></div>') +
    (passes ? '<h2>他放行的理由</h2>' + passes : '');
};

/* ================= 迷霧地圖 ================= */
/* 只有一條軸：深度。層裡面不鋪格子——任務沒有順序，鋪成一排等於系統
   在替學生排「先做哪一項」。 */

function mapBands(mini) {
  var t = myTeam();
  var teams = classTeams('C1');
  var body = LAYERS.map(function (l) {
    var here = t.layer === l.n;
    var seen = t.layer >= l.n;
    var b = PACK.bosses[l.n - 1];
    var guys = '';
    if (!mini) {
      var on = teams.filter(function (x) { return x.layer === l.n; });
      guys = on.map(function (x, i) {
        var mine = x.teamId === t.teamId;
        var left = 8 + (i * 100 / Math.max(1, on.length));
        return '<div class="guy ' + (mine ? 'me' : '') + '" style="left:' + left + '%">' +
          '<div class="p">' + (mine ? '☗' : '☖') + '</div>' +
          '<div class="g">' + esc(mine ? '你們' : x.name.split(' · ')[0]) + '</div></div>';
      }).join('');
    } else if (here) {
      guys = '<div class="guy me" style="left:8%"><div class="p">☗</div><div class="g">你們</div></div>';
    }
    return '<div class="band" ' + layerVars(l.n) + '>' +
      '<div class="lab"><div class="code">' + l.code + (here ? ' · 現在' : '') + '</div>' +
      '<div class="nm" style="color:' + (seen ? 'var(--Ll)' : 'var(--mute)') + '">' +
        (seen ? esc(l.name) : '？？？') + '</div>' +
      (seen ? '<div class="code" style="letter-spacing:0">' + esc(l.stage) + '</div>' : '') + '</div>' +
      /* 霧遮的是「那一層是什麼」，不是「誰在那裡」——
         已經在下面的組看得到，那是這張圖唯一會催人的東西。 */
      '<div class="field">' +
        (seen ? '' : '<div class="fog">下面還沒開</div>') + guys +
        (seen ? '<div class="boss"><img src="' + pxSvg(b.px, b.hue, !here) + '" alt=""></div>' : '') +
      '</div></div>';
  }).join('');
  return '<div class="map">' + body + '</div>';
}

PAGES.map = function () {
  var t = myTeam();
  var opened = where('Passes', function (p) { return p.teamId === t.teamId; }).length;
  return head('MAP', '迷霧地圖',
    '這張圖只有一條軸：深度。') +
    '<div class="card sunk"><div class="fine">' +
      '頂上是 ' + opened + ' / ' + RULES.LAYERS + ' 層，不是任務數——' +
      '任務沒有固定總量，他隨時可以再開，所以那個數字不是進度。<br>' +
      '層裡面不鋪格子：任務沒有順序，鋪成一排等於系統在替你們排先做哪一項。' +
      '下面還沒開的那幾層看不到是什麼，但看得到誰已經在那裡。<br>' +
      '留下的只有小人（你們在哪一層）與霧（下面還沒開）。<br>' +
      esc(RULES.GATE) +
    '</div></div>' +
    mapBands(false);
};

/* ================= 結局 ================= */

PAGES.end = function () {
  var t = myTeam();
  if (!t.finished) {
    return head('？？？', '？？？',
      '四層都放行之後才亮。') +
      '<div class="card"><p class="lead">現在在 ' + esc(LAYERS[t.layer - 1].name) +
      '，' + esc(RULES.GATE) + '</p></div>';
  }
  var f = finaleOf(t.teamId) || {};
  if (!f.opened) {
    return head('FINALE', '他讀完了。',
      f.teacherWord || '') +
      '<div class="card"><p class="lead">還在等他寫期末回顧的最後那段話。</p></div>';
  }
  return head('FINALE', '命名封存',
    '四層走完了。幫這一趟取一個名字留下來——下一個專案打開紀錄還看得到。') +
    '<div class="card layer" ' + layerVars(4) + '>' +
      '<div class="eyebrow">他最後寫的</div><p style="margin:0">' + nl(f.teacherWord || '') + '</p></div>' +
    (f.submitted
      ? '<div class="card"><div class="eyebrow">你們取的名字</div>' +
        '<div class="big plain">' + esc(f.lightName) + '</div></div>'
      : '<label>這一趟叫什麼</label><input type="text" id="light" placeholder="取一個名字">' +
        '<p><span class="btn" data-act="finale">封存</span></p>');
};

/* ================= 挑一件帶走 ================= */
/* 這是整個系統裡學生唯一一次做「選擇」的地方。

   三件一樣重、分數已經記上了，所以這個選擇不影響任何數字——它只決定
   你帶走哪一句話。挑那一句本身就是一次省思。

   反過來做（因為你重交了三次，所以發給你斷柄鑿）不可以：那一秒它就從
   一句話變成一個評價，而這個系統從頭到尾不評價任何人。 */

PAGES.pick = function () {
  var t = myTeam();
  var pk = pendingPick(t.teamId);
  if (!pk) return picked(t);
  var L = LAYERS[pk.layer - 1];
  var boss = PACK.bosses[pk.layer - 1];

  var cards = pk.offer.map(function (id) {
    var tr = troOf(id);
    return '<div class="card layer" style="flex:1;min-width:264px;margin:0;display:flex;' +
      'flex-direction:column;gap:11px">' +
      '<img src="' + pxSvg(tr.px, L.pal) + '" style="width:88px;height:88px;object-fit:contain">' +
      '<div class="n" style="font-size:22px;color:var(--Ll)">' + esc(tr.n) + '</div>' +
      '<p style="margin:0;font-size:22px;line-height:1.8">「' + esc(tr.w) + '」</p>' +
      '<div class="fine" style="flex:1">' + esc(tr.l) + '</div>' +
      '<span class="btn wide" data-act="pick" data-p=\'{"pick":"' + pk.pickId +
        '","id":"' + id + '"}\'>帶走這一件</span>' +
    '</div>';
  }).join('');

  return '<div ' + layerVars(pk.layer) + '>' +
    head(L.code + ' · ' + esc(L.name), esc(L.boss.name) + '退開了。', L.boss.beat) +

    '<div class="row" style="margin:22px 0">' +
      '<div class="mob" style="flex:1">' + mobImg({ px: boss.px, pal: boss.hue }) +
        '<div><div class="eyebrow">牠最後說的</div>' +
        '<div class="n">「' + esc(L.boss.line) + '」</div>' +
        '<div class="t">' + esc(L.tool.why) + '</div></div></div>' +
      '<div class="card layer" style="flex:1;margin:0;display:flex;gap:22px;align-items:center">' +
        '<img src="' + pxSvg(L.tool.px, L.pal) + '" style="width:66px;height:66px;object-fit:contain">' +
        '<div><div class="eyebrow">他放行給的道具</div>' +
        '<div style="font-size:22px;color:var(--Ll)">' + esc(L.tool.name) + '</div>' +
        '<div class="fine">' + esc(L.tool.rec) + '</div></div>' +
      '</div>' +
    '</div>' +

    '<h2>挑一件帶走</h2>' +
    '<p class="lead">' + esc(RULES.PICK_SAY) + '</p>' +
    '<div class="row">' + cards + '</div>' +
    '<p class="fine">挑完就進圖鑑，換組換班換專案都跟著你走。' +
      '沒挑走的那兩件還留在這一層——下一個專案再下來，關底還是有東西。</p>' +
    '</div>';
};

/* 挑完之後 */
function picked(t) {
  var last = where('Picks', function (p) { return p.teamId === t.teamId && p.chosen; }).pop();
  if (!last) {
    return head('PICK', '現在沒有可以挑的。',
      '每放行一層，層底那一隻會留下 ' + RULES.OFFER + ' 件，那時候再回來挑。');
  }
  var tr = troOf(last.chosen), L = LAYERS[last.layer - 1];
  return '<div ' + layerVars(last.layer) + '>' +
    head(L.code + ' · ' + esc(L.name), '你們帶走了 ' + esc(tr.n) + '。', '') +
    '<div class="card layer" style="display:flex;gap:22px;align-items:center;flex-wrap:wrap">' +
      '<img src="' + pxSvg(tr.px, L.pal) + '" style="width:110px;height:110px;object-fit:contain">' +
      '<div style="flex:1;min-width:264px">' +
        '<p style="margin:0 0 11px;font-size:33px;line-height:1.6">「' + esc(tr.w) + '」</p>' +
        '<div class="fine">' + esc(tr.l) + '</div></div>' +
    '</div>' +
    '<p><a class="plain" data-go="dex">去圖鑑看 →</a></p></div>';
}

/* ================= 這一趟的剖面 ================= */
/* 深度對時間。系統手上本來就有這些時間戳，一個都不必碰作業內容。 */

PAGES.curve = function () {
  return head('SECTION', '這一趟的剖面', '往下挖了多深，花了多久。') +
    '<p class="lead">' + esc(RULES.CURVE_SAY) + '</p>' +
    curveReport(myTeam().teamId, '你們');
};

/* 圖 ＋ 數字 ＋ 每一項。學生看自己那一組，老師看他選的那一組，同一份。 */
function curveReport(teamId, you) {
  var t = teamOf(teamId);
  var tl = timelineOf(teamId);
  var s = tl.stats;
  var d1 = function (x) { return x == null ? '—' : (Math.round(x * 10) / 10); };

  return curveSvg(tl) +

    '<h2>' + esc(you) + '的節奏</h2>' +
    '<p class="fine">下面每一個數字都是從時間戳算出來的描述——沒有一個是評價，' +
      '也沒有一個進成績。</p>' +
    '<div class="row">' +
      sumCard('開啟到第一次交', d1(s.toFirst) + ' 天',
        '他開出來那一天算起，到' + you + '第一次按送出。' + s.n + ' 項的平均。') +
      sumCard('一項走幾輪', d1(s.rounds) + ' 輪',
        s.multi ? s.n + ' 項裡有 ' + s.multi + ' 項走了不只一輪。退回不扣分，' +
          '走幾輪只是說明這一項來回過幾次。' : '目前每一項都是一輪。') +
      sumCard('等他判', d1(s.wait) + ' 天',
        you + '按下送出到他寫下判斷之間。裁決時間不可預測，這個數字只是已經發生的事。') +
    '</div>' +
    '<div class="row">' +
      sumCard('交的時候離期限', d1(s.slack) + ' 天',
        (s.late ? '有 ' + s.late + ' 項是逾期交的（逾期只標示，不扣分）。' : '') +
        (s.tight ? '有 ' + s.tight + ' 項是在期限前不到一天交的。' : '') +
        (!s.late && !s.tight ? '目前都在期限前一天以上交出去。' : '')) +
      sumCard('這一層停留', RULES.stayDays(t.enteredAt, now()) + ' 天',
        '從進到' + esc(LAYERS[t.layer - 1].name) + '那一刻起算。') +
      sumCard('他對這一組寫過', stackOf2(teamId) + ' 件',
        '判一件寫一段。' + you + '在結算頁一字不改讀到那一段，而且它會留在' + you +
        '手上那一疊裡（那一疊是跟著人走的，會比這個數字多）。') +
    '</div>' +

    '<h2>每一項各自的樣子</h2>' +
    tl.items.map(function (i) {
      var L = LAYERS[i.layer - 1];
      return '<div class="item flat" ' + layerVars(i.layer) + '>' +
        '<div class="body"><div class="t">' + esc(L.code) + '　' + esc(i.task.title) + '</div>' +
        '<div style="margin-top:11px;display:flex;gap:5px;flex-wrap:wrap">' +
          '<span class="pill">開啟到交 ' + (i.toFirst == null ? '還沒交' : d1(i.toFirst) + ' 天') + '</span>' +
          '<span class="pill' + (i.rounds > 1 ? ' gold' : '') + '">' +
            (i.rounds ? '來回 ' + i.rounds + ' 輪' : '還沒送過') + '</span>' +
          (i.wait != null ? '<span class="pill">等他 ' + d1(i.wait) + ' 天</span>' : '') +
          (i.slack != null ? '<span class="pill' + (i.slack < 0 ? ' over' : '') + '">' +
            (i.slack < 0 ? '逾期 ' + d1(-i.slack) + ' 天交' : '期限前 ' + d1(i.slack) + ' 天交') +
            '</span>' : '<span class="pill">期限不設限</span>') +
        '</div></div></div>';
    }).join('');
}

/* 這一組收到過幾段字。跟 stackOf 不同：那一支是「一個人」的，這一支是「一組」的。 */
function stackOf2(teamId) {
  return where('Reviews', function (r) { return r.teamId === teamId; }).length +
    where('Passes', function (p) { return p.teamId === teamId; }).length;
}

/* 剖面圖。X 是天，Y 是深度——世界觀本來就是這張圖。 */
function curveSvg(tl) {
  var W = 720, padL = 66, padR = 22, top = 33, rowH = 55, bot = 44;
  var H = top + LAYERS.length * rowH + bot;
  var span = Math.max(1, tl.t1 - tl.t0);
  var x = function (ts) { return padL + (ts - tl.t0) / span * (W - padL - padR); };
  var y = function (L) { return top + (L - 0.5) * rowH; };
  var day = function (ts) { return Math.round((ts - tl.t0) / 86400000); };

  var o = ['<svg viewBox="0 0 ' + W + ' ' + H + '" class="curve" xmlns="http://www.w3.org/2000/svg">'];

  /* 四層的底線與標籤 */
  LAYERS.forEach(function (l) {
    var yy = y(l.n);
    o.push('<line x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy +
      '" stroke="#2E2822" stroke-width="1"/>');
    o.push('<text x="6" y="' + (yy - 6) + '" fill="#63594C" font-size="11">' + l.code + '</text>');
    o.push('<text x="6" y="' + (yy + 8) + '" fill="' + l.pal['#'] + '" font-size="11">' +
      l.name + '</text>');
  });

  /* 每七天一條刻度 */
  for (var d = 0; d * 86400000 <= span; d += 7) {
    var xx = x(tl.t0 + d * 86400000);
    o.push('<line x1="' + xx + '" y1="' + top + '" x2="' + xx + '" y2="' + (H - bot) +
      '" stroke="#1A1611" stroke-width="1"/>');
    o.push('<text x="' + xx + '" y="' + (H - bot + 16) + '" fill="#63594C" font-size="11" ' +
      'text-anchor="middle">第 ' + d + ' 天</text>');
  }

  /* 深度對時間：一條往下走的階梯 */
  var pts = [];
  tl.bands.forEach(function (b) {
    pts.push([x(b.from), y(b.layer)]);
    pts.push([x(b.to), y(b.layer)]);
  });
  if (pts.length) {
    o.push('<polyline fill="none" stroke="#E9B341" stroke-width="2" points="' +
      pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>');
  }

  /* 每一項的事件：開啟 → 送出 → 判 */
  tl.items.forEach(function (i) {
    var yy = y(i.layer), pal = LAYERS[i.layer - 1].pal;
    o.push('<line x1="' + x(i.opened) + '" y1="' + (yy - 9) + '" x2="' + x(i.opened) +
      '" y2="' + (yy + 9) + '" stroke="' + pal.o + '" stroke-width="1"/>');
    if (i.task.due) {
      o.push('<line x1="' + x(i.task.due) + '" y1="' + (yy - 13) + '" x2="' + x(i.task.due) +
        '" y2="' + (yy + 13) + '" stroke="#4A3F2A" stroke-width="1" stroke-dasharray="2 3"/>');
    }
    i.subs.forEach(function (sb) {
      o.push('<circle cx="' + x(sb.ts) + '" cy="' + yy + '" r="3.5" fill="' + pal['#'] + '"/>');
    });
    i.revs.forEach(function (rv) {
      if (rv.result === 'ok') {
        o.push('<circle cx="' + x(rv.ts) + '" cy="' + yy + '" r="5" fill="none" stroke="#7CC98F" ' +
          'stroke-width="2"/>');
      } else {
        o.push('<path d="M' + (x(rv.ts) - 4) + ' ' + (yy - 4) + ' l8 8 M' + (x(rv.ts) + 4) + ' ' +
          (yy - 4) + ' l-8 8" stroke="#D9603F" stroke-width="2"/>');
      }
    });
  });

  /* 現在 */
  o.push('<line x1="' + x(tl.t1) + '" y1="' + top + '" x2="' + x(tl.t1) + '" y2="' + (H - bot) +
    '" stroke="#E9B341" stroke-width="1" stroke-dasharray="3 3"/>');
  o.push('<text x="' + (x(tl.t1) - 4) + '" y="' + (top - 8) + '" fill="#E9B341" font-size="11" ' +
    'text-anchor="end">今天 · 第 ' + day(tl.t1) + ' 天</text>');
  o.push('</svg>');

  return '<div class="curvebox">' + o.join('') + '</div>' +
    '<div class="fine" style="margin-top:11px">' +
    '直線刻痕 ＝ 他開出這一項　·　實心點 ＝ 你們按了送出　·　' +
    '<span style="color:var(--ok)">綠圈</span> ＝ 他判過　·　' +
    '<span style="color:var(--over)">紅叉</span> ＝ 他要你們補　·　虛線 ＝ 期限　·　' +
    '金線 ＝ 你們的深度。往下的那一階，每一階都是他放行的那一天。</div>';
}

/* ================= 他寫過的那一疊 ================= */

PAGES.stack = function () {
  var list = stackOf(S.who);
  var pick = S.p.k || 'all';
  var KINDS = [
    ['all', '全部'], ['ok', '判過的'], ['back', '要你們補的'], ['pass', '放行']
  ];
  var tabs = KINDS.map(function (k) {
    return '<button class="' + (pick === k[0] ? 'on' : '') + '" data-go="stack" data-p=\'{"k":"' +
      k[0] + '"}\'>' + esc(k[1]) + '</button>';
  }).join('');

  var shown = list.filter(function (r) {
    if (pick === 'all') return true;
    if (pick === 'ok') return r.kind === 'ok' || r.kind === 'redig-ok';
    if (pick === 'back') return r.kind === 'back' || r.kind === 'redig-no';
    return r.kind === 'pass';
  });

  var TAG = {
    ok: ['pill ok', '他判過了'], back: ['pill over', '他要你們補'],
    'redig-ok': ['pill ok', '回頭補強 · 他接受'], 'redig-no': ['pill over', '回頭補強 · 他沒接受'],
    pass: ['pill gold', '放行']
  };

  var body = shown.map(function (r) {
    var L = LAYERS[r.layer - 1];
    var tag = TAG[r.kind];
    var days = Math.max(0, Math.round((now() - r.ts) / 86400000));
    return '<div class="card layer" ' + layerVars(r.layer) + '>' +
      '<div style="display:flex;gap:11px;align-items:baseline;flex-wrap:wrap;margin-bottom:11px">' +
        '<span class="' + tag[0] + '">' + esc(tag[1]) + '</span>' +
        '<span class="pill">' + esc(L.code) + ' ' + esc(L.name) + '</span>' +
        (r.gave != null && r.kind === 'ok'
          ? '<span class="pill">他給「' + esc(RULES.gaveAnchor(r.gave)) + '」</span>' : '') +
        (r.mine ? '' : '<span class="pill">上一個專案</span>') +
        '<span class="sp" style="flex:1"></span>' +
        '<span class="fine">' + days + ' 天前</span>' +
      '</div>' +
      '<div style="font-size:22px;color:var(--Ll);margin-bottom:5px">' + esc(r.title) + '</div>' +
      (r.cond ? '<div class="fine" style="margin-bottom:11px">通過條件　' + esc(r.cond) + '</div>' : '') +
      '<p style="margin:0;font-size:22px;line-height:1.9">' + nl(r.text) + '</p>' +
      (r.taskId && r.mine
        ? '<p style="margin:11px 0 0"><a class="plain" style="font-size:11px" data-go="task" ' +
          'data-p=\'{"id":"' + r.taskId + '"}\'>去看這一項 →</a></p>' : '') +
    '</div>';
  }).join('');

  return head('RATIONALE', '他寫過的　' + list.length + ' 件',
    '') +
    '<p class="lead">' + esc(RULES.STACK_SAY) + '</p>' +
    '<p class="fine">這一疊跟圖鑑一樣是你的——換組、換班、換專案都跟著你走。' +
      '要補的那幾件也留著：「為什麼還不到」跟「為什麼算合格」一樣有用。</p>' +
    '<div class="seg" style="margin:22px 0">' + tabs + '</div>' +
    (body || '<div class="card"><p class="lead">這一格還沒有東西。</p></div>');
};

/* ---------- 學生的動作 ---------- */

ACTS.pick = function (p) { actPick(p.pick, p.id); render(); };
ACTS.check = function (p) { keepDraft(); actCheck(myTeam().teamId, S.p.id, p.i); render(); };
ACTS.effort = function (p) { keepDraft(); actEffort(myTeam().teamId, S.p.id, p.v); render(); };
ACTS.blocker = function () {
  actExtra(myTeam().teamId, S.p.id, val('#extra'));
  actBlocker(myTeam().teamId, S.p.id, val('#blocker'));
  render();
};
ACTS.submit = function () {
  var tid = myTeam().teamId;
  actExtra(tid, S.p.id, val('#extra'));
  actBlocker(tid, S.p.id, val('#blocker'));
  var r = actSubmit(tid, S.p.id);
  S.flash = r.err || null;
  render();
};
ACTS.redig = function (p) {
  var v = val('#redig');
  if (!v.trim()) { S.flash = '寫一句你們回頭補了什麼。'; render(); return; }
  var r = actRedig(myTeam().teamId, p.id, v);
  S.flash = r.err || null;
  render();
};
ACTS.finale = function () {
  var v = val('#light');
  if (!v.trim()) return;
  actFinale(myTeam().teamId, { lightName: v, submitted: true });
  render();
};
