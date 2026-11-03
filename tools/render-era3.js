// Headless render of the Era 3 atelier sheets and of a full Era 3 village frame.
// Usage: node tools/render-era3.js <kitDir> <outDir>   (zero dependency, no browser; writes PNG sheets + labels)
// The full frame uses a fake canvas: buildings, terrain, railway, smoke (world layer). Citizens are drawn later
// by present() on the real canvas, so they are not in that image.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib');
const [kitDir, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

let lastImg = null;
const noop = () => {};
function fakeCtx() {
  const base = {
    createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
    putImageData(img) { lastImg = img; },
    getImageData(x, y, w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
    measureText() { return { width: 0 }; },
  };
  return new Proxy(base, { get(t, k) { return k in t ? t[k] : noop; }, set(t, k, v) { t[k] = v; return true; } });
}
function fakeCanvas() {
  return { width: 0, height: 0, style: {}, getContext: () => fakeCtx(), addEventListener: noop, setPointerCapture: noop,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) };
}
global.window = global;
global.devicePixelRatio = 1;
global.document = { readyState: 'complete', addEventListener: noop, createElement: () => fakeCanvas() };

const ORDER = ['palette', 'pieces_b1', 'pieces_b2', 'pieces_b3', 'pieces_b4', 'pieces_b5', 'pieces_b6', 'pieces_b7', 'pieces_b8', 'pieces_b9', 'pieces_b10', 'pieces_b11',
  'spritekit', 'village', 'village_b3', 'village_b4', 'citizens', 'world', 'ui', 'era1', 'evolution', 'era2', 'era3'];
for (const f of ORDER) vm.runInThisContext(fs.readFileSync(path.join(kitDir, f + '.js'), 'utf8'), { filename: f + '.js' });
const SK = global.SK, SpK = global.SpriteKit;
console.log('isReady', SpK.isReady && SpK.isReady(), 'era2', !!SK.era2, 'era3', !!SK.era3);
const sc = SpK._.selfCheck ? SpK._.selfCheck() : null;
if (sc) { const iss = sc.issues || sc; console.log('selfCheck issues:', Array.isArray(iss) ? iss.length : iss); if (Array.isArray(iss)) iss.slice(0, 15).forEach(i => console.log('  -', i)); }
for (const e of ['era2', 'era3']) { const is = [], no = []; SK[e].check(is, no); console.log(e + '.check issues', is.length, is.slice(0, 10)); no.forEach(n => console.log('  ', n)); }

const BG = [0x2f, 0x2a, 0x33];
function png(file, W, H, px) { // px: RGB bytes
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) Buffer.from(px.buffer, px.byteOffset + y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
  console.log('wrote', path.basename(file), W + 'x' + H);
}
function sheet(file, pixes, K, maxW) {
  const gap = 8, rows = []; let row = [], w = 0;
  for (const p of pixes) { if (w + p.w + gap > maxW && row.length) { rows.push(row); row = []; w = 0; } row.push(p); w += p.w + gap; }
  if (row.length) rows.push(row);
  const W = Math.max(...rows.map(r => r.reduce((a, p) => a + p.w + gap, gap))), H = rows.reduce((a, r) => a + Math.max(...r.map(p => p.h)) + gap, gap);
  const px = new Uint8Array(W * K * H * K * 3);
  for (let i = 0; i < W * K * H * K; i++) { px[i * 3] = BG[0]; px[i * 3 + 1] = BG[1]; px[i * 3 + 2] = BG[2]; }
  let y0 = gap;
  for (const r of rows) { let x0 = gap; const rh = Math.max(...r.map(p => p.h));
    for (const p of r) { const oy = y0 + rh - p.h;
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const c = p.d[y * p.w + x]; if (!c) continue;
        for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) { const q = (((oy + y) * K + j) * W * K + (x0 + x) * K + i) * 3; px[q] = c & 255; px[q + 1] = (c >>> 8) & 255; px[q + 2] = (c >>> 16) & 255; } }
      x0 += p.w + gap; }
    y0 += rh + gap; }
  png(file, W * K, H * K, px);
}
const out = n => path.join(outDir, n);
const lab = arr => arr.map((s, i) => (i + 1) + '. ' + s.label).join('\n');
const E = SK.era3;

