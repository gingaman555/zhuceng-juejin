/* 學生端。

   一頁只給一個動作。首頁就是廊道本身——招牌、角色、迷霧、魔物，
   底下一顆巨大的推進鍵。其餘都是資訊，不是選項。

   零輸入框：天數用滑桿，風險與卡關用圖示標籤。要打字的東西沒有人會寫，
   而且打字會把防衛心叫起來。 */

/* ---------- 廊道（首頁） ---------- */
PAGES.home = function () {
  var t = myTeam();
  var next = nextThing(t.teamId);
  var st = stallOf(t.teamId);
  var acc = accuracyOf(t.teamId);

  var H = [];

  /* ── 你在第幾步 ── */
  H.push(stepBar([
    ['接任務', '你決定花幾天'],
    ['每天推進', '動過就按一下'],
    ['交出去', '比對你承諾的天數'],
    ['挑裝備', '三選一，你自己挑']
  ], STEP_AT[next.kind] == null ? -1 : STEP_AT[next.kind]));

  /* ── 廊道本身。招牌、深度、魔物全在裡面（見 61-scene.js） ── */
  H.push(scene(t, next.row, st));
  H.push(sceneCap(t, next, st));

  /* ── 唯一的動作 ── */
  H.push(actionCard(t, next, st));

  /* ── 我的預估體感 ── */
  if (acc.total) {
    H.push('<div class="card">');
    H.push('<div class="eyebrow">你對自己的預估</div>');
    H.push('<div class="acc">');
    ['exact', 'early', 'late'].forEach(function (k) {
      var s = RULES.STAMPS[k];
      H.push('<div class="acc-c"><b>' + s.mark + '</b><i>' + acc[k] + '</i><span>' + s.name + '</span></div>');
    });
    H.push('</div>');
    H.push('<p class="dim">' + esc(accSay(acc)) + '</p>');
    H.push('</div>');
  }

  /* ── 帶在身上的那一句 ── */
  var carry = carriedGear(t.teamId);
  if (carry) {
    H.push('<div class="card carry">');
    H.push('<div class="eyebrow">你帶在身上的</div>');
    H.push('<div class="carry-in"><b>' + carry.icon + '</b><div><i>' +
      esc(carry.name) + '</i><em>' + esc(carry.why) + '</em></div></div>');
    H.push(btn('看裝備架', 'go:pack', 'ghost'));
    H.push('</div>');
  }

  /* ── 招牌 ── */
  var ns = nextSignIn(t.teamId);
  H.push('<div class="card">');
  H.push('<div class="eyebrow">廊道入口的招牌</div>');
  H.push('<p class="dim">上面寫什麼是你們的事，老師不替你們命名。' +
         '材質不是——那個是走出來的' +
         (ns.need ? '，再走完 ' + ns.need + ' 個里程碑會換成「' + esc(ns.name) + '」' : '') + '。</p>');
  H.push('<div class="rn-row">');
  H.push('<input id="pj-name" value="' + esc(t.project || '') +
         '" placeholder="' + esc('這個專案現在叫什麼') + '">');
  H.push(btn('換字', 'rename', 'ghost'));
  H.push('</div></div>');

  return H.join('');
};

/* nextThing 回的那個字，對到步驟條的第幾格。 */
var STEP_AT = {
  commit: 0,
  push: 1, waiting: 1, wake: 1,
  submit: 2, camp: 2, review: 2,
  gear: 3
};

/* 準度的一句話。從數字組出來，不是寫死的。 */
function accSay(a) {
  if (!a.total) return '';
  if (a.late === 0 && a.total >= 2) return '你到目前為止沒有失準過。這比做得快更難。';
  if (a.late > a.exact) return '多數時候你把事情想得比實際簡單。下一次試著往上加幾天。';
  if (a.early > a.exact) return '你常常比自己承諾的早完成——可能是把事情想得太難了。';
  return '準的次數最多。你的時間體感正在成形。';
}

/* ---------- 場景底下那一行 ----------
   走廊自己不寫字（寫了就變回圖表）。要講的數字放在它底下。 */
