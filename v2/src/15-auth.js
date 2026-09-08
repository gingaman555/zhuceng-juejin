/* 帳號、登入、身分認領，以及研究紀錄的事件流。

   三種角色：
     student    學生。用加入碼註冊，然後從名冊裡認領自己是誰。
     teacher    老師。研究者建的。
     researcher 研究者。管帳號、看紀錄、匯出。

   密碼：這一版存在瀏覽器裡，所以雜湊只是「不要用明碼躺在 localStorage」，
   不是真的安全措施。真的上線要換成後端 ＋ bcrypt——這件事寫在這裡，
   免得有人以為它已經安全了。 */

/* 這句話印在建立帳號那一頁上，不藏起來（見 58-gate.js）。

   本來寫的是「這一版的密碼雜湊只擋肉眼，不是真的加密。上線前要換成
   後端驗證。」——誠實是對的，可是那是寫給工程師看的。讀它的是正在
   註冊的學生，他讀到的只有「這東西還沒做完」。

   同一件事講給他聽，而且給他唯一做得到的那件事：別重用密碼。
   誠實沒有少一分，多了一個他按得下去的動作。 */
var AUTH_NOTE = '這裡的密碼不是真的加密。別用你其他地方在用的密碼。';

/* 加鹽的字串雜湊。同一組帳密永遠得到同一個值。 */
function pwHash(pw, salt) {
  var s = String(salt) + '|' + String(pw);
  var h1 = 2166136261, h2 = 5381;
  for (var i = 0; i < s.length; i++) {
    h1 ^= s.charCodeAt(i); h1 = (h1 * 16777619) >>> 0;
    h2 = ((h2 * 33) ^ s.charCodeAt(i)) >>> 0;
  }
  return h1.toString(36) + h2.toString(36);
}

function newSalt() {
  return Math.floor(Math.random() * 2176782336).toString(36) + now().toString(36);
}

/* ---------- 事件流（研究紀錄） ----------
   每一個會改到資料的動作都記一筆。這就是研究資料本身：
   誰、在哪一個任務上、做了什麼、什麼時候。

   刻意不記「內容」——系統本來就不收作業。記的是行為的形狀：
   承諾幾天、推進的節奏、判定結果、卡在哪。 */
function logEvent(kind, o) {
  if (!DB || !DB.Events) return;
  /* 登入與註冊那兩筆是在還沒有 S.who 的時候記的，所以要讓呼叫端
     自己帶 by 進來——不然研究資料裡最重要的兩個動作會沒有角色。 */
  var u = (typeof S !== 'undefined' && S.who) ? userOf(S.who) : null;
  if (!u && o && o.by) u = userOf(o.by);
  DB.Events.push(Object.assign({
    evId: nid('E'),
    at: now(),
    by: u ? u.userId : (o && o.by) || '',
    role: u ? u.role : '',
    kind: kind
  }, o || {}));
  /* 事件只增不刪。原型跑久了會長，但它就是資料本身。 */
}

function eventsOf(classId, filter) {
  var teamIds = {};
  where('Teams', function (t) { return t.classId === classId; })
    .forEach(function (t) { teamIds[t.teamId] = t.name; });
  return DB.Events.filter(function (e) {
    if (e.teamId && !teamIds[e.teamId]) return false;
    if (filter && filter.kind && e.kind !== filter.kind) return false;
    if (filter && filter.teamId && e.teamId !== filter.teamId) return false;
    return true;
  }).slice().reverse();
}

