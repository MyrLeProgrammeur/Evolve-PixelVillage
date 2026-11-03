/* J0 spike: compositor + camera. Canvas 2D: draws cached chunks with drawImage, picks the level from the zoom,
   cross-fades levels during a pinch, snaps back to a crisp rung, inertia, pinch, wheel, double tap.
   Camera: x, y = world centre in L0 art pixels; z = device pixels per L0 art pixel. Level L for z in (2^-L, 2^(1-L)]. */
(function (G) {
  'use strict';
  var PVB = G.PVB = G.PVB || {};
  var now = function () { return performance.now(); };
  var RUNGS = [8, 6, 4, 2, 1, 0.5, 0.25, 0.125, 0.0625, 0.03125, 0.015625];
  var ZMIN = 0.015625, ZMAX = 8, LMAX = 6;

  function levelOf(z) { var L = Math.floor(Math.log2(2 / z) + 1e-9); return L < 0 ? 0 : L > LMAX ? LMAX : L; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  PVB.Renderer = function (canvas, world, baker, opt) {
    opt = opt || {};
    var C = world.C, K = G.SpriteKit._;
    var ctx = canvas.getContext('2d', { alpha: false });
    var cam = { x: C.BW / 2, y: C.BH / 2, z: 2 }, last = { x: NaN, y: NaN, z: NaN, w: 0, h: 0 };
    var dprMode = opt.dpr || 'full', oceanA = (opt.ocean || 'A') === 'A', fade = opt.fade !== false;
    var dirty = true, dyn = null, lastDyn = 0, frames = 0, drawn = 0, anim = null, input = !opt.noInput;
    var stats = { draws: 0, missing: 0, js: 0 };

    // ocean pattern (variant A): one water tile with a highlight, repeated
    var pat = null;
    function oceanPattern() {
      if (pat) return pat;
      var p = new K.Pix(32, 16), a = world.ocean[0], b = world.ocean[1], c = world.ocean[2];
      for (var y = 0; y < 16; y++) for (var x = 0; x < 32; x++) p.d[y * 32 + x] = ((x * 3 + y * 7) % 23 === 0) ? b : ((x + 2 * y) % 31 === 0 ? c : a);
      pat = ctx.createPattern(p.canvas(), 'repeat');
      return pat;
    }

    function resize() {
      var d = G.devicePixelRatio || 1;
      if (dprMode === '2') d = Math.min(d, 2); else if (dprMode === '1') d = 1;
      var w = Math.round(canvas.clientWidth * d), h = Math.round(canvas.clientHeight * d);
      if (w && h && (canvas.width !== w || canvas.height !== h)) { canvas.width = w; canvas.height = h; dirty = true; }
      return d;
    }

    function clampCam() {
      cam.z = clamp(cam.z, ZMIN, ZMAX);
      cam.x = ((cam.x % C.BW) + C.BW) % C.BW;
      cam.y = clamp(cam.y, 0, C.BH);
    }

    // draws level L over the viewport; alpha < 1 for the finer level of a cross-fade
    function drawLevel(L, alpha, W, H, prioBase) {
      var g = C.GRIDS[L], z = cam.z, wx0 = cam.x - W / (2 * z), wy0 = cam.y - H / (2 * z);
      var cx0 = Math.floor(wx0 / g.w), cx1 = Math.floor((wx0 + W / z - 1e-6) / g.w);
      var cy0 = Math.max(0, Math.floor(wy0 / g.h)), cy1 = Math.min(g.ny - 1, Math.floor((wy0 + H / z - 1e-6) / g.h));
      var ox = -wx0 * z, oy = -wy0 * z, gw = g.w * z, gh = g.h * z;
      ctx.globalAlpha = alpha;
      for (var cy = cy0; cy <= cy1; cy++) for (var cx = cx0; cx <= cx1; cx++) {
        var mx = ((cx % g.nx) + g.nx) % g.nx, key = L + '|' + mx + '|' + cy;
        baker.pinned.add(key);
        var x0 = Math.round(ox + cx * gw), x1 = Math.round(ox + (cx + 1) * gw), y0 = Math.round(oy + cy * gh), y1 = Math.round(oy + cy * gh + C.chunkRect(mx, cy, L).h * z);
        var c = baker.get(L, mx, cy);
        if (!c || c.dirty) {
          var dcx = (cx + 0.5) * g.w - cam.x, dcy = (cy + 0.5) * g.h - cam.y;
          baker.request(L, mx, cy, prioBase + Math.abs(dcx) + Math.abs(dcy));
        }
        if (c) { ctx.drawImage(c.cv, x0, y0, x1 - x0, y1 - y0); stats.draws++; continue; }
        stats.missing++;
        // fallback: the parent chunk of a coarser level, cropped and upscaled
        for (var P = L + 1; P < C.LODS; P++) {
          var gp = C.GRIDS[P], pcx = Math.floor(mx * g.w / gp.w), pcy = Math.floor(cy * g.h / gp.h), pc = baker.get(P, pcx, pcy);
          if (!pc) continue;
          var sx = (mx * g.w - pcx * gp.w) / gp.f, sy = (cy * g.h - pcy * gp.h) / gp.f, sw = g.w / gp.f, sh = Math.min(g.h / gp.f, pc.cv.height - sy);
          if (sh > 0) { ctx.drawImage(pc.cv, sx, sy, sw, sh, x0, y0, x1 - x0, Math.round(sh * gp.f * z)); stats.draws++; }
          break;
        }
      }
      // prefetch one ring around the view at low priority, only while the cache has room (no bake/evict loop)
      if (baker.room(4 * g.pw * g.ph * 8)) for (cy = cy0 - 1; cy <= cy1 + 1; cy++) for (cx = cx0 - 1; cx <= cx1 + 1; cx++) {
        if (cy < 0 || cy >= g.ny || (cy >= cy0 && cy <= cy1 && cx >= cx0 && cx <= cx1)) continue;
        baker.request(L, ((cx % g.nx) + g.nx) % g.nx, cy, prioBase + 1e6);
      }
      ctx.globalAlpha = 1;
    }

    function draw(t) {
      var W = canvas.width, H = canvas.height, z = cam.z;
      baker.pinned.clear(); baker.beginWants();
      ctx.imageSmoothingEnabled = false;
      // background: band edges (poles) and, in variant A, the ocean pattern
      var wy0 = cam.y - H / (2 * z), top = Math.round(-wy0 * z), bot = Math.round((C.BH - wy0) * z);
      if (oceanA) {
        var p = oceanPattern(), m = new DOMMatrix([z, 0, 0, z, Math.round((-(cam.x - W / (2 * z))) * z), top]);
        p.setTransform(m); ctx.fillStyle = p;
      } else ctx.fillStyle = '#22314f';
      ctx.fillRect(0, Math.max(0, top), W, Math.min(H, bot) - Math.max(0, top));
      ctx.fillStyle = '#e3e9ec';
      if (top > 0) ctx.fillRect(0, 0, W, top);
      if (bot < H) ctx.fillRect(0, bot, W, H - bot);
      // level L covers z in (2^-L, 2^(1-L)]; in its lowest quarter octave the coarser level is drawn under it and L fades in
      var L = levelOf(z), frac = Math.log2(z / Math.pow(2, -L));
      if (fade && L < LMAX && frac < 0.25) { drawLevel(L + 1, 1, W, H, 5e5); drawLevel(L, frac / 0.25, W, H, 0); }
      else drawLevel(L, 1, W, H, 0);
      if (dyn && z > 0.5) dyn.draw(ctx, cam, W, H, t);
      if (opt.overlay) opt.overlay(ctx, cam, W, H, t);
    }

    // Called once per animation frame. Draws only when something changed (camera, chunk baked, actors tick at 8 Hz).
    function frame(t) {
      var t0 = now();
      resize(); clampCam();
      if (anim && typeof anim === 'object') stepAnim(t);
      var moved = cam.x !== last.x || cam.y !== last.y || cam.z !== last.z || canvas.width !== last.w || canvas.height !== last.h;
      var dynTick = dyn && cam.z > 0.5 && t - lastDyn >= (moved ? 0 : 125);
      var drew = false; stats.dynMs = 0;
      if (moved || dirty || dynTick) {
        stats.draws = 0; stats.missing = 0;
        if (dyn && cam.z > 0.5) { dyn.update(cam, canvas.width, canvas.height, lastDyn ? Math.min(100, t - lastDyn) : 16); lastDyn = t; }
        var d0 = dyn ? dyn.stats.dynMs : 0;
        draw(t); drawn++; drew = true;
        stats.dynMs = dyn ? dyn.stats.dynMs - d0 : 0;
        last.x = cam.x; last.y = cam.y; last.z = cam.z; last.w = canvas.width; last.h = canvas.height; dirty = false;
      }
      frames++;
      stats.js = now() - t0;
      return drew;
    }

    // --- camera animation: snap to the nearest rung, inertia ---
    var vel = null;
    function nearestRung(z) { var b = RUNGS[0], bd = Infinity; RUNGS.forEach(function (r) { var d = Math.abs(Math.log2(r / z)); if (d < bd) { bd = d; b = r; } }); return b; }
    function snap(px, py) { anim = { kind: 'snap', z0: cam.z, z1: nearestRung(cam.z), t0: null, px: px, py: py }; }
    function stepAnim(t) {
      if (anim.kind === 'inertia') {
        if (anim.t0 == null) anim.t0 = t;
        var dt = Math.min(50, t - (anim.lt || t)); anim.lt = t;
        cam.x -= anim.vx * dt / cam.z; cam.y -= anim.vy * dt / cam.z;
        var k = Math.pow(0.996, dt); anim.vx *= k; anim.vy *= k;
        if (Math.abs(anim.vx) + Math.abs(anim.vy) < 0.02) snap();
      } else if (anim.kind === 'snap') {
        if (anim.t0 == null) anim.t0 = t;
        var u = Math.min(1, (t - anim.t0) / 160), e = 1 - (1 - u) * (1 - u);
        zoomAt(Math.pow(2, Math.log2(anim.z0) + (Math.log2(anim.z1) - Math.log2(anim.z0)) * e), anim.px, anim.py);
        if (u >= 1) { cam.z = anim.z1; anim = 'settled'; dirty = true; }
      }
    }
    // zoom keeping the screen point (px, py) (device pixels) fixed
    function zoomAt(z, px, py) {
      z = clamp(z, ZMIN, ZMAX);
      if (px == null) { cam.z = z; return; }
      var W = canvas.width, H = canvas.height, wx = cam.x + (px - W / 2) / cam.z, wy = cam.y + (py - H / 2) / cam.z;
      cam.z = z; cam.x = wx - (px - W / 2) / z; cam.y = wy - (py - H / 2) / z;
    }

    // --- input ---
    if (input) {
      var pts = new Map(), pinch = null, lastTap = 0, hist = [];
      canvas.style.touchAction = 'none';
      var dpr = function () { return canvas.width / Math.max(1, canvas.clientWidth); };
      canvas.addEventListener('pointerdown', function (e) {
        canvas.setPointerCapture(e.pointerId); anim = null;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 2) { var a = Array.from(pts.values()); pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), z: cam.z }; }
        hist = [{ t: now(), x: e.clientX, y: e.clientY }];
        var tn = now();
        if (pts.size === 1 && tn - lastTap < 300) { var r = canvas.getBoundingClientRect(); var target = nearestRung(cam.z * 2); anim = { kind: 'snap', z0: cam.z, z1: target, t0: null, px: (e.clientX - r.left) * dpr(), py: (e.clientY - r.top) * dpr() }; }
        lastTap = tn;
      });
      canvas.addEventListener('pointermove', function (e) {
        var p = pts.get(e.pointerId); if (!p) return;
        var dx = e.clientX - p.x, dy = e.clientY - p.y, k = dpr(); p.x = e.clientX; p.y = e.clientY;
        if (pts.size === 1) { cam.x -= dx * k / cam.z; cam.y -= dy * k / cam.z; hist.push({ t: now(), x: e.clientX, y: e.clientY }); if (hist.length > 8) hist.shift(); }
        else if (pts.size === 2 && pinch) {
          var a = Array.from(pts.values()), d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), r = canvas.getBoundingClientRect();
          cam.x -= dx * k / cam.z / 2; cam.y -= dy * k / cam.z / 2;
          zoomAt(pinch.z * d / pinch.d, ((a[0].x + a[1].x) / 2 - r.left) * k, ((a[0].y + a[1].y) / 2 - r.top) * k);
        }
      });
      var up = function (e) {
        pts.delete(e.pointerId);
        if (pts.size === 1) { pinch = null; return; }
        if (pts.size) return;
        if (pinch) { pinch = null; snap(); return; }
        var h0 = hist[0], h1 = hist[hist.length - 1], dt = h1 && h0 ? h1.t - h0.t : 0;
        if (dt > 10 && now() - h1.t < 80) { var k = dpr(); anim = { kind: 'inertia', vx: (h1.x - h0.x) * k / dt, vy: (h1.y - h0.y) * k / dt }; }
        else if (!anim) snap();
      };
      canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
      canvas.addEventListener('wheel', function (e) {
        e.preventDefault(); var r = canvas.getBoundingClientRect(), k = dpr();
        zoomAt(cam.z * Math.pow(1.0015, -e.deltaY), (e.clientX - r.left) * k, (e.clientY - r.top) * k);
        clearTimeout(canvas.__wt); canvas.__wt = setTimeout(function () { snap((e.clientX - r.left) * k, (e.clientY - r.top) * k); }, 180);
      }, { passive: false });
    }

    return { cam: cam, frame: frame, levelOf: levelOf, RUNGS: RUNGS, stats: stats, resize: resize, zoomAt: zoomAt, snap: snap,
      setDyn: function (d) { dyn = d; }, invalidateView: function () {
        var keys = []; baker.pinned.forEach(function (k) { keys.push(k); }); baker.invalidate(keys); dirty = true; return keys; },
      markDirty: function () { dirty = true; }, counts: function () { return { frames: frames, drawn: drawn }; }, setAnim: function (a) { anim = a; },
      ctx: ctx };
  };
})(typeof window !== 'undefined' ? window : global);
