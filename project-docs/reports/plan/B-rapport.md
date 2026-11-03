# B — Rapport du socle technique Anki ↔ Evolve

*2026-10-20. Dépôt `evolve-pixel-village/`, branche locale **`socle-anki`** (6 commits au-dessus de `pixel-village`). **Rien n'a été poussé ni publié.** Aucune écriture dans les données d'AnkiDroid, aucun réglage modifié, `socialblock` non touché. Interface détaillée : `B-interface.md`.*
*Légende : **[testé]** = sur le téléphone, données réelles, lecture seule ; **[test]** = `node --test` ; **[non testé]** = écrit, jamais exécuté dans le vrai contexte ; **[hyp]** = hypothèse.*

## 1. Ce qui est construit

| Partie | Fichiers | Commit |
|---|---|---|
| B3 comptabilité (pure) | `anki/ledger.js`, `anki/ledger.test.js` | `6b56223a` |
| B2 extrait customData | `anki/customdata-snippet.js` (à coller), `anki/customdata.js`, `anki/customdata.test.js` | `6b56223a` |
| B1 capteur | `anki/rootshell.js` (une session `su`), `anki/sensor.js` (voies revlog et provider, journal, photo du jour, texte des cartes) | `dd864a7f`, `92089219` |
| B4 + B5 dans le jeu | `src/anki.js` (nouveau) ; crochets dans `src/main.js` (horloge, sauvegarde, moral), `src/prod.js` (`ankiMult`), `src/actions.js` (cueillette) ; `strings/strings.json` ; `evolve/main.js` reconstruit | `46a1f1b2`, `92089219` |
| B6 budget | `tools/budget/load-game.js` (charge le vrai code du jeu dans Node), `tools/budget/era-budget.js` | `ad0b6bd3` |
| B7 pont | `serve.js` (`--anki`, `/api/anki/*`), `anki-bridge.js` (page), `index.html` | `ad0b6bd3` |
| Tests d'intégration | `anki/game-hooks.test.js`, `anki/bridge.test.js`, `anki/engine.test.js` (vrai moteur) | `46a1f1b2`, `ad0b6bd3`, `0355710e` |
| Notice MPL | `README.md` (fichiers amont modifiés) | `ad0b6bd3` |

Demandes de C et D (relayées par le coordinateur) : **toutes livrées** (jour compté `max(1, …)`, dues du matin par paquet, texte de question, `tag:leech` / `edited:N`, cueillette coupée en mode cartes, registre 21/180/365 quel que soit le bouton, enveloppe +40 % au prorata et moral 12). Réponse dans `discussion-CD.md`.

## 2. Tests et comment les relancer

```
cd evolve-pixel-village
NODE_PATH=~/outils/esbuild/node_modules node --test anki/*.test.js     # 23 tests, ~1,2 s
NODE_PATH=~/outils/esbuild/node_modules node buildEvolve.js            # reconstruit evolve/main.js
```
esbuild (outil de construction déjà employé par le dépôt, installé hors du dépôt dans `~/outils/esbuild`) sert aux tests qui empaquettent `src/`. Sans lui, les 19 tests purs passent et les 4 autres sont sautés. Avant toute modification, la reconstruction redonnait **exactement** le `evolve/main.js` publié (aucun diff).

