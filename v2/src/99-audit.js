/* 兩端一起檢查。貼進瀏覽器的 console 就會裝上 AUDIT()。

   為什麼要有這一支：這個作品的畫面改得很密，而預覽窗只有一種寬度，
   所以只看一端的話另一端壞掉不會有人發現。實際發生過兩次——
   桌機那條 flex 版面本來是白名單制，後來加的元素全部縮成一小塊；
   承諾那一頁用到的兩支函式被誤刪，整頁是壞的，而手機端看不出來。

   用法：AUDIT() 跑完目前寬度的全部頁面。換寬度再跑一次。
   會略過因為行長而收窄的（max-width 不是 none）——那是排版該做的事。 */
window.AUDIT = function () {
  var t = myTeam(), cls = t.classId;
  var done = where('Runs', function (r) { return r.teamId === t.teamId && r.stamp; })[0];
  var run = where('Runs', function (r) { return r.teamId === t.teamId && r.state === 'running'; })[0];
  var ms = where('Milestones', function (m) { return m.classId === cls; })[0];
  var P = [['home', {}], ['commit', { id: ms.msId }], ['submit', { id: (run || done).runId }],
           ['battle', { id: (run || done).runId, at: 'end' }],
           ['stamp', { id: done.runId }], ['pick', { id: done.runId }],
           ['dash', { id: done.runId }], ['pack', {}], ['codex', {}],
           ['eco', {}], ['log', {}], ['exit', {}], ['sign', {}]];
  var out = [];
  P.forEach(function (pp) {
    try {
      S.page = pp[0]; S.p = pp[1]; S.flash = null; render();
      var de = document.documentElement;
      var w = document.querySelector('.wrap'), wr = w.getBoundingClientRect();
      var bad = [];
      if (de.scrollWidth > de.clientWidth + 2) {
        bad.push('橫向溢出 ' + de.scrollWidth + '>' + de.clientWidth);
      }
      [].forEach.call(w.children, function (e) {
        var cs = getComputedStyle(e), b = e.getBoundingClientRect();
        if (cs.display.indexOf('inline') === 0) return;
        if (cs.maxWidth !== 'none') return;
        if (e.classList.contains('btn') || e.classList.contains('quiet')) return;
        if (b.width > 0 && b.width < wr.width * 0.55) {
          bad.push('窄:' + (e.className || e.tagName).slice(0, 14) + '=' + Math.round(b.width));
        }
        if (b.right > wr.right + 4) bad.push('超出:' + (e.className || e.tagName).slice(0, 14));
      });
      if (!document.querySelectorAll('.nav a, .nav button').length) bad.push('沒導覽');
      out.push(pp[0] + (bad.length ? ' ✗ ' + bad.join(' / ') : ' ✓'));
    } catch (e) { out.push(pp[0] + ' ERR ' + e.message); }
  });
  S.page = 'home'; S.p = {}; render();
  return out.join('　');
};

/* ---------- 把動畫推到任意一格 ----------

   為什麼要有這一支：自動化瀏覽器不會推進動畫的時鐘，所以動畫做出來
   我看不到，只能等使用者看到不對再回報。那個迴圈不該由使用者跑。

   STEP(ms) 把畫面上每一段動畫都設到第 ms 毫秒並暫停，然後就可以截圖。
   要看整段就 STEP(0)、STEP(300)、STEP(900) 一格一格看。

   PLAY() 放開，讓它們照常跑。 */
window.STEP = function (ms) {
  var a = document.getAnimations();
  for (var i = 0; i < a.length; i++) {
    try { a[i].currentTime = ms; a[i].pause(); } catch (e) {}
  }
  return ms + 'ms　' + a.length + ' 段動畫';
};

window.PLAY = function () {
  var a = document.getAnimations();
  for (var i = 0; i < a.length; i++) { try { a[i].play(); } catch (e) {} }
  return a.length + ' 段動畫放開了';
};
