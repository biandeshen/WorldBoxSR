# Project status

Last updated: 2026-08-26

## Management state

**v0.6.0 — Living Ecology is shipped and closed.** Immutable release identity:
- release commit `2fa4ce8d131f55d84c59f4bdfbae088cd222486f`;
- annotated tag `v0.6.0` / tag object `ae558bb91912e383d153317ae0fdb0a77e8c10eb`;
- release workflow #10, CI #748, Pages #50/public `/play/`, visual-qa #247 green;
- post-release closeout #239 completed without moving the tag.

**v0.7.0 — Scenario Builder & Sharing is published and immutable.**

Implementation freeze:
- capability-5 merge `1043a63375fee4ccaa72141da7f1e026a550b989`;
- merged-main CI #811, Pages #57/public `/play/`, full visual-qa #306 green.

Release identity:
- release commit **`1d5931a650f64765286e155c0e821bfe6d63a299`**;
- annotated tag **`v0.7.0`** / tag object **`236eef64cf5090ff1a65bfee264f193078e79606`** targets exactly that release commit;
- GitHub Release **`WorldBoxSR v0.7.0`** is published from checked-in `docs/releases/v0.7.0.md`;
- release workflow **#11** green;
- release-commit CI **#817** green;
- Pages **#58** including final public `/play/` verification green;
- release-commit full visual-qa **#312** green.

This docs-only closeout happens **after** the tagged release commit and does not move or redefine `v0.7.0`.

## v0.7 player promise — delivered

A player can compose a bounded deterministic Scenario Recipe, share/import it into the exact same authoritative start, Run a different history, Replay the exact Recipe start, or Fork/Edit it into a deterministic new Scenario without raw engine tooling.

## Frozen Scenario contract

- Recipe kind/version: `worldboxsr-scenario` / v1.
- Base: current 24×24, 40-year showcase-ready `sandbox | living_ecology` startup.
- Setup: ordered Human / Grazer / Wolf placement only.
- Bounds: <=32 actions, <=10 entities/action, name <=64 code units, canonical JSON <=8192 UTF-8 bytes.
- Portable transport: unpadded base64url under `scenario=`.
- Recipe is deterministic startup input, never a live-state mirror or snapshot substitute.
- Engine world remains sole authority; Phaser is the Scenario product surface.

## Canonical v0.7 evidence

Source **Portable trio**:
- seed45 Sandbox;
- Human `(12,8)`;
- Grazer `(16,12)`;
- Wolf `(14,7)`;
- paused day `14400`;
- source fingerprint **`7f07ed67`**.

End-to-end production Chromium journey:
1. ordinary world → visible Setup → real-click source;
2. Copy Link independently decodes to exact canonical Recipe;
3. fresh Chrome profile reaches byte-identical paused source `7f07ed67`;
4. ordinary Time/Play + Meteor diverges source to `dfbad7ff`, Recipe unchanged;
5. Replay returns exact source and clears stale transient story/Inspector state;
6. Fork/Edit starts from exact source + independent copy;
7. fourth Human `(12,8)` creates deterministic fork **`67543ff4`**, source canonical unchanged;
8. ordinary fork gameplay diverges to `e0b5b305`;
9. Replay returns exact `67543ff4` fork / `SCENARIO · 4`, source canonical still unchanged.

Canonical implementation-gate head `8aca62fcb4ae31b4ab3ab8bab9aa003cc750846d` passed CI #808 + full visual-qa #303. Artifact `9580488110` records `canonicalJourneyComplete: true` and contains four manually reviewed 1440×900 canonical screenshots. Documentation-synchronized final head passed CI #810 + visual-qa #305 before merge.

## Delivered v0.7 slices

- Capability 1 — Recipe v1 core — #243 / `910a98445428cd361025b028387be065d70034f1`; CI #756, Pages #53, visual #253.
- Capability 2 — Scenario Setup — #245 / `8efcb523148a4728d422de7abaeff8527caea5df`; CI #773, Pages #54, visual #270.
- Capability 3 — Portable Recipe — #247 / `27f8c1f8715d9908acb7bb95e264bfb5b3ad2233`; CI #794, Pages #55, visual #291.
- Capability 4 — Replay + Fork — #249 / `9b44c03df6898096a422822e4af024cf744b9faa`; CI #804, Pages #56, visual #301.
- Capability 5 — Canonical release gate — #251 / `1043a63375fee4ccaa72141da7f1e026a550b989`; CI #811, Pages #57, visual #306.
- Release handoff — #253 / `1d5931a650f64765286e155c0e821bfe6d63a299`; release workflow #11, CI #817, Pages #58, visual #312.

## Explicit v0.7 non-goals remain frozen

No terrain/elevation/moisture/biome/water/resource painter, live snapshot savegame UI, Setup undo/remove stack, timeline rewind/event replay, rules DSL/scripts/objectives/scoring, cloud/accounts/workshop backend, short-link/compression service, custom map sizes, AI-generated canonical authority or new simulation mechanics.

## Current decision gate

1. merge this docs-only post-release closeout without moving `v0.7.0`;
2. verify closeout-main CI / Pages / visual-qa remain green;
3. close release handoff #252 and release gate #240;
4. only then begin a planning-only v0.8 Civilization Depth gate;
5. do not start v0.8 implementation before one finite player promise and non-goals are frozen.
