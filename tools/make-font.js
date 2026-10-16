/* Builds evolve/kitpixel.ttf from the sprite kit's bitmap font (kit/pieces_b7.js: ui_font), offline, zero dependency.
   unitsPerEm 64, 1 kit pixel = 8 units: at font-size 16px a kit pixel is exactly 2 CSS px (crisp); also 32px -> 4px.
   Usage: node tools/make-font.js */
const fs = require('fs'), path = require('path');
global.window = global; (0, eval)(fs.readFileSync(path.join(__dirname, '../kit/pieces_b7.js'), 'utf8'));
const F = global.SK.PIECES.ui_font, P = 8, CW = F.cell[0], CH = F.cell[1];
const glyphs = [{ name: '.notdef', code: -1, adv: 5 * P, rects: [[0, 0, 4, 7]].map(([x, y, w, h]) => [x * P, y * P, w * P, h * P]) }];
F.glyphs.split('').forEach((ch, i) => {
  const cx = (i % 16) * CW, cy = Math.floor(i / 16) * CH, w = F.widths[ch], rows = [];
  for (let jr = 0; jr < CH; jr++) {                         // row jr occupies y from (6-jr)*P to (7-jr)*P (baseline at row 6)
    let x = 0; const row = F.rows[cy + jr];
    while (x < w) { if (row[cx + x] === '1') { let e = x; while (e < w && row[cx + e] === '1') e++; rows.push([x * P, (6 - jr) * P, (e - x) * P, P + 1]); x = e; } else x++; }
  }
  glyphs.push({ name: 'g' + i, code: ch.codePointAt(0), adv: (w + 1) * P, rects: rows });
});
// notdef: hollow box
glyphs[0].rects = [[0, 0, 4 * P, P + 1], [0, 6 * P, 4 * P, P + 1], [0, 0, P + 1, 7 * P], [3 * P, 0, P + 1, 7 * P]];
const u16 = n => { const b = Buffer.alloc(2); b.writeUInt16BE(n & 0xffff); return b; }, i16 = n => { const b = Buffer.alloc(2); b.writeInt16BE(n); return b; }, u32 = n => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return b; };
const pad4 = b => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4)]);
// glyf
const glyf = [], loca = [], hm = []; let off = 0, maxPts = 0, maxCont = 0, gx0 = 1e9, gy0 = 1e9, gx1 = -1e9, gy1 = -1e9, advMax = 0;
glyphs.forEach(g => {
  loca.push(off);
  if (!g.rects.length) { hm.push([g.adv, 0]); advMax = Math.max(advMax, g.adv); return; }
  let xmin = 1e9, ymin = 1e9, xmax = -1e9, ymax = -1e9; const pts = [], ends = [];
  g.rects.forEach(([x, y, w, h]) => { [[x, y], [x, y + h], [x + w, y + h], [x + w, y]].forEach(p => pts.push(p)); ends.push(pts.length - 1); xmin = Math.min(xmin, x); ymin = Math.min(ymin, y); xmax = Math.max(xmax, x + w); ymax = Math.max(ymax, y + h); });
  const parts = [i16(g.rects.length), i16(xmin), i16(ymin), i16(xmax), i16(ymax)]; ends.forEach(e => parts.push(u16(e))); parts.push(u16(0));
  parts.push(Buffer.alloc(pts.length, 1));                              // all on-curve, 16-bit deltas
  let px = 0; pts.forEach(p => { parts.push(i16(p[0] - px)); px = p[0]; });
  let py = 0; pts.forEach(p => { parts.push(i16(p[1] - py)); py = p[1]; });
  const b = pad4(Buffer.concat(parts)); glyf.push(b); off += b.length;
  maxPts = Math.max(maxPts, pts.length); maxCont = Math.max(maxCont, g.rects.length);
  hm.push([g.adv, xmin]); advMax = Math.max(advMax, g.adv); gx0 = Math.min(gx0, xmin); gy0 = Math.min(gy0, ymin); gx1 = Math.max(gx1, xmax); gy1 = Math.max(gy1, ymax);
});
loca.push(off);
const N = glyphs.length;
// cmap format 4
const codes = glyphs.map((g, i) => [g.code, i]).filter(c => c[0] >= 0).sort((a, b) => a[0] - b[0]).filter(c => c[0] < 0xffff);
const segs = codes.map(([c, gi]) => [c, c, (gi - c) & 0xffff]); segs.push([0xffff, 0xffff, 1]);
const sc = segs.length, sr = 2 ** Math.floor(Math.log2(sc)) * 2;
const cm4 = Buffer.concat([u16(4), u16(16 + sc * 8), u16(0), u16(sc * 2), u16(sr), u16(Math.log2(sr / 2)), u16(sc * 2 - sr),
  ...segs.map(s => u16(s[1])), u16(0), ...segs.map(s => u16(s[0])), ...segs.map(s => u16(s[2])), ...segs.map(() => u16(0))]);
