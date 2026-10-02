/* 吟遊詩人：16×16，光從左上來，輪廓 k。
   寬簷帽（簷比頭寬）＋一根向後捲起的洋紅長羽毛、青綠外套、金色領口、胸前橫著一把魯特琴。
   13 個姿勢：站 2、走 2、坐 2、睡、背影、揮擊（彈出音符）、衝刺、贏、喘、逃。 */
const PAL = {
  k: '#12100F',                          /* 輪廓 */
  s: '#E8B98A', S: '#A8724A',            /* 皮膚、陰影 */
  H: '#2B7F78', h: '#4FB5AB',            /* 帽子：深青、受光 */
  c: '#2FA39A', C: '#7FD8CC',            /* 外套：青綠、受光 */
  g: '#F0C45A',                          /* 金：領口、帽帶、琴弦 */
  r: '#D9487A', R: '#F08AAE',            /* 羽毛：洋紅、受光 */
  n: '#3B3F6B',                          /* 褲子 */
  b: '#6B4A2B',                          /* 靴子、腰帶 */
  m: '#B8803F', M: '#E3B66E',            /* 琴身：暖木、受光 */
  d: '#5A3A1E',                          /* 琴頸 */
  '#': '#F2F5F9', o: '#6B5A3A', '*': '#F2F5F9', '~': '#F08AAE'
};

function compose(layers) {
  const g = Array.from({ length: 16 }, () => Array(16).fill('.'));
  layers.forEach(({ px, x = 0, y = 0 }) => px.forEach((row, j) => [...row].forEach((ch, i) => {
    const X = x + i, Y = y + j;
    if (ch !== '.' && X >= 0 && X < 16 && Y >= 0 && Y < 16) g[Y][X] = ch;
  })));
  return g.map(r => r.join(''));
}

/* 頭：寬簷帽、羽毛從帽帶往右後方捲起、臉。第 0–6 列。 */
const HEAD = [
  '..........rrR...',
  '.....kkkkkkRr...',
  '....kHhHHHkgr...',
  '..kkkHHHHHHkkk..',
  '.kHHHkkkkkkHHHk.',
  '....ks.ss.k.....',
  '....kSSSSSk.....'
];
/* 軀幹：外套、金領口、腰帶。 */
const TORSO = [
  '...kkgCCCgkk....',
  '..kccCcccCcck...',
  '..kccccccccck...',
  '...kcccccccck...',
  '...kbbbbbbbbk...'
];
const LEGS_STAND = [
  '...kccnnnnccK...'.replace('K', 'k'),
  '....knn..nnk....',
  '....kbb..bbk....',
  '....kkk..kkk....'
];
const LEGS_WALK_A = [
  '...kccnnnncck...',
  '..knn....nnk....',
  '.kbbk....knnk...',
  '.kkk.....kbbk...',
  '..........kkk...'
];
const LEGS_WALK_B = [
  '....knn..nnk....',
  '....kbbbbbbk....',
  '....kbbbbbbk....',
  '....kkkkkkkk....'
];

/* 魯特琴：圓肚在左下（有音孔），琴頸從胸前斜斜往右上、繞過臉的右邊，琴頭一個小方塊。
   用程式畫（不是手打）：琴頸是一條斜線，輪廓自動補在四周。 */
function makeLute() {
  const g = Array.from({ length: 16 }, () => Array(16).fill('.'));
  const body = [
    '..kkkkk.', '.kmMMMmk', 'kmMkkkMm', 'kmMkgkMm', 'kmMkkkMm', '.kmMMMmk', '..kkkkk.'
  ];
  const neck = [[8, 11], [9, 10], [10, 9], [11, 8], [12, 7], [13, 6]];
  const head = [[14, 5], [14, 6]];
  const put = (x, y, ch) => { if (x >= 0 && x < 16 && y >= 0 && y < 16) g[y][x] = ch; };
  neck.forEach(([x, y]) => put(x, y, 'd'));
  head.forEach(([x, y]) => put(x, y, 'm'));
  /* 輪廓：琴頸與琴頭四周補黑 */
  neck.concat(head).forEach(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].forEach(([dx, dy]) => {
    if (g[y + dy] && g[y + dy][x + dx] === '.') g[y + dy][x + dx] = 'k';
  }));
  body.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') put(i, 9 + j, ch); }));
  return g.map(r => r.join(''));
}
const LUTE = makeLute();
/* 琴背在身後（背影用）。 */
const LUTE_BACK = [
  '..kkkk..........',
  '.kmmMmk.........',
  'kmmMMmmk........',
  'kmmMMmmk........',
  '.kmmmmk.........',
  '..kkkk..........'
];

