# Fresh validation of encounter-safe compact grazer placement — 2026-08-24

Issue: #136
Sprint: 030

## Question

Does the exact frozen Sprint029 encounter-safe placement candidate preserve its paired benefit on fresh compact seeds?

This is validation only. The algorithm, founder counts/IDs/ages and all ecology were frozen before results.

## Frozen setup

16×16 creature-only worlds with founders `2/4`, keyed founder ages `[0,6y]`, reproduction `0.001`, gradual old-age mortality, partner radius3, local vegetation radius1 threshold0.50, unchanged movement/grazing/starvation/health/cooldown, and sequential RNG isolation.

Both arms use the same top32 passable cells ranked by initial vegetation desc then y/x.

- baseline: first N ranked cells;
- encounter-safe: exact Sprint029 earliest ranked radius3-connected pair, then connected greedy additions with ranked fallback.

Fresh matrix: seeds `61..120` × founders `2/4` × both arms = **240 worlds**, year0→300.

## Pre-registered validation rule

Candidate passes only if:

- founders2 intervention extinctions <= baseline;
- founders2 zero-birth extinctions do not increase;
- founders4 intervention extinctions <= baseline;
- combined rescued > harmed;
- no systematic starvation/resource-collapse tradeoff;
- all harms audited;
- sequential RNG unchanged.

Any failed criterion rejects the candidate; no tuning is allowed in this issue.

## Result — validation fails

### Two founders

| Outcome | Baseline | Encounter-safe |
| --- | ---: | ---: |
| Extinctions | **33** | **35** |
| Zero-birth extinctions | 16 | 14 |
| Initial zero-pair worlds | 23 | 0 |
| Rescued | — | 1 |
| Harmed | — | **3** |

The intervention still eliminates the structural zero-pair state, but actual long-horizon extinction **worsens** by two worlds. This directly fails the founders2 extinction criterion.

Median minimum vegetation is lower under intervention (~0.265 vs ~0.503), indicating stronger ecological engagement in aggregate, but median starvation remains zero. The harm excess is therefore not explained by systematic starvation.

### Four founders

| Outcome | Baseline | Encounter-safe |
| --- | ---: | ---: |
| Extinctions | **17** | **17** |
| Zero-birth extinctions | 2 | 4 |
| Rescued | — | 3 |
| Harmed | — | **3** |

Net extinction is unchanged, so this count satisfies only the weak non-increase condition. Combined across both counts, rescued=`4` and harmed=`6`, violating the required `rescued > harmed` criterion.

## Rescues

The fresh set still contains genuine causal rescues:

- seed83×2: baseline disconnected, 0 births, extinct ~y23.66; intervention connected, 5 births by y20 / 185 total, alive y300 pop18;
- seed83×4: baseline extinct ~y141.95; intervention alive y300 pop20;
- seed109×4: baseline extinct ~y39.38; intervention alive y300 pop18;
- seed120×4: baseline extinct ~y117.50; intervention alive y300 pop11.

So the Sprint029 mechanism is real: encounter-safe coordinates can rescue specific worlds.

## Harm audit

But the same deterministic coordinate rule creates more harms than rescues overall.

### Two founders

- **seed77×2**: baseline disconnected yet survives to y300 after 225 births; intervention connected, births earlier, but becomes extinct ~y66.57 after 41 births.
- **seed79×2**: baseline survives y300 pop37 after 346 births; intervention connects founders but first birth is later (~y4.54 vs ~y0.44), then extinction ~y148.13.
- **seed120×2**: baseline survives y300 pop37 after 294 births; intervention goes extinct ~y152.63 after 120 births.

All three have zero starvation in both arms. The failure is not a simple food/vegetation crash.

### Four founders

- **seed68×4**: baseline survives y300 pop20 after 218 births; intervention produces **zero births** and dies ~y26.23 despite minimum vegetation ~76%.
- **seed75×4**: baseline survives y300 pop28 after 324 births; intervention produces only **one birth** and dies ~y24.75 while vegetation remains abundant (~73% minimum).
- **seed107×4**: baseline survives y300 after 286 births; intervention also establishes strongly (33 births by y20) but later dies ~y287.6.

Seed68/75 are especially important: making the initial founder graph more connected does not guarantee reproductive establishment. Different coordinates alter local movement/condition/encounter trajectories even when initial resource is abundant.

## Structural interpretation

Sprint029 correctly identified one causal factor but over-generalized its intervention.

`initial radius3 connectivity` can matter, but selecting a globally connected founder set from the vegetation-rich pool changes more than the binary presence of an edge: it changes exact local geometry, vegetation neighborhoods, movement trajectories, encounter timing and keyed-event eligibility through time.

The fresh harms show that a deterministic graph-connectivity optimization is not monotonically beneficial. It can rescue one landscape and damage another without a simple starvation tradeoff.

This is exactly why fresh paired validation was required.

## Decision

**Reject the Sprint029 encounter-safe placement candidate.**

- do not promote to runtime/default fauna;
- do not tune radius3, top32 size, greedy order, founder counts, ages or ecology inside this issue;
- preserve all 4 rescues and 6 harms as evidence;
- keep default worlds creature-free.

The next compact-initialization decision should not assume that maximizing initial encounter connectivity is a universal objective. A new hypothesis, if pursued, must isolate a narrower causal property or reconsider whether compact worlds should receive automatic natural fauna at all.

## Cleanup

Temporary validation probe/test override are removed before merge. Runtime behavior remains unchanged.
