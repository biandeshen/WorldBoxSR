# Experiment: deterministic settlement territory v0

Date: 2026-08-23  
Issue: #26

## Mechanic

Active settlements claim nearby passable tiles. Ownership is authoritative serialized state on each tile (`ownerSettlementId`) but is intentionally **behavior-neutral** in v0: it does not affect movement, food, reproduction, membership, or RNG.

For each active settlement, only a bounded square around its center is scanned. Chebyshev distance determines eligibility and nearest-center ownership; exact ties resolve to the lower stable settlement ID. Ocean tiles are never claimable. Abandoned settlements claim no land, and territory is recomputed immediately after lifecycle changes on the authoritative settlement update interval.

Snapshot schema advances from v3 to v4 because ownership is serialized state.

## Radius selection

A small coverage scan was run after 60 simulated years for seeds 1–5 (24×24, 30 founders). Settlement behavior was held constant while territory was recomputed at candidate radii.

| Seed | Active settlements | radius 2 | radius 3 | radius 4 | radius 5 |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 7 | 43.4% | 71.6% | 88.9% | 97.3% |
| 2 | 3 | 44.3% | 75.7% | 96.4% | 100.0% |
| 3 | 6 | 42.5% | 74.5% | 94.0% | 99.4% |
| 4 | 7 | 41.5% | 71.4% | 91.6% | 100.0% |
| 5 | 6 | 45.4% | 71.1% | 88.9% | 97.5% |

Radius 5 effectively erases wilderness on these small worlds. Radius 3 leaves roughly one quarter to three tenths of passable land unclaimed while still making settlements spatially meaningful, so `settlementTerritoryRadius = 3` is the v0 default.

## Behavior-neutrality check

Seeds 1–5 were each run twice for 60 years: once with radius 0 and once with the selected radius 3. For every pair, the following were exactly equal:

- sequential RNG snapshot;
- births/deaths/meals counters;
- every human entity field;
- every settlement field;
- complete event history;
- every non-territory tile field.

Only `ownerSettlementId` differed. The radius-3 coverage at year 60 was 71.1–75.7% across the five seeds.

This is the key contract for v0: territory creates spatial state without changing demographic history yet.

## Performance

The standard 10k-agent benchmark was repeated in fresh processes. Median tick results remained in the same broad range as the pre-territory baseline/optimization runs (approximately 5.9–6.4 ms/tick in repeated 10k-only runs).

A territory-focused microbenchmark used a 64×64 all-land map with 64 active settlements and radius 3. After warm-up, 2,000 recomputations were sampled in batches; median cost was approximately **0.019 ms per full territory recompute** (observed range ~0.017–0.022 ms in this hosted environment).

The bounded-radius algorithm therefore adds negligible cost at the current scale and avoids an O(tiles × settlements) global competition pass.

## Decision

Ship territory v0 as passive authoritative ownership with radius 3. Do not add economic value, border conflict, expansion pressure, or conquest until the post-social 100-seed / 200-year baseline has measured the combined settlement/cohesion/lifecycle/territory world.