/* 事件的中文說法。同一份資料，人看得懂的那一面。 */
var EV_SAY = {
  register: function (e) { return '註冊了帳號 ' + e.account; },
  login:    function () { return '登入'; },
  publish:  function (e) { return '派了任務「' + e.title + '」'; },
  commit:   function (e) { return '承諾 ' + e.est + ' 天' + (e.flags ? '，標了「' + e.flags + '」' : ''); },
  push:     function (e) { return '第 ' + e.n + ' 天' + (e.seg ? '：' + e.seg : '') + (e.back ? '（補登）' : ''); },
  submit:   function (e) { return '交出去：承諾 ' + e.est + ' 天，實際 ' + e.actual + ' 天 → ' + e.stamp; },
  reflect:  function (e) { return '說「' + (e.overs || '（沒有）') + '」比想的久'; },
  approve:  function () { return '勾了可以'; },
  keep:     function (e) { return '留下了「' + e.keep + '」那一張'; },
  tick:     function (e) { return (e.on ? '勾掉' : '取消勾掉') + '「' + e.step + '」'; },
  askexit:  function () { return '說專案做完了'; },
  left:     function () { return '走出去了'; },
  rename:   function (e) { return '把招牌改成「' + e.name + '」'; },
  joinclass:function (e) { return '加進「' + e.klass + '」'; },
  newteam:  function (e) { return '建了隊伍「' + e.name + '」'; },
  jointeam: function () { return '用代碼加入隊伍'; },
  claim:    function () { return '在班級地圖上占了一格'; },
  hero:     function (e) { return '挑了角色 ' + e.hero; },
  blurb:    function (e) { return '寫了招牌，' + e.len + ' 個字'; },
  mark:     function (e) { return '補登第 ' + e.n + ' 天'; },
  said:     function () { return '寫了這一趟做了什麼'; },
  reject:   function (e) { return '退回去改，寫了 ' + e.len + ' 個字'; },
  resend:   function (e) { return '改好再交一次（第 ' + e.backs + ' 次被退）'; },
  rethink:  function (e) { return '重新想過：本來說 ' + e.est + ' 天，走到第 ' + e.went + ' 天'; },
  denyexit: function () { return '說現在還不是時候'; },
  rank:     function (e) { return (e.on ? '打開' : '關掉') + '排行榜'; },
  askest:   function (e) { return '回了一句：他們說 ' + e.est + ' 天，我覺得 ' + e.ask + ' 天'; },
  light:    function (e) { return '用 ' + e.cost + ' 顆水晶照亮了「' + e.who + '」'; },
  askans:   function (e) {
    return e.was === e.now ? '談過之後維持 ' + e.now + ' 天（老師說 ' + e.ask + '）'
      : '談過之後從 ' + e.was + ' 天改成 ' + e.now + ' 天（老師說 ' + e.ask + '）';
  }
};
function evSay(e) {
  var f = EV_SAY[e.kind];
  return f ? f(e) : e.kind;
}

/* ---------- 註冊 ---------- */

function accountTaken(account) {
  return !!find('Users', function (u) {
    return String(u.account).toLowerCase() === String(account).toLowerCase();
  });
}

function classByCode(code) {
  return find('Classes', function (c) {
    return String(c.joinCode).toUpperCase() === String(code || '').toUpperCase();
  });
}

