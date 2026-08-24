# Project status

Last updated: 2026-08-24

## Current state

`main` contains a deterministic living-world simulation with:

- seeded, serializable RNG and fixed-tick world state;
- procedural elevation/moisture, land/ocean, renewable food, and renewable vegetation biomass;
- human hunger, movement, eating, aging, reproduction, death, ancestry, lineage history, settlements, territory, and causal history;
- a typed creature domain with explicit-spawn grazer ecology, default-off authoritative grazer reproduction, and default-off authoritative gradual old-age mortality;
- derived social/scarcity/demographic/ecology research instruments;
- deterministic save/load, Simulation Lab, long-run regressions, and 10k-agent benchmark coverage;
- a lightweight Canvas client with causal history inspection and Spawn human / Spawn grazer / Erase / Lightning tools.

Default worlds **still contain zero creatures**. The ecology mechanisms are authoritative, but natural fauna initialization remains research-only until compact-map initialization and activation compatibility are resolved.

Grazer reproduction is enabled only when `grazerBirthChancePerEligiblePairPerDay > 0`; default is `0`. Partner discovery uses Chebyshev radius **3**, while each parent's vegetation eligibility remains radius **1** with threshold `0.50`.

Grazer old-age mortality is enabled only by `grazerOldAgeMortalityEnabled: true`; default is `false`. The gradual hazard uses keyed randomness and the normal typed `creature.died` lifecycle. Existing v11 snapshots without the key restore it as false.

## Binding architecture decisions

### Historical/social labels do not imply behavior

Lineage is ancestry identity, not household. `parental_union` is historical shared-birth evidence, not spouse state. Repeated local contact remains a fluid social field, not an authoritative social-bond or residential-group roster.

### Settlement extinction is valid history

Broad shared-food storage was tested and rejected. Natural settlement abandonment is rare and causally heterogeneous, so generic fertility, migration, member-locking, storage, or persistence rescue rules remain rejected.

### Measured carrying capacity is evidence, not a controller

Sprint 011 measured landscape-dependent grazer survivor plateaus, but runtime ecology never reads a target population or carrying-capacity ratio. Population remains an outcome of local vegetation, condition, reproduction, starvation, and mortality.

### Encounter distance and resource locality remain separate

A reproduction partner can be discovered within radius 3, while each parent's resource eligibility remains radius 1. Do not broaden resource locality or introduce a generic interaction-radius framework without independent evidence.

### Hard lifespan bands remain rejected

Hard keyed lifespan bands failed carrying-pressure turnover. Founder-age heterogeneity delayed the same failure but did not solve it. Do not resume lifespan-endpoint or founder-age tuning.

### Natural grazer mortality uses a gradual hazard

Sprint 019 identified and Sprint 020 promoted:

`pAnnual(age) = 0 before age 12; otherwise min(0.50, 0.01 * 2 ^ ((ageYears - 12) / 3))`

with exact annual-to-daily conversion and a keyed daily chance. There is no hard maximum age or per-creature scheduled death state.

The old-age pass runs after grazer action/starvation and authoritative day increment, but before reproduction. Starvation is therefore an earlier distinct cause and an old-age death cannot reproduce later that day. Snapshot schema remains v11.

### Ten founders are validated at 24×24+, not universally

Sprint 021 validates a deterministic natural-fauna research initializer on 24×24:

- sort passable tiles by initial vegetation descending, then y/x;
- use the 32 richest passable cells;
- place founders round-robin;
- assign keyed founder age in `[0,6y]` from world seed + future creature ID + a dedicated salt;
- otherwise use normal grazer defaults.

Ten founders are the smallest pre-registered 24×24 count that passes the broad gate. Sprint 022 then tests whether fixed 10 can be universal across `16/24/32/48`.

At 60 years, all 48 size/seed worlds pass. At 120 years, however, three compact 16×16 worlds fail while **all 24×24, 32×32, and 48×48 worlds pass**.

Failed 16×16 worlds:

| Seed | Passable land | Year120 pop | Min after year20 | Births years101–120 | Final 5y mean vegetation |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 57 | **9** | 2 | 8 | ~74.2% |
| 6 | 66 | **5** | 5 | **3** | ~81.1% |
| 7 | 101 | **4** | 2 | **4** | ~99.0% |

These failures happen with recovered vegetation, not permanent resource collapse. The unresolved problem is excessive founder density / subsequent sparse-demography tails on some compact worlds.

Large worlds do **not** show an under-seeding problem. Fixed 10 successfully ignites all tested 32×32 and 48×48 worlds, including delayed-expansion cases such as 48×48 seed9 (`61` grazers at year60, `315` at year120). Therefore no large-map founder up-scaling is justified by current evidence.

