# COMPLETE PROMPT: add the "Era 0 / Evolution" view to the existing Evolve sprite kit (audited against the game source)

Work in THIS project. Extend the kit (`kit/*.js`, `atelier.html`); keep your style bible, palette mechanics, piece format, decoder, PRNG, bitmap font, particles and API. Do not rebuild or restyle anything. Build, don't summarize. Deliver in the 3 batches at the end; finish all.

## Rules (unchanged, absolute)
Offline, plain ES2019 + Canvas 2D, no network, no Google service or font. Integer pixels, no smoothing, 1-bit transparency, rotations in multiples of 90. Every pixel from the palette; you may ADD up to 6 ramps (own family in `palette.js`), never edit existing ones. Seeded PRNG only. No placeholders. Mood: "bohemian garden of life" (patterned membranes, painted organelles, lantern-like plankton), never a lab or neon sci-fi look.


## THE JOB IN ONE PARAGRAPH

Before the village, **Evolve** has an "evolution" phase: the player starts as a drop of organic soup (RNA), builds a cell (membranes, organelles, nucleus, eukaryotic cell, mitochondria) and then walks a chain of evolutionary choices until a sentient species appears and the village era begins. This phase has no buildings, no citizens, no calendar village. It needs **one new view, "Era 0": a primordial pool that grows up, stage by stage, into a creature walking out of the water, and finally hands over to the existing village view.** Deliverable: a few new hand-drawn pieces (about 40), a procedural scene renderer, additions to the atelier, and a clean hand-over to `SpriteKit.render` of the village. **Scope for this delivery: the human path only** (animal fork, mammals, humanoid, then species `human`). Other forks (plants, fungi, arthropods, aquatic, demonic...) are NOT drawn, but the code must be table-driven so they can be added later without touching the renderer.

---

## STYLE: KEEP YOUR OWN BIBLE

Re-apply, unchanged, the style bible you wrote for the village:

- **Mood:** sun-faded textiles on earthy timber; earth neutrals carry most pixels; dyed accents (saffron, madder, indigo, teal, plum, rose) only where a person would have added them.
- **Light:** from the upper left everywhere; lit planes toward the viewer and left; right sides one tone darker; cast shadows to the lower right as a flat patch one ground tone darker.
- **Ramps:** five tones, hue-shifted (lights warm and yellow, darks cool and violet); pieces paint with tones 1-4; tone 5 is for generated shading.
- **Outline:** coloured selective outline, no black lines; bottom/right silhouette in the darkest tone of the piece's own ramp, top/left softened by one step; ink reserved for voids, eyes, doorways.
- **Shading:** flat clustered planes, 2-3 tones per surface; no dithering, no pillow shading, no speckle.
- **Proportion:** chunky and squat; strict 2:1 lines for anything on the ground.
- **People:** outfit colour names the archetype; the final creature must be recognisable as the same human body as the village citizens.

**The only extra direction for this phase: "bohemian" still applies, in a quiet way.** The pool is a *garden of life*, not a laboratory: soft textile-like patterns on membranes (stripes, dots, scallops, woven borders), hand-painted looking organelles, glowing hearth-like nuclei, plant-like fronds on the sea floor, small lantern-like plankton. Nothing sterile, no scientific diagram look, no neon sci-fi.

---

