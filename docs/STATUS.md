# Project status

Last updated: 2026-08-25

## Management state

**v0.6.0 — Living Ecology is shipped and closed.** Immutable release identity:
- implementation freeze `ac94bd0bfa59790f959c02c261c3506c378fb26d`;
- release commit `2fa4ce8d131f55d84c59f4bdfbae088cd222486f`;
- annotated tag `v0.6.0` / tag object `ae558bb91912e383d153317ae0fdb0a77e8c10eb`, targeting exactly the release commit;
- GitHub Release published from checked-in release notes;
- release workflow #10, release-commit CI #748, Pages #50/public `/play/`, full visual-qa #247 green;
- post-release closeout #239 merged as `bd746e08ae7d2d26e4063c6b53f8a509e999f1da`; closeout CI #750, Pages #51/public `/play/`, visual-qa #248 green;
- release gate #223 and handoff #237 are closed.

**v0.7.0 — Scenario Builder & Sharing is now the active planning target.** Release gate: #240. Finite backlog: `docs/backlog/v0.7.md` on the planning branch until its planning PR merges.

No v0.7 implementation is allowed before the planning-only PR passes CI and merges. After that, open exactly one implementation slice: **Versioned Scenario Recipe contract + deterministic materializer**.

## v0.7 planning decision

### Player promise

A player can assemble a small world setup, serialize it as a compact deterministic **Scenario Recipe**, share/import it, reopen the exact same authoritative starting world, then Run, Replay or Fork a different history.

### Why Scenario Recipe first

Current shipped architecture already contains the expensive deterministic substrate:
- seeded world creation and exact internal snapshot/load continuation;
- current 24×24 Sandbox/Living Ecology production startup;
- authoritative Human/Grazer/Wolf creation commands;
- reset/seed/mode/time UI;
- a minimal Simulation Lab named-scenario concept.

But the browser has no player-facing scenario recipe, save/import/export/share workflow, and URL state currently only handles renderer selection. There is also **no authoritative terrain/biome mutation command**. Therefore v0.7 does not fake a full world painter in UI code; it first makes reproducible starting setups portable.

### Frozen recipe scope

Recipe v1 is versioned startup input, not a snapshot/live-state mirror. It contains only:
- bounded presentation name metadata;
- base `seed`;
- current base preset `sandbox | living_ecology`;
- ordered, bounded placement actions for exactly Human · Grazer · Wolf.

Materialization reuses the existing supported 24×24 product startup and existing 40-year showcase-ready semantics, then applies setup placements through authoritative command APIs while paused.

Release bounds:
- max 32 placement actions;
- max 10 entities per action;
- no recipe = byte-compatible v0.6 startup;
- malformed/unknown recipe data fails explicitly before allocating command/entity/event identity;
- metadata/codec never enters world snapshots/history/RNG.

## Ordered v0.7 slices

1. **Versioned Scenario Recipe contract + deterministic materializer** — NEXT.
2. **Scenario Setup workspace** — visible paused Human/Grazer/Wolf placement + Run boundary.
3. **Portable recipe** — Copy Link + canonical JSON Export/Import + fresh-tab reconstruction.
4. **Replay + Fork** — exact start rematerialization and editable copy semantics.
5. **Canonical Scenario Builder gate** — headless + production Chromium create/share/import/exact-start/Run/Replay/Fork proof.
6. **Release-only v0.7.0 handoff** after merged-main delivery checks.

## v0.7 architecture/truth boundaries

- Engine remains the only world truth.
- Recipe is startup input to existing world creation/commands, never a second simulation or save-state mirror.
- Setup UI must not push entities/events or edit world arrays directly.
- Successful setup placement is appended to recipe only after authoritative command success.
- Setup stops at explicit Run; later gameplay/God Powers are not silently recorded into recipe.
- Replay means rebuild the recipe start, not timeline rewind.
- Fork creates a new editable recipe without mutating the imported/shared normalized source.
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
- no generic conversion of every God Power into a recipe action.

## Current decision gate

1. require the planning branch to contain only `docs/backlog/v0.7.md`, ROADMAP and STATUS changes;
2. run normal CI and merge the planning PR;
3. create one capability-1 issue/branch only;
4. define Recipe v1 validation/materialization with pure tests before any visible Setup UI;
5. preserve v0.6 startup regressions exactly;
6. only after capability 1 merges may Scenario Setup workspace begin.
