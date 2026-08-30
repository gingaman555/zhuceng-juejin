/* 舊機制殘留檢查。
 *
 * 為什麼要這一支：今天一整天都在同一個坑裡。機制拿掉了，但字還留著——
 * 「送交關卡審核」的按鈕還在、「還不能放他們過關」還在擋、「正在爭奪」
 * 還在把礦石講成用搶的。每一次都是使用者先看到，我才回頭找。
 *
 * 靠人一頁一頁讀不會有終點：同一個畫面在不同狀態下講的話不一樣，
 * 要走到「全部任務都過完」那個分支，得先把三項任務都判過。
 *
 * 所以改成掃字面。今天找到的每一處，全部都是某個字串常數裡的詞——
 * 掃字串就攔得住，而且是在 build 的時候，不是在使用者眼前。
 *
 * 三道檢查：
 *   一、禁用詞　　拿掉的機制不可以出現在「畫得出來的字」裡。
 *                 只掃字串常數與模板文字，不掃註解——註解本來就要
 *                 解釋「這裡為什麼是空的」。
 *   二、標籤平衡　每個 sc-if／sc-for 區塊裡的 div 要自己平衡。不平衡的話，
 *                 條件為假整段被拿掉時會留下孤兒收尾，瀏覽器就會提早關掉
 *                 外層——老師端整個版面掉出主欄那次就是這樣來的。
 *   三、算了畫不出來　Live 指派了 v.X，但模板沒有插槽、Live 自己也沒讀回去。
 *                 這種東西每次 render 都在算，而且看起來還活著，改的人會
 *                 以為自己改到了畫面。
 *
 * 用法：node check-stale.js　（build 之後跑，CI 也跑）
 */
const fs = require('fs');
const path = require('path');

const R = __dirname;
const live = fs.readFileSync(path.join(R, 'gas', 'Live.html'), 'utf8');
const tpl = fs.readFileSync(path.join(R, 'build_tpl_live.txt'), 'utf8');

let bad = 0;
const fail = (msg) => { bad++; console.log('  ✗ ' + msg); };

/* ---------------------------------------------------------------- *
 * 一、禁用詞
 * ---------------------------------------------------------------- */

/* 左邊是不該再出現的字，右邊是為什麼。
   會誤判的話請改字，不要放寬——放寬一次就等於這一支不再擋任何東西。 */
const BANNED = [
  ['送關卡', '學生不送申請了，放行完全在老師那邊'],
  ['送交關卡', '同上'],
  ['送審三格', '那一頁（SUB）已經不在模板裡'],
  ['正在爭奪', '礦石不是用搶的，同一項任務每一組都做得到'],
  ['沒有人採到', '同上——首頁改成講你自己還差哪幾塊'],
  ['初採', '排行榜那一格拿掉了'],
  ['就追得上', '分數階級用守關生物命名那一套拿掉了'],
  ['物證', '現在叫礦石'],
  ['規畫環節', '現在叫礦脈'],
  ['環節 · ', '同上'],
  ['寶物', '現在叫戰利品'],
  ['甘特', '那一頁整支拿掉了，排程也不在任務頁上'],
  ['宣告', '宣告破法整套拿掉了'],
  ['破法', '同上'],
  ['試挖', '整套拿掉了'],
  ['工具校準', '整套拿掉了'],
  ['空冠', '第五層沒了，空冠沒有地方鑲'],
  ['第五層', '只有四層'],
  ['五個週期', '四個階段'],
  ['還不能放他們過關', '礦石從門檻變回紀錄，沒有條件擋得住放行'],
  ['需重新規劃', '學生沒有送出申請，沒有東西可以被退回'],
  ['這一項通過會採到', '礦石當獎勵是上一代的說法'],
  ['你排的時間', '排程從任務頁拿掉了'],
  ['估時間', '這一趟沒有人估過時間'],
  ['才採得齊', '礦石不是門檻——「採不採齊都不影響」那句要留著，把它當條件的不留'],
  ['記得補齊', '同上——開幾項是老師自己決定的，系統不催'],
  ['走得掉這一層', '同上'],
  ['切到學生端', '那是原型自己試用時的話，真的老師沒有學生端可以切'],
  ['你交出了一塊礦石', '交東西的是學生，老師是判過'],
  ['你交出了道具', '同上']
];

/* 註解拿掉，只留字串常數會出現的地方 */
function stripComments(src) {
  let out = '', i = 0, n = src.length;
  let inStr = 0, esc = false;   /* 0=不在字串 1=' 2=" */
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (inStr) {
      out += c;
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if ((inStr === 1 && c === "'") || (inStr === 2 && c === '"')) inStr = 0;
      i++;
      continue;
    }
    if (c === "'" || c === '"') { inStr = c === "'" ? 1 : 2; out += c; i++; continue; }
    /* 註解就地塗白，換行留著——不然行號會跟原始檔對不上，
       標記（舊詞OK）就找錯行。 */
    if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end < 0 ? n : end + 2;
      for (let j = i; j < stop; j++) out += src[j] === '\n' ? '\n' : ' ';
      i = stop;
      continue;
    }
    if (c === '/' && d === '/') {
      const end = src.indexOf('\n', i);
      const stop = end < 0 ? n : end;
      for (let j = i; j < stop; j++) out += ' ';
      i = stop;
      continue;
    }
    out += c; i++;
  }
  return out;
}

/* 模板的註解也拿掉 */
const tplText = tpl.replace(/<!--[\s\S]*?-->/g, ' ');
const liveCode = stripComments(live);

