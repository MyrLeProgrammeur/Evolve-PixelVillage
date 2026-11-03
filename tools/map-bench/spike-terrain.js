/* J0 spike: terrain painter for the planet chunks, after the kit's terrain (spritekit.js terrain()):
   - organic borders: tile lookup through a periodic domain warp (kit: vnoise px/7, py/4, +-0.55 tile);
   - flat base tones per ground, relief shading from the tile elevation (light from the north-west), snow caps;
   - kit stamps on a jittered 6 x 4 grid (clump, dark, tuft, flower, pebble, rock, ore, drift, frost, crack, clod);
   - water: foam on the edge, lighter near the shore, deep tone offshore, wave dashes; dark bank under the shore;
   - fields in strips (wheat, green crop, ploughed); baked trees (conifers and round crowns, kit shapes) on a 5 x 3 grid.
   L0/L1 get every detail; L2 keeps tones, foam and forest speckle; L3+ tones only.
   Everything is anchored to world pixels, so neighbouring chunks join without a seam. */
(function (G) {
  'use strict';
  var PVB = G.PVB = G.PVB || {};

  PVB.Terrain = function (world) {
    var X = G.SpriteKit._, R = X.R, ih = X.ih, C = world.C, W = C.W, H = C.H, KK = world.K;
    var kind = world.kind, elev = world.elev, bld = world.bld;

    // periodic value noise for the warp table (112 x 64 world px, cells 7 x 4 => periods 16 x 16)
    function pv(x, y, P, s) {
      var xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      var x0 = ((xi % P) + P) % P, x1 = (x0 + 1) % P, y0 = ((yi % P) + P) % P, y1 = (y0 + 1) % P;
      var a = ih(x0, y0, s), b = ih(x1, y0, s), c = ih(x0, y1, s), d = ih(x1, y1, s);
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }
    var TW = 112, TH = 64, WX = new Float32Array(TW * TH), WY = new Float32Array(TW * TH);
    for (var y = 0; y < TH; y++) for (var x = 0; x < TW; x++) {
      WX[y * TW + x] = (pv(x / 7, y / 4, 16, 11) - 0.5) * 0.55; WY[y * TW + x] = (pv(x / 7, y / 4, 16, 29) - 0.5) * 0.55;
    }

    var ST = {
      clump: ['.00.', '0000', '.22.'], dark: ['.22', '222'], tuft: ['0.0.', '2020'], flower: ['.F.', 'F2F'],
      pebble: ['.0', '12'], rock: ['.00.', '0112', '1223'], ore: ['01', '12'], clod: ['.11', '113'],
      drift: ['.11.', '1122'], frost: ['.2.2', '2323'], crack: ['2...', '.12.', '...3']
    };
    var FLOWERS = ['rose', 'saffron', 'cream', 'plum', 'indigo', 'madder'];
    var GR = 'summer', TREE = 'summer', PINE = 'conifer', ROCK = 'river';
    var cFoam = R('water', 0), cWave = R('water', 1), cNear = R('water', 2), cShal = R('water', 3), cDeep = R('abyss', 2), cDeep2 = R('abyss', 3);
    var cBank = R('dirt', 3), cPolar = R('snow', 1);

    function nw(t) { var q = t % W, r = (t / W) | 0; return r > 0 ? (r - 1) * W + ((q - 1 + W) % W) : t; }
    function relief(t) { var d = elev[t] - elev[nw(t)]; return d > 5 ? -1 : d < -5 ? 1 : 0; }
    function isWater(k) { return k <= 1; }

    // fills B (pw x ph) for chunk rect rc at scale f; generator: yields between bands of work
    // an iso rock peak: ridge slightly off-centre, light west face, dark east face, darkest silhouette, optional snow cap
    function drawPeak(B, pw, ph, bx, by, w, h, snow, seedp) {
      w = Math.max(1.5, w); h = Math.max(1.5, h);
      var rx = (ih(seedp, 7) - 0.5) * w * 0.4, x0 = Math.floor(bx - w), x1 = Math.ceil(bx + w);
      for (var px = x0; px <= x1; px++) {
        if (px < 0 || px >= pw) continue;
        var dx = px + 0.5 - bx, aw = Math.abs(dx) / w; if (aw >= 1) continue;
        var jag = (ih(px + Math.round(bx * 7), seedp, 9) - 0.5) * Math.min(2, h * 0.08);
        var top = by - h * (dx < rx ? (dx + w) / (rx + w) : (w - dx) / (w - rx)) + jag, base = by + (1 - aw) * w * 0.25;
        var east = dx >= rx;
        for (var py = Math.floor(top); py <= Math.floor(base); py++) {
          if (py < 0 || py >= ph) continue;
          var hrel = (by - py) / h, c;
          if (py === Math.floor(top) || (east && px === x1 - 1)) c = R(ROCK, 4);
          else if (snow && hrel > 0.62 + (ih(px, py, 11) - 0.5) * 0.1) c = R('snow', east ? 2 : 0);
          else c = R(ROCK, east ? (hrel < 0.25 ? 3 : 3) : (hrel < 0.3 ? 2 : 1));
          if (!snow && !east && ((px * 5 + py * 3) % 9) === 0) c = R(ROCK, 2);
          B[py * pw + px] = c;
        }
      }
    }

    var POOL = {};
    function tileAtW(wx, wy) {
      var a = wx / 16, b = wy / 8, wi = ((Math.floor(wy) % TH) + TH) % TH * TW + ((Math.floor(wx) % TW) + TW) % TW;
      var Xf = Math.floor((a + b) / 2 + WX[wi]), Yf = Math.floor((b - a) / 2 + WY[wi]), r = Xf + Yf;
      return r < 0 || r >= H ? -1 : r * W + (((Xf % W) + W) % W);
    }
    function* paint(B, pw, ph, rc, f, L, oceanA) {
      var fine = L <= 1, MX = 8, MT = 3, MB = L <= 1 ? 16 : 3, bw = pw + 2 * MX, bh = ph + MT + MB;
      if (!POOL.TI || POOL.TI.length < bw * bh) { POOL.TI = new Int32Array(bw * bh); POOL.KB = new Uint8Array(bw * bh); }
      var TI = POOL.TI, KB = POOL.KB, lx0 = Math.round(rc.x / f), ly0 = Math.round(rc.y / f);
      // A. tile under every pixel (warped)
      for (var by = 0; by < bh; by++) {
        var ly = ly0 + by - MT, wy = (ly + 0.5) * f, b = wy / 8, wyi = ((Math.floor(wy) % TH) + TH) % TH * TW;
        for (var bx = 0; bx < bw; bx++) {
          var lx = lx0 + bx - MX, wx = (lx + 0.5) * f, a = wx / 16, wi = wyi + ((Math.floor(wx) % TW) + TW) % TW;
          var Xf = Math.floor((a + b) / 2 + WX[wi]), Yf = Math.floor((b - a) / 2 + WY[wi]), r = Xf + Yf, o = by * bw + bx;
          if (r < 0 || r >= H) { TI[o] = -1; KB[o] = 255; }
          else { var t = r * W + (((Xf % W) + W) % W); TI[o] = t; KB[o] = kind[t]; }
        }
        if ((by & 3) === 3) yield 0;
      }
      // B. base tones, water, fields, bank
      for (var j = 0; j < ph; j++) {
        var row = j * pw, o0 = (j + MT) * bw + MX;
        ly = ly0 + j;
        for (var i = 0; i < pw; i++) {
          var o = o0 + i, k = KB[o], c;
          lx = lx0 + i;
          if (k === 255) c = cPolar;
          else if (isWater(k)) {
            var edge = !isWater(KB[o - 1]) || !isWater(KB[o + 1]) || !isWater(KB[o - bw]) || !isWater(KB[o + bw]);
            if (edge) c = cFoam;
            else {
              var near = L <= 2 && (!isWater(KB[o - 3]) || !isWater(KB[o + 3]) || !isWater(KB[o - 2 * bw]) || !isWater(KB[o + 2 * bw]));
              if (near) c = cNear;
              else if (oceanA) c = 0;
              else c = k === 0 ? ((elev[TI[o]] & 64) ? cDeep : cDeep2) : cShal;
              if (c && L <= 1 && ly % 3 === 0 && ((lx + ((ly * 7) % 13 + 13) % 13) % 11 + 11) % 11 < 3) c = cWave;
            }
          } else {
            var t2 = TI[o], rl = L <= 2 ? relief(t2) : 0;
            switch (k) {
              case KK.GRASS: c = R(GR, 1 + rl); break;
              case KK.FOREST: c = L >= 2 ? (((lx * 3 + ly * 5) & 3) === 0 ? R(PINE, 3) : R(PINE, 2)) : R(GR, 2 + (rl > 0 ? 1 : 0)); break;
              case KK.DESERT: c = R('sand', 1 + rl); break;
              case KK.BEACH: c = R('sand', 0); break;
              case KK.SNOW: c = R('snow', 1 + rl); break;
              case KK.MOUNT: { var ev = elev[t2], tn = rl < 0 ? 0 : rl > 0 ? 2 : 1; c = ev > 230 ? R('snow', tn + 1) : R(ROCK, tn + 1); break; }
              case KK.FIELD: {
                // parcels of 3 x 2 tiles on the un-warped ground grid, hedges on their borders, strips inside (kit outer fields)
                var gwx = (lx + 0.5) * f, gwy = (ly + 0.5) * f, ga = gwx / 16, gb = gwy / 8, gfx = (ga + gb) / 2, gfy = (gb - ga) / 2;
                var pcx = Math.floor(gfx / 3), pcy = Math.floor(gfy / 2), ux = gfx / 3 - pcx, uy = gfy / 2 - pcy;
                if (L <= 2 && (ux < 0.06 || uy < 0.09) && ih(pcx, pcy, ux < 0.06 ? 33 : 34) < 0.7) { c = R(GR, 3); break; }
                var crop = (ih(pcx, pcy, 31) * 4) | 0, axis = ih(pcx, pcy, 37) < 0.5, strip = (((axis ? lx + 2 * ly : lx - 2 * ly) % 6) + 6) % 6 < 2 && L <= 1;
                c = crop === 0 ? R('straw', strip ? 2 : 1) : crop === 1 ? R(GR, strip ? 1 : 2) : crop === 2 ? R('dirt', strip ? 2 : 1) : R(GR, strip ? 0 : 1); break;
              }
              default: c = R(GR, 1);
            }
            if (L <= 2 && isWater(KB[o + bw])) c = cBank;
          }
          B[row + i] = c;
        }
        if ((j & 3) === 3) yield 0;
      }
      // M. mountain peaks (L0..L2): one peak per world cell of 40 x 20 L0 px that is a local maximum of elevation, sized by
      // its height (big snowy summits in the high ranges), plus sparse foothills; back to front, bases may lie outside the chunk
      if (L <= 2) {
        var CSX = 48, CSY = 24, npk = 0;
        var cellT = function (mx, my) { return tileAtW((mx + 0.5) * CSX, (my + 0.5) * CSY); };
        var py0 = Math.floor(((ly0 - MT) * f) / CSY) - 1, py1 = Math.floor(((ly0 + ph) * f + 110) / CSY);
        var px0 = Math.floor(((lx0 - 4) * f - 70) / CSX), px1 = Math.floor(((lx0 + pw + 4) * f + 70) / CSX);
        for (var my = py0; my <= py1; my++) {
          for (var mx = px0; mx <= px1; mx++) {
            var mt = cellT(mx, my); if (mt < 0 || kind[mt] !== KK.MOUNT) continue;
            var me = elev[mt], hv = ih(mx, my, 403), sv = Math.max(0, (me - 128) / 127);
            if (hv > 0.25 + 0.6 * sv + 0.2) continue;
            var k2 = 0.55 + 0.9 * ih(mx, my, 404);
            var wx0 = (mx + 0.1 + 0.8 * ih(mx, my, 401)) * CSX, wy0 = (my + 0.1 + 0.8 * ih(mx, my, 402)) * CSY;
            drawPeak(B, pw, ph, wx0 / f - lx0, wy0 / f - ly0, (18 + 34 * sv) * k2 / f, (12 + 58 * sv) * k2 / f, me > 180 && k2 > 0.8, mx * 31 + my);
            if (++npk % 6 === 0) yield 0;
          }
          yield 0;
        }
      }
      if (!fine) return;
      // C. stamps (kit grid 6 x 4, jittered), only over pixels of the same ground
      function stamp(sh, sx, sy, kd, ramp, fl) {
        for (var jj = 0; jj < sh.length; jj++) for (var kk = 0; kk < sh[jj].length; kk++) {
          var ch = sh[jj][kk]; if (ch === '.') continue;
          var px = sx + kk, py = sy + jj; if (px < 0 || py < 0 || px >= pw || py >= ph) continue;
          if (KB[(py + MT) * bw + px + MX] !== kd) continue;
          B[py * pw + px] = ch === 'F' ? R(fl, 0) : R(ramp, +ch);
        }
      }
      var cy0 = Math.floor((ly0 - 3) / 4), cy1 = Math.floor((ly0 + ph) / 4), cx0 = Math.floor((lx0 - 4) / 6), cx1 = Math.floor((lx0 + pw) / 6);
      for (var cy = cy0; cy <= cy1; cy++) {
        for (var cx = cx0; cx <= cx1; cx++) {
          var ax = cx * 6 + ((ih(cx, cy, 1 + L * 10) * 6) | 0) - lx0, ay = cy * 4 + ((ih(cx, cy, 2 + L * 10) * 4) | 0) - ly0;
          if (ax < -MX || ay < -MT || ax >= pw + MX || ay >= ph + MB) continue;
          var kd = KB[(ay + MT) * bw + ax + MX], rr = ih(cx, cy, 3 + L * 10), SX = ax - 1, SY = ay - 1;
          if (kd === KK.GRASS || kd === KK.FOREST) {
            if (rr < 0.38) stamp(ST.clump, SX, SY, kd, GR); else if (rr < 0.55) stamp(ST.dark, SX, SY, kd, GR);
            else if (rr < 0.65) stamp(ST.tuft, SX, SY, kd, GR); else if (kd === KK.GRASS && rr < 0.74) stamp(ST.flower, SX, SY, kd, GR, FLOWERS[(ih(cx, cy, 4) * 6) | 0]);
          } else if (kd === KK.DESERT) {
            if (rr < 0.12) stamp(ST.crack, SX, SY, kd, 'ember'); else if (rr < 0.4) stamp(ST.pebble, SX, SY, kd, 'sandstone'); else if (rr < 0.6) stamp(ST.clod, SX, SY, kd, 'sand');
          } else if (kd === KK.BEACH) { if (rr < 0.35) stamp(ST.pebble, SX, SY, kd, ROCK); }
          else if (kd === KK.SNOW) { if (rr < 0.35) stamp(ST.drift, SX, SY, kd, 'snow'); else if (rr < 0.45) stamp(ST.frost, SX, SY, kd, 'frost'); }
          else if (kd === KK.MOUNT) { if (rr < 0.12) stamp(ST.rock, SX, SY, kd, ROCK); else if (rr < 0.16) stamp(ST.ore, SX, SY, kd, ['copper', 'iron', 'soot'][(ih(cx, cy, 5) * 3) | 0]); }
          else if (kd === KK.FIELD) { if (rr < 0.1) stamp(ST.clod, SX, SY, kd, 'dirt'); }
        }
        if ((cy & 1) === 1) yield 0;
      }
      // D. trees, back to front (kit shapes; half size at L1); bases up to MB rows below the chunk so tops cross the seam
      var small = L === 1;
      function put(px, py, cc) { if (px >= 0 && py >= 0 && px < pw && py < ph) B[py * pw + px] = cc; }
      var ty0 = Math.floor((ly0 - MT) / 3), ty1 = Math.floor((ly0 + ph + MB - 1) / 3);
      for (var gy = ty0; gy <= ty1; gy++) {
        for (var gx = Math.floor((lx0 - 12) / 5); gx <= Math.floor((lx0 + pw + 12) / 5); gx++) {
          var bxl = gx * 5 + (gy & 1) * 2 + ((ih(gx, gy, 301 + L) * 3) | 0) - 1 - lx0, byl = gy * 3 + ((ih(gx, gy, 302 + L) * 2) | 0) - ly0;
          if (bxl < -MX || bxl >= pw + MX || byl < -MT || byl >= ph + MB) continue;
          var ob = (byl + MT) * bw + bxl + MX, kt = KB[ob], tt = TI[ob]; if (tt < 0 || bld[tt] >= 0) continue;
          var cr = ih(gx, gy, 303 + L), pr = kt === KK.FOREST ? 0.92 : kt === KK.GRASS ? 0.015 : kt === KK.SNOW ? 0.04 : 0;
          if (cr >= pr) continue;
          var lat = Math.abs(((tt / W) | 0) - H / 2) / (H / 2), pine = kt === KK.SNOW || lat > 0.5 || ih(gx, gy, 304) < 0.3, snowy = kt === KK.SNOW || lat > 0.72;
          if (pine) {
            var hg = small ? 5 + ((cr * 97) | 0) % 2 : 9 + ((cr * 97) | 0) % 3;
            for (var tj = 0; tj < hg; tj++) {
              var hf = Math.floor((tj + 2) * (small ? 0.3 : 0.42));
              for (var tk = -hf; tk <= hf; tk++) {
                var tnn = tj === hg - 1 || tk === hf ? 4 : tk > 0 ? 3 : tk === -hf ? 2 : 1;
                put(bxl + tk, byl - hg + 1 + tj, snowy && tk <= 0 && (tj < 2 || tj % 3 === 0) ? R('snow', tj < 2 ? 0 : 1) : R(PINE, tnn));
              }
            }
          } else {
            var crx = small ? 2 + ((cr * 71) | 0) % 2 : 4 + ((cr * 71) | 0) % 3, cry = small ? 2 : 3 + ((cr * 53) | 0) % 2;
            for (var yy = -cry; yy <= cry; yy++) for (var xx = -crx; xx <= crx; xx++) {
              var e2 = (xx * xx) / (crx * crx) + (yy * yy) / (cry * cry); if (e2 > 1) continue;
              var s2 = xx / crx * 0.55 + yy / cry * 0.85, tn2 = e2 > 0.7 && s2 > 0.15 ? 4 : s2 < -0.5 ? 1 : s2 < 0.2 ? 2 : 3;
              put(bxl + xx, byl - cry + yy, R(TREE, tn2));
            }
          }
        }
        if ((gy & 1) === 1) yield 0;
      }
    }
    return { paint: paint };
  };
})(typeof window !== 'undefined' ? window : global);
