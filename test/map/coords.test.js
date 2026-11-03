/* node --test test/map/ — wrapped isometric band (map/coords.js). */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../map/coords.js').make(128, 256);

test('index round trip on every tile', () => {
  for (let r = 0; r < C.H; r++) for (let q = 0; q < C.W; q++) {
    const i = C.idx(q, r);
    assert.equal(C.qOf(i), q); assert.equal(C.rOf(i), r);
  }
  assert.equal(C.idx(0, -1), -1); assert.equal(C.idx(0, C.H), -1);
  assert.equal(C.idx(-1, 5), C.idx(C.W - 1, 5));
});

test('screen <-> tile round trip on all 32 768 tiles (diamond centre and inner points)', () => {
  for (let r = 0; r < C.H; r++) for (let q = 0; q < C.W; q++) {
    const [sx, sy] = C.toScreen(q, r);
    for (const [dx, dy] of [[0, 8], [0, 1], [0, 15], [-15, 8], [15, 8], [7, 5]]) {
      const t = C.fromScreen(sx + dx, sy + dy);
      assert.ok(t, 'off band at ' + q + ',' + r);
      assert.equal(t.q, q); assert.equal(t.r, r);
    }
  }
});

test('fromScreen wraps east-west and stops at the poles', () => {
  const [sx, sy] = C.toScreen(3, 40);
  assert.deepEqual(C.fromScreen(sx + 4 + C.BW, sy + 8), C.fromScreen(sx + 4, sy + 8));
  assert.deepEqual(C.fromScreen(sx + 4 - 2 * C.BW, sy + 8), C.fromScreen(sx + 4, sy + 8));
  assert.equal(C.fromScreen(10, -1), null);
  assert.equal(C.fromScreen(10, C.BH + 20), null);
});

test('neighbours are symmetric and cross the seam', () => {
  for (const nb of [C.neighbors4, C.neighbors8]) {
    for (let r = 0; r < C.H; r += 7) for (let q = 0; q < C.W; q++) {
      const i = C.idx(q, r);
      for (const j of nb(q, r)) assert.ok(nb(C.qOf(j), C.rOf(j)).includes(i));
    }
  }
  assert.ok(C.neighbors8(0, 10).includes(C.idx(C.W - 1, 10)));
  assert.ok(C.neighbors4(C.W - 1, 10).includes(C.idx(0, 11)));
  assert.equal(C.dq(0, C.W - 1), 1); assert.equal(C.dq(C.W - 1, 0), -1);
});

test('neighbours touch on screen (shared diamond edge or corner)', () => {
  const q = 50, r = 60, [sx, sy] = C.toScreen(q, r);
  for (const j of C.neighbors4(q, r)) {
    const [nx, ny] = C.toScreen(C.qOf(j), C.rOf(j));
    assert.equal(Math.abs(nx - sx), 16); assert.equal(Math.abs(ny - sy), 8);
  }
});

test('matches the kit worldPt anchoring with q = x, r = x + y', () => {
  // kit: worldPt(x, y) = [NX + (x - y) * 16, NY + (x + y) * 8]
  for (let x = 0; x < 24; x++) for (let y = 0; y < 24; y++) {
    const [sx, sy] = C.toScreen(x, x + y);
    assert.equal(sx, C.mod((x - y) * 16, C.BW)); assert.equal(sy, (x + y) * 8);
  }
});

test('chunks tile the band at every level, without gap or overlap', () => {
  for (let L = 0; L < C.LODS; L++) {
    const g = C.GRIDS[L];
    let area = 0;
    for (let cy = 0; cy < g.ny; cy++) for (let cx = 0; cx < g.nx; cx++) {
      const b = C.chunkRect(cx, cy, L);
      area += b.w * b.h;
      assert.deepEqual(C.chunkOf(b.x, b.y, L), { cx, cy });
      assert.deepEqual(C.chunkOf(b.x + b.w - 1, b.y + b.h - 1, L), { cx, cy });
      if (g.nx > 1) assert.ok(b.w / g.f <= C.CW); if (g.ny > 1) assert.ok(b.h / g.f <= C.CH);
    }
    assert.equal(area, C.BW * C.BH, 'level ' + L);
  }
  assert.equal(C.GRIDS[0].nx * C.GRIDS[0].ny, 64);
  assert.deepEqual([C.GRIDS[4].pw, C.GRIDS[4].ph], [256, 128]);
});

test('the large planet (1280 x 2560): chunks tile every level, coarsest levels are one chunk', () => {
  const B = require('../../map/coords.js').make(1280, 2560);
  for (let L = 0; L < B.LODS; L++) {
    const g = B.GRIDS[L];
    assert.equal(g.nx * g.w, B.BW); assert.equal(g.ny * g.h, B.BH);
    assert.equal(g.pw, g.w / g.f); assert.ok(Number.isInteger(g.pw) && Number.isInteger(g.ph));
  }
  assert.deepEqual([B.GRIDS[0].nx, B.GRIDS[0].ny], [80, 80]);
  assert.deepEqual([B.GRIDS[4].nx, B.GRIDS[4].ny, B.GRIDS[4].pw], [5, 5, 512]);
  assert.deepEqual([B.GRIDS[5].nx, B.GRIDS[5].pw, B.GRIDS[5].ph], [1, 1280, 640]);
  assert.deepEqual([B.GRIDS[6].pw, B.GRIDS[6].ph], [640, 320]);
  for (let k = 0; k < 20000; k++) {
    const q = (k * 7919) % B.W, r = (k * 104729) % B.H, [sx, sy] = B.toScreen(q, r), t = B.fromScreen(sx + 3, sy + 8);
    assert.equal(t.q, q); assert.equal(t.r, r);
  }
});

test('wrap copies of a box over the seam', () => {
  assert.deepEqual(C.wrapCopies({ x: 100, w: 50 }), [0]);
  assert.deepEqual(C.wrapCopies({ x: C.BW - 20, w: 50 }), [-C.BW, 0]);
  assert.deepEqual(C.wrapCopies({ x: -30, w: 50 }), [0, C.BW]);
});
