/* tools/budget/era-budget.js — B6 : budget en ressources de l'ère 0 et de l'ère 1 (humain), calculé avec les
 * VRAIES fonctions de coût du jeu (src/), puis taux cartes -> ressources pour viser 6 à 10 semaines.
 *
 *   NODE_PATH=~/outils/esbuild/node_modules node tools/budget/era-budget.js [--lambda=10] [--json]
 *
 * Hypothèses (toutes affichées dans la sortie) :
 *  - Ère 0 : chaque étape une fois ; plafonds RNA/DNA achetés au coût minimal pour payer `sentience` (300/300) ;
 *    producteurs (organelles, nucleus) en nombre N par scénario.
 *  - Ère 1 = techs des ères `primitive` et `civilized` atteignables par l'humain dans l'univers standard :
 *    point fixe sur reqs / trait / not_trait / condition() du jeu ; branches exclusives : une seule gardée.
 *  - Bâtiments : tous ceux que l'état final de l'ère 1 débloque, achetés tant que le prix du suivant reste
 *    <= lambda x le prix du premier (règle d'arrêt : au-delà, un exemplaire de plus coûte plus de lambda
 *    « premiers »). lambda = 5 / 10 / 20 pour trois scénarios ; plafond de sécurité 40 exemplaires.
 *  - Crédits par jour : module anki/ledger.js, règles par défaut (pleine valeur jusqu'à 50, puis concave). */
'use strict';
const { loadGame } = require('./load-game.js');
const L = require('../../anki/ledger.js');

const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? Number(a.split('=')[1]) : d; };

function addCost(acc, cost) { for (const k of Object.keys(cost)) { acc[k] = (acc[k] || 0) + cost[k]; } return acc; }
function evalCost(costObj, offset) {
  const out = {};
  for (const r of Object.keys(costObj || {})) {
    let v = 0; try { v = typeof costObj[r] === 'function' ? costObj[r](offset) : costObj[r]; } catch (e) { v = NaN; }
    if (typeof v === 'number' && v > 0) { out[r] = v; }
  }
  return out;
}
const round = (x) => Math.round(x);