Sortie du 2026-10-20 : **23 réussis, 0 échec**.
- `ledger` (14) : jour Anki et bascule 4 h (dont les valeurs réelles 20742 et 20735) ; une récompense par (carte, jour) ; base identique pour les 4 boutons ; même résultat pour 4 ordres d'arrivée mélangés ; revlog + provider sur la même carte = 1 crédit ; formes de rendement (décroissance stricte vérifiée sur 400 rangs) ; plafond des nouvelles ; noble à 21 j ; types exclus ; `epoch` ; maturations ; série, jokers, chaleur, bonus permanents, jour compté ≥ 1 ; versement monotone ; montants entiers.
- `customdata` (5) : l'extrait est exécuté comme le fait Anki (`applyStateTransform` d'`answering.ts`) : aucun état de planification modifié, une valeur par bouton, < 100 octets, clés ≤ 8 octets, premier bouton du jour conservé, pas de ping sur PC.
- `game-hooks` (2), `bridge` (1) : horloge (réserve jamais perdue quand l'onglet dort), `ankiMult` au prorata, moral ≤ 12, sauvegarde au temps réel ; pont : versement monotone, réserve aux plafonds, ticks, reconversion de la réserve au passage ère 0 → ère 1.
- `engine` (1) : **le vrai `src/main.js`** (fastLoop/midLoop/longLoop) tourne dans un faux navigateur. 3 organelles × 40 ticks = 30 RNA en mode original ; **0** en mode cartes sans réserve (400 ticks réels) ; 30 avec 40 ticks de réserve ; 15 à 50 % passif ; clic RNA coupé puis rétabli ; puis passage réel en ère 1 par l'action `sentience` du jeu : 40 ticks = +2 jours d'Evolve en mode original, **+0** en mode cartes sans réserve, +3 jours pour 60 ticks de réserve.

## 3. Confirmé sur les données réelles (téléphone, lecture seule)

- Root : `content query` sur `com.ichi2.anki.flashcards` **fonctionne sans permission** ; la route `cards` accepte les recherches Anki (`rated:N[:b]`, `prop:rated=-k`, `prop:ivl>=21`, `introduced:N`, `is:due`, `prop:cdn:`, `tag:`, `edited:`), ~1,2 s par appel.
- Copie de la base : 343 révisions lues (9 → 16 oct.), journal de 344 événements (343 révisions + 1 photo) en 0,3 à 0,6 s ; relance = 0 nouvel événement.
- Rejeu réel par jour (règles par défaut) : 2, 1, 21, 29, 37, 46, 46, 8 crédits ; 20 nouvelles payées et 1 plafonnée les jours chargés ; 184 crédits de base au total ; meilleure série 5 jours.
- Voie provider (`prop:rated=-k`, 12 jours) : mêmes couples (carte, jour) que le revlog, sauf une carte supprimée depuis (invisible pour le provider).
- Photo : 92 dues (= `is:due`), 0 sangsue (= `tag:leech`), 0 note modifiée (= `edited:1`, `edited:7`).
- Texte de question rendu par AnkiDroid lu pour deux cartes (HTML + MathJax).
- Serveur `--anki` sur un port de test : `/api/anki/events`, `/ping` (204, CORS), `/hud`, `/cards`, fichiers statiques : tous répondent.
- Constats qui comptent pour la conception : **FSRS désactivé**, **aucune carte mûre**, champ de planification personnalisée **vide** (rien à fusionner), bascule 4 h.

## 4. Ce qui reste hypothétique ou non testé

1. **Rien n'a été essayé dans le navigateur** : Brave n'était pas lancé et l'ouvrir aurait pris le premier plan. À faire : `node serve.js 8766 --anki`, ouvrir `http://127.0.0.1:8766` (autre origine, donc autre sauvegarde), vérifier le badge « Anki : n cartes aujourd'hui » dans le panneau Village, le menu de l'horloge, et la ligne `Anki : …` dans une infobulle de ressource.
2. **Extrait customData dans AnkiDroid** (spike S2) et **ping depuis la carte** (S1) : testés seulement en simulation.
3. **Latence** carte → crédit : dépend du moment où AnkiDroid écrit dans le WAL (non mesuré). Le ping déclenche une relecture immédiate ; sans ping, la page relit toutes les 5 s.
4. **Copie pendant une écriture** : protégée par `stat` avant/après (3 essais) ; `PRAGMA quick_check` impossible (collation `unicase` d'Anki). Une annulation dans AnkiDroid après lecture laisse l'événement au journal (au pire un crédit en trop, jamais deux pour la même carte et le même jour).
5. **Taux du pont** (B6) : calculés, mais sur des hypothèses de partage crédit direct / production (§6).
6. `ankiMult` et le moral Anki : testés comme module et sur le vrai moteur pour l'horloge, pas à l'écran.

## 5. B5 — horloge à cartes : ce qui suit l'horloge, et les exceptions

**Choix** : l'horloge règle le **nombre de ticks de simulation** dans `execGameLoops` (même principe que le « temps accéléré » d'Evolve, cf. le commentaire de `loopTimers`), et non `time_multiplier`. Raison trouvée dans le code : la croissance de population est un tirage par tick dont la borne vaut `upperBound × (3 − 2^time_multiplier)` ; avec un multiplicateur à 0, la population croîtrait encore. En réglant les ticks, **tout** ce qui est dans les boucles suit l'horloge : production, consommation, population, famine, calendrier et saisons, événements aléatoires, file de construction.

Audit de `time_multiplier` dans fastLoop (pour mémoire) : toutes les productions de l'ère 0 et de l'ère 1 humaines passent par lui. Exceptions : cadeau de déblocage du DNA (`main.js:1256`), bétail abattu (3528), trait anthropophage (3797, 3875), fermes womling de Tau Ceti (4125, sans multiplicateur : sans doute un défaut d'Evolve). Aucune ne concerne l'humain en ères 0-1, et toutes suivent quand même l'horloge par les ticks.

**Hors horloge** : les actions du joueur (cueillette au clic : **coupée par défaut en mode cartes**, réglable ; achats ; marché ; artisanat manuel) ; les bonus d'astrologie et de fêtes qui lisent la date réelle ; le temps accéléré hors ligne d'Evolve (il passe par les ticks, donc à 0 % passif il ne donne rien). Effet de bord corrigé : la sauvegarde d'Evolve n'a lieu que dans `longLoop` ; horloge arrêtée = plus de sauvegarde ; `ankiMaybeSave` sauvegarde au temps réel (≤ 5 s) en mode cartes.

Réglages (`ankiClock.set`) : `mode` `'original'` (défaut, jeu d'origine) / `'cards'` ; `passive` 0–1 ; `ticksPerCard` 20 (1 crédit plein = 1 jour d'Evolve) ; `drain` 8 (la réserve se joue au plus 8× plus vite que le temps normal) ; `noManual`.

## 6. B6 — budget de l'ère 0 et de l'ère 1 (humain), calculé

Méthode : `tools/budget/era-budget.js` charge le vrai code du jeu dans Node et appelle les fonctions de coût du jeu. Chiffres **calculés** ; quantités **[hyp]** comme indiqué.
- **Ère 0** : étapes (une fois) RNA 300, DNA 1 560 ; plafonds au coût minimal pour payer `sentience` (300/300) : 10 membranes, 5 cellules eucaryotes, 3 mitochondries = RNA 785, DNA 620. **Total hors producteurs : RNA 1 085, DNA 2 180.**
- **Ère 1** : 68 techs `primitive` + `civilized` atteignables par l'humain dans une première partie (point fixe sur `reqs`, `trait`, `not_trait`, `condition()` du jeu ; la chaîne théologie n'existe qu'après un prestige ; une branche par choix exclusif). Techs : Knowledge 163 052, Money 68 550, Iron 4 250, Steel 3 775, Coal 2 000, Cement 1 250, etc.
- Bâtiments : chaque bâtiment débloqué est acheté tant que le prix du suivant reste ≤ λ × le prix du premier (règle d'arrêt explicite : au-delà, un exemplaire coûte plus de λ « premiers »). λ = 5 / 10 / 20. Les **hôpitaux** dominent (Aluminium 349 k et Money 768 k à λ = 10) ; ils sont donnés à part.
- **Référence (techs + bâtiments λ = 10 sans hôpitaux)** : Money 530 166, Knowledge 163 052, Lumber 79 688, Stone 59 119, Iron 41 906, Cement 20 481, Steel 13 808, Copper 7 557, Plywood 5 311, Brick 4 284, Furs 3 249, Wrought_Iron 3 128, Coal 2 000.
- Crédits disponibles (règles B3) : 40 cartes/jour → 40 crédits pleins ; 80 → 76,5 ; 150 → 123,2. Sur 6 / 10 semaines : 1 680 / 2 800 (40), 3 212 / 5 353 (80), 5 173 / 8 621 (150).

**Taux proposés par crédit** [hyp : la moitié du budget par le crédit direct, l'autre par la production des ticks ; crédits nobles = 20 % des crédits de base sur la période] :

| cartes/j | semaines | Knowledge | Money | Lumber | Stone | Iron (noble) | Cement (noble) | Steel (noble) | Copper (noble) |
|---|---|---|---|---|---|---|---|---|---|
| 40 | 6 | 49 | 158 | 24 | 18 | 62 | 30 | 21 | 11 |
| 40 | 10 | 29 | 95 | 14 | 11 | 37 | 18 | 12 | 6,7 |
| 80 | 6 | 25 | 83 | 12 | 9,2 | 33 | 16 | 11 | 5,9 |
| 80 | 10 | 15 | 50 | 7,4 | 5,5 | 20 | 9,6 | 6,4 | 3,5 |
| 150 | 6 | 16 | 51 | 7,7 | 5,7 | 20 | 9,9 | 6,7 | 3,7 |
| 150 | 10 | 9,5 | 31 | 4,6 | 3,4 | 12 | 5,9 | 4,0 | 2,2 |

(Tableau complet, avec Brick, Plywood, Furs, Coal, Wrought_Iron, Sheet_Metal : sortie du script.) Ère 0 en une semaine, tout en crédit direct : 40 cartes/j → 3,9 RNA et 7,8 DNA par crédit.
Le pont utilise par défaut la ligne **40 cartes/jour, 10 semaines** (l'activité réelle est de 21 à 46 cartes/jour) : `anki-bridge.js`, `RATES`.

**Alerte de conception** : avec la règle « nobles seulement depuis les cartes mûres » et une collection sans carte mûre, **Iron, Cement, Steel, Copper n'arrivent pas par le crédit direct avant plusieurs semaines** ; seule la production des ticks (mines, fonderies) les fournit au début. Le budget le suppose (part noble à 20 %, hypothèse) ; à vérifier au premier rejeu réel.

## 7. B2 — protocole de test pour l'utilisateur (rien n'a été installé)

Le champ de planification personnalisée est vide aujourd'hui : il n'y a rien à fusionner.
1. Ouvrir `evolve-pixel-village/anki/customdata-snippet.js`, tout copier.
2. AnkiDroid → un paquet → ⋮ → Options → **Avancé** → **Planification personnalisée** : coller, enregistrer. (Le réglage est global à la collection et sera synchronisé vers Anki bureau, où l'extrait ne fait rien de plus que noter `customData`.)
3. Réviser 4 cartes en répondant exprès **À revoir, Difficile, Bien, Facile** (une par bouton).
4. Navigateur de cartes d'AnkiDroid : chercher `prop:cdn:vf=1`, puis `=2`, `=3`, `=4` : chaque recherche doit trouver exactement la carte correspondante. `prop:cdn:vd=<jour>` doit trouver les quatre.
5. Lancer `node anki/sensor.js once` : la ligne « cartes portant un customData » doit compter ces cartes ; `node anki/sensor.js once --source=provider` doit, lui, retrouver les boutons du jour sans revlog (colonne `b`, source `customdata` dans le journal).
6. Pour le ping : lancer `node serve.js --anki`, réviser une carte, vérifier dans la console du serveur qu'une relecture a lieu (badge du jeu mis à jour sans attendre 5 s).
7. Pour retirer : vider le champ. Les clés `vd/vf/vp` restent sur les cartes déjà révisées (≈ 30 octets, sans effet sur la planification).

## 8. Tâches restantes

| # | Tâche | Dépend de | Estimation |
|---|---|---|---|
| R1 | Essai dans Brave (port 8766) : badge, menu horloge, infobulles `Anki : …`, moral Anki | l'utilisateur au téléphone | 30 min |
| R2 | Spikes S1/S2 dans AnkiDroid (protocole §7) | accord de l'utilisateur (réglage d'AnkiDroid) | 30 min |
| R3 | Ticks typés de C-R2 (mûres d'abord, nouvelles neutres, `α(N)` sur les nobles) | conception C | 1 soirée |
| R4 | Lancement automatique du capteur (`jouer.sh` avec `--anki`) et `termux-wake-lock` pendant les séances | décision de l'utilisateur | 30 min |
| R5 | Recalibrer `RATES` et `ticksPerCard` après deux semaines réelles (rejeu du journal) | R1, deux semaines de données | 1 soirée |
| R6 | Journal dans `/sdcard/syncthing/anki-village/` pour le PC (Bruno) et rattrapage `rated:N` sans root | décision de l'utilisateur ; add-on bureau | 1–2 soirées |
| R7 | Bandeau dans la carte (`/api/anki/hud`) : variante de l'extrait qui l'affiche | R2 | 30 min |
| R8 | Reconstruire `wiki/` si on veut que le wiki montre `ankiMult` (non reconstruit ici) | — | 10 min |

## 9. Décisions qui reviennent à l'utilisateur

1. **Noble quel que soit le bouton** (défaut de B, proposé par C et accepté par D) au lieu de « noble seulement si réussie » (règle 4 du rapport 7). Repli : `nobleRequiresSuccess`.
2. **Coller l'extrait customData** dans AnkiDroid (réglage de l'appli), ou s'en passer : avec root, le revlog donne déjà le bouton exact.
3. **Lecture en root de la collection en copie** comme voie principale (une copie de la collection, 2,5 Mo, reste dans `~/.anki-village/cache/`, droits 600, hors dépôt). Alternative sans root : une APK compagnon (rapport 7).
4. **Mode de l'horloge** : `original` (défaut) ou `cards` ; part passive (0 % = rien ne bouge sans réviser) ; cueillette au clic coupée ou non en mode cartes (coupée par défaut).
5. **Début des crédits** : une partie n'est payée qu'à partir du jour Anki de sa première connexion (`epoch` = début du jour) ; l'historique antérieur n'est pas reversé. Autre choix possible : reverser N jours.
6. **Filtre des réponses rapides** (`minAnswerMs`, désactivé) : 1 500 ms écarterait les réponses trop rapides, mais aussi des réponses légitimes (vocabulaire LSF).
7. **Rendement décroissant** : forme `sqrt`, pleine valeur jusqu'à 50 crédits/jour ; nouvelles payées ≤ 20/jour.
8. **Lancer le capteur avec le jeu** (`jouer.sh` → `--anki`) : demande `su` à chaque lancement.
9. Pousser la branche `socle-anki` sur le dépôt public : rien n'a été poussé.
