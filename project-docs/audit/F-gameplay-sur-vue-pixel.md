# F - Feasibility: Evolve's gameplay directly on the pixel-art view (phone)

Date: 2026-10-16. Read-only analysis. **Nothing was executed**: neither the game, nor the kit, nor a browser. Everything comes from reading `src/*.js` (line numbers from the current repository), `anki-village.js` and `kit/*.js`. Points marked (?) are unverified hypotheses.

## 0. Verdict in five lines

1. **Feasible, and less hard than expected for Era 0 and Era 1 actions**: buildings, techs and evolution actions are `actions.X.Y` objects with `cost`, `action()`, `effect()`, `desc()`. They can be called without a DOM (`payCosts` and `adjustCosts` only use `global`).
2. **The real cost is not calling the actions, it is everything else**: knowing what to display (visibility, prerequisites, HTML descriptions), redoing the screens that live in non-exported Vue closures (jobs, crafting, routes, energy, campaigns, government), and drawing a touch interface in pixels (long text, scrolling lists, ~11,600 strings none of which is in French).
3. **Hide the original interface (display:none), do not delete it.** The game calls `$('#id')`, `vBind({el:'#id'})` and Popper everywhere; without a DOM, jQuery stays harmless but Vue 2 emits warnings and some states go out of sync (?).
4. **There is no notion of position in the game.** "I choose where to place" is a change of model (option 3 below); options 1 and 2 stay within the model.
5. **Recommendation: thin pixel-art HUD + touch decision panels for the core (build, assign, research), and the original full-screen interface behind a button for everything else** (section 8).

**Useful observation**: `window.evolve.actions` already exists (`debug.js:16`, a copy that keeps functions by reference). The idea can therefore be tested **without modifying the source**: `window.evolve.actions.city.basic_housing.action({isQueue:false})` from the console (not tried).

---

## 1. Inventory of player actions (Era 0 and Era 1, human, first game)

Legend "call without DOM": **A** = `actions.<region>.<key>.action({isQueue:false})` directly callable; **V** = logic locked inside a Vue method / a non-exported closure (to be rewritten on the API side, or exported); **F** = function exported from a module.

Reminder: on click, the game goes through `runAction(c_action, action, type)` (`actions.js:6490`), which adds around `c_action.action()` the build queue, the key multiplier (`keyMultiplier`, `vars.js:2026`, depends on the x10/x25/x100 keys if `settings.mKeys`), inflation, then `postBuild` (`actions.js:6626`). `runAction` is **not exported**: either export it, or rewrite it (~120 lines with the queue).

