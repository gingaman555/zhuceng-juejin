/* 武僧：16×16，光從左上來，輪廓 k。
   光頭＋白頭帶（尾巴會飄）、藏紅僧袍、酒紅腰帶、脖子上一串念珠、赤腳、空手。
   四種裡唯一不帶武器的；輪廓最乾淨：圓頭、寬袖、下半身梯形。
   13 個姿勢：站 2、走 2、坐 2、睡、背影、揮擊（一拳加衝擊波）、衝刺、贏、喘、逃。 */
const PAL = {
  k: '#14110C',                          /* 輪廓 */
  s: '#E8B98A', S: '#A8724A',            /* 皮膚、陰影（光頭、手、腳） */
  w: '#F2F0E6',                          /* 頭帶：白 */
  c: '#E0A030', C: '#F6D27A',            /* 僧袍：藏紅、受光 */
  t: '#B87A1E',                          /* 褲子：深一階的藏紅 */
  b: '#A33A47', B: '#D86A75',            /* 腰帶：酒紅、受光 */
  m: '#8A5A2B', M: '#C99A5E',            /* 念珠：木色 */
  g: '#FFF3D8', y: '#F2C14E',            /* 衝擊波、火花 */
  u: '#8FD3F2',                          /* 汗 */
  '#': '#F2F5F9', o: '#6B5A3A', '*': '#F2F5F9', '~': '#F6D27A'
};

function compose(layers) {
  const g = Array.from({ length: 16 }, () => Array(16).fill('.'));
  layers.forEach(({ px, x = 0, y = 0 }) => px.forEach((row, j) => [...row].forEach((ch, i) => {
    const X = x + i, Y = y + j;
    if (ch !== '.' && X >= 0 && X < 16 && Y >= 0 && Y < 16) g[Y][X] = ch;
  })));
  return g.map(r => r.join(''));
}

/* 頭：光頭、白頭帶（尾巴往右後方飄）、眼睛、下巴。第 0–5 列。 */
const HEAD = [
  '................',
  '.....kkkkk......',
  '....ksssssk.....',
  '....kwwwwwkww...',
  '....ks.ss.k.ww..',
  '.....ksssk......'
];
/* 軀幹：念珠、僧袍、雙手合十在胸前（站姿）、酒紅腰帶。第 6–11 列。 */
const TORSO = [
  '...kkmmmmmkk....',
  '..kccCmMmCcck...',
  '.kcccCkssCccck..',
  '.kccccksskcccck.',
  '..kccbbbbbbcck..',
  '...kcctbbtcck...'
];
const LEGS_STAND = [
  '...kttttttttk...',
  '..kttk....kttk..',
  '..ksk......ksk..',
  '..kkk......kkk..'
];
const LEGS_WALK_A = [
  '...kttttttk.....',
  '..kttk...kttk...',
  '.kttk.....ksk...',
  '.ksk......kkk...',
  '.kkk............'
];
const LEGS_WALK_B = [
  '...kttttttk.....',
  '....kttkttk.....',
  '....kskksk......',
  '....kkk.kkk.....'
];

const stand = (legs, y, legsY) => compose([
  { px: HEAD, x: 1, y }, { px: TORSO, x: 1, y: 6 + y }, { px: legs, x: 1, y: legsY }
]);
const idleA = stand(LEGS_STAND, 0, 12);
const idleB = compose([
  { px: HEAD, x: 1, y: 1 }, { px: TORSO, x: 1, y: 7 }, { px: LEGS_STAND.slice(1), x: 1, y: 13 }
]);
const walkA = compose([
  { px: HEAD, x: 1, y: 0 }, { px: TORSO, x: 1, y: 6 }, { px: LEGS_WALK_A.slice(1), x: 1, y: 11 }
]);
const walkB = compose([
  { px: HEAD, x: 1, y: 0 }, { px: TORSO, x: 1, y: 6 }, { px: LEGS_WALK_B, x: 1, y: 12 }
]);

/* 坐：蓮花坐，雙手合十。 */
const SIT_LEGS = [
  '..kkttttttttkk..',
  '.kttttkttkttttk.',
  '.ksskttttttkssk.',
  '..kkkkkkkkkkkk..'
];
const sitA = compose([
  { px: HEAD, x: 1, y: 3 }, { px: TORSO.slice(0, 5), x: 1, y: 9 }, { px: SIT_LEGS, x: 1, y: 12 }
]);
const sitB = compose([
  { px: HEAD, x: 1, y: 4 }, { px: TORSO.slice(0, 4), x: 1, y: 10 }, { px: SIT_LEGS, x: 1, y: 12 }
]);

/* 睡：側躺，頭帶尾巴垂在枕邊，念珠握在手裡。 */
const sleep = compose([
  { px: ['..........zZ....', '........zZ......', '......zZ........'], x: 0, y: 3 },
  { px: [
    '..kkkkk.........',
    '.kssssSkkkkkkk..',
    '.kwwwwwkccccccck',
    '.ks.ssSkcCCCCccck'.slice(0, 16),
    '..kssskkbbbbbcck',
    '..kmmmkccccttttk'.slice(0, 16),
    '...kkkkkkkkkkssk',
    '..............kk'
  ], x: 0, y: 8 }
]);

