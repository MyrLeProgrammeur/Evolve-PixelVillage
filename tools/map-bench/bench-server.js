/* J0 bench server (zero dependency): serves the repository on 127.0.0.1:8766 ONLY (the test port; never the port of a real save)
   and stores bench results: POST /bench?engine=<name> writes <OUT>/<YYYYMMDD-hhmmss>-<engine>.json.
   Usage: node tools/map-bench/bench-server.js   (OUT = $PV_BENCH_DIR or /data/data/com.termux/files/usr/tmp/pv-bench) */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const PORT = 8766;
if (process.argv[2] && +process.argv[2] !== PORT) { console.error('refused: the bench server only runs on port ' + PORT); process.exit(1); }
const root = path.join(__dirname, '..', '..');
const OUT = process.env.PV_BENCH_DIR || (fs.existsSync('/data/data/com.termux/files/usr/tmp') ? '/data/data/com.termux/files/usr/tmp/pv-bench' : path.join(os.tmpdir(), 'pv-bench'));
fs.mkdirSync(OUT, { recursive: true });
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png' };
const stamp = () => { const d = new Date(), p = (n) => String(n).padStart(2, '0'); return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()); };

http.createServer((req, res) => {
  let u; try { u = new URL(req.url, 'http://127.0.0.1'); } catch (e) { res.writeHead(400); return res.end(); }
  if (u.pathname === '/bench' && req.method === 'POST') {
    let body = '', size = 0;
    req.on('data', (c) => { size += c.length; if (size > 4e6) { req.destroy(); return; } body += c; });
    req.on('end', () => {
      try { JSON.parse(body); } catch (e) { res.writeHead(400); return res.end('bad json'); }
      const eng = String(u.searchParams.get('engine') || 'unknown').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'unknown';
      const f = path.join(OUT, stamp() + '-' + eng + '.json');
      fs.writeFileSync(f, body); console.log('saved ' + f);
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}');
    });
    return;
  }
  let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, path.normalize(p));
  if (!f.startsWith(root) || f.includes('node_modules') || f.includes('.git')) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(d);
  });
}).listen(PORT, '127.0.0.1', () => console.log('map bench on http://127.0.0.1:' + PORT + '/tools/map-bench/bench.html  (results -> ' + OUT + ')'));