| # | Player action | Where | Call without DOM | Depends on | Side effects |
|---|---|---|---|---|---|
| 1 | Click RNA | `actions.js:23` `evolution.rna.action` | **A**. No effect if `RNA.amount >= max`. | `modRes('RNA', 1 or 2, true)` | no message; no redraw |
| 2 | Form DNA (2 RNA -> 1 DNA) | `actions.js:39` | **A** | `modRes` x2 | none |
| 3 | Buy an evolution (membrane, organelles, nucleus, ~40 lineage choices: phagocytosis, chloroplasts, multicellular, bilateral, mammals, humanoid... sentience) | `actions.js:55-869` (`evolution.*`), cost via `evolveCosts` (`actions.js:5673`) | **A** for the counters; purchases that advance the tree have `grant:[tech,n]`, hence then `postBuild` (redraw via `drawEvolution`, `actions.js:5373`) | `payCosts($(this)[0])`: `this` must be the action object | `postBuild` -> `drawEvolution` (DOM), `callback_queue` for `post` |
| 4 | Sentience (end of Era 0, start of Era 1) | `actions.js:869`, `sentience()` `actions.js:8347` | **A** | 300 RNA + 300 DNA; the fork forces `human` | changes the whole interface, messages, `global.race` |
| 5 | Gather Food / Lumber / Stone / Chrysotile | `actions.js:1090 / 1153 / 1206 / 1257` (`city.food`, etc.) | **A** (returns `false`, no cost except Mana) | `global.settings.pause`, `modRes(...,true)`, `val()` (strength, `enhance` gene, `conjuring`) | `global.stats.cfood++`; no message |
| 6 | Slaughter a slave (`slaughter`), slave market | `actions.js:1307`, `1354` | **A** (traits only; irrelevant for a standard human) | traits | - |
| 7 | **Build a building** | `actions.js:933-4222` (`city.*`, 60 entries) | **A**, but better to use a copy of `runAction` to get queue + multiplier + `postBuild` | `payCosts` -> `adjustCosts` (`functions.js:1759`) -> `checkCosts` (`actions.js:7681`); `incrementStruct` (`space.js:6703`) | `postBuild`: `updateDesc` (DOM), `callback_queue`; `drawCity/drawTech` only if `grant`/`refresh` |
| 8 | Build in queue (if `tech.queue`: action refused for lack of resources) | `actions.js:6490+` (`default` branch) | **V**: the queue is in `runAction` | `global.queue.queue`, `global.queue.max` | `buildQueue()` (`functions.js:448`) redraws `#buildQueue` (DOM + Vue, protected by `try`) |
| 9 | **Buy a tech** | `runAction` case `tech` -> `checkTechRequirements` (`actions.js:5881`) -> `c_action.action()` -> `gainTech` (`6006`) | **F** for `gainTech`, **V** for the sequence | `tech.js` (15,725 lines), `global.tech[...]` | `gainTech` calls `drawCity, drawTech, renderSpace, renderFortress, renderTauCeti, renderEdenic` (all DOM); `callback_queue` for `post` |
| 10 | Research queue (if `tech.r_queue`) | inside `runAction` (case `tech`), `resQueue` `actions.js:9561` | **V** | `global.r_queue.queue`, `.max` | `resQueue()` + `drawTech()` (DOM) |
| 11 | **Assign / remove a job** | `jobs.js:588` `add()`, `jobs.js:601` `sub()` (Vue methods in `loadJob`, `jobs.js:479`); default job `setDefault` `jobs.js:634` | **V**. These are "»", "«" buttons (**no sliders**), 1 worker per click (x10/x25/x100 with the keys). Trivial rewrite: `workers++`, `civic[d_job].workers--`, `assigned = workers` (with a `max` check) | `global.civic[job].workers/max`, `global.civic.d_job` | no message; Vue updates itself |
| 12 | Servants | `jobs.js:551 / 563` | **V** (irrelevant for a standard human) | `global.race.servants` | - |
| 13 | Craftsmen (foundry: Plywood, Brick, Wrought_Iron, Sheet_Metal, ...) | `loadFoundry` `jobs.js:825` (buttons in a closure) | **V**. Caps via `craftsmanCap` `jobs.js:736`, `limitCraftsmen` `jobs.js:763` (exported) | `global.city.foundry[res]`, `global.civic.craftsman` | `limitCraftsmen` has an `allow_redraw` parameter (?) |
| 14 | Manual crafting (+1 / +5 / +10 / A buttons) | `resources.js:916` `craft(res, vol)` (Vue method of `loadResource`, buttons l.860) | **V** (rewrite ~25 lines: `craftCost(true)` and `craftingRatio` are exported) | `craftCost`, `craftingRatio(res,'manual')`, `race.no_craft` | none |
| 15 | Taxes (+/-) | `civics.js:1019` `adjustTax(a,n)`, `taxCap` `992` (not exported); **but** `govCivics('adj_tax','add'/'sub')` and `govCivics('tax_cap',min)` are exported (`civics.js:1105`) | **F** via `govCivics` | `global.civic.taxes.tax_rate`, government, traits | none |
| 16 | Government (choose / revolution) | `civics.js:286` `government()`, modal `drawGovModal` `373`, buttons `setGov('autocracy')`... | **V** (Buefy modal `trigModal`) | `global.civic.govern` | DOM modal, messages |
| 17 | Army: mercenaries | `civics.js:1152` `hireMerc`; `govCivics('m_buy')` / `('m_cost')` | **F** via `govCivics` | `Money`, `garrison.workers/max` | none |
| 18 | Campaigns (attack, buy, annex, occupy) | `civics.js:1548` `war_campaign`, `battleAssessment` `1495`, `foreignGov` panel `489` | **V**: not exported, called from Vue buttons (l.635, 1273) | `global.civic.foreign.gov0..2`, `garrison.raid`, `armyRating` (exported `civics.js:2140`) | losses, messages, events |
| 19 | Spies (train, influence, sabotage, incite) | `govCivics('t_spy'/'s_cost'/'s_influence'/'s_sabotage'/'s_incite', i)` | **F** via `govCivics` | `global.civic.foreign`, money | messages |
| 20 | Trade: import/export routes | `resources.js:1540` `autoBuy`, `1573` `autoSell` (Vue methods of `marketItem`, `1388`) | **V** (rewrite ~30 lines; `importRouteEnabled/exportRouteEnabled` not exported l.1380/1360) | `global.city.market.trade/mtrade`, `global.resource[res].trade` | `tradeRouteColor` (DOM, `resources.js:2395`) |
| 21 | **No manual buying/selling** at the market: only continuous routes. Indicative prices: `tradeBuyPrice` / `tradeSellPrice` (exported) | `resources.js:2004 / 1960` | **F** | - | - |
| 22 | Crates (storage): build / assign | `buildCrate` `resources.js:2432`, `assignCrate` `1853`, `unassignCrate` `1839` (not exported) | **V** | `Plywood`, `Crates` | - |
| 23 | Energy ON/OFF of a building (if `high_tech >= 2`) | `actions.js:6382` `power_on()` and the following `power_off()` (Vue methods in `setAction`) | **V** (rewrite: `global[region][type].on` +/-1 between 0 and `count`, then `callback_queue.set([c_action,'postPower'],[true/false])`; `callback_queue` is exported `vars.js:62`) | `global.*.on`, `count` | `postPower` for some buildings |
| 24 | Special panel of a building (`special` cogwheel) | `setAction` `trigModal`, `c_action.sAction()`, `drawModal` `actions.js:7876` | **V** (Buefy modal, variable content) | - | modal |
| 25 | Pause / resume | `main.js:571-585` method `pause()` (also key `#pausegame`); `global.settings.pause` | **V** (mutate `settings.pause`, then `gameLoop('start')` if `!webWorker.s`; `gameLoop` exported `functions.js:112`) | `webWorker.s` | - |
| 26 | Options (language, themes, keys, save, import/export, reset) | `index.js`, `main.js` (Vue `settings`), `resets.js:81/222` | DOM | `global.settings.*` | sometimes reload |
| 27 | Achievements, feats, wiki | `achieve.js`, `wiki/` | DOM | - | - |
| 28 | Governor, ARPA, genes, blood | `governor.js:363`, `arpa.js`, `actions.js` | outside the first game | - | - |

