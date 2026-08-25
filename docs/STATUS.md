# Project status

Last updated: 2026-08-25

## Management state

**v0.5.0 — World Stories is shipped and closed.** Its release identity is immutable:
- release commit `104dc7520b2e5ad39ec1d3c98c1cea94a11922b4`;
- annotated tag `v0.5.0` / tag object `4b741403979aee61ae51c49d02306d1acf6f74e1`;
- release workflow #9, CI #677, visual-qa #187 and Pages #40 all green.

The active product stage is **v0.6.0 — Living Ecology**. Release gate: #223. Finite backlog: `docs/backlog/v0.6.md`.

v0.6 is intentionally a supported **24×24** ecology scenario rather than a universal ecosystem simulator. The finite implementation order is:
- planning/scope freeze — #224 — merged;
- Supported natural-fauna preset — #225 / #226 — merged-main verified;
- Multi-species creature surface — #227 / #228 — merged-main verified;
- Authoritative Wolf predation loop — #229 / #230 — merged as `a0e7fd72cacbc415d1efaa592baa57f0d342072d`, merged-main delivery verified;
- Ecology readability pass — #231 / #232 — implementation, deterministic tests, full Chromium and manual screenshot gate complete on branch; documentation-synchronized final head/merge is current work;
- next after #232 merged-main verification: **Canonical Living Ecology gate only**.

Do not open Wolf reproduction, natural Wolf founder policy, equilibrium research, new species or additional ecology mechanics in parallel with the canonical gate.

## Authoritative ecology capability

The deterministic engine remains the only world truth. Presentation may query/project ecology but may not own movement, hunting, births, deaths, resources or population rescue.

### Supported Living Ecology base

Phaser exposes `Sandbox · Living Ecology`:
- Sandbox stays the default compatibility mode: grazer reproduction off, gradual grazer old-age mortality off, historical 40y + 8 manual showcase grazers preserved;
- Living Ecology is fixed to 24×24 for v0.6 and initializes exactly 10 natural grazer founders at day0;
- founder placement is the accepted Sprint021 top32 vegetation-rich passable-cell ranking with deterministic round-robin assignment;
- founder ages use keyed `[0,6y]` values with salt `0x1b56c4e9` and `bornDay=-ageDays`;
- Living Ecology enables only grazer reproduction `0.001` + gradual old-age mortality; existing grazer movement/eating/starvation formulas are unchanged;
- founders consume zero sequential RNG, produce no fake god-spawn history, and there is no later rescue/reseed/population target;
- Legacy Canvas remains Sandbox-only comparison/compatibility UI.

Capability-1 browser evidence: seed45 reaches Y40 with `116` living Grazers, `156` natural births and `0` god founder spawns; Grazer inspection remains read-only. #226 merged as `a653b606f8c11402f28ca92dae31822cff03ebd1`; merged-main CI #692, Pages #43/public Play and visual-qa #200 are green.

### Grazer + Wolf shared creature surface

Capability 2 added exactly two shipped creature identities without a generalized species framework:
- authoritative `species:'wolf'` reuses shared id/x/y/age/health/hunger/lifecycle state;
- `spawn_creature` accepts exactly `grazer | wolf`; invalid species reject before identity allocation;
- `worldView.creatures` preserves species/current inspectable state while a grazer-only compatibility projection remains for legacy Canvas;
- Phaser renders the existing orange/brown Grazer and one distinct gray Wolf silhouette;
- shared selection/highlight, species-aware inspector and current `entityKind:'creature'` reference navigation work for both;
- HUD adds compact `🐺 N` only when wolves exist;
- hidden `spawn_wolf` is QA/setup only and adds no visible God Power.

#228 merged as `9c2683391c004dfac964d2c06fddf2aaeeda193f`; implementation/full-Chromium/manual visual review and merged-main CI/Pages are green.

## Authoritative Wolf predation — merged

Capability 3 owns the first Wolf behavior and no more.

Fixed candidate values passed without tuning:
- hunger/day `0.01`;
- hungry threshold `0.35`;
- prey search radius `6` Chebyshev cells;
- feed amount `0.70`;
- starvation threshold `0.90`;
- starvation damage/day `0.025`;
- recovery/day `0.004`.

Daily authority:
- living Wolf increments age + hunger;
- below hungry threshold it does not hunt or wander;
- when hungry it selects nearest living Grazer inside radius 6, then lowest creature ID;
- it moves at most one passable 8-neighbor step/day that strictly reduces prey distance, with deterministic tie-breaking and no sequential RNG;
- within range1 it kills at most one Grazer/day through shared `killCreature` bookkeeping and feeds;
- no-prey starvation uses shared creature lifecycle;
- no Wolf reproduction, old-age mortality, pack state or natural Wolf founder policy exists.

Predation truth is explicit:
1. `creature.predated` uses the prey as Subject and the living Wolf entity ref as Cause, recording predator/prey IDs + species, hunt tile and hunger before→after feeding;
2. matching `creature.died(cause:'predation')` is caused by the predation event;
3. the prey is removed only after shared lifecycle bookkeeping.

