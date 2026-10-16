# E2 - Evolution phase: what the player sees and experiences (read-only audit)

Sources: `src/` (Evolve 1.4.10 fork), `anki-village.js`, `README-FORK.md`, `strings/strings.json`.
Paths below are relative to `src/` unless stated otherwise. The game was not launched. The durations (section 5) come from a small simulation written from the formulas in the code, not from a measurement.
The lines come from greps and partial reads; passages marked "not verified" are collected in section 7.

## 0. Structuring facts (read first)

| # | Fact | Source |
|---|---|---|
| 1 | While `species === 'protoplasm'`, there is NO advancing calendar: `global.city.calendar.day` stays at 0 (the increment is in `longLoop`, which is entirely skipped for protoplasm) and the calendar block of the top bar is hidden by `v-show="city.calendar.day"`. | main.js:11534 (`if species !== 'protoplasm'` opens the whole longLoop up to 12719), main.js:11776-11778, index.js:909 |
| 2 | The "time" that passes: fastLoop every 250 ms, midLoop every 4 fastLoops (1 s), longLoop every 20 fastLoops (5 s = 1 "day"). RNA/DNA are produced in fastLoop with `time_multiplier = 0.25`, i.e. a factor of 1 per real second. | vars.js:2275, functions.js:145-170, main.js:844-862, main.js:880 |
| 3 | No planet/world name during evolution: the top bar shows `races.protoplasm.home` = "Prehistoric"; the popover shows "Life on this planet is in its infancy and still evolving." | index.js:902 (`{{ race.species | planet }}`), main.js:605-607, main.js:633-635, races.js:4998-5003, strings `race_prehistoric`, `infant` |
| 4 | The biome exists (`global.city.biome`, default value `'grassland'` in a new game) but is displayed nowhere during evolution. It only influences the `evo_warn_unwise` text of the genus buttons (hellscape) and the eligibility of a few genera (aquatic, etc.). | vars.js:1873, actions.js:340-370 (genera), actions.js:282,307 |
| 5 | The game is in English (`en-US`); there is no French locale file. The labels are therefore English. | locale.js:44-60, strings/ (13 locales, no fr) |
| 6 | A fork-specific host already exists: `anki-village.js` loads the kit and displays a fixed panel under the UI. In protoplasm it calls `stop()` and only displays a text note + RNA/DNA; it only creates the canvas (`SpriteKit.run`) if `species !== 'protoplasm'`. It reads `window.evolve.global` via `setInterval(tick, 1000)`. The `KIT` list does NOT contain `evolution` (it will need to be added). | anki-village.js:4-6, 47-55, 61-64 |
| 7 | At sentience, `tech.evo` and all `tech.evo_*` are deleted and `global.evolution = {}`. So `tech.evo === 8` is never durably observable: plan 12 lists it as step 8; in practice we go from 7 to (species ≠ protoplasm) in the same call. | actions.js:8347 sqq., see 6 |

## 1. UI: branches conditioned on protoplasm / evoFinalMenu

### 1.1 `species === 'protoplasm'` (or `!==`) branches

| File:line | Condition | What it does during evolution |
|---|---|---|
| main.js:633-635 | `popover('topBarPlanet')` | Bar popover: `infant` text (instead of the planet sheet). |
| main.js:774 | init at load | `RNA.display = true`. Applies the `mloaded` / `gmloaded` perks (see 4). Then `drawEvolution()` (except bigbang / seeded without choice). |
| main.js:817-834 | `universe==='bigbang'` or `seeded && !chose` | `genPlanets()` (planet choice) instead of `drawEvolution()`. Does not happen in a first playthrough. Otherwise `drawEvolution()`. |
| main.js:1219-1285 | fastLoop, start | Evolution loop: RNA/DNA production, unlocking of actions (see 1.3). The big `else` (1286-8009, all of the civilization) is skipped. |
| main.js:8135-8185 | midLoop | Computes the RNA/DNA caps, then sets the CSS classes `cna` / `cnam` on the evolution buttons according to affordability. The `else` (8186-11522) is skipped, including `checkAchievements()` (11173). |
| main.js:11534 | longLoop | The whole beginning of longLoop is skipped (calendar, seasons, weather, moon, wind, etc.). What remains: major events (12722+), saving, pausing. |
| main.js:12740 | longLoop | MINOR events (`m_event`) skipped. |
| main.js:12827 | longLoop | Save warning skipped. |
| index.js:446, 552-597, 622, 680 | tabs | The Civil / Gov. / Research tabs: `drawCity`, `renderSpace`, `renderFortress`, `renderTauCeti`, `renderEdenic`, `drawTech`, garrison, etc. are not drawn. |
| resources.js:675-680 | `defineResources` | Creates the `RNA` and `DNA` resources (base cap 100, +50 per `mass_extinction` level beyond 1). The other resources exist but with `display=false`. |
| resources.js:765 | `tradeSummery` | Trade counters not initialized. |
| actions.js:6639 | `postBuild` | After an action with `grant`, calls `drawEvolution()` (not `drawCity` etc.). |
| vars.js:1102 | migration < 1.3.0 | Off topic (conversion of old saves). |
| vars.js:2013 | `newGameData()` | New game: `race = { species:'protoplasm', gods:'none', old_gods:'none', seeded:false }`, `new:true`. |
| events.js:16, 30 | `reqs.race:'protoplasm'` | Two dedicated events: `dna_replication`, `rna_meteor` (see 1.6). |
| functions.js:3179, space.js:6568, achieve.js:659 | misc | Exclusions of `protoplasm` in species lists (unrelated to the screen). |

