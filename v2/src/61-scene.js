/* 廊道的場景。

   之前這裡是一條進度條：角色 → 幾個方格 → 魔物。它讀得懂，但它是圖表。
   這一支把它改成一個地方——有洞口、有天花板、有地板、有水晶、有火把，
   角色站在裡面而不是站在旁邊。

   幾件事是有意義的，不是裝飾：

     火把    一天一盞。推進幾次，走廊就亮幾盞——「你來過幾次」畫出來的樣子。
     腳印    走過的每一格留一個。走廊上唯一的歷史，而且它不算分。
     迷霧    從你站的地方往前蓋住。往前走一格，霧就退一格。
     魔物    藏在霧裡，越靠近越清楚。它不是敵人，是這一趟要交的東西。

   還有一件事是刻意不做的：走廊上沒有任何「你應該走到哪」的記號。
   沒有基準線，就沒有落後這回事。 */

/* 上一次畫的時候，每一組走到哪。只活在這一次使用裡——
   往前了才讓整隊滑進來一格（見 scene 裡的 stepped）。 */
var WALKED_AT = {};
/* 上一次畫的時候是走著還是坐著。換了才放一次坐下／站起來。 */
var POSE_AT = {};

var SCN = {
  TILE: 44,     /* 一天一格 */
  ENT: 132,     /* 洞口那一段 */
  END: 154,     /* 魔物站的那一段 */
  H: 286,       /* 場景高 */
  FLOOR: 66,    /* 地板上緣離底部多高——站在地上的東西都用這個 */
  /* 最窄的那一條走廊。320 的螢幕上量出來的 284——廊道不會橫向捲，
     超過這個數字的東西就是看不到。休息的隊形靠它算得下幾個人。 */
  NARROW: 284
};

/* 一條走廊。

     t     這一組
     row   現在在跑的那一個 run（可能沒有）
     st    停滯狀態 */
/* 洞口有多寬。本來每留下一個記號就寬一點，記號系統拿掉之後它是一個
   固定的數字。這一支留著是因為場景裡到處拿它算位置。 */
function entOf(teamId) {
  return SCN.ENT;
}

