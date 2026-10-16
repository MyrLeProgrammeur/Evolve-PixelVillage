# Audit B: jobs, citizens, living entities of Evolve Era 1

Read-only audit. Nothing was modified or executed. Everything is read in `src/` and `kit/`. Line numbers are those of the current files.

Reference player: **standard human, first playthrough, no prestige**. In the code, the human is of genus `humanoid` (traits `adaptable`, `wasteful`, `src/races.js:86-91`) with the species traits `creative` and `diverse` (`src/races.js:5021-5024`). It has no `carnivore`, no `forager`, no `detritivore`, no `evil`, no `gravity_well`.

## 0. Key results (corrections to the definition of Era 1)

1. **The hunter does not exist for a standard human.** `global.civic.hunter.display = true` is only set for `carnivore`, `soul_eater` or `unfathomable` (`src/actions.js:8840-8843`). In every other case the default job is `unemployed` (`src/actions.js:8844-8851`, `src/vars.js:715-725`). The kit nevertheless draws the hunter (`kit/citizens.js:30`).
2. **The hunting lodge (lodge) and the smokehouse are unreachable for the standard human.** The `smokehouse` tech requires the `carnivore` trait (`src/tech.js:964-970`). The `lodge` tech requires `hunting: 1`, hence the smokehouse (`src/tech.js:991-1003`). Without that, the lodge only appears for `soul_eater`, `detritivore`, `artifical`, `unfathomable` or `forager` via the `alt_lodge` tech (`src/tech.js:1013-1022`, `src/actions.js:1551`). Report 8 puts these two buildings in Era 1 without this caveat (`project-docs/audit/8-sprites-evolve-ere1.md`, lines 3 and 4 of the buildings table).
3. **The teamster only exists in the `gravity_well` challenge.** The `wheel` tech (the only source of `civic.teamster.display`, `src/tech.js:139-157`) carries `trait: ['gravity_well']`. The `gravity_well` trait is a challenge chosen at evolution (`src/actions.js:4437`, `5445`). `teamsterCap()` and `teamster()` do nothing without it (`src/jobs.js:723-734`, `src/prod.js:16-24`).
4. **The priest does not exist without prestige.** `civic.priest.display` is only set with the `ancients >= 2` gene (`src/arpa.js:1005-1016`, `src/actions.js:3406-3411`, `src/tech.js:8362-8365`). Its cap is only fed by the temples under the same condition (`src/main.js:9253-9255`). The temple itself does exist (`src/actions.js:3380-3388`).
5. **The scientist is not from Era 1.** Only the `wardenclyffe` building unlocks it (`src/actions.js:3925`), and it requires `high_tech: 1` (`src/actions.js:3852`). That tech is `mad_science`, `discovery` era (`src/tech.js:4785-4792`), whereas report 8 limits Era 1 to the `primitive` and `civilized` eras.
6. **The code has no magistrate, no police officer, no doctor, no tax collector, no child, no retiree.** Search performed (`police|magistrate|collector|child|elder|retire|gender`): no relevant result. Taxes are a simple rate (`global.civic.taxes.tax_rate`, `src/civics.js:15-21`). The hospital has no staff: it speeds up soldier healing (`src/main.js:11685-11748`, `src/actions.js:2022-2027`).
7. **None of the events (raid, siege, fire, etc.) has a character in the game.** They are text `messageQueue` entries with effects on stocks and the garrison (`src/events.js`). Foreign armies only exist as numbers (`src/vars.js:2349-2395`).
8. **The kit has 17 jobs. Only 12 are reachable by a standard human in Era 1** (11 direct plus the craftsman). Five are drawn "in excess": hunter, forager, teamster, priest, scientist.

## 1. Full table of jobs

Source of the list: the 29 `loadJob(...)` calls of `src/jobs.js:373-401`, plus the `garrison` soldier post defined in `src/civics.js:89-126`. That makes **30 roles**. Legend: "Kit" refers to `kit/citizens.js` (`JOB` table, lines 26-44).

Classification: COVERED, COVERED BY MERGE, MISSING, OUT OF SCOPE. For the five that are drawn but unreachable, I write "OUT OF SCOPE (already drawn)".

