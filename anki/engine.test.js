/* Test d'intégration de l'horloge à cartes sur le VRAI moteur (src/main.js : fastLoop, midLoop, longLoop),
 * chargé hors navigateur dans le faux navigateur de tools/budget/load-game.js.
 * NODE_PATH=~/outils/esbuild/node_modules node --test anki/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm');
let esbuild = null;
try { esbuild = require('esbuild'); } catch (e) { /* sauté */ }

async function boot() {
  const { makeContext, ROOT } = require('../tools/budget/load-game.js');
  const r = await esbuild.build({ stdin: { contents: "export * from './src/main.js'; export { global, webWorker } from './src/vars.js'; export { actions } from './src/actions.js';", resolveDir: ROOT, loader: 'js' },
    bundle: true, write: false, format: 'iife', globalName: 'EV', logLevel: 'silent' });
  const ctx = makeContext();
  const ch = ctx.$;
  Object.assign(ctx, { addEventListener() {}, removeEventListener() {}, location: { reload() {}, href: 'http://127.0.0.1/' }, matchMedia: () => ({ matches: false }), dataLayer: [] });
  for (const k of ['Sortable', 'Chart', 'Popper', 'Buefy', 'Image', 'Audio', 'gtag', 'requestAnimationFrame', 'alert', 'confirm', 'prompt', 'performance']) { ctx[k] = ch; }
  vm.createContext(ctx);
  vm.runInContext(r.outputFiles[0].text, ctx, { filename: 'evolve-engine.js' });
  return ctx;
}

test('horloge à cartes sur le vrai moteur : production, calendrier, clic', { skip: !esbuild && 'esbuild absent' }, async () => {
  const ctx = await boot();
  const EV = ctx.EV, g = EV.global, w = EV.webWorker;
  assert.equal(g.race.species, 'protoplasm');
  g.evolution.organelles = { count: 3 };
  Object.assign(g.resource.RNA, { display: true, max: 1000, amount: 0 });
  w.s = true;
  const run = (n) => EV.execGameLoops(n);
  const days = () => g.stats.days;

  run(40);                                                   // mode original : 3 x 1 RNA/s x 10 s
  assert.equal(g.resource.RNA.amount, 30);
  ctx.ankiClock.set({ mode: 'cards', passive: 0 });
  g.resource.RNA.amount = 0; const d0 = days();
  run(400);
  assert.equal(g.resource.RNA.amount, 0, 'rien ne bouge sans révision');
  assert.equal(days(), d0);
  ctx.ankiClock.addTicks(40);                                // 2 cartes à 20 ticks
  for (let i = 0; i < 10; i++) { run(1); }
  assert.equal(g.resource.RNA.amount, 30);
  assert.equal(g.anki.clock.bank, 0);
  ctx.ankiClock.set({ passive: 0.5 });
  g.resource.RNA.amount = 0; run(40);
  assert.equal(g.resource.RNA.amount, 15);
  // Clic RNA : coupé par défaut en mode cartes, rétabli sur demande, toujours permis en mode original
  const click = () => { const b = g.resource.RNA.amount; EV.actions.evolution.rna.action(); return g.resource.RNA.amount - b; };
  assert.equal(click(), 0);
  ctx.ankiClock.set({ noManual: false }); assert.equal(click(), 1);
  ctx.ankiClock.set({ noManual: true, mode: 'original' }); assert.equal(click(), 1);

  // Ère 1 réelle, par l'action sentience du jeu : le calendrier (1 jour = 20 ticks) suit l'horloge
  g.tech.evo = 7; g.tech.evo_humanoid = 2; g.evolution.final = 100;
  Object.assign(g.resource.RNA, { amount: 1000, max: 1000 }); Object.assign(g.resource.DNA, { display: true, amount: 1000, max: 1000 });
  EV.actions.evolution.sentience.action.call({ 0: EV.actions.evolution.sentience }, {});
  assert.equal(g.race.species, 'human');
  g.city.calendar.day = 1;                                   // le jeu le lance avec la tech sundial
  let d = days(); run(40); assert.equal(days() - d, 2);
  ctx.ankiClock.set({ mode: 'cards', passive: 0 });
  d = days(); run(400); assert.equal(days() - d, 0);
  ctx.ankiClock.addTicks(60);
  d = days(); for (let i = 0; i < 10; i++) { run(1); } assert.equal(days() - d, 3);
});
