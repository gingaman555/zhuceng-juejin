/* ---------- 四種角色 ----------

   使用者要學生能照自己的喜好挑一個角色，而且四種的**剪影**就要不一樣
   ——不是換顏色。66px 的廊道上遠遠看過去，認得出來的只有輪廓：

     冒險者  斗篷 ＋ 提燈 ＋ 腰間的劍。上寬下窄，手上一團光。
     魔法師  尖帽 ＋ 法杖 ＋ 長袍。上面一個尖、下面一個喇叭口，
             站著的時候看不到腳——袍子拖到地上。
     忍者    頭巾只露一條眼縫 ＋ 背後短刃 ＋ 一條往後飄的圍巾。
             四種裡最瘦的一個，橫向多出來的是那條圍巾。
     騎士    有羽飾的頭盔 ＋ 護肩 ＋ 左手一面盾。四種裡最寬的一個，
             盾是一整塊，遠看就是一個方形。

   所以走路那兩幀不能共用，每一種都自己畫。一種十四個姿勢，
   跟冒險者一模一樣的十四個：站兩幀、走兩幀、坐兩幀、睡、背影、
   揮擊、衝刺、贏、喘、逃。

   規矩跟原本那一個一樣：16×16、光從左上來、輪廓一律 k、
   受光面在左上而陰影在右下。顏色分區是剪影變成角色的關鍵——
   一個 16×16 的人要看得出是「誰」，靠的不是解析度。 */

var HEROES = {};

/* 冒險者就是本來那一個。 */
HEROES.adv = HERO;

/* ---------- 魔法師 ----------
   尖帽從第 0 列開始收成一個點，第 5 列整條帽簷 —— 那個「▲ 壓在一條
   橫線上」的形狀在遠處就認得出來。法杖立在右邊，頂端一顆會亮的珠子。 */
