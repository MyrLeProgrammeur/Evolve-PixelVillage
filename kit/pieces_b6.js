/* Batch 6 pieces: decor (16 + fence_post from batch 3), animals (10), resource icons (10 + 2 from batch 4),
   unit_fur_bundle. Light from the upper left, no black outline, FOLIAGE slot recoloured per season and biome. */
(function (G) {
  var SK = G.SK = G.SK || {};
  var P = SK.PIECES = SK.PIECES || {};
  function add(o) { for (var k in o) P[k] = o[k]; }
  add({
    tree_pine: { cat: 'decor', w: 18, h: 30, anchor: [9, 29], mirror: 'free', uses: 'FOLIAGE WOOD', def: { FOLIAGE: 'conifer', WOOD: 'walnut' }, rows: [
      '........f.........', '........fg........', '.......ffgl.......', '.......fggl.......', '......ffgglr......', '.....ffgggllr.....',
      '......fggllr......', '.....ffggglll.....', '....ffgggglllr....', '...ffgggggllllr...', '....rrggglllrr....', '.....ffgglllr.....',
      '....ffgggglllr....', '...ffgggggllllr...', '..ffgggggglllllr..', '...rrggggllllrr...', '....ffgggglllr....', '...ffgggggllllr...',
      '..ffgggggglllllr..', '.ffgggggggllllllr.', '..rrrggggglllrrr..', '...ffgggggllllr...', '..ffgggggglllllr..', '.ffgggggggllllllr.',
      'ffgggggggglllllllr', '.rrrrrllllllrrrrr.', '........xy........', '........xz........', '.......wxyz.......', '......gxyyzl......'] },
    tree_broadleaf: { cat: 'decor', w: 22, h: 30, anchor: [11, 28], mirror: 'free', uses: 'FOLIAGE WOOD', def: { FOLIAGE: 'summer', WOOD: 'oak' }, rows: [
      '......................', '.........fffgf........', '.......fffggggfgg.....', '....fffffgggglgggg....', '...fffffggggllgggg....', '...fffgggglllrgggl....',
      '...ffgggffffffglll....', '...fgggfffffgggllr....', '...gggfffffgggggfff...', '..fffffffgggggggffgg..', '.fffffffgggggglllgggg.', '.ffggffggggggllllgggl.',
      '.fggggffffgglfffgggll.', '.ggggffffggffffgggllr.', '.gggfffggggfffgggglr..', '..glffggggfffggggll...', '....ggggglgggggglll...', '....ggggxllggzglll....',
      '.....ggllxxyylllrr....', '......llrrxy.llr......', '..........xyz.........', '..........xyz.........', '..........xyz.........', '..........xyz.........',
      '..........xyz.........', '..........xyz.........', '.........wxyz.........', '........wxxyzz........', '.......glwxyzlr.......', '......................'] },
    tree_dead: { cat: 'decor', w: 14, h: 24, anchor: [7, 23], mirror: 'free', uses: 'WOOD', def: { WOOD: 'driftwood' }, rows: [
      '.w.......w....', '..w.....x..w..', '..x..w..x.x...', '...x.x.x..x...', '...xx..x.x....', '.w..x.xy.x..x.',
      '..x.xxyy.yxx..', '...xxxyyyz....', '.....xyyz.....', '.....xyyz.....', '.....xyyz.....', '.....xyyz.....',
      '.....xyzz.....', '.....xyyz.....', '.....xyyz.....', '.....xyyz.....', '.....xyyz.....', '.....xyzz.....',
      '.....xyyz.....', '.....xyyz.....', '....wxyyzz....', '...wxxyyzz....', '..wx.xyz.zz...', '..x..y.z..z...'] },
    sapling: { cat: 'decor', w: 8, h: 10, anchor: [4, 9], mirror: 'free', uses: 'FOLIAGE WOOD', def: { FOLIAGE: 'summer', WOOD: 'oak' }, rows: [
      '...fg...', '..ffgl..', '.ffggll.', '.fggllr.', '..rllr..', '...xy...', '...xy...', '..gxy...', '...xz...', '..gxzl..'] },
    stump: { cat: 'decor', w: 10, h: 8, anchor: [5, 7], mirror: 'free', uses: 'WOOD FOLIAGE', def: { WOOD: 'oak', FOLIAGE: 'summer' }, rows: [
      '...wwww...', '..wxwwxy..', '..xwxxwy..', '..xyyyyz..', '..xyxyyz..', '.gxyyxyzz.', 'xxyyzyyzzz', '.x..y..z..'] },
    bush: { cat: 'decor', w: 12, h: 9, anchor: [6, 8], mirror: 'free', uses: 'FOLIAGE WOOD', def: { FOLIAGE: 'summer', WOOD: 'walnut' }, rows: [
      '...ffg.ffg..', '..ffggfgggl.', '.ffggggggll.', 'ffgggglggllr', 'fgggglllgllr', 'ggglllllllrr', '.lllrlllrrr.', '..rrr.rrrr..', '...wx..xy...'] },
    rock_small: { cat: 'decor', w: 10, h: 7, anchor: [5, 6], mirror: 'free', uses: 'MAIN FOLIAGE', def: { MAIN: 'river', FOLIAGE: 'summer' }, rows: [
      '...1ffg...', '..11fgg12.', '.11111223.', '.22211233.', '2222223334', '2222233344', '.33333444.'] },
    rock_big: { cat: 'decor', w: 18, h: 12, anchor: [9, 11], mirror: 'free', uses: 'MAIN FOLIAGE', def: { MAIN: 'river', FOLIAGE: 'summer' }, rows: [
      '.....1ffg1........', '....11fgg12.......', '...111111122......', '..11111111223.111.', '..2221111223311112', '.22222211233311223',
      '.22222223333212233', '222222223333222334', '222222233334222334', '322222333344223344', '.33333344444333444', '...444444...4444..'] },
    sundial: { cat: 'decor', w: 14, h: 12, anchor: [7, 11], mirror: 'none', uses: 'MAIN ACCENT METAL', def: { MAIN: 'sandstone', ACCENT: 'ochre', METAL: 'bronze' }, rows: [
      '......mn......', '...1111mn12...', '.1a1111111a2..', '1a111111111a23', '.2222222233334', '...22333444...',
      '.....1233.....', '.....1233.....', '.....1233.....', '....112334....', '..1122233344..', '..2233334444..'] },
    signpost: { cat: 'decor', w: 10, h: 16, anchor: [5, 15], mirror: 'free', uses: 'MAIN ACCENT WOOD FOLIAGE', def: { MAIN: 'pinewood', ACCENT: 'madder', WOOD: 'walnut', FOLIAGE: 'summer' }, rows: [
      '....xy....', '.1111111a.', '.2a2a2a2ab', '.3333333c.', '....xy....', '.a1111111.', 'ba2a2a2a2.', '.c3333333.',
      '....xy....', '....xy....', '....xy....', '....xy....', '....xz....', '....xy....', '...wxyz...', '..gwxyzl..'] },
    standing_stone: { cat: 'decor', w: 8, h: 18, anchor: [4, 17], mirror: 'none', uses: 'MAIN ACCENT FOLIAGE', def: { MAIN: 'slate', ACCENT: 'ochre', FOLIAGE: 'summer' }, rows: [
      '..1112..', '.111122.', '.1111223', '11111223', '11111223', '1aaaaa23', '1a122a23', '1a1a2a23', '1a1aaa23',
      '1a122223', '11122223', '11222233', '12222333', '12222334', '12222334', '12223334', 'g2223334', 'fg33344r'] },
    tuft_flowers_a: { cat: 'decor', w: 8, h: 6, anchor: [4, 5], mirror: 'free', uses: 'ACCENT EMBER FOLIAGE', def: { ACCENT: 'rose', FOLIAGE: 'summer' }, rows: [
      '.a....c.', 'aea..cec', '.f..g.l.', '.fg.gl..', 'ffgglgll', '.rgglrr.'] },
    tuft_flowers_b: { cat: 'decor', w: 8, h: 6, anchor: [4, 5], mirror: 'free', uses: 'ACCENT EMBER FOLIAGE', def: { ACCENT: 'saffron', FOLIAGE: 'summer' }, rows: [
      '...a....', '..aea.b.', '..fa.beb', '.f.g..l.', '.fggglg.', 'rffgglrr'] },
    mushrooms: { cat: 'decor', w: 7, h: 5, anchor: [3, 4], mirror: 'free', uses: 'MAIN ACCENT SPARK FOLIAGE', def: { MAIN: 'cream', ACCENT: 'madder', FOLIAGE: 'summer' }, rows: [
      '.aab...', 'a*abc..', '..12.ab', '..12.12', 'gf23gl3'] },
    fire_ring: { cat: 'decor', w: 14, h: 8, anchor: [7, 6], mirror: 'none', uses: 'MAIN WOOD EMBER INK', def: { MAIN: 'river', WOOD: 'walnut' }, rows: [
      '.....1212.....', '..1213..1223..', '.12..xyez..23.', '12..yezoey..34', '23...zooz...34', '.233.......34.', '..2334..3344..', '.....3344.....'] },
    lantern_post: { cat: 'decor', w: 6, h: 18, anchor: [1, 17], attach: { bunting: [1, 0] }, mirror: 'none', uses: 'WOOD ACCENT EMBER', def: { WOOD: 'walnut', ACCENT: 'saffron' }, rows: [
      'xy....', 'xyyyz.', 'xy..z.', 'xy.aab', 'xy.aeb', 'xy.abc', 'xy..c.', 'xy....', 'xy....', 'xy....', 'xy....', 'xy....',
      'xy....', 'xy....', 'xy....', 'xy....', 'wxyz..', 'xyyzz.'] },

    /* animals: side view facing right */
    deer_rest: { cat: 'animal', w: 14, h: 14, anchor: [6, 13], mirror: 'free', uses: 'MAIN ACCENT INK', def: { MAIN: 'ochre', ACCENT: 'cream' }, rows: [
      '..............', '.........12...', '........1122..', '........1o223.', '........122234', '.......1223...', '..1111122a....',
      '.a11112222a...', '.122222223....', '..22aaa233....', '..23...23.....', '..2.3..2.3....', '..3.3..3.3....', '..4.4..4.4....'] },
    deer_step_a: { cat: 'animal', w: 14, h: 14, anchor: [6, 13], mirror: 'free', uses: 'MAIN ACCENT INK', def: { MAIN: 'ochre', ACCENT: 'cream' }, rows: [
      '..............', '.........12...', '........1122..', '........1o223.', '........122234', '.......1223...', '..1111122a....',
      '.a11112222a...', '.122222223....', '..22aaa233....', '..23...23.....', '.2..3.2..3....', '.3..3.3..3....', '.4..4.4..4....'] },
    deer_step_b: { cat: 'animal', w: 14, h: 14, anchor: [6, 13], mirror: 'free', uses: 'MAIN ACCENT INK', def: { MAIN: 'ochre', ACCENT: 'cream' }, rows: [
      '..............', '.........12...', '........1122..', '........1o223.', '........122234', '.......1223...', '..1111122a....',
      '.a11112222a...', '.122222223....', '..22aaa233....', '..23...23.....', '..23...23.....', '..33...33.....', '..44...44.....'] },
    antlers_layer: { cat: 'animal', w: 14, h: 14, anchor: [6, 13], mirror: 'free', uses: 'WOOD', def: { WOOD: 'pinewood' }, rows: [
      '.......x.x.y..', '........xxy...', '..............', '..............', '..............', '..............', '..............',
      '..............', '..............', '..............', '..............', '..............', '..............', '..............'] },
    boar_a: { cat: 'animal', w: 12, h: 9, anchor: [6, 8], mirror: 'free', uses: 'MAIN ACCENT INK', def: { MAIN: 'walnut', ACCENT: 'cream' }, rows: [
      '...11112....', '..1111122.1.', '.11112222112', '1111222221o2', '112222222234', '.222233333a.', '..3333344...', '..3.4..3.4..', '..4.4..4.4..'] },
    boar_b: { cat: 'animal', w: 12, h: 9, anchor: [6, 8], mirror: 'free', uses: 'MAIN ACCENT INK', def: { MAIN: 'walnut', ACCENT: 'cream' }, rows: [
      '...11112....', '..1111122.1.', '.11112222112', '1111222221o2', '112222222234', '.222233333a.', '..3333344...', '.3..4.3..4..', '.4...4.4..4.'] },
    boar_c: { cat: 'animal', w: 12, h: 9, anchor: [6, 8], mirror: 'free', uses: 'MAIN ACCENT INK', def: { MAIN: 'walnut', ACCENT: 'cream' }, rows: [
      '..11112.....', '.11111222...', '1111122222..', '11222222221.', '112222222212', '.22223333o22', '..3333344234', '..3.4..3.4a.', '..4.4..4.4..'] },
    rabbit_sit: { cat: 'animal', w: 8, h: 7, anchor: [4, 6], mirror: 'free', uses: 'MAIN ACCENT INK', def: { MAIN: 'driftwood', ACCENT: 'cream' }, rows: [
      '....1.2.', '....1.2.', '...11122', '.a1111o2', 'aa112223', '.1222233', '..33.34.'] },
    rabbit_hop: { cat: 'animal', w: 8, h: 7, anchor: [4, 6], mirror: 'free', uses: 'MAIN ACCENT INK', def: { MAIN: 'driftwood', ACCENT: 'cream' }, rows: [
      '......12', '.....12.', '....1112', '.a1111o2', 'aa11222.', '12233...', '3....3..'] },
    fish: { cat: 'animal', w: 8, h: 4, anchor: [4, 3], mirror: 'free', uses: 'MAIN INK', def: { MAIN: 'saffron' }, rows: [
      '...112..', '1.11122.', '.1122o23', '2.2233..'] },

    /* resource icons 16x16 (MAIN recolourable) */
    ic_food: { cat: 'icon', w: 16, h: 16, anchor: [8, 16], mirror: 'none', uses: 'MAIN ACCENT', def: { MAIN: 'straw', ACCENT: 'madder' }, rows: [
      '................', '.....1...1......', '....121.121..1..', '..1.122.122.12..', '..12.22..22.22..', '..122.2..2.223..', '...22.2..2.23...', '....2.2..2.3....',
      '.....aabbbc.....', '.....abbbcc.....', '....2.2..3.3....', '...2..2..3..3...', '..2...2..3...3..', '..2...2..3...3..', '.33...3..3...44.', '................'] },
    ic_wood: { cat: 'icon', w: 16, h: 16, anchor: [8, 16], mirror: 'none', uses: 'MAIN ACCENT', def: { MAIN: 'walnut', ACCENT: 'pinewood' }, rows: [
      '................', '................', '......1112......', '.....1aaab3.....', '.....1abcb3.....', '.....1abbc3.....', '.....2bccc4.....', '......2334......',
      '...1112..1112...', '..1aaab31aaab3..', '..1abcb31abcb3..', '..1abbc31abbc3..', '..2bccc42bccc4..', '...2334..2334...', '................', '................'] },
    ic_stone: { cat: 'icon', w: 16, h: 16, anchor: [8, 16], mirror: 'none', uses: 'MAIN SPARK', def: { MAIN: 'river' }, rows: [
      '................', '................', '................', '.......111......', '.....11*1112....', '....111111122...', '...1111111223...', '..22211112233...',
      '..222221223333..', '.2222222233333..', '.2222222333334..', '.3222223333344..', '..33333334444...', '....4444444.....', '................', '................'] },
    ic_fur: { cat: 'icon', w: 16, h: 16, anchor: [8, 16], mirror: 'none', uses: 'MAIN ACCENT', def: { MAIN: 'hide', ACCENT: 'walnut' }, rows: [
      '................', '..11........23..', '...1111111122...', '....11111122....', '....1a11a122....', '....11a11122....', '....1111a223....', '....11111223....',
      '....1a112223....', '...11111222333..', '..11...2..2233..', '..1....3.....3..', '................', '................', '................', '................'] },
    ic_ingot: { cat: 'icon', w: 16, h: 16, anchor: [8, 16], mirror: 'none', uses: 'MAIN SPARK', def: { MAIN: 'iron' }, rows: [
      '................', '................', '................', '................', '................', '.....111111112..', '....1*11111122..', '...111111111223.',
      '..2222222222333.', '..2222222223333.', '..2222222233334.', '..3333333333444.', '...44444444444..', '................', '................', '................'] },
    ic_sack: { cat: 'icon', w: 16, h: 16, anchor: [8, 16], mirror: 'none', uses: 'MAIN ACCENT', def: { MAIN: 'cream', ACCENT: 'madder' }, rows: [
      '................', '................', '......a.b.......', '.......ab.......', '......1112......', '.....111122.....', '....11111122....', '...1111111223...',
      '...1111a11223...', '..111111112233..', '..111111122233..', '..111111222233..', '..222222223334..', '...2233333344...', '....33344444....', '................'] },
    ic_coal: { cat: 'icon', w: 16, h: 16, anchor: [8, 16], mirror: 'none', uses: 'MAIN SPARK', def: { MAIN: 'soot' }, rows: [
      '................', '................', '...........*....', '..........***...', '...........*....', '......1112......', '....11111122....', '...1111112222...',
      '..112111122223..', '..122211222233..', '..222222223333..', '..222222333334..', '...2233333444...', '....33344444....', '................', '................'] },
    ic_head: { cat: 'icon', w: 16, h: 16, anchor: [8, 16], mirror: 'none', uses: 'MAIN ACCENT', def: { MAIN: 'skin_tan', ACCENT: 'teal' }, rows: [
      '................', '................', '......1112......', '.....111122.....', '.....111122.....', '.....111222.....', '.....112223.....', '......2233......',
      '.......23.......', '....aaabbbbc....', '...aaabbbbbcc...', '..aaabbbbbbccd..', '..aabbbbbbbccd..', '..abbbbbbbcccd..', '..bbbbbbbccddd..', '................'] },
    ic_face: { cat: 'icon', w: 16, h: 16, anchor: [8, 16], mirror: 'none', uses: 'MAIN INK SPARK', def: { MAIN: 'saffron' }, rows: [
      '................', '................', '.....111112.....', '...1*11111122...', '..111111111122..', '..111o111o1122..', '.1111o111o11223.', '.11111111111223.',
      '.111o11111o1223.', '.2222ooooo22333.', '..222222222333..', '..222222223334..', '...2222233344...', '.....333444.....', '................', '................'] },
    ic_house: { cat: 'icon', w: 16, h: 16, anchor: [8, 16], mirror: 'none', uses: 'MAIN ACCENT WOOD EMBER FOLIAGE', def: { MAIN: 'cream', ACCENT: 'madder', WOOD: 'walnut', FOLIAGE: 'summer' }, rows: [
      '................', '.......ab.......', '......aabc......', '.....aaabcc.....', '....aaaabbcc....', '...aaaabbbccc...', '..aaaabbbbcccd..', '.cccccccccccccd.',
      '..111111112223..', '..1ee1111xy223..', '..1ee1111xy223..', '..11111111xy23..', '..fgl11111xy23..', '..22222222xz34..', '.33333333333344.', '................'] },

    unit_fur_bundle: { cat: 'unit', w: 8, h: 8, anchor: [4, 8], mirror: 'free', uses: 'MAIN ACCENT WOOD', def: { MAIN: 'hide', ACCENT: 'cream', WOOD: 'walnut' }, rows: [
      '........', '........', '..11112.', '.1111122', '1a11y122', '1aa1y223', '12a2y233', '.2233z3.'] }
  });
  SK.PARTS = SK.PARTS || {};
  SK.PARTS.b6 = true;
})(window);
