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
  /* 問答只剩一種階段，第幾題記在 S.p.q（見 BT_STEPS）。 */
  if (ph === 'q1' || ph === 'q2' || ph === 'q') return 'q';
  /* 本來這裡有一條：沒拆件就跳過第一問，直接進第二問。

     那條寫在第一問只問「這幾件各花幾天」的年代——沒有細項，那一問
     確實沒東西可問。但第一問現在還收兩樣跟細項無關的東西：
     老師要去哪裡看、你自己做了什麼。而他不收的那兩道關卡就架在
     那兩樣上（見 BT_STEPS 每一題的 no）。

     跳過去的話，沒拆件的那一趟會卡死：關卡在第二問擋下來，叫他去
     第一問補，而第一問又被跳掉——他看得到那句話，但沒有地方可以打字。

     所以不跳了。btSteps 本來就會判斷有沒有細項（沒有就不畫那一段）。 */
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

  /* ── 一場講話，不是一場對峙 ──

     本來是寶可夢的排法：他站右上、你站左下（背影）、兩張名牌在對角、
     底下字幕框、右邊選單。那個排法在說「兩邊要分勝負」。

     可是這裡發生的事是：你走到了，把東西交給他，他收下。那是一段對話。
     所以改成近幾年 RPG 的講話畫面——

       場上只有說話的那一個。你是鏡頭，背影的自己拿掉了。
       名牌長在對話框上，斜切一角，不是漂在場景角落。
       選項排在框底下，不是排在框旁邊。
       他大一階：對峙的時候他是對手，講話的時候他是這一格的主角。

     你承諾了幾天沒有不見，它搬到右上角一行——那是你身上帶著的東西，
     不是他名牌上該有的字。

     舊的那一套沒有刪掉：.bt 本體、名牌、站台、閃場都還在，
     .talk 只是把它們重排（見 58-battle.css）。 */
  var H = ['<div class="bt talk ' + zone.key + ' at-' + ph + '" data-run="' +
    esc(r.runId) + '">'];

  /* 遭遇：整個畫面閃一次再進場。 */
  H.push('<div class="bt-wipe"></div>');
  /* 你說了幾天。本來寫在你那張名牌上。 */
  H.push('<div class="bt-hud">說 ' + est + ' 天</div>');

  H.push('<div class="bt-side foe">');
  H.push('<div class="bt-pad"></div>');
  /* 大隻的那一張（36×24，見 19-patron.js 的 PAT_BIG）。

     這一格本來畫 24×16 的那張——那是廊道上遠遠看一眼的尺寸，
     而這裡是整條流程最近的一次照面，他就在你面前。
     兩張都是 3:2，所以同一個框，多 2.3 倍的格子：眼睛有瞳孔、
     手有指節、他在呼吸。 */
  H.push('<div class="bt-ch foe">' + patTag(mob, zone.pal, 'bt-px', 1) +
    pxFlash(mob.big || mob.px) + '</div>');
  H.push('</div>');

  H.push('</div>');

  /* ── 對話框 ──
     名牌長在框的左上角。整段對話都掛他的名字：你站在他面前，
     這個框裡的每一句都是這一場的話。 */
  H.push('<div class="bt-bottom talk">');
  H.push('<div class="bt-say' + (S.p && S.p.no ? ' no' : '') +
    '"><span class="bt-name">' + esc(mob.n) + '</span>' +
    '<i class="bt-arrow"></i><b id="btline">' +
    esc(btLine(r, mob, ph)) + '</b></div>');

  if (ph === 'menu') {
    H.push('<div class="bt-menu">');
    /* 兩個選項寫成他真的要做的事：戰鬥就是回報進度，那不是比喻，
       那一頁問的就是「實際花了幾天」跟「順不順」。括號裡那一句
       讓第一次進來的人不用猜「上」是什麼意思。 */
    H.push(btChoice('btgo:' + r.runId, '交東西給他', 'go'));
    H.push(btChoice('btback:' + r.runId, '還沒準備好', ''));
    H.push('</div>');
  }
  H.push('</div>');

  /* ── 問答：一頁一題 ──
     題目寫在對話框裡（他問的那一句），答的地方接在底下。 */
  if (ph === 'q') {
    var qs = btAsks(r);
    var qi = Math.max(0, Math.min(qs.length - 1, Number(S.p.q) || 0));
    var last = qi === qs.length - 1;
    /* 這一題他一定要，而且還空著——那一格左邊那條會是全亮的
       （見 57-viz.css）。他在等這一格，不用按下去被退才知道。 */
    var need = qs[qi].need ? ' need' : '';
    H.push('<div class="bt-q' + need + '">');
    /* 第幾題。一排點，不是文字——「3 / 7」是一個要讀的東西，
       而這裡只需要知道「還有幾個」。 */
    H.push('<div class="bt-dots">');
    qs.forEach(function (s, i) {
      H.push('<i' + (i === qi ? ' class="on"' : (i < qi ? ' class="done"' : '')) + '></i>');
    });
    H.push('</div>');
    H.push(qs[qi].body(r, t));
    H.push('<div class="bt-menu wide">');
    H.push(btChoice('btnext:' + r.runId, last ? '交出去' : '接著說', 'go'));
    if (qi > 0) H.push(btChoice('btprev:' + r.runId, '回上一題', ''));
    H.push(btChoice('btback:' + r.runId, '還沒準備好', ''));
    H.push('</div></div>');
  }

  return H.join('');
};

