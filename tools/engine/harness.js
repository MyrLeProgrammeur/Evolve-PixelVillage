/* tools/engine/harness.js — loads the REAL game code (src/) in Node, without a browser.
 * esbuild (the repo's build tool) bundles the sources; a minimal fake browser (jQuery, document, Vue, localStorage) is enough.
 * Additions over the former tools/budget/load-game.js (which now re-exports this file):
 *  - $(plainObject or function) returns an array-like [arg] whose other methods absorb calls, so $(o)[0] === o;
 *  - new Vue(options) records its options in ctx.__vueCaptures (methods, data... of every vBind);
 *  - option seed: Math.random replaced by mulberry32(seed) inside the game context;
 *  - option storage: initial localStorage entries (e.g. { evolved: '<save JSON>' }; LZString is the identity here).
 * No npm dependency in the repo: NODE_PATH=~/outils/esbuild/node_modules. */
'use strict';
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');

function chain() {
  // absorbing object: every property is a function returning the same object (for $(...).x().y())
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
function arrayLike(o) {
  const base = { 0: o, length: 1 };
  const p = new Proxy(base, { get(t, k) {
    if (k in t) { return t[k]; }
    if (k === 'then' || typeof k === 'symbol') { return undefined; }
    return function () { return p; };
  } });
  return p;
}
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function makeContext(opts) {
  opts = opts || {};
  const store = new Map(Object.entries(opts.storage || {}));
  const absorb = chain();
  const strings = JSON.parse(fs.readFileSync(path.join(ROOT, 'strings', 'strings.json'), 'utf8'));
  const $ = new Proxy(function () {}, {
    apply(t, self, args) {
      const a = args[0];
      if (a !== null && (typeof a === 'function' || (typeof a === 'object' && !Array.isArray(a)))) { return arrayLike(a); }
      return absorb;
    },
    get(t, k) {
      if (k === 'getJSON') { return (u, cb) => { if (/strings\.json$/.test(u)) { cb(strings); } }; }
      if (k === 'ajaxSetup' || k === 'each') { return () => {}; }
      return absorb[k];
    }
  });
  const captures = [];
  const Vue = new Proxy(function Vue(options) { captures.push(options || {}); return absorb; }, {
    get(t, k) { return k === 'prototype' ? t.prototype : absorb[k]; }
  });
  const M = Object.create(Math);
  if (opts.seed != null) { M.random = mulberry32(opts.seed); }
  const ctx = {
    console: opts.console || { log() {}, warn() {}, error() {}, info() {} }, $, jQuery: $, Vue, document: chain(), __vueCaptures: captures,
    navigator: { userAgent: 'node', language: 'en-US' }, LZString: { compressToUTF16: (s) => s, decompressFromUTF16: (s) => s, compressToBase64: (s) => s },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    Worker: function () { return { addEventListener() {}, postMessage() {} }; },
    setTimeout: () => 0, setInterval: () => 0, clearTimeout() {}, clearInterval() {}, Date, Math: M, JSON, Promise, Intl
  };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  return ctx;
}

let esbuild = null;
function needEsbuild() { if (!esbuild) { esbuild = require('esbuild'); } return esbuild; }

// Cost functions only: the modules of src/main.js in the same order (Evolve's circular imports depend on it), without main.js.
async function loadGame(opts) {
  const mods = fs.readFileSync(path.join(ROOT, 'src', 'main.js'), 'utf8').split('\n')
    .map((l) => /^import .* from '\.\/([^']+)';/.exec(l)).filter(Boolean).map((m) => m[1]);
  const entry = mods.map((m) => "import './src/" + m + "';").join('\n') +
    "\nimport { global } from './src/vars.js'; import { actions } from './src/actions.js'; import { races } from './src/races.js'; export { global, actions, races };";
  const r = await needEsbuild().build({ stdin: { contents: entry, resolveDir: ROOT, loader: 'js' }, bundle: true, write: false, format: 'iife', globalName: 'EV', logLevel: 'silent' });
  const ctx = makeContext(opts);
  vm.createContext(ctx);
  vm.runInContext(r.outputFiles[0].text, ctx, { filename: 'evolve-budget.js' });
  return ctx.EV;
}

// The whole engine (src/main.js: fastLoop, midLoop, longLoop through execGameLoops) plus extra exports.
// extra: list of "export { a, b } from './src/x.js';" lines.
async function bootEngine(opts) {
  opts = opts || {};
  const src = "export * from './src/main.js'; export { global, webWorker } from './src/vars.js'; export { actions } from './src/actions.js';\n" + (opts.extra || []).join('\n');
  const r = await needEsbuild().build({ stdin: { contents: src, resolveDir: ROOT }, bundle: true, write: false, format: 'iife', globalName: 'EV', logLevel: 'silent' });
  const ctx = makeContext(opts);
  const ch = chain();
  Object.assign(ctx, { addEventListener() {}, removeEventListener() {}, location: { reload() {}, href: 'http://127.0.0.1/' }, matchMedia: () => ({ matches: false }), dataLayer: [] });
  for (const k of ['Sortable', 'Chart', 'Popper', 'Buefy', 'Image', 'Audio', 'gtag', 'requestAnimationFrame', 'alert', 'confirm', 'prompt']) { ctx[k] = ch; }
  ctx.performance = opts.performance || { now: () => Date.now() };
  vm.createContext(ctx);
  vm.runInContext(r.outputFiles[0].text, ctx, { filename: 'evolve-engine.js' });
  return ctx;
}

module.exports = { loadGame, bootEngine, makeContext, chain, mulberry32, ROOT };
