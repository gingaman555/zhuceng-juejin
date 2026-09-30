/* 改一次，兩個站一起上。

   現在有兩個站，跑的是同一份**原始碼**，但**不是同一份產出**：

     boss-fight-816f3.web.app   專案地下城　　　分組
     boss-fight-b.web.app       專案地下城 B　　不分組

   它們是**兩個 Firebase 專案**，所以資料庫完全分開——不同的 Console、
   不同的免費額度、不同的匯出檔案，兩邊的資料在物理上不可能混到。

   而程式碼裡沒有任何金鑰或專案名（設定是 Hosting 自己發的
   /__/firebase/init.js 帶進來的，見 v2/build.js 的檔頭），所以部署到
   哪個專案，就自動連到那個專案的資料庫。

   兩份產出的差別只有一個變項（RULES.SOLO），寫在 v2/build.js 的
   SITES 上——那張表就是「哪一站跟主站哪裡不一樣」，而那份清單本身
   就是研究改了什麼的紀錄。

   ── 為什麼要一支腳本 ──

   一 · 手動的話是「build main → build b → 跑二十二支檢查 →
        deploy A（用 firebase.json）→ deploy B（用 firebase.b.json）」。
        五個步驟裡漏掉任何一個，兩個站就開始不一樣，而那是最難發現的
        那種問題：你在 A 站看到修好了，B 站的學生沒有。

        這不是假設。第一版的 deploy 只 build 主站、兩邊都用同一個
        firebase.json，所以 B 站拿到的一直是主站那一份——而當時的驗證
        只看「這一版的記號」跟資料庫，剛好兩個都對，所以它安靜地錯了
        好幾次。現在驗那一段會抓每一站自己的標題。

   二 · 檢查沒過就不要上。這一支會先跑完二十二支（大約 10 秒），
        任何一支掛掉就停在那裡，一個站都不動。

   三 · 這台機器連 googleapis 會間歇性 DNS 失敗（getaddrinfo
        ENOTFOUND），今天遇到六次。手動的時候要自己盯著重試，
        而「以為上好了其實沒上」比失敗還糟。這裡自動重試三次。

   跑法：
     node deploy.js         兩個站都上
     node deploy.js main    只上主站
     node deploy.js b       只上第二站
     node deploy.js --skip  跳過檢查（只有在你剛剛才跑過的時候）
*/
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const V2 = path.join(__dirname, 'v2');

/* 站台表。要加第三個班就在這裡加一行。

   ── build 跟 config 兩欄都要有 ──

   兩個站跑的**不是同一份** index.html：B 站不分組（見 v2/build.js 的
   SITES）。所以每一個站要 build 自己那一份，而且用自己那一份 hosting
   設定去部署。

   我第一版沒有這兩欄——只 build 主站、兩邊都用同一個 firebase.json，
   結果 B 站拿到的是主站那一份（分組版），而部署後的驗證只看
   「這一版的記號」跟資料庫，剛好兩個都對，所以它安靜地錯了好幾次。

   驗那一段現在會抓每一站自己的標題，這種錯下次會被抓到。

   ── config 不是只有 hosting ──

   2026-09-09：firebase.b.json 裡沒有 firestore 那一段，所以
   firestore.rules 從來沒有被推到 boss-fight-b —— B 站的規則一直是
   Console 上手動設的那一份，repo 裡沒有紀錄，deploy 也復原不了。

   當天探過，B 站的讀取是通的（打一個不存在的文件路徑回 404 而不是
   403），所以沒有漏收資料。可是如果 Console 上那一份是 test mode，
   它帶著到期時間戳，到期那天會靜靜地翻成拒絕——而學生端寫入失敗只有
   console.warn（見 41-sync.js 的 syncTrouble），畫面上什麼都不會說。
   B 站是實驗組，那份資料掉了補不回來。

   兩個 config 現在都帶 firestore.rules。 */
const 站 = {
  main: {
    project: 'boss-fight-816f3', url: 'https://boss-fight-816f3.web.app',
    build: 'main', config: 'firebase.json', title: '專案地下城'
  },
  b: {
    project: 'boss-fight-b', url: 'https://boss-fight-b.web.app',
    build: 'b', config: 'firebase.b.json', title: '專案地下城 B'
  }
};

