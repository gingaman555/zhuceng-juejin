/* 遊俠：16×16，光從左上來，輪廓 k。
   三層疊起來：身體（斗篷兜帽）、老鷹（左肩）、長弓（右後方，比頭還高）。
   13 個姿勢：站 2、走 2、坐 2、睡、背影、揮擊、衝刺、贏、喘、逃。 */
const PAL = {
  k: '#10130E',                          /* 輪廓 */
  s: '#E8B98A', S: '#A8724A',            /* 皮膚、陰影 */
  c: '#5E9B52', C: '#9ACB7E',            /* 斗篷、兜帽：苔綠、受光 */
  t: '#B79C6B', T: '#D8C28F',            /* 上衣：米褐、受光 */
  b: '#7A5230',                          /* 皮革：腰帶、靴 */
  m: '#9A6B3A', M: '#C99A5E',            /* 弓：木色、受光 */
  r: '#C8473B',                          /* 帽羽、箭羽：紅 */
  g: '#EDE6C8',                          /* 弓弦、箭桿 */
  e: '#6B4A2B', E: '#9B7448',            /* 老鷹：身體、受光 */
  w: '#F2F0E6',                          /* 老鷹的白頭 */
  y: '#F2C14E',                          /* 老鷹的喙與爪 */
  '#': '#F2F5F9', o: '#6B5A3A', '*': '#F2F5F9'
};

/* 疊圖：後面的蓋住前面的；'.' 是透明。 */
function compose(layers) {
  const g = Array.from({ length: 16 }, () => Array(16).fill('.'));
  layers.forEach(({ px, x = 0, y = 0 }) => px.forEach((row, j) => [...row].forEach((ch, i) => {
    const X = x + i, Y = y + j;
    if (ch !== '.' && X >= 0 && X < 16 && Y >= 0 && Y < 16) g[Y][X] = ch;
  })));
  return g.map(r => r.join(''));
}

/* ───────── 身體零件（16 寬，頭在第 0–5 列） ───────── */
const HEAD = [
  '..........r.....',
  '.....kkkkkr.....',
  '....kcCCCck.....',
  '....kcsssck.....',
  '....kcs.sck.....',
  '.....kcSck......'
];
const TORSO = [
  '...kkcCCCckk....',
  '...kcctTtcck....',
  '...kcctTtcck....',
  '....kcctTcck....',
  '....kbbbbbbk....',
  '....kcctTcck....'
];
const LEGS_STAND = [
  '....kcc..cck....',
  '.....kb..bk.....',
  '.....kb..bk.....',
  '.....kk..kk.....'
];
const LEGS_WALK_A = [
  '...kcctTcck.....',
  '..kcc....cck....',
  '.kbck....kbk....',
  '.kbbk....kbbk...',
  '.kkk......kkk...'
];
const LEGS_WALK_B = [
  '....kcc..cck....',
  '.....kbbbbk.....',
  '.....kbbbbk.....',
  '.....kkkkkk.....'
];

/* 老鷹，蹲在左肩，面朝右。 */
const EAGLE = ['.kkk.', 'kwwyk', 'kwkwy', 'kEeek', '.kEek', '..kyk'];
const EAGLE_B = ['.kkk.', 'kwwwk', 'kwkwk', 'kEyek', '.kEek', '..kyk'];
/* 老鷹睡著：頭縮進身體。 */
const EAGLE_SLEEP = ['.kkkk.', 'kwwEek', 'kEeeek', '.kkkkk'];
/* 老鷹飛：翅膀上（A）、翅膀下（B）。 */
const EAGLE_FLY_A = [
  'k.......k',
  'kE.....Ek',
  'kEk.w.kEk',
  '.kEkwEkE.',
  '..kEyeEk.',
  '...kkkk..'
].map(r => r.padEnd(9, '.'));
const EAGLE_FLY_B = [
  '...kkk...',
  '..kwwyk..',
  '.kEeeeEk.',
  'kEEkkkEEk',
  'kE.....Ek',
  'k.......k'
];