### Era 1 buildings
`actions.city` has 60 entries (`actions.js:933-4222`), distributed by `category` (grep: `outskirts` 7, `residential` 7, `commercial` 9, `science` 4, `military` 3, `trade` 9, `industrial` 14, `utility` 7). The kit knows 27 types (`kit/village.js:27-33`): `basic_housing, cottage, lodge, smokehouse, farm, compost, mill, silo, garrison, hospital, shed, storage_yard, bank, lumber_yard, sawmill, rock_quarry, cement_plant, foundry, smelter, metal_refinery, mine, coal_mine, trade, temple, amphitheatre, library, university`. According to `SYNTHESE.md`, `lodge`, `smokehouse`, `compost` are unreachable for a human.
Techs: grep of the `era:` entries in `tech.js`: 5 (primitive), 115 (civilized), 46 (discovery), 39 (industrialized), all branches combined; many are hidden by `not_trait`, `path`, etc.

### Visibility predicates (to be copied into the API, without DOM)
- Evolution: `reqs` satisfied + `checkTechQualifications` (hence `condition()`), `drawEvolution` `actions.js:5373-5399`.
- Building: `checkCityRequirements` `actions.js:5846` + `setAction`, which calls `checkTechQualifications` (`actions.js:6211`).
- Tech: `checkTechPath` (not exported, `5866`) + `checkTechQualifications` + `checkTechRequirements` + `!checkOldTech`, `drawTech` `actions.js:6085`. Sorted by `cost.Knowledge`.
- "Greyed out" state: classes `cna` (not enough right now) and `cnam` (beyond the storage cap) via `checkAffordable(c, false/true)`, `actions.js:6228-6233`.

### Points of attention
- **`this`**: the `action()` functions use `payCosts($(this)[0])` and `$(this)[0].val(...)`. `actions.city.x.action(...)` must be called as a **method**.
- **`window.evolve.actions` copy**: `deepClone` (`functions.js:2810`) copies the objects and keeps the functions; `this` there is a clone, the functions close over the real `global`. To be avoided for the final version: expose the real object.
- **Original touch mode**: `actionDesc` (`actions.js:7262`) shows a "Build" button in the popover when `settings.touch` is true. The other tests are written `match(/Mobi/ && global.settings.touch)` (`functions.js:72, 91`; `actions.js:6348`), which reduces to `match(true/undefined)` and probably behaves differently from what was intended (?). Do not rely on it.
- **Quantity**: the multiplier comes from keyboard keys (`keyMap`); on a phone, pass the number explicitly (`adjustTax(a,n)` allows it, `add()`/`sub()` do not).

