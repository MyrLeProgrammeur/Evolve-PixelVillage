/* tools/budget/load-game.js — charge le VRAI code du jeu (src/actions.js, src/vars.js) dans Node, sans navigateur,
 * pour évaluer les fonctions de coût telles que le jeu les calcule. esbuild (outil de construction du dépôt)
 * empaquette les sources ; un faux navigateur minimal (jQuery, document, Vue, localStorage) suffit au chargement.
 * Aucune dépendance npm dans le dépôt : NODE_PATH=~/outils/esbuild/node_modules. */
'use strict';
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');

function chain() {
  // Objet « absorbant » : toute propriété est une fonction qui renvoie le même objet (pour $(...).x().y()).
  const f = function () { return p; };
  const p = new Proxy(f, {
    get(t, k) {
      if (k === Symbol.toPrimitive) { return () => ''; }
      if (k === 'length') { return 0; }
      if (k === 'then') { return undefined; }
      return p;
    },
    apply() { return p; }, construct() { return p; }
  });
  return p;
}

function makeContext() {
  const store = new Map();
  const $ = chain();
  const strings = JSON.parse(fs.readFileSync(path.join(ROOT, 'strings', 'strings.json'), 'utf8'));
  const jq = new Proxy($, { get(t, k) {
    if (k === 'getJSON') { return (u, cb) => { if (/strings\.json$/.test(u)) { cb(strings); } }; }
    if (k === 'ajaxSetup' || k === 'each') { return () => {}; }
    return $[k];
  } });
  const ctx = {
    console: { log() {}, warn() {}, error() {}, info() {} }, $: jq, jQuery: jq, Vue: chain(), document: chain(),
    navigator: { userAgent: 'node', language: 'en-US' }, LZString: { compressToUTF16: (s) => s, decompressFromUTF16: (s) => s, compressToBase64: (s) => s },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    Worker: function () { return { addEventListener() {}, postMessage() {} }; },
    setTimeout: () => 0, setInterval: () => 0, clearTimeout() {}, clearInterval() {}, Date, Math, JSON, Promise, Intl
  };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  return ctx;
}

async function loadGame() {
  const esbuild = require('esbuild');
  // Mêmes modules, dans le même ordre que src/main.js (les imports circulaires d'Evolve dépendent de cet ordre).
  const mods = fs.readFileSync(path.join(ROOT, 'src', 'main.js'), 'utf8').split('\n')
    .map((l) => /^import .* from '\.\/([^']+)';/.exec(l)).filter(Boolean).map((m) => m[1]);
  const entry = mods.map((m) => "import './src/" + m + "';").join('\n') +
    "\nimport { global } from './src/vars.js'; import { actions } from './src/actions.js'; import { races } from './src/races.js'; export { global, actions, races };";
  const r = await esbuild.build({ stdin: { contents: entry, resolveDir: ROOT, loader: 'js' }, bundle: true, write: false, format: 'iife', globalName: 'EV', logLevel: 'silent' });
  const ctx = makeContext();
  vm.createContext(ctx);
  vm.runInContext(r.outputFiles[0].text, ctx, { filename: 'evolve-budget.js' });
  return ctx.EV;
}

module.exports = { loadGame, makeContext, ROOT };
