# E1 - Evolution mechanics and inventory (Evolve 1.4.10 fork)

Read-only audit. Paths are relative to `src/` unless stated otherwise. Line numbers come from my direct reading.
Limits: I did not run the game, and I did not re-read `addAction` or `main.js` past line 12745.

## 0. Key facts (read first)

1. **`tech.evo` is never 8 on the human path.** `sentience` requires `evo===7 && final===100` (actions.js:875). Its `action()` returns `false` (actions.js:919), so `postBuild` never applies `grant:['evo',8]` (actions.js:6631-6636). `sentience()` deletes all `evo_*` and `tech.evo`, then sets `global.evolution = {}` (actions.js:8374-8380, 8436). Stage 8 of prompt 12 therefore does not exist as a value: it is the `race.species` flip from `'protoplasm'` to `'human'`.
2. **`tech.evo` is absent at the start.** It appears at 1 as soon as the key `evolution.mitochondria` exists, without having to buy one (main.js:1281-1283). The prompt says "1..8", but there is a phase 0 (`tech.evo` undefined) with RNA, DNA and the 5 counters.
3. **`evolution.final` is absent until `sexual_reproduction`** (actions.js:172). Its initial value is undefined, not 0.
4. **The prompt's values are exact for the human path**: final 20, 40, 60, 80, 90, 100 (actions.js:172, 193, 295, 355, 441, 462).
5. **`evolution.dna` is the number `1`, not a `{count}` object** (main.js:1253; main.js:785 for the perk). A view that reads `evolution.dna.count` gets undefined.
6. **No cap on the counters.** Membrane, organelles, nucleus, eukaryotic_cell and mitochondria have no maximum. Only the cost rises, linearly (`evolveCosts`, actions.js:5673-5676), and the RNA/DNA caps limit what can be paid.
7. **The fork forces `human`** for the `humanoid` genus (actions.js:912-915 `[anki-fork]`).
8. **First playthrough**: `city.biome='grassland'`, `city.ptrait=[]`, `race.universe='standard'`. Details in section 4.

## 1. Inventory of evolution actions

### 1.1 Base actions (actions.js:22-158)

The "actual cost" is the one displayed by `adjustCosts`. If `global.genes.evolve` is truthy, RNA and DNA are multiplied by 0.8 then rounded (functions.js:1761-1769).

| key | title (strings.json) | exact cost | appearance condition | effect | grant / final |
|---|---|---|---|---|---|
| `rna` (22-38) | RNA (`resource_RNA_name`) | none | `resource.RNA.display` and not `evoFinalMenu` | click: +1 RNA (+2 if `race.rapid_mutation`), only if `amount<max` | none |
| `dna` (39-54) | Form DNA | 2 RNA | `resource.DNA.display`, `DNA.amount<DNA.max`, not `evoFinalMenu` | 2 RNA give 1 DNA (click) | none |
| `membrane` (55-73) | Membrane | RNA = 2·count+2 (`evolveCosts('membrane',2,2)`) | key `evolution.membrane` exists | +5 max RNA (+5 per mitochondrion); the actual effect is recomputed in main.js:8144-8147 | `count++` |
| `organelles` (74-97) | Organelles | RNA = 8·count+12; DNA = 4·count+4 | key exists | generates `count`×(1 [+1 rapid_mutation] [+1 if evo≥2]) RNA per second (main.js:1236-1241) | `count++` |
| `nucleus` (98-118) | Nucleus | RNA = m·count+38 with m=32, or 16 if evo≥4; DNA = n·count+18 with n=16, or 12 if evo≥4 | key exists | consumes 2 RNA/s per nucleus and creates 1 DNA/s per nucleus (×2 if evo≥5) | `count++` |
| `eukaryotic_cell` (119-140) | Eukaryotic Cell | RNA = 20·count+20; DNA = 12·count+40 | key exists | +10 max DNA (+10 per mitochondrion) | `count++` |
| `mitochondria` (141-158) | Mitochondria | RNA = 50·count+75; DNA = 35·count+65 | key exists | each mitochondrion adds +5 per membrane and +10 per eukaryotic cell to the caps | `count++` |

### 1.2 Branches and forks

All these actions have `reqs` (tech >= value) and a `condition()`. The cost is in DNA alone, unless noted.

