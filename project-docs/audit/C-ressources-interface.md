# Audit C — Era 1 resources, piles, interface and effects in Evolve versus the sprite kit

Date: 2026-10-15. Read-only: no kit or game file modified, game not executed.
Sources: `src/*.js` (abbreviated `src/`), `strings/strings.json`, kit `kit/*.js`.
Path note: `COUVERTURE-KIT.md` is in `project-docs/audit/` (the file name is historical French).

Convention: "standard human" = species `human`, without trait `carnivore`, `forager`, `gravity_well`, `slaver`, etc. (no special race). A building or tech only appears if `checkTechQualifications` passes (`src/actions.js:5909-5926`: `condition()` false, `not_trait` present or `trait` absent => hidden).

---

## 0. Discrepancies between report 8 and the code (verified) — read first

| # | Claim of report 8 | Reality in the code | Evidence | Kit impact |
|---|---|---|---|---|
| E1 | Smokehouse and Lodge in era 1 | The `smokehouse` tech requires the `carnivore` trait and excludes `herbivore`, `soul_eater`... The lodge requires `hunting>=1` (hence the smokehouse) or `alt_lodge`, whose `condition()` is false for a standard human. The `lodge` building itself has a `condition()` that requires these traits. A human therefore has NEITHER smokehouse NOR lodge. | `src/tech.js:964-972`, `src/tech.js:991-1000`, `src/tech.js:1013-1025`, `src/actions.js:1547-1552`, `src/actions.js:1587-1593` | 2 of the 26 composers will never be seen by a standard human (they remain useful for carnivorous races). |
| E2 | Hospital = "tech hospital", ordinary era 1 | The `hospital` tech requires `alumina:1`, given by `bayer_process`, which requires `smelting:2` (tech `steel`, 4950 Knowledge). The building costs 22000 Money + 4000 Furs + 10000 Aluminium. It is the very end of the "civilized" era. | `src/tech.js:7397-7407`, `src/tech.js:1987-1995`, `src/tech.js:2057-2070`, `src/actions.js:2029-2032` | Hospital almost unreachable in an "era 1" session; it also requires Aluminium (no icon). |
| E3 | Wheel (`wheel`) in the primitive era + `teamster` job + cart (8 images) | `wheel` and `wagon` carry `trait: ['gravity_well']`; the `teamster` job is only displayed by `wheel`. Absent for a standard human. | `src/tech.js:139-160` (`trait: ['gravity_well']` at line 146), `src/tech.js:161-170`, `src/tech.js:155` | The cart (`cart_box`, `cart_wheel_*`) and the `teamster` job (`kit/citizens.js:37`) are out of scope for the human. |
| E4 | Jobs `hunter`/`forager`/`soldier` | For a standard human, `hunter` and `forager` are never displayed (only carnivore/soul_eater/unfathomable, or forager). The player starts as `unemployed`. Furs come from SOLDIERS (garrison). `soldier` does not exist in the job list: these are the `civic.garrison.workers`. | `src/actions.js:8841-8850`, `src/main.js:4089-4099`, `src/jobs.js:369-401` | `JOB_ICON.hunter = ic_fur` useless for the human; however `soldier` must remain linked to Furs. |
| E5 | (not covered) "active" state of buildings | For `sawmill`, `mine`, `coal_mine`, `cement_plant`, `mill`, the counter `city.X.on` only increases via `powerOnNewStruct`. Without electricity (tech `electricity` = `discovery` era, hence outside era 1), `on` stays 0, whereas production runs (electricity only adds a `power_mult` bonus). The kit reads `on > 0` as "running". | `src/actions.js:6993-7035`, `src/tech.js:4817-4836`, `src/main.js:4790`, `5573-5574`, `6150`, `6545`, `src/actions.js:1875-1877` (mill: `power_reqs agriculture 6`), kit: `kit/village_b3.js:467-468` | **Probable bug**: 5 building types (sawmill, mine, coal mine, cement plant, mill) appear STOPPED throughout era 1 (no sawdust, dust or sparks, sails frozen, `af=0`, `kit/village_b3.js:475-480`). Only the compost and the barracks (`on++` on construction, `src/actions.js:1997`) are right. Exception: `alwaysPower` setting (`src/vars.js:1532`). |
| E6 | "Steel" icon era 1, Titanium absent but not stated | Steel: yes (tech `steel`, `src/tech.js:2057-2076`). Aluminium: yes at the end of the era (`metal_refinery`, `src/actions.js:2909-2943`, requires `alumina`). Titanium: NO (tech `industrialization`, `industrialized` era, `src/tech.js:4887-4901`). | cited | The kit covers Steel but neither Aluminium nor the 4 crafted resources. |
| E7 | (not covered) reading the state | `window.evolve.global` only exists if the `settings.expose` setting is active (`src/debug.js:14-15`, `41-45`). Otherwise `SpriteKit.run` silently falls back to `fakeState()` (`kit/spritekit.js:585-587`). | cited | To document in the integration; otherwise the diorama does not reflect the game. |
| E8 | Cabin/Cottage/Farm/etc. costs | Most era 1 buildings cost crafted resources: Cottage = Plywood+Brick+Wrought_Iron; Library = Plywood+Brick+Furs; Freight Yard = Brick+Wrought_Iron; Coal Mine = Wrought_Iron; Sawmill = Iron+Cement; Mill = Iron+Cement. | `src/actions.js:1441-1445`, `3758-3764`, `2246-2249`, `3014-3018`, `2554-2556`, `1857-1860` | Crafted resources are central in era 1 and have no icon. |

