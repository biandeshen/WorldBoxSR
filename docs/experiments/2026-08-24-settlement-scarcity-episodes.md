# Experiment: settlement-level scarcity episodes before storage v1

Date: 2026-08-24  
Issue: #81  
PR: #82

## Question

After shared-food-storage v0 failed its seed98 hard guard, determine what **settlement-level scarcity actually looks like in the baseline world** before designing any storage v1.

The key distinction is between:

1. genuine aggregate territorial scarcity;
2. a hungry member being unable to reach edible food on the existing one-step meal path;
3. local blockage despite the settlement still owning at least one full meal per member (`access mismatch`).

The experiment is derived-only. It does not change movement, eating, hunger, reproduction, settlement membership, food, RNG, config defaults, or snapshot state.

## Observation semantics

Every 30 days, for every active settlement, the research layer derives the existing territorial resource account plus:

- `territorialMealEquivalents = territorialFood / foodPerMeal`;
- `territorialMealCoveragePerMember = territorialFood / (population * foodPerMeal)`;
- **one-meal territorial shortage** when coverage is below 1;
- hungry current members using the existing `hungryThreshold`;
- hungry current members whose current tile and every one-step passable neighbor have less than the existing edible minimum `0.2`;
- **local meal-path blockage** when at least one such hungry member exists;
- **access mismatch** when local blockage exists while territorial meal coverage remains at least 1.

The threshold for territorial shortage is not fitted to outcomes. It is tied directly to one already-existing meal unit per current member, while the continuous meal-coverage metric remains visible.

A bounded external tracker records consecutive sampled episodes for each of the three conditions. No raw daily trajectory is stored.

## Method validation

Artificial worlds pin down:

- true territorial shortage plus local blockage;
- access mismatch under abundant aggregate territory;
- exact use of the existing `0.2` edible threshold and one-step path;
- non-hungry exclusion;
- episode start/end and later abandonment annotation;
- bounded completed-row retention with exact aggregate counts;
- exact snapshot/RNG neutrality;
- cadence, cap, and monotonic-time validation.

The clean pre-probe branch passed **131/131 tests + smoke**.

## Baseline

Seeds: `1, 4, 9, 45, 80, 98`  
World: `24×24`, `30` founders  
Horizon: `200` years  
Sample cadence: `30` days

The temporary six-seed probe completed in about 40 seconds on the hosted runner and did not hit its 20,000 completed-episode retention cap.

## Six-seed prevalence

Median settlement-sample shares across the six worlds:

| Condition | Six-seed median |
| --- | ---: |
| one-meal territorial shortage | **40.74%** |
| local meal-path blockage | **29.00%** |
| access mismatch | **0.00%** |
| access mismatch / local blockage | **0.00%** |

Per seed:

| Seed | Territorial shortage | Local blockage | Access mismatch | Mismatch / blockage |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 56.19% | 33.24% | 0.00% | 0.00% |
| 4 | 38.07% | 27.18% | 0.00% | 0.00% |
| 9 | 43.41% | 30.82% | **2.52%** | **8.19%** |
| 45 | 0.00% | 0.00% | 0.00% | 0.00% |
| 80 | 26.56% | 17.52% | 0.00% | 0.00% |
| 98 | 64.19% | 40.34% | 0.00% | 0.00% |

### Interpretation

The baseline does contain substantial **real aggregate resource pressure**. Local blockage is not generally just a pathing artifact over abundant settlement territory.

In five of six sampled worlds, every sampled local-blockage state occurred while territorial meal coverage was already below one meal per member. Only seed9 showed a meaningful access-mismatch tail, and even there it represented only 8.19% of local-blockage settlement-samples.

So the storage-v0 failure should **not** be reinterpreted as "the world has no settlement scarcity." Scarcity is real. The problem is that responding to individual meal failures with a shared store creates broader demographic coupling than the survival question warrants.

## Episode shape

Territorial shortage is relatively coarse and can become persistent:

- seed1: 17 completed episodes + 9 active at year200; completed median observed span 90 days; maximum completed span 20,010 days;
- seed4: median 75 days, max 210;
- seed9: median 15 days, max 360;
- seed45: none;
- seed80: median 75 days, max 720;
- seed98: median 90 days, max 270.

Several dense-world shortage episodes remain active at the end of year200, so completed-episode duration alone understates long-running pressure.