| key | title | DNA cost | reqs | condition | final set | techs set and grant |
|---|---|---|---|---|---|---|
| `sexual_reproduction` (159) | Sexual Reproduction | 150 | evo>=1 | `evo===1` | 20 | grant evo=2. The "organelles +1 RNA" effect comes from main.js:1237-1239, evaluated with evo>=2 |
| `phagocytosis` (179) | Phagocytosis | 175 | evo>=2 | `evo===2` | 40 | `evo_animal=1`, grant evo=3. Animal kingdom fork |
| `chloroplasts` (200) | Chloroplasts ("Flora" if gselect) | 175 | evo>=2 | `genus_condition(2)` | 40; 100 if gselect | `evo_plant=1`, grant evo=3. If gselect: evo=7 and `evo_plant=2` |
| `chitin` (229) | Chitin ("Fungi" if gselect) | 175 | evo>=2 | `genus_condition(2)` | 40; 100 if gselect | `evo_fungi=1`, grant evo=3. If gselect: evo=7 and `evo_fungi=2` |
| `exterminate` (258) | Exterminate ("Synthetic" if gselect) | 200 | evo>=2 | `genus_condition(2)` AND `obsolete` achievement level l>=5 | 100 | `evo_synthetic=2`, grant **evo=7**. Skips stages 3 to 6 |
| `multicellular` (282) | Multicellular | 200 | evo>=3 | `evo===3` | 60 | grant evo=4. Reduces the nucleus cost |
| `spores` (302) | Spores | 230 | evo>=4 and `evo_fungi>=1` | `evo===4` | 80 | grant evo=5 |
| `poikilohydric` (322) | Poikilohydric | 230 | evo>=4 and `evo_plant>=1` | `evo===4` | 80 | grant evo=5 |
| `bilateral_symmetry` (342) | Bilateral Symmetry | 230 | evo>=4 and `evo_animal>=1` | `evo===4` | 80 | sets `evo_insectoid`, `evo_mammals`, `evo_eggshell`, `evo_eldritch`, `evo_aquatic`, `evo_fey`, `evo_sand`, `evo_heat`, `evo_polar` to 1; grant evo=5 |
| `bryophyte` (371) | Bryophyte | 260 | evo>=5 | (`evo_plant` or `evo_fungi`) and `genus_condition(5)` | 100 | sets plant or fungi to 2; grant evo=7 |
| `athropods` (400) | Arthropods | 260 | evo>=5 and `evo_insectoid>=1` | `genus_condition(5)` | 100 | `evo_insectoid=2`, grant evo=7 |
| `mammals` (422) | Mammals | 245 | evo>=5 and `evo_mammals>=1` | `evo===5` | 90 | `evo_humanoid=1`, `evo_giant=1`, `evo_small=1`, `evo_animalism=1`, `evo_demonic=1`, `evo_angelic=1`; grant evo=6 |
| `humanoid` (448) | Humanoids | 260 | evo>=6 and `evo_humanoid>=1` | `genus_condition(6)` | 100 | `evo_humanoid=2`, grant evo=7 |
| `gigantism` (470) | Gigantism | 260 | evo>=6 and `evo_giant>=1` | `genus_condition(6)` | 100 | `evo_giant=2`, grant evo=7 |
| `dwarfism` (492) | Dwarfism | 260 | evo>=6 and `evo_small>=1` | `genus_condition(6)` | 100 | `evo_small=2`, grant evo=7 |
| `animalism` (514) | Beast | 250 | evo>=6 and `evo_animalism>=1` | `genus_condition(6)` AND `evo_animalism===1` | **95** | `evo_animalism=2`, grant evo=7 |
| `carnivore` (535) | Carnivore | 255 | `evo_animalism>=2` | `genus_condition(7)` AND `evo_animalism===2` | 100 | `evo=7`, `evo_carnivore=2`; grant `evo_animalism=3` |
| `herbivore` (558) | Herbivore | 255 | `evo_animalism>=2` | same | 100 | `evo=7`, `evo_herbivore=2`; grant `evo_animalism=3` |
| `omnivore` (581) | Omnivore | 255 | `evo_animalism>=2` and `locked>=1` | same. Marked `wiki:false`, and `locked` is never set: unreachable | 100 | `evo_omnivore=2` |
| `celestial` (604) | Celestial | 260 | evo>=6 and `evo_angelic>=1` | (`biome==='eden'` or `blood.unbound>=3`) AND `genus_condition(6)` | 100 | `evo_angelic=2`, grant evo=7 |
| `demonic` (629) | Demonic | 260 | evo>=6 and `evo_demonic>=1` | (`biome==='hellscape'` or `blood.unbound>=3`) AND `genus_condition(6)` | 100 | `evo_demonic=2`, grant evo=7 |
| `eldritch` (654) | Eldritch | 260 | evo>=5 and `evo_eldritch>=1` | `nightmare.mg` achievement AND `genus_condition(5)` | 100 | `evo_eldritch=2`, grant evo=7 |
| `aquatic` (679) | Aquatic | 260 | evo>=5 and `evo_aquatic>=1` | (biome `oceanic`/`swamp`, or `blood.unbound` truthy) AND `genus_condition(5)` | 100 | `evo_aquatic=2`, grant evo=7 |
| `fey` (704) | Fey | 260 | evo>=5 and `evo_fey>=1` | (biome `forest`/`swamp`/`taiga`, or unbound) AND `genus_condition(5)` | 100 | `evo_fey=2`, grant evo=7 |
| `heat` (729) | Inferno | 260 | evo>=5 and `evo_heat>=1` | (biome `volcanic`/`ashland`, or unbound) AND `genus_condition(5)` | 100 | `evo_heat=2`, grant evo=7 |
| `polar` (754) | Polar | 260 | evo>=5 and `evo_polar>=1` | (biome `tundra`/`taiga`, or unbound) AND `genus_condition(5)` | 100 | `evo_polar=2`, grant evo=7 |
| `sand` (779) | Sand | 260 | evo>=5 and `evo_sand>=1` | (biome `desert`/`ashland`, or unbound) AND `genus_condition(5)` | 100 | `evo_sand=2`, grant evo=7 |
| `eggshell` (804) | Eggshell | 245 | evo>=5 and `evo_eggshell>=1` | `evo===5` and not gselect | 90 | `evo_eggshell=2`, grant evo=6 |
| `endothermic` (825) | Endothermic ("Avian" if gselect) | 260 | evo>=6 and `evo_eggshell>=2` | `genus_condition(6)` | 100 | `evo_avian=2`, grant evo=7 |
| `ectothermic` (847) | Ectothermic ("Reptilian" if gselect) | 260 | evo>=6 and `evo_eggshell>=2` | `genus_condition(6)` | 100 | `evo_reptilian=2`, grant evo=7 |
| `sentience` (869) | Sentience | RNA 300 AND DNA 300 | evo>=7 | `evo===7 && final===100` | n/a | see 1.4 |

