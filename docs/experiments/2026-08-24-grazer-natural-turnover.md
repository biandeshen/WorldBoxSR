# Grazer natural-turnover research — 2026-08-24

Issue: #103
Sprint: 014

## Question

Can a simple deterministic grazer lifespan close the remaining life-cycle gap without destroying the local-resource reproduction dynamics established in Sprints 011–013?

The runtime currently advances `ageDays`, but a well-fed low-pressure grazer has no senescent death. Reproduction is authoritative but default-off, and the proven experimental rate is `0.001` per eligible adjacent pair/day.

This study deliberately tests senescence as temporary research logic first. No runtime lifespan field, lifespan config, old-age event, snapshot change, or default-animal behavior is introduced.

## Candidate mechanism

Each grazer receives a deterministic lifespan derived from keyed randomness over `world.seed + creature.id`. The probe consumes no sequential `world.rng` and stores no authoritative lifespan state.

For the research loop, senescence happens after the day's grazer action and day increment but before authoritative reproduction. A grazer at or beyond its derived age is removed as a research-only `old_age` death, preventing reproduction after its natural-death age.

All experiments use creature-only 24×24 worlds, deterministic vegetation-rich founder placement, and explicit reproduction chance `0.001`.

## Stage 1 — low-density lifespan bracket

Twenty founders begin at age 2 years and run for 30 years on landscape seeds `1/4/9`.

| Lifespan band | Seed | Final living | Births | Old-age deaths | Births after founders gone | Replacement-parent births | Founder extinction year | Final vegetation |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8–12 | 1 | 0 | 12 | 32 | 2 | 3 | 9.88 | 100.0% |
| 8–12 | 4 | 0 | 11 | 31 | 1 | 6 | 9.83 | 100.0% |
| 8–12 | 9 | 0 | 13 | 33 | 1 | 3 | 9.90 | 100.0% |
| 12–18 | 1 | 6 | 21 | 35 | 4 | 12 | 15.81 | 99.2% |
| 12–18 | 4 | 2 | 18 | 36 | 1 | 11 | 15.75 | 99.9% |
| 12–18 | 9 | 28 | 51 | 43 | 27 | 36 | 15.86 | 95.2% |
| 18–24 | 1 | 72 | 83 | 31 | 32 | 70 | 21.81 | 64.4% |
| 18–24 | 4 | 62 | 72 | 30 | 29 | 59 | 21.75 | 90.3% |
| 18–24 | 9 | 92 | 105 | 33 | 46 | 82 | 21.86 | 65.9% |

There were zero starvation deaths in every Stage-1 run. Minimum vegetation remained above ~74% for the two shorter bands and above ~64% for the successful `18–24` runs.

### Stage-1 decision

- `8–12` is rejected: all three worlds go extinct.
- `12–18` is rejected: seeds 1/4 finish with only 6/2 grazers, showing unreliable replacement.
- `18–24` is the shortest low-density band that clearly survives complete founder turnover and continues reproduction through replacement generations.

`18–24` therefore advances unchanged to carrying-pressure tests.

## Stage 2 — carrying-pressure test exposes failure

Founder densities `100/200` run for 30 years on seeds `1/4/9`, comparing no senescence with the `18–24` band.

### 100 founders

| Mode | Seed | Final living | Births | Starvation deaths | Old-age deaths | Final vegetation |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| no senescence | 1 | 114 | 23 | 9 | 0 | 5.6% |
| no senescence | 4 | 155 | 55 | 0 | 0 | 5.0% |
| no senescence | 9 | 130 | 35 | 5 | 0 | 4.6% |
| 18–24 | 1 | 0 | 23 | 6 | 117 | 100.0% |
| 18–24 | 4 | 7 | 60 | 0 | 153 | 99.2% |
| 18–24 | 9 | 1 | 36 | 1 | 134 | 99.9% |

### 200 founders

| Mode | Seed | Final living | Births | Starvation deaths | Old-age deaths | Final vegetation |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| no senescence | 1 | 112 | 16 | 104 | 0 | 6.2% |
| no senescence | 4 | 161 | 33 | 72 | 0 | 4.2% |
| no senescence | 9 | 132 | 19 | 87 | 0 | 4.4% |
| 18–24 | 1 | 0 | 16 | 101 | 115 | 100.0% |
| 18–24 | 4 | 0 | 33 | 72 | 161 | 100.0% |
| 18–24 | 9 | 0 | 19 | 87 | 132 | 100.0% |

The control worlds remain near the known landscape-specific carrying envelope. Adding `18–24` senescence instead collapses all overloaded worlds and nearly all 100-founder worlds.

Births mostly freeze during the initial resource-limited phase. Founder senescence then removes the remaining carrying-pressure population faster than reproduction restarts, so vegetation rebounds to capacity only after the population has fallen too far.

## Stage 3 — widening the death window does not solve it

