/* [anki-fork] Hôte de la page quand le jeu tourne dans l'add-on Anki bureau (addon/__init__.py).
   Chargé AVANT evolve/main.js. Hors de l'add-on (serve.js, page en ligne), il ne fait rien.
   - Restaure la partie : Python écrit user_files/save.js, qui appelle AnkiVillageHost.seed() avant le jeu.
     Le profil web des add-ons est éphémère : sans ça, la partie disparaîtrait à chaque fermeture d'Anki.
   - Recopie chaque sauvegarde d'Evolve (localStorage 'evolved') vers Python, au plus toutes les 10 s.
   - request(cmd, args) : appel à Python par pycmd, renvoie une promesse (utilisé par anki-bridge.js). */
(function () {
  'use strict';
  if (location.pathname.indexOf('/_addons/') < 0) { return; }

  var KEY = 'evolved', SAVE_EVERY_MS = 10000;
  var pending = null, timer = null, lastSent = null;

  function whenBridge(fn) {
    // pycmd est injecté par Anki à DocumentReady, après le démarrage des scripts.
    if (typeof window.pycmd === 'function') { fn(); return; }
    setTimeout(function () { whenBridge(fn); }, 50);
  }
  function request(cmd, args) {
    return new Promise(function (resolve) {
      whenBridge(function () { window.pycmd('av:' + JSON.stringify(Object.assign({ cmd: cmd }, args || {})), resolve); });
    });
  }
  function flush() {
    timer = null;
    if (pending === null || pending === lastSent) { return; }
    var data = pending; lastSent = data;
    request('save', { data: data });
  }

  var setItem = Storage.prototype.setItem, removeItem = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (k, v) {
    setItem.call(this, k, v);
    if (this === window.localStorage && k === KEY) {
      pending = String(v);
      if (!timer) { timer = setTimeout(flush, lastSent === null ? 0 : SAVE_EVERY_MS); }
    }
  };
  Storage.prototype.removeItem = function (k) {
    removeItem.call(this, k);
    if (this === window.localStorage && k === KEY) {
      // Remise à zéro d'Evolve : elle recharge la page juste après. La marque de session empêche de
      // réinjecter l'ancienne partie au rechargement, même si Python n'a pas encore reçu l'effacement.
      pending = null; lastSent = null;
      try { sessionStorage.setItem('av-cleared', '1'); } catch (e) { /* rien */ }
      request('clear');
    }
  };

  window.AnkiVillageHost = {
    kind: 'addon',
    request: request,
    /* Appelé par user_files/save.js. Le localStorage survit aux rechargements tant qu'Anki tourne : on ne
       l'écrase que s'il est vide, ou s'il appartient à un autre profil Anki. */
    seed: function (data, profile) {
      var ls = window.localStorage, cleared = false;
      try { cleared = sessionStorage.getItem('av-cleared') === '1'; sessionStorage.removeItem('av-cleared'); } catch (e) { /* rien */ }
      var sameProfile = ls.getItem('av-profile') === profile;
      setItem.call(ls, 'av-profile', profile);
      if (cleared && sameProfile) { return; }
      if (sameProfile && ls.getItem(KEY)) { return; }
      if (typeof data === 'string' && data) { setItem.call(ls, KEY, data); lastSent = data; }
      else { removeItem.call(ls, KEY); }
    }
  };

  document.write('<script src="user_files/save.js"><\/script>');
})();