`genus_condition(r)` (actions.js:5134-5138) is `((tech.evo===r) || gselect) && final<100`.

Anomaly in `animalism`: its `grant` sets evo=7 while `final` is 95. Carnivore, herbivore and omnivore are therefore chosen at evo=7, with `final===95`, before `final` goes to 100.

The `queue_complete` of `eldritch` tests `evo===6` while its reqs is evo 5. This is a queue detail with no visual effect.

### 1.3 Species and challenge actions

- **Species choice** (`human`, `orc`, `elven`... ; actions.js:5140-5217): reqs evo>=7, cost 320 RNA + 320 DNA. They only appear if `race.seeded`, or the `mass_extinction` achievement l>=1, or `extinct_<race>` l>=1. They also require `final===100`, the right `evo_<genus>>=2` and not `evoFinalMenu`. They are **not visible in a first playthrough**: only `sentience` is displayed.
- **`s-<race>`** (actions.js:5220-5252): reqs evo>=8, only if `stats.synth` has more than one entry. Outside the human scope.
- **Challenges** (actions.js:5257-5349): `plasmid`, `mastery`, `trade`, `craft`, `crispr`, `nerfed`, `badgenes` cost 10 DNA each. `joyless`, `steelen`, `decay`, `emfield`, `inflation`, `sludge`, `ultra_sludge`, `orbit_decay`, `gravity_well`, `witch_hunter`, `simulation` cost 25 DNA. `junker`, `cataclysm`, `banana`, `truepath`, `lone_survivor`, `fasting`, `warlord` (scenarios) cost 50 DNA. They only appear after `bunker`: `global.evolution[<challenge>]={count:0}` is created in actions.js:4403-4465.
- **`bunker`** (actions.js:5352): "Challenge Gene", 10 DNA, reqs evo>=6. Condition: `genes.challenge` AND `final===100` AND not `evoFinalMenu`. It is therefore only displayed at evo=7. It sets `tech.evo_challenge=1` via grant and `evolution.bunker={count:1}` (actions.js:4400). The "20/40/.../100" plan does not exclude it: it is a button that can be added just before sentience for a player who has the challenge gene. It switches to challenge selection mode (actions.js:4395-4465, 5381-5405).

### 1.4 What `sentience` does (actions.js:882-918 and 8347-8440)

1. It picks the genus: the first `genus` of `genus_def` with `tech.evo_<genus> >= 2`. Default `humanoid`.
2. It picks the species among `raceList` whose `type===genus`. Humanoid genus: human, orc, elven.
3. The fork imposes `human` if `allowed.includes('human')` (actions.js:912-915).
4. Special cases: `junker`, `sludge` and `ultra_sludge` replace `allowed`; `warlord` gives `hellspawn`.
5. `sentience()` hides RNA and DNA (`display=false`), applies the genus and species traits, deletes all `evo_*` and `tech.evo`, then sets `global.evolution = {}`.

