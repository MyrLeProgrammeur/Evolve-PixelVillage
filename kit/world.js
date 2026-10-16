/* Evolve village sprite kit — Batch 6: decor scatter (trees, rocks, plants, plaza furniture), animals,
   sky (weather tint, sun, moon phase), weather (cloud shadows, clouds, rain, snow, lightning, wind),
   ambient particles (campfire, falling leaves, butterflies, birds) and tap feedback (ripple, +1 pop, group icon). */
(function (G) {
  'use strict';
  var SK = G.SK = G.SK || {};
  SK._ext = (SK._ext || []).filter(function (e) { return e.id !== 'world'; });
  SK._ext.push({ id: 'world', fn: reg });
  if (SK._runExt) SK._runExt();
  function reg() {
  if (!SK.village || !SK.village.vil || !SK.village.depth || !G.SpriteKit || !SK.PARTS || !SK.PARTS.b6) return false;
  var X = G.SpriteKit._, R = X.R, Pix = X.Pix, VL = SK.village, floor = Math.floor, round = Math.round, PI = Math.PI;
  var WW = X.WW, WH = X.WH, N = X.MAPN, wp = X.worldPt, ih = X.ih, P = SK.PIECES;

  var TREES = {
    grassland: { pine: 0.42, broad: 0.5, dead: 0.04, density: 1 }, oceanic: { pine: 0.3, broad: 0.62, dead: 0.03, density: 0.75 },
    forest: { pine: 0.45, broad: 0.5, dead: 0.03, density: 1.6 }, desert: { pine: 0, broad: 0.1, dead: 0.3, density: 0.45, bush: 3 },
    volcanic: { pine: 0.2, broad: 0, dead: 0.8, density: 0.6 }, tundra: { pine: 0.88, broad: 0, dead: 0.12, density: 0.8 },
    savanna: { pine: 0, broad: 0.9, dead: 0.08, density: 0.5, bush: 2 }, swamp: { pine: 0.1, broad: 0.45, dead: 0.42, density: 1.1 },
    ashland: { pine: 0.35, broad: 0, dead: 0.65, density: 0.6 }, taiga: { pine: 0.88, broad: 0.1, dead: 0.02, density: 1.4 },
    hellscape: { pine: 0, broad: 0, dead: 1, density: 0.45 }, eden: { pine: 0.2, broad: 0.75, dead: 0, density: 1.3, bush: 2 }
  };
  function cal(st) { return (st && st.city && st.city.calendar) || {}; }
  function env(season, biome) {
    var S = X.SEASONS[season] || X.SEASONS[1], B = X.BIOMES[biome] || {}, winter = !!((S.snow && !B.hot) || B.snow);
    return { S: S, B: B, winter: winter, season: season, biome: biome, fol: winter ? 'frost' : (B.tree || S.tree), grass: winter ? 'frost' : (B.grass || S.grass),
      pine: B.tree && B.tree !== 'lush' && B.tree !== 'frost' ? B.tree : 'conifer', rock: B.rock || 'river' };
  }

  /* ---------- sprite variants: snow caps, blossom, berries ---------- */
  var VAR = new Map();
  function variant(name, map, opt) {
    opt = opt || {};
    var key = name + '|' + JSON.stringify(map || {}) + '|' + JSON.stringify(opt);
    var hit = VAR.get(key); if (hit) return hit;
    var s = X.sprite(name, map, { flip: !!opt.flip }), p = new Pix(s.w, s.h); p.d.set(s.d);
    var fol = (map && map.FOLIAGE) || (P[name].def && P[name].def.FOLIAGE) || 'summer';
    if (opt.blossom || opt.berries) for (var y = 0; y < p.h; y++) for (var x = 0; x < p.w; x++) {
      var c = s.d[y * p.w + x], q = y * p.w + x;
      if (opt.blossom && (c === R(fol, 0) || c === R(fol, 1)) && ih(x, y, 77) < 0.13) p.d[q] = R(opt.blossom, ih(x, y, 78) < 0.5 ? 0 : 1);
      if (opt.berries && (c === R(fol, 1) || c === R(fol, 2)) && ih(x, y, 79) < 0.09) p.d[q] = ih(x, y, 80) < 0.3 ? X.pal().spark : R(opt.berries, 1);
    }
    if (opt.snow) for (x = 0; x < p.w; x++) for (y = 0; y < p.h; y++) {
      if (!s.d[y * p.w + x]) continue;
      if (y === 0 || !s.d[(y - 1) * p.w + x]) { p.d[y * p.w + x] = R('snow', 0); if (opt.snow > 1 && y + 1 < p.h && s.d[(y + 1) * p.w + x]) p.d[(y + 1) * p.w + x] = R('snow', 1); }
    }
    VAR.set(key, p); if (VAR.size > 900) VAR.delete(VAR.keys().next().value);
    return p;
  }
  function look(kind, E, seed) {
    var flip = ih(seed, 3, 91) < 0.5, w = E.winter;
    switch (kind) {
      case 'pine': return { n: 'tree_pine', m: { FOLIAGE: E.pine, WOOD: 'walnut' }, o: { flip: flip, snow: w ? 2 : 0 } };
      case 'broad': return w ? { n: 'tree_dead', m: { WOOD: 'walnut' }, o: { flip: flip, snow: 1 } }
        : { n: 'tree_broadleaf', m: { FOLIAGE: E.fol, WOOD: 'oak' }, o: { flip: flip, blossom: E.season === 0 && !E.B.tree ? (ih(seed, 4, 92) < 0.5 ? 'rose' : 'cream') : 0 } };
      case 'dead': return { n: 'tree_dead', m: { WOOD: 'driftwood' }, o: { flip: flip, snow: w ? 1 : 0 } };
      case 'sapling': return { n: 'sapling', m: { FOLIAGE: E.fol, WOOD: 'oak' }, o: { flip: flip, snow: w ? 1 : 0 } };
      case 'stump': return { n: 'stump', m: { WOOD: 'oak', FOLIAGE: E.grass }, o: { flip: flip, snow: w ? 1 : 0 } };
      case 'bush': return { n: 'bush', m: { FOLIAGE: E.fol, WOOD: 'walnut' }, o: { flip: flip, snow: w ? 2 : 0, berries: (E.season === 1 || E.season === 2) && !w ? 'madder' : 0 } };
      case 'rock_small': case 'rock_big': return { n: kind, m: { MAIN: E.rock, FOLIAGE: E.grass }, o: { flip: flip, snow: w ? 1 : 0 } };
      case 'tuft_a': return { n: 'tuft_flowers_a', m: { FOLIAGE: E.grass, ACCENT: ['rose', 'plum', 'cream'][floor(ih(seed, 5, 93) * 3)] }, o: { flip: flip } };
      case 'tuft_b': return { n: 'tuft_flowers_b', m: { FOLIAGE: E.grass, ACCENT: ['saffron', 'indigo', 'madder'][floor(ih(seed, 6, 94) * 3)] }, o: { flip: flip } };
      case 'mushrooms': return { n: 'mushrooms', m: { FOLIAGE: E.grass }, o: { flip: flip } };
      case 'reeds': return { n: 'tuft_flowers_b', m: { FOLIAGE: E.biome === 'swamp' ? 'murk' : 'reed', ACCENT: 'walnut' }, o: { flip: flip } };
    }
    return { n: kind, m: {}, o: { snow: w ? 1 : 0 } };
  }

  /* ---------- decor scatter (deterministic; never on building slots, paths, plaza or water) ---------- */
  var RES = null;
  function reserved() {
    if (RES) return RES;
    var S = VL.slots(), B = {}; X.BUILDINGS.forEach(function (b) { B[b.key] = b; });
    RES = new Uint8Array(N * N);
    Object.keys(S).forEach(function (t) { S[t].forEach(function (s) { for (var y = s.y; y < s.y + B[t].fd; y++) for (var x = s.x; x < s.x + B[t].fw; x++) if (x >= 0 && y >= 0 && x < N && y < N) RES[y * N + x] = 1; }); });
    return RES;
  }
  var DEC = { key: '', list: [], trees: [], spots: {} };
  function scatter(season, biome, nLY, started) {
    if (started === undefined) started = true;
    var key = season + '|' + biome + '|' + nLY + '|' + (started ? 1 : 0); if (DEC.key === key) return DEC;
    var E = env(season, biome), TS = TREES[biome] || TREES[String(biome).split('+')[0]] || TREES.grassland, rs = reserved(), T = X.layout(), list = [], trees = [], pts = [];
    function tt(u, v) { var x = floor(u), y = floor(v); if (x < 0 || y < 0 || x >= N || y >= N) return 0; var q = y * N + x; return rs[q] ? 0 : T[q]; }
    function far(u, v, d) { for (var i = 0; i < pts.length; i++) if (Math.hypot(pts[i][0] - u, pts[i][1] - v) < d) return false; return true; }
    var clear = Math.max(0.3, 1 - 0.14 * nLY);
    for (var gy = 0.2; gy < N - 0.2; gy += 0.62) for (var gx = 0.2; gx < N - 0.2; gx += 0.62) {
      var ix = round(gx * 10), iy = round(gy * 10), u = gx + ih(ix, iy, 501) * 0.45, v = gy + ih(ix, iy, 502) * 0.45, ty = tt(u, v);
      if (ty !== 1 && ty !== 6 && ty !== 5) continue;
      var e = Math.max(Math.abs(u - 12), Math.abs(v - 12)); if (e < 7.4) continue;
      var r = ih(ix, iy, 503), base = Math.min(1, (e - 7.2) / 3) * 0.85 * TS.density;
      if (ty === 5) base *= 0.25; if (u + v > 40) base *= 0.35;
      if (r >= base || !far(u, v, 1.05)) continue;
      pts.push([u, v]);
      var kind;
      if (r >= base * clear) kind = 'stump';
      else { var q = ih(ix, iy, 504); kind = q < TS.pine ? 'pine' : q < TS.pine + TS.broad ? 'broad' : q < TS.pine + TS.broad + TS.dead ? 'dead' : (TS.bush ? 'bush' : 'sapling'); }
      list.push({ kind: kind, u: u, v: v, seed: ix * 31 + iy });
      if (kind !== 'stump' && kind !== 'bush') trees.push([u, v]);
    }
    var bushMul = TS.bush || 1;
    for (gy = 0.3; gy < N - 0.3; gy += 0.7) for (gx = 0.3; gx < N - 0.3; gx += 0.7) {
      ix = round(gx * 10) + 7; iy = round(gy * 10) + 3; u = gx + ih(ix, iy, 511) * 0.4; v = gy + ih(ix, iy, 512) * 0.4; ty = tt(u, v);
      if (!ty || ty === 2 || ty === 3 || ty === 4) continue;
      r = ih(ix, iy, 513); var k2 = null, d = 0.8;
      if (ty === 5 || ty === 6) { if (r < 0.06) { k2 = 'rock_big'; d = 1.5; } else if (r < 0.2) k2 = 'rock_small'; }
      else if (r < 0.03 * bushMul) { k2 = 'bush'; d = 1; }
      else if (!E.winter && r < 0.03 * bushMul + 0.035) k2 = 'tuft_a';
      else if (!E.winter && r < 0.03 * bushMul + 0.065) k2 = 'tuft_b';
      else if ((season === 0 || season === 2) && r < 0.03 * bushMul + 0.08 && Math.max(Math.abs(u - 12), Math.abs(v - 12)) > 6) k2 = 'mushrooms';
      else if (r < 0.03 * bushMul + 0.088) k2 = 'rock_small';
      if (!k2 || !far(u, v, d)) continue;
      pts.push([u, v]); list.push({ kind: k2, u: u, v: v, seed: ix * 17 + iy });
    }
    var reedP = { swamp: 0.55, oceanic: 0.22, grassland: 0.16, eden: 0.2, forest: 0.12, taiga: 0.1 }[biome] || 0;
    if (reedP && !E.winter) for (var ry = 0; ry < N; ry++) for (var rx = 0; rx < N; rx++) {
      var tq = T[ry * N + rx]; if (tq !== 1 && tq !== 6) continue;
      var wet = (rx > 0 && T[ry * N + rx - 1] === 4) || (rx < N - 1 && T[ry * N + rx + 1] === 4) || (ry > 0 && T[(ry - 1) * N + rx] === 4) || (ry < N - 1 && T[(ry + 1) * N + rx] === 4);
      if (!wet || rs[ry * N + rx]) continue;
      for (var rk = 0; rk < 2; rk++) { var ru = rx + 0.2 + ih(rx, ry, 531 + rk) * 0.6, rv = ry + 0.2 + ih(ry, rx, 533 + rk) * 0.6;
        if (ih(rx * 3 + rk, ry, 535) < reedP && far(ru, rv, 0.5)) { pts.push([ru, rv]); list.push({ kind: 'reeds', u: ru, v: rv, seed: rx * 41 + ry * 7 + rk }); } }
    }
    /* camp fire ring always; sundial, lantern posts (and their bunting) and signpost only once the calendar runs (tech.primitive >= 3) */
    var fix = [['fire_ring', 11.05, 11.05]];
    if (started) fix.push(['lantern_post', 10.15, 10.15], ['lantern_post', 13.85, 10.15], ['lantern_post', 10.15, 13.85], ['lantern_post', 13.85, 13.85], ['sundial', 13.35, 12.45]);
    var sign = started && [[9.5, 12.5], [14.5, 11.5], [12.5, 9.5], [11.5, 14.5]].filter(function (q) { var x = tt(q[0], q[1]); return x === 2 || x === 1; })[0];
    if (sign) fix.push(['signpost', sign[0] + 0.3, sign[1] + 0.3]);
    for (var a = 0; a < 24; a++) { var ang = a / 24 * PI * 2 + 0.4, su = 12 + Math.cos(ang) * 6.6, sv = 12 + Math.sin(ang) * 6.6; if (tt(su, sv) === 1 && far(su, sv, 1.2)) { fix.push(['standing_stone', su, sv]); break; } }
    fix.forEach(function (f, i) { list.push({ kind: f[0], u: f[1], v: f[2], seed: 900 + i }); });
    var rab = list.filter(function (o) { return o.kind === 'bush' || o.kind === 'tuft_a' || o.kind === 'tuft_b'; });
    var edgeT = trees.slice().sort(function (p, q) { return (p[0] + p[1]) - (q[0] + q[1]); });
    var water = []; for (var y = 1; y < N - 1; y++) for (var x = 1; x < N - 1; x++) { var q2 = y * N + x; if (T[q2] === 4 && T[q2 - 1] === 4 && T[q2 + 1] === 4 && T[q2 - N] === 4 && T[q2 + N] === 4) water.push([x + 0.5, y + 0.5]); }
    DEC = { key: key, list: list, trees: trees, E: E, spots: {
      deer: [edgeT[floor(edgeT.length * 0.2)], edgeT[floor(edgeT.length * 0.55)]].filter(Boolean),
      boar: edgeT[floor(edgeT.length * 0.8)] || null,
      rabbits: [rab[1], rab[floor(rab.length / 2)], rab[rab.length - 2]].filter(Boolean).map(function (o) { return [o.u + 0.4, o.v + 0.3]; }),
      fish: [water[floor(water.length * 0.3)], water[floor(water.length * 0.75)]].filter(Boolean) } };
    return DEC;
  }
  function inward(p, d) { var du = 12 - p[0], dv = 12 - p[1], L = Math.hypot(du, dv) || 1; return [p[0] + du / L * d, p[1] + dv / L * d]; }

  /* items handed to the village static pass; merged into its depth sort with the buildings */
  var DAY = 0;
  function decor(ctx) {
    var items = (VL.vil.plan && VL.vil.plan.list) || [], nLY = items.filter(function (i) { return i.type === 'lumber_yard'; }).length;
    var D = scatter(ctx.season, ctx.biome || 'grassland', nLY, VL.vil.started !== false), E = D.E, S = E.S, T = ctx.T;
    DAY = cal(ctx.state).day | 0;
    return D.list.map(function (o) {
      var L = look(o.kind, E, o.seed), d = P[L.n], s = variant(L.n, L.m, L.o), ax = L.o.flip ? d.w - 1 - d.anchor[0] : d.anchor[0], ay = d.anchor[1];
      var big = /tree|stone|lantern|sign/.test(L.n), tall = d.h;
      return { k: o.u + o.v, v: o.v,
        shadow: function (b) {
          var g = wp(o.u, o.v), cx = round(g[0]) + round(tall * 0.18 * S.shadow), cy = round(g[1]), rx = big ? Math.max(4, round(d.w * 0.42)) : round(d.w * 0.4), ry = Math.max(1, round(rx / 2.4));
          for (var y = -ry; y <= ry; y++) for (var x = -rx; x <= rx; x++) { if ((x * x) / (rx * rx) + (y * y) / (ry * ry) > 1) continue; var px = cx + x, py = cy + y; if (px < 0 || py < 0 || px >= WW || py >= WH) continue; var q = py * WW + px; if (T[q]) b.d[q] = X.shift(b.d[q], 1); }
        },
        draw: function (b, blitD) {
          var g = wp(o.u, o.v), bx = round(g[0]) - ax, by = round(g[1]) - ay;
          blitD(b, s, bx, by, o.u + o.v, -1);
          if (o.kind === 'sundial') { var a = (DAY % 24) / 24 * PI * 2, fx = bx + 7, fy = by + 2;
            for (var i = 1; i <= 4; i++) b.set(fx + round(Math.cos(a) * i), fy + round(Math.sin(a) * i * 0.5) + 1, R('sandstone', 3)); }
          if (o.kind === 'lantern_post') o.top = [bx + (L.o.flip ? d.w - 2 : 1), by];
        }, o: o };
    });
  }
  function after(b, ctx) {
    var D = DEC; if (!D.list) return;
    var posts = D.list.filter(function (o) { return o.kind === 'lantern_post' && o.top; });
    if (posts.length === 4 && !D.E.winter) {
      VL.bunt(b, posts[0].top, posts[1].top, 0.21); VL.bunt(b, posts[2].top, posts[3].top, 0.64);
    }
    if (posts[1] && posts[1].top) { var t = posts[1].top, ink = X.pal().ink;
      b.set(t[0], t[1] - 1, ink); b.set(t[0] + 1, t[1] - 1, ink); b.set(t[0] - 1, t[1] - 2, ink); b.set(t[0] + 2, t[1] - 1, R('saffron', 2)); b.set(t[0], t[1] - 2, R('soot', 1)); }
  }

  /* ---------- sky: weather tint, sun with pixel halo, moon with exact phase ---------- */
  var SKYC = [];
  function sky(b, ctx) {
    var c = cal(ctx.state), w = c.weather == null ? 2 : c.weather | 0, s0 = R('sky', 0), s1 = R('sky', 1);
    var m = w === 2 ? null : w === 1 ? [R('haze', 0), R('haze', 1)] : [R('slate', 0), R('slate', 1)];
    SKYC = m || [s0, s1];
    if (m) for (var i = 0, n = Math.min(b.d.length, (X.NY + 80) * WW); i < n; i++) { var v = b.d[i]; if (v === s0) b.d[i] = m[0]; else if (v === s1) b.d[i] = m[1]; }
    var nt = ctx.opt && ctx.opt.night;
    if (nt) for (var si = 0; si < 90; si++) { var sx = floor(ih(si, 1, 951) * WW), sy = floor(ih(si, 2, 952) * (X.NY + 60)); if (isSky(b.d[sy * WW + sx])) b.d[sy * WW + sx] = si % 7 ? R('ember', 0) : X.pal().spark; }
    if (w !== 0 && !nt) sun(b, 236, 196);
    if (w !== 0) { moon(b, 612, 192, nt, ((c.moon | 0) % 28 + 28) % 28); }
  }
  function isSky(v) { return v === SKYC[0] || v === SKYC[1]; }
  function sun(b, cx, cy) {
    var rings = [[10, R('ember', 0)], [13, R('cream', 0)], [16, R('sky', 0)]];
    for (var y = -17; y <= 17; y++) for (var x = -17; x <= 17; x++) {
      var d = Math.hypot(x + 0.5, y + 0.5), q = (cy + y) * WW + cx + x, v = b.d[q]; if (!isSky(v)) continue;
      if (d < 7) b.d[q] = (d > 3.2 && x + y < -4) ? R('ember', 0) : (d > 5.6 && x + y > 2 ? R('ember', 2) : R('ember', 1));
      else rings.forEach(function (r) { if (Math.abs(d - r[0]) < 0.5) b.d[q] = r[1]; });
    }
  }
  function moon(b, cx, cy, nt, ph) {
    var r = 6, k = Math.cos(ph / 28 * PI * 2);
    for (var y = -r; y < r; y++) for (var x = -r; x < r; x++) {
      var dx = x + 0.5, dy = y + 0.5; if (dx * dx + dy * dy > r * r) continue;
      var q = (cy + y) * WW + cx + x; if (!isSky(b.d[q])) continue;
      var w = Math.sqrt(r * r - dy * dy), xt = Math.min(k * w, w - 1.1), lit = ph === 14 || (ph < 14 ? dx > xt : dx < -xt);
      if (ph === 0) lit = false;
      var rim = dx * dx + dy * dy > (r - 1.2) * (r - 1.2) && dx > 0;
      b.d[q] = lit ? (nt ? R('ember', rim ? 1 : 0) : R('cream', rim ? 1 : 0)) : R('sky', 2);
    }
  }

  /* ---------- actors ---------- */
  var KS = 1;
  function dep(D, x, y) { return D ? D[((y / KS) | 0) * WW + ((x / KS) | 0)] : -1e9; }
  function blitA(b, s, gx, gy, ax, ay, d, D, flip) {
    var ox = gx - (flip ? s.w - 1 - ax : ax), oy = gy - ay;
    for (var j = 0; j < s.h; j++) { var ty = oy + j; if (ty < 0 || ty >= b.h) continue;
      for (var i = 0; i < s.w; i++) { var c = s.d[j * s.w + (flip ? s.w - 1 - i : i)]; if (!c) continue; var tx = ox + i; if (tx < 0 || tx >= b.w) continue; var q = ty * b.w + tx; if (D && dep(D, tx, ty) > d) continue; b.d[q] = c; } }
  }
  function foot(b, gx, gy, w, d, D) { for (var k = -w; k <= w; k++) { var x = gx + k, q = (gy + 1) * b.w + x; if (x < 0 || x >= b.w || q < 0 || q >= b.d.length) continue; if (dep(D, x, gy + 1) <= d) b.d[q] = X.shift(b.d[q], 1); } }
  function wander(A, B, t, rest, walk, off) {
    var C = 2 * rest + 2 * walk, p = ((t / 1000 + off) % C + C) % C, sx = (B[0] - A[0]) - (B[1] - A[1]), f = sx >= 0 ? 0 : 1;
    if (p < rest) return { u: A[0], v: A[1], mv: 0, flip: !!f };
    if (p < rest + walk) { var a = (p - rest) / walk; return { u: A[0] + (B[0] - A[0]) * a, v: A[1] + (B[1] - A[1]) * a, mv: 1, flip: !!f }; }
    if (p < 2 * rest + walk) return { u: B[0], v: B[1], mv: 0, flip: !f };
    a = (p - 2 * rest - walk) / walk; return { u: B[0] + (A[0] - B[0]) * a, v: B[1] + (A[1] - B[1]) * a, mv: 1, flip: !f };
  }
  function animals(b, ctx, D) {
    var t = ctx.t, Sp = DEC.spots || {}, list = [], c = cal(ctx.state), rain = (c.weather | 0) === 0 && c.weather != null;
    (Sp.deer || []).forEach(function (h, i) {
      var A = inward(h, 0.9), B = [A[0] + (i ? -1.3 : 1.3), A[1] + (i ? 0.4 : -0.4)], s = wander(A, B, t, 5 + i * 2, 3.2, i * 4.1);
      var n = s.mv ? (floor(t / 250) % 2 ? 'deer_step_b' : 'deer_step_a') : 'deer_rest';
      list.push({ u: s.u, v: s.v, flip: s.flip, n: n, m: { MAIN: 'ochre', ACCENT: 'cream' }, layer: i === 0 ? 'antlers_layer' : null, fw: 4 });
    });
    if (Sp.boar) { var A2 = inward(Sp.boar, 0.8), B2 = [A2[0] + 1, A2[1] + 0.9], s2 = wander(A2, B2, t, 4.5, 2.6, 2.3);
      list.push({ u: s2.u, v: s2.v, flip: s2.flip, n: s2.mv ? (floor(t / 250) % 2 ? 'boar_b' : 'boar_a') : (floor(t / 600) % 2 ? 'boar_c' : 'boar_a'), m: { MAIN: 'walnut', ACCENT: 'cream' }, fw: 3 }); }
    ((VL.vil.plan && VL.vil.plan.list) || []).filter(function (it) { return it.type === 'farm'; }).slice(0, 2).forEach(function (it, i) {
      var A = [it.x + 2.3, it.y + 0.45], B = [it.x + 2.3, it.y + 1.45], s = wander(A, B, t, 3.5, 2.2, i * 3.3);
      list.push({ u: s.u, v: s.v, flip: s.flip, n: s.mv ? (floor(t / 250) % 2 ? 'boar_b' : 'boar_a') : 'boar_c', m: { MAIN: 'rosewash', ACCENT: 'rose' }, fw: 3 });
    });
    if (!rain) (Sp.rabbits || []).forEach(function (h, i) {
      var A = h, B = [h[0] + (i % 2 ? 0.8 : -0.8), h[1] + 0.5], s = wander(A, B, t, 2.2 + i * 0.6, 0.45, i * 1.7);
      list.push({ u: s.u, v: s.v, flip: s.flip, n: s.mv ? 'rabbit_hop' : 'rabbit_sit', m: { MAIN: i === 1 ? 'hide' : 'driftwood', ACCENT: 'cream' }, dy: s.mv ? -2 : 0, fw: 2 });
    });
    list.sort(function (a, b2) { return (a.u + a.v) - (b2.u + b2.v); }).forEach(function (a) {
      var g = wp(a.u, a.v), gx = round(g[0] * KS), gy = round(g[1] * KS), d = a.u + a.v, pc = P[a.n];
      foot(b, gx, gy, a.fw, d, D);
      blitA(b, X.sprite(a.n, a.m), gx, gy + (a.dy || 0), pc.anchor[0], pc.anchor[1], d, D, a.flip);
      if (a.layer) blitA(b, X.sprite(a.layer), gx, gy, pc.anchor[0], pc.anchor[1], d, D, a.flip);
    });
    if (!ctx.tr || !ctx.tr.frozen) (Sp.fish || []).forEach(function (h, i) {
      var per = 7000 + i * 1900, p = ((t + i * 2600) % per) / 900; if (p > 1.15) return;
      var g = wp(h[0], h[1]), gx = round(g[0] * KS), gy = round(g[1] * KS), wv = R('water', 0);
      if (p <= 1) { var x = gx - 5 * KS + round(p * 10 * KS), y = gy - round(Math.sin(p * PI) * 8 * KS); blitA(b, X.sprite('fish', { MAIN: i ? 'saffron' : 'iron' }), x, y, 3, 2, 0, null, false); }
      if (p < 0.18 || p > 0.86) { var sx = p < 0.18 ? gx - 5 * KS : gx + 5 * KS; b.set(sx - 1, gy, wv); b.set(sx + 1, gy, wv); b.set(sx, gy - 1, X.pal().spark); }
    });
  }

  /* ---------- ambient particles (all derived from the clock, integer positions) ---------- */
  function ambient(b, ctx) {
    var t = ctx.t, c = cal(ctx.state), w = c.weather == null ? 2 : c.weather | 0, wind = c.wind | 0, E = DEC.E || env(ctx.season, ctx.biome);
    var fire = (DEC.list || []).filter(function (o) { return o.kind === 'fire_ring'; })[0];
    if (fire && !(w === 0 && !E.winter)) {
      var g = wp(fire.u, fire.v), fx = round(g[0]), fy = round(g[1]) - 2, slot = floor(t / 200);
      for (var s = slot - 2; s <= slot; s++) for (var j = 0; j < 4; j++) {
        var age = (t - s * 200 - j * 40) / 500; if (age < 0 || age > 1) continue;
        var x = fx + round((ih(s, j, 601) - 0.5) * 6 + (wind ? age * 4 : 0)), y = fy - round(age * 9), col = R('ember', age < 0.3 ? 0 : age < 0.6 ? 1 : age < 0.85 ? 2 : 3);
        b.set(x, y, col); if (age < 0.4) { b.set(x + 1, y, col); b.set(x, y - 1, col); }
      }
    }
    var T = DEC.trees || [];
    if (T.length && (ctx.season === 2 || ctx.season === 0) && !E.winter) {
      var sl = floor(t / 500), cols = ctx.season === 2 ? [R('autumn', 0), R('autumn', 1), R('autumn', 2)] : [R('rose', 0), R('cream', 0), R('rose', 1)];
      for (var k = sl - 6; k <= sl; k++) {
        var a = (t - k * 500) / 3000; if (a < 0 || a > 1) continue;
        var tr = T[floor(ih(k, 7, 611) * T.length)], g2 = wp(tr[0], tr[1]);
        var lx = round(g2[0] + (ih(k, 8, 612) - 0.5) * 14 + Math.sin(a * 9 + k) * 3 + (wind ? a * 18 : a * 4)), ly = round(g2[1] - 22 + ih(k, 9, 613) * 8 + a * 28);
        b.set(lx, ly, cols[k % 3]); if (k % 2) b.set(lx + 1, ly, cols[(k + 1) % 3]);
      }
    }
    if ((ctx.season === 0 || ctx.season === 1) && w !== 0 && !E.winter) for (var i = 0; i < 3; i++) {
      var cu = 12 + Math.sin(t / (2100 + i * 400) + i * 2) * (3 + i), cv = 12 + Math.cos(t / (2700 + i * 300) + i) * (2.5 + i * 0.8), g3 = wp(cu, cv);
      var bx = round(g3[0]), by = round(g3[1] - 9 - Math.sin(t / 300 + i) * 2), open = floor(t / 125 + i) % 2, col2 = [R('saffron', 0), R('cream', 0), R('rose', 0)][i];
      if (open) { b.set(bx - 1, by, col2); b.set(bx + 1, by, col2); b.set(bx, by, X.pal().ink); } else { b.set(bx, by, col2); b.set(bx, by - 1, col2); }
    }
    if (w !== 0) for (i = 0; i < 3; i++) {
      var sp = 16 + i * 6, bxx = round(((t / 1000) * sp + i * 290) % (WW + 60)) - 30, byy = round(168 + i * 14 + Math.sin(t / 900 + i) * 4), up = floor(t / 250 + i) % 2, ink = X.pal().ink;
      if (i === 0) { if (up) { b.set(bxx - 2, byy - 1, ink); b.set(bxx - 1, byy, ink); b.set(bxx, byy + 1, ink); b.set(bxx + 1, byy, ink); b.set(bxx + 2, byy - 1, ink); } else { for (var z = -2; z <= 2; z++) b.set(bxx + z, byy, ink); b.set(bxx, byy + 1, ink); } }
      else { if (up) { b.set(bxx - 1, byy - 1, ink); b.set(bxx, byy, ink); b.set(bxx + 1, byy - 1, ink); } else { b.set(bxx - 1, byy, ink); b.set(bxx, byy, ink); b.set(bxx + 1, byy, ink); } }
    }
  }

  /* ---------- weather ---------- */
  var CLOUD = [[0, 0, 9], [10, -3, 8], [20, 1, 7], [-9, 2, 6]];
  function clouds(b, ctx) {
    var t = ctx.t, c = cal(ctx.state), w = c.weather == null ? 2 : c.weather | 0, wind = c.wind | 0, T = ctx.T;
    var n = w === 2 ? 3 : w === 1 ? 7 : 9, cols = w === 0 ? [R('slate', 1), R('slate', 2), R('slate', 3)] : [R('snow', 0), R('snow', 1), R('snow', 2)];
    var cset = cols.concat(SKYC);
    for (var i = 0; i < n; i++) {
      var sc = 1 + ih(i, 1, 701) * 0.8, cx = round(((ih(i, 2, 702) * (WW + 140) + (t / 1000) * (3 + wind * 7 + i)) % (WW + 140)) - 70), cy = round(150 + ih(i, 3, 703) * 50);
      CLOUD.forEach(function (q) {
        var r = q[2] * sc, ox = cx + q[0] * sc, oy = cy + q[1] * sc;
        for (var y = floor(-r / 1.6); y <= 4; y++) for (var x = floor(-r); x <= r; x++) {
          if (x * x + (y * 1.6) * (y * 1.6) > r * r) continue;
          var px = round(ox + x), py = round(oy + y); if (px < 0 || py < 0 || px >= WW || py >= WH) continue;
          var qq = py * WW + px; if (cset.indexOf(b.d[qq]) < 0) continue;
          b.d[qq] = y < -r / 3 ? cols[0] : y < 2 ? cols[1] : cols[2];
        }
      });
    }
    if (w === 2) return;
    for (i = 0; i < 3; i++) {
      var sx = round(((ih(i, 5, 705) * (WW + 260) + (t / 1000) * (6 + wind * 8)) % (WW + 260)) - 130), sy = round(X.NY + 90 + i * 100 + ih(i, 6, 706) * 40);
      [[0, 0, 70, 26], [40, 10, 50, 20], [-36, 8, 46, 18]].forEach(function (e) {
        var ex = sx + e[0], ey = sy + e[1];
        for (var y = -e[3]; y <= e[3]; y++) for (var x = -e[2]; x <= e[2]; x++) {
          if ((x * x) / (e[2] * e[2]) + (y * y) / (e[3] * e[3]) > 1) continue;
          var px = ex + x, py = ey + y; if (px < 0 || py < 0 || px >= WW || py >= WH) continue; var q = py * WW + px;
          if (!T[q] || SHADE[q] === STAMP) continue; SHADE[q] = STAMP; b.d[q] = X.shift(b.d[q], 1);
        }
      });
    }
  }
  var SHADE = new Uint32Array(WW * WH), STAMP = 0;
  function precip(b, ctx, K) {
    var t = ctx.t, c = cal(ctx.state); if (c.weather == null || (c.weather | 0) !== 0) return;
    K = K || 1;
    var wind = c.wind | 0, snow = (c.temp | 0) === 0, BW = b.w, BH = b.h, M = K * K;
    if (snow) {
      for (var i = 0; i < 150 * M * 0.7; i++) {
        var vy = (10 + ih(i, 1, 801) * 12) * K, s = ih(i, 2, 802) * BH + (t / 1000) * vy, y = round(s % (BH + 10)) - 5;
        var x = round(((ih(i, 3, 803) * BW + Math.sin(s / (14 * K) + i) * 3 * K + s * (wind ? 0.6 : 0.15)) % BW + BW) % BW);
        b.set(x, y, R('snow', 0)); if (i % 4 === 0) { b.set(x + 1, y, R('snow', 0)); b.set(x, y + 1, R('snow', 1)); b.set(x + 1, y + 1, R('snow', 1)); }
      }
      return;
    }
    var slant = wind ? 0.5 : 0.22;
    [[80, 120, 2, R('slate', 1)], [60, 170, 3, R('sky', 3)], [42, 230, 4, R('sky', 2)]].forEach(function (L, li) {
      for (var i = 0; i < L[0] * M * 0.6; i++) {
        var s = ih(i, li, 811) * (BH + 20) + (t / 1000) * L[1] * K, y = round(s % (BH + 20)) - 10, x = round(((ih(i, li, 812) * BW + s * slant) % BW + BW) % BW);
        var land = li === 2 ? round((X.NY + 40 + ih(i, 5, 813) * 330) * K) : 1e9;
        if (y >= land) { if (y - land < 7 * K) { b.set(x - 1, land - 1, R('sky', 1)); b.set(x + 1, land - 1, R('sky', 1)); b.set(x, land, R('sky', 0)); } continue; }
        for (var k = 0; k < L[2] * K; k++) b.set(x - round(k * slant), y - k, L[3]);
      }
    });
    var hot = (c.temp | 0) === 2, bucket = floor(t / 4000), chance = hot ? 0.3 : 0.08;
    if (ih(bucket, 9, 820) < chance) {
      var at = bucket * 4000 + ih(bucket, 10, 821) * 3000;
      if (t >= at && t < at + 125) {
        for (var q = 0; q < b.d.length; q++) if (b.d[q]) b.d[q] = X.shift(b.d[q], -1);
        var bx = round((120 + ih(bucket, 11, 822) * (WW - 240)) * K), by = 0, gy = round((X.NY + 120 + ih(bucket, 12, 823) * 160) * K);
        while (by < gy) { var nx = bx + round((ih(bucket, by, 824) - 0.5) * 14 * K), ny = by + (10 + round(ih(by, bucket, 825) * 10)) * K;
          X.line(bx, by, nx, ny, function (px, py) { for (var e = 0; e < K; e++) { b.set(px + e, py, X.pal().spark); } b.set(px + K, py, R('sky', 0)); }); bx = nx; by = ny; }
      }
    }
  }

  /* ---------- tap feedback ---------- */
  var EV = [];
  var JOB_ICON = { unemployed: ['ic_head'], forager: ['ic_food'], farmer: ['ic_food'], hunter: ['ic_fur'], lumberjack: ['ic_wood'], quarry_worker: ['ic_stone'],
    miner: ['ic_ingot', { MAIN: 'copper' }], coal_miner: ['ic_coal'], cement_worker: ['ic_sack', { MAIN: 'ashen', ACCENT: 'soot' }], craftsman: ['ic_ingot', { MAIN: 'iron' }],
    teamster: ['ic_sack'], professor: ['ic_book'], scientist: ['ic_book', { MAIN: 'indigo' }], priest: ['ic_face', { MAIN: 'cream' }], banker: ['ic_coin'], entertainer: ['ic_face'], soldier: ['tool_shield'], scavenger: ['ic_sack', { MAIN: 'hide', ACCENT: 'rust' }] };
  var BLD_ICON = { basic_housing: ['ic_house'], cottage: ['ic_house'], lodge: ['ic_fur'], smokehouse: ['ic_food'], farm: ['ic_food'], compost: ['ic_food'], silo: ['ic_food'], mill: ['ic_food'],
    shed: ['ic_sack'], storage_yard: ['ic_sack'], lumber_yard: ['ic_wood'], sawmill: ['ic_wood'], rock_quarry: ['ic_stone'], mine: ['ic_ingot', { MAIN: 'copper' }], coal_mine: ['ic_coal'],
    foundry: ['ic_ingot', { MAIN: 'iron' }], smelter: ['ic_ingot', { MAIN: 'steel' }], cement_plant: ['ic_sack', { MAIN: 'ashen', ACCENT: 'soot' }], trade: ['ic_coin'], bank: ['ic_coin'],
    library: ['ic_book'], university: ['ic_book', { MAIN: 'indigo' }], temple: ['ic_face', { MAIN: 'cream' }], amphitheatre: ['ic_face'], garrison: ['tool_shield'], hospital: ['ic_head'], metal_refinery: ['ic_ingot', { MAIN: 'aluminium' }] };
  function tap(wx, wy, t) {
    wx = round(wx); wy = round(wy);
    EV.push({ k: 'ripple', x: wx, y: wy, t0: t });
    var cz = SK.citizens && SK.citizens.last ? SK.citizens.last() : [], best = null, bd = 1e9;
    cz.forEach(function (c) { if (Math.abs(c.x - wx) > 9 || wy < c.y - 26 || wy > c.y + 3) return; var d = Math.abs(c.x - wx) + Math.abs(c.y - 12 - wy); if (d < bd) { bd = d; best = c; } });
    if (best) {
      var grp = cz.filter(function (c) { return c.job === best.job && Math.hypot(c.x - best.x, c.y - best.y) < 30; });
      var ax = round(grp.reduce(function (s, c) { return s + c.x; }, 0) / grp.length), top = Math.min.apply(null, grp.map(function (c) { return c.y; }));
      EV = EV.filter(function (e) { return e.k !== 'float'; });
      EV.push({ k: 'float', x: ax, y: top - 32, t0: t, ic: JOB_ICON[best.job] || ['ic_head'], n: grp.length });
      return;
    }
    var it = VL.idAt ? VL.idAt(wx / KS, wy / KS) : null;
    if (it) EV.push({ k: 'pop', x: wx, y: wy - 6, t0: t, ic: BLD_ICON[it.type] || ['ic_house'] });
  }
  function events(b, ctx) {
    var t = ctx.t;
    EV = EV.filter(function (e) { return t - e.t0 < (e.k === 'float' ? 2600 : e.k === 'pop' ? 800 : 400) && t >= e.t0 - 50; });
    EV.forEach(function (e) {
      var a = t - e.t0;
      if (e.k === 'ripple') { var r = 1 + floor(a / 100) * 2, col = floor(a / 100) % 2 ? R('cream', 0) : X.pal().spark;
        for (var k = 0; k < 24; k++) { var an = k / 24 * PI * 2; b.set(e.x + round(Math.cos(an) * r * 1.4), e.y + round(Math.sin(an) * r * 0.7), col); } return; }
      var sp = X.sprite(e.ic[0], e.ic[1]), dy = e.k === 'pop' ? -round(12 * a / 800) : round(Math.sin(a / 260) * 1.5) - (a < 200 ? round((200 - a) / 40) : 0);
      var show = e.k === 'pop' ? (a < 450 || floor(a / 100) % 2 === 0) : (a < 2200 || floor(a / 100) % 2 === 0);
      if (show) b.blit(sp, e.x - (sp.w >> 1), e.y + dy - sp.h);
      if (e.k === 'float' && show) { var cx = e.x, cy = e.y + dy + 2; b.set(cx, cy, R('cream', 0)); b.set(cx - 1, cy - 1, R('cream', 0)); b.set(cx + 1, cy - 1, R('cream', 0)); }
    });
  }

  function dyn(b, ctx) { STAMP++; clouds(b, ctx); ambient(b, ctx); }
  function actors(b, ctx, k) { KS = k || 1; animals(b, ctx, VL.depth()); }
  function over(b, ctx, k) { KS = k || 1; precip(b, ctx, KS); events(b, ctx); }
  function setK(k) { KS = k || 1; }

  /* ---------- atelier sheet ---------- */
  function sheet(season, biome) {
    var E = env(season, biome || 'grassland'), p = new Pix(330, 192), ground = R(E.winter ? 'snow' : 'summer', E.winter ? 1 : 2);
    function put(name, map, opt, x, gy) { var s = variant(name, map, opt), d = P[name]; p.blit(s, x, gy - d.anchor[1]); for (var k = 0; k < s.w; k++) p.set(x + k, gy + 1, ground); return x + s.w + 4; }
    function lk(kind, seed) { var L = look(kind, E, seed); L.o.flip = false; return L; }
    var x = 2, gy = 31;
    ['pine', 'broad', 'dead', 'sapling', 'stump', 'bush', 'rock_small', 'rock_big'].forEach(function (k, i) { var L = lk(k, i); x = put(L.n, L.m, L.o, x, gy); });
    x = 2; gy = 62;
    var L2 = lk('tuft_a', 1), L3 = lk('tuft_b', 2), L4 = lk('mushrooms', 3);
    [['standing_stone', null], ['signpost', null], ['sundial', null], ['fire_ring', null], ['lantern_post', null], ['fence_post', null], [L2.n, L2.m], [L3.n, L3.m], [L4.n, L4.m]].forEach(function (q) { x = put(q[0], q[1], { snow: E.winter && q[0] !== 'lantern_post' ? 1 : 0 }, x, gy); });
    x = 2; gy = 92;
    [['deer_rest'], ['deer_step_a'], ['deer_step_b'], ['deer_rest', null, 'antlers_layer'], ['boar_a'], ['boar_b'], ['boar_c'], ['boar_a', { MAIN: 'rosewash', ACCENT: 'rose' }], ['rabbit_sit'], ['rabbit_hop'], ['fish']].forEach(function (q) {
      var s = X.sprite(q[0], q[1]), d = P[q[0]]; p.blit(s, x, gy - d.anchor[1]); if (q[2]) p.blit(X.sprite(q[2]), x, gy - d.anchor[1]); for (var k = 0; k < s.w; k++) p.set(x + k, gy + 1, ground); x += s.w + 4; });
    x = 2; gy = 116;
    [['ic_food'], ['ic_wood'], ['ic_stone'], ['ic_fur'], ['ic_ingot', { MAIN: 'copper' }], ['ic_ingot', { MAIN: 'iron' }], ['ic_ingot', { MAIN: 'steel' }], ['ic_sack', { MAIN: 'ashen', ACCENT: 'soot' }], ['ic_coal'], ['ic_coin'], ['ic_book'], ['ic_head'], ['ic_face'], ['ic_house'], ['ic_sack'], ['ic_morale'], ['ic_tent']].forEach(function (q) { p.blit(X.sprite(q[0], q[1]), x, gy - 16); x += 18; });
    x = 2; gy = 136;
    [['ic_plank'], ['ic_brick'], ['ic_bar'], ['ic_sheet'], ['ic_ingot', { MAIN: 'aluminium' }]].forEach(function (q) { p.blit(X.sprite(q[0], q[1]), x, gy - 16); x += 18; });
    x += 6;
    [['unit_log'], ['unit_block'], ['unit_sack'], ['unit_ingot'], ['unit_crate'], ['unit_fur_bundle'], ['unit_ore', { MAIN: 'copper' }], ['unit_ore', { MAIN: 'iron' }], ['unit_ore', { MAIN: 'soot' }], ['unit_coin'], ['unit_plank'], ['unit_bar'], ['unit_sheet'], ['unit_ingot', { MAIN: 'aluminium' }]].forEach(function (q) { p.blit(X.sprite(q[0], q[1]), x, gy - 10); x += 11; });
    var g2 = 190; x = 80;
    for (var ph = 0; ph < 28; ph += 1) { var cx = x + (ph % 14) * 15, cy = g2 - 22 + floor(ph / 14) * 14; SKYC = [0]; var tmp = new Pix(WW, 20); tmp.d.fill(0);
      for (var yy = -6; yy < 6; yy++) for (var xx = -6; xx < 6; xx++) { var dx = xx + 0.5, dy = yy + 0.5; if (dx * dx + dy * dy > 36) continue; var w = Math.sqrt(36 - dy * dy), k = Math.min(Math.cos(ph / 28 * PI * 2) * w, w - 1.1), lit = ph === 14 || (ph < 14 ? dx > k : dx < -k); if (ph === 0) lit = false;
        p.set(cx + xx, cy + yy, lit ? R('cream', 0) : R('slate', 2)); } }
    return p;
  }
  function samples() {
    var out = [];
    [0, 1, 2, 3].forEach(function (s) { out.push({ label: 'nature sheet ' + s, pix: sheet(s) }); });
    return out;
  }
  var baseS = VL.samples;
  VL.samples = function () { return (baseS ? baseS() : []).concat(samples()); };

  function lights() {
    var out = [];
    (DEC.list || []).forEach(function (o) {
      if (o.kind === 'lantern_post' && o.top) out.push([o.top[0] + 3, o.top[1] + 16, 6]);
      if (o.kind === 'fire_ring') { var g = wp(o.u, o.v); out.push([round(g[0]), round(g[1]) - 1, 10]); }
    });
    return out;
  }
  SK.world = { lights: lights, decor: decor, after: after, sky: sky, dyn: dyn, actors: actors, over: over, tap: function (x, y, t) { tap(x, y, t); }, setK: setK, K: function () { return KS; }, sheet: sheet, scatter: scatter, env: env, events: function () { return EV; },
    variant: variant, blitA: blitA, foot: foot, wander: wander, dec: function () { return DEC; }, skyc: function () { return SKYC; }, JOB_ICON: JOB_ICON, BLD_ICON: BLD_ICON };
  }
})(window);
