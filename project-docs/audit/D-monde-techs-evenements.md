# Audit D — World, techs, events, civics (Evolve Era 1) vs the sprite kit

Date: 2026-10-15. Read-only: no kit or game file modified, game not run. Everything is read from `src/*.js` and `strings/strings.json` (the game), and from `kit/*.js`. References are `file:line` (the game files are under `src/`, the kit files under `kit/`). Report 8 (`project-docs/audit/8-sprites-evolve-ere1.md`) was re-read and checked, not taken on trust.

Method note: `project-docs/audit/COUVERTURE-KIT.md` does exist (in `project-docs/audit/`, not in the kit's own reports folder). It lists 26 buildings, 17 jobs, 11 resources, 12 biomes; I cross-checked it against `kit/spritekit.js:131-152`.

## 0. Summary in ten points

1. **Exact boundary of Era 1.** The code has two relevant eras: `primitive` (5 techs, tech.js:19-160) and `civilized` (115 techs). Report 8 says "115 civilized": correct, but these 115 include 3 gunpowder techs (`black_powder` tech.js:7942, `dynamite` :7964, `flintlock_rifle` :7503) and 7 techs that require `high_tech` (thus electricity, era `discovery`). The "strict" Era 1 stops **before `black_powder`**: 5 + 115 - 3 = 117 techs, of which 7 are unreachable before electricity. Next era: `discovery` (45 techs, table A.4).
2. **The sundial (`sundial`, primitive 3) conditions everything.** Every ordinary tech and building requires `primitive: 3`, and `sundial` also moves `calendar.day` from 0 to 1 (tech.js:94-125). Before it, the calendar is frozen: day 0, season 0, weather 2, temperature 1, moon 0 (vars.js:2242-2249; main.js:11776 only runs if `day > 0`). The kit nevertheless draws the sundial, the lanterns and the garlands permanently (world.js:121, :165).
3. **The kit's tier thresholds are real values**: `axe` 1/2/3 (stone_axe, copper_axes, iron_axes), `cement` 1 (cement tech), `mining` 1-4, `smelting` 1-2. Main gap: citizens.js:68 reads `tech.mining` for the pickaxe, hammers and hoes. But the real tool techs are `pickaxe`, `hammer`, `hoe`, `saw`; `mining 4` is coal, not steel (tech.js:2318).
4. **The kit does NOT read** `tech.housing`, `agriculture`, `science`, `currency`, `primitive` (it only puts them in the fake demo state, spritekit.js:540). Buildings appear according to **counts** (`city[type].count`), not according to techs. This is consistent, but several visible consequences of techs are therefore never drawn (irrigation, habitable farm, market, weapons, armor, government, spies).
5. **The "human player in a first playthrough" does not have 4 of the 26 buildings**: `smokehouse` and `lodge` require the `carnivore` trait (tech.js:970-971, :1022), `compost` the `detritivore` trait (tech.js:1060s), and `temple` requires `theology 1`, a flag set only by a reset (resets.js:1283; vars.js:2256). The human has no diet trait (races.js:5015-5024). The teamster (`wheel`/`wagon`) is **reserved for the gravity_well challenge** (tech.js:147), not for the normal game.
6. **Events**: 79 keys in events.js (events.js:13-1108), 30 major and 49 minor; 41 possible for a human in Era 1; 26 deserve a visual; the kit only fully covers 2 (dark_cloud, gloom, via `calendar.weather`) and partially 9 (heatwave, coldsnap via `calendar.temp`; inspiration, motivation, dollar, bird, cloud, cat, pet via assets with no trigger).
7. **Real calendar events** (system date, not game date): Easter (+10 days), Halloween (28 Oct-4 Nov), Christmas (17-24 Dec), April 1st, May 6, June 20-22 (pyre), July 1-4 (fireworks). The human becomes a **zombie** during Halloween (races.js:70-76). None is handled. Today's date (2026-10-15): none active, Halloween opens in 13 days.
8. **World**: the kit's 12 biomes = the 12 of the code (races.js:7857-7950), but only 6 can be rolled on first launch (actions.js:6859-6905). 14 planet traits (races.js:7952-8036), 0 to 2 rolled per planet; all active from Era 1, **none read by the kit** (`ptrait` never read). The most visible: trashed (dump, "Shanty", scavenger), flare (fire storm), permafrost, stormy, toxic.
9. **Civics**: 3 foreign powers (vars.js:1704-1760), 5 campaign tactics (civics.js:1311-1322), spies, trade, taxes, no "law/crime" in the game. The starting government is `anarchy` (actions.js:8642), then autocracy/democracy/oligarchy (+ theocracy after a reset). None of this is visible in the kit's village view.
10. **ARPA / wonders**: nothing accessible in Era 1 (arpa.js:41 and tech.js:4960: high_tech 6, era `globalized`). The two "wonder_*" of the code are reserved for the `wish` trait (actions.js:3424-3470).

---

## A. TECHS

### A.1 Exact boundary

| Era (`era` field) | Number of techs (tech.js) | Content | In Era 1? |
|---|---|---|---|
| `primitive` | 5 | club, bone_tools, wooden_tools, sundial, wheel | Yes (wheel: gravity_well challenge only) |
| `civilized` | 115 | from `wagon` to `might` (table A.3) | Yes except 3 gunpowder techs and 7 `high_tech` techs |
| `discovery` | 45 | steam_engine, apartment, republic, steel tools, mad_science, electricity... | No (era 2) |
| `industrialized` | 39 | | No |
| 10 other eras | | globalized, early_space, deep_space, interstellar, intergalactic, dimensional, existential, solar, tauceti | No |

Total number of techs with an `era` field: 694 (extraction script on tech.js). The order of the eras in the file is not ascending (the `civilized` techs are scattered from line 161 to 15212); the **real** boundary is read in the prerequisites, not in the position. The era headers of the Research panel (`tech_era_*`, strings.json:1513-1525) come from the `era` field (actions.js:6144-6165).

`civilized` techs that are NOT in strict Era 1: `black_powder` (explosives 1, tech.js:7942), `dynamite` (explosives 2, :7964), `flintlock_rifle` (explosives 1 required, military 3, :7503); and seven techs that require `high_tech` (thus `mad_science`/`electricity`, era discovery): `thrall_quarters`, `major_wish`, `psychic_finance`, `mind_break`, `psychic_stun`, `titanium_spear`, `metal_detector`.

Reminder of the availability count for a **human, standard universe, 1st playthrough** ("available" column): see A.5.

### A.2 `primitive` era (5 techs)

| # | key | name (strings.json) | source | prerequisites (reqs) | grant | effect (EN) | available to human 1st playthrough? | visible consequence? (B building, M tier/material, O tool, J job, D decor/anim, N numeric) | covered by the kit? |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `club` | Club | tech.js:19 | (none) | ['primitive',1] | Make a basic club | yes | D: opens "gather food" (berry bushes); Food displayed | Partial: bush decor always drawn, not tied to the tech |
| 2 | `bone_tools` | Bone Tools | tech.js:39 | primitive: 1 | ['primitive',2] | Create primitive tools out of animal bones | yes (excluded if soul_eater) | D: opens "gather stone" (rocks); bone tool | Partial: rocks always drawn, not tied to the tech |
| 3 | `wooden_tools` | Wooden Tools | tech.js:65 | primitive: 1 | ['primitive',2] | Create primitive tools out of Lumber | not for human: reserved for non-evil soul_eater (tech.js:77-79) | D: same as bone_tools (wood variant) | Partial: same |
| 4 | `sundial` | Sundial | tech.js:94 | primitive: 2 | ['primitive',3] | Start tracking the days and begin building a settlement. | yes | D+N: founds the village; day 0 -> 1: the calendar (season, weather, moon) starts; EVERYTHING else requires primitive>=3 | Partial: sundial drawn (world.js:121) but never conditioned on tech.primitive>=3; before it the calendar is frozen |
| 5 | `wheel` | Wheel | tech.js:139 | primitive: 2 | ['transport',1] | Things are hard to move on this planet; you'll need to construct a basic cart to get any real work done. | NO: gravity_well trait (challenge) (tech.js:147) | J: teamster + cart | Yes (teamster citizen + cart) but outside the standard game |

### A.3 `civilized` era (115 techs, file order)

| # | key | name (strings.json) | source | prerequisites (reqs) | grant | effect (EN) | available to human 1st playthrough? | visible consequence? (B building, M tier/material, O tool, J job, D decor/anim, N numeric) | covered by the kit? |
|---|---|---|---|---|---|---|---|---|---|
| 6 | `wagon` | Wagon | tech.js:161 | transport: 1 | ['transport',2] | A large wagon pulled by beasts will increase the efficiency of teamsters. | NO: gravity_well trait (challenge) (tech.js:172) | D: large wagon pulled by beasts | No (no beast in the trait) |
| 7 | `housing` | Housing | tech.js:305 | primitive: 3 | ['housing',1] | Learn to construct basic housing for your citizens. | yes | B: Cabin (basic_housing) | Yes |
| 8 | `cottage` | Cottage | tech.js:325 | housing: 1, cement: 1, mining: 3 | ['housing',2] | Learn to construct more comfortable housing for couples. | yes (requires cement 1 + mining 3) | B: Cottage | Yes; typeTier(cottage)=max(2,tier) (village.js:81) has no effect because cement>=1 already forces tier 3 |
| 9 | `aphrodisiac` | Aphrodisiac | tech.js:490 | housing: 2 | ['reproduction',1] | Develop a substance that aids with population growth. | yes (except artifical) | N: birth rate | — |
| 10 | `captive_housing` | Captive Housing | tech.js:530 | housing: 1 | ['unfathomable',1] | Houses captives abducted from the surface. | NO: unfathomable trait | B: Captive Housing (out of scope) | No (out of scope) |
| 11 | `torture` | Torment | tech.js:551 | unfathomable: 1 | ['unfathomable',2] | Unlock the tormentor job, whose function is to break the minds and spirits of captured surface dwellers. | NO: unfathomable trait | J: tormentor | No (out of scope) |
| 12 | `thrall_quarters` | Thrall Quarters | tech.js:572 | unfathomable: 2, high_tech: 6 | ['unfathomable',3] | Renovate your captive housing structures to keep more thralls. | NO: unfathomable + high_tech 6 | M: captive housing upgrade | No (out of scope) |
| 13 | `minor_wish` | Limited Wish | tech.js:595 | housing: 1 | ['wish',1] | Unlock the power to grant minor wishes. | NO: wish trait | N: wishes interface | — |
| 14 | `major_wish` | Greater Wish | tech.js:625 | wish: 1, high_tech: 7 | ['wish',2] | Unlock the power to grant major wishes. | NO: wish trait + high_tech 7 | N | — |
| 15 | `psychic_energy` | Psychic Energy | tech.js:649 | housing: 1 | ['psychic',1] | Unlock your psychic energy and use it to benefit yourself. | NO: psychic trait | N: psychic interface | — |
| 16 | `psychic_attack` | Psychic Assault | tech.js:676 | psychic: 1, military: 1 | ['psychic',2] | Repeated use of psychic abilities for violence has enabled you to train to boost your army prowess. | NO: psychic trait | N | — |
| 17 | `psychic_finance` | Psychic Finance | tech.js:701 | psychic: 2, high_tech: 4 | ['psychic',3] | Practice using your psionic powers to boost profits. | NO: psychic + high_tech 4 | N | — |
| 18 | `mind_break` | Psychic Mind Break | tech.js:772 | psychic: 2, high_tech: 1, unfathomable: 2 | ['psychicthrall',1] | Learn to use your psychic powers to convert captives into thralls. | NO: psychic + high_tech 1 | N | — |
| 19 | `psychic_stun` | Psychic Stun | tech.js:795 | psychicthrall: 1, high_tech: 3, unfathomable: 2 | ['psychicthrall',2] | Practice non-lethal takedowns to help capture future thralls. | NO: psychic + high_tech 3 | N | — |
| 20 | `spear` | Flint Spear | tech.js:818 | primitive: 3, storage: 1 | ['foraging',1] | Upgrades the amount of food recoverable by Foragers. | NO: forager trait | O: flint spear (forager) | Partial: tool_spear exists but not tied to tech.foraging |
| 21 | `bronze_spear` | Bronze Spear | tech.js:839 | foraging: 1, mining: 2 | ['foraging',2] | Upgrades the amount of food recoverable by Foragers. | NO: forager trait | O: bronze tip | No (same reason) |
| 22 | `iron_spear` | Iron Spear | tech.js:860 | foraging: 2, mining: 3 | ['foraging',3] | Iron spears are even better for capturing small game | NO: forager trait | O: iron tip | No |
| 23 | `steel_spear` | Steel Spear | tech.js:881 | foraging: 3, smelting: 2 | ['foraging',4] | Steel spears are the latest in small game hunting tools. | NO: forager trait (smelting 2) | O: steel tip | No |
| 24 | `titanium_spear` | Titanium Spear | tech.js:902 | foraging: 4, high_tech: 3 | ['foraging',5] | Titanium spears are the ultimate in spear technology. | NO: forager + high_tech 3 (post-Era 1) | O: titanium tip | No |
| 25 | `dowsing_rod` | Dowsing Rod | tech.js:923 | foraging: 1, mining: 2 | ['dowsing',1] | Upgrades Foragers to find basic metals. | NO: forager trait | O: dowsing rod | No |
| 26 | `metal_detector` | Metal Detector | tech.js:944 | dowsing: 1, high_tech: 4 | ['dowsing',2] | Upgrades Foragers' metal-gathering ability. | NO: forager + high_tech 4 (post-Era 1) | O: detector | No |
| 27 | `smokehouse` | Smokehouse | tech.js:964 | primitive: 3, storage: 1 | ['hunting',1] | Create plans for a long-term storage medium for meat. | NO: carnivore trait required (tech.js:970); human = no diet | B: Smokehouse | Yes (building); unreachable for the human |
| 28 | `lodge` | Hunting Lodge | tech.js:991 | hunting: 1, housing: 1, currency: 1 | ['hunting',2] | Design a hunting lodge to help bolster your food income. | NO: requires hunting 1 (= carnivore smokehouse) or s_lodge; unreachable for the human | B: Lodge | Yes (building) |
| 29 | `alt_lodge` | Lodge (variant) | tech.js:1013 | housing: 1, currency: 1 | ['s_lodge',1] |  | NO: wendigo/detritivore/soul_eater+carnivore/artifical/unfathomable/forager (tech.js:1022) | B: Lodge (same building, other route) | Yes (building) |
| 30 | `soul_well` | Soul Well | tech.js:1038 | primitive: 3 | ['soul_eater',1] | Attract souls for consumption. | NO: soul_eater trait | B: Soul Well | No (out of scope) |
| 31 | `compost` | Composting | tech.js:1060 | primitive: 3 | ['compost',1] | You require decaying matter to survive; composting heaps will feed your people as long as you can keep... | NO: detritivore trait | B: Compost Heap | Yes (building); unreachable for the human |
| 32 | `hot_compost` | Hot Composting | tech.js:1082 | compost: 1 | ['compost',2] | Introducing heat to your composting piles will accelerate the process, producing more food. | NO: detritivore | N: yield (smoking heap possible) | No |
| 33 | `mulching` | Mulching | tech.js:1102 | compost: 2, mining: 3 | ['compost',3] | Mulch your dead matter before composting it to accelerate the food production process. | NO: detritivore (mining 3) | N | — |
| 34 | `agriculture` | Agriculture | tech.js:1142 | primitive: 3 | ['agriculture',1] | Learn to plant crops and harvest them for food. | yes (excluded: carnivore, detritivore, soul_eater, forager, unfathomable, artifical, cataclysm, lone_survivor) | B: Farm + farmer job | Yes |
| 35 | `farm_house` | Farm Houses | tech.js:1166 | agriculture: 1, housing: 1, currency: 1 | ['farm',1] | Learn the joys of a short commute by living at work! | yes (agriculture 1 + housing 1 + currency 1) | D: the farm becomes housing ("Farm Houses"): small house on the field | No |
| 36 | `irrigation` | Irrigation | tech.js:1186 | agriculture: 1 | ['agriculture',2] | Increase farm efficiency by 66% with irrigation. | yes | D: water channels / ditches between fields (+66%) | No |
| 37 | `silo` | Grain Silo | tech.js:1205 | agriculture: 2, storage: 1 | ['agriculture',3] | Create plans for a storage medium for food. | yes (storage 1 too) | B: Grain Silo | Yes |
| 38 | `mill` | Grain Mill | tech.js:1225 | agriculture: 3, mining: 3 | ['agriculture',4] | Create plans for a grain mill. Grain mills boost farm effectiveness. | yes (mining 3 too) | B: Mill | Yes (animated sails, wind read) |
| 39 | `foundry` | Foundry | tech.js:1326 | mining: 2 | ['foundry',1] | Design the foundry, a place for crafters to produce manufactured materials. | yes (mining 2) | B: Foundry + craftsman job | Yes |
| 40 | `artisans` | Artisans | tech.js:1346 | foundry: 1 | ['foundry',2] | Crafters produce an extra 3% for each Foundry. | yes | N: +3% per foundry | — |
| 41 | `apprentices` | Apprentices | tech.js:1365 | foundry: 2 | ['foundry',3] | Each crafter beyond the first assigned to a resource increases production of that resource by 3%. | yes | N | — |
| 42 | `carpentry` | Carpentry | tech.js:1384 | foundry: 3, saw: 1 | ['foundry',4] | Sawmills increase Plywood production by 2%. | yes (excluded evil; saw 1) | N: plywood (stacked planks possible) | No |
| 43 | `theatre` | Theatre | tech.js:1670 | housing: 1, currency: 1, cement: 1 | ['theatre',1] | Design a space for shows to help uplift your spirits. | yes (excluded joyless) | B: Amphitheatre + entertainer job | Yes |
| 44 | `playwright` | Playwright | tech.js:1691 | theatre: 1, science: 2 | ['theatre',2] | Playwrights will increase the quality of entertainment, increasing the effectiveness of entertainers. | yes (science 2) | D: posters / stage decor (optional) | No |
| 45 | `mining` | Mining | tech.js:1964 | primitive: 3 | ['mining',1] | Learn how to dig up stone slabs from a quarry. | yes | B: Rock Quarry + quarry_worker job | Yes |
| 46 | `bayer_process` | Bayer Process | tech.js:1987 | smelting: 2 | ['alumina',1] | Learn how to remove Aluminium from previously unusable waste material produced by your rock quarries. | yes (late: smelting 2) | B: Metal Refinery (aluminium, alumina 1) | NO: building absent from the kit and from report 8 |
| 47 | `smelting` | Smelting | tech.js:2031 | mining: 3 | ['smelting',1] | Learn advanced techniques for smelting ore that will increase yield. | yes (mining 3) | B: Smelter | Yes |
| 48 | `steel` | Crucible Steel | tech.js:2057 | smelting: 1, mining: 4 | ['smelting',2] | Upgrade your smelters so they can produce steel. | yes (excluded steelen; mining 4 + smelting 1) | M: steel (Steel displayed); switches metalOf -> steel | Yes (smelting>=2, village_b3.js:469) |
| 49 | `metal_working` | Metal Working | tech.js:2271 | mining: 1 | ['mining',2] | Learn how to mine and refine copper into a pure form. | yes | B: Mine; M: copper | Yes (building); copper = default of metalOf |
| 50 | `iron_mining` | Iron Mining | tech.js:2291 | mining: 2 | ['mining',3] | Learn how to extract iron ore from mines. | yes | M: iron (Iron + Wrought_Iron displayed); switches metalOf -> iron | Yes (mining>=3) |
| 51 | `coal_mining` | Coal Mining | tech.js:2318 | mining: 3 | ['mining',4] | Learn about how coal can be used as a resource. | yes | B: Coal Mine + coal_miner job; M: coal | Yes (building); but citizens.js:68 reads mining 4 as "steel pickaxe" (wrong, see A.3) |
| 52 | `storage` | Basic Storage | tech.js:2342 | primitive: 3, currency: 1 | ['storage',1] | Design a small storage shed. | yes (primitive 3 + currency 1) | B: Shed | Yes |
| 53 | `reinforced_shed` | Reinforced Sheds | tech.js:2362 | storage: 1, cement: 1, mining: 3 | ['storage',2] | Reinforce your sheds with newer materials to increase storage capacity. | yes (cement 1 + mining 3) | M: reinforced sheds (storage 2) | No |
| 54 | `containerization` | Containerization | tech.js:2490 | cement: 1, mining: 1, storage: 1, science: 1 | ['container',1] | Design a scalable storage solution for all your storage needs. | yes (cement, mining, storage, science) | B: Freight Yard (storage_yard) | Yes |
| 55 | `reinforced_crates` | Reinforced Crates | tech.js:2510 | container: 1, smelting: 2 | ['container',2] | Upgrade wooden crates by reinforcing them with metal plates. | yes (smelting 2) | M: crates with metal plates | No |
| 56 | `evil_planning` | Evil Planning (terrifying) | tech.js:2887 | banking: 2 | ['queue',1] |  | NO: terrifying trait | N: build queue | — |
| 57 | `urban_planning` | Urban Planning | tech.js:2912 | banking: 2, currency: 2 | ['queue',1] | Plan build orders in advance to be carried out by your work force. | yes (banking 2 + currency 2) | N: build queue (interface) | — |
| 58 | `assistant` | Personal Assistant | tech.js:2995 | queue: 1, science: 4 | ['r_queue',1] | A personal assistant will help you keep your empire organized. Enables the research queue. | yes (queue 1 + science 4) | N: research queue (interface) | — |
| 59 | `government` | Government | tech.js:3028 | currency: 1 | ['govern',1] | Unlocks basic government types to help your people work together to build a society. | yes (currency 1) | D: chosen government (anarchy -> autocracy/democracy/oligarchy): banner / flag | No |
| 60 | `theocracy` | Theocracy | tech.js:3055 | govern: 1, theology: 2 | ['gov_theo',1] | Unlock the Theocracy government type. | after a reset only (requires theology 2) | D: theocratic banner | No |
| 61 | `governor` | Governor | tech.js:3200 | govern: 1 | ['governor',1] | Create a governor position to help manage your population. | NO: governor gene (prestige) | N: governor (interface) | — |
| 62 | `spy` | Spies | tech.js:3226 | govern: 1 | ['spy',1] | Enable the ability to recruit spies. | yes (govern 1) | D: spies (civic.foreign.govN.spy) | No |
| 63 | `currency` | Currency | tech.js:3333 | housing: 1 | ['currency',1] | Unlocks currency, an important step in developing a society. Also creates taxes, not quite as popular ... | yes (housing 1) | D: currency (Money); opens lodge/theatre/bank | Partial: ic_coin (icon); no coin pile or purse |
| 64 | `market` | Marketplace | tech.js:3354 | banking: 1, govern: 1 | ['currency',2] | Opens a commodities market where you can buy and sell resources. | yes (banking 1 + govern 1; excluded terrifying) | D: market stalls on the plaza | No |
| 65 | `tax_rates` | Tax Rates | tech.js:3379 | banking: 2, currency: 2, queue: 1 | ['currency',3] | Allows the government to adjust the tax rate. | yes (banking 2, currency 2, queue 1) | N: tax rate (triggers tax_revolt) | — |
| 66 | `large_trades` | Large Volume Trading | tech.js:3403 | currency: 3 | ['currency',4] | Upgrades the commodities market to allow for buying and selling at higher volumes. | yes (currency 3) | N | — |
| 67 | `trade` | Trade Routes | tech.js:3469 | currency: 2, military: 1 | ['trade',1] | Create trade routes with your neighbors. | yes (currency 2 + military 1) | B: Trade Post; 2 routes (3 with trade 2) | Yes (building); routes / caravans: No |
| 68 | `banking` | Banking | tech.js:3560 | currency: 1 | ['banking',1] | Creates the concept of banking, allowing the government to accumulate massive wealth. Also gives the p... | yes (currency 1) | B: Bank | Yes |
| 69 | `investing` | Investing | tech.js:3580 | banking: 1 | ['banking',2] | Discover the principles of investing, unlocking the banker job. | yes | J: banker | Yes (banker citizen) |
| 70 | `vault` | Bank Vault | tech.js:3601 | banking: 2, cement: 1 | ['banking',3] | Upgrade your banks with vaults made out of concrete, increasing their $ storage capacity. | yes (banking 2 + cement 1) | M: vault (concrete) | No |
| 71 | `bonds` | Savings Bonds | tech.js:3623 | banking: 3 | ['banking',4] | Raise new capital by creating a series of savings bonds. With savings bonds, each citizen will increas... | yes | N | — |
| 72 | `steel_vault` | Steel Vault | tech.js:3643 | banking: 4, smelting: 2 | ['banking',5] | Reinforce your bank vaults with heavy steel doors and walls, increasing their $ storage capacity. | yes (smelting 2) | M: steel vault | No |
| 73 | `science` | Scientific Method | tech.js:4065 | housing: 1 | ['science',1] | Conceive of the scientific method. This will set your race down a path of science and discovery. | yes (housing 1) | B: University + professor job | Yes |
| 74 | `library` | Dewey Decimal System | tech.js:4085 | science: 1, cement: 1 | ['science',2] | Create a system for organizing and storing knowledge in large storage buildings designed specifically ... | yes (science 1 + cement 1) | B: Library | Yes |
| 75 | `thesis` | Thesis Papers | tech.js:4105 | science: 2 | ['science',3] | Libraries will have a minor effect on professor effectiveness. | yes | N | — |
| 76 | `research_grant` | Research Grant | tech.js:4124 | science: 3 | ['science',4] | Libraries will boost the effect of Universities' Max Knowledge reserve by 2% per library. | yes | N | — |
| 77 | `reclaimer` | Reclaimers | tech.js:6485 | primitive: 3 | ['reclaimer',1] | Create a class of worker whose purpose is to strip the flesh from dead things and collect the bones. | NO: evil trait | J: reclaimer (replaces lumberjack); B: Graveyard | No (out of scope) |
| 78 | `shovel` | Shovel | tech.js:6513 | reclaimer: 1, mining: 2 | ['reclaimer',2] | A basic shovel will help reclaimers dig up "resources". | NO: evil trait | O: bronze shovel | No |
| 79 | `iron_shovel` | Iron Shovel | tech.js:6538 | reclaimer: 2, mining: 3 | ['reclaimer',3] | Shovels made out of iron are more effective and will improve reclaimer productivity. | NO: evil trait | O: iron shovel | No |
| 80 | `stone_axe` | Primitive Axes | tech.js:6688 | primitive: 3 | ['axe',1] | Creates a primitive axe made from stone lashed to a stick. Enables lumber harvesting. | yes (excluded evil, kindling_kindred, smoldering, cataclysm) | B: Lumber Yard + lumberjack job; O: stone axe (axe 1) | Yes (slate tool) |
| 81 | `copper_axes` | Bronze Axe | tech.js:6715 | axe: 1, mining: 2 | ['axe',2] | Upgrade your axe technology to metal axes made from bronze. Improves lumber harvesting. | yes (excluded living_tool); named "Bronze Axe" | O+M: bronze axe (axe 2); kit tier 2 | Yes (tierOf axe>=2; citizens) |
| 82 | `iron_saw` | Sawmills | tech.js:6736 | axe: 1, mining: 3 | ['saw',1] | Sawmills increase the lumber yield of your lumberjacks. | yes (excluded lone_survivor, warlord) | B: Sawmill | Yes |
| 83 | `iron_axes` | Iron Axe | tech.js:6778 | axe: 2, mining: 3 | ['axe',3] | Upgrade your axe technology to metal axes made from iron. Improves lumber harvesting. | yes (excluded living_tool) | O: iron axe (axe 3) | Yes (citizens, citizens.js:68) |
| 84 | `copper_sledgehammer` | Bronze Sledgehammer | tech.js:6864 | mining: 2 | ['hammer',1] | Create sledgehammers made from bronze. Improves rock quarrying. | yes (excluded cataclysm, sappy, living_tool); "Bronze Sledgehammer" | O: bronze mallet (stonecutter) | No: tool_hammer_big is fixed to "river" stone (citizens.js:74), tech.hammer never read |
| 85 | `iron_sledgehammer` | Iron Sledgehammer | tech.js:6885 | hammer: 1, mining: 3 | ['hammer',2] | Upgrade to more durable sledgehammers made from iron. Improves rock quarrying. | yes (same exclusions) | O: iron mallet | No (same) |
| 86 | `copper_pickaxe` | Bronze Pickaxe | tech.js:6948 | mining: 2 | ['pickaxe',1] | Create metal pickaxes made with bronze heads. Improves mining activities. | yes (excluded cataclysm, living_tool, tusk); "Bronze Pickaxe" | O: bronze pickaxe (miner) | Partial: the kit deduces the pickaxe from tech.mining, not from tech.pickaxe |
| 87 | `iron_pickaxe` | Iron Pickaxe | tech.js:6969 | pickaxe: 1, mining: 3 | ['pickaxe',2] | Upgrades pickaxe technology to metal pickaxes made from iron. Improves mining activities. | yes (same exclusions) | O: iron pickaxe | Partial: same |
| 88 | `copper_hoe` | Bronze Hoes | tech.js:7097 | mining: 2, agriculture: 1 | ['hoe',1] | Create tools made from bronze that aid farming. Improves farm efficiency. | yes (excluded cataclysm, living_tool); "Bronze Hoes" | O: bronze hoe (farmer) | Partial: tool_hoe takes its metal from tech.mining, not tech.hoe |
| 89 | `iron_hoe` | Iron Hoes | tech.js:7118 | hoe: 1, mining: 3, agriculture: 1 | ['hoe',2] | Create tools made from iron that aid farming. Improves farm efficiency. | yes (excluded living_tool) | O: iron hoe | Partial: same |
| 90 | `slave_pens` | Slave Pens | tech.js:7221 | military: 1, mining: 1 | ['slaves',1] | Design a place to keep your unpaid labor. | NO: slaver trait | B: Slave Pen | No (out of scope) |
| 91 | `ceremonial_dagger` | Ceremonial Dagger | tech.js:7271 | mining: 1 | ['sacrifice',1] | A special ceremonial dagger to use in your sacrifices will increase the length of buffs gained per sac... | NO: cannibalize trait | D: dagger, altar | No (out of scope) |
| 92 | `last_rites` | Last Rites | tech.js:7292 | sacrifice: 1, theology: 2 | ['sacrifice',2] | Infusing religion into your sacrifices increases their potency. | NO: cannibalize + theology 2 | N | — |
| 93 | `garrison` | Garrison | tech.js:7332 | science: 1, housing: 1 | ['military',1] | Establish a military to keep your citizens safe from external threats, or to conquer your enemies. | yes (science 1 + housing 1) | B: Barracks + soldiers | Yes |
| 94 | `mercs` | Mercenaries | tech.js:7352 | military: 1 | ['mercs',1] | Unlocks the ability to hire mercenaries. You can pay a person to die for you, after all. | yes (military 1; excluded lone_survivor) | D: mercenaries (hired soldiers, civic.garrison.m_use) | No |
| 95 | `hospital` | Hospital | tech.js:7397 | military: 1, alumina: 1 | ['medic',1] | Establish a triage center which can be used to accelerate the healing of wounded soldiers. | yes (late: requires alumina 1 = bayer_process, thus steel) | B: Hospital (wounded) | Yes (building) |
| 96 | `bows` | Bows | tech.js:7479 | military: 1 | ['military',2] | Create the bow and outfit your army with ranged weapons. It's sure to give you dominance over the prim... | yes (military 1) | O: bow for soldiers (military 2) | No: the soldier carries spear+shield+helmet hard-coded |
| 97 | `flintlock_rifle` | Flintlock Rifle | tech.js:7503 | military: 2, explosives: 1 | ['military',3] | Outfit your army with firearms, which are much deadlier than primitive bows and arrows. | yes BUT requires explosives 1 = black powder (boundary) | O: flintlock rifle (military 3) | No (outside strict Era 1) |
| 98 | `armor` | Leather Armor | tech.js:7811 | military: 1 | ['armor',1] | Basic armor made from leather. It will reduce the number of casualties you take during military actions. | yes (excluded apex_predator) | O: leather armor (armor 1) | No |
| 99 | `plate_armor` | Plate Armor | tech.js:7833 | armor: 1, mining: 3 | ['armor',2] | Armor reinforced with iron plates. Heavy, but offers better protection for your soldiers. | yes (mining 3) | O: plate armor (armor 2) | Partial: iron helmet via mining>=3 only |
| 100 | `black_powder` | Black Powder | tech.js:7942 | mining: 4 | ['explosives',1] | Usher in a new era of things that go boom. Surely nothing bad can happen thanks to this discovery... | yes (mining 4) — BOUNDARY | D: explosives, mine detonations | No (outside strict Era 1) |
| 101 | `dynamite` | Dynamite | tech.js:7964 | explosives: 1 | ['explosives',2] | Dynamite can be used to increase the efficiency of mining. No one would ever misuse this invention for... | yes (explosives 1) — post-boundary | D: dynamite in the mines | No |
| 102 | `cement` | Cement | tech.js:8058 | mining: 1, storage: 1, science: 1 | ['cement',1] | Learn how to make cement from stone. | yes (mining 1, storage 1, science 1; excluded flier) | B: Cement Plant + cement_worker; M: tier 3 (bricks/concrete) | Yes (tierOf cement>=1) |
| 103 | `rebar` | Rebar | tech.js:8079 | mining: 3, cement: 1 | ['cement',2] | Adding rebar to concrete will make it much stronger and reduce building cement costs. | yes (excluded flier) | N: reduced cement costs | — |
| 104 | `steel_rebar` | Steel Rebar | tech.js:8100 | smelting: 2, cement: 2 | ['cement',3] | Use stronger steel as rebar, further reducing building cement costs. | yes (excluded flier) | N | — |
| 105 | `theology` | Theology | tech.js:8345 | theology: 1, housing: 1, cement: 1 | ['theology',2] | Explore the mysteries of creation and faith. | after a reset only (theology 1 set by resetCommon, resets.js:1283) | B: Temple (+ shrine if magnificent) + priest job | Yes (building) but absent from the 1st playthrough |
| 106 | `fanaticism` | Fanaticism | tech.js:8371 | theology: 2 | ['theology',3] | Revere your creators as literal gods and attempt to mimic them. | after a reset (theology 2) | N / D: cult of the creators | — |
| 107 | `alt_fanaticism` | Fanaticism (alt.) | tech.js:8401 | theology: 2 | ['fanaticism',1] |  | after a reset + transcendence gene | N | — |
| 108 | `indoctrination` | Indoctrination | tech.js:8605 | fanaticism: 1 | ['fanaticism',2] | Professors will help spread your ideology. Each professor gives a minor boost to temple effectiveness. | after a reset | N | — |
| 109 | `anthropology` | Anthropology | tech.js:8669 | theology: 2 | ['theology',3] | Study your ancient creators and attempt to learn from them. | after a reset | N | — |
| 110 | `alt_anthropology` | Anthropology (alt.) | tech.js:8692 | theology: 2 | ['anthropology',1] |  | after a reset + transcendence gene | N | — |
| 111 | `mythology` | Mythology | tech.js:8716 | anthropology: 1 | ['anthropology',2] | Mythological stories of the creators boost your libraries by 5% per temple. | after a reset | N: +5% libraries per temple | — |
| 112 | `mana` | Mana | tech.js:11206 | primitive: 3 | ['magic',1] | Discover the secret of mana. | NO: magic universe | J: crystal miner; Mana/Crystal resources | No (out of scope) |
| 113 | `ley_lines` | Ley Lines | tech.js:11238 | magic: 1 | ['magic',2] | Mapping the Ley Lines will let you know the best places to construct pylons to harvest mana from the l... | NO: magic universe | B: Pylon | No (out of scope) |
| 114 | `rituals` | Rituals | tech.js:11269 | magic: 2 | ['magic',3] | Rituals are a type of persistent spell that has a continuous effect as long as it's channelled. | NO: magic universe | N | — |
| 115 | `clerics` | Clerics | tech.js:11353 | magic: 3 | ['cleric',1] | Encourage priests to draw mana from the divine to help feed your mana addiction. | NO: magic universe + ancients gene | N | — |
| 116 | `conjuring` | Conjuring | tech.js:11377 | magic: 1 | ['conjuring',1] | Learn to conjure food from mana. | NO: magic universe | N | — |
| 117 | `res_conjuring` | Resource Conjuring | tech.js:11401 | conjuring: 1 | ['conjuring',2] | Learn to conjure basic resources using mana. | NO: magic universe | N | — |
| 118 | `secret_society` | Secret Society | tech.js:11496 | magic: 1 | ['roguemagic',1] | It is dangerous to openly practice magic, as you risk drawing the attention of the witch hunters. You ... | NO: magic + witch_hunter | N | — |
| 119 | `cultists` | Cultists | tech.js:11519 | roguemagic: 1, cleric: 1 | ['roguemagic',2] | Induct your priests as members of your secret society to help hide your ritual activity. | NO: magic + witch_hunter | N | — |
| 120 | `might` | Might Makes Right | tech.js:15212 | military: 1 | ['evil',1] | Boost your authority with intimidation. | NO: evil universe | N | — |

### A.4 Next era, `discovery` (45 techs, outside Era 1; for the record and to fix the boundary)

| # | key | name | source | prerequisites | grant |
|---|---|---|---|---|---|
| 1 | `steam_engine` | Steam Engine | tech.js:184 | transport: 2, smelting: 3 | ['transport',3] |
| 2 | `apartment` | Apartments | tech.js:347 | housing: 2, high_tech: 2 | ['housing',3] |
| 3 | `steel_beams` | Steel Beams | tech.js:392 | housing: 2, smelting: 2 | ['housing_reduction',1] |
| 4 | `adv_mulching` | Advanced Mulching | tech.js:1122 | compost: 3, high_tech: 2 | ['compost',4] |
| 5 | `windmill` | Windmill | tech.js:1245 | agriculture: 4, high_tech: 1 | ['agriculture',5] |
| 6 | `demonic_craftsman` | demonic_craftsman | tech.js:1404 | foundry: 3 | ['foundry',5] |
| 7 | `master_craftsman` | Master Crafter | tech.js:1425 | foundry: 4 | ['foundry',5] |
| 8 | `brickworks` | Brickworks | tech.js:1446 | foundry: 5 | ['foundry',6] |
| 9 | `magic` | Techno Wizards | tech.js:1710 | theatre: 2, high_tech: 1 | ['theatre',3] |
| 10 | `radio` | Radio | tech.js:1766 | theatre: 3, high_tech: 2 | ['broadcast',1] |
| 11 | `blast_furnace` | Blast Furnace | tech.js:2085 | smelting: 2 | ['smelting',3] |
| 12 | `bessemer_process` | Bessemer Process | tech.js:2111 | smelting: 3 | ['smelting',4] |
| 13 | `barns` | Barns | tech.js:2384 | storage: 2, smelting: 2, alumina: 1 | ['storage',3] |
| 14 | `cranes` | Cranes | tech.js:2545 | container: 2, high_tech: 2 | ['container',3] |
| 15 | `steel_containers` | steel_containers | tech.js:2693 | smelting: 2, container: 1 | ['steel_container',1] |
| 16 | `gantry_crane` | Gantry Cranes | tech.js:2722 | steel_container: 1, high_tech: 2 | ['steel_container',2] |
| 17 | `republic` | republic | tech.js:3074 | govern: 1 | ['govern',2] |
| 18 | `socialist` | socialist | tech.js:3096 | govern: 1 | ['gov_soc',1] |
| 19 | `espionage` | Espionage | tech.js:3249 | spy: 1, high_tech: 1 | ['spy',2] |
| 20 | `spy_training` | Spy Training Facility | tech.js:3276 | spy: 2, boot_camp: 1 | ['spy',3] |
| 21 | `spy_gadgets` | Spy Gadgets | tech.js:3295 | spy: 3, high_tech: 2 | ['spy',4] |
| 22 | `diplomacy` | Diplomacy | tech.js:3494 | trade: 1, high_tech: 1 | ['trade',2] |
| 23 | `eebonds` | Series EE Bonds | tech.js:3664 | banking: 5, high_tech: 1 | ['banking',6] |
| 24 | `home_safe` | House Safe | tech.js:3937 | banking: 5 | ['home_safe',1] |
| 25 | `mad_science` | Mad Science | tech.js:4785 | science: 2, smelting: 2 | ['high_tech',1] |
| 26 | `electricity` | Electricity | tech.js:4817 | high_tech: 1 | ['high_tech',2] |
| 27 | `matter_replicator` | matter_replicator | tech.js:4843 | high_tech: 2 | ['replicator',1] |
| 28 | `mine_conveyor` | Mine Conveyor Belts | tech.js:6065 | high_tech: 2 | ['mine_conveyor',1] |
| 29 | `steel_shovel` | Steel Shovel | tech.js:6563 | reclaimer: 3, smelting: 2 | ['reclaimer',4] |
| 30 | `steel_saw` | Steel Saws | tech.js:6758 | smelting: 2, saw: 1 | ['saw',2] |
| 31 | `steel_axes` | Steel Axe | tech.js:6799 | axe: 3, smelting: 2 | ['axe',4] |
| 32 | `steel_sledgehammer` | Steel Sledgehammer | tech.js:6906 | hammer: 2, smelting: 2 | ['hammer',3] |
| 33 | `steel_pickaxe` | Steel Pickaxe | tech.js:6990 | pickaxe: 2, smelting: 2 | ['pickaxe',3] |
| 34 | `jackhammer` | Jackhammer | tech.js:7011 | pickaxe: 3, high_tech: 2 | ['pickaxe',4] |
| 35 | `steel_hoe` | Steel Hoes | tech.js:7139 | hoe: 2, smelting: 2, agriculture: 1 | ['hoe',3] |
| 36 | `slave_market` | slave_market | tech.js:7246 | slaves: 1, high_tech: 1 | ['slaves',2] |
| 37 | `boot_camp` | Boot Camp | tech.js:7438 | high_tech: 1 | ['boot_camp',1] |
| 38 | `missionary` | Missionary | tech.js:8630 | fanaticism: 2 | ['fanaticism',3] |
| 39 | `zealotry` | Zealotry | tech.js:8650 | fanaticism: 3 | ['fanaticism',4] |
| 40 | `archaeology` | Archaeology | tech.js:8735 | anthropology: 2 | ['anthropology',3] |
| 41 | `merchandising` | Merchandising | tech.js:8754 | anthropology: 3 | ['anthropology',4] |
| 42 | `crafting_ritual` | Crafting Rituals | tech.js:11298 | magic: 3, foundry: 5 | ['magic',4] |
| 43 | `alchemy` | Alchemy | tech.js:11425 | magic: 3, high_tech: 1 | ['alchemy',1] |
| 44 | `conceal_ward` | Concealing Wards | tech.js:11542 | roguemagic: 2, theatre: 3 | ['roguemagic',3] |
| 45 | `subtle_rituals` | Subtle Rituals | tech.js:11568 | roguemagic: 3, magic: 4 | ['roguemagic',4] |

Among these 45, those that would change the appearance if Era 1 were extended: `apartment` (housing 3, tech.js:347), `windmill` (agriculture 5, :1245), `steel_*` (steel tools, axe 4 / hammer 3 / pickaxe 3 / hoe 3 / saw 2), `blast_furnace`/`bessemer_process` (smelting 3-4), `brickworks` (foundry 6), `republic`/`socialist` (governments), `mad_science` (wardenclyffe, scientist job) and `electricity`.

### A.5 Figures (human, 1st playthrough, standard universe)

- 120 techs examined (5 primitive + 115 civilized).
- Available to a human, first playthrough: **68**. Available only after a reset (theology 1): **8**. Closed to the human (race trait, universe, challenge): **44**.
- Of the 68 available: 55 have a visible consequence (building, tier, tool, job, decor); 27 are covered ("Yes"), 9 partially, 19 not at all.
- The rest (13) is purely numeric (costs, yields, interface).

### A.6 Kit tier triggers vs. real values in the code

Kit reads (grep `tech\.` in kit/*.js; only these four techs are read, plus `axe` and `mining` for citizens):

| Kit read | Where | Real values in the game (grant) | Verdict |
|---|---|---|---|
| `tier = cement>=1 ? 3 : axe>=2 ? 2 : 1` | village.js:80 | `cement`: 1 = cement tech (tech.js:8058, requires mining 1 + storage 1 + science 1; forbidden to the flier trait), 2 = rebar (:8079), 3 = steel_rebar (:8100), >=4 later eras. `axe`: 1 = stone_axe (tech.js:6688), 2 = copper_axes (:6715, named "Bronze Axe"), 3 = iron_axes (:6778), 4 = steel_axes (discovery, :6799) | **Correct values.** Edge cases: `evil`, `kindling_kindred`, `smoldering`, `cataclysm` races do not have stone_axe (axe stays 0, never tier 2); `living_tool` does not have copper_axes; `flier` never has cement (never tier 3). Tier 3 can arrive before tier 2 (cement does not depend on axe). |
| `typeTier(cottage)=max(2,tier)` | village.js:81 | cottage requires `cement 1` + `mining 3` (tech.js:325-326) | No effect: as soon as cottage exists, tier = 3. |
| `metalOf = smelting>=2 ? steel : mining>=3 ? iron : copper` | village_b3.js:469 | `mining`: 1 = mining (quarry, tech.js:1964), 2 = metal_working (copper, :2271), 3 = iron_mining (iron, :2291), 4 = coal_mining (:2318). `smelting`: 1 = smelting (:2031), 2 = steel (:2057, requires mining 4), 3-4 = discovery. `steelen` challenge: smelting jumps to 2 at once (:2049-2053) | **Correct values.** Default "copper" even at mining 0-1 (before metal_working there is no mine; no visible effect). |
| Citizens: axe `axe` 1/2/3 -> stone/copper/iron | citizens.js:67-68 | axe 1/2/3 (see above) | Correct. |
| Citizens: pickaxe = `mining` 1/2/3/4 -> stone/copper/iron/steel; `tool`/`helm` according to `mining` | citizens.js:68, :255 | The pickaxe comes from `pickaxe`: 1 copper_pickaxe (tech.js:6948), 2 iron_pickaxe (:6969), 3 steel_pickaxe (discovery, :6990), 4 jackhammer (:7011). The quarrier's hammer comes from `hammer` (:6864, :6885, steel :6906). The hoe from `hoe` (:7097, :7118, steel :7139). | **GAP.** (1) `mining 4` = coal_mining, not steel: the coal miner receives a steel pickaxe as soon as coal is available. (2) tool_hammer_big is fixed to "river" stone (citizens.js:74): `tech.hammer` never read. (3) tool_hoe and tool_spear reuse `M.tool` (based on mining). (4) `tech.pickaxe`, `hammer`, `hoe`, `saw`, `foraging` never read. |
| `tech.mill` sails according to `calendar.wind` | village_b3.js:477 | `calendar.wind` 0/1 (main.js:11925) | Correct. |
| Demo: `primitive 3, housing 1, agriculture 1, science 0, currency 0` | spritekit.js:540 | | These keys are **never read** elsewhere. |

For each tier, here are the real levels (all grants, Era 1): `primitive` 1-3 (club, bone/wooden, sundial); `housing` 1 (housing), 2 (cottage), 3 (apartment, discovery); `agriculture` 1 (agriculture), 2 (irrigation), 3 (silo), 4 (mill), 5 (windmill, discovery); `storage` 1 (storage), 2 (reinforced_shed), 3 (barns, discovery); `container` 1 (containerization), 2 (reinforced_crates); `currency` 1 (currency), 2 (market), 3 (tax_rates), 4 (large_trades); `banking` 1 (banking), 2 (investing), 3 (vault), 4 (bonds), 5 (steel_vault); `science` 1 (science), 2 (library), 3 (thesis), 4 (research_grant); `military` 1 (garrison), 2 (bows), 3 (flintlock); `armor` 1 (leather), 2 (plate); `theatre` 1 (theatre), 2 (playwright); `foundry` 1-4; `cement` 1-3; `theology` 2 (theology, after reset), 3 (fanaticism or anthropology).

### A.7 Era 1 techs that would change the appearance but that the kit does not read

| Tech | Visible consequence | Read to add | Estimated size |
|---|---|---|---|
| `irrigation` (agriculture 2, tech.js:1186) | water ditches / channels between the fields | `tech.agriculture>=2` | 2 pieces 8x4 (straight channel, elbow) + 4 animated water frames |
| `farm_house` (grant `farm`, tech.js:1166) | small house on the farm (the farm houses people) | `tech.farm>=1` | 1 piece 16x14 |
| `mill`/`silo` (agriculture 3-4) | already covered by buildings | | |
| `copper_hoe`/`iron_hoe` (hoe) | farmer's hoe in bronze, then iron | `tech.hoe` | 0 (recolor) |
| `copper_pickaxe`/`iron_pickaxe` (pickaxe) | miners' pickaxe | `tech.pickaxe` | 0 (recolor) |
| `copper_sledgehammer`/`iron_sledgehammer` (hammer) | stonecutter's mallet | `tech.hammer` | 0 (recolor) |
| `iron_saw` (saw 1) | lumberjack's saw / sawmill | already a building | |
| `bows` (military 2), `armor` 1, `plate_armor` 2 | soldier with bow, leather, plates | `tech.military>=2`, `tech.armor` | 2-3 pieces 12x16 (bow, leather breastplate, plate breastplate) |
| `currency` (currency 1), `market` (2), `large_trades` (4) | coins, market stalls on the plaza | `tech.currency` | 1 coin pile (3 levels) + 3 stalls 14x12 |
| `banking` (banking 1-5), `vault`, `steel_vault` | more massive bank (vault, steel door) | `tech.banking` | 0 to 2 variant pieces |
| `science` (1-4), `thesis`, `research_grant` | numeric; university/library already handled | | |
| writing / calendar | No writing tech in the code; the calendar is `sundial` | `tech.primitive>=3` | 0 |
| navigation | Not in Era 1: `wharf` is era industrialized (tech.js, grant `wharf`); the `compass` event is a simple text | | |
| fertilization | Only `compost`/`hot_compost`/`mulching` (detritivore trait) | | |
| `government` (govern 1) | government flag / banner (see D.1) | `civic.govern.type` | 7 color variants of one flag |
| `spy` / `espionage` (spy 1-2) | spies among the neighbors | `civic.foreign.govN.spy` | optional |
| `trade` (trade 1) | trade routes: caravans | `city.market.trade`, `resource[X].trade` | 1 cart + 1 pack animal, 8 frames |
| `wagon` (transport 2) | large wagon with beasts | gravity_well only | |

### A.8 Critical reading of report 8 (what is wrong or imprecise)

- "`lodge`: hunting 2 + currency" and "`smokehouse`: smokehouse tech": true in the code, but these two techs require the `carnivore` trait (or, for the lodge, `s_lodge` of the detritivore/wendigo/forager/artifical/unfathomable races, tech.js:1013-1024). The human never gets access. Same for `compost` (detritivore, tech.js:1060s): 3 of the 26 buildings are unreachable for the only race that report 8 retains.
- "`temple`: theology 2": correct, but `theology 1` is only set by `resetCommon` (resets.js:1283), so no temple, no priest, no fanaticism, no anthropology, no theocracy in a first playthrough.
- `hospital`: the report says "hospital tech"; it requires `alumina 1` = `bayer_process` (tech.js:7397), which requires `smelting 2` = steel. It is a **late** Era 1 building.
- `scientist`: the report includes it. The scientist job is unlocked by the **wardenclyffe** (era discovery, actions.js:3925), not by the library. `hunter` and `forager` only exist for the carnivore/soul_eater/unfathomable (hunter) or forager (actions.js:8842-8848) races. `teamster` only exists under gravity_well.
- Omission: `scavenger` appears on every `trashed` planet (main.js:11594-11596), whatever the race: the report wrongly excludes it.
- Omission: `metal_refinery` (bayer_process, civilized) is neither in the report nor in the kit.
- The report confuses "last tier" and real progression: `cement` (500 knowledge) can precede `copper_axes` (540 + metal_working 350).
- "the sundial gives day and night" (report 8, decor): wrong. The game has no hours; `sundial` starts the day counter (1 day = 1 pass of longLoop). The kit's day/night (option `OPT.night`) is purely decorative.

---

## B. EVENTS

Mechanics (main.js:12721-12760): a **major** event is drawn every `global.event.t` days (initial countdown 100-200, then 999; vars.js:23, :2399), a **minor** one every `m_event.t` (initial 99-499, then 850; vars.js:27, :2400). The probability per day is 1/(t+1) with t decreasing: the event therefore falls uniformly within the next ~1000 (resp. ~850) days. The conditions are filtered by `eventList` (events.js:1110-1195): `tech` = truthy value (>= 1), `trait`, `resource.display`, then `condition()`. The real-day astrological sign `pisces` (19 Feb-20 Mar) speeds up both counters (main.js:12733, :12754; seasons.js:338-381). Without the required trait, an event is never drawn.

### B.1 The 79 events

Summary: 79 keys, 30 major, 49 minor. Possible for a human, standard universe, Era 1 (no reset, outside challenges): 41. Deserving a visual among these: 26. Already covered, at least in part, by the kit: 11.

| # | key | type | source | prerequisite / condition | effect | possible for human Era 1? | to represent? | handled by the kit? |
|---|---|---|---|---|---|---|---|---|
| 1 | `dna_replication` | major | events.js:14 | protoplasm race + DNA resource | +random DNA | no (evolution phase) | no | — |
| 2 | `rna_meteor` | major | events.js:28 | protoplasm race + RNA | +RNA (meteorite) | no (evolution phase) | no | — |
| 3 | `inspiration` | major | events.js:42 | Knowledge displayed (from the sundial) | race.inspired 300-600: knowledge x2 | yes | yes: light bulb / halo on university-library, sparkle on the scientists | Partial: fx_bulb asset exists ("research done"), no trigger reads race.inspired |
| 4 | `motivation` | major | events.js:52 | tech primitive>=1 | race.motivated 300-600: morale + | yes | yes: banners / festival (bunting) | Partial: bunting drawn permanently outside winter (world.js:165), not tied to race.motivated |
| 5 | `fire` | major | events.js:62 | Lumber displayed; not aquatic; not evil | loses Rand(1, Lumber/4) wood | yes | yes: fire on the lumberjack / wood pile, black smoke | No |
| 6 | `flare` | major | events.js:77 | tech primitive; planet with flare trait (events.js:83) | kills <=10% of the housed; city.firestorm 400..4000 days (except oceanic): production -20% (main.js:1154) | yes if flare planet | yes: red sky, ashes, burning trees during firestorm | No |
| 7 | `raid` | major | events.js:133 | tech military (barracks); a neighbor hstl>60; not truepath | soldiers killed/wounded; if army < Rand(25,50)x(high_tech+1) steals <=1/4 of the money | yes (after garrison) | yes: raiders at the edge of the village, defending soldiers | No |
| 8 | `siege` | major | events.js:187 | tech military; the 3 neighbors hstl>80 | same as raid, steals <=1/2 of the money | yes (rare) | yes: coalition army in front of the walls | No |
| 9 | `pillage0` | major | events.js:237 | truepath trait | pillage by gov0 | no (truepath) | no | — |
| 10 | `pillage1` | major | events.js:250 | truepath trait | pillage by gov1 | no (truepath) | no | — |
| 11 | `pillage2` | major | events.js:263 | truepath trait | pillage by gov2 | no (truepath) | no | — |
| 12 | `pillage3` | major | events.js:276 | truepath trait + rival | pillage by gov3 | no (truepath) | no | — |
| 13 | `witch_hunt_crusade` | major | events.js:288 | magic + witch_hunter + Sus>=100 | anti-sorcerer crusade | no (magic universe) | no | — |
| 14 | `terrorist` | major | events.js:300 | tech world_control | soldiers wounded/killed | no (post-Era 1) | no | — |
| 15 | `quake` | major | events.js:334 | tech wsc (very late) + unstable planet | earthquake (flag tech.quaked) | no (post-Era 1) | no | — |
| 16 | `doom` | major | events.js:349 | tech wsc + space_barracks | demonic portal | no | no | — |
| 17 | `demon_influx` | major | events.js:364 | tech portal_guard | influx of demons | no | no | — |
| 18 | `ruins` | major | events.js:375 | ancient_ruins trait + Knowledge | +Iron/Copper/Steel/Cement <= max/4 | depends on race (rare trait) | yes (minor): ruins to dig | No |
| 19 | `tax_revolt` | major | events.js:398 | morale < 99 AND tax_rate > 25 (45 if oligarchy); not blissful | random loss of ALL resources | yes | yes: crowd, torches, riot on the plaza | No |
| 20 | `slave_death1` | major | events.js:417 | slaver trait + tech slaves | a slave dies | no (slaver) | no | — |
| 21 | `slave_death2` | major | events.js:418 | same | same | no (slaver) | no | — |
| 22 | `slave_death3` | major | events.js:419 | same | same | no (slaver) | no | — |
| 23 | `protest` | major | events.js:420 | republic government (tech republic = era discovery) | protest (text) | no (post-boundary) | optional: placards | No |
| 24 | `scandal` | major | events.js:457 | "muckraker" governor (governor gene) | scandal (text) | no (prestige) | no | — |
| 25 | `spy` | major | events.js:491 | at least 1 spy posted with a neighbor; not elusive | loses 1 spy | yes (after spy tech) | minor: gallows / captured spy | No |
| 26 | `mine_collapse` | major | events.js:529 | tech mining + miners > 0 | -1 citizen and -1 miner | yes | yes: cave-in, dust and broken props on the mine | No |
| 27 | `klepto` | major | events.js:547 | rogue trait + Money | steals resources | no (rogue) | no | — |
| 28 | `chicken_feast` | major | events.js:584 | chicken trait | citizens devoured (joke) | no (chicken) | no | — |
| 29 | `brawl` | major | events.js:608 | aggressive trait | soldiers dead in a brawl | no (aggressive) | no | — |
| 30 | `m_curious` | major | events.js:627 | curious trait, >=40 citizens | 5 outcomes (dungeon, etc.) | no (curious) | no | — |
| 31 | `curious1` | minor | events.js:718 | curious trait | text | no (curious) | no | — |
| 32 | `curious2` | minor | events.js:729 | curious trait | text | no (curious) | no | — |
| 33 | `slave_escape1` | minor | events.js:740 | slaver trait | a slave escapes | no (slaver) | no | — |
| 34 | `slave_escape2` | minor | events.js:741 | slaver trait | same | no (slaver) | no | — |
| 35 | `slave_escape3` | minor | events.js:742 | slaver trait | same (string death4) | no (slaver) | no | — |
| 36 | `shooting_star` | minor | events.js:743 | primitive>=1 | text | yes | yes: shooting star in the sky | No (the sky only has sun, moon, clouds; stars only in the night option) |
| 37 | `tumbleweed` | minor | events.js:744 | primitive>=1 | text | yes | yes: tumbleweed crossing the plaza (mostly desert) | No |
| 38 | `flashmob` | minor | events.js:745 | tech high_tech (mad_science, era discovery) | text | no (post-boundary) | no | — |
| 39 | `witch_hunt` | minor | events.js:746 | magic + witch_hunter | kills a scientist | no (magic) | no | — |
| 40 | `chicken` | minor | events.js:762 | chicken trait | a citizen devoured | no (chicken) | no | — |
| 41 | `fight` | minor | events.js:784 | aggressive trait | citizens killed | no (aggressive) | no | — |
| 42 | `heatwave` | minor | events.js:804 | primitive; not cataclysm; temp != 2; not winter on tundra/taiga/eden | calendar.temp = 2 (hot); city.cold = 0 | yes | yes: heat haze (the calendar is already read) | Partial: temp read but only for snow vs rain and lightning (world.js:320,338) |
| 43 | `coldsnap` | minor | events.js:828 | primitive; temp != 0; not hellscape (except permafrost); not summer on ashland/volcanic/eden | calendar.temp = 0; city.hot = 0 | yes | yes: frost, mist, snow if precipitation | Partial: snow/rain via temp=0; no ground frost out of season |
| 44 | `cucumber` | minor | events.js:856 | primitive | text (joke) | yes | no | — |
| 45 | `planking` | minor | events.js:857 | tech high_tech | text | no (post-boundary) | no | — |
| 46 | `furryfish` | minor | events.js:858 | primitive | text | yes | gag: furry fish (optional) | No (fish sprite exists, no variant) |
| 47 | `meteor_shower` | minor | events.js:859 | primitive | text | yes | yes: meteor shower | No |
| 48 | `hum` | minor | events.js:860 | tech high_tech | text | no (post-boundary) | no | — |
| 49 | `bloodrain` | minor | events.js:861 | primitive | text | yes | yes: red rain for a few minutes | No (precipitation read, color fixed) |
| 50 | `haunting` | minor | events.js:862 | tech science>=1 | text | yes (after university) | yes: ghosts near the graveyard / buildings | No |
| 51 | `mothman` | minor | events.js:863 | tech science>=1 | text | yes (after university) | optional: winged silhouette with red eyes | No |
| 52 | `dejavu` | minor | events.js:864 | tech theology>=1 (reset flag) | text | after a reset only | no | — |
| 53 | `dollar` | minor | events.js:865 | tech currency>=1 | +1..9 $ | yes | yes: coin that shines / bounces | Partial: "+1" click effect exists (world.js:359) but is not triggered by the event |
| 54 | `pickpocket` | minor | events.js:873 | tech currency>=1 | -1..9 $ | yes | minor: pickpocket | No |
| 55 | `bird` | minor | events.js:881 | primitive | text | yes | gag: bird | Partial: ambient birds exist (world.js ambient) |
| 56 | `contest` | minor | events.js:882 | tech science>=1 | text (place, type) | yes | optional: trophy / podium | No |
| 57 | `cloud` | minor | events.js:893 | primitive | text (cloud shape, 11 types) | yes | optional: cloud in a shape | Partial: ambient clouds, no shapes |
| 58 | `dark_cloud` | minor | events.js:897 | not cataclysm; weather != 0 | calendar.weather = 0 (precipitation) | yes | yes: downpour (calendar already read) | Yes (calendar.weather read) |
| 59 | `gloom` | minor | events.js:913 | not cataclysm; weather != 1 | calendar.weather = 1 (cloudy) | yes | yes: overcast sky | Yes (calendar.weather read) |
| 60 | `tracks` | minor | events.js:929 | primitive | text | yes | yes: strange footprints in the dirt | No |
| 61 | `hoax` | minor | events.js:930 | primitive | text | yes | optional: "alien carcass" (hoax) | No |
| 62 | `burial` | minor | events.js:931 | primitive | text | yes | yes: mound / graves on a construction site | No |
| 63 | `artifacts` | minor | events.js:932 | tech high_tech | text | no (post-boundary) | no | — |
| 64 | `parade` | minor | events.js:933 | tech world_control | text | no | no | — |
| 65 | `crop_circle` | minor | events.js:934 | tech agriculture>=1 | text | yes (after farm) | yes: circles in the fields | No (farm without variant) |
| 66 | `llama` | minor | events.js:935 | primitive; not carnivore/soul_eater/detritivore/artifical | loses Rand(25,100) Food | yes | yes: herd of llamas in the fields | No |
| 67 | `cat` | minor | events.js:949 | primitive | text | yes | gag: black cat crossing | Partial: cat_roof (cat on a roof, village.js:441) exists |
| 68 | `omen` | minor | events.js:950 | primitive | text | yes | gag: X-shaped cloud | No |
| 69 | `theft` | minor | events.js:951 | primitive | text (thief, 10 types) | yes | optional | No |
| 70 | `compass` | minor | events.js:955 | tech mining>=1 | text | yes | no | — |
| 71 | `bone` | minor | events.js:956 | primitive | text | yes | yes: pile of bones on the outskirts | No |
| 72 | `delicacy` | minor | events.js:957 | tech high_tech | text | no (post-boundary) | no | — |
| 73 | `prank` | minor | events.js:958 | primitive | text (10 types) | yes | optional: smoking bag in front of the door | No |
| 74 | `graffiti` | minor | events.js:962 | tech science>=1 | text | yes (after university) | yes: graffiti on a building wall | No |
| 75 | `soul` | minor | events.js:963 | tech soul_eater | text | no (soul_eater) | no | — |
| 76 | `cheese` | minor | events.js:964 | tech banking>=1 AND banking>=7 | temporary race.cheese | no (banking 7 = post-Era 1) | no | — |
| 77 | `tremor` | minor | events.js:981 | primitive | text (no damage) | yes | yes: light screen shake / dust | No |
| 78 | `rumor` | minor | events.js:982 | primitive | text (10 rumors) | yes | no | — |
| 79 | `pet` | minor | events.js:986 | primitive | adopts a cat (12 names) or a dog (10 names): global.race.pet | yes (once) | yes: pet that follows the player / sleeps by the fire | Partial: cat_roof only; no dog, no cat on the ground |

(Keys built by function: `slaveLoss` events.js:1035, `basicEvent` :1012. Texts: strings.json `event_*`.)

### B.2 Calendar events (real device date, not the game calendar)

All are switched off by the `boring` setting (functions.js:2881s). Today (2026-10-15): none active.

| Event | Window | Source | Visible effect in the game | To represent? | Kit |
|---|---|---|---|---|---|
| Easter | Easter Sunday + 10 days (Gregorian computation) | functions.js:2944-3039 | 18 clickable egg icons (egg1-18); `wolven`, `vulpine` races become Easter bunnies/foxes (races.js:45-53); plasmids +9 | yes: eggs hidden in the decor | No |
| Halloween | 28 Oct - 4 Nov | functions.js:3041-3094 | 7 ghosts (trick) + 7 candies (treat) clickable; **the human becomes a zombie** (races.js:70-76); `basic_housing` -> "Haunted House" (actions.js:8117-8120; strings 8310); Food -> Candy, Lumber -> Bones, Stone -> Rock Candy, Furs -> Webs, Plywood -> Boneweave, Brick -> Tombstone (resources.js:1204-1231); structures renamed (actions.js:8225s) | yes: pumpkins, cobwebs, ghosts, zombie skin, haunted houses | No |
| Christmas | 17-24 Dec: `tech.santa`=1 | main.js:12790-12795; actions.js:930-1000 | "Holiday Gift" action (wrapped gift, plasmids); `elven`, `capybara`, `centaur`, `wendigo`, `entish`, `yeti` races become "Christmas" versions (races.js:31-44); `xmas` achievement on the 25th (achieve.js:845) | yes: tree/gift on the plaza | No |
| April 1st | April 1st | functions.js:2874-2885; main.js:12799-12806 | CSS class `fool`; text inversions; `horseshoe` (2023) | no | No |
| Launch day | May 6 | functions.js:2886-2893; space.js:7311 | space texts | no (post-Era 1) | No |
| Summer solstice | June 20-22 | functions.js:2894-2926; actions.js:4585-4610; main.js:3111 | **Pyre ("Bonfire Pyre")**, an "outskirts" building requiring primitive 3, burns Thermite for morale; Thermite craftable at the foundry (jobs.js:833) | yes: large pyre | No (fire_ring exists, it is the permanent campfire) |
| Fireworks | July 1-4 | functions.js:2928-2943; actions.js:4620-4660 | **Firework Factory** (mining 3 + cement): fireworks | yes: fireworks | No |
| Date-only achievements | Friday 13th; Feb 14 (valentine); Mar 17 (leprechaun); Nov 22-28 (thanksgiving; seasonal `arraak`); April 1-3 | achieve.js:788-850 | achievements, no structure | no | — |
| Astrological sign | real date, 12 signs | seasons.js:338-381 | bonus (e.g. Libra = birth rate; Pisces = more frequent events) | no | — |

### B.3 What the kit already handles on the "event" side

- The calendar is read: `weather` (precipitation / cloudy / sun), `temp` (snow vs rain, more frequent lightning when hot), `wind`, `moon`, `day` (sundial) -> world.js:174-181, :221, :253, :288, :318-338. The events `heatwave`, `coldsnap`, `dark_cloud`, `gloom` write directly into `calendar.temp/weather` (events.js:804-912), so they are **already visible**.
- No read of `global.event`, `race.motivated`, `race.inspired`, `race.pet`, `city.firestorm`, nor of the message queue. world.js:374-390 `events(b, ctx)` is the **click** animation (ripple, +1), not a game event handler.

---

## C. WORLD

### C.1 Calendar, seasons, weather, temperature, wind, moon


| Element | Values in the code | Source | Read by the kit? |
|---|---|---|---|
| `calendar.day` | 0 before the sundial; then 1..orbit; +1 per `longLoop` (rate: 20 ticks of 250 ms = 5 s at x1, derived from vars.js:2273 and main.js:849-858) | main.js:11776-11783 | Yes, only for the sundial hand (world.js:143, :155) and the cache signature (village.js:404); **not used to detect "no sundial yet"** |
| `calendar.year` | +1 when day > orbit | main.js:11780-11783 | No (demo only) |
| `calendar.orbit` | 365 by default; roll 200..599 (maxOrbit 600, +200 if elliptical, +100 if kamikaze); hellscape 666; eden 777 | actions.js:6723-6745; vars.js:2242s | No |
| `calendar.season` | 0 spring, 1 summer, 2 autumn, 3 winter; 4 equal quarters of `round(orbit/4)` days; **-1** if cataclysm / orbit_decayed | main.js:11786-11815 | Yes: `clamp(season,0,3)` (spritekit.js:525); -1 is brought back to spring |
| `elliptical` seasons | 6 segments: spring, summer, summer, autumn, winter, winter (double summers and winters) | main.js:11789-11813 | Naturally (the game calendar is read), but no distinctive sign |
| `calendar.weather` | 0 precipitation (snow if `temp==0`, rain otherwise); 1 cloudy; 2 sunny; -1 in cataclysm. Roll: 1 day in 5 (`Math.rand(0,5)==0`), sky 0-4 -> 20% precip, 40% cloudy, 40% sun, adjustments by biome and season | main.js:11825-11923; seasons.js:197-222 | Yes (sky, clouds, rain, snow, lightning) |
| `calendar.temp` | 0 cold, 1 moderate, 2 hot; hot summer, cold winter; tundra/taiga always cold in winter; volcanic and ashland always hot in summer; hellscape never cold; eden cold only in winter, hot only in summer | main.js:11925-11956 | Yes (snow vs rain, lightning); no ground effect (frost, heat haze) |
| `calendar.wind` | 1 = windy (1 chance in 3), more frequent in autumn; `stormy` accentuates | main.js:11828, :11882, :11896, :11955 | Yes (clouds, mill sails, smoke, leaves) |
| Thunderstorm | rain + wind + temp>0 ("thunderstorm"); morale -5 (-2 simple rain) | main.js:1401-1415; seasons.js:272-283 | Gap: the kit launches lightning according to `temp==2` only (world.js:338), not according to `wind==1` |
| Snow | precipitation + `temp==0` | seasons.js:197-222 | Yes |
| `calendar.moon` | 0..27 (28 days), +1 per day; **-1 per day if `retrograde`**; phases (strings moon1-8) | main.js:11977-11990; seasons.js:6-185 | Yes (world.js:181) |
| Effect of weather on the game | farm: cold -30% (precip) / -15%, sun +10%; morale: calm sun +2, rain -2, storm -5 | main.js:3530-3550; :1396-1430 | No (no morale visual) |
| Counters `city.sun/cold/hot` | consecutive days of sun / cold / heat; `ozone`: production penalty `sun x 0.25` % | main.js:11959-11974, :1077 | No |

### C.2 Biomes

The game defines exactly **12 biomes** (races.js:7857-7950), the same as the kit's 12 (spritekit.js:131-143, world.js:15-22).

| Biome | Source | Rolled on first launch? | Game effects (ref.) | Kit: palette | Kit: trees (world.js:15-22) |
|---|---|---|---|---|---|
| grassland | races.js:7858 | yes (base) | agriculture x1.2 | default | pine .42 / broad .5, density 1 |
| oceanic | :7866 | yes (base) | titanium / iron x1.12, hunting x0.95; rainy (main.js:11831) | lush grass, sand, water | pine .3 / broad .62, d .75 |
| forest | :7874 | yes (base) | lumberjack x1.2 | conifer grass | pine .45 / broad .5, d 1.6 |
| desert | :7882 | yes (base) | quarrier x1.2, oil x1.1, lumberjack x0.75; sunnier | sand, hot (no snow) | dead .3, d .45, bushes x3 |
| volcanic | :7890 | yes (base) | agriculture x0.9, copper x1.12, iron x1.08; summer always hot | basalt, fissures, hot | dead .8, d .6 |
| tundra | :7898 | yes (base) | hunting fur x1.25; winter always cold | permanent snow | pine .88, d .8 |
| savanna | :7906 | no: sub-biome of grassland (1 chance in 3 if `biome_grassland` achievement) (actions.js:6862-6868) | agriculture x1.1, hunting x1.18, lumberjack x0.8 | dry grass, hot | broad .9, d .5, bushes x2 |
| swamp | :7914 | no: sub-biome of oceanic or forest (achievement) (actions.js:6869-6881) | defense x1.4, loot x1.25, wood x1.1, stone x0.88; rainy | "murk" grass/water | d 1.1, dead .42 |
| ashland | :7922 | no: sub-biome of desert or volcanic (achievement) (actions.js:6882-6896) | agriculture x0.62, **cement (Ashcrete)** x1.25, copper and iron x1.1; **falls through to the `volcanic` case for lack of a `break`** (main.js:11850-11860), hence hot summer | ash, slate, **not marked hot** in the kit | dead .65, d .6 |
| taiga | :7930 | no: sub-biome of forest or tundra (achievement) (actions.js:6876-6881, :6897-6902) | wood x1.1, population growth x1.5, oil x0.92; winter always cold | conifer | pine .88, d 1.4 |
| hellscape | :7938 | no: requires `stats.portals >= 1` (actions.js:6859, :6903-6905) | agriculture x0.25; never cold; reserved for demons | embers, hot | dead 1, d .45 |
| eden | :7946 | no: `evil` universe and portals >= 1 (actions.js:6903-6905) | no multiplier; hot in summer only, cold in winter only | lush grass, flowers x2.2 | broad .75, d 1.3 |

Gaps: (1) `ashland` should be treated like volcanic (hot in summer): the kit does not mark it `hot`. (2) A race settled outside its preferred biome suffers -20% overall production (main.js:1160-1182): no visual. (3) The planet also saves its name (`biome + number`, actions.js:6786) and the `eden` biome is returned as `hellscape` during evolution (actions.js:6833).

### C.3 Planet traits (planetTraits, races.js:7952-8043)

Roll (actions.js:6907-7005): 2 attempts; 1st attempt 14/18 chance of getting a trait, 2nd attempt 14/27; 0, 1 or 2 traits per planet. All are fixed when the planet is chosen, therefore **active from the very first day**. The kit never reads `global.city.ptrait`.

| Trait | Game effect (ref.) | Visible from Era 1? | Visual idea | Size |
|---|---|---|---|---|
| toxic | reduced birth rate (birth roll bound x1.25, main.js:3964) and more frequent mutations (races.js:7953-7960) | yes | green veil, toxic puddles | recolor + 1 puddle piece 12x6 |
| mellow | production -10%, reduced stress (main.js:1073) | yes | purple mist | recolor |
| rage | soldiers: combat/hunting | yes (army) | red banner at the barracks | 0 |
| stormy | more frequent wind (main.js:11896) | yes | bent trees, fast clouds | 0 (already via `wind`) |
| ozone | production -(sun days x0.25%) (main.js:1077) | yes | aggressive white sun, red skin | recolor |
| magnetic | sundial +1 (main.js:4167) | yes | aurora, sparkling sundial | 1 effect |
| trashed | agriculture x0.75; **scavenger job** (main.js:11594); "Shanty" housing (actions.js:8156) | yes | dump: garbage heaps, makeshift huts | 4-6 decor pieces + hut variant |
| elliptical | double summers and winters (main.js:11789) | yes (via season) | none specific | 0 |
| flare | `flare` event + `city.firestorm`: production -20% (main.js:1154) | yes (event) | red sky, embers, fire in the trees | 1 tint + 4 ember frames |
| dense | miners: production x1.2, stress | yes (miners) | more massive rocks | 0 |
| unstable | iron techs at half the knowledge cost (tech.js:6778, :6885, :6969, :7118); iron added to the cost of some buildings (actions.js:3147-3160) | yes | ground cracks (already: `cracks`) | 0-2 pieces |
| permafrost | mines x0.75; no heat on volcanic (main.js:11863) | yes | permanently frozen ground | recolor |
| retrograde | moon in reverse (main.js:11979) | yes | none | 0 |
| kamikaze | orbit shortens each year (min 100 days) (races.js:8047) | yes | growing star | 1 sun image |

---

## D. CIVICS AND WAR (civics.js)

| Domain | Content in the code (Era 1) | Source | Visible in the village view? | Kit |
|---|---|---|---|---|
| Starting government | `anarchy` (production -0.2% per citizen beyond 10) | actions.js:8642; main.js:1128 | yes: village without a flag | No |
| Era 1 government types | autocracy, democracy, oligarchy (tech `government`); theocracy (tech `theocracy`, after reset) | civics.js:389-421; tech.js:3028, :3055 | banner / emblem | No |
| Discovery types (boundary) | republic (tech.js:3074), socialist (:3096) | | same | No |
| Out-of-scope types | corpocracy, technocracy, federation (late eras), magocracy (magic), dictator (wish trait) | civics.js:403-421 | no | — |
| Revolution | after a type change, 1000+ days of delay before the next (`govern.rev`) | civics.js:424-460 | no | No |
| Foreign powers | **3** neighbors (gov0, gov1, gov2), name drawn from 14 templates (Coalition, Republic, Federation, Kingdom, States, Empire, Union, Protectorate, Emirate, Dominion, Dynasty, Nation, Commonwealth, Sultanate; strings 5808-5821); hostility, strength, economy; states `occ` (occupied), `anx` (annexed), `buy` (bought) | vars.js:1704-1760; civics.js:140-148, :489 | yes: 3 neighboring camps or towns with a flag, at the edge | No |
| Campaigns (garrison) | 5 tactics: ambush, raid, pillage, assault, siege; resolved instantly (no march on screen); siege = occupation | civics.js:1548-1620, :1311-1322 | yes: soldiers leaving / returning, battalion standard (`garrison.raid`) | Partial: soldier exists (spear, shield, helmet), no march |
| Espionage | tech spy 1-4; actions influence, sabotage, incite (+ annex, purchase); spies trained per neighbor | civics.js:743-990 | minor: hooded silhouette | No |
| Trade | tech trade: Trade Post -> 2 routes (3 with diplomacy) (actions.js:3162); routes per resource `resource[X].trade` (+import / -export); ratio table (resources.js:57) | resources.js:1365-1560 | yes: caravans coming in / going out according to `city.market.trade` | No |
| Market | tech market (currency 2): buying / selling the displayed resources among Food, Lumber, Stone, Furs, Copper, Iron, Cement, Coal, Steel (+ Chrysotile, Aluminium depending on the game) | resources.js:57-75 | yes: stalls | No |
| Taxes | `civic.taxes.tax_rate` (20 by default), cap 30 (+20 if currency 5, +20 oligarchy); morale -(rate-20); > 25 triggers `tax_revolt` | civics.js:992-1054; main.js:3146; events.js:398 | no (riot if revolt) | No |
| Law / crime / police | **do not exist** in the game (no occurrence outside tech text) | grep civics.js | — | — |
| Mercenaries | tech mercs, `garrison.m_use` | tech.js:7352; civics.js:1128-1172 | minor | No |
| Soldiers | wounded `garrison.wounded`, hospital, army `garrison.workers` | civics.js:1174 | yes (already: soldier citizen) | Yes (counts read citizens.js:162) |

Visual elements to represent (detail in E-Missing items): government flag (7 color variants), 3 neighboring camps with flag and state, marching battalion, caravan, market stalls.

---

## E. WONDERS AND ARPA

| Element | Condition | Source | Era 1? |
|---|---|---|---|
| ARPA (physics, genetics, blood) | tech `arpa` (high_tech 6, era `globalized`) | tech.js:4960-4975; arpa.js:41 | No |
| ARPA projects: lhc, stock_exchange (banking 9), tp_depot, launch_facility, monument (tech monument, high_tech 6), railway, roid_eject, nexus, syphon | high_tech 6+ or banking 9+ | arpa.js:38-310; tech.js:4001-4017 | No |
| Monument (obelisk, statue, sculpture, monolith, pillar, megalith, random draw) | tech monument, era globalized | arpa.js:149-170; tech.js:4001 | No |
| `wonder_lighthouse`, `wonder_pyramid` | `wish` trait + `wishStats` (wish granted) | actions.js:3424, :3447 | No (wish trait) |
| `tourist_center` | tech tourism (early_space) | actions.js:3235 | No |

No wonder / ARPA element is therefore needed for Era 1. Prestige is out of scope: the 1st reset (MAD) comes with the later eras (resets.js).

---

## F. OTHER (neither building, nor job, nor resource, nor UI)

| Element | Description | Source | Sprite to consider? | Kit |
|---|---|---|---|---|
| Village name | **does not exist**: the game displays a **planet** name ("[traits] [biome] [number]") and the race name | actions.js:6786-6790; main.js:639-649 | no (UI banner) | — |
| Flag | no player flag; only neighbors' names | civics.js:140 | yes (see D) | `flag` module exists, not linked |
| Playable races | 64 keys in `races` including protoplasm (races.js:5015-6700); ~31 always playable + 14 depending on the biome (sharkin, octigoran, dryad, satyr, phoenix, salamander, yeti, wendigo, tuskin, kamel, balorg, imp, seraph, unicorn) | races.js (`basic()`) | yes: the kit only handles the human (3 skins, 5 hairs) | 1 race |
| Housing per race | title of the base housing: Cabin, Hut (orc), Den (wolven), Grove (entish), Nest (avian), Spore Nest, Stable (unicorn), Villa (seraph), Tent (sand), Igloo (polar), Dugout (eldritch), **Shanty (trashed planet)** | actions.js:8117-8156 | yes (variants per genus) | No |
| Diet / traits that remove buildings | carnivore: lodge / smokehouse (no farm); detritivore: compost; soul_eater: soul_well; evil: graveyard + reclaimer instead of lumberjack; flier: no cement; kindling_kindred / smoldering: no wood; forager, artifical, unfathomable | tech.js (`trait` / `not_trait` fields) | yes if several races are targeted | No |
| Pet | cat (12 names) or dog (10 names), appears through the `pet` event; colors and patterns | events.js:986-1009; functions.js:2395-2480 | yes | Partial (cat on roof only) |
| Christmas gift, Easter eggs, Halloween ghosts / candies | clickable icons (egg 16 px, ghost, candycorn) | functions.js:2494-2570 | yes (see B.2) | No |
| Prestige, reset | no reset before gunpowder / MAD; `theology 1`, `genes`, plasmids are kept after a reset | resets.js; vars.js:2256 | no | — |
| "Bunker" mode | an **evolution** screen, not the village view: the `evo_bunker` button opens the challenge menu (`challenge`) | actions.js:5348-5368 | no | — |
| Challenges / scenarios modifying Era 1 | `cataclysm` (season -1, no weather), `orbit_decay` (the moon grows), `lone_survivor`, `gravity_well` (wheel, wagon, teamster), `steelen` (immediate steel), `joyless` (no theatre), `fasting`, `banana` (money from the sundial), `truepath` (5 neighbors), `warlord`, `witch_hunter`, `inflation`, `junker`, `sludge`, `simulation` | actions.js:5258-5460; strings 1031-1150 | no for the standard game | — |
| Achievements / emblems | icons (`format_emblem`) | functions.js:2578-2630; achieve.js | optional | No |
| State reading by the kit | `window.evolve.global`, read once per second; **only exists if the `global.settings.expose` setting is active** | spritekit.js:585; debug.js:12-45; main.js:8097 | important for integration | — |

---

## Missing items to add (by priority)

Sizes follow the kit conventions: tile 32x16, building 1x1 = 32 px wide, 2x2 = 64 px, citizen 16x24, icon 16x16, decor piece 8-16 px.

### P0 — Reading fixes (0 new sprites)

| # | Description | Trigger in `global` | Size |
|---|---|---|---|
| 1 | Draw neither sundial, nor lanterns, nor garlands, nor signpost before the sundial; before it, village = campfire alone, calendar frozen | `global.tech.primitive >= 3`; `global.city.calendar.day > 0` | 0 |
| 2 | Citizens' tools from the real techs: pickaxe = `tech.pickaxe` (1 bronze, 2 iron, 3 steel), mallet = `tech.hammer`, hoe = `tech.hoe`, saw = `tech.saw`, axe = `tech.axe`. Fix citizens.js:68 (`mining 4` is not steel) | `global.tech.pickaxe/hammer/hoe/saw/axe` | 0 (recolor) |
| 3 | Remove from the human Era 1: teamster + cart (gravity_well), scientist (wardenclyffe), hunter / forager (carnivore or forager); add `scavenger` for the trashed planet | `global.race.gravity_well`, `global.civic.scavenger.display`, `global.civic.hunter.display` | scavenger job: 10 frames 16x24 |
| 4 | Mark `ashland` as a hot biome (volcanic behavior) | `global.city.biome` | 0 |
| 5 | Buildings absent for the human in the 1st playthrough (smokehouse, lodge, compost, temple): the count-based plan already hides them; change nothing, but document | | 0 |

### P1 — Strong visuals, low cost

| # | Description | Trigger | Size |
|---|---|---|---|
| 6 | Government flag: one pole + banner, 7 colors (autocracy, democracy, oligarchy, theocracy, republic, socialist; nothing in anarchy) | `global.civic.govern.type` | 1 piece 8x14, recolor |
| 7 | `flare` planet: fire storm (red sky, embers, burning trees) | `global.city.ptrait.includes('flare')`; `global.city.firestorm > 0` | 1 tint + 4 ember frames 16x16 |
| 8 | `trashed` planet: dump (4-6 garbage heaps), "Shanty" housing | `ptrait.includes('trashed')` | 6 decor pieces 8-14 px + hut variant |
| 9 | `fire` event: fire on the lumberjack / wood pile | `global.event.l === 'fire'` (last event) | 4 frames 16x24 + smoke (existing) |
| 10 | `mine_collapse` event: cave-in + dust on the mine | `global.event.l === 'mine_collapse'` | 4 frames 16x16 |
| 11 | `inspiration` / `motivation`: light bulb above the university; banners | `global.race.inspired`, `global.race.motivated` | 0 (existing fx_bulb, bunting assets) |
| 12 | Irrigation: channels between fields | `global.tech.agriculture >= 2` | 2 pieces 8x4 + 4 water frames |
| 13 | Soldier's weapons and armor: bow, leather, plates | `tech.military >= 2`, `tech.armor` | 3 pieces 12x16 |

### P2 — Civic and world content

| # | Description | Trigger | Size |
|---|---|---|---|
| 14 | 3 neighboring camps at the edge with flag and state (normal, hostile, occupied, annexed, bought) | `global.civic.foreign.gov0-2` (`hstl`, `occ`, `anx`, `buy`) | 1 tent / palisade 2x2 (64x40) + 4 flag variants |
| 15 | Raid / siege: raiders at the edge, defending soldiers | `global.event.l` in (raid, siege) | 3 raiders 16x24 x 6 frames |
| 16 | Marching battalion (campaign launched) | `global.civic.garrison.raid > 0` | 4 frames of marching soldier + standard |
| 17 | Trade caravans | `global.city.market.trade > 0` (number of routes) | 1 cart + pack animal, 8 frames |
| 18 | Market stalls on the plaza | `global.tech.currency >= 2` | 3 pieces 14x12 |
| 19 | Tax riot | `global.event.l === 'tax_revolt'` | crowd of 3 citizens + torches, 6 frames |
| 20 | Captured spy / gallows | `global.event.l === 'spy'` | 1 piece 10x14 |
| 21 | Pet (cat, dog) | `global.race.pet` | 2 animals x 6 frames 12x10 |
| 22 | Metal refinery | `global.city.metal_refinery.count` | building 2x2 64x44 + 4 frames (3 tier variants) |
| 23 | Habitable farm | `global.tech.farm >= 1` | 1 piece 16x14 |

### P3 — Event decor and gags (optional)

| # | Description | Trigger | Size |
|---|---|---|---|
| 24 | Shooting star, meteor shower | `global.event.l` in (shooting_star, meteor_shower) | 1 effect 8 frames |
| 25 | Red rain | `event.l === 'bloodrain'` | precipitation recolor |
| 26 | Tumbleweed, llama herd, black cat, mound, pile of bones, footprints, graffiti, ghost | corresponding `event.l` | 1 piece each (8-14 px) |
| 27 | Crop circles in a field | `event.l === 'crop_circle'` | 1 piece 24x12 |
| 28 | Light tremor | `event.l === 'tremor'` | 0 (camera offset) |

### P4 — Calendar events (trigger: device date)

| # | Description | Trigger | Size |
|---|---|---|---|
| 29 | Halloween: pumpkins, cobwebs, ghosts; human as a zombie; "Haunted House" | 28 Oct - 4 Nov (`eventActive('halloween')`) | 4 decor pieces + 1 zombie skin (skin recolor + 2 scars) + hut variant |
| 30 | Easter: 18 hidden eggs | Easter Sunday +10 days | 1 piece 8x10 x 3 colors |
| 31 | Christmas: tree and gift on the plaza | 17-24 Dec (`tech.santa`) | 2 pieces 14x20 |
| 32 | Solstice: large pyre | June 20-22 | 1 piece 24x30 + 4 frames |
| 33 | Fireworks | July 1-4 | 1 effect 8 frames 32x32 |

### P5 — Multi-race (if the kit opens up beyond the human)

| # | Description | Trigger | Size |
|---|---|---|---|
| 34 | Housing per genus (Hut, Den, Grove, Nest, Tent, Igloo, Dugout...) | `global.race.species` / `maintype` | 1 hut variant per genus (8) |
| 35 | Skin palette / traits per race (45 playable) | `global.race.species` | recolor + accessories |

---

## Doubts / not verified

1. **Game not run.** No value was observed during a game; everything is read from the code. The rates ("1 day = 5 s") are derived from `webWorker.mt = 250`, `longRatio = 20` (vars.js:2273) and from the trigger in `longLoop` (main.js:11531), to be confirmed in game.
2. **The numeric effects of the planet traits** come from `vars()` (races.js:7952-8036), with two sets of values (normal / `rejuvenated`). I re-read the point of use of toxic, mellow, ozone, magnetic, dense, permafrost, trashed, elliptical, stormy, retrograde and flare; not that of rage or kamikaze in detail.
3. **"Human" availability**: the columns are based on the `trait`/`not_trait` fields of each tech. The human's `creative` / `diverse` trait interacts with none of the Era 1 techs (grep). The traits of the `humanoid` genus (adaptable, wasteful, races.js:90-92) block nothing, but were not re-read for each tech.
4. **Buildings by template (`buildTemplate`)**: `shrine` (theology 2, magnificent trait, actions.js:5011-5068), `bonfire`, `firework`, `horseshoe` are read. `s_alter`, `meditation`, `captive_housing`, `slave_pen` were only read through their grant, not through their cost / effect.
5. **The appearance conditions of the jobs** (thus of the citizens to draw) come from the `display = true` in actions.js (farmer :1761, lumberjack :2533, quarry_worker :2640, cement_worker :2700, craftsman :2750, miner :2990, coal_miner :3039, entertainer :3320, priest :3409, professor :3735, scientist :3925). I did not re-read jobs.js for the caps or the special cases (races with `servants`).
6. **Weather iterations**: the roll table (main.js:11825-11923) has an `ashland` case without a `break` that I read as either intended or accidental without being able to decide; in both cases the observable behavior is "hot in summer".
7. **Kit reading**: for the cache signature the kit mixes `weather, temp, moon, day%24` (village.js:404). I did not verify that the terrain cache updates properly when `calendar.season` goes to -1 (cataclysm, outside Era 1).
8. **Halloween ghosts**: their number (7 + 7, the loop at main.js:8114 goes up to 8) is uncertain by one; not useful for the design.
9. **Report COUVERTURE-KIT.md**: I took it as is for the piece lists; only the 12 biomes, 26 buildings, 17 jobs were cross-checked against the kit code.
10. **Date**: "today" is 2026-10-15 (system). The calendar event windows depend on the clock of the Anki device, not on the game's.