/* 長弓：弦在左（貼著身體那邊）、弓背在右凸出去。 */
const BOW = [
  'm..', 'gM.', 'gM.', 'g.M', 'g.M', 'g.M', 'g.M', 'g.M', 'g.M', 'g.M', 'g.M', 'gm.', 'gm.', 'm..'
];
/* 拉滿的弓（揮擊）：弓在最右，弦被拉到臉旁，一支箭搭在弦上。 */
const BOW_DRAWN = [
  '..m.',
  '..Mm',
  '.gM.',
  'g.M.',
  'g.M.',
  'g.M.',
  'g.M.',
  '.gM.',
  '..Mm',
  '..m.'
];

/* 疊一個站姿：身體 + 老鷹 + 弓。 */
const stand = (legs, bodyY, eagle, eagleY, bowY = 0) => compose([
  { px: HEAD, x: 1, y: bodyY }, { px: TORSO, x: 1, y: bodyY + 6 }, { px: legs, x: 1, y: bodyY + 12 },
  { px: eagle, x: 0, y: eagleY }, { px: BOW, x: 13, y: bowY }
]);

const idleA = stand(LEGS_STAND, 0, EAGLE, 2);
const idleB = stand(LEGS_STAND, 1, EAGLE_B, 3);
const walkA = compose([
  { px: HEAD, x: 1 }, { px: TORSO, x: 1, y: 6 }, { px: LEGS_WALK_A, x: 1, y: 11 },
  { px: EAGLE, x: 0, y: 2 }, { px: BOW, x: 13 }
]);
const walkB = compose([
  { px: HEAD, x: 1, y: 0 }, { px: TORSO, x: 1, y: 6 }, { px: LEGS_WALK_B, x: 1, y: 11 },
  { px: EAGLE_B, x: 0, y: 1 }, { px: BOW, x: 13 }
]);

/* 坐：盤腿，弓倚在身旁。 */
const SIT_LEGS = [
  '..kbbbbbbbbk....',
  '.kbbcbbbbcbbk...',
  '.kkbbbkkbbbkk...',
  '...kkk..kkk.....'
];
const sitA = compose([
  { px: HEAD, x: 1, y: 3 }, { px: TORSO.slice(0, 3), x: 1, y: 9 }, { px: SIT_LEGS, x: 1, y: 12 },
  { px: EAGLE, x: 0, y: 5 }, { px: BOW, x: 13, y: 2 }
]);
const sitB = compose([
  { px: HEAD, x: 1, y: 4 }, { px: TORSO.slice(0, 2), x: 1, y: 10 }, { px: SIT_LEGS, x: 1, y: 12 },
  { px: EAGLE_B, x: 0, y: 6 }, { px: BOW, x: 13, y: 2 }
]);

/* 睡：側躺，斗篷蓋住，弓橫在腳邊，老鷹縮在肚子旁。 */
const sleep = compose([
  { px: [
    '..........zZ....',
    '........zZ......',
    '......zZ........'
  ], x: 0, y: 3 },
  { px: [
    '...kkkk.........',
    '..kcCCck........',
    '..kcsssckkkkkkk.',
    '..kcs.sCcccccck.',
    '..kcSSScccctcck.',
    '..kbbbbbbbbbbbk.',
    '...kkkkkkkkkkk..'
  ], x: 0, y: 8 },
  { px: EAGLE_SLEEP, x: 8, y: 6 },
  { px: ['mMMMMMMMMMMMMm'], x: 1, y: 15 }
]);

/* 背影：兜帽後面、斗篷、箭袋露出三根紅箭羽，弓斜在背上，老鷹回頭看。 */
const BACK = [
  '..........r.....',
  '.....kkkkk......',
  '....kcCCCck.....',
  '....kcCCCck.....',
  '....kcCCck......',
  '.....kkkk.......',
  '...kkcccckk.....',
  '..kcccccccck....',
  '..kcccbbcccck...',
  '..kccbrbrcck....',
  '..kcc.brb.ck....',
  '...k..kbk..k....',
  '......kck.......',
  '.....kbbbbk.....',
  '.....kb..bk.....',
  '.....kk..kk.....'
];
const back = compose([
  { px: BACK, x: 1 }, { px: EAGLE_B, x: 0, y: 2 }, { px: BOW, x: 13 }
]);

