# Experiment: minimal settlement cohesion

Date: 2026-08-23  
Issue: #17  
Mechanic: current settlement members have a 5% chance, on a non-hungry passive move, to prefer a passable neighboring tile that reduces Chebyshev distance to their settlement center. If already at the center and the bias triggers, they stay. Hungry movement remains food-driven.

## Randomness isolation

The first prototype used the world's sequential RNG to decide whether home bias triggered. Parameter scans became misleading because enabling the mechanic shifted later birth/death random sequences.

The final design uses stateless keyed randomness from `(world seed, human id, day, mechanic salt)` for the optional override, while still consuming the original passive-movement RNG draw. This keeps the global RNG stream aligned for identical pre-states and makes comparison more causally legible.

## Parameter scan signal

Seed 45 was used as a structural sentinel, not as the sole tuning target. A 65% bias over-corrected heavily. After randomness isolation, smaller values showed that the mechanic has strong nonlinear feedback, so candidates were checked against a multi-seed sample before selection.

## 10-seed × 100-year comparison

Seeds 1–10, 24×24, 30 founders:

| Metric | Bias 0 | Bias 0.05 |
| --- | ---: | ---: |
| population min | 103 | 159 |
| population median | 395 | 389 |
| population mean | 413.6 | 396.9 |
| population max | 652 | 649 |
| extinction rate | 0% | 0% |
| median food remaining | 2.15% | 2.84% |

The small home bias does not globally inflate the 100-year population distribution.

## 10-seed × 200-year comparison

Same seeds and world parameters:

| Metric | Bias 0 | Bias 0.05 |
| --- | ---: | ---: |
| population min | 283 | 285 |
| population median | 615 | 624 |
| population mean | 550.4 | 551.6 |
| population max | 825 | 805 |
| extinction rate | 0% | 0% |
| median food remaining | 1.94% | 1.90% |

At 200 years the distributions are essentially unchanged at this sample size. The mechanic is not acting like a global population multiplier.

## Seed 45 contrast

The former low-density collapse changes from year-200 population **8 → 128**. The new trajectory is `44 → 35 → 65 → 128` at years 40/100/160/200, versus `46 → 23 → 16 → 8` before cohesion.

Food remaining at year 200 is still **96.45%**, so the recovery is not a carrying-capacity effect. The evidence supports the intended causal mechanism: a very small tendency to return toward an established population center can prevent the positive feedback loop where lower density causes fewer reproductive encounters, which causes still lower density.

## Decision

Use `settlementHomeBiasChance = 0.05` as the v0 default. Do not raise the global birth rate. Re-run the full 100-seed × 200-year baseline after subsequent settlement lifecycle/territory mechanics rather than overfitting this one change.
