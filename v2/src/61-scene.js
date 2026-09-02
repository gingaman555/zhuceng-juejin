/* 廊道的場景。

   之前這裡是一條進度條：角色 → 幾個方格 → 魔物。它讀得懂，但它是圖表。
   這一支把它改成一個地方——有洞口、有天花板、有地板、有石頭、有火把，
   角色站在裡面而不是站在旁邊。

   幾件事是有意義的，不是裝飾：

     火把    一天一盞。推進幾次，走廊就亮幾盞——「你來過幾次」畫出來的樣子。
     腳印    走過的每一格留一個。走廊上唯一的歷史，而且它不算分。
     迷霧    從你站的地方往前蓋住。往前走一格，霧就退一格。
     魔物    藏在霧裡，越靠近越清楚。它不是敵人，是這一趟要交的東西。

   還有一件事是刻意不做的：走廊上沒有任何「你應該走到哪」的記號。
   沒有基準線，就沒有落後這回事。 */

var SCN = {
  TILE: 44,     /* 一天一格 */
  ENT: 132,     /* 洞口那一段 */
  END: 154,     /* 魔物站的那一段 */
  H: 286,       /* 場景高 */
  FLOOR: 66     /* 地板上緣離底部多高——站在地上的東西都用這個 */
};

/* 一條走廊。

     t     這一組
     row   現在在跑的那一個 run（可能沒有）
     st    停滯狀態 */
/* 洞口有多寬。每留下一個記號就寬一點——那是「看得到自己的堆積」
   最直接的做法：你的營地會變大，而首頁就是這條廊道。
   有上限，不然走到後面整條廊道會被營地擠掉。 */
function entOf(teamId) {
  var t = teamOf(teamId);
  var n = Object.keys((t && t.builds) || {}).length;
  return SCN.ENT + Math.min(10, n) * 26;
}

