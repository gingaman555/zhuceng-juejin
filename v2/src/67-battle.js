/* ---------- 交出去的那一場 ----------

   使用者：「重點橋段呈現的動畫與畫面要像寶可夢對戰一樣刺激。」

   這是整條流程最有份量的一下，本來按了「上」就直接跳判定。現在它是
   一場真的戰鬥畫面：牠在右上、你在左下、各自一塊站台、兩張名牌各帶
   一條血條、底下一個字幕框一句一句走。

   ── 血條是什麼 ──

   這是整件事能不能成立的關鍵。血條不可以是「你做得好不好」——系統
   驗證不了他們有沒有真的做事，而且判定的是估準度，不是作業好壞。

   所以：時間就是血量。

     你的條  ＝ 你承諾的天數。那是你帶進來的資源。
     牠的條  ＝ 這一趟實際花掉的天數。那是牠的耐久。

   兩條一起倒數，一拍扣一格：
     牠先見底 → 你還有剩，牠退開
     同時見底 → 剛好
     你先見底 → 你的時間用完了，牠還站著——但牠一樣讓開

   最後那一條是這場戰鬥的分寸所在。失準看得出來（你的條先空了，
   那一下很難看），但**什麼都不會被拿走**：一樣封存、一樣往下一層、
   一樣蓋東西、一樣進圖鑑。這個作品的前提是「失準不扣任何東西」，
   戲劇性只能來自看得見，不能來自失去。

   ── 結果是算好的，不是打出來的 ──

   整場沒有任何輸入。按得快、按得多、跳過不跳過，結果一模一樣——
   它由 RULES.judge(est, actual) 決定，而那一支只讀兩個數字。
   一旦讓玩家的操作影響結果，這個系統就開始獎勵「會玩」而不是
   「估得準」。 */

var BT = { timers: [] };

function battleStop() {
  BT.timers.forEach(function (t) { clearTimeout(t); });
  BT.timers = [];
}

function btAt(ms, fn) { BT.timers.push(setTimeout(fn, ms)); }

PAGES.battle = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var t = myTeam();
  var mob = mobOfRun(r);
  var zone = strataAt(depthOf(t.teamId), t.teamId);
  var est = r.est || 1;
  var act = r.actual || est;

  /* 兩段：登場與選單 → 演出。演完直接換到戰報那一頁。 */
  var at = r.state === 'running' ? 'menu' : 'play';

  var H = ['<div class="bt ' + zone.key + ' at-' + at + '" data-run="' +
    esc(r.runId) + '">'];

  /* 遭遇：整個畫面閃一次再進場。 */
  H.push('<div class="bt-wipe"></div>');

  /* ── 牠 ── */
  H.push('<div class="bt-side foe">');
  H.push(btPlate(esc(mob.n), 'foe', ''));
  H.push('<div class="bt-pad"></div>');
  H.push('<div class="bt-ch foe">' + pxTag(mob.px, zone.pal, 'bt-px') +
    pxFlash(mob.px) + '</div>');
  H.push('</div>');

  /* ── 你 ── */
  H.push('<div class="bt-side me">');
  H.push('<div class="bt-pad"></div>');
  H.push('<div class="bt-ch me">' + pxTag(HERO.back, HERO.pal, 'bt-px') +
    heroPack(t.teamId) + '</div>');
  H.push(btPlate(esc(shortName(t.name)), 'me', ''));
  H.push('</div>');

  /* ── 選單 ──
     貼在畫面右下角，寶可夢的招式選單就長在那裡。
     登場演完才出現（JS 加 .ready），所以第一眼只有牠。

     「還沒好」不是認輸——做到一半發現寫不出來是真的會發生的事，
     承認它比硬交出去好。退出去那一趟留著當紀錄，但沒有判定。 */
  H.push('</div>');

  /* ── 下面那一條 ──
     舊版寶可夢的排法：左邊字幕框、右邊選單。
     本來選單貼在畫面右下角，跟自己的名牌疊在一起。 */
  H.push('<div class="bt-bottom">');
  H.push('<div class="bt-say"><i class="bt-arrow"></i><b id="btline">' +
    esc(at === 'menu' ? mob.n + ' 出現了！' : '你上前。') + '</b></div>');
  if (at === 'menu') {
    H.push('<div class="bt-menu">');
    H.push('<button class="bm go" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'btgo:' + r.runId })) + '\'>上</button>');
    H.push('<button class="bm back" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'btback:' + r.runId })) + '\'>還沒好</button>');
    H.push('</div>');
  }
  H.push('</div>');

  return H.join('');
};




