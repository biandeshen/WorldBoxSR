# Project status

Last updated: 2026-08-24

## Current state

`main` contains a deterministic living-world simulation with:

- seeded, serializable RNG and fixed-tick world state;
- procedural elevation/moisture, land/ocean, renewable food, and renewable vegetation biomass;
- human hunger, movement, eating, aging, reproduction, death, ancestry, lineage history, settlements, territory, and causal history;
- typed creature identity with grazer grazing/starvation;
- default-off authoritative grazer reproduction;
- default-off authoritative gradual grazer old-age mortality;
- deterministic save/load, Simulation Lab, long-run regressions, and a lightweight Canvas/history client.

Default worlds **still contain zero creatures**. Natural-fauna initialization remains research-only.

Grazer reproduction is enabled only when `grazerBirthChancePerEligiblePairPerDay > 0`; default is `0`. Partner discovery uses Chebyshev radius **3**, while each parent's local vegetation eligibility remains radius **1** with threshold `0.50`.

Grazer old-age mortality is enabled only by `grazerOldAgeMortalityEnabled: true`; default is `false`. Snapshot schema remains v11-compatible.

## Binding decisions

- Lineage is ancestry, not household.
- `parental_union` is historical shared-birth evidence, not spouse state.
- Repeated contact is a fluid social field, not an authoritative social-bond roster.
- Broad settlement food storage was tested and rejected.
- Rare natural settlement extinction is valid history; generic survival rescue remains rejected.
- Measured grazer carrying capacity is evidence, not a runtime population controller.
- Reproduction encounter radius3 and resource-locality radius1 are intentionally distinct mechanics.
- Hard grazer lifespan bands and founder-age tuning remain rejected.
- Total map area / passable-land count are not sufficient compact founder-scaling rules.
- A scalar founder count is not a universal compact initializer.
- **The old single year-120 terminal population/birth gate is retired for compact initializer research.** It is phase-sensitive and can both reject recoverable cycles and accept worlds that later go extinct.
- **The observed 40-year recovery envelope is only an in-sample candidate.** It cannot become a gate until independently validated on unseen compact cases.

## Authoritative grazer lifecycle

The validated old-age hazard is:

`pAnnual(age) = 0 before age 12; otherwise min(0.50, 0.01 * 2 ^ ((ageYears - 12) / 3))`

with exact annual-to-daily conversion and keyed daily randomness. There is no hard maximum age or per-creature scheduled death state.

Daily order:

`grazer action/starvation → day increment → old-age hazard → reproduction`

Old-age death reuses typed `creature.died` with cause `old_age`; starvation remains earlier and distinct.

## Natural-fauna initialization evidence

### Sprint 021 / #118 — 24×24 initialization candidate

The research initializer sorts passable tiles by initial vegetation descending (then y/x), uses the 32 richest passable cells, places founders round-robin, and assigns keyed founder age in `[0,6y]`.

Ten founders are the smallest pre-registered 24×24 candidate. The exact initializer passes seeds1–30 through 120 years with bounded vegetation cycles and replacement reproduction in every world.

Evidence: `docs/experiments/2026-08-24-natural-grazer-initialization.md`.

### Sprint 022 / #120 — fixed10 is not universal by size

Fixed10 remains robust in tested 24×24, 32×32 and 48×48 worlds, but compact 16×16 seed2/6/7 fail the old year120 gate. No large-map founder up-scaling is justified.

Evidence: `docs/experiments/2026-08-24-grazer-founder-size-scaling.md`.

### Sprint 023 / #122 — area down-scaling rejected

The pre-registered 16×16→4-founder area rule repairs seed6/7 but still fails seed2/24 and causes seed10 extinction. Seed7 and seed10 each have 101 passable cells yet prefer opposite founder-count directions.

Evidence: `docs/experiments/2026-08-24-grazer-compact-area-scaling.md`.

### Sprint 024 / #124 — scalar count rejected; compact failure classes split

Seeds1–30 × founder counts `2/4/6/8/10` × 120y produce pass counts `23/27/26/26/22`. No count is universal and multiple seeds flip pass/fail direction as founder count increases.

Static land/founder topology descriptors do not cleanly classify outcomes.

A targeted trajectory diagnostic separates:

1. initial encounter failure for some tiny founder sets;
2. post-establishment resource-demography recovery failure;
3. year120 terminal samples that are merely low phases of living cycles.

