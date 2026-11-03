/* Batch 10 pieces (Era 2 · discovery): 30 pieces, 31 images, same semantic grid format.
   Brick-and-steel textures, tall mullioned window, works door, steel lintel, downpipe, iron balcony railing, electric lamp,
   crane / gantry / Tesla / radio / converter / furnace / kiln / blasting / drill / dig signatures, worker and spy layers,
   electric sparks, power icon, shipping container and cable coil. Light from the upper left, no black outline. */
(function (G) {
  var SK = G.SK = G.SK || {};
  var P = SK.PIECES = SK.PIECES || {};
  function M(o) { o.b10 = true; return o; }
  function C(o) { o.cat = 'citizen'; o.mirror = o.mirror || 'face'; if (!o.anchor) o.anchor = [0, o.h]; return M(o); }
  var D = {
    /* ---------- textures 8x8 ---------- */
    tex_corrugated: M({ cat: 'texture', w: 8, h: 8, tile: true, uses: 'MAIN', def: { MAIN: 'zinc' }, rows: [
      '12321232', '12321232', '12321232', '12321232', '12321232', '12321232', '12321232', '23432343'] }),
    tex_rivetplate: M({ cat: 'texture', w: 8, h: 8, tile: true, uses: 'MAIN', def: { MAIN: 'steel' }, rows: [
      '22222224', '21222124', '22222224', '22222224', '22222224', '22222224', '21222124', '44444444'] }),
    tex_glasspane: M({ cat: 'texture', w: 8, h: 8, tile: true, uses: 'MAIN ACCENT', def: { MAIN: 'glass', ACCENT: 'iron' }, rows: [
      'abbbabbb', 'a112a112', 'a123a123', 'a233a233', 'abbbabbb', 'a112a112', 'a123a123', 'a233a233'] }),

    /* ---------- modules (wall pieces pre-skewed for the left face) ---------- */
    win_tall: M({ cat: 'module', w: 6, h: 11, anchor: [0, 11], skew: 'left', mirror: 'face', uses: 'METAL ACCENT', def: { METAL: 'iron', ACCENT: 'glass' }, attach: { glass: 'ACCENT' }, rows: [
      'mm....', 'mamn..', 'maanmn', 'mbbnbp', 'mnbnbp', 'manncp', 'mbbnnp', 'mbbnbp', 'npcncp', '..ppcp', '....pq'] }),
    door_works: M({ cat: 'module', w: 8, h: 14, anchor: [0, 14], skew: 'left', mirror: 'face', uses: 'MAIN METAL INK', def: { MAIN: 'oxide', METAL: 'iron' }, attach: { door: [4, 14] }, rows: [
      'mn......', 'm1nn....', 'm322nn..', 'm133o3nn', 'm113o43p', 'm122o44p', 'm132o33p', 'm322o33p', 'm322o34p', 'm133o33p', 'n222o43p', '..23o34p', '....o33p', '......4q'] }),
    hd_steel_lintel: M({ cat: 'module', w: 4, h: 3, anchor: [0, 3], strip: '2:1', mirror: 'free', uses: 'METAL', def: { METAL: 'iron' }, rows: [
      'mmmm', 'npnn', 'qqqq'] }),
    hd_downpipe: M({ cat: 'module', w: 4, h: 5, anchor: [1, 0], mirror: 'free', uses: 'METAL', def: { METAL: 'zinc' }, rows: [
      'mmnp', 'mnpq', '.mp.', 'nmpq', '.mp.'] }),
    balcony_rail: M({ cat: 'module', w: 16, h: 14, anchor: [0, 14], skew: 'left', mirror: 'face', uses: 'MAIN METAL', def: { MAIN: 'river', METAL: 'soot' }, rows: [
      'mm..............', 'nnmm............', 'n...mm..........', 'n...nnmm........', 'pp.nn...mm......', '22ppn...nnmm....', '4422pp.nn...mm..', '..4422ppn...nnmm', '....4422pp.nn...', '......4422ppn...', '........4422pp.n', '..........4422pp', '............4422', '..............44'] }),
    lamp_electric: M({ cat: 'module', w: 6, h: 6, anchor: [0, 1], mirror: 'free', uses: 'METAL ACCENT EMBER SPARK', def: { METAL: 'iron', ACCENT: 'teal' }, rows: [
      'mn....', 'mnnnnp', 'm...n.', 'm..abb', 'm.abbc', '...e*.'] }),

    /* ---------- signatures ---------- */
    sig_hook_block: M({ cat: 'signature', w: 5, h: 9, anchor: [2, 0], mirror: 'free', uses: 'ACCENT METAL INK', def: { ACCENT: 'saffron', METAL: 'steel' }, rows: [
      '.abc.', 'aabcd', 'abocd', 'abbcd', '.bcd.', '..n..', '..n..', 'm.p..', 'mnp..'] }),
    sig_gantry_trolley: M({ cat: 'signature', w: 9, h: 5, anchor: [4, 5], mirror: 'free', uses: 'ACCENT METAL INK', def: { ACCENT: 'saffron', METAL: 'iron' }, rows: [
      '.aabbbc..', 'aabbbbccd', 'abboobccd', 'abbbbbccd', '.mn..mnp.'] }),
    sig_tesla_coil: M({ cat: 'signature', w: 9, h: 14, anchor: [4, 14], mirror: 'none', uses: 'METAL ACCENT WOOD', def: { METAL: 'steel', ACCENT: 'copper', WOOD: 'walnut' }, attach: { torus: [4, 1] }, rows: [
      '..mmnnp..', '.mnn.ppq.', 'mnnpppqqq', '.npppqqq.', '...npq...', '..aabbc..', '..bbccd..', '..aabbc..', '..bbccd..', '..aabbc..', '..bbccd..', '..aabbc..',
      '.wwxxyz..', 'wwxxyyzz.'] }),
    sig_mast_top: M({ cat: 'signature', w: 7, h: 10, anchor: [3, 9], mirror: 'none', uses: 'METAL ACCENT', def: { METAL: 'steel', ACCENT: 'cream' }, attach: { light: [3, 0] }, rows: [
      '...m...', '...m...', '...n...', '..mnp..', 'mnnnnpq', 'a..n..c', 'b..n..d', '..mnp..', '.mn.pq.', 'mn...pq'] }),
    /* Bessemer converter, 22x24 per frame: pear vessel on trunnions, timber cradle; frame 2 tipped 72 deg, mouth to the right */
    sig_converter: M({ cat: 'signature', w: 44, h: 24, anchor: [11, 24], frames: 2, mirror: 'free', uses: 'MAIN METAL WOOD EMBER SPARK INK', def: { MAIN: 'soot', METAL: 'iron', WOOD: 'walnut' }, rows: [
      '............................................', '........meeep...............................', '.......11eee43..............................', '.......1123344.................12p..........', '......112233343.............111222n2233p....', '.....11122333443..........mm122223p3344q....', '.....mmmnnpppqqq..........1m122223p334ee....', '....1112223333443........11m122223pp344ee*..', '....1112223333444.......111m2222333p344eq...', '...nn112223333444pp.....1nn1n222333p344pp...', '..wxp112223333444qyz....11p1n222333pq44qyz..', '..wx1112223333444.yz....1111n2233333q44.yz..', '..wx1112223333444.yz....w1112n233334q4..yz..', '..wx.mmmnnpppqqq..yz....w1112n233344q...yz..', '..wx.11122333444..yz....w1112n2333444...yz..', '..wx..112233344...yz....wx..11n344......yz..', '..wx..112233344...yz....wx..............yz..', '..wx...1123344....yz....wx..............yz..', '..wx..............yz....wx..............yz..', '..wx..............yz....wx..............yz..', '..wx..............yz....wx..............yz..', '..wx..............yz....wx..............yz..', '.wwwwwwxxxxxxxxyyyyyy..wwwwwwxxxxxxxxyyyyyy.', '.xxxxxxyyyyyyyyzzzzzz..xxxxxxyyyyyyyyzzzzzz.'] }),
    sig_boiler_door: M({ cat: 'signature', w: 8, h: 9, anchor: [4, 9], mirror: 'none', uses: 'MAIN METAL INK', def: { MAIN: 'soot', METAL: 'iron' }, attach: { glow: [2, 3, 4] }, rows: [
      '.mmnnpp.', 'mn1112pq', 'mn1222pq', 'mnooooqq', 'mn1222pq', 'mn1m22pq', 'mn2233pq', 'mn2333pq', '.nppqqq.'] }),
    sig_kiln_mouth: M({ cat: 'signature', w: 12, h: 10, anchor: [6, 10], mirror: 'none', uses: 'MAIN EMBER INK', def: { MAIN: 'ironbrick' }, rows: [
      '...111222...', '..11122223..', '.1112oo22333', '.112oeeo2333', '1112oeeo2334', '112oeeeeo234', '112oeeeeo334', '122oeeeeo334', '1222oooo3344', '.2223333344.'] }),
    sig_tnt_crate: M({ cat: 'signature', w: 8, h: 8, anchor: [4, 8], mirror: 'free', uses: 'ACCENT WOOD', def: { ACCENT: 'madder', WOOD: 'pinewood' }, rows: [
      '....z...', '.aabbz..', '.abbcc..', 'wwwwwxxy', 'wxaxxbxy', 'wxxabxxy', 'wxaxxbxy', 'xxyyyyzz'] }),
    sig_obstacle: M({ cat: 'signature', w: 14, h: 14, anchor: [7, 14], mirror: 'free', uses: 'MAIN WOOD', def: { MAIN: 'cream', WOOD: 'walnut' }, rows: [
      'wx..........xy', 'wxwwwwwwwwwwyz', 'wx1xxx1yyy1yyz', 'wxx2x1x2y1y2yz', 'wxzz1zzz1zzzyz', 'wxx1x2x1y2y1yz', 'wx1xxx1yyy1yyz', 'wxz2z1z2z1z2yz', 'wxxx1xxy1yyyyz', 'wxx1x2x1y2y1yz', 'wx1zzz1zzz1zyz', 'wxx2x1x2y1y2yz', 'wxzzzzzzzzzzyz', 'xxyyyyyyyyyyyz'] }),
    sig_dig_find: M({ cat: 'signature', w: 12, h: 7, anchor: [6, 7], mirror: 'free', uses: 'MAIN ACCENT WOOD', def: { MAIN: 'dirt', ACCENT: 'terracotta', WOOD: 'cream' }, rows: [
      '...ab.......', '..abbc...w..', '.a.bc.c..xw.', '.abbbccd.xy.', 'abbbcccd.wx.', '111222223334', '.2223333344.'] }),

    /* ---------- citizen layers (16x24 body frame) ---------- */
    tool_jackhammer: C({ w: 5, h: 10, attach: { grip: [2, 0] }, uses: 'METAL', def: { METAL: 'iron' }, rows: [
      'mnnpq', '.mnp.', '.mnp.', '.mnp.', 'mmnpq', '.mnp.', '.mnp.', '..n..', '..n..', '..p..'] }),
    hat_flatcap: C({ w: 12, h: 5, at: [2, 0], uses: 'MAIN ACCENT', def: { MAIN: 'driftwood', ACCENT: 'walnut' }, rows: [
      '............', '............', '....11122...', '...1122223..', '..aabbbbcc..'] }),
    cloth_overalls: C({ w: 8, h: 8, at: [4, 9], uses: 'MAIN ACCENT', def: { MAIN: 'indigo', ACCENT: 'madder' }, rows: [
      '.1....3.', '.1....3.', '..1..3..', '..1223..', '.112234.', '11122334', '12a22334', '.122233.'] }),
    hat_fedora: C({ w: 12, h: 5, at: [2, 0], uses: 'MAIN ACCENT', def: { MAIN: 'walnut', ACCENT: 'soot' }, rows: [
      '....1122....', '...111223...', '...abbbcc...', '.11112223334', '..22223333..'] }),
    cloth_trenchcoat: C({ w: 10, h: 12, at: [3, 9], uses: 'MAIN ACCENT METAL', def: { MAIN: 'hide', ACCENT: 'walnut', METAL: 'iron' }, rows: [
      '.11a..c33.', '111a1.c334', '1112a2c334', '1112222334', '1122m22334', 'aabbbbbccd', '1122m23334', '1122223334', '1122223334', '1122223344', '.122.2334.', '.12...33..'] }),

    /* ---------- effects, icon, units ---------- */
    fx_spark_0: M({ cat: 'effect', w: 7, h: 7, anchor: [3, 3], mirror: 'free', uses: 'MAIN SPARK', def: { MAIN: 'gold' }, rows: [
      '.1.....', '..1....', '..*1...', '...*...', '..1.*..', '.1...1.', '.....1.'] }),
    fx_spark_1: M({ cat: 'effect', w: 7, h: 7, anchor: [3, 3], mirror: 'free', uses: 'MAIN SPARK', def: { MAIN: 'gold' }, rows: [
      '......1', '....*1.', '...1...', '..*1*..', '.1...1.', '1......', '.......'] }),
    fx_spark_2: M({ cat: 'effect', w: 7, h: 7, anchor: [3, 3], mirror: 'free', uses: 'MAIN SPARK', def: { MAIN: 'gold' }, rows: [
      '...1...', '.1.*.1.', '..*2*..', '1*222*1', '..*2*..', '.1.*.1.', '...1...'] }),
    ic_power: M({ cat: 'icon', w: 16, h: 16, anchor: [8, 16], mirror: 'none', uses: 'MAIN SPARK', def: { MAIN: 'saffron' }, rows: [
      '................', '..........112...', '.........1*23...', '........1123....', '.......1123.....', '......1123......', '.....11111112...', '....111111123...',
      '.......1123.....', '......1123......', '.....1123.......', '....1123........', '...123..........', '...23...........', '................', '................'] }),
    unit_container: M({ cat: 'unit', w: 13, h: 11, anchor: [6, 11], mirror: 'free', uses: 'MAIN METAL', def: { MAIN: 'madder', METAL: 'iron' }, rows: [
      '...11........', '.111111......', '111111111....', '21111111111..', '2221111111113', '2222311111433', '32223221134m3', '.332322223433', '...33222234m4', '.....3322344.', '.......334...'] }),
    unit_cable: M({ cat: 'unit', w: 8, h: 8, anchor: [4, 8], mirror: 'free', uses: 'MAIN ACCENT', def: { MAIN: 'soot', ACCENT: 'copper' }, rows: [
      '..1122..', '.112223.', '112..233', '12....34', '22....34', '233..344', '.233344a', '..3344.b'] })
  };
  Object.keys(D).forEach(function (k) { P[k] = D[k]; });
  SK.PARTS = SK.PARTS || {}; SK.PARTS.b10 = Object.keys(D);
  if (SK._runExt) SK._runExt();
})(window);
