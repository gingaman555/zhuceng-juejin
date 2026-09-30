/* 學校的 DNS（dns.ttu.edu.tw）有時候解析不了 firebasehosting.googleapis.com，
   node deploy.js 就會「四次都沒成功」，錯誤訊息是
   "Assertion failed: resolving hosting target of a site with no site name"
   或 "Failed to make request to https://firebasehosting.googleapis.com/…"。
   （2026-09-30 量到：網站本身連得到，只有那幾個 Google API 的網址解析不到。）

   這一支只在跑這一次指令的時候生效，不動電腦的系統設定：
   對 Google 的網址改用 8.8.8.8 查，查不到才退回系統原本的查法。

   用法（PowerShell）：
     $env:NODE_OPTIONS = "--require $PWD/dnsfix.js"; node deploy.js --skip; Remove-Item Env:NODE_OPTIONS
   或（bash）：
     NODE_OPTIONS="--require $PWD/dnsfix.js" node deploy.js --skip

   要先確定檢查剛跑過才用 --skip；否則拿掉它。 */
const dns = require('dns');
const orig = dns.lookup;
const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1']);
const 要換 = /(\.googleapis\.com|\.google\.com|\.firebaseio\.com|\.web\.app|\.firebaseapp\.com|\.gstatic\.com|\.cloudfunctions\.net)$/;
dns.lookup = function (host, options, cb) {
  if (typeof options === 'function') { cb = options; options = {}; }
  if (typeof options === 'number') options = { family: options };
  options = options || {};
  if (typeof host !== 'string' || !要換.test(host) || options.family === 6) return orig.call(dns, host, options, cb);
  resolver.resolve4(host, (err, addrs) => {
    if (err || !addrs || !addrs.length) return orig.call(dns, host, options, cb);
    if (options.all) return cb(null, addrs.map(a => ({ address: a, family: 4 })));
    cb(null, addrs[0], 4);
  });
};
