/* 圖鑑。

   這個字曾經被 check.js 擋著，因為上一個作品（地心圖鑑）的圖鑑是一條
   收集進度條：收集了 12／40，收滿有東西。那種圖鑑會把「做更多任務」
   變成「填更多格子」，也就是把外在誘因裝回來。

   這一份不是那種。差別只有一條，但那一條就是全部：

     全部看得到。沒有鎖、沒有問號、沒有「收集了幾件」。

   它記的是「你遇過牠」——那是一段回憶，不是一個分數。

   版面：一次只看一層。

   本來六層一路往下攤開，五十幾隻排成一條看不完的捲軸——那不是圖鑑，
   那是一份清單。改成切頁：上面一排是層，點一層看一層，一屏剛好一層。
   預設停在他現在所在的那一層。 */

PAGES.codex = function () {
  var t = myTeam();
  var here = strataAt(depthOf(t.teamId), t.teamId);
  var tab = DRAFT.cx || here.key;
  var met = metMobs(t.teamId);
  /* 在地底下掀開遇到的那幾隻也算遇過。foundMobs 寫好了但一直沒接上，
     所以掀開遇到的生物從來沒進過圖鑑。 */
  var found = foundMobs(t.teamId);
  Object.keys(found).forEach(function (n) { if (!met[n]) met[n] = found[n]; });

  var H = [head('圖鑑', '這座地下城裡有什麼', '')];

  /* 上面那一排：六層 ＋ 東西。一次只看一頁。 */
  H.push('<div class="cxtabs">');
  STRATA.forEach(function (z) {
    H.push('<button class="cxt ' + z.key + (tab === z.key ? ' on' : '') +
      '" data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'cx:' + z.key })) + '\'>' +
      esc(z.name) + (z.key === here.key ? '<i>你在這</i>' : '') + '</button>');
  });
  H.push('<button class="cxt gear' + (tab === 'gear' ? ' on' : '') +
    '" data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'cx:gear' })) + '\'>物件</button>');
  H.push('</div>');

  if (tab === 'gear') {
    H.push(codexThings(t, here));
  } else {
    var z = here;
    STRATA.forEach(function (x) { if (x.key === tab) z = x; });
    H.push('<div class="card fa ' + z.key + '">');
    H.push('<div class="eyebrow">' + (z.key === here.key ? '你現在在這一層' : '地層') + '</div>');
    H.push('<p class="lead">' + esc(z.note) + '</p>');
    H.push('<div class="cx">');
    faunaOf(z.key).forEach(function (c) {
      H.push('<div class="cxi' + (met[c.n] ? ' met' : '') + '">');
      H.push(pxTag(c.px, z.pal, 'cx-px'));
      H.push('<div><b>' + esc(c.n) + '</b>');
      H.push('<em>' + esc(c.t) + '</em>');
      if (met[c.n]) H.push('<span class="cx-met">遇過 · ' + esc(met[c.n]) + '</span>');
      H.push('</div></div>');
    });
    H.push('</div></div>');
  }

  return H.join('');
};

