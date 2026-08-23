# Experiment: settlement resource accounting v0

Date: 2026-08-23  
Issue: #30

## Purpose

Determine whether authoritative settlement territory contains enough resource signal to justify adding **behavioral** shared storage/production later. This slice is deliberately derived-only: it observes the existing world and must not change simulation state, RNG, food, movement, reproduction, settlement lifecycle, or territory.

## Derived resource snapshot

For every settlement the accounting layer derives:

- active / abandoned state;
- current settlement population;
- owned passable cells;
- current food on owned cells;
- food capacity on owned cells;
- food remaining fraction;
- food capacity per member;
- current food per member.

Abandoned settlements receive zero current attribution. Zero-member active settlements keep territorial totals but report per-member values as `null` rather than inventing an infinite/zero ratio.

The client settlement inspector uses the same pure helper, so research and UI do not maintain separate resource definitions.

## Purity / determinism gate

A regression query runs a populated 60-year world, snapshots the complete authoritative state and sequential RNG, derives both per-settlement accounts and world distributions, then verifies the world snapshot and RNG are byte-identical afterward.

The accounting layer therefore creates **zero authoritative state** and requires no snapshot-version change.

## Targeted longitudinal study

To test whether a year-100 resource snapshot has useful signal for later settlement outcomes, six structural seeds from the post-social baseline were replayed:

`45, 62, 67, 80, 82, 98`

These include the low-density sentinel, the world with the most historical settlements, the lowest territory/settled share world, the highest-population world, the lowest-food world, and an abandonment world.

Across those seeds there were **37 active settlements at year 100**. Each settlement's year-100 resource account was matched by stable settlement ID to its year-200 population/lifecycle outcome.

### Correlation with year-100 → year-200 absolute population growth

| Year-100 signal | All 37 settlements | Excluding seed 45 |
| --- | ---: | ---: |
| food remaining fraction | **0.780** | **0.864** |
| current food per member | 0.489 | **0.906** |
| food capacity per member | 0.459 | **0.903** |
| year-100 population | -0.634 | -0.707 |

The seed-45 settlements are unusual because very small populations sit on extremely underused territory; excluding that known demographic sentinel reveals a strong relationship between per-capita territorial resources and subsequent growth in this targeted sample.

This is observational evidence, not proof that resource abundance alone causes growth. Population size, land, founding time, and local demography are confounders. The value of the result is that the resource variables are **not noise**: they have enough structure to justify a controlled behavioral experiment.

## Concrete examples

### Underused territory followed by strong growth

Seed 80, settlement #3 at year 100:

- population: 7 → 104 by year 200
- owned cells: 42
- food remaining: 99.09%
- food capacity/member: 38.75

Seed 62, settlement #6:

- population: 10 → 85
- food remaining: 98.81%
- food capacity/member: 29.98

### High pressure followed by stagnation/decline

Seed 82, settlement #5:

- population: 82 → 78
- food remaining: 1.59%
- food capacity/member: 2.85

Seed 67, settlement #4:

- population: 95 → 85
- food remaining: 1.83%
- food capacity/member: 3.01

### Critical counterexample: abundance does not guarantee survival

Seed 98, settlement #5 at year 100:

- population: 11 → 0; abandoned by year 200
- owned cells: 24
- food remaining: **96.06%**
- food capacity/member: **14.26**

This settlement disappears despite abundant territorial resources. The result protects the project from a simplistic "economy explains everything" model: demographic cohesion/encounter structure can independently kill a settlement.

## Decision

The accounting signal is strong enough to justify a **narrow shared-food-storage experiment**, but not a general economy system.

The next behavioral experiment should:

1. give active settlements a small deterministic food store;
2. define an explicit, bounded way for territorial surplus to enter the store;
3. allow current members to use stored food only under clearly defined local scarcity;
4. avoid production bonuses, jobs, trade, taxation, buildings, or kingdoms;
5. run A/B multi-seed comparisons with storage disabled/enabled;
6. keep seed 45 and seed 98 as separate guards: storage must not reintroduce population explosion, and it must not magically save demographically dead settlements merely because resources exist.

If storage does not improve interpretable scarcity-driven outcomes without flattening settlement diversity, it should be removed rather than expanded.
