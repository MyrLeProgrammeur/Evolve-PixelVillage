# Rapport 24 — Avis de game design : du village 24×24 à la carte-planète

Date : 2026-11-02. Auteur : agent « game designer / dev » lancé par Isaac.
Méthode : lecture du code du kit (`kit/spritekit.js`, `village.js`, `world.js`, `citizens.js`, `era2.js`, `era3.js`, `palette.js`),
du code d'Evolve (`src/civics.js`, `src/tech.js`, `src/vars.js`, `src/actions.js`, `src/main.js`), du clone local d'IsoCity
(`work/isocity/amilich_isometric-city/src/lib/performanceUtils.ts`), du `HANDOFF.md` et du `rapports/plan/PLAN.md`, puis recherches web.
Rien n'a été modifié dans le projet hormis ce fichier.

Conventions : **[code]** = vérifié dans le code ; **[doc]** = lu dans une doc ou une page web ; **[avis]** = mon opinion ;
**[estim.]** = estimation chiffrée non mesurée.

---

## 0. En bref (les 12 recommandations qui comptent)

1. **Le vrai chantier est le moteur de rendu, pas l'art.** Aujourd'hui tout le monde est recomposé pixel par pixel en JS dans un
   tampon 832×600, agrandi ×2 en JS puis envoyé par `putImageData` environ 8 fois par seconde [code, `spritekit.js:574-604, 665-672`].
   Ça ne passe pas à l'échelle d'une planète. Il faut garder le pipeline `Pix` pour **cuire** les sprites et les morceaux de carte
   (une fois), et composer l'image avec `drawImage` de canvas en cache (accéléré par le GPU dans Chromium).
2. **Forme du monde : une bande rectangulaire qui s'enroule d'est en ouest, avec une banquise aux deux pôles.** Coordonnées
   `(q, r) = (x, x + y)` : `q` boucle modulo `W`, `r` va de 0 à `H`. Vue de loin, plus de losange : un planisphère 2:1 qui préfigure
   le globe (c'est déjà une projection équirectangulaire).
3. **Taille : `W = 128`, `H = 256`, soit 32 768 tuiles** (l'équivalent d'un carré iso de 181×181). 192×192 est dans la bonne
   fourchette, mais la contrainte est le contenu plus que la performance : il faut de quoi remplir la planète en fin de partie.
4. **Tuile de 32×16 pixels d'art (celle d'aujourd'hui) au zoom maximal**, affichée à 2, 3 ou 4 pixels écran par pixel d'art.
   Cinq paliers de détail (L0 à L4) qui divisent chacun la taille par 2, comme une pyramide de tuiles de carte web.
5. **Zoom continu pendant le geste, retour en douceur sur un « palier net » au relâcher.** C'est le seul moyen honnête d'avoir
   du pixel art sans scintillement en Canvas 2D.
6. **Vue lointaine : géométrie isométrique, style « carte ».** Aplats, frontières, pictogrammes, lumières de nuit. Pas de
   changement de projection. Le losange disparaît grâce au point 2, pas grâce à une vue de dessus.
7. **Le cœur de la croissance est un « rang d'urbanisation » précalculé.** Pour chaque ville, un ordre fixe des tuiles (Dijkstra
   depuis le centre, coûts du relief, routes plus attirantes) ; l'emprise à la taille `s` = les `s` premières tuiles.
   Monotone par construction, insensible aux grands sauts d'état, rien à stocker par tuile.
8. **Stocker les décisions qui dépendent de l'histoire, dériver tout le reste.** Un micro-journal de moins de 1 Ko : graine,
   valeur de progression au début de chaque ère, villes fondées (index de site), déverrouillages de territoires, maxima atteints.
9. **Deux couches distinctes : les bâtiments comptés (vérité Evolve, 11 centrales = 11 centrales) et le tissu urbain (dérivé,
   décoratif).** Evolve n'a pas assez de bâtiments pour couvrir une planète, et beaucoup de la progression tardive se passe dans
   l'espace. L'écuménopole doit venir du tissu.
10. **Les nations rivales sont sur la carte dès le départ, dans un brouillard qui se lève avec les espions.** C'est exactement le
    découpage d'information d'Evolve (espions 1 = hostilité, 2 = armée, 3 = économie, 4 = troubles) [code, `civics.js:510-513`].
    Attention au piège : `unification` **efface** les drapeaux `occ`/`anx`/`buy` et pose `tech.world_control = 1`
    [code, `tech.js:15655-15675`]. La règle d'appartenance doit être `world_control || occ || anx || buy`.
11. **Le moment magique : la rétrospective.** À l'ouverture, 3 à 5 secondes de film accéléré de ce qui s'est construit depuis la
    dernière visite, qui finit sur l'événement marquant (ville fondée, frontière tombée). Plus la planète de nuit, dont les lumières
    sont la meilleure mesure visuelle d'une civilisation.
12. **Prototype n° 1 : un « spike » de rendu avec de l'art bidon**, sur le téléphone de Mathéo **et** dans Anki en pilote vidéo
    « software » (le pilote par défaut sous Windows [doc]). Si ça ne tient pas 30 à 60 i/s là, rien d'autre ne compte.

---

## 1. Avis honnête sur la vision

### Ce qui est excellent
- **Le fantasme est juste pour un idle game.** Un incrémental vit de longs arcs et de chiffres qui grossissent. Voir ces chiffres
  devenir de la géographie est le meilleur gain qu'on puisse offrir à Evolve, qui est un tableur génial sans image
  (HANDOFF : « seulement du texte »). *Spore* (étape civilisation puis espace), *The Universim* et *Before We Leave* vendent
  exactement ce plaisir : regarder sa civilisation de loin.
- **Les vrais comptes visibles** (« 11 centrales = 11 centrales ») donnent au joueur une preuve concrète de ses décisions.
  C'est rare et c'est un argument fort.
- **Les nations rivales sur la carte** transforment le panneau « Gouvernements étrangers », qui est abstrait, en voisins réels. Et
  l'unification devient enfin un événement visuel : les frontières tombent.
