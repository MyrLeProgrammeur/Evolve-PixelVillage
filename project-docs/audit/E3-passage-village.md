# E3: evolution -> village transition and the first minutes of Era 1 (human)

Date: 2026-10-15. Read-only audit. The game was not launched: everything comes from reading `src/` (a fork of Evolve 1.4.10) and `kit/`. Durations are computed from the costs and rates in the code, with explicit click assumptions. Whatever could not be read is listed under "Doubts".

Paths: `S/` = `src/`, `K/` = `kit/`.

## 0. Three findings that change the plan

1. **First playthrough: the biome is not rolled.** A new game has `global.city.biome = 'grassland'` (`S/vars.js:1879-1881`), `ptrait = []` (`'none'` set by the migration `S/vars.js:347-348`, then converted to `[]` by `S/vars.js:986-988`) and a 365-day orbit (`S/vars.js:1849-1859`). The `setPlanet`/`buildPlanet` roll is only called if `race.seeded && !race.chose` (`S/main.js:821-824`), that is, after a Bioseed. The answer "6 biomes out of 12" is correct for a game after a Bioseed, not for the first one: in a first game, it is 1 out of 12 (grassland).
2. **At the very first moment, `tech` is empty.** `sentience()` deletes `tech.evo*` (`S/actions.js:8501-8506`) and does not set `tech.primitive`. The game only has `club` to buy (`registerTech('club')`, `S/actions.js:8578`) and the Lumber button. No Food, no Stone, no Knowledge, no calendar (`calendar.day = 0`, `S/actions.js:8580`).
3. **The kit already handles the "before sundial" case** (`K/village.js:340`: `VIL.started = primitive >= 3 || day > 0`; `K/world.js:122-125`: campfire alone before, lanterns/sundial/post after). Item P0-3 of SYNTHESE.md is therefore already fixed in the current kit code. The remaining gaps are finer (section 4).

## 1. `sentience()` step by step (human, first playthrough)

Entry point: `S/actions.js:900-920` (the evolution "Sentience" button). The fork forces the species to `human` if the genus is humanoid (`S/actions.js:912-915`, placed after the roll and the "extinct" re-roll, so with no side effect). The default genus is `humanoid` when no `evo_<genus> >= 2` is found (`S/actions.js:891-897`). Then `sentience()` (`S/actions.js:8347-8960`):

| Order | Line | Action | Value for a standard human |
|---|---|---|---|
| 1 | 8348-8357 | simulation, genetics | not applicable (no `simulation`) |
| 2 | 8359-8364 | hides RNA and DNA | `resource.RNA.display = DNA.display = false` |
| 3 | 8366-8377 | junker/sludge | `delete race.junker/sludge/ultra_sludge` |
| 4 | 8379-8384 | cleans up the evolution buttons | rna, dna, membrane, organelles, nucleus, eukaryotic_cell, mitochondria |
| 5 | 8386-8418 | traits | see 1.1 |
| 6 | 8420-8421 | `inactiveTraits = {}` then `combineTraits()` | no combined forager/carnivore/herbivore |
| 7 | 8423-8428 | deletes `tech.evo` and `tech.evo_*`, `global.evolution = {}` | `tech` becomes empty (apart from prestige techs) |
| 8 | 8430-8566 | date events (Christmas, Easter, Halloween), `no_crispr`/`badgenes`, `evil`, `unified`, `orbit_decay` | none in a normal game. Human Halloween (zombie: `anthropophagite 1`, `cannibalize 2`, `infectious 3`, `S/actions.js:8486-8490`) only from 28 Oct to 4 Nov (according to SYNTHESE) |
| 9 | 8568-8569 | `clearElement(#resources)`, `defineResources()` | creates all resources (see 1.3) |
| 10 | 8570-8575 | `Lumber.display = true` (or Stone if kindling/smoldering) | **only visible resource** |
| 11 | 8578 | `registerTech('club')` | only tech offered |
| 12 | 8580 | `city.calendar.day = 0` | calendar stopped |
| 13 | 8582-8590 | `city_actions = ['food','lumber','stone']` | `addAction` only if `global.city[x]` exists; the actual buttons are filtered by `reqs` (1.4) |
| 14 | 8641-8645 | tabs | `civTabs = 1`, `showEvolve = false`, `showCiv = showCity = true` |
| 15 | 8647-8649 | government | `civic.govern.type = 'anarchy'`, `rev = 0`, `fr = 0` |
| 16 | 8685-8715 | names of the 3 neighbors | `civic.foreign.gov0/1/2.name` drawn by `genCivName()` |
| 17 | 8745-8749 | opening message | `loc('sentience')` as `info`, `progress` filter: "Congratulations! You have evolved into a %0 species of %1 called %2." (`strings/strings.json:3262`) with genus, entity (human), race name (`flib('name')`) |
| 18 | 8810-8838 | `calcPillar`, `defineJobs(true)`, `commisionGarrison()`, `defineGovernment(true)` | jobs defined, garrison at 0 |
| 19 | 8840-8858 | default job | `civic.d_job = 'unemployed'`, `unemployed.display = true` (not `carnivore`, not `forager`) |
| 20 | 8883-8890 | `calc_mastery`, `altRace` | not applicable |
| 21 | 8903-8920 | `adept` bonus (feat) | 0 in a first playthrough |
| 22 | 8930-8960 | `drawCity()`, `defineGovernment()`, `defineGarrison()`, `defineIndustry()`, etc. | UI |
| 23 | 8975-8980 | page reload | only for `slow`, `hyper` or `junker`: **not for the human** |

