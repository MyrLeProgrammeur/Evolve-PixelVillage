/* Evolve village sprite kit — Era 2 · discovery (Batches 10-14 logic).
   Tier 4 "brick and steel" (shell remap, downpipes, wall lamps), five new buildings (apartment, container port, Wardenclyffe,
   coal powerplant, boot camp), the truss / wire / conveyor / rail helpers, the power grid (poles, wires, lit windows, deficit,
   night halos), state-driven modifiers on Era 1 buildings, worker layers, the spy and the drill routine.
   Registers through the same extension hook as era1.js; load it last, after evolution.js. Never throws on missing fields. */
(function (G) {
  'use strict';
  var SK = G.SK = G.SK || {};
  SK._ext = (SK._ext || []).filter(function (e) { return e.id !== 'era2'; });
  SK._ext.push({ id: 'era2', fn: reg });
  if (SK._runExt) SK._runExt();
  function reg() {
  if (!SK.village || !SK.village.b4 || !SK.village.B3 || !SK.village.ORDER || !SK.era1 || !SK.evo || !SK.citizens || !SK.citizens.route || !SK.world || !SK.ui || !SK.PARTS || !SK.PARTS.b10 || !G.SpriteKit) return false;
  var X = G.SpriteKit._, R = X.R, Pix = X.Pix, P = SK.PIECES, VL = SK.village, H = VL.H, B = VL.B3, W0 = SK.world, CZ = SK.citizens;
  var floor = Math.floor, round = Math.round, PI = Math.PI, WW = X.WW, N = X.MAPN, wp = X.worldPt, ih = X.ih;

  /* ---------- defensive reads ---------- */
  function tech(st) { return (st && st.tech) || {}; }
  function city(st) { return (st && st.city) || {}; }
  function tl(st, k) { var v = tech(st)[k]; return typeof v === 'number' && isFinite(v) ? v | 0 : 0; }
  function bl(st, k) { var b = city(st)[k]; if (!b || typeof b !== 'object') return { n: 0, on: 0 }; var n = b.count | 0; return { n: n, on: b.on == null ? n : Math.max(0, Math.min(n, b.on | 0)) }; }
  function powered(st) { return !!city(st).powered; }
  function deficit(st) { var p = city(st).power; return powered(st) && typeof p === 'number' && p < 0; }
  function workers(st, job) { var c = (st && st.civic) || {}, j = c[job]; return (j && j.workers) | 0; }
  function L(p, a, b, col) { X.line(a[0], a[1], b[0], b[1], function (x, y) { p.set(x, y, col); }); }
  var FR = new Map();
  function frameOf(n, f, map) {
    var key = n + '|' + f + '|' + JSON.stringify(map || {}); if (FR.has(key)) return FR.get(key);
    var pc = P[n], k = pc.frames || 1, fw = pc.w / k, s = X.sprite(n, map), o = new Pix(fw, pc.h);
    for (var y = 0; y < pc.h; y++) for (var x = 0; x < fw; x++) o.d[y * fw + x] = s.d[y * s.w + (f % k) * fw + x];
    FR.set(key, o); return o;
  }

  /* ---------- 1. new buildings: table, slots, caps ---------- */
  var NEW = [['apartment', 'Apartment', 'living', 2, 1, 60, 'living', 8], ['warehouse', 'Container Port', 'storage', 2, 2, 30, 'storage', 2],
    ['wardenclyffe', 'Wardenclyffe', 'knowledge', 2, 2, 56, 'knowledge', 1], ['coal_power', 'Coal Powerplant', 'industry', 2, 2, 58, 'industry', 2],
    ['boot_camp', 'Boot Camp', 'society', 2, 1, 14, 'society', 2]];
  NEW.forEach(function (b) {
    if (!X.BUILDINGS.some(function (q) { return q.key === b[0]; })) X.BUILDINGS.push({ key: b[0], name: b[1], sector: b[2], fw: b[3], fd: b[4], h: b[5] });
    VL.CFG[b[0]] = [b[6], b[7]]; if (VL.ORDER.indexOf(b[0]) < 0) VL.ORDER.push(b[0]);
  });
  /* extendable sets (hook for era3.js): grid consumers and grid sources */
  var CONSUMER = SK.E2_CONSUMER = Object.assign(SK.E2_CONSUMER || {}, { apartment: 1, wardenclyffe: 1 }), SOURCE = SK.E2_SOURCE = Object.assign(SK.E2_SOURCE || {}, { coal_power: 1 }), NEWK = {}; NEW.forEach(function (b) { NEWK[b[0]] = 1; });
  /* per-frame tuning set by later eras: blast scale, Tesla arc boost */
  var E2X = SK.E2X = SK.E2X || { blast: 1, arc: 0 };
  /* the Era 1 map is full: Era 2 buildings take over the tail slots of the most numerous types (stable: only tail indices shift) */
  var TAIL = { basic_housing: 10, cottage: 5, lodge: 3, shed: 3, compost: 2, smokehouse: 2, silo: 3, mill: 3, farm: 5, lumber_yard: 2 };
  var PATCHED = new WeakSet();
  function patchSlots() {
    var S = VL.slots(); if (!S || PATCHED.has(S)) return S; PATCHED.add(S);
    var BM = {}; X.BUILDINGS.forEach(function (b) { BM[b.key] = b; }); var lay = X.layout(), own = new Array(N * N);
    Object.keys(S).forEach(function (t) { if (!BM[t]) return; S[t].forEach(function (s, k) { for (var y = s.y; y < s.y + BM[t].fd; y++) for (var x = s.x; x < s.x + BM[t].fw; x++) if (x >= 0 && y >= 0 && x < N && y < N) own[y * N + x] = { t: t, k: k, s: s }; }); });
    var steal = function (o) { return o && TAIL[o.t] != null && o.k >= TAIL[o.t]; }, gone = new Set();
    ['coal_power', 'warehouse', 'wardenclyffe', 'boot_camp', 'apartment'].forEach(function (t) {
      var b = BM[t], cap = VL.CFG[t][1], sec = VL.SECTORS[VL.CFG[t][0]], th = X.hash(t) & 0xffff, cand = [];
      (S[t] || []).forEach(function (s) { for (var y = s.y; y < s.y + b.fd; y++) for (var x = s.x; x < s.x + b.fw; x++) own[y * N + x] = undefined; });
      S[t] = [];
      for (var y = 0; y + b.fd <= N; y++) for (var x = 0; x + b.fw <= N; x++) { var dd = Math.hypot(x + b.fw / 2 - sec.a[0], y + b.fd / 2 - sec.a[1]); cand.push([dd + ih(x, y, th) * 1.5 + (dd > sec.r[1] ? (dd - sec.r[1]) * 3 : 0), x, y]); }
      cand.sort(function (p, q) { return p[0] - q[0]; });
      for (var i = 0; i < cand.length && S[t].length < cap; i++) {
        var X0 = cand[i][1], Y0 = cand[i][2], ok = true;
        for (var j = Y0 - 1; j <= Y0 + b.fd && ok; j++) for (var k2 = X0 - 1; k2 <= X0 + b.fw && ok; k2++) {
          var inside = k2 >= X0 && k2 < X0 + b.fw && j >= Y0 && j < Y0 + b.fd; if (k2 < 0 || j < 0 || k2 >= N || j >= N) { if (inside) ok = false; continue; }
          var o = own[j * N + k2];
          if (inside) { var tt = lay[j * N + k2]; if (!(tt === 1 || tt === 6) || (o && !steal(o))) ok = false; }
          else if (o && NEWK[o.t]) ok = false;
        }
        if (!ok) continue;
        for (j = Y0; j < Y0 + b.fd; j++) for (k2 = X0; k2 < X0 + b.fw; k2++) { var o2 = own[j * N + k2]; if (o2) { gone.add(o2.s); for (var yy = o2.s.y; yy < o2.s.y + BM[o2.t].fd; yy++) for (var xx = o2.s.x; xx < o2.s.x + BM[o2.t].fw; xx++) own[yy * N + xx] = undefined; } own[j * N + k2] = { t: t, k: -1, s: null }; }
        S[t].push({ x: X0, y: Y0 });
      }
    });
    Object.keys(TAIL).forEach(function (t) { if (S[t]) S[t] = S[t].filter(function (s) { return !gone.has(s); }); });
    return S;
  }
  var baseUpd = VL.update._orig || VL.update;
  var updW = function (st, t, opt) { patchSlots(); return baseUpd(st, t, opt); }; updW._orig = baseUpd; VL.update = updW;

  /* ---------- 2. code helpers: truss, wire, conveyor, rails, face sprite, grow ---------- */
  /* two chords plus alternating diagonals between two screen points; w = chord spacing; o.dir 'h' | 'v' forces the chord offset */
  function truss(p, a, b, w, ramp, o) {
    o = o || {}; var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy); if (len < 1) return;
    var vert = o.dir ? o.dir === 'v' : Math.abs(dy) > Math.abs(dx), off = vert ? [w, 0] : [0, -w];
    var a2 = [a[0] + off[0], a[1] + off[1]], b2 = [b[0] + off[0], b[1] + off[1]], n = Math.max(1, round(len / Math.max(3, w * 1.5)));
    var at = function (A, Bq, t) { return [A[0] + (Bq[0] - A[0]) * t, A[1] + (Bq[1] - A[1]) * t]; };
    for (var i = 0; i < n; i++) { var s0 = i % 2 ? [a2, b2] : [a, b], s1 = i % 2 ? [a, b] : [a2, b2]; L(p, at(s0[0], s0[1], i / n), at(s1[0], s1[1], (i + 1) / n), R(ramp, 2)); }
    if (o.ends !== false) { L(p, a, a2, R(ramp, 2)); L(p, b, b2, R(ramp, 2)); }
    L(p, a, b, R(ramp, vert ? 1 : 3)); L(p, a2, b2, R(ramp, vert ? 3 : 1));
  }
  /* 1 px catenary (parabola), test(x, y, t) may veto a pixel (depth) */
  function wire(p, a, b, sag, col, test) {
    var n = Math.max(2, Math.ceil(Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]))); col = col || R('soot', 3);
    for (var i = 0; i <= n; i++) { var t = i / n, x = round(a[0] + (b[0] - a[0]) * t), y = round(a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t)); if (!test || test(x, y, t)) p.set(x, y, col); }
  }
  function sagPt(a, b, sag, t) { return [round(a[0] + (b[0] - a[0]) * t), round(a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t))]; }
  /* inclined belt on a truss of the headframe gauge (3 px), rollers every 2 px, legs to the ground; stones are drawn live (stones()) */
  function conveyor(p, a, b, o) {
    o = o || {}; var za = o.za || 0, zb = o.zb || 0, fr = o.ramp || 'iron';
    var len = Math.hypot(b[0] - a[0], b[1] - a[1]), nl = Math.max(1, floor(len / 10));
    for (var i = 0; i <= nl; i++) { var t = i / nl, x = round(a[0] + (b[0] - a[0]) * t), y = round(a[1] + (b[1] - a[1]) * t) + 5, z = round(za + (zb - za) * t);
      for (var j = 1; j <= z - 4; j++) { p.set(x, y + j, R(fr, 2)); p.set(x + 1, y + j, R(fr, 3)); } }
    truss(p, [a[0], a[1] + 5], [b[0], b[1] + 5], 3, fr, { dir: 'h' });
    L(p, a, b, R('soot', 2)); L(p, [a[0], a[1] + 1], [b[0], b[1] + 1], R('soot', 3));
    var n = Math.max(1, round(Math.abs(b[0] - a[0]))); for (i = 0; i <= n; i += 2) { var tt = i / n; p.set(round(a[0] + (b[0] - a[0]) * tt), round(a[1] + (b[1] - a[1]) * tt) + 1, R('iron', 1)); }
  }
  function stones(set, a, b, ph, ore) {
    var len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 2) return;
    for (var s = ph % 6; s < len - 1; s += 6) { var t = s / len, x = round(a[0] + (b[0] - a[0]) * t), y = round(a[1] + (b[1] - a[1]) * t) - 1; set(x, y, R(ore, 1)); set(x + 1, y, R(ore, 2)); set(x, y - 1, R(ore, 0)); }
  }
  /* rails: two 1 px lines plus sleepers, along a ground line in tile space */
  function rails(p, Pg, u0, v0, u1, v1, metal) {
    var du = u1 - u0, dv = v1 - v0, l = Math.hypot(du, dv), nu = -dv / l * 0.07, nv = du / l * 0.07, n = Math.max(2, round(l / 0.12));
    for (var i = 0; i <= n; i++) { var t = i / n, u = u0 + du * t, v = v0 + dv * t; L(p, Pg(u - nu * 1.7, v - nv * 1.7), Pg(u + nu * 1.7, v + nv * 1.7), R('walnut', 3)); }
    L(p, Pg(u0 - nu, v0 - nv), Pg(u1 - nu, v1 - nv), R(metal, 1)); L(p, Pg(u0 + nu, v0 + nv), Pg(u1 + nu, v1 + nv), R(metal, 2));
  }
  /* upright piece pasted column by column onto a 2:1 face; returns piece -> pix coordinate mapper */
  function faceSpr(p, g, f, name, map, a, z) {
    var s = X.sprite(name, map, f === 'R' ? { shade: 1 } : null);
    for (var i = 0; i < s.w; i++) { var x = H.faceX(g, f, a + i), yb = H.faceY(g, f, a + i) - z; for (var j = 0; j < s.h; j++) { var c = s.d[j * s.w + i]; if (c) p.set(x, yb - (s.h - 1) + j, c); } }
    return function (i, j) { return [H.faceX(g, f, a + i), H.faceY(g, f, a + i) - z - (s.h - 1) + j]; };
  }
  function ring(p, cc, r, z, ramp) {
    var ry = r / 2;
    for (var px = cc[0] - r; px < cc[0] + r; px++) { var dx = (px + 0.5 - cc[0]) / r; if (Math.abs(dx) >= 1) continue;
      var yb = cc[1] + round(ry * Math.sqrt(1 - dx * dx)) - 1 - z; p.set(px, yb, R(ramp, dx < 0.2 ? 1 : dx < 0.65 ? 2 : 3)); p.set(px, yb - 1, R(ramp, dx < 0.2 ? 0 : dx < 0.65 ? 1 : 2)); }
  }
  /* copy of a composed building with `top` extra rows above; every recorded coordinate moves with it (cached outputs stay untouched) */
  function grow(o, top) {
    top = top | 0; var q = new Pix(o.pix.w, o.pix.h + top); q.blit(o.pix, 0, top);
    var r = Object.assign({}, o, { pix: q, oy: o.oy + top }), sh = function (pt) { return pt ? [pt[0], pt[1] + top].concat(pt.slice(2)) : pt; };
    r.roof = sh(o.roof); r.chim = sh(o.chim);
    ['smoke', 'emit', 'e2glow'].forEach(function (k) { if (o[k]) r[k] = o[k].map(sh); });
    if (o.signs) r.signs = o.signs.map(function (s) { return Object.assign({}, s, { y: s.y + top }); });
    r.e2 = {}; Object.keys(o.e2 || {}).forEach(function (k) { var v = o.e2[k]; r.e2[k] = Array.isArray(v) && typeof v[0] === 'number' ? sh(v) : v; });
    return r;
  }
  function PgO(o) { return function (u, v, z) { return [o.ox + (u - v) * 16, o.oy + (u + v) * 8 - (z || 0)]; }; }
  function putOn(o, spec, u, v, z0) { var sh = X.shell(spec), at = PgO(o)(u, v, z0 || 0), bx = at[0] - sh.ox, by = at[1] - sh.oy; o.pix.blit(sh.pix, bx, by); var g = H.geo(sh, bx, by); g.spec = spec; return g; }
  Object.assign(H, { truss: truss, wire: wire, conveyor: conveyor, rails: rails, faceSpr: faceSpr });

  /* lamp bookkeeping: a shell with a wall lamp carries pix.lamps; blits carry them into the composed building (capped) */
  var pblit = Pix.prototype.blit;
  if (!pblit._e2) {
    var nb = function (s, x, y, flip) { pblit.call(this, s, x, y, flip); if (s && s.lamps && s !== this) { var me = this; me.lamps = me.lamps || [];
      s.lamps.forEach(function (l) { if (me.lamps.length < 48) me.lamps.push([round(x) + (flip ? s.w - 1 - l[0] : l[0]), round(y) + l[1]]); }); } };
    nb._e2 = true; nb._orig = pblit; Pix.prototype.blit = nb;
  }

  /* ---------- 3. tier 4: shell remap while a tier-4 composer runs (SK.T4), extras on the shell ---------- */
  var DWELL = { basic_housing: 1, cottage: 1, lodge: 1 }, CIVIC = { temple: 1, bank: 1, library: 1, university: 1, hospital: 1, amphitheatre: 1, trade: 1, garrison: 1 };
  var SAWT = { foundry: 1, cement_plant: 1, coal_power: 1, metal_refinery: 1 }, KEEP = { mill: 1 }, CORR = { zinc: 1, rust: 1, oxide: 1 };
  function corrRamp(r) { return CORR[r] ? r : ['zinc', 'rust', 'oxide'][X.hash(r || '') % 3]; }
  function remap(s, T) {
    var type = T.type, dw = DWELL[type], cv = CIVIC[type], ind = !dw && !cv, o = JSON.parse(JSON.stringify(s)), rf = o.roof;
    if (o.wall && o.wall.tex === 'tex_brick' && (o.wall.ramp === 'brick' || o.wall.ramp === 'terracotta')) o.wall.ramp = 'ironbrick';
    if (o.wall2 && o.wall2.tex === 'tex_brick') o.wall2.ramp = 'ironbrick';
    if (o.plinthTex === 'tex_brick') o.plinthRamp = 'ironbrick';
    if (ind && o.wall && o.wall.tex === 'tex_cutstone') o.wall = { tex: 'tex_brick', ramp: 'ironbrick' };
    if (rf && !cv && (rf.tex === 'tex_tiles' || rf.tex === 'tex_shingles' || rf.tex === 'tex_thatch') && (rf.type === 'gable' || rf.type === 'hip' || rf.type === 'lean')) { rf.tex = 'tex_corrugated'; rf.ramp = corrRamp(rf.ramp); }
    if (rf && SAWT[type] && rf.type === 'gable' && o.w * o.d >= 0.9 && o.h >= 14 && o.shape !== 'round') { o.roof = { type: 'sawtooth', axis: o.w >= o.d ? 'x' : 'y', tex: 'tex_corrugated', ramp: corrRamp(rf.ramp), H: 4 }; rf = o.roof; }
    var roofed = rf && rf.type !== 'none' && rf.type !== 'flat', box = o.shape !== 'round';
    o._t4 = (box && roofed && !o.noPipe && o.h >= 11 && o.w >= 0.45 && o.d >= 0.45 ? 1 : 0) + (box && !dw && !o.noLamp && o.h >= 12 && o.w >= 0.5 ? 2 : 0);
    return o;
  }
  function extras(sh, o) {
    var p = sh.pix, w = o.w, d = o.d, Hh = sh.H, ox = sh.ox, oy = sh.oy, BL = [ox - d * 16, oy + d * 8], fy = function (a) { return BL[1] - 1 + Math.ceil(a / 2); };
    if (o._t4 & 1) {
      var a = Math.max(2, round(16 * w) - 2), x0 = round(BL[0] + a), top = fy(a) - Hh + 1;
      p.blit(X.sprite('hd_downpipe'), x0 - 1, top);
      for (var y = top + 5; y < fy(a); y++) { p.set(x0, y, R('zinc', 1)); p.set(x0 + 1, y, R('zinc', 3)); }
      p.set(x0 - 1, fy(a), R('zinc', 2)); p.set(x0, fy(a), R('zinc', 1)); p.set(x0 + 1, fy(a), R('zinc', 3));
    }
    if (o._t4 & 2) {
      var la = o.lampA != null ? o.lampA : 2, lz = o.lampZ != null ? o.lampZ : Math.min(Hh - 4, 13), lx = round(BL[0] + la), ly = fy(la) - lz;
      p.blit(X.sprite('lamp_electric'), lx, ly - 1); p.lamps = (p.lamps || []).concat([[lx + 4, ly + 4]]);
    }
  }
  var baseShell = X.shell._orig || X.shell;
  var shellW = function (s) {
    if (!SK.T4 || !s || s._t4 != null) return baseShell(s);
    var o = remap(s, SK.T4), sh = baseShell(o);
    if (!sh._e2 && o._t4) { sh._e2 = 1; extras(sh, o); }
    return sh;
  };
  shellW._orig = baseShell; X.shell = shellW;

  /* ---------- 4. composers: new buildings ---------- */
  function apartment(type, tier, k, season, lvl, o) {
    var c = B.C(type, 4, k, season, lvl), v = c.v, vk = k % 3, e2 = o.e2 || '', lit = e2.indexOf('L') >= 0, glass = lit ? 'gold' : 'glass';
    var floors = [4, 3, 3][vk] + (lvl >= 2 ? 1 : 0), g0h = 14, fh = 13, topz = g0h + (floors - 1) * fh;
    var F = B.frame(2, 1, topz + 24), p = F.p, Pg = F.Pg, rend = [['rosewash', 'ochre'], ['ochre', 'lime'], ['lime', 'rosewash']][vk][v.wi];
    B.ground(F, 0.03, 0.03, 1.97, 0.97, function (px, py) { return c.snow ? R('snow', 1) : X.texC('tex_cutstone', px, py * 2, 'river', 0); });
    var bw = 1.7, bd = 0.62, u0 = 0.15, v0 = 0.06, smoke = [], gs = [];
    gs.push(B.put(F, { w: bw, d: bd, h: g0h, plinth: 2, plinthRamp: 'river', wall: { tex: 'tex_brick', ramp: 'ironbrick' }, roof: { type: 'none' }, noPipe: 1, lampA: 8, lampZ: 12 }, u0, v0));
    for (var i = 1; i < floors; i++) {
      var last = i === floors - 1, rf = !last ? { type: 'none' } : vk === 0 ? { type: 'gable', axis: 'x', tex: 'tex_corrugated', ramp: c.m.roofR, pitch: 1 } : vk === 1 ? { type: 'flat', ramp: 'ironbrick' } : { type: 'gambrel', axis: 'x', tex: 'tex_corrugated', ramp: v.ri ? 'zinc' : 'oxide', pitch: 0 };
      gs.push(B.put(F, { w: bw, d: bd, h: fh, wall: { tex: 'tex_wattle', ramp: rend }, roof: rf, snow: c.snow, noPipe: 1, noLamp: 1 }, u0, v0, g0h + (i - 1) * fh));
    }
    var wm = { ACCENT: glass, METAL: 'iron' }, Lw = [1, 8, 15, 21];
    gs.forEach(function (g, i) {
      for (var a = 0; a < round(bw * 16); a++) p.set(H.faceX(g, 'L', a), H.faceY(g, 'L', a) + (i ? 0 : -g0h + 1), R(i ? 'ironbrick' : 'river', 2));
      for (a = 0; a < round(bd * 16); a++) p.set(H.faceX(g, 'R', a), H.faceY(g, 'R', a) + (i ? 0 : -g0h + 1), R(i ? 'ironbrick' : 'river', 3));
      if (!i) {
        H.onFace(p, g, 'L', 'win_tall', wm, H.snap(2, 'L', 6), 2); H.onFace(p, g, 'L', 'win_tall', wm, H.snap(21, 'L', 6), 2);
        H.onFace(p, g, 'L', 'door_arched', { MAIN: v.paint, ACCENT: v.paint2 }, H.snap(13, 'L', 6), 0);
        H.onFace(p, g, 'R', 'win_tall', wm, H.snap(2, 'R', 6), 2);
        return;
      }
      Lw.forEach(function (a) { H.onFace(p, g, 'L', 'win_tall', wm, H.snap(a, 'L', 6), 1); });
      if (i === 1 && v.acc.length) H.onFace(p, g, 'R', 'laundry', { MAIN: v.paint, ACCENT: v.bloom }, H.snap(1, 'R', 8), fh - 5);
      else H.onFace(p, g, 'R', 'win_tall', wm, H.snap(2, 'R', 6), 1);
      H.onFace(p, g, 'L', 'balcony_rail', { MAIN: 'river', METAL: 'soot' }, H.snap(7, 'L', 16), -1);
      if ((i + k) % 2 === 0) B.spr(p, 'pot_flowers', { ACCENT: i % 2 ? v.bloom : v.paint2, FOLIAGE: c.fol }, H.faceX(g, 'L', 10), H.faceY(g, 'L', 10) - 1);
      else B.spr(p, 'pot_flowers', { ACCENT: v.bloom, FOLIAGE: c.fol }, H.faceX(g, 'L', 19), H.faceY(g, 'L', 19) - 1);
    });
    /* one downpipe the full height at the corner */
    var g0 = gs[0], pa = round(bw * 16) - 2, px0 = H.faceX(g0, 'L', pa), pyb = H.faceY(g0, 'L', pa), ptop = pyb - topz - fh + 2;
    p.blit(X.sprite('hd_downpipe'), px0 - 1, ptop); for (var y = ptop + 5; y < pyb; y++) { p.set(px0, y, R('zinc', 1)); p.set(px0 + 1, y, R('zinc', 3)); }
    var gt = gs[gs.length - 1], roofPt;
    if (vk === 0) { smoke.push(B.chimney(p, gt, B.ridgePt(gt, 0.3))); roofPt = B.ridgePt(gt, 0.5); }
    else if (vk === 1) { roofPt = gt.P(bw / 2, bd / 2, gt.H);
      [[0.2, 0.2], [0.9, 0.18], [1.45, 0.3]].forEach(function (q, j) { var a = gt.P(q[0], q[1], gt.H); B.spr(p, j === 1 ? 'barrel' : 'pot_flowers', { ACCENT: j ? v.bloom : v.paint, FOLIAGE: c.fol }, a[0], a[1]); });
      var l0 = gt.P(0.35, 0.45, gt.H + 6), l1 = gt.P(1.3, 0.45, gt.H + 6); B.post(p, gt.P(0.35, 0.45, gt.H), 6, 'walnut'); B.post(p, gt.P(1.3, 0.45, gt.H), 6, 'walnut');
      wire(p, l0, l1, 2, R('cream', 2)); [0.3, 0.55, 0.78].forEach(function (t, j) { var q = sagPt(l0, l1, 2, t), col = [v.paint, v.bloom, 'cream'][j]; for (var yy = 1; yy < 4; yy++) { p.set(q[0], q[1] + yy, R(col, 1)); p.set(q[0] + 1, q[1] + yy, R(col, 2)); } }); }
    else { roofPt = B.ridgePt(gt, 0.5); smoke.push(B.chimney(p, gt, B.ridgePt(gt, 0.75))); }
    /* courtyard: laundry line, pots, a bench of crates */
    var lp0 = Pg(0.25, 0.9), lp1 = Pg(1.05, 0.9); B.post(p, lp0, 9, 'walnut'); B.post(p, lp1, 9, 'walnut');
    var t0 = [lp0[0], lp0[1] - 9], t1 = [lp1[0], lp1[1] - 9]; wire(p, t0, t1, 2, R('cream', 2));
    [0.2, 0.42, 0.66, 0.85].forEach(function (t, j) { var q = sagPt(t0, t1, 2, t), col = [v.paint2, 'cream', v.bloom, v.paint][j], hh = 3 + (j % 2); for (var yy = 1; yy <= hh; yy++) { p.set(q[0], q[1] + yy, R(col, 1)); p.set(q[0] + 1, q[1] + yy, R(col, yy === hh ? 3 : 2)); } });
    var pp = Pg(1.4, 0.86); B.spr(p, 'pot_flowers', { ACCENT: v.bloom, FOLIAGE: c.fol }, pp[0], pp[1]);
    pp = Pg(1.62, 0.9); B.spr(p, 'pot_flowers', { ACCENT: v.paint2, FOLIAGE: c.fol }, pp[0], pp[1]);
    return B.out(F, { roof: roofPt, h: topz + fh, smoke: smoke, v: v, e2: { lit: lit } });
  }

  function warehouse(type, tier, k, season, lvl, o) {
    var c = B.C(type, 4, k, season, lvl), v = c.v, e2 = o.e2 || '', gan = e2.indexOf('G') >= 0, fq = o.fq == null ? 0.6 : o.fq, ZB = 30;
    var F = B.frame(2, 2, gan ? 66 : 40), p = F.p, Pg = F.Pg, E = {};
    B.ground(F, 0.04, 0.04, 1.96, 1.96, function (px, py) { return c.snow ? R('snow', 1) : X.texC('tex_cutstone', px, py * 2, 'ashen', 0); });
    rails(p, Pg, 0.12, 1.88, 1.9, 1.88, 'iron');
    var g = B.put(F, { w: 0.8, d: 0.72, h: 16, plinth: 2, wall: { tex: 'tex_brick', ramp: 'ironbrick' }, roof: { type: 'gable', axis: 'y', tex: 'tex_corrugated', ramp: c.m.roofR, pitch: 1 }, snow: c.snow }, 0.08, 0.1);
    H.onFace(p, g, 'L', 'door_works', { MAIN: v.paint }, H.snap(3, 'L', 8), 0);
    H.onFace(p, g, 'R', 'win_tall', {}, H.snap(3, 'R', 6), 3);
    var lv = fq < 0.34 ? 1 : fq < 0.67 ? 2 : 3, COL = ['madder', 'teal', 'saffron', 'indigo', 'sage', 'rust', 'plum'].concat(e2.indexOf('A') >= 0 ? ['bronze', 'bronze'] : []);
    function leg(uF) { var A = Pg(uF, 0.95), Bq = Pg(uF, 1.82); truss(p, [A[0] - 1, A[1]], [A[0] - 1, A[1] - ZB], 2, 'oxide', { dir: 'v' }); truss(p, [Bq[0] - 1, Bq[1]], [Bq[0] - 1, Bq[1] - ZB], 2, 'oxide', { dir: 'v' });
      truss(p, [A[0], A[1] - ZB], [Bq[0], Bq[1] - ZB], 3, 'oxide', { dir: 'h' }); }
    if (gan) leg(0.32);
    var spots = [[1.28, 0.5], [1.74, 0.6], [0.6, 1.15], [1.08, 1.15], [1.56, 1.15], [0.6, 1.58], [1.08, 1.58], [1.56, 1.58]];
    spots.forEach(function (q, i) {
      var hh = Math.max(0, Math.min(3, lv - (ih(i, k * 7 + 1) < 0.35 ? 1 : 0))); if (!hh) return;
      var a = Pg(q[0], q[1]); for (var j = 0; j < hh; j++) B.spr(p, 'unit_container', { MAIN: COL[(i * 3 + j + k) % COL.length] }, a[0], a[1] - j * 5, { flip: (i + j) % 2 === 1 });
    });
    var cp = Pg(0.45 + (k % 3) * 0.45, 1.88); B.spr(p, 'sig_cart', { MAIN: 'iron', ACCENT: COL[(k + 2) % COL.length], METAL: 'iron' }, cp[0], cp[1] + 1);
    if (gan) { leg(1.86); var bA = Pg(0.32, 1.38, ZB + 3), bB = Pg(1.86, 1.38, ZB + 3); truss(p, bA, bB, 3, 'oxide', { dir: 'h' }); E.beamA = Pg(0.45, 1.38, ZB + 6); E.beamB = Pg(1.74, 1.38, ZB + 6); }
    return B.out(F, { roof: Pg(0.45, 0.45, 24), h: gan ? 36 : 20, noShadow: true, v: v, e2: E });
  }

  function wardenclyffe(type, tier, k, season, lvl, o) {
    var c = B.C(type, 4, k, season, lvl), v = c.v, e2 = o.e2 || '', lit = e2.indexOf('L') >= 0, radio = e2.indexOf('R') >= 0, glass = lit ? 'gold' : 'glass';
    var F = B.frame(2, 2, radio ? 104 : 80), p = F.p, Pg = F.Pg, E = { lit: lit };
    B.ground(F, 0.05, 0.05, 1.95, 1.95, function (px, py) { return c.snow ? R('snow', 1) : X.texC('tex_drystone', px, py * 2, 'river', 0); });
    var th = 36;
    B.put(F, { w: 0.9, d: 0.9, h: th, shape: 'round', r: 9, plinth: 3, plinthRamp: 'river', wall: { tex: 'tex_brick', ramp: 'ironbrick' }, roof: { type: 'dome', tex: 'tex_rivetplate', ramp: 'copper', H: 7 }, snow: c.snow }, 0.15, 0.15);
    var cc = Pg(0.6, 0.6), top = [cc[0], cc[1] - th - 7];
    ring(p, cc, 9, 13, 'iron'); ring(p, cc, 9, 27, 'iron');
    B.spr(p, 'door_arched', { MAIN: v.paint, ACCENT: 'saffron' }, cc[0] - 3, cc[1] + 4);
    p.blit(X.sprite('win_tall', { ACCENT: glass }), cc[0] - 7, cc[1] - 22);
    p.blit(X.sprite('win_tall', { ACCENT: glass }, { flip: true, shade: 1 }), cc[0] + 2, cc[1] - 22);
    B.spr(p, 'sig_tesla_coil', {}, top[0], top[1] + 2); E.torus = [top[0], top[1] - 11];
    if (radio) {
      var mb = Pg(1.72, 0.3), MH = 66, mt = [mb[0], mb[1] - MH];
      [Pg(1.96, 0.06), Pg(1.3, 0.1), Pg(1.96, 0.62)].forEach(function (q) { wire(p, [mt[0] + 1, mt[1] + 18], q, 2, R('soot', 2)); });
      truss(p, [mb[0] - 1, mb[1]], [mb[0] - 1, mt[1]], 3, 'steel', { dir: 'v' });
      B.spr(p, 'sig_mast_top', {}, mt[0] + 1, mt[1]); E.tip = [mt[0] + 1, mt[1] - 9];
    }
    var gl = B.put(F, { w: 1.05, d: 0.6, h: 12, plinth: 2, wall: { tex: 'tex_brick', ramp: 'ironbrick' }, roof: { type: 'lean', axis: 'y', tex: 'tex_glasspane', ramp: glass }, snow: c.snow }, 0.85, 1.28);
    H.onFace(p, gl, 'L', 'win_tall', { ACCENT: glass }, H.snap(4, 'L', 6), 1); H.onFace(p, gl, 'L', 'win_tall', { ACCENT: glass }, H.snap(11, 'L', 6), 1);
    H.onFace(p, gl, 'L', 'door_plain', { MAIN: v.paint2 }, H.snap(18, 'L', 6), 0);
    H.onFace(p, gl, 'R', 'win_tall', { ACCENT: glass }, H.snap(2, 'R', 6), 1);
    return B.out(F, { roof: top, h: th + 18, v: v, e2: E });
  }

  function coal_power(type, tier, k, season, lvl, o) {
    var c = B.C(type, 4, k, season, lvl), v = c.v, on = o.on !== false, F = B.frame(2, 2, 92 + c.extra), p = F.p, Pg = F.Pg, smoke = [], glow = [], ink = X.pal().ink;
    B.ground(F, 0.05, 0.05, 1.95, 1.95, function (px, py) { return c.snow ? R('snow', 1) : R('ashen', ((px >> 1) + py * 3 + k) % 9 ? 1 : 2); });
    if (!c.snow) B.chips(F, 0.1, 0.1, 1.9, 1.9, 'soot', 24, k + 9);
    [[0.28, 0.16], [0.78, 0.1]].forEach(function (q, i) {
      var hh = 60 + c.extra - i * 5;
      B.put(F, { w: 0.3, d: 0.3, h: hh, shape: 'round', r: 4, plinth: 3, plinthRamp: 'river', wall: { tex: 'tex_brick', ramp: 'ironbrick' }, roof: { type: 'none' }, snow: c.snow }, q[0], q[1]);
      var cc = Pg(q[0] + 0.15, q[1] + 0.15); ring(p, cc, 4, hh - 2, 'soot'); ring(p, cc, 4, round(hh * 0.45), 'iron');
      var ct = Pg(q[0] + 0.15, q[1] + 0.15, hh); p.set(ct[0] - 2, ct[1] - 1, ink); p.set(ct[0] - 1, ct[1] - 1, ink); p.set(ct[0], ct[1] - 1, ink); p.set(ct[0] + 1, ct[1] - 1, ink);
      smoke.push([ct[0], ct[1] - 2], [ct[0] - 1, ct[1] - 3], [ct[0] + 1, ct[1] - 4]);
    });
    var hp = Pg(1.7, 0.45); B.mound(p, hp[0], hp[1], 10, 8, 'tex_drystone', 'soot', { cap: c.snow ? ['snow', 1] : null });
    var ca = Pg(1.62, 0.66, 4), cb2 = Pg(1.46, 0.86, 19); conveyor(p, ca, cb2, { za: 4, zb: 19 });
    var g = B.put(F, { w: 1.55, d: 1.0, h: 20 + c.extra, plinth: 3, wall: { tex: 'tex_brick', ramp: 'ironbrick' }, roof: { type: 'sawtooth', axis: 'x', tex: 'tex_corrugated', ramp: 'zinc', H: 4 }, snow: c.snow }, 0.12, 0.84);
    [5, 15].forEach(function (a) { var m = faceSpr(p, g, 'L', 'sig_boiler_door', {}, H.snap(a, 'L', 8), 1); if (on) for (var i = 2; i < 6; i++) glow.push(m(i, 3)); });
    H.onFace(p, g, 'R', 'win_tall', {}, H.snap(3, 'R', 6), 6); H.onFace(p, g, 'R', 'win_tall', {}, H.snap(10, 'R', 6), 6);
    H.faceStrip(p, g, 'L', 'hd_steel_lintel', {}, 2, round(g.w * 16) - 4, 14);
    return B.out(F, { roof: B.ridgePt(g, 0.5), h: 32 + c.extra, smoke: on ? smoke : [], v: v, e2glow: glow, e2: { belt: [ca, cb2], ore: 'soot', on: on } });
  }

  function boot_camp(type, tier, k, season, lvl, o) {
    var c = B.C(type, 4, k, season, lvl), v = c.v, spy = (o.e2 || '').indexOf('S') >= 0, F = B.frame(2, 1, 34), p = F.p, Pg = F.Pg, S = X.SEASONS[season];
    B.ground(F, 0.03, 0.03, 1.97, 0.97, function () { return c.snow ? R('snow', 1) : R(S.grass, 2); });
    var sand = function (px, py) { return c.snow ? R('snow', 2) : R('sand', ((px + py * 3) % 11) ? 1 : 2); };
    B.ground(F, 0.12, 0.43, 1.92, 0.61, sand);
    if (spy) B.ground(F, 0.3, 0.74, 1.92, 0.84, sand);
    for (var u = 0.04; u <= 1.97; u += 0.1) { var a = Pg(u, 0.04); B.post(p, a, 9, 'walnut'); p.set(a[0], a[1] - 10, R('walnut', 2)); }
    for (var w2 = 0.14; w2 <= 0.97; w2 += 0.1) { var b2 = Pg(0.04, w2); B.post(p, b2, 9, 'walnut'); p.set(b2[0], b2[1] - 10, R('walnut', 2)); }
    var tp = Pg(0.45, 0.24); B.spr(p, 'camp_tent', { ACCENT: 'sage', MAIN: 'hide' }, tp[0], tp[1]);
    var tg = Pg(1.74, 0.24); B.post(p, tg, 8, 'walnut');
    for (var yy = -4; yy <= 4; yy++) for (var xx = -4; xx <= 4; xx++) { var e = xx * xx + yy * yy; if (e > 18) continue; var rr = Math.sqrt(e);
      p.set(tg[0] + xx, tg[1] - 13 + yy, rr < 1.2 ? R('madder', 1) : rr < 2.4 ? R('cream', xx > 1 ? 2 : 1) : rr < 3.6 ? R('madder', xx > 1 ? 3 : 2) : R('cream', xx > 1 ? 3 : 2)); }
    var ob = Pg(1.0, 0.52); B.spr(p, 'sig_obstacle', {}, ob[0], ob[1]);
    if (spy) [0.7, 1.1, 1.5].forEach(function (uu) { var h0 = Pg(uu, 0.76), h1 = Pg(uu, 0.84); B.post(p, h0, 4, 'oak'); B.post(p, h1, 4, 'oak'); L(p, [h0[0], h0[1] - 4], [h1[0], h1[1] - 4], R('madder', 2)); });
    var fl = Pg(1.9, 0.9); B.post(p, fl, 14, 'walnut'); p.blit(X.sprite('flag', { ACCENT: v.paint }), fl[0], fl[1] - 22);
    return B.out(F, { roof: Pg(1, 0.5, 14), h: 14, noShadow: true, v: v, e2: { spy: spy } });
  }
  var NEWC = { apartment: apartment, warehouse: warehouse, wardenclyffe: wardenclyffe, coal_power: coal_power, boot_camp: boot_camp };

  /* ---------- 5. modifiers on Era 1 composers ---------- */
  function raw(t) { var f = VL.COMPOSERS[t]; while (f && f._orig) f = f._orig; return f; }
  function mod(t, fn) { var base = raw(t); if (!base) return; var w = function (type, tier, k, season, lvl, o) { return fn(base, type, tier, k, season, lvl, o || {}); }; w._orig = base; VL.COMPOSERS[t] = w; }
  Object.keys(NEWC).forEach(function (t) { VL.COMPOSERS[t] = NEWC[t]; });

  function barn(type, tier, k, season, lvl, o) {
    var c = B.C(type, Math.max(2, tier), k, season, lvl), v = c.v, F = B.frame(1, 1, 56 + c.extra), p = F.p, t4 = tier >= 4;
    var spec = { w: 0.92, d: 0.86, h: 13 + c.extra, plinth: 3, plinthRamp: t4 ? 'ironbrick' : 'river', plinthTex: t4 ? 'tex_brick' : undefined, wall: { tex: 'tex_planks', ramp: v.wi ? 'oxide' : 'pinewood' },
      roof: { type: 'gambrel', axis: v.axis, tex: t4 ? 'tex_corrugated' : 'tex_shingles', ramp: t4 ? (v.ri ? 'zinc' : 'rust') : c.m.roofR, pitch: 1 }, snow: c.snow };
    var g = B.put(F, spec, 0.04, 0.07), f = v.axis === 'y' ? 'L' : 'R', span = (f === 'L' ? g.w : g.d) * 16;
    H.onFace(p, g, f, 'door_works', { MAIN: v.wi ? 'cream' : v.paint }, H.snap(round(span / 2) - 4, f, 8), 0);
    H.onFace(p, g, f, 'win_shutter', { MAIN: v.paint2 }, H.snap(round(span / 2) - 3, f, 6), 15);
    var of = f === 'L' ? 'R' : 'L'; H.onFace(p, g, of, t4 ? 'win_tall' : 'win_shutter', { MAIN: v.paint2 }, H.snap(4, of, 6), 2);
    if (v.acc.length) { var pp = F.Pg(0.02, 0.98); B.spr(p, 'pot_flowers', { ACCENT: v.bloom, FOLIAGE: c.fol }, pp[0], pp[1]); }
    return B.out(F, { roof: B.ridgePt(g, 0.5), h: 24 + c.extra, v: v });
  }
  mod('shed', function (base, type, tier, k, season, lvl, o) { return (o.e2 || '').indexOf('B') >= 0 ? barn(type, tier, k, season, lvl, o) : base(type, tier, k, season, lvl, o); });

  mod('storage_yard', function (base, type, tier, k, season, lvl, o) {
    var out = base(type, tier, k, season, lvl, o), e2 = o.e2 || '', ci = e2.indexOf('C'); if (ci < 0) return out;
    var pos = (+e2.charAt(ci + 1) || 0) & 3, r = grow(out, 48), Pg = PgO(r), p = r.pix, Hm = 52, ramp = 'oxide';
    var b0 = Pg(0.22, 0.22), top = [b0[0] - 2, b0[1] - Hm], th = [0, 0.38, 1.19, 1.57][pos], jr = 1.42;
    var jend = Pg(0.22 + jr * Math.cos(th), 0.22 + jr * Math.sin(th), Hm - 3), cj = Pg(0.22 - 0.42 * Math.cos(th), 0.22 - 0.42 * Math.sin(th), Hm - 3);
    truss(p, [b0[0] - 2, b0[1]], top, 4, ramp, { dir: 'v' });
    truss(p, [top[0] + 2, top[1] + 3], cj, 2, ramp, { dir: 'h' });
    for (var yy = 0; yy < 4; yy++) for (var xx = -2; xx < 2; xx++) p.set(cj[0] + xx, cj[1] + 1 + yy, R('river', xx < 0 ? 1 : 3));
    truss(p, [top[0] + 2, top[1] + 3], jend, 3, ramp, { dir: 'h' });
    for (yy = 0; yy < 5; yy++) for (xx = 0; xx < 5; xx++) p.set(top[0] + xx, top[1] - 3 + yy, yy === 1 && xx > 0 && xx < 4 ? X.pal().ink : R('saffron', xx < 2 ? 1 : 3));
    var hookY = jend[1] + (Hm - 3 - 18); L(p, [jend[0], jend[1] + 1], [jend[0], hookY - 1], R('soot', 2));
    B.spr(p, 'sig_hook_block', {}, jend[0], hookY);
    r.h = Math.max(out.h || 10, 40); return r;
  });

  mod('smelter', function (base, type, tier, k, season, lvl, o) {
    var out = base(type, tier, k, season, lvl, o), e2 = o.e2 || ''; if (e2.indexOf('V') < 0) return out;
    var r = grow(out, 0), Pg = PgO(r), f = e2.indexOf('t') >= 0 ? 1 : 0, at = Pg(1.7, 0.95);
    /* 22x24 converter on its timber cradle, soot body with iron bands so it stands out from brick and paving */
    r.pix.blit(frameOf('sig_converter', f, { MAIN: 'soot', METAL: 'iron', WOOD: 'walnut' }), at[0] - 11, at[1] - 23);
    r.e2.mouth = f ? [at[0] + 8, at[1] - 16] : [at[0], at[1] - 22]; r.e2.pour = [at[0] + 8, at[1] + 1]; r.e2.tip = f; return r;
  });

  function mineMod(base, type, tier, k, season, lvl, o) {
    var out = base(type, tier, k, season, lvl, o), e2 = o.e2 || ''; if (!e2) return out;
    var hfm = e2.indexOf('H') >= 0, r = grow(out, hfm ? 30 : 0), p = r.pix, Pg = PgO(r), E = r.e2, quarry = type === 'rock_quarry';
    if (e2.indexOf('K') >= 0) {
      var a, b2, za, zb;
      if (quarry) { a = Pg(0.92, 1.05, -8); b2 = Pg(0.44, 1.6, 13); za = 3; zb = 13; }
      else { a = [E.gal[0] - 3, E.gal[1] - 2]; b2 = [E.heap[0] + 4, E.heap[1] - 10]; za = 2; zb = 10; }
      conveyor(p, a, b2, { za: za, zb: zb }); E.belt = [a, b2]; E.ore = quarry ? 'river' : E.coal ? 'soot' : 'rust';
    }
    if (hfm && E.hf) {
      var hf = E.hf, tz = 30;
      truss(p, [hf[0] - 7, hf[1] + 1], [hf[0] - 3, hf[1] - tz], 3, 'iron', { dir: 'v' });
      truss(p, [hf[0] + 4, hf[1] + 1], [hf[0], hf[1] - tz], 3, 'iron', { dir: 'v' });
      L(p, [hf[0] + 12, hf[1] - 1], [hf[0] + 2, hf[1] - tz + 4], R('iron', 3)); L(p, [hf[0] + 13, hf[1] - 1], [hf[0] + 3, hf[1] - tz + 4], R('iron', 2));
      var sc = [hf[0], hf[1] - tz - 2]; [[-1, -2], [0, -2], [1, -2], [-2, -1], [2, -1], [-2, 0], [2, 0], [-2, 1], [2, 1], [-1, 2], [0, 2], [1, 2]].forEach(function (q) { p.set(sc[0] + q[0], sc[1] + q[1], R('iron', q[0] < 0 || q[1] < 0 ? 1 : 3)); });
      p.set(sc[0], sc[1], R('soot', 2)); L(p, [sc[0] + 2, sc[1]], [sc[0] + 2, hf[1] - 2], R('soot', 2));
    }
    if (e2.indexOf('T') >= 0) { var tp = quarry ? Pg(1.66, 1.72) : Pg(1.32, 1.84); B.spr(p, 'sig_tnt_crate', {}, tp[0], tp[1]); }
    if (quarry) E.blast = Pg(1, 1, -10); else if (E.gal) E.blast = [E.gal[0], E.gal[1] - 6];
    return r;
  }
  ['rock_quarry', 'mine', 'coal_mine'].forEach(function (t) { mod(t, mineMod); });

  mod('foundry', function (base, type, tier, k, season, lvl, o) {
    var out = base(type, tier, k, season, lvl, o), e2 = o.e2 || '', ki = e2.indexOf('K'); if (ki < 0) return out;
    var n = Math.max(1, Math.min(3, +e2.charAt(ki + 1) || 1)), r = grow(out, 0), Pg = PgO(r), snow = season === 3;
    putOn(r, { w: 0.42, d: 0.42, h: 12, shape: 'round', r: 6, plinth: 2, wall: { tex: 'tex_brick', ramp: 'ironbrick' }, roof: { type: 'cone', tex: 'tex_brick', ramp: 'ironbrick', H: 10 }, snow: snow }, 0.04, 1.5);
    var cc = Pg(0.25, 1.71); B.spr(r.pix, 'sig_kiln_mouth', {}, cc[0], cc[1] + 3);
    r.smoke = (r.smoke || []).concat(o.on === false ? [] : [[cc[0], cc[1] - 23]]);
    [[1.0, 1.9], [1.26, 1.88]].forEach(function (q, i) { for (var j = 0; j < n - (i && n > 1 ? 1 : 0); j++)
      putOn(r, { w: 0.22, d: 0.22, h: 3, plinth: j ? 0 : 1, plinthRamp: 'walnut', wall: { tex: 'tex_brick', ramp: 'brick' }, roof: { type: 'flat', ramp: 'brick' }, snow: snow && j === n - 1, noPipe: 1, noLamp: 1 }, q[0] - 0.11, q[1] - 0.11, j * 5); });
    return r;
  });

  var FCOL = { m: 'madder', s: 'sage', f: 'saffron', i: 'indigo', t: 'teal', p: 'plum' };
  mod('trade', function (base, type, tier, k, season, lvl, o) {
    var out = base(type, tier, k, season, lvl, o), e2 = o.e2 || '', di = e2.indexOf('D'); if (di < 0) return out;
    var r = grow(out, 0), Pg = PgO(r), cols = e2.slice(di + 1, di + 4);
    [0.3, 0.85, 1.4].forEach(function (u, i) { var b0 = Pg(u, 0.97); for (var j = 0; j < 12; j++) r.pix.set(b0[0], b0[1] - j, R('walnut', 2));
      r.pix.blit(X.sprite('flag', { ACCENT: FCOL[cols.charAt(i)] || 'teal' }), b0[0], b0[1] - 20); });
    return r;
  });
  mod('temple', function (base, type, tier, k, season, lvl, o) {
    var out = base(type, tier, k, season, lvl, o), e2 = o.e2 || ''; if (e2.indexOf('M') < 0) return out;
    var r = grow(out, 0), Pg = PgO(r);
    [[0.06, 1.92], [1.92, 0.06]].forEach(function (q) { var b0 = Pg(q[0], q[1]); for (var j = 2; j < 28; j++) { r.pix.set(b0[0], b0[1] - j, R('walnut', 1)); r.pix.set(b0[0] + 1, b0[1] - j, R('walnut', 3)); }
      r.pix.set(b0[0], b0[1] - 28, R('gold', 1)); r.pix.set(b0[0] + 1, b0[1] - 28, R('gold', 2)); r.pix.blit(X.sprite('gov_banner', { MAIN: 'cream', ACCENT: 'saffron' }), b0[0] + 1, b0[1] - 25); });
    return r;
  });

  /* tier-4 wrapper: SK.T4 is set while a tier-4 composer runs; the mill keeps its tier-3 look, new buildings always build in brick and steel */
  Object.keys(VL.COMPOSERS).forEach(function (t) {
    var f = VL.COMPOSERS[t]; if (f._t4w) return;
    var w = function (type, tier, k, season, lvl, o) {
      if (tier >= 4 && KEEP[type]) tier = 3;
      if (tier < 4 && !NEWK[type]) return f(type, tier, k, season, lvl, o);
      var prev = SK.T4; SK.T4 = { type: type, k: k };
      try { return f(type, tier, k, season, lvl, o); } finally { SK.T4 = prev; }
    };
    w._t4w = true; w._orig = f; VL.COMPOSERS[t] = w;
  });

  /* ---------- 6. state -> composer options (DYN) ---------- */
  function rawD(t) { var f = VL.DYN[t]; while (f && f._orig) f = f._orig; return f; }
  function dyn(type, fn) {
    var base = rawD(type);
    var w = function (st, t, it) { var o = base ? base(st, t, it) : undefined, e = ''; try { e = fn(st || {}, t, it || {}) || ''; } catch (er) { e = ''; }
      if (!e) return o; o = Object.assign({}, o || {}); if (typeof e === 'string') o.e2 = e; else Object.assign(o, e); return o; };
    w._orig = base; VL.DYN[type] = w;
  }
  function jib(t, k) { var per = 6000 + ih(k, 3, 961) * 4000; return [0, 1, 2, 3, 2, 1][floor(t / per) % 6]; }
  function tipped(t, k) { var cyc = 15000 + ih(k, 5, 962) * 10000; return ((t + ih(k, 6, 963) * cyc) % cyc) < 2600; }
  function litFor(st, type, it) {
    if (!powered(st)) return false;
    var b = bl(st, type), per = ((VL.vil.plan || {}).per || {})[type] || {}, v = per.v || 0; if (!b.n || !v) return false;
    var n = round(b.on / b.n * v), hs = X.hash(type) & 0xffff, me = ih(it.k | 0, hs, 964), rank = 0;
    for (var j = 0; j < v; j++) if (j !== it.k && ih(j, hs, 964) < me) rank++;
    return rank < n;
  }
  function hostCol(st, i) { var g = (((st && st.civic) || {}).foreign || {})['gov' + i]; if (!g) return 'itp'.charAt(i); var h = g.hstl | 0; return h > 60 ? 'm' : h < 30 ? 's' : 'f'; }
  dyn('shed', function (st) { return tl(st, 'storage') >= 3 ? 'B' : ''; });
  dyn('storage_yard', function (st, t, it) { return tl(st, 'container') >= 3 ? 'C' + jib(t, it.k) : ''; });
  dyn('smelter', function (st, t, it) { var s = tl(st, 'smelting'); return (s >= 3 ? 'F' : '') + (s >= 4 ? 'V' + (tipped(t, it.k) ? 't' : '') : ''); });
  ['rock_quarry', 'mine', 'coal_mine'].forEach(function (type) { dyn(type, function (st) { var cv = tl(st, 'mine_conveyor') >= 1, ex = tl(st, 'explosives');
    return (cv ? 'K' : '') + (cv && VL.vil.tier >= 4 && type !== 'rock_quarry' ? 'H' : '') + (ex >= 1 ? 'T' : ''); }); });
  dyn('foundry', function (st) { if (tl(st, 'foundry') < 6) return ''; var f = B.fill(st, ['Brick']); return 'K' + (f < 0.34 ? 1 : f < 0.67 ? 2 : 3); });
  dyn('trade', function (st) { return tl(st, 'trade') >= 2 ? 'D' + hostCol(st, 0) + hostCol(st, 1) + hostCol(st, 2) : ''; });
  dyn('temple', function (st) { return tl(st, 'fanaticism') >= 3 ? 'M' : ''; });
  VL.DYN.apartment = function (st, t, it) { return { on: true, e2: litFor(st, 'apartment', it) ? 'L' : 'd' }; };
  VL.DYN.warehouse = function (st) { return { on: true, fq: B.fill(st, ['Lumber', 'Stone', 'Copper', 'Iron', 'Cement', 'Steel']), e2: tl(st, 'steel_container') >= 2 ? 'G' : '-' }; };
  VL.DYN.wardenclyffe = function (st, t, it) { return { on: true, e2: (litFor(st, 'wardenclyffe', it) ? 'L' : 'd') + (tl(st, 'broadcast') >= 1 ? 'R' : '') }; };
  VL.DYN.coal_power = function (st) { var b = bl(st, 'coal_power'); return { on: b.on > 0 }; };
  VL.DYN.boot_camp = function (st) { return { on: true, e2: tl(st, 'spy') >= 3 ? 'S' : '-' }; };

  /* ---------- 7. power grid: poles along routed roads, wires, street lamps ---------- */
  var GRID = { key: '', poles: [], links: [], lamps: [], segs: [] }, DIG = null;
  function occOf(list) { var o = new Uint8Array(N * N); list.forEach(function (it) { for (var y = it.y; y < it.y + it.fd; y++) for (var x = it.x; x < it.x + it.fw; x++) if (x >= 0 && y >= 0 && x < N && y < N) o[y * N + x] = 1; }); return o; }
  function freeAt(occ, u, v, extra) {
    var x = floor(u), y = floor(v); if (x < 0 || y < 0 || x >= N || y >= N || occ[y * N + x]) return false; var t = X.layout()[y * N + x]; if (t === 4) return false;
    var dec = (W0.dec().list || []).concat(extra || []); return dec.every(function (o) { return Math.hypot(o.u - u, o.v - v) > 0.55; });
  }
  function keyOf(it) { return it.x + it.y + (it.fw + it.fd) / 2; }
  function gridPlan(st) {
    var list = (VL.vil.plan && VL.vil.plan.list) || [];
    if (!powered(st)) { GRID = { key: 'off', poles: [], links: [], lamps: [], segs: [] }; return GRID; }
    var src = list.filter(function (it) { return SOURCE[it.type]; }), dst = list.filter(function (it) { return CONSUMER[it.type]; });
    var key = list.map(function (i) { return i.type.slice(0, 2) + i.x + ',' + i.y; }).join(';'); if (key === GRID.key) return GRID;
    var occ = occOf(list), osig = 'e2g' + X.hash(key), poles = [], links = [], seen = {};
    function poleAt(u, v) { for (var i = 0; i < poles.length; i++) if (Math.hypot(poles[i].u - u, poles[i].v - v) < 1.2) return i; poles.push({ u: u, v: v }); return poles.length - 1; }
    function node(it, z) { return it ? { u: it.x + 0.3, v: it.y + it.fd - 0.06, z: z, k: keyOf(it) + 0.01 } : { u: 23.6, v: 11.5, z: 12, k: 35.1 }; }
    dst.forEach(function (d) {
      var s = src.slice().sort(function (a, b) { return Math.hypot(a.x - d.x, a.y - d.y) - Math.hypot(b.x - d.x, b.y - d.y); })[0];
      var A = s ? [s.x + s.fw / 2, Math.min(N - 0.5, s.y + s.fd + 0.4)] : [23.4, 11.5], Bq = [d.x + d.fw / 2, Math.min(N - 0.5, d.y + d.fd + 0.4)];
      var path = CZ.route(A, Bq, occ, osig), chain = [node(s, 22)], acc = 0, nextAt = 1.2;
      for (var i = 1; i < path.length; i++) { var a = path[i - 1], b = path[i], seg = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]); acc += seg;
        while (acc >= nextAt) { var t = seg ? 1 - (acc - nextAt) / seg : 1, u = a[0] + (b[0] - a[0]) * t, v = a[1] + (b[1] - a[1]) * t, ok = null;
          [[0.32, 0.32], [-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32]].some(function (q) { if (freeAt(occ, u + q[0], v + q[1])) { ok = [u + q[0], v + q[1]]; return true; } return false; });
          if (ok) chain.push({ pole: poleAt(ok[0], ok[1]) }); nextAt += 3.5; } }
      chain.push(node(d, 16));
      for (var j = 1; j < chain.length; j++) { var p0 = chain[j - 1], p1 = chain[j], kk = (p0.pole != null ? 'p' + p0.pole : p0.u + ',' + p0.v) + '>' + (p1.pole != null ? 'p' + p1.pole : p1.u + ',' + p1.v);
        if (p0.pole != null && p0.pole === p1.pole) continue; if (!seen[kk]) { seen[kk] = 1; links.push([p0, p1]); } }
    });
    var lamps = [];
    [[9.35, 12.6], [14.65, 11.4], [11.4, 9.35], [12.6, 14.65]].forEach(function (q) { if (freeAt(occ, q[0], q[1], poles)) lamps.push({ u: q[0], v: q[1] }); });
    GRID = { key: key, poles: poles, links: links, lamps: lamps, segs: [] };
    return GRID;
  }
  var POLE = null, SLAMP = null;
  function polePix() { if (POLE) return POLE; var p = new Pix(7, 14); for (var y = 2; y < 14; y++) p.set(3, y, R('walnut', y < 4 ? 1 : 2));
    for (var x = 0; x < 7; x++) p.set(x, 2, R('walnut', x < 3 ? 1 : 3)); p.set(0, 1, R('cream', 1)); p.set(6, 1, R('cream', 2)); p.set(3, 13, R('walnut', 3)); p.set(2, 13, R('walnut', 2)); p.set(4, 13, R('walnut', 3)); return (POLE = p); }
  function streetLampPix() { if (SLAMP) return SLAMP; var lp = X.sprite('lantern_post'), p = new Pix(lp.w + 2, lp.h);
    for (var y = 0; y < lp.h; y++) for (var x = 0; x < lp.w; x++) { if (x >= 2 && y < 8) continue; var c = lp.d[y * lp.w + x]; if (c) p.d[y * p.w + x] = c; }
    p.blit(X.sprite('lamp_electric', { ACCENT: 'teal' }), 1, 0); return (SLAMP = p); }
  function dItem(pix, ax, ay, u, v) { return { k: u + v, v: v, u: u, shadow: function () {}, draw: function (b, blitD) { var g = wp(u, v); blitD(b, pix, round(g[0]) - ax, round(g[1]) - ay, u + v, -1); } }; }
  function trenchPix() { var p = new Pix(24, 13), d = X.sprite('sig_dig_find');
    X.fillPoly(p, [[2, 6], [12, 1], [22, 6], [12, 11]], function (x, y) { return R('dirt', y < 4 ? 1 : 2); });
    X.fillPoly(p, [[5, 6], [12, 3], [19, 6], [12, 9]], function (x, y) { return R('dirt', y < 6 ? 4 : 3); });
    p.blit(d, 6, 2); [[2, 6], [12, 1], [22, 6], [12, 11]].forEach(function (q) { p.set(q[0], q[1] - 1, R('walnut', 1)); p.set(q[0], q[1] - 2, R('walnut', 2)); });
    return p; }
  function e2Decor(ctx) {
    var st = ctx.state, out = [], g = gridPlan(st), pl = polePix(), E = W0.dec().E || {}, snow = E.winter ? 1 : 0;
    g.poles.forEach(function (q) { out.push(dItem(pl, 3, 13, q.u, q.v)); });
    if (powered(st)) g.lamps.forEach(function (q) { out.push(dItem(streetLampPix(), 1, 17, q.u, q.v)); });
    DIG = null;
    if (tl(st, 'anthropology') >= 3) {
      var list = (VL.vil.plan && VL.vil.plan.list) || [], tp = list.filter(function (it) { return it.type === 'temple'; })[0], occ = occOf(list);
      if (tp) { var cand = [[tp.x - 0.7, tp.y + 1.2], [tp.x + 2.7, tp.y + 1.0], [tp.x + 1.0, tp.y + 2.7], [tp.x + 1.0, tp.y - 0.7]].filter(function (q) { return freeAt(occ, q[0], q[1]); });
        if (cand[0]) { var c0 = cand[0]; out.push(dItem(trenchPix(), 12, 6, c0[0], c0[1]));
          var c1 = [[c0[0] + 0.9, c0[1]], [c0[0], c0[1] + 0.9], [c0[0] - 0.9, c0[1]]].filter(function (q) { return freeAt(occ, q[0], q[1], [{ u: c0[0], v: c0[1] }]); })[0];
          if (c1) { out.push(dItem(W0.variant('market_stall', { ACCENT: 'saffron', MAIN: 'cream', FOLIAGE: E.fol }, { snow: snow }), 8, 13, c1[0], c1[1])); DIG = { u: c1[0], v: c1[1] }; } } }
    }
    return out;
  }
  var baseDecor = W0.decor._orig || W0.decor;
  var decW = function (ctx) { return baseDecor(ctx).concat(e2Decor(ctx)); }; decW._orig = baseDecor; W0.decor = decW;
  function screenNode(n, side) { if (n.pole != null) { var q = GRID.poles[n.pole], g = wp(q.u, q.v); return { p: [round(g[0]) + side * 3, round(g[1]) - 12], k: q.u + q.v + 0.01 }; }
    var g2 = wp(n.u, n.v); return { p: [round(g2[0]) + side * 3, round(g2[1]) - n.z], k: n.k }; }
  function gridAfter(b) {
    var D = VL.depth(); GRID.segs = [];
    GRID.links.forEach(function (lk) {
      [-1, 1].forEach(function (side) { var A = screenNode(lk[0], side), Bq = screenNode(lk[1], side), sag = 2 + round(Math.abs(Bq.p[0] - A.p[0]) / 24);
        wire(b, A.p, Bq.p, sag, R('soot', 3), function (x, y, t) { if (x < 0 || y < 0 || x >= b.w || y >= b.h) return false; var q = y * b.w + x; return !D || D[q] <= A.k + (Bq.k - A.k) * t + 0.3; });
        if (side > 0) GRID.segs.push([A.p, Bq.p, sag]); });
    });
  }
  var baseAfter = W0.after._orig || W0.after;
  var aftW = function (b, ctx) { baseAfter(b, ctx); gridAfter(b, ctx); }; aftW._orig = baseAfter; W0.after = aftW;
  /* night: tier-4 wall lamps and electric street lamps get a 3 px halo (only with a grid); older houses keep their lanterns */
  var baseLights = W0.lights._orig || W0.lights;
  var litW = function () {
    var out = baseLights(), st = VL.vil.st; if (!powered(st)) return out;
    VL.placed().forEach(function (it) { var lp = it.bld && it.bld.pix && it.bld.pix.lamps; if (lp && it.bx != null) lp.forEach(function (l) { out.push([it.bx + l[0], it.by + l[1], 3]); }); });
    GRID.lamps.forEach(function (q) { var g = wp(q.u, q.v); out.push([round(g[0]) + 4, round(g[1]) - 12, 3]); });
    return out;
  };
  litW._orig = baseLights; W0.lights = litW;

  /* static signature: what era2 bakes into the cached static layer */
  var baseSig = VL.signature._orig || VL.signature;
  var sigW = function (st, ctx) { return baseSig(st, ctx) + '|e2:' + [powered(st) ? 1 : 0, deficit(st) ? 1 : 0, tl(st, 'anthropology') >= 3 ? 1 : 0].join(''); };
  sigW._orig = baseSig; VL.signature = sigW;

  /* ---------- 8. live effects at world resolution (depth-tested) ---------- */
  function dset(b, x, y, c, key) { x = round(x); y = round(y); if (x < 0 || y < 0 || x >= b.w || y >= b.h) return; var D = VL.depth(), q = y * b.w + x; if (D && D[q] > key + 0.02) return; b.d[q] = c; }
  function dblit(b, s, x, y, key) { for (var j = 0; j < s.h; j++) for (var i = 0; i < s.w; i++) { var c = s.d[j * s.w + i]; if (c) dset(b, x + i, y + j, c, key); } }
  function sparkAt(b, x, y, f, key) { dblit(b, X.sprite('fx_spark_' + (((f % 3) + 3) % 3)), x - 3, y - 3, key); }
  var BLAST = {};
  function dynE2(b, ctx) {
    var st = ctx.state || {}, t = ctx.t || 0, f8 = floor(t / 125), ex2 = tl(st, 'explosives') >= 2, ent = workers(st, 'entertainer') > 0 && tl(st, 'theatre') >= 3;
    VL.placed().forEach(function (it) {
      var o = it.bld; if (!o || it.bx == null) return;
      var key = keyOf(it), bx = it.bx, by = it.by, E = o.e2 || {}, act = VL.active(st, it.type);
      if (o.e2glow && o.e2glow.length) { var tone = [1, 0, 2][floor(t / 333) % 3]; o.e2glow.forEach(function (g) { for (var i = 0; i < (g[2] || 1); i++) dset(b, bx + g[0] + i, by + g[1], R('ember', (tone + i) % 3), key); }); }
      if (E.belt) stones(function (x, y, c) { dset(b, bx + x, by + y, c, key); }, E.belt[0], E.belt[1], act && E.on !== false ? floor(t / 166) : 0, E.ore || 'river');
      if (it.type === 'warehouse' && E.beamA) {
        var per = 8000 + ih(it.k, 7, 965) * 4000, ph = (t % per) / per, ps = ph < 0.5 ? ph * 2 : 2 - ph * 2; ps = ps * ps * (3 - 2 * ps);
        var tx = round(E.beamA[0] + (E.beamB[0] - E.beamA[0]) * ps), ty = round(E.beamA[1] + (E.beamB[1] - E.beamA[1]) * ps), hy = ty + 10 + round(Math.sin(t / 900 + it.k) * 2);
        dblit(b, X.sprite('sig_gantry_trolley'), bx + tx - 4, by + ty - 5, key + 0.01);
        for (var yy = ty + 1; yy < hy; yy++) dset(b, bx + tx, by + yy, R('soot', 2), key + 0.01);
        dblit(b, X.sprite('sig_hook_block'), bx + tx - 2, by + hy, key + 0.01);
      }
      if (it.type === 'smelter' && E.tip && E.mouth) {
        /* wider spark shower from the tipped mouth, and an ember pool on the ground below it */
        for (var s = 0; s < 6; s++) { var dx = round((ih(s, f8, 966) - 0.25) * 22), dy = round(ih(f8, s, 967) * 16) - 5; sparkAt(b, bx + E.mouth[0] + dx, by + E.mouth[1] + dy, f8 + s, key + 0.01); }
        if (E.pour) for (var gq = -3; gq <= 3; gq++) dset(b, bx + E.pour[0] + gq, by + E.pour[1] + (Math.abs(gq) > 2 ? 0 : 1) - 1, R('ember', (Math.abs(gq) + floor(t / 200)) % 3), key + 0.01);
      }
      if (it.type === 'wardenclyffe' && E.torus && E.lit && ih(floor(t / 400), it.k, 968) < 0.55 + (E2X.arc ? 0.35 : 0)) {
        for (var a = 0; a < 1 + (f8 % 2) + (E2X.arc ? 2 : 0); a++) sparkAt(b, bx + E.torus[0] + round((ih(f8, a, 969) - 0.5) * (E2X.arc ? 30 : 18)), by + E.torus[1] + round((ih(a, f8, 970) - 0.5) * (E2X.arc ? 14 : 8)), f8 + a, key + 0.01);
      }
      if (E.tip && it.type === 'wardenclyffe' && X.OPT.night && floor(t / 500) % 2) { dset(b, bx + E.tip[0], by + E.tip[1], R('ember', 2), key + 0.01); dset(b, bx + E.tip[0] - 1, by + E.tip[1], R('ember', 3), key + 0.01); dset(b, bx + E.tip[0], by + E.tip[1] - 1, R('ember', 3), key + 0.01); }
      if (it.type === 'amphitheatre' && ent && ih(floor(t / 500), it.k, 971) < 0.5) { var cx = bx + o.ox, cy = by + o.oy - 8; sparkAt(b, cx - 6 + (f8 % 3) * 6, cy - (f8 % 2) * 2, f8, key + 0.01); }
      if (ex2 && E.blast && (it.type === 'mine' || it.type === 'coal_mine' || it.type === 'rock_quarry')) {
        var cyc = 20000 + ih(it.k, it.type.length, 972) * 20000, off = ih(it.k, 3, 973) * cyc, ph2 = (t + off) % cyc, idx = floor((t + off) / cyc), bk = it.type + it.k, bs = E2X.blast || 1, bxr = round(8 * bs), byr = round(5 * bs);
        if (ph2 < 125) for (var yy2 = -byr; yy2 <= byr; yy2++) for (var xx2 = -bxr; xx2 <= bxr; xx2++) if (xx2 * xx2 / (bxr * bxr) + yy2 * yy2 / (byr * byr) <= 1) dset(b, bx + E.blast[0] + xx2, by + E.blast[1] + yy2, X.pal().spark, key + 0.5);
        if (BLAST[bk] !== idx && ph2 < 600) { BLAST[bk] = idx; VL.burst(bx + E.blast[0], by + E.blast[1], 'dust', round(14 * bs)); VL.burst(bx + E.blast[0], by + E.blast[1] - 4, 'dust', round(8 * bs)); }
      }
    });
    if (deficit(st) && GRID.segs.length) { var ph3 = t % 1700, sg = GRID.segs[floor(t / 1700) % GRID.segs.length]; if (ph3 < 320) { var m = sagPt(sg[0], sg[1], sg[2], 0.3 + ih(floor(t / 1700), 1, 974) * 0.4); b.blit(X.sprite('fx_spark_' + (f8 % 3)), m[0] - 3, m[1] - 3); } }
  }
  var baseDyn = VL.drawDynamic._orig || VL.drawDynamic;
  var dynW = function (b, ctx) { baseDyn(b, ctx); dynE2(b, ctx); }; dynW._orig = baseDyn; VL.drawDynamic = dynW;

  /* ---------- 9. citizens: worker layers, spy, drill (native resolution) ---------- */
  CZ.JOB.spy = { a: 'spy', work: 'idle', at: 'plaza', always: true };
  CZ.ARCH.spy = { body: 'tunic', outfit: 'driftwood', trous: 'soot', belt: 'walnut' };
  var NOCAP = { soldier: 1, raider: 1, priest: 1, banker: 1, professor: 1, scientist: 1, entertainer: 1, spy: 1, protester: 1 };
  var OVER = { miner: 1, coal_miner: 1, quarry_worker: 1, craftsman: 1, cement_worker: 1 };
  SK.citE2 = function (c, st, s) {
    var e = '';
    if (tl(st, 'high_tech') >= 2 && !NOCAP[c.job]) {
      if (ih(c.ji | 0, c.i | 0, 911) < 0.4) e += 'c';
      if (OVER[c.job]) e += 'o';
      if (s && s.mode === 'walk' && !c.carry && ih(c.i | 0, c.ji | 0, 913) < 0.2) e += 'k';
    }
    if (tl(st, 'pickaxe') >= 4 && (c.job === 'miner' || c.job === 'coal_miner')) e += 'j';
    return e;
  };
  function drawCit(B2, pix, gx, gy, flip, d, K, lift) {
    var D = VL.depth(), W = B2.w, Hh = B2.h, ox = gx - CZ.AX, oy = gy - CZ.AY - (lift | 0), dep = function (x, y) { return D ? D[((y / K) | 0) * WW + ((x / K) | 0)] : -1e9; };
    for (var k = -3; k <= 2; k++) { var qx = gx + k, qy = gy + 1; if (qx < 0 || qy < 0 || qx >= W || qy >= Hh) continue; if (dep(qx, qy) <= d) B2.d[qy * W + qx] = X.shift(B2.d[qy * W + qx], 1); }
    for (var j = 0; j < pix.h; j++) { var ty = oy + j; if (ty < 0 || ty >= Hh) continue;
      for (var i = 0; i < pix.w; i++) { var col = pix.d[j * pix.w + i]; if (!col) continue; var tx = ox + (flip ? pix.w - 1 - i : i); if (tx < 0 || tx >= W || dep(tx, ty) > d) continue; B2.d[ty * W + tx] = col; } }
  }
  /* drill routine: run the sand track, jump the wall, pause, walk back on the grass lane */
  function drillState(i, t, lane2) {
    var C = 7000, ph = ((t + i * 2300) % C) / 1000;
    if (lane2) { var u2 = 0.35 + (ph / 7) * 1.5, lift2 = 0; [0.7, 1.1, 1.5].forEach(function (hu) { var q = (u2 - hu + 0.1) / 0.2; if (q > 0 && q < 1) lift2 = round(Math.sin(q * PI) * 6); }); return { u: u2, v: 0.79, mode: 'walk', f: floor(t / 110), flip: false, back: false, lift: lift2 }; }
    if (ph < 2.4) { var u = 0.2 + ph / 2.4 * 1.65, q2 = (u - 0.86) / 0.28; return { u: u, v: 0.52, mode: 'walk', f: floor(t / 90), flip: false, back: false, lift: q2 > 0 && q2 < 1 ? round(Math.sin(q2 * PI) * 10) : 0 }; }
    if (ph < 3.4) return { u: 1.85, v: 0.52, mode: 'idle', f: floor(t / 500), flip: true, back: false, lift: 0 };
    if (ph < 6.4) return { u: 1.85 - (ph - 3.4) / 3 * 1.65, v: 0.34, mode: 'walk', f: floor(t / 150), flip: true, back: true, lift: 0 };
    return { u: 0.2, v: 0.4, mode: 'idle', f: floor(t / 500), flip: false, back: false, lift: 0 };
  }
  function actorsE2(B2, ctx, K) {
    var st = ctx.state || {}, t = ctx.t || 0, mo = { military: tl(st, 'military'), armor: tl(st, 'armor') };
    VL.placed().forEach(function (it) {
      if (it.type === 'boot_camp' && it.bld) {
        var lane2 = it.bld.e2 && it.bld.e2.spy, n = 3 + (lane2 ? 1 : 0), key = keyOf(it) + 0.05;
        for (var i = 0; i < n; i++) { var s = drillState(i, t, lane2 && i === 3), g = wp(it.x + s.u, it.y + s.v);
          drawCit(B2, CZ.compose('soldier', 60 + i, s.mode, s.f, Object.assign({ back: s.back }, mo)), round(g[0] * K), round(g[1] * K), s.flip, key, K, s.lift); }
      }
      if (CONSUMER[it.type] && deficit(st) && it.bld && it.bld.e2 && !it.bld.e2.lit && it.bx != null) {
        var r = it.bld.roof || [0, 0]; B2.blit(X.sprite('ic_power'), round((it.bx + r[0]) * K) - 8, round((it.by + r[1]) * K) - 22 - (floor(t / 500) % 2));
      }
    });
    if (DIG) { var gd = wp(DIG.u, DIG.v); B2.blit(X.sprite('ic_coin'), round(gd[0] * K) - 8, round(gd[1] * K) - 46); }
    /* the spy: at most one, a few seconds, out of a building's shadow and back into it */
    if (tl(st, 'spy') >= 2) {
      var per = 26000, idx = floor(t / per), ph = t % per;
      if (ph < 6500) {
        var L2 = VL.placed().filter(function (q) { return q.fw * q.fd >= 2 && q.bld && !q.bld.noShadow; });
        if (L2.length) { var b0 = L2[floor(ih(idx, 5, 975) * L2.length) % L2.length], u0 = b0.x + b0.fw + 0.3, v0 = b0.y + 0.3, s2;
          if (ph < 2000) s2 = { v: v0 + ph / 2000, mode: 'walk', back: false, flip: true };
          else if (ph < 4500) s2 = { v: v0 + 1, mode: 'idle', back: false, flip: floor(ph / 900) % 2 === 0 };
          else s2 = { v: v0 + 1 - (ph - 4500) / 2000, mode: 'walk', back: true, flip: false };
          var g2 = wp(u0, s2.v); if (u0 < N && s2.v < N) drawCit(B2, CZ.compose('spy', idx % 7, s2.mode, floor(t / (s2.mode === 'walk' ? 125 : 500)), { back: s2.back, e2: 'fs' }), round(g2[0] * K), round(g2[1] * K), s2.flip, u0 + s2.v, K, 0); }
      }
    }
  }
  var baseAct = VL.drawActors._orig || VL.drawActors;
  var actW = function (B2, ctx, k) { baseAct(B2, ctx, k); actorsE2(B2, ctx, k); }; actW._orig = baseAct; VL.drawActors = actW;

  /* ---------- 10. fakeState gains the Era 2 keys ---------- */
  var TECH2 = ['high_tech', 'steel_container', 'container', 'storage', 'smelting', 'mine_conveyor', 'explosives', 'pickaxe', 'axe', 'foundry', 'theatre', 'trade', 'broadcast', 'spy', 'fanaticism', 'anthropology'];
  var baseFake = G.SpriteKit.fakeState._orig || G.SpriteKit.fakeState;
  var fakeW = function (mode) { var s = baseFake(mode); if (mode === 'protoplasm' || !s || !s.city) return s;
    TECH2.forEach(function (k) { if (s.tech[k] == null) s.tech[k] = 0; }); NEW.forEach(function (b) { s.city[b[0]] = s.city[b[0]] || { count: 0, on: 0 }; });
    s.city.powered = false; s.city.power = 0; s.city.power_total = 0; return s; };
  fakeW._orig = baseFake; G.SpriteKit.fakeState = fakeW;

  /* ---------- 11. atelier sheets, samples, checks ---------- */
  function pv(type, tier, k, season, o, lvl) {
    var b = VL.building(type, tier, k, season, lvl || 0, o), S = X.SEASONS[season], gr = season === 3 ? 'snow' : S.grass, fw = b.fw || 1, fd = b.fd || 1, p = new Pix(b.pix.w, b.pix.h + 10);
    var Pg = function (u, v) { return [b.ox + (u - v) * 16, b.oy + (u + v) * 8]; };
    X.fillPoly(p, [Pg(-0.5, -0.5), Pg(fw + 0.5, -0.5), Pg(fw + 0.5, fd + 0.5), Pg(-0.5, fd + 0.5)], function () { return R(gr, season === 3 ? 0 : 1); });
    if (!b.noShadow) { var Ls = round(Math.max(0.3, b.h / 26) * S.shadow * 8) / 8; X.fillPoly(p, [Pg(0, 0), Pg(fw + Ls, 0), Pg(fw + Ls, fd), Pg(0, fd)], function (px, py) { return X.shift(p.get(px, py), 1); }); }
    p.blit(b.pix, 0, 0); var c = H.crop(p, 2); c.src = b; return c;
  }
  function rowP(ps, gap) { var w = 0, h = 0; ps.forEach(function (q) { w += q.w + gap; h = Math.max(h, q.h); }); var o = new Pix(Math.max(1, w - gap), h), x = 0; ps.forEach(function (q) { o.blit(q, x, h - q.h); x += q.w + gap; }); return o; }
  function newK(type) { for (var k = 0; k < 12; k++) if (VL.typeTier(type, 4, k) === 4) return k; return 0; }
  function sheetBuildings(season) {
    var out = [];
    [0, 1, 2].forEach(function (k) { out.push({ label: 'Apartment · variant ' + (k + 1) + ' · lit', pix: pv('apartment', 4, k, season, { on: true, e2: 'L' }) }); });
    out.push({ label: 'Apartment · dark (unpowered)', pix: pv('apartment', 4, 0, season, { on: true, e2: 'd' }) });
    [[0.2, '-', 'low fill'], [0.5, '-', 'mid fill'], [0.9, 'G', 'full · gantry (steel_container ≥ 2)']].forEach(function (q) { out.push({ label: 'Container Port · ' + q[2], pix: pv('warehouse', 4, 0, season, { on: true, fq: q[0], e2: q[1] }) }); });
    out.push({ label: 'Wardenclyffe · lit', pix: pv('wardenclyffe', 4, 0, season, { on: true, e2: 'L' }) }, { label: 'Wardenclyffe · radio mast (broadcast ≥ 1)', pix: pv('wardenclyffe', 4, 0, season, { on: true, e2: 'LR' }) });
    out.push({ label: 'Coal Powerplant · running', pix: pv('coal_power', 4, 0, season, { on: true }) }, { label: 'Coal Powerplant · variant 2 · cold', pix: pv('coal_power', 4, 1, season, { on: false }) });
    out.push({ label: 'Boot Camp', pix: pv('boot_camp', 4, 0, season, { on: true, e2: '-' }) }, { label: 'Boot Camp · second course (spy ≥ 3)', pix: pv('boot_camp', 4, 1, season, { on: true, e2: 'S' }) });
    return out;
  }
  var ERA1T = ['basic_housing', 'cottage', 'lodge', 'smokehouse', 'farm', 'compost', 'silo', 'mill', 'shed', 'storage_yard', 'lumber_yard', 'sawmill', 'rock_quarry', 'mine', 'coal_mine',
    'foundry', 'smelter', 'cement_plant', 'metal_refinery', 'trade', 'bank', 'library', 'university', 'temple', 'amphitheatre', 'garrison', 'hospital'];
  function preOpts(t) { return VL.DYN[t] ? { af: 0, fq: 0.7, metal: 'steel', on: true } : undefined; }
  function sheetTiers(season) { var NAME = {}; X.BUILDINGS.forEach(function (b) { NAME[b.key] = b.name; });
    return ERA1T.map(function (t) { var k = newK(t); return { label: NAME[t] + ' · P3 → P4' + (t === 'mill' ? ' (mill unchanged)' : ''), pix: rowP([pv(t, 3, k, season, preOpts(t)), pv(t, 4, k, season, preOpts(t))], 8) }; }); }
  var MODS = [['shed', 'B', 'storage ≥ 3 · barn'], ['storage_yard', 'C0', 'container ≥ 3 · crane (jib 1/4)'], ['storage_yard', 'C2', 'crane (jib 3/4)'], ['smelter', 'F', 'smelting ≥ 3 · blast furnace'],
    ['smelter', 'FV', 'smelting ≥ 4 · Bessemer upright'], ['smelter', 'FVt', 'Bessemer tipping'], ['rock_quarry', 'KT', 'conveyor + TNT'], ['mine', 'KT', 'mine_conveyor ≥ 1 + explosives ≥ 1'],
    ['mine', 'KHT', 'tier 4 · steel headframe'], ['coal_mine', 'KHT', 'coal mine · steel headframe'], ['foundry', 'K3', 'foundry ≥ 6 · kiln + brick pallets'], ['trade', 'Dmsf', 'trade ≥ 2 · foreign flags'], ['temple', 'M', 'fanaticism ≥ 3 · mission banners']];
  function sheetMods(season) {
    return MODS.map(function (m) { var t4 = m[1].indexOf('H') >= 0 ? 4 : 3, o0 = preOpts(m[0]) || {}, o1 = Object.assign({}, o0, { e2: m[1] }), k = newK(m[0]);
      return { label: m[0] + ' · ' + m[2], pix: rowP([pv(m[0], t4, k, season, o0), pv(m[0], t4, k, season, o1)], 8) }; });
  }
  /* tone shift for the night preview: ember and gold keep their tones, lamp halos lose one step less */
  function nightOf(src, lamps) {
    var o = new Pix(src.w, src.h), rev = X.pal().rev;
    for (var y = 0; y < src.h; y++) for (var x = 0; x < src.w; x++) { var c = src.d[y * src.w + x]; if (!c) continue; var e = rev.get(c), lit = lamps.some(function (l) { var dx = (x - l[0]) / 6, dy = (y - l[1]) / 3; return dx * dx + dy * dy <= 1; });
      o.d[y * o.w + x] = !e || e[0] === 'ember' || e[0] === 'gold' ? c : R(e[0], Math.min(4, e[1] + (lit ? 2 : 3))); }
    return o;
  }
  var GSC = new Map();
  function gridSheet(mode, t, season) {
    t = t || 0; season = season == null ? 1 : season;
    var ck = mode + season + '|' + (mode === 'deficit' ? (floor(t / 100) % 3) + '.' + (floor(t / 500) % 2) : ''); if (GSC.has(ck)) return GSC.get(ck);
    var res = gridSheet0(mode, t, season); GSC.set(ck, res); if (GSC.size > 40) GSC.delete(GSC.keys().next().value); return res;
  }
  function gridSheet0(mode, t, season) {
    var plant = pv('coal_power', 4, 0, season, { on: true }), lit = mode !== 'deficit', ap = pv('apartment', 4, 1, season, { on: true, e2: lit ? 'L' : 'd' }), wc = pv('wardenclyffe', 4, 0, season, { on: true, e2: lit ? 'L' : 'd' });
    var gap = 34, hh = Math.max(plant.h, ap.h, wc.h) + 26, p = new Pix(plant.w + ap.w + wc.w + gap * 2 + 8, hh), base = hh - 6, pole = polePix(), lamps = [];
    var xs = [0, plant.w + gap, plant.w + gap + ap.w + gap];
    p.blit(plant, xs[0], base - plant.h + 6); p.blit(ap, xs[1], base - ap.h + 6); p.blit(wc, xs[2], base - wc.h + 6);
    var polesX = [plant.w + 12, plant.w + gap + ap.w + 12], anchors = [[xs[0] + plant.w - 34, base - 30], [xs[1] + 22, base - 26], [xs[2] + 24, base - 18]];
    polesX.forEach(function (x) { p.blit(pole, x - 3, base - 13); });
    var pts = [anchors[0], [polesX[0], base - 12], anchors[1], null, [polesX[1], base - 12], anchors[2]];
    [[0, 1], [1, 2], [4, 5]].forEach(function (q) { [-3, 3].forEach(function (s) { wire(p, [pts[q[0]][0] + s, pts[q[0]][1]], [pts[q[1]][0] + s, pts[q[1]][1]], 3, R('soot', 3)); }); });
    wire(p, [anchors[1][0] + 3, anchors[1][1]], [polesX[1] + 3, base - 12], 3, R('soot', 3)); wire(p, [anchors[1][0] - 3, anchors[1][1]], [polesX[1] - 3, base - 12], 3, R('soot', 3));
    if (mode === 'deficit') { var m = sagPt([polesX[0], base - 12], anchors[1], 3, 0.5); p.blit(X.sprite('fx_spark_' + (floor(t / 100) % 3)), m[0] - 3, m[1] - 3);
      [[xs[1] + ap.w / 2, base - ap.h + 2], [xs[2] + wc.w / 2, base - wc.h + 18]].forEach(function (q) { var ic = X.sprite('ic_power'), s2 = new Pix(8, 8); for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) s2.d[y * 8 + x] = ic.d[(y * 2) * 16 + x * 2]; p.blit(s2, round(q[0]) - 4, round(q[1]) - 6 - (floor(t / 500) % 2)); }); }
    if (mode === 'night') { [plant, ap, wc].forEach(function (q, i) { (q.src.pix.lamps || []).forEach(function (l) { lamps.push([xs[i] + l[0] - q.ox0, base - q.h + 6 + l[1] - q.oy0]); }); }); return nightOf(p, lamps); }
    return p;
  }
  function citizenSheet(t) {
    t = t || 0; var cells = [['farmer', 'walk', 'c', 'flat cap'], ['miner', 'work', 'o', 'overalls'], ['miner', 'work', 'oj', 'jackhammer'], ['coal_miner', 'work', 'coj', 'cap + overalls + jackhammer'],
      ['craftsman', 'walk', 'ok', 'cable coil'], ['craftsman', 'work', 'co', 'smelter worker'], ['spy', 'idle', 'fs', 'spy (fedora + trench coat)'], ['spy', 'walk', 'fs', 'spy walking'], ['soldier', 'walk', '', 'drill · run'], ['soldier', 'idle', '', 'drill · pause']];
    var cw = 30, p = new Pix(cells.length * cw + 4, 36);
    cells.forEach(function (q, i) { var f = floor((t + i * 97) / (q[1] === 'walk' ? 125 : 333)), pix = CZ.compose(q[0], i, q[1], f, { pickaxe: 4, axe: 4, e2: q[2] }), gx = i * cw + 15, gy = 32, sh = q[2].indexOf('j') >= 0 && q[1] === 'work' ? floor(t / 83) & 1 : 0, lift = i === 8 ? round(Math.max(0, Math.sin(t / 300)) * 6) : 0;
      for (var k = -3; k <= 2; k++) p.set(gx + k, gy + 1, R('dirt', 2)); p.blit(pix, gx - CZ.AX + sh, gy - CZ.AY - lift); });
    p.labels = cells.map(function (q, i) { return (i + 1) + ' ' + q[3]; }); return p;
  }
  function trussTest() {
    var p = new Pix(120, 60); for (var y = 0; y < 60; y++) for (var x = 0; x < 120; x++) p.d[y * 120 + x] = R('sky', 1);
    truss(p, [6, 56], [6, 6], 2, 'oxide', { dir: 'v' }); truss(p, [16, 56], [16, 6], 3, 'oxide', { dir: 'v' }); truss(p, [28, 56], [28, 6], 4, 'oxide', { dir: 'v' });
    truss(p, [40, 20], [112, 10], 3, 'oxide', { dir: 'h' }); truss(p, [40, 40], [112, 52], 3, 'iron', { dir: 'h' }); wire(p, [40, 30], [112, 28], 4, R('soot', 3));
    conveyor(p, [44, 58], [80, 40], { za: 2, zb: 14 }); return p;
  }
  function samples() {
    var out = [];
    sheetBuildings(1).concat(sheetBuildings(3)).forEach(function (s) { out.push({ label: 'era2 ' + s.label, pix: s.pix }); });
    sheetMods(1).forEach(function (s) { out.push({ label: 'era2 mod ' + s.label, pix: s.pix }); });
    ERA1T.forEach(function (t) { [1, 3].forEach(function (s) { out.push({ label: 'era2 P4 ' + t + ' s' + s, pix: VL.building(t, 4, newK(t), s, 2, preOpts(t)).pix }); }); });
    out.push({ label: 'era2 grid surplus', pix: gridSheet('surplus') }, { label: 'era2 grid deficit', pix: gridSheet('deficit') }, { label: 'era2 grid night', pix: gridSheet('night') }, { label: 'era2 citizens', pix: citizenSheet(0) }, { label: 'era2 truss', pix: trussTest() });
    return out;
  }
  var baseS = VL.samples._orig || VL.samples;
  var samW = function () { return (baseS ? baseS() : []).concat(samples()); }; samW._orig = baseS; VL.samples = samW;
  function check(issues, notes) {
    var n = Object.keys(P).filter(function (k) { return P[k].b10; }).length; if (n !== 30) issues.push('era2: ' + n + ' batch-10 pieces, expected 30');
    var bad = 0; NEW.forEach(function (b) { [0, 1, 2].forEach(function (k) { [1, 3].forEach(function (s) { try { VL.building(b[0], 4, k, s, 0, VL.DYN[b[0]] ? VL.DYN[b[0]]({}, 0, { k: k, type: b[0] }) : undefined); } catch (e) { bad++; issues.push('era2: ' + b[0] + ' k' + k + ' s' + s + ' threw ' + e.message); } }); }); });
    try { var empty = {}; VL.signature(empty, { t: 0 }); litFor(empty, 'apartment', { k: 0 }); SK.citE2({ job: 'miner', ji: 0, i: 0 }, empty, null); } catch (e2) { issues.push('era2: empty state threw ' + e2.message); }
    notes.push('era2: 30 pieces (31 images), 5 buildings × 3 variants composed' + (bad ? ' with ' + bad + ' failure(s)' : '') + '; truss: 1 px chords, 3 px gauge (headframe, conveyor, jibs), 2 px legs, 4 px crane mast');
  }

  SK.era2 = { truss: truss, wire: wire, conveyor: conveyor, rails: rails, grid: function () { return GRID; }, gridSheet: gridSheet, sheetBuildings: sheetBuildings, sheetTiers: sheetTiers, sheetMods: sheetMods,
    citizenSheet: citizenSheet, trussTest: trussTest, pv: pv, NEW: NEW, TECH2: TECH2, check: check, litFor: litFor, grow: grow, PgO: PgO, putOn: putOn, ring: ring, faceSpr: faceSpr, frameOf: frameOf, mod: mod, dyn: dyn, dset: dset, dblit: dblit,
    polePix: polePix, rowP: rowP, nightOf: nightOf, keyOf: keyOf, occOf: occOf, freeAt: freeAt, dItem: dItem, drawCit: drawCit, sagPt: sagPt };
  }
})(window);
