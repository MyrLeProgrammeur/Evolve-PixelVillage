/* J0 spike: chunk baker. Chunks of 512 x 256 pixels of their own level (L0..L4), baked in time slices into a Uint32Array,
   uploaded with putImageData into a pooled canvas, kept in an LRU with a byte cap.
   path 'cpu': buildings blitted into the buffer; path 'draw': terrain uploaded, then buildings drawn with drawImage.
   ocean 'A': ocean pixels left transparent (a pattern is drawn under the chunks); ocean 'B': opaque chunks. */
(function (G) {
  'use strict';
  var PVB = G.PVB = G.PVB || {};
  var now = function () { return performance.now(); };

  // Nearest downscale of a kit Pix by 2^L, keeping thin details: take the block centre, else the first opaque pixel of the block.
  function downscale(K, pix, f) {
    if (f === 1) return pix;
    var w = Math.max(1, Math.ceil(pix.w / f)), h = Math.max(1, Math.ceil(pix.h / f)), o = new K.Pix(w, h), c2 = f >> 1;
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      var c = pix.get(i * f + c2, j * f + c2);
      if (!c) for (var y = 0; y < f && !c; y++) for (var x = 0; x < f && !c; x++) c = pix.get(i * f + x, j * f + y);
      if (c) o.d[j * w + i] = c;
    }
    return o;
  }

  PVB.Baker = function (world, opt) {
    opt = opt || {};
    var K = G.SpriteKit._, C = world.C, W = C.W, H = C.H, LODS = C.LODS;
    var cap = opt.capBytes || 48 * 1024 * 1024, sliceMs = opt.sliceMs || 2, path = opt.path || 'cpu', oceanA = (opt.ocean || 'A') === 'A';
    var mk = opt.makeCanvas || function (w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

    // sprites per level
    var SPR = [];
    for (var L = 0; L < LODS; L++) {
      var f = 1 << L;
      SPR.push(world.shells.map(function (s) {
        var p = downscale(K, s.pix, f);
        return { pix: p, ox: Math.round(s.ox / f), oy: Math.round(s.oy / f), cv: null };
      }));
    }
    function sprCanvas(L, s) { var e = SPR[L][s]; return e.cv || (e.cv = e.pix.canvas()); }

    // object index per chunk and level: entries [tile, copy offset in L0 px], sorted in global draw order
    var t0 = now(), IDX = new Map(), nEntries = 0;
    for (var i = 0; i < C.N; i++) {
      var s = world.bld[i]; if (s < 0) continue;
      var q = i % W, r = (i / W) | 0, sp = C.toScreen(q, r), sh = world.shells[s];
      var box = { x: sp[0] - sh.ox, y: sp[1] - sh.oy, w: sh.pix.w, h: sh.pix.h };
      var offs = C.wrapCopies(box);
      for (L = 0; L < LODS; L++) {
        var g = C.GRIDS[L];
        for (var k = 0; k < offs.length; k++) {
          var x0 = box.x + offs[k], cx0 = Math.floor(x0 / g.w), cx1 = Math.floor((x0 + box.w - 1) / g.w);
          var cy0 = Math.max(0, Math.floor(box.y / g.h)), cy1 = Math.min(g.ny - 1, Math.floor((box.y + box.h - 1) / g.h));
          for (var cy = cy0; cy <= cy1; cy++) for (var cx = Math.max(0, cx0); cx <= Math.min(g.nx - 1, cx1); cx++) {
            var key = L + '|' + cx + '|' + cy, a = IDX.get(key); if (!a) IDX.set(key, a = []);
            a.push(i, offs[k]); nEntries++;
          }
        }
      }
    }
    IDX.forEach(function (a, key) {
      var n = a.length / 2, ord = new Array(n);
      for (var j = 0; j < n; j++) ord[j] = j;
      ord.sort(function (u, v) {
        var iu = a[2 * u], iv = a[2 * v], ru = (iu / W) | 0, rv = (iv / W) | 0;
        if (ru !== rv) return ru - rv;
        return (C.toScreen(iv % W, rv)[0] + a[2 * v + 1]) - (C.toScreen(iu % W, ru)[0] + a[2 * u + 1]) || iu - iv;
      });
      var out = new Int32Array(n * 2);
      for (j = 0; j < n; j++) { out[2 * j] = a[2 * ord[j]]; out[2 * j + 1] = a[2 * ord[j] + 1]; }
      IDX.set(key, out);
    });
    var indexMs = now() - t0;

    // cache + pools
    var cache = new Map(), bytes = 0, canvasPool = [], bufPool = new Map(), imgPool = new Map();
    function buf(w, h) { var k = w + 'x' + h, b = bufPool.get(k); if (!b) { b = new Uint32Array(w * h); bufPool.set(k, b); } return b; }
    function img(ctx, w, h) { var k = w + 'x' + h, d = imgPool.get(k); if (!d) { d = ctx.createImageData(w, h); d.u32 = new Uint32Array(d.data.buffer); imgPool.set(k, d); } return d; }
    function takeCanvas(w, h) {
      for (var j = 0; j < canvasPool.length; j++) if (canvasPool[j].width === w && canvasPool[j].height === h) return canvasPool.splice(j, 1)[0];
      return mk(w, h);
    }
    var pinned = new Set();
    function evict() {
      if (bytes <= cap) return;
      var it = cache.keys();
      for (var e = it.next(); !e.done && bytes > cap; e = it.next()) {
        if (pinned.has(e.value)) continue;
        var c = cache.get(e.value); cache.delete(e.value); bytes -= c.bytes; if (canvasPool.length < 8) canvasPool.push(c.canvas || c.cv);
      }
    }

    // bake job as a generator: yields every few rows / objects so the pump can stop at its time budget
    var TERRAIN = PVB.Terrain(world);
    function* job(L, cx, cy) {
      var g = C.GRIDS[L], rc = C.chunkRect(cx, cy, L), f = g.f, pw = g.pw, ph = Math.ceil(rc.h / f);
      var B = buf(pw, ph);
      yield* TERRAIN.paint(B, pw, ph, rc, f, L, oceanA);
      var list = IDX.get(L + '|' + cx + '|' + cy);
      if (list && path !== 'draw') for (var e = 0; e < list.length; e += 2) {
        var t = list[e], o = list[e + 1], sp = C.toScreen(t % W, (t / W) | 0), S = SPR[L][world.bld[t]], P = S.pix;
        var bx = Math.round((sp[0] + o - rc.x) / f) - S.ox, by = Math.round((sp[1] - rc.y) / f) - S.oy;
        for (var y = 0; y < P.h; y++) {
          var ty = by + y; if (ty < 0 || ty >= ph) continue;
          var sr = y * P.w, dr = ty * pw;
          for (var x = 0; x < P.w; x++) { var cc = P.d[sr + x]; if (!cc) continue; var tx = bx + x; if (tx >= 0 && tx < pw) B[dr + tx] = cc; }
        }
        if ((e & 15) === 14) yield 0;
      }
      yield 0;
      // upload in strips of 64 rows into a canvas that is not on screen yet (the old one stays visible until the swap)
      var cv = takeCanvas(pw, ph), ctx = cv.getContext('2d'), d = img(ctx, pw, ph);
      d.u32.set(B.subarray(0, pw * ph));
      for (var sy = 0; sy < ph; sy += 64) { ctx.putImageData(d, 0, 0, 0, sy, pw, Math.min(64, ph - sy)); yield 0; }
      if (list && path === 'draw') {
        ctx.imageSmoothingEnabled = false;
        for (e = 0; e < list.length; e += 2) {
          t = list[e]; o = list[e + 1]; sp = C.toScreen(t % W, (t / W) | 0); var s = world.bld[t]; S = SPR[L][s];
          ctx.drawImage(sprCanvas(L, s), Math.round((sp[0] + o - rc.x) / f) - S.ox, Math.round((sp[1] - rc.y) / f) - S.oy);
          if ((e & 31) === 30) yield 0;
        }
      }
      return { cv: cv, pw: pw, ph: ph };
    }
    function install(L, cx, cy, res) {
      var key = L + '|' + cx + '|' + cy, old = cache.get(key);
      if (old) { cache.delete(key); bytes -= old.bytes; if (canvasPool.length < 8) canvasPool.push(old.canvas || old.cv); }
      var ent = { cv: res.cv, canvas: res.cv, bytes: res.pw * res.ph * 4, L: L, dirty: false };
      cache.set(key, ent); bytes += ent.bytes; evict();
      // option bitmap: also keep an ImageBitmap (may stay on the GPU where a canvas does not, e.g. Firefox)
      if (opt.bitmap && G.createImageBitmap) G.createImageBitmap(res.cv).then(function (bm) { if (cache.get(key) === ent) { ent.cv = bm; ent.bm = true; } else if (bm.close) bm.close(); });
    }

    // scheduler
    var want = new Map(), cur = null, stats = { slices: [], chunkMs: [], baked: 0, frameBake: [] };
    for (var sl = 0; sl < LODS; sl++) stats.chunkMs.push([]);
    function request(L, cx, cy, prio) {
      var key = L + '|' + cx + '|' + cy, c = cache.get(key);
      if (c && !c.dirty) return;
      var p = want.get(key); if (p === undefined || prio < p) want.set(key, prio);
    }
    function pick() {
      var best = null, bp = Infinity;
      want.forEach(function (p, k) { if (p < bp) { bp = p; best = k; } });
      if (best === null) return null;
      want.delete(best);
      var c = cache.get(best); if (c && !c.dirty) return pick();
      var parts = best.split('|');
      return { key: best, L: +parts[0], cx: +parts[1], cy: +parts[2], gen: job(+parts[0], +parts[1], +parts[2]), ms: 0 };
    }
    // Runs bake slices for at most `budget` ms (default sliceMs). Returns ms spent and whether a chunk finished.
    function pump(budget) {
      budget = budget == null ? sliceMs : budget;
      var start = now(), done = 0, lastStep = 0;
      // stops before a step that would overrun the budget (estimated from the previous step)
      while (now() - start + lastStep < budget || now() === start) {
        if (!cur) { cur = pick(); if (!cur) break; }
        var s0 = now(), st = cur.gen.next(), dt;
        if (st.done) { install(cur.L, cur.cx, cur.cy, st.value); dt = now() - s0; cur.ms += dt; stats.chunkMs[cur.L].push(cur.ms); stats.baked++; done++; cur = null; }
        else { dt = now() - s0; cur.ms += dt; }
        lastStep = dt; if (budget > 1e8) lastStep = 0;
      }
      var spent = now() - start;
      if (spent > 0.01) stats.slices.push(spent);
      return { ms: spent, done: done, pending: want.size + (cur ? 1 : 0) };
    }
    // Bakes everything requested right now, without slicing (cold start, pre-bake).
    function flush() { var t = now(); while (pump(1e9).pending) {} return now() - t; }
    function get(L, cx, cy) { var key = L + '|' + cx + '|' + cy, c = cache.get(key); if (!c) return null; cache.delete(key); cache.set(key, c); return c; }
    function invalidate(keys) { keys.forEach(function (k) { var c = cache.get(k); if (c) c.dirty = true; }); }
    function clear() { cache.forEach(function (c) { if (canvasPool.length < 8) canvasPool.push(c.canvas || c.cv); }); cache.clear(); bytes = 0; want.clear(); cur = null; }

    // the renderer restates its wants at every draw: stale requests (places already left) are dropped
    function beginWants() { want.clear(); }
    function room(extra) { return bytes + (extra || 0) < cap * 0.85; }
    function isClean(keys) { for (var j = 0; j < keys.length; j++) { var c = cache.get(keys[j]); if (!c || c.dirty) return false; } return true; }

    return { request: request, pump: pump, isClean: isClean, beginWants: beginWants, room: room, flush: flush, get: get, invalidate: invalidate, clear: clear, pinned: pinned, stats: stats, SPR: SPR, sprCanvas: sprCanvas,
      info: function () { return { cached: cache.size, bytes: bytes, cap: cap, indexMs: indexMs, entries: nEntries, pending: want.size + (cur ? 1 : 0), path: path, ocean: oceanA ? 'A' : 'B' }; },
      resetStats: function () { stats.slices = []; stats.chunkMs = []; for (var q2 = 0; q2 < LODS; q2++) stats.chunkMs.push([]); stats.baked = 0; } };
  };
})(typeof window !== 'undefined' ? window : global);
