# Roadmap

**Where we are:** human species only, **Era 0** (evolution, human path) and **Era 1** (the `primitive` era and the early `civilized` era).
**Where we want to go:** a pixel view and a pixel interface for **every era** and **every species** of Evolve.

Status legend: ✅ done · 🟡 partly done · ⬜ not started.

## 1. Species

Evolve defines about 60 playable species (64 entries in `src/races.js`, including `protoplasm` and three special ones), grouped in genera. Today the fork forces `human`.

| Genus (species) | Visible differences the audit found in the source | Status |
|---|---|---|
| humanoid (human, elven, orc) | Human only: pink skin tones, standard housing and farms | ✅ human |
| carnivore (cath, wolven, vulpine), omnivore, herbivore | Carnivores hunt (lodges instead of farms), different housing costs | ⬜ |
| small (kobold, goblin, gnome), giant (ogre, cyclops, troll) | Cost changes; body size would need new citizen bodies | ⬜ |
| reptilian, avian, insectoid, plant, fungi | Fliers build with light clay-based materials; plants make their own material; insects, fungi and plants need other bodies | ⬜ |
| aquatic (sharkin, octigoran) | Lives underwater: a different scene | ⬜ |
| fey, heat, polar, sand | Biome-driven genera, special traits | ⬜ |
| demonic, angelic, synthetic, eldritch | Special buildings and mechanics (soul wells, graveyards, assembly lines…) | ⬜ |
| hybrids (dwarf, raccoon, lichen, wyvern, beholder, djinn, narwhal, bombardier, nephilim) | Mixed traits | ⬜ |
| species-specific rules | Kindling kindred and smoldering species use stone instead of lumber; some species skip buildings | ⬜ |

Plan: keep one human-based body with palette variants where the game allows it, add body variants per genus where it does not, and add material/housing variants driven by race traits (`kindling_kindred`, `flier`, `carnivore`, `submerged`, `sappy`, …).

## 2. Eras

The game's techs are grouped in these eras (`src/tech.js`). Each era is a delta over the previous one: new buildings, jobs, resources, effects, new material tiers.

| Era | Status |
|---|---|
| Era 0 — evolution (`protoplasm`) | ✅ human path only; other branches (plants, fungi, arthropods, aquatic, demonic, celestial, eldritch, synthetic, challenge genes) ⬜ |
| `primitive` + `civilized` | 🟡 Era 1 drawn and wired; audit leftovers and many events still to do (see the audit) |
| `discovery` | ⬜ |
| `industrialized` | ⬜ |
| `globalized` | ⬜ |
| `early_space` | ⬜ |
| `deep_space` | ⬜ |
| `solar` | ⬜ |
| `tauceti` | ⬜ |
| `interstellar` | ⬜ |
| `intergalactic` | ⬜ |
| `dimensional` | ⬜ |
| `existential` | ⬜ |
| Prestige layers and resets (MAD, Bioseed, black hole, ascension…) | ⬜ (new game detection already restarts the scene) |

Per-era workflow (details in [project-docs/METHODE-SPRITES.md](project-docs/METHODE-SPRITES.md)):
1. Audit the era in the game source: buildings, jobs, resources, techs, events, visible state.
2. Turn the inventory into a small set of hand-drawn pieces plus generator rules (reuse pieces, ramps and modules from earlier eras).
3. Write a prompt for the design tool (examples in [project-docs/prompts/](project-docs/prompts/)), integrate the result, run the kit's self-check.
4. Wire the era to the game state, test on a real device, fix.

## 3. Era 1 completion

The audits list what is still missing for humans in Era 1 ([project-docs/audit/SYNTHESE.md](project-docs/audit/SYNTHESE.md)): remaining event effects, calendar events (Halloween, Easter…), a few secondary citizen states, and checking that every assumption about the game state is true in play.

## 4. Interface and gameplay

- 🟡 Pixel skin of the original interface (buttons, frames, resources, log, tabs, fonts) — more screens to restyle (settings, market, modals, governments).
- ⬜ A touch-first interface centred on the village (build panels, jobs, research list) on top of an exposed action API; the analysis is in [project-docs/audit/F-gameplay-sur-vue-pixel.md](project-docs/audit/F-gameplay-sur-vue-pixel.md).
- ⬜ Desktop layout, other browsers, accessibility checks (contrast, text size, reduced motion).
- ⬜ Translations of the interface (the original game ships many languages; the pixel font currently covers Latin letters with French accents only).

## 5. Optional ideas

- ⬜ An optional flashcard (spaced-repetition) integration: the hook `window.ankiCredit(resource, amount)` already exists in the game bundle; design notes are in `project-docs/audit/G1-…` and `G2-…`.
- ⬜ Automated end-to-end tests (headless browser) instead of manual phone runs.

## How to help

Open an issue before starting an era or a genus so work is not duplicated. Good first tasks: check a screen of the original interface against the pixel skin, report anything unreadable (include a screenshot and your screen size), or audit one genus in `src/races.js`.
