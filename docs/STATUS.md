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

**v0.7.0 — Scenario Builder & Sharing is the active implementation stage.** Release gate: #240. Finite backlog: `docs/backlog/v0.7.md`.

Planning PR #241 merged as `303e31d5b71285797cc4611e41b5c663683941b4` after CI #751. Capability 1 — **Versioned Scenario Recipe contract + deterministic materializer** — is branch-level complete in #242/#243; after final documentation-synchronized gates and merged-main delivery verification, capability 2 **Scenario Setup workspace** is the only legal next implementation slice.

## v0.7 player promise

A player can assemble a small world setup, serialize it as a compact deterministic **Scenario Recipe**, share/import it, reopen the same authoritative starting world, then Run, Replay or Fork a different history.

v0.7 is not a full terrain editor. It productizes deterministic setup/share/replay first.

## Capability 1 evidence — Scenario Recipe v1 core

`client/presentation/scenario_recipe.js` is the single framework-independent recipe contract for later UI/share surfaces.

### Frozen v1 schema and bounds
- exact `kind: 'worldboxsr-scenario'`;
- exact `version: 1`;
- trimmed non-empty name, max 64 code units;
- base contains exactly production-normalized `seed` + current `sandbox | living_ecology` preset;
- setup preserves exact order and is capped at 32 actions;
- supported actions are exactly Human, Grazer and Wolf placement;
- coordinates are current 24×24 integer tiles;
- count is capped at 10 per action;
- unknown/missing/widened input fails explicitly.

### Materialization contract
- normalize recipe before world creation;
- reuse existing `createShowcaseWorld(seed,preset)`;
- reuse existing `evolveShowcaseWorld` 40-year ready semantics;
- preflight every setup action for passability before the first setup command;
- apply valid ordered placements only through existing authoritative `applyCommand`;
- recipe name/codec/state is not attached to world snapshots/history/RNG;
- no direct entity/event insertion and no DOM/storage/URL/Phaser dependency.

### Deterministic evidence
- different input object key order and numeric/string equivalent seed spelling produce the same canonical normalized JSON;
- setup action order remains part of recipe identity;
- canonical parse/serialize round-trip is exact;
- malformed/unsupported/widened input is rejected;
- codec/name metadata is authority/RNG neutral;
- empty Sandbox recipe byte-equals the existing direct ready Sandbox snapshot;
- empty Living Ecology recipe byte-equals the existing direct ready Living Ecology snapshot;
- duplicate Human/Grazer/Wolf setup materializations are byte-identical;
- changing only recipe name leaves world snapshots byte-identical;
- command/event allocation follows recipe order;
- an impassable later setup action rejects before any earlier setup command changes authority.

Implementation head `71a0ab474113e56805dcaa6ba81dbf281a9e57a6` passed normal CI #753 and full visual-qa #250. The final documentation-synchronized head must pass its own CI + visual-qa before merge.

## Ordered v0.7 slices

1. Versioned Scenario Recipe contract + deterministic materializer — #242/#243 — **implementation complete; merge gate active**.
2. Scenario Setup workspace — **NEXT only after #243 merged-main delivery verification**.
3. Portable recipe — Copy Link + canonical JSON Export/Import.
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

1. require documentation-synchronized #243 final head normal CI + full visual-qa green;
2. mark #243 ready and squash merge;
3. verify merged-main CI, Pages/public `/play/` and full visual-qa;
4. only then open one capability-2 issue/branch for **Scenario Setup workspace**;
5. do not begin share URL/export/import, Replay/Fork or terrain editing in parallel.
