# MASTER PROMPT: a bohemian pixel-art sprite kit for an Evolve village view

You are a senior pixel artist, technical artist and front-end engineer in one. Build the COMPLETE sprite kit and procedural renderer described below, as an offline HTML/JavaScript deliverable. Everything you need is in this prompt: there is no external document. Read it fully before producing anything. Do not summarize it back to me; build it.

**On style: you have creative freedom.** The ONLY style direction I impose is the "bohemian" feel described in section 3. Everything else about the look (palette, colours, number of tones, outline approach, shading, lighting direction, level of detail, proportions, mood of each building) is YOURS to design. Make your own strong, coherent, beautiful choices, state them in a short "style bible" at the start of your answer, and then apply them consistently everywhere.

---

## 0. THE JOB IN ONE PARAGRAPH

A browser incremental game called **Evolve** (text and menus only) will get a **pixel-art village view** drawn on a canvas next to its normal UI. The view READS the game's state (building counts, jobs, season, weather, resources) and shows a living isometric village of the game's first era ("Era 1", Stone Age into early Bronze/Iron Age). Because I cannot hire a pixel artist for hundreds of images, the village is built from a **small set of hand-drawn pieces (169)** that a **procedural generator** composes into well over 1,000 distinct images: buildings in 3 evolution tiers with endless variants, citizens with 17 jobs, terrain, water, weather, seasons. **Your deliverable is both parts: every hand-drawn piece, fully drawn as pixel data, and the generator that assembles them, plus an "atelier" page to inspect everything.**

---

## 1. NON-NEGOTIABLE TECHNICAL CONSTRAINTS

1. **Fully offline.** No CDN, no external script, no external stylesheet, no remote image, no web font, no network request at all. **Never use Google Fonts or any Google service.** Plain JavaScript (ES2019), Canvas 2D, no frameworks, no build step, no npm.
2. **Fonts:** none from the system inside the game view. Draw our own bitmap pixel font (section 14.6). The atelier page may use system font stacks only (`system-ui`, `ui-monospace`).
3. **Pixel purity.** Integer coordinates everywhere. No anti-aliasing, no sub-pixel blending, no smoothing (`imageSmoothingEnabled = false`). Display at integer scales only (x1, x2, x3, x4). Rotations only in multiples of 90 degrees. Transparency is 1-bit (a pixel is either drawn or not); whole-sprite opacity is allowed for fades.
4. **One master palette that you design**, stored as data, with every pixel in every sprite coming from it. No ad-hoc colours in the code or in the pieces. The palette is organised in **recolourable ramps** (section 4), because the generator recolours pieces for variety, seasons and biomes.
5. **Do not leave anything undrawn.** No placeholders, no "TODO", no flat rectangle standing in for a sprite. Every piece listed in sections 6 to 14 must be real pixel art. If the output is too long for one reply, deliver in the numbered batches of section 17 and say clearly at the end of each reply what is finished and what comes next; keep going until all batches are done.
6. **Deterministic.** All randomness comes from a seeded PRNG (mulberry32 or equivalent), so the same game state always renders the same village.
7. The atelier must be usable at 360 px width with no horizontal page scroll and 16 px side gutters, and must also work on desktop.

---

## 2. THE GAME DATA THE VIEW READS

Evolve exposes a read-only deep copy `window.evolve.global` (refreshed about every 250 ms; we read it once per second). Fields we use:

- `global.city.<key>.count`: how many of building `<key>` exist. Buildings are COUNTS, never positions. The view must place sprites automatically.
- `global.civic.<job>.workers`: workers per job. Soldiers are `global.civic.garrison.workers`.
- `global.tech.<key>`: integer tech levels used as visual triggers: `axe` (1 stone, 2 copper, 3 iron), `mining` (1; 2 metalworking; 3 iron mining; 4 coal), `smelting` (1; 2 steel), `cement` (1), `housing` (1 cabin, 2 cottage), `agriculture` (1..4), `science` (1..4), `currency` (1..4), `primitive` (1..3).
- `global.city.calendar`: `season` (0 spring, 1 summer, 2 autumn, 3 winter), `weather` (0 precipitation, 1 cloudy, 2 sunny), `temp` (0 cold: precipitation is snow; 1 mild; 2 hot), `wind` (0/1), `moon` (0 to 27, 28 phases), `day`, `year`.
- `global.city.biome`: one of 12: grassland, oceanic, forest, desert, volcanic, tundra, savanna, swamp, ashland, taiga, hellscape, eden. Default grassland. (Only grassland must be fully polished; the rest are palette swaps, section 12.8.)
- `global.resource.<Name>.amount` and `.max` (Food, Lumber, Stone, Furs, Copper, Iron, Cement, Coal, Steel, Money, Knowledge) for pile fill levels.
- There is NO time of day (no hours). A night filter, if ever used, is driven by our own clock and is optional (section 12.9).

Your code must expose a small API:
```
SpriteKit.init(canvas, { scale: 2 })          // set up
SpriteKit.render(stateLike, dtMs)             // draw one frame from a state object shaped like the fields above
SpriteKit.fakeState()                         // returns an editable fake state (atelier sliders drive it)
SpriteKit.atlas()                             // the cached composed sprites, keyed 'type|tier|seed|season'
```

---

## 3. THE ONLY STYLE DIRECTION: "BOHEMIAN"

