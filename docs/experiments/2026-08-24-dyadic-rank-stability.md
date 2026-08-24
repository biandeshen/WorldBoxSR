# Windowed dyadic rank stability — 100-year study

Date: 2026-08-24  
Issue: #73  
PR: #74

## Question

#71/#72 showed that adult dyads can recur for years, but lifetime recurrence does not tell us whether one partner remains socially important over time. This study asks a stricter question:

> Does the identity of a person's strongest nearby adult-male encounter partner remain top-ranked across successive 360-day windows strongly enough to justify an authoritative `social_bond` identity?

No behavior is changed in this experiment.

## Method

Six deterministic 24×24 worlds were observed for 100 years with 30 founders: seeds **1, 4, 9, 45, 80, 98**.

The derived-only tracker uses the same social encounter semantics as #71/#72:

- focal cohort: living females from adult age through configured female fertility end age;
- encounter partner: living adult male, independent of hunger and birth cooldown;
- encounter: Chebyshev distance ≤ 1;
- personal observation windows: 360 observed simulation days, beginning when a female enters the focal cohort;
- current-window partner records capped at 256;
- complete cap-truncated windows are excluded from rank metrics and break continuity;
- complete no-contact windows also break rank continuity;
- death/fertility-end partial windows are reported separately and excluded from rank metrics;
- no raw daily trajectories are retained.

The six-world baseline produced **zero cap truncation and zero partner-record eviction**, with the largest single 360-day partner set at 141 (seed98), so no cap sensitivity rerun was required.

Seed45 preserved the existing 100-year demographic sentinel: **population 35 / births 44 / deaths 39**.

## Results

| Seed | Mean partners / 360d | Mean top share | Same top next year | Same top 3 years | Same top 5 years | Mean streak | Max streak |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 12.66 | 31.39% | 10.01% | 1.49% | 0.00% | 1.10 | 4 |
| 4 | 9.54 | 34.41% | 11.36% | 1.60% | 0.00% | 1.12 | 4 |
| 9 | 12.77 | 27.53% | 10.68% | 3.61% | 2.69% | 1.11 | 18 |
| 45 | 2.17 | 57.97% | 27.35% | 8.01% | 0.97% | 1.29 | 6 |
| 80 | 7.84 | 39.31% | 10.67% | 1.35% | 0.00% | 1.11 | 3 |
| 98 | 60.81 | 11.37% | 5.10% | 2.26% | 1.95% | 1.05 | 21 |

Across the six seeds, the median same-top-next-window rate is **10.68%**. Median same-top-across-3-windows is **1.93%** and median same-top-across-5-windows is **0.49%**.

### 1. Top identity usually turns over

Ordinary seeds 1/4/9/80 retain the same top partner in only about **10–11%** of adjacent annual windows. Dense seed98 is lower at **5.10%**. Even sparse seed45 turns over its top identity **72.65%** of the time.

This is the key distinction from the lifetime dyad result in #71/#72: the same pair can recur across many years without remaining the most important pair from year to year.

### 2. Stable top transitions are real but rare and much stronger

When the top identity *does* survive into the next 360-day window, it tends to carry substantially more encounter weight than a newly switched top.

| Seed | Later top share if stable | Later top share if switched |
|---:|---:|---:|
| 1 | 42.45% | 29.82% |
| 4 | 42.42% | 33.28% |
| 9 | 49.12% | 24.70% |
| 45 | 77.37% | 65.73% |
| 80 | 47.10% | 38.26% |
| 98 | 48.74% | 9.29% |

The six-seed median is **47.92%** for stable transitions versus **31.55%** for switched transitions.

Therefore there is a genuine strong-dyad tail. It is not merely a ranking tie artifact. But this tail is too uncommon to describe the general social organization of the current simulation.

### 3. Co-parent identity is enriched among stable tops, but is not the general top identity

Top partners in stable adjacent windows are more likely to be historical co-parents than top partners after a switch.

| Seed | Stable top co-parent | Switched top co-parent |
|---:|---:|---:|
| 1 | 13.97% | 8.20% |
| 4 | 14.88% | 10.59% |
| 9 | 35.33% | 11.16% |
| 45 | 15.58% | 11.49% |
| 80 | 14.85% | 10.52% |
| 98 | 32.50% | 6.10% |

Median stable-transition co-parent share is **15.23%**, versus **10.56%** after switches.

This is useful evidence that reproduction-producing pairs are somewhat overrepresented among the rarer stable strong dyads. It does **not** reverse the conclusions of #67–#72: most top identities are not co-parents, most co-parent edges are not spouse-like, and top identity usually turns over.

### 4. Stable top does not imply shared settlement membership

Unexpectedly, the top-partner same-settlement encounter share is lower for stable transitions than switched transitions in every sampled world.

| Seed | Stable top same-settlement | Switched top same-settlement |
|---:|---:|---:|
| 1 | 42.12% | 53.95% |
| 4 | 36.74% | 46.44% |
| 9 | 49.66% | 59.64% |
| 45 | 7.46% | 20.36% |
| 80 | 21.44% | 34.31% |
| 98 | 55.72% | 65.77% |

The median stable value is **39.43%**, versus **50.20%** for switched tops.

So there is currently no evidence chain of the form:

`stable dyad → shared settlement → residential household`.

If a future residential primitive is introduced, it should be measured from co-presence/residential grouping directly rather than inferred from dyadic rank or parental-union identity.

### 5. Rare long streaks exist, but they are tail events

Seeds 9 and 98 contain isolated top-partner streaks lasting 18 and 21 complete windows. These are real and worth retaining as observable phenomena. However the population-level distributions remain dominated by one-window streaks:

- mean streak length is only **1.05–1.29 windows** across all six worlds;
- same-top-across-3-window shares are mostly **1–4%** outside seed45;
- same-top-across-5-window shares are zero in seeds 1/4/80 and below 3% everywhere else.

Creating a permanent `social_bond` entity from a threshold on these rare tails would be an arbitrary classification rule at this stage, not a demonstrated simulation primitive.

## Seed45 versus seed80

Seed45 again demonstrates why concentration must be separated from mechanism.

- seed45 sees only **2.17** distinct adult-male partners per complete annual window on average, versus **7.84** in seed80;
- its mean top share is therefore much higher (**57.97%** vs **39.31%**);
- same-top-next-year is also higher (**27.35%** vs **10.67%**), but still represents a minority of transitions;
- its stable top same-settlement share is only **7.46%**, lower than seed80's **21.44%**.

Seed45's apparent dyadic concentration is substantially explained by its small social pool. It does not provide evidence for a stronger spouse-like mechanism.

## Decision

**Do not create authoritative `social_bond`, spouse, or household-seed state from dyadic rank.**

The current evidence says:

1. persistent repeated dyads exist;
2. a small strong-dyad tail exists and is somewhat co-parent enriched;
3. top identity nevertheless turns over in the large majority of annual transitions;
4. multi-year top-rank stability is rare;
5. stable top identity does not map cleanly to shared settlement membership.

Per #73's decision gate, the social graph remains **derived-only**.

The next useful social question should move from pair identity to **group/residential co-presence stability**: whether small sets of humans repeatedly occupy the same local area across windows strongly enough to define a residential primitive independently of reproduction and settlement labels.

## Engineering notes

The permanent tracker is `engine/core/dyadic_rank_stability.js`.

It retains only:

- bounded current-window partner counts;
- top-k compact window summaries needed for adjacent/3/5-window rank comparisons;
- aggregate streak and enrichment statistics.

All observation is snapshot/RNG neutral. The temporary 6-seed probe is removed before merge.
