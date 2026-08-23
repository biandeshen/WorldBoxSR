# Day-90 reattachment rescue eligibility — negative experiment

Date: 2026-08-23
Issue: #63
PR: #64

## Question

Day-30 rescue eligibility (#61/#62) was rejected because the early outward-drift signal, while predictive, still selected too many episodes that would naturally recover within 31–90 days or legitimately join another settlement.

This study moves the decision point to day 90. All <=90-day natural reattachments are already gone from the risk set, giving a stricter test of whether trajectory rescue can ever be targeted safely with the current compact spatial features.

## Method

Pure off-policy row analysis; no simulation behavior changes.

Risk set:
- episode remains detached beyond day90; and
- the first90 compact observation window is complete.

Target:
- eventual same-home reattachment after >180 days (`long_same_rejoin`).

False positives:
- medium same-home recovery (91–180 days);
- legitimate other-settlement join;
- other resolved outcomes.

Censored episodes are reported separately and excluded from resolved precision.

Transparent rules:
1. first90 mean former-home distance >=5.0;
2. first90 radius6 exposure <=80%;
3. both drift conditions;
4. combined drift plus zero first90 days where another active settlement is closer;
5. combined drift plus <=10% other-settlement-closer exposure.

Probe seeds: 1, 4, 9, 45, 80, 98. Horizon: 100 years. Worlds: 24×24, 30 founders. Cohort: reproduction-age females at leave.

## Waiting until day90 improves specificity, but not enough for behavior

The migration-protected rule (`drift-no-other-closer`) is materially cleaner than day30, confirming that waiting longer removes many ambiguous natural recoveries and migrations.

| seed | risk set | long targets | selected | recall | precision | medium-recovery interference | migration interference |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 320 | 64 | 31 | 18.75% | 38.71% | 4.35% | 9.15% |
| 4 | 189 | 24 | 6 | 12.50% | 50.00% | 0.00% | 2.91% |
| 9 | 298 | 41 | 24 | 19.51% | 33.33% | 2.91% | 8.44% |
| **45** | **135** | **46** | **36** | **45.65%** | **58.33%** | **25.00%** | **13.11%** |
| **80** | **217** | **51** | **31** | **31.37%** | **51.61%** | **3.92%** | **11.40%** |
| 98 | 328 | 37 | 18 | 32.43% | 66.67% | 1.72% | 2.29% |

This is a real improvement over day30, especially in migration interference. But it still fails the project’s behavior gate.

### Seed45

The strongest protected rule selects 36 day90 episodes:
- 21 true long-tail targets;
- 7 medium 91–180d natural recoveries;
- 8 legitimate other-settlement joins.

So even after waiting three months, 15 of 36 resolved selections are known false positives. Precision is **58.33%**, recall **45.65%**. A movement intervention would still alter one quarter of the remaining medium recoveries and 13.11% of legitimate migration episodes.

The <=10% other-closer variant is nearly identical: precision 59.46%, recall 47.83%, with the same 7 medium and 8 migration false positives.

### Seed80 control

Protected rule:
- precision **51.61%**;
- recall **31.37%**;
- medium-recovery interference **3.92%**;
- migration interference **11.40%**.

The rule is cleaner but misses more than two thirds of long targets.

### Ordinary worlds

Specificity improves, but recall becomes very low:
- seed1 recall **18.75%**;
- seed4 **12.50%**;
- seed9 **19.51%**.

This fails the requirement that a simple rule retain useful long-tail coverage across seed45 and controls.

## Broad day90 drift remains unacceptable

Dropping the migration guard restores recall but recreates broad interference.

For example, seed45 mean-distance >=5.0:
- recall **78.26%**;
- precision **34.95%**;
- medium-recovery interference **67.86%**;
- migration interference **78.69%**.

Seed80:
- recall 64.71%;
- precision 24.26%;
- migration interference 71.05%.

Thus the same precision/recall tradeoff persists: broad geometry catches long-tail episodes because outward drift is real, but outward drift is also a normal part of migration and slower natural recovery.

## Interpretation

The full research chain now gives a stable conclusion:

- settlement detachment is not unusually frequent in seed45;
- seed45 has a heavier reattachment-time tail;
- long episodes show early outward drift;
- day30 is too early to distinguish long failure from normal recovery/migration;
- day90 improves specificity, but any transparent rule with tolerable migration interference has low and inconsistent recall, while rules with useful recall remain behaviorally broad.

This means **trajectory rescue is the wrong abstraction**. We should not keep adding day120/day150 decision points or threshold tuning. The model is telling us that outward movement is sometimes legitimate social migration and sometimes part of a slow return process; forcing a homeward correction tries to solve both with the same spatial control.

## Decision

Close the settlement-trajectory rescue behavior direction.

- Ship no day90 rescue movement.
- Do not add former-home home bias, membership hysteresis, or delayed pull-back logic.
- Do not continue threshold/timing tuning for day120/day150.
- Keep the pure day90 evaluator as reusable research tooling.
- Preserve current authoritative settlement membership and movement semantics.

## Next architectural direction

Move away from correcting individual trajectories and toward **explicit social state that can add history without changing demography first**.

The strongest candidate is a behavior-neutral persistent pair/union layer derived from actual existing reproductive relationships:
- a pair becomes a recorded social union when they first produce a child;
- the union has stable identity, members, founding day, child IDs, settlement-at-formation, and active/historical status;
- it adds no new conception chance, movement, residence, or fertility rule;
- it provides the missing bridge between person/lineage and a future residential household while preserving the current demographic baseline exactly.

Only after that social identity exists and is measured should we consider whether any pair/household behavior is warranted.