| # | Key | Game name | Unlock (code) | Produces / effect | Era 1, standard human? | Kit | Class |
|---|---|---|---|---|---|---|---|
| 1 | `unemployed` | Unemployed | Shown at start if neither carnivore nor forager (`src/actions.js:8848-8851`) | Nothing. Lower morale, no tax, half rations (`strings.json` `job_unemployed_desc`) | Yes | `unemployed`, idle, plaza (`kit/citizens.js:27`) | COVERED |
| 2 | `hunter` | Hunter | `carnivore`, `soul_eater` or `unfathomable` only (`src/actions.js:8840-8843`) | Food and furs (`src/main.js:4042-4061`) | **No** | Drawn, at the lodge/smokehouse (`kit/citizens.js:30`) | OUT OF SCOPE (already drawn) |
| 3 | `forager` | Forager | Trait `forager` (omnivore genus, `src/races.js:108-114`, `src/actions.js:8844-8847`) | Food and miscellany (`strings.json` `job_forager_desc`) | **No** | Drawn (`kit/citizens.js:28`) | OUT OF SCOPE (already drawn) |
| 4 | `farmer` | Farmer | Build a `farm` (`src/actions.js:1750-1759`; tech `agriculture` civilized, `src/tech.js:1142`, then `farm_house`) | Food. Each farm supports farmers at full yield, the surplus yields less (`src/jobs.js:45-59`, `src/jobs.js:797`) | Yes | `farmer`, hoe, straw hat, at the farm (`kit/citizens.js:29`) | COVERED |
| 5 | `lumberjack` | Lumberjack | Build a `lumber_yard`, tech `stone_axe` (`src/actions.js:2533`, `src/tech.js:6688-6695`) | Wood (`src/jobs.js:60`). Becomes "Reclaimer" for `evil` races (`src/jobs.js:62-76`, out of scope) | Yes | `lumberjack`, axe depending on `tech.axe` (`kit/citizens.js:31`, `67-69`) | COVERED |
| 6 | `quarry_worker` | Quarry Worker | Build a `rock_quarry`, tech `mining` (`src/actions.js:2640`, `src/tech.js:1964`). Forbidden to trait `sappy` | Stone (`src/jobs.js:112`) | Yes | `quarry_worker`, big hammer (`kit/citizens.js:32`) | COVERED |
| 7 | `crystal_miner` | Crystal Miner | Magic universe, tech `mana` (`src/tech.js:11215-11226`) | Crystal | No | None | OUT OF SCOPE: magic universe |
| 8 | `scavenger` | Scavenger | `trashed` planet or trait `scavenger` (`src/main.js:11594-11596`) | Production bonus | No | None | OUT OF SCOPE: trait or planet |
| 9 | `teamster` | Teamster | Tech `wheel`, only with the `gravity_well` challenge (`src/tech.js:139-157`) | Reduces the freight penalty (`src/prod.js:16-24`) | **No** (standard) | Drawn, with cart (`kit/citizens.js:37`, `122-127`) | OUT OF SCOPE (already drawn) |
| 10 | `meditator` | Meditator | Trait `fasting` (`src/main.js:2255-2256`) | Population growth | No | None | OUT OF SCOPE: trait |
| 11 | `torturer` | Tormentor | Trait `unfathomable` (`src/tech.js:555-567`) | Thralls | No | None | OUT OF SCOPE: trait |
| 12 | `miner` | Miner | Build a `mine`, tech `metal_working` = `mining 2` (`src/actions.js:2961-2990`, `src/tech.js:2271`) | Copper, then iron and aluminium if `mining >= 3` (`src/jobs.js:192-202`). 1 miner per mine (`src/main.js:8659-8661`) | Yes | `miner`, pickaxe, headlamp (`kit/citizens.js:33`) | COVERED |
| 13 | `coal_miner` | Coal Miner | Build a `coal_mine`, tech `coal_mining` = `mining 4` (`src/actions.js:3008-3039`, `src/tech.js:2318`) | Coal (`src/jobs.js:203-210`) | Yes | `coal_miner`, soot (`kit/citizens.js:34`) | COVERED |
| 14 | `craftsman` | Crafter | Build a `foundry` (`src/actions.js:2715-2750`; tech `foundry` civilized, `src/tech.js:1333`) | Materials, see table 1b. 1 craftsman per foundry (`src/main.js:9769-9771`) | Yes | **A single** `craftsman`, hammer, at the foundry/smelter/shed (`kit/citizens.js:36`) | COVERED BY MERGE |
| 15 | `cement_worker` | Cement Worker | Build a `cement_plant`, tech `cement`. Forbidden to `flier` (`src/actions.js:2668-2700`, `src/tech.js:8058`) | Cement, consumes stone (`src/jobs.js:214-229`). 2 per plant (`src/main.js:8717-8719`) | Yes | `cement_worker`, shovel, scarf (`kit/citizens.js:35`) | COVERED |
| 16 | `banker` | Banker | Tech `investing` = `banking 2`, civilized (`src/tech.js:3580-3596`), cap = number of `bank` (`src/actions.js:2384`, `src/main.js:8674-8676`) | Increases tax income (`src/jobs.js:230-249`) | Yes | `banker`, top hat, purse (`kit/citizens.js:41`) | COVERED |
| 17 | `entertainer` | Entertainer | Build an `amphitheatre`, tech `theatre` (`src/actions.js:3286-3322`, `src/tech.js:1670`) | Morale (`src/jobs.js:250-265`, `src/main.js:3025`) | Yes | `entertainer`, lute, belt, at the amphitheatre (`kit/citizens.js:42`) | COVERED |
| 18 | `priest` | Priest | Gene `ancients >= 2` (`src/arpa.js:1005-1016`, `src/main.js:9253`) | Strengthens the temples, a little mana (`src/jobs.js:266-278`) | **No** (prestige required) | Drawn, at the temple (`kit/citizens.js:40`) | OUT OF SCOPE (already drawn) |
| 19 | `professor` | Professor | Build a `university`, tech `science` (`src/actions.js:3644-3737`, `src/tech.js:4065`), 1 per university (`src/main.js:9267-9269`) | Knowledge (`src/jobs.js:279-297`) | Yes | `professor`, book, scholar's hat (`kit/citizens.js:38`) | COVERED |
| 20 | `scientist` | Scientist | `wardenclyffe` building, `high_tech 1` = tech `mad_science`, **discovery** era (`src/actions.js:3848-3925`, `src/tech.js:4785-4792`) | Knowledge (`src/jobs.js:298`) | **No** (discovery era) | Drawn, glasses and flask (`kit/citizens.js:39`) | OUT OF SCOPE (already drawn) |
| 21 | `colonist` | Colonist | Space (`src/space.js:743`) | Mars | No | None | OUT OF SCOPE: space era |
| 22 | `titan_colonist` | Titan Colonist | Truepath (`src/truepath.js:207`) | Titan colony | No | None | OUT OF SCOPE |
| 23 | `space_miner` | Space Miner | Space (`src/space.js:2196`) | Space ore | No | None | OUT OF SCOPE |
| 24 | `hell_surveyor` | Surveyor | Portal (`src/portal.js:113`) | Hell | No | None | OUT OF SCOPE |
| 25 | `archaeologist` | Archaeologist | Portal (`src/portal.js:2059`) | Knowledge from the ruins | No | None | OUT OF SCOPE |
| 26 | `ghost_trapper` | Ghost Trapper | Eden (`src/edenic.js:287`) | Soul gems | No | None | OUT OF SCOPE |
| 27 | `elysium_miner` | Elysium Miner | Eden (`src/edenic.js:1346`) | Ore | No | None | OUT OF SCOPE |
| 28 | `pit_miner` | Pit Miner | Truepath (`src/truepath.js:1790`) | Ore | No | None | OUT OF SCOPE |
| 29 | `crew` | Ship Crew | Space, `witch_hunter` (`src/space.js:5002`) | Crew | No | None | OUT OF SCOPE |
| 30 | `garrison` (soldier) | Soldiers | Tech `garrison` (military 1), building `garrison` (`src/actions.js:1962-1991`, `src/tech.js:7332`) | Defense and campaigns, see §2 | Yes | `soldier`, spear, shield, helmet, stationary at the barracks (`kit/citizens.js:43`, `162`) | COVERED |