The village should feel **bohemian**: a settlement made by people who love textiles, plants, handmade objects and small personal touches. Lived-in, hand-crafted, a little whimsical, never sterile, never a generic cookie-cutter fantasy kit. Everything else is your artistic call.

Bohemian motifs to weave in as recurring details (not as clutter; roughly one decorative touch per two buildings):
- Woven and patterned fabric: striped awnings, rugs with geometric borders, patterned sashes and headbands, patchwork laundry.
- Bunting (strings of small triangular flags) between rooftops and poles; round lanterns; wind chimes.
- Plants everywhere: potted herbs, window flower boxes, hanging planters, ivy and moss on walls, drying herb bundles under eaves, wildflower tufts.
- Hand-painted details: decorated shutters and doors, painted or geometric bands on door lintels, carved scalloped gable boards.
- Lit windows and glowing hearths as small points of life.
- One or two tiny living touches per village: a cat on a roof, a bird on a post.
- Natural, handmade materials: fringed thatch, rough planks, round river stones in dry walls, textured plaster, terracotta-style tiles.

Hard rules that are craft, not style: every sprite must be readable at x1 (true size); a building or a job must stay recognisable as a solid silhouette; keep one consistent light direction across the whole kit (you choose which); outlines and shading must follow one consistent approach across all pieces; no noisy pixel-by-pixel speckle as texture (use clustered shapes); no banding, no pillow shading, no stray orphan pixels. No text baked into sprites. Original designs only, nothing copied from existing games.

---

## 4. PALETTE STRUCTURE (you choose the colours)

Design a master palette made of **ramps** (each ramp = a short ordered list of tones from light to dark; you decide how many tones, 3 to 5 is typical). Organise it into these **semantic slots**, because the generator recolours by swapping which real ramp fills a slot:

**Base slots (every piece is drawn with these):** `WOOD`, `STONE`, `CLAY` (terracotta, tiles, brick), `FOLIAGE`, `SKIN`, `CLOTH_A`, `CLOTH_B`, `METAL`.

**Swap library (you design these too; each swaps into a slot):**
- wood variants (at least 3), clay/brick/plaster variants (at least 3), several cloth/accent ramps (at least 8, chosen to serve the bohemian feel), 3 skin ramps, 5 hair ramps;
- seasonal foliage ramps (spring, summer, autumn, winter/frost), a snow ramp, a water ramp, an ember/fire ramp;
- plus two single colours: a deep "ink" for eyes and voids, and a bright "spark" for single-pixel glints.

Document the palette in the code as plain data and show it in the atelier (swatches, labelled).

### 4.1 Piece-definition format (use exactly this)

Every hand-drawn piece is a JS object with a text grid. Characters are SEMANTIC (a slot and a tone index), not colours:

| Char | Meaning |
|---|---|
| `.` | transparent |
| `1 2 3 4` | MAIN slot tones (the primary material of the piece; the generator chooses the real ramp; if you use 5 tones, use `5` too) |
| `a b c d` | ACCENT slot tones (a second colour) |
| `s t u v` | SKIN tones |
| `h i j k` | HAIR tones |
| `m n p q` | METAL tones |
| `w x y z` | WOOD tones (fixed wood regardless of MAIN) |
| `f g l r` | FOLIAGE tones |
| `e` | EMBER (fire, glow, lit window) |
| `o` | INK |
| `*` | SPARK |

Neutral example (a 6x4 piece, only to show the format; your pieces carry your own design):
```
'example_piece': { w:6, h:4, anchor:[3,4], mirror:'free', rows:[
  '.1221.',
  '123321',
  '1aabb1',
  '.1111.' ]}
```
Each piece carries metadata: `anchor` (ground point or attachment point), optional named `attach` points (`hand`, `head`, `roof`, `door`), `mirror` mode (`none`, `free`, `face`), `tile:true` for tileable textures, and a note of which slots it uses.

---

## 5. SPACE, SIZES AND CAMERA

- **View:** isometric 2:1 (dimetric). **Ground tile = 32x16 px** (diamond). Screen position of tile (x,y): `sx = (x - y) * 16`, `sy = (x + y) * 8`.
- Building footprints: 1x1, 2x1, 2x2 tiles. Box heights are given per building (px).
- Citizens: **16x24 px** canvas, feet at bottom centre. Animals 6 to 16 px. Icons 16x16, resource units 8x8.
- Depth sorting: by (x + y), ties by y, then by height. Everything standing sorts by its ground anchor.
- Map: fixed 24x24 tiles around a central plaza. Fixed view of the whole village that the player can pan by drag; scale x2 by default on phones.

---

## 6. HAND-DRAWN PIECE LIST (169 pieces)

Counts: textures 9, modules 19, signatures 18, hero details 12, citizen pieces 58, decor 17, animals 10, resource icons 12, resource units 6, effects 3, interface 5. **Total 169.** Draw ALL of them with the care of a hand-made game asset. Sections 7 to 14 describe each.

---

## 7. TEXTURES (9, each 8x8, tileable, MAIN slot)

Applied by the generator to the faces of boxes and to roof planes. Each must read clearly at x1 and tile without visible seams.

1. `tex_logs`: horizontal round logs with visible log ends and gaps.
2. `tex_planks`: horizontal planks with staggered joints and a knot.
3. `tex_wattle`: wattle-and-daub / plaster wall with soft clumps and a hairline crack.
4. `tex_drystone`: dry-stacked round river stones, irregular, with no mortar.
5. `tex_cutstone`: neat ashlar blocks in running bond.
6. `tex_brick`: running-bond bricks with mortar lines.
7. `tex_thatch`: dense diagonal straw strands, reads as fluffy straw (roof plane).
8. `tex_shingles`: wooden shingles in staggered rows (roof plane).
9. `tex_tiles`: curved clay tiles in scale pattern (roof plane); keep it simple so large roofs stay calm.

