# Settlement membership hysteresis — negative experiment

Date: 2026-08-23
Issue: #55
PR: #56

## Question

Previous settlement-churn research showed that seed45 is not unusual because it leaves settlements too often. Its abnormality is the long recovery tail after a normal distance-driven `settlement -> null` transition: reproduction-age females spend 61.45% of post-first-join time unsettled, with long reattachment episodes after crossing the radius-3 membership boundary.

The experiment tested whether a conservative retention radius could remove that binary cliff without changing normal joins or direct switches.

## Experimental rule

Baseline join radius remained 3. When normal membership resolution returned no settlement, a human that previously belonged to an active settlement could retain that old membership while within an experimental retention radius of 4 or 5.

The implementation added no RNG calls and did not change the 5% settlement home-bias probability. The only intended difference was extending the distance over which the old `settlementId` remained active, which also necessarily extended the distance over which existing home bias could continue to operate.

A radius of 3 was the explicit off/control case and reproduced baseline behavior exactly in focused tests.

## 100-year scan

Seeds: 1–10, 45, 80, 98. Worlds: 24×24, 30 founders.

### Baseline retention radius 3

- population min / median / mean / max: **35 / 310 / 349.77 / 649**
- reproduction-age-female post-first-join unsettled share: median **21.84%**
- seed45 population: **35**
- seed45 post-first-join unsettled share: **61.45%**
- seed45 leave events / 100 person-years: **39.07**

### Retention radius 4

The mechanism did reduce detachment exposure, but demographic history changed too strongly:

- population min / median / mean / max: **16 / 453 / 387.92 / 647**
- population median changed **310 -> 453**
- seed45 post-first-join unsettled share improved **61.45% -> 52.24%**
- seed45 leave rate improved **39.07 -> 19.07 / 100 person-years**
- but seed45 population worsened **35 -> 16**
- seed80 population changed **112 -> 171**
- seed98 population changed **431 -> 463**

This candidate fails the demographic-safety gate immediately.

### Retention radius 5

Retention became stronger, but whole-world trajectories were still materially rewritten:

- population min / median / mean / max: **38 / 387 / 349.77 / 635**
- population median changed **310 -> 387** (~+24.8%) despite the mean coincidentally matching baseline
- seed45 unsettled share improved **61.45% -> 37.53%**
- seed45 population stayed near the 100-year control (**35 -> 38**)
- but ordinary worlds moved substantially, for example:
  - seed1: **306 -> 106**
  - seed3: **474 -> 411**
  - seed80: **112 -> 224**
  - seed98: **431 -> 467**

The unchanged mean is cancellation, not neutrality. The per-seed trajectory changes and median shift are too large.

## Interpretation

The experiment confirms that the settlement-membership boundary is causally important: increasing retention sharply reduces long post-leave unsettled exposure and leave rates.

However, membership is not a passive label. While `settlementId` remains non-null, the existing settlement home-bias rule remains eligible to act. Extending membership therefore extends a movement force over a larger spatial band. That changes where adults meet, which changes local reproduction opportunity, which then amplifies over decades.

The result is another thresholded social feedback rather than a smooth quality-of-life fix.

## Decision

Reject settlement membership hysteresis v0.

- Do **not** expand the authoritative membership retention radius.
- Do **not** run a 200-year A/B for radius 4 or 5; neither passes the 100-year distribution gate.
- Remove all experimental runtime code and focused behavior tests from the branch.
- Keep the existing radius-3 membership semantics unchanged.

## Next research direction

The evidence still points to post-leave reattachment latency as a real problem, but the fix should not keep authoritative membership alive outside the join radius.

A narrower future experiment should separate **social/home memory** from **settlement membership**. One candidate is a short-lived former-home reference after `S -> null` that can be measured or tested independently without counting the human as a settlement member, altering settlement population, territory semantics, or extending the full membership/home-bias contract indefinitely.

Any such behavior must remain default-off, preserve the baseline RNG path when disabled, and be screened against seed45 plus ordinary-world population distributions before long-horizon validation.
