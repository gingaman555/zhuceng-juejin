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
  var here = zoneNow(t.teamId);
  var tab = DRAFT.cx || here.key;
  var met = metMobs(t.teamId);
  /* 在地底下掀開遇到的那幾隻也算遇過。foundMobs 寫好了但一直沒接上，
     所以掀開遇到的生物從來沒進過圖鑑。 */
  var found = foundMobs(t.teamId);
  Object.keys(found).forEach(function (n) { if (!met[n]) met[n] = found[n]; });
  /* 上次翻開之後才遇到的那幾隻，跟才拿到的那幾張。

     整趟只算一次（FRESH 存在 55-ui.js）：畫完之後 seen() 會把名單
     記起來，所以第二次畫就算不出新的了——而分頁上那顆點正好是在
     叫他換分頁。存著，離開圖鑑才放掉。 */
  if (!FRESH) {
    FRESH = { mob: codexFresh(me(), t.teamId), keep: keepFresh(me(), t.teamId) };
  }
  var fresh = FRESH.mob, freshK = FRESH.keep;

  /* 副題要蓋住這一頁的兩種東西：六個地層裡的魔物，跟老師發的任務之證。
     本來寫「這座地下城裡有哪些魔物」——那漏掉了第七個分頁。

     （魔物這個詞本身是對的：畫面上這一類東西本來沒有名字，
     講的是「一隻」「東西」「幾種」，只有故事那一頁叫牠魔物。） */
  var H = [head('圖鑑', '遇過的魔物，跟拿到的任務之證', '')];

  /* 上面那一排：六層 ＋ 任務之證。一次只看一頁。 */
  H.push('<div class="cxtabs">');
  STRATA.forEach(function (z) {
    H.push('<button class="cxt ' + z.key + (tab === z.key ? ' on' : '') +
      '" data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'cx:' + z.key })) + '\'>' +
      esc(z.name) + (z.key === here.key ? '<i>你在這</i>' : '') +
      /* 新遇到的那一隻不一定住在他打開時看到的那一層，所以分頁上要標——
         沒有這一顆，那道光只有剛好翻對頁的人看得到。 */
      (faunaOf(z.key).some(function (c) { return fresh[c.n]; }) ? '<i class="nw"></i>' : '') +
      '</button>');
  });
  H.push('<button class="cxt core' + (tab === 'core' ? ' on' : '') +
    '" data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'cx:core' })) + '\'>任務之證' +
    /* 這一頁有兩種東西，所以分頁上這一顆也要有——沒有它，
       新拿到的那一張只有剛好翻到這一頁的人看得到。 */
    (Object.keys(freshK).length ? '<i class="nw"></i>' : '') + '</button>');
  H.push('</div>');

  if (tab === 'core') {
    H.push(codexThings(t, here, freshK));
  } else {
    var z = here;
    STRATA.forEach(function (x) { if (x.key === tab) z = x; });
    H.push('<div class="card fa ' + z.key + '">');
    /* 「你在這」那一格分頁上已經標了，這裡不再說一次。
       其餘幾層也不用寫「地層」——那一排分頁本來就是地層。 */
    H.push('<p class="lead">' + esc(z.note) + '</p>');
    H.push('<div class="cx">');
    /* 亮起來的順序錯開，一隻接一隻——同時全亮認不出有幾隻。 */
    var nth = 0;
    faunaOf(z.key).forEach(function (c) {
      var isNew = !!fresh[c.n];
      H.push('<div class="cxi' + (met[c.n] ? ' met' : '') + (isNew ? ' fresh' : '') +
        '"' + (isNew ? ' style="--d:' + (nth++ * 180) + 'ms"' : '') + '>');
      H.push(pxTag(c.px, z.pal, 'cx-px'));
      H.push('<div><b>' + esc(c.n) + '</b>');
      H.push('<em>' + esc(c.t) + '</em>');
      /* 「遇過 · 某某任務」那一行拿掉了：那是一句把兩件不相干的事
         接在一起的話（一隻生物 · 一個任務名），而遇沒遇過那一格自己
         就看得出來——沒遇過的整格是暗的。 */
      H.push('</div></div>');
    });
    H.push('</div></div>');
  }

  return H.join('');
};