/* 學生註冊：加入碼 → 帳號密碼。註冊完還沒有身分，要再認領。 */
function actRegister(o) {
  var acc = String(o.account || '').trim();
  var pw = String(o.password || '');
  /* 名字一定要。沒有的話底下那一行會拿帳號頂替，而那正是要修的東西：
     全站印的都是 u.name，學號當名字的話老師分不出誰是誰。 */
  var nm = String(o.name || '').trim();
  if (!nm) return { err: '先寫你的名字——同學跟老師看到的就是這個。' };
  if (acc.length < 3) return { err: '帳號至少三個字。' };
  if (pw.length < 4) return { err: '密碼至少四個字。' };
  if (accountTaken(acc)) return { err: '這個帳號有人用了。' };

  /* 學生一定要有班級加入碼（老師唸給他們）。
     老師可以先開帳號、進來再開班——他是那個發碼的人，不該先跟人要碼。 */
  var kl = null;
  if (o.role === 'student') {
    kl = classByCode(o.code);
    if (!kl) return { err: '找不到這個加入碼。跟老師確認一次。' };
  } else if (o.code) {
    kl = classByCode(o.code);
    if (!kl) return { err: '找不到這個加入碼。' };
  }

  var salt = newSalt();
  var u = {
    userId: nid('U'), account: acc, salt: salt, hash: pwHash(pw, salt),
    role: o.role || 'student',
    name: nm,
    /* classId／teamId 是「現在坐的那一個座位」，seats 才是全部
       （見 40-db.js 的座位那一段）。 */
    classId: '', teamId: '', seats: [],
    createdAt: now()
  };
  if (kl) addSeat(u, kl.classId, '');
  /* 有人自己建帳號了——這份資料不再是示範資料，
     之後改版也不會被洗掉（見 40-db.js 的 load）。 */
  if (DB.Config) DB.Config.demo = 0;
  DB.Users.push(u);
  save();
  logEvent('register', { by: u.userId, account: acc, role: u.role });
  /* ── 不分組那一站：一個人就是一組 ──

     這一站上沒有組隊這一步（RULES.SOLO，由 build.js 的站台表打開）。
     所以註冊完當場給他一支只有他自己的隊，隊名就是他的名字。

     ── 為什麼是「自動建一隊」不是「把組拿掉」 ──

     Runs、Pushes、Keeps、圖鑑、深度、水晶全部掛在 teamId 上（全站 239
     處）。真的把那個概念拿掉是重寫資料層，而「一個人一組」在資料上
     就已經是個人制——那條路整支驗過（見 solo.js）。

     差別只在畫面上：底下那幾條把「你的隊呢」「全組一份」「誰做哪一件」
     藏起來，因為那幾句話對一個人不成立。 */
  if (RULES.SOLO && u.role === 'student' && kl) actNewTeam(nm, u.userId);
  return { user: u };
}

/* 加進一個已經開好的班。

   一個班三位老師共同帶，所以第二、第三位要進的是同一個班，不是各自
   開一個。開下去他會拿到一個誰都不在裡面的空班——而空班長得跟正常的
   一模一樣（沒有組、沒有人在等他看），他不會發現自己走錯了，
   會以為是學生還沒註冊。

   ── 好幾個班 ──

   本來這一支只給老師，而且已經有班的人會被擋（「你已經在一個班裡了」）。
   那條規則假設一個人一輩子只在一個班裡，可是：

     學生修兩門都用這套　　設計專題 ＋ 互動設計
     老師帶兩班　　　　　　大四專題 ＋ 大三專題

   現在兩種身分都加得了，而且已經有班的人是**再加一個座位**，
   不是換掉原本那個（見 40-db.js 的 addSeat）。研究者不用——
   他本來就看得到每一個班。 */
function actJoinClass(userId, code) {
  var u = userOf(userId);
  if (!u) return { err: '找不到這個人。' };
  if (u.role === 'researcher') return { err: '研究者看得到每一個班，不用加入。' };
  var kl = classByCode(code);
  if (!kl) return { err: '找不到這個加入碼。跟開班的人確認一次。' };
  if (inClass(u, kl.classId)) return { err: '你已經在「' + kl.name + '」裡了。' };
  addSeat(u, kl.classId, '');
  save();
  logEvent('joinclass', { by: u.userId, klass: kl.name });
  return { klass: kl };
}

/* ---------- 登入 ---------- */
function actLogin(account, pw) {
  var u = find('Users', function (x) {
    return String(x.account).toLowerCase() === String(account || '').trim().toLowerCase();
  });
  if (!u) return { err: '找不到這個帳號。' };
  if (!u.salt) return { err: '這個帳號還沒設定密碼，請研究者重設一次。' };
  if (pwHash(pw, u.salt) !== u.hash) return { err: '密碼不對。' };
  u.lastLogin = now();
  save();
  logEvent('login', { by: u.userId });
  return { user: u };
}

