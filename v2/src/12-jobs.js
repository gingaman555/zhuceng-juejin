/* 可以用水晶換的職業（龍與地下城式的職業）。

   2026-10-02：使用者要更有龍與地下城的職業感，像現有的冒險者、魔法師、忍者、
   騎士一樣——不關作品主軸，就是加深參與感。新增三個：遊俠、吟遊詩人、武僧，
   用水晶換（一個 RULES.CRYSTAL.job 顆，見 20-rules.js）。像素圖在
   12-jobs-art.js（產出的檔案，不要直接改）。

   ── 四條規矩 ──

   一 · 職業是身分，不是效果。不改判定、容差、水晶收入、榜，老師看到的也不讀它。
        換到的只有一張臉、一句脾氣、一組台詞。
   二 · 整組共用。水晶是整組的，所以換到的職業也是整組的：一位隊員換了，
        整組都能挑，每個人自己選。誰換的記在 t.jobs[職業].by。
   三 · 台詞不評價。跟現有四個一樣：講的是自己的脾氣，不講他做得怎麼樣、
        走得快不快、該不該加把勁。
   四 · 認得出來才算數。一個沒換到的職業，在挑角色那一頁是一團黑影加價錢。

   ── 資料怎麼存 ──

   t.jobs 是一個物件，{ 職業: { by, at } }——不是陣列。兩位隊員同時換不同的職業，
   同步時（41-sync.js 的 syncApply）一格一格併，兩個都留下來；陣列長度變了
   整個換，會掉一個。同時換的水晶不夠兩個的話，left 會是負的，畫面一律照 0 算
   （圖鑑的 t.lit 有同樣的問題）。

   ── 台詞 ──

   下面 JOB_SAY 是每個職業在每個時刻說的話。現有四個職業原本的走路、休息、
   超過天數那幾句留在 12-heroes.js 的 HERO_OS；這裡補的是新的時刻：
     start   剛出發（按下出發，頭上的牌子說）
     submit  剛交出去（結果那一頁）
     ok      老師收下了（首頁那張卡）
     codex   圖鑑多了一位（首頁那張卡）
     unlock  換到這個職業的那一刻（只有新職業）
   標「草稿，等你改」的是使用者沒填、我先寫的。 */

var JOB_SAY = {
  adv: {  /* 冒險者 */
    m: '接下來就又會是一場大冒險啦!!',
    start: ['走囉!開始冒險吧!'],
    submit: ['交出去啦!接下來等好消息!'],  /* 草稿，等你改 */
    ok: ['收下啦!又前進了一步!'],  /* 草稿，等你改 */
    codex: ['又認識一位新朋友!']  /* 草稿，等你改 */
  },
  mage: {  /* 魔法師 */
    m: '知識就是力量。',
    start: ['又是一場學術之旅。'],
    submit: ['報告已呈上，靜候回音。'],  /* 草稿，等你改 */
    ok: ['知識，又添了一頁。'],  /* 草稿，等你改 */
    codex: ['新的名字，記進筆記。']  /* 草稿，等你改 */
  },
  ninja: {  /* 忍者 */
    m: '忍忍!在下忍者是也!',
    start: ['開始任務吧!忍忍!'],
    submit: ['任務送達，是也!'],  /* 草稿，等你改 */
    ok: ['任務完成，是也!'],  /* 草稿，等你改 */
    codex: ['新情報入手，是也!']  /* 草稿，等你改 */
  },
  knight: {  /* 騎士 */
    m: '騎士的戒律使我偉大。',
    start: ['這是新的旅程。'],
    submit: ['呈交完畢，等待回覆。'],  /* 草稿，等你改 */
    ok: ['誓約，又完成一條。'],  /* 草稿，等你改 */
    codex: ['又一位，記入名冊。']  /* 草稿，等你改 */
  },
  ranger: {  /* 遊俠 */
    t: '眼觀八方，處理起任務冷靜又敏銳',
    m: '多難的任務都難不了我',
    walk: ['小心，有障礙!!', '看我的飛簷走壁!', '做任務最重要便是眼觀八方!'],
    rest: ['好好休息才能對突發事件更加應對。'],
    over: ['路比預想的長，我再看仔細一點。', '地形有變，換個角度再看看。'],  /* 草稿，等你改 */
    start: ['現在，開始行動。'],
    submit: ['目標送達，靜觀其變。'],  /* 草稿，等你改 */
    ok: ['命中。下一個目標。'],  /* 草稿，等你改 */
    codex: ['新的足跡，記下了。'],  /* 草稿，等你改 */
    unlock: ['從今天起，由我來探路。']  /* 草稿，等你改 */
  },
  bard: {  /* 吟遊詩人 */
    t: '我，很會唱歌喔~♪♪♪',
    m: '任務就~交給我吧~~♪♪♪',
    walk: ['在任務中，我無畏無懼♪♪♪', '那是~重重難關♪♪♪', '喔~這是場不得了的史詩♪♪♪'],
    rest: ['休息~是為了讓喉嚨更加高昂♪♪'],
    over: ['樂章還沒完~繼續演奏♪♪♪', '這一段比預想的長~再唱一段♪♪'],  /* 草稿，等你改 */
    start: ['開始吧~~♪♪♪'],
    submit: ['這一章，唱完了~♪♪♪'],  /* 草稿，等你改 */
    ok: ['掌聲響起~♪♪♪'],  /* 草稿，等你改 */
    codex: ['新角色登場~編進故事♪♪♪'],  /* 草稿，等你改 */
    unlock: ['各位~今天起由我伴奏♪♪♪']  /* 草稿，等你改 */
  },
  monk: {  /* 武僧 */
    t: '喝!!!!這些都難不了我!',
    m: '我的完成專案之魂正在熊熊燃燒!',
    walk: ['一!二!一!二!持續前進!', '一鼓作氣!衝啊!!!', '這也是修行的一部份!'],
    rest: ['好好休息也是修行的一環!'],
    over: ['還沒到終點，修行繼續!', '日子過了，腳步不停!'],  /* 草稿，等你改 */
    start: ['修行!!開始!!'],
    submit: ['放下了。靜待結果!'],  /* 草稿，等你改 */
    ok: ['這一關，過了!'],  /* 草稿，等你改 */
    codex: ['又遇見一位修行者!'],  /* 草稿，等你改 */
    unlock: ['修行的路，我陪你走!']  /* 草稿，等你改 */
  }

};