/* ── 這個框裡的每一句 ──

   名牌上是他的名字，那框裡的話就該是他的話。本來三句裡有兩句是
   系統的口氣（「這一趟做完了哪幾段？」），那讓整個框變成一張
   表單的標題列。

   他不收的時候也在這裡講。本來那幾道關卡是 say() 彈一下的提示，
   而提示是系統在說話——同一條規則從他嘴裡講出來，那一步就從
   「表單驗證沒過」變成「他不收」。 */
function btLine(r, mob, ph) {
  /* 他不收。那一句直接蓋掉這一格本來要說的話。 */
  if (S.p && S.p.no) return S.p.no;

  if (ph === 'menu') {
    /* 退回＝他把東西退回來了，不是他復活。 */
    if (r.state === 'back') return mob.n + ' 把東西退回來了。';
    /* 他認得你。

       第二次遇到同一位還講「你走到了。X 在這裡。」是錯的——
       那句話把每一次都當成第一次。mobDebut 算的正是「這一趟是不是
       這一組最早遇到他的那一趟」，資料本來就在。 */
    if (r.runId && !mobDebut(r.teamId, r.runId)) return '又是你。這次帶了什麼來？';
    return '你走到了。' + mob.n + ' 在這裡。';
  }
  /* 問答的時候，框裡那一句就是他問的那一題（見 BT_STEPS）。
     本來是「你帶了什麼來？」這種過場，而過場底下接一疊表單，
     等於那一句跟底下那些格子沒有關係。 */
  if (ph === 'q') {
    var qs = btAsks(r);
    var qi = Math.max(0, Math.min(qs.length - 1, Number(S.p.q) || 0));
    return qs[qi].ask;
  }
  return '他伸手接過去。';
}

/* 選單上的一行。舊版寶可夢的游標長在前面（見 58-battle.css）。 */
function btChoice(act, label, cls) {
  return '<button class="bm ' + cls + '" data-act="run" data-p=\'' +
    esc(JSON.stringify({ a: act })) + '\'>' + esc(label) + '</button>';
}

/* ---------- 一頁一題 ----------

   本來兩頁：第一問塞了三題（老師去哪看、各花幾天、誰做了什麼），
   第二問塞了四題（順不順、為什麼、範圍、再兩天）。七題兩頁。

   兩個問題：

   一 · 這個作品自己的規矩是「一頁只給一個動作」（見 60-student.js
        開頭）。交作業那一段是全站唯一違反它的地方，而且違反得最兇。

   二 · 那一疊表單比一個畫面高，所以要往下拉——**一拉委託人就出去了**。
        他站在那裡等你回話，而你答題的時候看不到他。那就不是對話，
        是他站在表單上面當插圖。

   所以拆成七步，一步一題，委託人一直在畫面上。而每一步的那一句
   就是題目本身：對話框裡寫的不再是「路上怎麼樣？」這種過場，
   是他真的在問的那一句。

   有幾題會被跳過：沒拆件就沒有「各花幾天」，深度不夠就沒有「為什麼」
   （見 RULES.asks）。跳過的不算在步數裡，所以那一排點數得出來幾題。 */
