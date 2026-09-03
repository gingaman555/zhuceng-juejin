/* 故事。兩頁，第一次進來看一次，之後隨時從廊道上那扇門回來看。

   為什麼要有這一頁——量過的問題：一個全新的學生，前三個動作
   （認領自己、挑角色、給專案取名字）跟專案管理完全無關，而第一個
   真正的動作要等老師派任務，可能是隔天。中間那一段空窗是最危險的：
   他登入過一次、什麼都沒發生，就不會有第二次。

   所以這兩頁同時做兩件事：

     一 · 世界觀。他為什麼在一個地下城裡，那六層是什麼。
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
    title: '你在一座地下城裡',
    lines: [
      '這是一個專案。有多深，沒有人先知道。',
      '六個地方一直都在。每一趟你自己挑要去哪裡，去過的也可以再去。',
      '你可以一直穿梭，但出不去——門只有一扇，而且要老師開。'
    ]
  },
  {
    k: 'rule',
    eyebrow: '第二頁',
    title: '這裡只問你一件事',
    lines: [
      '出發前先說：這件事你要走幾天，然後挑一個地方。',
      '回來的時候只比兩個數字——你說的，跟實際的。',
      '做得好不好由老師說。'
    ],
    key: '所以估寬，不會比較好看。'
  }
];

/* ---------- 圖 ----------

   兩張都用世界自己的材料拼。第一張是一面崖：六層照 routeOf 的順序
   由上往下疊，每一層自己的底色與紋理，最上面站一個人跟一堆火。
   第二張是一條廊道的橫剖：你、你走過的那幾格、你說的那一天，
   跟站在那一天上的那一隻。 */

function storyCliff(t) {
  var seed = t ? t.classId : 'C1';
  var H = ['<div class="sty-art sty-cliff">'];
  /* 地表那一條，跟廊道的洞口同一個語彙 */
  H.push('<div class="sty-sky"></div>');
  for (var i = 0; i < 6; i++) {
    var z = strataAt(i, seed);
    H.push('<div class="sty-band ' + z.key + '" style="top:' + (44 + i * 44) +
      'px"><em>' + esc(z.name) + '</em></div>');
  }
  /* 洞口那一堆火，跟站在旁邊的人 */
  H.push('<div class="sty-fire"></div>');
  H.push('<div class="sty-who">' +
    pxTag(HERO.sitA, HERO.pal, 'wf wa') + pxTag(HERO.sitB, HERO.pal, 'wf wb') +
    '</div>');
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
  H.push(n === 0 ? storyCliff(t) : storyRoad(t));

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