- **Le déterminisme déjà en place** (slot k pour l'instance k, `village.js:53-82`) est la bonne philosophie. Il faut la porter à
  l'échelle de la planète, pas l'abandonner.

### Ce qui est risqué
1. **Le périmètre de l'art.** 13 ères × N types × 5 paliers de zoom, c'est intenable si chaque case demande un sprite. Il faut que
   L2 à L4 soient **générés** à partir des données, et L1 en grande partie dérivé de L0 par un réducteur automatique (section 8).
2. **Le moteur actuel ne passe pas à l'échelle** (point 1 du résumé). Il faut le récrire, pas l'étendre.
3. **Le vide des ères 1 et 2.** Le village occupe 576 tuiles, soit 1,8 % d'une planète de 32 000. Sans dispositif, la planète
   paraîtra déserte pendant des semaines de jeu réel.
4. **L'uniformité des ères tardives.** « Toute la terre couverte » vire facilement au gris uniforme. Il faut des règles qui
   préservent l'histoire et la géographie (section 5.7).
5. **La décroissance.** Evolve peut faire baisser des comptes : démolition, famine, désoccupation (`war_campaign` remet `occ` à
   faux, `civics.js:1549-1558`). Il faut décider ce qui suit la vérité (les bâtiments comptés) et ce qui garde un maximum atteint
   (le tissu urbain, les villes).
6. **Le cache de variantes explosera.** `building()` met en cache par `(type, tier, k, saison, lvl, opts)`, avec un plafond de
   4 000 entrées et une éviction FIFO [code, `village.js:169-178`]. Avec des milliers d'instances, ça va tourner en rond et
   reconstruire sans arrêt, et chaque `Pix` de maison pèse environ 15 Ko [estim.]. Il faut un **pool de variantes** par type
   (16 à 24) avec un anti-clone de voisinage, pas une variante par instance.
7. **Les ères 1 à 3 sont codées « en dur » sur 24×24.** Par exemple `era3.js` fixe `ZONE = {x0:19…}` et des `LOTS` à des coordonnées
   absolues [code, `era3.js:40-45`], et `MAPN`, `layout()`, `worldPt()` sont utilisés partout. Il faut une stratégie de migration
   (section 8.4 : le village devient un « méga-sprite » au début).

### Ce que je changerais ou ajouterais
- **Taille du territoire des nations selon l'économie (`eco`), pas l'armée (`mil`).** `mil` ne bouge presque que par sabotage
  (minimum 50) [code, `main.js:10579`], et voir un pays rétrécir parce qu'on a saboté son armée serait absurde. Je propose :
  surface ∝ `eco`, densité des garnisons et fortifications ∝ `mil`. Mathéo veut l'armée : c'est possible, mais l'économie colle
  mieux aux deux grandeurs d'Evolve. Les deux sont fixées à la création de la civilisation [code, `vars.js:2352-2384`], donc la
  carte des nations est stable dès le départ.
- **Une carte qui se dévoile** (terra incognita façon parchemin), qui gagne en précision à chaque palier d'exploration :
  roue et chariot, port, puis satellites (`tech.satellite`, tech `gps`, ère `early_space` [code]). L'image de la carte elle-même
  évolue : parchemin, carte d'arpenteur, imagerie satellite. C'est la meilleure réponse au vide des premières ères (section 11).
- **Les bâtiments spatiaux ont un écho au sol.** En fin de partie la progression d'Evolve est surtout dans l'espace. Pas de
  satellite sans station au sol, pas de base lunaire sans pas de tir. Sinon la planète se fige au moment où le jeu s'emballe.
- **Le joueur ne doit jamais avoir besoin de la carte pour jouer.** Elle reste une vitrine qui réagit, jamais un goulet. Aucune
  décision du jeu ne doit dépendre d'elle.

---

## 2. Architecture

### 2.1 Coordonnées et forme du monde [avis, calculs vérifiés]

Le kit utilise l'iso classique : `worldPt(x, y) = [NX + (x − y)·16, NY + (x + y)·8]` [code, `spritekit.js:335`].
Je propose de ne rien changer à cette projection, mais de **stocker** la planète dans un repère cisaillé :

```
q = x            (colonne, cyclique : q mod W)
r = x + y        (rangée d'écran, 0 ≤ r < H)
x = q, y = r − q

écran :  sx = (2q − r) · 16   (modulo 32·W)      sy = r · 8
voisins 4 : (q+1, r+1) (q−1, r−1) (q, r+1) (q, r−1)
diagonales : (q+1, r+2) (q−1, r−2)  [voisins verticaux à l'écran]
             (q+1, r)   (q−1, r)    [voisins horizontaux à l'écran]
```

Pourquoi : la translation `(x, y) → (x + W, y − W)` laisse `sy` inchangé et décale `sx` d'exactement `32·W` pixels. Dans ce repère,
c'est simplement `q → q + W`. **L'enroulement est-ouest est donc gratuit et sans couture**, et le monde visible devient une bande
rectangulaire de `32W × 8H` pixels. Avec `H = 2W`, la bande est en 2:1, comme un planisphère équirectangulaire. C'est exactement ce
qu'il faudra plaquer sur la sphère pour le globe de l'ère spatiale (section 3.6).

Les deux bords haut et bas ne bouclent pas : on y met la banquise, puis un « ciel de bord » sombre (ou la carte de nuit).
Les pôles cachent naturellement la fin du monde.

### 2.2 Modèle de données

Trois étages, du plus figé au plus vivant.

**a) Planète (dérivée de la graine, jamais sauvegardée)** — tableaux typés `W·H` :

| Tableau | Type | Contenu |
|---|---|---|
| `elev` | `Int16Array` | altitude |
| `water` | `Uint8Array` | 0 terre, 1 lac, 2 côte, 3 mer peu profonde, 4 océan |
| `flow` | `Uint16Array` | débit (rivières si au-dessus d'un seuil) |
| `biome` | `Uint8Array` | biome local (Whittaker) |
| `land` | `Uint16Array` | identifiant de continent ou d'île |
| `nation0` | `Uint8Array` | territoire initial : 0 sauvage, 1 joueur, 2-4 gov0-gov2 |
| `cityOf`, `rank` | `Uint8Array`, `Uint32Array` | ville de rattachement et rang d'urbanisation dans cette ville |
| `sites` | tableau d'objets | sites de villes classés (tuile, score, segment) |

Mémoire : 32 768 tuiles × environ 16 octets ≈ 0,5 Mo. Négligeable.

**b) Journal (sauvegardé, moins de 1 Ko compressé)** :

```js
J = {
  v: 1, seed: 0x3fa2c1d9,              // graine figée à la naissance de la planète
  eraP: [0, 12, 40, 95, ...],          // progression P au début de chaque ère
  cities: [[siteIdx, P], ...],         // villes fondées, dans l'ordre
  unlock: [[segment, P], ...],         // continent, outre-mer, nation annexée, unification
  hw: { P: 1834, pop: 412 },           // maxima atteints (pour la monotonie)
  scars: [[mad, siteIdx], ...]         // cicatrices de MAD (section 2.6)
}
```

