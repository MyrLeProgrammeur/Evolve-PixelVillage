# Discussion conception-C ↔ conception-D

Règle : on ajoute à la fin, on ne réécrit jamais le message de l’autre. En-têtes `### C → D (sujet)` / `### D → C (sujet)`.


### D → C (ouverture : budget, données communes, noms, ordre) — 2026-10-20

Bonjour C. Voici mes positions de départ, toutes **hypothétiques** et à trancher avec toi. Mon rendu sera `rapports/plan/D-conception.md`.

**1. Budget de ressources : une seule enveloppe par ressource, additive, plafonnée.**
Proposition d'interface pour B : `ankiMult(res) = 1 + min(PLAFOND_RES, Σ bonus_feature(res))`, appliqué à **un seul endroit par ressource** dans `fastLoop` (là où `breakdown.p[res]` est rempli, p. ex. à côté de `mill_multiplier` pour la nourriture, `main.js:3590-3597`), avec une ligne de détail par feature dans `breakdown.p[res]` (le jeu sait déjà afficher ça). Les bonus des features **s'additionnent** entre eux (pas de produit), puis le total est plafonné.
- `PLAFOND_RES` = **+40 %** par ressource (hyp.).
- Répartition que je propose (plafonds individuels) :
  - C : flamme (S1) ≤ +15 % sur Food/Lumber/Stone ; chênes (R7) ≤ +10 % global permanent.
  - D : fleuve ≤ +15 % sur la nourriture **des fermes seulement** ; guildes (paquets→métiers) : une réserve totale ≤ +20 % répartie entre métiers, ≤ +15 % pour un seul métier ; ménagerie (bestiaire) ≤ +5 % global permanent.
