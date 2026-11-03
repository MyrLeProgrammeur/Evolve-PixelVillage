# Rapport 26 — Plan d'implémentation : la carte-planète et la nouvelle interface paysage

Date : 2026-11-02. Auteur : agent « développeur senior / directeur technique » lancé par Isaac.
Entrées : rapport 24 (carte du monde), rapport 25 (interface paysage), `HANDOFF.md`, `METHODE-SPRITES.md`, `rapports/plan/PLAN.md`,
rapport 21, le code de `evolve-pixel-village/` (`kit/`, `src/`, outils, add-on). Rien n'a été modifié dans le projet hormis ce fichier.
Mesures faites pour ce plan : scripts jetables dans `/data/data/com.termux/files/usr/tmp/plan26/` (annexe B).

> **Nom du fichier.** Le plan couvre désormais **toute la construction** (carte du rapport 24 **et** interface du rapport 25).
> Il s'appelle donc `26-plan-implementation-carte-et-interface.md` au lieu de `26-plan-implementation-carte-monde.md`.

Conventions : **[code]** = vérifié dans le code (chemin:ligne de l'arbre actuel) ; **[mesuré]** = mesuré sur le téléphone de Mathéo
(OnePlus CPH2663, Snapdragon 7+ Gen 3 `SM7675`, Node 24) ; **[estim.]** = estimation non mesurée ; **[avis]** = jugement de l'auteur.

Principe directeur posé par Mathéo : **on ne cherche pas le chemin le plus court, mais la meilleure expérience de jeu.** Partout où un choix
échange de l'effort contre de la qualité pour le joueur, ce plan prend la qualité et dit ce qu'elle coûte (§4.0, tableau « choix UX coûteux »).

---

## 0. En bref

### 0.1 Le plan en dix lignes
1. **On construit trois couches neuves, à côté d'Evolve et du kit, sans les réécrire** : `core/` (bus d'événements, instantané d'état,
   ordonnanceur, chaînes anglaises, formatage, persistance), `map/` (planète, croissance, rendu par morceaux cuits) et `ui/` (HUD et
   panneaux en DOM). Côté Evolve, deux fichiers neufs, `src/api.js` (rapport 25) et `src/pv-hooks.js`, plus une dizaine de mots `export`.
2. **La carte cuit, puis compose.** Les sprites et les morceaux de carte (512 × 256 px d'art) sont cuits **une fois** par le pipeline `Pix`
   du kit, découpés en tranches de 2 à 6 ms. Chaque image ne fait que des `drawImage` de canvas en cache, derrière une **interface de rendu**
   (Canvas 2D aujourd'hui, WebGL2 possible plus tard).
3. **Le contrat carte ↔ interface du rapport 25 (§5.6) est adopté**, avec trois ajustements : les marges d'écran sont **poussées** par l'UI
   (`map.setViewportInsets`), l'événement `zoom` devient `camera`, et on ajoute `map.replay`, `map.pause` et l'événement `select`.
   **La carte dit ce qui est sous le doigt ; l'interface décide ce que le toucher veut dire.**
4. **Le premier jalon jouable (J1) pose la nouvelle interface sur le village actuel**, à travers un adaptateur qui respecte déjà ce contrat.
   La planète le remplace en J3 **sans que l'interface change**. Ainsi le travail sur l'interface et celui sur la carte avancent en parallèle
   dès le premier jour.
5. **J0 est un spike de performance** avec de l'art bidon, mesuré sur trois moteurs (Brave, Fennec, Qt WebEngine en pilote « software »)
   avec des seuils chiffrés de go/no-go (§4.2). Rien d'autre ne démarre côté rendu avant ce verdict.
6. **Tout ce qui fait la planète est dérivé** de `(graine, journal, instantané)`. Le journal fait moins de 1 Ko et se range dans
   `global.pv.world`. La génération du monde n'utilise **ni `Math.random`, ni `Math.sin/cos/exp/pow`**, pour que la planète soit identique
   au bit près sur le téléphone et dans Anki (la sauvegarde passe de l'un à l'autre).
7. **14 jalons (J0 à J13) entrelacent carte et interface.** Chacun donne un jeu jouable et meilleur que le précédent. L'interface classique
   d'Evolve reste cachée comme **échafaudage de développement** jusqu'à J12, où elle est retirée une fois la couverture à 100 %
   (annexe A).
8. **Deux erreurs factuelles du rapport 24 changent le plan.** `tech.transport` n'existe que pour le trait `gravity_well`, donc les routes
   suivent une autre règle (§1.1). Le moteur actuel recuit son calque statique environ 9 fois par seconde, et non « rarement » [mesuré].
   S'y ajoutent des trous à combler : déterminisme entre moteurs, cache `ATLAS` jamais vidé, citoyens en demi-pixels qui imposent des
   échelles paires.
9. **Les fichiers du kit ne sont jamais modifiés par ce chantier.** Ils viennent de Claude Design et un nouvel export les écrase. Les
   nouveaux canaux `TEAM` et `GLOW` passent par un brief à Claude Design ou par `kit-patches/`.
10. **Volume** [estim.] : environ 190 tâches de 0,5 à 1 jour, plus les vagues d'art des ères 4 et suivantes. Avec 3 à 4 agents en parallèle
    (§8), c'est de l'ordre de 4 à 6 mois de calendrier au rythme du projet.

### 0.2 Décisions

| # | Question | Décision | Qui | Raison courte |
|---|---|---|---|---|
| D1 | Langue de l'interface (R25-Q6 → Q5 de Mathéo) | **Anglais partout, toujours.** Aucune chaîne française dans le jeu. Nombres au format anglais (`1.2k`, `12,345`) | Mathéo | Décision finale |
| D2 | Interface classique d'Evolve (R25-Q7 → Q6 de Mathéo) | **Supprimée.** Notre interface couvre 100 % des interactions (annexe A). Pendant le développement, le DOM classique reste **caché** comme échafaudage, avec un bouton de secours réservé au mode développeur. Il est retiré en J12 | Mathéo | Décision finale ; l'échafaudage garde le jeu jouable entre les jalons |
| D3 | Sons (R25-Q5 → Q4 de Mathéo) | **Activés par défaut**, volume bas, synthétisés hors ligne (WebAudio), coupés quand la fenêtre perd le focus | Mathéo | Décision finale |
| D4 | Délais : « jours » ou « ≈ cartes » (R25-Q2 → Q1) | **« 3 days »** avec une petite icône de carte ; **« tomorrow »** quand le délai dépasse ce que les dues restantes du jour peuvent apporter. Jamais « ≈ N cards » | SeniorDev | Honnête sans pousser à réviser au-delà des dues (règle du projet, PLAN §2) |
| D5 | File de construction plus tôt (R25-Q3 → Q2) | **Oui : 1 place dès le premier village**, comme le gène `queue` d'Evolve (`vars.js:2426-2429`). `urban_planning` et les techs suivantes l'agrandissent | SeniorDev (ligne de `src/` à valider, §0.3) | Avec l'horloge à cartes, c'est le meilleur lien entre « planifier » et « réviser » ; l'écart d'équilibre est faible (`urban_planning` coûte 2 500 de savoir en ère civilisée) |
| D6 | Barre contextuelle ou menu radial (R25-Q4 → Q3) | **Barre contextuelle en bas au centre partout.** Bureau : la même barre, plus les infobulles au survol, le clic droit qui ouvre la même barre et les raccourcis clavier. **Pas de radial** | SeniorDev | Un seul modèle d'interaction à apprendre et à tester ; le radial tombe sur les voisins dans une carte dense |
| D7 | Ton de la guerre (R25-Q8 → Q7) | **Choix, jamais poussée.** Conséquences visibles (frontières repeintes, camps de garnison), pas de sang, blessés qui rentrent, commerce et espionnage aussi beaux que la guerre, le conseiller ne propose jamais d'attaquer | SeniorDev | Fidèle à Evolve sans en faire la boucle principale |
| D8 | Navigateurs (R24-Q1) | **Trois moteurs pris en charge** : Brave (Chromium) et Fennec (Gecko) sur le téléphone, Qt WebEngine (Chromium) dans Anki. Le pilote « software » d'Anki est le **plancher** ; Brave est la référence de fluidité sur téléphone ; Fennec vise au moins 45 i/s | SeniorDev | Le produit est l'add-on bureau ; le téléphone de Mathéo a les deux navigateurs |
| D9 | La carte est-elle l'écran principal ? (R24-Q2) | **Oui**, en plein écran sous le HUD. Elle se met en pause sous un panneau plein écran | SeniorDev (cohérent avec R25) | C'est le cœur de la vision |
| D10 | Surface des nations (R24-Q3) | **Surface ∝ `eco`**, densité des garnisons et fortifications ∝ `mil` | SeniorDev | `mil` ne bouge que par sabotage (`main.js:10579`) : un pays qui rétrécit parce qu'on a saboté son armée serait absurde |
| D11 | La planète survit-elle au MAD ? (R24-Q4) | **Oui, avec cicatrices.** MAD garde biome, `ptrait`, géologie et orbite (`resets.js:20-23, 75-78`) | SeniorDev | Mémoire de la planète, et les ruines comblent les premières ères |
| D12 | Écho au sol des bâtiments spatiaux (R24-Q5) | **Oui** (pas de tir, stations au sol, `mass_driver`) | SeniorDev | Sinon la planète se fige quand le jeu s'emballe |
| D13 | True Path `gov3`/`gov4`, scénarios sans voisins (R24-Q6) | Le modèle prend en charge **5 rivaux**. `gov3`/`gov4` : sur un second continent outre-mer, révélés par l'exploration et les espions. `cataclysm` / `isolation` : pas de rivaux sur la carte, planète marquée selon le scénario. Rendu détaillé en J10 | SeniorDev | Le modèle est prêt, sans dépenser d'art trop tôt |
| D14 | Autres espèces (R24-Q7) | **Hors périmètre** (le fork force l'humain). Un simple « accent par espèce » est prévu dans les données | SeniorDev | Rien ne l'exige aujourd'hui |
| D15 | Option « planète plus petite » (R24-Q8) | **Non.** `W` reste un paramètre (plus petit dans les tests). Les machines faibles sont servies par le réglage Auto/Économie/Max, qui agit sur les caches et les effets | SeniorDev | Le coût par image dépend de l'écran, pas de la taille du monde |
| D16 | Figer la graine (R24-Q9) | **Oui**, 4 octets au journal, mais **dérivée des champs de planète** (pas des noms des nations) pour pouvoir la reconstruire | SeniorDev | Les noms changent au MAD ; la planète, non |
| D17 | Routes par `tech.transport` (R24 §5.6) | **Non** : une règle « classe de route » tirée de techs qui existent pour tous ; `tech.transport` seulement si `race.gravity_well` | SeniorDev | Erreur factuelle du R24 (§1.1) |
| D18 | Rangement du code | `core/`, `map/`, `ui/` à la racine (ajoutés à `GAME_DIRS` de `build_addon.py`) ; tests dans `test/` (hors paquet) ; `src/api.js`, `src/pv-hooks.js` | SeniorDev | Séparer l'art (`kit/`), le moteur de carte et l'interface ; les tests ne partent pas dans le `.ankiaddon` |
| D19 | Cuisson | **CPU (`Pix` → `putImageData`)** pour les morceaux, `drawImage` pour la composition ; Worker seulement si J0 le demande | SeniorDev | Pixels identiques partout, images de référence testables dans Node |
| D20 | Journal | Dans `global.pv.world`, versionné ; **générateur figé par version** après la première diffusion publique | SeniorDev | `save` sérialise `global` en entier (`vars.js:2271`) et `clearStates` ne touche pas les clés inconnues (`vars.js:2337-2350`) |
| D21 | Modifications du kit | **Aucune par ce chantier** ; tout passe par Claude Design ou `kit-patches/` | SeniorDev | Un export de Claude Design écrase `kit/` (`METHODE-SPRITES.md`) |
| D22 | Portrait | **Jouable de bout en bout** (J13), paysage d'abord | SeniorDev (meilleure UX, coût environ 8 tâches) | Sur téléphone, on sort d'AnkiDroid en portrait |
| D23 | Vide des premières ères | **Carte qui se dévoile** (terra incognita), plus les fumées et lumières des rivaux dès J3 | SeniorDev (coût environ 4 tâches) | Première impression de la planète |
| D24 | Rejeu de séance et rétrospective | **Un seul moment héros** : le rejeu du R25 §6.2 **est** la rétrospective du R24 §7.4 | SeniorDev | Deux cinématiques au même instant se marcheraient dessus |
| D25 | Pause d'Evolve (inventaire n° 33) | **Retirée de l'interface** : l'horloge à cartes arrête déjà le temps. L'état interne n'est pas touché | SeniorDev | Rien à gagner, un bouton de moins |
| D26 | Œufs de Pâques et bonbons d'Halloween d'Evolve (DOM) | **Recréés sur la carte** (objets cachés à toucher) au lieu d'être perdus | SeniorDev (coût 1 à 2 tâches) | Ils disparaîtraient avec le DOM classique |
| D27 | Commentaires du code | Anglais dans le code (dépôt public, amont anglais) ; rapports en français | SeniorDev | Cohérence avec Evolve et le kit |
| D28 | Écran d'ère 0 | Écran « Cellule » dédié qui réutilise `kit/evolution.js` (R25 §10) | SeniorDev | Le kit l'a déjà dessiné |
| D29 | Pastille Anki, conseiller, objectifs | Adoptés tels que dans le R25 (§1.3, §4.2, §6.4) | SeniorDev | Rien à redire |

### 0.3 Ce qui demande vraiment Mathéo
1. **Valider une fois la liste des changements dans `src/`** (§2.10) : deux fichiers neufs, une dizaine d'`export`, le frein de
   `updateDebugData`, la ligne de la file dès le départ (D5), et les gardes « sans interface » de J12. Tout autre changement de `src/` revient
   vers lui.
2. **Les choix de goût artistique** : la planche des 20 planètes (J3), chaque brief pour Claude Design **avant envoi**, l'acceptation de
   chaque livraison, le matériau d'interface par ère.
3. **Les tests dans Anki bureau** sur son PC et son vrai profil (règle du HANDOFF), en pilote « software » puis GPU, à J0, J3, J9 et J12.
4. **Tout ce qui est publié** : commit, poussée sur le dépôt public, artifact.
5. **Un no-go en J0** qui dégraderait l'expérience sur bureau (par exemple perdre un niveau de zoom).
6. **La date de retrait de l'échafaudage classique** (J12), après deux semaines de jeu réel sans jamais l'ouvrir.

---

## 1. Verdict sur les rapports 24 et 25 (vérifiés dans le code)

### 1.1 Rapport 24 (carte)

**Accepté tel quel** : cuire puis composer avec `drawImage` ; repère cisaillé `(q, r) = (x, x + y)` avec enroulement est-ouest (calcul refait :
`x − y = 2q − r`, les quatre voisins `(q±1, r±1)` et `(q, r±1)` sont justes) ; `W = 128`, `H = 256` ; pyramide de 5 paliers ; zoom fluide
avec retour sur un palier net ; croissance par **ordre d'urbanisation précalculé** (monotone par construction) ; deux couches (bâtiments
comptés et tissu) ; micro-journal ; surface des nations ∝ `eco` ; Canvas 2D d'abord derrière une interface ; ne jamais lire l'état à chaque
image ; rien calculer onglet caché ; spike en premier.

**Références vérifiées et exactes** [code] : `spritekit.js:335` (`worldPt`), `338-356` (`layout`), `542-544` (`WK`), `554-563` (Pointer Events),
`574-604` et `665-672` (`compose`, `villageFrame`) ; `village.js:53-82` (slots), `83` (`visN`), `85-88` (`keepOld`), `169-178` (`building`,
plafond 4 000, éviction FIFO), `365` (pas de 125 ms), `381-382` (`splice`), `502-541` (`DEPTH`, `blitD`), `504-512` (Bayer) ; `era3.js:40-43`
(`ZONE`, `LOTS`) ; `vars.js:2352-2384` (création de `gov0-2`), `vars.js:69-78` (`seededRandom`, graine qui avance) ; `civics.js:1548-1558`
(`war_campaign` désoccupe et rend les drapeaux) ; `civics.js:1922-1928` (occupation après siège) ; `tech.js:15655-15675` (`uniteEffect` pose
`world_control = 1` et efface `occ`, `anx`, `buy`, `sab`, `act`).

**Erreurs et trous trouvés** :

| # | Ce que dit le R24 | Ce que montre le code | Conséquence pour le plan |
|---|---|---|---|
| E1 | « `tech.transport` tombe parfaitement », table des routes par niveau | **Les cinq techs de transport portent `trait: ['gravity_well']`** (`tech.js:147, 172, 192, 212, 232`) et `checkTechQualifications` refuse toute tech dont le trait manque (`actions.js:5930-5935`). Pour un humain normal, `tech.transport` reste **indéfini toute la partie** | Une **règle de classe de route** tirée de `trade`, `high_tech` et `freight` (§3.6). `transport` seulement pour `gravity_well` (D17) |
| E2 | « environ 8 recompositions par seconde » ; « les bâtiments animés (`DYN`) ne sont pas cuits » | **12 recompositions/s** [mesuré : 120 `putImageData` en 10 s]. **Le calque statique est recuit 94 fois en 10 s**, parce que la `signature()` contient l'image d'animation (`af`) de chaque bâtiment animé et la transition de palier (`village.js:417-421`). Par exemple la scierie change d'image toutes les 125 ms (`village_b3.js:557`). Dans le code actuel, les bâtiments animés **sont** recuits avec tout le calque | Dans la carte, les bâtiments animés sortent des morceaux : sprites par image, dessinés à chaque image, puis **ré-occultés** (§2.4) |
| E3 | Le cache de variantes « explosera » | Exact, mais le vrai trou est ailleurs : **`ATLAS` n'est jamais vidé**. `building()` y écrit à chaque échec de cache (`village.js:176`), `sprite()` et `shell()` aussi (`spritekit.js:91, 110, 305`). Mesuré : **595 entrées, 6 Mo pour 64 bâtiments** | La carte n'appelle jamais `VL.building()` : elle appelle les compositeurs directement et range ses sprites dans ses propres **pages d'atlas** avec un plafond (§2.8) |
| E4 | Morceaux de 512 × 256 « plus 96 px de débord en haut » | La règle du même rapport (« dessiner tout objet dont la boîte coupe le rectangle ») **rend le débord inutile** | Morceaux de **512 × 256 exactement** : 512 Ko en L0 au lieu de 720 Ko, **32 Mo** pour toute la planète en L0 |
| E5 | Paliers nets L0 ×4, ×3, ×2 | Les citoyens sont en **demi-pixels d'art** (`WK = 2`, `spritekit.js:542-544`) ; à ×3 un demi-pixel fait 1,5 pixel écran, irrégulier. Le méga-sprite du village (`V.off`, déjà ×2) se voit mal à ×3 | **Échelles L0 paires** (×2, ×4, ×6 sur grand DPR) dès que des citoyens sont visibles (§2.5) |
| E6 | Déterminisme par PRNG à graine | Insuffisant : **`Math.sin`, `cos`, `exp`, `pow`, `hypot` ne sont pas garantis identiques entre V8 et SpiderMonkey**, et la sauvegarde passe du téléphone (Fennec ou Brave) à Anki (Qt). La loi logistique proposée utilise `exp`, le bruit sur la sphère `cos`/`sin` | **Règles de déterminisme** (§3.7) : table de sinus entière, fonctions rationnelles, test d'empreinte sur les trois moteurs |
| E7 | Ajouter les canaux `TEAM` et `GLOW` dans `spritekit.js:82-88` | Le kit est **livré par Claude Design** ; un export écrase les retouches locales (`METHODE-SPRITES.md`, « intégrer ») | Brief à Claude Design (B7) ou patch dans `kit-patches/` (D21) |
| E8 | Graine = `hash(…, noms de gov0-2, …)` | Les noms sont tirés à chaque civilisation (`actions.js:8700-8717`) : **ils changent au MAD**, alors que la planète doit survivre (D11) | Graine tirée des seuls champs de planète (§3.5) |
| E9 | Où ranger le journal | Non dit | `global.pv.world` (D20) ; test de survie à chaque type de reset |
| E10 | Lire l'état Evolve à 1 Hz | Ce qu'on lit est un **clone profond refait à chaque `fastLoop`** (`main.js:8108-8112`, `debug.js:41-46`) ; le R25 l'a vu (R7) | Instantané tiré de l'état **vivant** par `src/api.js` ; clone freiné (§2.3) |
| E11 | Océan en motif sous des morceaux de terre transparents | Sur Qt « software », un mélange alpha plein écran à chaque image coûte plus qu'une copie opaque [avis] | J0 mesure les deux : motif + transparence **contre** morceaux opaques + vagues en sprites (§4.2) |
| E12 | « 55 i/s sur le téléphone de Mathéo » | Ce téléphone est un **haut de milieu de gamme** (Snapdragon 7+ Gen 3) ; il ne garantit rien pour un téléphone modeste | Ajout d'une passe avec **CPU bridé ×4** (CDP) dans J0 |
| E13 | Tests Gecko | Fennec **n'a pas de socket DevTools** (`tools/phone-test/README.md`) | Le banc de mesure se rapporte lui-même : il envoie ses résultats à un petit serveur local (§5.5) |
| E14 | Génération : budget 300 ms | Prototype brut : **85 à 99 ms dans Node sur ce téléphone** [mesuré] (bruit 3D ≈ 28 ms, Priority-Flood ≈ 43-54 ms avec un tas naïf, écoulement ≈ 8 ms, 24 Dijkstra ≈ 4 ms) | Budget tenu avec de la marge (V8) ; Gecko à mesurer en J3 |
| E15 | Hauteur de la bande | `8H = 2048`, mais le losange de la dernière rangée descend à 2056 | La bande est rognée à 2048 sous la banquise : L0 = 8 × 8 morceaux exactement |
| E16 | Règle d'appartenance à écrire | Elle **existe déjà**, exportée : `checkControlling(gov)` (`civics.js:796-799`). `world_control` est aussi posé ailleurs (`portal.js:8618`, `races.js:7194`) | `api.js` expose `controlling(i)` ; on ne réécrit jamais une règle d'Evolve |
| E17 | Brouillard : espions 1 = hostilité, 2 = armée, 3 = économie, 4 = troubles | Presque : **≥ 1** hostilité chiffrée, **≥ 2** armée chiffrée **et** troubles en mots, **≥ 3** économie chiffrée, **≥ 4** troubles chiffrés (`civics.js:510-513`) | Table du brouillard corrigée (§3.4) |

### 1.2 Rapport 25 (interface)

**Accepté** : nouvelle couche plutôt que reskin ; HUD en DOM et carte en Canvas ; hiérarchie par fréquence ; tiroirs latéraux en paysage,
feuilles du bas seulement en portrait ; barre contextuelle ; conseiller ; « fini pour aujourd'hui » ; pas de mécanique de rétention ;
révélation progressive par les drapeaux `display` d'Evolve ; `src/api.js` qui appelle les fonctions d'Evolve au lieu de les recopier.

**Ajustements imposés par les décisions de Mathéo** :
- **« Interface classique » permanente (R25 §1.3 n° 6, §7.2 étape 3, §13.2 Q7)** : abandonnée (D2). Le « renvoi contextuel vers l'interface
  classique » n'existe qu'en mode développeur, comme échafaudage. Les joueurs ne le voient jamais.
- **Français** : tous les exemples du R25 sont en français ; l'interface sera en anglais (D1). Le formatage des nombres ne passe plus par
  `toLocaleString(undefined)` (qui donnerait `1,2k` sur un téléphone français) mais par un format anglais fixe.

**Vérifications** [code] : `runAction` n'est pas exporté (`actions.js:6496`), ni `checkTechPath` (`5872`), ni `checkOldTech` (`5961`), ni
`war_campaign` (`civics.js:1548`) ; `actionDesc` **l'est** (`actions.js:7262`), ce qui permet de réutiliser les infobulles exactes d'Evolve ;
`checkAffordable` (`7576`), `adjustCosts` (`functions.js:1786`), `timeCheck` (`938`), `sizeApproximation` (`vars.js:2107`) sont exportés ;
`updateDebugData` clone `global` à chaque `fastLoop` (`main.js:8108-8112`) ; `messageQueue` écrit dans `#msgQueueLog` **et** dans
`message_logs` et `global.lastMsg` (`functions.js:391-425`), donc le journal reste lisible sans DOM.

**Ce que le R25 n'a pas vu, et qui sert ce plan** :
- **Le vrai moteur tourne déjà dans Node sans navigateur.** `tools/budget/load-game.js` charge `src/` avec un faux jQuery qui absorbe tout
  appel, et `anki/engine.test.js` y fait tourner `fastLoop`, `midLoop` et `longLoop`. C'est une preuve forte que **la logique tourne sans DOM**,
  et la base de tous les tests d'`api.js` (§5.1).
- **jQuery fait aussi partie de la logique**, pas seulement de l'affichage : 718 `$(` dans `tech.js`, surtout `payCosts($(this)[0])`.
  jQuery (local, dans `lib/`) reste donc chargé pour toujours ; « retirer l'interface classique » veut dire retirer le **DOM rendu**, pas
  jQuery. Le faux jQuery du banc Node doit apprendre que `$(objet)[0] === objet`.
- **Les méthodes Vue enfermées** (métiers, artisanat, marché…) peuvent être **capturées** dans le banc Node en remplaçant le constructeur
  `Vue` : on récupère l'objet `methods` passé à `vBind` et on compare nos réécritures à l'original, sur le même état (§5.1).
- **`anki-bridge.js` lit `window.evolve.global`** (`anki-bridge.js:24`) : il dépend du clone et devra passer par `api.js` avant J12.
- **Le rattrapage de l'horloge à cartes** joue jusqu'à `drain` ticks par tick réel (`src/anki.js`), plus un clone profond par tick : des
  à-coups pendant le rejeu sont probables. À mesurer en J0, à régler dans `src/anki.js` (fichier du fork).

### 1.3 Ce que coûte le moteur actuel [mesuré, Node 24 sur le téléphone, faux canvas]
Village d'ère 3 de `tools/render-era3.js` (64 bâtiments placés) :

| Mesure | Valeur |
|---|---|
| Première image (caches froids) | 435 ms |
| 600 images à 60 Hz : moyenne / médiane / p95 / max (JS seul) | 1,75 / 0,08 / 9,55 / 11,96 ms |
| Recompositions (`putImageData` de 1 664 × 1 200) | 12 par seconde |
| Recuissons du calque statique | 94 en 10 s |
| `compose` avec / sans recuisson du statique | 9,2 / 3,6 ms |
| Agrandissement ×2 en JS (`up`) | 2,3 ms |
| `ATLAS` | 595 entrées, 6,0 Mo, jamais vidé |
| Compositeur de maison / d'usine, cache froid | 0,26 / 0,53 ms |

Hors JS, le navigateur ajoute un `putImageData` de 2 Mpx 12 fois par seconde et un `drawImage` plein cadre **à chaque** image (`present()`
redessine même si rien n'a changé, et `pointermove` l'appelle de façon synchrone, `spritekit.js:555`). Conclusion : correct pour 832 × 600,
impossible à l'échelle d'une planète. Le R24 a raison sur le fond.

---

## 2. Architecture cible

### 2.1 Les dossiers et leurs responsabilités

```
evolve-pixel-village/
  src/                 moteur Evolve (logique). On n'y ajoute que :
    api.js             [neuf] window.EvolveAPI : état vivant, actions, prédicats, coûts, réécritures des gestes Vue
    pv-hooks.js        [neuf] émetteur d'événements du moteur (campagne, événements, rejeu)
  kit/                 art (livré par Claude Design) : Pix, palette, pièces, compositeurs, ères, citoyens. INTOUCHÉ
  core/                [neuf] commun à la carte et à l'interface
  map/                 [neuf] la planète : modèle, croissance, cuisson, rendu, caméra, saisie, picking
  ui/                  [neuf] HUD, tiroirs, panneaux, sons, conseiller, onboarding (DOM)
  pv-boot.js           [neuf] chargeur unique (remplace anki-village.js en J12) : kit, core, map, ui, drapeaux
  tools/map-bench/     [neuf] banc de mesure J0 (page + serveur de résultats)
  tools/…              outils neufs : inspecteur, curseur de progression, fabricant de sauvegardes, couverture
  test/                [neuf] tests Node (hors paquet) : test/core, test/map, test/ui, test/api, test/golden
```

`tools/addon/build_addon.py` parcourt ses `GAME_DIRS` récursivement (`build_addon.py:23-36`) : il suffira d'y ajouter `core`, `map`, `ui`
et `pv-boot.js`. Les tests vivent dans `test/` parce qu'un `*.test.js` placé dans un dossier empaqueté partirait dans le `.ankiaddon`.

Format des modules : **scripts classiques en IIFE** qui s'accrochent à `window.PV` (`PV.core`, `PV.map`, `PV.ui`), comme le kit. Ils se
chargent dans Node par `vm` avec un faux `window`, comme `tools/render-era3.js`. Les modules **purs** (coords, planète, croissance, routes,
nations, journal, plan) ne touchent ni au DOM ni au canvas : ils sont testables seuls et pourront passer dans un Worker sans réécriture.
Pas d'ES modules ici, parce que le kit et le chargement par balises `<script>` d'Anki fonctionnent déjà ainsi.

### 2.2 Schéma des modules

```
                        +-------------------------------- Evolve (src/, inchangé sauf api.js / pv-hooks.js) -----------------+
                        |  global (état vivant)   runAction  actions.*  checkAffordable  timeCheck  actionDesc  message_logs  |
                        |  fastLoop/midLoop/longLoop (minuteur du Worker evolve/evolve.js)     src/anki.js (horloge à cartes)  |
                        +------------------^------------------------------+--------------------------------------------------+
                                           | appels                       | lecture (référence vivante)
                                 +---------+----------+          +--------v---------+
                                 |   src/api.js       |          |  src/pv-hooks.js | --- événements moteur ---+
                                 |  EvolveAPI.act()   |          |  (campaign, raid,|                          |
                                 |  .jobs .power ...  |          |   siege, reset)  |                          |
                                 +---------^----------+          +------------------+                          |
                                           |                                                                   v
  +----------------------------------------|---------------- core/ -----------------------------------------------------+
  |  snapshot.js  (1 Hz + après chaque action/rejeu)  ---> Snap (compact)  ---> bus.js ('snap','built','msg','era'...)  |
  |  sched.js (seul propriétaire de requestAnimationFrame : 2 horloges, budgets, file de cuisson)   store.js (global.pv) |
  |  strings-en.js + t()     format.js (anglais)     rng.js / dmath.js (déterministes)     perf.js (temps d'image)     |
  +--------------+-------------------------------------------------+------------------------------------------------------+
                 | Snap, temps                                      | Snap, état vivant (VM 4 Hz)
   +-------------v----------------------- map/ ------------------+  +-v-------------------------- ui/ -------------------------+
   | MODÈLE (pur)                                                |  | layout.js (dispositions, --u, marges sûres)             |
   |  planet.js  -> Planet (typed arrays, dérivé de la graine)   |  | hud.js  drawer.js  panel.js  contextbar.js  toast.js     |
   |  journal.js -> J (global.pv.world)                          |  | panels/ build research people resource economy power ... |
   |  growth.js  counted.js  roads.js  nations.js                |  | advisor.js  objectives.js  replay.js  sound.js           |
   |  plan.js    -> WorldPlan + diff -> tuiles sales            |  | onboarding.js  coverage.js                               |
   | ART                                                         |  +----^-------------------------+--------------------------+
   |  art/terrain art/pool (variantes, atlas) art/reduce (L0->L1) |      | événements carte             | appels du contrat
   |  art/l2 art/l34 (générés)   -> appellent kit/ (composeurs)  |      | tap/longpress/camera/select  | pick focus ghost
   | RENDU                                                       |      |                              | highlight toScreen fx
   |  bake.js -> chunks.js (LRU par palier, double tampon)       |      |                              | replay pause setViewportInsets
   |  compositor.js -> render2d.js (interface Renderer)          |  +---+------------------------------v---------------------+
   |  actors.js  fx.js  capital.js (méga-sprite du village)      |  |                 map/api.js  =  PV.map                    |
   | ENTRÉES                                                     |  +----------------------------------------------------------+
   |  camera.js  input.js  pick.js                               |
   +------------------------------------+------------------------+
                                        | drawImage (Canvas 2D ; WebGL2 plus tard)
                                        v
                           <canvas id="pv-map"> plein écran  +  <div id="pv-hud"> DOM par-dessus
```

### 2.3 Le flux des données

```
Evolve global (vivant) ──1 Hz, ou après act()/fin de rejeu──> snapshot.js : Snap = { counts{type:n}, techs{clé:niv}, foreign[5],
    calendar, species, stats{mad,bioseed,…}, anki{chaleur, chênes, jours}, display{…}, P } + signature (hash)
        │ signature inchangée → on s'arrête là (coût < 0,1 ms)
        v
map/plan.js : WorldPlan = f(Planet, Journal, Snap)   ── diff avec le plan précédent ──> tuiles sales ──> morceaux sales par palier
        │                                                                                  │
        │ (journal.js écrit les décisions dues : villes fondées, déverrouillages, maxima)  v
        v                                                                       file de cuisson (sched.js, priorités P0-P4)
UI : modèle de vue à 4 Hz lu sur l'état VIVANT (EvolveAPI.state())                         │ tranches de 2-6 ms
     → comparaison de primitives → écritures DOM minimales                                 v
                                                                               bake.js : Pix (CPU) → putImageData → canvas du morceau
                                                                                           │ (l'ancien reste affiché jusqu'au remplacement)
                                                                                           v
                     image (60 Hz si mouvement, 8 Hz au repos, 0 onglet caché) : compositor.js
                     océan → morceaux du palier (+ fondu) → couche dynamique (animés, acteurs, particules) → ré-occultation
                     → surimpressions (sélection, fantôme, frontières, brouillard, étiquettes) → effets → écran
```

Règles :
- **Personne ne lit l'état d'Evolve à chaque image.** La carte ne lit que le `Snap` ; l'interface lit l'état vivant à 4 Hz au plus.
- **Le clone profond est freiné.** `updateDebugData` passe à 1 Hz, ou seulement à la demande en mode développeur (deux lignes dans
  `main.js`, §2.10). En J1, le kit legacy et `anki-bridge.js` lisent par `EvolveAPI.state()`.
- **Onglet caché : rien.** Au retour (`visibilitychange`), un instantané, un plan, puis le rejeu présente la différence (D24).

### 2.4 L'interface de rendu (Canvas 2D maintenant, WebGL2 plus tard)

La cuisson produit des **tampons `Uint32Array`** indépendants du moteur de rendu. Le rendu ne voit que des « surfaces » :

```js
// map/render2d.js implémente ; map/renderGL.js pourra l'implémenter plus tard
Renderer = {
  init(canvas, { alpha: false }), resize(wDev, hDev, dpr), caps,          // caps = { kind: '2d'|'webgl2', software: bool, maxSurface }
  createSurface(w, h, { opaque }) -> Surface,  freeSurface(s),
  upload(s, u32, w, h, x = 0, y = 0),                                     // 2d : putImageData ; GL : texSubImage2D
  begin(clearRGB),
  drawSurface(s, sx, sy, sw, sh, dx, dy, dw, dh, alpha = 1),              // dx, dy entiers ; dw = sw × échelle entière
  drawPattern(id, dx, dy, dw, dh, ox, oy, scale),                         // océan (si la variante A gagne en J0)
  drawRects(list), drawPolyline(pts, style),                              // surimpressions : frontières, sélection
  end(), stats() -> { draws, surfaces, bytes }
};
```

Détails qui comptent :
- **`imageSmoothingEnabled = false` est réappliqué après chaque redimensionnement**, parce que changer `width`/`height` remet l'état du
  contexte à zéro (piège classique du flou). Coordonnées toujours entières. Tampon d'affichage à la taille exacte CSS × DPR (ou DPR plafonné,
  §4.2), pour que le CSS n'étire jamais.
- **Perte de contexte 2D** : Chromium peut jeter les canvas sous pression mémoire (événements `contextlost`/`contextrestored`). Le cache des
  morceaux l'écoute et recuit.
- **Atlas** : les petits sprites dessinés à chaque image (animés, acteurs, occulteurs, étiquettes) sont rangés dans des **pages de
  1 024 × 1 024**, pas un canvas par sprite (des milliers de petits canvas coûtent cher en mémoire GPU).
- **WebGL2** reste réservé au globe de l'ère spatiale, ou au cas où J0/J3 montreraient qu'on est limité par `drawImage` **hors pilote
  « software »** (en logiciel, WebGL passe par SwiftShader et devient lent). La cuisson ne change pas : elle produit les mêmes tampons.

### 2.5 La caméra, les entrées et le contrat avec l'interface

**État de caméra** (`map/camera.js`, pur) : centre `(cx, cy)` en pixels d'art L0 (cx modulo `32W`), échelle continue `s` = pixels écran par
pixel d'art L0. Le palier affiché est le plus fin `t` tel que `s · 2^t ≥ Amin`, avec `Amin = max(1, 0,66 · DPR)` (un pixel d'art ne descend
jamais sous 0,66 px CSS, R24 §3.3).

