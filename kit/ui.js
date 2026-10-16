/* Evolve village sprite kit — Batch 7: interface renderer (bitmap font, 9-slice panels and buttons with code
   states, progress bar, checkbox, slider, close, cursor), effects (reward chest, idea bulb, streak flames),
   and the optional night filter. Everything is drawn from palette ramps into Pix buffers. */
(function (G) {
  'use strict';
  var SK = G.SK = G.SK || {};
  SK._ext = (SK._ext || []).filter(function (e) { return e.id !== 'ui'; });
  SK._ext.push({ id: 'ui', fn: reg });
  if (SK._runExt) SK._runExt();
  function reg() {
  if (!SK.village || !SK.village.vil || !G.SpriteKit || !SK.PARTS || !SK.PARTS.b7 || !SK.world) return false;
  var X = G.SpriteKit._, R = X.R, Pix = X.Pix, P = SK.PIECES, floor = Math.floor, round = Math.round, PI = Math.PI;

  /* ---------- font ---------- */
  var F = P.ui_font, IDX = {};
  F.glyphs.split('').forEach(function (c, i) { IDX[c] = i; });
  function gw(ch) { return F.widths[ch] != null ? F.widths[ch] : F.widths['?']; }
  function measure(str, o) {
    var best = 0; String(str).split('\n').forEach(function (line) { var w = 0; for (var i = 0; i < line.length; i++) w += gw(IDX[line[i]] != null ? line[i] : '?') + 1; best = Math.max(best, w - 1 + (o && o.bold ? 1 : 0)); });
    return best;
  }
  function text(p, str, x, y, col, o) {
    o = o || {}; col = col == null ? R('soot', 3) : col;
    var cx = x, cy = y, CWd = F.cell[0], CHd = F.cell[1];
    String(str).split('').forEach(function (ch) {
      if (ch === '\n') { cx = x; cy += CHd + 1; return; }
      if (IDX[ch] == null) ch = '?';
      var i = IDX[ch], sx = (i % 16) * CWd, sy = floor(i / 16) * CHd, w = gw(ch);
      for (var j = 0; j < CHd; j++) { var row = F.rows[sy + j]; for (var k = 0; k < w; k++) if (row[sx + k] === '1') {
        if (o.shadow != null) p.set(cx + k, cy + j + 1, o.shadow);
        p.set(cx + k, cy + j, col); if (o.bold) p.set(cx + k + 1, cy + j, col); } }
      cx += w + 1 + (o.bold ? 1 : 0);
    });
    return cx - x;
  }

  /* ---------- 9-slice ---------- */
  function nine(p, name, x, y, w, h, map, opt) {
    var d = P[name], s = X.sprite(name, map, opt), k = d.slice, W = d.w, H = d.h, mw = W - 2 * k, mh = H - 2 * k;
    function src(u, v) { return s.d[v * W + u]; }
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      var u = i < k ? i : i >= w - k ? W - (w - i) : k + ((i - k) % mw), v = j < k ? j : j >= h - k ? H - (h - j) : k + ((j - k) % mh), c = src(u, v);
      if (c) p.set(x + i, y + j, c);
    }
  }
  function panel(w, h, title, map) {
    var p = new Pix(w, h); nine(p, 'ui_panel', 0, 0, w, h, map);
    if (title) text(p, title, 9, 9, R('soot', 3), { bold: true });
    return p;
  }
  /* states: normal | hover (one tone lighter) | pressed (1 px down, one tone darker) | disabled (ashen, desaturated) */
  function button(w, h, label, state, map) {
    map = map || {}; var p = new Pix(w, h + 1), dis = state === 'disabled', dy = state === 'pressed' ? 1 : 0;
    var m = dis ? { MAIN: 'ashen', ACCENT: 'ashen' } : map, sh = state === 'hover' ? -1 : state === 'pressed' ? 1 : 0;
    if (state !== 'pressed') for (var i = 3; i < w - 3; i++) p.set(i, h, R(dis ? 'ashen' : (map.MAIN || 'rust'), 4));
    nine(p, 'ui_button', 0, dy, w, h, m, sh ? { shade: sh } : null);
    if (label) { var tw = measure(label), tx = floor((w - tw) / 2), ty = floor((h - 7) / 2) + dy;
      text(p, label, tx, ty, dis ? R('ashen', 2) : R('cream', 0), { shadow: dis ? null : R(map.MAIN || 'rust', 4) }); }
    return p;
  }
  function progress(w, frac, ramp) {
    var p = new Pix(w, 7), f = Math.max(0, Math.min(1, frac)), fill = round((w - 4) * f); ramp = ramp || 'sage';
    for (var x = 0; x < w; x++) for (var y = 0; y < 7; y++) {
      var edge = y === 0 || y === 6 || x === 0 || x === w - 1; if ((x === 0 || x === w - 1) && (y === 0 || y === 6)) continue;
      p.set(x, y, edge ? R('walnut', y === 6 || x === w - 1 ? 3 : 2) : R('cream', 2));
    }
    for (x = 2; x < 2 + fill; x++) for (y = 2; y < 5; y++) p.set(x, y, R(ramp, y === 2 ? 0 : y === 3 ? 1 : 2));
    for (x = 2; x < 2 + fill; x += 4) p.set(x, 2, R('cream', 0));
    return p;
  }
  function checkbox(on) {
    var p = new Pix(9, 9);
    for (var y = 0; y < 9; y++) for (var x = 0; x < 9; x++) { var e = x === 0 || y === 0 || x === 8 || y === 8; if (e && (x === 0 || x === 8) && (y === 0 || y === 8)) continue; p.set(x, y, e ? R('walnut', x === 8 || y === 8 ? 3 : 2) : R('cream', 1)); }
    if (on) [[2, 4], [3, 5], [4, 6], [5, 5], [6, 4], [6, 3], [7, 2]].forEach(function (q) { p.set(q[0], q[1], R('sage', 3)); p.set(q[0], q[1] - 1, R('sage', 2)); });
    return p;
  }
  function slider(w, frac) {
    var p = new Pix(w, 9), k = 3 + round((w - 7) * Math.max(0, Math.min(1, frac)));
    for (var x = 1; x < w - 1; x++) { p.set(x, 4, R('walnut', 2)); p.set(x, 5, R('walnut', 3)); if (x < k) p.set(x, 4, R('saffron', 1)); }
    for (var y = 0; y < 9; y++) for (x = -2; x <= 2; x++) { if (Math.abs(x) === 2 && (y === 0 || y === 8)) continue; p.set(k + x, y, x < 0 ? R('cream', 0) : x === 0 ? R('cream', 1) : R('cream', 3)); }
    return p;
  }
  function closeX() {
    var p = new Pix(9, 9);
    for (var y = 0; y < 9; y++) for (var x = 0; x < 9; x++) { var e = Math.hypot(x - 4, y - 4); if (e < 4.6) p.set(x, y, R('madder', e > 3.6 ? 3 : 1)); }
    for (var i = 2; i <= 6; i++) { p.set(i, i, R('cream', 0)); p.set(8 - i, i, R('cream', 0)); }
    return p;
  }
  function cursor() {
    var rows = ['1.......', '11......', '121.....', '1221....', '12221...', '122221..', '1222221.', '12222221', '122211..', '11.121..', '1..121..', '....11..'];
    var p = new Pix(8, 12); rows.forEach(function (r, y) { for (var x = 0; x < 8; x++) if (r[x] !== '.') p.set(x, y, r[x] === '1' ? R('soot', 4) : R('cream', 0)); });
    return p;
  }

  /* ---------- effects ---------- */
  /* streak flame: 4 frames each; small 7x9, big 11x15; built from layered teardrops of the ember ramp */
  var FL = new Map();
  function flame(size, f) {
    f = ((f % 4) + 4) % 4; var key = size + f; if (FL.has(key)) return FL.get(key);
    var big = size === 'big', W = big ? 11 : 7, H = big ? 15 : 9, p = new Pix(W, H), cx = (W - 1) / 2;
    var sway = [0, 1, 0, -1][f], lean = [0, 0.6, 0.2, -0.5][f];
    [[1, 1.0], [2, 0.72], [1, 0.46], [0, 0.24]].forEach(function (L, li) {
      var rad = (W / 2) * L[1], top = H * (1 - L[1] * (li === 0 ? 1 : 0.92)) + (li ? 1 : 0);
      for (var y = floor(top); y < H; y++) { var t = (y - top) / (H - top), wid = rad * Math.sqrt(Math.max(0, Math.sin(Math.min(1, t * 1.15) * PI * 0.5))) * (t > 0.85 ? 1 - (t - 0.85) * 2.2 : 1);
        var off = cx + lean * (1 - t) * (li + 1) + sway * (1 - t);
        for (var x = 0; x < W; x++) if (Math.abs(x - off) <= wid) p.set(x, y, li === 0 ? R('ember', 4) : li === 1 ? R('ember', 2) : li === 2 ? R('ember', 1) : R('ember', 0)); }
    });
    if (f === 1) p.set(round(cx) + 2, 0, R('ember', 2)); if (f === 3 && big) p.set(round(cx) - 3, 1, R('ember', 1));
    FL.set(key, p); return p;
  }
  /* reward chest timeline (ms): 0-600 appear with sparkles, 600-1200 wobble, 1200-1500 lid lifts, then glow + stars until 7000 */
  function chest(a, scaleUp) {
    var p = new Pix(40, 40), cl = X.sprite('fx_chest_closed'), lid = X.sprite('fx_chest_lid'), bx = 12, by = 24;
    if (a < 0) return p;
    var wob = a > 600 && a < 1200 ? [0, 1, 0, -1][floor(a / 90) % 4] : 0;
    if (a < 600 && floor(a / 100) % 2 === 1) return sparkle(p, 20, 30, a / 600);
    p.blit(cl, bx + wob, by - 14 + 0);
    if (a >= 1200) {
      var lift = Math.min(6, round((a - 1200) / 50)), ink = X.pal().ink;
      for (var y = 0; y < 6; y++) for (var x = 1; x < 15; x++) p.set(bx + x, by - 14 + y, y < 2 ? R('gold', 1 + (x % 3 === 0 ? 0 : 1)) : (y < 4 ? R('ember', 1) : ink));
      p.set(bx + 4, by - 14, X.pal().spark); p.set(bx + 10, by - 13, X.pal().spark);
      p.blit(lid, bx, by - 14 - lift - 1);
      if (lift >= 6) {
        var ph = floor((a - 1500) / 125);
        for (var k = 0; k < 6; k++) { var an = (k / 6) * PI * 2 + ph * 0.35, r = 5 + ((ph + k * 2) % 6) * 2, sx = round(20 + Math.cos(an) * r * 1.2), sy = round(by - 16 - Math.abs(Math.sin(an)) * r);
          star(p, sx, sy, (ph + k) % 3 === 0 ? X.pal().spark : R('gold', 0)); }
        for (var q = 0; q < 3; q++) { var ry = by - 16 - q * 3 - (ph % 3); p.set(bx + 6 + q * 2, ry, R('ember', 0)); }
      }
    }
    return p;
  }
  function star(p, x, y, c) { p.set(x, y, c); p.set(x - 1, y, c); p.set(x + 1, y, c); p.set(x, y - 1, c); p.set(x, y + 1, c); }
  function sparkle(p, x, y, t) { for (var k = 0; k < 6; k++) { var an = k / 6 * PI * 2, r = 2 + t * 10; star(p, round(x + Math.cos(an) * r), round(y + Math.sin(an) * r * 0.7), k % 2 ? X.pal().spark : R('gold', 0)); } return p; }
  function bulb(t) {
    var p = new Pix(20, 22), b = X.sprite('fx_bulb'); p.blit(b, 6, 8);
    var on = floor(t / 250) % 2;
    [[10, 2], [3, 6], [17, 6], [1, 12], [19, 12]].forEach(function (q, i) { if ((i + on) % 2) return; var dx = Math.sign(q[0] - 10), dy = q[1] < 8 ? -1 : 0;
      p.set(q[0], q[1], R('ember', 0)); p.set(q[0] - dx, q[1] - dy, R('ember', 1)); });
    return p;
  }

  /* ---------- reward chest at the plaza (triggered by the host code: SpriteKit.reward()) ---------- */
  var REW = null;
  function reward(t) { REW = { t0: t }; }
  function actors(B, ctx, k) {
    if (!REW) return;
    var a = ctx.t - REW.t0; if (a > 9000) { REW = null; return; }
    if (a > 7000 && floor(a / 120) % 2) return;
    var g = X.worldPt(12.4, 12.4), gx = round(g[0] * k), gy = round(g[1] * k), s = chest(a);
    for (var x = -9; x <= 9; x++) { var q = (gy + 1) * B.w + gx + x; if (q > 0 && q < B.d.length && Math.abs(x) < 9 - (x * x > 49 ? 1 : 0)) B.d[q] = X.shift(B.d[q], 1); }
    B.blit(s, gx - 20, gy - 24 - 1);
  }

  /* ---------- night filter (optional, off by default): world darkens two tones, light sources keep their tones ---------- */
  var KEEP = { ember: 1, gold: 1 }, GROUND = { spring: 1, summer: 1, autumn: 1, frost: 1, dry: 1, conifer: 1, lush: 1, ashleaf: 1, scorch: 1, dirt: 1, sand: 1, basalt: 1, ashen: 1, murk: 1, water: 1, snow: 1, haze: 1, river: 1 };
  var NL = new Map(), PL = new Map(), MASK = null, MKEY = '';
  function nightC(c, pool) {
    var L = pool ? PL : NL, h = L.get(c); if (h !== undefined) return h;
    var e = X.pal().rev.get(c), o = c;
    if (e && !KEEP[e[0]]) {
      if (e[0] === 'sky') o = R('indigo', 4);
      else if (GROUND[e[0]]) o = pool ? R(e[0], Math.min(4, e[1] + 2)) : R(e[1] <= 1 ? 'indigo' : 'slate', Math.min(4, 3 + (e[1] > 2 ? 1 : 0)));
      else o = R(e[0], Math.min(4, e[1] + (pool ? 2 : 3)));
    }
    L.set(c, o); return o;
  }
  function night(B, k) {
    var lights = SK.world.lights ? SK.world.lights() : [], key = JSON.stringify(lights), WW = X.WW, WH = X.WH;
    if (key !== MKEY) { MKEY = key; MASK = new Uint8Array(WW * WH);
      lights.forEach(function (l) { var r = l[2] || 16; for (var y = -r; y <= r; y++) for (var x = -r * 2; x <= r * 2; x++) { if ((x * x) / (4 * r * r) + (y * y) / (r * r) > 1) continue; var px = l[0] + x, py = l[1] + y; if (px >= 0 && py >= 0 && px < WW && py < WH) MASK[py * WW + px] = 1; } }); }
    var d = B.d, W = B.w, lc = -1, lp = -1, lo = 0;
    for (var y = 0; y < B.h; y++) { var my = ((y / k) | 0) * WW;
      for (var x = 0; x < W; x++) { var q = y * W + x, c = d[q]; if (!c) continue; var pool = MASK[my + ((x / k) | 0)];
        if (c === lc && pool === lp) { d[q] = lo; continue; } lc = c; lp = pool; lo = nightC(c, pool); d[q] = lo; } }
  }

  /* ---------- atelier sheets ---------- */
  function fontSheet() {
    var p = new Pix(282, 76), ink = R('soot', 4), y = 2;
    text(p, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 2, y, ink); y += 12;
    text(p, 'abcdefghijklmnopqrstuvwxyz', 2, y, ink); y += 12;
    text(p, '0123456789 .,:;!?\'"-+=/()%#&*@_[]', 2, y, ink); y += 12;
    text(p, '\u00e9\u00e8\u00ea\u00eb\u00e0\u00e2\u00ee\u00ef\u00f4\u00f9\u00fb\u00fc\u00e7\u0153 \u00c9\u00c8\u00c0\u00c7 \u20ac \u00b0 \u00ab \u00bb', 2, y, ink); y += 14;
    text(p, 'Pack my box with five dozen liquor jugs.', 2, y, R('walnut', 3)); y += 11;
    text(p, 'The quick brown fox jumps.', 2, y, R('walnut', 3)); text(p, 'SALE: 12 \u20ac', 120, y, R('madder', 2), { bold: true });
    return p;
  }
  function uiSheet(t) {
    var p = new Pix(328, 160);
    p.blit(panel(96, 56, 'Village', null), 2, 2);
    text(p, 'Wood  48/200', 11, 24, R('walnut', 3)); p.blit(progress(76, 0.24 + 0.5 * (0.5 + 0.5 * Math.sin(t / 900)), 'sage'), 11, 36);
    p.blit(panel(64, 40, null, { MAIN: 'reed', ACCENT: 'lime', WOOD: 'indigo' }), 104, 2);
    text(p, 'Calm', 116, 14, R('soot', 3)); p.blit(checkbox(true), 116, 26); p.blit(checkbox(false), 128, 26); p.blit(closeX(), 150, 8);
    p.blit(panel(32, 32, null, { MAIN: 'hide', ACCENT: 'cream', WOOD: 'teal' }), 172, 2);
    var cyc = floor(t / 700) % 4, st = ['normal', 'hover', 'pressed', 'disabled'];
    st.forEach(function (s, i) { p.blit(button(54, 16, i === 3 ? 'No' : 'Yes', s), 2 + i * 58, 64); });
    p.blit(button(54, 16, 'Live', st[cyc], { MAIN: 'teal', ACCENT: 'cream' }), 236, 64);
    p.blit(slider(70, 0.5 + 0.45 * Math.sin(t / 1100)), 210, 30); p.blit(cursor(), 288, 26 + round(Math.sin(t / 400)));
    var tabs = [['tab_gear'], ['tab_card'], ['ic_house'], ['fx_bulb'], ['unit_crate'], ['ic_coin'], ['tool_shield'], ['cart_box']];
    tabs.forEach(function (q, i) { var x = 2 + i * 22, s = X.sprite(q[0]); p.blit(button(20, 20, null, i === 1 ? 'pressed' : 'normal', { MAIN: 'hide', ACCENT: 'cream' }), x, 86);
      p.blit(s, x + 10 - (s.w >> 1), 86 + 10 - (s.h >> 1) + (i === 1 ? 1 : 0)); });
    var f = floor(t / 125);
    for (var i = 0; i < 4; i++) { p.blit(flame('small', i), 2 + i * 10, 118); p.blit(flame('big', i), 46 + i * 14, 112); }
    p.blit(flame('small', f), 108, 118); p.blit(flame('big', f), 120, 112);
    [0, 700, 1250, 1400, 2000].forEach(function (a, i) { p.blit(chest(a), 138 + i * 34, 128); });
    var loop = t % 4500; p.blit(chest(loop), 300, 128);
    p.blit(bulb(t), 300, 92);
    return p;
  }
  function samples() { return [{ label: 'interface sheet', pix: uiSheet(0) }, { label: 'font sheet', pix: fontSheet() }]; }
  var baseS = SK.village.samples;
  SK.village.samples = function () { return (baseS ? baseS() : []).concat(samples()); };

  SK.ui = { text: text, measure: measure, nine: nine, panel: panel, button: button, progress: progress, checkbox: checkbox, slider: slider, closeX: closeX, cursor: cursor,
    flame: flame, chest: chest, bulb: bulb, reward: reward, actors: actors, night: night, fontSheet: fontSheet, uiSheet: uiSheet };
  }
})(window);
