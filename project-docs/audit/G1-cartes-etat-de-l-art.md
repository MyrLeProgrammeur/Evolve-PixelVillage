# G1 — Card ↔ game reward links: state of the art and data inventory

*Read-only research report, 2026-10-16. Nothing was executed. No creation: the catalogue (§4) is exhaustive, not inventive; the other agent creates.*

## 0. Method and reliability legend

| Label | Meaning |
|---|---|
| **[code]** | Read in a source file or a local clone (path cited). |
| **[page]** | Read in an AnkiWeb description / reviews (local copies `work/gamif/aw/info_*.bin`) or in an opened web page. |
| **[snippet]** | Search engine summary, page not opened: to be rechecked before relying on it. |
| **[memory]** | Literature reference that I know but have not reopened here. |
| **[deduced]** / **[doubt]** | Reasoning, or a point I could not settle. |

Local sources read: `HANDOFF.md`; `project-docs/1-mobile.md`, `2-gamification.md`, `4-portage.md`, `7-architecture.md`; clones `work/portage/Anki-Android` (API `FlashCardsContract.kt`, `provider/CardContentProvider.kt`) and `work/portage/anki` (rslib, proto, pylib); repositories in `work/gamif/` (memory-forest, ankimon, AnkiHabitica, Anki-Farm-Tycoon, City Tycoon `src_164339427`, Keeps `src_1217282111`, Cristal Memoria `src_2011945307`, lifedrain). Web: standard WebSearch engine (no Google named, Reddit deliberately excluded; one search result pointed to a Reddit mirror, I did not open it) and `docs.ankiweb.net`.

Availability codes used in the tables: **[P]** AnkiDroid ContentProvider (companion app); **[J]** "custom scheduling" JS; **[R]** revlog / full database (desktop add-on, or PC after sync); **[S]** computable by an *Anki search* passed to the ContentProvider (`selection`), hence without revlog.

---

## 1. What Anki / AnkiDroid allows measuring

### 1.1 The three access doors on the phone (and what they do not give)

**Door P — ContentProvider** (`api/.../FlashCardsContract.kt`, `provider/CardContentProvider.kt`) [code]
- Permission `READ_WRITE_DATABASE` (dangerous): a real APK is needed; Termux cannot (reports 4 and 7, deduced).
- Columns of a card (map `cardColumns`, CardContentProvider.kt l.124-152): `_id`, `note_id`, `ord`, `deck_id`, `reps`, `lapses`, `type` (0 new, 1 learning, 2 review, 3 relearning), `original_deck_id`, `queue`, `due`, `original_due`, `interval` (`ivl`), `sm2_factor`, `left`, `custom_data`, `fsrs_stability`, `fsrs_difficulty`, `fsrs_desired_retention`, `fsrs_decay`, `last_review_time_secs`, `flags`, rendered texts.
- `cards` / `notes` accept as `selection` **a full Anki search** (`col.findCards(query)`, CardContentProvider.kt l.471-500, report 7).
- Decks: `decks/` returns name, id, options (config JSON), `deck_dyn`, and `deck_count` = **[learning, review, new]** (`getDeckCountsFromDueTreeNode`, l.~527-533, **order read in the code**). **[doubt]** `project-docs/4-portage.md` l.45 writes "[new, learning, review]": this is inaccurate, the code says lrn, rev, new.
- `schedule/`: review queue and **answering a card** (`answer_ease`, `time_taken`, bury, suspend: write; `TIME_TAKEN` cannot be read back).
- **Absent** [code]: `revlog` table, answer duration, number of reviews of the day, streak, retention, stability *per review*, retrievability, any change notification (reports 4 and 7).
- `last_review_time_secs` is the card's value, "not synthesized from the revlog" (contract comment, l.~905-918).

**Door J — custom scheduling JS** (deck Options → Advanced; key `cardStateCustomizer`, stored in the collection config hence synchronised) [code, reports 4 and 7]
- Executed in the review WebView of **both** AnkiDroid screens (`Reviewer.kt:1658-1680`, `ReviewerViewModel.kt:493`), also on desktop and AnkiMobile.
- Inputs, according to `proto/anki/scheduler.proto` (l.80-132, 264-270, 324-329) and `ts/reviewer/answering.ts`: `states.current` + `states.again|hard|good|easy`, each a `SchedulingState`: kind (new / learning / review / relearning / filtered), `scheduled_days`, `elapsed_days`, `ease_factor`, `lapses`, `leeched`, `memory_state {stability, difficulty}`; `customData` (four copies, one per button); `ctx` = `deck_name`, `seed`, `decay`, `desired_retention`.
- So, **before** the answer, the JS knows for each button the resulting interval and (if FSRS is active and if the candidate states carry the memory state: **[doubt]**, not verified at runtime) the resulting stability/difficulty, the deck name and the target retention. It does **not** know the pressed button, nor the duration, nor the history.
- Can write `customData` (≤ 100 bytes, keys ≤ 8 bytes: `rslib/src/storage/card/data.rs:135-149`), searchable by `prop:cdn:key=val` / `prop:cds:`. Only the value of the chosen state is kept → the pressed button can be recovered afterwards (report 7 §2.1 d).
- Can reach `127.0.0.1` (cleartext network allowed): this is the "wake-up call" to the companion app.

