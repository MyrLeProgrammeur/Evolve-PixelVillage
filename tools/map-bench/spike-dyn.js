/* J0 spike: dynamic layer drawn every frame over the chunks (L0/L1 only): 100 citizens (kit compositor, drawn at half
   art pixel like the village), 50 vehicles, 300 particles, waves (ocean variant B), re-occlusion by the buildings in
   front. (The legacy village mega-sprite is gone: the capital will be drawn natively on the map.) */
(function (G) {
  'use strict';
  var PVB = G.PVB = G.PVB || {};
  var now = function () { return performance.now(); };

  PVB.Dyn = function (world, baker, opt) {
    opt = opt || {};
    var C = world.C, K = G.SpriteKit._, SK = G.SK, W = C.W;
    var nCit = opt.citizens == null ? 100 : opt.citizens, nVeh = opt.vehicles == null ? 50 : opt.vehicles, nPar = opt.particles == null ? 300 : opt.particles;
    var waves = opt.waves ? 80 : 0, rnd = K.mulberry32(42);
    var JOBS = ['farmer', 'lumberjack', 'miner', 'unemployed', 'quarry_worker'];

    // citizen frames: 5 jobs x 4 walk frames, as canvases (32 x 32 cells, half art pixel)
    var CIT = [];
    JOBS.forEach(function (j, ji) {
      for (var f = 0; f < 4; f++) {
        var p = null;
        try { p = SK.citizens.compose(j, ji, 'walk', f, {}); } catch (e) { p = null; }
        if (!p) { p = new K.Pix(32, 32); for (var y = 8; y < 31; y++) for (var x = 12; x < 20; x++) p.d[y * 32 + x] = K.R('madder', 2); }
        CIT.push(p.canvas());
      }
    });
    function vehPix(ramp) {
      var p = new K.Pix(16, 10);
      for (var y = 2; y < 9; y++) for (var x = 1; x < 15; x++) p.d[y * 16 + x] = K.R(ramp, y < 4 ? 1 : y > 7 ? 4 : 2);
      p.d[9 * 16 + 3] = p.d[9 * 16 + 12] = K.R('soot', 3);
      return p.canvas();
    }
    var VEH = [vehPix('madder'), vehPix('indigo'), vehPix('oak'), vehPix('steel')];
    var PCOL = ['#fbfbf7', '#e2c487', '#bfcbd4', '#ec8d3c'];
    var WAVE = (function () { var p = new K.Pix(6, 2); for (var x = 1; x < 5; x++) p.d[x] = K.R('water', 0); p.d[6] = p.d[11] = K.R('water', 1); return p.canvas(); })();

    var A = []; // actors: {t: type, x, y (world L0 px), vx, vy, s: sprite index, ph}
    function spawn(a, cam, Wp, Hp, edge) {
      var hw = Wp / (2 * cam.z), hh = Hp / (2 * cam.z);
      a.x = cam.x + (rnd() * 2 - 1) * hw; a.y = cam.y + (rnd() * 2 - 1) * hh;
      var sp = a.t === 1 ? 30 : a.t === 0 ? 10 : 20, ang = rnd() * 6.283;
      a.vx = Math.cos(ang) * sp; a.vy = Math.sin(ang) * sp * 0.5; a.ph = rnd() * 1000; a.life = 2 + rnd() * 4;
    }
    for (var i = 0; i < nCit; i++) A.push({ t: 0, s: (i % JOBS.length) * 4 });
    for (i = 0; i < nVeh; i++) A.push({ t: 1, s: i % VEH.length });
    for (i = 0; i < nPar; i++) A.push({ t: 2, s: i % PCOL.length });
    for (i = 0; i < waves; i++) A.push({ t: 3, s: 0 });
    var started = false, stats = { occl: 0, dynMs: 0 };

    function update(cam, Wp, Hp, dt) {
      if (!started) { A.forEach(function (a) { spawn(a, cam, Wp, Hp); }); started = true; }
      var hw = Wp / (2 * cam.z) * 1.2, hh = Hp / (2 * cam.z) * 1.2, s = dt / 1000;
      for (var k = 0; k < A.length; k++) {
        var a = A[k]; a.x += a.vx * s; a.y += a.vy * s; a.life -= s;
        var dx = a.x - cam.x; dx -= Math.round(dx / C.BW) * C.BW;
        if (Math.abs(dx) > hw || Math.abs(a.y - cam.y) > hh || (a.t === 2 && a.life < 0)) spawn(a, cam, Wp, Hp);
      }
    }

    // buildings standing in front of an actor (higher r, close on screen) are drawn again over it
    function occlude(ctx, a, sx, sy, sw, sh, cam, ox, oy, L) {
      var t = C.fromScreen(((a.x % C.BW) + C.BW) % C.BW, a.y); if (!t) return;
      var cand = [[0, 1], [1, 1], [1, 2], [0, 2], [1, 3]], f = 1 << L, z = cam.z;
      for (var c = 0; c < cand.length; c++) {
        var i = C.idx(t.q + cand[c][0], t.r + cand[c][1]); if (i < 0) continue;
        var s = world.bld[i]; if (s < 0) continue;
        var S = baker.SPR[L][s], p = C.toScreen(i % W, (i / W) | 0), wx = p[0];
        var d = wx - ax(a, cam); wx -= Math.round(d / C.BW) * C.BW;
        var bx = ox + (wx - S.ox * f) * z, by = oy + (p[1] - S.oy * f) * z, bw = S.pix.w * f * z, bh = S.pix.h * f * z;
        if (bx > sx + sw || bx + bw < sx || by > sy + sh || by + bh < sy) continue;
        ctx.drawImage(baker.sprCanvas(L, s), Math.round(bx), Math.round(by), Math.round(bw), Math.round(bh)); stats.occl++;
      }
    }

    function ax(a, cam) { return a.x - Math.round((a.x - cam.x) / C.BW) * C.BW; }
    function draw(ctx, cam, Wp, Hp, t) {
      var t0 = now(), z = cam.z, L = z > 1 ? 0 : 1, ox = Wp / 2 - cam.x * z, oy = Hp / 2 - cam.y * z;
      for (var pc = 0; pc < PCOL.length; pc++) {
        ctx.fillStyle = PCOL[pc];
        for (var k = 0; k < A.length; k++) {
          var a = A[k]; if (a.t !== 2 || a.s !== pc) continue;
          ctx.fillRect(Math.round(ox + ax(a, cam) * z), Math.round(oy + a.y * z), Math.max(1, Math.round(z)), Math.max(1, Math.round(z)));
        }
      }
      for (k = 0; k < A.length; k++) {
        a = A[k]; if (a.t === 2) continue;
        var cv, w, h, sx, sy, x = ax(a, cam);
        if (a.t === 0) { cv = CIT[a.s + (((t + a.ph) / 150) & 3)]; w = 16 * z; h = 16 * z; sx = ox + x * z - w / 2; sy = oy + a.y * z - h + z; }
        else if (a.t === 1) { cv = VEH[a.s]; w = 16 * z; h = 10 * z; sx = ox + x * z - w / 2; sy = oy + a.y * z - h; }
        else { cv = WAVE; w = 6 * z; h = 2 * z; sx = ox + x * z; sy = oy + a.y * z; }
        if (sx > Wp || sy > Hp || sx + w < 0 || sy + h < 0) continue;
        ctx.drawImage(cv, Math.round(sx), Math.round(sy), Math.round(w), Math.round(h));
        if (a.t < 2) occlude(ctx, a, sx, sy, w, h, cam, ox, oy, L);
      }
      stats.dynMs += now() - t0;
    }
    return { update: update, draw: draw, stats: stats, reset: function () { stats.occl = 0; stats.dynMs = 0; } };
  };
})(typeof window !== 'undefined' ? window : global);
