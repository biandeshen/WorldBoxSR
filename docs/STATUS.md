# Project status

Last updated: 2026-08-24

## Current state

`main` contains a deterministic living-world simulation with:

- seeded, serializable RNG and fixed-tick world state;
- procedural elevation/moisture, land/ocean, renewable food, and renewable vegetation biomass;
- human hunger, movement, eating, aging, reproduction, death, ancestry, lineage history, settlements, territory, and causal history;
- a typed creature domain with explicit-spawn grazer ecology, default-off authoritative grazer reproduction, and default-off authoritative gradual old-age mortality;
- deterministic save/load, Simulation Lab, long-run regressions, and a lightweight Canvas/history client.

Default worlds **still contain zero creatures**. Natural-fauna initialization remains research-only.

Grazer reproduction is enabled only when `grazerBirthChancePerEligiblePairPerDay > 0`; default is `0`. Partner discovery uses Chebyshev radius **3**, while each parent's vegetation eligibility remains radius **1** with threshold `0.50`.

Grazer old-age mortality is enabled only by `grazerOldAgeMortalityEnabled: true`; default is `false`. Existing v11 snapshots without the key restore it as false.

## Binding decisions

- Lineage is ancestry, not household.
- `parental_union` is historical shared-birth evidence, not spouse state.
- Repeated contact is a fluid social field, not an authoritative social-bond roster.
- Broad settlement food storage was tested and rejected.
- Rare natural settlement extinction is valid history; generic survival rescue remains rejected.
- Measured grazer carrying capacity is evidence, not a runtime population controller.
- Reproduction encounter radius 3 and resource-locality radius 1 remain distinct mechanics.
- Hard grazer lifespan bands and founder-age tuning remain rejected.
- Compact natural-fauna initialization must not be tuned against a phase-sensitive terminal metric.

## Authoritative grazer lifecycle

The validated old-age hazard is:

`pAnnual(age) = 0 before age 12; otherwise min(0.50, 0.01 * 2 ^ ((ageYears - 12) / 3))`

with exact annual-to-daily conversion and keyed daily randomness. There is no hard maximum age or per-creature scheduled death state.

Daily order preserves causal distinction:

`grazer action/starvation → day increment → old-age hazard → reproduction`

Old-age death reuses typed `creature.died` with cause `old_age`; starvation remains earlier and distinct. Snapshot schema remains v11.

## Natural-fauna initialization evidence

### Sprint 021 / #118 — 24×24 initializer passes

Research initializer:

- sort passable tiles by initial vegetation descending, then y/x;
- use the 32 richest passable cells;
- place founders round-robin;
- assign keyed founder age in `[0,6y]` from world seed + future creature ID + a fixed salt;
- otherwise normal grazer defaults.

Ten founders are the smallest pre-registered 24×24 candidate. The exact 10-founder initializer passes seeds1–30 through 120 years: no extinctions, replacement reproduction in every world, year120 population min/median/max **15 / 68 / 166**, and bounded vegetation cycles.

Evidence: `docs/experiments/2026-08-24-natural-grazer-initialization.md`.

### Sprint 022 / #120 — fixed10 is not universal across sizes

Fixed 10 passes all tested 24×24, 32×32, and 48×48 worlds through 120 years, so large maps show no founder up-scaling need.

But three 16×16 worlds fail: seed2 final9/8 final-window births, seed6 final5/3 births, seed7 final4/4 births. Their vegetation recovers, so the failure is demographic/encounter sparsity after deep oscillation rather than permanent resource collapse.

Evidence: `docs/experiments/2026-08-24-grazer-founder-size-scaling.md`.

### Sprint 023 / #122 — total-area down-scaling also fails

The pre-registered area rule gives 4 founders at 16×16. It repairs original fixed10 failures seed6 and seed7, but still fails seed2, makes seed10 go extinct, and misses seed24's continuation gate.

Seed7 and seed10 both have **101 passable land cells** yet prefer opposite founder-count directions. Therefore total area or passable-land count alone cannot explain compact-world robustness.

Evidence: `docs/experiments/2026-08-24-grazer-compact-area-scaling.md`.

### Sprint 024 / #124 — scalar count rejected; failure mechanisms split

A bounded 16×16 response surface ran seeds1–30 × founder counts `2/4/6/8/10` for 120 years.

| Founders | Pass | Extinctions |
| ---: | ---: | ---: |
| 2 | 23/30 | 7 |
| 4 | **27/30** | 1 |
| 6 | 26/30 | 1 |
| 8 | 26/30 | 0 |
| 10 | 22/30 | 1 |