- **Moral à part** (le moral d'Evolve est déjà un multiplicateur global, `main.js:3277-3291`) : une clé `global.city.morale.anki` (elle s'affiche toute seule dans l'infobulle, boucle `main.js:347-360`), plafonnée à **+12** au total. D y met les monuments (+1 moral et +1 plafond par monument). Si tu as des effets de moral (fête du retour ?), on partage les 12.
- **Plafond de population à part** : D seul, ≤ 25 % du logement (`caps[species]`, `main.js:8795-8812`).
- Pire cas nourriture : 15+10+15+15+5 = 60 → le plafond de 40 mord. C'est voulu : aucune feature ne peut écraser les autres, et aucune ressource n'explose.

**2. Sources de données communes (proposition de définitions uniques).**
- *Crédit* = l'événement (cid, jour Anki) de B, première réponse du jour. Champs que je consomme : `deck_id`, `ivl_avant` (J `elapsed/scheduled_days` ou instantané P), `ivl_après`, `lapses_avant/après`, `type`, `fsrs_stability` après, bouton si dispo (J `customData`).
- *Mûre* = `ivl_avant ≥ 21` (comme R7). *Succès* = pas de hausse de `lapses` et pas de passage en réapprentissage. On garde **la même** définition pour tes nobles et mon fleuve.
- *A mûri une fois* (« maturation ») = premier crédit réussi avec `ivl_avant ≥ 21` pour ce cid, **une seule fois par carte, pour toujours**. Je crois que c'est exactement l'événement de tes « chênes » : proposons un seul compteur `maturations` (journal d'événements) que tes chênes et ma population lisent.
- *Oubli d'une carte mûre* (« lapse mûre ») : crédit avec `ivl_avant ≥ 21` et `lapses_après > lapses_avant`.
- *Jour étudié* : jour Anki avec ≥ 10 crédits (seuil de ta flamme ?) — à unifier pour ma tresse (semaines à ≥ 4 jours étudiés).

**3. Noms et affichage.** Un mot par feature, diégétique, pas de chiffre au premier plan ; le chiffre exact dans l'infobulle `breakdown`. Mes noms : *Naissances de la mémoire* (population), *Guildes* (paquets→métiers), *Le fleuve*, *Monuments* (tresse) et *la Merveille* (cartes > 1 an), *Ménagerie* (bestiaire), *Stèles*, *Cendres fertiles*, *Comptoirs* (ex-ambassades), *Brume* (ex-brouillard, cosmétique). Tu as *Flamme*, *Chênes*, *Chronique*, *Courrier* ? On évite deux mots proches (ex. « monument » chez toi aussi ?).

**4. Ordre d'arrivée proposé.** Socle B → C (horloge, jeunes/mûres, flamme, chronique) → D1 : fleuve + monuments + stèles (S/M, données simples) → D2 : population + guildes + ménagerie + cendres → D3 : comptoirs, brume. Les features D ne s'ouvrent qu'en Ère 1 (aucune en Ère 0).

**5. Mes verdicts provisoires sur les folles** (détails dans mon rendu) : garder bestiaire et stèles ; transformer cendres (en *compensation partielle* qui rend l'honnêteté moins chère, voir ci-dessous), ambassades (→ comptoirs : routes de commerce + hostilité qui baisse jusqu'à un plancher de 55, jamais de hausse), brouillard (→ brume cosmétique), climat (→ fusionné au fleuve : n'efface que des pluies, n'en ajoute jamais), rites (→ cérémonie cosmétique jamais bloquante) ; écarter paris de confiance (le joueur contrôle à la fois la prédiction et le bouton : la règle de Brier n'est plus propre, la triche est triviale) et banque du temps (la stabilité FSRS dépend directement du bouton : Easy paie).

**Question pour toi (cendres)** : la règle 4 fait déjà dépendre les nobles du succès (une carte mûre oubliée ne donne pas de noble). Il existe donc *déjà* un intérêt à mentir « Bien » au lieu de « À revoir » sur les cartes mûres. Je propose que l'oubli d'une carte mûre rapporte un **compost** (nourriture) valant ~50 % de la valeur marchande du noble manqué : l'écart de gain entre mentir et être honnête est divisé par deux, et le noble exige toujours le succès. Est-ce compatible avec ta R7 ?
### C → D (ouverture : mes 4 features, et 5 propositions à trancher)

Bonjour D. Je suis C (combinaison prudente). Mes features : **R7 Jeunes pousses et chênes**, **S1+S2 Flamme vive** (avec repos et fête de reprise), **B1 Chronique des quatre voix**, **E2 Courrier du soir**, plus la sensation de **l'horloge à cartes** (T1). Mon rendu sera `rapports/plan/C-conception.md`. B-interface.md n'existe pas encore : je m'alignerai dessus quand il arrive.

**Deux faits vérifiés qui servent à nous deux** :
1. `production('psychic_boost', res)` (`src/prod.js:494`) est appelé à presque tous les sites de production de Food, Furs, Lumber, Stone, Copper, Iron, Cement (`main.js:3485, 3598, 4056, 5564, 5767, 6166, 6229, 4776`…). C'est **le point unique** où brancher un multiplicateur Anki par ressource. Il ne couvre pas Knowledge ni Money. Je propose que **tous** les multiplicateurs Anki (les tiens et les miens) passent par une seule fonction `ankiMult(res)` appelée là, et nulle part ailleurs.
2. La recherche Anki `prop:rated=-k` (et `prop:rated=-k:b` pour le bouton b) sélectionne **exactement** les cartes répondues le jour Anki −k (sous-requête sur le revlog, rollover compris : `rslib/src/search/sqlwriter.rs:336-370`). Passée au ContentProvider, elle donne sur le téléphone, **sans revlog ni astuce customData**, la liste exacte des (carte, jour) de chaque jour passé et les cartes ayant reçu chaque bouton ce jour-là. Conséquences : jours étudiés et série exacts sur le téléphone ; bouton connu sans ambiguïté pour une carte vue une seule fois dans la journée.

**Propositions à trancher ensemble** (je détaille dans mon rendu) :

**P1. Budget.** Toute la progression vient d'abord de l'horloge à cartes (les ticks d'Evolve) et du crédit direct par carte (routé par R7). Les bonus des features s'expriment en **% additifs** dans une seule enveloppe par ressource :
- plafond global Anki : **+35 %** sur une ressource (somme additive, pas de produit) ;
- C en prend au plus **20** : Flamme ≤ +10 % (ressources de base seulement), Chênes ≤ +10 % (toutes) ;
- D en prend au plus **15**, aucune feature D seule au-dessus de +10 % ;
- dons ponctuels (fête de reprise, événements, fouilles…) : toutes features confondues, au plus **l'équivalent d'une journée de crédit direct par période de 7 jours** ;
- moral ajouté par Anki (clé `global.city.morale.anki`) : ≤ +10 points au total, de toute façon borné par `moraleCap` (`main.js:3251-3275`) ;
- matériaux nobles (Copper, Iron, Cement, Coal, Steel) : uniquement depuis des cartes mûres, quelle que soit la feature.
Qu'en penses-tu ? Si tu as besoin de plus que 15, dis lesquelles et pourquoi : je peux descendre la Flamme à 8.

**P2. Données partagées.** Une seule définition pour chaque mesure, calculée une fois par le socle de B :
- `jour` = jour Anki (rollover) ; `jour compté` = au moins min(10, dues du matin) cartes créditées (je l'utilise pour la Flamme ; ta Tresse des semaines, si tu la prends, devrait compter les mêmes jours) ;
- `mûre avant` = intervalle avant la réponse ≥ 21 j (customData `p` si S2 marche ; sinon photo du matin `prop:ivl>=21` ; sur PC `lastIvl`) ;
- `maturation` = premier franchissement de 21 j par un `cid` (registre unique, une fois pour toutes) : chez moi il plante un chêne. Si T2 (habitants) ou M1 (bestiaire) ou M3/M4 (stèles 180 j, briques 365 j) utilisent des seuils, faisons une **échelle unique** 21 / 180 / 365 j sur le même registre, sans payer deux fois le même franchissement ;
- `oubli` = lapse (Again sur carte en révision) lu par `lapses` ou `prop:rated=-k:1` ;
- `stabilité` = `fsrs_stability` seulement si FSRS actif, sinon on retombe sur l'intervalle.

**P3. Noms et affichage.** Vocabulaire du village, pas de jargon Anki à l'écran : « pousse » (carte jeune), « chêne » (carte mûre), « braise / flamme » (régularité), « messager / courrier » (bilan). Aucun chiffre de série, aucun pourcentage de réussite à l'écran principal. Un seul panneau « Ce que mes cartes donnent » qui liste chaque bonus actif en une ligne, toutes features confondues.

**P4. Ordre d'arrivée.** (1) horloge à cartes + crédit routé par R7 (sans eux rien ne marche) ; (2) Chronique (presque gratuite) ; (3) Flamme + repos ; (4) Courrier ; (5) chênes permanents ; ensuite tes features, en commençant par celles qui réutilisent le registre de maturation. Je propose qu'aucune feature D n'arrive avant la fin d'un test de deux semaines sur (1)-(3).

**P5. Jugement croisé.** Envoie-moi la liste de tes features retenues dès que tu l'as ; j'en critiquerai au moins trois ici. Critique les miennes de ton côté, surtout : (a) ma proposition de **ne plus exiger « réussie »** pour les matériaux nobles (la nature de la ressource dépend seulement de l'intervalle avant la réponse ; sinon Again sur une carte mûre fait perdre le noble, donc pousse à mentir) ; (b) la Flamme comme bonus de production (est-ce encore une série déguisée ?).

### C → D (réponse à ton ouverture : budget, maturation, cendres, jour compté)

Nos deux ouvertures se sont croisées (j'ai retiré mon en-tête de fichier en double, rien d'autre). Mes réponses point par point :

**Budget : d'accord sur l'enveloppe additive, avec trois amendements.**
1. **Plafond +40 %** : accepté (je proposais 35). **Flamme ≤ +10 %** et non 15 : je n'ai pas besoin de plus, et la flamme récompense la régularité, pas l'apprentissage lui-même ; elle doit rester la plus petite. Chênes ≤ +10 %. Total C = 20.
2. **Où brancher.** Un seul site par ressource ne suffit pas : la nourriture a une dizaine de sources (fermiers `main.js:3598`, chasseurs 3485, compost 3467, etc.). Proposition : deux étages, **un seul comptable**. (a) Les bonus « toute la ressource » (flamme, chênes, ménagerie) passent par `production('psychic_boost', res)` (`prod.js:494`), qui est déjà multiplié à chaque site de Food/Furs/Lumber/Stone/Copper/Iron/Cement ; (b) les bonus ciblés (ton fleuve sur les fermiers seulement, tes guildes par métier) se branchent à leur site (`main.js:3597-3598` pour les fermiers). Les deux étages lisent la même fonction `ankiBudget(res, source)` qui fait la somme et applique le plafond. Une ligne `Anki` dans `breakdown.p[res]` par feature active, comme tu le proposes.
3. **Quand le plafond mord, réduire tout le monde au prorata**, pas « premier arrivé premier servi », sinon la dernière feature activée devient invisible (valeur marginale nulle, et le joueur ne comprend pas pourquoi). Et je voudrais que le pire cas courant (pas le pire cas théorique) reste sous le plafond : à vérifier au rejeu.
4. **Moral +12 partagé** : d'accord. J'en prends au plus **+4**, et seulement de façon temporaire (fête de reprise, via `global.race.motivated`, voir plus bas) ; tes monuments ont les 8 autres.
5. Plafond de population : à toi seul, d'accord.

**Maturation : je prends ta définition, sans la condition de succès.** Tu as raison sur un point important : ma définition « premier franchissement de 21 j » (intervalle *après* la réponse) récompense **Easy** (Easy sur une carte à 10 j la projette à 25 j et plante le chêne tout de suite). La tienne exige que la carte ait réellement passé ≥ 21 j : bien meilleure. Je propose donc : **maturation = première révision créditée avec `ivl_avant ≥ 21` pour ce cid, une fois pour toutes, quel que soit le bouton**. Je retire le « réussi » parce que c'est une révision unique par carte et pour toujours : si elle exige le succès, c'est exactement la révision où mentir rapporte un chêne/un habitant permanent. Le temps passé (21 j incompressibles) suffit comme preuve. Un seul registre `maturations`, lu par mes chênes et ta population : **c'est un seul franchissement, deux lectures**, donc le budget doit compter chênes + naissances comme une seule source quand on vérifie le pire cas.

**Cendres et règle 4 : je propose d'aller plus loin que toi.** Ton constat est juste : « noble seulement si réussie » crée déjà un intérêt à mentir. Ta compensation à 50 % divise l'écart par deux ; je propose de **le supprimer** : la *nature* de la ressource (noble ou de base) dépend seulement de `ivl_avant`, jamais du bouton ; la *quantité* est la base, indépendante du bouton. Une carte mûre oubliée donne donc encore son noble ce jour-là, mais son intervalle s'effondre, et elle redonne du bois/de la nourriture jusqu'à ce qu'elle remûrisse : **le flux de nobles suit le stock de cartes mûres, qui est lui-même la mesure honnête de la réussite dans le temps**. Le « succès » reste mesuré pour ton fleuve (bande de rétention, règle 5), où il est fait pour ça. Conséquence pour les cendres : elles n'ont plus de manque à compenser ; si elles ajoutent une ressource à Again, elles **créent** une incitation à presser Again. Je propose qu'elles deviennent **purement narratives**, versées dans ma Chronique (voix d'« À revoir » sur un chêne : « les cendres nourriront le champ »). Et je te suggère d'éviter le mot *cendres* à côté de ma *flamme/braise* : les cendres, c'est ce qui reste quand le feu est mort, l'image même de la culpabilité. *Terreau* ou *compost* ?
Ce point change une règle décidée (`7-architecture.md` §1.3 règle 4) : je le marque comme **à faire valider par Mathéo** dans mon rendu. Si tu n'es pas d'accord, on présente les deux options côte à côte.

**Jour compté** : je propose `n ≥ min(10, dues du matin)` plutôt que `n ≥ 10` : un jour où l'on avait 4 cartes dues et qu'on les a faites toutes doit compter, sinon on pousse à ajouter des cartes pour atteindre 10. Les dues du matin : `deck_count` [P] au premier réveil du jour, ou le revlog sur PC ; inconnues → 10. Les jours partiels (1 ≤ n < seuil) chauffent la flamme au prorata ; ta tresse peut ne retenir que les jours pleins.

**Ère 0** : d'accord, aucune feature D en ère 0. Chez moi en ère 0 : routage pousses → RNA, chênes → DNA ; la flamme est « la source chaude » de la soupe et multiplie la production d'organelles/nucleus (`main.js:1233, 1241`, qui ne passent pas par `psychic_boost`) ; la chronique et le courrier existent.

Ma critique de trois (quatre) de tes features suit dans un message séparé dès que j'ai lu ton rendu ; si ton rendu tarde, je la fais sur la base de ton ouverture.

## Réponses de B

### B → C et D (données réelles, premières réponses) — 2026-10-20

L'interface est dans `rapports/plan/B-interface.md` (v0). Faits **constatés sur le téléphone** qui changent vos hypothèses :
1. **FSRS est désactivé** dans la collection de l'utilisateur : `fsrs_stability/difficulty` = NULL partout. Aucune stabilité ni retrievability. C P2 « stabilité seulement si FSRS actif, sinon intervalle » : c'est le cas réel aujourd'hui.
2. **Zéro carte mûre** (`prop:ivl>=21` → 0, `prop:ivl>=7` → 13) : collection créée le 9 oct. Nobles, chênes, maturations, fleuve-mûr, lapses mûres : **muets pendant plusieurs semaines**.
3. En root, B lit le **revlog en copie** (base copiée, original jamais ouvert) : bouton exact, `lastIvl` (intervalle avant), type de révision, durée. Donc `ivl_avant`, `b`, « lapse mûre » (`p ≥ 21` et `b = 1`) sont **exacts** sans customData. `lapses_avant/après` : B fournit `b` (plus direct) ; le compteur `lapses` de la carte n'est que l'état courant.
4. `prop:rated=-k` (C) : confirmé sur l'appareil (`prop:rated=-4` → 8 cartes). B s'en sert pour le rattrapage sans root ; avec root, le revlog suffit.
5. Activité réelle : 21–46 cartes distinctes/jour (11–15 oct.).

Réponses aux demandes :
- **Registre de maturation unique** (C P2, D §2) : oui, B le calcule dans le rejeu, échelle 21 / 180 / 365 j, une fois par carte et par seuil, pour toujours. Événement `credit` avec `maturation: 21|180|365`.
- **Nobles et bouton** : B retient par défaut « noble = `p ≥ 21`, quel que soit le bouton » (P5a de C) ; réglage `nobleRequiresSuccess` si vous tranchez autrement. Avec ce défaut, la question « cendres/compost » de D n'est plus un correctif nécessaire.
- **Jour compté** = `crédits ≥ min(10, dues du matin)` : B fournit `counted` par jour ; « dues du matin » vient d'une photo quotidienne, à défaut le seuil vaut 10.
- **`ankiMult(res)`** : B fournit la plomberie (registre de bonus, somme additive, plafond par ressource réglable, ligne dans `breakdown.p[res]`) ; les valeurs et plafonds restent à vous. Je vérifie pendant B5 si `production('psychic_boost', res)` couvre bien tous les sites ; je répondrai ici avec la liste des exceptions.

### C → D (jugement croisé : critique de cinq de tes propositions, après lecture de D-conception.md)

J'ai lu ton rendu en entier. Beaucoup de choses me semblent justes : semaines **cumulées** au lieu de la tresse consécutive, fenêtre du fleuve en **jours comptés** (la pause ne bouge rien), rejet des paris (Brier sans issue indépendante), écart de la banque du temps, poids **linéaire** des guildes (découper un paquet ne rapporte rien), plancher d'hostilité 55. Mes critiques, de la plus importante à la moins importante :

**1. Guildes : c'est une deuxième prime de maturation, pas une répartition.** `G = min(5 %, 1,25 % × log₂(1 + chênes/50))` a la même entrée et la même forme que mes chênes (`2,5 % × log₂(1 + N/100)`). Avec ta population (√chênes), la **même maturation 21 j est donc lue trois fois** : chêne (+% global), place (population), masse de guilde (+%). Proposition : **les guildes répartissent la masse des chênes au lieu d'en créer une nouvelle**. Sans affectation, les chênes donnent `X %` à toutes les ressources ; avec affectation, la même masse `X × |J|` se redistribue entre métiers selon ta formule à somme constante (plafond +15 % pour un métier). Tu gardes tout ce qui fait l'intérêt de la feature (identité des paquets, choix, somme constante, verrou de 7 j), on économise 5 points d'enveloppe, et une ligne d'infobulle au lieu de deux. Second point : la feature coûte ~4,5 soirées (dont 2 de panneau) pour ≤ +5 % en moyenne, et sur la collection réelle (aucune carte mûre, seuil de 20 maturations par paquet) elle restera **inactive pendant 2 à 3 mois** ; je la mettrais en D-3, pas en D-2.

**2. Ménagerie, fleuve, maturation : la condition « réussi » revient par trois portes.** Ton tableau §1.2 définit encore `maturation` comme « première **réussite** » ; B a retenu « quel que soit le bouton » (B-interface §3) et je propose qu'on s'y tienne partout. Le cas le plus gênant est l'**apprivoisement** : « crédit réussi avec intervalle avant ≥ 21 j » sur une sangsue. C'est une révision unique, pour un bonus permanent et un don noble : exactement la révision où mentir « Bien » paie, et sur la pire carte possible pour mentir (une sangsue mal faite qu'on garde en la déclarant sue). Proposition : apprivoisée = première révision avec `p ≥ 21` **après** l'état sauvage, quel que soit le bouton. Revenir à 21 j après 4 rechutes demande déjà plusieurs réussites espacées : le temps est la preuve. Le fleuve, lui, mesure le succès par nature (règle 5) : je l'accepte, c'est la seule place où le bouton compte, et elle est faite pour ça (voir point 3).

**3. Fleuve : la bande fixe pousse un peu à mentir juste sous 85 %, et le ciel clément sort de l'enveloppe.**
- Un joueur à r = 0,83 gagne 4 points de bonus en changeant quelques « À revoir » en « Bien ». La rampe 0,80 → 0,85 est raide. Proposition : rampe large **0,70 → 0,85** (chaque mensonge vaut presque rien), plateau 0,85-0,95 inchangé.
- Avec FSRS désactivé [testé-B], la rétention visée ne sert pas ; si FSRS est activé un jour, une bande fixe pénalise un réglage légitime (rétention visée 0,80 pour alléger la charge). Repli proposé : bande centrée sur `clamp(rétention visée, 0,82, 0,93)` ± 5 points ; le bornage empêche « viser 70 % ».
- **Ciel clément « hors enveloppe »** : je refuse le principe, même pour un petit effet ; sinon chaque feature trouvera son petit effet hors enveloppe. Compte-le dans l'enveloppe Food (≤ +3 %) ou mets-le en cosmétique (le ciel plus bleu, sans toucher au tirage).
- La source n° 2 (photo du matin + ensembles `R_k`, `F_k`, jours « incomplets ») n'est plus nécessaire : B lit le revlog en copie, `p` et `b` exacts (B-interface §1). FLV-1 peut tomber de 1,5 à 0,5 soirée ; garde la source 2 seulement comme repli sans root.

**4. Population : d'accord sur le double usage, pas sur la taille.** Une maturation qui donne un chêne et une place, dans deux enveloppes différentes, me va (le franchissement est rare et lent : c'est la vraie mesure d'apprentissage). Mais +25 % du logement = +25 % de main-d'œuvre, le plus gros levier d'Evolve, bien au-dessus de toute ligne de l'enveloppe +40 % ; et ton tableau montre que le plafond relatif mord dès 90 jours pour tous les profils : la feature devient « +25 % de logement gratuit » très tôt. Proposition : **≤ 15 %** du logement au départ (hyp.), à relever si le rejeu montre que l'effet net (après la nourriture) est faible. Accord sur l'abandon de l'habitant « dormant ».

**5. Brume : elle ne doit pas s'épaissir sous les yeux du joueur qui revient.** Au retour d'une pause, découvrir un village plus embrumé est exactement l'image « regarde ce que tu as laissé faire » (Memory Forest *Wild*), même sans effet économique. Proposition : la brume ne gagne qu'**une bande par semaine au plus**, et seulement à la lisière hors de la vue par défaut ; elle recule normalement. Ou plus simple : la brume ne fait que reculer depuis un état initial (comme ton « rien ne baisse »).

**Moral.** Ton rendu donne les 10 points de moral aux monuments, ton ouverture parlait de 12 partagés. Proposition : **plafond `morale.anki` = 12** ; monuments + Merveille ≤ 10 ; ma fête de reprise ≤ **+2**, temporaire (je descends de +4 à +2). Note de code : je voulais d'abord réutiliser `global.race.motivated` pour la fête ; vérifié, c'est +11 de moral (`main.js:1443-1446`) et +6 de plafond (`main.js:3221-3224`) pendant ≈ 80 cartes : beaucoup trop. J'utilise donc la clé `morale.anki`. Évitons tous les deux `motivated`/`inspired` d'Evolve comme récompenses.

**Ce que j'accepte de toi tel quel** : `jour compté` avec « au moins 1 » (j'avais `max(1, …)`) ; la file hebdomadaire pour les cartes anciennes (j'ai 150/sem. pour les chênes, toi 100 : prenons **100** partout, un seul nombre) ; les textes de tes features passent par ma Chronique et mon Courrier (une phrase par feature, deux features par lettre au plus) ; ordre D-1 / D-2 / D-3 (avec les guildes en D-3).

J'attends ta critique de mes features (surtout : ticks typés « les mines ne travaillent qu'aux jours de chêne » avec `α = 0,5`, la Flamme, le Courrier sans aucun effet économique).

### D → C (réponses à ta critique, et ma critique de tes features) — 2026-10-20

Merci, ta critique est juste presque partout. J'ai **modifié `D-conception.md`** en conséquence. Point par point :

**Réponses à tes cinq critiques**
1. **Guildes = deuxième prime de maturation** : accepté, c'était mon plus gros défaut. Nouvelle règle (§4) : aucune réserve nouvelle ; les guildes **orientent la moitié de tes chênes**. Pour un métier j : `b_j = X/2 + min(1,5·X ; (X/2)·|J|·s_j)`, où `X` = ton bonus de chênes. Sans affectation `b_j = X` (tes chênes tels quels) ; chaque métier garde au moins `X/2` (personne n'est « dépouillé ») et au plus `2X` ; la somme ne dépasse jamais `X·|J|`. Le coût d'enveloppe D tombe à 0 ; la ligne d'infobulle devient « Chênes (guilde de *X*) ». Passées en **D-3**. Il faudra que C-R3 expose `X` et que GUI-3 remplace la contribution des chênes par `b_j` sur les ressources des métiers éligibles (les autres gardent `X`) : une tâche commune, à nous deux.
2. **« Réussi » qui revient** : accepté. Le §1.2 suit maintenant le registre de B (quel que soit le bouton) ; l'apprivoisement = premier crédit `p ≥ 21` après la dernière rechute, quel que soit le bouton ; stèles (180) et Merveille (365) lisent le registre de B. Seul le fleuve lit l'issue.
3. **Fleuve** : rampe **0,70 → 0,85** acceptée ; bande liée à la rétention visée bornée `clamp(0,82 ; 0,93) ± 5` si FSRS est activé, acceptée ; source « photo du matin » reléguée en repli sans root (FLV-1 : 0,5 soirée). **Ciel clément** : je l'ai retiré. Le mettre dans l'enveloppe Food en faisait un second fleuve ; il devient un **arc-en-ciel** cosmétique après la pluie quand la semaine est dans la bande, sans toucher au tirage d'Evolve.
4. **Population** : 15 % accepté (hyp., à relever seulement si le rejeu montre un effet net faible).
5. **Brume** : accepté sous ta première forme : **au plus +1 bande par semaine**, sur la lisière extérieure hors du cadrage par défaut ; recul sans limite dès qu'on révise.

**Moral** : d'accord sur 12 = D ≤ 10 (7 monuments × 1 + Merveille 6 × 0,5) et toi ≤ +2 temporaires par `morale.anki`. D'accord pour bannir `motivated`/`inspired` comme récompenses (merci pour la vérification).
**Enveloppe** : ton §1 écrit « plafond 40, C ≤ 20, D ≤ 15 » ; je confirme **D ≤ 15** (je n'ai plus besoin de plus : fleuve 8 + ménagerie 3 = 11) ; les 5 points libres sont une marge qui évite au prorata de mordre en pratique.
**File de 100 par semaine** pour toutes les lectures économiques du registre : d'accord, un seul nombre.

**Ma critique de tes features** (de la plus importante à la moins importante)

**C-1. La fête de reprise est rentable à provoquer.** Avec l'horloge à cartes, sauter des jours ne coûte presque rien : les dues s'accumulent dans Anki et sont créditées au retour, en pleine valeur jusqu'à 60 par jour (`E(n)`), et tes **repos absorbent 3 jours** sans perte de chaleur. Scénario : je saute exactement 3 jours, couverts par 3 repos → chaleur intacte ; au retour, fête : crédit +50 % sur 30 cartes, gain de chaleur doublé, +2 de moral. Gain net positif, renouvelable tous les 14 jours. C'est l'incitation « s'absenter pour toucher la fête » que ton tableau de dérives prétend parer (« d'un montant inférieur à ce que la pause a coûté ») : ici la pause n'a **rien** coûté. Proposition : la fête ne se déclenche que si l'absence a **réellement coûté de la chaleur** (au moins un jour à −5 % après épuisement des repos), et son crédit bonus est plafonné à la chaleur perdue convertie en équivalents (ou supprimé : la fête peut n'être que moral +2, chaleur doublée et page de chronique). Test à ajouter à C-F2 : « 3 jours d'absence couverts par 3 repos → pas de fête ».

**C-2. Les « jours de pousse » (`α = 0,5`) pénalisent le débutant, c'est-à-dire l'utilisateur réel.** Production noble = Evolve × `(s + α(1 − s))` : à `s = 0`, mines et fonderies à 50 %. Or l'utilisateur n'a **aucune** carte mûre et n'en aura que peu pendant des mois (B) ; chaque nouvelle carte fait baisser `s`. Trois effets : (a) une **pénalité** par rapport au jeu d'origine pendant toute la montée en charge (« rien ne se perd » tient, mais le joueur voit ses mines à moitié sans pouvoir rien y faire, ce qui est le contraire d'un retour informatif) ; (b) une incitation douce à **moins introduire de nouvelles cartes** (bonne contre la dérive Keeps, mauvaise pour quelqu'un qui doit apprendre 3 073 nouvelles) ; (c) une incitation différée à mentir (« Bien » sur une mûre oubliée garde la carte mûre, donc `s` haut aux jours suivants). Propositions, au choix : `α` qui **dépend de la phase** de la collection (`α = 1` tant qu'elle a < 100 cartes mûres, puis descend linéairement vers 0,5 à 1 000), ou inverser le signe : nobles à 100 % de base et **bonus** `+β·s` (dans l'enveloppe des chênes) plutôt que malus `α`. Je préfère la première (garde ta lecture forte de la règle 4 une fois que la maturité a un sens).

**C-3. La flamme ne devrait pas fondre pendant que le village est figé.** Avec l'horloge, une pause gèle tout le village… sauf la flamme, qui baisse de 5 % par jour Anki : **la seule chose qui change pendant l'absence est une perte**. C'est exactement l'image que tu refuses pour ma brume. Proposition : plafonner la perte **par absence** (p. ex. au plus −20 de chaleur, soit −2 % de bonus, quelle que soit la durée), en plus des repos ; au retour, la chaleur repart de là. Après 10 jours de pause depuis H = 85 : H ≥ 65 au lieu de 59, et pas de « dette » qui grandit avec la durée. Ça garde l'incitation à la régularité (les jours comptés réchauffent) sans aversion à la perte croissante.

**C-4. Ère 0 : la flamme sur organelles/nucleus doit lire les ticks de cartes, pas le temps réel.** `main.js:1233, 1241` multiplient une production **passive** par `time_multiplier` ; si `ankiClock` est en mode `original` (ou si `passive > 0`), ton bonus récompense le fait de laisser le jeu ouvert. À préciser avec B5 : bonus seulement pendant les ticks issus de cartes.

**C-5 (mineur). Crédit direct `1 % × max(res)`** : le crédit par carte grandit avec les entrepôts. C'est cohérent avec la progression, mais construire un entrepôt augmente le gain **de chaque carte** future : vérifier au rejeu que ce n'est pas la meilleure stratégie de construction (sinon : `1 % × max` borné par un palier lié à l'ère).

**Ce que j'approuve sans réserve** : le noble sur `p ≥ 21` quel que soit le bouton (à faire valider par Mathéo, je le note aussi) ; la maturation sur `p` et non sur l'intervalle après (Easy ne plante rien) ; la Chronique sans aucune valeur et le test des mots interdits ; le Courrier **sans** effet économique, avec un seul conseil de forme de carte et jamais « révise plus » ; le crépuscule au-delà de 60 cartes (le jeu ne dit jamais « assez », la lumière le montre).

**Demandes à B** (relayées ici) : (1) `jour compté` avec `max(1, …)` ; (2) dues du matin **par paquet** avec `is:due` (non plafonné par la limite de révisions du paquet, pour les comptoirs) ; (3) texte de la question (début, HTML retiré) pour les stèles et les fiches de bêtes ; (4) `tag:leech` et `edited:N` dans la photo du jour.

### C → D (réponses à ta critique de mes features ; tout est reporté dans C-conception.md)

Merci : tes trois premiers points sont des défauts réels de ma version, et je les corrige tous.

**C-1 Fête rentable à provoquer : accepté entièrement.** Tu as raison, avec les repos une absence de 3 jours ne coûtait rien et la fête rapportait. Nouvelles règles : la fête n'a lieu que si l'absence (≥ 3 jours) a **réellement fait perdre de la chaleur** ; son gain supplémentaire de chaleur est `min(gain normal, chaleur perdue)` ; **plus aucun crédit de ressource** (le +50 % sur 30 cartes est retiré) ; il reste moral `anki` +2 temporaire et la page de chronique. Ton test est ajouté à C-F2 : « 3 jours couverts par 3 repos → pas de fête ».

**C-2 `α` pénalise le débutant : accepté, avec ta première proposition et un ajout.** `α(N)` dépend des maturations du registre : 1 tant que `N < 100`, puis descend linéairement à 0,5 à `N = 1 000` ; `N` ne baisse jamais, donc `α` ne remonte jamais en punition. Ajout : les ticks des **nouvelles cartes** sont neutres (`α` ne s'applique qu'aux révisions jeunes), et `s` est calculé parmi les seules révisions : introduire des cartes n'est plus jamais pénalisé, ton point (b) disparaît. Ton point (c) (mentir « Bien » sur une mûre oubliée la garde mûre) est vrai pour toute récompense fondée sur la maturité ; l'effet est d'une carte sur des centaines dans `s` : je l'écris comme incitation résiduelle connue, à mesurer au rejeu. Pour l'utilisateur réel, les mines tournent donc à 100 % pendant les premiers mois.

**C-3 La flamme qui fond seule pendant que le village dort : accepté.** Perte plafonnée à **−20 de chaleur par absence**, quelle que soit sa durée, en plus des repos. 10 jours depuis 85 → 65 (au lieu de 59) ; un mois → 65 aussi. Plus de dette qui grandit avec la durée. C'est bien le même principe que celui que je t'ai demandé pour la brume : je m'y soumets.

**C-4 Ère 0 : accepté.** Le bonus de flamme sur organelles/nucleus ne joue que pendant les ticks issus de cartes ; en mode `original`, aucun bonus Anki n'est actif. À préciser avec B5 (contexte de tick lu par `ankiMult`, le même que pour les ticks typés de R7).

**C-5 Crédit `1 % × max(res)` : accepté comme point à vérifier.** Si le rejeu montre que bâtir des entrepôts devient la meilleure stratégie à cause de ce seul effet, `max(res)` sera borné par un palier lié à l'ère.

**Guildes qui orientent la moitié des chênes** : j'accepte ta formule `b_j = X/2 + min(1,5·X ; (X/2)·|J|·s_j)` ; C-R3 exposera `X` (bonus de chênes) et la contribution par ressource passe par une seule fonction que GUI-3 remplacera. Tâche commune notée chez moi. Avec la flamme (≤ 10) et des chênes orientés jusqu'à `2X` sur un métier (≤ 20 sur Food si `X` = 10), le pire cas C sur Food devient 30 : il reste sous 40 avec ton fleuve (8) + ménagerie (3) = 41 → le prorata mordrait d'un point dans le pire cas théorique seulement. Je propose qu'on le laisse ainsi et qu'on vérifie au rejeu.

**Points restants entre nous** : aucun désaccord ouvert de mon côté. Reste une décision qui n'est ni à toi ni à moi : **« noble quel que soit le bouton »** modifie la règle 4 du rapport 7 et doit être validée par Mathéo ; nous la présentons tous les deux comme défaut de B, avec `nobleRequiresSuccess` comme repli.

### D → C (clôture) — 2026-10-20

Lu ta réponse : tes corrections C-1 à C-5 me conviennent, en particulier les ticks des nouvelles cartes neutres et `α(N)` qui ne remonte jamais. D'accord pour laisser le pire cas théorique sur Food à 41 (prorata d'un point) et le vérifier au rejeu. **Aucun désaccord ouvert de mon côté non plus.** Décision pour Mathéo : « noble quel que soit le bouton » (défaut de B, repli `nobleRequiresSuccess`), présentée par nous deux. Demandes à B toujours ouvertes : `max(1, …)` pour le jour compté, dues par paquet via `is:due`, texte de question, `tag:leech` et `edited:N` dans la photo du jour.

### B → C et D (demandes livrées, exceptions de l'horloge) — 2026-10-20

Tout est sur la branche locale `socle-anki` (rien poussé) ; détail dans `B-interface.md` (version finale) et `B-rapport.md`.
1. **Jour compté** = `crédits ≥ max(1, min(10, dues du matin))`, une seule définition, dans `anki/ledger.js` (testé).
2. **Dues du matin par paquet** : `snapshot.decks[did].dueMorning` (révision + apprentissage dus, non plafonnés par la limite du paquet, comme `is:due`) ; vérifié = `is:due` du provider (92) sur la collection réelle.
3. **Texte de la question** : `AnkiVillage.cardText([cid…])` → `{cid: {text, html, did}}` (rendu par AnkiDroid, `question_simple`), gardé en mémoire, jamais journalisé. Testé sur deux cartes réelles.
4. **`tag:leech`, `edited:1`, `edited:7`** par paquet dans la photo du jour (comptés en cartes ; 0 aujourd'hui, comme les recherches du provider).
5. **Clic RNA / cueillette** : coupés par défaut en mode cartes (RNA, nourriture, bois, pierre, chrysotile), réglage `noManual` ; en mode original rien ne change. Testé sur le vrai moteur.
6. **Registre de maturation** 21/180/365 sur `p`, quel que soit le bouton ; `nobleRequiresSuccess` reste un réglage (décision de Mathéo).
7. **Enveloppe** : `ankiMult.set(feature, res|'*', bonus)` ; somme additive, plafond +40 % par ressource (réglable `ankiMult.cap`), **prorata**, une ligne `Anki : <feature>` par feature dans l'infobulle. **Moral** : `ankiMorale.set(feature, points, plafond)`, total plafonné à 12 (points et plafond de moral), clé `global.city.morale.anki`, chaîne `morale_anki` ajoutée.

**Exceptions de l'horloge (promis plus haut).** L'horloge règle le **nombre de ticks** (comme le temps accéléré d'Evolve), pas `time_multiplier` : tout ce qui est dans fastLoop/midLoop/longLoop suit donc l'horloge, y compris ce qui échappe à `time_multiplier` (croissance de population, tirée au sort par tick ; famine ; sans-abri ; événements de longLoop ; calendrier ; file de construction). Restent hors horloge : les actions du joueur (cueillette, coupée par défaut en mode cartes ; achats ; marché ; artisanat manuel) et les bonus d'astrologie/fêtes qui lisent la date réelle. `production('psychic_boost')` ne couvre ni Knowledge ni Money : un bonus `ankiMult` sur ces deux ressources n'aura aucun effet.

**Pas fait (reste à faire, dépend de vous)** : ticks « typés » de C-R2 (mûres d'abord, nouvelles neutres, `α(N)` appliqué aux nobles). L'horloge ne sait aujourd'hui que « n ticks » ; il faudrait un drapeau de contexte lu par `ankiMult` pendant les ticks d'une catégorie. Estimation : 1 soirée.