function scene(t, row, st, kind) {
  var ENT = entOf(t.teamId);
  var run = row && row.run;
  /* 還沒承諾任何事的時候給一段像樣的空廊道。
     第一次打開是印象最深的一次，本來它只有一格，看起來像壞掉的。 */
  var est = run ? (run.est || 1) : 7;

  /* 一條軌道，兩個東西在上面：
       moved   你來過幾天——按一下才往前一格
       tide    實際過了幾天——你按不按它都會漲 */
  var log = run ? dayLog(run.runId) : [];
  var moved = 0, i0;
  for (i0 = 0; i0 < log.length; i0++) if (log[i0] && log[i0].kind === 'move') moved++;
  var done = run && run.state !== 'running';
  if (done) moved = Math.max(moved, run.pushes || 0);
  var tide = Math.min(log.length, est + 2);
  var walked = Math.min(moved, est);

  /* 每一格頭上掛的是那一天動的是哪一段。廊道因此讀得出形狀——
     七格同一個顏色跟七格五顏六色，是完全不同的一趟。 */
  var byTile = [];
  var k0 = 0;
  for (i0 = 0; i0 < log.length; i0++) {
    if (log[i0] && log[i0].kind === 'move') byTile[k0++] = log[i0].step;
  }
  var rests = 0;
  for (i0 = 0; i0 < log.length; i0++) if (log[i0] && log[i0].kind === 'rest') rests++;

  var seed = t.teamId + (run ? '|' + run.runId : '');
  var light = WORLD.light[st.level];
  /* 往前多畫幾格。本來只畫到承諾與過了幾天的較大者，所以拖到底就
     沒東西了。多出來的那幾格在霧裡，看不出有什麼——
     那才是還沒走到的地方該有的樣子。 */
  var AHEAD = 5;
  var span = Math.max(est, tide);          /* 這一趟的長度 */
  var draw = span + AHEAD;                 /* 畫到哪裡（多的在霧裡） */
  var W = ENT + draw * SCN.TILE + SCN.END;
  /* 走到多深，牆、地板、天花板、地上的東西、擋路的那一隻，全部跟著換。
     世界觀不寫在說明裡，寫在牆上。 */
  var zone = strataAt(depthOf(t.teamId), t.teamId);

  /* 三個狀態掛在最外層。裡面每一層（遠牆、流線、火、角色）都靠
     它決定要不要動——一個地方決定，不會有兩層各自算出不同答案。 */
  /* 任務開始＝按下承諾，不是老師派下來。派了但還沒承諾的時候
     他還坐在火邊——那正是「還沒出發」。

     fresh 的那一趟 runsFor 會給一個 runId 是 null 的空殼，所以
     判斷要看 run.runId 不是 run。 */
  var walking = kind === 'doing' && st.level < 2;
  var going = !!(run && run.runId);
  var resting = st.level < 2 && !walking &&
    (!going || kind === 'idle' || kind === 'left' || kind === 'waitexit');
  /* 剛按下承諾那一下。go() 會清掉 DRAFT，所以旗子放在 S 上。 */
  var launch = !!S.launch;
  var H = ['<div class="scn ' + light.key + ' z-' + zone.key +
    (walking ? ' walking' : '') + (resting ? ' resting' : '') +
    (launch ? ' launch' : '') + '">'];
  /* 出發那一下：一道白光掃過去，加上一句大字砸在正中間。

     這是整個流程裡唯一一個「從現在開始」的時刻——之前他在營火旁邊
     坐著，之後他在走。中間那一下要有聲音，不然兩個狀態之間只是
     畫面換了。

     字砸下來的時候廊道上那幾行小字（第幾天、牌子、角落那一塊）
     一起收起來：一次只講一件事，而且這樣它們也不會跟大字疊在一起。 */
  if (launch) {
    H.push('<div class="scn-launch"></div>');
    H.push('<div class="scn-go"><b>任務開始</b></div>');
  }


  /* 固定在角落的深度。走廊往旁邊捲，它不跟著捲——
     那是「你在多深的地方」，不是走廊上的一個位置。 */
  H.push('<div class="scn-hud">' +
    '<em>' + esc(zone.name) + '</em>' +
    '<b>' + (depthOf(t.teamId) * WORLD.depthPerMilestone) + ' m</b>' +
    '<span>走完 ' + depthOf(t.teamId) + ' 個任務</span>' +
    '<span class="zn-note">' + esc(zone.note) + '</span></div>');

  /* 釘在框上、不跟著捲的兩層：近景的岩石與暗角。
     拖動廊道的時候它們不動——那一下就有視差。 */
  H.push('<div class="scn-frame"></div>');

  H.push('<div class="scn-scroll"><div class="scn-in" style="width:' + W + 'px">');

  /* 最後面那一層：更暗的磚與支撐柱。廊道不是一片牆，它有深處。 */
  H.push('<div class="scn-far" style="width:' + W + 'px"></div>');
  /* 前進中才會動的兩層：遠牆慢、地面的流線快。兩層速度不一樣，
     「往前」才有深度——一層一起動看起來是整張圖在滑。 */
  H.push('<div class="scn-rush" style="width:' + W + 'px"></div>');

  /* 頭上的岩。本來天花板只有幾根鐘乳石掛在空中，沒有東西讓它們掛。 */
  H.push('<div class="scn-ceil" style="width:' + W + 'px"></div>');


  /* 這一層的空氣。不帶任何資訊——哪一層已經由牆、地板、石頭的顏色
     說了；空氣只是讓那個地方看起來真的有空氣。 */
  H.push(sceneAir(seed, zone, W));

  /* ── 天花板：鐘乳石 ── */
  for (var d = 0; d < Math.ceil(W / 44); d++) {
    var dp = dripFor(seed, d);
    if (!dp) continue;
    H.push('<span class="drip" style="left:' + (d * 44 + dp.off) + 'px">' +
      pxTag(dp.px, zone.pal, '') + '</span>');
  }

  /* ── 洞口 ── */
  H.push(sceneMouth(t, { kind: kind, run: run }, ENT, resting));

  /* ── 地板 ── */
  H.push('<div class="floor" style="left:0;width:' + W + 'px"></div>');
  if (walked > 0) {
    H.push('<div class="floor lit" style="left:' + ENT + 'px;width:' +
      (walked * SCN.TILE) + 'px"></div>');
  }

  /* ── 一天一格 ── */
  for (var i = 0; i < span; i++) {
    var x = ENT + i * SCN.TILE;
    var on = i < walked;

    /* 火把：走過的那幾格點著 */
    H.push(torchAt(x + 6, on, i));

    /* 腳印 */
    if (on) H.push('<img class="px foot" style="left:' + (x + 11) + 'px" src="' +
      pxSvg(STEP_PX.px, STEP_PX.pal, false) + '" alt="">');

    /* 那一天動的是哪一件。畫顏色不畫字——名字長度不一定，
       塞不進 44px；顏色對到哪一件，清單上看一次就記得了。 */
    if (on && byTile[i] >= 0) {
      H.push('<span class="doing" style="left:' + x + 'px;background:' +
        stepHue(byTile[i]) + '" title="' + esc(stepName(run.runId, byTile[i])) +
        '"></span>');
    }

    /* 第幾天 */
    H.push('<span class="dayn' + (i === walked ? ' here' : (on ? ' past' : '')) +
      '" style="left:' + x + 'px">' + (i + 1) + '</span>');

    /* 走通的地方才長得出東西，而且每一層長的不一樣（見 12-props.js）。
       全部用那一層的配色——換了地方，連地上的石頭都該換顏色。 */
    if (on) {
      var p = propFor(seed, i, zone.key);
      if (p === 'rubble') H.push('<img class="px prop rubble" style="left:' + (x + 5) +
        'px" src="' + pxSvg(RUBBLE.px, zone.pal, false) + '" alt="">');
      if (p === 'crystal') H.push('<img class="px prop cry" style="left:' + (x + 22) +
        'px" src="' + pxSvg(CRYSTAL.px, zone.pal, false) + '" alt="">');
      if (p === 'shroom') H.push('<img class="px prop shr" style="left:' + (x + 22) +
        'px" src="' + pxSvg(SHROOM.px, zone.pal, false) + '" alt="">');
      if (p === 'bolt') H.push('<img class="px prop cry" style="left:' + (x + 22) +
        'px" src="' + pxSvg(BOLT.px, zone.pal, false) + '" alt="">');
      if (p === 'ember') H.push('<img class="px prop shr" style="left:' + (x + 22) +
        'px" src="' + pxSvg(EMBER.px, zone.pal, false) + '" alt="">');
    }
  }

  /* 那一片漲上來的水拿掉了。

     它是「過了幾天」畫成一條橫著漲過去的長條，而同一個數字在廊道
     底下那一行本來就有：「N 過了幾天」。同一件事講兩次，其中一次
     還是一條半透明的藍色長條，蓋住地板、腳印、跟那一天做了什麼。

     tide 這個數字留著——廊道畫多長、霧從哪裡開始，都還是看它。
     拿掉的只是畫出來的那一層水。 */

  /* ── 魔物 ── */
  /* 牠站在你說的那一天，不動。
     本來是 max(承諾, 過了幾天)——時間過去牠跟著往後退，
     所以你永遠追不上，也永遠不會走過牠。 */
  /* 牠只在走到底之後出現：走滿了自己說的天數，或者這一趟已經交出去。
     還在路上的時候前面是霧——不是一隻站在那裡等你的東西。 */
  /* fresh 的空殼 state 是 fresh，本來也被算成「已經走完」——
     所以一個還沒承諾的任務，盡頭就站著一隻。 */
  var arrived = going && (walked >= est || run.state === 'stamped' ||
    run.state === 'submitted' || run.state === 'back' || run.state === 'done');
  if (arrived) H.push(sceneMob(t, row, 1, est, ENT));

  /* ── 盡頭的岩壁裡有東西 ──

     這一趟走完、把記號插進去的那一下會敲開這一層的石頭。
     有東西的時候先讓那塊岩壁看起來不一樣——只給「那裡有東西」，
     不給「那裡有什麼」。揭曉留給敲開的那一下。 */
  if (buriedAt(t.classId, t.teamId, depthOf(t.teamId))) {
    H.push('<div class="ahead" style="left:' +
      (ENT + (span + 2) * SCN.TILE) + 'px"><i></i></div>');
  }

  /* ── 角色 ── */
  /* ── 他在做什麼，就長成什麼樣子 ──

     本來寫的是 `run && st.level < 2`，而 run 這個物件在四個完全不同的
     處境下都存在：派了還沒說幾天、正在做、交出去了在等、老師勾了。
     所以四個狀態長成同一個走路的樣子，而其中只有一個真的在走。
     姿勢因此不帶任何訊息——那就等於沒有姿勢。

       正在做　　　　　走路
       還沒說幾天　　　站著　他還在洞口，沒出發
       交出去了、等老師 站著　走到底了，腳沒有在動
       沒有任務　　　　坐著　營火旁邊。那是休息，不是罰站
       很多天沒動　　　睡著

     停下來不是停止：坐著跟站著都有兩幀，差在呼吸，火也一直在動。 */
  /* walking／resting 在最上面算過了。 */
  /* 火釘在洞口的 left:11，寬 44。人坐在火的右邊一點。 */
  var hx = resting ? 44 : ENT + walked * SCN.TILE - 11;
  H.push('<div class="hero scn-hero' + (st.level >= 2 ? ' asleep' : '') +
    (walking ? ' walking' : '') + (resting ? ' resting' : '') +
    '" style="left:' + hx + 'px">');
  /* 頭上寫他在幹嘛。本來只靠姿勢，而姿勢在 66px 上看不太出來——
     寫出來最快，而且它同時說明了「現在沒事做」是一個正常狀態。 */
  /* 牌子跟著姿勢走。「待命」本來蓋掉三個很不一樣的處境——
     還沒出發、在等老師、老師勾了。分開講。 */
  var tag = walking ? '前進中'
    : resting ? '休息中'
    : st.level >= 2 ? '停很久了'
    : kind === 'commit' ? '還沒出發'
    : kind === 'stamped' ? '走到底了'
    : kind === 'review' ? '在等老師'
    : kind === 'back' ? '老師退回來了'
    : '待命';
  H.push('<div class="hero-tag' + (walking ? ' go' : resting ? ' rest' : '') +
    '">' + esc(tag) + '</div>');
  if (walking) {
    H.push(pxTag(HERO.walkA, HERO.pal, 'ch wf wa'));
    H.push(pxTag(HERO.walkB, HERO.pal, 'ch wf wb'));
  } else if (resting) {
    H.push(pxTag(HERO.sitA, HERO.pal, 'ch wf wa'));
    H.push(pxTag(HERO.sitB, HERO.pal, 'ch wf wb'));
  } else if (st.level >= 2) {
    H.push(pxTag(HERO.sleep, HERO.pal, 'ch'));
  } else {
    /* 站著也要兩幀。一張不動的圖在一條會漲水、會閃火的走廊上
       看起來像壞掉——呼吸那一格差別很小，但「他還在那裡」靠的就是它。 */
    H.push(pxTag(HERO.idleA, HERO.pal, 'ch wf wa'));
    H.push(pxTag(HERO.idleB, HERO.pal, 'ch wf wb'));
  }
  H.push(heroPack(t.teamId));
  if (st.level === 1) H.push(pxTag(VINE.px, VINE.pal, 'vine'));
  H.push('</div>');

  /* 角色手上那一盞的光。一圈一圈地暗下去，不是模糊的漸層——
     模糊的話它會立刻看起來像貼在像素圖上面的現代特效。 */
  H.push('<div class="halo" style="left:' + (hx - 121) + 'px"></div>');

  /* ── 你說的那一天 ──

     這是原始設計裡就有的一條線（「道路前方出現一條虛線」），
     一直沒做。它讓「我承諾了幾天」在畫面上有一個實體：
     那條線就在前面，水從後面追上來。只有數字的話那件事沒有位置。

     虛線不是終點線——別組沒有這條線，每一組的線在不同的地方，
     因為那是各自說的。 */
  if (run) {
    /* 只有線，沒有字。牠現在就站在這一格上——
       牠站在那裡本身就是「你說的那一天」，再寫一次是同一件事說兩遍，
       而且那兩段字永遠會擠在一起。 */
    H.push('<div class="vow" style="left:' + (ENT + est * SCN.TILE) + 'px"></div>');
  }

  /* ── 霧 ──
     從站的地方往前蓋住。它蓋的是「還沒走的那幾天」，
     所以往前一格霧就退一格。 */
  var fogAt = ENT + (Math.max(walked, tide) + 1) * SCN.TILE;
  if (fogAt < W) {
    H.push('<div class="fog" style="left:' + fogAt + 'px"></div>');
  }

  H.push('</div></div>');   /* scn-in / scn-scroll */

  H.push('</div>');         /* scn */

  /* 底下那一行掛在廊道外面。它的負邊界是為了往上貼住廊道，
     寫在 .scn 裡面的話會被 overflow:hidden 吸到頂上去。 */
  if (run) {
    H.push('<div class="scn-foot">');
    H.push('<span class="sf you"><b>' + moved + '</b>你來過</span>');
    H.push('<span class="sf days"><b>' + tide + '</b>過了幾天</span>');
    H.push('<span class="sf est"><b>' + est + '</b>你說的</span>');
    if (rests) H.push('<span class="sf rest"><b>' + rests + '</b>說沒動</span>');
    H.push('</div>');
  }
  return H.join('');
}