---

## 1. Resources

`defineResources` (`src/resources.js:674-761`) defines **78 entries**: 69 `loadResource` (including RNA, DNA and the species) + 9 `loadSpecialResource` (prestige). The names come from `strings.json` (`resource_X_name`). The "type" comes from the arguments of `loadResource`: `max=-1` or `-2` = not storable/crafted ("danger"/"caution"), `stackable=true` = stackable in crates (this is the meaning of "basic"), `warning` color = special/counter, `advanced` = rare.

Coverage legend: **DEDICATED** = own kit icon; **RECOLOR** = shared icon recolored (recolor in parentheses, taken from `kit/world.js:352-358` and from the sheet `kit/world.js:407`); **UNIT** = existing 8x8 pile sprite; **NONE** = nothing. The kit has NO resource -> icon table: the icons are only used via `JOB_ICON`/`BLD_ICON` (`kit/world.js:352-358`), for the touch bubbles (`kit/world.js:359-372`), and the game's HTML UI remains intact.

### 1.1 Era 1 resources for a standard human (18)

| Key | Name | Type | Unlock (evidence) | Kit coverage |
|---|---|---|---|---|
| `Money` (684) | Money (displayed "$") | currency, max 1000 | tech `currency` (`src/tech.js:3340-3349`); starting max 1000 | **DEDICATED** `ic_coin` (gold, `kit/pieces_b4.js:56`); bank/trade post sign (`kit/village_b4.js:200,229`). No "pile of coins" UNIT (report 8 planned one). |
| `human` (685, key = `global.race.species`) | Population / Citizens | special (counter, max = housing) | first housing built (`src/actions.js:1407`, `1566`) | **DEDICATED** `ic_head` (skin/teal); citizens drawn (max 40, `kit/citizens.js:211-212`), number per job read from `civic[job].workers` (`kit/citizens.js:162`). No "homeless"/"full" badge. |
| `Knowledge` (691) | Knowledge | special, max 100 | tech `sundial` (`src/tech.js:111`) | **DEDICATED** `ic_book` (madder/cream, `kit/pieces_b4.js:73`); library sign (`kit/village_b4.js:248`); indigo `ic_book` = university/scientist. |
| `Food` (696) | Food | basic, max 250, stackable | tech `club` (`src/tech.js:33`) | **DEDICATED** `ic_food` (sheaf + berries, `kit/pieces_b6.js:84`). Pile: NONE directly (see 2). |
| `Lumber` (697) | Lumber | basic, max 200 | from the start (`src/actions.js:8567-8570`) | **DEDICATED** `ic_wood`. UNIT `unit_log` (lumber yard, sawmill). |
| `Stone` (699) | Stone | basic, max 200 | tech `bone_tools`/`wooden_tools` (`src/tech.js:56`, `85`) | **DEDICATED** `ic_stone` (`river` by default). UNIT `unit_block` (quarry). |
| `Furs` (702) | Furs | basic, max 100 | 1st garrison built (`src/actions.js:1998`) or loot (`src/civics.js:1838-1843`); produced by soldiers (`src/main.js:4089-4099`). Required by Trade Post/Library/Temple (`src/actions.js:3159`, `3762`, `3393`): these buildings are therefore blocked as long as no barracks exists (`display` test, `src/actions.js:7668`). | **DEDICATED** `ic_fur` (hide/walnut). UNIT `unit_fur_bundle` (a single occurrence: Freight Yard tier 1 shed, `kit/village_b3.js:328`). |
| `Copper` (703) | Copper | basic, max 100 | 1st mine built (`src/actions.js:2989`) | **RECOLOR** `ic_ingot` MAIN `copper` (`kit/world.js:407`). UNIT `unit_ingot` MAIN `copper` (foundry/smokehouse, `kit/village_b4.js:101`). Ore: mound + `sig_cart` mine cart ACCENT `copper` at the mine (`kit/village_b3.js:432-455`). |
| `Iron` (704) | Iron | basic, max 100 | tech `iron_mining` (`src/tech.js:2305`) | **RECOLOR** `ic_ingot` MAIN `iron`. UNIT `unit_ingot` MAIN `iron` (if `mining>=3`, `kit/village_b3.js:472`). Ore: `sig_cart` ACCENT `rust` at the mine. |
| `Cement` (706) | Cement | basic, max 100 | 1st cement plant (`src/actions.js:2698`) | **RECOLOR** `ic_sack` (cream/madder on the sheet `kit/world.js:407`; `ashen`/`soot` in `BLD_ICON.cement_plant`, `kit/world.js:357`). Recoloring inconsistency between the two. UNIT `unit_sack` MAIN `cream` ACCENT `soot` at the cement plant (`kit/village_b4.js:168`). |
| `Coal` (707) | Coal | basic, max 50 | tech `coal_mining` (`src/tech.js:2333`) | **DEDICATED** `ic_coal` (soot, spark). No UNIT; `soot` mound + cart at the coal mine (`kit/village_b3.js:435-437`). |
| `Steel` (710) | Steel | basic, max 50 | tech `steel` (`src/tech.js:2057-2076`, cost 4950 Knowledge + 25 Steel: see doubts) | **RECOLOR** `ic_ingot` MAIN `steel`. UNIT `unit_ingot` `steel` if `smelting>=2` (`kit/village_b3.js:472`). |
| `Aluminium` (705) | Aluminium | basic, max 50 | 1st `metal_refinery` (`src/actions.js:2940`), tech `bayer_process` (`src/tech.js:1987`); also produced by quarriers (`src/jobs.js:133`) | **NONE** (neither icon nor `metal_refinery` building: absent from the 26 composers). |
| `Plywood` (736) | Plywood | crafted, max -1, craft 100 Lumber (`src/resources.js:179`) | 1st foundry (`src/actions.js:2752`) or `vars.js:343` | **NONE** icon; texture `tex_planks` exists (wall), no plank sprite. |
| `Brick` (737) | Brick | crafted, craft 40 Cement (`src/resources.js:180`) | 1st foundry (`src/actions.js:2754`) | **NONE** icon; `tex_brick` (wall) and `unit_block` exist (recolorable `brick`). |
| `Wrought_Iron` (738) | Wrought Iron | crafted, craft 80 Iron (`src/resources.js:181`) | foundry + Iron displayed (`src/actions.js:2755-2757`, `src/tech.js:2307`) | **NONE**; `unit_ingot`/`ic_ingot` iron would be the closest. |
| `Sheet_Metal` (739) | Sheet Metal | crafted, craft 120 Aluminium (`src/resources.js:182`) | foundry + Aluminium (`src/actions.js:2758-2760`, `2941-2943`) | **NONE**. End of era 1 only. |
| `Crates` (694) | Crate | special (capacity) | 1st Freight Yard (`src/actions.js:2285-2286`, `src/resources.js:2616-2628`) | **UNIT** `unit_crate`; no dedicated 16x16 icon (the 8x8 `unit_crate` serves as a tab pictogram on the `kit/ui.js` tab sheet). |

