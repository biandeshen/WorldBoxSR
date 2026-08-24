# Project status

Last updated: 2026-08-24

## Current state

`main` contains a deterministic living-world simulation with seeded/serializable RNG, procedural terrain/resources, human demography/society/history, typed grazer ecology, default-off authoritative grazer reproduction, default-off gradual grazer old-age mortality, deterministic save/load, Simulation Lab, regressions, and a lightweight Canvas/history client.

Default worlds **still contain zero creatures**. Natural-fauna initialization remains research-only.

Grazer reproduction remains default `0`; partner discovery radius is **3** while each parent's vegetation eligibility remains radius **1** / threshold `0.50`. Grazer old-age mortality remains behind `grazerOldAgeMortalityEnabled: true`, default `false`; snapshot schema remains v11-compatible.

## Binding decisions

- Lineage is ancestry, not household; `parental_union` is historical shared-birth evidence, not spouse state.
- Broad settlement food storage and generic settlement rescue remain rejected; rare coherent natural extinction is valid history.
- Carrying capacity is evidence, never a runtime population controller.
- Hard grazer lifespan bands and founder-age tuning remain rejected.
- Total area/passable land and scalar founder count are not universal compact initializer rules.
- Terminal-year gates, low-population duration, and single-duration birth-gap classifiers are rejected for compact persistence evaluation.
- Prefer direct paired causal outcomes over synthetic persistence scores.
- **Initial founder encounter connectivity is a real causal factor in some worlds, but maximizing it is not a universally beneficial placement objective.** Sprint030 fresh validation rejects the Sprint029 encounter-safe algorithm.

## Authoritative grazer lifecycle

The validated old-age hazard is:

`pAnnual(age) = 0 before age 12; otherwise min(0.50, 0.01 * 2 ^ ((ageYears - 12) / 3))`

with keyed daily randomness and no hard maximum age. Daily order remains:

`grazer action/starvation → day increment → old-age hazard → reproduction`

## Compact natural-fauna research

### Sprint021 / #118 — 24×24 candidate

Vegetation-rich top32/round-robin placement with keyed founder ages `[0,6y]`; ten founders pass the original 30-seed/120y 24×24 research gate. This remains research-only.

### Sprints022–024 — compact scalar rules rejected

Fixed10, simple area scaling, and counts `2/4/6/8/10` are not universal on 16×16. Failure modes split into initial encounter/establishment failure, later resource-demography recovery failure, and terminal sampling of living cycle troughs.

### Sprints025–028 — scalar persistence classifiers rejected

Long-horizon research rejects single terminal checkpoints, prolonged low population, and single birth-gap durations as universal compact persistence classifiers. Persistent and eventual-extinction birth-gap distributions overlap strongly.

Evidence:

- `docs/experiments/2026-08-24-grazer-cycle-aware-persistence.md`
- `docs/experiments/2026-08-24-grazer-recovery-envelope-unseen-validation.md`
- `docs/experiments/2026-08-24-grazer-zero-birth-stall-validation.md`
- `docs/experiments/2026-08-24-grazer-birth-stall-sensitivity.md`

### Sprint029 / #134 — encounter-safe placement looked promising in derivation

Seeds1–60 × founders2/4 × baseline/intervention, y300:

- founders2: extinctions 23→22, rescued1/harmed0, zero-birth extinctions6→5, initial zero-pair worlds13→0;
- founders4: extinctions13→11, rescued2/harmed0.

This produced genuine direct rescues with no paired harms and therefore advanced to frozen fresh validation only.

Evidence: `docs/experiments/2026-08-24-grazer-encounter-safe-placement.md`.

### Sprint030 / #136 — fresh validation rejects encounter-safe placement

Fresh seeds61–120 × founders2/4 × both arms, y300:

#### Two founders

- baseline extinctions: **33**;
- intervention extinctions: **35**;
- rescued: **1**;
- harmed: **3**;
- zero-birth extinctions: 16→14;
- initial zero-pair worlds: 23→0.

#### Four founders

- baseline extinctions: **17**;
- intervention extinctions: **17**;
- rescued: **3**;
- harmed: **3**.

Combined rescued=`4`, harmed=`6`, violating the pre-registered validation rule. The founders2 intervention also increases total extinction.

Harms are not explained by a systematic starvation collapse. Examples:

- seed68×4 baseline survives y300, while the more-connected intervention produces **0 births** and dies ~y26 with vegetation still ~76% at minimum;
- seed75×4 baseline survives y300, while intervention produces only 1 birth and dies ~y25 with abundant vegetation;
- seed77/79/120×2 baseline survive but intervention later goes extinct, all with zero starvation.

The intervention still creates real rescues, e.g. seed83×2, seed83×4, seed109×4 and seed120×4. Therefore encounter geometry is causally real but heterogeneous: optimizing initial graph connectivity can rescue some landscapes and harm others by changing exact local geometry/movement/condition trajectories.

**Decision: reject the Sprint029 encounter-safe placement candidate.** Do not tune radius3, top32 pool, greedy order, founder counts, ages or ecology inside this hypothesis. Do not promote to runtime/default fauna.

Evidence: `docs/experiments/2026-08-24-grazer-encounter-safe-placement-fresh-validation.md`.

## Human / settlement checkpoint

The post-social 100×200 baseline completes all 100 seeds; only seeds49/62/98 contain one naturally abandoned settlement each. Known abandonments are causally heterogeneous and generic settlement rescue remains rejected.

## Next decision gate

Do **not** continue optimizing initial connectivity as if it were a monotonic objective.

The next project decision should reconsider compact natural-fauna activation itself before inventing another placement heuristic. Current evidence supports a simpler product boundary:

- 24×24 natural-fauna initialization has a research candidate;
- 16×16 ecology is highly path-dependent and no tested scalar count/area/placement/persistence rule is robust;
- default worlds remain creature-free anyway.

A sensible next gate is to compare product policies such as `natural fauna opt-in only on validated world sizes` versus continuing compact auto-initializer research, using existing evidence rather than another immediate parameter/placement search.

## Project-management rule

Fresh validation outranks derivation wins. Do not tune a rejected candidate inside the same hypothesis. Preserve both rescues and harms, and keep runtime changes downstream of replicated evidence.
