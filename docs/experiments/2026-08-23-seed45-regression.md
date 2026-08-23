# Seed 45 regression — low-density demographic collapse

Date: 2026-08-23  
Scenario: `seed45-demographic-collapse`  
Purpose: preserve the strongest structural outlier from the first 100-seed / 200-year baseline while settlement, movement, and reproduction mechanics evolve.

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

## What the current social layer reveals

Settlements do form in this world. Six have been founded by year 200, but only six of the eight surviving humans are settlement members at the final checkpoint. Several historical settlements are nearly empty or empty.

Meanwhile year-200 food remaining is **99.86%** of capacity. The population is not being limited by resources.

The strongest working explanation remains a low-density encounter / demographic Allee effect:

1. humans diffuse over a relatively large connected landmass;
2. reproduction requires a locally eligible male in the 3×3 neighborhood;
3. founder sex imbalance and diffusion reduce encounter probability;
4. lower density further reduces encounters, creating a self-reinforcing decline.

## Design rule

Do not “fix seed 45” by globally raising fertility. Future settlement cohesion, home-range, migration, or family/household mechanics should be tested against this scenario first. If the population trajectory changes materially, the PR must explain which local structural mechanic caused the change and whether the result improves the broader seed distribution.

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