HEROES.mage = {
  pal: {
    k: '#14100E',   /* 輪廓 */
    s: '#E8B98A',   /* 皮膚 192 */
    S: '#A8724A',   /* 皮膚的陰影 122 */
    h: '#D8D2C4',   /* 鬍子 210 */
    H: '#D8D2C4',   /* 鬍子受光併進鬍子——本來只差 27，而且只有十二格 */
    c: '#6650A6',   /* 帽子與長袍。本來 #4A3A7A，對六層底色最低只有 1.86
                       ——比忍者改完的 2.70、騎士的 3.16 都低。查「停很久
                       那一組看不見」的時候順手量出來的。提到 2.78。 */
    C: '#A88FE8',   /* 長袍受光。本體提亮之後這一階要跟著上去，
                       不然兩階會併成一塊（差 2.38）。 */
    t: '#241D3E',   /* 袍子的暗面 35 */
    T: '#241D3E',   /* 本來 58，夾在暗面 43 跟長袍 66 中間，等於沒有 */
    b: '#3A2E1C',   /* 腰帶 46 */
    m: '#A87C4E',   /* 法杖 127 */
    M: '#A87C4E',   /* 一根一格寬的杖不需要兩階 */
    g: '#F5CB74',   /* 杖頂那一顆 206 */
    G: '#FFF3D8',   /* 那一顆的芯 244 */
    '#': '#FFF3D8', o: '#6B5A3A', '*': '#FFF3D8'
  },
  idleA: ['.......kk.......', '......kcCk......', '.....kccCk......', '....kcccCck.....',
    '...kccccCcck....', '..kkkkkkkkkkk...', '.....ksssk..kk..', '.....ksSsk.kgGk.',
    '....khhhhhk.kgk.', '...kccCCCck..M..', '...kccCCCck..M..', '...kcbbbbck..M..',
    '..kcccCCcck..M..', '..kcccCCcck..M..', '.kccccCCccck.M..', '.kkkkkkkkkkkkk..'],
  idleB: ['................', '.......kk.......', '......kcCk......', '.....kccCk......',
    '....kcccCck.....', '...kccccCcck....', '..kkkkkkkkkkk...', '.....ksssk..kk..',
    '.....ksSsk.kgGk.', '....khhhhhk.kgk.', '...kccCCCck..M..', '...kcbbbbck..M..',
    '..kcccCCcck..M..', '..kcccCCcck..M..', '.kccccCCccck.M..', '.kkkkkkkkkkkkk..'],
  walkA: ['.......kk.......', '......kcCk......', '.....kccCk......', '....kcccCck.....',
    '...kccccCcck....', '..kkkkkkkkkkk...', '.....ksssk..kk..', '.....ksSsk.kgGk.',
    '....khhhhhk.kgk.', '...kccCCCck..M..', '...kcbbbbck..M..', '..kcccCCcck..M..',
    '.kcccCCcck...M..', 'kcccCk.kCcck.M..', 'kkkk.....kkkk...', '................'],
  walkB: ['................', '.......kk.......', '......kcCk......', '.....kccCk......',
    '....kcccCck.....', '...kccccCcck....', '..kkkkkkkkkkk...', '.....ksssk..kk..',
    '.....ksSsk.kgGk.', '....khhhhhk.kgk.', '...kccCCCck..M..', '...kcbbbbck..M..',
    '..kcccCCcck..M..', '.kccccCCccck.M..', '.kkkkkkkkkkkkk..', '................'],
  sitA: ['................', '................', '......kk........', '.....kcCk.......',
    '....kccCk.......', '...kcccCck......', '..kkkkkkkkk.....', '.....ksssk......',
    '.....ksSsk......', '....khhhhhk.....', '...kccCCCckk....', '..kccCCCCcck....',
    '.kcccbbbbcck....', 'kcccCCCCcck.....', 'kkkkkkkkkkk.....', '................'],
  sitB: ['................', '................', '................', '......kk........',
    '.....kcCk.......', '....kccCk.......', '...kcccCck......', '..kkkkkkkkk.....',
    '.....ksssk......', '.....ksSsk......', '....khhhhhk.....', '...kccCCCckk....',
    '..kccCCCCcck....', '.kcccbbbbcck....', 'kkkkkkkkkkkk....', '................'],
  /* 躺著。骨架跟另外三位一樣，見 11-world.js 的 HERO.sleep。 */
  sleep: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.............z..',
    '...........z....',
    '........zZ......',
    '................',
    '..........kkkk..',
    '...kkkk..kbCCbk.',
    '..khhhhk.kcCCck.',
    '..khssscCCCccck.',
    '..khssscccCcbck.',
    '..kkkkkkkkkkkkk.'
  ],
  back: ['.......kk.......', '......kcCk......', '.....kccck......', '....kccccck.....',
    '...kcccccck.....', '..kkkkkkkkkk....', '....kccccck.kk..', '...kcccccck.kgk.',
    '...kcccccck..M..', '...kcbbbbck..M..', '..kcccccck...M..', '..kcccccck...M..',
    '.kccccccck...M..', '.kccccccck...M..', 'kcccccccck...M..', 'kkkkkkkkkkk.....'],
  swing: ['..........kGGk..', '.......kk.kGgGk.', '......kcCkkGgk..', '.....kccCkkgk...',
    '....kcccCckMk...', '..kkkkkkkkMk....', '.....ksssk M....', '.....ksSskM.....',
    '....khhhhhk.....', '...kccCCCck.....', '...kcbbbbck.....', '..kcccCCcck.....',
    '..kcccCCcck.....', '.kccccCCccck....', '.kccccCCccck....', '.kkkkkkkkkkk....'],
  dash: ['................', '..~~...kk.......', '.~~~..kcCk......', '~~~..kccCk......',
    '.~~~.kcccCck....', '..~kkkkkkkkkk...', '.~~..ksssk..kk..', '~~...ksSsk.kgGk.',
    '.~..khhhhhk.kgk.', '...kccCCCck..M..', '...kcbbbbck..M..', '..kcccCCcck.M...',
    '.kcccCCcck..M...', 'kcccCk.kCck.M...', 'kkkk....kkkk....', '................'],
  win: ['....kk.....kGk..', '...kcCk...kGgGk.', '..kccCk....kgk..', '.kcccCck....M...',
    'kkkkkkkkkk..M...', '..ksssk.....M...', '..ksSsk.....M...', '.khhhhhk....M...',
    'kccCCCckk...M...', 'kccCCCcck...M...', 'kcbbbbcck.......', 'kcccCCcck.......',
    'kcccCCcck.......', 'kccccCCcck......', 'kccccCCcck......', 'kkkkkkkkkk......'],
  pant: ['................', '................', '................', '.......kk.......',
    '......kcCk......', '.....kccCk......', '....kcccCck.....', '..kkkkkkkkkkk...',
    '.....ksssk......', '....khsSshk.....', '...kchhhhck..k..', '..kccCCCcck.kM..',
    '..kcbbbbcck.kM..', '.kcccCCccck.M...', '.kcccCCccck.....', '.kkkkkkkkkkk....'],
  flee: ['.......kk.......', '......kcCk......', '.....kcCck......', '....kcCcck......',
    '...kcCcccck.....', '..kkkkkkkkkk....', '....ksssk.......', '....ksSsk.......',
    '...khhhhhk......', '..kccCCCck......', '..kcbbbbck......', '.kcccCCcck......',
    'kcccCCcck.......', 'kccCk.kCck......', 'kkk.....kkk.....', '................']
};

