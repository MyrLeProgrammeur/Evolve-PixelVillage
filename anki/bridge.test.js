/* Test du pont de page (anki-bridge.js) hors navigateur : vrai src/anki.js (empaqueté par esbuild), vrai
 * anki/ledger.js, faux jeu (ressources avec plafonds), faux serveur d'événements.
 * NODE_PATH=~/outils/esbuild/node_modules node --test anki/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const L = require('./ledger.js');
let esbuild = null;
try { esbuild = require('esbuild'); } catch (e) { /* sauté */ }

async function setup() {
  const r = await esbuild.build({
    entryPoints: [path.join(__dirname, '..', 'src', 'anki.js')], bundle: true, write: false, format: 'iife', globalName: 'A',
    plugins: [{ name: 'fake-vars', setup(b) {
      b.onResolve({ filter: /\/vars\.js$/ }, () => ({ path: 'vars', namespace: 'fake' }));
      b.onLoad({ filter: /.*/, namespace: 'fake' }, () => ({ contents: 'export var global = globalThis.__G; export const breakdown = { p: {} }; export const save = { setItem() {} };', loader: 'js' }));
    } }]
  });
  const G = { race: { species: 'protoplasm' }, resource: {
    RNA: { display: true, amount: 0, max: 100 }, DNA: { display: true, amount: 0, max: 100 },
    Knowledge: { display: false, amount: 0, max: 1000 }, Money: { display: true, amount: 0, max: 1e9 }, Lumber: { display: true, amount: 0, max: 200 } } };
  const server = { events: [] };
  const ctx = {
    __G: G, Date, Math, JSON, Promise, Map, Set, Array, Object, Number, String, console,
    setInterval() {}, setTimeout() {},
    document: { readyState: 'complete', visibilityState: 'visible', getElementById: () => null, addEventListener() {}, head: { appendChild() {} }, createElement: () => ({}) },
    fetch: (url) => {
      const since = Number((/since=(\d+)/.exec(url) || [])[1] || 0);
      const out = server.events.slice(since);
      return Promise.resolve({ json: () => Promise.resolve({ enabled: true, cursor: server.events.length, events: out, status: { rollover: 4, source: 'revlog' } }) });
    }
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'ledger.js'), 'utf8'), ctx);
  vm.runInContext(r.outputFiles[0].text, ctx);
  ctx.evolve = { global: G };
  ctx.ankiCredit = (res, amount) => {                        // même contrat que src/main.js : plafonds, ressources cachées
    const x = G.resource[res];
    if (!x || !x.display || !(amount > 0)) { return 0; }
    const before = x.amount; x.amount = Math.min(x.max, x.amount + amount); return x.amount - before;
  };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'anki-bridge.js'), 'utf8'), ctx);
  return { ctx, G, server };
}
function reviews(n, from, dayOffset) {
  const now = Date.now();
  const day = L.localAnkiDay(now, 4) + (dayOffset || 0);
  const t0 = require('./sensor.js').dayStartMs(day, 4) + 3600000 + 100000;   // 05:00 locale du jour visé
  return Array.from({ length: n }, (_, i) => ({ v: 1, k: 'review', id: 'rv:' + (t0 - 100000 + from + i), src: 'revlog', t: t0 - 100000 + (from + i) * 10, day, cid: 1000 + from + i, did: 1, b: 3, p: 0, ivl: 1, rt: 1 }));
}

test('pont : versement monotone, réserve, ticks, changement d\'ère, rien payé deux fois', { skip: !esbuild && 'esbuild absent' }, async () => {
  const { ctx, G, server } = await setup();
  const V = ctx.AnkiVillage;
  // Ce test vérifie la mécanique du pont : règles sans aube et taux d'origine, fixés ici.
  ctx.ankiState().rules = { dawn: { cards: 0 } };
  Object.assign(V.rates.evo.base, { RNA: 4, DNA: 8 }); Object.assign(V.rates.evo.noble, { RNA: 4, DNA: 8 });
  V.rates.era1.base.Money = 95;
  server.events = reviews(10, 0).concat(reviews(5, 100, -1));          // 5 révisions d'hier : avant la partie, non payées
  await V.refresh();
  const a = ctx.ankiState();
  assert.equal(a.granted.base, 10000);
  assert.equal(a.today.credits, 10);
  // 10 crédits = 40 RNA et 80 DNA au taux de l'ère 0 ; plafonds à 100 : tout passe
  assert.equal(G.resource.RNA.amount, 40); assert.equal(G.resource.DNA.amount, 80);
  assert.equal(a.ticks.given, 200);                                     // 20 ticks par crédit, comptés…
  assert.equal(a.clock.bank, 0);                                        // …mais pas joués en mode original
  // Encore 10 cartes : le plafond DNA (100) mord, le reste attend en réserve
  server.events = server.events.concat(reviews(10, 10));
  await V.refresh();
  assert.equal(a.granted.base, 20000);
  assert.equal(G.resource.DNA.amount, 100); assert.equal(a.reserve.DNA, 60);
  // Relire les mêmes événements ne paie rien de plus
  await V.refresh(); await V.refresh();
  assert.equal(a.granted.base, 20000); assert.equal(G.resource.RNA.amount, 80);
  // Mode cartes : les nouveaux crédits remplissent la réserve de ticks
  ctx.ankiClock.set({ mode: 'cards' });
  server.events = server.events.concat(reviews(2, 20));
  await V.refresh();
  assert.equal(a.clock.bank, 40);
  // Passage à l'ère 1 : la réserve de DNA (devenue inutile) est reconvertie, rien ne se perd
  G.race.species = 'human';
  const dnaLeft = a.reserve.DNA;
  server.events = server.events.concat(reviews(1, 30));
  await V.refresh();
  assert.equal(a.reserve.DNA, 0);
  const units = (dnaLeft / 8) / 2 + 1;                                  // crédits reconvertis (moyenne RNA/DNA) + 1 nouveau
  assert.ok(Math.abs(G.resource.Money.amount - 95 * units) < 1e-6, 'Money ' + G.resource.Money.amount);
  assert.ok(a.reserve.Knowledge > 0);                                   // Knowledge pas encore affiché : en réserve
  G.resource.Knowledge.display = true;
  await V.refresh();
  assert.ok(G.resource.Knowledge.amount > 0);
  const st = V.status();
  assert.equal(st.connected, true); assert.equal(st.today.credits, 23);
});
