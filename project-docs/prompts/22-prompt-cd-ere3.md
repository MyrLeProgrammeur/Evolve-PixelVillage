# COMPLETE PROMPT: add "Era 3 / Industrialization" to the existing Evolve village sprite kit (audited against the game source)

Work in THIS project. Extend the kit (`kit/*.js`, `atelier.html`); keep your style bible, palette mechanics, piece format, decoder, PRNG, iso shell/roof generator, bitmap font, particles, placement, anti-clone, scaffolding, tier cross-fade, power grid and API. Do not rebuild or restyle anything, including Era 2. Build, don't summarize. Deliver in the 5 batches at the end; finish all.

## Rules (unchanged, absolute)
Offline, plain ES2019 + Canvas 2D, no network, no Google service or font. Integer pixels, no smoothing, 1-bit transparency, rotations in multiples of 90. Every pixel from the palette; you may ADD up to 2 ramps (own family `era3` in `palette.js`), never edit existing ones. Seeded PRNG only. No placeholders. Same village, later in time: still bohemian, never a grey factory town.

## THE JOB IN ONE PARAGRAPH

After the discovery age you built (Era 2: brick-and-steel tier 4, power grid, cranes, Bessemer), **Evolve** industrializes: the factory, oil, titanium, freight trains. Era 2 already gave you almost every industrial tool (`H.truss`, `H.rails`, `H.wire`, `H.conveyor`, `sawtooth` and `gambrel` roofs, `tex_corrugated`, `tex_rivetplate`, `tex_glasspane`, the `clinker` and `zinc` ramps, `door_works`, `win_tall`, `sig_pipe_valve`, `unit_container`, `fx_spark`). So this age is small:
1. **5 new buildings**, led by the **factory** (the hero building of the age) and an **oil field**;
2. a **railway with a freight train**: the one new system, and the one new family of art (**vehicles**);
3. an **industrial zone** at the map edge, so the bohemian centre stays intact;
4. **state-driven modifiers** on existing buildings;
5. **no new material tier**: tier 4 "brick and steel" stays the top tier in this age.

About **23 new hand-drawn pieces** (25 images). Everything else is composed by code from pieces you already have.

---

## STYLE: KEEP YOUR OWN BIBLE

Re-apply, unchanged, the style bible you wrote for the village and kept for Era 2:

- **Mood:** sun-faded textiles on earthy timber; earth neutrals carry most pixels; dyed accents only where a person would have added them.
- **Light:** from the upper left everywhere; lit planes toward the viewer and left; right sides one tone darker; cast shadows to the lower right as a flat patch one ground tone darker.
- **Ramps:** five tones, hue-shifted; pieces paint with tones 1-4; tone 5 is for generated shading.
- **Outline:** coloured selective outline, no black lines; ink reserved for voids, eyes, doorways.
- **Shading:** flat clustered planes, 2-3 tones per surface; no dithering, no pillow shading, no speckle.
- **Proportion:** chunky and squat; strict 2:1 lines for anything on the ground.

**The only extra direction for this age: the railway and the factory belong to the village's people.** Wagons are painted by hand, slightly mismatched, with chalk marks and a patched tarp; the locomotive has a polished brass band and a name plate; the factory has a painted sign on its brick, flower boxes in the office window and a cat on the water tower. Oil is the one dirty thing: dark puddles around the derricks, kept inside the industrial zone. Smoke stays soft and drifting, never a black sky. You choose every tone, including those of the new ramp.

---

## Game data (`window.evolve.global`, a deep copy read once per second)

Every field below has been checked in the game source. Any of them may be ABSENT: treat a missing tech level as 0, read defensively, and never throw.

