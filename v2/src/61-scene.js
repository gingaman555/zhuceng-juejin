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
function scene(t, row, st, kind) {
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
  var span = Math.max(est, tide);
  var W = SCN.ENT + span * SCN.TILE + SCN.END;
  /* 走到多深，牆、地板、天花板、地上的東西、擋路的那一隻，全部跟著換。
     世界觀不寫在說明裡，寫在牆上。 */
  var zone = strataAt(depthOf(t.teamId), t.teamId);

  var H = ['<div class="scn ' + light.key + ' z-' + zone.key + '">'];


  /* 固定在角落的深度。走廊往旁邊捲，它不跟著捲——
     那是「你在多深的地方」，不是走廊上的一個位置。 */
  H.push('<div class="scn-hud">' +
    '<em>' + esc(zone.name) + '</em>' +
    '<b>' + (depthOf(t.teamId) * WORLD.depthPerMilestone) + ' m</b>' +
    '<span>走完 ' + depthOf(t.teamId) + ' 個里程碑</span>' +
    '<span class="zn-note">' + esc(zone.note) + '</span></div>');

  H.push('<div class="scn-scroll"><div class="scn-in" style="width:' + W + 'px">');

  /* ── 天花板：鐘乳石 ── */
  for (var d = 0; d < Math.ceil(W / 44); d++) {
    var dp = dripFor(seed, d);
    if (!dp) continue;
    H.push('<span class="drip" style="left:' + (d * 44 + dp.off) + 'px">' +
      pxTag(dp.px, zone.pal, '') + '</span>');
  }

  /* ── 洞口 ── */
  H.push(sceneMouth(t, { kind: kind }));

  /* ── 地板 ── */
  H.push('<div class="floor" style="left:0;width:' + W + 'px"></div>');
  if (walked > 0) {
    H.push('<div class="floor lit" style="left:' + SCN.ENT + 'px;width:' +
      (walked * SCN.TILE) + 'px"></div>');
  }

  /* ── 一天一格 ── */
  for (var i = 0; i < span; i++) {
    var x = SCN.ENT + i * SCN.TILE;
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

  /* ── 時間漲上來的水 ──
     一天一格，你按不按它都會漲。水在你後面＝走在自己承諾的前面；
     淹到腳邊＝剛好；過去了＝會比說的久，而且好幾天前就看得到。
     它不扣任何東西，走到底一樣可以交——它只是把時間畫出來。 */
  if (run && tide > 0) {
    H.push('<div class="tide" style="left:' + SCN.ENT + 'px;width:' +
      (tide * SCN.TILE) + 'px"></div>');
    H.push('<div class="tide-edge" style="left:' + (SCN.ENT + tide * SCN.TILE - 4) + 'px"></div>');
  }

  /* ── 魔物 ── */
  if (run) H.push(sceneMob(t, row, Math.min(1, walked / est), span));

  /* ── 角色 ── */
  /* 接了任務就往前走，沒有任務就在營火旁邊坐下來。

     停下來不是停止：坐著那兩幀差在呼吸，火也一直在動。
     而且營地是休息的地方，不是罰站的地方——
     沒有任務的時候本來就該是這個樣子。

     睡著是另一回事：那是有任務但很多天沒有動。 */
  var walking = run && st.level < 2;
  var resting = !run && st.level < 2;
  /* 火釘在洞口的 left:11，寬 44。人坐在火的右邊一點。 */
  var hx = resting ? 44 : SCN.ENT + walked * SCN.TILE - 11;
  H.push('<div class="hero scn-hero' + (st.level >= 2 ? ' asleep' : '') +
    (walking ? ' walking' : '') + (resting ? ' resting' : '') +
    '" style="left:' + hx + 'px">');
  /* 頭上寫他在幹嘛。本來只靠姿勢，而姿勢在 66px 上看不太出來——
     寫出來最快，而且它同時說明了「現在沒事做」是一個正常狀態。 */
  H.push('<div class="hero-tag' + (walking ? ' go' : resting ? ' rest' : '') +
    '">' + (walking ? '前進中' : resting ? '休息中' :
      st.level >= 2 ? '停很久了' : '待命') + '</div>');
  if (walking) {
    H.push(pxTag(HERO.walkA, HERO.pal, 'ch wf wa'));
    H.push(pxTag(HERO.walkB, HERO.pal, 'ch wf wb'));
  } else if (resting) {
    H.push(pxTag(HERO.sitA, HERO.pal, 'ch wf wa'));
    H.push(pxTag(HERO.sitB, HERO.pal, 'ch wf wb'));
  } else {
    H.push(pxTag(st.level >= 2 ? HERO.sleep : HERO.idle, HERO.pal, 'ch'));
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
    H.push('<div class="vow" style="left:' + (SCN.ENT + est * SCN.TILE) +
      'px"><span>你說的</span></div>');
  }

  /* ── 霧 ──
     從站的地方往前蓋住。它蓋的是「還沒走的那幾天」，
     所以往前一格霧就退一格。 */
  var fogAt = SCN.ENT + (Math.max(walked, tide) + 1) * SCN.TILE;
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

/* 角色背上背著的東西。

   這個系統裡拿得到的東西只有一種：封存過的岩心。所以背上背的就是它們——
   一趟一根，學期越後面背得越滿。那不是裝飾，那是「你帶著什麼在走」。

   它不加速、不擋失準、不換任何東西（一旦能換到好處，人就為好處做事）。
   它只有一個作用：走著走著，你身上的東西變多了。

   最多畫四根。再多背上就是一團色塊，看不出那是幾根樣本。 */
/* 照面那一頁上的自己。跟廊道裡走的是同一個人、同一身裝備——
   不然那一下就不是「我上去」，只是一張圖。 */
function heroTag(teamId) {
  return '<div class="hero duel-h">' + pxTag(HERO.idle, HERO.pal, 'ch') +
    heroPack(teamId) + '</div>';
}

function heroPack(teamId) {
  var ks = keepsOf(teamId);
  if (!ks.length) return '';
  var show = ks.slice(-4);
  var H = ['<div class="hpack" title="' + esc('背上的岩心 ' + ks.length + ' 根') + '">'];
  show.forEach(function (k, i) {
    var z = STRATA[0];
    STRATA.forEach(function (x) { if (x.key === k.zone) z = x; });
    H.push('<img class="px hp" style="left:' + (i * 5) + 'px;bottom:' + (i * 3) +
      'px" src="' + pxSvg(k.px || coreOf(k.runId), z.pal, false) + '" alt="">');
  });
  H.push('</div>');
  return H.join('');
}

/* ---------- 洞口 ----------
   左邊是你進來的地方：拱門、從上面落下來的光、掛著的招牌。
   招牌就在這裡，不在標題列——它是廊道入口的看板，不是頁首。 */
/* 洞口。招牌、營火、岩心架、往上的光——全部在這裡，而且一直在。

   為什麼要一直在：沒觸發過的東西等於不存在。一個學生如果從來沒有
   失準過，他整學期不會知道有營火這個地方；一個還沒封存過的人不會
   知道岩心架是什麼。所以它們在那裡，只是沒點著——
   「看得到但還沒發生」跟「不存在」是兩件事。 */
function sceneMouth(t, next) {
  var sg = signOf(t.teamId);
  var kind = next && next.kind;
  var ks = keepsOf(t.teamId);
  var H = ['<div class="mouth" style="width:' + SCN.ENT + 'px">'];

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
  H.push('<div class="mouth-txt"><b>' + esc(t.project || '（還沒定）') + '</b></div>');

  /* 營火。兩趟之間點著——那時候人坐在旁邊。

     本來是「判定失準才點著」，但那個分岔在改成
     『每一次交出去之前都省思』的時候拿掉了，所以它再也不會亮，
     變成一堆死掉的內容。改成休息的時候點著，才是它本來的意思：
     營地是休息的地方，不是罰站的地方。 */
  var lit = !next || !next.run;
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

  /* 岩心架。封存過的掛在這裡，一根都沒有的時候是空架子。 */
  H.push('<button class="mrack" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: 'go:pack' })) + '\' title="' +
    esc(ks.length ? '岩心架：' + ks.length + ' 根' : '岩心架（還是空的）') + '">');
  if (ks.length) {
    ks.slice(-3).forEach(function (k) {
      var kz = STRATA[0];
      STRATA.forEach(function (x) { if (x.key === k.zone) kz = x; });
      H.push(pxTag(k.px || coreOf(k.runId), kz.pal, 'mcore'));
    });
  } else {
    H.push('<i></i><i></i><i></i>');
  }
  H.push('</button>');

  H.push('</div>');
  return H.join('');
}

/* ---------- 魔物 ----------
   站在走廊盡頭。清楚到什麼程度跟你走了多少有關——
   剛出發的時候只看得到一團影子，走到底才看得清牠長什麼樣。 */
function sceneMob(t, row, prog, span) {
  var mob = mobOfRun(row.run);
  var pal = strataAt(depthOf(t.teamId), t.teamId).pal;
  var x = SCN.ENT + span * SCN.TILE + 33;
  /* 這裡本來還掛一塊寫著里程碑名字的木牌。拿掉了：它浮在半空、會壓到
     角落那一塊，而且那個名字底下那張卡已經有一次——同一件事說兩遍，
     其中一遍看起來就會像壞掉的東西。 */
  var H = [];
  /* 名字要走到一半才看得清。

     本來牠的名字從第一天就寫在那裡——那等於一趟開始就把唯一的未知
     揭曉了。現在前半段只有一團形狀跟一排問號，走近了名字才浮出來。
     每一趟因此有一條小小的線從頭拉到尾。 */
  var near = prog >= 0.5;
  H.push('<div class="scn-mob" style="left:' + x + 'px;opacity:' +
    (0.30 + 0.70 * prog).toFixed(2) + '">');
  H.push(pxTag(mob.px, pal, 'ch'));
  H.push('<span class="mobn' + (near ? '' : ' hid') + '">' +
    (near ? esc(mob.n) : '？？？') + '</span>');
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
