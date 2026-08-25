# Project status

Last updated: 2026-08-26

## Management state

**v0.6.0 — Living Ecology is shipped and closed.** Immutable release identity:
- implementation freeze `ac94bd0bfa59790f959c02c261c3506c378fb26d`;
- release commit `2fa4ce8d131f55d84c59f4bdfbae088cd222486f`;
- annotated tag `v0.6.0` / tag object `ae558bb91912e383d153317ae0fdb0a77e8c10eb`, targeting exactly the release commit;
- GitHub Release published from checked-in release notes;
- release workflow #10, release-commit CI #748, Pages #50/public `/play/`, full visual-qa #247 green;
- post-release closeout #239 merged as `bd746e08ae7d2d26e4063c6b53f8a509e999f1da`; closeout CI #750, Pages #51/public `/play/`, visual-qa #248 green;
- release gate #223 and handoff #237 are closed.

**v0.7.0 — Scenario Builder & Sharing is the active implementation stage.** Release gate: #240. Finite backlog: `docs/backlog/v0.7.md`.

Planning #241 merged as `303e31d5b71285797cc4611e41b5c663683941b4`.

Delivered slices:
- Capability 1 — **Scenario Recipe v1 core** — #242/#243 merged as `910a98445428cd361025b028387be065d70034f1`; merged-main CI #756, Pages #53/public `/play/`, visual-qa #253 green.
- Capability 2 — **Scenario Setup workspace** — #244/#245 merged as `8efcb523148a4728d422de7abaeff8527caea5df`; merged-main CI #773, Pages #54/public `/play/`, visual-qa #270 green.

Capability 3 — **Portable recipe: Copy Link + canonical JSON Export/Import** — #246/#247 has completed deterministic, full Chromium and manual branch gates on implementation head `5d7b2402602532382456c68be2224e685114cba2`. After this documentation-synchronized final head passes its own CI + full visual-qa, merge #247 and verify merged-main delivery. Only then may capability 4 — **Replay + Fork** — start.

## v0.7 player promise

A player can assemble a small world setup, serialize it as a compact deterministic **Scenario Recipe**, share/import it, reopen the same authoritative starting world, then Run, Replay or Fork a different history.

v0.7 is not a full terrain editor. It productizes deterministic setup/share/replay first.

## Capability 1 — Scenario Recipe v1 core — delivered

`client/presentation/scenario_recipe.js` is the single framework-independent recipe contract for Setup/share/Replay/Fork surfaces.

- exact `worldboxsr-scenario` version 1 schema;
- trimmed non-empty name, max 64 code units;
- base = production-normalized seed + exactly `sandbox | living_ecology`;
- fixed current 24×24 / 40-year showcase-ready semantics;
- ordered setup capped at 32 actions, exactly Human/Grazer/Wolf placement, max 10 entities/action;
- canonical stable JSON independent of input key order while preserving setup order;
- whole-recipe passability preflight before the first setup command;
- materialization reuses existing `createShowcaseWorld` → `evolveShowcaseWorld` → authoritative `applyCommand`;
- empty Sandbox/Living Ecology recipes byte-equal existing direct ready worlds;
- duplicate complete materializations are byte-identical;
- recipe name/codec is world/RNG neutral and has no DOM/storage/URL/Phaser dependency.

## Capability 2 — Scenario Setup workspace — delivered

### Product surface
- visible compact `＋ Scenario` topbar entry in Phaser only;
- entering Setup rematerializes the current Seed/Mode empty Recipe v1 ready base and pauses it;
- Seed, Mode, World reset, Play/Pause and Time controls are locked while Setup owns the map;
- ordinary God Power dock + event pulse are hidden during Setup; keyboard power shortcuts are guarded;
- left Setup card contains name, `N/32 actions`, exactly Human/Grazer/Wolf, bounded recent-action summary, Clear Setup and Run Scenario;
- Legacy hides Scenario Setup and remains comparison-only.

### Authority boundaries
- existing Phaser `pointerup → pointerTile → scene.useTool` remains the only map-input path;
- successful setup click applies one existing authoritative command, then appends the normalized recipe draft only after success;
- failed impassable click changes neither recipe, world fingerprint nor command/event/entity identity;
- rename changes recipe metadata only;
- Clear rematerializes base + zero actions rather than reverse/deleting world arrays;
- same ordered setup after Clear reproduces the exact same starting world;
- Run deep-freezes the normalized recipe, exits Setup and restores ordinary controls without changing current start authority;
- later ordinary gameplay changes world authority normally but cannot rewrite the frozen recipe.

### Browser evidence
Seed45 Sandbox fixed setup:
- Human `(12,8)`;
- Grazer `(16,12)`;
- Wolf `(14,7)`;
- rejected impassable tile `(18,12)`.

Evidence fingerprints:
- ordinary paused Y40 base `938b50ec`;
- three-action setup `7f07ed67`;
- Clear restores `938b50ec` + identity counters;
- exact rebuild returns `7f07ed67`;
- Run leaves `7f07ed67` unchanged and freezes Recipe v1;
- one ordinary product day changes authority to `bcc9eaf2` while the frozen recipe remains byte-unchanged.

## Capability 3 — Portable Scenario Recipe evidence

