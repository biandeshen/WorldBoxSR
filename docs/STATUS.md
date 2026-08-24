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
- Total area/passable-land count and scalar founder count are not universal compact initializer rules.
- A single calendar-year population/birth checkpoint is not a stable persistence gate.
- Prolonged low population alone is not non-recovery.
- The 40-year zero-birth-only rule is too conservative to demonstrate useful sensitivity.
- **Sprint028 rejects single-duration birth-gap classification entirely:** terminal extinction birth gaps and normal persistent-cycle birth gaps overlap strongly. Stop threshold-searching on birth-gap duration.

## Authoritative grazer lifecycle

The validated old-age hazard is:

`pAnnual(age) = 0 before age 12; otherwise min(0.50, 0.01 * 2 ^ ((ageYears - 12) / 3))`

with exact annual-to-daily conversion and keyed daily randomness. There is no hard maximum age or per-creature scheduled death state.

Daily order:

`grazer action/starvation → day increment → old-age hazard → reproduction`

Old-age death uses typed `creature.died` with cause `old_age`; starvation remains earlier and distinct.

## Natural-fauna / compact research evidence

### Sprint 021 / #118 — 24×24 initializer candidate

Vegetation-rich top32/round-robin placement with keyed founder ages `[0,6y]`; 10 founders pass the original 30-seed/120y 24×24 research gate. This remains research-only.

### Sprints 022–024 — compact scalar rules rejected

Fixed10 and area-scaled founders are not universal on 16×16. A bounded counts `2/4/6/8/10` response surface is strongly non-monotonic. Trajectories separate initial encounter failure, later resource-demography recovery failure, and terminal sampling of recoverable cycle troughs.

### Sprint 025 / #126 — terminal-year gate rejected

An 18-world/240-year diagnostic shows year120 pass/fail flips repeatedly and can be wrong in both directions. A post-hoc 40-year recovery envelope was left only as an unseen-validation candidate.

Evidence: `docs/experiments/2026-08-24-grazer-cycle-aware-persistence.md`.

### Sprint 026 / #128 — low-pop OR zero-birth 40y envelope falsified unseen

Seeds17–30 × founders2/4/6/8/10 = 70 worlds through year300.

**seed20×2** stays below population10 for ~41.81 years, triggers the candidate around year60, then meaningfully recovers at year70 and finishes year300 with population36. Its longest zero-birth span is only ~14.81 years.

Decision: low abundance can coexist with generational recovery; reject the OR rule without threshold/boolean tuning.

Evidence: `docs/experiments/2026-08-24-grazer-recovery-envelope-unseen-validation.md`.

### Sprint 027 / #130 — 40y zero-birth rule is specific but non-sensitive

Fresh seeds31–60 × founders2/4/6/8/10 = 150 worlds through year300:

- 32 extinctions;
- 0 living worlds reach 40 continuous zero-birth years;
- 0 false signals;
- survivors' maximum observed zero-birth gap ~22.71 years.

The pre-registered specificity criterion passes, but no living world ever triggers; all extinctions occur first. The result is therefore a no-trigger/one-sided pass, not a useful complete gate.

Evidence: `docs/experiments/2026-08-24-grazer-zero-birth-stall-validation.md`.

### Sprint 028 / #132 — birth-gap duration itself cannot classify persistence

The same 150-world cohort was re-run as derivation data with exact birth timing.

- survivors at year300: **118**;
- early extinction before year20: **1**;
- late extinctions: **31**.

Late-extinction terminal birthless spans:

- min **0.42 years**;
- median **21.49 years**;
- max **29.98 years**.

Persistent-world observed birth gaps (max completed/right-censored):

- min **7.91 years**;
- median **17.88 years**;
- max **22.71 years**.

There is no separating interval. **16/31 late extinctions** have terminal birthless spans `<=22.71y`, inside the range already exhibited by persistent worlds.

Concrete overlap:

- eventual extinction seed39×10: terminal gap ~17.17y;
- seed37×2: ~19.79y;
- seed53×10: ~19.80y;
- seed57×6: ~20.16y;
- seed51×10: ~20.38y;
- seed56×2: ~21.49y;

while persistent worlds show completed gaps of ~21–22.71y.

**Decision: stop single-duration birth-gap threshold research.** Any threshold short enough to catch these extinctions lies inside normal persistent-cycle behavior; any threshold long enough to avoid persistent gaps misses many real extinctions or fires too late.

Evidence: `docs/experiments/2026-08-24-grazer-birth-stall-sensitivity.md`.

## Interpretation

Compact ecology is a nonlinear resource-demography oscillator, and extinction is causally heterogeneous. No one scalar sampled from the trajectory—terminal population, low-pop duration, or birth-gap duration—cleanly predicts all future outcomes.

Do not keep inventing synthetic persistence thresholds. For the next initializer experiment, use **direct paired causal outcomes**:

- whether founders establish reproduction;
- actual births and replacement-parent reproduction;
- actual extinction/time-to-extinction over a fixed long horizon;
- vegetation/resource pressure;
- whether the intervention changes later resource-demography cycles.

This keeps the research question causal: does a specific initialization change repair a specific observed failure mode?

## Human / settlement checkpoint

The post-social 100×200 baseline completes all 100 seeds. Year-200 population median/mean are **489 / 496.68**; median settled-population share is ~86% and median territory coverage ~83%. Only seeds49/62/98 contain one naturally abandoned settlement each. Generic settlement rescue remains rejected.

## Ecology progression

- Sprint 010 / #93 — grazing + starvation authoritative.
- Sprint 011 / #95 — carrying pressure measured.
- Sprints 012–013 — reproduction researched then authoritative, default off.
- Sprints 014–018 — hard lifespan/founder-age hypotheses rejected; radius3 encounter retained.
- Sprints 019–020 — gradual mortality researched then authoritative, default off.
- Sprint 021 — 24×24 natural initializer candidate.
- Sprints 022–024 — compact scalar initialization rules rejected; failure modes separated.
- Sprint 025 — terminal-year persistence gate rejected.
- Sprint 026 — low-pop-or-zero-birth envelope falsified unseen.
- Sprint 027 — 40y zero-birth rule has specificity but no sensitivity evidence.
- Sprint 028 — terminal and persistent birth-gap distributions overlap; single-duration classifier rejected.

## Next decision gate

Return to the **causal initialization problem**, not another persistence threshold.

Test one narrow **encounter-safe founder placement** hypothesis against the existing vegetation-rich placement, focused on genuine initial establishment failures. The experiment should be paired on identical worlds/counts and use direct outcomes through a fixed long horizon.

A valid next experiment must:

- change placement geometry only;
- keep founder count, ages, reproduction, mortality, vegetation, movement and all ecology fixed;
- include baseline and intervention on the same seed/count cases;
- measure initial radius3 encounter graph, early births, replacement-parent births, actual extinction/time-to-extinction, resource minima and long-run population cycles;
- preserve failures that arise later from resource-demography dynamics rather than pretending placement should rescue every world;
- make no runtime/default-fauna change until the placement hypothesis passes a separate validation gate.

Until then default worlds remain creature-free. Predator/second-species/human-animal interaction work remains lower priority.

## Project-management rule

Stop searching scalar warning thresholds once distributions overlap. Prefer paired causal experiments, preserve coherent failure modes, separate derivation from validation, and keep runtime changes downstream of evidence.