There is therefore **no intermediate state** to read: the `evolution` object becomes `{}` and `race.species` flips in the same call. The RNA and DNA resources stay in `global.resource` with `display:false`.

## 2. Branch graph

```
protoplasm (tech.evo absent)
 rna > dna > membrane > organelles > nucleus > eukaryotic_cell > mitochondria   (unlocks one per tick)
 evo=1 : SOUP
   sexual_reproduction (150 DNA)            final 20  -> evo 2
     |- phagocytosis (175)                  final 40  -> evo 3   [ANIMAL, evo_animal=1]
     |    multicellular (200)               final 60  -> evo 4
     |    bilateral_symmetry (230)          final 80  -> evo 5   [sets 9 flags]
     |      |- mammals (245)                final 90  -> evo 6   [sets 6 flags]
     |      |    |- humanoid (260)          final 100 -> evo 7   => sentience : human/elven/orc (fork : human)
     |      |    |- gigantism (260)         => giant : ogre/cyclops/troll
     |      |    |- dwarfism (260)          => small : kobold/goblin/gnome
     |      |    |- animalism (250)         final 95  -> evo 7
     |      |    |    |- carnivore (255)    => cath/wolven/vulpine
     |      |    |    |- herbivore (255)    => centaur/rhinotaur/capybara
     |      |    |    |- omnivore           unreachable (reqs locked)
     |      |    |- celestial (260, biome eden or unbound>=3)   => seraph/unicorn (angelic)
     |      |    |- demonic (260, biome hellscape or unbound>=3) => imp/balorg (demonic)
     |      |    |- endothermic (Avian, 260, requires eggshell=2) => arraak/pterodacti/dracnid
     |      |    |- ectothermic (Reptilian, 260, requires eggshell=2) => tortoisan/gecko/slitheryn
     |      |- eggshell (245)               final 90  -> evo 6 (gives evo_eggshell=2)
     |      |- athropods (260)              => insectoid : mantis/scorpid/antid       (evo 5 -> 7)
     |      |- eldritch (260, nightmare.mg achievement) => ghast/shoggoth
     |      |- aquatic (260, oceanic/swamp)  => sharkin/octigoran
     |      |- fey (260, forest/swamp/taiga) => dryad/satyr
     |      |- heat/Inferno (260, volcanic/ashland) => phoenix/salamander
     |      |- polar (260, tundra/taiga)     => yeti/wendigo
     |      |- sand (260, desert/ashland)    => tuskin/kamel
     |- chloroplasts (175)  PLANTS   -> multicellular -> poikilohydric (230) -> bryophyte (260) => entish/cacti/pinguicula
     |- chitin (175)        FUNGI    -> multicellular -> spores (230) -> bryophyte => sporgar/shroomi/moldling
     |- exterminate (200, obsolete>=5 achievement) SYNTHETIC : evo 2 -> 7 directly => synth/nano
```

Notes on the graph:

- The `hybrid` genera (dwarf, raccoon, lichen, wyvern, beholder, djinn, narwhal, bombardier, nephilim) can only be obtained by species choice after achievements (`godslayer` for the hybrid list).
- Challenge gene (`bunker`): side button at evo 7, detailed in 1.3.
- The aquatic, fey, heat, polar, sand, eldritch and arthropods paths leave the trunk at evo 5, right after `bilateral_symmetry`, without going through `mammals`.
- The mammal genera (humanoid, giant, small, animalism, angelic, demonic) leave the trunk at evo 6, right after `mammals`.
- The species per genus come from the `type` field of `races.js` (human: races.js:5015-5018) and from `raceList` (actions.js:5140+).

## 3. Exact chain of the HUMAN path

| step | action | cost | tech.evo before | tech.evo after | final before | final after |
|---|---|---|---|---|---|---|
| 0 | click `rna`; `dna` appears at RNA>=2; `membrane` at RNA>=10; `organelles` at DNA>=4; `nucleus` at organelles.count>=2; `eukaryotic_cell` at nucleus.count>=1; `mitochondria` at eukaryotic_cell.count>=1 | see 1.1 | absent | absent | absent | absent |
| 1 | the `mitochondria` key exists, so the next tick sets `tech.evo=1` | nothing to buy | absent | 1 | absent | absent |
| 2 | `sexual_reproduction` | 150 DNA | 1 | 2 | absent | 20 |
| 3 | `phagocytosis` | 175 DNA | 2 | 3 | 20 | 40 (`evo_animal=1`) |
| 4 | `multicellular` | 200 DNA | 3 | 4 | 40 | 60 |
| 5 | `bilateral_symmetry` | 230 DNA | 4 | 5 | 60 | 80 (9 flags) |
| 6 | `mammals` | 245 DNA | 5 | 6 | 80 | 90 (6 flags) |
| 7 | `humanoid` | 260 DNA | 6 | 7 | 90 | 100 (`evo_humanoid=2`) |
| 8 | `sentience` | 300 RNA + 300 DNA | 7 | **deleted** | 100 | `evolution={}`; species='human' |

