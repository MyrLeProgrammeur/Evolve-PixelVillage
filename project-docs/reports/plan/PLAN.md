# PLAN — Jouer à Evolve avec Anki

Date : 2026-10-20. Rassemble `B-rapport.md`, `B-interface.md`, `C-conception.md`, `D-conception.md`, `discussion-CD.md`, et les audits F, G1, G2, H.
Légende : **[fait]** construit et testé · **[testé-réel]** confirmé sur les données du téléphone · **[hyp]** chiffre de départ à recalibrer · **[à décider]** revient à Mathéo.

---

## Cible produit (décision de Mathéo, 2026-10-20)

**Le jeu sera grand public, sous forme d'add-on Anki bureau.** Rien ne doit dépendre du root ni du téléphone de Mathéo.
- **Source de données du produit** : le revlog lu par l'add-on dans Anki bureau (`mw.col`). Il donne le bouton exact, l'intervalle avant et la durée, sans permission.
- **Révisions faites ailleurs** (AnkiDroid, AnkiMobile, AnkiWeb) : elles arrivent dans le revlog du PC à la synchro AnkiWeb et sont créditées à ce moment-là.
- **Le root reste un outil de développement** (`anki/sensor.js`), pour tester sur de vraies données depuis le téléphone. Il ne fait pas partie du produit.
- **Ce qui se réutilise tel quel** : format d'événements v1 (indépendant de la source), `ledger.js`, horloge, crochets Evolve, budget, `anki-bridge.js`.
- **Téléphone pour le grand public** : plus tard, via une APK compagnon et l'API officielle d'AnkiDroid (permission demandée, sans root, Android seulement). Il n'existe pas d'équivalent connu sur iPhone.

---

## 0. Où on en est

- **Socle B construit [fait]** sur la branche locale `socle-anki` de `evolve-pixel-village/` (6 commits, **rien de poussé**). 23 tests sur 23 passent :
  `NODE_PATH=~/outils/esbuild/node_modules node --test anki/*.test.js`.
- **Ce qui est lisible sur le téléphone [testé-réel]** : la collection AnkiDroid se lit en root, en copie et en lecture seule. On obtient le revlog complet : bouton exact, intervalle avant la réponse, type, durée. Le ContentProvider (`prop:rated=-k`) retrouve les mêmes couples (carte, jour).
- **État réel de la collection** :
  - FSRS est désactivé.
  - La collection a été créée le 9 oct. et n'a **aucune carte mûre**.
  - 107 cartes sont en révision et 3 073 sont nouvelles.
  - Rythme mesuré : 21 à 46 cartes par jour, rien depuis le 16 oct.
  - Conséquence : tout ce qui dépend des cartes mûres (matériaux nobles, chênes, fleuve, population) reste muet **3 à 5 semaines**.
- **Conception C et D terminées**, avec un jugement croisé (5 critiques de chaque côté, toutes acceptées). **Aucun désaccord restant.**
- **Jamais vu à l'écran** : le pont, le badge, l'horloge, les infobulles. Le moteur a été testé dans Node, pas dans Brave.

## 1. Décisions qui te reviennent (avec mon avis)