- **Tech levels** (`tech.<key>`, integer). This age is driven by:
  - `high_tech` 3 (industrialization: the factory and titanium appear);
  - `oil` 1 (derrick), 2 (fuel depot), 3 (oil powerplant), 4 (titanium drills);
  - `wharf` 1;
  - `storage` 4 (the barn becomes a warehouse; in-game names "Shed" → "Barn" → "Warehouse");
  - `trade` 3 ("Freight Trains": each freight yard adds a trade route);
  - `steel_container` 3 (alloy containers);
  - `smelting` 5 (oxygen converter);
  - `titanium` 1 (smelters also make titanium);
  - `cement` 4 (Portland cement);
  - `copper` 1 (rotary kiln: more copper from miners);
  - `explosives` 3 (ANFO);
  - `military` 4 (machine gun);
  - `science` 7 (Tesla coil upgrade of Wardenclyffe);
  - `axe` 5, `hammer` 4, `hoe` 4 (titanium tools).
- **New buildings**:
  - `city.factory = { count, on, Lux, Furs, Alloy, Polymer, Nano, Stanene }`. `on` = powered copies. The other fields are the number of factories assigned to each production line. **In this age only `Lux` (luxury goods) and `Alloy` matter**; ignore the others.
  - `city.oil_well = { count }`, `city.oil_depot = { count }`, `city.wharf = { count }`.
  - `city.oil_power = { count, on }`.
- **Power** (your Era 2 grid): `factory` becomes a **consumer**, `oil_power` a **producer** alongside `coal_power`. Today `era2.js` hardcodes `CONSUMER = { apartment, wardenclyffe }` and takes sources with `type === 'coal_power'`; turn both into extendable sets through a small hook, and register the new types from `era3.js`.
- **Do NOT draw or react to**:
  - `tech.transport`, `teamster`, `osha`, `blackmarket`, `combustion_engine`: single-trait content (`gravity_well`);
  - `transmitter`, `magocracy`, `pylon_camouflage`, `fake_tech`, `executions`, `reclaimer` / `titanium_shovel`: race, magic or `evil` content;
  - the `Furs`, `Polymer`, `Nano`, `Stanene` factory lines, and anything gated by `high_tech >= 4` (electronics, casino, TV, wind turbines, assembly line, uranium): later eras.
- `GOV_COL` in `citizens.js` already has `corpocracy` and `technocracy`: nothing to add for governments.

---

## 1. No new material tier

`tierOf()` stays at 4 max. Do not add a tier 5; concrete and glass come in a later age. The 30 % rule on old dwellings is unchanged.

## 2. New hand-drawn pieces (23 pieces, 25 images; same text-grid format, new file `kit/pieces_b11.js`)

- **Modules (3):**
  - `door_roller`: roller shutter door, one bay. The code shows it open or closed by shifting it; keep a dark interior slot.
  - `dock_edge`: one bay of a loading-dock edge with timber bumpers.
  - `ladder_cage`: one bay of a caged ladder, for tanks, chimneys and the water tower.
- **Signatures (8 pieces, 10 images):**
  - `sig_pumpjack`: "horse-head" oil pump, **3 images** (beam up, level, down); the code plays 0-1-2-1.
  - `sig_derrick_crown`: crown block at the top of the derrick (the tower itself is an `H.truss`).
  - `sig_flare_tip`: flare stack tip; its flame is your existing `fx_fire_0..3`.
  - `sig_kiln_drum`: riding rings and drive gear of a rotary kiln (the tube is code, § 3).
  - `sig_water_tower`: a small water tower on legs, for the factory roof and the freight yard.
  - `sig_o2_rack`: a rack of oxygen bottles.
  - `sig_mg_nest`: sandbag ring with a machine gun on a tripod and the gunner's helmet showing.
  - `sig_buffer_stop`: railway buffer stop.
- **Vehicles (8), a new category `vehicle`:**
  - `veh_loco`: small steam locomotive with tender, **2 views** (front visible, rear visible); mirroring gives the other two directions.
  - `veh_wagon_flat`: flat wagon that carries one `unit_container`.
  - `veh_wagon_tank`: oil tank wagon.
  - `veh_wagon_hopper`: open hopper for coal or ore (the load is a recoloured heap).
  - `veh_wagon_box`: covered boxcar; its body is recoloured by seed with existing dyed ramps.
  - `veh_barge`: small steam barge, **2 views**, at most 2 tiles long: it must fit the pond (§ 6).

  A wagon is symmetric front to back: 1 view plus the mirror covers all 4 directions. Vehicles travel only along the two iso axes.