function sceneCap(t, next, st) {
  var row = next.row;
  if (!row || !row.run || !row.run.runId) {
    return '<p class="scn-cap">走廊還是暗的。老師派了里程碑，先決定你要花幾天，' +
           '火把才點得起來。</p>';
  }
  var run = row.run;
  var open = run.state === 'running' ? openDays(t.teamId, run.runId) : [];
  return '<p class="scn-cap">你自己承諾 <b>' + run.est + '</b> 天，已經來過 <b>' +
    run.pushes + '</b> 天。' +
    (st.level ? '　·　' + esc(RULES.stallSay(st.level, st.days)) : '') +
    (open.length ? '　·　' + open.map(function (o) { return o.label; }).join('、') +
      '那一盞還沒點' : '') + '</p>';
}

/* 哪一組遇到哪一隻：任務 ＋ 組算出來，全班同一個里程碑不是同一隻 */
function mobFor(msId, teamId) {
  return MOBS[hash(msId + '|' + teamId) % MOBS.length];
}

/* ---------- 唯一的那一顆動作 ---------- */
function actionCard(t, next, st) {
  var H = ['<div class="act-card">'];
  var row = next.row;

  if (next.kind === 'wake') {
    H.push('<div class="eyebrow">' + esc(WORLD.light[st.level].label) + '</div>');
    H.push('<h2>' + esc(RULES.stallSay(st.level, st.days)) + '</h2>');
    H.push('<p class="dim">這裡只是把「停下來了」畫出來，沒有別的後果——' +
           '沒有扣任何東西，也沒有人被通知。點一個下面的圖示，火就回來了。</p>');
    H.push(doingRow(row.run.runId));

  } else if (next.kind === 'commit') {
    H.push('<div class="eyebrow">新的里程碑</div>');
    H.push('<h2>' + esc(row.ms.title) + '</h2>');
    if (row.ms.note) H.push('<p class="dim">' + nl(row.ms.note) + '</p>');
    H.push('<p class="lead">你打算花幾天？這是你對自己的承諾，老師不會替你決定。</p>');
    H.push(btn('決定天數', 'go:commit:' + row.ms.msId, 'big'));

  } else if (next.kind === 'push') {
    H.push(doingCard(t, row, '今天'));

  } else if (next.kind === 'submit') {
    H.push('<div class="eyebrow">走到終點了</div>');
    H.push('<h2>' + esc(row.ms.title) + '</h2>');
    H.push('<p class="dim">把作業交到老師原本收的地方，然後在這裡按一下。' +
           '系統會比對你當初承諾的天數。</p>');
    H.push(btn('我交出去了', 'go:submit:' + row.run.runId, 'big'));

  } else if (next.kind === 'camp') {
    H.push('<div class="eyebrow">營火</div>');
    H.push('<h2>比你承諾的久。</h2>');
    H.push('<p class="dim">先坐下來。說出卡在哪不會扣任何東西——' +
           '講得清楚的困難，老師才幫得上忙。</p>');
    H.push(btn('去營火旁', 'go:camp:' + row.run.runId, 'big'));

  } else if (next.kind === 'gear') {
    H.push('<div class="eyebrow">老師看完了</div>');
    H.push('<h2>挑一件帶走。</h2>');
    if (row.run.word) H.push('<p class="quote">' + nl(row.run.word) + '</p>');
    H.push('<p class="dim">會攤開三件。挑哪一件是你的事——' +
           '那句話是給你自己讀的。</p>');
    H.push(btn('去挑', 'gear:' + row.run.runId, 'big'));

  } else if (next.kind === 'waiting') {
    var open2 = openDays(t.teamId, row.run.runId);
    H.push('<div class="eyebrow">今天那一盞點好了</div>');
    H.push('<h2>' + (open2.length ? '還有沒點的那幾盞。' : '明天再來一次。') + '</h2>');
    H.push('<p class="dim">一天一盞。這是每天的紀錄，不是工作的單位——' +
           '真的做完了是你說了算，隨時交得出去。</p>');
    if (open2.length) H.push(backRow(open2));
    if (DRAFT.back) H.push(doingRow(row.run.runId));
    H.push(btn('提早做完了，現在就交', 'go:submit:' + row.run.runId, 'ghost'));

  } else if (next.kind === 'review') {
    H.push('<div class="eyebrow">在老師那邊</div>');
    H.push('<h2>他還沒看。</h2>');
    H.push('<p class="dim">他看的順序是照等最久的排，不是先交先看。</p>');

  } else {
    H.push('<div class="eyebrow">廊道很安靜</div>');
    H.push('<h2>目前沒有等你做的。</h2>');
    H.push('<p class="dim">老師隨時可能派新的里程碑。</p>');
  }

  H.push('</div>');
  return H.join('');
}