### 1.2 `global.race['evoFinalMenu']` branches

| File:line | Role |
|---|---|
| actions.js:30, 43, 59, 78, 102, 123, 145 | The 7 base actions (rna, dna, membrane, organelles, nucleus, eukaryotic_cell, mitochondria) are no longer displayed if `evoFinalMenu` is set. |
| actions.js:5188 | "Evolve <race>" buttons hidden if `evoFinalMenu` (they must be hidden in favor of the "Imitate" buttons). |
| actions.js:5230 | "Imitate <race>" buttons (`s-<race>`) visible only if `evoFinalMenu` and if `stats.synth[race]` (or beta). |
| actions.js:5358 | `bunker` action (Challenge Gene) hidden if `evoFinalMenu`. |
| actions.js:5407-5410 | `drawEvolution` shows neither the progress bar nor the challenge screen if `evoFinalMenu`. |
| actions.js:8337 | Only place that sets `evoFinalMenu`: `evoExtraState(race)` when choosing `synth` or a custom/hybrid race with the `imitation` trait AND `Object.keys(stats.synth).length > 1`. |

Conclusion: `evoFinalMenu` does not concern a human player in a first playthrough (synthetics must have been unlocked).

### 1.3 What the "Evolve" tab contains (human, animal, mammals, humanoid)

The `#evolution` tab is the main tab as long as `settings.showEvolve === true` (default true, vars.js:1308; reset to true on reset vars.js:2418; set to false at sentience actions.js:8642). `drawEvolution` adds a `<div class="action">` for each action whose `reqs` are satisfied (actions.js:5373-5410). Each action is an `a.button.is-dark` button with a title, an optional `count` counter and a description/cost popover (actions.js:6206-6330). Buttons have no image and no icon: text only.

| Action | id | Visible when | Cost (formula) | Effect |
|---|---|---|---|---|
| RNA | evolution-rna | `RNA.display` (set at main.js:774) | none | +1 RNA per click (+2 if `rapid_mutation`), if RNA < max. actions.js:22-37 |
| Form DNA | evolution-dna | `DNA.display` and DNA < max | 2 RNA | +1 DNA. actions.js:38-55 |
| Membrane | evolution-membrane | key `evolution.membrane` exists | RNA 2 + 2n | RNA max +5 (+5 per mitochondrion). actions.js:56-75 |
| Organelles | evolution-organelles | key exists | RNA 12 + 8n; DNA 4 + 4n | +1 RNA/s (+1 if evo>=2). actions.js:76-98 |
| Nucleus | evolution-nucleus | key exists | RNA 38 + (32 or 16 if evo>=4)n; DNA 18 + (16 or 12 if evo>=4)n | consumes 2 RNA/s per nucleus, creates 1 DNA/s (2 if evo>=5). actions.js:99-120 |
| Eukaryotic Cell | evolution-eukaryotic_cell | key exists | RNA 20 + 20n; DNA 40 + 12n | DNA max +10 (+10 per mitochondrion). actions.js:121-142 |
| Mitochondria | evolution-mitochondria | key exists | RNA 75 + 50n; DNA 65 + 35n | multiplies the effect of membranes and cells. actions.js:143-157 |
| Sexual Reproduction | evolution-sexual_reproduction | `tech.evo === 1` | DNA 150 | `evo`→2, `evolution.final = 20`. actions.js:159-178 |
| Phagocytosis | evolution-phagocytosis | `evo === 2` | DNA 175 | `evo`→3, `tech.evo_animal=1`, `final=40`. actions.js:179-199 |
| (Chloroplasts / Chitin) | | `evo === 2` | DNA 175 | other branches, not played here. Visible next to Phagocytosis: the player sees three fork buttons at step 2. actions.js:200-250 |
| Multicellular | evolution-multicellular | `evo === 3` | DNA 200 | `evo`→4, `final=60`. actions.js:~290-310 |
| (Spores / Poikilohydric) | | `evo === 4` and fungal/plant branch | DNA 230 | not applicable to the animal. |
| Bilateral Symmetry | evolution-bilateral_symmetry | `evo === 4` and `evo_animal` | DNA 230 | `evo`→5, `final=80`, sets `evo_insectoid/mammals/eggshell/eldritch/aquatic/fey/sand/heat/polar = 1`. actions.js:342-370 |
| (Arthropods, Eggshell, Aquatic, Fey, Heat, Polar, Sand, Eldritch...) | | `evo === 5` | DNA 245-260 | parallel paths: the player sees several buttons at step 5 (some are conditioned on biome or achievement). |
| Mammals | evolution-mammals | `evo === 5` and `evo_mammals` | DNA 245 | `evo`→6, `final=90`, `evo_humanoid/giant/small/animalism/demonic/angelic = 1`. actions.js:423-448 |
| Humanoids | evolution-humanoid | `evo === 6`, `evo_humanoid`, and `genus_condition(6)` (final < 100) | DNA 260 | `evo`→7, `tech.evo_humanoid=2`, `final=100`. actions.js:449-470 |
| (Gigantism, Dwarfism, Beast, Celestial, Demonic) | | `evo === 6` | DNA 250-260 | parallel paths at step 6; Celestial/Demonic depending on biome or `blood.unbound`. |
| Sentience | evolution-sentience | `evo === 7` and `final === 100` | RNA 300 + DNA 300 | calls `sentience()` with the chosen species. actions.js:869-922 |
| "Evolve <race>" buttons (`evolution-<race>`) | | `evo===7`, `final===100`, genus at level 2, AND (`race.seeded` OR `mass_extinction` OR `extinct_<race>`) | RNA 320 + DNA 320 | Not in a first playthrough. actions.js:5159-5200 |
| "evolving" bar | `.evolving > progress` | `tech.evo >= 2` | | `<progress value=final max=100>`. Redrawn only by `drawEvolution` (after an action with `grant`). actions.js:8106-8110, 5407-5410 |