async function main() {
  const EV = await loadGame();
  const g = EV.global, A = EV.actions;

  // ---------------------------------------------------------------- Ère 0 (protoplasme -> humain)
  const era0 = { steps: {}, caps: {}, producers: {} };
  const steps = ['sexual_reproduction', 'phagocytosis', 'multicellular', 'bilateral_symmetry', 'mammals', 'humanoid', 'sentience'];
  g.evolution = g.evolution || {};
  const setCount = (k, n) => { g.evolution[k] = { count: n }; };
  function linearTotal(k, n) { const acc = {}; for (let i = 0; i < n; i++) { setCount(k, i); addCost(acc, evalCost(A.evolution[k].cost)); } setCount(k, 0); return acc; }
  // Plafonds : RNA = 100 + m*(5 + 5k), DNA = 100 + e*(10 + 10k), k = mitochondries (src/main.js midLoop)
  let best = null;
  for (let k = 0; k <= 10; k++) {
    const m = Math.ceil(200 / (5 + 5 * k)), e = Math.ceil(200 / (10 + 10 * k));
    const c = addCost(addCost(linearTotal('membrane', m), linearTotal('eukaryotic_cell', e)), linearTotal('mitochondria', k));
    const tot = (c.RNA || 0) + (c.DNA || 0);
    if (!best || tot < best.tot) { best = { k, m, e, c, tot }; }
  }
  era0.caps = { membrane: best.m, eukaryotic_cell: best.e, mitochondria: best.k, cost: best.c };
  const stepCost = {};
  for (const s of steps) { const c = evalCost(A.evolution[s].cost); era0.steps[s] = c; addCost(stepCost, c); }

  // ---------------------------------------------------------------- Ère 1 (humain)
  g.race = Object.assign({}, g.race, { species: 'human', universe: 'standard' });
  if (EV.races && EV.races.human) { Object.assign(g.race, EV.races.human.traits); }
  g.tech = {};   // première partie : theology 1 n'est conservé qu'après un prestige (src/vars.js:2258), sa chaîne est donc exclue
  g.city = g.city || {};
  const exclusive = [['fanaticism', 'anthropology'], ['alt_fanaticism', 'alt_anthropology']];
  const skip = new Set();
  const era1Techs = Object.entries(A.tech).filter(([, v]) => v.era === 'primitive' || v.era === 'civilized');
  function ok(v) {
    for (const [k, l] of Object.entries(v.reqs || {})) { if ((g.tech[k] || 0) < l) { return false; } }
    if (v.grant && (g.tech[v.grant[0]] || 0) >= v.grant[1]) { return false; }
    if (v.not_trait && v.not_trait.some((t) => g.race[t])) { return false; }
    if (v.trait && !v.trait.some((t) => g.race[t])) { return false; }
    if (v.not_tech && v.not_tech.some((t) => g.tech[t])) { return false; }
    if (typeof v.condition === 'function') { try { if (!v.condition()) { return false; } } catch (e) { return false; } }
    return true;
  }
  const bought = []; const techCost = {};
  for (let changed = true; changed;) {
    changed = false;
    for (const [k, v] of era1Techs) {
      if (skip.has(k) || bought.includes(k) || !ok(v)) { continue; }
      const c = evalCost(v.cost); bought.push(k); addCost(techCost, c);
      g.tech[v.grant[0]] = Math.max(g.tech[v.grant[0]] || 0, v.grant[1]);
      for (const pair of exclusive) { if (pair.includes(k)) { pair.forEach((x) => { if (x !== k) { skip.add(x); } }); } }
      changed = true;
    }
  }
  // Bâtiments débloqués par l'état final
  const city = Object.entries(A.city).filter(([k, v]) => v && v.cost && !/^(food|lumber|stone|chrysotile|slaughter|horseshoe|s_alter|gift)$/.test(k) && ok(Object.assign({}, v, { grant: null })));
  const scenarios = [5, 10, 20].map((lambda) => {
    const tot = {}; const counts = {}; const per = {};
    for (const [k, v] of city) {
      g.city[k] = { count: 0, on: 0 };
      const first = evalCost(v.cost, 0);
      const main = Object.keys(first).sort((a, b) => first[b] - first[a])[0];
      if (!main) { continue; }
      let n = 0;
      while (n < 40) {
        g.city[k].count = n;
        const c = evalCost(v.cost, 0);
        if (n > 0 && !(c[main] <= lambda * first[main])) { break; }
        addCost(tot, c); addCost(per[k] = per[k] || {}, c); n++;
      }
      g.city[k].count = 0; counts[k] = n;
    }
    return { lambda, counts, cost: tot, per };
  });

  // ---------------------------------------------------------------- Crédits et taux
  // Règles v2 : crédits pleins par jour, aube comprise (L.dayValue), sans le bonus de journée accomplie.
  const PROFILES = [10, 30, 60, 150, 400];
  const perDay = (K) => L.dayValue(Math.min(K, 9999)) / 1000;
  const perDayAll = {}; for (const K of PROFILES) { perDayAll[K] = perDay(K); }
  // Référence (GD §3.8) : ère 1 en 8 semaines à 60 cartes/jour ; ère 0 en 4 jours d'étude à 60 cartes/jour.
  const plans = [{ K: REF.cards, W: REF.weeks, credits: round(7 * REF.weeks * perDay(REF.cards)) }];
  const era0Credits = round(REF.era0Days * perDay(REF.cards));
  return { era0, stepCost, bought, techCost, scenarios, plans, perDay: perDayAll, era0Credits };
}

const REF = { cards: 60, weeks: 8, era0Days: 4 };

