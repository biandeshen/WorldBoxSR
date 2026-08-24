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

Default worlds remain creature-free. Grazer reproduction exists only when explicitly enabled through a nonzero reproduction chance; its default is zero. Authoritative partner search is still Chebyshev radius 1 until the Sprint 015 handoff is implemented. Grazer senescent death is **not** implemented.

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

Sprint 011 found that overloaded grazer populations converge toward landscape-specific survivor plateaus, normalizing to roughly one long-run grazer per 14.8–15.0 vegetation-capacity units. This is empirical validation evidence only. Runtime reproduction never reads total vegetation capacity, a target population, or that ratio; abundance must remain a result of local condition/resource feedback.

### Senescence cannot be layered on before reproductive recovery is robust

Sprint 014 proved that a natural-death mechanism that looks viable at low density can destroy carrying-pressure populations when combined with the current radius-1 encounter rule. Do not add lifespan merely to complete a life-cycle checklist. Sprint 015 identifies radius 3 as the smallest tested encounter geometry that removes that measured low-density spatial trap while preserving resource suppression; make that encounter seam authoritative first, then re-run senescence evidence from scratch.

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

Grazer v0 ages, becomes hungry, consumes vegetation, moves locally toward vegetation, uses keyed randomness, can starve, and emits typed death history. Default worlds contain **zero creatures**.

## Completed carrying-pressure gate — Sprint 011 / #95

A multi-seed no-reproduction study found a clear landscape-dependent carrying-pressure regime.

- `5/20` grazers: 100% survival with vegetation near capacity;
- `100` grazers: 96%–100% survival after 5 years with substantial drawdown;
- `300` grazers: 39%–55% survival and vegetation near ~3%–5%.

At 10 years, overloaded worlds converge toward roughly:

- seed 1: **114–115**;
- seed 4: **164–165**;
- seed 9: **127–130**.

`150` is the transition band. Sequential world RNG remains unchanged. Evidence: `docs/experiments/2026-08-24-grazer-carrying-pressure.md`.

## Completed reproduction research gate — Sprint 012 / #97

A pre-registered local reproduction rule was tested before runtime state was added: adulthood, health >=0.95, hunger below the existing hungry threshold, each parent's radius-1 local vegetation >=0.50, one-year successful-birth cooldown, stable adjacent pairing, and keyed chance `0.001` per eligible pair/day.

Low-density populations grow while vegetation remains abundant; overloaded populations produce some early births, then resource pressure shuts births down and they return to the landscape-specific carrying envelope. A 20-year extension showed the birth gate remains self-suppressing. Evidence: `docs/experiments/2026-08-24-grazer-reproduction-probe.md`.

## Completed authoritative reproduction gate — Sprint 013 / #100

The Sprint 012 rule is authoritative behind `grazerBirthChancePerEligiblePairPerDay`, default **0**.

Each grazer persists only `lastBirthDay` for reproduction state. A successful birth creates one age-0 grazer, cools down both parents, increments `creatureBirths`, and emits typed `creature.born` history with the newborn subject and both parent creature causes/IDs.

Snapshot schema is **v11** with deterministic v10 migration. Enabled save/load continuation preserves cooldowns, events, counters, IDs, creature state, and future keyed outcomes exactly. Reproduction consumes no sequential RNG. There is no sex, mate bond, creature genealogy, gestation, litter, predator framework, species registry, or global population controller.

## Completed natural-turnover research gate — Sprint 014 / #103

Simple deterministic grazer senescence was tested as keyed research logic and **rejected for runtime**.

Low-density bracket with 20 age-2 founders:

- `8–12` year lifespans: all extinct;
- `12–18`: final **6 / 2 / 28**;
- `18–24`: low-density viable at **72 / 62 / 92** after founder turnover.

But `18–24` collapses carrying-pressure worlds:

- 100 founders: **0 / 7 / 1** instead of no-senescence **114 / 155 / 130**;
- 200 founders: **0 / 0 / 0** instead of **112 / 161 / 132**.

