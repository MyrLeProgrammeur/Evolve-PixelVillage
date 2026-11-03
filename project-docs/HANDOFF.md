# Handoff · où reprendre (mis à jour le 2026-11-03)

Document de reprise pour continuer sur le PC (ou sur le téléphone). En français, comme les rapports de `reports/`.

## Branches
| Branche | Contenu |
|---|---|
| `refonte-carte` | **branche de travail, c'est ici qu'on reprend** : Ère 1, socle Anki + add-on, Ères 2 et 3, spike J0 de la carte, docs |
| `pixel-village` | branche par défaut sur GitHub (Ère 1), en retard sur `refonte-carte` |
| `master` | base du dépôt amont d'Evolve |

Les anciennes branches `socle-anki`, `ere2-sprites` et `ere3-sprites` ont été supprimées le 2026-11-03 : tout leur
contenu est dans `refonte-carte`. **Le dépôt est public** : vérifier chaque poussée (ni données de collection,
ni secrets, ni sauvegarde).

## Reprendre sur le PC
```
git fetch origin && git checkout refonte-carte
npm ci                      # dépendances du dépôt amont ; seul esbuild sert à construire le jeu et aux tests test/api
node buildEvolve.js         # sur le téléphone : NODE_PATH=~/outils/esbuild/node_modules node buildEvolve.js
node --test anki/*.test.js test/map/*.test.js test/api/*.test.js      # 47 tests
cd addon && python3 -m unittest test_village_events                  # 7 tests (sans Anki)
python3 tools/addon/build_addon.py            # dist/evolve_village.ankiaddon (le jeu)
python3 tools/addon/build_addon.py --bench    # dist/evolve_village-bench.ankiaddon (jeu + banc de la carte)
node tools/map-bench/bench-server.js          # banc dans un navigateur : http://127.0.0.1:8766/tools/map-bench/bench.html
node --max-old-space-size=3000 tools/map-bench/node-check.js <dossier>   # rendus PNG sans navigateur
```
Toujours le port **8766** pour les essais, jamais la vraie partie (8765). Rendu des sprites sans navigateur :
`node tools/render-era3.js kit <dossier>`.

## Où on en est
- **Sprites** : Ères 0, 1, 2, 3 faites et branchées. Restent `globalized` (encore le village) puis les ères spatiales.
  Méthode : `METHODE-SPRITES.md`. Prompts Claude Design : `prompts/` (Ère 3 : 22 et 23).
- **Add-on Anki bureau** : construit, testé dans Node/Python, **jamais lancé dans Anki** par Mathéo.
- **Refonte carte + interface** (planète continue isométrique + HUD paysage à la Clash of Clans, UI en anglais, sons) :
  plan `reports/26-plan-implementation-carte-et-interface.md`, avis `24` (game design) et `25` (UI/UX).
  Plan d'ensemble du projet : `reports/plan/PLAN.md`.
- **J0 (spike de perf) fait côté téléphone** : `reports/27-mesures-j0-provisoire.md`. Brave : go. Fennec : orange.
  Changements de plan : génération et cuisson dans des Workers, pas de village legacy incrusté (la capitale sera
  dessinée nativement), calque des acteurs à optimiser, rattrapage de l'horloge découpé.

## Prochaines étapes, dans l'ordre
1. **Claude Design : refaire le terrain de la planète.** Le terrain du spike (`tools/map-bench/spike-terrain.js`) va
   assez vite mais n'est pas assez beau (avis de Mathéo). Coller `prompts/27-prompt-cd-terrain-planete.md` dans le projet
   Claude Design du kit (« Atelier batch one complete »), avec en pièces jointes `tools/map-bench/spike-terrain.js`,
   `tools/map-bench/spike-world.js`, `map/coords.js` et les 4 rendus `img/terrain-j0-*.png`. Livraison attendue :
   `kit/planet_terrain.js` (+ `kit/pieces_b12.js`), page `Planet terrain.html`, auto-contrôle. Récupération : export zip,
   puis copie dans `kit/` (on ne retouche jamais `kit/` à la main : un export l'écrase).
2. **Brancher la livraison dans le banc** : remplacer `PVB.Terrain` par `SpriteKit.planetTerrain` dans
   `tools/map-bench/spike-bake.js` (même signature `paint(B, pw, ph, rect, f, L)`), ajouter au monde les canaux `moist`,
   `river`, `lake` (le prototype `gen-proto.js` calcule déjà les écoulements), remesurer avec `node-check.js` et le banc.
3. **Anki bureau (Mathéo)** : `tools/map-bench/ANKI-CHECKLIST.txt` (4 passes : software et GPU, fenêtre puis plein
   écran). Les JSON arrivent dans `user_files/` de l'add-on. C'est la mesure décisive de J0.
4. Une passe de vérification Brave sur le téléphone (téléphone posé, Brave au premier plan), puis le rapport final
   `27-mesures-j0.md` (go / no-go, paramètres figés) et la mise à jour du plan 26.
5. Ensuite J1 du plan 26.

## Règles du projet
Zéro dépendance externe, hors ligne d'abord, rien de Google (polices comprises). `kit/` n'est modifié que par une
livraison de Claude Design (ou `kit-patches/`). Commit et poussée seulement avec l'accord de Mathéo.