/* ---------- 今天動的是哪一塊 ----------

   這一排就是推進鍵本身。點任何一個都算今天來過了，所以還是一下點擊——
   跟原本那一顆「推進」一樣，只是那一下開始帶意義：走廊上會留下這個圖示。

   刻意沒有「什麼都沒做」那一格。這一排問的是動了什麼，
   沒動的人本來就不會來按——給他一個按鈕承認自己沒動，那是罰站。 */
function doingRow(runId) {
  var H = ['<div class="tags big doing-row">'];
  RULES.DOING.forEach(function (d) {
    H.push('<button class="tag" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'push:' + runId + '|' + d.key })) + '\'>' +
      '<b>' + d.icon + '</b><i>' + esc(d.label) + '</i><em>' + esc(d.hint) + '</em></button>');
  });
  H.push('</div>');
  return H.join('');
}

/* 補登。忘了按的那幾天列在這裡——忘一天就再也補不回來的話，
   人會把整條走廊一起放掉。 */
function backRow(open) {
  var H = ['<div class="tags"><span class="k">忘了按？</span>'];
  open.forEach(function (o) {
    H.push('<button class="tag' + (Number(DRAFT.back) === o.back ? ' on' : '') +
      '" data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'back:' + o.back })) +
      '\'>' + esc(o.label) + '有動</button>');
  });
  if (DRAFT.back) {
    H.push('<button class="tag" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'back:0' })) + '\'>算了</button>');
  }
  H.push('</div>');
  return H.join('');
}

/* 推進那一整張卡 */
function doingCard(t, row, whenWord) {
  var open = openDays(t.teamId, row.run.runId);
  var b = Number(DRAFT.back || 0);
  var word = b ? (b === 1 ? '昨天' : '前天') : whenWord;
  var H = [];
  H.push('<div class="eyebrow">' + esc(word) + '　·　' + esc(row.ms.title) + '</div>');
  H.push('<h2>' + esc(word) + '動的是哪一塊？</h2>');
  H.push('<p class="dim">點一個就算來過了——那一下就是推進，不用再按第二顆。' +
         '走廊上會留下這個圖示，七天之後回頭看得出你這一趟長什麼樣。</p>');
  H.push(doingRow(row.run.runId));
  if (open.length) H.push(backRow(open));
  H.push(btn('提早做完了，現在就交', 'go:submit:' + row.run.runId, 'ghost'));
  return H.join('');
}

/* 這一趟每天做的事，湊出來的一句話。不是評語，是給下一次估天數用的線索。 */
function doingSay(n, total) {
  var think = (n.look || 0) + (n.plan || 0);
  var hands = (n.make || 0) + (n.redo || 0);
  if (!total) return '';
  if ((n.redo || 0) * 2 >= total) {
    return '大半的日子在改。改很難估——下一次留一段時間專門給它，不要算在做的那幾天裡。';
  }
  if (think > hands) {
    return '查跟想佔掉大半。那幾天是真的在做事，只是估天數的時候最容易被漏掉。';
  }
  if ((n.talk || 0) >= 2) {
    return '有好幾天在跟人談。約人這件事排不進自己的行事曆——下一次先把它算進去。';
  }
  return '大半的日子真的動到手上的東西。你的時間大致花在你以為的地方。';
}