/* 有些地方非留不可：把原型寫死的舊字換掉，比對的那一半就一定要是舊字；
   R-09 是「系統被改過幾次、為什麼改」的研究紀錄，它本來就在講拿掉了什麼。
   那幾行在原始碼裡標一個 舊詞OK，這一支就跳過。標之前先確定它真的
   畫不到使用者面前——標錯的話這一支就白寫了。 */
const MARK = '舊詞OK';
const liveLines = liveCode.split('\n');
const rawLines = live.split('\n');
const tplLines = tplText.split('\n');

console.log('一 · 禁用詞');
BANNED.forEach(function (pair) {
  const word = pair[0], why = pair[1];
  const hits = [];
  liveLines.forEach(function (ln, i) {
    if (ln.indexOf(word) < 0) return;
    if ((rawLines[i] || '').indexOf(MARK) >= 0) return;   /* 標過了 */
    hits.push('Live.html:' + (i + 1) + '  ' + ln.trim().slice(0, 90));
  });
  tplLines.forEach(function (ln, i) {
    if (ln.indexOf(word) < 0) return;
    hits.push('模板:' + (i + 1) + '  ' + ln.trim().slice(0, 90));
  });
  if (!hits.length) return;
  fail('「' + word + '」還在 ×' + hits.length + '——' + why);
  hits.forEach(function (h) { console.log('      ' + h); });
});
if (!bad) console.log('  ✓ 沒有殘留');

/* ---------------------------------------------------------------- *
 * 二、標籤平衡
 * ---------------------------------------------------------------- */
console.log('');
console.log('二 · 標籤平衡');
(function () {
  const divs = [];
  const re = /<(\/?)div\b[^>]*?(\/?)>/gi;
  let m;
  while ((m = re.exec(tpl))) divs.push({ at: m.index, d: m[1] ? -1 : 1 });
  const net = divs.reduce(function (a, x) { return a + x.d; }, 0);
  if (net !== 0) fail('整份模板的 div 淨值是 ' + net + '，應該是 0');

  const bal = function (a, b) {
    let s = 0;
    for (const x of divs) if (x.at >= a && x.at < b) s += x.d;
    return s;
  };
  const cre = /<(\/?)(sc-if|sc-for)\b[^>]*>/gi;
  const st = [];
  let bad2 = 0;
  while ((m = cre.exec(tpl))) {
    if (!m[1]) { st.push({ at: m.index, tag: m[2] }); continue; }
    const o = st.pop();
    if (!o) continue;
    const s2 = bal(o.at, m.index);
    if (s2 !== 0) {
      bad2++;
      fail('<' + o.tag + '> 區塊裡的 div 差 ' + s2 + '：' +
        tpl.slice(o.at, o.at + 60).replace(/\n/g, ' '));
    }
  }
  if (net === 0 && !bad2) console.log('  ✓ 平衡');
})();

/* ---------------------------------------------------------------- *
 * 三、算了但畫不出來
 * ---------------------------------------------------------------- */
console.log('');
console.log('三 · 算了但畫不出來的 v.＊');

/* 這幾個是故意留著的：模板沒有插槽，但它們被別的地方讀進去，
   或者是給原型的欄位補空值用的（不補會印出 undefined）。 */
const OK_DEAD = new Set([
  'scGantt', 'scSUB', 'scS04', 'protoChrome', 'exitDemo', 'resLockedNav',
  'needPlan', 'planPicks', 'planLabel', 'planNote', 'planBox', 'planAccent', 'goGantt',
  'hasClaims', 'claimRows', 'claimHead', 'claimNote',
  'hasVow', 'vowPicks', 'vowBox', 'vowTitle', 'vowNote', 'vowMob', 'vowMobNote',
  'vowMobTrait', 'vowMobArt', 'ruleSteps', 'uploading', 'specRec',
  'mapTabDigStyle', 'mapTabHaul', 'mapTabHaulStyle', 'hasHaulMap', 'haulMapBands',
  'recCount', 'recNote', 'rateRows', 'hasRecord', 'hasRec', 'hasHaul',
  'hasTfinAnswers', 'tfinOpened', 'ganttNever', 'klassOptions', 'semesterWeeks',
  'setSemesterWeeks', 'weeksLeft', 'termPct', 'nextActionColor', 'reqLeft',
  'layerLeftNote', 'queueGroupCount', 'queueTotal', 'revLeftNote', 'tickWeek'
]);

(function () {
  const assigned = [...new Set([...live.matchAll(/\bv\.([A-Za-z_]\w*)\s*=/g)].map(function (m) { return m[1]; }))];
  const dead = assigned.filter(function (k) {
    if (OK_DEAD.has(k)) return false;
    if (tpl.indexOf('{{ ' + k + ' }}') >= 0) return false;
    if (tpl.indexOf('{{ ' + k + '.') >= 0) return false;
    return (live.split('v.' + k).length - 1) <= 1;
  });
  if (!dead.length) { console.log('  ✓ 沒有'); return; }
  dead.forEach(function (k) {
    fail('v.' + k + ' 算了但模板沒有插槽，Live 也沒讀回去');
  });
  console.log('      （確定要留的話，加進 check-stale.js 的 OK_DEAD 並寫清楚為什麼）');
})();

/* ---------------------------------------------------------------- */
console.log('');
console.log('── ' + (bad ? bad + ' 項要處理' : '全部通過') + ' ──');
console.log('');
process.exit(bad ? 1 : 0);
