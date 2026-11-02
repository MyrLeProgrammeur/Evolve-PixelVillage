# COMPLETE PROMPT: add "Era 2 / Discovery" to the existing Evolve village sprite kit (audited against the game source)

Work in THIS project. Extend the kit (`kit/*.js`, `atelier.html`); keep your style bible, palette mechanics, piece format, decoder, PRNG, iso shell/roof generator, bitmap font, particles, placement, anti-clone, scaffolding, tier cross-fade and API. Do not rebuild or restyle anything. Build, don't summarize. Deliver in the 5 batches at the end; finish all.

## Rules (unchanged, absolute)
Offline, plain ES2019 + Canvas 2D, no network, no Google service or font. Integer pixels, no smoothing, 1-bit transparency, rotations in multiples of 90. Every pixel from the palette; you may ADD up to 4 ramps (own family `era2` in `palette.js`), never edit existing ones. Seeded PRNG only. No placeholders. Same village, later in time: still bohemian, never a grey factory town.

## THE JOB IN ONE PARAGRAPH

After the village era you built, **Evolve** enters its "discovery" age: mad science, electricity, steel, dynamite. In the game this age adds few buildings: 5. Mostly it **upgrades what already exists**: sheds become barns, cranes appear on the freight yard, conveyors come out of the mines, a Bessemer converter appears on the smelter. It also brings **electric power**. So the job is mainly systemic, with little new art:
1. a **4th material tier, "brick and steel"**;
2. **5 new buildings**;
3. a **power grid** (poles, wires, lit or dark windows);
4. **state-driven modifiers** on Era 1 buildings;
5. a few citizen layers.

About **31 new hand-drawn pieces**. Everything else is composed by code from pieces you already have.

---

## STYLE: KEEP YOUR OWN BIBLE

Re-apply, unchanged, the style bible you wrote for the village:

- **Mood:** sun-faded textiles on earthy timber; earth neutrals carry most pixels; dyed accents only where a person would have added them.
- **Light:** from the upper left everywhere; lit planes toward the viewer and left; right sides one tone darker; cast shadows to the lower right as a flat patch one ground tone darker.
- **Ramps:** five tones, hue-shifted; pieces paint with tones 1-4; tone 5 is for generated shading.
- **Outline:** coloured selective outline, no black lines; ink reserved for voids, eyes, doorways.
- **Shading:** flat clustered planes, 2-3 tones per surface; no dithering, no pillow shading, no speckle.
- **Proportion:** chunky and squat; strict 2:1 lines for anything on the ground.

**The only extra direction for this age: industry moves into a bohemian village; it does not replace it.** Steel and dark brick sit next to laundry lines, potted plants, painted shutters, bunting and the cat on the roof. Electric light is warm, not white or blue. Workers wear caps and overalls, but patched and dyed. Smoke is soft and drifting, never a black sky. You choose every tone, including those of the new ramps.

---

## Game data (`window.evolve.global`, a deep copy read once per second)

Every field below has been checked in the game source. Any of them may be ABSENT: treat a missing tech level as 0, read defensively, and never throw.

- **Tech levels** (`tech.<key>`, integer). This age is driven by:
  - `high_tech` 1 (mad science), 2 (electricity);
  - `housing` 3 (apartment);
  - `steel_container` 1-2;
  - `container` 3 (cranes);
  - `storage` 3 (barns);
  - `smelting` 3 (blast furnace), 4 (Bessemer);
  - `mine_conveyor` 1;
  - `explosives` 1 (black powder), 2 (dynamite);
  - `pickaxe` 4 (jackhammer);
  - `axe` 4 (steel axes);
  - `foundry` 6 (brickworks);
  - `theatre` 3 ("Techno Wizards": stage tech, NOT the magic universe);
  - `trade` 2 (diplomacy);
  - `broadcast` 1 (radio);
  - `spy` 2-3;
  - `fanaticism` 3-4 **or** `anthropology` 3-4. The game gives one path or the other; draw whichever is present.
