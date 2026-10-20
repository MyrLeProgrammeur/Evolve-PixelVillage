/* anki-village v1 : à coller dans AnkiDroid, Options du paquet > Avancé > Planification personnalisée.
   Ne modifie AUCUN intervalle : n'écrit que customData (clés vd = jour Anki, vf = bouton 1-4, vp = intervalle avant).
   Anki ne garde que le customData du bouton pressé : on lit ensuite le bouton exact sur la carte. */
try {
  var day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000 - 4 * 3600000) / 86400000);
  var cur = states.current || {};
  var nrm = cur.normal || (cur.filtered && cur.filtered.rescheduling && cur.filtered.rescheduling.originalState) || {};
  var rev = nrm.review || (nrm.relearning && nrm.relearning.review);
  var p = rev ? (rev.scheduledDays | 0) : 0;
  if (customData.good.vd !== day) {
    ["again", "hard", "good", "easy"].forEach(function (b, i) {
      customData[b].vd = day; customData[b].vf = i + 1; customData[b].vp = p;
    });
  }
  if (/Android/.test(navigator.userAgent)) {
    fetch("http://127.0.0.1:8765/api/anki/ping", { mode: "no-cors" }).catch(function () {});
  }
} catch (e) { /* ne jamais gêner la révision */ }
