/* Evolve village sprite kit — core (PRNG, decoder, iso generator, terrain, seasons, view, API).
   Plain ES2019, Canvas 2D, offline. Every pixel written comes from SK.PALETTE. */
(function (G) {
  'use strict';
  var SK = G.SK = G.SK || {};
  SK.PIECES = SK.PIECES || {};
  SK.PARTS = SK.PARTS || {};

  /* ---------- PRNG + noise ---------- */
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash() { var s = Array.prototype.join.call(arguments, '|'), h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng() { return mulberry32(hash.apply(null, arguments)); }
  function ih(x, y, s) { var h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function vnoise(x, y, s) { var xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); var a = ih(xi, yi, s), b = ih(xi + 1, yi, s), c = ih(xi, yi + 1, s), d = ih(xi + 1, yi + 1, s); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; }
  function mod(a, n) { return ((a % n) + n) % n; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------- palette ---------- */
  var C = null;
  function toU(hex) { var n = parseInt(hex.slice(1), 16); return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0; }
  function pal() {
    if (C) return C;
    var P = SK.PALETTE, r = {}, rev = new Map(), all = new Set();
    Object.keys(P.ramps).forEach(function (k) { r[k] = P.ramps[k].map(toU); r[k].forEach(function (u, i) { all.add(u); if (!rev.has(u)) rev.set(u, [k, i]); }); });
    var ink = toU(P.ink), spark = toU(P.spark); all.add(ink); all.add(spark);
    return (C = { r: r, rev: rev, all: all, ink: ink, spark: spark });
  }
  function R(name, i) { var p = pal().r[name]; if (!p) return pal().ink; return p[clamp(i, 0, p.length - 1)]; }
  function shift(u, k) { var e = pal().rev.get(u); return e ? R(e[0], e[1] + k) : u; }
  function darkest(u) { var e = pal().rev.get(u); return e ? R(e[0], 4) : u; }

  /* ---------- pixel buffer ---------- */
  function Pix(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); }
  Pix.prototype.set = function (x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.d[y * this.w + x] = c; };
  Pix.prototype.get = function (x, y) { x = Math.floor(x); y = Math.floor(y); return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? 0 : this.d[y * this.w + x]; };
  Pix.prototype.blit = function (s, x, y, flip) {
    x = Math.round(x); y = Math.round(y);
    for (var j = 0; j < s.h; j++) { var ty = y + j; if (ty < 0 || ty >= this.h) continue;
      for (var i = 0; i < s.w; i++) { var c = s.d[j * s.w + (flip ? s.w - 1 - i : i)]; if (!c) continue; var tx = x + i; if (tx < 0 || tx >= this.w) continue; this.d[ty * this.w + tx] = c; } }
  };
  Pix.prototype.canvas = function () {
    if (this._cv) return this._cv;
    var cv = document.createElement('canvas'); cv.width = this.w; cv.height = this.h;
    var cx = cv.getContext('2d'), id = cx.createImageData(this.w, this.h);
    new Uint32Array(id.data.buffer).set(this.d); cx.putImageData(id, 0, 0);
    return (this._cv = cv);
  };
  var ROT_LOG = [];
  Pix.prototype.rot = function (q) {
    if (q % 90 !== 0) { ROT_LOG.push(q); throw new Error('rotation must be a multiple of 90'); }
    var k = mod(q / 90, 4), s = this; if (!k) return s;
    var o = (k % 2) ? new Pix(s.h, s.w) : new Pix(s.w, s.h);
    for (var y = 0; y < s.h; y++) for (var x = 0; x < s.w; x++) {
      var c = s.d[y * s.w + x]; if (!c) continue;
      if (k === 1) o.set(s.h - 1 - y, x, c); else if (k === 2) o.set(s.w - 1 - x, s.h - 1 - y, c); else o.set(y, s.w - 1 - x, c);
    }
    return o;
  };
  function line(x0, y0, x1, y1, fn) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for (;;) { fn(x0, y0); if (x0 === x1 && y0 === y1) break; var e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  function fillPoly(p, pts, fn) {
    var minY = 1e9, maxY = -1e9, n = pts.length;
    for (var i = 0; i < n; i++) { minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1]); }
    minY = Math.max(0, Math.floor(minY)); maxY = Math.min(p.h - 1, Math.ceil(maxY));
    for (var y = minY; y <= maxY; y++) {
      var cy = y + 0.5, xs = [];
      for (i = 0; i < n; i++) { var a = pts[i], b = pts[(i + 1) % n];
        if ((a[1] <= cy && b[1] > cy) || (b[1] <= cy && a[1] > cy)) xs.push(a[0] + (cy - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); }
      xs.sort(function (u, v) { return u - v; });
      for (var k = 0; k + 1 < xs.length; k += 2) {
        var xa = Math.max(0, Math.ceil(xs[k] - 0.5)), xb = Math.min(p.w - 1, Math.ceil(xs[k + 1] - 0.5) - 1);
        for (var x = xa; x <= xb; x++) { var c = fn(x, y); if (c) p.d[y * p.w + x] = c; }
      }
    }
  }

  /* ---------- piece decoder ---------- */
  var CH = { '.': null };
  '12345'.split('').forEach(function (c, i) { CH[c] = ['MAIN', i]; });
  'abcd'.split('').forEach(function (c, i) { CH[c] = ['ACCENT', i]; });
  'stuv'.split('').forEach(function (c, i) { CH[c] = ['SKIN', i]; });
  'hijk'.split('').forEach(function (c, i) { CH[c] = ['HAIR', i]; });
  'mnpq'.split('').forEach(function (c, i) { CH[c] = ['METAL', i]; });
  'wxyz'.split('').forEach(function (c, i) { CH[c] = ['WOOD', i]; });
  'fglr'.split('').forEach(function (c, i) { CH[c] = ['FOLIAGE', i]; });
  CH.e = ['EMBER', 1]; CH.o = ['INK', 0]; CH['*'] = ['SPARK', 0];
  var DEF = { MAIN: 'oak', ACCENT: 'madder', SKIN: 'skin_fair', HAIR: 'hair_chestnut', METAL: 'iron', WOOD: 'oak', FOLIAGE: 'summer', EMBER: 'ember' };
  var ATLAS = new Map();

  function slotMap(name, map) {
    var d = SK.PIECES[name], m = Object.assign({}, DEF, (d && d.def) || {});
    if (map) for (var k in map) if (map[k]) m[k] = map[k];
    return m;
  }
  function sprite(name, map, opt) {
    opt = opt || {};
    var d = SK.PIECES[name]; if (!d) throw new Error('unknown piece ' + name);
    var m = slotMap(name, map), sh = opt.shade | 0;
    var key = 'piece|' + name + '|' + JSON.stringify(m) + '|' + (opt.flip ? 1 : 0) + '|' + sh + '|' + (opt.rot | 0);
    var hit = ATLAS.get(key); if (hit) return hit;
    var p = new Pix(d.w, d.h), pc = pal();
    for (var y = 0; y < d.h; y++) { var row = d.rows[y] || '';
      for (var x = 0; x < d.w; x++) { var e = CH[row[x]]; if (!e) continue;
        var c = e[0] === 'INK' ? pc.ink : e[0] === 'SPARK' ? pc.spark : R(m[e[0]], e[1] + (e[0] === 'EMBER' ? 0 : sh));
        p.set(opt.flip ? d.w - 1 - x : x, y, c); } }
    if (opt.rot) p = p.rot(opt.rot);
    ATLAS.set(key, p); return p;
  }
  function texTone(name, u, v) {
    var d = SK.PIECES[name]; var ch = d.rows[mod(Math.floor(v), d.h)][mod(Math.floor(u), d.w)]; var e = CH[ch]; return e ? e[1] : 1;
  }
  /* texture colour with full slot resolution (MAIN -> given ramp, other slots -> map / piece default) */
  function texC(name, u, v, main, off, map) {
    var d = SK.PIECES[name], e = CH[d.rows[mod(Math.floor(v), d.h)][mod(Math.floor(u), d.w)]] || ['MAIN', 1], pc = pal();
    if (e[0] === 'INK') return pc.ink; if (e[0] === 'SPARK') return pc.spark;
    var r = e[0] === 'MAIN' ? main : ((map && map[e[0]]) || (d.def && d.def[e[0]]) || DEF[e[0]]);
    return R(r, e[1] + (e[0] === 'EMBER' ? 0 : off));
  }

  /* ---------- world tables ---------- */
  var SEASONS = [
    { id: 'spring', grass: 'spring', tree: 'spring', flowers: 0.16, shadow: 1.0 },
    { id: 'summer', grass: 'summer', tree: 'summer', flowers: 0.09, shadow: 0.7 },
    { id: 'autumn', grass: 'dry', tree: 'autumn', flowers: 0.04, shadow: 1.1 },
    { id: 'winter', grass: 'snow', tree: 'frost', flowers: 0, shadow: 1.3, snow: true }
  ];
  /* Biome swap tables (palette substitutions only). Grassland is the polished default. */
  var BIOMES = {
    grassland: {},
    oceanic: { grass: 'lush', dirt: 'sand', water: 'water' },
    forest: { grass: 'conifer', tree: 'conifer' },
    desert: { grass: 'sand', dirt: 'dirt', rock: 'sandstone', tree: 'dry', hot: true },
    volcanic: { grass: 'basalt', dirt: 'ashen', rock: 'basalt', tree: 'ashleaf', hot: true, cracks: 0.06 },
    tundra: { snow: true, tree: 'frost' },
    savanna: { grass: 'dry', dirt: 'sand', tree: 'dry', hot: true },
    swamp: { grass: 'murk', water: 'murk', tree: 'murk' },
    ashland: { grass: 'ashen', dirt: 'basalt', rock: 'slate', tree: 'ashleaf', hot: true },
    taiga: { grass: 'conifer', tree: 'conifer' },
    hellscape: { grass: 'scorch', dirt: 'basalt', rock: 'basalt', water: 'ember', tree: 'scorch', hot: true, cracks: 0.09 },
    eden: { grass: 'lush', tree: 'lush', flowers: 2.2 }
  };
  var BUILDINGS = [
    ['basic_housing', 'Cabin', 'living', 1, 1, 18], ['cottage', 'Cottage', 'living', 1, 1, 24], ['lodge', 'Lodge', 'living', 1, 1, 20],
    ['smokehouse', 'Smokehouse', 'food', 1, 1, 18], ['farm', 'Farm', 'food', 2, 2, 6], ['compost', 'Compost Heap', 'food', 1, 1, 6],
    ['silo', 'Grain Silo', 'food', 1, 1, 36], ['mill', 'Mill', 'food', 1, 1, 34],
    ['shed', 'Shed', 'storage', 1, 1, 14], ['storage_yard', 'Freight Yard', 'storage', 2, 2, 10],
    ['lumber_yard', 'Lumber Yard', 'extraction', 2, 2, 12], ['sawmill', 'Sawmill', 'extraction', 2, 2, 26], ['rock_quarry', 'Rock Quarry', 'extraction', 2, 2, 8],
    ['mine', 'Mine', 'extraction', 2, 2, 22], ['coal_mine', 'Coal Mine', 'extraction', 2, 2, 22],
    ['foundry', 'Foundry', 'industry', 2, 2, 26], ['smelter', 'Smelter', 'industry', 2, 2, 34], ['cement_plant', 'Cement Plant', 'industry', 2, 2, 28],
    ['trade', 'Trade Post', 'commerce', 2, 1, 18], ['bank', 'Bank', 'commerce', 2, 1, 24], ['library', 'Library', 'knowledge', 2, 1, 24], ['university', 'University', 'knowledge', 2, 2, 34],
    ['temple', 'Temple', 'society', 2, 2, 34], ['amphitheatre', 'Amphitheatre', 'society', 2, 2, 16], ['garrison', 'Barracks', 'society', 2, 1, 20], ['hospital', 'Hospital', 'society', 2, 1, 22],
    ['metal_refinery', 'Metal Refinery', 'industry', 2, 2, 28]
  ].map(function (b) { return { key: b[0], name: b[1], sector: b[2], fw: b[3], fd: b[4], h: b[5] }; });
  var JOBS = ['unemployed', 'forager', 'farmer', 'hunter', 'lumberjack', 'quarry_worker', 'miner', 'coal_miner', 'cement_worker', 'craftsman', 'teamster', 'professor', 'scientist', 'priest', 'banker', 'entertainer', 'soldier', 'scavenger'];
  var RESOURCES = ['Food', 'Lumber', 'Stone', 'Furs', 'Copper', 'Iron', 'Cement', 'Coal', 'Steel', 'Money', 'Knowledge', 'Plywood', 'Brick', 'Wrought_Iron', 'Sheet_Metal', 'Aluminium'];
  /* 169 pieces of batches 1-7, 53 of batch 8 (Era 1 audit follow-up), 45 of batch 9 (Era 0: cell, organism, scenery, fx) */
  var EXPECTED = { texture: 9, module: 21, signature: 19, hero: 13, citizen: 73, decor: 27, animal: 14, icon: 18, unit: 11, effect: 10, 'interface': 7, cell: 13, organism: 18, scenery: 8, fx: 6 };
  var ERA0 = { cell: 1, organism: 1, scenery: 1, fx: 1 };
  var BASE = { texture: 9, module: 19, signature: 18, hero: 12, citizen: 58, decor: 17, animal: 10, icon: 12, unit: 6, effect: 3, 'interface': 5 };

  /* ---------- isometric shell generator ----------
     spec: { w, d, h, shape:'box'|'round', r, plinth, plinthRamp,
             wall:{tex, ramp}, roof:{type:'gable'|'hip'|'lean'|'flat'|'cone'|'dome'|'none', axis:'x'|'y', tex, ramp, pitch, H}, snow }
     Light from the upper left: left faces +0, right faces +1, roof planes facing +y +0, facing +x +1. */
  var SHELLS = new Map();
  function shell(s) {
    var key = 'shell|' + JSON.stringify(s); var hit = SHELLS.get(key); if (hit) return hit;
    var w = s.w, d = s.d, h = s.h, e = 0.125, rf = s.roof || { type: 'none' }, pl = s.plinth || 0, round = s.shape === 'round';
    var H = h + (rf.type === 'flat' ? 2 : 0), rh = 0;
    if (rf.type === 'gable') rh = 4 * (rf.axis === 'y' ? w : d) + 1 + (rf.pitch || 0);
    else if (rf.type === 'hip') rh = 4 * Math.min(w, d) + 1 + (rf.pitch || 0);
    else if (rf.type === 'lean') rh = 4 * (rf.axis === 'y' ? w : d);
    else if (rf.type === 'cone' || rf.type === 'dome') rh = rf.H || 14;
    var top = Math.ceil(H + rh + 6), W = Math.ceil(16 * (w + d)) + 12, Ht = Math.ceil(top + 8 * (w + d) + 3);
    var p = new Pix(W, Ht), ox = Math.round(16 * d + 6), oy = top;
    function P(x, y, z) { return [ox + (x - y) * 16, oy + (x + y) * 8 - z]; }
    var wt = s.wall.tex, wr = s.wall.ramp, pr = s.plinthRamp || 'river', ptx = s.plinthTex || 'tex_drystone', w2 = s.wall2, roofed = rf.type !== 'none' && rf.type !== 'flat';
    function wallC(zf, u, off) {
      if (zf < pl) return texC(ptx, u, Math.floor(-zf), pr, off);
      if (roofed && zf > H - 2 && zf <= H) off++;
      var v = Math.floor(H + rh - zf);
      if (w2 && zf >= w2.z) return zf < w2.z + 1 ? R(s.bandRamp || 'walnut', 3 + (off > 0 ? 1 : 0)) : texC(w2.tex, u, v, w2.ramp, off, w2.map);
      return texC(wt, u, v, wr, off, s.wall.map);
    }
    var BL = P(0, d, 0), BR = P(w, d, 0);
    function shL(px, py) { var zf = BL[1] + (px + 0.5 - BL[0]) * 0.5 - (py + 0.5); return wallC(zf, px - BL[0], px === BR[0] - 1 ? -1 : 0); }
    function shR(px, py) { var zf = BR[1] - (px + 0.5 - BR[0]) * 0.5 - (py + 0.5); return wallC(zf, px - BR[0], 1); }
    function roofSh(dir, off) {
      return function (px, py) { var u = px - ox, v = dir === 'x' ? py - Math.floor(u / 2) : py + Math.floor(u / 2), t = texTone(rf.tex, u, v);
        return (s.snow && t <= 1) ? R('snow', t + off) : texC(rf.tex, u, v, rf.ramp, off); };
    }
    var rakeC = rf.ramp ? R(rf.ramp, 3) : 0;
    function rake(a, b) { line(a[0], a[1], b[0], b[1], function (x, y) { if (p.get(x, y)) p.set(x, y, rakeC); }); }

    if (round) {
      var c = P(w / 2, d / 2, 0), r = s.r || Math.round(11 * Math.min(w, d)), ry = r / 2;
      for (var px = c[0] - r; px < c[0] + r; px++) {
        var dx = (px + 0.5 - c[0]) / r, yb = c[1] + Math.round(ry * Math.sqrt(Math.max(0, 1 - dx * dx))) - 1, off = dx < 0.2 ? 0 : (dx < 0.65 ? 1 : 2);
        for (var y = yb - H + 1; y <= yb; y++) p.set(px, y, wallC(yb - y, px - c[0] + 64, off));
      }
      if (rf.type === 'cone' || rf.type === 'dome') {
        var R2 = r + 2, Ry = R2 / 2, cb = c[1] - H;
        for (px = c[0] - R2; px < c[0] + R2; px++) {
          dx = (px + 0.5 - c[0]) / R2; var q = Math.sqrt(Math.max(0, 1 - dx * dx)), ybot = cb + Math.round(Ry * q);
          var ytop = rf.type === 'cone' ? cb - rh + Math.round(rh * Math.abs(dx)) : cb - Math.round(rh * q);
          for (y = ytop; y <= ybot; y++) {
            var o2;
            if (rf.type === 'cone') o2 = dx < 0.15 ? 0 : (dx < 0.6 ? 1 : 2);
            else { var l = dx * 0.6 + ((y - cb) / rh) * 0.55; o2 = l < -0.15 ? 0 : (l < 0.35 ? 1 : 2); }
            var t = texTone(rf.tex, px - ox, y - Math.floor(Math.abs(px - c[0]) / 3));
            p.set(px, y, (s.snow && t <= 1 && o2 < 2) ? R('snow', t + o2) : R(rf.ramp, t + o2));
          }
        }
      }
    } else {
      var t1 = rf.type, ax = rf.axis === 'y';
      if (t1 === 'gable' && !ax) fillPoly(p, [P(-e, -e, H), P(w + e, -e, H), P(w + e, d / 2, H + rh), P(-e, d / 2, H + rh)], roofSh('x', 1));
      if (t1 === 'gable' && ax) fillPoly(p, [P(-e, -e, H), P(-e, d + e, H), P(w / 2, d + e, H + rh), P(w / 2, -e, H + rh)], roofSh('y', 1));
      fillPoly(p, [P(0, d, 0), P(w, d, 0), P(w, d, H), P(0, d, H)], shL);
      fillPoly(p, [P(w, d, 0), P(w, 0, 0), P(w, 0, H), P(w, d, H)], shR);
      if (t1 === 'gable' && !ax) {
        fillPoly(p, [P(w + e, d + e, H), P(w + e, -e, H), P(w + e, d / 2, H + rh)], function () { return rakeC; });
        fillPoly(p, [P(w, d, H), P(w, 0, H), P(w, d / 2, H + rh - 1)], shR);
        fillPoly(p, [P(-e, d + e, H), P(w + e, d + e, H), P(w + e, d / 2, H + rh), P(-e, d / 2, H + rh)], roofSh('x', 0));
        rake(P(w + e, d + e, H), P(w + e, d / 2, H + rh));
      } else if (t1 === 'gable' && ax) {
        fillPoly(p, [P(-e, d + e, H), P(w + e, d + e, H), P(w / 2, d + e, H + rh)], function () { return rakeC; });
        fillPoly(p, [P(0, d, H), P(w, d, H), P(w / 2, d, H + rh - 1)], shL);
        fillPoly(p, [P(w + e, -e, H), P(w + e, d + e, H), P(w / 2, d + e, H + rh), P(w / 2, -e, H + rh)], roofSh('y', 1));
        rake(P(-e, d + e, H), P(w / 2, d + e, H + rh)); rake(P(w / 2, d + e, H + rh), P(w + e, d + e, H));
      } else if (t1 === 'hip') {
        var rr = Math.min(w, d) / 2;
        if (w >= d) {
          fillPoly(p, [P(-e, -e, H), P(-e, d + e, H), P(rr, d / 2, H + rh)], roofSh('y', 1));
          fillPoly(p, [P(-e, -e, H), P(w + e, -e, H), P(w - rr, d / 2, H + rh), P(rr, d / 2, H + rh)], roofSh('x', 1));
          fillPoly(p, [P(-e, d + e, H), P(w + e, d + e, H), P(w - rr, d / 2, H + rh), P(rr, d / 2, H + rh)], roofSh('x', 0));
          fillPoly(p, [P(w + e, d + e, H), P(w + e, -e, H), P(w - rr, d / 2, H + rh)], roofSh('y', 1));
        } else {
          fillPoly(p, [P(-e, -e, H), P(w + e, -e, H), P(w / 2, rr, H + rh)], roofSh('x', 1));
          fillPoly(p, [P(-e, -e, H), P(-e, d + e, H), P(w / 2, d - rr, H + rh), P(w / 2, rr, H + rh)], roofSh('y', 1));
          fillPoly(p, [P(w + e, -e, H), P(w + e, d + e, H), P(w / 2, d - rr, H + rh), P(w / 2, rr, H + rh)], roofSh('y', 1));
          fillPoly(p, [P(-e, d + e, H), P(w + e, d + e, H), P(w / 2, d - rr, H + rh)], roofSh('x', 0));
        }
      } else if (t1 === 'lean') {
        if (!ax) {
          fillPoly(p, [P(w, d, H), P(w, 0, H), P(w, 0, H + rh - 1)], shR);
          fillPoly(p, [P(-e, d + e, H), P(w + e, d + e, H), P(w + e, -e, H + rh), P(-e, -e, H + rh)], roofSh('x', 0));
        } else {
          fillPoly(p, [P(0, d, H), P(w, d, H), P(0, d, H + rh - 1)], shL);
          fillPoly(p, [P(w + e, -e, H), P(w + e, d + e, H), P(-e, d + e, H + rh), P(-e, -e, H + rh)], roofSh('y', 1));
        }
      } else if (t1 === 'flat') {
        var fr = rf.ramp || wr, ins = 0.1875;
        fillPoly(p, [P(0, 0, H), P(w, 0, H), P(w, d, H), P(0, d, H)], function () { return s.snow ? R('snow', 0) : R(fr, 0); });
        fillPoly(p, [P(ins, ins, H), P(w - ins, ins, H), P(w - ins, d - ins, H), P(ins, d - ins, H)], function () { return s.snow ? R('snow', 1) : R(fr, 2); });
        line.apply(null, P(ins, ins, H).concat(P(w - ins, ins, H), [function (x, y) { p.set(x, y, s.snow ? R('snow', 2) : R(fr, 3)); }]));
        line.apply(null, P(ins, ins, H).concat(P(ins, d - ins, H), [function (x, y) { p.set(x, y, s.snow ? R('snow', 2) : R(fr, 3)); }]));
      }
    }
    despike(p);
    selout(p);
    var out = { pix: p, ox: ox, oy: oy, w: w, d: d, h: H + rh, H: H, rh: rh, axis: rf.axis === 'y' ? 'y' : 'x', roof: rf.type, round: round };
    SHELLS.set(key, out); ATLAS.set(key, p);
    return out;
  }
  /* removes 1 px tips and stray threads left by polygon rasterising at acute eave/ridge corners */
  function despike(p) {
    var W = p.w, Hh = p.h;
    for (var pass = 0; pass < 4; pass++) {
      var s = p.d.slice(), n = 0;
      for (var y = 0; y < Hh; y++) for (var x = 0; x < W; x++) {
        var i = y * W + x; if (!s[i]) continue;
        var k = 0, ys = 0, xs = 0;
        for (var j = -1; j <= 1; j++) for (var q = -1; q <= 1; q++) { if (!j && !q) continue; var yy = y + j, xx = x + q; if (yy >= 0 && yy < Hh && xx >= 0 && xx < W && s[yy * W + xx]) { k++; ys |= 1 << (j + 1); xs |= 1 << (q + 1); } }
        var oneSide = (ys === 1 || ys === 4) || (xs === 1 || xs === 4), corner = pass === 0 && k === 3 && ys !== 7 && xs !== 7 && ys !== 5 && xs !== 5;
        if (k <= 2 || (k <= 3 && oneSide) || corner) { p.d[i] = 0; n++; }
      }
      if (!n) break;
    }
  }
  /* coloured selective outline: bottom/right silhouette -> darkest tone of own ramp, top/left -> one step darker */
  function selout(p) {
    var s = p.d.slice(), W = p.w;
    for (var y = 0; y < p.h; y++) for (var x = 0; x < W; x++) {
      var i = y * W + x, c = s[i]; if (!c) continue;
      var up = y > 0 ? s[i - W] : 0, dn = y < p.h - 1 ? s[i + W] : 0, lf = x > 0 ? s[i - 1] : 0, rt = x < W - 1 ? s[i + 1] : 0;
      if (!dn || !rt) p.d[i] = darkest(c); else if (!up || !lf) p.d[i] = shift(c, 1);
    }
  }

  /* ---------- terrain ---------- */
  var MAPN = 24, WW = 832, WH = 600, NX = 416, NY = 176;
  function worldPt(x, y) { return [NX + (x - y) * 16, NY + (x + y) * 8]; }
  var LAYOUT = null;
  /* tile types: 1 grass, 2 path, 3 plaza, 4 water, 5 rock, 6 bare earth */
  function layout() {
    if (LAYOUT) return LAYOUT;
    var N = MAPN, t = new Uint8Array(N * N).fill(1), r = rng('evolve-map-v1');
    function S(x, y, v) { if (x >= 0 && y >= 0 && x < N && y < N && !(v === 2 && t[y * N + x] === 4)) t[y * N + x] = v; }
    for (var y = 0; y < 10; y++) for (var x = 0; x < 10; x++) if (x + y + ih(x, y, 7) * 3 < 8.5) S(x, y, 5);
    [[4, 17, 2.2], [17, 4, 1.8], [21, 9, 1.3], [7, 20, 1.2]].forEach(function (b) {
      for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (Math.hypot(x + 0.5 - b[0], y + 0.5 - b[1]) < b[2] + ih(x, y, 13) * 0.7) S(x, y, 6); });
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) if (Math.hypot((x + 0.5 - 18.5) * 0.9, y + 0.5 - 19.2) < 2.5 + ih(x, y, 17) * 0.6) S(x, y, 4);
    [[[24, 14.6], [21.6, 16.2], [19.6, 18.2]], [[18.4, 21], [18.9, 22.6], [19.4, 24]]].forEach(function (seg) {
      for (var k = 0; k + 1 < seg.length; k++) for (var q = 0; q <= 1; q += 0.1) S(Math.floor(seg[k][0] + (seg[k + 1][0] - seg[k][0]) * q), Math.floor(seg[k][1] + (seg[k + 1][1] - seg[k][1]) * q), 4); });
    for (y = 10; y <= 13; y++) for (x = 10; x <= 13; x++) S(x, y, ((x === 10 || x === 13) && (y === 10 || y === 13)) ? 2 : 3);
    function arm(axis, sgn) {
      var off = 11 + (r() < 0.5 ? 0 : 1);
      for (var k = 0; k < 10; k++) { var m = (sgn > 0 ? 14 : 9) + sgn * k; if (m < 0 || m >= N) break;
        var prev = off; if (k > 1 && r() < 0.3) off = clamp(off + (r() < 0.5 ? -1 : 1), 9, 14);
        if (axis === 'x') { S(m, off, 2); if (off !== prev) S(m, prev, 2); } else { S(off, m, 2); if (off !== prev) S(prev, m, 2); } }
    }
    arm('x', 1); arm('x', -1); arm('y', 1); arm('y', -1);
    return (LAYOUT = t);
  }
  function tri(t) { t -= Math.floor(t); return 1 - Math.abs(t * 2 - 1); }
  function hump(t) { return 0.5 - 0.5 * Math.cos(t * Math.PI * 2); }
  function hills(p, winter) {
    var Ls = [
      { base: NY + 112, amp: 74, f: [1 / 97, 1 / 41], fn: tri, col: winter ? R('snow', 1) : R('haze', 1), cap: true },
      { base: NY + 150, amp: 44, f: [1 / 83, 1 / 31], fn: hump, col: winter ? R('snow', 2) : R('haze', 2) },
      { base: NY + 182, amp: 26, f: [1 / 61, 1 / 23], fn: hump, col: winter ? R('snow', 3) : R('haze', 3) }];
    Ls.forEach(function (L, li) {
      for (var x = 0; x < WW; x++) {
        var hg = Math.round(L.amp * (0.62 * L.fn(x * L.f[0] + li * 0.37) + 0.38 * L.fn(x * L.f[1] + li * 1.3))), top = L.base - hg;
        for (var y = top; y < WH; y++) p.set(x, y, (L.cap && hg > L.amp * 0.7 && y < top + 4 + (x & 1)) ? R('snow', winter ? 0 : 1) : L.col);
      }
    });
  }
  var ST = {
    clump: ['.00.', '0000', '.22.'], dark: ['.22', '222'], tuft: ['0.0.', '2020'], flower: ['.F.', 'F2F'],
    pebble: ['.0', '12'], rut: ['22..', '..22'], flag: ['001.', '0112', '.22.'], rock: ['.00.', '0112', '1223'],
    ore: ['01', '12'], clod: ['.11', '113'], drift: ['.11.', '1122'], frost: ['.2.2', '2323'], crack: ['2...', '.12.', '...3']
  };
  var FLOWERS = ['rose', 'saffron', 'cream', 'plum', 'indigo', 'madder'];
  var TERR = new Map();
  /* lay/tag: optional alternative tile layout (Era 0 shoreline) cached under its own tag */
  function terrain(season, biome, lay0, tag) {
    var key = (tag ? tag + '|' : '') + season + '|' + biome; var hit = TERR.get(key); if (hit) return hit;
    var S = SEASONS[season] || SEASONS[1], B = BIOMES[biome] || BIOMES.grassland, winter = !!((S.snow && !B.hot) || B.snow);
    var grass = winter ? 'snow' : (B.grass || S.grass), dirt = B.dirt || 'dirt', rock = B.rock || 'river', water = B.water || 'water';
    var lip = winter ? 'snow' : (B.grass || S.grass);
    var p = new Pix(WW, WH), T = new Uint8Array(WW * WH), lay = lay0 || layout(), i, px, py;
    for (py = 0; py < WH; py++) { var sc = py < NY + 30 ? R('sky', 1) : R('sky', 0); for (px = 0; px < WW; px++) p.d[py * WW + px] = sc; }
    hills(p, winter);
    for (py = NY - 2; py < NY + 388; py++) for (px = 0; px < WW; px++) {
      var rx = px + 0.5 - NX, ry = py + 0.5 - NY, fx = (rx / 16 + ry / 8) / 2, fy = (ry / 8 - rx / 16) / 2;
      if (fx < 0 || fy < 0 || fx >= MAPN || fy >= MAPN) continue;
      var wx = (vnoise(px / 7, py / 4, 11) - 0.5) * 0.55, wy = (vnoise(px / 7, py / 4, 29) - 0.5) * 0.55;
      T[py * WW + px] = lay[clamp(Math.floor(fy + wy), 0, 23) * MAPN + clamp(Math.floor(fx + wx), 0, 23)];
    }
    var T0 = T.slice();
    for (i = WW + 1; i < T.length - WW - 1; i++) { var v = T0[i]; if (!v) continue;
      var nb = [T0[i - 1], T0[i + 1], T0[i - WW], T0[i + WW]];
      if (nb.indexOf(v) < 0) { var best = 0; nb.forEach(function (q) { if (q) best = q; }); if (best) T[i] = best; } }
    var base = [0, R(grass, winter ? 0 : 1), R(dirt, 1), R(dirt, 0), R(water, 2), R(rock, 1), R(dirt, 2)];
    for (i = 0; i < T.length; i++) if (T[i]) p.d[i] = base[T[i]];
    /* [anki-fork] full ground: outside the 24x24 diamond the world is meadow (mountains stay as the far backdrop), no floating island */
    var OUT = new Uint8Array(WW * WH), yH = new Int16Array(WW);
    for (px = 0; px < WW; px++) yH[px] = NY + 86 + Math.round(vnoise(px / 38, 5, 3) * 18);
    for (py = NY; py < WH; py++) for (px = 0; px < WW; px++) {
      i = py * WW + px; if (T[i] || py < yH[px]) continue;
      OUT[i] = 1; T[i] = 1; p.d[i] = base[1];
    }
    function stamp(sh, sx, sy, ty, ramp, fl) {
      for (var j = 0; j < sh.length; j++) for (var k = 0; k < sh[j].length; k++) {
        var ch = sh[j][k]; if (ch === '.') continue; var x = sx + k, y = sy + j; if (x < 0 || y < 0 || x >= WW || y >= WH) continue;
        var q = y * WW + x; if (T[q] !== ty) continue;
        p.d[q] = ch === 'F' ? R(fl, 0) : R(ramp, +ch);
      }
    }
    var fmul = (B.flowers || 1) * S.flowers;
    for (var cy = NY; cy < WH; cy += 4) for (var cx = 0; cx < WW; cx += 6) {
      px = cx + (ih(cx, cy, 1) * 6 | 0); py = cy + (ih(cx, cy, 2) * 4 | 0); if (py >= WH) continue;
      var ty = T[py * WW + px]; if (!ty) continue;
      var r = ih(cx, cy, 3), fl = FLOWERS[ih(cx, cy, 4) * FLOWERS.length | 0], X = px - 1, Y = py - 1;
      if (B.cracks && (ty === 1 || ty === 5 || ty === 6) && ih(cx, cy, 6) < B.cracks * (ty === 1 ? 0.6 : 1.8)) { stamp(ST.crack, X, Y, ty, 'ember'); continue; }
      if (ty === 1) {
        if (winter) { if (r < 0.35) stamp(ST.drift, X, Y, 1, 'snow'); else if (r < 0.43) stamp(ST.frost, X, Y, 1, 'frost'); }
        else if (r < 0.38) stamp(ST.clump, X, Y, 1, grass); else if (r < 0.55) stamp(ST.dark, X, Y, 1, grass);
        else if (r < 0.65) stamp(ST.tuft, X, Y, 1, grass); else if (r < 0.65 + fmul) stamp(ST.flower, X, Y, 1, grass, fl);
      } else if (ty === 2) {
        if (winter && r < 0.45) stamp(ST.drift, X, Y, 2, 'snow'); else if (r < 0.62 && r > 0.45) stamp(ST.pebble, X, Y, 2, rock); else if (r < 0.2) stamp(ST.rut, X, Y, 2, dirt);
      } else if (ty === 3) {
        if (winter && r < 0.3) stamp(ST.drift, X, Y, 3, 'snow'); else if (r < 0.75) stamp(ST.flag, X, Y, 3, rock);
      } else if (ty === 5) {
        if (winter && r < 0.3) stamp(ST.drift, X, Y, 5, 'snow'); else if (r < 0.48) stamp(ST.rock, X, Y, 5, rock);
        else if (r < 0.58) stamp(ST.ore, X, Y, 5, ['copper', 'iron', 'soot'][ih(cx, cy, 5) * 3 | 0]);
      } else if (ty === 6) {
        if (winter && r < 0.4) stamp(ST.drift, X, Y, 6, 'snow'); else if (r < 0.3) stamp(ST.clod, X, Y, 6, dirt); else if (r < 0.42) stamp(ST.pebble, X, Y, 6, rock);
      }
    }
    var frozen = winter && water !== 'ember', waves = [];
    for (py = NY; py < NY + 388; py++) for (px = 3; px < WW - 3; px++) {
      i = py * WW + px; if (T[i] !== 4) continue;
      var edge = T[i - 1] !== 4 || T[i + 1] !== 4 || T[i - WW] !== 4 || T[i + WW] !== 4;
      if (edge) { p.d[i] = frozen ? R('snow', 1) : R(water, 0); continue; }
      var near = T[i - 3] !== 4 || T[i + 3] !== 4 || T[i - 2 * WW] !== 4 || T[i + 2 * WW] !== 4, bt = near ? 2 : 3;
      var wave = py % 3 === 0 && ((px + ((py * 7) % 13)) % 11) < 3;
      if (frozen) p.d[i] = wave ? R('snow', 1) : R('snow', near ? 2 : 3);
      else { p.d[i] = R(water, bt); if (wave) waves.push(i, ((px + 2 * py) >> 3) & 3, bt); }
    }
    for (i = WW; i < T.length - WW; i++) if (T[i] && T[i] !== 4 && T[i + WW] === 4) p.d[i] = winter ? R('snow', 3) : R(dirt, 3);
    /* [anki-fork] far forest and meadow props outside the map, drawn into the terrain layer (behind every building and citizen) */
    (function () {
      var fol = winter ? 'frost' : (B.tree || S.tree), pine = (B.tree && B.tree !== 'lush' && B.tree !== 'frost') ? B.tree : 'conifer', dens = (B.hot ? 0.5 : 1) * (B.snow ? 1.1 : 1), list = [];
      for (var gy = yH[0] + 6; gy < WH + 20; gy += 10) for (var gx = -6; gx < WW + 6; gx += 11) {
        var jx = Math.round(gx + (ih(gx, gy, 71) - 0.5) * 9), jy = Math.round(gy + (ih(gx, gy, 72) - 0.5) * 8);
        if (jx < 0 || jx >= WW || jy < 0 || jy >= WH) continue;
        var q = jy * WW + jx; if (!OUT[q] || jy < yH[jx] + 4) continue;
        var rx2 = jx + 0.5 - NX, ry2 = jy + 0.5 - NY, fx2 = (rx2 / 16 + ry2 / 8) / 2, fy2 = (ry2 / 8 - rx2 / 16) / 2;
        var d2 = Math.min(fx2, fy2, MAPN - fx2, MAPN - fy2);           /* tiles outside the map edge (negative inside) */
        if (d2 > -0.8) continue;
        var near = Math.min(1, (-d2 - 0.8) / 3), back = Math.max(0, 1 - (jy - yH[jx]) / 60), r = ih(jx, jy, 73);
        var pr = (0.18 + 0.55 * near + 0.3 * back) * dens;
        if (r > pr) { if (r < pr + 0.05 && d2 < -1.5) list.push({ n: 'bush', x: jx, y: jy, m: { FOLIAGE: fol, WOOD: 'walnut' } }); continue; }
        var k = ih(jx, jy, 74), kind = B.tree === 'dry' || B.tree === 'ashleaf' || B.tree === 'scorch' ? (k < 0.5 ? 'tree_dead' : 'tree_broadleaf') : (k < 0.5 ? 'tree_pine' : (winter ? 'tree_dead' : 'tree_broadleaf'));
        list.push({ n: kind, x: jx, y: jy, m: kind === 'tree_pine' ? { FOLIAGE: pine, WOOD: 'walnut' } : kind === 'tree_dead' ? { WOOD: 'walnut' } : { FOLIAGE: fol, WOOD: 'oak' }, f: ih(jx, jy, 75) < 0.5 });
      }
      list.sort(function (a, b2) { return a.y - b2.y || a.x - b2.x; });
      list.forEach(function (o) {
        var d = SK.PIECES[o.n], sp = sprite(o.n, o.m, { flip: !!o.f }), ax = o.f ? d.w - 1 - d.anchor[0] : d.anchor[0];
        p.blit(sp, o.x - ax, o.y - d.anchor[1]);
      });
    })();
    var out = { pix: p, T: T, waves: waves, water: water, frozen: frozen, season: season, biome: biome };
    TERR.set(key, out); return out;
  }

  /* ---------- generator showcase shells (Batch 1 test row; real buildings arrive in Batch 2) ---------- */
  var DEMO = [
    { label: 'Gable · logs + thatch', at: [8, 7], spec: { w: 1, d: 1, h: 15, wall: { tex: 'tex_logs', ramp: 'oak' }, roof: { type: 'gable', tex: 'tex_thatch', ramp: 'straw', pitch: 3 } } },
    { label: 'Gable, other axis · planks + shingles', at: [15, 8], spec: { w: 1, d: 1, h: 17, plinth: 3, wall: { tex: 'tex_planks', ramp: 'pinewood' }, roof: { type: 'gable', axis: 'y', tex: 'tex_shingles', ramp: 'walnut', pitch: 2 } } },
    { label: 'Hip · brick + clay tiles', at: [6, 14], spec: { w: 2, d: 1, h: 19, plinth: 3, wall: { tex: 'tex_brick', ramp: 'brick' }, roof: { type: 'hip', tex: 'tex_tiles', ramp: 'terracotta', pitch: 1 } } },
    { label: 'Lean-to · wattle + reed', at: [15, 15], spec: { w: 1, d: 1, h: 13, wall: { tex: 'tex_wattle', ramp: 'ochre' }, roof: { type: 'lean', tex: 'tex_thatch', ramp: 'reed' } } },
    { label: 'Flat + parapet · cut stone', at: [3, 9], spec: { w: 2, d: 2, h: 20, plinth: 2, wall: { tex: 'tex_cutstone', ramp: 'sandstone' }, roof: { type: 'flat', ramp: 'sandstone' } } },
    { label: 'Round + cone · wattle + thatch', at: [9, 16], spec: { w: 1, d: 1, h: 12, shape: 'round', wall: { tex: 'tex_wattle', ramp: 'lime' }, roof: { type: 'cone', tex: 'tex_thatch', ramp: 'straw', H: 17 } } },
    { label: 'Round + dome · dry stone + tiles', at: [17, 11], spec: { w: 1, d: 1, h: 18, shape: 'round', r: 10, plinth: 3, wall: { tex: 'tex_drystone', ramp: 'river' }, roof: { type: 'dome', tex: 'tex_tiles', ramp: 'terracotta', H: 9 } } },
    { label: 'Hip, deep · rose plaster + slate shingles', at: [11, 5], spec: { w: 1, d: 2, h: 18, plinth: 3, wall: { tex: 'tex_wattle', ramp: 'rosewash' }, roof: { type: 'hip', tex: 'tex_shingles', ramp: 'slate', pitch: 2 } } }
  ];

  /* ---------- view ---------- */
  /* WK: buildings, terrain, decor, smoke and sky are drawn at world resolution then upscaled by WK;
     citizens, animals, rain and tap feedback are drawn on top at native resolution (1 view pixel = 1 citizen pixel). */
  var WK = 2;
  var V = null, OPT = { scale: 1, grid: false, demo: false, slots: false, night: false, gray: false, pixelTrue: false, silhouette: false, clone: false, badge: false };
  function init(canvas, o) {
    o = o || {};
    var off = document.createElement('canvas'); off.width = WW * WK; off.height = WH * WK;
    var octx = off.getContext('2d'), img = octx.createImageData(WW * WK, WH * WK);
    V = { canvas: canvas, ctx: canvas.getContext('2d'), off: off, octx: octx, img: img, u32: new Uint32Array(img.data.buffer),
      buf: new Pix(WW, WH), buf2: new Pix(WW * WK, WH * WK), t: 0, key: '', panX: null, panY: null, drag: null };
    OPT.scale = o.scale || OPT.scale;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', function (ev) { V.drag = { x: ev.clientX, y: ev.clientY, px: V.panX, py: V.panY }; canvas.setPointerCapture(ev.pointerId); });
    canvas.addEventListener('pointermove', function (ev) { if (!V.drag) return; var r = V.dpr || 1; V.panX = V.drag.px + (ev.clientX - V.drag.x) * r; V.panY = V.drag.py + (ev.clientY - V.drag.y) * r; present(); });
    var end = function (ev) {
      var d = V.drag; V.drag = null;
      if (!d || !ev || ev.type !== 'pointerup' || Math.abs(ev.clientX - d.x) + Math.abs(ev.clientY - d.y) > 5 || !SK.world) return;
      var r = canvas.getBoundingClientRect(), s = OPT.scale | 0 || 1, dp = V.dpr || 1;
      if (SK.evo && SK.evo.tap(((ev.clientX - r.left) * dp - V.panX) / s, ((ev.clientY - r.top) * dp - V.panY) / s, V.t)) return;
      SK.world.tap(((ev.clientX - r.left) * dp - V.panX) / s, ((ev.clientY - r.top) * dp - V.panY) / s, V.t);
    };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    return V;
  }
  function setOptions(o) {
    if (!o) return;
    if (V && o.scale && o.scale !== OPT.scale && V.panX !== null) {
      var cw = V.canvas.width, ch = V.canvas.height, wx = (cw / 2 - V.panX) / OPT.scale, wy = (ch / 2 - V.panY) / OPT.scale;
      V.panX = cw / 2 - wx * o.scale; V.panY = ch / 2 - wy * o.scale;
    }
    for (var k in o) OPT[k] = o[k];
  }
  function compose(tr, wf, season, state) {
    var b = V.buf, i, k, vil = SK.village;
    var ctx = { T: tr.T, season: season, biome: tr.biome, t: V.t, state: state, opt: OPT, tr: tr };
    var skey = tr.season + '|' + tr.biome + '|' + OPT.demo + '|' + OPT.grid + '|' + OPT.slots + '|' + OPT.night + '|' + OPT.clone + '|' + (vil ? vil.signature(state, ctx) : '');
    if (V.skey !== skey) { V.skey = skey; V.stat = V.stat || new Pix(WW, WH); staticLayer(V.stat, tr, season, ctx); }
    b.d.set(V.stat.d);
    var w = tr.waves;
    for (k = 0; k < w.length; k += 3) { if (V.stat.d[w[k]] !== tr.pix.d[w[k]]) continue; var cyc = w[k + 2] === 3 ? [1, 2, 3, 3] : [1, 2, 2, 2]; b.d[w[k]] = R(tr.water, cyc[(w[k + 1] + wf) & 3]); }
    if (vil) vil.drawDynamic(b, ctx);
    up(b, V.buf2, WK);
    if (OPT.silhouette) { if (!V.pre || V.pre.length !== V.buf2.d.length) V.pre = new Uint32Array(V.buf2.d.length); V.pre.set(V.buf2.d); }
    if (vil && vil.drawActors) vil.drawActors(V.buf2, ctx, WK);
    if (OPT.night && SK.ui) SK.ui.night(V.buf2, WK);
    if (OPT.silhouette) silhouette(V.buf2, V.pre, tr.T, vil && vil.depth ? vil.depth() : null);
    V.u32.set(V.buf2.d);
  }
  /* silhouette check: every standing thing (buildings, decor, people, animals) solid ink on flat ground */
  function silhouette(B, pre, T, D) {
    var ink = pal().ink, gr = R('haze', 1), sk = R('sky', 0), d = B.d, W = B.w;
    for (var y = 0; y < B.h; y++) { var wy = (y / WK | 0) * WW;
      for (var x = 0; x < W; x++) { var q = y * W + x, wq = wy + (x / WK | 0), obj = (D && D[wq] > -1e5) || d[q] !== pre[q];
        d[q] = obj ? ink : (T[wq] ? gr : sk); } }
  }
  function up(s, o, k) {
    var W = s.w, OW = o.w, sd = s.d, od = o.d;
    for (var y = 0; y < s.h; y++) {
      var r0 = y * k * OW, si = y * W;
      for (var x = 0; x < W; x++) { var c = sd[si + x], q = r0 + x * k; for (var e = 0; e < k; e++) od[q + e] = c; }
      for (var j = 1; j < k; j++) od.copyWithin(r0 + j * OW, r0, r0 + OW);
    }
  }
  function staticLayer(b, tr, season, ctx) {
    var i; b.d.set(tr.pix.d);
    if (OPT.grid) for (i = 0; i <= MAPN; i++) {
      var a = worldPt(i, 0), z = worldPt(i, MAPN), a2 = worldPt(0, i), z2 = worldPt(MAPN, i);
      var dk = function (x, y) { var q = y * WW + x; if (tr.T[q]) b.d[q] = shift(tr.pix.d[q], 1); };
      line(a[0], a[1], z[0], z[1], dk); line(a2[0], a2[1], z2[0], z2[1], dk);
    }
    if (OPT.demo) {
      var S = SEASONS[season] || SEASONS[1], list = DEMO.slice().sort(function (p, q) { return (p.at[0] + p.at[1]) - (q.at[0] + q.at[1]) || p.at[1] - q.at[1]; });
      list.forEach(function (it) {
        var sp = it.spec, L = Math.round(Math.max(0.3, sp.h / 26) * S.shadow * 8) / 8, x = it.at[0], y = it.at[1];
        fillPoly(b, [worldPt(x, y), worldPt(x + sp.w + L, y), worldPt(x + sp.w + L, y + sp.d), worldPt(x, y + sp.d)],
          function (px, py) { var q = py * WW + px; return tr.T[q] ? shift(b.d[q], 1) : 0; });
      });
      list.forEach(function (it) {
        var spec = Object.assign({}, it.spec, { snow: season === 3 }), sh = shell(spec), at = worldPt(it.at[0], it.at[1]);
        b.blit(sh.pix, at[0] - sh.ox, at[1] - sh.oy);
      });
    }
    if (SK.village) SK.village.drawStatic(b, ctx);
  }
  function present() {
    if (!V) return;
    var cv = V.canvas, dp = OPT.pixelTrue ? Math.max(1, G.devicePixelRatio || 1) : 1, cw = Math.round((cv.clientWidth | 0) * dp), ch = Math.round((cv.clientHeight | 0) * dp);
    if (V.dpr && V.dpr !== dp && V.panX !== null) { V.panX = V.panX * dp / V.dpr; V.panY = V.panY * dp / V.dpr; }
    V.dpr = dp;
    if (cw && ch && (cv.width !== cw || cv.height !== ch)) { cv.width = cw; cv.height = ch; }
    var flt = OPT.gray ? 'grayscale(1)' : ''; if (cv.style.filter !== flt) cv.style.filter = flt;
    cw = cv.width; ch = cv.height;
    var s = OPT.scale | 0 || 1, ww = WW * WK * s, wh = WH * WK * s;
    if (V.panX === null) { V.panX = Math.round(cw / 2 - NX * WK * s); V.panY = Math.round(ch / 2 - (NY + 140) * WK * s); }
    V.panX = ww <= cw ? Math.round((cw - ww) / 2) : clamp(V.panX, cw - ww, 0);
    V.panY = wh <= ch ? Math.round((ch - wh) / 2) : clamp(V.panY, ch - wh, 0);
    var c = V.ctx; c.imageSmoothingEnabled = false;
    c.fillStyle = SK.PALETTE.ramps.sky[0]; c.fillRect(0, 0, cw, ch);
    c.drawImage(V.off, Math.round(V.panX), Math.round(V.panY), ww, wh);
    var bh = 0;
    if (OPT.badge && SK.ui) { var bp = badgePix(), bs = Math.max(2, s); c.drawImage(bp.canvas(), 8, 8, bp.w * bs, bp.h * bs); bh = bp.h * bs + 6; }
    if (SK.evo) SK.evo.hud(c, s, 8, 8 + bh);
  }
  /* corner badge shown when live mode found no window.evolve.global (settings.expose off) and fell back to fakeState() */
  var BADGE = null;
  function badgePix() {
    if (BADGE) return BADGE;
    var u = SK.ui, label = 'demo state', w = u.measure(label) + 10, p = new Pix(w, 13);
    for (var y = 0; y < 13; y++) for (var x = 0; x < w; x++) {
      var e = x === 0 || y === 0 || x === w - 1 || y === 12; if (e && (x === 0 || x === w - 1) && (y === 0 || y === 12)) continue;
      p.set(x, y, e ? R('walnut', x === w - 1 || y === 12 ? 3 : 2) : R('cream', y > 9 ? 1 : 0));
    }
    u.text(p, label, 5, 3, R('madder', 2));
    return (BADGE = p);
  }
  /* Era 0 (race.species === 'protoplasm') and the hand-over are drawn by SK.evo; everything else by the village pipeline */
  function render(state, dt) {
    if (!V) return;
    V.t += dt || 0;
    if (SK.evo && SK.evo.frame(state, dt || 0)) { present(); return; }
    villageFrame(state);
    present();
  }
  function villageFrame(state, force) {
    var city = (state && state.city) || {}, cal = city.calendar || {}, season = clamp(cal.season | 0, 0, 3), biome = city.biome || 'grassland';
    if (SK.biomeMod) biome = SK.biomeMod(state, biome);
    var tr = terrain(season, biome), wf = tr.frozen ? 0 : Math.floor(V.t / 200) & 3;
    if (SK.village) SK.village.update(state, V.t, OPT);
    var key = season + '|' + biome + '|' + wf + '|' + Math.floor(V.t / 125) + '|' + OPT.grid + '|' + OPT.demo + '|' + OPT.slots + '|' + OPT.night + '|' + OPT.silhouette + '|' + OPT.clone;
    if (force || key !== V.key) { V.key = key; compose(tr, wf, season, state); V.octx.putImageData(V.img, 0, 0); }
  }
  /* fakeState() -> village (race.species 'human'); fakeState('protoplasm') -> Era 0 state (see SK.evo.fake) */
  function fakeState(mode) {
    if (mode === 'protoplasm' && SK.evo) return SK.evo.fake();
    var city = { calendar: { season: 1, weather: 2, temp: 1, wind: 0, moon: 14, day: 120, year: 3 }, biome: 'grassland' };
    BUILDINGS.forEach(function (b) { city[b.key] = { count: 0, on: 0 }; });
    city.basic_housing.count = 6; city.farm.count = 3; city.lumber_yard.count = 1; city.rock_quarry.count = 1;
    var civic = {}; JOBS.forEach(function (j) { civic[j === 'soldier' ? 'garrison' : j] = { workers: 0 }; });
    civic.unemployed.workers = 2; civic.farmer.workers = 4; civic.lumberjack.workers = 2; civic.quarry_worker.workers = 1;
    var resource = {}; RESOURCES.forEach(function (r) { resource[r] = { amount: 0, max: 200 }; });
    resource.Food.amount = 120; resource.Lumber.amount = 80; resource.Stone.amount = 60;
    civic.govern = { type: 'anarchy', protest: 0 }; civic.garrison.wounded = 0; civic.garrison.raid = 0;
    return { city: city, civic: civic, race: { species: 'human' }, event: { l: false },
      tech: { primitive: 3, axe: 1, mining: 0, smelting: 0, cement: 0, housing: 1, agriculture: 1, science: 0, currency: 0, pickaxe: 0, hammer: 0, hoe: 0, saw: 0, military: 0, armor: 0, farm: 0 }, resource: resource };
  }
  function atlas() { var o = {}; ATLAS.forEach(function (v, k) { o[k] = v.canvas(); }); return o; }

  /* ---------- self-check ---------- */
  function selfCheck() {
    var counts = {}, issues = [], notes = [], pc = pal();
    Object.keys(EXPECTED).forEach(function (k) { counts[k] = 0; });
    Object.keys(SK.PIECES).forEach(function (name) {
      var d = SK.PIECES[name]; counts[d.cat] = (counts[d.cat] || 0) + 1;
      if (!EXPECTED.hasOwnProperty(d.cat)) issues.push(name + ': unknown category "' + d.cat + '"');
      if (d.rows.length !== d.h) issues.push(name + ': ' + d.rows.length + ' rows, header says ' + d.h);
      d.rows.forEach(function (r, i) {
        if (r.length !== d.w) issues.push(name + ': row ' + i + ' is ' + r.length + ' wide, header says ' + d.w);
        for (var k = 0; k < r.length; k++) if (!(r[k] in CH)) issues.push(name + ': row ' + i + ' has unknown char "' + r[k] + '"');
      });
      var m = slotMap(name); Object.keys(m).forEach(function (sl) { if (!pc.r[m[sl]]) issues.push(name + ': slot ' + sl + ' -> missing ramp ' + m[sl]); });
      if (!d.tile && !d.glyphs) {
        var orph = 0;
        for (var y = 0; y < d.h; y++) for (var x = 0; x < d.w; x++) {
          if ((d.rows[y] || '')[x] === '.' || (d.rows[y] || '')[x] === '*') continue; var alone = true;
          for (var j = -1; j <= 1; j++) for (var i = -1; i <= 1; i++) { if (!i && !j) continue; var ch = (d.rows[y + j] || '')[x + i]; if (ch && ch !== '.') alone = false; }
          if (alone) orph++;
        }
        if (orph) notes.push(name + ': ' + orph + ' isolated pixel(s)');
      }
    });
    var scanned = 0, bad = 0;
    function scan(p, label) { var b0 = bad; for (var i = 0; i < p.d.length; i++) { var c = p.d[i]; if (!c) continue; scanned++; if (!pc.all.has(c)) bad++; } if (bad > b0) issues.push(label + ': ' + (bad - b0) + ' pixel(s) outside the palette'); }
    Object.keys(SK.PIECES).forEach(function (n) { scan(sprite(n), 'piece ' + n); });
    DEMO.forEach(function (it) { scan(shell(it.spec).pix, 'shell ' + it.label); scan(shell(Object.assign({}, it.spec, { snow: true })).pix, 'shell (snow) ' + it.label); });
    [1, 3].forEach(function (s) { scan(terrain(s, 'grassland').pix, 'terrain ' + SEASONS[s].id); });
    if (SK.village && SK.village.samples) SK.village.samples().forEach(function (s) { scan(s.pix, s.label); });
    if (SK.evo && SK.evo.samples) SK.evo.samples().forEach(function (s) { scan(s.pix, s.label); });
    if (ROT_LOG.length) issues.push(ROT_LOG.length + ' non-90° rotation request(s)');
    var total = 0; Object.keys(counts).forEach(function (k) { total += counts[k]; });
    var t0 = 0, tgt = 0, b9 = 0; Object.keys(BASE).forEach(function (k) { t0 += BASE[k]; });
    Object.keys(EXPECTED).forEach(function (k) { tgt += EXPECTED[k]; if (ERA0[k]) b9 += counts[k] || 0; });
    return { counts: counts, expected: EXPECTED, base: BASE, total: total, target: tgt, baseTotal: t0, b8: total - t0 - b9, b9: b9, era0: ERA0, issues: issues, notes: notes, scanned: scanned };
  }

  G.SpriteKit = {
    init: init, render: render, fakeState: fakeState, atlas: atlas, setOptions: setOptions,
    /* plays the Era 0 -> village hand-over now; render() also starts it alone on the first frame where race.species leaves 'protoplasm' */
    handoff: function () { if (SK.evo && V) SK.evo.handoff(V.t); },
    reward: function () { if (SK.ui && V) SK.ui.reward(V.t); },
    /* live mode for the game: reads window.evolve.global once per readMs (default 1000) and renders every animation frame */
    run: function (canvas, o) {
      o = o || {}; init(canvas, o); setOptions(o);
      var st = null, fake = null, last = 0, lastRead = -1e9, raf = 0, alive = true;
      function read() { try { var g = G.evolve && G.evolve.global; st = (g && typeof g === 'object' && (g.city || g.race)) ? g : null; } catch (e) { st = null; } OPT.badge = !st; }
      function tick(now) { if (!alive) return; if (now - lastRead >= (o.readMs || 1000)) { lastRead = now; read(); }
        render(st || (fake || (fake = fakeState())), last ? Math.min(250, now - last) : 16); last = now; raf = requestAnimationFrame(tick); }
      raf = requestAnimationFrame(tick);
      return { stop: function () { alive = false; cancelAnimationFrame(raf); }, set: setOptions, reward: function () { if (SK.ui && V) SK.ui.reward(V.t); } };
    },
    isReady: function () { if (SK._runExt) SK._runExt(); return !!(SK.PALETTE && SK.PARTS.b1 && SK.PARTS.b2 && SK.PARTS.b3 && SK.PARTS.b4 && SK.PARTS.b5 && SK.PARTS.b6 && SK.PARTS.b7 && SK.PARTS.b8 && SK.PARTS.b9 && SK.era1 && SK.evo && SK.village && SK.village.b3 && SK.village.b4 && SK.citizens && SK.world && SK.ui); },
    _: { pal: pal, R: R, shift: shift, darkest: darkest, Pix: Pix, sprite: sprite, slotMap: slotMap, shell: shell, terrain: terrain, layout: layout,
      texC: texC, selout: selout, fillPoly: fillPoly, line: line, worldPt: worldPt, ih: ih, ATLAS: ATLAS, NX: NX, NY: NY, MAPN: MAPN,
      CH: CH, SEASONS: SEASONS, BIOMES: BIOMES, BUILDINGS: BUILDINGS, JOBS: JOBS, RESOURCES: RESOURCES, EXPECTED: EXPECTED, BASE: BASE, OPT: OPT, DEMO: DEMO,
      rng: rng, hash: hash, mulberry32: mulberry32, selfCheck: selfCheck, WW: WW, WH: WH,
      vnoise: vnoise, up: up, WK: WK, view: function () { return V; }, villageFrame: villageFrame, ERA0: ERA0,
      families: function () { return SK.PALETTE.families; } }
  };
})(window);