/* 背上本來背著封存過的石片。石片併進記號之後，
   「走著走著身上的東西變多了」改由洞口的營地講——
   那裡一趟多一個，而且首頁就是那條廊道，每次打開都看得到。 */
/* 照面那一頁上的自己。跟廊道裡走的是同一個人、同一身裝備——
   不然那一下就不是「我上去」，只是一張圖。 */
function heroTag(teamId) {
  return '<div class="hero duel-h">' + pxTag(HERO.idle, HERO.pal, 'ch') +
    heroPack(teamId) + '</div>';
}

function heroPack() { return ''; }

/* ---------- 洞口 ----------
   左邊是你進來的地方：拱門、從上面落下來的光、掛著的招牌。
   招牌就在這裡，不在標題列——它是廊道入口的看板，不是頁首。 */
/* 洞口。招牌、營火、石片架、往上的光——全部在這裡，而且一直在。

   為什麼要一直在：沒觸發過的東西等於不存在。一個學生如果從來沒有
   失準過，他整學期不會知道有營火這個地方；一個還沒封存過的人不會
   知道石片架是什麼。所以它們在那裡，只是沒點著——
   「看得到但還沒發生」跟「不存在」是兩件事。 */
function sceneMouth(t, next, ENT, resting) {
  var sg = signOf(t.teamId);
  var H = ['<div class="mouth" style="width:' + (ENT || SCN.ENT) + 'px">'];

  /* 往上的光：出口。一直在，而且點得開——
     宣告專案做完是偶爾才做的事，不該在首頁佔一塊，
     但它也不能藏起來（沒觸發過的東西等於不存在）。 */
  H.push('<button class="shaft' + (t.exitAsk || t.leftAt ? ' open' : '') +
    '" data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'go:exit' })) +
    '\' title="' + esc(t.exitAsk ? '出口：在等老師確認' : '出口：專案做完的時候從這裡上去') +
    '"></button>');
  H.push('<div class="arch"></div>');

  /* 招牌。點得開——改名字是偶爾才做的事，不該在首頁佔一塊。 */
  H.push('<button class="hang" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'go:sign' })) + '\' title="' +
    esc('招牌：' + (t.project || '（還沒定）')) + '">');
  H.push('<div class="chain"></div>');
  H.push(pxTag(sg.px, sg.pal, 'sign'));
  H.push('</button>');
  /* 洞口那一塊專案名拿掉了。

     兩個理由。一 · 它是第三份：頂條上有、招牌的 title 上有，這裡再一次。
     二 · 它會撞人。它掛在 bottom:110、寬 121，而人休息的時候就坐在
     旁邊（left:44），頭上還有一塊牌子——專案名一長就折兩行，
     往上長進牌子裡。招牌本來就掛在那裡，名字讓頂條說。 */

  /* 營火。兩趟之間點著——那時候人坐在旁邊。

     本來是「判定失準才點著」，但那個分岔在改成
     『每一次交出去之前都省思』的時候拿掉了，所以它再也不會亮，
     變成一堆死掉的內容。改成休息的時候點著，才是它本來的意思：
     營地是休息的地方，不是罰站的地方。 */
  /* 跟角色同一個判斷，而且是同一個變數傳進來的——兩邊各算一次
     就會有一邊算錯（本來人坐著而火是冷的）。 */
  var lit = !!resting;
  H.push('<button class="mfire' + (lit ? ' lit' : '') + '"' +
    ' data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'go:pack' })) + '\'' +
    ' title="' + esc(lit ? '營火：還沒接下一件事' : '營火（走著的時候是暗的）') +
    '">');
  if (lit) {
    CAMPFIRE.frames.forEach(function (f, n) {
      H.push(pxTag(f, CAMPFIRE.pal, 'ff f' + n));
    });
  } else {
    H.push(pxTag(CAMPFIRE.px, COLD_PAL, ''));
  }
  H.push('</button>');

  /* 火星。點著的時候才有，六顆，各自的節奏用座標算。
     它是這個畫面上唯一一直在動的小東西——沒有它，
     「坐在火旁邊」看起來會像一張靜止的圖。 */
  if (lit) {
    for (var e = 0; e < 6; e++) {
      var eh = hash('ember' + e);
      H.push('<i class="ember" style="left:' + (16 + eh % 26) + 'px;' +
        '--ed:' + (1400 + (eh >>> 6) % 900) + 'ms;' +
        'animation-delay:' + ((eh >>> 13) % 1600) + 'ms"></i>');
    }
  }

  /* ── 營地 ──

     每走完一趟留下的那一個記號，一個一個排在洞口的地上，
     而洞口的寬度跟著長（見 entOf）。十趟之後這裡是一個被你佈置過的
     營地——而首頁就是這條廊道，所以每次打開都看得到。

     這是「看得到自己的堆積」最直接的做法：不是散在各層一個 55px，
     是全部在同一個地方、每次可見地多一個、而且一眼看得完。

     本來這裡掛的是石片架。石片跟記號都是「一趟一個」，兩個都放就是
     重複——石片留在任務清單裡，那裡點得開、而且有圖例。 */
  var tm = teamOf(t.teamId);
  var bs = (tm && tm.builds) || {};
  var ds = Object.keys(bs).map(function (k) { return Number(k.slice(1)); })
    .sort(function (x, y) { return x - y; });
  ds.forEach(function (d, i) {
    var mk = markAt(t.teamId, d);
    if (!mk) return;
    var z = strataAt(d, t.teamId);
    H.push('<button class="mmark" style="left:' + (72 + i * 30) + 'px" ' +
      'data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'seeb:' + t.teamId + ',' + d })) + '\' ' +
      'title="' + esc(mk.name + '　' + z.name) + '">' +
      pxTag(mk.px, z.pal, '') + '</button>');
  });

  H.push('</div>');
  return H.join('');
}

