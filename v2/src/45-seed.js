/* 試用資料：一個班、三位老師、六組（每組兩人）、一個研究者。

   ⚠️ 動這個檔案就要把 40-db.js 的 SEED_V 加一。

   種子只在「沒有資料」或「版本舊了」的時候才跑（見 40-db.js 的 load）。
   已經開過網站的瀏覽器裡存著上一版的示範資料，版本號沒動它就不會重種
   ——改完部署上去，自己打開還是看到舊的那一份，而那看起來像沒改到。

   2026-09-07 就是這樣被騙了一次：一組從四人改成兩人、部署了、
   打開來還是四個人。

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
    classId: cid, name: '114-1 畢業專題', joinCode: 'DG7K2M',
    teacherId: 'U0', startedAt: ago(30)
  });
  /* 三位老師，同一個課程。Class.teacherId 不是權限（研究者那一頁
     只拿它顯示名字），所以共用一個 classId 就是共用一個課程。
     三位共同帶整個班。Team.mentorId 是舊模型留下來的欄位，
     沒有畫面在用（見 40-db.js 的 teachersOf）。 */
  [{ id: 'U0', ac: 'tea01', n: '老師·孟' },
   { id: 'U6', ac: 'tea02', n: '老師·薛' },
   { id: 'U7', ac: 'tea03', n: '老師·鄰' }].forEach(function (t) {
    DB.Users.push(seedPw({ userId: t.id, account: t.ac, name: t.n,
      role: 'teacher', classId: cid, createdAt: ago(30) }));
  });

  /* 研究者。管帳號、看紀錄、匯出——不進地下城。 */
  DB.Users.push(seedPw({ userId: 'U9', account: 'lab01', name: '研究者',
    role: 'researcher', classId: cid, createdAt: ago(31) }));

  var TEAMS = [
    /* mentor 留著沒有用了——老師看整個班（見 40-db.js 的 teamsUnder）。 */
    { id: 'G1', name: '第一組 · 甲', project: '校內共享單車調度', tier: 2, joined: 30, mentor: 'U0' },
    { id: 'G2', name: '第二組 · 乙', project: '課表 App',     tier: 0, joined: 30, mentor: 'U0' },
    { id: 'G3', name: '第三組 · 丙', project: '宿舍回收動線', tier: 1, joined: 30, mentor: 'U6' },
    { id: 'G4', name: '第四組 · 丁', project: '系上導覽',     tier: 1, joined: 30, mentor: 'U6' },
    { id: 'G5', name: '第五組 · 戊', project: '（還沒定）',   tier: 0, joined: 30, mentor: 'U7' }
  ];
  /* 一組三到四個人，各自挑不同的職業。

     四種職業的剪影不一樣，所以廊道上排成一列的時候一眼看得出誰是誰——
     那正是這個作品現在的樣子，種子資料要能示範它。

     名字用真的名字不用「學生1」：老師端會列出誰做了什麼，
     一排編號看不出那是四個人。 */
  /* 一組兩個人。

     本來是 4 / 2 / 3 / 3 / 3，示範的是「人數不一樣的組長什麼樣」。
     改成一律兩個，因為要示範的班就是那個樣子——六組、每組兩人、
     三位老師。人數不一樣那件事在真的班上自己會發生，不需要種子演。

     兩個人剛好夠示範這個系統裡唯二屬於個人的東西：那幾件掛在誰
     名下（別人的按不動）、還有「我做了什麼」一人一行。 */
  var NAMES = [
    ['小美', '阿哲'],
    ['宜庭', '冠廷'],
    ['雅琪', '承翰'],
    ['伯凱', '玟君'],
    ['沛慈', '柏翰']
  ];
  var JOBS = ['adv', 'mage', 'ninja', 'knight'];
  var CODES = ['KX7M2P', 'RD4T8W', 'BQ9N5J', 'HC3V6L', 'ZF8K1S'];
  var uSeq = 100;
  TEAMS.forEach(function (t, i) {
    DB.Teams.push({
      teamId: t.id, classId: cid, name: t.name, mentorId: t.mentor,
      project: t.project, joinedAt: ago(t.joined),
      /* 隊伍代碼。新的流程是學生自己建隊，把這一串唸給隊友。 */
      joinCode: CODES[i]
    });
    (NAMES[i] || ['學生']).forEach(function (nm, k) {
      /* 第一個人沿用舊 id——底下的種子資料（每一趟是誰交的、
         挑了什麼角色）都指名 U1–U5。 */
      var uid = k === 0 ? 'U' + (i + 1) : 'U' + (++uSeq);
      DB.Users.push(seedPw({
        userId: uid,
        account: k === 0 ? 'stu0' + (i + 1) : 'stu' + uid.slice(1),
        name: nm, role: 'student', classId: cid, teamId: t.id,
        hero: JOBS[(i + k) % JOBS.length], createdAt: ago(30)
      }));
      /* 不貼名冊。新流程是學生自己建隊、用代碼加入——
         留著名冊等於兩條路並存，而路由會優先走名冊那一條。 */
    });
  });
  var ALL = TEAMS.map(function (t) { return t.id; });

  /* ---------- 完全沒開過的那一個 ----------

     帳號在、名冊上有一格、其餘什麼都沒有。登入之後會照順序走過
     三件第一次才會發生的事：認領自己、挑角色、給專案取名字。

     不放進上面那個迴圈，是因為那個迴圈用序號配 userId——
     多一組會生出 U6，而 U6 是老師·薛。 */
  DB.Teams.push({
    teamId: 'G6', classId: cid, name: '第六組 · 己', mentorId: 'U7',
    project: '', joinedAt: ago(0),
    /* 代碼本來沒給——那時候這一組是空的，沒有人要加進來。現在它有
       兩個人，而沒有代碼的組是加不了第三個人的（見 actJoinTeam）。 */
    joinCode: 'MW6R4D'
  });
  /* 第六組的兩個人。

     ── 為什麼不放進上面那個迴圈 ──

     那個迴圈給每一組的第一個人配 'U' + (i + 1)，所以第六組的第一個人
     會拿到 U6——而 U6 是老師·薛。這一段留在外面，id 自己給。

     ── 這一組刻意什麼都還沒做 ──

     沒有任務、沒有走過的一趟、專案還沒取名。它示範的是一個班裡
     一定會有的那一種：報到了、還沒開始。老師端看得到他們在名單上
     但格子是空的，學生端進去第一件事是取專案名。 */
  [['U11', 'stu07', '思妤', 'ninja'],
   ['U12', 'stu08', '尚恩', 'knight']].forEach(function (x) {
    DB.Users.push(seedPw({
      userId: x[0], account: x[1], name: x[2],
      role: 'student', classId: cid, teamId: 'G6',
      hero: x[3], createdAt: ago(0)
    }));
  });

  /* 還沒有隊的那一個。

     六組都滿了，所以「還沒有隊的人看到什麼」沒有別的地方演得到——
     而那一頁（建隊／用代碼加入）是星期三每一個學生的第一頁。
     留一個帳號在那個狀態，隨時打得開來看。

     沒有 teamId：render 會把他送到那一頁（見 55-ui.js）。
     也沒有 hero：挑角色那一頁四個都不會打勾。 */
  DB.Users.push(seedPw({
    userId: 'U8', account: 'stu09', name: '還沒進組的',
    role: 'student', classId: cid, createdAt: ago(0)
  }));


  /* 老師分的段寫在任務上（見下面的 M1／M2）。第三個刻意不分——
     沒分段一樣走得完，那一個任務就是在證明這件事。 */

  /* ---------- 三個任務 ---------- */
  var M1 = { msId: 'M1', classId: cid, teams: [], at: ago(24),
    title: '找三份資料，記下各自在講什麼',
    steps: ['找來源', '讀過一次', '摘重點', '整理成表'],
    steps: ['找來源', '讀過一次', '摘重點', '整理成表'],
    note: '三份要來自不同的地方。同一個來源的三篇算一份。' };
  var M2 = { msId: 'M2', classId: cid, teams: [], at: ago(14),
    title: '把問題收斂成一句話',
    steps: ['把重點分類', '挑出一直出現的', '寫成一句'],
    steps: ['把重點分類', '挑出一直出現的', '寫成一句'],
    note: '不要寫題目，寫問題。' };
  var M3 = { msId: 'M3', classId: cid, teams: [], at: ago(3), due: T0 + 6 * DAY,
    title: '畫一張現在的流程圖',
    note: '猜的那幾步用虛線。' };
  /* 上面三個不掛 mentorId＝沒有記是誰派的，全班都收得到。
     它們底下掛著全部九趟的紀錄。

     M4 示範三位老師共同帶一個班長什麼樣：薛老師派的，他在派的時候
     自己點名發給丙丁兩組，而且比別人晚了十天才開始。「發給誰」是他
     點的（teams），不是系統照帶組關係替他分的——那個關係已經沒有了。 */
  var M4 = { msId: 'M4', classId: cid, mentorId: 'U6', teams: ['G3', 'G4'], at: ago(1), due: T0 + 12 * DAY,
    title: '找兩個人試一次，記下卡在哪',
    steps: ['做出可以試的版本', '約人', '在旁邊看他用'],
    note: '不要跟他解釋。他卡住的地方就是答案。' };
  DB.Milestones.push(M1, M2, M3, M4);
  DB.Config.seq = 10;

  /* 幫忙塞推進紀錄。

     每一天動的是哪一段也一起塞，取自那一個任務的分段——不然試用資料的
     廊道每一格都長一樣，看不出「這一趟大半在找資料」跟「這一趟一直在修改」
     的差別，而那正是這個機制要讓人看見的東西。
     沒分段的任務塞 -1，那也是一種樣子。 */
  function pushes(teamId, runId, days, from) {
    var a = (msOf((find('Runs', function (x) { return x.runId === runId; }) || {}).msId) || {}).steps || [];
    for (var i = 0; i < days; i++) {
      var at = ago(from - i);
      DB.Pushes.push({ pushId: nid('P'), teamId: teamId, runId: runId,
        day: dayOf(at), at: at,
        step: a.length ? hash(runId + i) % a.length : -1 });
    }
  }

  /* ---------- G1 甲：估得準，已經跑完兩個，第三個進行中 ---------- */
  DB.Runs.push({ runId: 'R1', teamId: 'G1', msId: 'M1', state: 'done',
    est: 6, actual: 6, stamp: 'exact', flags: [0], overs: [], pushes: 6,
    committedAt: ago(24), submittedAt: ago(18), doneAt: ago(17),
    word: '你說六天就是六天。中間那幾天沒有拖。' });
  pushes('G1', 'R1', 6, 23);

  DB.Runs.push({ runId: 'R2', teamId: 'G1', msId: 'M2', state: 'done',
    est: 4, actual: 3, stamp: 'early', flags: [], overs: [], pushes: 4,
    committedAt: ago(14), submittedAt: ago(11), doneAt: ago(10),
    word: '比上一次早兩天。' });
  pushes('G1', 'R2', 4, 13);

  DB.Runs.push({ runId: 'R3', teamId: 'G1', msId: 'M3', state: 'running',
    est: 5, flags: [2], overs: [], pushes: 2, committedAt: ago(3) });
  pushes('G1', 'R3', 2, 2);

  /* ---------- G2 乙：估太少，判定失準，還沒復盤 ---------- */
  DB.Runs.push({ runId: 'R4', teamId: 'G2', msId: 'M1', state: 'done',
    est: 3, actual: 9, stamp: 'late', flags: [], overs: [1, 2], pushes: 5,
    committedAt: ago(24), submittedAt: ago(15), doneAt: ago(14),
    word: '你們說做出來跟找人試比想的久，這兩件我看到了。' });
  pushes('G2', 'R4', 5, 22);

  DB.Runs.push({ runId: 'R5', teamId: 'G2', msId: 'M2', state: 'judged',
    est: 4, actual: 11, stamp: 'late', flags: [], overs: [], pushes: 6,
    committedAt: ago(14), submittedAt: ago(3) });
  pushes('G2', 'R5', 6, 12);

  /* ---------- G3 丙：正在跑，但四天沒推進——睡著了 ---------- */
  DB.Runs.push({ runId: 'R6', teamId: 'G3', msId: 'M1', state: 'done',
    est: 7, actual: 7, stamp: 'exact', flags: [2], overs: [], pushes: 7,
    committedAt: ago(24), submittedAt: ago(17), doneAt: ago(16),
    word: '七天你們來了七天。' });
  pushes('G3', 'R6', 7, 23);

  DB.Runs.push({ runId: 'R7', teamId: 'G3', msId: 'M2', state: 'running',
    est: 8, flags: [0], overs: [], pushes: 3, committedAt: ago(14) });
  pushes('G3', 'R7', 3, 12);   /* 最後一次在 12 天前 → 睡著 */

  /* ---------- G4 丁：交出去了，在等老師 ---------- */
  DB.Runs.push({ runId: 'R8', teamId: 'G4', msId: 'M1', state: 'done',
    est: 5, actual: 5, stamp: 'exact', flags: [], overs: [], pushes: 5,
    committedAt: ago(24), submittedAt: ago(19), doneAt: ago(18),
    word: '你們承諾的時候就標了整理逐字稿。' });
  pushes('G4', 'R8', 5, 23);

  DB.Runs.push({ runId: 'R9', teamId: 'G4', msId: 'M2', state: 'submitted',
    est: 6, actual: 6, stamp: 'exact', flags: [1], overs: [], pushes: 6,
    committedAt: ago(14), submittedAt: ago(2) });
  pushes('G4', 'R9', 6, 13);

  /* ---------- G5 戊：什麼都還沒承諾 ---------- */
  /* 刻意留白：三個任務都派了，一個都沒拉滑桿。
     系統要看得出這一組跟「在動但卡住」的不一樣。 */

  /* 每一組已經打通的那幾格。往下打通，數量跟走完幾趟一樣。 */
  TEAMS.forEach(function (tm) {
    var n = where('Runs', function (r) {
      return r.teamId === tm.id && r.state === 'done';
    }).length;
    for (var i = 0; i < n + 1; i++) digCell(cid, tm.id, null);
  });

  /* 封存過的岩心。直接用 coreOf 算一次，跟真的走完一趟長出來的一模一樣。 */
  [['G1', 'R1', '訪談那一週', 17], ['G1', 'R2', '收斂', 10], ['G2', 'R4', '拖到最後', 14],
   ['G3', 'R6', '', 16], ['G4', 'R8', '逐字稿地獄', 18]].forEach(function (k, i) {
    var sh = runShape(k[1]);
    if (!sh) return;
    var r = find('Runs', function (x) { return x.runId === k[1]; });
    if (r) r.coreName = k[2];
    /* 那一趟當時在第幾層。本來寫的是「現在」在第幾層——
       同一個錯 mobOfRun 那邊剛修掉。 */
    var kd = r ? runDepth(r) : 0;
    DB.Keeps.push({ keepId: 'K0' + (i + 1), teamId: k[0], runId: k[1],
      name: k[2], at: ago(k[3]),
      zone: strataAt(kd, k[0]).key,
      px: coreOf(k[1]),
      est: sh.est, elapsed: sh.elapsed, moved: sh.moved,
      rested: sh.rested, blank: sh.blank });
  });
  /* ---------- 收尾：把新的欄位補上 ----------

     這幾樣是「個人帳號、屬於一個組」之後才有的東西。沒有它們的話，
     打開來看到的還是上一版的樣子：一組一個人、細項沒有主人、
     沒有人說過自己做了什麼。 */
  dressRuns(cid);

  /* 下一個 id 從所有種子 id 的最大號往後接。

     本來寫死 100。而多人小組那一版把隊友放在 U101–U110，
     於是第二個真的註冊的人拿到 U101——跟種子裡的冠廷同號。
     userOf() 回傳先找到的那一筆，所以那個人一登入就變成冠廷：
     名字是別人的、組是別人的、他自己那一筆從此找不到。

     不要再寫死一個數字。數出來。 */
  var top = 0;
  [['Users', 'userId'], ['Teams', 'teamId'], ['Classes', 'classId'],
   ['Milestones', 'msId'], ['Runs', 'runId']].forEach(function (p) {
    (DB[p[0]] || []).forEach(function (r) {
      var n = parseInt(String(r[p[1]]).replace(/^[A-Za-z]+/, ''), 10);
      if (n > top) top = n;
    });
  });
  DB.Config.seq = top + 1;
  /* 這一份是示範資料，而且是第幾版。兩個旗子一起決定要不要重種
     （見 40-db.js 的 load）。 */
  /* 示範資料裡的學生都已經走過好幾趟了，所以他們早就看過開場。
     不標的話，每一位第一次換角色都會被重播一次（見 55-ui.js 的 hero）。 */
  DB.Users.forEach(function (u) {
    if (u.role === 'student' && !u.sawStory) u.sawStory = T0;
  });
  DB.Config.demo = 1;
  DB.Config.seedV = SEED_V;
  /* 示範資料的記號。帶著 _d 的那幾筆永遠不會被推到雲端上
     （見 41-sync.js）——不然第一個打開網頁的人會把整個示範班
     推上去給所有人看。

     反過來也成立：雲端已經有真的班了，這台機器的示範班還是在，
     兩邊並存。拿去給人看的那一份不會被別人的實驗資料弄亂。 */
  Object.keys(DB).forEach(function (c) {
    if (Object.prototype.toString.call(DB[c]) === '[object Array]') {
      DB[c].forEach(function (r) { if (r) r._d = 1; });
    }
  });
  save();
}