var BT_STEPS = [
  { k: 'where', ask: '老師要去哪裡看？',
    body: function (r, t) {
      return '<input class="bt-w" id="bt-where" oninput="DRAFT.where=this.value" ' +
        'placeholder="' + esc('例：TronClass 第三次作業 · 印出來放你桌上') +
        /* 空的。本來會把上一趟填過的那一句帶進來（lastWhere），
           而那是幫他填——上一趟交在 TronClass，這一趟可能印出來放在
           老師桌上，那不是同一件事。而且他只要一路按過去，
           老師就會收到一個看起來填過、其實沒人想過的位置。 */
        '" value="' + esc(draft('where', '')) + '">';
    },
    need: function (r, t) {
      return !!String(DRAFT.where || '').trim();
    } },

  { k: 'spent', ask: '這幾件各花了幾天？',
    skip: function (r) { return !((r.plan || []).length); },
    body: function (r, t) { return btSpent(r); },
    /* 只看你名下那幾件。別人的那幾格他們自己填，拿別人沒填來擋你
       是連坐（跟「誰做了什麼」同一條規矩）。 */
    need: function (r) {
      var mine = myItems(r, S.who);
      if (!mine.length) return true;
      for (var i = 0; i < mine.length; i++) {
        if (!(Number((DRAFT.spent || [])[mine[i]]) > 0)) return false;
      }
      return true;
    } },

  { k: 'said', ask: '你做了什麼？',
    body: function (r, t) { return btSaid(r, t); },
    need: function (r, t) {
      var said = (r && r.said) || {};
      return !!String(DRAFT.said1 == null ? (said[S.who] || '') : DRAFT.said1).trim();
    } },

  { k: 'feel', ask: '這一趟順不順？',
    body: function () {
      var H = ['<div class="feels">'];
      FEELS.forEach(function (f) {
        H.push('<button class="fl' + (DRAFT.feel === f[0] ? ' on' : '') +
          '" data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'feel:' + f[0] })) +
          '\'>' + esc(f[1]) + '</button>');
      });
      H.push('</div>');
      return H.join('');
    } },

  { k: 'why', ask: '為什麼？',
    skip: function (r) { return !btAskHard(r.teamId); },
    body: function () {
      return '<textarea class="bt-w" rows="3" maxlength="300" ' +
        'oninput="DRAFT.why=this.value" placeholder="' +
        esc('選填。') + '">' + esc(draft('why', '')) + '</textarea>';
    } },

  { k: 'scope', ask: '做出來的，跟你當初說的一樣嗎？',
    body: function () {
      var H = ['<div class="feels">'];
      [['more', '比說的多'], ['same', '差不多'], ['less', '比說的少']].forEach(function (x) {
        H.push('<button class="fl' + (DRAFT.scope === x[0] ? ' on' : '') +
          '" data-act="run" data-p=\'' + esc(JSON.stringify({ a: 'scope:' + x[0] })) +
          '\'>' + esc(x[1]) + '</button>');
      });
      H.push('</div>');
      return H.join('');
    } },

  { k: 'next', ask: '再給你們兩天，你們會做什麼？',
    body: function () {
      return '<textarea class="bt-w" rows="2" maxlength="200" ' +
        'oninput="DRAFT.next=this.value" placeholder="' +
        esc('例：再訪一個人，第三份的資料太薄') + '">' + esc(draft('next', '')) + '</textarea>';
    },
    need: function () { return !!String(DRAFT.next || '').trim(); } }
];

/* 這一趟真的要問哪幾題。 */
function btAsks(r) {
  return BT_STEPS.filter(function (s) { return !(s.skip && s.skip(r)); });
}

/* 第一問：老師分的段，勾掉做完的。 */
/* 第一問：前面開的這些細項，實際花了多少時間。

   承諾的時候他一件一件估過，現在一件一件回報實際。預設帶入他當初
   估的那個數字——「沒改」本身就是一個答案，而且他不用從零開始按。

   本來這一問是「勾掉哪幾段做完了」。勾掉不帶任何數字，而這個作品
   在量的東西是數字。 */
/* 這幾件各花了幾天。一題一頁，所以這裡不再需要標題——
   標題在對話框裡，是他問的那一句（見 BT_STEPS）。 */
