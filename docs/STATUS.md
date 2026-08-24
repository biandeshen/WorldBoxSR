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

Grazer reproduction is enabled only when `grazerBirthChancePerEligiblePairPerDay > 0`; default is `0`. Partner discovery uses Chebyshev radius **3**; each parent's vegetation eligibility remains radius **1** with threshold `0.50`.

Grazer old-age mortality is enabled only by `grazerOldAgeMortalityEnabled: true`; default is `false`. Snapshot schema remains v11-compatible.

## Binding decisions

- Lineage is ancestry, not household.
- `parental_union` is historical shared-birth evidence, not spouse state.
- Repeated contact is a fluid social field, not an authoritative social-bond roster.
- Broad settlement food storage was tested and rejected.
- Rare natural settlement extinction is valid history; generic survival rescue remains rejected.
- Measured grazer carrying capacity is evidence, not a runtime population controller.
- Reproduction encounter radius3 and resource-locality radius1 are intentionally distinct.
- Hard grazer lifespan bands and founder-age tuning remain rejected.
- Total map area/passable-land count and scalar founder count are not universal compact initializer rules.
- The old single year-120 terminal population/birth gate is retired for compact initializer research.
- The Sprint025 40-year `low population OR zero births` envelope is rejected after unseen validation.
- Low population duration alone is not equivalent to loss of recovery capacity.
- Sprint027 shows a 40-year **zero-birth-only** rule has no observed false positives on fresh data, but it also never triggers before extinction; it is therefore not yet a useful complete persistence gate.

## Authoritative grazer lifecycle

The validated old-age hazard is:

`pAnnual(age) = 0 before age 12; otherwise min(0.50, 0.01 * 2 ^ ((ageYears - 12) / 3))`

with exact annual-to-daily conversion and keyed daily randomness. There is no hard maximum age or per-creature scheduled death state.

Daily order:

`grazer action/starvation → day increment → old-age hazard → reproduction`

Old-age death uses typed `creature.died` with cause `old_age`; starvation remains earlier and distinct.

## Natural-fauna / compact evaluation evidence

### Sprint 021 / #118 — 24×24 initializer candidate

Vegetation-rich top32/round-robin placement with keyed founder ages `[0,6y]`; 10 founders pass the original 30-seed/120y 24×24 research gate. This remains research-only.

### Sprints 022–024 / #120/#122/#124 — compact scaling/count rules rejected

Fixed10 and area-scaled founders are not universal on 16×16. A bounded counts `2/4/6/8/10` response surface is strongly non-monotonic. Failures separate into initial encounter failure, post-establishment resource-demography failure, and terminal sampling of recoverable cycle troughs.

### Sprint 025 / #126 — terminal-year gate rejected

An 18-world, 240-year diagnostic shows:

- 8/8 worlds alive but failing the year120 gate later pass again;
- seed2×10 later goes extinct despite earlier recovery;
- original passing control seed2×8 later goes extinct;
- 6/6 known extinction controls die and never re-pass.

A post-hoc 40-year recovery envelope separated this derivation set only and was explicitly left for unseen validation.

Evidence: `docs/experiments/2026-08-24-grazer-cycle-aware-persistence.md`.

### Sprint 026 / #128 — unseen validation falsifies low-pop OR zero-birth envelope

Seeds17–30 × founders2/4/6/8/10 = 70 unseen-to-derivation worlds through year300.

The frozen rule flagged a living world after either population<10 or zero births lasted 40 years. It produced one decisive false non-persistence signal:

**seed20×2** stays below population10 for ~41.81 years, is flagged around year60, then recovers by year70 (population14, rolling20 births14) and finishes year300 at population36. Its longest zero-birth span is only ~14.81 years.

Decision: reject the rule without threshold/boolean tuning. Low abundance can coexist with generational recovery capacity.

Evidence: `docs/experiments/2026-08-24-grazer-recovery-envelope-unseen-validation.md`.

### Sprint 027 / #130 — fresh zero-birth-only specificity validation

A new hypothesis removed population from the trigger entirely and retained a fixed 40-year zero-birth duration.

Fresh matrix: seeds31–60 × founders2/4/6/8/10 = **150 worlds**, year0→300.

Results:

- 32 extinctions by year300;
- **0** still-living worlds reach 40 continuous zero-birth years;
- **0** false non-recovery signals;
- **0** censored flagged worlds.

Among the 118 year300 survivors, longest zero-birth span is only ~**22.71 years** (seed39×8). All 32 eventual extinctions occur before a 40-year birthless period can trigger while the world is still alive.

Thus the pre-registered zero-false-signal criterion passes, but this is a **no-trigger / one-sided pass**. It demonstrates conservative specificity, not useful pre-extinction sensitivity. Do not promote 40-year zero-birth as a complete compact persistence gate.

Evidence: `docs/experiments/2026-08-24-grazer-zero-birth-stall-validation.md`.

## Interpretation

Compact grazer ecology is a nonlinear resource-demography oscillator:

`growth → vegetation pressure → reproduction suppression → aging/decline → vegetation recovery → sparse reproductive recovery → renewed growth`

Population abundance and generational recovery capacity are distinct. Birth activity is more causally relevant than a population floor, but an overly conservative birth-stall duration can be perfectly specific while useless as an early signal.

The next research problem is therefore **sensitivity characterization**, not another runtime mechanic.

## Human / settlement checkpoint

The post-social 100×200 baseline completes all 100 seeds. Year-200 population median/mean are **489 / 496.68**; median settled-population share is ~86% and median territory coverage ~83%. Only seeds49/62/98 contain one naturally abandoned settlement each. Generic settlement rescue remains rejected.

## Ecology progression

- Sprint 010 / #93 — grazing + starvation authoritative.
- Sprint 011 / #95 — carrying pressure measured.
- Sprints 012–013 / #97/#100 — reproduction researched then authoritative, default off.
- Sprints 014–018 — hard lifespan/founder-age hypotheses rejected; radius3 encounter retained.
- Sprints 019–020 / #114/#116 — gradual mortality researched then authoritative, default off.
- Sprint 021 / #118 — 24×24 natural initializer candidate.
- Sprints 022–024 — compact size/count rules rejected and failure modes separated.
- Sprint 025 / #126 — single-terminal gate rejected.
- Sprint 026 / #128 — 40y low-pop-or-zero-birth candidate falsified unseen.
- Sprint 027 / #130 — 40y zero-birth-only rule has zero false signals but zero living-world triggers on 150 fresh worlds.

## Next decision gate

Characterize **pre-extinction generational-stall sensitivity** before proposing another duration.

The next diagnostic should:

- keep ecology/placement fixed;
- transparently measure the duration from last birth to extinction for extinct worlds;
- compare it with the longest zero-birth gaps in persistent worlds;
- report overlap rather than parameter-searching it away;
- derive any shorter candidate only as a diagnostic output;
- validate that candidate later on another fresh seed set before treating it as a research gate.

Do not change founder count, placement, reproduction, mortality, resource thresholds, or runtime/default fauna to improve the evaluation metric.

Until evaluation is coherent, default worlds remain creature-free and predator/second-species/human-animal interaction work stays lower priority.

## Project-management rule

Do not promote terminal samples, convenient population floors, vacuous no-trigger passes, or in-sample thresholds into mechanics. Pre-register each hypothesis, preserve falsifying examples, and separate derivation from validation data.
