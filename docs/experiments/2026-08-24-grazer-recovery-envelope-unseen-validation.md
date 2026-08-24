# Unseen validation of compact 40-year recovery envelope — 2026-08-24

Issue: #128
Sprint: 026

## Question

Does the post-hoc 40-year recovery-envelope candidate from Sprint 025 survive independent compact-world validation?

The candidate was frozen before this study. This issue changes evaluation only; ecology, founder placement/count semantics, runtime initialization, and default-world behavior remain unchanged.

## Fixed candidate

After year20, a non-extinct world is flagged `candidate stalled` when either:

- living population remains `<10` for 40 continuous years, or
- grazer births remain zero for 40 continuous years.

After a flag, any later 10-year checkpoint with both population `>=10` and rolling previous-20-year births `>=5` is a **false non-persistence signal** and rejects the candidate.

The 40-year value and `either` logic were pre-registered and were not changed after observing results.

## Unseen-to-derivation matrix

Seeds `17..30` × founders `2/4/6/8/10` = **70 worlds**, each run from year0 to year300.

These worlds were not part of Sprint025's 18-case threshold-derivation set.

## Result

- worlds: **70**;
- eventual extinctions by year300: **11**;
- worlds crossing the 40-year candidate boundary while still alive: **2**;
- false non-persistence signals: **1**;
- censored flagged/alive/unrecovered worlds at year300: **0**.

Because the pre-registered acceptance criterion required **zero false signals**, the candidate is rejected in Stage 1. No Stage 2 extension is needed.

## Decisive false signal — seed20 × 2 founders

This world is a direct counterexample to using prolonged low population by itself as a non-recovery boundary.

- 40-year candidate flag: ~**year59.997**;
- flag cause: continuous `population <10`;
- meaningful recovery: **year70**;
- year70 population: **14**;
- year70 rolling20 births: **14**;
- final year300 population: **36**;
- longest population<10 span: ~**41.81 years**;
- longest zero-birth span: only ~**14.81 years**.

The trajectory begins extremely small and stays below ten for decades, but reproduction continues often enough to maintain recovery capacity. After the false stall flag the population grows to 37 by year80 and continues through repeated resource-demography cycles to year300.

Therefore **duration below a fixed population floor is not sufficient evidence of non-recovery**.

## Other flagged world — seed18 × 10 founders

The second candidate flag is not a false signal:

- 40-year flag: ~**year296.78**;
- cause: continuous low population;
- extinction: ~**year297.04**;
- no later recovery.

This case is compatible with the candidate, but one compatible example cannot rescue a rule already falsified by seed20×2.

## Extinctions do not require a waiting threshold

Eleven worlds become extinct by year300. Most do not reach the 40-year boundary while still alive because extinction itself is already decisive non-persistence evidence.

The recovery envelope is only needed for **living low-population worlds**, where the unseen counterexample shows population duration alone is too coarse.

## Structural interpretation

Sprint025's in-sample separation conflated two observables:

- demographic abundance (`population <10`);
- generational activity (birth absence).

The unseen counterexample separates them. A compact population can remain numerically small for more than 40 years while still producing enough offspring to rebuild. Low abundance is a state; loss of reproduction is closer to a causal recovery-capacity failure.

In this 70-world validation, neither flagged case reached a 40-year zero-birth duration while alive. The only false signal is caused by the population branch of the `either` rule.

This is evidence for a **new hypothesis**, not permission to silently edit the failed rule. Any birth-stall-only or joint-condition criterion requires a separately pre-registered issue and unseen validation set.

## Decision

**Reject the Sprint025 40-year `population-low OR zero-birth` recovery envelope.**

- do not adjust it to 45/50 years in this issue;
- do not switch to `AND` or birth-only logic in this issue;
- do not change founder count, placement, ecology, or runtime behavior;
- preserve the falsifying seed20×2 case as evidence;
- next evaluation research should isolate generational/reproduction stall as a distinct hypothesis on a new validation set.

Default worlds remain creature-free.

## Cleanup

Temporary probe/test override are removed before merge. Runtime behavior remains unchanged.