function btSpent(r) {
  var pl = (r && r.plan) || [];
  var H = [];
  if (pl.length) {
    /* 從 0 開始，不是從他當初估的天數開始。

       本來每一格預設成 x.d——也就是他承諾的那個數字。那等於系統
       先替他回答「跟我說的一樣」，而他只要一路按過去，交出去的
       就是一份「每一件都剛剛好」的報告。

       這一格是整套系統唯一在量的東西（說幾天 vs 實際幾天）的細項版。
       預填它就是在汙染那份資料，而且汙染的方向剛好是「看起來很準」。 */
    if (!DRAFT.spent) DRAFT.spent = pl.map(function () { return 0; });
    var mine = myItems(r, S.who);
    H.push('<div class="splist">');
    pl.forEach(function (x, i) {
      /* 只有掛在你名下的那幾件按得動。別人的看得到，按不動——
         同一張紙上你只寫得了自己那一行。 */
      var own = mine.indexOf(i) >= 0;
      H.push('<div class="sp2' + (own ? '' : ' theirs') + '">');
      H.push('<b style="background:' + stepHue(i) + '"></b>');
      H.push('<i>' + esc(x.n) + '</i>');
      H.push('<u class="who">' + esc(shortWho(x.who)) + '</u>');
      H.push('<u class="said">說 ' + x.d + '</u>');
      if (own) {
        H.push('<button class="pd" data-act="run" data-p=\'' +
          esc(JSON.stringify({ a: 'spent:' + i + ',-1' })) + '\'>−</button>');
        H.push('<u class="got">' + DRAFT.spent[i] + '</u>');
        H.push('<button class="pd" data-act="run" data-p=\'' +
          esc(JSON.stringify({ a: 'spent:' + i + ',1' })) + '\'>＋</button>');
      } else {
        H.push('<u class="got dim">' + DRAFT.spent[i] + '</u>');
      }
      H.push('</div>');
    });
    H.push('</div>');
  }
  return H.join('');
}

/* 誰做了什麼。 */
function btSaid(r, t) {
  var H = [];
  /* 我做了什麼。每個人各寫一行，全隊並排——
     這一段本身就是「互相表達」的介面：誰寫了、誰沒寫，同一個畫面上。

     ── 先寫完自己的，才看得到別人的 ──

     本來一打開就看得到隊友寫了什麼。那會發生兩件事：你會照著他的
     句型寫，而且你會挑他沒提到的講——你寫的不再是「我做了什麼」，
     是「相對於他，我做了什麼」。

     這一份資料是老師判斷的材料，被錨定過的材料沒有用。

     所以在你自己那一行寫完之前，隊友那幾行只看得到寫了沒有；
     寫完就全部打開。這不是規則，是順序——同時出牌，然後一起翻。
     （這一套本來就擋著跨組的預估互看，理由一樣：見 40-db.js 結尾
     那一段 estSpread 為什麼拿掉。） */
  H.push('<div class="saidlist">');
  var mem = t ? where('Users', function (u) { return u.teamId === t.teamId; }) : [];
  var said = (r && r.said) || {};
  /* 你自己那一行寫了沒有。DRAFT 是他現在打的，said 是之前存的。 */
  var wrote = !!String(DRAFT.said1 == null ? (said[S.who] || '') : DRAFT.said1).trim();
  mem.forEach(function (u) {
    var me0 = u.userId === S.who;
    H.push('<div class="sd' + (me0 ? ' mine' : '') + '">');
    H.push(pxTag(heroOf(u).idleA, heroOf(u).pal, 'sd-px'));
    H.push('<b>' + esc(me0 ? '你' : (u.name || '')) + '</b>');
    if (me0) {
      H.push('<input class="bt-w" id="bt-said" oninput="DRAFT.said1=this.value" ' +
        'placeholder="' + esc('這幾天你做的是什麼') + '" value="' +
        esc(draft('said1', said[u.userId] || '')) + '">');
    } else if (!said[u.userId]) {
      H.push('<span>還沒說</span>');
    } else if (wrote) {
      H.push('<span>' + esc(said[u.userId]) + '</span>');
    } else {
      /* 他寫了，但你還沒。看得到有這一行，看不到內容。 */
      H.push('<span class="sd-hid">寫好了</span>');
    }
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
/* 三選一那三個。BT_STEPS 的「順不順」那一題用它。
   本來這裡還有一支 btAsk，把順不順、為什麼、範圍、再兩天四題
   畫在同一頁；拆成一頁一題之後那四題各自搬進 BT_STEPS 了。 */
var FEELS = [['good', '順'], ['ok', '普通'], ['bad', '不順']];

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
    return { key: 'early', line: '他收下了。你還有 ' + (est - act) + ' 天沒用完。' };
  }
  if (act === est) return { key: 'exact', line: '他收下了。剛好是你說的天數。' };
  return { key: 'late', line: '他收下了，不過多花了 ' + (act - est) + ' 天。' };
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
    say(mobOfRun(r).n + ' 收下了。');
    box.classList.add('foe-out');
  });

  /* 三 · 第一次遇到的那一隻，收進圖鑑——在這裡喊一次。

     牠倒下的下一拍就是「牠被記下來了」，那是這個作品裡少數幾個
     「你多了一個東西」的時刻。不喊的話它只在圖鑑那一頁看得到，
     而他不一定會去翻。同一隻再遇到不會再喊（見 mobDebut）。 */
  var debut = mobDebut(r.teamId, r.runId);
  if (debut) {
    btAt(2700, function () {
      var m = mobOfRun(r);
      var z = zoneOfRun(r, r.teamId);
      box.insertAdjacentHTML('beforeend',
        regCard('新登場', m.n, '已收錄在圖鑑',
          pxTag(m.px, (z || STRATA[0]).pal, 'reg-px'), true));
    });
  }
  /* 四 · 演完直接換頁。不用再按一次。 */
  btAt(debut ? 5000 : 3200, function () { go('stamp', { id: r.runId }); });
}

