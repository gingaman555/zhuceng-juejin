/* 把三個新職業的像素圖寫進 v2/src/12-jobs-art.js。跑：node art/export.js

   職業的圖是用程式「疊層」畫的（身體、老鷹、弓……各一層，見 ranger.js 等），
   不是一張一張手打。改圖請改這裡的原始檔、重新跑這一支，不要直接改產出的檔案——
   下一次重跑就會被蓋掉。 */
const fs = require('fs');
const path = require('path');
const POSES = ['idleA', 'idleB', 'walkA', 'walkB', 'sitA', 'sitB', 'sleep', 'back', 'swing', 'dash', 'win', 'pant', 'flee'];
const JOBS = [
  ['ranger', '遊俠', '苔綠兜帽斗篷、背長弓，左肩蹲著一隻老鷹（會飛出去）。'],
  ['bard', '吟遊詩人', '寬簷帽加洋紅長羽毛、青綠外套、胸前橫著一把魯特琴（揮擊是撥出音符）。'],
  ['monk', '武僧', '光頭加白頭帶、藏紅僧袍、酒紅腰帶、念珠、赤腳、空手（揮擊是一拳加衝擊波）。']
];
let out = '/* 三個可以用水晶換的職業的像素圖：遊俠、吟遊詩人、武僧。\n\n' +
  '   **這個檔是 node art/export.js 產出的，不要直接改。**原始畫法在 v2/art/（用疊層畫的）。\n\n' +
  '   規矩跟 12-heroes.js 的四個一樣：16×16、光從左上來、輪廓一律近黑、13 個姿勢\n' +
  '   （站 2、走 2、坐 2、睡、背影、揮擊、衝刺、贏、喘、逃）。剪影各自不同：\n' +
  '     遊俠　　　弓比頭高、肩上一隻鷹\n' +
  '     吟遊詩人　帽簷比頭寬、胸前一把琴\n' +
  '     武僧　　　圓頭、寬袖、下寬上窄、沒有武器\n' +
  '   怎麼用（解鎖、挑選）見 12-jobs.js。 */\n\n';
JOBS.forEach(([key, name, note]) => {
  const m = require('./' + key + '.js');
  out += '/* ---------- ' + name + ' ----------\n   ' + note + ' */\n';
  out += 'HEROES.' + key + ' = {\n  pal: {\n';
  const keys = Object.keys(m.PAL);
  out += keys.map(k => "    '" + k.replace(/'/g, "\'") + "': '" + m.PAL[k] + "'").join(',\n') + '\n  },\n';
  POSES.forEach((p, i) => {
    out += '  ' + p + ': [\n' + m.frames[p].map(r => "    '" + r + "'").join(',\n') + '\n  ]' + (i < POSES.length - 1 ? ',' : '') + '\n';
  });
  out += '};\nHEROES.' + key + '.idle = HEROES.' + key + '.idleA;\n\n';
});
fs.writeFileSync(path.join(__dirname, '..', 'src', '12-jobs-art.js'), out);
console.log('寫好了：v2/src/12-jobs-art.js', Math.round(out.length / 1024) + 'KB');
