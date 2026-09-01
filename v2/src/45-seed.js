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

  /* 研究者。管帳號、看紀錄、匯出——不進坑道。 */
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

     每一天做了什麼也一起塞——不然試用資料的走廊每一格都長一樣，
     看不出「這一趟是查很多天」跟「這一趟是一直在改」的差別，
     而那正是這個機制要讓人看見的東西。 */
  var DID = ['look', 'look', 'plan', 'make', 'make', 'talk', 'redo', 'make', 'any'];
  function pushes(teamId, runId, days, from) {
    for (var i = 0; i < days; i++) {
      var at = ago(from - i);
      DB.Pushes.push({ pushId: nid('P'), teamId: teamId, runId: runId,
        day: dayOf(at), at: at,
        kind: DID[hash(runId + i) % DID.length] });
    }
  }

  /* ---------- G1 甲：估得準，已經跑完兩個，第三個進行中 ---------- */
  DB.Runs.push({ runId: 'R1', teamId: 'G1', msId: 'M1', state: 'done',
    est: 6, actual: 6, stamp: 'exact', risks: ['wait'], snags: [], pushes: 6,
    committedAt: ago(24), submittedAt: ago(18), doneAt: ago(17),
    gear: 'compass', word: '你說六天就是六天。訪談這種事最容易低估，你們沒有。' });
  pushes('G1', 'R1', 6, 23);

  DB.Runs.push({ runId: 'R2', teamId: 'G1', msId: 'M2', state: 'done',
    est: 4, actual: 3, stamp: 'early', risks: [], snags: [], pushes: 4,
    committedAt: ago(14), submittedAt: ago(11), doneAt: ago(10),
    gear: 'boots', word: '比上一次快。你們把訪談那一輪的教訓用上了。' });
  pushes('G1', 'R2', 4, 13);

  DB.Runs.push({ runId: 'R3', teamId: 'G1', msId: 'M3', state: 'running',
    est: 5, risks: ['scope'], snags: [], pushes: 2, committedAt: ago(3) });
  pushes('G1', 'R3', 2, 2);

  /* ---------- G2 乙：估太少，判定失準，還沒復盤 ---------- */
  DB.Runs.push({ runId: 'R4', teamId: 'G2', msId: 'M1', state: 'done',
    est: 3, actual: 9, stamp: 'late', risks: [], snags: ['scope', 'start'], pushes: 5,
    committedAt: ago(24), submittedAt: ago(15), doneAt: ago(14),
    gear: 'lamp', word: '你把卡在哪講清楚了。看得見的困難才處理得掉。' });
  pushes('G2', 'R4', 5, 22);

  DB.Runs.push({ runId: 'R5', teamId: 'G2', msId: 'M2', state: 'judged',
    est: 4, actual: 11, stamp: 'late', risks: [], snags: [], pushes: 6,
    committedAt: ago(14), submittedAt: ago(3) });
  pushes('G2', 'R5', 6, 12);

  /* ---------- G3 丙：正在跑，但四天沒推進——睡著了 ---------- */
  DB.Runs.push({ runId: 'R6', teamId: 'G3', msId: 'M1', state: 'done',
    est: 7, actual: 7, stamp: 'exact', risks: ['skill'], snags: [], pushes: 7,
    committedAt: ago(24), submittedAt: ago(17), doneAt: ago(16),
    gear: 'sword', word: '推進得乾脆——沒有拖到最後一天。' });
  pushes('G3', 'R6', 7, 23);

  DB.Runs.push({ runId: 'R7', teamId: 'G3', msId: 'M2', state: 'running',
    est: 8, risks: ['wait'], snags: [], pushes: 3, committedAt: ago(14) });
  pushes('G3', 'R7', 3, 12);   /* 最後一次在 12 天前 → 睡著 */

  /* ---------- G4 丁：交出去了，在等老師 ---------- */
  DB.Runs.push({ runId: 'R8', teamId: 'G4', msId: 'M1', state: 'done',
    est: 5, actual: 5, stamp: 'exact', risks: [], snags: [], pushes: 5,
    committedAt: ago(24), submittedAt: ago(19), doneAt: ago(18),
    gear: 'shield', word: '你事先標了風險，而且標對了。' });
  pushes('G4', 'R8', 5, 23);

  DB.Runs.push({ runId: 'R9', teamId: 'G4', msId: 'M2', state: 'submitted',
    est: 6, actual: 6, stamp: 'exact', risks: ['split'], snags: [], pushes: 6,
    committedAt: ago(14), submittedAt: ago(2) });
  pushes('G4', 'R9', 6, 13);

  /* ---------- G5 戊：什麼都還沒承諾 ---------- */
  /* 刻意留白：三個里程碑都派了，一個都沒拉滑桿。
     系統要看得出這一組跟「在動但卡住」的不一樣。 */

  DB.Gears.push(
    { gearId: 'G01', teamId: 'G1', runId: 'R1', key: 'compass', at: ago(17) },
    { gearId: 'G02', teamId: 'G1', runId: 'R2', key: 'boots',   at: ago(10) },
    { gearId: 'G03', teamId: 'G2', runId: 'R4', key: 'lamp',    at: ago(14) },
    { gearId: 'G04', teamId: 'G3', runId: 'R6', key: 'sword',   at: ago(16) },
    { gearId: 'G05', teamId: 'G4', runId: 'R8', key: 'shield',  at: ago(18) }
  );
  DB.Config.seq = 100;
  save();
}