- **Citizen layer (1):** `hat_helmet`, a steel helmet for soldiers from `military >= 4`. It is drawn over whatever head gear `metals()` currently gives.
- **Icons and units (3):**
  - `ic_oil`: a black drop on a barrel;
  - `ic_lux`: a patterned roll of cloth (luxury goods);
  - `unit_barrel`: one oil barrel, stacked (3 levels), carried or rolled by a citizen (existing `carry` option), stored at the depot and on the pier.

  Titanium and alloy are NOT new icons: recolour `ic_ingot` / `unit_ingot` (the new `titanium` ramp; `bronze` for alloy). ANFO sacks are recoloured `unit_sack`; luxury crates are recoloured `unit_crate`.

**New ramp (1):** `titanium`, a very light, cold blue-grey, clearly distinct from `zinc` and `steel`. You may add one more ramp if the oil needs it.

## 3. New code helpers (no art)

- `H.tank(p, c, r, h, ramp)`: a vertical cylinder in `tex_rivetplate`, low conical roof, `ladder_cage` up the side. Used by the fuel depot, the oil powerplant and the parked tank wagon's refill stand.
- `H.kiln(p, a, b, r)`: an inclined tube between two points; a shadow band slides 1 px every 300 ms to show rotation; `sig_kiln_drum` at two thirds of its length.
- `H.train(...)` plus a scheduler: one locomotive and 3 to 5 wagons following the rail line (§ 5).
- Extend `H.rails` (today used inside a building footprint, `era2.js:108`) so it can follow a line in map tile space, with **level crossings** where it meets a path (rails interrupted, planks between them) and a short **plate-girder bridge** if it crosses the stream.

## 4. New buildings (5)

Compose them all from boxes, existing pieces and the new pieces. They follow the existing count → visible-sprite placement, density and anti-clone rules. Choose sensible per-type visible caps. The factory, derricks, fuel depot and oil powerplant are placed in the **industrial zone** (§ 5.2); the wharf on the pond bank (§ 6).

| Key | Footprint, size | Composition | Variants and animation |
|---|---|---|---|
| `factory` | 3×2, ~96×72 | **The hero building.** Tier-4 brick (`clinker`), `sawtooth` roof with `tex_glasspane` teeth, 2 tall chimneys, `door_roller` × 2 on a `dock_edge`, `sig_water_tower` on the roof, painted sign, small office wing with flower boxes | **3 states**, see the table below; powered or not by `on / count` like your Era 2 consumers |
| `oil_well` | 1×1, ~32×56 | tapered `H.truss` tower (4 px wide at the foot, 1 px at the top), `sig_derrick_crown`, `sig_pumpjack` at the foot, dark puddle | pumpjack cycle; grouped as an **oil field** of 2 to 5 visible derricks according to `count`; with `oil >= 4`: one `sig_flare_tip` with flame in the field |
| `oil_depot` | 2×1, ~64×40 | 1 `H.tank`, 2 when `count >= 3`; `sig_pipe_valve`; low wall; stacked `unit_barrel` | static, valve glint |
| `oil_power` | 2×2, ~64×60 | your `coal_power` hall, one `H.tank` beside it, `sig_flare_tip` with flame instead of the coal heap | smoke, flare flicker; it feeds the grid |
| `wharf` | 2×1 on the bank, ~64×40 | timber pier (`tex_planks`) on posts over the water, 2-px bollards, stacked `unit_barrel` and `unit_crate` | `veh_barge` moored, or arriving and leaving; 2 dockers (existing citizens with the `carry` option) carrying barrels and crates between the pier and a cart |

**Factory states:**

| State | Condition | Look |
|---|---|---|
| Luxury | `city.factory.Lux > 0` and powered | doors open, light smoke, colourful cloth rolls (`ic_lux` colours) and `unit_crate`s on the dock |
| Alloy | `city.factory.Alloy > 0` and powered | doors open, warm casting glow in the doorway, `unit_ingot` in `bronze` stacked on the dock, darker smoke |
| Idle | no line, or no power | doors closed, no smoke |

