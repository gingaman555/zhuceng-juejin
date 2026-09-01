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
function scene(t, row, st) {
  var run = row && row.run;
  var est = run ? (run.est || 1) : 4;
  var at = run ? Math.min(run.pushes, est) : 0;
  var done = run && run.state !== 'running';
  var walked = done ? est : at;
  var seed = t.teamId + (run ? '|' + run.runId : '');
  /* 每一格頭上掛的是那一天做了什麼。走廊因此讀得出形狀——
     七格全是 🔍 跟七格全是 🛠️ 是完全不同的一趟。 */
  var did = run ? doingOfRun(run.runId) : [];
  var light = WORLD.light[st.level];
  var W = SCN.ENT + est * SCN.TILE + SCN.END;
  /* 走到多深，牆就是哪一區的石頭。世界觀不寫在說明裡，寫在牆上。 */
  var zone = strataAt(depthOf(t.teamId));

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
      pxTag(dp.px, DRIP.pal, '') + '</span>');
  }

  /* ── 洞口 ── */
  H.push(sceneMouth(t));

  /* ── 地板 ── */
  H.push('<div class="floor" style="left:0;width:' + W + 'px"></div>');
  /* 走過的那一段地板是打通的，亮一階 */
  if (walked > 0) {
    H.push('<div class="floor lit" style="left:' + SCN.ENT + 'px;width:' +
      (walked * SCN.TILE) + 'px"></div>');
  }

  /* ── 一天一格 ── */
  for (var i = 0; i < est; i++) {
    var x = SCN.ENT + i * SCN.TILE;
    var on = i < walked;

    /* 火把：走過的那幾格點著 */
    H.push(torchAt(x + 6, on, i));

    /* 腳印 */
    if (on) H.push('<img class="px foot" style="left:' + (x + 11) + 'px" src="' +
      pxSvg(STEP_PX.px, STEP_PX.pal, false) + '" alt="">');

    /* 那一天做了什麼 */
    if (on && did[i]) {
      var dd = RULES.doingOf(did[i]);
      if (dd) H.push('<span class="doing" style="left:' + x + 'px" title="' +
        esc(dd.label) + '">' + dd.icon + '</span>');
    }

    /* 第幾天 */
    H.push('<span class="dayn' + (i === walked ? ' here' : (on ? ' past' : '')) +
      '" style="left:' + x + 'px">' + (i + 1) + '</span>');

    /* 走通的地方才長得出東西 */
    if (on) {
      var p = propFor(seed, i);
      if (p === 'rubble') H.push('<img class="px prop rubble" style="left:' + (x + 5) +
        'px" src="' + pxSvg(RUBBLE.px, RUBBLE.pal, false) + '" alt="">');
      if (p === 'crystal') H.push('<img class="px prop cry" style="left:' + (x + 22) +
        'px" src="' + pxSvg(CRYSTAL.px, CRYSTAL.pal, false) + '" alt="">');
      if (p === 'shroom') H.push('<img class="px prop shr" style="left:' + (x + 22) +
        'px" src="' + pxSvg(SHROOM.px, SHROOM.pal, false) + '" alt="">');
    }
  }

  /* ── 魔物 ── */
  if (run) H.push(sceneMob(t, row, walked / est));

  /* ── 角色 ── */
  var pose = st.level >= 2 ? HERO.sleep : HERO.idle;
  var hx = SCN.ENT + walked * SCN.TILE - 11;
  H.push('<div class="hero scn-hero' + (st.level >= 2 ? ' asleep' : '') +
    '" style="left:' + hx + 'px">');
  H.push(pxTag(pose, HERO.pal, 'ch'));
  if (st.level === 1) H.push(pxTag(VINE.px, VINE.pal, 'vine'));
  H.push('</div>');

  /* 角色手上那一盞的光。一圈一圈地暗下去，不是模糊的漸層——
     模糊的話它會立刻看起來像貼在像素圖上面的現代特效。 */
  H.push('<div class="halo" style="left:' + (hx - 121) + 'px"></div>');

  /* ── 霧 ──
     從站的地方往前蓋住。它蓋的是「還沒走的那幾天」，
     所以往前一格霧就退一格。 */
  var fogAt = SCN.ENT + (walked + 1) * SCN.TILE;
  if (fogAt < W) {
    H.push('<div class="fog" style="left:' + fogAt + 'px"></div>');
  }

  H.push('</div></div>');   /* scn-in / scn-scroll */
  H.push('</div>');         /* scn */
  return H.join('');
}

/* ---------- 洞口 ----------
   左邊是你進來的地方：拱門、從上面落下來的光、掛著的招牌。
   招牌就在這裡，不在標題列——它是廊道入口的看板，不是頁首。 */
function sceneMouth(t) {
  var sg = signOf(t.teamId);
  var H = ['<div class="mouth" style="width:' + SCN.ENT + 'px">'];
  H.push('<div class="shaft"></div>');
  H.push('<div class="arch"></div>');
  H.push('<div class="hang">');
  H.push('<div class="chain"></div>');
  H.push(pxTag(sg.px, sg.pal, 'sign'));
  H.push('</div>');
  H.push('<div class="mouth-txt"><b>' + esc(t.project || '（還沒定）') + '</b>' +
    '<span>' + esc(sg.name) + '</span></div>');
  H.push('</div>');
  return H.join('');
}

/* ---------- 魔物 ----------
   站在走廊盡頭。清楚到什麼程度跟你走了多少有關——
   剛出發的時候只看得到一團影子，走到底才看得清牠長什麼樣。 */
function sceneMob(t, row, prog) {
  var mob = mobFor(row.ms.msId, t.teamId);
  var pal = strataAt(depthOf(t.teamId)).pal;
  var x = SCN.ENT + (row.run.est || 1) * SCN.TILE + 33;
  var H = [];
  /* 任務牌不在魔物那一層——魔物要藏在霧裡，要交什麼不可以。 */
  H.push('<div class="goal" style="left:' + x + 'px">' + esc(row.ms.title) + '</div>');
  H.push('<div class="scn-mob" style="left:' + x + 'px;opacity:' +
    (0.40 + 0.60 * prog).toFixed(2) + '">');
  H.push(pxTag(mob.px, pal, 'ch'));
  H.push('<span class="mobn">' + esc(mob.n) + '</span>');
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
function scrollScene() {
  var box = document.querySelector('.scn-scroll');
  var hero = document.querySelector('.scn-hero');
  if (!box || !hero) return;
  var want = hero.offsetLeft + hero.offsetWidth / 2 - box.clientWidth / 2;
  box.scrollLeft = Math.max(0, want);
}
