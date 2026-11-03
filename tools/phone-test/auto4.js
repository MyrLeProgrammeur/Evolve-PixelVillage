// Test save only (port 8766): tops up every visible resource through window.ankiCredit (caps respected),
// researches whatever is affordable, builds with priority on knowledge storage and the Era 2-3 path.
(function () {
  if (window.__auto) clearInterval(window.__auto);
  window.__log = []; var n = 0;
  // never click anything that resets or ends a run
  var BAN = /^tech-(mad|bioseed|genesis|demonic_infusion|dark_bomb|purify|dial_it|protocol66|quantum_entanglement|stellar_engine|exotic_infusion|arpa|monument)$|^arpa|^city-(slave|horseshoe)/;
  var PRIO = ['city-library', 'city-university', 'city-wardenclyffe', 'city-shed', 'city-storage_yard', 'city-warehouse', 'city-bank',
    'city-smelter', 'city-cement_plant', 'city-coal_mine', 'city-mine', 'city-foundry', 'city-coal_power', 'city-factory', 'city-oil_well',
    'city-oil_depot', 'city-oil_power', 'city-wharf', 'city-apartment', 'city-cottage', 'city-basic_housing', 'city-garrison', 'city-boot_camp',
    'city-metal_refinery', 'city-rock_quarry', 'city-lumber_yard', 'city-sawmill', 'city-farm', 'city-silo', 'city-mill', 'city-trade', 'city-temple', 'city-amphitheatre'];
  function ok(el) { return el && !el.classList.contains('cna') && !el.classList.contains('cnam') && !BAN.test(el.id); }
  function click(el) { var a = el && el.querySelector('a'); if (!a) return false; a.click(); window.__log.push(el.id); if (window.__log.length > 300) window.__log.shift(); return true; }
  window.__auto = setInterval(function () {
    var G = window.evolve && window.evolve.global; if (!G || !G.race || G.race.species === 'protoplasm') return; n++;
    Object.keys(G.resource || {}).forEach(function (r) { var x = G.resource[r]; if (x && x.display && x.max !== 0) { try { window.ankiCredit(r, x.max > 0 ? x.max : 1e6); } catch (e) {} } });
    function tab(name) { var t = [].slice.call(document.querySelectorAll('#mainTabs > nav.tabs a')).find(function (a) { return a.textContent.trim().indexOf(name) === 0; }); if (t) t.click(); }
    if (n % 8 === 0) tab('Research'); if (n % 8 === 4) tab('Civilization');
    // research first
    var techs = [].slice.call(document.querySelectorAll('[id^="tech-"]')).filter(ok).filter(function (e) { return !/^tech-dist/.test(e.id) && !/\bvb\b/.test(e.className) && e.querySelector('a'); });
    if (techs.length) { click(techs[0]); return; }
    // then buildings by priority, with a little rotation so storage keeps pace
    for (var i = 0; i < PRIO.length; i++) { var el = document.getElementById(PRIO[(i + (n % 3)) % PRIO.length]); if (ok(el) && click(el)) return; }
    var rest = [].slice.call(document.querySelectorAll('[id^="city-"]')).filter(ok).filter(function (e) { return !/^city-(food|lumber|stone|chrysotile|slaughter)$/.test(e.id); });
    if (rest.length) click(rest[n % rest.length]);
  }, 250);
  return 'auto4 on';
})()
