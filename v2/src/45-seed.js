/* 試用資料：一個班、一位老師、五組、一個研究者。

   五組刻意做成五種不同的狀態，因為這個系統要證明的正是「它認得出
   五種不同的動」——準時的、估太少的、卡住的、剛派到的、睡著的。
   時間全部往回推，所以一打開就看得到推進紀錄與判定結果。

   每個帳號的密碼都是 DEMO_PW。這是試用資料，不是任何人的真帳號。 */

var DEMO_PW = '1234';

/* 把密碼種進一個使用者。真的註冊走 actRegister，這裡只是讓試用資料登得進去。 */
function seedPw(u) {
  u.salt = 'seed|' + u.userId;
  u.hash = pwHash(DEMO_PW, u.salt);
  return u;
}

function seed() {
  DB = blank();
  var T0 = Date.now();
  var ago = function (d) { return T0 - Math.round(d * DAY); };
  var cid = 'C1';

  DB.Classes.push({
    classId: cid, name: '設計專題', joinCode: 'DG7K2M',
    teacherId: 'U0', startedAt: ago(30)
  });
  DB.Users.push(seedPw({ userId: 'U0', account: 'tea01', name: '指導老師',
    role: 'teacher', classId: cid, createdAt: ago(30) }));

  /* 研究者。管帳號、看紀錄、匯出——不進地下城。 */
  DB.Users.push(seedPw({ userId: 'U9', account: 'lab01', name: '研究者',
    role: 'researcher', classId: cid, createdAt: ago(31) }));

  var TEAMS = [
    { id: 'G1', name: '第一組 · 甲', project: '畢製分工失衡', tier: 2, joined: 30 },
    { id: 'G2', name: '第二組 · 乙', project: '課表 App',     tier: 0, joined: 30 },
    { id: 'G3', name: '第三組 · 丙', project: '宿舍回收動線', tier: 1, joined: 30 },
    { id: 'G4', name: '第四組 · 丁', project: '系上導覽',     tier: 1, joined: 30 },
    { id: 'G5', name: '第五組 · 戊', project: '（還沒定）',   tier: 0, joined: 30 }
  ];
  TEAMS.forEach(function (t, i) {
    DB.Teams.push({
      teamId: t.id, classId: cid, name: t.name,
      project: t.project, joinedAt: ago(t.joined)
    });
    DB.Users.push(seedPw({
      userId: 'U' + (i + 1), account: 'stu0' + (i + 1), name: '學生' + (i + 1),
      role: 'student', classId: cid, teamId: t.id, createdAt: ago(30)
    }));
    DB.Roster.push({
      rosterId: 'RS' + (i + 1), classId: cid, teamId: t.id, teamName: t.name,
      memberName: '學生' + (i + 1), claimedBy: 'U' + (i + 1), claimedAt: ago(30)
    });
  });
  var ALL = TEAMS.map(function (t) { return t.id; });

  /* 每一組自己寫的清單。刻意五組五個樣子——系統不定義一個專案會做
     哪些事，所以試用資料也不該讓五組長得一樣。
     第五組沒寫，那一組證明沒有清單也走得完。 */
  actSetActs('G1', '訪談\n找案例\n畫草圖\n寫文案\n修改');
  actSetActs('G2', '查資料\n排功能\n畫介面\n做原型\n測試');
  actSetActs('G3', '現場觀察\n拍照\n量尺寸\n畫圖\n做模型');
  actSetActs('G4', '訪談\n整理逐字稿\n分類\n畫地圖\n寫報告');
  function aid(teamId, i) {
    var a = actsOf(teamId);
    return a[i] ? a[i].id : '';
  }

  /* ---------- 三個里程碑 ---------- */
  var M1 = { msId: 'M1', classId: cid, teams: [], at: ago(24),
    title: '訪三個人，記下他們怎麼講',
    note: '不要問「你覺得好不好」。問他上一次遇到這件事是什麼時候。' };
  var M2 = { msId: 'M2', classId: cid, teams: [], at: ago(14),
    title: '把痛點收斂成一句話',
    note: '不要寫題目，寫問題。' };
  var M3 = { msId: 'M3', classId: cid, teams: [], at: ago(3),
    title: '畫一張現在的流程圖',
    note: '猜的那幾步用虛線。' };
  DB.Milestones.push(M1, M2, M3);
  DB.Config.seq = 10;

  /* 幫忙塞推進紀錄。

     每一天動的是哪一件也一起塞，取自那一組自己的清單——不然試用資料的
     廊道每一格都長一樣，看不出「這一趟大半在訪談」跟「這一趟一直在修改」
     的差別，而那正是這個機制要讓人看見的東西。
     沒有清單的組（G5）塞空的，那也是一種樣子。 */
  function pushes(teamId, runId, days, from) {
    var a = actsOf(teamId);
    for (var i = 0; i < days; i++) {
      var at = ago(from - i);
      DB.Pushes.push({ pushId: nid('P'), teamId: teamId, runId: runId,
        day: dayOf(at), at: at,
        actId: a.length ? a[hash(runId + i) % a.length].id : '' });
    }
  }

  /* ---------- G1 甲：估得準，已經跑完兩個，第三個進行中 ---------- */
  DB.Runs.push({ runId: 'R1', teamId: 'G1', msId: 'M1', state: 'done',
    est: 6, actual: 6, stamp: 'exact', flags: [aid('G1', 0)], overs: [], pushes: 6,
    committedAt: ago(24), submittedAt: ago(18), doneAt: ago(17),
    word: '你說六天就是六天。訪談那幾天沒有拖。' });
  pushes('G1', 'R1', 6, 23);

  DB.Runs.push({ runId: 'R2', teamId: 'G1', msId: 'M2', state: 'done',
    est: 4, actual: 3, stamp: 'early', flags: [], overs: [], pushes: 4,
    committedAt: ago(14), submittedAt: ago(11), doneAt: ago(10),
    word: '比上一次早兩天。' });
  pushes('G1', 'R2', 4, 13);

  DB.Runs.push({ runId: 'R3', teamId: 'G1', msId: 'M3', state: 'running',
    est: 5, flags: [aid('G1', 2)], overs: [], pushes: 2, committedAt: ago(3) });
  pushes('G1', 'R3', 2, 2);

  /* ---------- G2 乙：估太少，判定失準，還沒復盤 ---------- */
  DB.Runs.push({ runId: 'R4', teamId: 'G2', msId: 'M1', state: 'done',
    est: 3, actual: 9, stamp: 'late', flags: [], overs: [aid('G2', 3), aid('G2', 4)], pushes: 5,
    committedAt: ago(24), submittedAt: ago(15), doneAt: ago(14),
    word: '你們說做原型跟測試比想的久，這兩件我看到了。' });
  pushes('G2', 'R4', 5, 22);

  DB.Runs.push({ runId: 'R5', teamId: 'G2', msId: 'M2', state: 'judged',
    est: 4, actual: 11, stamp: 'late', flags: [], overs: [], pushes: 6,
    committedAt: ago(14), submittedAt: ago(3) });
  pushes('G2', 'R5', 6, 12);

  /* ---------- G3 丙：正在跑，但四天沒推進——睡著了 ---------- */
  DB.Runs.push({ runId: 'R6', teamId: 'G3', msId: 'M1', state: 'done',
    est: 7, actual: 7, stamp: 'exact', flags: [aid('G3', 4)], overs: [], pushes: 7,
    committedAt: ago(24), submittedAt: ago(17), doneAt: ago(16),
    word: '七天你們來了七天。' });
  pushes('G3', 'R6', 7, 23);

  DB.Runs.push({ runId: 'R7', teamId: 'G3', msId: 'M2', state: 'running',
    est: 8, flags: [aid('G3', 0)], overs: [], pushes: 3, committedAt: ago(14) });
  pushes('G3', 'R7', 3, 12);   /* 最後一次在 12 天前 → 睡著 */

  /* ---------- G4 丁：交出去了，在等老師 ---------- */
  DB.Runs.push({ runId: 'R8', teamId: 'G4', msId: 'M1', state: 'done',
    est: 5, actual: 5, stamp: 'exact', flags: [], overs: [], pushes: 5,
    committedAt: ago(24), submittedAt: ago(19), doneAt: ago(18),
    word: '你們承諾的時候就標了整理逐字稿。' });
  pushes('G4', 'R8', 5, 23);

  DB.Runs.push({ runId: 'R9', teamId: 'G4', msId: 'M2', state: 'submitted',
    est: 6, actual: 6, stamp: 'exact', flags: [aid('G4', 1)], overs: [], pushes: 6,
    committedAt: ago(14), submittedAt: ago(2) });
  pushes('G4', 'R9', 6, 13);

  /* ---------- G5 戊：什麼都還沒承諾 ---------- */
  /* 刻意留白：三個里程碑都派了，一個都沒拉滑桿。
     系統要看得出這一組跟「在動但卡住」的不一樣。 */

  /* 他們留下的那幾句。存的是當下那句字，不是規則的 key——
     所以直接用 keepOffers 算一次，跟真的走完一趟得到的東西一模一樣。 */
  [['G1', 'R1', 'est', 17], ['G1', 'R2', 'days', 10], ['G2', 'R4', 'over', 14],
   ['G3', 'R6', 'days', 16], ['G4', 'R8', 'est', 18]].forEach(function (k, i) {
    var o = keepOffers(k[1]).filter(function (x) { return x.key === k[2]; })[0];
    if (!o) return;
    var r = find('Runs', function (x) { return x.runId === k[1]; });
    if (r) r.keep = k[2];
    DB.Keeps.push({ keepId: 'K0' + (i + 1), teamId: k[0], runId: k[1],
      key: k[2], line: o.line, at: ago(k[3]) });
  });
  DB.Config.seq = 100;
  save();
}
