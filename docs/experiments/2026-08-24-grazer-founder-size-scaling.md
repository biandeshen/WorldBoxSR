# Grazer founder map-size scaling diagnostic — 2026-08-24

Issue: #120  
Sprint: 022

## Question

Sprint 021 validated a deterministic 10-founder grazer initializer on 24×24 worlds. Before inventing a founder-count scaling formula, this sprint tested the simpler hypothesis that `10` is merely an ecological founder seed rather than a density target and can therefore remain fixed across map sizes.

This sprint is research-only. No runtime initializer or default-fauna behavior is added.

## Fixed initializer and ecology

The Sprint 021 initializer is unchanged:

- exactly 10 founders;
- passable tiles sorted by initial vegetation descending, then `y`, then `x`;
- round-robin placement over the 32 vegetation-richest passable cells;
- deterministic keyed founder age in `[0,6y]` using the same initialization salt;
- normal grazer defaults otherwise.

Authoritative ecology is unchanged:

- reproduction chance `0.001`;
- gradual old-age mortality enabled;
- reproduction partner radius 3;
- each parent's local vegetation radius 1 / threshold `0.50`;
- current hunger, grazing, starvation, movement, cooldown, and vegetation behavior;
- no population target/controller;
- no sequential RNG.

No alternate founder count or scaling rule is tested in this sprint.

## Stage 1 — 60-year cross-size screen

Matrix: sizes `16×16 / 24×24 / 32×32 / 48×48` × seeds `1..12` = 48 worlds.

All **48/48** worlds pass the pre-registered screen: no extinction, year60 population >=10, >=5 births in years41–60, replacement-parent reproduction, maximum population below passable-land-cell count, and unchanged sequential RNG.

The result initially supports the fixed-founder hypothesis. It also shows that world size mainly changes the phase/time-to-pressure rather than requiring more founders on large maps. For example, at 48×48 year60:

- seed9 has only 61 grazers and vegetation utilization ~98.6%;
- seed4 has 604 grazers and vegetation utilization ~13.6%.

Both began from the same 10-founder seed. The larger worlds can therefore expand naturally from ten rather than needing area-proportional founder injection.

Per the pre-registered rule, the exact fixed-10 initializer advanced unchanged to 120 years.

## Stage 2 — 120-year validation

The fixed-10 hypothesis **fails the universal cross-size gate**.

All `24×24`, `32×32`, and `48×48` worlds pass. Three `16×16` worlds fail the strict terminal criteria:

| Size | Seed | Passable land | Year120 pop | Min pop after year20 | Births years101–120 | Replacement-parent births | Final 5y mean vegetation | Gate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 16×16 | 2 | 57 | **9** | 2 | 8 | 56 | ~74.2% | fail final pop |
| 16×16 | 6 | 66 | **5** | 5 | **3** | 66 | ~81.1% | fail final pop + births |
| 16×16 | 7 | 101 | **4** | 2 | **4** | 102 | ~99.0% | fail final pop + births |

No failed world is resource-collapsed at year120. Vegetation has recovered strongly, so the failure is not insufficient carrying capacity or permanent overgrazing.

### Failure trajectories

#### 16×16 seed2

Population checkpoints every 10 years:

`22 → 18 → 7 → 3 → 11 → 21 → 16 → 9 → 14 → 20 → 12 → 9`

Vegetation repeatedly falls and recovers. The year120 value of 9 misses the pre-registered floor by one while final-window births remain 8. This is a weak cyclic endpoint, not proven extinction, but the gate still fails exactly as written.

#### 16×16 seed6

Population:

`23 → 27 → 12 → 8 → 12 → 24 → 20 → 10 → 17 → 23 → 13 → 5`

Only 3 births occur in years101–120. Vegetation recovers to ~90.2% at year120 and averages ~81.1% over the final five years. The low terminal population therefore reflects demographic/encounter sparsity after a deep oscillation, not resource shortage.

#### 16×16 seed7

Population:

`30 → 37 → 22 → 14 → 31 → 31 → 16 → 33 → 36 → 24 → 4 → 4`

Only 4 births occur in the final 20 years, while final vegetation is ~98.6% and the final-five-year mean is ~99.0%. This is the strongest evidence that fixed 10 is too dense as an initializer for some compact worlds: an early population/resource cycle can later leave too few spatially compatible breeders even after resources fully recover.

## Larger sizes do not need founder up-scaling

The failure is asymmetric. It occurs only at the smallest tested size.

All 24×24 worlds pass the same 120-year gate, reproducing the Sprint 021 conclusion. All 32×32 and 48×48 worlds also pass despite starting with the same 10 founders.

Large-map examples demonstrate delayed natural expansion rather than under-seeding:

- 48×48 seed9: population `15 → 20 → 21 → 21 → 27 → 61 → 131 → 321 → 502 → 340 → 166 → 315` at 10-year checkpoints;
- 48×48 seed4: population grows to 604 by year60, later falls under resource pressure, and ends year120 at 224;
- the largest observed 48×48 population is 645, still below that world's 1643 passable land cells.

Therefore there is no evidence for scaling founder count **up** with world area over the tested 24–48 range. Ten founders are sufficient to ignite the ecology; larger worlds simply take different amounts of time to reach resource-limited cycles.

## Interpretation

The universal fixed-10 hypothesis is rejected, but the data does not support a conventional area-proportional scaling rule in both directions.

Instead, the evidence points to a narrower problem: **small-map initialization density**.

Ten founders on compact worlds can represent a much larger fraction of available land than on 24×24+ worlds. The failed 16×16 landscapes have only 57, 66, and 101 passable cells. Their long-run failure happens after repeated resource/demographic oscillation and after vegetation has recovered, suggesting the initializer should likely be scaled **down** on compact maps rather than scaled up on large maps.

That hypothesis is not tested here. Per the pre-registered rules, Sprint 022 stops after characterizing the fixed-10 failure.

## Determinism and performance note

All Stage-1 and Stage-2 worlds preserve the sequential world RNG fingerprint exactly.

The temporary 48-world × 120-year Stage-2 probe takes roughly 124 seconds in CI. This is research workload, not a proposed permanent test. Any future permanent regression should retain discriminating coverage without embedding this entire heavy matrix in normal CI.

## Decision

**Reject fixed 10 founders as a universal 16–48 map-size initializer.**

At the same time:

1. retain the Sprint 021 result that 10 founders are valid on 24×24;
2. record that 10 founders also work across all tested 32×32 and 48×48 worlds, so no large-map up-scaling is justified;
3. block runtime/default fauna activation because compact maps remain unresolved;
4. do not test alternate counts or formulas in Sprint 022;
5. next test one simple **down-only compact-map scaling** hypothesis while leaving 24×24+ at 10 founders.

Default worlds remain creature-free.