With several factories and both lines active, split the visible factories between the two looks in proportion, stable by seed.

## 5. Railway and industrial zone

### 5.1 Railway and freight train (the system of the age)
1. **When**: nothing below `high_tech` 3. From `high_tech >= 3`, the line exists and a train runs. From `trade >= 3`, the freight yard gets a siding.
2. **Route**: one straight line along an iso axis, near one map edge, passing in front of the visible `storage_yard` (in-game name "Freight Yard"). It must not cut through the plaza, the pond or building slots. Level crossings where it meets paths; a short bridge if it crosses the stream. Re-place decor that would sit on the track. You choose the edge; check it fits the 24×24 map with its forest border.
3. **Train**: a locomotive and 3 to 5 wagons, one pass every 45 to 120 s (seeded), crossing the whole line at a steady pace; it slows and stops briefly at the freight yard. Wagon types are drawn by state: tank if `oil >= 1`, flat with container if `steel_container >= 1`, hopper if a `mine` or `coal_mine` exists, boxcar always possible.
4. **Steam**: puffs when starting and stopping, a thin trail while moving (existing particles).
5. **Siding** (`trade >= 3`): a short track along the freight yard, `sig_buffer_stop` at its end, 2 parked wagons, `sig_water_tower` beside it.

### 5.2 Industrial zone
- A band along the map edge on the railway side, about 10 % of the buildable area. It receives `factory`, `oil_well`, `oil_depot`, `oil_power`, and also `coal_power` if room is left.
- The bohemian centre (dwellings, plaza, temple, market) never gets industrial buildings.
- The Era 2 grid now also runs poles into the zone.

## 6. The pond and the wharf

The village already has water: a pond centred near tile (18.5, 19.2), about 5 tiles across, with a stream coming in from the map edge and one flowing out (`kit/spritekit.js`, tile type 4). The wharf goes on the pond bank, built out over the water; give it a dedicated slot there. Do not widen the water. The barge must fit the pond with room to turn; if 2 tiles is too long at ×1, shorten it.

## 7. Modifiers on existing buildings

| Condition | Building | Effect |
|---|---|---|
| `storage >= 4` | `shed` (barn since Era 2) | becomes a **warehouse**: long tier-4 box, low-pitch `tex_corrugated` roof, `door_roller` × 3 on a `dock_edge` |
| `trade >= 3` | `storage_yard` | the siding of § 5.1 |
| `steel_container >= 3` | `warehouse` (Container Port) | `bronze` alloy containers join the colour draw |
| `smelting >= 5` | `smelter` | `sig_o2_rack` with a pipe (`sig_pipe_valve`) to the converter; the converter flame turns whiter |
| `titanium >= 1` | `smelter` | a small stack of `titanium` ingots on its heap |
| `cement >= 4` | `cement_plant` | `H.kiln` plus a tall silo (existing cylinder) |
| `copper >= 1` | `mine` | a short `H.kiln` beside the ore heap |
| `explosives >= 3` | `rock_quarry`, `mine`, `coal_mine` | ANFO sacks (recoloured `unit_sack`) beside the TNT crate; blasts 1.5× bigger |
| `military >= 4` | `garrison` | `sig_mg_nest` in front |
| `military >= 4` | soldiers | `hat_helmet` |
| `science >= 7` | `wardenclyffe` | **no new drawing**: arcs more frequent and longer |
| `axe >= 5`, `hammer >= 4`, `hoe >= 4` | citizens | that tool turns `titanium`. In `metals()`, extend the axe clamp to 5 and add a titanium step to the hammer and hoe; the pickaxe is unchanged |
| `high_tech >= 3` | dockers, rail workers | existing `hat_flatcap` and `cloth_overalls` |

## 8. Files, API, atelier