### 1.1 Human traits

- Humanoid genus (`S/races.js:86-92`): `adaptable 1`, `wasteful 1`.
- Human species (`S/races.js:5015-5036`): `creative 1`, `diverse 1`.
- Genus trait rank: `setTraitRank(set)` at full rank only if `tech.evo_humanoid >= 2` (`mainspec`, `S/actions.js:8392-8403`), otherwise it sets then **lowers** (`down:true`): rank 0.5. If the player did not take the humanoid path in the game's sense (the case where the genus falls back to `humanoid` by default), `adaptable` and `wasteful` would be at 0.5 (not verified in game).
- Effects: `adaptable` (faster genetic mutations), `wasteful` (more expensive crafting), `creative` (cheaper ARPA projects), `diverse` (longer soldier training): `S/races.js:241, 267, 1428, 1454`.
- **Visual consequence: none** for these 4 traits. The kit does not read them and has no need to. `race.maintype` is set to `humanoid` when `mainspec`.

### 1.2 What exists in `global.*` at t=0 (right after sentience)

| Area | Content | Source |
|---|---|---|
| `race` | `species:'human'`, `gods`, `old_gods`, `seeded:false`, traits above, `inactiveTraits:{}`, `maintype:'humanoid'` | `S/vars.js:2013`, `S/actions.js:8386-8421` |
| `tech` | **empty** (no `primitive`) | `S/actions.js:8423-8428` |
| `city.calendar` | `day:0, year:0, season:0, weather:2, temp:1, moon:0, wind:0, orbit:365` | `S/vars.js:1849-1872`, `S/actions.js:8580` |
| `city.biome` / `ptrait` / `geology` | `'grassland'` / `[]` / `{}` | `S/vars.js:1879, 1883` |
| `city.<building>` | none (created on purchase by `initStruct`) | `S/actions.js` (`struct()`) |
| `civic` | `govern.type:'anarchy'`, `d_job:'unemployed'`, `unemployed.display:true`, `foreign.gov0-2`, `homeless:0` | `S/actions.js:8647, 8851-8854` |
| Population | `resource.human`: `amount 0`, `max 0`, **not displayed** | `S/resources.js:677`, `loadResource(species,…,0,0)` |

### 1.3 Starting resources

`defineResources()` (`S/resources.js:674-760`) creates everything but only displays `Lumber` (`S/actions.js:8574`). Initial amounts: `amount = 0` for all (`S/resources.js:795-797`). Starting caps:

| Resource | Starting cap | Visible at t=0 | Becomes visible when |
|---|---|---|---|
| Lumber | 200 | yes | sentience |
| Food | 250 | no | purchase of `club` (`S/tech.js:36-40`) |
| Stone | 200 | no | purchase of `bone_tools` (`S/tech.js:62-65`) |
| Knowledge | 100 | no | purchase of `sundial` (`S/tech.js:117-119`) |
| Money | 1000 | no | `currency` tech (out of scope for this section) |
| Furs 100, Copper 100, Iron 100, Cement 100, Coal 50, Aluminium 50, Steel 50 | | no | later techs/buildings |
| Human | max 0 | no | 1st house (`S/actions.js:1411`, `basic_housing`: `display = true`, `max += 1`) |

### 1.4 Biome and planet (roll)

**First playthrough**: no roll (finding 1). Fixed values: grassland, no planet trait, orbit 365, empty geology.

**After a Bioseed** (`race.seeded=true`, `S/resets.js:199-208`): `genPlanets()` offers `race.probes` planets (`probes = starDock.probes.count + 1 + explorer level`, `S/resets.js:192-196`; 4 after Big Bang, `S/resets.js:408, 507`), and the player picks one (`S/actions.js:6811-6837`).

| Step | Rule | Source |
|---|---|---|
| Base biome | `floor(random(0, 6))`: 6 biomes at 1/6 each (16.7%): grassland, oceanic, forest, desert, volcanic, tundra. With `stats.portals >= 1` and no hellscape already offered: `max_bound = 7`, 1/7 each, the 7th = hellscape (or eden in an `evil` universe) | `S/actions.js:6862-6911` |
| Sub-biome | one time in 3 **and** `biome_<base>` achievement already earned in this universe: grassland->savanna, oceanic->swamp, forest->taiga or swamp (50/50), desert->ashland, volcanic->ashland, tundra->taiga | same |
| Defined biomes | 12: grassland, oceanic, forest, desert, volcanic, tundra, savanna, swamp, ashland, taiga, hellscape, eden | `S/races.js:7860-7960` |
| Planet traits | 2 rolls: 1st out of 18 (14 traits at 1/18, nothing 4/18 = 22%), 2nd out of 27 (nothing 13/27 = 48%). `permafrost` forbidden on volcanic/ashland/hellscape. 14 traits: toxic, mellow, rage, stormy, ozone, magnetic, trashed, elliptical, flare, dense, unstable, permafrost, retrograde, kamikaze | `S/actions.js:6913-6990` |
| Orbit | 200 to 599 (+200 if elliptical, +100 if kamikaze), hellscape 666, eden 777 | `S/actions.js:6736-6745` |
| Geology | 0 to 2 modified ores (-10% to +20%) | `S/actions.js:6685-6733` |

Biome and traits survive MAD resets, etc. (`S/vars.js:2240-2255`).

Effects visible to the kit: terrain, trees and weather per biome (`K/world.js:16-21`, 12 biomes described), `permafrost` (`K/era1.js:44-50`). The other traits are not read (see SYNTHESE, `flare`, `trashed`).

### 1.5 Calendar, season, weather, moon

- Start: `day 0` = stopped. The long loop only advances the calendar if `day > 0` (`S/main.js:11776`). The sundial does `day++` (`S/tech.js:119-120`): day 1.
- **1 day = 5 real seconds** at normal speed: fast loop 250 ms (`S/vars.js:2275`), long loop every 20 fast loops (`S/main.js:849-850`).
- A 365-day year = 1825 s (30.4 min). Seasons: `season_length = round(365/4) = 91` days (`S/main.js:11785-11794`): spring days 1-91 (7.6 min), summer 92-182, autumn 183-273, winter 274-365.
- At start: `season 0` (spring), `weather 2` (clear), `temp 1` (temperate), `wind 0`, `moon 0`. Each day, a 1 in 5 chance of re-rolling weather, temperature and wind (`S/main.js:11796-11880`), with a biome bias (ocean/swamp cloudier, desert clearer, tundra/taiga colder, etc.). Moon: +1 per day, cycle 0-27 (`S/main.js:11948-11960`).
- Opening log: the `sentience` message (row 17 of the table), then on buying the sundial "You have founded a settlement." (`strings.json:1584`, `S/tech.js:118`). The evolution messages already in the log are not cleared by `sentience()` (not verified).

