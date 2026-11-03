// J0 spike, headless check: builds the placeholder planet and bakes chunks in Node (fake canvas), prints timings,
// writes PNG mosaics of levels L2 and L4. Usage: node tools/map-bench/node-check.js <outDir>
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..', '..'), out = process.argv[2] || '.';
fs.mkdirSync(out, { recursive: true });
const noop = () => {};
function fakeCanvas(w, h) {
  const cv = { width: w || 0, height: h || 0, style: {}, addEventListener: noop, data: null };
  cv.getContext = () => new Proxy({
    createImageData(w2, h2) { return { width: w2, height: h2, data: new Uint8ClampedArray(w2 * h2 * 4) }; },
    putImageData(d) { cv.data = new Uint32Array(d.data.buffer.slice(0)); },
  }, { get(t, k) { return k in t ? t[k] : noop; }, set() { return true; } });
  return cv;
}
global.window = global; global.devicePixelRatio = 1;
global.document = { readyState: 'complete', addEventListener: noop, createElement: () => fakeCanvas() };
const ORDER = ['palette', 'pieces_b1', 'pieces_b2', 'pieces_b3', 'pieces_b4', 'pieces_b5', 'pieces_b6', 'pieces_b7', 'pieces_b8', 'pieces_b9', 'pieces_b10', 'pieces_b11',
  'spritekit', 'village', 'village_b3', 'village_b4', 'citizens', 'world', 'ui', 'era1', 'evolution', 'era2', 'era3'];
for (const f of ORDER) vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'kit', f + '.js'), 'utf8'), { filename: f + '.js' });
for (const f of ['map/coords.js', 'tools/map-bench/spike-world.js', 'tools/map-bench/spike-terrain.js', 'tools/map-bench/spike-bake.js']) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });

const SIZE = +(process.argv[3] || 1280), C = PV.map.coords.make(SIZE, SIZE * 2);
let t = performance.now();
const world = PVB.makeWorld(C, 7);
const genMs = performance.now() - t;
t = performance.now();
const baker = PVB.Baker(world, { makeCanvas: fakeCanvas, capBytes: 1 << 30 });
console.log('world ' + C.W + 'x' + C.H, genMs.toFixed(0) + ' ms', 'land', world.land, 'buildings', world.buildings, 'towns', world.towns.length, 'index', baker.info().indexMs.toFixed(0) + ' ms', 'entries', baker.info().entries);
function png(file, W, H, u32) {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = u32[y * W + x], o = y * (W * 3 + 1) + 1 + x * 3;
    if (!c) { raw[o] = 0x2f; raw[o + 1] = 0x6a; raw[o + 2] = 0x8f; } else { raw[o] = c & 255; raw[o + 1] = (c >> 8) & 255; raw[o + 2] = (c >> 16) & 255; }
  }
  const crc = (b) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
function mosaic(L, cx0, cy0, nx, ny, name) {
  const g = C.GRIDS[L];
  for (let cy = cy0; cy < cy0 + ny; cy++) for (let cx = cx0; cx < cx0 + nx; cx++) baker.request(L, ((cx % g.nx) + g.nx) % g.nx, cy, 0);
  const t0 = performance.now(); baker.flush(); const ms = performance.now() - t0;
  const MW = nx * g.pw, MH = ny * g.ph, m = new Uint32Array(MW * MH);
  for (let cy = 0; cy < ny; cy++) for (let cx = 0; cx < nx; cx++) {
    const cv = baker.get(L, (((cx0 + cx) % g.nx) + g.nx) % g.nx, cy0 + cy).cv;
    for (let y = 0; y < cv.height; y++) m.set(cv.data.subarray(y * cv.width, (y + 1) * cv.width), (cy * g.ph + y) * MW + cx * g.pw);
  }
  png(path.join(out, name + '.png'), MW, MH, m);
  const cm = baker.stats.chunkMs[L].slice().sort((a, b) => a - b);
  console.log(name, 'L' + L, nx * ny + ' chunks', ms.toFixed(0) + ' ms', 'chunk p50 ' + cm[cm.length >> 1].toFixed(1) + ' p95 ' + cm[Math.floor(cm.length * 0.95)].toFixed(1));
  baker.resetStats();
}
mosaic(C.LODS - 2, 0, 0, C.GRIDS[C.LODS - 2].nx, C.GRIDS[C.LODS - 2].ny, 'planet-L' + (C.LODS - 2));
// a town (the biggest one) at L0 and L1, and a coast near it
const T0 = world.towns[0], s0 = C.toScreen(T0.q, T0.r);
for (const L of [0, 1, 2]) { const g = C.GRIDS[L], c = C.chunkOf(s0[0], s0[1], L); mosaic(L, c.cx - 1, Math.max(0, c.cy - 1), 3, 2, 'town-L' + L); }
console.log('town', JSON.stringify(T0));