/* 上：進第一問。老師沒分段就直接到第二問（見 btPhase）。 */
ACTS.btgo = function (id) {
  battleStop();
  S.p = { id: id, ph: 'q', q: 0 };
  render();
};

ACTS.btprev = function (id) {
  battleStop();
  S.p = { id: id, ph: 'q', q: Math.max(0, (Number(S.p.q) || 0) - 1) };
  render();
};

/* 答完一題，往下一題。最後一題按下去就是交出去。

   每一題自己那道關卡在這裡跑：他不收的時候留在原地，那一句換成
   他說的（見 BT_STEPS 的 no 與 btLine）。關卡跟著題目走，所以他
   是在你漏掉那一題的當下就說，不是等到最後才一次退回來。 */
ACTS.btnext = function (id) {
  battleStop();
  var r0 = find('Runs', function (x) { return x.runId === id; });
  if (!r0) return;
  var qs = btAsks(r0);
  var qi = Math.max(0, Math.min(qs.length - 1, Number(S.p.q) || 0));
  var step = qs[qi];
  /* 他不收。那一句是「還沒。」＋這一題——拒收看得出來，題目也還在。 */
  if (step.need && !step.need(r0, myTeam())) {
    S.p = { id: id, ph: 'q', q: qi, no: '還沒。' + step.ask };
    return render();
  }
  if (qi + 1 < qs.length) {
    S.p = { id: id, ph: 'q', q: qi + 1, hurt: 1 };
    return render();
  }
  ACTS.btq2(id);
};

/* 第二問答完：打牠一下，然後交出去。
   省思在看到判定之前存下來，所以它不是事後回頭解釋的。 */
ACTS.btq2 = function (id) {
  var t = myTeam();
  battleStop();
  var run = find('Runs', function (x) { return x.runId === id; });
  var again = !!(run && run.state === 'back');
  /* 每一題自己的關卡在 btnext 跑過了（見 BT_STEPS 的 no）。
     這裡再擋一次是因為 btq2 也可能被別的路叫到。 */
  var qs0 = btAsks(run);
  for (var qq = 0; qq < qs0.length; qq++) {
    if (!qs0[qq].need || qs0[qq].need(run, t)) continue;
    S.p = { id: id, ph: 'q', q: qq, no: '還沒。' + qs0[qq].ask };
    return render();
  }
  actReflect(t.teamId, id, DRAFT.overs || [], DRAFT.hard, DRAFT.pace,
    { spent: DRAFT.spent, feel: DRAFT.feel, why: DRAFT.why,
      scope: DRAFT.scope, next: DRAFT.next, said1: DRAFT.said1 });
  /* 退回那一場走 actResend 不走 actSubmit：答案更新，判定不動。

     actSubmit 會重算 actual 與 stamp，而退回不動判定——那一趟的兩個
     數字在他第一次交出去的當下就定了，重做不會讓他當初說的話
     變成別的話。 */
  /* 交出去用的也是他這一次打的。本來這裡也會退回 lastWhere，
     所以就算欄位看起來是空的，交出去的仍然是上一趟那一句。 */
  var wh = String(DRAFT.where || '').trim();
  var okd = again ? actResend(t.teamId, id) : actSubmit(t.teamId, id, wh);
  if (!okd) return say('這一趟已經交過了。');
  DRAFT.overs = null; DRAFT.said = 0; DRAFT.hard = ''; DRAFT.pace = '';
  DRAFT.scope = null; DRAFT.next = ''; DRAFT.said1 = ''; DRAFT.where = null;
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