Summary: 11 COVERED, 1 COVERED BY MERGE, 0 MISSING, 18 OUT OF SCOPE (of which 5 already drawn and 13 not drawn). Total 30.

**No Era 1 job is missing.** The gaps are in the states and entities (§2, §3).

### 1b. Craftsman sub-jobs (manufacture of crafted resources)

Craftsmen are distributed by the resource they make (`src/jobs.js:825-880`, counters `global.city.foundry[res]`, production `src/main.js:7866-7906`). Costs: `src/resources.js:177-189`.

| Resource | Appears when | Manufacturing cost | Era 1? | Kit |
|---|---|---|---|---|
| `Plywood` | Foundry built, except `kindling_kindred`/`smoldering` (`src/actions.js:2751-2753`) | 100 wood | Yes | No distinction |
| `Brick` | Foundry built (`src/actions.js:2754`) | 40 cement | Yes | No distinction |
| `Wrought_Iron` | Foundry plus mined iron (`src/actions.js:2755-2757`, `src/tech.js:2305-2308`) | 80 iron | Yes | No distinction |
| `Sheet_Metal` | Foundry plus aluminium (`src/actions.js:2758-2760`, `2938-2943`) | 120 aluminium | Yes, if aluminium is displayed (tech `bayer_process`, civilized, `src/tech.js:1987-1994`) | No distinction |
| `Mythril`, `Aerogel`, `Nanoweave` | End-game resources | Iridium, graphene, etc. | No | Out of scope |
| `Scarletite`, `Quantium` | Portal, zero-gravity lab (`src/jobs.js:736-761`) | | No | Out of scope |
| `Thermite` | Summer event (`src/jobs.js:845-848`) | | No | Out of scope |

Verdict: **COVERED BY MERGE.** A single craftsman with a hammer. None of the four Era 1 manufactures is visually distinct. Proposal in §4.