Widening to `18–30` / `18–36` only delays the same problem. Diagnosis identifies a two-stage trap:

`resource depletion suppresses births → senescence reduces population → vegetation recovers → sparse spatial distribution suppresses encounters`

During depletion there can be **46–67** physically eligible adjacent pairs but zero resource-eligible pairs; resource eligibility returns around years **24–28**, after population has fallen. Later, survivors are resource-ready but usually expose only 0–3 adjacent pairs. Evidence: `docs/experiments/2026-08-24-grazer-natural-turnover.md`.

No lifespan field/config/event, snapshot change, or old-age runtime behavior is accepted from Sprint 014.

## Completed encounter-recovery research gate — Sprint 015 / #105

Sprint 015 isolates the diagnosed spatial bottleneck by keeping birth chance `0.001`, the radius-1 local vegetation threshold `0.50`, condition gates, cooldown, stable pairing, and keyed randomness fixed while comparing only partner-search Chebyshev radius `1/2/3`.

### 45-year turnover stress

Using the rejected `18–36` lifespan only as a temporary diagnostic stressor:

- radius 1 reproduces the post-pressure collapse;
- radius 2 improves recovery but fails seed1 / 100 founders, ending at only **10** despite ~99% vegetation;
- radius 3 is the smallest tested radius where all six `100/200 × seeds 1/4/9` worlds survive founder turnover and recover.

Radius-3 year45 populations:

- 100 founders: **39 / 99 / 76**;
- 200 founders: **42 / 61 / 70**.

The local vegetation gate still shuts births during depletion; wider encounter range does not bypass resource causality.

### 90-year multi-generation check

Radius 3 remains bounded and viable through multiple turnover generations in all 9 `20/100/200 × seeds 1/4/9` worlds:

- 20 founders finish **48 / 53 / 55**;
- 100 founders finish **46 / 119 / 59**;
- 200 founders finish **63 / 59 / 100**.

Replacement-generation parents account for most later births. Worlds display repeated population/vegetation cycles rather than monotonic growth. Sequential `world.rng` remains unchanged.

### Compatibility with current no-senescence runtime

Without senescence, radius 3 changes the approach speed but preserves the overloaded carrying envelope:

- 100 founders, radius1 `114/155/130` vs radius3 `115/165/134`;
- 200 founders, radius1 `112/161/132` vs radius3 `113/168/130`.

Final overloaded vegetation remains around ~3%–6%. From 20 founders, radius 3 reaches carrying pressure faster, but the unchanged local resource gate still bounds growth.

Evidence: `docs/experiments/2026-08-24-grazer-encounter-recovery.md`.

### Decision

Radius 3 passes as the **smallest reliable partner encounter geometry**. Radius 2 is rejected. This research does not itself alter runtime behavior.

## Next decision gate

Promote only the proven grazer partner-search seam from Chebyshev radius **1 → 3** in a separate authoritative implementation.

Keep unchanged:

- local vegetation measurement radius 1;
- birth chance and default-zero behavior;
- maturity, health, hunger, and cooldown gates;
- stable pairing and keyed randomness;
- separate human/creature identity domains;
- default worlds with zero creatures.

Do not add a public interaction-radius framework/config, mate bonds, sex, genealogy, migration, population targets, predators, or species infrastructure from this one result.

After radius 3 is authoritative and fully regression-tested, revisit natural senescence as a new evidence gate. Re-test lifespan assumptions; do not promote the diagnostic `18–36` band by default.

Territory visualization, civilization labels, meteor/plague, predators, and art expansion remain lower priority unless they become the actual bottleneck.

## Project-management rule

Do not jump to kingdoms/war or attach behavior to convenient labels. Research observations are not automatically authoritative entities. Add the smallest causal mechanism supported by experiments, preserve coherent negative/rare outcomes, and make the world's actual history explainable.