- **New buildings** (`city.<key> = { count, on }`): `apartment`, `warehouse` (in-game name "Container Port"), `wardenclyffe`, `coal_power`, `boot_camp`. `on` is the number of copies that are powered or active.
- **Power**:
  - `city.powered` is true after electricity.
  - `city.power` is the available power; a negative value means a deficit.
  - `city.power_total` is the total.
  - Consumers in this age: `apartment` and `wardenclyffe`. Producer: `coal_power`.
- **Do NOT draw**: `slave_market`, `conceal_ward`, `banquet`, `replicator` (race, magic or far-later content). Do not react to `tech.transport` (steam engine, single-trait only). Era 3 content (factory, oil, wharf, titanium) is out of scope.

---

## 1. Material tier 4 "brick and steel"

- `tierOf()` (`kit/village.js`) returns 1-3 today. Add **4 when `tech.high_tech >= 2`**. Extend `wallFor()` / `mat()` and every composer that switches on `tier` to handle 4, and reuse the existing tier cross-fade.
- **Walls**: dark industrial brick, meaning `tex_brick` on a new ramp, with steel angle lintels.
- **Roofs**: corrugated iron or zinc on houses and sheds, sawtooth roofs on industry.
- **Windows and chimneys**: taller mullioned windows, downpipes, small electric wall lamps, tall brick chimneys.
- **30 % of dwellings stay on tier 3** at tier 4. This applies to `basic_housing`, `cottage` and `lodge`. Pick them by seed, stable per slot, so the village keeps its old houses.
- **Do not change the mill.** Its sails stay as they are.
- **Fix in `citizens.js` `metals()`.** The axe is clamped to 3 levels (stone, copper, iron). The game has `axe` 4 = steel axes, so map 4+ to steel. The other tools are already right: `tierM()` gives steel at 3, and pickaxe, hammer and hoe reach steel at 3.

## 2. New hand-drawn pieces (31, same text-grid format, new file `kit/pieces_b10.js`)

- **Textures 8×8 (3):** `tex_corrugated`, `tex_rivetplate`, `tex_glasspane` (small-pane skylight glazing).
- **Modules (6):**
  - `win_tall`: tall mullioned window. It must have a glass slot the code can switch between lit and dark.
  - `door_works`: double works door.
  - `hd_steel_lintel`.
  - `hd_downpipe`.
  - `balcony_rail`: one bay of wrought-iron railing, stacked per floor.
  - `lamp_electric`: wall lamp, also used as a street-lamp head on the existing `lantern_post` shaft.
- **Signatures (10 pieces, 11 images):**
  - `sig_hook_block`: pulley and hook, shared by all cranes.
  - `sig_gantry_trolley`.
  - `sig_tesla_coil`: coil and torus.
  - `sig_mast_top`: insulators and antenna tip.
  - `sig_converter`: Bessemer converter, 2 images (upright and tipped).
  - `sig_boiler_door`: furnace door; the glow is done in code.
  - `sig_kiln_mouth`: brick-kiln mouth.
  - `sig_tnt_crate`.
  - `sig_obstacle`: assault wall with cargo net.
  - `sig_dig_find`: amphora and bones sticking out of a trench.
- **Citizen layers (5):**
  - `tool_jackhammer`;
  - `hat_flatcap`;
  - `cloth_overalls`: a layer on both existing bodies;
  - `hat_fedora`;
  - `cloth_trenchcoat`.
- **FX, icons, units (6):**
  - `fx_spark_0..2`: 3 frames, shared by the Tesla coil, the converter, the stage and short circuits;
  - `ic_power`: lightning icon;
  - `unit_container`: one steel shipping container, stacked and recoloured with existing dyed ramps of your choice;
  - `unit_cable`: cable coil, carried.

## 3. New code helpers (no art)

