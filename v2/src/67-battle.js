/* ---------- 交出去的那一場 ----------

   這是整條流程最有份量的一下，本來按了「上」就直接跳判定。

   ── 兩階段的問答 ──

   那兩問不是新發明的：它們本來就在交出去那一頁上，只是躺在兩張卡片裡
   沒有份量。搬進戰鬥之後它們變成兩下攻擊——

     第一問　這一趟做完了哪幾段？      （老師分的段，勾掉做完的）
     第二問　這一趟走得怎麼樣？        （哪一段比想的久、卡在哪裡、
                                        進度如何——後兩題自己寫）

   第二問是全系統唯一的自由書寫。它跟「零輸入框」不衝突：當初擋的是
   「系統先替他們定義一份詞表」，自己寫的字剛好是那件事的相反。

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
/* 「為什麼」那一格。門檻寫在 RULES.ASK.hard，現在是 0——第一趟就問。
   留著這一支是因為門檻是一個會被調的數字，不是一個永遠的答案。 */
function btAskHard(teamId) {
  return RULES.asks('hard', depthOf(teamId)) !== 'off';
}

function btPhase(r) {
  /* back 也要能打：老師退回＝牠站起來了，這一場要重來一次。
     本來只認 running，所以退回之後整場掉進「回看舊的一場」，
     畫面上什麼都不能按。 */
  if (r.state !== 'running' && r.state !== 'back') return 'play';
  var ph = S.p.ph;
  if (!ph) return 'menu';
  /* 沒拆件就沒有第一問可問，直接跳第二問。 */
  if (ph === 'q1' && !((r.plan || []).length)) return 'q2';
  return ph;
}

PAGES.battle = function () {
  var r = find('Runs', function (x) { return x.runId === S.p.id; });
  if (!r) return '<div class="card">找不到。</div>';
  var t = myTeam();
  var mob = mobOfRun(r);
  /* 那一場打在那一趟去的地方，不是「現在」在哪——回頭看一場舊的，
     背景要是當時那個地方。 */
  var zone = zoneOfRun(r, t.teamId);
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
    /* 兩個選項寫成他真的要做的事：戰鬥就是回報進度，那不是比喻，
       那一頁問的就是「實際花了幾天」跟「順不順」。括號裡那一句
       讓第一次進來的人不用猜「上」是什麼意思。 */
    H.push(btChoice('btgo:' + r.runId, '戰鬥（回報進度）', 'go'));
    H.push(btChoice('btback:' + r.runId, '還沒準備好', ''));
    H.push('</div>');
  }
  H.push('</div>');

  /* ── 問答 ──
     兩問都接在字幕框底下，答完打牠一下。 */
  if (ph === 'q1' || ph === 'q2') {
    H.push('<div class="bt-q">');
    H.push(ph === 'q1' ? btSteps(r.runId) : btAsk(r));
    H.push('<div class="bt-menu wide">');
    /* 兩問各自一句，不共用「打過去」——第一下是他先出手，
       第二下是接著再一下。同一句話用兩次，那兩下就變成同一下。 */
    H.push(btChoice('bt' + ph + ':' + r.runId,
      ph === 'q1' ? '吃我一擊！' : '再來一擊！', 'go'));
    H.push(btChoice('btback:' + r.runId, '還沒準備好', ''));
    H.push('</div></div>');
  }

  return H.join('');
};

/* 字幕框那一句。 */
function btLine(r, mob, ph) {
  /* 退回那一場牠不是突然出現的——牠本來倒著，現在站起來了。 */
  if (ph === 'menu') {
    return r.state === 'back' ? mob.n + ' 又站起來了！' : mob.n + ' 突然出現了！';
  }
  if (ph === 'q1') return '這一趟做完了哪幾段？';
  if (ph === 'q2') return '這一趟走得怎麼樣？';
  return '你上前。';
}

/* 選單上的一行。舊版寶可夢的游標長在前面（見 58-battle.css）。 */
function btChoice(act, label, cls) {
  return '<button class="bm ' + cls + '" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: act })) + '\'>' + esc(label) + '</button>';
}

/* 第一問：老師分的段，勾掉做完的。 */
/* 第一問：前面開的這些細項，實際花了多少時間。

   承諾的時候他一件一件估過，現在一件一件回報實際。預設帶入他當初
   估的那個數字——「沒改」本身就是一個答案，而且他不用從零開始按。

   本來這一問是「勾掉哪幾段做完了」。勾掉不帶任何數字，而這個作品
   在量的東西是數字。 */