---

## 2. How to expose the actions

### 2.1 The entry point
The `evolve/main.js` bundle (2.3 MB, minified, `buildEvolve.js`) is an ES module: nothing is global. The kit only sees `window.evolve` (created in `debug.js:14`, `global` refreshed by `updateDebugData`).

**Minimal entry point**: a new file `src/api.js`, imported from `src/main.js` (which already imports all the relevant modules, lines 1-24), that assigns `window.EvolveAPI = {...}`. Precedent in the fork: `window.ankiCredit` at `main.js:12988`. Only `export`s are added in front of a few private functions (`runAction`, `adjustTax`, `taxCap`, `hireMerc`, `war_campaign`...), or the gestures locked in Vue (jobs, crafting, routes, energy) are rewritten in `api.js`: about thirty lines each.

### 2.2 The functions/objects to expose

| # | Name | Source | Exported today? | Role |
|---|---|---|---|---|
| 1 | `global` (**live**, not the copy) | `vars.js:2` | yes | write (`workers`, `on`); read without cloning |
| 2 | `actions` | `actions.js:21` | yes | catalogue: `cost`, `desc`, `effect`, `reqs`, `category`, `id`, `title` |
| 3 | `runAction` (public: `act(region,type)`) | `actions.js:6490` | **no** (to export) | single entry point for every purchase |
| 4 | `postBuild` | `actions.js:6626` | yes | called by `runAction` |
| 5 | `gainTech` | `actions.js:6006` | yes | |
| 6 | `checkAffordable(c, max, raw)` | `actions.js:7570` | yes | button greyed out or not |
| 7 | `adjustCosts(c, offset)` | `functions.js:1759` | yes | real costs |
| 8 | `checkCityRequirements(name)` | `actions.js:5846` | yes | building visible |
| 9 | `checkTechRequirements`, `checkTechQualifications` | `actions.js:5881 / 5913` | yes | tech visible |
| 10 | `checkOldTech`, `checkTechPath` | `actions.js:5955 / 5866` | **no** | tech already acquired / path |
| 11 | `timeCheck(c, track, detailed)` | `functions.js:911` | yes | time before the price is reached (no `$(`) |
| 12 | `modRes` | `functions.js:680` | yes | resources |
| 13 | `loc` | `locale.js:7` | yes | text |
| 14 | `keyMultiplier`, `keyMap` | `vars.js:2026` | yes | force a multiplier |
| 15 | `callback_queue` | `vars.js:62` | yes | `post`/`postPower` |
| 16 | `buildQueue`, `resQueue`, `drawCity`, `drawTech`, `drawEvolution` | `functions.js:448`, `actions.js:9561 / 6018 / 6085 / 5373` | yes | redraws of the hidden interface |
| 17 | `govCivics(f,v)` | `civics.js:1105` | yes | taxes, mercenaries, spies |
| 18 | `armyRating`, `garrisonSize` | `civics.js:2140 / 2391` | yes | army strength |
| 19 | `craftCost(true)`, `craftingRatio` | `resources.js:177` | yes | crafting |
| 20 | `tradeBuyPrice`, `tradeSellPrice` | `resources.js:2004 / 1960` | yes | prices |
| 21 | `limitCraftsmen`, `craftsmanCap`, `jobScale`, `workerScale` | `jobs.js:763 / 736 / 441 / 413` | yes | job caps |
| 22 | `messageQueue` (and the messages array) | `functions.js:364` | function yes; `message_logs` to be checked (?) | log |
| 23 | `gameLoop`, `webWorker` | `functions.js:112`, `vars.js` | yes | pause/resume |
| 24 | `save`, `LZString` | `vars.js:1`, `lib/lz-string.min.js` | yes | save export |
| 25 | `adjustTax`, `taxCap` (with `n`) | `civics.js:1019 / 992` | **no** (reachable via `govCivics`) | taxes |
| 26 | `war_campaign(gov)` | `civics.js:1548` | **no** | campaigns |
| 27 | `importRouteEnabled`, `exportRouteEnabled`, `tradeRouteColor` | `resources.js:1380 / 1360 / 2395` | **no** | routes |
| 28 | `buildCrate`, `assignCrate`, `unassignCrate` | `resources.js:2432 / 1853 / 1839` | **no** | storage |
| 29 | `breakdown` | `vars.js` | yes | production detail |
| 30 | `updateDebugData` | `debug.js:41` | yes | refresh the copy after a gesture |

