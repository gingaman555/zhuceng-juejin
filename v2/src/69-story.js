/* 故事。兩頁，第一次進來看一次，之後隨時從廊道上那扇門回來看。

   為什麼要有這一頁——量過的問題：一個全新的學生，前三個動作
   （認領自己、挑角色、給專案取名字）跟專案管理完全無關，而第一個
   真正的動作要等老師派任務，可能是隔天。中間那一段空窗是最危險的：
   他登入過一次、什麼都沒發生，就不會有第二次。

   所以這兩頁同時做兩件事：

     一 · 世界觀。這座地下城就是他們的專案變成的，那六個地方是什麼。
     二 · 規則。而且是整套系統唯一的一條規則。

   第二件才是重點。這個作品的主張是「被評價的對象，從作業換成
   自己的預估」——可是介面上從來沒有一個地方把那句話說出來。
   學生看到「承諾天數」會直覺讀成 deadline，然後第一次就估寬，
   而那正好毀掉要測的行為。

   所以第二頁只講一件事：系統只比兩個數字，而且估寬不會比較好看。

   圖是用這個世界自己的材料拼的，不是另外畫的插圖：六層的底色與紋理
   讀 51-zones.css（跟廊道、跟班級地下城同一份），角色、火把、生物
   都是遊戲裡真的會出現的那幾張點陣圖。看完這兩頁再進廊道，
   廊道上每一樣東西他都見過了。 */

/* ---------- 兩頁的內容 ---------- */
var STORY = [
  {
    k: 'where',
    eyebrow: '第一頁',
    /* 前提放在標題上：這座地下城不是專案的比喻，它就是專案本身
       變成的一個地方。標題講完，底下三句就各自只做一件事——
       你是誰、你能去哪、怎麼出去。

       使用者原本的句子是書面語（「所化身成的」「便是」「從…中脫離」），
       這一份的規矩是白話優先、文字量到最小，所以拆短、換成講得出口的話。 */
    title: '這座地下城就是你們的專案',
    lines: [
      '你是進來探險的勇者。',
      '六個地方都去得了，每一趟自己挑，去過的也可以再去。',
      /* 「而那扇門是老師開的」拿掉了：圖上那扇門就關在旁邊，
         廊道上那一排也有一扇看得見的、鎖著的門——說第三次是多的。 */
      '把專案做完，才走得出去。'
    ]
  },
  {
    k: 'rule',
    eyebrow: '第二頁',
    /* 前三句是一圈：收到、拆開、走、打贏。第四句跟最後那一句是規則。

       這一頁本來只有規則，沒有動作——所以它答得出「這裡怎麼判」，
       卻答不出「那我現在要做什麼」。使用者要的那一段補的正是後者。

       但規則不能跟著換掉：介面上只有這一頁講得出「被評的是你的預估，
       不是你的作業」。少了它，學生會把「承諾天數」讀成 deadline，
       然後第一次就估寬——而那正好毀掉這個作品要測的行為。

       所以兩個都留：上面四句是他要做的事，最後那一句是他該知道的事。 */
    title: '怎麼打贏牠',
    lines: [
      '老師派一件事下來，你把它拆成幾件，各說要幾天。',
      '挑一個地方，出發。',
      '走到你說的那一天，回來報告，就打贏牠了。',
      '系統只比兩個數字：你說的，跟實際的。做得好不好，老師說。'
    ],
    key: '所以估寬，不會比較好看。'
  }
];

/* ---------- 圖 ----------

   兩張都用世界自己的材料拼。

   第一張本來是一面崖：六層由上往下疊，一個人坐在最上面。那張圖畫的是
   「一路往下」——而設定改了：地方是每一趟自己挑的，六個一直都在，
   去過的也可以再去。往下疊的圖跟那段話互相矛盾。

   改成一張地圖：六個地方並排，中間有通道連著，你在其中一個。
   旁邊一扇關著的門——你可以一直穿梭，但出不去。

   第二張是一條廊道的橫剖：你、你走過的那幾格、你說的那一天，
   跟站在那一天上的那一隻。 */