**Door S — Anki searches via P (the poor man's SQL)** [code: `rslib/src/search/parser.rs`, `sqlwriter.rs`]
Syntax verified in the parser: `rated:N[:button]` (no cap, only `.max(1)`; **[doubt]** report 7 still mentions "max 365", report 4 and the code say there is none any more), `prop:rated=-k`, `resched:N`, `introduced:N`, `added:N`, `edited:N`, `is:new|review|learn|due|buried|suspended`, `prop:due|ivl|reps|lapses|ease|pos`, **`prop:s`** (stability), **`prop:d`** (difficulty), **`prop:r`** (retrievability), `prop:cdn:`/`prop:cds:`, `deck:`, `tag:`, `flag:`, `card:`.
Consequence: sets of cards can be **counted** (mature = `prop:ivl>=21`, strong = `prop:s>=X`, cards at R < 0.7 = `prop:r<0.7`, new cards introduced this week = `introduced:7`, due = `is:due`) without revlog. Limit: we get *sets of distinct cards*, not events or durations.

### 1.2 Per review: field by field

Base: `revlog` table (`rslib/src/storage/schema11.sql:51-61`; `revlog/mod.rs:65-76`): `id` (ms epoch), `cid`, `usn`, `ease`, `ivl`, `lastIvl`, `factor`, `time`, `type`.

| Data | Definition / source | Desktop [R] | Phone | Remarks and doubts |
|---|---|---|---|---|
| Button (Again / Hard / Good / Easy) | `revlog.ease` 1-4; 0 = manual reschedule (`write_rated`, `RatingKind::ManualReschedule`) | exact, direct (hook `reviewer_did_answer_card` or revlog re-read) | **[P]** not direct; **[J]+[P]** exact via `customData` "one value per button" (report 7); **[S]** `rated:N:1` = cards with ≥ 1 Again that day | The live hook alone loses mobile reviews (report 2 §5.4) |
| Answer duration | `revlog.time` in ms, capped by "Maximum answer seconds" (default 60 s; docs.ankiweb.net/deck-options, read; `max_taken` 60 in `deckconfig/schema11.rs:287`); does not affect scheduling | exact (up to the button click) | **not exposed** (report 7 §1.3 rule 8). Possible only inside the card via a home-made JS timer **[deduced]** | A card left open counts 60 s at most; an answer < 1.5 s is suspect (rule of report 7) |
| Interval before / after | `lastIvl` / `ivl`; negative = seconds (learning), positive = days | yes | `interval` = *current* value of the card; before/after via `customData` (`p`) **[J]** | |
| Ease | `revlog.factor` = ease factor × 1000 (`answering/revlog.rs:50`) | yes | `sm2_factor` (current state) | **[doubt]** exact meaning under FSRS not verified |
| Card state | `revlog.type`: 0 learning, 1 review, 2 relearning, 3 filtered / "cram", 4 manual, 5 rescheduled | yes | `type` (current state of the card, not that of the review) | `type 3` = outside scheduling: to be excluded from any economy (report 7 §1.3 rule 1). Cristal Memoria filters `type IN (0,1,2,3)` and notes that legitimate AnkiDroid reviews had `ease = 0` in some paths (`engagement_widgets.py` l.231-236, code comment) **[doubt]** to be tested |
| Lapses | card counter; revlog: `type=1 & ease=1` | yes | **[P]** `lapses` | |
| FSRS stability / difficulty | **absent from the revlog**; on the card (`cards.data`, `memory_state`) | readable at any time | **[P]** `fsrs_stability`, `fsrs_difficulty`, `fsrs_decay`, `fsrs_desired_retention`; **[J]** candidate values per button | A review's stability *gain* = S after − S before: S before must have been noted (or read on the J side). Not in the revlog |
| Retrievability at review time | R = (1 + factor·t/S)^−decay, factor = 0.9^(−1/decay) − 1 (code: `work/gamif/baraklevy20_memory-forest/memory.py`, identical to the FSRS definition: S = days to go from 100% to 90%, `FlashCardsContract.kt` l.~850) | `card_stats_data(cid).fsrs_retrievability` (`pylib/anki/collection.py:1031`, `rslib/src/stats/card.rs:52-57`) | **[P]** computable from S, decay, `last_review_time_secs`; **[S]** `prop:r<x` | "Today's" value, not "at the moment of the answer": to be captured before the answer |

### 1.3 Per card (current state)

| Data | Source | Desktop | Phone |
|---|---|---|---|
| New / learning / review / relearning | `cards.type`, `queue` | yes | **[P]** `type`, `queue`, or **[S]** `is:` |
| Mature / young | mature = review with interval ≥ 21 d (docs.ankiweb.net/stats, read) | yes | **[P]** `interval`, or **[S]** `prop:ivl>=21` |
| Overdue (days) | `due` vs current day | yes | **[P]** `due` (+ current day: `prop:due<0`) **[S]** |
| Lapses, reps | | yes | **[P]** |
| Suspended / buried | `queue` | yes | **[P]** / **[S]** `is:suspended` |
| Leech | `leech` tag (Memory Forest `study_log.py`); `leeched` on the states side | yes | **[S]** `tag:leech` |
| Card age | first revlog row; `added:` | yes | **[S]** `added:N`, `introduced:N`; no exact age per card (no revlog) |
| Flags, tags, original deck (`odid`) | cards | yes | **[P]** `flags`, `original_deck_id` |

### 1.4 Per deck

| Data | Definition | Where |
|---|---|---|
| Due today (new / learning / review) | due tree | **[P]** `deck_count` (order lrn, rev, new); desktop: `col.sched` |
| Accumulated backlog | overdue `is:due` cards | **[S]** `deck:X prop:due<0` |
| New per day | setting + new cards actually learned | setting in `options` **[P]**; learned: **[S]** `introduced:1` |
| Maximum reviews / day | deck setting | **[P]** `options` |
| Desired retention | `desired_retention` (default 90%, docs read: "workload rises sharply as retention approaches 100 %, keep below 97 %") | **[P]** per-card column; **[J]** `ctx.desired_retention` |
| True retention | Anki: "Again = failure; Hard, Good, Easy = success"; **"only the first review of the day counts"** (docs read); windows today / yesterday / week / month / year / all (`rslib/src/stats/graphs/retention.rs`, proto `TrueRetentionStats`); counts only reviews with interval ≥ 1 day (`retention.rs`) | desktop exact: `graphs` backend; **phone: no revlog** → approximation by sets **[deduced]** (see below) |
| Mature / young / new / suspended cards | "Card Counts" graph | **[S]** by counting |
| Day streak | **Anki has no native streak**: no occurrence of `streak` in `rslib/src`, `proto`, `pylib` (grep); all add-ons recompute it from `revlog` (Memory Forest `forest_data._streaks`, Cristal `_compute_anki_streak`) | desktop: revlog; phone: reconstruction by **[S]** `prop:rated=-k`/`rated:k` day by day (report 4 §1.6) but not the exact streak with rollover without computation |
| Time spent | "Review Time" graph = sum of `revlog.time`; text "Studied N cards in X minutes today" (`rslib/src/stats/today.rs`) | desktop only |
| FSRS forgetting curve | per-card retrievability; distribution (`GraphsResponse.Retrievability`, "Card Retrievability" graph); stability / difficulty (FSRS graphs) | desktop: backend; phone: aggregate yourself from **[P]** |
| Workload forecast | "Future Due" (assumes no new cards and no failures, docs read) | desktop; phone **[S]** `prop:due=k` |
| Buttons | "Answer Buttons" graph (counts per button, per maturity) | desktop (revlog); phone **[S]** `rated:N:b` (distinct cards) |

**Approximation of true retention on mobile** [deduced, bias to be aware of]: proportion of cards in `rated:1 prop:ivl>=21` that are not in `rated:1:1`. Bias: `prop:ivl` is the state *after* the answer (a forgotten card is no longer "mature") and `rated:1:1` counts a card with Again even if it had also been passed. Exact value only on the PC (revlog).

### 1.5 Per day / week / month

- The Anki day rolls over at the "rollover" (4 am by default, report 7): `timing_today().next_day_at` (`sqlwriter.rs:336`). All add-ons recompute their own windows (Cristal 2 am, Keeps, etc.): **fix a single definition** (report 7: key `(cid, Anki day)`).
- Day / week / month: `prop:rated=-k` and `rated:N`; from the revlog on PC, everything is possible.
- AnkiDroid sync happens only at startup and on exit (report 7 §2.1 e): the PC's revlog lags behind the phone.

### 1.6 What requires a desktop add-on (or the PC)

| Need | Why not on mobile |
|---|---|
| Exact duration of each answer, total time, average time per card | `revlog.time` not exposed by the provider |
| Full history of buttons per card, order of events | no `revlog` table in the provider |
| Exact true retention (windows), `lastIvl`, `type` of each review | same |
| Exact day streak, skipped days, time of day of reviews | same (rough reconstruction possible) |
| Retrievability *at the moment* of each answer, stability gain per review | S/D absent from the revlog; they must be photographed before/after (J + P) |
| `gui_hooks` (Python) hooks: `reviewer_did_answer_card`, etc. | no Python / Qt on Android (report 4 §2) |
| Official statistics (`graphs`, `card_stats_data`) | Rust backend accessible from desktop Python only |

### 1.7 Measurement pitfalls already documented

- The same review can arrive by two paths (hook and revlog): key `(cid, day)` (report 7). City Tycoon deduplicates by `revlog:<id>` (`anki_bridge.py`, report 2 §3.7).
- Filtered decks / `type 3`: no rescheduling, hence no memory value.
- Cards in learning: several answers on the same day; the "first answer of the day" is also what Anki's true retention measures.
- The 60 s cap flattens very long answers; do not make it a measure of "difficulty".

---

## 2. Existing add-ons and games linking cards and game

**Index**: 1,883 AnkiWeb add-ons filtered in `work/gamif/aw/all.tsv` (report 2). **"Hypermnesia", "Hardcore", "Cards Garden"**: no occurrence in `all.tsv` nor in the 54 local sheets (grep); a web search did not find them either [snippet]. I therefore do not describe them. **"Study Streak"**: only close titles exist (*AnkiStreak: Duolingo Style* 392667675, *StreakGuard* 580845176, *Streak Counter* 1798492503, *Duolingo-style gamification* 255048658): titles and keywords only, no description read nor code. **"Gamify" / Habitica-like**: AnkiHabitica is read in code.

### 2.1 Mechanics table

| Add-on | Source | What a review earns | Streaks / bonuses | Retention / maturity | Penalties |
|---|---|---|---|---|---|
| **Cristal Memoria** (2011945307) | **[code]** Python shell only; game rules on the closed server side (report 2 §3.1); **[page]** AnkiWeb description and reviews | Every answer credits the server game (POST `/v1/review`). Mobile reviews credited via the day's `revlog` delta (`SELECT COUNT(*) … type IN (0,1,2,3)`) | In-session combos at tiers **3, 6, 10, 25, 50, 100**: "N bonus reviews" on the game side, reset on Again (`engagement_widgets.py` l.14, 45, 2105-2112). Day streak computed on revlog, cut-off at 2 am. Daily goal `daily_goal` = 100. Daily wheel (review: "spin the wheel") | **"Capital" mode** (`capital_data.py` docstring): height = new cards seen, **decor = age of cards** ("nobody can buy time — which makes the patina non-gameable"), level = **days of return** with square thresholds 1, 4, 9… 81 "paid in assiduity". Counts only "active" decks (≥ 4 distinct days out of 30 and a review in the last 14 days). True retention over 90 d, rendered only if the sample is large enough | No penalty read in the code; review: "doesn't give any freebies" (little to do without reviewing) |
| **Memory Forest** (1255432496) | **[code]** | One tree per day on which new cards were learned; stage = median FSRS stability (or interval): mature 21 d, old 180 d, ancient 365 d; crown = number of cards (15 / 40); turns yellow if ≥ 12 / 25 / 45% of cards are struggling, only after maturity (`forest_data.py`) | Visitors by tiers: rabbit 50 trees, deer 30-day streak, fox 10,000 reviews, owl first ancient tree, heron after a break, adult deer 100 d, hut 1 year, bear 730 d, squirrel / eagle 10,000 / 25,000 mature cards (`milestones.py`) | Reward = *real maturity* of cards; curing a leech (interval mature again) places a bird for 7 days | 3 "natures": *Peaceful* (nothing), *Wild* (smoke after 1 missed day, fire from 3 days, extinguished by 7 days of study), *Merciless* (one missed day = asteroid); everything **recomputed** from the history hence reversible (`events.py`). Backlog pile = "tumbleweeds" (Wild/Merciless) |
| **Ankimon** (1908235722) | **[code]** | Each answer deals damage to a monster; every 2 cards (`battle.cards_per_round`) a multiplier is computed **Easy = 20, Good = 10, Hard = 5, Again = 0, divided by 20** (`pyobj/ankimon_tracker.py` l.215-222): **the Easy button pays 4× Hard**; Again makes the enemy attack | `streak` reset by Again; badges at 100 / 200 / 300 / 500 cards hard-coded (`__init__.py` l.1728-1747); +200 coins at the 10th review | No reading of maturity nor retention | Damage taken if multiplier < 1; counts only live reviews (not mobile) |
| **Anki City Tycoon** (164339427) | **[code]** | **Coins per button: Again 0, Hard 1, Good 3, Easy 5** (`config.json`, `economy.py` l.66-90), per-deck multiplier (%); 1 coin per card created | "All done" bonus 25, 7-day streak 100, essential decks 50; 300 rare positive events every 200-600 reviews, one per day (`README`, `positive_events.py`); achievement tiers to be claimed by hand | Catches up reviews from another device after sync via revlog delta | **Catastrophes** if the "essential" decks are overdue (5 levels; modes off / soft / standard / harsh): damaged buildings, paid repairs, construction locked until cleanup (`lock_new_construction_until_cleanup`) |
| **Anki Farm Tycoon** (20342773) | **[code]** | Each answer makes the animals grow; product sold for money | **Streak of "Easy" = unicorn** (+ cooldown); each Again counts against the sheep (`game_widget.py` `called`); online leaderboard | none | Random epidemic (−10%); animals die if at max growth and unsold |
| **Keeps** (1217282111) | **[code]** (skim) + **[page]** description | A **new card** that durably enters review (≥ 1 day) founds a villager; when the card comes due, **the first answer of the day** settles its purse: right = +1 coin, wrong = −1, no coin left = debt; later attempts the same day do not count | Houses cost ~ what a villager has earned in total | Everything computed from `revlog` (mobile reviews count exactly the same) | **Death** of the villager if the card is not done before the end of the Anki day (+ `grace_days`); burial, mourning, house collapsing in 3-6 weeks. The `grace_days` setting exists for backlogs |
| **Life Drain** (715575551) | **[code]** | Life bar that drops continuously (100 ms timer); answering restores `recover` points (5 by default) | none | none | Optional damage on Again (disabled by default); state not persisted |
| **AnkiHabitica** (1758045507) | **[code]** + README | Points = good answers (ease ≠ 1) + bad ones ÷ `tries_eq` (2) + 15-minute "timeboxes" + learned cards ÷ `learned_eq` (2) + mature cards ÷ `matured_eq` (2); 12 points = one Habitica score (XP, gold, mana, loot, streak bonus and critical hits decided by Habitica) | Bar that **accelerates 2× after 80%** ("goal gradient" effect acknowledged in the README, which cites Chatfield) | Counts mature cards (interval) | HP loss on the Habitica side; dependence on the Habitica server |
| **Pokemanki** (633922407) | **[code]** | A Pokémon's level = average of `100×(ivl/100)^0.5` over the cards of a deck / tag; egg < 5; evolutions | none | **Pure function of the interval**: rewards maturity | none |
| **Anki Garden** (1888718775) | **[page]** | "Again, Hard, Good, Easy give the same base Growth. Choose your answer according to your recall, not the garden"; growth, coins, "Garden Finds"; fertiliser / potions consumed in *answers*, not in time | Streak achievements unlock **permanent bonuses**, "a broken streak does not remove the highest bonus" | – | "No plant decay. Keep your plants and rewards when you take a break." |
| **CollectQuest** (627746544) | **[page]** reviews | XP, 2 daily quests, shop, prestige | – | – | Review: "non-intrusive and doesn't punish, only rewards"; "spending my hoard of gold after doing all the reviews has become a highlight"; bottleneck problem (shop) after prestige |
| **Anki Royale / Casino** (606177837) | **[page]** reviews + sheet | Coins per card, mini-games, leaderboard / leagues, offline earnings | leaderboard (leagues) | – | Review: "I've studied more per day than in a last year"; others: "option to make it less gamified"; balancing costs; loot boxes with a payment bug. Mobile reviews did not count for the leaderboard (review), fixed later |
| **Anki Slot Machine** (1063262045) | **[snippet]** ("reward after correct answers") + local title | Random gain after correct answers | – | – | not read |
| **Anki Killstreaks / AnkiCraft** | **[page]** (report 2 §2); code not read | Medals on streaks of correct answers (Halo / Call of Duty) | in-session streak | – | – |
| **Puppy Reinforcement**, **Hitmarkers** | **[page]** (report 2) | Intermittent reinforcement: puppy + message every ~10 cards; "hitmarker" effect on every answer | – | – | – |
| **Review Heatmap** (1771074083) | **[snippet]** GitHub / AnkiWeb | GitHub-style activity calendar, current streak alongside, daily averages, "days learned", click on a day = cards reviewed or due | streak | – | – (purely informative feedback) |
| **Anki Habitica / Pokemanki / Garden / Tamagotchi (Dog, Cat Study Buddy)** | **[page]** | Dog fed by the number of cards of the day, becomes a ghost if a day is skipped (report 2 §2) | daily streak | – | guilt through the ghost |
| **Deckline** (1517382883) | title / keywords only | deadlines | – | – | not read |
| **Anki Empire / Realm Empires** (303879458) | **[page]** (report 2) | "Resources = reviews normalised on one's own average", games of 7-14 days, multiplayer | – | – | beta "MANY MANY BUGS" |

### 2.2 Observed strengths and flaws (with level of evidence)

| Theme | Observations | Evidence |
|---|---|---|
| **Cheating through the button** | City Tycoon pays Again 0 / Easy 5; Ankimon pays Easy 4× Hard and Again 0, with a streak unit on "not Again"; Farm Tycoon summons a unicorn on a streak of "Easy"; AnkiHabitica counts bad answers at half. All push to *lie* about the button, which distorts the scheduler (report 7 §1.2). **Anki Garden** and the rule already decided ("reward independent of the button") are the opposite | [code] except Garden [page] |
| **Drift volume > quality** | Cristal reviews: "makes u want to do even more cards than planned", "LOOK for reasons to study longer", "sometimes i force myself to do cards just to get more milk or cheese", "Just.Suspend.It" (overload), "having automatic control (not just 15 minutes a day) is better for focusing on learning and not playing instead". A user of another game: "caught myself pressing buttons without reading the cards" (quoted by Cristal's authors in their own description) | [page] |
| **Drift towards new cards** | Memory Forest, Cristal ("height = new cards seen") and Keeps (a new card = a villager) reward the introduction of new cards; Cristal limits through `NEW_TARGET_TIERS` (quotas); without a cap, one increases new cards per day until drowning one's reviews | [code] |
| **Guilt / frustration** | Keeps (death, mourning, debt), City Tycoon (catastrophes, locked construction), Memory Forest *Merciless* (asteroid for a missed day), ghost dog: all tied to absence. Memory Forest makes everything *reversible* and leaves *Peaceful* by default; Keeps offers `grace_days`; Anki Garden promises "no plant decay" | [code] / [page] |
| **Streaks** | Cristal: streak computed from the revlog (and seen as "streaks are exactly what we wanted to make easier to hold", review); Memory Forest: deer at 30 d, bear at 730 d, but the streak punishes nothing in *Peaceful*; Garden: permanent bonuses that a break does not remove. No add-on read offers jokers (report 7 proposes it) | [code]/[page] |
| **Retention as reward** | Memory Forest (tree stage = median stability), Pokemanki (level = interval), Cristal (patina = age, ≠ purchasable), AnkiHabitica (mature cards): reward the memory *result* rather than the number of clicks | [code] |
| **Robustness to mobile reviews** | "Everything recomputed from the revlog" (Memory Forest, Pokemanki, Keeps) or "revlog delta" (City Tycoon, Cristal): mobile counts. "Hook only" (Ankimon, Farm Tycoon, Life Drain): lost | [code] (report 2 §5.4) |
| **Distraction** | Ankimon: "huge, very distracting" (report 2). CollectQuest and Garden are displayed discreetly ("small progress tile", review "doesn't disturb the learning"). Cristal: "I smirked… competing in weekly arena fights" (dense gamification) | [page] |
| **Chance** | Farm Tycoon 2%/card (fair, rain, epidemic, harvest); City Tycoon 1 positive event/day after 200-600 random reviews; Puppy: every ~10 cards; Casino / Slot: loot boxes and slot machine | [code]/[page] |
| **Ethical risk** | Cristal claims "make knowledge as addictive as social media" (AnkiWeb description): the opposite of the project's rule (no timers, no notifications) | [page] |

---

## 3. Incentive mechanics in the literature

| Mechanism | Pitfall | What works | Source (status) |
|---|---|---|---|
| **Extrinsic motivation / overjustification** | *Expected* tangible rewards tied to engagement lower intrinsic motivation in free choice: d = −0.40 (engagement), −0.36 (completion), −0.28 (performance), 128 studies. Debate: Cameron & Pierce defend the absence of an effect | **Informative** (positive) feedback *increases* motivation (d = +0.33 according to report 7, not reconfirmed here); unexpected rewards; competence feedback rather than control | Deci, Koestner & Ryan 1999, *Psychological Bulletin* 125(6), 627-668 [snippet confirmed by WebSearch; PDF: depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf, not opened]. Response: Cameron, Banko & Pierce 2001 [snippet] |
| **Leaderboards, mandatory badges** | Gamified course (badges, leaderboard): lower intrinsic motivation, satisfaction and final grades than the control over a semester; suspects: social comparison and obligation | Nothing mandatory, no comparison | Hanus & Fox 2015, *Computers & Education* 80:152-161 [snippet: measures every 4 weeks over 14 weeks, null then negative effect; mandatory badges; the web summary says "leaderboard" as a possible cause] |
| **Isolated elements (points, levels, leaderboard)** | Taken separately they change neither perceived competence nor intrinsic motivation; an early version notes a *performance* gain | Make them informative ("where I stand") | Mekler et al. 2017, *Computers in Human Behavior* 71:525-534 [snippet: abstract only] |
| **Overall effectiveness** | Small, unstable effects outside the cognitive domain: g = 0.49 cognitive (k = 19), 0.36 motivational (k = 16), 0.25 behavioural (k = 9); motivational and behavioural judged less stable | Game fiction and social interaction moderate the behavioural effect; cooperation + competition better | Sailer & Homner 2020, *Educational Psychology Review* 32:77-112 [snippet; open access uni-augsburg] |
| **Context and novelty** | "Yes, under conditions": effects depend on context, on the user, and on a novelty effect that erodes | Measure over time (2 weeks then more) | Hamari, Koivisto & Sarsa 2014, HICSS-47 [snippet] |
| **Streaks and loss aversion** | According to a popular article: one may judge prolonging the streak more important than the activity itself, and those who break it drop out more often; Duolingo says it employs loss aversion (**source = company blog / secondary summary**). The figure "60% drop out after a broken streak" has no primary source found | Tolerance: Duolingo cites Penn/UCLA work according to which *a bit of slack is more motivating than rigid rules*, and quantifies the effect of two "freezes" at +0.38% active learners/day; neither freeze nor jokers exist in the add-ons read | thedecisionlab.com "Streak Creep"; blog.duolingo.com/how-duolingo-streak-builds-habit [snippets] |
| **Loss aversion (the concept)** | Contested replication: Gal & Rucker's review concludes that losses do not, in general, weigh more than gains; active debate (Simonson & Kivetz, Higgins & Liberman) | Do not base the design on an "acquired" asymmetry; prefer progression without loss | Gal & Rucker 2018, *J. Consumer Psychology* 28(3):497-516 [snippet]; Kahneman & Tversky 1979 [memory] |
| **Variable rewards (variable ratio)** | Resistance to extinction, "slot machine" behaviour; **thin** educational evidence: one study (210 players) finds better results with a schedule adapted to the player's preference, no direct variable vs fixed test on learning | Use chance on **cosmetics or narration**, never on a resource that determines progression; seed determinism (anti-reload) | Mechanism: Skinner / Ferster [memory]; review: WebSearch results (IJSG, scholarworks.uni.edu) [snippet, weak evidence] |
| **Goal gradient / endowed progress** | The bar that accelerates near the end is exploited (AnkiHabitica: ×2 after 80%); effective but manipulative | Day progress bar = honest goal (Cristal: "keeps me motivated to finish a deck", review) | Kivetz, Urminsky & Zheng 2006; Nunes & Drèze 2006 [memory]; AnkiHabitica README [code] |
| **"Honest" gamification** | Points that push towards easy activity; gaming the metric (Goodhart) | Reward the **memory result** (maturity, stability) and not apparent effort; cosmetic choices; easy stopping | Report 7 §1 (Deci, Hanus & Fox); design of the Memory Forest / Cristal Capital add-ons [code] |

**Acknowledged gap**: I opened no PDF; only search summaries and local documents were read. Deci 1999's figures (d) come from web search and are consistent with report 7. The Kivetz, Nunes & Drèze, Kahneman & Tversky, Skinner studies are cited from memory. Nothing here proves that an effect on Anki *retention* has been measured for a gamification add-on (I found no dedicated study).

---

## 4. Catalogue of possible metric → game effect links

Columns: **Metric** (with availability [P][J][R][S]); **Effect**; **Cheating** (risk: low / medium / high and why); pedagogical **Drift**; **Precedent** (add-on or source). Risks are **judgments** [deduced] unless a precedent was read.

### A. Direct resource (credit at review)

| # | Metric | Effect | Cheating | Pedagogical drift | Precedent |
|---|---|---|---|---|---|
| A1 | One answer per (card, Anki day), independent of the button ([P][J][S]) | +X of base resource | Low (one reward per card per day); suspend-reopen to regenerate not relevant | Rewards volume if uncapped | Project decision (HANDOFF); Keeps ("first answer of the day"); Garden |
| A2 | Button value ([J]+[P], [R]) | Resource ∝ button | **High**: pushes to lie about the button, distorts the scheduler | High (distorted scheduling, invisible) | City Tycoon 0/1/3/5; Ankimon ×4; Farm Tycoon (unicorn) |
| A3 | Success vs failure only (Again vs rest) ([J]+[P], [R]) | Resource for success, 0 or little for failure | Medium: avoid Again, "Good" lie | Medium (punishes honesty) | AnkiHabitica, Keeps (−1 coin on wrong) |
| A4 | Card state: new / learning / review / relearning ([P] `type`, [R]) | Different resource depending on state | Medium: fabricates "new" cards; not on review | Bias towards new cards or towards relearning | Cristal (height = new seen); Keeps |
| A5 | Maturity before answer: `ivl` before ≥ 21 d and success ([J] `scheduled_days`/`elapsed_days`, [P], [S]) | "Noble" materials | Low (calendar time is incompressible); medium with `Again`-then-catch-up | Favours old cards; may discourage letting cards age | Report 7 §1.3 rule 4; Pokemanki; Cristal patina |
| A6 | FSRS stability of the card (S) ([P], [J]) | Resource ∝ log(S) or thresholds of S | Low-medium: S depends on the scheduler; the target-retention setting can inflate it | May encourage lowering the target retention to raise S | Memory Forest (stages 21/180/365 d) |
| A7 | Stability gain per review (S after − S before) ([J] candidate, [P] diff) | Resource ∝ gain | Medium: reviewing late gives a big gain; reviewing early a small one | Pushes to delay reviews (counter-productive) | no add-on read |
| A8 | Retrievability at review time (low R = useful effort) ([P] computed, [S]) | More resource when R is low | **High**: let cards age for low R, outside the scheduler | High (disincentive to punctuality) | none; to be used as a cap only |
| A9 | Backlog cleared: `is:due` cards with `prop:due<0` processed ([P][S]) | "Catch-up" bonus | Medium: accumulate backlog to catch it up | Values accumulation | Memory Forest (tumbleweeds), City Tycoon (cleanup) |
| A10 | Lapse followed by a success (successful relearning) ([P] `lapses`+[J]) | "Repair" reward | Medium: provoke Agains | Encourages failing | Memory Forest (cured leech) |
| A11 | Leech cured: `tag:leech` whose `ivl` becomes ≥ 21 again ([S]) | Rare reward | Low | May encourage keeping badly made leeches | Memory Forest (songbird 7 d) |
| A12 | New cards introduced, capped per day ([S] `introduced:1`, [P]) | Limited resource (e.g. ≤ 20/day, independent of the deck setting) | Medium: inflate new cards; fixed cap bounds it | Drift towards learning new cards at the expense of reviews | Report 7 rule 3; Cristal quotas; Keeps |
| A13 | Cards created in the editor ([R] only; [S] `added:1`) | Coins per card added | **High**: create trivial cards | High (card quality) | City Tycoon `reward_added_card` |
| A14 | Answer time `revlog.time` ([R] only) | Resource ∝ time (capped at 60 s) or rejection of < 1.5 s | High (leave the card open); rejecting < 1.5 s is an anti-cheat filter | Penalises speed, which is a success | AnkiHabitica (15-min timebox); report 7 rule 8 |
| A15 | Total time of the day ([R]) | Resource ∝ minutes (timebox) | High | High (staying in front of the screen) | AnkiHabitica `timeboxpoints` |
| A16 | Per-deck multiplier (%) (config) | Different value per deck | Low | May steer towards a priority deck (useful, assumed) | City Tycoon `deck_reward_multipliers` |
| A17 | Diminishing returns according to the number of cards of the day ([P] count) | Concave curve (full value up to the number of dues, then root) | Low | Limits grind | Report 7 rule 3 |
| A18 | All of the day's due done (`deck_count` = 0 for learning + review) ([P]) | "Complete day" bonus | Low-medium: leave the deck set low | Well aligned; discourages increasing the load | City Tycoon `daily_completion_bonus`; report 7 rule 6 |
| A19 | Deck finished ([P]) | Deck bonus | Medium: create small decks | Low | AnkiHabitica `deckpoints` ("many decks = very slow"); Congrats Confetti |

### B. Multipliers (%)

| # | Metric | Effect | Cheating | Drift | Precedent |
|---|---|---|---|---|---|
| B1 | True retention on mature cards near the target (±5 pts) ([R] exact; [S] biased approximation) | Small weekly bonus; 100% on 50+ not rewarded | Medium: automatic "Good" gives 100% → excluded by the cap | Very aligned; sensitive to small samples (Cristal renders no retention if the sample is thin) | Report 7 rule 5; Cristal `retention_30` |
| B2 | Streak of consecutive days ([R] exact; [S] reconstructed) | Capped +% on production | Low: changing the clock does not work (Anki day); medium: one card on 1 day | Loss aversion; anxiety | Memory Forest; Cristal; City Tycoon (7 d); Garden (permanent bonuses) |
| B3 | Distinct days of return over 30/90 d ([R]) | Assiduity level (k² thresholds) | Low: real-time cost | Values regularity rather than volume | Cristal Capital |
| B4 | In-session combo (non-Again answers in a row) ([J]+[P], hook) | ×N at tiers 3/6/10/25/50/100 | Medium: do not press Again; speed | Pushes to avoid Again (lying) | Cristal; Ankimon `streak`; Farm (Easy); Killstreaks |
| B5 | Number of mature cards ([S] `prop:ivl>=21`) | Global multiplier ∝ log(mature cards) | Low-medium: import already mature decks (impossible without reviewing) | Rewards size rather than quality | Memory Forest (squirrel / eagle) |
| B6 | Coverage of a deck: share of cards seen / mature ([S]) | District bonus | Medium: import / split | Low | Cristal (coverage / `build_pct`) |
| B7 | Sum of retrievabilities = "estimated knowledge" ([P] computation; docs: "total knowledge = average retrievability × cards reviewed") | Overall power of the civilisation | Low-medium: depends on the scheduler | Aligned: measures the memory state | docs.ankiweb.net/stats (formula read) |
| B8 | Day's load completed in % | Linear bonus up to 100% | Low | Pushes to finish | Cristal `daily_goal` |
| B9 | Diversity: number of decks reviewed | Variety bonus | Low | May distract from priority decks | – |
| B10 | Deck target retention ([P] `fsrs_desired_retention`) | Cap / do not reward retentions > 97% | Medium: set 70% for little load | Useful anti-gaming | docs deck-options |

### C. Timers and time

| # | Metric | Effect | Cheating | Drift | Precedent |
|---|---|---|---|---|---|
| C1 | Anki days elapsed | Constructions advance one step per day, not per minute | Low | Favours the rhythm of spaced repetition | Keeps (5 days of construction); report 7 rule 7 |
| C2 | Age of cards ([R], [S] `added`) | Decor / patina | None (time cannot be bought) | Aligned | Cristal "patina"; Memory Forest (trees) |
| C3 | Answers made (not time) | "Fuel" consumed per answer | Low | Avoids time pressure | Anki Garden (fertiliser in answers) |
| C4 | Real time (CoC-style timers) | Production by the hour | Low but **designed to bring people back** | High: distraction, guilt | Report 7 §1.2; Cristal (offline earnings, Casino) |
| C5 | Session window (life bar, timer during review) | Pressure on speed | Medium | High (rushing) | Life Drain |
| C6 | Rollover / study day | Day cap (reset at 4 am) | Low | – | Anki (`next_day_at`) |
| C7 | Future due cards ("Future Due") | Anticipate tomorrow's load (information) | Low | Informative feedback | Anki stats |

### D. Unlocks

| # | Metric | Effect | Cheating | Drift | Precedent |
|---|---|---|---|---|---|
| D1 | Cumulative mature cards | Eras / techs | Low | Values size | Memory Forest, report 7 |
| D2 | Median stability of a set of cards ([P]) | Stage of a building / district | Low-medium | Aligned | Memory Forest `_stage` |
| D3 | Streak days or days of return | Tiered visitors / buildings | Low | May become pressure | Memory Forest (deer, bear); Cristal (squares) |
| D4 | Total reviews ([P] `reps` summed; [R]) | Badge at 100 / 10,000 | Low, but volume | Rewards volume | Ankimon (badges), Memory Forest (fox) |
| D5 | Coverage of a deck / district ([S]) | Unlocks the next district ("map of knowledge") | Medium | Aligned | Report 7 §1.1 |
| D6 | Noble material required (stone, gold) ← mature cards passed | Construction lock | Low | Aligned | Report 7 rule 4 |
| D7 | Anniversary (card introduced 1 year ago) ([S] `introduced`, [R]) | Cosmetic | None | Aligned | Memory Forest `anniversaries` |
| D8 | Population threshold / level | Unlocks buildings | Low | – | City Tycoon (unlocks by population) |

### E. Random events

| # | Metric | Effect | Cheating | Drift | Precedent |
|---|---|---|---|---|---|
| E1 | Answer (chance per card, 2%) | Drop, bonus, event | Medium: more cards = more draws; save-reload if seed not fixed | Rewards volume (lottery) | Farm Tycoon; Anki Fantasy; Puppy |
| E2 | Random target (200-600 reviews) then event | 1 gift per day max | Low (bounded) | Low | City Tycoon |
| E3 | Deterministic chance: seed = hash (card, day) | Same draws if replayed | Low | Avoids unlimited lottery | Memory Forest (SHA-1 seed per day for tree shapes, `forest_data._seed`); the scheduling JS's `ctx.seed` exists [code] but serves interval fuzz, not this |
| E4 | Daily wheel | Single random gain/day | Low | Low if cosmetic | Cristal |
| E5 | Loot boxes / slot machine | Random gain ∝ cards | Medium | **High**: gambling mechanic, guilt | Anki Royale; Slot Machine |
| E6 | Seasonal events / weather (real calendar, not cards) | Decor | None | None | Keeps; Memory Forest |
| E7 | Negative event (catastrophe, epidemic, asteroid) depending on backlog / absence | Loss of resources | Low-medium | **High**: guilt, dropout | City Tycoon; Memory Forest Wild/Merciless; Farm |
| E8 | Positive event tied to a big learning day (≥ 1.25 × the max of the previous 14 days, +2 cards) | Flowers | Medium: an exceptional "big day" | Pushes to peaks | Memory Forest (`BIG_DAY_*`) |

### F. Challenges (daily / weekly / lasting)

| # | Metric | Effect | Cheating | Drift | Precedent |
|---|---|---|---|---|---|
| F1 | Fixed daily goal (e.g. 100 cards) | Bar + reward | Medium: inflate new cards | Volume | Cristal `daily_goal` |
| F2 | "All due done" (F-A18) | Daily chest | Low | Aligned | City Tycoon |
| F3 | Simple quests (e.g. 2 per day) | XP | Medium | Variable | CollectQuest |
| F4 | Deck deadline (exam) | Planning a rhythm | Low | Useful | Deckline [title]; Cristal Capital |
| F5 | "Oldest due first" challenge ([S] `prop:due<-N`) | Bonus for handling backlogs older than a week | Medium: accumulate | Medium | – |
| F6 | Weekly retention challenge (B1) | Bonus | Medium | Aligned | Report 7 rule 5 |
| F7 | Regularity challenge (days of return over 14) | Bonus | Low | Aligned | Cristal |
| F8 | Leech challenge (cure N) | Bonus | Low-medium | Aligned | Memory Forest |
| F9 | Arena / league / leaderboard | Competition | High | **High** (social comparison; Hanus & Fox) | Cristal (arena), Casino (leagues), Leaderboard — excluded by decision |

### G. Narrative

| # | Metric | Effect | Cheating | Drift | Precedent |
|---|---|---|---|---|---|
| G1 | Event log (dates, tiers) | Textual chronicle of the civilisation | None | None | Memory Forest (`journal.py`) |
| G2 | One card = one character (new → villager) | Attachment | Medium: new cards | May push to add cards | Keeps |
| G3 | Deck = region / district; stability = prosperity | Map of knowledge | Low | Aligned | Report 7 §1.1 |
| G4 | Historical eras triggered by thresholds (D1) | Narrative thread | Low | Low | Cristal (5 eras); Evolve |
| G5 | Anniversaries, seasons | Memory recall | None | None | Memory Forest, Keeps |
| G6 | Intermittent reinforcement message (every ~10 cards) | Encouragement | Low | May distract | Puppy Reinforcement |
| G7 | Census / session recap (post-review) | Informative feedback | None | None | City Tycoon (recap); Cristal (session summary) |

### H. Penalties and losses (to document even if the project excludes them)

| # | Metric | Effect | Cheating | Drift | Precedent |
|---|---|---|---|---|---|
| H1 | Card not done in time | Death of the villager | Low | **High** (mourning, anxiety) | Keeps (with `grace_days`) |
| H2 | "Essential" deck overdue | Catastrophe | Low | High | City Tycoon (5 levels) |
| H3 | Missed days | Fire / asteroid | Low | High | Memory Forest (opt-in) |
| H4 | Speed too low | Life bar at 0 | Medium | High | Life Drain |
| H5 | Broken streak | Loss of bonus | Low | High (Streak Creep) | Duolingo; Habitica |
| H6 | Forgetting (low R, lapse) | Yellow leaves, building "to be maintained" | Low | Medium: informative | Memory Forest (yellowing, after maturity only) |
| H7 | Absence | Soft slowdown (growth stops, nothing is lost) | Low | Low | Report 7 rule 6; Garden ("no decay") |
| H8 | Jokers / grace days | Streak preserved | Low | Reduces anxiety | Duolingo (freeze); Keeps (`grace_days`); report 7 (2/week) |

### I. Immediate feedback and cosmetics

| # | Metric | Effect | Cheating | Drift | Precedent |
|---|---|---|---|---|---|
| I1 | Each answer | Sound, hitmarker, animated +coin | None | Distraction; review: "distracting" (coin after each card) | Hitmarkers; Cristal; Duolingo-style |
| I2 | Day's progress | Bar at the top of the reviewer | None | Goal gradient (see §3) | Cristal; AnkiHabitica |
| I3 | Activity calendar | Heat map + streak | None | Purely informative feedback | Review Heatmap [snippet] |
| I4 | Choice of skins / themes | Cosmetic (answer buttons, scenes) | None | Low | Cristal (button skin); Memory Forest (scenes) |
| I5 | Objects, achievements | Collection | Low | Low | Anki Garden (achievements, troph.) |

### J. Social / external (reminder: excluded by decision, for the record)

Leaderboard (Leaderboard, Ankimon, Farm), multiplayer and raids (Ankimon, Realm), Discord Rich Presence (Cristal, Ankimon), Habitica. Risks: cheating through score import (hard-coded Supabase key and plaintext password in Farm Tycoon: [code]), telemetry (Cristal `telemetry_enabled`), network dependence.

### K. Economy

| # | Metric | Effect | Cheating | Drift | Precedent |
|---|---|---|---|---|---|
| K1 | Price indexed on history | Cost of a house ≈ what a villager has earned | Low | Controlled inflation | Keeps |
| K2 | Taxes | Daily levy on wealth | Low | Low | Keeps ($ button) |
| K3 | Prestige / reset | Start over with a bonus | Low | Bottlenecks (CollectQuest reviews) | CollectQuest |
| K4 | Replay of the real revlog history to balance | Balancing before the 1st game | – | – | Report 7 rule 9 |
| K5 | "infinite_coins" mode, demo | Debugging | – | – | Keeps (config) |

---

## 5. Open points (to verify before relying on them)

1. Is `memory_state` actually filled in the `again/hard/good/easy` candidate states received by the JS? (proto: optional field; [doubt]) — test to be done in AnkiDroid.
2. Exact meaning of `revlog.factor` under FSRS; `revlog` does not contain S/D. [doubt]
3. `ease = 0` on legitimate mobile reviews (Cristal comment): to be tested with S7 of report 7.
4. Report 7 mentions `rated:N` limited to 365 days: contradicted by the code (`parser.rs`: no cap); to be corrected in report 7.
5. Order of `deck_count`: [lrn, rev, new] (code) versus report 4. To be corrected in report 4.
6. Real effectiveness on Anki retention of any gamification add-on: **no study found**. The two-week test measured in the revlog (report 7) remains the only way.
7. Add-ons not read in code: Killstreaks, Puppy, Hitmarkers, Anki Garden, CollectQuest, Casino, Slot Machine, Deckline, StreakGuard. Descriptions and reviews [page] or title only.
8. I did not re-read Ankimon beyond `on_review_card` and `calc_multiply_card_rating`: XP and captures not detailed.

## 6. References

Local: `HANDOFF.md`; `project-docs/{1-mobile,2-gamification,4-portage,7-architecture}.md`; `work/portage/Anki-Android/api/src/main/java/com/ichi2/anki/FlashCardsContract.kt`, `AnkiDroid/src/main/java/com/ichi2/anki/provider/CardContentProvider.kt`; `work/portage/anki/{proto/anki/scheduler.proto, proto/anki/stats.proto, rslib/src/search/{parser,sqlwriter}.rs, rslib/src/stats/{card.rs,today.rs,graphs/retention.rs}, rslib/src/revlog/mod.rs, rslib/src/scheduler/answering/revlog.rs, ts/reviewer/answering.ts, pylib/anki/collection.py}`; `work/gamif/…` (files cited in the text); `work/gamif/aw/info_*.bin`.

Web (WebSearch, no Google named, no Reddit):
- docs.ankiweb.net: https://docs.ankiweb.net/stats.html ; https://docs.ankiweb.net/deck-options.html (read); https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm (search result, DSR) [snippet]
- Deci, Koestner & Ryan 1999: https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf [snippet]
- Hanus & Fox 2015: summary via https://link.springer.com/article/10.1186/s41239-021-00314-6 and https://www.smhp.psych.ucla.edu/pdfdocs/gamil.pdf [snippets]
- Mekler et al. 2017: https://edoc.unibas.ch/32047/ [snippet]
- Sailer & Homner 2020: https://link.springer.com/article/10.1007/s10648-019-09498-w ; https://opus.bibliothek.uni-augsburg.de/opus4/files/109056/109056.pdf [snippet]
- Hamari et al. 2014: https://research.aalto.fi/fi/publications/does-gamification-work-a-literature-review-of-empirical-studies-o/ [snippet]
- Duolingo: https://blog.duolingo.com/how-duolingo-streak-builds-habit ; https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification [snippets]
- Gal & Rucker 2018: https://papers.ssrn.com/abstract=3049660 [snippet]
- Review Heatmap: https://github.com/glutanimate/review-heatmap ; https://ankiweb.net/shared/info/1771074083 [snippet]
- Variable rewards: https://journal.seriousgamessociety.org/index.php/IJSG/article/view/47 [snippet]