/* ---------- 名冊與身分認領 ----------
   老師先把名冊貼進來（一行一組），學生註冊之後從裡面挑自己是誰。
   這樣系統知道「這個帳號是哪一組的誰」，而且不用學生自己打組名。 */






/* 重設密碼與刪帳號那兩支拿掉了。

   它們唯一的呼叫端是研究者那一頁，而研究者現在只能看不能改
   （見 75-research.js 的檔頭）。留著一支沒有人呼叫得到的
   「刪掉任何人的帳號」，只會讓下一個讀這份程式的人以為那個
   權限還在。 */

/* 六個英數字。去掉會看錯的 I O 0 1——這串要用唸的。 */
function newCode() {
  var code = '';
  var CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (var i = 0; i < 6; i++) code += CH[Math.floor(Math.random() * CH.length)];
  return code;
}

/* 老師自己開班。開完他就在這個班裡，而那六碼是他唸給學生的東西。 */
function actNewClass(name, teacherId) {
  var u = userOf(teacherId);
  if (!u) return { err: '找不到這個人。' };
  var c = actCreateClass(name, teacherId).klass;
  /* 加一個座位，不是換掉原本那個——他可能已經在帶另一班。 */
  addSeat(u, c.classId, '');
  save();
  return { klass: c };
}

/* 學生自己建一隊。建的人直接進去，代碼唸給組員。 */
function actNewTeam(name, userId) {
  var u = userOf(userId);
  if (!u || !u.classId) return { err: '你還沒有班級。' };
  /* 擋的是「你在**這一班**已經有隊了」。他在另一個班有隊是正常的
     ——那是另一個座位。 */
  if (teamIn(u, u.classId)) return { err: '你在這一個班已經有隊了。' };
  var t = {
    teamId: nid('G'), classId: u.classId,
    name: String(name || '').trim().slice(0, 20) || '一支隊伍',
    joinCode: newCode(), project: '', joinedAt: now()
  };
  DB.Teams.push(t);
  addSeat(u, u.classId, t.teamId);
  save();
  logEvent('newteam', { teamId: t.teamId, name: t.name });
  return { team: t };
}

/* 用代碼加入。組建好就不能換——任務派給組、紀錄掛在組上，
   中途換組會讓歷史說謊。所以已經有隊的人擋在這裡。 */
function actJoinTeam(code, userId) {
  var u = userOf(userId);
  if (!u) return { err: '找不到這個人。' };
  /* 同上：擋的是這一班。組好就不能換還是成立，只是範圍是一個班。 */
  if (teamIn(u, u.classId)) return { err: '你在這一個班已經在一隊裡了。組好了就不能換。' };
  var t = find('Teams', function (x) {
    return x.classId === u.classId &&
      String(x.joinCode || '').toUpperCase() === String(code || '').toUpperCase();
  });
  if (!t) return { err: '找不到這個隊伍代碼。跟隊友確認一次。' };
  addSeat(u, u.classId, t.teamId);
  save();
  logEvent('jointeam', { teamId: t.teamId });
  return { team: t };
}

function actCreateClass(name, teacherId) {
  var code = newCode();
  var c = {
    classId: nid('C'), name: String(name || '未命名的班').trim(),
    joinCode: code, teacherId: teacherId || '', startedAt: now()
  };
  DB.Classes.push(c);
  save();
  return { klass: c };
}

/* ---------- 匯出 ----------
   研究資料。CSV，因為那是最容易進統計軟體的東西。 */
