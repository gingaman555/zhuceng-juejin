/* 他改得動自己的資料，改不動別人的。跑：node me.js（cwd 在 v2）

   2026-09-09 加「你的資料」那一頁的時候一起寫的。在那之前帳號建好就
   定死了：名字打錯就錯著，密碼打錯就是那個帳號再也進不去，而唯一的
   出路是再註冊一個——同一個人兩個 userId，事件流被切成兩段。

   ── 這一支守三件事 ──

   一 · 本人才改得動。換密碼一定要先打對現在那一個，拿別人的密碼
        換不掉別人的。沒有任何角色因為這一頁而拿到改別人帳號的能力
        （研究者唯讀那條軸，見 75-research.js 的檔頭）

   二 · **密碼不可以進事件流**。這一條最嚴重：Events 是 SYNC_UP_ONLY，
        上去就下不來也刪不掉（見 41-sync.js），而 Firestore 那邊的規則
        是完全開放的（見 firestore.rules）。所以只要有一筆帶著密碼上去，
        它就永遠躺在一個只靠網址保護的地方，沒有人收得回來

   三 · 改名字要接得回同一個人。全站印的都是 u.name，所以流水帳上
        必須看得出「從什麼改成什麼」，不然同一個 userId 在前後兩張
        截圖裡會像兩個人

   擋掉的那幾次不可以留下痕跡：改失敗還記一筆的話，匯出裡會出現
   一堆沒有發生的事。 */
const fs=require('fs');
let MEM={};global.localStorage={getItem:k=>MEM[k]==null?null:MEM[k],setItem:(k,v)=>{MEM[k]=String(v);},removeItem:k=>{delete MEM[k];}};
const st={value:'',innerHTML:'',textContent:'',className:'',style:{},getAttribute:()=>null,setAttribute:()=>{},addEventListener:()=>{},appendChild:()=>{},insertAdjacentHTML:()=>{},querySelector:()=>null,querySelectorAll:()=>[],getBoundingClientRect:()=>({top:0,left:0,right:0,bottom:0,width:0,height:0}),classList:{add:()=>{},remove:()=>{},toggle:()=>{}},scrollIntoView:()=>{},focus:()=>{}};
global.document={getElementById:()=>Object.create(st),querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>Object.create(st),addEventListener:()=>{},body:Object.create(st),documentElement:Object.create(st),activeElement:null};
global.window=global;global.innerWidth=390;global.scrollTo=()=>{};global.requestAnimationFrame=()=>0;global.setTimeout=()=>0;global.clearTimeout=()=>{};global.getComputedStyle=()=>({fontSize:'22px'});global.matchMedia=()=>({matches:false,addListener:()=>{}});
eval(fs.readdirSync('src').filter(f=>f.endsWith('.js')).sort().map(f=>fs.readFileSync('src/'+f,'utf8')).join('\n'));
let 錯=[];const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ ')+m);if(!c)錯.push(m);};

DB=blank();
const t=actRegister({account:'tea_x',password:'aaaa',name:'林老師',role:'teacher'}).user;
const kl=actNewClass('班',t.userId).klass;
const Areg=actRegister({account:'stu_a',password:'aaaa',name:'小美',role:'student',code:kl.joinCode});
const A=Areg.user;

console.log('\n── 改名字 ──');
ok(actSetName(A.userId,'王小美').user.name==='王小美','改得動');
ok(actSetName(A.userId,'王小美').err,'跟原本一樣會擋');
ok(actSetName(A.userId,'   ').err,'空白會擋');
ok(userOf(A.userId).name==='王小美','擋掉的那兩次沒有改到資料');
const ev=DB.Events.filter(e=>e.kind==='setname');
ok(ev.length===1,'只記了一筆（擋掉的不記）');
ok(ev[0].from==='小美'&&ev[0].name==='王小美','記了從什麼改成什麼');
ok(EV_SAY.setname(ev[0]).indexOf('小美')>=0&&EV_SAY.setname(ev[0]).indexOf('undefined')<0,'說明欄是中文：'+EV_SAY.setname(ev[0]));