/* ---------- 忍者 ----------
   最瘦的一個。頭巾只露一條眼縫（S 那一格），背後一把短刃斜插，
   右邊一條圍巾往後飄——橫向多出來的只有那條圍巾，所以剪影是
   「一根細的直條 ＋ 一道橫的」。 */
HEROES.ninja = {
  pal: {
    k: '#100D0C', /* 輪廓。跟另外三位一樣是近黑——輪廓讀的是身體的邊，
                     不是背景的邊。 */
    s: '#E8B98A', /* 露出來的那條眼縫 192 */
    S: '#1B2233', /* 眼睛。頭巾亮起來之後這一格要跟著壓暗，
                     不然眼縫看不出是一條縫 */

    /* ── 2026-09-07：整身衣服提亮 ──

       量出來的：本來 #1A2338 對六層底色的對比是 1.14–1.28（1.0 就是
       看不見），而騎士是 3.16。水晶迴廊的底是 #0C1720、迴聲迷宮是
       #131024——同色系又同明度，忍者等於穿了保護色。

       他在剖面圖上、廊道上、圖鑑上都是一個看不見的人，而那一頁的
       標題是「大家都在下面」。

       提到 #455C8C（最低 2.70）。還是比騎士暗，所以他仍然是那個
       穿深色的——只是看得見了。 */
    h: '#455C8C', /* 頭巾與衣服 */
    H: '#7A99D2', /* 受光面。跟本體差 2.31，一階看得出來 */
    c: '#D9584A', /* 圍巾。本來 #A83A34 在新的身體上只差 1.05——
                     紅配藍靠色相分得開，可是明度一樣的兩塊在點陣圖上
                     邊界會消失。提亮到差 1.72 */
    C: '#F79070', /* 圍巾受光 */
    t: '#455C8C', /* 衣服＝頭巾同一塊布 */
    T: '#7A99D2',
    b: '#A88A4C', /* 綁腿與腰帶。暖色，跟一身藍靠色相分得開，可是明度也
                     要分得開——#7A6436 對新的身體只差 1.17，兩塊會黏在一起。
                     提到差 2.03。 */
    m: '#C0CAD4', /* 短刃 198 */
    M: '#F2F5F9', /* 刃的反光 243 */
    g: '#7A8794', /* 刀鞘 138 */
    G: '#7A8794',
    '#': '#F2F5F9', o: '#3A2E1C', '*': '#F2F5F9'
  },
  idleA: ['................', '.....kkkkk......', '....khHHHk......', '....khsssk......',
    '....kkSkSk......', '.....khhk.......', '....kktTtkk.....', '...kcttTttk.kM..',
    '..kccttTttkkgk..', '.kcCcbbbbkgk....', '..kcc.tTt.k.....', '...k..tTt..k....',
    '......ktTk......', '.....kbbbbk.....', '.....kb..bk.....', '.....kk..kk.....'],
  idleB: ['................', '................', '.....kkkkk......', '....khHHHk......',
    '....khsssk......', '....kkSkSk......', '.....khhk.......', '....kktTtkk.kM..',
    '...kcttTttk.kgk.', '..kccttTttkgk...', '.kcCcbbbbkk.....', '..kcc.tTt..k....',
    '...k..tTt.......', '.....kbbbbk.....', '.....kb..bk.....', '.....kk..kk.....'],
  walkA: ['................', '.....kkkkk......', '....khHHHk......', '....khsssk......',
    '....kkSkSk......', '.....khhk.......', '..ckktTtkk..kM..', '.cCcktTtTtk.kgk.',
    'cCccttTTtkkgk...', '.cCckbbbbkk.....', '..cc..tTt..k....', '...k..tTt...k...',
    '......ktTk......', '.....kbk.kbk....', '....kbk...kbk...', '...kkk.....kkk..'],
  walkB: ['.....kkkkk......', '....khHHHk......', '....khsssk......', '....kkSkSk......',
    '.....khhk.......', '....kktTtkk..kM.', '...kcttTttk.kgk.', '..kccttTttkgk...',
    '.kcCcbbbbkk.....', '..kcc.tTt..k....', '...k..tTt...k...', '......ktTk......',
    '.....kbbbbk.....', '.....kb..bk.....', '.....kk..kk.....', '................'],
  sitA: ['................', '................', '................', '......kkkkk.....',
    '.....khHHHk.....', '.....khsssk.....', '.....kkSkSk.....', '....kkhtTtkk....',
    '...kcttTTTtk....', '..kcCttTTTtk....', '..kcCtbbbbtk....', '.kbbbk.ktTk.....',
    'kbk.....ktk.....', 'kk..kgk.kbbk....', '....kMk..kkk....', '.....k..........'],
  sitB: ['................', '................', '................', '................',
    '......kkkkk.....', '.....khHHHk.....', '.....khsssk.....', '.....kkSkSk.....',
    '...kkhtTTtkk....', '..kcttTTTTtk....', '..kcCtbbbbtk....', '.kbbbk.ktTk.....',
    'kbk.....ktk.....', 'kk..kgk.kbbk....', '....kMk..kkk....', '.....k..........'],
  /* 躺著。骨架跟另外三位一樣，見 11-world.js 的 HERO.sleep。 */
  sleep: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.............z..',
    '...........z....',
    '........zZ......',
    '................',
    '..........kkkk..',
    '...kkkk..kbTTbk.',
    '..kHhhhk.ktTTtk.',
    '..khssscCTTttTk.',
    '..khssscttttTbk.',
    '..kkkkkkkkkkkkk.'
  ],
  back: ['................', '.....kkkkk......', '....khHHHk......', '....khhhhk......',
    '....khhhhk......', '.....kkkk.......', '...kkttttkk.....', '..kttttttk.kM...',
    '..ktttMttkkgk...', '..kttkMkttk.....', '..ktt.kgk.tk....', '...k..ktk..k....',
    '......ktk.......', '.....kbbbbk.....', '.....kb..bk.....', '.....kk..kk.....'],
  swing: ['.........kMMk...', '.....kkkkkMMk...', '....khHHHkMk....', '....khssskMk....',
    '....kkSkSkk.....', '.....khhk.......', '....kktTtkk.....', '...kcttTttk.....',
    '..kccttTttk.....', '.kcCcbbbbkk.....', '..kcc.tTt.......', '...k..tTt...k...',
    '.....ktTkk..k...', '....kbk.kbbk....', '...kbk....kbk...', '..kkk......kkk..'],
  dash: ['................', '..~~..kkkkk.....', '.~~~.khHHHk.....', '~~~..khsssk.....',
    '.~~~.kkSkSk.....', '..~~..khhk......', '.~~.kktTtkk.kM..', '~~.kcttTttk.kgk.',
    '.~kccttTttkkgk..', '..kcCcbbbbkk....', '...kcc.tTt..k...', '....k..tTt.k....',
    '.......ktTk.....', '.....kbk..kbk...', '...kbk......kbk.', '..kkk........kk.'],
  win: ['.kMk.......kMk..', '.kMk..kkk..kMk..', '.kgk.khHHk.kgk..', '..k..khssk..k...',
    '.....kkSkSk.....', '......khhk......', '...kkkctTckk....', '...kcCttTTck....',
    '..kcCcttTTck....', '...kcbbbbbck....', '.....ctTTc......', '.....cttTc......',
    '.....ktTk.......', '....kbbbbk......', '....kb..bk......', '....kk..kk......'],
  pant: ['................', '................', '................', '.....kkkkk......',
    '....khHHHk......', '....khsssk......', '....kkSkSk......', '..kkkhhtTtkk....',
    '.kcCcttTTtk.....', '.kcCcttTTtkk....', '.kcck bbbbbkk...', '..kk.ktTk..k....',
    '.kMk.ktTk..k....', 'kgk..kbbbbk.....', '.kk..kb..bk.....', '.....kk..kk.....'],
  flee: ['................', '......kkkkk.....', '.....khHHHk.....', '.....ksssHk.....',
    '.....kSkSkk.....', '......khhk......', '....kkktTtk.....', '...cCckttTtk....',
    '..cCcckttTtk....', '.cCccckbbbkk....', '..ccc..tTt......', '...c...tTt......',
    '.......ktTk.....', '....kbk..kbk....', '...kbk.....kbk..', '..kkk.......kkk.']
};

