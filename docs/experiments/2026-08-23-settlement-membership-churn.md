# Settlement membership churn and reattachment study — 2026-08-23

Issue: #53

## Question

The spatial-isolation study (#51) showed that seed45's reproduction drought is not caused by disconnected terrain or a global lack of eligible males. After settlements exist, seed45 still leaves many reproduction-age adults socially unsettled, and even settled adults are often too dispersed for the radius-1 reproduction gate.

A natural hypothesis was that seed45 might simply churn out of settlement membership more often because the weak home bias fails to keep people inside the membership radius.

This study tests that hypothesis directly.

## Method

A derived-only observer samples authoritative settlement membership daily for 100 years. It tracks one compact record per living human and aggregate histograms/counters; no per-human daily trajectory is retained.

For all adults and, separately, females aged 18–45, it measures:

- first joins, `settlement → null` leaves, direct settlement switches, and same/different-settlement rejoins;
- settled vs unsettled person-days after first joining any settlement;
- settled-episode and post-join unsettled-episode durations;
- Chebyshev distance from the current settlement center while membership is active;
- settled person-days already beyond `settlementMembershipRadius = 3` while the old membership ID remains stale between periodic recomputations;
- distance immediately before and at `settlement → null` loss;
- whether loss happened while the old settlement was still active (distance-driven) or because it had become inactive;
- membership-change and leave rates per 100 person-years.

Probe worlds: seeds 1, 4, 9, 45, 80, 98; 24×24; initial population 30; daily observation for 100 years.

## Headline result

**The initial "seed45 churns out more often" hypothesis is false.**

Seed45 does not lose settlement membership unusually frequently. Its reproduction-age female leave rate is *lower* than seed80 and all ordinary/high-density controls except none in this sample. The pathology appears after a normal distance-driven loss: seed45 takes far longer to reattach to any settlement.

This distinction matters because it changes the next intervention target from "stronger home pull while already settled" to "avoid the hard settled→unsettled cliff, or preserve enough home association to recover after crossing it."

## Key comparison: seed45 vs seed80

Seed80 remains the strongest low-population control because its first settlement appears at almost the same time as seed45.

| metric, reproduction-age females | seed45 | seed80 |
| --- | ---: | ---: |
| population @100y | 35 | 112 |
| first settlement year | 21.33 | 20.58 |
| settled share, whole horizon | 15.05% | 40.12% |
| **settled share after first join** | **38.55%** | **61.57%** |
| **unsettled share after first join** | **61.45%** | **38.43%** |
| leave events / 100 person-years | **39.07** | **75.19** |
| membership changes / 100 person-years | **87.68** | **213.23** |
| distance-driven leave share | 100% | 100% |
| abandonment-driven leaves | 0 | 0 |
| settled days already outside radius 3 | 18.34% | 16.56% |
| settled episode mean | 107.2d | 103.7d |
| post-join unsettled episode mean | **217.3d** | **116.8d** |
| post-join unsettled episodes >180d | **26.14%** | 14.04% |
| >360d | **16.11%** | 5.38% |
| >720d | **6.38%** | 1.18% |
| longest completed post-join unsettled episode | 3030d | 3210d |
| leave distance median / P90 | 4 / 6 | 4 / 6 |
| same-settlement share of rejoins | 63.83% | 56.17% |

### What is *not* abnormal in seed45

Several metrics that should have been elevated if the original churn hypothesis were correct are not:

- **Exit frequency:** seed45 reproduction-age females leave at 39.1 events / 100 person-years, roughly half seed80's 75.2.
- **Membership-change frequency:** 87.7 / 100 person-years vs seed80's 213.2.
- **Settled episode length:** 107 days vs 104 days in seed80; seed45's settled spells are not unusually short.
- **Temporary excursions beyond radius 3:** 18.34% of seed45 settled female-days vs 16.56% seed80 and 18.68% seed98. Settled people wander beyond the nominal membership radius in every world because membership is only periodically recomputed.
- **Loss geometry:** both seed45 and seed80 have median loss distance 4 and P90 6.

The seed45-specific problem is therefore not the act of crossing the boundary. It is what happens **after** membership is removed.

## Controls

| seed | RF post-first-join unsettled share | RF leaves /100py | RF outside-radius settled days | RF unsettled episode mean | RF episodes >360d |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 28.12% | 91.97 | 16.12% | 96.1d | 3.04% |
| 4 | 27.71% | 104.36 | 15.50% | 69.0d | 1.08% |
| 9 | 21.84% | 82.07 | 15.54% | 90.3d | 2.46% |
| 45 | **61.45%** | **39.07** | 18.34% | **217.3d** | **16.11%** |
| 80 | 38.43% | 75.19 | 16.56% | 116.8d | 5.38% |
| 98 | 16.83% | 110.17 | 18.68% | 52.9d | 0.52% |

The contrast is strong: high-density seed98 actually crosses beyond radius while still carrying membership slightly *more* often than seed45, and it leaves membership almost three times as frequently per female person-year. Yet its post-leave recovery is fast.

## Leave causes

Across all six sampled worlds, every observed natural `settlement → null` leave happened while the old settlement was still active. There were **zero abandonment-driven leaves** in both the all-adult and reproduction-age-female views.

Thus the membership losses in this period are cleanly distance-driven under the current authoritative mechanics. Settlement lifecycle abandonment is not the cause of the seed45 retention problem.

## Why the current mechanics create a hard recovery cliff

The current settlement behavior has an important asymmetry:

1. membership is periodically recomputed from distance to an active settlement center;
2. a person beyond the membership radius becomes `settlementId = null` at that recomputation;
3. settlement home bias only applies when `human.settlementId !== null`;
4. therefore the moment membership is removed, the weak homeward movement tendency disappears entirely.

The data are consistent with this cliff. Seed45 is not exceptionally likely to cross the distance boundary, but once it loses membership, ordinary food/random movement often fails to return it for months or years.

This is more precise than the previous statement that seed45 has "weak settlement retention": **seed45 has weak settlement reattachment after a normal distance-driven detachment.**

## Retention-radius counterfactual

Using only the observed distance on true `settlement → null` loss days, we can ask a limited off-policy question: if joining still required radius 3, but an existing active member were retained out to a larger radius, what fraction of historical leave events occurred within that candidate radius?

This is *not* a behavior simulation—the retained member would continue receiving home bias and later history would diverge. It is only a candidate-screening statistic.

| seed | RF leaves at distance ≤4 | ≤5 | ≤6 |
| ---: | ---: | ---: | ---: |
| 1 | 66.59% | 88.81% | 96.83% |
| 4 | 66.75% | 90.76% | 97.69% |
| 9 | 63.17% | 89.19% | 97.72% |
| 45 | **58.24%** | **85.29%** | **96.18%** |
| 80 | 59.48% | 88.77% | 96.90% |
| 98 | 67.30% | 90.14% | 96.93% |

The geometry is strikingly similar between seed45 and seed80. A retention radius of 4 would have intercepted roughly 58–59% of their historical detachments; radius 5 about 85–89%.

That means a larger retention radius is **not a seed45-specific correction**. It would alter membership in every world. However, preventing the same leave may be disproportionately valuable in seed45 because its post-leave return time is much worse. Only an actual controlled behavior A/B can answer that.

## Decision

- Keep current reproduction behavior unchanged.
- Do not increase fertility, mating radius, or pair-memory conception.
- Do not conclude that seed45 needs stronger home bias while already settled; settled excursion frequency and settled-episode duration are not exceptional.
- Keep the churn tracker as a reusable derived-only research instrument.
- The next behavior experiment should target the **binary membership cliff** as narrowly as possible.

### Recommended next experiment: conservative membership hysteresis

Use the existing join radius 3 unchanged. Add an experimental *retention* radius for a person who already belongs to an active settlement:

- compute the normal current membership choice exactly as today;
- if normal membership finds a settlement within join radius 3, use that result unchanged, preserving normal joins and direct switches;
- only when normal membership would become `null`, retain the previous active settlement if the person is still within a small retention radius (start with 4; compare 5 only as an experiment);
- otherwise become unsettled exactly as today.

This is more causally isolated than globally strengthening home bias: it changes only the `S → null` boundary cases documented here, and retained members simply continue using the already-existing 5% home bias.

Acceptance must remain distributional: a candidate should reduce seed45's long unsettled tail without inflating ordinary-world population or creating new settlement lock-in pathologies. Default/current retention radius 3 must preserve existing history exactly.
