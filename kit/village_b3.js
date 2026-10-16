/* Evolve village sprite kit — Batch 3 composers: food (smokehouse, farm, compost, silo, mill),
   storage (shed, freight yard), extraction (lumber yard, sawmill, rock quarry, mine, coal mine).
   Animation frames (sails, blade, cart, flies) and pile fill levels are composer inputs, so every
   moving part is depth-sorted with its building and cached per frame. */
(function (G) {
  'use strict';
  var SK = G.SK = G.SK || {};
  SK._ext = (SK._ext || []).filter(function (e) { return e.id !== 'b3'; });
  SK._ext.push({ id: 'b3', fn: reg });
  if (SK._runExt) SK._runExt();
  function reg() {
  if (!SK.village || !SK.village.H || !G.SpriteKit) return false;
  var VL = SK.village, H = VL.H;
  function X() { return G.SpriteKit._; }
  var floor = Math.floor, round = Math.round, ceil = Math.ceil, E = 0.125;
  function mod(a, n) { return ((a % n) + n) % n; }

  /* ---------- frame + drawing helpers ---------- */
  function frame(fw, fd, top) {
    var x = X(), M = 26, p = new x.Pix(16 * (fw + fd) + 2 * M, top + 8 * (fw + fd) + 12), ox = 16 * fd + M, oy = top;
    return { p: p, ox: ox, oy: oy, fw: fw, fd: fd,
      Pg: function (u, v, z) { return [round(ox + (u - v) * 16), round(oy + (u + v) * 8 - (z || 0))]; },
      inv: function (px, py) { var rx = px + 0.5 - ox, ry = py + 0.5 - oy; return [(rx / 16 + ry / 8) / 2, (ry / 8 - rx / 16) / 2]; } };
  }
  function put(F, spec, u, v, z0) {
    var x = X(), sh = x.shell(spec), at = F.Pg(u, v, z0 || 0), bx = at[0] - sh.ox, by = at[1] - sh.oy;
    F.p.blit(sh.pix, bx, by);
    var g = H.geo(sh, bx, by); g.spec = spec; return g;
  }
  function spr(p, name, map, x, y, opt) {
    var d = SK.PIECES[name], s = X().sprite(name, map, opt), a = d.anchor || [0, 0], ax = opt && opt.flip ? d.w - a[0] : a[0];
    p.blit(s, x - ax, y - a[1]);
  }
  function ground(F, u0, v0, u1, v1, fn) { X().fillPoly(F.p, [F.Pg(u0, v0), F.Pg(u1, v0), F.Pg(u1, v1), F.Pg(u0, v1)], fn); }
  function shade(F, u0, v0, u1, v1) { var x = X(); ground(F, u0, v0, u1, v1, function (px, py) { var c = F.p.get(px, py); return c ? x.shift(c, 1) : 0; }); }
  function setL(p, a, b, col) { X().line(a[0], a[1], b[0], b[1], function (px, py) { p.set(px, py, col); }); }
  function stamp(p, rows, x0, y0, ramp, only) {
    var x = X();
    for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) {
      var ch = rows[j][i]; if (ch === '.') continue;
      if (only && !p.get(x0 + i, y0 + j)) continue;
      p.set(x0 + i, y0 + j, x.R(ramp, +ch));
    }
  }
  /* heap or cone, texture-sampled, shaded from the upper left, selectively outlined */
  function mound(p, cx, by, rx, ht, tex, ramp, o) {
    o = o || {};
    var x = X(), ry = Math.max(2, round(rx / 2)), t = new x.Pix(2 * rx + 3, ht + ry + 4), ox = rx + 1, oy = ht + 1;
    for (var px = -rx; px <= rx; px++) {
      var dx = (px + 0.5) / (rx + 0.5), q = Math.sqrt(Math.max(0, 1 - dx * dx));
      var top = o.cone ? -round(ht * (1 - Math.abs(dx)) * (0.85 + 0.15 * q)) : -round(ht * Math.pow(q, o.flat ? 0.5 : 0.85)), bot = round(ry * q * 0.7);
      for (var py = top; py <= bot; py++) {
        var off = dx < -0.3 ? 0 : dx < 0.35 ? 1 : 2;
        if (py - top < 1 && off > 0) off--;
        var c = x.texC(tex, px + 64, py + 64, ramp, off);
        if (o.cap && py - top < o.cap[1] + (ih(px, 1) < 0.5 ? 1 : 0)) c = x.R(o.cap[0], off + (o.cap[2] || 0));
        t.set(px + ox, py + oy, c);
      }
    }
    x.selout(t);
    p.blit(t, cx - ox, by - oy);
    return { top: by - ht, l: cx - rx, r: cx + rx };
  }
  function ih(a, b) { return X().ih(a | 0, b | 0, 4242); }
  function post(p, a, z, ramp) { var x = X(); for (var k = 0; k < z; k++) { p.set(a[0], a[1] - k, x.R(ramp, 1)); p.set(a[0] + 1, a[1] - k, x.R(ramp, 3)); } p.set(a[0], a[1] - z, x.R(ramp, 0)); p.set(a[0] + 1, a[1] - z, x.R(ramp, 2)); }
  /* fence: posts every `step` tiles along a polyline of ground points; rails between posts; `gap` skips a span */
  function fence(F, pts, step, ramp, rope, gap) {
    var x = X(), p = F.p, posts = [];
    for (var s = 0; s + 1 < pts.length; s++) {
      var a = pts[s], b = pts[s + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, round(L / step));
      for (var i = (s ? 1 : 0); i <= n; i++) posts.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
    }
    posts.forEach(function (q, i) {
      if (!i || (gap && gap(i))) return;
      var A = F.Pg(posts[i - 1][0], posts[i - 1][1]), B = F.Pg(q[0], q[1]);
      if (rope) { var mid = [round((A[0] + B[0]) / 2), round((A[1] + B[1]) / 2) - 4]; setL(p, [A[0] + 1, A[1] - 6], mid, x.R('straw', 2)); setL(p, mid, [B[0] + 1, B[1] - 6], x.R('straw', 2)); }
      else { setL(p, [A[0] + 1, A[1] - 6], [B[0] + 1, B[1] - 6], x.R(ramp, 1)); setL(p, [A[0] + 1, A[1] - 3], [B[0] + 1, B[1] - 3], x.R(ramp, 2)); }
    });
    posts.forEach(function (q) { var A = F.Pg(q[0], q[1]); spr(p, 'fence_post', { WOOD: ramp }, A[0], A[1]); });
  }
  /* pyramid of units, fill 0..1 (bottom rows first) */
  function stack(p, cx, by, name, map, cols, dx, dy, fill) {
    var cap = cols * (cols + 1) / 2, n = Math.max(0, Math.min(cap, round(fill * cap))), placed = 0, x0 = cx - round((cols - 1) * dx / 2);
    for (var row = 0; row < cols && placed < n; row++)
      for (var i = 0; i < cols - row && placed < n; i++, placed++) spr(p, name, map, x0 + round(row * dx / 2) + i * dx, by - row * dy);
    return n;
  }
  function chimney(p, g, q) {
    var x = X();
    for (var cx = q[0] - 2; cx <= q[0] + 1; cx++) for (var cy = q[1] - 7; cy <= q[1] + 2; cy++) {
      var c = x.texC('tex_drystone', cx, cy, 'river', cx < q[0] ? 0 : 1);
      if (cx === q[0] - 2) c = x.shift(c, 1); else if (cx === q[0] + 1) c = x.darkest(c);
      p.set(cx, cy, c);
    }
    p.blit(x.sprite('hd_chimney_cap'), q[0] - 3, q[1] - 10);
    return [q[0], q[1] - 11];
  }
  function roofDetail(p, g) {
    var spec = g.spec, rf = spec.roof, P = g.P, Hh = g.H, rh = g.rh, w = g.w, d = g.d, rmap = { MAIN: rf.ramp };
    if (rf.tex === 'tex_thatch' && (rf.type === 'gable' || rf.type === 'hip' || rf.type === 'lean')) {
      if (g.axis === 'x' || rf.type !== 'gable') { var A = P(-E, d + E, Hh), B = P(w + E, d + E, Hh); H.strip(p, 'hd_thatch_fringe', rmap, ceil(A[0]), B[0], H.bottomEdge(A, 0.5), 0); }
      if ((g.axis === 'y' && rf.type === 'gable') || rf.type === 'hip') { var A2 = P(w + E, d + E, Hh), B2 = P(w + E, -E, Hh); H.strip(p, 'hd_thatch_fringe', rmap, ceil(A2[0]), B2[0], H.bottomEdge(A2, -0.5), 1, 5); }
    }
    if (rf.tex === 'tex_tiles' && rf.type === 'gable') {
      if (g.axis === 'x') { var C = P(-E, d / 2, Hh + rh), D = P(w + E, d / 2, Hh + rh); H.strip(p, 'hd_clay_ridge', rmap, C[0], D[0], function (xx) { return H.topEdge(C, 0.5)(xx) - 1; }, 0); }
      else { var C2 = P(w / 2, d + E, Hh + rh), D2 = P(w / 2, -E, Hh + rh); H.strip(p, 'hd_clay_ridge', rmap, C2[0], D2[0], function (xx) { return H.topEdge(C2, -0.5)(xx) - 1; }, 0); }
    }
  }
  function ridgePt(g, t) { return g.axis === 'x' ? g.P(g.w * t, g.d / 2, g.H + g.rh) : g.P(g.w / 2, g.d * t, g.H + g.rh); }
  /* open lean-to on posts: back edge v0 high (zb), front edge v1 low (zf); under() draws what sits beneath */
  function leanTo(F, u0, v0, u1, v1, zb, zf, tex, ramp, postR, snow, under) {
    var x = X(), p = F.p, Pg = F.Pg, ox = F.ox;
    post(p, Pg(u0, v0), zb, postR); post(p, Pg(u1, v0), zb, postR);
    if (under) under();
    post(p, Pg(u0, v1), zf, postR); post(p, Pg(u1, v1), zf, postR);
    var pts = [Pg(u0 - 0.06, v0 - 0.06, zb + 1), Pg(u1 + 0.06, v0 - 0.06, zb + 1), Pg(u1 + 0.06, v1 + 0.06, zf), Pg(u0 - 0.06, v1 + 0.06, zf)];
    var t = new x.Pix(p.w, p.h);
    x.fillPoly(t, pts, function (px, py) { var vv = py - floor((px - ox) / 2), tn = X().texC(tex, px - ox, vv, ramp, 0); return (snow && SKTone(tex, px - ox, vv) <= 1) ? x.R('snow', 1) : tn; });
    x.selout(t); p.blit(t, 0, 0);
    if (tex === 'tex_thatch') { var A = Pg(u0 - 0.06, v1 + 0.06, zf), B = Pg(u1 + 0.06, v1 + 0.06, zf); H.strip(p, 'hd_thatch_fringe', { MAIN: ramp }, ceil(A[0]), B[0], H.bottomEdge(A, 0.5), 0); }
  }
  function SKTone(name, u, v) { var d = SK.PIECES[name], e = X().CH[d.rows[mod(floor(v), d.h)][mod(floor(u), d.w)]]; return e ? e[1] : 1; }
  function chips(F, u0, v0, u1, v1, ramp, n, seed) {
    var p = F.p;
    for (var i = 0; i < n; i++) { var a = F.Pg(u0 + (u1 - u0) * ih(i, seed), v0 + (v1 - v0) * ih(seed, i)); stamp(p, i % 3 ? ['01'] : ['0', '1'], a[0], a[1], ramp, true); }
  }

  /* ---------- materials ---------- */
  var MAT = {
    1: { wall: [['tex_logs', 'oak'], ['tex_wattle', 'lime']], roofTex: 'tex_thatch', roof: ['straw', 'reed', 'dry'], plinth: 0 },
    2: { wall: [['tex_planks', 'pinewood'], ['tex_planks', 'driftwood']], roofTex: 'tex_shingles', roof: ['walnut', 'driftwood', 'oak'], plinth: 3 },
    3: { wall: [['tex_cutstone', 'sandstone'], ['tex_brick', 'brick']], roofTex: 'tex_tiles', roof: ['terracotta', 'brick', 'ochre'], plinth: 3 }
  };
  function mat(tier, v) { var m = MAT[tier]; return { wall: { tex: m.wall[v.wi][0], ramp: m.wall[v.wi][1] }, roofTex: m.roofTex, roofR: m.roof[v.ri], plinth: m.plinth }; }
  function C(type, tier, k, season, lvl) {
    var x = X(), v = H.variant(type, k, tier), S = x.SEASONS[season];
    return { x: x, R: x.R, v: v, snow: season === 3, fol: S.tree, season: season, tier: tier, lvl: lvl, extra: lvl >= 2 ? 10 : 0, m: mat(tier, v) };
  }
  function out(F, o) { o.pix = F.p; o.ox = F.ox; o.oy = F.oy; o.fw = F.fw; o.fd = F.fd; return o; }
  function annex(F, c, spec, u, v) {
    if (c.lvl < 1) return;
    put(F, { w: 0.5, d: 0.5, h: Math.max(7, round(spec.h * 0.55)), plinth: spec.plinth ? 2 : 0, wall: spec.wall,
      roof: { type: 'lean', axis: 'y', tex: spec.roof.tex, ramp: spec.roof.ramp }, snow: c.snow }, u, v);
  }
  function hutDoor(p, g, f, c, z) {
    var name = c.tier === 1 ? 'door_plain' : c.v.door, a = H.snap(Math.min(5, g.w * 16 - 9), f, 6);
    if (f === 'R') a = H.snap(Math.min(5, g.d * 16 - 9), f, 6);
    H.onFace(p, g, f, name, { MAIN: c.tier === 1 ? 'oak' : c.v.paint, ACCENT: c.v.paint2 }, Math.max(1, a), z || 0);
  }

  /* ---------- FOOD ---------- */
  function smokehouse(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(1, 1, 50 + c.extra), p = F.p, smoke = [], roofPt;
    var rackDraw = function () {
      var fq = o.fq == null ? 0.6 : o.fq; if (fq < 0.05) return;
      var a = F.Pg(0.12, 1.02); spr(p, 'sig_drying_rack', { ACCENT: v.ri === 1 ? 'cream' : 'hide', MAIN: v.ri === 2 ? 'madder' : 'rust' }, a[0] - 3, a[1]);
      var fb = F.Pg(0.9, 1.12); stack(p, fb[0], fb[1], 'unit_fur_bundle', {}, 2, 7, 4, fq);
    };
    if (tier === 1) {
      var coneH = 19 + c.extra;
      put(F, { w: 0.75, d: 0.75, h: 3, shape: 'round', r: 9, wall: { tex: 'tex_wattle', ramp: 'hide' }, roof: { type: 'cone', tex: 'tex_wattle', ramp: v.ri === 2 ? 'cream' : 'hide', H: coneH }, snow: c.snow }, 0.125, 0.125);
      var ap = F.Pg(0.5, 0.5, 3 + coneH), wd = R('walnut', 2);
      setL(p, [ap[0] - 1, ap[1] + 1], [ap[0] - 4, ap[1] - 4], wd); setL(p, [ap[0] + 1, ap[1] + 1], [ap[0] + 3, ap[1] - 4], R('walnut', 3)); setL(p, [ap[0], ap[1]], [ap[0], ap[1] - 5], wd);
      var cb = F.Pg(0.5, 0.5); cb = [cb[0] - 1, cb[1] + 3];
      for (var j = 0; j < 9; j++) for (var i = -floor(j / 3); i <= floor(j / 3); i++) p.set(cb[0] + i, cb[1] - 8 + j, (i === floor(j / 3) || j === 8) ? R('hide', 4) : x.pal().ink);
      smoke.push([ap[0], ap[1] - 5]); roofPt = [ap[0], ap[1] - 2];
      rackDraw();
    } else {
      var ax = v.axis, w = ax === 'x' ? 1 : 0.625, d = ax === 'x' ? 0.625 : 1, u0 = (1 - w) / 2, v0 = (1 - d) / 2;
      var spec = { w: w, d: d, h: 15 + v.dh + c.extra, plinth: 3, wall: tier === 2 ? c.m.wall : { tex: 'tex_cutstone', ramp: v.wi ? 'river' : 'sandstone' },
        roof: { type: 'gable', axis: ax, tex: c.m.roofTex, ramp: c.m.roofR, pitch: 3 }, snow: c.snow };
      if (tier === 3) { spec.wall2 = { tex: 'tex_brick', ramp: 'brick', z: 8 }; spec.bandRamp = 'sandstone'; }
      annex(F, c, spec, u0 - 0.5, v0 + d - 0.5);
      var g = put(F, spec, u0, v0), gable = ax === 'y' ? 'L' : 'R', side = gable === 'L' ? 'R' : 'L';
      hutDoor(p, g, gable, c);
      H.onFace(p, g, side, 'win_shutter', { MAIN: v.paint2, WOOD: 'oak' }, H.snap(5, side, 6), 7);
      roofDetail(p, g);
      var rp = ridgePt(g, 0.5);
      if (tier === 2) {
        var vs = { w: ax === 'x' ? 0.375 : 0.25, d: ax === 'x' ? 0.25 : 0.375, h: 3, wall: { tex: 'tex_planks', ramp: 'walnut' }, roof: { type: 'gable', axis: ax, tex: 'tex_shingles', ramp: c.m.roofR, pitch: 1 }, snow: c.snow };
        var vu = ax === 'x' ? u0 + w / 2 - 0.1875 : u0 + w / 2 - 0.125, vv = ax === 'x' ? v0 + d / 2 - 0.125 : v0 + d / 2 - 0.1875;
        var gv = put(F, vs, vu, vv, g.H + g.rh - 3);
        for (var a = 1; a < 6; a += 2) { p.set(H.faceX(gv, 'L', a), H.faceY(gv, 'L', a) - 1, x.pal().ink); p.set(H.faceX(gv, 'R', a), H.faceY(gv, 'R', a) - 1, x.pal().ink); }
        smoke.push([rp[0], rp[1] - 7]); roofPt = [rp[0], rp[1] - 5];
      } else { smoke.push(chimney(p, g, rp)); roofPt = rp; }
      rackDraw();
    }
    return out(F, { roof: roofPt, smoke: smoke, h: 18 + c.extra, v: v });
  }

  function farm(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(2, 2, 40), p = F.p, ax = v.axis, nF = 6;
    var u0 = 0.12, v0 = 0.12, u1 = 1.88, v1 = 1.88, fl = o.x || '', irr = fl.indexOf('i') >= 0, fh = fl.indexOf('h') >= 0, fsm = null;
    var shedZone = function (u, w) { return (tier >= 2 && u > 1.22 && w < 0.78) || (fh && u < 0.8 && w < 0.72) || (irr && Math.abs((ax === 'x' ? w : u) - 1) < 0.09); };
    ground(F, u0, v0, u1, v1, function (px, py) {
      var q = F.inv(px, py), t = ax === 'x' ? q[1] : q[0], f = (t - v0) / (v1 - v0) * nF * 2, ridge = floor(f) % 2 === 0;
      if (c.snow) return R('snow', ridge ? 0 : 2);
      return ridge ? R('dirt', f - floor(f) < 0.5 ? 1 : 2) : R('dirt', 3);
    });
    var Lc = F.Pg(u0, v1), Bc = F.Pg(u1, v1), Rc = F.Pg(u1, v0);
    setL(p, [Lc[0], Lc[1]], [Bc[0], Bc[1]], R(c.snow ? 'snow' : 'dirt', 4)); setL(p, [Bc[0], Bc[1]], [Rc[0], Rc[1]], R(c.snow ? 'snow' : 'dirt', 4));
    if (irr) {
      /* irrigation channel (tech.agriculture >= 2): one ditch along the furrows, fed through a sluice at the field edge */
      var chf = function (px, py) { var q = F.inv(px, py), t = ax === 'x' ? q[1] : q[0], e = Math.abs(t - 1); return c.snow ? R('snow', e > 0.03 ? 2 : 3) : R('water', e > 0.03 ? 1 : 2); };
      if (ax === 'x') ground(F, u0, 0.95, u1, 1.05, chf); else ground(F, 0.95, v0, 1.05, v1, chf);
      var sl = ax === 'x' ? F.Pg(u1 - 0.05, 1.0) : F.Pg(1.0, v1 - 0.05); spr(p, 'irrig_sluice', { MAIN: c.snow ? 'snow' : 'water' }, sl[0], sl[1] + 1, { flip: ax === 'y' });
    }
    if (fh) {
      /* farm house (tech.farm >= 1) */
      var hs = { w: 0.6, d: 0.5, h: 12 + (v.dh > 0 ? 1 : 0), plinth: c.m.plinth ? 2 : 0, wall: c.m.wall, roof: { type: 'gable', axis: v.axis === 'x' ? 'y' : 'x', tex: c.m.roofTex, ramp: c.m.roofR, pitch: 3 }, snow: c.snow };
      shade(F, 0.08, 0.08, 0.84, 0.58);
      var gh = put(F, hs, 0.08, 0.08); hutDoor(p, gh, 'L', c); roofDetail(p, gh);
      H.onFace(p, gh, 'R', tier === 3 ? 'win_glazed' : 'win_shutter', { MAIN: v.paint2 }, H.snap(3, 'R', 6), 5);
      fsm = chimney(p, gh, ridgePt(gh, 0.3));
    }
    if (tier >= 2) {
      var ss = { w: 0.5, d: 0.5, h: 11 + (v.dh > 0 ? 1 : 0), plinth: tier === 3 ? 3 : 2, wall: tier === 3 ? { tex: 'tex_cutstone', ramp: v.wi ? 'river' : 'sandstone' } : c.m.wall,
        roof: { type: 'gable', axis: ax, tex: c.m.roofTex, ramp: c.m.roofR, pitch: 2 }, snow: c.snow };
      shade(F, 1.36, 0.06, 1.96, 0.56);
      var gs = put(F, ss, 1.36, 0.06); hutDoor(p, gs, 'L', c); roofDetail(p, gs);
      if (tier === 3) { var bp = F.Pg(1.3, 0.72); spr(p, 'barrel', { MAIN: 'oak', METAL: o.metal || 'iron' }, bp[0], bp[1]); }
    }
    var stage = [null, 'sig_crop_1', 'sig_crop_2', 'sig_crop_3'][[1, 2, 3, 0][season]], list = [];
    if (stage) for (var i = 0; i < nF; i++) {
      var t = v0 + (2 * i + 0.5) / (2 * nF) * (v1 - v0);
      for (var s = u0 + 0.14; s < u1 - 0.08; s += 0.26) { var uu = ax === 'x' ? s : t, ww = ax === 'x' ? t : s; if (!shedZone(uu, ww)) list.push({ u: uu, v: ww, n: stage }); }
    }
    list.push({ u: 0.95 + (v.ri - 1) * 0.15, v: 1.05, n: 'sig_scarecrow' });
    list.sort(function (a, b) { return (a.u + a.v) - (b.u + b.v); });
    var cmap = stage === 'sig_crop_3' ? { MAIN: 'straw', FOLIAGE: 'dry' } : { FOLIAGE: c.fol };
    list.forEach(function (q, j) {
      var a = F.Pg(q.u, q.v);
      if (q.n === 'sig_scarecrow') spr(p, q.n, { ACCENT: v.paint, MAIN: 'straw' }, a[0], a[1] + 1, { flip: v.wi === 1 });
      else spr(p, q.n, cmap, a[0], a[1] + 1, { flip: ih(j, k) < 0.5 });
    });
    if (lvl >= 1) { var sp = F.Pg(0.3, 1.75); stack(p, sp[0], sp[1], 'unit_sack', { MAIN: 'cream', ACCENT: v.paint2 }, lvl >= 2 ? 3 : 2, 6, 4, 1); }
    if (tier >= 2) fence(F, [[0, 1.98], [1.98, 1.98], [1.98, 0]], 0.4, 'oak', false, function (i) { return i === 2; });
    return out(F, { roof: F.Pg(1.6, 0.3, 18), h: 6, noShadow: true, v: v, smoke: fsm ? [fsm] : [] });
  }

  function compost(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(1, 1, 30), p = F.p, ce = F.Pg(0.5, 0.5);
    var mt = mound(p, ce[0], ce[1] + 2, tier === 1 ? 10 : 9, 7 + lvl * 2, 'tex_wattle', 'dirt', c.snow ? { cap: ['snow', 2] } : null);
    if (!c.snow) for (var i = 0; i < 6; i++) stamp(p, i % 2 ? ['.0.', '012'] : ['01', '.2'], ce[0] - 7 + floor(ih(i, k) * 13), mt.top + 1 + floor(ih(k, i) * 5), 'straw', true);
    if (tier === 2) put(F, { w: 0.75, d: 0.75, h: 5, wall: { tex: 'tex_planks', ramp: 'oak' }, roof: { type: 'none' } }, 0.125, 0.125);
    if (tier === 3) put(F, { w: 0.8, d: 0.8, h: 3, wall: { tex: 'tex_drystone', ramp: 'river' }, roof: { type: 'none' } }, 0.1, 0.1);
    var tp = F.Pg(0.92, 0.42); spr(p, 'tool_lean', { METAL: o.metal || 'iron' }, tp[0], tp[1]);
    if (o.on !== false && !c.snow) { var af = o.af | 0; for (var f = 0; f < 2; f++) p.set(ce[0] + round(4 * Math.cos(af * 0.785 + f * 3)), mt.top - 3 + round(2 * Math.sin(af * 1.57 + f)), x.pal().ink); }
    return out(F, { roof: [ce[0], mt.top], h: 6, v: v });
  }

  function silo(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(1, 1, 64 + c.extra), p = F.p, metal = o.metal || 'iron';
    var r, h, spec, z0 = 0, ce = F.Pg(0.5, 0.5);
    if (lvl >= 1) put(F, { w: 0.6, d: 0.6, h: 14, shape: 'round', r: 6, wall: { tex: tier === 3 ? 'tex_cutstone' : 'tex_planks', ramp: tier === 3 ? 'river' : 'oak' }, roof: { type: 'cone', tex: c.m.roofTex, ramp: c.m.roofR, H: 7 }, snow: c.snow }, -0.45, 0.3);
    if (tier === 1) {
      r = 8; h = 14 + v.dh + c.extra; z0 = 7;
      [[-5, -2], [4, -2], [-2, 2], [2, 2]].forEach(function (q) { post(p, [ce[0] + q[0], ce[1] + q[1]], 8, 'walnut'); });
      spec = { w: 1, d: 1, h: h, shape: 'round', r: r, wall: { tex: 'tex_thatch', ramp: v.wi ? 'reed' : 'straw' }, roof: { type: 'cone', tex: 'tex_thatch', ramp: c.m.roofR, H: 12 }, snow: c.snow };
    } else if (tier === 2) {
      r = 9; h = 26 + v.dh + c.extra;
      spec = { w: 1, d: 1, h: h, shape: 'round', r: r, wall: { tex: 'tex_planks', ramp: v.wi ? 'driftwood' : 'oak' }, roof: { type: 'cone', tex: 'tex_shingles', ramp: c.m.roofR, H: 12 }, snow: c.snow };
    } else {
      r = 10; h = 28 + v.dh + c.extra;
      spec = { w: 1, d: 1, h: h, shape: 'round', r: r, plinth: 3, wall: { tex: 'tex_cutstone', ramp: v.wi ? 'river' : 'sandstone' }, roof: { type: 'cone', tex: 'tex_tiles', ramp: c.m.roofR, H: 13 }, snow: c.snow };
    }
    put(F, spec, 0, 0, z0);
    var cc = [ce[0], ce[1] - z0], ry = r / 2;
    function ring(z, ramp, lit) {
      for (var px = cc[0] - r; px < cc[0] + r; px++) { var dx = (px + 0.5 - cc[0]) / r; if (Math.abs(dx) >= 1) continue;
        var yb = cc[1] + round(ry * Math.sqrt(1 - dx * dx)) - 1 - z; p.set(px, yb, R(ramp, (dx < 0.2 ? 1 : dx < 0.65 ? 2 : 3) - (lit ? 1 : 0))); }
    }
    if (tier === 2) [5, 13, 21].forEach(function (z) { if (z < h - 2) ring(z, metal); });
    if (tier === 1) ring(3, 'walnut');
    var hz = h - 7, hx = cc[0] + round(r * 0.35), hy = cc[1] + round(ry * 0.92) - 1 - hz;
    for (var j = 0; j < 4; j++) for (var i = 0; i < 3; i++) p.set(hx + i, hy - j, (i === 0 || j === 3) ? R('walnut', 2) : x.pal().ink);
    /* grain level from resource.Food: a gauge slot on the tank (P2, P3) or a spilled heap (P1) */
    var gq = o.fq == null ? 0.6 : o.fq;
    if (tier === 1) { if (gq > 0.05) { var gp = F.Pg(0.95, 0.75); mound(p, gp[0], gp[1], 3 + round(gq * 4), 1 + round(gq * 4), 'tex_thatch', 'straw', c.snow ? { cap: ['snow', 1] } : null); } }
    else {
      var gx = cc[0] + round(r * 0.05), gyb = cc[1] + round(ry) - 2 - 3, gh = h - 12, gf = round(gh * gq);
      for (var gj = 0; gj < gh; gj++) { var full = gj < gf; p.set(gx, gyb - gj, full ? R('straw', gj === gf - 1 ? 0 : 1) : x.pal().ink); p.set(gx + 1, gyb - gj, full ? R('straw', gj === gf - 1 ? 1 : 2) : x.pal().ink); }
      p.set(gx - 1, gyb + 1, R(metal, 2)); p.set(gx, gyb + 1, R(metal, 2)); p.set(gx + 1, gyb + 1, R(metal, 3)); p.set(gx + 2, gyb + 1, R(metal, 3));
    }
    var lx = cc[0] - round(r * 0.55), ly = cc[1] + round(ry * 0.8) - 1;
    spr(p, 'ladder', { WOOD: 'pinewood' }, lx, ly + z0, null);
    if (h > 16) spr(p, 'ladder', { WOOD: 'pinewood' }, lx, ly + z0 - 11, null);
    if (v.acc.indexOf('herb_bundle') >= 0 && tier > 1) { var hb = SK.PIECES.herb_bundle; p.blit(x.sprite('herb_bundle'), cc[0] + 2, cc[1] + round(ry * 0.95) - h + 2); }
    var apex = [cc[0], cc[1] - h - spec.roof.H];
    return out(F, { roof: apex, h: h + spec.roof.H, v: v });
  }

  function mill(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(1, 1, 76 + c.extra), p = F.p, ce = F.Pg(0.5, 0.5), hub, roofPt, g;
    if (tier === 1) {
      var zb = 9, wr = v.wi ? 'walnut' : 'oak';
      setL(p, [ce[0] - 7, ce[1] + 1], [ce[0] - 1, ce[1] - zb], R(wr, 3)); setL(p, [ce[0] + 7, ce[1] + 1], [ce[0] + 1, ce[1] - zb], R(wr, 3));
      post(p, [ce[0] - 1, ce[1] + 3], zb + 3, wr); setL(p, [ce[0] - 5, ce[1] - 2], [ce[0] + 5, ce[1] - 2], R(wr, 2));
      var spec = { w: 0.5, d: 0.625, h: 13 + v.dh + c.extra, wall: { tex: 'tex_planks', ramp: wr }, roof: { type: 'gable', axis: 'y', tex: 'tex_thatch', ramp: c.m.roofR, pitch: 3 }, snow: c.snow };
      g = put(F, spec, 0.25, 0.1875, zb); roofDetail(p, g);
      H.onFace(p, g, 'R', 'door_plain', { MAIN: 'oak' }, 1, 0);
      setL(p, [H.faceX(g, 'R', 2), H.faceY(g, 'R', 2) + 1], [H.faceX(g, 'R', 7), H.faceY(g, 'R', 2) + zb], R('pinewood', 2));
      hub = [H.faceX(g, 'L', 8) - 1, H.faceY(g, 'L', 8) - (spec.h - 4)];
      roofPt = ridgePt(g, 0.5);
    } else {
      var r = tier === 2 ? 8 : 9, h = (tier === 2 ? 26 : 28) + v.dh + c.extra;
      var sp2 = { w: 1, d: 1, h: h, shape: 'round', r: r, plinth: tier === 3 ? 3 : 0,
        wall: tier === 2 ? { tex: 'tex_planks', ramp: v.wi ? 'driftwood' : 'pinewood' } : { tex: v.wi ? 'tex_cutstone' : 'tex_drystone', ramp: v.wi ? 'sandstone' : 'river' },
        roof: { type: 'cone', tex: c.m.roofTex, ramp: c.m.roofR, H: 10 }, snow: c.snow };
      if (lvl >= 1) put(F, { w: 0.5, d: 0.5, h: 9, wall: sp2.wall, roof: { type: 'lean', axis: 'y', tex: c.m.roofTex, ramp: c.m.roofR }, snow: c.snow }, 0.55, -0.2);
      put(F, sp2, 0, 0);
      var fy = ce[1] + round(r / 2) - 1;
      spr(p, tier === 3 ? 'door_arched' : 'door_plain', { MAIN: v.paint, ACCENT: v.paint2, WOOD: 'oak' }, ce[0] - 3, fy + 1, null);
      p.blit(x.sprite(tier === 3 ? 'win_glazed' : 'win_shutter', { MAIN: v.paint2 }, { flip: true, shade: 1 }), ce[0] + 2, fy - 18);
      if (v.acc.indexOf('flowerbox') >= 0 || tier === 3) p.blit(x.sprite('flowerbox', { ACCENT: v.bloom, FOLIAGE: c.fol }), ce[0] + 2, fy - 12);
      hub = [ce[0] - round(r * 0.5), fy - (h - 5)];
      roofPt = [ce[0], ce[1] - h - 10];
    }
    for (var j = 0; j < 3; j++) for (var i = 0; i < 3; i++) p.set(hub[0] - 1 + i, hub[1] - 1 + j, R('walnut', i + j > 2 ? 3 : 2));
    var f = o.af & 3, sail = ['cream', 'saffron', 'rose'][v.ri];
    p.blit(x.sprite((f & 1) ? 'sig_mill_sails_45' : 'sig_mill_sails_0', { MAIN: sail, WOOD: 'walnut' }, { rot: (f >> 1) * 90 }), hub[0] - 10, hub[1] - 10);
    p.set(hub[0], hub[1], R(o.metal || 'iron', 1));
    return out(F, { roof: roofPt, h: 34 + c.extra, v: v });
  }

  /* ---------- STORAGE ---------- */
  function shed(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(1, 1, 36 + c.extra), p = F.p, sf = o.fq == null ? 0.6 : o.fq;
    if (tier === 1) {
      leanTo(F, 0.15, 0.15, 0.85, 0.85, 13 + c.extra, 9 + c.extra, 'tex_thatch', c.m.roofR, 'oak', c.snow, function () {
        var a = F.Pg(0.42, 0.5); stack(p, a[0], a[1], 'unit_crate', {}, 2, 7, 5, Math.max(0.34, sf));
        var b = F.Pg(0.62, 0.62); spr(p, 'unit_sack', { ACCENT: v.paint }, b[0], b[1]);
      });
    } else {
      var spec = { w: 0.8, d: 0.8, h: 12 + v.dh + c.extra, plinth: tier === 3 ? 5 : 2, wall: { tex: 'tex_planks', ramp: v.wi ? 'driftwood' : 'pinewood' },
        roof: { type: 'lean', axis: v.axis, tex: c.m.roofTex, ramp: c.m.roofR }, snow: c.snow };
      annex(F, c, spec, -0.4, 0.4);
      var g = put(F, spec, 0.1, 0.1); hutDoor(p, g, 'L', c);
      if (tier === 3) { var hp = F.Pg(0.98, 0.32); spr(p, 'sig_hoist', { METAL: o.metal || 'iron' }, hp[0], hp[1]); }
      else { var bp = F.Pg(0.98, 0.55); stack(p, bp[0], bp[1], 'unit_crate', {}, 2, 7, 5, Math.max(0.34, sf)); }
      if (v.acc.length) { var pp = F.Pg(0.05, 0.98); spr(p, v.acc[0] === 'barrel' ? 'barrel' : 'pot_flowers', { ACCENT: v.bloom, FOLIAGE: c.fol }, pp[0], pp[1]); }
    }
    return out(F, { roof: F.Pg(0.5, 0.5, 14 + c.extra), h: 14 + c.extra, v: v });
  }

  function storage_yard(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(2, 2, 40), p = F.p, fq = o.fq == null ? 0.6 : o.fq;
    ground(F, 0.06, 0.06, 1.94, 1.94, function (px, py) {
      if (c.snow) return R('snow', 1);
      if (tier === 3) return x.texC('tex_cutstone', px, py * 2, 'river', 0);
      return R('dirt', 1);
    });
    if (!c.snow && tier < 3) chips(F, 0.1, 0.1, 1.9, 1.9, 'dirt', 26, k + 3);
    fence(F, [[0.04, 1.9], [0.04, 0.04], [1.9, 0.04]], 0.38, tier === 1 ? 'driftwood' : 'oak', tier === 1);
    if (tier === 1) leanTo(F, 0.12, 0.12, 0.78, 0.78, 12, 8, 'tex_thatch', c.m.roofR, 'oak', c.snow, function () { var a = F.Pg(0.45, 0.45); spr(p, 'unit_fur_bundle' in SK.PIECES ? 'unit_fur_bundle' : 'unit_sack', {}, a[0], a[1]); });
    else put(F, { w: 0.66, d: 0.66, h: 11, plinth: tier === 3 ? 3 : 0, wall: tier === 3 ? { tex: 'tex_cutstone', ramp: 'sandstone' } : c.m.wall,
      roof: { type: 'lean', axis: 'y', tex: c.m.roofTex, ramp: c.m.roofR }, snow: c.snow }, 0.12, 0.12);
    if (tier === 3) { var hp = F.Pg(1.72, 0.28); spr(p, 'sig_hoist', { METAL: o.metal || 'iron' }, hp[0], hp[1], { flip: true }); }
    var a1 = F.Pg(1.25, 0.62), a2 = F.Pg(0.62, 1.3), a3 = F.Pg(1.4, 1.35);
    stack(p, a1[0], a1[1], 'unit_crate', {}, 3, 7, 5, Math.min(1, fq * 1.6));
    stack(p, a2[0], a2[1], 'unit_sack', { MAIN: v.ri === 1 ? 'sand' : 'cream', ACCENT: v.paint }, 2, 6, 4, Math.max(0, fq * 1.6 - 0.3));
    var nb = 2 + lvl;
    for (var i = 0; i < nb; i++) spr(p, 'barrel', { METAL: o.metal || 'iron' }, a3[0] + (i % 2) * 6 - (i > 1 ? 3 : 0), a3[1] + (i % 2) * 2 + (i > 1 ? 4 : 0));
    fence(F, [[0.04, 1.96], [1.96, 1.96], [1.96, 0.04]], 0.38, tier === 1 ? 'driftwood' : 'oak', tier === 1, function (i) { return i === 3; });
    return out(F, { roof: F.Pg(0.45, 0.45, 12), h: 10, noShadow: true, v: v });
  }

  /* ---------- EXTRACTION ---------- */
  function axeOn(p, sx, sy, metal) {
    var x = X(); setL(p, [sx, sy], [sx + 3, sy - 4], x.R('oak', 1)); p.set(sx + 4, sy - 5, x.R(metal, 1)); p.set(sx + 5, sy - 5, x.R(metal, 2)); p.set(sx + 4, sy - 4, x.R(metal, 2)); p.set(sx + 5, sy - 4, x.R(metal, 3));
  }
  function stump(p, a, ramp) {
    var x = X();
    stamp(p, ['.0000.', '011112', '.2223.'], a[0] - 3, a[1] - 5, 'pinewood');
    stamp(p, ['122223', '.2334.'], a[0] - 3, a[1] - 2, ramp || 'walnut');
  }
  function sawhorse(F, u, v, logR) {
    var x = X(), p = F.p, a = F.Pg(u, v), wr = x.R('oak', 2), wd = x.R('oak', 3);
    setL(p, [a[0] - 5, a[1]], [a[0] - 2, a[1] - 5], wr); setL(p, [a[0] - 2, a[1]], [a[0] - 5, a[1] - 5], wd);
    setL(p, [a[0] + 2, a[1] + 1], [a[0] + 5, a[1] - 4], wr); setL(p, [a[0] + 5, a[1] + 1], [a[0] + 2, a[1] - 4], wd);
    stamp(p, ['.0011112', '01222233', '.1233344'], a[0] - 5, a[1] - 8, logR || 'walnut');
  }
  function lumber_yard(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(2, 2, 44), p = F.p, fq = o.fq == null ? 0.6 : o.fq;
    ground(F, 0.06, 0.06, 1.94, 1.94, function () { return c.snow ? R('snow', 1) : R('dirt', 1); });
    if (!c.snow) chips(F, 0.1, 0.1, 1.9, 1.9, 'pinewood', 34, k + 11);
    var bark = v.wi ? 'walnut' : 'oak';
    leanTo(F, 0.12, 0.1, 1.05, 0.62, 14, 10, c.m.roofTex, c.m.roofR, 'oak', c.snow, function () {
      var a = F.Pg(0.6, 0.38); stack(p, a[0], a[1], 'unit_log', { MAIN: bark }, 3, 4, 3, Math.min(1, fq * 2));
    });
    if (tier === 3) { var st = F.Pg(0.12, 0.62), en = F.Pg(1.05, 0.62); for (var xx = st[0]; xx <= en[0]; xx++) { var yy = round(st[1] + (xx - st[0]) / 2); p.set(xx, yy, R('river', 2)); p.set(xx, yy + 1, R('river', 3)); } }
    if (tier >= 2) sawhorse(F, 1.6, 0.42, bark);
    var a1 = F.Pg(1.3, 1.0), a2 = F.Pg(0.55, 1.35);
    var f1 = Math.min(1, fq * 1.7), f2 = Math.max(0, fq * 1.7 - 0.7) / 1.0;
    stack(p, a1[0], a1[1], 'unit_log', { MAIN: bark }, 4, 4, 3, Math.max(f1, 0.15));
    stack(p, a2[0], a2[1], 'unit_log', { MAIN: v.wi ? 'oak' : 'walnut' }, 3, 4, 3, f2 + lvl * 0.2);
    if (tier === 3) { var hp = F.Pg(0.2, 1.0); spr(p, 'sig_hoist', { METAL: o.metal || 'iron' }, hp[0], hp[1]); }
    var cb = F.Pg(1.55, 1.55); stump(p, cb, bark); axeOn(p, cb[0] - 1, cb[1] - 5, o.metal || 'iron');
    if (v.acc.length) { var bp = F.Pg(1.85, 1.2); spr(p, 'tool_lean', { METAL: o.metal || 'iron' }, bp[0], bp[1]); }
    return out(F, { roof: F.Pg(0.6, 0.35, 14), h: 12, noShadow: true, v: v });
  }

  function sawmill(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(2, 2, 64 + c.extra), p = F.p, metal = o.metal || 'iron', zr = 18 + c.extra, emit = [];
    ground(F, 0.1, 0.3, 1.9, 1.7, function () { return c.snow ? R('snow', 2) : R('pinewood', 2); });
    ground(F, 0.1, 0.3, 1.9, 1.7, function (px, py) { return (py + floor(px / 2)) % 4 === 0 ? R(c.snow ? 'snow' : 'pinewood', 3) : 0; });
    var corners = [[0.15, 0.35], [1.85, 0.35], [0.15, 1.65], [1.85, 1.65]], pr = tier === 1 ? 'oak' : tier === 2 ? 'walnut' : 'walnut';
    function pst(q) { var a = F.Pg(q[0], q[1]); post(p, a, zr, pr); if (tier === 3) stamp(p, ['.00.', '0112', '1223'], a[0] - 1, a[1] - 2, 'river'); }
    pst(corners[0]);
    var hp = F.Pg(1.65, 0.6); spr(p, 'sig_hopper', { MAIN: 'sand', WOOD: 'pinewood' }, hp[0], hp[1]);
    pst(corners[1]);
    var r0 = F.Pg(0.3, 0.92), r1 = F.Pg(1.75, 0.92), r2 = F.Pg(0.3, 1.1), r3 = F.Pg(1.75, 1.1);
    setL(p, r0, r1, R(metal, 2)); setL(p, r2, r3, R(metal, 1));
    var lA = F.Pg(0.35, 1.0, 3), lB = F.Pg(1.05, 1.0, 3);
    for (var xx = lA[0]; xx <= lB[0]; xx++) { var yy = round(lA[1] + (xx - lA[0]) / 2); p.set(xx, yy - 1, R('walnut', 1)); p.set(xx, yy, R('walnut', 2)); p.set(xx, yy + 1, R('walnut', 3)); p.set(xx, yy + 2, R('walnut', 4)); }
    stamp(p, ['.01.', '0122', '1223', '.23.'], lB[0] - 1, lB[1] - 2, 'pinewood');
    var bc = F.Pg(1.3, 1.0, 7), rB = 5, step = o.af & 3, ink = x.pal().ink;
    for (var j = -rB; j <= rB; j++) for (var i = -rB; i <= rB; i++) { var dd = i * i + j * j; if (dd > rB * rB) continue; p.set(bc[0] + i, bc[1] + j, R(metal, dd > (rB - 1) * (rB - 1) ? 3 : (i + j < 0 ? 0 : 1))); }
    for (var t = 0; t < 8; t++) { var an = (t + step / 4) * Math.PI / 4; p.set(bc[0] + round(Math.cos(an) * (rB + 1)), bc[1] + round(Math.sin(an) * (rB + 1)), R(metal, 2)); }
    var sa = (step / 4) * Math.PI / 2; p.set(bc[0], bc[1], ink); p.set(bc[0] + round(Math.cos(sa) * 2), bc[1] + round(Math.sin(sa) * 2), R(metal, 3)); p.set(bc[0] - round(Math.cos(sa) * 2), bc[1] - round(Math.sin(sa) * 2), R(metal, 3));
    var dh = F.Pg(1.45, 1.35); if (!c.snow) mound(p, dh[0], dh[1], 5, 3, 'tex_wattle', 'pinewood');
    emit.push([bc[0] + 2, bc[1] - rB, 'sawdust']);
    pst(corners[2]); pst(corners[3]);
    var rs = { w: 1.8, d: 1.4, h: 2, wall: { tex: 'tex_planks', ramp: 'walnut' }, roof: { type: 'gable', axis: 'x', tex: c.m.roofTex, ramp: c.m.roofR, pitch: 2 }, snow: c.snow };
    var g = put(F, rs, 0.1, 0.3, zr - 1); roofDetail(p, g);
    var lp = F.Pg(0.25, 1.95); stack(p, lp[0], lp[1], 'unit_log', { MAIN: 'oak' }, 3, 4, 3, 0.5 + lvl * 0.25);
    if (v.acc.indexOf('lantern') >= 0 || v.acc.indexOf('wind_chime') >= 0) { var lt = g.P(1.8, 1.4, g.H); p.blit(x.sprite('lantern', { ACCENT: v.paint }), lt[0] - 1, lt[1] + 1); }
    return out(F, { roof: ridgePt(g, 0.5), h: 26 + c.extra, noShadow: false, emit: o.on !== false ? emit : [], v: v });
  }

  function rock_quarry(type, tier, k, season, lvl, o) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(2, 2, 34), p = F.p, fq = o.fq == null ? 0.6 : o.fq;
    var rock = v.wi ? 'sandstone' : 'river', L = new Int8Array(p.w * p.h).fill(-1), N = 3, ins = 0.24, dz = 6;
    function dia(i, z) { var a = 0.05 + i * ins, b = 1.95 - i * ins; return [F.Pg(a, a, -z), F.Pg(b, a, -z), F.Pg(b, b, -z), F.Pg(a, b, -z)]; }
    x.fillPoly(p, dia(0, 0), function (px, py) { L[py * p.w + px] = 0; return c.snow ? R('snow', 1) : x.texC('tex_drystone', px, py * 2, rock, 0); });
    for (var i = 1; i <= N; i++) {
      var topX = F.Pg(0.05 + i * ins, 0.05 + i * ins)[0];
      x.fillPoly(p, dia(i, dz * (i - 1)), function (px, py) { var q = py * p.w + px; if (L[q] !== i - 1) return 0; L[q] = i; return x.texC('tex_cutstone', px, py, rock, px < topX ? 2 : 1); });
      x.fillPoly(p, dia(i, dz * i), function (px, py) { var q = py * p.w + px; if (L[q] !== i) return 0; L[q] = i + 10;
        return (c.snow && i < N) ? R('snow', 1) : R(rock, i === N ? 1 : 0); });
      var lp = dia(i, dz * (i - 1)); setL(p, lp[3], lp[0], R(rock, 3)); setL(p, lp[0], lp[1], R(rock, 3));
    }
    var bot = F.Pg(1, 1, -dz * N); if (!c.snow) stamp(p, ['.00.', '0112', '.12.'], bot[0] - 2, bot[1] - 2, 'water', true);
    if (!c.snow) for (var j = 0; j < 7; j++) { var pq = F.Pg(0.4 + ih(j, k) * 1.2, 0.4 + ih(k, j) * 1.2); stamp(p, ['01', '12'], pq[0], pq[1] - 4, rock, true); }
    if (tier === 1) { [[0.42, 0.42], [0.7, 0.32], [0.32, 0.75]].forEach(function (q) { var a = F.Pg(q[0], q[1], -dz); post(p, [a[0], a[1] + 1], dz + 2, 'oak'); }); }
    var bs = F.Pg(0.32, 1.72); stack(p, bs[0], bs[1], 'unit_block', { MAIN: rock }, 4, 7, 4, Math.max(0.1, fq));
    if (lvl >= 1) { var b2 = F.Pg(0.85, 1.85); stack(p, b2[0], b2[1], 'unit_block', { MAIN: rock }, 3, 7, 4, 0.5 + 0.25 * lvl); }
    if (tier === 1) { var sl = F.Pg(1.6, 1.75); stamp(p, ['.000000.', '01111112', '.3....3.'], sl[0] - 4, sl[1] - 2, 'oak'); spr(p, 'unit_block', { MAIN: rock }, sl[0], sl[1] - 2); }
    if (tier === 2) { var hp = F.Pg(1.68, 0.3); spr(p, 'sig_hoist', { METAL: o.metal || 'iron' }, hp[0], hp[1], { flip: true }); }
    if (tier === 3) {
      var ra = F.Pg(1.78, 0.9), rb = F.Pg(1.78, 1.95), rc = F.Pg(1.9, 0.9), rd = F.Pg(1.9, 1.95), m = o.metal || 'iron';
      setL(p, ra, rb, R(m, 2)); setL(p, rc, rd, R(m, 1));
      var cp = F.Pg(1.84, 1.35); spr(p, 'sig_cart', { MAIN: m, ACCENT: rock, METAL: m }, cp[0], cp[1]);
    }
    return out(F, { roof: F.Pg(1, 1, 0), h: 8, noShadow: true, v: v });
  }

  var CART_POS = [0, 1, 3, 5, 6, 5, 3, 1];
  function mineCore(type, tier, k, season, lvl, o, coal) {
    var c = C(type, tier, k, season, lvl), x = c.x, R = c.R, v = c.v, F = frame(2, 2, 52 + c.extra), p = F.p, metal = o.metal || 'iron';
    var rock = coal ? 'slate' : (v.wi ? 'sandstone' : 'river'), wood = tier === 1 ? 'oak' : tier === 2 ? 'pinewood' : 'walnut', emit = [];
    var ore = coal ? 'soot' : (metal === 'copper' ? 'copper' : 'rust');
    var hc = F.Pg(0.85, 0.75);
    var cap = c.snow ? ['snow', 2, 0] : [coal ? 'ashleaf' : c.fol, 2, 0];
    if (lvl >= 1) mound(p, hc[0] + 20, hc[1] + 1, 12, 12, 'tex_wattle', rock, { cap: cap });
    var mt = mound(p, hc[0], hc[1] + 4, 27, 24 + c.extra, 'tex_wattle', rock, { cap: cap });
    for (var q = 0; q < 16; q++) { var rx = hc[0] - 22 + floor(ih(q, k + 7) * 44), ry = mt.top + 5 + floor(ih(k + 7, q) * 20); stamp(p, q % 2 ? ['.00.', '0112', '1223'] : ['01.', '122'], rx, ry, rock, true); }
    var gm = F.Pg(0.92, 1.1);
    if (tier === 3) { for (var xx = gm[0] - 13; xx <= gm[0] + 13; xx++) for (var j = 0; j < 4; j++) p.set(xx, gm[1] - j + 1, x.texC('tex_drystone', xx, j, 'river', xx < gm[0] ? 0 : 1)); }
    spr(p, 'sig_gallery', { MAIN: rock, WOOD: wood, METAL: metal }, gm[0], gm[1] + 1);
    var hf = F.Pg(1.6, 0.85);
    if (tier === 1) spr(p, 'sig_hoist', { WOOD: wood, METAL: metal }, hf[0], hf[1]);
    else spr(p, 'sig_mine_headframe', { WOOD: wood, METAL: metal }, hf[0], hf[1]);
    var sp = F.Pg(0.3, 1.5);
    mound(p, sp[0], sp[1], coal ? 10 : 9, coal ? 9 : 7, 'tex_drystone', coal ? 'soot' : 'dirt', { cone: true, cap: c.snow ? ['snow', 1] : null });
    var a0 = F.Pg(0.84, 1.15), a1 = F.Pg(0.84, 1.95), b0 = F.Pg(1.0, 1.15), b1 = F.Pg(1.0, 1.95);
    for (var s = 1.2; s < 1.95; s += 0.14) setL(p, F.Pg(0.8, s), F.Pg(1.04, s), R(wood, 3));
    setL(p, a0, a1, R(metal, 2)); setL(p, b0, b1, R(metal, 1));
    var pos = CART_POS[(o.af | 0) & 7], cp = F.Pg(0.92, 1.42 + pos / 18);
    spr(p, 'sig_cart', { MAIN: metal, ACCENT: ore, METAL: metal }, cp[0], cp[1]);
    /* ore pile from resource.Copper / Iron / Coal */
    var oq = o.fq == null ? 0.6 : o.fq, orp = F.Pg(0.55, 1.85), oreR = coal ? 'soot' : (o.x === 'iron' ? 'iron' : 'copper');
    if (oq > 0.05) stack(p, orp[0], orp[1], 'unit_ore', { MAIN: oreR }, 3, 6, 3, oq);
    if (coal || tier === 3) { var lp = F.Pg(1.15, 1.25); post(p, lp, 11, wood); p.blit(x.sprite('lantern', { ACCENT: coal ? 'saffron' : v.paint }), lp[0] + 1, lp[1] - 10); }
    if (v.acc.indexOf('barrel') >= 0) { var bp = F.Pg(1.4, 1.45); spr(p, 'barrel', { METAL: metal }, bp[0], bp[1]); }
    emit.push([gm[0], gm[1] - 4, coal ? 'coal' : 'dust']);
    return out(F, { roof: [hc[0], hc[1] - 18], h: 22, noShadow: true, emit: o.on !== false ? emit : [], v: v });
  }
  function mine(type, tier, k, season, lvl, o) { return mineCore(type, tier, k, season, lvl, o, false); }
  function coal_mine(type, tier, k, season, lvl, o) { return mineCore(type, tier, k, season, lvl, o, true); }

  /* ---------- registration + dynamic state ---------- */
  var CMP = { smokehouse: smokehouse, farm: farm, compost: compost, silo: silo, mill: mill, shed: shed, storage_yard: storage_yard,
    lumber_yard: lumber_yard, sawmill: sawmill, rock_quarry: rock_quarry, mine: mine, coal_mine: coal_mine };
  Object.keys(CMP).forEach(function (k) { VL.COMPOSERS[k] = CMP[k]; });

  var ON_TYPES = { compost: 1, mill: 1, garrison: 1, sawmill: 1, cement_plant: 1, mine: 1, coal_mine: 1 };
  /* Grid buildings: city.X.on only counts powered units, so before an electrical grid exists (city.powered falsy)
     production runs with on === 0. Stopped look only when a grid exists and on === 0. (Audit, unconfirmed.) */
  var POWER = { sawmill: 1, mine: 1, coal_mine: 1, cement_plant: 1, mill: 1 };
  function active(st, type) {
    if (!ON_TYPES[type]) return true;
    var city = (st && st.city) || {}, b = city[type];
    if (!b || b.on === undefined) return true;
    if (POWER[type]) return !city.powered || b.on > 0;
    return b.on > 0;
  }
  function gear(lv) { lv = lv | 0; return lv >= 3 ? 'steel' : lv === 2 ? 'iron' : lv === 1 ? 'bronze' : null; }
  function metalOf(st) { var t = (st && st.tech) || {}; return (t.smelting | 0) >= 2 ? 'steel' : ((t.mining | 0) >= 3 ? 'iron' : 'copper'); }
  function fill(st, names) {
    var r = (st && st.resource) || {}, s = 0, n = 0;
    names.forEach(function (k) { var q = r[k]; if (q && q.max > 0) { s += Math.max(0, Math.min(1, q.amount / q.max)); n++; } });
    return n ? round(s / n * 8) / 8 : 0.5;
  }
  function D(fn) { return function (st, t, it) { var on = active(st, it.type), o = { metal: metalOf(st), on: on, af: 0 }; fn(o, st, t, on); return o; }; }
  var DY = VL.DYN;
  DY.mill = D(function (o, st, t, on) { var w = (((st.city || {}).calendar) || {}).wind | 0; o.af = on ? floor(t / (w ? 170 : 333)) & 3 : 0; });
  DY.sawmill = D(function (o, st, t, on) { o.af = on ? floor(t / 125) & 3 : 0; o.metal = gear(((st && st.tech) || {}).saw) || o.metal; });
  DY.mine = D(function (o, st, t, on) { o.af = on ? floor(t / 250) & 7 : 0; var r = (st && st.resource) || {}, cu = r.Copper || {}, fe = r.Iron || {};
    o.x = (fe.amount || 0) > (cu.amount || 0) ? 'iron' : 'copper'; o.fq = fill(st, ['Copper', 'Iron']); });
  DY.coal_mine = D(function (o, st, t, on) { o.af = on ? floor(t / 250) & 7 : 0; o.fq = fill(st, ['Coal']); });
  DY.compost = D(function (o, st, t, on) { o.af = on ? floor(t / 125) & 7 : 0; });
  DY.lumber_yard = D(function (o, st) { o.fq = fill(st, ['Lumber']); });
  DY.rock_quarry = D(function (o, st) { o.fq = fill(st, ['Stone']); });
  DY.storage_yard = D(function (o, st) { o.fq = fill(st, ['Food', 'Lumber', 'Stone', 'Furs']); });
  DY.silo = D(function (o, st) { o.fq = fill(st, ['Food']); });
  DY.smokehouse = D(function (o, st) { o.fq = fill(st, ['Furs']); });
  DY.shed = D(function (o, st) { o.fq = fill(st, ['Lumber', 'Stone', 'Copper', 'Iron']); });
  DY.farm = D(function (o, st) { var t = (st && st.tech) || {}; o.x = ((t.agriculture | 0) >= 2 ? 'i' : '') + ((t.farm | 0) >= 1 ? 'h' : ''); });
  VL.active = active; VL.metalOf = metalOf; VL.gear = gear;
  VL.B3 = { frame: frame, put: put, spr: spr, ground: ground, shade: shade, setL: setL, stamp: stamp, mound: mound, post: post, fence: fence,
    stack: stack, chimney: chimney, roofDetail: roofDetail, ridgePt: ridgePt, leanTo: leanTo, chips: chips, C: C, out: out, annex: annex,
    hutDoor: hutDoor, ih: ih, D: D, fill: fill };
  VL.b3 = true;
  }
})(window);