Important points:
- At step 7 (humanoid done), the "Sentience" button is the only one that leads to the village in a first playthrough; the "Human" race is imposed by the fork (`[anki-fork]`, actions.js:~907-910) when the genus is humanoid.
- Challenges (Challenge Gene: plasmid, crispr, trade, craft, junker, joyless, steelen, etc.) and the `bunker` button only appear if `global.genes['challenge']` (actions.js:5358, 4394-4560). Not in a first playthrough.
- The bulk of the sequential unlocking (one step per tick, `else if`): main.js:1252-1283.

### 1.4 Panels outside the tab

| Area | Content during evolution | Source |
|---|---|---|
| Top bar | Name "Prehistoric" (planet), universe badge hidden if `standard`, calendar hidden (day=0), pause button hidden (it is in the calendar block: one cannot pause from the bar). | index.js:899-917 |
| Left column, header | "Protoplasm" (popover `race_protoplasm_desc`); morale and power hidden. | index.js:933-938, main.js:303-320 |
| Message log | Present, filters according to `settings.msgFilters`. At sentience the `progress` message appears. | index.js:940-960 |
| Build queue `#buildQueue` | Hidden except `global.queue.display` (`queue` gene only). | index.js:~937, vars.js:2433-2436 |
| Resources `#resources` | Only RNA then DNA, each with a name (`info` color), counter, "+x /s" and a fill bar background (`--percent-full`, class `showBar`). | resources.js:675-680, 797-880, main.js:1180-1185 (diffCalc), evolve.less:1639-1655 |
| Main bar tabs | Only "Evolve" is visible (`showEvolve`). Civil, Civics, Research, Resources, ARPA, Stats are hidden; "Stats/Achievements" appears only when `showAchieve` becomes true (achieve.js:349, 389). | index.js:1169-1230, vars.js:1308-1309 |
| Button popup | Title, description, costs with color according to affordability, effect. | actions.js:7256 (`actionDesc`) |

### 1.5 Calendar, seasons, weather, moon, wind

| Field | During evolution | Evidence |
|---|---|---|
| `city.calendar.day` | 0, does not move | main.js:11776 `if day > 0`, never reached (longLoop skipped); `resetCommon` sets 0 (resets.js:1265) |
| `year`, `season`, `weather`, `temp`, `moon`, `wind`, `orbit` | frozen default values (`season 0`, `weather 2`, `temp 1`, `moon 0`, `wind 0`, `orbit 365` or that of the planet after a reset) | vars.js:1849-1872 |
| `setWeather()` | is not called (`else` branch of main.js:829-834 only for the rest of the game) | main.js:829-834 |
| `city.sun/cold/hot` | 0 | vars.js:1837-1845 |
| Start of era 1 | `calendar.day = 0` reset to zero at sentience; the day only becomes 1 after a first action (`day++` in actions.js:9141, 9384, tech.js:112 depending on the case). Not verified in detail. | actions.js:8581 |

Conclusion: prompt 12 is right not to rely on `calendar`; it is inert and gives neither time nor season.

### 1.6 Random events, messages, achievements, feats

| Subject | Finding | Source |
|---|---|---|
| Major events | Drawn in longLoop (every 5 s): `if Math.rand(0, event.t) === 0`. `event.t` is 200 at creation (vars.js:23-26; reset to 100 on reset vars.js:2401), decreases by 1 per longLoop, then goes back to 999 after each event. So the first event occurs after ~200 longLoops at the latest (~17 min), often earlier. Condition: `!seeded || chose`. | main.js:12722-12738, vars.js:23-26 |
| Possible events in protoplasm | Only `dna_replication` (DNA + rand(1, DNA.max/3), message `event_dna`) and `rna_meteor` (RNA + rand(1, RNA.max/2), message `event_rna`). `inspiration` requires `Knowledge.display` (false); `fire` requires Lumber; the others require techs. The event does not repeat twice in a row (`event.l`). | events.js:15-37, eventList events.js:1110-1190 |
| Formatting | `messageQueue(msg,'caution',false,['events','major_events'])`: orange text in the log. | main.js:12727 |
| Minor events | none (skipped) | main.js:12740 |
| Achievements / feats | No `checkAchievements()` during evolution (in the `else` of midLoop). The plan can assume that no achievement is awarded. Possible exceptions: dated events (see 7). | main.js:11173 vs 8186 |
| Log | Evolution messages: no message at each step (organelle purchases and steps produce no message). Only: DNA/RNA events, and at the end `sentience` (type `info`, filter `progress`). | actions.js:8719-8724 |
| Save | `save.setItem('evolved', ...)` at each longLoop (5 s), even during evolution. | main.js:12805-12812 |
| Offline/pause | `webWorker` Worker `evolve/evolve.js` sends the tick; `execGameLoops` catches up at most 12 days (240 ticks) per call. Pause button not visible (day=0). | main.js:836-865 |

## 2. Visuals already present (to avoid duplication)

