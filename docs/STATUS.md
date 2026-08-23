# Project status

Last updated: 2026-08-23

## Current state

`main` contains the first end-to-end prototype slice:

- deterministic, serializable seeded simulation;
- renewable tile food;
- humans move, eat, age, reproduce, and die;
- command boundary with a `spawn_human` god action;
- headless single-world CLI;
- multi-seed Simulation Lab;
- minimal browser Canvas client;
- 9 automated deterministic/invariant tests.

## Current empirical baseline

A 20-seed experiment, each running 100 simulated years from 30 founders on a 24x24 map, produced:

- extinction rate: 0%;
- population range: 28–214;
- population median: 85.5;
- population mean: 89.8;
- median food remaining: ~99.1%.

This is a baseline, not a balance target. It already suggests that the current map has excess food at the 100-year horizon and that population pressure only becomes interesting later.

## Sprint 001 — next slices

| Priority | Owner lane | Task | Acceptance signal |
| --- | --- | --- | --- |
| P0 | World | elevation + moisture fields | same seed generates same fields; snapshot includes them |
| P0 | World + Simulation | land/water biome + movement constraint | humans cannot enter water; invariant test added |
| P0 | Test/Research | 100-seed / 200-year baseline | aggregate report + runtime benchmark |
| P1 | Simulation | settlement formation v0 | nearby stable adults can form named settlement aggregates |
| P1 | Client | pan/zoom + tile/entity inspector | inspect a human and tile without mutating simulation |
| P1 | Lead | event causality contract | ADR defining parent/cause links before history grows |

## Project-management rule

Do not start kingdoms, war, religion, tech trees, or elaborate art until settlement formation and world geography are both stable enough to generate useful histories.
