/* 給還開著舊版分頁的學生一個看得到的提示。

   用法：
     node notice-oldtab.js on     放上去
     node notice-oldtab.js off    收掉（全班都更新完之後）
     node notice-oldtab.js        看現在有沒有

   為什麼是這樣做：舊版分頁的程式碼在學生手機裡，我們改不了它，
   也沒辦法叫它自己出現提示。可是它還讀得到雲端資料，而它的畫面會把
   「老師派的任務」畫出來。所以放一筆特別標記（notice: true）的假任務，
   標題就是提示。舊版分頁的學生首頁會出現「有任務發來了」，點進去看到：
   你的網頁是舊版，請關掉重新打開。

   新版把它當成不存在（40-db.js 的 msFor 等）：不進任務清單、不進審核、
   不進動態、不進匯出，也沒有 Run。舊版分頁沒辦法寫入（資料庫規則），
   所以學生就算在舊版按了它，雲端也不會留下任何東西。

   寫入要帶 v: 2（見 firestore.rules）。 */
const https = require('https');

const proj = 'boss-fight-816f3';
const classId = 'C122jv2i';
const msId = 'M_notice_oldtab';
const path = '/v1/projects/' + proj + '/databases/(default)/documents/world/v1/Milestones/' + msId;

function call(method, body) {
  return new Promise((res, rej) => {
    const rq = https.request({ host: 'firestore.googleapis.com', method, path, headers: { 'Content-Type': 'application/json' } },
      r => { let s = ''; r.on('data', d => s += d); r.on('end', () => res([r.statusCode, s])); });
    rq.on('error', rej);
    if (body) rq.write(JSON.stringify(body));
    rq.end();
  });
}

(async () => {
  const cmd = process.argv[2];
  if (cmd === 'on') {
    const m = {
      msId, classId, mentorId: '',
      title: '【重要】你的網頁是舊版，請關掉重新打開',
      note: '這個網頁太久沒有更新，你在這裡交出去的東西老師收不到。請把這個分頁關掉，重新打開網頁，再做一次。這不是作業，不用交。',
      steps: [], teams: [], due: 0, dueU: '', at: Date.now(), notice: true
    };
    const [code] = await call('PATCH', { fields: { j: { stringValue: JSON.stringify(m) }, v: { integerValue: '2' } } });
    console.log(code === 200 ? '已放上去（舊版分頁的學生會看到）' : '失敗 HTTP ' + code);
    process.exit(code === 200 ? 0 : 1);
  }
  if (cmd === 'off') {
    const [code] = await call('DELETE');
    console.log(code === 200 ? '已收掉' : '失敗 HTTP ' + code);
    process.exit(code === 200 ? 0 : 1);
  }
  const [code, s] = await call('GET');
  console.log(code === 200 ? '現在有：' + JSON.parse(JSON.parse(s).fields.j.stringValue).title : '現在沒有（HTTP ' + code + '）');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