/* 揮擊：拉弓放箭。身體側向右，左臂伸出握弓，右手拉弦，老鷹從肩上起飛。 */
const SHOOT = [
  '................',
  '.....kkkkkr.....',
  '....kcCCCck.....',
  '....kcsssck.....',
  '....kcs.sck.....',
  '.....kcSck......',
  '...kkcCCCckk....',
  '...kcctTtcckgggr',
  '..kccctTtccgkkg.',
  '...kcctTtcck....',
  '....kbbbbbbk....',
  '....kcctTcck....',
  '....kcc..cck....',
  '.....kb..bk.....',
  '.....kb..bk.....',
  '.....kk..kk.....'
];
const swing = compose([
  { px: SHOOT, x: 0 }, { px: EAGLE_FLY_A, x: 0, y: 0 }, { px: BOW_DRAWN, x: 12, y: 3 }
]);

/* 衝刺：往右傾，斗篷往後飄，速度線，老鷹飛在前上方。 */
const DASH = [
  '................',
  '..~~..kkkkkr....',
  '.~~~.kcCCCck....',
  '~~~..kcsssck....',
  '.~~~..kcs.ck....',
  '..~~...kcSck....',
  '.~~.kkkcCCckk...',
  '~~.kccccctTck...',
  '.~kccccctTtck...',
  '..~kccckbbbkk...',
  '...kcc.kcctTc...',
  '....k..kcctck.k.',
  '.......ktTkkk...',
  '.....kbk..kbk...',
  '...kbk......kbk.',
  '..kkk........kk.'
];
const dash = compose([
  { px: DASH, x: 0 }, { px: EAGLE_FLY_B, x: 7, y: 0 }, { px: BOW, x: 13, y: 1 }
]);

/* 贏：右手高舉長弓、左拳舉起，老鷹在拳頭上方拍翅。 */
const ARM_L = [
  '................', '................', '................', '................', '................', '................',
  '..kss...........',
  '..kck...........',
  '..kck...........',
  '...kck..........'
];
const ARM_R = [
  '................', '................', '................', '................',
  '............kss.',
  '............kck.',
  '............kck.',
  '...........kck..',
  '..........kck...'
];
const win = compose([
  { px: HEAD, x: 1, y: 3 },
  { px: [TORSO[0], TORSO[1], TORSO[3], TORSO[4]], x: 1, y: 9 },
  { px: LEGS_STAND.slice(1), x: 1, y: 13 },
  { px: ARM_L, x: 0, y: 0 }, { px: ARM_R, x: 0, y: 0 },
  { px: EAGLE_FLY_A, x: 0, y: 0 }, { px: BOW, x: 13, y: 0 }
]);

/* 喘：低頭彎腰，兩手扶在膝蓋上，老鷹歪著頭看他。 */
const PANT = [
  '................',
  '................',
  '................',
  '................',
  '.....kkkkkr.....',
  '....kcCCCck.....',
  '....kcsssck.....',
  '....kcs.sck.....',
  '..kkkkcSckkk....',
  '.kccccctTtcccck.',
  '.kcccktTtkccck..',
  '.ksskbbbbbkssk..',
  '..kk.kcctck.kk..',
  '....kcc..cck....',
  '....kb....bk....',
  '....kk....kk....'
];
const pant = compose([
  { px: PANT, x: 1 }, { px: EAGLE_B, x: 0, y: 5 }, { px: BOW, x: 13, y: 3 }
]);

/* 逃：側身快跑，斗篷整個往後飄，老鷹在頭頂盤旋。 */
const FLEE = [
  '................',
  '......kkkkkr....',
  '.....kcCCCck....',
  '.....kcsssck....',
  '......kcs.ck....',
  '.......kcSck....',
  '....kkkkcCckk...',
  '...ccckcctTck...',
  '..ccccckcctTk...',
  '.cccccckbbbkk...',
  '..ccc..kcctTc...',
  '...c...kcctck...',
  '.......ktTkk....',
  '....kbk..kbk....',
  '...kbk.....kbk..',
  '..kkk.......kk..'
];
const flee = compose([
  { px: FLEE, x: 0 }, { px: EAGLE_FLY_A, x: 6, y: 0 }, { px: BOW, x: 13, y: 2 }
]);

const frames = { idleA, idleB, walkA, walkB, sitA, sitB, sleep, back, swing, dash, win, pant, flee };
module.exports = { PAL, RANGER_PAL: PAL, frames };