| # | Décision | Défaut actuel | Mon avis |
|---|---|---|---|
| D1 | **Matériau noble quel que soit le bouton** (seul l'intervalle avant ≥ 21 j compte) au lieu de « seulement si réussie » | **TRANCHÉ 2026-10-20 par Mathéo : oui** (« le but est d'apprendre, pas de mentir ») | **Oui.** Avec l'ancienne règle, « À revoir » sur une carte mûre coûte du noble, ce qui pousse à mentir. La réussite reste récompensée en différé : une carte oubliée perd son intervalle et redevient « jeune ». |
| D2 | ~~Lecture en root comme voie principale~~ | **tranché par Mathéo** | Le produit lit le revlog dans l'add-on bureau. Le root sert seulement au développement sur le téléphone. |
| D3 | **Coller l'extrait `customData`** dans AnkiDroid | non collé | Pas utile à l'add-on bureau, qui a le revlog. À garder pour l'APK compagnon future et le bandeau dans la carte (R7). |
| D4 | **Mode de l'horloge** — **TRANCHÉ (GD, appliqué le 2026-10-20, commit `c2c0f1d1`)** : `cards` posé par l'add-on, passif 0, clic converti en message, aucun réglage pour le joueur | `original` ; passif 0 ; clic coupé en mode cartes | **`cards`, passif 0, clic coupé**, une fois l'essai Brave validé. C'est tout le principe. |
| D5 | **Début des crédits** (`epoch`) | jour de la première connexion, sans rétroactif | Défaut, ou reverser les 7 derniers jours pour démarrer avec un peu de matière. |
| D6 | **Filtre des réponses trop rapides** | désactivé | **Désactivé.** À 1 500 ms, il écarterait des réponses légitimes (vocabulaire LSF). |
| D7 | **Rendement décroissant** — **APPLIQUÉ** : pleine valeur jusqu'à 60, puis décroissance raide (`soft` 10) | code à 50, conception C à 60 | **60**, pour aligner le code sur la conception C. Ton rythme réel reste entièrement en pleine valeur. |
| D8 | Lancer le capteur avec le jeu (`jouer.sh --anki`, `su` à chaque lancement) | non | Oui, après l'essai Brave. |
| D9 | **Pousser `socle-anki`** sur le dépôt public | non | Après la phase 1, une fois vue à l'écran. |
| D10 | **Durée visée pour l'ère 1** (Mathéo : ~60 cartes/j, mais le jeu doit convenir aux joueurs qui en font plus ou moins → confié avec D4 à l'agent game designer, `rapports/plan/GD-horloge-volume.md`) | pont réglé sur 40 cartes/j × 10 semaines | **6 à 10 semaines**, avec un palier visible chaque semaine. Ton nombre réel de cartes par jour fixera les taux (R5). |

## 2. Règles fixes (valent pour tout le plan)

1. Une récompense par (carte, jour Anki). Le jour bascule à 4 h, heure de Paris.
2. La base ne dépend jamais du bouton. Le bouton ne change que du texte (Chronique).
3. Le rendement décroît au-delà de 60 crédits par jour. Les nouvelles cartes sont payées au plus 20 par jour.
   **Aube** (décision de Mathéo : 75 au lieu de 90) : les 10 premiers crédits du jour valent chacun 7,5 de plus. 10 cartes = 85 crédits, 60 cartes = 135.
   **Journée accomplie** (demande de Mathéo) : toutes les dues du matin faites, sans carte suspendue depuis le matin, donne +15 crédits de base, une fois par jour. C'est constaté par l'add-on le jour même, à la fin d'une séance ou à une synchro.
4. Le noble est donné si l'intervalle avant la réponse est ≥ 21 j. Un seul **registre de maturation** sert pour tous (seuils 21, 180, 365 j, une fois par carte et pour toujours).
5. Rien ne se perd : aucun compteur ne baisse, il n'y a aucune punition, ni classement ni notification.
6. **Enveloppe de bonus** : bonus additifs par ressource, plafond **+40 %**, réduits au prorata quand le plafond est atteint. **C ≤ 20, D ≤ 15.** Moral Anki **≤ 12** (monuments 10, fête 2 temporaires).
7. Un **jour compté** compte au moins 1 carte, et au moins `min(10, dues du matin)` crédits. Une seule définition est partagée par la Flamme et les monuments.
8. Zéro dépendance externe, rien de Google, hors ligne.

## 3. Phases

Ordre : socle → horloge et budget → features C → test réel → features D, avec l'interface en parallèle.
Une « soirée » vaut 2 à 3 h de travail avec moi, essais à l'écran compris. Toutes les estimations sont **[hyp]**.