## 2. Other living entities of Era 1

### 2a. Armies, battles, foreign powers, spies

| Entity (code) | Unlock / condition | Visual in the game | Kit equivalent |
|---|---|---|---|
| 3 foreign powers `gov0..gov2` (`src/vars.js:2349-2395`, `src/civics.js:489-560`), 5 in truepath | Tech `military`, absent if `cataclysm`/`isolation`/`world_control` (`src/civics.js:490`) | None: numbers (`mil`, `hstl`, `eco`, `unrest`) | None |
| Stationed soldiers `garrison.workers`, wounded `garrison.wounded`, battalion `garrison.raid`, crew `crew` (`src/civics.js:91-126`) | Building `garrison` | Counters in the army tab (`src/civics.js:1174-1200`) | Soldiers at the barracks: number = `garrison.workers` (`kit/citizens.js:162`), no distinction between wounded, on campaign or mercenary |
| Recruit training `garrison.progress`/`rate` (`src/main.js:8052-8054`) | Garrison | Progress bar (`src/civics.js:1203`) | None |
| Campaigns: 5 tactics (ambush, raid, plunder, assault, siege), occupation, annexation, purchase (`src/civics.js:1548-1700`, `1311-1322`) | Tech `military` plus an uncontrolled power | Loot and loss messages | None (no army on the march, no enemy) |
| Enemy raids and sieges (`events.js` `raid` l. 133, `siege` l. 187, `pillage0..3` l. 237-286) | `hstl > 60` for raid, `> 80` for siege (`src/events.js:140-146`, `194-199`) | Text only: money losses, soldiers killed and wounded | None |
| Mercenaries (`src/civics.js:1128-1172`, tech `mercs` civilized `src/tech.js:7352-7372`) | Tech `mercs` | Counter `m_use`, hire button. A mercenary is added to `garrison.workers` | None (indistinguishable) |
| Spies: `spy` 1 civilized (`src/tech.js:3226-3233`), `spy` 2-5 are `discovery` and later (`espionage`, `spy_training`, ...) | Tech `govern` | Counter `gov.spy` and timer `sab` (`src/civics.js:755-860`). "Spy executed" event (`src/events.js:491-527`) | None |
| Governor (`src/governor.js`) | Gene `governor` and tech `governor` (`src/tech.js:3200-3226`, `src/governor.js:364`, `385`) | Named sheet with 11 "backgrounds" (`src/governor.js:14-107`) | Out of scope (prestige) |

Class: everything is **visually MISSING**. But none of these entities has a sprite in the game: they are states to be dressed up. Priorities in §4.

### 2b. Caravans, merchants, trade

| Entity | Reality in the code | Kit |
|---|---|---|
| Caravans | **Do not exist.** Trade is a number of routes (`global.city.market.mtrade`, `src/actions.js:3174-3180`) and volumes `global.resource[res].trade` (`src/main.js:10626-10631`). No character | None. The kit's cart (`cart_box`, `cart_wheel_*`) only serves the teamster (`kit/citizens.js:122-127`) |
| Trade Post | Tech `trade` (currency 2 plus military 1, `src/tech.js:3469-3478`). Adds 2 or 3 routes (`src/actions.js:3164-3173`) | Composite `trade` building (`project-docs/audit/COUVERTURE-KIT.md`) |
| Merchant (`merchant`) | Simple race trait, price modifier (`src/main.js:1563-1572`) | None |
| Slaves | `Slave` resource, building `slave_pen`, race `balorg` only (`src/races.js:5886`, `src/tech.js` `slave_pens` trait `slaver`, `src/actions.js:1658-1681`) | Out of scope |
| Servants | After prestiges (`global.stats.matrix/retire/eden > 0`, `src/main.js:12226-12240`). Do not replace Era 1 | Out of scope |

### 2c. Events with or without a character (`src/events.js`)

Events are drawn at random (`src/main.js:12723-12731` for major ones, `t=999`, and `12741-12752` for minor ones, `t=850`). The last event is in `global.event.l` (major) and `global.m_event.l` (minor). All go through `messageQueue`.

Events reachable in Era 1 by a standard human (condition `tech: 'primitive'` unless stated otherwise):

