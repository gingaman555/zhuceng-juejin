/* 四隻 BOSS 的對照表：一頁看完長相、台詞、跟哪一把武器對上 */
const fs = require('fs'), path = require('path');
const B = JSON.parse(fs.readFileSync(path.join(__dirname, 'bosses.json'), 'utf8'));
const MEET = {
  1: { layer: '微光荒原', hard: '難的不是挖不動，是不知道從哪裡開始挖。', fail: '範圍未定義',
       weapon: '礦脈羅盤', wfunc: '辨認方向真假', mins: 6,
       locked: '你連我在哪都說不出來。', ready: '現在你看得到我了。說說看你走過哪裡。', blocked: '牠沒有動。是你還沒說清楚。' },
  2: { layer: '水晶迴廊', hard: '難的是採不完，不知道什麼時候該收。', fail: '範圍蔓延',
       weapon: '地層切割器', wfunc: '切開擋路的東西', mins: 6,
       locked: '還有喔。這裡永遠還有。', ready: '你停手了。那才是難的部分。', blocked: '你還在挑。挑到什麼時候？' },
  3: { layer: '迴聲迷宮', hard: '難的是你以為知道的其實不知道。', fail: '未驗證的假設',
       weapon: '壓力量規', wfunc: '偵測應力，提前知道哪裡會斷', mins: 5,
       locked: '你剛剛說的話，是你查過的，還是你以為的？', ready: '這次的聲音是你自己的了。', blocked: '你又把我的話當成你的答案了。' },
  4: { layer: '熔火深淵', hard: '難的是時間在漲，必須取捨。', fail: '時程壓縮',
       weapon: '熱流導航儀', wfunc: '在無規律中找路', mins: 5,
       locked: '你還在挑要先做哪一個。時間不等。', ready: '你捨掉了一些東西。那就是取捨。', blocked: '你什麼都想留。那就什麼都做不完。' }
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const card = b => {
  const m = MEET[b.layer];
  const svg = fs.readFileSync(path.join(__dirname, b.id + '.svg'), 'utf8');
  return `<section class="c">
  <div class="art" style="--k:${b.hue['#']}">${svg}</div>
  <div class="info">
    <div class="k">L${b.layer} · ${esc(m.layer)}</div>
    <h2 style="color:${b.hue['#']}">${esc(b.name)}</h2>
    <p class="hard">${esc(m.hard)}</p>
    <div class="row"><span>失敗模式</span><b>${esc(m.fail)}</b></div>
    <div class="row"><span>採幾塊</span><b>${m.mins} 塊礦石</b></div>
    <div class="row"><span>鑄成</span><b style="color:${b.hue['#']}">${esc(m.weapon)}</b></div>
    <div class="row"><span>為什麼剋得住</span><b>${esc(m.wfunc)}</b></div>
    <div class="lines">
      <div><i>未採齊</i>「${esc(m.locked)}」</div>
      <div><i>採齊了</i>「${esc(m.ready)}」</div>
      <div><i>被擋下</i>「${esc(m.blocked)}」</div>
    </div>
  </div>
</section>`;
};
const html = `<title>逐層掘進 · 守關生物</title>
<style>
:root{color-scheme:dark}
body{margin:0;background:#0B0A09;color:#E8E2D6;font:400 15px/1.7 "Noto Sans TC",system-ui,sans-serif;padding:38px 26px 60px}
h1{font-size:26px;letter-spacing:.16em;margin:0 0 6px}
.sub{color:#8A8073;font-size:14px;margin:0 0 34px;max-width:none}
.c{display:flex;gap:26px;align-items:flex-start;padding:24px 0;border-top:1px solid #221E19;flex-wrap:wrap}
.art{flex:none;width:190px;height:190px;padding:14px;background:radial-gradient(circle at 50% 42%,color-mix(in srgb,var(--k) 22%,transparent),transparent 70%),#111 ;border:1px solid #2E2822;image-rendering:pixelated}
.art svg{width:100%;height:100%}
.info{flex:1;min-width:280px}
.k{font-size:11px;letter-spacing:.26em;color:#8A8073}
h2{font-size:30px;margin:8px 0 10px;letter-spacing:.08em}
.hard{color:#C3BAAA;margin:0 0 14px}
.row{display:flex;gap:12px;font-size:14px;padding:4px 0}
.row span{flex:none;width:110px;color:#5F574C;font-size:12px;letter-spacing:.1em}
.lines{margin-top:14px;padding-top:12px;border-top:1px solid #221E19;font-size:14px;color:#9A9184}
.lines div{padding:3px 0}
.lines i{display:inline-block;width:74px;font-style:normal;color:#5F574C;font-size:12px}
footer{margin-top:36px;padding-top:18px;border-top:1px solid #221E19;color:#5F574C;font-size:13px}
</style>
<h1>守關生物</h1>
<p class="sub">前四層各一隻。牠不是反派，是那一層難處的化身。採齊那一層的礦石 → 向老師提出申請 → 他准了，礦石鑄成那一層的道具 → 用它擊退牠。第五層沒有 BOSS：擋你的是你自己。</p>
${B.map(card).join('\n')}
<footer>像素資料在 bosses.json（24×24 字元陣列，. 透明 / # 主體 / o 次要 / * 高光 / ~ 環境）。執行期請用 Live.html 裡的前端版 toSvg()，不要載入這裡的 .svg 檔。</footer>`;
fs.writeFileSync(path.join(__dirname, 'preview.html'), html);
console.log('wrote bosses/preview.html');
