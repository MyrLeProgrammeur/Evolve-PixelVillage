/* Zero-dependency static server for the offline game: node serve.js [port] [--anki]  ->  http://127.0.0.1:8765
 * --anki (or ANKI_VILLAGE=1): also starts the read-only Anki sensor (anki/sensor.js, root required) and serves
 *   GET /api/anki/events?since=N  new review events + status (the page replays them, anki-bridge.js)
 *   GET /api/anki/ping            wake-up from the AnkiDroid scheduling snippet (CORS *, carries no data)
 *   GET /api/anki/hud             one line of text for an in-card banner (CORS *)
 *   GET /api/anki/cards?cids=1,2  question text of a few cards (kept in memory, never written to disk)
 * Without --anki, /api/anki/* answers {"enabled":false} and the game behaves as before. */
const http = require('http'), fs = require('fs'), path = require('path');
const root = __dirname;
const argv = process.argv.slice(2);
const port = +(argv.find((a) => /^\d+$/.test(a))) || 8765;
const ankiOn = argv.includes('--anki') || process.env.ANKI_VILLAGE === '1';
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject' };

let sensor = null, L = null;
if (ankiOn) {
  sensor = require('./anki/sensor.js').createSensor({ log: (m) => console.log('[anki] ' + m) });
  L = require('./anki/ledger.js');
  sensor.refresh({ force: true }).then((r) => console.log('[anki] ' + r.added.length + ' new events, source ' + sensor.status().source))
    .catch((e) => console.log('[anki] sensor unavailable: ' + e.message));
}
const MIN_REFRESH_MS = 4000;
function freshen(wait) {
  if (!sensor) { return Promise.resolve(); }
  const st = sensor.status();
  if (Date.now() - st.lastRefresh < MIN_REFRESH_MS) { return Promise.resolve(); }
  const p = sensor.refresh().catch(() => {});
  return wait ? Promise.race([p, new Promise((r) => setTimeout(r, 3000))]) : Promise.resolve();
}
function json(res, code, obj, cors) {
  const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (cors) { h['Access-Control-Allow-Origin'] = '*'; }
  res.writeHead(code, h); res.end(JSON.stringify(obj));
}
async function anki(req, res, u) {
  const p = u.pathname;
  if (!sensor) { return json(res, 200, { enabled: false }, true); }
  if (p === '/api/anki/ping') {
    freshen(false);
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); return res.end();
  }
  if (p === '/api/anki/events') {
    await freshen(true);
    const since = Number(u.searchParams.get('since')) || 0;
    return json(res, 200, Object.assign({ enabled: true, status: sensor.status() }, sensor.eventsSince(since)));
  }
  if (p === '/api/anki/hud') {
    await freshen(true);
    const today = L.localAnkiDay(Date.now(), sensor.status().rollover || 4);
    const r = L.replay(sensor.allEvents().filter((e) => e.day === today), null, { today });
    const d = r.days.find((x) => x.day === today);
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
    return res.end('Village : ' + (d ? d.credits : 0) + ' cartes aujourd\'hui');
  }
  if (p === '/api/anki/cards') {
    try { return json(res, 200, await sensor.cardText(String(u.searchParams.get('cids') || '').split(','))); }
    catch (e) { return json(res, 503, { error: e.message }); }
  }
  if (p === '/api/anki/status') { return json(res, 200, Object.assign({ enabled: true }, sensor.status())); }
  json(res, 404, { error: 'unknown' });
}

http.createServer((req, res) => {
  let u; try { u = new URL(req.url, 'http://127.0.0.1'); } catch (e) { res.writeHead(400); return res.end(); }
  if (u.pathname.startsWith('/api/anki/')) { anki(req, res, u).catch((e) => json(res, 500, { error: e.message })); return; }
  let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, path.normalize(p));
  if (!f.startsWith(root) || f.includes('node_modules') || f.includes('.git')) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(d);
  });
}).listen(port, '127.0.0.1', () => console.log('Evolve (fork Anki) on http://127.0.0.1:' + port + (sensor ? ' (Anki link on)' : '')));
process.on('SIGINT', () => { if (sensor) { sensor.close(); } process.exit(0); });