function scene(t, row, st, kind) {
  var ENT = entOf(t.teamId);
  var run = row && row.run;
  /* 還沒承諾任何事的時候給一段像樣的空廊道。
     第一次打開是印象最深的一次，本來它只有一格，看起來像壞掉的。 */
  var est = run ? (run.est || 1) : 7;

  /* 一條軌道，兩個東西在上面：
       moved   你來過幾天——按一下才往前一格
       tide    走廊要畫幾格。它不是「過了幾天」——dayLog 至少會排滿他
               承諾的天數（走廊要有長度），所以剛承諾的那一趟 log 就有
               四格，而過了零天。
       gone    真的過了幾天。從承諾那一天算到現在（交出去的話算到那天）。*/
  var log = run ? dayLog(run.runId) : [];
  var moved = 0, i0;
  for (i0 = 0; i0 < log.length; i0++) if (log[i0] && log[i0].kind === 'move') moved++;
  var done = run && run.state !== 'running';
  if (done) moved = Math.max(moved, run.pushes || 0);
  var tide = Math.min(log.length, est + 2);
  /* 本來底下那一行印的是 tide，所以今天剛承諾就寫「已經過了 4 天」。
     那是走廊的格數被當成日子講。 */
  var gone = run && run.committedAt
    ? daysBetween(run.committedAt, run.submittedAt || now()) : 0;
  /* 角色走到哪，看日曆不看他按了幾次——不每天開的人，角色本來會
     永遠站在洞口，看起來像壞掉。

     按一下留下的是痕跡（那一格的火把、腳印、那天動的是哪一件），
     不是位置。來過有記號，沒來也不會被擋住。 */
  var walked = Math.min(gone, est);

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
  /* 光有兩個來源，取比較暗的那一個：
       把握    他說「不太確定」，本來就看不遠
       停滯    過了自己說的天數，火會滅

     所以說「很確定」也不會讓停滯看起來沒事——它只決定起點。 */
  var sureLv = run ? ((RULES.sureOf(run.sure) || {}).light || 0) : 0;
  var light = WORLD.light[Math.max(st.level, sureLv)];
  /* 往前多畫幾格。本來只畫到承諾與過了幾天的較大者，所以拖到底就
     沒東西了。多出來的那幾格在霧裡，看不出有什麼——
     那才是還沒走到的地方該有的樣子。 */
  var AHEAD = 5;
  var span = Math.max(est, tide);          /* 這一趟的長度 */
  var draw = span + AHEAD;                 /* 畫到哪裡（多的在霧裡） */
  var W = ENT + draw * SCN.TILE + SCN.END;
  /* 走到多深，牆、地板、天花板、地上的東西、擋路的那一隻，全部跟著換。
     世界觀不寫在說明裡，寫在牆上。 */
  /* 這一趟他自己選的地方。沒有正在跑的那一趟就用現在的深度算，
     那是「還沒出發」的畫面。 */
  var zone = run && run.runId ? zoneOfRun(run, t.teamId)
    : strataAt(depthOf(t.teamId), t.teamId);

  /* 三個狀態掛在最外層。裡面每一層（遠牆、流線、火、角色）都靠
     它決定要不要動——一個地方決定，不會有兩層各自算出不同答案。 */
  /* 任務開始＝按下承諾，不是老師派下來。派了但還沒承諾的時候
     他還坐在火邊——那正是「還沒出發」。

     fresh 的那一趟 runsFor 會給一個 runId 是 null 的空殼，所以
     判斷要看 run.runId 不是 run。 */
  /* 打完那一隻，這一趟就結束了——回報交出去的那一刻牠倒下，
     之後不管是等判定還是等老師，都是在等，而等的姿勢是坐著。
     本來這兩個處境是站著的，那看起來像還沒走完。

     退回是唯一一個把他叫回路上的狀態：牠站起來，他也站起來。 */
  var walking = st.level < 2 && (kind === 'doing' || kind === 'back');
  var going = !!(run && run.runId);
  var resting = st.level < 2 && !walking &&
    (!going || kind === 'idle' || kind === 'left' || kind === 'waitexit' ||
      kind === 'stamped' || kind === 'review');
  /* 剛按下承諾那一下。go() 會清掉 DRAFT，所以旗子放在 S 上。 */
  var launch = !!S.launch;
  /* ── 昨天站在哪 ──

     角色的位置是日曆算出來的，不是按出來的。所以隔天再打開，
     整隊人直接出現在前面一格，沒有走過去的過程——「又過了一天」
     這件事只剩下卡片上的一行字。

     記住上一次畫的時候站在哪，往前了就讓整隊滑進來（.stepped）。
     只記在這一次使用裡：重新整理不會再放一次，那不是「又過了一天」。

     一次最多滑三格。離開一個禮拜再回來，滑七格會變成一段動畫表演，
     而它要說的只是「你不在的時候，隊伍往前了」。 */
  /* ── 姿勢換了 ──

     走著變成坐著，是一整隊人停下來這件事。本來它沒有過程：
     上一次重畫還在走，這一次直接坐在火邊了。

     跟往前那一格同一種做法——記住上一次的姿勢，換了才放一次。
     坐下是往下沉一段再落地，站起來是反過來。 */
  var pose = walking ? 'walk' : resting ? 'rest' : '';
  var wasPose = POSE_AT[t.teamId];
  var satdown = st.level < 2 && wasPose === 'walk' && pose === 'rest';
  var stoodup = st.level < 2 && wasPose === 'rest' && pose === 'walk';
  POSE_AT[t.teamId] = pose;

  var seenKey = t.teamId;
  var was = WALKED_AT[seenKey];
  /* 睡著的時候不滑。那個狀態的意思是很多天沒有人動過，
     讓他滑進來等於在說一件沒發生的事。 */
  var stepped = st.level < 2 && was !== undefined && walked > was;
  var fromPx = stepped ? -Math.min(3, walked - was) * SCN.TILE : 0;
  WALKED_AT[seenKey] = walked;

  var H = ['<div class="scn ' + light.key + ' z-' + zone.key +
    (walking ? ' walking' : '') + (resting ? ' resting' : '') +
    (stepped ? ' stepped' : '') +
    (satdown ? ' satdown' : '') + (stoodup ? ' stoodup' : '') +
    (launch ? ' launch' : '') + '" style="--from:' + fromPx + 'px">'];
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
    '<span>走到 ' + depthOf(t.teamId) + ' 個任務</span>' +
    /* 站得住的：老師收下才算。走是他自己的事，留下來是要有人看過的事。 */
    /* 地層的那一句說明拿掉了。它不會變、也不影響任何決定，卻是這塊
       面板上最高的一段（198×112）——把面板擐進角色活動的區域，
       壓到委託人的名牌跟你頭上那塊牌子。

       這塊面板要說的是「你在哪、多深」，不是地質。
       那一句在故事那張地圖跟門口的地層卡上都還在。 */
    '<span class="hud-seal">站得住 ' + sealedDepth(t.teamId) + ' 個</span></div>');

  /* 釘在框上、不跟著捲的兩層：近景的岩石與暗角。
     拖動廊道的時候它們不動——那一下就有視差。 */
  H.push('<div class="scn-frame"></div>');

  H.push('<div class="scn-scroll"><div class="scn-in" style="width:' + W + 'px">');

  /* 最後面那一層：更暗的磚與支撐柱。廊道不是一片牆，它有深處。 */
  /* 會往前捲的那幾層。由遠到近：底、遠牆、頭上的岩、地面的流線。
     速度差開才有深度——一起動看起來是整張圖在滑。 */
  H.push('<div class="scn-bg" style="width:' + W + 'px"></div>');
  H.push('<div class="scn-far" style="width:' + W + 'px"></div>');
  /* 前進中才會動的兩層：遠牆慢、地面的流線快。兩層速度不一樣，
     「往前」才有深度——一層一起動看起來是整張圖在滑。 */
  H.push('<div class="scn-rush" style="width:' + W + 'px"></div>');

  /* 頭上的岩。本來天花板只有幾根鐘乳石掛在空中，沒有東西讓它們掛。 */
  H.push('<div class="scn-ceil" style="width:' + W + 'px"></div>');


  /* 這一層的空氣。不帶任何資訊——哪一層已經由牆、地板、水晶的顏色
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
  /* 火把不跟著這個迴圈直接吐出去——它們要進自己那一層（見下面）。 */
  var TOR = [];
  for (var i = 0; i < span; i++) {
    var x = ENT + i * SCN.TILE;
    var on = i < walked;

    /* 火把：走過的那幾格點著。座標從洞口算起，因為那一層的原點在洞口。 */
    TOR.push(torchAt(i * SCN.TILE + 6, on, i));

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

    /* 每一格底下那個「第幾天」拿掉了。走廊上不再有任何數字——
       第幾天由火把說（亮幾盞就是來過幾天），而確切的數字在底下
       那一行用白話寫。 */

    /* 走通的地方才長得出東西，而且每一層長的不一樣（見 12-props.js）。
       全部用那一層的配色——換了地方，連地上的水晶都該換顏色。 */
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

  /* ── 牆上那一排燭火 ──

     它們釘在牆上，牆會往後退，所以它們也要往後退——本來整排是釘死的，
     背景在動而牆上的東西不動，那看起來不是走廊在移動，是背景破圖。

     位移一格是 176px（四格），跟遠牆同一個週期，所以接縫接得上。
     右邊多畫四盞填補捲走的那一段，整層裁在洞口，捲過去的不會跑到
     營火上面。 */
  for (var iX = span; iX < span + 4; iX++) TOR.push(torchAt(iX * SCN.TILE + 6, false, iX));
  H.push('<div class="scn-lamps" style="left:' + ENT + 'px;width:' + (W - ENT) +
    'px"><div class="lamps-in">' + TOR.join('') + '</div></div>');


  /* 蓋在走廊上的兩條天數標記都拿掉了：

       .vow   一條金色虛線，天花板拉到地板，畫在「你說的那一天」
       .tide  一片藍色的水，橫著漲過去，畫的是「過了幾天」

     兩個都是把一個數字拉成一條線壓在走廊上。走廊上該有的是一個人
     在走，跟他走過的痕跡——這一段全力交給那個動畫。

     數字在廊道底下那一行用字講：N 你來過、N 過了幾天、N 你說的。
     而「你說的那一天」上面還站著擋路的那一隻——牠不是一條線，
     是一個東西，而且要走到了才看得到。

     tide 這個數字留著：廊道要畫多長、霧從哪裡開始，都還是看它。 */

  /* ── 魔物 ── */
  /* 牠站在你說的那一天，不動。
     本來是 max(承諾, 過了幾天)——時間過去牠跟著往後退，
     所以你永遠追不上，也永遠不會走過牠。 */
  /* 牠只在走到底之後出現：走滿了自己說的天數，或者這一趟已經交出去。
     還在路上的時候前面是霧——不是一隻站在那裡等你的東西。 */
  /* 用 metRun：畫面上看得到牠的那一刻，就是圖鑑記下的那一刻
     （見 40-db.js）。本來這裡自己列狀態，而列的那幾個裡面
     'stamped' 根本不是一個 state（那是 nextThing 回的字），
     真正的是 'judged'——所以那一條永遠不成立，靠 walked>=est 撐著。 */
  var arrived = metRun(run);
  /* 東西交出去了他就不在那裡了——他要的拿到了，人就走了。
     老師退回來的那一趟，他站回去：那份東西還沒真的送到。

     這個判斷不能寫進 metRun：圖鑑算的是「遇到」，遇到過就是遇到過，
     他還在不在路上是另一件事。 */
  var handed = !!(run && (run.state === 'judged' || run.state === 'submitted' ||
    run.state === 'done'));
  if (arrived && !handed) H.push(sceneMob(t, row, 1, est, ENT));

  /* ── 盡頭的岩壁裡有東西 ──

     這一趟走完、把記號插進去的那一下會敲開這一層的水晶。
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
       交出去、等老師　坐著　東西送到了，這一趟結束，回火邊
       老師退回來了　　走路　牠站起來了，路還沒走完
       沒有任務　　　　坐著　營火旁邊。那是休息，不是罰站
       很多天沒動　　　睡著

     停下來不是停止：坐著跟站著都有兩幀，差在呼吸，火也一直在動。 */
  /* walking／resting 在最上面算過了。 */
  /* 火釘在洞口的 left:11，寬 44。人坐在火的右邊一點。 */
  var hx = resting ? 44 : ENT + walked * SCN.TILE - 11;
  /* ── 同一組的其他人 ──

     一隊人走在同一條廊道上。四件事決定它看起來是一隊人還是一排複製品：

     一 · 幀。每個人兩張圖輪流亮。本來只有 .scn-hero 底下寫了那條規則，
          隊友的兩張是靜止的、而且並排畫兩次——一個人佔兩個人的寬，
          整隊都是凍住的。現在隊友跟你用同一套（見 53-scene.css）。

     二 · 相位。腳步照隊伍順序一個個晚一拍——那是一列人在走。
          呼吸不排隊，各自散開；不然停下來的時候整排會像波浪一起起伏。

     三 · 間距。等距的一排是輸送帶。每個人偏 -11／0／+11，
          偏多少由他的 id 決定，所以同一個人每次都站在同一個位置。
          全部落在 11 的倍數上——圖是 16 格畫成 66px，一格 4.13px，
          不對齊格子的偏移只會看起來像沒對準。

     四 · 疊法。最遠的先畫，近的蓋上去，你最後畫。本來反過來，
          排在最後面的人蓋在最前面的人身上。 */
  var mates = where('Users', function (u) {
    return inTeam(u, t.teamId) && u.userId !== S.who;
  });
  /* 後面放得下多寬。放不下就整隊縮，縮到 22 為止——
     人多的時候擠在一起，好過有人被推到牆外面。

     休息的時候人排在你右邊。那一邊看起來很寬，但廊道不會橫向捲，
     所以能用的只有最窄那一條的寬度——六個人在 320 的螢幕上，
     本來最後兩個會被切在畫面外。 */
  var room = resting
    ? Math.max(0, SCN.NARROW - hx - 66)
    : Math.max(0, hx - 6);
  var gap = SCN.TILE;
  if (mates.length) {
    gap = Math.min(SCN.TILE, Math.floor(room / mates.length / 11) * 11);
    if (gap < 22) gap = 22;
  }
  /* 間距夠寬才偏——已經擠成一團的時候再偏只會亂。 */
  var sway = gap >= SCN.TILE ? 11 : 0;
  var acc = 0;
  var line = mates.map(function (mu, i) {
    acc += gap + (sway ? (hash(mu.userId) % 3 - 1) * sway : 0);
    return {
      u: mu,
      x: resting ? (hx + acc) : Math.max(6, hx - acc),
      /* 腳步：往隊伍後面一個個晚一拍。呼吸：各自散開。 */
      md: (i + 1) * 110,
      bd: hash(mu.userId + 'b') % 7 * 200,
      /* 坐著的時候換幀的快慢。走路是一起踏的，呼吸不是——
         一群人坐在火邊同一個節奏起伏，看起來像同一個人複製了五份。 */
      bt: [1500, 1900, 2300][hash(mu.userId + 't') % 3]
    };
  });
  /* 最遠的先畫。 */
  line.reverse().forEach(function (p) {
    var mh = heroOf(p.u);
    H.push('<div class="hero scn-mate' + (st.level >= 2 ? ' asleep' : '') +
      (walking ? ' walking' : '') + (resting ? ' resting' : '') +
      '" style="left:' + p.x + 'px;--md:' + p.md + 'ms;--bd:' + p.bd +
      'ms;--sd:' + p.md + 'ms;--bt:' + p.bt + 'ms" data-u="' +
      esc(p.u.userId) + '" title="' + esc(p.u.name || '') + '">');
    if (walking) {
      H.push(pxTag(mh.walkA, mh.pal, 'ch wf wa'));
      H.push(pxTag(mh.walkB, mh.pal, 'ch wf wb'));
    } else if (resting) {
      H.push(pxTag(mh.sitA, mh.pal, 'ch wf wa'));
      H.push(pxTag(mh.sitB, mh.pal, 'ch wf wb'));
    } else if (st.level >= 2) {
      H.push(pxTag(mh.sleep, mh.pal, 'ch'));
    } else {
      H.push(pxTag(mh.idleA, mh.pal, 'ch wf wa'));
      H.push(pxTag(mh.idleB, mh.pal, 'ch wf wb'));
    }
    H.push('</div>');
  });

  H.push('<div class="hero scn-hero' + (st.level >= 2 ? ' asleep' : '') +
    (walking ? ' walking' : '') + (resting ? ' resting' : '') +
    '" style="left:' + hx + 'px;--bt:' +
    [1500, 1900, 2300][hash(String(S.who) + 't') % 3] + 'ms">');
  /* 頭上寫他在幹嘛。本來只靠姿勢，而姿勢在 66px 上看不太出來——
     寫出來最快，而且它同時說明了「現在沒事做」是一個正常狀態。 */
  /* 牌子跟著姿勢走。「待命」本來蓋掉三個很不一樣的處境——
     還沒出發、在等老師、老師勾了。分開講。 */
  /* 講得出來的那幾個處境排在前面，前進中／休息中是兜底的那一句。
     反過來的話「委託完成」跟「沒有任務」會共用「休息中」——
     姿勢一樣不代表發生的事一樣。 */
  var tag = st.level >= 2 ? '停很久了'
    : kind === 'commit' ? '還沒出發'
    : kind === 'stamped' ? '委託完成'
    : kind === 'review' ? '在等老師'
    : kind === 'back' ? '再走一次'
    : walking ? '前進中'
    : resting ? '休息中'
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
  H.push('<div class="halo" style="left:' + (hx - 165) + 'px"></div>');

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
  }

  /* ── 暗 ──

     一層暗蓋住整條走廊，在他手上那盞燈的位置挖一個洞。

     本來這裡是 .fog：從站的地方往右蓋住「還沒走的那幾天」。
     那是同一件事的一半——真正的理由不是「那幾天還沒到」，
     是「那裡沒有光」。所以改成從燈往四面暗下去，
     而還沒走到的地方自然就在暗裡。

     洞有多大由 WORLD.light 那三階決定（.scn.lit／.dim／.dark），
     所以超過自己說的天數，你看得到的範圍真的會縮。

     z-index 5：壓在魔物（4）上面、角色（6）下面——牠被暗吃掉，
     走到了才浮出來；而他自己一直在洞裡。 */
  H.push('<div class="veil" style="--lx:' + (hx + 33) + 'px"></div>');

  H.push('</div></div>');   /* scn-in / scn-scroll */

  H.push('</div>');         /* scn */

  /* 底下那一行：三句白話。

     本來寫的是「2 你來過　5 過了幾天　5 你說的」——每一個都是
     半句話，要自己補完才知道在講什麼（你來過⋯哪裡？你說的⋯什麼？）。
     改成三句講得完的話，數字夾在句子中間。

     「說沒動」那一項不放回來：說那句話的那一顆鍵（actRest）現在
     沒有任何地方按得到，所以它永遠是 0。

     它掛在廊道外面。負邊界是為了往上貼住廊道，寫在 .scn 裡面的話
     會被 overflow:hidden 吸到頂上去。 */
  /* 承諾過才有數字。fresh 的那一趟 runsFor 會給一個 runId 是 null 的
     空殼，所以這裡本來會印出「你說要 1 天／已經過了 0 天／你來了 0 天」——
     三個都是假的，而且它出現在他還沒決定要走幾天的那個畫面上。 */
  if (run && run.runId) {
    H.push('<div class="scn-foot">');
    H.push('<span class="sf est"><i>你說要</i><b>' + est + '</b><i>天</i></span>');
    H.push('<span class="sf days"><i>已經過了</i><b>' + gone + '</b><i>天</i></span>');
    /* 「你來了 N 天」拿掉了：那是一個每天登入的計數，而這個系統
       不要求每天登入。判定只讀兩個數字，第三個數字擺在它們旁邊，
       看起來就像也會被算進去。

       來過的痕跡還在廊道上（走過的那幾格點著火把），
       但它不再被寫成一個分數。 */
    H.push('</div>');
  }
  return H.join('');
}

