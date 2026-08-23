# Project status

Last updated: 2026-08-23

## Current state

`main` contains a deterministic living-world simulation with geography, people, settlements, territory, causal history, and evidence-driven social analysis. The active development branch for #32 adds the first household/family history layer.

Current shipped capabilities include:

- seeded, serializable simulation with exact save/load continuation;
- smooth elevation/moisture fields and deterministic land/ocean classification;
- passability-aware human movement, food, hunger, aging, reproduction, and death;
- stable causal event IDs and serialized command/entity/event references;
- settlements that form, exert weak home bias, can be abandoned, and claim deterministic nearby territory;
- read-only settlement resource accounting derived from territory, food, and current population;
- headless CLI, resumable isolated Simulation Lab, regression scenarios, and machine-readable benchmarking;
- browser Canvas observer with pan/zoom and tile/human/settlement inspection;
- post-social 100-seed / 200-year baseline showing demographic stability and removal of the catastrophic low-density tail.

## Active work — household / family v0

Issue #32 adds the missing history layer between humans and settlements without changing population behavior:

- persistent household records with stable IDs;
- parent/child lineage references;
- children inherit a deterministic maternal household convention in v0;
- household generation depth and historical membership;
- derived household/family metrics;
- snapshot schema v5.

No marriage, inheritance, class, politics, or household behavior is introduced in this slice.

## Empirical checkpoints

### Post-social 100×200 baseline

All 100 seeds completed successfully. Year-200 population median/mean are 489 / 496.68 versus 483 / 495.7 before social cohesion. The minimum rose from 8 to 128 while the center stayed almost unchanged. Median settled-population share is ~86% and median territory coverage ~83%.

### Settlement resource accounting

Resource accounting is derived-only. Observational sampling shows territorial food remaining has a strong relationship with subsequent settlement growth in the measured sample, but abundant food is not sufficient for survival: settlement decline can still occur through demographic/social structure. This is why household/family structure is being added before turning resource accounting into a broad economic system.

## Project-management rule

Do not jump to kingdoms/war because the labels are attractive. Continue adding the smallest social mechanisms that explain observed world histories, while preserving deterministic regression baselines and measuring distributions after meaningful behavioral changes.
