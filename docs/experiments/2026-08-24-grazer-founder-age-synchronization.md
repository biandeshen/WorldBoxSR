# Grazer founder-age synchronization diagnostic

Date: 2026-08-24  
Sprint: 018 / #112

## Question

Sprint 017 rejected hard keyed-uniform grazer lifespans because the 12–18 year band collapses at carrying pressure even after authoritative partner search widened to radius 3. Before changing the mortality curve, this diagnostic asks whether the failure is mainly an artifact of an artificially synchronized founder cohort.

Only founder starting age changes. Reproduction, resource, encounter, and research mortality semantics remain fixed.

## Fixed mechanics

- 24×24 creature-only worlds;
- seeds `1/4/9`;
- founder densities `100/200`;
- authoritative reproduction partner radius 3;
- each parent's local vegetation test remains radius 1 with threshold `0.50`;
- birth chance `0.001`;
- existing maturity / health / hunger / cooldown / stable-pair / keyed-random semantics;
- research-only keyed hard lifespan remains `12–18y`;
- 60-year horizon;
- no sequential world RNG consumption.

## Single variable

- **control:** every founder starts at age 2;
- **heterogeneous:** founder starting age is keyed deterministically over the pre-registered range `0–6y`.

No other founder-age range was tested.

## Results

### Final population at year 60

| Founder density | Seed | age2 control | heterogeneous 0–6y |
| ---: | ---: | ---: | ---: |
| 100 | 1 | 0 | 1 |
| 100 | 4 | 42 | 130 |
| 100 | 9 | 1 | 16 |
| 200 | 1 | 0 | 0 |
| 200 | 4 | 0 | 0 |
| 200 | 9 | 0 | 0 |

The heterogeneous cohort materially helps one favorable 100-founder landscape, but it does not produce robust cross-landscape persistence and does not rescue any 200-founder carrying-pressure world.

### Founder turnover and replacement

Synchronized founders disappear at roughly years `15.83–15.92`. Heterogeneous founders stretch complete turnover only to roughly years `17.06–17.76`.

At 100 founders, heterogeneous age structure increases post-founder reproduction:

| Seed | births after founders gone, age2 | births after founders gone, heterogeneous | replacement-parent births, heterogeneous |
| ---: | ---: | ---: | ---: |
| 1 | 1 | 15 | 19 |
| 4 | 70 | 210 | 223 |
| 9 | 13 | 41 | 51 |

That improvement is real but insufficient: seed1 still dwindles to one survivor and seed9 to sixteen by year 60.

At 200 founders, all three heterogeneous runs record **zero births after complete founder disappearance** and **zero replacement-parent births**. They all go extinct despite spreading founder ages across six years.

### Resource-pressure context

The heterogeneous 200-founder runs still enter the known carrying-pressure regime before cohort turnover:

- seed1 minimum vegetation utilization: `4.01%`;
- seed4: `1.75%`;
- seed9: `2.96%`.

Early resource pressure suppresses reproduction while starvation removes part of the cohort. A broader founder-age distribution delays the hard-lifespan wave by roughly 1–2 years, but it does not create enough replacement stock before the remaining cohort reaches its hard death boundary.

The 100-founder heterogeneous runs show the same landscape asymmetry: seed4 rebuilds strongly, seed9 persists weakly, seed1 nearly disappears. This is not the all-landscape recovery required by the pre-registered gate.

## Determinism

All 12 runs preserved the sequential world RNG fingerprint exactly. The diagnostic changed no authoritative runtime state or snapshot schema.

## Decision

**Reject founder synchronization as a sufficient explanation of Sprint 017 mortality failure.**

Founder heterogeneity can soften and delay the collapse, and on one favorable landscape it materially improves multi-generation recovery, but it cannot rescue carrying-pressure worlds and is not robust across landscapes.

Therefore:

1. stop founder-age range tuning;
2. keep the 12–18y hard lifespan rejected;
3. do not implement runtime senescence from this experiment;
4. keep reproduction/resource/encounter mechanics fixed;
5. move the next mortality gate to a genuinely different mortality shape: a gradual age-dependent hazard rather than a keyed hard death day.

A future hazard experiment must still prove multi-generation persistence at low density and carrying pressure across all landscapes while preserving resource-limited dynamics, causal starvation/old-age distinction, and sequential RNG isolation.