/* 東西那一頁：帶得走的一種，與地上撿得到的幾種。 */
function codexThings(t, here) {
  var mine = keepsOf(t.teamId);
  var H = ['<div class="card">'];
  H.push('<div class="eyebrow">帶得走的</div>');
  H.push('<div class="cx">');
  H.push('<div class="cxi' + (mine.length ? ' met' : '') + '">');
  H.push(pxTag(mine.length ? (mine[mine.length - 1].px || coreOf(mine[mine.length - 1].runId))
    : ['..++++++++++..', '.+##########+.', '.+#*######*#+.', '.+##########+.',
       '.+#+......+#+.', '.+#+......+#+.', '.+#..+..+..#+.', '.+..+..+..+..',
       '.+##########+.', '..++++++++++..'],
    here.pal, 'cx-px core'));
  H.push('<div><b>石片</b>');
  /* 三句砍成一句。那一根長什麼樣子看得到，不用讀。 */
  H.push('<em>一天兩列。來過實心，沒動空心。</em>');
  if (mine.length) H.push('<span class="cx-met">你已經封存了 ' + mine.length + ' 根</span>');
  H.push('</div></div>');
  H.push('</div></div>');

  H.push('<div class="card">');
  H.push('<div class="eyebrow">地上的物件</div>');
  H.push('<p class="dim">每一層長的不一樣。</p>');
  H.push('<div class="cx">');
  [['碎石', RUBBLE.px, '往下走的時候崩下來的。'],
   ['水晶', CRYSTAL.px, '最暗的時候還看得到。'],
   ['蕈菇', SHROOM.px, '走通的地方才長得出來。'],
   ['鐵件', BOLT.px, '有人來過。鏽住了，轉不動。'],
   ['餘燼', EMBER.px, '地上還有餘燼在燒。'],
   ['火把', TORCH.frames[0], '你來過的每一天，牆上多一盞。']
  ].forEach(function (p) {
    H.push('<div class="cxi met">');
    H.push(pxTag(p[1], here.pal, 'cx-px'));
    H.push('<div><b>' + esc(p[0]) + '</b><em>' + esc(p[2]) + '</em></div>');
    H.push('</div>');
  });
  H.push('</div></div>');
  return H.join('');
}

ACTS.cx = function (k) { DRAFT.cx = k; render(); };

/* ---------- 挑一個角色 ----------

   使用者：學生可以依照自己的喜好跟習慣反映在角色上。

   四種的剪影就不一樣（見 12-heroes.js），所以這一頁不用寫一句話
   解釋差別——四個站在那裡，走路那兩幀輪流播，看就知道。

   它不進任何判定、不影響任何數字，也不會有人因為挑了哪一個而多拿
   或少拿什麼。挑完就回廊道，因為那才是他要待的地方。 */
/* ---------- 一組 ----------

   班級地下城上點那個名牌到這裡。四樣東西：他們在做什麼、
   他們給自己的形容、有誰、每個人挑了什麼角色。

   一個數字都沒有。走了幾趟、準不準、疊了幾塊，那些是「他們做了什麼」，
   點那一疊才是問那個——這一頁只回答「他們是誰」。 */
PAGES.crew = function () {
  var tm = teamOf(S.p.id);
  if (!tm) return '<div class="card">找不到。</div>';
  var mine = !!(myTeam() && myTeam().teamId === tm.teamId);

  var H = [head(tm.project || '（還沒定）', tm.name, '')];

  /* 給自己的形容。自己的組改得動，別組只看得到。
     系統不替任何一組下形容詞——招牌上寫什麼是他們的事。 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">他們給自己的形容</div>');
  if (mine) {
    H.push('<textarea id="cr-b" rows="2" maxlength="60" placeholder="' +
      esc('例：三個人，一個做訪談、兩個做設計。') + '">' +
      esc(tm.blurb || '') + '</textarea>');
    H.push(btn('寫好了', 'blurb', ''));
  } else if (tm.blurb) {
    H.push('<p class="quote big">' + nl(tm.blurb) + '</p>');
  } else {
    H.push('<p class="dim">他們還沒寫。</p>');
  }
  H.push('</div>');

  /* 有誰，跟每一個人挑了什麼角色。 */
  var crew = where('Roster', function (x) { return x.teamId === tm.teamId; });
  H.push('<div class="card">');
  H.push('<div class="eyebrow">' + crew.length + ' 個人</div>');
  H.push('<div class="crew">');
  crew.forEach(function (rs) {
    var u = rs.claimedBy ? userOf(rs.claimedBy) : null;
    var k = heroKey(u);
    var g = HEROES[k];
    var meta = null;
    HERO_LIST.forEach(function (x) { if (x.k === k) meta = x; });
    H.push('<div class="crw' + (u ? '' : ' none') + '">');
    H.push('<span class="crw-px">' + pxTag(g.idle, g.pal, 'ch-s') + '</span>');
    H.push('<span class="crw-t"><b>' + esc(rs.memberName) + '</b>');
    H.push('<i>' + (u ? esc(meta ? meta.n : '') : '還沒有人認領') + '</i></span>');
    H.push('</div>');
  });
  H.push('</div></div>');

  H.push(btn('看他們被派過哪些任務', 'team:' + tm.teamId, ''));
  H.push(btn('回班級地下城', 'go:eco', 'ghost'));
  return H.join('');
};

