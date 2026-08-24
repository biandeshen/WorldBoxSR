# Project status

Last updated: 2026-08-24

## Current state

`main` contains a deterministic living-world simulation with:

- seeded, serializable RNG and fixed-tick world state;
- procedural elevation/moisture, land/ocean, renewable food, and renewable vegetation biomass;
- human hunger, movement, eating, aging, reproduction, death, ancestry, and lineage history;
- a typed creature domain with explicit-spawn grazer ecology;
- emergent settlement formation, weak home cohesion, abandonment, territory, and causal history;
- behavior-neutral settlement resource accounting;
- persistent historical co-parent (`parental_union`) edges;
- derived social, scarcity, demographic, and ecology research instruments;
- isolated/checkpointable Simulation Lab, deterministic save/load, long-run regressions, and 10k-agent benchmark coverage;
- a lightweight Canvas client that consumes authoritative simulation state;
- deterministic history queries plus a causal timeline/event inspector for world, human, creature, and settlement history;
- deterministic Spawn human, Spawn grazer, Erase humans, and Lightning god interventions exposed through a minimal client tool selector.

Default worlds remain creature-free. Sprint 011 changes research evidence only; it does not change runtime simulation behavior.

## Architecture decisions that remain binding

### Lineage is not household

The original `household` prototype was renamed to **lineage** after 200-year worlds produced surviving records with tens to hundreds of living descendants. Lineage is persistent ancestry identity only; it has no co-residence, storage, inheritance, or movement behavior.

### Co-parent edge is not spouse

`parental_union` is historical shared-birth evidence. The 13-seed 200-year baseline showed high one-off co-parent turnover and low repeated shared parenting. It is not spouse/current-partner state and has no exclusivity or behavior.

### Repeated contact is not a general social bond or residential group

Dyadic and local co-presence studies show real recurrence but high identity turnover. The best current abstraction is a **fluid local social field**, not an authoritative `social_bond`, household, or residential-group roster.

### Broad local-meal storage is not a valid scarcity buffer

Settlement shared-food-storage v0 was implemented off by default, tested, and rejected before merge. It rescued a resource-rich settlement through effects outside the intended scarcity scope. Runtime storage was removed; the negative experiment is preserved as evidence.

### Natural settlement extinction is valid world history

Across the 100×200 baseline only three worlds contain a naturally abandoned settlement. Detailed flow reconciliation showed heterogeneous causes, including replacement-pipeline failure and outflow. Do not add generic fertility, migration, member-locking, storage, or persistence rescue rules merely to normalize survival.

## Empirical checkpoints

### Post-social 100×200 baseline

All 100 seeds completed successfully. Year-200 population median/mean are **489 / 496.68** versus **483 / 495.7** before social cohesion. The minimum rose from **8 to 128** while the center stayed almost unchanged. Median settled-population share is ~86% and median territory coverage ~83%.

Only **3/100 worlds** contain any naturally abandoned settlement by year200: seeds 49, 62, and 98, one each.

### Settlement scarcity and demography

Six-seed settlement scarcity research showed real resource pressure is common but is not a survival classifier. The known Pineford abandonment occurs with zero measured scarcity episodes while territorial food coverage rises.

Exact sampled population-flow accounting reconciles:

`population delta = surviving newborn additions + external spawns + entries + switches in - deaths - exits - switches out`

The known natural abandonments are causally heterogeneous. Persistent loss of the female replacement pipeline is a strong viability warning/terminal state in several cases, but is not a universal upstream cause.

## Completed product/history gate — Sprint 006 / #85

World history is directly inspectable through deterministic queries and a lightweight causal timeline/event inspector. Filters use only facts explicitly recorded in authoritative events; missing or evicted references remain visible rather than being fabricated.

## Completed god-intervention gate — Sprint 007 / #87

Exact-tile `erase` uses the shared authoritative human death lifecycle:

`player command → god.erase event → shared human death lifecycle → social bookkeeping → inspectable history`

Erase consumes no RNG and does not imply a generic powers framework.

## Completed world-resource gate — Sprint 008 / #89

Vegetation biomass is a second renewable authoritative resource. Capacity derives from moisture, regeneration is independent of food, ocean stays zero, persistence is deterministic, and divergent vegetation config remains behavior-neutral to humans/settlements when no ecology consumes it.

## Completed environment-disturbance gate — Sprint 009 / #91

Lightning provides the first player-driven vegetation causal loop:

`player lightning → exact-tile vegetation reset + shared human death lifecycle → inspectable history → deterministic vegetation recovery`

No wildfire, burning-state, AOE, damage framework, or generic power registry was introduced.

## Completed ecology gate — Sprint 010 / #93

The project has its first endogenous non-human loop: **explicit-spawn grazers consume renewable vegetation and can starve when the resource is unavailable**.

Creature identity is independent from human identity (`world.creatures`, `nextCreatureId`, typed event references, typed history queries), preventing animals from shifting future human keyed-random behavior.

Grazer v0 ages, becomes hungry, consumes vegetation, moves locally toward vegetation, uses keyed randomness, can starve, and emits typed death history. It does not reproduce, attack humans, consume human food, join settlements, or own territory.

Default worlds contain **zero creatures**.

## Completed carrying-pressure gate — Sprint 011 / #95

The no-reproduction grazer system now has a measured long-horizon carrying-pressure envelope.

A broad 5-year bracket on landscape seeds `1/4/9` showed:

- `5/20` grazers: 100% survival with vegetation near capacity;
- `100` grazers: 96%–100% survival with substantial vegetation drawdown;
- `300` grazers: only 39%–55% survival and vegetation near ~3%–5% of capacity.

A 10-year refinement at `100/150/200/250/300` found a landscape-dependent survivor plateau. For starting densities `>=200`, year-10 survivors converge to roughly:

- seed 1: **114–115**;
- seed 4: **164–165**;
- seed 9: **127–130**.

Normalizing those overloaded survivor plateaus by total vegetation capacity collapses the three landscapes to almost the same empirical scale: roughly **1 long-run grazer per 14.8–15.0 vegetation-capacity units**. This is a validation measurement, not a global population target to encode.

`150` is the transition band; `100` is mostly survivable but can still apply long-running pressure on poorer terrain. Sequential world RNG remained unchanged after deterministic initialization.

The evidence is recorded in `docs/experiments/2026-08-24-grazer-carrying-pressure.md`.

### Decision

The gate passes only for a **narrow off-by-default reproduction experiment**. The current grazer energy/resource scale is already strong enough; do not retune it first.

This does not justify default animals, predators, species infrastructure, a global population controller, or a broad ecology framework.

## Next decision gate

Test the smallest plausible grazer reproduction mechanism off by default.

The experiment must:

- depend on individual condition and local vegetation rather than a global target population;
- suppress births under hunger/starvation/resource collapse;
- use keyed randomness and stable ordering so sequential human RNG remains untouched;
- preserve the separate human/creature identity domains;
- recover low-density populations without runaway growth or permanent vegetation collapse;
- stay bounded across multiple landscape seeds and starting densities;
- reproduce the carrying-pressure envelope from local feedback rather than reading the measured ~15-capacity-units-per-grazer ratio as a control target.

If a simple mechanism cannot satisfy those constraints, record the negative result rather than parameter-searching it into success.

Territory visualization, civilization labels, predators, meteor/plague, and art expansion remain lower priority unless they become the actual bottleneck.

## Project-management rule

Do not jump to kingdoms/war or attach behavior to convenient labels. Research observations are not automatically authoritative entities. Add the smallest causal mechanism supported by experiments, preserve coherent negative/rare outcomes, and make the world's actual history explainable.
