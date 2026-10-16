# Era 1 sprite coverage audit: summary

Date: 2026-10-15. Four sub-agents read Evolve's code (`src/`, MPL-2.0) and the kit (`kit/*.js`) read-only: A buildings, B jobs and citizens, C resources and interface, D techs, events, world. Detailed reports in this folder: `A-batiments.md`, `B-metiers-citoyens.md`, `C-ressources-interface.md`, `D-monde-techs-evenements.md`.

**General caveat: the game has never been launched.** Everything comes from reading the code. Findings marked ★ have heavy consequences and must be confirmed in game before being fixed.

## Verdict

- **Buildings are covered 26/26** for a human in Era 1. The 26 kit keys do exist in the code under that exact name. Only one building is missing: `metal_refinery`.
- **Jobs are complete** (0 missing), but 5 of the 17 drawn are never active for a standard human.
- **About 40 to 50 small pieces are missing**, mostly crafted resources, citizen states (wounded, famine, winter outfit, raid) and event effects.
- **The most serious problem is not the drawing, it is the reading of the game.** Four logic defects in the kit distort the picture from the start of a game (see P0).

## Errors in report 8 (to be corrected in the document)

| Claim in report 8 | Reality in the code | Agent source |
|---|---|---|
| lodge, smokehouse, compost exist for a human | require the `carnivore` or `detritivore` traits (`tech.js:964, 1013, 1060`): unreachable for a human | A, B, C, D |
| hunter and forager are Era 1 jobs | only for carnivore, `forager`, etc. | B, D |
| teamster, `wheel`, `wagon` | exist only in the `gravity_well` challenge (`tech.js:139-157`) | B, C, D |
| priest | requires the `ancients` gene (prestige); `temple` requires `theology 1`, set only by a reset | B, D |
| scientist | comes from the wardenclyffe, `discovery` era (`tech.js:4785-4792`) | B, D |
| black powder closes the era | it cuts off no building; the real boundary = the `discovery` era, with `apartment` requiring electricity | A, D |
| simple hospital | requires steel, `bayer_process` and 10,000 Aluminium (`tech.js:7397`, `actions.js:2029`) | A, C, D |
| complete list of buildings | omits `metal_refinery` (tech `bayer_process`) and the `scavenger` job (planet `trashed`) | A, D |

These five jobs and three buildings can stay in the kit for other races; they are simply never displayed for a human.

## P0 — Reading defects to fix before any drawing (0 sprites)

1. ★ **The `on` field is misinterpreted.** `village_b3.js:468` (`active()`) treats `city.X.on > 0` as "running". In Evolve's code, `on` is only incremented when a powered building is switched on (`powerOnNewStruct`, `actions.js:~7000-7030`: `can_p` stays false without an electrical grid). Sawmill, mine, coal mine, cement plant and mill would therefore stay **drawn idle, with no smoke or animation, throughout Era 1**, even though their production is running. Agents A, C, D say so; I re-read `powered()` on the sawmill (`actions.js:2570`) and the `can_p` logic myself, and it points that way. According to A, the mill additionally has inverted logic (`working = count - on`, `main.js:3593`). To be confirmed in game. Proposed rule: active if `count > 0` and (`on > 0` or no electrical grid).
2. ★ **`window.evolve.global` only exists if `settings.expose` is enabled** (`debug.js:14`). Without it, `SpriteKit.run()` falls back **silently** to the dummy state. This must be flagged on screen and the setting documented.
3. **The sundial conditions everything.** The `sundial` tech (primitive 3) takes `calendar.day` from 0 to 1 (`tech.js:94`). Yet the kit draws sundial, lanterns, garlands and signpost from the start. Before the sundial, the village should be reduced to a campfire.
4. **Tools are deduced from the wrong techs** (`citizens.js:68-74`): pickaxe, hoe and spear come from `tech.mining`, whereas the real techs are `pickaxe`, `hoe`, `hammer`, `saw`, `axe`. `mining 4` (coal) wrongly gives a steel pickaxe. The kit's tier levels (`axe` 1/2/3, `cement` 1, `smelting` 2) are correct.
5. **Techs never read by the kit**: `housing`, `agriculture`, `science`, `currency`, `primitive`. `typeTier(cottage)` has no effect.
6. **Biome `ashland`** should be hot: the case has no `break` in `main.js:11850`, so it behaves like `volcanic`.
7. **Cement**: two inconsistent recolourings between the sheet (`world.js:407`) and `BLD_ICON`.
8. **Document clean-up**: remove hunter, forager, teamster, priest, scientist from the humans' `at` plan (leave them for other races).

## P1 — To draw first (faithful to the game, visible in every game)

### Building
- `metal_refinery`: 2×2 tiles, ~28 px, light cylindrical vat, pipes, small chimney, aluminium ingots in front; trigger `city.metal_refinery.count`, addition to `BUILDINGS` (`spritekit.js:145`).

### Resources without an icon (visible in the costs of almost all buildings)
- 16×16 icons: `ic_plank` (Plywood), `ic_brick` (Brick), `ic_bar` (Wrought_Iron), `ic_sheet` (Sheet_Metal); Aluminium as a light-recoloured `ic_ingot`.
- Piles tied to the real stock: `unit_ore` (copper, iron, coal), `unit_coin` (the bank), `unit_plank`, `unit_bar`, `unit_sheet`. Silo, smokehouse/fur drying rack, shed, cement plant, foundry and metal foundry currently read no stock.

