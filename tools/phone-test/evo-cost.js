// J0-07, in the browser (TEST SAVE ONLY: refuses to run anywhere but port 8766). Measurement only, src/ untouched.
// Times window.evolve.updateDebugData() (deepClone(global), run by every fastLoop when settings.expose is on),
// then watches frames and long tasks for 5 s at rest and 12 s after a card-clock catch-up (bank +2 000 ticks).
// Usage: su -c "sh tools/phone-test/cdp.sh evalfile tools/phone-test/evo-cost.js"
(async function () {
  if (location.port !== '8766') return 'refused: not the test port';
  var ev = window.evolve, G = ev && ev.global;
  if (!ev || typeof ev.updateDebugData !== 'function') return 'window.evolve missing (settings.expose off)';
  var pct = function (a, p) { var s = a.slice().sort(function (x, y) { return x - y; }); return s.length ? +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(2) : null; };
  var clone = [];
  for (var i = 0; i < 40; i++) { var t = performance.now(); ev.updateDebugData(); clone.push(performance.now() - t); }
  var size = JSON.stringify(ev.global).length;
  function watch(ms) {
    return new Promise(function (done) {
      var lt = [], fr = [], prev = null, stop = false, po = null;
      try { po = new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { lt.push(e.duration); }); }); po.observe({ entryTypes: ['longtask'] }); } catch (e) { po = null; }
      function f(ts) { if (prev !== null) fr.push(ts - prev); prev = ts; if (!stop) requestAnimationFrame(f); }
      requestAnimationFrame(f);
      setTimeout(function () { stop = true; if (po) po.disconnect(); done({ frames: fr.length, p50: pct(fr, 0.5), p95: pct(fr, 0.95), max: pct(fr, 1), over50: fr.filter(function (x) { return x > 50; }).length, longTasks: lt.length, longMax: lt.length ? +Math.max.apply(null, lt).toFixed(1) : 0 }); }, ms);
    });
  }
  var rest = await watch(5000);
  var clk = window.ankiClock, before = clk ? clk.get() : null, catchup = null;
  if (clk) {
    clk.set({ mode: 'cards' }); clk.addTicks(2000);
    catchup = await watch(12000);
    catchup.bankLeft = clk.get().bank;
    clk.set({ mode: before.mode });
  }
  return { species: G && G.race && G.race.species, globalKB: Math.round(size / 1024), cloneMs: { p50: pct(clone, 0.5), p95: pct(clone, 0.95), max: pct(clone, 1) },
    rest: rest, catchup2000: catchup, clockModeRestored: before && before.mode };
})()