function table(res) {
  const out = [];
  const fmt = (o) => Object.keys(o).sort().map((k) => k + ' ' + round(o[k]).toLocaleString('fr-FR')).join(' · ');
  out.push('## Ère 0 (calculé avec actions.evolution du jeu)');
  out.push('- Étapes (une fois chacune) : ' + fmt(res.stepCost));
  out.push('- Plafonds au coût minimal pour payer sentience (300 RNA / 300 DNA) : ' + res.era0.caps.membrane + ' membranes, ' + res.era0.caps.eukaryotic_cell +
    ' cellules eucaryotes, ' + res.era0.caps.mitochondria + ' mitochondries → ' + fmt(res.era0.caps.cost));
  const e0 = addCost(addCost({}, res.stepCost), res.era0.caps.cost);
  out.push('- **Total ère 0 hors producteurs : ' + fmt(e0) + '**');
  out.push('');
  out.push('## Ère 1, humain (calculé : point fixe sur les conditions du jeu)');
  out.push('- ' + res.bought.length + ' techs atteignables : ' + res.bought.join(', '));
  out.push('- Coût des techs : ' + fmt(res.techCost));
  for (const s of res.scenarios) {
    out.push('- Bâtiments, λ = ' + s.lambda + ' (' + Object.entries(s.counts).filter(([, n]) => n > 0).map(([k, n]) => k + '×' + n).join(', ') + ') : ' + fmt(s.cost));
    const noHosp = {}; for (const [k, c] of Object.entries(s.per)) { if (k !== 'hospital') { addCost(noHosp, c); } }
    out.push('  - dont hôpitaux : ' + fmt(s.per.hospital || {}) + ' ; **sans hôpitaux : ' + fmt(noHosp) + '**');
  }
  out.push('');
  out.push('## Crédits disponibles (règles v2 du module B3 : aube 75, pleine valeur jusqu\'à 60, soft 10)');
  out.push('crédits pleins/jour : ' + Object.keys(res.perDay).map((K) => K + ' cartes → ' + res.perDay[K]).join(' ; '));
  for (const p of res.plans) { out.push('- référence ' + p.K + ' cartes/jour, ' + p.W + ' semaines : ' + p.credits.toLocaleString('fr-FR') + ' crédits'); }
  const refCredits = res.plans[0].credits;
  out.push('- semaines pour ces crédits (régularité parfaite, sans journée accomplie) : ' + Object.keys(res.perDay).map((K) =>
    K + ' cartes/j → ' + (refCredits / (7 * res.perDay[K])).toFixed(1)).join(' ; '));
  // Taux proposés. Budget de référence ère 1 = techs + bâtiments λ = 10 sans hôpitaux.
  const ref = res.scenarios.find((x) => x.lambda === 10);
  const era1 = addCost({}, res.techCost);
  for (const [k, c] of Object.entries(ref.per)) { if (k !== 'hospital') { addCost(era1, c); } }
  const NOBLE = ['Copper', 'Iron', 'Cement', 'Coal', 'Steel', 'Wrought_Iron', 'Sheet_Metal', 'Aluminium'];
  const PHI = 0.5, NOBLE_SHARE = 0.2;
  out.push('');
  out.push('## Taux proposés (calculés ; hypothèses : crédit direct = ' + (PHI * 100) + ' % du budget, le reste par la production des ticks ;');
  out.push('nobles = ' + NOBLE.join(', ') + ', payés par les crédits nobles, supposés = ' + (NOBLE_SHARE * 100) + ' % des crédits de base sur la période)');
  out.push('Budget de référence ère 1 (techs + bâtiments λ = 10, sans hôpitaux) : ' + fmt(era1));
  const keys = Object.keys(era1).filter((r) => era1[r] >= 100).sort();
  out.push('');
  out.push('| cartes/j | semaines | crédits | ' + keys.map((r) => r + (NOBLE.includes(r) ? ' (noble)' : '')).join(' | ') + ' |');
  out.push('|' + '---|'.repeat(3 + keys.length));
  for (const p of res.plans) {
    out.push('| ' + p.K + ' | ' + p.W + ' | ' + p.credits + ' | ' + keys.map((r) => {
      const per = PHI * era1[r] / (NOBLE.includes(r) ? NOBLE_SHARE * p.credits : p.credits);
      return per >= 10 ? round(per) : per.toFixed(1);
    }).join(' | ') + ' |');
  }
  out.push('');
  out.push('Ère 0 en ' + REF.era0Days + ' jours d\'étude à ' + REF.cards + ' cartes/j = ' + res.era0Credits + ' crédits, crédit direct = 100 % : RNA ' +
    (e0.RNA / res.era0Credits).toFixed(2) + ', DNA ' + (e0.DNA / res.era0Credits).toFixed(2) + ' par crédit');
  return out.join('\n');
}

if (require.main === module) {
  main().then((res) => {
    if (args.includes('--json')) { console.log(JSON.stringify(res, null, 1)); } else { console.log(table(res)); }
  }).catch((e) => { console.error(e.stack); process.exitCode = 1; });
}
module.exports = { main };