## 2. The first minutes of Era 1 (human)

### 2.1 Availability

| Element | Appearance condition | Cost | Effect | Source |
|---|---|---|---|---|
| Lumber button | `reqs: {}` | free, +1 per click (no `strong` trait) | Lumber | `S/actions.js:1153-1206` |
| `club` tech | `reqs: {}` | 5 Lumber | `primitive 1`, Food visible | `S/tech.js:30-47` |
| Food button | `primitive >= 1` | free, +1 | Food | `S/actions.js:1090-1150` |
| `bone_tools` tech (human) | `primitive >= 1` | 10 Food | `primitive 2`, Stone visible | `S/tech.js:53-79` |
| `wooden_tools` | reserved for `soul_eater` | | | `S/tech.js:82-103` |
| Stone button | `primitive >= 2` | free, +1 | Stone | `S/actions.js:1222-1273` |
| `sundial` tech | `primitive >= 2` | 8 Lumber + 10 Stone | `primitive 3`, **Knowledge visible**, `calendar.day = 1`, founding message | `S/tech.js:106-146` |
| Nothing passive before the sundial | no building, no job, `diff` = 0 | | | `S/main.js:3430-3640` |

After the sundial (`primitive 3`), the following open up (cost in Knowledge): `housing` 10, `agriculture` 10, `mining` 45, `stone_axe` 45 + 20 Lumber + 20 Stone, `currency` 22 + 10 Lumber (requires `housing 1`), `science` 65 (requires `housing 1`), `storage` 20 (requires `currency 1`): `S/tech.js:315, 1142-1175, 1974, 6701, 3344, 4075, 2352`.

### 2.2 Useful rates and mechanics

- Knowledge: +1 per second from `primitive 3` (`sundial_base`, `S/main.js:4159-4160, 4222`), not affected by hunger. Cap 100 at start (`S/resources.js:691`).
- Growth: on each fast loop (250 ms), if `Food > 0` and `max > amount`, a `1 / (1.81 x population)` chance when `lowerBound = 0` (`S/main.js:3896-3958`; `Math.rand` = `floor(random x (max-min))`, `S/vars.js:65`). Population 0: arrival on the next tick (≤ 0.25 s). Population n: average wait 0.45 x n seconds.
- Capacity: each `basic_housing` gives +1 citizen (`citizens() = 1`, `S/actions.js:1417-1432`). Hut cost: 10 Lumber x 1.23^n, Money from the 6th (`S/actions.js:1390-1399`). Each farm gives +1 citizen **only** if the `farm` tech (`farm_house`) is taken (`S/actions.js:1768-1770`).
- Food: each citizen costs 1 Food/s, an unemployed one 0.5 Food/s (`consume = (pop - 0.5 x unemployed) x mod`, `S/main.js:3678-3683`). With no production, a single citizen drains Food at 0.5/s. At Food = 0: `fed=false`, no more growth, and each tick a 1 in 10 chance of losing a citizen if `generated < consume/1.25` (`S/main.js:3799-3822`).
- Food production: a farmer on a farm `(0.82 + 0.65) x 1.2 (grassland) = 1.76` Food/s (`S/jobs.js:797-813`, `loadJob('farmer',…,0.82,…)` `S/jobs.js:379`, `biomes.grassland.vars()[0] = 1.2` `S/races.js:7860`); the farm requires `agriculture 1`, cost 20 Lumber + 10 Stone (x 1.36^n, Money from the 4th) (`S/actions.js:1736-1760`). One farmer therefore feeds about 1.76 employed citizens.
- Lumberjack: `lumber_yard` requires `axe >= 1`, cost 6 Lumber + 2 Stone (then Money, x1.9) and shows the job (`S/actions.js:2514-2540`).

### 2.3 Estimated durations (lower bound, no waiting on resources other than clicks)

Assumptions: A = 3 clicks/s (fast player), B = 1 click/s (careful). Each click gives 1 unit. Amounts come from the costs above.