/* ---------- 承諾：滑桿 ＋ 風險標籤 ---------- */
PAGES.commit = function () {
  var t = myTeam();
  var m = msOf(S.p.id);
  if (!m) return '<div class="card">找不到這一個里程碑。</div>';
  var est = Number(draft('est', RULES.EST_DEFAULT));
  var risks = DRAFT.risks || [];

  var H = [head('自我承諾', m.title, m.note)];

  /* 上一次自己挑走的那一句。這是裝備唯一的用途，而且是真的有用：
     它不是系統的建議，是他上一次寫給這一刻的自己看的。 */
  var carry = carriedGear(t.teamId);
  if (carry) {
    H.push('<div class="card carry">');
    H.push('<div class="eyebrow">你上一次挑走的那一句</div>');
    H.push('<div class="carry-in"><b>' + carry.icon + '</b><div><i>' +
      esc(carry.name) + '</i><em>' + esc(carry.why) + '</em></div></div>');
    H.push('</div>');
  }

  H.push('<div class="card">');
  H.push('<div class="eyebrow">你打算花幾天</div>');
  H.push('<div class="slider-wrap">');
  H.push('<input type="range" class="slider" id="est" min="' + RULES.EST_MIN +
         '" max="' + RULES.EST_MAX + '" value="' + est +
         '" oninput="ACTS.est(this.value)">');
  H.push('<div class="slider-read"><b>' + est + '</b><span>天</span></div>');
  H.push('</div>');
  H.push('<p class="dim">這個數字是你自己說的。誤差 ' + RULES.band(est) +
         ' 天以內都算準——' + Math.round(RULES.BAND_RATIO * 100) + '％ 的容許範圍。</p>');
  H.push('</div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">你覺得會卡在哪　選填</div>');
  H.push('<p class="dim">先標起來。事後對照——標對了就是預見能力，那比準時更值錢。</p>');
  H.push('<div class="tags">');
  RULES.RISKS.forEach(function (r) {
    var on = risks.indexOf(r.key) >= 0;
    H.push('<button class="tag' + (on ? ' on' : '') + '" onclick="ACTS.risk(\'' + r.key + '\')">' +
           r.icon + ' ' + esc(r.label) + '</button>');
  });
  H.push('</div></div>');

  H.push('<div class="row">');
  H.push(btn('我承諾 ' + est + ' 天', 'commit:' + m.msId, 'big'));
  H.push(btn('回廊道', 'go:home', 'ghost'));
  H.push('</div>');
  return H.join('');
};

/* ---------- 上傳 ---------- */
PAGES.submit = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var t = myTeam();
  var m = msOf(r.msId);
  var used = Math.max(1, daysBetween(r.committedAt, now()));
  var s = RULES.judge(r.est, used);

  var H = [head('交出去', m.title, '')];

  /* 走到底了才看得清楚牠。前面那些天牠都在霧裡——
     這一段是世界觀，也是這一趟真的結束了的訊號。 */
  var mob = mobFor(r.msId, t.teamId);
  var zone = strataAt(depthOf(t.teamId));
  H.push('<div class="card fa ' + zone.key + '"><div class="fa-in">');
  H.push(pxTag(mob.px, zone.pal, 'fa-px'));
  H.push('<div><div class="eyebrow">' + esc(zone.name) + '　·　擋在你前面的</div>');
  H.push('<h2>' + esc(mob.n) + '</h2>');
  H.push('<p class="lead">' + esc(mob.t) + '</p>');
  H.push('</div></div></div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">你當初承諾</div>');
  H.push('<div class="big-num">' + r.est + ' <span>天</span></div>');
  H.push('<div class="eyebrow" style="margin-top:22px">實際花了</div>');
  H.push('<div class="big-num">' + used + ' <span>天</span></div>');
  H.push('<p class="dim">' + esc(RULES.judgeWhy(r.est, used)) + '</p>');
  H.push('</div>');
  H.push('<p class="lead">作業交到老師原本收的地方。這裡不收檔案，也看不到內容。</p>');
  H.push('<div class="row">');
  H.push(btn('確認交出去了', 'submit:' + r.runId, 'big'));
  H.push(btn('還沒', 'go:home', 'ghost'));
  H.push('</div>');
  return H.join('');
};