function dressRuns(cid) {
  var SAID = ['找到人跟排訪談', '約時間跟場地', '逐字稿', '整理成一頁',
    '畫流程圖', '訪談紀錄', '分類那幾張', '寫成一句'];
  var NEXT = ['再訪一個人，第三份太薄', '把流程圖的虛線補掉',
    '重排一次訪綱，前面太長', '再看一次分類，有兩類是同一件事'];
  var WHY = ['第二個受訪者臨時改期', '逐字稿比想的久很多',
    '訪綱太長，前兩場都超時', '中間卡在找不到人'];
  var WHERE = ['TronClass 第三次作業', 'TronClass 第二次作業，檔名 G-訪談',
    '印出來放你桌上', 'https://drive.example.com/d/abc123'];
  var SURE = ['high', 'mid', 'low'];

  where('Runs', function (r) { return true; }).forEach(function (r) {
    var t = teamOf(r.teamId);
    if (!t || t.classId !== cid) return;
    var mem = where('Users', function (u) { return inTeam(u, r.teamId); });
    if (!mem.length) return;
    var h = hash(r.runId);
    var ms = msOf(r.msId);

    /* 拆件。老師分過段就用那幾段，沒分就給兩件。 */
    if (!r.plan || !r.plan.length) {
      var names = (ms && ms.steps && ms.steps.length) ? ms.steps.slice(0, 4)
        : ['先做的那一半', '後做的那一半'];
      var left = r.est || 4;
      r.plan = names.map(function (n, i) {
        var d = i === names.length - 1 ? Math.max(1, left) : 1;
        left -= d;
        /* 那個天數是不是本人自己按的。真的班上會是一個混的比例
           （他們常常一起坐著、一台電腦規劃），所以示範資料也給一個
           混的——全部 N 會讓那一欄看起來像沒有作用。 */
        return { n: n, d: d, who: mem[(h + i) % mem.length].userId,
          byOwn: ((h + i) % 5 < 3) ? 1 : 0 };
      });
    }

    /* 他當初有多確定。 */
    if (!r.sure) r.sure = SURE[h % SURE.length];

    /* 老師回過一句的那一趟。示範資料裡留一個例子，不然匯出那一份
       的「老師回的天數」整欄空白，看起來像那個機制不存在。
       挑第一組最早那一趟——它已經收下了，所以整條協商的痕跡看得完整。 */
    if (r.runId === 'R1' && !r.askAt) {
      r.askEst = 8;
      r.askWord = '這一件去年那一組花了八天。你們要不要再看一次？';
      r.askBy = 'U0';
      r.askAt = (r.committedAt || now()) + DAY;
    }

    if (r.state === 'running') return;

    /* 交出去之後才有的那幾樣。 */
    if (!r.spent) {
      var got = r.actual || r.est || 1, n = r.plan.length;
      r.spent = r.plan.map(function (x, i) {
        return i === n - 1 ? Math.max(1, got - (n - 1)) : 1;
      });
    }
    if (!r.feel) r.feel = ['good', 'ok', 'bad'][h % 3];
    if (!r.why) r.why = WHY[h % WHY.length];
    if (!r.scope) r.scope = ['same', 'same', 'less', 'more'][h % 4];
    if (!r.next) r.next = NEXT[h % NEXT.length];
    if (!r.link) r.link = WHERE[h % WHERE.length];

    /* 每個人各寫的那一行。刻意讓每一組的最後一個人在最新的那一趟
       沒有寫——「還沒說」是這個模型裡看得到的一種真實情況。 */
    if (!r.said) {
      r.said = {};
      mem.forEach(function (u, i) {
        if (i === mem.length - 1 && h % 3 === 0) return;
        r.said[u.userId] = SAID[(h + i) % SAID.length];
      });
    }

    /* 老師收下時給的那幾枚。 */
    if ((r.state === 'done' || r.state === 'approved') && !r.bonus) {
      /* 一格 10 枚，所以試用資料也要落在 10 20 30 40 50 上——
         不然示範班上會出現一個學生按不出來的數字。 */
      r.bonus = RULES.COIN.bonusMin +
        (h % 5) * (RULES.COIN.bonusStep || 1);
    }
  });
}
