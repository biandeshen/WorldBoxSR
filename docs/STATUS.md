# Project status

Last updated: 2026-08-25

## Management state

**v0.5.0 — World Stories is shipped and closed.** Its release identity remains immutable:
- release commit `104dc7520b2e5ad39ec1d3c98c1cea94a11922b4`;
- annotated tag `v0.5.0` / tag object `4b741403979aee61ae51c49d02306d1acf6f74e1`;
- release workflow #9, CI #677, visual-qa #187 and Pages #40 all green.

**v0.6.0 — Living Ecology has completed implementation and merged-main delivery verification.** Release gate: #223. Release-only handoff: #237 / PR #238.

Implementation freeze commit: `ac94bd0bfa59790f959c02c261c3506c378fb26d`.
After that commit merged:
- CI #740 passed;
- Pages #47 build/deploy + final public `/play/` verification passed;
- full visual-qa #239 passed every prior v0.4/v0.5 regression plus all v0.6 component/canonical gates.

From this point until publication closes, **no v0.6 feature/behavior work is allowed**. The active queue is package/docs/tag/Release verification only. No Wolf reproduction, natural Wolf founder policy, equilibrium controller, additional species, new ecology mechanic or v0.7 feature work may enter.

## Frozen v0.6 product scope

The deterministic engine remains the only ecology truth. Presentation explains current/recorded facts but owns no movement, birth, death, hunting, resources or rescue.

Supported scope:
- explicit 24×24 Living Ecology preset while Sandbox remains compatibility-safe default;
- exactly 10 deterministic natural Grazer founders at day0, no fake god founder history and no later rescue/reseed/population target;
- Grazer reproduction `0.001` + gradual old-age mortality with existing movement/eating/starvation behavior unchanged;
- exactly two shipped creature identities: Grazer + Wolf;
- deterministic Wolf hunger/prey search/one-step chase/predation/feeding/starvation with no sequential RNG, reproduction/packs/natural-founder policy;
- compact current creature behavior, `🌿 N%`, predation Pulse/Recent/Event Card and current map/Inspector readability;
- coherent extinction remains acceptable; no equilibrium/coexistence guarantee.

## Capability delivery record

1. Supported natural-fauna preset — #225/#226 — merged-main verified.
2. Multi-species Grazer + Wolf surface — #227/#228 — merged-main verified.
3. Authoritative Wolf predation — #229/#230 — merged-main verified.
4. Ecology readability — #231/#232 — merged-main verified.
5. Canonical Living Ecology release gate — #233/#235 — merged-main verified.

The final implementation PR #235 merged as `ac94bd0bfa59790f959c02c261c3506c378fb26d` and closed #233.

## Canonical release evidence

### Natural pressure → recovery

The permanent seed45/24×24 gate freezes:
- **Y34:** `136` living Grazers · vegetation `34.31%` · `150` natural births;
- **Y40 trough:** `116` · `17.50%` · `156`;
- **Y50 recovery:** `68` · `37.44%` · `160`.

Observed facts:
- Y34→Y40 vegetation pressure: `-16.81` percentage points;
- Y40→Y50 recovery: `+19.94` points while living Grazers fall `116 → 68` through ordinary lifecycle;
- pre-Wolf deaths through Y50 are recorded old age;
- zero hidden creature spawn/rescue/reseed occurs before explicit Wolf QA setup.

This is an observed phase, not an equilibrium/carrying-capacity claim and not a claim that Wolf caused the earlier recovery.

### Canonical Wolf continuation

The permanent gate uses fixed Y50 setup tile `(0,8)`:
- canonical Wolf #171;
- nearest living Grazer distance `3`;
- first movement `(0,8) → (1,9)`;
- first prey Grazer #110;
- exactly one explicit QA Wolf spawn and no further god creature spawn.

### Repeatability / save-load

`tests/canonical_living_ecology_gate.test.js` runs uninterrupted, duplicate and Y40 snapshot→restore paths. All three must report identical facts and finish with byte-identical authoritative snapshots. Existing ecology Story/Event Card/Pulse projections must remain snapshot/RNG neutral.

### Browser release path

Production Chromium reproduces the same release story through product controls:
- real Living Ecology Mode/Reset → exact paused Y40 `🐾116 · 🌿18%`;
- ordinary `1 year` Time + Play → exact Y50 `🐾68 · 🌿37%`;
- real map click at `(0,8)` → sole explicit QA Wolf;
- ordinary `1 day` Time + Play → Wolf #171 movement and predation of Grazer #110;
- Pulse + Recent + Event Card explain `Wolf #171 hunted Grazer #110`;
- dead prey stays unavailable, living Wolf Cause remains map-navigable and current Wolf Inspector shows post-feed authority;
- paused read-only Chronicle/Event Card/map/inspection keeps the serialized world unchanged.

Final implementation visual evidence was accepted in PR and merged-main visual-qa #239 revalidated the complete chain.

## Release-only handoff #237 / PR #238

Allowed changes only:
- package version `0.5.0 → 0.6.0`;
- `docs/releases/v0.6.0.md`;
- `docs/demos/v0.6.0.md`;
- README/ROADMAP/STATUS/backlog release-state synchronization.

Existing `.github/workflows/release.yml` is intentionally unchanged. On the final release PR merge, the package version change must trigger the existing workflow to:
1. create annotated tag `v0.6.0` if absent;
2. create GitHub Release `WorldBoxSR v0.6.0` from `docs/releases/v0.6.0.md`.

## Current decision gate

1. final #238 release-doc head must pass normal CI + full Chromium;
2. audit #238 changed files: no behavior-bearing engine/client/content/ecology-gate diff;
3. merge #238 only after those gates pass;
4. verify release workflow/tag/GitHub Release;
5. verify release merge CI, full Chromium, Pages build/deploy + final public `/play/`;
6. perform one small publication-verified status closeout if repository docs still say candidate/pending;
7. close #223 and #237;
8. only then allow finite v0.7 planning.
