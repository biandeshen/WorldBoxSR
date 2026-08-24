# Project status

Last updated: 2026-08-24

## Current state

`main` contains a deterministic living-world simulation with:

- seeded, serializable RNG and fixed-tick world state;
- procedural elevation/moisture, land/ocean, renewable food, and renewable vegetation biomass;
- human hunger, movement, eating, aging, reproduction, death, ancestry, and lineage history;
- emergent settlement formation, weak home cohesion, abandonment, territory, and causal history;
- behavior-neutral settlement resource accounting;
- persistent historical co-parent (`parental_union`) edges;
- derived social, scarcity, and demographic research instruments;
- isolated/checkpointable Simulation Lab, deterministic save/load, long-run regressions, and 10k-agent benchmark coverage;
- a lightweight Canvas client that consumes authoritative simulation state;
- deterministic history queries plus a causal timeline/event inspector for world, human, and settlement history;
- deterministic Spawn human, Erase humans, and Lightning god interventions exposed through a minimal client tool selector.

Clean CI after Sprint 009 / #91: **172/172 tests + smoke**.

## Completed architecture corrections

### Lineage is not household

The original `household` prototype was renamed to **lineage** after 200-year worlds produced surviving records with tens to hundreds of living descendants. Lineage remains a persistent ancestry identity only; it has no co-residence, storage, inheritance, or movement behavior.

### Co-parent edge is not spouse

`parental_union` is a historical edge created by an already-occurring shared birth. The 13-seed 200-year baseline showed almost one new co-parent edge per birth, very low repeated shared parenting, and high multi-union participation. It is not spouse/current-partner state and has no exclusivity or behavior.

### Repeated dyad is not general social bond

Repeated adult dyads can recur for years, but #73/#74 showed annual top-partner identity usually turns over. Six-seed median same-top-next-year was **10.68%**, median same-top across 3 annual windows **1.93%**, and across 5 windows **0.49%**. Rare strong dyads are preserved as observations, not thresholded into an authoritative `social_bond`.

### Local peer field is not stable household membership

#75/#76 measured whole radius-1 local co-presence sets. Adjacent-year recurrence is real: six-seed median prior peer-mass retention is **55.98%**. But 3-window persistence falls sharply: median support intersection/union **13.12%**, weighted min/max **4.64%**, and only **26.43%** of current peer mass comes from peers present in all 3 annual windows.

The best current abstraction is a **fluid local social field**, not a stable household roster. No residential-group entity is justified yet.

### Broad local-meal storage is not a valid scarcity buffer

#79/#80 implemented and tested a conservative, off-by-default settlement shared-food-store prototype, then rejected it before merge. The mechanism was mechanically correct and resource-conserving, but its causal scope was too broad.

