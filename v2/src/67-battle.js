/* ---------- 交出去的那一場 ----------

   這是整條流程最有份量的一下，本來按了「上」就直接跳判定。

   ── 兩階段的問答 ──

   那兩問不是新發明的：它們本來就在交出去那一頁上，只是躺在兩張卡片裡
   沒有份量。搬進戰鬥之後它們變成兩下攻擊——

     第一問　這一趟做完了哪幾段？      （老師分的段，勾掉做完的）
     第二問　哪一段比你想的久？        （在看到判定之前先想一次）

   答完一問打牠一下。牠會退、會閃、會抖，但不會倒——
   倒下是最後那一句「你說 N 天，實際走了 M 天」才發生的事。
   那個順序有意義：真正決定結果的是那兩個數字，不是問答。

   ── 結果是算好的，不是打出來的 ──

   整場沒有任何操作會改變結果。答什麼、跳不跳過，判定都一樣——
   它由 RULES.judge(est, actual) 決定，而那一支只讀兩個數字。
   一旦讓玩家的操作影響結果，這個系統就開始獎勵「會玩」而不是「估得準」。

   ── 逃跑 ──

   填到一半發現寫不出來，可以走。那不是認輸：做到一半發現做不完是真的
   會發生的事，而承認它比硬交出去好。角色往回跑出畫面，然後回到「說幾天」。

   誠實的部分是退出去不等於擦掉——那一趟留著當紀錄（確實承諾了幾天、
   確實走了幾天），但沒有判定，所以不會進那根尺。可以擦掉的話，
   每個人都會在快超時的時候退一次，這個系統就再也量不到任何東西。

   ── 畫面 ──

   照舊版寶可夢排：牠在右上、你在左下（背影）、各自一塊站台、
   名牌帶一條斜出去的尾線、底下左邊字幕框右邊選單。
   那個年代畫面能力低，靠的全是輪廓與對比——剛好跟這個作品的規矩一致。 */

var BT = { timers: [] };

function battleStop() {
  BT.timers.forEach(function (t) { clearTimeout(t); });
  BT.timers = [];
}

function btAt(ms, fn) { BT.timers.push(setTimeout(fn, ms)); }

/* 這一趟走到第幾段。'menu' → 'q1' → 'q2' → 'play'。
   老師沒分段就跳過第一問。 */
function btPhase(r) {
  if (r.state !== 'running') return 'play';
  var ph = S.p.ph;
  if (!ph) return 'menu';
  if (ph === 'q1' && !stepsOf(r.runId)) return 'q2';
  return ph;
}

PAGES.battle = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var t = myTeam();
  var mob = mobOfRun(r);
  var zone = strataAt(depthOf(t.teamId), t.teamId);
  var est = r.est || 1;
  var ph = btPhase(r);

  var H = ['<div class="bt ' + zone.key + ' at-' + ph + '" data-run="' +
    esc(r.runId) + '">'];

  /* 遭遇：整個畫面閃一次再進場。 */
  H.push('<div class="bt-wipe"></div>');

  /* ── 牠 ──
     名牌上只有名字。這一趟實際幾天要等到最後才報出來，那是懸念。 */
  H.push('<div class="bt-side foe">');
  H.push(btPlate(esc(mob.n), 'foe', ''));
  H.push('<div class="bt-pad"></div>');
  H.push('<div class="bt-ch foe">' + pxTag(mob.px, zone.pal, 'bt-px') +
    pxFlash(mob.px) + '</div>');
  H.push('</div>');

  /* ── 你 ──
     自己那一張從一開始就寫著承諾幾天——那是他本來就知道的事。 */
  H.push('<div class="bt-side me">');
  H.push('<div class="bt-pad"></div>');
  H.push('<div class="bt-ch me">' + pxTag(HERO.back, HERO.pal, 'bt-px') +
    heroPack(t.teamId) + '</div>');
  H.push(btPlate(esc(shortName(t.name)), 'me', '說 ' + est + ' 天'));
  H.push('</div>');

  H.push('</div>');

  /* ── 下面那一條 ──
     舊版寶可夢的排法：左邊字幕框、右邊選單。 */
  H.push('<div class="bt-bottom">');
  H.push('<div class="bt-say"><i class="bt-arrow"></i><b id="btline">' +
    esc(btLine(r, mob, ph)) + '</b></div>');

  if (ph === 'menu') {
    H.push('<div class="bt-menu">');
    H.push(btChoice('btgo:' + r.runId, '上', 'go'));
    H.push(btChoice('btback:' + r.runId, '還沒好', ''));
    H.push('</div>');
  }
  H.push('</div>');

  /* ── 問答 ──
     兩問都接在字幕框底下，答完打牠一下。 */
  if (ph === 'q1' || ph === 'q2') {
    H.push('<div class="bt-q">');
    H.push(ph === 'q1' ? btSteps(r.runId) : overRow(r));
    H.push('<div class="bt-menu wide">');
    H.push(btChoice('bt' + ph + ':' + r.runId, '打過去', 'go'));
    H.push(btChoice('btback:' + r.runId, '還沒好', ''));
    H.push('</div></div>');
  }

  return H.join('');
};

/* 字幕框那一句。 */
function btLine(r, mob, ph) {
  if (ph === 'menu') return mob.n + ' 出現了！';
  if (ph === 'q1') return '這一趟做完了哪幾段？';
  if (ph === 'q2') return '哪一段比你想的久？';
  return '你上前。';
}