For tier A (build, assign, research, gather, evolve), items 1-9, 11-16, 21, 30 are enough (~20).

### 2.3 Risks if the original DOM is absent
- **jQuery**: `$('#x').html/append/addClass` on an empty set = no effect, no exception.
- **Vue 2**: `new Vue({el:'#id'})` on a missing id = console warning, instance not mounted. `vBind` (`functions.js:1131`) tests the length before accessing `__vue__`. Probably no crash (?).
- **`popover`** (`functions.js:18`): binds events on `$(opts.elm)`; without an element, does nothing.
- **`updateDesc`** (`actions.js:7518`): `$('#popper').data('id')` = `undefined`, no exception.
- **What can break**: any unguarded `$(...)[0].xxx`. I did not audit the 151 lines of `main.js` that contain `$(`: **not verified**.
- **Trap**: `drawCity` (`actions.js:6018`) and `drawTech` (`6085`) `return` if the current tab is not the right one (`global.settings.civTabs`), except with the `tabLoad` option. Since the kit computes its own list, this is not blocking, but the hidden interface may be stale when one returns to it.

### 2.4 Hide or delete?
**Hide.**
1. The game updates its DOM by construction (reactive Vue on `global.*` + jQuery in `fastLoop`/`midLoop`/`longLoop`, `main.js:882 / 8133 / 11531`). Deleting it requires re-auditing these 150 locations plus `functions.js`, `civics.js`...
2. Keeps the **fallback screen** (section 5).
3. The modals (government, special panels) are Buefy components attached to the DOM: they can be shown over the village.

**Performance cost of the hidden interface: not measured.** Reasoning (?):
- `display:none` removes layout and painting, not the Vue watchers or jQuery modifications.
- The loop runs in a Web Worker (`evolve/evolve.js`), 250 ms tick (`functions.js:155`), `fastLoop` on every tick, `midLoop`/`longLoop` every `midRatio`/`longRatio`.
- **One certain cost is already paid**: `updateDebugData()` does `deepClone(global)` + `craftCost(true)` + `deepClone(breakdown)` **on every `fastLoop`** (`main.js:8101`, `debug.js:41`), i.e. ~4 times per second, on a `global` that also contains `space`, `portal`, `tauceti`, `stats`. Probably heavier than the hidden interface on a phone. To be measured first. Leads: clone only the subtrees read by the kit, or give the kit a live read-only reference.
- Mobile background: the Worker is not throttled like the page's `setTimeout` but Android may suspend the tab (?). Catch-up capped at 1 minute of game time (`execGameLoops`, `main.js:853-864`).

---

## 3. Information to display: where the game computes it

| Information | Computation | Outside the DOM? |
|---|---|---|
| **Real cost** | `adjustCosts(c, offset)` (`functions.js:1759`) chains ~14 adjustments (`bloatAdjust`, `inflationAdjust`, `lMatAdjust`...), returns `{Resource: () => number}` | **Yes**. `offset` = number already in the queue. |
| Can we pay? | `checkAffordable` (`actions.js:7570`), `checkCosts` (`7681`); `checkMaxCosts` (`7611`, not exported) for "never, storage too small" | **Yes** |
| Time before the price is reached | `timeCheck` (`functions.js:911`) | **Yes** (no `$(` in 911-1110) |
| **Effect** | `c_action.effect` (string or function), e.g. `basic_housing` `actions.js:1397` | **Yes**, but often returns **HTML** (`<div>`, `<span class=...>`) |
| Description | `c_action.desc` (string or function, `loc(...)` + variables) | **Yes**, same HTML remark |
| Prerequisites | `c_action.reqs` | **Yes** |
| The full popover text | `actionDesc` (`actions.js:7256`) | **No**: builds jQuery elements. Recompose: `desc` + `effect` + `cost` + `timeCheck` |
| Production per second | `global.resource[res].diff`; detail in `window.evolve.breakdown` | **Yes** |
| Building count | `global.city.X.count`, `.on` | yes |
| Titles | `c_action.title` (string or function) | yes |
| Job descriptions | `job_desc[job](servant)`, `jobName` (`jobs.js`) | yes (HTML) |