/* ---------- 一趟一列 ----------

   上面那一份（exportCsv）是流水帳：時間、誰做的、事件、說明。
   說明是一句中文——「交出去：承諾 4 天，實際 6 天 → early」。
   人讀很好，可是要算偏差率就得先從中文裡剖字。

   論文要看的那幾條全部卡在這裡：
     偏差率隨趟數有沒有下降　　需要 est 與 actual 成欄
     說「很確定」的準不準　　　需要 sure × stamp
     協商之後往哪邊靠　　　　　需要老師回的天數與最後定的天數
     退出集中在什麼時候　　　　需要承諾時間與退出時間

   所以另外給一份：一趟一列，每一個要算的東西自己一欄。
   一個字都不用剖。 */
function exportRuns(classId) {
  var head = ['組別', '專案', '任務', '一趟', '狀態',
    '承諾天數', '實際天數', '判定', '偏差率',
    '把握', '有沒有拆件', '拆幾件', '本人自己按的件數',
    '順不順', '為什麼', '範圍', '再兩天會做什麼', '東西在哪裡',
    /* 協商那三個數字要分得開。

       本來這裡只有「老師回的天數」與「談完之後的天數」，而後者印的是
       run.est——可是 actAnswerAsk 動的就是 run.est，所以「承諾天數」
       那一欄印的也是談完之後的那一個。兩欄同一個數字，學生本來說的
       那一個（estFirst）整份匯出裡沒有任何地方看得到。

       而「協商之後往哪邊靠」正是要那三個點：他一個人說的、老師說的、
       最後定的。少了第一個，那一題算不出來。 */
    /* 拆件用要徑算出來是幾天，以及他們有沒有改掉它。

       算出來 2 天、他們定 4 天，是這一組真的在做預估——他們知道某件
       計算不知道的事（相依、這禮拜有三科要交、一週只碰一次面）。
       算出來 2 天、他們就走 2 天，是接受了系統的算術。

       這兩件事在研究上完全不同，而少了這一欄它們長得一模一樣。 */
    '要徑算幾天', '有沒有改掉',
    '學生本來說幾天', '老師回的天數', '談完之後的天數',
    '被退幾次', '老師的話', '哪一位老師', '水晶加成',
    '承諾時間', '交出去時間', '收下時間', '交出去等了幾天'];
  var rows = [];
  where('Teams', function (t) { return t.classId === classId; }).forEach(function (t) {
    where('Runs', function (r) { return r.teamId === t.teamId; })
      .sort(function (a, b) { return (a.committedAt || 0) - (b.committedAt || 0); })
      .forEach(function (r) {
        var m = msOf(r.msId);
        var pl = r.plan || [];
        var byOwn = pl.filter(function (x) { return x.byOwn; }).length;
        /* 偏差率：|實際 − 承諾| ÷ 承諾。跟排行榜同一個算法
           （見 68-rank.js）——那裡解釋過為什麼不用「準的範圍」。 */
        var dev = (r.actual && r.est) ? Math.abs(r.actual - r.est) / r.est : '';
        var by = r.wordBy ? userOf(r.wordBy) : null;
        rows.push([
          t.name, t.project || '', m ? m.title : '', r.runId, r.state,
          r.est || '', r.actual || '', r.stamp || '',
          dev === '' ? '' : dev.toFixed(3),
          r.sure || '', pl.length ? 'Y' : 'N', pl.length, byOwn,
          r.feel || '', r.why || '', r.scope || '', r.next || '', r.link || '',
          /* 沒拆件就沒有要徑可言（estCalc 是 0），那一欄留空——
             0 會被讀成「算出來是零天」。 */
          r.estCalc || '',
          !r.estCalc ? '' : (r.estCalc === estOwn(r) ? 'N' : 'Y'),
          /* estFirst 只有「談過而且動了」才有；沒動的時候他本來說的
             就是 est 本身，所以那一欄照樣填得出來。 */
          r.askAt ? (r.estFirst == null ? (r.est || '') : r.estFirst) : '',
          r.askEst || '', r.askAt ? (r.est || '') : '',
          r.backs || 0, r.word || '', by ? by.name : '', r.bonus || '',
          r.committedAt ? new Date(r.committedAt).toISOString() : '',
          r.submittedAt ? new Date(r.submittedAt).toISOString() : '',
          r.doneAt ? new Date(r.doneAt).toISOString() : '',
          (r.submittedAt && r.doneAt) ? daysBetween(r.submittedAt, r.doneAt) : ''
        ]);
      });
  });
  return csvOf(head, rows);
}

