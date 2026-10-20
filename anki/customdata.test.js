/* Simule ce que fait Anki (ts/reviewer/answering.ts, applyStateTransform) autour de l'extrait B2. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const CD = require('./customdata.js');
const L = require('./ledger.js');

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const BUTTONS = ['again', 'hard', 'good', 'easy'];

/** Rejoue applyStateTransform : états en JSON, 4 copies du customData courant, exécution, ré-emballage. */
async function runSnippet(statesJson, currentCustomData, opts) {
  const o = opts || {};
  const pings = [];
  const parse = (s) => { try { return JSON.parse(s); } catch (e) { return {}; } };
  const customData = { again: parse(currentCustomData), hard: parse(currentCustomData), good: parse(currentCustomData), easy: parse(currentCustomData) };
  const fn = new AsyncFunction('states', 'customData', 'ctx', 'navigator', 'fetch', CD.snippet());
  const fakeFetch = (url) => { pings.push(url); return Promise.reject(new Error('hors ligne')); };
  await fn(statesJson, customData, {}, { userAgent: o.ua || 'Mozilla/5.0 (Linux; Android 14) AnkiDroid' }, fakeFetch);
  const packed = {}; for (const b of BUTTONS) { packed[b] = JSON.stringify(customData[b]); }
  return { packed, pings };
}
const reviewState = (days) => ({ current: { normal: { review: { scheduledDays: days, elapsedDays: days, easeFactor: 2.5, lapses: 0, leeched: false } }, customData: '' },
  again: { normal: { relearning: { review: { scheduledDays: 1 }, learning: {} } } }, hard: {}, good: {}, easy: {} });
const today = () => L.localAnkiDay(Date.now(), 4);

test('l\'extrait ne modifie aucun état de planification', async () => {
  const st = reviewState(30);
  const before = JSON.stringify(st);
  await runSnippet(st, '');
  assert.equal(JSON.stringify(st), before);
});

test('une valeur par bouton, jour et intervalle avant ; limites d\'Anki respectées', async () => {
  const { packed, pings } = await runSnippet(reviewState(30), '');
  BUTTONS.forEach((b, i) => {
    const cd = JSON.parse(packed[b]);
    assert.deepEqual(cd, { vd: today(), vf: i + 1, vp: 30 });
    assert.ok(packed[b].length <= 100);
    assert.ok(Object.keys(cd).every((k) => Buffer.byteLength(k) <= 8));
    assert.deepEqual(CD.factsFor(CD.parseCustomData(packed[b]), today()), { b: i + 1, p: 30 });
  });
  assert.deepEqual(pings, ['http://127.0.0.1:8765/api/anki/ping']);
});

test('deuxième passage le même jour : le premier bouton du jour est conservé', async () => {
  const first = (await runSnippet(reviewState(0), '')).packed.again;   // « À revoir » au premier passage
  const second = await runSnippet(reviewState(0), first);
  for (const b of BUTTONS) { assert.equal(JSON.parse(second.packed[b]).vf, 1); }
});

test('autres clés de customData conservées, carte filtrée, nouvelle carte, PC sans ping', async () => {
  const kept = await runSnippet(reviewState(5), '{"x":1}');
  assert.equal(JSON.parse(kept.packed.good).x, 1);
  const filtered = { current: { filtered: { rescheduling: { originalState: { review: { scheduledDays: 44 } } } } } };
  assert.equal(JSON.parse((await runSnippet(filtered, '')).packed.good).vp, 44);
  const fresh = { current: { normal: { new: { position: 3 } } } };
  assert.equal(JSON.parse((await runSnippet(fresh, '')).packed.good).vp, 0);
  const pc = await runSnippet(reviewState(5), '', { ua: 'Mozilla/5.0 (X11; Linux x86_64) Anki' });
  assert.equal(pc.pings.length, 0);
});

test('lecture : cards.data de la base et colonne custom_data du provider', () => {
  assert.deepEqual(CD.customDataFromCardData('{"pos":3,"lrt":1791837143,"cd":"{\\"vd\\":20746,\\"vf\\":3,\\"vp\\":12}"}'), { vd: 20746, vf: 3, vp: 12 });
  assert.equal(CD.customDataFromCardData('{"pos":1159038,"lrt":1791837143}'), null);
  assert.equal(CD.parseCustomData(''), null);
  assert.equal(CD.factsFor({ vd: 20745, vf: 3 }, 20746), null);          // clés d'un autre jour : ignorées
  assert.deepEqual(CD.factsFor({ vd: 20746, vf: 9, vp: -1 }, 20746), {});  // valeurs invalides ignorées
});
