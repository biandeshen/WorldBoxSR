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

Default worlds remain creature-free. Grazer reproduction exists only when explicitly enabled through a nonzero reproduction chance; its default is zero. Grazer senescent death is **not** implemented: Sprint 014 rejected simple deterministic lifespan bands because they interact badly with post-pressure reproductive recovery.

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

### Senescence cannot be layered on before reproductive recovery is understood

Sprint 014 shows that a natural-death mechanism that looks healthy at low density can still destroy the carrying-pressure ecology when added to the existing local-resource/adjacency reproduction rule. Do not add grazer lifespan merely to make the life-cycle checklist look complete. Resolve the measured post-pressure reproduction bottleneck first.

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

## Completed natural-turnover research gate — Sprint 014 / #103

Simple deterministic grazer senescence was tested as temporary keyed research logic and **rejected for runtime**.

### Low-density bracket

With 20 age-2 founders and reproduction at `0.001`:

- `8–12` year lifespans went extinct on all seeds;
- `12–18` finished at only **6 / 2 / 28**;
- `18–24` was low-density viable, finishing at **72 / 62 / 92** after complete founder turnover with vegetation still 64%–90%.

### Carrying-pressure failure

The low-density-plausible `18–24` band failed when layered onto the measured carrying regime:

- 100 founders finished at **0 / 7 / 1** instead of no-senescence **114 / 155 / 130**;
- 200 founders went **0 / 0 / 0** instead of **112 / 161 / 132**;
- vegetation rebounded to ~99%–100%.

Widening the same lifespan assumption to `18–30` and `18–36` over 45 years did not restore the ecology. Even `18–36` ended with only **7 / 33 / 3** from 100 founders and **16 / 19 / 9** from 200 founders, with vegetation ~97%–100%.

### Diagnosed failure mode

The mechanism creates a two-stage recovery trap:

`resource depletion suppresses births → senescence reduces population → vegetation recovers → sparse spatial distribution suppresses encounters`

During the depleted period, yearly checkpoints can still contain **46–67** physically eligible adjacent candidate pairs while the local vegetation >= 0.50 gate leaves **zero** resource-eligible pairs. Resource-eligible pairs generally reappear only around years **24–28**, after population has already fallen sharply.

Once vegetation is abundant, most survivors become resource-ready, but spatial encounter becomes the limiting factor. After year34, the diagnostic runs expose only **0–7** resource-eligible adjacent pairs, usually 0–3, because surviving grazers occupy nearly one cell each. Some worlds have all remaining animals resource-ready but zero adjacent pairs.

This is a measured low-density reproductive Allee effect. It does **not** justify a population target and does not mean the local vegetation gate should be weakened reflexively.

Evidence: `docs/experiments/2026-08-24-grazer-natural-turnover.md`.

### Decision

Do not add a grazer lifespan field/config, senescent death event, snapshot change, or default animal population yet. Lifespan parameter search stops; the negative result is preserved.

## Next decision gate

Research the smallest **reproductive encounter/recovery** mechanism before revisiting natural senescence.

Keep the proven `0.001` birth chance and local vegetation >= 0.50 gate unchanged in the first comparison. Change only encounter geometry/search—for example radius-1 versus radius-2/3 partner discovery, or a narrowly reproduction-directed local encounter move—and test whether it removes the low-density spatial Allee trap while preserving high-pressure resource suppression.

The next gate must still preserve keyed/sequential RNG isolation, deterministic save/load principles, default-zero reproduction, independent human/creature identity, and the rule that abundance emerges from local resource feedback rather than a target population.

Do not infer sex, mate bonds, creature genealogy, migration infrastructure, predators, or a species framework from an encounter experiment. If broader encounter geometry destabilizes carrying pressure, record the negative result instead of compensating with unrelated parameter tuning.

Territory visualization, civilization labels, meteor/plague, predators, and art expansion remain lower priority unless they become the actual bottleneck.

## Project-management rule

Do not jump to kingdoms/war or attach behavior to convenient labels. Research observations are not automatically authoritative entities. Add the smallest causal mechanism supported by experiments, preserve coherent negative/rare outcomes, and make the world's actual history explainable.
