/* 備份 ＋ 稽核。只讀，不寫任何東西到雲端。

   用法：
     node audit.js                      主站（boss-fight-816f3，資料在 world/v1）
     node audit.js boss-fight-b v2      B 站

   它做兩件事：

   一 · 備份：把每一張表整份存到 backups/<時間>/。學生姓名與密碼雜湊
       都在裡面，所以 backups/ 已經放進 .gitignore，不會被 push 到
       公開的 GitHub。備份是「事後救得回來」的底：9/23 那三十次交出去
       之所以救得回來，只因為事件紀錄（Events）碰巧留著；連結與省思
       文字就沒有，因為沒有備份。

   二 · 稽核：拿事件紀錄去對雲端的任務，找「事件說有、雲端沒有」的：
       · 交出去過（有 submit 事件），雲端卻不是已交出
       · 進行中卻有交出時間（被蓋掉一半的混合狀態）
       · 老師收下過（approve 事件），雲端卻不是 done
       另外印幾個要人看的數字：等著結案的組、沒有成員的組、班名、
       還留在雲端的測試資料。

   離開碼 0＝沒有掉東西；1＝有（清單會印出來）。

   建議：每次上課前、下課後各跑一次，中間有人回報「交了但老師看不到」也跑。 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const proj = process.argv[2] || 'boss-fight-816f3';
const root = process.argv[3] || 'v1';
const BASE = 'https://firestore.googleapis.com/v1/projects/' + proj + '/databases/(default)/documents/world/' + root;
const COLS = ['Users', 'Classes', 'Teams', 'Milestones', 'Runs', 'Pushes', 'Keeps', 'Events'];

const get = u => new Promise((res, rej) => https.get(u, r => {
  let s = ''; r.on('data', d => s += d);
  r.on('end', () => { try { res(JSON.parse(s)); } catch (e) { rej(new Error('回傳不是 JSON：' + s.slice(0, 120))); } });
}).on('error', rej));

async function all(col) {
  let out = [], tok = '';
  for (;;) {
    const j = await get(BASE + '/' + col + '?pageSize=300' + tok);
    if (j.error) throw new Error(col + '：' + (j.error.message || JSON.stringify(j.error)));
    out = out.concat(j.documents || []);
    if (!j.nextPageToken) return out;
    tok = '&pageToken=' + encodeURIComponent(j.nextPageToken);
  }
}
const parse = d => { try { return JSON.parse(d.fields.j.stringValue); } catch (e) { return null; } };

(async () => {
  const stamp = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const dir = path.join(__dirname, 'backups', stamp + '_' + proj);
  fs.mkdirSync(dir, { recursive: true });
  const D = {};
  for (const c of COLS) {
    const docs = await all(c);
    fs.writeFileSync(path.join(dir, c + '.json'), JSON.stringify(docs));
    D[c] = docs.map(parse).filter(Boolean);
    console.log('  備份 ' + c.padEnd(11) + D[c].length + ' 筆');
  }
  console.log('\n已存到 ' + dir + '\n');

  const 壞 = [];
  const runs = {}; D.Runs.forEach(r => { runs[r.runId] = r; });
  const 第一次 = {}, 收下 = {};
  D.Events.slice().sort((a, b) => a.at - b.at).forEach(e => {
    if (e.kind === 'submit' && !第一次[e.runId]) 第一次[e.runId] = e;
    if (e.kind === 'approve') 收下[e.runId] = e;
  });
  Object.keys(第一次).forEach(id => {
    const r = runs[id], e = 第一次[id];
    if (!r) return;                                    // 那一趟已經不在了（例如示範資料）
    if (收下[id]) return;                              // 收下的另外看
    if (r.state === 'running' && !r.submittedAt) 壞.push('交出去過卻是進行中　' + id + '（' + r.teamId + '，事件 ' + new Date(e.at + 8 * 3600e3).toISOString().slice(5, 16).replace('T', ' ') + '）');
  });
  D.Runs.forEach(r => {
    if (r.state === 'running' && r.submittedAt) 壞.push('進行中卻有交出時間（混合狀態）　' + r.runId + '（' + r.teamId + '）');
  });
  Object.keys(收下).forEach(id => {
    const r = runs[id];
    if (r && r.state !== 'done') 壞.push('老師收下過卻不是 done　' + id + '（現在 ' + r.state + '）');
  });

  const 班 = D.Classes.filter(c => !/測試|演練/.test(c.name));
  const 隊 = D.Teams.filter(t => 班.some(c => c.classId === t.classId));
  const 學生 = D.Users.filter(u => u.role === 'student' && 班.some(c => c.classId === u.classId));
  const 有人 = {}; 學生.forEach(u => { if (u.teamId) 有人[u.teamId] = (有人[u.teamId] || 0) + 1; });
  const 測試 = D.Users.filter(u => /^drill_|^wed_s|^ra_stu/.test(u.account || '')).length + D.Classes.filter(c => /測試|演練/.test(c.name)).length;

  /* 專案名稱掉了：組現在沒有專案名稱，可是隊員取過（事件紀錄有）。
     2026-09-30 量到：改名 215 次有 204 次「原本」是空的，26 組沒有名稱。
     找回用 node restore-names.js。 */
  const 用戶 = {}; D.Users.forEach(u => { 用戶[u.userId] = u; });
  const 最後名 = {};
  D.Events.slice().sort((a, b) => a.at - b.at).forEach(e => {
    if (e.kind !== 'rename' || !e.name) return;
    const u = 用戶[e.by]; if (u && u.teamId) 最後名[u.teamId] = e.name;
  });
  隊.forEach(t => { if (!t.project && 最後名[t.teamId]) 壞.push('專案名稱掉了　' + t.name + '（隊員取過「' + 最後名[t.teamId] + '」）'); });

  console.log('── 要人看的數字 ──');
  班.forEach(c => console.log('  班名　' + c.name));
  console.log('  組數 ' + 隊.length + '　沒有成員 ' + 隊.filter(t => !有人[t.teamId]).length + '　只有 1 人 ' + 隊.filter(t => 有人[t.teamId] === 1).length);
  console.log('  等老師回覆的結案請求 ' + 隊.filter(t => t.exitAsk && !t.leftAt).length);
  console.log('  已交出（等老師審核）' + D.Runs.filter(r => r.state === 'submitted').length + '　進行中 ' + D.Runs.filter(r => r.state === 'running').length + '　老師收下 ' + D.Runs.filter(r => r.state === 'done').length);
  console.log('  還留在雲端的測試資料 ' + 測試 + ' 筆');
  const 同 = {};
  D.Runs.forEach(r => { if (r.state === 'rethought') return; const k = r.teamId + '|' + r.msId; (同[k] = 同[k] || []).push(r); });
  const 重複 = Object.values(同).filter(x => x.length > 1);
  console.log('  同組同任務有兩筆以上的 Run：' + 重複.length + ' 組' + (重複.length ? '（同組隊友同時按承諾各建一筆；畫面認進度最前面的那筆）' : ''));
  重複.forEach(x => console.log('     ' + x.map(r => r.runId + ':' + r.state).join('  ')));

  console.log('\n── 稽核 ──');
  if (壞.length) {
    壞.forEach(x => console.log('  ✗ ' + x));
    console.log('\n  ' + 壞.length + ' 項對不起來。備份已經存好，可以用事件紀錄還原（找我）。');
    process.exit(1);
  }
  console.log('  ✓ 事件紀錄說有的，雲端都有；沒有混合狀態');
  process.exit(0);
})().catch(e => { console.error('失敗：' + e.message); process.exit(2); });
