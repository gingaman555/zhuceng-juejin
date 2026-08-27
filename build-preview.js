const fs=require('fs');
let idx=fs.readFileSync('gas/Index.html','utf8');
idx=idx.replace(/<\?!=\s*include\('([^']+)'\);?\s*\?>/g,(m,n)=>fs.readFileSync('gas/'+n+'.html','utf8'));
fs.mkdirSync('preview',{recursive:true});
fs.writeFileSync('preview/index.html',idx);
console.log('preview/index.html',fs.statSync('preview/index.html').size);