/* ---------- 騎士 ----------
   最寬的一個。頭盔上一撮羽飾（c），左手一整面盾（t/T 的方塊）——
   盾是這四種裡唯一一塊實心的方形，遠看就是它。護肩讓上半身比
   別人寬兩格。 */
HEROES.knight = {
  pal: {
    k: '#14110C',   /* 輪廓 */
    s: '#E8B98A',   /* 面甲縫裡的臉 192 */
    S: '#A8724A',   /* 122 */
    h: '#8A94A0',   /* 頭盔 150 */
    H: '#EAF0F6',   /* 頭盔受光 236 */
    c: '#A83636',   /* 羽飾 78 */
    C: '#DC6450',   /* 羽飾受光 130 */
    t: '#26384F',   /* 盾面 52。本來 72，跟羽飾 83 同一階 */
    T: '#4A6FA8',   /* 盾面受光 107 */
    b: '#3A2E1C',   /* 皮帶 46 */
    m: '#5E6874',   /* 鎧甲的陰影面 100。本來 163——跟頭盔同一個色碼，
                       所以整身盔甲從頭到腳沒有一個暗面，遠看是一團白 */
    M: '#C4CDD6',   /* 鎧甲受光 205 */
    g: '#C4CDD6',   /* 劍 */
    G: '#EAF0F6',   /* 刃口 */
    '#': '#EAF0F6', o: '#3A2E1C', '*': '#EAF0F6'
  },
  idleA: ['......kck.......', '.....kcCk.......', '....kkhHhkk.....', '....khHHHhk.....',
    '....khsssHk.....', '....kkhhhkk.....', '..kkmmMMmmkk....', '.kttkmMMmkkGk...',
    'kTTTtkmMmk.kgk..', 'kTTTtkbbbk.kgk..', 'kTTTtkmMmk.kgk..', '.kttkkmMmkk.k...',
    '..kk..kmMk......', '.....kbbbbk.....', '.....kb..bk.....', '.....kk..kk.....'],
  idleB: ['................', '......kck.......', '.....kcCk.......', '....kkhHhkk.....',
    '....khHHHhk.....', '....khsssHk.....', '....kkhhhkk.....', '..kkmmMMmmkk....',
    '.kttkmMMmkk.Gk..', 'kTTTtkmMmk.kgk..', 'kTTTtkbbbk.kgk..', 'kTTTtkmMmk..k...',
    '.kttkkmMmkk.....', '.....kbbbbk.....', '.....kb..bk.....', '.....kk..kk.....'],
  walkA: ['......kck.......', '.....kcCk.......', '....kkhHhkk.....', '....khHHHhk.....',
    '....khsssHk.....', '....kkhhhkk.....', '..kkmmMMmmkk....', '.kttkmMMmkkGk...',
    'kTTTtkmMmk.kgk..', 'kTTTtkbbbk.kgk..', 'kTTTtkmMmk.kgk..', '.kttkkmMmkk.k...',
    '..kk..kmMk......', '.....kbk.kbk....', '....kbk...kbk...', '...kkk.....kkk..'],
  walkB: ['......kck.......', '.....kcCk.......', '....kkhHhkk.....', '....khHHHhk.....',
    '....khsssHk.....', '....kkhhhkk.....', '..kkmmMMmmkk.Gk.', '.kttkmMMmkk.kgk.',
    'kTTTtkmMmk..kgk.', 'kTTTtkbbbk..kgk.', 'kTTTtkmMmk...k..', '.kttkkmMmkk.....',
    '..kk..kmMk......', '.....kbbbbk.....', '.....kk..kk.....', '................'],
  sitA: ['................', '................', '.......kck......', '......kcCk......',
    '.....kkhHhkk....', '.....khHHHhk....', '.....khsssHk....', '....kkkhhhkkk...',
    '...kttkmMMmk....', '..kTTTtmMMmk....', '..kTTTtbbbbk....', '.kbttk.kmMk.....',
    'kbk.....kmk.....', 'kk..kgk.kbbk....', '....kGk..kkk....', '.....k..........'],
  sitB: ['................', '................', '................', '.......kck......',
    '......kcCk......', '.....kkhHhkk....', '.....khHHHhk....', '.....khsssHk....',
    '...kkkkhhhkkk...', '..kttkmMMMmk....', '..kTTTtbbbbk....', '.kbttk.kmMk.....',
    'kbk.....kmk.....', 'kk..kgk.kbbk....', '....kGk..kkk....', '.....k..........'],
  /* 躺著。骨架跟另外三位一樣，見 11-world.js 的 HERO.sleep。 */
  sleep: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.............z..',
    '...........z....',
    '........zZ......',
    '................',
    '..........kkkk..',
    '...kkkk..kbMMbk.',
    '..kHhhhk.kmMMmk.',
    '..khssscMMMmmMk.',
    '..khssscmMmmmbk.',
    '..kkkkkkkkkkkkk.'
  ],
  back: ['......kck.......', '.....kcCk.......', '....kkhhhkk.....', '....khhhhhk.....',
    '....khhhhhk.....', '....kkhhhkk.....', '..kkmmmmmmkk....', '.kttkmmmmkkGk...',
    'kTTTtmmgmm.kgk..', 'kTTTtmkgkm.kgk..', 'kTTTtmkgkm.kgk..', '.kttkkmkmkk.k...',
    '..kk..kmmk......', '.....kbbbbk.....', '.....kb..bk.....', '.....kk..kk.....'],
  swing: ['.........kGGk...', '......kck.kGk...', '.....kcCkkGk....', '....kkhHhkGk....',
    '....khHHHhk.....', '....khsssHk.....', '..kkkkhhhkk.....', '.kttkmMMmkk.....',
    'kTTTtkmMmkk.....', 'kTTTtkbbbk......', 'kTTTtkmMmk......', '.kttkkmMmkk.k...',
    '..kk..kmMkk.k...', '....kbk.kbbk....', '...kbk....kbk...', '..kkk......kkk..'],
  dash: ['................', '..~~..kck.......', '.~~~.kcCk.......', '~~~.kkhHhkk.....',
    '.~~~khHHHhk.....', '..~~khsssHk.....', '.~kkkkhhhkkk....', '~~kttkmMMmkkGk..',
    '.kTTTtkmMmk.kgk.', '.kTTTtkbbbk.kgk.', '.kTTTtkmMmk.kgk.', '..kttkkmMmkk.k..',
    '...kk..kmMk.....', '.....kbk..kbk...', '...kbk......kbk.', '..kkk........kk.'],
  win: ['.kGk...kck.kGk..', '.kgk..kcCk.kgk..', '.kgk.kkhHhkkgk..', '..k..khHHHhk.k..',
    '.....khsssHk....', '.....kkhhhkk....', '..kkkmmMMmmkk...', '.kttkmMMMMmk....',
    'kTTTtkmMMmkk....', 'kTTTtkbbbbk.....', 'kTTTtkmMMmk.....', '.kttkkmMMmk.....',
    '..kk..kmMmk.....', '.....kbbbbk.....', '.....kb..bk.....', '.....kk..kk.....'],
  pant: ['................', '................', '................', '......kck.......',
    '.....kcCk.......', '....kkhHhkk.....', '....khHHHhk.....', '....khsssHk.....',
    '..kkkkhhhkkk....', '.kttkmMMMMmk....', '.kTTTtbbbbbkk...', '.kttk.kmMk..k...',
    '.kGk..kmMk..k...', 'kgk..kbbbbk.....', '.kk..kb..bk.....', '.....kk..kk.....'],
  flee: ['................', '.......kck......', '......kcCk......', '.....kkhHhkk....',
    '.....khHHHhk....', '.....khsssHk....', '......kkhhhkk...', '....kkkmMMmk....',
    '...cCckmMMmk....', '..cCcckbbbbk....', '...ccc.kmMk.....', '....c..kmMk.....',
    '.......kmMk.....', '....kbk..kbk....', '...kbk.....kbk..', '..kkk.......kkk.']
};