- **New files**: `kit/pieces_b11.js`, `kit/era3.js`. Register `era3.js` through the same `SK._ext` hook as `era2.js`. It loads last, after `kit/era2.js`.
- **Hooks**: small hooks are allowed in `palette.js`, `spritekit.js`, `village*.js`, `citizens.js`, `world.js`, `ui.js` and `era2.js` (the grid sets, the placement zone).
- **API**: unchanged. `fakeState()` gains the Era 3 tech keys, the 5 buildings with their fields (factory lines included).
- **Docs and checks**: update `isReady()`, the self-check and `README.md`, including the exact load order.
- **Atelier**: a new page `Era 3 - Industrialization.html`, like your Era 0/1/2 pages, plus the main atelier:
  - the new ramp;
  - the new categories, `vehicle` included;
  - simulator sliders for `high_tech`, `oil`, `trade`, `storage`, `steel_container`, `smelting`, `cement`, `explosives`, `military`, `science`, `axe`, `hammer`, `hoe`, each new building's `count` / `on`, and a factory line selector (none / Lux / Alloy / both);
  - an "Era 3" block in the contact sheet: the 5 buildings and their variants, the factory in its 3 states, the oil field from 1 to 5 derricks, every vehicle in every direction, a train passing and stopped at the siding, every modifier off/on, the industrial zone seen whole, the wharf with the barge moored and moving.
- Regenerate `Evolve Sprite Kit (offline, single file).html`.

## ANIMATION TABLE

| Thing | Frames | Speed |
|---|---|---|
| Pumpjack | 3 (cycle 0-1-2-1) | 4 fps; derricks out of phase by seed |
| Flare flame | existing `fx_fire_0..3` | 8 fps |
| Train | code | one pass / 45-120 s; stop at the freight yard 3-5 s |
| Steam | particles | puffs at start and stop |
| Rotary kiln | shadow band | 1 px / 300 ms |
| Factory doors | open / closed | on state change only |
| Casting glow | palette shift | 3 fps |
| Barge | code | docks, waits 10-20 s, leaves; one cycle / 60-90 s |
| Dockers | code | existing walk with `carry` |
| Tesla arcs at `science >= 7` | existing | twice as often, longer |

## Batches

- **Lot 15 – oil**: `H.tank`, derrick and oil field, `sig_pumpjack`, `sig_derrick_crown`, `sig_flare_tip`, fuel depot, oil powerplant, the producer/consumer hook in the grid. **First, before anything else in this lot: put one `veh_loco` and two wagons on a short track at ×1 next to a tier-3 house, and check the scale reads.** Adjust the vehicle sizes before drawing the rest.
- **Lot 16 – factory**: the hero building, its 3 states, `door_roller`, `dock_edge`, `ladder_cage`, `sig_water_tower`, `ic_lux`.
- **Lot 17 – railway**: map-scale rails, level crossings, bridge, all vehicles but the barge, the scheduler, the siding with `sig_buffer_stop`, the industrial zone placement.
- **Lot 18 – wharf**: the pier slot on the pond, `veh_barge`, dockers, `unit_barrel`, `ic_oil`.
- **Lot 19 – modifiers, citizens, atelier**: the table in § 7, `H.kiln`, `sig_o2_rack`, `sig_mg_nest`, `hat_helmet`, the `titanium` ramp and tools, `fakeState`, the Era 3 page and atelier block, self-check, README, single-file build.

After each batch: say what is complete, the piece count, and anything you are unhappy with, and fix it.

## Quality

- **Readability**:
  - Everything reads when filled solid.
  - At ×1, a player can tell a tank wagon from a boxcar, a derrick from the radio mast, and a working factory from an idle one.
  - The train is the liveliest thing in the scene; it must not hide buildings for long.
- **Same rules as the village**:
  - One light direction and one outline approach.
  - The industrial zone sits next to the bohemian centre without looking pasted on.
  - No orphan pixels, no black outlines, no dithering.
- **Robustness**: deterministic, offline, never throws on missing fields, works when a save starts directly in this age.

## At the end

List:
- the new and changed files;
- the new piece counts by category and the grand total;
- the vehicle sizes you settled on after the ×1 test, and why;
- the map edge you chose for the railway and the industrial zone;
- the 3 weakest pieces;
- every assumption.
