# C — Conception de la combinaison prudente : « Le village qui écoute »

> **Mise à jour du 2026-10-20** : le rendement et l'horloge du rapport GD sont appliqués, avec une **aube à 75** (décision de Mathéo), un bonus « journée accomplie » de 15 crédits et `E(n)` à `full 60, soft 10`. Voir `B-interface.md` §3 bis et `PLAN.md` §2.

*conception-C, 2026-10-20. Documents seulement, aucun code du jeu modifié.*
*Sources : `HANDOFF.md`, `rapports/7-architecture.md` §1.3, `rapports/audit/G1`, `G2`, `E1`, `rapports/plan/B-interface.md` (v0), `rapports/plan/discussion-CD.md`, code `evolve-pixel-village/src/` et `work/portage/anki/rslib/`.*

**Légende de fiabilité** : **[code]** lu dans le code (fichier:ligne) ; **[testé-B]** constaté par B sur le téléphone et les données réelles ; **[déduit]** raisonnement à partir du code ; **[spéc]** spéculatif, jamais essayé ; **(hyp)** paramètre chiffré de départ, à recalibrer en rejouant le revlog réel (règle 9 du rapport 7).

---

## 0. Ce qui change par rapport à G2 (à lire d'abord)

1. **Les données réelles sont plus pauvres que prévu au départ, et meilleures sur un point** [testé-B] : FSRS est désactivé (pas de stabilité, pas de retrievability), la collection a 11 jours et **aucune carte mûre** (`prop:ivl>=21` → 0), 107 cartes en révision, 3 073 nouvelles ; l'utilisateur fait 21 à 46 cartes distinctes par jour (11–15 oct.) et **n'a rien révisé depuis le 16 oct.** En revanche B lit le revlog en copie (root) : bouton exact, intervalle avant (`p`), type et durée sont connus sans l'astuce `customData`.
   Conséquences : tout ce qui est « mûr » (nobles, chênes) est **muet pendant 3 à 5 semaines** ; toutes mes features ont un repli sur l'intervalle ; et le premier test réel commencera par… une reprise après une pause (bon test pour la Flamme).
