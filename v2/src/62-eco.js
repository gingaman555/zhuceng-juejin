/* 全班地下城：2.5D 蟻巢剖面。

   這是「關聯性」那根柱子的全部。它要做到一件事，而且只有這一件：
   讓你看得到別人也在坑道裡——不比較、不排名、不知道誰比較好。

   所以它畫的是空間，不是名次。每一組往下挖自己的一條豎坑，深度是
   走完幾個里程碑。坑道之間沒有共同的終點線，因為每一組的專案不一樣。

   立體感來自每一塊右邊的側面，不是把整條坑道斜著推——正交的長條看起來
   像進度表，有側面的豎坑看起來像地下城。 */

var ECO_W = 128;     /* 一條坑道的寬 */
var ECO_SEG = 46;    /* 一格深度的高 */
/* 立體感靠每一塊右邊的側面（見 50-style.css 的 .seg::after），
   不是把整塊往旁邊推——推的話四格之後就壓到隔壁那條坑道了。 */

function ecoScene(rows, meId) {
  var maxD = Math.max(4, rows.reduce(function (a, r) {
    return Math.max(a, r.depth + (r.at > 0 ? 1 : 0));
  }, 0));
  var H = ecoHeight(maxD);

  var out = ['<div class="eco2" style="height:' + (H + 96) + 'px">'];

  /* 地表 */
  out.push('<div class="eco2-sky"><span>地表</span></div>');

  /* 深度刻度：只標數字，不標「應該到哪」 */
  for (var d = 1; d <= maxD; d++) {
    out.push('<div class="eco2-rule" style="top:' + (ecoTop(d) + 48) + 'px">' +
      '<span>' + (d * WORLD.depthPerMilestone) + ' m</span></div>');
  }

  /* 每一組一條豎坑 */
  rows.forEach(function (r, i) {
    out.push(ecoShaft(r, i, maxD, r.teamId === meId));
  });

  out.push('</div>');
  return out.join('');
}

function ecoTop(d) { return d * ECO_SEG; }
function ecoHeight(maxD) { return ecoTop(maxD) + ECO_SEG; }

/* 一條坑道 */
function ecoShaft(r, i, maxD, mine) {
  var x = i * (ECO_W + 18);
  var H = [];
  H.push('<div class="shaft' + (mine ? ' mine' : '') + '" style="left:' + x + 'px">');

  /* 坑道口的招牌 */
  var sg = SIGNS[r.sign] || SIGNS.wood;
  H.push('<div class="shaft-head">');
  H.push(pxTag(sg.px, sg.pal, 'sign-s'));
  H.push('<b>' + esc(r.name) + '</b>');
  H.push('<span>' + esc(r.project || '（還沒定）') + '</span>');
  H.push('</div>');

  /* 挖出來的每一格。垂直對齊，立體感靠 CSS 給的側面。 */
  for (var d = 1; d <= maxD; d++) {
    var dug = d <= r.depth;
    var here = d === r.depth + 1 && r.at > 0;
    H.push('<div class="seg' + (dug ? ' dug' : '') + (here ? ' here' : '') + '"' +
      ' style="top:' + ecoTop(d - 1) + 'px">');
    if (here) {
      /* 正在挖的那一格：填到承諾的比例 */
      H.push('<i style="height:' + Math.round(r.at * 100) + '%"></i>');
    }
    H.push('</div>');
  }

  /* 小人站在最深的那一格 */
  var at = r.depth + (r.at > 0 ? 1 : 0);
  var pose = r.stall >= 2 ? HERO.sleep : HERO.idle;
  H.push('<div class="shaft-hero ' + (r.stall >= 2 ? 'sleep' : r.stall === 1 ? 'vine' : '') + '"' +
    ' style="top:' + (ecoTop(Math.max(0, at - 1)) + 4) + 'px">');
  H.push(pxTag(pose, HERO.pal, 'ch-s'));
  if (r.stall === 1) H.push(pxTag(VINE.px, VINE.pal, 'vine-s'));
  H.push('</div>');

  /* 底下一句狀態。不講快慢，只講現在在做什麼。 */
  H.push('<div class="shaft-foot" style="top:' + (ecoHeight(maxD) + 8) + 'px">' +
    esc(r.stall >= 2 ? '休息中' : r.stall === 1 ? '慢下來了' : r.onMs ? '挖掘中' : '等派任務') +
    '</div>');

  H.push('</div>');
  return H.join('');
}

/* ---------- 學生看到的（Zoom Out） ---------- */
PAGES.eco = function () {
  var t = myTeam();
  var rows = ecology(t.classId).map(function (r) {
    var tm = teamOf(r.teamId);
    r.project = tm && tm.project;
    return r;
  });
  var H = [head('全班地下城', '大家都在挖',
    '每一條坑道往下挖的是自己的專案。看得到別人也在裡面，就夠了。')];
  H.push('<div class="eco-scroll">' + ecoScene(rows, t.teamId) + '</div>');
  H.push('<p class="dim">深度是走完幾個里程碑。每一組的專案不一樣，' +
         '坑道長度本來就不同——這裡沒有共同的終點線。</p>');
  H.push(btn('回坑道', 'go:home', 'ghost'));
  return H.join('');
};

/* ---------- 老師看到的（同一張圖，多一排改招牌） ---------- */
PAGES.classeco = function () {
  var u = me();
  var rows = ecology(u.classId).map(function (r) {
    var tm = teamOf(r.teamId);
    r.project = tm && tm.project;
    return r;
  });
  var H = [head('全班地下城', '每一組挖到哪',
    '深度是走完幾個里程碑。每一組的專案不一樣，坑道長度本來就不同。')];
  H.push('<div class="eco-scroll">' + ecoScene(rows, null) + '</div>');

  /* 改寫專案名稱 → 招牌升一階 */
  H.push('<div class="card">');
  H.push('<div class="eyebrow">改寫專案名稱</div>');
  H.push('<p class="dim">名稱收斂了就改寫一次。坑道口的招牌會從木牌升成鐵牌、' +
         '再升成會發光的銘牌——不用多說一句話，材質就是肯定。</p>');
  rows.forEach(function (r) {
    var t = teamOf(r.teamId);
    var sg = SIGNS[RULES.SIGN_TIERS[Math.min(2, t.signTier || 0)]];
    var top = (t.signTier || 0) >= RULES.SIGN_TIERS.length - 1;
    H.push('<div class="rn-row">');
    H.push(pxTag(sg.px, sg.pal, 'sign-s'));
    H.push('<b>' + esc(t.name) + '</b>');
    H.push('<input id="rn-' + t.teamId + '" value="' + esc(t.project || '') +
           '" placeholder="' + esc('重寫一次專案名稱') + '">');
    H.push('<span class="sg-tier' + (top ? ' top' : '') + '">' + esc(sg.name) + '</span>');
    H.push(btn('改寫', 'rename:' + t.teamId, 'ghost'));
    H.push('</div>');
  });
  H.push('</div>');
  return H.join('');
};