## Game data (window.evolve.global, a deep copy read once per second). Verified in the game source; every field may be ABSENT, so read defensively and never throw.
- Era 0 is on while `race.species === 'protoplasm'`. Any other value = the existing village view. A new game after a reset puts it back to `'protoplasm'` (and `seed` changes, `stats.days` returns to 0): the view must restart cleanly.
- `resource.RNA` and `resource.DNA`: `amount`, `max`. Max grows with the parts: RNA max = 100 + membranes x (5 + 5 x mito), DNA max = 100 + eukaryotic cells x (10 + 10 x mito). `resource.DNA` appears only once the first DNA is formed.
- `evolution.membrane / organelles / nucleus / eukaryotic_cell / mitochondria` are objects `{ count }`. They unlock one per second in that order, so early on only some keys exist. There is NO game cap on counts (cost just grows); our cap of 24 drawn per kind is a visual choice. (`evolution.dna` is a plain number, ignore it.)
- Production per second: each organelle makes RNA; each nucleus turns 2 RNA into 1 DNA. Mitochondria produce nothing: they multiply the caps. Show activity from these, not from mitochondria.
- `tech.evo` is ABSENT at the very start (phase 0: only RNA clicking), becomes 1 as soon as the key `evolution.mitochondria` exists, then 2..7 along the human path. It never reaches 8: at the end `tech.evo` and `evolution` are deleted and the species flips.
- `evolution.final` is ABSENT until stage 2, then 20, 40, 60, 80, 90, 100.
- The human path (each step is one click): sexual reproduction (150 DNA) -> stage 2; phagocytosis (175) -> 3; multicellular (200) -> 4; bilateral symmetry (230) -> 5; mammals (245) -> 6; humanoid (260) -> 7; then sentience (300 RNA and 300 DNA, which needs caps above 300) -> species flips to `human`. At stages 2, 5 and 6 the game also offers non-human branches: do not draw them, keep a stage table for later.
- A game may START at any stage: a "Master" perk starts at stage 2, "Grandmaster" at stage 6 with `final` 80. Never assume you saw the earlier stages.
- Time: `city.calendar` does NOT advance in this phase (day stays 0): no seasons, weather or moon. Animate with your own clock. `city.biome` is `grassland` in a normal first game (it only tints the water; no trait of planet).
- Two random events exist: `event.l` of `dna_replication` and `rna_meteor` (a sudden gain, orange log message). Give each a short visual: a meteor streak into the pool, a DNA strand splitting.
- Pace (estimated from code): about 25 to 45 minutes in total; stages 2 and 3 are the longest (waiting for DNA caps); stages 6 and 7 can last under a minute each, but stage 7 can wait a long time for 300/300. Do not put heavy unique animation on short stages; make stage 7 a calm looping scene.

## Two camera modes
1. Stages 0-3: flat side-on pool (world at x2). Cell sprites 16-48 px.
2. Stages 4-7: the existing isometric 2:1 terrain as a shoreline (water, sand, mud, reeds). Creature at citizen scale. Switch at stage 4 with a short code wipe (12 frames, the pool surfaces). If a game starts at stage 4+, show the shore directly.

## What each stage shows
0 a few RNA specks that the player clicks into being. 1 cell parts as they are built (counts drive quantity), DNA strands once DNA exists. 2 cells pair and divide (code animation). 3 a cell engulfs specks. 4 cluster of 3-12 cells, then shore. 5 worm-like creature. 6 small furred mammal. 7 upright ape with a stick or stone. Species flip: first human (reuse the citizen layers) beside a `fire_ring`, then the village takes over.
Parts: membrane = thicker patterned wall; organelles = drifting bodies that emit RNA specks; nucleus = glowing centre; eukaryotic cell = the large main cell; mitochondria = bean bodies that glow with activity of the other parts.

## New hand-drawn pieces (about 40, same text-grid format, new categories)
- cell (14): `cell_membrane_seg_a/b/c` (8x8 tileable), `cell_organelle_a..d` (8-12 px), `cell_nucleus_small` (12x12), `cell_nucleus_big` (20x20), `cell_mito_a/b` (14x8), `cell_eukaryote` (40x32), `cell_dna_strand` (8x24).
- organism (14): `org_protocell` (16x16), `org_cell_pair` (28x16), `org_cell_dividing_1..3` (28x20), `org_phagocyte_open/closed` (32x24), `org_colony_s/m/l` (24x20, 36x28, 48x32), `org_worm_a/b` (32x12), `org_mammal_a/b/rest` (20x14), `org_ape_a/b/idle` (16x24, same proportions and light as the citizens, with `attach.hand`).
- scenery (8): `sc_seaweed_a/b`, `sc_coral_a/b`, `sc_vent`, `sc_shore_rock`, `sc_shore_reed`, `sc_driftwood`.
- fx (6): `fx_bubble_1..3`, `fx_evolve_flash` (24x24), `fx_meteor` (streak, 12x12, 4 frames), `fx_dna_split` (12x16, 4 frames).
State the real total at the end.

