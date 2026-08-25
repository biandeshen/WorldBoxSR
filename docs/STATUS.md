# Project status

Last updated: 2026-08-25

## Management state

**v0.5.0 — World Stories is shipped and closed.** Its release identity remains immutable:
- release commit `104dc7520b2e5ad39ec1d3c98c1cea94a11922b4`;
- annotated tag `v0.5.0` / tag object `4b741403979aee61ae51c49d02306d1acf6f74e1`;
- release workflow #9, CI #677, visual-qa #187 and Pages #40 all green.

The active product stage is **v0.6.0 — Living Ecology**. Release gate: #223. Finite backlog: `docs/backlog/v0.6.md`.

All five implementation capabilities now have deterministic + product-browser evidence:
- planning/scope freeze — #224 — merged;
- Supported natural-fauna preset — #225 / #226 — merged-main verified;
- Multi-species creature surface — #227 / #228 — merged-main verified;
- Authoritative Wolf predation — #229 / #230 — merged-main verified;
- Ecology readability — #231 / #232 — merged-main verified;
- Canonical Living Ecology gate — #233 / #235 — headless + real-browser implementation gate passed; documentation-synchronized final-head verification/merge is current work.

After #235 merges and merged-main delivery verifies, **v0.6 implementation is frozen**. The only permitted next work is release-only package/docs/tag/Release handoff `v0.6.0`. Do not add Wolf reproduction, natural Wolf founder policy, equilibrium controls, another species or another ecology mechanic.

## Supported Living Ecology authority

The deterministic engine remains the only world truth. Presentation explains current/recorded ecology but owns no movement, birth, death, hunting, resources or rescue.

Canonical v0.6 scope:
- 24×24 Living Ecology, while Sandbox remains compatibility-safe default;
- exactly 10 validated natural Grazer founders at day0 using the accepted vegetation-rich initializer and keyed `[0,6y]` ages;
- Grazer reproduction `0.001` + gradual old-age mortality; established Grazer movement/eating/starvation behavior unchanged;
- exactly one additional creature species: Wolf;
- fixed deterministic Wolf hunger/prey-seeking/predation/starvation behavior, with no reproduction/packs/natural-founder policy;
- no hidden rescue/reseed/population target and no equilibrium/coexistence promise.

## Shipped v0.6 capability evidence

### Natural fauna — #226

- Living Ecology founder initialization consumes zero sequential RNG and creates no `god.spawn_creature` founder history;
- seed45 browser Y40 reaches `116` living Grazers + `156` natural births with zero god founder spawns;
- Grazer inspection is read-only;
- #226 merged as `a653b606f8c11402f28ca92dae31822cff03ebd1`; merged-main CI/Pages/public `/play/`/Chromium verified.

### Grazer + Wolf creature surface — #228

- `spawn_creature` supports exactly `grazer | wolf`;
- shared species projection/selection/ref navigation is authoritative;
- Phaser renders distinct Grazer/Wolf silhouettes and Inspector identifies species/age/health/hunger/tile;
- hidden `spawn_wolf` remains QA/setup only, not a visible God Power;
- #228 merged as `9c2683391c004dfac964d2c06fddf2aaeeda193f`; merged-main delivery verified.

### Wolf predation — #230

Fixed candidate passed without tuning:
- hunger/day `0.01`, hungry threshold `0.35`, search radius `6`, feed `0.70`, starvation threshold `0.90`, starvation damage/day `0.025`, recovery/day `0.004`.

Authority contract:
- hungry Wolf chooses nearest living Grazer, moves at most one passable tile/day and kills at most one range-1 prey/day;
- hunt records `creature.predated` with prey Subject + Wolf Cause + predator/prey/hunger facts, followed by shared `creature.died(cause:'predation')`;
- no sequential RNG, pack/combat framework, Wolf reproduction or natural founder policy;
- exact save/load and duplicate determinism are covered.

Capability browser evidence: Wolf #167 `11,0 → 11,1`, predates Grazer #112 via Event #375 / death #376, hunger `35% → 0%`, no hidden spawn. #230 merged as `a0e7fd72cacbc415d1efaa592baa57f0d342072d`; merged-main delivery verified.

### Ecology readability — #232

- current Grazer/Wolf behavior is a pure hunger/config projection;
- current selected creature state reprojects on existing HUD cadence;
- Living Ecology adds compact `🌿 N%` matching authoritative vegetation utilization; no chart/heatmap/dashboard;
- predation projects to `Wolf #X hunted Grazer #Y`, appears in Recent, one restrained Pulse and the existing Causal Event Card;
- dead prey remains truthfully unavailable and living Wolf Cause remains current/map-navigable;
- manual review caught and blocked a real stale-inspector bug before merge;
- #232 merged as `45be47f923fab393cbb6b735c4e9514b490a93e1`; merged-main CI #726, Pages #46/public `/play/` and visual-qa #234 verified.

## Canonical Living Ecology release gate — implementation gate passed