**Échelle nette au repos** : `s · 2^t` entier, et **pair en L0 dès que des citoyens sont visibles** (E5). Exemple de barreau, à figer en J0 :

| Écran | L0 | L1 | L2 | L3 | L4 |
|---|---|---|---|---|---|
| Téléphone DPR 3 (paysage 800 × 360 CSS) | s = 6, 4, 2 | a = 2 | a = 2 | a = 2 | a = 2 |
| Bureau DPR 1 (1 100 × 800) | s = 4, 2 | a = 2, 1 | a = 2, 1 | a = 2, 1 | a = 2 |

(`a` = pixels écran par pixel d'art du palier.) Pendant le geste, l'échelle est libre ; au relâcher, glissement de 150 à 250 ms vers le
barreau le plus proche. Fondu `globalAlpha` entre paliers dans une plage étroite, jamais au repos.

**Entrées** (`map/input.js`) : Pointer Events, plusieurs pointeurs, `touch-action: none` et `overscroll-behavior: none`. Glisser au-delà de
8 px ; appui long à 450 ms (seuils du R25 §7.6) ; inertie ; pincement autour du point milieu ; double tape = un palier ; molette = un palier
lissé, `ctrlKey` pour le pincement du pavé tactile. Le clavier appartient à l'UI, qui transmet flèches et `+`/`−` à la caméra. Les éléments du
HUD arrêtent la propagation : la carte ne reçoit que les gestes qui tombent sur elle.

**Picking** (`map/pick.js`) : écran → monde (caméra inverse, enroulement) → tuile `(q, r)` (calcul du losange) → candidats de l'index
spatial dont la boîte contient le point → test du **pixel du sprite** (alpha du `Pix`), du plus proche au plus lointain dans l'ordre de dessin.
Le premier touché gagne. Selon le palier : L0-L1 bâtiment ou groupe de citoyens ; L2 quartier ; L3 ville ; L4 nation.

**Contrat carte ↔ interface (rapport 25 §5.6, réconcilié)** :

| Côté carte (`PV.map`) | Rôle | Écart avec le R25 |
|---|---|---|
| `pick(clientX, clientY)` → `{kind, id, ref, tile:{q,r}, lod, screen:{x,y}}`, `kind` ∈ `building, district, city, nation, citizen, event, tile, none` | ce qu'il y a sous le doigt | `tile`, `lod` et `screen` en plus |
| `focus(cible, {zoom, offset, duration, ease})` → Promise | vol de caméra (van Wijk) ; `offset: 'safe'` centre dans la zone libre | identique |
| `ghost(type \| null, {region})` → `{q, r, visible}` | fantôme de la **prochaine** instance (slot `k = count`) | renvoie la position |
| `highlight(sélecteur, style)` → handle (`.clear()`) | producteurs, consommateurs, éteints, sélection, nouveau ; sélecteur = ids **ou** liste de types | requête par type en plus |
| `toScreen(cible)` → `{x, y, visible}` en px CSS | ancrage des icônes volantes | identique |
| `fx(nom, cible, opts)` | `pop`, `dust`, `coins`, `battle`, `border`, `chest`, `spark`, `firework` | identique |
| `on(évt, fn)` : `tap`, `longpress`, `camera` (limité à 10 Hz), `select`, `ready`, `lod` | événements | `zoom` → `camera` ; `select` en plus |
| `replay(snapAvant, snapAprès, {duration})` → Promise | partie carte du moment héros | **nouveau** |
| `pause()` / `resume()` | carte cachée par un panneau plein écran | **nouveau** |
| `setViewportInsets({top, right, bottom, left})` | zone libre (moins HUD et tiroir), poussée par l'UI à chaque changement de disposition | remplace `ui.safeRect()` lu par la carte |
| `snapshot()` → `{lod, center, scale, selected, visibleCities}` | état de vue pour l'UI | **nouveau** |

| Côté UI (`PV.ui`) | Rôle |
|---|---|
| `open(panneau, args)` | appelé par le **contrôleur d'interface**, jamais par la carte |
| `PV.prefs.reducedMotion` (lu dans `core/store.js`) | remplace `ui.reducedMotion()` : préférence partagée, pas un appel |

**Qui possède quoi.** La carte possède la caméra, le picking, le dessin et les effets dans le monde. L'interface possède le **sens** des
gestes (table du R25 §5.1), les panneaux, le clavier, les sons et les icônes qui volent par-dessus le HUD (dans un second canvas transparent).
Un tap passe ainsi : `input` → `pick` → `bus.emit('map:tap', hit)` → contrôleur UI → `ui.open(...)` et/ou `map.focus(...)`.

### 2.6 L'ordonnanceur et les budgets par image

`core/sched.js` est **le seul** à appeler `requestAnimationFrame`. Deux horloges : la caméra au rythme de l'écran, le monde à 8 Hz (le pas de
125 ms du kit). Caméra immobile et rien à animer : 8 images/s ; onglet caché : 0.

Budget visé sur le téléphone, image de 16,7 ms (le navigateur garde environ 4 ms pour composer) [estim., à confirmer en J0] :

| Poste | Caméra en mouvement | Caméra au repos | Pendant un rejeu |
|---|---|---|---|
| Entrées et caméra | 0,3 ms | — | — |
| Composition (≤ 500 `drawImage`) | ≤ 3 ms | ≤ 3 ms | ≤ 3 ms |
| Acteurs et particules (pas de 8 Hz amorti) | ≤ 1 ms | ≤ 1 ms | ≤ 1 ms |
| **Cuisson** (tranches) | **≤ 2 ms**, seulement P0 | ≤ 6 ms | ≤ 6 ms |
| Interface (modèle de vue 4 Hz, amorti) | ≤ 0,5 ms (≤ 2 ms par lecture) | idem | idem |
| Instantané + diff du plan (1 Hz, amorti) | ≤ 0,1 ms | idem | 1 lecture par 250 ms |
| Moteur Evolve (`fastLoop` toutes les 250 ms) | hors de notre main : à mesurer (J0-07) | | rattrapage : `drain` ticks |

**Priorités de cuisson** : **P0** morceau visible manquant au palier courant (on affiche le palier plus grossier en attendant ; L2 à L4 sont
toujours en mémoire, il n'y a donc jamais de trou) ; **P1** morceau visible périmé (l'ancien reste affiché) ; **P2** anneau d'anticipation
dans le sens du défilement ; **P3** palier plus fin de la vue courante (prépare le zoom avant) ; **P4** fond (remplir L1, chauffer les
réserves de variantes). Une cuisson est **découpée** par plages d'objets ; son tampon `Pix` vient d'une réserve de 3 tampons réutilisés
(zéro allocation) ; seul le `putImageData` final est indivisible (environ 0,5 à 1,5 ms [estim.]).

### 2.7 La mémoire

