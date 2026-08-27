const http=require('http'),fs=require('fs'),path=require('path');
const root=__dirname;
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/')p='/preview/index.html';
  const f=path.join(root,p);
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end('nf');return;}
  const ext=path.extname(f).toLowerCase();
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png','.css':'text/css'}[ext]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':mime});
  fs.createReadStream(f).pipe(res);
}).listen(8791,()=>console.log('serving on 8791'));