- `H.truss(p, a, b, w, ramp)`: two chords plus alternating diagonals between two iso points. It is the one shape behind the crane jib and mast, the gantry legs and beam, the radio mast, the steel headframe and the conveyor frame. First check it reads at ×1. If a 1 px truss turns to mush, use 2 px chords and adjust `sig_hook_block`.
- `H.wire(p, a, b, sag)`: 1 px catenary.
- `H.conveyor(p, a, b)`: inclined belt, rollers every 2 px, stones moving along it.
- Two new roof types in the shell generator: `gambrel` (barn) and `sawtooth` (glazed teeth `tex_glasspane`, plus the slope in `tex_corrugated`).
- Rails: two 1 px lines plus sleepers; the wagon is the existing `sig_cart`.

## 4. New buildings (5)

Compose them all from boxes, existing pieces and the new pieces. They follow the existing count → visible-sprite placement, density and anti-clone rules. Choose sensible per-type visible caps.

| Key | Footprint, size | Composition | Variants and animation |
|---|---|---|---|
| `apartment` | 2×1, ~64×64 | 3-4 stacked boxes, `balcony_rail` per floor, `win_tall`, a courtyard with laundry and plants (bohemian) | 3 variants by seed; windows lit/dark (§ 5) |
| `warehouse` | 2×2, ~64×48 | yard, stacked `unit_container`s (3 fill levels), `door_works` shed | with `steel_container >= 2`: a gantry (truss legs and beam, `sig_gantry_trolley` moving back and forth, `sig_hook_block`) |
| `wardenclyffe` | 2×2, ~64×64 | round brick tower, `dome` roof, `sig_tesla_coil` on top, low lab with `tex_glasspane` | arcs `fx_spark` (4-frame loop, irregular); `broadcast >= 1`: truss radio mast plus `sig_mast_top`, red blinking light at night |
| `coal_power` | 2×2, ~64×60 | big tier-4 hall, 2 tall chimneys (existing cylinders), coal heap, `sig_boiler_door` | thick soft smoke (existing particles), boiler glow; it is the source of the grid |
| `boot_camp` | 2×1, ~64×40 | palisade, sand track, `sig_obstacle`, round target (code), existing `camp_tent` | soldiers drilling, using the existing soldier with a code routine (run, jump, pause); with `spy >= 3`: a second, narrower course |

## 5. Power grid

1. Nothing at all while `city.powered` is falsy.
2. **Poles and wires.** Poles are code: a 1 px shaft about 12 px tall, with a crossarm. Place them every 3-4 tiles along roads you already route, from each visible `coal_power` to each visible consumer. Join the poles with `H.wire`.
3. **Lit windows.** For each consumer type, the fraction of lit sprites is `on / count`. The first sprites by seed are lit, the rest dark. A lit window replaces its glass with a warm ramp; a dark one keeps the glass.
4. **Deficit** (`city.power < 0`): an occasional `fx_spark` on one wire, and an `ic_power` badge on every dark consumer sprite. It reuses the existing badge mechanism.
5. **Night** (existing filter): tier-4 wall lamps and electric street lamps get a 3 px halo. The older houses keep their lanterns.

## 6. Modifiers on Era 1 buildings

| Condition | Building | Effect |
|---|---|---|
| `storage >= 3` | `shed` | becomes a barn: larger box, `gambrel` roof, `door_works` |
| `container >= 3` | `storage_yard` | truss crane with `sig_hook_block`, jib in 4 slow positions |
| `smelting >= 3` | `smelter` | taller furnace with `sig_boiler_door` |
| `smelting >= 4` | `smelter` | plus `sig_converter`, tipping every 15-25 s with a `fx_spark` shower |
| `mine_conveyor >= 1` | `rock_quarry`, `mine`, `coal_mine` | `H.conveyor` from the gallery to the heap; at tier 4 the headframe becomes a truss of the same gauge |
| `explosives >= 1` | same three | `sig_tnt_crate` beside the site |
| `explosives >= 2` | same three | plus a blast every 20-40 s: a 1-frame white flash and a dust cloud (existing particles) |
| `pickaxe >= 4` | miners | `tool_jackhammer`, shaking ±1 px while working |
| `foundry >= 6` | `foundry` | `sig_kiln_mouth`, brick pallets (stacked `tex_brick` boxes, 3 levels) |
| `theatre >= 3` | `amphitheatre` | `fx_spark` on the existing `sig_curtain` stage during shows |
| `trade >= 2` | `trade` | 3 existing `flag`s in foreign colours |
| `fanaticism >= 3` | `temple` | existing `gov_banner` recoloured as mission banners |
| `anthropology >= 3` | `temple` | code trench with `sig_dig_find`, plus the existing `market_stall` with `ic_coin` (souvenirs) |
| `spy >= 2` | world | very rare spy (`hat_fedora`, `cloth_trenchcoat`): at most 1 at a time, a few seconds, walks out of a shadow and back into it |
| `high_tech >= 2` | workers | `hat_flatcap` on ~40 % of workers by seed, `cloth_overalls` on miners, smelters and power workers; a few carry `unit_cable` |