/* ---------- 魔物 ----------
   站在走廊盡頭。清楚到什麼程度跟你走了多少有關——
   剛出發的時候只看得到一團影子，走到底才看得清牠長什麼樣。 */
/* 走到底才遇得到牠。

   牠不畫進前進中的動畫裡：牠是那一趟盡頭擋路的那一隻，而「盡頭」
   就是走完之後。一路上都看得到牠，等於一開始就把唯一的未知揭曉了，
   而且走了五天牠還站在那裡不動，那不是擋路，那是布景。

   擋在你說的那一天上。

   本來牠站在 max(承諾, 過了幾天)，所以時間一過牠就往後退——
   你永遠追不上牠，走過牠這件事不可能發生。而「走過自己說的那一天」
   正是這個系統唯一要讓人看到的事。 */
function sceneMob(t, row, prog, est, ENT) {
  var mob = mobOfRun(row.run);
  var pal = strataAt(depthOf(t.teamId), t.teamId).pal;
  var x = (ENT || SCN.ENT) + est * SCN.TILE + 33;
  /* 這裡本來還掛一塊寫著任務名字的木牌。拿掉了：它浮在半空、會壓到
     角落那一塊，而且那個名字底下那張卡已經有一次——同一件事說兩遍，
     其中一遍看起來就會像壞掉的東西。 */
  var H = [];
  /* 名字要走到一半才看得清。

     本來牠的名字從第一天就寫在那裡——那等於一趟開始就把唯一的未知
     揭曉了。現在前半段只有一團形狀跟一排問號，走近了名字才浮出來。
     每一趟因此有一條小小的線從頭拉到尾。 */
  /* 走到底了牠才出現，而且是浮出來的（scn-mob 那一段動畫）。
     還在路上的時候那裡什麼都沒有——前面是霧，不是一隻站著等你的東西。 */
  H.push('<div class="scn-mob meet" style="left:' + x + 'px">');
  H.push(pxTag(mob.px, pal, 'ch'));
  H.push('<span class="mobn">' + esc(mob.n) + '</span>');
  H.push('</div>');
  return H.join('');
}