### 1.2 Other defined resources (60) — outside era 1 for a standard human

All: coverage **NONE** (and that is normal). "Evidence" = the line that turns `display` on.

| Key (`resources.js` line) | Name | Type | Unlock (evidence) | Why outside era 1 |
|---|---|---|---|---|
| `RNA` (680), `DNA` (681) | RNA, DNA | special | evolution phase (`src/main.js:775`, `786`) | optional "era 0" (report 8) |
| `Slave` (686) | Slave | special | `slave_pen` (`src/actions.js:1678`) | tech `slave_pens` requires `trait: ['slaver']` (`src/tech.js:7229-7230`) |
| `Authority` (687) | Authority | special | `src/main.js:8329` | `evil` universe only |
| `Mana` (688), `Crystal` (700), `Sus` (690) | Mana, Crystal, Suspicion | special/basic | tech `mana` (`src/tech.js:11223-11227`) | `condition: universe === 'magic'` (`src/tech.js:11214-11216`) |
| `Energy` (689) | Energy | special | tech `psychic_energy` (`src/tech.js:665`) | trait `psychic`. The game's electricity ("MW", `city.power`, `src/index.js:937`) only exists with the `electricity` tech (`discovery` era, `src/tech.js:4817-4836`): **absent from era 1** |
| `Omniscience` (692) | Omniscience | special | `src/tech.js:4478` | `existential` era |
| `Zen` (693) | Zen Power | special | `src/tech.js:126` | trait `calm` |
| `Containers` (695) | Container | special | `unlockContainers` (`src/resources.js:2631-2641`), warehouse/port | tech `steel_containers`, post-steel |
| `Chrysotile` (698) | Chrysotile | basic | `src/tech.js:58`, `87` | trait `smoldering` |
| `Useless` (701) | Pocket Lint | dummy | `src/races.js:8301` | race trait |
| `Oil` (708), `Uranium` (709), `Helium_3` (715) | Oil, Uranium, Helium-3 | basic | `src/actions.js:3082` (well), `src/tech.js:5996` (`globalized` era), `src/space.js:392` | outside era 1 |
| `Titanium` (711) | Titanium | basic | `src/tech.js:4901` | `industrialized` era |
| `Alloy` (712), `Polymer` (713) | Alloy, Polymer | basic | `src/actions.js:2812`, `2814` (factory); `src/tech.js:6289` (`globalized` era) | outside era 1 |
| `Iridium` (714) | Iridium | basic | `src/space.js:344` | space |
| `Water` (716) | Water | rare | `src/truepath.js:756` | true path |
| `Deuterium` (717), `Neutronium` (718), `Adamantite` (719), `Infernite` (720), `Elerium` (721) | same | rare | `src/space.js:3765`, `2035`, `2846`; `src/portal.js:115`; `src/main.js:10888` | space/portal |
| `Nano_Tube` (722), `Graphene` (723), `Stanene` (724), `Bolognium` (725), `Vitreloy` (726), `Orichalcum` (727) | same | rare | `src/tech.js:6413`, `src/space.js:3076`, `src/tech.js:6386`, `src/main.js:12542`, `src/portal.js:1790`, `src/tech.js:10981` | interstellar and beyond |
| `Asphodel_Powder` (728), `Elysanite` (729) | same | rare | `src/tech.js:14416`, `14803` | `existential` era |
| `Unobtainium` (730), `Materials` (731), `Cipher` (748) | same | rare/caution | `src/truepath.js:3053`, `1791`, `5420` | true path |
| `Horseshoe` (732) | Horseshoe | dummy | `src/races.js:7234`, `src/main.js:10876` | trait `hooved` |
| `Nanite` (733), `Genes` (734), `Soul_Gem` (735) | same | rare | `src/races.js:7272`, `src/tech.js:4733`, `src/portal.js:4445` | outside era 1 |
| `Mythril` (740) | Mythril | crafted (danger, craft Iridium+Alloy) | `src/space.js:347` | space |
| `Aerogel` (741), `Nanoweave` (742), `Scarletite` (743), `Quantium` (744) | same | crafted | `src/tech.js:9905`, `6359`, `6441`; `src/main.js:12379` | late |
| `Thermite` (745) | Thermite | crafted (Iron 180 + Aluminium 60) | display not located (see doubts); mentioned `src/jobs.js:852` | late / not verified |
| `Corrupt_Gem` (746), `Codex` (747), `Demonic_Essence` (749), `Blessed_Essence` (750) | same | caution | `src/portal.js:4761`, `542`, `src/main.js:10953`, `src/tech.js:5387` | portal/existential |
| `Blood_Stone` (752), `Artifact` (753) | same | special (prestige) | `loadSpecialResource` | meta-game |
| `Knockoff` (754) | Plásmíd | dummy | `src/races.js:8729` | gag |
| `Plasmid` (755), `AntiPlasmid` (756), `Supercoiled` (757), `Phage` (758), `Dark` (759), `Harmony` (760), `AICore` (761) | same | special (prestige, `global.prestige[name]`, `src/resources.js:1235-1250`) | after reset | meta-game |

