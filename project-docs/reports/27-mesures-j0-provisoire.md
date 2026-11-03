# 27 · Mesures de J0 (provisoire, 2026-11-03)

Spike de performance du plan 26 (`26-plan-implementation-carte-et-interface.md`, jalon J0). Code : `tools/map-bench/`,
`map/coords.js`, `core/dmath.js`, `tools/engine/`. **Provisoire** : il manque la mesure décisive, Anki bureau sur le PC
(pilote software puis GPU), et une passe de vérification Brave. Le verdict final sera dans `27-mesures-j0.md`.

## Banc
- Planète bidon (`spike-world.js`) : **1280 × 2560 tuiles** (×10 par côté sur demande de Mathéo le 2026-11-03),
  250 villes, ~19 800 bâtiments `shell()` du kit, champs autour. L'ancien village incrusté a été retiré du banc :
  la capitale sera dessinée nativement sur la carte (J3-13 / J5-14 du plan 26 à revoir).
- 7 niveaux (L0 à L6), morceaux de 512 × 256 px, cuisson en tranches (2 ms par image), cache LRU de 48 Mo,
  repli sur le niveau parent, fondu enchaîné, 100 citoyens + 50 véhicules + 300 particules au-dessus.
- Scénarios S1 à S7 (`scenarios.js`, `bench.js`) ; résultats en JSON (`bench-server.js` sur 127.0.0.1:8766, ou
  `user_files/` de l'add-on dans Anki).

## Résultats (téléphone : Snapdragon 7-series, Android 14)
| Sujet | Brave | Fennec |
|---|---|---|
| Images par seconde, tous scénarios | **60** (p95 16,7 ms), même CPU ×4 | 30-60 en défilement |
| JS de la carte par image | 1-2 ms | ~24 ms en pleine résolution (canvas 2D logiciel) ; dpr 1 : 12 ms ; océan B : 19 ms ; ImageBitmap : 67 ms |
| Calque des acteurs | 4-5 ms (seuil 4 ms : à optimiser) | — |
| Génération de la planète | 1,1 s (4,1 s à CPU ×4) | 1,8 s |
| Démarrage à froid | 1,5 s (seuil 0,8 s) | — |
| Morceau L0 détaillé | 25-115 ms | — |
| Recuisson d'une vue détaillée | 2-5 s à 2 ms/image | — |
| Plus longue tranche de cuisson | 5-7 ms après redécoupage (à confirmer, passe invalide) | — |
| Empreinte du générateur (`gen-proto.js`) | `15d8070a` | `15d8070a` (identique à Node) |

Node sur le téléphone (`node-check.js`) : morceau L0 p50 45 ms / p95 101 ms, L1 35/47, L2 16/21, planète entière
en L5 : 250 ms.

Moteur Evolve sans tête (`tools/engine/cost.js`, partie neuve) : tick 0,18 ms (expose off) / 0,47 ms (expose on) ;
rattrapage de 2 000 ticks : jusqu'à 90 / 158 ms d'un bloc → le rattrapage doit être découpé.

Passes invalides (non comptées) : Fennec 03/11 09:23 (page cachée), Brave 03/11 10:00 (onglet pas au premier plan,
canvas 300 × 150).

## Conclusions provisoires
- **Go** pour l'affichage de la carte en canvas 2D dans Brave.
- **À changer dans le plan** : génération dans un Worker + cache ; cuisson dans un Worker (ou budget plus large) ;
  calque des acteurs à optimiser ; rattrapage de l'horloge découpé ; pas de village legacy incrusté.
- **Fennec : orange** (jouable, piste : compositeur WebGL pour les navigateurs à canvas logiciel).
- **Anki bureau : inconnu** → test décisif par Mathéo (`tools/map-bench/ANKI-CHECKLIST.txt`).
- **Art du terrain : insuffisant** (avis de Mathéo) → brief Claude Design `prompts/27-prompt-cd-terrain-planete.md`.
