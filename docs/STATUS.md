# Project status

Last updated: 2026-08-24

## Current state

`main` contains a deterministic living-world simulation with:

- seeded, serializable RNG and fixed-tick world state;
- procedural elevation/moisture, land/ocean, renewable food, and renewable vegetation biomass;
- human hunger, movement, eating, aging, reproduction, death, ancestry, and lineage history;
- a typed creature domain with explicit-spawn grazer ecology and default-off authoritative grazer reproduction;
- emergent settlement formation, weak home cohesion, abandonment, territory, and causal history;
- behavior-neutral settlement resource accounting;
- persistent historical co-parent (`parental_union`) edges;
- derived social, scarcity, demographic, and ecology research instruments;
- isolated/checkpointable Simulation Lab, deterministic save/load, long-run regressions, and 10k-agent benchmark coverage;
- a lightweight Canvas client that consumes authoritative simulation state;
- deterministic history queries plus a causal timeline/event inspector for world, human, creature, and settlement history;
- deterministic Spawn human, Spawn grazer, Erase humans, and Lightning god interventions exposed through a minimal client tool selector.

Default worlds remain creature-free. Grazer reproduction exists only when explicitly enabled through a nonzero reproduction chance; its default is zero.

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

### Measured carrying capacity is not a population controller

Sprint 011 found that overloaded grazer populations converge toward landscape-specific survivor plateaus, and those plateaus normalize to roughly one long-run grazer per 14.8–15.0 vegetation-capacity units. This is empirical validation evidence only. Runtime reproduction never reads total vegetation capacity, a target population, or that ratio; it is driven by individual condition and local vegetation.

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

The project gained its first endogenous non-human loop: **explicit-spawn grazers consume renewable vegetation and can starve when the resource is unavailable**.

Creature identity is independent from human identity (`world.creatures`, `nextCreatureId`, typed event references, typed history queries), preventing animals from shifting future human keyed-random behavior.

Grazer v0 ages, becomes hungry, consumes vegetation, moves locally toward vegetation, uses keyed randomness, can starve, and emits typed death history. Sprint 010 intentionally had no reproduction, attack, human-food, settlement, or territory behavior.

Default worlds contain **zero creatures**.

## Completed carrying-pressure gate — Sprint 011 / #95

The no-reproduction grazer system has a measured long-horizon carrying-pressure envelope.

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

## Completed reproduction research gate — Sprint 012 / #97

A pre-registered local reproduction rule was tested as temporary research logic before runtime state was added.

Eligible pairs required adulthood, adjacent location, health >= 0.95, hunger at or below the existing hungry threshold, radius-1 local vegetation utilization >= 0.50, and a one-year successful-birth cooldown. Each stable eligible pair used keyed-random birth chance `0.001` per day.

### 10-year evidence

- 20 founders grew to **30 / 31 / 35** across seeds 1/4/9 with zero deaths and ~94%–97% final vegetation utilization.
- 200 founders produced some early births, then local resource/condition pressure suppressed further births and final populations converged to **115 / 161 / 133**, essentially the no-reproduction plateaus.

### 20-year extension

The unchanged rule was extended for 20/100-founder cases:

- 20 founders reached **65 / 64 / 78** with zero deaths while vegetation remained **80%–91%** utilized;
- 100 founders settled at **115 / 155 / 134**; cumulative births froze at **23 / 55 / 35** and vegetation stabilized around ~4%–5% in the resource-limited state.

The same rule therefore expands low-density populations, self-suppresses under pressure, stays bounded, preserves landscape-dependent carrying capacity, and consumes no sequential RNG. Evidence is recorded in `docs/experiments/2026-08-24-grazer-reproduction-probe.md`.

## Completed authoritative reproduction gate — Sprint 013 / #100

The Sprint 012 rule is now authoritative runtime behavior behind `grazerBirthChancePerEligiblePairPerDay`, whose default is **0**.

### Minimal state and causal history

Each grazer stores only `lastBirthDay` for the successful-birth cooldown. A successful birth:

- creates one age-0 grazer on a parent tile;
- writes the same `lastBirthDay` to both parents;
- increments `creatureBirths`;
- emits `creature.born` with the newborn as typed subject and both parents as typed creature causes plus `parentCreatureIds`.

There is no sex state, mate bond, creature genealogy, gestation, litter model, predator framework, species registry, or global population controller.

### Determinism and persistence

Reproduction runs after the day’s grazer/human actions and day increment, matching the research probe ordering so newborns first act on the next tick.

Snapshot schema is **v11**. v10 migration deterministically supplies `lastBirthDay: null`, `creatureBirths: 0`, and the default-zero reproduction chance. Enabled save/load continuation preserves cooldowns, events, counters, IDs, creature state, and future keyed outcomes exactly.

Tests cover every eligibility rejection, forced success, parent cooldown, typed parent/child history lookup, default-off inertness, v10 migration, enabled save/load, sequential RNG isolation, and the multi-seed 10-year low-density/overload envelope. Full normal CI and smoke pass.

## Next decision gate

Do **not** enable default animals yet and do not jump to predators/species infrastructure.

The grazer life cycle has one remaining structural gap: `ageDays` advances, but a well-fed low-pressure grazer currently has no natural senescent death. With reproduction enabled, starvation can regulate population near carrying pressure, but low-density individuals can otherwise live indefinitely.

The next ecology gate should measure and add the smallest coherent natural-turnover mechanism, then re-run the reproduction/carrying envelope. It must preserve keyed/sequential RNG isolation, typed death history, deterministic save/load, and the principle that local resource feedback—not a population target—controls abundance.

Territory visualization, civilization labels, meteor/plague, predators, and art expansion remain lower priority unless they become the actual bottleneck.

## Project-management rule

Do not jump to kingdoms/war or attach behavior to convenient labels. Research observations are not automatically authoritative entities. Add the smallest causal mechanism supported by experiments, preserve coherent negative/rare outcomes, and make the world's actual history explainable.
