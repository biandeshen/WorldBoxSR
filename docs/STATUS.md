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

Default worlds remain creature-free. Grazer reproduction exists only when explicitly enabled through a nonzero reproduction chance; its default is zero. Authoritative partner search is Chebyshev radius **3**, while each parent's local vegetation condition remains radius **1**.

Grazer senescent death is **not yet implemented**. Sprints 017–018 reject hard keyed lifespan bands and founder-age tuning. Sprint 019 identifies one pre-registered gradual age-dependent hazard that passes 120-year research across low-density and carrying-pressure worlds, but that hazard remains research evidence until a separate authoritative implementation gate passes.

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

### Encounter distance and resource locality are distinct mechanics

Sprint 015/016 intentionally separates partner encounter opportunity from resource eligibility. A grazer may discover an eligible reproduction partner within Chebyshev radius 3, but each parent's vegetation condition still measures only its own radius-1 neighborhood. Do not broaden the vegetation test merely because partner discovery is wider, and do not generalize this one radius into a public interaction framework without a second use.

### Hard lifespan bands and founder-age tuning are rejected

Sprint 017 re-ran senescence evidence after partner radius 3 became authoritative. The pre-registered hard 12–18y lifespan passes a low-density gate but fails carrying pressure: seed1/100 goes extinct, seed9/100 ends at one animal, and all three 200-founder worlds go extinct. A diagnostic 18–24y band also fails all 200-founder landscapes.

Sprint 018 changed only founder starting-age structure. Spreading founders deterministically over 0–6 years delays complete founder turnover by roughly 1–2 years and helps some 100-founder worlds, but all three 200-founder worlds still go extinct. Founder synchronization is not a sufficient explanation.

Do not search more hard lifespan endpoints or founder-age ranges.

### Gradual mortality is a research candidate, not shipped behavior

Sprint 019 changes only mortality shape. The pre-registered research hazard is:

`pAnnual(age) = 0 before age 12; otherwise min(0.50, 0.01 * 2 ^ ((ageYears - 12) / 3))`

with exact annual-to-daily conversion and keyed daily randomness. It has no hard maximum age.

Across seeds `1/4/9` × age-2 founders `20/100/200`, the same unchanged curve remains multi-generational through 120 years. Every world retains replacement-parent births and births in the final 20 years; no world goes extinct or ends as a non-reproducing terminal tail. Old-age death ages span broadly from ~12 years into the mid-30s, with medians around 23.5–24.2 years.

This is evidence that a **distributed hazard shape** can bridge resource-recovery periods that defeated hard lifespan cliffs. It is not yet runtime behavior and must not be described as such until the implementation gate passes.

## Empirical checkpoints

### Post-social 100×200 baseline

All 100 seeds completed successfully. Year-200 population median/mean are **489 / 496.68** versus **483 / 495.7** before social cohesion. The minimum rose from **8 to 128** while the center stayed almost unchanged. Median settled-population share is ~86% and median territory coverage ~83%.

Only **3/100 worlds** contain any naturally abandoned settlement by year200: seeds 49, 62, and 98, one each.

### Settlement scarcity and demography

Six-seed settlement scarcity research showed real resource pressure is common but is not a survival classifier. Pineford abandonment occurs with zero measured scarcity episodes while territorial food coverage rises.

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

At 10 years, overloaded worlds converge toward roughly seed1 **114–115**, seed4 **164–165**, seed9 **127–130**. The normalized empirical scale is ~1 long-run grazer per 14.8–15.0 vegetation-capacity units, used only as an external validation measurement.

Evidence: `docs/experiments/2026-08-24-grazer-carrying-pressure.md`.

## Completed reproduction research gate — Sprint 012 / #97

A pre-registered local reproduction rule was tested before runtime state was added: adulthood, health >=0.95, hunger below the existing hungry threshold, each parent's radius-1 local vegetation >=0.50, one-year successful-birth cooldown, stable pairing, and keyed chance `0.001` per eligible pair/day.

Low-density populations grow while vegetation remains abundant; overloaded populations produce some early births, then resource pressure shuts births down and they return to the landscape-specific carrying envelope. A 20-year extension showed the birth gate remains self-suppressing.

Evidence: `docs/experiments/2026-08-24-grazer-reproduction-probe.md`.

## Completed authoritative reproduction gate — Sprint 013 / #100

The Sprint 012 rule is authoritative behind `grazerBirthChancePerEligiblePairPerDay`, default **0**.