/* 每一種都補一個 idle 別名，跟 HERO 一樣——
   剖面圖與戰鬥那兩支讀的是 .idle。 */
Object.keys(HEROES).forEach(function (k) {
  HEROES[k].idle = HEROES[k].idleA;
});

/* 四個名字。挑角色那一頁與首頁的換角都讀這一份。

   那一句寫的是脾氣，不是外表。外表已經在圖上了——四種的剪影本來
   就不一樣，再用字描述一次是同一件事說兩遍。而他挑的其實不是一件
   斗篷，是一種「我是怎麼做事的人」。 */
var HERO_LIST = [
  { k: 'adv',    n: '冒險者',
    t: '對處處充滿好奇，期望在這場冒險找到前所未見的大秘寶' },
  { k: 'mage',   n: '魔法師',
    t: '有著無窮知識擅長詠唱魔法，將事情處理的有條理' },
  { k: 'ninja',  n: '忍者',
    t: '行動迅速，往往決定行動只是一瞬間的念頭' },
  { k: 'knight', n: '騎士',
    t: '對自己充滿戒律，對事情怎麼處理有一套自己的堅持' }
];

/* 現在畫的是哪一個。render 每一次開頭都會照登入的人設一次
   （見 55-ui.js 的 useHero），所以其餘二十幾個讀 HERO 的地方
   一個字都不用改。 */