/* 上線之前一定要過的那幾支。順序照「壞掉的時候多痛」排：
   check 擋設計界線、loop 擋資料、pages 擋畫不出來，
   後面那幾支是流程與教室情境。

   ── 這張清單要跟 gate.js 掃到的那一批對得起來 ──

   2026-09-09：gate.js 把 size.js 當關卡在驗（它不在 gate 的「不算」
   名單裡），而這張清單上沒有它。所以 size.js 的離開碼補上了、gate 也
   說它接得上，可是從來沒有人跑它——它依然擋不下任何東西。

   那是同一次事故修到一半：離開碼是「這一支說得出不對」，在這張清單上
   才是「有人在聽」。兩件事都要有。

   加新工具的時候：gate.js 是自動掃目錄的，這張清單不是。 */
const 檢查 = [
  ['check.js', ''], ['loop.js', '200'], ['pages.js', ''], ['e2e.js', ''], ['me.js', ''],
  ['read.js', ''], ['leak.js', ''], ['multi.js', ''], ['multi.js', '1'],
  ['class.js', ''], ['stale.js', ''], ['fuzz.js', ''], ['size.js', ''], ['absent.js', ''], ['solo.js', ''], ['twoclass.js', ''],
  ['crystal.js', ''], ['siteb.js', ''], ['rank.js', ''], ['path.js', ''], ['demo.js', ''], ['gate.js', '']
];

const 參 = process.argv.slice(2);
const 跳過檢查 = 參.indexOf('--skip') >= 0;
const 指定 = 參.filter(function (x) { return x.indexOf('-') !== 0; });
const 要上 = 指定.length ? 指定 : Object.keys(站);

要上.forEach(function (k) {
  if (!站[k]) {
    console.error('沒有這個站：' + k + '（有的是：' + Object.keys(站).join('、') + '）');
    process.exit(1);
  }
});

function 跑(cmd, cwd) {
  return execSync(cmd, { cwd: cwd || __dirname, encoding: 'utf8', stdio: 'pipe' });
}

/* ── 一 · 併起來 ──
   每一個要上的站各 build 自己那一份——它們**不是同一份**（見上面的
   站台表）。 */
console.log('\n── 併 ──');
要上.forEach(function (k) {
  process.stdout.write('  ' + 跑('node build.js ' + 站[k].build, V2));
});

/* ── 二 · 檢查 ── */
if (跳過檢查) {
  console.log('\n── 檢查：跳過（--skip）──');
} else {
  console.log('\n── 檢查 ──');
  const t0 = Date.now();
  let 壞 = [];
  檢查.forEach(function (c) {
    const 名 = c[0] + (c[1] ? ' ' + c[1] : '');
    try {
      跑('node ' + c[0] + (c[1] ? ' ' + c[1] : ''), V2);
      process.stdout.write('  ✓ ' + 名 + '\n');
    } catch (e) {
      process.stdout.write('  ✗ ' + 名 + '\n');
      const 出 = ((e.stdout || '') + (e.stderr || '')).split('\n')
        .filter(function (l) { return l.indexOf('✗') >= 0 || l.indexOf('Error') >= 0; });
      出.slice(0, 4).forEach(function (l) { console.log('      ' + l.trim()); });
      壞.push(名);
    }
  });
  console.log('  （' + ((Date.now() - t0) / 1000).toFixed(0) + ' 秒）');
  if (壞.length) {
    console.error('\n' + 壞.length + ' 支沒過：' + 壞.join('、'));
    console.error('一個站都沒有動。修好再跑一次。\n');
    process.exit(1);
  }
}