---

## 8. BUILDING MODULES (19 pieces)

Modules are glued to faces at attachment points. Doors, windows and anything fixed on a wall are drawn **already skewed for the left face** (the generator mirrors them for the right face and shades them one step darker; a small detail drawn flat and skewed by code turns into mush, so draw it skewed). Modules must stand out clearly from the wall behind them.

Generic (11):
1. `door_plain` 6x10: plank door with hinges and a knob.
2. `door_arched` 6x11: arched top, painted leaf (ACCENT), frame.
3. `win_shutter` 6x7: shuttered window, one shutter open, a lit pane.
4. `win_glazed` 6x7: 2x2 panes with a cross mullion.
5. `column` 4x16 (not skewed): a round pillar with capital and base.
6. `flag` 7x9 (not skewed): a pole with a swallow-tail banner.
7. `barrel` 6x7: hooped barrel.
8. `ladder` 4x12: a wooden ladder leaning, drawn skewed.
9. `pot_flowers` 5x5: a pot with a small bloom.
10. `laundry` 8x6: a short clothesline with 2 patterned cloths.
11. `tool_lean` 3x10: a rake or hoe leaning on a wall.

Bohemian extras (8):
12. `bunting` 12x4: a sagging string with 4 triangular flags in alternating accent colours; the generator strings it between two roof points at any span by repeating/clipping.
13. `wind_chime` 4x8: hanging from the eave, 3 tubes of different lengths.
14. `planter_hang` 5x7: a hanging basket with trailing leaves.
15. `lantern` 3x6: a round paper-lantern shape with a lit centre and a top hook.
16. `flowerbox` 7x3: window box with tiny blooms.
17. `cat_roof` 7x5: a sitting cat silhouette with a curled tail; at most once per village on a roof ridge.
18. `rug_plaza` 12x6 (iso diamond): a woven rug with a geometric border; placed at the plaza.
19. `herb_bundle` 3x6: a bundle of hanging dried herbs tied with string.

---

## 9. BUILDING SIGNATURES (18 pieces)

The hand-drawn piece that says WHAT a building is. Each must read at x1.

1. `sig_mill_sails_0` 20x20: four-bladed windmill sails at 0 degrees. 2. `sig_mill_sails_45` 20x20: at 45 degrees. (A full turn needs only these two, because 4 blades are 90-degree symmetric; the generator alternates them and rotates by 90.)
3. `sig_mine_headframe` 16x22: a timber winding frame with a wheel, rope and crossbeams. 4. `sig_cart` 8x6: an ore cart with two wheels, MAIN slot body (the generator recolours it for copper/iron/coal).
5. `sig_gallery` 14x12: a timber-framed tunnel mouth in rock, an INK void, a lantern.
6. `sig_anvil` 8x6: an anvil on a log stump with a spark.
7. `sig_hopper` 10x10: a wooden hopper funnel with a chute.
8. `sig_crop_1`, 9. `sig_crop_2`, 10. `sig_crop_3` (each 8x8): three growth stages of grain (sprout, young, ripe with heads); the generator picks the stage from the season. 11. `sig_scarecrow` 8x14: a scarecrow with a patched tunic and a straw hat.
12. `sig_drying_rack` 12x10: a timber A-frame with strips of meat or pelts hanging.
13. `sig_antlers` 8x6: a stag-antler trophy plaque.
14. `sig_hoist` 10x14: a wooden crane/pulley with rope and hook.
15. `sig_clock` 8x8: a round clock face with 2 hands in a stone ring.
16. `sig_bell` 6x8: a hanging bell in a small wooden frame.
17. `sig_curtain` 14x10: a theatre stage front with a gathered striped curtain.
18. `sig_weapon_rack` 12x10: a rack of 3 spears and 2 shields.

Hanging signs are generated by code and carry an existing 16x16 resource icon (book for library, coin for bank and trade post, cross for hospital): 0 extra drawings.

---

## 10. HERO DETAIL PIECES (12): the hand-polish layer

Overlays that make the most-seen buildings (cabin, cottage, farm, lumber yard, quarry, 2x2 halls) feel hand-drawn instead of generated. Apply them as optional decorations chosen by the PRNG.

1. `hd_thatch_fringe` 16x3: the ragged fringed lower edge of a thatch roof. 2. `hd_ridge_knot` 8x4: a straw ridge cap with a bound knot and crossed ends.
3. `hd_clay_ridge` 16x3: a clay ridge cap with scalloped ends. 4. `hd_chimney_cap` 5x4: a chimney top with a stone cap and a soot stain.
5. `hd_moss_base` 16x3: a mossy dry-stone foundation strip with grass tufts.
6. `hd_ivy` 8x12: a patch of ivy climbing a wall with a few small flowers.
7. `hd_shutter_pattern_a` 3x7 (a heart-and-diamond cut-out), 8. `hd_shutter_pattern_b` 3x7 (a sunburst cut-out).
9. `hd_lintel` 10x3: a painted door lintel with a geometric folk band.
10. `hd_bargeboard` 12x4: a carved scalloped gable board.
11. `hd_halftimber` 8x8 tileable: a half-timber cross-beam pattern over plaster (for tier 2 and 3 walls).
12. `hd_doorstep` 8x3: a worn stone doorstep with a tiny weed.