## Code
- Pool: palette-banded water, drifting light shafts (palette shift, no alpha), caustics, parallax in 2 layers, seeded sea floor; biome swaps tint it.
- Small deterministic cell simulation driven by the counts (6-8 fps, integer positions); mitosis (1.2 s), phagocytosis loop, colony builder following `evolution.final`.
- Shore view: reuse the terrain generator with its own layout; place the creature of the current stage, joined by 2-4 more as `final` nears 100.
- Gauges: RNA bar, DNA bar with their `max`, and an arc for `final` once it exists (the game already shows a text bar in its own UI; ours is the in-scene one). Use the kit's bitmap font, French labels fine.
- On a stage increase: `fx_evolve_flash` plus a palette-tone screen flash. On the species flip: ape stands up, drops its tool, `fire_ring` appears, camera eases to the plaza, the village renderer takes over (scaffolding animation). Expose `SpriteKit.handoff()`; `render` must also handle the flip by itself on the first frame where species is no longer `'protoplasm'`. Detect a restart (species back to `'protoplasm'`) and reset the scene.
- API: `SpriteKit.render(state, dt)` unchanged and it picks Era 0 vs village by `race.species`; `SpriteKit.run(canvas)` works in both; `fakeState()` gains `race`, `evolution`, `tech.evo`, `evolution.final`; existing options keep working.

## Files and atelier
New: `kit/pieces_b9.js` (or extend `pieces_b8.js` if you prefer), `kit/evolution.js`. Small hooks allowed in `palette.js`, `spritekit.js`, `ui.js`. Update `isReady()` and `README.md`, including the exact load order (the host page loads files one by one in that order). Atelier additions: new ramps listed; new piece categories in the pieces grid; an "Evolution" block in the contact sheet (all stages, cell parts at counts 0/1/5/12/24, mitosis and phagocytosis loops, creature walks, the two events); simulator mode switch Era 0 / Village with sliders for RNA, DNA, the five counts, stage (absent, 1-7) and `final`, buttons "Evolve one stage", "Fire dna_replication", "Fire rna_meteor", "Play hand-over", "Restart"; self-check lists new categories and the grand total (222 + new).

## SPACE, SIZES, CAMERA (details)

- Same fixed world size and the same integer scales as the village view, same pan-by-drag and tap behaviour. Era 0 has two camera modes, chosen by `tech.evo`:
  1. **Micro view (stages 0 to 3):** a side-on window into the pool, flat 2D (no isometry), world drawn at x2 like the village, cells drawn at their own sizes (cell sprites 16 to 48 px).
  2. **Shore view (stages 4 to 7):** the existing **isometric 2:1 terrain** (32x16 tile) showing a shoreline of the player's biome: shallow water on one side, mud and sand, a few early plants. The creature stands on it at citizen scale (16x24 for the final humanoid; smaller for earlier stages).
- The change between the two modes at evo 4 is a short code transition (the pool "surfaces": water level drops, the camera tilts into the isometric terrain with a 12-frame wipe). No sprite needed.
- Depth sorting rules unchanged.

---

## ANIMATION TABLE

| Thing | Frames | Speed |
|---|---|---|
| Cell wander | system | 6 fps |
| DNA strand rotation | 4 | 5 fps |
| Mitosis / division | 3 + code | 1.2 s once |
| Phagocytosis cycle | 2 + code | 3 fps |
| Water caustics, light shafts | system | 4 fps |
| Bubbles | system | 6 fps |
| Worm crawl | 2 | 4 fps |
| Mammal walk | 2 | 6 fps |
| Ape walk | 2 + idle | 6 fps |
| Surfacing transition | 12 | 12 fps, once |
| Evolve flash | 6 | 12 fps, once per stage |

---

## Batches
A: new ramps, cell pieces, pool, cell sim for stages 0-1, gauges, atelier switch. B: organism cell-level pieces, fx, mitosis, phagocytosis, colony, flash, events, stages 2-4 in the pool. C: shore view, scenery, surfacing, worm/mammal/ape, hand-over, restart, `fakeState`, atelier block, self-check, README.
After each batch: say what is complete, the piece count, and anything you are unhappy with, and fix it.

## Quality
Everything reads when filled solid; at x1 a player tells a protocell from a eukaryote, a worm from a mammal, a mammal from an ape. One light direction and one outline approach, identical to the village kit. The ape and the first human share proportions. No orphan pixels, no black outlines, no dithering. Deterministic, offline, never throws on missing fields, works when the game starts at any stage.

## At the end
List new and changed files, new piece counts by category and grand total, how the hand-over works and what the host must call, the 3 weakest pieces, and every assumption.