### Citizens (layers, never rewrites)
- Wounded soldiers (`fl_bandage_head`, `arm_sling`, seated pose): `civic.garrison.wounded`.
- Winter outfit (`fl_winter_coat`, `hat_fur`): `calendar.season === 3` or `temp === 0`.
- Rain hood: `weather === 0` and `temp > 0`.
- Campaign column with `tool_banner` banner: `civic.garrison.raid > 0`.
- Raid or siege suffered (enemy archetype, `tool_torch`): `event.l` is `raid`, `siege` or `pillage0..3`.
- Craftsman with the object of their crafting: `city.foundry.Plywood/Brick/Wrought_Iron/Sheet_Metal`.

### Events and effects
- Fire (`fx_fire`, 4 to 6 frames): `event.l === 'fire'`.
- Mine collapse: `event.l === 'mine_collapse'`.
- Harvest bubble "+N" (`fx_plus`): gain of Food, Lumber or Stone between two reads.
- Famine alert: `Food.diff < 0` near 0.
- Wire up the pieces already drawn but never triggered: `fx_bulb` (tech completed) and the series flames.
- Tier transition (dust and sparks fade) when `tierOf` changes: today the sprite jumps at once.

### World
- Government flag: a pole and a banner, recoloured by `civic.govern.type` (autocracy, democracy, oligarchy…), nothing under anarchy.
- Soldiers' weapons and armour (`tech.military`, `tech.armor`).
- Irrigation (`tech.agriculture >= 2`).
- Planets with visible traits: `flare` (fire storm), `trashed` (dump + "Shanty" housing), `permafrost`. 14 traits exist, none is read (`ptrait`).

## P2 — Faithful to the game but secondary

Famine (hands-on-belly pose, pale complexion); riot and tax revolt (crowd, placards, torches); real pet (cat/dog on the ground, `race.pet`, `events.js:995`); mercenaries (`garrison.m_use`); recruit training; grave of the dead miner or soldier; builder on a construction site; three neighbouring camps on the edge with status flags (`civic.foreign.gov0..2`); market stalls (`tech.currency >= 2`); spy gallows (`event.l === 'spy'`); farm with house (`tech.farm >= 1`); morale badge, homeless icon, building status badges; "inspired" boost; fur pile.

## P3 to P5 — Optional

- **P3 cosmetic, no game mechanic**: festival and high morale, silhouetted spies, night and sleep, children, caravans (the game only has routes, no visible merchants), shooting star, red rain, event gags (tumbleweed, llamas, black cat…), light tremor.
- **P4 calendar events** (device date): Halloween (28 Oct – 4 Nov, the human becomes a zombie), Easter (+10 days, 18 eggs), Christmas (17–24 Dec), solstice (bonfire, 20–22 June), fireworks (1–4 July), 1 April, 6 May. None is active today (15 October).
- **P5 other races**: 8 housings per genus (Hut, Den, Grove, Nest…), skin and traits per species, race buildings (cemetery, soul well, slave pen…). Outside the human scope.

## What is absent from the game and must NOT be drawn

According to B and D: magistrates, police officers, doctors, tax collectors, children, elders, retirees (none of these roles exists in the code); caravans and merchants (only routes); animals tied to buildings (the kit's deer, boar and rabbit are tied to nothing; only the farm pigs have a debatable link); no character in the 41 Era 1 events, except the pet; ARPA and wonders (require `high_tech 6` or the `wish` trait); no village name (the game displays a planet name).

## Coverage figures (human, Era 1)

| Domain | Examined | Covered | Merged | Missing | Out of scope |
|---|---|---|---|---|---|
| `city` entries (buildings) | 69 | 26 | 3 (food/lumber/stone gathering) | 1 | 39 |
| Population roles | 30 | 11 | 1 (craftsman) | 0 | 18 |
| Era 1 resources | 18 | 12 icons | 1 partial (Crates) | 5 without icon | 60 other resources outside the era |
| Techs (primitive + civilized minus black powder) | 120 | 68 available to a human in a first game | | | 8 after reset, 44 closed |
| of which visible consequence | 55 | 27 covered, 9 partial | | 19 not at all | |
| Events | 79 keys; 41 possible for a human | 2 complete, 9 partial | | 26 to represent | |

## Shared doubts to resolve in game

- Real values of `on`, of `Food.diff`, of morale (thresholds), of event cadence ("1 day = 5 s" is derived from `webWorker.mt = 250`).
- Exact Era 1 boundary for the hospital and the refinery: at the end of the `civilized` era, parallel to black powder.
- Hospital cost (10,000 Aluminium): very late for an "Era 1".
- Real unlock order of techs: never verified in game.
- The agents' figures were only partly cross-checked by me (the `on` point and the sawmill definition). No kit file was modified.

## Proposed next steps

1. **Fix the P0s in the kit** (small code job, no drawing) and validate them in game.
2. **Claude Design delta prompt "Era 1: additions"** for the P1s: around forty pieces, still in code, with the style bible already laid down.
3. **Decide the scope**: human only, or progressive opening to other races (P5).
