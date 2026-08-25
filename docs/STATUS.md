# Project status

Last updated: 2026-08-25

## Management state

**v0.5.0 — World Stories is shipped and closed.** Release identity remains immutable:
- release commit `104dc7520b2e5ad39ec1d3c98c1cea94a11922b4`;
- annotated tag `v0.5.0` / tag object `4b741403979aee61ae51c49d02306d1acf6f74e1`;
- release workflow #9, CI #677, visual-qa #187 and Pages #40 all green.

The active product stage is **v0.6.0 — Living Ecology**. Release gate: #223. Finite backlog: `docs/backlog/v0.6.md`.

Completed/active v0.6 slices:
- planning/scope freeze — #224 — merged;
- Supported natural-fauna preset — #225 / #226 — merged and merged-main CI/Pages/Chromium/public `/play/` verified;
- Multi-species creature surface — #227 / #228 — merged as `9c2683391c004dfac964d2c06fddf2aaeeda193f`; merged-main CI #703 + Pages #44 green;
- Authoritative Wolf predation loop — #229 / #230 — deterministic + supported seed45 + full Chromium implementation gates passed; documentation-synchronized final head verification/merge is current work;
- only after #230 merged-main green: **Ecology readability pass**.

Do not open natural Wolf seeding, Wolf reproduction, equilibrium research or readability breadth in parallel with #230.

## Current authoritative capability

The deterministic engine remains the only world truth: seeded/serializable RNG, fixed ticks, terrain/resources, humans/lifecycle/ancestry, settlements/polities/rulers/relations/warbands/conquest/rebellion, bounded causal history, typed creature state, save/load, CLI/Simulation Lab and browser presentation.

World Stories remains a shipped query/presentation layer over bounded `world.history`; focus/Watchlist/lenses never enter world snapshots.

### Living Ecology natural-fauna base

Phaser exposes `Sandbox · Living Ecology`:
- Sandbox stays default: reproduction off, gradual grazer old-age off, historical 40y + 8 manual showcase grazers preserved;
- Living Ecology is supported at 24×24 and initializes exactly 10 natural grazer founders at day0 using the accepted Sprint021 top32 vegetation placement, round-robin founder placement, keyed `[0,6y]` starting ages, salt `0x1b56c4e9`, and `bornDay=-ageDays`;
- Living Ecology enables grazer reproduction `0.001` + gradual old-age mortality only;
- no post-initialization rescue/reseed/population target exists;
- founder initialization consumes zero sequential RNG and creates no fake god-spawn founder history;
- Legacy Canvas remains Sandbox-only comparison/compatibility UI.

Capability-1 merged evidence:
- real browser reaches Y40 with 116 living grazers + 156 natural births + 0 god founder spawns;
- real Alt-click Grazer inspection is read-only;
- #226 merged as `a653b606f8c11402f28ca92dae31822cff03ebd1`;
- merged-main CI #692, Pages #43 including public Play verification, and visual-qa #200 are green.

## Multi-species creature surface — merged

Capability 2 established exactly two supported creature identities before predator behavior:
- authoritative `species:'wolf'` uses the existing shared creature id/x/y/age/health/hunger/lifecycle shape;
- `spawn_creature` accepts exactly `grazer | wolf`; unsupported species reject before identity allocation;
- `worldView.creatures` preserves species/current inspectable state; temporary legacy `grazers` projection remains for Canvas compatibility;
- Phaser renders the existing orange/brown Grazer and one distinct gray Wolf silhouette;
- shared selection/highlight + species-aware inspector work for both;
- HUD adds compact `🐺 N` only when wolves exist;
- hidden `spawn_wolf` select option is QA/setup only — no new visible God Power button;
- creature history/reference resolution reuses `entityKind:'creature'`; no second Wolf-specific reference kind exists.

Capability-2 evidence:
- PR #228 merged as `9c2683391c004dfac964d2c06fddf2aaeeda193f` and closed #227;
- implementation CI #700 + full Chromium #208 green; manual 1440×900 review passed;
- browser mixed-species setup used Living Ecology 116 grazers + explicit Wolf #167, then real Grazer/Wolf inspections while paused authority remained unchanged;
- artifact #9563759645, digest `sha256:acbae9a36f42f4c944d6e1617964a977853573d4d27471091792b71a0fdf054a`;
- merged-main CI #703 and Pages #44 are green.

## Authoritative Wolf predation loop — implementation gate passed

Capability 3 is deliberately a **simulation authority slice**, not the final ecology storytelling pass.

### Fixed Wolf behavior candidate

The exact candidate below passed without tuning:
- hunger/day `0.01`;
- hungry threshold `0.35`;
- prey search radius `6` Chebyshev cells;
- feed amount `0.70`;
- starvation threshold `0.90`;
- starvation damage/day `0.025`;
- recovery/day `0.004`.