| Key | What happens | Character? | Kit equivalent |
|---|---|---|---|
| `fire` (l. 62) | Loss of wood (up to 25%) | No (no deaths) | No fire. Smoke particles only |
| `flare` (l. 77) | Solar flare, human losses. Reserved for planets with the `flare` trait | No | None |
| `inspiration`, `motivation` (l. 42-60) | Temporary bonus | No | None |
| `raid`, `siege`, `pillage*` (l. 133-286) | See 2a | No | None |
| `tax_revolt` (l. 398, high-rate condition) | Riot, loss of resources | No | None |
| `protest` (l. 420-455) | `global.civic.govern.protest` = 30-90 ticks, global production −30% (`src/main.js:1133-1135`) | No | None |
| `scandal` (l. 457, needs the `muckraker` governor) | Out of scope | | |
| `spy` (l. 491) | A spy is executed | No | None |
| `mine_collapse` (l. 529-545) | A miner dies, population −1 | No | None |
| `contest`, `cheese` (l. 882, 964) | Text | No | None |
| `heatwave`, `coldsnap` (l. 804, 828) | Changes `calendar.temp` | No | Weather ambience only (kit rendering) |
| `dark_cloud`, `gloom` (l. 897, 913) | Changes `calendar.weather` | No | Rain and clouds handled by the kit |
| `pet` (l. 986-1013) | Creates `global.race.pet`: cat or dog (color, name) | **Yes, a pet**, drawn in the interface (`src/functions.js:2395-2420` `drawPet`) | `cat_roof` (`kit/pieces_b2.js:118`): cat on the roof of the first cabin, **unrelated to the event** (`kit/village.js:426-441`). No dog |
| `basicEvent`: `bird`, `cloud`, `tracks`, `hoax`, `burial`, `llama`, `cat`, `omen`, `theft`, `compass`, `bone`, `prank`, `crop_circle`, `tremor`, `rumor`, `cucumber`, `furryfish`, `meteor_shower`, `bloodrain`, `dollar`, `pickpocket` (l. 906-962) | Comic text. `llama` removes 25 to 100 food if not carnivore (`src/events.js:921-935`). `theft`: a thief drawn among 10 (`event_theft_type0` = "one hen") | No | None |
| `haunting`, `mothman`, `dejavu`, `graffiti` | Text | No | None |
| Trait events (`chicken_feast`, `brawl`, `fight`, `m_curious`, `curious1/2`, `klepto`) | Races `chicken`, `aggressive`, `curious`, `rogue` | No | Out of scope |
| `slave_death1-3` | Trait `slaver` | No | Out of scope |

**Nothing in `events.js` displays a character** apart from the player's cat/dog. Visitors, thieves, arsonists only get a sentence.

### 2d. Animals, linked or not to buildings

| Kit animal | Placement (`kit/world.js`) | Link with the game |
|---|---|---|
| Deer ×2 (`deer_*`, `antlers_layer`) | Edge of the trees (`world.js:130`, `222-226`) | **No link** with the lodge. Ambient scenery, present for everyone |
| Boar ×1 | Edge (`world.js:131`, `227-228`) | No link |
| Pigs (boar recolored `rosewash`/`rose`) ×2 | At the first 2 `farm` buildings (`world.js:229-232`) | Linked to the `farm` building: good. But the game has **no livestock breeding**: the farm only produces food (`src/actions.js:1729-1765`) |
| Rabbits ×3 | Near the bushes, absent in the rain (`world.js:132`, `233-236`) | Scenery |
| Fish ×2 | Bodies of water (`world.js:133`, `243-248`) | Scenery |
| Cat on the roof | First `basic_housing`, tier ≥ 2 (`village.js:426-441`) | Linked to a building, not to the game's pet |

No hunting animal is linked to the lodge/smokehouse in the game code: the hunter is a number that produces food and furs (`src/main.js:4042-4061`). No farm animal exists (no cow, sheep, hen). The smokehouse increases the food stock (`src/actions.js:1588-1616`). The `compost` is reserved to `detritivore` races (`src/tech.js` `compost`, `trait: ['detritivore']`).

## 3. Citizen states and animations

"Mechanism" = exists as a concept in the code. "Kit" = the `compose()` compositor (`kit/citizens.js:100-155`) can only do 4 modes: `idle`, `walk`, `work`, `guard` (`kit/citizens.js:98`), plus back/front and mirroring.

