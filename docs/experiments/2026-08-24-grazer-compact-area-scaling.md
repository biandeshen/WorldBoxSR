# Compact grazer founder area-scaling test — 2026-08-24

Issue: #122  
Sprint: 023

## Question

Sprint 022 showed that fixed 10 founders work throughout tested 24×24–48×48 worlds but fail some 16×16 worlds. This sprint tested one structural hypothesis: preserve the validated 24×24 founder density and scale founder count **down only** by total map area.

Research-only. No runtime initializer or default-fauna behavior is added.

## Pre-registered rule

`founders = min(10, max(2, floor(10 * width * height / (24 * 24))))`

Reference values:

- 16×16 → 4 founders;
- 18×18 → 5;
- 20×20 → 6;
- 22×22 → 8;
- 24×24+ → capped at 10.

The divisor, floor, minimum, and cap were fixed before the experiment. No alternate formula was tried.

Placement, keyed founder ages, reproduction `0.001`, gradual old-age mortality, radius-3 partner discovery, radius-1 vegetation eligibility, grazing/starvation/movement/cooldown behavior, and sequential-RNG isolation all remained unchanged.

## Stage 1 — 16×16 × seeds1..30 × 120 years

The formula gives exactly 4 founders. Stage 1 was required to pass all 30 landscapes before any intermediate-size Stage 2 could run.

It fails **3/30** worlds, so the sprint stops.

| Seed | Passable land | Final pop | Min after year20 | Final-20y births | Replacement-parent births | Final 5y mean vegetation | Result |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 2 | 57 | **9** | 9 | 8 | 64 | ~69.2% | fail final-pop floor |
| 10 | 101 | **0** | 0 | **0** | 45 | 100% | extinction |
| 24 | 81 | 17 | 7 | **4** | 104 | ~39.1% | fail final-window births |

All other 27 seeds pass the numeric gate.

## What improved relative to fixed 10

The down-scaling hypothesis is not useless; it repairs two of the three original Sprint 022 failures:

- seed6: fixed10 ended at 5 with 3 final-window births; 4 founders end at **12** with **10** final-window births;
- seed7: fixed10 ended at 4 with 4 final-window births; 4 founders end at **32** with **27** final-window births.

Seed2 also becomes less extreme: under fixed10 it reached a post-year20 minimum of 2 and ended at 9; with 4 founders its post-year20 minimum is **9**, but it still ends at 9 and therefore still misses the pre-registered floor.

The rule clearly reduces some compact-map over-pressure/oscillation, but it is not robust enough to promote.

## New failure: seed10

Seed10 is decisive evidence against a monotonic `smaller map → fewer founders is always safer` model.

With fixed10 in Sprint 022, seed10 passes and ends year120 at 32 after normal resource cycling. With 4 founders here, its checkpoints are:

`15 → 42 → 39 → 14 → 3 → 4 → 3 → 1 → 0 → 0 → 0 → 0`

at years10..120.

The population becomes extinct around year90 while vegetation recovers to 100%. The failure is therefore a demographic/encounter bottleneck, not lack of carrying capacity.

## Same land area, opposite founder-count response

Seed7 and seed10 both have **101 passable land cells**.

Yet:

- seed7: fixed10 fails, 4 founders pass strongly;
- seed10: fixed10 passes, 4 founders go extinct.

This means total map area is insufficient, and **passable-land count alone cannot distinguish these two cases either**. A simple founder-count function of area/land area cannot explain the observed direction of response.

The result points toward interaction with landscape geometry, initial founder spatial coverage, encounter topology, and deterministic lineage/keyed trajectories rather than one scalar density variable.

## Seed24

Seed24 remains alive at 17 and has extensive historical replacement reproduction, but produces only 4 births in years101–120. Its vegetation has recovered substantially after earlier pressure. It misses the pre-registered continuation gate by one birth, so it remains a failure even though it is not an extinction case.

## Determinism

All 30 worlds preserve the sequential world RNG fingerprint exactly. No runtime mechanics changed.

## Decision

**Reject the down-only total-area formula.**

Per the pre-registered rule:

1. do not run the planned 18/20/22/24 Stage 2;
2. do not tune the formula or try passable-land scaling in this sprint;
3. retain that lowering founders can repair some compact worlds but can break others;
4. treat founder-count response as non-monotonic and landscape-dependent;
5. before another initializer rule, characterize compact-world sensitivity to founder count and spatial seeding/encounter geometry.

The next research should be diagnostic rather than another formula proposal: measure a bounded founder-count response surface on 16×16 worlds together with initial spatial/topological descriptors. The goal is to learn whether a common robust count exists at all or whether placement geometry must change.

Default worlds remain creature-free.