console.log('\n── 換密碼 ──');
ok(actSetPw(A.userId,'wrong','bbbb').err==='現在的密碼不對。','舊密碼錯就擋');
ok(actLogin('stu_a','aaaa').user,'擋掉之後舊密碼還能用');
ok(actSetPw(A.userId,'aaaa','b').err===RULES.pwRule(),'太短會擋，而且句子是組出來的：'+RULES.pwRule());
ok(actSetPw(A.userId,'aaaa','aaaa').err,'跟原本一樣會擋');
ok(actSetPw(A.userId,'aaaa','bbbb').user,'舊密碼對就換得掉');
ok(actLogin('stu_a','aaaa').err==='密碼不對。忘記的話，下面有一顆「忘記密碼」。','舊密碼失效了');
ok(actLogin('stu_a','bbbb').user,'新密碼進得去');

console.log('\n── 密碼不可以外洩到事件流 ──');
const pev=DB.Events.filter(e=>e.kind==='setpw');
ok(pev.length===1,'只記了一筆');
ok(JSON.stringify(pev[0]).indexOf('bbbb')<0&&JSON.stringify(pev[0]).indexOf('aaaa')<0,'那一筆裡面沒有任何密碼');
ok(JSON.stringify(DB.Events).indexOf('bbbb')<0,'整份事件流裡都沒有新密碼');

console.log('\n── 救援碼：密碼救不回來的時候，本人自己換得掉 ──');
ok(!!Areg.recov,'註冊那一刻給了一組救援碼');
ok(actRecoverPw('stu_a','KKKK-KKKK-KKKK','zzzz').err==='救援碼不對。','碼錯就擋');
ok(actLogin('stu_a','bbbb').user,'碼錯的時候密碼沒被動到');
const rec1=actRecoverPw('stu_a',Areg.recov,'zzzz');
ok(!!rec1.user,'碼對就換得掉，不用打舊密碼');
ok(actLogin('stu_a','bbbb').err,'舊密碼失效了');
ok(actLogin('stu_a','zzzz').user,'用救援碼換的新密碼進得去');
ok(!!rec1.recov&&rec1.recov!==Areg.recov,'用過一次，換一組新的');
ok(actRecoverPw('stu_a',Areg.recov,'yyyy').err==='救援碼不對。','舊的那組用過就失效');
ok(actRecoverPw('stu_a',rec1.recov,'yyyy').user,'新的那組還能用');

console.log('\n── 救援碼不可以外洩到事件流 ──');
const rev=DB.Events.filter(e=>e.kind==='recoverpw');
ok(rev.length===2,'兩次都記了一筆');
ok(JSON.stringify(DB.Events).indexOf(Areg.recov)<0,'整份事件流裡都沒有第一組救援碼');
ok(JSON.stringify(DB.Events).indexOf(rec1.recov)<0,'也沒有第二組救援碼');
ok(JSON.stringify(DB.Events).indexOf('zzzz')<0&&JSON.stringify(DB.Events).indexOf('yyyy')<0,'也沒有救援碼換出來的新密碼');

console.log('\n── 補發救援碼：這個功能上線之前註冊的帳號也拿得到 ──');
const old=actRegister({account:'stu_old',password:'aaaa',name:'舊帳號',role:'student',code:kl.joinCode}).user;
delete old.recovSalt; delete old.recovHash;
ok(!old.recovHash,'模擬一個更早註冊、沒有救援碼的帳號');
ok(actLogin('stu_old','aaaa').user,'密碼還能登入');
ok(actRecoverPw('stu_old','KKKK-KKKK-KKKK','wwww').err==='這個帳號沒有救援碼——它是比這個功能更早註冊的帳號，救不回來。','沒有碼的帳號講清楚救不回來');
const gr=actGenRecov(old.userId);
ok(!!gr.recov,'本人登入之後補得到一組');
ok(actRecoverPw('stu_old',gr.recov,'wwww').user,'補發的那一組真的能用來換密碼');
const grev=DB.Events.filter(e=>e.kind==='genrecov');
ok(grev.length===1&&JSON.stringify(grev).indexOf(gr.recov)<0,'補發這件事記了一筆，但碼本身沒有進事件流');

