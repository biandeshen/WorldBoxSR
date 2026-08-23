# Reproduction opportunity drought study — 2026-08-23

Issue: #47

## Question

The static opportunity study showed that sparse seed45 often has eligible males in the world but not inside the current radius-1 mating neighborhood. Two later behavior experiments failed: naive family movement changed long-run demography, and an independent wider-radius conception channel overcorrected population.

The missing temporal question was whether radius-1 opportunity is mostly short positional flicker that a modest encounter-memory window could bridge, or whether sparse worlds suffer genuinely long opportunity droughts.

## Method

A derived-only tracker observes the authoritative world at the **start of each simulated day** before that day's movement/actions. This is a temporal spatial-opportunity proxy; it is not presented as the exact post-movement instant inside `reproduce()`.

For every reproduction-eligible female-day it records:

- radius-1 eligible-male opportunity;
- radius-3 opportunity as a wider spatial upper bound;
- consecutive radius-1 no-opportunity streaks;
- whether a radius-1 opportunity occurred previously;
- time since the last radius-1 opportunity;
- whether 30 / 90 / 180 day recent-opportunity memory would cover that no-opportunity day.

The tracker builds and reuses one eligible-male tile-count grid and scans bounded local windows per female. It keeps all longitudinal state outside the world and consumes no simulation RNG.

Probe worlds: seeds 1, 4, 9, 45, 80, and 98; 24×24; population 30; 100 years; daily observations.

## Results

| seed | pop @100y | radius1 opportunity | radius3 opportunity | radius3 rescue of r1 drought | prior encounter on r1 drought days | 30d memory* | 90d memory* | 180d memory* | streak median | streak P90 | streak max |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 306 | 53.7% | 90.1% | 78.6% | 99.4% | 66.4% | 85.2% | 92.7% | 5d | 27d | 1086d |
| 4 | 159 | 45.6% | 89.2% | 80.1% | 99.3% | 66.5% | 86.3% | 93.8% | 5d | 31d | 1024d |
| 9 | 207 | 60.9% | 96.9% | 92.1% | 99.7% | 81.4% | 96.3% | 99.0% | 5d | 23d | 396d |
| 45 | 35 | **12.7%** | **45.5%** | **37.6%** | 96.3% | **27.0%** | **48.1%** | **63.9%** | **10d** | **126d** | **3113d** |
| 80 | 112 | 37.3% | 84.5% | 75.3% | 99.1% | 59.5% | 83.5% | 93.0% | 6d | 41d | 981d |
| 98 | 431 | 90.7% | 99.2% | 90.9% | 99.6% | 83.9% | 96.1% | 98.8% | 3d | 15d | 308d |

\* Memory percentages in the table are conditional on radius-1 no-opportunity female-days where that female had previously had radius-1 opportunity. This separates short/long separation after a real encounter from females that have never yet had local opportunity.

Additional seed45 facts:

- 87.3% of eligible female-days lack radius-1 opportunity.
- 96.3% of those no-opportunity days occur after the female has previously had a radius-1 opportunity, so the problem is not mainly "never met anyone".
- Mean time since the last radius-1 opportunity on those previously-encountered drought days is 232 days.
- The longest observed time since prior radius-1 opportunity is 3,113 days (~8.6 years).
- Radius 3 only rescues 37.6% of radius-1 drought days, far below the 75–92% rescue seen in the other sampled worlds.

## Interpretation

### 1. Seed45 is not merely a low-population version of an ordinary world

Seed80 also has low year-100 population (112), but its radius-3 opportunity is 84.5% and radius-3 rescues 75.3% of radius-1 drought days. Seed45 has only 45.5% radius-3 opportunity and 37.6% rescue. The structural problem is therefore strongly spatial/topological, not population count alone.

### 2. Most drought episodes are short, but long episodes dominate drought-days

Seed45's median no-opportunity streak is only 10 days, yet P90 is 126 days and the maximum is 3,113 days. This explains why a seemingly generous 180-day memory still covers only 63.9% of previously-encountered drought-days: a minority of very long separations contributes a large fraction of all missing-opportunity time.

### 3. Short encounter memory is insufficient as a standalone fix

A 30- or 90-day memory would miss most seed45 drought-days. Even 180 days leaves more than one third of previously-encountered drought-days uncovered. More importantly, the previous supplemental-conception experiment already showed that simply turning remembered/wider opportunity into an additional conception channel creates positive demographic feedback and overcompensation.

Therefore the next design must not be "remember an encounter, then add another daily birth attempt."

### 4. Persistent partner identity remains plausible, but needs one more identity-level measurement

The data support investigating a persistent relationship/pair concept because most seed45 drought-days occur after prior contact and daily co-location is clearly too brittle. However, this tracker only remembers that **some** eligible male was nearby; it does not prove that the same male remains alive, eligible, or socially connected across the long separation.

Before implementing pair bonds, measure identity persistence:

- when a female has radius-1 opportunity, which eligible males are encountered;
- survival and reproduction-eligibility duration of those same males;
- time until the same encountered male is locally available again;
- fraction of drought-days where at least one previously encountered male is still alive/eligible;
- how these differ for seed45 vs seed80/ordinary worlds.

If same-partner continuity is strong, a future reproduction redesign should use **one normalized fertility hazard with explicit partner selection**, rather than stacking local and supplemental conception hazards.

## Decision

- Keep the current reproduction behavior unchanged.
- Keep the temporal drought tracker as a reusable derived-only research tool.
- Reject short encounter-memory as an immediate behavior patch.
- Continue with identity-level encounter persistence research before any pair-bond behavior is introduced.