Evidence: `docs/experiments/2026-08-24-grazer-compact-founder-sensitivity.md`.

### Sprint 025 / #126 — single-terminal persistence gate rejected

A pre-registered 18-world diagnostic extends exact Sprint024 cases to **240 years**.

Groups:

- 8 worlds alive but failing the old year120 gate;
- 6 known true-extinction controls;
- 4 worlds that passed at year120.

Results:

- **8/8** alive year120 failures later pass the old gate again;
- their median old-gate flip count through year240 is **6**;
- seed2×10 recovers after year120 but still goes extinct around **year220.5**;
- original passing control seed2×8 goes extinct around **year144**;
- **6/6** true-extinction controls are extinct by year240 and **0/6** re-pass after year120.

Therefore `pass/fail at year120` is not a stable persistence label in either direction.

Among the 10 worlds still alive at year240:

- longest continuous population<10 span observed: ~**33.52 years**;
- longest continuous zero-birth span observed: ~**24.18 years**.

Every eventual extinction in this 18-case set develops a longer terminal stall. The shortest eventual-extinction example is seed2×10 at ~**52.59 years below10** and ~**48.62 years zero-birth**.

A **40-year recovery envelope** therefore separates persistent vs eventual-extinction trajectories in this diagnostic set, but the value is post-hoc and **must not be accepted without unseen validation**.

Evidence: `docs/experiments/2026-08-24-grazer-cycle-aware-persistence.md`.

## Interpretation

Compact grazer ecology is a nonlinear resource-demography oscillator:

`growth → vegetation pressure → reproduction suppression → aging/decline → vegetation recovery → sparse reproductive recovery → renewed growth`

A fixed terminal population threshold confuses phase with viability. The research concept that now matters is **recovery capacity over time**.

Useful observables are continuous low-population duration, continuous birth absence, repeated rebound, extinction, and whether recovered resources/encounter opportunity translate into renewed generations.

This is an evaluation boundary, not a population-control mechanism.

## Human / settlement checkpoint

The post-social 100×200 baseline completes all 100 seeds. Year-200 population median/mean are **489 / 496.68**; median settled-population share is ~86% and median territory coverage ~83%. Only seeds49/62/98 contain one naturally abandoned settlement each.

Known settlement abandonments are causally heterogeneous. Generic settlement rescue remains rejected.

## Ecology progression

- Sprint 010 / #93 — grazing + starvation authoritative.
- Sprint 011 / #95 — carrying-pressure envelope measured.
- Sprint 012 / #97 — local reproduction research passes.
- Sprint 013 / #100 — reproduction authoritative, default off; snapshot v11.
- Sprint 014 / #103 — hard senescence rejected.
- Sprint 015 / #105 — radius3 encounter recovery proven.
- Sprint 016 / #107 — radius3 partner discovery authoritative.
- Sprint 017 / #110 — hard lifespan re-evaluation still fails.
- Sprint 018 / #112 — founder-age synchronization not root cause.
- Sprint 019 / #114 — gradual mortality hazard passes research gate.
- Sprint 020 / #116 — gradual mortality authoritative, default off.
- Sprint 021 / #118 — 24×24 natural initializer candidate passes 30 seeds.
- Sprint 022 / #120 — fixed10 fails some compact worlds.
- Sprint 023 / #122 — simple area down-scaling rejected.
- Sprint 024 / #124 — scalar founder count rejected; failure classes separated.
- Sprint 025 / #126 — single-terminal gate rejected; 40y recovery envelope identified as unseen-validation candidate.

## Next decision gate

Validate the **40-year candidate recovery envelope on an unseen compact-world set**.

The next study must:

- pre-register cases not used in Sprint025's 18-world derivation set;
- keep ecology and founder placement unchanged;
- run long enough to observe eventual extinction/recovery;
- test the 40-year rule exactly, without changing it after seeing results;
- report false persistent / false extinction classifications;
- keep population targets/controllers out of runtime.

Only if this evaluation rule survives unseen validation should a separate spatial-seeding experiment target genuine initial encounter failures.

Until then default worlds remain creature-free. Do not add predators, another species, or human/settlement animal interaction.

## Project-management rule

Do not promote convenient labels, averages, terminal samples, or in-sample thresholds into mechanics. Pre-register the next causal test, preserve negative/rare outcomes, and keep world history explainable.
