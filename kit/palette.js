/* Evolve village sprite kit — master palette (data only).
   Every ramp: 5 tones, light -> dark, hue-shifted (lights warm/yellow, darks cool/violet).
   Pieces paint with tones 1-4; tone 5 lets the generator shade one step without losing outlines. */
(function (G) {
  var SK = G.SK = G.SK || {};
  SK.PALETTE = {
    version: 1,
    ink: '#2a1f2b',
    spark: '#fff8e0',
    ramps: {
      oak:        ['#e8b77a', '#c98e52', '#9c6638', '#6e4329', '#45291f'],
      pinewood:   ['#f0d29a', '#d4aa68', '#a97d45', '#79552f', '#4b3422'],
      walnut:     ['#b98058', '#8e5a3c', '#66402d', '#452a21', '#2b1b18'],
      driftwood:  ['#d7c8af', '#ac9b82', '#7e705f', '#574d45', '#37302f'],

      river:      ['#e6dfcf', '#bdb3a0', '#8f8677', '#645d55', '#3f3a38'],
      sandstone:  ['#f0dfb4', '#cdb282', '#9f875e', '#6e5c42', '#43382c'],
      slate:      ['#bcc0c2', '#8f959b', '#676d76', '#464b55', '#2c2f38'],

      terracotta: ['#f3a878', '#d67b4c', '#a85636', '#763a28', '#47241e'],
      brick:      ['#d98d6c', '#b55f45', '#873f33', '#5a2a27', '#37191b'],
      lime:       ['#fbf1dc', '#e6d4b0', '#bea887', '#8a7963', '#5a4f44'],
      ochre:      ['#f8d48a', '#e0a956', '#b17a3c', '#7a522b', '#4a321f'],
      rosewash:   ['#f7d0c0', '#e0a596', '#b57a72', '#7f5254', '#4e3239'],

      straw:      ['#f6e3a1', '#e0c071', '#b8944b', '#866634', '#574224'],
      reed:       ['#e0d6a8', '#bfb07c', '#928456', '#66593c', '#423a2a'],
      hide:       ['#e8c9a0', '#c99f72', '#9c734e', '#6c4c35', '#432f24'],

      spring:     ['#d5ea8a', '#a4cf5c', '#73a843', '#4b7a36', '#2e4f2a'],
      summer:     ['#b6d36a', '#84b14a', '#5b8838', '#3d6130', '#263f26'],
      autumn:     ['#f6c75a', '#e48d38', '#b55a2c', '#7d3a26', '#4a241e'],
      frost:      ['#dfe6d6', '#aebda6', '#7f9480', '#5a6c60', '#3a4842'],
      dry:        ['#e8d888', '#c4ac5a', '#937d40', '#64552f', '#3e3421'],
      conifer:    ['#8fb581', '#5f8c5e', '#3f6849', '#2a4a39', '#1b302a'],
      lush:       ['#c9f07a', '#8fd65a', '#5cad48', '#3a8040', '#22532f'],
      ashleaf:    ['#b8b0a8', '#8c847e', '#635d5a', '#433f3f', '#2a2829'],
      scorch:     ['#e0a060', '#b8663a', '#84402c', '#57281f', '#331815'],

      saffron:    ['#fbe08a', '#f4bd45', '#d48d2a', '#9c5d1f', '#613818'],
      madder:     ['#f39a7e', '#df6250', '#b23f3c', '#7c2a33', '#4c1b26'],
      indigo:     ['#a9bdea', '#7590d0', '#5465aa', '#3b4479', '#262a4d'],
      teal:       ['#96dccb', '#57b8a6', '#36897f', '#255d5a', '#183a3c'],
      plum:       ['#dca7d0', '#b577ac', '#865183', '#5a365b', '#382139'],
      sage:       ['#d8e2b4', '#adbd85', '#7f9360', '#566643', '#35402c'],
      rose:       ['#fac8c0', '#ee9a96', '#c76a74', '#8e4655', '#592b38'],
      cream:      ['#fffaeb', '#f1e2bf', '#cdb991', '#978464', '#625543'],
      rust:       ['#f0b07a', '#d47c45', '#a2552f', '#6e3824', '#43221a'],
      soot:       ['#9a9590', '#6f6a68', '#4c4848', '#333032', '#201e20'],

      skin_fair:  ['#fde0c4', '#f2b896', '#d48a6c', '#a06050', '#6a3d38'],
      skin_tan:   ['#ecb889', '#cf8f5f', '#a76a42', '#774a30', '#4b2e22'],
      skin_deep:  ['#b8805c', '#95603f', '#6f452e', '#4c2f22', '#2f1d18'],

      hair_black:    ['#5c5466', '#3d3547', '#2a2333', '#1b1622', '#100c14'],
      hair_chestnut: ['#a86e44', '#82502f', '#5c3723', '#3d241b', '#261612'],
      hair_auburn:   ['#e0794a', '#b8522e', '#8a3825', '#5b241c', '#381614'],
      hair_flax:     ['#fae6a0', '#e3c268', '#b6923f', '#7f632a', '#4e3c1c'],
      hair_silver:   ['#f0eee8', '#ccc6bc', '#a09a92', '#74706c', '#4a4848'],

      copper:     ['#fbc49a', '#e5895a', '#b85c3c', '#7d3b2c', '#4a2420'],
      bronze:     ['#f4d78e', '#d4a952', '#a37a35', '#6d5025', '#42301a'],
      iron:       ['#d6dade', '#a3aab1', '#737b85', '#4e545e', '#30343b'],
      steel:      ['#f2f8fa', '#c0d2dc', '#8aa3b2', '#5c7484', '#3a4b58'],
      gold:       ['#fff0a0', '#f6cd52', '#d39a2e', '#9a6821', '#5e3d17'],

      dirt:       ['#e2c08e', '#c09463', '#8f6a45', '#614630', '#3b2b20'],
      sand:       ['#f6e2b0', '#e2c487', '#bf9c62', '#8a6c44', '#574330'],
      basalt:     ['#6d6266', '#4f464c', '#383236', '#252125', '#161316'],
      ashen:      ['#c9c2ba', '#a39b94', '#79726e', '#524d4c', '#333031'],
      snow:       ['#fbfbf7', '#e3e9ec', '#bfcbd4', '#93a2b2', '#66758a'],
      water:      ['#a6e0e2', '#6cbfcf', '#4592b3', '#2f6a8f', '#22486a'],
      murk:       ['#a3b48a', '#77905f', '#51693f', '#374a30', '#23311f'],
      sky:        ['#eef3e6', '#d3e7e3', '#acd1d9', '#83b4c9', '#5d91ae'],
      haze:       ['#dfe3cf', '#c3cdb1', '#a5b594', '#889c7c', '#6c8268'],
      ember:      ['#fff6c2', '#ffd45c', '#f99a3a', '#d95a2f', '#9a3127'],

      /* Era 1 additions (own family): aluminium ingots, famine pallor */
      aluminium:  ['#f6f7f0', '#d9ddd8', '#aeb4b5', '#7c838a', '#4f545d'],
      skin_pale:  ['#efe0cc', '#d4bea8', '#ab9483', '#7b6662', '#4e4045'],

      /* Era 0 additions (own family): pool depths, bog water, warm lagoon, cell interior, membrane pearl, sea-floor fronds */
      abyss:      ['#7ab8bb', '#4f90a3', '#376d8b', '#2b4d6e', '#22314f'],
      bog:        ['#c2c48e', '#919a62', '#657245', '#435036', '#2b3229'],
      lagoon:     ['#cdeec0', '#92d2aa', '#5daa96', '#3f7d7c', '#2c5462'],
      cytoplasm:  ['#fde9c6', '#f4c7a2', '#dc9d86', '#ab6f6e', '#6f4753'],
      nacre:      ['#f6ead8', '#dcc4d2', '#b097b6', '#7c6c90', '#4d4563'],
      kelp:       ['#dcd47c', '#a8ab55', '#728543', '#4b603c', '#2e3e30']
    },
    /* Semantic base slots -> default ramp. The generator recolours by swapping the ramp in a slot. */
    slots: { WOOD: 'oak', STONE: 'river', CLAY: 'terracotta', FOLIAGE: 'summer', SKIN: 'skin_fair', CLOTH_A: 'saffron', CLOTH_B: 'indigo', METAL: 'iron' },
    families: [
      { id: 'wood', label: 'Wood', slot: 'WOOD', ramps: ['oak', 'pinewood', 'walnut', 'driftwood'] },
      { id: 'stone', label: 'Stone', slot: 'STONE', ramps: ['river', 'sandstone', 'slate'] },
      { id: 'clay', label: 'Clay, brick, plaster', slot: 'CLAY', ramps: ['terracotta', 'brick', 'lime', 'ochre', 'rosewash'] },
      { id: 'roof', label: 'Straw, reed, hide', slot: 'MAIN', ramps: ['straw', 'reed', 'hide'] },
      { id: 'foliage', label: 'Foliage (seasons + biomes)', slot: 'FOLIAGE', ramps: ['spring', 'summer', 'autumn', 'frost', 'dry', 'conifer', 'lush', 'ashleaf', 'scorch'] },
      { id: 'cloth', label: 'Cloth & paint accents', slot: 'CLOTH_A / CLOTH_B', ramps: ['saffron', 'madder', 'indigo', 'teal', 'plum', 'sage', 'rose', 'cream', 'rust', 'soot'] },
      { id: 'skin', label: 'Skin', slot: 'SKIN', ramps: ['skin_fair', 'skin_tan', 'skin_deep'] },
      { id: 'hair', label: 'Hair', slot: 'HAIR', ramps: ['hair_black', 'hair_chestnut', 'hair_auburn', 'hair_flax', 'hair_silver'] },
      { id: 'metal', label: 'Metal (tech tiers)', slot: 'METAL', ramps: ['copper', 'bronze', 'iron', 'steel', 'gold'] },
      { id: 'ground', label: 'Ground, snow, water, sky, fire', slot: 'terrain', ramps: ['dirt', 'sand', 'basalt', 'ashen', 'snow', 'water', 'murk', 'sky', 'haze', 'ember'] },
      { id: 'era1', label: 'Era 1 additions', slot: 'METAL / SKIN', ramps: ['aluminium', 'skin_pale'] },
      { id: 'era0', label: 'Era 0 additions (pool, cells)', slot: 'MAIN / water', ramps: ['abyss', 'bog', 'lagoon', 'cytoplasm', 'nacre', 'kelp'] }
    ]
  };
})(window);
