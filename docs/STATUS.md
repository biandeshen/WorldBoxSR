# Project status

Last updated: 2026-08-26

## Management state

**v0.6.0 — Living Ecology is shipped and closed.** Immutable release identity remains unchanged:
- implementation freeze `ac94bd0bfa59790f959c02c261c3506c378fb26d`;
- release commit `2fa4ce8d131f55d84c59f4bdfbae088cd222486f`;
- annotated tag `v0.6.0` / tag object `ae558bb91912e383d153317ae0fdb0a77e8c10eb`;
- release workflow #10, release-commit CI #748, Pages #50/public `/play/`, visual-qa #247 green;
- post-release closeout #239 / `bd746e08ae7d2d26e4063c6b53f8a509e999f1da`; gates #223/#237 closed.

**v0.7.0 — Scenario Builder & Sharing is at its final implementation gate.** Release gate: #240. Finite backlog: `docs/backlog/v0.7.md`.

Delivered implementation slices:
- Capability 1 — Recipe v1 core — #242/#243 → `910a98445428cd361025b028387be065d70034f1`; merged-main CI #756, Pages #53/public `/play/`, visual #253 green.
- Capability 2 — Scenario Setup workspace — #244/#245 → `8efcb523148a4728d422de7abaeff8527caea5df`; merged-main CI #773, Pages #54/public `/play/`, visual #270 green.
- Capability 3 — Portable Recipe — #246/#247 → `27f8c1f8715d9908acb7bb95e264bfb5b3ad2233`; merged-main CI #794, Pages #55/public `/play/`, visual #291 green.
- Capability 4 — Replay + Fork — #248/#249 → `9b44c03df6898096a422822e4af024cf744b9faa`; merged-main CI #804, Pages #56/public `/play/`, visual #301 green.

Capability 5 — **Canonical Scenario Builder release gate** — #250/#251 is machine + manual implementation-gate complete on head `8aca62fcb4ae31b4ab3ab8bab9aa003cc750846d`: CI #808 + full visual-qa #303 green, artifact `9580488110`, four canonical 1440×900 screenshots manually reviewed. The current task is only documentation-synchronized final-head verification → squash merge → merged-main delivery. After that, **v0.7 implementation behavior freezes** and only release packaging/docs/tagging may proceed.

## v0.7 player promise

A player can compose a bounded deterministic Scenario Recipe, share/import it into the exact same authoritative start, Run a different history, Replay the exact Recipe start, or Fork/Edit it into a deterministic new Scenario without raw engine tooling.

v0.7 deliberately does **not** become a terrain editor, live savegame system or rules platform.

## Frozen Scenario contract

- Recipe kind/version: `worldboxsr-scenario` / v1.
- Base: current 24×24, 40-year showcase-ready `sandbox | living_ecology` startup.
- Setup actions: ordered Human / Grazer / Wolf placement only.
- Bounds: <=32 actions, <=10 entities/action, name <=64 code units, canonical JSON <=8192 UTF-8 bytes.
- Portable transport: unpadded base64url under exactly `scenario=`.
- Recipe is startup input only; engine world remains sole authority.
- No Recipe present remains compatible with ordinary startup.

## Canonical v0.7 evidence

Canonical source `Portable trio`:
- seed45 Sandbox;
- Human `(12,8)`;
- Grazer `(16,12)`;
- Wolf `(14,7)`;
- paused day `14400`;
- source fingerprint `7f07ed67`.

Canonical end-to-end Chromium journey on #251:
1. ordinary world enters visible Scenario Setup and creates the canonical three-action source via real map clicks;
2. Copy Link emits an unpadded `scenario=` token that independently decodes to the exact canonical Recipe without changing authority;
3. a genuinely fresh Chrome profile opens the copied URL at exact paused source `7f07ed67`;
4. ordinary Time/Play + real Meteor diverges source to `dfbad7ff` while source Recipe remains unchanged;
5. Replay rematerializes exact source `7f07ed67` and clears stale Event Card / Focused Story / Inspector state;
6. Fork/Edit starts from exact source authority + an independent copied three-action Recipe;
7. one fixed fourth Human at `(12,8)` creates deterministic four-action fork `67543ff4`, while original source canonical remains byte-identical;
8. ordinary fork gameplay diverges to `e0b5b305`;
9. Replay returns exact fork `67543ff4`, paused as `SCENARIO · 4`, while original source identity remains unchanged.

`canonical-scenario-builder-evidence.json` records `canonicalJourneyComplete: true`. CI #808 + full visual-qa #303 passed on implementation gate head `8aca62fcb4ae31b4ab3ab8bab9aa003cc750846d`; artifact `9580488110` contains the complete regression set plus canonical evidence. Manual review confirms authored share, replayed source, Fork editing and replayed fork are all readable and the map remains primary.

## Capability evidence summary

### Recipe core
- one strict normalized schema and stable canonical serialization;
- whole-recipe preflight before any setup command;
- one materializer reusing production world creation + authoritative commands;
- duplicate materializations byte-identical; metadata/codec RNG-neutral.

### Scenario Setup
- visible paused editor using the existing Phaser pointer path;
- successful placement records only after authoritative command success;
- failed placement is Recipe/world/identity neutral;
- Clear rematerializes; Run freezes without changing the start.

### Portable Recipe
- Copy Link / JSON Export / visible Import use canonical Recipe only, never snapshots/live world state;
- fresh shared URL starts paused through the same materializer;
- invalid Import is atomic;
- Legacy rejects Scenario links truthfully.

### Replay + Fork
- Replay = Recipe rematerialization, never timeline rewind/snapshot restore;
- transient stale world references are cleared after replacement while stable Watchlist refs can re-resolve;
- Fork/Edit uses an independent normalized copy and separately retains immutable source identity;
- fixed fork difference is deterministic and replayable.

## Regression hardening retained

Full Chromium validation still requires all v0.4/v0.5/v0.6 gates plus all v0.7 slice gates. Watchlist exact-Y40 and Living Ecology exact-Y50/HUD-convergence hardening remain part of the full gate; no regression requirement was removed to make v0.7 pass.

## Ordered v0.7 state

1. Recipe v1 core — **DONE + merged-main delivered**.
2. Scenario Setup workspace — **DONE + merged-main delivered**.
3. Portable Recipe — **DONE + merged-main delivered**.
4. Replay + Fork — **DONE + merged-main delivered**.
5. Canonical Scenario Builder gate — **machine + manual gate complete; final docs-head CI/Chromium then merge/delivery**.
6. Release-only `v0.7.0` handoff — **NEXT only after capability 5 merged-main CI + Pages/public `/play/` + full Chromium are green**.

## Current decision gate

1. require documentation-synchronized #251 final head normal CI + full visual-qa green;
2. update #251 with final evidence, mark ready and squash merge;
3. verify merged-main CI, Pages/public `/play/` and full visual-qa;
4. freeze all v0.7 product/gate behavior;
5. open exactly one release-only `v0.7.0` handoff; package/docs/release metadata only;
6. do not begin v0.8 or any terrain/builder breadth before v0.7 immutable release closure.

## Explicit v0.7 non-goals

No terrain/elevation/moisture/biome/water/resource painter, live snapshot savegame UI, rules DSL/mod scripts, objectives/scoring, cloud/accounts/workshop backend, AI-generated canonical authority, custom map sizes, new simulation mechanics, generic God-Power-to-Recipe conversion, short-link backend, timeline rewind/event-replay engine or Setup undo/remove stack.
