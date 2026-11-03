# B — Interface du socle Anki ↔ Evolve (pour conception-C et conception-D)

*Version finale, 2026-10-20 (la v0 a été écrite avant le code). Code : `evolve-pixel-village/`, branche locale `socle-anki`, rien poussé.*
*Légende : **[testé]** = constaté sur le téléphone, sur les données réelles de l'utilisateur, en lecture seule ; **[test]** = couvert par `node --test` ; **[code]** = lu dans le code ; **[non testé]** = écrit mais jamais exécuté dans le vrai contexte.*

## 1. D'où viennent les données

| Source | Comment | Ce qu'elle donne | Statut |
|---|---|---|---|
| **Revlog, en copie** (voie par défaut) | root : `cat` de `collection.anki2` + `-wal` (AnkiDroid 2.25.2, `/storage/emulated/0/Android/data/com.ichi2.anki/files/AnkiDroid/`) vers `~/.anki-village/cache/` (droits 600), lecture par `node:sqlite` (intégré à Node 24). L'original n'est jamais ouvert ; une copie n'est gardée que si `stat` est identique avant et après. | Chaque révision : bouton exact, intervalle avant (`lastIvl`) et après, type de révision, durée (ms), heure à la ms ; état des cartes, paquets, étiquettes, date de modification des notes. | **[testé]** 343 révisions → 190 crédits ; 0,3 à 0,6 s par lecture |
| **ContentProvider** `com.ichi2.anki.flashcards` (repli) | root : `content query … --where "<recherche Anki>"`, une seule session `su` par lancement. | Par carte : `reps, lapses, type, queue, due, interval, custom_data, fsrs_*, last_review_time_secs, deck_id` ; recherches Anki ; texte rendu de la question (`question_simple`). | **[testé]** ~1,2 s par appel ; `prop:rated=-k` donne exactement les mêmes (carte, jour) que le revlog (189/190, la différence est une carte supprimée) |
| JS de planification + `customData` | Extrait `anki/customdata-snippet.js`, à coller par l'utilisateur. | Bouton du jour sans root (`vf`), intervalle avant (`vp`), jour (`vd`). | **[test]** (simulation d'`applyStateTransform` d'Anki) ; **[non testé]** dans AnkiDroid |

**Faits sur la collection réelle** [testé] : FSRS désactivé (stabilité NULL partout) ; aucune carte mûre (`prop:ivl>=21` → 0) ; `custom_data` vide ; champ de planification personnalisée vide ; bascule 4 h, Europe/Paris ; 21 à 46 cartes distinctes par jour du 11 au 15 oct., rien depuis le 16 ; 92 cartes dues aujourd'hui ; 0 sangsue ; 0 note modifiée sur 7 jours.

## 2. Événements (format v1)