| Milestone | Condition | A (3 clicks/s) | B (1 click/s) |
|---|---|---|---|
| `club` | 5 Lumber | 2 s | 5 s |
| `bone_tools` | 10 Food | +4 s (6 s) | +10 s (15 s) |
| `sundial` | 8 Lumber + 10 Stone (18 clicks) | +6 s (**12 s**; 33 cumulative clicks) | +18 s (**33 s**) |
| `housing` tech | 10 Knowledge = 10 s after the sundial | **22 s** | **43 s** |
| 1st hut | 10 Lumber (10 clicks, done while waiting) | 22 s | 43 s |
| **1st citizen** | hut + Food > 0 (1 Food click needed) + 1 tick | **≈ 22 s** | **≈ 43 s** |
| `agriculture` tech | 10 more Knowledge (sundial + 20 s) | 32 s | 53 s |
| 1st farm (20 L + 10 S = 30 clicks) | | ≈ 40 s | ≈ 85 s |
| **1st job** (farmer) | farm + assign the unemployed citizen (click in the Civic tab) | ≈ 45 s | ≈ 90 s |
| `stone_axe` tech | cumulative Knowledge 65 (housing 10 + agri 10 + axe 45) = sundial + 65 s | ≈ 77 s | ≈ 98 s |
| 1st lumberjack (`lumber_yard`) | axe + 6 L + 2 S | ≈ 85 s | ≈ 110 s |
| 2nd citizen | 2nd hut (12 Lumber) + average wait 0.9 s | depends on Lumber | |
| **Sundial** | (see above) | **≈ 12 s** | **≈ 33 s** |

Note: as long as no farmer is working, food depends on clicks (0.5 Food/s per unemployed citizen). A 2nd citizen without a farm is a net loss.

### 2.4 First visual tier change (`tech.axe >= 2`)

`tierOf`: tier 2 if `axe >= 2`, tier 3 if `cement >= 1` (`K/village.js:80`). `axe 2` = the `copper_axes` tech (540 Knowledge + 25 Copper; requires `axe 1` and `mining >= 2`, `S/tech.js:6727-6744`). Minimal chain:

| Step | Knowledge | Other |
|---|---|---|
| `mining` | 45 | |
| `metal_working` (`mining 2`) | 350 | exceeds the cap of 100: a building that raises the cap is needed (see doubts) |
| `science` (65) then `university` | 65 | building (cost not looked up) |
| `mine` (mining 2) to display Copper | | `S/actions.js:2968-2994` |
| `copper_axes` | 540 | 25 Copper |
| Total | **≈ 1000 Knowledge** | |

At 1 Knowledge/s (sundial alone): at least 17 minutes; with professors, a few minutes less (professor productivity not looked up). **Order of magnitude: 12 to 25 minutes of play**, not "the first minutes". Tier 3 (`cement`, 500 Knowledge, requires `mining 1, storage 1, science 1`, `S/tech.js:8069`) comes at the same order.

## 3. Startup script and successive states to test

t=0 state for `SpriteKit` (live, via `window.evolve.global`):

```
race: { species:'human' } ; tech: {} ; city: { calendar:{day:0,year:0,season:0,weather:2,temp:1,moon:0,wind:0,orbit:365}, biome:'grassland', ptrait:[] }
civic: { unemployed:{display:true,workers:0}, govern:{type:'anarchy'} } ; resource: { Lumber:{amount:0,max:200,display:true}, Food:{amount:0,max:250,display:false}, human:{amount:0,max:0} }
```

| State | Trigger | What the game has | What the view should show |
|---|---|---|---|
| E0 | sentience | empty tech, 0 citizens | clearing with **campfire alone** (already the case), trees and rocks, no building or character |
| E1 | `club` (`primitive 1`) | Food visible | same (Food gain: optional `+N` bubble) |
| E2 | `bone_tools` (`primitive 2`) | Stone visible | same; possibly stone piles |
| E3 | `sundial` (`primitive 3`, `day 1`) | founding message, Knowledge | appearance of the **sundial**, lanterns and post (already handled `K/world.js:124-126`); time starts running |
| E4 | 1st hut (`city.basic_housing.count = 1`) | `human.max = 1` | 1 tier 1 hut; `SCAF` construction scaffold (`K/village.js:344-351`) |
| E5 | 1st citizen (`civic.unemployed.workers = 1`) | pop 1, `showCivic` | 1 idle villager on the plaza (`K/citizens.js:32`) |
| E6 | `agriculture` + 1st farm | farmer job displayable | farm; villager at work once assigned (`civic.farmer.workers = 1`) |
| E7 | `stone_axe` + `lumber_yard` | `axe 1`, lumberjack job | 1st lumber mill; lumberjack |
| E8 | `copper_axes` (`axe 2`) | tier 2 | **tier transition** (dust and spark fade, `K/village.js:338, 425-432`) |
| E9 | `cement` | tier 3 | same, nobler materials |

