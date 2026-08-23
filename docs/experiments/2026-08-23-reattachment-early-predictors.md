# Early predictors of long settlement reattachment failure

Date: 2026-08-23
Issue: #59
PR: #60

## Question

Former-home recovery research (#57/#58) showed that seed45 and low-population control seed80 have almost identical geometry in the first 30 days after a natural distance-driven settlement leave, yet seed45 has a much heavier same-home rejoin tail (P90 420d vs 210d).

This study asks whether **conditions observable during the first 30–90 days of an individual leave episode** distinguish fast recovery from episodes that eventually take more than 180 days to return to the same settlement.

## Method

A derived-only tracker records one compact feature row per leave episode. It stores no daily trajectory history.

Leave-time features:
- age and remaining female reproductive years;
- leave distance;
- former-settlement population;
- former-settlement resource snapshot;
- local passable share around the former settlement.

First-30 / first-90-day accumulators:
- former-home distance;
- shares within radius 4 and 6;
- non-hungry share;
- eligible-male opportunity within radius 1 and 3;
- nearest-other-settlement relationship;
- current-tile food fraction.

Episode outcomes remain separate:
- fast same-home rejoin <=90d;
- medium 91–180d;
- long >180d;
- other-settlement join;
- former-home abandonment;
- human lost;
- censored/unresolved.

Probe seeds: 1, 4, 9, 45, 80, 98. Horizon: 100 years. Worlds: 24×24, 30 founders. The analysis below focuses on the reproduction-age-female-at-leave cohort.

## Strongest signal: early outward spatial drift

Across every sampled world, long same-home rejoin episodes are already farther from their former settlement during the first 30 days.

### Seed45

Fast same-home rejoin episodes: 143. Long episodes: 46.

| feature | fast | long |
|---|---:|---:|
| first-30 mean former-home distance | **3.85** | **5.29** |
| first-30 within radius4 share | **71.4%** | **29.1%** |
| first-30 within radius6 share | **97.7%** | **84.7%** |
| first-90 mean distance | **3.67** | **5.92** |
| first-90 within radius6 share | **98.3%** | **68.8%** |
| eventual rejoin duration median | **30d** | **420d** |

This separation appears before the eventual long-tail outcome is known.

### Seed80 low-population control

Fast: 330 episodes. Long: 51.

| feature | fast | long |
|---|---:|---:|
| first-30 mean former-home distance | **3.93** | **5.14** |
| first-30 within radius4 share | **71.4%** | **34.2%** |
| first-30 within radius6 share | **97.7%** | **87.4%** |
| first-90 mean distance | **3.74** | **5.67** |
| first-90 within radius6 share | **98.5%** | **74.8%** |
| eventual rejoin duration median | **30d** | **360d** |

The same early-drift signal exists in seed80. It is therefore a general episode-level predictor, not a seed45-only anomaly.

### Other sampled worlds

The pattern is consistent:
- seed1 first-30 mean distance: fast **3.69**, long **5.02**;
- seed4: **3.71 vs 4.96**;
- seed9: **3.74 vs 5.31**;
- seed98: **3.59 vs 5.39**.

First-30 radius4 exposure likewise falls sharply in long episodes in all sampled worlds.

## What does *not* explain seed45's long episodes

### Former-settlement resources

Seed45 fast vs long at leave:
- former population: **5.09 vs 5.33**;
- food remaining fraction: **99.16% vs 99.18%**;
- food capacity/member: **68.1 vs 73.0**;
- local passable share: **95.7% vs 96.0%**.

These are effectively the same. Resource scarcity, settlement size, and local coast/passability do not explain the within-seed split.

### Age / reproductive horizon

Seed45 long episodes are not caused by aging out of reproduction:
- fast age mean: **31.11y**;
- long age mean: **29.74y**;
- remaining reproductive years: **13.89 vs 15.26**.

The long group is slightly younger and has *more* remaining reproductive time.

### Local male opportunity

Seed45 first-30 eligible-male opportunity:
- radius1: fast **20.0%**, long **19.1%**;
- radius3: fast **68.5%**, long **69.4%**.

First-90 radius3 opportunity is also nearly identical: **68.5% fast vs 68.7% long**.

Thus the difference between seed45 fast and long reattachment episodes is not explained by early eligible-male availability. Reproduction scarcity is a major world-level consequence of being unsettled, but it is not the predictor of which particular leave episode becomes a long reattachment failure.

### Local tile food

Seed45 first-30 mean current-tile food fraction:
- fast **97.45%**;
- long **97.60%**.

Again, essentially identical.

## Secondary signal: another settlement becoming relatively attractive

Long episodes show a modestly higher share of early days where another active settlement is closer than the former settlement, but the effect is much weaker than former-home distance itself.

Seed45 first 30 days:
- fast: **6.34%**;
- long: **9.75%**.

Seed80:
- fast: **7.07%**;
- long: **10.12%**.

By 90 days the gap grows somewhat, but the median remains zero. This may be a downstream consequence of outward drift rather than an independent cause.

## Interpretation

The long-tail failure is best described as an **early trajectory bifurcation**:

1. Natural settlement membership is lost near the radius-3 boundary.
2. Most leave episodes stay spatially close during the next few weeks and reattach quickly.
3. A minority drift outward during the first 30 days.
4. Once the former-home distance is persistently around 5+ rather than ~3–4, the episode has a much higher chance of entering the 180+ day tail.

The predictor is geometric and episode-local. It is not primarily explained by former-home resources, age, terrain openness, current food availability, or early eligible-male opportunity.

This is important because previous rejected experiments acted on **all** detached people or enlarged authoritative membership. The current evidence supports a narrower decision boundary: any future rescue mechanism should only be considered for episodes that remain detached long enough to exhibit this early outward-drift signature.

## What this study does not prove

The result is predictive, not yet causal. Pulling an at-risk human home could still alter local mating opportunities and amplify population history, as previous movement experiments demonstrated.

Also, comparing all fast episodes against long episodes includes many fast episodes that resolve before day 30. A deployable rule would make its decision at a specific time while the episode is still unresolved. The next study must therefore evaluate a **day-30 off-policy classifier** only among episodes still detached at that point.

## Decision

- Keep the compact predictor tracker as a reusable research tool.
- Do **not** add movement behavior yet.
- Do not change membership, reproduction, fertility, or home bias.
- Remove the expensive probe before merge.
- Next research: among episodes still unresolved at day 30, test simple eligibility rules based on current/mean former-home distance and radius4 exposure, and quantify precision/recall for eventual >180d same-home rejoin failure versus fast 31–90d rejoin and legitimate other-settlement joins.