/* 背影：光頭後面、頭帶尾巴飄、僧袍背面、腰帶在背後打一個結。 */
const BACK = [
  '................',
  '.....kkkkk......',
  '....ksssssk.....',
  '....kwwwwwkww...',
  '....ksssSsk.ww..',
  '.....ksssk......',
  '...kkccccckk....',
  '..kccccccccck...',
  '.kcccccccccccck.',
  '.kcccccccccccck.',
  '..kccbbBBbbcck..',
  '...kcctbbtcck...',
  '...kttttttttk...',
  '..kttk....kttk..',
  '..ksk......ksk..',
  '..kkk......kkk..'
];
const back = compose([{ px: BACK, x: 1 }]);

/* 揮擊：一拳打出去，一圈一圈的衝擊波往右擴開。 */
const PUNCH = [
  '................',
  '.....kkkkk......',
  '....ksssssk.....',
  '....kwwwwwkww...',
  '....ks.ss.k.ww..',
  '.....ksssk......',
  '...kkmmmmmkk....',
  '..kccCmMmCcck...',
  '.kcccCkcccCcckkk',
  '.kccccksskccccss',
  '..kccbbbbbbckkkk',
  '...kcctbbtcck...',
  '...kttttttttk...',
  '..kttk....kttk..',
  '..ksk......ksk..',
  '..kkk......kkk..'
];
const swing = compose([
  { px: PUNCH, x: 0 },
  { px: [
    '..g..', '.g.g.', 'g...g', 'g...g', 'g...g', '.g.g.', '..g..'
  ].map(r => r.padEnd(5, '.')), x: 11, y: 6 }
]);

/* 衝刺：身體前傾，一拳在前，速度線在身後。 */
const DASH = [
  '................',
  '..~~....kkkkk...',
  '.~~~...ksssssk..',
  '~~~...kkwwwwwkww',
  '.~~..kks.ss.k.ww',
  '..~~...ksssk....',
  '.~~..kkmmmmkk...',
  '~~..kccCmMmCck..',
  '.~.kcccckkkcckkk',
  '...kcccckssckssk',
  '...kccbbbbbbkkkk',
  '...kcctbbtcck...',
  '....kttttttk....',
  '...kttk..kttk...',
  '..ksk......ksk..',
  '..kkk......kkk..'
];
const dash = compose([{ px: DASH, x: 0 }]);

/* 贏：雙拳舉過頭，頭帶尾巴飛揚。 */
const WIN = [
  '.kk..........kk.',
  '.kck........kck.',
  '.kck..kkkkk.kck.',
  '.kcck.ksssk.kcck',
  '..kck.kwwwk.kck.',
  '..kck.ks.sskkck.'.slice(0, 16),
  '...kkkkksskkkk..',
  '....kccmmmcck...',
  '...kcccCmMCccck.',
  '...kcccccccccck.',
  '....kccbbbbcck..',
  '.....kcbbbbck...',
  '....kttttttttk..',
  '...kttk....kttk.',
  '...ksk......ksk.',
  '...kkk......kkk.'
];
const win = compose([{ px: WIN, x: 0 }]);

/* 喘：彎腰、兩手扶膝、一滴汗。 */
const PANT = [
  '................',
  '................',
  '................',
  '.....kkkkk......',
  '....ksssssk.....',
  '....kwwwwwkww.u.',
  '....ks.ss.k.ww..',
  '..kkkkssskkk....',
  '.kccccmmmmcccck.',
  '.kcccCmMmCcccck.',
  '.ksskcbbbbcksck.'.slice(0, 16),
  '..kk.kctbtck.kk.',
  '....kttttttk....',
  '...kttk..kttk...',
  '...ksk....ksk...',
  '...kkk....kkk...'
];
const pant = compose([{ px: PANT, x: 0 }]);

/* 逃：側身快跑，僧袍飄起，一滴汗。 */
const FLEE = [
  '................',
  '......kkkkk.....',
  '.....ksssssk....',
  '.....kwwwwwkww..',
  '......ks.ss.k.u.',
  '.......ksssk....',
  '....kkkkmmmkk...',
  '...cccckmMmcck..',
  '..ccccccCmcCck..',
  '.cccccckbbbbck..',
  '..ccc..kcbbtck..',
  '...c...kttttk...',
  '.......kttk.....',
  '....kttk..ktk...',
  '...kskk....ksk..',
  '...kkk......kkk.'
];
const flee = compose([{ px: FLEE, x: 0 }]);

const frames = { idleA, idleB, walkA, walkB, sitA, sitB, sleep, back, swing, dash, win, pant, flee };
module.exports = { PAL, frames };
