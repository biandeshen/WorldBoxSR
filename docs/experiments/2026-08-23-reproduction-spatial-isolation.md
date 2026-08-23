# Reproduction drought spatial-isolation study — 2026-08-23

Issue: #51

## Question

Previous work established a chain of negative and positive evidence:

- #43: seed45 has eligible males globally but very poor radius-1 mating opportunity.
- #45: adding a wider independent conception channel overcorrects long-run population.
- #47: seed45 has unusually long reproduction-opportunity droughts.
- #49: the same encountered male often remains alive and reproduction-eligible, so partner death is not the missing explanation.

The unresolved question was spatial: are seed45's droughts caused by disconnected land, settlement sex imbalance, cross-settlement separation, or people simply failing to remain spatially/socially concentrated?

## Method

A derived-only observer samples the authoritative world at the start of every day for 100 years. It uses:

- authoritative active `human.settlementId` membership, not territory ownership;
- 8-neighbor passable-land components, matching actual human movement adjacency;
- nearest reproduction-eligible male distance on drought-days;
- bounded 360-day / 8-ID remembered-partner context only to classify where a still-eligible previously encountered partner currently is.

Probe worlds: seeds 1, 4, 9, 45, 80, 98; 24×24; initial population 30.

## Headline result

**Seed45 is not an island/topology problem. It is a settlement participation and spatial-cohesion problem.**

Every seed45 drought-day had an eligible male in the same connected passable-land component. Its map is one single passable component. What distinguishes seed45 is that both sexes remain unusually dispersed outside active settlements, even after settlements exist, and even settled people remain much farther apart than controls.

## Key comparison: seed45 vs seed80

Seed80 is the most useful control because it is also sparse and forms its first settlement at nearly the same time.

| metric | seed45 | seed80 |
| --- | ---: | ---: |
| population @100y | 35 | 112 |
| first settlement year | 21.33 | 20.58 |
| eligible-female drought share | **87.34%** | 62.68% |
| pre-settlement share of all drought-days | **61.25%** | 40.43% |
| eligible female settled share after settlements exist | **34.23%** | 56.58% |
| whole-horizon eligible male settled share* | **32.75%** | 58.60% |
| drought-days unsettled after settlements exist | **67.76%** | 49.41% |
| settled-female drought rate | **75.96%** | 48.99% |
| whole-horizon unsettled-female drought rate** | **89.25%** | 71.27% |
| same-settlement male exists on settled drought-days | 66.63% | 90.03% |
| zero-male settlement share of settled drought-days | 33.37% | 9.97% |
| nearest eligible male median distance | **4** | 3 |
| nearest eligible male P90 distance | **9** | 5 |
| same passable component has eligible male | **100%** | 100% |
| true cross-component-only drought | **0%** | 0% |
| nearest eligible male is unsettled | **85.72%** | 68.40% |
| remembered eligible partner is unsettled | **83.38%** | 67.67% |

\* Whole-horizon male share includes the pre-settlement era and is used only as a supporting comparison. Because seed45 and seed80 have nearly identical first-settlement timing, the contrast remains informative, but it is not presented as a post-settlement conditional rate.

\** This denominator also includes pre-settlement eligible female-days; the post-settlement participation metrics above are the preferred evidence for retention after settlement formation.

## Controls

| seed | first settlement year | drought share | settled eligible female share after settlements exist | settled-female drought rate | nearest male median / P90 | cross-component-only drought |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 0.67 | 46.31% | 64.05% | 36.63% | 2 / 5 | 0% |
| 4 | 24.25 | 54.37% | 71.53% | 43.05% | 2 / 4 | 0% |
| 9 | 2.33 | 39.13% | 74.69% | 34.12% | 2 / 3 | 0.15% |
| 45 | 21.33 | **87.34%** | **34.23%** | **75.96%** | **4 / 9** | **0%** |
| 80 | 20.58 | 62.68% | 56.58% | 48.99% | 3 / 5 | 0% |
| 98 | 0.42 | 9.26% | 82.22% | 6.82% | 2 / 3 | 0.19% |