/* 三個新職業，順序就是挑角色那一頁的順序。 */
var JOB_LIST = [
  { k: 'ranger', n: '遊俠', t: JOB_SAY.ranger.t, m: JOB_SAY.ranger.m },
  { k: 'bard', n: '吟遊詩人', t: JOB_SAY.bard.t, m: JOB_SAY.bard.m },
  { k: 'monk', n: '武僧', t: JOB_SAY.monk.t, m: JOB_SAY.monk.m }
];

/* 把台詞接到 HERO_OS，把座右銘接到 HERO_LIST。 */
(function () {
  HERO_LIST.forEach(function (x) { if (JOB_SAY[x.k]) x.m = JOB_SAY[x.k].m; });
  Object.keys(JOB_SAY).forEach(function (k) {
    var s = JOB_SAY[k], box = HERO_OS[k] || (HERO_OS[k] = {});
    ['walk', 'rest', 'over', 'start', 'submit', 'ok', 'codex', 'unlock'].forEach(function (f) {
      if (s[f] && s[f].length) box[f] = s[f];
    });
  });
})();

/* 一個職業的名字、脾氣、座右銘（免費的四個與要換的三個都找得到）。 */
function heroMeta(k) {
  var m = null;
  HERO_LIST.concat(JOB_LIST).forEach(function (x) { if (x.k === k) m = x; });
  return m;
}
function isJob(k) {
  return JOB_LIST.some(function (x) { return x.k === k; });
}
/* 這一組換到了哪幾個（照 JOB_LIST 的順序）。 */
function jobsOf(teamId) {
  var t = teamId ? teamOf(teamId) : null;
  if (!t || !t.jobs || typeof t.jobs !== 'object') return [];
  return JOB_LIST.filter(function (x) { return t.jobs[x.k]; }).map(function (x) { return x.k; });
}
/* 這個人現在挑得了這個職業嗎。免費的一律可以；要換的，要這一組已經換到。 */
function jobOpen(u, k) {
  if (!isJob(k)) return true;
  return !!(u && u.teamId && jobsOf(u.teamId).indexOf(k) >= 0);
}

/* ---------- 換一個職業 ----------

   擋五件事：不是自己組的、沒有這個職業、這一組已經換到了、水晶不夠。
   換到之後整組都挑得了；用掉的水晶算在整組身上（見 40-db.js 的 crystalOf）。 */
function actUnlockJob(teamId, key) {
  var t = teamOf(teamId);
  if (!t) return { err: '找不到這一組。' };
  var who = (typeof S !== 'undefined' && S.who) ? userOf(S.who) : null;
  if (who && who.teamId !== teamId) return { err: '那不是你們這一組。' };
  if (!isJob(key)) return { err: '沒有這個職業。' };
  if (jobsOf(teamId).indexOf(key) >= 0) return { err: '已經換到了。' };
  var o = crystalOf(teamId);
  if (o.left < RULES.CRYSTAL.job) {
    return { err: '水晶不夠。還差 ' + (RULES.CRYSTAL.job - Math.max(0, o.left)) + ' 顆。' };
  }
  var next = {}, k;
  if (t.jobs && typeof t.jobs === 'object') for (k in t.jobs) next[k] = t.jobs[k];
  next[key] = { by: who ? who.userId : '', at: now() };
  t.jobs = next;
  save();
  logEvent('jobunlock', { teamId: teamId, job: key, cost: RULES.CRYSTAL.job });
  return { job: key };
}

/* ---------- 說話的時刻 ---------- */

/* 這個人的職業，在這個時刻會說哪一句。沒有就是沉默（回空字串）。
   跟 heroLine 不同：這裡不退回走路的台詞——「老師收下了」的時候講「又是沒看過的新風景」會很怪。 */
