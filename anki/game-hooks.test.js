/* Tests de src/anki.js (partie intégrée au jeu) hors navigateur : esbuild l'empaquette avec un faux vars.js.
 * esbuild est l'outil de construction déjà utilisé par le dépôt (README) ; si absent, le test est sauté.
 * Lancer : NODE_PATH=~/outils/esbuild/node_modules node --test anki/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const vm = require('vm');

let esbuild = null;
try { esbuild = require('esbuild'); } catch (e) { /* sauté plus bas */ }

async function load() {
  const r = await esbuild.build({
    entryPoints: [path.join(__dirname, '..', 'src', 'anki.js')], bundle: true, write: false, format: 'iife', globalName: 'A',
    plugins: [{ name: 'fake-vars', setup(b) {
      b.onResolve({ filter: /\/vars\.js$/ }, () => ({ path: 'vars', namespace: 'fake' }));
      b.onLoad({ filter: /.*/, namespace: 'fake' }, () => ({ contents:
        'export var global = globalThis.__G; export const breakdown = globalThis.__B; export const save = globalThis.__S;', loader: 'js' }));
    } }]
  });
  const saved = [];
  const ctx = { __G: { race: {}, resource: {} }, __B: { p: { Food: {} } }, __S: { setItem: (k, v) => saved.push([k, v]) },
    LZString: { compressToUTF16: (s) => 'lz:' + s.length }, Date };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(r.outputFiles[0].text, ctx);
  return { A: ctx.A, ctx, saved };
}

test('src/anki.js : horloge à cartes, multiplicateur, cueillette, sauvegarde', { skip: !esbuild && 'esbuild absent' }, async () => {
  const { A, ctx, saved } = await load();
  const a = ctx.__G.anki;
  assert.equal(a.clock.mode, 'original');
  // Mode original : le nombre de ticks n'est pas touché, aucune sauvegarde ajoutée
  assert.equal(A.ankiClockGate(3, 240), 3);
  A.ankiMaybeSave(); assert.equal(saved.length, 0);
  // Mode cartes, production passive coupée : rien ne bouge sans réserve
  ctx.ankiClock.set({ mode: 'cards', passive: 0 });
  let total = 0; for (let i = 0; i < 100; i++) { total += A.ankiClockGate(1, 240); }
  assert.equal(total, 0);
  // Une carte = ticksPerCard ticks, joués au plus `drain` par tick réel, jamais perdus
  ctx.ankiClock.addTicks(20);
  const seq = []; for (let i = 0; i < 4; i++) { seq.push(A.ankiClockGate(1, 240)); }
  assert.deepEqual(seq, [8, 8, 4, 0]);
  ctx.ankiClock.addTicks(1000);
  assert.equal(A.ankiClockGate(240, 240), 240);              // onglet en veille : plafonné, le reste attend
  assert.equal(a.clock.bank, 760);
  // Production passive à 25 % : 1 tick sur 4
  a.clock.bank = 0; ctx.ankiClock.set({ passive: 0.25 });
  total = 0; for (let i = 0; i < 400; i++) { total += A.ankiClockGate(1, 240); }
  assert.equal(total, 100);
  // ankiMult : 1 sans bonus ; somme additive plafonnée ; ligne de détail
  assert.equal(A.ankiMult('Food'), 1);
  ctx.ankiMult.set('flamme', 'Food', 0.15); ctx.ankiMult.set('chenes', '*', 0.1); ctx.ankiMult.set('fleuve', 'Food', 0.3);
  assert.equal(A.ankiMult('Food'), 1.4);
  assert.equal(ctx.__B.p.Food.Anki, '40%');
  assert.equal(A.ankiMult('Stone'), 1.1);
  ctx.ankiMult.cap('Food', 0.2); assert.equal(A.ankiMult('Food'), 1.2);
  // Cueillette manuelle : permise sauf si coupée en mode cartes
  assert.equal(A.ankiAllowGather(), true);
  ctx.ankiClock.set({ noManual: true }); assert.equal(A.ankiAllowGather(), false);
  ctx.ankiClock.set({ mode: 'original' }); assert.equal(A.ankiAllowGather(), true);
  // Sauvegarde au temps réel en mode cartes (au plus toutes les 5 s)
  ctx.ankiClock.set({ mode: 'cards' });
  const realNow = Date.now; let fake = realNow() + 6000; ctx.Date = { now: () => fake };
  vm.runInContext('Date = globalThis.Date', ctx);
  A.ankiMaybeSave(); A.ankiMaybeSave();
  assert.equal(saved.length, 1); assert.equal(saved[0][0], 'evolved');
  // bank/frac ne sont pas réglables de l'extérieur
  ctx.ankiClock.set({ bank: 1e9 }); assert.notEqual(a.clock.bank, 1e9);
});

test('src/anki.js : une ancienne sauvegarde sans global.anki est complétée sans rien perdre', { skip: !esbuild && 'esbuild absent' }, async () => {
  const { ctx } = await load();
  const a = ctx.ankiState();
  a.granted.base = 5000; a.perks.push('serie7'); a.clock.mode = 'cards';
  const again = ctx.ankiState();
  assert.equal(again.granted.base, 5000); assert.equal(JSON.stringify(again.perks), '["serie7"]'); assert.equal(again.clock.mode, 'cards');
});
