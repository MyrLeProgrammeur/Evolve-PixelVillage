/* [anki-fork] Pont Anki -> jeu (B7). Lit les événements du capteur (serve.js --anki, /api/anki/events), les rejoue
   avec anki/ledger.js (window.AnkiLedger) et verse ce qui est dû par window.ankiCredit, de façon monotone :
   ce qui a été versé n'est jamais repris, ce qui ne peut pas être versé (ressource cachée, entrepôt plein) attend
   dans une réserve enregistrée avec la partie. Ajoute aussi les ticks de l'horloge à cartes (window.ankiClock).
   Indicateur discret dans le panneau Village : cartes créditées aujourd'hui. Hors ligne, zéro dépendance.
   Sans capteur (serveur lancé sans --anki, ou page publiée en ligne), le pont reste inactif. */
(function () {
  'use strict';
  var POLL_MS = 5000;
  /* Taux par crédit plein (1000 millièmes), calculés par tools/budget/era-budget.js avec les règles v2 (aube 75,
     pleine valeur jusqu'à 60) : ère 1 en 8 semaines à 60 cartes/jour (7 560 crédits), la moitié du budget par le
     crédit direct, le reste par la production des ticks ; nobles = accélérateur (supposés 20 % des crédits).
     Ère 0 : 4 jours d'étude à 60 cartes/jour (540 crédits). Hypothèses à recalibrer au rejeu réel (B-R5). */
  var RATES = {
    evo: { base: { RNA: 2, DNA: 4 }, noble: { RNA: 2, DNA: 4 } },
    era1: {
      base: { Knowledge: 11, Money: 35, Lumber: 5.3, Stone: 3.9, Food: 1.9, Furs: 0.2, Plywood: 0.4, Brick: 0.3 },
      noble: { Iron: 14, Cement: 6.8, Steel: 4.6, Copper: 2.5, Wrought_Iron: 1, Coal: 0.7 }
    }
  };
  var S = { events: new Map(), cursor: 0, enabled: null, ledger: null, status: null, lastOk: 0, listeners: {}, day: null, error: null };

  function emit(name, data) { (S.listeners[name] || []).forEach(function (fn) { try { fn(data); } catch (e) { console.error(e); } }); }
  function game() { var g = window.evolve && window.evolve.global; return g && g.race && window.ankiState && window.ankiCredit && window.AnkiLedger ? g : null; }
  function eraKey(g) { return g.race.species === 'protoplasm' ? 'evo' : 'era1'; }
  function rolloverOf() { return (S.status && S.status.rollover) || 4; }
  function today() { return window.AnkiLedger.localAnkiDay(Date.now(), rolloverOf()); }
  function dayStart(day) { var guess = day * 86400000 + rolloverOf() * 3600000; return guess + new Date(guess).getTimezoneOffset() * 60000; }

  /* Réserve : ressource -> quantité due. À un changement d'ère, ce qui reste en ressources de l'ancienne ère
     est reconverti en crédits puis redistribué selon la nouvelle (rien ne se perd). */
  function convertReserve(a, era) {
    if (a.reserveEra === era) { return; }
    var old = RATES[a.reserveEra], neu = RATES[era];
    if (old && neu) {
      // Un crédit de l'ancienne ère valait old.base[r] de chaque ressource r : la moyenne des restes / taux
      // donne le nombre de crédits encore dus, reversés au taux de la nouvelle ère.
      var units = 0, n = 0;
      Object.keys(old.base).forEach(function (r) {
        n++;
        if (!(r in neu.base) && !(r in neu.noble) && a.reserve[r] > 0) { units += a.reserve[r] / old.base[r]; a.reserve[r] = 0; }
      });
      if (units > 0) { queue(a, era, 'base', units / n * 1000); }
    }
    a.reserveEra = era;
  }
  function queue(a, era, kind, milli) {
    var t = RATES[era][kind];
    Object.keys(t).forEach(function (r) { a.reserve[r] = (a.reserve[r] || 0) + t[r] * milli / 1000; });
  }
  function deliver(a) {
    Object.keys(a.reserve).forEach(function (r) {
      var want = a.reserve[r];
      if (!(want > 0)) { return; }
      var got = window.ankiCredit(r, want) || 0;
      if (got > 0) { a.reserve[r] = Math.max(0, want - got); a.delivered[r] = (a.delivered[r] || 0) + got; }
    });
  }

  function settle() {
    var g = game(); if (!g || !S.events.size) { return; }
    var a = window.ankiState();
    var d0 = today();
    if (!a.epoch) { a.epoch = dayStart(d0); }                  // 1re connexion : les révisions d'aujourd'hui comptent
    if (window.AnkiVillageHost && !a.clockSet) {
      // Add-on : le temps ne vient que des révisions (GD §2), posé une fois à la première connexion.
      window.ankiClock.set({ mode: 'cards', passive: 0, noManual: true });
      a.clockSet = 1;
    }
    var prev = S.ledger;
    var L = window.AnkiLedger.replay(Array.from(S.events.values()), a.rules || null, { epoch: a.epoch, today: d0 });
    S.ledger = L;
    var era = eraKey(g);
    convertReserve(a, era);
    var s = window.AnkiLedger.settle(L, a.granted);
    if (s.delta.base > 0) { queue(a, era, 'base', s.delta.base); }
    if (s.delta.noble > 0) { queue(a, era, 'noble', s.delta.noble); }
    a.granted = s.granted;
    deliver(a);
    // Horloge à cartes : ticksPerCard ticks par crédit plein, comptés même en mode original (pas de rattrapage brutal).
    var tpc = (a.clock && a.clock.ticksPerCard) || 20;
    var owed = Math.floor(L.totals.base * tpc / 1000) - (a.ticks.given || 0);
    if (owed > 0) { a.ticks.given = (a.ticks.given || 0) + owed; if (a.clock.mode === 'cards') { window.ankiClock.addTicks(owed); } }
    // Série, chaleur, bonus permanents (jamais retirés)
    a.streak = { best: Math.max(a.streak.best || 0, L.streak.best), current: L.streak.current, heat: L.streak.heat, jokersLeft: L.streak.jokersLeft };
    L.perks.forEach(function (p) { if (a.perks.indexOf(p) < 0) { a.perks.push(p); } });
    var td = L.days.filter(function (x) { return x.day === d0; })[0];
    var paidToday = L.credits.filter(function (c) { return c.day === d0 && c.paid; });
    a.today = { day: d0, credits: paidToday.length, cids: paidToday.slice(-500).map(function (c) { return c.cid; }), counted: !!(td && td.counted) };
    if (S.day !== null && S.day !== d0) { emit('day', { day: d0 }); }
    S.day = d0;
    window.AnkiLedger.newCredits(prev, L).filter(function (c) { return c.paid; }).forEach(function (c) {
      emit('credit', { cid: c.cid, did: c.did, day: c.day, base: c.base, noble: c.noble, b: c.b, p: c.p, lapseMature: !!c.lapseMature, maturation: c.maturation });
    });
    emit('sync', status());
    paint();
  }

  /* Source des événements : l'add-on Anki bureau (anki-host.js, par pycmd) ou le serveur local (serve.js --anki).
     Dans l'add-on, on donne aussi le début de la partie (epoch) pour que Python ne lise pas l'historique antérieur. */
  function fetchEvents() {
    var host = window.AnkiVillageHost;
    if (host) {
      var g = game();
      return host.request('events', { since: S.cursor, from: g ? (window.ankiState().epoch || dayStart(today())) : null });
    }
    return fetch('api/anki/events?since=' + S.cursor, { cache: 'no-store' }).then(function (r) { return r.json(); });
  }
  function poll() {
    if (S.enabled === false && !window.AnkiVillageHost) { return Promise.resolve(); }
    return fetchEvents().then(function (j) {
      if (!j || j.enabled === false) { S.enabled = false; paint(); return; }
      S.enabled = true; S.status = j.status || null; S.lastOk = Date.now(); S.error = j.status && j.status.error;
      (j.events || []).forEach(function (e) { if (e && e.id) { S.events.set(e.id, e); } });
      S.cursor = j.cursor || S.cursor;
      settle();
    }).catch(function () { S.enabled = S.enabled === true ? true : false; S.error = 'serveur injoignable'; paint(); });
  }

  // ---------------------------------------------------------------- indicateur dans le panneau Village
  var badge = null, pop = null;
  function ensureBadge() {
    var panel = document.getElementById('av-panel');
    if (!panel) { return null; }
    if (badge && badge.parentNode === panel) { return badge; }
    var st = document.createElement('style');
    st.textContent = '#av-anki{position:absolute;left:6px;top:6px;z-index:3;font:600 11px system-ui,sans-serif;padding:3px 7px;border-radius:6px;' +
      'background:rgba(255,250,235,.82);color:#2a1f2b;border:1px solid #6e4329;cursor:pointer;opacity:.85}' +
      '#av-anki.off{opacity:.45}#av-anki-pop{position:absolute;left:6px;top:30px;z-index:4;font:12px/1.5 system-ui,sans-serif;padding:8px 10px;' +
      'border-radius:8px;background:#fffaeb;color:#2a1f2b;border:1px solid #6e4329;max-width:260px;box-shadow:0 2px 6px rgba(0,0,0,.35)}' +
      '#av-anki-pop button{font:600 12px system-ui,sans-serif;margin-top:6px;padding:3px 10px;border-radius:5px;border:1px solid #6e4329;' +
      'background:#f6c945;color:#2a1f2b;cursor:pointer}#av-anki.nudge{outline:3px solid #f6c945;opacity:1}';
    document.head.appendChild(st);
    badge = document.createElement('div'); badge.id = 'av-anki';
    badge.onclick = function () { if (pop) { pop.remove(); pop = null; } else { openPop(panel); } };
    panel.appendChild(badge);
    return badge;
  }
  function openPop(panel) {
    pop = document.createElement('div'); pop.id = 'av-anki-pop';
    var c = window.ankiClock ? window.ankiClock.get() : null, a = window.ankiState ? window.ankiState() : null;
    var html = '<b>Cartes Anki</b><br>';
    if (S.enabled !== true) { html += window.AnkiVillageHost ? 'Non relié : la collection Anki n\'a pas répondu.' : 'Non relié. Lancer <code>node serve.js --anki</code>.'; }
    else {
      var st = status(), td = S.ledger && S.ledger.days.filter(function (x) { return x.day === today(); })[0];
      html += 'Aujourd\'hui : ' + (a ? a.today.credits : 0) + ' cartes créditées' + (a && a.today.counted ? ' (jour compté)' : '') + '<br>';
      if (typeof st.due === 'number') { html += st.due > 0 ? 'Encore ' + st.due + ' cartes dues aujourd\'hui.<br>' : 'Plus aucune carte due aujourd\'hui.<br>'; }
      if (td && td.done) { html += '<b>Journée accomplie.</b><br>'; }
      if (S.error) { html += 'Capteur : ' + S.error + '<br>'; }
    }
    // Aucun réglage d'horloge pour le joueur (GD §3.7) : le temps du village vient des révisions.
    if (c && c.mode !== 'cards') { html += '<i>Temps du jeu : normal (jeu web).</i><br>'; }
    if (window.AnkiVillageHost) { html += '<button id="av-anki-review">Réviser</button>'; }
    pop.innerHTML = html;
    panel.appendChild(pop);
    var rb = pop.querySelector('#av-anki-review');
    if (rb) { rb.onclick = function () { window.AnkiVillageHost.request('review'); }; }
  }
  function paint() {
    var b = ensureBadge(); if (!b) { return; }
    var a = game() ? window.ankiState() : null;
    if (S.enabled !== true) { b.classList.add('off'); b.textContent = 'Anki : non relié'; return; }
    b.classList.remove('off');
    var n = a && a.today && a.today.day === today() ? a.today.credits : 0;
    b.textContent = 'Anki : ' + n + (n > 1 ? ' cartes' : ' carte') + ' aujourd\'hui';
  }

  function status() {
    var a = game() ? window.ankiState() : null;
    return { connected: S.enabled === true, source: S.status && S.status.source, error: S.error, lastSync: S.lastOk,
      today: a ? a.today : null, totals: S.ledger ? S.ledger.totals : null, reserve: a ? a.reserve : null,
      streak: a ? a.streak : null, perks: a ? a.perks.slice() : [], clock: window.ankiClock ? window.ankiClock.get() : null,
      due: S.status && S.status.snapshot && S.status.snapshot.totals ? S.status.snapshot.totals.due : null };
  }
  window.AnkiVillage = {
    status: status,
    ledger: function () { return S.ledger; },
    decks: function () { return S.status && S.status.snapshot ? S.status.snapshot.decks : null; },
    events: function () { return Array.from(S.events.values()); },
    on: function (name, fn) { (S.listeners[name] = S.listeners[name] || []).push(fn); },
    cardText: function (cids) {
      if (window.AnkiVillageHost) { return window.AnkiVillageHost.request('cards', { cids: cids }); }
      return fetch('api/anki/cards?cids=' + cids.join(','), { cache: 'no-store' }).then(function (r) { return r.json(); });
    },
    rates: RATES,
    refresh: poll
  };

  function start() {
    poll();
    setInterval(function () { if (document.visibilityState !== 'hidden') { poll(); } else { paint(); } }, POLL_MS);
    setInterval(function () { var g = game(); if (g) { deliver(window.ankiState()); } paint(); }, 1000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { poll(); } });
    // Clic de cueillette en mode cartes : le badge se signale (le bouton Réviser est dans son menu).
    if (window.addEventListener) window.addEventListener('anki-gather', function () {
      var b = ensureBadge(); if (!b) { return; }
      b.classList.add('nudge'); setTimeout(function () { b.classList.remove('nudge'); }, 2500);
    });
  }
  function load() {
    if (window.AnkiLedger) { start(); return; }
    var s = document.createElement('script'); s.src = 'anki/ledger.js'; s.onload = start;
    s.onerror = function () { console.error('anki-bridge : anki/ledger.js introuvable'); };
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', load); } else { load(); }
})();
