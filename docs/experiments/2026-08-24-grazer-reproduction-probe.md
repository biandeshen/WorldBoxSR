# Condition-gated grazer reproduction probe — 2026-08-24

Issue: #97
Sprint: 012

## Question

Can a minimal local-condition reproduction rule recover low-density grazer populations while naturally suppressing births under resource pressure, without adding a global population target or consuming sequential world RNG?

The mechanism was tested as temporary research logic only. No runtime reproduction state or snapshot changes were made during the probe.

## Pre-registered mechanism

An attempted pair required:

- both grazers at least 1 year old;
- Chebyshev distance <= 1;
- health >= 0.95 for both;
- hunger <= the existing grazer hungry threshold for both;
- radius-1 local vegetation utilization >= 0.50 for both;
- neither grazer inside a 360-day research-only birth cooldown;
- stable deterministic pairing, with at most one attempted pair per grazer/day.

Each eligible pair received keyed-random birth chance `0.001` per day. A successful birth created one normal age-0 grazer at a parent tile and put both parents on a 360-day research-only cooldown.

No sex field, persistent mate bond, genealogy, gestation, litter model, species framework, or global population controller was introduced.

## Stage 1 — 10-year screen

Creature-only 24×24 worlds used seeds `1/4/9`, deterministic adult starting densities `20/100/200`, and reproduction disabled/enabled pairs.

### Low density — 20 founders

| Seed | Births | Final living | Deaths | Final vegetation utilization |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 10 | 30 | 0 | 93.6% |
| 4 | 11 | 31 | 0 | 96.7% |
| 9 | 15 | 35 | 0 | 95.1% |

The rule produces slow expansion with abundant vegetation and no starvation.

### Transition density — 100 founders

| Seed | Births | Final living | Deaths | Max living | Final vegetation utilization |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 23 | 121 | 2 | 121 | 5.3% |
| 4 | 54 | 154 | 0 | 154 | 16.1% |
| 9 | 35 | 135 | 0 | 135 | 4.5% |

Births stop as local condition/resource gates fail, but the 10-year horizon was not long enough to tell whether these populations had reached a stable resource-limited state. This ambiguity motivated Stage 2 without changing any mechanism parameter.

### Overloaded density — 200 founders

| Seed | Births | Final living | Deaths | Max living | Final vegetation utilization |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 16 | 115 | 101 | 213 | 5.4% |
| 4 | 33 | 161 | 72 | 233 | 4.2% |
| 9 | 19 | 133 | 86 | 218 | 4.2% |

The corresponding no-reproduction year-10 survivors were 114 / 164 / 130. Despite early births, overloaded worlds therefore converge back to essentially the same landscape-specific survivor plateaus. Birth counts freeze early as resource pressure rises.

## Stage 2 — unchanged rule, 20-year extension

Only `20/100` founder cases were extended to 20 years. The mechanism and all thresholds/chances remained unchanged.

### 20 founders after 20 years

| Seed | Births | Final living | Deaths | Max living | Final vegetation utilization |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 45 | 65 | 0 | 65 | 80.2% |
| 4 | 44 | 64 | 0 | 64 | 91.0% |
| 9 | 58 | 78 | 0 | 78 | 82.0% |

Low-density worlds continue to grow gradually while retaining high vegetation utilization.

### 100 founders after 20 years

| Seed | Births | Final living | Deaths | Max living | Final vegetation utilization |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 23 | 115 | 8 | 121 | 5.3% |
| 4 | 55 | 155 | 0 | 155 | 5.3% |
| 9 | 35 | 134 | 1 | 135 | 4.1% |

The important behavior is temporal:

- seed 1 reaches 121 by year4, records no further births after 23 total, and drifts to 115 by year20;
- seed 4 reaches 155, records only one additional birth after year10, and remains there while vegetation settles near 5%;
- seed 9 reaches 135 by year5, records no further births, and remains ~134 through year20.

The reproduction gate therefore shuts itself as local vegetation/condition deteriorates. There is no ongoing birth pressure once the population reaches the resource-limited regime.

## Sequential RNG

Every disabled/enabled run asserted that `world.rng` state was unchanged after deterministic initialization. The temporary mechanism uses keyed randomness only.

## Decision

**Pass the mechanism for a real off-by-default runtime spike.**

The same pre-registered rule demonstrates all required qualitative behaviors:

1. low-density recovery without vegetation destruction;
2. self-suppression of births under resource pressure;
3. bounded overloaded populations;
4. preservation of landscape-dependent carrying pressure rather than convergence to a scripted target;
5. sequential RNG isolation.

The mechanism should now be implemented authoritatively behind a default-zero reproduction chance, with explicit persisted cooldown state and typed birth history. That implementation is a separate gate and must prove behavior-neutrality when disabled.

## Runtime implementation constraints

A follow-up implementation should:

- keep reproduction disabled by default;
- preserve deterministic stable pair selection;
- keep the same condition/local-resource gates for the first implementation;
- persist only the minimal cooldown state actually required;
- emit typed `creature.born` history with both parent creature references/IDs;
- keep human and creature identity domains independent;
- consume no sequential world RNG;
- add no sex, mate-bond, genealogy, gestation, litter, predator, or species framework unless separately justified;
- include disabled-mode semantic guards and multi-seed reproduction regressions before enabling any default animal population.

## Cleanup

The temporary probe, temporary `npm test` override, and CI artifact upload are removed before merge. Sprint 012 ships research evidence only.
