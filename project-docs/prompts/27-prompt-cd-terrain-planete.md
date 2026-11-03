# PROMPT: paint the terrain of the whole planet (continuous isometric map, 7 zoom levels)

Work in THIS project (the Evolve sprite kit). Keep everything that exists: style bible, palette and ramps, piece format,
decoder, PRNG/hash, iso shell/roof generator, bitmap font, eras 0-3, API. Do not restyle buildings or citizens.
Build, don't summarize. Deliver in the batches at the end, and finish all of them.

## Why
The game is leaving the single village screen. The next view is **one continuous isometric planet**, wrapped east-west,
that the player pans and pinches from one house (zoom ×4) to the whole globe on one screen (zoom 1/64), in the spirit of
Clash of Clans for readability and of a civilization game for scale. Towns are clusters of kit buildings (`shell()` specs
and era sprites) set on this terrain.

A first terrain painter was written outside this project as a performance spike (files attached: `spike-terrain.js`,
`spike-world.js`, `coords.js`, and 4 renders `terrain-j0-*.png`). **It runs fast enough, but it does not look good
enough.** Use it for the contract and the coordinates, not as the art reference. The art reference is your own Era 1
`terrain()` in `spritekit.js` (dithering, stamps, light from the north-west, outer fields), scaled up to a planet.

What is wrong in the attached renders (fix all of it):
1. **Flat fills.** Grass, desert, snow and sea are one tone plus speckle. The desert reads as noise, the sea as a flat
   sheet. No large-scale variation: no meadows vs. dry grass, no dunes, no depth.
2. **No relief.** Elevation only nudges one tone. Hills, valleys and plateaus are invisible. Mountains are flat grey
   areas with small isolated triangles: they must read as **massifs**: overlapping ridges, lit west faces, shaded east
   faces, foothills, scree, snow caps on the highest.
3. **Hard biome edges.** Grass meets desert, forest meets snow, with no transition band (dry grass, steppe, tundra,
   sparse trees, marsh).
4. **Coasts are a white line.** No wet sand, no shallow shelf, no reefs, no cliffs on high coasts, no surf rhythm.
5. **No rivers, no lakes with shores.** (The world data will provide them, see the contract below.)
6. **Fields are a chessboard.** Same-size diamonds everywhere. Want parcels of varied size that follow the land, paths
   between them, hedgerows with trees, orchards, haystacks, a few farmsteads; denser near towns and water.
7. **Forest is a texture, not a forest.** At L2 and beyond it becomes diagonal hatching (see the planet render). Want a
   canopy mass with a lit edge and individual trees on the border, conifers toward the poles, snowy conifers in the cold.
8. **Poles are a white blob.** Want an ice cap with pressure ridges, crevasses, blue shadows, broken sea ice at its edge.
9. **Zoomed-out levels are a poster.** L3 to L6 must stay beautiful: hillshade on mountains, coast highlight, canopy
   texture, desert dunes as broad bands, and **towns as small readable clusters of roofs** (not speckled circles).

## Coordinates (fixed, do not change)
- Tiles are 32 × 16 px diamonds. Tile `(q, r)`: `q` wraps (0..W-1), `r` does not (0..H-1, poles at both ends).
- Screen position of the north corner: `sx = mod((2q - r) * 16, 32W)`, `sy = 8r`. This is your `worldPt` with
  `q = x`, `r = x + y`. Inverse: `a = sx/16, b = sy/8, x = floor((a+b)/2), y = floor((b-a)/2), r = x + y, q = mod(x, W)`.
- The world band is `BW = 32W` px wide and `BH = 8H` px tall at L0. The game planet is **W = 1280, H = 2560**
  (40 960 × 20 480 px at L0). The demo page may use a smaller planet (e.g. 160 × 320) to stay quick.
- **Levels**: `L0` = 1 art px per world px (shown at zoom 4, 2 and 1), `L1` = 1 art px per 2 world px, ... `L6` =
  1 per 64. Each level is painted **directly at its own resolution**, not by shrinking L0.
- The map is baked in **chunks of 512 × 256 px of their own level**. A chunk never sees its neighbours, so **every
  decision must be anchored to world coordinates** (world px or tile), never to chunk-local positions. Anything that
  crosses a chunk edge (a tree crown, a peak, a dune) must be drawn identically from both sides: compute objects from a
  margin around the chunk (the spike uses 8 px left/right, 3 px top, 16 px bottom at L0-L1). Same rule across the
  east-west wrap: every noise and grid must be periodic over `BW` (the period must divide it).

