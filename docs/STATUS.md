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
- Capability 3 — **Portable recipe: Copy Link + canonical JSON Export/Import** — #246/#247 merged as `27f8c1f8715d9908acb7bb95e264bfb5b3ad2233`; merged-main CI #794, Pages #55/public `/play/`, visual-qa #291 green.

Capability 4 — **Replay + Fork** — #248/#249 has completed deterministic, full Chromium and manual branch gates on implementation head `bb5925b33f45e5b702cea9715dbc0b279a7ac316`. After this documentation-synchronized final head passes its own CI + full visual-qa, merge #249 and verify merged-main delivery. Only then may capability 5 — **Canonical Scenario Builder gate** — start.

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

- visible compact `＋ Scenario` entry and paused Setup workspace in Phaser only;
- existing Phaser `pointerup → pointerTile → scene.useTool` remains the only map-input path;
- successful Human/Grazer/Wolf placement uses existing authoritative commands, then appends immutable Recipe draft only after success;
- failed impassable placement is world/identity/Recipe neutral;
- Clear rematerializes, Run freezes, later gameplay cannot rewrite Recipe identity;
- canonical seed45 three-action start fingerprint `7f07ed67`; merged-main delivery green.

## Capability 3 — Portable Scenario Recipe — delivered

### Transport/product contract
- canonical identity is existing `serializeScenarioRecipe` output only;
- max 8192 canonical UTF-8 bytes → unpadded base64url under exactly `scenario=`;
- Copy Link, exact JSON export and visible JSON import use Recipe v1, never snapshots/live world state;
- fresh shared URL materializes through the existing Recipe materializer and starts paused;
- Import installs only after full validation/materialization succeeds; invalid import keeps current world/Recipe/URL/pause/boot state;
- Legacy rejects Scenario links truthfully rather than becoming a second Scenario runtime;
- no storage/cloud/RNG/direct entity-history mutation ownership.

### Canonical evidence
`Portable trio` = seed45 Sandbox + Human `(12,8)` + Grazer `(16,12)` + Wolf `(14,7)`.
- authored start day `14400`, fingerprint `7f07ed67`;
- Copy Link independently decodes to exact canonical Recipe;
- downloaded JSON is byte-exact canonical Recipe;
- fresh shared profile and separate visible Import both reproduce day `14400` + fingerprint `7f07ed67` + exact normalized Recipe;
- impassable Wolf import `(18,12)` rejects atomically.

Implementation head `5d7b2402602532382456c68be2224e685114cba2` passed CI #791 + visual-qa #288 and manual review. Final docs head passed CI #793 + visual-qa #290. #247 merged as `27f8c1f8715d9908acb7bb95e264bfb5b3ad2233`; merged-main CI #794, Pages #55/public `/play/`, visual-qa #291 green.

## Capability 4 — Replay + Fork branch evidence

### Product semantics
- **Replay Scenario** is deterministic `materializeScenarioRecipe(frozenRecipe)` + existing ready-world install; it is not snapshot restore, event replay or timeline rewind;
- Replay keeps the frozen Recipe identity and returns paused at exact Recipe start;
- world replacement clears stale Event Card, Focused Story, Inspector and selection presentation; Watchlist stable refs/session storage are not deleted and can re-resolve against the rebuilt world;
- **Fork / Edit** normalizes an independent Recipe copy, separately retains immutable `forkSource`, rematerializes the exact source start and enters the existing Scenario Setup workspace;
- Fork uses the same Human/Grazer/Wolf actions and existing map pointer path; no second editor/input loop;
- fork UI is visibly `FORK · EDITING · PAUSED`; Run freezes the edited fork while retaining original source identity for comparison;
- ordinary World reset clears frozen/fork presentation identity;
- Replay/Fork adds no URL/transport protocol, snapshot savegame, storage/cloud or simulation mechanics.

