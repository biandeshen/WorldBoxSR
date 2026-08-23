# Performance baseline: 1k / 10k agents

Date: 2026-08-23  
Issue: #21  
Benchmark version: 1

## Reproduce

Human-readable:

```bash
npm run bench
```

Machine-readable (pure JSON on stdout):

```bash
node tools/benchmark.js --json
```

Default workload:

- seed: 20260823
- world: 64×64
- populations: 1,000 and 10,000 founders
- repetitions: 5
- warm-up: 5 authoritative simulation ticks
- measurement: 30 authoritative simulation ticks
- no renderer and no simplified benchmark-only simulation path

## Environment for this baseline

- Node: v22.16.0
- platform: linux x64
- logical CPUs visible to process: 5
- reported CPU model: AMD EPYC 9V74 80-Core Processor

This is a hosted/virtualized execution environment, so absolute timings should be compared only against runs from comparable environments. The benchmark tool exists primarily to make before/after changes reproducible.

## Results

| Metric | 1,000 agents | 10,000 agents |
| --- | ---: | ---: |
| creation median | 43.28 ms | 356.88 ms |
| creation range | 37.15–48.63 ms | 354.88–365.41 ms |
| tick median | 0.567 ms | 6.028 ms |
| tick range | 0.524–1.172 ms | 5.755–6.363 ms |
| median ticks/sec | 1,764.0 | 165.9 |
| RSS median | 74.6 MiB | 94.7 MiB |
| heap-used median | 10.3 MiB | 23.6 MiB |
| population after 35 total ticks | 1,019 | 10,179 |

A 10× population increase produces approximately 10.63× the median tick cost in this workload. That is close enough to linear that there is no evidence here for a broad architecture rewrite.

## Interpretation

### Tick path

At 10k agents the headless simulation still runs around 166 ticks/sec in this environment. Current human updates are largely O(population) with bounded local-neighbor work, and the benchmark does not show a catastrophic superlinear knee at 10k.

This does **not** mean 10k is automatically cheap in the browser: rendering and future territory/kingdom systems are separate costs. It does mean the current simulation kernel is healthy enough to continue incrementally rather than prematurely replacing it with ECS/worker-thread architecture.

### Creation path hotspot

`createHuman()` currently calls `world.tiles.filter(isTilePassable)` whenever a spawn position is not supplied. During `createWorld({ population: N })`, that repeats a full tile scan for every founder: O(population × tileCount) temporary work and allocations.

The benchmark still creates a 10k world in under 0.4 seconds here, so this is not an emergency. It is, however, the clearest low-risk optimization target because it is structurally redundant and can be improved without changing simulation semantics or RNG ordering.

## Decision

- Keep the current single-threaded deterministic architecture.
- Use this benchmark before/after any major simulation-system addition.
- Open a focused follow-up for passable spawn-tile reuse rather than bundling optimization into this measurement PR.
- Revisit architectural scaling only if future benchmarks show a real nonlinear threshold or unacceptable tick budget.