## 4. What the kit draws at t=0, and gaps

Reading of `K/spritekit.js` (`fakeState`), `K/village.js`, `K/era1.js`, `K/world.js`, `K/citizens.js`.

| Point | Finding | Source |
|---|---|---|
| `fakeState` | Fallback mode (without `window.evolve.global`): day 120, year 3, summer, **6 huts, 3 farms, 1 lumber mill, 1 quarry, 7 citizens, `primitive 3`, `axe 1`**. This is NOT a starting state. The fork forces `expose`, so this mode should not be used; if the game is not ready, `anki-village.js:44-45` shows a note, not the fake village | `K/spritekit.js:549-559` |
| Real t=0 | `plan()`: all `count` values are 0 -> 0 buildings; `civicN` = 0 -> 0 citizens; `started = false` -> no sundial, lanterns or post; scenery (trees, rocks, bushes, tufts, standing stones) drawn per biome | `K/village.js:82-92, 340`; `K/world.js:69-132` |
| Terrain | `layout()` is static (seed `'evolve-map-v1'`): **4x4 central plaza (tiles 10 to 13) and paths always drawn** even before the first house; water body, rock and bare earth zones too | `K/spritekit.js:298-310` |
| Season/biome | read from the real state: spring + grassland at t=0 | `K/village.js:340-343` |
| Animals | deer, boar, rabbits, fish placed by `spots` from the start (linked to nothing, SYNTHESE) | `K/world.js:130-135` |

What the player would see at t=0 with the kit as is: **an empty clearing with a paved plaza, paths that lead nowhere, a lit campfire, trees/rocks, animals, no inhabitants or buildings.** Visually consistent with "a camp", but the plaza and paved paths are ahead of the game.

### Gaps to fix by priority

**P0 (visible truth from the first minute)**
1. Plaza and paths already built at t=0. Before the sundial, it should be grass/packed earth with at most a circle of earth around the fire. Trigger: `!started` (`tech.primitive < 3 && calendar.day = 0`).
2. No differentiation between `primitive 0, 1, 2`: the kit does not read `primitive` between 0 and 2. Nothing signals that Food or Stone have been unlocked.
3. Animals and fish present from E0: to be decided (ambient scenery, not a link to the game).

**P1 (first minutes)**
4. The first citizens appear on the plaza (`at: 'plaza'`): without a paved plaza at E5 a gathering point around the fire is needed.
5. No gain bubble for Lumber/Food/Stone clicks (P1 of SYNTHESE).
6. No famine signal at 1 citizen: `famineOf` requires `Food.max > 0 && Food.amount <= 0` (`K/citizens.js:347`); the case where Food is not yet displayed (`max 250` but invisible) falls into famine from the 1st citizen if the player has not clicked: consistent with the game, but to be tested.
7. Techs never read: `housing`, `agriculture`, `science`, `currency` (P0-5 of SYNTHESE): no visual effect, which is correct until E6 but removes landmarks (granary, stalls).

**P2**
8. The tier only changes at `axe >= 2`: no visual landmark between E4 and E8 (12 to 25 min). Add intermediate tiers from `axe 1`, `mining`, `hoe 1`, `hammer 1`, `pickaxe 1`.
9. `fakeState` is badly named for startup tests: add a `fakeState('t0')`.

## 5. Chronology of the "growing village" (real unlock order, human)