---

## 11. THE 26 BUILDINGS: FULL SPEC (3 evolution tiers each)

### 11.1 Tier rules (common to all)

| Tier | Trigger | Walls | Roof | Details |
|---|---|---|---|---|
| **P1 Primitive** | start (`tech.primitive`) | logs, wattle | thatch, low gable or cone | hides, logs, fringed eaves, no foundation |
| **P2 Timber** | `tech.axe >= 2` | planks, dry-stone lower course | shingles | shutters, chimney, stone base, bunting appears |
| **P3 Masonry** | `tech.cement >= 1` | cut stone / brick / half-timber plaster | tiles | glazed windows, upper floor, doorstep, planters |

Metal parts follow `tech.mining` / `tech.smelting`: copper look, then iron look, then steel look. Recolour only; do not redraw. Choose the colours yourself.

### 11.2 Per-instance variation (seeded by type + index)
Each instance picks: roof ramp (3 choices compatible with its tier), wall shade (2), door model (2) and face (left or right), 0 to 2 windows, chimney yes/no and position, wall height +/-2 px, gable or hip roof, orientation (the box is REGENERATED in the other orientation; never simply mirror a building, because it would flip the light), 0 to 2 accessories from {pot_flowers, laundry, tool_lean, flowerbox, herb_bundle, wind_chime, planter_hang, lantern, barrel}. **Anti-clone rule:** two neighbouring instances of the same type must differ in at least 2 of {roof ramp, wall shade, orientation, accessory}. If not, re-roll with seed+1.

### 11.3 The buildings (footprint in tiles, box height in px)

**LIVING**
1. **Cabin** (`basic_housing`), 1x1, 18 px. P1 round-log hut with a thatch gable. P2 planked cabin, shingles, stone skirt, chimney. P3 plastered brick cottage with a tile roof, glazed windows, doorstep. Anim: chimney smoke at P2/P3 when `on`.
2. **Cottage** (`cottage`), 1x1, 24 px, taller with a dormer. Unlocks after `housing >= 2`, so show at least tier-2 style. P2 timber with an upper floor, P3 half-timber upper floor and tile roof, flowerbox. Heroes `hd_halftimber`, `hd_bargeboard`.
3. **Lodge** (`lodge`), 1x1, 20 px. A hunter's long, low lodge: hide-covered roof at P1 (pelts and rope), planked at P2, stone base at P3. `sig_antlers` above the door, `sig_drying_rack` beside.

**FOOD**
4. **Smokehouse** (`smokehouse`), 1x1, 18 px. P1 hide-and-pole hut with a smoke hole; P2 narrow planked hut with a vented ridge; P3 stone and brick, tile roof. `sig_drying_rack`. Anim: thin smoke column when `on`.
5. **Farm** (`farm`), 2x2, 6 px field plus a 14 px shed. A tilled field (generated furrows) with the grain crop in rows, a tiny shed at the corner, a low fence of `fence_post` pieces. The crop stage follows the season: spring sprout, summer young, autumn ripe, winter bare or snowed. One `sig_scarecrow` per farm. P1 plain furrows; P2 + shed and fence; P3 + stone shed with a tile roof and a rain barrel.
6. **Compost Heap** (`compost`), 1x1, 6 px. Generated mound with straw, a pitchfork (`tool_lean`), 2 fly particles. A wooden frame at P2 and a stone-edged bed at P3.
7. **Grain Silo** (`silo`), 1x1, 36 px, generated cylinder with a dome. P1 woven wicker bin on stilts; P2 planked barrel silo with hoops; P3 stone silo with a clay-tile cone. A ladder module.
8. **Mill** (`mill`), 1x1, 34 px tower. P1 timber post-mill; P2 round timber tower; P3 stone tower with a tile cap. `sig_mill_sails_0/45` rotating (frame swap every 300 ms when `on`; wind sets the speed).

**STORAGE**
9. **Shed** (`shed`), 1x1, 14 px. Open-sided lean-to with stacked crates; P2 planked with a door; P3 stone-footed with a hoist (`sig_hoist`).
10. **Freight Yard** (`storage_yard`), 2x2, 10 px. A fenced yard with crates, barrels and a sheltered corner; the contents stack up with `resource.amount / max`. `sig_hoist` at P3.

**EXTRACTION**
11. **Lumber Yard** (`lumber_yard`), 2x2, 12 px. A cleared yard with a lean-to, log stacks (growing with Lumber fill), a chopping block with an axe, sawhorses. P2 adds a roofed stacking shed, P3 stone-footed with a crane.
12. **Sawmill** (`sawmill`), 2x2, 26 px. An open-sided timber mill with a log carriage and a rotating toothed blade (code-drawn disc turning in 4 integer steps), `sig_hopper`. Anim when `on`: blade turns, sawdust particles.
13. **Rock Quarry** (`rock_quarry`), 2x2, 8 px. A terraced stone pit (generated stepped diamonds), a stone block stack that grows with Stone fill, a small sled or crane. P1 hand-cut pit with wooden props; P2 + a wooden hoist; P3 + a rail and a block cart (`sig_cart`).
14. **Mine** (`mine`), 2x2, 22 px. A hillside tunnel mouth (`sig_gallery`) with `sig_mine_headframe` and `sig_cart`, a spoil heap. Metal parts follow `tech.mining`. Anim when `on`: the cart rolls 6 px and back, dust puffs.
15. **Coal Mine** (`coal_mine`), 2x2, 22 px. The mine family, darker, with a coal heap and a lantern. Anim: the same cart, coal dust.

