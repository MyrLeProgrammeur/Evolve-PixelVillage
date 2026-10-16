/* Batch 2 pieces: 12 hero details, 8 bohemian modules, 2 lodge signatures (sig_antlers, sig_drying_rack).
   strip:'2:1' / '1:1' pieces are drawn flat and laid along an eave, ridge, rake or wall base by integer
   column shear (each column moves whole, so nothing is resampled). */
(function (G) {
  var SK = G.SK = G.SK || {};
  var P = SK.PIECES = SK.PIECES || {};
  function add(o) { for (var k in o) P[k] = o[k]; }
  add({
    /* ---------- HERO DETAILS (12) ---------- */
    hd_thatch_fringe: { cat: 'hero', w: 16, h: 3, anchor: [0, 0], strip: '2:1', mirror: 'free', uses: 'MAIN', def: { MAIN: 'straw' }, rows: [
      '1221122112211221',
      '2332.3322332.332',
      '3.43..4.3.4..4.3'] },
    hd_ridge_knot: { cat: 'hero', w: 8, h: 4, anchor: [1, 3], mirror: 'free', uses: 'MAIN WOOD', def: { MAIN: 'straw', WOOD: 'walnut' }, rows: [
      '........',
      '.y..1221',
      '..y22z23',
      '.x.33z34'] },
    hd_clay_ridge: { cat: 'hero', w: 16, h: 3, anchor: [0, 2], strip: '2:1', mirror: 'free', uses: 'MAIN', def: { MAIN: 'terracotta' }, rows: [
      '.12..12..12..12.',
      '1223122312231223',
      '3443344334433443'] },
    hd_chimney_cap: { cat: 'hero', w: 5, h: 4, anchor: [2, 4], mirror: 'none', uses: 'MAIN', def: { MAIN: 'river' }, rows: [
      '.111.',
      '12223',
      '34444',
      '.243.'] },
    hd_moss_base: { cat: 'hero', w: 16, h: 3, anchor: [0, 3], strip: '2:1', mirror: 'free', uses: 'MAIN FOLIAGE', def: { MAIN: 'river', FOLIAGE: 'summer' }, rows: [
      'gf...fg...gff...',
      '2l1223l2122l3122',
      'l33l344r33l4334g'] },
    hd_ivy: { cat: 'hero', w: 8, h: 12, anchor: [0, 12], mirror: 'free', uses: 'FOLIAGE ACCENT', def: { FOLIAGE: 'conifer', ACCENT: 'cream' }, rows: [
      '....fg..',
      '...fgl..',
      '..gfl.f.',
      '.fgl.fg.',
      '.gl.fgl.',
      'fgla.gl.',
      '.lr.fgr.',
      '..fglr..',
      '.fgl.a..',
      'fgr.fg..',
      '.lr..lr.',
      '..r...r.'] },
    hd_shutter_pattern_a: { cat: 'hero', w: 3, h: 7, anchor: [0, 7], skew: 'left', mirror: 'face', uses: 'MAIN INK', def: { MAIN: 'teal' }, rows: [
      '12.',
      '2o3',
      '2o3',
      '223',
      '2o3',
      '323',
      '..4'] },
    hd_shutter_pattern_b: { cat: 'hero', w: 3, h: 7, anchor: [0, 7], skew: 'left', mirror: 'face', uses: 'MAIN ACCENT', def: { MAIN: 'indigo', ACCENT: 'saffron' }, rows: [
      '12.',
      '2a3',
      'aba',
      '2a3',
      '223',
      '323',
      '..4'] },
    hd_lintel: { cat: 'hero', w: 10, h: 3, anchor: [0, 3], strip: '2:1', mirror: 'free', uses: 'WOOD ACCENT', def: { WOOD: 'walnut', ACCENT: 'madder' }, rows: [
      'xxxxxxxxxx',
      'bacabacaba',
      'zyyzyyzyyz'] },
    hd_bargeboard: { cat: 'hero', w: 12, h: 4, anchor: [0, 0], strip: '1:1', mirror: 'free', uses: 'WOOD', def: { WOOD: 'oak' }, rows: [
      'xxxxxxxxxxxx',
      'yyyyyyyyyyyy',
      'zyyzzyyzzyyz',
      '.zz..zz..zz.'] },
    hd_halftimber: { cat: 'hero', w: 8, h: 8, tile: true, anchor: [0, 0], mirror: 'free', uses: 'MAIN WOOD', def: { MAIN: 'lime', WOOD: 'walnut' }, rows: [
      'x1111111',
      'x11111y2',
      'x1111y21',
      'x111y211',
      'x11y2111',
      'x1y21111',
      'xy211111',
      'zzzzzzzz'] },
    hd_doorstep: { cat: 'hero', w: 8, h: 3, anchor: [4, 3], mirror: 'face', uses: 'MAIN FOLIAGE', def: { MAIN: 'river', FOLIAGE: 'summer' }, rows: [
      '..1112..',
      '11222233',
      '.gf3344.'] },

    /* ---------- BOHEMIAN MODULES (8) ---------- */
    bunting: { cat: 'module', w: 12, h: 4, anchor: [0, 0], strip: 'sag', mirror: 'free', uses: 'MAIN ACCENT WOOD', def: { MAIN: 'saffron', ACCENT: 'teal', WOOD: 'driftwood' }, rows: [
      'yyyyyyyyyyyy',
      'aab122aab122',
      'ab.12.ab.12.',
      'a..1..a..1..'] },
    wind_chime: { cat: 'module', w: 4, h: 8, anchor: [1, 0], mirror: 'free', uses: 'METAL WOOD ACCENT', def: { METAL: 'bronze', WOOD: 'walnut', ACCENT: 'madder' }, rows: [
      '.y..',
      'yyyy',
      'm.np',
      'mynp',
      'myn.',
      'mbn.',
      'm...',
      'q...'] },
    planter_hang: { cat: 'module', w: 5, h: 7, anchor: [2, 0], mirror: 'free', uses: 'MAIN FOLIAGE ACCENT WOOD', def: { MAIN: 'straw', FOLIAGE: 'summer', ACCENT: 'rose', WOOD: 'walnut' }, rows: [
      '..y..',
      '.y.y.',
      'y.a.y',
      'fgagl',
      '12223',
      'f334g',
      'g...r'] },
    lantern: { cat: 'module', w: 3, h: 6, anchor: [1, 0], mirror: 'none', uses: 'ACCENT WOOD EMBER', def: { ACCENT: 'madder', WOOD: 'walnut' }, rows: [
      '.y.',
      'aab',
      'aeb',
      'aeb',
      'bbc',
      '.c.'] },
    flowerbox: { cat: 'module', w: 7, h: 3, anchor: [0, 3], strip: '2:1', mirror: 'free', uses: 'MAIN ACCENT FOLIAGE', def: { MAIN: 'oak', ACCENT: 'rose', FOLIAGE: 'summer' }, rows: [
      'a.b.a.b',
      'gfgflgr',
      '1222233'] },
    cat_roof: { cat: 'module', w: 7, h: 5, anchor: [3, 5], mirror: 'free', uses: 'MAIN', def: { MAIN: 'ochre' }, rows: [
      '1.1....',
      '121....',
      '.22..4.',
      '.2223.4',
      '.33334.'] },
    rug_plaza: { cat: 'module', w: 12, h: 6, anchor: [6, 3], mirror: 'free', uses: 'MAIN ACCENT', def: { MAIN: 'madder', ACCENT: 'saffron' }, rows: [
      '....bbbb....',
      '..ab2112ba..',
      'ab21c33c12ba',
      'ba12c33c21ab',
      '..ba2112ab..',
      '....bbbb....'] },
    herb_bundle: { cat: 'module', w: 3, h: 6, anchor: [1, 0], mirror: 'free', uses: 'FOLIAGE ACCENT WOOD', def: { FOLIAGE: 'sage', ACCENT: 'madder', WOOD: 'walnut' }, rows: [
      '.y.',
      '.a.',
      'fgl',
      'fgl',
      'glr',
      'r.r'] },

    /* ---------- SIGNATURES pulled forward for the lodge (2 of 18) ---------- */
    sig_antlers: { cat: 'signature', w: 8, h: 6, anchor: [4, 6], mirror: 'free', uses: 'MAIN WOOD', def: { MAIN: 'cream', WOOD: 'walnut' }, rows: [
      '1.1..1.1',
      '.11..11.',
      '..1..1..',
      '..2112..',
      '.xxyyzz.',
      '..xyyz..'] },
    sig_drying_rack: { cat: 'signature', w: 12, h: 10, anchor: [6, 10], mirror: 'free', uses: 'MAIN ACCENT WOOD', def: { MAIN: 'rust', ACCENT: 'hide', WOOD: 'driftwood' }, rows: [
      '.x........x.',
      'xzxxxxxxxxzx',
      'y.yab.1aby.y',
      'y.yab.2aby.y',
      'y.ybc.2bcy.y',
      'y.y.c.3.cy.y',
      'y.y...3..y.y',
      'y.y......y.y',
      'y.y......y.y',
      'z.z......z.z'] }
  });
  SK.PARTS = SK.PARTS || {};
  SK.PARTS.b2 = true;
})(window);
