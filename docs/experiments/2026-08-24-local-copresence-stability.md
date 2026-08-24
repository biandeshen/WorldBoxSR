# Local co-presence set stability — 100-year study

Date: 2026-08-24  
Issue: #75  
PR: #76

## Question

#73/#74 showed that individual top-partner identity is not stable enough to justify a general `social_bond`: the six-seed median same-top-next-year rate was only 10.68%, median same-top across 3 annual windows 1.93%, and median same-top across 5 windows 0.49%.

This study asks a different question:

> Is a person's **whole local co-presence set** more stable across years than the identity of their single top partner, strongly enough to justify designing a residential-group / household-seed primitive?

No behavior changes are introduced.

## Method

Six deterministic 24×24 worlds were observed for 100 years with 30 founders: seeds **1, 4, 9, 45, 80, 98**.

For every living human, the derived-only tracker accumulates every other living human observed within Chebyshev radius 1 during consecutive personal 360-day windows.

Each complete window records:
- days with at least one nearby peer;
- total peer-days and mean nearby peer count;
- distinct peers;
- co-presence HHI / effective peer count;
- same-settlement peer-day share as annotation only.

Adjacent windows are compared by:
- support Jaccard of peer identities;
- weighted Jaccard of co-presence-day count vectors;
- prior-window peer mass retained in the next window;
- current-window peer mass inherited from the previous window;
- top-3 peer-set Jaccard;
- solo/occupied transitions;
- same-settlement share of inherited versus newly appearing current peer mass.

Three-window persistence uses:
- peer support intersection / union across all 3 windows;
- weighted min / max across the 3 count vectors;
- number of peers present in all 3 windows;
- share of current peer mass contributed by 3-window-persistent peers.

No clustering, household threshold, group ID, raw daily trajectory, or authoritative social state is created.

## Capacity calibration

The original default cap of 256 peer records per focal human per 360-day window was sufficient for seeds 1/4/9/45/80, but **not** for dense seed98:

- cap256: 6,102 / 20,598 complete windows truncated (**29.62%**) and 2,697,571 record evictions;
- max retained peers hit the cap exactly (256), so seed98 overlap metrics at cap256 are invalid.

Seed98 was rerun at caps 512 and 1024. Both produced:
- **0 truncated windows**;
- **0 evictions**;
- identical support/weighted Jaccard and mass-retention metrics;
- maximum peers in one complete window = **409**.

Therefore the permanent research tracker default is raised to **512**. Cap1024 adds no information for this baseline.

## Calibrated results

Seed98 values below use the converged cap512/1024 result; the other five seeds were already untruncated at cap256.

| Seed | Support Jaccard | Weighted Jaccard | Prior mass retained | Current mass inherited | 3-window support I/U | 3-window weighted min/max | Current mass from 3-window peers |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 34.37% | 18.20% | 57.26% | 56.38% | 13.79% | 4.76% | 27.72% |
| 4 | 32.90% | 17.76% | 54.70% | 54.09% | 12.45% | 4.51% | 25.15% |
| 9 | 42.54% | 26.16% | 62.94% | 61.85% | 23.35% | 13.39% | 36.56% |
| 45 | 31.84% | 16.51% | 52.95% | 53.39% | 11.79% | 4.02% | 24.67% |
| 80 | 31.14% | 16.36% | 51.86% | 51.79% | 11.03% | 3.82% | 22.98% |
| 98 | 47.06% | 24.12% | 68.79% | 67.56% | 27.15% | 9.37% | 43.04% |

Six-seed medians:
- adjacent support Jaccard: **33.64%**;
- adjacent weighted Jaccard: **17.98%**;
- prior peer mass retained next year: **55.98%**;
- current peer mass inherited from prior year: **55.24%**;
- 3-window support intersection / union: **13.12%**;
- 3-window weighted min / max: **4.64%**;
- current peer mass from peers present in all 3 windows: **26.43%**.

## Interpretation

### 1. Whole local peer sets are substantially more stable than top-partner rank

The annual peer-set signal is clearly stronger than the rejected dyadic top-rank signal.

Across seeds, about **52–69% of one year's co-presence mass** is still contributed by people who also appear in the adjacent year. The six-seed median is about **56%**.

This means the simulation already has a persistent social background: people do not encounter an entirely fresh local population every year.

This is a real structural signal and is not a cap artifact after seed98 calibration.

### 2. But the group is not close to fixed membership

Support overlap is much weaker than mass retention:
- median support Jaccard is only **33.64%**;
- median weighted Jaccard is only **17.98%**.

So the identities of local peers rotate substantially even when much of a person's encounter mass continues to come from recurring people.

A small number of recurrent peers can carry a large share of annual mass without implying a stable bounded household membership set.

### 3. Three-year persistence drops sharply

The strongest counter-evidence to a residential-group entity is the 3-window result.

Across three consecutive annual windows:
- median support intersection / union falls to **13.12%**;
- median weighted min / max falls to **4.64%**;
- peers present in all three windows carry only **26.43%** of current peer mass at the median.

Even dense seed98, where annual retention is highest, retains only **43.04%** of current peer mass from peers present across all three annual windows.

This is not the shape of a stable household roster. It is closer to a **persistent but fluid neighborhood / local social field**.

### 4. Seed45 again does not reveal a hidden household mechanism

Seed45 remains sparse but is not unusually group-stable:
- support Jaccard **31.84%**;
- weighted Jaccard **16.51%**;
- prior mass retained **52.95%**;
- current mass inherited **53.39%**;
- 3-window current mass from persistent peers **24.67%**.

These values are close to seed80 (31.14%, 16.36%, 51.86%, 51.79%, 22.98%).

So seed45's demographic sensitivity is not explained by a uniquely stable or uniquely unstable residential peer set.

### 5. Settlement membership does not define the local peer set

Inherited peer mass is somewhat more same-settlement than newly appearing peer mass in all sampled worlds, but the difference is modest.

Six-seed medians:
- inherited current peer mass same-settlement share: **51.05%**;
- new current peer mass same-settlement share: **47.90%**.

This supports a mild settlement-locality effect, not an equivalence between settlement membership and residential-group membership.

The tracker therefore continues to treat settlement as an annotation only.

## Decision

**Do not create authoritative residential-group / household-seed state from radius-1 local co-presence yet.**

The evidence is stronger than the dyadic-rank evidence but still fails the multi-year stability gate:

1. a persistent local social background clearly exists;
2. adjacent-year mass retention is substantial;
3. identity support and weighted overlap remain fluid;
4. three-year persistent membership is much weaker than adjacent-year retention;
5. settlement membership is only a partial correlate;
6. seed45 does not exhibit a distinctive hidden residential structure.

The most accurate current abstraction is therefore **a fluid local social field**, not a stable household roster.

No clustering algorithm, household threshold, group identity, spouse state, co-residence force, resource sharing, inheritance, or migration behavior should be introduced from this evidence.

## Engineering notes

The permanent tracker is `engine/core/local_copresence_stability.js`.

It remains research-only and derived-only:
- exact snapshot / RNG neutrality;
- current personal window plus at most two prior valid window maps;
- bounded peer maps with default cap512 after calibration;
- cap truncation remains explicit and invalidates temporal comparisons;
- no attachment to authoritative tick systems or `summarizeWorld()`.

The all-human 6×100-year probe took roughly 69 seconds on a hosted runner, and the seed98 512/1024 cap calibration roughly 49 seconds. This cost reinforces that the tracker is an **on-demand research instrument**, not a product-runtime metric.

The temporary baseline and cap-sensitivity tests were removed before merge.