**INDUSTRY**
16. **Foundry** (`foundry`), 2x2, 26 px. A stone-built hall with an open glowing furnace mouth, a `sig_anvil`, an ingot rack. Anim when `on`: furnace flicker (3 frames), sparks, thick smoke.
17. **Smelter** (`smelter`), 2x2, 34 px. A tall conical clay furnace with a bound band, a chimney, a glowing tap hole. Anim when `on`: glow pulses, smoke rises and drifts with wind.
18. **Cement Plant** (`cement_plant`), 2x2, 28 px. A rotary kiln (generated horizontal cylinder on piers), `sig_hopper`, stacked sacks (`unit_sack`), dust.

**COMMERCE AND KNOWLEDGE**
19. **Trade Post** (`trade`), 2x1, 18 px. A striped awning (generated stripes), crates, a hanging coin sign, a hand cart alongside, a bunting string.
20. **Bank** (`bank`), 2x1, 24 px. A solid stone front with a pediment (generated triangle), 2 `column`s, a hanging coin sign, a barred window, a small door.
21. **Library** (`library`), 2x1, 24 px. A long reading hall with tall arched windows, a hanging book sign, a ladder module, planters.
22. **University** (`university`), 2x2, 34 px. A two-storey hall with a central tower carrying `sig_clock`, banners (`flag`), 3 steps, climbing ivy.

**SOCIETY**
23. **Temple** (`temple`), 2x2, 34 px. A stone-and-tile temple with a stepped base, a small bell tower (`sig_bell`), lanterns, a painted lintel, thin incense smoke.
24. **Amphitheatre** (`amphitheatre`), 2x2, 16 px. Generated tiered semicircular seating (3 to 5 stepped arcs) around a small stage with `sig_curtain`; a few tiny seated figures (2x3 px) once population is high.
25. **Barracks** (`garrison`), 2x1, 20 px. A palisade (generated stake line), a long timber hall, `flag`, `sig_weapon_rack`, a practice dummy.
26. **Hospital** (`hospital`), 2x1, 22 px. A plastered hall with a cross sign (the cross icon), a herb garden bed (`pot_flowers`, `herb_bundle`), beds visible through an open door.

### 11.4 Construction and density states
- **Scaffolding** (code): when a count rises, the new slot shows 2 to 3 seconds of scaffold: the box edges drawn as wooden poles with cross braces, plus dust particles, then the finished building appears with sparkles.
- **Density** `d = count / visible`: `d < 1.5` normal; `1.5 <= d < 3` add an annex (a second smaller box, about 55 percent size, attached at a corner); `d >= 3` annex plus an extra storey (+10 px and a second row of windows) and more smoke and workers.

---

## 12. PROCEDURAL SYSTEMS (code only, no sprites)

### 12.1 Isometric box generator
Project a (w, d, h) box in 2:1: fill the left face, right face and top face with your lit/shaded tones; sample the texture in the face's local coordinates (skewed per face). Roofs: gable, hip, flat-with-parapet, cone, dome, lean-to; each fills its planes with a roof texture and shades the planes by facing. A 2 to 3 px stone plinth under walls. A ground shadow as a flat darker ground-tone shape cast away from the light.

### 12.2 Terrain (grassland default)
- **Grass:** each 32x16 diamond built from clumped patches (not per-pixel noise), plus tufts and tiny flowers at about 10 percent density.
- **Dirt path:** autotile by neighbour mask; ragged edges that blend into the grass. Paths connect the plaza to every building cluster.
- **Bare earth / rocky ground** with pebbles.
- **Water and shores:** the water ramp with a palette-cycle animation (shift tone assignment every 200 ms along diagonal bands) and a shore of light pixels where it meets land.
- **Hills and mountains (background):** 3 layered silhouettes from 1D noise, lighter with distance; mines and quarries sit against them.
- **Ore veins:** seeded copper-, iron- and coal-looking pixels on rocky ground.
- **Forest:** the hand-drawn tree pieces scattered with a Poisson-disc rule around the map edge; density rises when fewer lumber yards exist.

### 12.3 Seasons (a table of ramp swaps applied to the whole render)

| Season | What changes |
|---|---|
| Spring | fresher grass and tree foliage, blossom pixels on trees, more flower tufts, butterflies |
| Summer | full green, crops ripe, shorter and crisper shadows |
| Autumn | grass and foliage shift to harvest tones, falling leaves |
| Winter | snow on ground and on the top-facing roof pixels, bare branches, frozen water without animation; windows and smoke stay so it never looks dead |

You choose the actual colours.

### 12.4 Weather (read `calendar.weather` and `calendar.temp`)
Rain: 1 px diagonal streaks in 3 layers with splash pixels. Snow (when cold): 1 to 2 px flakes with slow drift. Clouds: cloud shadows drifting over the ground (flat darker blobs), and optional cloud silhouettes in a sky layer. Lightning: a 1-frame flash and a jagged 2 px bolt (rare). Wind (`wind=1`): smoke and leaves lean, bunting and sails move faster.

### 12.5 Moon and sun
Moon: render the exact `calendar.moon` phase (0 to 27 of 28) as a disc with a terminator mask. Sun: a disc with a halo of 3 concentric pixel rings (no alpha).

