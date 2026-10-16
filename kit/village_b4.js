/* Evolve village sprite kit — Batch 4 composers: industry (foundry, smelter, cement plant),
   commerce (trade post, bank), knowledge (library, university), society (temple, amphitheatre,
   barracks, hospital). Same conventions as Batch 3: composers take (type, tier, k, season, lvl, opts). */
(function (G) {
  'use strict';
  var SK = G.SK = G.SK || {};
  SK._ext = (SK._ext || []).filter(function (e) { return e.id !== 'b4'; });
  SK._ext.push({ id: 'b4', fn: reg });
  if (SK._runExt) SK._runExt();
  function reg() {
  if (!SK.village || !SK.village.B3 || !G.SpriteKit) return false;
  var VL = SK.village, H = VL.H, B = VL.B3;
  var frame = B.frame, put = B.put, spr = B.spr, ground = B.ground, shade = B.shade, setL = B.setL, stamp = B.stamp, mound = B.mound,
    post = B.post, stack = B.stack, chimney = B.chimney, roofDetail = B.roofDetail, ridgePt = B.ridgePt, leanTo = B.leanTo, C = B.C,
    out = B.out, annex = B.annex, hutDoor = B.hutDoor, ih = B.ih;
  function X() { return G.SpriteKit._; }
  var floor = Math.floor, round = Math.round, PI = Math.PI;

  /* ---------- helpers ---------- */
  /* arched opening on a wall face; fn(i, j, top) returns a colour */
  function opening(p, g, f, a0, wid, hgt, z0, fn) {
    for (var i = 0; i < wid; i++) {
      var top = hgt - ((i === 0 || i === wid - 1) && wid >= 4 ? 1 : 0), X0 = H.faceX(g, f, a0 + i), Yb = H.faceY(g, f, a0 + i) - z0;
      for (var j = 0; j < top; j++) { var c = fn(i, j, top); if (c) p.set(X0, Yb - j, c); }
    }
  }
  function archWin(p, g, f, a0, wid, hgt, z0, frameR, lit) {
    var x = X(), R = x.R, sh = f === 'R' ? 1 : 0;
    opening(p, g, f, a0, wid, hgt, z0, function (i, j, top) {
      if (i === 0 || i === wid - 1 || j === top - 1) return R(frameR, 2 + sh);
      if (j === 0) return R(frameR, 1 + sh);
      if (wid >= 5 && i === floor(wid / 2)) return R(frameR, 2 + sh);
      if (j === floor(hgt / 2)) return R(frameR, 2 + sh);
      if (!lit) return x.pal().ink;
      return (j > hgt - 4 && i === 1) ? x.pal().spark : R('ember', j < 3 ? 2 : 1);
    });
  }
  /* raised slab (top + both visible sides), z0 .. z1 */
  function slab(F, u0, v0, u1, v1, z1, ramp, z0, tex) {
    var x = X(), R = x.R, p = F.p, Pg = F.Pg; z0 = z0 || 0;
    var col = function (off) { return function (px, py) { return tex ? x.texC(tex, px, py, ramp, off) : R(ramp, off); }; };
    x.fillPoly(p, [Pg(u0, v1, z1), Pg(u1, v1, z1), Pg(u1, v1, z0), Pg(u0, v1, z0)], col(1));
    x.fillPoly(p, [Pg(u1, v1, z1), Pg(u1, v0, z1), Pg(u1, v0, z0), Pg(u1, v1, z0)], col(2));
    x.fillPoly(p, [Pg(u0, v0, z1), Pg(u1, v0, z1), Pg(u1, v1, z1), Pg(u0, v1, z1)], function () { return R(ramp, 0); });
    setL(p, Pg(u0, v1, z0), Pg(u1, v1, z0), R(ramp, 3)); setL(p, Pg(u1, v1, z0), Pg(u1, v0, z0), R(ramp, 4));
  }
  /* sign hanging from a bracket; dir +1 right, -1 left */
  /* the bracket is world art; the board itself is recorded and drawn at citizen resolution (see village drawActors) */
  var PEND = [];
  function outS(F, o) { var r = out(F, o); r.signs = PEND; PEND = []; return r; }
  function hangSign(p, x0, y0, dir, icon, map) {
    var x = X(), R = x.R;
    for (var i = 0; i < 6; i++) p.set(x0 + dir * i, y0, R('walnut', i ? 2 : 1));
    p.set(x0 + dir, y0 + 1, R('walnut', 3));
    var cx = x0 + dir * 4; p.set(cx, y0 + 1, R('iron', 2));
    PEND.push({ x: cx, y: y0 + 2, icon: icon, map: map || null });
    return;
    if (icon === 'cross') {
      for (var j = 0; j < 10; j++) for (var k = 0; k < 10; k++) {
        var edge = j === 0 || k === 0 || j === 9 || k === 9, cross = (j >= 3 && j <= 6 && k >= 1 && k <= 8) || (k >= 4 && k <= 5 && j >= 1 && j <= 8) && !(edge);
        var c = edge ? R('walnut', j === 9 || k === 9 ? 3 : 2) : ((j >= 4 && j <= 5 && k >= 2 && k <= 7) || (k >= 4 && k <= 5 && j >= 2 && j <= 7)) ? R('madder', 1) : R('cream', 0);
        p.set(cx - 5 + k, y0 + 2 + j, c);
      }
      return;
    }
    p.blit(x.sprite(icon, map), cx - 8, y0 - 1);
  }
  function ring(p, cc, r, z, ramp) {
    var R = X().R, ry = r / 2;
    for (var px = cc[0] - r; px < cc[0] + r; px++) { var dx = (px + 0.5 - cc[0]) / r; if (Math.abs(dx) >= 1) continue;
      var yb = cc[1] + round(ry * Math.sqrt(1 - dx * dx)) - 1 - z; p.set(px, yb, R(ramp, dx < 0.2 ? 1 : dx < 0.65 ? 2 : 3)); p.set(px, yb - 1, R(ramp, dx < 0.2 ? 0 : dx < 0.65 ? 1 : 2)); }
  }
  function smokeIf(o, pts) { return o.on === false ? [] : pts; }
  function wallFor(tier, v, a1, a2, a3) { return tier === 1 ? a1 : tier === 2 ? a2 : a3; }

  /* ---------- INDUSTRY ---------- */
  function foundry(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(2, 2, 72 + c.extra), p = F.p, metal = o.metal || 'iron', af = o.af | 0;
    ground(F, 0.05, 0.05, 1.95, 1.95, function () { return c.snow ? R('snow', 1) : R('ashen', 1); });
    if (!c.snow) B.chips(F, 0.1, 0.1, 1.9, 1.9, 'soot', 22, k + 5);
    var gc = put(F, { w: 0.3, d: 0.3, h: 34 + c.extra, plinth: 2, wall: tier === 3 ? { tex: 'tex_brick', ramp: 'brick' } : { tex: 'tex_drystone', ramp: 'river' }, roof: { type: 'flat', ramp: 'soot' }, snow: c.snow }, 1.4, 0.12);
    var top = gc.P(0.15, 0.15, gc.H);
    var spec = { w: 1.5, d: 1.05, h: 17 + v.dh + c.extra, plinth: tier === 2 ? 6 : 3,
      wall: wallFor(tier, v, { tex: 'tex_drystone', ramp: v.wi ? 'sandstone' : 'river' }, { tex: 'tex_planks', ramp: 'walnut' }, { tex: v.wi ? 'tex_cutstone' : 'tex_brick', ramp: v.wi ? 'sandstone' : 'brick' }),
      roof: { type: 'gable', axis: 'x', tex: c.m.roofTex, ramp: c.m.roofR, pitch: 2 }, snow: c.snow };
    annex(F, c, spec, -0.35, 0.65 + 1.05 - 0.5);
    var g = put(F, spec, 0.15, 0.65);
    roofDetail(p, g);
    var a0 = H.snap(round(g.w * 16 * 0.55), 'L', 6), fl = [[1, 2, 1], [2, 1, 2], [1, 1, 3]][((af % 3) + 3) % 3];
    opening(p, g, 'L', a0, 9, 10, 0, function (i, j, top) {
      if (i === 0 || i === 8 || j === top - 1) return R('river', 3);
      if (j < 3) return R('ember', fl[(i + j) % 3]);
      if (j === 3) return (i + af) % 2 ? R('ember', 3) : x.pal().ink;
      return x.pal().ink;
    });
    var gl = [H.faceX(g, 'L', a0 + 4), H.faceY(g, 'L', a0 + 4) + 1];
    for (var q = -3; q <= 3; q++) p.set(gl[0] + q, gl[1] + (q > 0 ? 1 : 0), R('ember', af % 3 === 1 ? 2 : 3));
    H.onFace(p, g, 'R', tier === 3 ? 'win_glazed' : 'win_shutter', { MAIN: v.paint2 }, H.snap(6, 'R', 6), 7);
    var an = F.Pg(0.7, 1.9); spr(p, 'sig_anvil', { METAL: metal, WOOD: 'walnut' }, an[0], an[1]);
    var rk = F.Pg(1.65, 1.85); post(p, [rk[0] - 8, rk[1] - 2], 7, 'walnut'); post(p, [rk[0] + 6, rk[1] + 1], 7, 'walnut');
    /* rack shows the crafted good with the most stock (city.foundry assignments), filled from resource stock */
    var cu = { Plywood: ['unit_plank', {}], Brick: ['unit_block', { MAIN: 'brick' }], Wrought_Iron: ['unit_bar', {}], Sheet_Metal: ['unit_sheet', {}] }[o.x] || ['unit_ingot', { MAIN: metal }];
    stack(p, rk[0], rk[1], cu[0], cu[1], 3, 6, 3, Math.min(1, (o.fq == null ? 0.35 : o.fq) + lvl * 0.15));
    if (v.acc.indexOf('barrel') >= 0) { var bp = F.Pg(1.9, 1.3); spr(p, 'barrel', { METAL: metal }, bp[0], bp[1]); }
    var sm = [[top[0] - 1, top[1] - 2], [top[0] + 1, top[1] - 3]];
    return outS(F, { roof: ridgePt(g, 0.5), h: 26 + c.extra, smoke: smokeIf(o, lvl >= 2 ? sm.concat([[top[0], top[1] - 4]]) : sm), emit: o.on !== false ? [[gl[0], gl[1] - 8, 'spark']] : [], v: v });
  }

  function smelter(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(2, 2, 76 + c.extra), p = F.p, metal = o.metal || 'iron', af = o.af | 0;
    ground(F, 0.1, 0.1, 1.9, 1.9, function () { return c.snow ? R('snow', 1) : R('dirt', 2); });
    if (tier >= 2) {
      var gs = put(F, { w: 0.6, d: 0.55, h: 11, plinth: tier === 3 ? 3 : 0, wall: tier === 3 ? { tex: 'tex_brick', ramp: 'brick' } : { tex: 'tex_planks', ramp: 'pinewood' },
        roof: { type: 'lean', axis: 'y', tex: c.m.roofTex, ramp: c.m.roofR }, snow: c.snow }, 1.3, 0.2);
      hutDoor(p, gs, 'L', c);
    }
    var r = 12, h = 20 + v.dh + c.extra, ramp = tier === 3 ? 'brick' : (v.wi ? 'ochre' : 'terracotta');
    put(F, { w: 1.2, d: 1.2, h: h, shape: 'round', r: r, plinth: tier >= 2 ? 3 : 0, plinthRamp: 'river',
      wall: { tex: tier === 3 ? 'tex_brick' : 'tex_wattle', ramp: ramp }, roof: { type: 'cone', tex: 'tex_wattle', ramp: ramp, H: 12 }, snow: c.snow }, 0.35, 0.35);
    var cc = F.Pg(0.95, 0.95);
    ring(p, cc, r, round(h * 0.55), tier === 1 ? 'walnut' : metal);
    if (tier === 3) ring(p, cc, r, 4, metal);
    var cz = h + 12 - 5;
    put(F, { w: 0.25, d: 0.25, h: 9, shape: 'round', r: 3, wall: { tex: 'tex_brick', ramp: tier === 1 ? 'terracotta' : 'brick' }, roof: { type: 'none' } }, 0.825, 0.825, cz);
    var ct = [cc[0], cc[1] - cz - 9];
    p.set(ct[0] - 1, ct[1], x.pal().ink); p.set(ct[0], ct[1], x.pal().ink); p.set(ct[0] - 2, ct[1], R('brick', 3)); p.set(ct[0] + 1, ct[1], R('brick', 3));
    var th = [cc[0] - 1, cc[1] + round(r / 2) - 5], pulse = [1, 0, 1, 2][af & 3];
    for (var j = -2; j <= 2; j++) for (var i = -2; i <= 2; i++) {
      var e = Math.abs(i) === 2 || Math.abs(j) === 2;
      if (e && Math.abs(i) + Math.abs(j) === 4) continue;
      p.set(th[0] + i, th[1] + j, e ? R(ramp, 4) : (i === 0 && j === 0 ? R('ember', pulse) : R('ember', pulse + 1)));
    }
    if (tier >= 2) for (var q = 0; q < 6; q++) p.set(th[0] - 2 - q, th[1] + 4 + floor(q / 2), R('ember', q < 2 ? pulse + 1 : 3));
    var mh = F.Pg(0.35, 1.7); mound(p, mh[0], mh[1], 8, 6, 'tex_drystone', metal === 'copper' ? 'copper' : 'rust', { cone: true, cap: c.snow ? ['snow', 1] : null });
    if (lvl >= 1 || (o.fq || 0) > 0.05) { var ms = F.Pg(1.6, 1.65); stack(p, ms[0], ms[1], 'unit_ingot', { MAIN: metal }, 2, 6, 3, o.fq == null ? 1 : Math.max(lvl ? 0.34 : 0, o.fq)); }
    if (v.acc.indexOf('lantern') >= 0) { var lp = F.Pg(1.75, 1.2); post(p, lp, 11, 'walnut'); p.blit(x.sprite('lantern', { ACCENT: v.paint }), lp[0] + 1, lp[1] - 10); }
    return outS(F, { roof: ct, h: 34 + c.extra, smoke: smokeIf(o, lvl >= 2 ? [[ct[0], ct[1] - 1], [ct[0] - 1, ct[1] - 2]] : [[ct[0], ct[1] - 1]]), v: v });
  }

  function cement_plant(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(2, 2, 62 + c.extra), p = F.p, metal = o.metal || 'iron', emit = [];
    ground(F, 0.05, 0.05, 1.95, 1.95, function () { return c.snow ? R('snow', 0) : R('ashen', 0); });
    if (!c.snow) B.chips(F, 0.1, 0.1, 1.9, 1.9, 'ashen', 28, k + 9);
    var spec = { w: 0.85, d: 0.8, h: 17 + v.dh + c.extra, plinth: c.m.plinth, wall: wallFor(tier, v, { tex: 'tex_wattle', ramp: 'lime' }, c.m.wall, { tex: 'tex_brick', ramp: 'brick' }),
      roof: { type: 'gable', axis: 'y', tex: c.m.roofTex, ramp: c.m.roofR, pitch: 2 }, snow: c.snow };
    var g = put(F, spec, 0.12, 0.12); roofDetail(p, g); hutDoor(p, g, 'R', c);
    H.onFace(p, g, 'L', tier === 3 ? 'win_glazed' : 'win_shutter', { MAIN: v.paint2 }, H.snap(5, 'L', 6), 6);
    var smoke = [];
    if (tier >= 2) smoke.push(chimney(p, g, ridgePt(g, 0.35)));
    var hp = F.Pg(1.3, 0.55); spr(p, 'sig_hopper', { MAIN: 'ashen', WOOD: 'pinewood' }, hp[0], hp[1]);
    emit.push([hp[0], hp[1] - 9, 'dust']);
    var body = tier === 1 ? 'terracotta' : metal, hoop = tier === 1 ? 'walnut' : 'soot', zc = 8, rr = 4, u0 = 0.55, u1 = 1.85, vk = 1.3;
    [0.75, 1.25, 1.7].forEach(function (u) {
      var a = F.Pg(u, vk);
      if (tier === 3) slab(F, u - 0.07, vk - 0.07, u + 0.07, vk + 0.07, zc - 3, 'river');
      else { post(p, [a[0] - 3, a[1] - 1], zc - 3, 'walnut'); post(p, [a[0] + 2, a[1] + 1], zc - 3, 'walnut'); }
    });
    var A = F.Pg(u0, vk, zc), L = round((u1 - u0) * 16);
    for (var s = 0; s <= L; s++) {
      var cx = A[0] + s, cy = A[1] + floor(s / 2), front = s === L, hp2 = s % 9 === 4 && !front;
      for (var j = -rr; j <= rr; j++) for (var i = -rr; i <= rr; i++) {
        var dd = i * i + j * j; if (dd > rr * rr + 1) continue;
        var rim = dd > (rr - 1) * (rr - 1) + 1, l = j + i * 0.3, tn = l < -1.5 ? 0 : l < 1 ? 1 : 2;
        var col = hp2 ? R(hoop, tn + 1) : R(body, tn + (rim && !front ? 1 : 0));
        if (front) col = rim ? R(body, 3) : (dd <= 2 ? R('ember', dd ? 2 : 1) : R(body, 0));
        p.set(cx + i, cy + j, col);
      }
    }
    emit.push([A[0] + L, A[1] + floor(L / 2) - 2, 'dust']);
    var sk = F.Pg(0.45, 1.75); stack(p, sk[0], sk[1], 'unit_sack', { MAIN: 'ashen', ACCENT: 'soot' }, 3, 6, 4, Math.min(1, (o.fq == null ? 0.45 : o.fq) + lvl * 0.15));
    if (v.acc.indexOf('tool_lean') >= 0 || tier === 1) { var tp = F.Pg(0.95, 0.95); spr(p, 'tool_lean', { METAL: metal }, tp[0], tp[1]); }
    return outS(F, { roof: ridgePt(g, 0.5), h: 28 + c.extra, smoke: smokeIf(o, smoke), emit: o.on !== false ? emit : [], v: v });
  }

  /* ---------- COMMERCE ---------- */
  function awning(p, g, u0, u1, zt, zb, depth, ra, rb) {
    var x = X(), R = x.R, P = g.P, d = g.d, base = P(0, d, 0)[0];
    x.fillPoly(p, [P(u0, d, zt), P(u1, d, zt), P(u1, d + depth, zb), P(u0, d + depth, zb)], function (px, py) {
      return floor((px - base) / 3) % 2 ? R(ra, 1) : R(rb, 0);
    });
    var A = P(u0, d + depth, zb), Bp = P(u1, d + depth, zb);
    for (var xx = A[0]; xx <= Bp[0]; xx++) {
      var yy = round(A[1] + (xx - A[0]) / 2), st = floor((xx - base) / 3) % 2;
      p.set(xx, yy, st ? R(ra, 2) : R(rb, 1));
      if ((xx - A[0]) % 3 === 1) p.set(xx, yy + 1, st ? R(ra, 3) : R(rb, 2));
    }
    var Rt = P(u1, d, zt); setL(p, Rt, Bp, R(rb, 2));
  }
  function trade(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(2, 1, 56 + c.extra), p = F.p;
    var pole = F.Pg(1.88, 0.12); post(p, pole, 17 + c.extra, 'oak');
    var spec = { w: 1.3, d: 0.65, h: 13 + v.dh + c.extra, plinth: c.m.plinth, wall: c.m.wall, roof: { type: 'gable', axis: 'x', tex: c.m.roofTex, ramp: c.m.roofR, pitch: 2 }, snow: c.snow };
    var g = put(F, spec, 0.12, 0.12); roofDetail(p, g);
    hutDoor(p, g, 'R', c);
    H.onFace(p, g, 'L', 'win_shutter', { MAIN: v.paint2 }, H.snap(4, 'L', 6), 6);
    var cA = g.P(0.25, g.d + 0.3, 0), cB = g.P(1.05, g.d + 0.3, 0);
    post(p, cA, 8, 'oak'); post(p, cB, 8, 'oak');
    var cr = g.P(0.55, g.d + 0.18, 0); stack(p, cr[0], cr[1], 'unit_crate', {}, 2, 7, 5, Math.min(1, 0.67 + lvl * 0.2));
    var sk = g.P(0.95, g.d + 0.2, 0); spr(p, 'unit_sack', { MAIN: 'sand', ACCENT: v.paint2 }, sk[0], sk[1]);
    awning(p, g, 0.1, 1.2, 11, 8, 0.36, v.paint, 'cream');
    var cart = F.Pg(1.68, 0.92); spr(p, 'sig_cart', { MAIN: 'oak', ACCENT: v.ri === 0 ? 'sage' : 'autumn', METAL: 'iron' }, cart[0], cart[1]);
    var sc = g.P(g.w, g.d, g.H - 1); hangSign(p, sc[0] + 1, sc[1], 1, 'ic_coin', { MAIN: 'gold' });
    VL.bunt(p, ridgePt(g, 0.98), [pole[0], pole[1] - 17 - c.extra], k * 0.37 % 1);
    return outS(F, { roof: ridgePt(g, 0.5), h: 18 + c.extra, v: v });
  }

  function bank(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(2, 1, 62 + c.extra), p = F.p, metal = o.metal || 'iron';
    var stone = v.wi ? 'sandstone' : 'river';
    var wall = wallFor(tier, v, { tex: 'tex_logs', ramp: 'oak' }, { tex: 'tex_planks', ramp: 'walnut' }, { tex: 'tex_cutstone', ramp: stone });
    var spec = { w: 1.7, d: 0.7, h: 16 + v.dh + c.extra, plinth: 3, plinthTex: tier === 3 ? 'tex_cutstone' : undefined, plinthRamp: stone, wall: wall,
      roof: tier === 3 ? { type: 'hip', tex: 'tex_tiles', ramp: c.m.roofR, pitch: 0 } : { type: 'gable', axis: 'x', tex: c.m.roofTex, ramp: c.m.roofR, pitch: 1 }, snow: c.snow };
    var g = put(F, spec, 0.12, 0.15); roofDetail(p, g);
    var P = g.P, d = g.d, w = g.w, Hh = g.H, pr = tier === 1 ? 'oak' : tier === 2 ? 'walnut' : stone;
    if (tier >= 2) {
      var e = 0.05, A = P(0.32, d + e, Hh - 1), Bq = P(w - 0.32, d + e, Hh - 1), Ap = P(w / 2, d + e, Hh + 8);
      setL(p, P(0, d + e, Hh - 2), P(w, d + e, Hh - 2), R(pr, 2)); setL(p, P(0, d + e, Hh - 1), P(w, d + e, Hh - 1), R(pr, 1));
      x.fillPoly(p, [A, Bq, Ap], function () { return R(pr, 0); });
      x.fillPoly(p, [P(0.5, d + e, Hh + 0.5), P(w - 0.5, d + e, Hh + 0.5), P(w / 2, d + e, Hh + 5.5)], function () { return R(pr, 1); });
      setL(p, A, Ap, R(pr, 3)); setL(p, Ap, Bq, R(pr, 3)); setL(p, A, Bq, R(pr, 3));
      var disc = P(w / 2, d + e, Hh + 3); p.set(disc[0], disc[1], R('gold', 1)); p.set(disc[0] + 1, disc[1], R('gold', 2));
    }
    var da = H.snap(round(w * 8) - 3, 'L', 6);
    H.onFace(p, g, 'L', tier === 3 ? 'door_arched' : 'door_plain', { MAIN: tier === 1 ? 'oak' : v.paint, ACCENT: 'gold', METAL: 'gold' }, da, 0);
    var wa = H.snap(4, 'L', 6);
    H.onFace(p, g, 'L', 'win_glazed', { WOOD: tier === 3 ? 'walnut' : 'oak' }, wa, 6);
    for (var b = 1; b <= 4; b += 3) { var bx = H.faceX(g, 'L', wa + b), by = H.faceY(g, 'L', wa + b) - 6; for (var q = 1; q <= 5; q++) p.set(bx, by - q, R(metal, 2)); }
    H.onFace(p, g, 'R', 'win_glazed', { WOOD: 'walnut' }, H.snap(3, 'R', 6), 6);
    [0.55, w - 0.42].forEach(function (u) { var cp = P(u, d + 0.14, 0); spr(p, 'column', { MAIN: pr }, cp[0], cp[1] + 1); });
    slab(F, 0.12 + w * 0.5 - 0.22, 0.15 + d, 0.12 + w * 0.5 + 0.22, 0.15 + d + 0.12, 2, stone);
    /* coin stack from resource.Money */
    var mq = o.fq == null ? 0.6 : o.fq; if (mq > 0.05) { var cs = P(w - 0.2, d + 0.3, 0); stack(p, cs[0], cs[1], 'unit_coin', {}, 3, 6, 3, mq); }
    var sc = P(w, d, Hh - 2); hangSign(p, sc[0] + 1, sc[1], 1, 'ic_coin', { MAIN: 'gold' });
    if (v.acc.length && tier >= 2) { var pp = P(0.1, d + 0.12, 0); spr(p, 'pot_flowers', { ACCENT: v.bloom, FOLIAGE: c.fol }, pp[0], pp[1]); }
    return outS(F, { roof: tier === 3 ? P(w / 2, d / 2, Hh + g.rh) : ridgePt(g, 0.5), h: 24 + c.extra, v: v });
  }

  /* ---------- KNOWLEDGE ---------- */
  function library(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(2, 1, 62 + c.extra), p = F.p;
    var wall = wallFor(tier, v, { tex: 'tex_logs', ramp: v.wi ? 'walnut' : 'oak' }, { tex: 'tex_planks', ramp: v.wi ? 'driftwood' : 'pinewood' }, { tex: v.wi ? 'tex_cutstone' : 'tex_brick', ramp: v.wi ? 'sandstone' : 'brick' });
    var spec = { w: 1.7, d: 0.7, h: 17 + v.dh + c.extra, plinth: c.m.plinth, wall: wall, roof: { type: 'gable', axis: 'x', tex: c.m.roofTex, ramp: c.m.roofR, pitch: 3 }, snow: c.snow };
    if (lvl >= 1) put(F, { w: 0.5, d: 0.45, h: 10, plinth: c.m.plinth ? 2 : 0, wall: wall, roof: { type: 'lean', axis: 'y', tex: c.m.roofTex, ramp: c.m.roofR }, snow: c.snow }, -0.32, 0.4);
    var g = put(F, spec, 0.12, 0.15); roofDetail(p, g);
    var fr = tier === 3 ? 'walnut' : 'oak', hh = tier === 1 ? 7 : 10, zw = (c.m.plinth || 1) + 1;
    [3, 10, 17].forEach(function (a, i) { archWin(p, g, 'L', H.snap(a, 'L', 4), tier === 1 ? 4 : 5, hh, zw, fr, (i + k) % 3 !== 2); });
    if (c.extra) [3, 10, 17].forEach(function (a) { archWin(p, g, 'L', H.snap(a, 'L', 4), 5, 6, zw + 12, fr, true); });
    H.onFace(p, g, 'L', 'flowerbox', { ACCENT: v.bloom, FOLIAGE: c.fol }, H.snap(23, 'L', 6), zw + 1);
    hutDoor(p, g, 'R', c);
    if (tier >= 2) H.onFace(p, g, 'R', 'ladder', { WOOD: 'pinewood' }, H.snap(8, 'R', 4), 0);
    [0.25, 1.2].forEach(function (u, i) { var pp = g.P(u, g.d + 0.12, 0); spr(p, 'pot_flowers', { ACCENT: i ? v.bloom : 'saffron', FOLIAGE: c.fol }, pp[0], pp[1]); });
    var sc = g.P(g.w, g.d, g.H - 2); hangSign(p, sc[0] + 1, sc[1], 1, 'ic_book', { MAIN: v.paint, ACCENT: 'cream' });
    var smoke = [];
    if (tier >= 2 && v.chim) smoke.push(chimney(p, g, ridgePt(g, 0.25)));
    return outS(F, { roof: ridgePt(g, 0.5), h: 24 + c.extra, smoke: smoke, v: v });
  }

  function university(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(2, 2, 84 + c.extra), p = F.p;
    var wall = wallFor(tier, v, { tex: 'tex_logs', ramp: 'oak' }, { tex: 'tex_planks', ramp: 'pinewood' }, { tex: 'tex_cutstone', ramp: v.wi ? 'river' : 'sandstone' });
    var spec = { w: 1.7, d: 1.25, h: 21 + c.extra, plinth: 3, wall: wall, roof: { type: 'hip', tex: c.m.roofTex, ramp: c.m.roofR, pitch: 1 }, snow: c.snow };
    if (tier >= 2) { spec.wall2 = { tex: 'hd_halftimber', ramp: tier === 3 ? 'lime' : 'cream', z: 11, map: { WOOD: 'walnut' } }; spec.bandRamp = 'walnut'; }
    var g = put(F, spec, 0.15, 0.4);
    var flagR = [v.paint, v.paint2];
    [[0.12, g.d], [g.w - 0.1, g.d]].forEach(function (q, i) { var fp = g.P(q[0], q[1], g.H); spr(p, 'flag', { ACCENT: flagR[i] }, fp[0], fp[1] + 1, { flip: i === 1 }); });
    var winN = tier === 3 ? 'win_glazed' : 'win_shutter', wm = { MAIN: v.paint2, WOOD: 'walnut' };
    [3, 21].forEach(function (a) { H.onFace(p, g, 'L', winN, wm, H.snap(a, 'L', 6), 5); H.onFace(p, g, 'L', winN, wm, H.snap(a, 'L', 6), 14); });
    [4, 13].forEach(function (a) { H.onFace(p, g, 'R', winN, wm, H.snap(a, 'R', 6), 5); H.onFace(p, g, 'R', winN, wm, H.snap(a, 'R', 6), 14); });
    if (v.ivy || tier === 3) H.onFace(p, g, 'L', 'hd_ivy', { FOLIAGE: season === 3 ? 'frost' : 'conifer', ACCENT: v.bloom }, 1, 3);
    var ts = { w: 0.5, d: 0.5, h: 31 + c.extra, plinth: 3, wall: wall, roof: { type: 'hip', tex: c.m.roofTex, ramp: c.m.roofR, pitch: 5 }, snow: c.snow };
    if (tier >= 2) { ts.wall2 = spec.wall2; ts.bandRamp = 'walnut'; }
    var gt = put(F, ts, 0.75, 1.42);
    var ck = [H.faceX(gt, 'L', 0), H.faceY(gt, 'L', 4) - (gt.H - 3)];
    p.blit(x.sprite('sig_clock', { MAIN: tier === 1 ? 'oak' : 'sandstone', ACCENT: 'cream' }), ck[0], ck[1]);
    H.onFace(p, gt, 'L', 'door_arched', { MAIN: v.paint, ACCENT: v.paint2, METAL: 'bronze' }, 1, 0);
    H.onFace(p, gt, 'R', winN, wm, H.snap(1, 'R', 6), 16);
    var ap = gt.P(0.25, 0.25, gt.H + gt.rh); spr(p, 'flag', { ACCENT: v.paint }, ap[0], ap[1] + 1);
    [3, 2, 1].forEach(function (z, i) { var e = 0.03 * i; slab(F, 0.8 - e, 1.92 + i * 0.07, 1.2 + e, 1.99 + i * 0.07, z, 'river'); });
    return outS(F, { roof: ap, h: 34 + c.extra, v: v });
  }

  /* ---------- SOCIETY ---------- */
  function temple(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(2, 2, 76 + c.extra), p = F.p;
    var stone = v.wi ? 'sandstone' : 'river';
    slab(F, 0.05, 0.05, 1.95, 1.95, 3, stone, 0, 'tex_cutstone');
    slab(F, 0.22, 0.22, 1.78, 1.78, 6, stone, 3, 'tex_cutstone');
    if (c.snow) ground(F, 0.22, 0.22, 1.78, 1.78, function () { return 0; });
    var wall = wallFor(tier, v, { tex: 'tex_wattle', ramp: 'ochre' }, { tex: 'tex_drystone', ramp: stone }, { tex: 'tex_cutstone', ramp: stone });
    var spec = { w: 0.98, d: 1.2, h: 14 + c.extra, wall: wall, roof: { type: 'gable', axis: 'y', tex: c.m.roofTex, ramp: c.m.roofR, pitch: 4 }, snow: c.snow };
    var g = put(F, spec, 0.4, 0.4, 6); roofDetail(p, g);
    var bt = { w: 0.36, d: 0.36, h: 31 + c.extra, wall: wall, roof: { type: 'hip', tex: c.m.roofTex, ramp: c.m.roofR, pitch: 4 }, snow: c.snow };
    var gb = put(F, bt, 1.42, 0.28, 6);
    var bl = [H.faceX(gb, 'L', 0), H.faceY(gb, 'L', 0) - (gb.H - 2)];
    for (var j = 0; j < 9; j++) for (var i = 0; i < 6; i++) p.set(bl[0] + i, bl[1] + j + floor(i / 2), (i === 0 || j === 0) ? R(wall.ramp, 4) : x.pal().ink);
    p.blit(x.sprite('sig_bell', { METAL: 'bronze', WOOD: 'walnut' }), bl[0], bl[1] + 1);
    H.onFace(p, gb, 'L', 'win_shutter', { MAIN: v.paint2 }, 0, 6);
    var da = H.snap(round(g.w * 8) - 3, 'L', 6);
    H.onFace(p, g, 'L', 'door_arched', { MAIN: v.paint, ACCENT: 'saffron', METAL: 'gold' }, da, 0);
    if (tier >= 2) H.faceStrip(p, g, 'L', 'hd_lintel', { ACCENT: v.paint2 }, da - 2, 10, 9);
    archWin(p, g, 'R', H.snap(4, 'R', 4), 4, 8, 3, 'walnut', true);
    archWin(p, g, 'R', H.snap(12, 'R', 4), 4, 8, 3, 'walnut', true);
    [0.05, g.w - 0.05].forEach(function (u) { var lp = g.P(u, g.d, g.H); setL(p, lp, [lp[0], lp[1] + 2], R('straw', 3)); p.blit(x.sprite('lantern', { ACCENT: v.paint2 }), lp[0] - 1, lp[1] + 2); });
    if (tier >= 2) VL.bunt(p, gb.P(0, 0.36, gb.H), ridgePt(g, 0.15), (k * 0.53) % 1);
    var br = F.Pg(0.62, 1.92, 3);
    stamp(p, ['.0110.', '012223', '.2333.'], br[0] - 3, br[1] - 3, 'bronze');
    p.set(br[0], br[1] - 4, R('ember', 1));
    return outS(F, { roof: gb.P(0.18, 0.18, gb.H + gb.rh), h: 34 + c.extra, smoke: [[br[0], br[1] - 6]], v: v, thin: true });
  }

  function amphitheatre(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(2, 2, 36), p = F.p, Pg = F.Pg;
    var n = tier + 2, cu = 0.5, cv = 0.5, r0 = 0.45, rmax = 1.42, wd = (rmax - r0) / n, step = tier === 1 ? 2 : 2;
    var mat = tier === 1 ? { top: c.snow ? 'snow' : c.fol, wall: 'dirt', tex: 'tex_drystone' } : tier === 2 ? { top: c.snow ? 'snow' : 'pinewood', wall: 'walnut', tex: 'tex_planks' } : { top: c.snow ? 'snow' : 'sandstone', wall: 'sandstone', tex: 'tex_cutstone' };
    var A0 = -PI / 4, A1 = 3 * PI / 4, N = 28;
    function arc(r, z, rev) { var pts = []; for (var i = 0; i <= N; i++) { var t = rev ? 1 - i / N : i / N, a = A0 + (A1 - A0) * t; pts.push(Pg(cu + r * Math.cos(a), cv + r * Math.sin(a), z)); } return pts; }
    slab(F, 0.27, 0.27, 0.73, 0.73, 3, tier === 1 ? 'oak' : 'walnut');
    var cb = Pg(0.33, 0.33, 3); spr(p, 'sig_curtain', { MAIN: v.paint, ACCENT: v.paint2, WOOD: 'walnut' }, cb[0], cb[1] + 1);
    for (var i = 1; i <= n; i++) {
      var ri = r0 + (i - 1) * wd, ro = r0 + i * wd, z = i * step;
      x.fillPoly(p, arc(ro, z).concat(arc(ri, z, true)), function () { return R(mat.top, (i % 2) ? 0 : 1); });
      arc(ri, z).forEach(function (q, j, all) { if (j) setL(p, all[j - 1], q, R(mat.top, 3)); });
    }
    var zt = n * step, cx0 = Pg(cu, cv)[0];
    x.fillPoly(p, arc(rmax, zt).concat(arc(rmax, 0, true)), function (px, py) { return x.texC(mat.tex, px, py, mat.wall, px < cx0 ? 1 : 2); });
    arc(rmax, 0).forEach(function (q, j, all) { if (j) setL(p, all[j - 1], q, R(mat.wall, 4)); });
    arc(rmax, zt).forEach(function (q, j, all) { if (j) setL(p, all[j - 1], q, R(mat.top, 2)); });
    var seats = round((o.fq || 0) * 16), CL = ['madder', 'indigo', 'saffron', 'teal', 'plum', 'sage'], SKN = ['skin_fair', 'skin_tan', 'skin_deep'];
    for (var s = 0; s < seats; s++) {
      var ring = 2 + floor(ih(s, k) * (n - 1)), a = A0 + 0.15 + ih(k, s) * (A1 - A0 - 0.3), rr = r0 + (ring - 0.5) * wd, q = Pg(cu + rr * Math.cos(a), cv + rr * Math.sin(a), ring * step);
      var cl = CL[floor(ih(s, 3) * CL.length)], sk = SKN[floor(ih(s, 4) * 3)];
      p.set(q[0], q[1] - 3, R(sk, 1)); p.set(q[0] + 1, q[1] - 3, R(sk, 2));
      p.set(q[0], q[1] - 2, R(cl, 1)); p.set(q[0] + 1, q[1] - 2, R(cl, 2)); p.set(q[0], q[1] - 1, R(cl, 2)); p.set(q[0] + 1, q[1] - 1, R(cl, 3));
    }
    if (tier >= 2) { var lp = Pg(0.12, 0.9), rp = Pg(0.9, 0.12); [lp, rp].forEach(function (q) { post(p, q, 12, 'walnut'); p.blit(x.sprite('lantern', { ACCENT: v.paint2 }), q[0] - 1, q[1] - 12); }); VL.bunt(p, [lp[0] + 1, lp[1] - 12], [rp[0], rp[1] - 12], (k * 0.29) % 1); }
    return outS(F, { roof: Pg(0.5, 0.5, 13), h: 16, noShadow: true, v: v });
  }

  function garrison(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(2, 1, 52 + c.extra), p = F.p, Pg = F.Pg, metal = o.metal || 'iron';
    var wr = tier === 2 ? 'walnut' : 'oak';
    function stakes(a, b) {
      var A = Pg(a[0], a[1]), Bq = Pg(b[0], b[1]), L = Math.hypot(Bq[0] - A[0], Bq[1] - A[1]), n = floor(L / 3);
      for (var i = 0; i <= n; i++) {
        var t = n ? i / n : 0, x0 = round(A[0] + (Bq[0] - A[0]) * t), y0 = round(A[1] + (Bq[1] - A[1]) * t), hh = 11 + floor(ih(i + a[0] * 17, k) * 3);
        for (var j = 0; j < hh; j++) { p.set(x0, y0 - j, R(wr, 1)); p.set(x0 + 1, y0 - j, R(wr, j < 2 ? 4 : 3)); }
        p.set(x0, y0 - hh, R(wr, 0)); if (j === hh) p.set(x0 + 1, y0 - hh, R(wr, 2));
        p.set(x0, y0 - hh - 1, R(wr, 1));
        p.set(x0, y0 - 6, R('straw', 3)); p.set(x0 + 1, y0 - 6, R('straw', 4));
        if (tier === 3) { p.set(x0, y0 + 1, R('river', 1)); p.set(x0 + 1, y0 + 1, R('river', 2)); p.set(x0, y0, R('river', 1)); p.set(x0 + 1, y0, R('river', 3)); }
      }
    }
    stakes([0.05, 0.95], [0.05, 0.05]); stakes([0.05, 0.05], [1.95, 0.05]);
    var spec = { w: 1.3, d: 0.55, h: 12 + v.dh + c.extra, plinth: c.m.plinth, wall: c.m.wall, roof: { type: 'gable', axis: 'x', tex: c.m.roofTex, ramp: c.m.roofR, pitch: 2 }, snow: c.snow };
    var g = put(F, spec, 0.35, 0.22); roofDetail(p, g);
    var da = H.snap(round(g.w * 8) - 3, 'L', 6);
    H.onFace(p, g, 'L', tier === 1 ? 'door_plain' : 'door_plain', { MAIN: tier === 1 ? 'oak' : v.paint }, da, 0);
    H.onFace(p, g, 'L', 'win_shutter', { MAIN: v.paint2 }, H.snap(3, 'L', 6), 6);
    H.onFace(p, g, 'L', 'win_shutter', { MAIN: v.paint2 }, H.snap(15, 'L', 6), 6);
    var smoke = [];
    if (tier >= 2) smoke.push(chimney(p, g, ridgePt(g, 0.8)));
    var fp = Pg(1.88, 0.18); post(p, fp, 8, 'oak'); spr(p, 'flag', { ACCENT: v.paint }, fp[0], fp[1] - 7);
    var wrp = Pg(0.4, 0.95); spr(p, 'sig_weapon_rack', { MAIN: v.paint, ACCENT: 'cream', METAL: metal, WOOD: 'oak' }, wrp[0], wrp[1]);
    var dm = Pg(1.72, 0.82); post(p, [dm[0], dm[1]], 10, 'oak');
    setL(p, [dm[0] - 3, dm[1] - 8], [dm[0] + 4, dm[1] - 8], R('oak', 2));
    stamp(p, ['.00.', '0112', '1122', '.22.'], dm[0] - 1, dm[1] - 14, 'straw');
    stamp(p, ['0112', '0112', '1223'], dm[0] - 1, dm[1] - 7, 'hide');
    return outS(F, { roof: ridgePt(g, 0.5), h: 20 + c.extra, smoke: smokeIf(o, smoke), v: v });
  }

  function hospital(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(2, 1, 56 + c.extra), p = F.p, Pg = F.Pg;
    var wall = wallFor(tier, v, { tex: 'tex_wattle', ramp: 'lime' }, { tex: 'tex_wattle', ramp: v.wi ? 'cream' : 'lime' }, { tex: 'tex_wattle', ramp: v.wi ? 'rosewash' : 'lime' });
    var spec = { w: 1.35, d: 0.65, h: 14 + v.dh + c.extra, plinth: tier === 1 ? 0 : 3, plinthTex: tier === 3 ? 'tex_brick' : undefined, plinthRamp: tier === 3 ? 'brick' : 'river',
      wall: wall, roof: { type: 'gable', axis: 'x', tex: c.m.roofTex, ramp: c.m.roofR, pitch: 2 }, snow: c.snow };
    var g = put(F, spec, 0.1, 0.15); roofDetail(p, g);
    var da = H.snap(13, 'L', 6), z0 = 0;
    opening(p, g, 'L', da, 6, 10, z0, function (i, j, top) {
      if (i === 0 || i === 5 || j === top - 1) return R('oak', 2);
      if (j === 1 && i >= 2) return R('cream', i === 2 ? 0 : 1);
      if (j === 2 && i >= 2) return i === 2 ? R('cream', 0) : R('madder', 1);
      if (j === 0 && i >= 2) return R('oak', 3);
      return j > 5 && i === 1 ? R('ember', 2) : x.pal().ink;
    });
    for (var j = 0; j < 9; j++) { p.set(H.faceX(g, 'L', da) - 1, H.faceY(g, 'L', da) - j, R(tier === 1 ? 'oak' : v.paint, 1)); p.set(H.faceX(g, 'L', da) - 2, H.faceY(g, 'L', da) - j, R(tier === 1 ? 'oak' : v.paint, 2)); }
    var winN = tier === 3 ? 'win_glazed' : 'win_shutter';
    H.onFace(p, g, 'L', winN, { MAIN: v.paint2 }, H.snap(4, 'L', 6), 6);
    H.onFace(p, g, 'R', winN, { MAIN: v.paint2 }, H.snap(3, 'R', 6), 6);
    p.blit(x.sprite('herb_bundle'), H.faceX(g, 'R', 8), H.faceY(g, 'R', 8) - g.H + 2);
    var bedU0 = 1.52, bedV0 = 0.25, bedU1 = 1.92, bedV1 = 0.82;
    slab(F, bedU0, bedV0, bedU1, bedV1, 3, 'oak');
    ground(F, bedU0 + 0.04, bedV0 + 0.04, bedU1 - 0.04, bedV1 - 0.04, function () { return 0; });
    var soil = function () { return c.snow ? R('snow', 1) : R('dirt', 2); };
    X().fillPoly(p, [Pg(bedU0 + 0.04, bedV0 + 0.04, 3), Pg(bedU1 - 0.04, bedV0 + 0.04, 3), Pg(bedU1 - 0.04, bedV1 - 0.04, 3), Pg(bedU0 + 0.04, bedV1 - 0.04, 3)], soil);
    if (!c.snow) for (var q = 0; q < 5; q++) { var hp = Pg(bedU0 + 0.1 + (q % 2) * 0.18, bedV0 + 0.1 + q * 0.1, 3); stamp(p, q % 2 ? ['.0.', '012'] : ['0.0', '121'], hp[0] - 1, hp[1] - 2, c.fol); }
    var pp = Pg(1.5, 0.95); spr(p, 'pot_flowers', { ACCENT: v.bloom, FOLIAGE: c.fol }, pp[0], pp[1]);
    var sc = g.P(g.w, g.d, g.H - 1); hangSign(p, sc[0] + 1, sc[1], 1, 'cross');
    var smoke = [];
    if (tier >= 2 && v.chim) smoke.push(chimney(p, g, ridgePt(g, 0.3)));
    return outS(F, { roof: ridgePt(g, 0.5), h: 22 + c.extra, smoke: smoke, v: v });
  }

  var CMP = { foundry: foundry, smelter: smelter, cement_plant: cement_plant, trade: trade, bank: bank, library: library, university: university,
    temple: temple, amphitheatre: amphitheatre, garrison: garrison, hospital: hospital };
  Object.keys(CMP).forEach(function (k) { VL.COMPOSERS[k] = CMP[k]; });
  var DY = VL.DYN, D = B.D;
  DY.foundry = D(function (o, st, t, on) { o.af = on ? ((floor(t / 166) % 3) + 3) % 3 : 0;
    var fd = ((st && st.city) || {}).foundry || {}, best = '', bn = 0; ['Plywood', 'Brick', 'Wrought_Iron', 'Sheet_Metal'].forEach(function (k) { if ((fd[k] | 0) > bn) { bn = fd[k] | 0; best = k; } });
    o.x = best; o.fq = best ? B.fill(st, [best]) : 0.35; });
  DY.smelter = D(function (o, st, t, on) { o.af = on ? floor(t / 250) & 3 : 0; o.fq = B.fill(st, ['Iron', 'Steel']); });
  DY.cement_plant = D(function (o, st) { o.fq = B.fill(st, ['Cement']); });
  DY.garrison = D(function () {});
  DY.bank = D(function (o, st) { o.fq = B.fill(st, ['Money']); });
  DY.amphitheatre = D(function (o, st) { var cv = (st && st.civic) || {}, n = 0; Object.keys(cv).forEach(function (j) { n += (cv[j] && cv[j].workers) | 0; }); o.fq = Math.min(1, round(n / 6) / 10); });
  DY.trade = DY.library = DY.university = DY.temple = DY.hospital = D(function () {});
  VL.b4 = true;
  }
})(window);
