/* J0-10: measured prototype of the deterministic generator (integer maths only, core/dmath.js).
   3D value noise on a cylinder (integer sine table) -> sea level by histogram -> Priority-Flood with a typed heap (filled
   elevation, downstream tile) -> flow accumulation -> 24 Dijkstra (integer costs, 3 000 tiles each).
   Returns timings and a fingerprint that must be identical in Node, Brave, Fennec and Qt WebEngine.
   Node: node tools/map-bench/gen-proto.js   |   browser: PVB.genProto(PV.map.coords.make(128, 256), PV.dmath, 7) */
(function (G) {
  'use strict';
  var PVB = G.PVB = G.PVB || {};
  var now = function () { return (typeof performance !== 'undefined' ? performance : Date).now(); };

  function fnv(h, arr) { for (var i = 0; i < arr.length; i++) { var v = arr[i] | 0; for (var b = 0; b < 4; b++) { h ^= (v >>> (b * 8)) & 255; h = Math.imul(h, 16777619); } } return h >>> 0; }

  PVB.genProto = function (C, D, seed) {
    var W = C.W, H = C.H, N = C.N, ONE = D.ONE, T = {}, t0 = now(), t;
    // 1. elevation: fractal value noise on the cylinder (q wraps), 4 octaves, integer weights
    var elev = new Int32Array(N), OCT = [[2, 8], [4, 4], [8, 2], [16, 1]];
    for (var r = 0; r < H; r++) for (var q = 0; q < W; q++) {
      var u = (((2 * q - r) % (2 * W)) + 2 * W) % (2 * W), a = Math.floor(u * D.TAU_STEPS / (2 * W)), cs = D.icos(a), sn = D.isin(a), s = 0, wsum = 0;
      for (var o = 0; o < OCT.length; o++) {
        var R = OCT[o][0], z = Math.floor(r * R * ONE * 314 / (100 * W));
        s += OCT[o][1] * D.vnoise3(cs * R, sn * R, z, seed + o); wsum += OCT[o][1];
      }
      var lat = Math.abs(2 * r - H) * 64 / H; // 0..64
      elev[r * W + q] = Math.floor(s / wsum) - ((lat * lat * lat) >> 2);
    }
    T.noise = now() - t0; t = now();
    // 2. sea level at the 60th percentile (sort of a copy; integers, so the order is total)
    var srt = Int32Array.from(elev).sort(), sea = srt[Math.floor(N * 0.6)];
    T.sea = now() - t; t = now();
    // 3. Priority-Flood from every ocean tile: filled elevation, downstream tile, pop order
    var filled = new Int32Array(N), down = new Int32Array(N).fill(-1), seen = new Uint8Array(N), ord = new Int32Array(N), no = 0, h = new D.Heap(N);
    for (var i = 0; i < N; i++) if (elev[i] < sea) { filled[i] = elev[i]; seen[i] = 1; h.push(sea, i); }
    var NB = [[1, 1], [-1, -1], [0, 1], [0, -1]];
    while (h.n) {
      var c = h.pop(), key = h.lastKey, cq = c % W, cr = (c / W) | 0; ord[no++] = c;
      for (var k = 0; k < 4; k++) {
        var nr = cr + NB[k][1]; if (nr < 0 || nr >= H) continue;
        var n = nr * W + (((cq + NB[k][0]) % W) + W) % W; if (seen[n]) continue;
        seen[n] = 1; filled[n] = Math.max(elev[n], key + 1); down[n] = c; h.push(filled[n], n);
      }
    }
    T.flood = now() - t; t = now();
    // 4. flow accumulation, upstream to downstream (reverse pop order)
    var flow = new Uint32Array(N).fill(1);
    for (i = no - 1; i >= 0; i--) { var x = ord[i]; if (down[x] >= 0) flow[down[x]] += flow[x]; }
    T.flow = now() - t; t = now();
    // 5. 24 sites on land by hash, then a Dijkstra of 3 000 tiles from each (cost: 10 + slope, water impassable)
    var sites = [], tries = 0;
    while (sites.length < 24 && tries < 100000) { var cand = D.ihash(tries++, 0, 0, seed) % N; if (elev[cand] >= sea) sites.push(cand); }
    var dist = new Int32Array(N), stamp = new Int32Array(N), orders = [];
    for (var sI = 0; sI < sites.length; sI++) {
      var hh = new D.Heap(4096), out = new Int32Array(3000), m = 0, st = sI + 1;
      dist[sites[sI]] = 0; stamp[sites[sI]] = st; hh.push(0, sites[sI]);
      while (hh.n && m < 3000) {
        var cc = hh.pop(), dk = hh.lastKey; if (dk > dist[cc] || stamp[cc] === -st) continue;
        stamp[cc] = -st; out[m++] = cc;
        var aq = cc % W, ar = (cc / W) | 0;
        for (k = 0; k < 4; k++) {
          var br = ar + NB[k][1]; if (br < 0 || br >= H) continue;
          var b = br * W + (((aq + NB[k][0]) % W) + W) % W; if (elev[b] < sea || stamp[b] === -st) continue;
          var nd = dk + 10 + (Math.abs(filled[b] - filled[cc]) >> 6);
          if (stamp[b] !== st || nd < dist[b]) { stamp[b] = st; dist[b] = nd; hh.push(nd, b); }
        }
      }
      orders.push(out.subarray(0, m));
    }
    T.dijkstra = now() - t; T.total = now() - t0;
    var fp = 2166136261; fp = fnv(fp, elev); fp = fnv(fp, filled); fp = fnv(fp, down); fp = fnv(fp, flow); orders.forEach(function (o) { fp = fnv(fp, o); });
    Object.keys(T).forEach(function (k2) { T[k2] = Math.round(T[k2] * 10) / 10; });
    return { ms: T, fingerprint: ('00000000' + fp.toString(16)).slice(-8), sea: sea, sites: sites.length, maxFlow: Math.max.apply(null, flow), sinCheck: [D.isin(0), D.isin(1024), D.isin(512), D.isin(3000)] };
  };

  if (typeof module !== 'undefined' && require.main === module) {
    var C = require('../../map/coords.js').make(128, 256), D = require('../../core/dmath.js');
    for (var run = 0; run < 3; run++) console.log(JSON.stringify(PVB.genProto(C, D, 7)));
  }
})(typeof window !== 'undefined' ? window : global);