Variant names (same key, other name) not to be forgotten: `Stone` -> Amber/Clay, `Brick` -> Mud Brick, `Cement` -> Ashcrete, `Useless` -> Pocket Lint/Bronze..., depending on the race (`src/resources.js:1058-1230`). Not applicable to the human.

Population note: the species is a resource in its own right (key = species name, `src/resources.js:685`). The kit reads the citizens via `civic[...]`, not via `resource[human]`.

### 1.3 Coverage summary (18 era 1 resources)

- Dedicated or recolored icon: **12** out of 18 (Money, Population, Knowledge, Food, Lumber, Stone, Furs, Copper, Iron, Cement, Coal, Steel).
- Partial: **1** (Crates: 8x8 unit only).
- None: **5** (Aluminium, Plywood, Brick, Wrought_Iron, Sheet_Metal).
- The 11 `RESOURCES` resources (`kit/spritekit.js:157`) all have an icon: the kit covers exactly what `fakeState` simulates, not what the game displays.

---

## 2. Piles and storage units

Mechanism: `stack(p, cx, by, name, map, cols, dx, dy, fill)` (`kit/village_b3.js:82`); the fill rate `fq` comes from `fill(st, names)` = mean `amount/max` of the listed resources (`kit/village_b3.js:470-474`), rounded to the eighth. Only 3 buildings have an `fq` tied to the real state: lumber_yard (`Lumber`), rock_quarry (`Stone`), storage_yard (`Food`+`Lumber`+`Stone`+`Furs`) (`kit/village_b3.js:481-483`); amphitheatre = crowd according to the entertainers (`kit/village_b4.js:406`).

### 2.1 Where the piles are

| Unit | Building (evidence) | Variable? |
|---|---|---|
| `unit_log` | Lumber Yard (`kit/village_b3.js:362,368-369`), Sawmill (`399`) | yes (Lumber) for the yard; fixed for the sawmill |
| `unit_block` | Rock Quarry (`kit/village_b3.js:419-421`) | yes (Stone) |
| `unit_crate` | Shed (`kit/village_b3.js:304,313`), Freight Yard (`333`), Trade Post (`kit/village_b4.js:196`) | Freight Yard only; Shed and Trade fixed |
| `unit_sack` | Farm level 1+ (`kit/village_b3.js:217`), Shed (`305`), Freight Yard (`334`), Cement Plant (`kit/village_b4.js:168`), Trade (`197`) | Freight Yard only; Farm according to density (`lvl`), not according to Food |
| `unit_ingot` | Foundry (`kit/village_b4.js:101`), Smelter (`133`), color according to tech (`metalOf`, `kit/village_b3.js:469`) | fixed level tied to density |
| `unit_fur_bundle` | Freight Yard tier 1 (shed, `kit/village_b3.js:328`) | fixed (only 1) |
| (no unit) | Mine, Coal Mine: conical heap + `sig_cart` mine cart tinted by ore | fixed |

### 2.2 Era 1 resources without a storage representation

