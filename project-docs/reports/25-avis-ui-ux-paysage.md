# 25 — Avis UI/UX : passer d'une page web à un jeu en paysage, carte plein écran et HUD

*Agent « game designer / UI », 2026-11-02, pour Mathéo et Isaac. Lecture du code et des rapports, recherches web.
Aucun fichier du projet modifié à part celui-ci. Le rapport 24 (carte du monde) est écrit en parallèle par un autre agent : je ne l'ai pas lu, et je propose plus bas (§5.6) un contrat d'interface entre la carte et le HUD, à confronter avec lui.*

**Légende**
- **[code]** : vérifié dans `evolve-pixel-village/src/` ou `kit/` (numéros de ligne de l'arbre actuel).
- **[web]** : source consultée pendant cette recherche (liens au §12).
- **[mémoire]** : référence que je cite de mémoire, sans l'avoir revérifiée.
- **[avis]** : mon jugement de designer. Rien n'a été lancé : ni le jeu, ni un navigateur.

---

## 0. En dix lignes

1. **La vision est bonne, et elle tombe au bon moment.** Supercell a refait l'interface de Clash of Clans en octobre 2026 pour la même raison que la nôtre : des systèmes ajoutés pendant des années sur une mise en page qui n'était pas faite pour les accueillir [web]. Leur réponse, un bouton « Construire » qui devient un hub à onglets avec une section « Conseillé », est exactement ce dont Evolve a besoin.
2. **Le vrai danger n'est pas technique, c'est la densité.** Un HUD à la Clash est conçu pour 5 monnaies et 40 bâtiments. Evolve a environ 75 ressources (`defineResources`, `resources.js:674`), 60 bâtiments de cité, plus de 200 technologies et des centaines de structures spatiales. Si on habille ce tableur de cadres en bois, on obtient « une page web avec des boutons en pixel ». Il faut **hiérarchiser par fréquence**, pas tout montrer joliment.
3. **L'horloge à cartes change tout, et en mieux.** Le temps du jeu n'avance qu'avec les révisions (`ankiClockGate`, `src/anki.js`). Une séance type n'est donc pas « regarder le jeu tourner » mais : **retour de séance Anki → rejeu de ce que tes cartes ont produit → dépense → c'est fini pour aujourd'hui.** C'est la boucle « récolter, dépenser, attendre » de Clash, en plus sain. Le rejeu est le moment héros à soigner.
4. **Architecture recommandée : une nouvelle couche d'interface** qui lit l'état vivant d'Evolve et appelle ses propres fonctions par un petit `src/api.js`, avec l'interface Vue d'origine **cachée mais conservée** comme moteur et comme filet (« Interface classique »). Pas de reskin profond : il faudrait réécrire les gabarits jQuery de dix fichiers d'Evolve.
5. **« Tout est atteignable » dès le premier prototype**, grâce à un renvoi vers l'interface classique pour chaque fonction pas encore refaite. La couverture monte ensuite panneau par panneau, avec une liste de contrôle mesurable.
6. **HUD et panneaux en DOM, carte en Canvas.** Texte système pour les phrases, police pixel (`KitPixel`, déjà générée) pour les titres et les chiffres, cadres en 9-slice par `border-image` à partir des images du kit (comme `anki-skin.js` le fait déjà).
7. **Paysage d'abord parce que le produit est l'add-on bureau, qui est paysage par nature** (fenêtre 1100 × 800, `addon/__init__.py:146`). Sur téléphone en paysage, la contrainte reine est la **hauteur : environ 360 px CSS**. Tiroirs latéraux, jamais de « bottom sheets » en paysage.
8. **Juice oui, mais au service de la lecture** : ressources qui volent vers le HUD, chantier qui se monte, coffre de journée accomplie (déjà dessiné, `SK.ui.chest`), flamme (déjà dessinée, `SK.ui.flame`). Tremblement d'écran rare et coupable. Sons synthétisés hors ligne (WebAudio).
9. **Aucune mécanique de rétention toxique** : pas de notification, pas de série qui se casse, pas de minuterie « reviens dans 4 h », pas de pastille rouge partout. Le jeu doit savoir dire **« tout est en ordre, à demain »**.
10. **Premier prototype** : HUD paysage + tiroir Construire qui pilote le vrai `runAction` + fiche d'un bâtiment touché sur la carte, testé sur le téléphone et dans Anki bureau. C'est la partie la plus risquée, donc la première.

---

## 1. Mon avis honnête sur la vision

### 1.1 Ce qui est excellent
- **La carte comme écran principal.** Le village pixel est aujourd'hui une bande de décor de 34 vh au-dessus d'un tableur (`anki-village.js:54-58`). En faisant de la carte le « bureau » du joueur, on inverse la hiérarchie : le monde d'abord, les chiffres sur demande. C'est ce qui sépare Township ou Pocket City d'un jeu incrémental web.
- **Les districts existent déjà dans Evolve.** Chaque bâtiment de cité a une `category` (`outskirts`, `residential`, `commercial`, `science`, `military`, `trade`, `industrial`, `utility` ; `drawCity`, `actions.js:6024-6088`) [code]. Ce sont huit quartiers tout trouvés pour la carte, et huit onglets tout trouvés pour le tiroir Construire. On ne plaque pas une structure : on rend visible celle du jeu.
- **Le paysage colle au produit.** L'add-on Anki bureau est paysage. Le téléphone grand public viendra plus tard, avec l'APK compagnon (PLAN, phase 6).
- **Le prototype d'interface pixel existe déjà en partie** : police bitmap, 9-slice, boutons à états, barres, cases, curseurs (`kit/ui.js`), images de boutons converties en data URI (`anki-skin.js`), police `KitPixel` en TTF (`evolve/kitpixel.ttf`, `tools/make-font.js`). On ne part pas de zéro.

### 1.2 Ce qui est risqué
| # | Risque | Pourquoi | Parade |
|---|---|---|---|
| R1 | **Densité** : « des menus en bois » au lieu d'un jeu | Evolve est un jeu de chiffres. Le pixel montre bien la **conséquence** d'une décision, mal la décision (audit F §6) | Hiérarchie par fréquence (§2), section « Conseillé » (§1.3), la carte réagit à chaque geste (§5) |
| R2 | **Paysage sur téléphone** | On révise dans AnkiDroid en portrait. Passer en paysage pour le jeu ajoute une friction à chaque séance | Paysage recommandé mais jamais imposé ; portrait réellement jouable (§8) |
| R3 | **Hauteur utile ridicule** | Un téléphone 20:9 en paysage fait environ 800 × 360 px CSS ; moins la barre de gestes Android et l'encoche | Barre du haut ≤ 40 px, boutons d'action en coins, panneaux en tiroirs latéraux |
| R4 | **Deux interfaces à maintenir** | Nouvelle couche + Evolve d'origine | L'origine reste le moteur ; on n'en modifie que quelques `export` ; test de fumée des noms exposés |
| R5 | **Le texte** | Descriptions en HTML, en anglais seulement (13 langues, pas de français : `strings/`), ~11 600 chaînes | DOM pour afficher le HTML d'Evolve tel quel ; police système pour les phrases ; français pour notre propre habillage d'abord |
| R6 | **Rien n'a encore tourné dans un navigateur** | La phase 0 du PLAN n'est pas faite : ni le pont, ni l'Ère 2, ni l'add-on n'ont été vus à l'écran | Le prototype P1 (§11) **est** aussi la phase 0 : il se teste dans un vrai navigateur dès le premier jour |
| R7 | **Performance du clonage** | `updateDebugData()` fait `deepClone(global)` à **chaque** `fastLoop` (`main.js:8112`, `debug.js:41`). En rattrapage, `execGameLoops` peut jouer jusqu'à 240 ticks par appel (`main.js:842-866`) : jusqu'à 240 clones complets en un quart de seconde | Lire l'état **vivant** depuis `api.js`, garder le clone à 1 Hz au plus pour le kit, ou plus du tout (§7.3). À mesurer en premier |

### 1.3 Ce que je changerais ou ajouterais
1. **Un conseiller (« Conseillé »).** C'est l'ajout le plus rentable pour une séance de 2 minutes. Evolve ne recommande jamais rien ; Clash 2026 le fait dans son hub Construire [web]. Règles simples, calculées à partir de l'état : ressource pleine qui gaspille (→ bâtiment de stockage ou consommateur), citoyens sans emploi, déficit d'énergie, moral bas, achat le moins cher qui débloque quelque chose (`grant`, `refresh`). Trois suggestions au plus, jamais d'obligation.
2. **Un sélecteur de quantité ×1 / ×10 / Max** qui remplace les touches Ctrl/Maj/Alt d'Evolve (`keyMultiplier`, `vars.js:2026`), absentes au doigt.
3. **La file de construction comme élément central du HUD** (« Chantiers »), dès qu'Evolve la débloque (`global.tech.queue`, gérée dans `runAction`, `actions.js:6541-6590`). Avec l'horloge à cartes, c'est magique : **tu planifies hors séance, et ta prochaine séance de révision construit.** Je poserais même la question de la débloquer plus tôt (§13).
4. **Une recherche** dans les listes (champ « Rechercher » dans Construire et Recherche, palette de commandes Ctrl+K sur bureau). Plus de 100 éléments, c'est une liste qu'on filtre, pas qu'on fait défiler.
5. **Un état « fini pour aujourd'hui »** visible : quand rien n'est achetable et qu'aucune alerte n'est active, le HUD le dit calmement. C'est l'antidote au jeu compulsif.
6. **Un mode « Interface classique » permanent**, pour les joueurs d'Evolve qui connaissent l'original. Il coûte presque rien puisque l'origine reste chargée.

---

## 2. Inventaire complet des interactions d'Evolve

### 2.1 Comment lire les fréquences sous l'horloge à cartes
Evolve normal : un jour de jeu toutes les 5 s, en temps réel. Ici : un crédit plein = 20 ticks = **un jour de village** (`ticksPerCard: 20`, `src/anki.js`), et rien ne bouge sans révision. Les fréquences ci-dessous sont donc exprimées **par séance de jeu** (ouverture après une séance Anki) et **par ère**, pas en secondes.

| Code | Fréquence | Sens |
|---|---|---|
| **S+** | plusieurs fois par séance | geste de base |
| **S** | une fois par séance environ | réglage courant |
| **E** | quelques fois par ère (semaines) | décision structurante |
| **R** | une fois par partie (run) | jalon, prestige |
| **X** | rare, hors partie | réglages, archives |

Importance : **★★★** = le jeu n'avance pas sans ; **★★** = optimisation qui compte ; **★** = confort, contenu tardif.

### 2.2 Le tableau (ancré dans `src/`)

| # | Interaction | Où dans le code | Appelable sans DOM ? | Fréq. | Imp. | Place dans la nouvelle UI |
|---|---|---|---|---|---|---|
| 1 | Lire stocks, plafonds, taux | `global.resource[r].amount/max/diff` ; détail `breakdown` (`vars.js`) | oui | S+ | ★★★ | **HUD** (barre du haut) + fiche ressource |
| 2 | Construire un bâtiment (cité) | `actions.city.*` (60 entrées), `runAction` cas `default` (`actions.js:6496`, **non exporté**), `postBuild` (6632) | oui après `export` | S+ | ★★★ | **Tiroir Construire** + fiche bâtiment touché sur la carte |
| 3 | Rechercher une technologie | `runAction` cas `tech` → `checkTechRequirements` (5887) → `gainTech` (6012) ; visibilité : `checkTechPath` (5872) et `checkOldTech` (5961), non exportés | oui après `export` | S+ | ★★★ | **Tiroir Recherche** |
| 4 | Affecter des ouvriers (+/−), métier par défaut | méthodes Vue `add`/`sub`/`setDefault` de `loadJob` (`jobs.js:479-672`) | **non** (fermeture Vue) ; 10 lignes à réécrire | S+ | ★★★ | **Tiroir Peuple** + fiche bâtiment (mine → mineurs) |
| 5 | Évolution (ère 0) : ARN, ADN, membrane… sentience | `actions.evolution.*` (`actions.js:23-934`), `drawEvolution` (5379), `sentience` (8353) | oui | S+ (ère 0) | ★★★ | **Écran Cellule** dédié (§10) |
| 6 | Cueillette au clic (nourriture, bois, pierre) | `actions.city.food/lumber/stone`, coupée en mode cartes (`ankiAllowGather`) | oui | — | — | Convertie : renvoi vers les cartes (rapport GD §2.3) |
| 7 | Artisans de la fonderie | `loadFoundry` (`jobs.js:825`), `craftsmanCap` (736), `limitCraftsmen` (763) | partiel | S | ★★ | Tiroir Peuple, onglet Artisans |
| 8 | Artisanat manuel (+1/+5/A) | méthode `craft` de `loadResource` (`resources.js` ~916), `craftCost` (177) | non (25 lignes) | S | ★★ | Fiche ressource fabriquée + onglet Artisans |
| 9 | Files de construction et de recherche | `global.queue`, `global.r_queue`, `buildQueue` (`functions.js:475`), `resQueue` (`actions.js:9567`), glisser-déposer `dragQueue` | données oui ; réordonner non | S+ (dès débloqué) | ★★ | **HUD « Chantiers »** + tiroir |
| 10 | Allumer / éteindre des bâtiments | méthodes `power_on`/`power_off` dans `setAction` (`actions.js` ~6385) | non (réécriture simple : `on` ± 1 + `callback_queue`) | S | ★★ | Fiche bâtiment (interrupteur) + panneau Énergie |
| 11 | Priorités du réseau électrique | `setPowerGrid` (`industry.js:1706`), `gridDefs` (1870), `dragPowerGrid` (1905) | partiel | E | ★★ | **Panneau Énergie** (plein écran) |
| 12 | Fonderie : combustible et produit | `loadSmelter` (`industry.js:183`) | non | E | ★★ | Fiche du bâtiment Fonderie (`smelter`) |
| 13 | Usines : production | `loadFactory` (573), `luxGoodPrice` (790) | non | E | ★★ | Fiche Usine |
| 14 | Marché : acheter / vendre à la main | méthodes `purchase`/`sell` de `marketItem` (`resources.js` ~1481/1505) — *l'audit F disait à tort qu'il n'y a pas d'achat manuel* | non | S | ★★ | **Panneau Économie**, onglet Marché |
| 15 | Routes commerciales import/export | `autoBuy`/`autoSell` (~1540/1573), `importRouteEnabled` (1380) | non | E | ★★ | Panneau Économie + fiche ressource |
| 16 | Caisses et conteneurs | `buildCrate` (2432), `assignCrate` (1853), `unassignCrate` (1839) | non | S | ★★ | Panneau Économie, onglet Entrepôt + fiche ressource |
| 17 | Impôts | `govCivics('adj_tax')`, `govCivics('tax_cap')` (`civics.js:1105`) | **oui** | S | ★★ | Panneau Cité, onglet Impôts ; raccourci depuis le moral |
| 18 | Régime politique | `government` (`civics.js:286`), modale `drawGovModal` (373) | non | E | ★★ | Panneau Cité, onglet Régime |
| 19 | Mercenaires | `govCivics('m_buy')`, `mercCost` | oui | S | ★ | Panneau Armée |
| 20 | Tactique et bataillon de campagne | `global.civic.garrison.tactic` (`civics.js:1276-1282`), `raid` | données oui | E | ★★ | Panneau Armée |
| 21 | Campagne contre un rival | `war_campaign` (`civics.js:1548`, non exporté), `battleAssessment` (1495), `armyRating` (2140) | après `export` | E | ★★ | **Carte (nation rivale)** + panneau Armée |
| 22 | Espions : former, influencer, saboter, inciter | `govCivics('t_spy'/'s_influence'/'s_sabotage'/'s_incite', i)`, `drawEspModal` (859) | oui | E | ★★ | Fiche nation rivale (carte) |
| 23 | Annexer, acheter, occuper | conditions dans `foreignGov` (`civics.js:489-740`), champs `occ`/`anx`/`buy` | partiel | R | ★★ | Fiche nation rivale |
| 24 | Gouverneur et ses tâches | `appointGovernor` (`governor.js:788`), `govern` (363), ~30 profils | non | E | ★ | Panneau Cité, onglet Gouverneur |
| 25 | Panneau spécial d'un bâtiment (engrenage) | `c_action.sAction()` ou `drawModal` (`actions.js:7882`) | variable | E | ★ | Fiche bâtiment, bouton « Réglages » ; sinon renvoi classique |
| 26 | Projets ARPA (pas de 1 % à 100 %) | `arpa()` (`arpa.js:12`), `buildArpa` (2559), `addProject` (2426) | partiel | E | ★★ | Construire, onglet **Grands projets** + chantier visible sur la carte |
| 27 | Génétique (séquençage, traits) | `genetics` (`arpa.js:1778`), `sequenceLabs` (2380) | non | E | ★ | Panneau Science, onglet Génome |
| 28 | CRISPR (dépense de plasmides), sang | `crispr` (2408), `gainGene` (1613), `blood` (2417) | partiel | R | ★ | Panneau Science, onglet Héritage |
| 29 | Régions spatiales (espace, interstellaire, galaxie, portail, Tau Ceti, Éden) | `renderSpace`… onglets `#space`, `#interstellar`, `#galaxy`, `#portal`, `#tauceti`, `#eden` (`index.js` `loadTab`) | `runAction` | S+ (tard) | ★★★ (tard) | Construire, onglets par région ; la carte passe au globe |
| 30 | Labo de mechas, chantier naval, alchimie, éjecteur, cargo | onglets `mechLab`, `dwarfShipYard`, `resAlchemy`, `resEjector`, `resCargo` | non | E | ★ | Renvoi classique longtemps (contenu tardif) |
| 31 | Journal des messages, filtres | `messageQueue` (`functions.js:391`), `message_logs`, filtres (`vars.js:61`), `global.lastMsg` (sauvegardé) | **oui** (données) | S+ | ★★ | **Toasts** + tiroir Journal (avec Chronique et Courrier) |
| 32 | Événements (incendie, raid, siège, séisme, effondrement de mine, révolte fiscale, grève, canicule…) | `events.js` | lecture | S | ★★ | **Carte** (animation sur place) + toast |
| 33 | Pause | méthode `pause` (`main.js` ~571), `global.settings.pause` | oui | X | ★ | Menu (peu utile en mode cartes) |
| 34 | Réinitialisations : MAD, bioseed, trou noir, ascension, etc. | `resets.js` : `warhead` (7), `bioseed` (87), `big_bang` (320), `ascend` (532), `descension` (633)… | oui | R | ★★★ (le moment venu) | **Panneau Prestige** avec confirmation forte |
| 35 | Choix de planète, défis, gènes de défi | `setPlanet` (`actions.js:6663`), `setChallengeScreen` (4400) | non | R | ★ | Écran plein dédié (début de partie) |
| 36 | Réglages (thème, police, touches, fusion de file, notation des nombres…) | onglet Réglages (`index.js`, `settings1`…`settings17`), `global.settings.affix` | oui | X | ★ | Menu → Réglages |
| 37 | Export / import de sauvegarde | `save`, `LZString`, `resets.js:81` | oui | X | ★★ | Menu → Sauvegarde |
| 38 | Statistiques, exploits, avantages, wiki | onglets `stats`, `achieve`, `perks` ; `achieve.js` ; `wiki.html` | lecture | X | ★ | Menu → Archives (et objectifs, §6.4) |
| 39 | Moral, bonheur, détail | `global.city.morale` (dont `anki`, `main.js:3123-3127`) | lecture | S | ★★ | HUD (visage) + fiche |
| 40 | Anki : cartes du jour, flamme, réserve, horloge | `AnkiVillage.status()`, `global.anki` (`src/anki.js`) | oui | S+ | ★★★ | **Pastille Anki** du HUD + panneau Anki |

### 2.3 Répartition par emplacement
| Emplacement | Contenu | Règle |
|---|---|---|
| **HUD permanent** | ressources épinglées, population et moral, énergie si débloquée, Anki, chantiers, 4 à 6 boutons de hub | rien ici ne demande plus d'un tap pour être compris |
| **Tap sur la carte** | bâtiment → fiche ; quartier → Construire filtré ; nation → diplomatie et guerre ; événement → explication | la carte est un menu spatial, pas un décor |
| **Tiroir latéral** (55-60 % de la largeur) | Construire, Recherche, Peuple, Journal, fiche ressource | la carte reste visible et réagit pendant qu'on choisit |
| **Panneau plein écran** | Économie (grille du marché), Énergie, Cité, Armée, Science, Prestige, Réglages | tâches de réflexion, rares, denses |
| **Notification (toast)** | événements, recherche finie, chantier fini, récompense | jamais plus de deux à l'écran, jamais bloquant |
| **Réglages / menu** | réglages, sauvegarde, archives, interface classique | hors de la zone du pouce |

---

## 3. Mise en page en paysage

### 3.1 Les cotes de référence
- **Téléphone paysage compact** : 800 × 360 px CSS (un 20:9 à 2400 × 1080, DPR 3). C'est la cible la plus dure ; si ça tient là, ça tient partout.
- **Anki bureau** : fenêtre 1100 × 800 par défaut (`addon/__init__.py:146`), souvent agrandie.
- **Cibles tactiles** : 44 px CSS au minimum (Apple 44 pt, Material 48 dp [web]), **48 px** pour les gestes fréquents, 56 px pour Construire. Sur 360 px de haut, cela fait au plus 6 ou 7 cibles empilées : c'est la contrainte qui dicte tout.
- **Zones de confort en paysage** : à deux mains, les pouces reposent dans les coins bas et remontent le long des bords ; le haut-centre est la zone la plus chère. Hoober a montré que la prise varie beaucoup selon la posture [web] : on vise des zones larges, pas un dessin précis.

```
   Atteinte des pouces, téléphone tenu à deux mains (800 x 360)
 +------------------------------------------------------------------------+
 |  difficile        moyen           DIFFICILE          moyen   difficile |
 |                                                                        |
 |  moyen                                                         moyen   |
 |                         (centre : la carte, regard)                    |
 |  FACILE                                                       FACILE   |
 |  FACILE    FACILE                                   FACILE    FACILE   |
 +------------------------------------------------------------------------+
   pouce gauche                                              pouce droit
```

- **Zones sûres** : `viewport-fit=cover` dans le `<meta viewport>` d'`index.html`, puis `padding: max(8px, env(safe-area-inset-left))` etc. sur le HUD. En paysage, l'encoche est à gauche **ou** à droite selon le sens de rotation ; la barre de gestes Android est en bas [web]. La carte, elle, passe sous les encoches (plein cadre), seul le HUD s'en écarte.

### 3.2 Écran principal (téléphone paysage, 800 × 360)

```
 +-----------------------------------------------------------------------------+
 |[Peuple 42/50 :)][Bois 1,2k ====-][Pierre 830 ==--][Nourr. 410 v][Or 3,4k]   |
 |[Savoir 1,1k ===-][+4]                               [Aube | 37 cartes (feu)] |  <- 40 px, 2 lignes
 |                                                     [Journal 2] [Menu]      |     seulement si besoin
 |  +---------+                                                                |
 |  | Obj. 1/3|  <- objectifs repliés                                          |
 |  +---------+                                                                |
 |                        C A R T E   P L E I N   É C R A N                    |
 |                     (pan au doigt, pincer pour zoomer)                      |
 |                                                                             |
 |  [Chantiers 2 : Scierie 60 % | Ferme]                                       |
 |  +--------+ +--------+                               +--------+ +----------+|
 |  | Peuple | | Écono. |                               | Recher.| |CONSTRUIRE||  <- 56 px
 |  +--------+ +--------+                               +--------+ +----------+|
 +-----------------------------------------------------------------------------+
   bord gauche (milieu) : [Cité] [Armée] apparaissent quand Evolve les débloque
```

Ce qui est **toujours visible** : 4 à 6 ressources épinglées, population et moral, la pastille Anki, les 4 boutons de coin, les chantiers (s'il y en a). **Sur demande** : tout le reste.

Pourquoi cette disposition :
- **Construire en bas à droite, le plus gros** : c'est le geste le plus fréquent, sous le pouce droit, comme dans Clash (Build en bas à droite, Battle en bas à gauche, refonte 2026 [web]).
- **Recherche à côté** : deuxième geste le plus fréquent, même pouce.
- **Peuple et Économie à gauche** : réglages plus lents, pouce gauche.
- **Cité et Armée au bord gauche, à mi-hauteur** : décisions d'ère, atteinte moyenne suffisante. Ils n'apparaissent que débloqués (voir §10, révélation progressive).
- **Ressources en haut à gauche** : on les lit, on ne les touche que rarement, la zone chère convient.
- **Anki, Journal, Menu en haut à droite** : rares, ou consultés en début de séance.

### 3.3 Fiche d'un bâtiment touché sur la carte

```
 +-----------------------------------------------------------------------------+
 | [HUD ressources ...]                                       [Anki] [Menu]    |
 |                                                                             |
 |               .-----------------.                                           |
 |               | Scierie  x4     |  <- étiquette ancrée au bâtiment          |
 |               '--------v--------'                                           |
 |                     [bâtiment en surbrillance, contour doré]                |
 |                                                                             |
 |  +-----------------------------------------------------------------------+  |
 |  | [ic] SCIERIE x4   +12 contreplaqué/jour   4 allumées / 4   [i]        |  |
 |  | [ +1  Bois 340 Pierre 90 ] [ Ouvriers 3/4  -  + ] [ ON/OFF ] [Régl.]  |  |  <- barre contextuelle
 |  +-----------------------------------------------------------------------+  |     56 px, bas-centre
 +-----------------------------------------------------------------------------+
```

C'est le modèle de Clash et de Polytopia [mémoire] : on touche, une barre d'actions apparaît **en bas au centre**, jamais sous le doigt. Les actions possibles dépendent du bâtiment : « +1 » (avec le coût, rouge si inabordable), ouvriers liés (le mineur pour la mine, `B-metiers-citoyens.md`), interrupteur si `switchable` (`actions.js:6286-6292`), « Réglages » si `special` (`actions.js:6268`). « i » ouvre la description complète (`desc` + `effect` + coûts + `timeCheck`).

### 3.4 Tiroir Construire

```
 +--------------------------------+--------------------------------------------+
 | carte assombrie de 20 %,       | CONSTRUIRE            [x1|x10|Max] [Chercher] [X]
 | recentrée sur le quartier      |[Conseil][Habitat][Commerce][Science][Indus.]>|  <- onglets = category
 | choisi ; FANTÔME du prochain   |--------------------------------------------|
 | bâtiment à son emplacement     | * Conseillé : Entrepôt  (pierre pleine)     |
 |                                |--------------------------------------------|
 |                                |[ic] Cabane      x12  Bois 85  Pierre 20 [+]|  <- rangée 52 px
 |                                |[ic] Ferme       x6   Bois 140  (3 jours)[+]|     coût rouge + délai
 |                                |[ic] Grenier     x2   Pierre 900 [cadenas] |     cadenas = plafond trop bas
 |                                |[ic] Scierie NEW x0   Bois 200  Fer 40   [+]|
 +--------------------------------+--------------------------------------------+
```

- Onglets : « Conseillé » d'abord, puis les **catégories d'Evolve** présentes, puis « Grands projets » (ARPA) et les régions spatiales quand elles existent. Un onglet ne montre que les **monnaies qu'il dépense**, comme les onglets du hub de Clash [web].
- États d'une rangée, d'après Evolve : abordable ; **pas encore** (`cna`, `checkAffordable(c,false)`) → coût rouge et délai ; **jamais avec le stockage actuel** (`cnam`, `checkAffordable(c,true)`, `actions.js:6244-6249`) → cadenas et le nom du bâtiment de stockage qui le débloquerait.
- Toucher la rangée : déplie la description et **déplace le fantôme** sur la carte. Toucher [+] : construit. Appui long sur [+] : répète en accélérant.
- Le délai est `timeCheck` (`functions.js:938`), converti en **jours de village** (1 jour = 20 ticks = 1 carte pleine). Voir §4.5.

### 3.5 Tiroir Recherche

```
 +--------------------------------+--------------------------------------------+
 | carte : la bibliothèque ou     | RECHERCHE        [Dispo][File 2/3][Acquises][X]
 | l'université s'allume          |--------------------------------------------|
 |                                | Savoir 1 120 / 2 000   +45/jour             |
 |                                |--------------------------------------------|
 |                                |[ic] Bronze     Savoir 900        [Chercher]|
 |                                |     débloque : Fonderie, Outils en bronze  |  <- ce que ça débloque,
 |                                |[ic] Monnaie    Savoir 1 400 (12 j) [File+] |     avec les icônes
 |                                |[ic] Agricult.  Savoir 2 600 [cadenas]      |
 +--------------------------------+--------------------------------------------+
```

Pas d'arbre dessiné (l'audit F avait raison : liste filtrée et triée par coût de Savoir, comme `drawTech`, `actions.js:6091`). L'ajout qui change tout : **« débloque : … »** avec les icônes des bâtiments et des métiers. Une technologie sans conséquence visible est abstraite ; une technologie qui annonce « la fonderie apparaîtra ici » donne envie. Après achat, la carte montre le quartier où le nouveau bâtiment pourra aller (pastille « NEW » dans Construire).

### 3.6 Peuple : métiers et population (tiroir gauche)

```
 +--------------------------------------------+--------------------------------+
 | PEUPLE  42 / 50   Moral 104 %   [Métiers][Artisans][Moral]  [x1|x5|Max] [X]  |
 |--------------------------------------------|  carte : les citoyens du métier|
 | Sans emploi (défaut *)          3          |  sélectionné clignotent        |
 | [ic] Fermiers       8 / --    [ - ] [ + ]  |  (citizens.js les connaît)     |
 | [ic] Bûcherons     10 / --    [ - ] [ + ]  |                                |
 | [ic] Carriers       6 / --    [ - ] [ + ]  |                                |
 | [ic] Mineurs        4 / 4     [ - ] [ + ]  |                                |
 | [ic] Profs          2 / 3     [ - ] [ + ]  |                                |
 +--------------------------------------------+--------------------------------+
```

Les boutons « « » » d'Evolve deviennent − et + de 48 px, **pouce gauche** (tiroir à gauche). Le métier par défaut (`setDefault`) se choisit par appui long sur la ligne. La couleur du compteur reprend la logique `level()` de `loadJob` (`jobs.js:637-655`). Onglet Artisans : `loadFoundry` + artisanat manuel. Onglet Moral : le détail de `global.city.morale` (dont la ligne Anki), et le raccourci vers les impôts.

### 3.7 Cité : régime, impôts, gouverneur (plein écran)

```
 +-----------------------------------------------------------------------------+
 | CITÉ   [Régime][Impôts][Gouverneur][Diplomatie]                         [X] |
 |-----------------------------------------------------------------------------|
 |  Régime actuel : AUTOCRATIE                       [ Changer de régime ]     |
 |  +----------------+ +----------------+ +----------------+ +----------------+|
 |  | [blason]       | | [blason]       | | [blason]       | | [blason]       ||
 |  | Démocratie     | | Oligarchie     | | Théocratie     | | République     ||
 |  | +x % savoir    | | impôts max +.. | | ...            | | ...            ||
 |  +----------------+ +----------------+ +----------------+ +----------------+|
 |  (révolution : n jours d'anarchie, rappelé en rouge)                        |
 +-----------------------------------------------------------------------------+
```

Les régimes deviennent des **cartes à blason** (effets d'Evolve : `govEffect`, `civics.js:155-165`). Impôts : un grand curseur avec les deux conséquences côte à côte (argent par jour, moral), via `govCivics('adj_tax')`. Diplomatie : le même contenu que la fiche nation (§5.5), en liste.

### 3.8 Économie : marché, routes, entrepôt, industrie

```
 +-----------------------------------------------------------------------------+
 | ÉCONOMIE  [Marché][Routes 3/5][Entrepôt][Industrie]   Or 3,4k  +20/j    [X] |
 |-----------------------------------------------------------------------------|
 | Ressource   Stock        Achat   Vente   Quantité [10|100|1k]   Route       |
 | [ic] Nourr. 410/800 ==-   12      6      [Acheter] [Vendre]   [<- 0 ->]     |
 | [ic] Bois   1,2k/1,5k ==  15      8      [Acheter] [Vendre]   [<- 1 ->]     |
 | [ic] Pierre 830/900 ===   10      5      [Acheter] [Vendre]   [<- 0 ->]     |
 | ...                                                                         |
 +-----------------------------------------------------------------------------+
```

C'est un tableau, et c'est normal : le commerce est un tableau dans tous les jeux de gestion (Anno, Against the Storm [mémoire]). On le rend lisible, pas « gamifié ». La route est un compteur −/+ (`autoBuy`/`autoSell`) qui colore la ligne. Entrepôt : caisses et conteneurs par ressource. Industrie : fonderie et usines (aussi atteignables depuis la fiche du bâtiment).

### 3.9 Armée et espions (plein écran, ou depuis la carte)

```
 +-----------------------------------------------------------------------------+
 | ARMÉE   Garnison 18/20  Blessés 2   Force 1 240      [Mercenaire : 300 or]  |
 |-----------------------------------------------------------------------------|
 | Tactique : < Embuscade | RAID | Pillage | Assaut | Siège >   Bataillon: 10  |
 |-----------------------------------------------------------------------------|
 | [drapeau] Rival 1  Relations : froides   Armée : forte   Éco : moyenne      |
 |           [Partir en campagne : estimation « victoire probable »] [Espions 2]|
 | [drapeau] Rival 2  ...                                                      |
 | [drapeau] Rival 3  annexé (bordure repeinte sur la carte)                    |
 +-----------------------------------------------------------------------------+
```

L'estimation reprend `battleAssessment` (`civics.js:1495`). Les tactiques sont les 5 de `garrison.tactic`. Voir §5.5 pour la version « sur la carte », plus amusante.

### 3.10 Énergie

```
 +-----------------------------------------------------------------------------+
 | ÉNERGIE   Production 120 MW   Demande 135 MW   [ DÉFICIT -15 ]          [X] |
 |-----------------------------------------------------------------------------|
 |  Priorité (glisser, ou flèches)          Allumés      MW                   |
 |  1 [=] [ic] Usine           [^][v]        2 / 3   [-][+]  -24              |
 |  2 [=] [ic] Scierie         [^][v]        4 / 4   [-][+]  -8               |
 |  3 [=] [ic] Mine de charbon [^][v]        3 / 3   [-][+]  -6               |
 |  (les derniers de la liste s'éteignent en premier en cas de déficit)        |
 +-----------------------------------------------------------------------------+
```

Le glisser-déposer d'Evolve (`dragPowerGrid`, Sortable) est pénible au doigt : on garde des **flèches** haut/bas de 44 px en plus de la poignée. La carte assombrit les bâtiments éteints (le kit lit déjà `on`, à corriger selon `SYNTHESE.md` P0-1).

### 3.11 ARPA et génome

```
 +-----------------------------------------------------------------------------+
 | SCIENCE  [Grands projets][Génome][Héritage (CRISPR)]                    [X] |
 |-----------------------------------------------------------------------------|
 | [ic] Supercollisionneur  niv. 3   [==========------] 62 %                   |
 |      prochain pas (1 %) : Savoir 12k, Cuivre 3k  [ +1 % ] [ +10 % ]         |
 | [ic] Lancement de fusée  ...                                                |
 +-----------------------------------------------------------------------------+
```

Les projets ARPA sont des **chantiers géants** : leur pourcentage doit se voir sur la carte (échafaudage qui monte). Génome et CRISPR : panneau sobre, contenu tardif.

### 3.12 Journal (tiroir droit)

```
 +--------------------------------+--------------------------------------------+
 | carte                          | JOURNAL   [Tout][Chronique][Courrier][Évén.][X]
 |                                |--------------------------------------------|
 |                                | Jour 143 · été                              |
 |                                |  Un incendie a détruit une cabane. [Voir]   |  <- [Voir] centre la carte
 |                                |  Recherche terminée : Bronze.               |
 |                                | Jour 142                                    |
 |                                |  « Le vieux scribe a fini sa copie… »       |  <- Chronique (C-C1)
 +--------------------------------+--------------------------------------------+
```

Les filtres d'Evolve (`message_filters`, `vars.js:61`) se réduisent à quatre onglets. Chaque message lié à un lieu porte un bouton [Voir].

### 3.13 Menu, réglages, prestige

```
 +-----------------------------------------------------------------------------+
 | MENU   [Réglages][Sauvegarde][Archives][Prestige][Interface classique]  [X] |
 |-----------------------------------------------------------------------------|
 | Réglages : Sons [on]  Mouvements réduits [off]  Taille du texte [M]         |
 |            Notation des nombres [k M G | scientifique]  Tremblements [off]  |
 |            Caméra suit les constructions [on]   Raccourcis clavier [voir]   |
 | Prestige : « Réinitialiser par la bombe (MAD) » -> écran de confirmation    |
 |            avec ce qu'on gagne (plasmides) et ce qu'on perd, appui long 2 s |
 +-----------------------------------------------------------------------------+
```

Les remises à zéro (`resets.js`) sont les seules actions vraiment destructrices du jeu : **appui long de 2 s** + écran récapitulatif. Jamais dans une zone où un pouce passe par hasard.

---

## 4. Le HUD des ressources

### 4.1 Le problème
Evolve crée environ 75 ressources (`defineResources`, `resources.js:674-761`), plus des ressources spéciales de prestige. Une partie est visible à un moment donné (`global.resource[r].display`). En ère 2-3, c'est déjà 20 à 30 lignes. La colonne de gauche d'Evolve les montre toutes, tout le temps. Un HUD de jeu mobile en montre **cinq ou six**.

### 4.2 Qui est épinglé : trois couches
1. **Fixes** (toujours) : population et moral, Or (`Money`), Savoir (`Knowledge`), Énergie dès qu'elle existe (`city.powered`). Ce sont les quatre « monnaies » de toutes les décisions.
2. **Automatiques** (jusqu'à 3, recalculées à chaque ouverture de séance et à chaque achat) : par ordre de priorité,
   - une ressource **en danger** : taux négatif qui la vide en moins de 3 jours de village ;
   - une ressource **pleine qui gaspille** : `amount >= max` avec un taux positif ;
   - les ressources qui manquent aux **suggestions du conseiller** et à la tête de la file de chantiers.
3. **Choisies** (jusqu'à 2) : appui long sur une ressource dans le tiroir → « Épingler ».

Les épinglées automatiques portent une petite raison (« pleine », « baisse », « pour la Scierie ») : le joueur comprend pourquoi elles sont là, et le HUD devient un conseiller silencieux.

### 4.3 Groupes du tiroir des ressources
Le bouton « +4 » au bout de la barre ouvre un tiroir gauche avec **toutes** les ressources visibles, groupées. Les groupes suivent les couleurs qu'Evolve donne déjà dans `loadResource` (dernier argument) :

| Groupe | Ressources (exemples) | Couleur Evolve |
|---|---|---|
| Peuple et État | population, Or, Savoir, Autorité, Énergie | `success`, `warning` |
| Base | Nourriture, Bois, Pierre, Fourrures, Chrysotile | défaut |
| Métaux et minerais | Cuivre, Fer, Aluminium, Charbon, Ciment, Pétrole, Uranium, Acier, Titane | défaut |
| Fabriqués | Contreplaqué, Brique, Fer forgé, Tôle, Mithril, Aérogel… | `danger` |
| Exotiques (espace) | Hélium-3, Eau, Deutérium, Néodyme… Adamantite, Graphène… | `advanced` |
| Reliques et spéciaux | Plasmides, Phages, Matière noire, Harmonie… | `caution`, `special` |

Chaque ligne : icône, nom, `stock / plafond`, barre, taux. Chaque groupe se replie.

### 4.4 Une « puce » de ressource

```
  +-----------------------------+
  | [ic] 1,24k  ======---  +36  |    largeur fixe 112 px, hauteur 32 px
  +-----------------------------+
    icône 16 px  chiffre en      taux (vert/rouge)
                 KitPixel,       barre = stock/plafond, 2 px sous le chiffre
                 chiffres à
                 chasse fixe
```

- **Barre de remplissage** sous le chiffre plutôt qu'un « 1,2k/1,5k » : le plafond se lit d'un coup d'œil, le chiffre exact est dans la fiche.
- **Pleine** : barre dorée, petite pulsation lente (1 fois toutes les 2 s, désactivée par « mouvements réduits »), mot « plein » dans la fiche.
- **En baisse vers zéro** : chiffre rouge, flèche, « vide dans 2 j ».
- **Vide et nécessaire** (nourriture, famine) : cadre rouge, toast une seule fois.
- Les chiffres changent **sans sauter** : interpolation douce sur 300 ms pendant le rejeu, puis valeur exacte.

### 4.5 Le taux : « par jour », pas « par seconde »
Evolve affiche des taux par seconde (`diff`), valables en temps réel normal. **Avec l'horloge à cartes, « +12/s » est faux** : rien ne bouge sans réviser. Je recommande d'afficher le taux **par jour de village** (`diff × 5`, puisqu'un jour = 20 ticks de 250 ms = 5 s de jeu). Or un crédit plein = un jour de village. D'où une phrase qui relie enfin l'étude au jeu, dans l'infobulle : **« +60 bois par jour de village, soit environ une carte »**.

Même logique pour les délais : `timeCheck` donne des secondes de jeu ; on les convertit en jours de village. **Décision pour Mathéo** : afficher « 3 jours » (neutre) ou « ≈ 3 cartes » (motivant). Je recommande « 3 jours » avec la petite icône de carte, et, quand le délai dépasse ce que les dues restantes du jour peuvent apporter, simplement « demain ». La règle du projet (« jamais "révise plus" », C §6) interdit de pousser à faire des cartes en plus des dues.

### 4.6 Les très grands nombres
- **Une seule fonction de formatage**, qui enveloppe `sizeApproximation` (`vars.js:2107`) pour rester cohérente avec Evolve, son wiki et le réglage `global.settings.affix` (suffixes, scientifique, ingénieur). Elle passe par `toLocaleString(undefined…)`, donc donne déjà la virgule décimale dans un navigateur français.
- **Mais une variante HUD** : `sizeApproximation` garde jusqu'à 5 chiffres significatifs sous 10 000 (`1 234,5`). Dans une puce de 112 px, il faut **4 caractères + suffixe au plus** : `999`, `1,2k`, `12,3k`, `123k`, `1,23M`. Le nombre exact reste dans la fiche et l'infobulle.
- Chiffres à **chasse fixe** (glyphes de même largeur dans `KitPixel`) : sinon la puce « tremble » à chaque tick.
- Au-delà de 10^27, Evolve force la notation SI (`forceSI`) : la variante HUD doit le suivre.

### 4.7 Toucher une ressource : la fiche
```
 +--------------------------------+--------------------------------------------+
 | carte : les bâtiments qui      | [ic] BOIS   1 240 / 1 500    +36 / jour  [X]|
 | produisent du bois sont        |--------------------------------------------|
 | soulignés en vert, ceux qui    | Produit par :  Bûcherons 10   +40           |
 | en consomment en orange        |                Anki (flamme) +4 (+10 %)     |
 |                                | Consommé par : Scierie       -8             |
 |                                | Plafond : Cabanes 12, Entrepôt 1  [Agrandir]|
 |                                | Marché : achat 15 / vente 8  [Ouvrir]       |
 |                                | Caisses : 2  [ - ] [ + ]                    |
 +--------------------------------+--------------------------------------------+
```
Les données existent : `breakdown` (`vars.js`, utilisé par `breakdownPopover`, `resources.js:2190`) donne producteurs et consommateurs, avec la ligne `Anki : <feature>` posée par `ankiMult` (B-interface §4). Le soulignement sur la carte est le genre de geste qui rend le monde « lisible » au lieu de décoratif.

---

## 5. Interactions centrées sur la carte

### 5.1 Ce que veut dire « toucher » selon le zoom
La carte du rapport 24 va du globe au citoyen. Un tap doit donc changer de sens avec le niveau de zoom, comme dans Rise of Kingdoms (carte du royaume / cité) [mémoire] :

| Zoom | Ce qu'on touche | Ce qui s'ouvre |
|---|---|---|
| Planète / globe | une nation (la tienne ou un rival), un satellite | résumé de la nation ; diplomatie et guerre pour un rival |
| Région | une ville | résumé de la ville, zoom doux vers elle |
| Ville | un **quartier** (une `category`) | tiroir Construire filtré sur ce quartier |
| Quartier / bâtiment | un **bâtiment** | barre contextuelle (§3.3) |
| Citoyen | un groupe de citoyens | métier et +/− (le kit le fait déjà : `world.js:378-400`, icône de métier) |

Règle de confort : un tap ne **zoome** jamais tout seul plus d'un niveau ; un double-tap zoome ; pincer zoome ; molette sur bureau.

### 5.2 Rendre « construire » tactile alors qu'Evolve n'a pas de position
Evolve ne stocke que des comptes (`global.city.X.count`) ; le kit pose la k-ième instance sur le k-ième emplacement réservé (`village.js`, audit F §4.3). On ne change pas ce modèle (l'option « placement libre » casserait la parité avec Evolve : 200 h et plus, audit F). Mais on peut rendre le geste **physique** :

1. **Aperçu** : toucher une rangée de Construire fait glisser la caméra (300-400 ms, courbe douce) vers l'emplacement où **la prochaine instance** apparaîtra, et y dessine un **fantôme** translucide qui respire. Le kit connaît l'emplacement k+1 : il suffit de l'exposer.
2. **Paiement visible** : au tap sur [+], de petites icônes de coût partent des puces du HUD vers le chantier (8 à 12 particules, 450 ms). Le joueur voit son bois partir.
3. **Chantier** : échafaudage 2 frames, nuage de poussière, puis « pop » du bâtiment avec un léger rebond d'échelle (110 % → 100 %, 150 ms). Son court.
4. **Compteur** : le « x12 » devient « x13 » avec une petite étoile.
5. **Achat multiple** : appui long = répétition qui accélère (250 → 80 ms), chaque instance « pope » à sa place. Avec « Max », une vague de pops en 1 s au plus.

Tout ce cérémonial doit tenir en **moins d'une seconde** et ne jamais bloquer le geste suivant : on peut acheter pendant que l'animation précédente joue.

### 5.3 La caméra quand on construit
- Elle **suit** l'aperçu, mais seulement si l'emplacement est hors champ ; sinon elle ne bouge pas.
- Quand un tiroir s'ouvre à droite, la caméra **décale son centre** vers la partie visible de la carte (à gauche) : le chantier ne doit jamais être caché sous le tiroir.
- Jamais de zoom automatique brutal. Réglage « La caméra suit les constructions » (on par défaut).
- Pendant le rejeu de séance (§6.2), une caméra lente peut passer d'un nouveau bâtiment à l'autre, comme un « résumé » ; un tap l'arrête.

### 5.4 Menu radial ou barre contextuelle ?
Mon choix ferme : **barre contextuelle en bas au centre** pour les bâtiments, **listes en tiroir** pour tout le reste, **radial seulement en option sur bureau** (clic droit).

| | Radial (anneau autour du bâtiment) | Barre contextuelle bas-centre | Bottom sheet |
|---|---|---|---|
| Atteinte du pouce | variable : dépend d'où est le bâtiment | **toujours la même zone** | bonne |
| Le doigt cache-t-il les choix ? | souvent | non | non |
| Libellés et coûts | peu de place | **oui** | oui |
| Nombre d'actions | 4 à 6 au plus | 4 à 6 | illimité |
| Paysage 360 px | à rogner contre les bords | **56 px de haut** | **mange la moitié de la hauteur** |
| Références | Kingdom Rush (emplacements de tours conçus avec de l'espace autour) [mémoire] | Clash of Clans, Polytopia [mémoire] | apps portrait |

Le radial marche dans Kingdom Rush parce que chaque emplacement de tour a été dessiné avec de la place autour et au plus 4 choix. Notre carte est dense et zoomable : l'anneau tomberait sur les voisins. Le radial reste rapide pour un expert à la souris (sélection en un geste, sans regarder [web]) : d'où l'option bureau.

### 5.5 Les trois nations rivales et la guerre, de façon amusante
Données disponibles (`global.civic.foreign.gov0..2`, `civics.js:489-520`) : relations `hstl`, puissance militaire `mil`, économie `eco`, troubles `unrest`, espions `spy`, formation `trn`, sabotage `sab`, et les états `occ` (occupé), `anx` (annexé), `buy` (acheté). Elles sont lisibles à des niveaux de précision qui dépendent du nombre d'espions (`v-show="f.spy >= 1/2/3/4"`).

Propositions :
- **Sur la carte, chaque rival a un territoire, une couleur, un blason et une capitale.** Toucher la capitale ouvre sa fiche (relations, armée, économie, troubles, avec la précision qu'autorisent tes espions : « armée : forte » sans espion, « armée : 1 340 » avec 2 espions). C'est un joli « brouillard de renseignement » qui existe déjà dans les règles.
- **Humeur diplomatique** : un visage sur le blason (amical, neutre, froid, hostile), dérivé de `hstl`. Lisible en une seconde.
- **Espions visibles** : un petit personnage part de ta ville vers la capitale rivale quand tu en formes un (`t_spy`), et reste là-bas comme une icône comptée. Sabotage et incitation : un nuage ou une étincelle sur la capitale pendant `sab` jours.
- **Campagne** : on choisit tactique et bataillon dans la fiche, avec l'estimation d'Evolve (`battleAssessment`) traduite en mots (« victoire probable »). Puis **une colonne de soldats marche** de la garnison vers la frontière (2 à 3 s), nuage de bataille, retour avec une carte-résultat (pertes, butin) tirée de ce que `war_campaign` a calculé. L'issue est celle d'Evolve, l'animation ne fait que la raconter.
- **Annexion, achat, occupation** : la frontière se **repeint** lentement à tes couleurs. C'est la conséquence la plus satisfaisante de tout le contenu militaire d'Evolve.
- **Raids et sièges subis** (`events.js` : `raid`, `siege`) : la menace se voit venir sur la carte au moment de l'événement, puis l'issue.
- **Ton** : la guerre reste un choix ; le jeu ne doit pas pousser à la conquête. Le commerce et les espions doivent être aussi « jolis » que la guerre (les comptoirs D-3 du PLAN, qui transforment des semaines d'étude honorées en relations meilleures, s'affichent naturellement ici).

### 5.6 Contrat entre la carte et le HUD (à confronter au rapport 24)
Pour que les deux chantiers avancent sans se marcher dessus, je propose une petite interface :

| Côté carte (fourni à l'UI) | Rôle |
|---|---|
| `map.pick(x, y)` → `{kind: 'building'|'district'|'city'|'nation'|'citizen'|'event', id, region, type}` | ce qu'on a touché |
| `map.focus(cible, {zoom, offsetX, durée})` | caméra, avec décalage pour tiroir ouvert |
| `map.ghost(type)` / `map.ghost(null)` | fantôme du prochain bâtiment |
| `map.highlight(ids, style)` | souligner producteurs, consommateurs, bâtiments éteints |
| `map.toScreen(cible)` | position écran pour faire voler des icônes vers ou depuis le HUD |
| `map.fx(nom, cible)` | pop, poussière, coffre, bataille, frontière repeinte |
| `map.on('tap'|'longpress'|'zoom', fn)` | événements |

| Côté UI (fourni à la carte) | Rôle |
|---|---|
| `ui.open(panneau, args)` | ouvrir un tiroir ou un panneau |
| `ui.safeRect()` | rectangle de carte visible (moins HUD et tiroir) |
| `ui.reducedMotion()` | couper tremblements et caméras automatiques |

---

## 6. Gamification et « juice » adaptés à un idle nourri par Anki

### 6.1 Principe
Le « juice » (retour visuel et sonore généreux) rend un geste satisfaisant [web : Jonasson et Purho, *Juice It or Lose It*]. Mais trop de juice nuit à la lecture et à l'immersion [web : Folmer Kelly, *Don't Juice It or Lose It*]. Ici, la règle : **le juice raconte un changement d'état réel** (une ressource entre, un bâtiment naît, un jour passe). Jamais de feu d'artifice pour rien, jamais pour faire revenir.

### 6.2 Le moment héros : le retour de séance Anki
Les crédits arrivent par paquets (à la fin d'une séance, à une synchro ; dans l'add-on bureau, après chaque carte via `reviewer_did_answer_card`). Le rejeu est déjà compressé à 3 s au plus (rapport GD §2.5). Je propose d'en faire une petite cinématique **de 3 à 5 s, passable d'un tap, sans aucun geste obligatoire** :

```
 t = 0 s     Ciel d'aube. Bandeau : « 42 cartes · 42 jours de village »
 0 - 3 s     Le soleil traverse le ciel (jours qui défilent) ; les puces du HUD
             montent en douceur ; les nouveaux bâtiments de la file « popent »
             à leur place ; la caméra fait un lent travelling si l'écran est libre
 3 s         Résumé en 3 lignes au plus : « +1 200 bois, +3 cabanes construites,
             recherche terminée : Bronze »  [Voir le détail]
 si journée  Le coffre (SK.ui.chest, déjà dessiné) s'ouvre sur la place :
 accomplie   « Journée accomplie : +15 » ; la flamme grandit d'un cran
```

Le coffre et la flamme existent dans `kit/ui.js` (`chest`, `flame`, `reward`), et `SpriteKit.reward()` est déjà branché. C'est du travail de mise en scène, pas de dessin.

### 6.3 La boucle quotidienne
1. **Avant les cartes** : le village attend, ciel d'aube, citoyens au repos ; la pastille Anki dit « Le village attend tes cartes » (C-H1 du PLAN). Aucun compteur qui presse.
2. **Révision** (dans Anki).
3. **Retour** : rejeu (§6.2).
4. **Décisions** : 3 à 6 achats, un réglage de métiers, une recherche, la file pour la prochaine fois.
5. **Fin** : le HUD affiche « Tout est en ordre » quand il n'y a plus rien d'utile à faire. On ferme.
6. **Hebdomadaire** : le Courrier du soir (C-L1 à C-L3) arrive dans le Journal, avec un sceau sur la pastille.

### 6.4 Objectifs tirés d'Evolve
- **Trois objectifs visibles au plus**, repliés en haut à gauche (« Obj. 1/3 »), générés à partir de l'état : prochaine technologie-jalon de l'ère, un compte à atteindre (« 10 cabanes »), un exploit d'Evolve proche (`achieve.js`).
- **Récompense : pas de ressources.** Le budget est réglé au crédit près (enveloppe de bonus plafonnée à +40 %, PLAN §2). La récompense est le jalon lui-même, une fanfare courte, une ligne de Chronique, parfois une décoration sur la carte (statue, bannière). La progression d'Evolve est déjà la carotte : l'objectif sert à **orienter**, pas à payer.
- **Pas d'objectifs quotidiens à durée limitée** (pas de « fais X avant minuit »).

### 6.5 Notifications
- **Aucune notification système** (règle du projet : ni classement ni notifications).
- **Toasts en jeu** en haut au centre, deux au plus, 3 s, priorité : alertes (famine, raid) > fin de recherche > fin de chantier > divers. Tout le reste va au Journal.
- **Pastilles** sur un bouton de hub seulement pour une chose **actionnable** (nouvelle technologie disponible, nouveau bâtiment débloqué, lettre). Jamais de pastille pour « il y a du contenu ».

### 6.6 Sons (hors ligne)
- **Synthèse WebAudio** dans le code (oscillateurs, enveloppes, bruit), à la manière de sfxr/jsfxr dont on peut lire le code pour le réimplémenter [mémoire] : aucune ressource externe, quelques kilo-octets.
- Une douzaine de sons : tap, ouverture de tiroir, construction (pop), recherche (« eurêka »), pièce, jour qui passe (pendant le rejeu, très doux), coffre, erreur douce, toast d'alerte, bataille.
- **Volume bas par défaut**, réglage dans le Menu, et coupure automatique quand la fenêtre perd le focus (dans Anki bureau, on ne veut aucun son pendant les révisions).

### 6.7 Particules et tremblements
- **Particules** : icônes de ressources qui volent (coût qui part, gain qui arrive), poussière de chantier, étincelles de recherche. Au plus ~40 à la fois sur téléphone.
- **Tremblement d'écran** : seulement pour un séisme (`quake`), un raid subi, un lancement de fusée, un changement d'ère. 2 à 4 px, 200 ms. Coupé par défaut si `prefers-reduced-motion`.

### 6.8 Ce qu'il ne faut pas faire (dark patterns)
Le catalogue G1 du projet et la littérature (darkpattern.games, Zagal et al. [web]) donnent la liste ; voici celles qui guettent précisément ce projet :
- série qui se **casse** et culpabilise (la Flamme ne s'éteint jamais : garder ce principe dans l'UI, pas de « 0 jour ») ;
- minuterie « reviens dans 4 h », coffres qui se remplissent en temps réel ;
- récompenses à ratio variable (loot box, roue de la fortune) ;
- **pousser à faire des cartes au-delà des dues** (« plus que 3 cartes pour… ») ;
- FOMO : événements limités dans le temps ;
- pastilles rouges permanentes, compteurs de « choses à faire » qui ne descendent jamais ;
- taux de production affichés en temps réel qui laisseraient croire que laisser la fenêtre ouverte rapporte (c'est faux en mode cartes : ne pas le suggérer).

---

## 7. Architecture

### 7.1 Reskin ou nouvelle couche ? **Nouvelle couche.**

| Critère | Reskin du DOM Vue d'Evolve | Nouvelle couche (`api.js` + UI) |
|---|---|---|
| Ressemble-t-il à un jeu ? | non : la structure reste colonnes + onglets Buefy (`index.js:893-1200`) ; le CSS ne peut que déplacer et habiller | **oui** : on choisit la structure |
| Fichiers d'Evolve touchés | beaucoup : les gabarits sont des chaînes jQuery dans ~10 fichiers (`setAction`, `loadJob`, `marketItem`, `foreignGov`…) | **peu** : un nouveau fichier `src/api.js`, une ligne d'import, une dizaine de mots `export` |
| Fusions avec l'amont | conflits à chaque version | conflits rares et petits |
| Effort au départ | faible (déjà fait en partie : `pixel.css`, 342 lignes) | moyen (40-70 h pour le palier A, audit F) |
| Risque | faible mais plafond bas | moyen ; maîtrisé par le filet « interface classique » |
| Texte riche d'Evolve (HTML des descriptions) | natif | **natif aussi** si l'UI est en DOM |

L'audit F arrivait déjà à « cacher l'interface d'origine, ne pas la supprimer ». Je confirme et je pousse plus loin : **la nouvelle couche devient l'interface par défaut**, l'ancienne un mode.

### 7.2 Le chemin de migration
1. **`src/api.js`** (nouveau fichier, licence au choix puisque neuf ; il importe les modules MPL sans les modifier) : expose `window.EvolveAPI` avec
   - `state()` : la référence **vivante** à `global`, en lecture seule par discipline ;
   - `act(region, type, n)` : appelle `runAction` n fois (il faut ajouter `export` devant `runAction`, `actions.js:6496`) — boucler n fois est plus simple et plus juste que de simuler les touches de `keyMultiplier` ;
   - `visible.city()`, `visible.tech()` : les mêmes prédicats que `drawCity`/`drawTech` (`checkCityRequirements`, `checkTechQualifications`, `checkTechRequirements`, plus `checkTechPath` et `checkOldTech` à exporter) ;
   - `cost(action)` (`adjustCosts`), `afford(action)` (`checkAffordable`, deux niveaux), `eta(action)` (`timeCheck`) ;
   - les gestes enfermés dans Vue, réécrits à l'identique avec la ligne d'origine en commentaire : `jobs.add/sub/setDefault` (`jobs.js:588-634`), `power.on/off` (dans `setAction`), `craft`, `market.buy/sell/route`, `crate.add/remove` ;
   - les gestes déjà exportés : `govCivics`, `armyRating`, `tradeBuyPrice/SellPrice`, `craftCost`…
   - `onMessage(fn)` : enveloppe de `messageQueue` (ou lecture de `global.lastMsg`) pour les toasts.
2. **Test de fumée** (Node, déjà l'habitude du projet) : chaque nom exposé existe et a la bonne arité ; un geste par catégorie sur un état de test donne le même `global` que le chemin d'origine.
3. **Interface classique** : `#main` et `#topBar` d'Evolve passent sous la couche (masqués, pas détruits). Bouton « Interface classique » dans le Menu, et **renvoi contextuel** : pour toute fonction pas encore refaite, le panneau affiche « Ouvrir dans l'interface classique », qui bascule sur le bon onglet (`global.settings.civTabs`, `govTabs`, `marketTabs`…). Ainsi **100 % des interactions sont atteignables dès P1**.
4. **Couverture mesurée** : une page de diagnostic liste les entrées de l'inventaire §2.2 et leur état (refait / renvoi). C'est le critère « fini » de la refonte.
5. **Piège connu** : `drawCity` et `drawTech` ne redessinent que si leur onglet est actif (`actions.js:6025`, `6092`). En revenant à l'interface classique, appeler les redessins (ou forcer `tabLoad` à ce moment-là).
6. **Autre piège** : le test tactile d'Evolve dans `setAction` (`navigator.userAgent.match(/Mobi/ && global.settings.touch)`, `actions.js` méthode `action`) est bancal (audit F) ; ne pas s'en servir, la nouvelle couche gère le tactile elle-même.

### 7.3 Lier l'état et tenir la performance
- **Lire l'état vivant, ne plus cloner.** Aujourd'hui le kit lit `window.evolve.global` une fois par seconde (`SpriteKit.run`, `readMs: 1000`, `spritekit.js:735-741`), mais ce `global` est un `deepClone` refait à chaque `fastLoop` (§1.2 R7). Recommandation : `api.js` fournit la référence vivante ; `updateDebugData` passe à 1 Hz au plus (ou à la demande) ; à mesurer avant/après avec `performance.now()` autour de `main.js:8112`.
- **Lecture à 4 Hz au plus, pendant les rejeux comme hors rejeux** : un minuteur aligné sur `requestAnimationFrame` construit un petit « modèle de vue » (uniquement ce qui est affiché : 6 puces, le tiroir ouvert), le compare au précédent (valeurs primitives), et ne touche le DOM que pour ce qui a changé (`textContent` seulement si la chaîne diffère, `style.transform` pour les barres).
- **Pas de lecture de mise en page dans la boucle** (pas de `offsetWidth` après une écriture) : c'est le « layout thrashing ». Mesures une fois à l'ouverture d'un panneau.
- **Animations en `transform` et `opacity` uniquement**, `contain: layout paint` sur chaque panneau, pas de `backdrop-filter` ni de grosses ombres floues sur téléphone.
- **Listes** : 60 bâtiments ou 120 technologies tiennent sans virtualisation si chaque rangée est simple ; les régions spatiales tardives, plus longues, justifieront une fenêtre glissante simple.
- **Budget** visé sur un téléphone moyen : mise à jour du HUD ≤ 2 ms par lecture ; ouverture d'un tiroir ≤ 100 ms ; carte à 60 i/s quand elle bouge, **30 i/s ou moins quand rien ne bouge** (batterie), rendu suspendu quand un panneau plein écran la couvre.
- **Pourquoi pas Vue 2 pour la nouvelle couche ?** Il est déjà embarqué (`lib/vue.min.js`, donc pas une nouvelle dépendance) et `global` est déjà réactif puisque Evolve le passe en `data`. C'est tentant pour les panneaux. Mais Vue 2 est en fin de vie, ses observateurs se déclenchent à chaque tick sur des centaines de propriétés, et lier notre couche à lui la rendrait fragile si Evolve change un jour de version. Mon choix : **JS simple** avec un petit utilitaire de création d'éléments et la comparaison décrite ci-dessus (quelques centaines de lignes). Si un panneau très dense (le marché) devient pénible à écrire ainsi, Vue 2 reste un repli local acceptable.

### 7.4 DOM ou Canvas pour le HUD ? **DOM.**
- Le texte : descriptions HTML d'Evolve affichables telles quelles, retour à la ligne, sélection, tailles de police réglables, langues futures. Dans un canvas, il faudrait tout réécrire (l'audit F l'a chiffré : défilement 2-3 j, retour à la ligne 1-2 j, accessibilité 1-2 j ou abandon).
- L'accessibilité : rôles, `aria-live` pour les toasts (Evolve le fait déjà pour son journal, `index.js` `#msgQueue`), navigation au clavier.
- La netteté : le DOM est net à toute échelle ; un HUD en canvas doit gérer le DPR lui-même.
- Le canvas reste pour la carte, les particules et les icônes volantes (dessinées dans le canvas de la carte, ou dans un second canvas transparent au-dessus si elles doivent passer sur le HUD).

### 7.5 Police pixel et 9-slice
- **Police** : `KitPixel` (TTF généré hors ligne par `tools/make-font.js`, chargé par `pixel.css`) pour titres, boutons, chiffres. **Police système** pour les phrases (déjà la règle de `pixel.css` : `--px-font-body: system-ui…`). Ajouter des chiffres à chasse fixe. La couverture (latin, accents français) suffit pour notre habillage ; le contenu d'Evolve dans d'autres langues restera en police système.
- **Échelle entière** : un pixel du kit = `--u` px CSS (déjà dans `pixel.css`), avec `--u` choisi selon la **hauteur** : 2 sur téléphone paysage, 3 sur bureau à partir de ~720 px de haut. Taille de police en multiples exacts de la cellule (5 × 7) pour rester nette.
- **9-slice** : `border-image: var(--px-panel) <slice> fill / <largeur>` avec `image-rendering: pixelated`, à partir des data URI que `anki-skin.js` produit déjà (`--px-btn-main`, `--px-panel`…). Une seule source : le kit. Les variantes d'ère changent la `map` de couleurs passée à `X.sprite(name, map)`.

### 7.6 Entrées : toucher, souris, clavier
- **Pointer Events** partout (le kit le fait déjà, `spritekit.js:553-563`). Seuils : déplacement > 8 px = glisser ; appui > 450 ms = appui long.
- **Appui long = infobulle** (remplace le survol). Sur bureau, le survol montre aussi l'infobulle, après 300 ms.
- **Clic droit** sur la carte (bureau) = info ou radial optionnel.
- **Raccourcis bureau** : B Construire, R Recherche, P Peuple, E Économie, C Cité, A Armée, J Journal, Échap fermer, 1-9 onglets du panneau ouvert, Ctrl+K palette de commandes. Garder les modificateurs d'Evolve pour la quantité (Ctrl ×10, Maj ×25, Alt ×100, `vars.js:1499-1505`) pour les habitués, en plus du sélecteur ×1/×10/Max.
- Attention : Evolve écoute déjà le clavier (raccourcis d'onglets `showCiv`… `vars.js:1507-1511`) ; la couche doit capturer d'abord et éviter les doubles actions.

### 7.7 Plein écran et orientation
- **Navigateur Android** : `element.requestFullscreen()` dans un geste de l'utilisateur, puis `screen.orientation.lock('landscape')`. Chrome Android l'accepte une fois le plein écran demandé ; l'appel hors geste échoue [web]. iOS Safari ne verrouille pas l'orientation. Donc : un bouton « Jouer en plein écran », jamais d'appel automatique, et un écran « Tourne ton téléphone — ou joue en portrait » qui offre les deux.
- **Manifeste local** (`display: fullscreen`, `orientation: landscape`) : utile si le jeu est un jour installé comme application web ; sans effet sinon.
- **Anki bureau (Qt WebEngine)** : l'API Fullscreen de la page ne marche que si l'application active `FullScreenSupportEnabled` et répond à `fullScreenRequested` en acceptant puis en mettant elle-même la fenêtre en plein écran [web]. Plus simple et plus robuste : gérer **F11 côté Python** (`VillageDialog.showFullScreen()` / `showNormal()`), et un bouton de la page qui envoie `pycmd('fullscreen')` par le pont déjà présent (`anki-host.js`, `set_bridge_command`). L'orientation ne se pose pas sur bureau.

---

## 8. Portrait et bureau : la même interface, trois dispositions

Les composants sont les mêmes (puces, rangées, barres, fiches) ; seule la **disposition** change. On choisit la disposition selon le **rapport largeur/hauteur et la hauteur**, pas la largeur seule :

| Disposition | Condition (indicative) | Différences |
|---|---|---|
| **Paysage compact** (téléphone) | `orientation: landscape` et hauteur < 500 px | celle des §3.2-3.13 |
| **Portrait** (téléphone) | `orientation: portrait` | barre de ressources sur 2 lignes en haut ; carte au milieu (~55 %) ; barre de 5 hubs en bas ; panneaux en **bottom sheet** (en portrait, c'est le bon choix : la hauteur abonde) à 2 crans (moitié, plein) |
| **Bureau** | hauteur ≥ 600 px et largeur ≥ 1000 px | tiroirs **ancrés** de 420 px qui ne masquent pas la carte ; rail de ressources repliable à gauche (toutes les ressources par groupe, un « Evolve lisible ») ; infobulles au survol ; raccourcis ; `--u = 3` |

```
 Portrait (360 x 800)                     Bureau (1100 x 800)
 +------------------------+               +--------------------------------------------------+
 |[Peuple][Or][Savoir][An]|               |[Ressources épinglées ......................][Anki]|
 |[Bois][Pierre][Nourr][+]|               |+------+                          +---------------+|
 |                        |               ||Rail  |                          | Tiroir ancré  ||
 |                        |               ||ress. |       CARTE              | Construire    ||
 |        CARTE           |               ||(repl.|                          | (420 px)      ||
 |                        |               ||iable)|                          |               ||
 |                        |               |+------+                          +---------------+|
 |[Chantiers]             |               |[Peuple][Écono][Cité][Armée]      [Recherche][CONSTR.]|
 |[Peu][Éco][Rech][CONSTR]|               +--------------------------------------------------+
 +------------------------+
```

Le portrait n'est pas un « mode dégradé » à négliger : sur téléphone, c'est l'orientation dans laquelle on sort d'AnkiDroid. Je le classerais **paysage = vitrine, portrait = usage réel du téléphone**. Les deux doivent être jouables de bout en bout.

---

## 9. Direction artistique de l'interface (pour les briefs Claude Design)

### 9.1 Principes à écrire en tête de chaque brief
1. **La palette du kit, rien d'autre** (`kit/palette.js` : rampes `cream`, `walnut`, `oak`, `saffron`, `sage`, `madder`, `teal`, `ashen`, `soot`, `ember`, `gold`…, tons 0 = clair à 4 = sombre). Les auto-contrôles du kit vérifient déjà qu'aucun pixel n'en sort.
2. **Couleurs de sens constantes à travers les ères** : saffron = action principale, cream = secondaire, madder = danger/manque, sage = gain/abordable, teal = information, ashen = désactivé (déjà la convention d'`anki-skin.js`). Seul le **matériau** des cadres change avec l'ère.
3. **Contour sombre de 1 px** (`selout`), lumière en haut à gauche, ombre portée de 1 px en bas : la même règle que les bâtiments.
4. **Lisible à l'échelle 1** : une icône doit se reconnaître à sa silhouette, sans couleur (test en niveaux de gris).
5. **Pièces + règles de génération** plutôt que des images finies (la méthode du projet, `METHODE-SPRITES.md`) : un cadre 9-slice avec `slice`, un bouton à états générés par le code (`kit/ui.js` le fait déjà : normal, survol, pressé, désactivé).

### 9.2 Inventaire des pièces d'interface à demander
| Lot | Pièces | Taille | Remarque |
|---|---|---|---|
| UI-1 Cadres | panneau, tiroir (bord d'attache), puce de ressource, rangée de liste, onglet actif/inactif, infobulle avec pointe, toast, barre contextuelle | 9-slice, coins 4-6 px | une version par matériau d'ère (§9.4) |
| UI-2 Boutons | bouton rond de hub (56 px à `--u = 2`, soit 28 px du kit), bouton rectangulaire, bouton +/−, interrupteur ON/OFF, sélecteur ×1/×10/Max, cadenas, pastille | | états générés |
| UI-3 Icônes de hub | Construire (marteau), Recherche (fiole/livre), Peuple, Économie (balance), Cité (colonne), Armée (bouclier), Journal (parchemin), Menu, Anki (carte) | 16 × 16 | silhouettes très distinctes |
| UI-4 Icônes de ressources | une par ressource : **ères 0-3 d'abord** (~25 : ARN, ADN, nourriture, bois, pierre, fourrures, cuivre, fer, ciment, charbon, acier, pétrole, titane, aluminium, uranium, contreplaqué, brique, fer forgé, tôle, or, savoir, population, énergie, moral), puis l'espace | 12 × 12 et 16 × 16 | 16 existent déjà (`SK.RES_ICON`, `kit/era1.js:49-53`) ; à compléter et harmoniser |
| UI-5 Quartiers | les 8 `category` d'Evolve | 16 × 16 | servent d'onglets et de bannières sur la carte |
| UI-6 Métiers | une par métier visible (fermier, bûcheron, carrier, mineur, professeur, scientifique, prêtre, banquier, artisan, soldat…) | 12 × 12 | le kit a des icônes de groupe (`JOB_ICON`) |
| UI-7 États | plein, en baisse, éteint, en construction, nouveau, alerte | 8 × 8 | badges posés sur icônes |
| UI-8 Nations | 3 blasons de rivaux + le tien, 4 humeurs | 16 × 16 | lien avec la carte (rapport 24) |
| UI-9 Effets | particule de pièce, poussière, étincelle, éclat de jalon | 4-8 px | le coffre, l'ampoule et la flamme existent (`kit/ui.js`) |

### 9.3 Typographie
- `KitPixel` : titres (gras par doublement, comme `text(…, {bold})`), boutons, chiffres. Corps 5 × 7 dans une cellule ; à `--u = 2`, une capitale fait 14 px : lisible. Ajouter chiffres à chasse fixe, `k M G T`, `+ − × / %`, flèches, et `< > | ~ $` qui manquent (audit F §3).
- Police système pour les phrases, en 15-16 px au moins sur téléphone, réglable.

### 9.4 Faut-il changer le style avec les ères ? **Oui, mais seulement le matériau.**
La disposition, les icônes, les couleurs de sens et la typographie **ne bougent jamais** (sinon le joueur réapprend l'interface à chaque ère). Ce qui change : le matériau du cadre, la texture du fond de panneau, la couleur d'accent secondaire, l'ornement des coins. En pratique, un jeu de « jetons d'ère » (`--frame`, `--paper`, `--ink`, `--accent`, `--ornament`) et une `map` de rampes par ère pour `X.sprite`.

| Ère d'Evolve | Matériau du cadre | Papier / fond | Accent | Ornement |
|---|---|---|---|---|
| 0 évolution | membrane translucide | eau trouble | teal / lime | bulles |
| 1 primitive, civilisée | bois brut, cordes | parchemin | saffron | clous de bois |
| 2 découverte | bois verni, laiton | papier crème | saffron + rouille | rivets |
| 3 industrielle | fer riveté, laiton | papier jauni, quadrillé | ember | boulons, manomètres |
| 4 mondialisée | béton, verre, plastique | blanc cassé | teal | coins arrondis |
| 5-6 premiers pas / espace profond | panneaux blancs, bande orange | gris clair | orange | grilles de fixation |
| 7-8 interstellaire, intergalactique | coque sombre | bleu nuit | cyan holographique | lignes lumineuses |
| 9-10 dimensionnelle, existentielle | néon sur noir | violet profond | magenta, cyan | glitch léger |

Deux gardes-fous : **contraste** (vérifier chaque thème sombre : texte ≥ 4,5:1), et **transition célébrée** : au changement d'ère, les cadres « muent » en une seconde pendant une bannière « Nouvelle ère ». C'est un très beau moment de jeu qui ne coûte presque rien une fois les jetons en place.

### 9.5 Modèle de brief court pour Claude Design
> *Interface, lot UI-1, ère 1. Pièces 9-slice pour un HUD de jeu pixel en paysage. Palette imposée (rampes et tons listés). Pièces : panneau (coin 6 px, bord 2 px bois `walnut` 2-4, papier `cream` 0-1), tiroir (bord gauche d'attache avec deux charnières), puce de ressource (hauteur 16 px du kit), rangée de liste (hauteur 26 px), onglet actif/inactif, infobulle à pointe. Contour 1 px `soot` 4, lumière haut-gauche. Livrer au format des pièces du kit (`rows`, `slice`, `uses`, `def`), sans pixel hors palette, avec une planche d'exemple. Ne pas dessiner de texte.*

---

## 10. Onboarding : les dix premières minutes

### 10.1 La situation réelle
- Ère 0 = protoplasme : pas de calendrier, des boutons de texte (~40 choix d'évolution filtrés par `reqs`, `drawEvolution`, `actions.js:5379`), deux ressources (ARN, ADN). Audit E2.
- **En mode cartes, le clic de cueillette d'ARN est coupé** (`ankiAllowGather`) : les premières minutes dépendent des premières cartes. La conversion ARN → ADN reste permise.
- Le fork force l'espèce humaine : pas de choix de genre à présenter.
- Le kit a déjà l'écran d'évolution (`kit/evolution.js`, taps gérés par `SK.evo.tap`, `spritekit.js:560`) et la passation cellule → village (`SpriteKit.handoff`).

### 10.2 Le déroulé proposé
| Minute | Ce qui se passe | Interface visible |
|---|---|---|
| 0:00 | Trois images, sans texte long : une planète, une goutte d'eau, « Tes cartes sont le temps de ce monde. » Passable. | rien |
| 0:20 | **Écran Cellule** : la cellule au microscope, au centre. Puce ARN seule en haut à gauche, pastille Anki en haut à droite qui pulse doucement : « Révise pour faire passer le temps. » | 2 éléments |
| (séance Anki) | Le joueur révise. | — |
| retour | Rejeu court : l'ARN monte, « 10 cartes : l'aube a été généreuse » (aube de 75, PLAN §2). | — |
| +0:30 | Une main pointe le seul bouton disponible : « Membrane ». Achat → la cellule **change visiblement**. | bouton d'évolution |
| +1:00 | Les choix suivants apparaissent comme des **cartes de mutation** (2 ou 3 à la fois, grande image, une phrase). ADN apparaît comme 2e puce quand Evolve l'affiche. | 2-3 cartes |
| … | Chaque achat ajoute un détail à la cellule (organites, noyau…), avec son et particules. | |
| sentience | Cinématique de passation (`handoff`) : la cellule devient la première tribu sur la carte. **Le HUD de village apparaît élément par élément**. | |
| village, 1re séance | Un seul hub au départ (Construire), une seule suggestion du conseiller (« Construis une cabane »), puis Peuple quand un métier existe, Recherche quand le Savoir apparaît. | progressif |

### 10.3 La révélation progressive est déjà dans Evolve
Evolve a des drapeaux d'affichage pour presque tout : `global.resource[r].display`, `global.civic[job].display`, `global.settings.showCiv`, `showResearch`, `showMarket`, `showStorage`, `showIndustry`, `showPowerGrid`, `showMil`, `arpa.physics`… (gabarits de `loadTab`, `index.js:318-890`). **Le HUD n'affiche un hub ou une puce que si le drapeau correspondant est vrai.** On obtient gratuitement une interface qui grandit avec la partie, comme dans les meilleurs jeux mobiles, sans écrire de tutoriel séparé. Chaque première apparition d'un hub déclenche une bulle d'une phrase, une seule fois.

### 10.4 Règles d'onboarding
- Une seule chose nouvelle à la fois ; jamais deux bulles ensemble.
- Une bulle = une phrase + un geste montré. Jamais de mur de texte.
- Tout est passable, rien n'est rejoué contre la volonté du joueur, et un « Aide » dans le Menu permet de revoir.

---

## 11. Feuille de route par étapes

Principe : **prouver d'abord la partie la plus risquée** — une couche d'interface à nous qui pilote le vrai moteur sur un téléphone et dans Anki. Le reste est du volume.

### P0 — Voir avant de construire (½ à 1 soirée)
- Lancer le jeu dans un vrai navigateur sur le téléphone et dans Anki bureau (c'est aussi la phase 0 du PLAN, jamais faite).
- Mesurer `updateDebugData` (`performance.now()` autour de `main.js:8112`), pendant un rejeu de séance.
- Dans la console : `window.evolve.actions.city.basic_housing.action({isQueue:false})` puis vérifier le débit et la carte (audit F §8).
- **Fini quand** : on sait si le clonage coûte cher et si l'appel direct marche.

### P1 — « Le pouce sur Construire » (le prototype qui tranche, ≈ 3-4 soirées)
- `src/api.js` minimal (`state`, `act`, `visible.city`, `cost`, `afford`, `eta`), `export` de `runAction`.
- Carte plein écran en paysage ; barre du haut avec 4 puces fixes + 2 automatiques ; pastille Anki (reprend le badge du pont).
- Tiroir Construire : onglets par `category`, rangées avec coût, état et délai, [+] ; ×1/×10.
- Tap sur un bâtiment de la carte → barre contextuelle avec « +1 ».
- Aperçu du prochain emplacement et « pop » minimal.
- Bouton « Interface classique » qui rend l'ancienne interface.
- **Fini quand** :
  1. sur le téléphone en paysage, construire 10 bâtiments de 4 types sans ouvrir l'interface classique ;
  2. le nouveau bâtiment apparaît sur la carte moins de 1 s après le tap ;
  3. la mise à jour du HUD coûte ≤ 2 ms, la carte tient 50-60 i/s avec le HUD ;
  4. aucune erreur console, ni dans le navigateur ni dans Anki bureau ;
  5. la même partie s'ouvre dans l'interface classique sans incohérence.
- **À tester avec Mathéo** : « Construis une ferme » chronométré, nombre de taps, et la question « est-ce que ça ressemble à un jeu ? ».

### P2 — Le cœur de la séance (≈ 4-5 soirées)
Recherche, Peuple (métiers, artisans), fiche ressource avec `breakdown`, file de chantiers, conseiller (3 règles), toasts et Journal minimal, écran Cellule de l'ère 0.
**Fini quand** une partie de l'ère 0 au milieu de l'ère 1 se joue sans interface classique ; une séance « retour → décisions → fermer » tient en moins de 2 minutes.

### P3 — Le moment Anki et le juice (≈ 3 soirées)
Rejeu de séance mis en scène (§6.2), coffre de journée accomplie, flamme dans la pastille, icônes volantes, sons WebAudio, réglages (sons, mouvements réduits, tremblements).
**Fini quand** Mathéo dit spontanément quelque chose au retour de séance ; aucun geste obligatoire ; tout est coupé par « mouvements réduits ».

### P4 — Cité, armée, rivaux (≈ 4-5 soirées, avec la carte du rapport 24)
Régime, impôts, gouverneur ; garnison, tactique, campagnes animées ; espions et fiches de nations sur la carte ; frontières repeintes.

### P5 — Économie et énergie (≈ 4 soirées)
Marché, routes, entrepôt, fonderie, usines, réseau électrique.

### P6 — Le reste et le prestige (au fil des ères)
ARPA (« Grands projets »), génome, régions spatiales (avec le globe), resets, réglages, sauvegarde, archives. Ce qui n'est pas fait reste en renvoi classique, mesuré par la page de couverture.

### P7 — Portrait, bureau, accessibilité, thèmes d'ère
Disposition portrait complète, tiroirs ancrés sur bureau, palette de commandes, contrastes, taille de texte, thèmes par ère.

**Ordre conseillé par rapport au PLAN** : P0 = phase 0 ; P1-P2 avancent avec la phase 1 (horloge) ; P3 s'appuie sur les features C (Flamme, Chronique, Courrier) dont il est la vitrine. Le test réel de deux semaines (phase 3 du PLAN) gagne beaucoup à se faire **avec** P1-P3 : on mesurera alors l'effet du jeu tel qu'il sera vraiment.

---

## 12. Références

### Interfaces de jeux et HUD
- **Game UI Database** — https://www.gameuidatabase.com/ — plus de 55 000 écrans filtrables par type d'écran et élément de HUD [web]. Chercher Clash of Clans, Township, Frostpunk, Against the Storm, Polytopia, Kingdom Rush.
- **Supercell, « We've revamped the Clash of Clans user interface »** (8 octobre 2026) — https://supercell.com/en/games/clashofclans/blog/news/weve-revamped-the-clash-of-clans-user-interface/ — le cas d'école de notre problème : hub Construire à onglets, section Conseillé, monnaies affichées par onglet, Battle à gauche et Build à droite [web].
- **Game Developer, « 6 examples of UI design that every game developer should study »** — https://gamedeveloper.com/audio/6-examples-of-ui-design-that-every-game-developer-should-study — contient l'analyse du HUD de Clash Royale (contrôles à la surface, pas enfouis) [web].
- **MY.GAMES, « Heads up! An in-depth dissection of the HUD »** — https://medium.com/my-games-company/heads-up-an-in-depth-dissection-of-one-of-the-most-important-gaming-ui-elements-the-hud-6aa139510804 — théorie du HUD par un designer mobile (page non lue : accès refusé lors de la recherche).

### Juice et sensation
- **Jonasson et Purho, *Juice It or Lose It*** — https://gdcvault.com/play/1016487/Juice-It-or-Lose — les petites touches (rebond, particules, son) qui rendent un geste satisfaisant [web].
- **Folmer Kelly, *Don't Juice It or Lose It*** — https://gdcvault.com/play/1020861/Don-t-Juice-It-or — le contrepoint : trop de juice abîme l'immersion [web].
- **Steve Swink, *Game Feel*** (livre, 2008) — vocabulaire précis de la sensation de jeu [mémoire].

### Jeux incrémentaux
- **Anthony Pecorella, *Quest for Progress: The Math and Design of Idle Games*** — https://gdcvault.com/play/1023876/Quest-for-Progress-The-Math — et la série écrite « The Math of Idle Games » sur Kongregate / Game Developer — courbes de coût, prestige, écran de retour [web].
- **Evolve (amont)** — https://github.com/pmotschmann/Evolve — MPL-2.0 ; à surveiller pour les fusions.
- **Antimatter Dimensions** — https://github.com/IvarK/AntimatterDimensionsSourceCode — MIT, interface web d'incrémental moderne (projet Vue, version Steam) : regarder l'organisation des onglets et des sous-onglets [web].
- **Notations d'Antimatter Dimensions** — https://github.com/antimatter-dimensions/notations — MIT, formats de très grands nombres ; à lire pour la variante HUD (on garde `sizeApproximation`) [web].
- **Kittens Game** — jeu web dense, version mobile payante et fermée [web] ; utile comme exemple d'incrémental profond porté sur téléphone.
- **Melvor Idle, Idle Slayer** — commerciaux, non libres ; Idle Slayer est un bon exemple d'idle **en paysage** avec un HUD minimal [mémoire].

### Jeux libres à lire pour l'architecture
- **shapez.io** — https://github.com/tobspr-games/shapez.io — jeu web (GPL-3.0) avec une partie HUD séparée dans `src/js/game/hud/` [web] ; à lire pour la séparation HUD / rendu du jeu.
- **Unciv** — https://github.com/yairm210/Unciv — stratégie sur Android et bureau (libGDX) ; déjà étudié dans `rapports/5-unciv.md`.
- **Mindustry** — https://github.com/Anuke/Mindustry — GPL-3.0, interface tactile et bureau dans le même code [mémoire].

### Ergonomie mobile et accessibilité
- **Steven Hoober, « How Do Users Really Hold Mobile Devices? »** — https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php — l'étude d'origine des prises en main ; les zones varient avec la posture [web].
- **Game Accessibility Guidelines** — https://gameaccessibilityguidelines.com/ — recommandations en trois niveaux (basique, intermédiaire, avancé) ; commencer par le basique [web].
- **Menus radiaux pour le tactile** — https://bigmedium.com/ideas/radial-menus-for-touch-ui.html — pour et contre, loi de Fitts [web].
- **Zones sûres et encoches** — https://sizzy.co/blog/safe-area-insets — `viewport-fit=cover` et `env(safe-area-inset-*)`, cas du paysage [web].

### Plateformes
- **Qt, `QWebEngineFullScreenRequest`** — https://doc.qt.io/qt/qwebenginefullscreenrequest.html — ce qu'il faut côté application pour que l'API Fullscreen d'une page marche [web].
- **Verrouillage d'orientation** — https://web-platform-dx.github.io/web-features-explorer/features/screen-orientation-lock/ et le bogue Mozilla https://bugzilla.mozilla.org/show_bug.cgi?id=1697647 — plein écran requis, geste utilisateur [web].

### Éthique
- **Zagal, Björk, Lewis, « Dark Patterns in the Design of Games »** — https://research.chalmers.se/publication/177148 — la typologie de référence [web].
- **Deceptive Design, « Level up or game over »** — https://deceptive.design/articles/level-up-or-game-over-exploring-how-dark-patterns-shape-mobile-games — et la base darkpattern.games, utilisée par la recherche [web].
- Et, dans le projet : `rapports/audit/G1-cartes-etat-de-l-art.md` (catalogue des liens cartes → jeu, section H sur les pénalités).

### Son
- **sfxr / jsfxr** — générateurs de bruitages 8 bits ; à lire pour réimplémenter une petite synthèse WebAudio, sans rien embarquer [mémoire].

---

## 13. Questions et suggestions en retour

### 13.1 Réponses aux cinq questions
**L'interface doit-elle changer de style avec les ères ?**
Oui, mais seulement le **matériau** (cadres, papier, accent, ornements) ; jamais la disposition, les icônes, les couleurs de sens ni la typographie. La mue au changement d'ère est un moment fort à mettre en scène (§9.4).

**Comment exposer les trois nations rivales et la guerre de façon amusante ?**
Par la carte : territoires, blasons, humeur diplomatique en visage, renseignement dont la précision dépend des espions (déjà dans les règles d'Evolve), espions visibles, colonne qui marche, carte-résultat, frontières repeintes à l'annexion. Les chiffres restent dans la fiche. La guerre ne doit jamais être plus jolie que le commerce et l'espionnage (§5.5).

**Où vivent le compte de révisions et la série dans le HUD ?**
Dans **une seule pastille en haut à droite** : état du ciel (aube, jour, crépuscule), cartes du jour, flamme dont la taille dit la chaleur. Pas de « nombre de jours de série » en gros, pas d'alerte de perte. Toucher la pastille ouvre le panneau Anki (cartes du jour, bonus actifs, lettre en attente, réserve). Au retour de séance, c'est elle qui « déborde » pour lancer le rejeu (§6.2).

**Quel équilibre entre « regarder » et « gérer » sur une séance de 2 à 5 minutes ?**
Avec l'horloge à cartes, regarder ne rapporte rien : c'est un plaisir, pas une obligation. Je viserais : **5 secondes de spectacle** (rejeu), **30 à 90 secondes de décisions** (3 à 6 achats, un réglage, une recherche, la file), puis le jeu dit « tout est en ordre ». Le temps restant, si le joueur le veut, est de la flânerie sur la carte (citoyens, saisons, quartiers), sans rien à gagner. Une séance doit pouvoir **finir**.

**Ce qu'il ne faut absolument pas faire**
1. Habiller l'ancienne page web au lieu de la remplacer (le reskin a un plafond bas).
2. Tout montrer : 30 ressources dans le HUD, 8 boutons de hub dès le début.
3. Imposer le paysage sur téléphone.
4. Afficher des taux « par seconde » qui laissent croire que laisser la fenêtre ouverte rapporte.
5. Réécrire la logique d'Evolve dans l'interface (calculs de coûts, prérequis) au lieu d'appeler ses fonctions : divergence garantie.
6. Supprimer l'interface d'origine avant d'avoir couvert 100 % de l'inventaire.
7. Faire un HUD en canvas « parce que c'est pixel » : texte, accessibilité et langues deviennent un enfer.
8. Mettre des bottom sheets en paysage.
9. Toute mécanique de rétention : notifications, séries punitives, minuteries, pastilles permanentes, récompenses aléatoires, « encore 3 cartes ».
10. Charger quoi que ce soit d'un hôte externe (polices, icônes, sons) : tout vient du kit ou du code.

### 13.2 Questions pour Mathéo
1. **Téléphone : pour quand ?** Le produit est l'add-on bureau ; le jeu sur téléphone grand public viendra avec l'APK. Veux-tu que P1 vise d'abord la fenêtre Anki bureau (paysage naturel) ou le navigateur du téléphone en paysage ? Je recommande de tester les deux dès P1, mais de **régler les détails sur le bureau**.
2. **Délais en « jours » ou en « cartes » ?** (§4.5) Je recommande « jours », avec « demain » au-delà des dues du jour.
3. **La file de chantiers plus tôt ?** Evolve la débloque par une technologie (`global.tech.queue`). Avec l'horloge à cartes, elle est le meilleur lien entre « planifier » et « réviser ». La donner dès l'ère 1 change un peu l'équilibre : à trancher.
4. **Barre contextuelle (mon choix) ou menu radial ?** (§5.4) Le radial peut exister en option bureau.
5. **Sons activés par défaut ?** Je propose oui, volume bas, coupés quand la fenêtre perd le focus.
6. **Langue** : habillage en français, contenu d'Evolve en anglais pour l'instant ? Une traduction partielle (bâtiments, technologies, ressources, métiers : ~1 500 clés, estimation de l'audit F) serait un chantier à part.
7. **L'interface classique reste-t-elle accessible pour toujours ?** Je recommande oui, dans le Menu.
8. **La guerre** : le ton te convient-il (choix, jamais poussée, conséquences visibles) ?

### 13.3 Suggestions pour Isaac et Bruno
- Écrire `src/api.js` avec, pour chaque geste réécrit, la ligne d'origine en commentaire et un test Node qui compare au comportement d'origine : c'est ce qui protégera la couche lors des fusions avec l'amont.
- Ajouter à `tools/` une page de **couverture** (inventaire §2.2 → refait / renvoi), et une page de **mesure** (coût du HUD, i/s de la carte, coût du clonage).
- Garder un **état de test** sauvegardé par ère (début d'ère 1, milieu d'ère 2, ère 3) pour que chaque panneau se vérifie sans rejouer des semaines.
- Avant P1, lire le rapport 24 et valider avec son auteur le contrat carte ↔ HUD du §5.6.