/* ---------- 一件一列 ----------

   這一份是**個人層**的。系統裡唯二屬於個人的東西都在拆件上：
   那一件掛在誰名下、他說幾天、他實際幾天、那個天數是不是他本人
   按的（byOwn）。

   一趟一列那一份是組的單位，而「一個人學會預估自己要幾天」是個人的
   事——沒有這一份，那個主張只能用組的平均去談。

   資料一直都在，只是從來沒有一個地方把它攤成一列一列。 */
function exportItems(classId) {
  var head = ['組別', '任務', '一趟', '第幾件', '件名',
    '掛在誰名下', '他說幾天', '實際幾天', '差幾天',
    '天數是不是本人按的', '他寫了什麼', '這一趟的判定', '這一趟的把握'];
  var rows = [];
  where('Teams', function (t) { return t.classId === classId; }).forEach(function (t) {
    where('Runs', function (r) { return r.teamId === t.teamId; })
      .sort(function (a, b) { return (a.committedAt || 0) - (b.committedAt || 0); })
      .forEach(function (r) {
        var m = msOf(r.msId);
        (r.plan || []).forEach(function (x, i) {
          /* 全組一起做的那一件不掛在任何人名下，而空白會被讀成
             「漏填」——那一欄要寫得出「他們決定一起做」。 */
          var u = (x.who && !isAll(x.who)) ? userOf(x.who) : null;
          var 誰 = isAll(x.who) ? '全體' : (u ? u.name : '');
          var got = (r.spent || [])[i];
          rows.push([
            t.name, m ? m.title : '', r.runId, i + 1, x.n,
            誰, x.d || '', (got == null ? '' : got),
            (got == null || !x.d) ? '' : (got - x.d),
            x.byOwn ? 'Y' : 'N',
            u && r.said ? (r.said[u.userId] || '') : '',
            r.stamp || '', r.sure || ''
          ]);
        });
      });
  });
  return csvOf(head, rows);
}

/* 三份共用的那一段：逗號與引號要跳脫。 */
function csvOf(head, rows) {
  return [head].concat(rows).map(function (r) {
    return r.map(function (c) {
      var s = String(c == null ? '' : c);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',');
  }).join('\n');
}

function exportCsv(classId) {
  var teamName = {};
  where('Teams', function (t) { return t.classId === classId; })
    .forEach(function (t) { teamName[t.teamId] = t.name; });
  /* 「誰做的」這一欄是新的，換掉本來的「指導老師」。

     實驗是三位老師共同帶一個班，那三位就是變項。本來那一欄印的是
     Team.mentorId——一組配一位老師。可是共同帶班沒有那個關係，
     而且已經沒有畫面在設它，真的開一個班匯出來會整欄空白。

     真正分得開的是每一筆各自的行動者：這一件是哪一位派的、
     哪一位收的、哪一位退回的。logEvent 一直有記（e.by），
     只是從來沒印出來——「角色＝老師」在三位老師的班上等於沒分。 */
  var head = ['時間', '誰做的', '角色', '組別', '事件', '說明'];
  var rows = eventsOf(classId).map(function (e) {
    var by = e.by ? userOf(e.by) : null;
    return [
      new Date(e.at).toISOString(),
      by ? by.name : '',
      e.role || '',
      teamName[e.teamId] || '',
      e.kind,
      evSay(e)
    ];
  });
  return [head].concat(rows).map(function (r) {
    return r.map(function (c) {
      var s = String(c == null ? '' : c);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',');
  }).join('\n');
}
