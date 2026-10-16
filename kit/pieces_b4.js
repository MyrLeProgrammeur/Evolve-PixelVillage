/* Batch 4 pieces: the last 5 signatures, plus ic_coin, ic_book and unit_ingot pulled forward
   for hanging signs and the foundry ingot rack. */
(function (G) {
  var SK = G.SK = G.SK || {};
  var P = SK.PIECES = SK.PIECES || {};
  function add(o) { for (var k in o) P[k] = o[k]; }
  add({
    sig_anvil: { cat: 'signature', w: 8, h: 6, anchor: [4, 6], mirror: 'free', uses: 'METAL WOOD SPARK', def: { METAL: 'iron', WOOD: 'walnut' }, rows: [
      '.....*..',
      'mmmmmmnp',
      '..nnnpq.',
      '...npq..',
      '..wxxyz.',
      '..xyyzz.'] },
    sig_clock: { cat: 'signature', w: 8, h: 8, anchor: [4, 8], mirror: 'none', uses: 'MAIN ACCENT INK', def: { MAIN: 'sandstone', ACCENT: 'cream' }, rows: [
      '..1122..',
      '.1aaab3.',
      '1aaoaab3',
      '1aaoaab4',
      '2aaooob4',
      '2aaaabb4',
      '.3abbb4.',
      '..3344..'] },
    sig_bell: { cat: 'signature', w: 6, h: 8, anchor: [3, 8], mirror: 'free', uses: 'WOOD METAL', def: { WOOD: 'walnut', METAL: 'bronze' }, rows: [
      'xyyyyz',
      'x.zz.z',
      'x.mn.z',
      'xmmnpz',
      'xmnnpz',
      'xmnppz',
      'mmnnpq',
      'x.qq.z'] },
    sig_curtain: { cat: 'signature', w: 14, h: 10, anchor: [7, 10], mirror: 'none', uses: 'MAIN ACCENT WOOD INK EMBER', def: { MAIN: 'madder', ACCENT: 'saffron', WOOD: 'walnut' }, rows: [
      'yyyyyyyyyyyyyy',
      'y1a1a1a1a1a1az',
      'yaoaoaoaoaoa1z',
      'y1aoooooooo1az',
      'y1aoooooooo1az',
      'yddooooooooddz',
      'y1aoooooooo1az',
      'y1a1eooooe1a1z',
      'wwxxwwxxwwxxww',
      'yyzzyyzzyyzzyy'] },
    sig_weapon_rack: { cat: 'signature', w: 12, h: 10, anchor: [6, 10], mirror: 'free', uses: 'MAIN ACCENT METAL WOOD', def: { MAIN: 'madder', ACCENT: 'cream', METAL: 'iron', WOOD: 'oak' }, rows: [
      '..m..m..m...',
      '.mnqmnqmnq..',
      '..y..y..y...',
      'xyyyyyyyyyyz',
      'x.122..abb.z',
      'x12m23abmbcz',
      'x1mmn3amnncz',
      'x22n33bbnccz',
      'xy334yybccyz',
      'x.y..y..y..z'] },

    ic_coin: { cat: 'icon', w: 16, h: 16, anchor: [8, 16], mirror: 'none', uses: 'MAIN SPARK', def: { MAIN: 'gold' }, rows: [
      '................',
      '................',
      '.....222223.....',
      '....21*11113....',
      '...2111331123...',
      '..211111111123..',
      '..211113311123..',
      '..213133332324..',
      '..213133332324..',
      '..211113311224..',
      '..211111111224..',
      '...2111331224...',
      '....31122224....',
      '.....344444.....',
      '................',
      '................'] },
    ic_book: { cat: 'icon', w: 16, h: 16, anchor: [8, 16], mirror: 'none', uses: 'MAIN ACCENT', def: { MAIN: 'madder', ACCENT: 'cream' }, rows: [
      '................',
      '................',
      '................',
      '..aaa......aaa..',
      '.aaaaaa..aaaaaa.',
      '.acccaab.baccca.',
      '.aaaaaab.baaaaa.',
      '.acccaab.baccca.',
      '.aaaaaabbbaaaaa.',
      '.acccaabbbaccca.',
      '.aaaaaabbbaaaaa.',
      '.1aaaaabbbaaaa2.',
      '.112aaabbbaaa23.',
      '..1122223322233.',
      '...3334444333...',
      '................'] },
    unit_ingot: { cat: 'unit', w: 8, h: 8, anchor: [4, 8], mirror: 'free', uses: 'MAIN SPARK', def: { MAIN: 'iron' }, rows: [
      '........',
      '........',
      '........',
      '..*112..',
      '.111122.',
      '22223333',
      '.223334.',
      '..3344..'] }
  });
  SK.PARTS = SK.PARTS || {};
  SK.PARTS.b4 = true;
})(window);
