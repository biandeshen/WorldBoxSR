# Natural grazer initialization validation — 2026-08-24

Issue: #118  
Sprint: 021

## Question

With grazing, condition/resource-gated reproduction, radius-3 partner discovery, and gradual old-age mortality now authoritative, can a small deterministic founder population sustain natural grazer fauna across substantially more landscapes without a population target or any ecology retuning?

This sprint is research-only. Ordinary generated worlds remain creature-free.

## Fixed authoritative ecology

All runs use the shipped mechanics unchanged:

- `grazerBirthChancePerEligiblePairPerDay: 0.001`;
- `grazerOldAgeMortalityEnabled: true`;
- reproduction partner search radius 3;
- each parent's local vegetation gate remains radius 1 with threshold `0.50`;
- normal hunger, grazing, starvation, movement, cooldown, and gradual old-age semantics;
- keyed randomness only for optional ecology mechanics;
- no global population controller.

## Pre-registered founder initializer

For each world:

1. sort passable tiles by initial vegetation descending, then `y`, then `x`;
2. retain the 32 vegetation-richest passable cells;
3. place founders round-robin across those cells;
4. assign each founder a deterministic keyed starting age in `[0, 6 years]` from world seed + future creature ID + a dedicated initialization salt;
5. otherwise create normal grazers with no special health, hunger, or resource privileges.

The initializer consumes no sequential world RNG.

## Stage 1 — select the smallest tested founder count

Matrix: 24×24 creature-only worlds, seeds `1..12`, founder counts `10 / 20 / 40`, 60 years.

A candidate had to pass **every** landscape: no extinction, year-60 population >=10, >=5 births in years41–60, replacement-parent reproduction, maximum living population <300, and unchanged sequential RNG.

All three counts passed all 12 worlds. Per the pre-registered rule, the selected candidate is therefore the **smallest tested count: 10 founders**.

The weakest Stage-1 candidate world was seed7/10: it reached a post-year20 minimum of 9, ended year60 at exactly 10, and still produced 10 births in years41–60 with 92 replacement-parent births. That near-threshold result was retained rather than using it as a reason to promote 20 founders instead.

## Stage 2 — 30 landscapes × 120 years

The exact 10-founder initializer then ran unchanged on seeds `1..30` for 120 years.

**All 30 worlds pass the numeric and ecological gate.**

### Population distribution

| Metric across 30 seeds | Minimum | Median | Mean | Maximum |
| --- | ---: | ---: | ---: | ---: |
| Year-120 population | **15** | **68** | **71.2** | **166** |
| Minimum population after year20 | **9** | **22.5** | **21.8** | **40** |
| Maximum population observed | **50** | **98** | **98.7** | **167** |
| Births in years101–120 | **7** | **57** | **60.8** | **159** |
| Total births by year120 | **164** | **301** | **309.5** | **570** |

No world goes extinct. No world exceeds 167 living grazers, far below the pre-registered ceiling of 300. Every world records replacement-parent reproduction and preserves the sequential RNG fingerprint exactly.

### Weak landscapes remain multi-generational

The gate intentionally evaluates worst cases rather than averages.

- **seed2** is the lowest final population: 15 at year120, with 9 births in years101–120. Its 20-year checkpoints alternate `55 → 27 → 51 → 18 → 51 → 15`, while vegetation utilization alternates approximately `0.21 → 0.68 → 0.10 → 0.88 → 0.19 → 0.89`. This is a deep resource-demography cycle, not a terminal non-reproducing tail.
- **seed7** reaches the global post-year20 minimum of 9. It ends `58 → 63 → 10 → 32 → 68 → 33` at 20-year checkpoints and produces 32 births in the final 20 years, demonstrating recovery after the weak year60 state.
- **seed26** also reaches 9 but ends at 35 with 18 final-window births.
- **seed29** has the lowest final-window birth count, 7, yet ends at 30 after repeated oscillation (`82 → 35 → 82 → 42 → 87 → 30`) and has 269 replacement-parent births over the full run.

None of these weak seeds requires special rescue or parameter adjustment.

## Resource dynamics

Vegetation does not remain pinned near zero. The minimum sampled utilization across the 30 worlds ranges from roughly **6.29% to 25.58%** (median **11.62%**), while checkpoint trajectories repeatedly move between low-pressure and recovered states.

Representative cycles:

- seed2: `20.5% → 67.8% → 10.2% → 88.0% → 19.3% → 88.7%`;
- seed7: `76.2% → 13.1% → 98.5% → 92.0% → 17.7% → 89.5%`;
- seed4: `92.8% → 12.1% → 94.9% → 42.4% → 54.2% → 26.8%`.

The founder population is therefore not maintained by a hidden target. Abundance emerges from repeated vegetation pressure, reproduction suppression/recovery, and age turnover.

## Mortality context

Only **3 starvation deaths total** occur across all 30 × 120-year worlds (2 in seed16, 1 in seed19). The small founder population does not begin in an overloaded starvation regime.

Old-age mortality dominates long-run turnover, while reproduction-generated population growth later creates the observed vegetation cycles. This differs from the deliberately overloaded 100/200-founder stress studies and is appropriate for a prospective natural initializer.

## Determinism

All Stage-1 and Stage-2 runs preserve the sequential world RNG fingerprint exactly. Founder ages use keyed initialization randomness, and all later reproduction/mortality randomness remains keyed.

## Decision

**The deterministic 10-founder initializer passes the 24×24 natural-fauna research gate.**

Evidence now supports the following narrow claim: on 24×24 worlds, this exact initializer plus the existing authoritative grazer mechanics sustains bounded multi-generation fauna for 120 years across seeds `1..30` without a population controller, special founder privileges, ecology retuning, or sequential RNG coupling.

This does **not** justify silently switching ordinary worlds to fauna-on. Two product/compatibility questions remain separate:

1. how founder count should scale outside the validated 24×24 size;
2. whether natural fauna should remain opt-in, become a preset, or eventually become a new-world default while old/default behavior remains compatible.

Do not infer that a fixed count of 10 is correct for arbitrary map sizes. Do not add predators or a second species from this result.

## Cleanup

The temporary Stage-1/Stage-2 probe and temporary `npm test` override are removed before merge. Sprint 021 leaves evidence and project decisions only; it adds no runtime initializer.