2. **La recherche `prop:rated=-k[:b]` donne, sans revlog, la liste exacte des cartes répondues le jour Anki −k (et avec quel bouton)** [code : `rslib/src/search/sqlwriter.rs:336-370`, sous-requête `revlog` bornée par `next_day_at` ; confirmé sur l'appareil par B : `prop:rated=-4` → 8 cartes]. Anki n'a pas de série, mais la série et les jours étudiés se reconstituent **exactement** sur le téléphone, même sans root. Coût mesuré par B : ~1,2 s par appel `content` ; à faire par lots, jamais par carte.
3. **Changement d'une règle décidée, retenu par défaut par B, à faire valider par Mathéo** : le matériau noble dépend de l'intervalle **avant** la réponse (`p ≥ 21`), **pas du succès**. Raison : « noble seulement si réussie » fait perdre le noble quand on presse « À revoir » sur une carte mûre, donc pousse à mentir sur le bouton. Le flux de nobles suit quand même la réussite, en différé : une carte oubliée voit son intervalle s'effondrer et redonne des ressources de base jusqu'à ce qu'elle remûrisse (discussion-CD, B-interface §3 `nobleRequiresSuccess`, défaut `false`).
4. **Point d'accroche unique vérifié** : `production('psychic_boost', res)` (`src/prod.js:494-508`) est multiplié à presque tous les sites de production de Food (`main.js:3467, 3485, 3598`), Furs (4056, 4093), Lumber (5479, 5564), Stone (5767), Copper (6166), Iron (6229), Cement (4776), Coal (6554), Steel (5120) [code]. Pas de Knowledge ni de Money. C'est là que B branche `ankiMult(res)`.

---

## 1. Règles communes que mes features supposent

Toutes respectent §1.3 du rapport 7 : une récompense par (carte, jour Anki) ; base indépendante du bouton ; rendement décroissant ; nobles seulement pour les cartes mûres ; ni classement ni notification ; rien ne se perd.

| Notion | Définition retenue | Source | Statut |
|---|---|---|---|
| Crédit | (cid, jour Anki), première réponse éligible du jour ; exclus `rt` 3, 4, 5, `b=0` | B3 `ledger.js` | [prévu B] |
| Jour Anki | bascule 4 h, Europe/Paris | B | [testé-B] |
| Équivalent-jour `E(n)` | `n` si `n ≤ 60` ; sinon `60 + 2·√60·(√n − √60)` (forme `sqrt` de B, `full = 60`) | B3 | (hyp) |
| Nouvelles payées | ≤ 20 par jour (`newCap`) | B3 | (hyp) |
| Mûre avant | `p ≥ 21` (revlog `lastIvl` ; sinon `customData` ; sinon photo du matin `prop:ivl>=21`) | B | [code]/[prévu] |
| Maturation | première révision créditée avec `p ≥ 21` pour ce cid, **quel que soit le bouton**, une fois pour toutes ; même registre pour 180 et 365 j (D) | B3 `firstMature` | accord C-D-B |
| Jour compté | `crédits(jour) ≥ min(10, dues du matin)` ; dues inconnues → 10 | B3 `counted` | accord C-D-B |
| Bonus Anki | additifs par ressource, plafond **+40 %** total, réduits au prorata si le plafond mord ; C ≤ 20 (Flamme 10, Chênes 10) | `ankiMult` (B) | accord C-D, prorata proposé par C |
| Moral Anki | clé `global.city.morale.anki`, ≤ +12 au total (monuments de D ≤ 10, fête de C ≤ +2, temporaire) | `main.js:347-360` (affichage auto), `moraleCap` 3251-3275 | accord C-D |

`E(n)` en chiffres (hyp) : E(20) = 20 ; E(46) = 46 ; E(60) = 60 ; E(100) ≈ 95 ; E(150) ≈ 130 ; E(300) ≈ 208. L'utilisateur réel (21–46/jour) reste **entièrement en pleine valeur**.

---

## 2. L'horloge à cartes, vue du joueur (transversal ; plomberie = B5)

**But d'apprentissage** : « rien ne bouge si on ne révise pas » devient une règle du moteur. On ne laisse pas tourner le jeu, il ne rappelle pas, il n'y a rien à y faire sans avoir révisé. **Dérive** : faire des cartes pour « faire avancer le temps » (volume). Parade : `E(n)` et le plafond de nouvelles ; et surtout le **crépuscule** (ci-dessous), qui rend la fin de la pleine valeur visible sans rien interdire.

### Variantes de rythme

| Variante | Rythme | Pour | Contre |
|---|---|---|---|
| A. 1 carte = 1/6 de jour (G2 : 6 cartes = 1 jour) | 60 cartes = 10 jours de village, une saison ≈ 550 cartes | Calendrier lent, solennel | Une séance ne change rien de visible au calendrier ; la saison passe tous les 10-15 jours d'étude |
| **B. 1 carte = 1 jour de village** = 20 ticks rapides = 5 s simulées (un `longLoop`, `vars.js:2275` : `mt 250`, `longRatio 20`) | 30 cartes = un mois ; **une saison ≈ 91 cartes** (`orbitLength()` = 365, 4 saisons, `main.js:11778-11815`) | Chaque réponse = un lever de soleil ; une bonne séance = une saison. Correspond à l'unité de base d'Evolve, donc tous les événements « par jour » d'Evolve gardent leur sens | Le rythme d'Evolve doit être recalibré (prix) au rejeu ; à vérifier |
| C. Temps proportionnel à `E(n)` du jour, versé à la clôture du jour | Un gros bond par jour | Simple | Aucun retour à la carte : perd le « respire à chaque réponse » |

**Retenue : B**, avec `ticksPerCard = 20 × poids marginal` (poids 1 jusqu'à 60 cartes, puis `E(i) − E(i−1)`, soit ≈ 0,63 jour pour la 150ᵉ carte). B5 fournit `ankiClock.addTicks(n)` ; `execGameLoops` plafonne déjà à 240 périodes par appel (`main.js:841-862`), soit 12 cartes : un rattrapage de 150 cartes se fait en ~13 appels, étalés sur des images d'animation.

### Ce que le joueur voit et ressent

- **À chaque carte** (si le jeu est ouvert, ou dans le bandeau de la carte si B l'affiche) : le jour avance d'un cran, la fumée monte, les ouvriers font un geste. Le compteur montre `Jour 143 · été`, **pas** « +1 jour ». Le gain de ressources est montré par l'icône qui pulse, avec le chiffre seulement dans l'infobulle.
- **Le crépuscule** : au-delà de 60 crédits du jour, le ciel du village passe au soir, puis à la nuit vers 120 ; les jours avancent moins vite (poids marginal). Le jeu ne dit jamais « assez » : la lumière le montre. Aucune pénalité.
- **Rattrapage** à l'ouverture du jeu après une séance faite ailleurs : avance rapide de **3 s au plus**, puis une ligne de chronique (« Pendant ton absence au village : 34 jours ont passé, l'été est venu »). Pas d'animation carte par carte.
- **Jeu fermé, ou Anki fermé** : le village est immobile (animations d'attente seulement, aucune production). Le mode « hors ligne » d'Evolve (rattrapage du temps réel) est coupé par B5 (`mode` différent de `'original'`).
- **Ère 0** : le calendrier d'Evolve n'avance pas encore (`calendar.day` reste 0 tant que `sundial` n'est pas recherché, `tech.js:94` et la garde `if (calendar.day > 0)` en `main.js:11776`) [code]. Le compteur affiche donc des **générations** (`Génération 412`) au lieu des jours. Le passage au calendrier (`sundial`) est un petit moment de chronique : « Le village compte ses jours ».
- **Effet de bord à signaler à B** [déduit] : le clic `rna` (`actions.js:22-38`, +1 RNA par clic) reste un moyen de produire sans réviser. Proposition : le désactiver en mode horloge, chaque carte jeune valant « le clic de la cellule » (voir §3).

### Tâche, test

- **C-H1** (avec B5) : compteur Jour/Génération + crépuscule + avance rapide bornée à 3 s. 1–2 soirées. Dépend de `ankiClock`, de l'événement `credit` et de `status().today.credits`.
- **Critère** : rejouer les 343 révisions réelles (9 → 16 oct.) ; le nombre de jours de village = Σ jours `E(n_jour)` (± 1 par arrondi) ; le crépuscule ne s'allume pas avec les journées réelles (max 46 cartes) ; aucune ressource ne bouge pendant 10 minutes de jeu ouvert sans carte.

---

## 3. Feature 1 — Jeunes pousses et chênes (R7)

**But d'apprentissage** : rendre visible et utile la **maturation** (la vraie mesure d'apprentissage d'Anki : une carte qui tient trois semaines), sans pouvoir l'accélérer. Les cartes jeunes nourrissent le quotidien, les cartes mûres font les matériaux qui construisent les grandes choses ; chaque carte qui mûrit laisse un bonus permanent.

**Risques de dérive** :
- *mentir sur le bouton* : si le noble exige le succès (Again = perte) → réglé par la règle « nature = `p`, jamais le bouton » ;
- *Easy pour mûrir plus vite* : si le chêne se plante au franchissement de l'intervalle *après* réponse, Easy le plante plus tôt → réglé par la maturation sur `p ≥ 21` (la carte doit avoir **vécu** 21 jours) ;
- *ajouter des cartes faciles* : plus de cartes = plus de chênes dans 3 semaines → plafond hebdomadaire de chênes comptés, bonus logarithmique ;
- *suspendre les cartes difficiles* : sans effet sur les chênes déjà plantés ; une carte suspendue ne rapporte simplement plus rien (aucun gain à suspendre) ;
- *réinitialiser une carte pour la « recultiver »* : le registre est par cid, pour toujours ; seule la suppression-recréation change de cid, et le plafond hebdomadaire borne cela.

### Variantes comparées

| | V1 « Crédit routé » (G2 tel quel) | **V2 « Les mines ne travaillent qu'aux jours de chêne »** | V3 « Filon continu » |
|---|---|---|---|
| Principe | Seul le crédit direct par carte est routé : jeune → base, mûre → noble. Le reste du jeu (mineurs, ticks) est inchangé | V1, **plus** : les ticks de l'horloge sont typés. Ceux qui viennent d'une carte mûre font tourner tout le village ; ceux d'une carte jeune en révision font tourner les mines/fonderies à `α(N)` (1 au début, 0,5 quand la maturité a un sens) | La part noble varie continûment avec la stabilité FSRS |
| Règle 4 (« nobles = maturité ») | **Faible** : les mineurs d'Evolve produisent du cuivre à chaque tick, mûre ou pas ; le crédit direct n'est qu'une fraction du flux | **Réelle** : la production noble entière suit la part de cartes mûres | Réelle mais opaque |
| Données | `p` | `p`, et l'ordre de traitement des ticks | `fsrs_stability`, **NULL chez l'utilisateur** [testé-B] |
| Coût | S | M | M |
| Verdict | Trop faible | **Retenue** | Écartée (pas de FSRS ; illisible) |

### Variante retenue : règles exactes

**(a) Ticks typés** [déduit ; levier vérifié].
Pour un jour avec `m` crédits mûrs (`p ≥ 21`), `k` nouvelles payées (`nw = 1`) et `y` révisions jeunes, **les cartes mûres passent d'abord** : ticks mûrs = `20·E(m)` ; les ticks restants `20·(E(m+k+y) − E(m))` sont répartis entre nouvelles et jeunes au prorata de `k` et `y`. L'ordre réel des réponses n'a aucune importance, et ajouter des cartes ne réduit jamais les ticks mûrs.
- Tick mûr ou tick de **nouvelle carte** : tout le village tourne normalement (introduire des cartes n'est jamais pénalisé : correction après la critique C-2 de D).
- Tick de **révision jeune** : `ankiMult(res)` multiplie Copper, Iron, Cement, Coal, Steel par `α(N)`, où `N` = maturations du registre : `α = 1` tant que `N < 100` ; puis `α = 1 − 0,5 × (N − 100)/900` ; `α = 0,5` à partir de `N = 1 000` (hyp ; réglage strict `α_min = 0`). `N` ne baisse jamais, donc `α` ne remonte jamais en punition. Branché par `production('psychic_boost', res)` : Copper `main.js:6166`, Iron 6229, Cement 4776, Coal 6554, Steel 5120 [code].
- Production noble effective = production d'Evolve × `(s + α·(1 − s))`, `s` = part des ticks mûrs **parmi les ticks de révision** (nouvelles exclues). Débutant (`N < 100`) : 100 %, le jeu d'origine ; utilisateur établi (`N ≥ 1 000`, `s ≈ 0,6`) : 80 %.
- Incitation résiduelle connue (D, C-2 c) : mentir « Bien » sur une carte mûre oubliée la garde mûre, donc `s` un peu plus haut les jours suivants ; effet d'une carte sur des centaines, accepté et à mesurer au rejeu.

**(b) Crédit direct routé** (le « geste » de chaque carte).
- Montant par crédit : `w × 1 % × max(res)` arrondi, minimum 1 unité (hyp), `w` = poids marginal du jour (B3 le fournit en millièmes).
- **Carte jeune** → famille de base : Food, Lumber, Stone (+ Furs si visible). **Carte mûre** → famille noble : Copper, Iron, Cement (+ Coal si visible).
- Choix de la ressource dans la famille : la ressource **visible** dont le remplissage `amount/max` est le plus bas (égalité : ordre fixe ci-dessus). Déterministe, rejouable. « Le village range la récolte là où il manque. »
- Noble encore caché (pas de mine construite : `Copper.display` ne passe à vrai qu'à la construction de la mine, `actions.js:2993` ; fer par `iron_mining`, `tech.js:2305` ; ciment par la cimenterie, `actions.js:2702`) [code] : le crédit va à la **réserve de B** (rien ne se perd), versée dès que la ressource apparaît. Réserve noble plafonnée à 300 unités (hyp) ; au-delà, la carte mûre donne de la base (« faute de mine, les chênes donnent du bois »).
- Tous les entrepôts pleins : réserve de B (B-interface §4).
- **Ère 0** : jeune → RNA `max(2, 2 % × max)` (≈ le clic de la cellule), mûre → DNA `max(1, 1 % × max)`. Les plafonds RNA/DNA restent ceux d'Evolve (`main.js:8133-8151`) ; `ankiCredit` passe par `modRes` (`main.js:12988-12993`, `functions.js:700`) [code].

**(c) Chênes (bonus permanent)**.
- `N` = nombre de maturations 21 j du registre de B depuis l'`epoch` de la partie. Les cartes déjà mûres à l'installation plantent leur chêne **à leur première révision** après l'installation (pas d'un coup).
- Bonus `= min(10 %, 2,5 % × log2(1 + N/100))` (hyp) sur **toutes** les ressources branchées à `psychic_boost` : N = 100 → 2,5 % ; 300 → 5 % ; 700 → 7,5 % ; 1 500 → 10 %.
- Au plus **100 chênes comptés par semaine** (hyp, même file que D pour la population) ; l'excédent attend la semaine suivante.
- Les chênes ne se perdent jamais, même si la carte est oubliée, suspendue ou supprimée.

### Affichage

- Un bosquet au bord du village : un arbre dessiné pour les 50 premiers, puis la densité de la forêt. Le nombre exact (« 312 chênes ») dans l'infobulle : c'est une mesure informative de son propre savoir, pas un score comparé.
- Dans l'infobulle des ressources nobles (`breakdown.p[res]`), seulement quand `α < 1` : « Jours de pousse : mines à 80 % ».
- Pendant les semaines sans carte mûre : un écriteau « Les premiers chênes pousseront quand des cartes auront tenu trois semaines » (honnête sur le délai, sans compte à rebours).

### Équilibrage

- **Part de la progression** [déduit, à mesurer] : le crédit direct pèse ~100 % au tout début de l'ère 1 (aucun ouvrier), puis 5–15 % du flux de base quand les ouvriers produisent ; les ticks font le reste. Les chênes : 0 pendant 3–5 semaines pour l'utilisateur réel, puis +2,5 à +7,5 % sur plusieurs mois.
- **Interactions** : la maturation 21 j est **le même événement** que les naissances de D (population) : budgétairement, chêne + naissance = une seule source ; la Flamme (C) ne touche pas les nobles ; le fleuve de D lit le *succès* sur les cartes mûres (règle 5, bande de rétention) : c'est la seule place où le bouton compte, et pour une mesure faite pour ça. Les stèles (180 j) et la merveille (365 j) de D prolongent l'échelle de maturation sans repayer le seuil 21.
- **Plafonds** : chênes 10 % ; `α ≥ 0,5` borne la pénalité des jours de pousse, nulle tant que `N < 100` ; réserve noble 300.
- **À vérifier au rejeu (critique C-5 de D)** : le crédit `1 % × max(res)` grandit avec les entrepôts ; si bâtir des entrepôts devient la meilleure stratégie à cause de ce seul effet, borner `max(res)` par un palier lié à l'ère.

| Profil (régulier, 3 mois, hyp) | 20 cartes/j | 60 cartes/j | 150 cartes/j |
|---|---|---|---|
| Jours de village par jour | 20 | 60 | ≈ 130 |
| Part mûre `s` (supposée) | 0,5 | 0,5 | 0,5 |
| `α(N)` à 3 mois (N = 155 / 415 / 930) | 0,97 | 0,83 | 0,54 |
| Mines effectives `s + α(1 − s)` | ≈ 98 % | ≈ 91 % | ≈ 77 % |
| Chênes à 3 mois (mêmes hypothèses que D : 3 / 8 / 20 nouvelles par jour, 80 % mûrissent à partir du jour ~25 ; file de 100/sem.) | ≈ 155 → +3,4 % | ≈ 415 → +5,9 % | ≈ 930 (file pleine) → +8,4 % |
| Crédits directs par jour | 20 | 60 | ≈ 130 équivalents |

- **Après 10 jours de pause** : rien ne bouge, rien ne se perd. Au retour, la pile de dues d'Anki crédite normalement (100 cartes → 95 équivalents) ; les cartes mûres oubliées pendant la pause donnent **encore** du noble ce jour-là (pas de punition), puis de la base jusqu'à remûrir.

### Tâches (dépendances B)

| Tâche | Contenu | Dépend de | Estimation | Critère de test |
|---|---|---|---|---|
| C-R1 | Routage du crédit direct (familles, remplissage, ère 0, réserve noble) | B3 (`credit` avec `p`, poids), B4 (réserve) | 1 soirée | `node --test` : 5 jeunes + 3 mûres avant la mine → 5 crédits de base, 3 en réserve, versés quand `Copper.display` passe à vrai ; même entrée deux fois → même sortie |
| C-R2 | Ticks typés « mûres d'abord », nouvelles neutres, `α(N)` sur les nobles | B5 (`ankiClock`), `ankiMult` avec contexte de tick | 1 soirée | jour (m = 10, k = 10, y = 20) : ticks mûrs = 200, nouvelles = 200, jeunes = 400 ; permuter l'ordre ne change rien ; N = 50 → cuivre inchangé ; N = 1 000 → cuivre à 50 % pendant un tick jeune |
| C-R3 | Chênes : lecture de `firstMature`, plafond hebdo, bonus log | B3 registre | ½ soirée | N = 100/300/700/1 500 → 2,5/5/7,5/10 % ; 400 maturations en une semaine → 100 comptées, 300 reportées |
| C-R4 | Affichage bosquet, écriteau, lignes d'infobulle | sprites (kit), C-R3 | 1 soirée | aucun chiffre hors infobulle ; écriteau visible tant que N = 0 |

---

## 4. Feature 2 — Flamme vive (S1 + S2 : chaleur, braise, repos, fête de reprise)

**But d'apprentissage** : la **régularité**, qui est le vrai point faible d'Anki (on décroche, les dues s'empilent). Entretenir un feu, pas rembourser une dette.

**Risques de dérive** :
- *série-angoisse* (aversion à la perte, « Streak Creep », G1 §3) : le compteur qui retombe à zéro → jamais de zéro, perte lente (−5 %/jour), aucun nombre de jours consécutifs affiché ;
- *1 carte par jour pour garder la flamme* : le jour ne compte pleinement qu'à `min(10, dues)` cartes ; un jour partiel chauffe au prorata ;
- *gonfler le volume* : au-delà du seuil, faire plus ne chauffe pas plus ;
- *ajouter des cartes pour atteindre le seuil* : le seuil descend aux dues du matin si elles sont moins de 10 ;
- *culpabilité au retour* : la fête de reprise et le vocabulaire (« la braise a tenu ») ;
- *s'absenter pour toucher la fête* (critique C-1 de D, juste : avec les repos, une absence de 3 jours ne coûtait rien et la fête rapportait) : la fête n'a lieu que si l'absence a **réellement coûté de la chaleur**, elle ne rend au plus que ce qui a été perdu, et elle ne verse aucune ressource ;
- *la seule chose qui change pendant la pause est une perte* (critique C-3 de D) : la perte est **plafonnée par absence** (−20 de chaleur au plus), quelle que soit la durée.

### D'où vient la série, puisqu'Anki n'en a pas

Anki n'a aucune série (G1 §1.4 : aucune occurrence de `streak` dans `rslib`, `proto`, `pylib`) et le provider n'a pas de revlog. Trois sources, par ordre de préférence :
1. **Le grand livre de B** (`ledger.js`) : `counted` et `credits` par jour Anki, recalculés au rejeu. C'est la seule définition utilisée par le jeu.
2. Pour l'alimenter **sans root** : `prop:rated=-k` pour k = 0…N donne exactement les cartes de chaque jour passé [code + testé-B] ; un appel (~1,2 s) par jour manquant, une fois.
3. Avec root : le revlog en copie (exact) ; sur PC : le revlog.
Les **dues du matin** viennent de la photo du jour de B (`deck_count`) ; absentes → seuil 10.
La Flamme se calcule **sur le calendrier d'Anki**, pas sur celui du village : un jour sans révision n'avance pas le village mais compte pour la braise. Elle est recalculée à chaque rejeu, donc des révisions d'un jour passé arrivées en retard réchauffent rétroactivement.

### Variantes comparées

| | V1 Série douce de B / rapport 7 (jours consécutifs, 2 jokers automatiques par semaine, `best`) | **V2 Chaleur à braise (G2 S1+S2)** | V3 Pas de série : seulement des jalons permanents (type tresse de D, Anki Garden) |
|---|---|---|---|
| Ce que le joueur suit | un nombre de jours | un feu (quatre états) | des monuments |
| Après un jour manqué | jokers, puis remise à 0 du compteur courant | −5 % de chaleur, jamais sous la braise | rien |
| Incitation à la régularité | forte, avec angoisse | **modérée, sans cliff** | faible au quotidien |
| Recouvrement avec D | — | aucun (la tresse de D est hebdomadaire, ses monuments sont des jalons) | doublon avec la tresse de D |
| Verdict | Garder `best`/`current` en interne seulement | **Retenue** | Laissée à D (tresse) |

### Variante retenue : règles exactes (hyp)

État : chaleur `H` ∈ [10, 100] (B stocke 0–1000 : `heat = 10·H`), `repos` ∈ [0, 3], `cpt` (jours comptés depuis le dernier repos gagné), `derniereFete`.
Départ : `H = 10` (une braise), `repos = 2`.

Pour chaque jour Anki `d`, dans l'ordre :
- `seuil = max(1, min(10, dues_matin(d)))` ; `q = min(1, crédits(d) / seuil)`.
- **Si `q > 0`** : `H ← H + g · q · (1 − H/100)` avec `g = 12` (le jour d'une fête, gain supplémentaire `min(gain normal, perdu)` : la fête rend au plus ce que l'absence a coûté). Si `q = 1` : `cpt += 1` ; quand `cpt = 6` : `repos = min(3, repos + 1)`, `cpt = 0`.
- **Si `q = 0`** : si `repos > 0` : `repos −= 1`, `H` inchangé (« le feu était couvert ») ; sinon `H ← max(10, H_debut − 20, 0,95 · H)`, où `H_debut` = chaleur au début de l'absence en cours (suite de jours consécutifs à `q = 0`).
- **Fête de reprise** : si l'absence qui se termine a duré ≥ 3 jours Anki, **qu'elle a fait perdre de la chaleur** (`perdu = H_debut − H > 0`), et si `d − derniereFete ≥ 14` : fête ce jour.

Effets :
- **Bonus Flamme** `= 10 % × H/100` sur Food, Lumber, Stone, Furs (par `ankiMult`) : braise 1 %, feu établi ≈ 10 %. Ère 0 : sur la production de RNA par les organelles et de DNA par le nucleus (`main.js:1233, 1241`, qui utilisent `global_multiplier` et **pas** `psychic_boost` [code] : deux points de branchement de plus), **seulement pendant les ticks issus de cartes** (critique C-4 de D) ; en mode `original` de l'horloge, aucun bonus Anki n'est actif.
- **Fête** : (1) gain de chaleur doublé dans la limite de ce qui a été perdu ; (2) **moral `global.city.morale.anki` +2** pendant 80 cartes (décroissant linéairement), qui s'affiche tout seul dans l'infobulle du moral (`main.js:347-360`) ; (3) une page de chronique chaleureuse. **Aucun crédit de ressource** (le +50 % sur 30 cartes de ma première version est retiré : il rendait l'absence rentable).
  *Variante écartée* : réutiliser l'événement d'Evolve `motivated` (`events.js:52-60`). Vérifié dans le code, il est trop fort pour le budget : `global.race.motivated = 400` ajoute `ceil(400^0,4)` = **+11 de moral** (`main.js:1443-1446`) **et** +6 au plafond de moral (`main.js:3221-3224`), décroît d'une unité par `midLoop` (`main.js:10253-10260`, ≈ 5 par carte, donc ≈ 80 cartes) : environ +5 % de production globale, soit presque tout le budget de moral commun (+12) [code + déduit].

Chaleur avec un jour compté chaque jour, depuis 10 : `H_n = 100 − 90·0,88^n` → 7 jours : 63 ; 14 jours : 85 ; 21 jours : 94 ; 30 jours : 98.

### Affichage

- Le feu au centre du village (le foyer, puis la `lodge`/la place selon l'ère) en **quatre états** : braise (H < 25), flammèche (< 50), feu (< 80), brasier (≥ 80). Pas de nombre de jours consécutifs, nulle part. `streak.current/best` de B restent internes.
- Repos en réserve : 0 à 3 bûches empilées à côté du feu. Un repos consommé : « Le feu était couvert hier ; il a tenu ».
- Infobulle : « Flamme : +6 % nourriture, bois, pierre, fourrures ».
- Le joueur n'apprend jamais une baisse par un message. Au retour : « La braise a tenu » (jamais « tu as perdu »).

### Équilibrage

- **Part de la progression** : ≤ +10 % sur les ressources de base ; ≈ +9 % pour un joueur régulier, ≈ +4–6 % pour un joueur intermittent. C'est la plus petite des grandes sources, voulu : elle récompense une habitude, pas un apprentissage.
- **Interactions** : la tresse de D (semaines à ≥ 4 jours comptés) lit les **mêmes** jours comptés ; les deux ensemble récompensent la régularité deux fois, sous deux formes (quotidienne réversible, hebdomadaire permanente). Le fleuve de D (Food des fermes) et la Flamme (Food entière) s'additionnent dans l'enveloppe de 40 %.
- **20, 60, 150 cartes/jour** : flamme identique (≈ +9,8 % au régime établi) dès que `q = 1`. La Flamme **ne récompense pas le volume**.
- **10 jours de pause** après deux semaines régulières (H = 85, repos = 3) : 3 repos absorbent 3 jours ; 7 jours à −5 % donneraient 59, la perte est plafonnée → **H = 65** (+6,5 %). Retour avec fête : 65 + 4,2 + 4,2 ≈ 73 ; deux jours après : ≈ 78. Une pause d'un mois donne le même 65 : pas de dette qui grandit avec la durée.
- **3 jours d'absence couverts par 3 repos** : chaleur intacte, **pas de fête** (rien n'a été perdu) : l'absence ne rapporte jamais.
- **L'utilisateur réel aujourd'hui** (≈ 5 jours comptés du 11 au 15 oct., rien depuis le 16) : H ≈ 53 au 15 oct. ; 2 repos absorbent 2 jours ; les jours suivants à −5 % → ≈ 45-48 le 20 oct. (les jours exacts viendront du rejeu). Le prochain jour de révision déclenche la fête (≥ 3 jours sans révision) : bon premier test réel (fête si la chaleur a baissé, ce qui est le cas).

### Tâches

| Tâche | Contenu | Dépend de | Estimation | Critère de test |
|---|---|---|---|---|
| C-F1 | Fonction pure `flame(days, params)` → `{H, repos, fete}` par jour | B3 (`counted`, `credits`, dues du matin) | 1 soirée | séries synthétiques : 30 jours pleins → 98 ; 10 jours de pause avec 3 repos depuis 85 → 65 ; 40 jours de pause → 65 aussi ; jamais < 10 ; un jour passé reçu en retard recalcule les jours suivants |
| C-F2 | Repos et fête (moral `anki` +2 sur 80 cartes) | C-F1, B4 (persistance) | ½ soirée | absence de 3 jours couverte par 3 repos → **pas** de fête ; absence de 5 jours avec 2 repos → 1 fête, gain ≤ perte ; seconde absence 10 jours plus tard → pas de fête ; aucun `Math.random` |
| C-F3 | Bonus par `ankiMult` + branchements ère 0 (`main.js:1233, 1241`) | `ankiMult` (B5) | ½ soirée | infobulle Food montre la ligne Flamme ; en ère 0, organelles × (1 + bonus) |
| C-F4 | Feu en 4 états, bûches, textes | kit sprites | 1 soirée | aucune occurrence d'un nombre de jours consécutifs à l'écran (revue) |

---

## 5. Feature 3 — Chronique des quatre voix (B1)

**But d'apprentissage** : reconnaître chaque réponse, **y compris l'échec**, sans jamais en faire une valeur ; renforcer l'honnêteté sur le bouton (un « À revoir » est accueilli aussi chaleureusement qu'un « Facile »).

**Risques de dérive** :
- *mentir sur le bouton* : nul tant qu'aucune valeur n'y est attachée → règle absolue : **jamais de chiffre, jamais de ressource, jamais de comparaison** entre voix ;
- *hiérarchie implicite* : si la voix de Facile est triomphante et celle d'À revoir triste, on récompense par le ton → les quatre voix ont le même registre, chaleureux et sobre ;
- *bruit / distraction* : une ligne par carte noie le journal d'Evolve → onglet dédié et cadence réduite dans l'onglet principal ;
- *culpabilité* : aucune voix ne parle de perte, de faute ou de retard.

### D'où vient le bouton (avec et sans l'astuce `customData`)

1. **Revlog** (root sur le téléphone, ou PC) : `b` exact [testé-B]. Source principale aujourd'hui.
2. `customData` `vf` (si l'utilisateur colle le JS de B2) : exact, même sans root [prévu B, astuce non testée].
3. **Sans les deux** : `prop:rated=0:b` pour b = 1…4, quatre appels par lot (≈ 5 s, jamais par carte) ; une carte présente dans un seul ensemble a un bouton sûr ; présente dans plusieurs (carte en apprentissage revue plusieurs fois) → **voix mêlée** [code, `sqlwriter.rs:364-368` filtre `ease = u`].
4. Rien de tout cela → **voix neutre** (« Le geste est fait. »).
La chronique n'est jamais réécrite quand un bouton exact arrive plus tard : c'est un journal.

### Variantes comparées

| | V1 Une ligne par carte dans le journal principal (G2) | V2 Bilan de séance chiffré par bouton | **V3 Une ligne par carte dans un onglet « Chronique », cadence réduite dans l'onglet principal** |
|---|---|---|---|
| Bruit | 150 lignes/jour, noie les messages du jeu | faible | faible dans l'onglet principal |
| Risque pédagogique | faible | **élevé** : compter les Again, c'est un tableau d'échecs | faible |
| Verdict | | Écartée | **Retenue** |

### Variante retenue : règles exactes

- **Filtre de messages** : ajouter `'chronique'` à `message_filters` (`vars.js:61`) ; les lignes passent par `messageQueue(texte, couleur, false, ['chronique'])` (`functions.js:384`) [code]. Couleur unique pour les quatre voix (`'info'`).
- **Onglet principal** : la première carte de la séance, puis une ligne toutes les 10 cartes (la plus récente), plus les moments : premier chêne, fête, passage de saison.
- **Choix du texte** : réservoir `voix[b][nature][ère]`, nature = pousse (`p < 21`) / chêne (`p ≥ 21`) / nouvelle (`nw = 1`), ère = 0 / 1 ; choix **déterministe** par `hash(cid, jour) mod taille` (pas de relance possible). Variante saisonnière en ère 1 (printemps, été, automne, hiver depuis `calendar.season`). Au moins **8 lignes par case**, ≈ 100 lignes en tout, écrites en français dans `strings/` (le fork a `strings/strings.json`).
- **Registres** (exemples, à écrire en entier dans la tâche C-C2) :
  - À revoir : « Un sentier oublié ; on le retracera. » — « Le feu a vacillé ; on a remis du bois. » — (chêne) « Les cendres nourriront le champ. » (reprend l'idée « cendres » de D, sans ressource)
  - Difficile : « Les mains sont lourdes ; le mur monte quand même. » — « Il a fallu chercher le mot. »
  - Bien : « Le geste est sûr. » — « La pierre tombe à sa place. »
  - Facile : « On a oublié qu'on savait. » — « Le chemin est connu. »
  - Mêlée : « On s'y est repris à plusieurs fois, c'est ainsi qu'on apprend. » ; neutre : « Le geste est fait. »
- **Interdits** (vérifiés par un test) : chiffres, mots « raté », « échec », « erreur », « faute », « perdu », points d'exclamation sur Facile, comparatifs (« mieux », « meilleur »).
- **Pas dans la carte Anki** : la voix n'apparaît pas dans le bandeau du réviseur (elle arriverait sur la question de la carte suivante et distrairait).

### Équilibrage

- **Part de la progression : 0.** Aucun budget consommé.
- **Interactions** : reçoit les moments des autres features (premier chêne, fête, stèle de D, bête apprivoisée de D) comme lignes de l'onglet principal ; c'est le **canal narratif commun** C+D.
- 20 / 60 / 150 cartes : 20 / 60 / 150 lignes dans l'onglet Chronique (au plus `msgFilters.chronique.max`), 2 / 6 / 15 dans l'onglet principal. Après 10 jours de pause : une ligne d'accueil (avec la fête), aucune allusion à l'absence.

### Tâches

| Tâche | Contenu | Dépend de | Estimation | Critère de test |
|---|---|---|---|---|
| C-C1 | Filtre `chronique`, cadence, choix déterministe | B (`credit` avec `b`, `p`, `nw`) | ½ soirée | même rejeu → mêmes lignes ; 150 crédits → 15 lignes dans « all » |
| C-C2 | Écriture des ~100 lignes | — | 1 soirée | test des interdits (expression régulière) ; relecture par Mathéo |
| C-C3 | Repli sans revlog ni customData (`prop:rated=0:b` par lots) | capteur B (provider) | ½ soirée | carte vue une fois : bonne voix ; carte vue 3 fois : voix mêlée |

---

## 6. Feature 4 — Courrier du soir (E2)

**Définition (G2)** : une fois par semaine, un conseiller du village écrit un petit texte en prose, sans graphique : jours étudiés, cartes mûries, et **un** conseil tiré du vrai bilan. Pas de notification : on le lit en ouvrant le jeu.

**But d'apprentissage** : un **retour informatif** (le seul type de retour dont la littérature dit qu'il augmente la motivation intrinsèque, Deci et al. 1999, rapport 7 §1.2) qui remplace les tableaux de bord, et qui oriente vers les **bonnes pratiques** Anki (reformuler les sangsues, freiner les nouvelles cartes quand les dues s'empilent), jamais vers « plus de révisions ».

**Risques de dérive** :
- *conseil qui pousse au volume* : l'exemple de G2 (« une révision de plus par semaine ») contredit l'ordonnanceur → interdit : le courrier ne conseille jamais de réviser plus que ce qu'Anki propose ;
- *bulletin scolaire* : notes, pourcentages, comparaison avec la semaine d'avant → prose, nombres seulement en mots et seulement pour les bonnes nouvelles ;
- *culpabilité* : pas de lettre pour une semaine vide ; la lettre suivante couvre la période et parle du retour ;
- *récompense attendue* (surjustification) : la lettre **ne donne rien** au jeu.

### Variantes comparées

| | V1 Une ligne hebdomadaire dans le journal | **V2 Une lettre hebdomadaire (parchemin), archivée** | V3 Un bilan après chaque séance |
|---|---|---|---|
| Lisibilité | perdue dans le journal | lue au calme, relisible | fréquente |
| Risque | faible | faible | devient un tableau de bord quotidien ; plus de distraction |
| Verdict | | **Retenue** | Écartée (option plus tard) |

### Variante retenue : règles exactes

- **Quand** : la semaine se ferme à la bascule du **dimanche soir** (jour Anki du dimanche, bascule lundi 4 h), réglable. La lettre est écrite au premier rejeu qui voit la semaine fermée. Une **enveloppe** apparaît à la porte du village (un messager immobile, pas de clignotement, pas de pastille) ; un toucher l'ouvre. Une ligne de chronique : « Un messager a laissé une lettre. »
- **Semaine vide** (aucun jour avec `q > 0`) : pas de lettre. La lettre suivante couvre toute la période depuis la dernière (au plus 3 semaines) et commence par l'accueil.
- **Déterminisme** : la lettre est un événement `letter` (clé = numéro de semaine, le premier gagne, comme les crédits) qui stocke les **paramètres** (pas le texte) ; le texte est rendu par des modèles versionnés. Rejouable sur les deux appareils.
- **Données** (toutes déjà dans le grand livre de B ou la photo du jour) : jours avec `q > 0` et jours comptés ; crédits ; maturations de la semaine (chênes, et stèles/briques de D) ; états de la flamme ; constructions et techs de la semaine (journal du jeu) ; par paquet : crédits mûrs et oublis mûrs (`p ≥ 21 && b = 1`, exact par le revlog) ; photo du jour : `tag:leech`, dues en retard (`prop:due<0`), charge des 7 jours à venir (`prop:due=1..7`), nouvelles introduites (`introduced:7`).
- **Contenu** (≤ 150 mots, signé d'un personnage fixe, « Odile, la scribe ») :
  1. Salutation selon la saison du village.
  2. Ce qui a poussé, en mots : « presque chaque soir », « trois soirs » ; « douze cartes sont devenues des chênes ».
  3. Ce que le village a fait de la semaine : 1–2 constructions ou découvertes (le lien cartes → village).
  4. **Au plus un conseil**, le premier vrai dans cet ordre (seuils hyp) :
     - a. sangsues (`tag:leech`) en hausse → « deux ou trois cartes de *X* reviennent sans cesse ; les reformuler, ou les couper en deux, les rendrait plus légères » (et si D a la ménagerie : « elles rôdent près des enclos ») ;
     - b. dues en retard en hausse **deux semaines de suite**, avec des nouvelles introduites → « le grenier déborde ; quelques jours avec moins de nouvelles graines laisseraient rentrer la récolte » ;
     - c. paquet avec ≥ 20 révisions mûres et ≥ 20 % d'oublis mûrs → « les chênes de *X* vacillent ; vérifier que chaque carte ne demande qu'une seule chose » (conseil de **forme** de carte, jamais « réviser plus ») ;
     - d. charge à venir ≥ 1,5 × la moyenne → « la semaine qui vient sera chargée ; rien ne presse, le village attendra » ;
     - e. sinon, un retour de compétence : « les chênes de *X* tiennent bon ».
  5. Formule de fin fixe, jamais de « à demain ».
- **Interdits** : pourcentages, rétention chiffrée, nombres de jours consécutifs, comparaison avec une autre semaine en termes de « mieux/moins bien », toute mention d'un manque.
- **Archives** : toutes les lettres restent lisibles dans un registre du village (bâtiment de scribe, ou un bouton « Courrier »).
- **Effet économique : aucun.**

### Équilibrage

- **Part de la progression : 0.** Aucun budget. Interactions : c'est la vitrine hebdomadaire des features de C **et** de D (chênes, flamme, stèles, bêtes, monuments) ; elle doit rester courte : une phrase par feature au plus, deux features citées au plus.
- **20 / 60 / 150 cartes** : même lettre, mêmes seuils ; à 150/jour, le conseil b (grenier qui déborde) est le plus probable, et c'est le bon.
- **Après 10 jours de pause** : une lettre normale pour la semaine étudiée ; aucune pour la semaine vide ; la suivante commence par « Te revoilà ; le village a gardé la braise. »
- **Utilisateur réel** : collection de 11 jours, 506 cartes suspendues, aucune mûre : les premières lettres parleront des pousses et de la charge (3 073 nouvelles en attente : le conseil b deviendra utile si le retard grossit).

### Tâches

| Tâche | Contenu | Dépend de | Estimation | Critère de test |
|---|---|---|---|---|
| C-L1 | Statistiques hebdomadaires depuis le grand livre + photo du jour ; événement `letter` | B3, photo du jour (§2.1 de B) | 1 soirée | rejeu des 343 révisions : lettre de la semaine du 12 oct. produite, identique à chaque rejeu ; semaine vide → pas de lettre |
| C-L2 | Modèles de texte, règles de conseil, interdits | C-L1 | 1 soirée | test des interdits ; chaque règle a/b/c/d/e déclenchée par une semaine synthétique |
| C-L3 | Enveloppe, parchemin, archives | kit / interface | 1 soirée | aucune notification Android, aucun clignotement (revue) |

---

## 7. Budget d'ensemble et ordre d'arrivée

| Source | Ressources | Plafond | Part estimée [déduit, à mesurer] |
|---|---|---|---|
| Horloge à cartes (ticks d'Evolve) | toutes | `E(n)` | 80–90 % du flux dès que les ouvriers travaillent |
| Crédit direct routé (R7) | base / nobles | `E(n)`, 1 % du max par carte | 100 % au démarrage d'une ère, 5–15 % ensuite |
| Jours de pousse (R7) | nobles × `s + α(1 − s)` | `α(N)` de 1 (N < 100) à 0,5 (N ≥ 1 000) | aucun malus au début ; 77–98 % des nobles d'origine à 3 mois |
| Chênes (R7) | toutes (`psychic_boost`) | +10 % | 0 pendant 3–5 sem., puis +2,5 à +7,5 % |
| Flamme (S1) | Food, Lumber, Stone, Furs (+ RNA/DNA en ère 0) | +10 % | +4 à +10 % |
| Fête (S2) | moral `anki` +2 (≈ 80 cartes), chaleur rendue ≤ chaleur perdue | 1 / 14 jours, seulement après une perte réelle | aucun crédit de ressource |
| Chronique, Courrier | aucune | 0 | 0 |
| **Total C** | | **+20 % de multiplicateurs**, moral +2 temporaire, ≤ 1 fois / 14 jours | |
| D (rappel de son ouverture) | fleuve (Food des fermes) ≤ 15, guildes ≤ 15/métier, ménagerie ≤ 5, moral ≤ 8, population ≤ 25 % du logement | plafond global +40 %, prorata | — |

**Ordre d'arrivée proposé** (accord de principe avec D) : (1) horloge + routage R7 (C-H1, C-R1, C-R2) ; (2) Chronique (C-C1..3) ; (3) Flamme (C-F1..4) ; (4) Courrier (C-L1..3) ; **test de deux semaines** mesuré dans le revlog (rapport 7 §4.4) ; (5) chênes (C-R3, C-R4), qui de toute façon restent muets jusqu'aux premières maturations ; puis les features de D, en ère 1 seulement.
Total C ≈ **14–16 soirées**, dont ≈ 4 d'écriture et de dessin.

---

## 8. Jugement croisé avec D (résumé ; détail dans `discussion-CD.md`)

### 8.1 Accords obtenus (C, D, et B pour la plomberie)
- Enveloppe additive par ressource, **plafond +40 %**, `ankiMult(res)` fourni par B au point `psychic_boost` ; C ≤ 20 (Flamme 10, Chênes 10), D ≤ 15 ; je propose la réduction **au prorata** quand le plafond mord.
- Moral Anki (`morale.anki`) plafonné à 12 : monuments de D ≤ 10, fête de C ≤ +2 temporaire. Ni `motivated` ni `inspired` d'Evolve comme récompenses (trop forts, vérifié).
- Population : enveloppe séparée, à D.
- **Registre de maturation unique** 21 / 180 / 365 j, sur `p` (intervalle avant), une fois par carte et par seuil ; file de **100 par semaine** pour les compteurs économiques.
- **Noble = `p ≥ 21`, quel que soit le bouton** : défaut retenu par B (`nobleRequiresSuccess = false`) ; D écarte en conséquence les « cendres fertiles » comme ressource ; l'image passe dans ma Chronique.
- `jour compté` = `crédits ≥ max(1, min(10, dues du matin))`, partagé par ma Flamme et la tresse cumulée de D.
- Les textes des features de D passent par la Chronique et le Courrier.
- Ordre : socle B → C (horloge + R7, Chronique, Flamme, Courrier) → test de deux semaines → D-1 → D-2 → D-3 ; aucune feature D en ère 0.

### 8.2 Mes critiques de D (détail : discussion-CD, message « jugement croisé »)
1. **Guildes** : deuxième prime de maturation (même entrée, même forme que les chênes) ; je propose qu'elles **redistribuent la masse des chênes** au lieu d'en créer une, et qu'elles passent en D-3 (inactives 2–3 mois sur la collection réelle).
2. **« Réussi » revient** dans la définition de maturation de D et dans l'**apprivoisement** de la ménagerie : révision unique et permanente, donc celle où mentir paie, sur une sangsue. Proposition : `p ≥ 21` après l'état sauvage, quel que soit le bouton.
3. **Fleuve** : rampe 0,80 → 0,85 trop raide (mentir juste sous 85 % paie) → 0,70 → 0,85 ; bande liée à la rétention visée si FSRS est activé ; le **ciel clément ne doit pas être hors enveloppe** ; la source « photo du matin » devient un simple repli puisque B lit le revlog.
4. **Population** : double lecture de la maturation acceptée, mais +25 % du logement est le plus gros levier d'Evolve et sature dès 90 jours → **≤ 15 %** au départ.
5. **Brume** : ne doit pas s'épaissir sous les yeux de celui qui revient (image de culpabilité) → au plus une bande par semaine, hors de la vue par défaut, ou recul seulement.

**Réponses de D** : les cinq critiques sont acceptées. Guildes : plus de masse nouvelle, elles **orientent la moitié des chênes** (`b_j = X/2 + min(1,5·X ; (X/2)·|J|·s_j)`, chaque métier entre `X/2` et `2X`), passées en D-3 ; « quel que soit le bouton » partout (maturation, apprivoisement, stèles, Merveille) ; fleuve avec rampe 0,70 → 0,85 et bande liée à la rétention visée si FSRS ; ciel clément devenu un arc-en-ciel cosmétique ; population ≤ 15 % ; brume ≤ +1 bande par semaine, hors cadrage. D ≤ 15 (fleuve 8 + ménagerie 3).

### 8.3 Critiques de D sur mes features, et mes réponses (toutes acceptées et reportées ci-dessus)

| Critique de D | Ma réponse | Où |
|---|---|---|
| C-1 La fête est rentable à provoquer (3 jours couverts par les repos, puis fête) | Fête seulement si l'absence a coûté de la chaleur ; gain ≤ perte ; plus aucun crédit de ressource | §4 |
| C-2 `α = 0,5` pénalise le débutant (l'utilisateur réel) et freine l'introduction de cartes | `α(N)` = 1 tant que N < 100 maturations, 0,5 à N ≥ 1 000 ; ticks des nouvelles cartes neutres ; incitation résiduelle (c) écrite | §3 |
| C-3 La flamme fond seule pendant que le village dort | Perte plafonnée à −20 par absence ; 10 jours ou un mois → 65 depuis 85 | §4 |
| C-4 Ère 0 : bonus sur production passive | Bonus seulement pendant les ticks issus de cartes ; rien en mode `original` | §4 |
| C-5 Crédit ∝ `max(res)` pousse peut-être à bâtir des entrepôts | À vérifier au rejeu ; repli : `max` borné par un palier d'ère | §3 |

D approuve sans réserve : noble sur `p ≥ 21` (à valider par Mathéo), maturation sur `p`, Chronique sans valeur et test des mots interdits, Courrier sans effet économique, crépuscule.

**Interaction nouvelle à surveiller** : avec les guildes, les chênes peuvent monter à `2X` (≤ 20 %) sur la ressource d'un métier ; pire cas théorique Food = flamme 10 + chênes orientés 20 + fleuve 8 + ménagerie 3 = 41 → le prorata mord d'un point. Accepté par les deux, à vérifier au rejeu. **Tâche commune C/D** : C-R3 expose `X`, GUI-3 remplace la contribution des chênes par `b_j`.

**Désaccord restant avec D : aucun.** **Décision ouverte pour Mathéo** : noble indépendant du bouton (règle 4 du rapport 7) ; défaut de B, repli `nobleRequiresSuccess`.

---

## 9. Points d'honnêteté

- **Vérifié dans le code** : `ankiCredit`/`modRes` ; `production('psychic_boost', res)` et ses sites ; boucles et rapports (`vars.js:2275`) ; calendrier (`main.js:11776-11815`), `sundial` qui lance le jour (`tech.js:94`) ; déblocage de Copper/Iron/Cement ; `motivated` (durée, effet sur `moraleCap`) ; `message_filters` ; sémantique de `prop:rated` dans Anki.
- **Constaté par B** (je ne l'ai pas refait) : FSRS désactivé, aucune carte mûre, activité réelle, `prop:rated=-k` sur l'appareil, revlog lisible en copie.
- **Déduit, non exécuté** : que les ticks typés se branchent proprement par un drapeau de contexte lu dans `ankiMult` ; que 1 carte = 1 jour donne un rythme agréable ; toutes les parts de progression.
- **Spéculatif** : tous les paramètres marqués (hyp) ; l'effet réel sur la régularité et la rétention (aucune étude ne l'a mesuré pour un add-on, G1 §3) : seul le test de deux semaines le dira.
- **Décision à faire valider par Mathéo** : le noble indépendant du succès (modifie la règle 4 du rapport 7).