/* ---------- 這一層的空氣 ----------

   每一層有自己的：荒原飄塵、根脈層飄孢子、水晶迴廊閃、迴聲迷宮有東西
   掠過、銹層落銹屑、深淵冒火星。天花板一律會滴水，因為每一層都是
   地底下。

   位置全部用 hash 算——同一趟每次打開，每一顆都在同一個地方。
   會亂跳的東西不是環境，是特效。節奏各自不同，不然一整片會一起眨。

   它們不帶任何資訊，也不能帶：這一層是哪一層，牆、地板、石頭的顏色
   已經說了。空氣只是讓那個地方看起來真的有空氣。 */
var AIR = {
  wild: { n: 14, k: 'dust' },
  root: { n: 12, k: 'spore' },
  crys: { n: 16, k: 'glint' },
  echo: { n: 10, k: 'mote' },
  rust: { n: 12, k: 'flake' },
  fire: { n: 16, k: 'ember' }
};
function sceneAir(seed, zone, W) {
  var a = AIR[zone.key] || AIR.wild;
  var H = ['<div class="air" style="width:' + W + 'px">'];
  var i, span = Math.max(1, W - 22);
  for (i = 0; i < a.n; i++) {
    var h = hash(seed + '|air|' + i);
    var d = 2600 + ((h >>> 13) % 3400);
    H.push('<i class="ap ' + a.k + '" style="left:' + (h % span) +
      'px;bottom:' + (44 + ((h >>> 7) % 220)) + 'px;--ad:' + d +
      'ms;--ag:-' + ((h >>> 19) % d) + 'ms"></i>');
  }
  for (i = 0; i < 5; i++) {
    var q = hash(seed + '|drop|' + i);
    var dd = 3200 + ((q >>> 9) % 2600);
    H.push('<i class="ap drop" style="left:' + (q % span) +
      'px;--ad:' + dd + 'ms;--ag:-' + ((q >>> 5) % dd) + 'ms"></i>');
  }
  H.push('</div>');
  return H.join('');
}