Mapping to the stages of prompt 12 (all with these `final` values):

- Stage 1 "soup" = `tech.evo` 1 (and phase 0 before it).
- Stage 2 "sexual reproduction" = evo 2, final 20.
- Stage 3 "phagocytosis" = evo 3, final 40.
- Stage 4 "multicellular" = evo 4, final 60.
- Stage 5 "bilateral symmetry" = evo 5, final 80.
- Stage 6 "mammals" = evo 6, final 90.
- Stage 7 "humanoid" = evo 7, final 100. The `humanoid` and `sentience` actions are done at this stage.
- Stage 8 "human" = species flip, not a `tech.evo` value.

Note on the sentience threshold: it costs 300 RNA and 300 DNA, while the cap base is 100. The RNA cap must exceed 300 (so membranes) and so must the DNA cap (so eukaryotic cells), otherwise the purchase is impossible.

## 4. Resources and counters

### 4.1 RNA and DNA

- **Definition** (resources.js:675-681): base 100, +50×(`mass_extinction.l`-1) if l>1. Fields of each resource (resources.js:790-815): `display`, `value`, `amount` (0), `max`, `diff`, `delta`, `rate` (1), `bar`, `stackable`, `crates`, `containers`.
- **RNA cap** (main.js:8133-8147): base + `membrane.count` × (5 + 5·mitochondria.count).
- **DNA cap** (main.js:8148-8151): base + `eukaryotic_cell.count` × (10 + 10·mitochondria.count).
- **Generation per tick** (250 ms; `time_multiplier=0.25`, main.js:1219-1241). The tick is 250 ms unless sped up (functions.js:145-170).
  - DNA, only if `DNA<max`: `increment = nucleus.count`, reduced while `RNA < increment*2`. `rna = increment`. If evo>=5, `increment *= 2`. Then `DNA += increment × global_multiplier × 0.25` and `RNA -= rna × 2 × 0.25`.
  - RNA: `organelles.count × m × global_multiplier × 0.25`, with m = 1, +1 if `rapid_mutation`, +1 if evo>=2.
- **`global_multiplier`** (main.js:894-1100 and following) includes plasmids, supercoiled, trait, etc. In a first playthrough it is 1.
- **Mitochondria**: adds nothing directly. It multiplies the cap effects of membranes and eukaryotic cells (formulas above). The caps are recomputed on each midLoop (1 s).
- **Sexual reproduction**: evo>=2 adds +1 RNA/s per organelle; `nucleus` costs less at evo>=4; evo>=5 doubles the DNA generation per nucleus.
- **Events** (events.js:15-37): `dna_replication` and `rna_meteor`, of type major (`race:'protoplasm'`, `resource:'DNA'`/`'RNA'`). Random gain of 1 to max/3 DNA or 1 to max/2 RNA, with a message. Trigger: `event.t` (initial 200 in vars.js, then 999 in main.js:12722+).

### 4.2 Progressive unlocking of the counters (main.js:1252-1283, `else if`, **one key per tick**)

| tick | condition | key created |
|---|---|---|
| 1 | RNA >= 2 | `evolution.dna = 1` (number); `DNA.display=true` |
| 2 | RNA >= 10 | `evolution.membrane = {count:0}` |
| 3 | DNA >= 4 | `evolution.organelles = {count:0}` |
| 4 | organelles.count >= 2 | `evolution.nucleus = {count:0}` |
| 5 | nucleus.count >= 1 | `evolution.eukaryotic_cell = {count:0}` |
| 6 | eukaryotic_cell.count >= 1 | `evolution.mitochondria = {count:0}` |
| 7 | mitochondria key exists and no `tech.evo` | `tech.evo = 1` |

If `mass_extinction.l > 1`: when `dna` is unlocked, RNA and DNA are filled to the max (main.js:1255-1258).

### 4.3 Perks and prestige that modify things (main.js:774-803, 1244-1250)

