# Compact grazer founder-count sensitivity — 2026-08-24

Issue: #124
Sprint: 024

## Question

Can one scalar founder count make the existing vegetation-rich natural-grazer initializer robust on compact 16×16 worlds, or is the failure fundamentally spatial/dynamic?

This is diagnostic research only. No founder count, formula, placement rule, runtime initializer, or default fauna behavior is promoted by this study.

## Fixed ecology

All runs keep the existing authoritative ecology unchanged:

- 16×16 creature-only worlds;
- vegetation-rich founder placement from Sprint 021: passable tiles sorted by initial vegetation descending, then y/x, top-32 pool, round-robin founders;
- keyed founder ages in `[0, 6y]`;
- reproduction chance `0.001`;
- gradual old-age mortality enabled;
- reproduction partner radius 3;
- each parent's local vegetation radius 1 / threshold 0.50;
- existing grazing, starvation, movement, health and cooldown semantics;
- no sequential RNG consumption.

## Stage 1 — bounded response surface

Seeds `1..30` × founder counts `2 / 4 / 6 / 8 / 10` × 120 years = **150 worlds**.

The existing terminal gate requires:

- no extinction;
- final population >= 10;
- at least 5 births in years 101–120;
- replacement-parent reproduction;
- peak living population below passable-land-cell count.

### Count-level result

| Founders | Pass | Extinctions | Interpretation |
| ---: | ---: | ---: | --- |
| 2 | 23/30 | 7 | often viable, but some landscapes never establish |
| 4 | **27/30** | 1 | best aggregate count, still not universal |
| 6 | 26/30 | 1 | no improvement over 4 |
| 8 | 26/30 | 0 | avoids extinction but several terminal populations/reproduction rates remain too weak |
| 10 | 22/30 | 1 | adding founders can make compact worlds worse |

**No tested count passes 30/30. Scalar founder count is therefore insufficient as a universal compact-map initializer.**

### Strong non-monotonicity

Founder count does not map monotonically to viability.

Examples:

- seed2: `2 pass → 4 fail → 6 fail → 8 pass → 10 fail`;
- seed10: `2 pass → 4 extinct → 6 pass → 8 pass → 10 pass`;
- seed16: `2 pass → 4 pass → 6 fail → 8 pass → 10 pass`;
- seed24: `2 pass → 4 fail → 6 pass → 8 fail → 10 pass`;
- seed26: `2 pass → 4 pass → 6 fail → 8 pass → 10 extinct`;
- seed29: `2 fail → 4 pass → 6 pass → 8 pass → 10 fail`.

This directly rejects a simple interpretation that more founders merely improve establishment probability or that failures can be repaired by one threshold count.

### Earlier target seeds

The five compact-map failures/counterexamples that motivated this sprint remain contradictory under the same placement family:

- seed2 passes at 2 and 8, but fails at 4/6/10;
- seed6 passes at 2/4, goes extinct at 6, and fails at 8/10;
- seed7 passes at 2/4/6/8 but fails at 10;
- seed10 passes at 2, goes extinct at 4, then passes again at 6/8/10;
- seed24 passes at 2/6/10 but fails at 4/8.

Seed7 and seed10 each have 101 passable cells yet react differently to the same count changes, reinforcing that total land area alone is not the cause.

## Initialization descriptors

Stage 1 also recorded land connected components, founder-covered land share, radius-3 founder graph structure, isolates, nearest-founder distance, bounding-box area, and initial radius-1 vegetation utilization.

No single descriptor cleanly separates pass/fail runs across counts. Median differences change direction by count. In particular:

- failed runs are not consistently more fragmented;
- failed runs do not consistently have fewer founder pair edges;
- higher initial local vegetation does not guarantee success;
- denser founder graphs can still fail;
- both compact and spatially spread founder layouts occur among passes and failures.

The evidence therefore does **not** justify promoting a static topology threshold from Stage 1 alone.

## Stage 1 decision

1. Reject a universal scalar founder-count rule from `2/4/6/8/10`.
2. Do not test additional counts in this issue.
3. Do not promote a topology formula from static descriptors.
4. Proceed to the pre-registered optional Stage 2 because the count response remains causally ambiguous.

Stage 2 is restricted to the first ten seed numbers whose pass/fail status changes across the five pre-registered counts:

`2, 4, 6, 7, 9, 10, 13, 14, 15, 16`.

For those 50 worlds only, collect 10-year trajectories to distinguish early resource suppression, demographic turnover, and reproduction/encounter recovery. Mechanics and counts remain unchanged.
