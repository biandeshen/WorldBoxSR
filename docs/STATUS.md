# Project status

Last updated: 2026-08-24

## Current state

`main` contains a deterministic living-world simulation with:

- seeded, serializable RNG and fixed-tick world state;
- procedural terrain, renewable food, and renewable vegetation biomass;
- human hunger/movement/eating/aging/reproduction/death, ancestry, settlements, territory, and causal history;
- typed grazer ecology with grazing/starvation;
- default-off authoritative grazer reproduction;
- default-off authoritative gradual grazer old-age mortality;
- deterministic save/load, Simulation Lab, long-run regressions, and a lightweight Canvas/history client.

Default worlds **still contain zero creatures**. Natural-fauna initialization remains research-only.

Grazer reproduction remains default `0`, partner discovery radius **3**, and each parent's vegetation eligibility radius **1** / threshold `0.50`. Grazer old-age mortality remains behind `grazerOldAgeMortalityEnabled: true`, default `false`; snapshot schema remains v11-compatible.

## Binding decisions

- Lineage is ancestry, not household; `parental_union` is historical shared-birth evidence, not spouse state.
- Broad settlement food storage and generic settlement survival rescue remain rejected; rare natural extinction is valid history.
- Measured carrying capacity is evidence, never a runtime population controller.
- Hard grazer lifespan bands and founder-age tuning remain rejected.
- Total area/passable land and scalar founder count are not universal compact initializer rules.
- Single terminal-year population/birth gates, low-population duration, and single-duration birth-gap classifiers are all rejected for compact persistence evaluation.
- Future initializer work should use direct paired causal outcomes, not synthetic scalar persistence scores.
- **Sprint029 encounter-safe placement is a research candidate only.** It may advance to fresh validation, but it is not runtime/default fauna.

## Authoritative grazer lifecycle

The validated old-age hazard is:

`pAnnual(age) = 0 before age 12; otherwise min(0.50, 0.01 * 2 ^ ((ageYears - 12) / 3))`

with keyed daily randomness and no hard maximum age. Daily order remains:

`grazer action/starvation → day increment → old-age hazard → reproduction`

## Compact natural-fauna research

### Sprint021 / #118 — 24×24 candidate

Vegetation-rich top32/round-robin placement with keyed founder ages `[0,6y]`; ten founders pass the original 30-seed/120y 24×24 research gate. This remains research-only.

### Sprints022–024 — scalar compact rules rejected

Fixed10 and simple area scaling fail some 16×16 worlds. Counts `2/4/6/8/10` are strongly non-monotonic. Failures split into initial encounter/establishment failure, later resource-demography recovery failure, and terminal sampling of living cycle troughs.

### Sprints025–028 — synthetic persistence thresholds rejected

Long-horizon follow-up shows one terminal checkpoint is phase-sensitive. A 40y `low-pop OR zero-birth` rule is falsified unseen by seed20×2; a 40y zero-birth-only rule has zero false signals but zero living-world triggers; exact birth-gap derivation then shows decisive overlap between persistent and eventual-extinction worlds.

Late-extinction terminal birthless gaps span ~0.42–29.98y (median ~21.49y), while persistent observed gaps reach ~22.71y; 16/31 late extinctions fall inside the persistent range. Stop scalar threshold search.

Evidence:

- `docs/experiments/2026-08-24-grazer-cycle-aware-persistence.md`
- `docs/experiments/2026-08-24-grazer-recovery-envelope-unseen-validation.md`
- `docs/experiments/2026-08-24-grazer-zero-birth-stall-validation.md`
- `docs/experiments/2026-08-24-grazer-birth-stall-sensitivity.md`

### Sprint029 / #134 — encounter-safe placement paired A/B passes research gate

One narrow intervention changes **only founder coordinates inside the existing vegetation-rich top32 candidate pool**. Founder count, IDs, keyed ages, reproduction, mortality, resource behavior, and sequential RNG remain fixed.

Paired matrix: seeds1–60 × founders2/4 × baseline/intervention, each through year300.

#### Two founders

- baseline extinctions: **23**;
- encounter-safe extinctions: **22**;
- rescued: **1**;
- harmed: **0**;
- zero-birth extinctions: **6 → 5**;
- initial zero-pair founder worlds: **13 → 0**.

#### Four founders

- baseline extinctions: **13**;
- encounter-safe extinctions: **11**;
- rescued: **2**;
- harmed: **0**.

Median starvation deaths remain zero across both counts/arms. Two-founder median vegetation minimum is unchanged; four-founder intervention minimum is only modestly lower, without harm excess or systematic starvation.

Direct rescues:

- **seed22×2**: disconnected baseline, 2 total births, extinct ~y34 → connected intervention, 16 births by y20 / 366 total, alive y300 pop23;
- **seed19×4**: baseline extinct ~y258.7 → intervention alive y300 pop18;
- **seed33×4**: fragmented founder graph, baseline extinct ~y241.7 → connected intervention alive y300 pop20.

Important negative evidence: encounter connectivity does not guarantee establishment. Several radius3-connected 2-founder worlds still produce zero births and die. Placement repairs one causal failure mode; it is not a survival controller.

**Decision:** the exact frozen encounter-safe algorithm passes the pre-registered paired research gate and may proceed to fresh-seed validation only. Do not tune radius3/top32/counts/ages/ecology before validation; do not promote to runtime/default fauna.

Evidence: `docs/experiments/2026-08-24-grazer-encounter-safe-placement.md`.

## Human / settlement checkpoint

The post-social 100×200 baseline completes all 100 seeds; only seeds49/62/98 contain one naturally abandoned settlement each. Known abandonments are causally heterogeneous and generic settlement rescue remains rejected.

## Next decision gate

Fresh-seed validation of the **exact Sprint029 encounter-safe placement algorithm**.

The validation must:

- use compact seeds not used in the paired derivation matrix;
- freeze top32 pool, radius3 selection logic, founder counts `2/4`, keyed ages, and all ecology;
- preserve paired baseline/intervention comparison;
- use actual extinction/time-to-extinction, births/replacement births, resource minima, and starvation—not a synthetic persistence threshold;
- require that rescue benefit does not reverse into a harm excess;
- audit every harmed case if any.

Only after fresh validation may a separate issue consider whether this placement belongs in an explicit opt-in natural-fauna initializer. Default worlds remain creature-free.

## Project-management rule

Prefer paired causal experiments to scalar warning metrics. Preserve negative and heterogeneous outcomes, separate derivation from validation, and keep runtime changes downstream of evidence.
