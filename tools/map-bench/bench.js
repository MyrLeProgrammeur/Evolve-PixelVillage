/* J0 spike: measurement harness. Runs scenarios on requestAnimationFrame, records frame intervals, render JS time and
   bake time in ring buffers, computes percentiles, shows a table, "Copy" button, POSTs the JSON to /bench (bench-server.js).
   URL: bench.html?auto=1&dur=30&ocean=A|B&dpr=full|2|1&path=cpu|draw&cpu=1|4&sc=S7,S1,S2,S3,S4,S5,S6&size=1280&engine=...&fade=1 */
(function (G) {
  'use strict';
  var PVB = G.PVB = G.PVB || {};
  var now = function () { return performance.now(); };
  var Q = new URLSearchParams(location.search);
  var P = {
    auto: Q.get('auto') === '1', dur: (+Q.get('dur') || 30) * 1000, ocean: Q.get('ocean') || 'A', dpr: Q.get('dpr') || 'full', path: Q.get('path') || 'cpu',
    cpu: Q.get('cpu') || '1', sc: (Q.get('sc') || 'S7,S1,S2,S3,S4,S5,S6').split(','), size: +Q.get('size') || 1280, fade: Q.get('fade') !== '0', tag: Q.get('tag') || '',
    cap: (+Q.get('cap') || 48) * 1048576, bitmap: Q.get('bitmap') === '1', slice: +Q.get('slice') || 2
  };
  function engine() {
    if (Q.get('engine')) return Q.get('engine');
    var ua = navigator.userAgent;
    if (/QtWebEngine/.test(ua)) return 'qt';
    if (/Firefox/.test(ua)) return /Android/.test(ua) ? 'fennec' : 'firefox';
    if (navigator.brave) return 'brave';
    return 'chromium';
  }
  function pct(a, p) { if (!a.length) return null; var s = Array.prototype.slice.call(a).sort(function (x, y) { return x - y; }); return +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(2); }
  function r2(x) { return x == null ? null : +x.toFixed(2); }
  function gpu() {
    try {
      var c = document.createElement('canvas'), gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return 'no webgl';
      var e = gl.getExtension('WEBGL_debug_renderer_info');
      return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    } catch (err) { return 'error'; }
  }
  function heap() { var m = performance.memory; return m ? Math.round(m.usedJSHeapSize / 1048576 * 10) / 10 : null; }

  var log = function (s) { var el = document.getElementById('log'); if (el) el.textContent = s + '\n' + el.textContent.slice(0, 3000); };
  var env = null, results = null;

  // the biggest town: the "capital" for the scenarios
  function findLand(world, C) {
    var t = world.towns[0], s = C.toScreen(t.q, t.r);
    return { x: s[0], y: s[1] };
  }

  function boot(canvas) {
    var C = PV.map.coords.make(P.size, P.size * 2), t0 = now();
    var world = PVB.makeWorld(C, 7), genMs = now() - t0;
    var B = PVB.Baker(world, { path: P.path, ocean: P.ocean, capBytes: P.cap, sliceMs: P.slice, bitmap: P.bitmap });
    var R = PVB.Renderer(canvas, world, B, { dpr: P.dpr, ocean: P.ocean, fade: P.fade, noInput: P.auto });
    var land = findLand(world, C);
    R.cam.x = land.x; R.cam.y = land.y; R.cam.z = 2;
    var dyn = PVB.Dyn(world, B, { waves: P.ocean === 'B' });
    R.setDyn(dyn);
    env = { C: C, world: world, B: B, R: R, dyn: dyn, landX: land.x, landY: land.y, dur: P.dur, genMs: genMs, canvas: canvas };
    return env;
  }

  // free play loop (manual pan/zoom) when no scenario runs
  var running = null;
  function idle(t) {
    if (!running && env) { env.R.frame(t); if (env.B.pump().done) env.R.markDirty(); hud(); }
    requestAnimationFrame(idle);
  }
  var hudT = 0;
  function hud() {
    var el = document.getElementById('hud'); if (!el || now() - hudT < 250) return; hudT = now();
    var i = env.B.info(), c = env.R.cam;
    el.textContent = 'z ' + c.z.toFixed(3) + '  L' + env.R.levelOf(c.z) + '  chunks ' + i.cached + '  ' + (i.bytes / 1048576).toFixed(1) + ' MB  pending ' + i.pending;
  }

  function runScenario(name) {
    var sc = PVB.scenarios[name], e = env, n = Math.ceil(e.dur / 4) + 64;
    var iv = new Float64Array(n), js = new Float64Array(n), jm = new Float64Array(n), bk = new Float64Array(n), k = 0;
    e.dyn.reset(); e.B.resetStats(); e.R.setAnim(null);
    if (sc.setup) sc.setup(e);
    var d0 = e.R.counts().drawn, h0 = heap();
    return new Promise(function (done) {
      var start = null, prev = null, hidden = false;
      var onVis = function () { if (document.hidden) hidden = true; };
      document.addEventListener('visibilitychange', onVis);
      running = name;
      function tick(t) {
        if (start === null) { start = t; prev = t; }
        var el = t - start;
        if (el >= e.dur) { running = null; document.removeEventListener('visibilitychange', onVis); var fr = finish(); if (hidden) fr.invalid = 'page hidden during the run'; done(fr); return; }
        var a = now();
        sc.step(el, e);
        e.R.frame(t);
        var rj = e.R.stats.js, b = e.B.pump(), bms = b.ms; if (b.done) e.R.markDirty();
        if (k < n && el > 0) { iv[k] = t - prev; js[k] = rj; jm[k] = rj - e.R.stats.dynMs; bk[k] = bms; k++; }
        prev = t;
        requestAnimationFrame(tick);
      }
      function finish() {
        var I = iv.subarray(0, k), J = js.subarray(0, k), JM = jm.subarray(0, k), Bk = bk.subarray(0, k), s = e.B.stats, ds = e.dyn.stats;
        var over50 = 0, over100 = 0; for (var j = 0; j < k; j++) { if (I[j] > 50) over50++; if (I[j] > 100) over100++; }
        var cm = s.chunkMs[0].concat ? s.chunkMs : [];
        var res = { label: sc.label, frames: k, drawn: e.R.counts().drawn - d0, drawnPerS: r2((e.R.counts().drawn - d0) / (e.dur / 1000)),
          interval: { p50: pct(I, 0.5), p95: pct(I, 0.95), p99: pct(I, 0.99), max: pct(I, 1) }, over50: over50, over100: over100,
          jsRender: { p50: pct(J, 0.5), p95: pct(J, 0.95), max: pct(J, 1) }, jsMapOnly: { p50: pct(JM, 0.5), p95: pct(JM, 0.95) }, bakeFrame: { p95: pct(Bk, 0.95), max: pct(Bk, 1) },
          sliceMax: pct(s.slices, 1), baked: s.baked, chunkMs: s.chunkMs.map(function (a) { return a.length ? { n: a.length, p50: pct(a, 0.5), p95: pct(a, 0.95) } : null; }),
          occlusionDraws: ds.occl, dynMsPerDraw: r2(ds.dynMs / Math.max(1, e.R.counts().drawn - d0)),
          heapStart: h0, heapEnd: heap(), cache: e.B.info() };
        if (sc.report) res.extra = sc.report(e);
        return res;
      }
      requestAnimationFrame(tick);
    });
  }

  // S7 cold start: new world + baker + first fully baked view, without slicing
  function coldStart() {
    var C = PV.map.coords.make(P.size, P.size * 2), t0 = now(), world = PVB.makeWorld(C, 11), t1 = now();
    var B = PVB.Baker(world, { path: P.path, ocean: P.ocean, capBytes: P.cap }), t2 = now();
    var cv = document.createElement('canvas'); cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;visibility:hidden';
    document.body.appendChild(cv);
    var R = PVB.Renderer(cv, world, B, { dpr: P.dpr, ocean: P.ocean, noInput: true }), land = findLand(world, C);
    R.cam.x = land.x; R.cam.y = land.y; R.cam.z = 2;
    R.frame(now()); var t3 = now(); var bakeMs = B.flush(); R.markDirty(); R.frame(now()); var t4 = now();
    document.body.removeChild(cv);
    return { label: 'cold start: generation + index + first view baked and drawn', totalMs: r2(t4 - t0), genMs: r2(t1 - t0), indexMs: r2(t2 - t1),
      firstViewBakeMs: r2(bakeMs), chunks: B.info().cached, findLandMs: null };
  }

  function prebake() {
    var e = env, t = now();
    for (var L = 0; L < e.C.LODS; L++) { var g = e.C.GRIDS[L]; if (g.nx * g.ny * g.pw * g.ph * 4 > 24 * 1048576) continue; for (var cy = 0; cy < g.ny; cy++) for (var cx = 0; cx < g.nx; cx++) e.B.request(L, cx, cy, L * 1000 + cy * 10 + cx); }
    e.B.flush();
    var cm = e.B.stats.chunkMs.map(function (a) { return a.length ? { n: a.length, p50: pct(a, 0.5), p95: pct(a, 0.95), max: pct(a, 1) } : null; });
    var ms = now() - t; e.B.resetStats();
    return { ms: r2(ms), chunkMs: cm, cache: e.B.info() };
  }

  function runAll() {
    var e = env, list = P.sc.slice();
    results = { engine: engine(), ua: navigator.userAgent, date: new Date().toISOString(), params: P, dprDevice: G.devicePixelRatio,
      canvas: [e.canvas.width, e.canvas.height], css: [innerWidth, innerHeight], genMs: r2(e.genMs), indexMs: r2(e.B.info().indexMs), heapStart: heap(), gpu: gpu(), scenarios: {} };
    var chain = Promise.resolve();
    if (list.indexOf('S7') >= 0) chain = chain.then(function () { log('S7 cold start…'); results.scenarios.S7 = coldStart(); });
    chain = chain.then(function () {
      log('prebake (whole planet, all levels)…'); results.prebake = prebake();
      var t = now(); e.R.markDirty(); e.R.frame(now()); results.prebake.firstFrameJs = r2(now() - t);
      // wall time until the next animation frame: includes the GPU upload of what the first frame drew
      return new Promise(function (ok) { requestAnimationFrame(function () { results.prebake.firstFrameWall = r2(now() - t); ok(); }); });
    });
    list.filter(function (s) { return s !== 'S7'; }).forEach(function (s) {
      chain = chain.then(function () { log(s + ' — ' + PVB.scenarios[s].label + ' (' + e.dur / 1000 + ' s)'); return runScenario(s); })
        .then(function (r) { results.scenarios[s] = r; show(); });
    });
    chain = chain.then(function () {
      if (!PVB.genProto || !PV.dmath) return;
      log('generator prototype x3…'); results.gen = [];
      for (var g = 0; g < 3; g++) results.gen.push(PVB.genProto(PV.map.coords.make(128, 256), PV.dmath, 7));
    });
    return chain.then(function () { results.heapEnd = heap(); show(); log('done'); return post(); }).then(next);
  }
  // ?queue=qs1~qs2~... : after posting, the same tab loads the next configuration (one tab, no memory piling up)
  function next() {
    var qv = Q.get('queue'); if (!qv) return;
    var parts = qv.split('~'), first = parts.shift();
    setTimeout(function () { location.href = 'bench.html?auto=1&' + first + (parts.length ? '&queue=' + encodeURIComponent(parts.join('~')) : ''); }, 1500);
  }

  function show() {
    var el = document.getElementById('out'); if (!el || !results) return;
    var rows = ['planet ' + env.C.W + ' x ' + env.C.H + ' tiles, ' + env.world.towns.length + ' towns, ' + env.world.buildings + ' buildings, generated in ' + results.genMs + ' ms',
      'scenario      p50   p95   p99   max  >50 >100  js95 map95  slice  drawn/s  L0 chunk p95'];
    Object.keys(results.scenarios).forEach(function (k) {
      var r = results.scenarios[k]; if (!r.interval) { rows.push(k + '  cold start ' + r.totalMs + ' ms (gen ' + r.genMs + ', first view ' + r.firstViewBakeMs + ')'); return; }
      var f = function (v, w) { return String(v == null ? '-' : v).padStart(w); };
      rows.push((k + '        ').slice(0, 10) + f(r.interval.p50, 6) + f(r.interval.p95, 6) + f(r.interval.p99, 6) + f(r.interval.max, 6) + f(r.over50, 5) + f(r.over100, 5) + f(r.jsRender.p95, 6) + f(r.jsMapOnly.p95, 6) + f(r.sliceMax, 7) + f(r.drawnPerS, 8) + f(r.chunkMs[0] ? r.chunkMs[0].p95 : null, 8)
        + (r.extra ? '  rebake ' + JSON.stringify(r.extra.rebakeMs) : ''));
    });
    if (results.gen) rows.push('generator ' + results.gen.map(function (g) { return g.ms.total + ' ms'; }).join(', ') + '  fingerprint ' + results.gen[0].fingerprint);
    if (results.prebake && results.prebake.firstFrameWall != null) rows.push('first frame after prebake: js ' + results.prebake.firstFrameJs + ' ms, wall ' + results.prebake.firstFrameWall + ' ms');
    if (results.gpu) rows.push('gpu: ' + results.gpu);
    if (results.prebake) rows.push('prebake (coarse levels) ' + results.prebake.ms + ' ms, ' + (results.prebake.cache.bytes / 1048576).toFixed(1) + ' MB');
    el.textContent = rows.join('\n');
  }

  function post() {
    var body = JSON.stringify(results);
    if (typeof G.pycmd === 'function') {
      return new Promise(function (ok) {
        G.pycmd('pvbench:' + body, function (r) { log(r && r.ok ? 'saved by Anki: ' + r.path : 'Anki could not save: use Copy'); G.__benchDone = true; ok(); });
      });
    }
    return fetch('/bench?engine=' + encodeURIComponent(results.engine + (P.tag ? '-' + P.tag : '')), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body })
      .then(function (r) { log(r.ok ? 'sent to the bench server' : 'server answered ' + r.status); G.__benchDone = true; })
      .catch(function () { log('no bench server: use Copy'); G.__benchDone = true; });
  }

  PVB.bench = { P: P, boot: boot, runAll: runAll, results: function () { return results; }, env: function () { return env; } };

  G.addEventListener('load', function () {
    var cv = document.getElementById('map');
    try { boot(cv); } catch (err) { log('boot failed: ' + err.message); throw err; }
    document.getElementById('run').onclick = function () { runAll(); };
    document.getElementById('copy').onclick = function () {
      var s = JSON.stringify(results || {}, null, 1);
      (navigator.clipboard ? navigator.clipboard.writeText(s) : Promise.reject()).then(function () { log('copied'); }, function () {
        var ta = document.createElement('textarea'); ta.value = s; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); log('copied');
      });
    };
    document.getElementById('hidebtn').onclick = function () { document.getElementById('panel').classList.toggle('min'); };
    requestAnimationFrame(idle);
    if (P.auto) setTimeout(function () { document.getElementById('panel').classList.add('min'); runAll(); }, 500);
  });
})(window);
