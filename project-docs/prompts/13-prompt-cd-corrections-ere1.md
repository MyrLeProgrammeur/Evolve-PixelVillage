# TASK: fix and complete Era 1 of the existing Evolve sprite kit (audit follow-up)

Work in THIS project. Do NOT rebuild or restyle. Keep your style bible, palette, piece format and API. Offline, plain ES2019, no Google service, integer pixels, every pixel from the palette (you may add up to 4 ramps in their own family), seeded PRNG, no placeholders. Build, don't summarize. Do part 1 first (code only), then part 2 in batches. Finish all.

An audit read the real game source for a standard HUMAN player in Era 1 (primitive + civilized, before the discovery era). Findings marked (unconfirmed) were read from code, never run: apply them defensively and say what you assumed.

## PART 1: reading and logic fixes (no new art)
1. `active()` in `village_b3.js` treats `city.X.on > 0` as "running". (unconfirmed) For `sawmill, mine, coal_mine, cement_plant, mill`, `on` stays 0 without an electrical grid although production runs, so these draw as stopped all Era 1. New rule: running if `count > 0` and (`on > 0` or the game has no power grid yet, i.e. `city.powered` is falsy). Keep the stopped look only when there is a grid and `on === 0`.
2. `SpriteKit.run()` silently falls back to `fakeState()` when `window.evolve.global` is missing (it only exists when `settings.expose` is on). Draw a small visible badge "demo state" in the corner in that case and document the setting in `README.md`.
3. Sundial gating: `tech.primitive >= 3` (sundial) is what starts the calendar (`calendar.day` goes 0 to 1). Before it, draw only the camp `fire_ring`. Draw sundial, lantern posts, bunting and signpost only after.
4. Tools of citizens come from the wrong techs (`citizens.js` around lines 68-74). Use `tech.pickaxe` (1 bronze, 2 iron, 3 steel), `tech.hammer`, `tech.hoe`, `tech.saw`, `tech.axe`. `tech.mining 4` (coal) must NOT give a steel pickaxe. Keep `axe` 1/2/3, `cement`, `smelting` as they are (they are correct).
5. Unreachable for a standard human: `hunter, forager, teamster (wheel, wagon), priest, scientist`, and the buildings `lodge, smokehouse, compost, temple`. Keep their art and code for other races but skip them in human placement: only show when the matching trait or tech field is present (`global.civic.hunter.display`, `global.race.gravity_well`, etc.). Add the job `scavenger` (16x24, 10 images, trigger `global.civic.scavenger.display`, planets with the `trashed` trait).
6. Biome `ashland` must behave as hot (same as `volcanic`).
7. Cement icon: use one consistent recolour (`ic_sack` with MAIN ashen, ACCENT soot) in the sheet and in `BLD_ICON`.
8. Read the techs the kit ignores and use them: `agriculture` (irrigation at >= 2), `currency` (market stalls at >= 2), `military` / `armor` (soldier gear), `farm` (farm house).
9. Tier change: when `tierOf` changes, fade the sprite with dust and sparks instead of swapping instantly.

## PART 2: new pieces (same text-grid format; small, about 45 pieces)
**Batch 1: buildings, resources, units**
- `metal_refinery`: new composer, 2x2 tiles, about 28 px high, 3 material tiers, trigger `city.metal_refinery.count`; add to `BUILDINGS` as `['metal_refinery','Metal Refinery','industry',2,2,28]`. Pale cylinder tank, two pipes, small slim chimney, aluminium ingots at the door, light smoke only.
- Icons 16x16: `ic_plank` (Plywood), `ic_brick` (Brick), `ic_bar` (Wrought_Iron), `ic_sheet` (Sheet_Metal); Aluminium = `ic_ingot` recoloured pale. Add a resource-to-icon table (the kit has none).
- Units 8x8: `unit_ore` (copper/iron/coal by recolour), `unit_coin`, `unit_plank`, `unit_bar`, `unit_sheet`.
- Link piles to real stock: silo grain level from `Food`, drying rack from `Furs`, ore at mines from `Copper/Iron/Coal`, coins at the bank from `Money`, shed/cement plant/foundry/smelter via `fq` like `lumber_yard`.

**Batch 2: citizens and effects**
- Layers on the existing 32x32 cell: `fl_bandage_head`, `arm_sling` and a seated pose (wounded soldiers, trigger `civic.garrison.wounded`); `fl_winter_coat` and `hat_fur` (trigger `calendar.season === 3` or `temp === 0`); `fl_rain_hood` (trigger `weather === 0 && temp > 0`); `tool_banner` for a marching column (`civic.garrison.raid > 0`); archetype "raider" with `tool_torch` for incoming raids (`event.l` is `raid`, `siege` or `pillage0..3`); the craftsman carries a small item matching his craft (`city.foundry.Plywood/Brick/Wrought_Iron/Sheet_Metal`).
- Effects: `fx_fire` (4-6 frames, 12x16) on `event.l === 'fire'`; mine collapse dust and beams on `event.l === 'mine_collapse'`; `fx_plus` (a "+N" bubble with a resource icon) on gains of Food, Lumber or Stone between two reads; `fx_alert_food` when `Food.diff < 0` near empty; wire the unused `fx_bulb` to a finished tech, and the series flames only if wanted (otherwise say so).
- World: government flag, one pole and banner recoloured by `civic.govern.type` (none in anarchy); irrigation channels; soldier gear (bow, leather, plate); planet traits from `city.ptrait`: `flare` (fire storm tint plus ember particles), `trashed` (6 small dump props plus a "shanty" cabin variant), `permafrost`.

**Batch 3: secondary states (cheap, only if time)**
Famine pose (`arm_belly`, pale skin), protest crowd with placards (`civic.govern.protest > 0`, riot on `event.l === 'tax_revolt'`), real pet cat and dog (`race.pet`), mercenaries, grave marker, builder at the scaffold, three neighbour camps at the map edge (`civic.foreign.gov0..2`), market stalls, spy gallows (`event.l === 'spy'`), farm house, morale face and homeless tent icons, state badges on buildings.

Do NOT draw (the game has none): magistrates, police, doctors, tax collectors, children, elders, merchants or caravans, monuments of the ARPA/wonders, a village name.

## Atelier and checks
Update the contact sheet and simulator for every new piece, trigger and fix (add toggles for `on`, `expose`, sundial, wounded, winter/rain, fire, raid). The self-check must list the new total (169 + new). Run your quality checklist (silhouette, x1 readability, one light direction, one outline approach, palette purity, determinism) and fix failures.

## At the end
List changed and new files, new piece counts by category and the grand total, which Part 1 fixes you applied and which assumptions you made (especially the `on` rule), the 3 weakest pieces, and anything you could not do.
