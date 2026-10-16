# Method: pixel-art skin for Evolve (to be replayed for each era)

Applied to Era 1 on 2026-10-14. Reports and files are in `project-docs/` and the repo root.

## Principle
Evolve (MPL-2.0, text only) remains the engine. We add a **read-only visual layer**
that reads `window.evolve` (enabled by `global.settings.expose`, deep copies refreshed by
`updateDebugData()`). Crediting resources from Anki reviews is a separate workstream
(Evolve fork, npm build on the PC).
Rules upheld everywhere: zero dependencies (unpkg to be localised), nothing from Google, no remote images.

## Steps (in order)

1. **Scope the era**: which `tech` / eras of the game (`primitive` + the start of `civilized` for Era 1).
   Read Evolve's source code (`src/`) for the real list of buildings and jobs; mark as
   *unconfirmed* any assumed name and any unlock order (the game has not been played).
2. **Exhaustive image inventory** → `project-docs/8-sprites-evolve-ere1.md`.
   Categories: buildings, scenery, characters, animals, resources, effects, interface.
   Era 1 = 541 images (57 / 104 / 178 / 27 / 53 / 85 / 37). One dedicated agent, output as a table.
3. **Optimisation: turn the inventory into hand-drawn pieces + a generator**
   → `project-docs/9-optimisation-sprites.md` + prototype `proto-sprites/` (`proto.py`, PNG sheets).
   Key ideas: buildings = isometric boxes generated from modules, 3 material tiers
   triggered by tech (`tech.axe>=2`, `tech.cement>=1`); citizens in layers (5 archetypes,
   2 bodies); particles, terrain, weather, moon (28 phases) in code; recolouring by ramps.
   Result: 541 images → 136 pieces (÷4 in count, ÷13 in surface area), a JS generator of ~1,500 lines
   composes 1,000+ images.
   Scoping decisions: iso 2:1, 32×16 tile, human first, 80 buildings and 40 citizens visible,
   front/back views, selective outline, no night, we keep the HTML UI, 5-6 retouched "hero" buildings,
   8 ramps × 4 tones.
4. **Look at the prototype yourself** (sheet copied to `~/storage/downloads/`, opened with
   `termux-open`). Era 1 finding: clean buildings, good tiers and seasons; weak, generic
   characters. To be validated at x1 scale on the phone before investing.
5. **Master prompt for Claude Design** → `project-docs/10-prompt-claude-design-sprites.md` (v2, ~40,000 chars,
   in English). The v1 (`...-v1-palette-imposee.md`) imposed palette and shading: archived.
   - **Lesson**: do not bias the designer. We fix no colour, no style, no lighting, no outline;
     they write their own *style bible*. The only deliberate exception is the "bohemian" direction (textiles, garlands,
     plants, lanterns, painted details, lit windows, cat on a roof).
   - **Technical constraints kept**: offline, no Google, whole pixels, seeded deterministic PRNG,
     recolouring by ramps, piece grid format, iso 2:1 tile 32×16.
   - **Prompt contents**: list of hand-drawn pieces (169: 9 textures, 19 modules, 18 signatures,
     12 hero details, 58 citizen pieces, 17 scenery items, 10 animals, 12 icons, 6 units, 3 effects,
     5 interface), buildings in 3 tiers, jobs, procedural systems (terrain, seasons,
     weather, 12 biomes, particles, placement formulas, density, anti-clone, scaffolding),
     the `SpriteKit` API, a workshop page, 8 delivery batches, a quality checklist.
   - Checks: `grep` for hex = 0; internal cross-references consistent.
6. **Delivery**: copy the prompt to the clipboard with
   `termux-clipboard-set "$(cat file)"` (the `< file` redirection and the pipe returned 0 characters
   for v2). Re-read with `termux-clipboard-get | wc -c` to verify. If Claude Design cuts off:
   reply "continue with the next batch". Claude Design draws in code (generated pixels), not bitmaps.

## For the next era: to redo
- Steps 1-2: new inventory (list only the **delta** relative to Era 1; reuse existing pieces,
  ramps, modules).
- Step 3: redo the optimisation on the delta only; look for new modules (tier 4+ of
  materials) rather than new images.
- Step 5: start again from v2 of the prompt (style bible already set by the designer ⇒ paste it as input
  to keep consistency) and add only the new batches.
- Keep the principle: an Opus agent for the optimisation, you to look and decide.

## Unresolved
- Exact meaning of the buildings' `on` field; real unlock order; assumed English names
  (cabin, cottage, apartment, shed, mill); prompt not tested in Claude Design; prototype not wired into the game.
- No image generator on the phone: every sprite is drawn in code.
