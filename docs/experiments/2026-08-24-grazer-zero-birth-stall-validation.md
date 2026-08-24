# Fresh validation of sustained zero-birth stall — 2026-08-24

Issue: #130
Sprint: 027

## Question

After Sprint026 showed that prolonged low population can still recover, does **40 continuous years with zero grazer births** provide a conservative signal that a still-living compact population has lost generational recovery capacity?

This study changes evaluation only. Runtime ecology, founder placement/count semantics, and default-world behavior remain unchanged.

## Fixed hypothesis

After year20:

- population size is descriptive only and never triggers the rule;
- a still-living world is flagged `generationally stalled` after exactly **40 continuous years with zero births**;
- any later 10-year checkpoint with rolling previous-20-year births `>=5` is a false non-recovery signal and rejects the hypothesis;
- extinction is direct non-persistence and requires no waiting period.

The 40-year duration and birth-only logic were frozen before results.

## Fresh matrix

Seeds `31..60` × founders `2/4/6/8/10` = **150 worlds**, each run to year300.

These seeds were not used in Sprints021–026 compact initialization/evaluation studies.

## Result

- worlds: **150**;
- extinctions by year300: **32**;
- still-living worlds reaching 40 years of zero births: **0**;
- false non-recovery signals: **0**;
- censored flagged/alive/unrecovered cases: **0**.

Under the pre-registered false-signal criterion, the rule therefore produces **zero false positives** on this fresh matrix.

However, the result is one-sided: the rule never fires while a population is alive.

### Persistent worlds remain well below 40 years

Among the 118 worlds alive at year300, the ten longest observed zero-birth spans range from ~21.21 to **22.71 years**.

The maximum is seed39×8 at ~**22.71 years**. Other long-lived examples include:

- seed37×10: ~22.24y;
- seed48×4: ~22.22y;
- seed55×4: ~22.11y;
- seed47×8: ~21.84y.

This is consistent with a 40-year duration being conservative against false non-recovery signals.

### Extinctions occur before the 40-year living-world flag

All **32** eventual extinctions occur without the world first reaching 40 continuous zero-birth years while still alive.

Examples span early and late extinction:

- seed33×2: extinct ~year20.42;
- seed32×10: extinct ~year59.59;
- seed51×10: extinct ~year90.66;
- seed32×4: extinct ~year107.01;
- seed37×4: extinct ~year202.91;
- seed33×4: extinct ~year241.68.

After extinction, of course, the zero-birth counter can grow arbitrarily long; that post-extinction time is not a living-world warning signal and is not counted as a stall trigger.

Thus the 40-year rule has **no observed pre-extinction sensitivity** in this validation set.

## Interpretation

Sprint027 establishes two different facts:

1. **specificity evidence is strong in this sample** — no still-living world crosses 40 zero-birth years and later recovers;
2. **sensitivity evidence is absent** — no still-living world crosses the boundary at all, including all worlds that later become extinct.

Therefore it would be misleading to call 40-year zero-birth a mature compact non-recovery classifier. It is a very conservative boundary with zero observed false signals, but the validation is effectively a **no-trigger / one-sided pass**.

This does support the deeper causal distinction from Sprint026: generational activity is more informative than raw population abundance. Persistent worlds can remain below population10 for decades, but in this fresh sample they do not remain birthless for comparable durations.

## Decision

- Record that the pre-registered **zero-false-signal criterion passes** on 150 fresh worlds.
- Do **not** promote 40-year zero-birth as a complete or operational compact persistence gate because it never triggers before extinction in this sample.
- Do not shorten the duration in this issue.
- Do not add population/resource conditions in this issue.
- Do not change ecology, founder count, or placement.

The next evaluation study should address **sensitivity separately**: characterize terminal pre-extinction zero-birth durations versus the longest birth gaps in persistent worlds, then pre-register any shorter candidate on another fresh seed set. That is a new hypothesis and requires a separate issue.

Default worlds remain creature-free.

## Cleanup

Temporary probe/test override are removed before merge. Runtime behavior remains unchanged.