| Poste | Taille | Politique |
|---|---|---|
| Planète (tableaux typés, 32 768 tuiles) | ≈ 0,6 Mo | permanente |
| Plan (usage, densité, style, propriétaire, index d'objets) | ≈ 0,8 Mo | permanente |
| Morceaux L0 (512 × 256 × 4 = 512 Ko ; 64 pour la planète) | **≤ 20 Mo** téléphone (40 morceaux), ≤ 24 Mo bureau | LRU, jamais un morceau visible ; capacité = visibles max + anneau |
| Morceaux L1 (16) | 8 Mo | tous gardés |
| L2 (4), L3 (1), L4 (1, 256 × 128) | ≈ 2,7 Mo | tous gardés (L4 sert de mini-carte et de texture du globe) |
| Tampons de cuisson | 3 × 512 Ko | réserve fixe |
| Pages d'atlas (animés, acteurs, occulteurs, étiquettes, variantes) | ≤ 4 pages de 4 Mo = 16 Mo téléphone, 32 Mo bureau | LRU par page |
| Village legacy (jusqu'à son retrait en J5) | ≈ 26 Mo (`V.off` 8 Mo + `buf2` 8 Mo + statique + `ATLAS` ≥ 6 Mo) | à libérer dès le portage de la capitale |
| **Total visé** | **≤ 64 Mo** téléphone (plafond dur 80), ≤ 96 Mo Qt | `navigator.deviceMemory` (Chromium) ajuste les plafonds |

Combien de morceaux L0 sont visibles au pire : téléphone DPR 3 en paysage (2 400 × 1 080 px), L0 à s = 2 → 1 200 × 540 px d'art → 4 × 4
= 16 morceaux. Bureau 1 920 × 1 080 à s = 2 → 960 × 540 → 3 × 4 = 12 morceaux. Le LRU de 40 morceaux couvre visible + anneau + un fondu.

### 2.8 Ce qu'on réutilise du kit, ce qu'on récrit

| Élément du kit | Sort | Comment |
|---|---|---|
| `Pix`, `blit`, `fillPoly`, `line`, `selout`, `despike` | **réutilisés** | via `SpriteKit._` |
| Palette, rampes, `R()`, `shift()`, `sprite()` des pièces | **réutilisés** | les pièces restent bornées en nombre ; `ATLAS` reste le cache des pièces |
| `shell()` (boîtes iso) | **réutilisé** | art provisoire de J0 et du tissu générique L1-L2 |
| Compositeurs (`SK.COMPOSERS`, `village_b3/b4`, `era1-3`) | **réutilisés, appelés directement** | `COMPOSERS[type](type, tier, k, season, lvl, opts)` avec `k` = index de **réserve** (≥ 1000, hors des slots du 24 × 24) ; jamais `VL.building()`, qui remplit `ATLAS` sans fin |
| `variant()` et anti-clone | **remplacés** pour la carte | `map/art/pool.js` : 16 à 24 variantes par (type, palier, saison, lvl, ère de style), anti-clone de voisinage décidé dans l'ordre des slots |
| `DYN` (options d'animation) | **réutilisé** | lu à la cuisson des images d'animation, avec l'état vivant |
| Terrain `terrain()`, `layout()`, `hills()` | **récrit** pour la planète (`map/art/terrain.js`) avec les mêmes textures et rampes ; `layout()` est **tamponné** au site de la capitale | le terrain du kit est câblé sur 24 × 24 |
| `compose`, `present`, `up`, `DEPTH`, `IDS` | **remplacés** | cuisson en morceaux et compositeur ; occultation par ré-occultation, pas par tampon de profondeur |
| `citizens.js` | composition **réutilisée** (`SK.citizens.compose`, états, métiers) ; placement et dessin **récrits** dans `map/actors.js` | sprites composés → atlas → dessinés à demi-échelle, puis ré-occultés |
| `world.js` (décor, animaux, ciel, météo, effets de tap) | décor et animaux **réutilisés** comme générateurs de sprites ; météo **adaptée** (nuages et ombres en L2-L4, pluie et neige en L0) | |
| `ui.js` (police bitmap, 9-slice, coffre, flamme, ampoule) | **réutilisé** : étiquettes de carte en police bitmap, cadres 9-slice convertis en data URI pour le CSS (comme `anki-skin.js`), coffre et flamme en effets | |
| `evolution.js` (ère 0) | **réutilisé** tel quel dans l'écran Cellule (D28) | |
| `spritekit.js` `run()`, `anki-village.js` | **retirés** en J12 | remplacés par `pv-boot.js` |

### 2.9 L'interface (DOM)

- **Racine** `#pv-root` plein cadre : `<canvas id="pv-map">`, `<canvas id="pv-fly">` (icônes volantes au-dessus du HUD), `#pv-hud`,
  `#pv-drawers`, `#pv-toasts`, `#pv-modal`.
- **Pas de framework** (R25 §7.3) : `ui/dom.js` (créateur d'éléments, `setText` seulement si la chaîne change, `style.transform` pour les
  barres). Chaque widget a un **modèle de vue** calculé à 4 Hz à partir de l'état vivant, comparé au précédent valeur par valeur.
- **Dispositions** (`ui/layout.js`) : paysage compact (hauteur < 500 px), bureau (≥ 600 × 1 000), portrait. `--u` (taille d'un pixel du kit) :
  2 sur téléphone, 3 sur bureau. Marges sûres `env(safe-area-inset-*)`, `viewport-fit=cover` dans `index.html`. Chaque changement pousse
  `map.setViewportInsets()`.
- **Thème** (`ui/theme.js`) : jetons d'ère (`--frame`, `--paper`, `--ink`, `--accent`, `--ornament`), images 9-slice tirées des pièces du kit
  et converties en data URI au démarrage. Aucune image externe.
- **Polices** : `KitPixel` (TTF local, `evolve/kitpixel.ttf`) pour les titres et les chiffres, avec chiffres à chasse fixe ; `system-ui` pour
  les phrases. Rien de distant, rien de Google.
- **Chaînes anglaises** : voir §2.11.
- **Sons** (`ui/sound.js`) : une douzaine de sons synthétisés (oscillateurs, enveloppes, bruit), activés par défaut, volume bas, coupés sur
  `blur` et `visibilitychange` (on révise dans Anki pendant ce temps).
- **Accessibilité** : `aria-live` pour les toasts, focus géré dans les tiroirs, raccourcis clavier sur bureau, contraste vérifié pour chaque
  thème d'ère (≥ 4,5:1), « mouvements réduits » (par défaut si `prefers-reduced-motion`).

### 2.10 `src/api.js`, `src/pv-hooks.js` et la liste complète des changements dans `src/`

**`src/api.js`** (neuf ; il importe les modules MPL sans les modifier et pose `window.EvolveAPI`) :

| Groupe | Fonctions | Source dans Evolve |
|---|---|---|
| État | `state()` (référence vivante, lecture seule par discipline), `controlling(i)`, `breakdown(res)`, `labels.*` (titres via `actions…title()`, `global.resource[r].name`, `global.civic[j].name`) | `vars.js`, `civics.js:796-799` |
| Construire / rechercher | `act(region, type, n)` (boucle `runAction` n fois, **multiplicateur clavier neutralisé**), `queue.add/move/remove`, `rqueue.add/move/remove` | `actions.js:6496` (+ `export`), `6541-6590`, `buildQueue` (`functions.js:475`) |
| Prédicats | `visible.city()`, `visible.tech()`, `techState(k)` | `checkCityRequirements`, `checkTechQualifications`, `checkTechRequirements`, `checkTechPath` (+ `export`), `checkOldTech` (+ `export`) |
| Coûts | `cost(a)`, `afford(a)` (deux niveaux `cna`/`cnam`), `eta(a)` (secondes de jeu, converties en jours par `core/format.js`) | `adjustCosts`, `checkAffordable`, `timeCheck` |
| Descriptions | `describe(region, type)` → HTML d'Evolve | `actionDesc` dans un élément jQuery détaché, déplacé ensuite dans notre DOM |
| Gestes enfermés dans Vue (**réécrits** à l'identique, ligne d'origine en commentaire, test qui compare à l'original capturé) | `jobs.add/sub/setDefault`, `craftsmen.add/sub`, `craft(res, n)`, `power.on/off`, `grid.move`, `smelter.set`, `factory.set`, `market.buy/sell`, `routes.adjust`, `storage.crate/container`, `governor.*`, `government.set`, `garrison.tactic/raid`, `arpa.build`, `genetics.*`, panneaux spéciaux | `jobs.js:479-672`, `jobs.js:825`, `resources.js` (~916, ~1481-1573, 1839-1853, 2432), `actions.js` ~6385, `industry.js:183, 573, 1706`, `governor.js:788`, `civics.js:286`, `arpa.js` |
| Gestes déjà exportés | `civics(op, i)` (impôts, espions, mercenaires), `armyRating`, `battleAssessment`, `tradeBuyPrice/SellPrice`, `craftCost`, `setPlanet`, resets | `civics.js:1105`, … |
| Messages | `onMessage(fn)` : interroge la tête de `message_logs` (exporté) à 4 Hz et livre les nouveaux messages | `functions.js:391` |

**`src/pv-hooks.js`** (neuf) : `pvEmit(type, data)` vers `window.PVHooks` (file lue par `core/bus.js`). Il fournit :
- l'**enveloppe de campagne** : `war_campaign` est renommée `war_campaign_core`, et une fonction `war_campaign(gov)` de six lignes prend un
  instantané avant et après (garnison, blessés, `hstl`, drapeaux, ressources) puis émet `{type: 'campaign', gov, tactic, diff}`. On ne touche
  aucun des chemins internes (plusieurs `return`, `civics.js:1548-1558`) ;
- les enveloppes des effets `raid` et `siege` de `events.js`, posées **à l'exécution** depuis `api.js` si l'objet `events` est exportable
  (sinon un `export` de plus).

**Liste complète des changements dans `src/`**, à faire valider une fois par Mathéo (§0.3) :

| Fichier | Changement | Jalon |
|---|---|---|
| `src/api.js` | neuf | J1 → J11 |
| `src/pv-hooks.js` | neuf | J8 |
| `actions.js` | `export` devant `runAction`, `checkTechPath`, `checkOldTech` | J1-J2 |
| `civics.js` | renommage `war_campaign` → `war_campaign_core` + enveloppe importée de `pv-hooks.js` | J8 |
| `main.js` | `import './api.js'` ; `updateDebugData()` limité à 1 Hz ou au mode développeur (`main.js:8108-8112`) | J1 |
| `vars.js` | file de construction 1 place au premier village (D5), à côté du gène `queue` (`vars.js:2426-2429`) | J2 |
| `src/anki.js` | réglage du rattrapage (`drain`) pour lisser les images (fichier du fork) | J4 |
| `index.js` / `main.js` | gardes « sans interface » (3 à 5 lignes) qui empêchent de construire les onglets classiques | **J12** |
| `vars.js` | `global.settings.locale` forcé à `en-US` et réglage de langue caché (D1) | J9 |

Tous les changements portent le marqueur `[anki-fork]`, déjà en usage, pour que `grep -rn '\[anki-fork\]' src/` liste tout le fork.

### 2.11 Les chaînes anglaises

- **Nos chaînes** : un seul fichier, `core/strings-en.js`, table `clé → texte anglais` avec les mêmes paramètres `%0`, `%1` que `loc()`.
  Accès par `PV.t('build.title')`. Pas de machinerie de traduction : D1 dit « anglais toujours ». La clé centralise seulement le vocabulaire
  (un test vérifie que toute clé utilisée existe et signale les clés mortes).
- **Le contenu d'Evolve n'est jamais recopié** : noms et descriptions viennent de `loc()` (`strings/strings.json`, anglais par défaut), des
  `title()`, `desc()` et `effect()` des actions, de `global.resource[r].name`, `global.civic[j].name`, et de `actionDesc` pour les infobulles
  complètes. Recopier ferait diverger le texte à la première fusion avec l'amont.
- **Locale forcée** : `global.settings.locale = 'en-US'` au démarrage, réglage de langue caché. Les 12 autres fichiers de `strings/` peuvent
  sortir du paquet (le `.ankiaddon` maigrit).
- **Nombres** : `core/format.js` reprend la logique de suffixes de `sizeApproximation` (et le réglage `global.settings.affix`), mais formate
  toujours en anglais (`Intl.NumberFormat('en-US')`). Variante HUD : 4 caractères plus le suffixe (`999`, `1.2k`, `12.3k`, `123k`, `1.23M`).

---

## 3. Le modèle de données dans le code

### 3.1 Tuiles : repère, rangement, projection
- Index `i = r · W + q`, avec `q ∈ [0, W)` (cyclique) et `r ∈ [0, H)`. Toutes les tuiles d'une rangée existent : le rangement est un
  rectangle plein, sans trou.
- Coin nord du losange de la tuile `(q, r)` à l'écran (pixels d'art L0) : `sx = mod((2q − r) · 16, 32W)`, `sy = r · 8`. C'est **le même
  ancrage que `worldPt` du kit** (`spritekit.js:335`), donc `ox`/`oy` des compositeurs marchent sans conversion. Les rangées impaires sont
  décalées d'une demi-tuile (iso décalé).
- Voisins : 4-voisins `(q±1, r±1)`, `(q, r±1)` ; diagonales verticales à l'écran `(q±1, r±2)` ; horizontales `(q±1, r)`. Distance cyclique
  sur `q`.
- Bande visible : `4 096 × 2 048` px d'art en L0 (rognée sous la banquise, E15). Morceau L0 = 512 × 256 px = 16 colonnes `q` × 32 rangées `r`.

**Tableaux de la planète** (`map/planet.js`, dérivés de la graine, jamais sauvegardés) :

| Tableau | Type | Contenu |
|---|---|---|
| `elev` | `Int16Array` | altitude en décimètres virtuels (entier : aucune comparaison flottante dans les décisions) |
| `water` | `Uint8Array` | 0 terre, 1 lac, 2 côte, 3 plateau, 4 océan |
| `flow` | `Uint32Array` | accumulation d'écoulement |
| `down` | `Int32Array` | tuile aval (−1 = puits) |
| `biome` | `Uint8Array` | index dans les 12 biomes d'Evolve + glace et toundra |
| `land` | `Uint16Array` | identifiant de continent ou d'île |
| `seg` | `Uint8Array` | segment de déverrouillage (continent natal, outre-mer…) |
| `nation0` | `Uint8Array` | territoire de départ : 0 sauvage, 1 joueur, 2 à 6 = `gov0` à `gov4` |
| `geo` | `Uint8Array` | gisement (selon `city.geology`) |
| `sites` | `Int32Array` (index) + `Int32Array` (score) | sites de villes triés une fois pour toutes |

**Tableaux du plan** (`map/plan.js`, dérivés à chaque changement de `Snap`, en mémoire seulement) :

| Tableau | Type | Contenu |
|---|---|---|
| `owner` | `Uint8Array` | ville propriétaire (0 = aucune) |
| `claimP` | `Uint32Array` | valeur de `P` (virgule fixe) à laquelle la tuile a été urbanisée |
| `use` | `Uint8Array` | 0 rien, résidentiel, commerce, industrie, parc, civique, forêt de la mémoire, route… |
| `dens` | `Uint8Array` | densité 0-4 |
| `style` | `Uint8Array` | ère de style (index dans `J.eraP`) |
| `road` | `Uint8Array` | classe de route ou de rail (bits) |
| `objAt` | `Int32Array` | premier objet ancré sur la tuile (liste chaînée dans la table des objets) |
| `nation` | `Uint8Array` | nation courante (après occupation, annexion, unification) |

Table des **objets** (bâtiments comptés et gros objets de tissu) en structure de tableaux : `type`, `k`, `q`, `r`, `fw`, `fd`, `h`, `lvl`,
`variant`, `flags` (animé, patrimoine, en chantier). Ordre de dessin global = `(r + (fw + fd)/2, r − q, id)` : c'est la règle du kit
(`village.js` : `x + y + (fw+fd)/2`, puis `y`) transposée, et **un ordre total** (départage par `id`). Deux objets qui se chevauchent sont donc
dessinés dans le même ordre dans tous les morceaux : pas de couture.

### 3.2 Les villes
```js
City = { id, site, foundedP, cap, tau, order: Uint32Array /* tuiles par rang croissant */, nameSeed }
```
- `order` = Dijkstra depuis le centre, **coûts entiers** (pente × (1 + bruit entier), eau infranchissable, réduction le long des routes,
  noyaux secondaires à activation retardée), départage des égalités par index de tuile. Rayon borné (environ 3 000 tuiles).
- Taille : `s_i(P) = cap_i · u / (1 + u)` avec `u = ((P − P_i) / τ_i)²`, en arithmétique entière ou rationnelle : **pas d'`exp`** (E6).
  Croissante, bornée, inversible exactement par une racine carrée entière.
- **Propriétaire d'une tuile** = la ville qui l'a urbanisée **la première en P** : `argmin_i s_i⁻¹(rang_i(t))`. C'est indépendant de l'ordre
  des calculs, donc un grand saut ou une progression pas à pas donnent le même plan, et une tuile prise ne change jamais de ville. Mise à
  jour en O(changements) : on parcourt `order` de l'ancien `s_i` au nouveau.
- Densité par anneau de rang (R24 §2.3), ère de style par inversion de la loi de taille, patrimoine (environ 10 % du cœur par hachage),
  renouvellement tous les 4 niveaux de `high_tech`.

### 3.3 Les bâtiments comptés
- Pour chaque type, une **liste de slots fixe et ordonnée** à l'échelle de la planète : **d'abord les slots du 24 × 24 actuel** (le centre
  historique de la capitale, ramenés en coordonnées monde), puis les tuiles urbaines filtrées par la politique du type (table du R24 §5.5)
  et triées par rang. **Le slot k est pris par l'instance k**, comme aujourd'hui.
- Segments (outre-mer, terres annexées) : concaténation dans l'ordre de déverrouillage. Au déverrouillage, le journal note le compte de
  chaque type (quelques dizaines d'entiers).
- Liste épuisée : compression comme aujourd'hui (`lvl` 1 ou 2).
- Décroissance : les bâtiments comptés suivent **la vérité** (on retire les derniers slots), le tissu et les villes gardent **le maximum
  atteint**.

### 3.4 Les nations
```js
Nation = { id /* 1 joueur, 2..6 gov0..gov4 */, capital, quota /* ∝ eco */, color, pattern, accent }
```
- Territoire de départ par croissance de régions à quotas (Dijkstra multi-sources, coûts entiers du relief : les frontières suivent crêtes
  et rivières).
- Nation courante d'une tuile : celle de départ, sauf si `controlling(i)` est vrai (`world_control || occ || anx || buy`, exactement
  `checkControlling`, E16) ; alors elle passe au joueur. **Après l'unification, on ne lit plus les drapeaux.**
- Brouillard (E17) : 0 espion → frontière, silhouettes de villes, fumées ; ≥ 1 → hostilité chiffrée ; ≥ 2 → troupes et troubles en mots ;
  ≥ 3 → détail des villes (économie) ; ≥ 4 → troubles chiffrés (manifestations, incendies).
- Villes rivales : décoratives, croissance bornée au rythme de l'ère du joueur et de leur `eco`.

### 3.5 Le journal (sauvegardé, < 1 Ko)
Rangé dans `global.pv.world`. `global.pv` est l'espace du fork pour ce qui doit persister côté carte et interface : journal, épingles de
ressources, réglages (sons, mouvements, taille du texte), drapeaux d'onboarding.

```js
global.pv = {
  v: 1,
  world: {
    v: 1, gen: 1,                         // version du format / version du générateur
    seed: 0x3fa2c1d9,                     // u32
    born: { mad: 0, planet: 0 },          // compteurs vus à la naissance (détection des resets)
    eraP: [0, 1200, 4100],                // P (virgule fixe) au début de chaque ère
    cities: [[siteIdx, P], ...],          // villes fondées, dans l'ordre
    unlock: [[seg, P, [n_type0, ...]], ...],
    hw: [P, pop],                         // maxima atteints
    scars: [[kind, siteIdx], ...]         // cicatrices de MAD
  },
  prefs: { snd: 0.4, rm: 0, txt: 1, pins: [...] },
  seen: { hubBuild: 1, ... }              // bulles d'onboarding déjà montrées
}
```

- **Graine** : `hash(city.biome, city.ptrait, city.geology, city.calendar.orbit, nombre de resets qui changent de planète)`. Elle est
  reconstructible si le journal se perd, et inchangée au MAD (D11, D16).
- **Resets** : au chargement, `born` est comparé aux compteurs `global.stats` (`resets.js` : `mad`, `bioseed`, `cataclysm`, `blackhole`,
  `descend`, `terraform`, `aiappoc`, `matrix`, `retire`, `eden`…). MAD : même graine, `scars` + 1, villes, ères et maxima remis à zéro.
  Tout autre reset qui change de planète : nouveau journal. La table exacte de chaque reset est vérifiée dans `resets.js` par la tâche J3-07,
  avec un test par cas.
- **Versions et migration** : `journal.migrate(J)` fait passer `v` de n à n+1 ; un journal invalide ou d'une version inconnue est
  **reconstruit à partir de l'état courant** (le monde sera un peu différent, mais valide). Le champ `gen` fige l'algorithme de génération :
  avant la première diffusion publique, on peut le changer librement (les parties de test se régénèrent). Après, tout changement de sortie
  devient `gen + 1`, et les anciennes parties gardent l'ancien code ou migrent par **remappage des sites** (ville la plus proche du site
  d'origine).
- **Taille** : test qui borne le journal sérialisé et compressé (LZString) à 1 Ko avec 40 villes et 10 déverrouillages.

### 3.6 Routes et rails : la règle de classe (remplace `tech.transport`, E1)

| Classe | Réseau | Condition (cas général) | Cas `race.gravity_well` |
|---|---|---|---|
| 1 | sentiers | village commencé (`tech.primitive ≥ 3`) | `transport ≥ 1` |
| 2 | routes de terre entre villes | `tech.trade ≥ 1` (poste de commerce, ère civilisée, `tech.js:3477`) | `transport ≥ 2` |
| 3 | voies ferrées (capitale vers les N plus grandes villes) | `high_tech ≥ 3` (même seuil que le rail de l'ère 3, `era3.js` `railOn`) ; dépôt de fret si `tech.trade ≥ 3` (`freight`, `tech.js:3522`) | `transport ≥ 3` |
| 4 | routes goudronnées, autoroutes | `high_tech ≥ 4` (`electronics`) | `transport ≥ 4` |
| 5 | voies de lévitation | tech tardive à choisir en lisant `tech.js` (J10) | `transport ≥ 5` |
| mer | routes maritimes | `tech.wharf ≥ 1` (`tech.js:3547`) | idem |

Le réseau se dérive (A* dans l'ordre de fondation, coûts entiers, distance cyclique, réduction sur les routes existantes pour que les troncs
se partagent, ponts chers). Rien n'est stocké. Les seuils sont à confirmer en lisant `tech.js` dans la tâche J6-02.

### 3.7 Règles de déterminisme (testées automatiquement)
1. **Aucun `Math.random`, `Date`, `performance.now` ni `crypto`** dans `map/planet.js`, `growth.js`, `counted.js`, `roads.js`,
   `nations.js`, `journal.js`, `plan.js`. Un test de garde parcourt ces fichiers (§5.7).
2. **Arithmétique autorisée dans les décisions** : `+ − × ÷` sur entiers ou `Math.fround`, `Math.imul`, `Math.floor`, `Math.sqrt`
   (correctement arrondi par la norme IEEE). **Interdits** : `sin`, `cos`, `tan`, `exp`, `log`, `pow` non entier, `hypot`, `atan2`. Le bruit
   sur le cylindre utilise une **table de sinus entière** de 4 096 entrées, écrite en dur dans `core/dmath.js` et générée une fois par un
   script (pas calculée au chargement).
3. **PRNG** : `mulberry32` (déjà dans le kit) via `core/rng.js`, toujours semé par `hash(seed, domaine, indices…)`. Jamais un PRNG partagé
   dont l'ordre de tirage dépendrait de l'ordre des appels.
4. **Ordre d'itération** : tableaux et index entiers seulement ; tris avec comparateur **total** (départage par index) ; files de priorité
   avec départage par index ; `Map` et `Set` seulement dans l'ordre d'insertion d'une boucle déterministe.
5. **Empreinte** : `hashPlanet()` (FNV-1a sur les tableaux) et `hashPlan()`. Valeurs de référence dans `test/golden/hashes.json`, vérifiées
   dans Node (V8) **et** dans une page de test ouverte dans Fennec et dans Qt (§5.1).
6. **La cuisson est déterministe** elle aussi : mêmes entrées, mêmes pixels (pas d'`imageSmoothing`, pas de dégradés de canvas). C'est ce qui
   rend les images de référence possibles.

---

## 4. Les jalons

### 4.0 Vue d'ensemble

| Jalon | Nom | Reprend | Ce que le joueur gagne | Tâches [estim.] |
|---|---|---|---|---|
| **J0** | Mesurer avant de construire | R24 M0 + R25 P0 | rien (banc de mesure à part) : le verdict go/no-go | 11 |
| **J1** | Le pouce sur Construire | R25 P1 | HUD paysage, tiroir Construire, barre contextuelle, fantôme, sur le village actuel en plein écran | 15 |
| **J2** | Une séance complète | R25 P2 | Recherche, Peuple, fiche ressource, chantiers, conseiller, journal, écran Cellule | 16 |
| **J3** | La planète | R24 M1 + M2 | la planète entière, zoom continu jusqu'au citoyen de la capitale ; l'interface ne change pas | 19 |
| **J4** | Le retour de séance | R25 P3 + R24 §7.4 | le moment héros : rejeu, coffre, phare de la flamme, sons, effets | 10 |
| **J5** | Les villes poussent | R24 M3 + M4 | villes fondées, tissu urbain, 11 centrales en 11 endroits, carte qui se dévoile, forêts de la mémoire | 21 |
| **J6** | Routes, rails et commerce | R24 M5 + R25 P5 | routes, trains, navires, caravanes ; panneaux Économie et Énergie | 14 |
| **J7** | Les voisins | R24 M6 + R25 P4 (1) | nations, frontières, brouillard, fiches de nation ; panneaux Cité et Armée | 13 |
| **J8** | Guerre et diplomatie racontées | R24 M7 + R25 P4 (2) | campagnes animées, occupation, annexion, unification | 10 |
| **J9** | Tout le jeu sans l'interface classique (ères 0 à 5) | R25 P6 | ARPA, génome, prestige, choix de planète, réglages, sauvegarde, archives | 16 |
| **J10** | Les ères suivantes et la nuit (par vagues) | R24 M8 + R25 §9.4 | nouvelles ères, nuit, écuménopole, matériau d'interface par ère | ≈ 10 par ère |
| **J11** | L'espace | R24 « plus tard » + R25 P6 | globe, régions spatiales, panneaux tardifs : couverture à 100 % | 12 |
| **J12** | Détachement | décision D2 | interface classique retirée, page plus légère | 9 |
| **J13** | Finitions | R24 M9 + R25 P7 | portrait, bureau ancré, réglages de performance, carte postale, cicatrices de MAD, départ du bioseed | 12 |

**Ordre et parallélisme.** Deux pistes avancent ensemble dès J1 :

```
Piste INTERFACE  : J1 ── J2 ─────────── J4 ─── (panneaux de J6/J7/J8) ─── J9 ─── J11(UI) ─── J12 ─── J13
                    (sur le village legacy, via l'adaptateur du contrat)
Piste CARTE      : J0 ── modèle pur de J3 (Node) ── J3 rendu ── J5 ── J6 ── J7 ── J8 ── J10 (vagues) ── J11(globe)
Piste ART (CD)   :       B1 ── B2 ── B3 ──── B4 ── B5 ── B6 ── B7 ── B8 ── B9… (une vague par ère)
Piste OUTILS     : banc J0 ── banc Node du moteur ── inspecteur ── curseur de progression ── fabricant de sauvegardes ── page de couverture
```

- Les modules **purs** de la carte (planète, journal, croissance, routes, nations) se développent et se testent **dans Node** pendant que
  J1 et J2 sortent sur le village actuel. Ils ne dépendent que de J0 (coords, budgets).
- J3 **remplace** le canvas legacy par la planète derrière le même contrat : c'est le bénéfice de l'adaptateur J1-09.
- Chaque jalon de la piste carte apparie un sujet de carte et un panneau d'interface qui le met en valeur (routes ↔ commerce, nations ↔
  armée et cité). Les deux moitiés d'un jalon se font en parallèle.
- J10 (une vague par ère) commence dès que J5 est stable et se poursuit en parallèle de J11 à J13.

**Les drapeaux.** `PV.flags`, lus dans `global.pv.flags` puis dans l'URL (`?pv=ui:new,map:planet`) en développement :
`ui: 'new' | 'classic-dev'` (J1 → J12), `map: 'village' | 'planet'` (J3 → J5), `growth`, `roads`, `nations`, `war`, `night`, `globe` (un
par jalon de carte, retirés quand le jalon est stable). Les builds de Mathéo activent les drapeaux stables par défaut.

**Choix UX coûteux retenus** (principe directeur de Mathéo) :

| Choix | Pourquoi c'est mieux pour le joueur | Coût [estim.] |
|---|---|---|
| Échelles L0 paires et citoyens nets à toutes les échelles | pas de citoyens « baveux » | contrainte sur le barreau de zoom, 0 tâche de plus |
| Portage des citoyens vers la carte (pas seulement le méga-sprite) | la vie de la capitale à tous les zooms L0-L1, citoyens dans les autres villes | 3 tâches (J5) |
| Carte qui se dévoile (terra incognita) | les ères 1 et 2 ne paraissent plus vides | 4 tâches (J5) |
| Fumées et lumières des rivaux dès J3 | « on n'est pas seuls » dès le premier zoom arrière | 1 tâche |
| Fondu tramé de Bayer au changement d'ère et de saison | transition « pixel » plutôt qu'un fondu flou | 1 tâche (J10) |
| Portrait jouable de bout en bout | on sort d'AnkiDroid en portrait | 8 tâches (J13) |
| Œufs et bonbons d'Evolve recréés sur la carte | contenu saisonnier conservé | 2 tâches (J12) |
| Réécrire tous les panneaux tardifs (labo de mechas, chantier naval…) au lieu de les abandonner | couverture réelle de 100 % | 6 tâches (J11) |
| Sons synthétisés soignés (une douzaine) | retour sensible à chaque geste | 2 tâches (J4) |
| Vol de caméra de van Wijk au lieu d'une simple translation | on ne se perd jamais en allant voir un événement | 1 tâche |

---

### 4.1 J0 — Mesurer avant de construire (le spike de performance)

**Objectif.** Prouver, avec de l'art bidon, la partie la plus risquée : composer une planète cuite en morceaux, avec zoom fluide et cinq
paliers, à la bonne vitesse sur **Brave, Fennec et Qt WebEngine en pilote « software »**. Mesurer au passage ce que coûte le moteur Evolve
(clone profond, rattrapage). Figer les paramètres (taille des morceaux, variante d'océan, politique de DPR, barreau de zoom, cuisson CPU ou
`drawImage`).
**Jouable.** Le jeu ne change pas. Le spike vit dans `tools/map-bench/` et n'est pas chargé par `index.html`.
**Drapeau.** Aucun.
**Briefs Claude Design.** Aucun (art bidon : losanges colorés, `shell()` du kit).

| ID | Tâche | Fichiers | Dépend de | En parallèle avec |
|---|---|---|---|---|
| J0-01 | **Banc de mesure** : page `bench.html` qui lance des scénarios scriptés, relève le temps entre images (horodatages de `requestAnimationFrame`) et le temps JS par image (`performance.now()`), garde des tampons circulaires, affiche un tableau et un bouton « Copy », et **envoie le JSON** au serveur. `bench-server.js` : serveur statique sur le port 8766 seulement, `POST /bench` écrit `/data/data/com.termux/files/usr/tmp/pv-bench/<date>-<moteur>.json` | `tools/map-bench/bench.html`, `bench.js`, `bench-server.js` | — | J0-02, J0-07, J0-10 |
| J0-02 | **Coords + planète bidon** : `coords.js` définitif (index, enroulement, voisins, écran ↔ tuile, morceaux), tests ; planète de bruit simple (niveau de mer par centile, 4 couleurs de biome), 30 % des tuiles de terre portant un bâtiment `shell()` pour charger la cuisson | `map/coords.js`, `tools/map-bench/spike-world.js`, `test/map/coords.test.js` | — | J0-01 |
| J0-03 | **Cuisson du spike** : morceaux L0 à L4 en `Pix` → `putImageData`, ordre de dessin global, doublons d'enroulement, index par morceau, **découpage en tranches** avec réserve de tampons ; variante B de comparaison : cuisson par `drawImage` de sprites dans le canvas du morceau | `tools/map-bench/spike-bake.js` | J0-02 | J0-04 |
| J0-04 | **Compositeur + caméra du spike** : interface `Renderer` 2D, LRU des morceaux, choix du palier, fondu, retour au barreau net, inertie, pincement, molette, double tape ; **océan variante A** (motif + morceaux transparents) **et variante B** (morceaux opaques + vagues en sprites) ; DPR plein, plafonné à 2, plafonné à 1 | `tools/map-bench/spike-render.js` | J0-02 | J0-03 |
| J0-05 | **Couche dynamique du spike** : 100 sprites de la taille d'un citoyen à demi-échelle, 50 véhicules, 300 particules, ré-occultation ; **méga-sprite du village legacy** au site de la capitale (appel de `SpriteKit._.villageFrame` puis `drawImage(V.off)`) pour mesurer son coût sur place | `tools/map-bench/spike-dyn.js` | J0-04 | — |
| J0-06 | **Scénarios S1 à S7** (§4.2) écrits en script, schéma des résultats ; **lanceur CDP** pour Brave : port 8766 seulement, bridage CPU `Emulation.setCPUThrottlingRate` ×1 et ×4, capture d'écran | `tools/map-bench/scenarios.js`, `tools/phone-test/bench.js` | J0-01, J0-04 | — |
| J0-07 | **Coûts du moteur Evolve** : temps de `updateDebugData` (`main.js:8112`) et de `fastLoop`, au repos et pendant un rattrapage de l'horloge à cartes (réserve de 2 000 ticks), dans Brave par CDP et dans le banc Node ; vérifier qu'un appel direct `actions.city.basic_housing.action()` fonctionne (R25 P0). **Mesure seulement, aucun changement dans `src/`** | `tools/phone-test/evo-cost.js`, `tools/engine/cost.js` | — | toutes |
| J0-08 | **Banc Node du moteur** : `tools/budget/load-game.js` devient `tools/engine/harness.js` (l'ancien reste un alias) ; faux jQuery qui renvoie `[obj]` pour un objet simple ; **capture des options de `Vue`** (`methods`, `data`) passées à `vBind` ; `Math.random` remplaçable par un PRNG semé | `tools/engine/harness.js`, `test/api/harness.test.js` | — | toutes |
| J0-09 | **Campagne de mesures** : Brave (DPR plein / 2, CPU ×1 / ×4), Fennec (banc qui se rapporte seul), **Anki bureau par Mathéo** en pilote « software » puis GPU, fenêtre 1 100 × 800 puis maximisée. Le banc est ouvert depuis le menu de l'add-on (`index.html?bench=1`, une ligne dans `addon/__init__.py`) ; résultats par le bouton « Copy » | `addon/__init__.py` (entrée de menu), `tools/map-bench/ANKI-CHECKLIST.txt` | J0-01 à J0-06 | — |
| J0-10 | **Prototype de génération mesuré** : bruit 3D sur cylindre avec table de sinus entière, Priority-Flood avec tas typé, écoulement, 24 Dijkstra ; empreinte comparée entre Node, Brave, Fennec et Qt | `tools/map-bench/gen-proto.js`, `core/dmath.js` (brouillon) | J0-02 | J0-03 à J0-06 |
| J0-11 | **Verdict** : tableau des mesures et décision go/no-go, paramètres figés (taille des morceaux, variante d'océan, DPR, barreau, cuisson, budgets), échelons de repli appliqués s'il le faut | `rapports/27-mesures-j0.md` | J0-09, J0-10 | — |

### 4.2 J0 : ce qu'on mesure et les seuils de go/no-go

**Scénarios** (30 s chacun, monde 128 × 256 entièrement cuit sauf mention) :
- **S1** défilement en L0 à l'échelle la plus forte, en passant **trois fois par la couture** de l'enroulement ;
- **S2** défilement à chaque barreau net (L0 ×2, L1, L2, L3, L4) ;
- **S3** pincement continu de L0 à L4 et retour en 6 s, en boucle (fondus compris) ;
- **S4** jetés avec inertie ;
- **S5** caméra immobile 30 s (nombre d'images dessinées, CPU) puis onglet caché 30 s ;
- **S6** « tempête de cuisson » : tous les morceaux visibles invalidés (ce qui simule un rejeu) pendant un défilement en L0 ;
- **S7** démarrage à froid : génération + première vue entièrement cuite.

**Ce qu'on relève** : intervalle entre images (p50, p95, p99), temps JS par image hors cuisson (p95), nombre d'images > 50 ms et > 100 ms,
durée maximale d'une tranche de cuisson, durée totale de cuisson d'un morceau L0 (p50, p95) par chemin (CPU ou `drawImage`), mémoire des
canvas **comptée** par le cache (octets), tas JS (`performance.memory`, Chromium seulement) au début et après 5 min, temps du démarrage à froid,
images par seconde caméra immobile, coût du méga-sprite legacy (JS + `drawImage`), coût du clone profond et de `fastLoop` (J0-07).

**Seuils** (« ≤ 18 ms au p95 » veut dire environ 55 i/s ou plus sur 95 % des images) :

| Mesure | Brave tél. | Brave CPU ×4 | Fennec tél. | Anki « software » 1 100 × 800 | Anki GPU |
|---|---|---|---|---|---|
| S1, S2 : intervalle p95 / p99 | ≤ 18 / ≤ 33 ms | ≤ 33 / ≤ 50 | ≤ 22 / ≤ 40 | ≤ 33 / ≤ 50 | ≤ 18 / ≤ 33 |
| S3 pincement : p95 | ≤ 20 ms | ≤ 40 | ≤ 28 | ≤ 40 | ≤ 20 |
| JS par image hors cuisson, p95 | ≤ 4 ms | — | ≤ 6 | ≤ 8 | ≤ 4 |
| Images > 100 ms en 30 s | 0 | ≤ 1 | 0 | ≤ 1 | 0 |
| Tranche de cuisson la plus longue | ≤ 4 ms | ≤ 8 | ≤ 6 | ≤ 8 | ≤ 4 |
| Morceau L0 cuit, p95 (somme des tranches) | ≤ 15 ms | — | ≤ 25 | ≤ 25 | ≤ 15 |
| S6 : vue recuite en | ≤ 1,5 s | ≤ 4 s | ≤ 2,5 s | ≤ 3 s | ≤ 1,5 s |
| Mémoire canvas comptée | ≤ 48 Mo | — | ≤ 48 Mo | ≤ 96 Mo | ≤ 96 Mo |
| Tas JS après 5 min de défilement | ≤ +5 Mo | — | n/d | ≤ +5 Mo | ≤ +5 Mo |
| S7 démarrage à froid | ≤ 0,8 s | ≤ 2 s | ≤ 1,2 s | ≤ 1,5 s | ≤ 1 s |
| S5 caméra immobile / onglet caché | ≤ 8 images/s / 0 | | | | |

**Décision.**
- **Go** : tout est vert sur **Brave** et **Anki « software »**. Fennec peut dépasser de 30 % au plus, avec un plan de repli écrit.
- **Orange** : un seuil manqué de moins de 30 % → on applique les échelons de repli ci-dessous, on remesure, on décide.
- **No-go** : Anki « software » sous 20 i/s au p95, ou plantage mémoire du téléphone → échelons de repli ; si rien n'y fait, **Mathéo
  tranche** (§0.3 n° 5).

**Échelons de repli**, dans l'ordre, avec une mesure après chacun :
1. morceaux opaques (variante B de l'océan) ;
2. plus de fondu entre paliers pendant le geste (bascule nette au seuil) ;
3. tampon d'affichage plafonné : DPR 2 sur téléphone, 1 dans Qt ;
4. on retire la plus petite échelle L0 (on passe en L1 plus tôt) ;
5. cuisson dans un Worker (tampons `Uint32Array` transférés, pas besoin d'`OffscreenCanvas`) ;
6. morceaux de 1 024 × 512 (moins de `drawImage`) ;
7. moteur WebGL2 pour la composition, **sauf** en pilote « software » ;
8. Mathéo réduit le périmètre.

**Tests de J0.** `test/map/coords.test.js` (enroulement, voisins, aller-retour écran ↔ tuile sur les 32 768 tuiles, morceaux de la couture),
`test/api/harness.test.js` (le moteur démarre, `$(obj)[0] === obj`, capture de `Vue`), empreinte du prototype identique sur les quatre
moteurs. Total attendu : 32 + 7 tests existants **+ au moins 12**.

---

### 4.3 J1 — Le pouce sur Construire (interface P1 sur le village actuel)

**Objectif.** Le premier vrai pas vers « un jeu, pas une page web » : HUD en paysage, tiroir Construire qui pilote le vrai `runAction`, tap
sur un bâtiment → barre contextuelle, fantôme de la prochaine instance. Tout cela sur le **village actuel en plein écran**, à travers un
adaptateur qui respecte déjà le contrat de la carte (§2.5).
**Jouable.** Oui : on construit sans ouvrir l'interface classique ; tout ce qui n'est pas encore refait reste accessible par le bouton de
secours **développeur** (échafaudage, D2).
**Drapeau.** `ui: 'new'` (défaut dans les builds de Mathéo), `ui: 'classic-dev'` pour revenir en arrière.
**Briefs Claude Design.** **B1** (envoyé au début de J1, intégré à la livraison) : lot UI-1 cadres 9-slice au matériau de l'ère 1 (panneau,
tiroir, puce de ressource, rangée, onglet, infobulle, toast, barre contextuelle), UI-2 boutons (hub rond, rectangle, +/−, interrupteur,
sélecteur ×1/×10/Max, cadenas, pastille), UI-3 icônes de hub, UI-7 badges d'état. Contenu : principes du R25 §9.1 en tête, palette imposée
(rampes du kit), format des pièces du kit (`rows`, `slice`, `uses`, `def`), planche d'exemple à ×1 et ×2, **aucun texte dessiné**, test
de gris et auto-contrôle « 0 pixel hors palette ». En anglais. En attendant, des cadres provisoires en CSS.

| ID | Tâche | Fichiers | Dépend de | // |
|---|---|---|---|---|
| J1-01 | `src/api.js` v0 : `state`, `act`, `visible.city`, `cost`, `afford`, `eta`, `describe`, `labels`, `onMessage` ; `export` de `runAction` ; `import` dans `main.js` ; tests dans le banc Node (construire n fois donne les mêmes comptes et les mêmes coûts payés que `actions.city.X.action()` en boucle) | `src/api.js`, `src/actions.js`, `src/main.js`, `test/api/act.test.js` | J0-08, accord §0.3 | J1-04 |
| J1-02 | Neutraliser le multiplicateur clavier d'Evolve dans `act()` (Ctrl/Maj/Alt, `vars.js:1499-1505`) ; test avec une touche « enfoncée » simulée | `src/api.js`, `test/api/keymult.test.js` | J1-01 | — |
| J1-03 | Frein du clone : `updateDebugData` à 1 Hz ou en mode développeur ; le kit legacy et `anki-bridge.js` lisent par `EvolveAPI.state()` (adaptateur dans `pv-boot.js` qui pose `window.evolve.global` = référence vivante, sans toucher au kit) ; mesure avant/après | `src/main.js`, `pv-boot.js`, `anki-bridge.js` | J1-01, J0-07 | — |
| J1-04 | `core/` : `bus.js`, `store.js` (`global.pv`, versions, migration ; test de survie à MAD et bioseed dans le banc), `strings-en.js` + `t()`, `format.js` (anglais, variante HUD, secondes de jeu → jours), `perf.js` | `core/*.js`, `test/core/*.test.js` | — | J1-01 |
| J1-05 | `pv-boot.js` : charge kit, core, ui, (map plus tard) ; monte `#pv-root` ; lit les drapeaux ; canvas du village legacy en plein écran (`SpriteKit.run`, `pixelTrue`) ; DOM classique caché ; bouton « Classic (dev) » visible seulement en mode développeur ; `index.html` charge `pv-boot.js` | `pv-boot.js`, `index.html` | J1-04 | J1-06 |
| J1-06 | `ui/dom.js`, `ui/layout.js` (dispositions, `--u`, marges sûres, `viewport-fit=cover`), `ui/theme.js` (jetons d'ère, 9-slice depuis les pièces du kit en data URI) | `ui/` | J1-04 | J1-05 |
| J1-07 | HUD du haut : puces fixes (population et moral, `Money`, `Knowledge`, énergie si `city.powered`), puces automatiques (règles du R25 §4.2, avec leur raison), pastille Anki (état du pont), boutons de hub révélés par les drapeaux `display` d'Evolve (seul Build au départ) | `ui/hud.js`, `ui/chip.js` | J1-06, J1-01 | J1-08 |
| J1-08 | Tiroir Construire : onglets par `category` d'Evolve, rangées (icône provisoire, compte, coûts avec états abordable / `cna` / `cnam`, délai en jours), [+] avec ×1/×10/Max, appui long qui répète en accélérant, champ de recherche, infobulle par `describe` | `ui/panels/build.js`, `ui/drawer.js` | J1-06, J1-01 | J1-07 |
| J1-09 | **Adaptateur du contrat sur le village legacy** : `PV.map` réduit (`pick` par `SK.village.idAt`, `toScreen` par `placed()`, `ghost` = slot `visN(count)` du type, `highlight` dans un canvas de surimpression, `focus` par `V.panX/panY`, `fx` par `SK.village.burst`, `on('tap')`) | `map/legacy-adapter.js`, `test/map/legacy-adapter.test.js` | J1-05 | J1-07, J1-08 |
| J1-10 | Barre contextuelle : tap sur un bâtiment → « Sawmill ×4 », [+1] avec coût, infos (`describe`) ; interrupteur prévu (J2) | `ui/contextbar.js` | J1-09 | — |
| J1-11 | Effets minimaux : icônes de coût qui volent des puces vers le chantier (`toScreen`), « pop » de la nouvelle instance (diff d'instantané), son provisoire | `ui/fly.js`, `ui/juice.js` | J1-09, J1-07 | — |
| J1-12 | `core/snapshot.js` v0 (comptes, techs, calendrier, signature) et événements `built` / `researched` sur le bus | `core/snapshot.js`, `test/core/snapshot.test.js` | J1-01 | J1-07 |
| J1-13 | Page de couverture v0 : données de l'annexe A, état de chaque ligne (fait / échafaudage), vérification automatique que chaque fonction d'API citée existe | `ui/coverage.js`, `tools/coverage.html` | J1-01 | — |
| J1-14 | Intégration de la livraison B1 (cadres, boutons, icônes de hub, badges) ; auto-contrôle palette | `ui/theme.js`, `kit/` **(copie de la livraison seulement)** | B1 livré | — |
| J1-15 | Essais : automatisation CDP (Brave, 8766) qui construit 10 bâtiments de 4 types par des touchers simulés et relève les erreurs console ; liste à cocher pour Mathéo dans Anki | `tools/phone-test/j1.js`, `tools/phone-test/J1-ANKI.txt` | J1-08 à J1-11 | — |

**Critères d'acceptation.**
1. Sur le téléphone en paysage, construire 10 bâtiments de 4 types **sans** le bouton de secours.
2. Le nouveau bâtiment apparaît moins de 1 s après le tap.
3. Mise à jour du HUD ≤ 2 ms par lecture à 4 Hz (`perf.js`) ; le village legacy garde au moins sa fluidité d'avant.
4. Aucune erreur console dans Brave, Fennec et Anki.
5. La même partie s'ouvre en `classic-dev` sans incohérence.
6. Coût du clone profond divisé par 4 au moins (mesure J0-07 refaite).

**Tests.** Node : `api` (act, keymult), `core` (store, format, strings : toute clé `t()` utilisée existe), `snapshot`, adaptateur legacy.
Total : **≥ 70** tests. Plus CDP sur Brave (J1-15), un essai sur Fennec à la main et la liste à cocher Anki de Mathéo.

---

### 4.4 J2 — Une séance complète (interface P2)

**Objectif.** Jouer de l'ère 0 au milieu de l'ère 1 sans jamais ouvrir l'échafaudage : Recherche, Peuple, fiche ressource, chantiers, conseiller,
toasts et journal, écran Cellule.
**Jouable.** Oui. Une séance « retour → décisions → fermer » doit tenir en moins de 2 minutes.
**Drapeau.** `ui: 'new'`.
**Briefs.** **B2** : UI-4 icônes de ressources des ères 0 à 3 (environ 25, en harmonisant les 16 de `SK.RES_ICON`), UI-6 icônes de métiers,
UI-5 icônes des 8 quartiers (`category`). Même contenu que B1, avec silhouettes reconnaissables en gris à ×1.

| ID | Tâche | Fichiers | Dépend de | // |
|---|---|---|---|---|
| J2-01 | `api.js` : `visible.tech`, `techState`, `export` de `checkTechPath` et `checkOldTech`, `act('tech', k)` ; `rqueue.*` ; tests | `src/api.js`, `src/actions.js`, `test/api/tech.test.js` | J1-01 | J2-03 |
| J2-02 | **Index « débloque »** : au démarrage, pour chaque tech, les bâtiments, métiers et techs que son `grant` rend possibles (en lisant les `reqs` des actions) ; test sur 10 cas connus | `core/unlocks.js`, `test/core/unlocks.test.js` | J2-01 | J2-03 |
| J2-03 | Tiroir Recherche : Disponibles / File / Acquises, coût et délai, « unlocks: » avec icônes, ajout à la file | `ui/panels/research.js` | J2-01, J2-02 | J2-05 |
| J2-04 | `api.js` : `jobs.add/sub/setDefault`, `craftsmen.add/sub`, `craft` réécrits ; **tests contre les méthodes Vue capturées** (même état de départ, mêmes `global` après) | `src/api.js`, `test/api/jobs.test.js`, `test/api/craft.test.js` | J0-08 | J2-01 |
| J2-05 | Tiroir Peuple (à gauche) : métiers, −/+ de 48 px, métier par défaut par appui long, couleurs de `level()`, onglets Artisans et Moral | `ui/panels/people.js` | J2-04 | J2-03 |
| J2-06 | Fiche ressource : `breakdown` (producteurs, consommateurs, ligne Anki), plafond, liens Marché et Caisses (provisoires), **soulignement des producteurs et consommateurs sur la carte** (`highlight` par types) | `ui/panels/resource.js`, `src/api.js` (`breakdown`) | J1-09 | J2-05 |
| J2-07 | `api.js` : `power.on/off` réécrits + tests ; interrupteur dans la barre contextuelle ; bâtiments éteints assombris (adaptateur) | `src/api.js`, `ui/contextbar.js`, `test/api/power.test.js` | J1-10 | — |
| J2-08 | `api.js` : `queue.add/move/remove` (lire `actions.js:6541-6590`) + tests ; bandeau « Worksites » dans le HUD (progression, réordonner par flèches, retirer) | `src/api.js`, `ui/worksites.js`, `test/api/queue.test.js` | J1-01 | — |
| J2-09 | **File dès le premier village** (D5) : une ligne dans `vars.js` à côté du gène `queue`, après accord ; test dans le banc | `src/vars.js`, `test/api/queue-start.test.js` | J2-08, accord | — |
| J2-10 | Conseiller (3 règles au plus : ressource pleine qui gaspille, citoyens sans emploi, achat le moins cher qui débloque quelque chose) ; onglet « Suggested » du tiroir Construire ; état « All in order » | `ui/advisor.js` | J2-02 | J2-11 |
| J2-11 | Toasts (2 au plus, file de priorité) + tiroir Journal (4 onglets tirés des filtres d'Evolve, [See] qui centre la carte) par `onMessage` | `ui/toast.js`, `ui/panels/journal.js` | J1-01 | J2-10 |
| J2-12 | Écran Cellule (ère 0) : canvas `kit/evolution.js`, cartes de mutation (2 ou 3 choix), puces ARN/ADN, passation vers le village | `ui/panels/cell.js` | J2-01 | — |
| J2-13 | Onboarding : révélation progressive par les drapeaux `display` d'Evolve, une bulle d'une phrase par première apparition (`global.pv.seen`) | `ui/onboarding.js` | J1-07 | — |
| J2-14 | Épingles de ressources (appui long dans le tiroir des ressources, 2 au plus) + tiroir de toutes les ressources par groupes | `ui/panels/resources.js` | J1-07 | — |
| J2-15 | Compteur « Day 143 · summer » et ciel d'aube « The village is waiting » (lien avec C-H1 du PLAN : on affiche, la logique reste celle de la phase 1) | `ui/hud.js` | J1-07 | — |
| J2-16 | Intégration de B2 ; essais (CDP : partie automatique de l'ère 0 à la moitié de l'ère 1 par l'interface seule, compteur d'ouvertures de l'échafaudage = 0) ; séance chronométrée avec Mathéo | `tools/phone-test/j2.js` | tout J2 | — |

**Critères.**
1. De l'ère 0 au milieu de l'ère 1 sans échafaudage : script CDP **et** une séance de Mathéo.
2. Séance « retour → décisions → fermer » en moins de 2 min.
3. Lignes de couverture 1 à 11 et 31, 39 et 40 marquées « fait », avec tests.
4. Ouverture d'un tiroir ≤ 100 ms sur le téléphone.

**Tests.** ≥ 110 tests au total (réécritures comparées aux originaux capturés, index « débloque », conseiller sur des états fabriqués).

---

### 4.5 J3 — La planète (R24 M1 + M2)

**Objectif.** La planète entière remplace le canvas legacy : génération à partir de la graine, terrain, vues L0 à L4, capitale = le village
actuel en méga-sprite incrusté. L'interface **ne change pas** : elle parle au contrat, désormais servi par la vraie carte.
**Jouable.** Oui : on zoome de la planète jusqu'à un citoyen de la capitale ; on construit comme en J2.
**Drapeau.** `map: 'planet'` (défaut chez Mathéo à la fin de J3), `map: 'village'` pour revenir.
**Briefs.** **B3** : terrain de planète en L0 (et paires L0/L1) : tuiles par biome Evolve × 4 saisons, jeu d'autotuiles de côte (masque à 16
cas), rivières en 3 largeurs, bosses de montagne iso, banquise, toundra, plages ; vagues animées (4 images) ; **nouvelles rampes** proposées
(`ocean_deep`, `ocean_shelf`, `ice`, `tundra_moss`, et ce que le designer juge utile). Contenu : grille 32 × 16, liste des rampes autorisées,
planche multi-échelle (×1, ×2, à côté d'une tuile existante), règles de raccord, auto-contrôle. Les couleurs de L2 à L4 sont **calculées**
(pas de brief).

| ID | Tâche | Fichiers | Dépend de | // |
|---|---|---|---|---|
| J3-01 | `core/rng.js`, `core/dmath.js` (table de sinus entière générée par script, virgule fixe), bruit de valeur 3D entier ; tests, dont **empreinte croisée** | `core/rng.js`, `core/dmath.js`, `tools/gen-sintable.js`, `test/core/dmath.test.js` | J0-10 | dès J0 |
| J3-02 | Relief et continents (fBm sur le cylindre, plaques, part de terre selon le biome d'Evolve), test « pas de couture » (écart entre `q = 0` et `q = W − 1` du même ordre qu'entre deux colonnes voisines) | `map/planet.js`, `test/map/planet.test.js` | J3-01 | J3-07 |
| J3-03 | Priority-Flood (tas typé, clés entières, départage par index), écoulement, rivières, lacs | `map/planet.js`, `core/heap.js` | J3-02 | — |
| J3-04 | Climat et biomes (latitude + altitude, humidité, vent) → 12 biomes d'Evolve, effets de `ptrait` ; capitale dans une région du biome de `city.biome` | `map/planet.js` | J3-03 | — |
| J3-05 | Sites (Poisson déterministe, scores) ; capitales du joueur et des rivaux ; territoires de départ par quotas ∝ `eco` (D10) ; `seg`, `geo` | `map/planet.js`, `map/nations.js` (partie génération) | J3-04 | — |
| J3-06 | Empreintes de référence pour 5 graines + page de test d'empreinte pour Fennec et Qt | `test/golden/hashes.json`, `tools/hash-check.html` | J3-05 | — |
| J3-07 | `map/journal.js` v1 : création, validation, migration, graine dérivée, **table des resets vérifiée dans `resets.js`**, reconstruction à partir de l'état ; tests (MAD garde la graine, bioseed en change, journal corrompu reconstruit, taille < 1 Ko) | `map/journal.js`, `test/map/journal.test.js` | J1-04 | J3-02 |
| J3-08 | Art du terrain : peintres de tuiles L0 par biome × saison à partir des textures et rampes du kit, autotuiles de côte, rivières, montagnes (provisoire jusqu'à B3) ; couleurs calculées L2 à L4 depuis les rampes dominantes | `map/art/terrain.js`, `map/art/l234.js` | J3-04 | J3-09 |
| J3-09 | Réducteur L0 → L1 qui respecte la palette (contours et couleur dominante du toit prioritaires) ; test « 0 pixel hors palette » sur tout le kit | `map/art/reduce.js`, `test/map/reduce.test.js` | — | J3-08 |
| J3-10 | `map/bake.js` + `map/chunks.js` définitifs (issus du spike) : tranches, réserve de tampons, ordre global, doublons d'enroulement, index par morceau, double tampon ; images de référence | `map/bake.js`, `map/chunks.js`, `test/golden/bake.test.js` | J0-11 | J3-11 |
| J3-11 | `map/camera.js` + `map/input.js` définitifs (barreau figé en J0, inertie, pincement, molette, double tape, vol de van Wijk, bornes en `r`, `setViewportInsets`) ; tests des calculs (retour au barreau, extrémités du vol, enroulement) | `map/camera.js`, `map/input.js`, `test/map/camera.test.js` | J0-11 | J3-10 |
| J3-12 | `map/render2d.js` + `map/compositor.js` + intégration à `core/sched.js` (budgets, priorités P0-P4, visibilité, 8 Hz au repos, 0 caché, perte de contexte) | `map/render2d.js`, `map/compositor.js`, `core/sched.js` | J3-10, J3-11 | — |
| J3-13 | `map/capital.js` : tampon de `layout()` au site de la capitale (fondu du terrain, rivière prolongée), méga-sprite legacy **seulement** visible, en L0 et au repos (au plus 4 Hz, gelé pendant les gestes), instantané du statique cuit dans les morceaux L1 et plus ; barreau L0 pair tant que le méga-sprite existe | `map/capital.js` | J3-12 | J3-14 |
| J3-14 | `map/pick.js` + `map/api.js` (`PV.map`) sur la planète ; **dans la capitale, délégation à l'adaptateur legacy** (transformation de coordonnées) pour `pick`, `ghost`, `highlight`, `toScreen` | `map/pick.js`, `map/api.js`, `test/map/api.test.js` | J3-12, J1-09 | J3-13 |
| J3-15 | Rivaux visibles dès maintenant : silhouettes de capitales, fumées, lumières lointaines (D23) | `map/actors.js` (partie lointaine) | J3-12 | — |
| J3-16 | Bascule : `pv-boot.js` monte la carte-planète derrière le même HUD ; `map: 'village'` reste en repli | `pv-boot.js` | J3-14 | — |
| J3-17 | **Inspecteur du monde** (`tools/map-inspect.html` : graine, couches relief, eaux, écoulement, biomes, nations, sites, grille des morceaux, morceaux sales, temps) + `tools/render-map.js` (rendus de référence sans navigateur) | `tools/map-inspect.html`, `tools/render-map.js` | J3-05, J3-10 | — |
| J3-18 | **Planche de 20 planètes** (L4 de 20 graines) pour Mathéo (goût) ; corrections | `/data/data/com.termux/files/usr/tmp/` puis `~/storage/downloads/` | J3-17 | — |
| J3-19 | Campagne de mesures J0 refaite avec le vrai pipeline (Brave, Fennec, Anki par Mathéo) ; intégration de B3 | — | J3-16, B3 livré | — |

**Critères.**
1. Zoom continu de la planète à un citoyen, sans coupure ni saut de position.
2. Génération ≤ 300 ms sur Brave (cible 150 ms) et ≤ 500 ms sur Fennec.
3. Empreinte identique dans Node, Brave, Fennec et Qt pour les 5 graines de référence.
4. Couture invisible (image de référence du morceau de couture).
5. Seuils du §4.2 tenus sur le vrai pipeline.
6. Tous les tests du contrat passent sur la planète comme sur l'adaptateur.
7. Mathéo trouve la planche de 20 planètes belle.

**Tests.** ≥ 170 tests au total. Images de référence : un morceau par palier pour 3 graines, couture, capitale.

---

### 4.6 J4 — Le retour de séance (interface P3 et rétrospective)

**Objectif.** Le moment héros (D24) : au retour d'une séance Anki, 3 à 5 s de rejeu passable d'un tap, HUD qui monte, nouveaux bâtiments
qui « popent », caméra qui fait un lent travelling, résumé en 3 lignes, coffre de journée accomplie, phare de la flamme sur la capitale.
**Jouable.** Oui ; tout est coupé par « Reduced motion ».
**Drapeau.** Aucun (fonction stable dès qu'elle passe ses critères).
**Briefs.** **B4** : phare de la flamme sur la capitale (L0, L1 et son éclat lointain L3-L4, 4 états de chaleur), bornes du chemin des jours
(allumée ou éteinte), sprites de confettis et de feu d'artifice, particules de pièces et de ressources (4 à 8 px).

| ID | Tâche | Fichiers | Dépend de | // |
|---|---|---|---|---|
| J4-01 | Orchestrateur du rejeu : détection du retour de séance (réserve de ticks > 0 dans `global.anki.clock.bank`, ou retour d'onglet), instantané S0, bannière « 42 cards · 42 village days », lecture à 4 Hz pendant le rattrapage, résumé, passer d'un tap | `ui/replay.js` | J2-11, J1-12 | J4-02 |
| J4-02 | `map/replay.js` : `map.replay(S0, S1)` ; avant J5, pops des bâtiments comptés à leurs slots et travelling ; en J5, interpolation de `P` et apparition des tuiles dans l'ordre de leur rang | `map/replay.js` | J3-14 | J4-01 |
| J4-03 | Lissage du rattrapage : mesurer les images pendant un rattrapage de 1 000 ticks, régler `drain` dans `src/anki.js` pour qu'aucune image ne dépasse 50 ms | `src/anki.js`, `test/anki` (existant, à étendre) | J0-07 | — |
| J4-04 | Coffre de journée accomplie posé sur la place de la capitale (`SK.ui.chest`, `fx('chest')`) | `map/fx.js` | J3-14 | — |
| J4-05 | Phare de la flamme : sprite L0/L1 selon la chaleur, point lumineux en L3/L4 ; lit `global.anki.streak.heat` | `map/actors.js`, `map/art/landmarks.js` | B4 | — |
| J4-06 | `ui/sound.js` : une douzaine de sons synthétisés (tap, tiroir, pop, eurêka, pièce, jour qui passe, coffre, erreur douce, alerte, bataille), activés par défaut, volume bas, coupés sur `blur` et onglet caché | `ui/sound.js`, `test/ui/sound.test.js` (enveloppes) | — | toutes |
| J4-07 | Icônes volantes et particules (40 au plus sur téléphone, réserve circulaire), tremblement d'écran réservé aux cas du R25 §6.7 | `ui/fly.js`, `map/fx.js` | J1-11 | — |
| J4-08 | Réglages « Reduced motion » (défaut selon `prefers-reduced-motion`) et « Camera follows construction » | `ui/panels/settings.js` (partiel), `core/store.js` | J1-04 | — |
| J4-09 | Chemin des jours : une borne par jour compté le long d'une polyligne qui part de la capitale (route réelle en J6) | `map/landmarks.js` | J3-14 | — |
| J4-10 | Essais : mesure des images pendant le rejeu (Brave, Anki), séance réelle de Mathéo | — | tout J4 | — |

**Critères.**
1. Rejeu de 3 à 5 s, passable d'un tap, aucun geste obligatoire.
2. Aucune image > 50 ms pendant le rejeu sur le téléphone, ≤ 1 sur Anki « software ».
3. Tout le mouvement est coupé par « Reduced motion ».
4. Son coupé quand on révise dans Anki (fenêtre sans focus).
5. Mathéo dit spontanément quelque chose au retour de séance (critère qualitatif du R25).

---

### 4.7 J5 — Les villes poussent (R24 M3 + M4, portage de la capitale)

**Objectif.** Le cœur du rapport 24 : la progression `P`, les villes fondées et inscrites au journal, l'ordre d'urbanisation, la densité,
le style par ère, le tissu urbain, les bâtiments comptés répartis sur plusieurs villes, et la capitale portée dans la carte (les citoyens
compris), pour retirer le méga-sprite.
**Jouable.** Oui : la planète se remplit avec la partie ; la carte se dévoile ; les forêts de la mémoire apparaissent quand les chênes du PLAN
existent.
**Drapeau.** `growth` (défaut à la fin de J5) ; `map: 'village'` est retiré à la fin de J5.
**Briefs.** **B5** : tissu urbain des ères 1 à 3 (résidentiel, commerce, industrie, parc × densité 1 à 4, avec règles de raccord en
autotuiles ou tuiles de Wang), liste des retouches L1 (monuments et ratés du réducteur), règles des blocs L2 par classe (maison, tour, usine,
ferme, mine, centrale, monument : losange + colonne de hauteur + un pixel de couleur signature), **pictogrammes** L3 de 5 × 5 et 7 × 7 pour les
types comptés et leur badge empilé (« ⚡ ×11 »), bosquet de chênes (forêt de la mémoire) L0/L1, parchemin et brume de la terra incognita.

| ID | Tâche | Fichiers | Dépend de | // |
|---|---|---|---|---|
| J5-01 | `growth.js` : formule de `P` (poids par type, population, `high_tech`, bâtiments spatiaux), maximum atteint `hw`, virgule fixe ; tests | `map/growth.js`, `test/map/growth.test.js` | J3-07 | J5-05 |
| J5-02 | Fondation des villes : seuils géométriques, segments ouverts, choix glouton, écriture au journal, ordre fixe des décisions dues lors d'un grand saut (déverrouillages puis fondations par seuil croissant) | `map/growth.js`, `map/journal.js` | J5-01 | — |
| J5-03 | Ordres d'urbanisation (Dijkstra entier par ville, routes attirantes, noyaux secondaires), propriétaire par « premier en P », mise à jour en O(changements) | `map/growth.js` | J5-01 | J5-04 |
| J5-04 | Densité par anneaux, ère de style par inversion, patrimoine, renouvellement ; usages (industrie près des comptés industriels, commerce au centre et sur les axes, parcs le long des rivières, civique autour des monuments) | `map/growth.js`, `map/plan.js` | J5-03 | — |
| J5-05 | `counted.js` : table de politique par type (R24 §5.5), listes de slots planétaires, **slots du 24 × 24 en premier**, concaténation des segments, compression quand la liste est épuisée, décroissance | `map/counted.js`, `test/map/counted.test.js` | J3-05 | J5-01 |
| J5-06 | `plan.js` : `WorldPlan` + diff → tuiles sales → morceaux sales par palier ; plan complet ≤ 50 ms découpé, incrémental ≤ 1 ms | `map/plan.js`, `test/map/plan.test.js` | J5-04, J5-05 | — |
| J5-07 | **Tests de propriété** (§5.2) : inclusion monotone, slot k stable, saut = pas à pas, rechargement du journal = même plan, décroissance ; 1 000 progressions aléatoires semées | `test/map/properties.test.js` | J5-06 | — |
| J5-08 | `art/pool.js` : réserves de variantes (16 à 24 par clé), anti-clone de voisinage dans l'ordre des slots, pages d'atlas avec plafond ; compositeurs appelés directement (§2.8) | `map/art/pool.js`, `map/atlas.js` | J3-10 | J5-09 |
| J5-09 | Bâtiments comptés dessinés sur la planète (L0 composeurs, L1 réduits, L2 blocs, L3 pictogrammes et badges) ; bâtiments animés hors des morceaux (images d'animation dans l'atlas) et ré-occultation | `map/art/l0.js`, `map/art/l2.js`, `map/compositor.js` | J5-08 | — |
| J5-10 | Tissu urbain : L2 et L3 générés d'abord (art provisoire), puis L0/L1 avec B5 | `map/art/fabric.js` | J5-06 | J5-09 |
| J5-11 | **Portage des citoyens** : `SK.citizens.compose` → atlas ; placement par métier sur les bâtiments de la planète ; dessin à demi-échelle (échelles paires) et ré-occultation ; groupes touchables (`pick` → `citizen`) | `map/actors.js` | J5-09 | — |
| J5-12 | **Inventaire de parité** de la capitale legacy, puis portage : chantiers et échafaudages, transition de palier tramée, fumées, sciure, étincelles, guirlandes entre toits, chat sur un toit, enseignes, décor (arbres, rochers, mobilier de place), animaux, accessoires de l'ère 1 (bannière, décharge, tombes, camps, étals, potence, animaux familiers), effets d'événements (incendie, effondrement), réseau électrique (poteaux, fils, fenêtres allumées) | `map/capital.js`, `map/props.js`, `test/golden/capital.test.js` | J5-09, J5-11 | — |
| J5-13 | Systèmes de l'ère 3 ramenés sur la planète : puits de pétrole sur les gisements `geo`, quai sur la côte, zone industrielle (le rail vient en J6) | `map/counted.js`, `map/art/l0.js` | J5-05 | — |
| J5-14 | **Retrait du méga-sprite** quand l'image de référence de la capitale portée rejoint le statique legacy (écart limité aux différences voulues, listées) ; libération des 26 Mo du legacy | `map/capital.js`, `pv-boot.js` | J5-12 | — |
| J5-15 | Noms de villes (tables de syllabes d'Evolve), étiquettes en police bitmap du kit (canvas d'étiquettes dans l'atlas) ; fiche de ville au tap en L3 (UI) | `map/labels.js`, `ui/panels/city.js` | J5-02 | — |
| J5-16 | **Carte qui se dévoile** (D23) : brouillard parchemin en L2-L4 qui recule avec l'exploration (roue et chariot, port, satellites `tech.satellite`), éclaireurs qui marchent au bord | `map/reveal.js`, `map/compositor.js` | J5-06 | — |
| J5-17 | Forêts de la mémoire : tuiles protégées autour des villes, ∝ chênes du PLAN (lit `global.anki` quand le champ existe, sinon rien) | `map/growth.js`, `map/art/fabric.js` | J5-04 | — |
| J5-18 | **Curseur de progression** dans l'inspecteur : chronologie de `Snap` (fabriqués ou issus du banc moteur), lecture, saut direct, comparaison saut / pas à pas | `tools/map-inspect.html`, `tools/timeline.js` | J5-06 | — |
| J5-19 | **Fabricant de sauvegardes** (généralise `era3save.js`) : préréglages par ère, nombres de bâtiments, états étrangers, Anki ; sort une sauvegarde pour `importGame` (port 8766 seulement) **et** un `Snap` JSON pour Node | `tools/savegen/savegen.js`, `tools/savegen/presets.js` | J1-12 | dès J3 |
| J5-20 | `placed()` étendu au monde : pour chaque type, instances placées = `count` (dans la limite des slots) ; outil et test | `map/counted.js`, `test/map/placed.test.js` | J5-09 | — |
| J5-21 | Intégration de B5 ; mesures (plan, cuisson après un grand saut) | — | B5 livré | — |

**Critères.**
1. « 11 centrales = 11 centrales en 11 endroits » : `placed()` = `count` pour tous les types (dans la limite des slots).
2. Les 1 000 progressions des tests de propriété passent.
3. Plan complet ≤ 50 ms, incrémental ≤ 1 ms.
4. Après un saut de « plusieurs semaines », la vue est recuite en ≤ 2 s au repos sans image > 33 ms.
5. Capitale portée : parité validée sur l'image de référence et la liste J5-12.
6. Mémoire totale ≤ 64 Mo sur le téléphone, méga-sprite retiré.

---

### 4.8 J6 — Routes, rails et commerce (R24 M5 + R25 P5)

**Objectif.** Le réseau qui relie les villes, avec des trains, des navires et des caravanes ; et les panneaux qui le font vivre : Économie
(marché, routes commerciales, entrepôt, industrie) et Énergie.
**Drapeau.** `roads`.
**Briefs.** **B6** : autotuiles de routes par classe (sentier, terre, pavé, goudron, lévitation) et de rails, ponts, véhicules (charrette,
chariot, caravane, navire marchand ; le train et la barge de l'ère 3 existent), version « point lumineux » pour L3.

| ID | Tâche | Fichiers | Dépend de | // |
|---|---|---|---|---|
| J6-01 | `roads.js` : A* dans l'ordre de fondation, coûts entiers, distance cyclique, partage des troncs, ponts ; rails vers les N plus grandes villes ; routes maritimes | `map/roads.js`, `test/map/roads.test.js` | J5-02 | J6-05 |
| J6-02 | Règle de classe de route (§3.6) **vérifiée dans `tech.js`** ; cas `gravity_well` | `map/roads.js` | J6-01 | — |
| J6-03 | Rendu : autotuiles L0/L1, lignes L2, routes principales L3 ; gare et dépôt de fret (reprise de l'ère 3) | `map/art/roads.js` | J6-01 | — |
| J6-04 | Véhicules : trains entre villes, navires sur les routes maritimes, caravanes vers les rivaux selon les routes commerciales d'Evolve ; points lumineux avec traînée en L3 | `map/actors.js` | J6-03 | — |
| J6-05 | `api.js` : `market.buy/sell`, `routes.adjust`, `storage.crate/container` (et leur construction) réécrits ; tests contre les originaux capturés | `src/api.js`, `test/api/market.test.js` | J0-08 | J6-01 |
| J6-06 | `api.js` : `smelter.set`, `factory.set` réécrits ; tests | `src/api.js`, `test/api/industry.test.js` | J0-08 | — |
| J6-07 | `api.js` : `grid.move` (priorités du réseau électrique) ; tests | `src/api.js`, `test/api/grid.test.js` | J2-07 | — |
| J6-08 | Panneau Économie : Market, Routes, Storage, Industry (grille lisible, quantités 10/100/1k, compteur −/+ de route) | `ui/panels/economy.js` | J6-05, J6-06 | — |
| J6-09 | Panneau Énergie : production, demande, déficit, priorités avec flèches de 44 px et poignée, interrupteurs ; bâtiments éteints assombris sur la carte | `ui/panels/power.js` | J6-07 | — |
| J6-10 | Fiche ressource complète (caisses, marché, route), fiches Fonderie et Usine depuis la barre contextuelle | `ui/panels/resource.js`, `ui/contextbar.js` | J6-08 | — |
| J6-11 | Le chemin des jours suit la vraie route de la capitale | `map/landmarks.js` | J6-01 | — |
| J6-12 | Images de référence routes et rails (3 graines × 2 époques) | `test/golden/roads.test.js` | J6-03 | — |
| J6-13 | Intégration de B6 | — | B6 livré | — |
| J6-14 | Essais CDP (commerce, énergie) et Anki | `tools/phone-test/j6.js` | tout J6 | — |

**Critères.**
1. Réseau déterministe (images de référence).
2. Trains visibles et en mouvement à tous les paliers (points lumineux en L3).
3. Lignes de couverture 12 à 16 « fait », avec tests.
4. Aucune régression de performance (seuils du §4.2).

---

### 4.9 J7 — Les voisins (R24 M6 + R25 P4, première moitié)

**Objectif.** Les trois nations sur la carte (cinq en True Path) : territoires, couleurs doublées de motifs (daltonisme), frontières selon
l'hostilité et l'ère, brouillard par les espions, villes rivales qui vivent ; fiches de nation ; panneaux Cité (régime, impôts, gouverneur)
et Armée.
**Drapeau.** `nations`.
**Briefs.** **B7** : spécification du canal **TEAM** (recoloration par nation, lettres réservées à figer avec le designer, proposition `A B C D`) et
du canal **GLOW** (`G H J K`), à intégrer au décodeur du kit **par Claude Design** ou par `kit-patches/` ; forts, murs, palissades, postes
de douane, bornes et tours de guet des ères 1 à 3 ; 4 blasons (UI-8) et 4 humeurs ; accents d'architecture des villes rivales.

| ID | Tâche | Fichiers | Dépend de | // |
|---|---|---|---|---|
| J7-01 | `nations.js` : nation courante par tuile (règle `controlling`), villes rivales bornées, garnisons ∝ `mil`, camps des soldats en territoire occupé | `map/nations.js`, `test/map/nations.test.js` | J3-05 | J7-05 |
| J7-02 | **États fabriqués** : toutes les combinaisons `occ`/`anx`/`buy`/`world_control` pour chaque gouvernement, `cataclysm`, `isolation`, True Path (`gov3`, `gov4`) ; tests de rendu des données (pas d'exception, bonne nation par tuile) | `tools/savegen/presets.js`, `test/map/nations-states.test.js` | J5-19 | — |
| J7-03 | Rendu : aplat translucide + liseré + hachures en L3/L4, pointillés de frontière, bornes, clôtures et murs en L0 selon `hstl` et l'ère | `map/art/borders.js` | J7-01 | — |
| J7-04 | Brouillard par les espions (table §3.4) sur les villes et les troupes rivales | `map/nations.js`, `map/compositor.js` | J7-01 | — |
| J7-05 | `api.js` : `government.set`, `governor.*`, `garrison.tactic/raid` réécrits ; `civics(op, i)` pour les impôts, les espions et les mercenaires ; tests | `src/api.js`, `test/api/civic.test.js` | J0-08 | J7-01 |
| J7-06 | Panneau Cité : régimes en cartes à blason (`govEffect`), curseur d'impôts avec les deux conséquences, gouverneur | `ui/panels/civic.js` | J7-05 | — |
| J7-07 | Panneau Armée : garnison, blessés, tactique, bataillon, mercenaires, estimation en mots (`battleAssessment`) | `ui/panels/military.js` | J7-05 | — |
| J7-08 | Fiche de nation au tap (L3-L4 ou capitale rivale) : relations (visage), armée, économie, troubles à la précision permise par les espions ; former un espion | `ui/panels/nation.js` | J7-04 | — |
| J7-09 | Humeur diplomatique en visage sur le blason, dérivée de `hstl` | `ui/panels/nation.js`, `map/labels.js` | B7 | — |
| J7-10 | Canaux TEAM et GLOW : intégration de la livraison de Claude Design (ou patch), tests du décodeur | `kit/` (livraison) ou `kit-patches/` | B7 livré | — |
| J7-11 | Comptoirs du PLAN (D-3) préparés : point d'accroche sur la route frontière quand `hstl < 10` | `map/nations.js` | J6-01 | — |
| J7-12 | Images de référence frontières (états fabriqués) | `test/golden/nations.test.js` | J7-03 | — |
| J7-13 | Essais et intégration de B7 | — | tout J7 | — |

**Critères.**
1. Toutes les combinaisons fabriquées donnent la bonne nation par tuile, sans exception.
2. Après l'unification, plus aucune lecture des drapeaux.
3. Lignes 17 à 20, 22 et 24 « fait ».
4. Motif lisible en gris (daltonisme).

---

### 4.10 J8 — Guerre et diplomatie racontées (R24 M7 + R25 P4, seconde moitié)

**Objectif.** Une campagne n'a pas de durée dans Evolve (un clic) : on la **raconte**. Colonne qui marche, nuage de bataille, retour avec le butin
ou les blessés, couleur qui se répand après un siège victorieux, affiches et urnes pendant une annexion, convoi de coffres pour un achat,
murs qui tombent à l'unification. L'issue est toujours celle d'Evolve.
**Drapeau.** `war`.
**Briefs.** **B8** : nuage de bataille, camp de siège, drapeau qu'on hisse, affiches et urne, convoi de coffres, images d'effondrement de mur.

| ID | Tâche | Fichiers | Dépend de | // |
|---|---|---|---|---|
| J8-01 | `src/pv-hooks.js` + enveloppe de `war_campaign` (avant/après) ; enveloppes de `raid` et `siege` ; tests dans le banc (l'enveloppe ne change pas l'issue : même état final avec et sans elle, `Math.random` semé) | `src/pv-hooks.js`, `src/civics.js`, `test/api/hooks.test.js` | J0-08, accord | J8-03 |
| J8-02 | `api.campaign(gov)`, espionnage (`influence`, `sabotage`, `incite`, `annex`, `purchase`) | `src/api.js`, `test/api/war.test.js` | J8-01 | — |
| J8-03 | Saynètes par tactique (embuscade, raid, pillage, assaut, siège) au point de frontière le plus proche de la capitale, 3 à 6 s, colonnes et blessés de `citizens.js` | `map/scenes/war.js` | J7-03 | J8-01 |
| J8-04 | Occupation : drapeau, couleur qui se répand selon la distance depuis la ville ; désoccupation inverse | `map/scenes/occupy.js` | J8-03 | — |
| J8-05 | Annexion (affiches, urnes pendant `sab`), achat (convoi), sécession | `map/scenes/annex.js` | J8-03 | — |
| J8-06 | Unification : murs qui s'effondrent, frontières qui se dissolvent en 5 s, noms qui se fondent ; règle `world_control` | `map/scenes/unify.js` | J8-04 | — |
| J8-07 | Espions visibles (personnage qui part vers la capitale rivale, nuage ou étincelle de sabotage) | `map/actors.js` | J7-04 | — |
| J8-08 | Parcours de campagne dans l'interface : tactique + bataillon + estimation → action → carte-résultat (pertes, butin) | `ui/panels/nation.js`, `ui/panels/military.js` | J8-02 | — |
| J8-09 | Raids et sièges subis : la menace se voit venir sur la carte, puis l'issue + toast | `map/scenes/raid.js`, `ui/toast.js` | J8-01 | — |
| J8-10 | Essais par tactique (scripts CDP), intégration de B8 | `tools/phone-test/j8.js` | tout J8 | — |

**Critères.**
1. Chaque tactique joue sa saynète en 6 s au plus.
2. Issue identique à celle d'Evolve (test de l'enveloppe).
3. Unification : drapeaux effacés → frontières dissoutes → règle `world_control`.
4. Lignes 21, 23 et 32 (événements de guerre) « fait ».

---

### 4.11 J9 — Tout le jeu sans l'interface classique (ères 0 à 5 et prestige)

**Objectif.** Combler toutes les lignes de couverture qui ne dépendent pas de l'espace. À la fin de J9, un joueur **ne voit jamais**
l'échafaudage jusqu'à l'ère `globalized` comprise, prestige compris.
**Drapeau.** Aucun nouveau.
**Briefs.** Petites pièces d'interface pour les panneaux Science et Prestige (inclus dans B1/B2 si possible ; sinon un brief court).

| ID | Tâche | Fichiers | Dépend de | // |
|---|---|---|---|---|
| J9-01 | **Audit de couverture** : relire `index.js` (`loadTab`), `actions.js`, `civics.js`, `resources.js`, `industry.js`, `arpa.js`, `governor.js` pour compléter l'annexe A (toute interaction oubliée, chaque bâtiment `special`, chaque réglage) | `ui/coverage.js` | J2 | — |
| J9-02 | ARPA : onglet « Great projects » du tiroir Construire (+1 %, +10 %), échafaudage géant qui monte sur la carte | `src/api.js`, `ui/panels/build.js`, `map/landmarks.js` | J9-01 | — |
| J9-03 | Génome, CRISPR, sang : panneau Science | `src/api.js`, `ui/panels/science.js`, `test/api/genetics.test.js` | J9-01 | — |
| J9-04 | Panneaux spéciaux des bâtiments (`special` / `sAction` / `drawModal`) : un par bâtiment concerné | `src/api.js`, `ui/panels/special/*.js` | J9-01 | — |
| J9-05 | Prestige : chaque reset avec un **appui long de 2 s** et un écran récapitulatif (ce qu'on gagne, ce qu'on perd) ; cicatrices de MAD inscrites au journal | `ui/panels/prestige.js`, `map/journal.js` | J3-07 | — |
| J9-06 | Choix de planète et défis (`setPlanet`, `setChallengeScreen`) en écran plein, au début d'une partie | `ui/panels/planet.js` | J9-01 | — |
| J9-07 | Réglages : notation des nombres (`affix`), sons, mouvements, taille du texte, caméra qui suit, performance ; réglages d'Evolve qui ne servaient que l'ancienne interface marqués « abandonnés » dans l'annexe A ; **locale forcée en anglais** (D1) | `ui/panels/settings.js`, `src/vars.js` | J4-08 | — |
| J9-08 | Sauvegarde : export et import (LZString) ; dans Anki, par le pont `pycmd` existant | `ui/panels/save.js`, `anki-host.js` | — | — |
| J9-09 | Archives : statistiques, exploits, avantages ; wiki local (`wiki.html`) | `ui/panels/archives.js` | — | — |
| J9-10 | Panneau Anki (cartes du jour, flamme, réserve, lettre en attente) | `ui/panels/anki.js` | J4-05 | — |
| J9-11 | Objectifs (3 au plus, tirés de l'état et des exploits proches) | `ui/objectives.js` | J2-02 | — |
| J9-12 | Événements (`events.js`) : chaque événement a une animation sur place et un toast | `map/scenes/events.js` | J8-09 | — |
| J9-13 | Menu, aide, revoir l'onboarding | `ui/panels/menu.js` | — | — |
| J9-14 | Compteur d'ouvertures de l'échafaudage : enregistré dans `global.pv`, affiché dans la page de couverture | `ui/coverage.js` | — | — |
| J9-15 | **Test réel de deux semaines** de Mathéo (phase 3 du PLAN) avec J1 à J9 ; relevé du compteur | — | tout J9 | — |
| J9-16 | Essais Anki par Mathéo (« software » et GPU) | — | tout J9 | — |

**Critères.**
1. Toutes les lignes de l'annexe A hors 29 et 30 sont « fait » ou « abandonné par décision ».
2. Compteur d'ouvertures de l'échafaudage = 0 pendant les deux semaines de Mathéo.

---

### 4.12 J10 — Les ères suivantes et la nuit (une vague par ère)

**Objectif.** Pour chaque ère à partir de `globalized` : les bâtiments L0 (par la méthode `METHODE-SPRITES.md`), le jeu de tissu, le matériau
d'interface (R25 §9.4), les lumières de nuit. Une seule fois, au début de J10 : la nuit (ligne jour-nuit qui balaie la carte, lumières par
époque, pixels `GLOW`), les règles de l'écuménopole (districts dictés par la géographie, patrimoine, accents des anciennes nations, nature
protégée, mégastructures), les échos au sol des bâtiments spatiaux, le fondu tramé de Bayer au changement d'ère et de saison.
**Drapeau.** `night`, puis un drapeau par ère tant qu'elle n'est pas validée.
**Briefs.** Une vague par ère (**B9a** `globalized`, **B9b** `early_space`, …) : inventaire, optimisation et prompt de la méthode existante, plus
le tissu, le matériau d'interface et les règles `GLOW`.

Tâches type d'une vague (environ 10) : inventaire (rapport), optimisation (rapport), prompt (rapport), brief envoyé par Mathéo, vérification de
la livraison dans Node (auto-contrôle), branchement des compositeurs dans `map/art/l0.js`, tissu L0/L1, blocs L2 et pictogrammes L3, jetons
d'interface de l'ère, images de référence, essais. Tâches uniques du début de J10 : `map/night.js`, `map/ecumenopolis.js`,
`map/space-echo.js`, `map/transition.js` (Bayer), soit environ 6.

**Critères par vague.**
1. Auto-contrôle du kit : 0 problème.
2. Néon ≤ 10 % des pixels d'une vue de nuit.
3. Contraste ≥ 4,5:1 pour le thème d'interface de l'ère.
4. Images de référence à jour.
5. Mathéo valide la livraison.

---

### 4.13 J11 — L'espace

**Objectif.** Le globe (texture équirectangulaire tirée de L4/L3, table de correspondance en Canvas 2D, rotation, ligne jour-nuit) quand on
dézoome au-delà de L4 à partir de `early_space` ; les régions spatiales dans le tiroir Construire (même `runAction`, onglets par région) ; les
panneaux tardifs réécrits (labo de mechas, chantier naval, alchimie, éjecteur, cargo et ravitaillement). À la fin, **couverture à 100 %**.
**Drapeau.** `globe`.

| ID | Tâche | Fichiers | Dépend de |
|---|---|---|---|
| J11-01 | `map/globe.js` : table pixel → (longitude, latitude), 256 px, 65 000 lectures par image, rotation | `map/globe.js` | J3-12 |
| J11-02 | Transition planète ↔ globe au dézoom | `map/camera.js`, `map/compositor.js` | J11-01 |
| J11-03 | Régions spatiales dans le tiroir Construire (`space`, `interstellar`, `galaxy`, `portal`, `tauceti`, `eden`) | `ui/panels/build.js`, `src/api.js` | J9 |
| J11-04 à J11-09 | Un panneau tardif par tâche, réécriture testée contre l'original : labo de mechas, chantier naval, alchimie, éjecteur, cargo, ravitaillement | `src/api.js`, `ui/panels/late/*.js`, `test/api/late-*.test.js` | J11-03 |
| J11-10 | Satellites et stations visibles en orbite du globe | `map/globe.js` | J11-01 |
| J11-11 | Moteur WebGL2 **seulement** si les mesures du globe l'exigent hors pilote « software » | `map/renderGL.js` | mesures |
| J11-12 | Essais, couverture à 100 % vérifiée par la page de couverture | — | tout J11 |

**Critère.** Annexe A : 100 % « fait » ou « abandonné par décision ».

---

### 4.14 J12 — Détachement (retrait de l'interface classique)

Détaillé au §6.2. Neuf tâches : gardes « sans interface », équivalence moteur avec et sans DOM, essai d'endurance, `anki-bridge.js` et
outils sur `EvolveAPI`, retrait des bibliothèques mortes, retrait d'`anki-village.js`, de `anki-skin.js` et de `pixel.css`, œufs et bonbons
recréés sur la carte, contrôle de la taille du paquet, essais Anki par Mathéo.
**Critères.**
1. Aucune erreur console pendant un essai d'endurance de 2 heures de jeu simulé (Brave, CDP).
2. Moteur équivalent avec et sans DOM (même empreinte de `global` sur 10 000 ticks, `Math.random` semé).
3. Paquet plus léger : Buefy, Popper, Sortable, Chart.js et les feuilles de style mortes retirés.
4. Mathéo valide la date du retrait (§0.3 n° 6).

### 4.15 J13 — Finitions

Disposition **portrait** complète (feuilles du bas à 2 crans, barre de 5 hubs) ; **bureau** avec tiroirs ancrés de 420 px, rail des ressources
repliable, palette de commandes Ctrl+K, raccourcis (B, R, P, E, C, A, J, Échap, 1-9) ; réglages de performance Auto / Économie / Max
(mesure de 3 s puis réglage du zoom L0 maximal, du nombre de citoyens, des particules, de la nuit, du DPR) ; bouton « Postcard » (PNG local) ;
accessibilité (navigation au clavier complète, taille du texte, contrastes) ; cicatrices de MAD sur la planète et départ du vaisseau du
bioseed (`prep_ship`, `launch_ship`). Environ 12 tâches.
**Critères.**
1. Une partie complète jouable en portrait sur le téléphone.
2. Le mode Auto choisit un réglage qui tient les seuils du §4.2 sur Brave avec CPU bridé ×4.
3. Navigation au clavier complète sur bureau.

---

## 5. Tests et outillage

Une seule commande, qui reste celle du projet élargie :
`NODE_PATH=~/outils/esbuild/node_modules node --test anki/*.test.js test/**/*.test.js` (Node 24 sait développer les motifs), plus les tests
Python de l'add-on (`python3 -I -m unittest discover -s addon -p 'test_*.py'`).

### 5.1 Tests de l'API et du moteur (Node)
- **Banc du moteur** (`tools/engine/harness.js`, J0-08) : le vrai `src/` empaqueté par esbuild dans un faux navigateur (base actuelle :
  `tools/budget/load-game.js`). Ajouts : `$(obj)[0] === obj`, capture des options de `Vue`, `Math.random` semé.
- **Réécritures** : pour chaque geste réécrit dans `api.js`, deux copies du même état ; on applique l'original capturé à l'une et notre
  réécriture à l'autre, puis on compare `JSON.stringify` des deux `global` (en ignorant les champs de temps). Un test par geste et par cas
  limite (plafond, zéro, ressource cachée).
- **Test de fumée des exports** : chaque nom attendu dans `src/` existe et a la bonne arité. C'est ce test qui casse en premier lors d'une
  fusion avec l'amont.
- **Empreinte croisée** (`tools/hash-check.html`) : la même page calcule `hashPlanet()` et `hashPlan()` pour 5 graines, dans Brave, Fennec et
  Qt ; les valeurs doivent égaler `test/golden/hashes.json`.

### 5.2 Tests de propriété de la carte (Node)
- **Déterminisme** : même `(graine, journal, Snap)` → même empreinte du plan, en recalculant de zéro, dans un ordre de chargement différent,
  et après sérialisation et relecture du journal.
- **Monotonie** : pour toute progression semée `P1 < P2`, l'emprise à P1 est incluse dans l'emprise à P2 ; le propriétaire d'une tuile ne
  change jamais ; ajouter des bâtiments ne déplace aucune instance existante (slot `k` stable) ; seule la décroissance retire, par la fin.
- **Grands sauts** (des heures hors ligne) : appliquer S0 → S1000 d'un coup donne le même plan **et le même journal** que S0 → S1 → … →
  S1000 pour tout ce qui est dérivé (les décisions dues sont prises dans l'ordre fixe).
- **Resets** : MAD (même graine, cicatrice ajoutée, villes remises à zéro), bioseed et les autres resets qui changent de planète (nouvelle
  graine), journal corrompu ou absent (reconstruit, valide), version de journal inconnue (reconstruit).
- **Taille** : journal compressé < 1 Ko dans le pire cas fabriqué.
- **Gros volumes** : 1 000 progressions aléatoires (semées, donc rejouables), budget de temps vérifié (plan complet ≤ 50 ms dans Node).

### 5.3 Images de référence (sans navigateur)
- `tools/render-map.js` (J3-17) charge kit, core et map dans Node avec un faux canvas qui **garde** les `putImageData`. Il implémente aussi un
  petit `drawImage` au plus proche voisin, ce qui permet de tester le compositeur. C'est la méthode de `tools/render-era3.js`.
- Les **empreintes** des images sont dans `test/golden/hashes.json`. En cas d'écart, le PNG attendu et le PNG obtenu sont écrits dans
  `/data/data/com.termux/files/usr/tmp/pv-golden/` pour comparaison à l'œil. Une mise à jour d'empreinte est un acte **volontaire** (option
  `--update`), noté dans la description de la tâche.
- Jeu de référence : un morceau par palier pour 3 graines × 2 états (début et fin d'ère 3), le morceau de couture, la capitale (legacy puis
  portée), routes et rails, frontières pour les états fabriqués.
- Contrôle de palette : tout pixel cuit appartient à la palette du kit (comme `selfCheck`), sauf les fondus, qui n'existent jamais au repos.

### 5.4 Interface (Node et navigateur)
- Node : modèles de vue (puces automatiques, conseiller, objectifs) sur des états fabriqués ; formatage des nombres et des jours ; toute clé
  `t()` existe ; aucune chaîne en dur dans `ui/` hors `strings-en.js` (test de garde qui cherche des littéraux suspects dans les appels DOM).
- Navigateur (CDP, Brave, port 8766) : scripts par jalon qui touchent l'écran (`Input.dispatchTouchEvent`), relèvent les erreurs console, le
  temps de mise à jour du HUD (`perf.js`) et font des captures d'écran.
- **Netteté** : sur une capture CDP au repos, la proportion de pixels hors palette doit être ≈ 0 (un flou de `drawImage` se voit tout de suite).

### 5.5 Performance sur le téléphone
- **Brave** : `tools/phone-test/bench.js` (J0-06) se branche par CDP sur l'onglet `127.0.0.1:8766`, applique le bridage CPU, lance les
  scénarios et récupère le JSON. Rappels du `README` : ouvrir l'onglet explicitement dans Brave, ramener Brave au premier plan (un onglet caché
  est gelé), jamais le port 8765.
- **Fennec** (pas de socket DevTools) : ouvrir `http://127.0.0.1:8766/tools/map-bench/bench.html` à la main ; la page lance les scénarios et
  envoie le JSON à `bench-server.js`, qui l'écrit dans `/data/data/com.termux/files/usr/tmp/pv-bench/`.
- **Anki** : entrée de menu de l'add-on qui ouvre le banc ; Mathéo règle le pilote vidéo sur « Software » dans les préférences d'Anki, lance,
  appuie sur « Copy » et colle le résultat dans la conversation. Puis en GPU. Fenêtre 1 100 × 800, puis maximisée.
- Les résultats sont gardés dans `rapports/27-mesures-j0.md` puis comparés à chaque jalon (régression > 10 % = tâche de correction).

### 5.6 Nouveaux outils
| Outil | Rôle | Jalon |
|---|---|---|
| `tools/map-bench/` (page, scénarios, serveur de résultats) | banc de mesure multi-moteurs | J0 |
| `tools/engine/harness.js` | vrai moteur Evolve dans Node, captures de `Vue` | J0 |
| `tools/hash-check.html` | empreinte croisée entre moteurs | J3 |
| `tools/map-inspect.html` | inspecteur du monde (couches, graines, morceaux, temps) | J3 |
| `tools/render-map.js` | rendus de référence sans navigateur | J3 |
| curseur de progression (dans l'inspecteur) | faire défiler une partie de 0 à la fin, saut direct, comparaison saut / pas à pas | J5 |
| `tools/savegen/` | fabricant de sauvegardes et de `Snap` (ères, états étrangers, Anki) ; généralise `era3save.js`, port 8766 seulement | J5 (début en J3) |
| `tools/coverage.html` | couverture de l'interface (annexe A), compteur d'échafaudage | J1 → J12 |
| `tools/phone-test/j*.js` | parcours automatiques par jalon (CDP) | J1 → J13 |
| `tools/gen-sintable.js` | génère la table de sinus entière de `core/dmath.js` | J3 |

### 5.7 Tests de garde (automatiques)
`test/guards.test.js` parcourt `core/`, `map/`, `ui/`, `src/api.js`, `src/pv-hooks.js`, `pv-boot.js` et échoue sur :
`http://` ou `https://` hors commentaires de référence, `googleapis`, `fonts.g`, `gstatic`, `fetch(` vers une adresse non relative,
`import(` distant, `<link` vers un hôte, et, **dans les fichiers de génération du monde**, `Math.random`, `Date`, `performance.now`,
`Math.sin`, `Math.cos`, `Math.exp`, `Math.pow`, `Math.hypot`, `Math.atan2`. Il vérifie aussi qu'aucun fichier de `kit/` n'a changé hors d'une
tâche d'intégration de livraison (comparaison à une empreinte notée).

---

## 6. Migration

### 6.1 Du village 24 × 24 à la capitale

| Étape | Jalon | Ce qui se passe | Risque et parade |
|---|---|---|---|
| S0 | J1-J2 | Le village legacy, inchangé, en plein écran sous le nouveau HUD ; l'adaptateur sert le contrat (`pick`, `ghost`, `highlight`, `toScreen`, `focus`, `fx`) | aucun changement de rendu |
| S1 | J3 | Le village devient un **méga-sprite** au site de la capitale : son terrain (`layout()`) est tamponné dans la planète, rivière et collines raccordées. Rendu legacy seulement visible, en L0, au repos (≤ 4 Hz) ; instantané pour les paliers plus lointains | coût du legacy (26 Mo, recompositions) : mesuré en J0-05, limité par les règles de visibilité ; échelles L0 paires pour `V.off` |
| S2 | J5 | Les bâtiments comptés sont dessinés par la carte. **Les slots du 24 × 24 sont les premiers de chaque liste**, ramenés en coordonnées monde : la disposition du centre historique reste **identique**. Les instances au-delà débordent vers les tuiles de la planète. Citoyens portés ; inventaire de parité (J5-12) ; méga-sprite retiré quand l'image de référence le permet | perte de « vie » (chat, guirlandes, enseignes…) : inventaire exhaustif tiré du code, image de référence comparée au statique legacy |
| S3 | J5-J6 | Systèmes de l'ère 3 sortis des lots en dur (`era3.js:40-43`) : puits de pétrole → gisements, quai → côte, rail → réseau de J6 | positions différentes de l'ère 3 actuelle : voulu, montré à Mathéo |
| S4 | J10 | Le centre historique suit le réaménagement par ère (patrimoine ≈ 10 %, monuments jamais reconstruits) : la capitale de l'écuménopole ne garde pas un cœur de chaumières | goût : Mathéo valide le premier réaménagement |
| S5 | J12 | `SpriteKit.run`, `anki-village.js` et le chemin `compose`/`present` ne sont plus chargés ; le kit reste la bibliothèque des compositeurs | rien ne doit encore appeler `SpriteKit.run` (test de garde) |

### 6.2 Le retrait de l'interface classique (D2)

**Ce qui en dépend aujourd'hui, et ce qu'on en fait** :

| Dépendance | Où | Traitement | Jalon |
|---|---|---|---|
| Rendu des onglets (`mainVue`, `loadTab`, `drawCity`, `drawTech`…) | `index.js:18, 318`, `main.js:208`, `actions.js:6024, 6091` | **Gardes « sans interface »** de 3 à 5 lignes, ou construction dans une racine détachée (choix fait dans la tâche J12-01 selon l'essai) | J12 |
| Liaisons Vue (`vBind`, ~210 appels dans `src/`) | `functions.js:1158` | sans élément, `vBind` crée une instance non montée : on mesure ; si c'est coûteux, `vBind` devient un no-op sous la garde | J12 |
| jQuery dans la logique (`payCosts($(this)[0])`, ~3 300 `$(` au total) | partout | **reste chargé** (local) : c'est une dépendance du moteur, pas de l'interface | — |
| Rôle de « moteur caché » | — | Evolve tourne sans DOM rendu ; preuve dans Node (banc) **et** dans le navigateur (essai d'endurance) | J12 |
| Clone profond `deepClone(global)` / `updateDebugData` | `main.js:8108-8112`, `debug.js:41-46` | freiné en J1 ; **coupé** en J12 (`settings.expose` faux par défaut, réactivable en mode développeur pour les outils) | J1 / J12 |
| Lecteurs de `window.evolve.global` | `anki-bridge.js:24`, `kit/spritekit.js` `run()`, `tools/phone-test/*.js` | passent par `EvolveAPI` | J1 / J12 |
| Infobulles (`popover`, `breakdownPopover`) | `functions.js:18`, `resources.js:2190` | sans élément, rien n'est lié ; notre infobulle réutilise `actionDesc` et `breakdown` | J1 → J12 |
| Journal des messages | `functions.js:391-425` | `#msgQueueLog` absent = sans effet ; notre Journal lit `message_logs` | J2 |
| Raccourcis clavier d'Evolve (`keyMap`, modificateurs de quantité) | `vars.js:1499-1511` | `act()` neutralise le multiplicateur (J1-02) ; nos raccourcis capturent d'abord (J13) ; les écouteurs d'Evolve sont désactivés sous la garde | J1 / J12 |
| Œufs de Pâques et bonbons d'Halloween (cherchent `#egg…` dans le DOM) | `main.js` (après 8114) | recréés sur la carte (D26) | J12 |
| Bibliothèques d'interface : Buefy (CSS + JS), Popper, Sortable, Chart.js, weather-icons, `evolve.css`, `pixel.css`, `anki-skin.js` | `index.html` | retirées du chargement et du paquet après vérification qu'aucun module n'en dépend | J12 |
| Vue lui-même | `lib/vue.min.js` | gardé tant que `vBind` instancie ; retiré seulement si la garde rend `vBind` inerte et que l'essai d'endurance passe | J12 |
| Réglages qui ne servaient que l'ancienne interface (thème, police, onglets…) | `index.js` (`settings1…17`) | marqués « abandonné » dans l'annexe A | J9 |

**Étapes de J12** :
1. **J12-01** : choisir la neutralisation la moins invasive (gardes ou racine détachée) en lançant le jeu dans Brave avec l'option et un
   compteur d'erreurs ; écrire les gardes (`[anki-fork]`).
2. **J12-02** : **équivalence** dans le banc Node et dans le navigateur. Deux parties, avec et sans DOM, `Math.random` semé, 10 000 ticks
   avec achats scriptés : même empreinte de `global` (hors champs de temps).
3. **J12-03** : **essai d'endurance** de 2 heures de jeu simulé par CDP (achats, recherches, métiers, commerce, guerre, reset MAD) : 0 erreur
   console.
4. **J12-04** : `anki-bridge.js`, les outils et le kit legacy restant sur `EvolveAPI` ; `expose` faux par défaut.
5. **J12-05** : retrait des bibliothèques et des feuilles de style mortes ; taille du paquet avant/après.
6. **J12-06** : retrait d'`anki-village.js`, `anki-skin.js`, `pixel.css`, du bouton « Classic (dev) », du drapeau `ui`.
7. **J12-07** : œufs et bonbons sur la carte.
8. **J12-08** : essais Anki par Mathéo (« software » et GPU) sur son vrai profil.
9. **J12-09** : mise à jour du HANDOFF (décision publiée par Mathéo).

**Risques propres au retrait** : une dépendance cachée au DOM fait planter une boucle (une exception dans `fastLoop` arrête le tick) →
essai d'endurance et équivalence avant tout retrait. Un comportement disparaît sans bruit (œufs, raccourcis, réglages) → audit J9-01 et
annexe A. La fusion avec l'amont touche les fichiers gardés → gardes d'une ligne, marquées, listées.

---

## 7. Registre des risques

Probabilité (P) et impact (I) : F faible, M moyen, É élevé.

| # | Risque | P | I | Signal précoce | Parade |
|---|---|---|---|---|---|
| R1 | **Qt WebEngine en pilote « software » trop lent** (tout est fait par le CPU, mélanges alpha compris) | M | É | J0 : S1/S2 au p95 > 33 ms dans Anki « software » | morceaux opaques, pas de fondu, tampon à DPR 1, moins de couches ; détection du mode logiciel (temps d'image mesuré au démarrage) → réglage Économie automatique ; échelons du §4.2 ; Mathéo tranche |
| R2 | **Fennec plus lent que Chromium** (`drawImage` agrandi, `putImageData`) | M | M | J0 : Fennec au-delà de +30 % | politique par moteur (DPR, fondu, nombre de particules) ; Fennec n'est pas la cible produit (D8), mais doit rester agréable |
| R3 | **Pauses du ramasse-miettes** | M | M | images > 50 ms périodiques en défilement stable | zéro allocation dans l'image, réserves de tampons de cuisson, tampons circulaires de particules, pas de fermetures dans les boucles chaudes |
| R4 | **Mémoire sur les téléphones modestes** (onglet rechargé, plantage) | M | É | mémoire comptée > 48 Mo ; rechargements de l'onglet | plafonds par palier, `deviceMemory`, pages d'atlas, retrait rapide du legacy (26 Mo) en J5, écoute de la perte de contexte |
| R5 | **Flou de `drawImage`** (`imageSmoothingEnabled` remis à zéro au redimensionnement, coordonnées non entières, CSS qui étire) | É | M | pixels hors palette sur une capture au repos | réappliquer le réglage après chaque redimensionnement, coordonnées entières, tampon = CSS × DPR, test de netteté (§5.4) |
| R6 | **Dérive du déterminisme** (moteurs, ordre d'itération, retouche du générateur) | M | É | empreintes différentes entre Node et Fennec ; plan qui change après rechargement | règles du §3.7, test de garde, empreinte croisée, `gen` versionné et figé après la diffusion publique |
| R7 | **Volume d'art** (13 ères × tissu × paliers) | É | É | briefs en retard sur les jalons ; vagues J10 qui s'allongent | L2 à L4 générés, L1 réduit automatiquement, tissu en modules, une vague par ère, art provisoire toujours jouable, priorité aux ères 1 à 4 |
| R8 | **Changements d'Evolve en amont** | M | M | conflits sur les fichiers touchés ; test de fumée des exports qui casse | empreinte minimale dans `src/` (§2.10), marqueur `[anki-fork]`, réécritures testées contre les originaux capturés, liste de contrôle de fusion |
| R9 | **Dépendances cachées au DOM** au retrait de l'interface classique | M | É | erreurs console en essai sans DOM | banc Node, essai d'endurance, équivalence avec et sans DOM, retrait par étapes (§6.2) |
| R10 | **Réécritures qui divergent d'Evolve** (gestes Vue) | M | É | test de comparaison qui échoue après une fusion | capture des méthodes Vue originales dans le banc ; un test par geste |
| R11 | **À-coups pendant les rattrapages** (clone profond + `drain` ticks par tick réel) | É | M | J0-07 : `fastLoop` × `drain` > 30 ms | frein du clone (J1), réglage de `drain` (J4), cuisson ralentie pendant le rattrapage |
| R12 | **Densité de l'interface sur 360 px de haut** | M | É | séance de Mathéo > 2 min, taps manqués | hiérarchie par fréquence, tiroirs, séances chronométrées à chaque jalon d'interface |
| R13 | **Dérive du périmètre et du calendrier** | É | M | un jalon qui double sa durée | jeu jouable à chaque jalon, drapeaux, coupes possibles listées (J10 par vagues, portrait en J13) |
| R14 | **Export de Claude Design qui écrase une retouche locale du kit** | M | M | différence entre `kit/` et la dernière livraison | aucune retouche du kit par ce chantier (D21), `kit-patches/`, test de garde |
| R15 | **Corruption ou grossissement de la sauvegarde** | F | É | journal invalide au chargement, sauvegarde > attendu | validation et reconstruction, test de taille, `global.pv` borné |
| R16 | **Profil web éphémère de l'add-on** (pas d'IndexedDB qui survive, `addon/__init__.py:7`) | É (connu) | F | — | rien n'est mis en cache durable : la planète se régénère en ≤ 300 ms |
| R17 | **Conflits de gestes** (tirer pour rafraîchir, geste retour d'Android, double tape du navigateur) | M | M | rechargements accidentels | `touch-action: none`, `overscroll-behavior: none`, plein écran sur bouton |
| R18 | **Le téléphone de Mathéo masque les téléphones modestes** (Snapdragon 7+ Gen 3) | É | M | — | passes CPU ×4 à chaque mesure, réglage Auto (J13) |

---

## 8. Organisation du travail entre instances de Claude Code

### 8.1 Qui fait quoi
- **Isaac** (téléphone) coordonne : il découpe les jalons en tâches, lance les agents, relit chaque diff, lance les essais sur le téléphone
  (CDP sur Brave, banc pour Fennec), prépare les briefs et les livre à Mathéo. Il ne commite que si Mathéo le décide.
- **Bruno** (PC), par le pont, dans la marge de collègues fixée par Mathéo : mesures sur Chromium et Firefox de bureau, relecture croisée des
  tâches de rendu et des réécritures d'`api.js`, préparation des listes à cocher pour Anki. **Les essais dans Anki sur le vrai profil restent
  ceux de Mathéo** (HANDOFF).
- **Agents de tâche**, un par tâche, chacun dans son **worktree** (`isolation: worktree`), sur une des pistes :

| Piste | Exemples | Peut tourner en même temps que |
|---|---|---|
| Carte, modèle pur (Node seulement) | planète, journal, croissance, slots, routes, nations | tout |
| Carte, rendu | cuisson, morceaux, compositeur, caméra, acteurs | modèle pur, interface |
| Interface | HUD, tiroirs, panneaux, sons | carte |
| API et `src/` | `api.js`, `pv-hooks.js`, réécritures | interface (contrat figé d'avance) |
| Outils et tests | bancs, inspecteur, fabricant, couverture | tout |
| Art | briefs, intégration des livraisons | tout (Mathéo envoie à Claude Design) |

Règle anti-collision : **un fichier n'appartient qu'à une tâche à la fois**. `src/api.js` est le seul point chaud : ses ajouts se font
par groupes (un groupe = une tâche), dans des sections séparées du fichier.

### 8.2 Le contexte à donner à chaque tâche

| Type de tâche | Documents à lire |
|---|---|
| Toute tâche | ce rapport (§0, §2, le jalon concerné), `HANDOFF.md`, les en-têtes des fichiers touchés |
| Carte, modèle | R24 §2, §5, §6 ; §3 de ce rapport ; `map/coords.js` ; règles de déterminisme §3.7 |
| Carte, rendu | R24 §3, §4 ; §2.4 à §2.8 ; `rapports/27-mesures-j0.md` ; `kit/spritekit.js` (Pix, `sprite`, `shell`) |
| Interface | R25 §2 à §7 (et §8 pour le portrait) ; §2.5 et §2.9 à §2.11 ; annexe A |
| API et `src/` | R25 §2.2, §7.2 ; §2.10 ; `tools/engine/harness.js` ; le fichier d'Evolve concerné **autour de la ligne citée** |
| Art (brief) | `METHODE-SPRITES.md`, R25 §9, R24 §8, le dernier brief de la même famille (`rapports/22`, `23`) |

### 8.3 Conventions
- **En-tête de fichier** (anglais) : rôle, API publique, dépendances, invariants (par exemple « pure, deterministic, no DOM »), « offline,
  zero dependency ». Format du kit (`/* … */` en tête de l'IIFE).
- **Noms** : fichiers en minuscules avec tirets ; espace de noms `PV.core`, `PV.map`, `PV.ui` ; événements du bus `domaine:verbe`
  (`map:tap`, `game:built`, `ui:open`) ; préférences dans `global.pv.prefs`.
- **Tests** : `test/<piste>/<module>.test.js`, `node:test` et `node:assert/strict`, comme `anki/*.test.js`. Une tâche ajoute ses tests ; le
  nombre total ne baisse jamais.
- **`src/`** : seulement les changements de la liste du §2.10, marqués `[anki-fork]`, avec la ligne d'origine en commentaire pour les
  réécritures.
- **`kit/`** : jamais modifié, sauf par la copie d'une livraison de Claude Design (tâche « intégration »).
- **Chaînes** : toute chaîne visible passe par `PV.t()` (anglais) ou par le contenu d'Evolve (`loc`, `title()`, `actionDesc`).
- **Sorties jetables** : `/data/data/com.termux/files/usr/tmp/` seulement.

### 8.4 Définition de « fini » pour une tâche
1. Tous les tests passent (Node + Python), leur nombre a augmenté ou la raison est donnée.
2. Tests de garde verts (aucun hôte externe, rien de Google, déterminisme, kit intact).
3. Si la tâche touche le rendu : images de référence à jour (mise à jour volontaire et justifiée) **et** mesure du banc sur Brave sans
   régression > 10 %.
4. Si la tâche touche l'interface : capture CDP en paysage 800 × 360 et en 1 100 × 800, aucune erreur console.
5. En-têtes de fichier présents ; aucune chaîne visible hors `strings-en.js`.
6. Compte rendu court : ce qui a changé, les fichiers, les mesures, ce qui reste. **Pas de commit, pas de poussée.**

### 8.5 Quand s'arrêter et demander à Mathéo
- un choix de **goût artistique** (palette, matériau d'interface, planche de planètes, acceptation d'une livraison) ;
- tout ce qui **publie** (commit, poussée sur le dépôt public, artifact, envoi à Claude Design) ;
- tout changement de **`src/` hors de la liste approuvée** (§2.10), ou un changement d'**équilibre** du jeu ;
- un **no-go** ou un repli de performance qui retire quelque chose au joueur ;
- toute mesure qui contredit ce plan au point d'en changer un jalon.

---

## 9. Les premières tâches concrètes (pour commencer demain)

Ces cinq tâches démarrent J0. Les quatre premières sont indépendantes et peuvent partir **en parallèle**, dans quatre worktrees.

**Tâche 1 — J0-01, le banc de mesure.**
- Créer `tools/map-bench/bench-server.js` : `node tools/map-bench/bench-server.js` sert le dépôt sur `127.0.0.1:8766` (refuse tout autre
  port), répond `POST /bench` en écrivant le corps JSON dans `/data/data/com.termux/files/usr/tmp/pv-bench/<AAAAMMJJ-hhmmss>-<moteur>.json`.
  Aucune dépendance (module `http` de Node, comme `serve.js`).
- Créer `tools/map-bench/bench.html` et `bench.js` : un `<canvas>` plein écran (`alpha: false`), un panneau de résultats, un bouton « Run »,
  un bouton « Copy ». Le module `Bench` expose `run(scenario)` : il appelle la fonction d'image du scénario à chaque
  `requestAnimationFrame` pendant 30 s, enregistre dans des `Float64Array` circulaires l'intervalle entre images et le temps JS, puis
  calcule p50, p95, p99, max, le nombre d'images > 50 ms et > 100 ms. Moteur détecté par `navigator.userAgent`, DPR, taille, et
  `performance.memory` s'il existe.
- Scénario d'essai fourni : remplir l'écran de 400 `drawImage` d'un canvas de 512 × 256 à une position qui défile (pour valider le banc
  avant le spike).
- **Fini quand** : le banc tourne dans Brave **et** Fennec sur le téléphone, et un fichier JSON arrive dans le dossier pour chacun.

**Tâche 2 — J0-02, coordonnées et planète bidon.**
- Écrire `map/coords.js` (IIFE vers `PV.map.coords`, et `module.exports` si présent) : `W`, `H`, `idx(q, r)`, `wrapQ(q)`,
  `toScreen(q, r)` → coin nord `(sx, sy)` en pixels L0, `fromScreen(sx, sy)` → `(q, r)` (calcul du losange, enroulement), `neighbors4`,
  `neighbors8`, `chunkOf(sx, sy, lod)`, `chunkRect(cx, cy, lod)`, `wrapCopies(bbox)` (décalages −32W, 0, +32W qui coupent un rectangle).
- `test/map/coords.test.js` : aller-retour sur les 32 768 tuiles, voisins symétriques, couture (`q = 0` et `q = W − 1` voisins),
  rectangles de morceaux qui pavent la bande sans trou ni recouvrement, et compatibilité avec `worldPt` du kit (`sx − sy·2 = (x − y)·16`).
- `tools/map-bench/spike-world.js` : planète de bruit simple (le `vnoise` du kit suffit pour le spike) avec niveau de mer par centile,
  4 couleurs de biome, 30 % des tuiles de terre avec un bâtiment `shell()` de hauteur tirée par hachage.
- **Fini quand** : tests verts, et une image de la planète en L4 écrite dans `/data/data/com.termux/files/usr/tmp/`.

**Tâche 3 — J0-08, le banc Node du moteur.**
- Copier `tools/budget/load-game.js` vers `tools/engine/harness.js` (l'ancien fichier réexporte le nouveau pour ne pas casser
  `anki/engine.test.js`). Ajouts :
  - `$` : si l'argument est un objet simple ou une fonction, renvoyer un objet de type tableau `[arg]` qui garde les méthodes absorbantes ;
  - `Vue` : constructeur qui pousse ses options dans `ctx.__vueCaptures` (par `el`) ;
  - option `seed` qui remplace `Math.random` par `mulberry32(seed)` dans le contexte.
- `test/api/harness.test.js` : le moteur démarre ; `$(o)[0] === o` ; après le dessin d'un onglet Métiers simulé (`defineJobs`), une capture
  contient `methods.add` ; `actions.city.basic_housing.action()` sur un état fabriqué augmente le compte de 1 et paie le bon coût.
- **Fini quand** : `NODE_PATH=~/outils/esbuild/node_modules node --test anki/*.test.js test/**/*.test.js` passe, 32 + nouveaux tests.

**Tâche 4 — J0-07, ce que coûte le moteur Evolve (mesure seulement).**
- Dans le banc Node : chronométrer `fastLoop` seul, puis `fastLoop` + `updateDebugData`, sur un état d'ère 1 et un état d'ère 3 (sauvegarde
  de `era3save.js` adaptée), 1 000 itérations ; puis un rattrapage de l'horloge à cartes (réserve de 2 000 ticks).
- Sur le téléphone, par CDP sur Brave (port 8766, partie de test) : `tools/phone-test/evo-cost.js` enveloppe `window.evolve` et
  `performance.now()` sans toucher `src/` (mesure par `PerformanceObserver` des longues tâches + chronométrage de l'appel d'une boucle de
  rattrapage), et vérifie l'appel direct `actions.city.basic_housing.action()` (R25 P0).
- **Fini quand** : un tableau (ms par tick, ms par clone, pire image pendant le rattrapage) est ajouté au brouillon de `rapports/27-mesures-j0.md`.

**Tâche 5 — J0-03 et J0-04, cuisson et compositeur du spike** (démarre quand la tâche 2 est faite).
- Cuisson CPU des morceaux de 512 × 256 à tous les paliers, tranches de 2 ms, ordre global, doublons d'enroulement ; compositeur avec LRU,
  choix du palier, fondu, barreau net, inertie, pincement, molette ; les deux variantes d'océan ; DPR plein, 2 et 1.
- Branché dans le banc comme scénarios S1 à S7.
- **Fini quand** : les scénarios tournent dans Brave et Fennec et envoient leurs résultats ; la première passe de mesures est dans le brouillon
  de `rapports/27`.

Ensuite : J0-05 (dynamique et méga-sprite), J0-06 (lanceur CDP, bridage), J0-09 (campagne, Anki par Mathéo), J0-10, J0-11 (verdict).
Dès le verdict « go », les tâches pures de J3 (J3-01 à J3-07) et les tâches de J1 démarrent ensemble.

---

## 10. Questions ouvertes

Toutes les questions des rapports 24 et 25, et celles que ce plan aurait posées, sont tranchées au §0.2. Restent seulement les points qui
appartiennent à Mathéo, déjà listés au §0.3 :
1. **Valider la liste des changements dans `src/`** (§2.10). *Recommandation : oui, en bloc ; c'est la plus petite empreinte qui permet une
   interface entièrement à nous.*
2. **La ligne « file dès le premier village »** (D5), qui change l'équilibre d'Evolve. *Recommandation : oui (1 place).*
3. **Le goût** : planche de 20 planètes (J3), chaque brief avant envoi, chaque livraison. *Recommandation : le faire à chaque jalon, sur
   le téléphone, à l'échelle réelle.*
4. **Les essais Anki** à J0, J3, J9, J12 (pilote « software » puis GPU). *Recommandation : 15 minutes chaque fois, avec la liste à cocher
   fournie.*
5. **La date du retrait de l'échafaudage classique** (J12). *Recommandation : après deux semaines de jeu réel sans ouverture.*

---

## Annexe A — Couverture de l'interface (définition de « fini » pour retirer l'interface classique)

Statuts possibles : **fait** (réécrit, testé, dans notre interface), **échafaudage** (encore par le DOM classique, mode développeur),
**abandonné** (décision notée). L'interface classique est retirée quand **toutes** les lignes sont « fait » ou « abandonné ». La page
`tools/coverage.html` affiche cette table et vérifie l'existence des fonctions d'API. La tâche J9-01 complète la liste.

| # | Interaction (R25 §2.2) | API | Place dans l'interface | Jalon | Test |
|---|---|---|---|---|---|
| A1 | Lire stocks, plafonds, taux (1) | `state()`, `core/format` | puces du HUD, tiroir des ressources | J1-J2 | modèle de vue |
| A2 | Détail d'une ressource (1) | `breakdown(res)` | fiche ressource + soulignement sur la carte | J2 | état fabriqué |
| A3 | Construire un bâtiment de cité (2) | `act('city', t, n)` | tiroir Construire, barre contextuelle | J1 | `act.test` |
| A4 | Ajouter à la file de construction (9) | `queue.add` | tiroir Construire, appui long | J2 | `queue.test` |
| A5 | Réordonner, retirer de la file (9) | `queue.move/remove` | bandeau Worksites | J2 | `queue.test` |
| A6 | Rechercher une tech (3) | `act('tech', k)` | tiroir Recherche | J2 | `tech.test` |
| A7 | File de recherche (9) | `rqueue.*` | tiroir Recherche, onglet File | J2 | `tech.test` |
| A8 | Visibilité des techs, techs dépassées (3) | `visible.tech`, `techState` | tiroir Recherche | J2 | `tech.test` |
| A9 | Métiers + / − (4) | `jobs.add/sub` | tiroir Peuple, barre contextuelle | J2 | capture Vue |
| A10 | Métier par défaut (4) | `jobs.setDefault` | tiroir Peuple (appui long) | J2 | capture Vue |
| A11 | Évolution, ère 0 (5) | `act('evolution', k)` | écran Cellule | J2 | banc |
| A12 | Sentience et passation (5) | `act('evolution','sentience')` | écran Cellule → carte | J2 | banc |
| A13 | Cueillette au clic (6) | — | **abandonné** en mode cartes (renvoi vers les révisions, rapport GD) | J2 | — |
| A14 | Artisans de la fonderie (7) | `craftsmen.add/sub` | Peuple, onglet Artisans | J2 | capture Vue |
| A15 | Artisanat manuel (8) | `craft(res, n)` | fiche ressource fabriquée, onglet Artisans | J2 | capture Vue |
| A16 | Allumer / éteindre (10) | `power.on/off` | barre contextuelle, panneau Énergie | J2 | `power.test` |
| A17 | Priorités du réseau électrique (11) | `grid.move` | panneau Énergie | J6 | `grid.test` |
| A18 | Fonderie : combustible et produit (12) | `smelter.set` | fiche Fonderie | J6 | `industry.test` |
| A19 | Usines : production (13) | `factory.set` | fiche Usine | J6 | `industry.test` |
| A20 | Marché : acheter / vendre (14) | `market.buy/sell` | panneau Économie | J6 | `market.test` |
| A21 | Routes commerciales (15) | `routes.adjust` | panneau Économie, fiche ressource | J6 | `market.test` |
| A22 | Caisses et conteneurs, les construire (16) | `storage.crate/container` | panneau Économie (Storage), fiche ressource | J6 | `market.test` |
| A23 | Impôts (17) | `civics('adj_tax'/'tax_cap')` | panneau Cité | J7 | `civic.test` |
| A24 | Régime politique (18) | `government.set` | panneau Cité | J7 | capture |
| A25 | Mercenaires (19) | `civics('m_buy')` | panneau Armée | J7 | `civic.test` |
| A26 | Tactique et bataillon (20) | `garrison.tactic/raid` | panneau Armée, fiche nation | J7 | capture |
| A27 | Campagne (21) | `campaign(gov)` | fiche nation sur la carte, panneau Armée | J8 | `war.test` |
| A28 | Espions : former, influencer, saboter, inciter (22) | `civics('t_spy'…)`, `espionage` | fiche nation | J7-J8 | `war.test` |
| A29 | Annexer, acheter, occuper, sécession (23) | `espionage('annex'/'purchase')`, `campaign` | fiche nation | J8 | `war.test` |
| A30 | Gouverneur et tâches (24) | `governor.*` | panneau Cité | J7 | capture |
| A31 | Panneaux spéciaux de bâtiment (25) | `special.<type>.*` | barre contextuelle → « Settings » | J9 | un test par bâtiment |
| A32 | Projets ARPA (26) | `arpa.build` | Construire, onglet Great projects | J9 | `arpa.test` |
| A33 | Génétique (27) | `genetics.*` | panneau Science | J9 | `genetics.test` |
| A34 | CRISPR, sang (28) | `genetics.crispr/blood` | panneau Science | J9 | `genetics.test` |
| A35 | Régions spatiales (29) | `act(region, t, n)` | Construire, onglets par région ; globe | J11 | `act.test` |
| A36 | Labo de mechas (30) | `late.mech.*` | panneau tardif | J11 | capture |
| A37 | Chantier naval (30) | `late.shipyard.*` | panneau tardif | J11 | capture |
| A38 | Alchimie (30) | `late.alchemy.*` | panneau tardif | J11 | capture |
| A39 | Éjecteur (30) | `late.ejector.*` | panneau tardif | J11 | capture |
| A40 | Cargo et ravitaillement (30) | `late.cargo/supply.*` | panneau tardif | J11 | capture |
| A41 | Journal des messages et filtres (31) | `onMessage` | toasts + tiroir Journal | J2 | état fabriqué |
| A42 | Événements (32) | `pv-hooks`, `onMessage` | animation sur place + toast | J4-J9 | scripts CDP |
| A43 | Pause (33) | — | **abandonné** (D25) | — | — |
| A44 | Réinitialisations (34) | `reset(kind)` (fonctions de `resets.js`) | panneau Prestige, appui long de 2 s | J9 | banc (MAD, bioseed) |
| A45 | Choix de planète (35) | `setPlanet` | écran de début de partie | J9 | banc |
| A46 | Défis et gènes de défi (35) | `challenges.*` | écran de début de partie | J9 | banc |
| A47 | Réglages utiles (36) : notation, sons, mouvements, texte, caméra, performance | `store`, `global.settings.affix` | Menu → Settings | J4-J9 | modèle de vue |
| A48 | Réglages de l'ancienne interface (36) : thème, police, onglets, langue… | — | **abandonné** (sans objet ; langue forcée, D1) | J9 | — |
| A49 | Export / import de sauvegarde (37) | `save.export/import` | Menu → Save (Anki : pont `pycmd`) | J9 | banc |
| A50 | Statistiques, exploits, avantages (38) | `state()` | Menu → Archives | J9 | modèle de vue |
| A51 | Wiki (38) | — | Menu → Wiki (page locale `wiki.html`) | J9 | — |
| A52 | Moral et détail (39) | `state()` | HUD (visage) + onglet Moral | J2 | modèle de vue |
| A53 | Anki : cartes du jour, flamme, réserve, horloge (40) | `AnkiVillage.status()`, `global.anki` | pastille + panneau Anki | J1-J9 | état fabriqué |
| A54 | Modificateurs de quantité Ctrl / Maj / Alt | `act(…, n)` | sélecteur ×1/×10/Max ; modificateurs gardés sur bureau par notre couche | J1 | `keymult.test` |
| A55 | Raccourcis d'onglets d'Evolve (`keyMap`) | — | remplacés par nos raccourcis (J13) | J13 | — |
| A56 | Œufs de Pâques, bonbons d'Halloween | — | objets cachés sur la carte (D26) | J12 | script CDP |
| A57 | Infobulles d'action (coûts, effets, minuteurs) | `describe()` (`actionDesc`) | infobulle et « i » de la barre contextuelle | J1 | état fabriqué |
| A58 | Échelle de taille de la file (fusion de file, réglage `q_merge`) | `queue.*` | réglage de Worksites | J2 | `queue.test` |

## Annexe B — Mesures faites pour ce plan

Téléphone de Mathéo : OnePlus CPH2663, `SM7675` (Snapdragon 7+ Gen 3), 8 cœurs, Node 24.17. Scripts jetables :
`/data/data/com.termux/files/usr/tmp/plan26/bench.js` (village legacy, faux canvas) et `/data/data/com.termux/files/usr/tmp/plan26/gen.js`
(prototype de génération).

- Tests existants : **32/32** (Node) et **7/7** (Python) au 2026-11-02.
- Village legacy d'ère 3 (§1.3) : première image 435 ms ; moyenne 1,75 ms, p95 9,55 ms, max 11,96 ms de JS par image à 60 Hz ;
  12 `putImageData`/s ; 94 recuissons du calque statique en 10 s ; `compose` 9,2 ms avec recuisson et 3,6 ms sans ; `up()` 2,3 ms ;
  `ATLAS` 595 entrées et 6,0 Mo ; compositeur de maison 0,26 ms, d'usine 0,53 ms ; `shell()` 0,43 ms.
- Prototype de génération 128 × 256 (3 exécutions) : total 85 à 99 ms (bruit 3D fBm à 6 octaves 27-29 ms ; Priority-Flood avec tas
  naïf 42-54 ms ; écoulement 8 ms ; 24 Dijkstra de 1 500 tuiles 4 ms ; FNV 3-4 ms). Empreinte stable d'une exécution à l'autre (`62c2a787`).
  **Attention** : ce prototype utilise `Math.cos/sin`, interdits dans la version finale (§3.7).
- Couplage au DOM de `src/` : environ 3 300 appels `$(`, 210 `vBind`, 100 `popover` ; `anki.js`, `events.js`, `resets.js`, `prod.js`,
  `locale.js` et `debug.js` n'en ont aucun.

