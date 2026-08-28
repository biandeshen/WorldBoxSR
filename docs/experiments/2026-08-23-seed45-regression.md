# Seed 45 regression — low-density demographic collapse

Date: 2026-08-23  
Scenario: `seed45-demographic-collapse`  
Purpose: preserve the strongest structural outlier from the first 100-seed / 200-year baseline while settlement, movement, reproduction and material-life mechanics evolve.

## Reproduce

```bash
npm run scenario -- seed45-demographic-collapse
```

World parameters are fixed at seed 45, 24×24, 30 founders. Checkpoints are recorded at years 40, 100, 160, and 200.

## Before vs after Settlement v0

The pre-settlement baseline report recorded this population trajectory:

| Year | Population |
| ---: | ---: |
| 40 | 46 |
| 100 | 23 |
| 160 | 16 |
| 200 | 8 |

After Settlement v0, the trajectory is **exactly the same: 46 → 23 → 16 → 8**. The year-200 totals also remain **41 births / 63 deaths**.

That exact match is important evidence: Settlement v0 currently observes local clustering and assigns membership, but it does not alter movement, food access, or reproduction. It therefore does not solve — or cause — the demographic collapse.

## What the original social layer revealed

Settlements do form in this world. Six have been founded by year 200, but only six of the eight surviving humans are settlement members at the final checkpoint. Several historical settlements are nearly empty or empty.

Meanwhile year-200 food remaining is **99.86%** of capacity. The population is not being limited by resources.

The strongest working explanation remains a low-density encounter / demographic Allee effect:

1. humans diffuse over a relatively large connected landmass;
2. reproduction requires a locally eligible male in the 3×3 neighborhood;
3. founder sex imbalance and diffusion reduce encounter probability;
4. lower density further reduces encounters, creating a self-reinforcing decline.

## Design rule

Do not “fix seed 45” by globally raising fertility. Future settlement cohesion, home-range, migration, family/household or material-life mechanics should be tested against this scenario first. If the population trajectory changes materially, the PR must explain which local structural mechanic caused the change and whether the result is bounded enough to keep the broader sandbox credible.

The automated regression intentionally pins the current checkpoint trajectory. It may be updated when a deliberate mechanic changes the scenario, but only together with an experiment note documenting the causal change.

## Update: minimal settlement cohesion

Issue #17 adds a 5% stateless home-bias chance to **non-hungry passive movement** for current settlement members. Hungry food-seeking remains unchanged. The home-bias decision uses keyed deterministic randomness and preserves the baseline sequential RNG draw, so enabling the mechanic does not shift unrelated random sequences merely by consuming extra RNG.

With cohesion enabled, seed 45 changes to:

| Year | Population | Births | Deaths | Settlements |
| ---: | ---: | ---: | ---: | ---: |
| 40 | 44 | 14 | 0 | 3 |
| 100 | 35 | 44 | 39 | 3 |
| 160 | 65 | 93 | 58 | 5 |
| 200 | 128 | 184 | 86 | 7 |

Year-200 food remaining is still **96.45%**, and 104 of 128 humans are settlement members. The recovery therefore comes from sustained local population centers increasing encounter opportunities, not from a global fertility increase or from consuming substantially more of the world's carrying capacity.

This is a deliberate material change to the regression scenario, so the automated checkpoint expectations are updated together with this evidence.

## Update: v1.1 Settlement Food Reserves

Capability #328 makes settlement territory a real material-life input for the first time. The new behavior is intentionally narrow:

- active settlements harvest only surplus food above the 65% local ecological floor;
- reserve capacity is `2 + 2 × current population`;
- monthly harvest budget is `0.5 × population`;
- hungry members consume current-tile food first, then their own settlement reserve only while standing on their own settlement territory;
- harvest and reserve draw add no RNG, but successful reserve use can prevent the old move-toward-food action and therefore legitimately change which later sequential movement/reproduction branches execute.

Hosted CI on 2026-08-28 produced the following deterministic v1.1 checkpoint trajectory:

| Year | Population |
| ---: | ---: |
| 40 | 44 |
| 100 | 35 |
| 160 | 65 |
| 200 | 125 |

The audited year-200 state is:

| Metric | Cohesion baseline | v1.1 reserve | Change |
| --- | ---: | ---: | ---: |
| Population | 128 | 125 | -3 (-2.34%) |
| Births | 184 | 180 | -4 (-2.17%) |
| Deaths | 86 | 85 | -1 (-1.16%) |
| Settled population | 104 | 91 | -13 (-12.50%) |
| Food remaining / capacity | 96.45% | 95.77% | -0.68 pp |
| Settlements | 7 | 7 | unchanged |

Interpretation:

1. **No runaway survival amplification.** Total population, births and deaths move only a few percent and the world remains strongly food-abundant at year 200.
2. **The causal path is expected.** Reserve draw changes whether some hungry humans continue into the old food-seeking movement branch. That can change later encounter/reproduction history even though reserve harvest/draw itself consumes no RNG.
3. **Settlement composition moves more than total survival.** The settled-population count falls from 104 to 91. This is a meaningful local-distribution change and should remain visible in later multi-seed/canonical Settlement Life review, but it is not evidence of resource-system instability by itself.
4. **Do not tune constants merely to recover the old fingerprint.** The purpose of this capability is to introduce a material settlement loop. Tuning is warranted only if broader evidence shows survival or resource pressure is too strong, not because a deliberately behavioral capability changed one historical sentinel.

The automated seed45 regression is therefore re-pinned to `44 → 35 → 65 → 125`, `180 births`, `85 deaths`, `91 settled population`, `7 settlements`, with food remaining above 95% of capacity.
