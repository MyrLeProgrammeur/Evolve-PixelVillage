/* Evolve village sprite kit — Era 3 · industrialization (Batches 15-19 logic).
   The industrial zone on the east edge (factory, oil field, fuel depot, oil powerplant), the wharf on the pond, the railway along the
   east edge with its freight train, level crossing, plate-girder bridge and freight-yard siding, the steam barge and its dockers,
   H.tank / H.kiln / H.train, the producer / consumer hook into the Era 2 grid, state-driven modifiers on existing buildings,
   titanium tools and steel helmets. Registers through the same SK._ext hook; load it last, after era2.js. Never throws on missing fields. */
(function (G) {
  'use strict';
  var SK = G.SK = G.SK || {};
  SK._ext = (SK._ext || []).filter(function (e) { return e.id !== 'era3'; });
  SK._ext.push({ id: 'era3', fn: reg });
  if (SK._runExt) SK._runExt();
  function reg() {
  if (!SK.era2 || !SK.era2.grow || !SK.PARTS || !SK.PARTS.b11 || !SK.village || !SK.village.B3 || !SK.citizens || !SK.citizens.CARRY || !SK.world || !G.SpriteKit) return false;
  var X = G.SpriteKit._, R = X.R, Pix = X.Pix, P = SK.PIECES, VL = SK.village, H = VL.H, B = VL.B3, W0 = SK.world, CZ = SK.citizens, E2 = SK.era2;
  var floor = Math.floor, round = Math.round, PI = Math.PI, N = X.MAPN, wp = X.worldPt, ih = X.ih, dset = E2.dset, dblit = E2.dblit;

  /* ---------- defensive reads ---------- */
  function tech(st) { return (st && st.tech) || {}; }
  function city(st) { return (st && st.city) || {}; }
  function tl(st, k) { var v = tech(st)[k]; return typeof v === 'number' && isFinite(v) ? v | 0 : 0; }
  function cnt(st, k) { var b = city(st)[k]; return b && typeof b === 'object' ? Math.max(0, b.count | 0) : 0; }
  function fld(st, k, f) { var b = city(st)[k]; var v = b && typeof b === 'object' ? b[f] : 0; return typeof v === 'number' && isFinite(v) ? Math.max(0, v | 0) : 0; }
  function powered(st) { return !!city(st).powered; }
  function L(p, a, b, col) { X.line(a[0], a[1], b[0], b[1], function (x, y) { p.set(x, y, col); }); }
  function per(type) { return (((VL.vil.plan || {}).per || {})[type] || {}).v || 0; }

  /* ---------- 1. buildings, lots, zone ---------- */
  var NEW = [['factory', 'Factory', 'industry', 3, 2, 40, 2], ['oil_well', 'Oil Derrick', 'industry', 1, 1, 50, 4], ['oil_depot', 'Fuel Depot', 'industry', 2, 1, 24, 1],
    ['oil_power', 'Oil Powerplant', 'industry', 2, 2, 50, 1], ['wharf', 'Wharf', 'commerce', 2, 1, 8, 1]];
  NEW.forEach(function (b) {
    if (!X.BUILDINGS.some(function (q) { return q.key === b[0]; })) X.BUILDINGS.push({ key: b[0], name: b[1], sector: b[2], fw: b[3], fd: b[4], h: b[5] });
    VL.CFG[b[0]] = [b[2], b[6]]; if (VL.ORDER.indexOf(b[0]) < 0) VL.ORDER.push(b[0]);
  });
  var NEWK = {}; NEW.forEach(function (b) { NEWK[b[0]] = 1; });
  /* industrial zone: the east band x >= 20 along the railway (y 0..23) plus the north-east corner x >= 19, y <= 2 (~10 % of the map), only on tiles
     no older slot uses; the oil field sits in the north-east corner, away from the pond, every derrick a free tile from the next */
  var ZONE = { x0: 19, y0: 0, x1: 24, y1: 24 };
  var LOTS = { factory: [{ x: 21, y: 12 }, { x: 20, y: 22 }], oil_well: [{ x: 22, y: 7 }, { x: 20, y: 2 }, { x: 22, y: 0 }, { x: 19, y: 0 }],
    oil_depot: [{ x: 21, y: 4 }], oil_power: [{ x: 22, y: 18 }], wharf: [{ x: 19, y: 16 }] };
  var YARD = { x: 22, y: 10 }, BASEYARD = null, FLARE = { u: 20.45, v: 22.15 };
  /* railway: main line along v at u = RU (just past the east edge), siding along the railside freight yard */
  var RU = 24.75, SU = 24.2, V0 = -3.2, V1 = 29.6, SID = { a: 10.15, b: 10.7, c: 12.9 }, STOPV = 11.0;
  var ON = { rail: false, siding: false, e3: false };
  function wellVis(n) { return n <= 0 ? 0 : Math.min(4, Math.max(2, Math.ceil(Math.sqrt(n * 1.6)))); }
  function e3Active(st) { return tl(st, 'high_tech') >= 3 || NEW.some(function (b) { return cnt(st, b[0]) > 0; }); }
  function railOn(st) { return tl(st, 'high_tech') >= 3 && (X.OPT.surround || 'open') !== 'off'; }
  function patchSlots(st) {
    var S = VL.slots(); if (!S) return;
    if (!BASEYARD) BASEYARD = (S.storage_yard || []).filter(function (s) { return s !== YARD; });
    var act = e3Active(st);
    Object.keys(LOTS).forEach(function (t) { S[t] = act ? LOTS[t] : []; });
    S.storage_yard = railOn(st) ? [YARD].concat(BASEYARD) : BASEYARD;
  }
  function liveState(st) {
    if (!st || !st.city || !st.city.oil_well) return st;
    var n = cnt(st, 'oil_well'), c = Object.assign({}, st.city); c.oil_well = Object.assign({}, st.city.oil_well, { count: wellVis(n), _n: n });
    return Object.assign({}, st, { city: c });
  }
  var baseUpd = VL.update;
  var updW = function (st, t, opt) {
    patchSlots(st); ON.e3 = e3Active(st); ON.rail = railOn(st);
    E2X.blast = tl(st, 'explosives') >= 3 ? 1.5 : 1; E2X.arc = tl(st, 'science') >= 7 ? 1 : 0;
    var r = baseUpd(liveState(st), t, opt);
    ON.siding = ON.rail && tl(st, 'trade') >= 3 && per('storage_yard') > 0;
    return r;
  };
  updW._orig = baseUpd; VL.update = updW;
  var E2X = SK.E2X = SK.E2X || { blast: 1, arc: 0 };
  /* grid: the factory consumes, the oil powerplant produces */
  SK.E2_CONSUMER = SK.E2_CONSUMER || {}; SK.E2_CONSUMER.factory = 1;
  SK.E2_SOURCE = SK.E2_SOURCE || {}; SK.E2_SOURCE.oil_power = 1;

  /* ---------- 2. code helpers: tank, kiln, derrick, train ---------- */
  /* vertical riveted cylinder, low conical roof, caged ladder up the right side; c = ground centre, r in tiles */
  function tank(p, c, r, h, ramp, o) {
    o = o || {}; var rx = Math.max(3, round(r * 22.6)), ry = Math.max(2, round(r * 11.3)), rh = o.roof == null ? Math.max(2, round(rx / 3)) : o.roof, cx = round(c[0]), cy = round(c[1]);
    for (var dx = -rx; dx < rx; dx++) {
      var t = (dx + 0.5) / rx, e = Math.sqrt(Math.max(0, 1 - t * t)), yb = cy + round(ry * e), yt = cy - h + round(ry * e), yr = cy - h - round(rh * (1 - Math.abs(t))) - round(ry * e * 0.5);
      var off = t < -0.35 ? 0 : t < 0.45 ? 1 : 2;
      for (var y = yt; y <= yb; y++) p.set(cx + dx, y, y === yb || t > 0.88 ? R(ramp, 3) : X.texC('tex_rivetplate', cx + dx, y, ramp, off));
      for (y = yr; y < yt; y++) p.set(cx + dx, y, y === yr ? R(ramp, t < 0 ? 1 : 2) : R(ramp, t < -0.2 ? 0 : t < 0.4 ? 1 : 2));
      if (o.snow) p.set(cx + dx, yr, R('snow', 1));
    }
    var lx = cx + round(rx * 0.5), lad = X.sprite('ladder_cage', o.ladder ? { METAL: o.ladder } : null);
    for (var ly = cy + round(ry * 0.85) - lad.h; ly > cy - h + 1 - lad.h; ly -= lad.h) p.blit(lad, lx - 2, ly);
    return { top: [cx, cy - h - rh], rx: rx, ry: ry, cx: cx, cy: cy };
  }
  /* inclined rotary kiln between two screen points (a lower, b higher), radius r px; ring and drive gear at two thirds */
  function kiln(p, a, b, r, o) {
    o = o || {}; var ramp = o.ramp || 'rust', n = Math.max(1, round(Math.abs(b[0] - a[0]))), gy = o.ground;
    if (gy) [0.2, 0.55, 0.9].forEach(function (q) { var x = round(a[0] + (b[0] - a[0]) * q), y = round(a[1] + (b[1] - a[1]) * q) + r, g0 = round(gy[0] + (gy[1] - gy[0]) * q);
      for (var yy = y; yy <= g0; yy++) { p.set(x - 1, yy, R('river', 1)); p.set(x, yy, R('river', 2)); p.set(x + 1, yy, R('river', 3)); } });
    for (var i = 0; i <= n; i++) { var x = round(a[0] + (b[0] - a[0]) * i / n), yc = a[1] + (b[1] - a[1]) * i / n;
      for (var dy = -r; dy <= r; dy++) { var q = dy / r, tone = q < -0.45 ? 0 : q < 0.25 ? 1 : q < 0.75 ? 2 : 3; p.set(x, round(yc + dy), (dy === -r || dy === r) ? R(ramp, dy < 0 ? 2 : 3) : R(ramp, tone)); } }
    var hood = [round(a[0]), round(a[1])]; for (var yy = -r - 2; yy <= r + 1; yy++) for (var xx = -4; xx <= 0; xx++) p.set(hood[0] + xx, hood[1] + yy, R('ironbrick', xx < -3 || yy === -r - 2 ? 1 : yy > r - 1 ? 3 : 2));
    var m = [round(a[0] + (b[0] - a[0]) * 0.66), round(a[1] + (b[1] - a[1]) * 0.66)], kd = P.sig_kiln_drum, ks = X.sprite('sig_kiln_drum');
    var sc = r / 6.4; if (sc > 0.8) p.blit(ks, m[0] - kd.anchor[0], m[1] - kd.anchor[1]);
    else for (var dx = -r - 1; dx <= r + 1; dx += 1) { p.set(m[0] + 1, m[1] + dx, R('iron', dx < 0 ? 1 : 3)); p.set(m[0] + 2, m[1] + dx, R('iron', 2)); }
    return { a: a, b: b, r: r, ramp: ramp, m: m };
  }
  function kilnBand(set, K, t) {
    var r = K.r, n = Math.max(1, round(Math.abs(K.b[0] - K.a[0]))), ph = floor(t / 300) % (2 * r - 1), dy = -r + 1 + ph;
    for (var i = 0; i <= n; i++) { var x = round(K.a[0] + (K.b[0] - K.a[0]) * i / n); if (Math.abs(x - K.m[0]) < 4) continue; var yc = K.a[1] + (K.b[1] - K.a[1]) * i / n, q = dy / r, tone = q < -0.45 ? 0 : q < 0.25 ? 1 : q < 0.75 ? 2 : 3;
      set(x, round(yc + dy), R(K.ramp, Math.min(4, tone + 1))); }
  }
  /* lattice derrick: a four-legged pyramid seen corner-on, 11 px wide at the foot and 3 px under the crown block. Two faces show:
     the lit left face (left leg + front leg) and the shaded right face (front leg + right leg), each X-braced per panel with open
     sky between the members; 2 px outer legs on the bottom panel; a plank working platform a third of the way up; the crown block
     with a travelling block hanging under it. Returns the crown top point. */
  function derrick(p, base, h, ramp) {
    var bx = round(base[0]), by = round(base[1]), hw = function (z) { return 5.5 - 4 * z / h; }, dd = function (z) { return 2.5 - 2 * z / h; };
    var Lp = function (z) { return [bx - hw(z), by - z]; }, Rp = function (z) { return [bx + hw(z), by - z]; }, Fp = function (z) { return [bx, by - z + dd(z)]; };
    var ln = function (q, r, col) { L(p, [round(q[0]), round(q[1])], [round(r[0]), round(r[1])], col); };
    var Z = [0, 14, 26, 36, h];
    for (var i = 0; i + 1 < Z.length; i++) { var z0 = Z[i], z1 = Z[i + 1];
      ln(Lp(z0), Fp(z1), R(ramp, 2)); ln(Fp(z0), Lp(z1), R(ramp, 2));
      ln(Fp(z0), Rp(z1), R(ramp, 3)); ln(Rp(z0), Fp(z1), R(ramp, 3));
      if (i) { ln(Lp(z0), Fp(z0), R(ramp, 1)); ln(Fp(z0), Rp(z0), R(ramp, 3)); } }
    ln(Lp(0), Lp(h), R(ramp, 1)); ln(Rp(0), Rp(h), R(ramp, 3)); ln(Fp(0), Fp(h), R(ramp, 2));
    ln([Lp(0)[0] + 1, by], [Lp(Z[1])[0] + 1, by - Z[1]], R(ramp, 1)); ln([Rp(0)[0] - 1, by], [Rp(Z[1])[0] - 1, by - Z[1]], R(ramp, 3));
    ln(Lp(h), Rp(h), R(ramp, 2));
    /* sills under the feet */
    [Lp(0), Rp(0), Fp(0)].forEach(function (q) { p.set(round(q[0]) - 1, round(q[1]) + 1, R('walnut', 2)); p.set(round(q[0]), round(q[1]) + 1, R('walnut', 2)); p.set(round(q[0]) + 1, round(q[1]) + 1, R('walnut', 3)); });
    /* working platform at a third of the height: plank deck wider than the tower, hand rail posts at the ends */
    var pz = Z[1], py = by - pz, pw = round(hw(pz)) + 3;
    for (var xx = -pw; xx <= pw; xx++) { var yy = py + round(dd(pz) * (1 - Math.abs(xx) / pw)); p.set(bx + xx, yy - 1, R('walnut', 1)); p.set(bx + xx, yy, R('walnut', xx < 0 ? 2 : 3)); }
    [-pw, pw].forEach(function (x) { for (var k = 2; k <= 4; k++) p.set(bx + x, py - k, R('walnut', x < 0 ? 2 : 3)); }); for (xx = -pw; xx <= -pw + 3; xx++) p.set(bx + xx, py - 4 - 0, R('walnut', 2));
    /* travelling block hanging from the crown */
    for (var z = h - 1; z > h - 8; z--) p.set(bx, by - z, R('iron', 3));
    p.set(bx - 1, by - h + 8, R('saffron', 1)); p.set(bx, by - h + 8, R('saffron', 2)); p.set(bx - 1, by - h + 9, R('saffron', 2)); p.set(bx, by - h + 9, R('saffron', 3)); p.set(bx, by - h + 10, R('iron', 2));
    var cr = P.sig_derrick_crown, top = [bx, round(by - h)]; p.blit(X.sprite('sig_derrick_crown'), top[0] - cr.anchor[0], top[1] - cr.anchor[1]);
    return [bx, top[1] - cr.h];
  }
  function puddle(p, c, rx, ry, seed) {
    for (var y = -ry; y <= ry; y++) for (var x = -rx; x <= rx; x++) { var q = (x * x) / (rx * rx) + (y * y) / (ry * ry) + (ih(x + 9, y + 9, seed) - 0.5) * 0.5; if (q > 1) continue;
      p.set(round(c[0]) + x, round(c[1]) + y, q < 0.25 && x < 0 && y < 0 ? R('crude', 1) : R('crude', q > 0.7 ? 3 : 2)); }
  }
  function snowOr(c, snow, col) { return snow ? R('snow', 1) : col; }

  /* ---------- 3. composers ---------- */
  function flags(o) { var e = (o && o.e2) || '', i = e.indexOf('~'); return i < 0 ? 0 : (+e.slice(i + 1) || 0); }
  function roll(p, x, y, col) { for (var j = 0; j < 3; j++) for (var i = 0; i < 6; i++) { var c = i === 5 ? R(col, j ? 3 : 2) : (i + j) % 3 === 0 ? R('cream', 1) : R(col, j === 0 ? 1 : j === 1 ? 2 : 3); p.set(x + i - (j === 2 ? 0 : 0), y + j - floor(i / 2), c); } }
  function doorOn(p, g, a, z, map, open, glowList) {
    var d = P.door_roller, s = X.sprite('door_roller', map), x0 = H.faceX(g, 'L', a), y0 = H.faceY(g, 'L', a) - z - (d.h - 1), ink = X.pal().ink;
    for (var j = 0; j < s.h; j++) for (var i = 0; i < s.w; i++) { var c = s.d[j * s.w + i]; if (!c) continue;
      var zz = 10 - (j - floor(i / 2)), inner = i > 0 && i < s.w - 1 && zz < 9 && zz >= 0;
      if (open && inner) { c = zz < 3 && glowList ? R('ember', 2) : ink; if (zz < 3 && glowList && glowList.length < 40) glowList.push([x0 + i, y0 + j, 1]); }
      p.set(x0 + i, y0 + j, c); }
  }
  function sign(p, g, a0, len, z0, paint, k) {
    for (var a = a0; a < a0 + len; a++) for (var z = z0; z < z0 + 5; z++) { var x = H.faceX(g, 'L', a), y = H.faceY(g, 'L', a) - z, edge = a === a0 || a === a0 + len - 1 || z === z0 || z === z0 + 4;
      var letter = !edge && z > z0 && z < z0 + 4 && ((a - a0) % 4 !== 3) && ih(a, z, 700 + k) < 0.62; p.set(x, y, edge ? R(paint, 2) : letter ? R(paint, 3) : R('cream', 1)); }
  }
  function factory(type, tier, k, season, lvl, o) {
    var c = B.C(type, 4, k, season, lvl), v = c.v, e2 = o.e2 || '', st = e2.charAt(0) || 'I', lit = e2.indexOf('p') >= 0, open = st !== 'I';
    var F = B.frame(3, 2, 70 + c.extra), p = F.p, Pg = F.Pg, smoke = [], glow = [], E = { lit: lit, state: st, dark: [] }, ink = X.pal().ink;
    B.ground(F, 0.03, 0.03, 2.97, 1.97, function (px, py) { return c.snow ? R('snow', 1) : X.texC('tex_cutstone', px, py * 2, 'ashen', 0); });
    var hall = { w: 2.2, d: 1.22, h: 21 + c.extra, plinth: 3, plinthRamp: 'river', wall: { tex: 'tex_brick', ramp: 'ironbrick' }, roof: { type: 'sawtooth', axis: 'x', tex: 'tex_corrugated', ramp: v.ri ? 'zinc' : 'oxide', H: 5, glassRamp: lit ? 'gold' : 'glass' }, snow: c.snow, lampA: 30, lampZ: 15 };
    var g = B.put(F, hall, 0.2, 0.1);
    H.faceStrip(p, g, 'L', 'hd_steel_lintel', {}, 2, round(g.w * 16) - 4, 15);
    sign(p, g, 8, 24, 16, v.paint, k);
    H.onFace(p, g, 'R', 'win_tall', { ACCENT: lit ? 'gold' : 'glass' }, H.snap(3, 'R', 6), 4); H.onFace(p, g, 'R', 'win_tall', { ACCENT: lit ? 'gold' : 'glass' }, H.snap(11, 'R', 6), 4);
    /* chimneys stand in front of the hall's right wall, so they are drawn after it */
    [[2.55, 0.14, 50], [2.6, 0.62, 44]].forEach(function (q, i) {
      var hh = q[2] + c.extra, gc = B.put(F, { w: 0.28, d: 0.28, h: hh, shape: 'round', r: 4, plinth: 3, plinthRamp: 'river', wall: { tex: 'tex_brick', ramp: 'ironbrick' }, roof: { type: 'none' }, snow: c.snow, _t4: 0 }, q[0], q[1]);
      var cc = Pg(q[0] + 0.14, q[1] + 0.14), ct = gc.P(0.14, 0.14, gc.H); E2.ring(p, cc, 4, hh - 2, 'soot'); E2.ring(p, cc, 4, round(hh * 0.5), 'cream');
      for (var x = -2; x < 2; x++) p.set(ct[0] + x, ct[1], ink);
      if (open && (i === 0 || st === 'A')) smoke.push([ct[0], ct[1] - 2]); if (open && st === 'A') E.dark.push([ct[0], ct[1] - 3]);
    });
    var gd = B.put(F, { w: 1.32, d: 0.32, h: 5, wall: { tex: 'tex_cutstone', ramp: 'river' }, roof: { type: 'flat', ramp: 'river' }, snow: c.snow, _t4: 0 }, 0.88, 1.32);
    H.faceStrip(p, gd, 'L', 'dock_edge', {}, 0, round(gd.w * 16), 0);
    [17, 29].forEach(function (a) { doorOn(p, g, H.snap(a, 'L', 8), 6, { MAIN: v.wi ? 'zinc' : v.paint2 }, open, st === 'A' ? glow : null); });
    var go = B.put(F, { w: 0.66, d: 0.56, h: 13, plinth: 2, wall: { tex: 'tex_wattle', ramp: ['ochre', 'rosewash', 'lime'][k % 3] }, roof: { type: 'hip', tex: 'tex_tiles', ramp: 'terracotta', pitch: 1 }, snow: c.snow, _t4: 0 }, 0.12, 1.4);
    H.onFace(p, go, 'L', 'win_glazed', { ACCENT: lit ? 'gold' : 'glass', MAIN: v.paint }, H.snap(2, 'L', 6), 3);
    H.onFace(p, go, 'L', 'door_plain', { MAIN: v.paint }, H.snap(5 + 6, 'L', 6), 0);
    var fb = [H.faceX(go, 'L', 3), H.faceY(go, 'L', 3) - 2]; B.spr(p, 'flowerbox', { ACCENT: v.bloom, MAIN: v.paint, FOLIAGE: c.fol }, fb[0] + 3, fb[1]);
    H.onFace(p, go, 'R', 'win_glazed', { ACCENT: lit ? 'gold' : 'glass', MAIN: v.paint }, H.snap(2, 'R', 6), 3);
    /* the water tower stands on a brick plant room that rises through the sawtooth teeth, so its legs meet a flat top */
    var pr = B.put(F, { w: 0.62, d: 0.6, h: 9, wall: { tex: 'tex_brick', ramp: 'ironbrick' }, roof: { type: 'flat', ramp: 'river' }, snow: c.snow, _t4: 0 }, 0.24, 0.14, g.H);
    H.onFace(p, pr, 'L', 'door_plain', { MAIN: v.paint2 }, H.snap(3, 'L', 6), 0);
    var rf = pr.P(0.31, 0.3, pr.H), wt = P.sig_water_tower; p.blit(X.sprite('sig_water_tower', { MAIN: v.paint }), rf[0] - wt.anchor[0], rf[1] - wt.anchor[1]);
    p.blit(X.sprite('cat_roof', { MAIN: season === 3 ? 'hair_black' : 'ochre' }), rf[0] - 4, rf[1] - wt.anchor[1] - 4);
    /* goods on the dock */
    var dk = function (u, v2) { return Pg(u, v2, 5); };
    if (st === 'L') { [[1.02, 1.5], [1.16, 1.5], [1.09, 1.42]].forEach(function (q, i) { var a = dk(q[0], q[1]); roll(p, a[0] - 3, a[1] - (i === 2 ? 4 : 2), ['saffron', 'plum', 'teal', 'madder'][(i + k) % 4]); });
      var cr = dk(1.92, 1.52); B.stack(p, cr[0], cr[1], 'unit_crate', { WOOD: 'pinewood' }, 2, 7, 5, 1); }
    if (st === 'A') { var ig = dk(1.1, 1.5); B.stack(p, ig[0], ig[1], 'unit_ingot', { MAIN: 'bronze' }, 3, 6, 3, 1); }
    var cp = Pg(2.62, 1.75); B.spr(p, 'sig_cart', { MAIN: 'walnut', ACCENT: v.paint2, METAL: 'iron' }, cp[0], cp[1]);
    return B.out(F, { roof: rf, h: 34 + c.extra, smoke: smoke, v: v, e2glow: glow, e2: { lit: lit }, e3: E });
  }

  function oil_well(type, tier, k, season, lvl, o) {
    var c = B.C(type, 4, k, season, lvl), F = B.frame(1, 1, 62), p = F.p, Pg = F.Pg, fl = flags(o), E = {};
    B.ground(F, 0.06, 0.06, 0.94, 0.94, function (px, py) { return c.snow ? R('snow', 1) : R('dirt', ((px >> 1) + py * 3 + k) % 7 ? 1 : 2); });
    if (!c.snow) { puddle(p, Pg(0.78, 0.82), 4, 1, 31 + k); puddle(p, Pg(0.5, 0.36), 2, 1, 37 + k); }
    var base = Pg(0.3, 0.36), top = derrick(p, base, 44, 'oxide');
    /* doghouse at the foot of the tower */
    var dh = B.put(F, { w: 0.24, d: 0.22, h: 7, wall: { tex: 'tex_planks', ramp: 'walnut' }, roof: { type: 'lean', axis: 'y', tex: 'tex_corrugated', ramp: c.v.ri ? 'zinc' : 'rust' }, snow: c.snow, _t4: 0 }, 0.1, 0.62);
    H.onFace(p, dh, 'L', 'door_plain', { MAIN: c.v.paint }, H.snap(1, 'L', 6), 0);
    /* compact pumpjack beside the foot, on the same tile (drawn live) */
    E.pj = [base[0] + 5, base[1] + 5]; E.ph = floor(ih(k, 11, 3401) * 4);
    if (fl & 1) { var fs = Pg(0.86, 0.1); for (var z = 0; z < 28; z++) { p.set(fs[0], fs[1] - z, R('iron', 1)); p.set(fs[0] + 1, fs[1] - z, R('iron', 3)); }
      var ft = P.sig_flare_tip; p.blit(X.sprite('sig_flare_tip'), fs[0] - ft.anchor[0] + 1, fs[1] - 28 - ft.anchor[1] + 1); E.flare = [fs[0] + 1, fs[1] - 28 - ft.h]; }
    return B.out(F, { roof: top, h: 44, noShadow: false, noBunt: true, v: c.v, e3: E });
  }

  function oil_depot(type, tier, k, season, lvl, o) {
    var c = B.C(type, 4, k, season, lvl), v = c.v, F = B.frame(2, 1, 44), p = F.p, Pg = F.Pg, two = flags(o) & 2, E = {};
    B.ground(F, 0.03, 0.03, 1.97, 0.97, function (px, py) { return c.snow ? R('snow', 1) : R('ashen', ((px >> 1) + py * 2 + k) % 9 ? 1 : 2); });
    if (!c.snow) puddle(p, Pg(1.0, 0.78), 4, 1, 41 + k);
    B.put(F, { w: 1.9, d: 0.08, h: 4, wall: { tex: 'tex_brick', ramp: 'ironbrick' }, roof: { type: 'flat', ramp: 'ironbrick' }, snow: c.snow, _t4: 0 }, 0.05, 0.03);
    B.put(F, { w: 0.08, d: 0.86, h: 4, wall: { tex: 'tex_brick', ramp: 'ironbrick' }, roof: { type: 'flat', ramp: 'ironbrick' }, snow: c.snow, _t4: 0 }, 0.03, 0.08);
    var ramps = [['cream', 'zinc'], ['zinc', 'oxide'], ['oxide', 'cream']][k % 3];
    tank(p, Pg(0.5, 0.45), 0.3, 20, ramps[0], { snow: c.snow });
    if (two) tank(p, Pg(1.22, 0.45), 0.27, 17, ramps[1], { snow: c.snow });
    var vp = Pg(two ? 0.86 : 1.0, 0.78), pv = P.sig_pipe_valve; B.spr(p, 'sig_pipe_valve', { ACCENT: v.paint }, vp[0], vp[1]); E.glint = [vp[0] - 1, vp[1] - pv.h + 2];
    L(p, [vp[0] - 9, vp[1] - 4], [vp[0] - 3, vp[1] - 4], R('iron', 2));
    var bp = Pg(1.62, 0.7); B.stack(p, bp[0], bp[1], 'unit_barrel', { MAIN: v.paint }, 3, 7, 4, 1);
    var bp2 = Pg(1.82, 0.32); B.spr(p, 'unit_barrel', { MAIN: v.paint2 }, bp2[0], bp2[1]);
    return B.out(F, { roof: Pg(0.5, 0.45, 26), h: 24, noBunt: true, v: v, e3: E });
  }

  function oil_power(type, tier, k, season, lvl, o) {
    var c = B.C(type, 4, k, season, lvl), v = c.v, on = o.on !== false, F = B.frame(2, 2, 92 + c.extra), p = F.p, Pg = F.Pg, smoke = [], glow = [], ink = X.pal().ink, E = {};
    B.ground(F, 0.05, 0.05, 1.95, 1.95, function (px, py) { return c.snow ? R('snow', 1) : R('ashen', ((px >> 1) + py * 3 + k) % 9 ? 1 : 2); });
    if (!c.snow) puddle(p, Pg(1.6, 0.9), 4, 2, 51 + k);
    /* chimneys at the back-right corner, the tank at the back-left: the tall parts stay clear of the wharf on the north-west */
    tank(p, Pg(0.52, 0.42), 0.3, 17, v.ri ? 'cream' : 'zinc', { snow: c.snow });
    [[1.1, 0.14, 58], [1.58, 0.1, 52]].forEach(function (q) {
      var hh = q[2] + c.extra; B.put(F, { w: 0.3, d: 0.3, h: hh, shape: 'round', r: 4, plinth: 3, plinthRamp: 'river', wall: { tex: 'tex_brick', ramp: 'ironbrick' }, roof: { type: 'none' }, snow: c.snow, _t4: 0 }, q[0], q[1]);
      var cc = Pg(q[0] + 0.15, q[1] + 0.15); E2.ring(p, cc, 4, hh - 2, 'soot'); E2.ring(p, cc, 4, round(hh * 0.45), 'oxide');
      var ct = Pg(q[0] + 0.15, q[1] + 0.15, hh); for (var x = -2; x < 2; x++) p.set(ct[0] + x, ct[1] - 1, ink); smoke.push([ct[0], ct[1] - 2]);
    });
    var fs = Pg(1.88, 1.05); for (var z = 0; z < 34; z++) { p.set(fs[0], fs[1] - z, R('iron', 1)); p.set(fs[0] + 1, fs[1] - z, R('iron', 3)); }
    var ft = P.sig_flare_tip; p.blit(X.sprite('sig_flare_tip'), fs[0] - ft.anchor[0] + 1, fs[1] - 34 - ft.anchor[1] + 1); E.flare = on ? [fs[0] + 1, fs[1] - 34 - ft.h] : null;
    L(p, [fs[0] - 1, fs[1] - 6], Pg(0.62, 0.74, 6), R('iron', 2));
    var g = B.put(F, { w: 1.55, d: 1.0, h: 20 + c.extra, plinth: 3, wall: { tex: 'tex_brick', ramp: 'ironbrick' }, roof: { type: 'sawtooth', axis: 'x', tex: 'tex_corrugated', ramp: 'oxide', H: 4 }, snow: c.snow }, 0.12, 0.84);
    [5, 15].forEach(function (a) { var m = E2.faceSpr(p, g, 'L', 'sig_boiler_door', {}, H.snap(a, 'L', 8), 1); if (on) for (var i = 2; i < 6; i++) glow.push(m(i, 3)); });
    H.onFace(p, g, 'R', 'win_tall', {}, H.snap(3, 'R', 6), 6); H.onFace(p, g, 'R', 'win_tall', {}, H.snap(10, 'R', 6), 6);
    H.faceStrip(p, g, 'L', 'hd_steel_lintel', {}, 2, round(g.w * 16) - 4, 14);
    var bp = Pg(1.45, 1.86); B.stack(p, bp[0], bp[1], 'unit_barrel', { MAIN: v.paint }, 2, 7, 4, 1);
    return B.out(F, { roof: B.ridgePt(g, 0.5), h: 32 + c.extra, smoke: on ? smoke : [], noBunt: true, v: v, e2glow: glow, e2: { on: on }, e3: E });
  }

  function wharf(type, tier, k, season, lvl, o) {
    var c = B.C(type, 3, k, season, lvl), v = c.v, F = B.frame(2, 1, 30), p = F.p, Pg = F.Pg, E = {}, dz = 3;
    B.ground(F, 1.0, 0.04, 1.96, 0.96, function () { return c.snow ? R('snow', 1) : R('dirt', 1); });
    for (var u = 0.1; u < 1.05; u += 0.22) [0.12, 0.88].forEach(function (vv) { var a = Pg(u, vv); for (var z = -2; z < dz; z++) { p.set(a[0], a[1] - z, R('walnut', 3)); } });
    X.fillPoly(p, [Pg(0.04, 0.1, dz), Pg(1.08, 0.1, dz), Pg(1.08, 0.9, dz), Pg(0.04, 0.9, dz)], function (px, py) { return c.snow ? R('snow', 1) : X.texC('tex_planks', px, py * 2, 'pinewood', 0); });
    X.fillPoly(p, [Pg(0.04, 0.9, 0), Pg(1.08, 0.9, 0), Pg(1.08, 0.9, dz), Pg(0.04, 0.9, dz)], function () { return R('walnut', 2); });
    X.fillPoly(p, [Pg(0.04, 0.1, 0), Pg(0.04, 0.9, 0), Pg(0.04, 0.9, dz), Pg(0.04, 0.1, dz)], function () { return R('walnut', 3); });
    [0.22, 0.74].forEach(function (vv) { var a = Pg(0.09, vv, dz); p.set(a[0], a[1] - 1, R('soot', 1)); p.set(a[0] + 1, a[1] - 1, R('soot', 2)); p.set(a[0], a[1] - 2, R('soot', 0)); p.set(a[0] + 1, a[1] - 2, R('soot', 1)); });
    var b1 = Pg(1.42, 0.3); B.stack(p, b1[0], b1[1], 'unit_barrel', { MAIN: v.paint }, 3, 7, 4, 1);
    var b2 = Pg(1.82, 0.62); B.stack(p, b2[0], b2[1], 'unit_crate', { WOOD: 'pinewood' }, 2, 7, 5, 1);
    var cp = Pg(1.55, 0.78); B.spr(p, 'sig_cart', { MAIN: 'walnut', ACCENT: v.paint2, METAL: 'iron' }, cp[0], cp[1]);
    var lp = Pg(1.1, 0.86); B.post(p, lp, 12, 'walnut'); p.blit(X.sprite('lantern', { ACCENT: v.paint }), lp[0] + 1, lp[1] - 11);
    return B.out(F, { roof: Pg(1.4, 0.5, 10), h: 10, noShadow: true, v: v, e3: E });
  }
  var NEWC = { factory: factory, oil_well: oil_well, oil_depot: oil_depot, oil_power: oil_power, wharf: wharf };
  /* new buildings always build in brick and steel (tier-4 remap, downpipes, wall lamps) */
  Object.keys(NEWC).forEach(function (t) { var f = NEWC[t]; var w = function (type, tier, k, season, lvl, o) { var prev = SK.T4; SK.T4 = { type: type, k: k }; try { return f(type, 4, k, season, lvl, o || {}); } finally { SK.T4 = prev; } }; w._t4w = true; VL.COMPOSERS[t] = w; });

  /* ---------- 4. modifiers on existing buildings (wrap the current composer; flags ride in o.e2 after '~') ---------- */
  function wrapC(t, fn) { var prev = VL.COMPOSERS[t]; if (!prev) return; var w = function (type, tier, k, season, lvl, o) { o = o || {}; var out = prev(type, tier, k, season, lvl, o), f = flags(o); return f ? fn(out, f, type, tier, k, season, lvl, o) : out; }; w._orig = prev; w._t4w = prev._t4w; VL.COMPOSERS[t] = w; }
  function warehouseShed(type, tier, k, season, lvl, o) {
    var c = B.C(type, 4, k, season, lvl), v = c.v, F = B.frame(1, 1, 40), p = F.p, prev = SK.T4; SK.T4 = { type: 'shed', k: k };
    try {
      B.ground(F, 0.02, 0.02, 0.98, 0.98, function (px, py) { return c.snow ? R('snow', 1) : X.texC('tex_cutstone', px, py * 2, 'ashen', 0); });
      var g = B.put(F, { w: 0.94, d: 0.62, h: 13, plinth: 2, plinthRamp: 'ironbrick', plinthTex: 'tex_brick', wall: { tex: 'tex_brick', ramp: 'ironbrick' }, roof: { type: 'gable', axis: 'x', tex: 'tex_corrugated', ramp: v.ri ? 'zinc' : 'oxide', pitch: -1 }, snow: c.snow }, 0.03, 0.04);
      var gd = B.put(F, { w: 0.94, d: 0.22, h: 3, wall: { tex: 'tex_cutstone', ramp: 'river' }, roof: { type: 'flat', ramp: 'river' }, snow: c.snow, _t4: 0 }, 0.03, 0.66);
      H.faceStrip(p, gd, 'L', 'dock_edge', {}, 0, round(gd.w * 16), -2);
      [0, 8].forEach(function (a) { doorOn(p, g, H.snap(a, 'L', 8), 3, { MAIN: v.paint }, false); });
      H.onFace(p, g, 'R', 'door_roller', { MAIN: v.paint2 }, H.snap(1, 'R', 8), 0);
      return B.out(F, { roof: B.ridgePt(g, 0.5), h: 20, v: v });
    } finally { SK.T4 = prev; }
  }
  wrapC('shed', function (out, f, type, tier, k, season, lvl, o) { return f & 1 ? warehouseShed(type, tier, k, season, lvl, o) : out; });
  wrapC('storage_yard', function (out, f, type, tier, k, season) {
    if (!(f & 2)) return out; var r = E2.grow(out, 24), Pg = E2.PgO(r), wt = P.sig_water_tower, a = Pg(1.8, 0.22);
    r.pix.blit(X.sprite('sig_water_tower', { MAIN: 'oxide', WOOD: 'walnut' }), a[0] - wt.anchor[0], a[1] - wt.anchor[1]); r.h = Math.max(r.h || 10, 30); return r;
  });
  wrapC('smelter', function (out, f, type, tier, k, season) {
    var r = E2.grow(out, 0), Pg = E2.PgO(r), p = r.pix;
    if (f & 4) { var a = Pg(1.86, 1.5), rk = P.sig_o2_rack, rs = X.sprite('sig_o2_rack', { MAIN: 'teal', METAL: 'steel', WOOD: 'pinewood' }); p.blit(rs, a[0] - rk.anchor[0] - 7, a[1] - rk.anchor[1] + 4); p.blit(rs, a[0] - rk.anchor[0], a[1] - rk.anchor[1]);
      var pv = Pg(1.92, 1.22); B.spr(p, 'sig_pipe_valve', { ACCENT: 'teal' }, pv[0], pv[1]); L(p, [a[0] + 5, a[1] - 6], [pv[0], pv[1] - 3], R('iron', 2)); L(p, [pv[0] - 2, pv[1] - 4], [pv[0] - 8, pv[1] - 10], R('iron', 2));
      r.e3 = Object.assign({}, r.e3 || {}, { o2: true }); }
    if (f & 8) { var ti = Pg(0.66, 1.84); for (var x = -9; x <= 9; x++) { p.set(ti[0] + x, ti[1] + 1, R('walnut', 2)); p.set(ti[0] + x, ti[1] + 2, R('walnut', 3)); } B.stack(p, ti[0], ti[1], 'unit_ingot', { MAIN: 'titanium' }, 3, 6, 3, 1); }
    return r;
  });
  wrapC('cement_plant', function (out, f, type, tier, k, season) {
    if (!(f & 16)) return out; var r = E2.grow(out, 30), Pg = E2.PgO(r), p = r.pix, snow = season === 3;
    E2.putOn(r, { w: 0.36, d: 0.36, h: 40, shape: 'round', r: 5, plinth: 2, wall: { tex: 'tex_cutstone', ramp: 'ashen' }, roof: { type: 'cone', tex: 'tex_rivetplate', ramp: 'zinc', H: 5 }, snow: snow, _t4: 0 }, 1.52, 0.1);
    var cs = Pg(1.7, 0.28); E2.ring(p, cs, 5, 30, 'iron'); E2.ring(p, cs, 5, 14, 'iron');
    r.e3 = Object.assign({}, r.e3 || {}, { kiln: kiln(p, Pg(1.1, 1.28, 8), Pg(1.9, 0.68, 14), 4, { ramp: 'rust', ground: [Pg(1.1, 1.28)[1], Pg(1.9, 0.68)[1]] }) });
    return r;
  });
  wrapC('mine', function (out, f) {
    if (!(f & 32) && !(f & 64)) return out; var r = E2.grow(out, 0), Pg = E2.PgO(r), p = r.pix, E = r.e2 || {};
    if (f & 32) { var hp = E.heap || Pg(0.5, 1.6); r.e3 = Object.assign({}, r.e3 || {}, { kiln: kiln(p, [hp[0] + 2, hp[1] + 12], [hp[0] + 18, hp[1] + 5], 3, { ramp: 'copper', ground: [hp[1] + 15, hp[1] + 9] }) }); }
    if (f & 64) anfo(p, Pg(1.52, 1.84)); return r;
  });
  function anfo(p, a) { var m = { MAIN: 'cream', ACCENT: 'saffron' }; [[-5, 0], [1, 1], [7, 2], [-2, -4], [4, -3]].forEach(function (q) { B.spr(p, 'unit_sack', m, a[0] + q[0], a[1] + q[1]); }); }
  ['rock_quarry', 'coal_mine'].forEach(function (t) { wrapC(t, function (out, f, type) { if (!(f & 64)) return out; var r = E2.grow(out, 0), Pg = E2.PgO(r); anfo(r.pix, type === 'rock_quarry' ? Pg(1.84, 1.72) : Pg(1.52, 1.84)); return r; }); });
  wrapC('garrison', function (out, f) {
    if (!(f & 128)) return out; var r = E2.grow(out, 0), Pg = E2.PgO(r), a = Pg(1.62, 1.0), mg = P.sig_mg_nest; r.pix.blit(X.sprite('sig_mg_nest', { MAIN: 'cream' }), a[0] - mg.anchor[0], a[1] - mg.anchor[1]); return r;
  });

  /* ---------- 5. state -> composer options ---------- */
  function wrapD(t, fn) { var prev = VL.DYN[t]; var w = function (st, tt, it) { var o = prev ? prev(st, tt, it) : undefined, add = null; try { add = fn(st || {}, tt, it || {}, o); } catch (e) { add = null; } if (!add) return o;
    o = Object.assign({}, o || {}); if (typeof add === 'number') o.e2 = (o.e2 || '') + '~' + add; else Object.assign(o, add); return o; }; w._orig = prev; VL.DYN[t] = w; }
  wrapD('shed', function (st) { return tl(st, 'storage') >= 4 ? 1 : 0; });
  wrapD('storage_yard', function (st, t, it) { return ON.rail && (it.k | 0) === 0 && tl(st, 'trade') >= 3 ? 2 : 0; });
  wrapD('warehouse', function (st, t, it, o) { return tl(st, 'steel_container') >= 3 ? { e2: ((o && o.e2) || '-') + 'A' } : 0; });
  wrapD('smelter', function (st) { return (tl(st, 'smelting') >= 5 ? 4 : 0) + (tl(st, 'titanium') >= 1 ? 8 : 0); });
  wrapD('cement_plant', function (st) { return tl(st, 'cement') >= 4 ? 16 : 0; });
  wrapD('mine', function (st) { return (tl(st, 'copper') >= 1 ? 32 : 0) + (tl(st, 'explosives') >= 3 ? 64 : 0); });
  ['rock_quarry', 'coal_mine'].forEach(function (t) { wrapD(t, function (st) { return tl(st, 'explosives') >= 3 ? 64 : 0; }); });
  wrapD('garrison', function (st) { return tl(st, 'military') >= 4 ? 128 : 0; });
  /* factory looks: powered copies = round(on / count x visible), by seed; the powered ones split between Lux and Alloy in proportion */
  function factoryLook(st, k) {
    var lux = fld(st, 'factory', 'Lux'), al = fld(st, 'factory', 'Alloy'), lit = E2.litFor(st, 'factory', { k: k });
    if (!lit || (lux + al) <= 0) return { st: 'I', lit: lit };
    var vis = per('factory') || 1, hs = 3501, me = ih(k, hs, 3502), rank = 0, nOn = 0;
    for (var j = 0; j < vis; j++) if (E2.litFor(st, 'factory', { k: j })) { nOn++; if (j !== k && ih(j, hs, 3502) < me) rank++; }
    var nLux = al <= 0 ? nOn : lux <= 0 ? 0 : Math.max(1, Math.min(nOn - 1, round(nOn * lux / (lux + al))));
    if (nOn === 1 && lux > 0 && al > 0) return { st: lux >= al ? 'L' : 'A', lit: lit };
    return { st: rank < nLux ? 'L' : 'A', lit: lit };
  }
  VL.DYN.factory = function (st, t, it) { var f = factoryLook(st || {}, it.k | 0); return { on: true, e2: f.st + (f.lit ? 'p' : 'd') }; };
  VL.DYN.oil_well = function (st) { return { on: true, e2: tl(st, 'oil') >= 4 ? '~1' : '-' }; };
  VL.DYN.oil_depot = function (st) { var n = cnt(st, 'oil_depot'); return { on: true, e2: n >= 3 ? '~2' : '-' }; };
  VL.DYN.oil_power = function (st) { var b = city(st).oil_power, n = b ? b.count | 0 : 0, on = b && b.on != null ? b.on | 0 : n; return { on: on > 0 }; };
  VL.DYN.wharf = function () { return { on: true }; };
  /* only the first derrick carries the flare stack */
  var odyn = VL.DYN.oil_well; VL.DYN.oil_well = function (st, t, it) { var o = odyn(st, t, it); if ((it.k | 0) !== 0) o.e2 = '-'; return o; };

  /* ---------- 6. rails, crossings, bridge, siding, decor clearance ---------- */
  var RG = { key: '', cross: [], bridge: null };
  function railGeo() {
    var sur = X.OPT.surround || 'open'; if (RG.key === sur) return RG;
    var cross = [], br = null, run = null;
    for (var v = V0; v <= V1; v += 0.05) { var t = X.outerTile(RU, v, sur);
      if (t === 2) { if (!run) run = [v, v]; run[1] = v; } else if (run) { cross.push(run); run = null; }
      if (t === 4) { if (!br) br = [v, v]; br[1] = v; } }
    if (run) cross.push(run);
    if (br) { br[0] -= 0.25; br[1] += 0.25; }
    RG = { key: sur, cross: cross.map(function (c) { return [c[0] - 0.12, c[1] + 0.12]; }), bridge: br };
    return RG;
  }
  function inSpan(v, sp) { return sp && v >= sp[0] && v <= sp[1]; }
  function drawTrack(b, T, O, u0, v0, u1, v1, geo, wide) {
    var du = u1 - u0, dv = v1 - v0, l = Math.hypot(du, dv), nu = -dv / l, nv = du / l, n = Math.max(2, round(l / 0.13)), g = 0.1, sl = 0.17;
    var put = function (x, y, c) { x = round(x); y = round(y); var q0 = y * b.w + x; if (x < 0 || y < 0 || x >= b.w || y >= b.h || !(T[q0] || (O && O[q0]))) return; b.d[y * b.w + x] = c; };
    var ln = function (a, c, col) { X.line(a[0], a[1], c[0], c[1], function (x, y) { put(x, y, col); }); };
    var cr = function (v) { return geo && geo.cross.some(function (s) { return v >= s[0] && v <= s[1]; }); }, onBr = function (v) { return geo && inSpan(v, geo.bridge); };
    for (var i = 0; i <= n; i++) { var t = i / n, u = u0 + du * t, v = v0 + dv * t; if (onBr(v)) continue;
      if (cr(v)) { ln(wp(u - nu * 0.26, v - nv * 0.26), wp(u + nu * 0.26, v + nv * 0.26), R('pinewood', i % 2 ? 2 : 1)); continue; }
      ln(wp(u - nu * sl, v - nv * sl), wp(u + nu * sl, v + nv * sl), R('walnut', 3)); }
    for (var s = 0; s < 2; s++) { var side = s ? g : -g, col = R('iron', s ? 2 : 1), seg = null;
      for (i = 0; i <= n * 2; i++) { t = i / (n * 2); u = u0 + du * t; v = v0 + dv * t; var gap = cr(v);
        if (!gap) { var q = wp(u + nu * side, v + nv * side); if (seg) ln(seg, q, col); seg = q; } else seg = null; } }
    if (wide && geo && geo.cross.length) geo.cross.forEach(function (sp) { [sp[0], sp[1]].forEach(function (vv) { ln(wp(u0 - 0.26, vv), wp(u0 + 0.26, vv), R('walnut', 3)); }); });
  }
  function railsStatic(b, ctx) {
    if (!ON.rail) return; var geo = railGeo(), T = ctx.T, O = ctx.tr && ctx.tr.O;
    drawTrack(b, T, O, RU, V0, RU, V1, geo, true);
    if (ON.siding) { drawTrack(b, T, O, RU, SID.a, SU, SID.b, null); drawTrack(b, T, O, SU, SID.b, SU, SID.c + 0.05, null); }
  }
  var baseSky = W0.sky._orig || W0.sky;
  var skyW = function (b, ctx) { baseSky(b, ctx); try { railsStatic(b, ctx); } catch (e) { /* never break the frame */ } }; skyW._orig = baseSky; W0.sky = skyW;
  /* bridge girders (depth items; the near girder keeps the front-most key so it hides the wheels) */
  var GIRD = {};
  function girderPix(len, near) {
    var key = len + '|' + near; if (GIRD[key]) return GIRD[key];
    var w = round(len * 16) + 4, h = round(len * 8) + 12, p = new Pix(w, h), ox = w - 2, oy = 7, Pg = function (v, z) { return [ox - v * 16, oy + v * 8 - z]; };
    X.fillPoly(p, [Pg(0, 0), Pg(len, 0), Pg(len, 5), Pg(0, 5)], function (x, y) { var a = Pg(0, 0), vv = (ox - x) / 16, z = oy + vv * 8 - y; return z > 4.2 ? R('oxide', near ? 1 : 2) : z < 0.8 ? R('oxide', 3) : (floor(vv / 0.14) % 2 ? R('oxide', near ? 1 : 2) : R('oxide', near ? 2 : 3)); });
    for (var v = 0; v <= len; v += 0.14) { var a = Pg(v, 0), c = Pg(v, 5); X.line(a[0], a[1], c[0], c[1], function (x, y) { p.set(x, y, R('oxide', 3)); }); }
    return (GIRD[key] = { pix: p, ax: ox, ay: oy });
  }
  function e3Decor(ctx) {
    var st = ctx.state, out = []; if (!ON.e3 && !ON.rail) return out;
    if (ON.rail) {
      var geo = railGeo();
      if (geo.bridge) { var len = geo.bridge[1] - geo.bridge[0];
        [[-0.24, false, 0], [0.24, true, 0.3]].forEach(function (q) { var gp = girderPix(len, q[1]), u = RU + q[0], v0 = geo.bridge[0];
          out.push({ k: u + geo.bridge[1] + q[2], v: geo.bridge[1], u: u, shadow: function () {}, draw: function (b, blitD) { var g = wp(u, v0); blitD(b, gp.pix, round(g[0]) - gp.ax, round(g[1]) - gp.ay, u + geo.bridge[1] + q[2], -1); } }); });
        [geo.bridge[0] - 0.08, geo.bridge[1] + 0.08].forEach(function (vv) { var ab = abutPix(); out.push(E2.dItem(ab, 9, 6, RU, vv)); });
      }
      if (ON.siding) {
        var ws = sidingWagons(st); ws.forEach(function (w) { var s = wagonPix(w), d = P[w.n]; out.push(E2.dItem(s, d.anchor[0], d.anchor[1], SU, w.v)); });
        var bs = P.sig_buffer_stop; out.push(E2.dItem(X.sprite('sig_buffer_stop'), bs.anchor[0], bs.anchor[1], SU, SID.c + 0.17));
      }
    }
    if (ON.e3 && tl(st, 'oil') >= 4 && per('oil_well') > 0) { /* flare stack in the field is carried by derrick 0 */ }
    return out;
  }
  var ABUT = null;
  function abutPix() { if (ABUT) return ABUT; var p = new Pix(18, 10); X.fillPoly(p, [[1, 4], [9, 0], [17, 4], [9, 8]], function (x, y) { return X.texC('tex_drystone', x, y * 2, 'river', y > 5 ? 1 : 0); });
    for (var x = 1; x < 17; x++) { var yb = 4 + floor(Math.abs(x - 9) / 2) * -1 + 4; p.set(x, Math.min(9, 8 - floor(Math.abs(x - 9) / 2) + 1), R('river', 3)); } return (ABUT = p); }
  var baseDecor = W0.decor._orig || W0.decor;
  function inLot(u, v) {
    var list = (VL.vil.plan && VL.vil.plan.list) || [];
    for (var i = 0; i < list.length; i++) { var it = list[i]; if (!NEWK[it.type] && !(it.type === 'storage_yard' && it.x === YARD.x && it.y === YARD.y)) continue;
      var m = it.type === 'oil_well' ? 0.6 : 0.15; /* derricks get a clearing: no tree hides the lattice */
      if (u > it.x - m && u < it.x + it.fw + m && v > it.y - m && v < it.y + it.fd + m) return true; }
    return false;
  }
  var decW = function (ctx) {
    var items = (VL.vil.plan && VL.vil.plan.list) || [], nLY = items.filter(function (i) { return i.type === 'lumber_yard'; }).length;
    var D = W0.scatter(ctx.season, ctx.biome || 'grassland', nLY, VL.vil.started !== false);
    (D.list || []).forEach(function (o) { if (o._u0 != null) { o.u = o._u0; delete o._u0; }
      if (ON.rail && o.u > 23.85 && o.u < RU + 0.55 && o.v > V0 - 1 && o.v < V1 + 1) { o._u0 = o.u; o.u = RU + 0.62 + (o.u - 23.85) * 0.4; } });
    var base = baseDecor(ctx).filter(function (d) { return !(d.o && (ON.e3 || ON.rail) && inLot(d.o.u, d.o.v)); });
    return base.concat(e3Decor(ctx));
  };
  decW._orig = baseDecor; W0.decor = decW;
  var baseSig = VL.signature._orig || VL.signature;
  var sigW = function (st, ctx) { return baseSig(st, ctx) + '|e3:' + [ON.rail ? 1 : 0, ON.siding ? 1 : 0, ON.e3 ? 1 : 0, ON.siding ? sidingWagons(st).map(function (w) { return w.n.slice(10, 12) + w.c; }).join('') : ''].join(''); };
  sigW._orig = baseSig; VL.signature = sigW;

  /* ---------- 7. vehicles: wagon sprites, consist, scheduler ---------- */
  var BODY = ['madder', 'teal', 'saffron', 'indigo', 'plum', 'sage', 'rust'], TANKC = ['oxide', 'cream', 'teal', 'saffron', 'sage', 'rust'], WC = new Map();
  function wagonPix(w) {
    var key = w.n + '|' + (w.c || '') + '|' + (w.load || ''); if (WC.has(key)) return WC.get(key);
    var d = P[w.n], s = X.sprite(w.n, w.n === 'veh_wagon_box' ? { MAIN: w.c } : w.n === 'veh_wagon_tank' && w.c ? { MAIN: w.c } : null);
    if (w.n === 'veh_wagon_flat' || (w.n === 'veh_wagon_hopper' && w.load)) {
      var q = new Pix(s.w, s.h + 8); q.blit(s, 0, 8);
      if (w.n === 'veh_wagon_flat') { var uc = P.unit_container; q.blit(X.sprite('unit_container', { MAIN: w.c || 'teal' }, { flip: true }), d.anchor[0] - 7, d.anchor[1] + 8 - uc.h - 3); }
      else { var lp = d.attach.load, t = new Pix(16, 10); B.mound(t, 8, 8, 5, 3, 'tex_drystone', w.load, {}); for (var y = 0; y < t.h; y++) for (var x = 0; x < t.w; x++) { var c = t.d[y * t.w + x]; if (c && !q.get(lp[0] - 8 + x, lp[1] + 8 - 8 + y + 1)) q.set(lp[0] - 8 + x, lp[1] + y + 1, c); else if (c && y < 6) q.set(lp[0] - 8 + x, lp[1] + y + 1, c); } }
      q.anchor = [d.anchor[0], d.anchor[1] + 8]; WC.set(key, q); return q;
    }
    s.anchor = d.anchor; WC.set(key, s); return s;
  }
  function wagonTypes(st) {
    var a = ['veh_wagon_box']; if (tl(st, 'oil') >= 1) a.push('veh_wagon_tank'); if (tl(st, 'steel_container') >= 1) a.push('veh_wagon_flat');
    var mineV = per('mine') > 0 || per('coal_mine') > 0; if (mineV) a.push('veh_wagon_hopper'); return a;
  }
  function makeWagon(st, n, seed) {
    var c = BODY[floor(ih(seed, 7, 3601) * BODY.length)];
    if (n === 'veh_wagon_tank') c = TANKC[floor(ih(seed, 8, 3602) * TANKC.length)];
    if (n === 'veh_wagon_flat') c = ['madder', 'teal', 'saffron', 'indigo', 'rust'].concat(tl(st, 'steel_container') >= 3 ? ['bronze'] : [])[floor(ih(seed, 9, 3603) * (tl(st, 'steel_container') >= 3 ? 6 : 5))];
    var load = n === 'veh_wagon_hopper' ? (per('coal_mine') > 0 && (per('mine') === 0 || ih(seed, 4, 3604) < 0.5) ? 'soot' : ih(seed, 5, 3605) < 0.5 ? 'rust' : 'copper') : '';
    return { n: n, c: c, load: load };
  }
  function sidingWagons(st) { var ty = wagonTypes(st); return [0, 1].map(function (i) { var w = makeWagon(st, ty[floor(ih(i, 3, 3606) * ty.length)], 900 + i); w.v = 11.22 + i * 0.97; return w; }); }
  var LOCO_L = 1.32, WAG_L = 0.9, GAP = 0.06, VMAX = 1.9 / 1000, DD = 2.2;
  var SCH = { i: 0, t0: 0 };
  function period(i) { return 45000 + ih(i, 17, 3301) * 75000; }
  function passAt(t) { if (t < SCH.t0) SCH = { i: 0, t0: 0 }; var guard = 0; while (t >= SCH.t0 + period(SCH.i) && guard++ < 100000) { SCH.t0 += period(SCH.i); SCH.i++; } return { i: SCH.i, tau: t - SCH.t0 - 2000 }; }
  function consist(st, i) { var ty = wagonTypes(st), n = 3 + floor(ih(i, 2, 3302) * 3), ws = []; for (var j = 0; j < n; j++) ws.push(makeWagon(st, ty[floor(ih(i, j + 5, 3303) * ty.length)], i * 13 + j)); return ws; }
  /* motion along the line: steady cruise, brake to a stop at the freight yard, wait 3-5 s, pull away */
  function motion(i, tau, len, stop) {
    var dir = ih(i, 1, 3304) < 0.5 ? 1 : -1, Dt = (V1 - V0) + len, tb = 2 * DD / VMAX, a = VMAX / tb, W = 3000 + ih(i, 3, 3305) * 2000;
    var sStop = dir > 0 ? (STOPV + len / 2 - V0) : (V1 - (STOPV - len / 2)), s1 = sStop - DD, t1 = s1 / VMAX, t2 = t1 + tb, t3 = t2 + W, t4 = t3 + tb, dur, s, mv = true, ev = 0;
    if (!stop) { dur = Dt / VMAX; s = VMAX * tau; }
    else { dur = t4 + (Dt - (sStop + DD)) / VMAX;
      if (tau < t1) s = VMAX * tau; else if (tau < t2) { var q = tau - t1; s = s1 + VMAX * q - 0.5 * a * q * q; } else if (tau < t3) { s = sStop; mv = false; } else if (tau < t4) { var q2 = tau - t3; s = sStop + 0.5 * a * q2 * q2; } else s = sStop + DD + VMAX * (tau - t4); }
    var head = dir > 0 ? V0 + s : V1 - s;
    return { dir: dir, head: head, moving: mv, dur: dur, t2: stop ? t2 : -1, t3: stop ? t3 : -1, slow: stop && tau > t1 && tau < t4 };
  }
  function trainNow(st, t) {
    var ps = passAt(t), ws = consist(st, ps.i), len = LOCO_L + ws.length * (WAG_L + GAP) + GAP, stop = per('storage_yard') > 0, m = motion(ps.i, ps.tau, len, stop);
    if (ps.tau < 0 || ps.tau > m.dur) return null;
    var cars = [], off = 0, dir = m.dir, lc = m.head - dir * (LOCO_L / 2);
    cars.push({ n: dir > 0 ? 'veh_loco_front' : 'veh_loco_rear', v: lc, loco: true }); off = LOCO_L + GAP;
    ws.forEach(function (w) { var c = Object.assign({}, w); c.v = m.head - dir * (off + WAG_L / 2); off += WAG_L + GAP; cars.push(c); });
    return { i: ps.i, tau: ps.tau, m: m, cars: cars, len: len };
  }
  /* own steam particles (same look as the village smoke: 1-3 px discs, two tones, ~1.5 s) */
  var STEAM = [], LASTT = -1, LASTP = { i: -1, tau: -1 }, LASTPUFF = 0;
  function puff(x, y, n, spread) { for (var i = 0; i < n; i++) { var a = ih(i, n, floor(x * 7 + y)) * PI * 2; STEAM.push({ x: x + Math.cos(a) * (spread || 2), y: y, vx: Math.cos(a) * 10, vy: -7 - ih(i, 3, 3307) * 6, age: 0, life: 1.3 + ih(i, 5, 3308) * 0.6, col: 'cream' }); } }
  function chimneyOf(car, dir) { var vc = dir > 0 ? 1.23 : LOCO_L - 1.23, d = vc - LOCO_L / 2, g = wp(RU, car.v); return [round(g[0] - d * 16), round(g[1] + d * 8 - 18)]; }
  function drawTrain(b, st, t) {
    var tr = trainNow(st, t); if (!tr) { LASTP = { i: -1, tau: -1 }; return; }
    var m = tr.m, loco = tr.cars[0], ch = chimneyOf(loco, m.dir), prev = LASTP.i === tr.i ? LASTP.tau : -1;
    if (m.t2 > 0 && prev >= 0 && prev < m.t2 && tr.tau >= m.t2) { puff(ch[0], ch[1], 10, 3); var w0 = wp(RU, loco.v); puff(w0[0], w0[1] - 2, 8, 6); }
    if (m.t3 > 0 && prev >= 0 && prev < m.t3 && tr.tau >= m.t3) { puff(ch[0], ch[1], 12, 3); var w1 = wp(RU, loco.v); puff(w1[0], w1[1] - 2, 6, 6); }
    if (m.moving && t - LASTPUFF > (m.slow ? 220 : 110)) { LASTPUFF = t; STEAM.push({ x: ch[0], y: ch[1], vx: 2, vy: -6, age: 0, life: 1.4, col: 'cream' }); }
    if (!m.moving && t - LASTPUFF > 700) { LASTPUFF = t; STEAM.push({ x: ch[0], y: ch[1], vx: 1, vy: -4, age: 0, life: 1.2, col: 'ashen' }); }
    LASTP = { i: tr.i, tau: tr.tau };
    tr.cars.slice().sort(function (a, c) { return a.v - c.v; }).forEach(function (c) {
      if (c.v < V0 - 1 || c.v > V1 + 1) return; var s = c.loco ? X.sprite(c.n) : wagonPix(c), an = c.loco ? P[c.n].anchor : s.anchor, g = wp(RU, c.v), bob = m.moving && !c.loco && floor(t / 180 + c.v * 3) % 7 === 0 ? 1 : 0;
      dblit(b, s, round(g[0]) - an[0], round(g[1]) - an[1] - bob, RU + c.v + 0.02);
    });
  }
  function stepSteam(b, t) {
    var dt = LASTT < 0 ? 0 : Math.max(0, Math.min(0.25, (t - LASTT) / 1000)); LASTT = t;
    var wind = VL.vil.wind ? 6 : 0;
    for (var i = STEAM.length - 1; i >= 0; i--) { var q = STEAM[i]; q.age += dt; q.x += (q.vx + wind) * dt; q.y += q.vy * dt; q.vx *= 0.96; if (q.age >= q.life) STEAM.splice(i, 1); }
    if (STEAM.length > 300) STEAM.splice(0, STEAM.length - 300);
    STEAM.forEach(function (q) { var sz = 1 + floor(q.age / q.life * 2.99), c = q.col === 'soot' ? R('soot', q.age < q.life * 0.5 ? 1 : 0) : R(q.col, q.age < q.life * 0.45 ? 0 : 1), D = { 1: ['x'], 2: ['xx', 'xx'], 3: ['.x.', 'xxx', '.x.'] }[sz];
      var px = round(q.x) - floor(sz / 2), py = round(q.y) - floor(sz / 2); for (var j = 0; j < D.length; j++) for (var k = 0; k < D[j].length; k++) if (D[j][k] === 'x') b.set(px + k, py + j, c); });
  }
  /* barge: docks 10-20 s, steams south, turns, runs north past the pier, turns, comes back to the pier */
  var BU = 18.72, BD = 16.95, BS = 21.55, BSPD = 0.15 / 1000, TURN = 2000;
  var BSCH = { i: 0, t0: 0 };
  function bDock(i) { return 10000 + ih(i, 4, 3311) * 10000; }
  function bLen() { return 2 * (BS - BD) / BSPD + 2 * TURN; }
  function bargeAt(t) {
    if (t < BSCH.t0) BSCH = { i: 0, t0: 0 }; var g = 0; while (t >= BSCH.t0 + bDock(BSCH.i) + bLen() && g++ < 100000) { BSCH.t0 += bDock(BSCH.i) + bLen(); BSCH.i++; }
    var tau = t - BSCH.t0, W = bDock(BSCH.i), d1 = (BS - BD) / BSPD;
    if (tau < W) return { v: BD, front: true, moving: false, docked: true, unload: tau < W * 0.7, loaded: tau < W * 0.35, i: BSCH.i, tau: tau, W: W };
    tau -= W; if (tau < d1) return { v: BD + tau * BSPD, front: true, moving: true };
    tau -= d1; if (tau < TURN) return { v: BS, front: tau < TURN / 2, moving: false };
    tau -= TURN; if (tau < d1) return { v: BS - tau * BSPD, front: false, moving: true, loaded: true };
    tau -= d1; return { v: BD, front: tau >= TURN / 2, moving: false, docked: true, loaded: true, unload: true };
  }
  function drawBarge(b, t) {
    var it = VL.placed().filter(function (q) { return q.type === 'wharf'; })[0]; if (!it) return null;
    var s = bargeAt(t), n = s.front ? 'veh_barge_front' : 'veh_barge_rear', d = P[n], g = wp(BU, s.v), sp = X.sprite(n), key = BU + s.v + 0.05, bob = floor(t / 700) % 2;
    if (s.moving) for (var k = 1; k < 5; k++) { var wv = s.v - (s.front ? 1 : -1) * (0.72 + k * 0.12), w2 = wp(BU + (k % 2 ? 0.14 : -0.14), wv); dset(b, w2[0], w2[1], R('water', 0), key - 0.5); dset(b, w2[0] + 1, w2[1], R('water', 0), key - 0.5); }
    dblit(b, sp, round(g[0]) - d.anchor[0], round(g[1]) - d.anchor[1] + bob, key);
    if (s.loaded) { [0.65, 0.85].forEach(function (a, j) { var q = wp(BU, s.v + (s.front ? 1 : -1) * (a - 0.67)), us = X.sprite('unit_barrel', { MAIN: j ? 'teal' : 'madder' }); dblit(b, us, round(q[0]) - 4, round(q[1]) - 12 + bob, key + 0.01); }); }
    if (s.moving && floor(t / 160) % 2 === 0) { var fz = wp(BU, s.v + (s.front ? -0.22 : 0.22)); STEAM.push({ x: fz[0], y: fz[1] - 16 + bob, vx: 1, vy: -5, age: 0, life: 1.4, col: 'ashen' }); }
    return s;
  }
  var SEQ = [0, 1, 2, 1];
  function dynE3(b, ctx) {
    var st = ctx.state || {}, t = ctx.t || 0, f8 = floor(t / 125);
    VL.placed().forEach(function (it) {
      var o = it.bld; if (!o || it.bx == null) return; var E = o.e3 || {}, key = E2.keyOf(it), bx = it.bx, by = it.by;
      if (E.pj) { var f = SEQ[(floor(t / 250) + E.ph) % 4], fr = E2.frameOf('sig_pumpjack', f), pj = P.sig_pumpjack; dblit(b, fr, bx + E.pj[0] - pj.anchor[0], by + E.pj[1] - pj.anchor[1], key + 0.03); }
      if (E.flare) { var fs = X.sprite('fx_fire_' + ((f8 + it.k) & 3)); dblit(b, fs, bx + E.flare[0] - 6, by + E.flare[1] - 15, key + 0.02); }
      if (E.kiln) kilnBand(function (x, y, c) { dset(b, bx + x, by + y, c, key + 0.01); }, E.kiln, t);
      if (E.dark && E.dark.length && floor(t / 250) % 2 === 0 && floor(t / 125) !== E._lt) { E._lt = floor(t / 125); E.dark.forEach(function (q) { STEAM.push({ x: bx + q[0] + (f8 % 2), y: by + q[1], vx: 1.5, vy: -6, age: 0, life: 1.8, col: 'soot' }); }); }
      if (E.glint && floor(t / 1600) % 2 === 0 && (t % 1600) < 220) dset(b, bx + E.glint[0], by + E.glint[1], X.pal().spark, key + 0.02);
      if (E.o2 && o.e2 && o.e2.mouth && !o.e2.tip) { var wf = X.sprite('fx_fire_' + (f8 & 3), { MAIN: 'cream' }); dblit(b, wf, bx + o.e2.mouth[0] - 6, by + o.e2.mouth[1] - 14, key + 0.02); }
    });
    if (ON.rail) drawTrain(b, st, t);
    BARGE = ON.e3 ? drawBarge(b, t) : null;
    stepSteam(b, t);
  }
  var BARGE = null;
  var baseDyn = VL.drawDynamic._orig || VL.drawDynamic;
  var dynW = function (b, ctx) { baseDyn(b, ctx); try { dynE3(b, ctx); } catch (e) { /* never break the frame */ } }; dynW._orig = baseDyn; VL.drawDynamic = dynW;

  /* ---------- 8. citizens: dockers, rail worker (native resolution) ---------- */
  CZ.CARRY.Barrel = ['unit_barrel', { MAIN: 'madder' }]; CZ.CARRY.Crate = ['unit_crate', {}];
  function actorsE3(B2, ctx, K) {
    var st = ctx.state || {}, t = ctx.t || 0, ht = tl(st, 'high_tech') >= 3, e2 = ht ? 'co' : '', mo = { military: tl(st, 'military'), armor: tl(st, 'armor') };
    var wh = VL.placed().filter(function (q) { return q.type === 'wharf'; })[0];
    if (wh) { var bs = BARGE || bargeAt(t);
      for (var i = 0; i < 2; i++) { var u0 = wh.x + 0.45, u1 = wh.x + 1.5, vv = wh.y + 0.42 + i * 0.22, C = 5200, ph = ((t + i * 2600) % C) / C, s;
        if (bs && bs.docked && bs.unload) s = ph < 0.5 ? { u: u0 + (u1 - u0) * ph * 2, mode: 'walk', flip: false, back: false, carry: i ? 'Crate' : 'Barrel' } : { u: u1 - (u1 - u0) * (ph - 0.5) * 2, mode: 'walk', flip: true, back: true };
        else s = { u: u1 - 0.1 + i * 0.18, mode: 'idle', flip: i === 1, back: false };
        var g = wp(s.u, vv), pix = CZ.compose('unemployed', 70 + i, s.mode, floor(t / (s.mode === 'walk' ? 125 : 500)), Object.assign({ back: s.back, carry: s.carry, e2: e2 }, mo));
        E2.drawCit(B2, pix, round(g[0] * K), round(g[1] * K), s.flip, s.u + vv + 0.05, K, 0); } }
    if (ON.rail && per('storage_yard') > 0) {
      var tr = trainNow(st, t), stopped = tr && !tr.m.moving, u = stopped ? 24.0 : 23.55, v = 11.0, g2 = wp(u, v);
      E2.drawCit(B2, CZ.compose('unemployed', 77, stopped ? 'work' : 'idle', floor(t / (stopped ? 333 : 500)), Object.assign({ e2: e2 }, mo)), round(g2[0] * K), round(g2[1] * K), false, u + v + 0.05, K, 0);
    }
  }
  var baseAct = VL.drawActors._orig || VL.drawActors;
  var actW = function (B2, ctx, k) { baseAct(B2, ctx, k); try { actorsE3(B2, ctx, k); } catch (e) { /* never break the frame */ } }; actW._orig = baseAct; VL.drawActors = actW;

  /* ---------- 9. fakeState gains the Era 3 keys ---------- */
  var TECH3 = ['high_tech', 'oil', 'wharf', 'storage', 'trade', 'steel_container', 'smelting', 'titanium', 'cement', 'copper', 'explosives', 'military', 'science', 'axe', 'hammer', 'hoe'];
  var baseFake = G.SpriteKit.fakeState;
  var fakeW = function (mode) { var s = baseFake(mode); if (mode === 'protoplasm' || !s || !s.city) return s;
    TECH3.forEach(function (k) { if (s.tech[k] == null) s.tech[k] = 0; });
    s.city.factory = s.city.factory || { count: 0, on: 0, Lux: 0, Furs: 0, Alloy: 0, Polymer: 0, Nano: 0, Stanene: 0 };
    ['oil_well', 'oil_depot', 'wharf'].forEach(function (k) { s.city[k] = s.city[k] || { count: 0 }; }); s.city.oil_power = s.city.oil_power || { count: 0, on: 0 };
    return s; };
  fakeW._orig = baseFake; G.SpriteKit.fakeState = fakeW;

  /* ---------- 10. atelier sheets, samples, checks ---------- */
  var pv = E2.pv, rowP = E2.rowP;
  function withPJ(type, k, season, o) { var c = pv(type, 4, k, season, o), b = c.src, E = b.e3 || {}; if (E.pj) { var pj = P.sig_pumpjack, fr = E2.frameOf('sig_pumpjack', 1), q = new Pix(c.w, c.h); q.blit(c, 0, 0); q.blit(fr, E.pj[0] - pj.anchor[0] - c.ox0, E.pj[1] - pj.anchor[1] - c.oy0); q.src = b; q.ox0 = c.ox0; q.oy0 = c.oy0; return q; } return c; }
  function sheetBuildings(season) {
    var out = [];
    [['L', 'Luxury goods'], ['A', 'Alloy'], ['I', 'Idle (no line or no power)']].forEach(function (q) { out.push({ label: 'Factory · ' + q[1], pix: pv('factory', 4, 0, season, { on: true, e2: q[0] + (q[0] === 'I' ? 'd' : 'p') }) }); });
    out.push({ label: 'Factory · variant 2 · luxury', pix: pv('factory', 4, 1, season, { on: true, e2: 'Lp' }) });
    out.push({ label: 'Oil derrick · pumpjack at the foot', pix: withPJ('oil_well', 1, season, { on: true, e2: '-' }) }, { label: 'Oil derrick · flare stack (oil ≥ 4)', pix: withPJ('oil_well', 0, season, { on: true, e2: '~1' }) });
    out.push({ label: 'Fuel depot · 1 tank', pix: pv('oil_depot', 4, 0, season, { on: true, e2: '-' }) }, { label: 'Fuel depot · 2 tanks (count ≥ 3)', pix: pv('oil_depot', 4, 1, season, { on: true, e2: '~2' }) });
    out.push({ label: 'Oil powerplant · running', pix: pv('oil_power', 4, 0, season, { on: true }) }, { label: 'Oil powerplant · variant 2 · cold', pix: pv('oil_power', 4, 1, season, { on: false }) });
    out.push({ label: 'Wharf · pier, bollards, barrels, crates, cart', pix: pv('wharf', 4, 0, season, { on: true }) });
    return out;
  }
  function oilField(n, season, t) {
    t = t || 0; var W = 160, Hh = 140, p = new Pix(W, Hh), ox = 80, oy = 50, Pg = function (u, v) { return [ox + (u - v) * 16, oy + (u + v) * 8]; }, gr = season === 3 ? 'snow' : X.SEASONS[season].grass;
    X.fillPoly(p, [Pg(-0.3, -0.3), Pg(3.3, -0.3), Pg(3.3, 3.3), Pg(-0.3, 3.3)], function () { return R(gr, 1); });
    var lots = [[0, 0], [2, 0], [0, 2], [2, 2]].slice(0, n).map(function (q, i) { return { u: q[0] - 0, v: q[1], k: i }; }).sort(function (a, b) { return (a.u + a.v) - (b.u + b.v); });
    lots.forEach(function (l) { var b = VL.building('oil_well', 4, l.k, season, 0, { on: true, e2: l.k === 0 ? '~1' : '-' }), a = Pg(l.u, l.v); p.blit(b.pix, a[0] - b.ox, a[1] - b.oy);
      var E = b.e3 || {}, pj = P.sig_pumpjack; if (E.pj) p.blit(E2.frameOf('sig_pumpjack', SEQ[(floor(t / 250) + E.ph) % 4]), a[0] - b.ox + E.pj[0] - pj.anchor[0], a[1] - b.oy + E.pj[1] - pj.anchor[1]);
      if (E.flare) { var fs = X.sprite('fx_fire_' + (floor(t / 125) & 3)); p.blit(fs, a[0] - b.ox + E.flare[0] - 6, a[1] - b.oy + E.flare[1] - 15); } });
    return H.crop(p, 2);
  }
  function vehicleSheet() {
    var cells = [['veh_loco_front', 'loco · front (+v)'], ['veh_loco_rear', 'loco · rear (−v)'], ['veh_loco_front', 'loco · front mirrored (+u)', 1], ['veh_loco_rear', 'loco · rear mirrored (−u)', 1],
      ['veh_wagon_flat', 'flat + container'], ['veh_wagon_tank', 'tank'], ['veh_wagon_hopper', 'hopper + ore'], ['veh_wagon_box', 'boxcar'], ['veh_barge_front', 'barge · front'], ['veh_barge_rear', 'barge · rear'], ['veh_barge_front', 'barge · mirrored', 1], ['veh_barge_rear', 'barge · rear mirrored', 1]];
    var ps = cells.map(function (q, i) { var w = q[0].indexOf('wagon') > 0 ? wagonPix({ n: q[0], c: q[0] === 'veh_wagon_box' ? BODY[i % 7] : q[0] === 'veh_wagon_flat' ? 'teal' : null, load: q[0] === 'veh_wagon_hopper' ? 'rust' : '' }) : X.sprite(q[0]);
      if (q[2]) { var f = new Pix(w.w, w.h); for (var y = 0; y < w.h; y++) for (var x = 0; x < w.w; x++) f.d[y * w.w + (w.w - 1 - x)] = w.d[y * w.w + x]; w = f; } return w; });
    var out = rowP(ps, 6); out.labels = cells.map(function (q, i) { return (i + 1) + ' ' + q[1]; }); return out;
  }
  /* a 6-tile stretch of line with the yard siding: the train passes, or stands at the siding */
  function trainSheet(mode, t, season) {
    t = t || 0; season = season == null ? 1 : season;
    var W = 260, Hh = 170, p = new Pix(W, Hh), ox = 150, oy = 18, Pg = function (u, v, z) { return [ox + (u - v) * 16, oy + (u + v) * 8 - (z || 0)]; }, gr = season === 3 ? 'snow' : X.SEASONS[season].grass, T = new Uint8Array(W * Hh).fill(1);
    X.fillPoly(p, [Pg(-1.6, -0.5), Pg(1.2, -0.5), Pg(1.2, 7.5), Pg(-1.6, 7.5)], function () { return R(gr, 1); });
    var put = function (u0, v0, u1, v1) { var b = { w: W, h: Hh, d: p.d }; var du = u1 - u0, dv = v1 - v0, l = Math.hypot(du, dv), nu = -dv / l, nv = du / l, n = round(l / 0.13);
      for (var i = 0; i <= n; i++) { var u = u0 + du * i / n, v = v0 + dv * i / n, a = Pg(u - nu * 0.17, v - nv * 0.17), c = Pg(u + nu * 0.17, v + nv * 0.17); L(p, a, c, R('walnut', 3)); }
      [-0.1, 0.1].forEach(function (s, j) { L(p, Pg(u0 + nu * s, v0 + nv * s), Pg(u1 + nu * s, v1 + nv * s), R('iron', j ? 2 : 1)); }); };
    put(0.55, -0.5, 0.55, 7.5); put(0.55, 1.4, 0.0, 2.0); put(0.0, 2.0, 0.0, 4.35);
    var bs = P.sig_buffer_stop, bsp = Pg(0, 4.52); p.blit(X.sprite('sig_buffer_stop'), bsp[0] - bs.anchor[0], bsp[1] - bs.anchor[1]);
    var st = { tech: { oil: 1, steel_container: 1 } }, items = [];
    [['veh_wagon_tank', 2.55], ['veh_wagon_box', 3.53]].forEach(function (q, i) { items.push({ s: wagonPix({ n: q[0], c: i ? 'teal' : null }), u: 0, v: q[1] }); });
    var tw = P.sig_water_tower; items.push({ s: X.sprite('sig_water_tower'), u: -0.6, v: 1.4, an: tw.anchor });
    var cars = [], ws = [{ n: 'veh_wagon_box', c: 'madder' }, { n: 'veh_wagon_tank' }, { n: 'veh_wagon_flat', c: 'saffron' }, { n: 'veh_wagon_box', c: 'indigo' }], len = LOCO_L + ws.length * (WAG_L + GAP);
    var head = mode === 'stop' ? 3.0 + len / 2 : -len + ((t / 1000) * 1.2) % (8.5 + len);
    cars.push({ s: X.sprite('veh_loco_front'), an: P.veh_loco_front.anchor, u: 0.55, v: head - LOCO_L / 2 });
    ws.forEach(function (w, i) { var s = wagonPix(w); cars.push({ s: s, an: s.anchor, u: 0.55, v: head - LOCO_L - GAP - (i + 0.5) * (WAG_L + GAP) }); });
    items.concat(cars).sort(function (a, c) { return (a.u + a.v) - (c.u + c.v); }).forEach(function (q) { if (q.v < -0.1 || q.v > 7.2) return; var a = Pg(q.u, q.v), an = q.an || q.s.anchor; p.blit(q.s, a[0] - an[0], a[1] - an[1]); });
    var lc = cars[0], ch = [Pg(0.55, lc.v)[0] - round((1.23 - LOCO_L / 2) * 16), Pg(0.55, lc.v)[1] + round((1.23 - LOCO_L / 2) * 8) - 18];
    for (var k = 0; k < 6; k++) { var age = ((t / 1000 + k * 0.23) % 1.4) / 1.4, sz = 1 + floor(age * 2.99), x0 = ch[0] + round(age * (mode === 'stop' ? 3 : 14)), y0 = ch[1] - round(age * 9);
      for (var yy = 0; yy < sz; yy++) for (var xx = 0; xx < sz; xx++) p.set(x0 + xx, y0 + yy, R('cream', age < 0.45 ? 0 : 1)); }
    return H.crop(p, 2);
  }
  function wharfSheet(mode, t, season) {
    t = t || 0; season = season == null ? 1 : season;
    var W = 200, Hh = 120, p = new Pix(W, Hh), ox = 110, oy = 20, Pg = function (u, v) { return [ox + (u - v) * 16, oy + (u + v) * 8]; }, gr = season === 3 ? 'snow' : X.SEASONS[season].grass;
    X.fillPoly(p, [Pg(-1.3, -1), Pg(2.4, -1), Pg(2.4, 3), Pg(-1.3, 3)], function () { return R(gr, 1); });
    X.fillPoly(p, [Pg(-1.3, -1), Pg(1, -1), Pg(1, 3), Pg(-1.3, 3)], function (x, y) { return R('water', ((x >> 2) + y) % 9 ? 1 : 0); });
    var wb = VL.building('wharf', 4, 0, season, 0, { on: true }), a = Pg(0, 0.5), bv = mode === 'moored' ? 1.0 : 0.2 + ((t / 1000) * 0.3) % 2.6, front = mode === 'moored' || true, bn = 'veh_barge_front', bd = P[bn], g = Pg(-0.28, bv);
    var draw = [[-0.28 + bv, function () { p.blit(X.sprite(bn), g[0] - bd.anchor[0], g[1] - bd.anchor[1] + (floor(t / 700) % 2)); }], [0 + 0.5 + 1.5, function () { p.blit(wb.pix, a[0] - wb.ox, a[1] - wb.oy); }]];
    draw.sort(function (x, y) { return x[0] - y[0]; }).forEach(function (d) { d[1](); });
    return H.crop(p, 2);
  }
  var MODS = [['shed', 1, 'storage ≥ 4 · warehouse (roller doors on a dock)'], ['storage_yard', 2, 'trade ≥ 3 · siding water tower (railside yard)'], ['warehouse', 'A', 'steel_container ≥ 3 · bronze alloy containers'],
    ['smelter', 4, 'smelting ≥ 5 · oxygen rack + valve (whiter flame live)'], ['smelter', 8, 'titanium ≥ 1 · titanium ingots'], ['cement_plant', 16, 'cement ≥ 4 · rotary kiln + tall silo'], ['mine', 32, 'copper ≥ 1 · rotary kiln by the ore heap'],
    ['rock_quarry', 64, 'explosives ≥ 3 · ANFO sacks'], ['mine', 64, 'explosives ≥ 3 · ANFO sacks'], ['garrison', 128, 'military ≥ 4 · machine-gun nest']];
  function preOpts(t) { return VL.DYN[t] ? { af: 0, fq: 0.7, metal: 'steel', on: true } : undefined; }
  function era2E(t) { return { smelter: 'FV', mine: 'KHT', rock_quarry: 'KT', coal_mine: 'KHT', shed: 'B', warehouse: '-' }[t] || ''; }
  function sheetMods(season) {
    return MODS.map(function (m) { var base = Object.assign({}, preOpts(m[0]) || {}, { e2: era2E(m[0]) }), on = Object.assign({}, base, { e2: typeof m[1] === 'number' ? base.e2 + '~' + m[1] : (m[0] === 'warehouse' ? 'GA' : base.e2 + m[1]) });
      if (m[0] === 'warehouse') { base.e2 = 'G'; base.fq = on.fq = 0.9; }
      var k = 0; for (var q = 0; q < 12; q++) if (VL.typeTier(m[0], 4, q) === 4) { k = q; break; }
      return { label: m[0] + ' · ' + m[2], pix: rowP([pv(m[0], 4, k, season, base), pv(m[0], 4, k, season, on)], 8) }; });
  }
  function citizenSheet(t) {
    t = t || 0; var cells = [['soldier', 'guard', { military: 3 }, 'soldier · military 3'], ['soldier', 'guard', { military: 4 }, 'steel helmet · military 4'], ['soldier', 'walk', { military: 4, armor: 2 }, 'helmet + plate'],
      ['lumberjack', 'work', { axe: 5 }, 'titanium axe · axe 5'], ['quarry_worker', 'work', { hammer: 4 }, 'titanium hammer · hammer 4'], ['farmer', 'work', { hoe: 4 }, 'titanium hoe · hoe 4'],
      ['unemployed', 'walk', { carry: 'Barrel', e2: 'co' }, 'docker · barrel'], ['unemployed', 'walk', { carry: 'Crate', e2: 'co' }, 'docker · crate'], ['unemployed', 'work', { e2: 'co' }, 'rail worker']];
    var cw = 30, p = new Pix(cells.length * cw + 4, 36);
    cells.forEach(function (q, i) { var f = floor((t + i * 97) / (q[1] === 'walk' ? 125 : 333)), pix = CZ.compose(q[0], i, q[1], f, q[2]), gx = i * cw + 15, gy = 32;
      for (var k = -3; k <= 2; k++) p.set(gx + k, gy + 1, R('dirt', 2)); p.blit(pix, gx - CZ.AX, gy - CZ.AY); });
    p.labels = cells.map(function (q, i) { return (i + 1) + ' ' + q[3]; }); return p;
  }
  function helperSheet() {
    var p = new Pix(170, 70); for (var y = 0; y < 70; y++) for (var x = 0; x < 170; x++) p.d[y * 170 + x] = R('sky', 1);
    tank(p, [18, 60], 0.3, 22, 'cream'); tank(p, [52, 60], 0.24, 16, 'zinc'); tank(p, [82, 60], 0.36, 28, 'oxide');
    kiln(p, [104, 52], [150, 30], 4, { ramp: 'rust', ground: [62, 62] }); kiln(p, [112, 64], [140, 50], 3, { ramp: 'copper', ground: [68, 68] });
    derrick(p, [162, 64], 44, 'oxide'); return p;
  }
  function samples() {
    var out = [];
    [1, 3].forEach(function (s) { sheetBuildings(s).forEach(function (q) { out.push({ label: 'era3 ' + q.label + ' s' + s, pix: q.pix }); }); });
    sheetMods(1).forEach(function (q) { out.push({ label: 'era3 mod ' + q.label, pix: q.pix }); });
    out.push({ label: 'era3 vehicles', pix: vehicleSheet() }, { label: 'era3 oil field', pix: oilField(5, 1, 0) }, { label: 'era3 train pass', pix: trainSheet('pass', 3000, 1) }, { label: 'era3 train stop', pix: trainSheet('stop', 0, 3) },
      { label: 'era3 wharf moored', pix: wharfSheet('moored', 0, 1) }, { label: 'era3 citizens', pix: citizenSheet(0) }, { label: 'era3 helpers', pix: helperSheet() }, { label: 'era3 girder', pix: girderPix(1.3, true).pix });
    return out;
  }
  var baseS = VL.samples._orig || VL.samples;
  var samW = function () { return (baseS ? baseS() : []).concat(samples()); }; samW._orig = baseS; VL.samples = samW;
  function check(issues, notes) {
    var n = Object.keys(P).filter(function (k) { return P[k].b11; }).length; if (n !== 23) issues.push('era3: ' + n + ' batch-11 pieces, expected 23');
    var bad = 0; NEW.forEach(function (b) { [0, 1, 2].forEach(function (k) { [1, 3].forEach(function (s) { try { VL.building(b[0], 4, k, s, 0, VL.DYN[b[0]] ? VL.DYN[b[0]]({}, 0, { k: k, type: b[0] }) : undefined); } catch (e) { bad++; issues.push('era3: ' + b[0] + ' k' + k + ' s' + s + ' threw ' + e.message); } }); }); });
    try { var empty = {}; trainNow(empty, 5000); bargeAt(123456); factoryLook(empty, 0); wagonTypes(empty); sidingWagons(empty); railGeo(); patchSlots(empty); patchSlots({ tech: { high_tech: 3 } }); patchSlots(empty); } catch (e2) { issues.push('era3: empty state threw ' + e2.message); }
    var g = railGeo(); notes.push('era3: 23 pieces (25 images), lots ' + JSON.stringify(LOTS).replace(/"/g, '') + ', 5 buildings × 3 variants composed' + (bad ? ' with ' + bad + ' failure(s)' : '') + '; line at u = ' + RU + ' (east edge), ' + g.cross.length + ' level crossing(s), bridge ' + (g.bridge ? 'v ' + g.bridge[0].toFixed(1) + '–' + g.bridge[1].toFixed(1) : 'none') + '; loco ' + P.veh_loco_front.w + '×' + P.veh_loco_front.h + ', wagons ~20×20, barge ' + P.veh_barge_front.w + '×' + P.veh_barge_front.h);
  }

  SK.era3 = { tank: tank, kiln: kiln, derrick: derrick, train: trainNow, barge: bargeAt, rail: railGeo, sheetBuildings: sheetBuildings, sheetMods: sheetMods, oilField: oilField, vehicleSheet: vehicleSheet,
    trainSheet: trainSheet, wharfSheet: wharfSheet, citizenSheet: citizenSheet, helperSheet: helperSheet, NEW: NEW, TECH3: TECH3, LOTS: LOTS, ZONE: ZONE, RU: RU, SU: SU, check: check, on: function () { return ON; }, wellVis: wellVis, factoryLook: factoryLook };
  H.tank = tank; H.kiln = kiln; H.train = trainNow;
  }
})(window);
