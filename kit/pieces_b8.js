/* Batch 8 pieces (Era 1 audit follow-up): 53 pieces in the same semantic grid format.
   Icons and units for the crafted goods, the refinery valve, citizen layers (wounded, winter, rain, war, protest,
   famine, scavenger), effects (fire, collapse, gains, food alert), world props (government banner, irrigation,
   dump, graves, neighbour camps, market stall, gallows), pets and state badges. Light from the upper left. */
(function (G) {
  var SK = G.SK = G.SK || {};
  var P = SK.PIECES = SK.PIECES || {};
  function C(o) { o.cat = 'citizen'; o.mirror = o.mirror || 'face'; if (!o.anchor) o.anchor = [0, o.h]; return o; }
  function I(o) { o.cat = 'icon'; o.w = 16; o.h = 16; o.anchor = [8, 16]; o.mirror = 'none'; return o; }
  function U(o) { o.cat = 'unit'; o.w = 8; o.h = 8; o.anchor = [4, 8]; o.mirror = 'free'; return o; }
  var D = {
    /* ---------- icons 16x16 ---------- */
    ic_plank: I({ uses: 'MAIN ACCENT', def: { MAIN: 'pinewood', ACCENT: 'oak' }, rows: [
      '................', '................', '................', '...11111111112..', '..1111111111122.', '..1111211111223.', '..1111111111223.', '..1121111112223.',
      '..1111111111223.', '..1111111211223.', '..2222222222233.', '..aaaaaaaaaaabb.', '..3333333333344.', '..bbbbbbbbbbbcc.', '...4444444444...', '................'] }),
    ic_brick: I({ uses: 'MAIN ACCENT', def: { MAIN: 'brick', ACCENT: 'lime' }, rows: [
      '................', '................', '................', '.....1111112....', '.....1222223....', '.....1222233....', '.....2333334....', '..aaaaaaaaaaaa..',
      '..111112a111112.', '..122223a122223.', '..122233a122233.', '..233334a233334.', '...4444...4444..', '................', '................', '................'] }),
    ic_bar: I({ uses: 'MAIN ACCENT', def: { MAIN: 'iron', ACCENT: 'hide' }, rows: [
      '................', '................', '................', '................', '...1111a1111a112', '...2222b2222b223', '..1111a1111a112.', '..2222b2222b223.',
      '.1111a1111a112..', '.2222b2222b223..', '.3333c3333c334..', '..4444d4444d44..', '................', '................', '................', '................'] }),
    ic_sheet: I({ uses: 'MAIN SPARK', def: { MAIN: 'iron' }, rows: [
      '................', '................', '................', '.......11111112.', '......1*11111122', '.....1111111122.', '....1111111122..', '...1111111122...',
      '..1111111122....', '.1111111122.....', '.3333333334.....', '..444444444.....', '................', '................', '................', '................'] }),
    ic_morale: I({ uses: 'MAIN INK SPARK', def: { MAIN: 'indigo' }, rows: [
      '................', '................', '.....111112.....', '...1*11111122...', '..111111111122..', '..111o111o1122..', '.1111o111o11223.', '.11111111111223.',
      '.11111111111223.', '.2222ooooo22333.', '..22o22222o333..', '..222222223334..', '...2222233344...', '.....333444.....', '................', '................'] }),
    ic_tent: I({ uses: 'MAIN ACCENT INK', def: { MAIN: 'hide', ACCENT: 'walnut' }, rows: [
      '................', '................', '.......ab.......', '......1122......', '......11223.....', '.....111o223....', '.....11oo223....', '....111oo2233...',
      '....11ooo2233...', '...111ooo22333..', '...11oooo22333..', '..111oooo223334.', '..2222222333344.', '.b...........b..', '................', '................'] }),

    /* ---------- units 8x8 ---------- */
    unit_ore: U({ uses: 'MAIN SPARK', def: { MAIN: 'copper' }, rows: [
      '........', '........', '...112..', '.111122.', '11*12223', '11122233', '12223334', '.233344.'] }),
    unit_coin: U({ uses: 'MAIN SPARK', def: { MAIN: 'gold' }, rows: [
      '........', '..*112..', '.111122.', '.233334.', '.122223.', '.233334.', '.122223.', '..3344..'] }),
    unit_plank: U({ uses: 'MAIN', def: { MAIN: 'pinewood' }, rows: [
      '........', '........', '....1112', '..111122', '11211223', '12222334', '3333344.', '.44444..'] }),
    unit_bar: U({ uses: 'MAIN', def: { MAIN: 'iron' }, rows: [
      '........', '........', '........', '..111112', '.1222223', '11111234', '2222234.', '.3344...'] }),
    unit_sheet: U({ uses: 'MAIN SPARK', def: { MAIN: 'iron' }, rows: [
      '........', '........', '........', '...11112', '.1*11122', '11111223', '23333334', '.4444...'] }),

    /* ---------- refinery signature ---------- */
    sig_pipe_valve: { cat: 'signature', w: 7, h: 7, anchor: [3, 7], mirror: 'free', uses: 'METAL ACCENT', def: { METAL: 'iron', ACCENT: 'madder' }, rows: [
      '..abb..', '.b.n.c.', 'b.mnp.c', 'bmnnppc', '.c.p.d.', '..cdd..', '...pq..'] },

    /* ---------- citizen layers (body frame 16x24) ---------- */
    fl_bandage_head: C({ w: 8, h: 4, at: [4, 2], uses: 'MAIN ACCENT', def: { MAIN: 'cream', ACCENT: 'madder' }, rows: [
      '...112..', '.1111a22', '.1222233', '......34'] }),
    arm_sling: C({ w: 12, h: 12, at: [2, 5], attach: { hand: [12, 15], hand2: [3, 15] }, uses: 'MAIN ACCENT SKIN WOOD', def: { MAIN: 'slate', ACCENT: 'slate', WOOD: 'cream' }, rows: [
      '............', '............', '............', '............',
      '..1.....w3..', '.12.....w34.', '.12.....w34.', '.12..tccdd4.', '.ab..wxxxy..', '.ab...xyy...', '.st.........', '............'] }),
    legs_sit: C({ w: 10, h: 4, at: [3, 20], uses: 'MAIN WOOD', def: { MAIN: 'hide', WOOD: 'walnut' }, rows: [
      '.11122333.', '1122223334', 'xy122334yz', '.zz....zz.'] }),
    arm_belly: C({ w: 12, h: 12, at: [2, 5], attach: { hand: [8, 14], hand2: [3, 15] }, uses: 'MAIN ACCENT SKIN', def: { MAIN: 'sage', ACCENT: 'sage' }, rows: [
      '............', '............', '............', '............',
      '..1......3..', '.12......34.', '.12......34.', '..1a....c4..', '...ab..cd...', '....stuv....', '............', '............'] }),
    fl_winter_coat: C({ w: 10, h: 11, at: [3, 9], uses: 'MAIN ACCENT', def: { MAIN: 'walnut', ACCENT: 'cream' }, rows: [
      '.aabbbbcc.', '.1112b233.', '11122b2334', '11222b2334', '1122ab3334', '1122ab3334', '1222b23334', '1222b23344', '1222b23344', '.122b2334.', '.aabbbbcc.'] }),
    hat_fur: C({ w: 12, h: 7, at: [2, 0], uses: 'MAIN ACCENT', def: { MAIN: 'walnut', ACCENT: 'cream' }, rows: [
      '............', '....1122....', '...111223...', '...122233...', '..abbbbbcd..', '...b....c...', '...c....d...'] }),
    fl_rain_hood: C({ w: 12, h: 10, at: [2, 0], uses: 'MAIN ACCENT SPARK', def: { MAIN: 'saffron', ACCENT: 'walnut' }, rows: [
      '.....12.....', '....1122....', '...1*1223...', '..11122233..', '..11....33..', '..11....34..', '..12....34..', '.112....344.', '1122....3344', '11222ab23334'] }),
    fl_leather: C({ w: 8, h: 7, at: [4, 9], uses: 'MAIN ACCENT', def: { MAIN: 'hide', ACCENT: 'walnut' }, rows: [
      '.12..23.', '1122a233', '1122b334', '1222a334', '........', '1.2.3.4.', '1.2.3.4.'] }),
    fl_plate: C({ w: 10, h: 6, at: [3, 9], uses: 'METAL SPARK', def: { METAL: 'iron' }, rows: [
      'mn......pq', 'mnmmnnnppq', 'n.mnnnpp.q', '..mn*npp..', '..nnnppq..', '...nppq...'] }),
    fl_patches: C({ w: 8, h: 11, at: [4, 9], uses: 'ACCENT', def: { ACCENT: 'rust' }, rows: [
      '........', '.ab.....', '.bc.....', '........', '........', '.....ab.', '.....bc.', '........', '........', '..ab....', '..bc....'] }),
    tool_banner: C({ w: 8, h: 18, attach: { grip: [1, 12] }, uses: 'ACCENT WOOD METAL', def: { ACCENT: 'madder', WOOD: 'pinewood', METAL: 'bronze' }, rows: [
      '.m......', '.xaaab..', '.xabbbc.', '.xabbbcc', '.yabbbc.', '.xbbcc..', '.yb..d..', '.x......', '.y......', '.x......', '.y......', '.x......',
      '.y......', '.x......', '.y......', '.x......', '.y......', '.z......'] }),
    tool_torch: C({ w: 4, h: 10, attach: { grip: [1, 7] }, uses: 'ACCENT METAL WOOD SPARK', def: { ACCENT: 'ember', METAL: 'iron', WOOD: 'walnut' }, rows: [
      '..c.', '.bc.', '.abd', 'ba*c', '.mn.', '.xy.', '.xy.', '.xy.', '.xz.', '.z..'] }),
    tool_bow: C({ w: 4, h: 13, attach: { grip: [0, 6] }, uses: 'WOOD MAIN', def: { WOOD: 'walnut', MAIN: 'cream' }, rows: [
      '...y', '..x1', '.x.1', '.x.1', 'x..1', 'x..1', 'w..1', 'x..1', 'x..1', '.y.1', '.y.1', '..y1', '...z'] }),
    tool_scrap_hook: C({ w: 4, h: 12, attach: { grip: [3, 8] }, uses: 'METAL WOOD', def: { METAL: 'iron', WOOD: 'driftwood' }, rows: [
      '.mn.', 'm..p', 'n..x', '...y', '...x', '...y', '...x', '...y', '...x', '...y', '...x', '...z'] }),
    tool_placard: C({ w: 9, h: 13, attach: { grip: [4, 9] }, uses: 'MAIN ACCENT WOOD', def: { MAIN: 'cream', ACCENT: 'madder', WOOD: 'pinewood' }, rows: [
      '111111112', '1a1aa1a23', '122222223', '1aa1a1a23', '233333334', '....x....', '....y....', '....x....', '....y....', '....x....', '....y....', '....x....', '....z....'] }),

    /* ---------- effects ---------- */
    fx_fire_0: { cat: 'effect', w: 12, h: 16, anchor: [6, 16], mirror: 'free', uses: 'MAIN SPARK', def: { MAIN: 'ember' }, rows: [
      '.....4......', '.....43.....', '....433..4..', '....432..43.', '...4332.433.', '...43223433.', '..4432223334', '..4322122334',
      '.43221112334', '.43211*11234', '4432111*1234', '432111111234', '432111111234', '.4321111234.', '..44322344..', '...554455...'] },
    fx_fire_1: { cat: 'effect', w: 12, h: 16, anchor: [6, 16], mirror: 'free', uses: 'MAIN SPARK', def: { MAIN: 'ember' }, rows: [
      '........4...', '...4....4...', '...4...43...', '..43...433..', '..433.4323..', '..43234323..', '.4432222334.', '.4322112234.',
      '43221111234.', '4321*1112344', '432111*11234', '432111111234', '.43211111234', '.4321111234.', '..43322344..', '...554455...'] },
    fx_fire_2: { cat: 'effect', w: 12, h: 16, anchor: [6, 16], mirror: 'free', uses: 'MAIN SPARK', def: { MAIN: 'ember' }, rows: [
      '......4.....', '..4...34....', '..34..334...', '..334.4334..', '.4334.43234.', '.43234322344', '.43222222334', '.43221122334',
      '432211112234', '43211*111234', '432111111234', '43211*111234', '432111111234', '.4321111234.', '..44322344..', '...554455...'] },
    fx_fire_3: { cat: 'effect', w: 12, h: 16, anchor: [6, 16], mirror: 'free', uses: 'MAIN SPARK', def: { MAIN: 'ember' }, rows: [
      '............', '............', '.....4......', '....43...4..', '...433..43..', '...4323.433.', '..4322343334', '..4322223334',
      '.43221112334', '.4321*111234', '432111111234', '432111*11234', '432111111234', '.4321111234.', '..44322344..', '...554455...'] },
    fx_beams: { cat: 'effect', w: 14, h: 8, anchor: [7, 8], mirror: 'free', uses: 'MAIN WOOD', def: { MAIN: 'river', WOOD: 'oak' }, rows: [
      '.wx.......xy..', '..xy.....xy...', '...xy...yz....', '....xy.yz.....', '.....xyz......', '....yz.xy.....', '..112yz1123...', '.11223322334..'] },
    fx_plus: { cat: 'effect', w: 12, h: 12, anchor: [6, 12], mirror: 'none', slice: 4, uses: 'MAIN ACCENT', def: { MAIN: 'cream', ACCENT: 'walnut' }, rows: [
      '..aaaaaaaa..', '.a11111111b.', 'a1111111112b', 'a1111111112b', 'a1111111112b', 'a1111111112b', 'a1111111112b', 'a1111111112b',
      'a1111111112b', 'a2222222222b', '.b22222222c.', '..bbbbbbbb..'] },
    fx_alert_food: { cat: 'effect', w: 12, h: 12, anchor: [5, 12], mirror: 'none', uses: 'MAIN ACCENT', def: { MAIN: 'madder', ACCENT: 'cream' }, rows: [
      '...11112....', '..1111122...', '.111aa1223..', '.111aa1223..', '.111aa2223..', '.111aa2233..', '.1112222334.', '.111aa2334..',
      '..22aa334...', '...23334....', '....34......', '....4.......'] },

    /* ---------- world: modules, hero detail, decor ---------- */
    gov_banner: { cat: 'module', w: 9, h: 12, anchor: [0, 0], mirror: 'free', uses: 'MAIN ACCENT WOOD', def: { MAIN: 'cream', ACCENT: 'madder', WOOD: 'walnut' }, rows: [
      'xyyyyyyyz', '.abbbbbc.', '.abbbbcc.', '.abb1bcc.', '.ab123cc.', '.abb3bcc.', '.abbbbcc.', '.abbbbcd.', '.abbbccd.', '.abbbccd.', '.ab.bc.d.', '..a..c...'] },
    irrig_sluice: { cat: 'module', w: 8, h: 7, anchor: [3, 6], mirror: 'free', uses: 'MAIN WOOD', def: { MAIN: 'water', WOOD: 'oak' }, rows: [
      'wy...wy.', 'xwwwwxz.', 'xyyyyxz.', 'xyzyzxz.', 'x1122xz.', '1122334.', '.22334..'] },
    hd_patch: { cat: 'hero', w: 6, h: 6, anchor: [0, 0], skew: 'left', mirror: 'face', uses: 'WOOD METAL', def: { WOOD: 'driftwood', METAL: 'iron' }, rows: [
      'wx....', 'myxw..', 'xyyxxw', 'yzyymx', '..zzyy', '....zz'] },
    dump_heap: { cat: 'decor', w: 12, h: 7, anchor: [6, 6], mirror: 'free', uses: 'MAIN ACCENT WOOD METAL', def: { MAIN: 'dirt', ACCENT: 'rust', WOOD: 'driftwood', METAL: 'iron' }, rows: [
      '....mn......', '...1pqxy....', '..112a2yz...', '.1122ab23...', '11a2223334..', '122233b3344.', '.2333444444.'] },
    dump_barrel: { cat: 'decor', w: 8, h: 5, anchor: [4, 5], mirror: 'free', uses: 'MAIN METAL INK', def: { MAIN: 'rust', METAL: 'iron' }, rows: [
      '.1m11p2.', '11m12p23', '12n22q3o', '22n23q34', '.3n33q4.'] },
    dump_crate: { cat: 'decor', w: 8, h: 7, anchor: [4, 6], mirror: 'free', uses: 'WOOD', def: { WOOD: 'pinewood' }, rows: [
      '..w..x..', '.wwx.xy.', 'wxxxyxyz', 'x.xy..yz', 'xxy.xyyz', 'xyyzyzz.', '.zz.zz..'] },
    dump_wheel: { cat: 'decor', w: 9, h: 6, anchor: [4, 5], mirror: 'free', uses: 'WOOD', def: { WOOD: 'walnut' }, rows: [
      '..wxxy...', '.x.xy.y..', 'x.xyyz.z.', 'x..yz..z.', '.y.y..z..', '..yzz....'] },
    dump_rags: { cat: 'decor', w: 8, h: 4, anchor: [4, 4], mirror: 'free', uses: 'MAIN ACCENT', def: { MAIN: 'hide', ACCENT: 'plum' }, rows: [
      '..ab1...', '.abc122.', 'abcc2233', '.cdd334.'] },
    dump_pots: { cat: 'decor', w: 8, h: 5, anchor: [3, 5], mirror: 'free', uses: 'MAIN INK', def: { MAIN: 'terracotta' }, rows: [
      '.1112...', '1oo223..', '122233.1', '.2334.12', '..44..23'] },
    grave_marker: { cat: 'decor', w: 8, h: 10, anchor: [4, 9], mirror: 'none', uses: 'MAIN FOLIAGE', def: { MAIN: 'river', FOLIAGE: 'summer' }, rows: [
      '..1112..', '.111223.', '.113223.', '.133323.', '.113234.', '.112234.', '.122234.', '.122334.', 'gf2334lr', '.fglgl..'] },
    camp_tent: { cat: 'decor', w: 16, h: 12, anchor: [8, 11], mirror: 'free', uses: 'MAIN ACCENT WOOD INK', def: { MAIN: 'hide', ACCENT: 'madder', WOOD: 'walnut' }, rows: [
      '.......xy.......', '.......12.......', '......1122......', '.....11223......', '.....112233.....', '....1112233.....', '...aaabbbccd....', '...11oo22333....',
      '..111oo223334...', '..11ooo2233334..', '.1122ooo2333344.', '.w2222333344444z'] },
    market_stall: { cat: 'decor', w: 16, h: 14, anchor: [8, 13], mirror: 'free', uses: 'MAIN ACCENT WOOD FOLIAGE', def: { MAIN: 'cream', ACCENT: 'madder', WOOD: 'oak', FOLIAGE: 'summer' }, rows: [
      '.aa11aa11aa11a..', 'aa11aa11aa11aa1.', 'bb22bb22bb22bb2.', '.c.3.c.3.c.3.c..', '.x............x.', '.x............x.', '.x.f.gr..ab.a.x.', '.xfglrgaabbabbx.',
      'wwwwwwwwwwwwwwxy', 'xxxxxxxxxxxxxxyz', 'xyyxyyxyyxyyxyyz', 'y.............z.', 'y.............z.', 'z.............z.'] },
    gallows: { cat: 'decor', w: 12, h: 18, anchor: [2, 17], mirror: 'free', uses: 'WOOD MAIN', def: { WOOD: 'walnut', MAIN: 'straw' }, rows: [
      'wxxxxxxxxy..', 'xyyyyyyyyz..', 'xy.z....1...', 'xyz.....1...', 'xy......2...', 'xy.....1.2..', 'xy.....1.2..', 'xy......2...',
      'xy..........', 'xy..........', 'xy..........', 'xy..........', 'xy..........', 'xy..........', 'xy..........', 'xy..........', 'wxyz........', 'xyyzz.......'] },

    /* ---------- pets ---------- */
    pet_cat_a: { cat: 'animal', w: 8, h: 7, anchor: [4, 6], mirror: 'free', uses: 'MAIN INK', def: { MAIN: 'ochre' }, rows: [
      '.....1.2', '.....122', '....11o3', '1..11223', '1.112233', '.1122334', '..233.34'] },
    pet_cat_b: { cat: 'animal', w: 8, h: 7, anchor: [4, 6], mirror: 'free', uses: 'MAIN INK', def: { MAIN: 'ochre' }, rows: [
      '......12', '.....112', '1...11o3', '.1111223', '..122233', '..3.3.3.', '..4.4.4.'] },
    pet_dog_a: { cat: 'animal', w: 10, h: 8, anchor: [5, 7], mirror: 'free', uses: 'MAIN ACCENT INK', def: { MAIN: 'hide', ACCENT: 'cream' }, rows: [
      '......12..', '.....1122.', '.....1o22o', '1...1122..', '1..11a23..', '.1112a23..', '.12223334.', '..3.4.34..'] },
    pet_dog_b: { cat: 'animal', w: 10, h: 8, anchor: [5, 7], mirror: 'free', uses: 'MAIN ACCENT INK', def: { MAIN: 'hide', ACCENT: 'cream' }, rows: [
      '......12..', '.....1122.', '.....1o22o', '1..11122..', '.11112a23.', '.1222a233.', '.3.3..3.3.', '.4.4..4.4.'] },

    /* ---------- state badges ---------- */
    badge_off: { cat: 'interface', w: 7, h: 7, anchor: [3, 7], mirror: 'none', uses: 'MAIN ACCENT', def: { MAIN: 'slate', ACCENT: 'cream' }, rows: [
      '.11122.', '11a1a23', '11a1a23', '11a1a23', '12a2a33', '1222334', '.23344.'] },
    badge_full: { cat: 'interface', w: 7, h: 7, anchor: [3, 7], mirror: 'none', uses: 'MAIN ACCENT', def: { MAIN: 'sage', ACCENT: 'cream' }, rows: [
      '.11122.', '111a123', '11aaa23', '1aaaaa3', '122a233', '1223334', '.23344.'] }
  };
  for (var k in D) P[k] = D[k];
  SK.PARTS = SK.PARTS || {};
  SK.PARTS.b8 = true;
})(window);
