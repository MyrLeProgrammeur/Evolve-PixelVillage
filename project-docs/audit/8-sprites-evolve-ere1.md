# Report 8 — List of the sprites for Evolve era 1

Date: 2026-10-13. Source: the `pmotschmann/Evolve` repository (MPL-2.0), cloned into the repo root, files `src/actions.js`, `src/tech.js`, `src/jobs.js`, `src/resources.js`. Nothing was executed. Unlock conditions are read from the code; the French-origin names and the sizes are proposals.

## Definition of era 1

**Era 1 = "Primitive + early Civilized"**, from the end of evolution (the race is chosen) up to just before gunpowder and the industrial era. In the code, these are the `primitive` era (5 techs: club, bone_tools, wooden_tools, sundial, wheel) and the part of the `civilized` era (115 techs) that unlocks ordinary buildings.

**Excluded from era 1** (to be handled in era 2 or never): everything that depends on a particular race or path (slaves, souls, torture, psychic, magic, pylons, cultists, graveyard, soul eater), as well as wonders, gunpowder, the casino, the harbor, the apartment and the tourist center. **Evolution** (cells → creature, 38 steps) is an optional, separate "era 0".

## Proposed style choices (to be validated)
- 2:1 isometric view, **32×16 px tile**. 1×1 buildings are 32 px wide, 2×2 buildings 64 px. Character 16×24, icon 16×16.
- Fixed 32-color palette, a single drawn direction (the other obtained by mirroring).
- **Evolve counts buildings, it does not place them.** The player has "40 farms", with no map. Automatic placement is therefore needed: 1 sprite per building up to a cap (for example 24 visible), then a "density" effect (heavier smoke, a neighboring construction site). Variants keep the village from being a field of clones.
- **Races**: era 1 is played with 1 starting species (human). Each additional race is an extra set of characters (+170 images). The other 4 species can be covered with palette recoloring.

## 1. Buildings (26 types)

| # | Building | Game key | Unlock | Variants | Animation frames | Footprint, size |
|---|---|---|---|---|---|---|
| 1 | Cabin (basic housing) | `basic_housing` | tech housing | 3 | 1 | 1×1, 32×40 |
| 2 | Cottage | `cottage` | tech cottage | 3 | 1 | 1×1, 32×44 |
| 3 | Lodge (hunting lodge) | `lodge` | hunting 2 + currency | 2 | 1 | 1×1, 32×40 |
| 4 | Smokehouse | `smokehouse` | tech smokehouse | 1 | 4 | 1×1, 32×36, smoke |
| 5 | Farm | `farm` | tech agriculture | 2 | 1 | 2×2, 64×40 |
| 6 | Compost Heap | `compost` | tech compost | 1 | 1 | 1×1, 32×24 |
| 7 | Grain Silo | `silo` | agriculture 3 | 1 | 1 | 1×1, 32×56 |
| 8 | Mill | `mill` | agriculture 4 | 1 | 4 | 1×1, 32×56, sails |
| 9 | Shed | `shed` | tech storage | 2 | 1 | 1×1, 32×32 |
| 10 | Freight Yard (depot) | `storage_yard` | tech containerization | 1 | 1 | 2×2, 64×40 |
| 11 | Lumber Yard | `lumber_yard` | tech stone_axe | 1 | 1 | 2×2, 64×36 |
| 12 | Sawmill | `sawmill` | tech iron_saw | 1 | 4 | 2×2, 64×44, blade |
| 13 | Rock Quarry | `rock_quarry` | tech mining | 1 | 1 | 2×2, 64×36 |
| 14 | Mine | `mine` | tech metal_working | 1 | 4 | 2×2, 64×44, mine cart |
| 15 | Coal Mine | `coal_mine` | tech coal_mining | 1 | 4 | 2×2, 64×44, dust |
| 16 | Foundry | `foundry` | tech foundry | 1 | 4 | 2×2, 64×48, fire |
| 17 | Smelter (blast furnace) | `smelter` | tech smelting | 1 | 4 | 2×2, 64×56, fire and smoke |
| 18 | Cement Plant | `cement_plant` | tech cement | 1 | 4 | 2×2, 64×48, smoke |
| 19 | Trade Post | `trade` | tech trade | 1 | 1 | 2×1, 64×40 |
| 20 | Bank | `bank` | tech banking | 1 | 1 | 2×1, 64×48 |
| 21 | Library | `library` | science 2 | 1 | 1 | 2×1, 64×48 |
| 22 | University | `university` | tech science | 1 | 1 | 2×2, 64×60 |
| 23 | Temple | `temple` | theology 2 | 1 | 1 | 2×2, 64×60 |
| 24 | Amphitheatre | `amphitheatre` | tech theatre | 1 | 1 | 2×2, 64×52 |
| 25 | Barracks | `garrison` | military 1 + housing 1 | 1 | 1 | 2×1, 64×44 |
| 26 | Hospital | `hospital` | tech hospital | 1 | 1 | 2×1, 64×48 |

Total: 26 types, 33 variants, **57 images** (variants × animation frames).

## 2. Scenery and terrain