const cmap = Buffer.concat([u16(0), u16(1), u16(3), u16(1), u32(12), cm4]);
const head = Buffer.concat([u32(0x00010000), u32(0x00010000), u32(0), u32(0x5F0F3CF5), u16(0x000B), u16(64), Buffer.alloc(16), i16(gx0), i16(gy0), i16(gx1), i16(gy1), u16(0), u16(8), i16(2), i16(1), i16(0)]);
const hhea = Buffer.concat([u32(0x00010000), i16(56), i16(-16), i16(8), u16(advMax), i16(0), i16(0), i16(gx1), i16(1), i16(0), i16(0), Buffer.alloc(8), i16(0), u16(N)]);
const maxp = Buffer.concat([u32(0x00010000), u16(N), u16(maxPts), u16(maxCont), u16(0), u16(0), u16(2), u16(0), u16(0), u16(0), u16(0), u16(0), u16(0), u16(0), u16(0)]);
const hmtx = Buffer.concat(hm.map(([a, l]) => Buffer.concat([u16(a), i16(l)])));
const locaB = Buffer.concat(loca.map(o => u32(o)));
const os2 = Buffer.concat([u16(3), i16(40), u16(400), u16(5), u16(0), i16(40), i16(40), i16(0), i16(10), i16(40), i16(40), i16(0), i16(28), i16(5), i16(5), i16(0), Buffer.alloc(10), u32(1), u32(0), u32(0), u32(0), Buffer.from('KIT '), u16(0x40), u16(32), u16(0xFFFF), i16(56), i16(-16), i16(8), u16(56), u16(16), u32(1), u32(0), i16(40), i16(56), u16(0), u16(32), u16(0)]);
const nm = (id, s) => ({ id, b: Buffer.from(s, 'utf16le').swap16() });
const names = [nm(1, 'KitPixel'), nm(2, 'Regular'), nm(3, 'KitPixel Regular 1.0'), nm(4, 'KitPixel'), nm(5, 'Version 1.0'), nm(6, 'KitPixel-Regular')];
let no = 0; const recs = names.map(n => { const r = Buffer.concat([u16(3), u16(1), u16(0x409), u16(n.id), u16(n.b.length), u16(no)]); no += n.b.length; return r; });
const name = Buffer.concat([u16(0), u16(names.length), u16(6 + names.length * 12), ...recs, ...names.map(n => n.b)]);
const post = Buffer.concat([u32(0x00030000), u32(0), i16(-8), i16(4), u32(1), u32(0), u32(0), u32(0), u32(0)]);
const tables = { 'OS/2': os2, cmap, glyf: Buffer.concat(glyf), head, hhea, hmtx, loca: locaB, maxp, name, post };
const tags = Object.keys(tables).sort(); const nT = tags.length;
const sum = b => { const p = pad4(b); let s = 0; for (let i = 0; i < p.length; i += 4) s = (s + p.readUInt32BE(i)) >>> 0; return s; };
let offset = 12 + nT * 16; const dir = [], body = [];
tags.forEach(t => { const d = pad4(tables[t]); dir.push(Buffer.concat([Buffer.from(t), u32(sum(tables[t])), u32(offset), u32(tables[t].length)])); body.push(d); offset += d.length; });
const sr2 = 2 ** Math.floor(Math.log2(nT)) * 16;
const hdr = Buffer.concat([u32(0x00010000), u16(nT), u16(sr2), u16(Math.floor(Math.log2(nT))), u16(nT * 16 - sr2)]);
let font = Buffer.concat([hdr, ...dir, ...body]);
const total = sum(font), adj = (0xB1B0AFBA - total) >>> 0;
const hi = tags.indexOf('head'); let ho = 12 + nT * 16; for (let i = 0; i < hi; i++) ho += pad4(tables[tags[i]]).length;
font.writeUInt32BE(adj, ho + 8);
const out = path.join(__dirname, '../evolve/kitpixel.ttf'); fs.writeFileSync(out, font);
console.log('kitpixel.ttf', font.length, 'bytes,', N, 'glyphs,', codes.length, 'code points');