const b = E.sheetBuildings(1); sheet(out('1-batiments.png'), b.map(s => s.pix), 2, 620); fs.writeFileSync(out('1-batiments.txt'), lab(b));
const m = E.sheetMods(1); sheet(out('2-modificateurs.png'), m.map(s => s.pix), 2, 620); fs.writeFileSync(out('2-modificateurs.txt'), lab(m));
const v = E.vehicleSheet(); sheet(out('3-vehicules.png'), [v], 3, 900); fs.writeFileSync(out('3-vehicules.txt'), (v.labels || []).join('\n'));
sheet(out('4-train-champ-quai.png'), [E.trainSheet('pass', 3000, 1), E.trainSheet('stop', 0, 3), E.oilField(5, 1, 0), E.wharfSheet('moored', 0, 1)], 2, 700);
const c = E.citizenSheet(0); sheet(out('5-citoyens-aides.png'), [c, E.helperSheet()], 3, 400); fs.writeFileSync(out('5-citoyens.txt'), (c.labels || []).join('\n'));
sheet(out('6-hiver.png'), E.sheetBuildings(3).map(s => s.pix), 2, 620);

// full village frame in Era 3
const st = SpK.fakeState();
Object.assign(st.tech, { primitive: 3, axe: 5, hammer: 4, hoe: 4, pickaxe: 4, mining: 4, smelting: 5, cement: 4, housing: 3, agriculture: 5, science: 7, currency: 4,
  military: 4, armor: 2, theology: 2, storage: 4, container: 3, steel_container: 3, high_tech: 3, oil: 4, trade: 3, wharf: 1, titanium: 1, copper: 1, explosives: 3,
  mine_conveyor: 1, foundry: 6, theatre: 3, broadcast: 1, farm: 1, saw: 2 });
const setB = (k, n, on) => { st.city[k] = Object.assign(st.city[k] || {}, { count: n, on: on == null ? n : on }); };
[['basic_housing', 14], ['cottage', 8], ['apartment', 4], ['farm', 6], ['lumber_yard', 2], ['sawmill', 1], ['rock_quarry', 2], ['mine', 2], ['coal_mine', 1], ['cement_plant', 1],
 ['foundry', 1], ['smelter', 2], ['shed', 2], ['storage_yard', 2], ['warehouse', 1], ['bank', 1], ['library', 1], ['university', 1], ['temple', 1], ['amphitheatre', 1],
 ['garrison', 1], ['trade', 1], ['wardenclyffe', 1], ['coal_power', 1], ['oil_well', 6], ['oil_depot', 3], ['oil_power', 1], ['wharf', 1]].forEach(q => setB(q[0], q[1]));
st.city.factory = { count: 2, on: 2, Lux: 1, Furs: 0, Alloy: 1, Polymer: 0, Nano: 0, Stanene: 0 };
Object.assign(st.city, { powered: true, power: 10, power_total: 40 });
SpK.init(fakeCanvas(), { scale: 1 });
const frames = [[1, 'ete'], [3, 'hiver']];
for (const [season, name] of frames) {
  st.city.calendar.season = season;
  for (let i = 0; i < 40; i++) SpK.render(st, 250); // let scaffolding settle and the train come round
  lastImg = null; SpK._.villageFrame ? SpK._.villageFrame(st, true) : SpK.render(st, 1);
  if (!lastImg) { console.log('no frame captured (' + name + ')'); continue; }
  const { width: W, height: H, data } = lastImg, rgb = new Uint8Array(W * H * 3);
  for (let i = 0; i < W * H; i++) { rgb[i * 3] = data[i * 4]; rgb[i * 3 + 1] = data[i * 4 + 1]; rgb[i * 3 + 2] = data[i * 4 + 2]; }
  png(out('7-village-' + name + '.png'), W, H, rgb);
}
