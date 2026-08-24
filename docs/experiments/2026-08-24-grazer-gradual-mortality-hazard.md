# Grazer gradual mortality-hazard validation — 2026-08-24

Issue: #114  
Sprint: 019

## Question

Sprints 017–018 showed that hard keyed lifespan bands fail at carrying pressure even with authoritative radius-3 reproduction, and that spreading founder ages across 0–6 years is not enough to rescue the same hard-lifespan mechanism.

This study changes **mortality shape only**: replace the hard death-day cliff with one pre-registered gradual age-dependent hazard while leaving reproduction, resources, encounter geometry, and founder age fixed.

## Fixed authoritative ecology

All runs use the current runtime ecology directly:

- reproduction partner-search Chebyshev radius 3;
- each parent's local vegetation test remains radius 1 with threshold `0.50`;
- birth chance `0.001`;
- existing maturity, health, hunger, one-year successful-birth cooldown, stable pairing, and keyed-random behavior;
- age-2 founders;
- no global population target;
- no sequential RNG.

Old-age mortality is **research-only** in this sprint.

## Pre-registered hazard

No old-age mortality before age 12.

For age >= 12:

`pAnnual(age) = min(0.50, 0.01 * 2 ^ ((ageYears - 12) / 3))`

Daily probability:

`pDaily = 1 - (1 - pAnnual) ^ (1 / daysPerYear)`

A dedicated keyed chance from `(world.seed, creature.id, world.day, salt)` is evaluated after daily grazer action/day increment and before reproduction.

Reference annual rates are 1% at 12y, 2% at 15y, 4% at 18y, 8% at 21y, 16% at 24y, 32% at 27y, and a 50% cap from age 30 onward. There is **no hard maximum age**.

No hazard parameter was tuned after observing results.

## Stage 1 — 60-year screen

Matrix: seeds `1/4/9` × founders `20/100/200`.

All 9 worlds remained multi-generational. Every run had replacement-parent births and births in years 41–60, so the pre-registered gate allowed the unchanged curve to advance to 120 years.

The weakest Stage-1 case, seed1/100, fell to 5 animals but ended year60 at 11 with 12 births in the final 20 years. It was therefore a recovering low rather than the terminal one-animal / zero-recovery pattern seen under hard lifespan bands.

## Stage 2 — 120-year validation

### Population and continued reproduction

| Founders | Seed | Final population | Minimum after year20 | Maximum population | Births in years101–120 | Replacement-parent births |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 1 | 47 | 32 | 101 | 24 | 299 |
| 20 | 4 | 104 | 43 | 154 | 73 | 463 |
| 20 | 9 | 72 | 20 | 129 | 53 | 354 |
| 100 | 1 | 91 | 5 | 127 | 89 | 226 |
| 100 | 4 | 119 | 10 | 166 | 90 | 365 |
| 100 | 9 | 52 | 14 | 138 | 16 | 295 |
| 200 | 1 | 102 | 5 | 211 | 99 | 239 |
| 200 | 4 | 134 | 7 | 239 | 116 | 357 |
| 200 | 9 | 86 | 13 | 222 | 72 | 283 |

All 9 worlds are alive and reproducing at year120. No run ends as a non-reproducing terminal tail.

The populations are **oscillatory, not equilibrated**. For example:

- seed1/100: `7` at year30 → `5` at years35–40 → `102` at year85 → `47` at year110 → `91` at year120;
- seed1/200: `5` at year30 → `93` at year80 → `42` at year100 → `102` at year120;
- seed9/100: `16` at year30 → `130` at year60 → `29` at year80 → `132` at year105 → `52` at year120.

These are endogenous resource–demography cycles, not convergence to a scripted target.

### Resource pressure remains causal

Minimum vegetation utilization remains in the previously measured carrying-pressure regime for the overloaded founders:

| Founders | Seed1 | Seed4 | Seed9 |
| ---: | ---: | ---: | ---: |
| 20 | 18.28% | 12.19% | 9.76% |
| 100 | 5.93% | 4.10% | 3.76% |
| 200 | 3.52% | 1.93% | 2.97% |

High-density worlds still experience the same initial resource collapse and birth suppression. The hazard does not weaken the local vegetation gate or bypass carrying pressure.

What changes relative to a hard lifespan is the **distribution of removal through time**. As population declines and vegetation recovers, enough reproductively viable stock remains distributed across ages for encounters and births to resume. That recovery then pushes the population back toward resource pressure, producing repeated cycles.

### Mortality is genuinely gradual

Across the 120-year runs, old-age deaths span broad ages rather than clustering at one death band. Median old-age death ages are approximately **23.5–24.2 years** across the matrix, while observed maxima range from about **32.7 to 36.8 years**.

Examples:

- seed1/20: old-age deaths range `12.59–36.77y`, median `23.86y`;
- seed4/100: `12.79–34.14y`, median `23.56y`;
- seed9/200: `12.23–34.46y`, median `24.19y`.

The tested rule therefore does not recreate a hidden hard cutoff.

### Starvation and old age remain distinct causes

Starvation still occurs only where early carrying pressure produces it:

- 100 founders: seed1 records 15 starvation deaths; seeds4/9 record 0;
- 200 founders: seed1/4/9 record 107 / 71 / 95 starvation deaths.

Research old-age deaths are counted separately, so the causal distinction remains legible rather than collapsing all mortality into one generic removal process.

## Determinism

Every Stage-1 and Stage-2 run preserved the sequential world RNG fingerprint exactly. The hazard uses keyed randomness only.

No runtime state, config, event semantics, or snapshot schema changed during this research sprint.

## Decision

**The pre-registered gradual hazard passes the research gate.**

Unlike hard keyed lifespan bands, the same unchanged curve supports multiple generations through 120 years at low density and carrying pressure on all three landscapes. It preserves resource-limited suppression/recovery, remains bounded without a population target, keeps starvation and old-age causally distinct, and does not consume sequential RNG.

This is evidence for the mortality **shape**, not permission to silently ship research code.

Next step: a separate implementation gate may promote this exact curve as authoritative, default-off grazer old-age mortality. That implementation must preserve disabled-world behavior exactly, emit normal typed `creature.died` history with cause `old_age`, retain deterministic save/load and sequential RNG isolation, and re-run the multi-seed ecological regression without tuning the curve.

## Cleanup

The temporary hazard probe and test-script override are removed before this research PR merges. Only the evidence and decision remain from Sprint 019.
