# Encounter-safe compact grazer founder placement — 2026-08-24

Issue: #134
Sprint: 029

## Question

Can one narrow placement-only change reduce genuine compact founder establishment failures without retuning ecology or trading encounter failure for a new systematic resource-collapse mode?

This is a paired causal A/B. It does not change runtime/default fauna.

## Fixed mechanics

All worlds are 16×16 creature-only worlds with:

- founder counts `2 / 4`;
- keyed founder ages `[0,6y]` using the existing salt;
- reproduction chance `0.001`;
- gradual old-age mortality enabled;
- partner radius3;
- each parent's local vegetation radius1 threshold0.50;
- unchanged grazing/starvation/movement/health/cooldown;
- sequential RNG isolation.

Both arms draw only from the same deterministic top32 vegetation-rich passable-cell pool sorted by vegetation desc, then y/x.

### Baseline

Select the first N ranked cells.

### Encounter-safe candidate

1. choose the lexicographically earliest ranked pair within Chebyshev radius3, falling back to the first two cells only if no such pair exists;
2. add each remaining founder from the highest-ranked unselected candidate within radius3 of the selected set;
3. fall back to the highest-ranked unselected candidate only if no connected candidate remains.

Founder creation order, creature IDs and keyed ages are identical between paired arms. Coordinates are the only causal change.

## Matrix

Seeds `1..60` × founders `2/4` × baseline/intervention = **240 worlds**, each run to year300.

Direct outcomes include initial founder graph, first/early births, total/replacement births, actual extinction/time-to-extinction, starvation vs old-age deaths, vegetation minimum and max population.

## Result — 2 founders

| Outcome | Baseline | Encounter-safe |
| --- | ---: | ---: |
| Extinctions by y300 | **23** | **22** |
| Zero-birth extinctions | **6** | **5** |
| Initial zero-pair worlds | **13** | **0** |
| Paired rescues | — | **1** |
| Paired harms | — | **0** |
| Both extinct | 22 | 22 |
| Both alive | 37 | 37 |

Median first-birth delta among pairs where both arms reproduce is **0 years**. Median minimum vegetation utilization is identical at ~**0.1735** and median starvation deaths remain **0** in both arms.

The intervention therefore fixes the structural initial encounter defect in all 13 cases, but only one of those coordinate changes changes the year300 extinction outcome. This is expected: compact extinction has other causal modes and placement was never intended to rescue all of them.

### Decisive 2-founder rescue — seed22

Baseline:

- initial pair edges: **0**; two isolated founders;
- initial mean local vegetation utilization: ~0.755;
- first birth: ~year5.76;
- births by year20: 2;
- total births: 2;
- extinction: ~**year34.01**;
- no starvation; 4 old-age deaths.

Encounter-safe:

- initial pair edges: **1**; one connected founder component;
- initial mean local vegetation utilization: ~0.779;
- first birth: ~year3.75;
- births by year20: **16**;
- total births: **366**;
- alive at year300 with population **23**;
- no starvation; minimum vegetation utilization ~0.201.

This is a clean causal example where encounter-safe placement turns a weak initial establishment into a long-lived multi-generation population without changing any ecology rule.

## Result — 4 founders

| Outcome | Baseline | Encounter-safe |
| --- | ---: | ---: |
| Extinctions by y300 | **13** | **11** |
| Zero-birth extinctions | 0 | 0 |
| Initial zero-pair worlds | 0 | 0 |
| Paired rescues | — | **2** |
| Paired harms | — | **0** |
| Both extinct | 11 | 11 |
| Both alive | 47 | 47 |

Median first-birth delta is again **0 years**. Median starvation deaths are **0** in both arms. Median minimum vegetation utilization changes only modestly from ~0.1218 baseline to ~0.1146 intervention; there is no paired harm or evidence of a systematic new starvation collapse.

### Rescue — seed19 × 4

Baseline founder graph has 2 pair edges in 2 components and becomes extinct ~year258.69 after 141 births.

Encounter-safe founder graph has 4 pair edges in 1 component and remains alive at year300 with population18 after 197 births. Minimum vegetation utilization is similar (~0.225 baseline vs ~0.219 intervention), with zero starvation in both arms.

### Rescue — seed33 × 4

Baseline has only 1 founder pair edge, 3 graph components and 2 isolates; it becomes extinct ~year241.68 after 190 births.

Encounter-safe has 3 edges, one connected component and no isolates; it remains alive at year300 with population20 after 256 births. Minimum vegetation utilization is actually higher in the intervention (~0.216 vs ~0.172 baseline), with zero starvation in both arms.

## Important negative evidence

Encounter-safe placement does **not** eliminate all establishment failures.

Several 2-founder worlds still produce zero births and go extinct even though their initial pair is already radius3-connected in both arms, including seed9, seed53 and seed54. Seed36 also remains zero-birth/extinct despite intervention converting an initially disconnected pair into a connected pair.

This shows that initial pair connectivity is necessary for some failures but not sufficient for guaranteed establishment. Keyed birth chance, founder ages/movement and later local conditions still matter. Do not expand this result into a deterministic survival guarantee.

## Resource-tradeoff audit

The pre-registered concern was that clustering founders might merely trade encounter failure for concentrated grazing/starvation.

Observed evidence does not show that tradeoff:

- no paired harmed cases at either founder count;
- median starvation deaths = 0 in all four count/arm groups;
- 2-founder median minimum vegetation is unchanged;
- 4-founder intervention minimum vegetation is slightly lower in aggregate, consistent with somewhat stronger establishment, but without systematic starvation or new extinction excess;
- all three rescued cases have zero starvation.

This is sufficient for the research candidate gate, not proof of universal safety.

## Decision

The encounter-safe placement candidate **passes the pre-registered paired research gate**:

- founders2: rescued `1` > harmed `0`, and zero-birth extinctions fall `6→5`;
- founders4: harmed `0` <= rescued `2`;
- sequential RNG remains unchanged;
- no harmed cases or systematic early resource-collapse signal are observed.

The effect is modest and heterogeneous, so **do not promote to runtime/default fauna**.

Next step: validate this exact frozen selection algorithm on a fresh compact seed set. Do not tune radius3, top32 pool size, founder counts, ages or ecology before that validation.

A fresh validation should preserve direct paired outcomes and specifically require that rescue benefit not reverse into a harm excess.

Default worlds remain creature-free.

## Cleanup

Temporary A/B probe/test override are removed before merge. Runtime behavior remains unchanged.
