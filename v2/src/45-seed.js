/* 試用資料：一個班、一位老師、五組。

   規格書說每一條規則都用「五組＋一位老師」的全班模擬驗證過，這裡種的就是
   那一班。時間全部往回推，所以一進來就看得到停留天數、期限、往返紀錄。 */

var D = 86400000;

function seed() {
  DB = blank();
  var T0 = Date.now();
  var ago = function (d) { return T0 - Math.round(d * D); };

  var cid = 'C1';
  DB.Classes.push({ classId: cid, name: '設計專題', courseStart: ago(24),
    joinCode: 'J3AJE5', teacherId: 'U0', sandbox: true });

  DB.Users.push({ userId: 'U0', account: 'tea01', name: '斗篷人', role: 'teacher', classId: cid });

  var TEAMS = [
    { id: 'G1', name: '第一組 · 甲', layer: 2, entered: 3 },
    { id: 'G2', name: '第二組 · 乙', layer: 1, entered: 11 },
    { id: 'G3', name: '第三組 · 丙', layer: 1, entered: 6 },
    { id: 'G4', name: '第四組 · 丁', layer: 3, entered: 1 },
    { id: 'G5', name: '第五組 · 戊', layer: 1, entered: 8 }
  ];
  TEAMS.forEach(function (t, i) {
    DB.Teams.push({ teamId: t.id, classId: cid, name: t.name, layer: t.layer,
      enteredAt: ago(t.entered), tools: [], tro: [], history: [] });
    DB.Users.push({ userId: 'U' + (i + 1), account: 'stu0' + (i + 1), name: '學生' + (i + 1),
      role: 'student', classId: cid, teamId: t.id, history: [] });
    DB.Roster.push({ classId: cid, teamName: t.name, memberName: '學生' + (i + 1), claimedBy: 'U' + (i + 1) });
  });

  var ALL = TEAMS.map(function (t) { return t.id; });

  /* ---------- 老師開的任務 ---------- */

  var L1 = [
    { title: '寫下你們要做什麼',
      cond: '一句話講得完，而且講得出為什麼是這一件。',
      note: '不要寫題目，寫問題。「做一個 App」不是問題。',
      checks: ['看過至少三個相近的案子', '寫出一句話的題目', '說得出為什麼是這一件',
        '列出這一版還不確定的地方'],
      due: ago(21) },
    { title: '這件事現在誰在做',
      cond: '找得出三個正在做同一件事的人或單位，並說得出他們之間的差別。',
      note: '找不到競爭者通常不是因為沒有，是因為關鍵字還沒找對。',
      checks: ['列出三個', '每一個寫一句他們在解什麼', '說出他們彼此的差別'],
      due: ago(15) },
    { title: '第一版路線圖',
      cond: '畫得出從現在到期末的順序，並標出哪一段最可能出錯。',
      note: '第一版一定會改。沒有它就沒有東西可以改。',
      checks: ['排出順序', '標出最可能出錯的一段', '寫下這一版的前提'],
      due: null }
  ];
  var L2 = [
    { title: '你們去問了誰',
      cond: '至少三個人，而且寫得出他們說的跟你們原本以為的差在哪。',
      note: '訪談不是去確認你已經想好的答案。',
      checks: ['訪了三個人以上', '每一個記下一句原話', '寫出跟原本假設不一樣的地方'],
      due: ago(-2) },
    { title: '查到的東西怎麼收',
      cond: '收斂成不超過五條，每一條說得出來源。',
      note: '查不完是正常的。這一項要練的是決定什麼時候停。',
      checks: ['收斂成五條以內', '每一條標出來源', '寫下你們決定停下來的理由'],
      due: ago(-5) },
    { title: '這一版的問題定義',
      cond: '跟第一層那一句比，說得出改了什麼、為什麼改。',
      note: '沒改也可以，但要說得出為什麼查完了還是同一句。',
      checks: ['寫出新的一句', '並排列出舊的那一句', '說明改了什麼'],
      due: null }
  ];
  var L3 = [
    { title: '三個真的不一樣的做法',
      cond: '三個做法要能各自被否定，不是同一個做法的三種顏色。',
      note: '如果三個都做得出來，那它們大概是同一個。',
      checks: ['畫出三個', '寫出每一個成立的前提', '寫出每一個會死在哪'],
      due: ago(-3) }
  ];

  var mk = function (layer, list, teams) {
    return list.map(function (o) {
      return actPublish(cid, layer, {
        title: o.title, cond: o.cond, note: o.note, checks: o.checks,
        due: o.due, teams: teams
      });
    });
  };

  var k1 = mk(1, L1, ALL);
  var k2 = mk(2, L2, ['G1', 'G4']);
  var k3 = mk(3, L3, ['G4']);

  /* 任務是老師陸續開的，不是同一秒 */
  k1[0].ts = ago(22); k1[1].ts = ago(19); k1[2].ts = ago(17);
  k2[0].ts = ago(12); k2[1].ts = ago(10); k2[2].ts = ago(4);
  k3[0].ts = ago(2);

  /* ---------- 走過的路 ---------- */

  var pass = function (teamId, task, gave, reason, sentAgo, judgedAgo, said, attempt) {
    var tt = ttOf(teamId, task.taskId);
    tt.checked = task.checks.map(function (_, i) { return i; });
    tt.effort = 'same';
    tt.text = said || '';
    tt.attempt = attempt || 1;
    for (var a = 1; a <= tt.attempt; a++) {
      DB.Submissions.push({ teamId: teamId, taskId: task.taskId, attempt: a,
        text: a === tt.attempt ? (said || '') : '', effort: 'same',
        ts: ago(sentAgo + (tt.attempt - a) * 3) });
    }
    tt.sentAt = ago(sentAgo);
    tt.status = 'done'; tt.gave = gave; tt.doneAt = ago(judgedAgo); tt.seen = true;
    tt.finds = rollFinds(task.layer, RULES.draws(task.layer, gave), teamId + '/' + task.taskId + '/' + tt.attempt);
    DB.Reviews.push({ teamId: teamId, taskId: task.taskId, result: 'ok', reason: reason,
      gave: gave, attempt: tt.attempt, latency: (sentAgo - judgedAgo) * D, ts: ago(judgedAgo) });
  };

  var sendBack = function (teamId, task, reason, sentAgo, judgedAgo, said) {
    var tt = ttOf(teamId, task.taskId);
    tt.checked = task.checks.map(function (_, i) { return i; });
    tt.effort = 'slow'; tt.text = said || ''; tt.attempt = 1;
    DB.Submissions.push({ teamId: teamId, taskId: task.taskId, attempt: 1,
      text: said || '', effort: 'slow', ts: ago(sentAgo) });
    tt.sentAt = ago(sentAgo);
    tt.status = 'back';
    DB.Reviews.push({ teamId: teamId, taskId: task.taskId, result: 'back', reason: reason,
      gave: 0, attempt: 1, latency: (sentAgo - judgedAgo) * D, ts: ago(judgedAgo) });
  };

  var sent = function (teamId, task, sentAgo, said, effort) {
    var tt = ttOf(teamId, task.taskId);
    tt.checked = task.checks.map(function (_, i) { return i; });
    tt.effort = effort || 'same'; tt.text = said || ''; tt.attempt = 1;
    tt.status = 'sent'; tt.sentAt = ago(sentAgo);
    DB.Submissions.push({ teamId: teamId, taskId: task.taskId, attempt: 1,
      text: said || '', effort: tt.effort, ts: ago(sentAgo) });
  };

  /* 第一組：第一層走完，老師放行過一次 */
  pass('G1', k1[0], 3,
    '你們把題目從「做一個提醒帶傘的 App」改成「人是在什麼時候決定不帶傘的」——' +
    '這一步比你們想的重要，後面每一個決定都會回來對照這一句。' +
    '多找的那六個案子沒有白找，第三個那個我沒看過。',
    20, 19, '除了要求的三個，我們另外看了六個，其中兩個是國外的。', 1);
  pass('G1', k1[1], 0,
    '三個都找到了，寫的是它們長什麼樣子，不是它們在解什麼。' +
    '長相會過時，問題不會——下一次先問「他們在替誰解決什麼」，再看畫面。',
    16, 15, '', 1);
  pass('G1', k1[2], 4,
    '你們標出來的那一段（等訪談排期）確實是最可能出錯的地方，而且你們自己先排了備案。' +
    '第一版路線圖能做到這樣少見。順序我沒有要改的。',
    13, 12, '我們另外畫了一版「如果訪談約不到人」的路線，兩版都附上了。', 2);
  DB.Passes.push({ teamId: 'G1', layer: 1, verdict: 'ok',
    reason: '你們說得出自己要挖什麼了。第二層開始會查不完——記得那一層要練的是停下來。',
    ts: ago(3) });
  var g1 = teamOf('G1');
  g1.tools = [1];
  /* 霧面者退開的時候留了三件。第一組還沒回來挑——所以一進來看到的第一件事
     就是那三句話擺在面前。 */
  DB.Picks.push({ pickId: nid('P'), teamId: 'G1', layer: 1,
    offer: offerTrophies(1, [], 'G1/1'), chosen: null, ts: ago(3) });

  /* 第一組的第二層：要補的／還沒交／等老師驗收，各一項 */
  sendBack('G1', k2[0],
    '三個人裡有兩個是你們同學。同學會順著你們講，這一份訪談等於問了一個人。' +
    '再找兩個真的會遇到這個問題的人——不用多，兩個就好。',
    5, 4, '訪了三個，有兩個是班上同學。');
  sent('G1', k2[1], 1, '我們列了七條收不完，最後砍成五條，砍掉的兩條也附在後面。', 'slow');
  /* k2[2] 留在「還沒交」 */

  /* 第二組：這一層目前開的都交了，等最久 */
  k1.forEach(function (t, i) { sent('G2', t, 7 - i, i === 0 ? '這一版我們改過三次。' : ''); });

  /* 第三組：交了一項，而且說卡住了 */
  sent('G3', k1[0], 4, '');
  var b = ttOf('G3', k1[1].taskId);
  b.blocker = '找不到第三個在做同一件事的單位，關鍵字換了十幾組都是同一批結果。';
  b.checked = [0];

  /* 第四組：走到第三層 */
  pass('G4', k1[0], 2, '題目講得清楚。為什麼是這一件講得比較弱，之後會被問到。', 18, 17, '', 1);
  pass('G4', k1[1], 1, '三個找到了，差別寫得太快。', 15, 14, '', 1);
  pass('G4', k1[2], 3, '順序合理，而且你們自己標出了會出錯的那一段。', 12, 11, '', 1);
  DB.Passes.push({ teamId: 'G4', layer: 1, verdict: 'ok', reason: '可以往下。', ts: ago(10) });
  pass('G4', k2[0], 2, '訪談有做，記的是結論不是原話。原話比結論有用。', 8, 7, '', 1);
  pass('G4', k2[1], 0, '五條收得乾淨。來源標了，但停下來的理由沒寫。', 5, 4, '', 1);
  pass('G4', k2[2], 1, '改了，也說得出為什麼改。', 3, 2, '', 2);
  DB.Passes.push({ teamId: 'G4', layer: 2, verdict: 'ok',
    reason: '你們在查不完的地方決定了夠了。那個判斷本身就是這一層要學的東西。', ts: ago(1) });
  var g4 = teamOf('G4');
  g4.tools = [1, 2];
  /* 第四組兩層都挑過了 */
  [1, 2].forEach(function (L) {
    var offer = offerTrophies(L, g4.tro, 'G4/' + L);
    var took = offer[L % offer.length];
    DB.Picks.push({ pickId: nid('P'), teamId: 'G4', layer: L, offer: offer,
      chosen: took, ts: ago(11 - L), pickedAt: ago(11 - L) });
    g4.tro.push(took);
  });

  /* 第五組：來了，還沒交 */
  var f = ttOf('G5', k1[0].taskId);
  f.checked = [0, 1];

  /* 第一組有一件回頭補強在等他判 */
  DB.Redigs.push({ redigId: nid('R'), teamId: 'G1', taskId: k1[1].taskId,
    note: '那一項你說我們寫的是長相不是問題。我們回去把三個案子重寫成「他們替誰解決什麼」，' +
      '重寫之後發現其中一個其實跟我們不是同一件事，換掉了。',
    status: 'sent', reason: '', ts: ago(1) });

  /* ---------- 上一個專案 ---------- */
  /* 圖鑑是個人的：換組、換班、換專案都跟著人走。
     學生1 上學期在另一班另一組走過兩項——那兩隻與那幾件現在還在他的圖鑑裡，
     但不進這一班的排行榜、地圖與任務清單。 */
  (function () {
    DB.Classes.push({ classId: 'C0', name: '上學期 · 基礎設計', courseStart: ago(300),
      joinCode: 'OLD001', teacherId: 'U0', sandbox: true, past: true });
    DB.Teams.push({ teamId: 'G0', classId: 'C0', name: '上學期 · 第二組', layer: 2,
      enteredAt: ago(260), tools: [1], tro: [], history: [] });
    var old = [
      { layer: 1, title: '上學期：題目一句話', cond: '一句話講得完。',
        checks: ['寫出一句'], gave: 2 },
      { layer: 1, title: '上學期：前例調查', cond: '找得出三個相近的做法。',
        checks: ['列出三個'], gave: 4 }
    ];
    old.forEach(function (o, i) {
      var t = actPublish('C0', o.layer, { title: o.title, cond: o.cond,
        checks: o.checks, due: null, teams: ['G0'] });
      t.ts = ago(290 - i * 10);
      var tt = ttOf('G0', t.taskId);
      tt.checked = [0]; tt.effort = 'same'; tt.attempt = 1;
      tt.status = 'done'; tt.gave = o.gave; tt.doneAt = ago(280 - i * 10); tt.seen = true;
      tt.finds = rollFinds(o.layer, RULES.draws(o.layer, o.gave), 'G0/' + t.taskId);
      DB.Reviews.push({ teamId: 'G0', taskId: t.taskId, result: 'ok',
        reason: '上學期的判斷。', gave: o.gave, attempt: 1, latency: D, ts: ago(280 - i * 10) });
    });
    DB.Passes.push({ teamId: 'G0', layer: 1, verdict: 'ok', reason: '上學期放行。', ts: ago(275) });
    var offer0 = offerTrophies(1, [], 'G0/1');
    DB.Picks.push({ pickId: nid('P'), teamId: 'G0', layer: 1, offer: offer0,
      chosen: offer0[2], ts: ago(275), pickedAt: ago(275) });
    teamOf('G0').tro = [offer0[2]];
    userOf('U1').history = ['G0'];
  })();
  DB.Config.seq = 100;
  save();
}