To test whether cohort synchronization alone caused collapse, the minimum old-age point stayed fixed at 18 years while the deterministic window widened to `18–30` and `18–36`. No reproduction/resource parameter changed. The horizon extended to 45 years.

| Band | Founders | Seed 1 final | Seed 4 final | Seed 9 final | Final vegetation range |
| --- | ---: | ---: | ---: | ---: | ---: |
| 18–30 | 100 | 1 | 9 | 7 | 99.4%–99.9% |
| 18–36 | 100 | 7 | 33 | 3 | 96.8%–99.8% |
| 18–30 | 200 | 3 | 5 | 4 | 99.5%–99.6% |
| 18–36 | 200 | 16 | 19 | 9 | 97.8%–99.2% |

Wider windows improve survival slightly but still erase the carrying-pressure state. Continuing to widen the window would only postpone the same failure, so lifespan parameter search stops here.

## Stage 4 — reproduction-bottleneck diagnosis

The `18–36` case was instrumented without changing its mechanics. At yearly checkpoints the probe counted four nested states:

1. `matureHealthyFed`: adult, health >= 0.95, hunger <= hungry threshold;
2. `cooldownReady`;
3. `resourceReady`: local radius-1 vegetation utilization >= 0.50;
4. stable adjacent pair supply, before and after the resource gate.

### Finding 1 — resource gating creates a long recovery delay

During the depleted phase, animals are often physically eligible and still spatially pairable, but local vegetation blocks reproduction completely.

Across the six 100/200-founder runs, before local resources recover there are checkpoints with **46–67 condition-eligible adjacent pairs but zero resource-eligible pairs**.

The first post-pressure resource-eligible animals do not reappear until roughly years **23–27**; the first resource-eligible adjacent pairs appear around years **24–28**.

At that point living populations have already fallen substantially. The first resource-eligible pair appears with only about **47–94** grazers left depending on landscape and starting density.

This resource gate is doing exactly what Sprint 012 intended—preventing births under severe vegetation pressure—but natural mortality reveals that the recovery delay matters dynamically.

### Finding 2 — low density then creates a spatial Allee effect

Once vegetation fully recovers, local resource eligibility is no longer the main blocker. Most surviving adults are mature, healthy, fed, cooldown-ready, and resource-ready.

However, the population has dispersed across many cells. After year 34:

- seed 1 / 100 founders: at most 2 resource-eligible adjacent pairs;
- seed 4 / 100: at most 7;
- seed 9 / 100: at most 2;
- 200-founder cases: at most 2–3 pairs.

Typical late populations have nearly one occupied cell per living grazer. Several checkpoints have all surviving animals resource-ready but **zero adjacent pairs**.

Examples:

- 100 founders, seed 9, year 38: 3 living, all 3 resource-ready, 0 adjacent pairs; this remains a three-animal trap through year45.
- 200 founders, seed 1, year45: 16 living, 10 resource-ready, only 1 adjacent pair.
- 100 founders, seed 4 is the best recovery case: year45 has 33 living and 30 resource-ready, but only 4 adjacent pairs.

The system therefore enters a two-stage recovery trap:

`resource depletion suppresses births → senescence reduces population → vegetation recovers → sparse spatial distribution suppresses encounters`

This is a genuine low-density reproductive Allee effect created by the current radius-1 encounter rule, not evidence that the world needs a target population.

## Decision

**Reject simple deterministic grazer senescence for runtime at this gate.**

The natural-turnover problem is real, but adding a fixed keyed lifespan before resolving post-pressure reproductive recovery would make otherwise stable carrying-pressure populations collapse toward extinction while vegetation returns to capacity.

The negative result is robust to:

- short (`8–12`, `12–18`, `18–24`) lifespan brackets;
- carrying-pressure controls;
- wider `18–30` / `18–36` windows;
- three landscape seeds;
- 100 and 200 founder densities;
- 30–45 year horizons.

Every probe preserved sequential world RNG.

No lifespan field/config/event or runtime old-age death should be merged from Sprint 014.

## Next causal question

Keep the proven resource gate unchanged first. Test whether a minimal **low-density reproductive encounter mechanism** can remove the spatial Allee trap while preserving resource-based birth suppression at high pressure.

A useful first research comparison should change only encounter geometry/search, not birth probability, vegetation threshold, lifespan, or global population logic. Candidate temporary comparisons could include radius-1 versus radius-2/3 eligible partner search or a reproduction-directed local encounter move under otherwise identical conditions.

The mechanism must not imply a mate bond, sex system, genealogy, migration framework, or population controller. If broader encounter geometry destroys carrying-pressure suppression, record that negative result rather than compensating elsewhere.

Only after reproductive recovery is independently understood should natural senescence be reintroduced and revalidated.

## Cleanup

All lifespan and diagnostic logic in this sprint is temporary research scaffolding. The probe, temporary `npm test` override, and CI artifact upload are removed before merge. Sprint 014 should ship evidence and a negative runtime decision only.
