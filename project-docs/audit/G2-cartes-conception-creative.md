# G2 - Creative design: linking Anki cards to Evolve's gameplay

Date: 2026-10-16. Read-only (no command executed except `grep`/`sed`). Nothing was launched: everything is **deduced from the code** or **speculative**, and marked as such.

Sources read: `HANDOFF.md`, `project-docs/2-gamification.md` (Cristal Memoria, Memory Forest, Keeps, Dog Study Buddy...), `project-docs/7-architecture.md` (§1.3 anti-cheat rules, §2 measurements on the phone), `project-docs/audit/SYNTHESE.md`, `E1-evolution-mecanique.md`, the `src/` code (resources.js, actions.js, tech.js, jobs.js, events.js, main.js). `G1-cartes-etat-de-l-art.md` did not exist at the time of writing: I rely on `2-gamification.md`.

## 0. Framework, legends and what Evolve really offers

**Available card data** (according to 7-architecture):
- **[phone]** on AnkiDroid, via the ContentProvider: `reps`, `lapses`, `interval`, `due`, `fsrs_stability`, `fsrs_difficulty`, `last_review_time_secs`, `custom_data`; the pressed button via the per-button `customData` trick (spike S2, **to be verified**). **No `revlog`, no answer time.**
- **[PC]** via the `revlog` after sync: exact button, `time`, review type. Exact but deferred.
- An idea marked [PC] cannot be "real time" on the phone; it is settled at catch-up.

**Rules already decided** (reminder, all ideas respect them): one reward per (card, day); the **base** does not depend on the button; diminishing returns; noble materials only for mature cards (interval before answer >= 21 d); no leaderboard nor notification; nothing is lost, only growth slows down.

**Evolve's real levers (code)**:
- Era 0: actions `rna` (click +1), `dna` (2 RNA -> 1 DNA), `membrane`, `organelles`, `nucleus`, `eukaryotic_cell`, `mitochondria`, then `sexual_reproduction` (150 DNA) -> `phagocytosis` (175) -> `multicellular` (200) -> `bilateral_symmetry` (230) -> `mammals` (245) -> `humanoid` (260) -> `sentience` (300 RNA + 300 DNA) -> `human` choice (320+320). The RNA/DNA caps (membrane +5, eukaryotic_cell +10) limit what can be paid; organelles and nucleus produce **passively** (`main.js:1236-1248`, `time_multiplier = 0.25`).
- Era 1: resources Food, Lumber, Stone, Furs, Copper, Iron, Cement, Coal, Steel, Money, Knowledge, Crates; primitive techs `club`, `bone_tools`, `wooden_tools`, `sundial`, `wheel`; civilized `housing`, `cottage`, `agriculture`, `farm_house`, `irrigation`, `silo`, `mill`, `currency`, `market`, `trade`, `banking`, `science`, `library`, `mining`, `iron_mining`, `coal_mining`, `smelting`, `steel`, `foundry`, `artisans`, `theatre`, `garrison`, `hospital`, `cement`, `black_powder`, `monument`, `urban_planning`, `government`...
- Jobs (`jobs.js:373-401`): unemployed, farmer, lumberjack, quarry_worker, miner, coal_miner, craftsman, cement_worker, entertainer, professor, scientist, banker, priest...
- Systems: population/housing (`basic_housing`, `cottage`, `apartment`), **morale** (`global.city.morale`, with sub-keys such as `unemployed`, `stress`, `blood_thirst`; a key can be added), **calendar** (`calendar.day/season/year/weather/temp`, `main.js:11778-11815`), **three neighbours** (`civic.foreign.gov0..2`: hostility `hstl`, spies `spy`, trade), **events** (`events.js`: `inspiration`, `motivation`, `fire`, `mine_collapse`, `raid`, `siege`, `pillage0..3`, `tax_revolt`, `protest`, `heatwave`, `coldsnap`, `dark_cloud`, `gloom`, `pet`, `spy`, `ruins`...).
- Existing hook: `window.ankiCredit(res, amount)` (`main.js:12988`), goes through `modRes` so it respects the caps, returns 0 if the resource is not displayed.

**Legend**: S/M/L = complexity (S: < 1 evening; M: a few evenings; L: more than two weeks). "Duration" = what the idea adds to the game's longevity. **[spec]** = speculative, never tested; **[deduced]** = concluded from the code read.

