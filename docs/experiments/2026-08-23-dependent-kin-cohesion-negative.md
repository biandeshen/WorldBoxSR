# Dependent-minor parent-following — negative experiment

Date: 2026-08-23  
Issue: #41

## Why this experiment existed

The spatial-kin baseline showed a real family-scale gap under the current movement model. At year 200 across 13 structural seeds:

- parent-child co-located share median: ~0.51%;
- parent-child within radius 1 median: ~3.63%;
- parent-child within radius 3 median: ~15.81%;
- median parent-child distance: ~8 tiles;
- dependent minors with a living parent within radius 3 median: ~30.51%.

The smallest proposed fix was not a full household system. It was a passive-movement bias for dependent children toward their nearest living parent.

## Mechanic iterations tested

The experimental branch tested progressively narrower variants:

1. minor parent-following during non-hungry passive movement;
2. only when the child was outside a radius-3 care zone;
3. only for children younger than 12;
4. hunger-driven movement always overrode kin cohesion;
5. the original sequential passive-movement RNG draw was always consumed;
6. the optional override used keyed/stateless randomness, so the experiment did not perturb history merely by adding RNG draws.

This matters: the observed demographic changes are genuine consequences of changed positions, not RNG-stream contamination.

## 100-year distribution scan

Seeds 1–10 + 45 + 98 were compared at chances 0, 0.4 and 0.8.

At chance 0.4 relative to baseline:

- population mean: ~-2.6%;
- population median: ~+1.1%;
- median dependent-minor parent-within-3 share: ~27.2% → ~51.1%;
- median parent-child distance: ~8 → ~7 tiles.

At the 100-year horizon, 0.4 looked like a plausible compromise: meaningful spatial improvement without obvious distribution-wide population inflation.

## 200-year A/B rejects the mechanic

The same 12 seeds were then run for 200 years at chance 0 and 0.4.

### Baseline (chance 0)

- population min / median / mean / max: 128 / 535 / 504 / 805;
- parent-child within radius 3 median: ~16.59%;
- dependent-minor parent-within-3 median: ~31.01%;
- median parent-child distance: 8 tiles;
- seed 45: population 128, births 184, deaths 86, food remaining ~96.45%, 7 active settlements.

### Chance 0.4

- population min / median / mean / max: 10 / 541 / 493.67 / 818;
- population mean changed only ~-2.0%, median ~+1.1%;
- parent-child within radius 3 median: ~18.52%;
- dependent-minor parent-within-3 median: ~39.00%;
- median parent-child distance: 7 tiles;
- **seed 45 collapsed to population 10**, births 41, deaths 61, food remaining ~99.86%, 1 active settlement.

The distribution center stayed broadly similar, but the mechanism reintroduced the exact catastrophic low-density tail that settlement cohesion had previously removed.

## High-bias seed-45 check

Because deterministic emergent feedback is non-monotonic, chance 0.8 was also checked at 200 years for seed 45 rather than assuming stronger attraction would be better.

Result:

- population: 22;
- births / deaths: 61 / 69;
- food remaining: ~99.77%;
- active settlements: 4.

It also fails the tail-safety requirement.

## Interpretation

The experiment proves two things simultaneously:

1. The measured family-scale spatial gap is real and can be changed by a very small local movement rule.
2. The current demographic model is extremely sensitive to exact spatial trajectories because reproduction requires an eligible male in the local 3×3 neighborhood.

A child-follow-parent rule changes where future adults emerge. Decades later this changes local mating opportunity, which can amplify into radically different population histories even though the rule itself never changes fertility and never consumes extra sequential RNG.

This is precisely why the behavior should **not** ship yet.

## Decision

**Reject dependent-minor parent-following v0.**

No runtime behavior, config field, or permanent behavior test from this experiment is merged. The main simulation remains unchanged.

The next evidence step should examine the deeper coupling directly: measure how often reproduction-eligible females have eligible males available in the current 3×3 neighborhood versus wider radii and settlement-level social pools. Until mating-opportunity semantics are understood, family/household movement rules are too likely to alter demography indirectly.

## Engineering lesson

For deterministic emergent simulations, preserving the RNG stream is necessary but not sufficient for causal isolation. A behavior-neutral-looking spatial rule can still create large long-horizon divergence through another mechanic that is sharply local in space.
