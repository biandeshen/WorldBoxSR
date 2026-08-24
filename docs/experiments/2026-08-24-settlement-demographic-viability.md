# Experiment: settlement demographic viability and member replacement

Date: 2026-08-24  
Issue: #83  
PR: #84

## Question

After settlement scarcity research showed that seed98 Pineford (#5) dies with abundant food and zero scarcity/access episodes, explain **how settlements actually gain and lose population** before adding any persistence, fertility, migration, household, or economy behavior.

The experiment asks whether decline is dominated by:

1. mortality exceeding replacement;
2. non-death membership inflow/outflow;
3. direct settlement switching;
4. age/sex composition and loss of reproductive replacement;
5. local reproduction-opportunity failure.

The layer is derived-only and changes no authoritative world state or behavior.

## Observation semantics

### Demographic stock

Every 30 days, for each active settlement, the research layer derives:

- total population;
- minors/adults;
- female/male counts;
- female/male minors;
- reproductive-age females using the existing adult/female-fertility bounds;
- descriptive reproductive-age males over the same age band;
- later adult females/males;
- **female replacement pipeline members = female minors + reproductive-age females**;
- currently eligible females/males using the exact authoritative reproduction helpers;
- eligible females with/without an eligible male inside the real Chebyshev-radius-1 partner neighborhood;
- compact age statistics.

Male eligibility deliberately has **no invented upper-age cutoff**, because the authoritative reproduction rule has none.

### Sampled stock-flow reconciliation

The tracker retains one previous state per living human and uses stable IDs to classify transitions between 30-day samples:

- previous member absent at next sample → death;
- `S → null` → exit to no settlement;
- `null → S` → entry from no settlement;
- `S → T` → switch-out from S plus switch-in to T;
- new natural human (`parentIds.length >= 2`) → surviving newborn addition to its current settlement;
- new unparented human → external-spawn addition.

Natural birth production is separately attributed to the mother's **prior-sample settlement**, because settlement membership itself is only refreshed at settlement cadence. This keeps "where the mother belonged" distinct from "where the newborn is first sampled as a member."

For every settlement interval the stock identity must hold exactly:

`population delta = newborn additions + external spawns + entries + switches in - deaths - exits - switches out`

The long-run probes assert zero reconciliation error before any interpretation.

### Important sampling limitation

`newbornAdditions` counts natural humans that are new and still alive at the next sample. A child born and dead entirely inside a 30-day interval is not part of sampled stock replacement. This is intentional: the metric is designed to reconcile observed settlement population stock exactly, not to replace authoritative birth/death event counts.

## Method validation

Permanent artificial-world tests pin:

- exact authoritative reproduction eligibility and radius-1 opportunity, including cross-settlement males;
- the lack of a male fertility upper-age cutoff;
- death vs exit vs direct switch vs entry;
- newborn vs external-spawn additions;
- mother-prior-settlement birth production vs newborn current membership;
- zero-opportunity / no-birth episode timing;
- first inactive interval reconciliation and no post-abandonment denominator pollution;
- bounded episode retention;
- exact snapshot/RNG neutrality;
- cadence/cap/time validation;
- female-minor and female-replacement-pipeline stock fields.

The clean pre-probe implementation passed **139/139 tests + smoke**.

A per-cell eligible-male index reduced local-opportunity observation from all-pairs scanning to nine-cell lookups without changing semantics; the same 139/139 suite remained green afterward.

## Six-seed 200-year cohort

Seeds: `1/4/9/45/80/98`  
World: `24×24`, 30 founders  
Horizon: 200 years  
Cadence: 30 days

Every sampled settlement interval reconciled with **zero population-stock error**, and the temporary episode cap did not truncate.

The year100 active cohort contained **41 settlements**:

- 1 later abandoned;
- 5 remained active but had lower population at year200;
- 35 remained active and were stable/growing.

### Exact second-century stock decomposition

| Outcome group | Count | Median population Δ | Median surviving newborn additions | Median deaths | Median stock natural replacement (`newborn-deaths`) | Median non-death membership balance |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| abandoned | 1 | **-11** | 0 | 13 | **-13** | **+2** |
| active but declined | 5 | -5 | 397 | 376 | **+21** | **-25** |
| stable/growing | 35 | +36 | 466 | 428 | **+38** | **+4** |

This is the central result: **there is no single settlement-decline mechanism.**

The five active-but-declining settlements in seed98 still replace deaths naturally; their decline is mostly membership leakage/redistribution. The one true abandonment is the opposite: non-death membership is slightly positive, while replacement is deeply negative.

Raw 30-day condition frequencies such as "no birth this interval" or "outflow exceeded inflow this interval" are correspondingly weak classifiers. Cumulative stock balances are much more informative.

## Seed98 Pineford: exact failure decomposition

Pineford is the sole abandonment in the six-seed year100 cohort.

From year100 to abandonment/year200:

- start population: 11;
- final population: 0;
- surviving newborn additions: **0**;
- deaths: **13**;
- entrants from no settlement: 200;
- switches in: 146;
- exits to no settlement: 204;
- switches out: 140;
- external spawns: 0.

Therefore:

- stock natural replacement = `0 - 13 = -13`;
- non-death membership balance = `200 + 146 - 204 - 140 = +2`;
- exact total = `-13 + 2 = -11`.

Pineford does **not** die because neighbors drain its members. It receives slightly more non-death membership than it loses. It dies because mortality is not replaced.

### Demographic state

At year100 Pineford already has:

- population 11;
- 2 minors, but **0 female minors**;
- **0 reproductive-age females**;
- 2 later-adult females;
- 3 males in the 18–45 descriptive band;
- 4 later-adult males;
- 0 eligible females;
- 7 eligible males;
- mean age ~45.1, median age ~53.0.

The later checkpoints make the dead end explicit:

| Year | Pop | Female minors | Reproductive-age females | Later adult females | Reproductive-age males | Later adult males |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 11 | 0 | 0 | 2 | 3 | 4 |
| 120 | 8 | 0 | 0 | 0 | 3 | 5 |
| 140 | 7 | 0 | 0 | 0 | 0 | 7 |
| 160 | 3 | 0 | 0 | 0 | 0 | 3 |

By year120 there are no females at all. By year140 all remaining members are older males.

The female replacement pipeline had first reached zero around day **22,740** (~year63.2) and then remained continuously absent for an observed span of **31,110 days** (~86.4 years) before abandonment.

## Close-size recovery comparison

The comparison settlement was selected automatically: among year100 settlements that later grew, choose the one whose year100 population is closest to Pineford's 11.

Result: seed80 `Briarmere` (#2), population **10 → 93**.

At year100 Briarmere had:

- 2 minors;
- 1 reproductive-age female;
- 5 adult males;
- 1 currently eligible female;
- 100% local eligible-male opportunity coverage.

From year100 to 200:

- surviving newborn additions: **284**;
- deaths: 152;
- stock natural replacement: **+132**;
- non-death membership balance: **-49**;
- total population change: `+132 - 49 = +83`.

Even meaningful membership leakage does not cause decline when replacement is strong. This is the mirror image of Pineford.

## All known natural abandonments in the 100-seed baseline

The existing post-social 100×200 baseline contains only **three** worlds with any abandoned settlement by year200: seeds `49`, `62`, and `98`, one abandonment each.

A targeted audit therefore covers **all currently known natural abandonment cases**, rather than sampling arbitrary additional worlds.

### Female replacement pipeline enrichment

Across the three abandoned settlements:

- median share of active samples with **no reproductive-age female**: **65.53%**;
- median share with **female replacement pipeline = 0**: **62.65%**;
- median longest continuously observed zero-pipeline span: **25,290 days** (~70.3 years).

Across the **25 settlements still active** in those same worlds:

- median no-reproductive-age-female share: **3.76%**;
- median zero-pipeline share: **0.51%**;
- median longest zero-pipeline span: **60 days**.

Transient zero-pipeline samples occur in living settlements, so the condition is not a deterministic death flag. But persistent pipeline absence is dramatically enriched among natural abandonments.

### Seed49 Briarfield (#3): no replacement from founding

- founded day 9,030;
- abandoned day 34,350;
- female replacement pipeline absent for **100%** of active samples, beginning at founding;
- surviving newborn additions: 0;
- births produced by prior members: 0;
- entrants: 5;
- deaths: 5;
- non-death exits/switches: 0.

Briarfield is a clean no-replacement extinction: a tiny settlement forms without any female replacement pipeline, never produces a surviving child, and its five entrants eventually die.

### Seed62 Aldervale (#1): outflow-driven early failure

- founded day 3,750;
- abandoned day 5,400 (~year15);
- female replacement pipeline zero for **30.91%** of active samples, concentrated near the end;
- surviving newborn additions: 1;
- entrants: 42;
- exits: 43;
- deaths: 0;
- no direct settlement switches.

Aldervale is different. Its immediate extinction is membership leakage: `42 entrants + 1 newborn - 43 exits = 0`. Pipeline loss is a terminal fragility signal, not the original driver.

### Seed98 Pineford (#5): aging/sex-composition dead end

- female replacement pipeline zero for **62.65%** of active samples;
- first zero day ~22,740;
- longest observed zero span ~31,110 days;
- after year100, no surviving newborn additions and 13 deaths;
- non-death membership balance is slightly positive.

This is a long-term replacement failure rather than outflow.

## Decision

### Keep the demographic stock + flow research layer

The new instruments are valuable permanent infrastructure:

- sampled population change reconciles exactly from stable human-ID flows;
- demographic composition uses existing simulation thresholds rather than invented scores;
- local reproduction opportunity uses the real partner neighborhood;
- stock replacement and membership redistribution can now be separated cleanly;
- the layer is exact snapshot/RNG neutral and bounded.

### Do not add a settlement rescue/persistence mechanic

The evidence does **not** justify behavior that prevents settlement extinction:

1. natural abandonment is rare: only 3/100 post-social worlds by year200;
2. the three abandonments are heterogeneous — two replacement failures, one outflow-driven failure;
3. persistent female-pipeline loss is a strong warning/terminal state, but not a universal upstream cause;
4. active-but-declining settlements can have positive natural replacement and merely redistribute members elsewhere;
5. the existing world already supports coherent natural settlement death, which is desirable emergence rather than necessarily a bug.

Adding fertility bonuses, migration attraction, member locking, household rescue, or special persistence rules now would be outcome scripting around rare cases and risks flattening world diversity.

**Preserve natural settlement extinction.**

## Product implication: explain history instead of eliminating it

The project principles say:

- "Emergence over scripting";
- "Legible causality";
- "History is a first-class output".

This research now gives concrete causal language for settlement stories:

- died because replacement collapsed;
- shrank despite positive replacement because members redistributed elsewhere;
- died through a short-lived membership outflow;
- survived heavy resource pressure through strong replacement.

The next product-value step should therefore stop searching for a universal settlement rescue rule and make existing rise/decline/abandonment history **inspectable**.

A history/timeline inspector can surface authoritative founded/abandoned events first, then progressively add derived settlement context without turning research labels into simulation state.

## Repository hygiene

The expensive six-seed and all-abandonment probes are temporary and are removed before merge. Permanent CI retains only deterministic artificial-world semantics, stock-flow reconciliation, bounded retention, and purity tests.