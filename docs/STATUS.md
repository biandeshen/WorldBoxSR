# Project status

Last updated: 2026-08-24

## Current state

`main` contains a deterministic living-world simulation with:

- seeded, serializable RNG and fixed-tick world state;
- procedural elevation/moisture, land/ocean, renewable food, and renewable vegetation biomass;
- human hunger, movement, eating, aging, reproduction, death, ancestry, lineage history, settlements, territory, and causal history;
- a typed creature domain with explicit-spawn grazer ecology, default-off authoritative grazer reproduction, and default-off authoritative gradual old-age mortality;
- behavior-neutral settlement resource accounting plus derived social/scarcity/demographic/ecology research instruments;
- isolated/checkpointable Simulation Lab, deterministic save/load, long-run regressions, and 10k-agent benchmark coverage;
- a lightweight Canvas client with deterministic history queries, causal timeline/event inspection, typed grazer inspection, and Spawn human / Spawn grazer / Erase / Lightning tools.

Default worlds **still contain zero creatures**. Sprint 021 proves a natural 10-founder grazer initializer on validated 24×24 worlds, but no runtime natural initializer has been accepted yet.

Grazer reproduction is authoritative only when `grazerBirthChancePerEligiblePairPerDay > 0`; default is `0`. Partner search is Chebyshev radius **3**, while each parent's vegetation eligibility remains radius **1** with threshold `0.50`.

Grazer old-age mortality is authoritative behind `grazerOldAgeMortalityEnabled: false`. When enabled it uses the exact validated gradual hazard, keyed randomness, no scheduled lifespan, and the normal typed `creature.died` lifecycle. Existing v11 snapshots that lack the switch restore it as false.

## Architecture decisions that remain binding

### Lineage is not household

Lineage is persistent ancestry identity only. It has no co-residence, storage, inheritance, or movement behavior.

### Co-parent edge is not spouse

`parental_union` records historical shared-birth evidence. It is not spouse/current-partner state and has no exclusivity or behavior.

### Repeated contact is not a general social bond or residential group

Dyadic and local co-presence research finds real recurrence but high identity turnover. The best current abstraction is a **fluid local social field**, not an authoritative household/social-bond roster.

### Broad local-meal storage is rejected

Settlement shared-food-storage v0 was mechanically valid but causally too broad: it rescued a resource-rich settlement through effects outside the intended scarcity scope. Runtime storage was removed; the negative experiment is preserved.

### Natural settlement extinction is valid history

Only 3/100 worlds in the 200-year baseline contain a natural abandonment, and their causes are heterogeneous. Do not add generic fertility, migration, member-locking, food-storage, or persistence rescue rules merely to normalize survival.

### Measured carrying capacity is evidence, not a controller

Sprint 011 measured landscape-specific grazer survivor plateaus (~115 / ~165 / ~130 on seeds 1/4/9 when overloaded), roughly one long-run grazer per 14.8–15.0 vegetation-capacity units. Runtime ecology never reads that ratio or a target population.

### Encounter distance and resource locality are distinct

A reproduction partner may be discovered within radius 3, while each parent's resource eligibility remains radius 1. Do not broaden resource locality merely because encounter range is wider, and do not introduce a generic interaction-radius framework without a second proven use.

### Hard lifespan bands and founder-age tuning are rejected

Hard keyed 12–18y and diagnostic 18–24y lifespan bands fail carrying-pressure turnover even after radius-3 reproduction. Spreading founders over age0–6 delays/softens the collapse but does not rescue the 200-founder worlds. Do not search more hard lifespan endpoints or founder-age ranges.

### Natural grazer mortality uses a gradual hazard

Sprint 019 identified and Sprint 020 promoted:

`pAnnual(age) = 0 before age 12; otherwise min(0.50, 0.01 * 2 ^ ((ageYears - 12) / 3))`

with exact annual-to-daily conversion and a keyed daily chance. There is no hard maximum age or per-creature scheduled death state.

The old-age pass runs after grazer action/starvation and authoritative day increment, but before reproduction. Starvation is therefore an earlier distinct cause, and an old-age death cannot reproduce later that day. Snapshot schema remains v11.

### A validated 24×24 natural initializer is not yet a universal/default initializer

Sprint 021 validates exactly this research initializer on 24×24 worlds:

- sort passable tiles by initial vegetation descending, then y/x;
- use the 32 richest passable cells;
- place founders round-robin;
- assign keyed founder age in `[0,6y]` from world seed + future creature ID + dedicated salt;
- use normal grazer defaults otherwise.

Ten founders are the smallest pre-registered count that passes seeds1–12 at 60 years, and the exact 10-founder initializer passes seeds1–30 at 120 years. This supports a 24×24 natural-fauna initializer; it does **not** prove a fixed count of 10 is correct for arbitrary world sizes and does not authorize a default-on compatibility change.

## Human / settlement empirical checkpoint

The post-social 100×200 baseline completes all 100 seeds. Year-200 population median/mean are **489 / 496.68**; median settled-population share is ~86% and median territory coverage ~83%. Only seeds 49, 62, and 98 contain one naturally abandoned settlement each.

Exact sampled settlement flow accounting reconciles:

`population delta = surviving newborn additions + external spawns + entries + switches in - deaths - exits - switches out`

Known abandonments are causally heterogeneous; persistent loss of the female replacement pipeline can be a terminal warning but is not a universal upstream cause.