/* 名牌：名字 ＋ 一條時間。數字就寫在旁邊，不用猜那條有多長。 */
/* 名牌。照舊版寶可夢：名字在上、一條在中、剩下的天數寫成 n/ m。
   那個斜出去的尾線是那個畫面最好認的一筆，在 CSS 裡（見 58-battle.css）。 */
function btPlate(name, side, note) {
  return '<div class="bt-plate ' + side + '">' +
    '<b>' + name + '</b>' +
    (note ? '<span class="bt-num">' + note + '</span>' : '') +
    '</div>';
}

/* 結局那一句。三種，而且三種都不拿走任何東西。 */
function btVerdict(r) {
  var est = r.est || 1;
  var act = r.actual || r.elapsed || est;
  if (act < est) {
    return { key: 'early', line: '牠退開了。你還有 ' + (est - act) + ' 天沒用完。' };
  }
  if (act === est) {
    return { key: 'exact', line: '剛好。牠退開了。' };
  }
  return { key: 'late', line: '時間用完了，你多花了 ' + (act - est) +
    ' 天。牠還是讓開了。' };
}

/* ---------- 演一次 ----------

   render() 畫完之後呼叫。整場沒有輸入，結果是算好的——
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

  /* 還沒上：牠先跳進來報名字，演完才把選單開出來。 */
  if (r.state === 'running') {
    btAt(900, function () {
      var bo = document.querySelector('.bt-bottom');
      if (bo) bo.classList.add('ready');
    });
    return;
  }

  var est = r.est || 1;
  var act = r.actual || est;

  /* 一 · 上前。人往前跨，畫面震一下、閃一下。 */
  btAt(500, function () {
    say('你上前。');
    box.classList.add('hit');
    btAt(260, function () { box.classList.remove('hit'); });
  });

  /* 二 · 把這一趟報出來。這是整場唯一的「內容」——
     說了幾天、實際走了幾天，其餘都是演出。 */
  btAt(1200, function () {
    say('你說 ' + est + ' 天，實際走了 ' + act + ' 天。');
    box.classList.add('told');
  });

  /* 三 · 牠被打敗。閃四下，然後往下滑出畫面——
     舊版寶可夢就是這樣做的：沒有爆炸，沒有粒子，就是滑下去。 */
  btAt(2300, function () {
    say(mobOfRun(r).n + ' 讓開了。');
    box.classList.add('foe-out');
  });

  /* 四 · 演完直接換頁。不用再按一次「看戰報」。 */
  btAt(3600, function () { go('stamp', { id: r.runId }); });
}

/* 上。交出去，然後演一次。 */
ACTS.btgo = function (id) {
  var t = myTeam();
  if (!actSubmit(t.teamId, id, '')) return say('這一趟已經交過了。');
  S.p = { id: id };
  render();
};

/* 還沒好。退出去重新想要幾天。

   那一趟留著當紀錄——確實承諾了幾天、確實走了幾天——但沒有判定，
   所以不會進那根尺。退出去不是失準，是另一件事。 */
ACTS.btback = function (id) {
  var t = myTeam();
  battleStop();
  if (!actRethink(t.teamId, id)) return say('這一趟退不回去了。');
  say('退回來了。重新想要幾天。');
  go('home', {});
};

/* 跳過：直接停在結果上。結果本來就是算好的，跳過不會改變任何事。 */
/* 跳過：直接到戰報。結果本來就是算好的，跳過不會改變任何事。 */
ACTS.btskip = function (id) { battleStop(); go('stamp', { id: id }); };