No count is universal, and several seeds change pass/fail direction multiple times as founders increase.

Static initialization descriptors—land components, founder graph connectivity, isolates, nearest-neighbor distance, bounding box, and initial local vegetation—do not cleanly classify outcomes.

A pre-registered 50-world trajectory follow-up then separated three phenomena:

1. **initial encounter failure** — some 2-founder worlds remain resource-rich but never form radius-3 reproductive pair opportunity before old age removes them;
2. **post-establishment resource-demography failure** — some well-connected founder sets establish, grow, suppress reproduction through resource pressure, then fail to rebuild sparse reproductive stock after old-age turnover;
3. **terminal phase sensitivity** — several year120 gate failures are still alive with recovered vegetation and many eligible pair edges, indicating a recoverable cycle trough rather than irreversible failure.

Examples:

- seed9/13/14 with 2 founders: zero or near-zero births despite abundant vegetation and zero pair edges, then old-age extinction;
- seed10 with 4 founders: grows to 42 by year20, later enters resource suppression and sparse recovery, then truly goes extinct around year90 despite abundant recovered vegetation;
- seed4 with 8 founders: year100 pop74 → year120 pop16 and fails the final-window gate, yet year120 has ~79% vegetation plus 13 reproduction-eligible grazers / 25 eligible pair edges, so the terminal failure is not equivalent to extinction.

Decision: **do not promote any compact initializer, static topology rule, or placement change from Sprint 024.** The existing terminal year120 gate is too phase-sensitive to use as a tuning target.

Evidence: `docs/experiments/2026-08-24-grazer-compact-founder-sensitivity.md`.

## Interpretation

Compact ecology is a nonlinear resource-demography oscillator. Initial encounter geometry matters for tiny founder sets, but it is not the only failure mode. Successfully established populations can still experience long demographic troughs, and a single terminal population/birth window can confuse a trough with non-viability.

Changing placement now would overfit one failure class and could flatten coherent emergent cycles.

## Human / settlement checkpoint

The post-social 100×200 baseline completes all 100 seeds. Year-200 population median/mean are **489 / 496.68**; median settled-population share is ~86% and median territory coverage ~83%. Only seeds49/62/98 contain one naturally abandoned settlement each.

Exact sampled settlement flow accounting reconciles population change, and known abandonments are causally heterogeneous. Generic settlement rescue remains rejected.

## Ecology progression

- Sprint 010 / #93 — grazing + starvation authoritative.
- Sprint 011 / #95 — carrying-pressure envelope measured.
- Sprint 012 / #97 — local reproduction research passes.
- Sprint 013 / #100 — reproduction authoritative behind default-zero chance; snapshot v11.
- Sprint 014 / #103 — hard senescence rejected.
- Sprint 015 / #105 — radius-3 encounter recovery proven.
- Sprint 016 / #107 — partner radius3 authoritative, resource radius1 retained.
- Sprint 017 / #110 — hard lifespan re-evaluation still fails.
- Sprint 018 / #112 — founder-age synchronization not root cause.
- Sprint 019 / #114 — gradual mortality hazard passes 120-year research gate.
- Sprint 020 / #116 — gradual mortality authoritative behind default-false switch.
- Sprint 021 / #118 — 10-founder 24×24 natural initializer passes 30-seed/120y gate.
- Sprint 022 / #120 — fixed10 fails some 16×16 worlds; 24×24+ all pass.
- Sprint 023 / #122 — simple area down-scaling fails; count response is non-monotonic.
- Sprint 024 / #124 — scalar founder count rejected; compact failures split into establishment, post-pressure recovery, and terminal-cycle sampling classes.

## Next decision gate

Before changing compact placement, define and validate a **cycle-aware persistence gate**.

The next study should keep ecology and initialization unchanged and use pre-registered borderline/true-failure cases over a longer horizon to determine:

- whether a low terminal sample later rebounds;
- whether births resume in rolling windows after a demographic trough;
- how long normal resource-demography cycles can remain below the current final-population/final-birth thresholds;
- which trajectories are truly irreversible extinction/non-recovery versus merely out-of-phase at year120.

Only after this evaluation boundary is coherent should a separate experiment test one encounter-safe spatial-seeding hypothesis for genuine establishment failures.

Until then default worlds remain creature-free. Do not add predators, another species, or human/settlement animal interaction.

## Project-management rule

Do not promote convenient labels, averages, or terminal samples into mechanics. Add the smallest causal mechanism supported by experiments, preserve coherent negative/rare outcomes, and keep world history explainable.