/* 任務之證那一頁。

   本來這一頁還有一段「地上的物件」，六樣佈景排成一份目錄配說明文字。
   那個版面在說「這些值得收集」，可是它們拿不到、數不了、跟任何事都
   無關；而它旁邊的任務之證是真的，兩個並排會讓人以為物件也拿得到，
   然後去找怎麼拿。找不到。

   物件在廊道裡留著——那裡它有用：每一層長的不一樣，那是讓六層像
   六個地方而不是六個顏色的東西。 */
function codexThings(t, here, freshK) {
  var mine = keepsOf(t.teamId);
  var H = ['<div class="card">'];

  if (!mine.length) {
    /* 還沒有半根。畫一根空的輪廓，寫它會怎麼來——
       空白的一頁不會讓人知道這裡以後會長什麼。 */
    /* 分頁上已經寫著「任務之證」。 */
    H.push('<div class="cx"><div class="cxi">');
    H.push(pxTag(['..++++++++++..', '.+##########+.', '.+#*######*#+.',
      '.+##########+.', '.+#+......+#+.', '.+#+......+#+.', '.+#..+..+..#+.',
      '.+..+..+..+..', '.+##########+.', '..++++++++++..'], here.pal, 'cx-px core'));
    H.push('<div><b>還沒有</b><em>老師審核過了，就發一張。</em></div>');
    H.push('</div></div></div>');
    return H.join('');
  }

  /* 一趟一根，全部排在一起。

     刻意沒有總數、進度、缺哪幾根——一趟長一根，本來就不會有缺的。
     沒有東西需要被填滿，所以沒有人會為了填滿它多做一件事。 */
  H.push('<div class="eyebrow">' + mine.length + ' 張</div>');
  H.push('<p class="dim">一件任務一張，老師審核過了才有。名字就是那一件任務，' +
    '而且不會有兩張一樣。</p>');
  H.push('<div class="cores">');
  /* 亮起來的順序錯開，一張接一張——同時全亮認不出有幾張。 */
  var nth = 0;
  mine.forEach(function (k) {
    var isNew = !!(freshK && freshK[k.keepId]);
    var z = null;
    STRATA.forEach(function (x) { if (x.key === k.zone) z = x; });
    /* 名字讀發下去那一刻記的那一個。舊資料沒有，才回頭查任務名。 */
    var run = k.name ? null : find('Runs', function (x) { return x.runId === k.runId; });
    var ms = run ? msOf(run.msId) : null;
    H.push('<div class="core1 ' + (k.zone || here.key) + (isNew ? ' fresh' : '') +
      '"' + (isNew ? ' style="--d:' + (nth++ * 180) + 'ms"' : '') + '>');
    H.push(pxTag(k.px || coreOf(k.runId), (z || here).pal, 'cx-px core'));
    H.push('<b>' + esc(k.name || (ms ? ms.title : '（那一趟）')) + '</b>');
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

     標題不寫出來：那一句本來就是一句話，上面再壓一行
     「他們給自己的形容」等於幫他們的話加旁白，而整張卡就在
     他們的名字底下，讀的人看得出來是誰在說話。

     沒寫過的先掛 BLURB0，不留白——「他們還沒寫」會讓沒寫的那幾組
     看起來缺了什麼，而寫不寫本來就不該有壓力。 */
  H.push('<div class="card">');
  if (mine) {
    H.push('<textarea id="cr-b" rows="2" maxlength="60">' +
      esc(tm.blurb || BLURB0) + '</textarea>');
    H.push(btn('寫好了', 'blurb', ''));
  } else {
    H.push('<p class="quote big">' + nl(tm.blurb || BLURB0) + '</p>');
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

  H.push(btn('看他們被派過哪些任務', 'tasks:' + tm.teamId, ''));
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
  /* 還沒挑過的人，四個都不要打勾。

     本來這裡讀 heroKey，而 heroKey 沒設過就回 adv——所以第一次進來
     的人看到冒險者已經亮著金框，等於系統先替他決定了一張臉。
     而這一頁存在的理由正好相反（見 58-gate.js 的 ACTS.claim）。 */
  var now = (u && u.hero && HEROES[u.hero]) ? u.hero : '';

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
