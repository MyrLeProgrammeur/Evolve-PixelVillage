# D — Conception des features ambitieuses et folles (cartes Anki → Evolve)

Auteur : conception-D, 2026-10-20. Lecture et écriture de documents seulement : aucun code du jeu modifié, rien exécuté.
Binôme : conception-C (combinaison prudente, `rapports/plan/C-conception.md`). Discussion : `rapports/plan/discussion-CD.md`.
Socle : agent B (`rapports/plan/B-interface.md`, **version 0** lue le 2026-10-20 ; elle est arrivée pendant ma rédaction, j'ai aligné le rendu dessus). Ce que B a **constaté sur le téléphone** et qui change la conception : **FSRS est désactivé** (aucune stabilité ni retrievability) ; **aucune carte mûre** (collection créée le 9 oct., 3 182 cartes dont 3 073 nouvelles) ; en root, B lit une **copie du revlog** : bouton exact `b` et intervalle avant `p` sont donc **exacts** sur le téléphone ; activité réelle 21-46 cartes distinctes par jour. Je marque **[B]** ce que B confirme et **[B prévu]** ce que B construit sans l'avoir vérifié.

**Conséquence majeure** : presque toutes mes features reposent sur des cartes mûres ou très mûres ; avec cette collection elles sont **muettes plusieurs semaines** (fleuve, population, guildes), **plusieurs mois** (stèles à 180 j : premières vers le 7e-9e mois ; ménagerie : il faut d'abord des sangsues) ou **plus d'un an** (Merveille à 365 j). Seuls les **monuments de la tresse** vivent dès la première semaine. C'est voulu (« on ne peut pas acheter du temps »), mais l'ordre d'arrivée en tient compte (§13).

**Légende de fiabilité.** **[code]** = vérifié dans `evolve-pixel-village/src/` (fichier:ligne lus) ; **[G1]** = disponibilité de la donnée tirée de `rapports/audit/G1-cartes-etat-de-l-art.md` (lu dans le code d'AnkiDroid par l'agent G1, pas par moi) ; **[déduit]** = raisonnement ; **[spéc]** = spéculatif, jamais testé ; **(hyp.)** = paramètre chiffré de départ, à recalibrer par le rejeu d'un historique réel (rapport 7, règle 9).

---

## 0. Résumé

| Feature | Verdict | Variante retenue (une ligne) | Levier Evolve | Débloquée |
|---|---|---|---|---|
| Population ← cartes apprises (T2) | **Garder, transformée** | Le plafond de logement gagne `min(⌊√chênes⌋, ⌈15 % du logement⌉)` places ; jamais de baisse ; pas d'habitant « dormant » | `caps[species]`, `main.js:8794-8812` | 1re `basic_housing` |
| Paquets → métiers (D1) | **Garder** | *Guildes* : la **moitié du bonus des chênes** de C est orientée vers les métiers auxquels on confie des paquets (poids = maturations du paquet) ; aucune réserve nouvelle, somme constante | `ankiMult(res)` au point `production('psychic_boost', res)` | 2 métiers + un paquet à 20 maturations |
| Fleuve de la mémoire (R1) | **Garder** | Rétention des cartes mûres (première réponse du jour, `p ≥ 21`) sur les 30 derniers **jours comptés**, exacte par le revlog en root, sinon recherches Anki ; plateau 85-95 % ; ≤ +8 % de nourriture ; rampe de confiance | `ankiMult('Food')` (fermes = seule source de nourriture de l'humain en Ère 1) | 1re ferme (`agriculture`) |
| Monuments (S3 + M4) | **Garder, transformée** | Semaines tressées **cumulées** (jamais remises à zéro) → 7 monuments ; cartes revues à intervalle avant ≥ 365 j → briques d'une *Merveille* en 6 étages ; moral + plafond de moral, ≤ +10 | `global.city.morale.anki` + `moraleCap`, `main.js:3198-3275` | cadran solaire (`sundial`) |
| Bestiaire (M1) | **Garder** | *Ménagerie* : sangsues = bêtes sauvages (jamais de dégâts), apprivoisées quand la carte est revue à intervalle avant ≥ 21 j après sa dernière rechute ; +0,25 % permanent chacune, ≤ +3 % | `ankiMult` ; événement `pet` (cosmétique) | cadran solaire |
| Stèles (M3) | **Garder** | Carte revue à intervalle avant ≥ 180 j (registre de B) → une stèle gravée du début de sa question, dans une allée du village ; aucun effet économique | rendu seulement (kit) | cadran solaire |
| Ambassades (D2) | **Transformer** → *Comptoirs* | Trois paquets jumelés aux trois voisins ; semaines « honorées » cumulées → +1 route de commerce puis hostilité abaissée jusqu'à un plancher de 55 ; jamais de hausse | `market.mtrade`, `main.js:9861-9900` ; `foreign.govN.hstl` | tech `trade` |
| Brouillard des oubliés (R3) | **Transformer** → *Brume* cosmétique | Brume au bord de la carte = part des cartes à R < 0,7 ; ne cache aucune ressource | rendu seulement | Ère 1 |
| Climat (R2) | **Transformer** → *Arc-en-ciel* cosmétique | Semaine dans la bande du fleuve : un arc-en-ciel après la pluie ; le tirage météo d'Evolve n'est pas touché (le retrait de pluies était un effet hors enveloppe) | aucun (rendu) | 1re ferme |
| Rites de passage (T3) | **Transformer** → cérémonie cosmétique | Jour du rite proposé à un palier d'ère : finir ses dues du jour (n'importe quel bouton) → bannière et chapitre de chronique ; jamais bloquant | aucun | paliers d'ère |
| Cendres fertiles (B2) | **Écarter** (effet économique) ; l'image passe à la Chronique de C sous le nom *terreau* | B retient par défaut « noble = `p ≥ 21` quel que soit le bouton » (proposition de C) : plus d'écart à compenser ; payer l'oubli rendrait alors « À revoir » plus rentable que « Bien ». Si Mathéo garde « noble = réussie » (`nobleRequiresSuccess`), ma variante de repli est une compensation à 50 % (§2) | — | — |
| Paris de confiance (B4) | **Écarter** | Le joueur contrôle à la fois la prédiction et le bouton : aucune règle de score n'est propre, la triche est triviale et fausse la planification | — | — |
| Banque du temps (R4) | **Écarter** | Le gain d'intervalle et de stabilité dépend directement du bouton (Easy paie) et du retard (réviser tard paie, G1 A7) | — | — |

Ordre d'arrivée (accordé avec C) : socle B → features C (horloge, R7, chronique, flamme, courrier) et **test de deux semaines** → **D-1** monuments (seule feature D vivante dès la première semaine), stèles, fleuve → **D-2** population, ménagerie → **D-3** guildes, comptoirs, brume, arc-en-ciel, rites.

---

## 1. Cadre commun (ce que toutes mes features supposent)

### 1.1 Règles anti-triche décidées, et comment je les applique
1. **Une récompense par (carte, jour Anki)**, première réponse du jour. Mes features ne créditent rien carte par carte (sauf le don de la ménagerie) : elles lisent des **compteurs de cartes distinctes** (maturations, stèles, briques, bêtes) qui ne peuvent monter qu'**une fois par carte pour toujours**.
2. **Base indépendante du bouton.** Aucune de mes features ne touche la base. Une seule lit l'issue (réussi / oublié) : le fleuve, avec l'arc-en-ciel qui n'en est que l'image ; c'est la mesure de la règle 5 (rétention), faite pour ça. Je la borne (rampe large, plateau, plafond bas) et je le dis. Tous les registres (maturation, stèles, Merveille, apprivoisement) sont indépendants du bouton.
3. **Rendement décroissant.** Toutes mes courbes sont concaves (√ ou log) **et** ont un plafond relatif ou absolu.
4. **Matériaux nobles seulement pour les cartes mûres.** Le seul don matériel (ménagerie) vient d'une réussite à intervalle ≥ 21 j.
5. **Ni classement ni notification.** Rien ici n'envoie de message hors du jeu ; tout s'affiche quand on ouvre le jeu.
6. **Rien ne se perd.** Aucun de mes compteurs ne baisse. Une pause ne retire rien ; seule la croissance s'arrête. Le seul effet qui « fond » est cosmétique (la brume).

### 1.2 Données d'entrée (alignées sur B v0)
| Donnée | Définition commune (C, D, B) | Source téléphone | Source PC | Statut |
|---|---|---|---|---|
| Crédit (cid, jour) | première réponse **éligible** du jour Anki (bascule 4 h) ; exclus : `rt` 3/4/5, `b = 0` | revlog en copie (root) ou ContentProvider | revlog | **[B]** (`ledger.js`, B §3) |
| `did` | paquet de la carte (paquet d'origine si filtré) | revlog + `cards` | idem | **[B]** |
| `p` (intervalle avant) | `lastIvl` | exact par le revlog (root) ; sinon `customData` `vp` (pas installé) ; sinon absent | `lastIvl` | **[B]** |
| `b` (bouton) | 1-4 | exact par le revlog (root) ; sinon `customData` `vf` ; sinon absent | `ease` | **[B]** |
| `réussi` | `b > 1` à la première réponse du jour | revlog ; repli sans root : `prop:rated=-k` moins `prop:rated=-k:1` (confirmé sur l'appareil par B) | `ease > 1` | **[B]** |
| `maturation` 21 / 180 / 365 | **registre unique** `firstMature[cid]` : premier crédit où `p` franchit le seuil, **quel que soit le bouton**, une fois par carte et par seuil, pour toujours | dérivé de `p` | idem | **[B]** ; j'ai accepté la suppression de la condition de succès proposée par C (la révision unique ne doit pas être celle où mentir paie ; les 21/180/365 j incompressibles suffisent comme preuve) |
| `lapseMature` | crédit avec `p ≥ 21` et `b = 1` | revlog | idem | **[B]** |
| `lapses`, sangsue | compteur de carte ; étiquette `leech` | P `lapses` (champ `lp` de B) ; S `tag:leech` | idem | **[B]** pour `lp` ; `tag:leech` non testé |
| `jour compté` | crédits ≥ min(10, dues du matin) ; **je demande « et ≥ 1 »** (sinon un jour à 0 due compte avec 0 carte) | journal + photo du jour | revlog | **[B prévu]** ; correction « ≥ 1 » envoyée à B et C |
| Dues d'un paquet le matin | photo du jour par paquet `{…, due}` (B §2.1) ; je demande `deck:"X" is:due` (non plafonné par les limites du paquet, contrairement à `deck_count`) | P | sched | **[B prévu]** ; précision demandée |
| Stabilité / retrievability | — | **indisponibles : FSRS désactivé** | — | **[B]** : repli sur l'intervalle partout |
| Texte de question (stèles, fiches de bêtes) | début de la question, HTML retiré | P : colonne de texte rendu [G1] | `notes` | **absent de la liste de B** : demande envoyée |

**Cartes anciennes.** La collection réelle n'a **aucune** carte mûre (B) : pas d'afflux d'anciennes maturations. Je garde quand même une sécurité pour une collection importée ou ancienne : les compteurs **économiques** avancent d'au plus **100 maturations par semaine** (hyp.), le surplus attend en file (rien ne se perd) ; la Merveille monte d'au plus un étage par semaine.

### 1.3 Budget (accord C ↔ D dans la discussion)
Accord obtenu (voir `discussion-CD.md`) : enveloppe additive par ressource plafonnée à **+40 %** ; **C ≤ 20** (flamme ≤ 10, chênes ≤ 10), **D ≤ 15** (C a écrit 15 ; j'accepte, je n'en ai plus besoin depuis que les guildes puisent dans les chênes : les 5 points restants sont une marge qui évite au prorata de mordre en pratique) ; quand le plafond mord, **réduction au prorata** de toutes les features (amendement de C : sinon la dernière activée devient invisible) ; dons ponctuels ≤ l'équivalent d'**une journée de crédit direct par 7 jours**, toutes features confondues ; nobles seulement depuis des cartes mûres ; **moral Anki ≤ +12** : **D ≤ +10** permanent (monuments), C ≤ +2 temporaire (fête de reprise, clé `morale.anki`, **pas** `global.race.motivated` : C a vérifié qu'il vaut +11 de moral et +6 de plafond, `main.js:1443-1446`, `3221-3224`) ; **plafond de population** = enveloppe séparée, D seul, ≤ +15 % du logement (hyp., C a critiqué mes 25 %). Pour vérifier le pire cas, chênes, places de population et guildes comptent **comme une seule source** (une maturation, plusieurs lectures).

| Feature D | Ressources | Plafond (hyp.) |
|---|---|---|
| Fleuve | Food | +8 % |
| Guildes | la ressource du métier | **0 point D** : orientent la moitié des chênes de C (un métier entre X/2 et 2X) |
| Ménagerie | toutes celles qui passent par `ankiMult` | +3 % |
| Sous-total D | par ressource | ≤ +11 % en pratique (plafond D : 15) |
| Monuments + Merveille | moral | +10 points et +10 de plafond |
| Population | plafond de citoyens | +15 % du logement |
| Don de la ménagerie | noble | dans le budget commun des dons |

**Plomberie** : B fournit `window.ankiMult(res)` et `ankiMult.set(feature, res, bonus)` (somme additive, plafond par ressource réglable, ligne dans `breakdown.p[res]`) **[B prévu]**. Je n'enregistre que des bonus ; B fait la somme, le plafond et le prorata.

**Point d'application vérifié [code].** C a trouvé que `production('psychic_boost', res)` (`src/prod.js:494-507`, renvoie 1 hors trait psychique) est appelé aux sites de production de Food (`main.js:3598` fermiers), Furs (`4056`, `4093`), Cement (`4776`), etc. ; j'ai vérifié ces lignes. `ankiMult(res)` s'y branche. **Limite** : Knowledge et Money n'y passent pas, donc ni professeur ni banquier dans les guildes au départ. **Affichage** : un multiplicateur caché dans `production()` n'apparaît pas dans l'infobulle ; B doit ajouter une ligne `breakdown.p[res]['ᄂ<nom>']` par feature active (motif déjà utilisé `main.js:3600-3604`).

---

## 2. Jugement des features folles

| Idée (G2) | Apprentissage servi | Triche / dérive | Faisabilité téléphone | Coût | Plaisir | **Verdict** |
|---|---|---|---|---|---|---|
| **M1 Bestiaire** | Traite le vrai problème des sangsues ; pousse à reformuler | Fabriquer des sangsues (4 oublis puis re-mûrir : des mois, gain minuscule) | `lapses`, `tag:leech`, intervalle : tout dispo [G1] | M | Fort (collection, histoires) | **Garder** (§7) |
| **M3 Stèles** | Retour informatif positif : « ce que je sais vraiment » | Aucune notable (il faut 180 j de rétention) | Texte de question via P [G1, champ à confirmer] | S/M | Fort, fierté | **Garder** (§8) |
| **D2 Ambassades** | Faire **toutes** les dues d'un paquet (bonne pratique) | Choisir des petits paquets → parade : fraction des dues + minimum de dues ; abaisser la limite de révisions → parade : `is:due` non plafonné | `is:due` par paquet [G1] | M | Moyen-fort (diplomatie) | **Transformer** : dans la partie standard, l'hostilité ne sert qu'aux raids (> 60), siège (> 80), prix des espions et annexion (`events.js:143`, `197` ; `civics.js:791`, `871`, `911`) [code] ; `govRelationFactor` ne joue qu'en *truepath* (`civics.js:128-138`) [code]. Je garde une version **sans aucune hausse d'hostilité** et avec routes de commerce (§9) |
| **R3 Brouillard** | Montre l'oubli qui guette, aide au retour après pause | Suspendre les cartes oubliées → parade : les suspendues restent dans le calcul | `prop:r<0.7` [G1] | L dans G2 (carte des régions) | Fort visuellement | **Transformer** en brume **cosmétique** : cacher des gisements serait un verrou de progression lié à l'oubli, donc une pénalité (§10) |
| **R2 Climat** | Rétention dans la bande cible | Mêmes risques que le fleuve ; **imposer la pluie serait une pénalité** (pluie −2 moral, orage −5, `main.js:1401-1430` ; froid pluvieux −30 % fermes, `main.js:3535-3547`) [code] | idem fleuve | S | Poétique | **Transformer** : d'abord « ne retirer que des pluies » ; puis, après la critique de C (effet hors enveloppe), réduit à un **arc-en-ciel** cosmétique lié au fleuve (§5.6) |
| **T3 Rites** | Finir ses dues un jour donné | G2 exige 85 % de réussite : pousse à mentir sur le bouton, stress d'examen | trivial | S | Moyen (cérémonie) | **Transformer** : aucune condition de réussite, jamais bloquant, purement cosmétique (§11) |
| **B2 Cendres** | « Erreur productive », moins de honte | Payer l'oubli rend « À revoir » plus rentable que « Bien » si la récompense dépasse l'écart de la règle 4 | `lapses` [G1] | S | Faible | **Écarter** si C fait adopter « noble = intervalle avant seulement » (plus d'écart à compenser) ; sinon la garder comme **compensation partielle** (≤ 50 % de la valeur du noble manqué, une fois par carte et par 30 j). L'image va à la Chronique de C (ligne d'« À revoir ») |
| **B4 Paris** | Métacognition (réelle) | Le joueur choisit **la prédiction et le bouton** : la règle de Brier suppose une issue indépendante du parieur ; ici il suffit d'accorder le bouton au pari. La triche fausse la planification, le pire risque du rapport 7 §1.2 | Interface sur la face question (J) | L | Fort mais distrayant (+1 geste par carte) | **Écarter** |
| **R4 Banque du temps** | « Mon apprentissage est un placement » | La stabilité FSRS après réponse dépend du bouton (Easy la gonfle) et du retard (G1 A7 : réviser tard donne un gros gain) | `fsrs_stability`, intervalle [G1] | M | Moyen | **Écarter** : aucune variante sans incitation à Easy ou au retard ; le « capital de mémoire » est déjà incarné par la population et les chênes |

---

## 3. Population selon les cartes apprises (*Naissances de la mémoire*)

**But d'apprentissage.** Rendre visible le stock de connaissances durables (« mes connaissances sont des gens »), récompenser la maturité réelle, pas le volume du jour.
**Risques de dérive.** Ajouter des cartes faciles pour faire naître des habitants (dérive Keeps / Cristal, G1 §2.2) ; peur de l'échec si un oubli tue ou endort (Keeps : mort et deuil, G1 H1) ; suspendre les cartes difficiles.

### 3.1 Variantes
| | A. Plafond de logement (retenue) | B. Berceau (naissances en file) | C. Plafond imposé par les cartes |
|---|---|---|---|
| Principe | Chaque maturation (registre unique) ajoute à un stock ; le plafond de population gagne une fonction concave du stock | Chaque maturation met un bébé dans un berceau, qui entre au village dès qu'il y a une place libre (comme `civic.homeless`, `main.js:3903-3908`) | Population max = min(logement, cartes apprises) |
| Effet | Plus de travailleurs à long terme, la croissance normale d'Evolve remplit les places (`main.js:3909-3975`) | Remplissage plus rapide des places existantes, pas de place en plus | Les maisons deviennent inutiles sans cartes |
| Rien ne se perd ? | Oui (compteur monotone) | Oui | **Non** : un oubli ferait baisser le plafond sous la population |
| Lisible ? | Une ligne dans l'infobulle du plafond (`breakdown.c[species]`, motif `main.js:8796-8798`) | Un compteur de berceau | Oui mais punitif |
| Équilibre | Facile à borner (plafond relatif) | Effet faible et bref (la croissance normale remplit déjà) | Difficile, bloque le jeu de base |
| **Verdict** | **Retenue** | Ajout cosmétique possible (un bébé dessiné à chaque maturation) | Écartée |

L'« habitant dormant » de G2 est **écarté** : un travailleur qui ne travaille plus après un oubli, c'est une perte de production, donc une pénalité au sens de la règle 6.

### 3.2 Règles exactes (variante A)
- Entrée : `chênes` = nombre de cids du registre de maturation (seuil 21 j, B `firstMature`) **comptés** (file hebdomadaire de 100 max, §1.2). C'est le **même nombre** que les chênes de C (R7) : une maturation produit un chêne (C, % de production) **et** une place (D, plafond de population), dans deux enveloppes différentes. **Accordé avec C** : « un seul franchissement, deux lectures », compté comme une seule source quand on vérifie le pire cas. Repli si le rejeu montre un excès : la place naît au seuil 60 j (« vieux chêne ») au lieu de 21.
- Logement de base `H` = somme des places de `basic_housing`, `cottage`, `apartment` calculées par le jeu (`main.js:8794-8822`) [code].
- **Places de la mémoire** `P = min(⌊√chênes⌋, ⌈0,15 × H⌉)` (hyp.). C a critiqué mes 25 % de départ (le plus gros levier d'Evolve, saturé dès 90 jours) : j'ai accepté **15 %**, à relever seulement si le rejeu montre que l'effet net, après la nourriture consommée, est faible.
- Branchement : après le bloc `apartment` (`main.js:8812-8822`), `caps[species] += P` et `breakdown.c[species]['Naissances de la mémoire'] = P + 'v'`.
- Jamais de baisse : `chênes` est monotone ; si `H` baisse (démolition), `P` peut baisser avec le plafond relatif, comme le reste du logement : c'est la règle normale d'Evolve, pas une pénalité Anki.
- Une carte réinitialisée (« oublier ») ne re-naît pas : le registre garde le cid.
- Affichage : une ligne dans l'infobulle des citoyens ; à chaque nouvelle place, un petit message diégétique dans le journal (« une famille s'installe, venue de *Anatomie* ») — texte fourni à la Chronique de C ; dans la vue pixel, un bébé dans un berceau devant la maison la plus récente (cosmétique, kit).

### 3.3 Équilibrage
Hypothèses de volume (hyp.) : nouvelles cartes par jour 3 / 8 / 20 pour 20 / 60 / 150 cartes par jour (le plafond de 20 nouvelles de la règle 3 borne le dernier cas) ; ~80 % des nouvelles mûrissent, à partir du jour ~25.

| Profil | chênes à 90 j | √ | chênes à 1 an | √ | Avec H = 40 (Ère 1 moyenne) : P | Avec H = 100 (fin Ère 1) : P |
|---|---|---|---|---|---|---|
| 20 cartes/j | ~155 | 12 | ~820 | 28 | 6 | 15 |
| 60 cartes/j | ~415 | 20 | ~2 200 | 46 | 6 | 15 |
| 150 cartes/j | ~1 040 | 32 | ~5 400 | 73 | 6 | 15 |
| 10 jours de pause | inchangé | | | | inchangé | inchangé |

**Collection réelle** (B : 21-46 cartes/j, aucune carte mûre au 20 oct., cartes créées à partir du 9 oct.) [déduit] : une carte introduite le 9 oct. et toujours réussie (intervalles SM-2 ~1, 3, 8, 20 j) n'est revue avec `p ≥ 21` qu'après ~1 mois et demi ; les premières places de la mémoire apparaîtront donc vers **fin novembre - décembre 2026**, puis environ une place de plus par palier de √ (P = 5 à 25 maturations, 10 à 100…).

Lecture : le plafond relatif mord très vite ; la population dépend surtout de la **régularité sur des mois** (atteindre √chênes ≥ 15 % du logement), pas du volume du jour. À 20 cartes par jour on atteint le même plafond qu'à 150, avec quelques mois de retard. **Part de progression** : jusqu'à +15 % de citoyens, donc jusqu'à ~+15 % de main-d'œuvre, **compensé** par +15 % de consommation de nourriture (`main.js:3843-3866`) : l'effet net est nettement plus faible. Ère : dès la 1re `basic_housing` (après `sundial`) ; le registre compte depuis l'installation, même en Ère 0, donc les places accumulées apparaissent d'un coup en Ère 1 (rien ne se perd).

### 3.4 Tâches
| # | Tâche | Dépend de | Estim. | Critère de test |
|---|---|---|---|---|
| POP-1 | Lire `chênes` du registre (avec file hebdo) | B (registre), C (R7) | 0,5 soirée | rejeu d'un journal de 200 maturations en une semaine → 100 comptées, 100 en file, toutes comptées la semaine suivante |
| POP-2 | Branchement `caps` + `breakdown.c` | POP-1 | 0,5 soirée | `H=40`, chênes=400 → P=6 ; chênes=9 → P=3 ; jamais négatif |
| POP-3 | Message de chronique + bébé cosmétique | C (Chronique), kit | 1 soirée | une maturation = un message au plus par jour (regroupé) |

---

## 4. Paquets qui deviennent des métiers (*Guildes*)

**But.** Donner une identité à chaque matière (« mes anatomistes cultivent les champs ») et rendre visible l'équilibre entre paquets, sans payer davantage le volume.
**Dérives.** Mettre le paquet le plus facile sur le métier le plus rentable ; créer de petits paquets factices ; négliger les paquets non affectés.

### 4.1 Variantes
| | A. Multiplicateur par activité récente | B. Routage du crédit de base | C. Réserve propre à somme constante | **D. Les guildes orientent les chênes (retenue après la critique de C)** |
|---|---|---|---|---|
| Principe | Le métier gagne un % selon les cartes du paquet révisées sur 7 j | Le crédit direct d'une carte va à la ressource du métier de son paquet | Une réserve **nouvelle** (moyenne G) est répartie entre métiers selon les paquets confiés | **Aucune réserve nouvelle** : la moitié du bonus des chênes de C est répartie entre métiers selon les paquets confiés ; l'autre moitié reste partout |
| Volume récompensé ? | Oui | Non | Non | Non |
| Paie une 2e fois la maturation ? | — | — | **Oui** (même entrée et même forme log que les chênes : critique de C, juste) | Non |
| Effet de l'affectation | rente sur le paquet le plus révisé | brouille « jeunes → base, mûres → nobles » (R7) | où va le bonus, pas combien | où va **la moitié** des chênes, pas combien |
| Pause | perte | aucun effet | aucun effet | aucun effet |
| Enveloppe | D | — | D (≤ 5 points) | **C** (chênes ≤ 10) : 0 point de D |
| **Verdict** | Écartée | Écartée | Écartée (ma première version) | **Retenue** |

### 4.2 Règles exactes (variante D)
- Métiers éligibles (humain, Ère 1) — ceux dont la ressource passe par `ankiMult` : `farmer` → Food, `lumberjack` → Lumber, `quarry_worker` → Stone, `miner` → Copper/Iron, `coal_miner` → Coal, `cement_worker` → Cement. Pour l'humain standard, chaque ressource n'a qu'un métier producteur en Ère 1 (`rapports/audit/B-metiers-citoyens.md` §1 ; chasseur absent) : le bonus d'un métier = un bonus sur sa ressource. Professeur et banquier : plus tard, si B ajoute `ankiMult` aux sites Knowledge (`main.js:4175`) et Money (`main.js:7605`) [code, lignes repérées]. Les ressources sans métier éligible (Furs…) gardent le bonus de chênes plein.
- Métiers actifs `J` = éligibles avec `display` vrai et au moins un travailleur.
- `X` = bonus des chênes de C (`min(10 %, 2,5 % × log₂(1 + N/100))`, C §3).
- Poids d'un paquet `w_d = M_d` = maturations du paquet d (registre de B, paquet au moment de la maturation). Poids **linéaire** : avec `√M_d`, découper un paquet en deux ferait gagner du poids (√a + √b ≥ √(a+b)) ; en linéaire, découper ne change rien. Un paquet doit avoir ≥ 20 maturations pour être affectable.
- Part du métier j : `s_j = Σ_{d→j} w_d / W + (Σ_{d non affectés} w_d / W) / |J|`, avec `W = Σ_d w_d`.
- **Bonus de chênes du métier** `b_j = X/2 + min(X × 1,5 ; (X/2) × |J| × s_j)` : chaque métier garde au moins la moitié des chênes (aucun métier « dépouillé »), et au plus 2 × X. Sans affectation, `s_j = 1/|J|` donc `b_j = X` : exactement le comportement des chênes de C. La somme sur les métiers vaut `X × |J|` sauf quand le plafond de 2 × X mord (elle est alors plus petite : aucune création de bonus).
- Affectation : le joueur confie un paquet à un métier (ou le laisse « commun ») ; **un changement par paquet tous les 7 jours** (événement de journal, rejouable).
- Affichage : dans l'infobulle de la ressource, la ligne des chênes devient « Chênes (guilde d'*Anatomie*) : +7 % » ; dans la vue pixel, les citoyens du métier portent la couleur du paquet (calque de couleur secondaire du kit, `kit/citizens.js:46-64` selon l'audit B) et une bannière à la couleur du paquet flotte sur le bâtiment du métier.

### 4.3 Équilibrage
Exemple : 3 métiers actifs, `X = 6 %`. Paquet A (100 maturations) → fermiers, B (50) → bûcherons, C (50) commun : `s` = 0,583 / 0,333 / 0,083 → fermiers 3 + min(9 ; 5,25) = 8,25 %, bûcherons 3 + 3 = 6 %, carriers 3 + 0,75 = 3,75 % ; somme 18 % = 3 × 6 %.

| Profil | X à 90 j (chênes de C) | Écart max entre métiers | Pause 10 j |
|---|---|---|---|
| 20 cartes/j | ~3,4 % | de 1,7 à 6,8 % | inchangé |
| 60 cartes/j | ~5,9 % | de 3 à 11,8 % | inchangé |
| 150 cartes/j | ~8,4 % | de 4,2 à 16,8 % | inchangé |

Part de progression : **0 point d'enveloppe en plus** (tout est dans les chênes de C) ; c'est un choix d'orientation, pas un gain. **Collection réelle** : aucun paquet n'aura 20 maturations avant ~2-3 mois : la feature arrive en **D-3** (accord avec C). Débloquée quand `|J| ≥ 2` et un paquet affectable.

### 4.4 Tâches
| # | Tâche | Dépend de | Estim. | Critère de test |
|---|---|---|---|---|
| GUI-1 | Calcul `w_d`, `s_j`, `b_j` (fonction pure du journal) | B (registre par paquet), C-R3 (X) | 1 soirée | sans affectation : `b_j = X` pour tout j ; toute affectation : `Σ b_j ≤ X·|J|` et `b_j ≥ X/2` |
| GUI-2 | Événement « affecter » + délai de 7 j | B (journal des dépenses) | 1 soirée | deux affectations le même jour → la 2e refusée, avec raison affichée |
| GUI-3 | Remplacer la contribution des chênes par `b_j` dans `ankiMult` + ligne d'infobulle | B (`ankiMult`), C-R3 | 0,5 soirée | la ligne « Chênes (guilde de …) » apparaît |
| GUI-4 | Panneau d'affectation (tactile) + couleurs du kit | GUI-2, kit | 2 soirées | utilisable au pouce sur téléphone |

---

## 5. Le fleuve de la mémoire

**But.** Incarner la **qualité** de la mémoire (rétention des cartes mûres) dans le paysage, sans en faire un score à maximiser.
**Dérives.** Presser « Bien » sur une carte oubliée pour faire monter la rétention ; viser 100 % (trop de travail, docs Anki citées par G1) ; ne garder que des cartes faciles ; baisser la rétention visée.

### 5.1 La mesure sur le téléphone : approximation honnête
La rétention vraie d'Anki n'est pas exposée par le ContentProvider [G1 §1.4]. **Mais B lit en root une copie du revlog** [B] : `p` (`lastIvl`) et `b` sont exacts, donc la rétention des cartes mûres est **exacte** sur le téléphone tant que le root est disponible — même définition qu'Anki (« À revoir » = échec, première réponse du jour, révisions à intervalle ≥ 1 j). Sans root, quatre sources par ordre de préférence ; **chaque révision n'est comptée que si sa source est sûre ; sinon elle est écartée, jamais devinée** :
0. **Revlog en copie (root)** [B] : exact, c'est le cas réel aujourd'hui.
1. **J (customData `p`)** : l'intervalle avant la réponse et le bouton, écrits au moment de la réponse [G1 §1.1, à confirmer par le spike S2].
2. **Recherches Anki + photo du matin** : `M_k` = cartes `prop:ivl>=21 is:review` photographiées **avant la première réponse** du jour k (le réveil J vers l'appli compagnon le permet) ; `R_k` = `prop:rated=-k` ∩ `M_k` ; `F_k` = `prop:rated=-k:1` ∩ `M_k` [syntaxe : G1 §1.1 ; sens « jour exact » : vérifié par C dans `sqlwriter.rs`]. Si la photo a été prise **après** des réponses, le jour est marqué « incomplet » et seules les cartes de `M_k` non encore répondues à l'heure de la photo comptent (B doit dater la photo).
3. **PC (revlog)** après synchronisation : `lastIvl ≥ 21`, `ease`, première réponse du jour ; il **remplace** les jours déjà estimés (rejeu).
Biais connus et assumés : `rated:k:1` attrape aussi un « À revoir » donné **après** une réussite le même jour (rare pour une carte mûre hors paquet filtré ; les révisions de paquets filtrés sans replanification sont exclues par B, règle 1). Affichage : « estimé sur N révisions vues par le téléphone », remplacé par « mesuré » après passage du PC.

### 5.2 Variantes
| | A. Rétention brute → bonus croissant | B. Bande cible + rampe de confiance (retenue) | C. Écart à la rétention visée du paquet |
|---|---|---|---|
| 100 % récompensé ? | Oui (pousse au « Bien » automatique) | Non (plateau, puis légère baisse au-dessus de 95 % sur ≥ 50 révisions) | Non |
| Baisser la rétention visée | Sans effet | Sans effet (bande fixe, ou bornée si FSRS) | **Triche** : viser 70 % et l'atteindre paie |
| Petits échantillons | Bruit énorme | Bonus × min(1, n/60) | Bruit |
| **Verdict** | Écartée | **Retenue** | Écartée |

### 5.3 Règles exactes (variante B)
- Fenêtre : les **30 derniers jours comptés** (pas le calendrier) → une pause ne bouge pas le fleuve.
- `n` = Σ R_k, `f` = Σ F_k sur la fenêtre ; `r = 1 − f/n`.
- Niveau `L(r)` (hyp.) : 0 si r ≤ 0,70 ; linéaire de 0 à 1 entre **0,70 et 0,85** (rampe large, proposée par C : changer quelques « À revoir » en « Bien » juste sous la bande ne rapporte presque rien) ; **1 entre 0,85 et 0,95** ; au-dessus de 0,95 et seulement si n ≥ 50 : linéaire de 1 à 0,5 à r = 1,00 (jamais sous 0,5 : on ne punit pas la réussite, on cesse de la récompenser davantage).
- Bande : fixe **0,85-0,95** tant que FSRS est désactivé (cas réel, B). Si FSRS est activé un jour : bande centrée sur `clamp(rétention visée, 0,82, 0,93)` ± 5 points (proposition de C) : un réglage légitime à 0,80 n'est pas pénalisé, « viser 0,70 » ne paie pas.
- Confiance `c = min(1, n/60)`.
- **Bonus fleuve** = `8 % × L(r) × c`, enregistré par `ankiMult.set('fleuve', 'Food', …)`. C proposait un branchement ciblé sur la seule ligne des fermiers (`main.js:3597-3598`) ; pour l'humain en Ère 1 c'est équivalent, car les fermes sont la seule source de nourriture (chasseur absent, compost réservé aux `detritivore`, audit B §0 et §2d) : je prends le point unique de B, plus simple. Si d'autres races arrivent, on passera au site ciblé.
- Sous la bande, le fleuve reste à son **lit de base** : 0 %, jamais négatif, jamais « à sec ».
- Affichage : hauteur d'eau du fleuve dans la vue pixel (4 niveaux : lit, bas, plein, crue douce) ; **pas de pourcentage de réussite à l'écran principal** (accord avec C, P3) ; le chiffre exact seulement dans l'infobulle, avec la mention « estimé / mesuré ».

### 5.4 Équilibrage
| Profil | Révisions mûres / 30 j comptés (hyp.) | c | Bonus si r = 0,90 | Pause 10 j |
|---|---|---|---|---|
| 20 cartes/j | ~200 (après 3 mois) | 1 | +8 % | inchangé |
| 60 cartes/j | ~800 | 1 | +8 % | inchangé |
| 150 cartes/j | ~2 000 | 1 | +8 % | inchangé |
| Début (1er mois) | < 60 | < 1 | +0 à +8 % progressivement | — |

Le fleuve est **insensible au volume** une fois `n ≥ 60`. **Collection réelle** : aucune révision mûre avant ~mi-novembre ; `n ≥ 60` (confiance pleine) vers décembre-janvier à l'activité mesurée par B. Part de progression : ≤ +8 % sur la nourriture (la ressource la plus abondante d'Evolve en Ère 1, donc effet modeste). Débloqué à la 1re ferme (`agriculture`, `actions.js:1750-1759` selon l'audit B).

### 5.5 Tâches
| # | Tâche | Dépend de | Estim. | Critère de test |
|---|---|---|---|---|
| FLV-1 | Lecture de `p ≥ 21` et `b` dans le grand livre de B (revlog) ; repli sans root (photo du matin, `R_k`, `F_k`) seulement si le root manque | B (revlog en copie) | 0,5 soirée (+1 pour le repli) | jeu de test : 100 mûres, 10 oubliées → r = 0,90 ; repli : photo prise après 5 réponses → jour marqué incomplet |
| FLV-2 | Remplacement par le revlog du PC au rejeu | B (rejeu) | 1 soirée | même journée vue par les deux sources → le PC l'emporte, pas de double compte |
| FLV-3 | `L(r)`, `c`, contribution `ankiMult` + breakdown | B (`ankiMult`) | 0,5 soirée | r = 0,99, n = 80 → bonus 8 % × 0,6 ; r = 0,78 → 8 % × 0,53 ; n = 30 → bonus × 0,5 |
| FLV-4 | Sprite du fleuve à 4 niveaux | kit | 1 soirée | lisible sur téléphone |

### 5.6 *Arc-en-ciel* (le climat transformé, réduit au cosmétique)
Ma première version (« ciel clément » : retirer une fois chaque tirage de pluie pendant les semaines dans la bande) touchait le tirage météo d'Evolve (`main.js:11825`) et donc le moral et les fermes, **hors enveloppe**. C l'a refusé par principe (« sinon chaque feature trouvera son petit effet hors enveloppe ») : il a raison, et la mettre dans l'enveloppe Food ne ferait qu'un second fleuve. **Retenu** : quand les 7 derniers jours comptés sont dans la bande (`n₇ ≥ 20`, `r₇` dans la bande du fleuve), un **arc-en-ciel** apparaît après chaque pluie dans la vue pixel. Le tirage d'Evolve n'est pas touché ; la météo dessinée reste celle du jeu (le kit lit `calendar.weather`). Aucun effet économique.
Tâche ARC-1 : 0,5 soirée (kit) ; test : aucun champ de `global.city.calendar` modifié par la feature.

---

## 6. Monuments (tresse des semaines) et Merveille (cartes de plus d'un an)

**But.** Récompenser la **régularité sur des mois** et la mémoire **très longue**, par des jalons permanents.
**Dérives.** Série angoissante (G1 §3, « streak creep ») si la tresse repart à zéro ; une carte par jour pour « compter » ; rien de notable pour la Merveille (le calendrier est incompressible).

### 6.1 Variantes (tresse)
| | A. Tresse consécutive (G2 S3) | B. Semaines cumulées (retenue) | C. Jours cumulés |
|---|---|---|---|
| Rupture | Repart à 0 pour le palier suivant : angoisse de série | Aucune | Aucune |
| Récompense la régularité ? | Oui, fortement | Oui (une semaine ne compte qu'avec ≥ 4 jours comptés) | Faiblement (on peut tasser) |
| **Verdict** | Écartée (aversion à la perte) | **Retenue** | Écartée |

La tresse consécutive reste **dessinée** (brins colorés pour les semaines comptées, brins neutres sinon) : elle se lit, mais ne coûte rien quand elle se casse.

### 6.2 Règles exactes
- **Semaine tressée** : semaine (lundi-dimanche en jours Anki) avec ≥ 4 `jours comptés` (définition commune avec la flamme de C, calculée par B ; C propose que les jours partiels chauffent la flamme au prorata, la tresse ne retient que les jours pleins). Compteur `W` cumulé, jamais remis à zéro. Calculable **rétroactivement** par le rejeu depuis le premier jour du revlog (9 oct.) : les semaines déjà faites comptent quand la feature arrive (rien ne se perd).
- **Monuments** aux paliers W = 4, 8, 13, 26, 39, 52, 104 (hyp.) → 7 monuments.
- **Briques de la Merveille** : registre B `firstMature` au seuil 365 (premier crédit d'un cid avec `p ≥ 365`, quel que soit le bouton). Étages aux paliers 10, 30, 75, 150, 300, 600 briques (hyp.), **au plus un étage par semaine**.
- Effet [code] : chaque monument ajoute **+1** à `global.city.morale.anki` **et +1** au plafond (`moraleCap`, à côté de `global.tech.monuments`, `main.js:3200-3211`, où le jeu fait déjà +2 de plafond par monument ARPA) ; chaque étage de Merveille ajoute +0,5 et +0,5. Total ≤ **+10 et +10** (part D de l'enveloppe moral Anki de 12 ; C garde +2 temporaires pour la fête de reprise).
- Pourquoi plafond **et** moral : ajouter seulement au plafond ne sert à rien si le moral n'y est pas (`main.js:3266-3275`) [code] ; ajouter seulement au moral serait coupé par le plafond.
- Effet sur la production [code, `main.js:3277-3291`] : sous 100 de moral, +1 point = +1 % global ; au-dessus, +0,5 %. Donc les 10 points valent **+5 à +10 %** de production globale, sur deux ans.
- La clé `morale.anki` s'affiche **toute seule** dans l'infobulle du moral (boucle `main.js:347-360` qui parcourt les clés) ; il faut une chaîne `morale_anki` dans `strings/strings.json` (« Monuments de la mémoire »).
- **Pas** la tech `monument` d'Evolve : elle est ARPA, ère `globalized` (`tech.js:4001`, `arpa.js:149-171`) [code] ; je n'y touche pas pour ne pas casser la progression d'origine.
- Affichage : chaque monument est un bâtiment de la vue pixel (menhir, cairn, statue, obélisque…, palette du kit) sur la place ; la Merveille grandit d'un étage visible ; la tresse est une bande tissée dans le panneau « Ce que mes cartes donnent ».

### 6.3 Équilibrage
| Profil | Monuments à 3 mois | à 1 an | Merveille (collection neuve) | Merveille (collection de plusieurs années) | Pause 10 j |
|---|---|---|---|---|---|
| 20 cartes/j, 5 j/sem. | 3 (W = 13) | 6 (W = 52) | 0 avant ~18 mois (cas réel : aucune carte ne peut avoir 365 j d'intervalle avant 2028) | plusieurs étages en quelques mois | 1 à 2 semaines non tressées ; rien de perdu |
| 60 cartes/j | 3 | 6 | idem | idem | idem |
| 150 cartes/j | 3 | 6 | idem | idem | idem |

Totalement **insensible au volume** (≥ 10 cartes ou toutes les dues du matin suffisent). Le 7e monument (104 semaines) est un horizon de deux ans. **Collection réelle** : B a mesuré une activité quotidienne du 11 au 15 oct. puis rien depuis le 16 ; la semaine du 12 oct. est déjà tressée si elle a ≥ 4 jours comptés ; le 1er monument tombera 4 semaines tressées après. Débloqué au cadran solaire (`sundial`) ; les semaines comptent depuis l'installation, même en Ère 0.

### 6.4 Tâches
| # | Tâche | Dépend de | Estim. | Critère de test |
|---|---|---|---|---|
| MON-1 | Compteur `W` + paliers | B (`jour compté`), C (même définition) | 0,5 soirée | semaine à 3 jours : non comptée ; puis 4 : comptée ; jamais de baisse |
| MON-2 | Registre `seuil365` + étages (1/semaine) | B (registre) | 0,5 soirée | 50 briques la même semaine → un seul étage, le suivant la semaine d'après |
| MON-3 | `morale.anki` + `moraleCap` + chaîne | — | 0,5 soirée | infobulle du moral affiche la ligne ; total D ≤ 10 |
| MON-4 | Sprites des 7 monuments + Merveille 6 étages | kit | 2-3 soirées | autocontrôle de l'atelier (palette) |

---

## 7. Bestiaire (*Ménagerie*)

**But.** Faire traiter les sangsues — le problème n° 1 d'Anki — au lieu de les fuir ; encourager la **reformulation** des cartes mal faites.
**Dérives.** Fabriquer des sangsues pour les apprivoiser ; monstres culpabilisants ; suspendre les sangsues pour s'en débarrasser.

### 7.1 Variantes
| | A. Monstres qui attaquent (raids) | B. Bêtes inoffensives à apprivoiser (retenue) | C. Bêtes qui consomment des ressources |
|---|---|---|---|
| Pénalité | Oui | Non | Oui |
| **Verdict** | Écartée | **Retenue** | Écartée |

### 7.2 Règles exactes
- **Bête sauvage** : carte avec `lapses ≥ 4` ou étiquette `leech`, qui n'a pas encore été apprivoisée. Elle rôde à la lisière, curieuse, jamais menaçante (aucun lien avec `raid`).
- **Apprivoisement** : premier crédit avec `p ≥ 21` sur une bête **après sa dernière rechute**, quel que soit le bouton (même logique que le registre de B : pour qu'une carte retombée revienne à un intervalle de 21 j, il a fallu plusieurs réussites espacées ; exiger en plus la réussite du jour ferait de cette révision unique celle où mentir paie). Une fois par carte pour toujours.
- **Récompense** : (a) permanente : +0,25 % dans `ankiMult` de toutes les ressources concernées, **≤ +3 %** (12 bêtes) ; au-delà, les bêtes rejoignent la ménagerie (cosmétique) ; (b) don ponctuel : l'équivalent de 2 crédits nobles, imputé au **budget commun des dons** (≤ une journée de crédit par 7 jours, accord C P1) ; (c) la première bête apprivoisée déclenche l'animal de compagnie d'Evolve s'il n'existe pas (`events.js:986-1009`, crée `global.race.pet`, purement décoratif : aucun effet économique trouvé hors `functions.js:2420-2497`) [code].
- **Dressage** : si la note d'une bête a été modifiée (`edited:N` [G1 §1.1]) pendant qu'elle est sauvage, la bête « se laisse approcher » (changement de sprite, une fois par carte). Aucune ressource : on récompense le geste par l'image, pas par la valeur, pour ne pas payer des retouches vides.
- **Rechute** d'une bête apprivoisée : elle redevient sauvage à l'image, mais **le bonus acquis reste** (rien ne se perd) et ne peut pas être regagné sur la même carte.
- **Suspendue** : la bête dort dans un enclos, ni comptée, ni perdue.
- Affichage : bêtes dans la vue pixel (lisière : sauvages ; enclos : apprivoisées, endormies) ; fiche d'une bête au toucher long : paquet et début de la question (même extraction que les stèles).

### 7.3 Équilibrage
Triche : rendre une carte sangsue demande 4 oublis sur des révisions espacées (plusieurs semaines), puis ≥ 21 j de re-maturation : **un mois et demi au moins pour +0,25 %**, plafonné à 3 %. Volume : sans effet (dépend du nombre de sangsues de la collection). Pause : sans effet. Part de progression : ≤ +3 %. Débloquée au cadran solaire (bêtes visibles) ; le don noble attend qu'une ressource noble soit affichée (`ankiCredit` renvoie 0 sinon, `main.js:12988-12993` [code]) — le don est alors **mis en attente**, pas perdu.

### 7.4 Tâches
| # | Tâche | Dépend de | Estim. | Critère de test |
|---|---|---|---|---|
| BET-1 | Machine d'états par carte (sauvage, approchée, apprivoisée, endormie) | B (journal, `lapses`, `tag:leech`, `edited:`) | 1 soirée | rejeu : 4 oublis puis réussite à 25 j → apprivoisée une fois ; rechute → bonus conservé |
| BET-2 | Bonus `ankiMult` + don (budget commun) | B, C (budget des dons) | 0,5 soirée | 13e bête → bonus reste 3 % |
| BET-3 | Sprites de bêtes (3-4 espèces, 3 poses) + enclos | kit | 2 soirées | autocontrôle de l'atelier |

---

## 8. Stèles

**But.** Retour informatif positif : voir, en mots, ce qu'on sait depuis longtemps.
**Dérive.** Aucune notable (il faut avoir retenu une carte au moins 180 jours).

Variantes : (A) stèle à stabilité FSRS ≥ 180 j : dépend de FSRS (désactivé chez l'utilisateur, B) et du bouton (Easy gonfle S) ; (B) **stèle au premier crédit avec intervalle avant ≥ 180 j** (retenue : il faut avoir réellement tenu ; c'est le seuil 180 du registre de B, quel que soit le bouton) ; (C) une stèle par paquet seulement (moins de plaisir).

Règles : registre B `firstMature` au seuil 180 ; premières stèles de la collection réelle vers le 7e-9e mois [déduit] ; texte = début de la question (60 caractères, HTML retiré, trous de texte à trous affichés « […] »), nom du paquet, date ; le joueur peut masquer une stèle. Une **allée des stèles** dans la vue pixel (nombre de sprites `min(30, ⌈4 × log₂(1 + n)⌉)`) et un registre lisible (panneau paginé). **Aucun effet économique.** Le Courrier de C peut citer « 3 nouvelles stèles cette semaine ». Tout reste local (texte de cartes = donnée personnelle).

Équilibrage : sans effet économique ; comportement identique à 20, 60, 150 cartes/j (dépend de l'âge de la collection) ; pause : rien. Tâches : STE-1 extraction du texte (B : colonne de texte rendu, **à confirmer**) 1 soirée, test : carte à trous et carte avec image → texte propre ; STE-2 panneau registre 1 soirée ; STE-3 sprite de stèle + allée 1 soirée.

---

## 9. Comptoirs (ambassades transformées)

**But.** Inciter à faire **toutes** les dues d'un paquet choisi (contre l'accumulation de retard).
**Dérives.** Petits paquets ; limite de révisions abaissée ; un voisin qui attaque parce qu'on a négligé son paquet (pénalité).

Variantes : (A) G2 : réviser baisse l'hostilité, sinon « rien » — mais l'hostilité de départ de `gov0` est 100 (`vars.js:1718-1760`) [code], donc ne pas réviser laisse les raids possibles ; (B) **routes de commerce + baisse d'hostilité bornée, toutes deux permanentes et cumulées** (retenue) ; (C) routes seulement (moins de récit).

Règles (variante B) :
- Le joueur jumelle jusqu'à 3 paquets aux voisins `gov0..gov2` ; changer de paquet est libre, mais le compteur appartient au **voisin** (rien ne se perd en changeant).
- **Jour honoré** pour un comptoir : dues du matin du paquet (`deck:"X" is:due`, non plafonné par la limite du paquet) ≥ 3 et crédits du paquet ce jour ≥ 80 % de ces dues. **Semaine honorée** : ≥ 4 jours honorés. Compteur `H_k` cumulé.
- Paliers : `H_k ≥ 4` → **+1 route de commerce** permanente (ajoutée à `global.city.market.mtrade` dans le bloc `main.js:9861-9900`, seulement si un comptoir de commerce `global.city.trade` existe) [code] ; `H_k ≥ 8` puis `≥ 16` → hostilité −15 chaque fois, **plancher 55** (sous le seuil de raid 60, `events.js:143` [code], au-dessus du seuil d'annexion 50, `civics.js:871` [code]) ; `H_k ≥ 30` → ambassade dessinée (cosmétique).
- Jamais de hausse d'hostilité ; jamais d'événement négatif.
- Ce que ça change dans le jeu : moins de raids d'un voisin hostile, mais pas d'annexion « gratuite » (il faut toujours les espions).

Équilibrage : insensible au volume (fraction des dues) ; pause : des semaines non honorées, rien de perdu ; +3 routes au plus. Débloqué à la tech `trade` (`tech.js:3469-3478` selon l'audit B). Tâches : CPT-1 dues du matin par paquet (B) 1 soirée ; CPT-2 compteurs et paliers 1 soirée, test : paquet avec limite de 10 révisions mais 40 dues → 10 crédits ne suffisent pas ; CPT-3 branchement `mtrade`/`hstl` + texte 0,5 soirée ; CPT-4 panneau de jumelage 1 soirée.

---

## 10. Brume (brouillard transformé, cosmétique)

Règle : **FSRS étant désactivé chez l'utilisateur (B), la mesure par défaut est le retard** : `f` = (`is:review prop:due<-7`) / (`is:review`) — cartes en révision en retard de plus de 7 j ; suspendues **incluses** (une carte suspendue continue de vieillir : sa brume reste « figée » ; la recherche doit donc porter sur `is:review` sans exclure `is:suspended`, **à vérifier** : une carte suspendue garde-t-elle son `due` ? [doute]). Si FSRS est activé un jour : `f` = (`-is:new prop:r<0.7`) / (`-is:new`). Calcul une fois par jour (photo du jour de B). Cinq bandes (< 5 %, 5-10, 10-20, 20-35, > 35 %) → densité d'une brume matinale au bord de la carte. Quand la brume recule d'une bande, un élément de décor se révèle (fleurs, vieilles pierres ; graine fixe). Le joueur peut exclure un paquet retiré. **Aucun effet économique**, aucun gisement caché.
**Épaississement freiné** (critique de C, acceptée : découvrir au retour un village plus embrumé, c'est l'image « regarde ce que tu as laissé faire ») : la brume gagne **au plus une bande par semaine**, et seulement sur la lisière extérieure, hors du cadrage par défaut de la vue ; elle **recule sans limite** dès qu'on révise. Pause de 10 jours : au plus une ou deux bandes de plus, au loin ; la reprise les dissipe en une ou deux séances : c'est le pendant visuel de la fête de reprise de C. Tâches : BRU-1 compte quotidien (B) 0,5 soirée ; BRU-2 rendu dans le kit 2 soirées, test : bande 4 → 2 révèle exactement deux éléments, déterministes au rejeu ; 30 jours sans révision → au plus +4 bandes, jamais plus d'une par semaine.

## 11. Rites (transformés, cosmétiques)

À trois paliers (cadran solaire, première ferme, gouvernement), le jeu **propose** un jour de rite : terminer les dues du jour (n'importe quel bouton). Réussi : une bannière ou un totem dans le village et une ligne de saga (Chronique de C). Pas réussi : rien, et l'offre reste ouverte. Jamais bloquant, aucune ressource. Tâche RIT-1 : 1 soirée avec la Chronique de C.

---

## 12. Vue d'ensemble de l'équilibrage

| | 20 cartes/j | 60 cartes/j | 150 cartes/j | Après 10 j de pause |
|---|---|---|---|---|
| Population | +15 % du logement après ~4-6 mois | après ~2-3 mois | après ~1,5 mois | inchangée |
| Guildes | orientent la moitié des chênes (X ≈ 3,4 % à 3 mois) | X ≈ 5,9 % | X ≈ 8,4 % | inchangées |
| Fleuve | 0-8 % selon r | idem | idem | inchangé (fenêtre en jours comptés) |
| Monuments | ~1 par 4-13 semaines | idem | idem | aucun perdu |
| Ménagerie | selon sangsues | idem | idem | inchangée |
| Comptoirs | selon fraction des dues | idem | idem | aucun palier perdu |
| Brume | — | — | — | au plus +1 bande par semaine, au loin (cosmétique) ; se dissipe en reprenant |

**Part totale de D** (hyp., à recalibrer) : pour un joueur régulier **trois mois après ses premières cartes mûres**, ~+8 % fleuve, ~+1 % ménagerie (les guildes ne créent rien : elles orientent les chênes de C), +3 de moral (~+2-3 %), +10 % de plafond de population → environ **+12 à +15 %** de production par rapport au socle seul ; au plafond (après un an et plus) : ≤ +11 % par ressource (plafond D 15), +5 à +10 % par le moral, ≤ +15 % de citoyens. **Pour la collection réelle**, D vaut ~0 pendant les 4 à 8 premières semaines (seule la tresse avance), ce qui laisse le socle et les features C porter le début, comme C le demande (P4). Le socle (horloge + crédit) reste la source principale, conformément à C (P1).

**Interactions C ↔ D.** Même registre de maturation (chênes de C, places de D) ; même `jour compté` (flamme de C, tresse de D) ; même enveloppe `ankiMult` ; même budget de dons ; textes de mes features fournis à la Chronique et au Courrier de C ; brume ↔ fête de reprise.

---

## 13. Récapitulatif des tâches et dépendances

| Lot | Tâches | Dépend de | Estimation | Ordre |
|---|---|---|---|---|
| Commun | `ankiMult` (B), `morale.anki` + `moraleCap`, lignes de breakdown, chaînes | B | 1 soirée | avant D-1 |
| D-1 | MON-1..4, STE-1..3, FLV-1..4 | B (grand livre, registre, revlog), C (`jour compté`) | ~10 soirées | après le test de 2 semaines de C |
| D-2 | POP-1..3, BET-1..3 | B (registre), C (chênes, budget des dons, Chronique) | ~6 soirées | après D-1 |
| D-3 | GUI-1..4, CPT-1..4, BRU-1..2, ARC-1, RIT-1 | B (registre par paquet, journal des dépenses, dues par paquet), C-R3 (chênes) | ~12 soirées | en dernier, optionnel |

Tests transverses : (1) **rejeu** — tout l'état D est une fonction pure du journal : rejouer deux fois donne le même état ; (2) **10 jours de pause** — aucun compteur D ne baisse ; (3) **bouton** — rejouer un historique en remplaçant tous les « Bien » par « Facile » ne change rien (les seuils sont des intervalles *avant* réponse et des issues réussi/oublié) ; (4) **volume** — tripler les nouvelles cartes d'un historique change la population de moins de 10 % au bout d'un an (plafond relatif).

---

## 14. Points d'honnêteté
- **Confirmé par B (v0)** : revlog en copie (root) avec `b` et `p` exacts, FSRS désactivé, aucune carte mûre, registre `firstMature` 21/180/365, `jour compté`, `ankiMult` (prévu). **Encore non confirmé** : texte de question (stèles), dues par paquet non plafonnées (`is:due`), `tag:leech`, `edited:N`, comportement des cartes suspendues dans `prop:due`.
- **Vérifié dans le code** : points de branchement cités `main.js` (caps 8794-8822, moral 347-360 / 3198-3291, fermes 3535-3604, routes 9861-9900, météo 11825, `ankiCredit` 12988), `prod.js:494-507`, `events.js:133-186` et `986-1009`, `civics.js:128-138`, `vars.js:1718-1760`.
- **Repris de l'audit B ou de G1 sans relecture** : déblocages des métiers et des techs (`actions.js`, `tech.js`), colonnes du ContentProvider, syntaxe des recherches.
- **Spéculatif** : tous les paramètres chiffrés (hyp.), le plaisir des bêtes et des stèles.
- **Accords et désaccords avec C** : voir §15 et `discussion-CD.md`.

---

## 15. Jugement croisé avec C (résumé ; détail dans `discussion-CD.md`)

### 15.1 Critiques de C sur mes features, et ce que j'en ai fait
| Critique de C | Ma réponse | Changement dans ce rendu |
|---|---|---|
| Guildes = deuxième prime de maturation (même entrée, même forme que les chênes) | **Acceptée** | §4 : les guildes orientent la moitié des chênes, 0 point d'enveloppe D ; passées en D-3 |
| « Réussi » revient dans la maturation et l'apprivoisement (révision unique où mentir paie) | **Acceptée** | §1.2, §7, §8 : registres de B, quel que soit le bouton |
| Fleuve : rampe trop raide ; bande liée à la rétention visée si FSRS ; ciel clément hors enveloppe ; photo du matin inutile avec le revlog | **Acceptée** | §5 : rampe 0,70-0,85, bande bornée si FSRS, arc-en-ciel cosmétique, FLV-1 réduit |
| Population : 25 % trop gros, sature dès 90 j | **Acceptée** (15 %, à relever au rejeu si l'effet net est faible) | §3 |
| Brume : ne doit pas s'épaissir sous les yeux de celui qui revient | **Acceptée** | §10 : +1 bande par semaine au plus, au loin |

### 15.2 Mes critiques des features de C
1. **Fête de reprise rentable à provoquer** : 3 jours d'absence couverts par 3 repos ne coûtent rien (les dues sont créditées au retour), et déclenchent la fête. Proposition : fête seulement si l'absence a coûté de la chaleur ; bonus de crédit plafonné à cette perte, ou supprimé.
2. **`α = 0,5` pénalise le débutant** (l'utilisateur réel n'a aucune carte mûre ; mines à 50 % pendant la montée en charge ; frein à l'introduction de nouvelles cartes). Proposition : `α` dépendant de la phase (1 tant que < 100 cartes mûres, puis vers 0,5 à 1 000), ou bonus `+β·s` au lieu d'un malus.
3. **La flamme est la seule chose qui change pendant une pause, et c'est une perte.** Proposition : perte plafonnée par absence (−20 de chaleur au plus).
4. **Ère 0** : la flamme sur organelles/nucleus ne doit s'appliquer qu'aux ticks issus de cartes.
5. (mineur) Crédit direct `1 % × max(res)` : vérifier au rejeu que construire des entrepôts ne devient pas la meilleure stratégie.

### 15.3 Accords
Enveloppe +40 % (C ≤ 20, D ≤ 15, prorata) ; moral Anki 12 (D ≤ 10 permanent, C ≤ 2 temporaire, ni `motivated` ni `inspired`) ; population à D (≤ 15 %) ; registre unique 21/180/365 sur `p`, quel que soit le bouton, file de 100 par semaine ; noble = `p ≥ 21` quel que soit le bouton (**à faire valider par Mathéo** : change la règle 4 du rapport 7) ; cendres écartées comme ressource, image versée à la Chronique (*terreau*) ; `jour compté` = `crédits ≥ max(1, min(10, dues du matin))` ; textes de D via la Chronique et le Courrier ; ordre B → C → test de 2 semaines → D-1 → D-2 → D-3, rien de D en Ère 0.

### 15.4 Réponse de C à mes critiques (clôture)
C a accepté les cinq points : la fête n'a lieu que si l'absence a réellement coûté de la chaleur, et ne crédite plus aucune ressource (moral +2 et chronique seulement) ; `α(N)` vaut 1 tant que le registre a < 100 maturations, puis descend à 0,5 à 1 000, sans jamais remonter, et les ticks des nouvelles cartes sont neutres ; la perte de flamme est plafonnée à −20 de chaleur par absence ; en Ère 0 la flamme ne joue que sur les ticks issus de cartes ; le crédit `1 % × max(res)` sera borné si le rejeu le montre dominant. C accepte aussi la formule des guildes : pire cas théorique sur Food = 30 (C) + 11 (D) = 41, prorata d'un point, à vérifier au rejeu. **Aucun désaccord ouvert entre C et D.** Une décision reste à Mathéo : le noble quel que soit le bouton (modifie la règle 4 du rapport 7).