/* ---------- 火把 ----------
   三幀真的換圖，不是用 CSS 做出來的「像火」。每一盞的速度差一點點，
   不然一整排會一起眨眼，那看起來像壞掉的燈管不像火。 */
function torchAt(x, lit, i) {
  if (!lit) {
    return '<img class="px tor dead" style="left:' + x + 'px" src="' +
      pxSvg(TORCH.dead, TORCH.deadPal, false) + '" alt="">';
  }
  var ms = [300, 360, 420, 340][hash('t' + i) % 4];
  var H = ['<span class="tor" style="left:' + x + 'px;--fd:' + ms + 'ms">'];
  TORCH.frames.forEach(function (f, n) {
    H.push('<img class="px f f' + n + '" src="' + pxSvg(f, TORCH.pal, false) + '" alt="">');
  });
  H.push('</span>');
  return H.join('');
}

/* 重畫之後把角色捲進畫面裡。

   走廊比視窗長的時候，重畫預設會回到最左邊——那樣按了推進之後，
   會看到走廊動了但看不到自己動。這一支讓鏡頭跟著人走。 */
/* 滑到哪裡要記住。重畫會把 innerHTML 換掉，捲軸歸零——
   不記的話你永遠滑不到廊道的另一端。 */
var SEEN_AT = {};

