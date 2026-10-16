/* Evolve sprite kit — Era 0 / Evolution view (Batch 9 logic).
   Drawn while race.species === 'protoplasm': a side-on primordial pool (stages 0-3, world at x2) that grows into an
   isometric shoreline (stages 4-7, the kit's terrain generator with its own layout, creatures at citizen scale),
   then hands over to the village renderer when the species flips. Deterministic (own clock, seeded PRNG),
   integer pixels, every colour from SK.PALETTE. Reads state defensively: a missing field is a default, never a throw.
   Stage and creature tables are data: other evolution branches can be added to PATHS / CREATURES later. */
(function (G) {
  'use strict';
  var SK = G.SK = G.SK || {};
  SK._ext = (SK._ext || []).filter(function (e) { return e.id !== 'evo'; });
  SK._ext.push({ id: 'evo', fn: reg });
  if (SK._runExt) SK._runExt();
  function reg() {
  if (!G.SpriteKit || !G.SpriteKit._.view || !SK.PARTS || !SK.PARTS.b9 || !SK.ui || !SK.ui.panel || !SK.citizens || !SK.citizens.compose) return false;
  var X = G.SpriteKit._, R = X.R, Pix = X.Pix, P = SK.PIECES, sprite = X.sprite, shift = X.shift, ih = X.ih, vn = X.vnoise, OPT = X.OPT;
  var floor = Math.floor, round = Math.round, sin = Math.sin, cos = Math.cos, PI = Math.PI, abs = Math.abs, min = Math.min, max = Math.max, hyp = Math.hypot;
  var WW = X.WW, WH = X.WH, WK = X.WK, N = X.MAPN;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mod(a, n) { return ((a % n) + n) % n; }
  function q(t, ms) { return floor(t / ms) * ms; }

  /* ---------- tables (human path only; other branches plug in here) ---------- */
  var FINALS = [null, null, 20, 40, 60, 80, 90, 100];
  var PATHS = { human: [
    { stage: 0, id: 'protoplasm', view: 'pool', label: 'soup' },
    { stage: 1, id: 'cell', view: 'pool', label: 'cell' },
    { stage: 2, id: 'sexual_reproduction', view: 'pool', label: 'pair' },
    { stage: 3, id: 'phagocytosis', view: 'pool', label: 'phago' },
    { stage: 4, id: 'multicellular', view: 'shore', creature: 'colony', label: 'colony' },
    { stage: 5, id: 'bilateral_symmetry', view: 'shore', creature: 'worm', label: 'worm' },
    { stage: 6, id: 'mammals', view: 'shore', creature: 'mammal', label: 'mammal' },
    { stage: 7, id: 'humanoid', view: 'shore', creature: 'ape', label: 'ape' }] };
  /* home: patrol segment in tile coords; speed tiles/s; fps of the walk cycle; pause ms at each end (rest frame) */
  var CREATURES = {
    colony: { walk: ['org_colony_l'], fps: 2, speed: 0.08, water: true, home: [[7.2, 16.4], [8.4, 16.8]] },
    worm: { walk: ['org_worm_a', 'org_worm_b'], fps: 4, speed: 0.22, home: [[8.0, 11.7], [9.7, 12.3]] },
    mammal: { walk: ['org_mammal_a', 'org_mammal_b'], rest: 'org_mammal_rest', fps: 6, speed: 0.7, pause: 3000, home: [[9.0, 10.3], [11.4, 10.0]] },
    ape: { walk: ['org_ape_a', 'org_ape_b'], rest: 'org_ape_idle', fps: 6, speed: 0.5, pause: 4000, tool: true, home: [[9.8, 10.2], [11.5, 10.7]] }
  };
  /* pool tint per biome: s surface water, d deep water, f sea floor, w fronds, vents count */
  var BIO = {
    grassland: { s: 'water', d: 'abyss', f: 'sand', w: 'kelp' }, oceanic: { s: 'lagoon', d: 'abyss', f: 'sand', w: 'kelp' },
    forest: { s: 'water', d: 'abyss', f: 'dirt', w: 'conifer' }, taiga: { s: 'water', d: 'abyss', f: 'river', w: 'conifer' },
    desert: { s: 'lagoon', d: 'abyss', f: 'sandstone', w: 'dry' }, savanna: { s: 'lagoon', d: 'abyss', f: 'sand', w: 'dry' },
    volcanic: { s: 'water', d: 'abyss', f: 'basalt', w: 'ashleaf', vents: 4 }, ashland: { s: 'slate', d: 'abyss', f: 'ashen', w: 'ashleaf', vents: 3 },
    tundra: { s: 'water', d: 'abyss', f: 'river', w: 'frost' }, swamp: { s: 'murk', d: 'bog', f: 'dirt', w: 'bog' },
    hellscape: { s: 'rust', d: 'brick', f: 'basalt', w: 'scorch', vents: 5 }, eden: { s: 'lagoon', d: 'abyss', f: 'sand', w: 'lush' }
  };
  var SURF = 236, CX = 416, CY = 318, COLONY_MS = 5700;
  var HT = { walk: 1200, stand: 1700, drop: 2100, wipe: 3700, end: 4700 };

  /* ---------- defensive read ---------- */
  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
  function obj(v) { return v && typeof v === 'object' ? v : null; }
  function read(st) {
    st = obj(st) || {};
    var race = obj(st.race) || {}, ev = obj(st.evolution) || {}, res = obj(st.resource) || {}, tech = obj(st.tech) || {}, city = obj(st.city) || {}, stats = obj(st.stats);
    function cnt(k) { var o = obj(ev[k]); return o ? max(0, floor(num(o.count, 0))) : 0; }
    function rr(k) { var o = obj(res[k]); return o ? { a: max(0, num(o.amount, 0)), m: max(1, num(o.max, 100)) } : null; }
    var s = num(tech.evo, NaN), stage = isFinite(s) ? clamp(floor(s), 1, 7) : (obj(ev.mitochondria) ? 1 : 0), e = obj(st.event);
    return { species: typeof race.species === 'string' ? race.species : '', stage: stage, final: typeof ev.final === 'number' && isFinite(ev.final) ? clamp(ev.final, 0, 100) : null,
      RNA: rr('RNA') || { a: 0, m: 100 }, DNA: rr('DNA'), m: cnt('membrane'), o: cnt('organelles'), n: cnt('nucleus'), e: cnt('eukaryotic_cell'), x: cnt('mitochondria'),
      biome: typeof city.biome === 'string' && BIO[city.biome] ? city.biome : 'grassland', seed: num(st.seed, 0), days: stats ? num(stats.days, null) : null, ev: e && e.l ? String(e.l) : '' };
  }
  function stageInfo(d) { var p = PATHS.human; return p[clamp(d.stage, 0, p.length - 1)]; }

  /* ---------- drawing helpers (silhouette mode paints every actor in ink) ---------- */
  var SIL = false;
  function ink() { return X.pal().ink; }
  function px(b, x, y, c) { b.set(round(x), round(y), SIL ? ink() : c); }
  function put(b, p, x, y, flip) {
    x = round(x); y = round(y); if (!SIL) { b.blit(p, x, y, flip); return; }
    var k = ink(); for (var j = 0; j < p.h; j++) for (var i = 0; i < p.w; i++) if (p.d[j * p.w + (flip ? p.w - 1 - i : i)]) b.set(x + i, y + j, k);
  }
  function putC(b, p, cx, cy, flip) { put(b, p, round(cx) - (p.w >> 1), round(cy) - (p.h >> 1), flip); }
  function spr(n, map, o) { return sprite(n, map || null, o || null); }
  var FR = new Map();
  function frameOf(n, f, map) {
    var key = n + '|' + f + '|' + (map ? JSON.stringify(map) : ''); if (FR.has(key)) return FR.get(key);
    var pc = P[n], k = pc.frames || 1, fw = pc.w / k, s = spr(n, map), o = new Pix(fw, pc.h);
    for (var y = 0; y < pc.h; y++) for (var x = 0; x < fw; x++) o.d[y * fw + x] = s.d[y * s.w + (f % k) * fw + x];
    FR.set(key, o); return o;
  }
  function crop(p, x0, w) { var o = new Pix(w, p.h); for (var y = 0; y < p.h; y++) for (var x = 0; x < w; x++) o.d[y * w + x] = p.d[y * p.w + x0 + x]; return o; }
  /* DNA rotation: the strand is a 24-row helix, so a quarter turn is a 6-row cyclic shift */
  function strand(f) {
    var key = 'dna|' + f; if (FR.has(key)) return FR.get(key);
    var s = spr('cell_dna_strand'), o = new Pix(s.w, s.h);
    for (var y = 0; y < s.h; y++) for (var x = 0; x < s.w; x++) o.d[y * s.w + x] = s.d[((y + 6 * f) % s.h) * s.w + x];
    FR.set(key, o); return o;
  }
  /* RNA speck: a small lantern (plus shape, ember heart) or a 2x2 seed; k fades one tone */
  function speck(b, x, y, k, small) {
    x = round(x); y = round(y); k = k | 0;
    if (small) { px(b, x, y, R('saffron', k)); px(b, x + 1, y, R('saffron', 1 + k)); px(b, x, y + 1, R('saffron', 1 + k)); px(b, x + 1, y + 1, R('saffron', 2 + k)); return; }
    px(b, x, y - 1, R('saffron', k)); px(b, x - 1, y, R('saffron', k)); px(b, x, y, R('ember', 1 + k)); px(b, x + 1, y, R('saffron', 2 + k)); px(b, x, y + 1, R('saffron', 2 + k));
  }
  function glow(b, cx, cy, r) {
    var rev = X.pal().rev;
    for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) { if (x * x + y * y > r * r) continue; var c = b.get(cx + x, cy + y), e = c && rev.get(c); if (e && e[0] === 'cytoplasm' && e[1] > 0) b.set(cx + x, cy + y, R('cytoplasm', e[1] - 1)); }
  }
  /* membrane wall: an elliptical band textured with the 8x8 segments (u along the wall, v across it), lit from the upper left */
  function ring(b, cx, cy, rx, ry, th, pats, t) {
    var R0 = (rx + ry) / 2, ox = ceil(rx + th + 2), oy = ceil(ry + th + 2), k = ink();
    for (var y = -oy; y <= oy; y++) for (var x = -ox; x <= ox; x++) {
      var pxx = x + 0.5, pyy = y + 0.5, a = Math.atan2(pyy / ry, pxx / rx), rr = hyp(pxx / rx, pyy / ry), wob = 1 + 0.025 * sin(5 * a + t / 700), dd = (rr / wob - 1) * R0;
      if (dd < 0 || dd >= th) continue;
      var u = floor((a + PI) * R0), v = th - 1 - floor(dd), seg = pats[floor(u / 8) % pats.length], l = -(cos(a) * 0.6 + sin(a) * 0.8);
      var off = l > 0.35 ? 0 : l < -0.35 ? 2 : 1; if (floor(dd) === th - 1) off++;
      b.set(cx + x, cy + y, SIL ? k : X.texC(seg, u, v, 'nacre', off));
    }
  }
  function ceil(v) { return Math.ceil(v); }

  /* ---------- cell parts ---------- */
  function cellBody(d) { return d.e > 0 ? { n: 'cell_eukaryote', rx: 19.8, ry: 15.8 } : (d.m || d.o || d.n || d.x) ? { n: 'org_protocell', rx: 7.8, ry: 7.8 } : null; }
  function memTh(m) { return m > 0 ? 1 + min(4, floor(min(24, m) / 6)) : 0; }
  function memPats(m) { return m >= 12 ? ['cell_membrane_seg_a', 'cell_membrane_seg_b', 'cell_membrane_seg_c'] : m >= 5 ? ['cell_membrane_seg_a', 'cell_membrane_seg_b'] : ['cell_membrane_seg_a']; }
  /* counts beyond the drawn caps become extra drifting specks */
  function overflow(d) { return min(30, floor((max(0, d.m - 24) + max(0, d.o - 24) + max(0, d.n - 24) + max(0, d.x - 24) + max(0, d.e - 4) * 2) / 4)); }
  function drawCell(b, cx, cy, d, t, sp, noBody) {
    var tc = q(t, 166), bd = cellBody(d), i; if (!bd) return null;
    var th = memTh(d.m), rx = bd.rx + th, ry = bd.ry + th, ce = min(3, d.e - 1), CO = [[-118, -46], [128, 52], [-52, 92]];
    for (i = 0; i < ce; i++) {
      var ox = cx + round(CO[i][0] * sp), oy = cy + round(CO[i][1] * sp + 2 * sin(tc / 1600 + i));
      if (th) ring(b, ox, oy, 19.8, 15.8, min(th, 2), memPats(d.m), tc);
      putC(b, spr('cell_eukaryote'), ox, oy, i % 2 === 1); if (d.n > i + 1) putC(b, spr('cell_nucleus_small'), ox, oy);
    }
    if (!noBody) {
      if (th) ring(b, cx, cy, bd.rx, bd.ry, th, memPats(d.m), tc);
      putC(b, spr(bd.n), cx, cy);
      if (d.n > 0) {
        var big = d.n >= 5 && d.e > 0, gr = (big ? 9 : 5) + min(4, floor(min(24, d.n) / 6)) + ((t % 1000) < 300 ? 1 : 0);
        if (!SIL) glow(b, cx, cy, gr);
        putC(b, spr(big ? 'cell_nucleus_big' : 'cell_nucleus_small'), cx, cy);
      }
    }
    var kx = min(24, d.x), act = d.o > 0 || d.n > 0;
    for (i = 0; i < kx; i++) {
      var a = i * 2 * PI / kx + tc / 16000, r2 = i % 2, on = act && ((t + i * 70) % 1000) < 260;
      putC(b, spr(((floor(tc / 500) + i) & 1) ? 'cell_mito_b' : 'cell_mito_a', on ? { ACCENT: 'ember' } : null), cx + round(cos(a) * (rx + 8 + r2 * 6)), cy + round(sin(a) * (ry + 7 + r2 * 5)), i % 3 === 1);
    }
    var ko = min(24, d.o);
    for (i = 0; i < ko; i++) {
      var a2 = i * 2.39996 + tc / (14000 + (i % 5) * 1700) * (i % 2 ? 1 : -1), rr = (max(rx, ry) + 16 + (i * 37) % 70) * sp;
      var x2 = cx + round(cos(a2) * rr * 1.25), y2 = cy + round(sin(a2) * rr * 0.62), per = 1700 + (i * 113) % 900, ph = (t + i * 431) % per;
      if (ph < 1300) { var f = ph / 1300; speck(b, x2 + cos(a2) * f * 14, y2 + sin(a2) * f * 8 - f * 6, floor(f * 3), true); }
      putC(b, spr('cell_organelle_' + 'abcd'[i % 4]), x2, y2, i % 2 === 1);
    }
    return { rx: rx, ry: ry };
  }
  function dnaPos(i, cx, cy, tc, sp) {
    var x = cx + round((ih(i, 1, 71) - 0.5) * 520 * sp + 16 * sin(tc / 3300 + i)), y = cy + round((ih(i, 2, 71) - 0.5) * 120 * sp + 8 * sin(tc / 2700 + i * 1.3));
    if (abs(x - cx) < 58 * sp + 10) x += (x < cx ? -1 : 1) * round(70 * sp + 10); return [x, y];
  }
  function dnaStrands(b, d, cx, cy, t, sp) {
    if (!d.DNA || d.DNA.a <= 0) return;
    for (var i = 0, n = clamp(Math.ceil(d.DNA.a / 25), 1, 8), tc = q(t, 166); i < n; i++) { var p = dnaPos(i, cx, cy, tc, sp); putC(b, strand((floor(t / 200) + i) & 3), p[0], p[1]); }
  }
  /* sexual reproduction loop (6 s): approach, pair, divide (3 frames over 1.2 s), part */
  function mitosis(b, x0, y0, t, ph) {
    var T = (t + ph) % 6000, tc = q(T, 166), y = y0 + round(2 * sin((t + ph) / 900));
    if (T >= 1600 && T < 2400) { putC(b, spr('org_cell_pair'), x0, y); return; }
    if (T >= 2400 && T < 3600) { putC(b, spr('org_cell_dividing_' + (1 + floor((T - 2400) / 400))), x0, y); return; }
    var sep = T < 1600 ? 30 - 18 * tc / 1600 : 12 + 18 * max(0, tc - 3600) / 2400, pc = spr('org_protocell');
    putC(b, pc, x0 - sep / 2, y - 1); putC(b, pc, x0 + sep / 2, y + 1, true);
  }
  /* phagocytosis loop (3 s, frames on a 3 fps grid): a speck drifts into the open mouth, the cell closes on it, then opens */
  function phago(b, x, y, t, flip) {
    var c = q(t, 333) % 3000, closed = c >= 1332 && c < 2664, dir = flip ? -1 : 1;
    if (c < 1332) speck(b, x + dir * round(30 - 18 * c / 1332), y, 0);
    putC(b, spr(closed ? 'org_phagocyte_closed' : 'org_phagocyte_open'), x, y, flip);
  }
  function colTarget(d) { return clamp(3 + round(((d.final == null ? 60 : d.final) - 40) / 20 * 9), 3, 12); }
  function colonyPiece(n) { return n <= 5 ? 'org_colony_s' : n <= 9 ? 'org_colony_m' : 'org_colony_l'; }
  function colony(b, x, y, d, t, ev) {
    var tg = colTarget(d), a = ev && ev.colony ? t - ev.colony.t0 : 1e9, n = min(tg, 3 + floor(a / 500));
    putC(b, spr(colonyPiece(n)), x, y + round(2 * sin(t / 1300)));
    if (n < tg) { var f = (a % 500) / 500, an = n * 2.4, r = 140 * (1 - f) + 14; putC(b, spr('org_protocell'), x + cos(an) * r, y + sin(an) * r * 0.7); }
  }

  /* ---------- pool (stages 0-3) ---------- */
  var POOLS = new Map();
  function poolStatic(biome, seed) {
    var key = biome + '|' + seed; if (POOLS.has(key)) return POOLS.get(key); if (POOLS.size > 6) POOLS.clear();
    var B = BIO[biome] || BIO.grassland, p = new Pix(WW, WH), Z = new Uint8Array(WW * WH), fy = new Int16Array(WW), s0 = mod(seed | 0, 9973), x, y, fyMin = 1e9;
    for (x = 0; x < WW; x++) { fy[x] = round(386 + 18 * vn(x / 110, 3.3, 41 + s0) + 7 * vn(x / 29, 7.1, 43 + s0)); fyMin = min(fyMin, fy[x]); }
    for (x = 0; x < WW; x++) {
      var hill = SURF - 5 - round(16 * vn(x / 70, 1.7, 47 + s0) + 6 * vn(x / 23, 2.9, 49 + s0)), sl = fy[min(WW - 1, x + 1)] - fy[max(0, x - 1)];
      for (y = 0; y < WH; y++) {
        var i = y * WW + x, c;
        if (y < SURF) c = y >= hill ? R('haze', y < hill + 2 ? 1 : 2) : y < 110 ? R('sky', 2) : y < 180 ? R('sky', 1) : R('sky', 0);
        else if (y < fy[x]) { Z[i] = 1; var dq = y - SURF + round(5 * sin(x / 53 + y / 97));
          c = y < SURF + 2 ? R(B.s, 0) : dq < 24 ? R(B.s, 1) : dq < 60 ? R(B.s, 2) : dq < 98 ? R(B.s, 3) : dq < 132 ? R(B.d, 2) : R(B.d, 3); }
        else { Z[i] = 2; var k = y - fy[x];
          c = k < 2 ? R(B.f, sl > 0 ? 0 : 1) : k < 9 + round(3 * vn(x / 17, 2, 51)) ? R(B.f, 1) : k < 26 + round(5 * vn(x / 23, 5, 53)) ? R(B.f, 2) : R(B.f, 3); }
        p.d[i] = c;
      }
    }
    var r = X.rng('evo-floor', s0), items = [], weeds = [], vents = [], nv = B.vents || 2, k2;
    for (k2 = 0; k2 < nv; k2++) { x = 60 + floor(r() * (WW - 120)); vents.push({ x: x, y: fy[x] + 2 }); items.push({ n: 'sc_vent', x: x, y: fy[x] + 2 }); }
    for (k2 = 0; k2 < 30; k2++) {
      x = 8 + floor(r() * (WW - 16)); var pick = r(), fl = r() < 0.5;
      if (pick < 0.45) weeds.push({ n: pick < 0.25 ? 'sc_seaweed_a' : 'sc_seaweed_b', x: x, y: fy[x] + 2, ph: r() * 6, flip: fl, map: { MAIN: B.w } });
      else items.push({ n: pick < 0.62 ? 'sc_coral_a' : pick < 0.78 ? 'sc_coral_b' : 'sc_shore_rock', x: x, y: fy[x] + 2, flip: fl, map: pick >= 0.78 ? { MAIN: B.f === 'sand' || B.f === 'dirt' ? 'river' : B.f } : null });
    }
    items.sort(function (a, c) { return a.y - c.y; }).forEach(function (it) { var pc = P[it.n]; p.blit(spr(it.n, it.map), it.x - pc.anchor[0], it.y - pc.anchor[1], it.flip); });
    var out = { p: p, Z: Z, fy: fy, fyMin: fyMin, weeds: weeds, vents: vents, B: B }; POOLS.set(key, out); return out;
  }
  function flatten(b, Z) { var w = R('haze', 1), f = R('haze', 2), s = R('sky', 0); for (var i = 0; i < b.d.length; i++) b.d[i] = Z[i] === 1 ? w : Z[i] === 2 ? f : s; }
  function sway(b, p, x, y, t, ph, flip) {
    var tw = q(t, 250), x0 = x - (p.w >> 1), y0 = y - p.h + 1, k = ink();
    for (var j = 0; j < p.h; j++) { var dx = round(sin(tw / 900 + ph + j * 0.22) * (1 - j / p.h) * 2);
      for (var i = 0; i < p.w; i++) { var c = p.d[j * p.w + (flip ? p.w - 1 - i : i)]; if (c) b.set(x0 + i + dx, y0 + j, SIL ? k : c); } }
  }
  function bubbles(b, ps, t) {
    var tb = q(t, 166), map = { MAIN: ps.B.s };
    ps.vents.forEach(function (v, vi) { var per = 9000 + vi * 700;
      for (var k = 0; k < 6; k++) { var ph = mod(tb / per + k / 6 + vi * 0.37, 1); putC(b, spr('fx_bubble_' + (1 + (k + vi) % 3), map), v.x + round(3 * sin(ph * 14 + k)), v.y - 8 - round(ph * (v.y - 8 - SURF))); } });
  }
  function fronds(b, ps, t, par) {
    var tw = q(t, 250), c3 = R(ps.B.w, 3), c4 = R(ps.B.w, 4);
    for (var k = 0; k < 7; k++) {
      var bx = mod(k * 131 + 40 - round(par * 0.6), WW + 60) - 30, hg = WH - 372 - (k * 23) % 44;
      for (var j = 0; j < hg; j++) { var y = WH - 1 - j, sx = bx + round(sin(tw / 1100 + k + j / 14) * j / hg * 6);
        px(b, sx, y, c3); px(b, sx + 1, y, c4); px(b, sx + 2, y, c4);
        if (j > 150 && j % 11 === 0) { var side = (j / 11) % 2 ? 1 : -1; for (var l = 0; l < 6; l++) { var lx = side > 0 ? sx + 3 + l : sx - 1 - l, ly = y - floor(l / 2); px(b, lx, ly, c3); px(b, lx, ly + 1, c4); } }
      }
    }
  }
  function tapsFx(b, ev, t) {
    (ev.taps || []).forEach(function (tp) { var e = (t - tp.t0) / 2000; if (e < 0 || e > 1) return;
      for (var k = 0; k < 6; k++) { var an = k * 1.047 + tp.x * 0.1, r = 4 + 20 * Math.sqrt(e); speck(b, tp.x + cos(an) * r, tp.y + sin(an) * r * 0.8 - e * 10, e > 0.6 ? 1 : 0, k % 2 === 1); } });
  }
  function meteorFx(b, ev, t, tx, ty, water) {
    var m = ev.met; if (!m) return; var a = t - m.t0, sx = tx - 170, sy = ty - 120, k;
    if (a < 600) { var f = a / 600; put(b, frameOf('fx_meteor', floor(a / 83) & 3), round(sx + (tx - sx) * f) - 8, round(sy + (ty - sy) * f) - 8); return; }
    var e = (a - 600) / 2000, r = 46 * Math.sqrt(min(1, e * 1.6));
    for (k = 0; k < 12; k++) { var an = k * 0.5236 + 0.3; speck(b, tx + cos(an) * r, ty + sin(an) * r * 0.7, e > 0.75 ? 1 : 0, k % 2 === 0); }
    if (e < 0.7) for (k = 0; k < 4; k++) putC(b, spr('fx_bubble_' + (1 + k % 3), { MAIN: water }), tx + (k - 1.5) * 7, ty - round(min(1, e * 2) * (30 + k * 12)));
  }
  function dnaSplitFx(b, ev, t, x, y) {
    var m = ev.dna; if (!m) return; var a = t - m.t0;
    if (a < 668) { putC(b, frameOf('fx_dna_split', min(3, floor(a / 167))), x, y); return; }
    var f3 = frameOf('fx_dna_split', 3), dx = min(10, round((a - 668) / 150));
    put(b, crop(f3, 0, 6), round(x) - 6 - dx, round(y) - 8); put(b, crop(f3, 6, 6), round(x) + dx, round(y) - 8);
  }
  /* evolve flash: 6 frames at 12 fps (core, half rays, full, full, fading, outer rays) */
  function flashFx(b, ev, t, x, y) {
    var f = ev.flash; if (!f) return; var k = floor((t - f.t0) / 83); if (k < 0 || k > 5) return;
    var p = spr('fx_evolve_flash', null, k >= 4 ? { shade: k - 3 } : null), x0 = round(x) - 12, y0 = round(y) - 12;
    for (var j = 0; j < 24; j++) for (var i = 0; i < 24; i++) { var c = p.d[j * 24 + i]; if (!c) continue; var r = hyp(i + 0.5 - 12, j + 0.5 - 12);
      if ((k === 0 && r > 4.5) || (k === 1 && r > 8) || (k === 5 && r < 6)) continue; px(b, x0 + i, y0 + j, c); }
  }
  function poolFrame(b, d, t, par, ev) {
    var ps = poolStatic(d.biome, d.seed), x, y, i, k, qq, tq = floor(t / 250), tc = q(t, 166), Z = ps.Z;
    b.d.set(ps.p.d);
    var off = floor(t / 2400) + round(par * 0.5);
    for (x = 0; x < WW; x++) { var top = round(344 + 26 * vn((x + off) / 150, 9.1, 61) - 12 * vn((x + off) / 47, 3.3, 63)); for (y = top; y < ps.fy[x]; y++) { qq = y * WW + x; if (Z[qq] === 1) b.d[qq] = shift(b.d[qq], 1); } }
    for (i = 0; i < 5; i++) {
      var x0 = mod(round(90 + i * 211 + tq * (i % 2 ? 0.75 : 0.45)), WW + 240) - 120, w = 12 + (i * 7) % 16, lim = SURF + 110 + (i * 53) % 50;
      for (y = SURF + 2; y < lim + 4; y++) { var xs = x0 + round((y - SURF) * 0.42);
        for (x = max(0, xs); x < min(WW, xs + w); x++) { if (y >= lim + round(3 * sin(x * 0.4 + i))) continue; qq = y * WW + x; if (Z[qq] === 1) b.d[qq] = shift(b.d[qq], -1); } }
    }
    for (y = SURF + 2; y < SURF + 36; y++) for (x = 0; x < WW; x++) { var v = sin(x * 0.19 + tq * 0.9) + sin(y * 0.41 - tq * 0.7 + x * 0.05) + sin((x - y) * 0.11 + tq * 0.5); if (abs(v) < 0.26) { qq = y * WW + x; if (Z[qq] === 1) b.d[qq] = shift(b.d[qq], -1); } }
    for (x = 0; x < WW; x++) for (k = 0; k < 5; k++) if (sin(x * 0.23 + tq * 0.8) + sin(x * 0.07 - tq * 0.6 + k * 0.9) > 1.25) { qq = (ps.fy[x] + k) * WW + x; b.d[qq] = shift(b.d[qq], -1); }
    if (SIL) flatten(b, Z);
    ps.weeds.forEach(function (wd) { sway(b, spr(wd.n, wd.map), wd.x, wd.y, t, wd.ph, wd.flip); });
    var cy = CY + round(2 * sin(tc / 1400)), nS = min(40, 3 + floor(d.RNA.a / 8)) + overflow(d), span = ps.fyMin - SURF - 44;
    for (i = 0; i < nS; i++) speck(b, CX - 270 + ih(i, 3, 79) * 540 + 10 * sin(tc / 2600 + i), SURF + 20 + ih(i, 4, 79) * span + 6 * sin(tc / 3100 + i * 1.7), i % 5 === 0 ? 1 : 0, i % 3 === 0);
    if (d.stage >= 2) { mitosis(b, CX - 178, CY + 46, t, 0); mitosis(b, CX + 182, CY - 52, t, 2900); }
    dnaStrands(b, d, CX, cy, t, 1);
    if (d.stage >= 4) { drawCell(b, CX, cy, d, t, 1, true); colony(b, CX, cy, d, t, ev); }
    else drawCell(b, CX, cy, d, t, 1);
    if (d.stage >= 3) { var pa = tc / 40000 * 2 * PI; phago(b, CX + round(cos(pa) * 215), CY + 8 + round(sin(pa) * 60), t, -sin(pa) < 0); }
    bubbles(b, ps, t);
    tapsFx(b, ev, t);
    meteorFx(b, ev, t, CX - 40, SURF + 70, ps.B.s);
    var dp = d.DNA && d.DNA.a > 0 ? dnaPos(0, CX, cy, tc, 1) : [CX, cy];
    dnaSplitFx(b, ev, t, dp[0], dp[1]);
    fronds(b, ps, t, par);
    flashFx(b, ev, t, CX, cy);
  }

  /* ---------- shore (stages 4-7): the kit terrain generator with its own layout ---------- */
  var SHL = new Map();
  /* tiles: 1 grass, 2 sand (path tiles recoloured), 4 water, 5 rock, 6 mud */
  function shoreLayout(seed) {
    seed = mod(seed | 0, 997); if (SHL.has(seed)) return SHL.get(seed);
    var t = new Uint8Array(N * N).fill(1), x, y, k;
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      var g = y - 0.18 * x + (vn(x / 3.7, y / 3.7, 31 + seed) - 0.5) * 2.4; k = y * N + x;
      if (g > 13.4) t[k] = 4; else if (g > 11.7) t[k] = 2; else if (g > 10.9 && ih(x, y, 37 + seed) < 0.35) t[k] = 6;
      if (x + y + ih(x, y, 7) * 3 < 6.5) t[k] = 5;
    }
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) { k = y * N + x; if (t[k] !== 4 && hyp(x + 0.5 - 8.8, y + 0.5 - 12) < 1.7 + ih(x, y, 41) * 0.5) t[k] = 6; }
    SHL.set(seed, t); return t;
  }
  var SHO = new Map();
  function shoreStatic(biome, seed) {
    var key = biome + '|' + seed; if (SHO.has(key)) return SHO.get(key); if (SHO.size > 6) SHO.clear();
    var lay = shoreLayout(seed), tr = X.terrain(1, biome, lay, 'shore' + mod(seed | 0, 997)), p = new Pix(WW, WH), rev = X.pal().rev, dirt = (X.BIOMES[biome] || {}).dirt || 'dirt', i, items = [];
    p.d.set(tr.pix.d);
    for (i = 0; i < p.d.length; i++) if (tr.T[i] === 2) { var e = rev.get(p.d[i]); if (e && e[0] === dirt) p.d[i] = R('sand', e[1]); }
    function tt(x, y) { return (x < 0 || y < 0 || x >= N || y >= N) ? 0 : lay[y * N + x]; }
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var ty = tt(x, y); if (!ty || ty === 4) continue;
      var wet = tt(x + 1, y) === 4 || tt(x, y + 1) === 4 || tt(x - 1, y) === 4 || tt(x, y - 1) === 4, h1 = ih(x, y, 83 + seed), h2 = ih(x, y, 89 + seed);
      if (wet && h1 < 0.7) { items.push({ n: 'sc_shore_reed', u: x + 0.2 + h2 * 0.6, v: y + 0.3 + h1 * 0.5, flip: h2 < 0.5 }); if (h1 < 0.3) items.push({ n: 'sc_shore_reed', u: x + 0.7, v: y + 0.65, flip: h1 < 0.15 }); }
      else if (ty === 2 && h1 < 0.08) items.push({ n: 'sc_driftwood', u: x + 0.5, v: y + 0.5, flip: h2 < 0.5 });
      else if ((ty === 2 || ty === 1) && h1 > 0.975) items.push({ n: 'sc_shore_rock', u: x + 0.5, v: y + 0.5, flip: h2 < 0.5 });
      else if (ty === 1 && h1 < 0.16 && P.tuft_a && P.tuft_b) items.push({ n: h2 < 0.5 ? 'tuft_a' : 'tuft_b', u: x + h2, v: y + h1 * 5 });
    }
    items.sort(function (a, c) { return (a.u + a.v) - (c.u + c.v); }).forEach(function (it) {
      var pc = P[it.n], g = X.worldPt(it.u, it.v), an = pc.anchor || [pc.w >> 1, pc.h - 1]; p.blit(spr(it.n), round(g[0]) - an[0], round(g[1]) - an[1], it.flip); });
    var out = { p: p, tr: tr, lay: lay }; SHO.set(key, out); return out;
  }
  function crowd(d) {
    var info = stageInfo(d), name = info.creature, cr = CREATURES[name]; if (!cr) return [];
    var f = d.final == null ? (FINALS[d.stage] || 0) : d.final, extra = f >= 100 ? 4 : f >= 90 ? 3 : f >= 80 ? 2 : 0, lay = shoreLayout(d.seed), out = [];
    for (var i = 0; i <= extra; i++) {
      var an = i * 2.1 + 0.4, rad = i ? 0.8 + i * 0.42 : 0, du = cos(an) * rad, dv = sin(an) * rad * 0.7;
      var a = [cr.home[0][0] + du, cr.home[0][1] + dv], bb = [cr.home[1][0] + du, cr.home[1][1] + dv];
      [a, bb].forEach(function (p) { for (var n = 0; n < 8; n++) { var wet = lay[clamp(floor(p[1]), 0, N - 1) * N + clamp(floor(p[0]), 0, N - 1)] === 4; if (wet === !!cr.water) break; p[1] += cr.water ? 0.6 : -0.6; } });
      out.push({ i: i, kind: name, cr: cr, a: a, b: bb });
    }
    return out;
  }
  function patrol(c, t) {
    var cr = c.cr, fps = cr.fps || 2, fm = 1000 / fps, tt = q(t, fm), du = c.b[0] - c.a[0], dv = c.b[1] - c.a[1], len = hyp(du, dv) || 1;
    var wt = len / cr.speed * 1000, Pz = cr.pause || 0, C = 2 * (wt + Pz), ph = mod(tt + c.i * 1777, C), s, dir;
    if (ph < wt) { s = ph / wt; dir = 1; } else if (ph < wt + Pz) { s = 1; dir = 0; } else if (ph < 2 * wt + Pz) { s = 1 - (ph - wt - Pz) / wt; dir = -1; } else { s = 0; dir = 0; }
    var face = dir || (ph < wt + Pz ? 1 : -1);
    return { u: c.a[0] + du * s, v: c.a[1] + dv * s, walk: dir !== 0, f: floor(tt / fm), flip: (du - dv) * face < 0, bob: cr.water ? round(sin(t / 700 + c.i)) : 0 };
  }
  function stick(b, hx, hy) {
    for (var k = 0; k < 10; k++) { var y = hy - 7 + k; px(b, hx - 1, y, R('oak', k === 9 ? 3 : k < 2 ? 2 : 1)); px(b, hx, y, R('oak', k === 9 ? 4 : 3)); }
  }
  function stickFlat(b, x, y) { for (var k = 0; k < 10; k++) { px(b, x + k, y, R('oak', k === 9 ? 3 : 1)); px(b, x + k, y + 1, R('oak', k === 9 ? 4 : 3)); } }
  function stone(b, hx, hy) {
    [[0, 0, 1], [1, 0, 1], [2, 0, 2], [0, 1, 1], [1, 1, 2], [2, 1, 3], [1, 2, 3], [2, 2, 4]].forEach(function (s) { px(b, hx - 1 + s[0], hy + s[1], R('river', s[2])); });
  }
  function shade(B2, x0, x1, y) { if (SIL || y < 0 || y >= B2.h) return; for (var x = max(0, x0); x <= min(B2.w - 1, x1); x++) B2.d[y * B2.w + x] = shift(B2.d[y * B2.w + x], 1); }
  /* one creature at citizen scale: bottom-centre anchor on the tile point, flat shadow one ground tone darker */
  function drawOne(B2, name, u, v, flip, bob, tool, water) {
    var pc = P[name], p = spr(name), g = X.worldPt(u, v), gx = round(g[0] * WK), gy = round(g[1] * WK) + (bob || 0);
    var ax = flip ? pc.w - 1 - pc.anchor[0] : pc.anchor[0], x0 = gx - ax, y0 = gy - pc.anchor[1], ape = !!pc.attach;
    if (!water) shade(B2, ape ? gx - 4 : x0 + 2, ape ? gx + 3 : x0 + pc.w - 3, gy + 1);
    var hand = pc.attach && pc.attach.hand, hx = hand ? x0 + (flip ? pc.w - 1 - hand[0] : hand[0]) : 0, hy = hand ? y0 + hand[1] : 0;
    if (tool === 'stick') stick(B2, hx, hy);
    put(B2, p, x0, y0, flip);
    if (tool === 'stone') stone(B2, hx, hy);
    return { gx: gx, gy: gy, hx: hx, hy: hy };
  }
  function handState(H, a, list) {
    var s = clamp(a / HT.walk, 0, 1), e = s * s * (3 - 2 * s), p0 = H.p0, p1 = [11.85, 11.4];
    return { a: a, u: p0[0] + (p1[0] - p0[0]) * e, v: p0[1] + (p1[1] - p0[1]) * e, walking: a < HT.walk, human: a >= HT.drop, fire: a >= HT.drop,
      tool: a < HT.stand ? 'held' : a < HT.drop ? 'fall' : 'ground', flip: (p1[0] - p0[0]) - (p1[1] - p0[1]) < 0 };
  }
  function fire(b, t, a) {
    var g = X.worldPt(11.05, 11.05), gx = round(g[0]), gy = round(g[1]), fp = P.fire_ring, f = floor(t / 200) % 3;
    put(b, spr('fire_ring'), gx - fp.anchor[0], gy - fp.anchor[1]);
    var fl = [[[0, -2, 2], [-1, -2, 2], [1, -2, 3], [0, -3, 1], [-1, -3, 1], [0, -4, 0]], [[0, -2, 2], [1, -2, 2], [-1, -2, 3], [0, -3, 1], [1, -3, 1], [1, -4, 0]], [[0, -2, 2], [-1, -2, 3], [1, -2, 2], [0, -3, 1], [0, -4, 1], [0, -5, 0]]][f];
    fl.forEach(function (s) { px(b, gx + s[0], gy + s[1], R('ember', s[2])); });
    if (a < 600) for (var k = 0; k < 4; k++) px(b, gx - 3 + k * 2, gy - 5 - round(a / 40) - k * 2, R('ember', 1));
  }
  function shoreWorld(b, d, t, ev, list, hs) {
    var ss = shoreStatic(d.biome, d.seed), tr = ss.tr, w = tr.waves, wf = tr.frozen ? 0 : floor(t / 200) & 3, k;
    b.d.set(ss.p.d);
    for (k = 0; k < w.length; k += 3) { if (ss.p.d[w[k]] !== tr.pix.d[w[k]]) continue; var cyc = w[k + 2] === 3 ? [1, 2, 3, 3] : [1, 2, 2, 2]; b.d[w[k]] = R(tr.water, cyc[(w[k + 1] + wf) & 3]); }
    if (SIL) { var gr = R('haze', 1), sk = R('sky', 0); for (k = 0; k < b.d.length; k++) b.d[k] = tr.T[k] ? gr : sk; }
    var lead = hs ? [hs.u, hs.v] : list[0] ? (function () { var s = patrol(list[0], t); return [s.u, s.v]; })() : [9, 11], lg = X.worldPt(lead[0], lead[1]);
    if (list[0] && list[0].cr.water) { var tb = q(t, 166); for (k = 0; k < 4; k++) { var ph = mod(tb / 3000 + k / 4, 1); if (ph < 0.6) putC(b, spr('fx_bubble_' + (1 + k % 3), { MAIN: tr.water }), lg[0] - 10 + k * 7, lg[1] - 6 - round(ph * 20)); } }
    if (hs && hs.fire) fire(b, t, hs.a - HT.drop);
    var wp = X.worldPt(6.5, 19.5); meteorFx(b, ev, t, round(wp[0]), round(wp[1]), tr.water);
    dnaSplitFx(b, ev, t, lg[0], lg[1] - 22);
    flashFx(b, ev, t, lg[0], lg[1] - 10);
  }
  function drawCrowd(B2, list, t, hs) {
    var arr = list.map(function (c) { return { c: c, s: c.i === 0 && hs ? null : patrol(c, t) }; });
    arr.sort(function (a, b) { var ua = a.s ? a.s.u + a.s.v : hs.u + hs.v, ub = b.s ? b.s.u + b.s.v : hs.u + hs.v; return ua - ub; });
    arr.forEach(function (it) {
      var c = it.c, s = it.s;
      if (!s) {
        if (hs.human) { var hp = SK.citizens.compose('unemployed', 3, 'idle', floor(t / 500) & 1, {}), g = X.worldPt(hs.u, hs.v), gx = round(g[0] * WK), gy = round(g[1] * WK);
          shade(B2, gx - 3, gx + 2, gy + 1); put(B2, hp, gx - 16, gy - 31); var sg = X.worldPt(11.85, 11.4); stickFlat(B2, round(sg[0] * WK) + 5, round(sg[1] * WK) - 1); return; }
        var o = drawOne(B2, hs.walking ? ['org_ape_a', 'org_ape_b'][floor(t / 166) & 1] : 'org_ape_idle', hs.u, hs.v, hs.flip, 0, hs.tool === 'held' ? 'stick' : null);
        if (hs.tool === 'fall') { var fy = min(o.gy - 1, o.hy + round((hs.a - HT.stand) / 400 * 12)); if (fy < o.gy - 2) stick(B2, o.hx, fy); else stickFlat(B2, o.gx + 5, o.gy - 1); }
        return;
      }
      var cr = c.cr, name = !s.walk && cr.rest ? cr.rest : cr.walk[s.f % cr.walk.length];
      drawOne(B2, name, s.u, s.v, s.flip, s.bob, cr.tool ? (c.i === 0 ? 'stick' : c.i % 2 ? 'stone' : null) : null, cr.water);
    });
  }
  function shoreFrame(V, d, t, ev, H, a) {
    var list = crowd(H ? Object.assign({}, d, { stage: 7, final: 100 }) : d), hs = H ? handState(H, a, list) : null;
    shoreWorld(V.buf, d, t, ev, list, hs);
    X.up(V.buf, V.buf2, WK);
    drawCrowd(V.buf2, list, t, hs);
  }

  /* ---------- scene state ---------- */
  function fresh() { return { stage: -1, view: null, lastSp: null, seed: null, days: null, ev: '', d: null, flash: null, colony: null, surf: null, met: null, dna: null, taps: [], hand: null, after: false, cam: null, active: false, lastKey: '', tmp: null }; }
  var E = fresh();
  function reset() { var keep = E.lastSp; E = fresh(); E.lastSp = keep; var V = X.view(); if (V) { V.panX = V.panY = null; V.key = ''; } }
  function camPan(V, wx, wy) {
    var dp = OPT.pixelTrue ? max(1, G.devicePixelRatio || 1) : 1, cw = round((V.canvas.clientWidth | 0) * dp) || V.canvas.width, ch = round((V.canvas.clientHeight | 0) * dp) || V.canvas.height, s = OPT.scale | 0 || 1;
    return [round(cw / 2 - wx * WK * s), round(ch / 2 - wy * WK * s)];
  }
  function parallax(V) { if (V.panX === null) return 0; var s = OPT.scale | 0 || 1; return round((V.panX - V.canvas.width / 2) / (WK * s) + X.NX); }
  function track(d, t) {
    if (E.stage < 0) { E.stage = d.stage; E.view = d.stage >= 4 ? 'shore' : 'pool'; E.ev = d.ev; if (E.view === 'shore') E.cam = { snap: true }; return; }
    if (d.stage > E.stage) {
      E.flash = { t0: t };
      if (d.stage >= 4 && E.view === 'pool' && !E.colony && !E.surf) { if (d.stage === 4) E.colony = { t0: t }; else { E.surf = { t0: t }; E.cam = { snap: true }; } }
    } else if (d.stage < E.stage) { E.view = d.stage >= 4 ? 'shore' : 'pool'; E.colony = E.surf = null; E.cam = { snap: true }; }
    E.stage = d.stage;
    if (E.colony && t - E.colony.t0 > COLONY_MS) { E.colony = null; E.surf = { t0: t }; E.cam = { snap: true }; }
    if (E.surf && t - E.surf.t0 >= 1000) { E.surf = null; E.view = 'shore'; }
  }
  function events(d, t) {
    if (d.ev !== E.ev) { if (d.ev === 'rna_meteor') E.met = { t0: t }; if (d.ev === 'dna_replication') E.dna = { t0: t }; }
    E.ev = d.ev;
    if (E.met && t - E.met.t0 > 2600) E.met = null; if (E.dna && t - E.dna.t0 > 2800) E.dna = null; if (E.flash && t - E.flash.t0 > 500) E.flash = null;
    E.taps = E.taps.filter(function (tp) { return t - tp.t0 < 2000; });
  }
  var MEMO = new Map();
  function screenFlash(B2, t) {
    if (!E.flash || SIL) return; var k = floor((t - E.flash.t0) / 83); if (k < 0 || k > 1) return;
    for (var i = 0, d = B2.d; i < d.length; i++) { var c = d[i], v = MEMO.get(c); if (v === undefined) { v = shift(c, -1); MEMO.set(c, v); } d[i] = v; }
  }
  function era0(V, d, t) {
    SIL = !!OPT.silhouette;
    var par = parallax(V), key = floor(t / 83) + '|' + par + '|' + SIL + '|' + E.view + '|' + (E.surf ? 1 : 0) + '|' + (OPT.scale | 0);
    if (key === E.lastKey) return; E.lastKey = key;
    var dd = d.stage >= 4 || E.surf ? d : null;
    if (E.cam && (E.view === 'shore' || E.surf)) { var l0 = crowd(Object.assign({}, d, { stage: max(4, d.stage) }))[0]; if (l0) { var s0 = patrol(l0, t), g = X.worldPt(s0.u, s0.v), cp = camPan(V, g[0], g[1] - 12); V.panX = cp[0]; V.panY = cp[1]; } E.cam = null; }
    if (E.view === 'pool' || E.surf) { poolFrame(V.buf, d, t, par, E); X.up(V.buf, V.buf2, WK); }
    if (E.surf) {
      var B2 = V.buf2, W2 = B2.w, H2 = B2.h; if (!E.tmp || E.tmp.length !== B2.d.length) E.tmp = new Uint32Array(B2.d.length); E.tmp.set(B2.d);
      shoreFrame(V, Object.assign({}, dd, { stage: max(4, d.stage) }), t, E, null);
      /* the pool's water surface drops through the visible window: shore above the line, pool water (from its surface down) below */
      var sc = OPT.scale | 0 || 1, vt = clamp(round(-(V.panY || 0) / sc), 0, H2 - 1), vh = max(1, round(V.canvas.height / sc));
      var fr = min(11, floor((t - E.surf.t0) / 83)), sh = vt + round((fr + 1) / 12 * vh), foam = R((BIO[d.biome] || BIO.grassland).s, 0), top = SURF * WK;
      for (var y = max(0, sh); y < H2; y++) { var src = min(H2 - 1, top + (y - sh)); if (y < sh + 4) B2.d.fill(foam, y * W2, (y + 1) * W2); else B2.d.set(E.tmp.subarray(src * W2, (src + 1) * W2), y * W2); }
    } else if (E.view === 'shore') shoreFrame(V, d, t, E, null);
    screenFlash(V.buf2, t);
    V.u32.set(V.buf2.d); V.octx.putImageData(V.img, 0, 0);
  }
  function startHand(t) { E.hand = { t0: t }; E.colony = E.surf = null; E.view = 'shore'; E.lastKey = ''; }
  function drawHand(st, d, t, proto) {
    var V = X.view(), H = E.hand, a = t - H.t0;
    if (proto && a >= HT.wipe) { H.held = true; a = HT.wipe - 1; } else if (H.held && !proto) { H.held = false; H.t0 = t - HT.wipe; a = HT.wipe; }
    if (a >= HT.end) { E.hand = null; E.after = true; E.active = false; V.key = ''; E.lastKey = ''; return false; }
    var base = E.d || d, dd = Object.assign({}, base, { stage: 7, final: 100 });
    if (!H.p0) {
      var l0 = crowd(dd)[0], s0 = l0 ? patrol(l0, H.t0) : null; H.p0 = s0 ? [s0.u, s0.v] : [10, 10.5];
      var cp = camPan(V, X.NX, X.NY + 140); H.c0 = V.panX === null ? cp : [V.panX, V.panY]; var tg = X.worldPt(11.4, 11.2); H.c1 = camPan(V, tg[0], tg[1] - 8);
    }
    if (a < 1600) { var s = a / 1600, e = s * s * (3 - 2 * s); V.panX = round(H.c0[0] + (H.c1[0] - H.c0[0]) * e); V.panY = round(H.c0[1] + (H.c1[1] - H.c0[1]) * e); }
    E.active = a < HT.wipe && !!E.d;
    var key = 'h' + floor(t / 83) + '|' + (OPT.scale | 0) + '|' + !!OPT.silhouette; if (key === E.lastKey) return true; E.lastKey = key;
    SIL = !!OPT.silhouette;
    shoreFrame(V, dd, t, E, H, a);
    if (a >= HT.wipe) {
      var B2 = V.buf2, W2 = B2.w, H2 = B2.h; if (!E.tmp || E.tmp.length !== B2.d.length) E.tmp = new Uint32Array(B2.d.length); E.tmp.set(B2.d);
      X.villageFrame(st, true);
      var lim = (floor((a - HT.wipe) / 83) + 1) / 12 * (W2 / 2 + H2), u = V.u32, edge = R('cream', 1);
      for (var y = 0; y < H2; y++) for (var x = 0; x < W2; x++) { var dg = x / 2 + y, i = y * W2 + x; if (dg > lim + 3) u[i] = E.tmp[i]; else if (dg > lim) u[i] = edge; }
      V.octx.putImageData(V.img, 0, 0); return true;
    }
    V.u32.set(V.buf2.d); V.octx.putImageData(V.img, 0, 0); return true;
  }
  /* called by SpriteKit.render: returns true when Era 0 (or the hand-over) drew this frame */
  function frame(st, dt) {
    var V = X.view(); if (!V) return false;
    var d = read(st), t = V.t, proto = d.species === 'protoplasm';
    if (proto && E.lastSp !== null && (E.lastSp !== 'protoplasm' || (E.seed !== null && d.seed !== E.seed) || (E.days !== null && d.days !== null && d.days < E.days))) reset();
    var flip = E.lastSp === 'protoplasm' && !proto;
    E.lastSp = d.species; E.seed = d.seed; E.days = d.days;
    if (proto) { E.d = d; E.after = false; }
    if (flip && !E.hand && !E.after) startHand(t);
    if (E.hand) return drawHand(st, d, t, proto);
    E.active = false;
    if (!proto) return false;
    track(d, t); events(d, t);
    E.active = true;
    era0(V, d, t);
    return true;
  }
  function tap(x, y, t) {
    if (!E.active) return false;
    if (E.view === 'pool' && !E.hand) { E.taps.push({ x: x / WK, y: y / WK, t0: t }); if (E.taps.length > 12) E.taps.shift(); E.lastKey = ''; }
    return true;
  }

  /* ---------- in-scene gauges (bitmap font) ---------- */
  var HUD = { key: '', pix: null };
  function arc(p, cx, cy, f) {
    for (var y = cy - 14; y <= cy; y++) for (var x = cx - 14; x <= cx + 14; x++) {
      var dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = hyp(dx, dy); if (dy > 0.5 || r < 9.5 || r > 14) continue;
      var fr = (PI - Math.atan2(-dy, dx)) / PI, on = fr <= f / 100, rim = r > 13 || dy > -0.5;
      p.set(x, y, on ? R('saffron', rim ? 3 : dx < 0 ? 1 : 2) : R('walnut', rim ? 3 : 2));
    }
    var s = round(f) + '%'; SK.ui.text(p, s, cx - (SK.ui.measure(s) >> 1), cy + 2, R('soot', 3));
  }
  function gauges(d) {
    var u = SK.ui, hasD = !!d.DNA, hasF = d.final != null, w = hasF ? 150 : 112, h = hasD || hasF ? 50 : 32, p = u.panel(w, h, null), ink2 = R('soot', 3), num2 = R('walnut', 3);
    function bar(label, r, y, ramp) { u.text(p, label, 9, y, ink2); var v = round(r.a) + ' / ' + round(r.m); u.text(p, v, 102 - u.measure(v), y, num2); p.blit(u.progress(94, r.a / r.m, ramp), 8, y + 9); }
    bar('RNA', d.RNA, 8, 'saffron');
    if (hasD) bar('DNA', d.DNA, 26, 'indigo');
    if (hasF) arc(p, 127, 30, d.final);
    return p;
  }
  function hud(c, s, x, y) {
    if (!E.active || !E.d) return;
    var d = E.d, key = [round(d.RNA.a), round(d.RNA.m), d.DNA ? round(d.DNA.a) + '/' + round(d.DNA.m) : '-', d.final].join('|');
    if (key !== HUD.key) { HUD.key = key; HUD.pix = gauges(d); }
    var p = HUD.pix, k = max(2, s | 0); c.imageSmoothingEnabled = false; c.drawImage(p.canvas(), x, y, p.w * k, p.h * k);
  }

  /* ---------- fake state, atelier sheet, self-check samples ---------- */
  function fake() {
    return { race: { species: 'protoplasm' }, seed: 1, stats: { days: 0 }, city: { biome: 'grassland', calendar: { day: 0 } }, event: { l: false }, tech: { evo: 3 },
      resource: { RNA: { amount: 140, max: 250 }, DNA: { amount: 60, max: 200 } },
      evolution: { membrane: { count: 6 }, organelles: { count: 5 }, nucleus: { count: 3 }, eukaryotic_cell: { count: 2 }, mitochondria: { count: 4 }, final: 40 } };
  }
  function base(o) { return Object.assign({ m: 0, o: 0, n: 0, e: 0, x: 0, stage: 1, final: null, RNA: { a: 40, m: 100 }, DNA: null, biome: 'grassland', seed: 1 }, o); }
  function sheet(t) {
    var W = 660, Hh = 700, p = new Pix(W, Hh), u = SK.ui, txt = R('soot', 3), y = 0, saveSil = SIL; SIL = false;
    function lab(s, x, yy) { u.text(p, s, x, yy, txt); }
    function bg(tp, kind) {
      var w = tp.w, h = tp.h;
      for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
        var c;
        if (kind === 'pool') c = j < 2 ? R('water', 0) : j >= h - 6 ? R('sand', j >= h - 2 ? 2 : 1) : j < h * 0.35 ? R('water', 1) : j < h * 0.7 ? R('water', 2) : R('abyss', 2);
        else if (kind === 'water') c = j < h * 0.3 ? R('sky', 0) : (j + (i >> 3)) % 7 === 0 ? R('water', 1) : R('water', 2);
        else { var gy = h - 14; c = j < gy ? R('sky', 0) : j < gy + 1 ? R(kind === 'mud' ? 'dirt' : 'summer', 2) : R(kind === 'mud' ? 'dirt' : 'summer', 1); }
        tp.d[j * w + i] = c;
      }
    }
    function tile(x, yy, w, h, kind, fn, label) { var tp = new Pix(w, h); bg(tp, kind); fn(tp, w >> 1, h >> 1, h - 14); p.blit(tp, x, yy); if (label) lab(label, x, yy + h + 2); }
    function walker(tp, gx, gy, name, flip, tool) {
      var pc = P[name], ax = flip ? pc.w - 1 - pc.anchor[0] : pc.anchor[0], x0 = gx - ax, y0 = gy - pc.anchor[1], hand = pc.attach && pc.attach.hand;
      var hx = hand ? x0 + (flip ? pc.w - 1 - hand[0] : hand[0]) : 0, hy = hand ? y0 + hand[1] : 0;
      if (tool === 'stick') stick(tp, hx, hy); tp.blit(spr(name), x0, y0, flip); if (tool === 'stone') stone(tp, hx, hy);
    }
    lab('Stades \u00b7 voie humaine (0-3 bassin \u00b7 4-7 rivage \u00b7 bascule)', 2, y); y += 12;
    var tc = q(t, 166), STG = [
      ['pool', function (tp, cx, cy) { for (var k = 0; k < 7; k++) speck(tp, cx - 24 + ih(k, 1, 9) * 48, cy - 16 + ih(k, 2, 9) * 32 + 2 * sin(tc / 900 + k), 0, k % 3 === 0); }],
      ['pool', function (tp, cx, cy) { drawCell(tp, cx, cy, base({ m: 6, o: 2, n: 5, e: 1, x: 4 }), t, 0.28); }],
      ['pool', function (tp, cx, cy) { mitosis(tp, cx, cy, t, 0); }],
      ['pool', function (tp, cx, cy) { phago(tp, cx - 4, cy, t, false); }],
      ['water', function (tp, cx, cy) { putC(tp, spr('org_colony_l'), cx, cy + 6 + round(sin(t / 700))); }],
      ['mud', function (tp, cx, cy, gy) { walker(tp, cx, gy, ['org_worm_a', 'org_worm_b'][floor(t / 250) & 1], false); }],
      ['grass', function (tp, cx, cy, gy) { walker(tp, cx, gy, (t % 6000) < 4000 ? ['org_mammal_a', 'org_mammal_b'][floor(t / 166) & 1] : 'org_mammal_rest', false); }],
      ['grass', function (tp, cx, cy, gy) { walker(tp, cx, gy, (t % 6000) < 4000 ? ['org_ape_a', 'org_ape_b'][floor(t / 166) & 1] : 'org_ape_idle', false, 'stick'); }],
      ['grass', function (tp, cx, cy, gy) { tp.blit(spr('fire_ring'), cx - 20, gy - 6); var f = floor(t / 200) % 3; [[0, -2, 2], [1, -2, 3], [0, -3, 1], [f - 1, -4, 0]].forEach(function (s) { tp.set(cx - 13 + s[0], gy + s[1], R('ember', s[2])); });
        tp.blit(SK.citizens.compose('unemployed', 3, 'idle', floor(t / 500) & 1, {}), cx + 8 - 16, gy - 31); }]];
    STG.forEach(function (s, i) { tile(2 + i * 72, y, 70, 60, s[0], s[1], i < 8 ? i + ' ' + PATHS.human[i].label : 'human'); });
    y += 60 + 14;
    lab('Parties de la cellule \u00b7 nombres 0 / 1 / 5 / 12 / 24 (au-del\u00e0 : densit\u00e9 de particules)', 2, y); y += 12;
    var CNT = [0, 1, 5, 12, 24], ROWS = [['membrane', function (n) { return base({ m: n, e: 1 }); }, 0.3], ['organelles', function (n) { return base({ m: 1, o: n }); }, 0.26],
      ['nucleus', function (n) { return base({ m: 1, n: n, e: 1 }); }, 0.3], ['eukaryotic', function (n) { return base({ m: 1, n: 1, e: n }); }, 0.3], ['mitochondria', function (n) { return base({ m: 1, o: 1, n: 1, e: 1, x: n }); }, 0.3]];
    CNT.forEach(function (n, j) { lab(String(n), 82 + j * 106 + 48, y); }); y += 11;
    ROWS.forEach(function (r) { lab(r[0], 2, y + 32); CNT.forEach(function (n, j) { tile(82 + j * 106, y, 104, 72, 'pool', function (tp, cx, cy) { drawCell(tp, cx, cy, r[1](n), t, r[2]); }); }); y += 76; });
    y += 4;
    lab('Boucles et \u00e9v\u00e9nements', 2, y); y += 12;
    var tri = function (v) { v = mod(v, 1); return v < 0.5 ? v * 2 : 2 - v * 2; };
    var LOOPS = [
      ['pool', 'mitose 1,2 s', function (tp, cx, cy) { mitosis(tp, cx, cy, t, 0); }],
      ['pool', 'phagocytose', function (tp, cx, cy) { var s = tri(t / 8000), fl = mod(t / 8000, 1) >= 0.5; phago(tp, 30 + round(s * 90), cy, t, fl); }],
      ['mud', 'ver 4 i/s', function (tp, cx, cy, gy) { var s = tri(t / 9000), fl = mod(t / 9000, 1) >= 0.5; walker(tp, 22 + round(q(t, 250) / 9000 * 0 + s * 106), gy, ['org_worm_a', 'org_worm_b'][floor(t / 250) & 1], fl); }],
      ['grass', 'mammif\u00e8re 6 i/s', function (tp, cx, cy, gy) { var c = t % 7000, wk = c < 5000, s = tri(min(c, 5000) / 10000); walker(tp, 16 + round(s * 2 * 118), gy, wk ? ['org_mammal_a', 'org_mammal_b'][floor(t / 166) & 1] : 'org_mammal_rest', false); }],
      ['grass', 'singe 6 i/s', function (tp, cx, cy, gy) { var c = t % 8000, wk = c < 5000, s = min(c, 5000) / 5000; walker(tp, 14 + round(s * 120), gy, wk ? ['org_ape_a', 'org_ape_b'][floor(t / 166) & 1] : 'org_ape_idle', false, 'stick'); }],
      ['pool', 'rna_meteor', function (tp, cx, cy) { var c = t % 2200, ev2 = { met: { t0: t - c } }; meteorFx(tp, ev2, t, cx + 30, cy + 8, 'water'); }],
      ['pool', 'dna_replication', function (tp, cx, cy) { var c = t % 2600; if (c < 2400) dnaSplitFx(tp, { dna: { t0: t - c } }, t, cx, cy); else putC(tp, frameOf('fx_dna_split', 0), cx, cy); }],
      ['pool', '\u00e9volution (flash)', function (tp, cx, cy) { var c = t % 1400; putC(tp, spr('org_protocell'), cx, cy); flashFx(tp, { flash: { t0: t - c } }, t, cx, cy); }]];
    LOOPS.forEach(function (l, i) { tile(2 + (i % 4) * 160, y + floor(i / 4) * 76, 156, 60, l[0], l[2], l[1]); });
    SIL = saveSil;
    return p;
  }
  function samples() {
    var d = read(fake()), ev = { taps: [] }, b = new Pix(WW, WH), b2 = new Pix(WW, WH), keep = SIL; SIL = false;
    poolFrame(b, d, 1500, 0, ev);
    var d2 = Object.assign({}, d, { stage: 6, final: 90 }); shoreWorld(b2, d2, 1500, ev, crowd(d2), null);
    SIL = keep;
    return [{ label: 'Era 0 pool frame', pix: b }, { label: 'Era 0 shore frame', pix: b2 }, { label: 'Era 0 contact sheet', pix: sheet(1500) }];
  }

  SK.evo = { frame: frame, hud: hud, tap: tap, handoff: function (t) { if (!E.hand) startHand(t == null ? ((X.view() || {}).t || 0) : t); },
    reset: function () { E = fresh(); var V = X.view(); if (V) { V.panX = V.panY = null; V.key = ''; } }, fake: fake, read: read, sheet: sheet, samples: samples,
    PATHS: PATHS, CREATURES: CREATURES, FINALS: FINALS, BIO: BIO, state: function () { return E; } };
  return true;
  }
})(window);
