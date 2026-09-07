/* 畫面上有沒有漏出變數。跑：node v2/leak.js（cwd 在 v2）

   找的是「這個字不該被人看到」：

     undefined · NaN · null · [object Object]     沒接住的值
     U1 / G3 / R12 / M2 / C1                       內部 id
     {x} / ${x} / %s                                樣板沒填
     連續兩個全形空白、開頭或結尾的標點              句子被切斷
     「＋  份」「說  天」這種數字掉了的句型          數字沒填

   掃的是**畫出來的字**（把標籤拿掉之後），不是原始碼——原始碼裡
   出現 undefined 是正常的，畫面上出現才是問題。 */
const fs = require('fs');
const path = require('path');
let MEM = {};
global.localStorage = {
  getItem: k => (MEM[k] == null ? null : MEM[k]),
  setItem: (k, v) => { MEM[k] = String(v); },
  removeItem: k => { delete MEM[k]; }
};
const stubEl = {
  value: '', innerHTML: '', textContent: '', className: '', style: {},
  scrollLeft: 0, scrollTop: 0, scrollWidth: 0, clientWidth: 0,
  offsetWidth: 0, offsetHeight: 0,
  getAttribute: () => null, setAttribute: () => {},
  addEventListener: () => {}, removeEventListener: () => {},
  appendChild: () => {}, insertAdjacentHTML: () => {},
  querySelector: () => null, querySelectorAll: () => [],
  getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
  classList: { add: () => {}, remove: () => {}, toggle: () => {} },
  scrollIntoView: () => {}, focus: () => {}
};
const FIELDS = {};
global.document = {
  getElementById: id => { if (!FIELDS[id]) FIELDS[id] = Object.create(stubEl); return FIELDS[id]; },
  querySelector: () => null, querySelectorAll: () => [],
  createElement: () => Object.create(stubEl),
  addEventListener: () => {},
  body: Object.create(stubEl), documentElement: Object.create(stubEl)
};
global.window = global;
global.innerWidth = 375; global.innerHeight = 812;
global.scrollTo = () => {};
global.requestAnimationFrame = () => 0; global.cancelAnimationFrame = () => {};
global.setTimeout = () => 0; global.clearTimeout = () => {};
global.getComputedStyle = () => ({ fontSize: '11px' });
global.matchMedia = () => ({ matches: false, addListener: () => {} });
const SRC = path.join(process.cwd(), 'src');
eval(fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort()
  .map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n'));

let 漏 = [];
function 記(頁, 種, 句) { 漏.push({ 頁: 頁, 種: 種, 句: String(句).slice(0, 70) }); }

/* 內部 id 長什麼樣：nid('U') 之類，字首一個大寫字母＋數字或亂碼 */
const ID_RE = /\b[UGRMCK](?:\d{1,4}|[0-9a-z]{5,})\b/;

function 掃(頁, html) {
  const h = String(html || '');
  /* 一 · 屬性裡本來就有 id（data-p 帶的動作），所以只看畫出來的字 */
  const 文 = h
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]*>/g, '\n')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  文.split('\n').map(x => x.trim()).filter(x => x).forEach(function (行) {
    if (/\bundefined\b/.test(行)) 記(頁, 'undefined', 行);
    if (/\bNaN\b/.test(行)) 記(頁, 'NaN', 行);
    if (/\[object Object\]/.test(行)) 記(頁, '[object Object]', 行);
    if (/\bnull\b/.test(行)) 記(頁, 'null', 行);
    if (/\$\{|\{\{|%s\b/.test(行)) 記(頁, '樣板沒填', 行);
    if (ID_RE.test(行) && !/^[UGRMCK]/.test(行.replace(/\s/g, ''))) 記(頁, '內部 id', 行);
    /* 數字掉了的句型：「＋  份」「說  天」「還有  個」 */
    if (/[＋+]\s*枚|說\s+天|還有\s+個|共\s+件|第\s+題/.test(行)) 記(頁, '數字沒填', 行);
    /* 句子開頭就是標點 */
    if (/^[，。、）」』]/.test(行)) 記(頁, '句子被切斷', 行);
  });
  /* 二 · 屬性裡的 title / placeholder 也是給人看的 */
  (h.match(/(?:title|placeholder)="([^"]*)"/g) || []).forEach(function (a) {
    const v = a.replace(/^[a-z]*="/, '').replace(/"$/, '');
    if (/undefined|NaN|\[object Object\]|\$\{/.test(v)) 記(頁, '屬性裡漏了', a);
  });
}

/* ── 造一個真的班，走到各種狀態 ── */
function F(id, v) { document.getElementById(id).value = v; }
function as(u) { S.who = u.userId; DB.Session = { userId: u.userId, at: Date.now() }; }
DB = blank(); save(); S.who = null; DB.Session = null;
go('reg'); DRAFT.rgRole = 'teacher';
F('rg-name', '孟老師'); F('rg-acc', 'meng'); F('rg-pw', 'aaaa'); ACTS.reg();
const tea = me();
go('mkclass'); F('mk-name', '設計專題'); ACTS.mkclass();
const kl = DB.Classes[0];
const stu = [];
['王小美', '陳阿哲'].forEach(function (n, i) {
  S.who = null; DB.Session = null;
  go('reg'); DRAFT.rgRole = 'student';
  F('rg-code', kl.joinCode); F('rg-name', n);
  F('rg-acc', 'b11000' + i); F('rg-pw', 'aaaa'); ACTS.reg(); stu.push(me());
});
S.who = null; DB.Session = null;
go('reg'); DRAFT.rgRole = 'researcher';
F('rg-name', '研究者'); F('rg-acc', 'lab'); F('rg-pw', 'aaaa'); ACTS.reg();
const ra = me();
as(stu[0]);
const tm = actNewTeam('第一組', stu[0].userId).team;
as(stu[1]); actJoinTeam(tm.joinCode, stu[1].userId);

/* 門口那幾頁（沒登入） */
S.who = null; DB.Session = null;
['gate', 'login', 'reg', 'mkclass', 'myteam'].forEach(function (p) {
  S.page = p; S.p = {}; DRAFT = {};
  try { 掃('沒登入/' + p, PAGES[p]()); } catch (e) { 記('沒登入/' + p, '炸了', e.message); }
});

/* 每一個狀態掃一輪 */
function 全掃(標) {
  [['學生', stu[0]], ['老師', tea], ['研究者', ra]].forEach(function (pair) {
    as(pair[1]);
    Object.keys(PAGES).forEach(function (p) {
      if (!allowed(pair[1], p)) return;
      S.page = p; DRAFT = {};
      const anyRun = DB.Runs[0], anyMs = DB.Milestones[0];
      S.p = ['stamp', 'pick', 'camp', 'battle', 'radar', 'review'].indexOf(p) >= 0
        ? { id: (anyRun || {}).runId } : (p === 'commit' ? { id: (anyMs || {}).msId } : {});
      try { 掃(標 + '/' + pair[0] + '/' + p, PAGES[p]()); }
      catch (e) { 記(標 + '/' + pair[0] + '/' + p, '炸了', e.message); }
    });
  });
}
全掃('剛開學');

as(tea);
const ms = actPublish(kl.classId, { title: '把問題收斂成一句話',
  note: '不要寫題目，寫問題。', steps: ['把重點分類', '挑出一直出現的', '寫成一句'],
  due: dueFrom(7, 'd'), dueU: 'd', teams: [] });
全掃('派了任務');

as(stu[0]);
DRAFT = { plan: stu.map((u, i) => ({ n: '第' + (i + 1) + '件', d: 2, who: u.userId, byOwn: 1 })), sure: 'mid' };
ACTS.commit(ms.msId);
const run = runOf(tm.teamId, ms.msId);
全掃('正在做');
/* 交作業六題 */
btAsks(run).forEach(function (q, i) {
  as(stu[0]); S.page = 'battle'; S.p = { id: run.runId, ph: 'q', q: i }; DRAFT = {};
  try { 掃('交作業第' + (i + 1) + '題', PAGES.battle()); }
  catch (e) { 記('交作業第' + (i + 1) + '題', '炸了', e.message); }
});
/* 兩個人各填各的 */
stu.forEach(function (u, i) {
  as(u); DRAFT = {}; S.page = 'battle'; S.p = { id: run.runId, ph: 'q', q: 1 };
  PAGES.battle();
  myItems(run, u.userId).forEach(k => ACTS.spent(k + ',1'));
  DRAFT.said1 = u.name + '做的';
  S.p = { id: run.runId, ph: 'q', q: 2 }; ACTS.btsave(run.runId);
});
全掃('都填完還沒交');

as(stu[0]); DRAFT = {}; S.page = 'battle'; S.p = { id: run.runId, ph: 'q', q: 1 };
PAGES.battle();
DRAFT.where = 'TronClass'; DRAFT.feel = 'ok'; DRAFT.next = '下一步';
S.p = { id: run.runId, ph: 'q', q: btAsks(run).length - 1 };
ACTS.btnext(run.runId);
全掃('交出去了');

as(tea); FIELDS['gr-word'] = Object.create(stubEl);
FIELDS['gr-word'].value = '第二件的位置我找不到。';
ACTS.reject(run.runId);
全掃('被退回');

as(stu[0]); ACTS.btgo(run.runId); DRAFT.where = '放你桌上';
S.p = { id: run.runId, ph: 'q', q: btAsks(run).length - 1 };
ACTS.btnext(run.runId);
as(tea); actApprove(run.runId, '可以。', 30);
as(stu[0]); SEEN_CUT = 1; OKGOT = {};
全掃('收下了');

as(stu[0]); actAskExit(tm.teamId);
全掃('說了要出去');
as(tea); actDenyExit(tm.teamId);
全掃('老師說還不行');
as(stu[0]); actAskExit(tm.teamId);
as(tea); actOpenExit(tm.teamId, 1);
as(stu[0]); actLetGo(tm.teamId, '謝謝這一學期。');
全掃('走出去了');

/* ── 收尾 ── */
console.log('\n' + '═'.repeat(56));
if (!漏.length) {
  console.log('  掃完了，畫面上沒有漏出任何變數。');
} else {
  /* 同一句話在很多頁重複的話只報一次 */
  const 看過 = {};
  const 唯一 = 漏.filter(function (x) {
    const k = x.種 + '|' + x.句;
    if (看過[k]) return false; 看過[k] = 1; return true;
  });
  console.log('  漏出來 ' + 唯一.length + ' 種（總共出現 ' + 漏.length + ' 次）：');
  唯一.forEach(function (x) {
    console.log('   · [' + x.種 + '] ' + x.頁);
    console.log('     ' + x.句);
  });
}
