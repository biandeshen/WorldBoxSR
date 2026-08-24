# Project status

Last updated: 2026-08-24

## Current state

`main` contains a deterministic living-world simulation with:

- seeded, serializable RNG and fixed-tick world state;
- procedural elevation/moisture, land/ocean, renewable food, and renewable vegetation biomass;
- human hunger, movement, eating, aging, reproduction, death, ancestry, lineage history, settlements, territory, and causal history;
- typed creature identity with grazer grazing/starvation;
- default-off authoritative grazer reproduction;
- default-off authoritative gradual grazer old-age mortality;
- deterministic save/load, Simulation Lab, long-run regressions, and a lightweight Canvas/history client.

Default worlds **still contain zero creatures**. Natural-fauna initialization remains research-only.

Grazer reproduction is enabled only when `grazerBirthChancePerEligiblePairPerDay > 0`; default is `0`. Partner discovery uses Chebyshev radius **3**, while each parent's local vegetation eligibility remains radius **1** with threshold `0.50`.

Grazer old-age mortality is enabled only by `grazerOldAgeMortalityEnabled: true`; default is `false`. Snapshot schema remains v11-compatible.

## Binding decisions

- Lineage is ancestry, not household.
- `parental_union` is historical shared-birth evidence, not spouse state.
- Repeated contact is a fluid social field, not an authoritative social-bond roster.
- Broad settlement food storage was tested and rejected.
- Rare natural settlement extinction is valid history; generic survival rescue remains rejected.
- Measured grazer carrying capacity is evidence, not a runtime population controller.
- Reproduction encounter radius3 and resource-locality radius1 are intentionally distinct mechanics.
- Hard grazer lifespan bands and founder-age tuning remain rejected.
- Total map area / passable-land count are not sufficient compact founder-scaling rules.
- A scalar founder count is not a universal compact initializer.
- The old single year-120 terminal population/birth gate is retired for compact initializer research.
- The Sprint025 **40-year `low population OR zero births` recovery envelope is rejected** after unseen validation. Do not tune its duration or silently change its boolean structure.
- Low population duration alone is not equivalent to loss of recovery capacity. Future evaluation research must isolate generational/reproduction inactivity as a separate hypothesis.

## Authoritative grazer lifecycle

The validated old-age hazard is:

`pAnnual(age) = 0 before age 12; otherwise min(0.50, 0.01 * 2 ^ ((ageYears - 12) / 3))`

with exact annual-to-daily conversion and keyed daily randomness. There is no hard maximum age or per-creature scheduled death state.

Daily order:

`grazer action/starvation → day increment → old-age hazard → reproduction`

Old-age death reuses typed `creature.died` with cause `old_age`; starvation remains earlier and distinct.

## Natural-fauna initialization evidence

### Sprint 021 / #118 — 24×24 initialization candidate

The research initializer sorts passable tiles by initial vegetation descending (then y/x), uses the 32 richest passable cells, places founders round-robin, and assigns keyed founder age in `[0,6y]`.

Ten founders are the smallest pre-registered 24×24 candidate. The exact initializer passes seeds1–30 through 120 years with bounded vegetation cycles and replacement reproduction in every world.

### Sprint 022 / #120 — fixed10 is not universal by size

Fixed10 remains robust in tested 24×24, 32×32 and 48×48 worlds, but some compact 16×16 cases fail long-horizon continuation. No large-map founder up-scaling is justified.

### Sprint 023 / #122 — area down-scaling rejected

A pre-registered 16×16→4-founder area rule repairs some fixed10 failures and creates others. Same-land compact worlds can respond in opposite directions, so total area/passable land is not a robust founder rule.

### Sprint 024 / #124 — scalar founder count rejected

Seeds1–30 × founder counts `2/4/6/8/10` × 120y produce pass counts `23/27/26/26/22`. No count is universal and multiple seeds flip pass/fail direction as founder count increases.

Trajectory diagnosis separates:

1. initial encounter failure for some tiny founder sets;
2. post-establishment resource-demography recovery failure;
3. terminal samples that are merely low phases of living cycles.

### Sprint 025 / #126 — single-terminal persistence gate rejected

A pre-registered 18-world diagnostic extends compact cases to 240 years.

- 8/8 worlds alive but failing the old year120 gate later pass it again;
- seed2×10 later goes extinct despite earlier recovery;
- an original year120 passing control, seed2×8, also later goes extinct;
- 6/6 true-extinction controls are extinct by year240 and never re-pass.

Thus pass/fail at one calendar year is not a stable persistence label.

