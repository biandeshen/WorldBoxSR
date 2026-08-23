# Former-home recovery corridor after settlement leave

Date: 2026-08-23
Issue: #57
PR: #58

## Question

Settlement-churn research showed that seed45's unusually weak demographic recovery is not caused by unusually frequent settlement exits. Its reproduction-age females instead spend much longer unsettled after a normal distance-driven `settlement -> null` transition.

A direct membership-retention experiment (#55/#56) confirmed that the membership boundary matters, but keeping authoritative membership alive outside radius 3 also extends the existing settlement home-bias contract and materially rewrites ordinary-world demographics.

This study therefore asks a narrower question: after a natural distance-driven leave, is there a **short, distinctive former-home recovery corridor** that could justify a future non-membership home-memory cue?

## Method

A derived-only observer remembers the former active settlement externally after `settlementId` becomes null. It changes no authoritative state and consumes no RNG.

For adults and a reproduction-age-female cohort defined at leave time, it records:
- post-leave unsettled person-days;
- Chebyshev distance to the former active settlement;
- shares within former-home radii 4 / 5 / 6;
- exact distance 4;
- elapsed windows 0–30 / 31–90 / 91–180 / 181–360 / >360 days;
- non-hungry share;
- same-former rejoin vs another-settlement join;
- natural time-to-same-rejoin;
- long-tail (>180d) distance and near-home share.

Probe seeds: 1, 4, 9, 45, 80, 98. Horizon: 100 years. Worlds: 24×24, 30 founders.

## Headline result

There is a strong early former-home corridor, but **it is not seed45-specific**.

### First 30 days after leave

Reproduction-age-female cohort:

| seed | population y100 | within r4 | within r6 | exact distance 4 | mean distance |
|---|---:|---:|---:|---:|---:|
| 1 | 306 | 56.36% | 91.84% | 34.71% | 4.46 |
| 4 | 159 | 57.29% | 92.70% | 34.38% | 4.41 |
| 9 | 207 | 57.46% | 92.46% | 33.32% | 4.40 |
| **45** | **35** | **48.67%** | **90.54%** | **29.31%** | **4.64** |
| **80** | **112** | **49.20%** | **90.21%** | **31.69%** | **4.66** |
| 98 | 431 | 59.31% | 93.02% | 33.07% | 4.32 |

The key low-population comparison is seed45 vs seed80. Their first-30-day geometry is nearly identical:
- radius 4: **48.67% vs 49.20%**;
- radius 6: **90.54% vs 90.21%**;
- exact distance 4: **29.31% vs 31.69%**;
- mean distance: **4.64 vs 4.66**.

So seed45 is not uniquely failing because newly detached people immediately move beyond a plausible former-home memory band.

## The difference is the long tail

Natural same-former rejoin duration:

| seed | median | p90 | max |
|---|---:|---:|---:|
| 1 | 30d | 150d | 3300d |
| 4 | 30d | 120d | 990d |
| 9 | 30d | 150d | 720d |
| **45** | **60d** | **420d** | **2490d** |
| **80** | **60d** | **210d** | **3210d** |
| 98 | 30d | 90d | 5820d |

Seed45 and seed80 have the same median rejoin time, but seed45's P90 is twice as long.

After 180 days, seed45 is more likely to have transitioned from a local recovery problem into a broad spatial-separation problem:

- seed45 >180d former-home radius6 share: **18.78%**, mean distance **8.96**;
- seed80 >180d former-home radius6 share: **28.85%**, mean distance **8.56**;
- seed98 >180d radius6 share: **56.86%**, mean distance **6.66**.

For >360-day days alone:
- seed45 radius6: **15.26%**, mean distance **9.29**;
- seed80 radius6: **22.71%**, mean distance **9.31**.

The mean distances converge, but seed45 spends less of the long tail inside a near-home band.

## Natural rejoin outcomes

Seed45 does not have a uniquely low probability of eventually returning to the same settlement among resolved joins:
- seed45 same-former rejoin share: **64.20%**;
- seed80: **55.96%**;
- seed9: **63.50%**;
- seed98: **51.70%**.

The issue is therefore **time to recovery**, especially the upper tail, not inability to identify or ever return to the former home.

## Hunger interaction

The tracked former-home days are overwhelmingly non-hungry under the current `hungryThreshold`:
- seeds 1/4/9/45/80: 100%;
- seed98: 97.51%.

So a passive former-home cue would rarely conflict directly with hunger-driven food movement in this measurement. However, that does not make the cue safe: the membership-hysteresis experiment already demonstrated that small spatial changes can strongly amplify through local reproduction opportunity.

## Interpretation

The study rejects the idea that seed45 has a unique, narrowly bounded **early** former-home corridor that could be safely targeted.

A 30-day or similar former-home bias would act on seed80 and ordinary seeds almost as strongly as on seed45. That makes it a broad movement intervention rather than a seed45-specific repair. Given prior negative movement experiments, this is not a good evidence basis for behavior.

The actual seed45 difference emerges later: after a broadly normal early recovery geometry, a subset of episodes fail to reconnect and become very long separations. The useful next question is therefore not "how strongly should people be pulled home immediately after leaving?" but **what distinguishes leave episodes that recover within 30–90 days from those that become 180–360+ day failures?**

Candidate explanatory dimensions should be measured before adding behavior:
- resource/food conditions around the former settlement and the human during the first 30–90 post-leave days;
- direction of food-seeking displacement relative to former home;
- local eligible-partner density / known-partner presence during the recovery window;
- whether another settlement is spatially nearer even while no membership is assigned;
- terrain/coast geometry around the former settlement;
- age and remaining reproductive horizon at leave.

## Decision

- Keep the former-home recovery tracker as a reusable derived-only research tool.
- Do **not** add former-home movement behavior from this study.
- Do **not** retain authoritative membership outside radius 3.
- Remove the expensive 6-seed probe before merge.
- Next research should classify **successful vs failed reattachment episodes** and identify predictive conditions during the first 30–90 days, rather than tuning another global movement parameter.
