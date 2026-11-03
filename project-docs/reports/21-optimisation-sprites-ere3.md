# Rapport 21 — Réduire les sprites de l'ère 3 (delta sur le kit des ères 0 à 2)

Date : 2026-11-02. Entrée : `rapports/20-sprites-evolve-ere3.md` (~87 images brutes).
Kit de référence : `evolve-pixel-village/kit/` (ère 2 comprise : `era2.js`, `pieces_b10.js`). Méthode : `METHODE-SPRITES.md`, étape 3.

## En bref

- **Avant** : ~87 images brutes (rapport 20).
- **Après** : **23 pièces dessinées à la main**, **1 rampe**, **3 aides de code** (citerne, four rotatif, train).
- **Pourquoi c'est si peu** : l'ère 2 a déjà fourni tout l'outillage industriel : treillis (`H.truss`), rails (`H.rails`),
  fils (`H.wire`), toits `sawtooth` et `gambrel`, `tex_corrugated`, `tex_rivetplate`, `tex_glasspane`, rampes `clinker` et `zinc`,
  `door_works`, `win_tall`, `sig_pipe_valve`, `unit_container`, `fx_spark`, `fx_fire`, les cheminées hautes.
- **La seule vraie nouveauté à dessiner est une famille de véhicules** : locomotive, 4 wagons, une péniche (8 pièces sur 23).
- **Pas de palier de matériaux 5** (E3-2) : le P4 « brique et acier » est déjà l'industrie de 1900.

## 1. Les pièces à dessiner (23)

