/* anki/sensor.js — capteur B1 : lit les révisions d'AnkiDroid en LECTURE SEULE et produit des
 * événements normalisés (format v1, rapports/plan/B-interface.md §2). Il ne calcule aucune récompense.
 *
 * Deux voies, toutes deux en root (une seule session `su` par lancement, anki/rootshell.js) :
 *  - revlog : copie de collection.anki2 (+ -wal) dans ~/.anki-village/cache, lecture par node:sqlite.
 *             L'original n'est jamais ouvert ; seule la commande `cat` le lit.
 *  - provider : `content query` sur content://com.ichi2.anki.flashcards (recherches Anki), sans revlog.
 *
 * Données personnelles : le journal est écrit HORS du dépôt (~/.anki-village, ou $ANKI_VILLAGE_DIR).
 *
 * Usage : node anki/sensor.js once [--source=revlog|provider] [--days=N]   lit, journalise, résume
 *         node anki/sensor.js replay                                        rejoue le journal (B3)
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { RootShell, shq } = require('./rootshell.js');
const CD = require('./customdata.js');
const L = require('./ledger.js');

const ANKI_DIR = '/storage/emulated/0/Android/data/com.ichi2.anki/files/AnkiDroid';
const AUTHORITY = 'content://com.ichi2.anki.flashcards';

function dayStartMs(day, rollover) {
  // 04:00 locale du jour `day` : on part de minuit UTC du même jour civil et on corrige du fuseau local.
  const guess = day * 86400000 + rollover * 3600000;
  return guess + new Date(guess).getTimezoneOffset() * 60000;
}

function createSensor(opts) {
  const o = opts || {};
  const dir = o.dir || process.env.ANKI_VILLAGE_DIR || path.join(os.homedir(), '.anki-village');
  const ankiDir = o.ankiDir || ANKI_DIR;
  const shell = o.shell || new RootShell();
  const log = o.log || (() => {});
  fs.mkdirSync(path.join(dir, 'cache'), { recursive: true, mode: 0o700 });
  const devFile = path.join(dir, 'device');
  if (!fs.existsSync(devFile)) { fs.writeFileSync(devFile, 'phone-' + crypto.randomBytes(3).toString('hex') + '\n'); }
  const dev = fs.readFileSync(devFile, 'utf8').trim();
  const logDir = path.join(dir, 'log', dev);
  fs.mkdirSync(logDir, { recursive: true });

  const S = {
    dev, dir, source: o.source || 'auto', lastSource: null, error: null,
    lastStat: null, lastRefresh: 0, lastChange: 0, crt: null, rollover: 4, decks: {}, snapshot: null,
    providerDay: null, refreshing: null, ms: 0
  };
  const byId = new Map();     // id -> événement
  const order = [];           // [seq, id] dans l'ordre d'arrivée en mémoire
  let seq = 0;

  // --- journal ---------------------------------------------------------------------------------
  function remember(e) { if (byId.has(e.id)) { return false; } byId.set(e.id, e); order.push([++seq, e.id]); return true; }
  function loadJournal() {
    const root = path.join(dir, 'log');
    for (const d of fs.readdirSync(root)) {
      const sub = path.join(root, d);
      if (!fs.statSync(sub).isDirectory()) { continue; }
      for (const f of fs.readdirSync(sub).filter((x) => x.endsWith('.jsonl')).sort()) {
        for (const line of fs.readFileSync(path.join(sub, f), 'utf8').split('\n')) {
          if (!line.trim()) { continue; }
          try { const e = JSON.parse(line); if (e && e.id) { remember(e); } } catch (err) { /* ligne incomplète : relue plus tard */ }
        }
      }
    }
  }
  function append(list) {
    const byMonth = {};
    for (const e of list) {
      const d = new Date(e.t); const m = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      (byMonth[m] = byMonth[m] || []).push(JSON.stringify(e));
    }
    for (const m of Object.keys(byMonth)) { fs.appendFileSync(path.join(logDir, m + '.jsonl'), byMonth[m].join('\n') + '\n'); }
  }
  function addEvents(list) {
    const fresh = list.filter((e) => !byId.has(e.id));
    fresh.forEach(remember);
    if (fresh.length) { append(fresh); S.lastChange = Date.now(); }
    return fresh;
  }
  loadJournal();

  function dayOf(ms) { return L.localAnkiDay(ms, S.rollover); }
  function crtDay() { return S.crt ? dayOf(S.crt * 1000) : null; }

  // --- photo du jour (paquets) -------------------------------------------------------------------
  function snapshotFrom(rows, nowMs) {
    const today = dayOf(nowMs), aToday = today - (crtDay() || today);
    const decks = {};
    const zero = () => ({ new: 0, learn: 0, young: 0, mature: 0, suspended: 0, buried: 0, due: 0, total: 0, leech: 0, edited1: 0, edited7: 0, dueMorning: 0 });
    const tot = zero();
    const ed1 = dayStartMs(today, S.rollover) / 1000, ed7 = dayStartMs(today - 6, S.rollover) / 1000;
    const deckOf = new Map();
    for (const c of rows) {
      const did = c.odid ? c.odid : c.did;
      deckOf.set(c.id, did);
      const k = decks[did] = decks[did] || Object.assign({ name: S.decks[did] || String(did) }, zero());
      const add = (f) => { k[f]++; tot[f]++; };
      add('total');
      // tag:leech et edited:1 / edited:7 (comptés en cartes, comme les recherches Anki)
      if (typeof c.tags === 'string' && / leech /i.test(' ' + c.tags + ' ')) { add('leech'); }
      if (c.nmod >= ed1) { add('edited1'); }
      if (c.nmod >= ed7) { add('edited7'); }
      if (c.queue === -1) { add('suspended'); continue; }
      if (c.queue === -2 || c.queue === -3) { add('buried'); continue; }
      if (c.type === 0) { add('new'); continue; }
      if (c.type === 1 || c.type === 3) { add('learn'); }
      else if (c.type === 2) { add(c.ivl >= 21 ? 'mature' : 'young'); }
      if (c.queue === 1 || ((c.queue === 2 || c.queue === 3) && c.due <= aToday)) { add('due'); }
    }
    // Dues du matin : exactes si rien n'a encore été révisé aujourd'hui, sinon approchées
    // (dues restantes + cartes en révision déjà répondues aujourd'hui).
    const doneToday = new Set();
    for (const e of byId.values()) { if (e.k === 'review' && e.day === today && (e.rt === 1 || e.rt === 2)) { doneToday.add(e.cid); } }
    for (const k of Object.values(decks)) { k.dueMorning = k.due; }
    tot.dueMorning = tot.due;
    for (const cid of doneToday) {
      const did = deckOf.get(cid);
      if (did !== undefined && decks[did]) { decks[did].dueMorning++; }
      tot.dueMorning++;
    }
    return { v: 1, k: 'state', id: 'st:' + dev + ':' + today, t: nowMs, day: today, aday: aToday, src: 'revlog',
      dueMorning: tot.due + doneToday.size, approx: doneToday.size > 0, totals: tot, decks };
  }

  // --- voie revlog (copie SQLite) ----------------------------------------------------------------
  async function copyCollection() {
    const main = ankiDir + '/collection.anki2', wal = main + '-wal';
    const cache = path.join(dir, 'cache');
    const uid = process.getuid(), gid = process.getgid();
    const statCmd = 'stat -c "%Y %s" ' + shq(main) + ' ' + shq(wal) + ' 2>/dev/null';
    const before = (await shell.run(statCmd)).out.trim();
    if (!before) { throw new Error('collection introuvable : ' + main); }
    if (before === S.lastStat && fs.existsSync(path.join(cache, 'c.anki2'))) { return { changed: false }; }
    for (let attempt = 1; attempt <= 3; attempt++) {
      const D = shq(cache);
      const r = await shell.run('( set -e; rm -f ' + D + '/c.anki2 ' + D + '/c.anki2-wal ' + D + '/c.anki2-shm; ' +
        'cat ' + shq(main) + ' > ' + D + '/c.anki2; if [ -f ' + shq(wal) + ' ]; then cat ' + shq(wal) + ' > ' + D + '/c.anki2-wal; fi; ' +
        'chown ' + uid + ':' + gid + ' ' + D + '/c.anki2*; chmod 600 ' + D + '/c.anki2* ) && ' + statCmd);
      const after = r.out.trim();
      if (r.code === 0 && after === before) { S.lastStat = after; return { changed: true }; }
      log('copie instable (essai ' + attempt + '), nouvelle tentative');
    }
    throw new Error('la collection change pendant la copie (AnkiDroid écrit) : réessayer plus tard');
  }

  function readCopy(nowMs) {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(path.join(dir, 'cache', 'c.anki2'));
    try {
      // PRAGMA quick_check est impossible ici (index en collation `unicase`, propre à Anki) ;
      // la cohérence vient de la copie stable (stat avant = après) et de requêtes qui doivent aboutir.
      S.crt = db.prepare('select crt from col').get().crt;
      const ro = db.prepare("select val from config where key = 'rollover'").get();
      if (ro) { const v = JSON.parse(Buffer.from(ro.val).toString()); if (Number.isInteger(v)) { S.rollover = v; } }
      for (const d of db.prepare('select id, name from decks').all()) { S.decks[d.id] = String(d.name).split('\x1f').join('::'); }
      const cDay = crtDay();
      const rows = db.prepare('select r.id, r.cid, r.ease, r.ivl, r.lastIvl, r.type, r.time, c.did, c.odid from revlog r left join cards c on c.id = r.cid order by r.id').all();
      const evs = [];
      for (const r of rows) {
        const id = 'rv:' + r.id;
        if (byId.has(id)) { continue; }
        const t = Number(r.id), day = dayOf(t);
        const e = { v: 1, k: 'review', id, src: 'revlog', t, day, aday: day - cDay, cid: Number(r.cid),
          did: r.odid ? Number(r.odid) : (r.did === null ? null : Number(r.did)),
          b: r.ease, p: r.lastIvl > 0 ? r.lastIvl : 0, ivl: r.ivl > 0 ? r.ivl : 0, rt: r.type, ms: r.time,
          nw: (r.type === 0 && r.lastIvl === 0) ? 1 : 0 };
        evs.push(e);
      }
      const cards = db.prepare('select c.id, c.did, c.odid, c.type, c.queue, c.ivl, c.due, c.data, n.tags, n.mod as nmod from cards c left join notes n on n.id = c.nid').all();
      const cdCount = cards.filter((c) => CD.customDataFromCardData(c.data)).length;
      return { evs, cards, cdCount, revlogRows: rows.length };
    } finally { db.close(); }
  }

  async function refreshRevlog(force, nowMs) {
    const c = await copyCollection();
    if (!c.changed && !force) { return { added: [], unchanged: true }; }
    const r = readCopy(nowMs);
    const added = addEvents(r.evs);
    const snap = snapshotFrom(r.cards, nowMs);
    S.snapshot = snap; S.customDataCards = r.cdCount; S.revlogRows = r.revlogRows;
    // Une seule photo journalisée par jour : la première (la plus proche du matin).
    if (!byId.has(snap.id)) { added.push(...addEvents([snap])); }
    return { added };
  }

  // --- voie ContentProvider ----------------------------------------------------------------------
  const PCOLS = ['_id', 'deck_id', 'original_deck_id', 'interval', 'lapses', 'last_review_time_secs', 'custom_data'];
  function parseRows(out, cols) {
    const res = [];
    for (const chunk of ('\n' + out).split('\nRow: ').slice(1)) {
      const line = 'Row: ' + chunk.replace(/\n$/, '');
      const row = {}; let pos = line.indexOf(' ', 5) + 1;
      for (let i = 0; i < cols.length; i++) {
        const k = cols[i] + '='; const at = line.indexOf(k, pos);
        if (at < 0) { break; }
        const start = at + k.length;
        const end = i + 1 < cols.length ? line.indexOf(', ' + cols[i + 1] + '=', start) : line.length;
        row[cols[i]] = line.slice(start, end < 0 ? line.length : end);
        pos = end < 0 ? line.length : end;
      }
      res.push(row);
    }
    return res;
  }
  async function query(where, cols) {
    const r = await shell.run('content query --uri ' + AUTHORITY + '/cards --projection ' + cols.join(':') + ' --where ' + shq(where) + ' 2>&1', 60000);
    if (/Error|Exception/.test(r.out) && !/^Row:/m.test(r.out)) { throw new Error('provider : ' + r.out.split('\n').slice(0, 2).join(' ')); }
    return parseRows(r.out, cols);
  }
  async function refreshProvider(nowMs, days) {
    const today = dayOf(nowMs);
    const K = Math.max(1, Math.min(365, days || (S.providerDay === null ? 1 : today - S.providerDay + 1)));
    const intro = new Set((await query('introduced:1', ['_id'])).map((r) => r._id));
    const evs = [];
    for (let k = 0; k < K; k++) {
      const d = today - k;
      for (const r of await query('prop:rated=' + (-k), PCOLS)) {
        const lrt = Number(r.last_review_time_secs) || 0;
        const t = lrt && dayOf(lrt * 1000) === d ? lrt * 1000 : dayStartMs(d, S.rollover);
        const facts = CD.factsFor(CD.parseCustomData(r.custom_data), d) || {};
        const e = { v: 1, k: 'review', id: 'pv:' + r._id + ':' + d, src: facts.b ? 'customdata' : 'provider', t, day: d,
          cid: Number(r._id), did: Number(r.original_deck_id) || Number(r.deck_id), ivl: Math.max(0, Number(r.interval) || 0),
          lp: Number(r.lapses) || 0, nw: k === 0 && intro.has(r._id) ? 1 : 0 };
        if (facts.b) { e.b = facts.b; }
        if (facts.p !== undefined) { e.p = facts.p; }
        evs.push(e);
      }
    }
    S.providerDay = today;
    return { added: addEvents(evs) };
  }

  // --- texte des cartes (à la demande ; jamais journalisé, gardé en mémoire) ----------------------
  const textCache = new Map();
  function stripHtml(h) {
    return String(h || '').replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
      .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  }
  async function cardText(cids) {
    const want = Array.from(new Set((cids || []).map(Number).filter((x) => Number.isFinite(x) && x > 0))).slice(0, 50);
    const missing = want.filter((c) => !textCache.has(c));
    if (missing.length) {
      const cols = ['_id', 'deck_id', 'question_simple'];
      for (const r of await query('cid:' + missing.join(','), cols)) {
        textCache.set(Number(r._id), { cid: Number(r._id), did: Number(r.deck_id), html: r.question_simple, text: stripHtml(r.question_simple) });
      }
      if (textCache.size > 2000) { textCache.delete(textCache.keys().next().value); }
    }
    const out = {};
    for (const c of want) { if (textCache.has(c)) { out[c] = textCache.get(c); } }
    return out;
  }

  // --- API ---------------------------------------------------------------------------------------
  async function refresh(ro) {
    const r = ro || {};
    if (S.refreshing) { return S.refreshing; }
    const started = Date.now();
    S.refreshing = (async () => {
      try {
        let res;
        const want = r.source || S.source;
        if (want === 'provider') { res = await refreshProvider(started, r.days); S.lastSource = 'provider'; }
        else {
          try { res = await refreshRevlog(!!r.force, started); S.lastSource = 'revlog'; }
          catch (err) {
            if (want === 'revlog') { throw err; }
            log('voie revlog indisponible (' + err.message + '), repli sur le provider');
            res = await refreshProvider(started, r.days); S.lastSource = 'provider';
          }
        }
        S.error = null; S.lastRefresh = Date.now(); S.ms = S.lastRefresh - started;
        return res;
      } catch (err) { S.error = err.message; throw err; }
      finally { S.refreshing = null; }
    })();
    return S.refreshing;
  }
  function eventsSince(since) {
    const out = [];
    for (const [s, id] of order) { if (s > (since || 0)) { out.push(byId.get(id)); } }
    return { cursor: seq, events: out };
  }
  function allEvents() { return Array.from(byId.values()); }
  function status() {
    return { device: dev, source: S.lastSource, error: S.error, lastRefresh: S.lastRefresh, lastChange: S.lastChange,
      refreshMs: S.ms, events: byId.size, rollover: S.rollover, crt: S.crt, today: dayOf(Date.now()),
      revlogRows: S.revlogRows, customDataCards: S.customDataCards, snapshot: S.snapshot };
  }
  return { refresh, eventsSince, allEvents, status, cardText, close: () => shell.close(), dir, dev };
}

