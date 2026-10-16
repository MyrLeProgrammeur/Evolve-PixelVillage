/* Zero-dependency static server for the offline game: node serve.js [port]  ->  http://127.0.0.1:8765 */
const http = require('http'), fs = require('fs'), path = require('path'), url = require('url');
const root = __dirname, port = +process.argv[2] || 8765;
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject' };
http.createServer((req, res) => {
  let p = decodeURIComponent(url.parse(req.url).pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, path.normalize(p));
  if (!f.startsWith(root) || f.includes('node_modules') || f.includes('.git')) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(d);
  });
}).listen(port, '127.0.0.1', () => console.log('Evolve (fork Anki) on http://127.0.0.1:' + port));