function heroMoment(u, mode) {
  var box = HERO_OS[heroKey(u)] || {};
  var a = box[mode] || [];
  return a.length ? a[Math.floor(Math.random() * a.length)] : '';
}
/* 一張小對話：他的臉＋一句話。 */
function hsayHtml(u, mode) {
  var line = heroMoment(u, mode);
  if (!line) return '';
  var g = heroOf(u);
  return '<div class="hsay">' + pxTag(g.idleA, g.pal, 'hsay-px') +
    '<p class="hsay-t">' + esc(line) + '</p></div>';
}
/* 借廊道上角色頭上那塊牌子說一句（說完換回原本的字）。出發那一下用。 */
function heroTagSay(u, mode, ms) {
  if (typeof document === 'undefined' || !document.querySelector) return;
  var line = heroMoment(u, mode);
  if (!line) return;
  var tag = document.querySelector('.scn .scn-hero .hero-tag');
  if (!tag) return;
  var back = tag.textContent, kls = tag.className;
  tag.textContent = line;
  tag.className = kls + ' os';
  setTimeout(function () {
    var t2 = document.querySelector('.scn .scn-hero .hero-tag');
    if (t2 && t2.textContent === line) { t2.textContent = back; t2.className = kls; }
  }, ms || 2600);
}

/* ---------- 挑角色那一頁：用水晶換的職業 ----------

   只在「已經挑過角色」之後才畫（見 20-rules.js 的 RULES.CRYSTAL.job）。
   換到的跟免費的一樣可以點；沒換到的是黑影加價錢，水晶夠才有那一顆鍵，
   按下去先問一次（花的是整組的水晶）。 */
function jobSection(u) {
  var t = u && u.teamId ? teamOf(u.teamId) : null;
  if (!t || !u.hero || !HEROES[u.hero]) return '';
  var left = Math.max(0, crystalOf(t.teamId).left);
  var H = ['<div class="card jobs">'];
  H.push('<div class="eyebrow lit">用水晶換的職業</div>');
  H.push('<p class="dim">換到的整組都能挑。手上 ' + left + ' 顆水晶。</p>');
  H.push('<div class="pick4">');
  JOB_LIST.forEach(function (x) {
    var g = HEROES[x.k];
    if (jobOpen(u, x.k)) {
      var by = t.jobs && t.jobs[x.k] && t.jobs[x.k].by ? userOf(t.jobs[x.k].by) : null;
      H.push('<button class="p4' + (u.hero === x.k ? ' on' : '') + '" data-act="run" data-p=\'' +
        esc(JSON.stringify({ a: 'hero:' + x.k })) + '\'>');
      H.push('<span class="p4-px">' + pxTag(g.walkA, g.pal, 'wf wa') + pxTag(g.walkB, g.pal, 'wf wb') + '</span>');
      H.push('<span class="p4-t"><b>' + esc(x.n) + '</b><i>' + esc(x.t) + '</i>' +
        (by ? '<em class="p4-by">' + esc(by.name) + ' 為隊上換來的</em>' : '') + '</span>');
      H.push('</button>');
      return;
    }
    H.push('<div class="p4 lock">');
    H.push('<span class="p4-px">' + pxTag(g.idleA, shadePal(g.pal), '') + '</span>');
    H.push('<span class="p4-t"><b>' + esc(x.n) + '</b><i>' + esc(x.t) + '</i>');
    if (DRAFT.jobConf === x.k) {
      H.push('<em class="cx-need">用 ' + RULES.CRYSTAL.job + ' 顆水晶換「' + esc(x.n) + '」？整組都能用。</em>');
      H.push(btn('對，換', 'jobyes:' + x.k, 'sm'));
      H.push(btn('先不要', 'jobno', 'ghost sm'));
    } else if (left >= RULES.CRYSTAL.job) {
      H.push(btn('用 ' + RULES.CRYSTAL.job + ' 顆水晶換', 'jobask:' + x.k, 'ghost sm'));
    } else {
      H.push('<em class="cx-need">要 ' + RULES.CRYSTAL.job + ' 顆水晶，還差 ' + (RULES.CRYSTAL.job - left) + ' 顆。</em>');
    }
    H.push('</span></div>');
  });
  H.push('</div></div>');
  return H.join('');
}

/* 剛換到的那一刻：大圖、開場白、座右銘，一顆「用這個職業」。 */
function jobReveal(u, k) {
  var g = HEROES[k], m = heroMeta(k);
  if (!g || !m || !jobOpen(u, k)) return '';
  var open = (HERO_OS[k] && HERO_OS[k].unlock && HERO_OS[k].unlock[0]) || '';
  var H = ['<div class="card jobrev">'];
  H.push('<div class="eyebrow lit">換到了</div>');
  H.push('<span class="jobrev-px">' + pxTag(g.win, g.pal, '') + '</span>');
  H.push('<h2>' + esc(m.n) + '</h2>');
  if (open) H.push('<p class="quote">' + esc(open) + '</p>');
  if (m.m) H.push('<p class="dim">' + esc(m.m) + '</p>');
  H.push(btn('用這個職業', 'jobuse:' + k, 'big'));
  H.push('</div>');
  return H.join('');
}
