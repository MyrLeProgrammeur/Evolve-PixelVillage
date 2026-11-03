/* J0 spike: scripted scenarios S1..S7. Each step(t, env) sets the camera for elapsed time t (ms).
   env = { R: renderer, B: baker, C: coords, world, dyn, dur }. Durations default to 30 s (URL ?dur=). */
(function (G) {
  'use strict';
  var PVB = G.PVB = G.PVB || {};
  function tri(u) { u = u - Math.floor(u); return 1 - Math.abs(2 * u - 1); }

  PVB.scenarios = {
    // S1: L0 at its widest rung (z = 2: the most L0 chunks on screen), crossing the wrap seam three times
    S1: { label: 'pan L0 x2 across the seam x3', step: function (t, e) {
      var T = e.dur / 1.5, cam = e.R.cam; cam.z = 2;
      cam.x = 1500 * Math.sin(2 * Math.PI * t / T); cam.y = e.landY + 200 * Math.sin(t / 3000);
    } },
    // S2: pan at every crisp rung, dur / 6 each, 800 device px/s
    S2: { label: 'pan at each rung (L0 x4, L0 x2, L1 .. L6)', step: function (t, e) {
      var R = [4, 2, 1, 0.5, 0.25, 0.125, 0.0625, 0.03125], k = Math.min(R.length - 1, Math.floor(t / (e.dur / R.length))), cam = e.R.cam;
      var tk = t - k * e.dur / R.length;
      cam.z = R[k]; cam.x = e.landX + 0.8 * tk / R[k]; cam.y = e.landY + 0.3 * tk / R[k] * 0.3;
    } },
    // S3: continuous pinch L0 x4 -> L4 x2 -> back in 6 s, cross-fades on
    S3: { label: 'pinch L0 x4 <-> L5 (whole planet) in 6 s, looping', step: function (t, e) {
      var cam = e.R.cam, a = Math.log2(4), b = Math.log2(0.03125);
      cam.z = Math.pow(2, a + (b - a) * tri(t / 6000)); cam.x = e.landX + t * 0.02; cam.y = e.landY;
    } },
    // S4: flings with inertia every 1.5 s at z = 2
    S4: { label: 'flings with inertia, L0 x2', setup: function (e) { e.R.cam.z = 2; e.R.cam.x = e.landX; e.R.cam.y = e.landY; e._n = -1; },
      step: function (t, e) {
        var n = Math.floor(t / 1500);
        if (n !== e._n) { e._n = n; var ang = n * 2.399; e.R.setAnim({ kind: 'inertia', vx: Math.cos(ang) * 4, vy: Math.sin(ang) * 2 }); }
      } },
    // S5: still camera; counts drawn frames (actors tick at 8 Hz). Hidden tab: rAF stops by design (not scripted).
    S5: { label: 'still camera (drawn frames per second)', setup: function (e) { var c = e.R.cam; c.z = 2; c.x = e.landX; c.y = e.landY; e.R.setAnim(null); }, step: function () {} },
    // S6: bake storm: every visible chunk invalidated (a replay) three times while panning at L0 x2
    S6: { label: 'bake storm (view invalidated x3) while panning L0 x2', setup: function (e) { e._inv = []; e._next = 0; },
      step: function (t, e) {
        var cam = e.R.cam; cam.z = 2; cam.x = e.landX + t * 0.05; cam.y = e.landY;
        if (e._next < 3 && t >= 1000 + e._next * (e.dur / 3)) { e._inv.push({ t: t, keys: e.R.invalidateView(), done: null }); e._next++; }
        // done when no chunk of the CURRENT view is still dirty (chunks the camera has left are not baked again)
        var vis = []; e.B.pinned.forEach(function (k) { vis.push(k); });
        e._inv.forEach(function (v) { if (v.done == null && e.B.isClean(v.keys.filter(function (k) { return vis.indexOf(k) >= 0; }))) v.done = t - v.t; });
      },
      report: function (e) { return { rebakeMs: e._inv.map(function (v) { return v.done; }), chunks: e._inv.map(function (v) { return v.keys.length; }) }; } },
  };
})(typeof window !== 'undefined' ? window : global);