Seed98 storage changed the baseline from 6 active + 1 abandoned settlement to 7 active + 0 abandoned. The rescued settlement was resource-rich Pineford (#5), and the rescue began before Pineford itself used storage. Runtime storage was removed before #80 merged.

Storage v0 is a preserved negative experiment, not shipped simulation behavior.

## Empirical checkpoints

### Post-social 100×200 baseline

All 100 seeds completed successfully. Year-200 population median/mean are **489 / 496.68** versus **483 / 495.7** before social cohesion. The minimum rose from **8 to 128** while the center stayed almost unchanged. Median settled-population share is ~86% and median territory coverage ~83%.

Only **3/100 worlds** contain any naturally abandoned settlement by year200: seeds 49, 62, and 98, one each.

### Settlement scarcity episodes

#81/#82 showed that genuine resource pressure is common but does not classify settlement survival.

Across seeds `1/4/9/45/80/98` × 200 years, six-seed median settlement-sample shares were:

- one-meal territorial shortage: **40.74%**;
- local meal-path blockage: **29.00%**;
- access mismatch: **0.00%**.

Pineford declines from 11 → 8 → 7 → 3 → 0 while territorial meal coverage rises from ~21 to ~80 meals/member and while the tracker records **zero scarcity, zero local blockage, and zero access mismatch episodes**. Its failure is not economic.

### Settlement demographic viability

#83/#84 decomposes sampled settlement population change exactly from stable human-ID flows. Every long-run research interval reconciles:

`population delta = surviving newborn additions + external spawns + entries + switches in - deaths - exits - switches out`

The six-seed year100 cohort contains 41 settlements:

| Outcome | Count | Median pop Δ | Median newborn-death stock balance | Median non-death membership balance |
| --- | ---: | ---: | ---: | ---: |
| later abandoned | 1 | -11 | **-13** | **+2** |
| active but declined | 5 | -5 | **+21** | **-25** |
| stable/growing | 35 | +36 | **+38** | **+4** |

There is no single settlement-decline mechanism. Active declines can have healthy natural replacement but lose members through redistribution; the true abandonment is a replacement failure despite slightly positive non-death membership.

#### Pineford

At year100 Pineford has population 11 but already **0 female minors and 0 reproductive-age females**. By year120 there are no females; by year140 all remaining members are older males.

From year100 to extinction:

- surviving newborn additions: 0;
- deaths: 13;
- non-death membership balance: +2;
- exact population change: -11.

Its female replacement pipeline first reaches zero around year63 and remains continuously absent for roughly 86 observed years before abandonment.

#### All natural abandonments

All three known natural abandonments were audited:

- seed49 Briarfield: no female replacement pipeline from founding, zero births, entrants eventually die;
- seed62 Aldervale: early outflow-driven failure; pipeline disappears near the terminal phase;
- seed98 Pineford: long aging/sex-composition replacement dead end.

Across the 3 abandoned settlements, median zero-female-pipeline share is **62.65%** and median longest zero-pipeline observed span is ~**70 years**. Across 25 settlements still active in those same worlds, medians are **0.51%** and **60 days**.

Persistent female-pipeline loss is a strong viability warning/terminal state, but it is **not a universal upstream cause**.

## Architecture decision — preserve natural settlement extinction

Do **not** add fertility bonuses, migration attraction, member locking, household rescue, food storage, or a special settlement-persistence rule.

Reasons:

1. natural abandonment is rare: 3/100 worlds by year200;
2. the three failures are causally heterogeneous;
3. active member redistribution is often normal rather than pathological;
4. scripting away rare coherent extinction would flatten emergent history;
5. the product principle is emergence over scripting, not survival normalization.

Settlement extinction is valid world history.

## Completed product gate — Sprint 006 / #85

The world history is directly inspectable instead of only visible through current state.

Sprint 006 adds deterministic history queries and a lightweight causal timeline/event inspector. Human/settlement filters use only facts explicitly recorded in authoritative events; missing/evicted causal references remain visible rather than being fabricated. The timeline is a pure consumer of `world.history`.

## Completed god-intervention gate — Sprint 007 / #87

The project has an exact-tile `erase` intervention in addition to `spawn_human`, using a shared authoritative death lifecycle.

The reusable seam is:

`player command → god.erase event → shared human death lifecycle → social bookkeeping → inspectable history`

Erase consumes no RNG, does not directly force settlement lifecycle off-cadence, and does not imply a generic powers framework.

## Completed world-resource gate — Sprint 008 / #89

The world now has a second renewable authoritative resource: **vegetation biomass**.

Vegetation v0 derives capacity from moisture, regenerates independently of food, remains zero on ocean, persists under snapshot schema v9, and is behavior-neutral to humans/settlements. A 20-year divergent-regrowth semantic comparison preserved human, food, settlement, lineage, union, causal-history, counter, ID, and RNG state exactly.

## Completed environment-disturbance gate — Sprint 009 / #91

Lightning is the first real causal loop involving vegetation:

`player lightning → exact-tile vegetation reset + shared human death lifecycle → inspectable history → deterministic vegetation recovery`

Lightning v0:

- accepts any in-bounds tile, including ocean;
- records vegetation before/after and stable human targets in `god.lightning`;
- kills exact-tile humans with cause `lightning` linked back to the god event;
- reuses parental-union mortality bookkeeping;
- consumes no RNG;
- does not alter food, terrain, ownership, or force settlement lifecycle off-cadence;
- relies only on normal vegetation regeneration for recovery;
- is exposed as the third minimal client god tool.

No wildfire, burning state, damage framework, AOE, or generic power registry was introduced. Final feature CI passed **172/172 tests + smoke**.

## Next decision gate

The vegetation substrate now has a player-driven disturbance/recovery loop. Do **not** automatically build wildfire or another power checklist item.

The next higher-value step should preferably make vegetation matter **endogenously without player action**. The strongest candidate is a minimal herbivore/creature that consumes vegetation, has deterministic bounded movement/survival, and can be spawned through a narrow creature command. That would create the first ecology loop while also exercising the still-open generalized creature-spawn backlog.

If that path is taken, protect the existing human/settlement baseline: default worlds should not silently gain animals until a multi-seed ecology experiment demonstrates safe coexistence.

## Project-management rule

Do not jump to kingdoms/war or attach behavior to convenient labels. Research observations are not automatically authoritative entities. Add the smallest causal mechanism supported by experiments, preserve coherent negative/rare outcomes, and make the world's actual history explainable.