| State | Exists in the game? (evidence) | Handled by the kit? |
|---|---|---|
| At work | Yes, an assigned job | Yes: cycle idle, walk, work, return (`kit/citizens.js:233-247`) |
| Walking | Implicit | Yes, 4 frames, front and back (`kit/citizens.js:112`) |
| Guarding | Stationed soldiers | Yes, `guard` pose (`kit/citizens.js:236`) |
| Carrying resources | No transport mechanic (except teamster) | Only the teamster (cart, sack or fur, `kit/citizens.js:122-127`). No other job carries anything |
| **Wounded** | **Yes**: `garrison.wounded` (`src/civics.js:94`, `src/main.js:11685-11748`, `src/events.js:150-153`) | **No** |
| **Dead** | **Yes**: famine (`src/main.js:3860-3866`), `soldierDeath` (`src/civics.js:2130-2137`), cave-in (`src/events.js:539-543`), eruption (`src/events.js:98-100`) | **No**: the sprites disappear with no other effect (the number drops) |
| **Starving / famine** | **Yes**: `global.stats.starved` (`src/main.js:3860-3865`), `hunger` (`src/main.js:4026-4036`) | **No** |
| Fighting | **Yes**: campaigns (`src/civics.js:1548+`), raids suffered (`src/events.js:133+`) | **No**. Only the `guard` pose exists |
| Marching to a campaign | **Yes**: battalion `garrison.raid` | **No** |
| Recruit training | **Yes**: `garrison.progress` (`src/main.js:8052`) | **No** |
| Riot / demonstration | **Yes**: `protest` (`src/events.js:420-455`), `tax_revolt` (`src/events.js:398-418`, `1198-1213`), `garrison.protest` (`src/main.js:3159`) | **No** |
| On strike | **No**: no strike mechanic | Not applicable |
| Celebrating | Partial: the entertainer raises morale (`src/jobs.js:250`), `banquet` is tied to an achievement (`src/actions.js:3472-3481`), `parade` is out of scope (`world_control`, `parade` event in `src/events.js`) | Partial: the entertainer plays the lute at the amphitheatre. No crowd |
| Low or high morale | **Yes**: `city.morale.current` (`src/main.js:3275`) | `ic_face` icon only (`COUVERTURE-KIT.md`). Not on the citizens |
| Sick | **No** in Era 1. Disease: Tau Ceti plague (`src/main.js:12549-12571`) and trait `infectious` | Not applicable |
| Baby / child | **No**: a birth just adds +1 citizen (`src/main.js:3973-3976`), no age | Not applicable. No child sprite |
| Old / retired | **No** | Not applicable. `hair_silver` is drawn at random as a color (`kit/citizens.js:46`), not tied to an age |
| Mourning | **No** | Not applicable |
| Building | No: construction is instantaneous (`payCosts`). The kit has a scaffolding (`kit/village.js:391`) | No builder |
| Sleeping / night | **No**: no night behavior on the game side. The kit has a day and night cycle for rendering (`kit/world.js` `DAY`) | Citizens unchanged at night (no reference to `night`/`moon` in `kit/citizens.js`) |
| Walking in a group | No | No (each citizen has its own cycle) |
| Winter / rain | **Yes, morale effects**: winter −5 (`src/main.js:1329-1337`), rain −2, storm −5 (`src/main.js:1402-1416`). Seasons `calendar.season` | **No**: no seasonal clothing (`kit/citizens.js` reads neither season nor weather) |

Compositor limits: work mode limited to `strike` (hit), `gesture` (gesture), `guard` (guard) and `idle` (`kit/citizens.js:26-44`). At most 40 citizens drawn (`kit/citizens.js:212`), at most `1 + ceil(sqrt(n))` per job (`kit/citizens.js:161`). The `soldier` job reads `civic.garrison.workers` (`kit/citizens.js:162`).

## 4. Population variety (human)

What the kit draws at random (`kit/citizens.js:46-64`): 3 skin tones, 5 hair colors, 4 haircuts, 7 secondary clothing colors, a hat at 80%, a "fl" (accessory) at 60%. Single 16×24 silhouette (`kit/citizens.js:2`).

Limits observed, without inventing anything:
- **Age**: no child or elder variant. The game has no age either, so this is not a fidelity defect, it is a cosmetic choice.
- **Gender**: the game code has no gender field (no result for `gender|female|male`). The `long`, `braid`, `bun` haircuts exist. The silhouettes (tunic or dress) are tied to the job, not to a gender.
- **Height / build**: a single silhouette.
- **Facial hair**: no beard among the 4 haircuts.
- **Winter / rain clothing**: absent, even though seasons exist and are rendered in the scenery (winter: −5 morale on the game side).
- **Complexion**: the game text describes the human as "pink-skinned bipedal creatures" (`strings.json`, `race_human_entity`). Three tones, one of them dark, are a kit choice, not a game constraint.
- **Races**: the human alone, in accordance with report 8. The other races are not done.
- **Outfit per job**: a single base palette per archetype (`kit/citizens.js:16-25`), the variety comes from the two accessories and the secondary color. Citizens of the same job therefore look alike in their outfit.

## 5. Missing items to add

Sorted by priority. "Trigger" = condition to read in `global` to make the element appear. Dimensions are indicative, within the kit's template (32×32 cell, 16×24 body at (8,8), `kit/citizens.js:13`). Each proposal is a **layer** or a piece to add in `kit/citizens.js` / `kit/pieces_b5.js`, never a rewrite.

### Priority 1: concepts present in the game, visible in every playthrough