### 12.6 Particles (pixel discs of 1 to 4 px from the palette, integer positions, 6 to 8 fps)

| Effect | Spawn | Motion | Life |
|---|---|---|---|
| Chimney / forge smoke | 1 per 250 ms | up 6 px/s, drift with wind, grow from 1 to 3 px | 1.6 s |
| Campfire flame | 4 per 200 ms | up, flicker | 0.5 s |
| Sparks (foundry) | burst of 3 | up-out then fall | 0.5 s |
| Dust (mine, cement, construction) | burst | out and settle | 0.6 s |
| Sawdust | 2 per 300 ms | small arcs | 0.5 s |
| Click ripple | 1 | an expanding 4-step pixel ring | 0.4 s |
| "+1" pop | 1 | the resource icon rises 12 px and fades by blinking | 0.8 s |
| Build sparkles | 6 | out in a star | 0.6 s |
| Falling leaves | 2 per s | sway down | 3 s |
| Butterflies | 3 total | wander | continuous |

You choose the colours from your palette.

### 12.7 Placement algorithm (from counts)
1. 24x24 map around the plaza. Sectors: housing and society around the plaza; food (farms) in an outer ring; extraction at the map edge toward the hills and forest; industry downwind (so its smoke leaves the village).
2. Slots are pre-computed per sector in a spiral that skips paths. **Instance number k of a type always takes slot k and seed (type, k)**, so building the 13th farm never moves the other 12.
3. Visible sprites for a count n: `v(n) = n` if n <= 8, else `min(24, 8 + round(4 * log2(n / 8)))`. Global cap about 80 buildings. Examples: 16 gives 12, 32 gives 16, 64 gives 20, 128 gives 24.
4. Visible citizens per job: `w(n) = min(n, 1 + ceil(sqrt(n)))`; global cap 40. Citizens stand and work at their building and walk short paths between their work spot and the plaza.

### 12.8 Biome swaps (palette substitution tables)
Define a table for each of the 12 biomes mapping foliage, ground, water and tree sets: grassland (default, polished), oceanic (more water, sand), forest (denser trees), desert (sand ground, shrubs recoloured from the bush piece), volcanic (dark rock ground, glowing cracks), tundra (permanent snow), savanna (dry grass, flat-topped trees from the tree piece recoloured), swamp (murky water, reeds), ashland (ash ground), taiga (pine-heavy), hellscape (scorched ground), eden (lush, extra flowers). Only palette swaps; no new drawings.

### 12.9 Night (optional, off by default)
A palette filter that darkens the world while keeping lit windows, lanterns and campfires as the brightest points, with small light pools under lanterns. Not driven by the game (Evolve has no clock).

---

## 13. CITIZENS: 58 hand-drawn pieces, 17 jobs, composed by layers

### 13.1 Sizes and layers
Canvas 16x24, feet at the bottom centre, head about 6x6, torso about 8x8, legs 6x8. Layers bottom to top: legs or hem, torso, arms, head, hair, headwear, tool, flourish. Colours come from semantic ramps: skin (3 choices), hair (4 cuts x 5 ramps), outfit, accent, metal.

### 13.2 The 58 pieces
- **Legs (4):** `legs_stand`, `legs_step_a`, `legs_pass`, `legs_step_b` (walk cycle: step A, pass, step B, pass). **Robe hems (2):** `hem_stand`, `hem_step`.
- **Torsos (2):** `torso_tunic` (with a belt line), `torso_robe`.
- **Arms (5):** `arm_neutral` (hanging, swinging by 1 px), `arm_raise` (tool up), `arm_strike` (tool down), `arm_hands_a`, `arm_hands_b` (gesture in front).
- **Head (1):** `head_front` (a 6x6 face with simple eyes and a tiny nose pixel). **Back pieces (8):** `back_torso_tunic`, `back_torso_robe`, `back_arm`, `back_head`, `back_hair_1..4`.
- **Hair (4):** `hair_short`, `hair_long`, `hair_braid`, `hair_bun`.
- **Headwear (8):** `hat_straw` (wide-brim), `hat_scarf` (headscarf), `hat_beanie`, `hat_miner_lamp` (helmet with a lamp), `hat_hood`, `hat_scholar` (a flat toque), `hat_top` (a tall banker hat), `hat_helmet` (a soldier helmet).
- **Tools (13):** `tool_hoe`, `tool_basket`, `tool_spear`, `tool_axe`, `tool_hammer_big` (stone mallet), `tool_pick`, `tool_shovel`, `tool_hammer` (craft), `tool_book`, `tool_flask`, `tool_purse`, `tool_lute`, `tool_shield`. Tool heads must be **exaggerated: about 2 px thick, with a head that contrasts clearly with the handle**, so they read at x1.
- **Cart (3):** `cart_box`, `cart_wheel_a`, `cart_wheel_b` (spokes at 0 and 45 degrees). The loaded state reuses 8x8 resource units.
- **Flourishes (8), the bohemian touch:** `fl_scarf_end` (a trailing scarf tail), `fl_sash` (a patterned waist sash), `fl_apron_pocket`, `fl_shoulder_bag`, `fl_flower_hair` (a small flower cluster), `fl_beads` (a necklace of 3 beads), `fl_headband` (a patterned band), `fl_poncho_trim` (a zig-zag trim).

### 13.3 Archetypes and the 17 jobs (exact assignment)

Each archetype gets its own **outfit colour family, chosen by you, constant for that archetype and clearly distinct from the others**, so people can be told apart by colour before shape.