/* 背上本來背著拿到的那幾張證。那件事改由洞口的營地講——
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
/* 洞口。招牌、營火、往上的光——全部在這裡，而且一直在。

   為什麼要一直在：沒觸發過的東西等於不存在。一個學生如果從來沒有
   失準過，他整學期不會知道有營火這個地方。所以它們在那裡，
   只是沒點著——「看得到但還沒發生」跟「不存在」是兩件事。 */
function sceneMouth(t, next, ENT, resting) {
  var sg = signOf(t.teamId);
  var H = ['<div class="mouth" style="width:' + (ENT || SCN.ENT) + 'px">'];

  /* 往上的光：出口。一直看得見，但門是老師開的——沒開的時候
     它就只是一道光，不是一顆按得動的鈕。

     「看得到但還沒發生」跟「不存在」是兩件事，所以光一直在；
     而廊道上那一排已經有一扇看得見的、鎖著的門在講同一件事，
     兩個入口兩套規則反而更難懂。 */
  if (t.exitOk || t.leftAt) {
    H.push('<button class="shaft open" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'go:exit' })) +
      '\' title="' + esc('出口：老師開了，從這裡上去') + '"></button>');
  } else {
    H.push('<span class="shaft' + (t.exitAsk ? ' said' : '') + '" title="' +
      esc(t.exitAsk ? '出口：在等老師開門' : '出口：要老師開才走得出去') +
      '"></span>');
  }
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

  /* 營地那一排記號拿掉了：記號系統整個收掉（見 40-db.js actApprove）。
     一趟走完留下什麼，由帶子、圖鑑、以及走廊變長來說。 */

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
  /* 他照自己那一區的顏色，不照學生走到哪一區。

     本來是跟著那一趟的地方走（他是那裡的東西）。現在他是委託人——
     一個人不會因為你走哪一條路過去就換一種顏色。換一個地方遇到他，
     他還是他。 */
  var pal = mobZone(mob).pal;
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
  H.push('<div class="scn-mob meet can" style="left:' + x + 'px" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'go:patron:' + mob.n })) + '\'>');
  H.push(patTag(mob, pal, 'ch'));
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

   它們不帶任何資訊，也不能帶：這一層是哪一層，牆、地板、水晶的顏色
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
  /* 他偶爾說一句。每次重畫都要重掛——innerHTML 整個換掉了。 */
  osTick();

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
   廊道與班級地下城那張剖面圖。兩個都要拖得動，而且手感要一樣。

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

/* ---------- 他偶爾說一句 ----------

   借的是角色頭上那一塊牌子：本來寫「前進中」，說話的時候換成那一句，
   說完換回來。一個位置兩種內容——所以它在結構上不可能跟別的字疊到，
   不是靠位置算得剛好。

   只有走著或坐著的時候才說。停很久、在等老師、退回來了那幾種狀態，
   畫面上已經有一句更要緊的話，他不該在旁邊插嘴。

   每一次重畫都要重掛，因為 innerHTML 整個換掉了。 */
var OS_T = null;
function stopOS() { if (OS_T) { clearTimeout(OS_T); OS_T = null; } }

function osTick() {
  stopOS();
  var tag = document.querySelector('.scn .hero-tag');
  if (!tag) return;
  var scn = document.querySelector('.scn');
  var walking = scn.className.indexOf('walking') >= 0;
  var resting = scn.className.indexOf('resting') >= 0;
  if (!walking && !resting) return;
  /* 過了自己說的那幾天：光暗一階（WORLD.light[1].key === 'dim'），
     他身上開始爬藤蔓。那個時候還在走，但講「又是沒看過的新風景」
     就很怪——所以換一組話。

     睡著的那一階（dark）連走都不走了，上面那一行已經 return，
     所以睡著的人不說話。 */
  var mode = scn.className.indexOf('dim') >= 0 ? 'over'
    : (walking ? 'walk' : 'rest');

  /* 隊友臨時長出來的那一塊要跟你頭上那一塊長一樣——
     顏色跟著姿勢走（.go／.rest），不是另外一種東西。 */
  var cls = tag.className;

  /* 這一句是誰說的，每一次重挑。

     本來永遠是你。而廊道上站著一整組人，只有你會出聲——
     其他人因此像佈景，不像同行的人。

     挑到誰就說誰那個職業的話：法師講知識，忍者結尾加「是也」。
     所以「這一句是誰說的」看得出來，不用寫名字。 */
  function speakers() {
    var box = document.querySelector('.scn');
    if (!box) return [];
    var out = [];
    var h = box.querySelector('.scn-hero');
    if (h) out.push({ el: h, u: me(), tag: h.querySelector('.hero-tag') });
    [].forEach.call(box.querySelectorAll('.scn-mate'), function (el) {
      /* 睡著的人不說話——整組都停很久了，這裡本來就 return 掉了，
         留這一行是因為姿勢跟狀態不是同一件事。 */
      if (el.className.indexOf('asleep') >= 0) return;
      var u = userOf(el.getAttribute('data-u'));
      if (u) out.push({ el: el, u: u, tag: null });
    });
    return out;
  }

  function say() {
    var who = speakers();
    if (!who.length) return stopOS();
    var pick = who[Math.floor(Math.random() * who.length)];
    var line = heroLine(pick.u, mode);
    if (!line) return stopOS();

    /* 你頭上本來就有一塊牌子，借它來說話（說完換回原本那幾個字）。
       隊友頭上沒有牌子——那是「你」的東西——所以臨時長一塊出來，
       說完拿掉。他們因此還是沒有狀態牌，只是會出聲。 */
    var t = pick.tag;
    var made = !t;
    /* 隊友開口的時候，你頭上那塊牌子先讓開。

       以前只有你會說話，而你說話是把牌子上的字換掉——一個位置兩種內容，
       所以不可能疊到。隊友頭上多長一塊之後就會了：兩個人只差 44px，
       而一句話最寬 264px（量到疊了 90×33）。

       那一條帶子一次只放一句話。 */
    var box0 = document.querySelector('.scn');
    if (made && box0) box0.className += ' matetalk';
    var back = '', kls = cls;
    if (made) {
      t = document.createElement('div');
      t.className = cls;
      pick.el.appendChild(t);
    } else {
      back = t.textContent;
      kls = t.className;
    }
    t.textContent = line;
    t.className = kls + ' os';
    /* 放得下才放得進去。

       泡泡從角色身上長出去，而廊道是一個會捲的窗——他站在窗的哪裡，
       左右各剩多少，每一次都不一樣。而 .scn 是 overflow:hidden，
       落在窗外的字是被切掉，不是跑版。

       所以量兩邊剩多少，往寬的那一邊長，寬度收到那一邊放得下為止。
       這件事只有量得到位置的時候算得出來，所以它在這裡不在 CSS 裡。 */
    var box = document.querySelector('.scn');
    if (box) {
      var br = box.getBoundingClientRect();
      var hr = pick.el.getBoundingClientRect();
      var roomR = br.right - hr.left - 11;
      var roomL = hr.right - br.left - 11;
      var left = roomL > roomR;
      var room = Math.max(roomL, roomR);
      t.style.maxWidth = Math.max(132, Math.min(264, room)) + 'px';
      t.className = kls + ' os' + (left ? ' os-l' : '');
    }
    OS_T = setTimeout(function () {
      if (made) {
        if (t.parentNode) t.parentNode.removeChild(t);
        var b2 = document.querySelector('.scn');
        if (b2) b2.className = b2.className.replace(' matetalk', '');
      } else {
        var u2 = document.querySelector('.scn .scn-hero .hero-tag');
        if (!u2) return stopOS();
        u2.textContent = back;
        u2.className = kls;
        u2.style.maxWidth = '';
      }
      OS_T = setTimeout(say, 12000 + Math.random() * 11000);
    }, 4200);
  }

  /* 第一句別在打開的同一秒冒出來——那看起來像通知，不像自言自語。 */
  OS_T = setTimeout(say, 6000 + Math.random() * 7000);
}
