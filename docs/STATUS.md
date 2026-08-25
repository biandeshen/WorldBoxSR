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

Planning #241 merged as `303e31d5b71285797cc4611e41b5c663683941b4`. Capability 1 — **Scenario Recipe v1 core** — merged as #243 / `910a98445428cd361025b028387be065d70034f1`; merged-main CI #756, Pages #53/public `/play/` and full visual-qa #253 passed.

Capability 2 — **Scenario Setup workspace** — #244/#245 is branch-level complete after deterministic tests, real Chromium and manual 1440×900 review. Once its documentation-synchronized final head passes CI + full visual-qa, merge it and verify merged-main delivery. Only then may capability 3 — **Portable recipe: Copy Link + canonical JSON Export/Import** — begin.

## v0.7 player promise

A player can assemble a small world setup, serialize it as a compact deterministic **Scenario Recipe**, share/import it, reopen the same authoritative starting world, then Run, Replay or Fork a different history.

v0.7 is not a full terrain editor. It productizes deterministic setup/share/replay first.

## Capability 1 — Scenario Recipe v1 core — delivered

`client/presentation/scenario_recipe.js` is the single framework-independent recipe contract for later Setup/share/Replay/Fork surfaces.

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

## Capability 2 — Scenario Setup workspace evidence

### Product surface
- visible compact `＋ Scenario` topbar entry in Phaser only;
- entering Setup rematerializes the current Seed/Mode empty Recipe v1 ready base and pauses it;
- Seed, Mode, World reset, Play/Pause and Time controls are locked while Setup owns the map;
- ordinary God Power dock + event pulse are hidden during Setup; keyboard power shortcuts are guarded;
- left Setup card contains name, `N/32 actions`, exactly Human/Grazer/Wolf, bounded recent-action summary, Clear Setup and Run Scenario;
- Legacy hides Scenario Setup and remains comparison-only.

### Authority boundaries
- existing Phaser `pointerup → pointerTile → scene.useTool` remains the only map-input path; Setup wraps that seam instead of creating a second pointer loop;
- successful setup click applies one existing authoritative command, then appends the immutable normalized recipe draft only after success;
- failed impassable click changes neither recipe, world fingerprint nor command/event/entity identity;
- rename changes recipe metadata only;
- Clear rematerializes base + zero actions rather than reverse/deleting world arrays;
- same ordered setup after Clear reproduces the exact same starting world;
- Run deep-freezes the normalized recipe, exits Setup and restores ordinary controls without changing current start authority;
- later ordinary gameplay changes world authority normally but cannot rewrite the frozen recipe.

### Canonical browser evidence
Full real Chromium on seed45 Sandbox uses fixed visible placements:
- Human `(12,8)`;
- Grazer `(16,12)`;
- Wolf `(14,7)`;
- rejected impassable tile `(18,12)`.

Evidence fingerprints:
- ordinary paused Y40 base: `938b50ec`;
- first three-action setup: `7f07ed67`;
- Clear restores exact base `938b50ec` and exact identity counters;
- rebuilding the same three actions returns exactly `7f07ed67`;
- Run leaves `7f07ed67` unchanged and freezes `Seed 45 trio` Recipe v1;
- one ordinary product day after Run changes world to `bcc9eaf2` / day 14401 while frozen recipe remains byte-unchanged.

Normal CI #767 and full visual-qa #264 passed on implementation head `61ee06e1c2e1af6f1b38f36b26b07337bbf59e12`. Manual review confirms the editor remains compact and subordinate to the map; failed-land feedback is truthful; Run clearly removes the Setup card and restores the God Power dock while retaining a small `SCENARIO · 3` identity badge.

## Regression-gate hardening discovered during capability 2

No product authority was changed, but full validation exposed and fixed two old QA timing assumptions:
- Watchlist browser evidence now pauses both the first and same-tab-reloaded worlds during warmup and requires exact seed45 Y40 (`day=14400`) before choosing/reopening the bookmarked event. Full #264 restored/reopened `event:163 + polity:1` on both sides of reload.
- canonical Living Ecology browser evidence still uses the ordinary `Time=1 year` control, but a page-side rAF observer clicks the existing product Pause control on the exact Y50 frame. The strict frozen checkpoint remains `68 grazers / 37.44% vegetation / 160 births`; no direct world/tick shortcut or relaxed threshold was introduced.

## Ordered v0.7 slices

1. Versioned Scenario Recipe contract + deterministic materializer — #242/#243 — **DONE + merged-main delivered**.
2. Scenario Setup workspace — #244/#245 — **implementation/browser/manual gate complete; documentation-synchronized merge gate active**.
3. Portable recipe — Copy Link + canonical JSON Export/Import — **NEXT only after #245 merged-main delivery verification**.
4. Replay + Fork.
5. Canonical Scenario Builder gate.
6. Release-only `v0.7.0` handoff.

## v0.7 architecture/truth boundaries

- Engine remains the only world truth.
- Recipe is startup input to existing world creation/commands, never a second simulation or save-state mirror.
- Setup UI must not push entities/events or edit world arrays directly.
- Successful setup placement is appended to recipe only after authoritative command success.
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
- no generic conversion of every God Power into recipe setup actions.

## Current decision gate

1. require documentation-synchronized #245 final head normal CI + full visual-qa green;
2. update #245 final evidence, mark ready and squash merge;
3. verify merged-main CI, Pages/public `/play/` and full visual-qa;
4. only then open exactly one capability-3 issue/branch for **Portable recipe — Copy Link + canonical JSON Export/Import**;
5. do not begin Replay/Fork, terrain editing or other builder breadth in parallel.