| Resource | What exists | What is missing |
|---|---|---|
| Food (grain/food) | `sig_crop_1..3` on the farm (season, not stock); sacks in Farm/Shed/Freight Yard | **Silo** (`DY.silo` reads nothing, `kit/village_b3.js:484`): no visible filling; no grain heap, no silo gauge |
| Raw stone | `unit_block` quarry | no heap at the Freight Yard/Shed (the storage_yard `fq` includes it but only draws crates+sacks) |
| Lumber | `unit_log` | OK (yard). No planks (`Plywood`) |
| Furs | `unit_fur_bundle` 1 copy | no drying rack filled according to `Furs`; the kit's `sig_drying_rack` tech is not tied to the stock |
| Copper / Iron (raw ore) | conical heap + tinted cart (`kit/village_b3.js:432-455`); ingots (foundry) | no 8x8 "ore" unit; no heap tied to the real `Copper`/`Iron` |
| Coal | `soot` heap at the coal mine | no dedicated unit; no link with `Coal`; the foundry/smokehouse consume it (fuel) with no visible pile |
| Cement | `unit_sack` ashen/soot | fixed rate (`0.45 + lvl*0.3`), not tied to `Cement` |
| Brick | nothing | a `unit_block` recolorable `brick` would suffice; no building shows any |
| Plywood, Wrought_Iron, Sheet_Metal, Aluminium | nothing | foundry: 4 possible piles (`unit_plank`, `unit_bar`, `unit_sheet`) |
| Steel | `unit_ingot` steel (if `smelting>=2`) | fixed |
| Money | `ic_coin` sign | no chest/coins (`bank`: no pile of gold) |
| Knowledge | `ic_book` sign | no stacked scrolls/books |

Finding: out of 18 era 1 resources, only 3 have a pile tied to their real stock (Lumber, Stone, and the Food+Lumber+Stone+Furs mix of the Freight Yard).

---

## 3. Interface: what the player sees and what the kit offers

Starting decision: we keep the game's HTML UI. This table therefore lists (a) the game's panels for the record, (b) only what should be sprites in the village view.

### 3.1 What the player sees in era 1 (game HTML, unchanged)

| Element | Evidence | Visible when |
|---|---|---|
| Top bar: planet, year/day, season, moon, weather, temperature, pause | `src/index.js:899-922` | `calendar.day` > 0 (tech `sundial`, `src/tech.js:108-113`: `calendar.day++`) |
| Left column: race name, **morale** (%), MW power | `src/index.js:933-938` | morale as soon as `city.morale.current`; MW only with electricity (absent) |
| Build queue `#buildQueue` + log `#msgQueue` (filters: all, progress, queue, building_queue, research_queue, combat, spy, events, major/minor_events, achievements, hell) | `src/index.js:939-961`, `src/vars.js:61` | queue: tech `urban_planning`/`evil_planning` (`src/tech.js:2887-2915`); filters depending on progression |
| Resources panel (column) with fill bar `--percent-full`, `+` crates, `/s` | `src/resources.js:826-858` | as soon as `display` |
| Tabs: Evolution, Civilization (City), Civics (Government, Industry, Network, Army), Research (tech + queue), Resources (Market, Storage), ARPA, Stats, Settings | `src/index.js:343-398`, `470-523`, `647-665`, `686-717`, `1165-1230` | `showCiv`/`showCivic` (1st housing, `src/actions.js:1410`), `showResearch` (`Lumber>=5 or Stone>=6`, `src/main.js:7912-7914`), `showResources`+`showMarket` (tech `market`, `src/tech.js:3369-3370`), `showStorage` (1st Freight Yard, `src/resources.js:2597-2606`), `showMil` (garrison), `showIndustry` (foundry/factory, `src/actions.js:2816`, `8869`), `showGenetics`/ARPA: outside era 1 |
| Civics: job sliders (+/-), taxes (tax_rate), government (tech `government`), foreign powers (`gov0..gov2`, hostility), garrison/soldiers/wounded, campaigns | `src/jobs.js:369-401`, `src/civics.js:15-72`, `992-1104`, `1174-1450`, `1495-1550` | `taxes.display` (tech `tax_rates`), `govern` |
| Popovers (buildings, resources with `breakdown`, morale) | `src/main.js:335-390`, `src/resources.js:2190` | hover |
| Research: tech list, research queue `#resQueue` | `src/index.js:652` | `showResearch` |
| Settings, import/export | `src/index.js:1299-1470` | always |
| Tutorial | no dedicated mechanism (no "tutorial" file or function in `src/`); only `messageQueue` messages at unlock (e.g. `tech_sundial_msg`, `src/tech.js:109`) | — |

### 3.2 Equivalents in the kit (general UI pieces)