| # | Missing item | Sprite / layer description | Trigger in `global` |
|---|---|---|---|
| P1-1 | **Wounded soldiers** | Layer `fl_bandage_head` (≈ 8×4 px, cream headband stained with `madder`, placed on the head) and/or arm in a sling `arm_sling`. `sit` pose (seated, 2 frames) in front of the barracks or the hospital. The wounded no longer carry spear or shield | `global.civic.garrison.wounded` (`src/civics.js:94`). Number drawn = `min(wounded, visible soldiers)`, proportional to `wounded / workers`. The hospital (`global.city.hospital.count`) is the resting place (`src/main.js:11689`) |
| P1-2 | **Winter clothing** | Layer `fl_winter_coat` (thick fur cape, `hide`/`cream`, 12×10 on the torso) and fur cap `hat_fur`. Tunic recolored in darker tones. Visible scarf | `global.city.calendar.season === 3` (`src/main.js:1329`), or `global.city.calendar.temp === 0` (cold, `src/events.js:828-850`). The kit already has `ctx.season` on the village side |
| P1-3 | **Rain hood** | Layer `fl_rain_hood` (hood `soot`/`hide`, 10×6) and hunched shoulders (1 px offset) | `global.city.calendar.weather === 0 && global.city.calendar.temp > 0` (rain, `src/main.js:1402-1417`). The kit can already detect rain (`kit/world.js`, `rain`) |
| P1-4 | **Campaign: column of marching soldiers** | Marching soldier (4 existing frames) plus banner `tool_banner` (6×14, pole plus `madder` cloth). Leaves the barracks toward the edge of the map, then returns with plundered sacks (existing `unit_sack`) or a wounded man | Increment of `global.stats.attacks` (`src/civics.js:1565`) or `global.civic.garrison.raid > 0` at the moment of the click. Size = `raid / workers` |
| P1-5 | **Raid or siege suffered** | Archetype `enemy`: same body as `soldier` with `soot`/`madder` outfit, torch `tool_torch` (4×8, `ember` flame). 3 to 6 silhouettes enter from the edge, 8 seconds, then flee (if repelled) or leave loaded (if pillage). Fire on a roof in case of defeat | `global.event.l` equals `'raid'`, `'siege'` or `'pillage0..3'` right after the draw (`src/main.js:12729`). Outcome: compare money before and after, or read `global.civic.garrison.wounded` |
| P1-6 | **Craftsman: carried object depending on the manufacture** | Four small pieces carried or placed beside: `unit_planks` (8×5), `unit_bricks` (8×5), `unit_wrought_bar` (8×4), `unit_sheet` (8×6, flat bluish sheet). The craftsman holds one | `global.city.foundry.Plywood / Brick / Wrought_Iron / Sheet_Metal` > 0 (`src/jobs.js:825-880`). Proportional split among the drawn craftsmen |

### Priority 2: secondary states faithful to the game

| # | Missing item | Description | Trigger |
|---|---|---|---|
| P2-1 | **Famine** | "Hands on the belly" pose (new `arm_belly`), crossed-out `ic_food` bubble above the head. Paler complexion (`skin` variation), reduced walking speed | `global.resource.Food.amount <= 0` with `global.resource.Food.diff < 0` (`src/main.js:3843-3866`). **To verify**: the exact field used is `diff`, not confirmed for food alone |
| P2-2 | **Riot / demonstration** | Crowd of 4 to 8 citizens on the square, arms raised (existing `arm_raise`), placards `tool_placard` (8×10, wood plus `cream` panel), dull colors | `global.civic.govern.protest > 0` (`src/events.js:429-453`, `src/main.js:1133`); `global.event.l === 'tax_revolt'` for the riot, with torches and fire on a stock (`src/events.js:1198-1213`) |
| P2-3 | **Fire** | Flames on the lumber_yard or the sawmill (4 `fx_fire` flame frames, 12×16), thick smoke. 6 seconds | `global.event.l === 'fire'` (`src/events.js:62-75`) |
| P2-4 | **Actual pet** | Cat on the ground (`cat_walk`, `cat_sit`) and dog (`dog_sit`, `dog_walk`, 8×7). Replaces the roof cat when `race.pet` exists, or is added to it. Color according to the name | `global.race.pet` (`type`, `name`, `color`, `pattern`, `src/events.js:995-1007`, `src/functions.js:2395-2420`) |
| P2-5 | **Merchant / caravan** | The game has none. To illustrate trade: archetype `finance` with the existing `cart_box`, entering from the edge toward the `trade` post | `global.city.market.mtrade > 0` and at least one resource with `trade != 0` (`src/main.js:10626-10631`). **Mark as non-faithful cosmetic** |
| P2-6 | **Builder on a construction site** | Craftsman (`craft`) in work mode near the scaffolding, hammer and plank (`unit_planks`) | Active site in `SCAF` (`kit/village.js:370`, `391`). Internal to the kit |
| P2-7 | **Mercenaries** | Same soldiers with a different outfit (`hide` leather, no shield, `saffron` armband) | `global.civic.garrison.m_use > 0` (`src/civics.js:1160`). Proportion `m_use / workers` |
| P2-8 | **Recruit training** | Soldier in `strike` mode against a `sig_weapon_rack` dummy (already in the kit) | `global.civic.garrison.rate > 0` (`src/main.js:8052`) |
| P2-9 | **Death of a miner or a soldier** | Small stone or wooden cross `grave_mark` (6×8) plus fly or smoke, 20 seconds. No gore | Drop in `global.resource[species].amount` or `global.stats.died` (`src/civics.js:2135`). One draw per death is too frequent: rate-limit it |

