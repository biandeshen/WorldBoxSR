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

But three 16×16 worlds fail:

| Seed | Land cells | Final pop | Final-20y births |
| ---: | ---: | ---: | ---: |
| 2 | 57 | 9 | 8 |
| 6 | 66 | 5 | 3 |
| 7 | 101 | 4 | 4 |

Their vegetation recovers, so the failure is demographic/encounter sparsity after deep oscillation rather than permanent resource collapse.

Evidence: `docs/experiments/2026-08-24-grazer-founder-size-scaling.md`.

### Sprint 023 / #122 — total-area down-scaling also fails

A single pre-registered compact rule was tested:

`founders = min(10, max(2, floor(10 * width * height / (24 * 24))))`

This gives 4 founders at 16×16. Stage 1 runs seeds1–30 for 120 years and fails 3/30:

| Seed | Land cells | Final pop | Min after year20 | Final-20y births | Result |
| ---: | ---: | ---: | ---: | ---: | --- |
| 2 | 57 | **9** | 9 | 8 | misses final-pop floor |
| 10 | 101 | **0** | 0 | **0** | extinction |
| 24 | 81 | 17 | 7 | **4** | misses continuation gate |

The rule does repair original fixed10 failures seed6 and seed7:

- seed6: fixed10 `final5 / 3 births` → 4 founders **final12 / 10 births**;
- seed7: fixed10 `final4 / 4 births` → 4 founders **final32 / 27 births**.

But seed10 moves the opposite way: fixed10 passes, while 4 founders go extinct around year90 after vegetation fully recovers.

Most importantly, seed7 and seed10 both have **101 passable land cells** yet prefer opposite founder-count directions. Therefore neither total map area nor passable-land count alone can explain compact-world founder robustness.

Evidence: `docs/experiments/2026-08-24-grazer-compact-area-scaling.md`.

## Interpretation

The compact-map problem is **non-monotonic**. Lower founder density can rescue some worlds and break others. The remaining causal variables likely include founder spatial coverage, land connectivity/topology, local encounter geometry, and deterministic lineage/keyed trajectories.

Do not propose another scaling formula yet.

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

## Next decision gate

Run a **diagnostic compact-world founder-count response surface** before proposing another initializer rule.

The next study should:

- use 16×16 worlds;
- test a bounded, pre-registered set of founder counts for diagnosis rather than promotion;
- include broad seeds and explicitly retain known contradictory cases such as seed7 and seed10;
- record initial founder spatial coverage, pair/encounter connectivity, passable-land components, and resource/topology descriptors;
- determine whether any common robust count exists and whether failure correlates with count or placement geometry.

If count alone is not robust, change the initializer's spatial seeding logic rather than continue scalar formula search.

Only after compact initialization is coherent should activation semantics (explicit opt-in, ecology preset, or future default) be decided. Until then default worlds remain creature-free.

Do not add predators, another species, or human/settlement animal interaction before activation is coherent.

## Project-management rule

Do not promote convenient labels or averages into mechanics. Add the smallest causal mechanism supported by experiments, preserve negative/rare outcomes, and keep world history explainable.