| Piece / function | Existence | Evidence | Used in the village view? |
|---|---|---|---|
| Bitmap font `ui_font` | yes (ASCII glyphs + FR accents, optional bold and shadow) | `kit/ui.js:14-36` | yes: variant digit (debug) `kit/village.js:461-463`; elsewhere no |
| 9-slice panel `ui_panel` | yes | `kit/ui.js:46-50` | no (workshop sheet only) |
| 9-slice button, 4 states normal/hover/pressed/disabled | yes | `kit/ui.js:52-60` | no |
| Progress bar (color of choice) | yes | `kit/ui.js:61-70` | no |
| Checkbox | yes | `kit/ui.js:71-76` | no |
| Slider | yes | `kit/ui.js:77-82` | no |
| Close cross | yes | `kit/ui.js:83-88` | no |
| Mouse cursor | yes | `kit/ui.js:89-95` | no |
| Tab icons | `tab_gear`, `tab_card` + reuse of `ic_house`, `fx_bulb`, `unit_crate`, `ic_coin`, `tool_shield`, `cart_box` | `kit/ui.js` (`tabs` sheet) | no |
| Streak flames (small 7x9, large 11x15) | yes, 4 frames | `kit/ui.js:98-110` | **not wired** (no call outside the sheet) |
| Reward chest | yes | `kit/ui.js:112-132`, triggered by `SpriteKit.reward()` (`kit/spritekit.js:580`) | yes, on the square, 9 s (`kit/ui.js:144-155`) |
| "Research finished" light bulb `fx_bulb` + `bulb(t)` | yes | `kit/ui.js:134-143` | **not wired** (only the sheet `kit/ui.js:uiSheet`) |
| Optional night filter | yes | `kit/ui.js:167-180`, enabled by `OPT.night` (`kit/spritekit.js:466`) | optional, outside the game (Evolve has no day/night cycle: `calendar.day` is a day of the year, `src/vars.js:1847-1850`) |

### 3.3 Elements that should be sprites in the village view (and kit status)

| Element | Source of the state in the game | Kit |
|---|---|---|
| `+N` harvest bubble on "Gather" click (food, wood, stone) | buttons `city-food`/`lumber`/`stone`, gains `src/actions.js:1100-1200` | **absent**: `tap` only handles citizen/building (`kit/world.js:359-372`) |
| Job / building icon bubble on touch | — | **present**: `float` (job, 2.6 s) and `pop` (building, 0.8 s) with `JOB_ICON`/`BLD_ICON` (`kit/world.js:352-358`, `374-391`); no produced figure |
| Building tooltip / popover | game HTML | **absent on the sprite side** (intended) |
| Stock fill gauge on the building | `resource.X.amount/max` | **partial** (lumber_yard, rock_quarry, storage_yard, `kit/village_b3.js:481-483`); silo/shed/cement plant/foundry not |
| "Building switched off" badge | `city.X.on` vs `count` | **wrong for 5 types** (E5); no badge, only the stopped animation |
| "No power" / "missing input resource" icon | `p_on`, production | **absent** (and power does not exist in era 1) |
| "Out of order" icon | no breakdown state in era 1 (only `mine_collapse` kills a miner) | **absent** |
| Construction site / "under construction" | queue `global.queue.queue`, `count` increasing | **partial**: scaffolding 2.5 s when the visible number increases (`kit/village.js:340-348`, `391`); no link with the build queue (the site does not exist until the building is built) |
| Production arrows (food/s, etc.) | `resource.X.diff` | **absent** |
| Famine alert icon | `Food.amount` at 0 / `hunger=0.5` (production halved, `src/main.js:4026`); deaths `global.stats.starved` (`src/main.js:3860-3866`) | **absent** |
| Homeless / population-at-maximum icon | `civic.homeless` (`src/main.js:10267-10269`), `human.amount>=max` | **absent** |
| Morale indicator (`ic_face` faces) | `city.morale.current` | **absent** (`ic_face` exists but serves for priest/entertainer) |
| "Active boost" badge (inspired / motivated) | `global.race['inspired']`/`['motivated']` (300-600 ticks, `src/events.js:42-60`, `src/main.js:10253-10260`) | **absent** |
| Weather / season indicator on the scene | `calendar.weather/temp/moon/wind/season` | **present**: rain, snow, clouds, lightning, wind, sun, 28-phase moon, leaves/petals, snow on the roofs (`kit/world.js:173-358`) |
| "Raid / pillage" alert | events `raid`, `pillage*` (tech `military`, `src/events.js:133-286`) | **absent** |
| Revolt morale/tax gauge | `tax_revolt` (`src/events.js:398-418`) | **absent** |

---

## 4. Effects: era 1 events versus what the kit animates