Each grazer persists only `lastBirthDay` for reproduction state. A successful birth creates one age-0 grazer, cools down both parents, increments `creatureBirths`, and emits typed `creature.born` history with the newborn subject and both parent creature causes/IDs.

Snapshot schema is **v11** with deterministic v10 migration. Enabled save/load continuation preserves cooldowns, events, counters, IDs, creature state, and future keyed outcomes exactly. Reproduction consumes no sequential RNG. There is no sex, mate bond, creature genealogy, gestation, litter, predator framework, species registry, or global population controller.

## Completed natural-turnover research gate — Sprint 014 / #103

Simple deterministic grazer senescence was tested as keyed research logic and rejected for runtime under radius-1 encounter geometry. Low-density `18–24` looked viable, but carrying-pressure worlds collapsed. Widening to `18–30` / `18–36` only delayed the same problem.

Evidence: `docs/experiments/2026-08-24-grazer-natural-turnover.md`.

## Completed encounter-recovery research gate — Sprint 015 / #105

Keeping reproduction/resource semantics fixed, radius 3 is the smallest tested partner-search geometry where all six 100/200-founder turnover-stress worlds recover. A 90-year extension confirms multi-generation persistence and bounded resource cycles.

Evidence: `docs/experiments/2026-08-24-grazer-encounter-recovery.md`.

## Completed authoritative encounter gate — Sprint 016 / #107

Grazer reproduction partner discovery now accepts an eligible second parent within Chebyshev radius **3**. Each parent's local vegetation measurement remains radius **1** and every other reproduction semantic remains unchanged. The radius is a private mechanic constant; snapshot schema remains v11.

## Completed radius-3 turnover re-evaluation — Sprint 017 / #110

The hard 12–18y lifespan passes low-density pre-gating but fails carrying pressure, including extinction of all three 200-founder worlds. A diagnostic 18–24y band also fails. No senescence ships and hard lifespan endpoint search stops.

Evidence: `docs/experiments/2026-08-24-grazer-turnover-radius3.md`.

## Completed founder-cohort diagnostic — Sprint 018 / #112

Changing only founder age from synchronized age2 to keyed 0–6y heterogeneity softens/delays hard-lifespan collapse but does not robustly rescue it. All 200-founder worlds still go extinct. Founder-age tuning stops.

Evidence: `docs/experiments/2026-08-24-grazer-founder-age-synchronization.md`.

## Completed gradual-mortality research gate — Sprint 019 / #114

One pre-registered gradual age-dependent hazard was tested without changing reproduction, resources, encounter radius, or founder age.

The 60-year gate passes 9/9 worlds, so the exact same curve advances to 120 years. At year120 the final populations for seeds `1/4/9` are:

- 20 founders: **47 / 104 / 72**;
- 100 founders: **91 / 119 / 52**;
- 200 founders: **102 / 134 / 86**.

All 9 worlds have nonzero births in years101–120 and substantial replacement-parent reproduction. The weakest carrying-pressure worlds recover after minima of 5–7 animals rather than crossing into extinction. Vegetation still reaches the expected high-pressure minima (~1.9%–5.9% for 100/200 founders) and later recovers, producing long resource–population cycles rather than a fixed target.

Old-age deaths are distributed broadly from roughly age12 into the mid-30s, demonstrating that the hazard does not recreate a hard lifespan cutoff. Sequential RNG remains unchanged.

**Decision: the exact Sprint 019 hazard is eligible for a separate default-off authoritative implementation gate. It is not yet shipped.**

Evidence: `docs/experiments/2026-08-24-grazer-gradual-mortality-hazard.md`.

## Next decision gate

Promote the **exact Sprint 019 hazard** behind a default-off authoritative grazer old-age mortality switch, without retuning the curve or reproduction/resource/encounter behavior.

The implementation must:

- preserve behavior exactly when disabled;
- use keyed randomness only;
- route old-age death through typed `creature.died` history with cause `old_age`;
- keep starvation causally distinct;
- preserve deterministic save/load and separate creature/human identity domains;
- re-run multi-seed low-density and carrying-pressure ecological regression;
- avoid a population controller or generic mortality/species framework.

Whether snapshot schema needs a change depends on the smallest correct config/persistence implementation; do not bump schema merely for ceremony.

Territory visualization, civilization labels, meteor/plague, predators, and art expansion remain lower priority unless they become the actual bottleneck.

## Project-management rule

Do not jump to kingdoms/war or attach behavior to convenient labels. Research observations are not automatically authoritative entities. Add the smallest causal mechanism supported by experiments, preserve coherent negative/rare outcomes, and make the world's actual history explainable.