### Deterministic evidence
Headless tests prove:
- source Recipe can diverge through later simulation + Meteor while source canonical stays unchanged;
- rematerializing source returns exact original snapshot, repeatedly;
- fork copy is structurally equal but independently referenced/not frozen;
- adding one fixed Human action creates exactly one additional entity + history event at the same day;
- duplicate fork materializations are byte-identical;
- rematerializing source after fork still returns exact source snapshot/canonical identity.

### Real Chromium evidence
Fresh shared `Portable trio` source:
- exact source fingerprint `7f07ed67`, paused day `14400`, bookmarked event #163;
- ordinary Time + real Meteor diverges authority to `0d1d99b2` while source Recipe stays unchanged;
- Replay returns exact `7f07ed67` source start and clears stale Event Card/Focused Story/Inspector while preserving bookmark storage;
- opening the same retained event after Replay re-renders the preserved Watchlist ref against the rebuilt source world;
- Fork/Edit starts at exact source fingerprint with copied 3-action Recipe and immutable source canonical string;
- one real Human placement at `(12,8)` creates a 4-action fork with fingerprint `67543ff4`, distinct from source, while source Recipe remains byte-identical;
- Run freezes the fork; ordinary fork gameplay diverges it; Replay returns exact `67543ff4` fork start while original source canonical remains unchanged.

Implementation head `bb5925b33f45e5b702cea9715dbc0b279a7ac316` passed CI #801 + full visual-qa #298. Artifact `9579531599` contains the 69-file regression set, `scenario-replay-fork-evidence.json` and fixed Replay/Fork screenshots. Manual 1440×900 review passed: Replay status/Recipe identity are clear, Fork workspace is explicitly labeled and compact, fork replay shows `SCENARIO · 4`, and the map remains the primary visual surface.

## Regression-gate hardening retained from capability 2

No product authority changed, but full validation fixed old timing assumptions:
- Watchlist evidence freezes both the first and same-tab-reloaded worlds at exact seed45 Y40 before choosing/reopening the bookmarked event;
- canonical Living Ecology uses ordinary `Time=1 year` + product Pause to land on exact Y50 and waits until HUD `Year 50.0` converges before asserting the frozen authority/HUD state.

## Ordered v0.7 slices

1. Versioned Scenario Recipe contract + deterministic materializer — #242/#243 — **DONE + merged-main delivered**.
2. Scenario Setup workspace — #244/#245 — **DONE + merged-main delivered**.
3. Portable recipe — Copy Link + canonical JSON Export/Import — #246/#247 — **DONE + merged-main delivered**.
4. Replay + Fork — #248/#249 — **implementation/browser/manual branch gate complete; documentation-synchronized merge gate active**.
5. Canonical Scenario Builder gate — **NEXT only after #249 merged-main delivery verification**.
6. Release-only `v0.7.0` handoff.

## v0.7 architecture/truth boundaries

- Engine remains the only world truth.
- Recipe is startup input to existing world creation/commands, never a second simulation or save-state mirror.
- Recipe transport/metadata never enters `snapshotWorld`, world history or RNG.
- Setup/share/Replay/Fork UI must not push entities/events or edit world arrays directly.
- Successful setup placement is appended to recipe only after authoritative command success.
- Import replaces authority only after complete Recipe validation/materialization succeeds.
- Setup stops at explicit Run; later gameplay/God Powers are not silently recorded into recipe.
- Replay means rebuild the Recipe start, not timeline rewind.
- Fork creates a new editable Recipe without mutating the imported/shared normalized source.
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
- no compression protocol or short-link backend;
- no timeline rewind/event-replay engine or setup undo/remove stack.

## Current decision gate

1. require documentation-synchronized #249 final head normal CI + full visual-qa green;
2. update #249 final evidence, mark ready and squash merge;
3. verify merged-main CI, Pages/public `/play/` and full visual-qa;
4. only then open exactly one capability-5 issue/branch for the **Canonical Scenario Builder gate**;
5. do not begin release packaging, terrain editing or other builder breadth in parallel.
