# Project status

Last updated: 2026-08-24

## Management state

The project is now in **v0.1.0 release hardening — A Living World**.

The release boundary is frozen. Universal natural-fauna initialization, compact-map ecology research, kingdoms, additional god powers, and final visual polish are **not v0.1 blockers**. See `docs/ROADMAP.md` and `docs/backlog/v0.1.md`.

From this point forward, a non-correctness research topic receives at most three consecutive rejected hypotheses inside one version before it is preserved and deferred. Interesting follow-up work no longer keeps a release open indefinitely.

## Current authoritative capability

`main` contains a deterministic living-world simulation with:

- seeded/serializable RNG and fixed ticks;
- procedural terrain, renewable food and vegetation;
- human hunger, movement, eating, aging, reproduction, death and ancestry;
- settlements, abandonment, territory and causal history;
- typed grazer ecology with grazing/starvation;
- default-off authoritative grazer reproduction;
- default-off gradual grazer old-age mortality;
- deterministic save/load continuation;
- headless CLI, Simulation Lab, long-run regressions and performance baselines;
- lightweight client rendering, inspectors, timeline/history and minimal god tools.

Default worlds still contain zero creatures. Grazer reproduction remains default `0`; partner discovery radius is 3 while each parent's vegetation eligibility remains radius1 / threshold0.50. Grazer old-age mortality remains behind `grazerOldAgeMortalityEnabled: true`, default `false`; snapshot schema remains v11-compatible.

## Binding decisions

- Lineage is ancestry, not household; `parental_union` is historical shared-birth evidence, not spouse state.
- Broad settlement food storage and generic settlement rescue remain rejected; rare coherent natural extinction is valid history.
- Carrying capacity is evidence, never a runtime population controller.
- Hard grazer lifespan bands and founder-age tuning remain rejected.
- Total area/passable land and scalar founder count are not universal compact initializer rules.
- Terminal-year gates, low-population duration and single-duration birth-gap classifiers are rejected as universal compact persistence rules.
- Initial founder encounter connectivity is causal in some worlds but not a monotonic placement objective.
- Fresh validation outranks derivation wins.

## Natural-fauna research checkpoint

### 24×24

Sprint021 produced a deterministic vegetation-rich top32/round-robin 10-founder research candidate with keyed founder ages `[0,6y]`. It passed its original 30-seed/120y research gate. It remains research-only.

### Compact 16×16

Sprints022–028 established that fixed founder counts, simple area scaling, terminal checkpoints, low-population duration and single birth-gap durations are not universal solutions. Compact ecology is strongly path-dependent.

Sprint029 then tested a narrow encounter-safe placement and found a derivation win on seeds1–60: three paired rescues, zero harms, and all initial zero-pair states removed.

Sprint030 / #136 fresh validation on seeds61–120 **rejected the same frozen candidate**:

- founders2 baseline/intervention extinctions: **33 → 35**; rescues1 / harms3;
- founders4 extinctions: **17 → 17**; rescues3 / harms3;
- combined rescues4 < harms6.

The intervention still creates genuine rescues, proving encounter geometry matters, but it also creates fresh harms without a systematic starvation explanation. Therefore the candidate is not eligible for runtime promotion.

Evidence: `docs/experiments/2026-08-24-grazer-encounter-safe-placement-fresh-validation.md`.

## v0.1 product boundary

v0.1 does **not** need to solve automatic natural fauna on every world size. The first release may keep fauna explicit-spawn/research-config only.

That is deliberate scope control, not abandonment of ecology. Natural-fauna activation, support-size policy and a supported initializer move to **v0.2 — Living Ecology**.

## Human / settlement checkpoint

The post-social 100×200 baseline completes all 100 seeds; only seeds49/62/98 contain one naturally abandoned settlement each. Known abandonments are causally heterogeneous and generic settlement rescue remains rejected.

## Next decision gate

Close the finite **v0.1 release checklist**:

1. release-candidate full tests + smoke;
2. deterministic save/load and long-run regression verification;
3. one documented reproducible demo path;
4. README/status/release-note sync;
5. bump/tag `v0.1.0`.

No additional ecology hypothesis is allowed to become a v0.1 blocker unless it exposes a correctness, determinism or data-integrity failure.

After the v0.1 tag, begin v0.2 with the product-policy question: which world sizes/presets are explicitly supported for opt-in natural fauna?

## Project-management rule

Ship coherent slices. Preserve negative evidence, but do not confuse “there is more to learn” with “the current version cannot ship.”