### Priority 3: visual comfort, low or zero fidelity

| # | Missing item | Description | Trigger |
|---|---|---|---|
| P3-1 | **Festival / high morale** | Crowd raising their arms around the amphitheatre; the kit's `bunting` and `lantern` already drawn. No precise game mechanic | `global.city.morale.current` above a threshold to be set (`src/main.js:3275`) |
| P3-2 | **Spies** | 1 to 3 dark hooded silhouettes (`hat_hood` plus cape), at the edge of the village. The game shows no spy | `global.civic.foreign.gov0..2.spy > 0` (`src/civics.js:760-790`). Mark as cosmetic |
| P3-3 | **Night / sleep** | Citizens going into a house at night, lantern door | Kit cycle (`kit/world.js` `DAY`). **No mechanic in the game** |
| P3-4 | **Children** | Reduced 12×18 variant coming out of a cabin when the population grows. **No age in the game**: purely cosmetic | Increment of `global.resource[species].amount` (`src/main.js:3973-3976`) |
| P3-5 | **Game-linked animal pens** | They do not exist in the code. Add nothing except as an aesthetic decision | |
| P3-6 | **Outfit variety** | More base color archetypes per job, beard, build | `look()` (`kit/citizens.js:51-65`) |

### To remove or relabel in the documents

- **Report 8**: classify `hunter`, `forager`, `teamster`, `priest`, `scientist` as "race or path" (it already does so for others) and add lodge and smokehouse to this list. The five jobs stay in the kit, but are never active for a standard human.
- The kit's `at` plan for `hunter` (`lodge`, `smokehouse`): not applicable to the human.

## 6. Doubts / not verified

- **Nothing was executed.** No game was launched. Unlocks are read from `reqs`, `grant`, `trait`, `not_trait` and `condition` (`src/tech.js`, `src/actions.js`). The real order in the game is not confirmed.
- **`trait: [...]` classification in a tech**: I interpreted `trait` as "the player must have this trait" (reading of `src/actions.js:5913-5925` for buildings; for techs it is the same pattern, but I did not re-read the tech control code line by line).
- **`hunter` for the human**: `hunter.display` is only set once in `src/actions.js:8842` (and in the migration `src/vars.js:715-725`). I checked by text search on `civic.hunter` that no other place displays it.
- **Scientist**: classified as outside Era 1 because `high_tech` is given by `mad_science` in the `discovery` era. I did not verify whether another path (`wardenclyffe` building outside `high_tech`) exists. The block `src/actions.js:9130-9131` (`professor` and `scientist` displayed) belongs to a scenario start (`cataclysm` or similar), not to the standard game.
- **Priest**: the gene dependency is read at three sites. I did not verify whether the `theocracy` government changes anything for a player without the gene.
- **Meditator**: deduced from `main.js:2255-2256` (`if(global.race['fasting'])` plus `display = true`). The context of the enclosing loop was not re-read in full.
- **Teamster**: I did not check whether the game displays the job even without `gravity_well` in an old save. The common case is excluded.
- **Thresholds**: "high" morale threshold for the festival (P3-1) not defined; `global.resource.Food.diff` for famine not confirmed field by field.
- **Event frequency**: I read `Math.rand(0, global.event.t) === 0` (`src/main.js:12723`) without measuring the real cadence (depends on the game loop). Event animations must be queued and not assumed to be frequent.
- **`garrison.workers` includes mercenaries, wounded and the battalion on campaign** (`src/civics.js:1163-1167`, `src/events.js:150-153`): the kit therefore draws all stationed soldiers even though some are away or wounded. I did not verify whether `garrison.max` vs `workers` can exceed the visible number (the kit caps at 40 sprites in total).
- **Wiki (`wiki`)**: not consulted.
- **Hospital**: the `hospital` tech requires `alumina: 1` (`bayer_process`, civilized, `src/tech.js:1987-1994`, `7397-7410`). The complete path to that tech (smelting 2) is not described here.
- **Kit**: I read `kit/citizens.js` in full and the relevant parts of `kit/world.js` and `kit/village.js`. I did not re-read the 58 citizen pieces one by one (list taken from `project-docs/audit/COUVERTURE-KIT.md`).
