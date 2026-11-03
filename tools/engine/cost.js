/* J0-07: what the Evolve engine costs per tick, headless (measurement only, nothing in src/ changes).
 * Usage: NODE_PATH=~/outils/esbuild/node_modules node tools/engine/cost.js [save.json] [ticks]
 * save.json: the decompressed save (JSON text of `global`). Without it: a fresh protoplasm game.
 * Prints ms per tick with settings.expose off and on (on = updateDebugData: deepClone(global) every fastLoop),
 * the size of global, and the card-clock catch-up (bank of 2 000 ticks, at most 240 ticks per call = one frame). */
'use strict';
const fs = require('fs');
const H = require('./harness.js');
const file = process.argv[2], N = +(process.argv[3] || 1000);
const now = () => performance.now();
(async () => {
  const storage = file ? { evolved: fs.readFileSync(file, 'utf8') } : {};
  const ctx = await H.bootEngine({ seed: 1, storage, performance });
  const EV = ctx.EV, g = EV.global, w = EV.webWorker;
  w.s = true;
  const run = (n) => EV.execGameLoops(n);
  const per = (n) => { const t = now(); for (let i = 0; i < n; i++) run(1); return (now() - t) / n; };
  console.log('species', g.race.species, '| global JSON', (JSON.stringify(g).length / 1024).toFixed(0) + ' KB');
  g.settings.expose = false; per(100);
  const off = per(N);
  g.settings.expose = true; per(50);
  const on = per(N);
  let cl = 0; { const t = now(); for (let i = 0; i < 200; i++) JSON.parse(JSON.stringify(g)); cl = (now() - t) / 200; }
  console.log('ms per tick: expose off ' + off.toFixed(3) + ' | expose on ' + on.toFixed(3) + ' | difference (updateDebugData) ' + (on - off).toFixed(3));
  console.log('JSON round trip of global (reference) ' + cl.toFixed(3) + ' ms');
  // catch-up: card clock with a bank of 2 000 ticks
  for (const expose of [false, true]) {
    g.settings.expose = expose;
    ctx.ankiClock.set({ mode: 'cards', passive: 0 });
    ctx.ankiClock.addTicks(2000);
    const calls = [];
    for (let k = 0; k < 40 && ctx.ankiClock.get().bank > 0; k++) { const t = now(); run(240); calls.push(now() - t); }
    console.log('catch-up 2 000 ticks, expose ' + (expose ? 'on ' : 'off') + ': ' + calls.length + ' calls, worst ' + Math.max(...calls).toFixed(1) + ' ms, total ' + calls.reduce((a, b) => a + b, 0).toFixed(0) + ' ms, bank left ' + ctx.ankiClock.get().bank);
    ctx.ankiClock.set({ mode: 'original' });
  }
})().catch((e) => { console.log('ERR', e.stack); process.exit(1); });