**Deliberate difference from Cristal Memoria** (state of the art taken from `2-gamification.md`): Cristal is a thin client on a proprietary server, with a daily wheel (variable reward), classic streaks, a "Capital" deck goal. We differ through: (1) offline, replayable state; (2) **game time is card time** ("nothing moves if you do not review" becomes an engine rule, not a slogan); (3) the streak never breaks; (4) memory statistics are not displayed as graphs but **embodied** in the world (climate, river, fog); (5) we keep the depth of a real incremental (Evolve) instead of a housing estate.

---

## 1. The 26 ideas, by family

### Family T - Time and the structure of the game

**T1. The Card Clock** (time only passes through reviews)
- Principle: Evolve's calendar no longer advances in real time: 1 "game day" = N credited cards (e.g. 6; **hypothesis**). The seasons (`calendar.season`) therefore follow one another as reviews go by, passive production is cut (multiplier 0 on time) and each card triggers a proportional production "mini-tick".
- Metric: number of (card, day) rewards of the day [phone]; nothing else.
- System touched: `calendar.day/season/year`, all gains of Food, Lumber, Stone, Furs, Money, Knowledge (via ticks), Food consumption and fur heating in winter.
- Feel: the village "breathes" with every answer; closing the app freezes the world, no guilt or urgency.
- Cheating: multiplying cards (adding 500 trivial cards). Counter: daily cap on credits (diminishing returns already decided) and cap on credited new cards.
- Pedagogical risk: low; slight bias "making cards to advance time" (soften through concavity).
- Complexity: M (the worker of `main.js:844-876` must be wired to a manual tick). Duration: it is the **basis** of everything else.

