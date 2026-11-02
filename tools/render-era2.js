// Headless render of the Era 2 atelier sheets: loads the kit with a bare `window`, writes PNG contact sheets.
// Usage: node tools/render-era2.js kit <outDir>   (zero dependency, no browser; writes PNG sheets + labels)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib');
const [kitDir, outDir] = process.argv.slice(2);
global.window = global;
global.document = { readyState: 'complete', addEventListener() {}, createElement() { return { getContext() { return null; }, style: {} }; } };
const ORDER = ['palette', 'pieces_b1', 'pieces_b2', 'pieces_b3', 'pieces_b4', 'pieces_b5', 'pieces_b6', 'pieces_b7', 'pieces_b8', 'pieces_b9', 'pieces_b10',
  'spritekit', 'village', 'village_b3', 'village_b4', 'citizens', 'world', 'ui', 'era1', 'evolution', 'era2'];
for (const f of ORDER) vm.runInThisContext(fs.readFileSync(path.join(kitDir, f + '.js'), 'utf8'), { filename: f + '.js' });
const SK = global.SK, SpK = global.SpriteKit;
console.log('isReady', SpK.isReady && SpK.isReady(), 'era2', !!SK.era2);
const sc = SpK._.selfCheck ? SpK._.selfCheck() : null;
if (sc) { const iss = sc.issues || sc; console.log('selfCheck issues:', Array.isArray(iss) ? iss.length : iss); if (Array.isArray(iss)) iss.slice(0, 15).forEach(i => console.log('  -', i)); if (sc.notes) sc.notes.filter(n => /era2/.test(n)).forEach(n => console.log('  note', n)); }
const iss2 = [], notes2 = []; SK.era2.check(iss2, notes2); console.log('era2.check issues', iss2.length, iss2.slice(0, 10)); notes2.forEach(n => console.log('  ', n));

const BG = [0x2f, 0x2a, 0x33];
function png(file, W, H, px) { // px: Uint8Array RGB
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; px.copy ? 0 : 0; Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1); }
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
// lay out a list of Pix in rows, scaled by K
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
  png(file, W * K, H * K, Buffer.from(px.buffer)); console.log('wrote', path.basename(file), W * K + 'x' + H * K);
}
const E = SK.era2;
const lab = (arr) => arr.map((s, i) => (i + 1) + '. ' + s.label).join('\n');
const b = E.sheetBuildings(1); sheet(path.join(outDir, '1-batiments.png'), b.map(s => s.pix), 2, 560); fs.writeFileSync(path.join(outDir, '1-batiments.txt'), lab(b));
const t = E.sheetTiers(1); sheet(path.join(outDir, '2-paliers-P3-P4.png'), t.map(s => s.pix), 2, 560); fs.writeFileSync(path.join(outDir, '2-paliers.txt'), lab(t));
const m = E.sheetMods(1); sheet(path.join(outDir, '3-modificateurs.png'), m.map(s => s.pix), 2, 560); fs.writeFileSync(path.join(outDir, '3-modificateurs.txt'), lab(m));
sheet(path.join(outDir, '4-reseau.png'), [E.gridSheet('surplus'), E.gridSheet('deficit', 0), E.gridSheet('night')], 2, 600);
sheet(path.join(outDir, '5-citoyens-treillis.png'), [E.citizenSheet(0), E.trussTest()], 3, 400);
sheet(path.join(outDir, '6-hiver.png'), E.sheetBuildings(3).map(s => s.pix), 2, 560);
