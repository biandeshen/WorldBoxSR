# Project status

Last updated: 2026-08-23

## Current state

`main` now contains a deterministic end-to-end living-world slice rather than only a kernel prototype:

- seeded, serializable simulation with exact save/load continuation;
- smooth elevation/moisture fields plus deterministic land/ocean classification;
- passability-aware human movement, food, hunger, aging, reproduction, and death;
- stable causal event IDs and serialized command/entity/event references;
- settlements that form from persistent adult clusters, attract members weakly, can be abandoned while remaining in history, and claim deterministic nearby territory;
- God-command boundary with deterministic human spawning;
- headless CLI, isolated bounded-parallel Simulation Lab, reusable regression scenarios, and machine-readable benchmarking;
- browser Canvas observer with pan/zoom and tile/human/settlement inspection;
- 50 automated tests covering determinism, invariants, social lifecycle/territory, client transforms, regressions, lab isolation, and performance contracts.

## Empirical checkpoints

### 100-seed / 200-year pre-social baseline

The first large baseline (before settlement cohesion) established:

- extinction rate: 0%;
- year-200 population median: 483, mean: 495.7, range: 8–856;
- median food remaining: ~1.96%;
- strong positive relationship between land fraction and final population;
- seed 45 as a useful low-density demographic-collapse sentinel.

### Settlement cohesion

A 5% home bias on non-hungry passive movement makes settlements minimally behavioral without changing global fertility. In seeds 1–10 × 200 years, population mean stayed essentially flat (550.4 → 551.6), while seed 45 recovered from 8 to 128 people. Optional social randomness is keyed/stateless and preserves the authoritative sequential RNG stream.

### Settlement lifecycle

Settlements can now become abandoned after one empty year. Historical settlements are retained, but abandoned sites stop receiving members, stop attracting movement, and stop blocking nearby future settlements. Seed 45 without cohesion preserves its exact old demographic path while naturally producing 1 active + 5 abandoned settlements.

### 10k-agent performance

The authoritative headless simulation benchmarks at roughly 6 ms/tick for 10,000 agents in the recorded hosted environment. A measured founder-creation hotspot was then removed while preserving an exact pre-optimization world-snapshot hash: 10k world creation improved from ~361 ms to ~4.23 ms median-of-medians in fresh-process comparison (~85×).

### Territory v0

Active settlements now own nearby passable cells using bounded-radius deterministic competition. Radius 3 was selected after a coverage scan: it claims roughly 71–76% of passable land in the five 60-year sample worlds, while radius 5 erased almost all wilderness. A paired 5-seed × 60-year check produced byte-identical non-territory state and RNG history between radius 0 and radius 3.

## Sprint 001

Complete. Geography, land/water movement, large baseline, Settlement v0, causal history contract, and client inspection have all shipped through Issue → branch → PR → CI → merge.

## Sprint 002 — make settlements occupy space and history

| Priority | Owner lane | Task | Acceptance signal |
| --- | --- | --- | --- |
| P0 | Simulation + World | settlement territory cells v0 | active settlements claim deterministic nearby land; abandoned sites release it |
| P0 | Test/Research | post-social 100-seed / 200-year baseline | distribution report after cohesion + lifecycle + territory |
| P1 | Client | territory/ownership inspection | ownership visible without becoming authoritative client state |
| P1 | History/Client | timeline/event inspector v0 | inspect major founded/abandoned/command events and causal refs |
| P1 | Simulation | settlement resource accounting spike | evidence-driven decision on whether shared food/storage is the next social mechanic |

## Project-management rule

Do not start kingdoms, diplomacy, war, religion, or a large content pass until active settlements have stable territory semantics and the post-social 100×200 baseline shows no pathological global behavior.