An in-sample observation suggested a 40-year envelope because persistent cases had shorter continuous low-pop/zero-birth spans than eventual extinctions. It was explicitly left as an unseen-validation candidate.

Evidence: `docs/experiments/2026-08-24-grazer-cycle-aware-persistence.md`.

### Sprint 026 / #128 — unseen validation rejects the 40-year envelope

The exact candidate was frozen before validation:

- after year20, flag a still-living compact world when either continuous `population <10` **or** continuous zero births reaches 40 years;
- any later checkpoint with population>=10 and rolling20 births>=5 is a false non-persistence signal and rejects the rule.

Unseen-to-derivation matrix: seeds17–30 × founders2/4/6/8/10 = **70 worlds**, each through year300.

Results:

- 11 extinctions by year300;
- 2 still-living worlds crossed the 40-year candidate boundary;
- **1 false non-persistence signal**;
- 0 censored flagged/alive/unrecovered worlds.

The decisive falsifier is **seed20 × 2 founders**:

- remains below population10 for ~**41.81 years**;
- triggers the 40-year flag around year60;
- nevertheless reaches population14 with rolling20 births14 at year70;
- finishes year300 with population36;
- longest zero-birth span is only ~**14.81 years**.

This directly shows that decades of low abundance can coexist with continued generational activity and later recovery.

The other flagged case, seed18×10, crosses the low-pop boundary just before extinction around year297. It is compatible with the candidate but cannot rescue a falsified rule.

No still-living unseen world reached a 40-year zero-birth span in this validation. The only false signal came from the low-population branch of the `OR` rule.

**Decision:** reject the 40-year `low-pop OR zero-birth` envelope. Do not change 40→45/50, do not switch `OR`→`AND`, and do not switch to birth-only logic inside the same hypothesis. Any generational-stall criterion requires a new pre-registered study and fresh validation data.

Evidence: `docs/experiments/2026-08-24-grazer-recovery-envelope-unseen-validation.md`.

## Interpretation

Compact grazer ecology is a nonlinear resource-demography oscillator:

`growth → vegetation pressure → reproduction suppression → aging/decline → vegetation recovery → sparse reproductive recovery → renewed growth`

Population abundance and recovery capacity are distinct. A small population can remain viable when births continue; conversely a numerically larger population can be on a terminal path if generational replacement stops.

The next evaluation boundary should therefore test **generational activity directly**, not another population floor or terminal sample.

## Human / settlement checkpoint

The post-social 100×200 baseline completes all 100 seeds. Year-200 population median/mean are **489 / 496.68**; median settled-population share is ~86% and median territory coverage ~83%. Only seeds49/62/98 contain one naturally abandoned settlement each.

Known settlement abandonments are causally heterogeneous. Generic settlement rescue remains rejected.

## Ecology progression

- Sprint 010 / #93 — grazing + starvation authoritative.
- Sprint 011 / #95 — carrying-pressure envelope measured.
- Sprint 012–013 / #97/#100 — reproduction researched then authoritative, default off.
- Sprint 014–018 — hard lifespan/founder-age hypotheses rejected; radius3 encounter correction retained.
- Sprint 019–020 / #114/#116 — gradual mortality researched then authoritative, default off.
- Sprint 021 / #118 — 24×24 natural initializer candidate passes initial research gate.
- Sprint 022–024 / #120/#122/#124 — compact scaling/count hypotheses rejected and failure classes separated.
- Sprint 025 / #126 — single-terminal gate rejected; 40y candidate derived only provisionally.
- Sprint 026 / #128 — unseen validation falsifies the 40y low-pop-or-zero-birth candidate.

## Next decision gate

Research **generational/reproduction stall as a separate evaluation hypothesis**.

The next study must:

- use a fresh pre-registered validation set not used to derive the rule;
- keep ecology and founder placement unchanged;
- treat low population only as descriptive context, not a failure trigger;
- test a fixed generational-inactivity definition without threshold search after results;
- distinguish extinction, sustained birth absence, and later meaningful recovery;
- report false non-persistence signals explicitly.

A natural hypothesis is that sustained zero-birth duration is closer to causal loss of recovery capacity than population abundance, but its duration/logic must be pre-registered in a new issue rather than inferred into Sprint026 retroactively.

Only after a robust evaluation boundary exists should a separate spatial-seeding experiment target genuine initial encounter failures.

Until then default worlds remain creature-free. Do not add predators, another species, or human/settlement animal interaction.

## Project-management rule

Do not promote terminal samples, convenient population floors, or in-sample thresholds into mechanics. Pre-register each new causal/evaluation hypothesis, preserve falsifying examples, and keep runtime changes downstream of evidence.
