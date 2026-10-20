// Tests de anki-host.js (page dans l'add-on Anki bureau) avec un faux navigateur : node --test anki/host.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'anki-host.js'), 'utf8');

function browser(pathname, local, session) {
  class Storage {
    constructor(init) { this.m = new Map(Object.entries(init || {})); }
    getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
    setItem(k, v) { this.m.set(k, String(v)); }
    removeItem(k) { this.m.delete(k); }
  }
  const sent = [], written = [], timers = [];
  const w = {
    location: { pathname }, Storage, JSON, Object, Promise, String,
    document: { write: (h) => written.push(h) },
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    pycmd: (msg, cb) => { sent.push(JSON.parse(msg.slice(3))); if (cb) { cb({ ok: true }); } }
  };
  w.window = w;
  w.localStorage = new Storage(local);
  w.sessionStorage = new Storage(session);
  vm.runInNewContext(SRC, w);
  const tick = () => { while (timers.length) { timers.shift().fn(); } };
  return { w, sent, written, tick };
}

test('hors de l\'add-on : ne fait rien', () => {
  const b = browser('/index.html');
  assert.strictEqual(b.w.AnkiVillageHost, undefined);
  assert.strictEqual(b.written.length, 0);
});

test('première ouverture : la partie enregistrée est restaurée, save.js est chargé', () => {
  const b = browser('/_addons/evolve_village/index.html');
  assert.match(b.written[0], /user_files\/save\.js/);
  b.w.AnkiVillageHost.seed('PARTIE', '/profil/A');
  assert.strictEqual(b.w.localStorage.getItem('evolved'), 'PARTIE');
});

test('rechargement dans la même session : la partie en mémoire, plus récente, est gardée', () => {
  const b = browser('/_addons/e/index.html', { evolved: 'RECENTE', 'av-profile': '/profil/A' });
  b.w.AnkiVillageHost.seed('ANCIENNE', '/profil/A');
  assert.strictEqual(b.w.localStorage.getItem('evolved'), 'RECENTE');
});

test('autre profil Anki : sa propre partie remplace celle en mémoire', () => {
  const b = browser('/_addons/e/index.html', { evolved: 'DE_A', 'av-profile': '/profil/A' });
  b.w.AnkiVillageHost.seed(null, '/profil/B');
  assert.strictEqual(b.w.localStorage.getItem('evolved'), null);
});

test('sauvegarde d\'Evolve : envoyée à Python, puis au plus toutes les 10 s', () => {
  const b = browser('/_addons/e/index.html');
  b.w.localStorage.setItem('evolved', 'S1');
  b.tick();
  b.w.localStorage.setItem('evolved', 'S2');
  b.w.localStorage.setItem('evolved', 'S3');
  b.tick();
  assert.deepStrictEqual(b.sent.filter((m) => m.cmd === 'save').map((m) => m.data), ['S1', 'S3']);
  b.w.localStorage.setItem('autre', 'x');
  b.tick();
  assert.strictEqual(b.sent.filter((m) => m.cmd === 'save').length, 2);
});

test('remise à zéro : effacement envoyé, et l\'ancienne partie n\'est pas réinjectée au rechargement', () => {
  const b = browser('/_addons/e/index.html', { evolved: 'X', 'av-profile': '/profil/A' });
  b.w.localStorage.removeItem('evolved');
  assert.ok(b.sent.some((m) => m.cmd === 'clear'));
  // rechargement : même session, Python n'a peut-être pas encore effacé save.txt
  const again = browser('/_addons/e/index.html', { 'av-profile': '/profil/A' }, { 'av-cleared': '1' });
  again.w.AnkiVillageHost.seed('X', '/profil/A');
  assert.strictEqual(again.w.localStorage.getItem('evolved'), null);
});
