# Experiment: reuse passable founder spawn tiles

Date: 2026-08-23  
Issue: #22  
Baseline: #21

## Problem

Random-position `createHuman()` previously evaluated `world.tiles.filter(isTilePassable)` for every human. During `createWorld({ population: N })`, the same ordered passable-tile array was rebuilt N times even though terrain is immutable during founder creation.

This was the clearest hotspot identified by the 10k-agent performance baseline: tick scaling was already close to linear, while world creation performed redundant O(population × tileCount) scans and allocations.

## Change

`createWorld()` now computes the ordered passable founder tiles once after terrain creation and passes that transient list to `createHuman()` during the founder loop. The list is not stored in world state and is not serialized. Normal `createHuman()` calls without this internal context keep the previous behavior, and explicit-position spawning is unchanged.

The optimization deliberately preserves the exact call to `world.rng.int(passable.length)` for every randomly positioned founder. Candidate order is identical to the old `world.tiles.filter(isTilePassable)` result.

## Semantic identity guard

Before optimization, the full JSON snapshot for:

- seed: 314159
- world: 16×12
- founders: 64

was pinned to SHA-256:

`4b70996f6c189d98bcf6890abb213c70e342363a9b16bf39b816d196e7a57af8`

The optimized implementation produces the same digest exactly. This covers terrain, RNG state, all founder positions/attributes, counters, IDs, history, config, and serialized settlement state — not merely population counts.

## 10k-only before/after comparison

To avoid scenario-order/JIT ambiguity, the pre- and post-change versions were each launched in three fresh Node processes. Every process ran the same 10,000-founder / 64×64 workload with 5 repetitions, 5 warm-up ticks, and 30 measured ticks.

### Creation median per fresh process

| Run | Before | After |
| ---: | ---: | ---: |
| 1 | 358.58 ms | 4.23 ms |
| 2 | 361.30 ms | 4.04 ms |
| 3 | 397.07 ms | 4.35 ms |

Median-of-medians: **361.30 ms → 4.23 ms**, approximately **85× faster**.

### Tick median per fresh process

| Run | Before | After |
| ---: | ---: | ---: |
| 1 | 5.93 ms | 6.60 ms |
| 2 | 5.95 ms | 5.96 ms |
| 3 | 6.73 ms | 6.16 ms |

There is no consistent tick-time regression signal; tick execution is outside the changed initialization path. Every measured sample finished with the same population (10,179 after benchmark warm-up + measurement).

## Decision

Merge the focused optimization. It removes a measured structural redundancy, produces a large creation-time improvement, and is protected by a byte-level deterministic-world fingerprint. No broader caching, ECS conversion, worker-thread architecture, or spawn-distribution change is justified by this result.
