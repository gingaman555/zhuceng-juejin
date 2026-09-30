/* firestore.rules（版本檢查）部署之後，量一次它到底擋了什麼、放了什麼。

   用法：node test-strict-rules.js <專案ID>
     例：node test-strict-rules.js boss-fight-b

   它只碰一個叫 ZZRulesTest 的測試文件，測完會刪掉。
   離開碼 0 = 四種情形都跟預期一樣；非 0 = 規則不是預期的樣子（別切到主站）。 */
const https = require('https');
const proj = process.argv[2];
if (!proj) { console.error('要帶專案 ID，例如 boss-fight-b'); process.exit(2); }
const path = '/v1/projects/' + proj + '/databases/(default)/documents/ZZRulesTest/t1';

function call(method, body, mask) {
  return new Promise((res, rej) => {
    const rq = https.request({
      host: 'firestore.googleapis.com', method,
      path: path + (mask ? '?updateMask.fieldPaths=j&updateMask.fieldPaths=v&updateMask.fieldPaths=x' : ''),
      headers: { 'Content-Type': 'application/json' }
    }, r => { let s = ''; r.on('data', d => s += d); r.on('end', () => res(r.statusCode)); });
    rq.on('error', rej);
    if (body) rq.write(JSON.stringify(body));
    rq.end();
  });
}
const F = (o) => ({ fields: o });
const j = { stringValue: '{}' };

(async () => {
  const cases = [
    ['新版：{ j, v: 2 }', () => call('PATCH', F({ j, v: { integerValue: '2' } })), 200],
    ['舊版：只有 { j }（沒有 v）', () => call('PATCH', F({ j })), 403],
    ['v 不是 2', () => call('PATCH', F({ j, v: { integerValue: '1' } })), 403],
    ['多帶別的欄位', () => call('PATCH', F({ j, v: { integerValue: '2' }, x: { stringValue: 'a' } })), 403],
    ['讀取照舊開著', () => call('GET'), 200],
    ['刪除照舊開著', () => call('DELETE'), 200],
  ];
  let bad = 0;
  for (const [名, fn, 期] of cases) {
    const 實 = await fn();
    const ok = 實 === 期;
    if (!ok) bad++;
    console.log((ok ? '  ✓ ' : '  ✗ ') + 名 + '　→ ' + 實 + '（預期 ' + 期 + '）');
  }
  console.log(bad ? '\n' + bad + ' 項不是預期的樣子。' : '\n規則就是預期的樣子。');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
