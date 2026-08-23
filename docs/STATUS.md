# Project status

Last updated: 2026-08-23

## Current state

`main` contains a deterministic living-world simulation with geography, people, settlements, territory, causal history, resource accounting, and ancestry history.

Shipped social-history layers include:

- stable parent/child ancestry references;
- persistent maternal founder-line identity across generations;
- generation depth and historical membership;
- derived lineage extinction/orphan metrics;
- post-social demographic and selected lineage probes.

## Active architecture correction — lineage vs household

Issue #36 corrects a semantic mistake before it becomes behavioral debt.

The persistent maternal groups introduced in #32 were initially named `households`. A 200-year probe showed surviving records with 86–379 living members and most founder records extinct. These are clearly **lineages**, not residential households.

The authoritative model is therefore being renamed to:

- `lineages` / `nextLineageId` in world state;
- `lineageId` on humans;
- lineage metrics such as extinct-lineage share and living lineage size;
- snapshot schema v6.

The term **household** is now reserved for a future dynamic residential/social unit whose membership may form, split, merge, move, and expire. No such household behavior exists yet.

## Empirical checkpoints

### Post-social 100×200 baseline

All 100 seeds completed successfully. Year-200 population median/mean are 489 / 496.68 versus 483 / 495.7 before social cohesion. The minimum rose from 8 to 128 while the center stayed almost unchanged. Median settled-population share is ~86% and median territory coverage ~83%.

### Lineage probe

At year 200:

- seed 45: 30 founder lines, 27 extinct, max living lineage 86, max generation 8;
- seed 80: 30 founder lines, 26 extinct, max living lineage 379, max generation 9;
- seed 98: 30 founder lines, 22 extinct, max living lineage 87, max generation 9.

This evidence is why no co-residence/storage/inheritance behavior is being attached to lineage identity.

### Settlement resource accounting

Resource accounting remains derived-only. Territorial food pressure has useful growth signal, but abundant food does not guarantee settlement survival; demographic/lineage structure remains independently relevant.

## Project-management rule

Do not jump to kingdoms/war or attach behavior to convenient labels. Correct abstractions first, then introduce the smallest causal mechanism supported by experiments.