Capability 5 adds no ecology/product mechanic. It freezes and proves a coherent release path already produced by the shipped authority.

### Natural pressure → recovery facts

A temporary yearly probe measured seed45 Living Ecology through Y120 and was removed before the permanent gate was written. The permanent release evidence freezes:

- **Y34:** `136` Grazers · vegetation `34.31%` · `150` natural births;
- **Y40 trough:** `116` Grazers · vegetation `17.50%` · `156` natural births;
- **Y50 recovery:** `68` Grazers · vegetation `37.44%` · `160` natural births.

Therefore:
- Y34→Y40 vegetation pressure is `-16.81` percentage points;
- Y40→Y50 recovery is `+19.94` points while living Grazers fall `116 → 68` through ordinary lifecycle;
- pre-Wolf deaths through Y50 are recorded old age; there is no hidden creature spawn/rescue/reseed;
- this is an observed pressure/recovery phase, not equilibrium and not a claim that Wolf caused the recovery.

### Permanent headless canonical gate

`tests/canonical_living_ecology_gate.test.js` no longer searches the trajectory or a Wolf position. It locks the measured facts and the one fixed Y50 Wolf setup:
- tile `(0,8)`, clear/passable, nearest Grazer distance `3`;
- canonical Wolf #171;
- first Wolf movement `(0,8) → (1,9)`;
- first canonical hunt predates Grazer #110.

The gate runs three complete paths — uninterrupted, duplicate, and Y40 snapshot→restore — and requires identical evidence plus byte-identical final authoritative snapshots. Existing story/Event Card/Pulse projectors must agree with the recorded hunt and remain snapshot/RNG neutral.

Final implementation head `0107824020455483543a7355f3f699db3c378d9a` passed CI #737. Canonical test output: `Y34 136/34.31% → Y40 116/17.50% → Y50 68/37.44%; Wolf #171 at 0,8 moved 0,8→1,9 and predated Grazer #110`. The three canonical paths add roughly five seconds to the deterministic suite and remain credible at supported scale.

### Permanent real-browser canonical gate

Full visual-qa #236 passed every prior v0.4/v0.5/v0.6 regression plus the release gate through production Vite/Phaser:
- real Mode/Reset lands paused at exact Y40 `116 Grazers / 17.50% vegetation`, HUD `🐾116 · 🌿18%`;
- ordinary `1 year` Time + Play reaches exact Y50 `68 Grazers / 37.44% vegetation`, HUD `🐾68 · 🌿37%`;
- one real map click at fixed `(0,8)` creates the sole explicit QA Wolf;
- ordinary `1 day` Time + Play reproduces Wolf #171 movement `(0,8) → (1,9)` and predation of Grazer #110;
- Pulse, Recent and Event Card explain `Wolf #171 hunted Grazer #110`;
- dead prey is unavailable, living Wolf Cause map-navigable, current Inspector reports the post-feed Wolf state;
- every paused Recent/Event Card/map/inspection action preserves exact serialized world authority.

Visual artifact #9569728516, digest `sha256:7116587e640e48f90ebda84b80bb0e8e862d048b53bb3194e9834ac1a4637d4c`.

Manual review of the three fixed 1440×900 canonical screenshots passes:
- Y40 is visibly denser and less vegetated;
- Y50 is visibly greener with fewer Grazers;
- post-predation view keeps the world map primary while Pulse/Recent/Event Card/current Wolf make the consequence understandable.

## Binding v0.6 decisions

- Supported scope beats universal scope: canonical release target is 24×24 Living Ecology.
- Existing validated Grazer behavior remains unchanged.
- Exactly one predator species: Wolf; no generalized species registry/food web/DSL.
- Wolf predation is authoritative engine behavior; renderer-owned hunting is forbidden.
- Extinction is allowed. No minimum population, equilibrium or hidden survival controller.
- No hidden creature rescue after initialization.
- Wolf reproduction and natural Wolf founder policy remain deferred and are not required for v0.6.
- Save/load and deterministic repeatability are release requirements.
- Ecology readability stays game-facing; no permanent analytics dashboard/heatmap.
- No disease, seasons/climate, genetics/evolution, plant-species simulation, economy/religion/technology or renewed civilization depth in v0.6.

## Current decision gate

1. require the documentation-synchronized final #235 head itself to pass normal CI + full Chromium again;
2. mark #235 ready, squash merge and close #233;
3. verify merged `main` CI, Pages build/deploy + final public `/play/`, and full Chromium including the canonical gate;
4. then freeze **all v0.6 implementation behavior**;
5. open exactly one release-only `v0.6.0` handoff branch/issue: package `0.5.0 → 0.6.0`, release notes/demo QA, README/ROADMAP/STATUS/backlog shipped-state sync;
6. verify tag `v0.6.0`, GitHub Release, release-commit CI, full Chromium, Pages and public `/play/`;
7. close #223 before any v0.7 planning.
