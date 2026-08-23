# Reproduction opportunity sensitivity — 13 seeds at years 100 and 200

Date: 2026-08-23  
Issue: #43  
Seeds: 1–10, 45, 80, 98  
World: 24×24, 30 founders

## Purpose

Measure whether the current reproduction rule is unusually sensitive to exact grid position. A female can currently attempt reproduction only if at least one eligible male is inside the local 3×3 neighborhood (Chebyshev radius 1).

The accounting in this experiment is derived-only. It does not change movement, mating, fertility, RNG, settlements, or population behavior.

## Eligibility definition

The metrics intentionally mirror the current simulation rule:

- alive human;
- age >= adult age;
- hunger < 0.55;
- birth cooldown == 0;
- females additionally <= female fertility end age.

For each eligible female, the probe asks whether at least one eligible male exists in several counterfactual search scopes.

## Headline result

Healthy worlds are already close to saturated at the current radius-1 search, while the sparse demographic sentinel is not.

### Ordinary seeds 1–10 at year 100

- radius-1 opportunity share: min **70.0%**, median **99.0%**, mean **92.7%**;
- radius-3 opportunity share: **100% in every world**;
- average eligible males in radius 1: median ~**4.50**;
- average eligible males in radius 3: median ~**19.72**;
- same-settlement opportunity share: median ~**85.6%**.

### Ordinary seeds 1–10 at year 200

- radius-1 opportunity share: min **97.8%**, median **100%**, mean **99.2%**;
- radius-3 opportunity share: **100% in every world**;
- average eligible males in radius 1: median ~**6.01**;
- average eligible males in radius 3: median ~**28.45**.

In mature healthy worlds, exact local mating availability is therefore rarely limiting.

## Seed 45 exposes the sparse-world bottleneck

### Year 100

Seed 45 has:

- population: 35;
- eligible females / males: **6 / 12**;
- radius-1 opportunity share: **33.3%**;
- radius-3 opportunity share: **100%**;
- radius-5 opportunity share: **100%**;
- same-settlement opportunity share: **33.3%**;
- average eligible males radius 1: **0.33**;
- average eligible males radius 3: **1.83**;
- average eligible males same settlement: **0.33**.

The problem is not global absence of eligible males. There are twice as many eligible males as females globally. The bottleneck is their exact spatial distribution.

The same-settlement pool does not automatically solve the year-100 bottleneck: only one third of eligible females have an eligible male in their current settlement membership, while all have one within radius 3. The wider opportunity often crosses current settlement membership boundaries.

### Year 200

After the existing settlement-cohesion recovery, seed 45 has:

- population: 128;
- eligible females / males: 15 / 47;
- radius-1 opportunity share: **86.7%**;
- radius-3 opportunity share: **100%**;
- same-settlement opportunity share: **80.0%**;
- average eligible males radius 1: 1.40;
- average eligible males radius 3: 4.93.

The bottleneck weakens as population recovers, matching the expected density feedback.

## Other structural examples

Seed 80 at year 100 is also sparse (population 112) and shows radius-1 opportunity 75%, radius-3 100%, same-settlement opportunity only 37.5%. By year 200 it has grown to population 871 and radius-1 opportunity reaches 100%.

Seed 98 at year 100 already has population 431 and radius-1 opportunity 100%; it remains 100% at year 200. Its later settlement abandonment therefore cannot be explained by a lack of immediate eligible-male access at these checkpoints.

## Lineage and settlement pools are not substitutes for encounter range

`sameLineage` opportunity was 100% in all sampled checkpoints. This is expected because surviving lineages are large persistent ancestry groups, not residential units. It is further evidence that lineage identity must not be treated as a mating/co-residence pool.

Same-settlement opportunity is often lower than radius-3 opportunity, especially in sparse worlds. A settlement pool would encode a different social assumption and is not an obvious drop-in fix for the current local encounter rule.

## Interpretation

The current reproduction system contains a density-sensitive switch:

1. an eligible female with no male within radius 1 does not even draw the birth attempt for that day;
2. at low density, small movement changes can move females across this binary boundary;
3. the resulting birth differences change future density and therefore future opportunity;
4. the feedback can amplify for decades.

This explains why the rejected dependent-parent movement experiment could reintroduce catastrophic population collapse despite preserving the sequential RNG stream itself.

## Decision

Do **not** add family/household movement behavior yet.

The next behavior experiment, if any, should target reproduction opportunity directly and minimally rather than adding another movement force. However, it must be designed carefully: simply widening the search radius changes which females enter the sequential birth-RNG path, so a naive radius change would mix the intended mating-opportunity effect with additional RNG-stream divergence.

Before changing the reproduction radius, define an experiment that causally isolates newly available mating opportunities from incidental RNG-consumption changes. The radius-1/radius-3 opportunity measurements in this report are the baseline for that work.

## Engineering note

The temporary 13-seed × 200-year GitHub Actions probe took ~88 seconds and was removed after evidence capture. Reusable reproduction-opportunity metrics and focused neutrality tests remain in the repository.