console.log('\n── 老師幫現場認出來的學生補發救援碼 ──');
const stuck=actRegister({account:'stu_stuck',password:'aaaa',name:'卡住的人',role:'student',code:kl.joinCode}).user;
delete stuck.recovSalt; delete stuck.recovHash;
ok(!stuck.recovHash,'模擬一個卡住、沒有救援碼、也登不進去的帳號');
ok(actTeacherRecov(A.userId,'stu_stuck').err==='只有老師看得到這個功能。','學生用不了這個功能');
const tr1=actTeacherRecov(t.userId,'stu_stuck');
ok(!!tr1.recov,'老師對自己班上的學生發得出救援碼');
ok(actRecoverPw('stu_stuck',tr1.recov,'qqqq').user,'學生拿到碼之後自己換得掉密碼');
ok(actLogin('stu_stuck','qqqq').user,'新密碼進得去');

/* 跨班：另一位老師、另一個班，發不到這個帳號的碼。 */
const t2=actRegister({account:'tea_y',password:'aaaa',name:'另一位老師',role:'teacher'}).user;
actNewClass('別的班',t2.userId);
ok(actTeacherRecov(t2.userId,'stu_stuck').err==='這個帳號不在你的班上。','別班的老師發不到這個帳號的碼');

const trev=DB.Events.filter(e=>e.kind==='teacherrecov');
ok(trev.length===1&&trev[0].by===t.userId,'記著是哪一位老師發的');
ok(JSON.stringify(DB.Events).indexOf(tr1.recov)<0,'老師發的那組碼也沒有進事件流');
ok(JSON.stringify(DB.Events).indexOf('qqqq')<0,'學生自己換的新密碼也沒有進事件流');

console.log('\n── 接回重複註冊的帳號 ──');
/* 小美忘記密碼、重新註冊變成小美2，兩個帳號同一個人。 */
const dupOld=actRegister({account:'stu_dup1',password:'aaaa',name:'重複的人',role:'student',code:kl.joinCode}).user;
const dupOldTeamId=actNewTeam('舊隊',dupOld.userId).team.teamId;
const dupNew=actRegister({account:'stu_dup2',password:'bbbb',name:'重複的人',role:'student',code:kl.joinCode}).user;
const dupNewTeamId=actNewTeam('新隊（打錯密碼建的）',dupNew.userId).team.teamId;
ok(dupNewTeamId!==dupOldTeamId,'兩個帳號現在坐著兩支不同的隊');

ok(actMergeAccount(A.userId,'stu_dup1','stu_dup2').err==='只有老師看得到這個功能。','學生用不了這個功能');
ok(actMergeAccount(t2.userId,'stu_dup1','stu_dup2').err==='這兩個帳號要都在你的班上。','別班的老師接不動');
const mg=actMergeAccount(t.userId,'stu_dup1','stu_dup2');
ok(!!mg.newUser,'接回成功');
ok(userOf(dupNew.userId).teamId===dupOldTeamId,'新帳號現在坐著舊帳號那一組');
ok(!!find('Teams',x=>x.teamId===dupNewTeamId)._removed,'新帳號原本那一支空隊被收掉了');
ok(userOf(dupOld.userId).mergedInto===dupNew.userId,'舊帳號標記成合併過了');
ok(actLogin('stu_dup1','aaaa').err==='這個帳號已經合併到「stu_dup2」了，用那一個登入。','舊帳號登入被指去新帳號');
ok(actLogin('stu_dup2','bbbb').user,'新帳號還是用原本的密碼登入');
ok(actMergeAccount(t.userId,'stu_dup1','stu_dup2').err==='這個舊帳號已經合併過了。','合併過的帳號不能再合併一次');

const mgev=DB.Events.filter(e=>e.kind==='mergeaccount');
ok(mgev.length===1&&mgev[0].by===t.userId&&mgev[0].from==='stu_dup1'&&mgev[0].to==='stu_dup2','記著誰接回誰、哪一位老師做的');

console.log('\n── 死帳號不能再當接回／補發的目標 ──');
/* 合併過的帳號（stu_dup1）在畫面的選人清單裡要消失——不然老師會選到
   一個誰都登不進去的帳號。資料層也要擋，不只靠畫面濾掉。 */
