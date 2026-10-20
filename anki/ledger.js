/* anki/ledger.js — comptabilité anti-triche des révisions Anki (module pur, zéro dépendance).
 *
 * État = rejeu d'un journal d'événements (rapport 7 §3.2). Aucune entrée-sortie, aucun hasard,
 * aucune horloge : le même journal et les mêmes règles donnent toujours le même résultat,
 * quel que soit l'ordre d'arrivée des événements. Montants en unités entières (millièmes).
 *
 * Règles (rapport 7 §1.3) :
 *  - une récompense par (carte, jour Anki), bascule à 4 h, fuseau local ;
 *  - la base ne dépend pas du bouton ;
 *  - rendement décroissant par jour (forme et paramètres configurables) ;
 *  - matériau noble seulement si l'intervalle AVANT la réponse est >= 21 jours ;
 *  - rien ne se perd : ce qui a été versé n'est jamais repris (settle est monotone).
 *
 * Utilisable dans Node (require) et dans la page (window.AnkiLedger).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.AnkiLedger = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DAY_MS = 86400000;

  const DEFAULT_RULES = {
    version: 1,
    rolloverHour: 4,
    unit: 1000,                       // valeur d'un crédit plein, en millièmes
    // Rendement décroissant de la base, par jour Anki, selon le rang du crédit dans la journée.
    //  flat : toujours `unit` ; sqrt : `unit` jusqu'à `full`, puis C(m) = 2*unit*(sqrt(s*(s+m)) - s)
    //  (pente 1 au départ, 3s crédits en plus valent 2s) ; cap : `unit` jusqu'à `full`, puis 0.
    //  hardCap (> 0) : aucun crédit payé au-delà de ce rang, quelle que soit la forme.
    diminishing: { shape: 'sqrt', full: 50, soft: 50, hardCap: 0 },
    newCap: 20,                       // nouvelles cartes payées par jour, au plus
    minAnswerMs: 0,                   // 0 = pas de filtre ; 1500 = règle 8 du rapport 7 (revlog seulement)
    excludeTypes: [3, 4, 5],          // revlog.type : 3 filtrée sans replanif, 4 manuelle, 5 replanifiée
    noble: { minIvl: 21, value: 1000, requiresSuccess: false, dailyCap: 0 },
    maturity: [21, 180, 365],         // seuils du registre de maturation (une fois par carte et par seuil)
    day: { min: 10 },                 // jour compté si crédits >= min(day.min, dues du matin)
    streak: { jokersPerWeek: 2 },
    heat: { max: 1000, up: 7, down: 14 },
    perks: [                          // bonus permanents débloqués par la meilleure série (jamais retirés)
      { id: 'serie3', best: 3 }, { id: 'serie7', best: 7 }, { id: 'serie14', best: 14 },
      { id: 'serie30', best: 30 }, { id: 'serie60', best: 60 }, { id: 'serie100', best: 100 }
    ],
    srcPriority: { revlog: 0, customdata: 1, provider: 2 }
  };

  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  function mergeRules(base, over) {
    const out = {};
    for (const k of Object.keys(base)) {
      out[k] = isObj(base[k]) && isObj(over && over[k]) ? mergeRules(base[k], over[k])
        : (over && over[k] !== undefined ? over[k] : base[k]);
    }
    if (over) { for (const k of Object.keys(over)) { if (!(k in out)) { out[k] = over[k]; } } }
    return out;
  }
  function rulesOf(r) { return mergeRules(DEFAULT_RULES, r || {}); }

  /** Jour Anki : numéro du jour civil local de (t - bascule), depuis le 1970-01-01.
   *  offsetMinutes = décalage local à cet instant (+120 en heure d'été de Paris), soit -Date#getTimezoneOffset(). */
  function ankiDay(ms, rolloverHour, offsetMinutes) {
    const r = rolloverHour === undefined ? 4 : rolloverHour;
    return Math.floor((ms + (offsetMinutes || 0) * 60000 - r * 3600000) / DAY_MS);
  }
  /** Même chose avec le fuseau de la machine (non pur : à n'utiliser qu'aux bords, capteur ou page). */
  function localAnkiDay(ms, rolloverHour) {
    return ankiDay(ms, rolloverHour, -new Date(ms).getTimezoneOffset());
  }
  /** Semaine commençant le lundi (le jour 4 = lundi 1970-01-05). */
  function weekOf(day) { return Math.floor((day + 3) / 7); }

  /** Racine carrée entière exacte (floor), déterministe. */
  function isqrt(n) {
    if (n <= 0) { return 0; }
    let x = Math.floor(Math.sqrt(n));
    while (x * x > n) { x--; }
    while ((x + 1) * (x + 1) <= n) { x++; }
    return x;
  }

  /** Valeur (millièmes) du crédit de rang `rank` (1 = premier payé de la journée).
   *  Forme sqrt : u * sqrt(s / (s + m - 1/2)) au m-ième crédit après `full`, calculée en entiers :
   *  décroissante par construction, et sa somme suit 2*u*(sqrt(s*(s+m)) - s) (3s crédits en plus ≈ 2s). */
  function marginalR(rank, R) {
    const d = R.diminishing, u = R.unit;
    if (rank <= 0) { return 0; }
    if (d.hardCap > 0 && rank > d.hardCap) { return 0; }
    if (d.shape === 'flat') { return u; }
    const full = Math.max(0, d.full | 0);
    if (rank <= full) { return u; }
    if (d.shape === 'cap') { return 0; }
    if (d.shape === 'sqrt') {
      const s = Math.max(1, d.soft | 0), m = rank - full;
      return isqrt(Math.floor(2 * u * u * s / (2 * s + 2 * m - 1)));
    }
    throw new Error('forme de rendement inconnue : ' + d.shape);
  }
  function marginal(rank, rules) { return marginalR(rank, rulesOf(rules)); }
  /** Valeur cumulée (millièmes) des `n` premiers crédits payés d'une journée. */
  function cumulative(n, rules) {
    const R = rulesOf(rules);
    let sum = 0;
    for (let r = 1; r <= n; r++) { sum += marginalR(r, R); }
    return sum;
  }

  function eligible(e, R) {
    if (e.b === 0) { return false; }
    if (e.rt !== undefined && e.rt !== null && R.excludeTypes.indexOf(e.rt) >= 0) { return false; }
    if (R.minAnswerMs > 0 && typeof e.ms === 'number' && e.ms < R.minAnswerMs) { return false; }
    return true;
  }
  function prio(e, R) { const p = R.srcPriority[e.src]; return p === undefined ? 9 : p; }
  function cmpEv(a, b) { return (a.t - b.t) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); }

  /**
   * Rejoue le journal. opts : { epoch: ms à partir duquel cette partie est payée (défaut 0),
   *   today: jour Anki courant (défaut : dernier jour vu), dues: {jour: dues du matin} en plus des événements `state` }.
   */
  function replay(events, rules, opts) {
    const R = rulesOf(rules);
    const o = opts || {};
    const epoch = o.epoch || 0;
    const groups = new Map();            // "cid:day" -> [events]
    const dues = Object.assign({}, o.dues || {});
    const states = {};
    let firstDay = null, lastDay = null;

    const evs = (events || []).filter(function (e) { return e && typeof e === 'object'; }).slice().sort(cmpEv);
    for (const e of evs) {
      if (e.k === 'state' && Number.isInteger(e.day)) {
        states[e.day] = e;              // le dernier dans l'ordre total gagne
        if (typeof e.dueMorning === 'number') { dues[e.day] = e.dueMorning; }
        continue;
      }
      if (e.k !== 'review' || !Number.isInteger(e.day) || e.cid === undefined) { continue; }
      const key = e.cid + ':' + e.day;
      if (!groups.has(key)) { groups.set(key, []); }
      groups.get(key).push(e);
      if (firstDay === null || e.day < firstDay) { firstDay = e.day; }
      if (lastDay === null || e.day > lastDay) { lastDay = e.day; }
    }

    // 1) Un crédit par (carte, jour) : fusion indépendante de l'ordre d'arrivée.
    const byDay = new Map();
    const excludedByDay = new Map();
    for (const [, list] of groups) {
      const day = list[0].day;
      const ok = list.filter(function (e) { return eligible(e, R); });
      if (!ok.length) { excludedByDay.set(day, (excludedByDay.get(day) || 0) + 1); continue; }
      const best = ok.slice().sort(function (a, b) { return (prio(a, R) - prio(b, R)) || cmpEv(a, b); })[0];
      let t = Infinity, nw = 0;
      for (const e of ok) { if (e.t < t) { t = e.t; } if (e.nw) { nw = 1; } }
      const firstId = ok.slice().sort(cmpEv)[0].id;
      const c = {
        cid: best.cid, did: best.did, day: day, t: t, id: firstId, src: best.src,
        b: best.b, p: (typeof best.p === 'number' ? best.p : undefined), ivl: best.ivl, rt: best.rt,
        nw: nw, answers: list.length
      };
      if (!byDay.has(day)) { byDay.set(day, []); }
      byDay.get(day).push(c);
    }

    // 2) Par jour, dans l'ordre (heure, cid) : rang, rendement, nouvelles plafonnées, nobles, maturations.
    const days = [];
    const credits = [];
    const matured = {};                  // seuil -> Set(cid)
    const maturations = [];
    for (const th of R.maturity) { matured[th] = new Set(); }
    const totals = { base: 0, noble: 0, credits: 0, paidCredits: 0 };
    const dayKeys = Array.from(new Set(Array.from(byDay.keys()).concat(Array.from(excludedByDay.keys())))).sort(function (a, b) { return a - b; });
    const dayInfo = {};
    for (const day of dayKeys) {
      const list = (byDay.get(day) || []).sort(function (a, b) { return (a.t - b.t) || (a.cid < b.cid ? -1 : a.cid > b.cid ? 1 : 0); });
      let rank = 0, newPaid = 0, newCapped = 0, nobleCount = 0;
      const D = { day: day, credits: list.length, base: 0, noble: 0, newPaid: 0, newCapped: 0,
        excluded: excludedByDay.get(day) || 0, buttons: [0, 0, 0, 0, 0], cards: [], lapseMature: 0,
        maturations: 0, paidBase: 0, paidNoble: 0, counted: false, dueMorning: dues[day] };
      for (const c of list) {
        let base = 0;
        if (c.nw && newPaid >= R.newCap) { newCapped++; c.newCapped = true; }
        else { rank++; base = marginalR(rank, R); if (c.nw) { newPaid++; } }
        c.rank = c.newCapped ? 0 : rank;
        let noble = 0;
        if (c.p !== undefined && c.p >= R.noble.minIvl) {
          const success = c.b === undefined ? true : c.b >= 2;
          if ((!R.noble.requiresSuccess || success) && (!R.noble.dailyCap || nobleCount < R.noble.dailyCap)) {
            noble = R.noble.value; nobleCount++;
          }
          if (c.b === 1) { c.lapseMature = true; D.lapseMature++; }
        }
        const crossed = [];
        if (c.p !== undefined) {
          for (const th of R.maturity) {
            if (c.p >= th && !matured[th].has(c.cid)) { matured[th].add(c.cid); crossed.push(th); maturations.push({ cid: c.cid, day: day, threshold: th }); }
          }
        }
        if (crossed.length) { c.maturation = crossed[crossed.length - 1]; c.maturations = crossed; D.maturations += crossed.length; }
        c.base = base; c.noble = noble;
        c.paid = c.t >= epoch;
        D.base += base; D.noble += noble;
        if (c.paid) { D.paidBase += base; D.paidNoble += noble; totals.base += base; totals.noble += noble; totals.paidCredits++; }
        totals.credits++;
        if (c.b >= 0 && c.b <= 4) { D.buttons[c.b]++; }
        D.cards.push(c.cid);
        credits.push(c);
      }
      D.newPaid = newPaid; D.newCapped = newCapped;
      const need = typeof D.dueMorning === 'number' ? Math.min(R.day.min, D.dueMorning) : R.day.min;
      D.counted = D.credits >= need;
      days.push(D);
      dayInfo[day] = D;
    }

    // 3) Série douce, jokers, chaleur, bonus permanents (du premier jour à aujourd'hui).
    const today = Number.isInteger(o.today) ? o.today : lastDay;
    const streak = { current: 0, best: 0, heat: 0, jokersUsed: 0, jokersLeft: R.streak.jokersPerWeek, todayCounted: false };
    if (firstDay !== null && today !== null && today >= firstDay) {
      const H = R.heat;
      const jokersByWeek = {};
      for (let d = firstDay; d <= today; d++) {
        const info = dayInfo[d];
        const counted = info ? info.counted : (typeof dues[d] === 'number' && dues[d] === 0);
        if (counted) {
          streak.current++;
          streak.heat += Math.ceil((H.max - streak.heat) / H.up);
          if (d === today) { streak.todayCounted = true; }
        } else if (d === today) {
          // journée en cours : elle ne casse rien
        } else {
          const w = weekOf(d);
          const used = jokersByWeek[w] || 0;
          if (streak.current > 0 && used < R.streak.jokersPerWeek) {
            jokersByWeek[w] = used + 1; streak.jokersUsed++;
          } else {
            streak.current = 0;
            streak.heat -= Math.ceil(streak.heat / H.down);
          }
        }
        if (streak.current > streak.best) { streak.best = streak.current; }
      }
      streak.jokersLeft = R.streak.jokersPerWeek - (jokersByWeek[weekOf(today)] || 0);
    }
    const perks = R.perks.filter(function (p) { return streak.best >= p.best; }).map(function (p) { return p.id; });

    const matCount = {};
    for (const th of R.maturity) { matCount[th] = matured[th].size; }
    return {
      rulesVersion: R.version, epoch: epoch, today: today, firstDay: firstDay, lastDay: lastDay,
      days: days, credits: credits, totals: totals, streak: streak, perks: perks,
      maturations: maturations, maturedCount: matCount, states: states
    };
  }

  /** Versement monotone : ce qui est dû moins ce qui a déjà été versé, jamais négatif.
   *  saved = { base, noble } déjà versés. Renvoie { delta, granted } (granted ne baisse jamais). */
  function settle(ledger, saved) {
    const g = { base: (saved && saved.base) || 0, noble: (saved && saved.noble) || 0 };
    const t = ledger.totals;
    const delta = { base: Math.max(0, t.base - g.base), noble: Math.max(0, t.noble - g.noble) };
    return { delta: delta, granted: { base: Math.max(g.base, t.base), noble: Math.max(g.noble, t.noble) } };
  }

  /** Crédits présents dans `next` et absents de `prev` (pour annoncer les nouveautés à l'écran). */
  function newCredits(prev, next) {
    const seen = new Set();
    if (prev) { for (const c of prev.credits) { seen.add(c.cid + ':' + c.day); } }
    return next.credits.filter(function (c) { return !seen.has(c.cid + ':' + c.day); });
  }

  return {
    DEFAULT_RULES: DEFAULT_RULES, rulesOf: rulesOf, ankiDay: ankiDay, localAnkiDay: localAnkiDay, weekOf: weekOf,
    isqrt: isqrt, cumulative: cumulative, marginal: marginal, replay: replay, settle: settle, newCredits: newCredits
  };
});
