# Day-30 reattachment rescue eligibility — negative experiment

Date: 2026-08-23
Issue: #61
PR: #62

## Question

Research #59/#60 found a strong episode-level signal: leave episodes that eventually take more than 180 days to return to the same settlement are already farther from their former home during the first month.

That result was retrospective. A real intervention at day 30 cannot include episodes that have already reattached before day 30. This study therefore evaluates transparent rules only among episodes still detached through the day-30 decision point.

## Method

The merged compact episode tracker supplies one row per natural distance-driven leave. A pure off-policy evaluator selects only rows with:
- duration > 30 days; and
- a complete first-30 observation window.

The target is `long_same_rejoin` (>180 days). Other outcomes are intentionally not relabeled as failures.

Rules tested:
1. first-30 mean former-home distance >= 4.5;
2. first-30 radius-4 exposure <= 50%;
3. both drift conditions;
4. combined drift plus **zero** first-30 days where another active settlement was closer than the former home;
5. combined drift plus other-settlement-closer exposure <=10%.

For each rule we report recall, resolved precision, natural-recovery interference, and legitimate other-settlement migration interference.

Probe seeds: 1, 4, 9, 45, 80, 98. Horizon: 100 years. Worlds: 24×24, 30 founders. Cohort: reproduction-age females at leave.

## Broad drift rules have useful recall but unacceptable interference

The raw geometric predictor remains real, but it is too common among episodes that later recover naturally or join another settlement.

### Seed45

Day-30 risk set: 218 episodes.
- eventual long same-home targets: 46;
- fast 31–90d same-home recovery: 56;
- medium 91–180d recovery: 28;
- other-settlement joins: 87;
- censored: 1.

Mean-distance >=4.5:
- selected 149 / 218 (**68.35%**);
- recall **76.09%** (35/46 long episodes);
- resolved precision **23.49%**;
- false positives: 33 fast, 20 medium, 61 other-settlement joins;
- natural-recovery interference **63.10%**;
- migration interference **70.11%**.

Combined drift rule:
- selected 142 (**65.14%**);
- recall **67.39%**;
- precision **21.83%**;
- natural-recovery interference **60.71%**;
- migration interference **68.97%**.

These are not deployable rescue policies: most selected resolved episodes are not long-tail same-home failures.

### Seed80 low-population control

Day-30 risk set: 468; long targets: 51.

Combined drift:
- selected **64.32%** of at-risk episodes;
- recall **66.67%**;
- precision **11.41%**;
- natural-recovery interference **53.93%**;
- migration interference **72.20%**.

The same problem exists outside seed45.

### Other worlds

Broad drift rules repeatedly select around half or more of the day-30 risk set and interfere with a majority of legitimate other-settlement joins:
- seed1 combined migration interference: **68.14%**;
- seed4: **63.80%**;
- seed9: **69.93%**;
- seed98: **58.50%**.

Thus the day-30 outward-drift signal is predictive but not specific enough for intervention.

## Excluding episodes already oriented toward another settlement helps, but not enough

The strongest guard tested requires:
- mean distance >=4.5;
- radius4 exposure <=50%;
- **no** first-30 day with another settlement closer than the former home.

This sharply reduces migration interference, proving that explicit migration protection is important.

| seed | selection | recall | precision | natural-recovery interference | migration interference |
|---|---:|---:|---:|---:|---:|
| 1 | 18.76% | 35.94% | 14.56% | 20.81% | 14.22% |
| 4 | 13.57% | 25.00% | 7.59% | 16.42% | 10.04% |
| 9 | 27.37% | 48.78% | 10.99% | 28.70% | 22.73% |
| **45** | **38.07%** | **56.52%** | **31.33%** | **41.67%** | **25.29%** |
| **80** | **30.56%** | **49.02%** | **17.73%** | **33.51%** | **23.32%** |
| 98 | 9.51% | 48.65% | 11.69% | 12.57% | 4.98% |

Seed45 is the best case, but even there the rule selects:
- 26 true long-tail episodes;
- 20 fast natural recoveries;
- 15 medium recoveries;
- 22 legitimate other-settlement joins.

So 26 true targets come with 57 resolved false positives. A homeward movement intervention at day30 would still rewrite too many trajectories that were going to resolve normally.

The <=10% other-closer variant does not materially improve the tradeoff.

## Interpretation

The research chain now distinguishes three ideas that should not be conflated:

1. **Predictive signal:** early outward drift strongly correlates with later long reattachment.
2. **Actionable classifier:** a rule can identify long-tail episodes with sufficiently low false-positive cost.
3. **Safe behavior:** changing selected trajectories does not destabilize world demographics.

#59 established (1), but this study rejects (2) at day30. We therefore should not even proceed to (3) yet.

The main false-positive sources are structurally legitimate:
- episodes that need another 30–60 days and then naturally return;
- episodes in the process of joining another settlement.

Intervening at day30 is simply too early to distinguish these from eventual long-tail failures using the available transparent spatial features.

## Decision

Reject day-30 rescue eligibility as a behavior gate.

- Ship no homeward movement or rescue behavior.
- Keep the pure evaluator as a reusable research tool.
- Keep authoritative membership, home bias, movement, reproduction and migration semantics unchanged.
- Remove the expensive probe before merge.

## Next evidence step

Evaluate a **later decision point**, beginning with day90, using the already available first-90 compact episode features.

By day90:
- all fast <=90d natural recoveries have already resolved and leave the risk set;
- many legitimate migration episodes may also have resolved;
- long >180d episodes still have at least another 90 days before meeting the target definition.

The day90 study should again report recall, precision, medium-recovery interference and migration interference. If specificity does not improve substantially, abandon trajectory-rescue behavior rather than continuing to tune thresholds.
