# GD — L'horloge (D4) et le volume (D10) : décisions de game design

> **Mise à jour du 2026-10-20** : le rendement et l'horloge du rapport GD sont appliqués, avec une **aube à 75** (décision de Mathéo), un bonus « journée accomplie » de 15 crédits et `E(n)` à `full 60, soft 10`. Voir `B-interface.md` §3 bis et `PLAN.md` §2.

*Agent game designer, 2026-10-20. J'ai seulement lu et écrit des documents, et lancé des simulations dans `rapports/plan/gd-sim/`. Je n'ai touché ni au code du jeu ni à la branche `socle-anki`.*

**Légende**
- **[code]** : vérifié dans le code de `socle-anki` (`git show socle-anki:<chemin>`).
- **[sim]** : calculé par `gd-sim/`. Les durées sont **hypothétiques** : elles reposent sur le budget B6 et sur un modèle de collection approché (§3.2).
- **[jugement]** : mon jugement de conception.
- **[G1]** : constat de l'audit G1.
- **[mémoire]** : source de game design citée de mémoire, non revérifiée.

---

## 0. Les décisions en bref

| | Décision | Réglage par défaut |
|---|---|---|
| **Q1. Mode de l'horloge** | `cards`. C'est le seul mode proposé dans le jeu. `original` reste dans le code pour le jeu web et le développement, sans réglage dans le jeu. | `clock.mode = 'cards'`, posé par l'add-on à la création de la partie |
| **Q1. Production passive** | **Aucune**, sous aucune forme liée au temps réel. Le plancher de progression ne vient pas de l'horloge : il vient de l'**aube** (Q2), donc de l'étude. | `passive = 0` |
| **Q1. Clic de cueillette** | **Converti**. Il ne produit plus rien et devient un renvoi vers les cartes (une ligne dans le journal, et le bouton « Réviser » du panneau Anki mis en évidence). Les conversions (former de l'ADN, artisanat) restent permises. | `noManual = true` (déjà le cas) |
| **Q1. Rattrapage** | Vitesse adaptative : une journée d'étude se rejoue en **3 s au plus**. Quand plusieurs jours arrivent ensemble, un bandeau s'affiche et une ligne de chronique résume. | `drain` adaptatif (§2.5) |
| **Q2. Volume** | **Mélange « aube, jour, crépuscule »** : `V(n) = 90 × min(1, n/10) + E(n)`, avec `E` = forme `sqrt`, `full = 60`, `soft = 10`. L'aube ne donne jamais de matériau noble. Les nobles suivent la même courbe sur les cartes mûres, placées en tête. Nouvelles payées : au plus 20 par jour (inchangé). | Durées de l'ère 1, 7 jours sur 7 : **13 / 10 / 8 / 6 / 5 semaines** pour 10 / 30 / 60 / 150 / 400 cartes par jour [sim] |
| **Q2. Paramètre joueur** | **Aucun.** Il n'y a ni « cartes par jour visées », ni curseur de rythme dans le jeu. | — |
| **Q2. Le chiffre de Mathéo** | Il ne compte presque plus. Avec le mélange, caler la référence sur 30 ou sur 150 au lieu de 60 change la durée de 0,8 à 1,3 fois. En proportionnel, le même choix la change de 0,5 à 2,2 fois. Et son propre volume va de toute façon doubler en trois mois (§3.6). | Point de calage : 60 cartes par jour, collection établie, ère 1 en 8 semaines. Recalé par B-R5. |

Les deux décisions se tiennent. Rien ne bouge sans réviser (Q1). En échange, les dix premières cartes de chaque jour font lever le jour au village (Q2), ce qui donne au petit joueur un plancher. Ce plancher est payé en **régularité**, jamais en temps d'écran.

---

## 1. Faits vérifiés dans le code, sur lesquels je m'appuie

1. **Horloge** [code `src/anki.js` `ankiClockGate`].
   - La part passive est une **fraction du temps réel** : `frac += periods × passive`.
   - La réserve de ticks se vide au plus de `drain × periods` par appel, avec `drain = 8`.
   - Le minuteur d'Evolve envoie `periods = 1` toutes les 250 ms [code `evolve/evolve.js`].
   - `execGameLoops` plafonne à 240 ticks par appel, soit 12 jours d'Evolve [code `src/main.js:842-866`].
   - **Conséquence** : une journée de 60 cartes (1 200 ticks) se rejoue aujourd'hui en **37 s**, pas en 3 s comme le voulait C §2.
2. **Cueillette** [code `src/actions.js`]. `ankiAllowGather()` coupe les clics RNA, Food, Lumber, Stone et Chrysotile en mode `cards`. Le clic « Form DNA » (2 RNA → 1 DNA) reste permis : c'est une conversion.
3. **Grand livre** [code `anki/ledger.js`].
   - Forme `sqrt`, `full = 50`, `soft = 50`.
   - `newCap = 20`.
   - **Les nobles ne décroissent pas** : 1 000 millièmes par carte mûre, `dailyCap = 0`.
   - Le grand livre groupe par `day` (jour Anki), pas par heure d'arrivée. Une synchro tardive, en bloc ou dans le désordre donne donc exactement le même total. Contrôlé par `gd-sim/synchro.js` : base 498 000 et noble 34 000 dans les trois cas [sim].
4. **Pont** [code `anki-bridge.js`].
   - Les taux (`RATES`) sont calés sur 40 cartes/j pendant 10 semaines, soit T = 2 800 crédits.
   - Les ticks ne sont ajoutés qu'en mode `cards`.
   - **Le menu du badge offre au joueur** « Temps du jeu normal/cartes », « Production sans cartes 0 à 100 % » et « Cueillette permise/coupée ». C'est un bouton qui défait tout le principe en un clic.
5. **Temps accéléré d'Evolve** [code `src/functions.js:196-221`, `src/main.js:12820-12860`].
   - À chaque retour après plus de 2 min, le jeu ajoute 2/3 du temps d'absence (plafond 11 520 jours) et double la cadence de la boucle.
   - En mode `cards` à 0 % passif, cela ne produit rien : il vide seulement la réserve deux fois plus vite.
   - En revanche, le compteur « temps accéléré restant » s'affiche et ment au joueur.
6. **Pas de requête sortante** [code]. `tagEvent()` appelle `gtag` dans un `try/catch`, et `index.html` ne charge aucun `gtag`. Il n'y a donc aucun appel réseau. À garder ainsi dans l'add-on.
7. **Add-on en cours** : `evolve-pixel-village/addon/` existe, non suivi par git. Il s'accroche déjà à `sync_did_finish`.

---

## 2. Question 1 — L'horloge

### 2.1 Décision
**Le temps d'Evolve n'avance que par les révisions.** Mode `cards`, passif 0, cueillette convertie. La partie vivante sans révision est **cosmétique** (animations d'attente du village pixel) ou **de planification** (dépenser le stock, construire, rechercher, affecter des métiers). Ces actions du joueur restent hors horloge [code B5].

### 2.2 Pourquoi aucun passif

| Forme de passif | Ce qu'elle donne vraiment | Verdict |
|---|---|---|
| **% du temps réel** (réglage B actuel) | L'unité est mauvaise. Anki bureau reste souvent ouvert toute la journée. Avec 1 % de passif et le jeu ouvert 8 h : 4 ticks/s × 28 800 s × 1 % = 1 152 ticks = **58 jours de village**, soit toute la part par carte d'un joueur à 60 cartes. Cela paie le fait de **laisser la fenêtre ouverte** : c'est la minuterie « conçue pour faire revenir » que G1 classe en dérive haute (catalogue C4). | Écartée |
| **Passif seulement jeu ouvert** | Même problème : il récompense l'écran, pas l'étude. | Écartée |
| **Passif plafonné par jour** (par exemple 5 jours de village/jour) | Inoffensif, mais **inutile** : 5 jours contre 100 à 250 par jour d'étude. Il casse la seule règle que tout le monde comprend en une phrase : « rien ne bouge sans réviser ». | Écartée |
| **Passif qui finit la journée** (compléter le jour en cours) | Les ticks sont déjà entiers par crédit : il n'y a rien à finir. | Sans objet |
| **Mode `original` + crédits en bonus** | C'est Evolve avec un bonus. Le jeu avance sans étude, y compris hors ligne grâce au temps accéléré. | Écarté pour le produit |

**Le vrai besoin derrière « un peu de passif »** est un plancher pour le joueur qui fait peu de cartes. Je le place dans la règle de volume, sous forme d'**aube** (Q2) : 10 cartes donnent 100 jours de village, soit les deux tiers d'une journée à 60 cartes. Ce plancher se gagne en étudiant, pas en attendant.

**Repère du genre** [mémoire] : dans les jeux idle, l'écran de retour (« pendant ton absence tu as gagné… ») est l'un des moments les plus attendus. A. Pecorella, *Quest for Progress: The Math and Design of Idle Games*, GDC 2016 ; série « The Math of Idle Games », blog Kongregate, 2016. Ici, ce moment est conservé, mais l'absence est remplie par les révisions : l'écran de retour, c'est le rattrapage après une séance. Chaque jour Anki est une « session » au sens des jeux *session-based*, et non un compteur de temps réel.

### 2.3 Le clic de cueillette : converti
- **Coupé comme production** : c'est la seule production hors des boucles, donc le seul moyen d'avancer sans réviser [code].
- **Pas laissé mort.** En ère 0, le clic RNA est le premier geste d'Evolve, et un bouton qui ne répond pas est une faute d'interface [jugement]. En mode `cards`, le clic :
  - écrit une ligne dans le journal, une fois par minute au plus : « La cellule se nourrit de tes cartes — 42 dues aujourd'hui » ;
  - met en évidence le bouton **Réviser** du panneau Anki. Ce bouton ramène la fenêtre principale d'Anki sur la liste des paquets.
- Il **n'ouvre jamais** le réviseur tout seul : un changement de fenêtre inattendu est agaçant.
- Un clic plafonné, par exemple 50 RNA par jour, est écarté : il rouvre une production sans carte et crée une corvée quotidienne.

### 2.4 Ce que voit le joueur

| Situation | Ce qui se passe |
|---|---|
| **Il ouvre le jeu sans avoir révisé aujourd'hui** | **L'image** : le village est figé dans le temps mais vivant (fumée, passants, animations d'attente seulement). En tête, « Jour 143 · été — le village attend tes cartes », puis le nombre de dues du jour lu dans Anki. S'il n'y a aucune due : « Rien n'est dû aujourd'hui ; le village se repose ». **Ce qu'il peut faire** : acheter, rechercher, affecter, mettre en file. La file ne progresse pas, mais un achat payable se fait tout de suite. **Ce qui n'existe pas** : aucun texte de culpabilité, aucun compte à rebours, aucun chiffre de « perte ». |
| **Il a révisé sur le PC, jeu ouvert à côté** | Chaque réponse (`reviewer_did_answer_card`) relit le revlog et crédite. Le jour avance tout de suite. Les dix premières cartes sont l'**aube** : le soleil se lève, chaque carte fait un grand pas. Ensuite, le jour avance carte par carte. Au-delà de 60 cartes, c'est le crépuscule (C §2). |
| **Il a révisé sur le téléphone ; les révisions arrivent à la synchro** | `sync_did_finish` relit le revlog. Chaque révision est rangée **dans son jour Anki** : chaque jour garde son aube, et la Flamme est recalculée en arrière (C §4). Synchroniser tard ne fait donc rien perdre [sim, `synchro.js`]. **À l'écran** : un rattrapage de 3 s au plus par jour d'étude, puis une ligne de chronique (« Pendant ce temps : 3 jours d'étude, 412 jours au village ; l'hiver est passé »). Plusieurs jours d'un coup : bandeau « Le village rattrape 3 jours d'étude… », et le jeu reste utilisable pendant ce temps. |
| **Il revient après une pause** | Rien n'a bougé, rien n'est perdu (règle 5). Les dues accumulées créditent normalement, chacune dans son jour. Le temps accéléré d'Evolve ne s'affiche pas (§5, tâche 3). |

### 2.5 Rattrapage adaptatif
Règle : `d = min(bank, max(drain × periods, ceil(bank / 12)), 240 − n)`. La réserve se vide en 12 appels (3 s), dans la limite de 240 ticks par appel qu'impose Evolve.

| Réserve | Aujourd'hui (`drain` 8) | Adaptatif |
|---|---|---|
| 60 cartes avec le mélange = 150 crédits × 20 = 3 000 ticks | 94 s | **3,1 s** |
| 400 cartes = 248 crédits = 4 960 ticks | 155 s | 5,2 s |
| Une semaine de 60 cartes synchronisée d'un coup = 21 000 ticks | 11 min | 22 s, avec bandeau |

Ces durées dépendent de `ticksPerCard`, que B-R5 recalibrera. À mesurer en phase 3 : le temps d'image pendant 240 ticks par appel.

---

## 3. Question 2 — Le volume

### 3.1 Décision : « aube, jour, crépuscule »
Pour chaque jour Anki, avec `n` = cartes créditées (une par carte et par jour, comme aujourd'hui) :

```
V(n) = 90 × min(1, n/10)  +  E(n)
E(n) = n                                   si n ≤ 60
     = 60 + 2·(√(10·(10 + n − 60)) − 10)   au-delà   (forme sqrt du grand livre : full 60, soft 10)
```

| Carte du jour | 1 à 10 (**aube**) | 11 à 60 (**jour**) | 61 | 100 | 150 | 400 |
|---|---|---|---|---|---|---|
| Valeur de cette carte (crédits pleins) [sim] | 10 | 1 | 0,97 | 0,45 | 0,32 | 0,17 |
| Total du jour | 10 → 100 | 101 → 150 | 151 | 175 | 193 | 248 |

- **L'aube compte les 10 premières cartes créditées** du jour, dans l'ordre des heures. Les nouvelles comptent (sinon une collection neuve n'aurait pas d'aube) ; une carte apprise deux fois ne compte qu'une fois.
- **Le seuil est fixe à 10. Il ne dépend pas des dues du matin**, pour deux raisons :
  1. il marche sans photo du matin, ce qui compte pour les jours faits sur téléphone ;
  2. on ne peut pas l'abaisser en suspendant ses cartes : avec les dues, un joueur réduit à 1 due toucherait l'aube entière pour une carte.

  La Flamme garde sa définition sensible aux dues (« toutes tes dues faites, le feu est entretenu »). Les deux notions disent « 10 » dans presque tous les cas.
- **L'aube verse de la base et des ticks, jamais de noble** (règle 4). Les nobles restent par carte mûre (`p ≥ 21`). Ils suivent désormais la même courbe `E`, appliquée aux seules cartes mûres du jour placées en tête (logique « mûres d'abord » de C-R2). Aujourd'hui, les nobles ne décroissent pas du tout [code].
- **Le crépuscule de C reste à 60.** La nuit tombe vers 120 : la carte n° 120 vaut 0,38.
- **À l'écran, aucun chiffre** : l'aube est un lever de soleil. Le texte de l'infobulle : « Tes dix premières cartes de la journée font lever le jour au village. Ensuite, chaque carte fait avancer le jour ; au-delà de soixante, le soir tombe. »

### 3.2 Méthode de simulation (`gd-sim/`)
Commande : `node calibrate.js && node sim.js` (moins de 10 s). Résultats complets dans `resultats.txt`.

**Modèle de collection** (`collection.js`) [sim]
- SM-2 avec les réglages par défaut d'Anki, FSRS désactivé comme chez Mathéo.
- Facilité 250 %, oubli → 1 jour, et fuzz d'Anki v3 tel que je m'en souviens.
- Rétention : 87 % sur les jeunes, 92 % sur les mûres.
- Tirage déterministe (graine fixe).

**Profils calés en régime établi** (un an d'historique) [sim] :

| Cartes par jour visées | 10 | 30 | 60 | 150 | 400 |
|---|---|---|---|---|---|
| Nouvelles par jour nécessaires | 0,72 | 2,26 | 4,34 | 11,0 | 28,8 |

- Environ **14 révisions par nouvelle quotidienne** en régime établi.
- Il y a deux histoires de collection : « établie » (1 an d'historique avant l'installation) et « neuve » (comme celle de Mathéo).

**Chaîne de calcul**
- Les événements passent par **une copie exacte** de `anki/ledger.js` de `socle-anki` (`ledger-socle.js`) : un crédit par (carte, jour), nouvelles plafonnées, dues du matin. La règle de progression s'applique ensuite.
- L'unité est le crédit plein, soit un jour de village de 20 ticks. L'ère 1 coûte T crédits.
- **A0** garde le T actuel (2 800).
- Les autres options sont recalées pour que **60 cartes/j sur une collection établie, 7 jours sur 7, finissent l'ère 1 en 8 semaines**. Elles comparent donc la **forme** des règles (écart entre profils, incitations) ; le niveau absolu revient à B-R5.

**Options simulées**
- **A0** : la règle telle que codée (sqrt, full 50) avec les taux actuels.
- **A** : proportionnel (sqrt, full 60, décision D7).
- **B** : jours étudiés, jour compté au prorata `min(1, n / max(1, min(10, dues)))`.
- **C** : normalisé, part des dues du matin faites.
- **M** : le mélange recommandé.

### 3.3 Résultats [sim, hypothétiques]

**Durée de l'ère 1, en semaines** (« > 26 » = pas fini en 6 mois). Colonnes : cartes par jour ; « 5/7 » = étude 5 jours sur 7 ; « neuve » = collection créée à l'installation.

| Option | 10 | 30 | 60 | 150 | 400 | 10, 5/7 | 60, 5/7 | 400, 5/7 | 10 neuve | 60 neuve | 400 neuve | Mathéo réel¹ | Écart 10 ↔ 400 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A0 tel que codé (T = 2 800) | > 26 | 12,7 | 7,1 | 3,3 | **1,9** | > 26 | 9,7 | 2,4 | > 26 | 14,3 | 4,1 | **5,0** | > ×13 |
| A proportionnel (full 60) | > 26 | 14,9 | 8,0 | 3,6 | 2,0 | > 26 | 11,1 | 2,6 | > 26 | 16,0 | 4,4 | 5,4 | > ×13 |
| B jours étudiés | 8,0 | 8,0 | 8,0 | 8,0 | 8,0 | 11,1 | 11,1 | 11,1 | 8,1 | 8,0 | 8,0 | 8,0 | ×1 |
| C normalisé (part des dues) | 8,0 | 8,0 | 8,0 | 8,0 | 8,0 | 11,1 | 11,1 | 11,1 | 8,1 | 8,0 | 8,0 | 8,0 | ×1 |
| **M mélange (recommandé)** | **13,3** | **9,9** | **8,0** | **6,1** | **4,9** | 20,6 | 11,3 | 6,7 | 22,0 | 10,4 | 6,4 | **6,9** | **×2,7** |

¹ Collection neuve, 20 nouvelles par jour (son rythme réel d'introduction, B §3). Son volume passe de 83 cartes/j (semaines 1-4) à **162** (semaines 9-12) [sim].

**Grille du mélange** (aube Q répartie sur 10 cartes, queue « soft »), calée sur 60 = 8 semaines :

| Réglage | 10 | 30 | 150 | 400 | Écart 10 ↔ 400 | Part de l'aube à 60 cartes |
|---|---|---|---|---|---|---|
| Q 30, soft 60 | 19,1 | 11,4 | 4,4 | 2,6 | ×7,4 | 33 % |
| Q 60, soft 20 | 15,0 | 10,4 | 5,4 | 3,9 | ×3,9 | 50 % |
| Q 60, soft 10 | 15,0 | 10,4 | 5,9 | 4,4 | ×3,4 | 50 % |
| **Q 90, soft 10** | **13,3** | **9,9** | **6,1** | **4,9** | **×2,7** | 60 % |

**Dérives**, sur le profil 60 cartes/j établi (8,0 semaines quand il joue honnêtement). Un chiffre plus petit veut dire que la dérive fait gagner du temps.

| Comportement (volume réel obtenu) | A0 | A | B | C | **M** |
|---|---|---|---|---|---|
| Nouvelles doublées, 8,7/j (85 cartes/j) | 5,4 | 6,1 | 8,0 | 8,0 | **7,3** |
| Nouvelles poussées à 20/j (157 cartes/j, dues ×3) | 3,9 | 4,3 | 8,0 | 8,0 | **6,4** |
| Suspendre toute carte oubliée (36 cartes/j) | 10,9 | 13,0 | 8,0 | 8,0² | **9,3** |
| Réviser en avance, +30 % (71 cartes/j) | 6,1 | 6,9 | 8,0 | 8,0 | **7,6** |
| Même semaine tassée en 2 jours | 14,9 | 16,9 | > 26 | > 26 | **24,9** |
| Seulement 10 cartes/j, dues laissées (562 dues) | > 26 | > 26 | **8,0** | > 26 | **11,9** |
| Pause de 10 jours puis reprise | 8,3 | 9,3 | 9,4 | 9,4 | 9,4 |
| Tricheur : 1 carte/j, tout le reste suspendu | > 26 | > 26 | > 26 | > 26 | > 26 |

² Ici sans effet, parce que le joueur simulé finit toujours ses dues. Pour qui ne les finit pas, C pousse à suspendre (§3.4).

**Nobles directs** (crédits nobles ÷ crédits totaux, à la fin de l'ère 1) avec M :

| Profil | 10 | 30 | 60 | 150 | 400 | Collections neuves |
|---|---|---|---|---|---|---|
| Part noble | 3 % | 6 % | 10 % | 19 % | 34 % | 0 à 1 % |

- Collections neuves : première carte noble entre la **5ᵉ et la 7ᵉ semaine** [sim].
- B6 supposait 20 % pour tout le monde. Conséquence en §3.8.

### 3.4 Comparaison des options

| | A proportionnel | B jours étudiés | C normalisé | **M mélange** |
|---|---|---|---|---|
| **Écart entre profils** | Le petit joueur ne finit pas en 6 mois ; le gros finit en 2 semaines et épuise le contenu avant que les cartes mûres (semaines 5 à 7) aient un sens. | Aucun écart : 400 cartes valent 10 cartes. | Aucun écart. | ×2,7. Le petit joueur finit en 3 mois ; le gros a un avantage réel mais borné. |
| **Gonfler les nouvelles** | Fort (8 → 4,3 semaines) | Nul | Nul, puis la charge future pèse | Faible (8 → 6,4 pour 2,6 fois plus de travail) |
| **Cartes faciles, révision en avance** | Moyen | Nul | Nul | Faible |
| **Suspendre** | Freine (bien) | Nul | **Pousse à suspendre** dès qu'on ne finit pas ses dues : c'est la dérive « Just.Suspend.It » de Cristal [G1] | Freine (bien) |
| **Faire le minimum** | Lent | **Récompensé à plein** : 10 cartes valent 400 | Lent | Toléré : le petit joueur et le joueur « 10 cartes, dues laissées » sont indiscernables. C'est voulu. |
| **Tasser l'étude** | Freine | Freine très fort | Freine très fort | Freine fort (×3) : le meilleur rythme est le quotidien |
| **Retour après une pause** | Neutre | Neutre | **Puni** : la pile de dues fait valoir chaque carte presque rien pendant des jours [jugement ; le modèle vide la pile en un jour et ne le montre pas] | Neutre |
| **Lisibilité** | La meilleure (« 1 carte = 1 jour ») | Très bonne, mais les cartes 11 et suivantes ne font rien | Moyenne : la valeur d'une carte change chaque jour (K / dues) | Bonne : l'aube, le jour, le crépuscule suivent la séance |
| **Mesure** | Revlog seul | Revlog, et dues pour le seuil | **Dues du matin de chaque jour**, inconnues pour les jours faits seulement sur le téléphone | Revlog seul |
| **Règles fixes du plan** | OK | OK | OK | OK (base indépendante du bouton, une récompense par carte et par jour, rendement décroissant, rien ne se perd) |
| **Features C et D** | Conçues dessus | Fait doublon avec la Flamme et la tresse ; tue le retour carte par carte et le crépuscule | Fait doublon avec les Comptoirs de D (≥ 80 % des dues) ; crépuscule impossible | Compatible : crépuscule à 60 gardé, ticks typés (aube = ticks neutres), Flamme et tresse inchangées |
| **Précédent** | Cristal, avec sa course au volume [G1] | Cristal Capitale, « payé en assiduité » [G1] | Anki Empire, « ressources normalisées sur sa propre moyenne », bêta très boguée [G1] | Premier gain du jour (*First Win of the Day* de League of Legends), repos de *World of Warcraft* [mémoire] |

### 3.5 Pourquoi le mélange, et pourquoi ces valeurs
1. **Le rythme de fond d'un jeu idle doit suivre l'unité de session, et ici la session est le jour d'étude** [jugement]. La régularité est aussi le levier d'apprentissage d'Anki (C §4 ; Cristal Capitale [G1]). L'aube récompense le jour étudié, sans série, sans perte et sans report : une aube manquée ne s'accumule pas, donc s'absenter ne rapporte jamais (même garde que la fête de C).
2. **La carte doit rester le geste** : chaque réponse fait avancer le jour (C §2). C'est ce que B (jours seuls) et C (normalisé) perdent.
3. **Les valeurs** :
   - **Q = 90** est le plus petit écart (×2,7) de la grille qui tienne la plage visée par D10 (6 à 10 semaines) pour 30 à 150 cartes par jour, avec 13 et 5 semaines aux extrêmes.
   - **soft = 10** comprime la queue sans toucher au crépuscule à 60.
   - **10 cartes** pour l'aube, c'est 2 à 4 minutes d'étude : le même chiffre que le jour compté.
   - Q = 60 était presque aussi bon (×3,4) ; c'est le repli si la phase 3 montre l'effet « je m'arrête après l'aube » (§6).
4. **Le gros joueur garde un avantage** : 400 cartes/j finissent en 4,9 semaines contre 8. Mais cet avantage reste sous la barre des 5 semaines, en dessous de laquelle les cartes mûres, et donc les nobles et les chênes, n'existent pas encore pour une collection neuve [sim]. Le contenu suit le calendrier de la mémoire, pas le volume.

### 3.6 Le chiffre de Mathéo compte-t-il ?
**Presque plus.**
- **Il ne fixe que le point de calage.** Avec le mélange, caler les 8 semaines sur 30 ou sur 150 au lieu de 60 met le profil 60 à 6,6 ou 10,6 semaines. En proportionnel, le même choix le met à 4,3 ou 17,6 semaines [sim].
- **Il n'est pas stable.** Mathéo introduit environ 20 nouvelles par jour (B §3). Le modèle le place à 83 cartes/j le premier mois et à **162** au troisième. Avec la règle actuelle (A0), il finirait l'ère 1 en 5 semaines.
- **Il n'est pas représentatif.** Les réglages par défaut d'Anki (20 nouvelles par jour) mènent, d'après le modèle, à environ 280 révisions par jour après un an.

Une règle calée sur « 60 » par la proportionnelle serait donc fausse pour la plupart des joueurs, et pour Mathéo lui-même dans deux mois.

### 3.7 Paramètre exposé au joueur : aucun
- Un réglage « cartes par jour visées » pousse à **déclarer bas** pour avancer vite.
- Il ancre le jeu sur un chiffre que la collection change d'elle-même : ×2 à ×3 en trois mois [sim].
- Il fait du jeu une négociation.

Le mélange est conçu pour être juste de 10 à 400 cartes **sans rien demander**. Les clés `clock.*` et `rules` restent dans `config.json` de l'add-on, pour le développement et B-R5. Elles ne sont pas documentées pour les joueurs, et le menu du badge cesse de les offrir (§1, point 4).

### 3.8 Conséquences pour le calibrage (B-R5, B6)
- **Ère 0** : viser **4 jours d'étude au profil de référence**, soit 600 crédits avec le mélange. Selon le profil, cela donne 6,0 / 5,0 / 4,0 / 3,1 / 2,4 jours d'étude [sim].
  - Les 10 premières cartes du premier jour donnent 100 crédits, un sixième de l'ère 0 : le premier déblocage arrive pendant la première séance.
  - **Conseil sur D5** (décision de Mathéo) : ne pas reverser 7 jours. 7 jours d'un joueur à 400 cartes (1 736 crédits) sauteraient l'ère 0, qui sert de tutoriel. Si un rétroactif est voulu : 1 jour au plus.
- **Nobles** : avec le mélange, la part noble directe va de 3 à 34 % selon le profil, et de 0 à 1 % pour une collection neuve pendant toute l'ère 1. **Le crédit noble direct doit être un accélérateur, pas une condition de l'ère 1.** Le fer, le ciment et l'acier doivent pouvoir venir des mines (ticks, `α(N) = 1` tant que N < 100) au rythme visé. C'est le risque 2 du PLAN, tranché dans ce sens.
- **Échelle** : `ticksPerCard` et `RATES` ne changent que l'échelle, pas la forme. Avec le mélange, le profil de référence fait environ 8 270 crédits sur l'ère 1, contre 2 800 supposés par le pont. B-R5 doit poser `ticksPerCard ≈ 20 × (jours d'Evolve réellement nécessaires à l'ère 1 / 8 270)`, puis diviser `RATES` d'autant. **Le texte du jeu ne doit donc jamais promettre « 1 carte = N jours ».**

---

## 4. Comment les deux décisions tiennent ensemble
- **Plancher sans passif** : l'aube donne au joueur à 10 cartes 100 crédits par jour, les deux tiers du joueur à 60 cartes. Un passif à 1 % sur 8 h d'Anki ouvert en donnerait 58 et paierait l'écran.
- **Sans passif, le petit joueur ne tient que grâce à l'aube.** Sans aube, le passif reviendrait par la petite porte. Il faut donc livrer les deux décisions ensemble.
- **Synchro tardive** : le grand livre range chaque carte dans son jour. L'aube, la Flamme et la tresse sont donc identiques que les cartes arrivent le soir même ou trois jours plus tard [sim].
- **Ce qui reste volontairement hors horloge** : les achats, la recherche, l'affectation et les conversions. Ouvrir le jeu sans réviser sert à **planifier**, jamais à produire.

---

## 5. Ce qu'il faut changer dans le code (sans le modifier ici)

| # | Fichier | Changement | Estim. [hyp] |
|---|---|---|---|
| 1 | `anki/ledger.js` (+ tests) | Nouvelle règle `dawn: { cards: 10, value: 9000 }` : 9 000 millièmes en plus pour chacun des 10 premiers crédits du jour, nouvelles comprises, ajoutés à la base, jamais au noble. `diminishing: { full: 60, soft: 10 }`. Nobles : `noble.shape: 'curve'`, valeur = marginale du rang parmi les seules mûres du jour placées en tête. Champ `D.dawn` par jour. Tests : 10 cartes → 100 crédits ; 5 → 50 ; ordre d'arrivée indifférent ; aube sans noble ; noble décroissant ; synchro en bloc = jour par jour. Nouvelle version des règles : rien n'est repris, grâce au filigrane `granted`. | 1 soirée |
| 2 | `src/anki.js` | `ankiClockGate` : vidage adaptatif `max(drain × periods, ceil(bank/12))` borné à 240. `CLOCK_DEFAULTS` inchangé pour le jeu web (`original`) ; l'add-on impose `cards`. | ½ |
| 3 | `src/functions.js` `addATime`, `src/main.js` (filtre `remain`) | En mode `cards`, ne pas accumuler de temps accéléré et ne pas l'afficher. | ½ |
| 4 | `src/actions.js` (RNA, Food, Lumber, Stone, Chrysotile), `strings/strings.json` | Clic converti : ligne de journal limitée à 1 par minute, avec le nombre de dues, et signal au panneau Anki. Le clic DNA est inchangé. | ½ |
| 5 | `anki-bridge.js` | Retirer du menu du badge les choix mode, passif et cueillette ; garder l'état et ajouter un bouton **Réviser**. Ticks dus et taux suivent la nouvelle base (aube comprise) ; `RATES` recalés par B-R5 ; taux de l'ère 0 visés à 600 crédits. | ½ (+ B-R5) |
| 6 | `addon/__init__.py` (en cours, non suivi) | À la création de la partie : `mode: 'cards'`, `passive: 0`. Commande `pycmd` « réviser » → fenêtre principale sur la liste des paquets. Envoi du nombre de dues du jour à la page. Relecture du revlog après `sync_did_finish` (déjà accrochée). `config.json` : clés de développement seulement. | 1 |
| 7 | C-H1 (prévu, phase 1) | Ciel « aube » pendant les 10 premières cartes ; écran « le village attend » ; bandeau de rattrapage sur plusieurs jours. Le critère C-H1 devient : jours de village = Σ (90 × min(1, n/10) + E(n)). | + ½ |
| 8 | `tools/budget/era-budget.js` | Crédits par jour selon les nouvelles règles, pour 10 / 30 / 60 / 150 / 400 cartes ; part noble par profil au lieu de 20 % fixes. | ½ |
| | **Total** | | **≈ 5 soirées** |

**Documents à mettre à jour après accord de Mathéo**
- `PLAN.md` : D4, D7 (`soft` 10), D10, règle 3 (ajouter l'aube) et repère de la phase 1.
- `C-conception.md` : §1 `E(n)` et §2.
- `B-interface.md` §3.

---

## 6. Test réel de deux semaines (phase 3) : quoi vérifier, et ce qui me ferait changer d'avis

**Mesures** (revlog, avant et pendant ; photo du jour pour les suspensions)

| Mesure | Signal d'alarme | Ce que je changerais |
|---|---|---|
| Distribution des cartes par jour | Plus de 25 % des jours d'étude finissent entre 10 et 14 cartes alors que les dues sont ≥ 30 : effet « je m'arrête après l'aube » | Q 90 → 60, puis → 45 |
| Nouvelles par jour | Hausse de plus de 50 % sans intention déclarée par Mathéo | Queue plus raide : `soft` 10 → 5, ou `full` 60 → 40 |
| Cartes suspendues (`suspended` de la photo) | Hausse inexpliquée | Chercher quelle règle la paie (aucune ne devrait) |
| Part de « Facile », durée médiane par carte | « Facile » en hausse, ou durée en baisse de plus de 25 % : réponses bâclées pour faire avancer le jour | Comprimer la part par carte ; **pas** de passif |
| Jours étudiés par semaine | En baisse | Revoir l'aube (elle doit tirer vers le quotidien) |
| Ouvertures du jeu sans révision ce jour-là (journal de l'add-on) et ressenti de Mathéo | Le village « mort » frustre plus d'une ouverture sur deux | Plus de choses à planifier et un meilleur écran d'attente. **Pas de production passive.** |
| Durée du rattrapage après une synchro téléphone | Plus de 3 s pour un jour, ou des images de plus de 100 ms | Plafond par appel et rendu allégé pendant le rattrapage |
| Rythme : techs par semaine, fin d'ère 1 extrapolée | Hors de 6 à 9 semaines pour Mathéo (le modèle dit 6,9) | `ticksPerCard` et `RATES` (échelle seulement) |

**Critères qui me feraient changer de décision**
- **Q1** :
  - Je n'ajouterais un passif de production que si des joueurs à très faible charge (5 cartes par jour ou moins) abandonnent parce que le village est figé. Cela ne se voit pas avec un seul joueur à environ 60 cartes : c'est à surveiller en bêta.
  - Si l'horloge figée pousse Mathéo à bâcler ses réponses, je comprime la valeur par carte. Je n'ajoute pas de passif.
- **Q2** :
  - Si l'aube est **illisible** (Mathéo ne sait pas dire, au bout d'une semaine, pourquoi les premières cartes comptent plus) ou crée l'arrêt à 10 malgré Q = 45, je repasse à **A avec une queue raide** (full 60, soft 10, sans aube). J'accepterais alors un écart d'environ ×6 entre profils.
  - Si l'arrêt à 10 n'apparaît pas et que le volume reste stable, je garde le mélange.

**Limite du test** : un seul joueur, autour de 60 à 160 cartes par jour. Les profils 10 et 400 ne seront validés que par la simulation, jusqu'à une bêta. On pourrait aussi rejouer d'autres revlogs, si Mathéo l'accepte et le demande.

---

## 7. Honnêteté

- **Vérifié dans le code** : tout le §1.
- **Contrôlé par simulation** : la synchro en bloc donne les mêmes totaux.
- **Calculé, hypothétique** : toutes les durées. Elles reposent sur le budget B6 (PHI = 0,5) et sur un modèle SM-2 simplifié : pas de FSRS, rétention constante, joueur « diligent » qui fait toutes ses dues, pile vidée en un jour après une pause, fuzz d'Anki cité de mémoire. Les durées absolues seront recalées par B-R5 ; ce qui compte ici, ce sont les **écarts entre profils et entre règles**.
- **La plus grosse inconnue** : le nombre de jours d'Evolve nécessaires à l'ère 1 quand on joue bien. Ni B6 ni moi ne l'avons mesuré ; seul un rejeu dans le vrai moteur le donnera.
- **Jugement** : le choix du mélange, Q = 90, le seuil de 10, le clic converti, l'absence de paramètre joueur.
- **De mémoire, non revérifié** : Pecorella (GDC 2016, Kongregate) sur l'écran de retour des jeux idle ; repos de *World of Warcraft* et premier gain du jour de *League of Legends* comme précédents de bonus quotidien sans perte. Le reste des précédents vient de G1, avec son niveau de preuve.

**Fichiers de simulation** (`rapports/plan/gd-sim/`)
- `collection.js` : modèle de collection.
- `calibrate.js` : profils.
- `sim.js` : options, grille, dérives ; écrit `resultats.txt`.
- `candidats.js` : comparaison des réglages du mélange.
- `synchro.js` : contrôle de la synchro en bloc.
- `ledger-socle.js` : copie du grand livre de `socle-anki`.

Zéro dépendance ; Node 24 ; moins de 10 s en tout.