| Element | Images | Note |
|---|---|---|
| Grass (tiles) | 4 | 4 variants, 32×16 |
| Dirt path, automatic joins | 16 | 16 pieces (autotile) |
| Packed earth / bare ground | 2 |  |
| Rocky ground (quarry) | 3 |  |
| Lake or river: edges + animated water | 20 | 16 joins + 4 water frames |
| Hill / mountain backdrop (for the mines) | 6 |  |
| Ore veins: copper, iron, coal | 6 | 3 types × 2 variants |
| Trees: pine 3, oak 3, dead 1, sapling 2, stump 2, felled trunk 1 | 12 |  |
| Bushes: full berries, empty berries, plain bush ×2 | 4 | "Gather Food" |
| Rocks: small 4, large 2 | 6 | "Gather Stone" |
| Tall grass and flowers | 4 |  |
| Farm fences, automatic joins | 6 |  |
| Start of game: campfire (4 frames), tent ×2, hide-drying rack | 7 |  |
| Sundial (4 shadow angles) | 4 | tech sundial, provides day and night |
| Sign, bridges, standing stone (scenery) | 4 | optional |

Total: **104 images**.

## 3. Characters and cart

| Game job (key) | Proposed name |
|---|---|
| `unemployed` | Unemployed |
| `hunter` | Hunter |
| `forager` | Forager |
| `farmer` | Farmer |
| `lumberjack` | Lumberjack |
| `quarry_worker` | Stonecutter |
| `miner` | Miner |
| `coal_miner` | Coal miner |
| `craftsman` | Craftsman |
| `cement_worker` | Cement worker |
| `banker` | Banker |
| `entertainer` | Entertainer |
| `priest` | Priest |
| `professor` | Professor |
| `scientist` | Scientist |
| `teamster` | Teamster |
| `soldier (garrison)` | Soldier |

Excluded for lack of a race or path: `scavenger`, `meditator`, `torturer`, `crystal_miner`, `raider`, `wizard`.

| Element | Images |
|---|---|
| Citizens: 17 jobs × 10 frames (idle 2, walk 4, work 4) | 170 |
| Cart (empty / loaded) × 4 frames | 8 |

Total: **178 images**.

## 4. Animals

| Animal | Images |
|---|---|
| Deer (idle 2, walk 4) | 6 |
| Rabbit (idle 2, hop 4) | 6 |
| Boar (idle 2, walk 4) | 6 |
| Birds (flight 4 + perched 1) | 5 |
| Jumping fish (4) | 4 |

Total: **27 images**.

## 5. Resources and objects

| Element | Images |
|---|---|
| 16×16 resource icons: food, wood, stone, furs, copper, iron, cement, coal, steel, silver, knowledge, population, morale, housing | 14 |
| Piles in the world, 3 fill levels: logs, stone, furs, grain sacks, copper, iron, coal, cement, steel ingots, coins, crates | 33 |
| Objects carried by citizens: log, stone, grain basket, ore basket, sack, tool | 6 |

Total: **53 images**.

## 6. Effects and weather

| Effect | Images |
|---|---|
| Construction scaffolding S / M / L | 3 |
| Construction dust | 6 |
| "Finished" sparks | 6 |
| Looping smoke | 6 |
| Forge fire | 4 |
| Jumping coin +1 | 6 |
| Click ripple | 4 |
| Tile highlight: valid / invalid / selected | 3 |
| "Research finished" light bulb | 6 |
| Anki reward chest: closed 1, opening 6, open 1 | 8 |
| Streak flame (small 4, large 4) | 8 |
| "Level" star burst | 6 |
| Rain 4, snow 4, clouds 3, lightning 3 | 14 |
| Sun 1, moon 4 phases | 5 |

Total: **85 images**.

## 7. Interface

| Element | Images |
|---|---|
| 9-slice panels (small, medium, large) | 3 |
| Buttons: 4 states (normal, hover, pressed, disabled) × 3 sizes | 12 |
| Tab icons (Civilization, Research, Resources, Market, Army, Trade, Settings, Anki) | 8 |
| Progress bars, fill and frame | 4 |
| Mouse cursors: normal, build, gather | 3 |
| Pixel font (one character sheet) | 1 |
| Close, checkbox, slider | 6 |

Total: **37 images**.

## Totals

| Category | Images |
|---|---|
| Buildings | 57 |
| Scenery and terrain | 104 |
| Characters and cart | 178 |
| Animals | 27 |
| Resources and objects | 53 |
| Effects and weather | 85 |
| Interface | 37 |
| **Era 1 total** | **541** |

## Recommended production order
1. Terrain and grass, path, trees, rocks, sundial.
2. The first 6 buildings: cabin, cottage, farm, lumber yard, rock quarry, shed.
3. 3 jobs: unemployed, lumberjack, farmer, with walking and working.
4. Resource icons, scaffolding, sparks, jumping coin.
5. Minimal interface (panels, buttons, font).
6. The rest of the buildings, in unlock order.

At this stage, 25 to 30% of the images are enough for a first playable diorama.

## What is not verified
- The names in parentheses and the proposed names are my own translations from the original French; the English names come from `strings/strings.json`, except `basic_housing`, `cottage`, `apartment`, `shed`, `mill`, `slave_market` and `windmill`, whose names the file does not give (I guessed).
- The unlock of each building is read from `reqs` (`src/actions.js`) and from the `grant` entries in `src/tech.js`, but I did not play the game to confirm the real order.
- The sizes and the number of images are my proposal, not a constraint of the game.