Daily authoritative behavior:
- living Wolf increments age + hunger;
- below hungry threshold: no hunt/wander;
- when hungry: choose the nearest living Grazer inside radius 6, then lowest creature ID;
- if prey is farther than range1, move at most one passable 8-neighbor step that strictly reduces distance; deterministic ties use distance → Manhattan → y → x and consume no sequential RNG;
- if selected prey is within range1 after movement, one Wolf may kill exactly one Grazer that day;
- successful feeding lowers Wolf hunger and increments shared creature meals;
- no-prey starvation reuses shared creature-death bookkeeping;
- no Wolf reproduction or old-age mortality in this slice.

Tick order is now:
`environment regrowth → grazers act → wolves act/hunt → humans act → day++ → grazer old-age/reproduction → civilization systems`.

### Predation truth contract

A successful hunt records:
1. `creature.predated` with the **prey as Subject**, living Wolf entity reference as an explicit Cause, predator/prey IDs + species, hunt tile and hunger-before/after feeding;
2. shared `creature.died` for the prey with `cause:'predation'` and the predation event as its explicit Cause;
3. current prey removal only after shared lifecycle bookkeeping.

No renderer-side kill, attack probability, damage framework, pack state, inferred motive or hidden prey spawn exists.

### Deterministic evidence

Tests cover:
- deterministic adjacent target / max one prey per Wolf/day;
- one-step prey-seeking movement;
- non-hungry no-hunt;
- prey outside radius ignored;
- impassable geometry cannot be crossed;
- starvation through shared lifecycle;
- explicit predation/death reference chain and creature-history membership;
- duplicate byte identity and no sequential RNG consumption from Wolf behavior;
- exact save→load continuation through an active hungry Wolf;
- a supported seed45/Y40 Living Ecology gate using exactly one explicit QA Wolf, with real movement and predation before starvation and no hidden god creature spawn after setup.

CI #704 first proved the base behavior; the supported seed45 gate then passed in CI #705; the final browser-wired implementation head `5b13254a391d8d35f2e022de5b84f9f29a049e87` passes CI #708.

### Real Chromium predation evidence

Full visual-qa #216 passed every prior v0.4/v0.5/v0.6 regression plus the new predation gate.

On a fresh production-build Living Ecology world:
- browser baseline at ~Y40.17: 116 living Grazers, 0 Wolves, 0 god creature spawns;
- one explicit QA Wolf #167 is spawned at `11,0`, nearest Grazer distance 2; this is the only god creature spawn;
- ordinary UI Time is set to `1 day` and the browser real-clicks Play;
- first observed authoritative Wolf movement: `11,0 → 11,1`;
- Wolf #167 records `creature.predated` Event #375 against Grazer #112 at hunt tile `11,2`;
- matching `creature.died(cause:'predation')` Event #376 follows;
- Grazer #112 is absent from current authority;
- Wolf feeding hunger: `0.35 → 0.00`;
- post-kill current world: 115 Grazers + 1 Wolf; no additional god creature spawn;
- browser pauses, real Alt-clicks Wolf #167 and reads `age 0.1y · health 100% · hunger 0% · tile 11,1`;
- inspection + screenshot preserve frozen paused fingerprint `88374f2e`.

Visual artifact: #9565714587, digest `sha256:f3ac1a2c00f36bd493dc10052aa77a3203cfc29635625b40e1c3cb513b4c0cb0`.

Manual 1440×900 review passes capability 3: map remains primary, Wolf/current ecology state is readable and the UI does **not** falsely imply that predation narration/readability is complete. The missing player-facing predation explanation is intentionally the next slice.

## Binding v0.6 product decisions

- Supported scope beats universal scope: 24×24 Living Ecology is the canonical release target.
- Grazer behavior remains unchanged from validated natural-fauna work.
- Exactly one predator species: Wolf. No generalized species registry/food-web/DSL.
- Wolf predation is authoritative engine behavior; renderer-owned hunting is forbidden.
- Extinction is allowed. No minimum population/equilibrium/hidden survival controller.
- No hidden prey spawning/rescue after initialization.
- **Wolf reproduction is not needed to satisfy capability 3 and stays deferred.** Natural Wolf founder policy is also still undecided and not implied by the explicit QA setup.
- Save/load and deterministic repeatability remain release requirements.
- Capability 4 owns player-facing predation/vegetation readability; no permanent metrics dashboard/heatmap.
- No disease, seasons/climate, genetics/evolution, plant-species simulation, economy/religion/technology or renewed civilization depth in v0.6.
- At most three consecutive rejected ecology hypotheses may block the visible gate; then narrow scope instead of extending research.

## Current decision gate

1. require the documentation-synchronized final #230 head to pass normal CI + full Chromium again;
2. mark #230 ready, squash merge and close #229;
3. verify merged `main` CI, Pages build/deploy + final public `/play/`, and full Chromium including natural-fauna + mixed-species + predation gates;
4. only then open exactly one capability-4 issue/branch for **Ecology readability pass**;
5. capability 4 should make the already-authoritative predation consequence understandable with the smallest game-facing event/current-behavior/resource-pressure cues; it must not add new ecology mechanics;
6. after readability is merged-main green, build one canonical Living Ecology gate that stitches natural fauna → predation → vegetation pressure/recovery → understandable history in one supported session;
7. no Wolf reproduction/natural-founder/equilibrium work enters the queue unless the canonical gate produces concrete evidence that the bounded release promise cannot be met without it.