ok(!where('Users',x=>x.classId===kl.classId&&!x.mergedInto).some(x=>x.account==='stu_dup1'),
  '選人清單（濾掉 mergedInto）看不到已經合併過的舊帳號');
ok(actTeacherRecov(t.userId,'stu_dup1').err==='這個帳號已經合併過了，救援碼要發給接回去的那個帳號。',
  '不能幫死帳號補救援碼');
const dup3=actRegister({account:'stu_dup3',password:'cccc',name:'第三個',role:'student',code:kl.joinCode}).user;
actNewTeam('第三隊',dup3.userId);
ok(actMergeAccount(t.userId,'stu_dup3','stu_dup1').err==='這個新帳號已經合併過了，選現在真的在用的那一個。',
  '不能把隊伍接到一個已經是死帳號的目標上');

console.log('');
console.log('── 不分組那一站：改名字畫面上要看得到 ──');
/* B 站的隊名是註冊那一刻用他的名字建的，而頂條跟側欄印的是隊名。
   2026-09-09 踩過：改完名字，他看得到的每一個地方還是舊的那一個。 */
(function () {
  const 存 = RULES.SOLO, 存DB = DB;
  RULES.SOLO = 1; DB = blank();
  const t2 = actRegister({account:'tea_b',password:'aaaa',name:'林老師',role:'teacher'}).user;
  const k2 = actNewClass('班', t2.userId).klass;
  const S1 = actRegister({account:'stu_b1',password:'aaaa',name:'小美',role:'student',code:k2.joinCode}).user;
  S.who = S1.userId; S.role = 'student'; DB.Session = {userId:S1.userId, at:Date.now()};
  ok(myTeam().name === '小美', '註冊完隊名就是他的名字');
  actSetName(S1.userId, '王小美');
  ok(myTeam().name === '王小美', '改名字之後隊名跟著改');
  ok(topBar().indexOf('王小美') >= 0, '頂條印得出新名字');
  ok(sideBar().indexOf('王小美') >= 0, '側欄印得出新名字');
  /* 隊名被人動過就不要蓋掉 */
  myTeam().name = '我自己取的';
  actSetName(S1.userId, '陳小美');
  ok(myTeam().name === '我自己取的', '隊名跟人名不一樣的時候不覆蓋');
  RULES.SOLO = 存; DB = 存DB;
  S.who = A.userId; S.role = 'student'; DB.Session = {userId:A.userId, at:Date.now()};
})();

console.log('\n── 改不動別人 ──');
const Breg=actRegister({account:'stu_b',password:'cccc',name:'阿哲',role:'student',code:kl.joinCode});
const B=Breg.user;
ok(actSetPw(B.userId,'aaaa','zzzz').err==='現在的密碼不對。','拿別人的密碼換不掉阿哲的');
ok(actLogin('stu_b','cccc').user,'阿哲的密碼沒被動到');
ok(actRecoverPw('stu_b',rec1.recov,'zzzz').err==='救援碼不對。','拿小美的救援碼換不掉阿哲的密碼');
ok(actLogin('stu_b','cccc').user,'阿哲的密碼還是沒被動到');
ok(actRecoverPw('stu_b',Breg.recov,'dddd').user,'阿哲用自己的救援碼換得掉自己的');

console.log('\n── 兩頁畫得出來 ──');
S.who=A.userId;S.role='student';DB.Session={userId:A.userId,at:Date.now()};
['me','pw'].forEach(p=>{S.page=p;S.p={};DRAFT={};
  const h=PAGES[p]();
  ok(h.length>100,p+' 畫得出來（'+h.length+' 字元）');
  ok(h.indexOf('undefined')<0,p+' 裡面沒有 undefined');
});
ok(PAGES.me().indexOf('stu_a')>=0,'你的資料印得出帳號');
ok(PAGES.me().indexOf('王小美')>=0,'你的資料印得出現在的名字');
ok(PAGES.pw().indexOf('bbbb')<0,'換密碼那一頁沒有印出密碼');

console.log('\n'+(錯.length?'✗ '+錯.length+' 條沒過':'✓ 全過'));
process.exit(錯.length?1:0);
