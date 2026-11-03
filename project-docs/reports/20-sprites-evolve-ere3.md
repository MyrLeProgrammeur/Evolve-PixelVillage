# Rapport 20 — Liste des sprites de l'ère 3 d'Evolve (delta sur les ères 1 et 2)

Date : 2026-11-02. Source : `work/evolve/src/` (`tech.js`, `actions.js`, `main.js`, `strings/strings.json`), lu, rien exécuté.
Kit de référence : `evolve-pixel-village/kit/` (ères 0, 1, 2 ; `era2.js` a déjà `truss`, `wire`, `conveyor`,
`gambrel`, `sawtooth`, `tex_corrugated`, `tex_rivetplate`, rampes `clinker` et `zinc`).
Méthode : `METHODE-SPRITES.md`, étapes 1-2. Seul **ce qui manque** au kit est listé ici.

## Définition de l'ère 3

**Ère 3 = « Industrialisation »** : de `industrialization` (`high_tech: 3`, débloque l'usine et le titane)
jusqu'à **avant** `electronics` (`high_tech: 4`). C'est la même règle de coupe que pour l'ère 2, qui s'arrêtait avant `industrialization`.

Pourquoi couper avant `electronics` (décision E3-1, rapport 21) : toutes les techs étiquetées `globalized` exigent `high_tech: 4`
(casino, télévision, éoliennes, chaîne de montage, internet, machines-outils, caméras, uranium). Si l'ère 3 prenait le niveau 4,
elle avalerait la moitié de `globalized`. Deux techs étiquetées `industrialized` passent donc à l'ère 4 : `thermomechanics`
(alliage, `high_tech: 4`) et `code_breakers` (`spy: 5`, `high_tech: 4`). Rien de visible dans les deux.

**Pièges du code, vérifiés :**
- **Le métier de routier (`teamster`) est hors ère.** `osha`, `blackmarket` et `combustion_engine` exigent `transport: 3`,
  que seul `steam_engine` accorde, et `steam_engine` n'existe qu'avec le trait `gravity_well`. Toute la ligne est exclue.
- **`transmitter`** (`high_tech: 4`) : trait `artifical` seulement → exclu.
- **`magocracy`, `pylon_camouflage`, `fake_tech`, `executions`** : voie magique ou trait `evil` → exclus.
- **Le polymère** (ligne d'usine `Polymer`) exige la tech `polymer` (← `genetics`, ère `globalized`) → hors ère.
  À l'ère 3, l'usine ne fabrique que des **biens de luxe** (`Lux`, à partir de fourrures) et de l'**alliage** (`Alloy`).
- **`warehouse` est le nom d'une tech et d'un bâtiment différents.** La tech `warehouse` (`storage: 4`) change la **remise**
  (`shed`) : « Shed » → « Barn » (ère 2) → **« Warehouse »** (ère 3, `city_shed_title3`). Le bâtiment `warehouse` est le port à conteneurs de l'ère 2.
- **« Freight Trains »** (`freight`, `trade: 3`) ne crée pas de bâtiment : chaque **dépôt** (`storage_yard`, nommé « Freight Yard » dans le jeu)
  ajoute une route commerciale (`actions.js:2262`). C'est le seul appui du code pour dessiner des trains.
- **`rotary_kiln`** (`copper: 1`) augmente le cuivre tiré par les **mineurs** (`main.js:6162`), pas la fonderie.

## 1. Nouveaux bâtiments (5 types)

| # | Bâtiment | Clé du jeu | Déblocage | Variantes | Images d'animation | Empreinte proposée | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Usine (« Factory ») | `factory` | tech `industrialization` (`high_tech: 3`) | 3 (au repos / luxe / alliage, selon la ligne active `city.factory.Lux`, `.Alloy`) | 4 (fumée, porte de quai) | 3×2, 96×72 | **Exige le courant.** Le bâtiment-héros de l'ère |
| 2 | Derrick | `oil_well` | tech `oil_well` (`high_tech: 3`) | 2 (derrick seul / avec titane `oil: 4`) | 4 (balancier de pompe) | 1×1, 32×56 | Pas de courant |
| 3 | Dépôt de carburant | `oil_depot` | tech `oil_depot` (`oil: 2`) | 2 (1 ou 2 citernes) | 0 | 2×1, 64×40 | Citernes cylindriques |
| 4 | Centrale au fioul | `oil_power` | tech `oil_power` (`oil: 3`) | 1 | 4 (fumée, flamme de torchère) | 2×2, 64×60 | Produit du courant, comme `coal_power` |
| 5 | Quai (« Wharf ») | `wharf` | tech `wharf` (`trade: 1`, `high_tech: 3`, `oil: 1`) | 2 (avec / sans bateau à quai) | 4 (bateau qui accoste) | 2×1 sur la berge, 64×40 | « Zone coastal areas » : pas de mer, mais **un étang** (~5 carreaux, centré vers (18,5 ; 19,2)) **et un ruisseau** qui entre et sort par le bord de carte (`kit/spritekit.js:344-347`, tuile 4). Le quai se pose sur la berge de l'étang (E3-3). Exclu pour `thalassophobia` |

Total : 5 types, 10 variantes, **~34 images**.

## 2. Améliorations visibles des bâtiments existants (modificateurs)

| Bâtiment existant | Tech (niveau) | Ce qui change à l'image | Images |
|---|---|---|---|
| Remise `shed` | `warehouse` (`storage: 4`) | La grange devient un **entrepôt** : long bâtiment, quai de chargement, portes roulantes | 3 |
| Dépôt `storage_yard` | `freight` (`trade: 3`) | **Gare de marchandises** : voie de garage, butoir, wagons à l'arrêt | 3 |
| Port à conteneurs `warehouse` | `alloy_containers` (`steel_container: 3`) | Conteneurs en alliage (recoloration) | 0 |
| Haut-fourneau `smelter` | `hunter_process` (`titanium: 1`) | Lingots de titane, blancs bleutés, sur le tas | 1 |
| Haut-fourneau `smelter` | `oxygen_converter` (`smelting: 5`) | Bouteilles et conduite d'oxygène vers le convertisseur, flamme plus blanche | 2 |
| Cimenterie `cement_plant` | `portland_cement` (`cement: 4`) | **Four rotatif** + silo haut | 4 |
| Mine `mine` | `rotary_kiln` (`copper: 1`) | Petit four rotatif à côté du tas de cuivre (même pièce que la cimenterie) | 0 |
| Carrière, mines | `anfo` (`explosives: 3`) | Sacs et fûts d'ANFO à la place de la caisse TNT ; souffle plus gros | 2 |
| Caserne `garrison` | `machine_gun` (`military: 4`) | Nid de sacs de sable avec mitrailleuse sur trépied | 1 |
| Wardenclyffe | `tesla_coil` (`science: 7`) | ⚠ le kit dessine **déjà** la bobine Tesla dès l'ère 2 (E3-4) | 0 à 4 |
| Centrale à charbon, usine | (réseau) | L'usine s'ajoute aux consommateurs, la centrale au fioul aux producteurs | 0 |

Hors image, rien de visible : `vocational_training`, `zoning_permits`, `corruption`, `swiss_banking`, `scientific_journal`,
`adjunct_professor`, `signing_bonus`, `titanium_drills` (sauf variante du derrick).

Total : **~16 à 20 images**.

## 3. Systèmes

- **Voie ferrée et train de marchandises** (nouveau). Appui dans le code : `freight` (`trade: 3`) + dépôts.
  Une ligne qui traverse la carte, le dépôt sert de gare ; un train (locomotive + 3 à 5 wagons) passe de temps en temps.
  Les rails de 1 px de l'ère 2 (wagonnets de mine) servent de base.
- **Zone industrielle** (placement). Usine, derricks, dépôt de carburant et centrale au fioul vont dans une zone à part,
  en bordure de carte, pour ne pas noyer les maisons bohèmes. Le générateur de placement sait déjà poser par zone.
- **Réseau électrique** : rien de neuf à dessiner. L'usine consomme (`factory.on / count`), la centrale au fioul produit.
  Il faut seulement les ajouter aux listes du réseau de `era2.js`.
- **Palier de matériaux 5 ?** Le béton armé arrive avec `portland_cement`. Recommandation : **pas de palier 5 à l'ère 3** (E3-2) :
  le P4 « brique et acier » colle à l'industrie de 1900 ; le béton et le verre iront à l'ère 4, quand la ville se modernise.
- **Outils en titane** : `titanium_axes` (`axe: 5`), `titanium_sledgehammer` (`hammer: 4`), `titanium_hoe` (`hoe: 4`). `titanium_shovel` est exclu (ligne `reclaimer`, trait `evil`).
  `tierM()` (`kit/citizens.js`) passe à `steel` dès le niveau 3 : il suffit d'un niveau `titanium` (rampe gris bleuté clair). Pas de dessin.
- **Gouvernements** : `corpocracy` et `technocracy` ont **déjà** leur couleur dans `GOV_COL` (`kit/citizens.js:273`). Rien à faire.
- **Fumée industrielle** : les cheminées existent ; plus d'usines = plus de panaches (particules en code). Pas de brume globale (direction bohème).

## 4. Personnages

**Aucun nouveau métier** à l'ère 3 (le routier est hors ère, l'usine n'emploie personne : elle consomme du courant).

| Élément | Images |
|---|---|
| Soldat servant la mitrailleuse (calque sur le soldat existant, assis derrière les sacs) | 2 |
| Dockers au quai : porteurs existants avec une caisse, routine de code | 0 |
| Ouvrier de quai, cheminot : `hat_flatcap` + `cloth_overalls` de l'ère 2 | 0 |

Total : **~2 images**.

## 5. Véhicules (nouvelle catégorie)

| Élément | Images |
|---|---|
| Locomotive à vapeur (2 directions iso) | 2 × 2 |
| Wagons : plat à conteneurs, citerne, tombereau (charbon/minerai), couvert | 4 × 2 |
| Bateau à quai : petite péniche à vapeur, à la taille de l'étang (2 directions) | 2 × 2 |

Total : **~16 images**.

## 6. Ressources et objets

| Élément | Images |
|---|---|
| Icônes : pétrole (goutte/fût), titane (lingot), alliage (lingot), biens de luxe (malle ou rouleau d'étoffe) | 4 |
| Tas : fûts empilés (3 niveaux), lingots de titane, lingots d'alliage, sacs d'ANFO | 6 |
| Objets portés : fût roulé, caisse de luxe | 2 |

Total : **12 images**.

## 7. Effets

| Effet | Images |
|---|---|
| Flamme de torchère (centrale au fioul, derrick au titane) | 3 |
| Vapeur de locomotive (en code, particules existantes) | 0 |
| Souffle d'ANFO (particules existantes, plus grosses) | 0 |
| Remous du bateau (en code, 1 px sur l'eau) | 0 |

Total : **3 images**.

## 8. Interface

| Élément | Images |
|---|---|
| Pastille de la ligne active de l'usine (luxe / alliage) | 2 |

Total : **2 images**.

## Totaux

| Catégorie | Images brutes |
|---|---|
| Nouveaux bâtiments | ~34 |
| Améliorations | ~18 |
| Personnages | ~2 |
| Véhicules | ~16 |
| Ressources et objets | 12 |
| Effets | 3 |
| Interface | 2 |
| **Total** | **~87** (ère 2 : ~117 ; ère 1 : 541) |

L'ère 3 ressemble à l'ère 2 : peu de bâtiments, aucun métier. Ses vrais ajouts sont **l'usine**, **le pétrole** (derrick, citernes, centrale),
**le train** (le seul système nouveau) et **la zone industrielle**.

## Exclu de l'ère 3

| Élément | Raison |
|---|---|
| Routier, `osha`, `blackmarket`, `combustion_engine`, `pipelines` | `transport: 3` ← `steam_engine`, trait `gravity_well` |
| `transmitter` | trait `artifical` |
| `magocracy`, `pylon_camouflage`, `fake_tech` | voie magique |
| `executions` | trait `evil` |
| Ligne d'usine Polymère, nanotubes, stanène | `polymer` / espace, bien plus tard |
| `thermomechanics`, `code_breakers`, `electronics` | `high_tech: 4` → ère 4 (E3-1) |
| Casino, télévision, éoliennes, chaîne de montage, uranium, fission, monument | `globalized` |

## Ce qui n'est pas vérifié
- Le jeu n'a pas été joué : l'ordre de déblocage réel et la durée de l'ère sont inconnus.
- Les `condition()` d'`oxygen_converter` et de `corpocracy`/`technocracy` ne sont pas toutes lues.
- L'étang fait ~5 carreaux : il loge un ponton et une petite péniche, pas un cargo. Taille du bateau à vérifier à ×1 (E3-3, rapport 21).
- Le train : aucun code d'Evolve ne dessine ni ne compte de train ; c'est une interprétation de « Freight Trains » + dépôts.
- Les tailles et les nombres d'images sont des estimations, sur le modèle des rapports 8 et 15.