## Data contract (input)
The real world generator is written elsewhere; your painter reads this object (the demo page can build a small one with
its own noise):
```
world = {
  W, H, seed,
  kind:  Uint8Array(W*H),   // 0 deep sea, 1 shallow, 2 beach, 3 grass, 4 forest, 5 desert, 6 snow, 7 mountain, 8 fields
  elev:  Uint8Array(W*H),   // water: 0 (deepest) .. 255 (shore); land: 0 (shore) .. 255 (highest peak); mountains >= 128
  moist: Uint8Array(W*H),   // 0 dry .. 255 wet (new: use it for transitions, marsh, dry grass)
  river: Uint8Array(W*H),   // 0 none, 1..3 river width class, flowing downhill (new)
  lake:  Uint8Array(W*H),   // 1 = inland water tile (new)
  bld:   Int8Array(W*H)     // -1, or the building spec drawn on this tile: keep its ground clean (no tree, no stamp)
}
```
Index `i = r*W + q`. Ask for more channels if you need them (temperature, rock type...), but say why.

## API (output)
A new file `kit/planet_terrain.js` (and, if you need new pieces, `kit/pieces_b12.js`), registering:
```
SpriteKit.planetTerrain = {
  create(world, opts) -> painter,     // opts: { season: 0..3 (kit SEASONS), seed }
  version: '1'
}
painter.paint(B, pw, ph, rect, f, L)  // generator function (function*)
  // B: Uint32Array(pw*ph) of packed colours (same packing as Pix.d), 0 = transparent
  // rect: { x, y, w, h } in L0 world px; f = 2^L; L = level 0..6
  // yields often (see Budget); fills every pixel of B except where it chooses transparency
painter.townMark(L) -> optional sprites for towns at L3-L6 (or draw them inside paint from world.bld)
```
Colours only through the palette (`R(ramp, i)`). You may add **a few** ramps if the terrain truly needs them (wet sand,
ice blue, dry grass...): list each one with its five hex values and the reason.

## Budget (hard)
The painter runs on a mid-range phone and inside Anki desktop, in slices between frames.
- **Time per chunk**, measured in Node on the phone (the spike's numbers in brackets): L0 p95 ≤ 45 ms [p50 45, p95 101],
  L1 ≤ 30 ms [35/47], L2 ≤ 15 ms [16/21], L3-L6 ≤ 10 ms. Faster is better: a whole screen at L0 is about 12 chunks.
- **Yield at least every ~1 ms of work** (every few rows, every few objects). No single step may take more than 2 ms.
- **No allocation per chunk**: reuse buffers (pools), no closures created per pixel, no strings in loops.
- Deterministic: the same world and level give the same pixels on every run and every browser.
- Canvas 2D world only: the painter writes into `B`, nothing else. No WebGL, no images, no fonts, nothing remote.

## Art direction
- Same pixel language as the village: 1 art px = 1 world px at L0, hard pixels, ramps of 5 tones, ink outlines only on
  objects (trees, peaks, rocks), never on ground.
- Light from the north-west everywhere (as the kit). Slopes facing NW one tone lighter, SE one tone darker, cliffs and
  terrace edges where `elev` jumps (a readable 2-3 px lip).
- Large-scale variation first (patches of 20-200 world px, dithered borders), small stamps second.
- Seasons: spring, summer, autumn, winter through the kit's season ramps (grass, foliage, snow cover in winter except
  hot biomes). A season change rebakes everything once, so it may cost as much as a normal bake.
- Water: deep blue with slow dithered depth bands, lighter shelf, reefs, foam that follows the coast, wave dashes on
  open water at L0-L1 only. Rivers widen downstream and end in a small delta or estuary; lakes have a reed or sand rim.
- The bigger the zoom-out, the more the image becomes a painted map, never a flat poster: hillshade, coast light, canopy
  grain, dunes, ice ridges, town roof clusters.
- Readability over realism: at a glance the player must tell water, beach, plain, forest, hill, mountain, desert, snow,
  farmland and town, at every level.

## Page and checks
- New page **`Planet terrain.html`**: a small planet (its own noise, with all data channels including rivers and lakes)
  baked in chunks with **your** painter, pan by drag, zoom by wheel and buttons through L0..L6, season switch, a toggle
  that outlines chunk borders, and a readout of ms per chunk (p50/p95 per level).
- **Self-check** (like the existing one): (1) seams: bake two neighbouring chunks and the same area as one double-size
  chunk, compare pixels (must be identical); (2) wrap: the same for the chunk pair across `q = 0`; (3) determinism: two
  bakes, same hash; (4) every colour belongs to the palette; (5) the budget table. Print the results on the page.
- Update the README with the API and the new ramps, and the offline files.

## Batches
- **T1**: ground: tones, large-scale variation, transitions, relief and terrace edges, seasons; the page with pan/zoom/LOD.
- **T2**: water: sea depths, shelf, reefs, coasts (beach, wet sand, cliffs), rivers, lakes, poles and sea ice.
- **T3**: objects: mountain massifs and foothills, forests (canopy mass, edge trees, conifers, snowy), rocks, fields
  (varied parcels, paths, hedgerows, orchards, haystacks, farmsteads).
- **T4**: far zoom L3-L6 (hillshade, map-like grain, town roof clusters), budget pass, self-check, README, offline files.

Show me a screenshot of the same area at L0, L2 and L5 after each batch.