Limits:
- **Language**: 12 languages in `strings/` (cs, de, es, im-PL, it, ja, ko, pl, pt-BR, ru, zh-CN, zh-TW) but **no French**. `locale.js` loads `strings/strings.json` by synchronous AJAX. Full version: ~11,600 lines; useful subset (buildings, techs, resources, jobs): order of 1,500 keys (?), **not counted**.
- **Pixel font** (`ui_font`, `pieces_b7.js:69-70`): 107 glyphs including `é è ê ë à â î ï ô ù û ü ç œ É È À Ç € ° « »`: enough for French and English; **no** ß/ä/ö, Russian, CJK, nor `<`, `>`, `|`, `~`, `$`.
- Large numbers: the original interface uses `sizeApproximation` (`vars.js`); the kit has no equivalent.

---

## 4. Interaction on the pixel-art view

### 4.1 What the kit already has
- `touch-action:none` canvas (`anki-village.js`); `tap(wx,wy,t)` (`world.js:362`): ripple, nearby citizen (grouped by job, floating `JOB_ICON` icon) or building through `VL.idAt(x/KS, y/KS)` (`village.js:522`), which reads an identifier buffer filled at draw time (`blitD`, depth respected).
- `kit/ui.js`: bitmap font, 9-slice (`nine`, `panel`), `button(w,h,label,state)`, `progress`, `checkbox`, `slider`, close cross. **No** scrolling list, automatic line wrapping (manual `\n`, `text()` `ui.js:22`), focus or accessibility.

### 4.2 What is missing
| Need | State | Effort |
|---|---|---|
| Distinguish tap / drag / long press | only `tap` | 0.5 d |
| Selecting a building | `idAt` gives the type; **the instance k not checked** (`IDS_ITEMS` not read) | 0.5 d |
| Selecting an **empty slot** | `slots()` (`village.js:50`) exists, but no rendering of an empty cell nor click test | 1 d |
| Context menu / anchored bubble | absent | 1 d |
| Touch-scrolling panel (~60 buildings, 100+ techs) | absent | 2-3 d |
| Automatic line wrapping, rich text with resource icons (`SK.RES_ICON`, `era1.js`) | absent | 1-2 d |
| Stateful buttons (greyed out, red price) | `button()` has states | 0.5 d |
| Large numbers | to be written | 0.25 d |
| Legibility: 8x10 font at scale 1 (phone ~900 physical px, `pickScale` `anki-village.js:65`) | **not tested** | test |
| Accessibility (screen reader, targets >= 44 px, adjustable text size) | a canvas is not readable; would need a hidden `aria-live` DOM or keeping the original | 1-2 d or give up |

### 4.3 "I choose where to place": the game has no position
The game only stores **counts** (`global.city.X.count`, `.on`). The kit places the k-th instance of a type on the k-th reserved slot (`village.js:49`). Fixed number of slots per type (`CFG`, `village.js:28-33`: 20 housings, 12 cottages, 8 farms...) on a 24 x 24 grid, with compression (`visN`, `village.js:81`).

| Option | Description | Impact on the game | Kit cost | Game cost | Defects |
|---|---|---|---|---|---|
| **1 - Build panel by category** | "Build" button -> tabs by `category`, list of visible buildings with cost/effect; one tap builds. Touching a building in the village opens its sheet (count, ON/OFF, production, "one more") | none | 4-6 d | 0 | no "where" |
| **2 - Clickable reserved slots** | The empty cells of `slots()` are displayed; you touch a plot, a menu offers the types **of the sector** (`SECTORS`, `village.js:34-41`). The choice of cell is **cosmetic**: the count stays in `global` | none if "slot k = k-th built"; otherwise store `slotsChosen[type]` in a key of our own (the save is the full `global`, `resets.js:81`); a reset erases it (?) | option 1 + 5-8 d | 0 | choice with no game effect; possible inconsistency when a building disappears (fire, end of era) |
| **3 - Free placement** | Position (x,y), adjacency, roads, radius of effect | **Outside the model**: `count` remains the game's truth, it would need a spatial model, position-linked effects, a save migration, a rebalancing | option 2 + 15-30 d | 15-30 d of design | breaks parity with Evolve, hard to resynchronise with upstream, inconsistent states |

---

## 5. What remains in the original interface

