/* 把一位學生改掛到另一組，並刪掉他原本那個「沒有紀錄」的空組。

   用法：
     node move-team.js <userId> <原本的組> <要去的組>            只列清單，不寫任何東西
     node move-team.js <userId> <原本的組> <要去的組> --apply    寫回雲端

   背景（2026-10-04）：同一組的學生各自建了組，其中一位按「建立」變成一人一組，
   加不進隊友那一組。學生自己離開再加入（actLeaveTeam）是正路；這支腳本是研究者
   替他做同一件事，條件跟 actLeaveTeam 同樣窄，免得動到有歷史的組：

     · 原本那一組：成員只有他一個、沒有任何 Run／Keep／Push
     · 要去的那一組：存在，而且跟他同一個班
     · 他的帳號只改 teamId 與 seats 裡那個班的 teamId，其餘不碰
     · 事件紀錄（Events）不動；只上不下，原本的 teamId 留在舊事件裡
     · 寫之前先把原樣備份到 backups/，寫前再讀一次，寫入帶 v: 2（見 firestore.rules）
     · 帳號上加 teamMovedFrom，分析時分得出這是研究者改掛的，不是他自己換的

   跑完之後 node audit.js 應該照樣乾淨。主站（boss-fight-816f3，資料在 world/v1）。 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2).filter(a => a[0] !== '-');
const APPLY = process.argv.includes('--apply');
const [UID, FROM, TO] = args;
if (!UID || !FROM || !TO) { console.error('用法：node move-team.js <userId> <原本的組> <要去的組> [--apply]'); process.exit(2); }
const HOST = 'firestore.googleapis.com';
const ROOT = '/v1/projects/boss-fight-816f3/databases/(default)/documents/world/v1';

const call = (method, p, body) => new Promise((res, rej) => {
  const rq = https.request({ host: HOST, path: ROOT + '/' + p, method, headers: { 'Content-Type': 'application/json' } }, r => {
    let s = ''; r.on('data', d => s += d);
    r.on('end', () => { let j = null; try { j = JSON.parse(s); } catch (e) {} res({ code: r.statusCode, json: j }); });
  });
  rq.on('error', rej); if (body) rq.write(JSON.stringify(body)); rq.end();
});
async function all(col) {
  let out = [], tok = '';
  for (;;) {
    const r = await call('GET', col + '?pageSize=300' + tok);
    if (!r.json || r.json.error) throw new Error(col + '：' + ((r.json && r.json.error && r.json.error.message) || r.code));
    out = out.concat(r.json.documents || []);
    if (!r.json.nextPageToken) return out;
    tok = '&pageToken=' + encodeURIComponent(r.json.nextPageToken);
  }
}
const parse = d => JSON.parse(d.fields.j.stringValue);

async function check() {
  const [users, teams, runs, keeps, pushes] = await Promise.all(['Users', 'Teams', 'Runs', 'Keeps', 'Pushes'].map(async c => (await all(c)).map(d => ({ d, o: parse(d) }))));
  const u = users.find(x => x.o.userId === UID);
  const a = teams.find(x => x.o.teamId === FROM), b = teams.find(x => x.o.teamId === TO);
  const why = [];
  if (!u) why.push('找不到這位使用者');
  if (!a) why.push('找不到原本的組');
  if (!b) why.push('找不到要去的組');
  if (u && a && b) {
    if (u.o.role !== 'student') why.push('不是學生');
    if (u.o.teamId !== FROM) why.push('他現在掛的不是原本那一組（' + u.o.teamId + '）');
    if (a.o.classId !== b.o.classId) why.push('兩組不同班');
    if (u.o.classId !== b.o.classId) why.push('他跟要去的組不同班');
    const mem = users.filter(x => x.o.role === 'student' && !x.o.mergedInto && (x.o.teamId === FROM || (x.o.seats || []).some(s => s.teamId === FROM)));
    if (mem.length !== 1) why.push('原本那一組有 ' + mem.length + ' 位成員（要剛好只有他）');
    const rn = runs.filter(x => x.o.teamId === FROM).length, kn = keeps.filter(x => x.o.teamId === FROM).length, pn = pushes.filter(x => x.o.teamId === FROM).length;
    if (rn || kn || pn) why.push('原本那一組有紀錄：Run ' + rn + '、Keep ' + kn + '、Push ' + pn);
    const said = runs.some(r => r.o.said && r.o.said[UID]) || runs.some(r => (r.o.plan || []).some(p => p.who === UID));
    if (said) why.push('他在別組的任務裡寫過話或被指定過分工');
  }
  return { u, a, b, why };
}

(async () => {
  const c = await check();
  console.log('使用者：' + (c.u ? c.u.o.name + '（' + UID + '）' : '無') + '\n原本的組：' + (c.a ? c.a.o.name + ' ' + FROM + '（' + (c.a.o.joinCode || '') + '）' : '無') + '\n要去的組：' + (c.b ? c.b.o.name + ' ' + TO + '（' + (c.b.o.joinCode || '') + '）專案「' + (c.b.o.project || '') + '」' : '無'));
  if (c.why.length) { console.log('\n不能做：\n  · ' + c.why.join('\n  · ')); process.exit(1); }
  console.log('\n條件都符合。會做兩件事：\n  1. ' + c.u.o.name + ' 的 teamId 與 seats 改成 ' + TO + '\n  2. 刪掉空組 ' + FROM);
  if (!APPLY) return console.log('\n（只列清單，沒有寫入。加 --apply 才寫。）');

  const bk = path.join(__dirname, 'backups', 'move-team_' + Date.now() + '.json');
  fs.mkdirSync(path.dirname(bk), { recursive: true });
  fs.writeFileSync(bk, JSON.stringify({ user: c.u.d, from: c.a.d, to: c.b.d }));
  console.log('\n已備份原樣：' + bk);

  /* 寫前再讀一次 */
  const c2 = await check();
  if (c2.why.length) { console.log('剛剛到現在狀況變了，不寫：\n  · ' + c2.why.join('\n  · ')); process.exit(1); }
  const cur = c2.u.o;
  cur.teamMovedFrom = FROM;
  cur.teamId = TO;
  cur.seats = (cur.seats || []).map(s => s.teamId === FROM ? Object.assign({}, s, { teamId: TO }) : s);
  const w = await call('PATCH', 'Users/' + UID + '?updateMask.fieldPaths=j&updateMask.fieldPaths=v', { fields: { j: { stringValue: JSON.stringify(cur) }, v: { integerValue: '2' } } });
  console.log((w.code === 200 ? '✓' : '✗') + ' 改掛 ' + cur.name + ' → ' + TO + '  HTTP ' + w.code);
  if (w.code !== 200) process.exit(1);
  const back = parse((await call('GET', 'Users/' + UID)).json);
  if (back.teamId !== TO) { console.log('✗ 讀回來不是新的組，不刪空組。'); process.exit(1); }
  const dl = await call('DELETE', 'Teams/' + FROM);
  console.log((dl.code === 200 ? '✓' : '✗') + ' 刪掉空組 ' + FROM + '  HTTP ' + dl.code);
  const gone = await call('GET', 'Teams/' + FROM);
  console.log('  再讀一次：' + (gone.code === 404 ? '已經不存在' : 'HTTP ' + gone.code));
  process.exit(dl.code === 200 && gone.code === 404 ? 0 : 1);
})().catch(e => { console.error('失敗：' + e.message); process.exit(2); });