const idleA = compose([
  { px: HEAD, x: 1 }, { px: TORSO, x: 1, y: 7 }, { px: LEGS_STAND, x: 1, y: 12 }, { px: LUTE, x: 0, y: 0 }
]);
const idleB = compose([
  { px: HEAD, x: 1, y: 1 }, { px: TORSO, x: 1, y: 8 }, { px: LEGS_STAND.slice(1), x: 1, y: 13 }, { px: LUTE, x: 0, y: 1 }
]);
const walkA = compose([
  { px: HEAD, x: 1 }, { px: TORSO, x: 1, y: 7 }, { px: LEGS_WALK_A, x: 1, y: 11 }, { px: LUTE, x: 0, y: 0 }
]);
const walkB = compose([
  { px: HEAD, x: 1 }, { px: TORSO, x: 1, y: 7 }, { px: LEGS_WALK_B, x: 1, y: 12 }, { px: LUTE, x: 0, y: -1 }
]);

/* 坐：盤腿，琴橫放腿上，低頭調音。 */
const SIT_LEGS = [
  '..kbbbbbbbbk....',
  '.knnbbbbbbnnk...',
  '.kkbbbkkbbbkk...',
  '...kkk..kkk.....'
];
const sitA = compose([
  { px: HEAD, x: 1, y: 3 }, { px: TORSO.slice(0, 3), x: 1, y: 10 }, { px: SIT_LEGS, x: 1, y: 12 }, { px: LUTE, x: 0, y: 1 }
]);
const sitB = compose([
  { px: HEAD, x: 1, y: 4 }, { px: TORSO.slice(0, 2), x: 1, y: 11 }, { px: SIT_LEGS, x: 1, y: 12 }, { px: LUTE, x: 0, y: 1 }
]);

/* 睡：側躺，帽子蓋在臉上，雙手抱著琴。 */
const sleep = compose([
  { px: ['..........zZ....', '........zZ......', '......zZ........'], x: 0, y: 3 },
  { px: [
    '..kkkkkkk.......',
    '.kHHHhHHHk......',
    'kHHHkkkkHHkkkkk.',
    '.kkkcCcckkcccck.',
    '..kcccgcccccnnk.',
    '..kmMMmkcccnnbk.',
    '..kmkgmkbbbbbbk.',
    '..kkmmkkkkkkkk..'
  ], x: 0, y: 8 }
]);

/* 背影：帽子後面、羽毛、外套背面，琴背在身後露出圓肚。 */
const BACK = [
  '..........rrR...',
  '.....kkkkkkRr...',
  '....kHhHHHkr....',
  '..kkkHHHHHHkkk..',
  '.kHHHkkkkkkHHHk.',
  '.....kSSSSk.....',
  '...kkcccccckk...',
  '..kcccCCCcccck..',
  '..kccccccccck...',
  '...kcccccccck...',
  '...kbbbbbbbbk...',
  '...kccnnnnccK...'.replace('K', 'k'),
  '....knn..nnk....',
  '....kbb..bbk....',
  '....kkk..kkk....',
  '................'
];
const back = compose([{ px: BACK, x: 1 }, { px: LUTE_BACK, x: 5, y: 7 }]);

