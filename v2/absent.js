/* 有人請假的那一天。

   一個班一定會有這一天：組員請假、當掉、退選、或者就是不做。
   而這一套系統的每一步都寫著「各自填自己那一份」——所以要問清楚
   一件事：**哪一步是等得起的，哪一步會把整組卡死。**

   量到的答案（下面每一條都跑過）：

     開始任務　一個人就開得了。他可以先把別人那幾件拆好、掛在名下，
               計時從他按下去那一刻開始，不等任何人
     中間　　　一個人推得動進度
     交出去　　**不擋**。程式裡寫著理由：「擋了的話一個人不在，
               整組就交不出去」（見 67-battle.js）
     說出來　　廊道上跟交件頁上都會說「還有 N 個人沒填自己那一份」，
               而且那一顆鍵在全員填完之前不會變成「交出去給老師」
     資料　　　缺席的那一件不會消失，它留在匯出裡，天數是 0、
               「他寫了什麼」是空的——看得出是誰沒填，不是整趟不見

   跑法：node absent.js
*/
const fs=require('fs');
let MEM={};global.localStorage={getItem:k=>MEM[k]==null?null:MEM[k],setItem:(k,v)=>{MEM[k]=String(v);},removeItem:k=>{delete MEM[k];}};
const st={value:'',innerHTML:'',textContent:'',className:'',style:{},getAttribute:()=>null,setAttribute:()=>{},addEventListener:()=>{},appendChild:()=>{},insertAdjacentHTML:()=>{},querySelector:()=>null,querySelectorAll:()=>[],getBoundingClientRect:()=>({top:0,left:0,right:0,bottom:0,width:0,height:0}),classList:{add:()=>{},remove:()=>{},toggle:()=>{}},scrollIntoView:()=>{}};
global.document={getElementById:()=>Object.create(st),querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>Object.create(st),addEventListener:()=>{},body:Object.create(st),documentElement:Object.create(st),activeElement:null};
global.window=global;global.innerWidth=390;global.scrollTo=()=>{};global.requestAnimationFrame=()=>0;global.setTimeout=()=>0;global.clearTimeout=()=>{};global.getComputedStyle=()=>({fontSize:'11px'});global.matchMedia=()=>({matches:false,addListener:()=>{}});
eval(fs.readdirSync('src').filter(f=>f.endsWith('.js')).sort().map(f=>fs.readFileSync('src/'+f,'utf8')).join('\n'));
let 錯=[];const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ ')+m);if(!c)錯.push(m);};
const as=u=>{S.who=u.userId;S.role=u.role;DB.Session={userId:u.userId,at:Date.now()};};

DB=blank();
const t=actRegister({account:'tea_x',password:'aaaa',name:'林老師',role:'teacher'}).user;
const kl=actNewClass('班',t.userId).klass;
const A=actRegister({account:'stu_a',password:'aaaa',name:'小美',role:'student',code:kl.joinCode}).user;
const B=actRegister({account:'stu_b',password:'aaaa',name:'阿哲',role:'student',code:kl.joinCode}).user;
as(A); const g=actNewTeam('第一組',A.userId).team;
as(B); actJoinTeam(g.joinCode,B.userId);
as(A); actRename(g.teamId,'校內共享單車調度');  /* 廊道在取名之前不給那一顆 */
as(t); const ms=actPublish(kl.classId,{title:'第一個任務',mentorId:t.userId,teams:[g.teamId]});

console.log('\n── 一 · 阿哲沒來。小美一個人開得了任務嗎 ──');
as(A);
const run=actCommit(g.teamId,ms.msId,5,[],[
  {n:'查資料',d:2,who:A.userId,byOwn:1},
  {n:'做出來',d:3,who:B.userId,byOwn:0}
],'',2);
ok(!!run,'小美一個人就承諾了（不用等阿哲）');
ok(run&&run.state==='running','任務當場開始跑：state = '+(run&&run.state));
ok(run&&run.committedAt>0,'計時從這一刻開始，不是從全員填完');
ok((run.plan||[]).length===2,'她可以先把阿哲那一件也拆好、掛在他名下');

console.log('\n── 二 · 中間那幾天 ──');
as(A); actPush(g.teamId,run.runId,-1,0);
ok(find('Runs',x=>x.runId===run.runId).pushes>=1,'小美一個人推得動進度');

console.log('\n── 三 · 只有小美填了自己那一份 ──');
as(A); actMyPart(g.teamId,run.runId,{spent:{0:3},said1:'我查完了'});
const r1=find('Runs',x=>x.runId===run.runId);
ok(Object.keys(r1.said||{}).length===1,'只有一個人留了話');
ok(partsLeft(r1)===1,'系統知道還有 '+partsLeft(r1)+' 個人沒填');
as(A); S.page='home'; S.p={}; DRAFT={};
const 廊道=PAGES.home();
/* 2026-09-23：不管誰填了幾個人，鍵一律是「交出去給老師」——資料層
   從來不擋單一個人交（見 40-db.js 的 spent／said need，只看自己名下
   那幾件）。畫面以前只講「還在等 N 個人」沒給一顆能馬上交的鍵，
   量到的樣子是很多組卡在「進行中」，其實是每個人都以為要等別人。 */
ok(/你那一份填好了/.test(廊道),'小美（填完的）看到「你那一份填好了」');
ok(/不用等他們/.test(廊道),'畫面明講不用等其他人');
ok(/交出去給老師/.test(廊道),'她的鍵就是「交出去給老師」，填完不是死路');
as(B); S.page='home'; S.p={}; DRAFT={};
const 廊道B=PAGES.home();
ok(/你還沒填自己那一份/.test(廊道B),'阿哲（沒填的）看到「你還沒填自己那一份」');
ok(/交出去給老師/.test(廊道B),'他的鍵也是「交出去給老師」');
ok(廊道!==廊道B,'兩個人看到的不是同一頁');
as(A);

console.log('\n── 四 · 阿哲今天不會來了。小美交得出去嗎 ──');
as(A); S.page='battle'; S.p={id:run.runId,ph:'q',q:1}; DRAFT={};
const 交件頁=PAGES.battle();
ok(/還有 1 個人沒填/.test(交件頁),'交件頁上也說了一次');
ok(!/不能交|無法交|請先/.test(交件頁),'但沒有任何一句話說「不能交」');
const 交=actSubmit(g.teamId,run.runId,'雲端硬碟 / 第一組');
ok(!!交,'交得出去（沒有被擋）');
ok(交&&交.state==='submitted','狀態變成 submitted');
ok(交&&!!交.stamp,'判定照樣出得來：'+(交&&交.stamp));

console.log('\n── 五 · 老師看到什麼 ──');
as(t);
const 佇列=radar(kl.classId);
ok(佇列.some(x=>x.run.runId===run.runId),'老師的清單裡有這一件');
S.page='review'; S.p={id:run.runId}; DRAFT={};
const 審=PAGES.review();
ok(/小美/.test(審),'小美的名字在審核頁上');
ok(/阿哲/.test(審),'阿哲的名字也在（他那一件掛在他名下，只是沒有數字）');
ok(/我查完了/.test(審),'小美寫的那一句印出來了');

console.log('\n── 六 · 阿哲那一件在資料裡長什麼樣 ──');
const csv=exportItems(kl.classId).trim().split('\n');
console.log('    '+csv[0]);
csv.slice(1).forEach(l=>console.log('    '+l));
ok(csv.length-1===2,'兩件都有列（缺席的那一件不會消失，只是天數是空的）');

console.log('\n'+(錯.length?'  ✗ '+錯.length+' 條沒過':'  全部通過'));
process.exit(錯.length?1:0);
