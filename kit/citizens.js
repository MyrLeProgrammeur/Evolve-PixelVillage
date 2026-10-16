/* Evolve village sprite kit — Batch 5 (+ Era 1 audit follow-up): citizen compositor, animations and job placement.
   A citizen is composed from layers (legs/hem, torso, coat, flourishes, tool, arms, armour, head, hair, headwear, shield)
   into a 32x32 cell holding the 16x24 body frame at (8,8); tools may overflow the body frame.
   Era 1 follow-up: tool metals read the real tool techs, soldier gear reads military/armor, seasonal clothing,
   wounded, marching column, raiders, protest crowd, builders, famine, scavenger, craftsmen carrying their craft. */
(function (G) {
  'use strict';
  var SK = G.SK = G.SK || {};
  SK._ext = (SK._ext || []).filter(function (e) { return e.id !== 'cit'; });
  SK._ext.push({ id: 'cit', fn: reg });
  if (SK._runExt) SK._runExt();
  function reg() {
  if (!SK.village || !SK.village.vil || !G.SpriteKit || !SK.PARTS || !SK.PARTS.b5 || !SK.PARTS.b8) return false;
  var X = G.SpriteKit._, R = X.R, Pix = X.Pix, P = SK.PIECES, VL = SK.village, floor = Math.floor, round = Math.round;
  var CW = 32, CHh = 32, OX = 8, OY = 8, AX = 16, AY = 31;

  /* archetypes: outfit colour family is constant per archetype */
  var ARCH = {
    land:    { body: 'tunic', outfit: 'sage', trous: 'hide', belt: 'oak' },
    wood:    { body: 'tunic', outfit: 'madder', trous: 'walnut', belt: 'walnut', rolled: true },
    craft:   { body: 'tunic', outfit: 'saffron', trous: 'driftwood', belt: 'walnut', apron: true },
    lore:    { body: 'robe', outfit: 'indigo', trim: 'saffron' },
    faith:   { body: 'robe', outfit: 'cream', trim: 'gold' },
    finance: { body: 'robe', outfit: 'plum', trim: 'gold' },
    show:    { body: 'robe', outfit: 'rose', trim: 'saffron' },
    soldier: { body: 'tunic', outfit: 'slate', trous: 'walnut', belt: 'oak' },
    merc:    { body: 'tunic', outfit: 'rust', trous: 'walnut', belt: 'soot' },
    scav:    { body: 'tunic', outfit: 'driftwood', trous: 'walnut', belt: 'rust', rolled: true, patches: true },
    raider:  { body: 'tunic', outfit: 'soot', trous: 'walnut', belt: 'rust' }
  };
  var JOB = {
    unemployed:    { a: 'land', work: 'idle', at: 'plaza' },
    forager:       { a: 'land', tool: 'tool_basket', hat: 'hat_scarf', work: 'gesture', at: ['farm', 'lumber_yard', 'lodge'] },
    farmer:        { a: 'land', tool: 'tool_hoe', hat: 'hat_straw', work: 'strike', at: ['farm'] },
    hunter:        { a: 'land', tool: 'tool_spear', band: true, work: 'strike', at: ['lodge', 'smokehouse'] },
    lumberjack:    { a: 'wood', tool: 'tool_axe', hat: 'hat_beanie', work: 'strike', at: ['lumber_yard', 'sawmill'] },
    quarry_worker: { a: 'wood', tool: 'tool_hammer_big', work: 'strike', at: ['rock_quarry'] },
    miner:         { a: 'wood', tool: 'tool_pick', hat: 'hat_miner_lamp', always: true, work: 'strike', at: ['mine'] },
    coal_miner:    { a: 'wood', tool: 'tool_pick', hat: 'hat_miner_lamp', always: true, soot: true, work: 'strike', at: ['coal_mine'] },
    cement_worker: { a: 'wood', tool: 'tool_shovel', mouth: true, work: 'strike', at: ['cement_plant'] },
    craftsman:     { a: 'craft', tool: 'tool_hammer', work: 'strike', at: ['foundry', 'smelter', 'metal_refinery', 'shed'] },
    teamster:      { a: 'craft', cart: true, work: 'gesture', at: ['storage_yard', 'trade', 'shed'] },
    professor:     { a: 'lore', tool: 'tool_book', hat: 'hat_scholar', work: 'gesture', at: ['library', 'university'] },
    scientist:     { a: 'lore', tool: 'tool_flask', goggles: true, work: 'gesture', at: ['university', 'library'] },
    priest:        { a: 'faith', tool: 'tool_book', hat: 'hat_hood', work: 'gesture', at: ['temple'] },
    banker:        { a: 'finance', tool: 'tool_purse', hat: 'hat_top', work: 'gesture', at: ['bank', 'trade'] },
    entertainer:   { a: 'show', tool: 'tool_lute', sash: true, work: 'gesture', at: ['amphitheatre'] },
    soldier:       { a: 'soldier', tool: 'tool_spear', shield: true, hat: 'hat_helmet', always: true, work: 'guard', at: ['garrison'] },
    scavenger:     { a: 'scav', tool: 'tool_scrap_hook', hat: 'hat_scarf', work: 'strike', at: ['storage_yard', 'shed'] },
    /* scene archetypes (not civic jobs) */
    raider:        { a: 'raider', tool: 'tool_torch', hat: 'hat_hood', always: true, work: 'strike', at: 'plaza' },
    protester:     { a: 'land', tool: 'tool_placard', work: 'gesture', at: 'plaza' }
  };
  var CLOTH = ['saffron', 'madder', 'indigo', 'teal', 'plum', 'rose', 'sage'], COATS = ['walnut', 'hide', 'indigo', 'madder', 'sage'];
  var SKINS = ['skin_fair', 'skin_tan', 'skin_deep'], HAIRS = ['hair_black', 'hair_chestnut', 'hair_auburn', 'hair_flax', 'hair_silver'], CUTS = ['short', 'long', 'braid', 'bun'];
  var FLP = { land: ['fl_scarf_end', 'fl_beads', 'fl_flower_hair', 'fl_poncho_trim', 'fl_shoulder_bag'], wood: ['fl_scarf_end', 'fl_beads', 'fl_flower_hair'],
    craft: ['fl_beads', 'fl_flower_hair', 'fl_scarf_end'], lore: ['fl_beads', 'fl_shoulder_bag', 'fl_flower_hair'], faith: ['fl_beads'], finance: ['fl_beads', 'fl_flower_hair'], scav: ['fl_scarf_end', 'fl_beads'] };
  /* hats that stay on in snow and rain */
  var KEEP_HAT = { hat_helmet: 1, hat_miner_lamp: 1, hat_hood: 1 };

  var LOOKS = new Map();
  function look(job, seed) {
    var key = job + '|' + seed; if (LOOKS.has(key)) return LOOKS.get(key);
    var J = JOB[job], A = ARCH[J.a], r = X.rng('cit', job, seed), pick = function (a) { return a[floor(r() * a.length)]; };
    var L = { skin: pick(SKINS), hair: pick(HAIRS), cut: pick(CUTS) };
    L.cloth = pick(CLOTH.filter(function (c) { return c !== A.outfit; }));
    L.hat = J.hat && (J.always || r() < 0.8) ? J.hat : null;
    var pool = (FLP[J.a] || []).filter(function (f) {
      if (f === 'fl_scarf_end' && J.mouth) return false;
      if (f === 'fl_poncho_trim' && A.body !== 'tunic') return false;
      if (f === 'fl_shoulder_bag' && (J.shield || J.cart || J.a === 'craft')) return false;
      return true;
    });
    L.fl = pool.length && r() < 0.6 ? pick(pool) : null;
    L.coat = pick(COATS);
    LOOKS.set(key, L); return L;
  }
  /* tool metals from the real tool techs: pickaxe / hammer / hoe 1 bronze, 2 iron, 3 steel (0 = stone);
     axe 1 stone, 2 copper, 3 iron (unchanged). tech.mining no longer drives the pick (mining 4 = coal, not steel). */
  function tierM(lv, base) { lv = lv | 0; return lv >= 3 ? 'steel' : lv === 2 ? 'iron' : lv === 1 ? 'bronze' : base; }
  function metals(o) {
    o = o || {}; var ax = Math.max(1, Math.min(3, o.axe | 0 || 1)), mi = o.mining | 0, ar = o.armor | 0;
    return { axe: ['slate', 'copper', 'iron'][ax - 1], pick: tierM(o.pickaxe, 'slate'), hammer: tierM(o.hammer, 'river'), hoe: tierM(o.hoe, 'slate'),
      tool: mi >= 3 ? 'iron' : mi >= 2 ? 'copper' : 'slate', helm: ar >= 2 ? 'iron' : 'bronze', bow: (o.military | 0) >= 1, armor: ar };
  }
  function toolMap(t, M, L, J, o) {
    switch (t) {
      case 'tool_axe': return { METAL: M.axe, WOOD: 'oak' };
      case 'tool_pick': return { METAL: M.pick, WOOD: 'pinewood' };
      case 'tool_hammer_big': return { METAL: M.hammer, WOOD: 'oak' };
      case 'tool_hammer': return { METAL: M.hammer === 'river' ? 'slate' : M.hammer, WOOD: 'oak' };
      case 'tool_hoe': return { METAL: M.hoe, WOOD: 'oak' };
      case 'tool_spear': return { METAL: M.tool, WOOD: 'pinewood', ACCENT: L.cloth };
      case 'tool_bow': return { WOOD: 'walnut', MAIN: 'cream' };
      case 'tool_basket': return { MAIN: 'straw', ACCENT: 'madder', WOOD: 'walnut', FOLIAGE: 'summer' };
      case 'tool_book': return { MAIN: 'cream', ACCENT: J.a === 'faith' ? 'plum' : 'madder' };
      case 'tool_flask': return { MAIN: 'water', ACCENT: L.cloth === 'teal' ? 'plum' : 'teal', WOOD: 'oak' };
      case 'tool_purse': return { MAIN: 'hide', METAL: 'gold', WOOD: 'walnut' };
      case 'tool_lute': return { MAIN: 'walnut', WOOD: 'oak' };
      case 'tool_banner': return { ACCENT: o.banner || 'madder', WOOD: 'pinewood', METAL: 'bronze' };
      case 'tool_torch': return { ACCENT: 'ember', METAL: 'iron', WOOD: 'walnut' };
      case 'tool_placard': return { MAIN: 'cream', ACCENT: L.cloth === 'madder' ? 'indigo' : 'madder', WOOD: 'pinewood' };
      case 'tool_scrap_hook': return { METAL: 'rust', WOOD: 'driftwood' };
      default: return { METAL: M.tool, WOOD: 'oak' };
    }
  }
  function hatMap(h, A, L, M) {
    switch (h) {
      case 'hat_straw': return { MAIN: 'straw', ACCENT: L.cloth };
      case 'hat_scarf': return { MAIN: L.cloth, ACCENT: 'cream' };
      case 'hat_beanie': return { MAIN: 'indigo', ACCENT: 'cream' };
      case 'hat_miner_lamp': return { MAIN: 'hide' };
      case 'hat_hood': return { MAIN: A.outfit, ACCENT: A.trim || A.belt };
      case 'hat_scholar': return { MAIN: 'soot', ACCENT: 'saffron' };
      case 'hat_top': return { MAIN: 'soot', ACCENT: 'madder' };
      case 'hat_helmet': return { METAL: M.helm, ACCENT: 'madder' };
      case 'hat_fur': return { MAIN: L.coat === 'walnut' ? 'hide' : 'walnut', ACCENT: 'cream' };
      case 'fl_rain_hood': return { MAIN: L.cloth === 'saffron' ? 'teal' : 'saffron', ACCENT: 'walnut' };
    }
    return {};
  }
  /* carried craft goods (craftsman walking between foundry and plaza) */
  var CARRY = { Plywood: ['unit_plank', {}], Brick: ['unit_block', { MAIN: 'brick' }], Wrought_Iron: ['unit_bar', {}], Sheet_Metal: ['unit_sheet', {}] };

  /* mode: idle | walk | work | guard | sit ; f: frame index
     o: { back, axe, pickaxe, hammer, hoe, mining, military, armor, wx ('w' winter, 'r' rain), famine, wound, carry, banner, merc, tool } */
  var CACHE = new Map();
  function compose(job, seed, mode, f, o) {
    o = o || {}; f = f & 3;
    var M = metals(o), back = !!o.back, wx = o.wx || '', winter = wx.indexOf('w') >= 0, rain = wx.indexOf('r') >= 0;
    var key = [job, seed, mode, f, back ? 1 : 0, M.axe, M.pick, M.hammer, M.hoe, M.tool, M.helm, M.bow ? 1 : 0, M.armor, wx, o.famine ? 1 : 0, o.wound ? 1 : 0, o.carry || '', o.banner || '', o.merc ? 1 : 0, o.tool || ''].join('|');
    var hit = CACHE.get(key); if (hit) return hit;
    if (CACHE.size > 4000) CACHE.clear();
    var J = JOB[job], A = ARCH[o.merc ? 'merc' : J.a], L = look(job, seed), robe = A.body === 'robe', p = new Pix(CW, CHh), sh = J.soot ? 1 : 0;
    var skin = o.famine ? 'skin_pale' : L.skin, soldier = J.a === 'soldier';
    function lay(name, map, dx, dy, opt) { var d = P[name]; p.blit(X.sprite(name, map, opt), OX + d.at[0] + (dx | 0), OY + d.at[1] + (dy | 0)); }
    function hold(name, map, hx, hy, rot, flip) {
      var d = P[name], g = d.attach.grip, gx = g[0], gy = g[1];
      if (rot === 90) { gx = d.h - 1 - g[1]; gy = g[0]; }
      if (flip && !rot) gx = d.w - 1 - gx;
      var opt = rot ? { rot: rot } : flip ? { flip: true } : null;
      p.blit(X.sprite(name, map, opt), OX + hx - gx, OY + hy - gy);
    }
    var legs = 'legs_stand', hem = 'hem_stand', arm = 'arm_neutral', U = 0, adx = 0, rot = 0, sit = mode === 'sit';
    if (mode === 'walk') { legs = ['legs_step_a', 'legs_pass', 'legs_step_b', 'legs_pass'][f]; hem = (f & 1) ? 'hem_stand' : 'hem_step'; U = (f & 1) ? -1 : 0; adx = [1, 0, -1, 0][f]; }
    else if (mode === 'work' && J.work === 'strike') { arm = (f & 1) ? 'arm_strike' : 'arm_raise'; rot = (f & 1) ? 90 : 0; U = f & 1; }
    else if (mode === 'work' && J.work === 'gesture') { arm = (f & 1) ? 'arm_hands_b' : 'arm_hands_a'; }
    else if (sit) { legs = 'legs_sit'; U = 4; arm = o.wound ? 'arm_sling' : 'arm_neutral'; }
    else { U = f & 1; if (o.famine && !soldier) arm = 'arm_belly'; }
    if (back) arm = 'arm_neutral';
    var tool = o.tool || J.tool, shield = J.shield && !o.merc;
    if (soldier && tool === 'tool_spear' && M.bow) { tool = 'tool_bow'; shield = false; }
    if (sit || (arm === 'arm_belly')) tool = null;
    if (mode === 'walk' && o.carry && CARRY[o.carry]) tool = null;
    var coatR = L.coat, torsoMain = (back && winter) ? coatR : A.outfit;
    var mT = robe ? { MAIN: torsoMain, ACCENT: A.trim } : { MAIN: torsoMain, ACCENT: A.belt, SKIN: skin };
    var mA = { MAIN: winter ? coatR : A.outfit, ACCENT: winter ? coatR : (A.rolled ? skin : A.outfit), SKIN: skin, WOOD: 'cream' };
    var mL = robe ? { MAIN: A.outfit, ACCENT: A.trim, WOOD: 'walnut' } : { MAIN: A.trous, WOOD: 'walnut' };
    var tm = tool ? toolMap(tool, M, L, J, o) : null, hand = P[arm].attach.hand, sop = sh ? { shade: sh } : null;
    var hat = L.hat;
    if (o.merc) hat = 'hat_fur';
    if (winter && !KEEP_HAT[hat]) hat = 'hat_fur';
    if (rain && !(hat === 'hat_helmet' || hat === 'hat_miner_lamp')) hat = 'fl_rain_hood';
    var cut = (hat && L.cut === 'bun') ? 'short' : L.cut, bx = back ? -1 : 0, flick = tool === 'tool_torch' && (f & 1);
    if (J.cart) {
      var cx = OX + 3 - 11 + adx, cy = OY + 14 + U;
      p.blit(X.sprite('cart_box', { WOOD: 'oak' }), cx, cy);
      if (seed % 2 && P.unit_fur_bundle) p.blit(X.sprite('unit_fur_bundle'), cx + 1, cy - 4); else p.blit(X.sprite('unit_sack', { MAIN: 'cream', ACCENT: L.cloth }), cx + 1, cy - 3);
      p.blit(X.sprite(mode === 'walk' && (f & 1) ? 'cart_wheel_b' : 'cart_wheel_a', { WOOD: 'walnut' }), cx + 1, OY + 19);
    }
    if (back && tool) hold(tool, tm, 12, 15 + U, 0, flick);
    if (robe && !sit) lay(hem, mL, bx, 0, sop); else lay(legs, mL, bx, 0, sop);
    lay(back ? (robe ? 'back_torso_robe' : 'back_torso_tunic') : (robe ? 'torso_robe' : 'torso_tunic'), mT, 0, U, sop);
    if (!back) {
      if (winter) lay('fl_winter_coat', { MAIN: coatR, ACCENT: 'cream' }, 0, U);
      else {
        if (A.apron) lay('fl_apron_pocket', { MAIN: 'hide', ACCENT: 'walnut' }, 0, U);
        if (J.sash) lay('fl_sash', { ACCENT: L.cloth }, 0, U);
        if (L.fl === 'fl_poncho_trim') lay('fl_poncho_trim', { ACCENT: L.cloth }, 0, U);
      }
      if (A.patches) lay('fl_patches', { ACCENT: L.cloth === 'rust' ? 'plum' : 'rust' }, 0, U);
      if ((soldier || o.merc) && M.armor === 1) lay('fl_leather', { MAIN: 'hide', ACCENT: 'walnut' }, 0, U);
      if (tool) hold(tool, tm, hand[0] + (mode === 'walk' ? adx : 0), hand[1] + U, rot, flick);
    }
    lay(back ? 'back_arm' : arm, mA, adx, U, sop);
    if (!back && mode === 'walk' && o.carry && CARRY[o.carry]) { var cu = CARRY[o.carry]; p.blit(X.sprite(cu[0], cu[1]), OX + hand[0] - 5 + adx, OY + hand[1] - 6 + U); }
    if (!back && (soldier || o.merc) && M.armor >= 2) lay('fl_plate', { METAL: M.helm }, 0, U);
    if (!back && !winter && L.fl === 'fl_shoulder_bag') lay('fl_shoulder_bag', { MAIN: 'hide', ACCENT: L.cloth }, 0, U);
    lay(back ? 'back_head' : 'head_front', { SKIN: skin }, 0, U);
    if (!back && J.goggles) {
      [[6, 2], [8, 2], [10, 3]].forEach(function (q) { p.set(OX + q[0], OY + 5 + U, R('bronze', q[1])); });
      p.set(OX + 7, OY + 5 + U, R('steel', 0)); p.set(OX + 9, OY + 5 + U, R('steel', 1));
    }
    lay(back ? 'back_hair_' + (CUTS.indexOf(L.cut) + 1) : 'hair_' + cut, { HAIR: L.hair, ACCENT: L.cloth }, 0, U);
    if (o.wound && !back) lay('fl_bandage_head', { MAIN: 'cream', ACCENT: 'madder' }, 0, U);
    else if (hat) lay(hat, hatMap(hat, A, L, M), bx, U);
    if (J.band && !winter && !rain) lay('fl_headband', { ACCENT: L.cloth }, bx, U);
    if (!back) {
      if (L.fl === 'fl_flower_hair' && !winter && !rain) lay('fl_flower_hair', { ACCENT: L.cloth === 'rose' ? 'saffron' : 'rose', FOLIAGE: 'summer' }, 0, U);
      if (J.mouth) lay('fl_scarf_end', { ACCENT: L.cloth }, 0, U - 2);
      if (L.fl === 'fl_scarf_end' && !winter) lay('fl_scarf_end', { ACCENT: L.cloth }, 0, U);
      if (L.fl === 'fl_beads' && !winter) lay('fl_beads', { ACCENT: L.cloth }, 0, U);
      if (shield && !sit) hold('tool_shield', { METAL: M.tool, ACCENT: L.cloth === 'madder' ? 'indigo' : 'madder' }, P[arm].attach.hand2[0] + adx, P[arm].attach.hand2[1] + U, 0);
    }
    CACHE.set(key, p); return p;
  }

  /* ---------- scene: who stands where, routes, schedules ---------- */
  var ST = { list: [], sig: '' }, PATHS = new Map();
  var FLAT = { farm: 1, rock_quarry: 1, lumber_yard: 1, storage_yard: 1, amphitheatre: 1, compost: 1 };
  var INSIDE = { farm: 1, rock_quarry: 1, lumber_yard: 1, storage_yard: 1 };
  var RAIDS = { raid: 1, siege: 1, pillage0: 1, pillage1: 1, pillage2: 1, pillage3: 1 };
  function wN(n) { return n > 0 ? Math.min(n, 1 + Math.ceil(Math.sqrt(n))) : 0; }
  function civicN(st, job) { var c = (st && st.civic) || {}, k = job === 'soldier' ? 'garrison' : job; return ((c[k] || {}).workers) | 0; }
  function shown(st, job) { return SK.gate ? SK.gate('job:' + job, st) : true; }
  function occ(items) {
    var N = X.MAPN, o = new Uint8Array(N * N);
    items.forEach(function (it) { for (var y = it.y; y < it.y + it.fd; y++) for (var x = it.x; x < it.x + it.fw; x++) if (x >= 0 && y >= 0 && x < N && y < N) o[y * N + x] = 1; });
    return o;
  }
  function free(o, u, v) { var N = X.MAPN, x = floor(u), y = floor(v); if (x < 0 || y < 0 || x >= N || y >= N) return false; var q = y * N + x; return !o[q] && X.layout()[q] !== 4; }
  function plazaPt(a, b) { return [10.5 + a * 3, 10.5 + b * 3]; }
  function spotFor(it, o, r1, r2) {
    if (it.type === 'amphitheatre') return [it.x + 0.5, it.y + 0.5];
    if (INSIDE[it.type]) return [it.x + 0.3 + r1 * (it.fw - 0.6), it.y + 0.3 + r2 * (it.fd - 0.6)];
    var c = [[it.x + 0.3 + r1 * (it.fw - 0.6), it.y + it.fd + 0.5], [it.x + it.fw + 0.5, it.y + 0.3 + r1 * (it.fd - 0.6)]];
    if (r2 < 0.5) c.reverse();
    for (var i = 0; i < c.length; i++) if (free(o, c[i][0], c[i][1])) return c[i];
    return c[0];
  }
  function route(a, b, o, osig) {
    var N = X.MAPN, T = X.layout(), cl = function (v) { return Math.max(0, Math.min(N - 1, floor(v))); };
    var s = cl(a[1]) * N + cl(a[0]), e = cl(b[1]) * N + cl(b[0]), key = osig + '|' + s + '>' + e;
    if (!PATHS.has(key)) {
      var NN = N * N, dist = new Float32Array(NN).fill(1e9), prev = new Int32Array(NN).fill(-1), done = new Uint8Array(NN), D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      dist[s] = 0;
      for (;;) {
        var u = -1, best = 1e9; for (var i = 0; i < NN; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
        if (u < 0 || u === e) break; done[u] = 1;
        for (var k = 0; k < 4; k++) {
          var nx = u % N + D4[k][0], ny = floor(u / N) + D4[k][1]; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          var q = ny * N + nx, tt = T[q]; if (tt === 4 || (o[q] && q !== e && q !== s)) continue;
          var cst = dist[u] + ((tt === 2 || tt === 3) ? 1 : 2.4); if (cst < dist[q]) { dist[q] = cst; prev[q] = u; }
        }
      }
      var tiles = []; if (e === s || prev[e] >= 0) { for (var c = e; c !== s && c >= 0; c = prev[c]) tiles.unshift(c); }
      PATHS.set(key, tiles);
      if (PATHS.size > 600) PATHS.delete(PATHS.keys().next().value);
    }
    var pts = [a]; PATHS.get(key).slice(0, -1).forEach(function (q) { pts.push([q % N + 0.5, floor(q / N) + 0.5]); }); pts.push(b);
    return pts;
  }
  function plen(pts) { var L = 0; for (var i = 1; i < pts.length; i++) L += Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]); return L; }
  function along(pts, s) {
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], du = b[0] - a[0], dv = b[1] - a[1], L = Math.abs(du) + Math.abs(dv);
      if (s <= L || i === pts.length - 1) { var t = L ? Math.min(1, s / L) : 1; return [a[0] + du * t, a[1] + dv * t, du, dv]; }
      s -= L;
    }
    var z = pts[pts.length - 1]; return [z[0], z[1], 0, 0];
  }
  var GOV_COL = { autocracy: 'madder', democracy: 'indigo', oligarchy: 'plum', theocracy: 'cream', republic: 'teal', socialist: 'rust', corpocracy: 'saffron', technocracy: 'sage', federation: 'rose', magocracy: 'plum' };
  function extras(st, items, o, osig) {
    var civ = (st && st.civic) || {}, gar = civ.garrison || {}, ev = ((st && st.event) || {}).l, out = [], gs = items.filter(function (it) { return it.type === 'garrison'; });
    var base = function (job, i, extra) { var c = { job: job, ji: 90 + out.length, i: i, J: JOB[job], it: null, fo: floor(X.ih(i, out.length, 47) * 1000), r1: X.ih(out.length, i, 49), o: {} }; for (var k in extra) c[k] = extra[k]; return c; };
    /* wounded soldiers sit by the barracks */
    var nw = Math.min(6, wN(gar.wounded | 0));
    for (var i = 0; i < nw; i++) { var g = gs[i % Math.max(1, gs.length)], sp = g ? [g.x + 0.25 + (i % 3) * 0.5, g.y + g.fd + 0.35 + floor(i / 3) * 0.45] : plazaPt(0.2 + i * 0.12, 0.85);
      out.push(base('soldier', 200 + i, { kind: 'sit', spot: sp, o: { wound: true } })); }
    /* marching column leaves through the east road while a raid is out (civic.garrison.raid) */
    var nr = Math.min(8, wN(gar.raid | 0));
    if (nr) { var st0 = gs[0] ? [gs[0].x + gs[0].fw / 2, gs[0].y + gs[0].fd + 0.5] : [12, 12], path = route(st0, [23.4, 11.5], o, osig), len = plen(path), banner = GOV_COL[(civ.govern || {}).type] || 'madder';
      for (i = 0; i < nr; i++) out.push(base('soldier', 300 + i, { kind: 'path', path: path, len: len, cyc: len + 6, sp: 1.1, off: -i * 0.75, endMode: 'hide', o: i === 0 ? { tool: 'tool_banner', banner: banner } : {} })); }
    /* raiders with torches come up the west road on an incoming raid, siege or pillage event */
    if (RAIDS[ev]) { var rp = route([0.4, 11.5], [9.2, 11.6], o, osig), rl = plen(rp);
      for (i = 0; i < 5; i++) out.push(base('raider', 400 + i, { kind: 'path', path: rp, len: rl, cyc: rl + 7, sp: 1.0, off: -i * 0.6 - (i % 2) * 0.2, endMode: 'work', endFlip: false, lane: (i % 2) * 0.35 })); }
    /* protest crowd with placards (civic.govern.protest), riot with torches on a tax revolt */
    var riot = ev === 'tax_revolt', np = riot ? 9 : ((civ.govern || {}).protest | 0) > 0 ? 6 : 0;
    for (i = 0; i < np; i++) { var a = i / np * Math.PI * 1.6 + 0.6, pp = [12 + Math.cos(a) * 1.7, 12 + Math.sin(a) * 1.7];
      out.push(base(riot && i % 2 ? 'raider' : 'protester', 500 + i, { kind: 'stand', spot: pp, mode: 'work', flip: Math.cos(a) > 0, o: riot && !(i % 2) ? { tool: 'tool_torch' } : {} })); }
    /* builders at fresh scaffolds */
    var sc = VL.scaf ? VL.scaf() : {}, bi = 0;
    Object.keys(sc).forEach(function (k) { var it = sc[k].it; out.push(base('craftsman', 600 + bi, { kind: 'stand', spot: [it.x + it.fw + 0.35, it.y + it.fd * 0.6], mode: 'work', flip: true })); bi++; });
    return out;
  }
  function plan(st) {
    var items = (VL.vil.plan && VL.vil.plan.list) || [], J0 = X.JOBS, civ = (st && st.civic) || {}, gar = civ.garrison || {}, ev = ((st && st.event) || {}).l;
    var counts = J0.map(function (j) { return JOB[j] && shown(st, j) ? wN(civicN(st, j)) : 0; }), tot = counts.reduce(function (a, b) { return a + b; }, 0);
    while (tot > 40) { var mi = 0; counts.forEach(function (c, i) { if (c > counts[mi]) mi = i; }); counts[mi]--; tot--; }
    var fd = ((st && st.city) || {}).foundry || {}, crafts = [];
    Object.keys(CARRY).forEach(function (k) { var n = fd[k] | 0; for (var q = 0; q < Math.min(n, 4); q++) crafts.push(k); });
    var sc = VL.scaf ? Object.keys(VL.scaf()).join(',') : '';
    var esig = [gar.wounded | 0, gar.raid | 0, gar.m_use | 0, ev || '', (civ.govern || {}).protest | 0, (civ.govern || {}).type || '', crafts.join(','), sc].join(';');
    var isig = items.map(function (i) { return i.type + i.k + '@' + i.x + ',' + i.y; }).join(';'), sig = counts.join(',') + '|' + isig + '|' + esig;
    if (sig === ST.sig) return;
    ST.sig = sig;
    var o = occ(items), osig = X.hash(isig), list = [], mercs = wN(gar.m_use | 0);
    J0.forEach(function (job, ji) {
      var J = JOB[job]; if (!J) return;
      var homes = [];
      if (J.at !== 'plaza') for (var a = 0; a < J.at.length && !homes.length; a++) homes = items.filter(function (it) { return it.type === J.at[a]; });
      for (var i = 0; i < counts[ji]; i++) {
        var r1 = X.ih(ji, i, 31), r2 = X.ih(i, ji, 37), r3 = X.ih(ji + 7, i, 41), r4 = X.ih(i + 3, ji, 43);
        var it = homes.length ? homes[i % homes.length] : null;
        var spot = it ? spotFor(it, o, r1, r2) : plazaPt(r2, r1), pz = plazaPt(r3, r4), path = route(spot, pz, o, osig), len = plen(path);
        var W = it ? 9 + r3 * 18 : 3 + r1 * 5, I = 2 + r4 * 4, sp = 0.9, Lt = len / sp, C = W + Lt + I + Lt, co = {};
        if (job === 'soldier' && i < mercs) co.merc = true;
        list.push({ job: job, ji: ji, i: i, J: J, it: it, spot: spot, path: path, W: W, I: I, Lt: Lt, C: C, sp: sp, off: r2 * C, fo: floor(r1 * 1000), r1: r1, o: co,
          carry: job === 'craftsman' && crafts.length ? crafts[i % crafts.length] : null });
      }
    });
    ST.list = list.concat(extras(st, items, o, osig));
  }
  function update(st) { plan(st); }

  function state(c, t) {
    var ft = t + c.fo, J = c.J;
    if (c.kind === 'sit') return { u: c.spot[0], v: c.spot[1], mode: 'sit', f: 0, flip: c.i % 2 === 1, back: false };
    if (c.kind === 'stand') return { u: c.spot[0], v: c.spot[1], mode: c.mode, f: floor(ft / (c.mode === 'work' ? 333 : 500)), flip: !!c.flip, back: false };
    if (c.kind === 'path') {
      var s = t / 1000 * c.sp + c.off; s = ((s % c.cyc) + c.cyc) % c.cyc;
      if (s >= c.len) { var e = c.path[c.path.length - 1]; return { u: e[0], v: e[1] + (c.lane || 0), mode: c.endMode || 'idle', f: floor(ft / 333), flip: !!c.endFlip, back: false }; }
      var a0 = along(c.path, s), sx = a0[2] - a0[3], sy = a0[2] + a0[3];
      return { u: a0[0], v: a0[1] + (c.lane || 0), mode: 'walk', f: floor(ft / 125), flip: sx < 0, back: sy < 0 };
    }
    var p = ((t / 1000 + c.off) % c.C + c.C) % c.C, pos, mode, f, flip = false, back = false;
    if (p < c.W) {
      pos = c.spot; mode = !c.it ? 'idle' : J.work === 'strike' || J.work === 'gesture' ? 'work' : J.work;
      f = floor(ft / (mode === 'work' ? 333 : 500));
      if (c.it) { var bc = X.worldPt(c.it.x + c.it.fw / 2, c.it.y + c.it.fd / 2)[0], me = X.worldPt(pos[0], pos[1])[0]; flip = INSIDE[c.it.type] ? c.r1 < 0.5 : bc < me; }
      else flip = c.i % 2 === 1;
    } else if (p < c.W + c.Lt + c.I && p >= c.W + c.Lt) { pos = c.path[c.path.length - 1]; mode = 'idle'; f = floor(ft / 500); flip = (c.i + c.ji) % 2 === 0; }
    else {
      var fwd = p < c.W + c.Lt, s2 = fwd ? (p - c.W) * c.sp : c.Lt * c.sp - (p - c.W - c.Lt - c.I) * c.sp, a = along(c.path, s2);
      var du = fwd ? a[2] : -a[2], dv = fwd ? a[3] : -a[3], sx2 = du - dv, sy2 = du + dv;
      pos = [a[0], a[1]]; mode = 'walk'; f = floor(ft / 125); flip = sx2 < 0; back = sy2 < 0;
    }
    return { u: pos[0], v: pos[1], mode: mode, f: f, flip: flip, back: back };
  }
  /* weather clothing: winter coat + fur hat when calendar.season === 3 or temp === 0; rain hood when weather === 0 and temp > 0 */
  function wxOf(st) {
    var c = (st && st.city && st.city.calendar) || {}, w = '';
    if ((c.season | 0) === 3 || (c.temp != null && (c.temp | 0) === 0)) w += 'w';
    if (c.weather != null && (c.weather | 0) === 0 && (c.temp | 0) > 0) w += 'r';
    return w;
  }
  function famineOf(st) { var f = ((st && st.resource) || {}).Food; return !!(f && f.max > 0 && f.amount <= 0); }
  function techO(tech) { return { axe: tech.axe, pickaxe: tech.pickaxe, hammer: tech.hammer, hoe: tech.hoe, mining: tech.mining, military: tech.military, armor: tech.armor }; }

  var LAST = [];
  function draw(b, ctx, K) {
    if (!ST.list.length) { LAST = []; return; }
    K = K || 1;
    var t = ctx.t, st = ctx.state, tech = (st && st.tech) || {}, D = VL.depth ? VL.depth() : null, W = b.w, H = b.h, DW = X.WW;
    var dep = function (x, y) { return D ? D[((y / K) | 0) * DW + ((x / K) | 0)] : -1e9; };
    var flats = ((VL.vil.plan && VL.vil.plan.list) || []).filter(function (it) { return FLAT[it.type]; }), mo = techO(tech), wx = wxOf(st), fam = famineOf(st);
    var arr = ST.list.map(function (c) {
      var s = state(c, t), d = s.u + s.v;
      flats.forEach(function (it) { if (s.u >= it.x && s.u <= it.x + it.fw && s.v >= it.y && s.v <= it.y + it.fd) d = Math.max(d, it.x + it.y + (it.fw + it.fd) / 2 + 0.05); });
      s.d = d; s.c = c; return s;
    }).filter(function (s) { return s.mode !== 'hide'; }).sort(function (a, c) { return a.d - c.d; });
    LAST = [];
    arr.forEach(function (s) {
      var c = s.c, opts = Object.assign({ back: s.back, wx: wx, famine: fam && c.J.a !== 'soldier' && c.J.a !== 'raider', carry: s.mode === 'walk' ? c.carry : null }, mo, c.o);
      var pix = compose(c.job, c.i, s.mode, s.f, opts);
      var g = X.worldPt(s.u, s.v), gx = round(g[0] * K), gy = round(g[1] * K), ox = gx - AX, oy = gy - AY, d = s.d;
      LAST.push({ x: gx, y: gy, job: c.job });
      for (var k = -3; k <= 2; k++) { var qx = gx + k, qy = gy + 1; if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue; var q = qy * W + qx; if (dep(qx, qy) <= d) b.d[q] = X.shift(b.d[q], 1); }
      for (var j = 0; j < CHh; j++) { var ty = oy + j; if (ty < 0 || ty >= H) continue;
        for (var i = 0; i < CW; i++) { var col = pix.d[j * CW + i]; if (!col) continue; var tx = ox + (s.flip ? CW - 1 - i : i); if (tx < 0 || tx >= W) continue;
          var qq = ty * W + tx; if (dep(tx, ty) > d) continue; b.d[qq] = col; } }
    });
  }

  /* ---------- atelier sheets ---------- */
  var ALLT = { axe: 2, pickaxe: 2, hammer: 2, hoe: 1, mining: 2, military: 0, armor: 0 };
  function workMode(job) { var w = JOB[job].work; return w === 'idle' ? 'idle' : w === 'guard' ? 'guard' : 'work'; }
  function strip(job, seed, o) {
    var F = [['idle', 0], ['idle', 1], ['walk', 0], ['walk', 1], ['walk', 2], ['walk', 3], [workMode(job), 0], [workMode(job), 1], ['walk', 0, 1], ['walk', 2, 1]];
    var p = new Pix(CW * F.length, CHh);
    F.forEach(function (q, i) { p.blit(compose(job, seed || 0, q[0], q[1], Object.assign({}, ALLT, o, { back: !!q[2] })), i * CW, 0); });
    return p;
  }
  function lineup(t, o) {
    var jobs = X.JOBS.filter(function (j) { return JOB[j]; }), cols = 9, cw = 30, chh = 34, p = new Pix(cols * cw + 4, Math.ceil(jobs.length / cols) * chh);
    jobs.forEach(function (job, i) {
      var gx = (i % cols) * cw + 15, gy = floor(i / cols) * chh + 31, m = workMode(job), f = floor((t + i * 97) / (m === 'work' ? 333 : 500));
      var pix = compose(job, 0, m, f, Object.assign({}, ALLT, o));
      for (var k = -3; k <= 2; k++) p.set(gx + k, gy + 1, R('dirt', 2));
      p.blit(pix, gx - AX, gy - AY);
    });
    return p;
  }
  /* Era 1 states: each cell is one composed citizen; f animates the work / walk cycles */
  var STATES = [
    ['soldier', 'sit', { wound: true }, 'wounded'], ['soldier', 'sit', { wound: true, armor: 1 }, 'wounded, leather'],
    ['farmer', 'idle', { wx: 'w' }, 'winter coat + fur hat'], ['banker', 'walk', { wx: 'w' }, 'winter, robe'], ['lumberjack', 'work', { wx: 'r' }, 'rain hood'],
    ['soldier', 'walk', { tool: 'tool_banner', banner: 'indigo' }, 'banner (raid column)'], ['raider', 'walk', {}, 'raider + torch'], ['raider', 'work', {}, 'raider at the gate'],
    ['soldier', 'guard', { military: 1 }, 'bow (military 1)'], ['soldier', 'guard', { military: 1, armor: 1 }, 'leather (armor 1)'], ['soldier', 'guard', { armor: 2 }, 'plate (armor 2)'],
    ['soldier', 'guard', { merc: true }, 'mercenary'], ['craftsman', 'walk', { carry: 'Plywood' }, 'carries Plywood'], ['craftsman', 'walk', { carry: 'Brick' }, 'carries Brick'],
    ['craftsman', 'walk', { carry: 'Wrought_Iron' }, 'carries Wrought Iron'], ['craftsman', 'walk', { carry: 'Sheet_Metal' }, 'carries Sheet Metal'],
    ['unemployed', 'idle', { famine: true }, 'famine'], ['protester', 'work', {}, 'protest placard'], ['scavenger', 'work', {}, 'scavenger'], ['craftsman', 'work', {}, 'builder at scaffold']
  ];
  function states(t) {
    var cols = 10, cw = 30, chh = 34, p = new Pix(cols * cw + 4, Math.ceil(STATES.length / cols) * chh);
    STATES.forEach(function (q, i) {
      var gx = (i % cols) * cw + 15, gy = floor(i / cols) * chh + 31, f = floor((t + i * 97) / (q[1] === 'walk' ? 125 : 333));
      var pix = compose(q[0], i, q[1], f, Object.assign({}, ALLT, q[2]));
      for (var k = -3; k <= 2; k++) p.set(gx + k, gy + 1, R('dirt', 2));
      p.blit(pix, gx - AX, gy - AY);
    });
    return p;
  }
  function heads() {
    var cell = 12, p = new Pix(20 * cell, 4 * cell + 2);
    function head(px, py, skin, hair, cut, hat, extra) {
      var c = new Pix(CW, CHh);
      var lay = function (n, m) { var d = P[n]; c.blit(X.sprite(n, m), OX + d.at[0], OY + d.at[1]); };
      lay('head_front', { SKIN: skin }); lay('hair_' + cut, { HAIR: hair, ACCENT: 'madder' });
      if (hat) lay(hat, hat === 'hat_helmet' ? { METAL: 'iron' } : null);
      if (extra) lay(extra, { ACCENT: 'madder', FOLIAGE: 'summer' });
      for (var y = 0; y < cell; y++) for (var x = 0; x < cell; x++) { var v = c.d[(OY + y) * CW + OX + 2 + x]; if (v) p.set(px + x, py + y, v); }
    }
    SKINS.forEach(function (sk, si) { CUTS.forEach(function (cu, ci) { HAIRS.forEach(function (h, hi) { head((ci * 5 + hi) * cell, si * cell, sk, h, cu); }); }); });
    ['hat_straw', 'hat_scarf', 'hat_beanie', 'hat_miner_lamp', 'hat_hood', 'hat_scholar', 'hat_top', 'hat_helmet', 'hat_fur', 'fl_rain_hood'].forEach(function (h, i) { head(i * cell, 3 * cell + 2, SKINS[i % 3], HAIRS[(i + 1) % 5], 'short', h); });
    head(10 * cell, 3 * cell + 2, 'skin_tan', 'hair_black', 'long', null, 'fl_headband');
    head(11 * cell, 3 * cell + 2, 'skin_fair', 'hair_auburn', 'braid', null, 'fl_flower_hair');
    head(12 * cell, 3 * cell + 2, 'skin_deep', 'hair_silver', 'short', null, 'fl_bandage_head');
    head(13 * cell, 3 * cell + 2, 'skin_pale', 'hair_flax', 'long', null);
    return p;
  }
  function samples() {
    var out = [];
    X.JOBS.forEach(function (j) { if (JOB[j]) out.push({ label: 'citizen ' + j, pix: strip(j, 0, { axe: 2, mining: 3, pickaxe: 3 }) }); });
    out.push({ label: 'citizen states', pix: states(0) }, { label: 'citizen states f1', pix: states(333) }, { label: 'heads', pix: heads() });
    return out;
  }
  var baseSamples = VL.samples;
  VL.samples = function () { return (baseSamples ? baseSamples() : []).concat(samples()); };

  SK.citizens = { update: update, draw: draw, compose: compose, strip: strip, lineup: lineup, states: states, STATES: STATES, heads: heads, look: look, JOB: JOB, ARCH: ARCH, wN: wN, metals: metals,
    GOV_COL: GOV_COL, list: function () { return ST.list; }, last: function () { return LAST; } };
  }
})(window);