| perk | condition | effect |
|---|---|---|
| `rapid_mutation` (race, set by MAD reset resets.js:61) | `race.rapid_mutation` | RNA click = 2, organelles +1 |
| `mloaded` (Master of Evolve perk) | `feat.master` and `ascended.l>0`: rank=min(ascended.l, feat.master) | on load: membrane=2×rank, eukaryotic_cell=rank, mitochondria=rank, organelles=2×rank, nucleus=2×rank, `evolution.dna=1`, `tech.evo=2` (without `final`), `mloaded=1`. Under `global.sim`, rank=5 |
| `gmloaded` (Grandmaster) | rank>=5 (`feat.grandmaster` and `corrupted.l>0`, or sim) | `tech.evo=6`, `evolution.gselect=true`, `final=80`, all `evo_*` flags pre-set, `evo_animalism=2`, `evo_eggshell=2`. Genera are chosen directly |
| Evolve Novice | `feat.novice` and `apocalypse.l>0` (or sim) | RNA +rank/2 per second, DNA +rank/4 (if `DNA.display`) |
| `mass_extinction` | achievement | cap base +50/level beyond 1; fill on opening |
| `genes.evolve` | Morphogenesis gene (arpa.js:462-468), levels 1 to 8 | RNA and DNA costs ×0.8 rounded; at level>=2: random minor traits at sentience |

The Master and Grandmaster perks are absent from the first playthrough: `global.evolution` and `global.tech` are empty at the start.

## 5. Shape of the data readable during evolution

### 5.1 Initial state of a first playthrough

- `global.race` = `{species:'protoplasm', gods:'none', old_gods:'none', seeded:false, universe:'standard'}` (vars.js:2013, 1636-1638). MAD resets add `rapid_mutation:1`, `ancient_ruins:1` to it.
- `global.evolution` = `{}`; `global.tech` = `{}` (vars.js:6).
- `global.resource`: RNA, DNA and all the other resources, most with `display:false`. RNA goes to `display:true` (main.js:775).
- `global.city`: `biome:'grassland'` (vars.js:1879-1881), `ptrait` = `[]` (vars.js:347-349 then 986-988, because the initial `version` is '0.2.0' at vars.js:105), `geology:{}`, `calendar:{day:0, year:0, season:0, weather:2, temp:1, moon:0, wind:0, orbit:365}` (vars.js:1849-1872).

### 5.2 Appearance of the keys

| key | present when |
|---|---|
| `evolution.dna` (number 1) | RNA has reached 2 |
| `evolution.membrane/organelles/nucleus/eukaryotic_cell/mitochondria` (`{count}`) | see 4.2 |
| `tech.evo` | mitochondria unlocked |
| `evolution.final` | after `sexual_reproduction` (20) |
| `tech.evo_animal` | after `phagocytosis` |
| `tech.evo_insectoid/mammals/eggshell/eldritch/aquatic/fey/sand/heat/polar` | after `bilateral_symmetry` (=1) |
| `tech.evo_humanoid/giant/small/animalism/demonic/angelic` | after `mammals` (=1) |
| `tech.evo_humanoid=2` | after `humanoid` |

### 5.3 Examples deduced from the code (human path, playthrough 1)

Start (DNA unlocked, nothing bought):

```json
{ "race": {"species":"protoplasm","universe":"standard","seeded":false},
  "resource": {"RNA":{"amount":3,"max":100,"display":true}, "DNA":{"amount":0,"max":100,"display":true}},
  "evolution": {"dna":1},
  "tech": {} }
```

Middle (sexual_reproduction done, bilateral in progress):

```json
{ "race": {"species":"protoplasm"},
  "resource": {"RNA":{"amount":120,"max":160}, "DNA":{"amount":210,"max":160}},
  "evolution": {"dna":1,"membrane":{"count":6},"organelles":{"count":6},"nucleus":{"count":4},
                "eukaryotic_cell":{"count":2},"mitochondria":{"count":1},"final":40},
  "tech": {"evo":3,"evo_animal":1} }
```

(The resource values are illustrative; only the schema is deduced from the code. For a DNA > max, the code clamps to max: the example is only indicative.)

End (humanoid chosen, before sentience):

```json
{ "race": {"species":"protoplasm"},
  "evolution": {"dna":1,"membrane":{"count":N},"organelles":{"count":N},"nucleus":{"count":N},
                "eukaryotic_cell":{"count":N},"mitochondria":{"count":N},"final":100},
  "tech": {"evo":7,"evo_animal":1,"evo_humanoid":2,"evo_giant":1,"evo_small":1,"evo_animalism":1,
           "evo_demonic":1,"evo_angelic":1,"evo_insectoid":1,"evo_mammals":1,"evo_eggshell":1,
           "evo_eldritch":1,"evo_aquatic":1,"evo_fey":1,"evo_sand":1,"evo_heat":1,"evo_polar":1} }
```

