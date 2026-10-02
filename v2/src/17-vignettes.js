/* 通知與門口頁上的小插圖。

   2026-10-02：三張通知（更新說明、組別問題、新任務）、建立／加入隊伍頁、
   「請重新打開」那一頁，本來全是字。這個系統的世界是一座礦坑地下城——
   學生在廊道上走、有火把、有水晶——所以這幾個「跳出來說話」的地方也該是
   地下城裡看得到的東西，而不是網頁的對話框：

     委託書　　老師派了新任務（一張蓋著蠟封的羊皮紙）
     提燈　　　有新版、更新了什麼（一盞點著的提燈：照亮新的地方）
     路標　　　這一組只有你一個人：是不是走錯岔路了（兩塊指向相反的木牌）
     營帳　　　建立／加入隊伍（營地上插著旗）

   跟其他像素圖同一套：. 透明，其餘字元由各自的調色盤決定（見 30-art.js 的 pxSvg）。
   畫得很小（16 格），放大成 88px 顯示——小到沒辦法畫細節，只讓輪廓認得出來。
   它們只是畫，沒有任何資訊，也不是按鈕。 */

var VIG_PAL = {
  k: '#2A1E12', P: '#E8D8A8', q: '#C9B27A', i: '#6B5538',
  W: '#8A5A2B', w: '#B07A3C', r: '#B8442E', e: '#E06A4F',
  g: '#F6C86A', F: '#FFF1C2', O: '#E9843F', T: '#C9B98F', t: '#9C8C64',
  R: '#B8442E', D: '#1E1610', '#': '#8A5A2B', '*': '#B07A3C'
};

var VIG = {
  /* 委託書：上下兩根卷軸、中間三行字、右下角一枚蠟封 */
  scroll: [
    '................',
    '..kkkkkkkkkkkk..',
    '.kwwwwwwwwwwwwk.',
    '.kWWWWWWWWWWWWk.',
    '..kkkkkkkkkkkk..',
    '..kPPPPPPPPPPk..',
    '..kPiiiiiiiPqk..',
    '..kPPPPPPPPPqk..',
    '..kPiiiiiiPPqk..',
    '..kPPPPPPPPPqk..',
    '..kPiiiiiPPrrk..',
    '..kPPPPPPPrerk..',
    '..kqqqqqqqqrrk..',
    '..kkkkkkkkkkkk..',
    '.kwwwwwwwwwwwwk.',
    '..kkkkkkkkkkkk..'
  ],

  /* 路標：一根柱子、兩塊指向相反方向的木牌 */
  signpost: [
    '......kkkk......',
    '......kWWk......',
    '..kkkkkWWkkkk...',
    '..kwwwwWWwwwwk..',
    '..kwwwwWWwwwwwk.',
    '..kwwwwWWwwwwk..',
    '..kkkkkWWkkkk...',
    '......kWWk......',
    '...kkkkWWkkkkk..',
    '..kwwwwWWwwwwk..',
    '.kwwwwwWWwwwwk..',
    '..kwwwwWWwwwwk..',
    '...kkkkWWkkkkk..',
    '......kWWk......',
    '......kWWk......',
    '....kkkkkkkk....'
  ],

  /* 營帳：一頂帳篷、頂上插一面旗 */
  tent: [
    '.......kk.......',
    '.......kRRk.....',
    '.......kRRRk....',
    '.......kRRk.....',
    '.......kk.......',
    '......kTTk......',
    '.....kTTTTk.....',
    '....kTTkkTTk....',
    '...kTTTkDkTTTk..',
    '..kTTTTkDkTTTTk.',
    '.kTTTTTkDkTTTTTk',
    'kkkkkkkkDkkkkkkk'
  ]
};

/* 提燈有兩幀：火苗輪流亮、輪流縮（見 17-vignettes 底下 vignette()）。 */
var VIG_LANTERN = [
  [
    '....kkkk....',
    '...k....k...',
    '..kkkkkkkk..',
    '.kWWWWWWWWk.',
    '..kkkkkkkk..',
    '.kgggFFgggk.',
    '.kggFOOFggk.',
    '.kgFOOOOFgk.',
    '.kgFOOOOFgk.',
    '.kggFOOFggk.',
    '.kgggFFgggk.',
    '..kkkkkkkk..',
    '.kWWWWWWWWk.',
    '..kkkkkkkk..'
  ],
  [
    '....kkkk....',
    '...k....k...',
    '..kkkkkkkk..',
    '.kWWWWWWWWk.',
    '..kkkkkkkk..',
    '.kggggggggk.',
    '.kgggFFgggk.',
    '.kggFOOFggk.',
    '.kgFOOOOFgk.',
    '.kggFOOFggk.',
    '.kgggFFgggk.',
    '..kkkkkkkk..',
    '.kWWWWWWWWk.',
    '..kkkkkkkk..'
  ]
];

/* 一張插圖。name：scroll／signpost／tent／lantern。
   提燈會閃（兩幀疊著輪流顯示，同 .wf／.wa／.wb 那一套）；其餘是一張靜態圖。 */
function vignette(name) {
  if (name === 'lantern') {
    return '<span class="vig vig-anim" aria-hidden="true">' +
      pxTag(VIG_LANTERN[0], VIG_PAL, 'wf wa') +
      pxTag(VIG_LANTERN[1], VIG_PAL, 'wf wb') + '</span>';
  }
  var px = VIG[name];
  if (!px) return '';
  return '<span class="vig" aria-hidden="true">' + pxTag(px, VIG_PAL, '') + '</span>';
}
