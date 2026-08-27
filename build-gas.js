const fs = require('fs');

/* Logic.html：原型邏輯，僅補一個空班級時的 me 後備，避免 renderVals 崩潰 */
let logic = fs.readFileSync('build_logic.txt', 'utf8').trim();
const ME_OLD = "me = this.teams().find(t => t.me) || this.KLASSES[0].teams[2];";
const ME_NEW = "me = this.teams().find(t => t.me) || this.KLASSES[0].teams[2] || { id: '', name: '', weeks: 1, layer: 1, passed: [] };";
if (logic.indexOf(ME_OLD) < 0) { console.error('MISS me fallback'); process.exit(1); }
logic = logic.split(ME_OLD).join(ME_NEW);
fs.writeFileSync('gas/Logic.html', '<script>\n' + logic + '\n</script>\n');

/* Template.html：patched live 模板 */
const tpl = fs.readFileSync('build_tpl_live.txt', 'utf8').trim();
fs.writeFileSync('gas/Template.html', '<template id="jlz-tpl">\n' + tpl + '\n</template>\n');

/* preview/index.html：內聯全部 include ＋ 注入 mock 後端 */
let idx = fs.readFileSync('gas/Index.html', 'utf8');
idx = idx.replace(/<\?!=\s*include\('([^']+)'\);?\s*\?>/g, (m, n) => fs.readFileSync('gas/' + n + '.html', 'utf8'));
const mock = '<script>\n' + fs.readFileSync('preview/mock-gas.js', 'utf8') + '\n</script>\n';
const LIVEMARK = '<' + 'script>\n/* ============================================================\n   逐層掘進 · 實際使用版整合層';
if (idx.indexOf(LIVEMARK) < 0) { console.error('MISS live marker'); process.exit(1); }
idx = idx.replace(LIVEMARK, mock + LIVEMARK);
idx = idx.replace('</body>', '<' + 'script src="/preview/dev/seed.js"></' + 'script>' + String.fromCharCode(10) + '</body>');
fs.writeFileSync('preview/index.html', idx);
console.log('built: Logic.html', fs.statSync('gas/Logic.html').size,
            '| Template.html', fs.statSync('gas/Template.html').size,
            '| preview', fs.statSync('preview/index.html').size);