/* 選單上的一行。舊版寶可夢的游標長在前面（見 58-battle.css）。 */
function btChoice(act, label, cls) {
  return '<button class="bm ' + cls + '" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: act })) + '\'>' + esc(label) + '</button>';
}

/* 第一問：老師分的段，勾掉做完的。 */
function btSteps(runId) {
  var sp = stepsOf(runId);
  if (!sp) return '';
  var H = ['<div class="steps-list">'];
  sp.all.forEach(function (x, i) {
    var on = sp.on.indexOf(i) >= 0;
    H.push('<button class="stp' + (on ? ' on' : '') + '" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'tick:' + runId + '|' + i })) + '\'>' +
      '<b></b><i>' + esc(x) + '</i></button>');
  });
  H.push('</div>');
  return H.join('');
}

/* 名牌。照舊版寶可夢：名字在上，底下一行小字。
   那條斜出去的尾線是那個畫面最好認的一筆，在 CSS 裡。 */
function btPlate(name, side, note) {
  return '<div class="bt-plate ' + side + '">' +
    '<b>' + name + '</b>' +
    (note ? '<span class="bt-num">' + note + '</span>' : '') +
    '</div>';
}

/* 結局那一句。三種，而且三種都不拿走任何東西。 */
function btVerdict(r) {
  var est = r.est || 1;
  var act = r.actual || est;
  if (act < est) {
    return { key: 'early', line: '牠退開了。你還有 ' + (est - act) + ' 天沒用完。' };
  }
  if (act === est) return { key: 'exact', line: '剛好。牠退開了。' };
  return { key: 'late', line: '時間用完了，你多花了 ' + (act - est) + ' 天。牠還是讓開了。' };
}

/* ---------- 演一次 ----------

   render() 畫完之後呼叫。整場沒有輸入會改變結果，
   這裡只負責讓它花幾秒鐘發生。 */
function battleRun() {
  battleStop();
  if (S.page !== 'battle') return;
  var box = document.querySelector('.bt');
  if (!box) return;

  /* 黑幕用 JS 拿掉，不能只靠動畫收尾。動畫的時鐘會被凍住
     （背景分頁、省電、自動化瀏覽器），那時候黑幕會一直蓋著。 */
  var wipe = box.querySelector('.bt-wipe');
  if (wipe) btAt(460, function () { if (wipe.parentNode) wipe.parentNode.removeChild(wipe); });

  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return;
  var line = document.getElementById('btline');
  function say(s) { if (line) line.textContent = s; }

  /* 逃跑：角色往回跑出畫面，跑完才真的退出去。 */
  if (S.p.flee) {
    box.classList.add('flee');
    say('你退回去了。');
    btAt(850, function () {
      var t = myTeam();
      actRethink(t.teamId, r.runId);
      S.p = {};
      go('home', {});
    });
    return;
  }

  /* 答完一問打牠一下。牠會退、會閃、會抖，但不會倒。 */
  if (S.p.hurt) {
    S.p.hurt = 0;
    box.classList.add('hurt');
    btAt(560, function () { box.classList.remove('hurt'); });
  }

  var ph = btPhase(r);
  if (ph === 'menu') {
    btAt(900, function () {
      var bo = document.querySelector('.bt-bottom');
      if (bo) bo.classList.add('ready');
    });
    return;
  }
  if (ph !== 'play') return;

  var est = r.est || 1;
  var act = r.actual || est;

  /* 一 · 把這一趟報出來。這是整場唯一決定結果的東西。 */
  btAt(800, function () {
    say('你說 ' + est + ' 天，實際走了 ' + act + ' 天。');
    box.classList.add('told');
  });

  /* 二 · 牠被打敗。閃四下，然後往下滑出畫面——
     舊版寶可夢就是這樣做的：沒有爆炸，沒有粒子，就是滑下去。 */
  btAt(1900, function () {
    say(mobOfRun(r).n + ' 讓開了。');
    box.classList.add('foe-out');
  });

  /* 三 · 演完直接換頁。不用再按一次。 */
  btAt(3200, function () { go('stamp', { id: r.runId }); });
}

/* 上：進第一問。老師沒分段就直接到第二問（見 btPhase）。 */
ACTS.btgo = function (id) {
  battleStop();
  S.p = { id: id, ph: 'q1' };
  render();
};

/* 第一問答完：打牠一下，進第二問。 */
ACTS.btq1 = function (id) {
  battleStop();
  S.p = { id: id, ph: 'q2', hurt: 1 };
  render();
};

/* 第二問答完：打牠一下，然後交出去。
   省思在看到判定之前存下來，所以它不是事後回頭解釋的。 */
ACTS.btq2 = function (id) {
  var t = myTeam();
  battleStop();
  actReflect(t.teamId, id, DRAFT.overs || []);
  if (!actSubmit(t.teamId, id, '')) return say('這一趟已經交過了。');
  DRAFT.overs = null; DRAFT.said = 0;
  S.p = { id: id, ph: 'play', hurt: 1 };
  render();
};

/* 還沒好：角色往回跑出畫面，然後回到「說幾天」。 */
ACTS.btback = function (id) {
  battleStop();
  S.p = { id: id, flee: 1 };
  render();
};