### Phase 0 — Finir et voir le socle (≈ 2 soirées)
| Tâche | Contenu | Dépend de | Estim. | Critère |
|---|---|---|---|---|
| B-R1 | Essai dans Brave sur le port **8766** (autre sauvegarde) : badge « Anki : n cartes », menu de l'horloge, infobulles `Anki : …`, moral Anki | toi au téléphone, ou moi en root comme le 16 oct. | 30 min | captures d'écran ; aucune ressource ne bouge pendant 10 min sans carte en mode `cards` |
| B-D7 | Mettre `diminishing.full` à 60 (décision D7) | D7 | 10 min | tests du grand livre réajustés |
| B-R3 | Ticks typés (mûres d'abord, nouvelles neutres, `α(N)` sur les nobles) | conception C-R2 | 1 soirée | tests C-R2 (§3 de C) |
| B-R4 | Capteur lancé par `jouer.sh --anki` + `termux-wake-lock` | D8 | 30 min | une séance de 30 min sans perte |
| D1–D6 | Tes décisions | toi | — | — |

### Phase A — Add-on Anki bureau (produit, ≈ 4–6 soirées, avant ou avec la phase 1)
| Tâche | Contenu | Dépend de | Estim. | Critère |
|---|---|---|---|---|
| A1 | Squelette d'add-on : `__init__.py`, `manifest.json`, menu « Village », fenêtre AnkiWebView qui sert le jeu depuis le dossier de l'add-on (`mw.addonManager.setWebExports`) | — | 1 | le jeu s'ouvre dans Anki, hors ligne, sans erreur console |
| A2 | Capteur Python : lecture du revlog avec `mw.col.db` → événements v1 identiques à ceux du capteur Node ; relecture après chaque révision (`reviewer_did_answer_card`) et après chaque synchro | A1 | 1 | même collection → mêmes événements que `sensor.js` (test croisé sur une copie) |
| A3 | Pont page ↔ Python (`pycmd` / `eval`), remplace `serve.js --anki` | A1, A2 | 1 | badge « Anki : n cartes » à jour après une révision |
| A4 | Sauvegarde de la partie : dans la config de la collection (à vérifier : synchro AnkiWeb, taille), sinon dans le dossier du profil | A1 | 1 | partie retrouvée après redémarrage ; comportement après synchro entre deux PC documenté |
| A5 | Compatibilité : versions d'Anki visées, Qt WebEngine, taille du paquet (~5 Mo de JS), licence MPL-2.0 et mentions | A1 | 1 | essai sur au moins deux versions d'Anki |
| A6 | Paquet `.ankiaddon` et page de présentation (publication seulement avec ton accord) | A1–A5 | ½ | installation propre sur un profil vierge |

**État au 2026-10-20 (commit `cd614a6a`, branche `socle-anki`)** : A1, A2, A3, A4 et A6 sont écrits.
- Le capteur Python est identique au capteur Node sur la collection réelle : 343 révisions, aucun champ différent, même photo du jour.
- 5 tests Python et 29 tests JS passent.
- La partie est enregistrée dans `<profil Anki>/anki-village/save.txt`, avec une copie `save.bak`. Le code d'Anki montre que le profil web des add-ons est éphémère.
- Seules les révisions depuis le début de la partie sont lues.
- Paquet : `dist/evolve_village.ankiaddon` (4,7 Mo), copié dans `~/storage/downloads/`.
- **Jamais exécuté dans Anki** : premier essai à faire par Mathéo sur son PC.

**Tests** : ils exigent Anki bureau, donc le PC. Ils peuvent passer par Bruno sur un **profil Anki jetable**, si tu le demandes. Sur le téléphone, je peux seulement tester la partie JS et le capteur Python sur une copie de collection, avec `sqlite3`, sans Anki.

### Phase 1 — Horloge à cartes et routage (≈ 3–4 soirées)
| Tâche | Contenu | Dépend de | Estim. | Critère |
|---|---|---|---|---|
| C-H1 | Compteur « Jour 143 · été » (« Génération 412 » en ère 0), crépuscule au-delà de 60, puis nuit vers 120 ; rattrapage en 3 s au plus | B5, Phase 0 | 1–2 | rejeu des 343 révisions réelles : jours de village = Σ E(n) ± 1 ; le crépuscule ne s'allume jamais avec tes vraies journées |
| C-R1 | Routage du crédit direct : jeunes → nourriture, bois, pierre ; mûres → cuivre, fer, ciment, dans la ressource la moins remplie ; réserve tant que la ressource n'est pas visible | B3, B4 | 1 | 5 jeunes + 3 mûres avant la mine → 5 crédits, 3 en réserve versés à l'apparition du cuivre ; déterministe |
| C-R2 | (= B-R3) | | | |
| Budget | Choisir la ligne de taux (`RATES`) selon D10 | B6 | 10 min | — |

**Repère** : 1 carte = 1 jour de village, une saison ≈ 91 cartes. À 40 cartes par jour, une séance = un mois et demi de village.

### Phase 2 — Features C légères (≈ 6–7 soirées)
Dans cet ordre : celles qui marchent **sans carte mûre** d'abord.
| Feature | Tâches | Estim. | Ce que tu verras |
|---|---|---|---|
| **Chronique des quatre voix** | C-C1 filtre et choix déterministe (½) ; C-C2 environ 100 lignes à relire (1) ; C-C3 repli sans revlog (½) | 2 | Un onglet « chronique » dans le journal, au ton qui varie selon le bouton, sans aucun chiffre. |
| **Flamme vive** | C-F1 fonction pure de chaleur (1) ; C-F2 repos et fête (½) ; C-F3 bonus `ankiMult` + ère 0 (½) ; C-F4 feu en 4 états (1) | 3 | Un feu au village, chaleur de 10 à 100, jamais éteint. Jusqu'à +10 % sur nourriture, bois, pierre, fourrures. 3 jours de repos en réserve. Une fête de reprise après une vraie perte. |
| **Courrier du soir** | C-L1 statistiques hebdo + événement `letter` (1) ; C-L2 textes et conseils (1) ; C-L3 enveloppe et archives (1) | 3 | Une lettre par semaine, archivée, avec au plus un conseil sur la forme des cartes, jamais « révise plus ». Aucun effet économique. |

Ta reprise après la pause depuis le 16 oct. sera le premier vrai test de la fête de reprise.

### Phase E — Interface, en parallèle des phases 1 et 2 (≈ 4–6 soirées)
| Tâche | Contenu | Estim. |
|---|---|---|
| E1b | Police pixel générée hors ligne depuis les glyphes du kit (titres, nombres) | 1 |
| E2 | Icônes de ressources, barres, onglets en images du kit | 1–2 |
| E-Anki | **Panneau Anki** dans le village : cartes du jour, feu, ciel (crépuscule), lettre en attente, bonus actifs (chiffres seulement dans l'infobulle) | 1–2 |
| E3 | Finitions sur les 10 thèmes d'Evolve | 1 |
| E-A (plus tard) | HUD pixel mince + panneaux tactiles : construire, assigner, rechercher (palier A de F) | après le test réel |

### Phase 3 — Test réel de deux semaines (≈ 1 soirée de travail + 14 jours de jeu)
- Tu joues en mode `cards`, normalement.
- **Mesures dans le revlog, avant et après** : jours d'étude, dues laissées, part de « Facile », nouvelles cartes par jour, rétention sur les jeunes cartes. Si la part de « Facile » ou de nouvelles cartes grimpe, une règle est mal réglée.
- **B-R5** : recalibrer `RATES` et `ticksPerCard` en rejouant le journal réel, pour viser la durée D10.
- **Décision go / no-go** : si le jeu ne change rien ou nuit à l'étude, on s'arrête ou on corrige avant D. C'est un résultat, pas un échec.

### Phase 4 — Chênes (≈ 2 soirées), à l'arrivée des premières cartes mûres (vers mi-novembre)
| Tâche | Contenu | Estim. |
|---|---|---|
| C-R3 | Chênes : +2,5 % × log2(1 + N/100), plafond 10 %, au plus 100 comptés par semaine | ½ |
| C-R4 | Bosquet, écriteau « les premiers chênes pousseront dans 3 semaines » tant que N = 0 | 1 |

### Phase 5 — Features D (≈ 29 soirées au total, chacune optionnelle)
**D-0 commun (1 soirée)** : lignes d'infobulle par feature et chaînes de texte. `ankiMult` et le moral Anki sont déjà posés par B.

**D-1 (≈ 10 soirées), juste après le test réel**
- **Monuments**
  - Des semaines « tressées » cumulées, jamais remises à zéro, donnent 7 monuments.
  - Les cartes revues avec un intervalle avant ≥ 365 j forment une Merveille en 6 étages.
  - Effet : moral et plafond de moral, au plus +10.
  - C'est la seule feature D vivante dès la première semaine.
- **Stèles** : une carte revue avec un intervalle avant ≥ 180 j grave une stèle avec le début de sa question. C'est purement cosmétique, et la première arrivera vers le 7e mois.
- **Fleuve de la mémoire**
  - Rétention des cartes mûres sur les 30 derniers jours comptés, exacte par le revlog.
  - Rampe de 0,70 à 0,85, plateau jusqu'à 0,95, puis baisse douce.
  - Multiplié par une confiance `min(1, n/60)`, au plus +8 % de nourriture.
  - Avec l'**arc-en-ciel**, cosmétique.

**D-2 (≈ 6 soirées)**
- **Population** : places en plus = `min(⌊√chênes⌋, ⌈15 % du logement⌉)`, jamais en baisse.
- **Ménagerie**
  - Chaque sangsue devient une bête sauvage, sans dégâts.
  - Elle est apprivoisée quand la carte est revue avec un intervalle avant ≥ 21 j après sa dernière rechute.
  - +0,25 % par bête, plafond 3 %.

**D-3 (≈ 12 soirées), en dernier et optionnel**
- **Guildes** : la moitié du bonus des chênes est orientée vers les métiers auxquels tu confies des paquets.
- **Comptoirs**
  - Trois paquets sont jumelés aux trois voisins d'Evolve.
  - Les semaines honorées (≥ 80 % des dues) donnent des routes de commerce, puis une hostilité abaissée jusqu'à 55.
  - L'hostilité ne monte jamais.
- **Brume** et **rites**, cosmétiques.

**Écartées, avec raison** : paris de confiance (triche triviale), banque du temps (Easy et le retard paient), cendres fertiles comme ressource (rendrait « À revoir » rentable).

**Tests transverses de D** :
- rejouer deux fois donne le même état ;
- 10 jours de pause ne font baisser aucun compteur ;
- remplacer tous les « Bien » par « Facile » ne change rien ;
- tripler les nouvelles cartes change la population de moins de 10 % sur un an.

### Phase 6 — Au-delà (non chiffré)
- **Jeu sur téléphone pour le grand public** : APK compagnon via l'API officielle d'AnkiDroid (permission, sans root), qui reprend le même JS et le même grand livre. La synchro de la partie avec le PC reste à concevoir.
- **Bandeau dans la carte** (B-R7, demande D3).
- **Feuille de route du dépôt** : autres espèces, ères suivantes, sprites par la méthode Claude Design. Il faudra recalculer le budget (B6) pour chaque nouvelle ère.

## 4. Vue d'ensemble

| Phase | Soirées [hyp] | Quand |
|---|---|---|
| 0 Socle visible | 2 | maintenant |
| A Add-on bureau | 4–6 | avec la phase 1 (tests sur le PC) |
| 1 Horloge + routage | 3–4 | semaine 1 |
| 2 Chronique, Flamme, Courrier | 6–7 | semaines 1–2 |
| E Interface | 4–6 | en parallèle |
| 3 Test réel | 1 + 14 jours de jeu | semaines 3–4 |
| 4 Chênes | 2 | à la 1re carte mûre (~mi-novembre) |
| 5 D-1 / D-2 / D-3 | 10 / 6 / 12 | à partir de la semaine 5, au choix |
| **Jusqu'à un jeu complet en C** | **≈ 18–23 soirées** | ≈ 4 semaines |

## 5. Bilan des contributions

| Source | Ce qu'elle apporte au jeu | Plafond |
|---|---|---|
| Horloge (ticks d'Evolve) | 80–90 % du flux, une fois les ouvriers au travail | E(n) |
| Crédit direct | 100 % au démarrage d'une ère, 5–15 % ensuite | E(n) |
| Flamme | nourriture, bois, pierre, fourrures | +10 % |
| Chênes (et guildes) | toutes les ressources qui passent par `psychic_boost` | +10 % |
| Fleuve | nourriture | +8 % |
| Ménagerie | idem chênes | +3 % |
| Monuments | moral | +10 |
| Fête | moral, temporaire | +2 |
| Population | plafond de citoyens | +15 % |
| Chronique, Courrier, stèles, brume, arc-en-ciel, rites | aucun effet économique | 0 |

Pire cas sur la nourriture : 41 %, soit 1 point retiré au prorata. À vérifier au rejeu.

## 6. Risques et points ouverts
1. **Rien n'a été vu dans le navigateur** : c'est la phase 0, à faire avant toute feature.
2. **Pas de métaux par les cartes avant 3 à 5 semaines** (aucune carte mûre). Au début, seules les mines et les fonderies les fournissent. Si l'ère 1 bloque sur le fer, il faudra une part noble minimale, à trancher au test réel.
3. **Knowledge et Money** ne passent pas par `psychic_boost` : aucun bonus Anki sur eux. Ils viennent seulement de l'horloge et du crédit direct. À surveiller, car ce sont les plus gros postes du budget (Knowledge 163 k, Money 530 k).
4. **Copie de la collection pendant une écriture d'AnkiDroid** : protégée par trois essais, mais au pire un crédit en trop, jamais deux pour la même carte.
5. **Latence carte → crédit** non mesurée : relecture toutes les 5 s, ou immédiate avec le ping (qui demande l'extrait de D3).
6. **Le vrai risque reste le temps** : le jeu ne doit pas manger les révisions. D'où le test mesuré de la phase 3.
7. **Branche publique** : `pixel-village` est publique. `socle-anki` attend D9.
