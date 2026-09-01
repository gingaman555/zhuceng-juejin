/* v2 的本機伺服器。跟舊版那一支分開，才不會互相搶連接埠。 */
const http = require('http'), fs = require('fs'), path = require('path');
const root = __dirname;
const PORT = Number(process.env.PORT) || 8792;
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404); res.end('nf'); return;
  }
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' }
    [path.extname(f).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log('v2 on ' + PORT));