## 7. Files, API, atelier

- **New files**: `kit/pieces_b10.js`, `kit/era2.js`. Register `era2.js` through the same `SK._ext` hook as `era1.js`. It loads last, after `kit/evolution.js`.
- **Hooks**: small hooks are allowed in `palette.js`, `spritekit.js`, `village*.js`, `citizens.js`, `world.js` and `ui.js`.
- **API**: unchanged. `fakeState()` gains the Era 2 tech keys, the 5 buildings with `{ count, on }`, plus `city.powered`, `city.power` and `city.power_total`.
- **Docs and checks**: update `isReady()`, the self-check and `README.md`, including the exact load order.
- **Atelier**:
  - the new ramps;
  - the new piece categories;
  - simulator sliders for `high_tech`, `smelting`, `explosives`, `pickaxe`, `steel_container`, `container`, `storage`, `spy`, `city.power` (from −50 to +50) and each new building's `count` / `on`;
  - an "Era 2" block in the contact sheet: the 5 buildings and their variants; every Era 1 building at tier 3 vs tier 4; every modifier off/on; the grid in surplus, deficit and at night; the new citizen layers.
- Regenerate `Evolve Sprite Kit (offline, single file).html`.

## ANIMATION TABLE

| Thing | Frames | Speed |
|---|---|---|
| Tesla arcs | 3 (`fx_spark`) in an irregular loop | 8 fps, bursts |
| Gantry trolley | code | 1 trip / 8-12 s |
| Crane jib | 4 positions | 1 move / 6-10 s |
| Conveyor | code | 6 fps |
| Converter tip | 2 + sparks | once / 15-25 s |
| Blast | 1 flash + particles | once / 20-40 s |
| Boiler glow | palette shift | 3 fps |
| Jackhammer | code ±1 px | 12 fps |
| Radio light | 2 | 1 Hz, night only |
| Drill routine | code | 6 fps |
| Tier 3 → 4 | existing cross-fade | unchanged |

## Batches

- **Lot 10 – tier 4**: new ramps, 3 textures, 6 modules, `tierOf()` → 4, `gambrel` and `sawtooth` roofs, the 30 % rule, the axe fix. Test: the existing village switches to tier 4.
- **Lot 11 – new buildings**: the 5 buildings and `H.truss`. First check the truss at ×1.
- **Lot 12 – power grid**: poles, `H.wire`, lit windows from `on / count`, deficit, night.
- **Lot 13 – modifiers**: the table in § 6, `H.conveyor`, rails, blasts, the remaining signatures.
- **Lot 14 – citizens and atelier**: the 5 layers, spy, drill, `fakeState`, atelier block, self-check, README, single-file build.

After each batch: say what is complete, the piece count, and anything you are unhappy with, and fix it.

## Quality

- **Readability**:
  - Everything reads when filled solid.
  - At ×1, a player can tell a crane from the radio mast and a barn from a shed, and sees at a glance whether a building is powered.
- **Same rules as the village**:
  - One light direction and one outline approach.
  - Tier 4 sits next to tiers 1-3 without looking pasted on.
  - No orphan pixels, no black outlines, no dithering.
- **Robustness**: deterministic, offline, never throws on missing fields, works when a save starts directly in this age.

## At the end

List:
- the new and changed files;
- the new piece counts by category and the grand total;
- the truss width you chose and why;
- the 3 weakest pieces;
- every assumption.