module.exports = { createSensor, ANKI_DIR, dayStartMs };

// --- ligne de commande ---------------------------------------------------------------------------
if (require.main === module) {
  const args = process.argv.slice(2);
  const opt = (k) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : undefined; };
  const cmd = args[0] || 'once';
  const sensor = createSensor({ source: opt('source') || 'auto', log: (m) => console.error('[capteur] ' + m) });
  (async () => {
    if (cmd === 'once') {
      const t0 = Date.now();
      const r = await sensor.refresh({ force: true, days: opt('days') ? Number(opt('days')) : undefined });
      const st = sensor.status();
      console.log('source : ' + st.source + ' ; ' + r.added.length + ' événements nouveaux ; ' + st.events + ' dans le journal ; ' + (Date.now() - t0) + ' ms');
      if (st.revlogRows !== undefined) { console.log('lignes de revlog lues : ' + st.revlogRows + ' ; cartes portant un customData : ' + st.customDataCards); }
      if (st.snapshot) { console.log('aujourd\'hui (jour ' + st.today + ') : ' + JSON.stringify(st.snapshot.totals) + ' ; dues du matin ' + st.snapshot.dueMorning + (st.snapshot.approx ? ' (approchées)' : '')); }
    }
    if (cmd === 'text') {
      const r = await sensor.cardText(args.slice(1).filter((a) => /^\d+$/.test(a)));
      for (const c of Object.values(r)) { console.log(c.cid + ' : ' + c.text.slice(0, 160).replace(/\n/g, ' / ')); }
    }
    if (cmd === 'once' || cmd === 'replay') {
      const evs = sensor.allEvents();
      const res = L.replay(evs, null, { today: L.localAnkiDay(Date.now(), 4) });
      console.log('jour      crédits  base   noble  nouv.payées/plaf.  boutons(1-4)   compté');
      for (const d of res.days) {
        console.log(String(d.day).padEnd(9) + String(d.credits).padStart(7) + String(d.base / 1000).padStart(8) + String(d.noble / 1000).padStart(7) +
          ('  ' + d.newPaid + '/' + d.newCapped).padStart(17) + ('  ' + d.buttons.slice(1).join(' ')).padStart(16) + '   ' + (d.counted ? 'oui' : 'non'));
      }
      console.log('total : ' + JSON.stringify(res.totals) + ' ; série ' + JSON.stringify(res.streak) + ' ; maturations ' + JSON.stringify(res.maturedCount));
    }
  })().catch((e) => { console.error('erreur : ' + e.message); process.exitCode = 1; }).finally(() => sensor.close());
}
