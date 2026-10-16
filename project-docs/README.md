# Project documentation

Working documents behind the fork. **They were produced by AI agents reading the game's source code** (and, for the design notes, researching public Anki add-ons); they are audits and notes, not verified specifications. Nothing in them was confirmed by playing unless the text says so. File names are historical (some are French); the contents are in English. The two flashcard documents (G1, G2) and a few others cite local research notes and third-party add-on repositories that were cloned for reading and are **not** included here.

| Document | What it is |
|---|---|
| [METHODE-SPRITES.md](METHODE-SPRITES.md) | The method used to dress one era with pixel art (inventory, optimisation into pieces + generator, prompt, integration). To be replayed for every era. |
| [audit/SYNTHESE.md](audit/SYNTHESE.md) | Era 1 coverage audit: what the kit covers for a human, what is missing, errors found in the first inventory. |
| [audit/A-batiments.md](audit/A-batiments.md) | Buildings (every entry of the `city` block). |
| [audit/B-metiers-citoyens.md](audit/B-metiers-citoyens.md) | Jobs, citizens, armies, animals, citizen states. |
| [audit/C-ressources-interface.md](audit/C-ressources-interface.md) | Resources, piles, icons, interface elements, effects. |
| [audit/D-monde-techs-evenements.md](audit/D-monde-techs-evenements.md) | Techs, events, seasons, biomes, planet traits, government, calendar events. |
| [audit/E1-evolution-mecanique.md](audit/E1-evolution-mecanique.md) | Evolution mechanics: every action and branch, the human path, data shapes. |
| [audit/E2-evolution-interface.md](audit/E2-evolution-interface.md) | What the player sees during evolution. |
| [audit/E3-passage-village.md](audit/E3-passage-village.md) | What `sentience()` does and the first minutes of Era 1. |
| [audit/F-gameplay-sur-vue-pixel.md](audit/F-gameplay-sur-vue-pixel.md) | Feasibility of playing the game directly on the pixel view (actions, API, effort). |
| [audit/G1-cartes-etat-de-l-art.md](audit/G1-cartes-etat-de-l-art.md), [audit/G2-cartes-conception-creative.md](audit/G2-cartes-conception-creative.md) | Optional flashcard integration: prior art and design ideas. |
| [audit/H-skin-pixel.md](audit/H-skin-pixel.md) | Analysis behind the pixel skin (CSS prototype: [H-prototype-theme-pixel.css](audit/H-prototype-theme-pixel.css)). |
| [audit/8-sprites-evolve-ere1.md](audit/8-sprites-evolve-ere1.md), [audit/9-optimisation-sprites.md](audit/9-optimisation-sprites.md) | The first inventory of Era 1 (superseded by the audits above, kept for history) and the optimisation plan. |
| [audit/COUVERTURE-KIT.md](audit/COUVERTURE-KIT.md) | List of pieces in the kit (generated). |
| [prompts/](prompts/) | The prompts given to the design tool to produce the kit, Era 0 and the Era 1 fixes. |
| [img/](img/) | Screenshots. |