**T2. Population = learned cards** (dormant villagers, never dead)
- Principle: each card that crosses a maturity threshold (interval >= 7 d then 21 d) is "born" as an inhabitant. The population cap depends on learned cards, not only on houses. If a card falls back (lapse), the inhabitant **sleeps** (stays in their house, no longer works) and wakes at the next review. Nothing dies, unlike Keeps.
- Metric: `interval` and `lapses` [phone].
- System touched: total population, `basic_housing`, `cottage`, `apartment` (caps), jobs (`farmer`, `lumberjack`, `quarry_worker`, `miner`, `scientist`, `banker`), morale (unemployment, `unemployed`).
- Feel: "my knowledge is people"; you see your memory populate the village.
- Cheating: creating and maturing dummy cards; resetting then relearning to "recultivate". Counter: one inhabitant per card only once, caps on births/week, a reset card is not reborn.
- Pedagogical risk: medium ("I no longer want difficult cards" = fear of failure). Soften: sleep, never die.
- Complexity: L (Evolve's population growth is intertwined with Food, housing, caps). Duration: very long (months, since the cap follows real memory).

**T3. Rites of passage** (eras as small optional trials)
- Principle: crossing `sentience` (era 0 -> 1) or the border towards `discovery` requires, besides resources, a "rite": a batch of 15 to 20 mature cards due that day, to be passed at ~85%. Stress-free alternative offered: accumulate a number of study days (player's choice). Never permanently blocking.
- Metric: exact button on the day's mature cards [phone via customData, or PC].
- System touched: `sentience` (actions.js:869), `tech.evo`, era transition, `inspiration` event.
- Feel: ceremony, strong moment; progression has clear "steps".
- Cheating: pressing Good without thinking (the button counts here). Counter: only genuinely due cards (chosen by Anki), low threshold (80%), never a reward above the base; failure costs nothing.
- Pedagogical risk: high (exam stress, button honesty bias). **Optional**, disabled by default. [spec]
- Complexity: M. Duration: moderate (structure, not volume).

### Family B - The Again / Hard / Good / Easy buttons (without touching the base)

**B1. Chronicle of the four voices**
- Principle: the amount does not change, but the **text** of Evolve's log (`messageQueue`) changes according to the button: Again = "the fire flickered, but did not weaken"; Hard = "the hands are heavy"; Good = "the gesture is sure"; Easy = "we forgot that we knew" (and suggests moving the card to a long interval). Varied lines, no numbers.
- Metric: button [phone customData] or [PC].
- System touched: the message log, nothing economic.
- Feel: every answer is acknowledged, including failure, without judgment.
- Cheating: none (no value). Pedagogical risk: none; may reinforce honesty (not being scolded for Again).
- Complexity: S. Duration: 0 (colour only). Very good cost/effect ratio.

**B2. Fertile ashes** (lapses on mature cards feed the fields)
- Principle: a lapse on a mature card is not a failure, it is fertiliser: the lapse is counted as a "compost pile" that raises Food yield for a few game days (echo of Evolve's `compost` and `mulching`). Cap: fertiliser never exceeds the value of a good answer.
- Metric: `lapses` increasing on a card with interval >= 21 d [phone, deduced from the variation].
- System touched: Food (`farmer`, `farm`, `mill`, `compost`, `agriculture`).
- Feel: forgetting becomes useful; less shame.
- Cheating: failing on purpose for fertiliser. Counter: low daily cap, the lapse must be "real" (real interval before >= 21 d, time >= 3 s on the PC side), and the gain never exceeds that of a success.
- Pedagogical risk: medium (valuing error); justified by the idea of productive error, but to be dosed. [spec]
- Complexity: S/M. Duration: low.

**B3. Seed and harvest** (the reward ripens in the future)
- Principle: on the day of the review, a "seed" is planted on the card (base reward, independent of the button, already paid). At the **next** review of this card (days later), if it is passed, the seed "blooms" and gives a small supplement: the bonus therefore does not depend on the day's button but on the real **future success**.
- Metric: state of the card at the next review (lapse or not) [phone].
- System touched: Food/Lumber (young cards) or Copper/Iron/Cement (mature), via `ankiCredit`.
- Feel: waiting, a garden you come back to; feeling of "what I learned held".
- Cheating: pressing Good wrongly so the card is "passed". Counter: the harvest is based on the evolution of FSRS stability, not on the button, and caps at +30% of the base. The button then has no computable value; the incentive-to-cheat risk is low but not zero. [spec]
- Pedagogical risk: low. Complexity: M. Duration: medium.

**B4. The market of confidence bets**
- Principle: before flipping a card, one can (optionally) mark it "sure / uncertain". The result is compared with the answer: well calibrated earns a bit of Money, poorly calibrated costs nothing (the stake is symbolic). Trains metacognition (knowing what you know), a real learning technique.
- Metric: prediction + button [phone via customData; requires a UI on the question side].
- System touched: Money (`currency`, `market`, `banking`, `trade`), market event.
- Feel: inner poker game, very playful.
- Cheating: lying about the prediction or always saying "sure" and Good. Counter: proper scoring rule (Brier) where the best strategy remains honesty; bounded gain; the option stays optional.
- Pedagogical risk: medium (distraction of one more step); possible benefit if honest. **Very speculative.**
- Complexity: L (change of the card UI). Duration: low (a seasoning, not a base).

### Family R - Retention and partial statistics

**R1. The river of memory**
- Principle: a "river" at the edge of the village whose level follows the real retention of mature cards over the last 30 days (e.g. 80% -> 95%). High level: generous irrigation, Food bonus; low level: no penalty, simply no bonus (the river stays at its base bed, never dry).
- Metric: rolling retention rate (success/(success+lapse)) [PC exact; approximated on the phone by `lapses` vs `reps` on mature cards].
- System touched: Food (`farm`, `irrigation`, `farm_house`, `mill`), tech `agriculture`.
- Feel: the quality of learning is visible in the landscape; a "good river" is a pride without a number.
- Cheating: choosing easy cards or pressing Good. Counter: bound the bonus to +20%, do not reward 100% on 50+ reviews (rule 5 of report 7), target retention rather than maximal.
- Pedagogical risk: medium (aiming for 100% instead of optimal retention); the "85-93% target band" counter reduces it.
- Complexity: M. Duration: long (permanent effect to maintain).

**R2. Seasons and the week's climate**
- Principle: the weather in the village (`weather`, `temp`, events `heatwave`, `coldsnap`, `dark_cloud`, `gloom`) follows the weekly balance: a week with retention in the target band gives a clear sky and a small production bonus; a weaker week gives a grey sky that only removes this bonus. The game year flows through cards (T1) and the current season colours the theme (winter: Furs consumed for heating, summers: harvests).
- Metric: weekly retention + number of days studied [PC / phone approximation].
- System touched: `calendar.season/weather/temp`, Food, Furs, morale (`stress`).
- Feel: poetic, does not induce guilt (the weather changes, it is not a punishment).
- Cheating: as R1. Counter: same bounds.
- Pedagogical risk: low. Complexity: M. Duration: medium.

**R3. The fog of the forgotten**
- Principle: each card that has become fragile (low FSRS retrievability, or overdue by more than N days) thickens a "fog" on the world map; each successful review dissipates a little and reveals a **region** with its hidden resources (deposits of Copper, Iron, Coal, Cement). The fog is cosmetic: it destroys nothing, it masks.
- Metric: retrievability computed from `fsrs_stability` and `last_review_time_secs` [phone].
- System touched: exploration/deposits (`mining`, `iron_mining`, `coal_mining`), access to noble resources.
- Feel: you clear a territory, recover what you had forgotten; very motivating for coming back after a break.
- Cheating: suspending forgotten cards to clear the fog. Counter: suspended cards count as "frozen mist", not as dissipated.
- Pedagogical risk: low. Complexity: L (cartographic rendering of a textual game + region model). [spec] Duration: long.

**R4. The time bank** (days of future forgetting spared)
- Principle: each successful review pushes back the next one; this interval gain (log of the interval ratio) is "time gained". It is deposited in the bank (`banking`) and produces Money at compound interest; the more solid the memory, the more the capital grows.
- Metric: `interval` before/after, or delta of `fsrs_stability` [phone].
- System touched: Money, `bank`, techs `banking`, `investing`, `bonds`.
- Feel: "my learning is an investment"; visible compounding.
- Cheating: pressing Easy for big intervals. Counter: FSRS stability is used (computed by the algorithm, not by the button alone), daily cap, concave curve.
- Pedagogical risk: medium (false incentive to Easy). [spec]
- Complexity: M. Duration: long.

**R5. The vigil** (attention time becomes knowledge)
- Principle: the real total answer time, capped at ~30 s per card, feeds Knowledge via the `library`: the village's "vigil". Answers < 1.5 s do not count (rule 8). No reward for speed: it is sustained attention that counts.
- Metric: `revlog.time` [PC only; unavailable on the phone].
- System touched: Knowledge (`science`, `library`, `thesis`, `research_grant`, `scientist`, `professor`).
- Feel: "I studied, therefore I learned"; no race against the clock.
- Cheating: leaving the card open. Counter: cap per card and per day. Pedagogical risk: low. Complexity: S (PC) / unavailable on mobile: so the phone version is a simple card count. Duration: medium.

**R6. The harmony of the districts** (distribution between decks makes the morale)
- Principle: the balance of work between decks (entropy over 7 days) determines a harmony gauge, added to morale (`global.city.morale.anki`). A village that neglects a district is not punished; it does not receive the harmony bonus.
- Metric: number of cards per deck over 7 days [phone via deck_id].
- System touched: morale (hence production), `entertainer`, `theatre`, events `protest`, `tax_revolt` (avoided rather than caused).
- Feel: you seek to balance; encourages neglected small decks.
- Cheating: fabricating small dummy decks. Counter: minimum threshold of mature cards per deck.
- Pedagogical risk: low. Complexity: M. Duration: medium. [spec]

**R7. Saplings and oaks** (young vs mature cards, permanent maturation)
- Principle: **young** cards (< 21 d) feed the base resources (Food, Lumber, Stone, Furs); **mature** cards (>= 21 d) the noble materials (Copper, Iron, Cement, Coal, Steel). When a card crosses 21 d, it "plants an oak": a tiny **permanent** bonus (+0.05% to a production), never lost even if the card falls back later.
- Metric: `interval` before answer [phone].
- System touched: the whole resource chain, tech `mining`, `smelting`, `steel`.
- Feel: cumulative and safe; long-haul efforts do not evaporate.
- Cheating: artificially boosting the interval. Counter: one maturation per card once and for all, weekly cap.
- Pedagogical risk: low (rule already in the decisions). Complexity: M. Duration: very long, it is the backbone of the long term.

### Family D - Decks as societies

**D1. Each deck is a job / a tribe**
- Principle: the user associates a deck with an Evolve job (e.g. "Anatomy" -> `scientist`, "Languages" -> `professor`, "Law" -> `banker`, "Chemistry" -> `miner`). Cards of this deck boost the production of that job. Association modifiable once a week.
- Metric: `deck_id` of the card [phone].
- System touched: `jobs.js` (farmer, lumberjack, quarry_worker, miner, coal_miner, craftsman, scientist, professor, banker...).
- Feel: each subject has an identity; you see your tribes prosper.
- Cheating: putting the easiest deck on the most lucrative job. Counter: diminishing returns per deck and per day, job caps, weekly change.
- Pedagogical risk: low. Complexity: M. Duration: medium/long.

**D2. The three neighbours are three decks (embassies)**
- Principle: Evolve has three neighbours (`civic.foreign.gov0..2`) with hostility (`hstl`), spies and trade. Three chosen decks become three embassies: reviewing the deck lowers the hostility of the associated neighbour and unlocks its exchanges (`trade`, `market`, trade routes); without review, nothing happens (no punitive attack).
- Metric: cards of the deck reviewed over 7 days [phone].
- System touched: `civic.foreign`, `hstl`, `trade`, `spy`, `diplomacy`, events `raid`, `siege`, `pillage`.
- Feel: diplomacy; strong, original narrative effect.
- Cheating: choosing short decks. Counter: gain as a function of the fraction of due cards done.
- Pedagogical risk: low. Complexity: M/L (touches the game's war/diplomacy). [spec] Duration: long (Evolve has a big military dynamic).

### Family S - The streak (the flame)

**S1. The living flame** (continuous warmth, never extinguished)
- Principle: the streak is not a day counter that falls back to zero: it is a **warmth** (0 to 100). Each studied day raises it, each missed day lowers it gently (-5% of the level), with an "ember" floor that never goes out. Warmth gives a logarithmic bonus of +0 to +15% on Food, Lumber, Stone (tied to fire, `lodge`s, winter heating with Furs).
- Metric: days studied [phone].
- System touched: moderate global bonus, Furs in winter, morale.
- Feel: you tend a fire, not a debt; coming back is always easy.
- Cheating: 1 card per day to keep the flame. Counter: reasonable minimum threshold (10 cards) and warmth only yields a modest bonus.
- Pedagogical risk: low. Complexity: S. Duration: medium.

**S2. Stored rest days and homecoming feast**
- Principle: every 6 studied days, one earns a "rest day" (max 3 in reserve) consumed automatically when a day is skipped (the equivalent of the jokers of report 7, rule 6). After an absence of >= 3 days, a "traveller's return" event (at most every 14 days) offers a one-off bonus proportional to the work actually redone that day, with a warm text.
- Metric: days studied + number of cards on the return day [phone].
- System touched: events `inspiration`, `motivation`, morale, a bit of Money.
- Feel: coming back is a feast; removes the "what-the-hell effect" after a break.
- Cheating: being absent to collect the feast. Counter: cap every 14 days, bonus tied to cards done.
- Pedagogical risk: medium (inciting to skip); contained by the caps. Complexity: S. Duration: medium.

**S3. The braid of weeks**
- Principle: instead of consecutive days, count the **weeks** with >= 4 days studied. Each tier (4, 8, 12, 26, 52 weeks) places a **permanent monument** (`monument`, `amphitheatre`/`theatre`) that never disappears, and which remains even if the braid is interrupted (it simply restarts at 0 for the next tier).
- Metric: days studied per week [phone].
- System touched: tech `monument`, cultural buildings, morale.
- Feel: durable, visible milestones; no loss.
- Cheating: minimal. Pedagogical risk: low. Complexity: S/M. Duration: very long (tiers over a year).

### Family M - A living world

**M1. The bestiary of difficult cards** (taming the "leeches")
- Principle: a card that has failed a lot (`lapses` >= 4, or leech tag) is a "monster" prowling at the edge of the village. Each review visibly weakens it; when it passes the 21 d interval, it is **tamed** and becomes a pet (echo of the `pet` event) giving a small bonus of Furs or Food. No damage effect as long as it is not tamed.
- Metric: `lapses`, `interval` [phone].
- System touched: Furs, `pet`, `raid` events (the beast can be avoided), `hunter`.
- Feel: you want to look after your painful cards, which is exactly the right practice.
- Cheating: modifying the card without learning it. Counter: taming requires an interval >= 21 d after the last lapse. Bonus idea: modifying the card's text (the "rewording") triggers a "training" that reduces the monster by one notch (once per card).
- Pedagogical risk: very low, rather positive (addresses the real leech problem). Complexity: M. Duration: long.

**M2. Excavations** (reviewing very late yields relics)
- Principle: a mature card left unreviewed for a long time (>= 90 days) then passed reveals an "excavation site": a relic that gives a boost of Knowledge or of a noble material, proportional to the logarithm of the delay (capped). Echo of Evolve's `ruins` and `archaeologist` job, but **flagged**: `events.ruins` requires the `ancient_ruins` trait; a version of its own to the fork will be needed.
- Metric: `last_review_time_secs` and `interval` [phone].
- System touched: Knowledge, Crystal, Copper/Iron.
- Feel: rediscovery of old knowledge, sense of adventure.
- Cheating: letting cards pile up for big excavations. Counter: delay capped at 180 days and diminishing returns; "overdue" cards are due anyway, so there is little push to cheat.
- Pedagogical risk: medium (one may be tempted to postpone). [spec]
- Complexity: M. Duration: medium.

**M3. The steles** (the best-known cards are engraved in the village)
- Principle: cards with very high stability (or interval >= 180 d) become **steles**: an engraved line (the start of the question) in a register of the village (the museum). Display only, but they can be reread when visiting. The player's own words, no invented text.
- Metric: `fsrs_stability`, `interval` [phone].
- System touched: log text, cultural building (`theatre`, `monument`), morale (+).
- Feel: "everything I know is engraved there"; tangible pride.
- Cheating: none notable. Pedagogical risk: low (positive reinforcement). Complexity: S/M. Duration: slow accumulation, very long.

**M4. The monument of memory** (one-year-old cards = bricks of the wonder)
- Principle: each card whose interval exceeds 365 days adds a brick to a great monument (fraction of the tech `monument`). Big project of several months; each tier of bricks unlocks a building effect.
- Metric: `interval` >= 365 [phone].
- System touched: building `monument`, Cement, Stone, Steel.
- Feel: very long-term goal. Cheating: minimal, since the calendar is incompressible. Pedagogical risk: very low. Complexity: M. Duration: stretches up to a year.

### Family E - Events and narrative

**E1. Card hazards** (village events without penalty)
- Principle: at the opening of a session, an Evolve event is drawn (seed = Anki day): `fire`, `mine_collapse`, `raid`, `heatwave`, `inspiration`, `motivation`, `pet`. A small challenge is displayed: "Fire! 12 cards to save half of the day's Lumber". Succeeding gives a bonus; failing removes **nothing** (at worst, no bonus is received). No notification: the event exists only within a session.
- Metric: number of cards done in the session [phone].
- System touched: Evolve events, Lumber, Stone, Food, morale.
- Feel: variety, a little adrenaline rush, never a loss.
- Cheating: restarting the session to replay the draw. Counter: seed fixed by the day.
- Pedagogical risk: low. Complexity: M. Duration: medium (it brings renewal).

**E2. The evening mail** (diegetic weekly summary)
- Principle: once a week, a "village advisor" writes a short prose text (no graphs): days studied, cards matured, beasts tamed, new steles, and advice drawn from the real summary (e.g. "your anatomy cards are wavering: one more review per week would consolidate them"). No notification: it is read when opening the game.
- Metric: all stats [PC for accuracy, phone for the essentials].
- System touched: log/messages (`messageQueue`), light morale.
- Feel: you feel accompanied; replaces dashboards.
- Cheating: none. Pedagogical risk: low, positive. Complexity: S/M. Duration: low.

**E3. Eras as chapters of a saga** (reading rite)
- Principle: at each Era tier (see T3 for the optional trial), a saga chapter unlocks, written from the player's decks ("the Anatomists joined the Valley..."). Variations according to active decks.
- Metric: active decks [phone]. System touched: log, era.
- Feel: narrative sense. Cheating: none. Pedagogical risk: none. Complexity: S (text). Duration: 0 (reward).

---

## 2. Ranking: the 8 best ideas

| Rank | Idea | Why |
|---|---|---|
| 1 | **T1 Card Clock** | It is the condition for the game to advance through reviews, not through time. Removes the temptation to leave it running, and gives meaning to "nothing moves if you do not review". Low cost, enormous systemic effect. |
| 2 | **R7 Saplings and oaks** | Backbone of the long term: directly links card maturity to noble materials (rule already decided) and adds permanent bonuses that are never lost. |
| 3 | **M1 Bestiary of difficult cards** | The most original and most beneficial idea: turns Anki's no. 1 problem (leeches) into a game, with a real pedagogical practice (rewording). |
| 4 | **S1 + S2 Living flame and rest** | Answers precisely "tend the flame without guilt": floor, logarithmic warmth, homecoming feast. Low cost. |
| 5 | **R1 River of memory** | Embodies retention in the world without making it a score to maximise, with a target band. Natural link with Food/agriculture. |
| 6 | **S3 Braid of weeks + M4 Monument** | Permanent milestones over several months, perfect for duration (weeks to months) without penalty. |
| 7 | **D2 The three neighbours** | Exploits a native Evolve system (3 neighbours, hostility, trade) in an unexpected way; gives decks a role. Risk: touches diplomacy. |
| 8 | **B1 Chronicle of the four voices** | Nearly free, handles the buttons without ever distorting the reward. Excellent first step. |

Optional menu: T2 (population = cards) is spectacular but L; R3 (fog) is very beautiful but requires rendering; B4 (bets) and T3 (rites) are the riskiest pedagogically.

---

## 3. Three coherent combinations

### Combination A - Cautious: "The village that listens" (S/M)
Ideas: **T1 Card Clock + R7 Saplings and oaks + S1 Living flame + S2 Rest and return + B1 Chronicle + E2 Evening mail**.
System: time advances through cards; young cards -> base resources, mature cards -> noble materials; the flame gives a small bonus; the log acknowledges each button; a weekly mail gives a summary. Almost no pedagogical risk; everything is feasible with the phone's data (except R5, unused).

### Combination B - Ambitious: "The three rivers" (M/L)
Ideas: **T1 + T2 Population = cards + R1 River + R7 + D1 Decks = jobs + S3 Braid + M4 Monument**.
System: inhabitants are born from learned cards (dormant if they fall back); each deck is a job; the retention river and the maturations give production bonuses; the braid and the monument hold the progression over the year. Coherent game "my memory is my village". Main complexity: Evolve's population (T2) and the deck -> job routing (D1).

### Combination C - Mad: "The bestiary of the fog" (L, speculative)
Ideas: **R3 Fog + M1 Bestiary + R2 Climate + B4 Bets + D2 Embassies + M3 Steles**.
System: fragile memory thickens a fog that hides deposits; difficult cards are beasts to tame; the climate follows the week's retention; three decks are three diplomatic neighbours; you bet on your own knowledge at the market; the best-known cards become steles. Very rich but touches rendering, diplomacy and the card interface: to be attempted only after a real test of combinations A/B.

---

## 4. Worked example of pacing over 8 weeks (combination A)

**All figures are hypotheses**, not measurements: the game has never been launched, and the reward scale is not yet fixed. To be tuned by replaying a real history (report 7, rule 9).

Starting hypotheses:
- A base credit per card (diminishing returns); 1 credited card = 8 RNA-equivalent units in era 0 (**hypothesis**).
- Total cost of era 0 ~ 9,000 RNA-equivalents (sum of the techs 150+175+200+230+245+260 DNA, sentience 300+300, species choice 320+320, plus the counters membrane/organelles/nucleus/eukaryotic_cell/mitochondria, at 2 RNA for 1 DNA) -> about 1,100 credited cards.
- Era 1: 1 young card ~ 3 units of Food/Lumber/Stone; 1 successful mature card ~ 1 noble unit (Copper/Iron/Cement); one Knowledge tier per ~150 cards (hypothesis).

| Week | Cards/day (assumed) | Cumulative cards | Resources / events (hypothetical) | Progress |
|---|---|---|---|---|
| 1 | 40 | 280 | RNA/DNA: membrane, organelles; flame 7 days | Era 0: ~25% (up to `sexual_reproduction`) |
| 2 | 60 | 700 | `phagocytosis`, `multicellular`; oaks: none (cards too young) | Era 0: ~65% |
| 3 | 70 | 1,190 | `mammals`, `humanoid`, `sentience`; `human` choice at the end of the week | **Era 0 finished** (~wk. 3) |
| 4 | 70 | 1,680 | Food/Lumber/Stone, first mature cards (21 d): Copper; `sundial` (day 1 of the calendar), `wooden_tools` | Era 1: start, `basic_housing`, `club` |
| 5 | 75 | 2,205 | `agriculture`, `farm`, `cottage`; Money via `currency`; 1st braid tier (4 weeks) | Era 1: ~10% |
| 6 | 75 | 2,730 | `science`, `library`: Knowledge (~40); `mining`, `iron_mining`; river/flame bonus ~ +8% | Era 1: ~18% |
| 7 | 80 | 3,290 | `smelting`, `market`, `trade`, `theatre`; cumulative oak bonuses ~ +1% | Era 1: ~27% |
| 8 | 80 | 3,850 | `banking`, `foundry`, `coal_mining`; 8-week braid (monument) | Era 1: ~35%; steel and black powder remain several months away |

Reading: about 3,850 cards in 8 weeks; era 0 in ~3 weeks, era 1 partial; the whole of era 1 (up to black powder/`discovery`) would require **15,000 to 25,000 cards** (~4 to 6 months at 70-80 cards per day): this matches "weeks or months". All these values must be recalibrated.

---

## 5. Changes to plan in Evolve

### Common base for any combination (already partially done)
1. `window.ankiCredit(res, amount)` exists (`main.js:12988`). Add: `window.ankiState` (read-only view of the exposed state: visible resources, day, season), `window.ankiDay(n)` (advances the calendar), and a persistent object `global.anki` (counters, flame, maturations, inhabitants) saved with the game.
2. **Cut passive production**: the simplest is a multiplier `global.anki.passive` (0 to 1) applied where `fastLoop` (`main.js:882`) produces via `time_multiplier` and `webWorker.mt`. **To be verified in the code**: only the evolution's `time_multiplier` (`main.js:1216`, 0.25) is confirmed here, I did not re-read all of `fastLoop`. In era 0: set to 0 the passive gain of `organelles` and `nucleus` (`main.js:1233-1248`).
3. The worker (`evolve/evolve.js`, `main.js:844-876`) must switch to "manual tick" mode for T1.
4. The RNA/DNA and stock caps (`membrane`, `eukaryotic_cell`, `storage`) must remain; credits go through `modRes` (respects the caps).
5. The interface must show the gain after each card (card HUD, report 7 §2.1).

### Combination A (cautious)
- T1: wire `calendar.day++` (`main.js:11778`) to a card counter, cut the real-time tick, call `ankiDay`.
- R7: card -> resource conversion table (young vs mature), counter `global.anki.oaks` -> a global multiplier in `production`/`prod.js`.
- S1/S2: variable `global.anki.heat`, bonus in the Food/Lumber/Stone production calculations, `inspiration` event triggered on return.
- B1: texts in `strings/strings.json` + `messageQueue`.
- E2: weekly text generated locally. No change to diplomacy or population.

### Combination B (ambitious)
- All of A, plus: T2: the population growth (in `fastLoop`) must read `global.anki.population_cap`; new "dormant" state per inhabitant (today Evolve counts citizens, not individuals); D1: a deck -> job table, applying a multiplier in `jobs.js`/`prod.js`; R1: Food multiplier tied to `global.anki.river`; S3/M4: milestones that place `monument` buildings (to be unlocked without going through the normal tech).
- Risk: Evolve's population is intertwined with food, housing, caps and jobs; start with a simple cap.

### Combination C (mad)
- Everything above for R2/M1/M3, plus:
- R3: a region model and a rendering (even textual: a list of zones with a fog percentage) tied to exploration/deposits; the fog masks access to resources.
- M1: a list of "beasts" and a link to `pet` (`events.js`) and `hunter`; modify `events.js` to never produce damage.
- D2: read/write `civic.foreign.gov0..2.hstl` and wire `trade`.
- B4: UI on the question side of the card (scheduling JS) and a stake table.
- R2: force `calendar.weather/temp` according to the week's retention.
- Also requires `revlog` tracking on the PC side for accuracy.

---

## 6. Points of honesty

- **Speculative**: B2, B3, B4, R3, R4, R6, M2, D2, T3 (never tested; some create perverse incentives).
- **Probably sound**: T1, R7, S1, S2, S3, M1, M3, M4, B1, E2.
- **Verify before writing code**: (a) the per-button `customData` trick (spike S2); (b) the `fsrs_stability` values on the ContentProvider side; (c) that `fastLoop` really uses `time_multiplier` and `webWorker.mt` for town production; (d) that `window.evolve.global` is only exposed with `settings.expose` (`debug.js:14`, noted in SYNTHESE); (e) that `events.ruins` and the `archaeologist` job are restricted (specific traits).
- The "answer time" statistics (R5) are inaccessible live on AnkiDroid; they only serve when corrected afterwards by the PC.
- The figures of §4 are hypotheses to test the order of magnitude, never promises.