**c) Plan (dérivé à chaque changement d'état, en mémoire seulement)** : pour chaque tuile urbaine, `{ville, usage, densité,
èreDeStyle, refBâtiment}`, plus les listes de bâtiments comptés placés, routes et rails, et l'état des frontières.

### 2.3 Du state Evolve au monde : déterministe et monotone

**La progression `P`.** C'est un scalaire monotone qui pilote le tissu. Je propose un maximum atteint de
`P = Σ_type poids·count + α·population + β·high_tech + γ·(bâtiments spatiaux)`. Le niveau `tech.high_tech` va de 1 à 19, des
ères `discovery` à `existential` [code, liste des `grant: ['high_tech', n]` dans `tech.js`]. C'est une excellente « horloge
technologique » pour les styles.

**Les villes.** Les sites sont classés une fois pour toutes (section 5.3). On fonde une nouvelle ville quand `P` passe un seuil
`T_n` (géométrique, par exemple ×1,6 à chaque ville). Le site choisi est le meilleur parmi les segments déverrouillés, puis on
**l'écrit au journal**. On ne le recalcule jamais : sinon, un déverrouillage tardif ferait changer de place des villes existantes.

**La taille d'une ville** est une fonction de son âge en unités de progression : `s_i = cap_i · logistique((P − P_i) / τ)`,
avec `cap_i` qui dépend du site et `P_i` lu dans le journal. Croissante en `P`, elle ne rétrécit jamais quand une nouvelle ville
apparaît. Les tailles relatives suivent naturellement une loi rang-taille (Zipf) si on fixe `cap` décroissant selon l'ordre de
fondation. La capitale reste la plus grande.

**L'emprise** = les `s_i` premières tuiles de l'ordre `rank` de la ville. Croissance organique, monotone, et en O(1) par mise à jour
(il suffit de connaître `s_i`).

**La densité** d'une tuile dépend de son rang relatif : `rank < 0,15·s` donne le cœur (niveau 4), `< 0,4·s` le niveau 3,
`< 0,75·s` le niveau 2, sinon la banlieue (niveau 1). Comme `s` grandit, le centre se densifie tout seul. C'est l'équivalent
planétaire du `lvl` du village (`village.js:95`).

**L'ère de style** d'une tuile = l'ère en cours au moment où elle a atteint sa densité actuelle. On l'obtient en inversant la loi
de taille : `P_d = s_i⁻¹(rank / seuil_d)`, puis on cherche l'ère dans `J.eraP`. **Un quartier est reconstruit au style de l'époque
quand il se densifie.** Entièrement dérivé, sans rien stocker par tuile. On ajoute :
- **le patrimoine** : environ 10 % des tuiles du cœur, choisies par hachage, gardent leur style d'origine (le kit le fait déjà au
  palier 4 avec `keepOld`, 30 %, `village.js:85-88`) ;
- **le renouvellement** : en plus, toute tuile est reconstruite au moins tous les 4 niveaux de `high_tech`, pour qu'aucune banlieue
  de 1900 ne survive à l'âge cyber, sauf le patrimoine.

**Les bâtiments comptés.** Pour chaque type, une **liste de slots fixe et ordonnée** à l'échelle de la planète. Le slot k est
pris par l'instance k, comme aujourd'hui. L'ordre des slots suit le rang d'urbanisation de leur tuile, filtré par la politique du
type (section 5.5). Les nouvelles instances tombent donc dans la zone déjà urbanisée, ou juste au bord (une mine en avant-poste,
c'est crédible).

Le problème des segments (outre-mer, terres annexées) : la liste d'un type est la **concaténation des segments dans l'ordre de leur
déverrouillage**, en ne gardant que les segments ouverts. Quand un segment s'ouvre, on note au journal le compte de chaque type à
ce moment (quelques dizaines d'entiers). Les instances suivantes alternent alors entre segments selon une règle fixe. Si la liste
d'un type est épuisée, on revient à la compression actuelle : densité plus forte, `lvl` 1 ou 2.

Variante plus simple si cette règle paraît trop subtile : un **cadastre** qui stocke l'index de slot de chaque instance
(2 octets par instance). Environ 3 000 instances en fin de partie [estim.], donc 6 Ko bruts, 3 à 4 Ko compressés. C'est acceptable,
mais je préfère la règle.

### 2.4 Grands sauts d'état (onglet caché des heures)
- `requestAnimationFrame` s'arrête quand l'onglet est caché. **Ne rien calculer pendant ce temps.** Sur `visibilitychange`, on
  calcule le nouveau plan **une fois** et on compare à l'ancien.
- Comme tout dérive de `(graine, journal, state)`, un saut n'est qu'une évaluation de plus. Si plusieurs décisions de journal sont
  dues (trois villes et un déverrouillage), on les applique dans un ordre conventionnel fixe : déverrouillages, puis fondations
  par seuil croissant.
- La **présentation**, elle, rejoue : on interpole `P` de l'ancienne valeur à la nouvelle en 3 à 5 secondes, les tuiles
  apparaissent dans l'ordre de leur rang, avec un nuage de poussière. C'est la rétrospective (section 7.4). Elle rejoint le
  « rattrapage en 3 s au plus » déjà prévu en C-H1 (`PLAN.md`).
- Pendant la rétrospective, la cuisson des morceaux de carte se fait au fil de l'eau (section 4.5). La latence est cachée par
  l'animation.

### 2.5 Ce qu'on stocke, ce qu'on dérive

| Stocké (journal) | Dérivé |
|---|---|
| graine (si elle ne peut pas être dérivée de façon fiable) | relief, eaux, biomes, sites, rangs |
| `P` au début de chaque ère | style de chaque tuile |
| villes fondées et leur `P` | taille, emprise, densité, usage |
| déverrouillages de segments (+ comptes par type au moment du déverrouillage) | slots des bâtiments comptés |
| maxima atteints | routes et rails (A* rejoué dans l'ordre de fondation) |
| cicatrices de MAD | frontières, fortifications, troupes |

Principe de secours : si le journal est perdu, on le reconstruit d'un coup à partir du state courant. Le monde sera un peu
différent mais valide.

**La graine.** Evolve n'a pas de graine de planète stable : `global.seed` avance à chaque tirage [code, `vars.js:69-78`]. Je propose
de **figer** une graine au premier affichage de la planète et de l'écrire au journal, calculée par
`hash(city.biome, city.ptrait, city.geology, gov0-2.name, compteurs de resets qui changent de planète)`. Les noms des nations sont
tirés à la création de la civilisation [code, `actions.js:8700-8717`]. À vérifier : quels resets changent vraiment de planète
(bioseed, trou noir, ascension…) et lesquels la gardent (MAD).

### 2.6 Resets
- **MAD** (guerre nucléaire) : on garde la même graine. Les cicatrices (cratères, zones vitrifiées, ruines) sont dérivées de
  `stats.mad` et de sites tirés par hachage, puis inscrites au journal. La partie suivante se joue sur une planète qui garde la
  mémoire. Les ruines d'avant comblent aussi le vide des premières ères.
- **Bioseed** : animation de départ du vaisseau (`prep_ship`, `launch_ship` sont des bâtiments de ville [code]), puis nouvelle graine.
- **Cas particuliers à traiter** : `cataclysm` et `isolation` (pas de nations : le panneau étranger est caché [code,
  `civics.js:490, 666-676`]), `lone_survivor`, True Path (`gov3` et `gov4` existent [code, `actions.js:8719-8760`] ; leur sens
  sur la carte reste à définir).

---

## 3. Zoom continu en pixel art

### 3.1 Le principe
Un **zoom continu** et un **pixel art net** sont incompatibles au repos : à une échelle non entière, le plus proche voisin rend
certains pixels d'art sur 2 pixels écran et d'autres sur 3, et le motif « rampe » quand on fait défiler. On résout ça comme les
jeux pixel art sérieux : **fluide pendant le geste, net au repos**. Au relâcher, la caméra glisse en 150 à 250 ms vers le palier
net le plus proche. Le joueur ressent un zoom continu, mais l'image ne s'arrête jamais sur une échelle sale.

### 3.2 Les paliers de détail (LOD)

On raisonne en `Tw` = largeur d'une tuile à l'écran. Chaque palier divise l'art par 2 :

| Palier | Tuile d'art | Ce qu'on dessine | Source |
|---|---|---|---|
| **L0** | 32×16 | sprites complets, citoyens, véhicules, fumées, enseignes | art actuel (Claude Design) |
| **L1** | 16×8 | bâtiments simplifiés, routes, rails, arbres en touffes, trains | réduction automatique de L0 + retouches |
| **L2** | 8×4 | blocs : losange coloré + colonne de 0 à 6 px pour la hauteur, routes 1 px | généré à partir des données |
| **L3** | 4×2 | carte : terrain, densité urbaine, routes principales, frontières, pictogrammes | généré |
| **L4** | 2×1 | planisphère : biomes, nations, points de villes, lumières de nuit | généré |

Le palier `t` est cuit avec une unité d'art de `2^t` pixels du monde et affiché à l'échelle `s·2^t` (`s` = pixels écran par pixel
de monde L0).

### 3.3 Les paliers nets selon l'écran
Le piège des téléphones : avec un rapport de pixels de 3, **un pixel d'art sur un pixel écran est illisible** (une tuile L1 de
16 px fait 1,5 mm). Règle : un pixel d'art ne descend jamais sous environ 0,66 pixel CSS. Exemple :

- **Téléphone (rapport 3)** : L0 ×4, ×3, ×2 (tuile de 128, 96, 64 px écran) ; L1 ×3, ×2 ; L2 ×2 ; L3 ×2 ; L4 ×2.
  Planète entière : 4 096 px de monde × 0,25 = 1 024 px écran, soit L3 ×2. Elle tient en largeur (1 080 px) en mode portrait.
- **PC (rapport 1)** : L0 ×4 à ×1 ; L1 ×1 ; L2 ×1 ; L3 ×1. La planète entière tient en L2 ×1 (1 024 px).

### 3.4 Les transitions entre paliers
- **Pendant le geste** : fondu `globalAlpha` du palier fin sur le palier grossier sur une plage étroite (par exemple `Tw` de 28 à 36).
  Les couleurs hors palette pendant 200 ms ne se voient pas.
- **Au repos** : jamais dans une plage de fondu. Les paliers nets sont choisis loin des seuils.
- **Pas de saut de position** : tous les paliers lisent le **même plan**, donc un bâtiment est toujours au même endroit, seul son
  style change. C'est la vraie garantie contre le « popping ».
- Variante plus « pixel » : un fondu tramé de Bayer, déjà utilisé pour les changements de palier de construction (`village.js:504-512`).
  Plus joli mais plus coûteux, à réserver aux changements de saison ou d'ère.

### 3.5 Contre le scintillement
1. Arrondir la position de caméra au pixel écran pendant le mouvement, et **au pixel d'art du palier** au repos (MDN recommande
   des coordonnées entières pour `drawImage` [doc]).
2. `imageSmoothingEnabled = false` partout.
3. Option « netteté » sur PC : le rendu en deux passes (agrandissement au plus proche voisin vers l'échelle entière supérieure dans
   un canvas hors écran, puis réduction lissée). C'est le « sharp bilinear » des émulateurs [doc]. Une passe plein écran de plus :
   à réserver au PC.
4. Arbres, vagues et herbes animés : pas d'animation au-dessus de L1, sinon on voit des fourmis.

### 3.6 Le monde en losange : options et choix

| Option | Pour | Contre |
|---|---|---|
| Losange assumé (OpenTTD) | rien à faire | on voit un losange vide aux coins, pas une planète |
| Rectangle sans enroulement, bord d'océan | simple | bord du monde visible, pas de lien avec le globe |
| **Bande rectangulaire enroulée est-ouest + pôles** | planisphère, aucun bord latéral, devient le globe | distances et A* modulo `W`, bruit sans couture |
| Vue de dessus au loin qui se fond dans l'iso | proportions « vraies » | changement de projection désorientant, deux pipelines |

**Ma recommandation : la bande enroulée.** Le coût réel est faible : un `mod` dans le calcul des morceaux de carte, une distance
modulaire dans A* et Dijkstra, et un bruit échantillonné sur un cylindre (ou mieux, sur une sphère : `noise3(cos λ, sin λ, …)`)
pour qu'il n'y ait pas de couture. L'article *Terrain from Noise* de Red Blob Games traite les cartes qui bouclent [doc].
Pour le globe, la bande 2:1 sert directement de texture équirectangulaire : un globe de 256 px en Canvas 2D, c'est une table de
correspondance pixel → (longitude, latitude) précalculée et 65 000 lectures par image. Pas besoin de WebGL.

Note : générer le bruit en **coordonnées écran** (et non dans le plan iso) fait que ce qui paraît rond à l'écran est rond. Le
tassement vertical de l'iso n'a donc aucune importance visuelle.

---

## 4. Performance du rendu (téléphone et Qt WebEngine)

### 4.1 Ce qui existe et pourquoi il faut changer [code]
`compose()` copie le calque statique, ajoute les éléments dynamiques, agrandit ×2 en JS (1 664×1 200 = 2 Mpx), dessine les acteurs,
puis `putImageData` dès que la clé change, et la clé contient `floor(t/125)` (`spritekit.js:574-589, 665-672`). C'est environ
8 recompositions plein cadre par seconde, tout sur le CPU. C'est raisonnable pour 832×600, mais à l'échelle d'une planète (4 096×2 048 px
de monde, 33 Mpx en ×2) ça ne tient pas. Le tampon `DEPTH` par pixel pour cacher les citoyens derrière les bâtiments
(`village.js:536-541`) ne passe pas non plus à l'échelle.

### 4.2 La nouvelle architecture
- **Cuisson (CPU, rare)** : `Pix` et les compositeurs actuels produisent des sprites, convertis **une fois** en canvas (le cache
  `ATLAS` existe déjà), et des morceaux de carte.
- **Composition (GPU, à chaque image)** : `drawImage` de morceaux en cache, puis des objets mobiles triés.
- **Morceaux alignés sur l'écran** : 512×256 px de monde (environ 512 tuiles), plus 96 px de débord en haut pour les bâtiments hauts.
  Avec `W = 128`, `H = 256`, **le monde entier tient en 8×8 = 64 morceaux**.
- **Cuire un morceau** = découper (`clip`) son rectangle et dessiner, dans l'ordre de profondeur, **tout objet dont la boîte coupe ce
  rectangle**. Plus de problème d'ordre entre morceaux, au prix d'un peu de surdessin en bordure.

### 4.3 Budgets [estim.]

| Palier | Taille d'un morceau | Monde entier | Politique de cache |
|---|---|---|---|
| L0 | 512×352 × 4 o ≈ 720 Ko | ≈ 46 Mo | LRU de 24 morceaux (≈ 17 Mo) |
| L1 | ≈ 180 Ko | ≈ 11,5 Mo | **tout gardé** |
| L2 | ≈ 45 Ko | ≈ 3 Mo | tout gardé |
| L3 + L4 | — | < 1 Mo | tout gardé, sert aussi de mini-carte |

Total visé : **moins de 40 Mo de canvas**. Par image : au plus 20 morceaux, 100 citoyens, 50 véhicules, 300 particules, soit moins
de 500 appels `drawImage`. Budget JS + dessin : 8 ms sur un téléphone moyen, plancher accepté 30 i/s.

### 4.4 Citoyens et occlusion sans tampon de profondeur
Les citoyens ne sont dessinés **qu'en L0** (IsoCity fait pareil : piétons au zoom ≥ 0,7 seulement [code,
`performanceUtils.ts:116-165`]). Les bâtiments statiques sont cuits dans le morceau. Pour chaque mobile, on le dessine puis **on
redessine par-dessus les bâtiments devant lui** dont la boîte le recouvre (index spatial par tuile). Avec moins de 100 mobiles,
c'est très bon marché. Les bâtiments animés (`DYN`, `village.js:27-29` : derricks, roues…) ne sont pas cuits ; ils sont dessinés à
chaque image dans l'ordre de profondeur avec les mobiles.

Le style actuel garde : citoyens à demi-pixel d'art (mixels, `WK = 2`, `spritekit.js:542-544`). Avec `drawImage`, il suffit de
dessiner leurs canvas à la moitié de l'échelle des bâtiments.

### 4.5 Les mises à jour
- On compare l'ancien plan et le nouveau, on obtient une liste de tuiles, donc de morceaux « sales » par palier.
- On recuit **au fil de l'eau** (au plus 4 ms par image), en gardant l'ancien morceau affiché jusqu'à ce que le nouveau soit prêt :
  pas de clignotement.
- Les comparaisons doivent être en O(changements). On garde une signature légère (somme des comptes, ère, drapeaux étrangers) et on
  ne recalcule le plan que si elle change. Lecture du state Evolve : environ 1 Hz, pas à chaque image.
- **Saisons** : plutôt que tout recuire d'un coup, on fait **descendre la saison en vague** depuis les pôles sur une à deux secondes.
  La latence devient un effet.

### 4.6 Autres astuces
- **Deux horloges** : la caméra au rythme de l'écran, le monde à 8 Hz (le pas de 125 ms actuel, `village.js:365`). Le pixel art n'a
  pas besoin de 60 Hz. Quand la caméra est immobile, on ne redessine qu'à 8 Hz : grosse économie de batterie, utile car le panneau
  peut rester ouvert des heures dans Anki.
- **L'océan** est un calque à part : `createPattern` d'un motif iso (période de 32×16 px) en 4 images d'animation, sous des morceaux
  de terre transparents. L'eau animée de toute la planète coûte un seul `fillRect`.
- **Pas d'allocations dans la boucle d'image** : tableaux circulaires pour les particules au lieu de `splice`
  (`village.js:381-382`), pas de fermetures par pixel dans le chemin chaud (elles restent acceptables pour la cuisson).
- **Canvas sans alpha** (`getContext('2d', {alpha: false})`) pour le canvas d'affichage [doc, MDN].
- **Génération de planète** : budget de 300 ms sur téléphone [estim. : 32 000 tuiles de bruit, Priority-Flood, quelques Dijkstra].
  Si ça dépasse, un Web Worker créé depuis un Blob (aucune dépendance externe). Ne pas compter sur IndexedDB dans Anki : le profil
  web peut ne pas persister. Il vaut mieux savoir régénérer vite.

### 4.7 WebGL : mon avis
**WebGL2 serait objectivement meilleur pour ce type de jeu** : toute la carte en un appel (une texture d'index de tuiles), recoloration
par shader (saisons, nuit, couleurs de nation sans recuisson), zoom net à n'importe quelle échelle, instanciation de milliers de
sprites, globe trivial.

**Mais je recommande Canvas 2D d'abord**, pour trois raisons :
1. Dans Anki sous Windows, le pilote par défaut est « software » [doc, docs.ankiweb.net]. WebGL y passe par un moteur logiciel et
   devient lent. Canvas 2D reste correct.
2. Le pipeline procédural est entièrement CPU (`Pix`). Il produirait de toute façon des bitmaps à envoyer au GPU, et ça marche aussi
   bien en Canvas 2D.
3. La perte de contexte sur Android et le code en plus.

Mettre le rendu derrière une petite interface (`drawChunk`, `drawSprite`, `drawOverlay`) pour pouvoir ajouter un moteur WebGL2 plus
tard. Le réserver au globe de l'ère spatiale, ou au cas où le profilage montre qu'on est limité par `drawImage`.

---

## 5. La planète procédurale

### 5.1 Relief, eaux, biomes
1. **Masque de continents** : bruit fBm sur la sphère, plus 2 ou 3 « plaques » (gros blobs de bruit basse fréquence). Le niveau de
   la mer est fixé par **centile** pour atteindre une part de terre selon le biome d'Evolve : `oceanic` 35 %, `grassland` 45 %,
   `desert` 60 % [avis].
2. **Montagnes** : bruit « ridged » le long des bords de plaques.
3. **Rivières** : Priority-Flood de Barnes pour combler les cuvettes (le pseudo-code fait 20 lignes [doc]), puis direction
   d'écoulement et accumulation, et rivière là où le débit dépasse un seuil. Mapgen4 fait naître les rivières de la pluie plutôt
   que de sources tirées au hasard [doc].
4. **Biomes** : température (latitude + altitude) × humidité (distance à l'eau, vent dominant). Diagramme de Whittaker, comme chez
   Red Blob Games.
5. **Le biome d'Evolve** (12 biomes [code, `races.js:7857`], dont `hellscape`, `eden`, `ashland`) donne **la couleur de la région
   natale** et la tendance de la planète. La capitale est placée dans une région qui correspond à `city.biome`. Les traits
   planétaires `city.ptrait` (`toxic`, `stormy`, `permafrost`, `flare`… [code, `races.js:7952`]) modifient le ciel et le sol.
   `city.geology` (gisements) place les mines.

### 5.2 La capitale = le village actuel, incrusté
Le village a son étang, son ruisseau et ses collines (`layout()`, `spritekit.js:338-356`). Plutôt que de chercher un site qui lui
ressemble, on **tamponne** son terrain dans la planète au site de la capitale et on le raccorde (rivière prolongée, collines
fondues). Le centre historique reste reconnaissable.

### 5.3 Choix des sites de villes
Score par tuile de terre : accès à l'eau douce (débit), côte, pente faible, biome fertile, gisements proches, moins l'altitude et
moins la glace ou le désert profond. Échantillonnage de Poisson (Bridson) avec un espacement minimal d'environ 12 tuiles, puis tri.
C'est l'approche de Martin O'Leary (près de l'eau, loin des autres villes) [doc] et d'Azgaar.

Ordre de fondation : glouton, `score − λ·distance à la ville joueur la plus proche`, limité aux **segments ouverts** :
1. continent natal (dans le territoire du joueur et le sauvage) ;
2. outre-mer après `tech.wharf` (ère `industrialized` [code]) ou après un niveau de commerce ;
3. terres de chaque nation après occupation, annexion ou achat (leurs villes **deviennent** les vôtres, ce ne sont pas de nouvelles
   fondations) ;
4. le reste après `world_control`.

### 5.4 Croissance d'une ville
- **Rang d'urbanisation** : Dijkstra depuis le centre, coût = pente × (1 + bruit), eau infranchissable (ponts plus tard, très
  chers), **réduction le long des routes** (développement en ruban, la règle « croissance attirée par la route » du modèle SLEUTH
  [doc]) et quelques **noyaux secondaires** à activation retardée (la règle « nouveaux centres » de SLEUTH). Résultat : des villes
  qui suivent les vallées et les côtes, avec des faubourgs le long des axes.
- **Les cercles de densité** et **le réaménagement par ère** : voir section 2.3.
- **L'usage des tuiles** :
  - industrie près des bâtiments comptés industriels et des rails ;
  - commerce au centre et le long des axes ;
  - parcs le long des rivières et sur des tuiles choisies par hachage ;
  - civique autour des monuments.

### 5.5 Politique de placement des bâtiments comptés (exemples)

| Types | Où |
|---|---|
| `basic_housing`, `cottage`, `apartment` | tissu résidentiel, du cœur vers la périphérie selon le niveau |
| `farm`, `mill`, `windmill`, `silo` | anneau extérieur, terres fertiles plates |
| `rock_quarry`, `mine`, `coal_mine`, `oil_well` | gisements (`geology`), même hors de la ville |
| `factory`, `foundry`, `smelter`, `cement_plant` | zone industrielle, sous le vent, près du rail |
| `coal_power`, `oil_power`, `fission_power` | bords de ville, au bord de l'eau pour la fission |
| `wharf` | côte ou grande rivière |
| `temple`, `university`, `library`, `amphitheatre`, merveilles | cœur, jamais reconstruits (patrimoine) |
| `mass_driver` | grande rampe en périphérie, monument tardif |

(Tous ces types sont des bâtiments de ville d'Evolve [code, liste `city` d'`actions.js`].)

### 5.6 Routes et rails
`tech.transport` tombe parfaitement [code] :

| Niveau | Tech | Ère | Réseau |
|---|---|---|---|
| 1 | `wheel` | primitive | sentiers |
| 2 | `wagon` | civilized | routes entre villes |
| 3 | `steam_engine` | discovery | **voies ferrées** |
| 4 | `combustion_engine` | industrialized | routes goudronnées, autoroutes |
| 5 | `hover_cart` | deep_space | voies de lévitation |

Le réseau se dérive : à chaque fondation (dans l'ordre du journal), A* depuis la ville vers la ville existante la plus proche, coût =
pente + traversée d'eau (pont) − **réduction sur les routes existantes**, ce qui fait que les troncs se partagent naturellement. C'est
le principe des routes d'Azgaar [doc]. La **classe** de chaque segment dépend de `tech.transport` et de la taille des villes reliées.
Les rails relient la capitale aux N plus grandes villes. Rien à stocker.

Rues intérieures : en v1, une grille de blocs par ville (pas de 3 ou 4 tuiles), orientée sur l'un des deux axes iso, avec un
centre ancien irrégulier (bruit). Les champs de tenseurs (MapGenerator de ProbableTrain) sont une belle v2, mais trop pour
commencer.

### 5.7 Une écuménopole belle, pas grise
1. **Districts dictés par la géographie** : arcologies côtières, flèches sur les montagnes, champs de centres de données aux pôles
   avec panaches de refroidissement, fermes solaires à l'équateur.
2. **Hiérarchie verticale** : les hauteurs suivent la densité et le relief. La silhouette se lit encore en L1 et L2 grâce à la
   colonne de hauteur.
3. **Nature protégée** : corridors fluviaux, côtes, et surtout les **forêts de la mémoire** (section 11), qui ne seront jamais
   urbanisées.
4. **L'écuménopole se souvient de ses nations.** Après l'unification, chaque ancien territoire garde un **accent architectural**
   (couleur de toit, motif). On lit l'histoire sur la carte.
5. **Mégastructures réelles d'Evolve** : `mass_driver`, centrales à fission avec tours de refroidissement, arcologies (tech
   `arcology`, ère `dimensional` [code]), pas de tir qui grandissent avec les bâtiments spatiaux, stations au sol pour les satellites.
6. **La nuit** : le néon ne se lit bien que sur fond sombre. Le jour, l'écuménopole est minérale et variée ; la nuit, elle devient un
   réseau lumineux.
7. **Discipline de couleur** : le néon ne doit pas dépasser environ 10 % des pixels, avec 2 ou 3 teintes d'accent au maximum.

---

## 6. Nations rivales et guerre (alignées sur les mécaniques réelles)

### 6.1 Ce que dit le code d'Evolve [code]
- `gov0` à `gov2` sont créés avec : `gov0` hostile (`hstl` 80-100), armée 75-125, économie 60-90 ; `gov1` amical (`hstl` 0-20),
  armée 125-175, économie 80-120 ; `gov2` neutre (`hstl` 40-60), armée 200-300, économie 130-170 (`vars.js:2352-2384`).
  En True Path, les armées sont multipliées par 1,25 à 1,5, et `gov3` (armée 650-750) et `gov4` apparaissent (`actions.js:8719-8760`).
- `mil` ne baisse que par sabotage d'espion (minimum 50, `main.js:10579`). `hstl` monte avec les campagnes (embuscade +0-2 …
  siège +10-25, `civics.js:1581-1601`) et baisse par influence. `unrest` monte par incitation.
- **L'occupation** arrive immédiatement après **un siège victorieux** (tactique 4), et coûte 15 ou 20 soldats stationnés
  (`civics.js:1922-1928`). Elle est **réversible** (bouton « désoccuper », `civics.js:1549-1553`).
- **L'annexion et l'achat** passent par une opération d'espionnage (`act = 'annex'` ou `'purchase'`, minuteur `sab`), puis
  `anx` ou `buy` passent à vrai (`main.js:10600-10620`). Réversible aussi (sécession).
- `unification2` demande que les trois soient possédées ; son effet met `world_control = 1` et **remet `occ`, `anx`, `buy` à faux**
  (`tech.js:9561-9610, 15655-15675`). Le panneau étranger disparaît (`gvis`, `civics.js:668-676`).
- **Une campagne n'a pas de durée** : c'est un clic instantané (`war_campaign`). Il n'y a aucun état « bataille en cours ».

### 6.2 Représentation sur la carte
- **Géographie** : à la génération, on place la capitale du joueur et 3 capitales rivales sur le continent natal ou de l'autre côté
  d'un détroit (on se fait la guerre à pied dès l'ère `civilized`). Territoires par croissance de régions à quotas (Dijkstra
  multi-sources avec coût du relief) : **les frontières suivent les crêtes et les rivières**, comme chez O'Leary [doc]. Surface
  cible ∝ `eco`, ou `mil` si Mathéo y tient.
- **Leurs villes grandissent aussi**, de façon décorative, au rythme de l'ère du joueur et de leur `eco`, en restant bornées pour ne
  jamais empiéter sur le joueur. Des voisins qui stagnent seraient tristes.
- **Couleurs** : joueur safran/or, `gov0` garance, `gov1` indigo, `gov2` prune (pas sarcelle, qui se confond avec l'eau). Toujours
  doublées d'un **motif** (hachures, pointillés de frontière) pour les daltoniens. En L3 et L4 : aplat translucide et liseré ; en L0 :
  bornes, clôtures, murs.
- **Brouillard par les espions** (calqué sur Evolve) :

| Espions | Ce qu'on voit |
|---|---|
| 0 | la frontière, des silhouettes de villes, des fumées |
| ≥ 1 | les signes d'hostilité |
| ≥ 2 | les troupes |
| ≥ 3 | le détail des villes (économie) |
| ≥ 4 | les troubles (manifestations, incendies) |

### 6.3 L'hostilité visible
- `hstl < 10` : frontière ouverte, caravanes, route qui traverse (plus tard, les « Comptoirs » de la phase D-3 du `PLAN.md` y
  prennent place naturellement).
- `10-60` : postes de douane.
- `> 60` : palissade puis mur, tours de guet. Selon l'ère : tranchées et barbelés (industrielle), bunkers, clôtures laser.
- Densité de troupes à la frontière ∝ `mil / 100`. Les soldats stationnés en territoire occupé sont visibles (camp dans leur
  capitale), ce qui correspond au coût réel de l'occupation.

### 6.4 Les campagnes
Comme rien ne dure, il faut un **événement**. On ajoute un crochet minuscule dans `war_campaign` (le fork le permet, `src/anki.js`
existe déjà) qui émet `{type: 'campaign', gov, tactic, win, death, loot}`. La carte joue alors une saynète de 3 à 6 s au point de
frontière le plus proche de la capitale :

| Tactique | Saynète |
|---|---|
| Embuscade | quelques soldats en lisière de forêt |
| Raid | un faubourg frontalier, charrettes de butin qui rentrent |
| Pillage | champs en feu, cendres pendant quelques jours en mémoire vive (pas de sauvegarde) |
| Assaut | colonne contre fort, fumée |
| Siège | ville encerclée ; si `occ` passe à vrai, drapeau levé et **la couleur se répand** dans le territoire selon la distance depuis la ville |

La colonne en marche et les blessés existent déjà dans `citizens.js` (en-tête du fichier) : on les réutilise. Défaite : les blessés
rentrent. Annexion en cours (`act = 'annex'`, `sab > 0`) : affiches et urnes dans leur capitale. Achat : convoi de coffres.

### 6.5 Unification
Animation phare : les murs s'effondrent, les frontières se dissolvent en 5 s, les noms se fondent en un seul. Puis la règle passe
définitivement à `world_control`. **Ne pas lire les drapeaux après l'unification.**

---

## 7. UX sur téléphone

### 7.1 Gestes
- Glisser à un doigt avec inertie (vitesse amortie).
- Pincer pour zoomer autour du point milieu des deux doigts.
- Double tape : zoom avant d'un palier sur le point tapé. Bouton « − » (ou double tape à deux doigts) pour reculer.
- Molette : un cran = un palier, autour du curseur, avec lissage. Pincement de pavé tactile (`wheel` + `ctrlKey`).
- Pointer Events (déjà utilisés, `spritekit.js:554-563`) avec suivi de plusieurs pointeurs. `touch-action: none` (déjà posé).
- Retour au palier net en fin de geste (section 3.1).

### 7.2 Toucher pour lire
- En L0, toucher un bâtiment ouvre une fiche : « Centrale au charbon — 4 ici, 11 dans l'empire ».
- En L3 ou L4, toucher une ville ouvre sa fiche (nom, jour de fondation, part de population, bâtiments notables) avec un bouton
  « y aller ».
- Noms de villes générés à partir des tables de syllabes qu'Evolve utilise pour les nations (`genCivName`).

### 7.3 Caméra et moments
- **Ne jamais prendre la caméra pendant une interaction.** Les événements s'empilent dans une file. Petite bannière en jeu :
  « Nouvelle ville : Ostrava-sur-Lys — Voir ».
- « Voir » lance un vol zoom arrière, déplacement, zoom avant en 1 à 1,5 s, selon le chemin optimal de van Wijk et Nuij.
- **Pas de notifications système** : c'est une règle du projet (HANDOFF, « pas de classement ni de notifications »). Les moments
  n'existent que quand le joueur regarde.

### 7.4 La rétrospective
À l'ouverture, si `P` a bougé : « Pendant ton absence… », 3 à 5 s de croissance accélérée, terminée par l'événement le plus important.
On la passe d'un toucher. Elle remplace le bandeau de rattrapage de C-H1.

### 7.5 Mini-carte et repères
- Sur téléphone, **la vue lointaine est la mini-carte** : on y va d'un pincement. On ajoute un bouton « maison » (capitale) et un
  petit indicateur de position quand on est en L0.
- Sur PC, une mini-carte en coin est gratuite : c'est le morceau L4 (256×128).

### 7.6 Réglages de performance
- « Auto / Économie / Max ». En auto : mesure du temps d'image pendant 3 s, puis réglage du zoom L0 maximal, du nombre de citoyens
  et de particules, de l'éclairage de nuit, du rapport de pixels plafonné à 2, et d'une limite à 30 i/s.
- Rendu à la demande quand rien ne bouge.

### 7.7 Divers
- Portrait par défaut sur téléphone (la planète tient en largeur), paysage accepté.
- Bouton « carte postale » : export PNG local de la vue, sans réseau.

---

## 8. Direction artistique d'une ère à l'autre

### 8.1 Qui dessine quoi
- **L0** : sprites complets par Claude Design. Ceux des ères 1 à 3 existent.
- **L1** : **réducteur automatique** 2×2 → 1 qui respecte la palette (priorité aux pixels de contour et à la couleur dominante du
  toit), puis retouches par Claude Design seulement pour les monuments et les ratés.
- **L2** : générique par classe (maison, tour, usine, ferme, mine, centrale, monument) × matériaux de l'ère. Un pixel de
  « couleur signature » pour chaque bâtiment compté.
- **L3 / L4** : couleurs calculées. **Plus des pictogrammes de 5×5 ou 7×7** pour les types comptés en vue lointaine (éclair pour les
  centrales…). Ils s'**empilent** en badges de ville (« ⚡ ×11 ») : c'est la leçon des icônes stratégiques de Supreme Commander, où
  les joueurs se plaignaient d'une « soupe d'icônes » illisible [doc].

### 8.2 Ce que doivent contenir les briefs pour Claude Design
1. La grille exacte (tuile 32×16 en L0, 16×8 en L1), l'emprise, la hauteur maximale en pixels.
2. La liste des **rampes autorisées** (noms de `palette.js`) et les nouvelles rampes proposées.
3. Une **planche à plusieurs échelles** : le sprite à ×1 et ×2 à côté d'un sprite existant, et la paire L0/L1 côte à côte.
4. Les tests que le kit sait déjà faire : silhouette (`OPT.silhouette`), gris (`OPT.gray`), anti-clone, et « 0 pixel hors palette »
   (`selfCheck`).
5. **Deux nouveaux canaux de pièce** à côté de `MAIN`, `ACCENT`, `METAL`, `WOOD`, `FOLIAGE`… (`spritekit.js:82-88`) :
   - `TEAM` : couleur de nation, pour qu'un même fort se recolore par pays ;
   - `GLOW` : pixels émissifs (fenêtres, néons) qui s'allument la nuit.
6. Les jeux de **tissu urbain** par ère : résidentiel, commerce, industrie, parc × densité 1 à 4, avec règles de raccord (autotuiles,
   tuiles de Wang).
7. Les autotuiles de routes et de rails par niveau de `transport`.
8. Les kits de frontières et de forts par ère.
9. Les véhicules : train, navire, avion, véhicule à lévitation, avec une version « point lumineux » pour L3.
10. Le terrain à l'échelle planète : montagnes en bosses iso, côtes, largeurs de rivières, banquise.

### 8.3 Une palette cohérente de la planète sauvage au néon
- On garde la philosophie actuelle : rampes de 5 tons, teintes décalées (clairs chauds, sombres froids, `palette.js:2-3`).
- Rampes à ajouter : `concrete`, `asphalt`, `glass_day`, `glass_night`, `chrome`, `neon_cyan`, `neon_magenta`, `holo`,
  `ocean_deep`, `ocean_shelf`, `ice`, `tundra_moss`.
- Chaque ère choisit environ 20 rampes et une **teinte d'ensemble** : terres chaudes, puis suie désaturée (industrie), puis bleu-gris
  propre, puis base sombre et accents néon.
- **Les couleurs de L3 et L4 sont calculées à partir des rampes dominantes de chaque tuile.** La vue lointaine reste ainsi fidèle à
  la vue proche.
- **Lumières de nuit par ère** : feu orangé, sodium jaune, LED blanche, néon cyan et magenta. Vue de loin, la couleur des lumières
  dit l'époque.

### 8.4 Réutiliser le village 24×24
- **Étape 1 (migration bon marché)** : le pipeline actuel continue de rendre le village dans un canvas hors écran de 832×600, sans
  ciel ni pourtour, transparent hors du losange. Le moteur planète le dessine comme un **méga-sprite** au site de la capitale.
  Citoyens et animations compris. On ne le recompose que s'il est visible et en L0 ; sinon on utilise un instantané.
  Tout le travail des ères 1 à 3 est réutilisé tel quel dès le premier jour.
- **Étape 2** : on porte la logique de slots en coordonnées relatives à l'origine de la capitale. Le 24×24 devient un district comme
  un autre, avec ses `SECTORS` et `CFG`. Les instances au-delà de sa capacité débordent vers les autres districts et villes.
- **Faut-il le garder inchangé ?** Non, pas indéfiniment. Il devient le **centre historique**. Les monuments (temple, amphithéâtre,
  merveilles) ne bougent jamais, une part des maisons garde l'ancien style, et le reste suit le réaménagement. Sinon la capitale de
  l'écuménopole aurait un cœur de chaumières, ce qui est charmant une semaine et faux ensuite.

### 8.5 Le ciel disparaît : quoi garder
Les nuages qui dérivent au-dessus de la planète en L2 à L4, avec leurs ombres (`world.js` les a déjà en L0), la pluie et la neige
en L0, et **la ligne jour-nuit** qui balaie la carte.

---

## 9. Feuille de route par étapes

Chaque étape a un critère « fini » et des tests. Les estimations sont en soirées, à titre indicatif [estim.].

**M0 — Spike de rendu (3-5 soirées). Le plus gros risque d'abord.**
Monde 128×256 en bruit simple, bâtiments factices (`shell()` existe), 5 paliers, cache de morceaux, pincement, molette, inertie,
retour au palier net, océan en motif.
*Fini* = 55 i/s ou plus en défilement à tous les zooms sur le téléphone de Mathéo, **et** 30 i/s ou plus dans Anki en pilote
« software ».
*Tests* :
- mesure du temps d'image ;
- mémoire des canvas ;
- moteur Gecko **et** moteur Chromium (si le navigateur du téléphone dégooglisé est un dérivé de Firefox, ses performances Canvas ne
  sont pas celles de Qt WebEngine) ;
- défilement par-dessus la couture de l'enroulement.

**M1 — Planète (3-4 soirées).** Générateur complet, graine tirée du state, biomes d'Evolve, vues L3 et L4.
*Fini* = 20 graines regardées et jugées belles, génération en moins de 300 ms sur téléphone.
*Tests* : même graine = même empreinte (hachage des tableaux) dans Node ; pas de couture.

**M2 — Capitale incrustée (2 soirées).** Le village en méga-sprite, terrain tamponné.
*Fini* = on zoome de la planète entière jusqu'à un citoyen sans coupure.

**M3 — Modèle de croissance (4-5 soirées).** `P`, journal, sites, rangs, tailles, densité, style par ère, tissu en art provisoire
(L2 et L3). **Outil indispensable** : un curseur de temps dans l'atelier qui fait défiler une partie simulée de 0 à la fin.
*Tests de propriétés (Node)* :
- pour P1 < P2, l'emprise à P1 est incluse dans l'emprise à P2 ;
- le slot k est stable ;
- un saut direct et une progression pas à pas donnent le même résultat pour tout ce qui est dérivé ;
- recharger le journal donne le même plan.

**M4 — Bâtiments comptés sur plusieurs villes (3-4 soirées) + brief L1 des ères 1 à 3.**
*Fini* = 11 centrales visibles en 11 endroits, et le compte vérifié par l'outil `placed()` étendu.

**M5 — Routes et rails (2-3 soirées).** A* dans l'ordre de fondation, classes par `transport`, trains en mouvement à tous les zooms.

**M6 — Nations (3-4 soirées).** Territoires, couleurs, brouillard par espions, hostilité visible.
*Tests* : states fabriqués pour chaque combinaison de `occ`, `anx`, `buy`, `world_control`, plus les cas `cataclysm` et `isolation`.

**M7 — Événements de guerre (2-3 soirées).** Crochet dans `war_campaign`, saynètes, occupation, annexion, unification.

**M8 — Ères 4 et suivantes, nuit, écuménopole (gros, par vagues).** Briefs Claude Design ère par ère, selon la méthode existante
(`METHODE-SPRITES.md`).

**M9 — Finitions UX (2-3 soirées).** Rétrospective, file d'événements, fiches, réglages de performance, carte postale.

**Plus tard** : globe, cicatrices de MAD, départ du bioseed.

---

## 10. Références (avec à quoi elles servent)

**Terrain et planète**
- Red Blob Games, *Terrain from Noise* — https://www.redblobgames.com/maps/terrain-from-noise/ : bruit, biomes, cartes qui bouclent.
- Red Blob Games, *Noise Functions and Map Generation* — https://www.redblobgames.com/articles/noise/introduction.html : comprendre
  les couleurs de bruit et le fBm.
- Mapgen4 — https://github.com/redblobgames/mapgen4 (Apache-2.0) : altitude et rivières nées de la pluie, assez rapide pour du temps réel.
- Red Blob Games, *Polygonal map generation* (mapgen2) —
  http://www-cs-students.stanford.edu/~amitp/game-programming/polygon-map-generation/ : le classique, côtes, altitudes, humidité.
- Red Blob Games, bassins versants — https://www.redblobgames.com/x/1723-procedural-river-growing/ : rivières en arbre, confluences.
- Martin O'Leary, notes et code — https://github.com/mewo2/terrain : villes près de l'eau, territoires qui suivent le relief (licence à
  vérifier avant toute reprise).
- Azgaar, Fantasy Map Generator — https://github.com/Azgaar/Fantasy-Map-Generator (MIT) : modules villes et États, générateur de
  routes, rendu des frontières.
- Barnes et al., *Priority-Flood* — https://arxiv.org/abs/1511.04463 : combler les cuvettes en 20 lignes, prérequis des rivières.
- Bridson, échantillonnage de Poisson — https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf : sites de villes
  bien espacés.

**Villes, croissance, routes**
- Parish et Müller, *Procedural Modeling of Cities* (2001) — https://history.siggraph.org/?p=116923 : routes par L-système guidées
  par la densité. Présentation avec démo JS : https://phiresky.github.io/procedural-cities/presentation.html
- Chen, Esch, Wonka, Müller, Zhang, *Interactive procedural street modeling* — https://history.siggraph.org/?p=141564 : rues guidées
  par champs de tenseurs.
- ProbableTrain, MapGenerator — https://github.com/ProbableTrain/MapGenerator (GPL-3.0 : lire, ne pas copier) ; démo
  https://probabletrain.itch.io/city-generator : tenseurs en pratique, l'eau arrête les rues.
- Watabou, Medieval Fantasy City Generator — https://watabou.itch.io/medieval-fantasy-city-generator ; source
  https://github.com/watabou/TownGeneratorOS (GPL-3.0) : quartiers, murs, centre ancien lisible.
- Silva et Clarke 2005, SLEUTH — https://people.geog.ucsb.edu/~kclarke/Silva&Clarke2005.pdf : quatre règles de croissance urbaine
  (spontanée, nouveaux centres, bordure, attirée par la route).
- Batty et Longley, *Fractal Cities* (livre, 1994) : croissance par agrégation, formes fractales des villes.

**Rendu, zoom, pixel art**
- MDN, *Optimizing canvas* — https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas : pré-rendu
  hors écran, coordonnées entières, calques, `alpha: false`.
- Clint Bellanger, *Isometric Tiles Math* — https://clintbellanger.net/articles/isometric_math/ : conversions écran et tuile.
- Tiled, orientations — https://doc.mapeditor.org/en/stable/manual/maps/ : iso décalé, carte iso de forme rectangulaire.
- Scaling and sharpening (CapView) — https://github.com/NuclearMeltdown/CapView/wiki/Scaling-and-sharpening : le « sharp bilinear ».
  Gist de d7samurai — https://gist.github.com/d7samurai/9f17966ba6130a75d1bfb0f1894ed377 : la même idée en shader, pour WebGL un jour.
- OpenStreetMap, *Slippy map tilenames* — https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames : le modèle de pyramide de tuiles
  derrière nos paliers.
- van Wijk et Nuij, *Smooth and efficient zooming and panning* (InfoVis 2003) — https://www.win.tue.nl/~vanwijk/zoompan.pdf : le vol
  de caméra vers un événement.
- IsoCity — `work/isocity/amilich_isometric-city/src/lib/performanceUtils.ts` (clone local, MIT) : table de LOD, culling, LRU,
  budget d'image.
- micropolisJS — `work/isocity/graememcc_micropolisJS/` (clone local, GPL-3.0) : simulation de ville à tuiles en JS.
- Anki, problèmes d'affichage — https://docs.ankiweb.net/platform/windows/display-issues.html : pilote « software » par défaut sous
  Windows, à tester absolument.
- Factorio, FFF #180 *Map improvements* — https://factorio.com/blog/post/fff-180 : zoom de la carte directement dans le monde.
- Pixel art : Slynyrd Pixelblog (https://www.slynyrd.com/pixelblog-catalogue), Saint11 (https://saint11.org/blog/pixel-art-tutorials/),
  Lospec (https://lospec.com/palette-list) : rampes, décalage de teinte, lisibilité aux petites tailles.

**Jeux à étudier (pour le ressenti, pas pour le code)**
- *Crusader Kings III* et *Victoria 3* : au zoom lointain, la carte devient une carte papier politique. C'est notre L3 et L4.
- *Factorio* : passage de la vue de jeu à la vue carte.
- *Supreme Commander* : zoom stratégique et icônes, et ses défauts.
- *Songs of Syx* : immenses villes en pixel art avec zoom.
- *Before We Leave* : city builder sur des planètes, avec globe.
- *Spore* (étapes civilisation et espace), *The Universim* : civilisation sur une planète jusqu'à l'espace.
- *SimCity 4* : vue régionale de plusieurs villes.
- *Dwarf Fortress* : génération du monde avec histoire.
- *The Battle of Polytopia* : villes lisibles par badges de niveau, sur mobile.
- *Pocket City* : gestes de city builder sur mobile.
- *Islanders*, *Mini Metro* : lisibilité par la sobriété.
- *Townscaper* : les conférences d'Oskar Stålberg sur la grille irrégulière et la construction douce (chercher « Oskar Stålberg
  Townscaper talk »).

---

## 11. Questions et suggestions en retour

### Réponses aux questions posées

**192×192, est-ce la bonne taille ? Quelle tuile au zoom maximal ?**
- 192×192 (36 864 tuiles) est dans la bonne fourchette. Je recommande la bande enroulée **128×256 = 32 768 tuiles**, avec `W` en
  paramètre. Pour le prototype, on peut descendre à `W = 96` (18 000 tuiles) si le remplissage tardif inquiète.
- La limite vient du contenu : environ 3 000 bâtiments comptés en fin de partie [estim.] couvrent 4 000 à 6 000 tuiles, sur environ
  18 000 tuiles de terre. Le tissu doit donc remplir les deux tiers.
- Tuile d'art de 32×16 (l'actuelle), affichée au plus à ×4 sur téléphone (environ 9 tuiles en largeur en portrait) et à ×4 sur PC
  (environ 15 tuiles).

**La vue lointaine : iso ou vue de dessus ?**
Géométrie iso, symbolique de carte. Avec la bande enroulée et un bruit généré en coordonnées écran, la vue lointaine *est* déjà un
planisphère. Une vue de dessus imposerait un changement de projection qui désoriente, pour un gain que personne ne verrait.

**Comment éviter le vide des ères 1-2 et l'uniformité des ères tardives ?**
- *Ères 1-2* :
  - la carte se dévoile (parchemin et terra incognita), avec des éclaireurs qui marchent vers le bord du brouillard ;
  - de la vie sauvage (troupeaux qui migrent, oiseaux, saisons qui balaient la carte) ;
  - les **lumières et fumées des nations rivales** dès le départ (on n'est pas seuls) ;
  - les ruines des parties précédentes après un MAD ;
  - la caméra par défaut près de la capitale, pas sur la planète entière.
- *Ères tardives* : section 5.7 (géographie, patrimoine, nations dont on se souvient, nature protégée, mégastructures, nuit).

**Comment montrer les révisions Anki sur le monde, au-delà des ressources ?**
Le `PLAN.md` contient déjà les bons objets. La carte leur donne une géographie :
- **Chênes** (cartes mûres) → **forêts de la mémoire** plantées autour des villes. Elles sont **protégées de l'urbanisation**, donc en
  fin de partie l'écuménopole est veinée de vert à proportion de l'apprentissage à long terme. C'est l'antidote naturel au gris.
- **Flamme** → un phare sur la capitale dont l'éclat suit la chaleur, visible de nuit depuis la vue planète.
- **Fleuve de la mémoire** → une vraie rivière de la planète dont l'éclat suit la rétention (cosmétique, comme prévu).
- **Monuments et Merveille** → des repères visibles depuis l'orbite. **Stèles** → un parc mémorial en L0.
- **Comptoirs** → des routes de commerce et des caravanes vers les trois voisins.
- **Ménagerie** → des bêtes sauvages dans les terres non urbanisées.
- **Le chemin des jours** : une borne lumineuse par jour compté, le long d'une route qui part de la capitale. Un jour manqué laisse
  une borne éteinte, sans rien détruire, ce qui respecte la règle « jamais en baisse ».
- **« Journée accomplie »** → feux d'artifice et guirlandes sur la capitale ce soir-là (les guirlandes existent déjà, `bunt`).
- Et le plus fort : **le temps du jeu ne vient que des révisions** (décision du 2026-10-20). Un jour sans révision, la planète est
  dans la brume de l'aube (« le village attend ») ; une session de révision envoie une vague d'activité depuis la capitale. C'est
  littéralement l'effort réel qui fait tourner le monde.

**Le village actuel devient-il le centre de la capitale, inchangé ?**
Le centre de la capitale, oui. Inchangé, non : centre historique avec monuments fixes et patrimoine, le reste réaménagé (section 8.4).

**Qu'est-ce qui rendrait ça magique à regarder quelques secondes par jour ?**
1. La **rétrospective** à l'ouverture, qui finit sur un événement.
2. La **planète de nuit** dont les lumières s'étendent jour après jour, et la ligne jour-nuit qui la balaie.
3. Des **signes de vie visibles de loin** : trains (points lumineux avec traînée), navires sur les routes maritimes, nuages qui
   dérivent.
4. Des **moments rares** : ville fondée (nom tamponné sur la carte), frontière qui tombe, couleur qui se répand après un siège,
   départ du vaisseau.
5. Le **zoom jusqu'à un citoyen** qui porte un outil fait du métal que tu as débloqué : le lien entre l'échelle de la planète et
   celle d'une personne.

### Questions pour Mathéo et Isaac
1. **Quel navigateur sur le téléphone ?** Moteur Gecko ou Chromium ? Les performances Canvas diffèrent, et Anki, lui, c'est Chromium
   (Qt WebEngine).
2. La carte est-elle **l'écran principal** ou un onglet à côté de l'interface d'Evolve ? (Ça change le budget de calcul partagé avec la
   boucle d'Evolve.)
3. **Surface des nations selon l'économie ou selon l'armée ?** (Ma préférence : l'économie, section 1.)
4. La planète **survit-elle au MAD** ? (Ma proposition : oui, avec cicatrices.)
5. Les **bâtiments spatiaux** ont-ils un écho au sol ? (Ma proposition : oui, sinon la planète se fige en fin de partie.)
6. True Path : que montrer pour `gov3` et `gov4` ? Et pour les scénarios sans planète habitable ou à orbite qui se dégrade ?
7. Les **autres espèces** (hors périmètre pour l'instant) : une architecture par espèce, ou seulement des recolorations ?
8. Faut-il une option **« planète plus petite »** pour les machines faibles (`W = 96`) ?
9. La graine : d'accord pour la **figer** au journal (4 octets) plutôt que de la dériver à chaque chargement ?

### Pièges à garder en tête
- `unification` efface les drapeaux de possession (section 6.1).
- Le cache de variantes par instance va exploser (section 1).
- Les ères 1 à 3 supposent 24×24 en dur (section 8.4).
- Pilote « software » d'Anki : le tester dès M0.
- Ne jamais lire le state Evolve à chaque image. Ne rien calculer onglet caché.
- Le dépôt est **public** : la carte ne doit jamais afficher ni stocker de noms de paquets ou de contenu de cartes Anki (les stèles
  montrent le début d'une question : à garder en local, hors du dépôt et des captures partagées).
