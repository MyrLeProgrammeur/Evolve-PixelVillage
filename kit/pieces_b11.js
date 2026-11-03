/* Batch 11 pieces (Era 3 · industrialization): 23 pieces, 25 images, same semantic grid format.
   Roller shutter, loading-dock edge, caged ladder; pumpjack (3 frames), derrick crown, flare tip, rotary-kiln ring and gear, water tower,
   oxygen rack, machine-gun nest, buffer stop; the freight train (locomotive front / rear views, flat, tank, hopper and box wagons) and the
   steam barge (front / rear); steel helmet; oil and luxury-goods icons, oil barrel. Light from the upper left, coloured outline, no black lines. */
(function (G) {
  var SK = G.SK = G.SK || {};
  var P = SK.PIECES = SK.PIECES || {};
  function M(o) { o.b11 = true; return o; }
  function C(o) { o.cat = 'citizen'; o.mirror = o.mirror || 'face'; if (!o.anchor) o.anchor = [0, o.h]; return M(o); }
  var D = {
    /* ---------- modules ---------- */
    door_roller: M({ cat: 'module', w: 8, h: 14, anchor: [0, 14], skew: 'left', mirror: 'face', uses: 'MAIN METAL INK', def: { MAIN: 'zinc', METAL: 'iron' }, attach: { slot: [4, 13] }, rows: [
      'mn......', 'mpnn....', 'm3ppnn..', 'm133ppnq', 'm31233pq', 'm133223p', 'm312332p', 'm133223p',
      'm312332p', 'mn33223p', 'monn332p', '..oopp3p', '....oopp', '......op'] }),
    dock_edge: M({ cat: 'module', w: 8, h: 6, anchor: [0, 6], strip: '2:1', mirror: 'free', uses: 'MAIN WOOD', def: { MAIN: 'river', WOOD: 'walnut' }, rows: [
      '11111111', '2wx22222', '2wx22232', '3xy33333', '3xy33343', '44444444'] }),
    ladder_cage: M({ cat: 'module', w: 5, h: 6, anchor: [2, 6], mirror: 'free', uses: 'METAL', def: { METAL: 'iron' }, rows: [
      '.mnp.', 'm.n.q', 'mnnpq', 'm.n.q', 'mpnpq', 'm.n.q'] }),

    /* ---------- signatures ---------- */
    sig_pumpjack: M({ cat: 'signature', w: 48, h: 14, frames: 3, mirror: 'free', uses: 'MAIN METAL', def: { MAIN: 'saffron', METAL: 'iron' }, anchor: [1, 14], attach: { well: [1, 11] }, rows: [
      '..12............................................', '.122.........................................2..', '.123222...........12......................2223..', '.23.333222.......1222222222222.........222333q..', '.3.....3q3222....1233333q33333....122223q3...q..', '.q......q.3332...23.....q....q...122333.q...q...',
      '.q.....n.p...3...3.....n.p...q...123...n.p.33...', '.q.....n.p...q...q.....n.p....q..23....n.p.44...', '.q....ppppp..q...q....ppppp..33..3....ppppp.q...', '.q....n...p.q....q....n...p.q44..q....n...p.q...', 'mnp..n.....33...mnp..n.....pp...mnp..n.....pp...', 'mnq..n.....44...mnq..n.....pq...mnq..n.....pq...',
      '.nnnnnnnnnnnnnp..nnnnnnnnnnnnnp..nnnnnnnnnnnnnp.', '.pppppppppppppq..pppppppppppppq..pppppppppppppq.'] }),
    sig_derrick_crown: M({ cat: 'signature', w: 9, h: 4, anchor: [4, 4], mirror: 'free', uses: 'MAIN METAL INK', def: { MAIN: 'saffron', METAL: 'iron' }, rows: [
      '.122.123.', 'm1o3m2o4q', 'mnnnnnppq', 'nnnnpppqq'] }),
    sig_flare_tip: M({ cat: 'signature', w: 5, h: 8, anchor: [2, 8], mirror: 'free', uses: 'METAL', def: { METAL: 'iron' }, attach: { flame: [2, 0] }, rows: [
      'mnnpq', 'nnppq', '.npq.', '.npq.', '.npq.', '.npq.', 'mnppq', '.npq.'] }),
    sig_kiln_drum: M({ cat: 'signature', w: 16, h: 22, mirror: 'none', uses: 'METAL', def: { METAL: 'iron' }, anchor: [8, 10], rows: [
      '..........pq....', '......pq.pnq.q..', '......pnpmmqpq..', '......pmmqq.qqq.', '...pppmmq.....qq', '..qqqmmq.......q', '.....pq........q', '...qpq.........q',
      '.q..pq.........q', 'qpppq..........q', '.qnnq..........q', '..pq..........q.', '..pq..........q.', 'ppnq.........q..', 'qqnq........qq..', '..pmq......pnq..',
      '..pqmq..pppqqq..', '..q.qmppmmmq....', '.....pnqmmpq....', '.....pnqpppq....', '.....qqnpqq.....', '.......qq.......'] }),
    sig_water_tower: M({ cat: 'signature', w: 14, h: 30, mirror: 'free', uses: 'MAIN WOOD METAL', def: { MAIN: 'oxide', WOOD: 'pinewood', METAL: 'iron' }, anchor: [6, 26], rows: [
      '......q.......', '.....34.......', '....3124......', '...311224.....', '..31111224....', '.3111112224...', '.3111112224...', '.3111112224...',
      '.y11111222z...', '.yxxx11yyyz...', '.pxxxyyyyyq...', '.ymxxyyyypz...', '.yxnnnpppyz...', '.yxxxyyyyyz...', '.yxxxyyyyyz...', '.pxxxyyyyyq...',
      '.ymnxyyyppz...', '.pxxnnppyz.q..', '.ppzzzyzz..q..', '.pq...q....q..', '.q....q....pq.', '.q....q....qq.', 'pq...qpq....q.', 'ppqqq.q.qqq.q.',
      'pq....q....qqq', 'q.....q.....pq', 'q.....q.....qq', '......q.......', '......q.......', '......q.......'] }),
    sig_o2_rack: M({ cat: 'signature', w: 13, h: 9, anchor: [6, 9], mirror: 'free', uses: 'MAIN WOOD METAL', def: { MAIN: 'indigo', WOOD: 'walnut', METAL: 'iron' }, attach: { pipe: [12, 3] }, rows: [
      '.mn.mn.mn.mn.', '.12.12.12.12.', 'w12x12x12x12y', 'w12.12.12.12y', 'w12.12.12.12y', '.23.23.23.23.', 'w23x23x23x23y', 'w34.34.34.34y',
      'xxxxxxyyyyyzz'] }),
    sig_mg_nest: M({ cat: 'signature', w: 18, h: 14, mirror: 'none', uses: 'MAIN ACCENT METAL', def: { MAIN: 'sand', ACCENT: 'sage', METAL: 'soot' }, anchor: [9, 10], rows: [
      '.......ccd........', '.......cad........', '....333bcc3334....', '.333222bc2221134..', '.312232mmmp2211134', '311222nnnpp1122124', '31122nqqnpq4211124', '32223q..qq..311224',
      '32224....qq.422234', '41114...q.q..32224', '.322134.q..q312244', '.441111313312224..', '...444422444444...', '.......44.........'] }),
    sig_buffer_stop: M({ cat: 'signature', w: 12, h: 13, mirror: 'free', uses: 'MAIN ACCENT WOOD METAL', def: { MAIN: 'madder', ACCENT: 'cream', WOOD: 'walnut', METAL: 'iron' }, anchor: [6, 9], rows: [
      '.....a34....', '.....a1134..', '.....a11a134', '.....p14a1a4', '.....qq.a1a4', '....q.q.pqa4', '...q.yppq.q.', '...pqqyq..pq',
      '..qz..q.yzq.', 'zq..zyqpq.zz', '.zz..qqzz...', '...zz.......', '.....z......'] }),

    /* ---------- vehicles (track along the v axis, +v toward the viewer; anchor = ground point under the middle) ---------- */
    veh_loco_front: M({ cat: 'vehicle', w: 27, h: 25, mirror: 'free', uses: 'MAIN ACCENT METAL WOOD INK SPARK', def: { MAIN: 'teal', ACCENT: 'gold', METAL: 'soot', WOOD: 'basalt' }, anchor: [13, 19], rows: [
      '..............q............', '............ppmpq..........', '..........ppmmmmmpq...z....', '.........pmmmmmmmmmppyxz...', '.........qnnmmmmmmmppwwxz..', '..........3nnnmmmpppwxxxz..', '...pqq..aa111nnnpp22xyxzz.4', '...pq...bc1111on22o2yzz..34',
      '...pq...bc1111o12oo2z..3324', '...pq.33bc1122212oo4.332224', '...pp31111b222212oo23222224', '..pmpn1122b223312o222222224', '.pn*bpp22223333122a22222pp4', '.pnnppp2233333312aa2222pnpq', '.pnnnpp3333333412ca2pppqnpq', '.pmmnpqq333344112a23pnq.qq.',
      '.pnmnpqq33d4ppp1233qqqq....', '.qnnnpq344pppppp3qq........', '..pnnpq4pppppnnpq..........', 'q.pnpqppppnppnpq...........', 'ppnpppppppnnpqqq...........', 'qpnnnpppppppqq.............', '.qqnnnpnpqqq...............', '...qqpqqq..................',
      '.....q.....................'] }),
    veh_loco_rear: M({ cat: 'vehicle', w: 26, h: 28, mirror: 'free', uses: 'MAIN ACCENT METAL WOOD INK SPARK', def: { MAIN: 'teal', ACCENT: 'gold', METAL: 'soot', WOOD: 'basalt' }, anchor: [13, 22], rows: [
      '......................pqq.', '......................pq..', '......................pq..', '......................pq..', '.................aa...pq..', '..........ppq....aa.33nnq.', '........ppmmmpq..bc3111ppq', '......ppmmmmmmmppbc11122pq',
      '......qnmmmmmmmmmp1a2222pq', '.......pnnmmmmmppp2b2223qq', '.......31nnnmppp2222b333qq', '.......3111npp222223c333qq', '.......3111112oo2333c333q.', '......yww11112oo2333c34q..', '....yywxwx1112oo233344....', '..yyxwxyxyx112oo234d......',
      '4zzxxxxxxzz4122224.pppppq.', '4..zzxxzz..312aa2pppnnppnq', '34...zz..33212ccppppnnpqqq', '3a*....3322212aapnnppmq...', '31n3333222221223ppnmqqq...', '311nn1222222133qqqqq......', '41n111222223qqq...........', '.31nn122ppppq.............',
      'qpp111pppnnq..............', '.qqpppnpqqq...............', '...qqqppq.................', '......qq..................'] }),
    veh_wagon_flat: M({ cat: 'vehicle', w: 20, h: 13, mirror: 'free', uses: 'ACCENT METAL WOOD', def: { ACCENT: 'cream', METAL: 'soot', WOOD: 'walnut' }, anchor: [10, 10], rows: [
      '............yyyz....', '..........yywwwwyz.z', '........yyxxwwwwwwyz', '......yywwxxxxwwwwxz', '....yywwwwwwxxxxxxzz', '..yyxxxwwwwwwyppaq..', 'yywwwxxxxwwwxypanq..', 'ywwwwwwxxxaxyyqppq..',
      'yxwwwwwyxxayqq.qq...', 'qxxxwwppppqq........', '.qqxxxpnnq..........', '...qqxqppq..........', '.....q.qq...........'] }),
    veh_wagon_tank: M({ cat: 'vehicle', w: 19, h: 19, mirror: 'free', uses: 'MAIN ACCENT METAL', def: { MAIN: 'oxide', ACCENT: 'cream', METAL: 'soot' }, anchor: [10, 16], rows: [
      '........233..3334..', '........121331114..', '........1221111124.', '.......31231113224.', '.....33112312223224', '...3211211222223334', '..32111132222234334', '.32221222222333434.',
      '.32222222333333434.', '.32122223433n34annq', '.32112333a33naannpq', '.42112333a44anpppq.', '..32223334nnnppnnq.', '.p222244nnnpnqqppq.', 'pnn333nnnppqqq.qq..', 'qpnnnnppppqq.......',
      '.qqpnnpnnq.........', '...qqpqppq.........', '.....q.qq..........'] }),
    veh_wagon_hopper: M({ cat: 'vehicle', w: 19, h: 19, mirror: 'free', uses: 'MAIN ACCENT METAL WOOD', def: { MAIN: 'rust', ACCENT: 'hide', METAL: 'soot', WOOD: 'sage' }, anchor: [10, 16], attach: { load: [6, 8] }, rows: [
      '............caaa...', '..........caayaaaa.', '........ccaawwwyabd', '......ccaaabawwwybd', '.....3ddbbaaabbwdd.', '...344..ddbbbcdd.34', '.344444...dddd.3324', '324444444....332224',
      '3122444423333222224', '311122233322a22224.', '311111322a2a2222pq.', '311111322a2222pppq.', '44111132232233pnnq.', '..311132233p3qqppq.', '.ppp1132p33qqq.qq..', 'qpppppppppqq.......',
      '.qqppppnnq.........', '...qqpqppq.........', '.....q.qq..........'] }),
    veh_wagon_box: M({ cat: 'vehicle', w: 21, h: 21, mirror: 'free', uses: 'MAIN ACCENT METAL WOOD', def: { MAIN: 'madder', ACCENT: 'cream', METAL: 'soot', WOOD: 'walnut' }, anchor: [11, 18], rows: [
      '.............ppppq...', '...........ppmmmmmpq.', '.........ppmmmmmmmnnq', '.......ppmmmmmmmnnnnq', '.....ppmmmmmmmnnnnqq.', '...ppmmmmmmmnnnnqq.34', '.ppmmmmmmmnnnnqq.3334', 'qqnnmmmmnnnnqq.p32234',
      '..qqnmnnnnqq.pp132234', '.4..qqnnqq.yp121322a4', '.34...qq.33y212132a34', '.31334.3332y212132a34', '.312123323ay212132244', '.3121213aa2y212pppq..', '.31212132a2y212pnnq..', '.3121213232y212qppq..',
      '.3121213232y2qq.qq...', '.qp2121ppppqq........', '..qqp21pnnq..........', '....qqpqppq..........', '......q.qq...........'] }),
    veh_barge_front: M({ cat: 'vehicle', w: 26, h: 25, mirror: 'free', uses: 'MAIN ACCENT METAL WOOD INK', def: { MAIN: 'indigo', ACCENT: 'cream', METAL: 'soot', WOOD: 'pinewood' }, anchor: [11, 19], rows: [
      '.................ppq......', '..............qppmmmpq....', '.............pqqmmmmmmpq..', '.............qnpmmmmmmmq..', '..............ccmmmmmpq...', '..............ccnnmppbd...', '..............ppaanbbod...', '..............ppooabood...',
      '..............ppooabood...', '..............ppaoabbbd...', '............yynpaaabbbbz..', '..........yyxxnpaaabbbbwyz', '........yyxywwnpaaabbwwxyz', '......yyxyzzzynpxxawwxyy34', '....yyxyzzzzzzzywwwxyy3334', '..yyxyzzzzzzzzywwxyy333334',
      '.yxxwwzzzzzzywwxmy3333344.', '.ywwxxwwzzywwxyyn333344...', '.yxxwwxxwwwxmy3333344.....', 'yxwwxxwxxxyyn333344.......', '31222222223333344.........', '322222222233344...........', '4222222222344.............', '.3222244444...............',
      '.44444....................'] }),
    veh_barge_rear: M({ cat: 'vehicle', w: 26, h: 22, mirror: 'free', uses: 'MAIN ACCENT METAL WOOD INK', def: { MAIN: 'indigo', ACCENT: 'cream', METAL: 'soot', WOOD: 'pinewood' }, anchor: [15, 14], rows: [
      '..........qqq.............', '..........pnq.............', '.......pq.pnq.............', '.....ppmmpabd.............', '...ppmmmmmmnq..........yyz', '..qmmmmmmmmnpq..yyyyyyyxwz', '...pnmmmmmmnq.yyxxwwxxwwxz', '...aannmmpmnpyxyzzzxwwxxw4',
      '...aoaanpbmnpyzzzzzzzxwwx4', '...aoaoabomnpzzzzzzzywwxy4', '...aoaoabomnpzzzzzywwxym34', '...aaaoabomnpzzzywwxyy3n34', '..yaaaaabbbbbxwwwxmy33334.', 'yyxaaaaabbbbbwwxyyn333344.', '3xxwxaaabbbwwxyy3333344...', '311axwxabwwxyy3333344.....',
      '311aaaxwwxyy3333344.......', '441a1a1xyy3333344.........', '..44aa113333344...........', '....441133344.............', '......44344...............', '........4.................'] }),

    /* ---------- citizen layer (16x24 body frame) ---------- */
    hat_steel_helmet: C({ w: 12, h: 6, at: [2, 0], uses: 'METAL', def: { METAL: 'sage' }, rows: [
      '............', '....mmnn....', '...mmnnnp...', '...mnnnppq..', '.mmnnnnpppq.', '.nppppqqqqq.'] }),

    /* ---------- icons and units ---------- */
    ic_oil: M({ cat: 'icon', w: 16, h: 16, anchor: [8, 16], mirror: 'none', uses: 'MAIN ACCENT METAL SPARK', def: { MAIN: 'teal', ACCENT: 'crude', METAL: 'iron' }, rows: [
      '................', '...........a....', '..........abc...', '..........abc...', '.........abbcd..', '.........a*bcd..', '..mnnnnp.abbbcd.', '.m111222pabbccd.',
      '.n111222pbbcccd.', '.mnnnppqq.cccd..', '.111122234......', '.111122234......', '.mnnnppqqq......', '.111122234......', '.112222334......', '..pppqqqq.......'] }),
    ic_lux: M({ cat: 'icon', w: 16, h: 16, anchor: [8, 16], mirror: 'none', uses: 'MAIN ACCENT SPARK', def: { MAIN: 'plum', ACCENT: 'saffron' }, rows: [
      '................', '................', '...34...........', '...313a.........', '..322*aa4.......', '..322bb213a.....', '.433cbb222aa4...', '..44cc322bbba...',
      '...3dd333bbaa...', '...3cc44ccc4....', '...4cc33dda4....', '....cc34........', '....dd34........', '.....d4.........', '................', '................'] }),
    unit_barrel: M({ cat: 'unit', w: 8, h: 8, anchor: [4, 8], mirror: 'free', uses: 'MAIN METAL', def: { MAIN: 'teal', METAL: 'iron' }, rows: [
      '..mnnp..', '.m1122p.', 'n112223q', 'mnnnppqq', '11222334', 'mnnnppqq', '11222334', '.122334.'] })
  };
  Object.keys(D).forEach(function (k) { P[k] = D[k]; });
  SK.PARTS = SK.PARTS || {}; SK.PARTS.b11 = Object.keys(D);
  if (SK._runExt) SK._runExt();
})(window);
