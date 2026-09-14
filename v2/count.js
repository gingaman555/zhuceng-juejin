/* 這個系統裡有多少東西（完整版）。跑：node count.js（cwd 在 v2） */
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
  scrollIntoView: () => {}
};
global.document = {
  getElementById: () => Object.create(stubEl),
  querySelector: () => null, querySelectorAll: () => [],
  createElement: () => Object.create(stubEl),
  addEventListener: () => {},
  body: Object.create(stubEl), documentElement: Object.create(stubEl)
};
global.window = global;
global.innerWidth = 1440; global.innerHeight = 900;
global.scrollTo = () => {};
global.requestAnimationFrame = () => 0; global.cancelAnimationFrame = () => {};
global.setTimeout = () => 0; global.clearTimeout = () => {};
global.getComputedStyle = () => ({ fontSize: '11px' });
global.matchMedia = () => ({ matches: false, addListener: () => {} });

const SRC = path.join(process.cwd(), 'src');
const jsFiles = fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort();
const cssFiles = fs.readdirSync(SRC).filter(f => f.endsWith('.css')).sort();
eval(jsFiles.map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n'));

const n = o => Object.keys(o || {}).length;
const pad = (s, w) => { let L = 0; for (const c of String(s)) L += c.charCodeAt(0) > 255 ? 2 : 1; return String(s) + ' '.repeat(Math.max(1, w - L)); };
const L = (k, v) => console.log('  ' + pad(k, 26) + v);
const H = t => console.log('\n' + t + '\n' + '─'.repeat(46));

/* ── 一 · 世界 ── */
H('一 · 世界');
L('地層', STRATA.length + ' 層');
dressPatrons();
const pats = allFauna();
const zoneOf = {};
(pats.length ? pats : []).forEach(p => {
  const z = mobZone ? mobZone(p) : null;
  const k = (z && z.name) || '?';
  zoneOf[k] = (zoneOf[k] || 0) + 1;
});
STRATA.forEach(z => {
  console.log('     ' + pad(z.name, 12) + pad((z.d0 != null ? z.d0 + '–' + z.d1 + ' m' : ''), 12) +
    (zoneOf[z.name] ? zoneOf[z.name] + ' 位委託人' : ''));
});
L('委託人', PATRONS.length + ' 位');
L('　每位的台詞', n(PAT_SAY[Object.keys(PAT_SAY)[0]]) + ' 句（初見／再見／等你／又給／收下／退回）');
L('　台詞總數', Object.keys(PAT_SAY).reduce((a, k) => a + n(PAT_SAY[k]), 0) + ' 句');
L('　每位的點陣圖', '小圖 ＋ 大圖 ＝ 2 張，共 ' + (PATRONS.length * 2) + ' 張');
L('學生可挑的角色', n(HEROES) + ' 個');
L('廊道地景素材', n(PLACE_ART) + ' 種');
L('每一層的場景道具', n(ZONE_PROPS) + ' 組');
L('埋在土裡的東西', (BURIED.length || n(BURIED)) + ' 種');
L('圖示', n(ICONS) + ' 個');
L('開場故事', STORY.length + ' 頁');

/* ── 二 · 畫面 ── */
H('二 · 畫面');
const pageNames = Object.keys(PAGES).sort();
L('頁面總數', pageNames.length + ' 頁');
[['student', '學生'], ['teacher', '老師'], ['researcher', '研究者']].forEach(([r, name]) => {
  const u = { role: r, teamId: 't', classId: 'c' };
  const mine = pageNames.filter(p => { try { return allowed(u, p); } catch (e) { return false; } });
  console.log('     ' + pad(name, 8) + pad(mine.length + ' 頁', 8) + mine.join('　'));
});
L('按鈕背後的動作', n(ACTS) + ' 支');
L('原始檔', jsFiles.length + ' 支 JS ＋ ' + cssFiles.length + ' 支 CSS');
let loc = 0;
jsFiles.concat(cssFiles).forEach(f => { loc += fs.readFileSync(path.join(SRC, f), 'utf8').split('\n').length; });
L('行數', loc.toLocaleString() + ' 行（含註解）');
L('出貨的單一檔案', Math.round(fs.statSync('index.html').size / 1024) + ' KB');

/* ── 三 · 一趟委託 ── */
H('三 · 一趟委託');
L('學生要走的關卡', '接委託 3 步 → 做 → 交作業 6 題');
L('　接委託那三步', '聽他講／要做哪幾件／幾天＋有多確定');
L('　交作業那六題', BT_STEPS.map(s => s.ask).join('｜'));
L('　　一定要填的', BT_STEPS.filter(s => s.need).length + ' 題');
L('　　選填的', BT_STEPS.filter(s => !s.need).length + ' 題');
L('一趟的狀態', 'running · submitted · back · done · rethought（5）');
L('判定', n(RULES.STAMPS) + ' 種：' + Object.keys(RULES.STAMPS).map(k => RULES.STAMPS[k].name).join('／'));
L('　準的範圍', '預估的 ' + Math.round(RULES.BAND_RATIO * 100) + '％');
L('把握', RULES.SURE.length + ' 種：' + RULES.SURE.map(s => s.name + '（可改 ' + s.redo + ' 次）').join('　'));
L('順不順', FEELS.length + ' 種：' + FEELS.map(f => f[1]).join('／'));
L('範圍變了沒', '3 種：比說的多／差不多／比說的少');
L('一件最多拆', RULES.STEPS_MAX + ' 件');
L('一件最多', RULES.EST_MAX + ' 天');
L('一圈的段落', BEATS.length + ' 段：' + BEATS.map(b => b.s).join(' → '));

/* ── 四 · 老師那一邊 ── */
H('四 · 老師那一邊');
const tPages = pageNames.filter(p => { try { return allowed({ role: 'teacher', classId: 'c' }, p); } catch (e) { return false; } });
L('老師的頁', tPages.length + ' 頁');
L('老師能做的事', '派任務／看清單／審核（收下・退回）／回一次天數／發加入碼');
L('老師一定要寫字的時候', '退回一定要一句話（擋在資料層）');
L('老師改不動的', '判定那兩個數字（check.js 守著）');
L('研究者能做的事', '只有看與匯出（check.js 守著：沒有任何 actX）');

/* ── 五 · 資料 ── */
H('五 · 資料');
seed();
const cols = Object.keys(DB).filter(k => Array.isArray(DB[k]));
L('資料表', cols.length + ' 張：' + cols.join('　'));
L('跨機器同步', n(SYNC_KEY) + ' 張全上雲（Firestore）');
L('事件種類', n(EV_SAY) + ' 種（研究者匯出的那一份）');
L('示範班', DB.Users.filter(u => u.role === 'teacher').length + ' 位老師　' +
  DB.Users.filter(u => u.role === 'student').length + ' 位學生　' +
  DB.Teams.length + ' 組　' + DB.Milestones.length + ' 件任務');

/* ── 六 · 規矩 ── */
H('六 · 規矩（自動守著的）');
const chk = fs.readFileSync('check.js', 'utf8');
const line = (chk.match(/殘留檢查通過：'[\s\S]{0,400}?都守住了/) || [''])[0]
  .replace(/[\s\S]*通過：'/, '').replace(/'\s*\+\s*/g, '').replace(/\n/g, '');
L('check.js', (chk.match(/\bfail\(/g) || []).length + ' 條檢查');
console.log('     ' + line.replace(/、/g, '　'));
L('loop.js', '資料層不變量（跑 200 天）');
L('pages.js', '每一頁 × 每一個角色都畫得出來、每一顆按鈕都接得上');
L('字級', '只能是 11 的倍數，下限 22px');

/* ---------- --doc：把上面那些數字寫回流程文件的附錄 ----------

   為什麼要有這一段：那份附錄的數字在一天之內就全部過期了
   （頁數、動作數、行數、檔案大小、示範班人數、水晶的範圍）。
   手抄的東西一定會過期，所以改成產生的——文件裡那一段夾在
   兩個記號中間，這裡整段換掉。

   只換記號中間那一塊，前後的正文一個字都不碰。 */
if (process.argv.indexOf('--doc') >= 0) {
  const 日 = new Date().toISOString().slice(0, 10);
  const 層 = STRATA.map(z => z.name).join(' · ');
  const 台詞 = Object.keys(PAT_SAY).reduce((a, k) => a + n(PAT_SAY[k]), 0);
  const 角色 = HERO_LIST.map(x => x.n).join(' · ');
  const 必填 = BT_STEPS.filter(s => s.need).length;
  const 選填 = BT_STEPS.filter(s => !s.need).length;
  const 頁 = Object.keys(PAGES).sort();
  const 幾頁 = r => 頁.filter(p => {
    try { return allowed({ role: r, teamId: 't', classId: 'c' }, p); } catch (e) { return false; }
  }).length;
  let loc2 = 0, cm = 0, inb = false;
  jsFiles.concat(cssFiles).forEach(f2 => {
    fs.readFileSync(path.join(SRC, f2), 'utf8').split('\n').forEach(l => {
      loc2++;
      const t = l.trim();
      if (inb) { cm++; if (t.indexOf('*/') >= 0) inb = false; return; }
      if (t.indexOf('/*') === 0) { cm++; if (t.indexOf('*/') < 0) inb = true; return; }
      if (t.indexOf('//') === 0) cm++;
    });
  });
  const chk2 = fs.readFileSync('check.js', 'utf8');
  seed();
  const 表 = Object.keys(DB).filter(k => Array.isArray(DB[k]));
  const q = '`';

  const md = [
    '### 一 · 世界',
    '',
    '| | 數量 | 備註 |',
    '|---|---|---|',
    '| 地層 | **' + STRATA.length + ' 層** | ' + 層 + ' |',
    '| 委託人 | **' + PATRONS.length + ' 位** | 分佈在六層 |',
    '| 委託人台詞 | **' + 台詞 + ' 句** | 每位 ' +
      n(PAT_SAY[Object.keys(PAT_SAY)[0]]) + ' 句：初見 · 再見 · 等你 · 又給一件 · 收下 · 退回 |',
    '| 委託人點陣圖 | **' + (PATRONS.length * 2) + ' 張** | 每位小圖與大圖各一，各自還有第二幀 |',
    '| 學生可挑的角色 | **' + HERO_LIST.length + ' 個** | ' + 角色 + ' |',
    '| 廊道地景素材 | **' + n(PLACE_ART) + ' 種** | 一層一種 |',
    '| 每一層的場景道具 | **' + n(ZONE_PROPS) + ' 組** | |',
    '| 圖示 | **' + n(ICONS) + ' 個** | |',
    '| 開場故事 | **' + STORY.length + ' 頁** | ' + STORY.map(x => x.title).join(' · ') + ' |',
    '',
    '### 二 · 畫面',
    '',
    '| | 數量 |',
    '|---|---|',
    '| 頁面 | **' + 頁.length + ' 頁** |',
    '| 　學生看得到 | ' + 幾頁('student') + ' 頁 |',
    '| 　老師看得到 | ' + 幾頁('teacher') + ' 頁 |',
    '| 　研究者看得到 | ' + 幾頁('researcher') + ' 頁 |',
    '| 按鈕背後的動作（ACTS） | **' + n(ACTS) + ' 支** |',
    '| 原始檔 | ' + jsFiles.length + ' 支 JS ＋ ' + cssFiles.length + ' 支 CSS |',
    '| 行數 | ' + loc2.toLocaleString() + ' 行，其中 ' + cm.toLocaleString() +
      ' 行是註解（' + Math.round(cm / loc2 * 100) + '%）|',
    '| 出貨 | 單一 HTML，' + Math.round(fs.statSync('index.html').size / 1024) +
      ' KB，無外部相依 |',
    '',
    '三個角色共用的頁（登入、加入班級、個人、換角色）算在各自的數裡，所以三者相加大於總數。',
    '',
    '### 三 · 一趟委託',
    '',
    '| | 數量 | 內容 |',
    '|---|---|---|',
    '| 接委託 | **3 步** | 聽他講／要做哪幾件／幾天＋有多確定 |',
    '| 交作業 | **' + BT_STEPS.length + ' 題** | ' + BT_STEPS.map(s => s.ask).join(' · ') + ' |',
    '| 　一定要填 | ' + 必填 + ' 題 | |',
    '| 　選填 | ' + 選填 + ' 題 | |',
    '| 一趟的狀態 | **5 種** | running · submitted · back · done · rethought |',
    '| 判定 | **' + n(RULES.STAMPS) + ' 種** | ' +
      Object.keys(RULES.STAMPS).map(k => RULES.STAMPS[k].name).join('／') +
      '（誤差 ' + Math.round(RULES.BAND_RATIO * 100) + '% 內算準）|',
    '| 把握 | **' + RULES.SURE.length + ' 種** | ' +
      RULES.SURE.map(x => x.name + '（可改 ' + x.redo + ' 次）').join(' · ') + ' |',
    '| 順不順 | **' + FEELS.length + ' 種** | ' + FEELS.map(f => f[1]).join(' · ') + ' |',
    '| 一件最多拆 | **' + RULES.STEPS_MAX + ' 件** | |',
    '| 一件最多 | **' + RULES.EST_MAX + ' 天** | |',
    '',
    '### 四 · 資料',
    '',
    '| | 數量 |',
    '|---|---|',
    '| 資料表 | **' + 表.length + ' 張**：' + 表.join(' · ') + ' |',
    '| 跨機器同步 | ' + n(SYNC_KEY) + ' 張全上 Firestore，一筆一筆推 |',
    '| 事件種類 | **' + n(EV_SAY) + ' 種** |',
    '| 匯出 | 三份：一趟一列 · 一件一列 · 流水帳 |',
    '| 示範班 | ' + DB.Users.filter(u => u.role === 'teacher').length + ' 位老師 · ' +
      DB.Users.filter(u => u.role === 'student' && u.teamId).length + ' 位學生 · ' +
      DB.Teams.length + ' 組 · ' + DB.Milestones.length + ' 件任務 |',
    '',
    '### 五 · 收集層（可分離）',
    '',
    '| | 數量 |',
    '|---|---|',
    '| 水晶 | 完成一件 ' + RULES.CRYSTAL.base + ' 份 ＋ 老師給 ' +
      RULES.CRYSTAL.bonusMin + '–' + RULES.CRYSTAL.bonusMax + ' 份（一格 ' +
      (RULES.CRYSTAL.bonusStep || 1) + '）|',
    '| 任務之證 | 一件一張，形狀由那一趟的資料決定 |',
    '| 岩心 | 學生自己封存，可命名 |',
    '| 委託人圖鑑 | ' + PATRONS.length + ' 位，**老師收下才解鎖**，沒解鎖的是黑影 |',
    '| 深度 | 公尺數，跟著完成的件數走 |',
    '| 排行榜 | 排偏差率不排產出量，只算最近 ' +
      (typeof RANK_N !== 'undefined' ? RANK_N : 3) + ' 趟，可以自己選擇不上榜 |',
    '',
    '### 六 · 自動守著的規矩',
    '',
    '| 工具 | 守什麼 |',
    '|---|---|',
    '| ' + q + 'check.js' + q + ' | ' + (chk2.match(/\bfail\(/g) || []).length +
      ' 條檢查（禁用詞、判定的純度、研究者只能看、沒有小字…）|',
    '| ' + q + 'loop.js' + q + ' | 資料層不變量，跑 200 天 |',
    '| ' + q + 'pages.js' + q + ' | 每一頁 × 每一個角色都畫得出來、每一顆按鈕後面都有動作 |',
    '| ' + q + 'e2e.js' + q + ' | 從開班走到專案結束，十三段 |',
    '| ' + q + 'multi.js' + q + ' | 六組同時跑一學期，十段 |',
    '| ' + q + 'read.js' + q + ' | 每一頁學生看不看得出來要做什麼 |',
    '| ' + q + 'leak.js' + q + ' | 畫面上有沒有漏出變數 |',
    '| ' + q + 'size.js' + q + ' | 一個班撐得下幾組幾個人 |',
    '| 字級 | 只能是 11 的倍數，下限 22px |',
    '',
    '*（' + 日 + ' 由 ' + q + 'node v2/count.js --doc' + q + ' 產生。）*'
  ].join('\n');

  const dp = path.join('..', '專案地下城-作品呈現與流程.md');
  let ds = fs.readFileSync(dp, 'utf8');
  const A = '<!-- count:start -->', B = '<!-- count:end -->';
  const a = ds.indexOf(A), b = ds.indexOf(B);
  if (a < 0 || b < 0) {
    console.log('\n文件裡找不到 count:start／count:end');
  } else {
    ds = ds.slice(0, a + A.length) + '\n' + md + '\n' + ds.slice(b);
    fs.writeFileSync(dp, ds);
    console.log('\n附錄寫回文件了（' + md.split('\n').length + ' 行）');
  }
}
