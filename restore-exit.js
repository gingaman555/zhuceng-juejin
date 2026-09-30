/* 把「已完成專案」的組還原成還在做專案。

   用法：
     node restore-exit.js            只列清單，不寫任何東西
     node restore-exit.js --apply    寫回雲端

   背景（2026-09-30）：老師 08:20–08:22 開了幾組的出口門，09:11 關掉其中一部分，
   第十六組、第五組、第四組沒關到。13:15 第五組、13:20 第十六組的隊員自己點了
   廊道上的出口，這兩組就變成「已完成專案」（Teams.leftAt）。老師還沒說可以結案。

   「已完成」在資料裡只有組別自己那一筆的四個欄位，沒有連動到水晶、任務、
   紀錄，所以還原也只動這四個：

     leftAt   走出去的時間  → 0
     exitWord 老師留的一句話 → ''
     exitOk   老師開門的時間 → 0（門收回去，不然他們一按又出去了）
     exitAsk  說過要走      → 0

   規則（很窄）：
     · 只碰這個班（C122jv2i）的組
     · 只碰「已經走出去」或「門還開著」的組，其餘一個字都不動
     · 寫之前再讀一次那一組：如果這中間狀態已經變了（老師自己處理掉了），就略過
     · 原本的值記在 exitRestored 底下（誰、什麼時候、原來是什麼），分析時分得出這是還原的
     · 寫入帶 v: 2（見 firestore.rules），寫之前先把原樣備份到 backups/
     · 事件紀錄（Events）不動——那是流水帳，「他們走出去過」那一筆留著

   老師之後真的要結案，照平常用老師端「結案」那一頁開門、確認就行。 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const APPLY = process.argv.includes('--apply');
const CLASS = 'C122jv2i';
const ROOT = 'https://firestore.googleapis.com/v1/projects/boss-fight-816f3/databases/(default)/documents/world/v1';

const get = u => new Promise((res, rej) => https.get(u, r => {
  let s = ''; r.on('data', d => s += d);
  r.on('end', () => { try { res(JSON.parse(s)); } catch (e) { rej(new Error('回傳不是 JSON')); } });
}).on('error', rej));
const patch = (p, body) => new Promise((res, rej) => {
  const u = new URL(ROOT + '/' + p + '?updateMask.fieldPaths=j&updateMask.fieldPaths=v');
  const rq = https.request({ host: u.host, path: u.pathname + u.search, method: 'PATCH', headers: { 'Content-Type': 'application/json' } },
    r => { let s = ''; r.on('data', d => s += d); r.on('end', () => res(r.statusCode)); });
  rq.on('error', rej); rq.write(JSON.stringify(body)); rq.end();
});
async function all(col) {
  let out = [], tok = '';
  for (;;) {
    const j = await get(ROOT + '/' + col + '?pageSize=300' + tok);
    if (j.error) throw new Error(col + '：' + (j.error.message || ''));
    out = out.concat(j.documents || []);
    if (!j.nextPageToken) return out;
    tok = '&pageToken=' + encodeURIComponent(j.nextPageToken);
  }
}
const parse = d => JSON.parse(d.fields.j.stringValue);
const fmt = t => t ? new Date(t + 8 * 3600e3).toISOString().slice(5, 16).replace('T', ' ') : '-';
const needs = t => t.classId === CLASS && (t.leftAt || t.exitOk);

(async () => {
  const teamDocs = await all('Teams'), users = (await all('Users')).map(parse);
  const plan = teamDocs.map(d => ({ d, t: parse(d) })).filter(x => needs(x.t));
  console.log('已走出去、或門還開著的組：' + plan.length + ' 個');
  plan.forEach(x => {
    const mem = users.filter(u => u.teamId === x.t.teamId).map(u => u.name).join('、');
    console.log('  ' + x.t.name.padEnd(8) + (x.t.leftAt ? '已完成 ' + fmt(x.t.leftAt) : '門開著 ' + fmt(x.t.exitOk)) + '　→ 還在做專案　（' + mem + '）');
  });
  if (!APPLY) return console.log('\n（只列清單，沒有寫入。加 --apply 才寫。）');

  const bk = path.join(__dirname, 'backups', 'restore-exit_' + Date.now() + '.json');
  fs.mkdirSync(path.dirname(bk), { recursive: true });
  fs.writeFileSync(bk, JSON.stringify(plan.map(x => x.d)));
  console.log('\n已備份原樣：' + bk);
  let ok = 0, skip = 0;
  for (const x of plan) {
    const cur = parse(await get(ROOT + '/Teams/' + x.t.teamId));
    if (!needs(cur)) { console.log('  略過 ' + cur.name + '（剛剛狀態已經變了）'); skip++; continue; }
    cur.exitRestored = { at: Date.now(), was: { leftAt: cur.leftAt || 0, exitOk: cur.exitOk || 0, exitAsk: cur.exitAsk || 0, exitWord: cur.exitWord || '' } };
    cur.leftAt = 0; cur.exitWord = ''; cur.exitOk = 0; cur.exitAsk = 0;
    const code = await patch('Teams/' + x.t.teamId, { fields: { j: { stringValue: JSON.stringify(cur) }, v: { integerValue: '2' } } });
    console.log('  ' + (code === 200 ? '✓' : '✗') + ' ' + cur.name + ' HTTP ' + code);
    if (code === 200) ok++;
  }
  console.log('\n完成：' + ok + ' 個還原，' + skip + ' 個略過。');
  process.exit(ok + skip === plan.length ? 0 : 1);
})().catch(e => { console.error('失敗：' + e.message); process.exit(2); });
