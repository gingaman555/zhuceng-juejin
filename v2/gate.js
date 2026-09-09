/* 每一支工具自己接上了沒有。

   ── 為什麼要有這一支 ──

   2026-09-09：check.js 的收尾（if (bad) process.exit(1)）卡在檔案中間，
   而新規則一律往檔尾加——所以加在它後面的每一條都只是印字，bad 加了
   沒有人看。查下去發現不是只有它：

     e2e.js    83 條斷言　沒有離開碼
     multi.js  59 條　　　沒有離開碼
     leak.js   找得到漏出來的變數　沒有離開碼
     read.js   量得出「一頁兩個主要動作」　沒有離開碼
     size.js   量得出存不下／畫不出來　沒有離開碼

   deploy 的關卡跑的是 execSync，**只有非零離開碼才會丟例外**。所以那
   五支從來沒有擋下過任何東西——它們一直印著漂亮的 ✓，而那個 ✓ 的意思
   只是「這支腳本跑完了」。

   最壞的地方不是漏掉幾個 bug，是它讓「十七支全過」這句話變成一句
   沒有內容的話，而那句話被拿來當成上線的依據。

   ── 這一支驗什麼 ──

   一 · 每一支都要有「會回非零」的那一條路
   二 · 收尾之後不准再有人加錯誤（不然那幾條等於沒接上）

   它只讀檔案的字，不執行任何一支——所以很快，而且不會被跑得過
   的假象騙到。

   跑法：node gate.js
*/
const fs = require('fs');

/* 不是關卡的那幾支：build 是建置、serve 是伺服器、count 是統計、
   gate 是這一支自己。 */
const 不算 = ['build.js', 'serve.js', 'count.js', 'gate.js'];
const 具 = fs.readdirSync('.').filter(f => f.endsWith('.js') && 不算.indexOf(f) < 0).sort();

let 壞 = [];
console.log('\n════════════════════════════════════════════════════');
console.log('  每一支工具接上了沒有');
console.log('════════════════════════════════════════════════════\n');
console.log('  工具'.padEnd(14) + '會回非零'.padEnd(12) + '收尾之後還在加');
console.log('  ' + '─'.repeat(48));

具.forEach(function (f) {
  const 去註 = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');

  /* 一 · 有沒有一條會回非零的路。
     process.exit(0) 不算；其餘任何形式都算（三元式、變數、括號包起來的
     條件都有人寫過，所以不去解析裡面長什麼樣，只排除寫死的 0）。 */
  const 每個離開 = 去註.match(/process\.exit\(([^;]*)\)/g) || [];
  const 有非零 = 每個離開.some(function (x) {
    return !/^process\.exit\(\s*0\s*\)$/.test(x.trim());
  });

  /* 二 · 最後一個 process.exit 之後，還有沒有人在累加錯誤。
     那是 check.js 踩到的那一種：印得出錯，可是已經沒有人看了。 */
  const i = 去註.lastIndexOf('process.exit');
  let 之後 = 0;
  if (i >= 0) {
    const 尾 = 去註.slice(i);
    之後 = (尾.match(/\bbad\s*\+\+|錯\.push\(|提醒\.push\(|漏\.push\(|\bfail\(/g) || []).length;
  }

  console.log('  ' + f.padEnd(14) +
    (有非零 ? '✓' : '✗ 沒有').padEnd(12) +
    (之後 ? '✗ ' + 之後 + ' 處' : '—'));
  if (!有非零) {
    壞.push(f + '：沒有一條會回非零的路——deploy 永遠當它過了');
  }
  if (之後) {
    壞.push(f + '：收尾之後還有 ' + 之後 + ' 處在加錯誤，那幾條擋不下東西');
  }
});

console.log('\n════════════════════════════════════════════════════');
if (壞.length) {
  console.log('  ✗ ' + 壞.length + ' 件');
  壞.forEach(x => console.log('    · ' + x));
} else {
  console.log('  ' + 具.length + ' 支都接得上：會回非零，而且收尾在最後面');
}
console.log('════════════════════════════════════════════════════\n');
process.exit(壞.length ? 1 : 0);
