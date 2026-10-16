/* Evolve village sprite kit — village layer (Batch 2):
   building composer (living: cabin, cottage, lodge × 3 tiers), per-instance variants with anti-clone,
   sector slots and placement from counts, density (annex / extra storey), scaffolding, minimal particles. */
(function (G) {
  'use strict';
  var SK = G.SK = G.SK || {};
  function X() { return G.SpriteKit._; }
  var ceil = Math.ceil, floor = Math.floor, round = Math.round, E = 0.125;
  function mod(a, n) { return ((a % n) + n) % n; }

  /* ---------- per type/tier material choices (roof: 3 ramps, wall: 2 shades) ---------- */
  var RAMPS = {
    basic_housing: { 1: { w: ['oak', 'walnut'], r: ['straw', 'reed', 'dry'] }, 2: { w: ['pinewood', 'driftwood'], r: ['walnut', 'driftwood', 'oak'] }, 3: { w: ['lime', 'rosewash'], r: ['terracotta', 'brick', 'ochre'] } },
    cottage: { 2: { w: ['pinewood', 'driftwood'], r: ['walnut', 'oak', 'driftwood'] }, 3: { w: ['lime', 'ochre'], r: ['terracotta', 'brick', 'ochre'] } },
    lodge: { 1: { w: ['oak', 'walnut'], r: ['hide', 'rust', 'cream'] }, 2: { w: ['walnut', 'driftwood'], r: ['walnut', 'driftwood', 'oak'] }, 3: { w: ['walnut', 'driftwood'], r: ['walnut', 'slate', 'driftwood'] } }
  };
  var PAINT = ['teal', 'indigo', 'madder', 'saffron', 'plum', 'sage', 'rose', 'rust'];
  var BLOOM = ['rose', 'saffron', 'cream', 'plum', 'madder'];
  var ACC_POOL = ['pot_flowers', 'laundry', 'tool_lean', 'flowerbox', 'herb_bundle', 'wind_chime', 'planter_hang', 'lantern', 'barrel'];
  /* registries persist on SK so a re-executed village.js never drops what later batches registered */
  var COMPOSERS = SK.COMPOSERS = SK.COMPOSERS || {};
  COMPOSERS.basic_housing = house; COMPOSERS.cottage = house; COMPOSERS.lodge = house;
  /* DYN[type](state, t, item) -> opts {af: anim frame, fq: pile fill 0..1, metal, on}; registered by later batches */
  var DYN = SK.DYN = SK.DYN || {};
  function okey(o) { return o ? [o.af | 0, o.fq == null ? '' : o.fq, o.metal || '', o.on ? 1 : 0, o.x || ''].join(':') : ''; }

  /* ---------- sectors and slots ---------- */
  var CFG = {
    temple: ['society', 2], amphitheatre: ['society', 1], garrison: ['society', 2], hospital: ['society', 2],
    trade: ['commerce', 3], bank: ['commerce', 2], library: ['knowledge', 2], university: ['knowledge', 1],
    basic_housing: ['living', 20], cottage: ['living', 12], lodge: ['lodge', 6],
    shed: ['storage', 6], storage_yard: ['storage', 3],
    farm: ['food', 8], compost: ['food', 5], smokehouse: ['food2', 5], silo: ['food2', 5], mill: ['food2', 5],
    lumber_yard: ['forest', 3], sawmill: ['forest', 2], rock_quarry: ['rock', 3], mine: ['rock', 2], coal_mine: ['rock', 2],
    foundry: ['industry', 2], smelter: ['industry', 2], cement_plant: ['industry', 2], metal_refinery: ['industry', 2]
  };
  var SECTORS = {
    society: { a: [11.5, 11.5], r: [2.4, 6] }, commerce: { a: [11.5, 11.5], r: [2.4, 7] }, knowledge: { a: [11.5, 11.5], r: [3, 8] },
    living: { a: [11.5, 11.5], r: [2.4, 9.5] }, lodge: { a: [20, 3], r: [0, 6] }, storage: { a: [15.5, 7.5], r: [0, 5] },
    food: { a: [4.5, 19.5], r: [0, 8] }, food2: { a: [7.5, 15.5], r: [0, 7] }, forest: { a: [2, 13], r: [0, 7] },
    rock: { a: [3, 3], r: [0, 6], rock: true }, industry: { a: [20.5, 6], r: [0, 6] }
  };
  /* big footprints reserve first so 1x1 houses fill the gaps instead of fragmenting the map */
  var ORDER = ['temple', 'amphitheatre', 'university', 'garrison', 'hospital', 'trade', 'bank', 'library',
    'rock_quarry', 'mine', 'coal_mine', 'lumber_yard', 'sawmill', 'foundry', 'smelter', 'cement_plant', 'farm', 'storage_yard',
    'basic_housing', 'cottage', 'shed', 'compost', 'smokehouse', 'silo', 'mill', 'lodge', 'metal_refinery'];
  var SLOTS = null, BMAP = null;
  function bmap() { if (!BMAP) { BMAP = {}; X().BUILDINGS.forEach(function (b) { BMAP[b.key] = b; }); } return BMAP; }
  /* Slots are reserved once, in a fixed order, so instance k of a type always takes slot k. */
  function slots() {
    if (SLOTS) return SLOTS;
    var x = X(), lay = x.layout(), N = 24, occ = new Uint8Array(N * N); SLOTS = {};
    var BIGID = {};
    ORDER.forEach(function (type, ti) {
      if (bmap()[type].fw * bmap()[type].fd > 1) BIGID[ti + 1] = true;
      var c = CFG[type], S = SECTORS[c[0]], b = bmap()[type], fw = b.fw, fd = b.fd, th = x.hash(type) & 0xffff, cand = [], list = [];
      for (var y = 0; y + fd <= N; y++) for (var xx = 0; xx + fw <= N; xx++) {
        var dd = Math.hypot(xx + fw / 2 - S.a[0], y + fd / 2 - S.a[1]);
        cand.push([dd + x.ih(xx, y, th) * 1.8 + (dd < S.r[0] ? 50 : 0) + (dd > S.r[1] ? (dd - S.r[1]) * 3 : 0), xx, y]);
      }
      cand.sort(function (p, q) { return p[0] - q[0]; });
      for (var i = 0; i < cand.length && list.length < c[1]; i++) {
        var X0 = cand[i][1], Y0 = cand[i][2], ok = true, big = fw * fd > 1, myId = ti + 1;
        for (var j = Y0 - 1; j <= Y0 + fd && ok; j++) for (var k = X0 - 1; k <= X0 + fw && ok; k++) {
          var inside = k >= X0 && k < X0 + fw && j >= Y0 && j < Y0 + fd;
          if (k < 0 || j < 0 || k >= N || j >= N) { if (inside) ok = false; continue; }
          var oc = occ[j * N + k];
          if (oc && (inside || ((BIGID[oc] || big) && oc !== myId))) ok = false;
          if (inside) { var t = lay[j * N + k]; if (!(t === 1 || t === 6 || (t === 5 && S.rock))) ok = false; }
        }
        if (!ok) continue;
        for (j = Y0; j < Y0 + fd; j++) for (k = X0; k < X0 + fw; k++) occ[j * N + k] = myId;
        list.push({ x: X0, y: Y0 });
      }
      SLOTS[type] = list;
    });
    return SLOTS;
  }
  function visN(n) { return n <= 8 ? n : Math.min(24, 8 + round(4 * Math.log2(n / 8))); }
  function tierOf(st) { var t = (st && st.tech) || {}; return (t.cement | 0) >= 1 ? 3 : ((t.axe | 0) >= 2 ? 2 : 1); }
  function typeTier(type, tier) { return type === 'cottage' ? Math.max(2, tier) : tier; }
  function plan(st) {
    var S = slots(), city = (st && st.city) || {}, per = {}, tot = 0, list = [];
    X().BUILDINGS.forEach(function (b) { var n = ((city[b.key] || {}).count) | 0; if (n && SK.gate && !SK.gate(b.key, st)) n = 0; var v = Math.min(visN(n), (S[b.key] || []).length); per[b.key] = { n: n, v: v }; tot += v; });
    while (tot > 80) { var mx = null; for (var k in per) if (!mx || per[k].v > per[mx].v) mx = k; per[mx].v--; tot--; }
    Object.keys(per).forEach(function (type) {
      var p = per[type], b = bmap()[type]; if (!p.v) return;
      var dens = p.n / p.v, lvl = dens >= 3 ? 2 : dens >= 1.5 ? 1 : 0;
      for (var i = 0; i < p.v; i++) list.push({ type: type, k: i, x: S[type][i].x, y: S[type][i].y, fw: b.fw, fd: b.fd, h: b.h, lvl: lvl });
    });
    return { list: list, per: per };
  }

  /* ---------- variants + anti-clone ---------- */
  var VARS = new Map(), CLONE_FAIL = new Set();
  function rollVariant(type, k, tier, tries) {
    var x = X(), r = x.rng(type, k, tier, tries);
    var pick = function (a) { return a[floor(r() * a.length)]; };
    var n = floor(r() * 3), pool = ACC_POOL.slice(), acc = [];
    for (var i = 0; i < n; i++) acc.push(pool.splice(floor(r() * pool.length), 1)[0]);
    acc.sort();
    return {
      ri: floor(r() * 3), wi: floor(r() * 2), door: r() < 0.5 ? 'door_plain' : 'door_arched', doorFace: r() < 0.6 ? 'L' : 'R',
      windows: tier === 1 ? floor(r() * 2) : 1 + floor(r() * 2), chimney: tier > 1 && r() < 0.75, chimX: r() < 0.5 ? 0.3 : 0.7,
      dh: floor(r() * 5) - 2, roofType: (type === 'basic_housing' && tier > 1 && r() < 0.35) ? 'hip' : 'gable', axis: r() < 0.5 ? 'x' : 'y',
      acc: acc, paint: pick(PAINT), paint2: pick(PAINT), bloom: pick(BLOOM), ivy: tier > 1 && r() < 0.35, moss: r() < 0.6,
      lintel: r() < 0.5, dormer: r() < 0.65, barge: r() < 0.5, shutterPat: r() < 0.5 ? 'hd_shutter_pattern_a' : 'hd_shutter_pattern_b',
      seed: x.hash(type, k, tries) & 0xffffff, tries: tries
    };
  }
  function diff(a, b) { return (a.ri !== b.ri) + (a.wi !== b.wi) + (a.axis !== b.axis) + (a.acc.join() !== b.acc.join()); }
  function variant(type, k, tier) {
    var key = type + '|' + k + '|' + tier; if (VARS.has(key)) return VARS.get(key);
    var S = slots()[type] || [], me = S[k], prev = [];
    if (me) for (var j = 0; j < k; j++) if (S[j] && Math.hypot(S[j].x - me.x, S[j].y - me.y) <= 2.9) prev.push(variant(type, j, tier));
    var v, t;
    for (t = 0; t < 8; t++) { v = rollVariant(type, k, tier, t); if (prev.every(function (q) { return diff(q, v) >= 2; })) break; }
    if (t === 8) { v = rollVariant(type, k, tier, 0); CLONE_FAIL.add(key); }
    VARS.set(key, v); return v;
  }

  /* ---------- face / strip helpers ---------- */
  function geo(sh, M, T) {
    var ox = sh.ox + M, oy = sh.oy + T, w = sh.w, d = sh.d;
    var P = function (x, y, z) { return [round(ox + (x - y) * 16), round(oy + (x + y) * 8 - z)]; };
    return { P: P, ox: ox, oy: oy, w: w, d: d, H: sh.H, rh: sh.rh, axis: sh.axis, roof: sh.roof, BL: P(0, d, 0), BR: P(w, d, 0) };
  }
  function faceY(g, f, a) { return f === 'L' ? g.BL[1] - 1 + ceil(a / 2) : g.BR[1] - 1 - ceil(a / 2); }
  function faceX(g, f, a) { return (f === 'L' ? g.BL[0] : g.BR[0]) + a; }
  function snap(a, f, w) { var odd = f === 'L' || w % 2 === 0; a = round(a); if (odd !== (mod(a, 2) === 1)) a += 1; return a; }
  function onFace(p, g, f, name, map, a, z, sh) {
    var d = SK.PIECES[name], x = faceX(g, f, a), yb = faceY(g, f, a) - z, sp;
    if (f === 'L') { sp = X().sprite(name, map, { shade: sh | 0 }); p.blit(sp, x, yb - (d.h - 1 - (d.skew ? floor((d.w - 1) / 2) : 0))); }
    else { sp = X().sprite(name, map, { flip: d.mirror !== 'none', shade: 1 + (sh | 0) }); p.blit(sp, x, yb - (d.h - 1)); }
  }
  function strip(p, name, map, x0, x1, yfn, sh, phase) {
    var sp = X().sprite(name, map, { shade: sh | 0 });
    for (var x = x0; x < x1; x++) { var col = mod(x - x0 + (phase | 0), sp.w), y0 = yfn(x);
      for (var j = 0; j < sp.h; j++) { var c = sp.d[j * sp.w + col]; if (c) p.set(x, y0 + j, c); } }
  }
  function faceStrip(p, g, f, name, map, a0, len, zBottom, sh) {
    var d = SK.PIECES[name], base = f === 'L' ? g.BL[0] : g.BR[0];
    strip(p, name, map, base + a0, base + a0 + len, function (x) { return faceY(g, f, x - base) - zBottom - (d.h - 1); }, (f === 'R' ? 1 : 0) + (sh | 0));
  }
  function bottomEdge(A, s) { return function (x) { return ceil(A[1] + (x + 0.5 - A[0]) * s - 0.5) - 1; }; }
  function topEdge(A, s) { return function (x) { return ceil(A[1] + (x + 0.5 - A[0]) * s - 0.5); }; }
  function lerpY(A, B) { return function (x) { return round(A[1] + (x - A[0]) * (B[1] - A[1]) / (B[0] - A[0])); }; }
  function crop(p, pad) {
    var x0 = p.w, y0 = p.h, x1 = -1, y1 = -1;
    for (var y = 0; y < p.h; y++) for (var x = 0; x < p.w; x++) if (p.d[y * p.w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { p.ox0 = 0; p.oy0 = 0; return p; } pad = pad | 0;
    var o = new (X().Pix)(x1 - x0 + 1 + 2 * pad, y1 - y0 + 1 + 2 * pad);
    for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) o.d[(y - y0 + pad) * o.w + (x - x0 + pad)] = p.d[y * p.w + x];
    o.ox0 = x0 - pad; o.oy0 = y0 - pad;
    return o;
  }

  /* ---------- the living-building composer ---------- */
  var BC = new Map();
  function building(type, tier, k, season, lvl, o) {
    tier = typeTier(type, tier); lvl = lvl | 0;
    var ok = okey(o), key = [type, tier, k, season, lvl, ok].join('|'); if (BC.has(key)) return BC.get(key);
    var out = COMPOSERS[type](type, tier, k, season, lvl, o || {});
    BC.set(key, out);
    if (BC.size > 4000) BC.delete(BC.keys().next().value);
    X().ATLAS.set([type, tier, variant(type, k, tier).seed, season].join('|') + (lvl ? '|d' + lvl : '') + (ok ? '|' + ok : ''), out.pix);
    return out;
  }
  function house(type, tier, k, season, lvl) {
    var x = X(), R = x.R, v = variant(type, k, tier), RM = RAMPS[type][tier], snow = season === 3;
    var fol = x.SEASONS[season].tree, wallR = RM.w[v.wi], roofR = RM.r[v.ri], extra = lvl >= 2 ? 10 : 0, doorFace = v.doorFace, spec;
    if (type === 'basic_housing') {
      spec = { w: 1, d: 1, h: (tier === 1 ? 14 : tier === 2 ? 17 : 18) + v.dh + extra, plinth: tier === 1 ? 0 : 3, plinthRamp: 'river',
        wall: { tex: tier === 1 ? 'tex_logs' : tier === 2 ? 'tex_planks' : 'tex_wattle', ramp: wallR },
        roof: { type: v.roofType, axis: v.axis, tex: tier === 1 ? 'tex_thatch' : tier === 2 ? 'tex_shingles' : 'tex_tiles', ramp: roofR, pitch: tier === 1 ? 4 : 2 } };
      if (tier === 3) { spec.plinthTex = 'tex_brick'; spec.plinthRamp = 'brick'; spec.plinth = 4; }
    } else if (type === 'cottage') {
      var h = (tier === 3 ? 25 : 23) + v.dh + extra;
      spec = tier === 3
        ? { w: 1, d: 1, h: h, plinth: 2, wall: { tex: 'tex_cutstone', ramp: v.wi ? 'sandstone' : 'river' }, wall2: { tex: 'hd_halftimber', ramp: wallR, z: 12, map: { WOOD: 'walnut' } }, roof: { type: 'gable', axis: v.axis, tex: 'tex_tiles', ramp: roofR, pitch: 3 } }
        : { w: 1, d: 1, h: h, plinth: 3, wall: { tex: 'tex_planks', ramp: wallR }, wall2: { tex: 'tex_planks', ramp: v.wi ? 'pinewood' : 'oak', z: 12 }, roof: { type: 'gable', axis: v.axis, tex: 'tex_shingles', ramp: roofR, pitch: 3 } };
      spec.bandRamp = 'walnut';
    } else {
      spec = { w: 1, d: 1, h: (tier === 1 ? 11 : 13) + v.dh + extra, plinth: tier === 3 ? 5 : tier === 2 ? 2 : 0,
        wall: { tex: tier === 1 ? 'tex_logs' : 'tex_planks', ramp: wallR },
        roof: { type: 'gable', axis: v.axis, tex: tier === 1 ? 'tex_wattle' : 'tex_shingles', ramp: roofR, pitch: 6 } };
      doorFace = v.axis === 'y' ? 'L' : 'R';
    }
    spec.snow = snow;
    var sh = x.shell(spec), M = 24, T = 16, p = new x.Pix(sh.pix.w + 2 * M, sh.pix.h + T + 6), g = geo(sh, M, T), P = g.P, H = g.H, rh = g.rh, w = g.w, d = g.d;
    if (lvl >= 1) {
      var as = x.shell({ w: 0.5, d: 0.5, h: Math.max(8, round(spec.h * 0.5)), plinth: spec.plinth ? 2 : 0, plinthTex: spec.plinthTex, plinthRamp: spec.plinthRamp,
        wall: spec.wall, roof: { type: 'gable', axis: 'x', tex: spec.roof.tex, ramp: spec.roof.ramp === 'cream' ? 'hide' : spec.roof.ramp, pitch: 1 }, snow: snow });
      var A0 = P(-0.5, d - 0.5, 0); p.blit(as.pix, A0[0] - as.ox, A0[1] - as.oy);
    }
    p.blit(sh.pix, M, T);
    var other = doorFace === 'L' ? 'R' : 'L', twoOnDoor = v.windows >= 2 && type !== 'lodge';
    var doorName = tier === 1 ? 'door_plain' : v.door, doorTop = doorName === 'door_arched' ? 9 : 8;
    var doorA = snap(twoOnDoor ? 1 : 5, doorFace, 6);
    var folMap = { FOLIAGE: fol };
    if (tier >= 2 && v.moss && spec.plinth) {
      faceStrip(p, g, 'L', 'hd_moss_base', folMap, 0, 16 * w, 0); faceStrip(p, g, 'R', 'hd_moss_base', folMap, 0, 16 * d, 0);
    }
    if (v.ivy) onFace(p, g, other, 'hd_ivy', { FOLIAGE: season === 3 ? 'frost' : 'conifer', ACCENT: v.bloom }, other === 'L' ? 1 : 7, spec.plinth || 0);
    onFace(p, g, doorFace, doorName, { MAIN: tier === 1 ? 'oak' : v.paint, ACCENT: v.paint2 }, doorA, 0);
    if (tier >= 2 && (v.lintel || tier === 3)) faceStrip(p, g, doorFace, 'hd_lintel', { ACCENT: v.paint2 }, doorA - 2, 10, doorTop);
    if (tier === 3) {
      var ds = x.sprite('hd_doorstep', folMap, { flip: doorFace === 'R' });
      p.blit(ds, faceX(g, doorFace, doorA) - 1, faceY(g, doorFace, doorA + 2) - 1);
    }
    var wins = [], wz = type === 'cottage' ? 4 : (tier === 1 ? 5 : 6);
    if (type === 'lodge') { if (tier > 1 || v.windows) wins.push([other, 5, wz]); }
    else {
      if (v.windows >= 1) wins.push([other, tier === 3 && type === 'basic_housing' ? (other === 'L' ? 7 : 5) : 5, wz]);
      if (twoOnDoor) wins.push([doorFace, 9, wz]);
      if (type === 'cottage') { wins.push([doorFace, twoOnDoor ? 9 : 5, 15]); wins.push([other, 5, 15]); }
      if (extra) { wins.push([other, 5, wz + 10]); wins.push([doorFace, 5, wz + 10]); }
    }
    var winName = tier === 3 ? 'win_glazed' : 'win_shutter', winMap = { MAIN: tier === 1 ? 'hide' : v.paint2, WOOD: tier === 3 ? 'pinewood' : 'oak' };
    wins.forEach(function (wn, i) {
      var f = wn[0], a = snap(wn[1], f, 6), z = wn[2] + (spec.plinth && tier > 1 && wn[2] < 8 ? 1 : 0);
      if (tier === 3 && i === 0 && type === 'basic_housing') {
        onFace(p, g, f, v.shutterPat, { MAIN: v.paint, ACCENT: v.paint2 }, snap(a - 4, f, 3), z);
        onFace(p, g, f, v.shutterPat, { MAIN: v.paint, ACCENT: v.paint2 }, snap(a + 6, f, 3), z);
      }
      onFace(p, g, f, winName, winMap, a, z);
      if ((tier === 3 && (i === 0 || type === 'cottage')) || (v.acc.indexOf('flowerbox') >= 0 && i === 0))
        faceStrip(p, g, f, 'flowerbox', { ACCENT: v.bloom, FOLIAGE: fol, MAIN: 'oak' }, a, 7, z - 1);
    });
    /* roof details */
    var thatch = spec.roof.tex === 'tex_thatch', tiles = spec.roof.tex === 'tex_tiles', rmap = { MAIN: roofR };
    if (thatch) {
      if (g.axis === 'x' || spec.roof.type === 'hip') { var A = P(-E, d + E, H), B = P(w + E, d + E, H); strip(p, 'hd_thatch_fringe', rmap, ceil(A[0]), B[0], bottomEdge(A, 0.5), 0); }
      if (g.axis === 'y' || spec.roof.type === 'hip') { var A2 = P(w + E, d + E, H), B2 = P(w + E, -E, H); strip(p, 'hd_thatch_fringe', rmap, ceil(A2[0]), B2[0], bottomEdge(A2, -0.5), 1, 5); }
      if (spec.roof.type === 'gable') {
        if (g.axis === 'x') { var ap = P(w + E, d / 2, H + rh); p.blit(x.sprite('hd_ridge_knot', rmap, { flip: true }), ap[0] - 9, ap[1] - 2); }
        else { var ap2 = P(w / 2, d + E, H + rh); p.blit(x.sprite('hd_ridge_knot', rmap), ap2[0] - 1, ap2[1] - 1); }
      }
    }
    if (tiles && spec.roof.type === 'gable') {
      if (g.axis === 'x') { var C = P(-E, d / 2, H + rh), D = P(w + E, d / 2, H + rh); strip(p, 'hd_clay_ridge', rmap, C[0], D[0], function (xx) { return topEdge(C, 0.5)(xx) - 1; }, 0); }
      else { var C2 = P(w / 2, d + E, H + rh), D2 = P(w / 2, -E, H + rh); strip(p, 'hd_clay_ridge', rmap, C2[0], D2[0], function (xx) { return topEdge(C2, -0.5)(xx) - 1; }, 0); }
    }
    if (spec.roof.type === 'gable' && tier >= 2 && (type === 'cottage' ? (tier === 3 || v.barge) : (tier === 3 && v.barge))) {
      if (g.axis === 'y') {
        var Ap = P(w / 2, d + E, H + rh), L0 = P(-E, d + E, H), R0 = P(w + E, d + E, H);
        strip(p, 'hd_bargeboard', {}, L0[0] + 1, Ap[0], function (xx) { return lerpY(L0, Ap)(xx) + 1; }, 0);
        strip(p, 'hd_bargeboard', {}, Ap[0], R0[0] - 1, function (xx) { return lerpY(Ap, R0)(xx) + 1; }, 0, 6);
      } else {
        var Rb = P(w + E, d + E, H), Apx = P(w + E, d / 2, H + rh);
        strip(p, 'hd_bargeboard', {}, Rb[0] + 1, Apx[0], function (xx) { return lerpY(Rb, Apx)(xx) + 1; }, 1);
      }
    }
    if (type === 'lodge' && tier === 1) {
      var rope = function (a, b) { x.line(a[0], a[1], b[0], b[1], function (xx, yy) { p.set(xx, yy, R('walnut', 2)); }); p.set(b[0], b[1] + 1, R('walnut', 3)); };
      if (g.axis === 'x') { rope(P(0.3, d / 2, H + rh), P(0.3, d + E, H)); rope(P(0.72, d / 2, H + rh), P(0.72, d + E, H)); }
      else { rope(P(w / 2, 0.3, H + rh), P(w + E, 0.3, H)); rope(P(w / 2, 0.72, H + rh), P(w + E, 0.72, H)); }
    }
    if (type === 'cottage' && v.dormer && g.axis === 'x') {
      var dsp = x.shell({ w: 0.375, d: 0.375, h: 6, wall: spec.wall2 ? { tex: spec.wall2.tex, ramp: spec.wall2.ramp, map: spec.wall2.map } : spec.wall,
        roof: { type: 'gable', axis: 'y', tex: spec.roof.tex, ramp: roofR, pitch: 1 }, snow: snow });
      var zr = round(H + rh * 0.5), Bd = P(0.3125, 0.4375, zr); p.blit(dsp.pix, Bd[0] - dsp.ox, Bd[1] - dsp.oy);
      var wc = P(0.5, 0.8125, zr + 3); p.set(wc[0] - 1, wc[1] - 1, R('ember', 0)); p.set(wc[0], wc[1] - 1, R('ember', 1)); p.set(wc[0] - 1, wc[1], R('ember', 1)); p.set(wc[0], wc[1], R('ember', 2));
    }
    var chim = null;
    if (v.chimney) {
      var Q = g.axis === 'x' ? P(w * v.chimX, d / 2, H + rh) : P(w / 2, d * v.chimX, H + rh);
      for (var cx = Q[0] - 2; cx <= Q[0] + 1; cx++) for (var cy = Q[1] - 7; cy <= Q[1] + 2; cy++) {
        var c = x.texC('tex_drystone', cx, cy, 'river', cx < Q[0] ? 0 : 1);
        if (cx === Q[0] - 2) c = x.shift(c, 1); else if (cx === Q[0] + 1) c = x.darkest(c);
        p.set(cx, cy, c);
      }
      p.blit(x.sprite('hd_chimney_cap'), Q[0] - 3, Q[1] - 10);
      chim = [Q[0], Q[1] - 11];
    }
    /* accessories */
    var BLx = g.BL, BRx = g.BR, Ept = P(w, 0, 0);
    v.acc.forEach(function (acc) {
      if (acc === 'pot_flowers') p.blit(x.sprite('pot_flowers', { ACCENT: v.bloom, FOLIAGE: fol }), BLx[0] - 5, BLx[1] - 4);
      else if (acc === 'barrel') p.blit(x.sprite('barrel'), Ept[0] - 9, Ept[1] - 2);
      else if (acc === 'tool_lean') onFace(p, g, 'R', 'tool_lean', {}, 2, 0);
      else if (acc === 'laundry' && H >= 18) onFace(p, g, other, 'laundry', { MAIN: v.paint, ACCENT: v.bloom }, snap(4, other, 8), H - 7);
      else if (acc === 'herb_bundle') p.blit(x.sprite('herb_bundle'), BRx[0] - 5, faceY(g, 'L', 16 * w - 4) - H + 2);
      else if (acc === 'wind_chime') p.blit(x.sprite('wind_chime'), BRx[0] - 2, BRx[1] - H + 2);
      else if (acc === 'planter_hang') p.blit(x.sprite('planter_hang', { ACCENT: v.bloom, FOLIAGE: fol }), BRx[0] + 9, faceY(g, 'R', 10) - H + 2);
      else if (acc === 'lantern') { var la = doorA + 7 <= 13 ? doorA + 7 : doorA - 4; p.blit(x.sprite('lantern', { ACCENT: v.paint2 }), faceX(g, doorFace, la), faceY(g, doorFace, la) - doorTop - 4); }
    });
    if (type === 'lodge') {
      var aa = doorA + 3; p.blit(x.sprite('sig_antlers'), faceX(g, doorFace, aa) - 4, faceY(g, doorFace, aa) - doorTop - 6);
      p.blit(x.sprite('sig_drying_rack', { ACCENT: roofR === 'cream' ? 'hide' : 'cream' }), BLx[0] - 15, BLx[1] - 8);
    }
    var roofPt = spec.roof.type === 'hip' ? P(w / 2, d / 2, H + rh) : (g.axis === 'x' ? P(w * 0.5, d / 2, H + rh) : P(w / 2, d * 0.5, H + rh));
    return { pix: p, ox: g.ox, oy: g.oy, fw: 1, fd: 1, roof: roofPt, chim: chim, h: spec.h, v: v };
  }

  /* ---------- previews for the atelier ---------- */
  function preview(type, tier, k, season, lvl) {
    var x = X(), b = building(type, tier, k, season, lvl, PREVIEW_OPTS(type)), S = x.SEASONS[season], gr = season === 3 ? 'snow' : S.grass;
    var fw = b.fw || 1, fd = b.fd || 1;
    var p = new x.Pix(b.pix.w, b.pix.h + 10), Pg = function (u, v) { return [b.ox + (u - v) * 16, b.oy + (u + v) * 8]; };
    x.fillPoly(p, [Pg(-0.5, -0.5), Pg(fw + 0.5, -0.5), Pg(fw + 0.5, fd + 0.5), Pg(-0.5, fd + 0.5)], function () { return x.R(gr, season === 3 ? 0 : 1); });
    var L = round(Math.max(0.3, b.h / 26) * S.shadow * 8) / 8;
    if (!b.noShadow) x.fillPoly(p, [Pg(0, 0), Pg(fw + L, 0), Pg(fw + L, fd), Pg(0, fd)], function (px, py) { return x.shift(p.get(px, py), 1); });
    p.blit(b.pix, 0, 0);
    var c = crop(p, 2), dx = c.ox0, dy = c.oy0;
    var K = 2, o = new x.Pix(c.w * K, c.h * K);
    for (var y = 0; y < c.h; y++) for (var xx = 0; xx < c.w; xx++) { var col = c.d[y * c.w + xx]; if (!col) continue; for (var j = 0; j < K; j++) for (var i = 0; i < K; i++) o.d[(y * K + j) * o.w + xx * K + i] = col; }
    (b.signs || []).forEach(function (s) { var sp = signPix(s), hx = (s.x - dx) * K, hy = (s.y - dy) * K; o.blit(sp, hx - (sp.w >> 1) + 1, hy); o.set(hx + 1, hy - 1, x.R('iron', 2)); o.set(hx + 1, hy - 2, x.R('iron', 2)); });
    return o;
  }
  function row(pixes, gap) {
    var x = X(), W = 0, Hh = 0; pixes.forEach(function (q) { W += q.w + gap; Hh = Math.max(Hh, q.h); });
    var o = new x.Pix(Math.max(1, W - gap), Hh), cx = 0;
    pixes.forEach(function (q) { o.blit(q, cx, Hh - q.h); cx += q.w + gap; });
    return o;
  }
  function PREVIEW_OPTS(type) { return DYN[type] ? { af: 0, fq: 0.7, metal: 'iron', on: true } : undefined; }
  function sheet(type, tier, season, n) { var a = []; for (var i = 0; i < n; i++) a.push(preview(type, tier, i, season, 0)); return row(a, 4); }
  function densitySheet(type, tier, season) { return row([0, 1, 2].map(function (l) { return preview(type, tier, 0, season, l); }), 6); }
  function samples() {
    var out = [];
    Object.keys(COMPOSERS).forEach(function (t) { [1, 2, 3].forEach(function (tr) { [1, 3].forEach(function (s) { out.push({ pix: building(t, tr, 0, s, 2, PREVIEW_OPTS(t)).pix, label: t + ' P' + tr + ' s' + s }); }); }); });
    return out;
  }
  function report() {
    var S = slots(), lines = [];
    Object.keys(CFG).forEach(function (t) { if (S[t].length < CFG[t][1]) lines.push('slots: ' + t + ' got ' + S[t].length + ' of ' + CFG[t][1] + ' reserved'); });
    lines.push('anti-clone: ' + CLONE_FAIL.size + ' unresolved neighbour clash(es) among ' + VARS.size + ' variants generated');
    return lines;
  }

  /* ---------- runtime: scaffolds, particles, static + dynamic drawing ---------- */
  var VIL = { plan: { list: [], per: {} }, tier: 1, season: 1, wind: 0, st: null, started: true }, PREV = null, SCAF = {}, PARTS = [], LAST = -1, CHIMS = [], EMITS = [], STEPN = 0, TRANS = null;
  function dynOpts(it, t) { var f = DYN[it.type]; return f ? f(VIL.st || {}, t, it) : undefined; }
  function update(st, t) {
    var pl = plan(st), cal = (st && st.city && st.city.calendar) || {}, tech = (st && st.tech) || {}, nt = tierOf(st);
    /* tier change: cross-fade old and new sprites (ordered dither, 8 steps over 1.2 s) with dust and sparks */
    if (VIL.inited && nt !== VIL.tier) TRANS = { from: VIL.tier, t0: t, fired: false };
    VIL.inited = true;
    VIL.started = (tech.primitive | 0) >= 3 || (cal.day | 0) > 0;
    VIL.plan = pl; VIL.tier = nt; VIL.wind = cal.wind | 0; VIL.st = st; VIL.cal = cal;
    if (SK.citizens) SK.citizens.update(st, t);
    var now = {}; Object.keys(pl.per).forEach(function (k) { now[k] = pl.per[k].v; });
    if (PREV) pl.list.forEach(function (it) { if (COMPOSERS[it.type] && it.k >= (PREV[it.type] || 0)) SCAF[it.type + '|' + it.k] = { t0: t, it: it }; });
    PREV = now;
    Object.keys(SCAF).forEach(function (k) {
      var s = SCAF[k], live = pl.list.some(function (it) { return it.type === s.it.type && it.k === s.it.k; });
      if (!live) { delete SCAF[k]; return; }
      if (t - s.t0 > 2500) { var c = X().worldPt(s.it.x + s.it.fw / 2, s.it.y + s.it.fd / 2); burst(c[0], c[1] - s.it.h, 'spark', 6); delete SCAF[k]; }
    });
    if (LAST < 0 || t - LAST > 2000) LAST = t;
    while (t - LAST >= 125) { LAST += 125; step(0.125); }
  }
  function burst(x, y, kind, n) {
    for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; PARTS.push({ x: x, y: y, vx: Math.cos(a) * 22, vy: Math.sin(a) * 14 - (kind === 'dust' ? 6 : 0), age: 0, life: 0.6, kind: kind, g: kind === 'dust' ? 30 : 0 }); }
  }
  function step(dt) {
    STEPN++;
    var ih = X().ih, wind = VIL.wind;
    if (STEPN % 2 === 0) CHIMS.forEach(function (c, i) { PARTS.push({ x: c[0] + (ih(i, STEPN, 3) < 0.5 ? 0 : 1), y: c[1], vx: wind ? 7 : 1.5, vy: -6, age: 0, life: 1.6, kind: 'smoke', g: 0 }); });
    EMITS.forEach(function (e, i) {
      var r = ih(i, STEPN, 5);
      if (e.kind === 'sawdust' && r < 0.42) PARTS.push({ x: e.x, y: e.y, vx: (r - 0.2) * 60, vy: -14 - r * 10, age: 0, life: 0.5, kind: 'sawdust', g: 70 });
      else if (e.kind === 'spark' && STEPN % 5 === (i % 5)) for (var m = 0; m < 3; m++) PARTS.push({ x: e.x, y: e.y, vx: (ih(i, STEPN, m + 7) - 0.5) * 44, vy: -34 - ih(m, STEPN, i) * 20, age: 0, life: 0.5, kind: 'spark', g: 120 });
      else if ((e.kind === 'dust' || e.kind === 'coal') && STEPN % 12 === (i % 12)) for (var j = 0; j < 4; j++) PARTS.push({ x: e.x, y: e.y, vx: (ih(i, STEPN, j) - 0.5) * 30, vy: -8 - j * 2, age: 0, life: 0.6, kind: e.kind, g: 26 });
    });
    Object.keys(SCAF).forEach(function (k, i) { var it = SCAF[k].it, c = X().worldPt(it.x + ih(i, STEPN, 1) * it.fw, it.y + it.fd); PARTS.push({ x: c[0], y: c[1] - 1, vx: (ih(i, STEPN, 2) - 0.5) * 20, vy: -10, age: 0, life: 0.6, kind: 'dust', g: 30 }); });
    for (var i = PARTS.length - 1; i >= 0; i--) { var q = PARTS[i]; q.age += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt; if (q.age >= q.life) PARTS.splice(i, 1); }
    if (PARTS.length > 500) PARTS.splice(0, PARTS.length - 500);
  }
  var DISC = { 1: ['x'], 2: ['xx', 'xx'], 3: ['.x.', 'xxx', '.x.'], 4: ['.xx.', 'xxxx', 'xxxx', '.xx.'] };
  function drawDynamic(b, ctx) {
    var x = X(), R = x.R;
    Object.keys(SCAF).forEach(function (k) { var s = SCAF[k]; drawScaffold(b, s.it, Math.min(1, (ctx.t - s.t0) / 2500)); });
    if (SK.world) SK.world.dyn(b, ctx);
    PARTS.forEach(function (q) {
      var size = 1, c;
      if (q.kind === 'smoke') { size = 1 + floor(q.age / q.life * 2.99); c = R('ashen', q.age < q.life * 0.5 ? 0 : 1); }
      else if (q.kind === 'spark') c = (floor(q.age * 10) % 2) ? x.pal().spark : R('ember', 0);
      else if (q.kind === 'sawdust') c = R('pinewood', q.age < 0.25 ? 0 : 1);
      else if (q.kind === 'coal') { size = q.age < 0.3 ? 2 : 1; c = R('soot', q.age < 0.3 ? 1 : 2); }
      else { size = q.age < 0.3 ? 2 : 1; c = R('dirt', 0); }
      var D = DISC[size], px = round(q.x) - floor(size / 2), py = round(q.y) - floor(size / 2);
      for (var j = 0; j < D.length; j++) for (var i = 0; i < D[j].length; i++) if (D[j][i] === 'x') b.set(px + i, py + j, c);
    });
  }
  /* hi-res pass: the world buffer has been upscaled by k; people, animals, weather and tap feedback draw at native pixels */
  function drawActors(B, ctx, k) {
    drawSigns(B, k);
    if (SK.citizens) SK.citizens.draw(B, ctx, k);
    if (SK.world) SK.world.actors(B, ctx, k);
    if (SK.ui) SK.ui.actors(B, ctx, k);
    if (SK.world) SK.world.over(B, ctx, k);
  }
  function drawScaffold(b, it, prog) {
    var x = X(), wp = x.worldPt, z = round(it.h * Math.min(1, 0.25 + prog * 1.2)), lit = x.R('pinewood', 1), mid = x.R('pinewood', 2), dk = x.R('pinewood', 3);
    var N = wp(it.x, it.y), W = wp(it.x, it.y + it.fd), S = wp(it.x + it.fw, it.y + it.fd), Ep = wp(it.x + it.fw, it.y);
    function L(a, za, c2, zc, col) { x.line(a[0], a[1] - za, c2[0], c2[1] - zc, function (px, py) { b.set(px, py, col); }); }
    L(N, 0, N, z, dk); L(N, z, W, z, dk); L(N, z, Ep, z, dk);
    [W, S, Ep].forEach(function (q, i) { L(q, 0, q, z + 3, i === 2 ? dk : mid); });
    L(W, round(z / 2), S, round(z / 2), lit); L(W, z, S, z, lit); L(S, round(z / 2), Ep, round(z / 2), dk); L(S, z, Ep, z, dk);
    L(W, 0, S, z, lit); L(S, 0, Ep, z, mid);
  }
  function signature(st, ctx) {
    var pl = VIL.plan;
    var t = ctx ? ctx.t : 0;
    var cl = VIL.cal || {};
    return [cl.weather, cl.temp, cl.moon, (cl.day | 0) % 24].join(':') + '|' + VIL.tier + '|' + VIL.wind + '|' + (VIL.started ? 1 : 0) + '|' + (TRANS ? 'tr' + floor((t - TRANS.t0) / 150) : '') + '|' + pl.list.map(function (i) { return i.type.slice(0, 3) + i.k + '.' + i.lvl + (DYN[i.type] ? '.' + okey(dynOpts(i, t)) : ''); }).join(',') + '|' + Object.keys(SCAF).join(',');
  }
  function drawStatic(b, ctx) {
    var x = X(), pl = VIL.plan, S = x.SEASONS[ctx.season], wp = x.worldPt, T = ctx.T, WW = x.WW;
    CHIMS = []; EMITS = []; PLACED = {};
    if (!DEPTH || DEPTH.length !== b.d.length) DEPTH = new Float32Array(b.d.length);
    DEPTH.fill(-1e6); SIGNS = [];
    if (!IDS || IDS.length !== b.d.length) IDS = new Int16Array(b.d.length);
    IDS.fill(-1);
    if (SK.world) SK.world.sky(b, ctx);
    var rp = wp(12, 12); b.blit(x.sprite('rug_plaza'), rp[0] - 6, rp[1] - 3);
    var items = pl.list.filter(function (it) { return COMPOSERS[it.type] && !SCAF[it.type + '|' + it.k]; });
    var tr = TRANS && ctx.t - TRANS.t0 < 1200 ? TRANS : null; if (!tr) TRANS = null;
    var prog = tr ? (Math.min(7, floor((ctx.t - tr.t0) / 150)) + 1) / 9 : 1;
    items.forEach(function (it) {
      it.bld = building(it.type, VIL.tier, it.k, ctx.season, it.lvl, dynOpts(it, ctx.t));
      it.old = tr ? building(it.type, tr.from, it.k, ctx.season, it.lvl, dynOpts(it, ctx.t)) : null;
      if (tr && !tr.fired) { var c0 = wp(it.x + it.fw / 2, it.y + it.fd); burst(c0[0], c0[1] - 2, 'dust', 6); var c1 = wp(it.x + it.fw / 2, it.y + it.fd / 2); burst(c1[0], c1[1] - it.h, 'spark', 5); }
      if (it.bld.noShadow) return;
      var L = round(Math.max(0.3, it.bld.h / 26) * S.shadow * 8) / 8;
      x.fillPoly(b, [wp(it.x, it.y), wp(it.x + it.fw + L, it.y), wp(it.x + it.fw + L, it.y + it.fd), wp(it.x, it.y + it.fd)],
        function (px, py) { var q = py * WW + px; return T[q] ? x.shift(b.d[q], 1) : 0; });
    });
    var deco = SK.world ? SK.world.decor(ctx) : [];
    if (tr) tr.fired = true;
    deco.forEach(function (d) { d.shadow(b); });
    items.sort(function (a, c) { return (a.x + a.y + (a.fw + a.fd) / 2) - (c.x + c.y + (c.fw + c.fd) / 2) || a.y - c.y; });
    var catIt = null;
    items.forEach(function (it) { if (!catIt && VIL.tier >= 2 && it.type === 'basic_housing') catIt = it; });
    var roofs = [];
    IDS_ITEMS = items;
    var all = items.map(function (it, i) { return { k: it.x + it.y + (it.fw + it.fd) / 2, y: it.y, it: it, id: i }; })
      .concat(deco.map(function (d) { return { k: d.k, y: d.v, d: d }; }));
    all.sort(function (a, c) { return a.k - c.k || a.y - c.y; });
    all.forEach(function (o) {
      if (o.d) { o.d.draw(b, blitD); return; }
      var it = o.it, sp = it.bld, at = wp(it.x, it.y), bx = at[0] - sp.ox, by = at[1] - sp.oy;
      it.bx = bx; it.by = by; PLACED[it.type + '|' + it.k] = { type: it.type, k: it.k, x: it.x, y: it.y, fw: it.fw, fd: it.fd, h: it.h, bx: bx, by: by, bld: sp };
      if (it.old && prog < 1) { var bl = blend(it.old, at[0] - it.old.ox, at[1] - it.old.oy, sp, bx, by, prog); blitD(b, bl.p, bl.x, bl.y, o.k, o.id); }
      else blitD(b, sp.pix, bx, by, o.k, o.id);
      if (sp.signs) sp.signs.forEach(function (s) { SIGNS.push({ x: bx + s.x, y: by + s.y, icon: s.icon, map: s.map, k: o.k }); });
      if (sp.chim) CHIMS.push([bx + sp.chim[0], by + sp.chim[1]]);
      if (sp.smoke) sp.smoke.forEach(function (q) { CHIMS.push([bx + q[0], by + q[1]]); });
      if (sp.emit) sp.emit.forEach(function (e) { EMITS.push({ x: bx + e[0], y: by + e[1], kind: e[2] }); });
      if (it === catIt) b.blit(x.sprite('cat_roof', { MAIN: ctx.season === 3 ? 'hair_black' : 'ochre' }), bx + sp.roof[0] - 2, by + sp.roof[1] - 5);
      if (VIL.tier >= 2 && VIL.started) roofs.push({ it: it, p: [bx + sp.roof[0], by + sp.roof[1]] });
    });
    var used = new Set();
    roofs.forEach(function (r, i) {
      if (used.has(i) || x.ih(r.it.k, r.it.type.length, 77) > 0.55) return;
      var best = -1, bd = 1e9;
      roofs.forEach(function (o, j) { if (j === i || used.has(j)) return; var dd = Math.hypot(o.it.x - r.it.x, o.it.y - r.it.y); if (dd < bd && dd <= 3.6) { bd = dd; best = j; } });
      if (best < 0) return; used.add(i); used.add(best);
      var A = r.p, B = roofs[best].p; if (A[0] > B[0]) { var t = A; A = B; B = t; }
      bunt(b, A, B, x.ih(r.it.k, 3, 91));
    });
    if (SK.world) SK.world.after(b, ctx);
    if (ctx.opt.clone) {
      var tt = VIL.tier;
      items.forEach(function (a, i) { items.forEach(function (c, j) {
        if (j <= i || a.type !== c.type || Math.hypot(a.x - c.x, a.y - c.y) > 2.9) return;
        var n = diff(variant(a.type, a.k, typeTier(a.type, tt)), variant(c.type, c.k, typeTier(c.type, tt))), col = n >= 2 ? x.R('sage', 0) : x.R('madder', 1);
        var A = wp(a.x + a.fw / 2, a.y + a.fd / 2), B = wp(c.x + c.fw / 2, c.y + c.fd / 2);
        x.line(A[0], A[1] - 4, B[0], B[1] - 4, function (px, py) { b.set(px, py, col); b.set(px, py + 1, x.R('soot', 4)); });
        if (SK.ui) { var mx = round((A[0] + B[0]) / 2), my = round((A[1] + B[1]) / 2) - 9;
          for (var yy = -1; yy < 9; yy++) for (var xx = -2; xx < 6; xx++) b.set(mx + xx, my + yy, x.R('soot', 4));
          SK.ui.text(b, String(n), mx, my, col); }
      }); });
    }
    if (ctx.opt.slots) {
      var Sl = slots();
      Object.keys(Sl).forEach(function (type) {
        var b0 = bmap()[type], vis = (pl.per[type] || {}).v || 0;
        Sl[type].forEach(function (s, k) {
          var fail = CLONE_FAIL.has(type + '|' + k + '|' + typeTier(type, VIL.tier)), col = fail ? x.R('madder', 1) : (k < vis ? x.R('saffron', 1) : x.R('cream', 2));
          var c = [wp(s.x, s.y), wp(s.x + b0.fw, s.y), wp(s.x + b0.fw, s.y + b0.fd), wp(s.x, s.y + b0.fd)];
          for (var i = 0; i < 4; i++) x.line(c[i][0], c[i][1], c[(i + 1) % 4][0], c[(i + 1) % 4][1], function (px, py) { b.set(px, py, col); });
        });
      });
    }
  }
  /* depth-tagged blit: citizens test against DEPTH so buildings in front hide them */
  var DEPTH = null, IDS = null, IDS_ITEMS = [], SIGNS = [], PLACED = {};
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function blend(A, ax, ay, Bq, bx, by, prog) {
    var x0 = Math.min(ax, bx), y0 = Math.min(ay, by), x1 = Math.max(ax + A.pix.w, bx + Bq.pix.w), y1 = Math.max(ay + A.pix.h, by + Bq.pix.h), p = new (X().Pix)(x1 - x0, y1 - y0);
    for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) {
      var nw = BAYER[(y & 3) * 4 + (x & 3)] / 16 < prog, c = nw ? Bq.pix.get(x - bx, y - by) : A.pix.get(x - ax, y - ay);
      if (c) p.d[(y - y0) * p.w + (x - x0)] = c;
    }
    return { p: p, x: x0, y: y0 };
  }
  /* sign board at native resolution: icon boards are the 16x16 resource icons, the hospital board is a code-drawn cross */
  var CROSS = null;
  function signPix(s) {
    if (s.icon !== 'cross') return X().sprite(s.icon, s.map);
    if (CROSS) return CROSS;
    var x = X(), R = x.R, p = new x.Pix(14, 14);
    for (var j = 0; j < 14; j++) for (var i = 0; i < 14; i++) {
      var e = i === 0 || j === 0 || i === 13 || j === 13, arm = (i >= 5 && i <= 8 && j >= 2 && j <= 11) || (j >= 5 && j <= 8 && i >= 2 && i <= 11);
      if (e && (i === 0 || i === 13) && (j === 0 || j === 13)) continue;
      p.set(i, j, e ? R('walnut', i === 13 || j === 13 ? 3 : 2) : arm ? R('madder', (i === 8 || j === 8) ? 2 : 1) : R('cream', j > 10 ? 1 : 0));
    }
    return (CROSS = p);
  }
  function drawSigns(B, k) {
    var D = DEPTH, W = X().WW;
    SIGNS.forEach(function (s) {
      var sp = signPix(s), hx = s.x * k, hy = s.y * k, ox = hx - (sp.w >> 1) + 1, oy = hy;
      for (var j = 0; j < sp.h; j++) for (var i = 0; i < sp.w; i++) { var c = sp.d[j * sp.w + i]; if (!c) continue; var tx = ox + i, ty = oy + j;
        if (tx < 0 || ty < 0 || tx >= B.w || ty >= B.h) continue; if (D && D[((ty / k) | 0) * W + ((tx / k) | 0)] > s.k + 0.01) continue; B.d[ty * B.w + tx] = c; }
      for (var q = 0; q < k; q++) { B.set(hx + 1, hy - 1 - q, X().R('iron', 2)); }
    });
  }
  function idAt(x, y) { x = round(x); y = round(y); if (!IDS || x < 0 || y < 0 || x >= X().WW || y >= X().WH) return null; var i = IDS[y * X().WW + x]; return i >= 0 ? IDS_ITEMS[i] || null : null; }
  function blitD(b, s, x, y, key, id) {
    if (id == null) id = -1;
    x = round(x); y = round(y);
    for (var j = 0; j < s.h; j++) { var ty = y + j; if (ty < 0 || ty >= b.h) continue;
      for (var i = 0; i < s.w; i++) { var c = s.d[j * s.w + i]; if (!c) continue; var tx = x + i; if (tx < 0 || tx >= b.w) continue; var q = ty * b.w + tx; b.d[q] = c; DEPTH[q] = key; IDS[q] = id; } }
  }
  function bunt(b, A, B, r) {
    var x = X(), dx = B[0] - A[0]; if (dx < 6) return;
    var pa = PAINT[floor(r * PAINT.length)], pb = PAINT[(floor(r * PAINT.length) + 3) % PAINT.length];
    var sp = x.sprite('bunting', { MAIN: pa, ACCENT: pb }), sag = 3 + round(dx / 14);
    for (var xx = A[0]; xx <= B[0]; xx++) {
      var t = (xx - A[0]) / dx, y = round(A[1] + (B[1] - A[1]) * t + sag * 4 * t * (1 - t)), col = (xx - A[0]) % sp.w;
      for (var j = 0; j < sp.h; j++) { var c = sp.d[j * sp.w + col]; if (c) b.set(xx, y + j, c); }
    }
  }

  SK.village = { update: update, signature: signature, drawStatic: drawStatic, drawDynamic: drawDynamic, building: building, preview: preview,
    sheet: sheet, densitySheet: densitySheet, samples: samples, report: report, slots: slots, plan: plan, visN: visN, variant: variant,
    tierOf: tierOf, CFG: CFG, COMPOSERS: COMPOSERS, DYN: DYN, bunt: bunt, vil: VIL, depth: function () { return DEPTH; }, idAt: idAt, drawActors: drawActors,
    burst: burst, scaf: function () { return SCAF; }, trans: function () { return TRANS; }, signs: function () { return SIGNS; }, house: house,
    placed: function () { return Object.keys(PLACED).map(function (k) { return PLACED[k]; }); },
    H: { geo: geo, faceY: faceY, faceX: faceX, snap: snap, onFace: onFace, strip: strip, faceStrip: faceStrip, bottomEdge: bottomEdge, topEdge: topEdge,
      lerpY: lerpY, crop: crop, variant: variant, PAINT: PAINT, BLOOM: BLOOM, E: E } };
  /* extension hooks: later batches register here; each runs once per SK.village instance, in dependency order */
  SK._ext = SK._ext || [];
  SK._runExt = function () {
    if (!SK.village || !G.SpriteKit) return;
    for (var prog = true; prog;) { prog = false;
      SK._ext.forEach(function (e) { if (e.done === SK.village) return; if (e.fn() !== false) { e.done = SK.village; prog = true; } }); }
  };
  SK._runExt();
})(window);