| Screen | Difficulty in pixel-art | Proposal |
|---|---|---|
| Research tree | long list sorted by era, prerequisites, queue | **Simplified version**: list of available techs (already filtered), sorted by Knowledge cost, with cost/effect. Do not draw the tree. |
| Trade / crates | routes per resource, dynamic prices | Original at first; later a +/- "routes" panel |
| Government / campaigns / spies | Buefy modals, `foreignGov` (complex DOM, `civics.js:489`) | **Original** full screen; in pixel, only taxes and mercenaries via `govCivics` |
| Message log | long text, filters | latest message on the HUD; full log in the original |
| Options / save import-export | fields, files, `LZString` | **Original** |
| Achievements, feats, wiki | lots of text and SVG | **Original** |
| Special building panels | variable modals | original on top |
| Era 0 (evolution) | ~40 buttons filtered by `reqs` + `condition()` | **Feasible** and simple in pixel-art |

Proposed mechanism: a "Full interface" button that hides `#av-panel` (`anki-village.js`) and shows the original interface full screen, with a floating "back to village" button. The original remains impractical on mobile (`html{overflow-y:hidden}`, columns in `rem`; `evolve.css` contains `@media (max-width:32rem|45rem|48rem...)` whose effectiveness is **not tested**). A 20-40 line CSS fix (vertical scrolling, smaller text) is worth trying.

---

## 6. Evolution of the game: which rules lend themselves to visible decisions?

| Evolve rule | Suits pixel-art? | Reason |
|---|---|---|
| Which building to build | **Yes** | the village grows before your eyes |
| Assign jobs | **Yes** | citizens animated by job (`citizens.js`); gesture = touch a group or a building, +/- |
| Powered buildings ON/OFF | Yes (little in Era 1) | running / stopped animation (but the reading of `on` needs fixing: `SYNTHESE.md` P0-1) |
| Storage (sheds, crates) | Medium | `unit_*` piles |
| Taxes, morale | Medium | slider; effect through the citizens' mood (`tax_revolt`) |
| Army / campaigns / spies | Medium to hard | planned scenes (raid column) but numerical decisions |
| Research | No | abstract list |
| Trade | No | table |
| Governments | No | menu |
| **Position, orientation, radius, adjacency** | **No, nothing in the game** | no existing notion |
| **Upgrading one instance** | **Not in Evolve** | buildings are counters; the kit's visual tiers come from techs (`tierOf`, `village.js:80`). New rule to be designed. |
| Events (fire, collapse, raid) | Yes (already animated) | the decision would be a new rule (react) |

Evolve is a game of **counts and resources**; pixel-art shows the **consequence** of decisions well, not the decision. The most natural decisions on the view are **placement by sector** (option 2) and **reaction to events**. Position with effect (option 3) is a new layer of rules, hence a derivative game.

---

## 7. Effort, steps and risks

Hours of a developer who knows the project, **rough**, with no possibility of browser testing on this phone before delivery.

| Tier | Content | Files | Functions (order) | Hours |
|---|---|---|---|---|
| **A - minimal mobile interface** | `src/api.js` (expose ~20 items, `export` of `runAction`); `kit/game.js`: RNA/DNA and evolution buttons (Era 0), gathering, "Build" list by category with cost/effect/greyed out, "Research", "Jobs" (+/-), resource HUD (stock/cap/diff), "full interface" button | 1 src + 1 kit + changes to `anki-village.js` and 1 import in `main.js` | ~50 | **40-70** (of which 10-15 blind debugging) |
| **B - decision core** | + crafting, taxes (`govCivics`), mercenaries, ON/OFF, build and research queues, short log, pause, save export, large numbers, French for ~1,500 keys (?) | +1-2 kits | +40 | **40-70** (+20 translation) |
| **C - spatial decisions** (option 2) | clickable empty cells, menu by sector, assignment stored in a key of our own | +1 kit | +25 | **40-60** |
| **D - gameplay specific to pixel-art** (option 3 / new rules) | spatial model, adjacency, per-instance upgrade, rebalancing | overhaul | 100+ | **200+** |

