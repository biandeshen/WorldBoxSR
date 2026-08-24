# Settlement shared-food-storage v0 — rejected causal experiment

Date: 2026-08-24  
Issue: #79  
PR: #80

## Question

Settlement resource accounting showed that territorial food conditions contain real predictive signal for later population growth. Sprint 003 therefore tested the narrowest plausible behavioral follow-up:

> Can a small deterministic settlement food store buffer temporary local scarcity without becoming a broad demographic amplifier or rescuing settlements whose failure is not resource-driven?

The experiment was explicitly opt-in and never enabled by default.

## Experimental mechanism

The prototype deliberately avoided a general economy system.

When `settlementFoodStorageEnabled: true` was supplied:

- each active settlement received a bounded store;
- experimental capacity = **8 food units**;
- each existing settlement update cadence could transfer at most **25% of territorial surplus** above an **85% tile-capacity reserve**;
- transfer removed real food from owned tiles and was proportionally distributed across surplus tiles;
- a current active member could use storage only after the normal local path failed: current-tile eat → existing move-toward-food → destination eat → store fallback;
- no movement preference, birth probability, food production/regeneration bonus, jobs, buildings, trade, tax, private inventory, or new RNG draw was introduced;
- abandoned settlements could no longer deposit/feed, and any remainder was stranded in the historical record.

The prototype passed conservation, lifecycle, save/load, disabled-path neutrality, and parameter validation tests. With storage disabled, existing simulation behavior and seed45 regression remained unchanged.

## 100-year A/B

Seeds **1, 4, 9, 45, 80, 98** were run OFF vs ON with identical world setup.

| Seed | Population OFF | Population ON | Δ pop | Store meals |
|---:|---:|---:|---:|---:|
| 1 | 306 | 306 | 0 | 0 |
| 4 | 159 | 159 | 0 | 0 |
| 9 | 207 | 224 | +17 | 1,611 |
| 45 | 35 | 35 | 0 | 0 |
| 80 | 112 | 112 | 0 | 0 |
| 98 | 431 | 438 | +7 | 379 |

This first horizon looked promising in one important sense: storage was **not** a universal bonus. Several worlds filled stores but never used a stored meal, and seed45 remained byte-level demographically unchanged at the observed summary level.

However, seed9 already demonstrated that the mechanism could generate substantial long-run feedback once storage actually participated in meals.

## 200-year A/B

The same six seeds were extended to 200 years.

| Seed | Population OFF | Population ON | Δ pop | Store meals | Active settlements OFF→ON |
|---:|---:|---:|---:|---:|---:|
| 1 | 662 | 667 | +5 | 161 | 9→9 |
| 4 | 805 | 818 | +13 | 92 | 7→7 |
| 9 | 609 | 630 | +21 | 1,770 | 9→9 |
| 45 | 128 | 128 | 0 | 0 | 7→7 |
| 80 | 871 | 857 | -14 | 133 | 10→10 |
| 98 | 404 | 452 | +48 | 651 | 6→7 |

The population center did **not** explode:

- OFF sorted populations: 128, 404, 609, 662, 805, 871;
- ON sorted populations: 128, 452, 630, 667, 818, 857;
- median: **635.5 → 648.5** (~+2.0%);
- mean: ~**579.8 → 592.0** (~+2.1%).

Seed45 remained exactly unchanged and used zero store meals, so the storage prototype did not recreate the earlier sparse-world over-amplification failure.

But seed98 triggered the harder Sprint 003 guard:

- OFF: 7 historical settlements, **6 active / 1 abandoned**;
- ON: the same 7 historical settlements, **7 active / 0 abandoned**;
- settled population: **348 → 403**;
- territory coverage: **74.78% → 85.40%**.

The known resource-rich demographic-failure settlement had apparently been rescued.

## Seed98 causal audit

A targeted checkpoint audit at years 100, 120, 140, 160, 180, and 200 confirmed that the rescued settlement is exactly **#5 Pineford**, the counterexample already identified by the resource-accounting study.

### OFF trajectory — resource abundance, demographic collapse