### 1.1 Modules (3)
| Pièce | Usage |
|---|---|
| `door_roller` | porte roulante à lames (entrepôt, usine, gare) ; ouverte / fermée par décalage de code |
| `dock_edge` | bord de quai de chargement avec butoirs en bois, une travée (entrepôt, usine) |
| `ladder_cage` | échelle à crinoline, une travée (citernes, cheminées, château d'eau) |

### 1.2 Signatures (8 pièces, 10 images)
| Pièce | Images | Bâtiments |
|---|---|---|
| `sig_pumpjack` (balancier « tête de cheval ») | 3 (haut, milieu, bas) | derrick ; le cycle 0-1-2-1 fait l'animation |
| `sig_derrick_crown` (moufle de tête) | 1 | derrick (la tour est un `H.truss` effilé) |
| `sig_flare_tip` (torchère) | 1 | centrale au fioul, derrick au titane ; flamme = `fx_fire_0..3` existant |
| `sig_kiln_drum` (bandages et couronne d'entraînement du four rotatif) | 1 | cimenterie (`cement >= 4`), mine (`copper >= 1`) ; le tube est du code |
| `sig_water_tower` (château d'eau sur pieds) | 1 | toit de l'usine ; gare de marchandises |
| `sig_o2_rack` (râtelier de bouteilles d'oxygène) | 1 | haut-fourneau (`smelting >= 5`) |
| `sig_mg_nest` (sacs de sable, mitrailleuse, casque du servant qui dépasse) | 1 | caserne (`military >= 4`) |
| `sig_buffer_stop` (butoir de voie) | 1 | bout de la voie de garage |

### 1.3 Véhicules (8) — nouvelle catégorie
| Pièce | Vues | Note |
|---|---|---|
| `veh_loco` (locomotive à vapeur + tender) | 2 (avant visible, arrière visible) | le miroir donne les 2 autres sens ; vapeur en particules |
| `veh_wagon_flat` | 1 | porte 1 `unit_container` (recoloré) |
| `veh_wagon_tank` | 1 | citerne de pétrole ; `tex_rivetplate` |
| `veh_wagon_hopper` | 1 | charbon ou minerai (tas recoloré) |
| `veh_wagon_box` | 1 | couvert ; la couleur de caisse varie par graine (bohème : wagons peints, un peu dépareillés) |
| `veh_barge` (petite péniche à vapeur) | 2 | à l'échelle de l'étang (≤ 2 carreaux de long) |

Un wagon est symétrique : 1 vue + miroir couvre les 4 sens. La locomotive et la péniche ne le sont pas : 2 vues.

### 1.4 Personnage (1)
| Pièce | Usage |
|---|---|
| `hat_helmet` | casque des soldats à partir de `military >= 4` (remplace le couvre-chef de l'ère 1) |

### 1.5 Icônes et objets (3)
| Pièce | Usage |
|---|---|
| `ic_oil` | goutte noire sur fût : jauge, bulle de gain |
| `ic_lux` | rouleau d'étoffe à motif : ligne « luxe » de l'usine |
| `unit_barrel` | un fût, empilé (3 niveaux), roulé par un porteur, posé au dépôt et au quai |

Titane et alliage ne sont **pas** de nouvelles icônes : `ic_ingot` / `unit_ingot` recolorés (`titanium`, `bronze`).
Sacs d'ANFO : `unit_sack` recoloré + `sig_tnt_crate` gardé à côté. Caisses de luxe : `unit_crate` recoloré.

**Total : 3 + 8 + 8 + 1 + 3 = 23 pièces** (25 images avec les 3 positions du balancier), environ 2 200 px.

## 2. Ce que le code fait sans dessin

| Élément | Comment |
|---|---|
| **Citerne** (aide `H.tank(p, c, r, h, ramp)`) | cylindre `tex_rivetplate` + toit conique bas + `ladder_cage` ; dépôt (1 ou 2), centrale, wagon-citerne au repos |
| **Four rotatif** (aide `H.kiln(p, a, b, r)`) | tube incliné ; bande d'ombre qui défile (1 px / 300 ms) = rotation ; `sig_kiln_drum` aux deux tiers |
| **Train** (aide `H.train(...)` + ordonnanceur) | locomotive + 3 à 5 wagons sur une ligne ; passe toutes les 45 à 120 s ; type de wagon tiré selon l'état (§ 4) |
| Derrick | `H.truss` effilé (4 px → 1 px) + `sig_derrick_crown` + `sig_pumpjack` au pied + flaque `soot` ; groupés en **champ pétrolier** (2 à 5 visibles selon `oil_well.count`) |
| Dépôt de carburant | 1 ou 2 `H.tank` + `sig_pipe_valve` (existant) + muret |
| Centrale au fioul | boîte P4 de `coal_power` + 1 `H.tank` + `sig_flare_tip` ; ajoutée aux **producteurs** du réseau de `era2.js` |
| **Usine** (bâtiment héros) | 3×2, brique `clinker`, toit `sawtooth` avec `tex_glasspane`, `door_roller` × 2 sur un `dock_edge`, 2 cheminées hautes, `sig_water_tower` sur le toit ; **consommateur** du réseau (`factory.on / count`) |
| Usine : ligne active | `Lux` → rouleaux d'étoffe colorés sur le quai, fumée claire ; `Alloy` → lingots `bronze` et lueur de coulée à la porte ; au repos ou sans courant → portes fermées, pas de fumée |
| Entrepôt (`storage >= 4`) | grange `gambrel` remplacée par une longue boîte P4, toit `tex_corrugated` plat à faible pente, `door_roller` × 3, `dock_edge` |
| Gare de marchandises (`trade >= 3`) | voie de garage le long du dépôt, `sig_buffer_stop`, 2 wagons à l'arrêt |
| Quai | ponton `tex_planks` sur la berge de l'étang, bollards (2 px), `veh_barge` à quai ou qui accoste ; dockers = porteurs existants avec `unit_barrel` / `unit_crate` |
| Cimenterie P4 (`cement >= 4`) | `H.kiln` + silo haut (cylindre existant) |
| Haut-fourneau | `smelting >= 5` : `sig_o2_rack` + conduite (`sig_pipe_valve`), flamme du convertisseur plus blanche (rampe) ; `titanium >= 1` : lingots `titanium` sur le tas |
| ANFO (`explosives >= 3`) | sacs recolorés, souffle de dynamitage 1,5× (particules existantes) |
| Caserne (`military >= 4`) | `sig_mg_nest` devant ; soldats avec `hat_helmet` |
| Outils en titane | `tierM()` : niveau ≥ 5 (haches, masses) ou ≥ 4 (houes, pelles) → rampe `titanium` |
| Bobine Tesla (`science >= 7`) | arcs `fx_spark` plus fréquents et plus longs (E3-4) ; aucun dessin |
| Conteneurs en alliage (`steel_container >= 3`) | `unit_container` : la rampe `bronze` s'ajoute au tirage |
| Fumée industrielle | un panache par cheminée active (particules existantes) ; pas de brume sur tout le village |

## 3. Systèmes

### 3.1 Voie ferrée et train (le système de l'ère)
- **Tracé** : une ligne droite le long d'un axe iso, près d'un bord de carte, qui passe devant le dépôt (`storage_yard`).
  Croisements avec les chemins : passage à niveau (2 lignes de rail interrompues + planches). `H.rails` (`era2.js:108`) trace déjà à l'échelle d'un bâtiment ; on l'étend à l'échelle de la carte.
- **Quand** : la ligne et le train à partir de `high_tech >= 3` ; la voie de garage et les wagons à l'arrêt à partir de `trade >= 3` (E3-5).
- **Wagons tirés selon l'état** : citerne si `oil >= 1`, plat à conteneur si `steel_container >= 1`, tombereau si `coal_mine` ou `mine` existe, couvert toujours possible.
- **Vapeur** : bouffées au départ et à l'arrêt, sinon trainée fine.

### 3.2 Zone industrielle (placement)
- Usine, derricks, dépôt de carburant et centrale au fioul vont dans une **bande en bordure de carte**, du côté de la voie ferrée (E3-6).
- Le quai va sur la berge de l'étang (seul endroit où il y a de l'eau).
- Les maisons bohèmes restent au centre ; la règle des 30 % en P3 « usé » de l'ère 2 ne change pas.

### 3.3 Réseau électrique
- Rien de neuf à dessiner. On ajoute `factory` aux consommateurs et `oil_power` aux producteurs (listes de `era2.js`).
- Les poteaux vont désormais aussi vers la zone industrielle.

## 4. Table d'état → effet

| Condition (`tech.*` sauf indication) | Bâtiment | Effet |
|---|---|---|
| `high_tech >= 3` | monde | voie ferrée + train ; usine disponible |
| `city.factory.Lux` / `.Alloy` > 0 | `factory` | étoffes / lingots, fumée ; sinon portes fermées |
| `oil >= 1` / `>= 4` | `oil_well` | derrick / + torchère (titane) |
| `oil >= 2` | `oil_depot` | 1 citerne, 2 si `count >= 3` |
| `oil >= 3` | `oil_power` | centrale + producteur du réseau |
| `wharf >= 1` | `wharf` | ponton + péniche |
| `storage >= 4` | `shed` | entrepôt |
| `trade >= 3` | `storage_yard` | gare de marchandises |
| `steel_container >= 3` | `warehouse` | conteneurs `bronze` en plus |
| `smelting >= 5` / `titanium >= 1` | `smelter` | bouteilles d'O₂ / lingots de titane |
| `cement >= 4` | `cement_plant` | four rotatif + silo |
| `copper >= 1` | `mine` | petit four rotatif |
| `explosives >= 3` | carrière, mines | ANFO, souffle plus gros |
| `military >= 4` | `garrison`, soldats | nid de mitrailleuse, casques |
| `science >= 7` | `wardenclyffe` | arcs plus forts |
| `axe >= 5`, `hammer >= 4`, `hoe >= 4` | citoyens | outils `titanium` (`titanium_shovel` exclu : ligne `reclaimer`, trait `evil`) |

## 5. Total

| | Ère 1 | Ère 2 | Ère 3 (delta) |
|---|---|---|---|
| Images brutes | 541 | ~117 | ~87 |
| Pièces dessinées | 136 (169 livrées) | 31 | **23** |
| Rampes nouvelles | 8 × 4 tons | 2 | **1** : `titanium` (gris bleuté très clair, plus froid que `zinc`) |
| Code nouveau (estimation) | ~1 500 lignes | ~600 (742 livrées) | **~550 lignes** : 5 bâtiments, train, zone, 2 aides, modificateurs |

## 6. Lots de livraison pour Claude Design (suite de la numérotation)

1. **Lot 15 — Pétrole** : `H.tank`, derrick et champ pétrolier, dépôt, centrale au fioul, torchère ; ajout au réseau.
2. **Lot 16 — Usine** : le bâtiment héros, 3 états (luxe / alliage / repos), `door_roller`, `dock_edge`, `ladder_cage`, `sig_water_tower`.
3. **Lot 17 — Train** : ligne de carte, passages à niveau, `veh_loco`, 4 wagons, gare de marchandises, `sig_buffer_stop`, ordonnanceur.
4. **Lot 18 — Quai** : ponton sur l'étang, `veh_barge`, dockers.
5. **Lot 19 — Modificateurs, personnages, atelier** : entrepôt, `H.kiln` (cimenterie, mine), haut-fourneau, ANFO, caserne + `hat_helmet`,
   outils en titane, Tesla ; page `Era 3 - ….html` avec curseurs `high_tech`, `oil`, `trade`, `storage`, `cement`, `smelting`, `military`, ligne d'usine.

## 7. Décisions (toutes les recommandations validées par Mathéo le 2026-11-02)

| # | Question | Recommandation |
|---|---|---|
| E3-1 | Où finit l'ère 3 | **Avant `electronics`** (`high_tech: 4`), comme l'ère 2 s'arrêtait avant `industrialization`. Sinon l'ère 3 avale la moitié de `globalized` |
| E3-2 | Palier de matériaux 5 (béton armé, `portland_cement`) | **Pas à l'ère 3.** Le P4 colle à 1900 ; béton et verre pour l'ère 4 |
| E3-3 | Le quai | **Ponton sur la berge de l'étang + petite péniche.** Pas besoin d'élargir l'eau. Autre choix : élargir le ruisseau en canal (touche `spritekit.js`, toutes les ères) |
| E3-4 | Bobine Tesla déjà dessinée dès l'ère 2 | **Aucun dessin** : arcs plus forts à `science >= 7` (même logique que le moulin, E2-2) |
| E3-5 | Quand le train apparaît | **Ligne et train à `high_tech >= 3`** (sûr d'arriver, c'est l'image de l'ère) ; voie de garage à `trade >= 3` (fidèle au jeu) |
| E3-6 | Zone industrielle à part | **Oui**, bande en bordure de carte, côté voie ferrée ; centre bohème préservé |

## 8. Vérifié / non vérifié

**Vérifié dans le code d'Evolve (lu, non exécuté)** : clés et niveaux du § 4 ; `factory` exige `high_tech: 3` et le courant ;
`industrialization` affiche le titane et crée l'usine ; noms de jeu (« Freight Yard », « Container Port », « Warehouse ») ;
`rotary_kiln` → cuivre des mineurs ; routier, `transmitter`, polymère hors ère.

**Vérifié dans le kit** : pièces réutilisées (`door_works`, `win_tall`, `sig_pipe_valve`, `sig_tnt_crate`, `unit_container`,
`unit_ingot`, `unit_sack`, `unit_crate`, `ic_ingot`, `fx_fire_0..3`, `fx_spark_0..2`, `tex_*`), aides `truss`, `wire`, `conveyor`, `rails`
(`era2.js:136`), `GOV_COL` (corpocratie et technocratie déjà là), étang et ruisseau (`spritekit.js:344-347`), rampes `bronze` et `zinc`.

**Non vérifié** : le rendu (aucun prototype) ; la lisibilité d'un wagon de ~20 px et d'une péniche à ×1 ; la place pour une voie
ferrée en bordure de la carte de 24×24 (forêt et collines en bord). **Premier test à demander au designer** : une locomotive et
2 wagons à ×1 sur la voie, à côté d'une maison P3, pour vérifier l'échelle.