| Era 1 event | Trigger in the game | What the kit does | Evidence |
|---|---|---|---|
| Construction | `count++` (`src/main.js:11304,11337` message `build_success`) | YES: scaffolding 2.5 s + dust, then 6 sparks | `kit/village.js:340-348`, `391-399`, `350-352` |
| Upgrade (materials depending on tech: tier 1/2/3, annex depending on density) | tech `axe>=2`, `cement>=1`; density = `n/v` | PARTIAL: the sprite changes all at once, with no effect | `kit/village.js:80`, `88` |
| Harvest (Gather click; jobs) | `modRes` | NO (no `+N`); only the citizens animate a work gesture | `kit/citizens.js:37` |
| Chimney smoke / sawdust / forge sparks / mine dust | presence of buildings | YES, but wrongly off for 5 types (E5) | `kit/village.js:353-362` |
| Famine | `fed=false` (`src/main.js:4026`), `starved++` | NO | — |
| Fire | event `fire`, loss of Lumber (`src/events.js:62-76`), `nogenus aquatic`, `notrait evil` | NO | — |
| "Festival" | no festival event in era 1; the amphitheatre increases morale | amphitheatre crowd according to entertainers (`kit/village_b4.js:406`) | — |
| Pillage / raid | `raid`: -25% Money if the army loses (`src/events.js:133-186`); `siege`; `pillage0-3` (true path only) | NO | — |
| Battle victory | `civics_garrison_victorious` (`src/civics.js:1860-1871`) | NO | — |
| Tech discovery | `gainTech` + `messageQueue` | `fx_bulb` + `bulb(t)` exist but are triggered nowhere | `kit/ui.js:134-143` |
| End of season | `calendar.season` changes | YES (foliage, snow, flowers, harvest `sig_crop_*` sprites) | `kit/world.js:30-66`, `kit/village_b3.js:204-211` |
| Day/night | does not exist in the game | optional `night` filter and lights (lamp posts, campfire) | `kit/ui.js:167-180`, `kit/world.js:424-431` |
| Rain, storm, wind, hot/cold (events `heatwave`, `coldsnap`, `dark_cloud`, `gloom`) | modify `calendar.temp/weather` | YES via weather | `src/events.js:804-880`, `897-930`, `kit/world.js:253-358` |
| Mine cave-in | `mine_collapse` (-1 miner) | NO | `src/events.js:529-546` |
| Anki reward (chest) / streak flame | host | YES (chest), flames not wired | `kit/ui.js:112-155` |
| "Text-only" events (`tracks`, `hoax`, `burial`, `llama`, `cat`, `omen`, `theft`, `bone`, `prank`, `tremor`, `rumor`, `cloud`, `pet`, `contest`, `graffiti`...) | `basicEvent` | NO (messages only; `llama` removes 25-100 Food) | `src/events.js:922-962`, `986-1005` |

Frequency: the `major` events with a resource effect in era 1 are `fire` (Lumber), `raid` (Money, soldiers), `tax_revolt` (all resources), `mine_collapse` (miner), `inspiration`/`motivation` (boost).

---

## 5. Missing items to add, by priority

Constraints: fixed palette, existing ramps (`copper`, `bronze`, `iron`, `steel`, `gold`, `ashen`, `soot`, `slate`, `brick`, `terracotta`, `indigo`, `teal`, `haze`, `ember`, `madder`, `sage`, `saffron`, `cream`; `kit/palette.js:16-80`), zero dependencies, 16x16 icons (anchor [8,16]), 8x8 units (anchor [4,8]).

### P0 — fixes a logic defect (not a sprite)
1. **Reading the "running" state (E5)**: stop deducing "off" from `on === 0` for `sawmill`, `mine`, `coal_mine`, `cement_plant`, `mill`. Proposed rule: active if `count > 0` and (`on > 0` or no electricity or `power_reqs` not satisfied). Trigger: always. Impact: 5 buildings out of 26 animated throughout era 1.
2. **Document `settings.expose`** (E7): without it, the diorama displays `fakeState`.

### P1 — era 1 resources without an icon (visible in the costs of almost all buildings)
3. `ic_plank` (Plywood), 16x16, 3 stacked planks; MAIN `pinewood`, ACCENT `oak`. Trigger: `BLD_ICON` bubbles foundry/sawmill, costs.
4. `ic_brick` (Brick), 16x16, 3 staggered bricks; MAIN `brick`, mortar `cream`. Possible reuse of `unit_block` recolored `brick` in 8x8 for the piles.
5. `ic_bar` (Wrought_Iron), 16x16, forged bar with a curved end; MAIN darkened `iron` ramp (index 2-4) + SPARK. Distinguish from `ic_ingot` iron.
6. `ic_sheet` (Sheet_Metal), 16x16, tilted sheet; MAIN `steel`, `cream` highlight.
7. `ic_ingot` Aluminium: same shape, MAIN `steel` index 0-1 (lighter) + ACCENT `indigo`, or new shape `ic_bar`. Trigger: `metal_refinery`, quarry districts.
8. Harmonize Cement: choose `ic_sack` {MAIN `ashen`, ACCENT `soot`} everywhere (the sheet `kit/world.js:407` uses cream/madder).

### P2 — piles tied to the real stock (readability of the economy)
9. **Full/empty silo**: grain gauge on the silo (3 levels: `straw` heap in the `sig_hopper` hopper) tied to `Food.amount/max`; `unit_sack` {MAIN `straw`} sacks at the door. Trigger: `Food` changes by a 1/8 slice.
10. `DY.shed`, `DY.cement_plant`, `DY.foundry`, `DY.smelter`: wire `fq` (Stone/Lumber/Furs; Cement; Plywood/Brick/Wrought_Iron; Iron/Steel) like `lumber_yard`.
11. **Furs** heaps: drying rack `sig_drying_rack` + 1 to 4 `unit_fur_bundle` according to `Furs.amount/max` (only the Freight Yard tier 1 shed today).
12. Ore heaps: 8x8 `unit_ore` (MAIN `copper`/`rust`/`soot`) for copper/iron/coal at the mines, filling according to `Copper`/`Iron`/`Coal`.
13. `unit_plank`, `unit_bar`, `unit_sheet` for the foundry (1 pile per real craftsman job `city.foundry.Plywood/Brick/...`).
14. Coin pile `unit_coin` 8x8 (MAIN `gold`) on the bank/trade post according to `Money.amount/max` (report 8 planned it, it does not exist).