function keepScroll(box, key, centre) {
  if (!box) return;
  var s = SEEN_AT[key];
  if (s && s.at === centre.at) {
    /* 角色沒換位置：放回你剛剛滑到的地方 */
    box.scrollLeft = s.x; box.scrollTop = s.y;
  } else {
    box.scrollLeft = centre.x; box.scrollTop = centre.y;
    SEEN_AT[key] = { at: centre.at, x: centre.x, y: centre.y };
  }
  box.onscroll = function () {
    var k = SEEN_AT[key];
    if (k) { k.x = box.scrollLeft; k.y = box.scrollTop; }
  };
}

function scrollScene() {
  /* 廊道拖得動。每次重畫都要重掛，因為 innerHTML 被換掉了。 */
  dragScene();

  /* 走過的那一條停在最右邊——最右邊是現在。
     keepScroll 記得他拖到哪，所以往回看過的人回來還在原地。 */
  /* 剖面圖也要拖得動。它比視窗寬得多，而在桌機上原生捲動容器
     拖不動——「看不到右邊」在桌機上因此是常態。 */
  dragBox('.xsec-wrap', 'xsec');

  /* 打開的時候停在自己那一條。圖有兩千多像素寬，視窗七百五，
     而它本來從最左邊開始——排在後面的組打開這一頁看到的是別人。 */
  var xw = document.querySelector('.xsec-wrap');
  var me = xw && xw.querySelector('.xs-shaft.mine');
  if (xw && me) {
    var mx = me.offsetLeft + me.offsetWidth / 2 - xw.clientWidth / 2;
    keepScroll(xw, 'xsec', { at: me.offsetLeft, x: Math.max(0, mx), y: 0 });
  }

  var rs = document.querySelector('.rstrip');
  if (rs) {
    keepScroll(rs, 'rstrip', { at: rs.scrollWidth, x: rs.scrollWidth, y: 0 });
  }

  var box = document.querySelector('.scn-scroll');
  var hero = document.querySelector('.scn-hero');
  if (box && hero) {
    keepScroll(box, 'scn', {
      at: hero.offsetLeft,
      x: Math.max(0, hero.offsetLeft + hero.offsetWidth / 2 - box.clientWidth / 2),
      y: 0
    });
  }

  /* 地圖一樣：打開來要先看到自己那塊地，不然全班那片地上
     你得先找自己在哪裡。 */
  var mb = document.querySelector('.dig-wrap');

  /* 地層的名字放在左邊那一條裡，但地圖比視窗寬——
     一往右捲就看不見了。讓它跟著橫捲走。 */
  if (mb) {
    var zs = mb.querySelectorAll('.dig-z');
    var pin = function () {
      for (var i = 0; i < zs.length; i++) zs[i].style.left = (mb.scrollLeft + 3) + 'px';
    };
    pin();
    mb.addEventListener('scroll', pin);
  }

  var mh = mb && mb.querySelector('.dig-hero');
  if (mb && mh) {
    keepScroll(mb, 'dig', {
      at: mh.offsetLeft + ',' + mh.offsetTop,
      x: Math.max(0, mh.offsetLeft + mh.offsetWidth / 2 - mb.clientWidth / 2),
      y: Math.max(0, mh.offsetTop + mh.offsetHeight / 2 - mb.clientHeight / 2)
    });
  }
}

