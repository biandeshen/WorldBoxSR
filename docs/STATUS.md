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

Default worlds remain creature-free. Grazer reproduction exists only when explicitly enabled through a nonzero reproduction chance; its default is zero. Authoritative partner search is Chebyshev radius **3**, while each parent's local vegetation condition remains radius **1**. Grazer senescent death is **not** implemented. Sprints 017–018 reject tested hard keyed-uniform lifespan bands and reject founder-age synchronization as a sufficient explanation of their carrying-pressure failure.

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

### Hard lifespan bands remain rejected after encounter correction

Sprint 014 originally showed that senescence plus radius-1 reproduction creates a post-pressure extinction trap. Sprint 015/016 corrected the measured encounter geometry to radius 3, so Sprint 017 re-ran lifespan evidence from scratch.

The correction helps low-density replacement, but it does **not** make a hard keyed-uniform lifespan band robust at carrying pressure. The pre-registered 12–18y candidate passes the low-density gate yet fails 100/200-founder carrying-pressure worlds. A post-hoc 18–24y diagnostic also fails all 200-founder landscapes and seed1/100.

Sprint 018 then changed only founder age structure. Spreading founders deterministically over 0–6 years delays complete founder turnover by roughly 1–2 years and improves replacement on some 100-founder worlds, but **all three 200-founder worlds still go extinct**, seed1/100 falls to one survivor, and seed9/100 ends at 16. Founder synchronization is therefore not a sufficient explanation.

Do not keep searching lifespan endpoints or founder-age ranges. The next mortality hypothesis must change the **shape of mortality**: a gradual age-dependent hazard while reproduction/resource/encounter rules remain fixed.

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

Simple deterministic grazer senescence was tested as keyed research logic and **rejected for runtime under radius-1 encounter geometry**.

Low-density `18–24` looked viable, but carrying-pressure worlds collapsed. Widening to `18–30` / `18–36` only delayed the same problem. Diagnostic work identified:

`resource depletion suppresses births → senescence reduces population → vegetation recovers → sparse spatial distribution suppresses encounters`

Evidence: `docs/experiments/2026-08-24-grazer-natural-turnover.md`.

No lifespan field/config/event, snapshot change, or old-age runtime behavior was accepted from Sprint 014.

## Completed encounter-recovery research gate — Sprint 015 / #105

Sprint 015 kept birth chance `0.001`, radius-1 local vegetation threshold `0.50`, condition gates, cooldown, stable pairing, and keyed randomness fixed while comparing only partner-search Chebyshev radius `1/2/3`.

Radius 2 materially improves recovery but fails seed1/100. Radius 3 is the smallest tested geometry where all six 100/200-founder turnover-stress worlds recover. A 90-year extension confirms multi-generation persistence and bounded resource cycles. A no-senescence compatibility study shows radius 3 accelerates low-density approach to carrying pressure but preserves the high-pressure carrying envelope.

Evidence: `docs/experiments/2026-08-24-grazer-encounter-recovery.md`.

## Completed authoritative encounter gate — Sprint 016 / #107

Grazer reproduction partner discovery now accepts an eligible second parent within Chebyshev radius **3**.

Each parent's local vegetation measurement remains radius **1** and every other reproduction semantic remains unchanged. The radius is a private mechanic constant rather than public config; snapshot schema remains v11.

Tests pin exact distance-3 success and distance-4 rejection, preserve default-off behavior, save/load determinism, sequential RNG isolation, and the multi-seed carrying/reproduction envelope.

## Completed radius-3 turnover re-evaluation — Sprint 017 / #110

Natural lifespan evidence was re-run against authoritative radius-3 reproduction.

### Stage 1 — 20 founders

- `8–12y`: final **40 / 36 / 5**; seed9 is not robust;
- `12–18y`: final **51 / 131 / 101**, with continued post-founder/replacement reproduction on all three seeds;
- `18–24y`: final **71 / 136 / 92**, but seed9 has no births after complete founder disappearance.

Per the pre-registered rule, only **12–18y** advanced.

### Stage 2 — carrying pressure

The unchanged 12–18y band fails:

- 100 founders: seed1 goes extinct, seed9 ends with 1, only seed4 recovers to 42;
- 200 founders: **all three seeds go extinct** around years 16–20.

Vegetation first falls into the known ~2%–6% carrying regime and correctly freezes births. Senescence begins before replacement stock is large enough. Vegetation recovers only after the cohort has already collapsed.

### Exploratory 18–24 diagnostic

A post-hoc 18–24y carrying run is diagnostic only, not an acceptance gate. It also fails robustly: seed1/100 goes extinct and all three 200-founder worlds go extinct around years 23–26.

**Decision: no natural senescence ships.** Further hard lifespan-band endpoint search is stopped.

Evidence: `docs/experiments/2026-08-24-grazer-turnover-radius3.md`.

## Completed founder-cohort diagnostic — Sprint 018 / #112

Sprint 018 retained the rejected 12–18y hard lifespan and changed only founder starting ages: synchronized age2 vs keyed heterogeneous age0–6.

At 100 founders, year-60 finals change from `0 / 42 / 1` to `1 / 130 / 16` on seeds `1 / 4 / 9`. The broader cohort strongly helps seed4 but does not produce robust persistence across landscapes.

At 200 founders, **both cohorts go extinct on all three seeds**. Heterogeneous founders extend complete founder turnover only from about years `15.8–15.9` to `17.1–17.8`; all three runs still fail to produce replacement-parent births after founders disappear.

Sequential RNG remains unchanged. No runtime mortality state or schema change is accepted.

Evidence: `docs/experiments/2026-08-24-grazer-founder-age-synchronization.md`.

## Next decision gate

Research a **gradual age-dependent mortality hazard**, not another hard lifespan band and not another founder-age range.

Keep fixed:

- authoritative partner radius 3;
- birth chance `0.001`;
- local vegetation threshold `0.50`;
- maturity/health/hunger/cooldown gates;
- no global population target;
- separate human/creature identity domains;
- sequential RNG isolation.

The next experiment should pre-register one simple hazard curve and compare it against no-senescence and/or the rejected hard-lifespan reference without tuning reproduction/resource parameters. A mortality model advances only if it survives multiple generations at low density and carrying pressure across all landscapes while preserving resource-limited dynamics and a causal old-age/starvation distinction.

Territory visualization, civilization labels, meteor/plague, predators, and art expansion remain lower priority unless they become the actual bottleneck.

## Project-management rule

Do not jump to kingdoms/war or attach behavior to convenient labels. Research observations are not automatically authoritative entities. Add the smallest causal mechanism supported by experiments, preserve coherent negative/rare outcomes, and make the world's actual history explainable.