After the sentience click: `race.species="human"`, `evolution={}`, `tech` without any `evo*` key, `resource.RNA.display=false`.

## 6. Context that changes the visuals

- **Biome**: `global.city.biome`. In a first playthrough it is `grassland`. The possible biomes come from `buildPlanet` (actions.js:6859-6910): grassland, savanna, oceanic, swamp, forest, taiga, desert, ashland, volcanic, tundra, hellscape or eden (if `stats.portals>=1` for the 7th roll). Sub-biomes require `biome_*` achievements.
- **No branch is forbidden by the biome**, except for the actions with a biome condition: celestial (eden), demonic (hellscape), aquatic (oceanic, swamp), fey (forest, swamp, taiga), heat (volcanic, ashland), polar (tundra, taiga), sand (desert, ashland). `blood.unbound` unlocks the others (`unbound>=3` for celestial and demonic).
- **`evo_warn_unwise` warning**: shown if `biome==='hellscape'` and `universe!=='evil'`, for chloroplasts, chitin, athropods, humanoid, gigantism, dwarfism, animalism, carnivore, herbivore, omnivore, eggshell (actions.js:210, 239, 410, 458, 480, 502, 524, 545, 568, 592, 814). For `demonic`, it is shown in the opposite case: hellscape AND `universe==='evil'` (actions.js:642). It is tooltip text, not a block. For the human path: humanoid only on hellscape.
- **Planet (`ptrait`)**: in a first playthrough `[]`. `global.city.ptrait.includes(...)` is used heavily outside evolution. In protoplasm, `mellow` and `ozone` enter `global_multiplier` (main.js:1073-1080), so they change the RNA/DNA speed. The traits are rolled by `buildPlanet('trait')` and only exist after a reset.
- **Universe**: `global.race.universe` (standard, evil, micro, heavy, antimatter, magic, bigbang). `evil` inverts the warning; `bigbang` prevents the normal game from displaying (`drawEvolution` returns early, actions.js:5409).
- **Difficulty, challenges**: `race.no_plasmid`, `weak_mastery`, `no_trade`, `no_craft`, `no_crispr`, `nerfed`, `badgenes` and the scenarios are chosen during evolution (bunker button). They do not change the evolution costs. `simulation` (`global.sim`) forces perk rank 5.
- **Prestige**: see 4.3. On the 2nd run (MAD, reset): `rapid_mutation:1`, `gods` and `old_gods` set, biome and planet kept. Sexual reproduction, phagocytosis and the rest of the chain do not change.
- **Seeded**: after bioseed, `race.seeded=true` and as long as `race['chose']` is not set, a planet choice screen replaces evolution (main.js:821-825; actions.js:6659+ `setPlanet`).
- **Visible to a human, first playthrough**: `grassland` biome, no trait, 7 base buttons, the human chain, and at each fork only the buttons that satisfy their condition are displayed (phagocytosis alone at evo 2 because chloroplasts, chitin and exterminate require `genus_condition(2)` which is also true; exterminate is not displayed for lack of the `obsolete` achievement).

## 7. Gaps with prompt 12 (to correct)

1. "`tech.evo` 1..8": there is no value 8 on the human path, because sentience deletes `tech.evo`. Replace stage 8 with the flip `race.species !== 'protoplasm'` (and empty `evolution`).
2. "final: 0, 20, 40, 60, 80, 90, 100": the 0 does not exist. `evolution.final` is undefined until 20. The values 20 to 100 are correct. Read `final || 0`.
3. "`evolution.{...}.count` (a key may be absent early)": correct, but `evolution.dna` is a number. Do not read `.dna.count`.
4. A phase 0 is missing: `tech.evo` absent (no stage 1). Stage 1 begins when mitochondria is unlocked, even with 0 mitochondria. The cap of 24 per type does not exist on the game side; this cap is a visual choice of the kit, because the counters are unlimited (and a rank 5 Master starts at 10 membranes).
5. "`city.biome` only tints the water": acceptable, but the prompt omits the `hellscape` case and the biome is not fixed: after a reset it is inherited. The starting biome is `grassland`.
6. "Do not rely on `calendar`": `city.calendar` exists from the start (vars.js:1849) with day 0, but the day only advances outside protoplasm (main.js:11778 is inside a non-protoplasm block). Doubt: not verified line by line. It is better to keep the kit's own clock.
7. The prompt says "RNA specks" as the click visual. The `rna_meteor` and `dna_replication` events are also needed; they raise RNA or DNA all at once and display a message.
8. The "evo 4-8 isometric" camera mode: at evo 7 (humanoid chosen) the player is waiting for sentience, and there will never be an evo 8. The transition to the village is triggered on the species flip.
9. `bilateral_symmetry` sets the flags of all genera (aquatic, fey, etc.), but this does not change the human visuals.

