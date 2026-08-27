/* 把我自己加的說明性長句從 11px 提到 22px（Cubic 11 的整數倍格，不會糊）。
   只動 patch-tpl.js 裡我寫的區塊，不碰原型自己的排版。 */
const fs = require('fs');
let s = fs.readFileSync('patch-tpl.js', 'utf8');
let hit = 0, miss = [];

const bump = (marker) => {
  // marker 是該行裡獨一無二的一段字，找到後把該行的 11px/1.x 換成 22px/1.6
  const lines = s.split('\n');
  let done = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(marker) && /font:\s*400 11px\/1\.[0-9]/.test(lines[i])) {
      lines[i] = lines[i].replace(/font:\s*400 11px\/1\.[0-9]/g, 'font:400 22px/1.6');
      done = true;
    }
  }
  if (done) { s = lines.join('\n'); hit++; } else miss.push(marker);
};

[
  '{{ b.note }}',              // 採集進度：兩條說明
  '{{ n.t }}',                 // 工具校準：三行說明
  '{{ c.rewardNote }}',        // （若存在）
  '{{ t.rewardNote }}',
  '{{ openReward.rewardNote }}',
  '{{ uploadHint }}',          // 上傳說明
  '{{ selfHint }}',            // T-06 給老師的提示
  '{{ ganttHowTo }}',          // 甘特操作說明
  '同一組的人要加入同一支小隊',   // C-04 說明
  '你的名字會自動掛在這支小隊上'  // C-04 名字說明
].forEach(bump);

// reward block 是用函式產生的，單獨處理
s = s.replace(
  /'\s*<span style="display:block;font:400 11px\/1\.7 \\'C11\\';color:#6E665A;margin-top:4px;text-wrap:pretty">\{\{ ' \+ v \+ '\.rewardNote \}\}<\/span>',/g,
  "'                                <span style=\"display:block;font:400 22px/1.6 \\'C11\\';color:#6E665A;margin-top:6px;text-wrap:pretty\">{{ ' + v + '.rewardNote }}</span>',"
);

fs.writeFileSync('patch-tpl.js', s);
console.log('bumped:', hit, 'missed:', miss.join(' | ') || '(none)');
