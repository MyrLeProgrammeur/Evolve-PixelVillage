/* PV map coordinates: a wrapped isometric band (plain ES2019, no dependency, works in the browser and in Node).
   Tile (q, r): q in [0, W) is cyclic (east-west wrap), r in [0, H) runs north to south. Index i = r * W + q.
   North corner of tile (q, r) in L0 art pixels: sx = mod((2q - r) * 16, 32W), sy = 8r.
   This is the kit's worldPt anchoring (spritekit.js) with q = x, r = x + y, so kit composers' ox/oy work unchanged.
   Chunks: 512 x 256 pixels of their own level; level L draws one art pixel per 2^L L0 pixels. When 512 * 2^L does not divide
   the band (the coarsest levels), the level is a single chunk covering the whole band (wider than 512 px). */
(function (root) {
  'use strict';
  var CW = 512, CH = 256, LODS = 7;

  function mod(a, n) { return ((a % n) + n) % n; }

  function make(W, H) {
    W = W || 128; H = H || 256;
    var BW = 32 * W, BH = 8 * H;

    function wrapQ(q) { return mod(q, W); }
    function inside(r) { return r >= 0 && r < H; }
    function idx(q, r) { return inside(r) ? r * W + wrapQ(q) : -1; }
    function qOf(i) { return i % W; }
    function rOf(i) { return (i / W) | 0; }

    function toScreen(q, r) { return [mod((2 * q - r) * 16, BW), 8 * r]; }
    // Inverse of the diamond: any point of the band to the tile whose diamond contains it (null off the band).
    function fromScreen(sx, sy) {
      var a = sx / 16, b = sy / 8, x = Math.floor((a + b) / 2), y = Math.floor((b - a) / 2), r = x + y;
      return inside(r) ? { q: wrapQ(x), r: r } : null;
    }

    // Kit x/y neighbours rewritten in q/r: (x±1, y) -> (q±1, r±1); (x, y±1) -> (q, r±1).
    var N4 = [[1, 1], [-1, -1], [0, 1], [0, -1]];
    var N8 = N4.concat([[1, 2], [-1, -2], [1, 0], [-1, 0]]);
    function nb(list, q, r) { var o = []; for (var k = 0; k < list.length; k++) { var i = idx(q + list[k][0], r + list[k][1]); if (i >= 0) o.push(i); } return o; }
    function neighbors4(q, r) { return nb(N4, q, r); }
    function neighbors8(q, r) { return nb(N8, q, r); }
    // Cyclic distance between two q values.
    function dq(a, b) { var d = mod(a - b, W); return d > W / 2 ? d - W : d; }

    // Chunk grid of a level, in L0 world pixels.
    function grid(lod) {
      var f = 1 << lod, w = CW * f, h = CH * f;
      if (w >= BW || BW % w) w = BW;
      if (h >= BH || BH % h) h = BH;
      return { f: f, w: w, h: h, nx: Math.ceil(BW / w), ny: Math.ceil(BH / h), pw: w / f, ph: h / f };
    }
    var GRIDS = []; for (var L = 0; L < LODS; L++) GRIDS.push(grid(L));
    function chunkOf(sx, sy, lod) { var g = GRIDS[lod]; return { cx: Math.floor(mod(sx, BW) / g.w), cy: Math.floor(sy / g.h) }; }
    function chunkRect(cx, cy, lod) { var g = GRIDS[lod]; return { x: cx * g.w, y: cy * g.h, w: g.w, h: Math.min(g.h, BH - cy * g.h) }; }
    // Horizontal offsets (-BW, 0, +BW) that bring a world box back over the band [0, BW).
    function wrapCopies(b) { var o = []; for (var k = -1; k <= 1; k++) { var x0 = b.x + k * BW; if (x0 < BW && x0 + b.w > 0) o.push(k * BW); } return o; }

    return { W: W, H: H, N: W * H, BW: BW, BH: BH, CW: CW, CH: CH, LODS: LODS, GRIDS: GRIDS,
      mod: mod, wrapQ: wrapQ, idx: idx, qOf: qOf, rOf: rOf, toScreen: toScreen, fromScreen: fromScreen,
      neighbors4: neighbors4, neighbors8: neighbors8, dq: dq, chunkOf: chunkOf, chunkRect: chunkRect, wrapCopies: wrapCopies };
  }

  var api = { make: make, CW: CW, CH: CH, LODS: LODS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) { root.PV = root.PV || {}; root.PV.map = root.PV.map || {}; root.PV.map.coords = api; }
})(typeof window !== 'undefined' ? window : null);
