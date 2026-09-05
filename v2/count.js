/* 這個系統裡有多少東西（完整版）。跑：node scratchpad/count2.js（cwd 在 v2） */
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