Local blockage is much more frequent and flickery:

- completed episode counts range from 574 to 1,559 in the non-seed45 worlds;
- median completed observed span is 30–60 days;
- rare tails persist for 1,140–2,040 days.

One-sample episodes have an observed span of zero days because only sampled endpoints are retained; this is an observation-span convention, not a claim that the physical state lasted zero time.

## Scarcity is not a settlement-survival classifier

The year100 active settlement cohort was followed to year200 using stable settlement IDs.

In seeds 1/4/9/80, **every year100 settlement was non-declining by year200**, despite many spending large shares of the second century in shortage:

| Seed | Median post-100 shortage share, non-declined | Median local-blockage share |
| ---: | ---: | ---: |
| 1 | 89.25% | 53.33% |
| 4 | 62.50% | 46.42% |
| 9 | 76.54% | 55.88% |
| 80 | 38.29% | 26.75% |

Seed45 remained the sparse counterpoint: all sampled shares were zero and settlements still grew modestly.

Seed98 contains the only abandonment in the six-seed study:

- the one abandoned year100 settlement had post-100 **shortage share 0% and local-blockage share 0%**;
- five still-active but declining settlements had median shortage share **100%** and blockage share **65.75%**;
- the one non-declining settlement also had shortage share **100%** and even higher blockage share **77.75%**.

Thus scarcity is a strong description of carrying pressure in dense settlements, but it is **neither necessary nor sufficient for settlement failure** in this sample.

## Seed98 Pineford sentinel

Pineford (#5) provides the decisive result.

| Year | Population | Food remaining | Territorial meal coverage/member | Hungry | Blocked hungry | Scarcity/blockage/mismatch |
| ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 100 | 11 | 96.06% | **21.07×** | 0 | 0 | none |
| 120 | 8 | 97.81% | **29.50×** | 0 | 0 | none |
| 140 | 7 | 98.18% | **33.85×** | 0 | 0 | none |
| 160 | 3 | 99.37% | **79.93×** | 0 | 0 | none |
| 180 | 0 / abandoned | — | — | 0 | 0 | none |
| 200 | 0 / abandoned | — | — | 0 | 0 | none |

The tracker recorded **zero territorial-shortage episodes, zero local-blockage episodes, and zero access-mismatch episodes for Pineford across the full run**.

This is stronger than the earlier year100 resource snapshot. Pineford does not merely have abundant food at one checkpoint: its entire observed decline from 11 → 8 → 7 → 3 → 0 occurs without food scarcity or hungry-member access blockage under the current simulation semantics.

### Consequence

Pineford's failure is primarily **demographic/social/spatial**, not economic. A food buffer cannot be the principled fix for this failure class.

## Decision

### Keep the scarcity research layer

The derived snapshot and bounded episode tracker are useful permanent research instruments:

- they cleanly separate aggregate scarcity from local access mismatch;
- they are exact snapshot/RNG neutral;
- they expose real carrying-pressure states that were previously implicit;
- they give future resource mechanics a measurable causal gate instead of intuition.

### Do not design storage v1 yet

The current evidence is insufficient to justify another storage mechanism:

1. genuine territorial scarcity is common, but many settlements grow strongly while experiencing it;
2. access mismatch is rare in five of six sampled worlds;
3. the only observed abandonment has no scarcity signal at all;
4. the Pineford sentinel is conclusively outside the food-scarcity failure class;
5. a generic buffer would therefore mostly alter carrying-capacity dynamics, not target the unexplained settlement-failure mechanism.

Parameter-searching a store now would answer the wrong question.

## Next gate: settlement demographic viability

The next derived-only research slice should explain **member replacement in shrinking settlements**, especially Pineford.

Measure at settlement level over time:

- births and deaths attributable to current members / stable settlement identity where accounting is transparent;
- membership inflow and outflow / direct settlement switching;
- age structure and dependent/adult balance;
- reproductive-age females, eligible males, and local reproductive opportunity;
- whether population loss is dominated by mortality, out-migration, failed replacement, or membership capture by neighboring settlements;
- lineage/kin composition only as annotation, not as a new household primitive.

A future behavioral change should target the demonstrated failure mode rather than "settlement growth" generically.

## Repository hygiene

The expensive six-seed probe is temporary and is removed before merge. Permanent CI retains only deterministic artificial-world semantics and purity tests.