### P3 — feedback on the scene (village state)
15. **`+N` harvest bubble**: sprite `fx_plus` 12x10 (digit from the `ui_font` font + reduced 16x16 resource icon), floats 700 ms (same mechanic as `pop`, `kit/world.js:374-391`). Trigger: click on bush/tree/rock (Gather), or +gain of `Food/Lumber/Stone` between two readings.
16. **Famine alert icon**: `fx_alert_food` 12x12 (sheaf crossed out in `madder`) above the village/farm. Trigger: `Food.diff < 0` and `Food.amount` close to 0, or `stats.starved` increases.
17. **Morale badge**: `ic_face` with 3 expressions (ramp `sage`/`saffron`/`madder`) near the square. Trigger: `city.morale.current` < 50 / 50-100 / > 100.
18. **Homeless icon**: small tent `ic_tent` 12x12 when `civic.homeless > 0`. Trigger: message `abandon1/2` (`src/main.js:10267-10269`).
19. **Building state badges** (10x10, above the roof, once per type to limit noise): "stopped" (`ember` exclamation mark), "full" (stock curtain at 100%), "under construction" (hammer). Trigger: `count>0` and `on===0` (excluding E5), full stock.
20. **Wire `fx_bulb`**: light bulb above the library/university at each finished tech. Trigger: increment of `Object.keys(tech)` or message `research_success` (`src/main.js:11130`). 20x22, 1.5 s.
21. **Wire `flame`** if the Anki streak flame is wanted (otherwise remove it from the scope).

### P4 — dramatic events (era 1, low probability)
22. **Fire**: `ember` flames on the lumber yard/sawmill 3 s (6 frames 12x16) + `Lumber` dropping. Trigger: event `fire` (message `event_fire`).
23. **Raid / pillage**: 16x24 bandit silhouettes (citizen palette, `soot` clothing) + sacks disappearing from `unit_sack`; loss of Money. Trigger: `raid` (message `event_raid2`). **Battle victory**: `flag` pennant + `spark` sparks on the barracks (`civics_garrison_victorious`).
24. **Cave-in**: `ash` dust cloud + 12x12 beams on the mine (`mine_collapse`).
25. **Tier upgrade**: dust fade + sparks on all buildings of a type when `tierOf` changes (`kit/village.js:80`). Today the sprite jumps all at once.
26. **Active boost** (`inspired`/`motivated`): golden sparks above the citizens 8 s (countdown in `global.race.inspired`).
27. **Animated sundial**: already planned (`sundial`), to link to `calendar.day` for the shadow (neither dial nor hour in the game: the day is a day of the year).

Noise to avoid: the game already has its HTML popovers; do not duplicate the tooltips.

---

## 6. Doubts / not verified

1. **Real unlock order**: I read `reqs`/`grant`/`display` but did not play (instruction: do not execute). The dependency chains (e.g. Furs required before Library) come from the `display` test of `checkAffordable` (`src/actions.js:7668`), to be confirmed in the game.
2. **Steel: chicken and egg**: the `steel` tech costs 4950 Knowledge + 25 Steel (`src/tech.js:2062-2066`), whereas `Steel.display` is only turned on after the tech (`2075`). I found no other safe path to obtain 25 Steel in era 1 (loot `civics.js:1838`, mercenaries?). To verify; this conditions all of `Steel`, `bayer_process`, Aluminium, Sheet_Metal, Hospital.
3. **E5**: I did not execute `powerOnNewStruct`; reading the code (`src/actions.js:7000-7021`) indicates that `on` stays 0 without `city.powered`. If `settings.alwaysPower` is active or if `global.city.powered` is true from the start, the 5 buildings get `on++`. For `mill`, `powerOnNewStruct` is only called if `agriculture>=6` (`src/actions.js:1875-1877`).
4. **`window.evolve.global`**: is `updateDebugData` called at every tick and costly (deepClone global)? Not verified (`src/debug.js:41-45`).
5. **Thermite**: I did not locate the line that makes it visible (no `Thermite.display = true`); classified "late" on the strength of its cost (`src/resources.js:187`).
6. **Population**: the kit reads `civic[job].workers`, not `resource[human]`; a gap between population and maximum is not drawn. I did not verify whether the number of drawn citizens (max 40, `kit/citizens.js:212`) stays consistent with `resource.human.amount` at large scale.
7. **Era 1 age**: report 8 counts 115 `civilized` techs; I did not recount those that are hidden for a standard human (E1, E3, trait/`condition`), nor the `civilized` ones outside practical era 1 (electricity, firearms, `black_powder`/`dynamite`, magic).
8. **French names**: taken from `strings.json` (English names); the FR labels of the icons in the original were my proposals.
9. **Proposed size and number of images** (section 5): these are suggestions, not game constraints; the production cost was not estimated.
10. **The 60 other resources**: only the `display` lighting lines were noted (some may have several, e.g. `Stanene`: `src/tech.js:6386` and `src/main.js:12505,12518`); none enters era 1 according to the eras of the techs concerned (`src/tech.js`, `era` field).