/* ---------- 一個人 ----------

   班級地下城上每一條的角色都點得開，點到的是這一頁。

   它刻意只有一件事：他是誰。沒有分數、沒有名次、沒有走了幾趟、
   沒有準不準——那些是「他們做了什麼」，點那一疊才是問那個。

   兩件事分開問，是因為這個系統唯一在評的東西是預估，而一個人
   不該被他的預估定義。他選了哪一個角色是他自己的事，
   而那件事在這裡佔一整頁。

   別人的也看得到。看得到的是他挑了什麼、他的角色會說什麼——
   一個一個字都不能拿來比。 */
PAGES.person = function () {
  var tm = teamOf(S.p.id);
  if (!tm) return '<div class="card">找不到。</div>';
  var mem = where('Users', function (x) {
    return x.teamId === tm.teamId && x.role === 'student';
  })[0];
  var k = heroKey(mem);
  var g = HEROES[k];
  var meta = null;
  HERO_LIST.forEach(function (x) { if (x.k === k) meta = x; });
  var mine = !!(myTeam() && myTeam().teamId === tm.teamId);

  var H = [head(meta ? meta.n : '角色',
    mine ? '這是你在這場專案旅行中的化身' : esc(tm.project || tm.name), '')];

  /* 大的那一張。走路兩幀輪播——站著不動的一張圖看起來像沒做完。 */
  H.push('<div class="card pcard">');
  H.push('<span class="pcard-px">' +
    pxTag(g.walkA, g.pal, 'wf wa') + pxTag(g.walkB, g.pal, 'wf wb') + '</span>');
  H.push('<div class="pcard-t">');
  H.push('<b>' + esc(meta ? meta.n : '') + '</b>');
  H.push('<p class="lead">' + esc(meta ? meta.t : '') + '</p>');
  /* 他休息的時候會說的那一句。這是這一頁上唯一一句「他自己的話」。 */
  var rest = (HERO_OS[k] || HERO_OS.adv).rest || [];
  if (rest.length) H.push('<p class="quote">' + esc(rest[0]) + '</p>');
  H.push('</div></div>');

  /* 他在哪一組。組名小、專案名大——座號不是資料。 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">' + esc(shortName(tm.name)) + '</div>');
  H.push('<b class="ptitle">' + esc(tm.project || '（還沒定）') + '</b>');
  H.push('</div>');

  if (mine) H.push(btn('換一個角色', 'go:who', ''));
  H.push(btn('回班級地下城', 'go:eco', 'ghost'));
  return H.join('');
};

PAGES.who = function () {
  var u = me();
  var now = heroKey(u);

  var H = [head('挑一個角色開始冒險',
    '這是你在這場專案旅行中的化身', '')];
  H.push('<div class="pick4">');
  HERO_LIST.forEach(function (x) {
    var g = HEROES[x.k];
    H.push('<button class="p4' + (x.k === now ? ' on' : '') +
      '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'hero:' + x.k })) + '\'>');
    /* 兩幀輪流播，站著跟走路各一組——選的時候就看得到他會怎麼動。 */
    H.push('<span class="p4-px">' +
      pxTag(g.walkA, g.pal, 'wf wa') + pxTag(g.walkB, g.pal, 'wf wb') + '</span>');
    H.push('<span class="p4-t">');
    H.push('<b>' + esc(x.n) + '</b>');
    H.push('<i>' + esc(x.t) + '</i>');
    H.push('</span>');
    H.push('</button>');
  });
  H.push('</div>');
  return H.join('');
};