Research costs in Knowledge (abbreviated K). All the techs below are `era: civilized` except the first three (`primitive`). "Condition" = the tech's `reqs` then the building's `reqs` (`S/actions.js`). Durations are in game minutes at 1 K/s without professors (rough upper bound; actual Knowledge production increases with professors).

| # | Building or addition | Tech that opens it (cost) | Prerequisite tech | Building `reqs` | Source |
|---|---|---|---|---|---|
| 0 | campfire | none | | | `K/world.js:123` |
| 1 | sundial | `sundial` (8 L + 10 S) | `bone_tools` | (not a game building) | `S/tech.js:106` |
| 2 | `basic_housing` | `housing` 10 K | primitive 3 | `housing 1` | `S/tech.js:315`, `S/actions.js:1387` |
| 3 | `farm` | `agriculture` 10 K | primitive 3 | `agriculture 1` | `S/tech.js:1142`, `S/actions.js:1736` |
| 4 | `lumber_yard` | `stone_axe` 45 K + 20 L + 20 S | primitive 3 | `axe 1` | `S/tech.js:6701`, `S/actions.js:2514` |
| 5 | `rock_quarry` | `mining` 45 K | primitive 3 | `mining 1` | `S/tech.js:1974`, `S/actions.js:2600` |
| 6 | currency, bank | `currency` 22 K + 10 L; `banking` 90 K | housing 1; currency 1 | `banking 1` (bank) | `S/tech.js:3344, 3570`, `S/actions.js:2363` |
| 7 | `shed` | `storage` 20 K | primitive 3 + currency 1 | `storage 1` | `S/tech.js:2352`, `S/actions.js:2117` |
| 8 | `university` | `science` 65 K | housing 1 | `science 1` | `S/tech.js:4075`, `S/actions.js:3654` |
| 9 | `garrison` | `garrison` 70 K | science 1 + housing 1 | `military 1 + housing 1` | `S/tech.js:7342`, `S/actions.js:1969` |
| 10 | `silo` | `silo` 80 K | agriculture 2 (`irrigation` 55 K) + storage 1 | `agriculture 3` | `S/tech.js:1196, 1215`, `S/actions.js:1936` |
| 11 | `mine` (Copper) | `metal_working` 350 K | mining 1 | `mining 2` | `S/tech.js:2281`, `S/actions.js:2968` |
| 12 | `foundry` | `foundry` 650 K | mining 2 | `foundry 1` | `S/tech.js:1336`, `S/actions.js:2722` |
| 13 | `cement_plant` | `cement` 500 K | mining 1 + storage 1 + science 1 | `cement 1` | `S/tech.js:8069`, `S/actions.js:2675` |
| 14 | `library` | `library` 720 K | science 1 + cement 1 | `science 2` | `S/tech.js:4095`, `S/actions.js:3759` |
| 15 | `amphitheatre` | `theatre` 750 K | housing 1 + currency 1 + cement 1 | `theatre 1` | `S/tech.js:1681`, `S/actions.js:3305` |
| 16 | tier 2 tools (`axe 2`) | `copper_axes` 540 K + 25 Cu | axe 1 + mining 2 | | `S/tech.js:6727` |
| 17 | `cottage` | `cottage` 3600 K | housing 1 + cement 1 + mining 3 (`iron_mining` 2500 K) | `housing 2` | `S/tech.js:337, 2301`, `S/actions.js:1441` |
| 18 | `sawmill` | `iron_saw` 3375 K | axe 1 + mining 3 | `saw 1` | `S/tech.js:6748`, `S/actions.js:2554` |
| 19 | `smelter` | `smelting` 4050 K | mining 3 | `smelting 1` | `S/tech.js:2041`, `S/actions.js:2851` |
| 20 | `coal_mine` | `coal_mining` 4320 K | mining 3 | `mining 4` | `S/tech.js:2328`, `S/actions.js:3015` |
| 21 | `mill` | `mill` 5400 K | agriculture 3 + mining 3 | `agriculture 4` | `S/tech.js:1235`, `S/actions.js:1856` |
| 22 | `trade` (trading post) | `trade` 4500 K | currency 2 (`market` 1800 K, requires `govern 1` = `government` 750 K) + military 1 | `trade 1` | `S/tech.js:3365, 3480, 3038`, `S/actions.js:3155` |
| 23 | `metal_refinery` | `bayer_process` 4500 K | smelting 2 (`steel` 4950 K + 25 Steel) | `alumina 1` | `S/tech.js:1997, 2071`, `S/actions.js:2917` |