/* ── 三 · 上線 ── */
console.log('\n── 上線 ──');
let 失敗 = [];
要上.forEach(function (k) {
  const s = 站[k];
  process.stdout.write('  ' + k + '　' + s.project + '　');
  let 好 = 0, 最後錯 = '';
  for (var i = 1; i <= 4; i++) {
    /* 中間要等。

       那個 DNS 失敗（getaddrinfo ENOTFOUND）會持續幾秒，所以連著
       重試三次等於在同一個壞掉的幾秒裡試了三次——實測就是這樣三次
       全掛，而手動隔二十秒再跑一次就過了。

       退避：0、3、8、15 秒。 */
    if (i > 1) {
      const 等 = [0, 3, 8, 15][i - 1];
      process.stdout.write('等' + 等 + 's·');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 等 * 1000);
    }
    try {
      /* --config 一定要帶：兩個站的 public 目錄不一樣（v2 ／ v2/b），
         用預設的 firebase.json 會把主站那一份推到 B 站上。 */
      const out = 跑('npx firebase-tools deploy --project ' + s.project +
        ' --config ' + s.config);
      if (out.indexOf('Deploy complete') >= 0) { 好 = 1; break; }
      最後錯 = out.split('\n').slice(-4).join(' ').trim();
      process.stdout.write('·');
    } catch (e) {
      最後錯 = ((e.stdout || '') + (e.stderr || '') + (e.message || ''))
        .split('\n').filter(function (l) { return /Error|error/.test(l); })[0] || e.message;
      process.stdout.write('·');
    }
  }
  if (好) console.log('✓');
  else {
    console.log('✗ 四次都沒成功');
    console.log('      ' + String(最後錯).slice(0, 160));
    失敗.push(k);
  }
});

/* ── 四 · 真的上去了嗎 ── */
console.log('\n── 驗 ──');
要上.forEach(function (k) {
  if (失敗.indexOf(k) >= 0) return;
  const s = 站[k];
  try {
    /* 抓回來的那一份有 718KB。用管線接會在 Windows 上丟 ENOBUFS
       （那是管線本身的限制，不是 maxBuffer），所以讓 curl 寫檔、
       這裡用 fs 讀。 */
    const 暫 = path.join(__dirname, '.verify-' + k + '.html');
    跑('curl -s -o "' + 暫 + '" ' + s.url + '/');
    const html = fs.readFileSync(暫, 'utf8');
    fs.unlinkSync(暫);

    /* 這一版才有的記號，確認拿到的不是舊的那一份。 */
    const 記 = ['seatsOf', 'pressable', 'NEGOTIATE'].filter(function (w) {
      return html.indexOf(w) >= 0;
    });
    /* ── 標題：這一站拿到的是不是**它自己**那一份 ──

       兩個站的 build 不一樣（B 站不分組），可是別的記號兩邊都有，
       只有標題分得出來。

       這一條是補上的，因為第一版的 deploy 只 build 主站、兩邊都用同一個
       firebase.json——B 站拿到的一直是主站那一份（分組版），而當時的
       驗證只看記號跟資料庫，剛好兩個都對，所以它安靜地錯了好幾次。 */
    const 標 = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '？';
    const 標對 = 標 === s.title;
    const solo = /RULES\.SOLO = 1;/.test(html);
    const solo對 = (k === 'b') === solo;

    /* init.js 說它連到哪一個資料庫 */
    const init = 跑('curl -s ' + s.url + '/__/firebase/init.js');
    const pid = (init.match(/"projectId": *"([^"]*)"/) || [])[1] || '？';
    const 對 = pid === s.project;

    console.log('  ' + k + '　' + s.url);
    console.log('      這一版的記號 ' + 記.length + '/3　·　資料庫 ' + pid +
      (對 ? ' ✓' : ' ✗ 不是這個站的！'));
    console.log('      標題「' + 標 + '」' + (標對 ? ' ✓' : ' ✗ 拿到的是別的站那一份！') +
      '　·　不分組 ' + (solo ? '是' : '否') + (solo對 ? ' ✓' : ' ✗'));
    if (!對 || !標對 || !solo對) 失敗.push(k);
  } catch (e) {
    console.log('  ' + k + '　驗不到（' + e.message.split('\n')[0] + '）');
  }
});

console.log('');
if (失敗.length) { console.error('沒上成功：' + 失敗.join('、') + '\n'); process.exit(1); }
/* 本來寫的是「兩邊都是同一份」。那句話在 B 站變成不分組的那一刻
   就不成立了——而它印在最後一行，最容易被當成保證。 */
console.log('每一站都拿到自己那一份，資料庫各自獨立。\n');
