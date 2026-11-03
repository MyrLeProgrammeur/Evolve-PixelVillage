/* J0 spike: placeholder planet (not the real generator). Periodic value noise on the wrapped band, sea level by histogram,
   9 terrain kinds, elevation per tile, and towns: clusters of kit shell() buildings ringed by fields. No legacy village.
   Needs the kit (palette + spritekit) and map/coords.js. Works for any size; the bench uses 1280 x 2560 tiles. */
(function (G) {
  'use strict';
  var PVB = G.PVB = G.PVB || {};

  // Value noise periodic in u (period P lattice cells); lattice hash from the kit's integer hash.
  function pnoise(ih, u, v, cell, P, seed) {
    var x = u / cell, y = v / cell, xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var x0 = ((xi % P) + P) % P, x1 = (x0 + 1) % P;
    var a = ih(x0, yi, seed), b = ih(x1, yi, seed), c = ih(x0, yi + 1, seed), d = ih(x1, yi + 1, seed);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  // kinds: 0 deep sea, 1 shallow, 2 beach, 3 grass, 4 forest, 5 desert, 6 snow, 7 mountain, 8 fields
  var K_DEEP = 0, K_SHALLOW = 1, K_BEACH = 2, K_GRASS = 3, K_FOREST = 4, K_DESERT = 5, K_SNOW = 6, K_MOUNT = 7, K_FIELD = 8;
  var SPECS = [
    { w: 0.75, d: 0.75, h: 10, wall: { tex: 'tex_planks', ramp: 'walnut' }, roof: { type: 'gable', axis: 'x', tex: 'tex_thatch', ramp: 'straw' } },
    { w: 0.75, d: 0.75, h: 12, wall: { tex: 'tex_brick', ramp: 'brick' }, roof: { type: 'gable', axis: 'y', tex: 'tex_tiles', ramp: 'terracotta' } },
    { w: 1, d: 0.75, h: 14, wall: { tex: 'tex_cutstone', ramp: 'sandstone' }, roof: { type: 'hip', tex: 'tex_shingles', ramp: 'slate' } },
    { w: 0.75, d: 1, h: 18, wall: { tex: 'tex_brick', ramp: 'ironbrick' }, roof: { type: 'flat', ramp: 'slate' } },
    { w: 1, d: 1, h: 26, wall: { tex: 'tex_cutstone', ramp: 'lime' }, roof: { type: 'hip', tex: 'tex_tiles', ramp: 'terracotta' } },
    { w: 0.75, d: 0.75, h: 34, wall: { tex: 'tex_glasspane', ramp: 'glass' }, roof: { type: 'flat', ramp: 'steel' } },
    { w: 0.5, d: 0.5, h: 16, shape: 'round', r: 7, wall: { tex: 'tex_cutstone', ramp: 'sandstone' }, roof: { type: 'cone', tex: 'tex_shingles', ramp: 'slate', H: 10 } },
    { w: 1, d: 1, h: 12, wall: { tex: 'tex_wattle', ramp: 'ochre' }, roof: { type: 'gable', axis: 'x', tex: 'tex_thatch', ramp: 'reed' } }
  ];

  PVB.makeWorld = function (C, seed, opt) {
    opt = opt || {};
    var K = G.SpriteKit._, ih = K.ih, W = C.W, H = C.H, N = C.N, sc = W / 128;
    seed = seed | 0 || 1;
    var e = new Float32Array(N), m = new Float32Array(N);
    var OCT = [[32, 1], [16, 0.5], [8, 0.25], [4, 0.125], [2, 0.0625], [1, 0.03]].filter(function (o) { return o[0] * sc >= 4; })
      .map(function (o) { return [o[0] * sc, o[1]]; });
    var wsum = 0; OCT.forEach(function (o) { wsum += o[1]; });
    var emin = Infinity, emax = -Infinity;
    for (var r = 0; r < H; r++) {
      var lat = Math.abs(r - H / 2) / (H / 2), pol = 0.25 * lat * lat * lat, v = r / 2;
      for (var q = 0; q < W; q++) {
        var u = q - r / 2, s = 0, i = r * W + q;
        for (var o = 0; o < OCT.length; o++) s += OCT[o][1] * pnoise(ih, u, v, OCT[o][0], W / OCT[o][0], seed + o);
        var ev = s / wsum - pol; e[i] = ev; if (ev < emin) emin = ev; if (ev > emax) emax = ev;
        m[i] = 0.5 * pnoise(ih, u, v, 16 * sc, 8, seed + 77) + 0.3 * pnoise(ih, u, v, 4 * sc, 32, seed + 78) + 0.2 * pnoise(ih, u, v, sc, 128, seed + 79);
      }
    }
    // sea level and shelf by histogram (no sort of millions of floats)
    var NB = 4096, hist = new Uint32Array(NB), span = emax - emin || 1;
    for (i = 0; i < N; i++) hist[Math.min(NB - 1, ((e[i] - emin) / span * NB) | 0)]++;
    function pctl(p) { var t = N * p, acc = 0; for (var b = 0; b < NB; b++) { acc += hist[b]; if (acc >= t) return emin + (b + 1) / NB * span; } return emax; }
    var sea = pctl(0.6), deep = pctl(0.45);
    var kind = new Uint8Array(N), tone = new Uint8Array(N), elev = new Uint8Array(N), bld = new Int8Array(N).fill(-1), land = 0;
    for (i = 0; i < N; i++) {
      r = (i / W) | 0;
      // noisy latitude so climate bands do not follow straight lines
      lat = Math.abs(r - H / 2) / (H / 2) + (m[i] - 0.5) * 0.16;
      var h = (e[i] - sea) / (emax - sea), k;
      if (lat > 0.92) k = K_SNOW;
      else if (e[i] < deep) k = K_DEEP;
      else if (e[i] < sea) k = K_SHALLOW;
      else if (h > 0.6) k = K_MOUNT;
      else if (lat > 0.8) k = K_SNOW;
      else if (lat < 0.35 && m[i] < 0.4) k = K_DESERT;
      else if (m[i] > 0.56 || lat > 0.64) k = K_FOREST;
      else k = K_GRASS;
      kind[i] = k; tone[i] = ih(i, 3, seed) < 0.5 ? 0 : 1;
      elev[i] = e[i] < sea ? Math.max(0, Math.min(255, ((e[i] - emin) / (sea - emin) * 255) | 0)) : Math.max(0, Math.min(255, (h * 255) | 0));
      if (k === K_MOUNT) elev[i] = Math.max(128, Math.min(255, (128 + (h - 0.6) / 0.4 * 127) | 0));
      if (k >= K_GRASS && k !== K_MOUNT && k !== K_SNOW) land++;
    }
    e = null; m = null;
    // beaches: low land touching the sea (one or two tiles), not a wide low plain
    var N8 = [[1, 1], [-1, -1], [0, 1], [0, -1], [1, 2], [-1, -2], [1, 0], [-1, 0]];
    var beach = new Uint8Array(N);
    for (i = 0; i < N; i++) {
      var kk0 = kind[i]; if (kk0 <= K_SHALLOW || kk0 === K_MOUNT || kk0 === K_SNOW || elev[i] > 20) continue;
      var q0 = i % W, r0 = (i / W) | 0, wet = 0;
      for (var n8 = 0; n8 < 8 && !wet; n8++) { var nr = r0 + N8[n8][1]; if (nr < 0 || nr >= H) continue; if (kind[nr * W + (q0 + N8[n8][0] + W) % W] <= K_SHALLOW) wet = 1; }
      if (wet || (elev[i] < 8 && ih(i, 41, seed) < 0.5 && hasWater2(q0, r0))) beach[i] = 1;
    }
    function hasWater2(q0, r0) { for (var dr = -2; dr <= 2; dr++) for (var dq = -2; dq <= 2; dq++) { var nr = r0 + dr; if (nr >= 0 && nr < H && kind[nr * W + (q0 + dq + W) % W] <= K_SHALLOW) return true; } return false; }
    for (i = 0; i < N; i++) if (beach[i]) kind[i] = K_BEACH;
    // towns: centres on habitable land, buildings densest at the centre, fields around
    var towns = [], want = opt.towns || Math.round(2.5 * sc * sc), tries = 0;
    function habitable(t) { var kk = kind[t]; return kk === K_GRASS || kk === K_FOREST || kk === K_DESERT; }
    while (towns.length < want && tries < want * 200) {
      var c = Math.floor(ih(tries++, 17, seed) * N); if (!habitable(c)) continue;
      var cq = c % W, cr = (c / W) | 0, R = 4 + Math.floor(ih(c, 19, seed) * 9), ok = true;
      for (var t2 = 0; t2 < towns.length && ok; t2++) { var dq0 = Math.abs(C.dq(towns[t2].q, cq)), dr0 = Math.abs(towns[t2].r - cr); if (dq0 + dr0 < (towns[t2].R + R) * 2.5) ok = false; }
      if (!ok) continue;
      var nb = 0, RF = R * 1.9;
      for (var dx = -Math.ceil(RF); dx <= RF; dx++) for (var dy = -Math.ceil(RF); dy <= RF; dy++) {
        var d = Math.sqrt(dx * dx + dy * dy), ti = C.idx(cq + dx, cr + dx + dy); if (ti < 0 || !habitable(ti)) continue;
        var hv = ih(ti, 23, seed);
        if (d < R && hv < 0.9 * (1 - d / R) + 0.1) {
          var core = d < R * 0.35, sp = core ? (hv < 0.5 ? 4 : hv < 0.75 ? 5 : 3) : Math.floor(ih(ti, 29, seed) * 8);
          if (!core && (sp === 4 || sp === 5)) sp = sp === 4 ? 1 : 0;
          bld[ti] = sp; nb++; kind[ti] = K_GRASS;
        } else if (d < RF && hv < 0.75) kind[ti] = K_FIELD;
      }
      towns.push({ q: cq, r: cr, R: R, buildings: nb });
    }
    var col = {}, Rk = K.R;
    var shells = SPECS.map(function (sp) { return K.shell(sp); });
    var nbT = 0; for (i = 0; i < N; i++) if (bld[i] >= 0) nbT++;
    towns.sort(function (a, b) { return b.buildings - a.buildings; });
    return { C: C, seed: seed, kind: kind, tone: tone, elev: elev, bld: bld, shells: shells, land: land, buildings: nbT, towns: towns,
      K: { DEEP: K_DEEP, SHALLOW: K_SHALLOW, BEACH: K_BEACH, GRASS: K_GRASS, FOREST: K_FOREST, DESERT: K_DESERT, SNOW: K_SNOW, MOUNT: K_MOUNT, FIELD: K_FIELD },
      ocean: [Rk('abyss', 2), Rk('abyss', 1), Rk('water', 2)] };
  };
})(typeof window !== 'undefined' ? window : global);