function heroKey(u) {
  var k = u && u.hero;
  return HEROES[k] ? k : 'adv';
}
function heroOf(u) { return HEROES[heroKey(u)]; }

/* ---------- 他偶爾會說一句 ----------

   使用者要角色時不時冒一句 OS，而且要照職業與「在走還是在休息」分。

   三條規矩，比寫哪些句子重要：

   一 · 不評價。一句都不會提到他做得怎麼樣、走得快不快、該不該加把勁。
        這個系統只判兩個數字，而那兩個數字不需要一個角色在旁邊幫腔。
        說的是他自己的脾氣，跟他腳下這個地方。

   二 · 不佔新的位置。它借的是角色頭上那一塊牌子（.hero-tag）——
        本來寫「前進中」，說話的時候換成那一句，說完換回來。
        一個位置兩種內容，所以它在結構上不可能跟別的字疊到。

   三 · 不吵。隔十幾二十秒才一句，說四秒。每一次挑的那一句不重複
        上一句（見 osTick）。

   走跟坐分開寫：走的時候他在看路，坐的時候他在想事情。 */
var HERO_OS = {
  adv: {
    rest: ['一大場冒險後好好休息真是舒服。'],
    walk: ['每次的冒險都令人感到興奮!',
           '各種困難都難不了我!',
           '又是沒看過的新風景!'],
         over: ['這條路比我想的長，不過風景也更多了。', '看來這一趟沒那麼簡單啊!']
  },
  mage: {
    rest: ['即使正在休息也是可以學習的好機會。'],
    walk: ['好多未曾接觸的新知識。',
           '我思，故我在。',
           '看來我還有很多可以去學習的呢…'],
         over: ['看來我的估算需要修正。', '時間比我預期的走得快一些。']
  },
  ninja: {
    rest: ['正在充分休息，是也。'],
    walk: ['全力衝刺中，是也。',
           '忍術，想到的事情就立刻做之術!',
           '忍術，事情不嫌麻煩之術!'],
         over: ['比預定的久了，是也。', '再快一點，是也!']
  },
  knight: {
    rest: ['旅程中保持健康也是很重要的。'],
    walk: ['所謂的規矩是自己訂的。',
           '我的誓約便是任何挑戰都不臨陣脫逃。',
           '一步一步來才不會出錯。'],
         over: ['說出口的日子過了。我會走完。', '慢，但不會停。']
  }
};

/* 挑一句。不重複上一句——同一句連著出現兩次，那個角色就像壞掉的錄音。 */
var OS_LAST = '';
/* mode：'walk' 前進、'rest' 休息、'over' 過了自己說的那幾天。
   收布林是舊的呼叫方式，留著。 */
function heroLine(u, mode) {
  var k = heroKey(u);
  if (mode === true) mode = 'walk';
  else if (mode === false || !mode) mode = 'rest';
  var box = HERO_OS[k] || HERO_OS.adv;
  var a = box[mode] || box.walk || [];
  if (a.length < 2) return a[0] || '';
  var s = '';
  for (var i = 0; i < 8; i++) {
    s = a[Math.floor(Math.random() * a.length)];
    if (s !== OS_LAST) break;
  }
  OS_LAST = s;
  return s;
}