| Archetype | Body | Jobs (game key): tool and headwear |
|---|---|---|
| 1. People of the land | tunic | `unemployed`: empty hands, no hat. `forager`: basket, headscarf. `farmer`: hoe, straw hat. `hunter`: spear, headband. |
| 2. People of wood and stone | tunic with rolled sleeves | `lumberjack`: axe, beanie. `quarry_worker`: big mallet, bare head. `miner`: pick, lamp helmet. `coal_miner`: pick, lamp helmet, a sooty version of the outfit. `cement_worker`: shovel, scarf over the mouth. |
| 3. Craft and transport | tunic plus leather apron | `craftsman`: hammer. `teamster`: the hand cart. |
| 4. Lore and faith | robe | `professor`: book, toque. `scientist`: flask, bare head, goggle-like dots. `priest`: book and hood. `banker`: purse, top hat. `entertainer`: lute, a patchwork sash flourish. (Give lore, faith, finance and entertainment each their own variant of the robe colour.) |
| 5. Soldier | tunic plus helmet | `soldier`: spear and shield. |

Skin (3 ramps), hair (4 cuts x 5 ramps) and hat on or off are drawn from the PRNG, giving 48 different heads. Tools evolve with tech: the axe head follows `tech.axe` (stone, copper, iron); the pick follows `tech.mining`. Recolour only.

### 13.4 Animations (generated by composing layers)

| Animation | Frames | How |
|---|---|---|
| Idle | 2 | `legs_stand`, 1 px body bob by the code |
| Walk | 4 | step A, pass, step B, pass; 1 px bounce; arm swing by pose swap |
| Work "strike" (axe, mallet, pick, shovel, hoe, hammer) | 2 | `arm_raise` then `arm_strike`; the tool is the same piece rotated by 90 degrees |
| Work "gesture" (forager, priest, professor, scientist, banker, entertainer, teamster) | 2 | `arm_hands_a`, `arm_hands_b` |
| Guard (soldier, lookout) | 1 plus bob | spear planted |

Directions: left/right by mirroring; walking away uses the 8 back pieces with the front legs and headwear shifted 1 px.
Readability order (what the eye reads first): outfit colour, headwear, work location, tool, gesture. Also show a floating 16x16 resource icon over a group when tapped.

### 13.5 The pixel font: see section 14.6

---

## 14. DECOR, ANIMALS, RESOURCES, EFFECTS, INTERFACE

### 14.1 Decor (17 pieces)
1. `tree_pine` 18x30, 2. `tree_broadleaf` 22x30, 3. `tree_dead` 14x24, 4. `sapling` 8x10, 5. `stump` 10x8, 6. `bush` 12x9 (berries added by code), 7. `rock_small` 10x7, 8. `rock_big` 18x12, 9. `fence_post` 4x9, 10. `sundial` 14x12 (the shadow is code-drawn from `calendar.day`), 11. `signpost` 10x16, 12. `standing_stone` 8x18 (with a painted spiral), 13. `tuft_flowers_a` 8x6, 14. `tuft_flowers_b` 8x6, 15. `mushrooms` 7x5, 16. `fire_ring` 14x8 (stones around a hearth; the flame is code), 17. `lantern_post` 6x18 (a pole with a hanging lantern and the anchor of a bunting string).
Trees are drawn once and recoloured per season and biome; mirrored for variety.

### 14.2 Animals (10 pieces)
`deer_rest`, `deer_step_a`, `deer_step_b` (14x14), `antlers_layer` (a layer for stags; removing it makes a doe), `boar_a`, `boar_b`, `boar_c` (12x9 stocky, 3 poses; recoloured for a farm pig), `rabbit_sit`, `rabbit_hop` (6x6), `fish` (6x3). Birds are a code-drawn "v" of 3 to 5 px, flapping at 4 fps.

### 14.3 Resource icons (12 hand-drawn, 16x16, each recolourable)
`ic_food` (a sheaf of wheat), `ic_wood` (3 stacked logs), `ic_stone` (a rough rock), `ic_fur` (a pelt), `ic_ingot` (a metal bar; recoloured copper/iron/steel = 3 icons), `ic_sack` (a cement or grain sack), `ic_coal` (a lump with a sparkle), `ic_coin` (a coin with a simple sun mark), `ic_book` (Knowledge, an open book), `ic_head` (population), `ic_face` (morale), `ic_house` (housing). These are the most reused pieces: signs, floating icons, tabs.

### 14.4 Resource units (6 hand-drawn, 8x8)
`unit_log`, `unit_block` (a hewn stone block), `unit_sack`, `unit_ingot`, `unit_crate`, `unit_fur_bundle`. **Piles are stacked by code**: the number of units shown follows `amount / max` continuously (pyramid or heap arrangement). Loose piles (coal, ore, grain) are generated cones of pixels. Items carried by citizens are these units or tools.

### 14.5 Effects (3 hand-drawn)
`fx_chest_closed` 16x14 (a rounded treasure chest with a woven strap and a lock), `fx_chest_lid` 16x7 (the lid alone; the opening is a code rotation/translation plus star particles), `fx_bulb` 8x10 (an idea bulb for "research done"). Everything else is particles.
**Reward chest:** appears at the plaza when the player completes review milestones (triggered by our code; you only draw it). **Streak flame** (code): a small 4-frame flame and a bigger 4-frame flame.

