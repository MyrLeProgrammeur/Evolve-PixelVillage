/* node --test anki/ — tests du module de comptabilité (zéro dépendance). */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./ledger.js');

const H = 3600000;
// Paris, heure d'été : +120 min. Jour 20742 = 16 oct. 2026 (local), il commence à 04:00 locale = 02:00 UTC.
const D0 = 20742;
const startUtc = (day) => day * 86400000 + 2 * H; // 04:00 locale (UTC+2) du jour Anki `day`
let seq = 0;
function rv(cid, day, extra) {
  const t = (extra && extra.t) || startUtc(day) + H + (seq++) * 1000;
  return Object.assign({ v: 1, k: 'review', id: 'rv:' + t, src: 'revlog', t: t, day: day, cid: cid, did: 1, b: 3, p: 0, ivl: 1, rt: 1 }, extra || {}, { t: t });
}
function shuffle(a, seed) { const r = a.slice(); let s = seed; for (let i = r.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = s % (i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; }

test('jour Anki : bascule à 4 h locale, fuseau explicite', () => {
  const at = (h, m) => Date.UTC(2026, 9, 16, h - 2, m); // heure locale Paris (UTC+2)
  assert.equal(L.ankiDay(at(3, 59), 4, 120), D0 - 1);
  assert.equal(L.ankiDay(at(4, 0), 4, 120), D0);
  assert.equal(L.ankiDay(at(23, 59), 4, 120), D0);
  assert.equal(L.ankiDay(at(23, 59) + 4 * H, 4, 120), D0);      // 03:59 le lendemain
  assert.equal(L.ankiDay(at(23, 59) + 4 * H + 60000, 4, 120), D0 + 1);
  // Valeur réelle constatée : révision du 16 oct. 2026 23:34 CEST
  assert.equal(L.ankiDay(1792186451743, 4, 120), 20742);
  // Création de la collection (crt) : 9 oct. 04:00 CEST
  assert.equal(L.ankiDay(1791511200000, 4, 120), 20735);
});

test('une seule récompense par (carte, jour), quel que soit le nombre de réponses', () => {
  const ev = [rv(1, D0, { rt: 0, nw: 1, b: 1 }), rv(1, D0, { rt: 0, b: 3 }), rv(1, D0, { rt: 0, b: 3 }), rv(1, D0 + 1), rv(2, D0)];
  const r = L.replay(ev);
  assert.equal(r.totals.credits, 3);
  assert.equal(r.days.find(d => d.day === D0).credits, 2);
  assert.equal(r.credits.find(c => c.cid === 1 && c.day === D0).answers, 3);
});

test('la base ne dépend pas du bouton', () => {
  const mk = (b) => [1, 2, 3, 4, 5].map((cid) => rv(cid, D0, { b: b, t: startUtc(D0) + cid * 1000 }));
  const vals = [1, 2, 3, 4].map((b) => L.replay(mk(b)).totals.base);
  assert.deepEqual(vals, [42500, 42500, 42500, 42500]);            // 5 crédits + aube 5 × 7,5
});

test('déterminisme : même résultat quel que soit l\'ordre d\'arrivée', () => {
  const ev = [];
  for (let d = 0; d < 6; d++) { for (let c = 0; c < 70; c++) { ev.push(rv(c, D0 + d, { nw: d === 0 ? 1 : 0, p: d * 5, b: 1 + (c % 4) })); } }
  ev.push({ v: 1, k: 'state', id: 'st:' + D0, t: startUtc(D0), day: D0, dueMorning: 30 });
  const ref = JSON.stringify(L.replay(ev, null, { epoch: startUtc(D0 + 2) }));
  for (const s of [1, 7, 42, 99]) {
    assert.equal(JSON.stringify(L.replay(shuffle(ev, s), null, { epoch: startUtc(D0 + 2) })), ref);
  }
});

test('deux sources pour la même (carte, jour) : un seul crédit, les champs du revlog priment', () => {
  const a = rv(7, D0, { p: 30, b: 1, t: startUtc(D0) + 5000 });
  const pv = { v: 1, k: 'review', id: 'pv:7:x', src: 'provider', t: startUtc(D0) + 9000, day: D0, cid: 7, did: 1, ivl: 2 };
  for (const ev of [[a, pv], [pv, a]]) {
    const r = L.replay(ev);
    assert.equal(r.totals.credits, 1);
    const c = r.credits[0];
    assert.equal(c.src, 'revlog'); assert.equal(c.p, 30); assert.equal(c.b, 1); assert.equal(c.t, a.t);
  }
});

test('rendement décroissant : formes flat, sqrt, cap, plafond dur', () => {
  const flat = { diminishing: { shape: 'flat' } };
  assert.equal(L.cumulative(200, flat), 200000);
  const sq = { diminishing: { shape: 'sqrt', full: 50, soft: 50 } };
  assert.equal(L.cumulative(50, sq), 50000);
  const extra = L.cumulative(50 + 150, sq) - 50000;                   // 3s de plus valent ~2s
  assert.ok(Math.abs(extra - 100000) < 100, 'obtenu ' + extra);
  let prev = Infinity;
  for (let r = 1; r <= 400; r++) { const m = L.marginal(r, sq); assert.ok(m <= prev && m > 0, 'rang ' + r); prev = m; }
  assert.equal(L.marginal(51, sq), 995);                               // juste après la pleine valeur
  const cap = { diminishing: { shape: 'cap', full: 30 } };
  assert.equal(L.cumulative(100, cap), 30000);
  const hard = { diminishing: { shape: 'flat', hardCap: 120 } };
  assert.equal(L.marginal(121, hard), 0);
  assert.throws(() => L.cumulative(60, { diminishing: { shape: 'bizarre', full: 1 } }));
  // Le rejeu applique le rang du jour, remis à zéro chaque jour
  const ev = [];
  for (let c = 0; c < 80; c++) { ev.push(rv(c, D0, { t: startUtc(D0) + c * 1000 })); ev.push(rv(c, D0 + 1, { t: startUtc(D0 + 1) + c * 1000 })); }
  const r = L.replay(ev, sq);
  assert.equal(r.days[0].base, L.dayValue(80, sq));
  assert.equal(r.days[1].base, L.dayValue(80, sq));
});

test('nouvelles cartes plafonnées par jour, sans compter dans le rang', () => {
  const ev = [];
  for (let c = 0; c < 25; c++) { ev.push(rv(c, D0, { nw: 1, rt: 0, t: startUtc(D0) + c * 1000 })); }
  ev.push(rv(100, D0, { t: startUtc(D0) + 99000 }));
  const r = L.replay(ev, { diminishing: { shape: 'flat' } });
  const d = r.days[0];
  assert.equal(d.newPaid, 20); assert.equal(d.newCapped, 5); assert.equal(d.credits, 26);
  assert.equal(d.base, 21000 + 10 * 7500);                         // + aube sur les 10 premiers payés
  assert.equal(r.credits.find(c => c.cid === 100).rank, 21);
});

test('noble : seulement si l\'intervalle avant est >= 21 j ; bouton ignoré par défaut', () => {
  const ev = [rv(1, D0, { p: 20 }), rv(2, D0, { p: 21, b: 1 }), rv(3, D0, { p: 400, b: 4 })];
  const r = L.replay(ev);
  assert.equal(r.totals.noble, 2000);
  assert.equal(r.days[0].lapseMature, 1);
  const strict = L.replay(ev, { noble: { requiresSuccess: true } });
  assert.equal(strict.totals.noble, 1000);
  const capped = L.replay(ev, { noble: { dailyCap: 1 } });
  assert.equal(capped.totals.noble, 1000);
});

test('types exclus (filtré, manuel) et réponses trop rapides', () => {
  const ev = [rv(1, D0, { rt: 3 }), rv(2, D0, { rt: 4, b: 0 }), rv(3, D0, { rt: 3, t: startUtc(D0) + 10 }), rv(3, D0, { rt: 1, t: startUtc(D0) + 20 })];
  const r = L.replay(ev);
  assert.equal(r.totals.credits, 1);
  assert.equal(r.days[0].excluded, 2);
  const fast = L.replay([rv(1, D0, { ms: 900 }), rv(2, D0, { ms: 2000 }), rv(3, D0)], { minAnswerMs: 1500 });
  assert.equal(fast.totals.credits, 2);
});

test('epoch : les révisions d\'avant la partie comptent dans le rang mais ne paient pas', () => {
  const ev = [];
  for (let c = 0; c < 60; c++) { ev.push(rv(c, D0, { t: startUtc(D0) + c * 1000 })); }
  const epoch = startUtc(D0) + 55 * 1000;
  const r = L.replay(ev, null, { epoch });
  assert.equal(r.totals.paidCredits, 5);
  assert.equal(r.totals.base, L.cumulative(60) - L.cumulative(55));
});

test('registre de maturation : une fois par carte et par seuil, pour toujours', () => {
  const ev = [rv(1, D0, { p: 10 }), rv(1, D0 + 10, { p: 25 }), rv(1, D0 + 40, { p: 60 }), rv(1, D0 + 100, { p: 200 }),
    rv(2, D0, { p: 400 })];
  const r = L.replay(ev);
  assert.deepEqual(r.maturedCount, { 21: 2, 180: 2, 365: 1 });
  assert.deepEqual(r.credits.find(c => c.cid === 2).maturations, [21, 180, 365]);
  assert.equal(r.credits.find(c => c.cid === 1 && c.day === D0 + 40).maturation, undefined);
  assert.equal(r.credits.find(c => c.cid === 1 && c.day === D0 + 100).maturation, 180);
});

test('série douce : jokers par semaine, jour en cours, meilleure série, chaleur, bonus permanents', () => {
  const day = (d, n) => Array.from({ length: n }, (_, c) => rv(c, d, { t: startUtc(d) + c * 1000 }));
  // lundi 2026-10-12 = jour 20738. 5 jours comptés, 1 trou (joker), 2 comptés, puis 3 trous de suite
  const L0 = 20738;
  let ev = [];
  for (const d of [0, 1, 2, 3, 4, 6, 7]) { ev = ev.concat(day(L0 + d, 12)); }
  let r = L.replay(ev, null, { today: L0 + 7 });
  assert.equal(r.streak.current, 7); assert.equal(r.streak.jokersUsed, 1); assert.equal(r.streak.best, 7);
  assert.ok(r.perks.includes('serie7'));
  r = L.replay(ev, null, { today: L0 + 8 });               // aujourd'hui pas encore fait : rien ne casse
  assert.equal(r.streak.current, 7);
  const h0 = r.streak.heat;
  r = L.replay(ev, null, { today: L0 + 12 });               // semaine suivante : 2 jokers puis rupture
  assert.equal(r.streak.jokersUsed, 3); assert.equal(r.streak.current, 0); assert.equal(r.streak.best, 7);
  assert.ok(r.streak.heat < h0 && r.streak.heat > 0);
  assert.ok(r.perks.includes('serie7'));                     // jamais retiré
  // jour avec trop peu de crédits : non compté, sauf si les dues du matin étaient moins nombreuses
  const few = day(L0, 4);
  assert.equal(L.replay(few, null, { today: L0 }).days[0].counted, false);
  assert.equal(L.replay(few.concat([{ k: 'state', id: 's', t: startUtc(L0), day: L0, dueMorning: 3 }]), null, { today: L0 }).days[0].counted, true);
  // aucune due le matin : il faut quand même au moins une carte (définition commune C/D)
  const zero = [{ k: 'state', id: 'z', t: startUtc(L0 + 1), day: L0 + 1, dueMorning: 0 }];
  assert.equal(L.replay(day(L0, 12).concat(zero), null, { today: L0 + 2 }).streak.jokersUsed, 1);
  assert.equal(L.replay(day(L0, 12).concat(zero, day(L0 + 1, 1)), null, { today: L0 + 1 }).streak.current, 2);
});

test('versement monotone : rien n\'est repris, rien n\'est payé deux fois', () => {
  const ev = [rv(1, D0), rv(2, D0), rv(3, D0, { p: 30 })];
  const r = L.replay(ev);
  let s = L.settle(r, { base: 0, noble: 0 });
  assert.deepEqual(s.delta, { base: 3000 + 3 * 7500, noble: 1000 });
  s = L.settle(r, s.granted);
  assert.deepEqual(s.delta, { base: 0, noble: 0 });
  const shorter = L.replay(ev.slice(0, 1));                  // journal perdu en partie
  const s2 = L.settle(shorter, s.granted);
  assert.deepEqual(s2.delta, { base: 0, noble: 0 });
  assert.deepEqual(s2.granted, s.granted);
  const r2 = L.replay(ev.concat([rv(4, D0)]));
  assert.deepEqual(L.settle(r2, s.granted).delta, { base: 1000 + 7500, noble: 0 });
  assert.equal(L.newCredits(r, r2).length, 1);
});

test('montants entiers partout', () => {
  const ev = [];
  for (let c = 0; c < 333; c++) { ev.push(rv(c, D0, { p: c % 50 })); }
  const r = L.replay(ev);
  for (const c of r.credits) { assert.ok(Number.isInteger(c.base) && Number.isInteger(c.noble)); }
  assert.ok(Number.isInteger(r.totals.base));
});

test('v2 : aube de 75 sur les 10 premiers crédits payés, jamais de noble', () => {
  const day = (n, extra) => Array.from({ length: n }, (_, c) => rv(c, D0, Object.assign({ t: startUtc(D0) + c * 1000 }, extra)));
  assert.equal(L.replay(day(10)).totals.base, 85000);                // 10 cartes = 85 crédits
  assert.equal(L.replay(day(5)).totals.base, 5000 + 5 * 7500);
  assert.equal(L.replay(day(60)).totals.base, 135000);               // 60 cartes = 135 crédits
  assert.equal(L.dayValue(60), 135000);
  assert.ok(L.dayValue(150) - L.dayValue(149) < 400);               // crépuscule raide (soft 10)
  const mature = L.replay(day(10, { p: 30 }));
  assert.equal(mature.days[0].dawn, 75000);
  assert.equal(mature.totals.noble, 10000);                          // noble par carte, aube exclue
  // l'ordre d'arrivée ne change rien
  assert.equal(JSON.stringify(L.replay(shuffle(day(30), 5))), JSON.stringify(L.replay(day(30))));
});

test('v2 : nobles décroissants, cartes mûres en tête', () => {
  const ev = [];
  for (let c = 0; c < 40; c++) { ev.push(rv(c, D0, { t: startUtc(D0) + c * 1000 })); }            // 40 jeunes d'abord
  for (let c = 40; c < 120; c++) { ev.push(rv(c, D0, { p: 30, t: startUtc(D0) + c * 1000 })); }  // 80 mûres ensuite
  const r = L.replay(ev);
  assert.equal(r.totals.noble, L.cumulative(80));                    // rang noble = rang parmi les mûres seules
  const flat = L.replay(ev, { noble: { shape: 'flat' } });
  assert.equal(flat.totals.noble, 80000);
});

test('v2 : journée accomplie, payée une fois, après le début de la partie seulement', () => {
  const done = (d, id) => ({ v: 1, k: 'done', id: id || 'dn:x:' + d, t: startUtc(d) + 5 * H, day: d, dueMorning: 8 });
  const ev = [rv(1, D0), rv(2, D0), done(D0), done(D0, 'dn:y:' + D0)];
  const r = L.replay(ev);
  assert.equal(r.days[0].done, 15000);
  assert.equal(r.totals.base, 2000 + 2 * 7500 + 15000);
  const later = L.replay(ev, null, { epoch: startUtc(D0 + 1) });
  assert.equal(later.totals.base, 0);
  // jour accompli sans aucune révision créditée (tout fait ailleurs, exclu) : le bonus reste un jour à part
  assert.equal(L.replay([done(D0 + 3)]).totals.base, 15000);
});