function storyMap(t) {
  var seed = t ? t.classId : 'C1';
  var here = t ? zoneNow(t.teamId) : STRATA[0];
  var H = ['<div class="sty-art sty-map">'];
  H.push('<div class="sty-rooms">');
  STRATA.forEach(function (z) {
    /* 你現在在的那一個標出來——這張圖上唯一跟「你」有關的資訊。 */
    H.push('<div class="sty-room ' + z.key + (z.key === here.key ? ' here' : '') + '">');
    H.push('<em>' + esc(z.name) + '</em>');
    if (z.key === here.key) {
      H.push('<span class="sty-me">' +
        pxTag(HERO.idleA, HERO.pal, 'wf wa') + pxTag(HERO.idleB, HERO.pal, 'wf wb') +
        '</span>');
    }
    H.push('</div>');
  });
  H.push('</div>');
  /* 關著的那一扇。它不是第七個地方——它是唯一的出去。 */
  H.push('<div class="sty-door"><i></i><b>出口</b></div>');
  H.push('</div>');
  return H.join('');
}

function storyRoad(t) {
  var seed = t ? t.classId : 'C1';
  var z = strataAt(0, seed);
  var mob = faunaOf(z.key)[0];
  var H = ['<div class="sty-art sty-road z-' + z.key + '">'];
  H.push('<div class="sty-floor"></div>');
  /* 五格：走過的三格點著火把，還沒到的兩格是暗的 */
  for (var i = 0; i < 5; i++) {
    H.push('<div class="sty-tile' + (i < 3 ? ' on' : '') +
      '" style="left:' + (66 + i * 44) + 'px"></div>');
  }
  H.push('<div class="sty-hero">' +
    pxTag(HERO.walkA, HERO.pal, 'wf wa') + pxTag(HERO.walkB, HERO.pal, 'wf wb') +
    '</div>');
  /* 你說的那一天，跟站在上面的那一隻 */
  H.push('<div class="sty-day"><i></i><b>你說的那一天</b></div>');
  if (mob) H.push('<div class="sty-mob">' + pxTag(mob.px, z.pal, '') + '</div>');
  H.push('</div>');
  return H.join('');
}

/* ---------- 頁 ---------- */
PAGES.story = function () {
  var t = myTeam();
  var n = Number(S.p.n) || 0;
  if (n >= STORY.length) n = STORY.length - 1;
  var s = STORY[n];

  var H = [head(s.eyebrow, s.title, '')];
  H.push(n === 0 ? storyMap(t) : storyRoad(t));

  /* 一句一行，能砍的都砍掉了。八段散文改成五句——這個作品自己的
     規矩是文字量到最小，而開場那兩頁本來是全站文字最多的地方。

     最後那一句自己一行、大一階。它是整套系統唯一的一條規則，
     而層級靠字級分不靠顏色（金色已經是「可以按」）。 */
  H.push('<div class="card sty-t">');
  s.lines.forEach(function (l) { H.push('<p>' + esc(l) + '</p>'); });
  if (s.key) H.push('<p class="sty-key">' + esc(s.key) + '</p>');
  H.push('</div>');

  /* 兩頁走完就進廊道。看過一次就記下來，之後不再自動跳出來——
     但那扇門一直在，隨時回來看。 */
  H.push('<div class="row">');
  if (n + 1 < STORY.length) {
    H.push(btn('翻下一頁', 'story:' + (n + 1), 'big'));
  } else {
    H.push(btn('出發', 'storyend', 'big'));
  }
  if (n > 0) H.push(btn('上一頁', 'story:' + (n - 1), 'ghost'));
  H.push('</div>');
  return H.join('');
};

ACTS.story = function (n) { go('story', { n: Number(n) || 0 }); };

/* 看完了。記在使用者身上，所以換一台電腦也不會再跳一次。 */
ACTS.storyend = function () {
  var u = me();
  if (u && !u.sawStory) { u.sawStory = now(); save(); }
  go('home');
};