function btSteps(runId) {
  var r = find('Runs', function (x) { return x.runId === runId; });
  var pl = (r && r.plan) || [];
  if (!pl.length) return '';
  if (!DRAFT.spent) DRAFT.spent = pl.map(function (x) { return x.d; });
  var H = ['<div class="splist">'];
  pl.forEach(function (x, i) {
    H.push('<div class="sp2">');
    H.push('<b style="background:' + stepHue(i) + '"></b>');
    H.push('<i>' + esc(x.n) + '</i>');
    H.push('<u class="said">說 ' + x.d + '</u>');
    H.push('<button class="pd" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'spent:' + i + ',-1' })) + '\'>−</button>');
    H.push('<u class="got">' + DRAFT.spent[i] + '</u>');
    H.push('<button class="pd" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'spent:' + i + ',1' })) + '\'>＋</button>');
    H.push('</div>');
  });
  H.push('</div>');
  return H.join('');
}

/* 第二問：這一趟走得怎麼樣。

   哪一段比想的久（點的）＋ 兩題自己寫的。兩題都選填——
   逼人打字會拿到為了交差而打的字，那一刻資料就開始說謊。

   輸入框跟 DRAFT 綁著、而且不重畫：重畫會把 innerHTML 換掉，
   打到一半的字會不見，游標也會跳掉。 */
/* 第二問：順不順，跟為什麼。

   「進度如何」本來是一個空白的多行框，而那是一個要人自己想格式的
   問題——三選一之後它答得掉，而「為什麼」才是真正有內容的那一格。 */
var FEELS = [['good', '順'], ['ok', '普通'], ['bad', '不順']];
function btAsk(r) {
  var H = [];
  H.push('<div class="bt-qh">目前專案進展的狀況你覺得如何</div>');
  H.push('<div class="feels">');
  FEELS.forEach(function (f) {
    H.push('<button class="fl' + (DRAFT.feel === f[0] ? ' on' : '') +
      '" data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'feel:' + f[0] })) +
      '\'>' + esc(f[1]) + '</button>');
  });
  H.push('</div>');
  /* 「為什麼」要打字。選填——逼出來的字是為了交差的字，
     而那一刻資料就開始說謊；他想寫才寫，寫的才是真的。 */
  if (btAskHard(r.teamId)) {
    H.push('<div class="bt-qh">為什麼</div>');
    H.push('<textarea class="bt-w" rows="3" maxlength="300" ' +
      'oninput="DRAFT.why=this.value" placeholder="' +
      esc('選填。') + '">' + esc(draft('why', '')) + '</textarea>');
  }
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
    return { key: 'early', line: '打敗了。你還有 ' + (est - act) + ' 天沒用完。' };
  }
  if (act === est) return { key: 'exact', line: '剛好打敗了。' };
  return { key: 'late', line: '打敗了，不過多花了 ' + (act - est) + ' 天。' };
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
    say('走過的那幾天留著。');
    btAt(850, function () {
      var t = myTeam();
      actRethink(t.teamId, r.runId);
      var ms = r.msId;
      S.p = {};
      /* 跟廊道上那一顆走到同一個地方——它們是同一件事。 */
      go('commit', { id: ms });
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
    say(mobOfRun(r).n + ' 被打敗了！');
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
  /* 一律進第二問。「順／普通／不順」是一下，不是一段文章——
     漸進的是「系統要求他說明自己的深度」，而那個深度在「為什麼」
     那一格上（見 btAsk），不在這一個三選一上。 */
  S.p = { id: id, ph: 'q2', hurt: 1 };
  render();
};

/* 第二問答完：打牠一下，然後交出去。
   省思在看到判定之前存下來，所以它不是事後回頭解釋的。 */
ACTS.btq2 = function (id) {
  var t = myTeam();
  battleStop();
  var run = find('Runs', function (x) { return x.runId === id; });
  var again = !!(run && run.state === 'back');
  actReflect(t.teamId, id, DRAFT.overs || [], DRAFT.hard, DRAFT.pace,
    { spent: DRAFT.spent, feel: DRAFT.feel, why: DRAFT.why });
  /* 退回那一場走 actResend 不走 actSubmit：答案更新，判定不動。

     actSubmit 會重算 actual 與 stamp，而退回不動判定——那一趟的兩個
     數字在他第一次交出去的當下就定了，重做不會讓他當初說的話
     變成別的話。 */
  var okd = again ? actResend(t.teamId, id) : actSubmit(t.teamId, id, '');
  if (!okd) return say('這一趟已經交過了。');
  DRAFT.overs = null; DRAFT.said = 0; DRAFT.hard = ''; DRAFT.pace = '';
  DRAFT.spent = null; DRAFT.feel = ''; DRAFT.why = '';
  S.p = { id: id, ph: 'play', hurt: 1 };
  render();
};

/* 還沒好：角色往回跑出畫面，然後回到「說幾天」。 */
ACTS.btback = function (id) {
  battleStop();
  S.p = { id: id, flee: 1 };
  render();
};
