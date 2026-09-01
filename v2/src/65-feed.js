/* 首頁：全班最近發生的事。

   YouTube 的首頁放的是別人的影片，但它的主流程是把影片放上去。
   打開它的理由是別人，留下來的理由才是自己。

   這個系統本來反過來：首頁是自己的廊道，別人在另一個分頁裡當背景。
   所以沒有任何理由在不必要的時候打開它——一個人的東西看兩次就沒了。

   改成：
     上面一條   你手上這一趟（狀態 ＋ 那一顆鍵）。像 YouTube 的上傳。
     底下       全班最近發生的事，一則一則往下。

   feed 裡放什麼，這件事要小心。放的是「發生了什麼」，不是「誰比較好」：

     封存了一根岩心    ← 最有內容的一則，那根長什麼樣是那一組那一週的形狀
     交出去了          ← 不寫判定。誰估得準不準不該出現在別人的首頁上
     走到新的一層
     走出去了
     老師派了新的里程碑

   沒有名次、沒有數量、沒有印章。它是時間順序，不是排行榜。 */

/* 全班最近發生的事。從資料直接組，不從 Events——Events 是研究紀錄，
   欄位是為了匯出設計的，不是為了畫面。 */
function feedOf(classId, limit) {
  var out = [];
  var teams = {};
  where('Teams', function (t) { return t.classId === classId; })
    .forEach(function (t) { teams[t.teamId] = t; });

  /* 封存 */
  DB.Keeps.forEach(function (k) {
    if (!teams[k.teamId]) return;
    out.push({ at: k.at, kind: 'seal', team: teams[k.teamId], keep: k });
  });

  /* 交出去 */
  where('Runs', function (r) { return teams[r.teamId] && r.submittedAt; })
    .forEach(function (r) {
      var m = msOf(r.msId);
      out.push({ at: r.submittedAt, kind: 'sent', team: teams[r.teamId], ms: m });
    });

  /* 走出去 */
  Object.keys(teams).forEach(function (id) {
    if (teams[id].leftAt) out.push({ at: teams[id].leftAt, kind: 'left', team: teams[id] });
  });

  /* 老師派的 */
  where('Milestones', function (m) { return m.classId === classId; })
    .forEach(function (m) { out.push({ at: m.at, kind: 'pub', ms: m }); });

  out.sort(function (a, b) { return b.at - a.at; });
  return out.slice(0, limit || 20);
}

function feedRow(f, meId) {
  var mine = f.team && f.team.teamId === meId;
  var H = ['<div class="fd' + (mine ? ' mine' : '') + '">'];

  if (f.kind === 'seal') {
    var z = STRATA[0];
    STRATA.forEach(function (x) { if (x.key === f.keep.zone) z = x; });
    H.push('<button class="fd-ic" data-act="run" data-p=\'' +
      esc(JSON.stringify({ a: 'core:' + f.keep.keepId })) + '\'>' +
      pxTag(f.keep.px || coreOf(f.keep.runId), z.pal, 'core sm') + '</button>');
    H.push('<div><b>' + esc(f.team.name) + '</b>封存了一根岩心');
    H.push('<span>' + esc(f.keep.name || '（沒取名）') + '　·　' +
      (f.keep.elapsed || 0) + ' 天　·　' + esc(z.name) + '</span>');
    H.push('</div>');

  } else if (f.kind === 'sent') {
    H.push('<span class="fd-ic">' + pxTag(ICONS.log, ICON_PAL, 'nic') + '</span>');
    H.push('<div><b>' + esc(f.team.name) + '</b>交出去了');
    H.push('<span>' + esc(f.ms ? f.ms.title : '') + '</span></div>');

  } else if (f.kind === 'left') {
    H.push('<span class="fd-ic">' + pxTag(ICONS.home, ICON_ON, 'nic') + '</span>');
    H.push('<div><b>' + esc(f.team.name) + '</b>走出去了');
    H.push('<span>' + esc(f.team.project || '') + '</span></div>');

  } else {
    H.push('<span class="fd-ic">' + pxTag(ICONS.ms, ICON_PAL, 'nic') + '</span>');
    H.push('<div><b>老師</b>派了新的里程碑');
    H.push('<span>' + esc(f.ms.title) + '</span></div>');
  }

  H.push('<i>' + feedWhen(f.at) + '</i>');
  H.push('</div>');
  return H.join('');
}

function feedWhen(at) {
  var d = daysBetween(at, now());
  return d <= 0 ? '今天' : d === 1 ? '昨天' : d + ' 天前';
}

/* ── 你不在的這幾天 ──

   死線勇者的節奏：專注的時候不開 app，回來看發生了什麼。這個系統的
   限制剛好一樣（做之前開、做完開），所以那一半可以搬——但要搬得誠實。
   那邊掛機會自動打怪爆裝；這裡掛機只有日曆在走，所以這一條只報真的
   發生過的事。沒有憑空長出來的東西，也沒有為了讓人回來而發的獎勵。

   回傳 null 代表沒隔多久，那就什麼都不要畫。 */
function awayOf(meId) {
  var u = userOf(meId);
  if (!u || !u.seenAt) return null;
  var d = daysBetween(u.seenAt, now());
  if (d < 1) return null;
  var t = teamOf(u.teamId);
  var cut = u.seenAt;
  var cells = 0;
  where('Keeps', function (k) {
    return teamOf(k.teamId) && teamOf(k.teamId).classId === t.classId && k.at > cut;
  }).forEach(function () { cells++; });
  var run = where('Runs', function (r) {
    return r.teamId === t.teamId && r.state === 'running';
  })[0];
  /* 老師勾了也算「你不在的時候發生的事」——而且是唯一一件
     有人特地為你做的。 */
  var ok = where('Runs', function (r) {
    return r.teamId === t.teamId && r.state === 'approved';
  }).length;
  return {
    days: d,
    cells: cells,
    okd: ok,
    left: run ? Math.max(0, run.est - daysBetween(run.committedAt, now())) : null
  };
}

/* 看過就記下來。不記的話它每次進來都會再喊一次同樣的話。 */
function markSeen(meId) {
  var u = userOf(meId);
  if (u) { u.seenAt = now(); save(); }
}