/* Evolve village sprite kit — Era 1 audit follow-up (Batch 8 logic).
   Placement gates for non-human content, planet traits (flare, trashed, permafrost), the Metal Refinery composer,
   the shanty cabin, resource-to-icon table, world props driven by state (government banner, dump, graves,
   neighbour camps, market stalls, gallows, pets), event effects (fire, mine collapse, +N gains, food alert,
   finished tech bulb) and state badges. Registers through the same extension hook as the other batches. */
(function (G) {
  'use strict';
  var SK = G.SK = G.SK || {};
  SK._ext = (SK._ext || []).filter(function (e) { return e.id !== 'era1'; });
  SK._ext.push({ id: 'era1', fn: reg });
  if (SK._runExt) SK._runExt();
  function reg() {
  if (!SK.village || !SK.village.b4 || !SK.village.B3 || !SK.citizens || !SK.citizens.states || !SK.world || !SK.world.variant || !SK.ui || !SK.PARTS || !SK.PARTS.b8 || !G.SpriteKit) return false;
  var X = G.SpriteKit._, R = X.R, Pix = X.Pix, P = SK.PIECES, VL = SK.village, H = VL.H, B = VL.B3, W0 = SK.world, floor = Math.floor, round = Math.round, PI = Math.PI;
  var WW = X.WW, WH = X.WH, N = X.MAPN, wp = X.worldPt, ih = X.ih;

  /* ---------- reading helpers ---------- */
  function civ(st) { return (st && st.civic) || {}; }
  function race(st) { return (st && st.race) || {}; }
  function tech(st) { return (st && st.tech) || {}; }
  function city(st) { return (st && st.city) || {}; }
  function evl(st) { var e = st && st.event; return e && e.l ? String(e.l) : ''; }
  function traits(st) { var p = city(st).ptrait, o = {}; if (!p) return o; (Array.isArray(p) ? p : [p]).forEach(function (k) { o[k] = 1; }); return o; }
  function disp(job) { return function (st) { var c = civ(st)[job]; return !!(c && c.display); }; }

  /* ---------- 5. placement gates: art stays, a standard human never sees it ---------- */
  var GATE_B = {
    lodge: function (st) { var r = race(st); return !!(r.carnivore || r.soul_eater); },
    smokehouse: function (st) { var r = race(st); return !!(r.carnivore || r.soul_eater); },
    compost: function (st) { return !!race(st).detritivore; },
    temple: function (st) { return (tech(st).theology | 0) >= 2; }
  };
  var GATE_J = { hunter: disp('hunter'), forager: disp('forager'), priest: disp('priest'), scientist: disp('scientist'), scavenger: disp('scavenger'),
    teamster: function (st) { return disp('teamster')(st) || !!race(st).gravity_well; } };
  SK.gate = function (key, st) {
    if (key.slice(0, 4) === 'job:') { var f = GATE_J[key.slice(4)]; return f ? f(st) : true; }
    var g = GATE_B[key]; return g ? g(st) : true;
  };

  /* ---------- permafrost: biome variant with frozen grass and conifers ---------- */
  SK.biomeMod = function (st, biome) {
    if (!traits(st).permafrost) return biome;
    var k = biome + '+pf';
    if (!X.BIOMES[k]) X.BIOMES[k] = Object.assign({}, X.BIOMES[biome] || {}, { grass: 'frost', tree: 'conifer', flowers: 0.15, hot: false });
    return k;
  };

  /* ---------- resource -> icon table ---------- */
  var RES_ICON = {
    Food: ['ic_food'], Lumber: ['ic_wood'], Stone: ['ic_stone'], Furs: ['ic_fur'], Copper: ['ic_ingot', { MAIN: 'copper' }], Iron: ['ic_ingot', { MAIN: 'iron' }],
    Cement: ['ic_sack', { MAIN: 'ashen', ACCENT: 'soot' }], Coal: ['ic_coal'], Steel: ['ic_ingot', { MAIN: 'steel' }], Money: ['ic_coin'], Knowledge: ['ic_book'],
    Plywood: ['ic_plank'], Brick: ['ic_brick'], Wrought_Iron: ['ic_bar'], Sheet_Metal: ['ic_sheet'], Aluminium: ['ic_ingot', { MAIN: 'aluminium' }]
  };
  SK.RES_ICON = RES_ICON;

  /* ---------- Metal Refinery: 2x2, about 28 px, 3 material tiers ---------- */
  function ring(p, cc, r, z, ramp) {
    var ry = r / 2;
    for (var px = cc[0] - r; px < cc[0] + r; px++) { var dx = (px + 0.5 - cc[0]) / r; if (Math.abs(dx) >= 1) continue;
      var yb = cc[1] + round(ry * Math.sqrt(1 - dx * dx)) - 1 - z; p.set(px, yb, R(ramp, dx < 0.2 ? 1 : dx < 0.65 ? 2 : 3)); p.set(px, yb - 1, R(ramp, dx < 0.2 ? 0 : dx < 0.65 ? 1 : 2)); }
  }
  function pipe(p, A, Bq, ramp) { B.setL(p, A, Bq, R(ramp, 1)); B.setL(p, [A[0], A[1] + 1], [Bq[0], Bq[1] + 1], R(ramp, 3)); }
  function metal_refinery(type, tier, k, season, lvl, o) {
    var c = B.C(type, tier, k, season, lvl), v = c.v, F = B.frame(2, 2, 70 + c.extra), p = F.p, metal = o.metal || 'iron', Pg = F.Pg;
    B.ground(F, 0.06, 0.06, 1.94, 1.94, function () { return c.snow ? R('snow', 1) : R('ashen', 0); });
    if (!c.snow) B.chips(F, 0.1, 0.1, 1.9, 1.9, 'ashen', 22, k + 13);
    var ch = 28 + c.extra;
    B.put(F, { w: 0.25, d: 0.25, h: ch, shape: 'round', r: 2, plinth: 2, wall: { tex: 'tex_brick', ramp: tier === 1 ? 'terracotta' : 'brick' }, roof: { type: 'none' } }, 0.3, 0.2);
    var ct = Pg(0.425, 0.325, ch); p.set(ct[0] - 1, ct[1] - 1, X.pal().ink); p.set(ct[0], ct[1] - 1, X.pal().ink);
    /* pale cylinder tank at the back right */
    var tankR = tier === 1 ? 'lime' : 'aluminium', th = 16 + v.dh + c.extra, hoop = tier === 1 ? 'walnut' : metal;
    B.put(F, { w: 0.9, d: 0.9, h: th, shape: 'round', r: 8, plinth: tier === 3 ? 3 : 0, plinthRamp: 'river',
      wall: { tex: tier === 3 ? 'tex_cutstone' : 'tex_planks', ramp: tankR }, roof: { type: 'dome', tex: tier === 3 ? 'tex_cutstone' : 'tex_planks', ramp: tankR, H: 5 }, snow: c.snow }, 1.0, 0.15);
    var cc = Pg(1.45, 0.6);
    ring(p, cc, 8, 3, hoop); ring(p, cc, 8, th - 3, hoop);
    if (tier >= 2) ring(p, cc, 8, round(th / 2), hoop);
    /* two pipes from the process shed to the tank, valve on the upper one */
    [9, 5].forEach(function (z) { pipe(p, Pg(0.98, 1.3, z), Pg(1.5, 1.3, z), metal); pipe(p, Pg(1.5, 1.3, z), Pg(1.5, 1.02, z), metal); });
    B.post(p, Pg(1.28, 1.3), 4, 'walnut');
    var vp = Pg(1.25, 1.3, 9); B.spr(p, 'sig_pipe_valve', { METAL: metal, ACCENT: v.paint }, vp[0], vp[1] - 1);
    var spec = { w: 0.85, d: 0.6, h: 13 + v.dh + c.extra, plinth: c.m.plinth,
      wall: tier === 1 ? { tex: 'tex_wattle', ramp: 'lime' } : tier === 2 ? c.m.wall : { tex: 'tex_brick', ramp: 'brick' },
      roof: { type: 'gable', axis: 'x', tex: c.m.roofTex, ramp: c.m.roofR, pitch: 2 }, snow: c.snow };
    B.shade(F, 0.13, 1.0, 1.15, 1.7);
    var g = B.put(F, spec, 0.13, 1.02); B.roofDetail(p, g); B.hutDoor(p, g, 'L', c);
    H.onFace(p, g, 'R', tier === 3 ? 'win_glazed' : 'win_shutter', { MAIN: v.paint2 }, H.snap(3, 'R', 6), 6);
    /* aluminium ingots at the door, filled from resource.Aluminium */
    var iq = o.fq == null ? 0.6 : o.fq, ip = Pg(1.35, 1.8);
    if (iq > 0.05) B.stack(p, ip[0], ip[1], 'unit_ingot', { MAIN: 'aluminium' }, 3, 6, 3, iq);
    if (v.acc.indexOf('barrel') >= 0) { var bp = Pg(1.85, 1.5); B.spr(p, 'barrel', { METAL: metal }, bp[0], bp[1]); }
    return B.out(F, { roof: [cc[0], cc[1] - th - 5], h: 28 + c.extra, smoke: o.on === false ? [] : [[ct[0], ct[1] - 2]], v: v });
  }
  VL.COMPOSERS.metal_refinery = metal_refinery;
  VL.DYN.metal_refinery = B.D(function (o, st) { o.fq = B.fill(st, ['Aluminium']); });

  /* ---------- shanty cabin (trashed planets): every third cabin ---------- */
  function shanty(type, tier, k, season, lvl, o) {
    var c = B.C(type, tier, k, season, lvl), v = c.v, F = B.frame(1, 1, 40 + c.extra), p = F.p;
    var spec = { w: 0.8, d: 0.75, h: 11 + (v.dh > 0 ? 1 : 0) + c.extra, wall: { tex: 'tex_planks', ramp: v.wi ? 'driftwood' : 'walnut' },
      roof: { type: 'lean', axis: v.axis, tex: 'tex_shingles', ramp: 'driftwood' }, snow: c.snow };
    if (lvl >= 1) B.put(F, { w: 0.45, d: 0.45, h: 7, wall: { tex: 'tex_planks', ramp: 'driftwood' }, roof: { type: 'lean', axis: 'y', tex: 'tex_shingles', ramp: 'driftwood' }, snow: c.snow }, -0.3, 0.45);
    var g = B.put(F, spec, 0.1, 0.12);
    H.onFace(p, g, 'L', 'door_plain', { MAIN: 'driftwood' }, H.snap(3, 'L', 6), 0);
    H.onFace(p, g, 'L', 'hd_patch', { WOOD: v.wi ? 'oak' : 'driftwood' }, H.snap(9, 'L', 6), 4);
    H.onFace(p, g, 'R', 'hd_patch', { WOOD: 'pinewood' }, H.snap(4, 'R', 6), 5);
    var q = g.P(g.w * 0.65, g.d * 0.35, g.H + g.rh * 0.5), top = [q[0], q[1] - 7];
    for (var j = 0; j < 7; j++) { p.set(q[0], q[1] - j, R('iron', 2)); p.set(q[0] + 1, q[1] - j, R('iron', 3)); }
    p.set(q[0] - 1, top[1], R('iron', 1)); p.set(q[0] + 2, top[1], R('iron', 3));
    var dp = F.Pg(0.95, 0.95); B.spr(p, (k % 2) ? 'dump_crate' : 'dump_barrel', {}, dp[0], dp[1]);
    return B.out(F, { roof: top, h: 12 + c.extra, smoke: [[top[0], top[1] - 1]], v: v });
  }
  VL.COMPOSERS.basic_housing = function (type, tier, k, season, lvl, o) { return o && o.x === 'shanty' ? shanty(type, tier, k, season, lvl, o) : VL.house(type, tier, k, season, lvl); };
  VL.DYN.basic_housing = function (st, t, it) { return traits(st).trashed && it.k % 3 === 0 ? { x: 'shanty' } : undefined; };

  /* ---------- world props driven by state (merged into the decor depth sort) ---------- */
  var RES = null;
  function reserved() {
    if (RES) return RES; var S = VL.slots(), Bm = {}; X.BUILDINGS.forEach(function (b) { Bm[b.key] = b; }); RES = new Uint8Array(N * N);
    Object.keys(S).forEach(function (t) { S[t].forEach(function (s) { for (var y = s.y; y < s.y + Bm[t].fd; y++) for (var x = s.x; x < s.x + Bm[t].fw; x++) if (x >= 0 && y >= 0 && x < N && y < N) RES[y * N + x] = 1; }); });
    return RES;
  }
  function placeNear(cx, cy, n, minD, seed, taken) {
    var lay = X.layout(), res = reserved(), dec = (W0.dec().list || []), out = [];
    for (var tr = 0; tr < 260 && out.length < n; tr++) {
      var a = ih(tr, seed, 71) * PI * 2, r = 0.2 + ih(seed, tr, 73) * (0.8 + tr * 0.012), u = cx + Math.cos(a) * r, v = cy + Math.sin(a) * r * 0.8;
      var x = floor(u), y = floor(v); if (x < 0 || y < 0 || x >= N || y >= N) continue;
      var tt = lay[y * N + x]; if (!(tt === 1 || tt === 6 || tt === 5) || res[y * N + x]) continue;
      var ok = dec.every(function (o) { return Math.hypot(o.u - u, o.v - v) > 0.75; }) && out.concat(taken || []).every(function (q) { return Math.hypot(q[0] - u, q[1] - v) > minD; });
      if (ok) out.push([u, v]);
    }
    return out;
  }
  function item(pix, ax, ay, u, v, sh, T) {
    return { k: u + v, v: v,
      shadow: function (b) { if (!sh) return; var g = wp(u, v), cx = round(g[0]) + 2, cy = round(g[1]), rx = Math.max(3, round(pix.w * 0.4)), ry = Math.max(1, round(rx / 2.4));
        for (var y = -ry; y <= ry; y++) for (var x = -rx; x <= rx; x++) { if ((x * x) / (rx * rx) + (y * y) / (ry * ry) > 1) continue; var px = cx + x, py = cy + y; if (px < 0 || py < 0 || px >= WW || py >= WH) continue; var q = py * WW + px; if (T[q]) b.d[q] = X.shift(b.d[q], 1); } },
      draw: function (b, blitD) { var g = wp(u, v); blitD(b, pix, round(g[0]) - ax, round(g[1]) - ay, u + v, -1); } };
  }
  function pc(name, map, opt) { return W0.variant(name, map || {}, opt || {}); }
  var FLAGC = new Map();
  function flagPix(col, snow) {
    var key = col + snow; if (FLAGC.has(key)) return FLAGC.get(key);
    var p = new Pix(12, 30);
    for (var y = 2; y < 30; y++) { p.set(0, y, R('walnut', 1)); p.set(1, y, R('walnut', 3)); }
    p.set(0, 1, R('gold', 1)); p.set(1, 1, R('gold', 2)); p.set(0, 0, R('gold', 0));
    p.blit(X.sprite('gov_banner', { ACCENT: col }), 1, 4);
    if (snow) { p.set(0, 0, R('snow', 0)); }
    FLAGC.set(key, p); return p;
  }
  var CAMPS = [[22.3, 1.7], [1.7, 22.3], [22.2, 22.0]];
  function govColor(st) { var t = (civ(st).govern || {}).type; return t && t !== 'anarchy' ? (SK.citizens.GOV_COL[t] || 'madder') : null; }
  function died(st) { var s = (st && st.stats) || {}; return s.died | 0; }
  function era1Decor(ctx) {
    var st = ctx.state, T = ctx.T, out = [], tr = traits(st), E = W0.dec().E || W0.env(ctx.season, ctx.biome), snow = E.winter ? 1 : 0, taken = [];
    var gc = govColor(st); if (gc) { var fp = flagPix(gc, snow); out.push(item(fp, 0, 29, 12.2, 10.45, true, T)); }
    if ((tech(st).currency | 0) >= 2) { var ms = pc('market_stall', { ACCENT: 'madder', FOLIAGE: E.fol }, { snow: snow }), ms2 = pc('market_stall', { ACCENT: 'teal', MAIN: 'cream', FOLIAGE: E.fol }, { flip: true, snow: snow });
      out.push(item(ms, 8, 13, 10.45, 12.6, true, T), item(ms2, 7, 13, 12.6, 13.55, true, T)); }
    if (evl(st) === 'spy') out.push(item(pc('gallows', {}, { snow: snow }), 2, 17, 13.55, 10.9, true, T));
    if (tr.trashed) {
      var names = ['dump_heap', 'dump_barrel', 'dump_crate', 'dump_wheel', 'dump_rags', 'dump_pots'], spots = placeNear(20.8, 14.6, 6, 0.55, 11, taken);
      spots.forEach(function (s, i) { var d = P[names[i]], s2 = pc(names[i], {}, { flip: ih(i, 3, 5) < 0.5, snow: snow }); taken.push(s); out.push(item(s2, d.anchor[0], d.anchor[1], s[0], s[1], i === 0, T)); });
    }
    var ng = Math.min(6, Math.ceil(Math.log2(died(st) + 1)));
    if (ng > 0) placeNear(3.6, 9.2, ng, 0.5, 23, taken).forEach(function (s, i) { taken.push(s); out.push(item(pc('grave_marker', { FOLIAGE: E.grass }, { snow: snow }), 4, 9, s[0], s[1], false, T)); });
    var fr = civ(st).foreign || {};
    [0, 1, 2].forEach(function (i) {
      var gv = fr['gov' + i]; if (!gv || gv.anx || gv.buy || gv.occ) return;
      var h = gv.hstl | 0, col = h > 60 ? 'madder' : h < 30 ? 'sage' : 'saffron', s = placeNear(CAMPS[i][0], CAMPS[i][1], 2, 0.9, 31 + i, taken);
      if (!s.length) return; taken.push.apply(taken, s);
      out.push(item(pc('camp_tent', { ACCENT: col }, { flip: i === 1, snow: snow }), 8, 11, s[0][0], s[0][1], true, T));
      if (s[1]) out.push(item(pc('fire_ring', {}, {}), 7, 6, s[1][0], s[1][1], false, T));
    });
    return out;
  }
  var baseDecor = W0.decor;
  W0.decor = function (ctx) { return baseDecor(ctx).concat(era1Decor(ctx)); };

  /* static-layer signature: anything era1 draws into the cached static layer */
  function era1Sig(st) {
    var fr = civ(st).foreign || {}, tr = traits(st);
    return [govColor(st) || '', Object.keys(tr).sort().join('.'), (tech(st).currency | 0) >= 2 ? 1 : 0, evl(st) === 'spy' ? 1 : 0, Math.ceil(Math.log2(died(st) + 1)),
      [0, 1, 2].map(function (i) { var g = fr['gov' + i]; return g && !(g.anx || g.buy || g.occ) ? ((g.hstl | 0) > 60 ? 'h' : (g.hstl | 0) < 30 ? 'f' : 'n') : '-'; }).join('')].join(':');
  }
  var baseSig = VL.signature;
  VL.signature = function (st, ctx) { return baseSig(st, ctx) + '|e1:' + era1Sig(st); };

  /* ---------- events: gains between reads, food alert, finished tech ---------- */
  var FX = [], PREV = null, PTECH = null, LASTF = { Food: -1e9, Lumber: -1e9, Stone: -1e9 }, PEND = { Food: 0, Lumber: 0, Stone: 0 }, FALL = false;
  var GAIN_AT = { Food: ['farm', 'silo'], Lumber: ['lumber_yard', 'sawmill'], Stone: ['rock_quarry'] };
  function techSum(t) { var s = 0; Object.keys(t || {}).forEach(function (k) { var v = t[k]; if (typeof v === 'number') s += v; }); return s; }
  function onUpdate(st, t) {
    var r = (st && st.resource) || {}, now = {};
    ['Food', 'Lumber', 'Stone'].forEach(function (k) { now[k] = r[k] ? +r[k].amount || 0 : null; });
    if (PREV) ['Food', 'Lumber', 'Stone'].forEach(function (k) {
      if (now[k] == null || PREV[k] == null) return;
      var d = now[k] - PREV[k]; if (k === 'Food') FALL = d < -0.01 ? true : d > 0.01 ? false : FALL;
      if (d >= 0.5) PEND[k] += d;
      if (PEND[k] >= 1 && t - LASTF[k] > 1500) { FX.push({ k: 'plus', res: k, n: round(PEND[k]), t0: t }); PEND[k] = 0; LASTF[k] = t; }
    });
    PREV = now;
    var ts = techSum(tech(st)); if (PTECH != null && ts > PTECH) FX.push({ k: 'bulb', t0: t }); PTECH = ts;
    FX = FX.filter(function (e) { return t - e.t0 < (e.k === 'bulb' ? 2600 : 1700) && t >= e.t0 - 50; });
    if (FX.length > 12) FX.splice(0, FX.length - 12);
  }
  var baseUpdate = VL.update;
  VL.update = function (st, t, opt) { baseUpdate(st, t, opt); onUpdate(st, t); };
  function foodAlert(st) { var f = ((st && st.resource) || {}).Food; if (!f || !(f.max > 0)) return false; var falling = f.diff != null ? f.diff < 0 : FALL; return falling && f.amount / f.max < 0.15; }

  /* ---------- dynamic world-resolution effects: fire, collapse, flare tint ---------- */
  function items() { return VL.placed ? VL.placed() : []; }
  function firstOf(types) { var L = items(); for (var i = 0; i < types.length; i++) for (var j = 0; j < L.length; j++) if (L[j].type === types[i] && L[j].bld && L[j].bx != null) return L[j]; return null; }
  function roofOf(it) { return [it.bx + it.bld.roof[0], it.by + it.bld.roof[1]]; }
  var LASTDUST = -1e9;
  function dynFx(b, ctx) {
    var st = ctx.state, t = ctx.t, ev = evl(st), tr = traits(st);
    if (tr.flare) {
      var sk = W0.skyc(), a = R('rosewash', 0), c2 = R('ember', 0), n = Math.min(b.d.length, (X.NY + 80) * WW);
      for (var i = 0; i < n; i++) { var v = b.d[i]; if (v === sk[0]) b.d[i] = a; else if (v === sk[1]) b.d[i] = c2; }
    }
    if (ev === 'fire') {
      var it = firstOf(['basic_housing', 'cottage', 'shed', 'lodge']) || items().filter(function (q) { return q.bld && q.bx != null; })[0];
      if (it) { var rp = roofOf(it), f = floor(t / 125) & 3, fs = X.sprite('fx_fire_' + f), fs2 = X.sprite('fx_fire_' + ((f + 2) & 3), null, { flip: true });
        for (var s = 0; s < 7; s++) { var age = ((t / 1000 + s * 0.37) % 2.6) / 2.6, px = rp[0] + round(Math.sin(t / 700 + s) * 2 + age * 8), py = rp[1] - 14 - round(age * 30), sz = 1 + floor(age * 2.5), col = R('soot', age < 0.5 ? 1 : 2);
          for (var yy = 0; yy < sz; yy++) for (var xx = 0; xx < sz; xx++) b.set(px + xx, py + yy, col); }
        b.blit(fs, rp[0] - 6, rp[1] - 13); b.blit(fs2, rp[0] - 11, rp[1] - 9); }
    }
    if (ev === 'mine_collapse') {
      var m = firstOf(['mine', 'coal_mine']);
      if (m) { var gm = wp(m.x + 0.92, m.y + 1.12); b.blit(X.sprite('fx_beams'), round(gm[0]) - 7, round(gm[1]) - 9);
        if (t - LASTDUST > 650) { LASTDUST = t; VL.burst(round(gm[0]), round(gm[1]) - 6, 'dust', 7); } }
    }
  }
  var baseDyn = VL.drawDynamic;
  VL.drawDynamic = function (b, ctx) { baseDyn(b, ctx); dynFx(b, ctx); };

  /* ---------- native-resolution actors: pets, badges, bubbles, bulb, embers ---------- */
  var BUBC = new Map();
  function bubble(n, icon) {
    var key = n + '|' + icon[0] + JSON.stringify(icon[1] || {}); if (BUBC.has(key)) return BUBC.get(key);
    var label = '+' + n, tw = SK.ui.measure(label), w = 16 + tw + 9, h = 20, p = new Pix(w, h + 3), cx = 9;
    SK.ui.nine(p, 'fx_plus', 0, 0, w, h);
    p.set(cx, h, R('cream', 1)); p.set(cx + 1, h, R('cream', 1)); p.set(cx + 2, h, R('walnut', 3)); p.set(cx - 1, h, R('walnut', 2));
    p.set(cx, h + 1, R('cream', 1)); p.set(cx + 1, h + 1, R('walnut', 3)); p.set(cx - 1, h + 1, R('walnut', 2)); p.set(cx, h + 2, R('walnut', 3));
    p.blit(X.sprite(icon[0], icon[1]), 3, 2); SK.ui.text(p, label, 20, 7, R('walnut', 3));
    BUBC.set(key, p); if (BUBC.size > 80) BUBC.delete(BUBC.keys().next().value); return p;
  }
  function anchorFor(types, K) {
    var it = firstOf(types); if (it) { var r = roofOf(it); return [r[0] * K, r[1] * K]; }
    var g = wp(12, 12); return [round(g[0] * K), round(g[1] * K) - 40];
  }
  var FULL = { lumber_yard: ['Lumber'], rock_quarry: ['Stone'], silo: ['Food'], mine: ['Copper', 'Iron'], coal_mine: ['Coal'], cement_plant: ['Cement'], metal_refinery: ['Aluminium'] };
  function isFull(st, names) { var r = (st && st.resource) || {}; return names.some(function (k) { var q = r[k]; return q && q.max > 0 && q.amount >= q.max; }); }
  function petOf(st) { var p = race(st).pet; if (!p) return null; var t = typeof p === 'string' ? p : p.type; return t === 'dog' ? 'dog' : 'cat'; }
  function actorsFx(B2, ctx, K) {
    var st = ctx.state, t = ctx.t, D = VL.depth(), tr = traits(st);
    var pet = petOf(st), home = firstOf(['basic_housing', 'cottage']);
    if (pet && home) {
      var A = [home.x + 1.3, home.y + 0.35], Bq = [home.x + 1.3, home.y + 1.25], s = W0.wander(A, Bq, t, 3.2, 1.8, 1.3), mv = s.mv && floor(t / 200) % 2;
      var nm = 'pet_' + pet + (s.mv ? (mv ? '_b' : '_a') : '_a'), d = P[nm], g = wp(s.u, s.v), gx = round(g[0] * K), gy = round(g[1] * K);
      W0.foot(B2, gx, gy, 3, s.u + s.v, D);
      W0.blitA(B2, X.sprite(nm, pet === 'cat' ? { MAIN: (home.k % 2) ? 'ochre' : 'hair_black' } : { MAIN: 'hide', ACCENT: 'cream' }), gx, gy, d.anchor[0], d.anchor[1], s.u + s.v, D, s.flip);
    }
    items().forEach(function (it) {
      if (!it.bld || it.bx == null) return;
      var off = !VL.active(st, it.type), full = FULL[it.type] && isFull(st, FULL[it.type]); if (!off && !full) return;
      var r = roofOf(it), sp = X.sprite(off ? 'badge_off' : 'badge_full'), bx = round(r[0] * K) - 3, by = round(r[1] * K) - 16 - (floor(t / 500) % 2);
      B2.blit(sp, bx, by);
    });
    FX.forEach(function (e) {
      var a = t - e.t0, at;
      if (e.k === 'plus') { at = anchorFor(GAIN_AT[e.res], K); var bp = bubble(e.n, RES_ICON[e.res]); if (a > 1300 && floor(a / 100) % 2) return; B2.blit(bp, round(at[0]) - 9, round(at[1]) - 30 - bp.h - round(a / 90)); }
      else if (e.k === 'bulb') { at = anchorFor(['library', 'university'], K); var bl = SK.ui.bulb(t); B2.blit(bl, round(at[0]) - 10, round(at[1]) - 34 - (a < 300 ? round((300 - a) / 30) : 0)); }
    });
    if (foodAlert(st)) { var fa = anchorFor(['silo', 'farm'], K), al = X.sprite('fx_alert_food'); if (floor(t / 400) % 3) { B2.blit(al, round(fa[0]) - 5, round(fa[1]) - 34 + (floor(t / 250) % 2)); B2.blit(X.sprite('ic_food', { MAIN: 'ashen', ACCENT: 'soot' }), round(fa[0]) + 8, round(fa[1]) - 36); } }
    var mor = (city(st).morale || {}).current, hl = city(st).homeless | 0, pz = wp(12, 12), px = round(pz[0] * K), py = round(pz[1] * K) - 62, hx = 0;
    if (mor != null && mor < 100) { B2.blit(X.sprite('ic_morale'), px - 8, py); hx = 18; }
    if (hl > 0) B2.blit(X.sprite('ic_tent'), px - 8 + hx, py);
    if (tr.flare) for (var i = 0; i < 46; i++) {
      var spd = 14 + ih(i, 1, 961) * 22, yy = round(((ih(i, 2, 962) * B2.h + (t / 1000) * spd * K) % B2.h)), xx = round(((ih(i, 3, 963) * B2.w + yy * 0.35 + Math.sin(t / 600 + i) * 3 * K) % B2.w + B2.w) % B2.w);
      var col = (floor(t / 150) + i) % 5 ? R('ember', 1 + (i % 2)) : X.pal().spark; B2.set(xx, yy, col); if (i % 3 === 0) B2.set(xx + 1, yy, col);
    }
  }
  var baseActors = VL.drawActors;
  VL.drawActors = function (B2, ctx, k) { baseActors(B2, ctx, k); actorsFx(B2, ctx, k); };

  /* ---------- atelier sheet: every Batch 8 world piece and effect ---------- */
  function sheet(season, t) {
    t = t || 0;
    var E = W0.env(season, 'grassland'), p = new Pix(340, 150), gr = R(E.winter ? 'snow' : 'summer', E.winter ? 1 : 2), x = 4, gy = 32;
    function put(s, ax, ay, xx, g) { p.blit(s, xx, g - ay); for (var k = 0; k < s.w; k++) p.set(xx + k, g + 1, gr); return xx + s.w + 5; }
    ['madder', 'indigo', 'plum', 'cream', 'teal', 'saffron', 'sage'].forEach(function (c) { x = put(flagPix(c, 0), 0, 29, x, gy); });
    x = put(pc('market_stall', { FOLIAGE: E.fol }, {}), 8, 13, x, gy); x = put(pc('gallows', {}, {}), 2, 17, x, gy);
    ['madder', 'saffron', 'sage'].forEach(function (c) { x = put(pc('camp_tent', { ACCENT: c }, {}), 8, 11, x, gy); });
    x = put(pc('grave_marker', { FOLIAGE: E.grass }, {}), 4, 9, x, gy);
    x = 4; gy = 62;
    ['dump_heap', 'dump_barrel', 'dump_crate', 'dump_wheel', 'dump_rags', 'dump_pots'].forEach(function (n) { x = put(pc(n, {}, {}), 0, P[n].h - 1, x, gy); });
    x = put(X.sprite('irrig_sluice'), 0, 6, x, gy); x = put(X.sprite('hd_patch'), 0, 5, x, gy);
    ['pet_cat_a', 'pet_cat_b', 'pet_dog_a', 'pet_dog_b'].forEach(function (n, i) { x = put(X.sprite(n, i < 2 && i ? { MAIN: 'hair_black' } : null), 0, P[n].h - 1, x, gy); });
    x = put(X.sprite('badge_off'), 0, 6, x, gy); x = put(X.sprite('badge_full'), 0, 6, x, gy); x = put(X.sprite('sig_pipe_valve'), 0, 6, x, gy);
    x = 4; gy = 98;
    for (var f = 0; f < 4; f++) x = put(X.sprite('fx_fire_' + f), 0, 15, x, gy);
    x = put(X.sprite('fx_fire_' + (floor(t / 125) & 3)), 0, 15, x + 4, gy);
    x = put(X.sprite('fx_beams'), 0, 7, x + 4, gy);
    var bp = bubble(12, RES_ICON.Food); p.blit(bp, x, gy - bp.h); x += bp.w + 4;
    bp = bubble(5, RES_ICON.Lumber); p.blit(bp, x, gy - bp.h); x += bp.w + 4;
    bp = bubble(3, RES_ICON.Stone); p.blit(bp, x, gy - bp.h); x += bp.w + 6;
    p.blit(X.sprite('fx_alert_food'), x, gy - 12); p.blit(X.sprite('ic_food', { MAIN: 'ashen', ACCENT: 'soot' }), x + 13, gy - 16); x += 34;
    p.blit(SK.ui.bulb(t), x, gy - 22);
    x = 4; gy = 146;
    ['basic_housing'].forEach(function () { [1, 2, 3].forEach(function (tr) { var s = shanty('basic_housing', tr, 0, season, 0, {}); var c = H.crop(s.pix, 0); p.blit(c, x, gy - c.h); x += c.w + 6; }); });
    return p;
  }
  function samples() { return [{ label: 'era1 sheet s1', pix: sheet(1) }, { label: 'era1 sheet s3', pix: sheet(3) }]; }
  var baseS = VL.samples;
  VL.samples = function () { return (baseS ? baseS() : []).concat(samples()); };

  SK.era1 = { sheet: sheet, gate: SK.gate, RES_ICON: RES_ICON, traits: traits, fx: function () { return FX; }, shanty: shanty, bubble: bubble };
  }
})(window);
