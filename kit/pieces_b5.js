/* Batch 5 pieces: 58 citizen parts. Body frame 16x24, feet at the bottom centre (between x 7 and 8).
   `at` = top-left of the piece inside that frame. Arms carry attach.hand (frame coords); tools carry attach.grip
   (piece coords). Light from the upper left: lit tones on the left, dark on the right and bottom, no black outline. */
(function (G) {
  var SK = G.SK = G.SK || {};
  var P = SK.PIECES = SK.PIECES || {};
  function C(o) { o.cat = 'citizen'; o.mirror = o.mirror || 'face'; if (!o.anchor) o.anchor = [0, o.h]; return o; }
  var L = { MAIN: 'hide', WOOD: 'walnut' }, T = { MAIN: 'sage', ACCENT: 'oak' }, AR = { MAIN: 'sage', ACCENT: 'sage' };
  var D = {
    /* legs and hems */
    legs_stand: C({ w: 6, h: 8, at: [5, 16], uses: 'MAIN WOOD', def: L, rows: [
      '.1233.', '.1243.', '.1243.', '.1243.', '.1243.', '.1243.', '.xyyz.', '.yzzz.'] }),
    legs_step_a: C({ w: 6, h: 8, at: [5, 16], uses: 'MAIN WOOD', def: L, rows: [
      '.1233.', '.1243.', '12..33', '12..33', '12..34', '12..yz', 'xy..zz', 'yz....'] }),
    legs_pass: C({ w: 6, h: 8, at: [5, 16], uses: 'MAIN WOOD', def: L, rows: [
      '.1233.', '.1243.', '.1243.', '.1243.', '.12yz.', '.12zz.', '.xy...', '.yz...'] }),
    legs_step_b: C({ w: 6, h: 8, at: [5, 16], uses: 'MAIN WOOD', def: L, rows: [
      '.1233.', '.1243.', '12..33', '12..33', '12..34', 'xy..34', 'yz..yz', '....zz'] }),
    hem_stand: C({ w: 8, h: 8, at: [4, 16], uses: 'MAIN ACCENT WOOD', def: { MAIN: 'indigo', ACCENT: 'saffron', WOOD: 'walnut' }, rows: [
      '1222b334', '1222b334', '1222b334', '1222b334', '1222b334', '1222b334', 'abbbbccd', '.yz..yz.'] }),
    hem_step: C({ w: 9, h: 8, at: [4, 16], uses: 'MAIN ACCENT WOOD', def: { MAIN: 'indigo', ACCENT: 'saffron', WOOD: 'walnut' }, rows: [
      '1222b334.', '1222b334.', '1222b334.', '.1222b334', '.1222b334', '.1222b334', '.abbbbccd', 'yz....yz.'] }),

    /* torsos */
    torso_tunic: C({ w: 8, h: 8, at: [4, 9], uses: 'MAIN ACCENT SKIN', def: T, rows: [
      '.112t33.', '11122333', '11222334', '12222334', 'abbbbccd', '12222334', '12222334', '.122233.'] }),
    torso_robe: C({ w: 8, h: 8, at: [4, 9], uses: 'MAIN ACCENT', def: { MAIN: 'indigo', ACCENT: 'saffron' }, rows: [
      '.1abbc3.', '1112b333', '1122b334', '1122b334', '1222b334', '1222b334', '1222b334', '1222b334'] }),

    /* arms: 12x12 overlay at [2,5]; 1-4 sleeve, a-d forearm (outfit, or skin for rolled sleeves), s-v hands */
    arm_neutral: C({ w: 12, h: 12, at: [2, 5], attach: { hand: [12, 15], hand2: [3, 15] }, uses: 'MAIN ACCENT SKIN', def: AR, rows: [
      '............', '............', '............', '............',
      '..1......3..', '.12......34.', '.12......34.', '.12......34.', '.ab......cd.', '.ab......cd.', '.st......uv.', '............'] }),
    arm_raise: C({ w: 12, h: 12, at: [2, 5], attach: { hand: [12, 6], hand2: [3, 15] }, uses: 'MAIN ACCENT SKIN', def: AR, rows: [
      '............', '.........st.', '.........cd.', '.........cd.',
      '..1......34.', '.12......34.', '.12.........', '.12.........', '.ab.........', '.ab.........', '.st.........', '............'] }),
    arm_strike: C({ w: 12, h: 12, at: [2, 5], attach: { hand: [13, 13], hand2: [3, 15] }, uses: 'MAIN ACCENT SKIN', def: AR, rows: [
      '............', '............', '............', '............',
      '..1......3..', '.12......34.', '.12.......34', '.12.......cd', '.ab.......uv', '.ab.........', '.st.........', '............'] }),
    arm_hands_a: C({ w: 12, h: 12, at: [2, 5], attach: { hand: [9, 13], hand2: [3, 15] }, uses: 'MAIN ACCENT SKIN', def: AR, rows: [
      '............', '............', '............', '............',
      '..1......3..', '.12......34.', '.12......34.', '.12.....cd4.', '.ab....tu...', '.ab.........', '.st.........', '............'] }),
    arm_hands_b: C({ w: 12, h: 12, at: [2, 5], attach: { hand: [9, 12], hand2: [4, 14] }, uses: 'MAIN ACCENT SKIN', def: AR, rows: [
      '............', '............', '............', '............',
      '..1......3..', '.12......34.', '.12.....cd4.', '.12....tu...', '.ab.........', '..ab........', '..st........', '............'] }),

    /* head */
    head_front: C({ w: 6, h: 6, at: [5, 3], uses: 'SKIN INK', def: {}, rows: [
      '.sstt.', 'ssttuu', 'stotou', 'stttuu', 'sttuuv', '.tuuv.'] }),

    /* back pieces (walking away) */
    back_torso_tunic: C({ w: 8, h: 8, at: [4, 9], uses: 'MAIN ACCENT', def: T, rows: [
      '.112233.', '11122333', '11222334', '12222334', 'abbbbccd', '12222334', '12222334', '.122233.'] }),
    back_torso_robe: C({ w: 8, h: 8, at: [4, 9], uses: 'MAIN ACCENT', def: { MAIN: 'indigo', ACCENT: 'saffron' }, rows: [
      '.112233.', '11122333', 'abbbbccd', '12222334', '12222334', '12223334', '12223334', '12223334'] }),
    back_arm: C({ w: 12, h: 12, at: [2, 5], attach: { hand: [12, 15], hand2: [3, 15] }, uses: 'MAIN ACCENT SKIN', def: AR, rows: [
      '............', '............', '............', '............',
      '..1......3..', '.12......34.', '.12......34.', '.12......34.', '.ab......cd.', '.ab......cd.', '.tu......uv.', '............'] }),
    back_head: C({ w: 6, h: 6, at: [5, 3], uses: 'SKIN', def: {}, rows: [
      '.sstt.', 'ssttuu', 'sttuuu', 'sttuuv', 'sttuuv', '.tuuv.'] }),
    back_hair_1: C({ w: 8, h: 12, at: [4, 0], uses: 'HAIR', def: {}, rows: [
      '........', '........', '..hhii..', '.hhhiij.', '.hhiijj.', '.hiijjj.', '.hiijjk.', '..ijjk..', '........', '........', '........', '........'] }),
    back_hair_2: C({ w: 8, h: 12, at: [4, 0], uses: 'HAIR', def: {}, rows: [
      '........', '........', '..hhii..', '.hhhiij.', '.hhiijj.', 'hhiijjjk', 'hiijjjjk', 'hiijjjkk', 'iijjjjkk', 'iijjjkkk', '.jjjkkk.', '..jkk...'] }),
    back_hair_3: C({ w: 8, h: 12, at: [4, 0], uses: 'HAIR ACCENT', def: { ACCENT: 'madder' }, rows: [
      '........', '........', '..hhii..', '.hhhiij.', '.hhiijj.', '.hiijjj.', '.hiijjk.', '..ijjk..', '...ij...', '...ji...', '...ij...', '...a....'] }),
    back_hair_4: C({ w: 8, h: 12, at: [4, 0], uses: 'HAIR ACCENT', def: { ACCENT: 'madder' }, rows: [
      '...hi...', '..hiij..', '..haaj..', '.hhhiij.', '.hhiijj.', '.hiijjj.', '.hiijjk.', '..ijjk..', '........', '........', '........', '........'] }),

    /* hair (front) */
    hair_short: C({ w: 8, h: 12, at: [4, 0], uses: 'HAIR', def: {}, rows: [
      '........', '........', '..hhii..', '.hhhiij.', '.hhiijj.', '.h....j.', '........', '........', '........', '........', '........', '........'] }),
    hair_long: C({ w: 8, h: 12, at: [4, 0], uses: 'HAIR', def: {}, rows: [
      '........', '........', '..hhii..', '.hhhiij.', '.hhiijj.', 'hh....jj', 'hi....jk', 'hi....jk', 'ij....jk', 'ij....kk', 'j......k', '........'] }),
    hair_braid: C({ w: 8, h: 12, at: [4, 0], uses: 'HAIR ACCENT', def: { ACCENT: 'madder' }, rows: [
      '........', '........', '..hhii..', '.hhhiij.', '.hhiijj.', '.h....jj', '......ij', '......ji', '......ij', '......ji', '......a.', '......j.'] }),
    hair_bun: C({ w: 8, h: 12, at: [4, 0], uses: 'HAIR ACCENT', def: { ACCENT: 'madder' }, rows: [
      '...hi...', '..hiij..', '..haaj..', '.hhhiij.', '.hhiijj.', '.h....j.', '........', '........', '........', '........', '........', '........'] }),

    /* headwear: 12 wide at [2,0] */
    hat_straw: C({ w: 12, h: 5, at: [2, 0], uses: 'MAIN ACCENT', def: { MAIN: 'straw', ACCENT: 'madder' }, rows: [
      '............', '....1122....', '...112223...', '...abbbcc...', '111222222334'] }),
    hat_scarf: C({ w: 12, h: 7, at: [2, 0], uses: 'MAIN ACCENT', def: { MAIN: 'teal', ACCENT: 'cream' }, rows: [
      '............', '............', '....1122....', '...112223...', '...1a2a234..', '...1.....34.', '.........4..'] }),
    hat_beanie: C({ w: 12, h: 5, at: [2, 0], uses: 'MAIN ACCENT', def: { MAIN: 'indigo', ACCENT: 'cream' }, rows: [
      '............', '....1123....', '...112223...', '...122233...', '...abbbcd...'] }),
    hat_miner_lamp: C({ w: 12, h: 5, at: [2, 0], uses: 'MAIN EMBER SPARK', def: { MAIN: 'hide' }, rows: [
      '............', '....1122....', '...11*e23...', '...122233...', '..11222333..'] }),
    hat_hood: C({ w: 12, h: 9, at: [2, 0], uses: 'MAIN ACCENT', def: { MAIN: 'cream', ACCENT: 'gold' }, rows: [
      '............', '....1122....', '...111223...', '..1aabbc33..', '..11....33..', '..11....34..', '..12....34..', '..12....34..', '..12....34..'] }),
    hat_scholar: C({ w: 12, h: 5, at: [2, 0], uses: 'MAIN ACCENT', def: { MAIN: 'soot', ACCENT: 'saffron' }, rows: [
      '............', '..11122233..', '..12222334a.', '..abbbbccda.', '..........b.'] }),
    hat_top: C({ w: 12, h: 5, at: [2, 0], uses: 'MAIN ACCENT', def: { MAIN: 'soot', ACCENT: 'madder' }, rows: [
      '....1223....', '....1223....', '....1223....', '....abcc....', '..11222333..'] }),
    hat_helmet: C({ w: 12, h: 6, at: [2, 0], uses: 'METAL ACCENT', def: { METAL: 'iron', ACCENT: 'madder' }, rows: [
      '.....ab.....', '....mmnn....', '...mmnnnp...', '...mnnnpp...', '..mmnnnppq..', '...m....q...'] }),

    /* tools: drawn upright, head on top; grip = handle pixel held by the hand */
    tool_hoe: C({ w: 5, h: 10, attach: { grip: [0, 8] }, uses: 'METAL WOOD', def: { METAL: 'iron', WOOD: 'oak' }, rows: [
      'y....', 'xmmn.', 'xnnpq', 'x..pq', 'x....', 'y....', 'x....', 'y....', 'x....', 'z....'] }),
    tool_basket: C({ w: 7, h: 7, attach: { grip: [3, 0] }, uses: 'MAIN ACCENT WOOD FOLIAGE', def: { MAIN: 'straw', ACCENT: 'madder', WOOD: 'walnut', FOLIAGE: 'summer' }, rows: [
      '..xyz..', '.x...z.', '.gafag.', '1122334', '1a2a3b4', '1222334', '.12334.'] }),
    tool_spear: C({ w: 3, h: 14, attach: { grip: [1, 9] }, uses: 'METAL ACCENT WOOD', def: { METAL: 'iron', ACCENT: 'madder', WOOD: 'pinewood' }, rows: [
      '.m.', 'mnq', 'mnq', '.p.', '.a.', '.x.', '.y.', '.x.', '.y.', '.x.', '.y.', '.x.', '.y.', '.z.'] }),
    tool_axe: C({ w: 5, h: 10, attach: { grip: [0, 8] }, uses: 'METAL WOOD SPARK', def: { METAL: 'iron', WOOD: 'oak' }, rows: [
      'ymm..', 'xmnn*', 'xnnpq', 'xpq..', 'y....', 'x....', 'y....', 'x....', 'y....', 'z....'] }),
    tool_hammer_big: C({ w: 5, h: 10, attach: { grip: [2, 8] }, uses: 'METAL WOOD', def: { METAL: 'river', WOOD: 'oak' }, rows: [
      'mmnnp', 'mnnpq', 'nppqq', '..w..', '..x..', '..y..', '..x..', '..y..', '..x..', '..z..'] }),
    tool_pick: C({ w: 7, h: 10, attach: { grip: [3, 8] }, uses: 'METAL WOOD', def: { METAL: 'iron', WOOD: 'pinewood' }, rows: [
      '.mmnnp.', 'mnnwppq', 'm..x..q', '...y...', '...x...', '...y...', '...x...', '...y...', '...x...', '...z...'] }),
    tool_shovel: C({ w: 5, h: 10, attach: { grip: [2, 7] }, uses: 'METAL WOOD', def: { METAL: 'iron', WOOD: 'oak' }, rows: [
      '.mnp.', 'mnnpq', 'mnnpq', '.npq.', '..x..', '..y..', '..x..', '..y..', '..x..', '.xyz.'] }),
    tool_hammer: C({ w: 5, h: 8, attach: { grip: [1, 6] }, uses: 'METAL WOOD', def: { METAL: 'iron', WOOD: 'oak' }, rows: [
      'mmnnp', 'mnnpq', '.x...', '.y...', '.x...', '.y...', '.x...', '.z...'] }),
    tool_book: C({ w: 6, h: 5, attach: { grip: [2, 2] }, uses: 'MAIN ACCENT', def: { MAIN: 'cream', ACCENT: 'madder' }, rows: [
      'aaabb1', 'abbbc1', 'abbbc2', 'abbcc2', 'bcccd3'] }),
    tool_flask: C({ w: 5, h: 6, attach: { grip: [2, 3] }, uses: 'MAIN ACCENT WOOD SPARK', def: { MAIN: 'water', ACCENT: 'teal', WOOD: 'oak' }, rows: [
      '.xy..', '.12..', '1*223', 'aabbc', 'abbcd', '.bcd.'] }),
    tool_purse: C({ w: 5, h: 6, attach: { grip: [2, 1] }, uses: 'MAIN METAL WOOD', def: { MAIN: 'hide', METAL: 'gold', WOOD: 'walnut' }, rows: [
      '.x.z.', '..y..', '.1m2.', '11223', '12234', '.234.'] }),
    tool_lute: C({ w: 7, h: 11, attach: { grip: [3, 6] }, uses: 'MAIN ACCENT WOOD INK', def: { MAIN: 'walnut', ACCENT: 'saffron', WOOD: 'oak' }, rows: [
      '...yz..', '...y...', '...x...', '...x...', '..1123.', '.111233', '11oo233', '11oo334', '12a2334', '.23344.', '..344..'] }),
    tool_shield: C({ w: 7, h: 8, attach: { grip: [3, 3] }, uses: 'METAL ACCENT', def: { METAL: 'iron', ACCENT: 'madder' }, rows: [
      '..mnn..', '.maabn.', 'mabbbcp', 'mabnbcp', 'mabbccp', 'nbbccdq', '.pccdq.', '..pqq..'] }),

    /* hand cart */
    cart_box: C({ w: 12, h: 7, mirror: 'free', attach: { grip: [11, 0] }, uses: 'WOOD', def: { WOOD: 'oak' }, rows: [
      '..........xy', '.........x..', 'wwwwwwwwx...', 'xxxxxxxz....', 'xyyyyyyz....', 'xyyyyyyz....', 'zzzzzzzz....'] }),
    cart_wheel_a: C({ w: 5, h: 5, mirror: 'free', uses: 'WOOD', def: { WOOD: 'walnut' }, rows: [
      '.xxy.', 'x.y.z', 'yyzyz', 'y.y.z', '.yzz.'] }),
    cart_wheel_b: C({ w: 5, h: 5, mirror: 'free', uses: 'WOOD', def: { WOOD: 'walnut' }, rows: [
      '.xxy.', 'xy.yz', 'y.z.z', 'yy.zz', '.yzz.'] }),

    /* bohemian flourishes */
    fl_scarf_end: C({ w: 10, h: 6, at: [1, 9], uses: 'ACCENT', def: { ACCENT: 'saffron' }, rows: [
      '....abbbcc', '..abc.....', '.abc......', '.ab.......', 'ab........', 'b.........'] }),
    fl_sash: C({ w: 8, h: 4, at: [4, 13], uses: 'ACCENT', def: { ACCENT: 'saffron' }, rows: [
      'abacbacd', '......bc', '......bd', '......c.'] }),
    fl_apron_pocket: C({ w: 6, h: 8, at: [5, 10], uses: 'MAIN ACCENT', def: { MAIN: 'hide', ACCENT: 'walnut' }, rows: [
      '1....4', '1....4', '112234', '122334', '1abc34', '1bcd34', '122334', '.2334.'] }),
    fl_shoulder_bag: C({ w: 9, h: 9, at: [2, 9], uses: 'MAIN ACCENT', def: { MAIN: 'hide', ACCENT: 'madder' }, rows: [
      '........a', '.......a.', '......a..', '.....a...', '....a....', '112a.....', '1b23.....', '1223.....', '.234.....'] }),
    fl_flower_hair: C({ w: 3, h: 3, at: [4, 3], uses: 'ACCENT EMBER FOLIAGE', def: { ACCENT: 'rose', FOLIAGE: 'summer' }, rows: [
      '.a.', 'aeb', 'fb.'] }),
    fl_beads: C({ w: 5, h: 2, at: [5, 10], uses: 'ACCENT SPARK', def: { ACCENT: 'teal' }, rows: [
      'b...b', '.a*a.'] }),
    fl_headband: C({ w: 8, h: 3, at: [5, 4], uses: 'ACCENT', def: { ACCENT: 'madder' }, rows: [
      'abacabc.', '......cd', '.......d'] }),
    fl_poncho_trim: C({ w: 8, h: 2, at: [4, 11], uses: 'ACCENT', def: { ACCENT: 'saffron' }, rows: [
      'ab..ab..', '..cd..cd'] })
  };
  for (var k in D) P[k] = D[k];
  SK.PARTS = SK.PARTS || {};
  SK.PARTS.b5 = true;
})(window);