### Transport contract
- canonical identity is the existing `serializeScenarioRecipe` output only;
- canonical Recipe UTF-8 is capped at 8192 bytes and encoded as unpadded base64url under exactly `scenario=`;
- malformed base64url, invalid UTF-8, invalid JSON, unknown Recipe fields/version/preset/action and oversize payloads fail explicitly;
- `scenario=` stays independent from `renderer=` and unrelated query state;
- canonical player Copy Link targets Phaser; Legacy reports that Scenario links require Phaser rather than pretending to load them;
- transport owns no snapshot/history/RNG/storage state.

### Product surface
- compact `Recipe` panel exposes Copy Link, Export JSON, a Recipe JSON field and explicit Import JSON;
- clipboard failure leaves the same generated share URL visible for manual copy;
- Export downloads the exact canonical Recipe JSON and shows it in the panel;
- fresh shared URL bypasses ordinary startup and materializes the Recipe through the existing Recipe materializer;
- shared/imported starts are paused with visible `SCENARIO · N` identity;
- visible Import validates/materializes before authority replacement; failure keeps current world/Recipe/URL/pause/boot state intact.

### Canonical branch evidence
One authored `Portable trio` Recipe:
- seed45 Sandbox;
- Human `(12,8)`;
- Grazer `(16,12)`;
- Wolf `(14,7)`;
- exact canonical start fingerprint `7f07ed67` at day `14400`.

Real Chromium proves:
- Copy Link uses an unpadded base64url `scenario=` token that independently decodes to the exact canonical Recipe string;
- downloaded `Portable-trio.worldboxsr-scenario.json` is byte-exact canonical Recipe JSON;
- a fresh browser/profile launched from the shared URL reaches paused day 14400, exact normalized Recipe and fingerprint `7f07ed67`;
- a separate fresh ordinary browser using visible Import JSON reaches the same paused day 14400, exact normalized Recipe and fingerprint `7f07ed67` without changing its URL;
- a Wolf import targeting impassable `(18,12)` is rejected atomically with truthful `impassable tile 18,12` feedback and leaves the existing imported Scenario unchanged;
- authored / fresh URL / visible Import starts are byte-identical.

Implementation head `5d7b2402602532382456c68be2224e685114cba2` passed CI #791 + full visual-qa #288. Artifact `9578343072` contains the full 56-file regression set, `scenario-portability-evidence.json`, the canonical downloaded Recipe and fixed share/shared/import screenshots. Manual 1440×900 review confirms the Recipe card remains compact, the shared start is visibly paused with `SCENARIO · 3`, invalid import feedback is readable, and the world map remains the primary visual surface.

## Regression-gate hardening retained from capability 2

No product authority changed, but full validation fixed old timing assumptions:
- Watchlist evidence freezes both the first and same-tab-reloaded worlds at exact seed45 Y40 before choosing/reopening the bookmarked event;
- canonical Living Ecology uses ordinary `Time=1 year` + product Pause to land on exact Y50 and waits until HUD `Year 50.0` converges before asserting the frozen authority/HUD state.

## Ordered v0.7 slices

1. Versioned Scenario Recipe contract + deterministic materializer — #242/#243 — **DONE + merged-main delivered**.
2. Scenario Setup workspace — #244/#245 — **DONE + merged-main delivered**.
3. Portable recipe — Copy Link + canonical JSON Export/Import — #246/#247 — **implementation/browser/manual branch gate complete; documentation-synchronized merge gate active**.
4. Replay + Fork — **NEXT only after #247 merged-main delivery verification**.
5. Canonical Scenario Builder gate.
6. Release-only `v0.7.0` handoff.

## v0.7 architecture/truth boundaries

- Engine remains the only world truth.
- Recipe is startup input to existing world creation/commands, never a second simulation or save-state mirror.
- Recipe transport/metadata never enters `snapshotWorld`, world history or RNG.
- Setup/share UI must not push entities/events or edit world arrays directly.
- Successful setup placement is appended to recipe only after authoritative command success.
- Import replaces authority only after complete Recipe validation/materialization succeeds.
- Setup stops at explicit Run; later gameplay/God Powers are not silently recorded into recipe.
- Replay means rebuild the recipe start, not timeline rewind.
- Fork creates a new editable recipe without mutating the imported/shared normalized source.
- Existing no-recipe v0.6 Sandbox/Living Ecology startup is a byte-compatibility regression contract.
- Phaser is the v0.7 product surface; Legacy remains comparison compatibility only.

## Explicit v0.7 non-goals

- no terrain/elevation/moisture/biome/water painter;
- no arbitrary tile/resource editor;
- no full player-facing live snapshot save-game UI;
- no config/rules DSL or scripting/mod execution;
- no objectives, victory/defeat or challenge scoring;
- no cloud/accounts/workshop/discovery backend;
- no AI-generated canonical scenario facts;
- no custom map-size contract;
- no new ecology/civilization mechanics;
- no generic conversion of every God Power into recipe setup actions;
- no compression protocol or short-link backend.

## Current decision gate

1. require documentation-synchronized #247 final head normal CI + full visual-qa green;
2. update #247 final evidence, mark ready and squash merge;
3. verify merged-main CI, Pages/public `/play/` and full visual-qa;
4. only then open exactly one capability-4 issue/branch for **Replay + Fork**;
5. do not begin terrain editing, canonical release gate work or other builder breadth in parallel.