Remarks: `farm_house` (+1 citizen per farm) requires `currency 1`, 50 Money and 180 K (`S/tech.js:1177`). Money only exists after `currency`. `lodge`, `smokehouse`, `compost`, `hospital`, `temple`, `soul_well`: closed to a human in a first playthrough (see SYNTHESE, `S/tech.js:964, 1013, 1060`).

End-to-end test plan: inject the states of table 3 in succession by setting the fields `tech.*` and `city.<key>.count` / `civic.<job>.workers` / `civic.unemployed.workers`, in the order of table 5, and check the kit's gate at each step (`SK.gate`, `K/era1.js:35-38`).

## 6. Items to add or fix (kit or fork), with trigger

| # | Where | What | Trigger |
|---|---|---|---|
| 1 | kit `K/spritekit.js:298-310` (`layout`) | plaza and paths in two states: grass/packed earth before the sundial, paved plaza and paths after | `tech.primitive >= 3 \|\| calendar.day > 0` |
| 2 | kit `K/world.js:122-126` | landmarks at `primitive 1` (wood pile), `primitive 2` (stone pile) | `tech.primitive` 1, 2 |
| 3 | kit `K/village.js:80` | intermediate tiers (hoe, hammer, pickaxe, axe 1) | levels of these techs |
| 4 | kit | test starting state `fakeState('t0')` | explicit call |
| 5 | kit `K/citizens.js` | gathering point around the fire while the plaza does not exist | `!started` |
| 6 | kit | `+1` bubble for Lumber/Food/Stone | change of `resource.X.amount` between two reads |
| 7 | fork `anki-village.js:49-55` | pond message: on humanoid, recall the human species (already said); for the future: evolution -> village transition scene (fade) | `race.species` leaves `'protoplasm'` |
| 8 | fork | automated startup test: load a new save, force `sentience`, check `window.evolve.global.city.calendar.day === 0` | out of scope here |
| 9 | kit doc | state that the biome is grassland in a first playthrough and that "6/12" only holds after a Bioseed | |

## 7. Doubts / not verified

- The game was not launched. All durations are computed, not measured. The click rate (A, B) is an assumption.
- `evo_humanoid >= 2` at sentience for the fork's humanoid path: not verified. If false, `adaptable` and `wasteful` are at 0.5 (no visual effect).
- Professor productivity (impact of `civic.professor`), the cost of the `university` and the value of the Knowledge cap after construction: not re-read. I therefore could not pin down the duration up to `copper_axes` other than as a range (12 to 25 min). `metal_working` costs 350 K for a cap of 100: a cap increase is needed (`S/main.js:9269-9314`, `university` and `library`), assumed but not quantified.
- Exact cost of `rock_quarry`, `mine` and the Copper needed, of `reclaimer` and of `wheel`: not looked up; `wheel` (`S/tech.js:151`, `reqs primitive 2`) seems reserved for the `gravity_well` challenge according to SYNTHESE (`tech.js:139-157`), not re-verified.
- The condition of the `agriculture` tech (`S/tech.js:1155`, `condition` block) was not read (probably excludes carnivore/herbivore).
- `global.settings`: state of `showCivic`, `showResources` before the 1st house: only read for `basic_housing` (`S/actions.js:1412`).
- Opening message: the arguments of `loc('sentience',…)` (genus, entity, name) are known, the rendered text in French is not (the fork loads the English `strings.json`).
- The "1 day = 5 s" average: true at normal speed; the player's `slow`/`hyper` speed option (not read) changes it, and `webWorker.mt` may be redefined elsewhere.
- The exact behavior of `SpriteKit.run()` when `civic.unemployed` or `city.<x>` are absent is deduced from reading (`(x||{})` everywhere), not executed.
- Money: source of Money income before `currency` not looked up.
- The `Halloween` effects (zombie) are not active at today's date (15 October); not tested on other dates.