### Technical risks
1. **Desynchronisation with upstream Evolve**: the fork already modifies `vars.js:1532`, `main.js:12988`, `actions.js`. Exposing `runAction` or reading `actions.*` does not break on read, but an update may move functions. Mitigation: a small `src/api.js` and a smoke test that checks every exposed name.
2. **Unstable internal APIs**: `city.X.on`, `civic.*`, `queue` are undocumented and migrated between versions (`vars.js:328`).
3. **Tests impossible without a browser**: `README-FORK.md` states "never launched in a real browser". The Node smoke test with a fake canvas does not cover the game's DOM. Plan a diagnostic page that displays errors on screen (the canvas already does: `lastErr`, `anki-village.js:22-27`).
4. **Display desynchronisation**: a purchase from the kit modifies `global`, but the original redraws only happen if the corresponding tab is active (except `tabLoad`). Mitigation: force `settings.tabLoad` (?) or call the redraws when opening the full interface.
5. **Save / load**: the whole `global` compressed into `localStorage` (`resets.js:81`). The kit's data goes either in a `global` key (lost on a reset), or in its own `localStorage` key (safer). Behaviour of migrations facing an unknown key: not verified.
6. **Performance**: see §2.4 (`deepClone(global)` at 4 Hz); pixel rendering at `scale` up to 4. To be measured.
7. **DOM dependencies** not audited (§2.3).
8. **MPL-2.0 licence**: obligation **per file**. The modified Evolve files (`src/main.js`, `vars.js`, `actions.js`, `index.html`, any touched `src/*.js`) remain under MPL-2.0 and their source must be available to whoever receives the `evolve/main.js` bundle; keep `LICENSE` and the headers, list the modified files (`README-FORK.md` does so). The **new** files (kit, `anki-village.js`, and `src/api.js` if it contains only new code) may have another licence. Project rule: no CDN and nothing from Google; the fork already complies (6 libraries in `lib/`). Any font or library added must be embedded.
9. **API ambiguities**: `this`, `keyMultiplier`, `settings.pause`, `touch` mode (§1).

---

## 8. Recommendation

**Recommended path: thin pixel-art HUD + touch decision panels for the core (tier A then B), original interface one button away.** No "complete village" interface before tier A has been validated on a phone.

| Path | Pros | Cons |
|---|---|---|
| Keep the original UI in desktop mode (village as scenery) | no risk, already there | unplayable on a phone (the initial need) |
| **Thin HUD + panels (A then B)** | solves the phone for the core; the original serves as a safety net | long text in pixels = effort; two interfaces to maintain |
| Complete village interface | visual coherence | 200+ h; trade/civics/army/options not worth it; depends on internal APIs |

### 3-step plan
1. **Check before writing** (0.5-1 d): launch the game on the phone (it has never been launched in a real browser); read the console; measure `updateDebugData` (`performance.now()` around `main.js:8101`) and smoothness with the village panel; try `display:none` on the interface container (to be identified in `index.js:893`); try `window.evolve.actions.city.basic_housing.action({isQueue:false})` from the console.
2. **Tier A**: `src/api.js` + "Build / Research / Jobs / Evolution" panels + resource HUD; "full interface" button; English first.
3. **Tier B**, then C only after a real game played with tier A.

### To check first
1. The game starts and runs on the phone.
2. Cost of `deepClone(global)` at 4 Hz.
3. Calling an action from the console: resource debited, counter incremented, village scene reacts.
4. Original interface in `display:none`: console errors, Vue warnings.
5. Legibility of the 8x10 font at `scale` 1.

---

## 9. Doubts and unverified items

- **Nothing was launched.** No claim about execution (absence of a crash without DOM, performance, Vue warnings) is tested.
- `main.js` (12,993 lines) was not read in full; the list of DOM dependencies of `fastLoop` / `midLoop` / `longLoop` is **incomplete** ("151 lines with `$(`" is a raw grep).
- Only the following actions were read in detail: `rna`, `dna`, `membrane`, `organelles`, `nucleus`, `sentience` (start), `food`, `lumber`, `basic_housing`, `power_on` (start), `craft`, `autoBuy/autoSell`, `adjustTax`, `govCivics`, `hireMerc`, `war_campaign` (start), `runAction`, `setAction`, `postBuild`, `payCosts`, `checkCosts`, `adjustCosts`.
- Approximate line numbers: `power_off()` (follows `power_on()` `actions.js:6382`), `trigModal` in `setAction`.
- Counts (categories, techs per era, strings) = grep, not real visibility in a human game.
- `IDS_ITEMS` (`village.js:522`) not read: I do not know whether it carries the instance index k.
- Whether calling `window.evolve.actions.*.action()` on the clone gives exactly the same effects: not verified.
- The absence of French is certain (no `strings.fr*.json`); the size of the useful subset (1,500) is an **estimate**.
- The hours are orders of magnitude without measurement.

## 10. Files consulted
`src/{actions,functions,jobs,civics,resources,debug,vars,locale,main,index}.js`; `anki-village.js`; `kit/{village,world,ui,pieces_b7}.js`; `README-FORK.md`, `buildEvolve.js`, `evolve/evolve.js`, `evolve/evolve.css`, `index.html`; `README.md`; `project-docs/audit/SYNTHESE.md`. No file at the repository root or in the kit was modified.
