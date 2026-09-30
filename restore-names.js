/* 找回被弄丟的專案名稱。

   用法：
     node restore-names.js            只列清單，不寫任何東西
     node restore-names.js --apply    寫回雲端

   背景（2026-09-30）：改專案名稱 215 次，有 204 次「原本」是空的——學生存了名字
   之後，那一筆組別資料被別的機器整筆蓋回去（見 v2/src/41-sync.js 檔頭），
   名字不見了。42 組裡 26 組沒有名稱。事件紀錄（Events）只上不下，還留著
   每一次取的名字，所以找得回來。

   規則（很窄）：
     · 只補「現在是空的」的組，現在有名字的一律不碰
     · 名字用「這一組的隊員最後一次取的」
     · 寫之前再讀一次那一組：如果這中間已經有人取了名字，就略過
     · 加 projectRestoredFrom（事件編號）標記，分析時分得出這是還原的
     · 寫入帶 v: 2（見 firestore.rules），寫之前先把原樣備份到 backups/

   跑完之後 node audit.js 應該不再出現「專案名稱掉了」。 */
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

(async () => {
  const teamDocs = await all('Teams'), users = (await all('Users')).map(parse), events = (await all('Events')).map(parse);
  const ub = {}; users.forEach(u => { ub[u.userId] = u; });
  const last = {};
  events.filter(e => e.kind === 'rename' && e.name).sort((a, b) => a.at - b.at).forEach(e => {
    const u = ub[e.by]; if (u && u.teamId) last[u.teamId] = e;
  });
  const plan = teamDocs.map(d => ({ d, t: parse(d) }))
    .filter(x => x.t.classId === CLASS && !x.t.project && last[x.t.teamId]);
  console.log('現在沒有專案名稱、隊員取過名字的組：' + plan.length + ' 個');
  plan.forEach(x => console.log('  ' + x.t.name.padEnd(8) + ' → 「' + last[x.t.teamId].name + '」（' + new Date(last[x.t.teamId].at + 8 * 3600e3).toISOString().slice(5, 16).replace('T', ' ') + '）'));
  if (!APPLY) return console.log('\n（只列清單，沒有寫入。加 --apply 才寫。）');

  const bk = path.join(__dirname, 'backups', 'restore-names_' + Date.now() + '.json');
  fs.mkdirSync(path.dirname(bk), { recursive: true });
  fs.writeFileSync(bk, JSON.stringify(plan.map(x => x.d)));
  console.log('\n已備份原樣：' + bk);
  let ok = 0, skip = 0;
  for (const x of plan) {
    const cur = parse(await get(ROOT + '/Teams/' + x.t.teamId));
    if (cur.project) { console.log('  略過 ' + cur.name + '（剛剛已經有人取了名字）'); skip++; continue; }
    cur.project = last[x.t.teamId].name;
    cur.projectRestoredFrom = last[x.t.teamId].evId;
    const code = await patch('Teams/' + x.t.teamId, { fields: { j: { stringValue: JSON.stringify(cur) }, v: { integerValue: '2' } } });
    console.log('  ' + (code === 200 ? '✓' : '✗') + ' ' + cur.name + ' → 「' + cur.project + '」 HTTP ' + code);
    if (code === 200) ok++;
  }
  console.log('\n完成：' + ok + ' 個寫回，' + skip + ' 個略過。');
})().catch(e => { console.error('失敗：' + e.message); process.exit(2); });
