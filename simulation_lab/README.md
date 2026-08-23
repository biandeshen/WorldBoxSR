# Simulation Lab

The lab runs deterministic worlds in bulk so mechanics can be judged by distributions rather than by one interesting seed.

## In-process batch

Good for small, fast checks:

```bash
npm run lab -- --start-seed 1 --seeds 20 --years 100
```

## Isolated bounded-parallel batch

For longer experiments, pass `--workers`. Each seed runs in its own Node process, so a slow/crashed seed cannot poison the rest of the batch:

```bash
npm run lab -- --start-seed 1 --seeds 100 --years 200 --workers 4 --timeout-ms 30000 --json
# or use the default 4-worker convenience script
npm run lab:parallel -- --start-seed 1 --seeds 100 --years 200 --json
```

Properties:

- results are returned in seed order, independent of worker completion order;
- each seed has its own timeout and failure record;
- completed seeds are retained if another seed fails;
- aggregate statistics are computed from successful runs only;
- `workers=1` uses the same isolated execution path as `workers>1`, which makes experiment comparisons straightforward.