| Year | Population | Food remaining | Food/member | Capacity/member |
|---:|---:|---:|---:|---:|
| 100 | 11 | 96.06% | 13.697 | 14.259 |
| 120 | 8 | 97.81% | 19.177 | 19.607 |
| 140 | 7 | 98.18% | 22.000 | 22.408 |
| 160 | 3 | 99.37% | 51.953 | 52.284 |
| 180 | 0 / abandoned | — | — | — |
| 200 | 0 / abandoned | — | — | — |

Pineford abandoned at world day **63,630** despite overwhelming territorial food abundance. This reproduces the earlier evidence that its failure is not a food-capacity problem.

### ON trajectory — divergence before store use

| Year | Population | Food remaining | Stored food | Cumulative withdrawals | Store meals |
|---:|---:|---:|---:|---:|---:|
| 100 | 16 | 90.52% | 8 | 0 | 0 |
| 120 | 29 | 61.54% | 8 | 0 | 0 |
| 140 | 52 | 1.62% | 0 | 8.0109 | 13 |
| 160 | 53 | 1.55% | 0 | 8.0109 | 13 |
| 180 | 48 | 1.32% | 0 | 8.0109 | 13 |
| 200 | 48 | 1.84% | 0 | 8.0109 | 13 |

This is the decisive result:

**Pineford's rescue begins before Pineford consumes a single stored meal.**

At year100 and year120 its store is still completely full and withdrawals are exactly zero, yet its population has already diverged from the OFF world:

- year100: **11 OFF vs 16 ON**;
- year120: **8 OFF vs 29 ON**.

Only around the year140 interval does Pineford itself finally consume approximately 8 food units / 13 stored meals.

Therefore its survival cannot be interpreted as “Pineford experienced scarcity, used its buffer, and survived.”

## Where the indirect effect comes from

Other settlements use storage much earlier and much more heavily, altering the global demographic/spatial trajectory.

For example settlement #1 Briarmere in the ON world:

- year100: population 83 vs OFF 71; **326 store meals**, ~117 food deposited/withdrawn;
- year120: **550 cumulative store meals**;
- year140 onward: **585 cumulative store meals**.

The ON world also changes settlement chronology: settlement #7 is founded at day **26,280** versus **28,320** OFF.

These changes shift population distribution, movement histories, reproduction opportunities, settlement membership, and later territorial occupancy. Pineford becomes repopulated as an **indirect whole-world consequence** of scarcity buffering elsewhere, not as a local response to its own food shortage.

This distinction matters because the explicit Sprint 003 gate required storage not to become a magic explanation for a settlement whose documented failure was demographic/spatial rather than resource-driven.

## Decision

**Reject settlement shared-food-storage v0 as a runtime mechanic.**

The implementation is mechanically sound but causally too broad for the current simulation:

1. food transfer is conserved and deterministic;
2. the default/disabled world remains unchanged;
3. storage is selective rather than a universal population buff;
4. nevertheless, local scarcity buffering in one settlement can propagate through demographic/spatial feedback and indirectly rescue an unrelated resource-rich demographic failure;
5. the rescued seed98 settlement diverges long before it uses its own store, so its outcome cannot be attributed to the intended local mechanism;
6. keeping the prototype and searching capacity/reserve/deposit parameters would risk another fragile “magic parameter window” rather than improve causal clarity.

No storage runtime code from this experiment should enter `main`.

## Next research gate

Before any storage v1, measure **settlement-level scarcity episodes** directly.

The next observer should distinguish:

- ordinary individual local-tile/path food failure;
- settlement territory that still has abundant collective food;
- true settlement-level scarcity where territorial food is low relative to current members/meal demand;
- duration and recurrence of those scarcity episodes;
- which settlements later shrink, recover, or abandon.

A future storage mechanism is only justified if it can be gated by a transparent settlement-level scarcity condition rather than every individual local eating failure.

This keeps the causal claim narrow:

> buffer a measured settlement scarcity episode,

rather than:

> inject a distributed demographic stabilizer anywhere local geometry makes a meal temporarily unavailable.

## Repository action

PR #80 is intentionally reduced to this negative experiment report. The prototype runtime module, human/settlement hooks, storage tests, and temporary A/B/audit probes are removed before merge. The negative evidence is retained so future agents do not repeat the same broad mechanism or parameter search.
