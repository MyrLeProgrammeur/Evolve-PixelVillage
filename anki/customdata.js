/* anki/customdata.js — lecture des clés vd/vf/vp écrites par anki/customdata-snippet.js (B2).
 * Zéro dépendance. Utilisé par le capteur (anki/sensor.js) pour la voie ContentProvider
 * (colonne custom_data) et la voie copie SQLite (cards.data -> "cd", une chaîne JSON). */
'use strict';
const fs = require('fs');
const path = require('path');

const SNIPPET_PATH = path.join(__dirname, 'customdata-snippet.js');
function snippet() { return fs.readFileSync(SNIPPET_PATH, 'utf8'); }

/** custom_data brut (chaîne JSON, objet, ou vide) -> objet, ou null. */
function parseCustomData(raw) {
  if (raw === null || raw === undefined || raw === '' || raw === 'NULL') { return null; }
  if (typeof raw === 'object') { return raw; }
  try { const o = JSON.parse(raw); return o && typeof o === 'object' ? o : null; } catch (e) { return null; }
}

/** cards.data (JSON de la base) -> customData de la carte, ou null. */
function customDataFromCardData(data) {
  const d = parseCustomData(data);
  if (!d || d.cd === undefined) { return null; }
  return parseCustomData(d.cd);
}

/** Faits « premier bouton du jour » si la carte porte les clés du jour `day` : { b, p } ; sinon null. */
function factsFor(cd, day) {
  if (!cd || cd.vd !== day) { return null; }
  const out = {};
  if (Number.isInteger(cd.vf) && cd.vf >= 1 && cd.vf <= 4) { out.b = cd.vf; }
  if (Number.isInteger(cd.vp) && cd.vp >= 0) { out.p = cd.vp; }
  return out;
}

module.exports = { SNIPPET_PATH, snippet, parseCustomData, customDataFromCardData, factsFor };