## Human / settlement checkpoint

The post-social 100×200 baseline completes all 100 seeds. Year-200 population median/mean are **489 / 496.68**; median settled-population share is ~86% and median territory coverage ~83%. Only seeds 49, 62, and 98 contain one naturally abandoned settlement each.

Exact sampled settlement flow accounting reconciles:

`population delta = surviving newborn additions + external spawns + entries + switches in - deaths - exits - switches out`

Known abandonments are causally heterogeneous; persistent loss of the female replacement pipeline can be a terminal warning but is not a universal upstream cause.

## Ecology progression

### Sprint 010 / #93 — first endogenous grazer loop

Explicit-spawn grazers consume vegetation, move with keyed randomness, can starve, and emit typed death history. Creature IDs are independent from human IDs.

### Sprint 011 / #95 — carrying pressure

Overloaded no-reproduction worlds converge toward landscape-specific survivor plateaus. Evidence: `docs/experiments/2026-08-24-grazer-carrying-pressure.md`.

### Sprint 012 / #97 — reproduction research

A local condition/resource/cooldown pair rule with keyed chance `0.001` grows low-density populations and self-suppresses under pressure. Evidence: `docs/experiments/2026-08-24-grazer-reproduction-probe.md`.

### Sprint 013 / #100 — authoritative reproduction

The rule becomes authoritative behind default-zero birth chance. Birth cooldown persists as `lastBirthDay`; typed `creature.born` history is emitted. Snapshot schema becomes v11 with v10 migration.

### Sprint 014 / #103 — hard senescence rejected

Simple keyed lifespan bands fail carrying-pressure recovery. Evidence: `docs/experiments/2026-08-24-grazer-natural-turnover.md`.

### Sprint 015 / #105 — encounter recovery

Radius 3 is the smallest tested partner-search geometry that restores multi-generation turnover-stress recovery without changing resource locality. Evidence: `docs/experiments/2026-08-24-grazer-encounter-recovery.md`.

### Sprint 016 / #107 — authoritative radius 3

Partner discovery becomes radius 3; local vegetation remains radius 1.

### Sprint 017 / #110 — hard lifespan re-evaluation

Hard 12–18y and diagnostic 18–24y bands still fail carrying pressure. Evidence: `docs/experiments/2026-08-24-grazer-turnover-radius3.md`.

### Sprint 018 / #112 — founder synchronization diagnostic

Age0–6 founder heterogeneity softens but does not solve hard-lifespan failure. Evidence: `docs/experiments/2026-08-24-grazer-founder-age-synchronization.md`.

### Sprint 019 / #114 — gradual mortality research

One pre-registered gradual hazard remains multi-generational through 120 years across seeds1/4/9 × founders20/100/200. Evidence: `docs/experiments/2026-08-24-grazer-gradual-mortality-hazard.md`.

### Sprint 020 / #116 — authoritative gradual mortality

The exact research hazard becomes authoritative behind a default-false switch with deterministic save/load, v11 compatibility, typed `old_age` history, and a pinned 60-year ecology fingerprint.

### Sprint 021 / #118 — 24×24 natural initialization

The 10-founder initializer passes seeds1–30 through 120 years. Year120 population min/median/max is **15 / 68 / 166**; all worlds retain replacement reproduction and resource cycling. Evidence: `docs/experiments/2026-08-24-natural-grazer-initialization.md`.

### Sprint 022 / #120 — fixed-founder cross-size diagnostic

Stage 1 passes all 48 worlds at 60 years. Stage 2 rejects fixed 10 as universal because seeds2/6/7 at 16×16 finish below the terminal population/birth gate. All 24×24, 32×32, and 48×48 worlds pass.

Evidence: `docs/experiments/2026-08-24-grazer-founder-size-scaling.md`.

## Next decision gate

Test one **down-only compact-map founder rule** while leaving the validated 24×24+ initializer at 10 founders.

The rule must be pre-registered and structural rather than tuned across failed seeds. It should test compact and intermediate map sizes, preserve sequential RNG isolation, and remain an initialization rule rather than a runtime carrying-capacity controller.

Only after compact-map initialization passes should the project decide activation semantics: explicit opt-in config, ecology preset, or any future new-world default. Until then, default worlds remain creature-free.

Do not add predators, another species, or human/settlement animal interaction before activation is coherent.

## Project-management rule

Do not jump to kingdoms/war or attach behavior to convenient labels. Research observations are not automatically authoritative entities. Add the smallest causal mechanism supported by experiments, preserve coherent negative/rare outcomes, and make the world's actual history explainable.