Journal hors du dépôt : `~/.anki-village/log/<appareil>/AAAA-MM.jsonl` (ajout en fin de fichier, identifiants déterministes, relire deux fois la même source n'ajoute rien [testé]).

```json
{"v":1,"k":"review","id":"rv:1792186451743","src":"revlog","t":1792186451743,"day":20742,"aday":7,
 "cid":1755258134291,"did":1791555905783,"b":4,"p":1,"ivl":4,"rt":1,"ms":8612,"nw":0}
```

| Champ | Sens | revlog | provider |
|---|---|---|---|
| `id` | `rv:<id revlog>` / `pv:<cid>:<jour>` | ✔ | ✔ |
| `t` | heure (ms) | exacte | dernière réponse du jour, sinon 04:00 du jour |
| `day` | jour Anki = jour civil local de `t − 4 h`, compté depuis 1970-01-01 (16 oct. 2026 = 20742) | ✔ | ✔ |
| `aday` | jour depuis la création de la collection (échelle de `due`) | ✔ | — |
| `cid`, `did` | carte, paquet (paquet d'origine si filtré ; `null` si carte supprimée) | ✔ | ✔ |
| `b` | bouton 1–4 (0 = replanification manuelle) | exact | via `customData` seulement |
| `p` | intervalle **avant**, jours (0 si nouvelle/apprentissage) | exact | via `customData` seulement |
| `ivl` | intervalle après, jours | ✔ | état courant |
| `rt` | type 0 apprentissage, 1 révision, 2 réapprentissage, 3 filtrée, 4 manuelle, 5 replanifiée | ✔ | — |
| `ms` | durée de réponse (plafonnée à 60 000) | ✔ | — |
| `nw` | 1 = toute première réponse (introduction) | ✔ | via `introduced:1` (aujourd'hui seulement) |
| `lp` | `lapses` de la carte à la lecture | — | ✔ |

**Photo du jour** (`k: "state"`, la première de chaque jour est journalisée, la dernière est servie dans le statut) [testé] : `totals` et `decks[did] = {name, new, learn, young, mature, suspended, buried, due, dueMorning, leech, edited1, edited7, total}`, `dueMorning` (exacte si rien n'a été révisé avant la photo, sinon `approx: true` = dues restantes + cartes en révision déjà répondues).

## 3. Comptabilité (`anki/ledger.js`, fonction pure, [test] 14 cas)

`AnkiLedger.replay(events, rules, {epoch, today}) → ledger` ; même code dans Node et dans la page.
- **Crédit** = (carte, jour Anki), première réponse éligible. Exclues : `rt` 3/4/5, `b = 0`, et `ms < minAnswerMs` (réglage, 0 par défaut). Sources fusionnées sans dépendre de l'ordre (revlog > customdata > provider pour les champs, heure la plus ancienne).
- **Base** indépendante du bouton. Rendement décroissant par jour : `sqrt` par défaut (`full` 50, `soft` 50 : 50 → 50, 80 → 76,5, 150 → 123 crédits), ou `flat`, `cap`, `hardCap`. Millièmes entiers.
- **Nouvelles** : au plus `newCap` = 20 payées par jour.
- **Noble** si `p ≥ 21`, **quel que soit le bouton** par défaut (`nobleRequiresSuccess: true` pour l'ancienne règle) ; `dailyCap` optionnel.
- **Maturations** : `ledger.maturations` / `maturedCount`, seuils 21 / 180 / 365 sur `p`, une fois par carte et par seuil, pour toujours ; `credit.maturation(s)`.
- **Oubli d'une mûre** : `credit.lapseMature` (`p ≥ 21` et `b = 1`).
- **Jour compté** : `crédits ≥ max(1, min(10, dues du matin))`.
- **Série douce** : 2 jokers automatiques par semaine (lundi→dimanche), la journée en cours ne casse rien, `best` ne baisse jamais ; chaleur 0–1000 (+1/7 de l'écart les jours comptés, −1/14 les jours ratés hors joker) ; `perks` (`serie3`… `serie100`) jamais retirés.
- `epoch` : les révisions antérieures comptent dans le rang du jour mais ne paient pas cette partie.
- `AnkiLedger.settle(ledger, déjàVersé)` → delta jamais négatif (rien n'est repris, rien n'est payé deux fois).

### 3 bis. Règles v2 (appliquées le 2026-10-20, commit `c2c0f1d1`)
- `diminishing: { full: 60, soft: 10 }`.
- `dawn: { cards: 10, value: 7500 }` : aube de 75 crédits sur les 10 premiers crédits payés, en base seulement. Décision de Mathéo : 75 au lieu des 90 du rapport GD.
- `noble.shape: 'curve'` : nobles sur la même courbe, rang compté parmi les seules mûres du jour.
- `done: { value: 15000 }` : événement `{k:'done', day, t, dueMorning}` émis par le capteur de l'add-on quand toutes les dues du matin sont faites, sans suspension depuis le matin ; payé une fois par jour.
- `L.dayValue(n)` = base d'une journée de n crédits, aube comprise. 10 cartes → 85, 60 → 135, 150 → 178.
- **Source dans l'add-on** : `addon/village_events.py` (mêmes événements v1 que `sensor.js`, lus avec `mw.col.db`) ; pont par `pycmd` (`anki-host.js`).

## 4. API offerte au jeu (page)

| API | Rôle | Statut |
|---|---|---|
| `AnkiVillage.status()` | `{connected, source, error, lastSync, today:{day, credits, cids, counted}, totals, reserve, streak, perks, clock}` | [test] |
| `AnkiVillage.ledger()` / `.events()` / `.decks()` | rejeu complet ; événements bruts ; photo par paquet | [test] / [testé] côté serveur |
| `AnkiVillage.on('credit'|'day'|'sync', fn)` | `credit` : `{cid, did, day, base, noble, b, p, lapseMature, maturation}` (crédits payés seulement) | [test] |
| `AnkiVillage.cardText([cid…])` | `{cid: {text, html, did}}` (texte rendu par AnkiDroid ; mémoire seulement) | [testé] côté serveur |
| `window.ankiCredit(res, n)` | crédite par `modRes` (plafonds respectés), renvoie ce qui est entré | existant |
| `window.ankiClock.get() / set({mode, passive, ticksPerCard, drain, noManual}) / addTicks(n)` | horloge à cartes ; `mode: 'original'` = jeu d'origine (défaut) ; `passive` 0–1 ; `noManual` (vrai par défaut) coupe la cueillette au clic en mode cartes | [test] sur le vrai moteur |
| `window.ankiMult.set(feature, res|'*', bonus)` / `ankiMult.cap(res, plafond)` | enveloppe additive, plafond +40 % par ressource, prorata, ligne `Anki : <feature>` dans l'infobulle ; branché dans `production('psychic_boost', res)` | [test] (module) ; **[non testé]** à l'écran |
| `window.ankiMorale.set(feature, points, plafond)` | moral Anki (`global.city.morale.anki`) et plafond de moral, total ≤ 12 | [test] (module) ; **[non testé]** à l'écran |
| `window.ankiState()` | `global.anki` (voir §5) | [test] |

**Côté serveur** (`node serve.js [port] --anki`, lié à 127.0.0.1) : `GET /api/anki/events?since=N`, `/api/anki/ping` (réveil depuis la carte, CORS `*`, ne porte aucune donnée), `/api/anki/hud` (texte pour un bandeau dans la carte), `/api/anki/cards?cids=…`, `/api/anki/status`. Sans `--anki`, tout renvoie `{"enabled":false}` et le jeu est inchangé. [testé]

## 5. État persistant (`global.anki`, dans la sauvegarde d'Evolve)

`{v, epoch, granted:{base, noble}, reserve:{res: qté}, reserveEra, delivered, ticks:{given}, streak:{best, current, heat, jokersLeft}, perks:[], today:{day, credits, cids, counted}, mult, multCap, morale, moraleMax, clock:{mode, passive, ticksPerCard, drain, bank, frac, noManual}, rules?}`. Une sauvegarde sans `global.anki` est complétée sans rien perdre [test] ; `clearStates` (prestige) n'y touche pas [code]. On ne stocke **pas** l'ensemble des (carte, jour) déjà crédités : le journal le contient, et le filigrane monotone `granted` empêche tout double paiement même si le journal est perdu.

## 6. Contraintes

1. Pas de FSRS aujourd'hui : intervalle par défaut. 2. Pas de carte mûre avant plusieurs semaines : nobles et maturations muets au début. 3. Bouton exact = root (revlog) ou `customData`. 4. Crédits par paquets et parfois en retard : lire `day`, pas l'heure. 5. Règles versionnées ; changer une règle ne reprend jamais rien. 6. Root demandé une fois par lancement du serveur. 7. `ankiMult` ne couvre ni Knowledge ni Money (pas de `psychic_boost` sur ces sites). 8. L'horloge ne connaît que « n ticks » : les ticks typés de C-R2 restent à faire.