## Ecology progression

### Sprint 010 / #93 — first endogenous grazer loop

Explicit-spawn grazers consume renewable vegetation, move with keyed randomness, can starve, and emit typed death history. Creature IDs are independent from human IDs. Default worlds remain creature-free.

### Sprint 011 / #95 — carrying pressure

A no-reproduction multi-seed study finds a clear resource-limited regime. At 10 years, overloaded worlds converge toward roughly seed1 **114–115**, seed4 **164–165**, seed9 **127–130**.

Evidence: `docs/experiments/2026-08-24-grazer-carrying-pressure.md`.

### Sprint 012 / #97 — reproduction research

A local adult/health/hunger/resource/cooldown pair rule with keyed chance `0.001` grows low-density populations and self-suppresses under resource pressure without a population target.

Evidence: `docs/experiments/2026-08-24-grazer-reproduction-probe.md`.

### Sprint 013 / #100 — authoritative reproduction

The research rule becomes authoritative behind default-zero birth chance. Only `lastBirthDay` is persisted per grazer; successful births emit typed `creature.born` history. Snapshot schema becomes v11 with deterministic v10 migration.

### Sprint 014 / #103 — hard senescence rejected under radius 1

Simple keyed lifespan bands fail carrying-pressure recovery. No runtime senescence ships.

Evidence: `docs/experiments/2026-08-24-grazer-natural-turnover.md`.

### Sprint 015 / #105 — encounter recovery

Keeping reproduction/resource semantics fixed, partner radius 3 is the smallest tested geometry where all six 100/200-founder turnover-stress worlds recover and remain multi-generational through extension runs.

Evidence: `docs/experiments/2026-08-24-grazer-encounter-recovery.md`.

### Sprint 016 / #107 — authoritative partner radius 3

Partner discovery becomes radius 3 while resource eligibility remains radius 1. No schema or public interaction framework change.

### Sprint 017 / #110 — hard lifespan re-evaluation

The 12–18y candidate passes low density but fails carrying pressure; all 200-founder worlds go extinct. A diagnostic 18–24y band also fails. Hard lifespan search stops.

Evidence: `docs/experiments/2026-08-24-grazer-turnover-radius3.md`.

### Sprint 018 / #112 — founder synchronization diagnostic

Keyed age0–6 founder heterogeneity delays/softens the hard-lifespan collapse but still cannot rescue any 200-founder world. Founder-age tuning stops.

Evidence: `docs/experiments/2026-08-24-grazer-founder-age-synchronization.md`.

### Sprint 019 / #114 — gradual mortality research

One pre-registered gradual hazard remains multi-generational through 120 years across seeds1/4/9 × founders20/100/200. Year120 populations are:

- 20 founders: **47 / 104 / 72**;
- 100 founders: **91 / 119 / 52**;
- 200 founders: **102 / 134 / 86**.

Old-age deaths span roughly age12 into the mid-30s rather than clustering at a hard cutoff; resource-population cycles remain intact.

Evidence: `docs/experiments/2026-08-24-grazer-gradual-mortality-hazard.md`.

### Sprint 020 / #116 — authoritative gradual mortality

The exact Sprint 019 curve becomes authoritative behind `grazerOldAgeMortalityEnabled: false`. Tests pin default-off behavior neutrality, causal `old_age` history, starvation precedence, enabled save/load, v11 missing-key compatibility, zero sequential RNG use, and the exact 60-year 9-world research fingerprint.

### Sprint 021 / #118 — broad natural-initialization research

Stage 1 tests seeds1–12 × founder counts10/20/40 for 60 years. All counts pass; the pre-registered smallest-candidate rule selects **10 founders**.

Stage 2 runs that exact 10-founder initializer on seeds1–30 for 120 years. All **30/30** worlds pass:

- year120 population: min **15**, median **68**, mean **71.2**, max **166**;
- minimum population after year20: min **9**, median **22.5**;
- maximum observed living population: **167**;
- births in years101–120: min **7**, median **57**, max **159**;
- no extinctions; replacement-parent reproduction in every world;
- only **3 starvation deaths total** across all 30 runs;
- sequential RNG unchanged in every world;
- vegetation repeatedly depletes and recovers rather than remaining collapsed.

Weak seeds remain cyclic rather than terminal: seed2 ends at 15 with 9 final-window births; seed7 and seed26 recover after minima of 9; seed29 has only 7 final-window births but ends at 30 with extensive replacement reproduction.

Evidence: `docs/experiments/2026-08-24-natural-grazer-initialization.md`.

## Next decision gate

Resolve **world-size scaling and activation compatibility** before adding a runtime natural-fauna initializer.

The next work should determine a simple founder-count rule across different map sizes/land areas without turning measured carrying capacity into a population target. It should then make an explicit product decision among opt-in config, ecology preset, or future new-world default while preserving old/default behavior unless deliberately changed.

Do not hard-code `10` for every map size. Do not add predators, another species, or human/settlement animal interaction until activation itself is coherent.

Territory visualization, civilization labels, meteor/plague, predators, and art expansion remain lower priority unless they become the actual bottleneck.

## Project-management rule

Do not jump to kingdoms/war or attach behavior to convenient labels. Research observations are not automatically authoritative entities. Add the smallest causal mechanism supported by experiments, preserve coherent negative/rare outcomes, and make the world's actual history explainable.