### 14.6 Interface (5 hand-drawn)
1. **Pixel font**, one sheet, about 110 glyphs of 5x7: A-Z, a-z, 0-9, and punctuation `. , : ; ! ? ' " - + = / ( ) % # & * @ _ [ ]` and the French accents `é è ê ë à â î ï ô ù û ü ç œ É È À Ç` plus `€ ° « »`. Friendly and legible; a bold weight can be made by code (draw twice with 1 px offset).
2. **Panel 9-slice** 24x24: a woven-rope or textile-trim border with knot corners (bohemian), a calm fill, a thin inner rule.
3. **Button 9-slice** 16x16: a leather- or fabric-like button; the 4 states (normal, hover lighter, pressed 1 px down, disabled desaturated) are made by code.
4. `tab_gear` 16x16 (settings), 5. `tab_card` 16x16 (a flashcard with a corner fold). Other tab icons reuse the resource icons (house, bulb, crate, coin, shield, cart).
Progress bars, checkboxes, sliders, close "x" and cursors are drawn by code. **Keep Evolve's own HTML UI; only the village window is pixel art.**

---

## 15. TIMINGS AND ANIMATION TABLE

| Thing | Frames | Speed |
|---|---|---|
| Walk cycle | 4 | 8 fps |
| Idle bob | 2 | 2 fps |
| Work strike | 2 | 3 fps |
| Water palette cycle | 4 | 5 fps |
| Windmill sails | 2 (rotated by 90 too) | 3 fps (wind raises it) |
| Sawmill blade | 4 | 10 fps when `on` |
| Furnace flicker | 3 | 6 fps when `on` |
| Mine cart | 8 steps along a 6 px path | 4 fps when `on` |
| Smoke and particles | system | 6 to 8 fps |
| Scaffold to finished | 2.5 s | once |

Buildings with an `on` field (`compost`, `mill`, `garrison`, `sawmill`, `cement_plant`, `mine`, `coal_mine`): when stopped, show no smoke and still sails or blade. (The exact meaning of `on` is not confirmed; treat it as "active".)

---

## 16. THE ATELIER PAGE (so I can judge everything fast)

One self-contained page (no external dependencies, system font stack, light and dark safe, phone-friendly) with these sections:
1. **Style bible and palette:** your written style choices and every ramp as labelled swatches.
2. **Pieces:** every hand-drawn piece on a labelled grid with a checkerboard background, zoom x1/x2/x4/x8, ramp-swap dropdown, mirror toggle.
3. **Contact sheet:** all 26 buildings x 3 tiers; all 17 jobs x idle/walk/work; terrain, decor, animals, resources, effects, font specimen with a French pangram.
4. **Village simulator:** the full renderer with sliders for every building count and job count (fake state), buttons for season (4), weather (3), temperature, wind, moon phase (0-27), biome (12), and toggles: grayscale, x1 pixel-true, silhouette, show slots, anti-clone checker overlay, night filter.
5. **Self-check panel:** lists any piece with a pixel outside the palette, any grid with inconsistent row widths, any non-integer rotation; counts pieces by category (must total 169).

---

## 17. DELIVERY ORDER (if you must split the work, use these batches; finish ALL)

1. Batch 1: the style bible, palette, piece format and decoder, PRNG, isometric box/roof generator, terrain and seasons, the 9 textures, the 11 generic modules, atelier skeleton. (Foundation; get it right before the art.)
2. Batch 2: the 3 housing buildings in 3 tiers, the 12 hero details, the 8 bohemian modules, placement and anti-clone, scaffolding.
3. Batch 3: food, storage and extraction buildings (13 more) with their signatures.
4. Batch 4: industry, commerce, knowledge and society buildings (10 more) with their signatures.
5. Batch 5: all 58 citizen pieces, the layer compositor and animations, jobs placement.
6. Batch 6: decor (17), animals (10), resource icons (12) and units (6), piles, particles, weather, sun and moon.
7. Batch 7: the 3 effects, the interface pieces and bitmap font, biome swaps, optional night filter.
8. Batch 8: the full atelier, the self-check, the `SpriteKit` API, and a final polish pass against section 3 and section 18.

At the end of every batch: list what is complete, show the piece count so far, flag any piece you are less than happy with and fix it before moving on. Do not shrink the scope.

---

## 18. QUALITY CHECKLIST (run it on your own output and fix failures)

- Silhouette test: every building, job and animal still reads when filled solid.
- At x1 (true size) a person can tell a farmer from a miner by outfit colour and headwear, and a mill from a smelter by shape.
- Enough contrast between each object and the ground or wall behind it, checked in greyscale.
- One consistent light direction across the whole kit. Hand-drawn pieces obey it; generated boxes enforce it; a building is never simply mirrored (regenerate it instead).
- One consistent outline and shading approach everywhere; every colour from the palette; no dithering noise, no orphan pixels, no pillow shading, no banding.
- Doors and windows stand out from their walls; roof textures stay calm at large sizes.
- No two neighbouring instances look alike; the village looks hand-built, not stamped.
- The bohemian character is visible at a glance (fabrics, bunting, plants, painted details, lit windows) without clutter.
- All 4 seasons look good; winter never looks dead.
- Code is deterministic, offline, free of external requests and of Google services.

---

## 19. WHAT TO SAY AT THE END

When everything is delivered, give me: the file list, the total hand-drawn piece count by category (it must be 169), the total distinct images the generator can compose (state your calculation), the three pieces you consider weakest and how I could improve them, and every assumption you had to make.
