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

This rejects the idea that more founders simply improve establishment probability or that one threshold count can repair compact worlds.

### Static initialization descriptors

Stage 1 recorded land connected components, founder-covered land share, radius-3 founder graph structure, isolates, nearest-founder distance, bounding-box area, and initial radius-1 vegetation utilization.

No single descriptor cleanly separates pass/fail runs across counts. Median differences change direction by count. Failed worlds are not consistently more fragmented, do not consistently have fewer founder pair edges, and are not consistently poorer in initial local vegetation.

Static topology alone therefore does not justify another initializer rule.

## Stage 2 — 10-year trajectory diagnostic

Because Stage 1 remained causally ambiguous, the pre-registered deterministic subset was run: the first ten seed numbers whose pass/fail status changes across counts:

`2, 4, 6, 7, 9, 10, 13, 14, 15, 16`.

All five counts were re-run for 120 years: **50 worlds**. Every 10 years the probe recorded population, founder survival, births, starvation/old-age deaths, vegetation utilization, hunger, reproduction-eligible grazers, radius-3 pair edges among eligible grazers, occupied cells, and age.

### Failure class A — establishment/encounter failure

Some very small founder populations fail before ecology is resource-limited.

The clearest cases are seed9/13/14 with 2 founders:

- initial/follow-up vegetation remains abundant;
- the founders repeatedly have **zero eligible radius-3 pair edges**;
- seed9 produces 0 births, seed13/14 only 1;
- mortality is old age, not starvation;
- the world then becomes empty while vegetation approaches 100%.

This is a real spatial encounter/establishment failure. It explains why very small founder counts cannot be universal.

But it does **not** explain the higher-count failures below.

### Failure class B — resource-demography cycles and recovery failure

Many higher-count failures first establish successfully, grow, suppress vegetation/reproduction, then enter an old-age demographic trough.

Example: seed10 with 4 founders:

- year20: 42 living, 42 births, vegetation ~45%;
- year30: 39 living, vegetation ~7%, **0 reproduction-eligible grazers / 0 pair edges**;
- year40: 14 living while vegetation has recovered to ~42%, but only 2 eligible grazers and no pair edge;
- year50–80: population falls 3 → 4 → 3 → 1 despite vegetation near capacity;
- by year90 the population is extinct.

This is not an initial placement-connectivity failure: the 4 founders began with a fully connected radius-3 graph. The failure emerges later from the coupled resource → reproduction suppression → aging → sparse recovery sequence.

Seed6 with 6 founders shows a similar multi-cycle decline and finally reaches extinction at year120. Seed7 with 10 founders falls from 37 at year20 to 4 at year110/120 after repeated resource-demography cycles.

### Failure class C — terminal sampling of a living cycle

Several Stage-1 "fails" are clearly alive and capable of another rebound at year120. The existing terminal gate is therefore phase-sensitive on compact maps.

Examples:

- seed4 / 8 founders: year100 population 74 → year110 52 → year120 16; final-20y births are only 4, so it fails the gate, but at year120 vegetation is ~79%, **13 grazers are reproduction-eligible with 25 pair edges**;
- seed2 / 4 founders: final population 9 fails the population floor, yet year120 has ~74% vegetation, **9 eligible grazers and 17 eligible pair edges**;
- seed6 / 8 founders: final population 7 and only 3 final-window births, but the world remains alive and has recovered vegetation plus viable pair opportunity;
- seed7 / 10 founders: final population 4, but still has eligible animals/a pair edge rather than being an already-empty world.

These are not equivalent to seed9/13/14 two-founder establishment extinctions or seed10/four-founder eventual extinction.

## Structural conclusion

Compact-map initialization has **at least two distinct causal problems**:

1. too-small founder sets can fail to establish a reproductive encounter network even with abundant resources;
2. successfully established populations can later enter deep resource-demography cycles where old-age turnover and sparse encounter recovery determine whether they rebound.

A third evaluation problem is also exposed: a single year-120 terminal population/birth window can label a recoverable trough as a failure.

Therefore:

- a scalar founder count is rejected;
- total area/passable-land formulas remain rejected;
- a static founder-topology threshold is insufficient;
- changing placement now would overfit one failure class and would not explain the post-establishment failures;
- the existing terminal gate should not be used to tune initialization mechanics until its phase sensitivity is characterized.

## Decision

**Do not promote any natural-fauna initializer from Sprint 024.** Default worlds remain creature-free.

The next causal gate should change **evaluation, not ecology or placement**: distinguish true extinction/non-recovery from an ordinary low phase of a long compact-world population cycle. Use longer-horizon trajectory/rolling-window evidence on the pre-registered borderline cases before deciding whether any spatial seeding change is needed.

Only after a cycle-aware persistence gate exists should a separate initializer experiment ask whether encounter-safe spatial seeding reduces genuine establishment failures without flattening emergent population cycles.

## Cleanup

All Stage-1/Stage-2 probes and test-script overrides are temporary research scaffolding and are removed before merge. Runtime ecology and default-world behavior remain unchanged.