/* ---------- 走出去的那一下 ----------

   一學期的終點。交出去有一整場戰鬥，出去本來只是換一頁——
   這一段補上那個份量。

   一道從上面下來的光、兩邊是岩壁、人沿著光往上走出畫面。
   沒有粒子、沒有光暈：跟全作一致，硬邊、零模糊、光從上面來。

   動畫只加東西不當閘門——時鐘被凍住的時候人停在井底，還是看得見。 */
function exitScene(t) {
  var z = strataAt(Math.max(0, depthOf(t.teamId) - 1), t.teamId);
  var H = ['<div class="xit ' + z.key + '">'];

  /* 兩邊的岩壁。中間那一條是光。 */
  H.push('<div class="xit-sky"></div>');
  H.push('<div class="xit-rock l"></div>');
  H.push('<div class="xit-rock r"></div>');
  H.push('<div class="xit-beam"></div>');

  /* 地表。走出去就是走到這一條上面。 */
  H.push('<div class="xit-top"></div>');

  /* 人。背影，沿著光往上走。 */
  H.push('<div class="xit-hero">');
  H.push(pxTag(HERO.back, HERO.pal, 'ch'));
  H.push(heroPack(t.teamId));
  H.push('</div>');

  H.push('</div>');
  return H.join('');
}

/* ---------- 廊道拖得動 ----------

   本來只能靠捲軸或觸控慣性，桌機上等於不能前後看。抓著廊道拉，
   前面幾天跟後面幾天都看得到——那條廊道是這個作品的主畫面，
   看不了前後就等於只看得到一格。

   兩件要小心的事：
   一 · 拖跟點要分得開。移動超過五個像素才算拖，不然招牌與出口
        會變成點不到。
   二 · 拖完不要讓瀏覽器把它當成點擊送出去（見 click 的攔截）。 */
/* 用滑鼠把一個橫向捲動的容器拖著走。

   在手機上手指本來就滑得動，但在桌機上原生的捲動容器**拖不動**——
   只能用捲軸或 shift＋滾輪。而這個作品裡比視窗寬的東西有兩個：
   廊道與全班地下城那張剖面圖。兩個都要拖得動，而且手感要一樣。

   key 是給 keepScroll 記位置用的，兩個容器各自記各自的。 */
function dragBox(sel, key) {
  var box = document.querySelector(sel);
  if (!box || box.dataset.drag) return;
  box.dataset.drag = '1';

  var down = false, moved = false, x0 = 0, l0 = 0;

  box.addEventListener('pointerdown', function (e) {
    if (e.button) return;
    down = true; moved = false;
    x0 = e.clientX; l0 = box.scrollLeft;
  });

  box.addEventListener('pointermove', function (e) {
    if (!down) return;
    var dx = e.clientX - x0;
    if (!moved && Math.abs(dx) < 5) return;
    if (!moved) { moved = true; box.classList.add('dragging'); }
    box.scrollLeft = l0 - dx;
    /* 記住拖到哪裡，重畫之後放回去（見 keepScroll）。 */
    var k = SEEN_AT[key];
    if (k) k.x = box.scrollLeft;
    e.preventDefault();
  });

  function up() {
    down = false;
    box.classList.remove('dragging');
    /* 拖完那一下的 click 不要送出去，不然會誤觸招牌或出口。 */
    if (moved) {
      box.addEventListener('click', function stop(ev) {
        ev.stopPropagation(); ev.preventDefault();
        box.removeEventListener('click', stop, true);
      }, true);
    }
  }
  box.addEventListener('pointerup', up);
  box.addEventListener('pointercancel', up);
  box.addEventListener('pointerleave', up);
}

/* 廊道。每次重畫都要重掛，因為 innerHTML 被換掉了。 */
function dragScene() { dragBox('.scn-scroll', 'scn'); }
