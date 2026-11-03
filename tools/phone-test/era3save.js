// TEST SAVE ONLY: refuses to run anywhere but port 8766. Lifts the save to the Era 3 tech levels and reloads through importGame.
(function () {
  if (location.port !== '8766') return 'refused: not the test port';
  var s = JSON.parse(LZString.decompressFromUTF16(localStorage.getItem('evolved')));
  var T = { primitive: 3, axe: 5, hammer: 4, hoe: 4, pickaxe: 4, mining: 4, smelting: 5, cement: 4, housing: 3, agriculture: 5, science: 7, currency: 4,
    military: 4, armor: 2, theology: 2, storage: 4, container: 3, steel_container: 3, high_tech: 3, oil: 4, trade: 3, wharf: 1, titanium: 1, copper: 1,
    explosives: 3, mine_conveyor: 1, foundry: 6, theatre: 3, broadcast: 1, farm: 1, saw: 2, banking: 6, boot_camp: 1, spy: 3, govern: 2, housing_reduction: 1 };
  Object.keys(T).forEach(function (k) { if (!(s.tech[k] >= T[k])) s.tech[k] = T[k]; });
  var C = s.city;
  var POW = ['apartment', 'wardenclyffe', 'coal_power', 'oil_power', 'factory'];
  ['apartment', 'warehouse', 'wardenclyffe', 'coal_power', 'boot_camp', 'oil_well', 'oil_depot', 'oil_power', 'wharf', 'factory', 'smelter', 'cement_plant', 'coal_mine', 'mine', 'foundry', 'storage_yard', 'shed', 'garrison']
    .forEach(function (k) { if (!C[k]) C[k] = POW.indexOf(k) >= 0 ? { count: 0, on: 0 } : { count: 0 }; });
  if (C.factory.Lux == null) Object.assign(C.factory, { Lux: 0, Furs: 0, Alloy: 0, Polymer: 0, Nano: 0, Stanene: 0 });
  if (C.oil_well.dead == null) C.oil_well.dead = 0;
  C.powered = true; if (C.power == null) C.power = 0;
  ['Steel', 'Titanium', 'Oil', 'Alloy', 'Coal', 'Iron', 'Furs'].forEach(function (r) { if (s.resource[r]) s.resource[r].display = true; });
  importGame(LZString.compressToBase64(JSON.stringify(s)));
  return 'imported';
})()
