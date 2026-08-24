# Compact grazer cycle-aware persistence — 2026-08-24

Issue: #126
Sprint: 025

## Question

Are compact 16×16 worlds that fail the old year-120 terminal gate truly non-viable, or are some simply sampled during a recoverable phase of a long resource-demography cycle?

This study changes evaluation only. Founder placement/count, reproduction, old-age mortality, vegetation, movement, starvation, and all runtime/default-world behavior remain unchanged.

## Fixed mechanics

All 18 pre-registered worlds use the exact Sprint 024 ecology and Sprint 021 founder-placement family:

- 16×16 creature-only worlds;
- vegetation-rich top32 / round-robin placement;
- keyed founder ages `[0,6y]`;
- reproduction chance `0.001`;
- gradual old-age mortality enabled;
- partner radius3;
- each parent's local vegetation radius1 / threshold0.50;
- sequential RNG isolation.

Every case runs from year0 to year240 with 10-year checkpoints.

## Pre-registered groups

### Alive but failed the old year120 gate — 8 worlds

`seed2×4`, `seed2×6`, `seed2×10`, `seed4×8`, `seed6×8`, `seed6×10`, `seed7×10`, `seed16×6`.

### True-extinction controls — 6 worlds

`seed6×6`, `seed9×2`, `seed10×4`, `seed13×2`, `seed14×2`, `seed15×2`.

### Passing controls — 4 worlds

`seed2×8`, `seed4×4`, `seed6×4`, `seed7×8`.

No cases were added or removed after results were observed.

## Main result — the old terminal gate is phase-sensitive

All **8/8** worlds that were alive but failed at year120 later passed the old gate at least once after year120.

First post-120 passes:

- seed2×4: year130;
- seed2×6: year140;
- seed2×10: year130;
- seed4×8: year130;
- seed6×8: year150;
- seed6×10: year140;
- seed7×10: year130;
- seed16×6: year130.

Their median old-gate pass/fail flip count through year240 is **6**. The old gate therefore measures cycle phase as much as persistence.

Examples:

- seed4×8 fails at year120 with population16 / rolling20 births4, then passes every checkpoint from year130 onward through year240;
- seed6×8 fails at years120/130/140, recovers to pass at year150, fails again at year180, then passes through year240;
- seed16×6 alternates repeatedly, with **9** old-gate flips through year240.

A single terminal sample is not a stable viability classifier for compact ecology.

## But one recovery is not enough either

Two important counterexamples prevent replacing the old gate with a simple "ever rebounds" rule.

### seed2×10 — failed at year120, recovered, then later extinct

This world passes again at years130/140 and later at 170/180, but enters a terminal low phase and goes extinct around **year220.52**.

Its longest continuous post-year20 population-below-10 span is **52.59 years**, and its longest continuous zero-birth span is **48.62 years**.

### seed2×8 — passing control that later becomes extinct

This world passed the old year120 gate and again at year130, but collapses and goes extinct around **year143.99**.

Therefore the old gate also produces false confidence: passing at year120 does not guarantee long-horizon persistence.

Its longest population-below-10 span reaches **101.81 years** and zero-birth span **122.05 years** once the terminal decline begins.

## True-extinction controls remain distinct over long horizons

All **6/6** true-extinction controls are extinct by year240, and **0/6** ever pass the old gate after year120.

Category medians:

| Group | Worlds | Extinct by 240 | Re-pass after 120 | Median longest pop<10 | Median longest zero-birth | Median gate flips |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| alive-at-120 fail | 8 | 1 | 8 | 20.90y | 18.30y | 6 |
| true-extinction controls | 6 | 6 | 0 | 208.70y | 197.17y | 0 |
| passing controls | 4 | 1 | 4 | 8.52y | 19.09y | 4.5 |

This confirms that trajectories contain much more information than a single terminal checkpoint.

## In-sample recovery-envelope observation

Among the **10 worlds still alive at year240**, the longest observed continuous population-below-10 span is about **33.52 years** (seed6×8), and the longest observed continuous zero-birth span is about **24.18 years** (seed7×10).

Every world that ultimately becomes extinct in this 18-case set has a much longer terminal low/reproduction-stall phase. The shortest such spans among eventual extinctions are seed2×10 at roughly **52.59 years below 10** and **48.62 years with no births**.

Thus a **40-year recovery envelope** is a clean *in-sample candidate* separating persistent-vs-eventually-extinct trajectories in this specific diagnostic set.

It is **not accepted as a project gate yet**. The value 40 is derived after observing these cases and must be validated on unseen compact worlds before it can replace the old terminal metric.

## Interpretation

Compact grazer ecology behaves as a long resource-demography oscillator:

`population growth → vegetation pressure → reproduction suppression → aging/decline → vegetation recovery → sparse reproductive recovery → renewed growth`

Viability cannot be reduced to population at one calendar year. A coherent world may spend decades below the old final-population threshold and later recover. Conversely, a world can pass a terminal checkpoint and later enter an irreversible decline.

The relevant research concept is therefore **recovery capacity over time**, not a fixed target population.

Useful observables are:

- duration of a continuous demographic low phase;
- duration of continuous birth absence;
- whether population/reproduction repeatedly recover after lows;
- extinction itself;
- resource and encounter availability during the low phase.

## Decision

1. **Retire the old single-terminal-sample gate for compact initializer research.** It is demonstrably phase-sensitive and both false-negative and false-positive over longer horizons.
2. Do not change ecology, founder count, or placement based on Sprint 025.
3. Treat the observed **40-year recovery envelope only as a candidate**, not an accepted threshold.
4. Validate that candidate on a separate pre-registered unseen compact-world set before using it to judge initializer mechanics.
5. Only after the persistence gate is independently validated should a separate spatial-seeding experiment target genuine establishment/encounter failures.

Default worlds remain creature-free.

## Cleanup

The 240-year probe and test-script override are temporary research scaffolding and are removed before merge. Runtime behavior remains unchanged.
