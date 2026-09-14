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
const A=actRegister({account:'stu_a',password:'aaaa',name:'小美',role:'student',code:kl.joinCode}).user;

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
ok(actLogin('stu_a','aaaa').err==='密碼不對。','舊密碼失效了');
ok(actLogin('stu_a','bbbb').user,'新密碼進得去');

console.log('\n── 密碼不可以外洩到事件流 ──');
const pev=DB.Events.filter(e=>e.kind==='setpw');
ok(pev.length===1,'只記了一筆');
ok(JSON.stringify(pev[0]).indexOf('bbbb')<0&&JSON.stringify(pev[0]).indexOf('aaaa')<0,'那一筆裡面沒有任何密碼');
ok(JSON.stringify(DB.Events).indexOf('bbbb')<0,'整份事件流裡都沒有新密碼');

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
const B=actRegister({account:'stu_b',password:'cccc',name:'阿哲',role:'student',code:kl.joinCode}).user;
ok(actSetPw(B.userId,'aaaa','zzzz').err==='現在的密碼不對。','拿別人的密碼換不掉阿哲的');
ok(actLogin('stu_b','cccc').user,'阿哲的密碼沒被動到');

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