Seed4 is another useful timing control: its first settlement is even later (year 24.25), yet once settlements exist 71.53% of eligible female-days are settled and its settled-female drought rate is only 43.05%. Therefore seed45 cannot be explained by late founding alone.

## Decomposition

### 1. Disconnected terrain is ruled out

Seed45 has exactly one passable 8-neighbor land component containing all 376 passable tiles. On 100% of seed45 drought-days, at least one eligible male exists in the same component. There are no cross-component-only drought-days.

Seed98 makes the contrast stronger: its map actually has two components and the largest contains only 88.05% of passable tiles, yet cross-component-only drought is only 0.19% and overall drought is only 9.26%.

**Decision:** do not treat bridges, island migration, or global terrain connectivity as the seed45 fix.

### 2. Late settlement founding matters, but is not sufficient

61.25% of seed45 drought-days occur before any active settlement exists. So its ~21-year delay in settlement emergence contributes materially to early demographic weakness.

However, seed80 forms its first settlement at year 20.58 and seed4 at year 24.25. Both perform substantially better afterward. The decisive difference is what happens **after** settlement formation.

### 3. Seed45 fails to capture/retain eligible adults in settlements

Once at least one active settlement exists:

- seed45: only 34.23% of eligible female-days are settled;
- seed80: 56.58%;
- seed4: 71.53%;
- seed98: 82.22%.

Correspondingly, 67.76% of seed45 drought-days after settlements exist still occur while the female is unsettled.

This is the clearest current evidence that seed45's long drought tail is driven by weak settlement participation/retention rather than missing males.

### 4. Settlement membership helps, but seed45 is still too dispersed inside settlements

Being settled is associated with lower drought in every sampled world, but seed45 remains pathological even there:

- seed45 settled-female drought rate: 75.96%;
- seed80: 48.99%;
- seed4: 43.05%;
- seed1: 36.63%;
- seed98: 6.82%.

And on two thirds (66.63%) of seed45's **settled** drought-days, the same active settlement already contains an eligible male. The problem is then not settlement sex balance; it is that members of the same settlement are spatially too far apart for the current radius-1 reproduction gate.

Thus there are two nested failures:

1. many eligible adults are outside any settlement;
2. even when they share a settlement, seed45 members often do not remain locally co-located.

### 5. Remembered partners confirm the same story

Among seed45 drought-days with a remembered still-eligible partner, 83.38% of those partners are currently unsettled. Only 6.80% share the female's settlement and 2.06% are in another settlement; the remainder are settled while the female is not.

All remembered eligible partners are on the same connected land component as the female. Again, partner identity survives; local spatial organization does not.

## Interpretation

The evidence now points away from fertility tuning, broader mating radius, pair-memory conception, and terrain connectivity. The next causal layer is **settlement membership churn and home-distance excursions**.

Current mechanics explain why this is plausible:

- settlement membership is recomputed only every 30 days;
- a human is a member only while within `settlementMembershipRadius = 3` of an active settlement center at the membership update;
- settled non-hungry passive movement has only a weak `settlementHomeBiasChance = 0.05` toward the settlement center;
- people can therefore drift beyond the membership radius, become unsettled on the next update, and later potentially rejoin.

The present study does not yet prove churn is the mechanism, because it observes membership state rather than transition histories. That should be measured before changing the home-bias strength or membership rule.

## Decision

- Keep reproduction/fertility behavior unchanged.
- Do not implement pair-bond conception, wider mating radius, or terrain-connectivity fixes.
- Keep the spatial-isolation observer as a reusable research instrument.
- Next, measure settlement join/leave/rejoin churn and distance-from-home excursions, especially seed45 vs seed80.
- Only after that measurement consider a narrowly attributable settlement-retention/home-cohesion behavior experiment.
