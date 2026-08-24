# Grazer carrying-pressure study — 2026-08-24

Issue: #95
Sprint: 011

## Question

Does the no-reproduction grazer system expose a legible resource-limited regime, or is the current energy/resource scale too weak or too unstable to justify any reproduction experiment?

No reproduction code, default animals, predator logic, human behavior changes, or sequential-world-RNG consumption were allowed in this study.

## Method

Creature-only 24×24 worlds used the default grazer parameters and no humans.

Initial grazers were distributed deterministically round-robin across the 32 vegetation-richest passable cells so the result did not depend on a single spawn pile.

### Stage 1 — broad 5-year bracket

- landscape seeds: `1/4/9`
- initial grazers: `5/20/100/300`
- horizon: 5 years
- vegetation sampling: every 30 days
- checkpoints: years `1/2/3/5`

### Stage 2 — 10-year transition refinement

After Stage 1 showed a clear transition between 100 and 300 grazers:

- landscape seeds: `1/4/9`
- initial grazers: `100/150/200/250/300`
- horizon: 10 years
- vegetation sampling: every 30 days
- checkpoints: years `1/2/3/5/10`

Every run asserted that sequential `world.rng` state was unchanged after deterministic initialization.

## Stage 1 result

The broad bracket is monotonic and interpretable.

- `5` and `20` grazers: 100% survival on all three seeds; final vegetation utilization remained ~96.5%–99.7%.
- `100` grazers: 96%–100% survival after 5 years; final vegetation utilization fell to ~40.5%–67.4%.
- `300` grazers: only 39%–55% survived after 5 years; final vegetation utilization fell to ~3.0%–5.0%, with observed minima ~1.8%–3.8%.

The system therefore already contains real carrying pressure. Grazer energy/resource scale does not need to be strengthened before testing reproduction.

## Stage 2 result

### Year-10 final state

| Initial grazers | Seed 1 | Seed 4 | Seed 9 | Mean survival share | Final vegetation utilization |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 96 | 100 | 100 | 98.7% | 22.8% / 62.7% / 32.4% |
| 150 | 113 | 150 | 132 | 87.8% | 6.0% / 11.7% / 4.1% |
| 200 | 114 | 164 | 130 | 68.0% | 5.5% / 3.6% / 4.5% |
| 250 | 114 | 165 | 130 | 54.5% | 5.9% / 3.8% / 4.6% |
| 300 | 115 | 165 | 127 | 45.2% | 5.3% / 3.6% / 4.8% |

### Landscape-dependent survivor plateaus

For initial densities `>= 200`, each landscape converges toward nearly the same surviving population despite very different starting populations:

- seed 1: ~114–115 grazers;
- seed 4: ~164–165 grazers;
- seed 9: ~127–130 grazers.

This is the strongest evidence from the study. High-density worlds are not merely losing an arbitrary fraction of animals; they converge toward a resource-dependent survivor scale.

### Capacity-normalized carrying scale

The three apparently different survivor plateaus nearly collapse to one ratio when normalized by each world's total vegetation capacity.

| Landscape | Vegetation capacity | Median `>=200` plateau | Capacity units per surviving grazer |
| --- | ---: | ---: | ---: |
| seed 1 | 1711.37 | 114 | **15.01** |
| seed 4 | 2435.41 | 165 | **14.76** |
| seed 9 | 1931.36 | 130 | **14.86** |

So the current v0 energy/resource scale supports approximately **one long-run grazer per 14.8–15.0 units of vegetation capacity** after an overloaded population has self-thinned.

This ratio is an empirical description, **not a population cap to encode**. Its value is as an external validation target: a future reproduction rule should recover resource-dependent carrying pressure through local condition/resource feedback rather than consulting a global target.

### Transition band

`100` grazers is mostly resource-abundant enough to preserve the starting population for 10 years, although vegetation can continue declining on the poorer landscape.

`150` grazers is a genuine transition density:

- seed 4 still supports all 150 at year 10, but vegetation falls to 11.7% of capacity;
- seeds 1 and 9 begin shedding population and finish at 113 and 132.

At `200+`, starvation consistently reduces population toward the landscape-specific plateau and vegetation remains near ~2%–6% of capacity once the overloaded state settles.

## Decision

**The reproduction gate passes for a narrow off-by-default experiment.**

The current grazer system exposes a legible, landscape-dependent resource-limited regime. No energy/resource retuning is justified before a reproduction spike.

This does **not** justify default animals, predators, species infrastructure, population targets, or a broad ecology framework.

## Constraints for the next experiment

A reproduction spike should be accepted for experimentation only if it is:

- off by default;
- based on actual individual condition and local vegetation rather than a global target population;
- suppressed by hunger/starvation/resource collapse;
- deterministic through keyed randomness and stable ordering;
- isolated from sequential human RNG and human IDs;
- bounded across multiple landscape seeds and starting densities;
- able to recover a low-density population without pinning vegetation permanently near zero.

The initial evaluation should compare low/medium starting densities with reproduction disabled/enabled and reject mechanisms that create runaway oscillation or erase landscape-dependent carrying pressure.

The ~15 capacity-units-per-grazer result is a **measurement guard**, not an input to the reproduction algorithm.

## Cleanup

The temporary Stage 1/2 probe and CI artifact upload are research scaffolding only and are removed before merge. Permanent runtime behavior is unchanged by this study.