| Element | Detail | Source |
|---|---|---|
| Theme | Classes `html.<theme>` (default `gruvboxDark`: background #282828, text #ebdbb2, link #8ec07c, `has-text-advanced` #458588, caution #fe8019, danger #fb4934). Ten other themes in `evolve.less`. | vars.js:1308-1313, evolve.less:517-540, 2167+ |
| Action buttons | `.action .button.is-dark`, states `.cna` (unaffordable) and `.cnam` (over cap) with colors `@cnam-aTitle`, `.hl` (highlighted), counter `.count`. No organelle pictogram. | evolve.less:1378-1470, actions.js:6206-6330 |
| Resource bar | Gradient background by `--percent-full` (`.resource.showBar`). | evolve.less:1639-1655 |
| `final` progress bar | `<progress class="progress">`, value #898989 (depending on theme), style `.evolving` and `.evolving::after`. | evolve.less:2842-2860, 1967-1970 |
| Icons | No image of an organelle or cell. The only icons in the game: SVG gear (modals), weather/moon icons (`lib/weather-icons.min.css`, hidden during evolution), tab/favicon icon `evolved.ico`, `challengeIcon`/`drawPet` (challenge and pet icons in the top bar; `drawPet()` is also called during evolution, main.js:772, but `showPet()` depends on a trait). | index.html:5-10, main.js:771-772, functions.js (`drawIcon`) |
| CSS animations | `@keyframes`: `color-change` (1017), `shake` (5067), `bang` (5370), `gravity` (5375), `position` (5385), `noise` (5441, background `lib/noise.png`). None is tied to evolution. `bigbang` (collapse) is used for the vacuum reset. Loading spinner `lds-dual-ring` in `index.html`. | evolve.less, index.html:23-45 |
| Sounds | None (no occurrence of `Audio`, `.play()`, `.mp3` in `src/` outside the wiki). | grep |
| Font | system stack (README-FORK: a missing Lato falls back to the system stack). | README-FORK.md |
| Other | `fool` classes (April 1st) applied to `body`; popovers `has-background-light has-text-dark`. | main.js:12790-12800 |

To avoid duplicating: RNA/DNA bars (the game already has resource bars under the labels) and the `final` progress bar (the game has one from `evo>=2`). The arc and the gauges of the scene will be redundant; the value lies rather in the form (arc/ring, French labels) and in their place in the bottom panel. The `anki-village.js` host already displays a text "Evolution phase: the pond ... RNA n · DNA n".

## 3. Final species choice screen

| Question | Answer | Source |
|---|---|---|
| When does it appear? | When `tech.evo === 7` and `evolution.final === 100` (after Humanoids for the human path). Appearing there: "Sentience" + (if unlocked) the "Evolve <race>" buttons of that genus. | actions.js:869-880, 5159-5200 |
| Does a human in a first playthrough go through it? | Yes, but the screen is reduced to a single "Sentience" button (300 RNA + 300 DNA); the per-race buttons require `seeded` or `mass_extinction` or `extinct_<race>`. The fork forces `human` for the humanoid genus. | actions.js:5159-5185, 907-910 |
| `evo_pick_race` | String `Evolve into a %0. This completes evolution.`: not used by the buttons of the first playthrough (non-exhaustive grep). | strings.json |
| `evo_imitate` / `evoFinalMenu` | "Imitate <race>" buttons; only after having chosen `synth` or a race with the imitation trait, with `stats.synth` > 1 entry. Not in a first playthrough. | actions.js:5217-5250, 8335-8346 |
| `evo_bunker` | Challenge Gene: requires `genes.challenge`. Not in a first playthrough. | actions.js:5352-5375 |
| Scenarios | `junker, cataclysm, banana, truepath, lone_survivor, fasting, warlord`: visible only in the challenge screen (after `bunker`). Not in a first playthrough. | actions.js:4394-4560 |

## 4. Modes and prestiges that change evolution (human, first playthrough)

In a first playthrough (blank stats, `genes`, `prestige` at 0): no mode changes evolution. Detail of the existing levers, to know what to read:

| Lever | Effect on evolution | Condition (field to read) | Source |
|---|---|---|---|
| `mloaded` (`master` feat) | Pre-fills membrane/organelles/nucleus at 2×rank, eukaryotic/mito at rank, `tech.evo = 2`, `dna=1`. | `stats.feat.master` AND `achieve.ascended.l>0`; or `global.sim` (rank 5) | main.js:776-795 |
| `gmloaded` (grandmaster) | `tech.evo = 6`, `evolution.gselect = true`, `final = 80`, genus techs all set. Shortened evolution, all paths open. | `feat.grandmaster` + `achieve.corrupted`, rank >= 5 | main.js:796-815 |
| `novice` feat | RNA + (rank/2)/s and DNA + (rank/4)/s. | `feat.novice` + `achieve.apocalypse.l>0` | main.js:1244-1253 |
| `mass_extinction` (achievement) | RNA/DNA caps +50 per level beyond 1; when DNA is unlocked, fills RNA and DNA to the maximum. Unlocks the "Evolve <race>" buttons. | `achieve.mass_extinction.l` | main.js:1262-1270, 8137-8139, actions.js:5159 |
| `rapid_mutation` (race trait kept across resets) | RNA per click 2 instead of 1; +1 per organelle. | `race.rapid_mutation` | actions.js:22-26, 1241 |
| `global_multiplier` | Plasmids, supercoiled, `challenge >= 2`, `ascended`, `corruption`, etc. multiply RNA/DNA. First playthrough: 1. | `prestige.*.count`, `genes.challenge`, `race.ascended` | main.js:891-1000 |
| Genes / `genes.evolve` | On entering era 1 (not during evolution): random minor traits. | `genes.evolve` | actions.js:8668-8678 |
| Difficulty (challenges) | See 3: require Challenge Gene. In the screen, `race.no_plasmid`, `nerfed`, `badgenes`, `no_crispr`, etc. | `race.*` | actions.js:5260-5340 |
| `race.universe` | `bigbang`: no evolution (`drawEvolution` exits immediately, planet generated). `heavy`, `magic`, `evil`, `antimatter`, `micro`: mostly modify era 1; `micro` shows an alert in the challenges. | actions.js:5379, main.js:817 |
| `race.seeded` + `chose` | After a "bioseed" reset: `seeded=true`, the planet is chosen first (`genPlanets`), `chose` set afterwards. | main.js:817-834 |

### Resets that bring back to `protoplasm`

| Function | File:line | Reset |
|---|---|---|
| `warhead` | resets.js:7 | Nuclear war (Mutually assured destruction); `species:'protoplasm'` line at 58. |
| `bioseed` | resets.js:87 (species at 198) | Seeding: new planet, `seeded=true`, back to evolution. |
| `cataclysm_end` | resets.js:227 (402) | End of the cataclysm scenario. |
| `big_bang` | resets.js:320 (501) | Big Bang (`bigbang` universe). |
| `vacuumCollapse` | resets.js:431 (602) | Vacuum collapse. |
| `ascend` | resets.js:532 (723) | Ascension. |
| `descension` | resets.js:633 (813) | Descension. |
| `apotheosis` | resets.js:748 (906) | Apotheosis. |
| `terraform` | resets.js:844 (985) | Terraforming. |
| `aiApocalypse` | resets.js:934 (1068) | AI apocalypse. |
| `matrix` | resets.js:1010 (1153) | Matrix. |
| `retirement` | resets.js:1095 (1238)| Retirement. |
| `gardenOfEden` | resets.js:1180 (not looked up) | Garden of Eden: to verify (see 7). |
| `exitSim` | actions.js:9020-9023 | Exit from simulation: resets `species='protoplasm'` then reloads the page. |
| `resetCommon` | resets.js:1264 | Common function: recreates `global.city` with `calendar.day = 0`, `tech = { theology: 1 }`, `new = true`, new `seed`. |
| Hard reset | vars.js:2438-2444 | `localStorage.removeItem('evolved')` + reload. |
| New game | vars.js:2012-2016 | `newGameData()`: `species:'protoplasm'`, `new:true`. |

Detecting a "new start": read fields that change at each reset: `global.seed` (new number at each reset, `Math.rand(0,10000)`), `global.stats.days` (reset to 0, vars.js:2403; `tdays` cumulative), `global.race.species` back to `'protoplasm'` after having been something else, `global.evolution` empty (`{}`), `global.resource` empty. `global.new` is true right after. A simple host-side detector: remember the last `species` and `seed`; if `species` becomes `'protoplasm'` again or if `seed` changes, it is a new start. `global.race.seeded` true => the planet has just been chosen; `global.city.biome`, `ptrait`, `calendar.orbit` may then be non-default. Details not verified in section 7.

## 5. Pace (estimates derived from the code)

Formulas: RNA per second = organelles × (1 + [evo>=2]) × `global_multiplier` (1 in a first playthrough); DNA per second = nuclei (×2 if evo>=5), limited by available RNA (2 RNA consumed per nucleus); one RNA click = +1; one DNA click = 2 RNA into 1 DNA. Caps: RNA = 100 + 5×membranes (×(mito+1)); DNA = 100 + 10×eukaryotic cells (×(mito+1)). Characteristic: the step targets (150 to 300 DNA) exceed the base cap of 100, so eukaryotic cells must be built (>=5 for 150, 8 for 175, 10 for 200, 13 for 230, 15 for 245, 16 for 260, 20 for 300, without mitochondria; fewer with mitochondria).

Unlocks (one per tick, main.js:1252-1283): DNA visible at RNA>=2; membrane at RNA>=10; organelles at DNA>=4; nucleus at 2 organelles; eukaryotic at 1 nucleus; mitochondria at 1 eukaryotic; `tech.evo = 1` as soon as the `mitochondria` key exists (without having built it).

Greedy simulation (throwaway script in the scratchpad, not optimal, 3 RNA clicks/s, no bonus):

| Step | Time reached (s) | Step duration |
|---|---|---|
| evo 1 (soup, mitochondria unlocked) | ~180 (3 min) | ~3 min |
| evo 2 (Sexual Reproduction bought) | ~630 | ~7.5 min |
| evo 3 (Phagocytosis) | ~1120 | ~8 min |
| evo 4 (Multicellular) | ~1280 | ~2.7 min |
| evo 5 (Bilateral Symmetry) | ~1440 | ~2.7 min |
| evo 6 (Mammals) | ~1455 | ~15 s |
| evo 7 (Humanoids, final=100) | ~1470 | ~15 s |
| Sentience (300 RNA + 300 DNA) | ~1490 (~25 min) | ~20 s |

Reading: about 25 minutes with an active player who clicks at 3/s and buys optimally; more likely 25 to 45 minutes. Without any click, the starting loop does not start (10 RNA per click are needed for the first membrane and 12 RNA + 4 DNA for the first organelle). Steps 4 to 7 are short because the cells are already built: the animations of steps 6 and 7 must be able to play in a few seconds and overlap. Steps 2 and 3 are the longest (the bottleneck is the eukaryotic cell to build to raise the DNA cap). Each organelle purchase typically comes every few seconds to tens of seconds. Sizing: a `tech.evo` change every 2 to 8 minutes; a `count` change every 3 to 30 s; a DNA/RNA event (message) occasionally, unpredictable.

## 6. End of evolution: `sentience()` on the interface side

Trigger: "Sentience" button (actions.js:869-922) or "Evolve <race>" (actions.js:5159) or `evoExtraState`. `sentience()`: actions.js:8347-8976.

| Order | Visible effect / state | Line |
|---|---|---|
| 1 | `RNA.display = false` and `DNA.display = false`: the resources disappear. | 8361-8366 |
| 2 | Removes the base evolution buttons (code checks `global.race[...]`, probably ineffective); `global.evolution = {}`; deletes `tech.evo` and all `tech.evo_*`. | 8383-8392 (and ~8470) |
| 3 | Genus and species traits set (`global.race[trait]`), `maintype = 'humanoid'`; `combineTraits()`. | 8400-8460 |
| 4 | `clearElement($('#resources')); defineResources()`: rebuilds the resource panel; `Lumber.display = true` (or Stone for kindling_kindred/smoldering). | 8556-8562 |
| 5 | `registerTech('club')`; `global.city.calendar.day = 0`. | 8564, 8581 |
| 6 | City buttons `food`, `lumber`, `stone` (added if `global.city[...]` exists). | 8583-8595 |
| 7 | `settings.civTabs = 1; showEvolve = false; showCiv = true; showCity = true`. The Evolve tab disappears, the Civil tab ("Camp") opens. | 8642-8645 |
| 8 | `civic.govern.type = 'anarchy'`, names of the three foreign nations drawn (`foreign.gov0..2`). | 8647-8715 |
| 9 | Log message (`loc('sentience')`): "Congratulations! You have evolved into a humanoid species of <entity> called Human." (type `info`, filter `progress`). | 8719-8724 |
| 10 | Jobs and government: `defineJobs(true)`, `commisionGarrison()`, `defineGovernment(true)`; `civic.d_job = 'unemployed'` (or hunter/forager depending on traits), `unemployed.display = true`. | 8838-8870 |
| 11 | `adept` feat bonus (food/stone/wood). | 8885-8900 |
| 12 | Rendering: if `settings.tabLoad`: `drawCity()`, `defineGovernment`, `defineGarrison`, `buildGarrison`, `foreignGov`, `defineIndustry`, tradeSummery, `arpa(...)`. Otherwise `loadTab('mTabCivil')`. | 8919-8960 |
| 13 | Full page reload only if trait `slow`/`hyper` or species `junker`; not for a human. | 8970-8976 |

First screen of era 1: "Civil" tab > "Camp" tab (`tab_city1`), with the "Gather"/food, wood, stone buttons; rebuilt resource panel (Food, Lumber, Stone according to `display`); Research tab visible as soon as Lumber >= 5 or Stone >= 6 (main.js:7912); top bar: the day stays hidden until `calendar.day > 0`.

Fields of `global`: absent -> present (or changed) at sentience:

| Field | Before (evolution) | After |
|---|---|---|
| `race.species` | `'protoplasm'` | `'human'` (fork) |
| `race.maintype`, genus/species traits | absent | present |
| `race.inactiveTraits` | `{}` | `{}` (created if absent) |
| `evolution` | `{rna?, membrane, ...}` with `final` | `{}` |
| `tech.evo`, `tech.evo_*` | present | deleted |
| `tech.club` | absent | set by `registerTech('club')` (exact value not verified) |
| `tech.theology` | 1 (set by reset; new game: see 7) | same |
| `resource.RNA/DNA.display` | true | false |
| `resource.Lumber.display` | false | true (or Stone) |
| `resource.Food/Stone` | exist, display false | displayed when the first button unlocks them |
| `city.calendar.day` | 0 | 0 (becomes 1 later) |
| `city.food/lumber/stone` | absent | `global.city.*` created at first purchase/click via `initStruct` (behavior not verified in detail) |
| `civic.govern.type` | default | `'anarchy'` |
| `civic.d_job` | default | `'unemployed'` (or `hunter` / `forager`) |
| `civic.unemployed.display` | false | true |
| `civic.foreign.gov0..2.name` | absent | `{s0,s1}` |
| `settings.showEvolve / showCiv / showCity / civTabs` | true / false / false / 0 | false / true / true / 1 |
| `stats.days` | 0 | 0 (incremented as soon as `calendar.day > 0`) |
| `resource[<species>]` (e.g. `resource.human`) | created from `defineResources` with `loadResource(race.species)` (name of `protoplasm` during evolution) | recreated for `human` at sentience by `defineResources()` |

For the host: the switch criterion is `race.species !== 'protoplasm'`. The game's rendering switches in the same tick as the change; `anki-village.js` detects it via a 1 s `setInterval` (up to 1 s late).

## 7. Doubts / not verified

- The pace simulation is greedy and assumes 3 RNA clicks/s; it does not account for real reading time or random events (`dna_replication`, `rna_meteor`).
- `calendar.day` at 1 after exactly which action: only the locations `actions.js:9141, 9384`, `tech.js:112` were noted, not read.
- `gardenOfEden`: function listed (resets.js:1180) but `species` line not noted; cross-check with the AST before relying on it. The reset forms listed are deduced from the exported functions of `resets.js` and the `species:'protoplasm'` lines (12 occurrences): the function -> line mapping is approximate.
- `evolve.less`: read only by grep (lines 517, 1378-1470, 1639-1655, 1967, 2842-2860, 5067-5441). A possible style specific to `#evolution` (5294) was not read.
- Achievements / feats: the conclusion "none during evolution" comes from the absence of `checkAchievements()` in the protoplasm branch of midLoop and from the skipping of longLoop; achievements triggered elsewhere (actions, dated events Halloween/Easter/April 1st, `drawAchieve({fool:true})`, `unlockAchieve` in actions.js:9499-9505) were not explored for the evolution phase.
- Dated events (Easter, Halloween, April 1st, Christmas) may modify the UI (`fool` class, eggs/treats bound in the loop, `tech.santa`). Not examined in the evolution phase (main.js:8110-8131, 12780-12800).
- `drawPet()` / `challengeIcon()` in the evolution phase: called but not read.
- `message_logs` / filters in a first playthrough: filter visibility not verified; the sentience message is filed under the `progress` filter.
- `tech.club` set by `registerTech('club')`: content of this function not read. `tech.theology` in a new game not verified (resets: `{ theology: 1 }`).
- `city.ptrait` in a new game (default value) not verified; `city.biome` defaulting to `grassland` (vars.js:1873) verified. The host could read `city.ptrait`: unreliable without verification.
- `evo_pick_race`: I did not look for all its uses; probably used for the `evolution-<race>` buttons (tooltip).
- The exact bounds of the actions.js lines cited with `~` are approximate.
- `pause`: the button is in the hidden calendar block; `settings.pause` can still be set by keyboard shortcut or by import; not verified.
- No test in a browser; `evolve/main.js` (build) may differ from `src/` if not rebuilt.

## 8. Gaps with prompt 12

| Prompt 12 says | Finding | Severity |
|---|---|---|
| "`city.biome` only tints the water. Do not rely on `calendar`" | Correct: inert calendar (day 0). Biome = `grassland` in a first playthrough (never anything else before a reset). | OK |
| `tech.evo` 1..8 | `evo` 8 does not exist durably: `sentience()` deletes `tech.evo` within the call. 7 is the last observable value. | Medium: the flip is detected by `species`, not by `evo===8`. |
| `evolution.final` human path: 0, 20, 40, 60, 80, 90, 100 | Correct (20 sexual, 40 phago, 60 multicell, 80 bilateral, 90 mammals, 100 humanoid). But `evolution.final` is ABSENT before the purchase of Sexual Reproduction (not 0); the bar only exists from `evo>=2`. | Low: read `final` with default 0. |
| `evo` 1 = soup | `tech.evo = 1` as soon as the `mitochondria` key exists, even at `count = 0`. Step 1 therefore covers the whole beginning (RNA, DNA, membrane, organelles, nucleus, cell, mito). | Medium: the "cell parts as built" may appear before `evo=1`. |
| `evolution.{membrane, organelles, nucleus, eukaryotic_cell, mitochondria}.count` (key sometimes absent) | Correct. They appear one by one (RNA>=10 membrane; DNA>=4 organelles; ...). `evolution.dna` (number 1) too. | OK |
| `resource.RNA` and `resource.DNA` (`amount`, `max`) | Correct. `DNA` absent from the display while `display` is false (RNA>=2). The `resource.DNA` object still exists from `defineResources`. | OK |
| "Human path only: 1 soup, 2 sexual reproduction, 3 phagocytosis, 4 multicellular, 5 bilateral symmetry, 6 mammals, 7 humanoid, 8 sentience" | Steps 2/3 ALSO show chloroplasts, chitin (and exterminate under condition) as choices; step 5 shows the Arthropods, Eggshell, Aquatic... paths; step 6 other genera. The player sees buttons for non-human paths (the plan does not draw them, which is consistent) but the game's UI offers them. The animal is chosen by Phagocytosis (`evo_animal`). | Low |
| "mammals at 6, small furred mammal; 7 upright ape" | At game level: `tech.evo===6` AND `evo_humanoid===1` gives the choice between Humanoids, Gigantism, Dwarfism, Beast, Celestial/Demonic. The plan is only valid if the player takes Humanoids. | Medium: provide a default state if `tech.evo_giant/small/animalism === 2` (not human). |
| "8 first human beside a fire_ring, then the village takes over" | At sentience: log message, Evolve tab hidden, Civil tab selected. The game makes no transition; the plan is free. Reminder: the `anki-village.js` host only starts `SpriteKit.run` after `species !== 'protoplasm'`; the plan wants `render` to handle the flip itself, which requires changing the host (launch the runner during protoplasm, add `evolution` to `KIT`). | High: host modification to add to the plan. |
| Prompt 12: `SpriteKit.handoff()` | No API in the current host; `anki-village.js` does not call `handoff`. | Medium |
| "Do not rely on calendar... Use your own clock" | Consistent: there is no clock in the game during evolution. | OK |
| No mention of the "Sentience" button (RNA 300 + DNA 300) as a final step in two phases | After humanoid (DNA 260), RNA 300 + DNA 300 are still needed: the player stays at `evo=7`, `final=100` until they can pay; non-zero duration (typically 10-60 s), RNA cap of 300 required. | Medium: step 7 must be able to last. |
| Plan: "mitochondria = bean bodies that glow when producing" | Mitochondria do not "produce" anything: they only multiply the effect of membranes and cells (caps). Only organelles produce RNA and nuclei produce DNA. | Low: link the halo to organelles/nuclei, or to `RNA`/`DNA` rising. |
| Plan: "organelles = drifting bodies emitting RNA specks" | Consistent (organelles produce RNA). Nucleus consumes RNA for DNA: consistent with "glowing centre"; note that it only produces if DNA < max. | OK |
| Plan: "eukaryotic cell = the large main cell" | The eukaryotic cell raises the DNA cap; each purchase raises the cap by 10 (by mito +10). There can be up to 20: a single "large main cell" is a simplification. | Low |

## 9. Visual elements/effects to add to the prompt (by priority, with trigger in `global`)

| Priority | Element | Trigger |
|---|---|---|
| P0 | Switch detection: read `race.species !== 'protoplasm'` (not `tech.evo===8`). In the host, start the runner during protoplasm and add `evolution` to `KIT`; remove the placeholder text. | `race.species` |
| P0 | New start after reset: reinitialize the scene when `species` becomes `'protoplasm'` again after another value, or when `global.seed` changes, or when `stats.days` falls back to 0 while the scene was in era 1. Provide an "empty pond" state (RNA only) when `resource.RNA.display` is true and `evolution` is empty. | `race.species`, `seed`, empty `evolution` |
| P0 | Initial state: at the very beginning, nothing but RNA (no DNA, no organelles); the first click gives +1 RNA. The pond must look good with zero counters. | `evolution` without keys; `resource.DNA.display` false |
| P0 | Defensive reading: `evolution.final` absent before evo 2 (default 0); `tech.evo` absent before evo 1 (the `mitochondria` key drives evo 1). | `tech.evo`, `evolution.final` |
| P1 | Scene for the lasting step 7: humanoid done (`tech.evo===7`, `final===100`) but not yet sentient: ape + waiting (fire not yet lit); the transition animation to the village triggers at the flip. | `tech.evo === 7`, `final === 100`, `race.species` |
| P1 | Evolution flash at each `tech.evo` change (2 to 7) and when `final` is crossed (20, 40, 60, 80, 90, 100). Frequency: every 2 to 8 minutes; do not tie to `count`. | `tech.evo`, `evolution.final` |
| P1 | Small purchase effects: each increment of `evolution.<x>.count` makes the piece appear (flash of 4 to 8 frames); typical pace 3 to 30 s; beyond 24, particle density. The caps `resource.RNA.max` and `DNA.max` give the size of the "pond" (100 -> 400+). | `evolution.*.count`, `resource.*.max` |
| P1 | `dna_replication` / `rna_meteor` events: a burst (DNA spores or small shooting star) when the log receives the message; detectable by a sudden jump of `resource.RNA.amount` or `DNA.amount` (more than 1/3 of max) between two reads, or by `global.event.l` equal to `'rna_meteor'` / `'dna_replication'` (last event). | `event.l` |
| P1 | Path choice at step 2: the game offers Phagocytosis / Chloroplasts / Chitin; the human scene only draws the animal. If `tech.evo_plant` or `tech.evo_fungi` is set, fall back to the generic pond ("not drawn", no error). | `tech.evo_animal`, `evo_plant`, `evo_fungi` |
| P1 | Non-human path at the genus level (step 6): `tech.evo_giant === 2`, `evo_small === 2`, `evo_animalism >= 2`, `evo_demonic`, `evo_angelic`, `evo_eggshell`...: keep a stage table for later; in the meantime, draw the generic mammal. | `tech.evo_*` |
| P2 | Mitochondria: halo according to the cap multiplier (`resource.*.max` vs base), not according to a "production". | `evolution.mitochondria.count` |
| P2 | RNA/DNA fill gauge: consistent with the game's resource bars (already present in the left panel); `final` arc redundant with the game's `<progress>` (displayed only from `evo>=2`). | `resource.*.amount/max`, `evolution.final` |
| P2 | Biome tint: `city.biome` is `grassland` in a first playthrough; other values only arrive after a reset; `city.ptrait`/`geology` unreliable. | `city.biome` |
| P2 | Waiting resource for Sentience: show 300/300 RNA and DNA (a small "ready" indicator) when `tech.evo===7` to help the player understand that something is missing. | `tech.evo`, `resource.*` |
| P3 | First screen of era 1: the transition scene must target the "Camp" tab (city); `calendar.day` stays 0 for a while: do not drive the scene's clock from it. | `race.species`, `city.calendar.day` |
| P3 | Perks (`mloaded`, `gmloaded`): if `evolution.mloaded` or `gmloaded` equal 1, the scene starts with several organelles and `tech.evo>=2` (or 6) from the first read: plan not to replay all the step animations (instant catch-up). | `evolution.mloaded`, `evolution.gmloaded`, `evolution.gselect` |
| P3 | Sounds: the game has none; do not add any (offline rule and consistency). | n/a |

## 10. Files consulted

`src/main.js`, `index.js`, `actions.js`, `vars.js`, `events.js`, `resources.js`, `resets.js`, `races.js` (protoplasm), `functions.js` (loopTimers, gameLoop, flib), `locale.js`, `evolve.less` (by grep), `anki-village.js`, `index.html`, `README-FORK.md`, `strings/strings.json`, `project-docs/prompts/12-prompt-cd-evolution-court.md`. Simulation script: throwaway, kept in a scratchpad directory, not part of the repository.