Canonical capability-3 browser evidence used one explicit QA Wolf #167 at `11,0`; ordinary `1 day` Time advanced it to `11,1`, then authority recorded predation Event #375 against Grazer #112 at `11,2` plus death Event #376. Hunger changed `35% → 0%`, living Grazers became `115`, and no hidden creature spawn occurred. Post-kill paused fingerprint was `88374f2e`. Artifact #9565714587 digest `sha256:f3ac1a2c00f36bd493dc10052aa77a3203cfc29635625b40e1c3cb513b4c0cb0`.

#230 merged as `a0e7fd72cacbc415d1efaa592baa57f0d342072d`; merged-main CI #711, Pages #45/public `/play/` and full Chromium delivery verification passed before capability 4 opened.

## Ecology readability — implementation gate passed

Capability 4 changes **presentation/query only**. Engine systems/config remain untouched.

Readable ecology surfaces:
- retained `creature.predated` projects exactly to `Wolf #X hunted Grazer #Y` plus recorded hunt tile and hunger before→after;
- Recent Chronicle can show predation; Conflict/Rule stay exact; v0.5 Highlights delegates unchanged to its existing representative policy;
- Causal Event Card uses the same recorded facts, keeps the removed prey Subject truthfully unavailable, and keeps the living Wolf Cause resolved + map-navigable;
- one restrained high-priority World Event Pulse reports successful predation; ordinary creature movement/birth/hunger does not spam Pulse;
- selected Grazer/Wolf behavior is a pure projection of current hunger/config (`fed/foraging` and `resting/seeking grazers/starving`);
- the selected creature inspector now reprojects the **entire current authority state** — behavior, age, health, hunger and tile — on the existing HUD refresh cadence; if that selected creature disappears it becomes `not currently present` instead of displaying stale values;
- Living Ecology alone adds one compact `🌿 N%` value exactly matching authoritative `vegetationUtilization`; no chart/heatmap/dashboard was added.

Browser evidence on current implementation head `0053be3f53f93890bcc725e329384e89ce6fcd87`:
- CI #722 green;
- full visual-qa #230 attempt 2 green; attempt 1 stopped earlier on the known one-shot Watchlist reload DOM-timing flake after both bookmarks had already rehydrated, and the rerun completed the complete v0.4/v0.5/v0.6 chain without a product change;
- readability gate uses the real Living Ecology + explicit Wolf #167 path and records predation #375 / death #376 / Grazer #112;
- vegetation HUD follows authority `🌿18% → 🌿17%`;
- Pulse and Recent say `Wolf #167 hunted Grazer #112`;
- Event Card says `Predation at 11,2 · hunger 35% → 0%`, shows the prey unavailable and Wolf Cause map navigation;
- read-only Chronicle/Event Card/map navigation preserves frozen authority fingerprint `88374f2e`;
- latest artifact #9568116404, digest `sha256:a795ad14ad8835003da5085203684a5987e673ec5c5cb47cd15c8e5381198af2`.

Manual 1440×900 review caught and blocked one real issue in an earlier green screenshot: the selected Wolf inspector remained at pre-hunt `hunger 10% · tile 11,0`. The branch was not accepted until this was fixed. The latest screenshot now automatically shows current post-hunt authority: `Wolf #167 · behavior resting · age 0.1y · health 100% · hunger 0% · tile 11,1`. Pulse, `🌿17%`, Recent and Event Card remain compact; the world map is still the primary surface and there is no duplicate predation spam.

## Binding v0.6 decisions

- Supported scope beats universal scope: canonical release target is 24×24 Living Ecology.
- Existing validated Grazer behavior remains unchanged.
- Exactly one predator species: Wolf; no generalized species registry/food-web/DSL.
- Wolf predation is authoritative engine behavior; renderer-owned hunting is forbidden.
- Extinction is allowed. No minimum population, equilibrium or hidden survival controller.
- No hidden prey/grazer rescue after initialization.
- Wolf reproduction and natural Wolf founder policy remain deferred because capabilities 1–4 did not require them.
- Save/load and deterministic repeatability are release requirements.
- Ecology readability stays game-facing; no permanent analytics dashboard/heatmap.
- No disease, seasons/climate, genetics/evolution, plant-species simulation, economy/religion/technology or renewed civilization depth in v0.6.
- At most three consecutive rejected ecology hypotheses may block a visible gate; then narrow scope instead of extending research.

## Current decision gate

1. require documentation-synchronized final #232 head to pass normal CI + full Chromium;
2. mark #232 ready, squash merge and close #231;
3. verify merged `main` CI, Pages build/deploy + final public `/play/`, and full Chromium including readability;
4. open exactly one capability-5 issue/branch for the **Canonical Living Ecology gate**;
5. in one supported deterministic 24×24 path prove natural grazer initialization/birth, material vegetation pressure **and later recovery**, explicit Wolf predation, readable consequence, exact repeatability, save→load continuation and credible performance;
6. use actual UI in the canonical Chromium gate and prove no renderer-owned ecology state;
7. do not add Wolf reproduction/natural founder policy/equilibrium controls unless the canonical gate produces concrete evidence that the frozen release promise cannot otherwise be met;
8. only after capability 5 merges and merged-main delivery verifies may release-only `v0.6.0` packaging/tag/Pages work begin.