/* ---------- 判定結果 ---------- */
PAGES.stamp = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var m = msOf(r.msId), s = RULES.STAMPS[r.stamp];

  var H = ['<div class="stamp-card ' + r.stamp + '">'];
  H.push('<div class="stamp-mark">' + s.mark + '</div>');
  H.push('<h1>' + esc(s.name) + '</h1>');
  H.push('<p class="lead">' + esc(s.why) + '</p>');
  H.push('<div class="stamp-num"><b>' + r.est + '</b><span>承諾</span>' +
         '<b>' + r.actual + '</b><span>實際</span></div>');
  H.push('<p class="dim">' + esc(RULES.judgeWhy(r.est, r.actual)) + '</p>');
  H.push('</div>');

  if (r.stamp === 'late') {
    H.push(btn('去營火旁說一下', 'go:camp:' + r.runId, 'big'));
  } else {
    H.push(btn('好', 'skipcamp:' + r.runId, 'big'));
  }
  return H.join('');
};

/* ---------- 營火復盤 ---------- */
PAGES.camp = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var m = msOf(r.msId);
  var picked = DRAFT.snags || [];

  var H = ['<div class="camp">'];
  H.push(pxTag(CAMPFIRE.px, CAMPFIRE.pal, 'fire'));
  H.push('<div>');
  H.push('<div class="eyebrow">營火</div>');
  H.push('<h2>卡在哪？</h2>');
  H.push('<p class="dim">點就好，不用打字。這不會扣任何東西——' +
         '說得出卡在哪，本身就是一種專案能力。</p>');
  H.push('</div></div>');

  H.push('<div class="card"><div class="tags big">');
  RULES.SNAGS.forEach(function (g) {
    var on = picked.indexOf(g.key) >= 0;
    H.push('<button class="tag' + (on ? ' on' : '') + '" onclick="ACTS.snag(\'' + g.key + '\')">' +
           '<b>' + g.icon + '</b><i>' + esc(g.label) + '</i><em>' + esc(g.hint) + '</em></button>');
  });
  H.push('</div></div>');

  /* 這一趟每天做的。這是估不準的線索，不是評語。 */
  var ds = doingOfRun(r.runId);
  if (ds.length) {
    var n = {};
    ds.forEach(function (k) { n[k] = (n[k] || 0) + 1; });
    H.push('<div class="card">');
    H.push('<div class="eyebrow">這一趟你每天做的</div>');
    H.push('<div class="tags small">');
    RULES.DOING.forEach(function (d) {
      if (n[d.key]) H.push('<span class="tag static">' + d.icon + ' ' +
        esc(d.label) + ' × ' + n[d.key] + '</span>');
    });
    H.push('</div>');
    H.push('<p class="dim">' + esc(doingSay(n, ds.length)) + '</p>');
    H.push('</div>');
  }

  /* 當初標的風險有沒有中 */
  if (r.risks && r.risks.length) {
    var hit = r.risks.filter(function (k) { return picked.indexOf(k) >= 0; });
    H.push('<div class="card">');
    H.push('<div class="eyebrow">你當初標的風險</div>');
    H.push('<div class="tags">');
    r.risks.forEach(function (k) {
      var d = RULES.snagOf(k);
      if (d) H.push('<span class="tag static' + (picked.indexOf(k) >= 0 ? ' hit' : '') + '">' +
                    d.icon + ' ' + esc(d.label) + '</span>');
    });
    H.push('</div>');
    if (hit.length) H.push('<p class="ok">你預見到了。那比準時更值錢。</p>');
    H.push('</div>');
  }

  H.push(btn('說完了', 'reflect:' + r.runId, 'big'));
  return H.join('');
};

/* ---------- 三選一 ----------
   攤開的是哪三件，跟你這一次做得如何完全無關（見 offerGears）。
   它問的不是「你值得什麼」，是「這一次你想記住哪一句」。 */
