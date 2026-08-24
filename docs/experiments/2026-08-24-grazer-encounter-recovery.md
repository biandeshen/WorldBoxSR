# Grazer encounter-recovery study — 2026-08-24

Issue: #105
Sprint: 015

## Question

Sprint 014 found that simple grazer senescence fails because the current reproduction system enters a two-stage recovery trap:

`resource depletion suppresses births → mortality reduces population → vegetation recovers → sparse distribution suppresses adjacent encounters`

Can the low-density encounter bottleneck be removed by widening only the partner-search geometry, while leaving the validated birth probability and local resource gate unchanged?

## Fixed reproduction mechanism

This is research-only. The temporary reproduction copy preserves the authoritative Sprint 012/013 rule:

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

The only experimental geometry variable is maximum partner-search Chebyshev distance.

A wider encounter radius does not move animals, change either parent's local resource test, create a mate bond, or imply co-residence.

## Stage 1 — radius 1 / 2 / 3 under turnover stress

The rejected Sprint 014 keyed `18–36` year lifespan is reused only as a temporary turnover stressor so the known post-pressure recovery problem remains visible.

Matrix:

- 24×24 creature-only worlds;
- landscape seeds `1/4/9`;
- founder densities `100/200`;
- founders age 2 years;
- 45-year horizon;
- partner radii `1/2/3`.

### 100 founders

| Radius | Seed 1 final | Seed 4 final | Seed 9 final | Births after founders gone |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 7 | 33 | 3 | 2 / 20 / 1 |
| 2 | 10 | 47 | 57 | 3 / 31 / 43 |
| 3 | **39** | **99** | **76** | **29 / 74 / 58** |

### 200 founders

| Radius | Seed 1 final | Seed 4 final | Seed 9 final | Births after founders gone |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 16 | 19 | 9 | 7 / 8 / 2 |
| 2 | 34 | 67 | 52 | 17 / 43 / 34 |
| 3 | **42** | **61** | **70** | **28 / 42 / 50** |

Radius 2 materially improves recovery but fails the all-landscape gate. In seed1 / 100 founders it falls to ~12 around year34 and remains trapped around 9–11 through year45 despite ~99% vegetation.

Radius 3 is the first tested geometry where all six stress worlds survive founder turnover and enter a clear recovery trajectory:

- 100 / seed1: ~15 at year34 → 39 at year45;
- 100 / seed4: ~43 → 99;
- 100 / seed9: ~30 → 76;
- 200 / seed1: ~14 → 42;
- 200 / seed4: ~23 → 61;
- 200 / seed9: ~22 → 70.

The unchanged local vegetation gate remains causal. During the depleted phase, radius-3 worlds still have long spans with zero resource-ready parents/pairs; births restart only after local vegetation recovers.

## Stage 2 — 90-year multi-generation radius-3 check

Radius 3 is held unchanged and extended to 90 years with founder densities `20/100/200` across seeds `1/4/9`. The same temporary `18–36` turnover stressor remains active.

| Founders | Seed 1 final | Seed 4 final | Seed 9 final | Total births | Replacement-parent births |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 48 | 53 | 55 | 242 / 343 / 278 | 205 / 314 / 242 |
| 100 | 46 | 119 | 59 | 194 / 355 / 229 | 164 / 292 / 189 |
| 200 | 63 | 59 | 100 | 193 / 279 / 257 | 164 / 228 / 218 |

All nine worlds persist through multiple lifespan generations. Replacement-generation parents account for most later births, so the result is not a founder-tail artifact.

The dynamics are bounded resource cycles rather than monotonic growth:

`vegetation abundant → births resume → population rises → vegetation falls → births stop → turnover lowers population → vegetation recovers`

Examples from later cycles:

- 100 / seed1: 106 living at year60 with 20.9% vegetation → 39 at year85 with 78.6% → 46 at year90 while births restart;
- 100 / seed4: 163 at year55 with 13.8% vegetation → 58 at year75 with 63.6% → 119 at year90;
- 200 / seed9: 123 at year55 with 17.5% vegetation → 41 at year80 with 85.4% → 100 at year90.

The 20-founder worlds remain bounded too. They reach maxima 108/153/122 and finish 48/53/55 rather than growing without limit.

Every run preserves sequential `world.rng`.

## Stage 3 — compatibility with the current no-senescence runtime

Runtime still has no grazer senescence, so radius 3 was also compared with radius 1 in no-senescence 30-year worlds. Seeds are `1/4/9`; founders are `20/100/200`.

### 100 founders

| Radius | Seed 1 final | Seed 4 final | Seed 9 final | Final vegetation |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 114 | 155 | 130 | 5.6% / 5.0% / 4.6% |
| 3 | 115 | 165 | 134 | 5.1% / 3.4% / 3.9% |

### 200 founders

| Radius | Seed 1 final | Seed 4 final | Seed 9 final | Final vegetation |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 112 | 161 | 132 | 6.2% / 4.2% / 4.4% |
| 3 | 113 | 168 | 130 | 5.9% / 3.2% / 4.5% |

The overloaded populations remain on the same landscape-dependent carrying envelope. Radius 3 changes encounter opportunity and the approach timescale, not the resource-limited survivor scale.

### Low-density approach speed

Radius 3 does accelerate growth from 20 founders:

- year10: radius1 `30/31/35`, radius3 `47/51/47`;
- year20: radius1 `65/64/78`, radius3 `107/135/130`;
- year30: radius3 reaches `116/171/131` and the resource-limited regime, with final vegetation ~3.6%–5.7%.

This is not runaway growth. The same local vegetation gate removes birth eligibility as carrying pressure rises. Without senescence, any persistent positive reproduction eventually approaches the resource limit; radius 3 reaches it sooner.

## Decision

**Radius 3 is the smallest tested partner-search geometry that passes Sprint 015's research gate.**

- radius 2 is rejected because recovery remains unreliable on seed1;
- radius 3 preserves all six stress populations through founder turnover;
- radius 3 sustains multiple replacement generations for 90 years;
- the local vegetation birth gate remains active during depletion;
- no-senescence 100/200 worlds retain the same landscape-dependent carrying envelope;
- growth remains bounded by resource feedback;
- sequential RNG isolation is preserved.

This is an evidence result, not yet a runtime change.

## Implementation handoff

A separate authoritative change may promote only the encounter geometry:

- change maximum grazer partner-search Chebyshev distance from 1 to 3;
- keep local vegetation measurement radius at 1;
- keep birth chance, maturity, health, hunger, cooldown, stable pairing, and keyed randomness unchanged;
- keep reproduction default-off and default worlds creature-free;
- add forced-success coverage at distance 3 and rejection beyond 3;
- re-run existing multi-seed reproduction/carrying regressions;
- do not add a public interaction-radius framework/config unless another real mechanic requires it.

Do not infer mate bonds, sex, genealogy, migration, population targets, predators, or species infrastructure from this encounter result.

Only after radius 3 is independently authoritative should natural senescence be reintroduced and revalidated.

## Cleanup

The temporary encounter reproduction copy, temporary `18–36` turnover stressor, temporary `npm test` override, and CI artifact upload are removed before merge. Sprint 015 ships research evidence only.
