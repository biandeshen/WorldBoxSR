# Grazer encounter-recovery study — 2026-08-24

Issue: #105
Sprint: 015

## Question

Sprint 014 found that simple grazer senescence fails because the current reproduction system enters a two-stage recovery trap:

`resource depletion suppresses births → mortality reduces population → vegetation recovers → sparse distribution suppresses adjacent encounters`

Can the low-density encounter bottleneck be removed by widening only the partner-search geometry, while leaving the already-validated birth probability and local resource gate unchanged?

## Method

This was a **research-only** experiment. No runtime config, snapshot, movement, lifespan, or reproduction behavior was changed.

The temporary reproduction copy preserved the authoritative Sprint 012/013 rule:

- age >= 1 world year;
- health >= 0.95;
- hunger <= existing `grazerHungryThreshold`;
- each parent radius-1 local vegetation utilization >= 0.50;
- one-world-year successful-birth cooldown;
- keyed birth chance `0.001` per eligible pair/day;
- stable deterministic pair selection;
- at most one attempted pair per grazer/day;
- one age-0 child on parent A's tile;
- no sequential RNG.

The **only experimental variable** was maximum partner-search Chebyshev distance: `1 / 2 / 3`.

A wider radius changed encounter opportunity only. It did not move animals, change either parent's local resource test, create mate bonds, or imply co-residence.

To expose the known recovery problem, the rejected Sprint 014 keyed `18–36` year lifespan was reused only as a temporary turnover stressor.

Matrix:

- 24×24 creature-only worlds;
- landscape seeds `1 / 4 / 9`;
- founder densities `100 / 200`;
- founders age 2 years;
- 45-year horizon;
- 30-day vegetation sampling;
- yearly recovery checkpoints.

Every run asserted exact sequential `world.rng` neutrality.

## Final state

### 100 founders

| Partner radius | Seed 1 | Seed 4 | Seed 9 | Post-founder births | Final vegetation utilization |
| ---: | ---: | ---: | ---: | --- | --- |
| 1 | 7 | 33 | 3 | 2 / 20 / 1 | 99.0% / 96.8% / 99.8% |
| 2 | 10 | 47 | 57 | 3 / 31 / 43 | 98.7% / 94.9% / 90.3% |
| 3 | **39** | **99** | **76** | **29 / 74 / 58** | **91.4% / 80.4% / 84.7%** |

### 200 founders

| Partner radius | Seed 1 | Seed 4 | Seed 9 | Post-founder births | Final vegetation utilization |
| ---: | ---: | ---: | ---: | --- | --- |
| 1 | 16 | 19 | 9 | 7 / 8 / 2 | 97.8% / 98.4% / 99.2% |
| 2 | 34 | 67 | 52 | 17 / 43 / 34 | 93.0% / 90.8% / 91.7% |
| 3 | **42** | **61** | **70** | **28 / 42 / 50** | **91.6% / 92.5% / 85.0%** |

## Interpretation

### Radius 1 reproduces the diagnosed Allee collapse

The control reproduces Sprint 014. Once founders disappear, resource-rich survivors often have almost no adjacent eligible pair supply. Final populations remain tiny even while vegetation returns to ~97%–100%.

### Radius 2 materially helps but fails the all-landscape gate

Radius 2 improves seed 4 and seed 9 substantially, but seed 1 / 100 founders remains a failed recovery:

- founders disappear around year 33.5;
- only 3 births occur after founder extinction;
- population is ~12 around year 34 and ends at only 10 by year 45;
- vegetation is ~98.7%, so the failure is not resource shortage.

Therefore radius 2 is **not** robust enough to advance as the recovery geometry.

### Radius 3 is the smallest tested radius that passes all six stress worlds

Radius 3 produces continuing replacement-generation reproduction after complete founder turnover on every landscape and both founder densities.

Representative recovery after founder extinction:

- seed 1 / 100: ~15 at year 34 → 39 at year 45;
- seed 4 / 100: ~43 → 99;
- seed 9 / 100: ~30 → 76;
- seed 1 / 200: ~14 → 42;
- seed 4 / 200: ~23 → 61;
- seed 9 / 200: ~22 → 70.

The recovery is not a hidden population controller. Different landscapes still settle at different population/resource trajectories.

## Resource gate remains causal

Widening encounter distance does **not** bypass the existing local vegetation gate.

Across radius-3 high-pressure worlds, the depleted phase still contains long spans with `resourceReady = 0` and therefore zero eligible pairs, despite many living animals. Births restart only after mortality reduces consumption and local vegetation recovers.

Minimum vegetation utilization during the stress runs still reaches approximately 2%–6%, while year-45 vegetation recovers to roughly 80%–92% under radius 3. The experiment therefore opens a low-density recovery path without keeping vegetation permanently depleted.

## Decision

**Radius 3 is the smallest tested partner-search geometry that passes Sprint 015's research gate.**

Radius 2 is rejected as insufficient because it fails the seed1 / 100-founder recovery case. Radius 3 passes all six turnover stress worlds while preserving resource suppression and sequential RNG isolation.

This is an evidence result, **not yet a runtime change**.

Do not modify authoritative partner search, add senescence, or create a mate/social entity in this research PR.

## Next gate

Before making radius 3 authoritative, isolate the runtime effect from the temporary senescence stressor:

- compare authoritative/no-senescence reproduction with partner radius 1 versus 3;
- keep birth chance `0.001` and local vegetation threshold `0.50` unchanged;
- confirm radius 3 does not inflate low/medium-density births enough to erase the existing carrying-pressure envelope;
- preserve keyed randomness and default-off behavior;
- if that check passes, promote only the encounter-radius seam in a separate implementation PR, then revisit natural senescence independently.

Do not encode a population target, weaken the resource gate, or broaden the experiment into mate bonds, migration, sex, genealogy, predators, or a species framework.

## Cleanup

The temporary encounter probe, temporary `npm test` override, and CI artifact upload are research scaffolding only and must be removed before merge. Runtime behavior remains unchanged by Sprint 015.