PAGES.pick = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var m = msOf(r.msId);

  var H = [head('挑一件', m.title,
    '三件裡挑一件帶走。攤開哪三件是隨機的，跟你這一次做得如何沒有關係——' +
    '每一件底下那句話，是你自己選要記住的。')];

  if (r.word) {
    H.push('<div class="card"><div class="eyebrow">老師說</div>' +
           '<p class="quote">' + nl(r.word) + '</p></div>');
  }

  H.push('<div class="card"><div class="gear-pick">');
  offerGears(r.runId).forEach(function (g) {
    H.push('<button class="gcard" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'take:' + r.runId + '|' + g.key })) + '\'>' +
      '<b>' + g.icon + '</b><i>' + esc(g.name) + '</i><em>' + esc(g.why) + '</em></button>');
  });
  H.push('</div></div>');
  return H.join('');
};

/* ---------- 大躍進 ---------- */
PAGES.dash = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var g = RULES.gearOf(r.gear);
  var H = ['<div class="dash">'];
  H.push(pxTag(HERO.dash, HERO.pal, 'ch big'));
  H.push('<h1>' + (g ? g.icon + ' ' + esc(g.name) : '裝備') + ' 到手</h1>');
  if (g) H.push('<p class="lead">' + esc(g.why) + '</p>');
  if (r.word) H.push('<p class="quote">' + nl(r.word) + '</p>');
  H.push('<p class="dim">深度 ' + (depthOf(r.teamId) * WORLD.depthPerMilestone) + ' m。' +
    '　下一次決定要花幾天的時候，這句話會出現在那一頁。</p>');

  /* 跨進新的一區。這是整個系統裡少數幾個「世界自己變了」的時刻，
     而且它不是獎勵——是你走到那裡，石頭就不一樣了。 */
  var d = depthOf(r.teamId);
  var now2 = strataAt(d), was = strataAt(d - 1);
  if (d > 0 && now2.key !== was.key) {
    H.push('<div class="card fa ' + now2.key + ' zone-in">');
    H.push('<div class="eyebrow">石頭變了</div>');
    H.push('<h2>你進到' + esc(now2.name) + '了。</h2>');
    H.push('<p class="lead">' + esc(now2.note) + '</p>');
    H.push('<p class="dim">往下沒有盡頭，這座地下城沒有最底層。' +
           '這裡住的東西跟上面那一區不一樣——去全班地下城那張圖上點牠們看看。</p>');
    H.push('</div>');
  }
  H.push('</div>');
  H.push(btn('回廊道', 'go:home', 'big'));
  return H.join('');
};

/* 全班地下城搬到 62-eco.js——那是一整張 2.5D 剖面，值得自己一個檔。 */

/* ---------- 走過的每一段 ---------- */
PAGES.log = function () {
  var t = myTeam();
  var rows = runsFor(t.teamId).filter(function (x) { return x.run.stamp; }).reverse();
  var H = [head('紀錄', '走過的每一段', '你當初怎麼估、實際花多久、他說了什麼。')];
  if (!rows.length) return H.join('') + '<div class="card dim">還沒有走完的里程碑。</div>';

  rows.forEach(function (x) {
    var r = x.run, s = RULES.STAMPS[r.stamp];
    H.push('<div class="card log-row">');
    H.push('<div class="log-head"><b>' + esc(x.ms.title) + '</b>' +
           '<span class="st ' + r.stamp + '">' + s.mark + ' ' + esc(s.name) + '</span></div>');
    H.push('<div class="log-num">承諾 <b>' + r.est + '</b> 天　·　實際 <b>' + r.actual + '</b> 天</div>');
    var seq = doingOfRun(r.runId);
    if (seq.length) {
      H.push('<div class="seq">');
      seq.forEach(function (k) {
        var d = RULES.doingOf(k);
        H.push('<span title="' + esc(d ? d.label : '') + '">' + (d ? d.icon : '⛏️') + '</span>');
      });
      H.push('</div>');
    }
    if (r.snags && r.snags.length) {
      H.push('<div class="tags small">');
      r.snags.forEach(function (k) {
        var d = RULES.snagOf(k);
        if (d) H.push('<span class="tag static">' + d.icon + ' ' + esc(d.label) + '</span>');
      });
      H.push('</div>');
    }
    if (r.word) H.push('<p class="quote">' + nl(r.word) + '</p>');
    H.push('</div>');
  });
  return H.join('');
};