/* 音符：一個八分音符（金）、一個兩連音符（洋紅）。 */
const NOTE_G = ['..kk', '..kg', '.kgk', 'kgk.', 'kk..'].map(r => r.padEnd(4, '.'));
const NOTE_R = ['..kkkk', '..kRrk', '..k..k', '.kRk.k', 'kRrk.k'.slice(0, 6), 'kk.kk.'];

/* 揮擊：撥弦，一串音符往右飛出去。 */
const swing = compose([
  { px: HEAD, x: 1 }, { px: TORSO, x: 1, y: 7 }, { px: LEGS_STAND, x: 1, y: 12 }, { px: LUTE, x: 0, y: 0 },
  { px: NOTE_G, x: 12, y: 1 }, { px: NOTE_R, x: 10, y: 8 }
]);

/* 衝刺：往右傾，羽毛往後飛，音符在身後拖成一條線。 */
const DASH = [
  '................',
  '..~~....kkkkk...',
  '.~~~...kHhHHHk..',
  '~~~..kkkHHHHHkkk',
  '.~~.kHHHkkkkkHHk',
  '..~~..ks.ss.k...',
  '.~~...kSSSSSk...',
  '~~...kkgCCCgkk..',
  '.~..kccCcccCck..',
  '...kcccccccck...',
  '...kbbbbbbbbk...',
  '...kccnnnncck...',
  '....knn...nnk...',
  '...kbbk....kbbk.',
  '..kbk........kbk',
  '..kk..........kk'
];
const dash = compose([{ px: DASH, x: 0 }, { px: LUTE_BACK, x: 5, y: 8 }]);

/* 贏：舉琴過頭，另一手伸向觀眾，帽子歪了、羽毛飛揚。 */
const WIN = [
  '.........rrR....',
  '........kkkkkRr.',
  '.......kHhHHHkr.',
  '......kkHHHHHkk.',
  '.....kHHkkkkkHHk',
  '......ks.ss.k...',
  '.kdk..kSSSSSk...',
  'kddk.kkgCCCgkk..',
  'kmmk.kccCcccck..',
  'kmmMk.kccccck...',
  '.kmmk.kbbbbbk...',
  '..kk.kkccnnck...',
  '.....knn..nnk...',
  '.....kbb..bbk...',
  '.....kkk..kkk...',
  '................'
];
const win = compose([{ px: WIN, x: 0 }]);

/* 喘：彎腰扶膝，帽子往後掉，琴垂在身前。 */
const PANT = [
  '................',
  '................',
  '..........rrR...',
  '.....kkkkkkRr...',
  '....kHhHHHkr....',
  '..kkkHHHHHHkkk..',
  '.kHHHkkkkkkHHHk.',
  '....ks.ss.k.....',
  '....kSSSSSk.....',
  '..kkkkgCCgkkk...',
  '.kccccCcccccck..',
  '.ksskbbbbbbkssk.',
  '..kk.kccnncck...',
  '....knn..nnk....',
  '....kbb..bbk....',
  '....kkk..kkk....'
];
const pant = compose([{ px: PANT, x: 0 }, { px: LUTE, x: 0, y: 1 }]);

/* 逃：抱著琴側身快跑，帽子飛了，羽毛往後飄。 */
const FLEE = [
  '................',
  '.......kkkkk....',
  '..rrR.kHhHHHk...',
  '...rRkkHHHHHkk..',
  '.....ks.ss.k....',
  '.....kSSSSSk....',
  '....kkgCCCgkk...',
  '...kccCcccCck...',
  '..kcccccccck....',
  '..kkbbbbbbk.....',
  '...kccnnncck....',
  '....knn..nnk....',
  '...kbbk...kbk...',
  '..kbk......kbk..',
  '..kk........kk..',
  '................'
];
const flee = compose([{ px: FLEE, x: 0 }, { px: LUTE, x: 0, y: 0 }]);

const frames = { idleA, idleB, walkA, walkB, sitA, sitB, sleep, back, swing, dash, win, pant, flee };
module.exports = { PAL, frames };