## 8. Elements to draw or animate that the prompt lacks (by priority)

Priority 1 (human path, certain trigger)

| element | trigger in `global` |
|---|---|
| Phase 0: broth before stage 1 (RNA only, DNA absent) | `race.species==='protoplasm'` and `tech.evo` undefined |
| Progressive unlocking of the parts (one key per second): bare cell, then membrane, organelle, nucleus, eukaryotic cell, mitochondrion | appearance of `evolution.membrane/organelles/nucleus/eukaryotic_cell/mitochondria` |
| `final` progress bar (exists in the game, `evoProgress`, actions.js:8106) | `tech.evo>=2` and `evolution.final` |
| Waiting state at evo 7 (humanoid chosen, before the sentience click, cost 300/300) | `tech.evo===7`, `final===100`, `evo_humanoid===2` |
| Flip: `species` becomes `human`, `evolution` becomes `{}`, RNA/DNA hidden | `race.species!=='protoplasm'` |
| "RNA rain" and "DNA replication" events | major message; not readable in `global` (no field). Possible detection by a sudden jump of `resource.RNA.amount` or `DNA.amount` |
| Mitochondria: effect on the caps | `evolution.mitochondria.count` |

Priority 2

| element | trigger |
|---|---|
| RNA or DNA full (bar blocked, click without effect) | `resource.X.amount>=resource.X.max` |
| DNA at zero when RNA < 2 per nucleus: nucleus production stops | `RNA.amount < 2*nucleus.count` |
| Actual production rate (diff per second) | `resource.RNA.diff`, `resource.DNA.diff` |
| Buttons the player sees at each fork (their titles: Phagocytosis, Multicellular, Bilateral Symmetry, Mammals, Humanoids) | `tech.evo` 2 to 6 |
| Starting cap bonus (Master perk): several parts from the start | `evolution.mloaded`, `tech.evo===2` without `final` |

Priority 3 (outside the human path, for the stages table)

| element | trigger |
|---|---|
| Plant, fungus, animal forks | `tech.evo_plant/evo_fungi/evo_animal` |
| Arthropods, aquatic, fey, heat, polar, sand, eldritch | `tech.evo_<x>===2`, `tech.evo` 7 |
| Non-human mammals (giant, small, animalism + 3 diets, celestial, demonic) | `tech.evo_giant/small/animalism/angelic/demonic` |
| Birds and reptiles | `tech.evo_avian`, `tech.evo_reptilian` |
| Synthetic: jumps to evo 7 without stages 3 to 6 | `tech.evo_synthetic===2` |
| Grandmaster mode: genus pre-selection | `evolution.gselect===true`, `tech.evo===6` |
| Bunker (challenge selection) | `tech.evo_challenge`, `evolution.bunker` |
| Biome tint and hellscape warning | `city.biome` |

## 9. Doubts / not verified

1. I did not read `addAction` or `removeAction` in detail. The fact that an action only appears if `reqs` AND `condition()` are satisfied comes from `drawEvolution` (actions.js:5384-5408) and from my assumption about `addAction`. The precise display of each button is not verified.
2. The advancement of `city.calendar.day` during the protoplasm phase (main.js:11778) is not confirmed. I read it outside the protoplasm block, but I did not check the braces.
3. The exact initial value of `global.event.t` (200 in vars.js, 100 after reset) and the actual rhythm of the RNA/DNA events are not computed.
4. `global_multiplier` in protoplasm: I only read the beginning (main.js:894-1100). Other terms (heat, cold, etc.) exist further on; in a first playthrough they are 1 according to the structure, not tested.
5. The `exterminate` path: when `sentience` chooses `synth` or `nano`, `evoExtraState` is only called by the species button; its effect on the shape of `evolution` was not read.
6. The exact level of `ascended.l` for `mloaded` in a first playthrough: without achievements, `perk_rank=0` so nothing is preloaded. Deduced, not executed.
7. I did not read the files `tech.js`, `civics.js`, `resets.js` (apart from the MAD reset lines 58-62), `achieve.js` (apart from perks) in full. For tech.js, a grep on `evo` finds only `second_evolution` (tech.js:8390, 8421). No reference to `tech.evo` elsewhere according to my grep.
8. The examples in section 5.3 are deduced from the code, not obtained by execution (the game was not launched).
