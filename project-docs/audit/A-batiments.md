# Audit A — Evolve Era 1 buildings

Date: 2026-10-15. Read-only: no kit or game file modified, game not executed.
Sources: `src/actions.js` (abbreviated `A:`), `tech.js` (`T:`), `races.js` (`R:`), `main.js` (`M:`), `vars.js` (`V:`), `functions.js`, `strings/strings.json`, and on the kit side `kit/spritekit.js` (`SK:`), `kit/village.js` (`VL:`), `kit/village_b3.js` (`B3:`), `kit/village_b4.js` (`B4:`).
Convention: "human" = species `human`, standard path, no scenario (species traits: `creative`, `diverse` + genus `humanoid`: `adaptable`, `wasteful`; `R:5015-5034`, `R:86-92`). No `carnivore`, `herbivore`, `detritivore`, `soul_eater`, `evil`, etc. trait.

## 1. Summary in numbers

| Measure | Value |
|---|---|
| Entries of the `city` block (A:929-4211) | **69** (60 written as objects + 9 produced by `buildTemplate`: horseshoe, bonfire, firework, s_alter, captive_housing, assembly, nanite_factory, shrine, meditation; A:1347-1349, 1374, 1727, 1960, 2842, 3470-3471) |
| COVERED (exact key among the kit's 26) | **26** (all 26 keys do exist in `actions.city`; 23 are reachable by a human, 3 are not: lodge, smokehouse, compost) |
| COVERED BY MERGE | **3** (gather buttons `food`, `lumber`, `stone`: represented by the bush / tree / rock scenery, acceptable because they are not constructions) |
| MISSING (human, Era 1) | **1**: `metal_refinery` |
| OUT OF SCOPE | **39** (later era: 21; race/trait: 14; calendar event: 3; magic universe: 1; see the breakdown under the table) |
| Other blocks (arpa, genes, blood, space, interstellar, galaxy, starDock, evolution, tech) | all out of scope for the Era 1 village (section 5) |

Main finding: apart from the metal refinery, the kit covers everything a human can build before the `discovery` era. The real problems are elsewhere:
1. Three "covered" buildings (lodge, smokehouse, compost) do not exist for a human: report 8 wrongly classified them as human.
2. The kit reads `city.<key>.on` with the wrong semantics for 5 types in Era 1: sawmill, mine, coal_mine and cement_plant will stay frozen/switched off, and so will the mill (section 7). This is the most serious point for rendering.

## 2. Definition of Era 1 verified in the code

- The 120 techs `primitive` (5) + `civilized` (115) come before the `discovery` era. The first building gated by `discovery` is `apartment` (`housing: 3` = tech `apartment`, `T:347-350`, which requires `high_tech: 2` = electricity). Other `discovery` entries: `boot_camp` (T:7438), `warehouse` (`steel_containers`, T:2693), `wardenclyffe` (`mad_science`, T:4785), `coal_power` (`electricity`), `slave_market` (T:7246), `conceal_ward` (T:11542).
- **Gunpowder cuts off no building**: no `city` entry has `explosives` in its `reqs`. `black_powder` (T:7942) has `mining: 4` as prerequisite, the same as `coal_mine` (A:3012). So the "before gunpowder" boundary makes no sense for buildings: the real boundary is the `discovery` era (electricity). I recommend "Era 1 = all of `primitive` + `civilized`".
- Consequence: everything that is `civilized` and accessible to a human is in scope, including `metal_refinery` (tech `bayer_process`, T:1987, `reqs: { smelting: 2 }`, `civilized` epoch) and `hospital` (which depends on it, see below).
- Method for classifying the era: for each `reqs` key, the tech at the lowest level >= the required one, taking the latest. (throwaway script, not kept). The result is carried over into the "Era" column.

## 3. The kit's 26 buildings, one by one

Kit list: `SK:145-157`. The kit only draws these keys: `VL:84` iterates over `X().BUILDINGS`, so any key absent from this list is ignored even if `city.<key>.count > 0`.

| # | Kit key | Exists in `actions.city` | EN name (strings.json) | Reqs | Reachable by a human? |
|---|---|---|---|---|---|
| 1 | basic_housing | yes A:1375 | Cabin (`city_basic_housing_title`) | `housing: 1` | yes |
| 2 | cottage | yes A:1429 | Cottage (`city_cottage_title1`) | `housing: 2` | yes |
| 3 | lodge | yes A:1543 | Lodge (`city_lodge`) | `housing:1, currency:1` + condition A:1550-1552 | **no** (see 3.1) |
| 4 | smokehouse | yes A:1587 | Smokehouse (`city_smokehouse`) | `hunting: 1` | **no** (see 3.1) |
| 5 | farm | yes A:1728 | Farm (`city_farm`) | `agriculture: 1` | yes |
| 6 | compost | yes A:1787 | Compost Heap (`city_compost_heap`) | `compost: 1` | **no** (T:1060, `trait: ['detritivore']`) |
| 7 | silo | yes A:1928 | Grain Silo (`city_silo`) | `agriculture: 3` | yes |
| 8 | mill | yes A:1837 | Mill (`city_mill_title1`), renamed Windmill if `agriculture >= 5` (A:1839-1841) | `agriculture: 4` | yes |
| 9 | shed | yes A:2104 | Shed (`city_shed_title1`) | `storage: 1` | yes |
| 10 | storage_yard | yes A:2239 | Freight Yard (`city_storage_yard`) | `container: 1` | yes |
| 11 | lumber_yard | yes A:2506 | Lumber Yard (`city_lumber_yard`) | `axe: 1` | yes |
| 12 | sawmill | yes A:2546 | Sawmill (`city_sawmill`) | `saw: 1` | yes |
| 13 | rock_quarry | yes A:2592 | Rock Quarry (`city_rock_quarry`) | `mining: 1` | yes |
| 14 | mine | yes A:2960 | Mine (`city_mine`) | `mining: 2` | yes |
| 15 | coal_mine | yes A:3007 | Coal Mine (`city_coal_mine`) | `mining: 4` | yes |
| 16 | foundry | yes A:2714 | Foundry (`city_foundry`) | `foundry: 1` | yes |
| 17 | smelter | yes A:2843 | Smelter (`city_smelter`) | `smelting: 1` | yes |
| 18 | cement_plant | yes A:2667 | Cement Plant (`city_cement_plant`) | `cement: 1`, `not_trait flier` | yes |
| 19 | trade | yes A:3147 | Trade Post (`city_trade`) | `trade: 1` | yes (the `trade` tech T:3469 excludes `terrifying`) |
| 20 | bank | yes A:2352 | Bank (`city_bank`) | `banking: 1` | yes |
| 21 | library | yes A:3748 | Library (`city_library`) | `science: 2` | yes |
| 22 | university | yes A:3643 | University (`city_university`) | `science: 1` | yes |
| 23 | temple | yes A:3379 | Temple (`city_temple`) | `theology: 2` | yes |
| 24 | amphitheatre | yes A:3285 | Amphitheatre (`city_amphitheatre`) | `theatre: 1`, `not_trait joyless` | yes |
| 25 | garrison | yes A:1961 | Barracks (`city_garrison`) | `military:1, housing:1` | yes |
| 26 | hospital | yes A:2021 | Hospital (`city_hospital`) | `medic: 1` (tech `hospital` T:7397 requires `military:1, alumina:1`) | yes (not for `artifical`, A:2027) |

All 26 kit keys exist under this exact name in the code (verified by extracting the keys of A:929-4211). Report 8 said it had not found the names of `basic_housing`, `cottage`, `apartment`, `shed`, `mill`, `windmill` in `strings.json`: they are there (`city_basic_housing_title` = Cabin, `city_cottage_title1` = Cottage, `city_apartment_title1` = Apartment, `city_shed_title1` = Shed, `city_mill_title1` = Mill, `city_mill_title2` = Windmill). Only `slave_market` (composite title `city_slaver_market` = "%0 Market") has no fixed name.

### 3.1 Lodge and smokehouse do not exist for a human (report 8 was wrong)

- Tech `smokehouse` (T:964-990): `trait: ['carnivore']`; `not_trait: ['cataclysm','artifical','soul_eater','herbivore','lone_survivor']`. The test (`checkTechQualifications`, A:5909-5948) requires `global.race[trait]` to be true: a human does not have it, so `hunting` is never granted.
- Building `lodge`: `condition()` (A:1550-1552) = `(soul_eater || detritivore || artifical || unfathomable || forager) && tech.s_lodge`, OR `tech.hunting >= 2`. A human has neither; the `alt_lodge` tech (T:1013-1030) requires the same traits.
- Conversely, these races do not have the farm/silo: tech `agriculture` (T:1142-1152) `condition()` = herbivore OR (neither carnivore, nor detritivore, nor soul_eater) and `not_trait forager/unfathomable/artifical`. The pairs are swapped through `checkAltPurgatory` (R:6802-6814): farm<->lodge (T:1160, 1007), silo<->smokehouse (T:980, 1219), mill<->windmill (T:1239, 1301).
- So the kit does draw lodge/smokehouse/compost, but for carnivorous/detritivorous races. For the human, `global.city.lodge`, `.smokehouse`, `.compost` do not exist and will never produce a sprite.

## 4. Full table of the `city` block (69 rows)

Classification legend: C = COVERED, F = COVERED BY MERGE, M = MISSING, H = OUT OF SCOPE. "count/on": `count` = number built; `on` = enabled field (switch or power), see `struct().d`. "Human": should it appear in the Era 1 human village?

| # | Key | EN name | A:line | Appearance condition | Era | Effect (1 line) | count / on | Human Era 1 | Class |
|---|---|---|---|---|---|---|---|---|---|
| 1 | gift | Holiday Gift | 930 | `primitive:1`, `not_tech santa`, condition = Christmas gift active (date) | event | Gives plasmids | `count()` function, no `on` | no (calendar event) | H event |
| 2 | food | Gather Food | 1086 | `primitive:1`; condition `!soul_eater` (A:1113); `not_trait artifical` | primitive | Button: +food | none | yes, via scenery (bush) | F (bush) |
| 3 | lumber | Gather Lumber | 1149 | `reqs {}`; `not_trait evil` | primitive | Button: +wood | none | yes, via scenery (trees, stump) | F (tree_*, stump) |
| 4 | stone | Gather Stone | 1202 | `primitive:2` | primitive | Button: +stone (amber if `sappy`) | none | yes, via scenery (rock) | F (rock_*) |
| 5 | chrysotile | Gather Chrysotile | 1253 | `primitive:2`, trait `smoldering` | primitive | Button: +chrysotile | none | no (race) | H race |
| 6 | slaughter | Slaughter the Weak | 1303 | `reqs {}`, trait `evil`, not `kindling_kindred/smoldering` | primitive | Button: kill for food/furs | none | no (race) | H race |
| 7 | horseshoe | Forge Horseshoe (`city_forge`/`city_craft`, `hoovedRename`) | 1347 (case A:4837) | `primitive:3`; condition `hooved` or April Fools 2023 event | primitive | Forges horseshoes (special resource) | none | no (race/event) | H race |
| 8 | bonfire | Bonfire Pyre | 1348 (case A:4586) | `primitive:3`; condition `eventActive('summer')`; `action()` returns `false` | primitive | Event pyre (thermite) | none | no (summer event) | H event |
| 9 | firework | Firework Factory | 1349 (case A:4615) | `mining:3`; fireworks event condition and `tech.cement` or flier | civilized | Fireworks factory, only 1 | `count` 0/1 | no (event) | H event |
| 10 | slave_market | Slave Market (`city_slaver_market`) | 1350 | `slaves:2`, trait `slaver`; `slaves:2` = tech `slave_market` | discovery | Slave market | `count` | no (race + era) | H era/race |
| 11 | s_alter | Sacrificial Altar | 1374 (case A:4902) | `mining:1`, trait `cannibalize` | civilized | Sacrificial altar (temporary bonuses) | `count`, + rage/regen/mind... fields | no (race) | H race |
| 12 | basic_housing | Cabin | 1375 | `housing:1` (tech `housing`, T:305) | civilized | +1 citizen | `count`; no `on` | yes | C |
| 13 | cottage | Cottage | 1429 | `housing:2` (tech `cottage`, T:325: `housing:1, cement:1, mining:3`) | civilized | +2 citizens (costs plywood, brick, wrought iron: requires the foundry) | `count` | yes | C |
| 14 | apartment | Apartment | 1480 | `housing:3` (tech `apartment` T:347, `high_tech:2` = electricity) | discovery | +citizens, consumes power | `count`, `on` | no (era 2) | H era |
| 15 | lodge | Lodge | 1543 | see 3.1 | civilized | +1 citizen (carnivores: fur bonus) | `count` | no (carnivore, etc.) | C (kit key, not human) |
| 16 | smokehouse | Smokehouse | 1587 | `hunting:1`; tech reserved to `carnivore` (T:964) | civilized | +100 food storage, preservation | `count` | no (carnivore) | C (kit key, not human) |
| 17 | soul_well | Soul Well | 1618 | `soul_eater:1`, tech `soul_well` T:1038 trait `soul_eater` | civilized | Soul well (food from souls) | `count` | no (race) | H race |
| 18 | slave_pen | Slave Pen (`city_slave_housing`) | 1658 | `slaves:1` (tech `slave_pens` T:7221), trait `slaver` | civilized | Pen for 4 slaves | `count` | no (race) | H race |
| 19 | transmitter | Transmitter | 1691 | `high_tech:4`, trait `artifical` | industrialized | Housing for synthetics, power | `count`, `on` | no | H era/race |
| 20 | captive_housing | Captive Housing | 1727 (case A:4770) | `unfathomable:1`, trait `unfathomable` | civilized | Houses livestock/captives | `count` + counters | no (race) | H race |
| 21 | farm | Farm | 1728 | `agriculture:1` (tech `agriculture` T:1142) | civilized | Food production, +1 citizen if tech `farm` (`farm_house` T:1166) | `count`; no `on` | yes | C |
| 22 | compost | Compost Heap | 1787 | `compost:1`; tech trait `detritivore` (T:1060) | civilized | Produces food (consumes wood) | `count`, `on` (switch, `on++` on construction A:1824) | no (detritivore) | C (kit key, not human) |
| 23 | mill | Mill / Windmill | 1837 | `agriculture:4` (T:1225, `mining:3`); `not_tech wind_plant` | civilized | Food bonus (+3% per mill, +5% if `agriculture >= 5`) | `count`, `on` (= mills diverted to power, see 7) | yes | C |
| 24 | windmill | Windmill | 1890 | `wind_plant:1` (tech `wind_plant` T:1283, `high_tech:4`) | globalized | Wind turbine (power), replaces `mill` | `count`, `on` | no (era) | H era |
| 25 | silo | Grain Silo | 1928 | `agriculture:3` (T:1205) | civilized | +500 food storage | `count` | yes | C |
| 26 | assembly | Assembly Plant | 1960 (case A:4647) | `reqs {}`, trait `artifical` | primitive | Assembles new citizens | `count` | no (race) | H race |
| 27 | garrison | Barracks (flier: Watch Tower) | 1961 | `military:1, housing:1` (tech `garrison` T:7332) | civilized | +2 soldiers of housing | `count`, `on` (switch, `on++` on construction A:1997) | yes | C |
| 28 | hospital | Hospital | 2021 | `medic:1` (tech `hospital` T:7397: `military:1, alumina:1`), `not_trait artifical`, cost: aluminium 10000 | civilized (late) | Heals soldiers, reduces diseases | `count` | yes (end of the era, after the refinery) | C |
| 29 | boot_camp | Boot Camp | 2057 | `boot_camp:1` (T:7438, `high_tech:1`) | discovery | Trains soldiers | `count` | no (era) | H era |
| 30 | shed | Shed (Barn if storage 3, Warehouse if 4) | 2104 | `storage:1` (tech `storage` T:2342) | civilized | Resource storage | `count` | yes | C |
| 31 | storage_yard | Freight Yard | 2239 | `container:1` (tech `containerization` T:2490) | civilized | Unlocks crates | `count` | yes | C |
| 32 | warehouse | Container Port | 2299 | `steel_container:1` (T:2693) | discovery | Steel containers | `count` | no (era) | H era |
| 33 | bank | Bank | 2352 | `banking:1` (T:3560) | civilized | +money capacity, +bankers | `count` | yes | C |
| 34 | pylon | Pylon | 2396 | `magic:2` (tech `ley_lines` T:11238, condition `universe === 'magic'`) | civilized | Generates mana | `count` | no (magic universe) | H universe |
| 35 | conceal_ward | Concealing Ward | 2437 | `roguemagic:3` (T:11542); magic universe + `witch_hunter` | discovery | Conceals the pylons | `count` | no | H universe/era |
| 36 | graveyard | Graveyard | 2467 | `reclaimer:1` (T:6485), trait `evil` | civilized | Equivalent of the Lumber Yard for `evil` races | `count` | no (race) | H race |
| 37 | lumber_yard | Lumber Yard | 2506 | `axe:1` (tech `stone_axe` T:6688; forbidden to `evil/kindling_kindred/smoldering`) | civilized | +2% wood, +100 storage | `count` | yes | C |
| 38 | sawmill | Sawmill | 2546 | `saw:1` (tech `iron_saw` T:6736: `axe:1, mining:3`) | civilized | +5% wood, +200 storage | `count`, `on` (power, see 7) | yes | C |
| 39 | rock_quarry | Rock Quarry (flier: Quarry) | 2592 | `mining:1` (T:1964), `not_trait sappy` | civilized | +stone, quarry workers | `count`, `on` (power, see 7) | yes | C |
| 40 | cement_plant | Cement Plant | 2667 | `cement:1` (T:8058), `not_trait flier` | civilized | Produces cement, 2 cement workers | `count`, `on` (power, see 7) | yes | C |
| 41 | foundry | Foundry | 2714 | `foundry:1` (T:1326, `mining:2`) | civilized | 1 craftsman, makes plywood, bricks, wrought iron... | `count`, `crafting`, counters per material | yes | C |
| 42 | factory | Factory | 2786 | `high_tech:3` (industrialization) | industrialized | Factory (power) | `count`, `on` | no (era) | H era |
| 43 | nanite_factory | Nanite Factory | 2842 (case A:4735) | `reqs {}`, trait `deconstructor` | primitive | Replaces the lumberjacks of `deconstructor` races | `count` | no (race) | H race |
| 44 | smelter | Smelter | 2843 | `smelting:1` (T:2031, `mining:3`) | civilized | Smelts iron (steel if `smelting >= 2`) | `count` + `cap`, `Wood`, `Coal`, `Iron`, `Steel`... | yes | C |
| 45 | **metal_refinery** | Metal Refinery | 2909 | `alumina:1` (tech `bayer_process` T:1987, `smelting:2`), `not_trait cataclysm/lone_survivor`; cost: money + steel | civilized | Produces aluminium (+ metal sheets at the foundry) | `count`, `on` (power only if `alumina >= 2`, A:2927) | **yes** | **M** |
| 46 | mine | Mine | 2960 | `mining:2` (tech `metal_working` T:2271) | civilized | Copper/iron miners | `count`, `on` (power, see 7) | yes | C |
| 47 | coal_mine | Coal Mine | 3007 | `mining:4` (tech `coal_mining` T:2318) | civilized | Coal miners | `count`, `on` (power, see 7) | yes | C |
| 48 | oil_well | Oil Derrick | 3053 | `oil:1` (T:6086, `high_tech:3`) | industrialized | Oil | `count`, `dead` | no (era) | H era |
| 49 | oil_depot | Fuel Depot | 3097 | `oil:2` | industrialized | Oil storage | `count` | no (era) | H era |
| 50 | trade | Trade Post | 3147 | `trade:1` (T:3469, `currency:2, military:1`, forbidden to `terrifying`) | civilized | +trade routes | `count` | yes | C |
| 51 | wharf | Wharf | 3189 | `wharf:1` (T:3539, `high_tech:3, oil:1`), `not_trait thalassophobia` | industrialized | Harbor | `count` | no (era) | H era |
| 52 | tourist_center | Tourist Center | 3235 | `monument:2` (tech `tourism`, era `early_space`) | early_space | Tourist income | `count`, `on` | no (era) | H era |
| 53 | amphitheatre | Amphitheatre (Stadium if governor `athleticism`) | 3285 | `theatre:1` (T:1670, `housing:1, currency:1, cement:1`), `not_trait joyless` | civilized | +entertainers, +morale | `count`, `evil` | yes | C |
| 54 | casino | Casino | 3339 | `gambling:1` (T:1846, `high_tech:4`) | globalized | Casino | `count`, `on` | no (era) | H era |
| 55 | temple | Temple (Propaganda Center if `evil` universe) | 3379 | `theology:2` (tech `theology` T:8345: `theology:1, housing:1, cement:1`; `theology:1` set at init, `resets.js:1283`) | civilized | +morale/faith, priests (`ancients` gene) | `count` | yes | C |
| 56 | wonder_lighthouse | Lighthouse of %0 | 3424 | `reqs {}`, trait `wish`, condition `wishStats` | — | Wish wonder | possible `count` | no (`wish` race) | H race |
| 57 | wonder_pyramid | Great Pyramid of %0 | 3447 | same | — | Wish wonder | same | no (`wish` race) | H race |
| 58 | shrine | Shrine | 3470 (case A:5011) | `theology:2`, trait `magnificent` | civilized | Bonus depending on season/moon | `count` | no (race) | H race |
| 59 | meditation | Meditation Chamber | 3471 (case A:5090) | `primitive:3`, trait `calm` (initialized by tech `sundial`, T:127) | primitive | Zen | `count` | no (race) | H race |
| 60 | banquet | Banquet Hall | 3472 | `banquet:1` (T:1627, era `intergalactic`), `endless_hunger` achievement condition | intergalactic | Tiered banquet | `level`, `on` | no | H era |
| 61 | university | University | 3643 | `science:1` (tech `science` T:4065) | civilized | +max knowledge, 1 professor | `count` | yes | C |
| 62 | library | Library | 3748 | `science:2` (tech `library` T:4085: `science:1, cement:1`) | civilized | +max knowledge (per inhabitant) | `count` | yes | C |
| 63 | wardenclyffe | Wardenclyffe | 3847 | `high_tech:1` (tech `mad_science` T:4785) | discovery | Tesla tower/laboratory, power | `count`, `on` | no (era) | H era |
| 64 | biolab | Bioscience Lab | 3947 | `genetics:1` (tech `bioscience` T:4617) | globalized | Genetics | `count`, `on` | no (era) | H era |
| 65 | coal_power | Coal Powerplant | 3999 | `high_tech:2` (electricity) | discovery | Coal power plant | `count`, `on` | no (era) | H era |
| 66 | oil_power | Oil Powerplant | 4058 | `oil:3` | industrialized | Oil power plant | `count`, `on` | no (era) | H era |
| 67 | fission_power | Fission Reactor | 4121 | `high_tech:5` | globalized | Reactor | `count`, `on` | no (era) | H era |
| 68 | mass_driver | Mass Driver | 4157 | `mass:1` (era `early_space`) | early_space | Mass driver | `count`, `on` | no (era) | H era |
| 69 | replicator | Matter Replicator | 4193 | `special_hack:1`, `wiki:false`; tech `matter_replicator` (T:4843) conditioned by the `adam_eve` achievement | discovery | "fake structure" | — | no | H era |

Count by class (verifiable in the table): C = 26 (including lodge, smokehouse, compost, which are not human); F = 3 (food, lumber, stone); M = 1 (metal_refinery); H = 39.
Breakdown of the 39 H, by main reason (each key counted once):
- **Later era (21)**: apartment, slave_market, transmitter, windmill, boot_camp, warehouse, conceal_ward, factory, oil_well, oil_depot, wharf, tourist_center, casino, banquet, wardenclyffe, biolab, coal_power, oil_power, fission_power, mass_driver, replicator (21 keys: conceal_ward, slave_market and transmitter are also tied to a race or a universe, classified here by their era).
- **Race / trait (14)**: chrysotile, slaughter, s_alter, soul_well, slave_pen, captive_housing, assembly, graveyard, nanite_factory, wonder_lighthouse, wonder_pyramid, shrine, meditation, horseshoe.
- **Calendar event (3)**: gift, bonfire, firework.
- **Universe (1)**: pylon.
Check: 21 + 14 + 3 + 1 = 39.

### 4.1 Note on merging the gather buttons

`food`, `lumber`, `stone` (and `chrysotile` for `smoldering`) are "Outskirts" buttons without `struct()`, hence without `count` (A:1086-1252). They are already represented by the kit's scenery (`bush`, `tree_pine`, `tree_broadleaf`, `stump`, `rock_small`, `rock_big`, `SK` scenery section of `COUVERTURE-KIT.md`). Acceptable: no building sprite is needed.

## 5. Other action blocks in the file

| Block | Line | Contents | Verdict |
|---|---|---|---|
| `evolution` | A:22-928 | 38 steps cell -> creature, species choice | "Era 0", excluded by report 8; no construction placed in the village |
| `tech` | A:4213 (`techList()`) | Research (`T:`); only some launch `initStruct(actions.city.X)` to create the `city.X` object (list in table 4, Condition column) | not buildings |
| `arpa` | A:4214, `arpa.js:37` | `lhc` (`high_tech:6`), `stock_exchange` (`banking:9`), `tp_depot` (`high_tech:6, storage:4`), `launch_facility` (`high_tech:7`), `monument` (`monument:1`), `railway` (`high_tech:6, trade:3`), `roid_eject`, `nexus`, `syphon` | all gated by `high_tech >= 6`, `banking:9`, etc.: outside Era 1 |
| `genes`, `blood` | A:4215-4216, `arpa.js:320, 1231` | Genes/blood (prestige) | prestige screen, not the village |
| `space`, `interstellar`, `galaxy`, `starDock` | A:4217-4219, 4219 | Space | outside Era 1 |
| Wonders | `wonder_lighthouse`, `wonder_pyramid` (A:3424, 3447) | Only trait `wish` (race) | out of scope for the human |

Crates/containers (`Crates`, `Containers`) are a resource built via the Freight Yard (A:2286, `unlockCrates()`), not a building: see doubt D4.

## 6. Buildings with variants or visual levels that the kit ignores

The kit has a single appearance per key (3 material tiers depending on `tech.cement`, `tech.axe`, see `VL:80`). In the code:

| Building | Variant(s) in the code | Trigger | In the human Era 1? | Ignored by the kit? |
|---|---|---|---|---|
| shed | Shed (storage 1-2), Barn (storage 3), Warehouse (storage 4): A:2106-2108 | `tech.storage` | only Shed (storage 2 = `reinforced_shed` T:2362, increased capacity, name unchanged); Barn = `barns` (discovery), Warehouse = `warehouse` (industrialized) | yes, but outside Era 1 |
| mill | Mill -> Windmill from `tech.agriculture >= 5` (A:1839-1841); `agriculture >= 6` adds the ON/OFF switch | `tech.agriculture` | Mill only (5 = tech `windmill` discovery) | not relevant to Era 1 |
| farm | Plain farm; with `tech.farm >= 1` (tech `farm_house` T:1166, **civilized, human**) the farm houses 1 citizen (A:1751, 1763-1766); `flair` text changes at `agriculture >= 7` | `tech.farm` | yes | yes: no "farm with house" sprite |
| foundry | `foundry` levels 1 to 4 in Era 1 (craftsmen, apprentices, carpentry: T:1346, 1365, 1384), crafting bonus +3% | `tech.foundry` | yes | yes (can stay moot: same sprite) |
| smelter | Fuel Wood / Coal, produces Iron / Steel (A:2866-2890); several furnaces per building (`cap`) | `tech.smelting >= 2` for steel | yes | partially: `metalOf` (`B3:469`) handles the metal; the number of lit furnaces (`Wood+Coal`) is not read |
| amphitheatre | Amphitheatre -> Stadium (governor with trait `athleticism`, A:3290-3293) | governor (tech `governor` T:3200, civilized) | possible | yes (name only) |
| temple | Temple -> Propaganda Center (`evil` universe outside theocracy, A:8283) | universe | no | out of scope |
| garrison | Barracks -> Watch Tower (`flier`, A:1963) | trait | no | out of scope |
| rock_quarry | Rock Quarry -> Quarry (`flier`, A:2594); asbestos (`smoldering`) | trait | no | out of scope |
| basic_housing / cottage / apartment | Names by species and genus (Hut, Den, Nest, Igloo, Tent, Villa, Stable, Grove... : A:8117-8230); "Shanty" if planet trait `trashed`; Mansion if governor `extravagant` | species / genus / planet | human: Cabin / Cottage | names only |
| All | Halloween renaming (`events_halloween_*`) for housing, farm, mine, coal_mine, lumberyard, sawmill, hospital, windmill, factory, storage_yard, temple, casino (A:8233-8286) | date (October) | yes, cosmetic | names only |
| smokehouse | Fondue Fountain (`hrt` wolven/vulpine, Easter) | cosmetic variant | no | no |
| cottage | "Cottage" = 2 citizens, + safe if `home_safe` (discovery) | tech | partially | no |

There is therefore **no** multi-level building in the human Era 1 in the "cottage/apartment" sense: `cottage` and `apartment` are two distinct keys; `apartment` is from the `discovery` era. The only plausible visual variant for Era 1 is `farm` + house (tech `farm_house`).

## 7. Trigger discrepancies: the `on` field (probable kit bugs)

The kit reads `city.<key>.on` for 7 types: `ON_TYPES = { compost, mill, garrison, sawmill, cement_plant, mine, coal_mine }` (`B3:467`) via `active()` (`B3:468`): active iff `on === undefined || on > 0`. What is actually written in the game in Era 1, with default settings:

| Type | What `on` is worth | Evidence | Effect on the kit |
|---|---|---|---|
| garrison | `on++` on each construction ("active" switch) | A:1997 | correct |
| compost | `on++` on construction; `main.js:3446`: `operating = compost.on` | A:1824 | correct (but not human) |
| **mill** | **stays at 0**: `powerOnNewStruct` is only called if `checkPowerRequirements` (A:1875-1877), but `power_reqs: { agriculture: 6 }` (A:1863). Moreover the semantics are **inverted**: `main.js:3593` computes `working = mill.count - mill.on` for the food bonus; `on` = mills diverted to power | A:1863-1877, M:3590-3595 | `active()` returns false for every mill in Era 1: **sails permanently frozen** (`DY.mill`, `B3:473`). Correct: `working = count - on > 0` |
| **sawmill, mine, coal_mine, cement_plant** | **stay at 0**: `powerCostMod(1 or 2)` > 0 hence `need_p`; `city.powered` is `false` and `city.power` is 0 before electricity (`V:1872-1875`); `can_p = powered() <= power` is false; `settings.alwaysPower` is `false` by default (`V:1532-1534`); `city.powered = true` is only set at tech `electricity` (T:4834). The sawmill's wood production does not need current (the current bonus is separate, M:5573-5575) | A:6993-7021, V:1872, M:5573 | `active()` returns false: **these four types are displayed stopped** (sails, wheel, smoke cut via `smokeIf`/`o.on === false` in `B4:73, 104, 170`) throughout Era 1. Correct: treat as active as long as `city.powered` is false |
| rock_quarry | `on` is never read by the kit | A:2658-2663 | nothing to fix |

Other readings: `DY.cement_plant = D(()=>{})` (`B4:405`) reuses `active`, so it is switched off. `SK:534` initializes the demo with `{count: 0, on: 0}` for all keys: the demo (`SK:535`) therefore shows no powered building.
Outside `on`: `VL:80` `tierOf` uses `tech.cement` and `tech.axe`. For races without `stone_axe` (`evil`, `kindling_kindred`, `smoldering`: T:6694) or without cement (`flier`: T:8058-8064), the tier never exceeds 1 or 2: normal but worth knowing.

## 8. Era 1 buildings under a different name or availability depending on traits (out of scope for the human, listed separately)

| Trait / condition | What changes | Ref. |
|---|---|---|
| `carnivore` | No agriculture: `lodge` + `smokehouse` replace `farm` + `silo` (swap `checkAltPurgatory`); no `mill` | T:964, 1142-1152; R:6802 |
| `herbivore` | `agriculture` yes, no `smokehouse` | T:964 |
| `detritivore` | `compost` + `lodge` (via `s_lodge`) instead of the farm | T:1060, 1013 |
| `soul_eater` | `soul_well`, no Gather Food button, `lodge` via `s_lodge` | A:1618, 1113 |
| `forager`, `unfathomable`, `artifical` | no agriculture, `lodge` via `s_lodge`; `unfathomable`: `captive_housing`, moon instead of sundial | T:1142, A:1727 |
| `artifical` | `assembly`, `transmitter`, no hospital nor food button | A:1960, 1691, 2027, 1112 |
| `kindling_kindred`, `smoldering` | no `lumber`, no `stone_axe` hence no `lumber_yard` nor `sawmill`; housing paid in stone / chrysotile; coal furnace; `smoldering`: `chrysotile`, quarry + asbestos | A:5843-5849, 1389-1391, 2863-2866, 1253, 2622; T:6694 |
| `evil` | no `lumber`, no `stone_axe`; `slaughter`, `graveyard` (equivalent of the lumber yard), tech `shovel`; Temple -> Propaganda Center (`evil` universe) | A:1303, 2467, 8283; T:6485 |
| `sappy` | no `rock_quarry`; Gather Stone becomes Gather Amber | A:2598, 1222 |
| `flier` | no `cement_plant` nor tech `cement` (requirement ignored); Barracks -> Watch Tower; Quarry | A:2673, 1963, 2594; T:8058-8064; A:5870-5875 |
| `terrifying` | no tech `trade` hence no `trade` post | T:3469 |
| `joyless` | no `amphitheatre` | A:3303 |
| `thalassophobia` | no `wharf` | A:3196 |
| `slaver` | `slave_pen`, `slave_market` | A:1658, 1350 |
| `hooved` | `horseshoe`; cost in horseshoes on each building | A:4837-4850 |
| `calm` | `meditation` | A:5090 |
| `magnificent` | `shrine` | A:5011 |
| `cannibalize` | `s_alter` | A:4902 |
| `wish` | wonders | A:3424, 3447 |
| `deconstructor` | `nanite_factory` (exists from the start, `reqs {}`) | A:4735 |
| `evil` (universe) / `magic` (universe) | Temple -> Propaganda Center, Amphitheatre -> Colosseum; `pylon`, `conceal_ward` | A:8283, 3287; T:11206-11238 |
| Scenarios (`cataclysm`, `lone_survivor`, `orbit_decay`, `warlord`) | Almost the whole `city` block has `not_trait: ['cataclysm','lone_survivor']`: these scenarios hide the buildings | A:1385 and passim |
| Path `truepath` | `checkCityRequirements` filters via an optional `path` field (A:5850); no `city` entry defines one (verified by grep A:929-4211) | A:5850 |

## 9. Missing items to add

### Priority 1: metal_refinery (the only missing human Era 1 item)

- **Key**: `metal_refinery`; **trigger**: `global.city.metal_refinery.count > 0` (the structure is created at tech `bayer_process`, T:1987-2000, `initStruct`). Material tier: like the others (`tech.cement >= 1` is already true at this stage).
- **Why it is a priority**: (a) `civilized`, reachable by a human; (b) the hospital (A:2032) costs 10000 aluminium (a resource that only this refinery produces): a player who has a hospital necessarily has a refinery (if `count > 0` and no sprite, the village will be inconsistent); (c) the kit declares 26 types but `VL:84` silently ignores everything else.
- **Proposed sprite**: **2 x 2 tile** footprint, height about **28 px** (between foundry 26 and smelter 34, to stay readable as a secondary industrial building). Low body in dark brick with a large cylindrical vat (leaching tank) on the right side, two pipes connected to a small reservoir; at the top, a short chimney thinner than the smelter's. Vat and fittings in light gray / cold silver to stand apart from the orange smelter: reuse the `unit_ingot` module (light aluminium ingots) stacked near the door, and `sig_hoist` (hoist) for the vat. A single animation tier (light smoke); no flame (unlike foundry/smelter).
- **Dynamics**: `DY.metal_refinery = D(...)` with `active()` treated as "lit" if `!city.powered` (see section 7: `on` is 0 there). Add the key to `BUILDINGS` (`SK:145`) with `['metal_refinery', 'Metal Refinery', 'industry', 2, 2, 28]`.

### Priority 2: farm-with-house variant (optional)

- `farm` when `tech.farm >= 1` (tech `farm_house`, civilized): the farm houses a citizen (A:1763-1766). Variant: add a small cottage (reuse the `basic_housing` modules) on the 2 x 2 plot. Height 18-20 px in a single corner. Trigger: `global.tech.farm >= 1`. Medium visual gain, no inconsistency if absent.

### Priority 3: only if the scope extends to other races (non-human)

| Key | Race | Proposed sprite (footprint, height) | Trigger |
|---|---|---|---|
| graveyard | `evil` | 2 x 2, ~14 px, stone enclosure with crosses/graves, 1 dead tree (`tree_dead`); analogue of the lumber_yard | `city.graveyard.count` |
| soul_well | `soul_eater` | 1 x 1, ~24 px, round well curb with a green glow | `city.soul_well.count` |
| slave_pen | `slaver` | 2 x 1, ~14 px, stake pen and gate | `city.slave_pen.count` |
| captive_housing | `unfathomable` | 1 x 1, ~20 px, wooden cage | `city.captive_housing.count` |
| meditation | `calm` | 1 x 1, ~20 px, small open pavilion | `city.meditation.count` |
| shrine | `magnificent` | 1 x 1, ~22 px, stone altar with a statue | `city.shrine.count` |
| s_alter | `cannibalize` | 1 x 1, ~16 px, stone table with a bowl | `city.s_alter.count` |
| assembly, nanite_factory, transmitter | `artifical`, `deconstructor` | 2 x 2, ~28 px, metal workshop | `count` |
| horseshoe | `hooved` | not a building (forge button), no sprite needed | — |

The events (gift, bonfire, firework) need nothing: a campfire (`fire_ring`) could serve as summer event scenery, but it is not necessary.

## 10. Doubts / not verified

- **D1: Era 1 boundary for hospital and metal_refinery.** In the code, `bayer_process` (T:1987) requires `smelting: 2` (steel, T:2057), which requires `mining: 4` (coal_mining): same rank as gunpowder (T:7942). They are therefore at the end of the `civilized` path, parallel to gunpowder. If "Era 1" must stop strictly before steel, then hospital and metal_refinery both leave the scope; otherwise both enter it. The kit chooses the second option for hospital: I therefore recommend putting the refinery there too.
- **D2: `hospital`**: cost of 10000 aluminium + 22000 money (A:2029-2032), enormous for a "beginner" Era 1. I did not simulate progression: the real acquisition order is not confirmed.
- **D3: `city.farm` for humans.** `checkAltPurgatory` (R:6802-6814) moves `farm`/`lodge` structures between `city` and `race.purgatory` when the species changes; I did not read `races.js:6892-6960` in detail, so I do not guarantee the exact state of `global.city.farm` right after the `agriculture` tech (initialization goes through `checkAltPurgatory` with `dv = struct().d`, T:1160).
- **D4: crates/containers.** `Crates` is a resource stacked in the Freight Yard (A:2286); the kit already has `unit_crate` and reads `Food/Lumber/Stone/Furs` to fill the Freight Yard (`B3:471`, `fill(...)`). I did not check whether `resource.Crates` would be a better fill signal.
- **D5: `smelter`.** I did not verify the meaning of `cap` and of the fuel counters (A:2879-2889, `industry.js:564-571`) as a lighting signal: the kit does not read `on` for the smelter and draws it lit if it exists.
- **D6: `sawmill` for `evil`.** `iron_saw` requires `axe: 1` (T:6736) and `stone_axe` is forbidden to `evil` (T:6694); I did not look for another source of `axe` for them. Probably no sawmill for `evil`, not confirmed.
- **D7: real state of `on` for sawmill & co.** Deduced from reading the code (`powerOnNewStruct`, A:6993-7021) and the initialization values (V:1872-1875). Not confirmed by execution (forbidden). Remains true unless the player enables the "Always Power" option (`settings.alwaysPower`).
- **D8: governor `athleticism` / `extravagant`.** I did not verify at what point in Era 1 a governor becomes available (tech `governor` T:3200, `condition()` not read in detail).
- **D9: `windmill` vs `mill`.** At `agriculture >= 5` (discovery) the same `city.mill` is called Windmill; at `wind_plant` it is replaced by the `windmill` key (A:1854: `not_tech wind_plant`). The kit will keep drawing a classic windmill: acceptable, outside Era 1.
- **D10: the 5 `primitive` techs and their structures.** No building depends on `wheel`/`club` for a human (`wheel`: trait `gravity_well`, T:139). The sundial (`sundial`) is not a `city` construction but the kit draws it as scenery (correct).
- **D11: jobs.** The kit's 17 jobs were not audited here (outside the task).
- **D12: "effect" column**: one-line summaries based on a quick reading of `effect()`/`action()`; the exact production figures were not recomputed.

## 11. Corrections to make to report 8

1. `lodge` ("hunting 2 + currency"), `smokehouse` ("tech smokehouse") and `compost` ("tech compost") are reserved to carnivorous / detritivorous races: a human will never see them (section 3.1).
2. The names `basic_housing`, `cottage`, `apartment`, `shed`, `mill`, `windmill` are indeed in `strings.json`.
3. The "before gunpowder" boundary separates no building (section 2); the real boundary is the `discovery` era.
4. The list omits `metal_refinery` (human, `civilized`) while it includes `hospital`, which depends on it.
5. The report counts `temple` as "theology 2": correct; `trade`: correct but forbidden to `terrifying`; `cement_plant`: forbidden to `flier`.
